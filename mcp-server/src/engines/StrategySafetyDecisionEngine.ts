/**
 * StrategySafetyDecisionEngine — CAMX-MS2/U06
 *
 * Safety decision engine for CAM strategy selection.
 * At every decision point, evaluates candidate strategies against four
 * safety risk dimensions and enforces safety-first ranking. Safety ALWAYS
 * overrides cost (per roadmap U06 requirement).
 *
 * Risk dimensions (each scored 0-100, 100 = maximum risk):
 *   - collision_risk: interference, gouging, holder crash potential
 *   - overload_risk: force/torque/power exceeding machine envelope
 *   - chatter_risk: regenerative instability, stability lobe proximity
 *   - thermal_risk: temperature-induced tool failure, workpiece damage
 *
 * Thresholds:
 *   - Any single risk >= 80 → strategy is UNSAFE (rejected outright)
 *   - Sum of risks >= 250 → strategy is UNSAFE
 *   - Otherwise → safe, ranked by combined risk (lowest first)
 *
 * References:
 *   - Altintas (2012) "Manufacturing Automation" §5-6 — stability & overload
 *   - ISO 15641 — machine tool safety envelopes
 *   - SME Manufacturing Handbook §14 — collision & interference
 *
 * @module engines/StrategySafetyDecisionEngine
 * @milestone CAMX-MS2/U06
 */

// ============================================================================
// TYPES
// ============================================================================

/** Four risk scores per candidate strategy (each 0-100) */
export interface StrategyRiskScores {
  /** Interference / gouge / crash risk (0 = safe, 100 = imminent collision) */
  collision_risk: number;
  /** Force / power / torque overload risk */
  overload_risk: number;
  /** Regenerative chatter risk */
  chatter_risk: number;
  /** Thermal damage risk (tool/workpiece) */
  thermal_risk: number;
}

/** Candidate strategy option with risk scores */
export interface StrategySafetyOption {
  strategy_id: string;
  risks: StrategyRiskScores;
  notes?: string;
}

/** Evaluation for a single option */
export interface StrategySafetyAssessment {
  strategy_id: string;
  risks: StrategyRiskScores;
  combined_risk: number;
  max_risk: number;
  is_safe: boolean;
  rejection_reasons: string[];
  severity: "safe" | "caution" | "critical";
}

/** Full decision output */
export interface StrategySafetyDecision {
  safe: StrategySafetyAssessment[];
  rejected: StrategySafetyAssessment[];
  safest: StrategySafetyAssessment | null;
  explanation: string;
  overrode_cost: boolean;
}

// Thresholds (tuned per roadmap)
export const SAFETY_THRESHOLDS = {
  /** Any single risk at or above this level → reject */
  CRITICAL_SINGLE: 80,
  /** Sum of all risks at or above → reject */
  CRITICAL_SUM: 250,
  /** Per-risk threshold below which "caution" is downgraded to "safe" */
  CAUTION_SINGLE: 50,
  /** Sum above which severity = caution */
  CAUTION_SUM: 150,
};

// ============================================================================
// ENGINE
// ============================================================================

export class StrategySafetyDecisionEngine {
  /**
   * Assess a single strategy option against safety thresholds.
   */
  assess(option: StrategySafetyOption): StrategySafetyAssessment {
    const { collision_risk, overload_risk, chatter_risk, thermal_risk } = option.risks;
    validateRange("collision_risk", collision_risk);
    validateRange("overload_risk", overload_risk);
    validateRange("chatter_risk", chatter_risk);
    validateRange("thermal_risk", thermal_risk);

    const combined = collision_risk + overload_risk + chatter_risk + thermal_risk;
    const maxRisk = Math.max(collision_risk, overload_risk, chatter_risk, thermal_risk);

    const rejections: string[] = [];
    if (collision_risk >= SAFETY_THRESHOLDS.CRITICAL_SINGLE)
      rejections.push(`collision_risk ${collision_risk} >= ${SAFETY_THRESHOLDS.CRITICAL_SINGLE}`);
    if (overload_risk >= SAFETY_THRESHOLDS.CRITICAL_SINGLE)
      rejections.push(`overload_risk ${overload_risk} >= ${SAFETY_THRESHOLDS.CRITICAL_SINGLE}`);
    if (chatter_risk >= SAFETY_THRESHOLDS.CRITICAL_SINGLE)
      rejections.push(`chatter_risk ${chatter_risk} >= ${SAFETY_THRESHOLDS.CRITICAL_SINGLE}`);
    if (thermal_risk >= SAFETY_THRESHOLDS.CRITICAL_SINGLE)
      rejections.push(`thermal_risk ${thermal_risk} >= ${SAFETY_THRESHOLDS.CRITICAL_SINGLE}`);
    if (combined >= SAFETY_THRESHOLDS.CRITICAL_SUM)
      rejections.push(`combined_risk ${combined} >= ${SAFETY_THRESHOLDS.CRITICAL_SUM}`);

    const isSafe = rejections.length === 0;

    let severity: "safe" | "caution" | "critical";
    if (!isSafe) severity = "critical";
    else if (maxRisk >= SAFETY_THRESHOLDS.CAUTION_SINGLE || combined >= SAFETY_THRESHOLDS.CAUTION_SUM) severity = "caution";
    else severity = "safe";

    return {
      strategy_id: option.strategy_id,
      risks: option.risks,
      combined_risk: round2(combined),
      max_risk: maxRisk,
      is_safe: isSafe,
      rejection_reasons: rejections,
      severity,
    };
  }

  /**
   * Decide across multiple options. Safety overrides cost — unsafe options
   * are rejected regardless of other properties.
   *
   * @param options - candidate strategies with risk scores
   * @param cost_preferred_id - (optional) the cost-optimal pick; used to detect
   *   whether safety override happened (i.e., cost pick was rejected).
   */
  decide(
    options: StrategySafetyOption[],
    cost_preferred_id?: string,
  ): StrategySafetyDecision {
    if (options.length === 0) {
      throw new Error("StrategySafetyDecision.decide: at least one option required");
    }

    const assessed = options.map(o => this.assess(o));
    const safe = assessed.filter(a => a.is_safe).sort((a, b) => a.combined_risk - b.combined_risk);
    const rejected = assessed.filter(a => !a.is_safe);
    const safest = safe.length > 0 ? safe[0] : null;

    const costPickRejected = cost_preferred_id !== undefined
      && rejected.some(r => r.strategy_id === cost_preferred_id);

    let explanation: string;
    if (safest === null) {
      explanation = `ALL ${options.length} strategies rejected as unsafe. Critical rejections: ` +
        rejected.slice(0, 3).map(r => `${r.strategy_id} (${r.rejection_reasons[0]})`).join(", ");
    } else if (costPickRejected) {
      explanation = `Safety override: cost-optimal '${cost_preferred_id}' REJECTED due to ` +
        `${rejected.find(r => r.strategy_id === cost_preferred_id)?.rejection_reasons[0]}. ` +
        `Safest alternative: '${safest.strategy_id}' (combined risk ${safest.combined_risk}).`;
    } else {
      explanation = `Safest strategy: '${safest.strategy_id}' with combined risk ${safest.combined_risk}. ` +
        `${safe.length} safe options, ${rejected.length} rejected.`;
    }

    return {
      safe,
      rejected,
      safest,
      explanation,
      overrode_cost: costPickRejected,
    };
  }

  /**
   * Filter a list of options down to only the safe subset (preserves input order).
   * Useful when downstream wants cost ranking but only over safe candidates.
   */
  filterSafe(options: StrategySafetyOption[]): StrategySafetyOption[] {
    return options.filter(o => this.assess(o).is_safe);
  }
}

function validateRange(name: string, value: number): void {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new Error(`StrategySafetyDecision: ${name} must be in [0,100], got ${value}`);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export const strategySafetyDecisionEngine = new StrategySafetyDecisionEngine();
