/**
 * EmbeddingRouterEngine — HMEMV04 embedding-space routing (Euclidean vs hyperbolic).
 *
 * Pure-core router that picks between Euclidean (cosine) and hyperbolic
 * (Poincaré-ball) embedding spaces based on caller-supplied corpus
 * heuristics: hierarchy depth, branching factor, taxonomic structure.
 *
 * Decision rule:
 *   - hyperbolic preferred when avg hierarchy depth > 3 OR branching factor > 10
 *   - Euclidean otherwise
 *
 * @module engines/EmbeddingRouterEngine
 */

import { z } from "zod";

export const EmbeddingSpaceSchema = z.enum(["euclidean", "hyperbolic"]);
export type EmbeddingSpace = z.infer<typeof EmbeddingSpaceSchema>;

export const CorpusProfileSchema = z.object({
  corpus_id: z.string().min(1).max(120),
  doc_count: z.number().int().min(0),
  avg_hierarchy_depth: z.number().refine((v) => Number.isFinite(v) && v >= 0, {}),
  avg_branching_factor: z.number().refine((v) => Number.isFinite(v) && v >= 0, {}),
  has_taxonomy: z.boolean().default(false),
});
export type CorpusProfile = z.infer<typeof CorpusProfileSchema>;

export const RoutingDecisionSchema = z.object({
  corpus_id: z.string(),
  recommended_space: EmbeddingSpaceSchema,
  hyperbolic_score: z.number(),
  euclidean_score: z.number(),
  reason: z.string(),
});
export type RoutingDecision = z.infer<typeof RoutingDecisionSchema>;

const HIERARCHY_THRESHOLD = 3;
const BRANCHING_THRESHOLD = 10;

export class EmbeddingRouterEngine {
  static validateProfile(p: unknown): CorpusProfile { return CorpusProfileSchema.parse(p); }

  /** Pick an embedding space based on corpus profile. */
  static route(profile: CorpusProfile): RoutingDecision {
    CorpusProfileSchema.parse(profile);
    const hyper_h = profile.avg_hierarchy_depth > HIERARCHY_THRESHOLD ? 0.5 : 0;
    const hyper_b = profile.avg_branching_factor > BRANCHING_THRESHOLD ? 0.4 : 0;
    const hyper_t = profile.has_taxonomy ? 0.2 : 0;
    const hyperbolic_score = hyper_h + hyper_b + hyper_t;
    const euclidean_score = 1 - hyperbolic_score;
    const recommended = hyperbolic_score > 0.5 ? "hyperbolic" : "euclidean";
    const reasons: string[] = [];
    if (hyper_h > 0) reasons.push(`hierarchy depth ${profile.avg_hierarchy_depth} > ${HIERARCHY_THRESHOLD}`);
    if (hyper_b > 0) reasons.push(`branching factor ${profile.avg_branching_factor} > ${BRANCHING_THRESHOLD}`);
    if (hyper_t > 0) reasons.push("has explicit taxonomy");
    const reason = reasons.length === 0
      ? "flat corpus, no hierarchy/taxonomy signal"
      : `hyperbolic signal: ${reasons.join(", ")}`;
    return RoutingDecisionSchema.parse({
      corpus_id: profile.corpus_id,
      recommended_space: recommended,
      hyperbolic_score,
      euclidean_score,
      reason,
    });
  }

  /** Render decision for operator audit. */
  static renderDecision(d: RoutingDecision): string {
    return `[ROUTE ${d.corpus_id}] → ${d.recommended_space} (hyp=${d.hyperbolic_score.toFixed(2)} euc=${d.euclidean_score.toFixed(2)}) — ${d.reason}`;
  }
}

export const embeddingRouterEngine = EmbeddingRouterEngine;
