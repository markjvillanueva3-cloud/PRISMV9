/**
 * KnowledgeGraphFeatureProjectorEngine — XPROC-NEURAL-CONNECT-MS0 / U-CN05
 *
 * Bridges KnowledgeGraphNeuralBridgeEngine's semantic search output into a
 * fixed-length feature vector consumable by neural learners. Closes the
 * fifth edge from the system-viz analysis: KGNeuralBridge currently has 0
 * downstream callers (orphaned). This projector turns its semantic-search
 * signal into a reusable feature input for the cross-process NN, the
 * outcome-similarity engine, and any downstream consumer that needs a
 * graph-grounded prior.
 *
 * Output dimension: 8 features per OutcomeRecord. Vector layout:
 *   [0] num_results          — count of semantic-search hits (normalized 0..1 by limit)
 *   [1] top_similarity       — best-match similarity (0..1)
 *   [2] mean_similarity      — average similarity across results (0..1)
 *   [3] type_diversity       — distinct entity types in results / 8 (0..1)
 *   [4] tribal_share         — fraction of results that are tribal_tip type (0..1)
 *   [5] material_share       — fraction of results that are material entities (0..1)
 *   [6] strategy_share       — fraction of results that are strategy entities (0..1)
 *   [7] tool_share           — fraction of results that are tool entities (0..1)
 *
 * All features are bounded in [0, 1] so concatenation with NN.featurize's
 * z-scored numeric slots remains numerically stable (no scale mismatch).
 *
 * Input shape:
 *   - record: OutcomeRecord-like — request_summary fields are joined into
 *     the search query string in priority order: operation, material,
 *     tool_material, machine_family, customer.
 *
 * Failure modes:
 *   1. Empty / null record → invalid_input
 *   2. No searchable text  → returns FEATURE_DIM zeros (no-info baseline)
 *   3. KG bridge throws    → returns FEATURE_DIM zeros + warning (degrade open)
 *   4. Wrong-shape input   → invalid_input
 *
 * @engine KnowledgeGraphFeatureProjectorEngine
 * @milestone XPROC-NEURAL-CONNECT-MS0 / U-CN05
 * @see KnowledgeGraphNeuralBridgeEngine — backing semantic-search index
 * @see CrossProcessNeuralLearningEngine  — primary downstream consumer
 */

import { z } from "zod";
import { knowledgeGraphNeuralBridgeEngine, type IndexableEntityType, type SemanticResult } from "./KnowledgeGraphNeuralBridgeEngine.js";

// ============================================================================
// Constants
// ============================================================================

/** Output dimension — fixed at 8 so callers can statically allocate. */
export const KG_FEATURE_DIM = 8;
/** Default max results to fetch from KG semantic search. */
const DEFAULT_LIMIT = 10;
/** All entity types in the IndexableEntityType union — used for diversity normalization. */
const ALL_ENTITY_TYPES: IndexableEntityType[] = [
  "knowledge_atom", "tribal_tip", "reasoning_chain", "graph_node",
  "material", "tool", "machine", "strategy",
];

// ============================================================================
// Schemas
// ============================================================================

const ProjectInputSchema = z.object({
  record: z.object({
    process: z.string().optional(),
    request_summary: z.record(z.string(), z.unknown()).optional(),
  }).passthrough(),
  limit: z.number().int().min(1).max(100).optional(),
  types: z.array(z.enum([
    "knowledge_atom", "tribal_tip", "reasoning_chain", "graph_node",
    "material", "tool", "machine", "strategy",
  ])).optional(),
  minSimilarity: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Public types
// ============================================================================

export interface ProjectOk {
  ok: true;
  features: number[];
  dimension: number;
  result_count: number;
  query: string;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input";
  message: string;
}

export type ProjectResult = ProjectOk | OpErr;

// ============================================================================
// Engine
// ============================================================================

function buildQueryString(record: { process?: string; request_summary?: Record<string, unknown> }): string {
  const rs = record.request_summary ?? {};
  const parts: string[] = [];
  for (const key of ["operation", "material", "tool_material", "machine_family", "customer", "feature"]) {
    const v = rs[key];
    if (typeof v === "string" && v.length > 0) parts.push(v);
  }
  if (record.process) parts.push(record.process);
  return parts.join(" ").trim();
}

function fractionOfType(results: SemanticResult[], type: IndexableEntityType): number {
  if (results.length === 0) return 0;
  let count = 0;
  for (const r of results) if (r.entity.type === type) count++;
  return count / results.length;
}

export class KnowledgeGraphFeatureProjectorEngine {
  static readonly milestone = "XPROC-NEURAL-CONNECT-MS0";
  static readonly unit = "U-CN05";
  static readonly featureDim = KG_FEATURE_DIM;

  /**
   * Project an OutcomeRecord into a fixed 8-dimensional feature vector
   * derived from KG semantic-search results. Pure (no state mutation).
   *
   * Returns:
   *   - features: number[8] in [0, 1]
   *   - dimension: 8
   *   - result_count: number of semantic-search hits returned by KG
   *   - query: the query string built from the record
   *   - warnings: any degrade-open events (empty query, KG error)
   */
  static project(input: unknown): ProjectResult {
    const parsed = ProjectInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
      };
    }
    const { record, limit, types, minSimilarity } = parsed.data;
    const warnings: string[] = [];

    const query = buildQueryString(record);
    if (query.length === 0) {
      warnings.push("empty query (no searchable fields in record) — returning zero features");
      return {
        ok: true,
        features: new Array(KG_FEATURE_DIM).fill(0),
        dimension: KG_FEATURE_DIM,
        result_count: 0,
        query: "",
        warnings,
      };
    }

    let results: SemanticResult[];
    try {
      results = knowledgeGraphNeuralBridgeEngine.semanticSearch({
        query,
        types,
        limit: limit ?? DEFAULT_LIMIT,
        min_similarity: minSimilarity,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      warnings.push(`KG search threw: ${msg} — returning zero features (degrade open)`);
      return {
        ok: true,
        features: new Array(KG_FEATURE_DIM).fill(0),
        dimension: KG_FEATURE_DIM,
        result_count: 0,
        query,
        warnings,
      };
    }

    const effectiveLimit = limit ?? DEFAULT_LIMIT;
    const numResults = results.length;

    // [0] num_results normalized
    const normalizedCount = Math.min(1, numResults / effectiveLimit);

    // [1] top_similarity, [2] mean_similarity
    let topSim = 0;
    let meanSim = 0;
    if (numResults > 0) {
      topSim = results[0].similarity;
      let sum = 0;
      for (const r of results) sum += r.similarity;
      meanSim = sum / numResults;
    }

    // [3] type_diversity — distinct types / 8
    const uniqueTypes = new Set<IndexableEntityType>();
    for (const r of results) uniqueTypes.add(r.entity.type);
    const typeDiversity = uniqueTypes.size / ALL_ENTITY_TYPES.length;

    // [4..7] per-type shares
    const tribalShare = fractionOfType(results, "tribal_tip");
    const materialShare = fractionOfType(results, "material");
    const strategyShare = fractionOfType(results, "strategy");
    const toolShare = fractionOfType(results, "tool");

    const features = [
      clamp01(normalizedCount),
      clamp01(topSim),
      clamp01(meanSim),
      clamp01(typeDiversity),
      clamp01(tribalShare),
      clamp01(materialShare),
      clamp01(strategyShare),
      clamp01(toolShare),
    ];

    return {
      ok: true,
      features,
      dimension: KG_FEATURE_DIM,
      result_count: numResults,
      query,
      warnings,
    };
  }

  /** Read-only manifest of feature slot meanings (for downstream documentation). */
  static featureLayout(): Array<{ index: number; name: string; description: string }> {
    return [
      { index: 0, name: "num_results", description: "KG hit count normalized by limit (0..1)" },
      { index: 1, name: "top_similarity", description: "Best-match similarity score (0..1)" },
      { index: 2, name: "mean_similarity", description: "Average similarity across results (0..1)" },
      { index: 3, name: "type_diversity", description: "Distinct entity types / 8 (0..1)" },
      { index: 4, name: "tribal_share", description: "Fraction of results of type tribal_tip (0..1)" },
      { index: 5, name: "material_share", description: "Fraction of results of type material (0..1)" },
      { index: 6, name: "strategy_share", description: "Fraction of results of type strategy (0..1)" },
      { index: 7, name: "tool_share", description: "Fraction of results of type tool (0..1)" },
    ];
  }
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

export const knowledgeGraphFeatureProjectorEngine = KnowledgeGraphFeatureProjectorEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function knowledgeGraphFeatureProjectorDispatch(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_kg_project_features":
      return KnowledgeGraphFeatureProjectorEngine.project(params);
    case "xproc_kg_feature_layout":
      return { ok: true, layout: KnowledgeGraphFeatureProjectorEngine.featureLayout(), dimension: KG_FEATURE_DIM };
    default:
      throw new Error(`knowledgeGraphFeatureProjectorDispatch: unknown action '${action}'`);
  }
}
