/**
 * MachineCapabilityIntelligenceEngine — HBK-MS4
 * ==============================================
 * Unifies spindle torque curves, axis acceleration profiles, work envelope
 * geometry, rapid traverse rates, and thermal compensation parameters from
 * four data sources into queryable capability profiles.
 *
 * Data source hierarchy (highest authority first):
 *   1. Handbook data (MachineHandbookRegistry — OEM manuals, highest confidence)
 *   2. Spindle corrections (verified manufacturer web data, targeted fixes)
 *   3. Torque curves (HSMAdvisor ground truth > catalog verified > computed)
 *   4. MachineRegistry (catalog data, broad coverage but lower confidence)
 *
 * References:
 * - MachineHandbookRegistryEngine (HandbookSpindleSpec, HandbookAxisKinematics)
 * - machine-torque-curves.ts (1,058 torque curves, 166 from HSMAdvisor)
 * - machine-spindle-corrections.ts (targeted manufacturer-verified fixes)
 * - MachineRegistry (910 machines, SpindleSpecs + AxisSpecs)
 *
 * Physics: P = T × ω where ω = 2π × RPM / 60
 *          T = P × 9549 / RPM (constant-power region above base speed)
 *          T = T_max (constant-torque region below base speed)
 */

import { z } from "zod";
import { log } from "../utils/Logger.js";

// ════════════════════════════════════════════════════════════════════
// SECTION 1: TYPES
// ════════════════════════════════════════════════════════════════════

/** Provenance tag for each field in the capability profile. */
export type CapabilitySource =
  | "handbook"         // OEM manual — highest authority
  | "spindle_correction" // Verified manufacturer web data
  | "torque_curve_hsm"   // HSMAdvisor ground truth (conf 0.95)
  | "torque_curve_catalog" // Catalog-verified base_rpm (conf 0.85)
  | "torque_curve_computed" // Computed from P=Tω (conf 0.70)
  | "machine_registry"   // Catalog data (broad coverage, lower confidence)
  | "none";              // No data available

/** Per-field provenance and confidence wrapper. */
export interface ProvenanceField<T> {
  value: T;
  source: CapabilitySource;
  confidence: number;     // 0-1
  source_detail?: string; // e.g. "Haas VF-2 Operator Manual p.47"
}

/** Single point on the torque/power curve. */
export interface TorqueCurvePoint {
  rpm: number;
  torque_nm: number;
  power_kw: number;
}

/** Spindle capability profile — merged from all sources. */
export interface SpindleCapabilityProfile {
  max_rpm: ProvenanceField<number>;
  min_rpm: ProvenanceField<number>;
  power_continuous_kw: ProvenanceField<number>;
  power_30min_kw?: ProvenanceField<number>;
  power_peak_kw?: ProvenanceField<number>;
  torque_max_nm: ProvenanceField<number>;
  torque_continuous_nm?: ProvenanceField<number>;
  base_speed_rpm: ProvenanceField<number>;
  taper_type: ProvenanceField<string>;
  drive_type?: ProvenanceField<string>;
  bearing_type?: ProvenanceField<string>;
  drawbar_force_kn?: ProvenanceField<number>;
  gear_ranges?: ProvenanceField<Array<{
    gear: number;
    min_rpm: number;
    max_rpm: number;
    max_torque_nm: number;
    max_power_kw: number;
  }>>;
  torque_curve: ProvenanceField<TorqueCurvePoint[]>;
  warmup_procedure?: ProvenanceField<string>;
}

/** Per-axis capability record. */
export interface AxisCapability {
  name: string;
  travel_mm: ProvenanceField<number>;
  rapid_mm_min: ProvenanceField<number>;
  max_feed_mm_min?: ProvenanceField<number>;
  accel_m_s2?: ProvenanceField<number>;
  resolution_um?: ProvenanceField<number>;
  repeatability_um?: ProvenanceField<number>;
  accuracy_um?: ProvenanceField<number>;
  backlash_um?: ProvenanceField<number>;
  ball_screw_pitch_mm?: ProvenanceField<number>;
  linear_scale?: ProvenanceField<boolean>;
}

/** Work envelope profile. */
export interface WorkEnvelopeProfile {
  x_mm: ProvenanceField<number>;
  y_mm: ProvenanceField<number>;
  z_mm: ProvenanceField<number>;
  spindle_to_table_min_mm?: ProvenanceField<number>;
  spindle_to_table_max_mm?: ProvenanceField<number>;
}

/** Validation warning attached to capability profiles. */
export interface CapabilityWarning {
  field: string;
  message: string;
  severity: "info" | "warning" | "critical";
}

/** Complete machine capability profile. */
export interface MachineCapabilityProfile {
  machine_id: string;
  manufacturer?: string;
  model?: string;
  sources_consulted: CapabilitySource[];
  spindle: SpindleCapabilityProfile | null;
  axes: AxisCapability[];
  work_envelope: WorkEnvelopeProfile | null;
  simultaneous_axes?: ProvenanceField<number>;
  warnings: CapabilityWarning[];
  field_count: number;
  avg_confidence: number;
}

/** Reconciliation discrepancy between handbook and registry. */
export interface Discrepancy {
  field: string;
  handbook_value: number | string;
  registry_value: number | string;
  delta_pct?: number;          // For numeric fields: |h-r|/r * 100
  severity: "info" | "warning" | "critical";
  recommendation: string;
}

/** Full reconciliation report. */
export interface ReconciliationReport {
  machine_id: string;
  manufacturer?: string;
  model?: string;
  discrepancies: Discrepancy[];
  fields_compared: number;
  fields_matching: number;
  fields_missing_in_handbook: string[];
  fields_missing_in_registry: string[];
  overall_agreement_pct: number;
  recommendation: string;
}

/** Capability query filter. */
export interface CapabilityQuery {
  machine_id?: string;
  manufacturer?: string;
  min_spindle_rpm?: number;
  min_power_kw?: number;
  min_torque_nm?: number;
  min_axis_travel_mm?: number;
  simultaneous_axes?: number;
  limit?: number;
}

/** Coverage stats. */
export interface CapabilityStats {
  total_machines_with_capability: number;
  sources: Record<CapabilitySource, number>;
  spindle_coverage: number;
  axis_coverage: number;
  handbook_coverage: number;
  torque_curve_coverage: number;
  avg_confidence: number;
}

// ════════════════════════════════════════════════════════════════════
// SECTION 2: ZOD SCHEMAS (for dispatcher wiring)
// ════════════════════════════════════════════════════════════════════

export const CapabilityLookupSchema = z.object({
  machine_id: z.string().min(1),
  include_torque_curve: z.boolean().default(true),
});
export type CapabilityLookupInput = z.input<typeof CapabilityLookupSchema>;

export const CapabilityQuerySchema = z.object({
  machine_id: z.string().optional(),
  manufacturer: z.string().optional(),
  min_spindle_rpm: z.number().optional(),
  min_power_kw: z.number().optional(),
  min_torque_nm: z.number().optional(),
  min_axis_travel_mm: z.number().optional(),
  simultaneous_axes: z.number().min(3).max(5).optional(),
  limit: z.number().min(1).max(100).default(20),
});

export const ReconciliationSchema = z.object({
  machine_id: z.string().min(1),
  tolerance_pct: z.number().min(0).max(100).default(5),
});
export type ReconciliationInput = z.input<typeof ReconciliationSchema>;

export const CapabilityStatsSchema = z.object({});

// ════════════════════════════════════════════════════════════════════
// SECTION 3: SOURCE CONFIDENCE MAP
// ════════════════════════════════════════════════════════════════════

/**
 * Source authority ordering (must match header doc lines 8-12):
 *   handbook (0.98) > spindle_correction (0.96) > torque_curve_hsm (0.95)
 *   > torque_curve_catalog (0.85) > torque_curve_computed (0.70) > machine_registry (0.65)
 *
 * Spindle corrections are manufacturer-verified web data that fix known catalog errors.
 * They outrank HSMAdvisor because they represent intentional OEM corrections.
 */
const SOURCE_CONFIDENCE: Record<CapabilitySource, number> = {
  handbook: 0.98,
  spindle_correction: 0.96,
  torque_curve_hsm: 0.95,
  torque_curve_catalog: 0.85,
  torque_curve_computed: 0.70,
  machine_registry: 0.65,
  none: 0,
};

/** Pick the higher-authority field value when merging. */
function pickBest<T>(
  ...candidates: Array<{ value: T; source: CapabilitySource; detail?: string } | undefined>
): ProvenanceField<T> | undefined {
  const valid = candidates.filter(
    (c): c is { value: T; source: CapabilitySource; detail?: string } =>
      c !== undefined && c.value !== undefined && c.value !== null
  );
  if (valid.length === 0) return undefined;
  // Sort by confidence descending — first wins
  valid.sort((a, b) => SOURCE_CONFIDENCE[b.source] - SOURCE_CONFIDENCE[a.source]);
  const best = valid[0];
  return {
    value: best.value,
    source: best.source,
    confidence: SOURCE_CONFIDENCE[best.source],
    source_detail: best.detail,
  };
}

/** Create a ProvenanceField from a value + source. */
function pf<T>(value: T, source: CapabilitySource, detail?: string): ProvenanceField<T> {
  return { value, source, confidence: SOURCE_CONFIDENCE[source], source_detail: detail };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 4: ENGINE IMPLEMENTATION
// ════════════════════════════════════════════════════════════════════

/**
 * Build spindle profile for a given machine by merging all available sources.
 *
 * Source priority: handbook > spindle_correction > torque_curve > machine_registry
 */
function getSpindleProfile(
  machineId: string,
  handbookRegistry: { getByMachineId(id: string): any },
  torqueCurves: Record<string, any>,
  spindleCorrections: Array<{ brand: string; model: string; corrected_spindle: any; confidence: number; source: string }>,
  machineRegistry: { get(id: string): any } | null,
): SpindleCapabilityProfile | null {
  // Gather data from each source
  const handbook = handbookRegistry.getByMachineId(machineId);
  const hbkSpindle = handbook?.spindle_specs;
  const torqueCurve = torqueCurves[machineId];
  const machine = machineRegistry?.get(machineId);
  const regSpindle = machine?.spindle;

  // Find matching spindle correction by brand+model
  let correction: typeof spindleCorrections[0] | undefined;
  if (machine) {
    correction = spindleCorrections.find(
      c => c.brand.toLowerCase() === (machine.manufacturer ?? "").toLowerCase() &&
           c.model.toLowerCase() === (machine.model ?? "").toLowerCase()
    );
  }

  // If no data from any source, return null
  if (!hbkSpindle && !torqueCurve && !regSpindle && !correction) return null;

  // Helper: handbook provenance detail
  const hbkDetail = hbkSpindle?.source
    ? `${hbkSpindle.source.handbook_title} p.${hbkSpindle.source.page_number ?? "?"}`
    : undefined;

  // max_rpm
  const max_rpm = pickBest<number>(
    hbkSpindle ? { value: hbkSpindle.max_rpm, source: "handbook" as const, detail: hbkDetail } : undefined,
    correction ? { value: correction.corrected_spindle.max_rpm, source: "spindle_correction" as const, detail: correction.source } : undefined,
    torqueCurve ? { value: torqueCurve.max_rpm, source: mapTorqueSource(torqueCurve.source), detail: torqueCurve.duty_note } : undefined,
    regSpindle ? { value: regSpindle.max_rpm, source: "machine_registry" as const } : undefined,
  );

  if (!max_rpm) return null; // Need at least max_rpm

  // min_rpm
  const min_rpm = pickBest<number>(
    hbkSpindle?.min_rpm != null ? { value: hbkSpindle.min_rpm, source: "handbook" as const, detail: hbkDetail } : undefined,
    regSpindle?.min_rpm != null ? { value: regSpindle.min_rpm, source: "machine_registry" as const } : undefined,
  ) ?? pf(0, "none");

  // power_continuous_kw
  const power_continuous_kw = pickBest<number>(
    hbkSpindle ? { value: hbkSpindle.power_continuous_kw, source: "handbook" as const, detail: hbkDetail } : undefined,
    correction ? { value: correction.corrected_spindle.power_kw, source: "spindle_correction" as const, detail: correction.source } : undefined,
    torqueCurve ? { value: torqueCurve.rated_power_kW, source: mapTorqueSource(torqueCurve.source), detail: torqueCurve.duty_note } : undefined,
    regSpindle ? { value: regSpindle.power_continuous, source: "machine_registry" as const } : undefined,
  ) ?? pf(0, "none");

  // power_30min_kw
  const power_30min_kw = pickBest<number>(
    hbkSpindle?.power_30min_kw != null ? { value: hbkSpindle.power_30min_kw, source: "handbook" as const, detail: hbkDetail } : undefined,
    regSpindle?.power_30min != null ? { value: regSpindle.power_30min, source: "machine_registry" as const } : undefined,
  );

  // power_peak_kw
  const power_peak_kw = pickBest<number>(
    hbkSpindle?.power_peak_kw != null ? { value: hbkSpindle.power_peak_kw, source: "handbook" as const, detail: hbkDetail } : undefined,
    regSpindle?.power_peak != null ? { value: regSpindle.power_peak, source: "machine_registry" as const } : undefined,
  );

  // torque_max_nm
  const torque_max_nm = pickBest<number>(
    hbkSpindle ? { value: hbkSpindle.torque_max_nm, source: "handbook" as const, detail: hbkDetail } : undefined,
    correction ? { value: correction.corrected_spindle.torque_nm, source: "spindle_correction" as const, detail: correction.source } : undefined,
    torqueCurve ? { value: torqueCurve.peak_torque_Nm, source: mapTorqueSource(torqueCurve.source), detail: torqueCurve.duty_note } : undefined,
    regSpindle ? { value: regSpindle.torque_max, source: "machine_registry" as const } : undefined,
  ) ?? pf(0, "none");

  // torque_continuous_nm
  const torque_continuous_nm = pickBest<number>(
    hbkSpindle?.torque_continuous_nm != null ? { value: hbkSpindle.torque_continuous_nm, source: "handbook" as const, detail: hbkDetail } : undefined,
    regSpindle?.torque_continuous != null ? { value: regSpindle.torque_continuous, source: "machine_registry" as const } : undefined,
  );

  // base_speed_rpm (knee of constant-torque/constant-power transition)
  const base_speed_rpm = pickBest<number>(
    hbkSpindle?.base_speed_rpm != null ? { value: hbkSpindle.base_speed_rpm, source: "handbook" as const, detail: hbkDetail } : undefined,
    correction?.corrected_spindle?.base_rpm != null ? { value: correction.corrected_spindle.base_rpm, source: "spindle_correction" as const, detail: correction.source } : undefined,
    torqueCurve ? { value: torqueCurve.base_speed_rpm, source: mapTorqueSource(torqueCurve.source), detail: torqueCurve.duty_note } : undefined,
  ) ?? pf(0, "none");

  // taper_type
  const taper_type = pickBest<string>(
    hbkSpindle?.taper_type ? { value: hbkSpindle.taper_type, source: "handbook" as const, detail: hbkDetail } : undefined,
    correction?.corrected_spindle?.taper ? { value: correction.corrected_spindle.taper, source: "spindle_correction" as const, detail: correction.source } : undefined,
    regSpindle?.spindle_nose ? { value: regSpindle.spindle_nose, source: "machine_registry" as const } : undefined,
  ) ?? pf("unknown", "none");

  // drive_type
  const drive_type = pickBest<string>(
    hbkSpindle?.drive_type ? { value: hbkSpindle.drive_type, source: "handbook" as const, detail: hbkDetail } : undefined,
    torqueCurve?.drive_type_inferred ? { value: torqueCurve.drive_type_inferred, source: mapTorqueSource(torqueCurve.source), detail: torqueCurve.duty_note } : undefined,
  );

  // bearing_type
  const bearing_type = pickBest<string>(
    hbkSpindle?.bearing_type ? { value: hbkSpindle.bearing_type, source: "handbook" as const, detail: hbkDetail } : undefined,
    regSpindle?.bearing_type ? { value: regSpindle.bearing_type, source: "machine_registry" as const } : undefined,
  );

  // drawbar_force_kn
  const drawbar_force_kn = pickBest<number>(
    hbkSpindle?.drawbar_force_kn != null ? { value: hbkSpindle.drawbar_force_kn, source: "handbook" as const, detail: hbkDetail } : undefined,
  );

  // gear_ranges
  const gear_ranges = hbkSpindle?.gear_ranges
    ? pf(hbkSpindle.gear_ranges, "handbook", hbkDetail)
    : undefined;

  // torque_curve points
  const curvePoints = buildMergedTorqueCurve(hbkSpindle, torqueCurve, correction, hbkDetail);

  // warmup_procedure
  const warmup_procedure = hbkSpindle?.warmup_procedure
    ? pf(hbkSpindle.warmup_procedure, "handbook", hbkDetail)
    : undefined;

  return {
    max_rpm,
    min_rpm,
    power_continuous_kw,
    power_30min_kw: power_30min_kw ?? undefined,
    power_peak_kw: power_peak_kw ?? undefined,
    torque_max_nm,
    torque_continuous_nm: torque_continuous_nm ?? undefined,
    base_speed_rpm,
    taper_type,
    drive_type: drive_type ?? undefined,
    bearing_type: bearing_type ?? undefined,
    drawbar_force_kn: drawbar_force_kn ?? undefined,
    gear_ranges,
    torque_curve: curvePoints,
    warmup_procedure,
  };
}

/** Map torque curve source string to CapabilitySource. */
function mapTorqueSource(src: string): CapabilitySource {
  switch (src) {
    case "hsm_advisor": return "torque_curve_hsm";
    case "catalog_verified": return "torque_curve_catalog";
    case "computed_from_PT": return "torque_curve_computed";
    default: return "torque_curve_computed";
  }
}

/** Build merged torque curve from handbook, existing curve, and correction. */
function buildMergedTorqueCurve(
  hbkSpindle: any,
  torqueCurve: any,
  correction: any,
  hbkDetail?: string,
): ProvenanceField<TorqueCurvePoint[]> {
  // Handbook torque curve has highest priority
  if (hbkSpindle?.torque_curve && hbkSpindle.torque_curve.length > 0) {
    return pf(
      hbkSpindle.torque_curve.map((pt: any) => ({
        rpm: pt.rpm,
        torque_nm: pt.torque_nm,
        power_kw: pt.power_kw,
      })),
      "handbook",
      hbkDetail,
    );
  }

  // Existing torque curve data (from machine-torque-curves.ts)
  if (torqueCurve?.points && torqueCurve.points.length > 0) {
    const src = mapTorqueSource(torqueCurve.source);
    return pf(
      torqueCurve.points.map((pt: any) => ({
        rpm: pt.rpm,
        torque_nm: pt.torque_Nm ?? pt.torque_nm,
        power_kw: pt.power_kW ?? pt.power_kw,
      })),
      src,
      torqueCurve.duty_note,
    );
  }

  // Generate synthetic curve from correction data
  if (correction) {
    const sp = correction.corrected_spindle;
    return pf(
      generateSyntheticCurve(sp.torque_nm, sp.power_kw, sp.base_rpm ?? 0, sp.max_rpm),
      "spindle_correction",
      correction.source,
    );
  }

  return pf([], "none");
}

/**
 * Generate a synthetic torque curve from peak torque, rated power, base speed, and max RPM.
 * Uses standard constant-torque (below base) / constant-power (above base) motor model.
 * Reference: Tlusty, Manufacturing Processes and Equipment, Ch. 4.
 */
function generateSyntheticCurve(
  peakTorqueNm: number,
  ratedPowerKw: number,
  baseSpeedRpm: number,
  maxRpm: number,
): TorqueCurvePoint[] {
  if (peakTorqueNm <= 0 || ratedPowerKw <= 0 || maxRpm <= 0) return [];

  // If no base speed, compute from P = T * ω → base_rpm = P * 9549 / T
  const effectiveBase = baseSpeedRpm > 0
    ? baseSpeedRpm
    : Math.round(ratedPowerKw * 9549 / peakTorqueNm);

  const points: TorqueCurvePoint[] = [];

  // Constant-torque region: 5 points from 0 to base speed
  const ctSteps = [0, 0.25, 0.5, 0.75, 1.0];
  for (const frac of ctSteps) {
    const rpm = Math.round(effectiveBase * frac);
    if (rpm === 0) {
      points.push({ rpm: 0, torque_nm: peakTorqueNm, power_kw: 0 });
    } else {
      const power = peakTorqueNm * rpm / 9549;
      points.push({
        rpm,
        torque_nm: round2(peakTorqueNm),
        power_kw: round2(power),
      });
    }
  }

  // Constant-power region: points above base speed
  const cpSteps = [1.5, 2, 3, 5];
  for (const mult of cpSteps) {
    const rpm = Math.round(effectiveBase * mult);
    if (rpm > maxRpm) break;
    const torque = ratedPowerKw * 9549 / rpm;
    points.push({
      rpm,
      torque_nm: round2(torque),
      power_kw: round2(ratedPowerKw),
    });
  }

  // Final point at max RPM
  const lastRpm = points[points.length - 1]?.rpm ?? 0;
  if (lastRpm < maxRpm) {
    const torque = ratedPowerKw * 9549 / maxRpm;
    points.push({
      rpm: maxRpm,
      torque_nm: round2(torque),
      power_kw: round2(ratedPowerKw),
    });
  }

  return points;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

/**
 * Build axis capability profiles by merging handbook and registry data.
 */
function getAxisProfiles(
  machineId: string,
  handbookRegistry: { getByMachineId(id: string): any },
  machineRegistry: { get(id: string): any } | null,
): AxisCapability[] {
  const handbook = handbookRegistry.getByMachineId(machineId);
  const hbkAxes = handbook?.axis_kinematics?.axes;
  const hbkDetail = handbook?.axis_kinematics?.source
    ? `${handbook.axis_kinematics.source.handbook_title} p.${handbook.axis_kinematics.source.page_number ?? "?"}`
    : undefined;

  const machine = machineRegistry?.get(machineId);
  const regAxes: any[] | undefined = machine?.axes;

  if (!hbkAxes && !regAxes) return [];

  // Build a map of axis name → data from each source
  const axisMap = new Map<string, { hbk?: any; reg?: any }>();

  if (hbkAxes) {
    for (const a of hbkAxes) {
      const name = a.name.toUpperCase();
      axisMap.set(name, { ...axisMap.get(name), hbk: a });
    }
  }
  if (regAxes) {
    for (const a of regAxes) {
      const name = (a.name ?? "").toUpperCase();
      if (!name) continue;
      axisMap.set(name, { ...axisMap.get(name), reg: a });
    }
  }

  const result: AxisCapability[] = [];
  for (const [name, { hbk, reg }] of axisMap) {
    const travel_mm = pickBest<number>(
      hbk?.travel_mm != null ? { value: hbk.travel_mm, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.travel != null ? { value: reg.travel, source: "machine_registry" as const } : undefined,
    );
    if (!travel_mm) continue; // Need at least travel

    const rapid_mm_min = pickBest<number>(
      hbk?.rapid_mm_min != null ? { value: hbk.rapid_mm_min, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.rapid_rate != null ? { value: reg.rapid_rate, source: "machine_registry" as const } : undefined,
    ) ?? pf(0, "none");

    const max_feed_mm_min = pickBest<number>(
      hbk?.max_feed_mm_min != null ? { value: hbk.max_feed_mm_min, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.max_feed_rate != null ? { value: reg.max_feed_rate, source: "machine_registry" as const } : undefined,
    );

    const accel_m_s2 = pickBest<number>(
      hbk?.accel_m_s2 != null ? { value: hbk.accel_m_s2, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.acceleration != null ? { value: reg.acceleration, source: "machine_registry" as const } : undefined,
    );

    const resolution_um = pickBest<number>(
      hbk?.resolution_um != null ? { value: hbk.resolution_um, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.resolution != null ? { value: reg.resolution, source: "machine_registry" as const } : undefined,
    );

    const repeatability_um = pickBest<number>(
      hbk?.repeatability_um != null ? { value: hbk.repeatability_um, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.repeatability != null ? { value: reg.repeatability, source: "machine_registry" as const } : undefined,
    );

    const accuracy_um = pickBest<number>(
      hbk?.accuracy_um != null ? { value: hbk.accuracy_um, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.accuracy != null ? { value: reg.accuracy, source: "machine_registry" as const } : undefined,
    );

    const backlash_um = pickBest<number>(
      hbk?.backlash_um != null ? { value: hbk.backlash_um, source: "handbook" as const, detail: hbkDetail } : undefined,
    );

    const ball_screw_pitch_mm = pickBest<number>(
      hbk?.ball_screw_pitch_mm != null ? { value: hbk.ball_screw_pitch_mm, source: "handbook" as const, detail: hbkDetail } : undefined,
    );

    const linear_scale = pickBest<boolean>(
      hbk?.linear_scale != null ? { value: hbk.linear_scale, source: "handbook" as const, detail: hbkDetail } : undefined,
      reg?.linear_scale != null ? { value: reg.linear_scale, source: "machine_registry" as const } : undefined,
    );

    result.push({
      name,
      travel_mm,
      rapid_mm_min,
      max_feed_mm_min: max_feed_mm_min ?? undefined,
      accel_m_s2: accel_m_s2 ?? undefined,
      resolution_um: resolution_um ?? undefined,
      repeatability_um: repeatability_um ?? undefined,
      accuracy_um: accuracy_um ?? undefined,
      backlash_um: backlash_um ?? undefined,
      ball_screw_pitch_mm: ball_screw_pitch_mm ?? undefined,
      linear_scale: linear_scale ?? undefined,
    });
  }

  // Sort axes: X, Y, Z, A, B, C order
  const axisOrder = ["X", "Y", "Z", "A", "B", "C"];
  result.sort((a, b) => {
    const ai = axisOrder.indexOf(a.name);
    const bi = axisOrder.indexOf(b.name);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  return result;
}

/**
 * Build work envelope profile by merging handbook and registry data.
 */
function getWorkEnvelope(
  machineId: string,
  handbookRegistry: { getByMachineId(id: string): any },
  machineRegistry: { get(id: string): any } | null,
): WorkEnvelopeProfile | null {
  const handbook = handbookRegistry.getByMachineId(machineId);
  const hbkAxis = handbook?.axis_kinematics;
  const hbkDetail = hbkAxis?.source
    ? `${hbkAxis.source.handbook_title} p.${hbkAxis.source.page_number ?? "?"}`
    : undefined;

  const machine = machineRegistry?.get(machineId);
  const regEnvelope = machine?.envelope;

  if (!hbkAxis?.work_envelope_mm && !regEnvelope) return null;

  const x_mm = pickBest<number>(
    hbkAxis?.work_envelope_mm?.x != null ? { value: hbkAxis.work_envelope_mm.x, source: "handbook" as const, detail: hbkDetail } : undefined,
    regEnvelope?.x_travel != null ? { value: regEnvelope.x_travel, source: "machine_registry" as const } : undefined,
  );
  const y_mm = pickBest<number>(
    hbkAxis?.work_envelope_mm?.y != null ? { value: hbkAxis.work_envelope_mm.y, source: "handbook" as const, detail: hbkDetail } : undefined,
    regEnvelope?.y_travel != null ? { value: regEnvelope.y_travel, source: "machine_registry" as const } : undefined,
  );
  const z_mm = pickBest<number>(
    hbkAxis?.work_envelope_mm?.z != null ? { value: hbkAxis.work_envelope_mm.z, source: "handbook" as const, detail: hbkDetail } : undefined,
    regEnvelope?.z_travel != null ? { value: regEnvelope.z_travel, source: "machine_registry" as const } : undefined,
  );

  if (!x_mm || !y_mm || !z_mm) return null;

  const spindle_to_table_min_mm = pickBest<number>(
    hbkAxis?.spindle_to_table_min_mm != null ? { value: hbkAxis.spindle_to_table_min_mm, source: "handbook" as const, detail: hbkDetail } : undefined,
    regEnvelope?.spindle_to_table_min != null ? { value: regEnvelope.spindle_to_table_min, source: "machine_registry" as const } : undefined,
  );
  const spindle_to_table_max_mm = pickBest<number>(
    hbkAxis?.spindle_to_table_max_mm != null ? { value: hbkAxis.spindle_to_table_max_mm, source: "handbook" as const, detail: hbkDetail } : undefined,
    regEnvelope?.spindle_to_table_max != null ? { value: regEnvelope.spindle_to_table_max, source: "machine_registry" as const } : undefined,
  );

  return {
    x_mm,
    y_mm,
    z_mm,
    spindle_to_table_min_mm: spindle_to_table_min_mm ?? undefined,
    spindle_to_table_max_mm: spindle_to_table_max_mm ?? undefined,
  };
}

/**
 * Validate a capability profile for physically unreasonable values.
 *
 * Bounds are conservative and machine-type-agnostic:
 *   - Spindle RPM: CNC spindles range 0–200,000 (micro/dental max ~200k)
 *   - Power: 0–500 kW (largest gantry mills ≈ 150 kW; 500 kW is generous ceiling)
 *   - Torque: 0–50,000 Nm (large turning centers)
 *   - Axis travel: 0–50,000 mm (large gantry)
 *   - Rapid rate: 0–120,000 mm/min (linear-motor machines ≈ 90 m/min)
 *   - Acceleration: 0–50 m/s² (linear motors peak ≈ 30 m/s²)
 *   - Repeatability/accuracy: 0–1000 µm (anything > 1mm is suspect)
 *
 * Reference: ISO 10791 (machining centres), ISO 13041 (lathes)
 */
function validateProfile(profile: MachineCapabilityProfile): CapabilityWarning[] {
  const warnings: CapabilityWarning[] = [];

  function checkBound(field: string, val: number | undefined, min: number, max: number, unit: string) {
    if (val == null) return;
    if (val < min) {
      warnings.push({ field, message: `${field} = ${val} ${unit} is below physical minimum (${min})`, severity: "critical" });
    } else if (val > max) {
      warnings.push({ field, message: `${field} = ${val} ${unit} exceeds physical maximum (${max})`, severity: "critical" });
    }
  }

  // Spindle validation
  if (profile.spindle) {
    const s = profile.spindle;
    checkBound("spindle.max_rpm", s.max_rpm.value, 1, 200000, "RPM");
    checkBound("spindle.power_continuous_kw", s.power_continuous_kw.value, 0, 500, "kW");
    checkBound("spindle.torque_max_nm", s.torque_max_nm.value, 0, 50000, "Nm");
    if (s.base_speed_rpm.value > 0 && s.max_rpm.value > 0 && s.base_speed_rpm.value > s.max_rpm.value) {
      warnings.push({ field: "spindle.base_speed_rpm", message: `Base speed (${s.base_speed_rpm.value}) exceeds max RPM (${s.max_rpm.value})`, severity: "critical" });
    }
    if (s.power_30min_kw && s.power_continuous_kw.value > 0 && s.power_30min_kw.value < s.power_continuous_kw.value) {
      warnings.push({ field: "spindle.power_30min_kw", message: `30-min power (${s.power_30min_kw.value} kW) < continuous power (${s.power_continuous_kw.value} kW) — check ratings`, severity: "warning" });
    }
    // Energy conservation: P ≈ T × ω at base speed (±25% tolerance for duty cycle differences)
    if (s.base_speed_rpm.value > 0 && s.torque_max_nm.value > 0 && s.power_continuous_kw.value > 0) {
      const computed_kw = s.torque_max_nm.value * s.base_speed_rpm.value / 9549;
      const ratio = computed_kw / s.power_continuous_kw.value;
      if (ratio < 0.5 || ratio > 2.0) {
        warnings.push({
          field: "spindle.energy_conservation",
          message: `P=Tω check: T×ω/9549 = ${round2(computed_kw)} kW vs rated ${s.power_continuous_kw.value} kW (ratio ${round2(ratio)}). Possible data error.`,
          severity: ratio < 0.3 || ratio > 3.0 ? "critical" : "warning",
        });
      }
    }
    // Torque curve monotonicity: torque should not increase with RPM in constant-power region
    // Only check above base_speed_rpm — constant-torque region legitimately has flat/rising torque
    if (s.torque_curve.value.length >= 3) {
      const pts = s.torque_curve.value;
      const baseRpm = s.base_speed_rpm.value;
      for (let i = 2; i < pts.length; i++) {
        if (pts[i].rpm > baseRpm && pts[i - 1].rpm >= baseRpm &&
            pts[i].rpm > pts[i - 1].rpm && pts[i].torque_nm > pts[i - 1].torque_nm * 1.05) {
          warnings.push({
            field: "spindle.torque_curve",
            message: `Torque increases from ${pts[i - 1].torque_nm} Nm @ ${pts[i - 1].rpm} RPM to ${pts[i].torque_nm} Nm @ ${pts[i].rpm} RPM — non-physical in constant-power region (above base ${baseRpm} RPM)`,
            severity: "warning",
          });
          break;
        }
      }
    }
  }

  // Axis validation
  for (const axis of profile.axes) {
    const prefix = `axis.${axis.name}`;
    checkBound(`${prefix}.travel_mm`, axis.travel_mm.value, 1, 50000, "mm");
    checkBound(`${prefix}.rapid_mm_min`, axis.rapid_mm_min.value, 0, 120000, "mm/min");
    if (axis.accel_m_s2) checkBound(`${prefix}.accel_m_s2`, axis.accel_m_s2.value, 0, 50, "m/s²");
    if (axis.repeatability_um) checkBound(`${prefix}.repeatability_um`, axis.repeatability_um.value, 0, 1000, "µm");
    if (axis.accuracy_um) checkBound(`${prefix}.accuracy_um`, axis.accuracy_um.value, 0, 1000, "µm");
    // Repeatability should be <= accuracy (tighter)
    if (axis.repeatability_um && axis.accuracy_um && axis.repeatability_um.value > axis.accuracy_um.value) {
      warnings.push({
        field: `${prefix}.repeatability_um`,
        message: `Repeatability (${axis.repeatability_um.value} µm) > accuracy (${axis.accuracy_um.value} µm) — typically repeatability ≤ accuracy`,
        severity: "info",
      });
    }
  }

  // Work envelope validation
  if (profile.work_envelope) {
    const we = profile.work_envelope;
    checkBound("envelope.x_mm", we.x_mm.value, 1, 50000, "mm");
    checkBound("envelope.y_mm", we.y_mm.value, 1, 50000, "mm");
    checkBound("envelope.z_mm", we.z_mm.value, 1, 50000, "mm");
  }

  // Low-confidence warning
  if (profile.avg_confidence < 0.5 && profile.field_count > 0) {
    warnings.push({
      field: "profile",
      message: `Average confidence ${profile.avg_confidence} is below 0.5 — data may be unreliable. Consider ingesting OEM handbook for this machine.`,
      severity: "warning",
    });
  }

  return warnings;
}

/**
 * Count provenance fields and compute average confidence in a capability profile.
 */
function computeProfileStats(profile: MachineCapabilityProfile): { count: number; avgConf: number } {
  const confs: number[] = [];

  function collect(obj: any) {
    if (!obj || typeof obj !== "object") return;
    if ("source" in obj && "confidence" in obj && "value" in obj) {
      if (obj.source !== "none") confs.push(obj.confidence);
      return;
    }
    for (const v of Object.values(obj)) {
      if (v && typeof v === "object") collect(v);
    }
  }

  if (profile.spindle) collect(profile.spindle);
  for (const axis of profile.axes) collect(axis);
  if (profile.work_envelope) collect(profile.work_envelope);
  if (profile.simultaneous_axes) confs.push(profile.simultaneous_axes.confidence);

  return {
    count: confs.length,
    avgConf: confs.length > 0 ? round2(confs.reduce((a, b) => a + b, 0) / confs.length) : 0,
  };
}

/**
 * Build full capability profile for a machine.
 */
function getCapabilityProfile(
  input: CapabilityLookupInput,
  handbookRegistry: { getByMachineId(id: string): any },
  torqueCurves: Record<string, any>,
  spindleCorrections: any[],
  machineRegistry: { get(id: string): any; list?(): any[] } | null,
): MachineCapabilityProfile {
  const parsed = CapabilityLookupSchema.parse(input);
  const machineId = parsed.machine_id;

  const machine = machineRegistry?.get(machineId);
  const handbook = handbookRegistry.getByMachineId(machineId);

  const sources: Set<CapabilitySource> = new Set();
  if (handbook) sources.add("handbook");
  if (torqueCurves[machineId]) {
    sources.add(mapTorqueSource(torqueCurves[machineId].source));
  }
  if (machine) sources.add("machine_registry");

  const spindle = getSpindleProfile(machineId, handbookRegistry, torqueCurves, spindleCorrections, machineRegistry);
  const axes = getAxisProfiles(machineId, handbookRegistry, machineRegistry);
  const work_envelope = getWorkEnvelope(machineId, handbookRegistry, machineRegistry);

  // simultaneous_axes
  const hbkSimAxes = handbook?.axis_kinematics?.simultaneous_axes;
  const regSimAxes = machine?.simultaneous_axes;
  const simultaneous_axes = pickBest<number>(
    hbkSimAxes != null ? { value: hbkSimAxes, source: "handbook" as const } : undefined,
    regSimAxes != null ? { value: regSimAxes, source: "machine_registry" as const } : undefined,
  );

  if (!parsed.include_torque_curve && spindle?.torque_curve) {
    spindle.torque_curve = pf([], spindle.torque_curve.source, "omitted per request");
  }

  const profile: MachineCapabilityProfile = {
    machine_id: machineId,
    manufacturer: machine?.manufacturer ?? handbook?.manufacturer,
    model: machine?.model ?? handbook?.model,
    sources_consulted: Array.from(sources),
    spindle,
    axes,
    work_envelope,
    simultaneous_axes: simultaneous_axes ?? undefined,
    warnings: [],
    field_count: 0,
    avg_confidence: 0,
  };

  const stats = computeProfileStats(profile);
  profile.field_count = stats.count;
  profile.avg_confidence = stats.avgConf;

  // Output validation: sanity-check all fields against physical bounds (ISO 10791/13041)
  profile.warnings = validateProfile(profile);

  return profile;
}

/**
 * Reconcile handbook data against MachineRegistry for a given machine.
 * Reports discrepancies above the specified tolerance.
 */
function reconcile(
  input: ReconciliationInput,
  handbookRegistry: { getByMachineId(id: string): any },
  torqueCurves: Record<string, any>,
  spindleCorrections: any[],
  machineRegistry: { get(id: string): any } | null,
): ReconciliationReport {
  const parsed = ReconciliationSchema.parse(input);
  const machineId = parsed.machine_id;
  const tolerancePct = parsed.tolerance_pct;

  const handbook = handbookRegistry.getByMachineId(machineId);
  const machine = machineRegistry?.get(machineId);

  const discrepancies: Discrepancy[] = [];
  let fieldsCompared = 0;
  let fieldsMatching = 0;
  const missingInHandbook: string[] = [];
  const missingInRegistry: string[] = [];

  // Compare spindle fields
  const hbkSpindle = handbook?.spindle_specs;
  const regSpindle = machine?.spindle;

  if (hbkSpindle && regSpindle) {
    const spindleFields: Array<[string, string, string]> = [
      ["max_rpm", "max_rpm", "max_rpm"],
      ["power_continuous_kw", "power_continuous_kw", "power_continuous"],
      ["torque_max_nm", "torque_max_nm", "torque_max"],
    ];

    for (const [label, hbkKey, regKey] of spindleFields) {
      const hVal = hbkSpindle[hbkKey];
      const rVal = regSpindle[regKey];

      if (hVal == null && rVal == null) continue;
      if (hVal == null) { missingInHandbook.push(`spindle.${label}`); continue; }
      if (rVal == null) { missingInRegistry.push(`spindle.${label}`); continue; }

      fieldsCompared++;
      const deltaPct = Math.abs(hVal - rVal) / Math.max(Math.abs(rVal), 1) * 100;

      if (deltaPct <= tolerancePct) {
        fieldsMatching++;
      } else {
        discrepancies.push({
          field: `spindle.${label}`,
          handbook_value: hVal,
          registry_value: rVal,
          delta_pct: round2(deltaPct),
          severity: deltaPct > 50 ? "critical" : deltaPct > 20 ? "warning" : "info",
          recommendation: deltaPct > 50
            ? `CRITICAL: ${label} differs by ${round2(deltaPct)}%. Verify against OEM specs — handbook value (${hVal}) likely correct.`
            : `${label} differs by ${round2(deltaPct)}%. Consider updating registry to handbook value (${hVal}).`,
        });
      }
    }

    // Taper type (string comparison)
    if (hbkSpindle.taper_type && regSpindle.spindle_nose) {
      fieldsCompared++;
      const hTaper = hbkSpindle.taper_type.toLowerCase().replace(/[-_\s]/g, "");
      const rTaper = regSpindle.spindle_nose.toLowerCase().replace(/[-_\s]/g, "");
      if (hTaper === rTaper || hTaper.includes(rTaper) || rTaper.includes(hTaper)) {
        fieldsMatching++;
      } else {
        discrepancies.push({
          field: "spindle.taper_type",
          handbook_value: hbkSpindle.taper_type,
          registry_value: regSpindle.spindle_nose,
          severity: "critical",
          recommendation: `Taper mismatch: handbook says "${hbkSpindle.taper_type}", registry says "${regSpindle.spindle_nose}". This affects tooling compatibility — handbook value is authoritative.`,
        });
      }
    }
  } else if (hbkSpindle && !regSpindle) {
    missingInRegistry.push("spindle (entire section)");
  } else if (!hbkSpindle && regSpindle) {
    missingInHandbook.push("spindle (entire section)");
  }

  // Compare axis fields
  const hbkAxes: any[] | undefined = handbook?.axis_kinematics?.axes;
  const regAxes: any[] | undefined = machine?.axes;

  if (hbkAxes && regAxes) {
    for (const hAxis of hbkAxes) {
      const name = hAxis.name.toUpperCase();
      const rAxis = regAxes.find((a: any) => (a.name ?? "").toUpperCase() === name);
      if (!rAxis) {
        missingInRegistry.push(`axis.${name}`);
        continue;
      }

      const axisFields: Array<[string, string, string]> = [
        ["travel", "travel_mm", "travel"],
        ["rapid_rate", "rapid_mm_min", "rapid_rate"],
      ];

      for (const [label, hKey, rKey] of axisFields) {
        const hVal = hAxis[hKey];
        const rVal = rAxis[rKey];
        if (hVal == null || rVal == null) continue;

        fieldsCompared++;
        const deltaPct = Math.abs(hVal - rVal) / Math.max(Math.abs(rVal), 1) * 100;

        if (deltaPct <= tolerancePct) {
          fieldsMatching++;
        } else {
          discrepancies.push({
            field: `axis.${name}.${label}`,
            handbook_value: hVal,
            registry_value: rVal,
            delta_pct: round2(deltaPct),
            severity: deltaPct > 30 ? "warning" : "info",
            recommendation: `Axis ${name} ${label} differs by ${round2(deltaPct)}%. Handbook: ${hVal}, Registry: ${rVal}.`,
          });
        }
      }
    }
  }

  // Also reconcile torque curve data against registry spindle
  const tc = torqueCurves[machineId];
  if (tc && regSpindle) {
    if (Math.abs(tc.peak_torque_Nm - regSpindle.torque_max) / Math.max(regSpindle.torque_max, 1) * 100 > tolerancePct) {
      fieldsCompared++;
      const deltaPct = round2(Math.abs(tc.peak_torque_Nm - regSpindle.torque_max) / Math.max(regSpindle.torque_max, 1) * 100);
      discrepancies.push({
        field: "spindle.torque_max (torque_curve vs registry)",
        handbook_value: tc.peak_torque_Nm,
        registry_value: regSpindle.torque_max,
        delta_pct: deltaPct,
        severity: deltaPct > 50 ? "critical" : "warning",
        recommendation: `Torque curve source (${tc.source}, conf=${tc.confidence}) reports ${tc.peak_torque_Nm} Nm vs registry ${regSpindle.torque_max} Nm.`,
      });
    } else {
      fieldsCompared++;
      fieldsMatching++;
    }
  }

  const agreementPct = fieldsCompared > 0
    ? round2(fieldsMatching / fieldsCompared * 100)
    : 100;

  return {
    machine_id: machineId,
    manufacturer: machine?.manufacturer ?? handbook?.manufacturer,
    model: machine?.model ?? handbook?.model,
    discrepancies,
    fields_compared: fieldsCompared,
    fields_matching: fieldsMatching,
    fields_missing_in_handbook: missingInHandbook,
    fields_missing_in_registry: missingInRegistry,
    overall_agreement_pct: agreementPct,
    recommendation: discrepancies.length === 0
      ? "All compared fields agree within tolerance."
      : discrepancies.some(d => d.severity === "critical")
        ? "CRITICAL discrepancies found — review handbook vs registry data before using machine for production."
        : `${discrepancies.length} discrepancy(ies) found — consider updating registry to match handbook values.`,
  };
}

/**
 * Get capability coverage statistics.
 */
function getCapabilityStats(
  handbookRegistry: { getByMachineId(id: string): any; list(): Array<{ machine_id: string }> },
  torqueCurves: Record<string, any>,
  machineRegistry: { list?(): any[] } | null,
): CapabilityStats {
  const sources: Record<CapabilitySource, number> = {
    handbook: 0, spindle_correction: 0, torque_curve_hsm: 0,
    torque_curve_catalog: 0, torque_curve_computed: 0, machine_registry: 0, none: 0,
  };

  // Count handbook machines with spindle/axis data
  let handbookCoverage = 0;
  const hbkList = handbookRegistry.list();
  for (const entry of hbkList) {
    const hbk = handbookRegistry.getByMachineId(entry.machine_id);
    if (hbk?.spindle_specs || hbk?.axis_kinematics) {
      handbookCoverage++;
      sources.handbook++;
    }
  }

  // Count torque curve machines
  let torqueCurveCoverage = 0;
  for (const tc of Object.values(torqueCurves)) {
    const t = tc as any;
    if (t.source === "skip") continue;
    torqueCurveCoverage++;
    const src = mapTorqueSource(t.source);
    sources[src]++;
  }

  // Count registry machines
  const regList = machineRegistry?.list?.() ?? [];
  for (const _m of regList) {
    sources.machine_registry++;
  }

  // Unique machines with any capability data
  const allMachineIds = new Set<string>();
  for (const entry of hbkList) allMachineIds.add(entry.machine_id);
  for (const id of Object.keys(torqueCurves)) {
    if ((torqueCurves[id] as any)?.source !== "skip") allMachineIds.add(id);
  }
  for (const m of regList) allMachineIds.add((m as any).id);

  // Compute average confidence across all sources
  const totalConf = Object.entries(sources)
    .filter(([k]) => k !== "none")
    .reduce((sum, [k, count]) => sum + SOURCE_CONFIDENCE[k as CapabilitySource] * count, 0);
  const totalCount = Object.entries(sources)
    .filter(([k]) => k !== "none")
    .reduce((sum, [, count]) => sum + count, 0);

  return {
    total_machines_with_capability: allMachineIds.size,
    sources,
    spindle_coverage: torqueCurveCoverage + handbookCoverage,
    axis_coverage: handbookCoverage + regList.length,
    handbook_coverage: handbookCoverage,
    torque_curve_coverage: torqueCurveCoverage,
    avg_confidence: totalCount > 0 ? round2(totalConf / totalCount) : 0,
  };
}

// ════════════════════════════════════════════════════════════════════
// SECTION 5: ENGINE SINGLETON EXPORT
// ════════════════════════════════════════════════════════════════════

/**
 * MachineCapabilityIntelligenceEngine — HBK-MS4
 *
 * Unifies spindle performance, axis capability, and work envelope data
 * from handbook, torque curves, spindle corrections, and MachineRegistry
 * into queryable profiles with per-field provenance and confidence.
 *
 * @example
 *   import { machineCapabilityIntelligenceEngine } from "./MachineCapabilityIntelligenceEngine.js";
 *   const profile = machineCapabilityIntelligenceEngine.getProfile({ machine_id: "haas_vf_2" });
 *   console.log(profile.spindle?.torque_max_nm); // { value: 131.04, source: "torque_curve_hsm", confidence: 0.95 }
 */
export const machineCapabilityIntelligenceEngine = {
  /**
   * Get full capability profile for a machine.
   * Merges all available data sources with per-field provenance.
   */
  getProfile: (
    input: CapabilityLookupInput,
    deps: {
      handbookRegistry: { getByMachineId(id: string): any; list(): any[] };
      torqueCurves: Record<string, any>;
      spindleCorrections: any[];
      machineRegistry: { get(id: string): any; list?(): any[] } | null;
    },
  ): MachineCapabilityProfile => {
    return getCapabilityProfile(input, deps.handbookRegistry, deps.torqueCurves, deps.spindleCorrections, deps.machineRegistry);
  },

  /**
   * Generate reconciliation report comparing handbook/torque data against MachineRegistry.
   */
  reconcile: (
    input: ReconciliationInput,
    deps: {
      handbookRegistry: { getByMachineId(id: string): any };
      torqueCurves: Record<string, any>;
      spindleCorrections: any[];
      machineRegistry: { get(id: string): any } | null;
    },
  ): ReconciliationReport => {
    return reconcile(input, deps.handbookRegistry, deps.torqueCurves, deps.spindleCorrections, deps.machineRegistry);
  },

  /**
   * Get capability coverage statistics across all sources.
   */
  getStats: (
    deps: {
      handbookRegistry: { getByMachineId(id: string): any; list(): Array<{ machine_id: string }> };
      torqueCurves: Record<string, any>;
      machineRegistry: { list?(): any[] } | null;
    },
  ): CapabilityStats => {
    return getCapabilityStats(deps.handbookRegistry, deps.torqueCurves, deps.machineRegistry);
  },

  /**
   * Generate a synthetic torque curve from spindle specs.
   * Useful when no measured data exists.
   * Uses constant-torque/constant-power motor model (Tlusty, Ch. 4).
   */
  generateSyntheticCurve,

  /** Internal utilities exposed for testing. */
  _internal: {
    pickBest,
    mapTorqueSource,
    buildMergedTorqueCurve,
    computeProfileStats,
    round2,
  },
};
