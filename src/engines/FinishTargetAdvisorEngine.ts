/**
 * FinishTargetAdvisorEngine — PCCA-MS4 U04
 *
 * Advises on achievable surface finish targets based on operation type,
 * tool geometry, cutting parameters, material, and coolant strategy.
 * Provides thermal/coolant compensation recommendations.
 *
 * Key formulas:
 *   - Ideal Ra (turning): Ra = f² / (32 × r)  — Boothroyd & Knight
 *   - Ideal Ra (milling): Ra = f² / (32 × R)  where R = cutter radius
 *   - BUE correction: Ra_actual = Ra_ideal × BUE_factor
 *   - Thermal correction: Ra_actual = Ra_ideal × (1 + α × ΔT / T_ref)
 *
 * References:
 *   - Boothroyd & Knight, "Fundamentals of Machining and Machine Tools"
 *   - Sandvik Coromant "Surface Finish Guide" (2023)
 *   - ISO 4287 (surface texture — profile method)
 *
 * @module engines/FinishTargetAdvisorEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type FinishOperation = "turning" | "milling" | "drilling" | "grinding" | "boring" | "reaming" | "honing" | "lapping";
export type CoolantStrategy = "flood" | "mist" | "mql" | "dry" | "cryogenic" | "high_pressure";

export interface FinishTargetInput {
  operation: FinishOperation;
  feed_mm_rev?: number;
  feed_per_tooth_mm?: number;
  tool_nose_radius_mm?: number;    // turning/boring
  cutter_diameter_mm?: number;     // milling
  material_iso_group?: string;
  material_hardness_hrc?: number;
  cutting_speed_m_min?: number;
  coolant?: CoolantStrategy;
  depth_of_cut_mm?: number;
  tool_wear_vb_mm?: number;        // flank wear land
  target_ra_um?: number;           // desired Ra — advisor checks if achievable
}

export interface FinishTargetResult {
  achievable_ra_um: number;
  achievable_rz_um: number;
  target_feasible: boolean;
  ra_breakdown: {
    ideal_ra_um: number;
    bue_factor: number;
    thermal_factor: number;
    wear_factor: number;
    vibration_factor: number;
  };
  recommendations: string[];
  coolant_advice: {
    current: CoolantStrategy;
    recommended: CoolantStrategy;
    ra_improvement_pct: number;
  };
  operation_alternatives: { operation: FinishOperation; expected_ra_um: number; note: string }[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Typical achievable Ra ranges by operation (µm). Source: Machinery's Handbook 31st ed. */
const OPERATION_RA_RANGE: Record<FinishOperation, { min: number; typical: number; max: number }> = {
  turning:  { min: 0.4, typical: 1.6, max: 6.3 },
  milling:  { min: 0.8, typical: 1.6, max: 6.3 },
  drilling: { min: 1.6, typical: 3.2, max: 12.5 },
  grinding: { min: 0.1, typical: 0.4, max: 1.6 },
  boring:   { min: 0.4, typical: 0.8, max: 3.2 },
  reaming:  { min: 0.4, typical: 0.8, max: 3.2 },
  honing:   { min: 0.05, typical: 0.2, max: 0.8 },
  lapping:  { min: 0.012, typical: 0.05, max: 0.4 },
};

/** BUE tendency by ISO group. >1.0 = worse finish. Source: Sandvik Coromant App Guide */
const BUE_FACTOR: Record<string, number> = {
  P: 1.0, M: 1.15, K: 0.9, N: 1.3, S: 1.1, H: 0.85,
};

/** Coolant Ra improvement factor (multiplier on achievable Ra, <1 = better). */
const COOLANT_FACTOR: Record<CoolantStrategy, number> = {
  dry: 1.2,
  mist: 1.05,
  flood: 1.0,
  mql: 0.95,
  high_pressure: 0.9,
  cryogenic: 0.85,
};

// ============================================================================
// ENGINE
// ============================================================================

export class FinishTargetAdvisorEngine {
  static advise(input: FinishTargetInput): FinishTargetResult {
    const op = input.operation;
    const range = OPERATION_RA_RANGE[op];
    const iso = input.material_iso_group ?? "P";
    const coolant = input.coolant ?? "flood";

    // 1. Ideal geometric Ra
    let idealRa: number;
    if ((op === "turning" || op === "boring") && input.feed_mm_rev && input.tool_nose_radius_mm) {
      // Boothroyd: Ra = f² / (32 × r)
      idealRa = (input.feed_mm_rev ** 2) / (32 * input.tool_nose_radius_mm) * 1000; // µm
    } else if (op === "milling" && input.feed_per_tooth_mm && input.cutter_diameter_mm) {
      const R = input.cutter_diameter_mm / 2;
      idealRa = (input.feed_per_tooth_mm ** 2) / (32 * R) * 1000;
    } else {
      idealRa = range.typical;
    }

    // 2. BUE correction
    const bueFactor = BUE_FACTOR[iso] ?? 1.0;

    // 3. Thermal correction — higher speed = more heat = potential BUE reduction
    const speed = input.cutting_speed_m_min ?? 150;
    const thermalFactor = speed < 50 ? 1.15 : speed > 300 ? 0.95 : 1.0;

    // 4. Wear correction — worn tool degrades finish
    const vb = input.tool_wear_vb_mm ?? 0;
    const wearFactor = 1 + (vb / 0.3) * 0.5; // 50% degradation at VB=0.3mm

    // 5. Vibration estimate — deeper cuts = more vibration
    const doc = input.depth_of_cut_mm ?? 1.0;
    const vibFactor = doc > 3 ? 1.15 : doc > 1.5 ? 1.05 : 1.0;

    // Combined actual Ra
    const actualRa = idealRa * bueFactor * thermalFactor * wearFactor * vibFactor * (COOLANT_FACTOR[coolant] ?? 1.0);
    const clampedRa = Math.max(range.min, Math.min(actualRa, range.max * 2));
    const rz = clampedRa * 4.5; // ISO 4287 approximate Rz/Ra ratio

    // Target feasibility
    const target = input.target_ra_um ?? clampedRa;
    const feasible = target >= range.min * 0.8;

    // Coolant recommendation
    const bestCoolant = (Object.entries(COOLANT_FACTOR) as [CoolantStrategy, number][])
      .sort((a, b) => a[1] - b[1])[0][0];
    const currentFactor = COOLANT_FACTOR[coolant] ?? 1.0;
    const bestFactor = COOLANT_FACTOR[bestCoolant];
    const raImprovement = Math.round((1 - bestFactor / currentFactor) * 100);

    // Recommendations
    const recs: string[] = [];
    if (clampedRa > target) {
      if (op === "turning" || op === "milling") recs.push("Reduce feed rate — Ra ∝ f²");
      if (input.tool_nose_radius_mm && input.tool_nose_radius_mm < 0.8) recs.push("Increase nose radius — Ra ∝ 1/r");
      if (vb > 0.15) recs.push(`Tool worn (VB=${vb}mm) — index or replace insert`);
      if (coolant === "dry" || coolant === "mist") recs.push("Switch to flood or MQL coolant for better finish");
    }
    if (bueFactor > 1.1) recs.push(`${iso}-group material prone to BUE — increase speed or use coated insert`);

    // Alternative operations that could achieve better finish
    const alternatives = (Object.entries(OPERATION_RA_RANGE) as [FinishOperation, typeof range][])
      .filter(([altOp]) => altOp !== op)
      .filter(([, r]) => r.typical < clampedRa)
      .map(([altOp, r]) => ({
        operation: altOp,
        expected_ra_um: r.typical,
        note: `${altOp}: typical Ra=${r.typical}µm (range ${r.min}–${r.max})`,
      }))
      .sort((a, b) => a.expected_ra_um - b.expected_ra_um)
      .slice(0, 3);

    return {
      achievable_ra_um: Math.round(clampedRa * 100) / 100,
      achievable_rz_um: Math.round(rz * 100) / 100,
      target_feasible: feasible,
      ra_breakdown: {
        ideal_ra_um: Math.round(idealRa * 100) / 100,
        bue_factor: bueFactor,
        thermal_factor: thermalFactor,
        wear_factor: Math.round(wearFactor * 100) / 100,
        vibration_factor: vibFactor,
      },
      recommendations: recs,
      coolant_advice: {
        current: coolant,
        recommended: bestCoolant,
        ra_improvement_pct: raImprovement,
      },
      operation_alternatives: alternatives,
    };
  }
}

export const finishTargetAdvisorEngine = new FinishTargetAdvisorEngine();
