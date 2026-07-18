/**
 * CAMOperationInputSchemaEngine — CAM-AI-TRAINING-MS0/U-CAMT-B02
 *
 * Unified per-(CamOperation, CamSystem) input-parameter schema. Sits on top
 * of CAMOperationTaxonomyEngine (B01) and feeds CAMTemplateGeneratorEngine
 * (B03). For every supported (op, system) pair the taxonomy engine reports,
 * this engine emits a normalized InputSchema with required + optional
 * parameters, types, defaults, ranges, and units.
 *
 * Design intent:
 *   - Pure logic. No fs/network. Static dictionaries inline.
 *   - Source of every parameter row is a vendor-documented CAM input — the
 *     existing per-software FunctionIndexEngines (Fusion360 / Mastercam /
 *     HyperMill / SolidCAM / Inventor HSM / NX / PowerMill / Esprit / CATIA)
 *     extracted the parameter sets from vendor docs; this engine normalizes
 *     them into a single shape the template generator can compose.
 *   - v1 covers the 3 most-frequently-used CAM softwares (Fusion 360,
 *     Mastercam, hyperMILL) deeply and the remaining 22 systems via a
 *     COMMON_PARAMS fallback so no (op, system) supported pair returns
 *     an empty schema. Per-software depth grows in v2+ as Phase-B units
 *     U-CAMT-B04..B27 fill in vendor-specific rows.
 *
 * Real-data discipline: every parameter row carries a `source` field naming
 * the vendor doc (or vendor function-index module) it came from.
 */
import { BaseEngine } from "./BaseEngine.js";
import type { EngineInfo, EngineCapability } from "./IEngine.js";
import {
  camOperationTaxonomyEngine,
  type CamOperation,
  type CamSystem,
} from "./CAMOperationTaxonomyEngine.js";

// ── Param types ──────────────────────────────────────────────────────────────

export type ParamType =
  | "length" | "angle" | "speed_rpm" | "feed_mmpm" | "feed_mmpr"
  | "count" | "boolean" | "enum" | "string" | "tool_ref" | "selection";

export type LengthUnit = "mm" | "in";
export type SpeedUnit = "rpm";
export type FeedUnit = "mm/min" | "mm/rev" | "in/min" | "in/rev";

export interface InputParameter {
  /** Stable canonical name across CAM systems. */
  id: string;
  /** Human-readable label as shown in the CAM UI (vendor-documented). */
  label: string;
  /** Canonical parameter type. */
  type: ParamType;
  /** Unit symbol (when applicable). */
  unit?: LengthUnit | SpeedUnit | FeedUnit | "deg";
  /** Default value (when documented). */
  defaultValue?: number | string | boolean;
  /** Minimum (inclusive) for numeric types. */
  min?: number;
  /** Maximum (inclusive) for numeric types. */
  max?: number;
  /** Allowed enum values (when type === "enum"). */
  enumValues?: ReadonlyArray<string>;
  /** Is this parameter mandatory for a valid template? */
  required: boolean;
  /** Short description for AI consumers + UI tooltips. */
  description: string;
  /** Where the parameter row was sourced from. */
  source: string;
}

export interface InputSchema {
  op: CamOperation;
  system: CamSystem;
  /** Vendor-native operation name (from taxonomy B01). */
  nativeName: string;
  /** Schema version — bump when shape changes. */
  schemaVersion: "1.0.0";
  /** Parameter rows in the order the UI typically presents them. */
  parameters: ReadonlyArray<InputParameter>;
  /** Caveats / vendor-specific notes. */
  notes?: string;
}

// ── Common parameter library (shared across all milling ops) ────────────────
// Each common param row maps directly to a documented CAM input. Sources:
//   F360  — Fusion360FunctionIndexEngine (data/cam-functions/fusion360/)
//   MC    — MastercamCADFunctionIndexEngine (data/cam-functions/mastercam/)
//   HM    — HyperMillFunctionIndexEngine (data/cam-functions/hypermill/)

const COMMON_MILLING_PARAMS: InputParameter[] = [
  { id: "tool",          label: "Tool",                type: "tool_ref",   required: true,
    description: "Cutter selection (dia/flutes/material/holder).",
    source: "F360+MC+HM common UI" },
  { id: "wcs",           label: "Work Coordinate System", type: "string",  defaultValue: "G54", required: true,
    description: "Active work-coordinate origin (G54..G59.3 typical).",
    source: "ISO 6983 / vendor UI" },
  { id: "spindle_rpm",   label: "Spindle Speed",       type: "speed_rpm",  unit: "rpm",
    defaultValue: 8000, min: 1, max: 60000, required: true,
    description: "Spindle RPM (constant or surface-speed-controlled).",
    source: "F360+MC+HM cut tab" },
  { id: "feed_xy",       label: "Cutting Feed (XY)",   type: "feed_mmpm",  unit: "mm/min",
    defaultValue: 1200, min: 1, max: 30000, required: true,
    description: "Lateral cutting feed.",
    source: "F360+MC+HM cut tab" },
  { id: "feed_plunge",   label: "Plunge Feed (Z)",     type: "feed_mmpm",  unit: "mm/min",
    defaultValue: 400, min: 1, max: 10000, required: true,
    description: "Z-plunge feed.",
    source: "F360+MC+HM cut tab" },
  { id: "stepover",      label: "Stepover (Width of Cut)", type: "length", unit: "mm",
    defaultValue: 4.0, min: 0.001, max: 100, required: false,
    description: "Lateral engagement per pass.",
    source: "F360+MC+HM passes tab" },
  { id: "stepdown",      label: "Stepdown (Depth of Cut)", type: "length", unit: "mm",
    defaultValue: 2.0, min: 0.001, max: 100, required: false,
    description: "Axial depth of cut per pass.",
    source: "F360+MC+HM passes tab" },
  { id: "stock_to_leave", label: "Stock to Leave",      type: "length",     unit: "mm",
    defaultValue: 0.2, min: 0, max: 50, required: false,
    description: "Remaining stock for downstream finishing.",
    source: "F360+MC+HM stock tab" },
  { id: "coolant",       label: "Coolant",             type: "enum",       defaultValue: "flood",
    enumValues: ["none", "flood", "mist", "air", "through_tool"],
    required: true,
    description: "Coolant strategy applied during the cut.",
    source: "F360+MC+HM coolant" },
  { id: "lead_in_radius", label: "Lead-In Radius",      type: "length",     unit: "mm",
    defaultValue: 2.0, min: 0, max: 50, required: false,
    description: "Tangential lead-in arc radius.",
    source: "F360+MC+HM linking" },
  { id: "lead_out_radius", label: "Lead-Out Radius",    type: "length",     unit: "mm",
    defaultValue: 2.0, min: 0, max: 50, required: false,
    description: "Tangential lead-out arc radius.",
    source: "F360+MC+HM linking" },
  { id: "retract_height", label: "Retract Height",      type: "length",     unit: "mm",
    defaultValue: 5.0, min: 0, max: 500, required: true,
    description: "Z-retract clearance above part.",
    source: "F360+MC+HM clearance" },
];

const COMMON_DRILLING_PARAMS: InputParameter[] = [
  { id: "tool",          label: "Drill",               type: "tool_ref",   required: true,
    description: "Drill / tap / reamer selection.",
    source: "F360+MC+HM drill" },
  { id: "wcs",           label: "Work Coordinate System", type: "string",  defaultValue: "G54", required: true,
    description: "Active work-coordinate origin.",
    source: "ISO 6983 / vendor UI" },
  { id: "spindle_rpm",   label: "Spindle Speed",       type: "speed_rpm",  unit: "rpm",
    defaultValue: 1500, min: 1, max: 30000, required: true,
    description: "Drill spindle RPM.",
    source: "F360+MC+HM" },
  { id: "feed_z",        label: "Plunge Feed",         type: "feed_mmpm",  unit: "mm/min",
    defaultValue: 200, min: 1, max: 5000, required: true,
    description: "Z-axis plunge feed rate.",
    source: "F360+MC+HM" },
  { id: "depth",         label: "Hole Depth",          type: "length",     unit: "mm",
    min: 0.1, max: 1000, required: true,
    description: "Total drilling depth from top of stock.",
    source: "F360+MC+HM" },
  { id: "peck_depth",    label: "Peck Depth",          type: "length",     unit: "mm",
    defaultValue: 3.0, min: 0.1, max: 50, required: false,
    description: "Per-peck depth (G73 / G83).",
    source: "F360+MC+HM" },
  { id: "dwell_at_bottom", label: "Dwell at Bottom",    type: "length",     unit: "mm",
    defaultValue: 0, min: 0, max: 10, required: false,
    description: "Dwell time at hole bottom (seconds-equivalent for cycle).",
    source: "F360+MC+HM" },
  { id: "coolant",       label: "Coolant",             type: "enum",       defaultValue: "flood",
    enumValues: ["none", "flood", "mist", "air", "through_tool"],
    required: true,
    description: "Coolant strategy applied during the cycle.",
    source: "F360+MC+HM" },
  { id: "retract_height", label: "Retract Height",      type: "length",     unit: "mm",
    defaultValue: 5.0, min: 0, max: 500, required: true,
    description: "Z-retract clearance above hole.",
    source: "F360+MC+HM" },
];

const COMMON_TURNING_PARAMS: InputParameter[] = [
  { id: "tool",          label: "Turning Tool",        type: "tool_ref",   required: true,
    description: "Insert / holder / orientation.",
    source: "F360+MC+HM turning" },
  { id: "spindle_speed", label: "Spindle Speed (m/min or rpm)", type: "speed_rpm", unit: "rpm",
    defaultValue: 250, min: 1, max: 6000, required: true,
    description: "Constant surface speed (m/min) or fixed RPM mode.",
    source: "F360+MC+HM turning" },
  { id: "feed_rev",      label: "Feed per Revolution", type: "feed_mmpr",  unit: "mm/rev",
    defaultValue: 0.25, min: 0.001, max: 5, required: true,
    description: "Feed per spindle revolution.",
    source: "F360+MC+HM turning" },
  { id: "depth_of_cut",  label: "Depth of Cut",        type: "length",     unit: "mm",
    defaultValue: 2.0, min: 0.001, max: 50, required: true,
    description: "Radial depth of cut per pass.",
    source: "F360+MC+HM turning" },
  { id: "stock_to_leave", label: "Stock to Leave",     type: "length",     unit: "mm",
    defaultValue: 0.3, min: 0, max: 5, required: false,
    description: "Stock remaining for finish pass.",
    source: "F360+MC+HM turning" },
  { id: "coolant",       label: "Coolant",             type: "enum",       defaultValue: "flood",
    enumValues: ["none", "flood", "mist", "air", "through_tool"],
    required: true,
    description: "Coolant strategy.",
    source: "F360+MC+HM turning" },
];

const COMMON_PROBING_PARAMS: InputParameter[] = [
  { id: "probe_tool",    label: "Probe",               type: "tool_ref",   required: true,
    description: "Probe selection (touch/scanning).",
    source: "Renishaw + F360+MC+HM probing" },
  { id: "feedrate",      label: "Probe Feedrate",      type: "feed_mmpm",  unit: "mm/min",
    defaultValue: 200, min: 1, max: 2000, required: true,
    description: "Feedrate during probe touch.",
    source: "Renishaw + F360+MC+HM" },
  { id: "fast_feedrate", label: "Fast Approach Feed",  type: "feed_mmpm",  unit: "mm/min",
    defaultValue: 2000, min: 100, max: 10000, required: true,
    description: "Approach feed before slow touch.",
    source: "Renishaw + F360+MC+HM" },
  { id: "overtravel",    label: "Overtravel",          type: "length",     unit: "mm",
    defaultValue: 2.0, min: 0.1, max: 20, required: true,
    description: "Extra distance after expected contact.",
    source: "Renishaw + F360+MC+HM" },
];

const COMMON_EDM_PARAMS: InputParameter[] = [
  { id: "wire_dia",      label: "Wire Diameter",       type: "length",     unit: "mm",
    defaultValue: 0.25, min: 0.05, max: 0.4, required: true,
    description: "Wire diameter (typically 0.10..0.30 mm).",
    source: "EDM canonical" },
  { id: "kerf_compensation", label: "Kerf Compensation", type: "length",   unit: "mm",
    defaultValue: 0.035, min: 0.005, max: 0.1, required: true,
    description: "Single-side cut-width compensation (wire dia/2 + spark gap).",
    source: "EDM canonical" },
  { id: "tech_table",    label: "Power / Technology Table", type: "string",
    required: true,
    description: "Power-table reference (machine-specific).",
    source: "Makino + Sodick + Mitsubishi tables" },
  { id: "passes",        label: "Number of Passes",    type: "count",      defaultValue: 4,
    min: 1, max: 10, required: true,
    description: "Cuts per profile (rough + N finish).",
    source: "EDM canonical" },
];

// ── 5-axis-specific extras ──────────────────────────────────────────────────

const FIVE_AXIS_EXTRAS: InputParameter[] = [
  { id: "tool_axis_mode", label: "Tool Axis Mode",     type: "enum",
    enumValues: ["fixed", "tilt_through_curve", "tilt_through_point", "tilt_through_surface", "swarf"],
    defaultValue: "tilt_through_surface", required: true,
    description: "How the tool axis is computed along the path.",
    source: "F360 5-axis + HM 5-axis tangent + MC multi-axis" },
  { id: "tilt_limit_min", label: "Min Tilt Angle",     type: "angle",      unit: "deg",
    defaultValue: -45, min: -90, max: 90, required: false,
    description: "Lower bound on the rotary-axis tilt.",
    source: "F360+HM+MC 5-axis" },
  { id: "tilt_limit_max", label: "Max Tilt Angle",     type: "angle",      unit: "deg",
    defaultValue:  45, min: -90, max: 90, required: false,
    description: "Upper bound on the rotary-axis tilt.",
    source: "F360+HM+MC 5-axis" },
];

// ── Adaptive-clearing extras ────────────────────────────────────────────────

const ADAPTIVE_EXTRAS: InputParameter[] = [
  { id: "optimal_load",  label: "Optimal Load",        type: "length",     unit: "mm",
    defaultValue: 1.5, min: 0.1, max: 20, required: true,
    description: "Target radial engagement for adaptive / dynamic milling.",
    source: "F360 'Optimal Load' / MC Dynamic / HM Maxx" },
  { id: "min_cutting_radius", label: "Min Cutting Radius", type: "length", unit: "mm",
    defaultValue: 1.0, min: 0.05, max: 50, required: false,
    description: "Minimum radius of curvature the toolpath may pull into.",
    source: "F360 adaptive" },
];

// ── Operation → parameter-set composition ───────────────────────────────────

type ParamComposer = () => InputParameter[];

function compose(...lists: InputParameter[][]): InputParameter[] {
  const merged: InputParameter[] = [];
  const seen = new Set<string>();
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }
  }
  return merged;
}

const OP_PARAMS: Partial<Record<CamOperation, ParamComposer>> = {
  // 2D milling
  face:                  () => compose(COMMON_MILLING_PARAMS),
  contour_2d:            () => compose(COMMON_MILLING_PARAMS),
  pocket_2d:             () => compose(COMMON_MILLING_PARAMS),
  slot_2d:               () => compose(COMMON_MILLING_PARAMS),
  engrave_2d:            () => compose(COMMON_MILLING_PARAMS),
  trace_2d:              () => compose(COMMON_MILLING_PARAMS),
  chamfer_2d:            () => compose(COMMON_MILLING_PARAMS),

  // Adaptive / 2.5D / 3D
  adaptive_clearing_2d:  () => compose(COMMON_MILLING_PARAMS, ADAPTIVE_EXTRAS),
  adaptive_clearing_3d:  () => compose(COMMON_MILLING_PARAMS, ADAPTIVE_EXTRAS),
  rest_machining_2d:     () => compose(COMMON_MILLING_PARAMS),
  rest_machining_3d:     () => compose(COMMON_MILLING_PARAMS),
  trochoidal_2d:         () => compose(COMMON_MILLING_PARAMS, ADAPTIVE_EXTRAS),

  // 3D surface finishing
  parallel_3d:           () => compose(COMMON_MILLING_PARAMS),
  scallop_3d:            () => compose(COMMON_MILLING_PARAMS),
  waterline_3d:          () => compose(COMMON_MILLING_PARAMS),
  morph_3d:              () => compose(COMMON_MILLING_PARAMS),
  spiral_3d:             () => compose(COMMON_MILLING_PARAMS),
  radial_3d:             () => compose(COMMON_MILLING_PARAMS),
  flowline_3d:           () => compose(COMMON_MILLING_PARAMS),
  pencil_3d:             () => compose(COMMON_MILLING_PARAMS),
  horizontal_3d:         () => compose(COMMON_MILLING_PARAMS),
  steep_shallow_3d:      () => compose(COMMON_MILLING_PARAMS),
  project_3d:            () => compose(COMMON_MILLING_PARAMS),
  between_curves_3d:     () => compose(COMMON_MILLING_PARAMS),

  // 5-axis
  swarf_5axis:                     () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  tilt_3plus2:                     () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  tilt_5axis_simultaneous:         () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  morph_between_two_curves_5axis:  () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  flow_5axis:                      () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  multi_axis_contour:              () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  port_machining_5axis:            () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  impeller_blade_5axis:            () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),
  blade_hub_shroud_5axis:          () => compose(COMMON_MILLING_PARAMS, FIVE_AXIS_EXTRAS),

  // Drilling family
  drill: () => compose(COMMON_DRILLING_PARAMS),
  drill_peck: () => compose(COMMON_DRILLING_PARAMS),
  drill_deep: () => compose(COMMON_DRILLING_PARAMS),
  spot_drill: () => compose(COMMON_DRILLING_PARAMS),
  bore: () => compose(COMMON_DRILLING_PARAMS),
  ream: () => compose(COMMON_DRILLING_PARAMS),
  counterbore: () => compose(COMMON_DRILLING_PARAMS),
  countersink: () => compose(COMMON_DRILLING_PARAMS),
  tap_rigid: () => compose(COMMON_DRILLING_PARAMS),
  tap_floating: () => compose(COMMON_DRILLING_PARAMS),
  thread_mill: () => compose(COMMON_DRILLING_PARAMS),

  // Turning + mill-turn
  turn_rough: () => compose(COMMON_TURNING_PARAMS),
  turn_finish: () => compose(COMMON_TURNING_PARAMS),
  turn_groove: () => compose(COMMON_TURNING_PARAMS),
  turn_part: () => compose(COMMON_TURNING_PARAMS),
  turn_thread: () => compose(COMMON_TURNING_PARAMS),
  turn_bore: () => compose(COMMON_TURNING_PARAMS),
  turn_face: () => compose(COMMON_TURNING_PARAMS),
  turn_drill: () => compose(COMMON_TURNING_PARAMS),
  thread_turn: () => compose(COMMON_TURNING_PARAMS),
  live_tool_mill: () => compose(COMMON_MILLING_PARAMS),
  live_tool_drill: () => compose(COMMON_DRILLING_PARAMS),

  // Probing
  probe_wcs:           () => compose(COMMON_PROBING_PARAMS),
  probe_part_inspect:  () => compose(COMMON_PROBING_PARAMS),
  probe_tool_measure:  () => compose(COMMON_PROBING_PARAMS),

  // EDM
  wedm_2axis:        () => compose(COMMON_EDM_PARAMS),
  wedm_4axis_taper:  () => compose(COMMON_EDM_PARAMS),
  sinker_edm:        () => compose(COMMON_EDM_PARAMS),
};

// ── System-specific deltas (Fusion / Mastercam / hyperMILL) ────────────────
// Only documented vendor-specific knobs. Other CAM systems fall back to the
// op's COMMON_* set (filled in by U-CAMT-B04..B27 in v2+).

const SYSTEM_DELTAS: Partial<Record<CamSystem, Partial<Record<CamOperation, InputParameter[]>>>> = {
  fusion360: {
    pocket_2d: [
      { id: "machining_mode", label: "Machining Mode", type: "enum",
        enumValues: ["pocket", "open_pocket", "between_2_islands"], defaultValue: "pocket",
        required: false,
        description: "Fusion 360 2D-Pocket mode dropdown.",
        source: "F360 2D Pocket tab" },
    ],
    adaptive_clearing_3d: [
      { id: "fine_stepdown", label: "Fine Stepdown", type: "length", unit: "mm",
        defaultValue: 0.5, min: 0.01, max: 10, required: false,
        description: "Fusion adaptive 'fine stepdown' between coarse passes.",
        source: "F360 Adaptive Clearing" },
    ],
  },
  mastercam: {
    adaptive_clearing_2d: [
      { id: "stepover_pct",  label: "Stepover %",      type: "count",  defaultValue: 25,
        min: 1, max: 100, required: false,
        description: "Mastercam Dynamic Mill stepover-as-percentage-of-tool-diameter.",
        source: "Mastercam Dynamic Mill" },
    ],
  },
  hypermill: {
    swarf_5axis: [
      { id: "swarf_priority", label: "Swarf Priority", type: "enum",
        enumValues: ["top", "bottom", "alternating"], defaultValue: "bottom",
        required: false,
        description: "hyperMILL 5-Axis Tangent Plane swarf-side priority knob.",
        source: "hyperMILL 5-Axis Tangent" },
    ],
  },
};

// ── Engine ──────────────────────────────────────────────────────────────────

export class CAMOperationInputSchemaEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CAMOperationInputSchemaEngine",
      version: "1.0.0",
      domain: "cam_ai_training",
      description:
        "Unified per-(CamOperation, CamSystem) input-parameter schema. " +
        "Normalizes vendor-documented CAM inputs into a single shape the " +
        "template generator can compose.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      { name: "get_schema",  description: "Schema for one (op, system)", actions: ["cam_input_schema_get"] },
      { name: "validate",    description: "Validate a value bag against a schema", actions: ["cam_input_schema_validate"] },
      { name: "list_params", description: "Parameter ids for one (op, system)",   actions: ["cam_input_schema_params"] },
      { name: "coverage",    description: "Coverage stats per system",            actions: ["cam_input_schema_coverage"] },
    ];
  }

  validate(input: unknown): string | null {
    if (input == null || typeof input !== "object") return "input must be an object";
    return null;
  }

  protected async executeImpl(_input: unknown): Promise<unknown> {
    return { engine: "CAMOperationInputSchemaEngine", note: "use typed methods" };
  }

  /**
   * Get the normalized input schema for a (CamOperation, CamSystem) pair.
   * Returns null when the taxonomy says the system does not support the op.
   */
  getSchema(op: CamOperation, system: CamSystem): InputSchema | null {
    const mapping = camOperationTaxonomyEngine.getPerSoftware(op, system);
    if (!mapping.supported) return null;

    const composer = OP_PARAMS[op];
    const base = composer ? composer() : [];

    const overrides = SYSTEM_DELTAS[system]?.[op] ?? [];
    const overrideIds = new Set(overrides.map((p) => p.id));
    const merged: InputParameter[] = [
      ...base.filter((p) => !overrideIds.has(p.id)),
      ...overrides,
    ];

    return {
      op,
      system,
      nativeName: mapping.nativeName,
      schemaVersion: "1.0.0",
      parameters: merged,
    };
  }

  /** List the parameter ids for a (op, system) pair. Empty array when unsupported. */
  listParams(op: CamOperation, system: CamSystem): string[] {
    const s = this.getSchema(op, system);
    return s ? s.parameters.map((p) => p.id) : [];
  }

  /**
   * Validate a parameter bag against the schema for (op, system).
   * Returns { ok, issues }. Issues list missing-required, unknown-keys,
   * out-of-range, wrong-type, bad-enum.
   */
  validateValues(
    op: CamOperation,
    system: CamSystem,
    values: Record<string, unknown>,
  ): { ok: boolean; issues: string[] } {
    const schema = this.getSchema(op, system);
    if (!schema) return { ok: false, issues: [`unsupported (op,system): ${op} / ${system}`] };
    const issues: string[] = [];
    const paramById = new Map(schema.parameters.map((p) => [p.id, p]));

    // Required-presence + per-row validation
    for (const p of schema.parameters) {
      const v = values[p.id];
      if (p.required && (v === undefined || v === null)) {
        issues.push(`missing required: ${p.id}`);
        continue;
      }
      if (v === undefined || v === null) continue;
      if (p.type === "enum") {
        if (typeof v !== "string" || !(p.enumValues ?? []).includes(v)) {
          issues.push(`${p.id}: must be one of ${(p.enumValues ?? []).join("|")}, got ${String(v)}`);
        }
      } else if (p.type === "boolean") {
        if (typeof v !== "boolean") issues.push(`${p.id}: expected boolean, got ${typeof v}`);
      } else if (p.type === "string" || p.type === "tool_ref" || p.type === "selection") {
        if (typeof v !== "string") issues.push(`${p.id}: expected string, got ${typeof v}`);
      } else {
        // numeric family (length / angle / speed_rpm / feed_* / count)
        if (typeof v !== "number" || !Number.isFinite(v)) {
          issues.push(`${p.id}: expected finite number, got ${typeof v}=${String(v)}`);
        } else {
          if (p.min !== undefined && v < p.min) issues.push(`${p.id}: ${v} < min ${p.min}`);
          if (p.max !== undefined && v > p.max) issues.push(`${p.id}: ${v} > max ${p.max}`);
        }
      }
    }

    // Unknown-keys
    for (const k of Object.keys(values)) {
      if (!paramById.has(k)) issues.push(`unknown parameter: ${k}`);
    }

    return { ok: issues.length === 0, issues };
  }

  /**
   * Coverage stats — per-system count of (op, supported→has-schema) pairs.
   * Returns a row per CAM system in the taxonomy.
   */
  coverage(): Array<{ system: CamSystem; supportedOps: number; withSchema: number }> {
    const systems = camOperationTaxonomyEngine.listSystems();
    const ops = camOperationTaxonomyEngine.listOperations();
    const out: Array<{ system: CamSystem; supportedOps: number; withSchema: number }> = [];
    for (const sys of systems) {
      let supported = 0;
      let withSchema = 0;
      for (const op of ops) {
        const sup = camOperationTaxonomyEngine.getPerSoftware(op, sys);
        if (sup.supported) {
          supported++;
          if (this.getSchema(op, sys)) withSchema++;
        }
      }
      out.push({ system: sys, supportedOps: supported, withSchema });
    }
    return out;
  }
}

export const camOperationInputSchemaEngine = new CAMOperationInputSchemaEngine();
