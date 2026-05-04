/**
 * MastercamCADExecutionBridge — planning↔execution bridge for Mastercam CAD ops.
 *
 * Mirrors SolidWorksCADExecutionBridge / InventorCADExecutionBridge but emits
 * a C# NET-Hook scaffold (Mastercam's managed add-in API surface) instead of
 * VBA / iLogic. Mastercam exposes its automation surface through compiled C#
 * add-ins built against `Mastercam.IO`, `Mastercam.Curves`, `Mastercam.Solids`,
 * etc.; the catalog's `mastercam_api` field stores the fully-qualified static
 * call path (e.g. `Mastercam.Curves.LineCreator.CreateByEndpoints`).
 *
 * No live MCP-style remote endpoint exists for Mastercam; the existing
 * MastercamAutomationBridge.ts handles a limited live verb set. This engine
 * produces the audit-trail C# scaffold that an operator drops into a NET-Hook
 * project, builds, registers via `Settings → NET-Hook`, runs once, and
 * verifies before committing the result back into PRISM. Pure dry-run by
 * design — operator-in-the-loop preserved.
 *
 * Two pure static entry points:
 *   1. plan(args) — looks up the op in MastercamCADFunctionIndexEngine,
 *      validates required + provided parameters against the catalog tab
 *      schema, enforces type / min / max / enum-list constraints, returns a
 *      structured MastercamExecutionPlan with provided / skipped /
 *      preselect-required bookkeeping.
 *   2. renderNETHookScaffold(plan) — emits a C# add-in skeleton with the
 *      canonical `using` directives, Mastercam.App.NETHook subclass, Run()
 *      override, labelled-parameter comments, and the call site emitted as
 *      the catalog's full namespace path (no receiver rewriting needed —
 *      mastercam_api is already a static fully-qualified call).
 *
 * Type validation table (same as SolidWorks / Inventor bridges):
 *   checkbox / boolean → typeof boolean
 *   number / integer / numeric / spinner → finite number + min/max range
 *   dropdown / enum / combo → string + must be in def.values | def.options
 *   string / text → typeof string
 *   selection-* → opaque token (any value accepted)
 *
 * @engine MastercamCADExecutionBridge
 * @milestone CAD-FIDX-MC-INT-01
 * @see MastercamCADFunctionIndexEngine — planning-layer catalog (8 modules / 815 params)
 * @see SolidWorksCADExecutionBridge — sibling pattern (VBA emission)
 * @see InventorCADExecutionBridge — sibling pattern (iLogic VB.NET emission)
 * @see AutodeskFusionMCPProxyEngine — sibling pattern (Python emission)
 */

import type {
  MastercamCADOperation,
  MastercamCADParameter,
} from "./MastercamCADFunctionIndexEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_PARAM_NAME_LENGTH = 128;
const ERROR_VALUE_PREVIEW_CHARS = 32;

// ============================================================================
// TYPES
// ============================================================================

export interface MastercamPlanArgs {
  moduleId: string;
  operationId: string;
  params: Record<string, unknown>;
}

export interface MastercamExecutionPlan {
  module_id: string;
  operation_id: string;
  mastercam_command: string;
  mastercam_api: string;
  category: string;
  provided_params: Record<string, unknown>;
  skipped_params: string[];
  preselect_required: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class MastercamCADExecutionBridge {
  /**
   * Plan a Mastercam CAD operation against the function index catalog.
   *
   * Throws on:
   *   - missing / non-string moduleId or operationId
   *   - non-object params
   *   - oversized parameter name (> MAX_PARAM_NAME_LENGTH)
   *   - operation absent from the catalog
   *   - operation lacking a mastercam_api binding
   *   - missing required catalog parameter
   *   - type mismatch / min-max / enum violations
   *
   * @param args.moduleId — function-index module id (e.g. "wireframe_operations")
   * @param args.operationId — operation id (e.g. "LINE_ENDPOINTS")
   * @param args.params — flat key/value map of catalog parameter values
   * @returns MastercamExecutionPlan ready for renderNETHookScaffold
   */
  static async plan(args: MastercamPlanArgs): Promise<MastercamExecutionPlan> {
    if (!args.moduleId || typeof args.moduleId !== "string") {
      throw new Error("MastercamCADExecutionBridge.plan: moduleId required (non-empty string)");
    }
    if (!args.operationId || typeof args.operationId !== "string") {
      throw new Error("MastercamCADExecutionBridge.plan: operationId required (non-empty string)");
    }
    if (!args.params || typeof args.params !== "object" || Array.isArray(args.params)) {
      throw new Error("MastercamCADExecutionBridge.plan: params must be a plain object");
    }

    const { MastercamCADFunctionIndexEngine } = await import(
      "./MastercamCADFunctionIndexEngine.js"
    );
    const op = MastercamCADFunctionIndexEngine.getOperation(args.moduleId, args.operationId);
    if (!op) {
      throw new Error(
        `MastercamCADExecutionBridge.plan: operation not found ${args.moduleId}/${args.operationId}`,
      );
    }

    const apiBinding = op.mastercam_api;
    if (!apiBinding) {
      throw new Error(
        `MastercamCADExecutionBridge.plan: operation ${args.moduleId}/${args.operationId} has no mastercam_api binding`,
      );
    }

    const command = op.mastercam_command ?? args.operationId;
    const allDefs = flattenTabs(op);

    const requiredDefs = allDefs.filter((p) => p.required);
    const missingNames: string[] = [];
    for (const def of requiredDefs) {
      if (!(def.name in args.params)) {
        missingNames.push(def.name);
      }
    }
    if (missingNames.length > 0) {
      throw new Error(
        `MastercamCADExecutionBridge.plan: missing required parameters for ${args.moduleId}/${args.operationId}: ${missingNames.join(", ")}`,
      );
    }

    const skipped: string[] = [];
    const provided: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args.params)) {
      if (key.length > MAX_PARAM_NAME_LENGTH) {
        throw new Error(
          `MastercamCADExecutionBridge.plan: parameter name exceeds ${MAX_PARAM_NAME_LENGTH} chars: ${truncateForError(key)}`,
        );
      }
      const def = allDefs.find((d) => d.name === key);
      if (!def) {
        skipped.push(key);
        continue;
      }
      validateValueType(key, value, def);
      provided[key] = value;
    }

    const preselectRequired = allDefs
      .filter((d) => /^selection/i.test(d.type ?? ""))
      .map((d) => d.name);

    return {
      module_id: args.moduleId,
      operation_id: args.operationId,
      mastercam_command: command,
      mastercam_api: apiBinding,
      category: op.category,
      provided_params: provided,
      skipped_params: skipped,
      preselect_required: preselectRequired,
    };
  }

  /**
   * Render a C# NET-Hook scaffold from an execution plan.
   *
   * The scaffold:
   *   - emits the standard `using Mastercam.*` directives derived from the
   *     mastercam_api namespace path
   *   - declares a Mastercam.App.NETHook subclass with the Run() override
   *   - lists pre-selection requirements as a TRACKED comment block when the
   *     op has any selection-typed parameters
   *   - lists provided parameters as labelled comments (C#-flavored: `"x"`
   *     strings, `true`/`false` bools, `null`, `new[] {1, 2, 3}` arrays)
   *   - emits the call site as the catalog's fully-qualified path verbatim
   *     (no receiver rewriting needed — mastercam_api is already
   *     `Namespace.Class.Method`)
   *
   * @param plan — output of plan()
   * @returns C# NET-Hook scaffold (single newline-joined string)
   */
  static renderNETHookScaffold(plan: MastercamExecutionPlan): string {
    const namespaceUsings = inferUsingDirectives(plan.mastercam_api);
    const lines: string[] = [];

    lines.push(`// PRISM Mastercam NET-Hook — auto-generated`);
    lines.push(`// Operation: ${plan.module_id}/${plan.operation_id}`);
    lines.push(`// Command: ${plan.mastercam_command}`);
    lines.push(`// API: ${plan.mastercam_api}`);
    lines.push(`// Category: ${plan.category}`);
    lines.push(``);
    for (const ns of namespaceUsings) {
      lines.push(`using ${ns};`);
    }
    lines.push(``);
    lines.push(`public class GeneratedAddin : Mastercam.App.NETHook`);
    lines.push(`{`);
    lines.push(`    public override MCamReturn Run(int param)`);
    lines.push(`    {`);

    if (plan.preselect_required.length > 0) {
      lines.push(`        // === PRE-SELECTION REQUIRED [TRACKED] ===`);
      for (const name of plan.preselect_required) {
        lines.push(`        // Operator must pre-pick entity for: ${name}`);
      }
      lines.push(``);
    }

    lines.push(`        // === PROVIDED PARAMETERS ===`);
    if (Object.keys(plan.provided_params).length === 0) {
      lines.push(`        // (none)`);
    } else {
      for (const [key, value] of Object.entries(plan.provided_params)) {
        lines.push(`        // ${key} = ${formatValueForComment(value)}`);
      }
    }
    lines.push(``);

    if (plan.skipped_params.length > 0) {
      lines.push(`        // === SKIPPED (NOT IN CATALOG) ===`);
      for (const name of plan.skipped_params) {
        lines.push(`        // ${name}`);
      }
      lines.push(``);
    }

    lines.push(`        // === API CALL ===`);
    lines.push(
      `        // [TRACKED] Order positional arguments per ${plan.mastercam_api} signature`,
    );
    lines.push(`        var result = ${plan.mastercam_api}(`);
    lines.push(`            // positional args here`);
    lines.push(`        );`);
    lines.push(``);
    lines.push(`        return MCamReturn.NoErrors;`);
    lines.push(`    }`);
    lines.push(`}`);

    return lines.join("\n");
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

function flattenTabs(op: MastercamCADOperation): MastercamCADParameter[] {
  if (!op.tabs) return [];
  const all: MastercamCADParameter[] = [];
  for (const tab of Object.values(op.tabs)) {
    const tabParams = tab.parameters ?? tab.params ?? [];
    for (const def of tabParams) {
      all.push(def);
    }
  }
  return all;
}

function validateValueType(
  name: string,
  value: unknown,
  def: MastercamCADParameter,
): void {
  const t = (def.type ?? "").toLowerCase();

  if (t === "checkbox" || t === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(
        `MastercamCADExecutionBridge: parameter ${name} expected boolean, got ${describeValue(value)}`,
      );
    }
    return;
  }

  if (t === "number" || t === "integer" || t === "numeric" || t === "spinner") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `MastercamCADExecutionBridge: parameter ${name} expected finite number, got ${describeValue(value)}`,
      );
    }
    if (typeof def.min === "number" && value < def.min) {
      throw new Error(
        `MastercamCADExecutionBridge: parameter ${name}=${value} below min=${def.min}`,
      );
    }
    if (typeof def.max === "number" && value > def.max) {
      throw new Error(
        `MastercamCADExecutionBridge: parameter ${name}=${value} above max=${def.max}`,
      );
    }
    return;
  }

  if (t === "dropdown" || t === "enum" || t === "combo") {
    if (typeof value !== "string") {
      throw new Error(
        `MastercamCADExecutionBridge: parameter ${name} expected string enum, got ${describeValue(value)}`,
      );
    }
    const allowed = def.values ?? def.options ?? [];
    if (allowed.length > 0 && !allowed.includes(value)) {
      throw new Error(
        `MastercamCADExecutionBridge: parameter ${name}=${truncateForError(value)} not in allowed enum list (${allowed.length} values)`,
      );
    }
    return;
  }

  if (t === "string" || t === "text") {
    if (typeof value !== "string") {
      throw new Error(
        `MastercamCADExecutionBridge: parameter ${name} expected string, got ${describeValue(value)}`,
      );
    }
    return;
  }

  // selection-* and unknown types accept any value as an opaque token reference
}

function describeValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `string "${truncateForError(value)}"`;
  if (typeof value === "number") return `number ${value}`;
  if (Array.isArray(value)) return `array(length=${value.length})`;
  return typeof value;
}

function truncateForError(value: string): string {
  if (value.length <= ERROR_VALUE_PREVIEW_CHARS) return value;
  return `${value.slice(0, ERROR_VALUE_PREVIEW_CHARS)}...`;
}

function formatValueForComment(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "null";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return `new[] { ${value.map(formatValueForComment).join(", ")} }`;
  return String(value);
}

/**
 * Derive `using` directives from the mastercam_api namespace path.
 *
 * Always includes Mastercam.IO + Mastercam.App for the NETHook base class,
 * then walks back from the call's namespace (everything up to the class name)
 * adding each parent namespace as a using directive.
 *
 *   `Mastercam.Curves.LineCreator.CreateByEndpoints`
 *      → `Mastercam.Curves.LineCreator` is the receiver path
 *      → namespace is `Mastercam.Curves`
 *      → using: Mastercam.IO; Mastercam.App; Mastercam.Curves;
 */
function inferUsingDirectives(api: string): readonly string[] {
  const baseUsings = new Set<string>(["Mastercam.IO", "Mastercam.App"]);
  const parts = api.split(".");
  if (parts.length >= 3) {
    // namespace = everything up to (but not including) the class + method
    const namespacePath = parts.slice(0, parts.length - 2).join(".");
    if (namespacePath.length > 0) {
      baseUsings.add(namespacePath);
    }
  }
  return Array.from(baseUsings).sort();
}
