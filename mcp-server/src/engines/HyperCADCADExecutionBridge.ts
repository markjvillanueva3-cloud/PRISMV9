/**
 * HyperCADCADExecutionBridge — planning↔execution bridge for HyperCAD-S CAD ops.
 *
 * Mirrors SolidWorksCADExecutionBridge / InventorCADExecutionBridge /
 * MastercamCADExecutionBridge but emits a HyperCAD-S macro scaffold instead of
 * VBA / iLogic / C#. HyperCAD-S (the OPEN MIND CAD application bundled with
 * hyperMILL) is automated through dotted uppercase macro paths
 * (e.g. `SKETCH.CIRCLE.CREATE`, `SOLID.PRIMITIVE.BOX`). The catalog stores
 * these in `fusion_command` (legacy field name from the Fusion 360 schema
 * base), with two equivalent shapes:
 *   1. Clean form:    `SKETCH.CIRCLE.CREATE`
 *   2. Sentinel form: `n/a (hyperCAD-S [uses ]?macro: SKETCH.CIRCLE.CREATE)`
 *
 * The catalog also exposes `python_api` (e.g. `Sketcher.createCircle`) which
 * is a documentation-style notation for the underlying scripting object model
 * — used as the fallback when the macro path can't be resolved.
 *
 * No live MCP-style remote endpoint exists for HyperCAD-S; the existing
 * HyperCADSAutomationEngine.ts and PrintToHyperCADSBridge.ts handle limited
 * live automation. This engine produces the audit-trail macro scaffold that
 * an operator pastes into the HyperCAD-S Macro Editor, runs once, and
 * verifies before committing the result back into PRISM. Pure dry-run by
 * design — operator-in-the-loop preserved.
 *
 * Two pure static entry points:
 *   1. plan(args) — looks up the op in HyperCADCADFunctionIndexEngine,
 *      validates required + provided parameters against the catalog tab
 *      schema, enforces type / min / max / enum-list constraints, returns a
 *      structured HyperCADExecutionPlan with provided / skipped /
 *      preselect-required bookkeeping plus a resolved macro path.
 *   2. renderMacroScaffold(plan) — emits a HyperCAD-S macro skeleton with
 *      the @-prefixed macro path, brace-enclosed body, parameter assignments
 *      as `key = value` lines, pre-selection requirements as TRACKED
 *      comments, and an EXEC marker for the operator to fire the macro.
 *
 * Type validation table (same as SolidWorks / Inventor / Mastercam bridges):
 *   checkbox / boolean → typeof boolean
 *   number / integer / numeric / spinner → finite number + min/max range
 *   dropdown / enum / combo → string + must be in def.values | def.options
 *   string / text → typeof string
 *   point2d / point3d / selection-* → opaque token (any value accepted)
 *
 * @engine HyperCADCADExecutionBridge
 * @milestone CAD-FIDX-HC-INT-01
 * @see HyperCADCADFunctionIndexEngine — planning-layer catalog (8 modules / 1001 params)
 * @see SolidWorksCADExecutionBridge — sibling pattern (VBA emission)
 * @see InventorCADExecutionBridge — sibling pattern (iLogic VB.NET emission)
 * @see MastercamCADExecutionBridge — sibling pattern (C# NET-Hook emission)
 */

import type {
  CADOperation as HyperCADOperation,
  CADParameter as HyperCADParameter,
} from "./HyperCADCADFunctionIndexEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_PARAM_NAME_LENGTH = 128;
const ERROR_VALUE_PREVIEW_CHARS = 32;

// ============================================================================
// TYPES
// ============================================================================

export interface HyperCADPlanArgs {
  moduleId: string;
  operationId: string;
  params: Record<string, unknown>;
}

export interface HyperCADExecutionPlan {
  module_id: string;
  operation_id: string;
  hypercad_macro: string;
  hypercad_api: string;
  category: string;
  provided_params: Record<string, unknown>;
  skipped_params: string[];
  preselect_required: string[];
  /** True when fusion_command was the "n/a (hyperCAD-S macro: ...)" sentinel and the path was extracted */
  macro_resolved_from_sentinel: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

export class HyperCADCADExecutionBridge {
  /**
   * Plan a HyperCAD-S CAD operation against the function index catalog.
   *
   * Throws on:
   *   - missing / non-string moduleId or operationId
   *   - non-object params
   *   - oversized parameter name (> MAX_PARAM_NAME_LENGTH)
   *   - operation absent from the catalog
   *   - operation lacking BOTH a fusion_command AND a python_api binding
   *   - missing required catalog parameter
   *   - type mismatch / min-max / enum violations
   *
   * Resolves the macro path from `fusion_command`:
   *   - "SKETCH.CIRCLE.CREATE" → used as-is
   *   - "n/a (hyperCAD-S macro: SKETCH.CIRCLE.CREATE)" → extracted via regex
   *   - "n/a (hyperCAD-S uses macro: SKETCH.CIRCLE.CREATE)" → extracted via regex
   *
   * @param args.moduleId — function-index module id (e.g. "sketch_operations")
   * @param args.operationId — operation id (e.g. "CIRCLE")
   * @param args.params — flat key/value map of catalog parameter values
   * @returns HyperCADExecutionPlan ready for renderMacroScaffold
   */
  static async plan(args: HyperCADPlanArgs): Promise<HyperCADExecutionPlan> {
    if (!args.moduleId || typeof args.moduleId !== "string") {
      throw new Error("HyperCADCADExecutionBridge.plan: moduleId required (non-empty string)");
    }
    if (!args.operationId || typeof args.operationId !== "string") {
      throw new Error("HyperCADCADExecutionBridge.plan: operationId required (non-empty string)");
    }
    if (!args.params || typeof args.params !== "object" || Array.isArray(args.params)) {
      throw new Error("HyperCADCADExecutionBridge.plan: params must be a plain object");
    }

    const { HyperCADCADFunctionIndexEngine } = await import(
      "./HyperCADCADFunctionIndexEngine.js"
    );
    const op = HyperCADCADFunctionIndexEngine.getOperation(args.moduleId, args.operationId);
    if (!op) {
      throw new Error(
        `HyperCADCADExecutionBridge.plan: operation not found ${args.moduleId}/${args.operationId}`,
      );
    }

    const macroResolution = resolveMacroPath(op.fusion_command);
    const apiBinding = op.python_api ?? "";

    if (!macroResolution.path && !apiBinding) {
      throw new Error(
        `HyperCADCADExecutionBridge.plan: operation ${args.moduleId}/${args.operationId} has neither fusion_command (macro path) nor python_api binding`,
      );
    }

    // If the macro path resolved cleanly use it; otherwise fall back to the python_api
    // chained-receiver as a documentation-only placeholder
    const macroPath = macroResolution.path ?? apiBinding;
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
        `HyperCADCADExecutionBridge.plan: missing required parameters for ${args.moduleId}/${args.operationId}: ${missingNames.join(", ")}`,
      );
    }

    const skipped: string[] = [];
    const provided: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args.params)) {
      if (key.length > MAX_PARAM_NAME_LENGTH) {
        throw new Error(
          `HyperCADCADExecutionBridge.plan: parameter name exceeds ${MAX_PARAM_NAME_LENGTH} chars: ${truncateForError(key)}`,
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
      hypercad_macro: macroPath,
      hypercad_api: apiBinding,
      category: op.category,
      provided_params: provided,
      skipped_params: skipped,
      preselect_required: preselectRequired,
      macro_resolved_from_sentinel: macroResolution.fromSentinel,
    };
  }

  /**
   * Render a HyperCAD-S macro scaffold from an execution plan.
   *
   * The scaffold:
   *   - emits a header comment block with the operation / macro / api /
   *     category metadata (HyperCAD-S macros use `'` apostrophe comments)
   *   - opens an @-prefixed macro invocation with a brace-enclosed body
   *   - lists pre-selection requirements as TRACKED comments when the op
   *     has any selection-typed parameters
   *   - emits provided parameters as `Key = value` assignments inside the
   *     macro body (HyperCAD-S-flavored: `"x"` strings, `True`/`False`
   *     booleans, no unit suffixes)
   *   - closes with an EXEC marker that the operator either keeps (to fire
   *     the macro immediately on paste) or comments out (to inspect first)
   *
   * Sentinel-resolved macro paths get an extra `' SOURCE: extracted from
   * sentinel form` line so the operator knows the binding came from
   * documentation parsing rather than a clean catalog field.
   *
   * @param plan — output of plan()
   * @returns HyperCAD-S macro scaffold (single newline-joined string)
   */
  static renderMacroScaffold(plan: HyperCADExecutionPlan): string {
    const lines: string[] = [];

    lines.push(`' PRISM HyperCAD-S macro — auto-generated`);
    lines.push(`' Operation: ${plan.module_id}/${plan.operation_id}`);
    lines.push(`' Macro: ${plan.hypercad_macro}`);
    if (plan.hypercad_api) {
      lines.push(`' API: ${plan.hypercad_api}`);
    }
    lines.push(`' Category: ${plan.category}`);
    if (plan.macro_resolved_from_sentinel) {
      lines.push(`' SOURCE: macro path extracted from "n/a" sentinel — verify against catalog before EXEC`);
    }
    lines.push(``);
    lines.push(`@${plan.hypercad_macro}`);
    lines.push(`{`);

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
        lines.push(`    ${formatKeyForMacro(key)} = ${formatValueForMacro(value)}`);
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

    lines.push(`    ' === EXEC MARKER [TRACKED] ===`);
    lines.push(`    ' Order positional arguments per ${plan.hypercad_macro} signature`);
    lines.push(`    EXEC`);
    lines.push(`}`);

    return lines.join("\n");
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

function flattenTabs(op: HyperCADOperation): HyperCADParameter[] {
  if (!op.tabs) return [];
  const all: HyperCADParameter[] = [];
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
  def: HyperCADParameter,
): void {
  const t = (def.type ?? "").toLowerCase();

  if (t === "checkbox" || t === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(
        `HyperCADCADExecutionBridge: parameter ${name} expected boolean, got ${describeValue(value)}`,
      );
    }
    return;
  }

  if (t === "number" || t === "integer" || t === "numeric" || t === "spinner") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `HyperCADCADExecutionBridge: parameter ${name} expected finite number, got ${describeValue(value)}`,
      );
    }
    if (typeof def.min === "number" && value < def.min) {
      throw new Error(
        `HyperCADCADExecutionBridge: parameter ${name}=${value} below min=${def.min}`,
      );
    }
    if (typeof def.max === "number" && value > def.max) {
      throw new Error(
        `HyperCADCADExecutionBridge: parameter ${name}=${value} above max=${def.max}`,
      );
    }
    return;
  }

  if (t === "dropdown" || t === "enum" || t === "combo") {
    if (typeof value !== "string") {
      throw new Error(
        `HyperCADCADExecutionBridge: parameter ${name} expected string enum, got ${describeValue(value)}`,
      );
    }
    const allowed = def.values ?? def.options ?? [];
    if (allowed.length > 0 && !allowed.includes(value)) {
      throw new Error(
        `HyperCADCADExecutionBridge: parameter ${name}=${truncateForError(value)} not in allowed enum list (${allowed.length} values)`,
      );
    }
    return;
  }

  if (t === "string" || t === "text") {
    if (typeof value !== "string") {
      throw new Error(
        `HyperCADCADExecutionBridge: parameter ${name} expected string, got ${describeValue(value)}`,
      );
    }
    return;
  }

  // selection-*, point2d, point3d, selection_list, and unknown types accept any value
  // as an opaque token reference
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

function formatKeyForMacro(key: string): string {
  // HyperCAD-S macro keys are unquoted identifiers — wrap any key with
  // whitespace, dashes, or other non-identifier characters in square brackets
  // so the macro parser treats it as a single token
  if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return key;
  return `[${key}]`;
}

function formatValueForMacro(value: unknown): string {
  if (value === null) return "NULL";
  if (value === undefined) return "NULL";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return `(${value.map(formatValueForMacro).join(", ")})`;
  return String(value);
}

interface MacroResolution {
  path: string | null;
  fromSentinel: boolean;
}

/**
 * Resolve a HyperCAD-S macro path from the catalog's `fusion_command` field.
 *
 * Three shapes:
 *   - undefined / empty → null
 *   - clean uppercase dotted path → returned as-is
 *   - "n/a (hyperCAD-S [uses ]?macro: PATH)" sentinel → PATH extracted via regex
 */
function resolveMacroPath(fusionCommand: string | undefined): MacroResolution {
  if (!fusionCommand || fusionCommand.trim().length === 0) {
    return { path: null, fromSentinel: false };
  }
  const trimmed = fusionCommand.trim();
  if (!trimmed.toLowerCase().startsWith("n/a")) {
    return { path: trimmed, fromSentinel: false };
  }
  // Sentinel form: extract the dotted-uppercase identifier after "macro:"
  const m = trimmed.match(/macro:\s*([A-Z][A-Z0-9_.]*)/);
  if (m) return { path: m[1], fromSentinel: true };
  return { path: null, fromSentinel: false };
}
