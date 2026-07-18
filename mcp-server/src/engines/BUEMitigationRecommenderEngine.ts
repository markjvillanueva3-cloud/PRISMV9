/**
 * BUEMitigationRecommenderEngine -- ranks built-up-edge (BUE) MITIGATION levers.
 *
 * UNIT-0011 (BUE Mitigation, half 1). BUE ONSET prediction already exists
 * (BUEOnsetThresholdEngine.evaluate, wired prism_ml bue_onset_check); what was missing (verified:
 * grep found onset/risk/gating but no mitigation composer) is a ranked, actionable mitigation list.
 * This composes the onset engine's OWN reviewed physics -- it re-evaluates at the recommended Vc and
 * at candidate rake increases to QUANTIFY each lever's risk-score reduction (no fabricated numbers) --
 * and lists coating/coolant as QUALITATIVE secondary levers (the band model does not quantify them,
 * so they carry no invented reduction). The breakage-root-cause half of UNIT-0011 (inverting
 * ToolBreakagePredictionEngine's damage models) is a separate PHYSICS-REVIEWER-GATED follow.
 *
 * PURE + NEVER-THROWS (matches BUEOnsetThresholdEngine): deterministic; invalid state -> warnings.
 * Sources: inherited from BUEOnsetThresholdEngine (Trent & Wright 2000; Sandvik Technical Guide 2023).
 */

import { BUEOnsetThresholdEngine, BUEOnsetInputSchema, type BUEOnsetInput } from "./BUEOnsetThresholdEngine.js";

// --- Types ------------------------------------------------------------------

export interface BUEMitigationInput {
  cutting_speed_m_per_min: number;
  iso_group: BUEOnsetInput["iso_group"];
  tool_material: BUEOnsetInput["tool_material"];
  rake_angle_deg?: number;
  /** Rake increases (deg) to evaluate as a lever; default [5, 10]. */
  candidate_rake_increases_deg?: number[];
}

export interface MitigationLever {
  lever: string;
  /** True if the risk reduction was computed by the onset engine; false = qualitative pointer. */
  quantified: boolean;
  action: string;
  /** Risk score AFTER the lever (quantified levers only). */
  new_risk_score: number | null;
  /** current_risk_score - new_risk_score (quantified levers only). */
  risk_reduction: number | null;
  detail: string;
}

export interface BUEMitigationResult {
  current_risk_level: string;
  current_risk_score: number;
  in_risk_band: boolean;
  /** Best-first: quantified levers by risk reduction, then qualitative levers. */
  ranked_mitigations: MitigationLever[];
  warnings: string[];
  source: string;
}

const DEFAULT_RAKE_INCREASES = [5, 10];
const MAX_RAKE_DEG = 30; // the onset engine clamps rake to [-30, 30]

// --- Engine -----------------------------------------------------------------

class BUEMitigationRecommenderEngineImpl {
  private readonly onset = new BUEOnsetThresholdEngine();

  /**
   * Rank BUE mitigation levers for a turning operation. Never throws.
   * Quantifies the raise-Vc + increase-rake levers by re-evaluating the onset engine; lists
   * coating/coolant as qualitative pointers (not fabricated).
   *
   * @param input current cutting state (Vc, iso_group, tool_material, rake).
   * @returns current risk + ranked mitigation levers (best-first).
   */
  recommend(input: BUEMitigationInput): BUEMitigationResult {
    const warnings: string[] = [];
    const rake0 = input.rake_angle_deg ?? 0;
    // Validate via the onset engine's own schema FIRST -- evaluate() dereferences the tool-affinity
    // map and is NOT robust to an unmapped tool_material / bad iso_group, so guard here to honor this
    // engine's never-throws contract.
    const parsed = BUEOnsetInputSchema.safeParse({
      cutting_speed_m_per_min: input.cutting_speed_m_per_min,
      iso_group: input.iso_group,
      tool_material: input.tool_material,
      rake_angle_deg: rake0,
    });
    if (!parsed.success) {
      return {
        current_risk_level: "none", current_risk_score: 0, in_risk_band: false, ranked_mitigations: [],
        warnings: [`Invalid BUE input: ${parsed.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`],
        source: SOURCE,
      };
    }
    const base = this.onset.evaluate(parsed.data);

    if (!base.in_risk_band) {
      return {
        current_risk_level: base.risk_level, current_risk_score: base.risk_score, in_risk_band: false,
        ranked_mitigations: [],
        warnings: [`Vc ${input.cutting_speed_m_per_min} m/min is outside the ${input.iso_group} BUE risk band -- no BUE mitigation needed at this operating point.`],
        source: SOURCE,
      };
    }

    const levers: MitigationLever[] = [];

    // Lever 1 -- raise Vc above the band (the primary, DEFINITIVE lever; verified by re-evaluation).
    if (base.recommended_min_vc_m_per_min != null && base.recommended_min_vc_m_per_min > input.cutting_speed_m_per_min) {
      const atSafe = this.onset.evaluate({
        cutting_speed_m_per_min: base.recommended_min_vc_m_per_min,
        iso_group: input.iso_group, tool_material: input.tool_material, rake_angle_deg: rake0,
      });
      levers.push({
        lever: "raise_cutting_speed", quantified: true,
        action: `Raise Vc from ${Math.round(input.cutting_speed_m_per_min)} to >= ${Math.round(base.recommended_min_vc_m_per_min)} m/min`,
        new_risk_score: atSafe.risk_score,
        risk_reduction: +(base.risk_score - atSafe.risk_score).toFixed(4),
        detail: `Exits the material BUE band [${Math.round(base.risk_band_m_per_min[0])}-${Math.round(base.risk_band_m_per_min[1])} m/min] -- the primary lever; verified by re-evaluation at the recommended Vc.`,
      });
    }

    // Lever 2 -- increase (more positive) rake; quantified by re-evaluating the onset engine.
    for (const d of input.candidate_rake_increases_deg ?? DEFAULT_RAKE_INCREASES) {
      if (!(d > 0)) { warnings.push(`rake increase ${d} deg must be > 0 -- skipped.`); continue; }
      const newRake = rake0 + d;
      if (newRake > MAX_RAKE_DEG) { warnings.push(`rake ${newRake} deg exceeds the ${MAX_RAKE_DEG} deg model limit -- skipped.`); continue; }
      const atRake = this.onset.evaluate({
        cutting_speed_m_per_min: input.cutting_speed_m_per_min,
        iso_group: input.iso_group, tool_material: input.tool_material, rake_angle_deg: newRake,
      });
      levers.push({
        lever: `increase_rake_+${d}deg`, quantified: true,
        action: `Increase effective rake by ${d} deg (${rake0} -> ${newRake} deg)`,
        new_risk_score: atRake.risk_score,
        risk_reduction: +(base.risk_score - atRake.risk_score).toFixed(4),
        detail: `Positive rake lowers shear-zone temperature, reducing BUE tendency (onset-engine rake model).`,
      });
    }

    // Qualitative levers (NOT quantified by the BUE band model -- pointers, no invented number).
    levers.push({
      lever: "coating_change", quantified: false, action: "Switch to a lower-adhesion coating (TiAlN/AlTiN; polished or uncoated micro-grain for aluminum)", new_risk_score: null, risk_reduction: null,
      detail: "BUE is adhesion-driven; a low-workpiece-affinity coating reduces pickup. Use CoatingSelectionEngine for the grade. Qualitative -- not quantified by the band model.",
    });
    levers.push({
      lever: "coolant_upgrade", quantified: false, action: "Flood or high-pressure through-tool coolant", new_risk_score: null, risk_reduction: null,
      detail: "Flushes + cools the cutting zone, suppressing the weld that forms the BUE. See CAMCoolantStrategyEngine. Qualitative.",
    });

    // Rank: quantified levers by risk reduction (desc), qualitative levers last.
    levers.sort((a, b) => (b.risk_reduction ?? -1) - (a.risk_reduction ?? -1));

    return {
      current_risk_level: base.risk_level, current_risk_score: base.risk_score, in_risk_band: true,
      ranked_mitigations: levers, warnings, source: SOURCE,
    };
  }
}

const SOURCE = "BUEMitigationRecommenderEngine (composes BUEOnsetThresholdEngine.evaluate to quantify the raise-Vc + rake levers; coating/coolant are qualitative pointers, not fabricated; Trent & Wright 2000 / Sandvik 2023). breakage_root_cause is a physics-reviewer-gated follow.";

/** Singleton export per PRISM engine convention. */
export const bueMitigationRecommenderEngine = new BUEMitigationRecommenderEngineImpl();
