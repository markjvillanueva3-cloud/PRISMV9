/**
 * StrategyStochasticRiskEngine — CAMX-MS12/U11
 *
 * Monte-Carlo stochastic risk assessment for strategy candidates under
 * parameter uncertainty (material property variance, tool wear dispersion,
 * thermal drift). Evaluates P(success), failure-mode distribution, and
 * risk-adjusted ranking.
 *
 * Differs from StrategyComparisonEngine (deterministic multi-criteria compare)
 * and StochasticProcessEngine (single-strategy MC). This engine produces:
 *   • P(success | tolerance, tool_life, surface_finish) per candidate
 *   • Failure-mode breakdown (dim_out_of_tol, tool_wear_excess, bad_surface)
 *   • Risk-adjusted rank (expected_utility - λ·VaR_95)
 *
 * Methods:
 *   stochasticCompare(candidates, config)  → StochasticRiskReport
 *   riskRank(candidates, config, λ?)       → ranked by expected_utility minus penalty
 *
 * @engine StrategyStochasticRiskEngine
 * @shortcode E1201
 * @dispatcher camDispatcher
 * @actions strategy_stochastic_compare, strategy_stochastic_rank
 * @milestone CAMX-MS12/U11
 * @renamed_from StochasticStrategyComparisonEngine (DuplicationGuard)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StrategyRiskCandidate {
  strategy_id: string;
  /** Mean dimensional error (mm) expected from strategy. */
  dim_mean_mm: number;
  /** Dimensional stddev (mm). */
  dim_stddev_mm: number;
  /** Mean tool-life (minutes). */
  tool_life_mean_min: number;
  /** Tool-life stddev (minutes). */
  tool_life_stddev_min: number;
  /** Mean surface roughness Ra (μm). */
  ra_mean_um: number;
  /** Ra stddev (μm). */
  ra_stddev_um: number;
  /** Utility score (0-1) — combined deterministic MRR/quality. */
  utility: number;
  meta?: Record<string, unknown>;
}

export interface StochasticRiskConfig {
  /** Bilateral tolerance (±, mm). */
  tolerance_mm: number;
  /** Minimum acceptable tool-life (min). */
  min_tool_life_min: number;
  /** Max acceptable Ra (μm). */
  max_ra_um: number;
  /** Monte-Carlo trials (default 1000). */
  trials?: number;
  /** RNG seed for reproducibility. */
  seed?: number;
}

export type FailureMode = "dim_out_of_tol" | "tool_wear_excess" | "surface_bad" | "multiple";

export interface RiskDecision {
  strategy_id: string;
  p_success: number;
  /** Frequency of each failure mode among failures (0..1, sums to 1 across failures). */
  failure_breakdown: Record<FailureMode, number>;
  /** Value-at-risk (utility loss at 5th percentile). */
  var_95: number;
  /** Expected utility over trials. */
  expected_utility: number;
  /** Risk-adjusted score = expected_utility - λ·VaR_95. */
  risk_adjusted: number;
  rank: number;
  meta?: Record<string, unknown>;
}

export interface StochasticRiskReport {
  decisions: RiskDecision[];
  best: RiskDecision;
  worst: RiskDecision;
  lambda: number;
  trials: number;
  config: StochasticRiskConfig;
}

// ─── RNG (deterministic mulberry32) ───────────────────────────────────────────

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box-Muller transform for N(0,1) samples. */
function normSample(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-12);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class StrategyStochasticRiskEngine {
  readonly DEFAULT_TRIALS = 1000;
  readonly DEFAULT_LAMBDA = 0.3;

  stochasticCompare(
    candidates: StrategyRiskCandidate[],
    config: StochasticRiskConfig,
    lambda: number = this.DEFAULT_LAMBDA,
  ): StochasticRiskReport {
    if (candidates.length === 0) throw new Error("At least one candidate required");
    if (config.tolerance_mm <= 0) throw new Error("tolerance_mm must be > 0");
    if (config.min_tool_life_min <= 0) throw new Error("min_tool_life_min must be > 0");
    if (config.max_ra_um <= 0) throw new Error("max_ra_um must be > 0");
    if (lambda < 0) throw new Error("lambda must be ≥ 0");

    const trials = Math.max(100, config.trials ?? this.DEFAULT_TRIALS);
    const seed = config.seed ?? 1337;
    const rand = mulberry32(seed);

    const decisions: RiskDecision[] = candidates.map(c => this.evaluate(c, config, trials, rand, lambda));

    // Rank by risk_adjusted descending
    const sorted = [...decisions].sort((a, b) => b.risk_adjusted - a.risk_adjusted);
    sorted.forEach((d, i) => { d.rank = i + 1; });

    return {
      decisions,
      best: sorted[0],
      worst: sorted[sorted.length - 1],
      lambda,
      trials,
      config,
    };
  }

  /** Returns decisions sorted by risk_adjusted (best first). */
  riskRank(
    candidates: StrategyRiskCandidate[],
    config: StochasticRiskConfig,
    lambda: number = this.DEFAULT_LAMBDA,
  ): RiskDecision[] {
    const report = this.stochasticCompare(candidates, config, lambda);
    return [...report.decisions].sort((a, b) => a.rank - b.rank);
  }

  private evaluate(
    c: StrategyRiskCandidate,
    config: StochasticRiskConfig,
    trials: number,
    rand: () => number,
    lambda: number,
  ): RiskDecision {
    let successes = 0;
    const utilities: number[] = new Array(trials);
    const fails: Record<FailureMode, number> = {
      dim_out_of_tol: 0, tool_wear_excess: 0, surface_bad: 0, multiple: 0,
    };

    for (let i = 0; i < trials; i++) {
      const dim = c.dim_mean_mm + c.dim_stddev_mm * normSample(rand);
      const life = c.tool_life_mean_min + c.tool_life_stddev_min * normSample(rand);
      const ra = c.ra_mean_um + c.ra_stddev_um * normSample(rand);

      const dimOK = Math.abs(dim) <= config.tolerance_mm;
      const lifeOK = life >= config.min_tool_life_min;
      const raOK = ra <= config.max_ra_um;

      const failCount = (dimOK ? 0 : 1) + (lifeOK ? 0 : 1) + (raOK ? 0 : 1);
      if (failCount === 0) {
        successes++;
        utilities[i] = c.utility;
      } else {
        // Penalize utility on failure (fraction retained = 1 - 0.4·failCount)
        utilities[i] = c.utility * Math.max(0, 1 - 0.4 * failCount);
        if (failCount >= 2) fails.multiple++;
        else if (!dimOK) fails.dim_out_of_tol++;
        else if (!lifeOK) fails.tool_wear_excess++;
        else if (!raOK) fails.surface_bad++;
      }
    }

    const p_success = successes / trials;

    // Normalize failure breakdown to proportions (sum=1 if any failure)
    const totalFail = trials - successes;
    const failure_breakdown: Record<FailureMode, number> = totalFail > 0
      ? {
          dim_out_of_tol: fails.dim_out_of_tol / totalFail,
          tool_wear_excess: fails.tool_wear_excess / totalFail,
          surface_bad: fails.surface_bad / totalFail,
          multiple: fails.multiple / totalFail,
        }
      : { dim_out_of_tol: 0, tool_wear_excess: 0, surface_bad: 0, multiple: 0 };

    // Expected utility (mean), VaR_95 (5th-percentile loss from best)
    utilities.sort((a, b) => a - b);
    const expected_utility = utilities.reduce((s, u) => s + u, 0) / trials;
    const p05 = utilities[Math.floor(0.05 * trials)];
    const var_95 = Math.max(0, c.utility - p05);

    const risk_adjusted = expected_utility - lambda * var_95;

    return {
      strategy_id: c.strategy_id,
      p_success: Math.round(p_success * 10000) / 10000,
      failure_breakdown,
      var_95: Math.round(var_95 * 10000) / 10000,
      expected_utility: Math.round(expected_utility * 10000) / 10000,
      risk_adjusted: Math.round(risk_adjusted * 10000) / 10000,
      rank: 0, // filled later
      meta: c.meta,
    };
  }
}

export const strategyStochasticRiskEngine = new StrategyStochasticRiskEngine();
export { StrategyStochasticRiskEngine };
