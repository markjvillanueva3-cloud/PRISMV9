/**
 * CascadeCalibrationEngine — Probe-based cost-quality frontier calibration.
 *
 * Milestone: OCTOPUS-NEURAL-MS0 / U-OCN04.
 *
 * References:
 *   - FrugalGPT (Chen 2305.05176): cascading LLM calls from cheap → strong with
 *     deferral thresholds cuts inference cost ~98% on benchmarks vs always-strong.
 *   - GATEKEEPER (2502.19335): probe-based deferral with calibration loop closes
 *     the cost/quality knob without manual tuning.
 *
 * Job: take a tier ladder (cheap → mid → strong, each with cost-per-probe and an
 * `invoke` callable) and a probe set with quality scorers, run every probe through
 * every tier, and emit a cost-quality frontier + threshold recommendations.
 *
 * The engine does NOT write thresholds to disk. That's the CLI's job (scripts/
 * cascade-calibrate.mjs). The engine returns the frontier; the CLI writes
 * state/shared/cascade-thresholds.json after merging with any last-known-good
 * thresholds (preserve-on-failure semantics, per the atomized spec).
 *
 * Failure modes covered:
 *   - all probes on a tier fail → tier marked unqualified, frontier still emits
 *   - all tiers unqualified (no qualifier at the scoreFloor) → alarm + no thresholds
 *   - cost runaway → maxBudgetUsd hard cap, partial frontier marked truncated
 *   - NaN/Infinity scores from a probe.score function → treated as 0, alarm noted
 *   - oversized probe set → maxProbesPerTier hard cap, partial frontier still useful
 *
 * @module engines/CascadeCalibrationEngine
 * @milestone OCTOPUS-NEURAL-MS0/U-OCN04
 */

export interface Tier {
  /** Stable identifier — 'kimi-k2-cheap', 'sonnet-mid', 'opus-strong', etc. */
  id: string;
  /** Marginal cost per probe in USD (or any consistent unit). Must be ≥ 0. */
  costPerProbe: number;
  /** Tier callable. Returns { ok, answer, latencyMs }. ok=false → counts as a probe failure for this tier. */
  invoke: (prompt: string) => Promise<{ ok: boolean; answer: string; latencyMs: number }>;
}

export interface Probe {
  /** Stable id for traceability. */
  id: string;
  /** Prompt to send. */
  prompt: string;
  /** Optional reference / golden answer (not used directly; passed to score() if needed). */
  expected?: string;
  /** Domain tag for grouping ('manufacturing' | 'ai' | 'safety' | etc.). */
  domain?: string;
  /** Quality scorer: maps the tier's answer to [0, 1]. NaN / Infinity coerced to 0. */
  score: (answer: string, expected?: string) => number;
}

export interface CalibrationOptions {
  tiers: Tier[];
  probes: Probe[];
  /** Hard cap on total cost across the whole calibration. Default: Infinity. */
  maxBudgetUsd?: number;
  /** Hard cap on probes-per-tier. Default 50 (per atomized spec). */
  maxProbesPerTier?: number;
  /** Minimum mean score for a tier to "qualify" as a cascade option. Default 0.5. */
  scoreFloor?: number;
}

export interface TierFrontier {
  tierId: string;
  meanScore: number;
  meanCost: number;
  meanLatencyMs: number;
  probesRun: number;
  probesFailed: number;
  qualifies: boolean;
  scoreVariance: number;
}

export interface CalibrationResult {
  ok: boolean;
  /** Per-tier statistics, ordered by ascending meanCost. */
  frontier: TierFrontier[];
  thresholds: {
    /** Cheapest tier that qualifies (meanScore ≥ scoreFloor). null if no tier qualifies. */
    cheapestQualifying: string | null;
    /** When the cheapest qualifying tier fails on a specific probe, escalate to this tier. */
    deferEscalation: string | null;
    /** Last-resort tier (highest meanScore regardless of cost). null if frontier is empty. */
    fallback: string | null;
  };
  totalCostUsd: number;
  /** Populated when something went sideways: all-fail, budget-exhausted, all NaN, etc. */
  alarm: string | null;
  /** True if the calibration hit maxBudgetUsd or maxProbesPerTier early. */
  truncated: boolean;
  error: string | null;
}

const DEFAULT_MAX_PROBES_PER_TIER = 50;
const DEFAULT_SCORE_FLOOR = 0.5;
const DEFAULT_MAX_BUDGET_USD = Number.POSITIVE_INFINITY;

export class CascadeCalibrationEngine {
  /**
   * Run a full calibration. Returns a result object; never throws on tier
   * invocation failure (those are recorded as probe failures). Only throws on
   * input validation failure.
   */
  async calibrate(options: CalibrationOptions): Promise<CalibrationResult> {
    this.validate(options);
    const maxBudget = options.maxBudgetUsd ?? DEFAULT_MAX_BUDGET_USD;
    const maxProbes = options.maxProbesPerTier ?? DEFAULT_MAX_PROBES_PER_TIER;
    const scoreFloor = options.scoreFloor ?? DEFAULT_SCORE_FLOOR;

    const probes = options.probes.slice(0, maxProbes); // cap probe set per tier
    const probeCountCapped = options.probes.length > maxProbes;

    const tierStats: TierFrontier[] = [];
    let totalCost = 0;
    let truncated = probeCountCapped;
    let anyNaN = false;

    for (const tier of options.tiers) {
      const tierResult = await this.runTier(tier, probes, scoreFloor, maxBudget - totalCost, (nan) => { if (nan) anyNaN = true; });
      tierStats.push(tierResult.stats);
      totalCost += tierResult.cost;
      if (tierResult.budgetExhausted) {
        truncated = true;
        break; // hard stop — no further tiers
      }
    }

    // Sort frontier ascending by meanCost (so cheapest tier appears first).
    tierStats.sort((a, b) => a.meanCost - b.meanCost);

    const qualifying = tierStats.filter((t) => t.qualifies);
    const cheapestQualifying = qualifying.length > 0 ? qualifying[0].tierId : null;
    // deferEscalation: the next-cheapest qualifying tier above cheapestQualifying.
    const deferEscalation = qualifying.length >= 2 ? qualifying[1].tierId : null;
    // fallback: tier with highest meanScore regardless of cost (last-resort quality anchor).
    const fallback = tierStats.length > 0
      ? [...tierStats].sort((a, b) => b.meanScore - a.meanScore)[0].tierId
      : null;

    let alarm: string | null = null;
    if (qualifying.length === 0 && tierStats.length > 0) {
      alarm = `No tier qualifies — all ${tierStats.length} tier(s) have meanScore < scoreFloor (${scoreFloor}). Preserve last-known-good thresholds (engine returns null for cheapestQualifying/deferEscalation; fallback set to highest-mean-score tier as a last resort).`;
    }
    if (truncated && totalCost >= maxBudget) {
      const reason = `Budget cap hit (totalCost=${totalCost.toFixed(4)} ≥ maxBudgetUsd=${maxBudget})`;
      alarm = alarm ? `${alarm} | ${reason}` : reason;
    }
    if (anyNaN) {
      const reason = "One or more probe.score() calls returned NaN/Infinity — those scores were coerced to 0; review probes for correctness";
      alarm = alarm ? `${alarm} | ${reason}` : reason;
    }
    if (truncated && probeCountCapped) {
      const reason = `Probe set capped at maxProbesPerTier=${maxProbes} (${options.probes.length} provided)`;
      alarm = alarm ? `${alarm} | ${reason}` : reason;
    }

    return {
      ok: true,
      frontier: tierStats,
      thresholds: { cheapestQualifying, deferEscalation, fallback },
      totalCostUsd: totalCost,
      alarm,
      truncated,
      error: null,
    };
  }

  // ---- internals ----

  private async runTier(
    tier: Tier,
    probes: Probe[],
    scoreFloor: number,
    remainingBudget: number,
    onNaN: (sawNaN: boolean) => void,
  ): Promise<{ stats: TierFrontier; cost: number; budgetExhausted: boolean }> {
    const scores: number[] = [];
    const latencies: number[] = [];
    let probesFailed = 0;
    let cost = 0;
    let budgetExhausted = false;

    for (const probe of probes) {
      if (cost + tier.costPerProbe > remainingBudget) {
        budgetExhausted = true;
        break;
      }
      cost += tier.costPerProbe;
      let resp: { ok: boolean; answer: string; latencyMs: number };
      try {
        resp = await tier.invoke(probe.prompt);
      } catch {
        probesFailed++;
        continue;
      }
      if (!resp.ok) {
        probesFailed++;
        continue;
      }
      // Score the answer; NaN/Infinity coerced to 0.
      let s = 0;
      try {
        const raw = probe.score(resp.answer, probe.expected);
        if (!Number.isFinite(raw)) {
          onNaN(true);
          s = 0;
        } else {
          s = Math.max(0, Math.min(1, raw));
        }
      } catch {
        // probe.score itself threw — treat as zero score, count as failure proxy
        probesFailed++;
        continue;
      }
      scores.push(s);
      latencies.push(resp.latencyMs);
    }

    const probesRun = scores.length + probesFailed;
    const meanScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const meanLatencyMs = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    const meanCost = probesRun > 0 ? cost / probesRun : 0;
    const variance = scores.length > 1 ? this.variance(scores, meanScore) : 0;

    return {
      stats: {
        tierId: tier.id,
        meanScore,
        meanCost,
        meanLatencyMs,
        probesRun,
        probesFailed,
        qualifies: scores.length > 0 && meanScore >= scoreFloor,
        scoreVariance: variance,
      },
      cost,
      budgetExhausted,
    };
  }

  private variance(samples: number[], mean: number): number {
    let acc = 0;
    for (const s of samples) acc += (s - mean) * (s - mean);
    return acc / samples.length;
  }

  private validate(options: CalibrationOptions): void {
    if (!options || typeof options !== "object") throw new Error("CalibrationOptions required");
    if (!Array.isArray(options.tiers) || options.tiers.length === 0) throw new Error("tiers must be a non-empty array");
    if (!Array.isArray(options.probes) || options.probes.length === 0) throw new Error("probes must be a non-empty array");
    for (const t of options.tiers) {
      if (!t || typeof t !== "object") throw new Error("each tier must be an object");
      if (typeof t.id !== "string" || t.id.length === 0) throw new Error("tier.id must be a non-empty string");
      if (!Number.isFinite(t.costPerProbe) || t.costPerProbe < 0) throw new Error(`tier.costPerProbe must be ≥ 0 (got ${t.costPerProbe} for ${t.id})`);
      if (typeof t.invoke !== "function") throw new Error(`tier.invoke must be a function (got ${typeof t.invoke} for ${t.id})`);
    }
    for (const p of options.probes) {
      if (!p || typeof p !== "object") throw new Error("each probe must be an object");
      if (typeof p.id !== "string" || p.id.length === 0) throw new Error("probe.id must be a non-empty string");
      if (typeof p.prompt !== "string" || p.prompt.length === 0) throw new Error(`probe.prompt must be a non-empty string (probe ${p.id})`);
      if (typeof p.score !== "function") throw new Error(`probe.score must be a function (probe ${p.id})`);
    }
    if (options.maxBudgetUsd !== undefined && (!Number.isFinite(options.maxBudgetUsd) || options.maxBudgetUsd < 0)) {
      throw new Error("maxBudgetUsd must be a non-negative finite number");
    }
    if (options.maxProbesPerTier !== undefined && (!Number.isInteger(options.maxProbesPerTier) || options.maxProbesPerTier <= 0)) {
      throw new Error("maxProbesPerTier must be a positive integer");
    }
    if (options.scoreFloor !== undefined && (!Number.isFinite(options.scoreFloor) || options.scoreFloor < 0 || options.scoreFloor > 1)) {
      throw new Error("scoreFloor must be in [0, 1]");
    }
  }
}

export const cascadeCalibrationEngine = new CascadeCalibrationEngine();
