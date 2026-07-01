/**
 * RecallRankingEngine — HMEMV02 hybrid retrieval ranking.
 *
 * Pure-core ranker: combines caller-supplied semantic similarity scores
 * with recency boost + MMR (maximal marginal relevance) diversity to
 * produce a ranked retrieval list.  Sits between U-HMEMV01 TieredMemory
 * (where the candidates come from) and the LLM that consumes them.
 *
 * Scoring formula:
 *   raw_score = w_sim * sim + w_recency * recency + w_access * access_norm
 *   final_score = MMR(raw_score, λ_diversity)
 *
 * @module engines/RecallRankingEngine
 */

import { z } from "zod";

export const RankableCandidateSchema = z.object({
  candidate_id: z.string().min(1).max(120),
  key: z.string().min(1).max(200),
  similarity: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {
    message: "similarity must be in [0,1]",
  }),
  accessed_at: z.string().min(1),
  access_count: z.number().int().min(0),
  embedding: z.array(z.number()).optional(),
});
export type RankableCandidate = z.infer<typeof RankableCandidateSchema>;

export const RankingWeightsSchema = z.object({
  similarity: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {}),
  recency: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {}),
  access_frequency: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {}),
  mmr_lambda: z.number().refine((v) => Number.isFinite(v) && v >= 0 && v <= 1, {}),
}).refine(
  (w) => Math.abs((w.similarity + w.recency + w.access_frequency) - 1.0) < 1e-9,
  { message: "weights must sum to 1.0 (similarity + recency + access_frequency)" },
);
export type RankingWeights = z.infer<typeof RankingWeightsSchema>;

export const DEFAULT_WEIGHTS: RankingWeights = {
  similarity: 0.6, recency: 0.25, access_frequency: 0.15, mmr_lambda: 0.7,
};

export interface RankedResult {
  candidate_id: string;
  key: string;
  raw_score: number;
  final_score: number;
  rank: number;
}

/** Recency-decay constants — half-life 24h. */
const RECENCY_HALF_LIFE_MS = 24 * 60 * 60 * 1000;
const MAX_ACCESS_NORM = 20;

export class RecallRankingEngine {
  static validateCandidate(c: unknown): RankableCandidate { return RankableCandidateSchema.parse(c); }
  static validateWeights(w: unknown): RankingWeights { return RankingWeightsSchema.parse(w); }

  /** Exponential recency decay: score in [0,1] where 1.0 = freshly accessed,
   *  0.5 = accessed 24h ago, etc. */
  static recencyScore(accessed_at: string, now_at: string): number {
    const ageMs = Math.max(0, Date.parse(now_at) - Date.parse(accessed_at));
    return Math.pow(0.5, ageMs / RECENCY_HALF_LIFE_MS);
  }

  /** Normalize access count to [0,1] via min(count/MAX, 1). */
  static accessNorm(count: number): number {
    if (!Number.isFinite(count) || count < 0) return 0;
    return Math.min(count / MAX_ACCESS_NORM, 1);
  }

  /** Compute raw composite score (no MMR yet). */
  static rawScore(
    cand: RankableCandidate,
    weights: RankingWeights,
    now_at: string,
  ): number {
    const rec = RecallRankingEngine.recencyScore(cand.accessed_at, now_at);
    const acc = RecallRankingEngine.accessNorm(cand.access_count);
    return (
      weights.similarity * cand.similarity
      + weights.recency * rec
      + weights.access_frequency * acc
    );
  }

  /** Cosine similarity between two equal-length vectors. */
  private static cosine(a: readonly number[], b: readonly number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;
    let dot = 0, an = 0, bn = 0;
    for (let i = 0; i < a.length; i += 1) {
      dot += a[i] * b[i];
      an += a[i] * a[i];
      bn += b[i] * b[i];
    }
    const denom = Math.sqrt(an) * Math.sqrt(bn);
    return denom === 0 ? 0 : dot / denom;
  }

  /**
   * Rank candidates with MMR diversity.  MMR(c) = λ · raw(c) − (1−λ) ·
   * max_{s∈selected} sim(c, s).  When candidates lack embeddings, MMR
   * degrades to raw-score sort.  Returns top-K (default: all) in ranked order.
   */
  static rank(
    candidates: readonly RankableCandidate[],
    weights: RankingWeights = DEFAULT_WEIGHTS,
    now_at: string = new Date().toISOString(),
    topK?: number,
  ): RankedResult[] {
    if (!Array.isArray(candidates)) {
      throw new Error("RecallRanking.rank: candidates must be an array");
    }
    RankingWeightsSchema.parse(weights);
    for (const c of candidates) RankableCandidateSchema.parse(c);
    if (candidates.length === 0) return [];

    // Pre-compute raw scores.
    const raws = candidates.map((c) => ({ c, raw: RecallRankingEngine.rawScore(c, weights, now_at) }));

    // MMR loop: pick best, then iteratively pick the candidate that maximizes
    // λ·raw − (1−λ)·max_sim_to_already_selected.
    const selected: typeof raws = [];
    const remaining = [...raws];
    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;
      for (let i = 0; i < remaining.length; i += 1) {
        const cand = remaining[i];
        let maxSim = 0;
        if (cand.c.embedding && selected.length > 0) {
          for (const s of selected) {
            if (s.c.embedding) {
              const sim = RecallRankingEngine.cosine(cand.c.embedding, s.c.embedding);
              if (sim > maxSim) maxSim = sim;
            }
          }
        }
        const mmr = weights.mmr_lambda * cand.raw - (1 - weights.mmr_lambda) * maxSim;
        if (mmr > bestScore) {
          bestScore = mmr;
          bestIdx = i;
        }
      }
      const picked = remaining.splice(bestIdx, 1)[0];
      selected.push(picked);
    }

    const out: RankedResult[] = selected.map((s, i) => ({
      candidate_id: s.c.candidate_id,
      key: s.c.key,
      raw_score: s.raw,
      final_score: weights.mmr_lambda * s.raw, // representative MMR-aware score
      rank: i + 1,
    }));
    return typeof topK === "number" && topK > 0 ? out.slice(0, topK) : out;
  }

  /** Render the ranking for operator audit. */
  static renderRanking(results: readonly RankedResult[]): string {
    if (results.length === 0) return "[RANKING] (empty)";
    return [
      `[RANKING] ${results.length} result(s)`,
      ...results.map((r) =>
        `  #${r.rank}  ${r.key.padEnd(20).slice(0, 20)} raw=${r.raw_score.toFixed(4)} final=${r.final_score.toFixed(4)}`,
      ),
    ].join("\n");
  }
}

export const recallRankingEngine = RecallRankingEngine;
