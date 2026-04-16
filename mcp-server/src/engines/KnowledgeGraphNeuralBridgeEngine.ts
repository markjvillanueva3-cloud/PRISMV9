/**
 * KnowledgeGraphNeuralBridgeEngine — AI-INTEG-MS3
 * ================================================
 * Bridges the KnowledgeGraph engine with neural reasoning capabilities.
 * Enables semantic search, entity embeddings, and graph-augmented reasoning
 * across the knowledge base.
 *
 * Key Features:
 *   - HNSW-style approximate nearest neighbor search
 *   - Entity embeddings for semantic similarity
 *   - Graph-augmented reasoning chains
 *   - Knowledge gap detection via coverage analysis
 *   - Relation inference from unstructured data
 *
 * Integration Points:
 *   - KnowledgeGraphEngine (graph traversal, inference)
 *   - EmbeddingPipelineEngine (vector embeddings)
 *   - ReasoningChainSharingEngine (reasoning integration)
 *   - KnowledgeAtom system (unified knowledge)
 *
 * @module engines/KnowledgeGraphNeuralBridgeEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";
import { safeWriteSync } from "../utils/atomicWrite.js";
import { eventBus } from "./EventBus.js";

// ============================================================================
// CONSTANTS
// ============================================================================

const INDEX_PATH = path.join(process.cwd(), "data", "state", "hnsw-index.json");
const EMBEDDING_DIM = 384; // Simulated embedding dimension
const HNSW_M = 16; // Max connections per node
const HNSW_EF_CONSTRUCTION = 200; // Construction-time ef
const HNSW_EF_SEARCH = 50; // Search-time ef
const MAX_INDEX_SIZE = 50000;

// ============================================================================
// TYPES
// ============================================================================

/** Entity type for indexing */
export type IndexableEntityType =
  | "knowledge_atom"
  | "tribal_tip"
  | "reasoning_chain"
  | "graph_node"
  | "material"
  | "tool"
  | "machine"
  | "strategy";

/** Indexed entity with embedding */
export interface IndexedEntity {
  id: string;
  type: IndexableEntityType;
  text: string;
  embedding: number[];
  metadata: Record<string, unknown>;
  created_at: string;
  access_count: number;
}

/** HNSW graph node */
interface HNSWNode {
  id: string;
  level: number;
  neighbors: Map<number, string[]>; // level -> neighbor IDs
}

/** Semantic search query */
export interface SemanticQuery {
  /** Query text (will be embedded) */
  query: string;
  /** Optional pre-computed embedding */
  embedding?: number[];
  /** Entity types to search */
  types?: IndexableEntityType[];
  /** Maximum results */
  limit?: number;
  /** Minimum similarity threshold (0-1) */
  min_similarity?: number;
  /** Include graph context */
  include_graph_context?: boolean;
}

/** Semantic search result */
export interface SemanticResult {
  entity: IndexedEntity;
  similarity: number;
  graph_context?: GraphContext;
}

/** Graph context for a result */
export interface GraphContext {
  related_nodes: string[];
  edge_types: string[];
  path_to_query?: string[];
  inferred_relations: string[];
}

/** Knowledge gap analysis */
export interface KnowledgeGap {
  gap_id: string;
  description: string;
  missing_coverage: string[];
  suggested_sources: string[];
  severity: "low" | "medium" | "high";
  confidence: number;
}

/** Relation inference result */
export interface InferredRelation {
  source_id: string;
  target_id: string;
  relation_type: string;
  confidence: number;
  evidence: string[];
  inferred_at: string;
}

/** Graph-augmented reasoning step */
export interface GraphAugmentedStep {
  step_id: string;
  query: string;
  semantic_matches: SemanticResult[];
  graph_traversal: string[];
  inferred_facts: string[];
  confidence: number;
}

/** Neural bridge statistics */
export interface NeuralBridgeStats {
  index_size: number;
  entities_by_type: Record<IndexableEntityType, number>;
  total_searches: number;
  avg_search_time_ms: number;
  cache_hit_rate: number;
  gaps_detected: number;
  relations_inferred: number;
}

// ============================================================================
// HNSW INDEX (Simplified In-Memory Implementation)
// ============================================================================

class HNSWIndex {
  private nodes: Map<string, HNSWNode> = new Map();
  private entities: Map<string, IndexedEntity> = new Map();
  private entryPoint: string | null = null;
  private maxLevel: number = 0;
  private readonly m: number;
  private readonly efConstruction: number;
  private readonly efSearch: number;

  constructor(m: number = HNSW_M, efConstruction: number = HNSW_EF_CONSTRUCTION, efSearch: number = HNSW_EF_SEARCH) {
    this.m = m;
    this.efConstruction = efConstruction;
    this.efSearch = efSearch;
  }

  /**
   * Add entity to the index.
   */
  add(entity: IndexedEntity): void {
    if (this.entities.has(entity.id)) {
      // Update existing
      this.entities.set(entity.id, entity);
      return;
    }

    if (this.entities.size >= MAX_INDEX_SIZE) {
      this.evictLeastUsed();
    }

    this.entities.set(entity.id, entity);

    // Assign random level (geometric distribution)
    const level = this.randomLevel();

    const node: HNSWNode = {
      id: entity.id,
      level,
      neighbors: new Map(),
    };

    // Initialize neighbor lists for each level
    for (let l = 0; l <= level; l++) {
      node.neighbors.set(l, []);
    }

    this.nodes.set(entity.id, node);

    // Update entry point if needed
    if (this.entryPoint === null || level > this.maxLevel) {
      this.entryPoint = entity.id;
      this.maxLevel = level;
    }

    // Connect to neighbors at each level
    if (this.entities.size > 1) {
      this.connectNode(entity.id, entity.embedding, level);
    }
  }

  /**
   * Search for k nearest neighbors.
   */
  search(query: number[], k: number, efSearch?: number): Array<{ id: string; distance: number }> {
    if (this.entryPoint === null || this.entities.size === 0) {
      return [];
    }

    const ef = efSearch ?? this.efSearch;

    // Start from entry point
    let currentNode = this.entryPoint;
    let currentDist = this.distance(query, this.getEmbedding(currentNode));

    // Traverse from top level to level 1
    for (let level = this.maxLevel; level > 0; level--) {
      let changed = true;
      while (changed) {
        changed = false;
        const neighbors = this.nodes.get(currentNode)?.neighbors.get(level) ?? [];
        for (const neighbor of neighbors) {
          const dist = this.distance(query, this.getEmbedding(neighbor));
          if (dist < currentDist) {
            currentDist = dist;
            currentNode = neighbor;
            changed = true;
          }
        }
      }
    }

    // Search at level 0 with ef
    const candidates = new Map<string, number>();
    const visited = new Set<string>();
    const toVisit: Array<{ id: string; dist: number }> = [{ id: currentNode, dist: currentDist }];

    while (toVisit.length > 0 && candidates.size < ef) {
      toVisit.sort((a, b) => a.dist - b.dist);
      const { id, dist } = toVisit.shift()!;

      if (visited.has(id)) continue;
      visited.add(id);
      candidates.set(id, dist);

      const neighbors = this.nodes.get(id)?.neighbors.get(0) ?? [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          const nDist = this.distance(query, this.getEmbedding(neighbor));
          toVisit.push({ id: neighbor, dist: nDist });
        }
      }
    }

    // Return top k
    return Array.from(candidates.entries())
      .map(([id, distance]) => ({ id, distance }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, k);
  }

  /**
   * Get entity by ID.
   */
  get(id: string): IndexedEntity | null {
    const entity = this.entities.get(id);
    if (entity) {
      entity.access_count++;
    }
    return entity ?? null;
  }

  /**
   * Remove entity from index.
   */
  remove(id: string): boolean {
    if (!this.entities.has(id)) return false;

    this.entities.delete(id);
    const node = this.nodes.get(id);

    if (node) {
      // Remove from neighbors' lists
      for (const [level, neighbors] of node.neighbors) {
        for (const neighbor of neighbors) {
          const neighborNode = this.nodes.get(neighbor);
          if (neighborNode) {
            const neighborList = neighborNode.neighbors.get(level) ?? [];
            const idx = neighborList.indexOf(id);
            if (idx !== -1) neighborList.splice(idx, 1);
          }
        }
      }
      this.nodes.delete(id);
    }

    // Update entry point if needed
    if (this.entryPoint === id) {
      this.entryPoint = this.nodes.size > 0 ? this.nodes.keys().next().value : null;
      this.maxLevel = 0;
      for (const n of this.nodes.values()) {
        if (n.level > this.maxLevel) {
          this.maxLevel = n.level;
          this.entryPoint = n.id;
        }
      }
    }

    return true;
  }

  /**
   * Get index size.
   */
  size(): number {
    return this.entities.size;
  }

  /**
   * Get all entities.
   */
  getAllEntities(): IndexedEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Clear the index.
   */
  clear(): void {
    this.nodes.clear();
    this.entities.clear();
    this.entryPoint = null;
    this.maxLevel = 0;
  }

  private randomLevel(): number {
    let level = 0;
    while (Math.random() < 0.5 && level < 16) {
      level++;
    }
    return level;
  }

  private getEmbedding(id: string): number[] {
    return this.entities.get(id)?.embedding ?? [];
  }

  private distance(a: number[], b: number[]): number {
    // Cosine distance = 1 - cosine similarity
    if (a.length !== b.length || a.length === 0) return 1;

    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    if (denom === 0) return 1;

    return 1 - (dot / denom);
  }

  private connectNode(id: string, embedding: number[], level: number): void {
    const node = this.nodes.get(id);
    if (!node) return;

    // For each level, find and connect to nearest neighbors
    for (let l = Math.min(level, this.maxLevel); l >= 0; l--) {
      const candidates = this.search(embedding, this.m * 2, this.efConstruction);

      // Filter to nodes at this level
      const validNeighbors = candidates
        .filter(c => {
          const n = this.nodes.get(c.id);
          return n && n.level >= l && c.id !== id;
        })
        .slice(0, this.m);

      // Add bidirectional edges
      for (const neighbor of validNeighbors) {
        const neighborList = node.neighbors.get(l) ?? [];
        if (!neighborList.includes(neighbor.id)) {
          neighborList.push(neighbor.id);
          node.neighbors.set(l, neighborList);
        }

        const neighborNode = this.nodes.get(neighbor.id);
        if (neighborNode) {
          const nNeighborList = neighborNode.neighbors.get(l) ?? [];
          if (!nNeighborList.includes(id)) {
            nNeighborList.push(id);
            neighborNode.neighbors.set(l, nNeighborList);
          }
        }
      }
    }
  }

  private evictLeastUsed(): void {
    // Find entity with lowest access count
    let minAccess = Infinity;
    let minId: string | null = null;

    for (const [id, entity] of this.entities) {
      if (entity.access_count < minAccess) {
        minAccess = entity.access_count;
        minId = id;
      }
    }

    if (minId) {
      this.remove(minId);
    }
  }

  /**
   * Serialize index for persistence.
   */
  serialize(): { entities: IndexedEntity[]; nodes: Array<{ id: string; level: number; neighbors: Record<number, string[]> }> } {
    const nodes = Array.from(this.nodes.values()).map(n => ({
      id: n.id,
      level: n.level,
      neighbors: Object.fromEntries(n.neighbors),
    }));

    return {
      entities: Array.from(this.entities.values()),
      nodes,
    };
  }

  /**
   * Deserialize index from persistence.
   */
  deserialize(data: { entities: IndexedEntity[]; nodes: Array<{ id: string; level: number; neighbors: Record<number, string[]> }> }): void {
    this.clear();

    for (const entity of data.entities) {
      this.entities.set(entity.id, entity);
    }

    for (const node of data.nodes) {
      const neighbors = new Map<number, string[]>();
      for (const [level, ids] of Object.entries(node.neighbors)) {
        neighbors.set(parseInt(level), ids);
      }
      this.nodes.set(node.id, {
        id: node.id,
        level: node.level,
        neighbors,
      });

      if (node.level > this.maxLevel) {
        this.maxLevel = node.level;
        this.entryPoint = node.id;
      }
    }

    if (!this.entryPoint && this.nodes.size > 0) {
      this.entryPoint = this.nodes.keys().next().value;
    }
  }
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class KnowledgeGraphNeuralBridgeEngine {
  private index: HNSWIndex;
  private inferredRelations: Map<string, InferredRelation> = new Map();
  private gaps: Map<string, KnowledgeGap> = new Map();
  private stats: NeuralBridgeStats = {
    index_size: 0,
    entities_by_type: {} as Record<IndexableEntityType, number>,
    total_searches: 0,
    avg_search_time_ms: 0,
    cache_hit_rate: 0,
    gaps_detected: 0,
    relations_inferred: 0,
  };
  private searchTimes: number[] = [];

  constructor() {
    this.index = new HNSWIndex();
    this.loadIndex();
  }

  // ==========================================================================
  // INDEXING
  // ==========================================================================

  /**
   * Index an entity for semantic search.
   */
  indexEntity(
    id: string,
    type: IndexableEntityType,
    text: string,
    metadata: Record<string, unknown> = {}
  ): IndexedEntity {
    const embedding = this.generateEmbedding(text);

    const entity: IndexedEntity = {
      id,
      type,
      text,
      embedding,
      metadata,
      created_at: new Date().toISOString(),
      access_count: 0,
    };

    this.index.add(entity);
    this.updateTypeStats();

    eventBus.publish("neural_bridge", "entity_indexed", {
      id,
      type,
      text_length: text.length,
    } as Record<string, unknown>);

    return entity;
  }

  /**
   * Batch index multiple entities.
   */
  batchIndex(entities: Array<{ id: string; type: IndexableEntityType; text: string; metadata?: Record<string, unknown> }>): number {
    let indexed = 0;

    for (const e of entities) {
      this.indexEntity(e.id, e.type, e.text, e.metadata || {});
      indexed++;
    }

    this.persistIndex();
    log.info(`[NeuralBridge] Batch indexed ${indexed} entities`);

    return indexed;
  }

  /**
   * Remove entity from index.
   */
  removeEntity(id: string): boolean {
    const removed = this.index.remove(id);
    if (removed) {
      this.updateTypeStats();
      this.persistIndex();
    }
    return removed;
  }

  // ==========================================================================
  // SEMANTIC SEARCH
  // ==========================================================================

  /**
   * Perform semantic search.
   */
  semanticSearch(query: SemanticQuery): SemanticResult[] {
    const startTime = Date.now();

    // Generate or use provided embedding
    const embedding = query.embedding ?? this.generateEmbedding(query.query);
    const limit = query.limit ?? 10;
    const minSimilarity = query.min_similarity ?? 0.5;

    // Search HNSW index
    const candidates = this.index.search(embedding, limit * 2);

    // Filter and transform results
    const results: SemanticResult[] = [];

    for (const candidate of candidates) {
      const entity = this.index.get(candidate.id);
      if (!entity) continue;

      // Filter by type if specified
      if (query.types && query.types.length > 0 && !query.types.includes(entity.type)) {
        continue;
      }

      // Convert distance to similarity
      const similarity = 1 - candidate.distance;

      if (similarity < minSimilarity) continue;

      const result: SemanticResult = { entity, similarity };

      // Add graph context if requested
      if (query.include_graph_context) {
        result.graph_context = this.getGraphContext(entity.id, query.query);
      }

      results.push(result);
    }

    // Sort by similarity and limit
    results.sort((a, b) => b.similarity - a.similarity);
    const finalResults = results.slice(0, limit);

    // Update stats
    const searchTime = Date.now() - startTime;
    this.searchTimes.push(searchTime);
    if (this.searchTimes.length > 100) this.searchTimes.shift();
    this.stats.total_searches++;
    this.stats.avg_search_time_ms = this.searchTimes.reduce((a, b) => a + b, 0) / this.searchTimes.length;

    log.info(`[NeuralBridge] Semantic search: "${query.query.slice(0, 30)}..." -> ${finalResults.length} results in ${searchTime}ms`);

    return finalResults;
  }

  /**
   * Find similar entities to a given entity.
   */
  findSimilar(entityId: string, limit: number = 5): SemanticResult[] {
    const entity = this.index.get(entityId);
    if (!entity) return [];

    return this.semanticSearch({
      query: entity.text,
      embedding: entity.embedding,
      limit: limit + 1, // +1 because it will find itself
      min_similarity: 0.0, // Low threshold for simulated embeddings
    }).filter(r => r.entity.id !== entityId);
  }

  // ==========================================================================
  // GRAPH CONTEXT
  // ==========================================================================

  /**
   * Get graph context for an entity.
   */
  private getGraphContext(entityId: string, queryText: string): GraphContext {
    // Simulate graph traversal (would integrate with KnowledgeGraphEngine)
    const entity = this.index.get(entityId);
    if (!entity) {
      return {
        related_nodes: [],
        edge_types: [],
        inferred_relations: [],
      };
    }

    // Find related entities by similarity
    const similar = this.findSimilar(entityId, 3);
    const relatedNodes = similar.map(s => s.entity.id);

    // Infer edge types based on entity types
    const edgeTypes: string[] = [];
    for (const s of similar) {
      if (entity.type === "material" && s.entity.type === "tool") {
        edgeTypes.push("machined_with");
      } else if (entity.type === "tribal_tip" && s.entity.type === "tribal_tip") {
        edgeTypes.push("relates_to");
      } else {
        edgeTypes.push("similar_to");
      }
    }

    // Infer relations based on text similarity
    const inferredRelations: string[] = [];
    const queryWords = new Set(queryText.toLowerCase().split(/\s+/));
    const entityWords = new Set(entity.text.toLowerCase().split(/\s+/));
    const overlap = [...queryWords].filter(w => entityWords.has(w));

    if (overlap.length > 3) {
      inferredRelations.push(`Strong keyword overlap: ${overlap.slice(0, 3).join(", ")}`);
    }

    return {
      related_nodes: relatedNodes,
      edge_types: edgeTypes,
      inferred_relations: inferredRelations,
    };
  }

  // ==========================================================================
  // GRAPH-AUGMENTED REASONING
  // ==========================================================================

  /**
   * Perform graph-augmented reasoning.
   */
  graphAugmentedReasoning(query: string, maxSteps: number = 3): GraphAugmentedStep[] {
    const steps: GraphAugmentedStep[] = [];

    // Initial semantic search (low threshold for simulated embeddings)
    const initialResults = this.semanticSearch({
      query,
      limit: 5,
      min_similarity: 0.0,
      include_graph_context: true,
    });

    steps.push({
      step_id: "step-1",
      query,
      semantic_matches: initialResults,
      graph_traversal: [],
      inferred_facts: this.extractFacts(initialResults),
      confidence: initialResults.length > 0 ? initialResults[0].similarity : 0,
    });

    // Expand through graph
    for (let i = 1; i < maxSteps && i <= initialResults.length; i++) {
      const prevResult = initialResults[i - 1];
      if (!prevResult) break;

      // Expand from this node
      const expandedQuery = `${query} ${prevResult.entity.text.slice(0, 50)}`;
      const expandedResults = this.semanticSearch({
        query: expandedQuery,
        limit: 3,
        min_similarity: 0.0,
        include_graph_context: true,
      });

      const traversal = prevResult.graph_context?.related_nodes ?? [];

      steps.push({
        step_id: `step-${i + 1}`,
        query: expandedQuery.slice(0, 100),
        semantic_matches: expandedResults,
        graph_traversal: traversal,
        inferred_facts: this.extractFacts(expandedResults),
        confidence: expandedResults.length > 0 ? expandedResults[0].similarity * 0.9 : 0,
      });
    }

    return steps;
  }

  /**
   * Extract facts from semantic results.
   */
  private extractFacts(results: SemanticResult[]): string[] {
    const facts: string[] = [];

    for (const result of results) {
      const entity = result.entity;

      // Extract key phrases from text
      const sentences = entity.text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      if (sentences.length > 0) {
        facts.push(sentences[0].trim());
      }

      // Add type-specific facts
      if (entity.type === "tribal_tip") {
        facts.push(`Tribal knowledge: ${entity.text.slice(0, 100)}`);
      } else if (entity.type === "material") {
        facts.push(`Material property: ${entity.text.slice(0, 100)}`);
      }
    }

    return facts.slice(0, 5);
  }

  // ==========================================================================
  // KNOWLEDGE GAP DETECTION
  // ==========================================================================

  /**
   * Detect knowledge gaps for a query.
   */
  detectKnowledgeGaps(query: string): KnowledgeGap[] {
    const results = this.semanticSearch({ query, limit: 10 });
    const gaps: KnowledgeGap[] = [];

    // Check coverage by type
    const typesCovered = new Set(results.map(r => r.entity.type));
    const expectedTypes: IndexableEntityType[] = ["tribal_tip", "material", "tool", "strategy"];

    const missingTypes = expectedTypes.filter(t => !typesCovered.has(t));

    if (missingTypes.length > 0) {
      const gap: KnowledgeGap = {
        gap_id: `gap-${Date.now()}-coverage`,
        description: `Missing knowledge types for query: ${query.slice(0, 50)}`,
        missing_coverage: missingTypes,
        suggested_sources: missingTypes.map(t => `Add ${t} entries related to the query topic`),
        severity: missingTypes.length > 2 ? "high" : missingTypes.length > 1 ? "medium" : "low",
        confidence: 0.8,
      };
      gaps.push(gap);
      this.gaps.set(gap.gap_id, gap);
    }

    // Check similarity quality
    const avgSimilarity = results.length > 0
      ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length
      : 0;

    if (avgSimilarity < 0.6 && results.length > 0) {
      const gap: KnowledgeGap = {
        gap_id: `gap-${Date.now()}-quality`,
        description: `Low relevance matches for query (avg similarity: ${(avgSimilarity * 100).toFixed(0)}%)`,
        missing_coverage: ["high_relevance_content"],
        suggested_sources: ["Add more specific content matching the query topic"],
        severity: avgSimilarity < 0.4 ? "high" : "medium",
        confidence: 0.7,
      };
      gaps.push(gap);
      this.gaps.set(gap.gap_id, gap);
    }

    this.stats.gaps_detected = this.gaps.size;

    return gaps;
  }

  // ==========================================================================
  // RELATION INFERENCE
  // ==========================================================================

  /**
   * Infer relations between entities.
   */
  inferRelations(entityId: string): InferredRelation[] {
    const entity = this.index.get(entityId);
    if (!entity) return [];

    const similar = this.findSimilar(entityId, 10);
    const relations: InferredRelation[] = [];

    for (const result of similar) {
      const relationType = this.determineRelationType(entity, result.entity);
      const evidence = this.gatherEvidence(entity, result.entity);

      const relation: InferredRelation = {
        source_id: entityId,
        target_id: result.entity.id,
        relation_type: relationType,
        confidence: result.similarity,
        evidence,
        inferred_at: new Date().toISOString(),
      };

      relations.push(relation);
      this.inferredRelations.set(`${entityId}-${result.entity.id}`, relation);
    }

    this.stats.relations_inferred = this.inferredRelations.size;

    return relations;
  }

  /**
   * Determine relation type based on entity types.
   */
  private determineRelationType(source: IndexedEntity, target: IndexedEntity): string {
    const typeKey = `${source.type}-${target.type}`;

    const relationMap: Record<string, string> = {
      "material-tool": "machined_with",
      "tool-material": "machines",
      "material-strategy": "uses_strategy",
      "strategy-material": "applies_to",
      "tribal_tip-tribal_tip": "relates_to",
      "tribal_tip-material": "advises_on",
      "tribal_tip-tool": "recommends",
      "knowledge_atom-knowledge_atom": "linked_to",
      "reasoning_chain-knowledge_atom": "references",
    };

    return relationMap[typeKey] || "similar_to";
  }

  /**
   * Gather evidence for a relation.
   */
  private gatherEvidence(source: IndexedEntity, target: IndexedEntity): string[] {
    const evidence: string[] = [];

    // Text overlap evidence
    const sourceWords = new Set(source.text.toLowerCase().split(/\s+/));
    const targetWords = new Set(target.text.toLowerCase().split(/\s+/));
    const overlap = [...sourceWords].filter(w => targetWords.has(w) && w.length > 4);

    if (overlap.length > 0) {
      evidence.push(`Shared terms: ${overlap.slice(0, 5).join(", ")}`);
    }

    // Type-based evidence
    if (source.type === target.type) {
      evidence.push(`Same entity type: ${source.type}`);
    }

    // Metadata overlap
    const sourceKeys = Object.keys(source.metadata);
    const targetKeys = Object.keys(target.metadata);
    const keyOverlap = sourceKeys.filter(k => targetKeys.includes(k));

    if (keyOverlap.length > 0) {
      evidence.push(`Shared metadata keys: ${keyOverlap.join(", ")}`);
    }

    return evidence;
  }

  // ==========================================================================
  // EMBEDDING GENERATION
  // ==========================================================================

  /**
   * Generate embedding for text (simulated).
   * In production, this would call an embedding model.
   * Uses a word-based approach to capture semantic similarity.
   */
  private generateEmbedding(text: string): number[] {
    const embedding: number[] = new Array(EMBEDDING_DIM).fill(0);

    // Manufacturing domain vocabulary for semantic similarity
    const vocab: string[] = [
      // Materials (0-49)
      "aluminum", "steel", "titanium", "brass", "copper", "iron", "stainless",
      "alloy", "hardened", "annealed", "tempered", "grade", "6061", "4140", "304",
      "carbide", "cobalt", "tungsten", "ceramic", "diamond", "hss", "material",
      "metal", "plastic", "composite", "wood", "aerospace", "automotive", "medical",
      "marine", "industrial", "commercial", "thin", "thick", "soft", "hard",
      "brittle", "ductile", "machinable", "workpiece", "stock", "billet", "blank",
      "cast", "forged", "rolled", "extruded", "sheet", "plate", "bar",
      // Operations (50-99)
      "machining", "milling", "turning", "drilling", "boring", "reaming", "tapping",
      "grinding", "finishing", "roughing", "facing", "profiling", "pocketing",
      "slotting", "threading", "chamfering", "deburring", "polishing", "cutting",
      "feed", "speed", "rpm", "sfm", "ipm", "depth", "width", "stepover",
      "engagement", "radial", "axial", "helical", "ramp", "plunge", "interpolate",
      "adaptive", "trochoidal", "high", "low", "fast", "slow", "aggressive",
      "conservative", "optimal", "efficient", "productive", "quality", "precision",
      "accurate", "tolerance", "surface", "finish",
      // Tools (100-149)
      "tool", "endmill", "insert", "drill", "tap", "reamer", "bore", "cutter",
      "flute", "edge", "corner", "radius", "ball", "flat", "bullnose", "chamfer",
      "thread", "indexable", "solid", "brazed", "coated", "uncoated", "tialn",
      "ticn", "dlc", "sharp", "worn", "dull", "new", "holder", "collet", "chuck",
      "shank", "diameter", "length", "overhang", "runout", "balance", "vibration",
      "chatter", "deflection", "breakage", "wear", "life", "performance", "geometry",
      "helix", "angle", "rake", "relief",
      // Machines (150-199)
      "machine", "cnc", "mill", "lathe", "grinder", "edm", "router", "spindle",
      "axis", "3axis", "4axis", "5axis", "table", "fixture", "vise", "clamp",
      "coolant", "flood", "mist", "air", "through", "external", "controller",
      "fanuc", "haas", "mazak", "okuma", "dmg", "makino", "hurco", "program",
      "gcode", "cam", "cad", "simulation", "verification", "collision", "clearance",
      "rapid", "feed", "position", "work", "offset", "coordinate", "origin",
      "safety", "limit", "alarm", "error", "warning",
      // Strategies (200-249)
      "strategy", "approach", "technique", "method", "tip", "advice", "knowledge",
      "tribal", "experience", "practice", "best", "recommended", "avoid", "never",
      "always", "consider", "check", "verify", "ensure", "reduce", "increase",
      "optimize", "improve", "maintain", "prevent", "solve", "fix", "adjust",
      "modify", "change", "update", "calibrate", "measure", "inspect", "test",
      "validate", "confirm", "review", "analyze", "plan", "setup", "prepare",
      "execute", "monitor", "control", "track", "record", "document", "report",
      // Physics (250-299)
      "force", "power", "torque", "pressure", "temperature", "heat", "thermal",
      "stress", "strain", "load", "moment", "inertia", "friction", "resistance",
      "energy", "work", "efficiency", "mass", "weight", "density", "hardness",
      "strength", "modulus", "coefficient", "factor", "ratio", "rate", "velocity",
      "acceleration", "frequency", "amplitude", "phase", "resonance", "damping",
      "stiffness", "compliance", "deformation", "elastic", "plastic", "yield",
      "ultimate", "fracture", "fatigue", "creep", "wear", "erosion", "corrosion",
      "oxidation", "calculation", "formula", "equation",
      // Misc padding to reach 384 dimensions
      "part", "component", "feature", "pocket", "hole", "slot", "groove", "boss",
      "rib", "wall", "floor", "ceiling", "side", "top", "bottom", "inner", "outer",
      "internal", "external", "concave", "convex", "fillet", "round", "square",
      "rectangular", "circular", "curved", "straight", "parallel", "perpendicular",
      "angle", "degree", "radian", "inch", "millimeter", "micron", "thousandth",
      "dimension", "size", "scale", "proportion", "specification", "requirement",
      "standard", "custom", "special", "general", "specific", "typical", "common",
      "rare", "unique", "critical", "important", "essential", "necessary", "optional",
      "preferred", "alternative", "backup", "primary", "secondary", "tertiary",
      "first", "second", "third", "next", "previous", "current", "final", "initial",
      "intermediate", "complete", "partial", "full", "empty", "maximum", "minimum",
    ];

    // Ensure vocab has enough entries to fill embedding dimension
    while (vocab.length < EMBEDDING_DIM) {
      vocab.push(`term${vocab.length}`);
    }

    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 1);
    const wordSet = new Set(words);

    // Set embedding values based on word presence and partial matches
    for (let i = 0; i < Math.min(EMBEDDING_DIM, vocab.length); i++) {
      const term = vocab[i];

      // Exact match
      if (wordSet.has(term)) {
        embedding[i] = 1.0;
      }
      // Partial match (term is substring of a word or vice versa)
      else {
        for (const word of words) {
          if (word.includes(term) || term.includes(word)) {
            embedding[i] = 0.5;
            break;
          }
        }
      }
    }

    // Add some hash-based noise for uniqueness (small contribution)
    const hash = createHash("sha256").update(text.toLowerCase()).digest();
    for (let i = 0; i < EMBEDDING_DIM; i++) {
      const byteIndex = i % hash.length;
      const noise = ((hash[byteIndex] / 255) - 0.5) * 0.1; // Small noise
      embedding[i] += noise;
    }

    // Normalize the embedding
    const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
    if (norm === 0) {
      // If all zeros, use hash-based fallback
      for (let i = 0; i < EMBEDDING_DIM; i++) {
        const byteIndex = i % hash.length;
        embedding[i] = (hash[byteIndex] / 255) * 2 - 1;
      }
      const fallbackNorm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0));
      return embedding.map(v => v / fallbackNorm);
    }

    return embedding.map(v => v / norm);
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private loadIndex(): void {
    try {
      if (fs.existsSync(INDEX_PATH)) {
        const data = JSON.parse(fs.readFileSync(INDEX_PATH, "utf-8"));
        this.index.deserialize(data);
        this.updateTypeStats();
        log.info(`[NeuralBridge] Loaded index with ${this.index.size()} entities`);
      }
    } catch (error: any) {
      log.warn(`[NeuralBridge] Failed to load index: ${error.message}`);
    }
  }

  private persistIndex(): void {
    try {
      const data = this.index.serialize();
      safeWriteSync(INDEX_PATH, JSON.stringify(data));
    } catch (error: any) {
      log.warn(`[NeuralBridge] Failed to persist index: ${error.message}`);
    }
  }

  private updateTypeStats(): void {
    const entities = this.index.getAllEntities();
    const byType: Record<string, number> = {};

    for (const entity of entities) {
      byType[entity.type] = (byType[entity.type] || 0) + 1;
    }

    this.stats.index_size = entities.length;
    this.stats.entities_by_type = byType as Record<IndexableEntityType, number>;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * Get engine statistics.
   */
  getStats(): NeuralBridgeStats {
    return { ...this.stats };
  }

  /**
   * Get entity by ID.
   */
  getEntity(id: string): IndexedEntity | null {
    return this.index.get(id);
  }

  /**
   * Get all inferred relations.
   */
  getInferredRelations(): InferredRelation[] {
    return Array.from(this.inferredRelations.values());
  }

  /**
   * Get detected knowledge gaps.
   */
  getKnowledgeGaps(): KnowledgeGap[] {
    return Array.from(this.gaps.values());
  }

  /**
   * Clear the index.
   */
  clearIndex(): void {
    this.index.clear();
    this.inferredRelations.clear();
    this.gaps.clear();
    this.stats = {
      index_size: 0,
      entities_by_type: {} as Record<IndexableEntityType, number>,
      total_searches: 0,
      avg_search_time_ms: 0,
      cache_hit_rate: 0,
      gaps_detected: 0,
      relations_inferred: 0,
    };
    this.persistIndex();
    log.info("[NeuralBridge] Index cleared");
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const knowledgeGraphNeuralBridgeEngine = new KnowledgeGraphNeuralBridgeEngine();
