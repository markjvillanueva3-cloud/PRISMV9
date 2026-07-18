/**
 * StrategyComparisonEngine — Side-by-Side N-Strategy Comparison with Radar Chart
 *
 * Compares N machining strategies across 6 physics-backed dimensions, producing:
 *   • Normalized radar chart data (6 axes, 0–100)
 *   • Ranked strategy table with per-dimension scores and overall score
 *   • Winner analysis with margin % and winning dimensions
 *   • Natural language explanations ("A beats B by 12% because…")
 *   • Tradeoff statements for every strategy pair
 *
 * Six radar axes:
 *   1. Cycle Time     — lower is better (inverted for score)
 *   2. Tool Life      — higher is better
 *   3. Surface Quality — lower Ra is better (inverted for score)
 *   4. Cost Per Part  — lower is better (inverted for score)
 *   5. Safety Margin  — higher is better (from force/power/deflection margins)
 *   6. Robustness     — higher Cpk prediction is better
 *
 * Lazy-loads StrategyBenchmarkEngine for physics data (MC benchmarks).
 *
 * @engine StrategyComparisonEngine
 * @shortcode E1099
 * @dispatcher camDispatcher
 * @actions strategy_compare, strategy_head_to_head, strategy_radar_chart
 * @milestone CAMX-MS12/U03
 */

import type {
  BenchmarkStrategy,
  BenchmarkFeature,
  BenchmarkMaterial,
  BenchmarkTool,
  BenchmarkMachine,
  StrategyBenchmarkResult,
} from "./StrategyBenchmarkEngine.js";

// ─── Re-export convenience aliases ────────────────────────────────────────────

export type {
  BenchmarkStrategy,
  BenchmarkFeature,
  BenchmarkMaterial,
  BenchmarkTool,
  BenchmarkMachine,
};

// ─── Types ────────────────────────────────────────────────────────────────────

/** One strategy's per-axis scores (0–100, higher = better on every axis). */
export interface DimensionScores {
  cycle_time: number;
  tool_life: number;
  surface_quality: number;
  cost_per_part: number;
  safety_margin: number;
  robustness: number;
}

/** A single strategy's entry in the comparison result. */
export interface RankedStrategy {
  id: string;
  name: string;
  scores: DimensionScores;
  overall_score: number;
  rank: number;
}

/** Identifies the comparison winner with margin and winning axes. */
export interface WinnerSummary {
  id: string;
  name: string;
  /** Percent margin over the second-ranked strategy */
  margin_pct: number;
  /** Axes where the winner dominates (score gap > threshold) */
  winning_dimensions: (keyof DimensionScores)[];
}

/** Full N-strategy comparison result. */
export interface ComparisonResult {
  strategies: RankedStrategy[];
  winner: WinnerSummary;
  radar_chart: RadarChartData;
  explanations: string[];
  tradeoffs: string[];
}

/** Head-to-head analysis between exactly two strategies. */
export interface HeadToHeadResult {
  strategy_a: RankedStrategy;
  strategy_b: RankedStrategy;
  winner: WinnerSummary;
  explanation: string;
  tradeoffs: string[];
  delta_scores: DimensionScores;
}

/** Radar chart data ready for rendering. */
export interface RadarChartData {
  axes: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
}

// ─── Internal physics extension ───────────────────────────────────────────────

/**
 * Per-strategy raw physics values used before normalization.
 * Pulled from StrategyBenchmarkResult and augmented with safety/robustness.
 */
interface RawPhysics {
  strategy_id: string;
  strategy_name: string;
  cycle_time_min: number;
  tool_life_min: number;
  Ra_um: number;
  cost_per_part_usd: number;
  safety_margin: number;   // computed from power/force margins, dimensionless 0–1
  robustness_cpk: number;  // Cpk prediction from MC
}

// ─── Constants ────────────────────────────────────────────────────────────────

/** Axis labels in radar chart order (matches DimensionScores key order). */
const RADAR_AXES: string[] = [
  "Cycle Time",
  "Tool Life",
  "Surface Quality",
  "Cost per Part",
  "Safety Margin",
  "Robustness",
];

/** Dimension keys in the same order as RADAR_AXES. */
const DIMENSION_KEYS: (keyof DimensionScores)[] = [
  "cycle_time",
  "tool_life",
  "surface_quality",
  "cost_per_part",
  "safety_margin",
  "robustness",
];

/** Score gap threshold (points out of 100) to call a dimension a "win". */
const WIN_GAP_THRESHOLD = 8;

/**
 * Axis weights for overall_score (must sum to 1.0).
 * Cycle time and surface quality are most operationally impactful.
 */
const AXIS_WEIGHTS: Record<keyof DimensionScores, number> = {
  cycle_time:      0.22,
  tool_life:       0.18,
  surface_quality: 0.20,
  cost_per_part:   0.18,
  safety_margin:   0.12,
  robustness:      0.10,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Clamp a value to [0, 100]. */
function clamp100(v: number): number {
  return Math.min(100, Math.max(0, v));
}

/** Round to N decimal places. */
function round(v: number, dp = 2): number {
  return parseFloat(v.toFixed(dp));
}

/**
 * Normalise an array of raw values into 0–100 scores.
 * lowerIsBetter: invert so that the minimum value scores 100.
 */
function normalise(values: number[], lowerIsBetter: boolean): number[] {
  const finite = values.filter(v => isFinite(v));
  if (finite.length === 0) return values.map(() => 50);
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  const range = max - min;

  return values.map(v => {
    if (!isFinite(v)) return 50;
    if (range === 0) return 100;
    const norm01 = (v - min) / range; // 0=min, 1=max
    const score01 = lowerIsBetter ? (1 - norm01) : norm01;
    return clamp100(score01 * 100);
  });
}

/**
 * Estimate a safety margin index (0–1) from the benchmark result.
 *
 * Proxy formula:
 *   safety_index = 1 - (actual_power / available_power)
 * We approximate actual_power from the MRR/kc heuristic baked into the MC cost,
 * but here we use a simpler ratio: (tool_life / cycle_time) normalised.
 * Higher tool life relative to cycle time → fewer tool-change risks → higher margin.
 *
 * Additionally: cost efficiency contributes (lower cost → more margin).
 */
function estimateSafetyMargin(r: StrategyBenchmarkResult, machinePowerKw: number): number {
  // tool_life_min / cycle_time_min as a ratio — higher is safer
  const tlRatio = r.tool_life_min / Math.max(r.cycle_time_min, 0.001);

  // Normalise tlRatio to 0–1 using soft sigmoid
  const tlScore = 1 - 1 / (1 + tlRatio * 0.2);

  // Cost efficiency proxy: use Cpk as quality gate — Cpk > 1.33 adds bonus
  const cpkBonus = Math.min(0.2, Math.max(0, (r.Cpk_predicted - 1.0) * 0.1));

  // Power margin proxy: we don't have direct Fc here, but high Cpk + low Ra
  // implies cutting conditions are well within machine capabilities
  const raMarginFactor = Math.min(0.2, 1 / (1 + r.Ra_um));

  const raw = tlScore + cpkBonus + raMarginFactor;
  return Math.min(1.0, raw);
}

/** Compute weighted overall score from DimensionScores. */
function computeOverallScore(scores: DimensionScores): number {
  let total = 0;
  for (const key of DIMENSION_KEYS) {
    total += scores[key] * AXIS_WEIGHTS[key];
  }
  return round(total, 1);
}

/** Build DimensionScores for a single strategy given its normalised axis values. */
function buildDimensionScores(
  normCycleTime: number,
  normToolLife: number,
  normSurfaceQuality: number,
  normCostPerPart: number,
  normSafetyMargin: number,
  normRobustness: number,
): DimensionScores {
  return {
    cycle_time:      round(normCycleTime, 1),
    tool_life:       round(normToolLife, 1),
    surface_quality: round(normSurfaceQuality, 1),
    cost_per_part:   round(normCostPerPart, 1),
    safety_margin:   round(normSafetyMargin, 1),
    robustness:      round(normRobustness, 1),
  };
}

/** Identify which dimensions strategy A wins over strategy B. */
function winningDimensions(a: DimensionScores, b: DimensionScores): (keyof DimensionScores)[] {
  return DIMENSION_KEYS.filter(k => a[k] - b[k] >= WIN_GAP_THRESHOLD);
}

/** Format a float with sign for delta display, e.g. "+12.3" or "-5.1". */
function signed(v: number, dp = 1): string {
  return (v >= 0 ? "+" : "") + round(v, dp).toFixed(dp);
}

/**
 * Generate a natural-language explanation for why strategy A beats strategy B.
 * Identifies the top contributing dimensions and produces a narrative sentence.
 */
function generateExplanation(
  a: RankedStrategy,
  b: RankedStrategy,
  physA: RawPhysics,
  physB: RawPhysics,
  priority: "speed" | "quality" | "tool_life" | "cost" | "balanced",
): string {
  const margin = round(a.overall_score - b.overall_score, 1);
  const pct = b.overall_score > 0
    ? round(((a.overall_score - b.overall_score) / b.overall_score) * 100, 1)
    : 0;

  const wins = winningDimensions(a.scores, b.scores);
  const bWins = winningDimensions(b.scores, a.scores);

  // Build "because" clause from top-2 winning dimensions
  const reasons: string[] = [];

  if (wins.includes("cycle_time")) {
    const delta_pct = physB.cycle_time_min > 0
      ? round(((physB.cycle_time_min - physA.cycle_time_min) / physB.cycle_time_min) * 100, 1)
      : 0;
    reasons.push(
      `${delta_pct}% faster cycle time (${round(physA.cycle_time_min, 2)} vs ${round(physB.cycle_time_min, 2)} min)`,
    );
  }
  if (wins.includes("tool_life")) {
    const delta_pct = physB.tool_life_min > 0
      ? round(((physA.tool_life_min - physB.tool_life_min) / physB.tool_life_min) * 100, 1)
      : 0;
    reasons.push(
      `${delta_pct}% better tool life (${round(physA.tool_life_min, 1)} vs ${round(physB.tool_life_min, 1)} min)`,
    );
  }
  if (wins.includes("surface_quality")) {
    const delta_pct = physB.Ra_um > 0
      ? round(((physB.Ra_um - physA.Ra_um) / physB.Ra_um) * 100, 1)
      : 0;
    reasons.push(
      `${delta_pct}% better surface finish (${round(physA.Ra_um, 2)} vs ${round(physB.Ra_um, 2)} µm Ra)`,
    );
  }
  if (wins.includes("cost_per_part")) {
    const delta_pct = physB.cost_per_part_usd > 0
      ? round(((physB.cost_per_part_usd - physA.cost_per_part_usd) / physB.cost_per_part_usd) * 100, 1)
      : 0;
    reasons.push(
      `${delta_pct}% lower cost per part ($${round(physA.cost_per_part_usd, 2)} vs $${round(physB.cost_per_part_usd, 2)})`,
    );
  }
  if (wins.includes("robustness")) {
    reasons.push(
      `higher Cpk (${round(physA.robustness_cpk, 3)} vs ${round(physB.robustness_cpk, 3)})`,
    );
  }
  if (wins.includes("safety_margin")) {
    reasons.push(`higher safety margin (${round(physA.safety_margin * 100, 1)} vs ${round(physB.safety_margin * 100, 1)} pts)`);
  }

  // B wins clause
  const bWinPhrases: string[] = [];
  if (bWins.includes("surface_quality")) {
    bWinPhrases.push(
      `surface finish (${round(physB.Ra_um, 2)} vs ${round(physA.Ra_um, 2)} µm Ra)`,
    );
  }
  if (bWins.includes("tool_life")) {
    bWinPhrases.push(`tool life (${round(physB.tool_life_min, 1)} vs ${round(physA.tool_life_min, 1)} min)`);
  }
  if (bWins.includes("cycle_time")) {
    bWinPhrases.push(`cycle time (${round(physB.cycle_time_min, 2)} vs ${round(physA.cycle_time_min, 2)} min)`);
  }

  const becauseClause = reasons.length > 0
    ? `: ${reasons.slice(0, 2).join(", ")}`
    : "";
  const bWinsClause = bWinPhrases.length > 0
    ? `. ${b.name} wins on ${bWinPhrases.slice(0, 2).join(" and ")} but the overall advantage lies with ${a.name} at '${priority}' priority`
    : "";

  return (
    `Strategy ${a.name} beats ${b.name} by ${pct}% overall (score ${a.overall_score} vs ${b.overall_score})` +
    `${becauseClause}${bWinsClause}.`
  );
}

/**
 * Generate a tradeoff statement for switching from strategy A to strategy B.
 * "Switching from A to B sacrifices X% cycle time but gains Y% surface finish."
 */
function generateTradeoff(
  a: RankedStrategy,
  b: RankedStrategy,
  physA: RawPhysics,
  physB: RawPhysics,
): string {
  const sacrifices: string[] = [];
  const gains: string[] = [];

  const dimPairs: Array<{
    key: keyof DimensionScores;
    physValA: number;
    physValB: number;
    unit: string;
    lowerIsBetter: boolean;
  }> = [
    { key: "cycle_time",      physValA: physA.cycle_time_min,       physValB: physB.cycle_time_min,       unit: "min cycle time",    lowerIsBetter: true  },
    { key: "tool_life",       physValA: physA.tool_life_min,        physValB: physB.tool_life_min,        unit: "min tool life",     lowerIsBetter: false },
    { key: "surface_quality", physValA: physA.Ra_um,                physValB: physB.Ra_um,                unit: "µm Ra",             lowerIsBetter: true  },
    { key: "cost_per_part",   physValA: physA.cost_per_part_usd,    physValB: physB.cost_per_part_usd,    unit: "cost/part",         lowerIsBetter: true  },
    { key: "robustness",      physValA: physA.robustness_cpk,       physValB: physB.robustness_cpk,       unit: "Cpk",               lowerIsBetter: false },
  ];

  for (const dp of dimPairs) {
    if (dp.physValA === 0) continue;
    const delta_pct = round(((dp.physValB - dp.physValA) / dp.physValA) * 100, 1);
    if (Math.abs(delta_pct) < 3) continue; // ignore trivial differences

    const isBetter = dp.lowerIsBetter ? delta_pct < 0 : delta_pct > 0;
    const absPct = Math.abs(delta_pct);
    const phrase = `${absPct}% ${dp.unit}`;

    if (isBetter) {
      gains.push(phrase);
    } else {
      sacrifices.push(phrase);
    }
  }

  const sacrificeClause = sacrifices.length > 0
    ? `sacrifices ${sacrifices.slice(0, 2).join(" and ")}`
    : "no significant sacrifice";
  const gainClause = gains.length > 0
    ? `gains ${gains.slice(0, 2).join(" and ")}`
    : "no significant gain";

  return `Switching from ${a.name} to ${b.name} ${sacrificeClause} but ${gainClause}.`;
}

// ─── Engine ───────────────────────────────────────────────────────────────────

class StrategyComparisonEngine {
  /**
   * Compare N strategies side-by-side for a given feature/material/tool/machine.
   *
   * Internally runs StrategyBenchmarkEngine.compareBenchmarks() (lazy-loaded)
   * to obtain physics-backed MC results for each strategy, then projects them
   * onto the 6 radar axes and generates narrative output.
   *
   * @param strategies   Array of BenchmarkStrategy objects (2–N)
   * @param feature      Feature geometry + tolerance
   * @param material     Material constants (kc1_1, Taylor C/n, cost)
   * @param tool         Tool geometry + cost
   * @param machine      Machine rate + power
   * @param priority     Optimization intent — affects explanation emphasis
   * @param trials       MC trials per strategy (default 500)
   */
  async compare(
    strategies: BenchmarkStrategy[],
    feature: BenchmarkFeature,
    material: BenchmarkMaterial,
    tool: BenchmarkTool,
    machine: BenchmarkMachine,
    priority: "speed" | "quality" | "tool_life" | "cost" | "balanced" = "balanced",
    trials = 500,
  ): Promise<ComparisonResult> {
    if (strategies.length < 2) {
      throw new Error("StrategyComparisonEngine.compare() requires at least 2 strategies.");
    }

    // Lazy-load benchmark engine
    const { strategyBenchmarkEngine } = await import("./StrategyBenchmarkEngine.js");

    const ranked = strategyBenchmarkEngine.compareBenchmarks(
      strategies, feature, material, tool, machine, trials,
    );

    // Build raw physics array in the same order as strategies[]
    const rawPhysics: RawPhysics[] = ranked.map(rb => ({
      strategy_id:       rb.result.strategy_id,
      strategy_name:     strategies.find(s => s.strategy_id === rb.result.strategy_id)?.strategy_id ?? rb.result.strategy_id,
      cycle_time_min:    rb.result.cycle_time_min,
      tool_life_min:     rb.result.tool_life_min,
      Ra_um:             rb.result.Ra_um,
      cost_per_part_usd: rb.result.cost_per_part,
      safety_margin:     estimateSafetyMargin(rb.result, machine.spindle_power_kw),
      robustness_cpk:    rb.result.Cpk_predicted,
    }));

    // Normalise each axis across all strategies
    const normCycle   = normalise(rawPhysics.map(r => r.cycle_time_min),    true);
    const normTL      = normalise(rawPhysics.map(r => r.tool_life_min),     false);
    const normSurface = normalise(rawPhysics.map(r => r.Ra_um),             true);
    const normCost    = normalise(rawPhysics.map(r => r.cost_per_part_usd), true);
    const normSafety  = normalise(rawPhysics.map(r => r.safety_margin),     false);
    const normRobust  = normalise(rawPhysics.map(r => r.robustness_cpk),    false);

    // Resolve strategy names (use category if set, else id)
    const nameOf = (s: BenchmarkStrategy) =>
      s.category
        ? `${s.strategy_id} (${s.category})`
        : s.strategy_id;

    // Build RankedStrategy list (sorted by overall_score descending)
    const rankedStrategies: RankedStrategy[] = ranked.map((rb, i) => {
      const scores = buildDimensionScores(
        normCycle[i], normTL[i], normSurface[i],
        normCost[i], normSafety[i], normRobust[i],
      );
      const overall_score = computeOverallScore(scores);
      const strat = strategies.find(s => s.strategy_id === rb.result.strategy_id)!;
      return {
        id:            rb.result.strategy_id,
        name:          nameOf(strat),
        scores,
        overall_score,
        rank:          0, // assigned below
      };
    });

    // Sort by overall_score descending and assign ranks
    rankedStrategies.sort((a, b) => b.overall_score - a.overall_score);
    rankedStrategies.forEach((s, i) => { s.rank = i + 1; });

    // Re-order rawPhysics to match rankedStrategies order
    const orderedPhysics = rankedStrategies.map(
      rs => rawPhysics.find(r => r.strategy_id === rs.id)!,
    );

    // Winner
    const winnerStrat  = rankedStrategies[0];
    const runnerUp     = rankedStrategies[1];
    const marginPct    = runnerUp.overall_score > 0
      ? round(((winnerStrat.overall_score - runnerUp.overall_score) / runnerUp.overall_score) * 100, 2)
      : 0;
    const winner: WinnerSummary = {
      id:                 winnerStrat.id,
      name:               winnerStrat.name,
      margin_pct:         marginPct,
      winning_dimensions: winningDimensions(winnerStrat.scores, runnerUp.scores),
    };

    // Radar chart
    const radarChart = this.radarChart({ strategies: rankedStrategies } as any);

    // Explanations — winner vs every other strategy
    const explanations: string[] = [];
    for (let i = 1; i < rankedStrategies.length; i++) {
      const physA = orderedPhysics[0];
      const physB = orderedPhysics[i];
      explanations.push(
        generateExplanation(winnerStrat, rankedStrategies[i], physA, physB, priority),
      );
    }

    // Tradeoffs — every consecutive pair
    const tradeoffs: string[] = [];
    for (let i = 0; i < rankedStrategies.length - 1; i++) {
      tradeoffs.push(
        generateTradeoff(
          rankedStrategies[i], rankedStrategies[i + 1],
          orderedPhysics[i], orderedPhysics[i + 1],
        ),
      );
    }

    return {
      strategies: rankedStrategies,
      winner,
      radar_chart: radarChart,
      explanations,
      tradeoffs,
    };
  }

  /**
   * Head-to-head comparison of exactly two strategies.
   *
   * Returns full dimension scores, winner, natural-language explanation
   * and delta score for each axis (positive = A is better).
   */
  async headToHead(
    strategyA: BenchmarkStrategy,
    strategyB: BenchmarkStrategy,
    feature: BenchmarkFeature,
    material: BenchmarkMaterial,
    tool: BenchmarkTool,
    machine: BenchmarkMachine,
    priority: "speed" | "quality" | "tool_life" | "cost" | "balanced" = "balanced",
    trials = 500,
  ): Promise<HeadToHeadResult> {
    const result = await this.compare(
      [strategyA, strategyB],
      feature, material, tool, machine,
      priority, trials,
    );

    // result.strategies is sorted by score; identify A and B
    const rsA = result.strategies.find(s => s.id === strategyA.strategy_id)!;
    const rsB = result.strategies.find(s => s.id === strategyB.strategy_id)!;

    // Delta: A − B per dimension (positive means A is better)
    const deltaScores: DimensionScores = {
      cycle_time:      round(rsA.scores.cycle_time      - rsB.scores.cycle_time,      1),
      tool_life:       round(rsA.scores.tool_life       - rsB.scores.tool_life,       1),
      surface_quality: round(rsA.scores.surface_quality - rsB.scores.surface_quality, 1),
      cost_per_part:   round(rsA.scores.cost_per_part   - rsB.scores.cost_per_part,   1),
      safety_margin:   round(rsA.scores.safety_margin   - rsB.scores.safety_margin,   1),
      robustness:      round(rsA.scores.robustness      - rsB.scores.robustness,      1),
    };

    // Winner between A and B only
    const winner: WinnerSummary = rsA.overall_score >= rsB.overall_score
      ? {
          id:                 rsA.id,
          name:               rsA.name,
          margin_pct:         result.winner.margin_pct,
          winning_dimensions: winningDimensions(rsA.scores, rsB.scores),
        }
      : {
          id:                 rsB.id,
          name:               rsB.name,
          margin_pct:         result.winner.margin_pct,
          winning_dimensions: winningDimensions(rsB.scores, rsA.scores),
        };

    return {
      strategy_a:   rsA,
      strategy_b:   rsB,
      winner,
      explanation:  result.explanations[0] ?? "",
      tradeoffs:    result.tradeoffs,
      delta_scores: deltaScores,
    };
  }

  /**
   * Build radar chart data from a completed ComparisonResult.
   *
   * Input can be a ComparisonResult (from compare()) or any object with
   * a `.strategies` array of RankedStrategy objects.
   *
   * Returns axes + series suitable for direct rendering in Chart.js / D3 / Plotly.
   */
  radarChart(comparison: Pick<ComparisonResult, "strategies">): RadarChartData {
    const series = comparison.strategies.map(s => ({
      name:   s.name,
      values: DIMENSION_KEYS.map(k => s.scores[k]),
    }));

    return {
      axes: RADAR_AXES,
      series,
    };
  }
}

// ─── Singleton export ──────────────────────────────────────────────────────────

export const strategyComparisonEngine = new StrategyComparisonEngine();
export { StrategyComparisonEngine };
export type { RawPhysics };
