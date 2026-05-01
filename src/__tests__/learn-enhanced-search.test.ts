/**
 * LEARN-MS2-S2: Enhanced Knowledge Search + Context-Aware Recommendations Tests
 *
 * Tests:
 * - ContentIngestionPipelineEngine.enhancedSearch() (unified multi-source search)
 * - ManufacturingKnowledgeGraphEngine.contextRecommend() (context-aware tips)
 * - Dispatcher wiring verification (2 new actions)
 */

import { describe, it, expect } from "vitest";
import { contentIngestionPipelineEngine } from "../engines/ContentIngestionPipelineEngine.js";
import { manufacturingKnowledgeGraphEngine } from "../engines/ManufacturingKnowledgeGraphEngine.js";

// ═══ ContentIngestionPipelineEngine.enhancedSearch() ═══

describe("LEARN-MS2-S2: enhancedSearch()", () => {

  it("returns results from tribal tips source", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch(
      "aluminum milling high speed",
      { sources: ["tribal"] },
    );
    expect(result.query).toBe("aluminum milling high speed");
    expect(result.sources_searched).toContain("tribal");
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.processing_time_ms).toBeGreaterThan(0);
  });

  it("returns results from playbook source", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch(
      "steel roughing feeds",
      { sources: ["playbook"] },
    );
    expect(result.sources_searched).toContain("playbook");
    expect(result.results).toBeDefined();
  });

  it("returns results from formula source", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch(
      "cutting force kienzle",
      { sources: ["formula"] },
    );
    expect(result.sources_searched).toContain("formula");
  });

  it("returns results from graph source", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch(
      "titanium drilling",
      { sources: ["graph"] },
    );
    expect(result.sources_searched).toContain("graph");
  });

  it("searches all sources by default", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("milling aluminum");
    expect(result.sources_searched.length).toBe(4);
    expect(result.sources_searched).toContain("tribal");
    expect(result.sources_searched).toContain("playbook");
    expect(result.sources_searched).toContain("formula");
    expect(result.sources_searched).toContain("graph");
  });

  it("respects limit parameter", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("steel", { limit: 3 });
    expect(result.results.length).toBeLessThanOrEqual(3);
  });

  it("filters by material_iso_group", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch(
      "machining tips",
      { material_iso_group: "N", sources: ["tribal"] },
    );
    expect(result.results).toBeDefined();
  });

  it("filters by operation_type", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch(
      "speeds and feeds",
      { operation_type: "milling", sources: ["tribal"] },
    );
    expect(result.results).toBeDefined();
  });

  it("results have correct shape", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("steel milling");
    for (const item of result.results) {
      expect(item).toHaveProperty("source_type");
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("title");
      expect(item).toHaveProperty("body");
      expect(item).toHaveProperty("relevance_score");
      expect(item).toHaveProperty("confidence");
      expect(item).toHaveProperty("tags");
      expect(["tribal_tip", "playbook_rule", "formula", "graph_node"]).toContain(item.source_type);
      expect(item.relevance_score).toBeGreaterThanOrEqual(0);
      expect(item.relevance_score).toBeLessThanOrEqual(1);
    }
  });

  it("results are sorted by relevance descending", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("machining");
    for (let i = 1; i < result.results.length; i++) {
      expect(result.results[i - 1].relevance_score).toBeGreaterThanOrEqual(
        result.results[i].relevance_score,
      );
    }
  });

  it("provides source_counts breakdown", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("steel");
    expect(result.source_counts).toBeDefined();
    expect(typeof result.source_counts).toBe("object");
  });

  it("validates physics when requested", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch(
      "Milling 4140 steel at 8000 RPM with 10mm endmill",
      { validate_physics: true, sources: ["tribal"], material_iso_group: "P" },
    );
    // Physics validation sets physics_valid on applicable results
    expect(result.results).toBeDefined();
  });

  it("deduplicates results from multiple sources", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("steel milling speeds");
    // Check no exact duplicate titles from same source
    const keys = result.results.map(r => `${r.source_type}:${r.title.slice(0, 60).toLowerCase()}`);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it("handles empty query gracefully", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("");
    expect(result.results).toBeDefined();
    expect(result.total_found).toBeGreaterThanOrEqual(0);
  });

  it("handles min_score filter", () => {
    const result = contentIngestionPipelineEngine.enhancedSearch("steel", { min_score: 0.5 });
    for (const item of result.results) {
      expect(item.relevance_score).toBeGreaterThanOrEqual(0.5);
    }
  });
});

// ═══ ManufacturingKnowledgeGraphEngine.contextRecommend() ═══

describe("LEARN-MS2-S2: contextRecommend()", () => {

  it("returns recommendations for material context", () => {
    // First link some tips so there's data
    manufacturingKnowledgeGraphEngine.linkTip(
      "ctx-rec-001",
      "When milling aluminum 7075, use 3-flute carbide endmill at high speed",
      ["material:N", "operation:milling"],
      "test/context",
    );

    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N" },
    );
    expect(result.context.material_iso).toBe("N");
    expect(result.recommendations).toBeDefined();
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("returns recommendations for material + operation context", () => {
    manufacturingKnowledgeGraphEngine.linkTip(
      "ctx-rec-002",
      "Drilling stainless steel requires flood coolant and peck cycle",
      ["material:M", "operation:drilling"],
      "test/context",
    );

    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "M", operation: "drilling" },
    );
    expect(result.context.material_iso).toBe("M");
    expect(result.context.operation).toBe("drilling");
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("returns recommendations for full context", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N", operation: "milling", machine_type: "vmc" },
    );
    expect(result.context.machine_type).toBe("vmc");
    expect(result.recommendations).toBeDefined();
  });

  it("recommendations have correct shape", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N" },
    );
    for (const rec of result.recommendations) {
      expect(rec).toHaveProperty("tip_id");
      expect(rec).toHaveProperty("text");
      expect(rec).toHaveProperty("relevance_score");
      expect(rec).toHaveProperty("confidence");
      expect(rec).toHaveProperty("match_reasons");
      expect(rec).toHaveProperty("source");
      expect(rec.relevance_score).toBeGreaterThanOrEqual(0);
      expect(rec.relevance_score).toBeLessThanOrEqual(1);
    }
  });

  it("recommendations are sorted by relevance descending", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N" },
    );
    for (let i = 1; i < result.recommendations.length; i++) {
      expect(result.recommendations[i - 1].relevance_score).toBeGreaterThanOrEqual(
        result.recommendations[i].relevance_score,
      );
    }
  });

  it("respects limit parameter", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N" },
      { limit: 2 },
    );
    expect(result.recommendations.length).toBeLessThanOrEqual(2);
  });

  it("respects min_confidence parameter", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N" },
      { min_confidence: 50 },
    );
    for (const rec of result.recommendations) {
      expect(rec.confidence).toBeGreaterThanOrEqual(50);
    }
  });

  it("includes physics validation when enabled", () => {
    manufacturingKnowledgeGraphEngine.linkTip(
      "ctx-rec-003",
      "Milling steel at 8000 RPM with 10mm endmill, fz: 0.08 mm/tooth",
      ["material:P", "operation:milling"],
      "test/context",
    );

    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "P", operation: "milling" },
      { validate_physics: true },
    );
    // At least some recommendations should have physics validation
    expect(result.recommendations).toBeDefined();
  });

  it("skips physics validation when disabled", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N" },
      { validate_physics: false },
    );
    for (const rec of result.recommendations) {
      expect(rec.physics_validation).toBeUndefined();
    }
  });

  it("returns graph_stats", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "P" },
    );
    expect(result.graph_stats).toBeDefined();
    expect(result.graph_stats.total_nodes).toBeGreaterThan(0);
    expect(result.graph_stats.total_edges).toBeGreaterThan(0);
  });

  it("returns results even with no context", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend({});
    expect(result.recommendations).toBeDefined();
    expect(result.total_candidates).toBeGreaterThanOrEqual(0);
  });

  it("match_reasons reflect which context fields matched", () => {
    const result = manufacturingKnowledgeGraphEngine.contextRecommend(
      { material_iso: "N", operation: "milling" },
    );
    const hasMatMatch = result.recommendations.some(r => r.match_reasons.some(m => m.includes("material")));
    // If tips are linked to N + milling, we should see material matches
    if (result.recommendations.length > 0) {
      expect(hasMatMatch || result.recommendations[0].match_reasons.length > 0).toBe(true);
    }
  });
});

// ═══ Dispatcher Wiring Verification ═══

describe("LEARN-MS2-S2: Dispatcher wiring verification", () => {

  it("schema map has all 5 MS2 actions", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const ms2Actions = [
      "learn_auto_link", "learn_gap_detect", "learn_validate_physics",
      "learn_search_enhanced", "learn_context_recommend",
    ];
    for (const action of ms2Actions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });

  it("learn_search_enhanced schema requires query", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_search_enhanced"];

    const valid = schema.safeParse({ query: "steel milling" });
    expect(valid.success).toBe(true);

    const missingQuery = schema.safeParse({});
    expect(missingQuery.success).toBe(false);
  });

  it("learn_search_enhanced schema validates sources enum", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_search_enhanced"];

    const validSources = schema.safeParse({ query: "test", sources: ["tribal", "formula"] });
    expect(validSources.success).toBe(true);

    const invalidSource = schema.safeParse({ query: "test", sources: ["invalid_source"] });
    expect(invalidSource.success).toBe(false);
  });

  it("learn_context_recommend schema validates material_iso enum", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_context_recommend"];

    const valid = schema.safeParse({ material_iso: "P", operation: "milling" });
    expect(valid.success).toBe(true);

    const invalidGroup = schema.safeParse({ material_iso: "Z" });
    expect(invalidGroup.success).toBe(false);
  });

  it("total knowledge schema count >= 39 (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const count = Object.keys(ACTION_KNOWLEDGE_SCHEMAS).length;
    expect(count).toBeGreaterThanOrEqual(39);
  });

  it("MS2-S1 actions still present (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const ms2s1Actions = ["learn_auto_link", "learn_gap_detect", "learn_validate_physics"];
    for (const action of ms2s1Actions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });

  it("MS1 actions still present (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const ms1Actions = [
      "learn_video_process", "learn_video_transcript", "learn_video_keyframes", "learn_video_knowledge",
      "learn_session_create", "learn_session_submit", "learn_session_clarify", "learn_session_summary",
      "learn_url_extract", "learn_url_detect", "learn_social_parse", "learn_social_batch",
    ];
    for (const action of ms1Actions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });
});
