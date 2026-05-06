/**
 * CrossProcessNoveltyDetectorEngine — XPROC-NEURAL Tier 11 (T11-02)
 *
 * Detects whether a candidate job lies in a region of feature space that the
 * outcome ledger has rarely (or never) explored. Novelty score is the
 * normalized k-NN distance to historical events; high scores → genuinely
 * new operating regime, low scores → already-seen.
 *
 * When T2-01 (CrossProcessEpisodicMemoryEngine) ships on the same branch,
 * the detector will use episodic centroids for an O(1) lookup. Until then
 * it computes k-NN over the raw ledger (acceptable for ledgers ≤ 10K rows).
 *
 * Score normalization: distance is divided by the median k-NN distance of
 * the ledger to itself, giving a unit-free score. Threshold default 1.5
 * means "1.5× more isolated than the median historical neighborhood".
 *
 * @module CrossProcessNoveltyDetectorEngine
 */

import { z } from "zod";

const CandidateSchema = z.object({
  job_id: z.string().min(1),
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
  process: z.enum(["mill", "lathe", "wedm"]).default("mill"),
});
export type HistoryRow = z.infer<typeof HistoryRowSchema>;

const ScoreInputSchema = z.object({
  candidates: z.array(CandidateSchema).min(1),
  history: z.array(HistoryRowSchema).min(1),
  k: z.number().int().min(1).max(50).default(5),
  novelty_threshold: z.number().finite().min(0).default(1.5).describe("Score multiple of median to flag as novel"),
});
export type ScoreInput = z.infer<typeof ScoreInputSchema>;

export interface NoveltyScore {
  job_id: string;
  raw_distance: number;        // mean k-NN distance in scaled feature space
  normalized_score: number;     // raw_distance / median_self_distance
  is_novel: boolean;            // normalized_score >= threshold
  rationale: string;
}

export interface ScoreResult {
  scored: NoveltyScore[];
  novel: NoveltyScore[];
  median_self_distance: number;
  threshold: number;
}

const MATERIAL_ENC: Record<string, number> = { P: 0, M: 1, K: 2, N: 3, S: 4, H: 5 };

function dist(
  a: { material_iso: string; sf: number; fz: number; process: string },
  b: { material_iso: string; sf: number; fz: number; process: string },
  scales: { sf: number; fz: number },
): number {
  const matA = MATERIAL_ENC[a.material_iso.toUpperCase()] ?? 6;
  const matB = MATERIAL_ENC[b.material_iso.toUpperCase()] ?? 6;
  return Math.sqrt(
    (matA - matB) ** 2 +
    ((a.sf - b.sf) / scales.sf) ** 2 +
    ((a.fz - b.fz) / scales.fz) ** 2 +
    (a.process === b.process ? 0 : 1),
  );
}

function knnMeanDistance(
  point: { material_iso: string; sf: number; fz: number; process: string },
  others: Array<{ material_iso: string; sf: number; fz: number; process: string }>,
  k: number,
  scales: { sf: number; fz: number },
): number {
  const ds = others.map((o) => dist(point, o, scales)).sort((a, b) => a - b);
  const slice = ds.slice(0, Math.min(k, ds.length));
  if (slice.length === 0) return 0;
  return slice.reduce((a, b) => a + b, 0) / slice.length;
}

export class CrossProcessNoveltyDetectorEngine {
  /**
   * Score each candidate by normalized k-NN distance to history.
   * Returns scored + filtered novel subset above threshold.
   */
  static score(input: ScoreInput): ScoreResult {
    const parsed = ScoreInputSchema.parse(input);
    const k = parsed.k;
    const threshold = parsed.novelty_threshold;

    // Compute scales
    const sfMean = parsed.history.reduce((a, b) => a + b.sf, 0) / parsed.history.length;
    const fzMean = parsed.history.reduce((a, b) => a + b.fz, 0) / parsed.history.length;
    const sfStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.sf - sfMean) ** 2, 0) / parsed.history.length) || 1;
    const fzStd = Math.sqrt(parsed.history.reduce((a, b) => a + (b.fz - fzMean) ** 2, 0) / parsed.history.length) || 1;
    const scales = { sf: sfStd, fz: fzStd };

    // Compute median self-distance (each history row's k-NN to OTHER history rows)
    const selfDistances: number[] = [];
    for (let i = 0; i < parsed.history.length; i++) {
      const others = parsed.history.filter((_, j) => j !== i);
      if (others.length === 0) { selfDistances.push(0); continue; }
      selfDistances.push(knnMeanDistance(parsed.history[i], others, k, scales));
    }
    selfDistances.sort((a, b) => a - b);
    const medianSelf = selfDistances.length === 0 ? 1 : selfDistances[Math.floor(selfDistances.length / 2)] || 1e-9;

    const scored: NoveltyScore[] = [];
    for (const c of parsed.candidates) {
      const raw = knnMeanDistance(c, parsed.history, k, scales);
      const norm = raw / medianSelf;
      const isNovel = norm >= threshold;
      scored.push({
        job_id: c.job_id,
        raw_distance: raw,
        normalized_score: norm,
        is_novel: isNovel,
        rationale: isNovel
          ? `Score ${norm.toFixed(2)}× median (≥${threshold}); region underexplored — instrument carefully.`
          : `Score ${norm.toFixed(2)}× median (<${threshold}); historical analogues exist, low surprise risk.`,
      });
    }

    return {
      scored,
      novel: scored.filter((s) => s.is_novel).sort((a, b) => b.normalized_score - a.normalized_score),
      median_self_distance: medianSelf,
      threshold,
    };
  }

  static readonly engineId = "CrossProcessNoveltyDetectorEngine";
  static readonly version = "1.0.0";
  static readonly tier = "T11-02";
}

export const crossProcessNoveltyDetectorEngine = CrossProcessNoveltyDetectorEngine;

export function crossProcessNoveltyDetector(action: string, params: Record<string, unknown>): unknown {
  switch (action) {
    case "xproc_novelty_score":
      return CrossProcessNoveltyDetectorEngine.score(params as ScoreInput);
    case "xproc_novelty_alert": {
      const result = CrossProcessNoveltyDetectorEngine.score(params as ScoreInput);
      return { count: result.novel.length, novel: result.novel };
    }
    default:
      throw new Error(`crossProcessNoveltyDetector: unknown action '${action}'`);
  }
}
