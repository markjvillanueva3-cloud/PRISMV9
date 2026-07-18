/**
 * Usui Tool Wear Model — Diffusion-Based Crater & Flank Wear
 *
 * Implements Usui's (1984) adhesive-diffusion wear model for predicting
 * tool wear rate as a function of interface temperature, contact stress,
 * and sliding velocity. Covers both flank wear (VB) and crater wear (KT).
 *
 * The Usui equation: dW/dt = A × σn × Vs × exp(-B/θ)
 * where A, B are empirical constants, σn is normal stress, Vs is sliding
 * velocity, and θ is interface temperature.
 *
 * Manufacturing uses: tool life prediction, insert selection, cutting condition
 * optimization, predictive maintenance scheduling.
 *
 * References:
 * - Usui, E. et al. (1984). "Analytical Prediction of Cutting Tool Wear"
 * - Takeyama, H. & Murata, R. (1963). "Basic Investigation of Tool Wear"
 * - Huang, Y. & Liang, S.Y. (2004). "Modeling of CBN Tool Wear in Finish Hard Turning"
 *
 * @module algorithms/UsuiWearModel
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

/** Usui Wear Model Input configuration/data structure.
 */
export interface UsuiWearModelInput {
  /** Normal contact stress [MPa]. */
  contact_stress: number;
  /** Sliding velocity at tool-chip interface [m/min]. */
  sliding_velocity: number;
  /** Interface temperature [°C]. */
  interface_temperature: number;
  /**
   * Usui constant A [mm^3/(N*m)]. Default 1e-5 (carbide on steel).
   * Basis: dVB/dt [mm/min] = A * sigma [N/mm^2] * Vs [m/min] * exp(-B/theta), so
   * A = mm/min / ((N/mm^2)(m/min)) = mm^3/(N*m). Row 18 fix: the integrator previously
   * fed Vs in mm/min (a stray *1000), which made the reference case (800 MPa, 150 m/min,
   * 600 C) wear at 121 mm/min -- a 12-METER flank land in 10 minutes (live-probed).
   * On the m/min basis the same A yields 0.121 mm/min -> VB 0.3 in ~2.3 min at those
   * aggressive conditions, the physically sane scale.
   */
  usui_A?: number;
  /** Usui constant B [K]. Default 2000 (carbide on steel). */
  usui_B?: number;
  /** Cutting time [min]. */
  cutting_time: number;
  /** Time step for integration [min]. Default cutting_time/100. */
  time_step?: number;
  /** Tool coating factor (reduces wear rate). Default 1 (uncoated). */
  coating_factor?: number;
  /** VB flank wear limit [mm]. Default 0.3. */
  vb_limit?: number;
  /** Wear mode. Default "flank". */
  wear_mode?: "flank" | "crater" | "both";
}

/** Wear Point configuration/data structure.
 */
export interface WearPoint {
  time: number;
  vb: number;
  wear_rate: number;
}

/** Usui Wear Model Output configuration/data structure.
 */
export interface UsuiWearModelOutput extends WithWarnings {
  /** Final flank wear VB [mm]. */
  final_vb: number;
  /** Final crater wear depth KT [mm]. */
  final_kt: number;
  /** Instantaneous wear rate at end [mm/min]. */
  wear_rate: number;
  /** Estimated tool life (time to reach VB limit) [min]. */
  estimated_tool_life: number;
  /** Wear progression over time. */
  wear_history: WearPoint[];
  /** Whether tool is within wear limit. */
  within_limit: boolean;
  /** Remaining useful life percentage. */
  remaining_life_pct: number;
  /** Wear regime classification. */
  wear_regime: "break-in" | "steady-state" | "accelerated";
  calculation_method: string;
}

/** Usui Wear Model engine/manager.
 */
export class UsuiWearModel implements Algorithm<UsuiWearModelInput, UsuiWearModelOutput> {

  /** Validate.
   * @param input - input data
   * @returns validation result
   */
  validate(input: UsuiWearModelInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    /** If.
     * @param !input.contact_stress - !input.contact_stress
     * @returns void
     */
    if (!input.contact_stress || input.contact_stress <= 0) {
      issues.push({ field: "contact_stress", message: "Must be > 0", severity: "error" });
    }
    /** If.
     * @param !input.sliding_velocity - !input.sliding_velocity
     * @returns void
     */
    if (!input.sliding_velocity || input.sliding_velocity <= 0) {
      issues.push({ field: "sliding_velocity", message: "Must be > 0", severity: "error" });
    }
    /** If.
     * @param !input.interface_temperature - !input.interface_temperature
     * @returns void
     */
    if (!input.interface_temperature || input.interface_temperature <= 0) {
      issues.push({ field: "interface_temperature", message: "Must be > 0 °C", severity: "error" });
    }
    /** If.
     * @param !input.cutting_time - !input.cutting_time
     * @returns void
     */
    if (!input.cutting_time || input.cutting_time <= 0) {
      issues.push({ field: "cutting_time", message: "Must be > 0", severity: "error" });
    }
    /** If.
     * @param input.interface_temperature - input.interface_temperature
     * @returns void
     */
    if (input.interface_temperature > 1200) {
      issues.push({ field: "interface_temperature", message: "Temperature exceeds typical machining range", severity: "warning" });
    }
    /** If.
     * @param input.contact_stress - input.contact_stress
     * @returns void
     */
    if (input.contact_stress > 5000) {
      issues.push({ field: "contact_stress", message: "Very high contact stress — verify input", severity: "warning" });
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  /** Calculate.
   * @param input - input data
   * @returns usui wear model output
   */
  calculate(input: UsuiWearModelInput): UsuiWearModelOutput {
    const warnings: string[] = [];
    const sigma = input.contact_stress; // MPa
    // Sliding velocity stays in m/min: A [mm^3/(N*m)] is calibrated on the m/min basis
    // (see the usui_A JSDoc). The previous *1000 (mm/min) inflated every wear rate 1000x
    // (live probe: final_vb 12,079 mm in 10 min at the suite's own reference inputs).
    const VsMPerMin = input.sliding_velocity;
    const theta = input.interface_temperature + 273.15; // °C → K
    const A = (input.usui_A ?? 1e-5) * (input.coating_factor ?? 1);
    const B = input.usui_B ?? 2000;
    const tTotal = input.cutting_time;
    const dt = input.time_step ?? tTotal / 100;
    const vbLimit = input.vb_limit ?? 0.3;
    const mode = input.wear_mode ?? "flank";

    // Time integration of Usui equation
    // dVB/dt = A × σn × Vs × exp(-B/θ)
    // For flank wear: VB accumulates
    // For crater: KT = 0.5 × VB (approximate ratio)
    const nSteps = Math.ceil(tTotal / dt);
    const actualDt = tTotal / nSteps;

    let vb = 0;
    const wearHistory: WearPoint[] = [];
    let toolLife = tTotal;
    let reachedLimit = false;

    /** For.
     * @param let - let
     * @returns void
     */
    for (let i = 0; i <= nSteps; i++) {
      const t = i * actualDt;

      // Temperature may increase with wear (positive feedback)
      // Approximate: θ increases 5% per 0.1mm VB
      const thetaEffective = theta * (1 + 0.5 * vb);

      // Usui wear rate [mm/min]: A [mm^3/(N*m)] * sigma [N/mm^2] * Vs [m/min] * Arrhenius
      const wearRate = A * sigma * VsMPerMin * Math.exp(-B / thetaEffective);

      wearHistory.push({ time: t, vb, wear_rate: wearRate });

      /** If.
       * @param vb - vb
       * @returns void
       */
      if (vb >= vbLimit && !reachedLimit) {
        toolLife = t;
        reachedLimit = true;
      }

      /** If.
       * @param i - index position
       * @returns void
       */
      if (i < nSteps) {
        // Break-in factor: higher wear rate in first 10% of life
        const breakInFactor = t < tTotal * 0.05 ? 1.5 : 1.0;
        vb += wearRate * breakInFactor * actualDt;
      }
    }

    // If tool life not reached within cutting time, extrapolate
    /** If.
     * @param !reachedLimit - !reached limit
     * @returns void
     */
    if (!reachedLimit) {
      const avgRate = vb / tTotal;
      /** If.
       * @param avgRate - avg rate
       * @returns void
       */
      if (avgRate > 0) {
        toolLife = vbLimit / avgRate;
      } else {
        toolLife = Infinity;
      }
    }

    // Crater wear (empirical ratio)
    const kt = (mode === "crater" || mode === "both") ? vb * 0.4 : 0;

    // Classify wear regime
    const lastRate = wearHistory.length > 1 ? wearHistory[wearHistory.length - 1].wear_rate : 0;
    const midRate = wearHistory.length > 10 ? wearHistory[Math.floor(wearHistory.length / 2)].wear_rate : lastRate;
    let regime: "break-in" | "steady-state" | "accelerated";
    if (vb < 0.05) regime = "break-in";
    else if (lastRate > midRate * 1.5) regime = "accelerated";
    else regime = "steady-state";

    const withinLimit = vb < vbLimit;
    const remainingPct = withinLimit ? Math.max(0, (1 - vb / vbLimit) * 100) : 0;

    /** If.
     * @param !withinLimit - !within limit
     * @returns void
     */
    if (!withinLimit) {
      warnings.push(`Tool wear VB=${vb.toFixed(3)}mm exceeds limit ${vbLimit}mm`);
    }
    /** If.
     * @param regime - regime
     * @returns void
     */
    if (regime === "accelerated") {
      warnings.push("Accelerated wear regime detected — tool replacement recommended");
    }

    return {
      final_vb: vb,
      final_kt: kt,
      wear_rate: lastRate,
      estimated_tool_life: toolLife,
      wear_history: wearHistory,
      within_limit: withinLimit,
      remaining_life_pct: remainingPct,
      wear_regime: regime,
      warnings,
      calculation_method: `Usui diffusion wear (A=${A.toExponential(2)}, B=${B}K, t=${tTotal}min, dt=${actualDt.toFixed(3)}min)`,
    };
  }

  /** Gets metadata.
   * @returns algorithm meta
   */
  getMetadata(): AlgorithmMeta {
    return {
      id: "usui-wear-model",
      name: "Usui Tool Wear Model",
      description: "Adhesive-diffusion tool wear prediction with time integration",
      formula: "dVB/dt = A × σn × Vs × exp(-B/θ)",
      reference: "Usui et al. (1984); Takeyama & Murata (1963)",
      safety_class: "critical",
      domain: "wear",
      inputs: { contact_stress: "Normal stress [MPa]", sliding_velocity: "Interface velocity [m/min]", interface_temperature: "Temperature [°C]" },
      outputs: { final_vb: "Flank wear [mm]", estimated_tool_life: "Time to VB limit [min]", wear_regime: "Break-in/steady/accelerated" },
    };
  }
}
