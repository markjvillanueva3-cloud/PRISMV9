/**
 * CrossProcessUncertaintyDrivenSamplerEngine — XPROC-NEURAL Tier 11 (T11-01)
 *
 * Active-learning sampler: ranks pending jobs by predictive uncertainty so
 * the operator instruments the most informative experiments. Maximum-information
 * experiment selection (Lindley 1956, MacKay 1992).
 *
 * Uncertainty estimate (when T5-01 Bayesian MLP isn't on this branch yet):
 *   For each pending job p, find k-nearest historical jobs in (material, sf, fz)
 *   space; compute the empirical outcome variance among those neighbors.
 *   Pending jobs in sparse regions get high uncertainty; jobs in well-trodden
 *   regions get low uncertainty. This is a non-parametric proxy for the
 *   posterior predictive variance that T5-01 will eventually provide.
 *
 * Acquisition function: rank by σ² (variance) descending. Returns top-N with
 * full provenance (k-NN distances, the neighbors that drove the variance,
 * and rationale for each pick).
 *
 * @module CrossProcessUncertaintyDrivenSamplerEngine
 */

import { z } from "zod";

const PendingJobSchema = z.object({
  job_id: z.string().min(1),
  material_iso: z.string().min(1),
  sf: z.number().finite().positive(),
  fz: z.number().finite().positive(),
  process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
});
export type PendingJob = z.infer<typeof PendingJobSchema>;

const HistoricalEventSchema = z.object({
  job_id: z.string().min(1).optional(),
  material_iso: z.string().min(1),
  sf: z.number().finite().positive(),
  fz: z.number().finite().positive(),
  process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
  outcome: z.number().finite().describe("Numeric outcome metric (e.g. surface finish error, tool life ratio)"),
});
export type HistoricalEvent = z.infer<typeof HistoricalEventSchema>;

const SelectInputSchema = z.object({
  pending: z.array(PendingJobSchema).min(1),
  history: z.array(HistoricalEventSchema).min(1),
  k: z.number().int().min(1).max(50).default(5).describe("k-NN neighbor count"),
  top_n: z.number().int().min(1).default(5).describe("Number of top picks to return"),
});
export type SelectInput = z.infer<typeof SelectInputSchema>;

export interface JobUncertainty {
  job_id: string;
  variance: number;            // empirical σ² of k-NN outcomes
  mean_outcome: number;
  k_used: number;              // ≤ k (capped by history size)
  mean_distance: number;        // average normalized distance to neighbors
  rationale: string;
}

export interface SelectResult {
  ranked: JobUncertainty[];
  top_picks: JobUncertainty[];
  n_history: number;
  k: number;
}

const MATERIAL_ENC: Record<string, number> = {
  P: 0, M: 1, K: 2, N: 3, S: 4, H: 5,
};

function distance(a: PendingJob, b: HistoricalEvent, scales: { sf: number; fz: number }): number {
  const matA = MATERIAL_ENC[a.material_iso.toUpperCase()] ?? 6;
  const matB = MATERIAL_ENC[b.material_iso.toUpperCase()] ?? 6;
  const dMat = (matA - matB) ** 2;
  const dSf = ((a.sf - b.sf) / scales.sf) ** 2;
  const dFz = ((a.fz - b.fz) / scales.fz) ** 2;
  const dProc = a.process === b.process ? 0 : 1;
  return Math.sqrt(dMat + dSf + dFz + dProc);
}

export class CrossProcessUncertaintyDrivenSamplerEngine {
  /**
   * Rank pending jobs by k-NN-derived predictive uncertainty.
   * Returns descending by variance with top_n highlighted.
   */
  static select(input: SelectInput): SelectResult {
    const parsed = SelectInputSchema.parse(input);
    const k = parsed.k;
    const topN = parsed.top_n;

    // Compute per-feature scale from history std (avoids dimension dominance)
    const sfMean = parsed.history.reduce((a, b) => a + b.sf, 0) / parsed.history.length;
    const fzMean = parsed.history.reduce((a, b) => a + b.fz, 0) / parsed.history.length;
    const sfStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.sf - sfMean) ** 2, 0) / parsed.history.length) || 1;
    const fzStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.fz - fzMean) ** 2, 0) / parsed.history.length) || 1;

    const ranked: JobUncertainty[] = [];
    const kUsed = Math.min(k, parsed.history.length);

    for (const p of parsed.pending) {
      const dists = parsed.history.map((h) => ({
        ev: h, d: distance(p, h, { sf: sfStd, fz: fzStd }),
      })).sort((a, b) => a.d - b.d);
      const neighbors = dists.slice(0, kUsed);
      const outcomes = neighbors.map((n) => n.ev.outcome);
      const meanOutcome = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
      const variance = outcomes.reduce((a, b) => a + (b - meanOutcome) ** 2, 0) / outcomes.length;
      const meanDist = neighbors.reduce((a, b) => a + b.d, 0) / neighbors.length;

      ranked.push({
        job_id: p.job_id,
        variance,
        mean_outcome: meanOutcome,
        k_used: kUsed,
        mean_distance: meanDist,
        rationale: variance > 0.5
          ? `High variance (σ²=${variance.toFixed(3)}) over ${kUsed} neighbors — instrument this run for max info gain.`
          : variance > 0.1
            ? `Moderate variance (σ²=${variance.toFixed(3)}); secondary instrumentation candidate.`
            : `Low variance (σ²=${variance.toFixed(3)}); region well-explored, skip.`,
      });
    }

    ranked.sort((a, b) => b.variance - a.variance);

    return {
      ranked,
      top_picks: ranked.slice(0, topN),
      n_history: parsed.history.length,
      k: kUsed,
    };
  }

  /**
   * Per-job rationale lookup for explainability surfaces (UI, audit).
   */
  static rationale(jobId: string, result: SelectResult): string | null {
    const found = result.ranked.find((j) => j.job_id === jobId);
    return found ? found.rationale : null;
  }

  static readonly engineId = "CrossProcessUncertaintyDrivenSamplerEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T11-01";
}

export const crossProcessUncertaintyDrivenSamplerEngine = CrossProcessUncertaintyDrivenSamplerEngine;

export function crossProcessUncertaintyDrivenSampler(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_active_select":
      return CrossProcessUncertaintyDrivenSamplerEngine.select(params as SelectInput);
    case "xproc_active_rationale": {
      const jobId = params.job_id as string;
      const result = params.result as SelectResult;
      return { rationale: CrossProcessUncertaintyDrivenSamplerEngine.rationale(jobId, result) };
    }
    default:
      throw new Error(`crossProcessUncertaintyDrivenSampler: unknown action '${action}'`);
  }
}
