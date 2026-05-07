/**
 * InventorCADExecutionBridge — planning↔execution bridge for Inventor CAD ops.
 *
 * Mirrors the AutodeskFusionMCPProxyEngine.executeOperation() and
 * SolidWorksCADExecutionBridge.plan/render pattern but emits an iLogic VB.NET
 * scaffold instead of a Python script or VBA macro. Inventor's automation
 * surface is the .NET COM API exposed through `ThisApplication` / `ThisDoc`
 * inside iLogic; the catalog's `python_api` field documents the chained
 * receiver tree (e.g. `ComponentDefinition.Features.ExtrudeFeatures.AddByDistanceExtent`).
 *
 * No live MCP-style remote endpoint exists for Inventor; the existing
 * InventorAutomationBridge.ts hosts a fixed verb set via COM. This engine
 * produces the audit-trail iLogic snippet that an operator pastes into the
 * iLogic Browser, runs once, and verifies before committing the result back
 * into PRISM. Pure dry-run by design — operator-in-the-loop preserved.
 *
 * Two pure static entry points:
 *   1. plan(args) — looks up the op in InventorCADFunctionIndexEngine,
 *      validates required + provided parameters against the catalog tab
 *      schema, enforces type / min / max / enum-list constraints, returns a
 *      structured InventorExecutionPlan with provided / skipped /
 *      preselect-required bookkeeping.
 *   2. renderILogicScaffold(plan) — emits a VB.NET / iLogic snippet with the
 *      standard `oApp` / `oDoc` / `oCompDef` handles wired, lists provided
 *      parameters as labelled comments, surfaces the API binding as the call
 *      site, and leaves a TRACKED marker for positional argument ordering.
 *
 * Inventor API receiver inference (from python_api binding prefix):
 *   ComponentDefinition.*    → oCompDef
 *   ThisApplication.*        → oApp
 *   ThisDoc.*                → ThisDoc
 *   Document.*               → oDoc
 *   Sheets.*                 → oDoc.Sheets        (drawing context)
 *   Sketches.*               → oCompDef.Sketches  (part context)
 *   Features.*               → oCompDef.Features  (part context)
 *   (default)                → oCompDef
 *
 * @engine InventorCADExecutionBridge
 * @milestone CAD-FIDX-INV-INT-01
 * @see InventorCADFunctionIndexEngine — planning-layer catalog (8 modules / 983 params)
 * @see SolidWorksCADExecutionBridge — sibling pattern (VBA emission)
 * @see AutodeskFusionMCPProxyEngine — sibling pattern (Python emission)
 * @see InventorAutomationBridge — live COM verb set
 */

import type {
  CADOperation as InventorCADOperation,
  CADParameter as InventorCADParameter,
} from "./InventorCADFunctionIndexEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_PARAM_NAME_LENGTH = 128;
const ERROR_VALUE_PREVIEW_CHARS = 32;

// ============================================================================
// TYPES
// ============================================================================

export interface InventorPlanArgs {
  moduleId: string;
  operationId: string;
  params: Record<string, unknown>;
}

export interface InventorExecutionPlan {
  module_id: string;
  operation_id: string;
  inventor_command: string;
  inventor_api: string;
  category: string;
  provided_params: Record<string, unknown>;
  skipped_params: string[];
  preselect_required: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class InventorCADExecutionBridge {
  /**
   * Plan an Inventor CAD operation against the function index catalog.
   *
   * Throws on:
   *   - missing / non-string moduleId or operationId
   *   - non-object params
   *   - oversized parameter name (> MAX_PARAM_NAME_LENGTH)
   *   - operation absent from the catalog
   *   - operation lacking a python_api binding
   *   - missing required catalog parameter
   *   - type mismatch against catalog parameter type
   *   - numeric out-of-range against catalog min/max
   *   - dropdown value not in catalog enum list
   *
   * @param args.moduleId — function-index module id (e.g. "part_operations")
   * @param args.operationId — operation id (e.g. "EXTRUDE")
   * @param args.params — flat key/value map of catalog parameter values
   * @returns InventorExecutionPlan ready for renderILogicScaffold
   */
  static async plan(args: InventorPlanArgs): Promise<InventorExecutionPlan> {
    if (!args.moduleId || typeof args.moduleId !== "string") {
      throw new Error("InventorCADExecutionBridge.plan: moduleId required (non-empty string)");
    }
    if (!args.operationId || typeof args.operationId !== "string") {
      throw new Error("InventorCADExecutionBridge.plan: operationId required (non-empty string)");
    }
    if (!args.params || typeof args.params !== "object" || Array.isArray(args.params)) {
      throw new Error("InventorCADExecutionBridge.plan: params must be a plain object");
    }

    const { InventorCADFunctionIndexEngine } = await import(
      "./InventorCADFunctionIndexEngine.js"
    );
    const op = InventorCADFunctionIndexEngine.getOperation(args.moduleId, args.operationId);
    if (!op) {
      throw new Error(
        `InventorCADExecutionBridge.plan: operation not found ${args.moduleId}/${args.operationId}`,
      );
    }

    const apiBinding = op.python_api;
    if (!apiBinding) {
      throw new Error(
        `InventorCADExecutionBridge.plan: operation ${args.moduleId}/${args.operationId} has no python_api binding`,
      );
    }

    const command = op.fusion_command ?? args.operationId;
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
        `InventorCADExecutionBridge.plan: missing required parameters for ${args.moduleId}/${args.operationId}: ${missingNames.join(", ")}`,
      );
    }

    const skipped: string[] = [];
    const provided: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args.params)) {
      if (key.length > MAX_PARAM_NAME_LENGTH) {
        throw new Error(
          `InventorCADExecutionBridge.plan: parameter name exceeds ${MAX_PARAM_NAME_LENGTH} chars: ${truncateForError(key)}`,
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
      inventor_command: command,
      inventor_api: apiBinding,
      category: op.category,
      provided_params: provided,
      skipped_params: skipped,
      preselect_required: preselectRequired,
    };
  }

  /**
   * Render an iLogic VB.NET scaffold from an execution plan.
   *
   * The snippet:
   *   - declares `oApp` / `oDoc` / `oCompDef` handles via the canonical
   *     iLogic preamble (`Dim ... = ThisApplication / ThisDoc.Document / ...`)
   *   - lists pre-selection requirements as a TRACKED comment block when the
   *     op has any selection-typed parameters
   *   - lists provided parameters as labelled comments (name = value)
   *   - emits the call site as `<receiver>.<method>(...)` with positional
   *     argument ordering left to the operator (the catalog stores neither
   *     positional ordering nor receiver path)
   *   - uses the VB.NET line-continuation `_` underscore for multi-line calls
   *
   * For multi-overload python_api strings (slash-separated method names)
   * only the first overload is emitted; the operator picks the right
   * variant for their selection set.
   *
   * @param plan — output of plan()
   * @returns iLogic VB.NET snippet (single newline-joined string)
   */
  static renderILogicScaffold(plan: InventorExecutionPlan): string {
    const apiPath = firstOverload(plan.inventor_api);
    const apiReceiver = inferAPIReceiver(apiPath);
    const apiMethod = inferAPIMethod(apiPath);
    const lines: string[] = [];

    lines.push(`' PRISM Inventor iLogic — auto-generated`);
    lines.push(`' Operation: ${plan.module_id}/${plan.operation_id}`);
    lines.push(`' Command: ${plan.inventor_command}`);
    lines.push(`' API: ${plan.inventor_api}`);
    lines.push(`' Category: ${plan.category}`);
    lines.push(``);
    lines.push(`Dim oApp As Inventor.Application = ThisApplication`);
    lines.push(`Dim oDoc As Document = ThisDoc.Document`);
    lines.push(`Dim oCompDef As ComponentDefinition = oDoc.ComponentDefinition`);
    lines.push(``);

    if (plan.preselect_required.length > 0) {
      lines.push(`' === PRE-SELECTION REQUIRED [TRACKED] ===`);
      for (const name of plan.preselect_required) {
        lines.push(`' Operator must pre-pick entity for: ${name}`);
      }
      lines.push(``);
    }

    lines.push(`' === PROVIDED PARAMETERS ===`);
    if (Object.keys(plan.provided_params).length === 0) {
      lines.push(`' (none)`);
    } else {
      for (const [key, value] of Object.entries(plan.provided_params)) {
        lines.push(`' ${key} = ${formatValueForComment(value)}`);
      }
    }
    lines.push(``);

    if (plan.skipped_params.length > 0) {
      lines.push(`' === SKIPPED (NOT IN CATALOG) ===`);
      for (const name of plan.skipped_params) {
        lines.push(`' ${name}`);
      }
      lines.push(``);
    }

    lines.push(`' === API CALL ===`);
    lines.push(`' [TRACKED] Order positional arguments per ${plan.inventor_api} signature`);
    lines.push(`Dim oFeature = ${apiReceiver}.${apiMethod}( _`);
    lines.push(`    ' positional args here _`);
    lines.push(`)`);

    return lines.join("\n");
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

function flattenTabs(op: InventorCADOperation): InventorCADParameter[] {
  if (!op.tabs) return [];
  const all: InventorCADParameter[] = [];
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
  def: InventorCADParameter,
): void {
  const t = (def.type ?? "").toLowerCase();

  if (t === "checkbox" || t === "boolean") {
    if (typeof value !== "boolean") {
      throw new Error(
        `InventorCADExecutionBridge: parameter ${name} expected boolean, got ${describeValue(value)}`,
      );
    }
    return;
  }

  if (t === "number" || t === "integer" || t === "numeric" || t === "spinner") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `InventorCADExecutionBridge: parameter ${name} expected finite number, got ${describeValue(value)}`,
      );
    }
    if (typeof def.min === "number" && value < def.min) {
      throw new Error(
        `InventorCADExecutionBridge: parameter ${name}=${value} below min=${def.min}`,
      );
    }
    if (typeof def.max === "number" && value > def.max) {
      throw new Error(
        `InventorCADExecutionBridge: parameter ${name}=${value} above max=${def.max}`,
      );
    }
    return;
  }

  if (t === "dropdown" || t === "enum" || t === "combo") {
    if (typeof value !== "string") {
      throw new Error(
        `InventorCADExecutionBridge: parameter ${name} expected string enum, got ${describeValue(value)}`,
      );
    }
    const allowed = def.values ?? def.options ?? [];
    if (allowed.length > 0 && !allowed.includes(value)) {
      throw new Error(
        `InventorCADExecutionBridge: parameter ${name}=${truncateForError(value)} not in allowed enum list (${allowed.length} values)`,
      );
    }
    return;
  }

  if (t === "string" || t === "text") {
    if (typeof value !== "string") {
      throw new Error(
        `InventorCADExecutionBridge: parameter ${name} expected string, got ${describeValue(value)}`,
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
  if (value === null) return "Nothing";
  if (value === undefined) return "Nothing";
  if (typeof value === "string") return `"${value}"`;
  if (typeof value === "boolean") return value ? "True" : "False";
  if (Array.isArray(value)) return `{${value.map(formatValueForComment).join(", ")}}`;
  return String(value);
}

/** First overload from a slash-separated python_api string (Inventor multi-overload pattern). */
function firstOverload(api: string): string {
  const slashIdx = api.indexOf(" / ");
  if (slashIdx === -1) return api.trim();
  return api.slice(0, slashIdx).trim();
}

function inferAPIReceiver(api: string): string {
  // Walk the catalog binding's chained receiver tree and map the leading
  // segment to the canonical iLogic handle. The catalog writes Inventor
  // binding strings as the user-facing object tree, e.g.
  // "ComponentDefinition.Features.ExtrudeFeatures.AddByDistanceExtent" →
  // receiver path is everything up to (but not including) the trailing method.
  const lastDot = api.lastIndexOf(".");
  if (lastDot === -1) return "oCompDef";
  const receiverPath = api.slice(0, lastDot);

  if (receiverPath.startsWith("ComponentDefinition.")) {
    return receiverPath.replace(/^ComponentDefinition\./, "oCompDef.");
  }
  if (receiverPath === "ComponentDefinition") return "oCompDef";
  if (receiverPath.startsWith("ThisApplication.")) {
    return receiverPath.replace(/^ThisApplication\./, "oApp.");
  }
  if (receiverPath === "ThisApplication") return "oApp";
  if (receiverPath.startsWith("ThisDoc.")) return receiverPath;
  if (receiverPath === "ThisDoc") return "ThisDoc";
  if (receiverPath.startsWith("Document.")) {
    return receiverPath.replace(/^Document\./, "oDoc.");
  }
  if (receiverPath === "Document") return "oDoc";
  if (receiverPath.startsWith("Sheets.")) return `oDoc.${receiverPath}`;
  if (receiverPath === "Sheets") return "oDoc.Sheets";
  if (receiverPath.startsWith("Sketches.")) return `oCompDef.${receiverPath}`;
  if (receiverPath === "Sketches") return "oCompDef.Sketches";
  if (receiverPath.startsWith("Features.")) return `oCompDef.${receiverPath}`;
  if (receiverPath === "Features") return "oCompDef.Features";
  return `oCompDef.${receiverPath}`;
}

function inferAPIMethod(api: string): string {
  const idx = api.lastIndexOf(".");
  return idx === -1 ? api : api.slice(idx + 1);
}
