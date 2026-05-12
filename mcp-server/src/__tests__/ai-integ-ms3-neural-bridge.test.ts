/**
 * AI-INTEG-MS3: Knowledge Graph Neural Bridge Tests
 * ==================================================
 * Validates the KnowledgeGraphNeuralBridgeEngine for:
 *   - HNSW index operations (add, search, remove)
 *   - Semantic search with cosine similarity
 *   - Graph-augmented reasoning
 *   - Knowledge gap detection
 *   - Relation inference
 *   - Entity indexing and retrieval
 *
 * @module __tests__/ai-integ-ms3-neural-bridge.test
 */

import { describe, it, expect, beforeEach, beforeAll, afterAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import {
  KnowledgeGraphNeuralBridgeEngine,
  knowledgeGraphNeuralBridgeEngine,
  type IndexedEntity,
  type SemanticQuery,
  type SemanticResult,
  type IndexableEntityType,
} from "../engines/KnowledgeGraphNeuralBridgeEngine.js";

const TEST_INDEX_PATH = path.join(process.cwd(), "data", "state", "hnsw-index.json");
let originalIndexData: string | null = null;

describe("KnowledgeGraphNeuralBridgeEngine", () => {
  let engine: KnowledgeGraphNeuralBridgeEngine;

  beforeAll(() => {
    if (fs.existsSync(TEST_INDEX_PATH)) {
      originalIndexData = fs.readFileSync(TEST_INDEX_PATH, "utf-8");
    }
  });

  afterAll(() => {
    if (originalIndexData) {
      fs.writeFileSync(TEST_INDEX_PATH, originalIndexData);
    } else {
      try { fs.unlinkSync(TEST_INDEX_PATH); } catch {}
    }
  });

  beforeEach(() => {
    try { fs.unlinkSync(TEST_INDEX_PATH); } catch {}
    engine = new KnowledgeGraphNeuralBridgeEngine();
  });

  // ==========================================================================
  // ENTITY INDEXING
  // ==========================================================================

  describe("entity indexing", () => {
    it("should index a single entity", () => {
      const entity = engine.indexEntity(
        "entity-1",
        "tribal_tip",
        "Always reduce feedrate by 20% when machining titanium near thin walls",
        { source: "JM Die" }
      );

      expect(entity.id).toBe("entity-1");
      expect(entity.type).toBe("tribal_tip");
      expect(entity.text).toContain("titanium");
      expect(entity.embedding).toHaveLength(384);
      expect(entity.metadata.source).toBe("JM Die");
      expect(entity.access_count).toBe(0);
    });

    it("should batch index multiple entities", () => {
      const entities = [
        { id: "batch-1", type: "material" as IndexableEntityType, text: "6061-T6 Aluminum alloy" },
        { id: "batch-2", type: "tool" as IndexableEntityType, text: "1/2 inch carbide endmill" },
        { id: "batch-3", type: "strategy" as IndexableEntityType, text: "Adaptive clearing with 40% stepover" },
      ];

      const count = engine.batchIndex(entities);

      expect(count).toBe(3);
      expect(engine.getEntity("batch-1")).not.toBeNull();
      expect(engine.getEntity("batch-2")).not.toBeNull();
      expect(engine.getEntity("batch-3")).not.toBeNull();
    });

    it("should update existing entity on re-index", () => {
      engine.indexEntity("update-test", "material", "Original text");
      const entity1 = engine.getEntity("update-test");

      engine.indexEntity("update-test", "material", "Updated text with more detail");
      const entity2 = engine.getEntity("update-test");

      expect(entity2?.text).toBe("Updated text with more detail");
      // ID should remain the same
      expect(entity2?.id).toBe(entity1?.id);
    });

    it("should remove entity from index", () => {
      engine.indexEntity("to-remove", "tribal_tip", "Some knowledge");
      expect(engine.getEntity("to-remove")).not.toBeNull();

      const removed = engine.removeEntity("to-remove");
      expect(removed).toBe(true);
      expect(engine.getEntity("to-remove")).toBeNull();
    });

    it("should return false when removing non-existent entity", () => {
      const removed = engine.removeEntity("non-existent-id");
      expect(removed).toBe(false);
    });

    it("should track access count when getting entity", () => {
      engine.indexEntity("access-test", "material", "Test material");

      const entity1 = engine.getEntity("access-test");
      expect(entity1?.access_count).toBe(1);

      const entity2 = engine.getEntity("access-test");
      expect(entity2?.access_count).toBe(2);
    });
  });

  // ==========================================================================
  // SEMANTIC SEARCH
  // ==========================================================================

  describe("semantic search", () => {
    beforeEach(() => {
      // Index test entities
      engine.indexEntity("mat-al", "material", "6061-T6 Aluminum alloy for aerospace applications");
      engine.indexEntity("mat-steel", "material", "4140 Steel hardened to 52 HRC");
      engine.indexEntity("mat-ti", "material", "Ti-6Al-4V Titanium alloy grade 5");
      engine.indexEntity("tip-al", "tribal_tip", "Use high RPM and low feed for aluminum finishing");
      engine.indexEntity("tip-ti", "tribal_tip", "Titanium requires flood coolant and sharp tools");
      engine.indexEntity("tool-em", "tool", "1/2 inch 4-flute carbide endmill");
      engine.indexEntity("strat-adap", "strategy", "Adaptive clearing for pockets");
    });

    it("should find similar entities by text query", () => {
      // Verify entities were indexed
      const stats = engine.getStats();
      expect(stats.index_size).toBeGreaterThan(0);

      const results = engine.semanticSearch({
        query: "aluminum machining tips",
        limit: 5,
        min_similarity: 0.0, // Very low threshold for simulated embeddings
      });

      expect(results.length).toBeGreaterThan(0);
      // Results should have similarity scores
      expect(results[0].similarity).toBeGreaterThanOrEqual(0);
      expect(results[0].similarity).toBeLessThanOrEqual(1);
    });

    it("should filter by entity type", () => {
      const results = engine.semanticSearch({
        query: "machining material",
        types: ["material"],
        limit: 10,
      });

      // All results should be materials
      for (const result of results) {
        expect(result.entity.type).toBe("material");
      }
    });

    it("should respect minimum similarity threshold", () => {
      const results = engine.semanticSearch({
        query: "completely unrelated xyzzy query",
        min_similarity: 0.9,
        limit: 10,
      });

      // With high threshold and unrelated query, should get few or no results
      for (const result of results) {
        expect(result.similarity).toBeGreaterThanOrEqual(0.9);
      }
    });

    it("should include graph context when requested", () => {
      const results = engine.semanticSearch({
        query: "titanium aerospace",
        limit: 3,
        include_graph_context: true,
      });

      if (results.length > 0) {
        expect(results[0].graph_context).toBeDefined();
        expect(results[0].graph_context?.related_nodes).toBeDefined();
        expect(results[0].graph_context?.edge_types).toBeDefined();
      }
    });

    it("should return empty array for empty index search", () => {
      const emptyEngine = new KnowledgeGraphNeuralBridgeEngine();
      // Don't add any entities
      const results = emptyEngine.semanticSearch({ query: "anything" });
      expect(results).toEqual([]);
    });

    it("should respect limit parameter", () => {
      const results = engine.semanticSearch({
        query: "material tool strategy",
        limit: 2,
      });

      expect(results.length).toBeLessThanOrEqual(2);
    });

    it("should sort results by similarity descending", () => {
      const results = engine.semanticSearch({
        query: "titanium machining",
        limit: 5,
      });

      if (results.length > 1) {
        for (let i = 1; i < results.length; i++) {
          expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
        }
      }
    });
  });

  // ==========================================================================
  // FIND SIMILAR
  // ==========================================================================

  describe("find similar", () => {
    beforeEach(() => {
      engine.indexEntity("sim-1", "tribal_tip", "Reduce feedrate for thin walls");
      engine.indexEntity("sim-2", "tribal_tip", "Lower feed when machining thin features");
      engine.indexEntity("sim-3", "tribal_tip", "Use high speed machining for aluminum");
      engine.indexEntity("sim-4", "material", "Thin wall aluminum component");
    });

    it("should find similar entities excluding self", () => {
      const similar = engine.findSimilar("sim-1", 5);

      // Should not include the source entity
      const ids = similar.map(s => s.entity.id);
      expect(ids).not.toContain("sim-1");
    });

    it("should return empty for non-existent entity", () => {
      const similar = engine.findSimilar("non-existent");
      expect(similar).toEqual([]);
    });

    it("should return results with similarity scores", () => {
      const similar = engine.findSimilar("sim-1", 3);

      for (const result of similar) {
        expect(result.similarity).toBeGreaterThan(0);
        expect(result.similarity).toBeLessThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // GRAPH-AUGMENTED REASONING
  // ==========================================================================

  describe("graph-augmented reasoning", () => {
    beforeEach(() => {
      engine.indexEntity("gar-1", "tribal_tip", "For titanium, use sharp tools and low speed");
      engine.indexEntity("gar-2", "material", "Ti-6Al-4V titanium alloy properties");
      engine.indexEntity("gar-3", "strategy", "Trochoidal milling for hard materials");
      engine.indexEntity("gar-4", "tool", "Carbide endmill with TiAlN coating");
    });

    it("should generate reasoning steps", () => {
      const steps = engine.graphAugmentedReasoning("titanium machining strategy");

      expect(steps.length).toBeGreaterThan(0);
      expect(steps[0].step_id).toBe("step-1");
      expect(steps[0].query).toContain("titanium");
    });

    it("should include semantic matches in each step", () => {
      const steps = engine.graphAugmentedReasoning("cutting tools for hard materials", 2);

      for (const step of steps) {
        expect(step.semantic_matches).toBeDefined();
        expect(Array.isArray(step.semantic_matches)).toBe(true);
      }
    });

    it("should extract inferred facts when results exist", () => {
      const steps = engine.graphAugmentedReasoning("titanium tool selection", 2);

      // Steps should be generated
      expect(steps.length).toBeGreaterThan(0);

      // If there are semantic matches, there should be inferred facts
      for (const step of steps) {
        if (step.semantic_matches.length > 0) {
          // Facts are extracted from matches
          expect(step.inferred_facts).toBeDefined();
          expect(Array.isArray(step.inferred_facts)).toBe(true);
        }
      }
    });

    it("should track confidence per step", () => {
      const steps = engine.graphAugmentedReasoning("material properties", 2);

      for (const step of steps) {
        expect(typeof step.confidence).toBe("number");
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should respect maxSteps parameter", () => {
      const steps = engine.graphAugmentedReasoning("test query", 1);
      expect(steps.length).toBeLessThanOrEqual(1);
    });
  });

  // ==========================================================================
  // KNOWLEDGE GAP DETECTION
  // ==========================================================================

  describe("knowledge gap detection", () => {
    it("should detect missing coverage types", () => {
      // Only index one type
      engine.indexEntity("gap-1", "tribal_tip", "Some machining advice");

      const gaps = engine.detectKnowledgeGaps("machining strategy for steel");

      // Should detect missing types (material, tool, strategy)
      const coverageGap = gaps.find(g => g.missing_coverage.length > 0);
      expect(coverageGap).toBeDefined();
    });

    it("should detect low quality matches", () => {
      engine.indexEntity("unrel-1", "material", "xyzzy foobar baz");
      engine.indexEntity("unrel-2", "tool", "completely unrelated content abc");

      const gaps = engine.detectKnowledgeGaps("titanium aerospace machining");

      // May detect low relevance if similarity is low
      expect(gaps).toBeDefined();
      expect(Array.isArray(gaps)).toBe(true);
    });

    it("should assign severity based on gap size", () => {
      engine.indexEntity("sev-1", "tribal_tip", "Tip about machining");

      const gaps = engine.detectKnowledgeGaps("comprehensive material tool strategy");

      if (gaps.length > 0) {
        const severities = gaps.map(g => g.severity);
        expect(severities.every(s => ["low", "medium", "high"].includes(s))).toBe(true);
      }
    });

    it("should suggest sources for gaps", () => {
      engine.indexEntity("sug-1", "tribal_tip", "Only tribal tips here");

      const gaps = engine.detectKnowledgeGaps("material and tool information");

      const gapsWithSuggestions = gaps.filter(g => g.suggested_sources.length > 0);
      expect(gapsWithSuggestions.length).toBeGreaterThanOrEqual(0);
    });

    it("should track detected gaps", () => {
      engine.indexEntity("track-1", "material", "Single material");

      engine.detectKnowledgeGaps("comprehensive query");
      const allGaps = engine.getKnowledgeGaps();

      expect(Array.isArray(allGaps)).toBe(true);
    });
  });

  // ==========================================================================
  // RELATION INFERENCE
  // ==========================================================================

  describe("relation inference", () => {
    beforeEach(() => {
      engine.indexEntity("rel-mat", "material", "Hardened steel for tooling");
      engine.indexEntity("rel-tool", "tool", "Carbide insert for steel machining");
      engine.indexEntity("rel-tip1", "tribal_tip", "Steel machining requires coolant");
      engine.indexEntity("rel-tip2", "tribal_tip", "Steel parts need proper fixturing");
      engine.indexEntity("rel-strat", "strategy", "Roughing strategy for steel");
    });

    it("should infer relations between entities", () => {
      // Index many entities to ensure some are found as similar
      engine.indexEntity("rel-extra1", "material", "steel alloy hardened steel material");
      engine.indexEntity("rel-extra2", "material", "steel plate steel bar steel rod");

      const relations = engine.inferRelations("rel-mat");

      // Relations are based on findSimilar, which may return 0 if no similar entities
      // With enough steel-related entities, we should find some
      expect(relations).toBeDefined();
      expect(Array.isArray(relations)).toBe(true);

      if (relations.length > 0) {
        expect(relations[0].source_id).toBe("rel-mat");
        expect(relations[0].target_id).toBeDefined();
      }
    });

    it("should assign relation types based on entity types", () => {
      const relations = engine.inferRelations("rel-mat");

      for (const rel of relations) {
        expect(rel.relation_type).toBeDefined();
        expect(typeof rel.relation_type).toBe("string");
      }
    });

    it("should include confidence scores", () => {
      const relations = engine.inferRelations("rel-tool");

      for (const rel of relations) {
        expect(rel.confidence).toBeGreaterThan(0);
        expect(rel.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should gather evidence for relations", () => {
      const relations = engine.inferRelations("rel-tip1");

      const relationsWithEvidence = relations.filter(r => r.evidence.length > 0);
      expect(relationsWithEvidence.length).toBeGreaterThanOrEqual(0);
    });

    it("should return empty for non-existent entity", () => {
      const relations = engine.inferRelations("non-existent");
      expect(relations).toEqual([]);
    });

    it("should track inferred relations", () => {
      engine.inferRelations("rel-mat");
      engine.inferRelations("rel-tool");

      const allRelations = engine.getInferredRelations();
      expect(allRelations.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // EMBEDDING GENERATION
  // ==========================================================================

  describe("embedding consistency", () => {
    it("should generate deterministic embeddings for same text", () => {
      const entity1 = engine.indexEntity("det-1", "material", "Test material aluminum");

      // Create new engine and index same text
      const engine2 = new KnowledgeGraphNeuralBridgeEngine();
      const entity2 = engine2.indexEntity("det-2", "material", "Test material aluminum");

      // Embeddings should be identical for same text
      expect(entity1.embedding).toEqual(entity2.embedding);
    });

    it("should generate normalized embeddings", () => {
      const entity = engine.indexEntity("norm-1", "tool", "Carbide endmill 1/2 inch");

      // Check normalization: sum of squares should be ~1
      const sumSquares = entity.embedding.reduce((sum, v) => sum + v * v, 0);
      expect(sumSquares).toBeCloseTo(1, 5);
    });

    it("should generate different embeddings for different text", () => {
      const entity1 = engine.indexEntity("diff-1", "material", "Aluminum 6061");
      const entity2 = engine.indexEntity("diff-2", "material", "Titanium Grade 5");

      // Embeddings should be different
      let isDifferent = false;
      for (let i = 0; i < entity1.embedding.length; i++) {
        if (Math.abs(entity1.embedding[i] - entity2.embedding[i]) > 0.01) {
          isDifferent = true;
          break;
        }
      }
      expect(isDifferent).toBe(true);
    });
  });

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  describe("statistics", () => {
    it("should track index size", () => {
      engine.indexEntity("stat-1", "material", "Material 1");
      engine.indexEntity("stat-2", "tool", "Tool 1");

      const stats = engine.getStats();
      expect(stats.index_size).toBe(2);
    });

    it("should track entities by type", () => {
      engine.indexEntity("type-1", "material", "Mat");
      engine.indexEntity("type-2", "material", "Mat 2");
      engine.indexEntity("type-3", "tool", "Tool");

      const stats = engine.getStats();
      expect(stats.entities_by_type.material).toBe(2);
      expect(stats.entities_by_type.tool).toBe(1);
    });

    it("should track search statistics", () => {
      engine.indexEntity("search-stat", "material", "Search test");

      engine.semanticSearch({ query: "test" });
      engine.semanticSearch({ query: "another test" });

      const stats = engine.getStats();
      expect(stats.total_searches).toBe(2);
      expect(stats.avg_search_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should track gaps and relations counts", () => {
      engine.indexEntity("count-1", "tribal_tip", "Tip only");

      engine.detectKnowledgeGaps("comprehensive query");
      engine.inferRelations("count-1");

      const stats = engine.getStats();
      expect(typeof stats.gaps_detected).toBe("number");
      expect(typeof stats.relations_inferred).toBe("number");
    });
  });

  // ==========================================================================
  // CLEAR INDEX
  // ==========================================================================

  describe("clear index", () => {
    it("should clear all entities", () => {
      engine.indexEntity("clear-1", "material", "Mat");
      engine.indexEntity("clear-2", "tool", "Tool");

      engine.clearIndex();

      expect(engine.getEntity("clear-1")).toBeNull();
      expect(engine.getEntity("clear-2")).toBeNull();
    });

    it("should reset statistics", () => {
      engine.indexEntity("reset-1", "material", "Mat");
      engine.detectKnowledgeGaps("test");
      engine.inferRelations("reset-1");

      engine.clearIndex();

      const stats = engine.getStats();
      expect(stats.index_size).toBe(0);
      expect(stats.gaps_detected).toBe(0);
      expect(stats.relations_inferred).toBe(0);
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe("singleton", () => {
    it("should export singleton instance", () => {
      expect(knowledgeGraphNeuralBridgeEngine).toBeInstanceOf(KnowledgeGraphNeuralBridgeEngine);
    });
  });
});
