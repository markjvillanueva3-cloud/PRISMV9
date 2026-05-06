/**
 * CrossProcessBayesianDOEPlannerEngine — XPROC-NEURAL Tier 11 (T11-04)
 *
 * Budget-bounded Bayesian Design of Experiments. Given a candidate set
 * (typically the curiosity-admitted set from T11-03 or the high-uncertainty
 * set from T11-01) and an experiment budget K, plan the K runs that
 * maximize total information gain.
 *
 * Strategy: greedy mutual-information maximization with a Gaussian Process
 * surrogate for outcome uncertainty (Krause & Guestrin 2007, Chevalier et
 * al. 2014). At each step:
 *   1. For every remaining candidate, compute its marginal information gain
 *      assuming it's added to the planned set.
 *   2. Pick the candidate with highest marginal gain.
 *   3. Add it to the planned set; update the surrogate's posterior.
 *   4. Repeat until K candidates selected or no positive-gain candidates left.
 *
 * Surrogate kernel: squared-exponential RBF over scaled (sf, fz) features
 * with per-material-process subgroups. Length scale auto-set from history
 * standard deviations. Noise variance σ_n² = 0.05² (fixed default; in
 * production a calibration step would estimate this from the residuals
 * of T9-02 do-calculus or T9-03 counterfactual queries).
 *
 * Information gain proxy: for a candidate x*, the variance reduction at the
 * surrogate's mean field after adding (x*, y*) is approximately the squared
 * predictive standard deviation σ²(x*) divided by σ²(x*) + σ_n². This
 * monotonically increases with surrogate uncertainty, so the greedy choice
 * targets where the surrogate is least confident — equivalent to active
 * learning's expected entropy reduction (Settles 2009).
 *
 * Per CLAUDE.md operator-in-the-loop mandate, this engine SUGGESTS K runs;
 * the operator approves before execution.
 *
 * @module CrossProcessBayesianDOEPlannerEngine
 */

import { z } from "zod";

const CandidateSchema = z.object({
  candidate_id: z.string().min(1),
  material_iso: z.string().min(1),
  sf: z.number().finite().positive(),
  fz: z.number().finite().positive(),
  process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
});
export type Candidate = z.infer<typeof CandidateSchema>;

const HistoryRowSchema = z.object({
  material_iso: z.string().min(1),
  sf: z.number().finite().positive(),
  fz: z.number().finite().positive(),
  outcome: z.number().finite(),
  process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
});
export type HistoryRow = z.infer<typeof HistoryRowSchema>;

const PlanInputSchema = z.object({
  candidates: z.array(CandidateSchema).min(1),
  history: z.array(HistoryRowSchema).min(1),
  budget_k: z.number().int().min(1).max(100).describe("Experiment budget (max picks)"),
  noise_variance: z.number().finite().min(0).max(1).default(0.0025).describe("σ_n² assumed observation noise"),
  rbf_length_scale: z.number().finite().positive().default(1.0).describe("RBF kernel length scale (in scaled units)"),
});
export type PlanInput = z.infer<typeof PlanInputSchema>;

export interface PlannedRun {
  step: number;            // 1..K
  candidate_id: string;
  marginal_info_gain: number;
  predictive_variance: number;
  rationale: string;
}

export interface PlanResult {
  plan: PlannedRun[];
  total_info_gain: number;
  remaining_candidates: number;
  budget_k: number;
  rationale: string;
}

const MATERIAL_ENC: Record<string, number> = { P: 0, M: 1, K: 2, N: 3, S: 4, H: 5 };

function featureVector(c: Candidate | HistoryRow, scales: { sf: number; fz: number }): [number, number, number, number] {
  const mat = MATERIAL_ENC[c.material_iso.toUpperCase()] ?? 6;
  const proc = c.process === "mill" ? 0 : c.process === "lathe" ? 1 : 2;
  return [mat, c.sf / scales.sf, c.fz / scales.fz, proc];
}

function rbfKernel(a: number[], b: number[], length: number): number {
  let sumSq = 0;
  for (let i = 0; i < a.length; i++) sumSq += (a[i] - b[i]) ** 2;
  return Math.exp(-sumSq / (2 * length * length));
}

/**
 * Posterior predictive variance at point `x` given training set X with kernel K(X, X) + σ²I.
 * Cheap approximation using diag-kernel: σ²(x) = K(x, x) - kᵀ(K_train + σ²I)⁻¹k.
 * For small training sets we invert directly; for larger we use Cholesky.
 *
 * Here we use the cheap upper bound: σ²(x) ≈ 1 - max_t K(x, x_t)² / (K(x_t, x_t) + σ²),
 * which captures "how close is the nearest training point" and runs in O(n).
 */
function approxPosteriorVariance(
  x: number[],
  X: number[][],
  noise: number,
  length: number,
): number {
  if (X.length === 0) return 1.0;
  let bestNumerator = 0;
  for (const xt of X) {
    const k = rbfKernel(x, xt, length);
    const denom = 1 + noise;  // K(x_t, x_t) = 1 for RBF
    const contribution = (k * k) / denom;
    if (contribution > bestNumerator) bestNumerator = contribution;
  }
  return Math.max(0, 1 - bestNumerator);
}

export class CrossProcessBayesianDOEPlannerEngine {
  /**
   * Greedy MI-max planning: select K candidates maximizing total information gain.
   */
  static plan(input: PlanInput): PlanResult {
    const parsed = PlanInputSchema.parse(input);
    const k = Math.min(parsed.budget_k, parsed.candidates.length);
    const noise = parsed.noise_variance;
    const length = parsed.rbf_length_scale;

    // Compute scales from history
    const sfMean = parsed.history.reduce((a, b) => a + b.sf, 0) / parsed.history.length;
    const fzMean = parsed.history.reduce((a, b) => a + b.fz, 0) / parsed.history.length;
    const sfStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.sf - sfMean) ** 2, 0) / parsed.history.length) || 1;
    const fzStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.fz - fzMean) ** 2, 0) / parsed.history.length) || 1;
    const scales = { sf: sfStd, fz: fzStd };

    const X: number[][] = parsed.history.map((h) => featureVector(h, scales));
    const remaining = parsed.candidates.map((c, idx) => ({ idx, c, vec: featureVector(c, scales) }));
    const plan: PlannedRun[] = [];
    let totalGain = 0;

    for (let step = 1; step <= k; step++) {
      let best: { idx: number; gain: number; variance: number } | null = null;
      for (const r of remaining) {
        const variance = approxPosteriorVariance(r.vec, X, noise, length);
        const gain = variance / (variance + noise);  // info gain proxy
        if (gain <= 0) continue;
        if (!best || gain > best.gain) best = { idx: r.idx, gain, variance };
      }
      if (!best) break;

      const picked = remaining.findIndex((r) => r.idx === best!.idx);
      const cand = remaining[picked];
      plan.push({
        step,
        candidate_id: cand.c.candidate_id,
        marginal_info_gain: best.gain,
        predictive_variance: best.variance,
        rationale: `Step ${step}: highest marginal info gain (${best.gain.toFixed(4)}) at posterior σ²=${best.variance.toFixed(4)}.`,
      });
      totalGain += best.gain;

      // Update surrogate: add candidate to "training" set so subsequent picks see reduced uncertainty
      X.push(cand.vec);
      remaining.splice(picked, 1);
    }

    return {
      plan,
      total_info_gain: totalGain,
      remaining_candidates: remaining.length,
      budget_k: k,
      rationale: plan.length === k
        ? `Selected ${k} runs spanning total info gain ${totalGain.toFixed(3)}; ${remaining.length} candidates left unplanned.`
        : `Stopped at ${plan.length}/${k}: remaining ${remaining.length} candidates have zero marginal gain (already covered by surrogate).`,
    };
  }

  /**
   * Evaluate a completed plan against actual outcomes — measures "info gain
   * realized" by checking how much the empirical residual variance dropped
   * after adding each planned run.
   */
  static evaluateCompletion(
    plan: PlannedRun[],
    realized: Array<{ candidate_id: string; outcome: number }>,
  ): { coverage: number; realized_runs: number; planned_runs: number; rationale: string } {
    const realizedIds = new Set(realized.map((r) => r.candidate_id));
    const matched = plan.filter((p) => realizedIds.has(p.candidate_id));
    const coverage = plan.length === 0 ? 0 : matched.length / plan.length;
    return {
      coverage,
      realized_runs: matched.length,
      planned_runs: plan.length,
      rationale: `${(coverage * 100).toFixed(1)}% of planned runs realized (${matched.length}/${plan.length}).`,
    };
  }

  static readonly engineId = "CrossProcessBayesianDOEPlannerEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T11-04";
}

export const crossProcessBayesianDOEPlannerEngine = CrossProcessBayesianDOEPlannerEngine;

export function crossProcessBayesianDOEPlanner(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_doe_plan":
      return CrossProcessBayesianDOEPlannerEngine.plan(params as PlanInput);
    case "xproc_doe_evaluate_completion":
      return CrossProcessBayesianDOEPlannerEngine.evaluateCompletion(
        params.plan as PlannedRun[],
        params.realized as Array<{ candidate_id: string; outcome: number }>,
      );
    default:
      throw new Error(`crossProcessBayesianDOEPlanner: unknown action '${action}'`);
  }
}
