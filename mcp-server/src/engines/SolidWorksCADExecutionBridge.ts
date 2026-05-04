/**
 * SolidWorksCADExecutionBridge — planning↔execution bridge for SolidWorks CAD ops.
 *
 * Mirrors the AutodeskFusionMCPProxyEngine.executeOperation() pattern but emits
 * a VBA macro scaffold instead of a Python script, because SolidWorks does NOT
 * yet ship a public MCP-style remote endpoint. The live execution path is the
 * COM bridge (SolidWorksAutomationBridge.ts) which is currently scoped to a
 * fixed verb set: open, exportSTEP, exportPDF, getBoundingBox, close. This
 * engine produces the audit-trail VBA macro that an operator pastes into
 * `Tools → Macro → New`, runs once, and verifies before committing the result
 * back into PRISM. Pure dry-run by design — operator-in-the-loop is preserved.
 *
 * Two pure static entry points:
 *   1. plan(args) — looks up the op in SolidWorksCADFunctionIndexEngine,
 *      validates required + provided parameters against the catalog tab schema,
 *      enforces type / min / max / enum-list constraints, returns a structured
 *      SolidWorksExecutionPlan with provided / skipped / preselect-required
 *      bookkeeping.
 *   2. renderVBAScaffold(plan) — emits a VBA macro template that wires the
 *      standard swApp / swModel / swFeatureMgr / swSelMgr handles, lists the
 *      provided parameters as labelled comments, surfaces the API binding as
 *      the call site, and leaves a TRACKED marker for the operator to order
 *      positional arguments per the API signature.
 *
 * SolidWorks API receivers inferred from the binding prefix:
 *   IFeatureManager.*       → swFeatureMgr
 *   ISelectionMgr.*         → swSelMgr
 *   ISketchManager.*        → swModel.SketchManager
 *   IModelDocExtension.*    → swModel.Extension
 *   IModelDoc2.*            → swModel
 *   ISldWorks.*             → swApp
 *   IAssemblyDoc.*          → swModel
 *   IDrawingDoc.*           → swModel
 *   (default)               → swModel
 *
 * @engine SolidWorksCADExecutionBridge
 * @milestone CAD-FIDX-SW-INT-01
 * @see SolidWorksCADFunctionIndexEngine — planning-layer catalog (178 ops, 1184 params)
 * @see AutodeskFusionMCPProxyEngine — sibling pattern (Python emission)
 * @see SolidWorksAutomationBridge — live COM verb set
 */

import type {
  SolidWorksCADOperation,
  SolidWorksCADParameter,
} from "./SolidWorksCADFunctionIndexEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_PARAM_NAME_LENGTH = 128;
const ERROR_VALUE_PREVIEW_CHARS = 32;

// ============================================================================
// TYPES
// ============================================================================

export interface SolidWorksPlanArgs {
  moduleId: string;
  operationId: string;
  params: Record<string, unknown>;
}

export interface SolidWorksExecutionPlan {
  module_id: string;
  operation_id: string;
  solidworks_command: string;
  solidworks_api: string;
  category: string;
  provided_params: Record<string, unknown>;
  skipped_params: string[];
  preselect_required: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class SolidWorksCADExecutionBridge {
  /**
   * Plan a SolidWorks CAD operation against the function index catalog.
   *
   * Throws on:
   *   - missing / non-string moduleId or operationId
   *   - non-object params
   *   - oversized parameter name (> MAX_PARAM_NAME_LENGTH)
   *   - operation absent from the catalog
   *   - operation lacking a solidworks_api binding
   *   - missing required catalog parameter
   *   - type mismatch against catalog parameter type
   *   - numeric out-of-range against catalog min/max
   *   - dropdown value not in catalog enum list
   *
   * @param args.moduleId — function-index module id (e.g. "part_operations")
   * @param args.operationId — operation id (e.g. "EXTRUDE_BOSS_BLIND")
   * @param args.params — flat key/value map of catalog parameter values
   * @returns SolidWorksExecutionPlan ready for renderVBAScaffold
   */
  static async plan(args: SolidWorksPlanArgs): Promise<SolidWorksExecutionPlan> {
    if (!args.moduleId || typeof args.moduleId !== "string") {
      throw new Error("SolidWorksCADExecutionBridge.plan: moduleId required (non-empty string)");
    }
    if (!args.operationId || typeof args.operationId !== "string") {
      throw new Error("SolidWorksCADExecutionBridge.plan: operationId required (non-empty string)");
    }
    if (!args.params || typeof args.params !== "object" || Array.isArray(args.params)) {
      throw new Error("SolidWorksCADExecutionBridge.plan: params must be a plain object");
    }

    const { SolidWorksCADFunctionIndexEngine } = await import(
      "./SolidWorksCADFunctionIndexEngine.js"
    );
    const op = SolidWorksCADFunctionIndexEngine.getOperation(args.moduleId, args.operationId);
    if (!op) {
      throw new Error(
        `SolidWorksCADExecutionBridge.plan: operation not found ${args.moduleId}/${args.operationId}`,
      );
    }

    const apiBinding = op.solidworks_api;
    if (!apiBinding) {
      throw new Error(
        `SolidWorksCADExecutionBridge.plan: operation ${args.moduleId}/${args.operationId} has no solidworks_api binding`,
      );
    }

    const command = op.solidworks_command ?? args.operationId;
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
        `SolidWorksCADExecutionBridge.plan: missing required parameters for ${args.moduleId}/${args.operationId}: ${missingNames.join(", ")}`,
      );
    }

    const skipped: string[] = [];
    const provided: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args.params)) {
      if (key.length > MAX_PARAM_NAME_LENGTH) {
        throw new Error(
          `SolidWorksCADExecutionBridge.plan: parameter name exceeds ${MAX_PARAM_NAME_LENGTH} chars: ${truncateForError(key)}`,
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
      solidworks_command: command,
      solidworks_api: apiBinding,
      category: op.category,
      provided_params: provided,
      skipped_params: skipped,
      preselect_required: preselectRequired,
    };
  }

  /**
   * Render a VBA macro scaffold from an execution plan.
   *
   * The macro:
   *   - declares standard SolidWorks COM handles (swApp, swModel, swFeatureMgr,
   *     swSelMgr) with the canonical Set assignments
   *   - lists pre-selection requirements as a TRACKED comment block when the op
   *     has any selection-typed parameters
   *   - lists provided parameters as labelled comments (name = value)
   *   - emits the call site as `<receiver>.<method>(...)` with positional
   *     argument ordering left to the operator (positional vs keyword arg
   *     ordering is API-specific and the catalog stores neither)
   *
   * The output is paste-ready VBA — no live execution.
   *
   * @param plan — output of plan()
   * @returns VBA macro text (single newline-joined string)
   */
  static renderVBAScaffold(plan: SolidWorksExecutionPlan): string {
    const apiReceiver = inferAPIReceiver(plan.solidworks_api);
    const apiMethod = inferAPIMethod(plan.solidworks_api);
    const lines: string[] = [];

    lines.push(`' PRISM SolidWorks macro — auto-generated`);
    lines.push(`' Operation: ${plan.module_id}/${plan.operation_id}`);
    lines.push(`' Command: ${plan.solidworks_command}`);
    lines.push(`' API: ${plan.solidworks_api}`);
    lines.push(`' Category: ${plan.category}`);
    lines.push(``);
    lines.push(`Sub main()`);
    lines.push(`    Dim swApp As Object`);
    lines.push(`    Dim swModel As Object`);
    lines.push(`    Dim swFeatureMgr As Object`);
    lines.push(`    Dim swSelMgr As Object`);
    lines.push(`    Dim feature As Object`);
    lines.push(``);
    lines.push(`    Set swApp = Application.SldWorks`);
    lines.push(`    Set swModel = swApp.ActiveDoc`);
    lines.push(`    Set swFeatureMgr = swModel.FeatureManager`);
    lines.push(`    Set swSelMgr = swModel.SelectionManager`);
    lines.push(``);

    if (plan.preselect_required.length > 0) {
      lines.push(`    ' === PRE-SELECTION REQUIRED [TRACKED] ===`);
      for (const name of plan.preselect_required) {
        lines.push(`    ' Operator must pre-pick entity for: ${name}`);
      }
      lines.push(``);
    }

    lines.push(`    ' === PROVIDED PARAMETERS ===`);
    if (Object.keys(plan.provided_params).length === 0) {
      lines.push(`    ' (none)`);
    } else {
      for (const [key, value] of Object.entries(plan.provided_params)) {
        lines.push(`    ' ${key} = ${formatValueForComment(value)}`);
      }
    }
    lines.push(``);

    if (plan.skipped_params.length > 0) {
      lines.push(`    ' === SKIPPED (NOT IN CATALOG) ===`);
      for (const name of plan.skipped_params) {
        lines.push(`    ' ${name}`);
      }
      lines.push(``);
    }

    lines.push(`    ' === API CALL ===`);
    lines.push(`    ' [TRACKED] Order positional arguments per ${plan.solidworks_api} signature`);
    lines.push(`    Set feature = ${apiReceiver}.${apiMethod}( _`);
    lines.push(`        ' positional args here _`);
    lines.push(`    )`);
    lines.push(``);
    lines.push(`End Sub`);

    return lines.join("\n");
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

function flattenTabs(op: SolidWorksCADOperation): SolidWorksCADParameter[] {
  if (!op.tabs) return [];
  const all: SolidWorksCADParameter[] = [];
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
  def: SolidWorksCADParameter,
): void {
  const t = (def.type ?? "").toLowerCase();

  if (t === "checkbox" || t === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(
        `SolidWorksCADExecutionBridge: parameter ${name} expected boolean, got ${describeValue(value)}`,
      );
    }
    return;
  }

  if (t === "number" || t === "integer" || t === "numeric" || t === "spinner") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `SolidWorksCADExecutionBridge: parameter ${name} expected finite number, got ${describeValue(value)}`,
      );
    }
    if (typeof def.min === "number" && value < def.min) {
      throw new Error(
        `SolidWorksCADExecutionBridge: parameter ${name}=${value} below min=${def.min}`,
      );
    }
    if (typeof def.max === "number" && value > def.max) {
      throw new Error(
        `SolidWorksCADExecutionBridge: parameter ${name}=${value} above max=${def.max}`,
      );
    }
    return;
  }

  if (t === "dropdown" || t === "enum" || t === "combo") {
    if (typeof value !== "string") {
      throw new Error(
        `SolidWorksCADExecutionBridge: parameter ${name} expected string enum, got ${describeValue(value)}`,
      );
    }
    const allowed = def.values ?? def.options ?? [];
    if (allowed.length > 0 && !allowed.includes(value)) {
      throw new Error(
        `SolidWorksCADExecutionBridge: parameter ${name}=${truncateForError(value)} not in allowed enum list (${allowed.length} values)`,
      );
    }
    return;
  }

  if (t === "string" || t === "text") {
    if (typeof value !== "string") {
      throw new Error(
        `SolidWorksCADExecutionBridge: parameter ${name} expected string, got ${describeValue(value)}`,
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
  if (value === undefined) return "undefined";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return `[${value.map(formatValueForComment).join(", ")}]`;
  return String(value);
}

function inferAPIReceiver(api: string): string {
  if (api.startsWith("IFeatureManager.")) return "swFeatureMgr";
  if (api.startsWith("ISelectionMgr.")) return "swSelMgr";
  if (api.startsWith("ISketchManager.")) return "swModel.SketchManager";
  if (api.startsWith("IModelDocExtension.")) return "swModel.Extension";
  if (api.startsWith("IModelDoc2.")) return "swModel";
  if (api.startsWith("ISldWorks.")) return "swApp";
  if (api.startsWith("IAssemblyDoc.")) return "swModel";
  if (api.startsWith("IDrawingDoc.")) return "swModel";
  if (api.startsWith("IDraftAnalysis.")) return "swModel.Extension.GetDraftAnalysisManager";
  if (api.startsWith("ICostingManager.")) return "swModel.Extension.GetCostingManager";
  if (api.startsWith("ISustainabilityManager.")) return "swModel.Extension.GetSustainabilityManager";
  return "swModel";
}

function inferAPIMethod(api: string): string {
  const idx = api.lastIndexOf(".");
  return idx === -1 ? api : api.slice(idx + 1);
}
