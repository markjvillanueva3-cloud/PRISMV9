/**
 * Chip Type Prediction Model (Ernst-Merchant classification)
 *
 * Rule-based chip-formation classifier covering 5 chip morphologies:
 *   continuous, lamellar, segmented, discontinuous, built_up_edge
 *
 * Decision precedence (deterministic):
 *   1. mat.chip_type === "discontinuous"           → discontinuous (overrides all)
 *   2. hardness > 350 HB OR iso_group === "S"      → segmented
 *   3. built_up_edge_risk !== "none" AND Vc<thresh → built_up_edge
 *   4. Vc > 150 AND hardness > 250                 → lamellar
 *   5. mat.chip_type === "continuous"              → continuous (+ wrap note if N + Vc>100)
 *   6. fallback                                    → mat.chip_type as ChipType
 *
 * BUE speed thresholds per ISO/material (m/min — below which BUE risk fires):
 *   aluminum=200, brass=150, copper=120, steel=50, alloy_steel=40,
 *   stainless_steel=30, cast_iron=999 (no BUE), titanium=25, inconel=15,
 *   hardened_steel=10
 *
 * SAFETY-CRITICAL: Chip type drives chip-evacuation strategy (chipbreaker
 * selection, coolant flow rate, hose direction). Wrong classification →
 * spindle wrap or built-up-edge spalling → tool fracture.
 *
 * References:
 * - Recht, R.F. (1964). "Catastrophic Thermoplastic Shear", J. Appl. Mech.
 * - Komanduri, R. (1982). "Some Clarifications on the Mechanics of Chip
 *   Formation when Machining Titanium Alloys", Wear 76
 * - Ernst, H. & Merchant, M.E. (1941). "Chip Formation, Friction and Finish"
 *
 * @module algorithms/ChipTypePredictionModel
 */

/** Allowed chip morphology classifications. */
export type ChipTypeCompat =
  | "continuous"
  | "lamellar"
  | "segmented"
  | "discontinuous"
  | "built_up_edge";

/** Structural subset of MaterialProfile needed by chip-type prediction. */
export interface ChipTypeMaterialInputCompat {
  aliases: string[];
  iso_group: string;
  chip_type: string;
  built_up_edge_risk: string;
}

/** Result of ChipTypePredictionModel.predictCompat. */
export interface ChipTypeCompatResult {
  type: ChipTypeCompat;
  confidence: number;
  risk_notes: string[];
}

/**
 * Chip type prediction (Ernst-Merchant classification).
 *
 * Composed by UltimateSpeedFeedEngine.predictChipType() (SF-PSN-WIRE-MS0
 * U-SFPSN-02C-D, 2026-05-23 juliett) — bit-equivalent verbatim relocation
 * of the inline engine function, suitable for shim delegation.
 */
export class ChipTypePredictionModel {
  /** BUE-risk threshold speeds [m/min] keyed by material/ISO group. */
  static readonly BUE_SPEED_THRESHOLDS_COMPAT: Record<string, number> = {
    aluminum: 200, brass: 150, copper: 120,
    steel: 50, alloy_steel: 40, stainless_steel: 30,
    cast_iron: 999, // no BUE (discontinuous chips)
    titanium: 25, inconel: 15, hardened_steel: 10,
  };

  /**
   * Static-shim chip type prediction (bit-equivalent compat with
   * UltimateSpeedFeedEngine inline predictChipType line 1152).
   *
   * @param Vc_mpm Cutting speed [m/min]
   * @param hardness_hb Material Brinell hardness [HB]
   * @param mat Material profile structural subset (aliases + iso_group + chip_type + built_up_edge_risk)
   * @returns { type: ChipType, confidence: 0..1, risk_notes: string[] }
   */
  static predictCompat(
    Vc_mpm: number,
    hardness_hb: number,
    mat: ChipTypeMaterialInputCompat,
  ): ChipTypeCompatResult {
    const notes: string[] = [];
    const bueThreshold = ChipTypePredictionModel.BUE_SPEED_THRESHOLDS_COMPAT[
      Object.keys(ChipTypePredictionModel.BUE_SPEED_THRESHOLDS_COMPAT).find(k =>
        mat.aliases.some(a => a.includes(k)) || k === mat.iso_group
      ) || "steel"
    ] || 50;

    // Discontinuous for brittle materials (check first — overrides all)
    if (mat.chip_type === "discontinuous") {
      return { type: "discontinuous", confidence: 0.85, risk_notes: notes };
    }
    // Segmented at high hardness or superalloys (check before BUE)
    if (hardness_hb > 350 || mat.iso_group === "S") {
      notes.push("Segmented chips — intermittent cutting forces, potential tool fracture");
      return { type: "segmented", confidence: 0.70, risk_notes: notes };
    }
    // BUE at low speeds for ductile materials
    if (mat.built_up_edge_risk !== "none" && Vc_mpm < bueThreshold) {
      notes.push(`BUE risk below ${bueThreshold} m/min — increase speed or use DLC/polished coating`);
      return { type: "built_up_edge", confidence: 0.75, risk_notes: notes };
    }
    // Lamellar at medium-high speeds for medium hardness
    if (Vc_mpm > 150 && hardness_hb > 250) {
      return { type: "lamellar", confidence: 0.60, risk_notes: notes };
    }
    // Continuous for ductile materials at normal speeds
    if (mat.chip_type === "continuous") {
      if (Vc_mpm > 100 && mat.iso_group === "N") {
        notes.push("Long continuous chips — spindle wrapping risk, use chipbreaker");
      }
      return { type: "continuous", confidence: 0.80, risk_notes: notes };
    }
    return { type: mat.chip_type as ChipTypeCompat, confidence: 0.60, risk_notes: notes };
  }
}
