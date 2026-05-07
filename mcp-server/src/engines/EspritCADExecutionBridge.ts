/**
 * EspritCADExecutionBridge — planning↔execution bridge for ESPRIT CAM ops.
 *
 * Mirrors the SolidWorks / Inventor / Mastercam / HyperCAD bridge pattern but
 * emits an ESPRIT KBM (Knowledge Base Macro) scaffold instead of VBA / iLogic /
 * C# / HCS macro. ESPRIT (DP Technology / Hexagon) doesn't ship a public
 * MCP-style remote endpoint, so the live execution path is the operator
 * pasting the scaffold into ESPRIT's macro / scripting surface (KBM editor or
 * the newer ESPRIT TNG C# API), running it once, and verifying the result
 * before committing back into PRISM. Pure dry-run by design —
 * operator-in-the-loop is preserved.
 *
 * Two pure static entry points:
 *   1. plan(args) — looks up the op in EspritFunctionIndexEngine
 *      (which auto-detects section across milling / turning / mill_turn /
 *      swiss), validates required + provided parameters against the catalog's
 *      group-nested schema, enforces type / range / enum-list constraints,
 *      returns a structured EspritExecutionPlan with provided / skipped /
 *      preselect-required bookkeeping.
 *   2. renderKBMScaffold(plan) — emits an ESPRIT KBM scaffold that wires the
 *      operation_id + section + dialog tabs as labelled comments, lists the
 *      provided parameters grouped by their dialog-tab group (the natural
 *      Esprit grouping), surfaces preselect requirements, and leaves a
 *      TRACKED marker for the operator to bind to ESPRIT's runtime.
 *
 * Esprit's function index uses operationId-only lookup (section is
 * auto-detected) which is why this bridge's plan() takes operationId rather
 * than the (moduleId, operationId) pair that SW / Inventor / Mastercam /
 * HyperCAD use.
 *
 * @engine EspritCADExecutionBridge
 * @milestone CAD-FIDX-ESP-INT-01
 * @see EspritFunctionIndexEngine — planning-layer catalog (milling/turning/mill_turn/swiss)
 * @see SolidWorksCADExecutionBridge — sibling pattern (VBA emission)
 * @see HyperCADCADExecutionBridge — sibling pattern (HyperCAD-S macro emission)
 */

import type {
  EspritOperation,
  EspritParameter,
} from "./EspritFunctionIndexEngine.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const MAX_PARAM_NAME_LENGTH = 128;
const ERROR_VALUE_PREVIEW_CHARS = 32;

// ============================================================================
// TYPES
// ============================================================================

export interface EspritPlanArgs {
  operationId: string;
  params: Record<string, unknown>;
  /**
   * Optional section hint (milling / turning / mill_turn / swiss). When the
   * function index has the same operation_id in multiple sections, this
   * disambiguates. When omitted, EspritFunctionIndexEngine.getOperation
   * scans all sections and returns the first match.
   */
  sectionHint?: string;
}

export interface EspritParamRecord {
  /** dialog-tab group name (e.g. "Cutting Strategy", "Tool", "Feeds & Speeds") */
  group: string;
  /** parameter name as stored in the catalog */
  name: string;
  /** validated value */
  value: unknown;
}

export interface EspritExecutionPlan {
  operation_id: string;
  section: string;
  display_name: string;
  category: string;
  dialog_tabs: string[];
  /** parameters that matched a catalog spec — preserved with their group */
  provided_params: EspritParamRecord[];
  /** parameter names supplied by the caller but NOT in any catalog group */
  skipped_params: string[];
  /** parameter names whose type is selection-* (operator must pre-pick entity) */
  preselect_required: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class EspritCADExecutionBridge {
  /**
   * Plan an ESPRIT CAM operation against the function index catalog.
   *
   * Throws on:
   *   - missing / non-string operationId
   *   - non-object params
   *   - oversized parameter name (> MAX_PARAM_NAME_LENGTH)
   *   - operation absent from the catalog
   *   - missing required catalog parameter
   *   - type mismatch against catalog parameter type
   *   - numeric out-of-range against catalog range tuple
   *   - dropdown / enum value not in catalog values list
   *
   * @param args.operationId — operation id (e.g. "profitmilling_rough", "thread")
   * @param args.params — flat key/value map of catalog parameter values
   * @param args.sectionHint — optional section override
   * @returns EspritExecutionPlan ready for renderKBMScaffold
   */
  static async plan(args: EspritPlanArgs): Promise<EspritExecutionPlan> {
    if (!args.operationId || typeof args.operationId !== "string") {
      throw new Error("EspritCADExecutionBridge.plan: operationId required (non-empty string)");
    }
    if (!args.params || typeof args.params !== "object" || Array.isArray(args.params)) {
      throw new Error("EspritCADExecutionBridge.plan: params must be a plain object");
    }

    const { EspritFunctionIndexEngine } = await import("./EspritFunctionIndexEngine.js");
    const lookup = EspritFunctionIndexEngine.getOperation(args.operationId);
    if ("error" in lookup) {
      throw new Error(
        `EspritCADExecutionBridge.plan: operation not found "${args.operationId}" (${lookup.error})`,
      );
    }

    let { section, operation } = lookup;

    // Honor sectionHint when supplied AND the hinted section also has the op.
    // If the hint disagrees with the auto-detected section AND the hinted
    // section has the same operation_id, override. If the hint disagrees AND
    // the hinted section does NOT have the operation_id, throw — silently
    // ignoring a wrong hint would mask a caller bug.
    if (args.sectionHint && typeof args.sectionHint === "string") {
      const hinted = EspritFunctionIndexEngine.getSection(args.sectionHint);
      if ("error" in hinted) {
        throw new Error(
          `EspritCADExecutionBridge.plan: sectionHint "${args.sectionHint}" not found (available: ${hinted.available.join(", ")})`,
        );
      }
      const hintedOp = hinted.operations?.[args.operationId];
      if (!hintedOp) {
        throw new Error(
          `EspritCADExecutionBridge.plan: sectionHint "${args.sectionHint}" does not contain operation "${args.operationId}"`,
        );
      }
      section = args.sectionHint;
      operation = hintedOp;
    }

    const allDefs = flattenGroups(operation);

    const requiredDefs = allDefs.filter((p) => p.def.required === true);
    const missingNames: string[] = [];
    for (const entry of requiredDefs) {
      if (!(entry.name in args.params)) {
        missingNames.push(entry.name);
      }
    }
    if (missingNames.length > 0) {
      throw new Error(
        `EspritCADExecutionBridge.plan: missing required parameters for ${section}/${args.operationId}: ${missingNames.join(", ")}`,
      );
    }

    const provided: EspritParamRecord[] = [];
    const skipped: string[] = [];
    for (const [key, value] of Object.entries(args.params)) {
      if (key.length > MAX_PARAM_NAME_LENGTH) {
        throw new Error(
          `EspritCADExecutionBridge.plan: parameter name exceeds ${MAX_PARAM_NAME_LENGTH} chars: ${truncateForError(key)}`,
        );
      }
      const match = allDefs.find((d) => d.name === key);
      if (!match) {
        skipped.push(key);
        continue;
      }
      validateValueType(key, value, match.def);
      provided.push({ group: match.group, name: key, value });
    }

    const preselectRequired = allDefs
      .filter((d) => /^selection/i.test(d.def.type ?? ""))
      .map((d) => d.name);

    return {
      operation_id: args.operationId,
      section,
      display_name: operation.display_name,
      category: operation.category,
      dialog_tabs: operation.dialog_tabs ?? [],
      provided_params: provided,
      skipped_params: skipped,
      preselect_required: preselectRequired,
    };
  }

  /**
   * Render an ESPRIT KBM macro scaffold from an execution plan.
   *
   * The scaffold:
   *   - declares operation_id, section, category, display_name as a header
   *     comment block
   *   - lists dialog_tabs as a navigation aid (matches what the operator
   *     sees in the ESPRIT operation dialog)
   *   - groups provided parameters by their dialog-tab group (which is how
   *     ESPRIT's KBM organizes parameter assignments)
   *   - emits skipped params as a warning block (caller passed them but the
   *     catalog has no spec for them — likely typos or version drift)
   *   - emits a pre-selection requirements block when any selection-typed
   *     parameter exists
   *   - leaves a TRACKED marker for the operator to bind to the ESPRIT
   *     runtime API: in KBM the operation is created via
   *     `Esprit.Operations.AddOperation(<op_id>)` and parameters are set via
   *     `op.SetParameter(<group>, <name>, <value>)`. Positional vs keyword
   *     arg ordering is API-version-specific, so the scaffold leaves it as
   *     TRACKED comments rather than committing to one ESPRIT release.
   *
   * The output is paste-ready KBM — no live execution.
   *
   * @param plan — output of plan()
   * @returns KBM macro text (single newline-joined string)
   */
  static renderKBMScaffold(plan: EspritExecutionPlan): string {
    const lines: string[] = [];

    lines.push(`' PRISM ESPRIT KBM scaffold — auto-generated`);
    lines.push(`' Operation: ${plan.operation_id}`);
    lines.push(`' Section: ${plan.section}`);
    lines.push(`' Display: ${plan.display_name}`);
    lines.push(`' Category: ${plan.category}`);
    lines.push(``);

    if (plan.dialog_tabs.length > 0) {
      lines.push(`' === DIALOG TABS (operator UI navigation) ===`);
      for (const tab of plan.dialog_tabs) {
        lines.push(`'   ${tab}`);
      }
      lines.push(``);
    }

    lines.push(`Sub Main()`);
    lines.push(`    Dim app As Object`);
    lines.push(`    Dim doc As Object`);
    lines.push(`    Dim ops As Object`);
    lines.push(`    Dim op As Object`);
    lines.push(``);
    lines.push(`    Set app = Esprit.Application`);
    lines.push(`    Set doc = app.ActiveDocument`);
    lines.push(`    Set ops = doc.Operations`);
    lines.push(``);

    if (plan.preselect_required.length > 0) {
      lines.push(`    ' === PRE-SELECTION REQUIRED [TRACKED] ===`);
      for (const name of plan.preselect_required) {
        lines.push(`    ' Operator must pre-pick geometry for: ${name}`);
      }
      lines.push(``);
    }

    lines.push(`    ' === ADD OPERATION ===`);
    lines.push(`    ' [TRACKED] Bind to ESPRIT API version on this machine.`);
    lines.push(`    ' KBM (legacy):  Set op = ops.AddOperation("${plan.operation_id}")`);
    lines.push(`    ' TNG C# API:    op = doc.Operations.Add(EspritOperationKind.${plan.operation_id})`);
    lines.push(`    Set op = ops.AddOperation("${plan.operation_id}")`);
    lines.push(``);

    if (plan.provided_params.length === 0) {
      lines.push(`    ' === PROVIDED PARAMETERS ===`);
      lines.push(`    ' (none supplied — operation will use ESPRIT defaults)`);
      lines.push(``);
    } else {
      const grouped = groupByDialogGroup(plan.provided_params);
      for (const [group, records] of grouped) {
        lines.push(`    ' === GROUP: ${group} ===`);
        for (const record of records) {
          lines.push(
            `    op.SetParameter("${group}", "${record.name}", ${formatKBMValue(record.value)})`,
          );
        }
        lines.push(``);
      }
    }

    if (plan.skipped_params.length > 0) {
      lines.push(`    ' === SKIPPED (NOT IN CATALOG) ===`);
      lines.push(`    ' These parameters were supplied but have no schema entry.`);
      lines.push(`    ' Likely a typo or catalog version drift — verify before applying.`);
      for (const name of plan.skipped_params) {
        lines.push(`    '   ${name}`);
      }
      lines.push(``);
    }

    lines.push(`    ' === FINALIZE ===`);
    lines.push(`    op.Update`);
    lines.push(`    doc.Save`);
    lines.push(``);
    lines.push(`End Sub`);

    return lines.join("\n");
  }
}

// ============================================================================
// HELPERS (module-private)
// ============================================================================

interface FlattenedDef {
  group: string;
  name: string;
  def: EspritParameter;
}

function flattenGroups(op: EspritOperation): FlattenedDef[] {
  if (!op.parameters) return [];
  const all: FlattenedDef[] = [];
  for (const [groupName, group] of Object.entries(op.parameters)) {
    if (!group || typeof group !== "object") continue;
    for (const [paramName, paramDef] of Object.entries(group)) {
      all.push({ group: groupName, name: paramName, def: paramDef });
    }
  }
  return all;
}

function validateValueType(name: string, value: unknown, def: EspritParameter): void {
  const t = (def.type ?? "").toLowerCase();

  if (t === "checkbox" || t === "boolean" || t === "bool") {
    if (typeof value !== "boolean") {
      throw new Error(
        `EspritCADExecutionBridge: parameter ${name} expected boolean, got ${describeValue(value)}`,
      );
    }
    return;
  }

  if (t === "number" || t === "integer" || t === "int" || t === "numeric" || t === "spinner") {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new Error(
        `EspritCADExecutionBridge: parameter ${name} expected finite number, got ${describeValue(value)}`,
      );
    }
    if (Array.isArray(def.range) && def.range.length === 2) {
      const [min, max] = def.range;
      if (typeof min === "number" && value < min) {
        throw new Error(
          `EspritCADExecutionBridge: parameter ${name}=${value} below range min=${min}`,
        );
      }
      if (typeof max === "number" && value > max) {
        throw new Error(
          `EspritCADExecutionBridge: parameter ${name}=${value} above range max=${max}`,
        );
      }
    }
    return;
  }

  if (t === "dropdown" || t === "enum" || t === "combo" || t === "select") {
    if (typeof value !== "string") {
      throw new Error(
        `EspritCADExecutionBridge: parameter ${name} expected string enum, got ${describeValue(value)}`,
      );
    }
    if (Array.isArray(def.values) && def.values.length > 0 && !def.values.includes(value)) {
      throw new Error(
        `EspritCADExecutionBridge: parameter ${name}="${truncateForError(value)}" not in allowed enum list (${def.values.length} values)`,
      );
    }
    return;
  }

  if (t === "string" || t === "text") {
    if (typeof value !== "string") {
      throw new Error(
        `EspritCADExecutionBridge: parameter ${name} expected string, got ${describeValue(value)}`,
      );
    }
    return;
  }

  // selection-* and unknown types accept any value as an opaque token reference.
  // The preselect_required list in the plan tells the operator to pre-pick.
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

function formatKBMValue(value: unknown): string {
  if (value === null) return "Null";
  if (value === undefined) return "Empty";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "string") return `"${value.replace(/"/g, '""')}"`;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return `Array(${value.map(formatKBMValue).join(", ")})`;
  return `"${String(value).replace(/"/g, '""')}"`;
}

function groupByDialogGroup(records: EspritParamRecord[]): Map<string, EspritParamRecord[]> {
  const out = new Map<string, EspritParamRecord[]>();
  for (const record of records) {
    const list = out.get(record.group) ?? [];
    list.push(record);
    out.set(record.group, list);
  }
  return out;
}
