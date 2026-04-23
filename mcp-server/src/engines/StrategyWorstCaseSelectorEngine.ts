/**
 * StrategyWorstCaseSelectorEngine — CAMX-MS12/U13
 *
 * Robust min-max (Wald) strategy selection under bounded parameter uncertainty.
 * For each candidate, evaluates the WORST-CASE utility across a discrete
 * uncertainty set (e.g. material strength ±15%, tool diameter ±0.02mm, Ra ±10%).
 * Selects the candidate with the BEST worst-case score — i.e. argmax_s min_u U(s,u).
 *
 * Differs from OptimizationEngine (unconstrained utility max) and
 * StrategyStochasticRiskEngine (probabilistic). This engine assumes
 * adversarial / bounded uncertainty rather than stochastic distributions.
 *
 * Methods:
 *   worstCase(candidate, scenarios)     → WorstCaseResult (single)
 *   robustSelect(candidates, scenarios) → RobustSelection (min-max winner)
 *
 * @engine StrategyWorstCaseSelectorEngine
 * @shortcode E1202
 * @dispatcher camDispatcher
 * @actions strategy_robust_optimize, strategy_robust_worst_case
 * @milestone CAMX-MS12/U13
 * @renamed_from RobustStrategyOptimizationEngine (DuplicationGuard)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single uncertainty scenario. Each candidate is evaluated against all
 * scenarios, then the worst realized utility is the robust score.
 */
export interface UncertaintyScenario {
  id: string;
  /** Scenario name, e.g. "soft_material_low_kc", "oversize_tool". */
  label?: string;
  /** Scalar multipliers / offsets applied in utility(). */
  factors: Record<string, number>;
}

/**
 * Candidate whose utility depends on scenario factors.
 */
export interface RobustCandidate {
  strategy_id: string;
  /** Nominal utility score (0-1). */
  utility_nominal: number;
  /**
   * Sensitivity coefficients. worst = utility_nominal · Π(1 + s·(f-1))
   * where s = sensitivity[key], f = factors[key].
   */
  sensitivity: Record<string, number>;
  meta?: Record<string, unknown>;
}

export interface ScenarioUtility {
  scenario_id: string;
  utility: number;
}

export interface WorstCaseResult {
  strategy_id: string;
  worst_case_utility: number;
  worst_case_scenario: string;
  nominal_utility: number;
  robustness_ratio: number;
  scenario_utilities: ScenarioUtility[];
  meta?: Record<string, unknown>;
}

export interface RobustSelection {
  results: WorstCaseResult[];
  winner: WorstCaseResult;
  nominal_winner_id: string;
  robust_winner_id: string;
  selection_changed: boolean;
  scenarios: UncertaintyScenario[];
}

// ─── Helper ───────────────────────────────────────────────────────────────────

/** Evaluate a single candidate under a single scenario. */
function evaluateScenario(c: RobustCandidate, s: UncertaintyScenario): number {
  let u = c.utility_nominal;
  for (const key of Object.keys(s.factors)) {
    const sens = c.sensitivity[key] ?? 0;
    const f = s.factors[key];
    u *= 1 + sens * (f - 1);
  }
  return Math.max(0, u);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class StrategyWorstCaseSelectorEngine {
  /** Evaluate a single candidate across all scenarios → worst-case result. */
  worstCase(candidate: RobustCandidate, scenarios: UncertaintyScenario[]): WorstCaseResult {
    if (scenarios.length === 0) throw new Error("At least one scenario required");

    const scenario_utilities: ScenarioUtility[] = scenarios.map(s => ({
      scenario_id: s.id,
      utility: evaluateScenario(candidate, s),
    }));

    let worst = scenario_utilities[0];
    for (const su of scenario_utilities) {
      if (su.utility < worst.utility) worst = su;
    }

    return {
      strategy_id: candidate.strategy_id,
      worst_case_utility: Math.round(worst.utility * 10000) / 10000,
      worst_case_scenario: worst.scenario_id,
      nominal_utility: candidate.utility_nominal,
      robustness_ratio: candidate.utility_nominal > 0
        ? Math.round((worst.utility / candidate.utility_nominal) * 10000) / 10000
        : 0,
      scenario_utilities,
      meta: candidate.meta,
    };
  }

  /** Min-max robust selection across candidates. */
  robustSelect(
    candidates: RobustCandidate[],
    scenarios: UncertaintyScenario[],
  ): RobustSelection {
    if (candidates.length === 0) throw new Error("At least one candidate required");
    if (scenarios.length === 0) throw new Error("At least one scenario required");

    const results = candidates.map(c => this.worstCase(c, scenarios));

    // Nominal winner = highest utility_nominal
    const nominalWinner = [...candidates].sort((a, b) => b.utility_nominal - a.utility_nominal)[0];

    // Robust winner = highest worst_case_utility
    const robustWinner = [...results].sort((a, b) => b.worst_case_utility - a.worst_case_utility)[0];

    return {
      results,
      winner: robustWinner,
      nominal_winner_id: nominalWinner.strategy_id,
      robust_winner_id: robustWinner.strategy_id,
      selection_changed: nominalWinner.strategy_id !== robustWinner.strategy_id,
      scenarios,
    };
  }
}

export const strategyWorstCaseSelectorEngine = new StrategyWorstCaseSelectorEngine();
export { StrategyWorstCaseSelectorEngine };
