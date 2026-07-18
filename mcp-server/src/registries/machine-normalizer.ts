/**
 * machine-normalizer.ts (U-MACHDB-02, slot:oscar 2026-06-26)
 *
 * The machineRegistry (1015 machines) stores data in a HETEROGENEOUS, non-normalized schema:
 * spindle power lives under power_continuous / power_kW / power_kw / peakHp / continuousHp / power_hp /
 * power_rating; rpm under max_rpm / rpm / maxRpm / ratedRpm; axis data under axis_specs.{x,y,z} OR axes[]
 * OR envelope.{x,y,z}_travel OR travels. A consumer (sf_orchestrate, the SFC page) that reads ONE
 * canonical key silently drops every machine using a variant -- the audit (U-MACHDB-01) measured the
 * fragmentation. This module is the prerequisite FIX: a pure, data-driven normalizer that maps any raw
 * registry machine to ONE canonical NormalizedMachine shape, coerces units (hp->kW), and records per-field
 * provenance (which raw key + transform produced each value).
 *
 * It is the foundation for U-MACHDB-03 (normalize all 1015) and U-MACHDB-04 (gap-fill). The gap fields
 * (frf, balance_grade, accel/jerk, way_type, thermal_comp, surface_finish, build_quality, torque_curve)
 * are declared here so the canonical shape is stable; they stay undefined until P3/P4 fills them.
 *
 * Physics note: this is a STRUCTURAL normalizer (key/shape/unit). It does NOT compute or fabricate physics
 * values -- it only relocates what the raw record already states. R12: a field absent in the raw stays
 * undefined (never defaulted to a fabricated number).
 */

const HP_TO_KW = 0.7457; // 1 mechanical horsepower = 0.7457 kW (exact-ish; CIPM)

// ── canonical shape ─────────────────────────────────────────────────────────────

export interface NormalizedAxis {
  name: string;                 // X | Y | Z | A | B | C
  travel_mm?: number;
  rapid_mm_min?: number;
  max_feed_mm_min?: number;
  acceleration_m_s2?: number;   // g-force basis (g = accel / 9.80665)
  jerk_m_s3?: number;
  accuracy_um?: number;
  repeatability_um?: number;
  way_type?: string;            // box_way | linear_guide | hydrostatic | roller | ...
}

export interface NormalizedSpindle {
  max_rpm?: number;
  min_rpm?: number;
  power_kw?: number;            // continuous/rated
  power_peak_kw?: number;       // peak / 30-min
  torque_nm?: number;           // max
  torque_continuous_nm?: number;
  taper?: string;               // CAT40 | BT40 | HSK-A63 | A2-6 | CAPTO-C6 | ...
  bore_mm?: number;
  bearing_type?: string;
  coolant_through?: boolean;
  coolant_pressure_bar?: number;
  gear_ranges?: unknown;
  // P3/P4 gap fields (structural placeholders -- not filled by the normalizer):
  balance_grade?: string;       // e.g. "G2.5"
  thermal_growth_comp?: boolean;
  interface_stiffness_n_um?: number;
}

export interface NormalizedController {
  brand?: string;
  model?: string;
  type?: string;
  look_ahead_blocks?: number;
  max_block_rate?: number;
  high_speed_machining?: boolean;
  corner_control?: string;      // AICC II | smooth-tolerance | nano-smoothing | ...
}

export interface NormalizedMachine {
  id: string;
  manufacturer?: string;
  model?: string;
  name?: string;
  type?: string;
  spindle: NormalizedSpindle;
  axes: NormalizedAxis[];
  envelope: { x_mm?: number; y_mm?: number; z_mm?: number };
  way_type?: string;            // dominant axis way type (rolled up)
  table: { type?: string; length_mm?: number; width_mm?: number; max_load_kg?: number };
  controller: NormalizedController;
  weight_kg?: number;
  kinematics?: { type?: string; structure?: string; chain?: unknown };
  frf?: { natural_frequency_hz?: number; damping_ratio?: number; stiffness_n_um?: number };
  capabilities: { high_speed_machining?: boolean; rigid_tapping?: boolean; probing?: boolean; simultaneous_axes?: number };
  // P4 gap fields:
  surface_finish_capability?: { best_ra_um?: number; source?: string };
  build_quality?: string;
  robustness?: string;
  /** per-canonical-field provenance: field -> "rawKey" or "rawKey*transform" */
  _provenance: Record<string, string>;
}

// ── resolver primitives ─────────────────────────────────────────────────────────

type Raw = Record<string, unknown>;
const num = (v: unknown): number | undefined => {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
};
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);
const bool = (v: unknown): boolean | undefined => (typeof v === "boolean" ? v : undefined);

function deepGet(o: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc == null ? acc : (acc as Raw)[k]), o);
}

/** Candidate = "path" or { p:"path", x:(v)=>v } transform. Returns first defined hit + its source label. */
type Cand = string | { p: string; x: (v: number) => number; label: string };
function pickNum(raw: unknown, cands: Cand[]): { value?: number; src?: string } {
  for (const c of cands) {
    if (typeof c === "string") {
      const v = num(deepGet(raw, c));
      if (v !== undefined) return { value: v, src: c };
    } else {
      const v = num(deepGet(raw, c.p));
      if (v !== undefined) return { value: c.x(v), src: c.label };
    }
  }
  return {};
}
function pickStr(raw: unknown, paths: string[]): { value?: string; src?: string } {
  for (const p of paths) {
    const v = str(deepGet(raw, p));
    if (v !== undefined) return { value: v, src: p };
  }
  return {};
}
function pickBool(raw: unknown, paths: string[]): { value?: boolean; src?: string } {
  for (const p of paths) {
    const v = bool(deepGet(raw, p));
    if (v !== undefined) return { value: v, src: p };
  }
  return {};
}

// ── axis extraction (handles axis_specs object | axes array | envelope/travels) ──

const AXIS_LETTERS = ["x", "y", "z", "a", "b", "c", "u", "v", "w"];
const hp = (v: number) => v * HP_TO_KW;

function extractAxes(raw: Raw, prov: Record<string, string>): NormalizedAxis[] {
  const out: NormalizedAxis[] = [];
  const axisFrom = (name: string, a: Raw, base: string) => {
    const travel = pickNum(a, ["travel", "travel_mm", "stroke", "stroke_mm"]);
    const rapid = pickNum(a, ["rapid", "rapid_rate", "rapid_mm_min", "rapid_traverse"]);
    const feed = pickNum(a, ["max_feed", "max_feed_rate", "feed_max", "cutting_feed"]);
    const accel = pickNum(a, ["acceleration", "accel", "max_acceleration"]);
    const jerk = pickNum(a, ["jerk", "max_jerk"]);
    const acc = pickNum(a, ["accuracy", "positioning_accuracy", "position_accuracy"]);
    const rep = pickNum(a, ["repeatability", "bidirectional_repeatability"]);
    const way = pickStr(a, ["guideway", "guideway_type", "way_type", "guide_type"]);
    if (travel.src) prov[`axes.${name}.travel_mm`] = `axis_specs.${base}.${travel.src}`;
    if (accel.src) prov[`axes.${name}.acceleration_m_s2`] = `axis_specs.${base}.${accel.src}`;
    out.push({
      name: name.toUpperCase(),
      travel_mm: travel.value,
      rapid_mm_min: rapid.value,
      max_feed_mm_min: feed.value,
      acceleration_m_s2: accel.value,
      jerk_m_s3: jerk.value,
      accuracy_um: acc.value,
      repeatability_um: rep.value,
      way_type: way.value,
    });
  };
  // shape 1: axis_specs = { x:{...}, y:{...}, ... }
  const as = raw.axis_specs as Record<string, Raw> | undefined;
  if (as && typeof as === "object") {
    for (const k of Object.keys(as)) {
      if (as[k] && typeof as[k] === "object") axisFrom(k, as[k], k);
    }
  }
  // shape 2: axes = [ { name, travel, ... } ]
  if (!out.length && Array.isArray(raw.axes)) {
    (raw.axes as Raw[]).forEach((a, i) => {
      if (a && typeof a === "object") axisFrom(str(a.name) || AXIS_LETTERS[i] || `ax${i}`, a, `[${i}]`);
    });
  }
  // shape 3 fallback: envelope/travels give travel only (no per-axis dynamics)
  if (!out.length) {
    for (const letter of ["x", "y", "z"]) {
      const t = pickNum(raw, [
        `envelope.${letter}_travel`,
        `travels.${letter}`,
        `workEnvelope.${letter}`,
        `dimensions.${letter}_travel`,
        `${letter}_travel`,
      ]);
      if (t.value !== undefined) {
        if (t.src) prov[`axes.${letter.toUpperCase()}.travel_mm`] = t.src;
        out.push({ name: letter.toUpperCase(), travel_mm: t.value });
      }
    }
  }
  return out;
}

// ── main ─────────────────────────────────────────────────────────────────────

/**
 * resolveSpindlePowerKw -- the canonical continuous/rated spindle-power resolver over the heterogeneous
 * 1015-machine registry schema. Power is stored under power_continuous | power_kW | power_kw | power_rating |
 * power | continuousPower | continuousHp(hp) | power_hp(hp); a consumer that reads ONE key silently drops
 * every variant-keyed machine to a hard-coded default (U-MACHDB-01 audit measured the fragmentation).
 * This is the SINGLE SOURCE of that union -- normalizeMachine() and every machine-capability consumer
 * (machine selection, package selection, intelligence scoring, envelope guard, registry bridge) resolve
 * spindle power through here so the fix lives in exactly one place (R7/R8). Returns the value in kW (the two
 * hp candidates converted at HP_TO_KW) plus the matched raw source key for provenance. Pure; returns an
 * empty object (no value) when no power key is present -- R12: it never fabricates a default, the CALLER
 * owns the fallback so existing per-consumer defaults are preserved.
 */
export function resolveSpindlePowerKw(rawSpindle: unknown): { value?: number; src?: string } {
  return pickNum(rawSpindle, [
    "power_continuous", "power_kW", "power_kw", "power_rating", "power", "continuousPower",
    { p: "continuousHp", x: hp, label: "continuousHp*hp->kW" },
    { p: "power_hp", x: hp, label: "power_hp*hp->kW" },
  ]);
}

/**
 * resolveMaxRpm -- the canonical maximum-spindle-RPM resolver over the heterogeneous 1015-machine registry
 * schema. RPM is stored under max_rpm | rpm_max | maxRpm | rpm | ratedRpm | max_speed; a consumer that reads
 * only the canonical spindle.max_rpm silently sees NO limit for a variant-keyed machine -- and for the SFC
 * machine-limit guard that means the over-speed CLAMP is ABSENT (under-protection, the dangerous direction).
 * Single source of that union (sibling of resolveSpindlePowerKw): normalizeMachine() and the envelope guard
 * both resolve max RPM through here. Pure; returns {} (no value) when no key is present -- R12: never
 * fabricates a limit, the CALLER owns the fallback so existing per-consumer defaults are preserved.
 */
export function resolveMaxRpm(rawSpindle: unknown): { value?: number; src?: string } {
  return pickNum(rawSpindle, ["max_rpm", "rpm_max", "maxRpm", "rpm", "ratedRpm", "max_speed"]);
}

/**
 * resolveMinRpm -- the canonical minimum-spindle-RPM resolver (min_rpm | rpm_min | minRpm). Mirror of
 * resolveMaxRpm; the SFC guard clamps a commanded RPM UP to this floor, so a variant-keyed min silently
 * read as a hard-coded default would skip a needed low-RPM clamp. Pure; {} when absent (caller owns fallback).
 */
export function resolveMinRpm(rawSpindle: unknown): { value?: number; src?: string } {
  return pickNum(rawSpindle, ["min_rpm", "rpm_min", "minRpm"]);
}

export function normalizeMachine(raw: Raw): NormalizedMachine {
  const prov: Record<string, string> = {};
  const rec = (field: string, src?: string) => { if (src) prov[field] = src; };

  // identity
  const id = str(raw.id) || str(raw.model) || str(raw.name) || "unknown";
  const manufacturer = pickStr(raw, ["manufacturer", "brand", "make", "controller.brand"]);
  const model = pickStr(raw, ["model", "model_name"]);
  const name = pickStr(raw, ["name", "display_name", "full_name"]);
  const type = pickStr(raw, ["type", "machine_type", "category"]);

  // spindle
  const sp = (raw.spindle as Raw) || {};
  const max_rpm = resolveMaxRpm(sp); // single-source RPM union (U-MACHDB-08)
  const min_rpm = resolveMinRpm(sp); // single-source RPM-floor union (U-MACHDB-08)
  const power_kw = resolveSpindlePowerKw(sp); // single-source 8-key power union (U-MACHDB-06)
  const power_peak_kw = pickNum(sp, [
    "power_30min", "peakPower", "power_peak",
    { p: "peakHp", x: hp, label: "peakHp*hp->kW" },
  ]);
  const torque_nm = pickNum(sp, ["torque_max", "torque_Nm", "torque_nm", "maxTorque_Nm", "peakTorque", "torque"]);
  const torque_cont = pickNum(sp, ["torque_continuous", "torque_s1", "continuousTorque"]);
  const taper = pickStr(sp, ["taper", "spindle_nose", "spindleNose", "nose", "interface"]);
  const bore = pickNum(sp, ["bore_mm", "bore_diameter", "spindle_bore", "bearing_diameter", "bearingDiameter", "diameter"]);
  const bearing = pickStr(sp, ["bearing_type", "bearingType", "bearing_arrangement"]);
  const coolThru = pickBool(sp, ["coolant_through", "through_spindle_coolant", "tsc"]);
  const coolPress = pickNum(sp, ["coolant_pressure", "tsc_pressure"]);
  const balance = pickStr(sp, ["balance_grade", "balance", "dynamic_balance"]);
  rec("spindle.max_rpm", max_rpm.src && `spindle.${max_rpm.src}`);
  rec("spindle.power_kw", power_kw.src && `spindle.${power_kw.src}`);
  rec("spindle.torque_nm", torque_nm.src && `spindle.${torque_nm.src}`);
  rec("spindle.taper", taper.src && `spindle.${taper.src}`);

  const spindle: NormalizedSpindle = {
    max_rpm: max_rpm.value, min_rpm: min_rpm.value,
    power_kw: power_kw.value, power_peak_kw: power_peak_kw.value,
    torque_nm: torque_nm.value, torque_continuous_nm: torque_cont.value,
    taper: taper.value, bore_mm: bore.value, bearing_type: bearing.value,
    coolant_through: coolThru.value, coolant_pressure_bar: coolPress.value,
    gear_ranges: (sp.gear_ranges as unknown) ?? (raw.gear_ranges as unknown),
    balance_grade: balance.value,
  };

  // axes + envelope + way_type rollup
  const axes = extractAxes(raw, prov);
  const envFor = (letter: string) => {
    const ax = axes.find((a) => a.name === letter.toUpperCase());
    if (ax?.travel_mm !== undefined) return ax.travel_mm;
    return pickNum(raw, [`envelope.${letter}_travel`, `travels.${letter}`, `dimensions.${letter}_travel`]).value;
  };
  const envelope = { x_mm: envFor("x"), y_mm: envFor("y"), z_mm: envFor("z") };
  const wayCounts: Record<string, number> = {};
  for (const a of axes) if (a.way_type) wayCounts[a.way_type] = (wayCounts[a.way_type] || 0) + 1;
  const way_type =
    pickStr(raw, ["way_type", "guideway", "construction.guideway", "bed_construction"]).value ||
    Object.entries(wayCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  // table
  const tb = (raw.table as Raw) || {};
  const table = {
    type: pickStr(tb, ["type", "style"]).value || pickStr(raw, ["table_type"]).value,
    length_mm: pickNum(tb, ["length", "length_mm", "size_x"]).value,
    width_mm: pickNum(tb, ["width", "width_mm", "size_y"]).value,
    max_load_kg: pickNum(tb, ["max_load", "load_kg", "maxLoad", "max_workpiece_weight"]).value,
  };

  // controller
  const ct = (raw.controller as Raw) || {};
  const controller: NormalizedController = {
    brand: pickStr(ct, ["brand", "manufacturer", "make"]).value,
    model: pickStr(ct, ["model", "cnc_type"]).value,
    type: pickStr(ct, ["type", "cnc_type"]).value,
    look_ahead_blocks: pickNum(ct, ["look_ahead", "look_ahead_blocks", "lookahead"]).value,
    max_block_rate: pickNum(ct, ["max_block_rate", "block_processing_time"]).value,
    high_speed_machining: pickBool(ct, ["high_speed_machining", "hsm"]).value,
    corner_control:
      pickStr(ct, ["corner_control", "smooth_tolerance_control", "ai_contour_control", "high_precision_contour"]).value ||
      (ct.ai_contour_control_II ? "ai_contour_control_II" : undefined) ||
      (ct.nano_smoothing ? "nano_smoothing" : undefined),
  };
  rec("controller.model", controller.model && `controller.${pickStr(ct, ["model", "cnc_type"]).src}`);

  // physical / kinematics / capabilities
  const weight_kg = pickNum(raw, ["dimensions.weight_kg", "weight", "dimensions.weight", "physical.weight_kg"]).value;
  const kc = raw.kinematic_chain as Raw | undefined;
  const kinematics = kc ? { type: str(kc.type), structure: str(kc.structure), chain: kc.chain } : undefined;
  const frfRaw = raw.frf_data as Raw | undefined;
  const frf = frfRaw
    ? { natural_frequency_hz: num(frfRaw.natural_frequency_hz), damping_ratio: num(frfRaw.damping_ratio), stiffness_n_um: num(frfRaw.stiffness_n_um) }
    : undefined;
  const capabilities = {
    high_speed_machining:
      pickBool(raw, ["high_speed_machining"]).value ?? controller.high_speed_machining ?? ((max_rpm.value ?? 0) >= 15000 || undefined),
    rigid_tapping: pickBool(raw, ["rigid_tapping", "controller.rigid_tapping"]).value,
    probing: pickBool(raw, ["probing_ready", "probing"]).value,
    simultaneous_axes: pickNum(raw, ["simultaneous_axes", "controller.simultaneous_axes", "controller.axes"]).value,
  };

  return {
    id,
    manufacturer: manufacturer.value,
    model: model.value,
    name: name.value,
    type: type.value,
    spindle,
    axes,
    envelope,
    way_type,
    table,
    controller,
    weight_kg,
    kinematics,
    frf,
    capabilities,
    _provenance: prov,
  };
}

/** Normalize a batch + return coverage counts per canonical field (for U-MACHDB-03 verification). */
export function normalizeAll(rawMachines: Raw[]): { machines: NormalizedMachine[]; coverage: Record<string, number> } {
  const machines = rawMachines.map(normalizeMachine);
  const N = machines.length || 1;
  // count "covered": a number/string is covered when present; a boolean predicate only when TRUE
  // (false != null would otherwise count every machine).
  const c = (fn: (m: NormalizedMachine) => unknown) => machines.filter((m) => { const v = fn(m); return v != null && v !== false; }).length;
  const coverage = {
    spindle_max_rpm: c((m) => m.spindle.max_rpm),
    spindle_power_kw: c((m) => m.spindle.power_kw),
    spindle_torque_nm: c((m) => m.spindle.torque_nm),
    spindle_taper: c((m) => m.spindle.taper),
    work_envelope: c((m) => m.envelope.x_mm),
    way_type: c((m) => m.way_type),
    axis_accuracy: c((m) => m.axes.some((a) => a.accuracy_um != null)),
    acceleration: c((m) => m.axes.some((a) => a.acceleration_m_s2 != null)),
    table_load: c((m) => m.table.max_load_kg),
    weight: c((m) => m.weight_kg),
    controller_model: c((m) => m.controller.model),
    look_ahead: c((m) => m.controller.look_ahead_blocks),
    kinematics: c((m) => m.kinematics?.type),
    pct: N,
  };
  return { machines, coverage };
}
