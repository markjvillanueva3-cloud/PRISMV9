// WIRE-EXEMPT: tests in __tests__/engines/ragStackU-LEARN-04.test.ts
/**
 * ReRankerEngine — U-LEARN-04
 * =============================
 *
 * Cross-encoder reranking for RAG results. Takes top-N candidates from
 * initial retrieval and refines to top-K using deeper semantic matching.
 *
 * Scoring Strategy
 * ----------------
 * Since we don't have a neural cross-encoder in pure JS, we use a
 * multi-signal scoring approach:
 * 1. Term overlap (Jaccard similarity)
 * 2. Phrase matching (bigram/trigram overlap)
 * 3. Position weighting (terms early in query weighted higher)
 * 4. Field boosting (title > tags > body)
 * 5. Length normalization
 *
 * This approximates cross-encoder behavior for manufacturing domain
 * where vocabulary is constrained and semantic drift is limited.
 *
 * @module engines/ReRankerEngine
 * @milestone PSAU P2.5-LEARN U-LEARN-04
 */

import { z } from "zod";
import { type RetrievalResult } from "../schemas/citationSchema.js";

// ─── Types ──────────────────────────────────────────────────────────────

export const ReRankInputSchema = z.object({
  query: z.string().min(1).describe("Original query"),
  candidates: z.array(z.object({
    id: z.string(),
    score: z.number(),
    source_type: z.string(),
    title: z.string().nullable(),
    excerpt: z.string().nullable(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  })).describe("Candidates from initial retrieval"),
  top_k: z.number().int().min(1).max(20).default(3).describe("Number of results to return"),
  weights: z.object({
    term_overlap: z.number().default(0.3),
    phrase_match: z.number().default(0.25),
    position: z.number().default(0.15),
    field_boost: z.number().default(0.2),
    original_score: z.number().default(0.1),
  }).optional().describe("Scoring weights"),
}).describe("ReRank input");
export type ReRankInput = z.infer<typeof ReRankInputSchema>;

export interface ReRankResult {
  query: string;
  results: RetrievalResult[];
  rerank_time_ms: number;
  candidates_evaluated: number;
  score_distribution: {
    min: number;
    max: number;
    mean: number;
  };
}

// ─── Utilities ──────────────────────────────────────────────────────────

function normalize(text: string): string[] {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length >= 2);
}

function bigrams(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 1; i++) {
    result.push(`${tokens[i]}_${tokens[i + 1]}`);
  }
  return result;
}

function trigrams(tokens: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < tokens.length - 2; i++) {
    result.push(`${tokens[i]}_${tokens[i + 1]}_${tokens[i + 2]}`);
  }
  return result;
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);
  return intersection.size / union.size;
}

// ─── Engine ─────────────────────────────────────────────────────────────

export class ReRankerEngine {
  private static readonly DEFAULT_WEIGHTS = {
    term_overlap: 0.3,
    phrase_match: 0.25,
    position: 0.15,
    field_boost: 0.2,
    original_score: 0.1,
  };

  /**
   * Rerank candidates using multi-signal scoring.
   * @param input - Query and candidates
   * @returns Reranked results
   */
  static rerank(input: ReRankInput): ReRankResult {
    const start = performance.now();

    const validated = ReRankInputSchema.safeParse(input);
    if (!validated.success) {
      return {
        query: input.query,
        results: [],
        rerank_time_ms: performance.now() - start,
        candidates_evaluated: 0,
        score_distribution: { min: 0, max: 0, mean: 0 },
      };
    }

    const { query, candidates, top_k } = validated.data;
    const weights = { ...this.DEFAULT_WEIGHTS, ...validated.data.weights };

    if (candidates.length === 0) {
      return {
        query,
        results: [],
        rerank_time_ms: performance.now() - start,
        candidates_evaluated: 0,
        score_distribution: { min: 0, max: 0, mean: 0 },
      };
    }

    // Tokenize query
    const queryTokens = normalize(query);
    const querySet = new Set(queryTokens);
    const queryBigrams = new Set(bigrams(queryTokens));
    const queryTrigrams = new Set(trigrams(queryTokens));

    // Position weights: earlier query terms matter more
    const positionWeights = new Map<string, number>();
    queryTokens.forEach((token, i) => {
      const weight = 1 - (i / (queryTokens.length + 1)) * 0.5; // 1.0 → 0.5
      positionWeights.set(token, Math.max(positionWeights.get(token) ?? 0, weight));
    });

    // Normalize original scores to [0, 1]
    const maxOriginal = Math.max(...candidates.map(c => c.score), 1);

    // Score each candidate
    const scored: Array<{ candidate: typeof candidates[0]; score: number }> = [];

    for (const candidate of candidates) {
      // Combine title and excerpt
      const titleTokens = normalize(candidate.title ?? "");
      const excerptTokens = normalize(candidate.excerpt ?? "");
      const allTokens = [...titleTokens, ...excerptTokens];
      const allSet = new Set(allTokens);

      // 1. Term overlap (Jaccard)
      const termOverlap = jaccard(querySet, allSet);

      // 2. Phrase matching
      const docBigrams = new Set(bigrams(allTokens));
      const docTrigrams = new Set(trigrams(allTokens));
      const bigramScore = jaccard(queryBigrams, docBigrams);
      const trigramScore = jaccard(queryTrigrams, docTrigrams);
      const phraseMatch = bigramScore * 0.6 + trigramScore * 0.4;

      // 3. Position-weighted term matching
      let positionScore = 0;
      for (const token of allTokens) {
        positionScore += positionWeights.get(token) ?? 0;
      }
      positionScore = Math.min(1, positionScore / Math.max(1, queryTokens.length));

      // 4. Field boosting (title matches worth more)
      const titleSet = new Set(titleTokens);
      const titleOverlap = jaccard(querySet, titleSet);
      const fieldBoost = titleOverlap * 0.7 + termOverlap * 0.3;

      // 5. Original score (normalized)
      const normalizedOriginal = candidate.score / maxOriginal;

      // Combine scores
      const finalScore =
        weights.term_overlap * termOverlap +
        weights.phrase_match * phraseMatch +
        weights.position * positionScore +
        weights.field_boost * fieldBoost +
        weights.original_score * normalizedOriginal;

      scored.push({ candidate, score: finalScore });
    }

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    // Take top-k
    const results: RetrievalResult[] = scored.slice(0, top_k).map(({ candidate, score }) => ({
      id: candidate.id,
      score,
      source_type: candidate.source_type as RetrievalResult["source_type"],
      title: candidate.title,
      excerpt: candidate.excerpt,
      metadata: candidate.metadata,
    }));

    // Stats
    const allScores = scored.map(s => s.score);
    const distribution = {
      min: Math.min(...allScores),
      max: Math.max(...allScores),
      mean: allScores.reduce((a, b) => a + b, 0) / allScores.length,
    };

    return {
      query,
      results,
      rerank_time_ms: performance.now() - start,
      candidates_evaluated: candidates.length,
      score_distribution: distribution,
    };
  }

  /**
   * Batch rerank multiple queries.
   * @param queries - Array of (query, candidates) pairs
   * @param top_k - Results per query
   * @returns Array of reranked results
   */
  static batchRerank(
    queries: Array<{ query: string; candidates: ReRankInput["candidates"] }>,
    top_k = 3
  ): ReRankResult[] {
    return queries.map(({ query, candidates }) =>
      this.rerank({ query, candidates, top_k })
    );
  }

  /**
   * Compute pairwise similarity for diversity reranking.
   * Returns candidates that are both relevant and diverse.
   * @param input - Standard rerank input
   * @param diversity_weight - Weight for diversity (0-1)
   * @returns Diverse results
   */
  static diverseRerank(input: ReRankInput, diversity_weight = 0.3): ReRankResult {
    const start = performance.now();

    // First get relevance-ranked results
    const relevanceRanked = this.rerank({ ...input, top_k: input.candidates.length });

    if (relevanceRanked.results.length <= input.top_k) {
      return {
        ...relevanceRanked,
        rerank_time_ms: performance.now() - start,
      };
    }

    // MMR-style selection: balance relevance with diversity
    const selected: RetrievalResult[] = [];
    const remaining = [...relevanceRanked.results];

    while (selected.length < input.top_k && remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i]!;
        const relevance = candidate.score;

        // Compute max similarity to already selected
        let maxSim = 0;
        for (const sel of selected) {
          const sim = this.computeSimilarity(candidate, sel);
          maxSim = Math.max(maxSim, sim);
        }

        // MMR score: relevance - diversity_weight * max_similarity
        const mmrScore = relevance - diversity_weight * maxSim;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIdx = i;
        }
      }

      selected.push(remaining[bestIdx]!);
      remaining.splice(bestIdx, 1);
    }

    return {
      query: input.query,
      results: selected,
      rerank_time_ms: performance.now() - start,
      candidates_evaluated: input.candidates.length,
      score_distribution: relevanceRanked.score_distribution,
    };
  }

  /**
   * Compute text similarity between two results.
   */
  private static computeSimilarity(a: RetrievalResult, b: RetrievalResult): number {
    const aTokens = new Set(normalize(`${a.title ?? ""} ${a.excerpt ?? ""}`));
    const bTokens = new Set(normalize(`${b.title ?? ""} ${b.excerpt ?? ""}`));
    return jaccard(aTokens, bTokens);
  }

  /**
   * Engine self-awareness.
   */
  static getSelfAwareness() {
    return {
      name: "ReRankerEngine",
      version: "1.0.0",
      milestone: "U-LEARN-04",
      capabilities: ["rerank", "batchRerank", "diverseRerank"],
      description: "Cross-encoder style reranking using multi-signal scoring (term overlap, phrase match, position, field boost)",
      scoring_signals: ["term_overlap", "phrase_match", "position", "field_boost", "original_score"],
    };
  }
}

export const reRankerEngine = ReRankerEngine;
