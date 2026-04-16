/**
 * ISO14971RiskManagementEngine
 * ==============================
 *
 * Medical device risk management per ISO 14971:2019.
 *
 * Risk = Severity × Probability. Each hazard is scored, mapped to a
 * 5×5 risk matrix, mitigated, then re-scored for residual risk.
 *
 * Process (ISO 14971 §4):
 *   1. Risk analysis — identify hazards & hazardous situations
 *   2. Risk evaluation — estimate severity × probability
 *   3. Risk control — priority: design > protective > info-for-safety
 *   4. Residual risk evaluation — re-score after controls
 *   5. Benefit-risk analysis — when residual risk remains unacceptable
 *   6. Risk management file (RMF) — documentation of the whole loop
 *
 * Severity (S1..S5):
 *   S1 negligible — annoyance, temporary discomfort
 *   S2 minor     — reversible injury, no permanent impairment
 *   S3 serious   — injury requiring professional medical intervention
 *   S4 critical  — permanent impairment, life-threatening
 *   S5 catastrophic — death
 *
 * Probability (P1..P5):
 *   P1 improbable       ≤ 1e-6
 *   P2 remote           ~ 1e-5
 *   P3 occasional       ~ 1e-4 .. 1e-3
 *   P4 probable         ~ 1e-2
 *   P5 frequent         ≥ 1e-1
 *
 * Acceptance (typical MDR approach):
 *   Risk index = S*P (1..25)
 *     1-4   acceptable
 *     5-12  ALARP — reduce as low as reasonably practicable
 *     13-25 unacceptable
 *
 * Distinction from ARP4761 aerospace safety:
 *   - ISO 14971: medical devices, benefit-risk, no FAR-25-style DAL
 *   - ARP4761: aerospace FHA/PSSA/SSA with failure-rate budgets
 *
 * References:
 *   - ISO 14971:2019 Application of risk management to medical devices
 *   - ISO/TR 24971:2020 guidance
 *   - GHTF SG3/N15R8 implementation of risk management
 *
 * @module engines/ISO14971RiskManagementEngine
 * @milestone LATHE-PRO-MS9
 */

export type SeverityLevel = 1 | 2 | 3 | 4 | 5;
export type ProbabilityLevel = 1 | 2 | 3 | 4 | 5;
export type RiskZone = "acceptable" | "ALARP" | "unacceptable";
export type ControlType = "inherent_safety_by_design" | "protective_measure" | "information_for_safety";

export interface RiskControl {
  id: string;
  type: ControlType;
  description: string;
  /** Verified implemented? */
  verified: boolean;
}

export interface Hazard {
  id: string;
  description: string;
  hazardous_situation: string;
  harm: string;
  /** Initial severity estimate */
  severity_initial: SeverityLevel;
  /** Initial probability estimate */
  probability_initial: ProbabilityLevel;
  /** Applied controls */
  controls: RiskControl[];
  /** Post-control severity (rare to change — severity usually fixed by harm) */
  severity_residual?: SeverityLevel;
  /** Post-control probability (usually the reduction lever) */
  probability_residual?: ProbabilityLevel;
  /** Benefit-risk conclusion if residual remains unacceptable */
  benefit_risk_accepted?: boolean;
}

export interface ISO14971Input {
  device_name: string;
  /** Intended use statement */
  intended_use: string;
  hazards: Hazard[];
  /** Override acceptable threshold (risk index). Default 4 */
  acceptable_threshold?: number;
  /** Override ALARP upper bound (risk index). Default 12 */
  alarp_upper?: number;
}

export interface HazardEvaluation {
  id: string;
  risk_initial: number;
  zone_initial: RiskZone;
  risk_residual: number;
  zone_residual: RiskZone;
  risk_reduction: number;
  control_hierarchy_respected: boolean;
  unverified_controls: string[];
  notes: string[];
}

export interface ISO14971Result {
  device_name: string;
  hazards_evaluated: number;
  unacceptable_residual: string[];
  alarp_residual: string[];
  acceptable_residual: string[];
  hazards_without_benefit_risk: string[];
  evaluations: HazardEvaluation[];
  overall_acceptable: boolean;
  reasoning: string[];
}

class ISO14971RiskManagementEngineImpl {
  evaluate(i: ISO14971Input): ISO14971Result {
    const reasoning: string[] = [];
    const acceptable = i.acceptable_threshold ?? 4;
    const alarpUpper = i.alarp_upper ?? 12;

    const evaluations: HazardEvaluation[] = [];
    const unacceptable: string[] = [];
    const alarp: string[] = [];
    const acc: string[] = [];
    const noBR: string[] = [];

    for (const h of i.hazards) {
      const sInit = h.severity_initial;
      const pInit = h.probability_initial;
      const sRes = h.severity_residual ?? sInit;
      const pRes = h.probability_residual ?? pInit;

      const riskInit = sInit * pInit;
      const riskRes = sRes * pRes;

      const zoneInit = this.zoneOf(riskInit, acceptable, alarpUpper);
      const zoneRes = this.zoneOf(riskRes, acceptable, alarpUpper);

      // Hierarchy: design-in safety first, then protective, then info
      const hasDesign = h.controls.some((c) => c.type === "inherent_safety_by_design");
      const hasProtective = h.controls.some((c) => c.type === "protective_measure");
      const hasInfoOnly = h.controls.every((c) => c.type === "information_for_safety");
      // If unacceptable initial risk AND only info-for-safety → hierarchy violated
      const hierarchyRespected =
        zoneInit === "acceptable" ||
        hasDesign ||
        hasProtective ||
        !hasInfoOnly; // empty controls not a hierarchy violation, just a control gap

      const unverified = h.controls.filter((c) => !c.verified).map((c) => c.id);

      const notes: string[] = [];
      if (h.controls.length === 0 && zoneInit !== "acceptable") {
        notes.push("Initial risk not acceptable and no controls applied");
      }
      if (!hierarchyRespected) {
        notes.push("Hierarchy violation: information-for-safety used where design control needed");
      }
      if (unverified.length > 0) {
        notes.push(`Unverified controls: ${unverified.join(", ")}`);
      }

      evaluations.push({
        id: h.id,
        risk_initial: riskInit,
        zone_initial: zoneInit,
        risk_residual: riskRes,
        zone_residual: zoneRes,
        risk_reduction: riskInit - riskRes,
        control_hierarchy_respected: hierarchyRespected,
        unverified_controls: unverified,
        notes,
      });

      if (zoneRes === "unacceptable") {
        unacceptable.push(h.id);
        if (!h.benefit_risk_accepted) noBR.push(h.id);
      } else if (zoneRes === "ALARP") {
        alarp.push(h.id);
      } else {
        acc.push(h.id);
      }
    }

    // Overall acceptable only when no residual-unacceptable hazard lacks a benefit-risk conclusion
    const overallAcceptable = unacceptable.every((id) => {
      const h = i.hazards.find((x) => x.id === id);
      return h?.benefit_risk_accepted === true;
    });

    reasoning.push(
      `${i.hazards.length} hazards: ${acc.length} acceptable, ${alarp.length} ALARP, ${unacceptable.length} unacceptable`,
    );
    if (noBR.length > 0) {
      reasoning.push(`${noBR.length} unacceptable-residual without benefit-risk conclusion`);
    }

    return {
      device_name: i.device_name,
      hazards_evaluated: i.hazards.length,
      unacceptable_residual: unacceptable,
      alarp_residual: alarp,
      acceptable_residual: acc,
      hazards_without_benefit_risk: noBR,
      evaluations,
      overall_acceptable: overallAcceptable,
      reasoning,
    };
  }

  private zoneOf(risk: number, acceptable: number, alarpUpper: number): RiskZone {
    if (risk <= acceptable) return "acceptable";
    if (risk <= alarpUpper) return "ALARP";
    return "unacceptable";
  }

  getStats(): { severity_levels: number; probability_levels: number; matrix_size: string; reference: string } {
    return {
      severity_levels: 5,
      probability_levels: 5,
      matrix_size: "5x5",
      reference: "ISO 14971:2019; ISO/TR 24971:2020",
    };
  }
}

export const iso14971RiskManagementEngine = new ISO14971RiskManagementEngineImpl();
export type { ISO14971RiskManagementEngineImpl };
