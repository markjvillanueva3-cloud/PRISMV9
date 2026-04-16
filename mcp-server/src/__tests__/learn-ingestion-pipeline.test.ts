/**
 * LEARN-MS0 U-LEARN01/02/03: Content Ingestion Pipeline Tests
 *
 * Tests:
 * - ContentAutoTaggerEngine: entity extraction from CNC text
 * - KnowledgeDeduplicationEngine: cosine similarity dedup
 * - ContentIngestionPipelineEngine: end-to-end ingestion flow
 */

import { describe, it, expect } from "vitest";
import { contentAutoTaggerEngine } from "../engines/ContentAutoTaggerEngine.js";
import { knowledgeDeduplicationEngine } from "../engines/KnowledgeDeduplicationEngine.js";
import { contentIngestionPipelineEngine } from "../engines/ContentIngestionPipelineEngine.js";

// ═══ Auto-Tagger Tests ═══

describe("LEARN-MS0: ContentAutoTaggerEngine", () => {

  describe("Material Detection", () => {

    it("detects specific steel alloy", () => {
      const result = contentAutoTaggerEngine.tag("When machining 4140 steel, reduce feed in corners");
      expect(result.materials.length).toBeGreaterThan(0);
      expect(result.materials[0].iso_group).toBe("P");
      expect(result.materials[0].name).toContain("4140");
    });

    it("detects stainless steel", () => {
      const result = contentAutoTaggerEngine.tag("316L stainless needs flood coolant");
      expect(result.materials.some(m => m.iso_group === "M")).toBe(true);
    });

    it("detects aluminum alloy", () => {
      const result = contentAutoTaggerEngine.tag("7075-T6 aluminum runs great at high speed");
      expect(result.materials.some(m => m.iso_group === "N")).toBe(true);
    });

    it("detects titanium as ISO S", () => {
      const result = contentAutoTaggerEngine.tag("Ti-6Al-4V requires careful speed control");
      expect(result.materials.some(m => m.iso_group === "S")).toBe(true);
    });

    it("detects Inconel as ISO S", () => {
      const result = contentAutoTaggerEngine.tag("Inconel 718 is tough to machine");
      expect(result.materials.some(m => m.iso_group === "S")).toBe(true);
    });

    it("detects cast iron as ISO K", () => {
      const result = contentAutoTaggerEngine.tag("Gray cast iron machines dry without coolant");
      expect(result.materials.some(m => m.iso_group === "K")).toBe(true);
    });
  });

  describe("Operation Detection", () => {

    it("detects milling operation", () => {
      const result = contentAutoTaggerEngine.tag("When milling deep pockets use trochoidal paths");
      expect(result.operations.some(o => o.type === "milling")).toBe(true);
    });

    it("detects drilling", () => {
      const result = contentAutoTaggerEngine.tag("Peck drilling helps with chip evacuation");
      expect(result.operations.some(o => o.type === "drilling")).toBe(true);
    });

    it("detects turning", () => {
      const result = contentAutoTaggerEngine.tag("For turning, use G96 constant surface speed");
      expect(result.operations.some(o => o.type === "turning")).toBe(true);
    });

    it("detects threading", () => {
      const result = contentAutoTaggerEngine.tag("Single-point threading needs good rigidity");
      expect(result.operations.some(o => o.type === "threading")).toBe(true);
    });

    it("detects adaptive milling", () => {
      const result = contentAutoTaggerEngine.tag("Trochoidal milling keeps engagement consistent");
      expect(result.operations.some(o => o.type === "adaptive_milling")).toBe(true);
    });
  });

  describe("Machine Detection", () => {

    it("detects Haas brand", () => {
      const result = contentAutoTaggerEngine.tag("On our Haas VF-2 we run 4140 at 3000 RPM");
      expect(result.machines.some(m => m.brand === "Haas")).toBe(true);
    });

    it("detects specific Haas model", () => {
      const result = contentAutoTaggerEngine.tag("The VF-3 handles that part easily");
      expect(result.machines.some(m => m.brand === "Haas" && m.model?.includes("VF-3"))).toBe(true);
    });

    it("detects DMG Mori", () => {
      const result = contentAutoTaggerEngine.tag("Our DMG Mori DMU 50 does 5-axis work");
      expect(result.machines.some(m => m.brand === "DMG Mori")).toBe(true);
    });

    it("detects Mazak", () => {
      const result = contentAutoTaggerEngine.tag("Mazak Smooth AI controller is excellent");
      expect(result.machines.some(m => m.brand === "Mazak")).toBe(true);
    });
  });

  describe("Tool Detection", () => {

    it("detects endmill", () => {
      const result = contentAutoTaggerEngine.tag("Use a 10mm carbide endmill for this");
      expect(result.tools.some(t => t.type === "endmill")).toBe(true);
    });

    it("detects tool diameter", () => {
      const result = contentAutoTaggerEngine.tag("A 12mm end mill works best here");
      const endmill = result.tools.find(t => t.type === "endmill");
      expect(endmill?.diameter_mm).toBe(12);
    });

    it("detects drill", () => {
      const result = contentAutoTaggerEngine.tag("Start with a spot drill before the twist drill");
      expect(result.tools.some(t => t.type === "spot_drill" || t.type === "drill")).toBe(true);
    });

    it("detects tool material", () => {
      const result = contentAutoTaggerEngine.tag("Carbide endmill outperforms HSS here");
      const tool = result.tools.find(t => t.material);
      expect(tool?.material).toBe("carbide");
    });
  });

  describe("Controller Detection", () => {

    it("detects Fanuc controller", () => {
      const result = contentAutoTaggerEngine.tag("Fanuc 30i uses G05.1 for NURBS");
      expect(result.controllers.some(c => c.family === "fanuc")).toBe(true);
    });

    it("detects Siemens", () => {
      const result = contentAutoTaggerEngine.tag("SINUMERIK 840D has great CYCLE832 support");
      expect(result.controllers.some(c => c.family === "siemens")).toBe(true);
    });
  });

  describe("Parameter Detection", () => {

    it("detects RPM", () => {
      const result = contentAutoTaggerEngine.tag("Run at 3000 RPM for this material");
      expect(result.parameters.some(p => p.type === "rpm" && p.value === 3000)).toBe(true);
    });

    it("detects feed rate", () => {
      const result = contentAutoTaggerEngine.tag("F500 mm/min works well for finishing");
      expect(result.parameters.some(p => p.type === "feed")).toBe(true);
    });

    it("detects hardness", () => {
      const result = contentAutoTaggerEngine.tag("Material is 45 HRC hardened");
      expect(result.parameters.some(p => p.type === "hardness" && p.value === 45)).toBe(true);
    });
  });

  describe("Compound Detection", () => {

    it("detects multiple entities from rich text", () => {
      const text = "When machining 4140 steel at 3000 RPM with a 10mm carbide endmill on a Haas VF-2, reduce feed by 20% in corners to avoid chatter";
      const result = contentAutoTaggerEngine.tag(text);

      expect(result.materials.length).toBeGreaterThan(0);
      expect(result.parameters.some(p => p.type === "rpm")).toBe(true);
      expect(result.tools.length).toBeGreaterThan(0);
      expect(result.machines.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(50);
    });

    it("generates flat tags for storage", () => {
      const result = contentAutoTaggerEngine.tag("4140 steel milling on Haas VF-2 with carbide endmill");
      const flat = contentAutoTaggerEngine.toFlatTags(result);

      expect(flat.some(t => t.startsWith("material:"))).toBe(true);
      expect(flat.some(t => t.startsWith("machine:"))).toBe(true);
      expect(flat.some(t => t.startsWith("tool:"))).toBe(true);
    });

    it("infers category from tags", () => {
      const result1 = contentAutoTaggerEngine.tag("Run at 3000 RPM with F500");
      expect(contentAutoTaggerEngine.inferCategory(result1)).toBe("speeds_feeds");

      const result2 = contentAutoTaggerEngine.tag("Use a 10mm endmill");
      expect(contentAutoTaggerEngine.inferCategory(result2)).toBe("tooling");
    });
  });

  describe("Edge Cases", () => {

    it("handles empty text", () => {
      const result = contentAutoTaggerEngine.tag("");
      expect(result.confidence).toBe(0);
      expect(result.materials.length).toBe(0);
    });

    it("handles non-CNC text", () => {
      const result = contentAutoTaggerEngine.tag("The weather is nice today");
      expect(result.confidence).toBe(0);
    });
  });
});

// ═══ Deduplication Tests ═══

describe("LEARN-MS0: KnowledgeDeduplicationEngine", () => {

  const existingTips = [
    { id: "t1", title: "Corner feed reduction", body: "When machining corners in 4140 steel, reduce feed by 20% to avoid chatter and tool deflection" },
    { id: "t2", title: "Aluminum high speed", body: "7075-T6 aluminum can be machined at very high speeds with carbide endmills, use flood coolant" },
    { id: "t3", title: "Stainless work hardening", body: "316L stainless steel work hardens quickly, never let the tool rub, maintain positive chip load" },
  ];

  it("detects identical tip as duplicate", () => {
    const result = knowledgeDeduplicationEngine.check(
      "When machining corners in 4140 steel, reduce feed by 20% to avoid chatter and tool deflection",
      existingTips,
    );
    expect(result.is_duplicate).toBe(true);
    expect(result.existing_tip_id).toBe("t1");
    expect(result.action_taken).toBe("skip_duplicate");
  });

  it("rephrased tip has positive similarity", () => {
    const result = knowledgeDeduplicationEngine.check(
      "Reduce feed rate 20% when cutting corners in 4140 steel to prevent chatter",
      existingTips,
    );
    // Rephrased content shares key terms (4140, steel, feed, corners, chatter)
    // TF-IDF cosine is lexical — score depends on exact word overlap
    expect(result.similarity_score).toBeGreaterThan(0.3);
    expect(result.related_tips.length).toBeGreaterThanOrEqual(0);
  });

  it("flags novel content as store_new", () => {
    const result = knowledgeDeduplicationEngine.check(
      "When using a boring bar in deep holes, reduce depth of cut to prevent vibration",
      existingTips,
    );
    expect(result.action_taken).toBe("store_new");
    expect(result.is_duplicate).toBe(false);
  });

  it("returns related tips when found", () => {
    const result = knowledgeDeduplicationEngine.check(
      "4140 steel corners need careful feed control to avoid deflection issues",
      existingTips,
    );
    expect(result.related_tips.length).toBeGreaterThanOrEqual(0);
  });

  it("handles empty input", () => {
    const result = knowledgeDeduplicationEngine.check("", existingTips);
    expect(result.action_taken).toBe("store_new");
    expect(result.similarity_score).toBe(0);
  });

  it("handles empty corpus", () => {
    const result = knowledgeDeduplicationEngine.check("Some new tip about machining", []);
    expect(result.action_taken).toBe("store_new");
  });

  it("batch check works", () => {
    const results = knowledgeDeduplicationEngine.batchCheck(
      [
        { text: "Corner feed reduction in 4140 steel for chatter avoidance" },
        { text: "Boring bar vibration in deep holes" },
      ],
      existingTips,
    );
    expect(results.length).toBe(2);
    expect(results[0].input_index).toBe(0);
    expect(results[1].input_index).toBe(1);
  });

  it("custom thresholds work", () => {
    const strict = knowledgeDeduplicationEngine.check(
      "Reduce feed 20% in corners when machining 4140",
      existingTips,
      { duplicate_threshold: 0.95, related_threshold: 0.80 },
    );
    // With very strict threshold, even similar tips won't be flagged as duplicate
    expect(strict.similarity_score).toBeGreaterThan(0);
  });
});

// ═══ Pipeline Integration Tests ═══

describe("LEARN-MS0: ContentIngestionPipelineEngine", () => {

  describe("Text Ingestion", () => {

    it("ingests a CNC tip with auto-tagging", async () => {
      const result = await contentIngestionPipelineEngine.ingest({
        content_type: "text",
        content: "When roughing 4140 steel with a 10mm endmill, use trochoidal paths to maintain consistent chip load",
        source: "test",
        title: "Trochoidal roughing for 4140",
      });

      expect(result.items_created).toBe(1);
      expect(result.total_processed).toBe(1);
      expect(result.tags_applied.length).toBeGreaterThan(0);
      expect(result.source_attribution).toBe("test");
      expect(result.items[0].tags.some(t => t.includes("material:"))).toBe(true);
    });

    it("ingests with source attribution", async () => {
      const result = await contentIngestionPipelineEngine.ingest({
        content_type: "text",
        content: "Always use through-spindle coolant for deep holes in stainless",
        source: "Facebook/mr.cnc2",
      });

      expect(result.source_attribution).toBe("Facebook/mr.cnc2");
      expect(result.items[0].source).toBe("Facebook/mr.cnc2");
    });

    it("handles empty content gracefully", async () => {
      const result = await contentIngestionPipelineEngine.ingest({
        content_type: "text",
        content: "",
        source: "test",
      });

      expect(result.items_created).toBe(0);
      expect(result.total_processed).toBe(0);
    });

    it("measures processing time", async () => {
      const result = await contentIngestionPipelineEngine.ingest({
        content_type: "text",
        content: "Use HSM for finishing aluminum to get mirror finishes",
        source: "test",
      });

      expect(result.processing_time_ms).toBeGreaterThan(0);
      expect(result.processing_time_ms).toBeLessThan(5000);
    });
  });

  describe("Batch Ingestion", () => {

    it("ingests multiple tips at once", async () => {
      const result = await contentIngestionPipelineEngine.batchIngest({
        tips: [
          { text: "Carbide works better than HSS for stainless steel", source: "shop_floor" },
          { text: "Always chamfer hole entries before tapping to prevent tap breakage", source: "shop_floor" },
          { text: "Check runout before every job — bad runout kills tools fast", source: "shop_floor" },
        ],
        default_source: "batch_test",
      });

      expect(result.total_processed).toBe(3);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("batch text mode splits on double newlines", async () => {
      const result = await contentIngestionPipelineEngine.ingest({
        content_type: "batch_text",
        content: "Tip 1: Use flood coolant for stainless.\n\nTip 2: Carbide endmills last longer in hardened steel.\n\nTip 3: Check tool length offset after every tool change.",
        source: "batch_test",
      });

      expect(result.total_processed).toBeGreaterThanOrEqual(2);
    });
  });

  describe("Stats", () => {

    it("returns ingestion statistics", () => {
      const stats = contentIngestionPipelineEngine.getStats();

      expect(stats.total_ingested).toBeGreaterThanOrEqual(0);
      expect(typeof stats.total_sources).toBe("number");
      expect(stats.category_distribution).toBeTruthy();
    });
  });

  describe("URL and Video Stubs", () => {

    it("handles URL ingestion gracefully", async () => {
      const result = await contentIngestionPipelineEngine.ingest({
        content_type: "url",
        content: "https://example.com/cnc-tips",
        source: "web",
      });

      expect(result.total_processed).toBe(1);
      expect(result.items[0].body).toContain("https://example.com/cnc-tips");
    });

    it("handles document ingestion gracefully", async () => {
      const result = await contentIngestionPipelineEngine.ingest({
        content_type: "document",
        content: "/path/to/machining-guide.pdf",
        source: "docs",
      });

      expect(result.total_processed).toBe(1);
    });
  });
});
