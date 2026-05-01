/**
 * BoreFinishingEngine — Honing & bore finishing prediction
 *
 * Models: Preston's equation (MRR = k×P×V), exponential finish progression,
 *         crosshatch angle from velocity ratio, stone wear estimation
 * References: Klocke (2009), Marinescu et al. (2007), SME Honing Handbook
 * Safety: Critical for precision bores (engines, hydraulics, bearings)
 */

// ─── Types ─────────────────────────────────────────────────────────

export type HoningStoneGrit = "coarse" | "medium" | "fine" | "superfinish";
/** Honing Coolant type definition.
 */
export type HoningCoolant = "flood" | "honing_oil" | "kerosene" | "synthetic";

/** Bore Finishing Input configuration/data structure.
 */
export interface BoreFinishingInput {
  bore_diameter_mm: number;
  bore_length_mm: number;
  target_Ra_um: number;                   // target surface roughness
  current_Ra_um?: number;                 // starting roughness (default 3.2)
  stone_grit?: HoningStoneGrit;           // auto-selected from target Ra if absent
  honing_pressure_bar?: number;           // default 10 bar
  spindle_rpm?: number;                   // rotational speed (default 200)
  stroke_rate_spm?: number;               // strokes per minute (default 60)
  stock_removal_target_um?: number;       // total diameter removal target
  workpiece_hardness_hrc?: number;        // default 30
  coolant_type?: HoningCoolant;           // default honing_oil
}

/** Atomic Value configuration/data structure.
 */
export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  source: string;
  warning?: string;
}

/** Bore Finishing Result configuration/data structure.
 */
export interface BoreFinishingResult {
  estimated_passes: AtomicValue;
  material_removal_rate_um_per_pass: AtomicValue;
  bore_diameter_growth_um: AtomicValue;
  predicted_Ra_um: AtomicValue;
  cycle_time_min: AtomicValue;
  crosshatch_angle_deg: AtomicValue;
  stone_life_passes: AtomicValue;
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Preston coefficient by grit (µm³/N·mm) — empirical */
const PRESTON_K: Record<HoningStoneGrit, number> = {
  coarse: 0.035,       // grit 60-120
  medium: 0.020,       // grit 180-280
  fine: 0.008,         // grit 400-600
  superfinish: 0.003,  // grit 800+
};

/** Ra range achievable per grit */
const GRIT_RA_RANGE: Record<HoningStoneGrit, { min: number; max: number }> = {
  coarse: { min: 1.6, max: 6.3 },
  medium: { min: 0.4, max: 1.6 },
  fine: { min: 0.1, max: 0.8 },
  superfinish: { min: 0.025, max: 0.2 },
};

/** Coolant effectiveness factor */
const COOLANT_FACTOR: Record<HoningCoolant, number> = {
  honing_oil: 1.0,
  kerosene: 0.85,
  synthetic: 0.90,
  flood: 0.75,
};

/** Auto-select grit from target Ra */
const autoSelectGrit = (targetRa: number): HoningStoneGrit => {
  if (targetRa <= 0.1) return "superfinish";
  if (targetRa <= 0.4) return "fine";
  if (targetRa <= 1.6) return "medium";
  return "coarse";
};

/** Hardness factor for stone wear rate */
const hardnessStoneWear = (hrc: number): number => {
  if (hrc <= 20) return 0.6;
  if (hrc <= 35) return 1.0;
  if (hrc <= 50) return 1.5;
  return 2.5;
};

/** Hardness correction for material removal rate */
const hardnessRemovalFactor = (hrc: number): number => {
  if (hrc <= 20) return 1.3;
  if (hrc <= 35) return 1.0;
  if (hrc <= 50) return 0.7;
  return 0.4;
};

// ─── Engine ────────────────────────────────────────────────────────

/** Bore Finishing Engine engine/manager.
 */
export class BoreFinishingEngine {
  calculate(input: BoreFinishingInput): BoreFinishingResult {
    const {
      bore_diameter_mm: D,
      bore_length_mm: L,
      target_Ra_um: targetRa,
      current_Ra_um: currentRa = 3.2,
      honing_pressure_bar: pressure = 10,
      spindle_rpm: rpm = 200,
      stroke_rate_spm: spm = 60,
      stock_removal_target_um: stockTarget,
      workpiece_hardness_hrc: hrc = 30,
      coolant_type: coolant = "honing_oil",
    } = input;

    const recs: string[] = [];
    const grit = input.stone_grit ?? autoSelectGrit(targetRa);

    // ── 1. Honing velocity components ──
    const Vc = Math.PI * D * rpm / 1000;       // circumferential (m/min)
    const Va = 2 * L * spm / 1000;             // axial (m/min)
    const Vr = Math.sqrt(Vc * Vc + Va * Va);   // resultant

    // ── 2. Actual crosshatch angle ──
    const actualXH = Va > 0 ? Math.atan(Vc / Va) * (180 / Math.PI) : 90;

    // ── 3. Preston's equation: MRR = k × P × V ──
    const P_MPa = pressure * 0.1;
    const k = PRESTON_K[grit];
    const cf = COOLANT_FACTOR[coolant];
    const hf = hardnessRemovalFactor(hrc);
    const mrrPerPass = k * P_MPa * Vr * cf * hf;

    // ── 4. Stock removal & passes ──
    const stockNeeded = stockTarget ?? Math.max(5, (currentRa - targetRa) * 5);
    const passes = mrrPerPass > 0 ? Math.ceil(stockNeeded / mrrPerPass) : 999;

    // ── 5. Surface finish progression ──
    // Ra(n) = Ra_min + (Ra_0 - Ra_min) × exp(-n / N_char)
    const Ra_asymptote = GRIT_RA_RANGE[grit].min;
    const N_char = Math.max(passes * 0.4, 1);
    const predictedRa = Math.max(
      Ra_asymptote,
      Ra_asymptote + (currentRa - Ra_asymptote) * Math.exp(-passes / N_char)
    );

    // ── 6. Cycle time ──
    const timePerPass = spm > 0 ? 1 / spm : 1;
    const cycleTime = passes * timePerPass;

    // ── 7. Bore diameter growth ──
    const totalGrowth = mrrPerPass * passes;

    // ── 8. Stone life estimation ──
    const stoneWearF = hardnessStoneWear(hrc);
    const baseLife = grit === "coarse" ? 500 : grit === "medium" ? 800
      : grit === "fine" ? 1200 : 2000;
    const stoneLife = Math.round(baseLife / stoneWearF);

    // ── 9. Safety ──
    const isSafe = predictedRa <= targetRa * 1.5 && totalGrowth < D * 10;

    // ── 10. Recommendations ──
    /** If.
     * @param predictedRa - predicted ra
     * @returns void
     */
    if (predictedRa > targetRa) {
      recs.push(
        `Target Ra ${targetRa}µm may not be achieved with ${grit} stones — `
        + `predicted ${predictedRa.toFixed(3)}µm. Consider finer grit or more passes`
      );
    }
    /** If.
     * @param targetRa - target ra
     * @returns void
     */
    if (targetRa < GRIT_RA_RANGE[grit].min) {
      recs.push(
        `Target Ra ${targetRa}µm below ${grit} stone capability `
        + `(min ${GRIT_RA_RANGE[grit].min}µm). Use ${autoSelectGrit(targetRa)} stones`
      );
    }
    /** If.
     * @param actualXH - actual x h
     * @returns void
     */
    if (actualXH < 20 || actualXH > 70) {
      recs.push(
        `Crosshatch angle ${actualXH.toFixed(1)}° outside optimal range (30-60°). `
        + `Adjust RPM/stroke rate ratio`
      );
    }
    /** If.
     * @param L - l
     * @returns void
     */
    if (L / D > 8) {
      recs.push(
        `High L/D ratio (${(L / D).toFixed(1)}) — risk of taper. `
        + `Use shorter stroke with overlap or segmented honing`
      );
    }
    /** If.
     * @param pressure - pressure
     * @returns void
     */
    if (pressure > 20) {
      recs.push(
        `Honing pressure ${pressure} bar is aggressive — `
        + `risk of stone breakage and bore distortion`
      );
    }
    /** If.
     * @param passes - passes
     * @returns void
     */
    if (passes > stoneLife * 0.8) {
      recs.push(
        `Estimated ${passes} passes approaches stone life (${stoneLife}). `
        + `Plan stone replacement during cycle`
      );
    }
    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(
        `Bore finishing parameters nominal — ${passes} passes, `
        + `predicted Ra ${predictedRa.toFixed(3)}µm, cycle ${cycleTime.toFixed(1)} min`
      );
    }

    return {
      estimated_passes: {
        value: passes,
        unit: "passes",
        uncertainty: Math.ceil(passes * 0.20),
        source: "preston_equation",
      },
      material_removal_rate_um_per_pass: {
        value: Math.round(mrrPerPass * 1000) / 1000,
        unit: "µm/pass",
        uncertainty: Math.round(mrrPerPass * 0.25 * 1000) / 1000,
        source: "preston_equation",
      },
      bore_diameter_growth_um: {
        value: Math.round(totalGrowth * 10) / 10,
        unit: "µm",
        uncertainty: Math.round(totalGrowth * 0.20 * 10) / 10,
        source: "preston_cumulative",
      },
      predicted_Ra_um: {
        value: Math.round(predictedRa * 1000) / 1000,
        unit: "µm",
        uncertainty: Math.round(predictedRa * 0.15 * 1000) / 1000,
        source: "exponential_finish_model",
        warning: predictedRa > targetRa ? "Target Ra may not be achieved" : undefined,
      },
      cycle_time_min: {
        value: Math.round(cycleTime * 10) / 10,
        unit: "min",
        uncertainty: Math.round(cycleTime * 0.15 * 10) / 10,
        source: "stroke_rate_model",
      },
      crosshatch_angle_deg: {
        value: Math.round(actualXH * 10) / 10,
        unit: "°",
        uncertainty: 2.0,
        source: "velocity_ratio",
      },
      stone_life_passes: {
        value: stoneLife,
        unit: "passes",
        uncertainty: Math.round(stoneLife * 0.30),
        source: "empirical_wear_model",
      },
      is_safe: isSafe,
      recommendations: recs,
    };
  }
}

/** Bore Finishing Engine constant.
 */
export const boreFinishingEngine = new BoreFinishingEngine();
