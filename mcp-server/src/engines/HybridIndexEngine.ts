/**
 * HybridIndexEngine — HMEMV10 RRF fusion of BM25 + semantic results.
 *
 * Pure-core hybrid retrieval fuser: caller supplies two ranked candidate
 * lists (BM25 sparse + semantic dense) keyed by entry_id; engine fuses via
 * Reciprocal Rank Fusion (RRF) and returns one unified ranking.
 *
 * Formula:
 *   RRF(d) = Σ_listᵢ 1 / (k + rank_listᵢ(d))
 *
 * The unranked-in-a-list case treats the absent doc as rank=∞ → 0
 * contribution.  Default k=60 per Cormack et al. 2009 ("RRF outperforms
 * Condorcet").
 *
 * @module engines/HybridIndexEngine
 */

import { z } from "zod";

export const RankedHitSchema = z.object({
  entry_id: z.string().min(1).max(120),
  rank: z.number().int().min(1),
  score: z.number().refine((v) => Number.isFinite(v), {}),
});
export type RankedHit = z.infer<typeof RankedHitSchema>;

export interface FusionResult {
  entry_id: string;
  rrf_score: number;
  bm25_rank?: number;
  semantic_rank?: number;
  final_rank: number;
}

const DEFAULT_RRF_K = 60;

export class HybridIndexEngine {
  static validateHit(h: unknown): RankedHit { return RankedHitSchema.parse(h); }

  /** Reciprocal Rank Fusion over two ranked lists. */
  static fuse(
    bm25_hits: readonly RankedHit[],
    semantic_hits: readonly RankedHit[],
    opts: { k?: number; topK?: number } = {},
  ): FusionResult[] {
    if (!Array.isArray(bm25_hits) || !Array.isArray(semantic_hits)) {
      throw new Error("HybridIndex.fuse: both lists must be arrays");
    }
    for (const h of bm25_hits) RankedHitSchema.parse(h);
    for (const h of semantic_hits) RankedHitSchema.parse(h);
    const k = opts.k ?? DEFAULT_RRF_K;
    if (!Number.isFinite(k) || k <= 0) throw new Error("HybridIndex.fuse: k must be a positive finite number");

    const bm25Ranks = new Map(bm25_hits.map((h) => [h.entry_id, h.rank] as const));
    const semRanks = new Map(semantic_hits.map((h) => [h.entry_id, h.rank] as const));
    const allIds = new Set([...bm25Ranks.keys(), ...semRanks.keys()]);

    const scored: FusionResult[] = [];
    for (const id of allIds) {
      const bm = bm25Ranks.get(id);
      const sm = semRanks.get(id);
      let rrf = 0;
      if (bm !== undefined) rrf += 1 / (k + bm);
      if (sm !== undefined) rrf += 1 / (k + sm);
      scored.push({
        entry_id: id,
        rrf_score: rrf,
        bm25_rank: bm,
        semantic_rank: sm,
        final_rank: 0,
      });
    }
    scored.sort((a, b) => b.rrf_score - a.rrf_score);
    scored.forEach((s, i) => { s.final_rank = i + 1; });
    return typeof opts.topK === "number" && opts.topK > 0 ? scored.slice(0, opts.topK) : scored;
  }

  /** Render fusion for operator audit. */
  static renderFusion(results: readonly FusionResult[]): string {
    if (results.length === 0) return "[FUSION] (empty)";
    return [
      `[FUSION] ${results.length} result(s) via RRF`,
      ...results.map((r) =>
        `  #${r.final_rank}  ${r.entry_id}  rrf=${r.rrf_score.toFixed(6)}  bm25=${r.bm25_rank ?? "-"}  sem=${r.semantic_rank ?? "-"}`,
      ),
    ].join("\n");
  }
}

export const hybridIndexEngine = HybridIndexEngine;
