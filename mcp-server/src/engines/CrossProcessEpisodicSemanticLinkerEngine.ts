/**
 * CrossProcessEpisodicSemanticLinkerEngine — XPROC-NEURAL Tier 2 (T2-04)
 *
 * Closes the loop between *episodic* memory (T2-01: "what happened on a
 * specific job") and *semantic* memory (the knowledge graph: tribal tips,
 * physics citations, material substitution rules). For each retrieved
 * episode, attaches the relevant tribal-knowledge entries + Kienzle/Taylor/
 * shop-rule citations so the downstream consumer (operator UI, MLP loss
 * weighting, AGI reasoning) can ground the prediction in named precedent.
 *
 * Why a separate engine vs. inline lookup:
 *   - Episodic store and KG live in different stores with different update
 *     cadences (episodes are append-only event-sourced; KG entries are
 *     curated and revised). The linker is the *join* in BCNF: it owns the
 *     matching algorithm, scoring weights, and threshold decisions, so
 *     callers don't reinvent join logic for each access path.
 *   - Lets us swap the matching algorithm (currently keyword + categorical;
 *     could become semantic vector match in T6 federated mode) without
 *     touching either source store.
 *
 * Matching algorithm (deterministic, no I/O):
 *   For each episode:
 *     For each candidate tip/citation:
 *       categorical_score = match on (process, material_cluster) [0..1]
 *       keyword_score     = Jaccard over (episode.feature ∪ episode.outcome)
 *                            and tip.keywords [0..1]
 *       combined = w_cat·categorical_score + w_kw·keyword_score
 *     Keep top-K above min_combined_score.
 *
 * Standalone — caller passes:
 *   - the episodes array
 *   - the tip catalog (each with {keywords, processFilter?, materialFilter?, body})
 *   - the citation catalog (Kienzle/Taylor reference rules with
 *     {ruleId, processFilter, materialFilter, formula})
 *
 * Engine does NOT read from disk or call other engines — pure data join.
 *
 * Failure modes covered:
 *   1. Empty episodes → empty enriched array
 *   2. Empty tip+citation catalogs → enriched episodes with zero attachments
 *      (and per-episode hasCitation=false flag for caller to surface)
 *   3. No tips/citations match any episode → coverageRatio = 0 reported
 *   4. Bad tip entry (missing keywords) → tip is skipped, warning emitted
 *   5. Excessive K → bounded by tip catalog size + min_combined_score gate
 *   6. Categorical filter mismatch → tip is excluded for that episode (not
 *      forced via fallback)
 *   7. Tip with 100% material wildcard ("*") → matches any material with
 *      categorical_score = 0.5 (partial credit)
 *
 * @module CrossProcessEpisodicSemanticLinkerEngine
 */

import { z } from "zod";

// ============================================================================
// Schemas
// ============================================================================

const PROCESSES = ["mill", "lathe", "wedm"] as const;
const OUTCOMES = ["success", "marginal", "fail"] as const;

const EpisodeInputSchema = z.object({
  id: z.string().min(1).max(128),
  process: z.enum(PROCESSES),
  material: z.string().min(1).max(64),
  feature: z.string().min(1).max(64),
  outcome: z.enum(OUTCOMES).optional(),
});

const TipInputSchema = z.object({
  tipId: z.string().min(1).max(128),
  keywords: z.array(z.string().min(1).max(64)).min(1).max(64),
  body: z.string().min(1).max(4096),
  processFilter: z.array(z.enum(PROCESSES)).optional(),
  materialFilter: z.array(z.string().min(1).max(64)).optional(),
});

const CitationInputSchema = z.object({
  ruleId: z.string().min(1).max(128),
  formula: z.string().min(1).max(256),
  citation: z.string().min(1).max(256),
  processFilter: z.array(z.enum(PROCESSES)).optional(),
  materialFilter: z.array(z.string().min(1).max(64)).optional(),
  keywords: z.array(z.string().min(1).max(64)).optional(),
});

const EnrichInputSchema = z.object({
  episodes: z.array(EpisodeInputSchema),
  tips: z.array(TipInputSchema).default([]),
  citations: z.array(CitationInputSchema).default([]),
  topK: z.number().int().positive().max(50).default(5),
  minCombinedScore: z.number().min(0).max(1).default(0.2),
  weightCategorical: z.number().min(0).max(1).default(0.5),
});

// ============================================================================
// Public types
// ============================================================================

export type LinkerProcess = (typeof PROCESSES)[number];

export interface SemanticTip {
  tipId: string;
  keywords: string[];
  body: string;
  processFilter?: LinkerProcess[];
  materialFilter?: string[];
}

export interface SemanticCitation {
  ruleId: string;
  formula: string;
  citation: string;
  processFilter?: LinkerProcess[];
  materialFilter?: string[];
  keywords?: string[];
}

export interface AttachedTip {
  tipId: string;
  body: string;
  combinedScore: number;
  categoricalScore: number;
  keywordScore: number;
}

export interface AttachedCitation {
  ruleId: string;
  formula: string;
  citation: string;
  combinedScore: number;
}

export interface EnrichedEpisode {
  episodeId: string;
  process: LinkerProcess;
  material: string;
  feature: string;
  tips: AttachedTip[];
  citations: AttachedCitation[];
  hasCitation: boolean;
  hasTip: boolean;
}

export interface EnrichResponse {
  enriched: EnrichedEpisode[];
  totalEpisodes: number;
  episodesWithCitation: number;
  episodesWithTip: number;
  citationCoverageRatio: number;
  tipCoverageRatio: number;
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

/** Wildcard token for cross-material applicability ("*" or "any"). */
const MATERIAL_WILDCARD = new Set(["*", "any", "all"]);

/** Score awarded when a wildcard filter matches (partial credit, lower than
 *  exact match). */
const WILDCARD_MATCH_SCORE = 0.5;

// ============================================================================
// Helpers
// ============================================================================

/** Jaccard similarity over two keyword sets (case-insensitive). */
function jaccardKeywords(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a.map((s) => s.trim().toLowerCase()));
  const setB = new Set(b.map((s) => s.trim().toLowerCase()));
  let inter = 0;
  for (const k of setA) if (setB.has(k)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Categorical score: 1.0 for exact match, WILDCARD_MATCH_SCORE for wildcard,
 *  0 for explicit non-match. Filter undefined → no constraint → 1.0. */
function categoricalScore(
  episodeProcess: LinkerProcess,
  episodeMaterial: string,
  processFilter: LinkerProcess[] | undefined,
  materialFilter: string[] | undefined,
): number {
  const procScore = (() => {
    if (!processFilter || processFilter.length === 0) return 1;
    if (processFilter.includes(episodeProcess)) return 1;
    return 0;
  })();
  const matScore = (() => {
    if (!materialFilter || materialFilter.length === 0) return 1;
    const mat = episodeMaterial.trim().toUpperCase();
    let exactMatch = false;
    let wildcardMatch = false;
    for (const f of materialFilter) {
      const ff = f.trim().toLowerCase();
      if (MATERIAL_WILDCARD.has(ff)) {
        wildcardMatch = true;
        continue;
      }
      if (f.trim().toUpperCase() === mat) {
        exactMatch = true;
        break;
      }
    }
    if (exactMatch) return 1;
    if (wildcardMatch) return WILDCARD_MATCH_SCORE;
    return 0;
  })();
  // Both dimensions must score > 0 for the candidate to be considered (AND
  // semantics on filters); zero in either dimension blocks the candidate.
  if (procScore === 0 || matScore === 0) return 0;
  // Combined: average — wildcard mat + exact proc → 0.75, both exact → 1.0
  return (procScore + matScore) / 2;
}

function episodeKeywords(ep: z.infer<typeof EpisodeInputSchema>): string[] {
  const out = [ep.feature];
  if (ep.outcome) out.push(ep.outcome);
  return out;
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessEpisodicSemanticLinkerEngine {
  static readonly tier = "T2-04";

  /**
   * Enrich episodes with relevant tips and citations. Pure data join — no I/O.
   */
  static enrich(input: unknown): EnrichResponse {
    const parsed = EnrichInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        enriched: [],
        totalEpisodes: 0,
        episodesWithCitation: 0,
        episodesWithTip: 0,
        citationCoverageRatio: 0,
        tipCoverageRatio: 0,
        warnings: [
          parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
        ],
      };
    }
    const { episodes, tips, citations, topK, minCombinedScore, weightCategorical } =
      parsed.data;
    const wCat = weightCategorical;
    const wKw = 1 - wCat;
    const warnings: string[] = [];

    // Validate tip catalog (extra defense beyond Zod — Zod already rejects
    // empty keywords arrays, but log a warning for any tip we drop).
    const validTips = tips.filter((t) => {
      if (!t.keywords || t.keywords.length === 0) {
        warnings.push(`tip ${t.tipId} dropped: no keywords`);
        return false;
      }
      return true;
    });

    const enriched: EnrichedEpisode[] = episodes.map((ep) => {
      const epKw = episodeKeywords(ep);
      const tipScored: AttachedTip[] = [];
      const citScored: AttachedCitation[] = [];

      for (const t of validTips) {
        const cat = categoricalScore(ep.process, ep.material, t.processFilter, t.materialFilter);
        if (cat === 0) continue;
        const kw = jaccardKeywords(epKw, t.keywords);
        const combined = wCat * cat + wKw * kw;
        if (combined < minCombinedScore) continue;
        tipScored.push({
          tipId: t.tipId,
          body: t.body,
          combinedScore: combined,
          categoricalScore: cat,
          keywordScore: kw,
        });
      }

      for (const c of citations) {
        const cat = categoricalScore(ep.process, ep.material, c.processFilter, c.materialFilter);
        if (cat === 0) continue;
        const kw = c.keywords && c.keywords.length > 0
          ? jaccardKeywords(epKw, c.keywords)
          : 0;
        const combined = wCat * cat + wKw * kw;
        if (combined < minCombinedScore) continue;
        citScored.push({
          ruleId: c.ruleId,
          formula: c.formula,
          citation: c.citation,
          combinedScore: combined,
        });
      }

      tipScored.sort((a, b) => b.combinedScore - a.combinedScore);
      citScored.sort((a, b) => b.combinedScore - a.combinedScore);

      const topTips = tipScored.slice(0, topK);
      const topCits = citScored.slice(0, topK);

      return {
        episodeId: ep.id,
        process: ep.process,
        material: ep.material,
        feature: ep.feature,
        tips: topTips,
        citations: topCits,
        hasTip: topTips.length > 0,
        hasCitation: topCits.length > 0,
      };
    });

    const total = enriched.length;
    const withCit = enriched.filter((e) => e.hasCitation).length;
    const withTip = enriched.filter((e) => e.hasTip).length;
    return {
      enriched,
      totalEpisodes: total,
      episodesWithCitation: withCit,
      episodesWithTip: withTip,
      citationCoverageRatio: total === 0 ? 0 : withCit / total,
      tipCoverageRatio: total === 0 ? 0 : withTip / total,
      warnings,
    };
  }
}

export const crossProcessEpisodicSemanticLinkerEngine = CrossProcessEpisodicSemanticLinkerEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessEpisodicSemanticLinker(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_episodic_semantic_join":
      return CrossProcessEpisodicSemanticLinkerEngine.enrich(params);
    default:
      throw new Error(`crossProcessEpisodicSemanticLinker: unknown action '${action}'`);
  }
}
