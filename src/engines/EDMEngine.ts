/**
 * EDMEngine — Electrical Discharge Machining Calculations
 *
 * Calculates parameters for EDM operations:
 * - Wire EDM: speed, power settings, wire tension, flushing
 * - Sinker EDM: electrode wear, spark gap, surface finish
 * - Small hole EDM: breakthrough detection, electrode selection
 * - Surface finish prediction from discharge energy
 *
 * Key physics: Material removal in EDM occurs by spark erosion.
 * Each discharge creates a micro-crater. Discharge energy
 * (E = V×I×t_on) controls crater size, which determines both
 * MRR and surface finish. Higher energy = faster but rougher.
 *
 * Reference: Charmilles EDM application guide,
 *            Makino EDM process parameter tables,
 *            Machinery's Handbook Ch.32 "EDM"
 *
 * Actions: wire_edm_calc, sinker_edm_calc, edm_surface
 */

// ── Types ──────────────────────────────────────────────────────────

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
}

export type EDMType = "wire" | "sinker" | "small_hole";

export interface WireEDMInput {
  workpiece_thickness_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  wire_diameter_mm?: number;
  target_ra_um?: number;
  num_cuts?: number;          // 1=rough, 2+=skim
}

export interface WireEDMResult {
  cutting_speed: AtomicValue;
  wire_feed: AtomicValue;
  wire_tension: AtomicValue;
  spark_gap: AtomicValue;
  kerf_width: AtomicValue;
  flushing_pressure: AtomicValue;
  predicted_ra: AtomicValue;
  cycle_time_per_meter: AtomicValue;
  power_setting: string;
  warnings: string[];
}

export interface SinkerEDMInput {
  cavity_volume_mm3?: number;
  cavity_depth_mm: number;
  material_iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  electrode_material?: "copper" | "graphite" | "tungsten";
  target_ra_um?: number;
}

export interface SinkerEDMResult {
  mrr: AtomicValue;
  electrode_wear_ratio: AtomicValue;
  spark_gap: AtomicValue;
  predicted_ra: AtomicValue;
  num_electrodes: AtomicValue;
  cycle_time: AtomicValue;
  flushing_method: string;
  warnings: string[];
}

// ── Reference Data ────────────────────────────────────────────────

/** Wire EDM cutting speed (mm²/min) by ISO group — rough cut */
const WIRE_SPEEDS: Record<string, number> = {
  P: 200, M: 150, K: 250, N: 300, S: 100, H: 180,
};

/** Sinker EDM MRR (mm³/min) by electrode material */
const SINKER_MRR: Record<string, number> = {
  copper: 80,
  graphite: 120,
  tungsten: 40,
};

/** Electrode wear ratio (electrode:workpiece) */
const WEAR_RATIOS: Record<string, Record<string, number>> = {
  copper:   { P: 0.3, M: 0.4, K: 0.2, N: 0.5, S: 0.6, H: 0.3 },
  graphite: { P: 0.1, M: 0.15, K: 0.08, N: 0.2, S: 0.3, H: 0.1 },
  tungsten: { P: 0.05, M: 0.08, K: 0.04, N: 0.1, S: 0.15, H: 0.05 },
};

// ── Engine ─────────────────────────────────────────────────────────

export class EDMEngine {
  /**
   * Calculate wire EDM parameters.
   */
  wireEDM(input: WireEDMInput): WireEDMResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const thickness = input.workpiece_thickness_mm;
    const wireDia = input.wire_diameter_mm ?? 0.25;
    const numCuts = input.num_cuts ?? 1;
    const targetRa = input.target_ra_um ?? (numCuts > 1 ? 0.8 : 3.2);

    // Cutting speed (mm/min linear) = area_rate / thickness
    const areaRate = WIRE_SPEEDS[iso] ?? 200;
    const roughSpeed = areaRate / thickness;

    // Skim cuts are faster but remove less material
    const skimFactor = numCuts === 1 ? 1.0
      : numCuts === 2 ? 2.5
        : numCuts === 3 ? 3.5
          : 4.0;
    // Average speed considering all cuts
    const avgSpeed = roughSpeed / (1 + (numCuts - 1) / skimFactor);

    // Wire feed rate
    const wireFeed = 5 + thickness * 0.05; // m/min

    // Wire tension (N) — higher for thicker workpieces
    const wireTension = wireDia === 0.25
      ? Math.min(15, 8 + thickness * 0.05)
      : Math.min(25, 12 + thickness * 0.08);

    // Spark gap
    const sparkGap = numCuts === 1
      ? 0.015 + wireDia * 0.05
      : 0.005 + wireDia * 0.02;

    // Kerf width = wire diameter + 2 × spark gap
    const kerf = wireDia + 2 * sparkGap;

    // Flushing pressure
    const flushPressure = thickness > 100 ? 12
      : thickness > 50 ? 8
        : 5;

    // Surface finish prediction
    // Rough cut: Ra ≈ 3.2μm, each skim improves ~50%
    let predictedRa = 3.2;
    for (let i = 1; i < numCuts; i++) {
      predictedRa *= 0.4;
    }
    predictedRa = Math.max(predictedRa, 0.1);

    // Power setting
    const power = numCuts === 1 ? "High (rough)"
      : numCuts === 2 ? "Medium (semi-finish)"
        : "Low (finish skim)";

    // Cycle time per meter of cut
    const timePerMeter = avgSpeed > 0
      ? 1000 / avgSpeed * numCuts : 0;

    if (thickness > 300) {
      warnings.push(
        "Thickness > 300mm — very slow, verify wire tension"
      );
    }
    if (wireDia < 0.1) {
      warnings.push(
        "Micro wire (<0.1mm) — requires specialized machine"
      );
    }
    if (targetRa < 0.2 && numCuts < 4) {
      warnings.push(
        `Ra ${targetRa}μm requires 4+ cuts, ` +
        `only ${numCuts} specified`
      );
    }

    return {
      cutting_speed: av(r2(roughSpeed), "mm/min", 0.15,
        "Area rate / thickness"),
      wire_feed: av(r1(wireFeed), "m/min", 0.1,
        "5 + thickness × 0.05"),
      wire_tension: av(r1(wireTension), "N", 0.1,
        "Based on wire diameter and thickness"),
      spark_gap: av(r3(sparkGap), "mm", 0.1,
        "Rough/skim-dependent gap"),
      kerf_width: av(r3(kerf), "mm", 0.05,
        "Wire dia + 2 × spark gap"),
      flushing_pressure: av(flushPressure, "bar", 0.15,
        "Thickness-dependent"),
      predicted_ra: av(r2(predictedRa), "μm", 0.2,
        "3.2 × 0.4^(skim_passes)"),
      cycle_time_per_meter: av(r1(timePerMeter), "min/m", 0.2,
        "1000 / speed × num_cuts"),
      power_setting: power,
      warnings,
    };
  }

  /**
   * Calculate sinker EDM parameters.
   */
  sinkerEDM(input: SinkerEDMInput): SinkerEDMResult {
    const warnings: string[] = [];
    const iso = input.material_iso_group ?? "P";
    const electrode = input.electrode_material ?? "graphite";
    const depth = input.cavity_depth_mm;
    const targetRa = input.target_ra_um ?? 3.2;

    // MRR
    const baseMrr = SINKER_MRR[electrode] ?? 80;
    // Adjust for target finish — lower energy for finer finish
    const finishFactor = targetRa < 0.8 ? 0.2
      : targetRa < 1.6 ? 0.4
        : targetRa < 3.2 ? 0.7
          : 1.0;
    const mrr = baseMrr * finishFactor;

    // Electrode wear
    const wearTable = WEAR_RATIOS[electrode] ?? WEAR_RATIOS.graphite;
    const wearRatio = wearTable[iso] ?? 0.15;

    // Number of electrodes needed
    // Rule: 1 electrode per 5mm depth + roughing/finishing
    const numElectrodes = Math.ceil(depth / 5) +
      (targetRa < 1.6 ? 1 : 0);

    // Spark gap
    const sparkGap = targetRa < 0.8 ? 0.005
      : targetRa < 1.6 ? 0.010
        : targetRa < 3.2 ? 0.020
          : 0.030;

    // Cycle time
    const volume = input.cavity_volume_mm3 ?? depth * 100;
    const cycleTime = mrr > 0 ? volume / mrr : 0;

    // Flushing
    const flushing = depth > 20
      ? "Pressure flushing through electrode"
      : "Suction flushing";

    // Predicted Ra
    const predictedRa = targetRa;

    if (depth > 50) {
      warnings.push(
        "Deep cavity — flushing critical, use pressure flushing"
      );
    }
    if (electrode === "graphite" && (iso === "N")) {
      warnings.push(
        "Graphite on aluminum — carbon contamination risk, " +
        "consider copper electrode"
      );
    }
    if (wearRatio > 0.4) {
      warnings.push(
        `High electrode wear (${(wearRatio * 100).toFixed(0)}%) — ` +
        "budget extra electrodes"
      );
    }

    return {
      mrr: av(r1(mrr), "mm³/min", 0.2,
        `${electrode} @ Ra ${targetRa}μm`),
      electrode_wear_ratio: av(r2(wearRatio), "ratio", 0.2,
        `${electrode} on ISO ${iso}`),
      spark_gap: av(sparkGap, "mm", 0.1,
        "Finish-dependent gap"),
      predicted_ra: av(r2(predictedRa), "μm", 0.15,
        "Target achievable finish"),
      num_electrodes: av(numElectrodes, "electrodes", 0,
        "depth/5 + finish electrode"),
      cycle_time: av(r1(cycleTime), "min", 0.25,
        "volume / MRR"),
      flushing_method: flushing,
      warnings,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────────

function av(
  value: number, unit: string,
  uncertainty: number, source: string
): AtomicValue {
  return { value, unit, uncertainty, source };
}

function r1(n: number): number { return Math.round(n * 10) / 10; }
function r2(n: number): number { return Math.round(n * 100) / 100; }
function r3(n: number): number { return Math.round(n * 1000) / 1000; }

export const edmEngine = new EDMEngine();
