/**
 * ToolWearProgressionEngine — Step-by-step flank wear (VB) simulation
 *
 * Models: Taylor extended, Usui adhesive wear
 * Formulas: F-WEAR-001 (Arrhenius), F-WEAR-003 (Usui), F-WEAR-005 (cumulative)
 * Safety: Integrates with ToolBreakageEngine for combined assessment
 *
 * NOTE: Only the Usui adhesive wear model is implemented. The Archard abrasive
 * model (F-WEAR-004) is defined in the formula registry but is NOT computed by
 * this engine. Do not rely on Archard outputs from this engine.
 *
 * References:
 *   [1] Usui, E., Shirakashi, T. & Kitagawa, T. (1978). "Analytical Prediction
 *       of Three Dimensional Cutting Process — Part 3: Cutting Temperature and
 *       Crater Wear of Carbide Tool". J. Eng. Ind., 100(2), 236-243.
 *       doi:10.1115/1.3439415
 *   [2] Taylor, F.W. (1907). "On the Art of Cutting Metals". Trans. ASME, 28,
 *       31-350. (Foundational Taylor tool life equation: VT^n = C)
 *   [3] ISO 3685:1993. "Tool-life testing with single-point turning tools".
 *       (Defines VB = 0.3 mm criterion and standard test methodology)
 */

// ─── Types ─────────────────────────────────────────────────────────

export type ToolGrade = "HSS" | "COBALT_HSS" | "CARBIDE" | "CARBIDE_COATED" | "CERMET" | "CERAMIC" | "CBN" | "PCD";
/** Wear Stage type definition.
 */
export type WearStage = "initial" | "steady" | "accelerated" | "critical";

/** Wear Progression Input configuration/data structure.
 */
export interface WearProgressionInput {
  cutting_speed_m_min: number;
  feed_mm_rev: number;
  depth_of_cut_mm: number;
  tool_grade: ToolGrade;
  workpiece_hardness_hrc: number;
  cutting_time_min?: number;          // elapsed time (default 0)
  current_vb_mm?: number;             // current flank wear (default 0)
  vb_limit_mm?: number;               // wear criterion (default 0.3)
  cutting_temperature_C?: number;     // estimated if not provided
  taylor_C?: number;                  // Taylor constant C
  taylor_n?: number;                  // Taylor exponent n
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

/** Wear Progression Result configuration/data structure.
 */
export interface WearProgressionResult {
  current_vb_mm: AtomicValue;
  wear_rate_um_per_min: AtomicValue;
  remaining_life_min: AtomicValue;
  taylor_life_min: AtomicValue;
  total_tool_life_min: AtomicValue;
  optimal_change_min: AtomicValue;
  wear_stage: WearStage;
  wear_ratio: number;                 // VB / VB_limit (0-1+)
  is_safe: boolean;
  recommendations: string[];
}

// ─── Constants ─────────────────────────────────────────────────────

/** Default Taylor constants by tool grade (C at V=1 m/min, exponent n) */
const TAYLOR_DEFAULTS: Record<ToolGrade, { C: number; n: number }> = {
  HSS:             { C: 120,  n: 0.125 },
  COBALT_HSS:      { C: 180,  n: 0.15  },
  CARBIDE:         { C: 400,  n: 0.25  },
  CARBIDE_COATED:  { C: 550,  n: 0.28  },
  CERMET:          { C: 450,  n: 0.27  },
  CERAMIC:         { C: 800,  n: 0.30  },
  CBN:             { C: 1200, n: 0.35  },
  PCD:             { C: 1500, n: 0.40  },
};

/** Usui model coefficients by tool grade: A (wear coefficient), B (thermal activation, K) */
const USUI_COEFFICIENTS: Record<ToolGrade, { A: number; B: number }> = {
  HSS:             { A: 1.5e-5,  B: 5000  },
  COBALT_HSS:      { A: 1.2e-5,  B: 5500  },
  CARBIDE:         { A: 3.0e-6,  B: 8000  },
  CARBIDE_COATED:  { A: 2.0e-6,  B: 9000  },
  CERMET:          { A: 2.5e-6,  B: 8500  },
  CERAMIC:         { A: 1.5e-6,  B: 10000 },
  CBN:             { A: 5.0e-7,  B: 12000 },
  PCD:             { A: 3.0e-7,  B: 14000 },
};

/** Hardness correction factor for wear rate */
const hardnessWearFactor = (hrc: number): number => {
  if (hrc <= 20) return 0.7;
  if (hrc <= 35) return 1.0;
  if (hrc <= 45) return 1.4;
  if (hrc <= 55) return 2.0;
  return 3.0;  // >55 HRC (hardened steel)
};

/** Estimate cutting temperature when not provided (°C) — empirical correlation */
const estimateTemperature = (vc: number, f: number, hrc: number): number => {
  // Empirical: T ≈ 200 + 3.5×Vc + 800×f + 2×HRC
  return Math.min(1200, 200 + 3.5 * vc + 800 * f + 2 * hrc);
};

// ─── Engine ────────────────────────────────────────────────────────

/** Tool Wear Progression Engine engine/manager.
 */
export class ToolWearProgressionEngine {
  /**
   * Compute wear progression state and remaining useful life.
   * Uses Taylor for baseline life, Usui for physics-based wear rate,
   * and three-stage wear curve (initial → steady → accelerated).
   */
  calculate(input: WearProgressionInput): WearProgressionResult {
    const {
      cutting_speed_m_min: vc,
      feed_mm_rev: f,
      depth_of_cut_mm: ap,
      tool_grade,
      workpiece_hardness_hrc: hrc,
      cutting_time_min: t = 0,
      current_vb_mm: vb = 0,
      vb_limit_mm: vbLimit = 0.3,
    } = input;

    const recs: string[] = [];

    // ── 1. Taylor tool life ──
    const taylor = {
      C: input.taylor_C ?? TAYLOR_DEFAULTS[tool_grade].C,
      n: input.taylor_n ?? TAYLOR_DEFAULTS[tool_grade].n,
    };
    // Extended Taylor: V×T^n×f^a×d^b = C  →  T = (C/(V×f^a×d^b))^(1/n)
    const taylorDenom = vc * Math.pow(Math.max(f, 0.01), 0.5) * Math.pow(Math.max(ap, 0.1), 0.15);
    const taylorLife = taylorDenom > 0
      ? Math.pow(taylor.C / taylorDenom, 1 / taylor.n)
      : Infinity;

    // ── 2. Cutting temperature ──
    const theta = input.cutting_temperature_C ?? estimateTemperature(vc, f, hrc);
    const thetaK = theta + 273.15;  // Convert to Kelvin

    // ── 3. Usui wear rate: dVB/dt = A × σ_n × v_s × exp(-B/θ) ──
    // σ_n approximated from feed force: σ_n ≈ 500 × f^0.4 × hrc^0.3 (MPa)
    const sigma_n = 500 * Math.pow(Math.max(f, 0.01), 0.4) * Math.pow(Math.max(hrc, 10), 0.3);
    const vs = vc / 60;  // m/s sliding velocity
    const usui = USUI_COEFFICIENTS[tool_grade];
    const baseWearRate = usui.A * sigma_n * vs * Math.exp(-usui.B / Math.max(thetaK, 300));

    // ── 4. Three-stage wear curve modifier ──
    const wearRatio = vbLimit > 0 ? vb / vbLimit : 0;
    let stageMultiplier: number;
    let stage: WearStage;

    /** If.
     * @param wearRatio - wear ratio
     * @returns void
     */
    if (wearRatio < 0.15) {
      // Initial rapid wear (break-in): 2x rate, decreasing
      stageMultiplier = 2.0 - (wearRatio / 0.15);
      stage = "initial";
    } else if (wearRatio < 0.70) {
      // Steady-state wear: 1x rate
      stageMultiplier = 1.0;
      stage = "steady";
    } else if (wearRatio < 1.0) {
      // Accelerated wear: exponentially increasing
      stageMultiplier = 1.0 + 3.0 * Math.pow((wearRatio - 0.70) / 0.30, 2);
      stage = "accelerated";
    } else {
      // Beyond limit — critical
      stageMultiplier = 5.0;
      stage = "critical";
    }

    // ── 5. Hardness correction ──
    const hrcFactor = hardnessWearFactor(hrc);

    // ── 6. Final wear rate (µm/min) ──
    const wearRate_mm_min = baseWearRate * stageMultiplier * hrcFactor;
    const wearRate_um_min = wearRate_mm_min * 1000;

    // ── 7. Remaining life estimate ──
    const remainingWear = Math.max(0, vbLimit - vb);
    const remainingLife = wearRate_mm_min > 1e-12
      ? remainingWear / wearRate_mm_min
      : Infinity;

    // ── 8. Optimal tool change point (80% of remaining life for safety margin) ──
    const totalLife = t + remainingLife;
    const optimalChange = t + remainingLife * 0.80;

    // ── 9. Uncertainty estimation ──
    const taylorUncertainty = taylorLife * 0.15;  // ±15% typical for Taylor
    const wearRateUncertainty = wearRate_um_min * 0.20;  // ±20% for Usui
    const lifeUncertainty = remainingLife === Infinity ? 0 : remainingLife * 0.25;

    // ── 10. Safety assessment ──
    const isSafe = stage !== "critical" && wearRatio < 1.0;

    // ── 11. Recommendations ──
    /** If.
     * @param stage - stage
     * @returns void
     */
    if (stage === "critical") {
      recs.push(`SAFETY: Tool wear VB=${(vb * 1000).toFixed(0)}µm exceeds limit ${(vbLimit * 1000).toFixed(0)}µm — immediate tool change required`);
    } else if (stage === "accelerated") {
      recs.push(`WARNING: Tool in accelerated wear phase (VB=${(vb * 1000).toFixed(0)}µm, ${(wearRatio * 100).toFixed(0)}% of limit) — schedule tool change within ${Math.round(remainingLife)} min`);
    }

    /** If.
     * @param vc - vc
     * @returns void
     */
    if (vc > taylor.C * 0.8) {
      recs.push(`Cutting speed ${vc} m/min is near Taylor limit — consider reducing to ${Math.round(taylor.C * 0.6)} m/min for longer tool life`);
    }

    if (theta > 800 && (tool_grade === "HSS" || tool_grade === "COBALT_HSS")) {
      recs.push(`SAFETY: Estimated cutting temperature ${Math.round(theta)}°C exceeds HSS softening point — use carbide or ceramic tooling`);
    }

    /** If.
     * @param taylorLife - taylor life
     * @returns void
     */
    if (taylorLife < 5) {
      recs.push(`Taylor life estimate is only ${taylorLife.toFixed(1)} min — very aggressive parameters`);
    }

    /** If.
     * @param recs.length - recs.length
     * @returns void
     */
    if (recs.length === 0) {
      recs.push(`Tool wear nominal (${stage} phase, ${(wearRatio * 100).toFixed(0)}% of limit) — estimated ${Math.round(remainingLife)} min remaining`);
    }

    return {
      current_vb_mm: {
        value: Math.round(vb * 1000) / 1000,
        unit: "mm",
        uncertainty: 0.005,
        source: "measured_or_input",
      },
      wear_rate_um_per_min: {
        value: Math.round(wearRate_um_min * 100) / 100,
        unit: "µm/min",
        uncertainty: Math.round(wearRateUncertainty * 100) / 100,
        source: "usui_model",
      },
      remaining_life_min: {
        value: remainingLife === Infinity ? 99999 : Math.round(remainingLife * 10) / 10,
        unit: "min",
        uncertainty: lifeUncertainty === Infinity ? 0 : Math.round(lifeUncertainty * 10) / 10,
        source: "usui_progression",
        warning: remainingLife < 5 ? "Less than 5 minutes remaining" : undefined,
      },
      taylor_life_min: {
        value: taylorLife === Infinity ? 99999 : Math.round(taylorLife * 10) / 10,
        unit: "min",
        uncertainty: Math.round(taylorUncertainty * 10) / 10,
        source: "taylor_extended",
      },
      total_tool_life_min: {
        value: totalLife === Infinity ? 99999 : Math.round(totalLife * 10) / 10,
        unit: "min",
        uncertainty: lifeUncertainty === Infinity ? 0 : Math.round(lifeUncertainty * 10) / 10,
        source: "usui_progression",
      },
      optimal_change_min: {
        value: optimalChange === Infinity ? 99999 : Math.round(optimalChange * 10) / 10,
        unit: "min",
        uncertainty: lifeUncertainty === Infinity ? 0 : Math.round(lifeUncertainty * 0.8 * 10) / 10,
        source: "80pct_remaining_life",
      },
      wear_stage: stage,
      wear_ratio: Math.round(wearRatio * 1000) / 1000,
      is_safe: isSafe,
      recommendations: recs,
    };
  }

  /** Convenience: predict VB at a future time given current state */
  predictAt(input: WearProgressionInput, futureTime_min: number): WearProgressionResult {
    const result = this.calculate(input);
    const projectedVb = (input.current_vb_mm ?? 0) + (result.wear_rate_um_per_min.value / 1000) * futureTime_min;
    return this.calculate({
      ...input,
      cutting_time_min: (input.cutting_time_min ?? 0) + futureTime_min,
      current_vb_mm: projectedVb,
    });
  }
}

/** Tool Wear Progression Engine constant.
 */
export const toolWearProgressionEngine = new ToolWearProgressionEngine();
