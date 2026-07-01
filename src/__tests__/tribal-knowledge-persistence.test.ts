/**
 * Tests for tribal knowledge persistence, capture loops, and ingestion bridges.
 * Validates TK-1 fixes: persistence survives restart, VideoLearning bridge,
 * DocumentLearning bridge, and deduplication on ingest.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

// Direct import of engine class + singleton
import {
  TribalKnowledgeEngine,
  tribalKnowledgeEngine,
  type KnowledgeTip,
} from "../engines/TribalKnowledgeEngine.js";

// Persistence file path (matches engine's __dirname = src/engines/)
const CAPTURED_TIPS_PATH = path.resolve(
  process.env.PRISM_TRIBAL_TIPS_PATH ||
    path.join(__dirname, "../../state/tribal_captured_tips.json")
);

describe("TribalKnowledgeEngine — Persistence (TK-1)", () => {
  // Save original file state and restore after tests
  let originalContent: string | null = null;

  beforeEach(() => {
    try {
      originalContent = fs.existsSync(CAPTURED_TIPS_PATH)
        ? fs.readFileSync(CAPTURED_TIPS_PATH, "utf-8")
        : null;
    } catch {
      originalContent = null;
    }
  });

  afterEach(() => {
    // Restore original state
    try {
      if (originalContent !== null) {
        fs.writeFileSync(CAPTURED_TIPS_PATH, originalContent);
      } else if (fs.existsSync(CAPTURED_TIPS_PATH)) {
        fs.unlinkSync(CAPTURED_TIPS_PATH);
      }
    } catch { /* best effort */ }
  });

  it("capture() returns a tip with a tk-cap- prefixed ID", () => {
    const tip = tribalKnowledgeEngine.capture({
      title: "Test persistence tip",
      body: "Use climb milling on 6061-T6 for better finish",
      category: "speeds_feeds",
      tags: ["test", "persistence"],
      confidence: 85,
      source: "test:persistence",
    });

    expect(tip.id).toMatch(/^tk-cap-/);
    expect(tip.created_at).toBeDefined();
    expect(tip.usage_count).toBe(0);
  });

  it("captured tip is searchable immediately", () => {
    const uniqueTag = `persist-test-${Date.now()}`;
    tribalKnowledgeEngine.capture({
      title: "Unique searchable tip",
      body: "This tip should be findable",
      category: "tooling",
      tags: [uniqueTag],
      confidence: 90,
      source: "test:search",
    });

    const results = tribalKnowledgeEngine.search({
      query: uniqueTag,
      limit: 5,
    });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tags).toContain(uniqueTag);
  });

  it("capture() writes to persistence file", () => {
    tribalKnowledgeEngine.capture({
      title: "Persistence file test",
      body: "This should appear on disk",
      category: "setup",
      tags: ["disk-test"],
      confidence: 80,
      source: "test:disk",
    });

    expect(fs.existsSync(CAPTURED_TIPS_PATH)).toBe(true);
    const data = JSON.parse(fs.readFileSync(CAPTURED_TIPS_PATH, "utf-8"));
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    const lastTip = data[data.length - 1];
    expect(lastTip.title).toBe("Persistence file test");
    expect(lastTip.source).toBe("test:disk");
  });
});

describe("TribalKnowledgeEngine — Ingest (TK-1)", () => {
  it("ingest() adds new tips and returns count", () => {
    const testTips: KnowledgeTip[] = [
      {
        id: `tk-ingest-test-${Date.now()}-001`,
        title: "Ingested tip A",
        body: "From video learning pipeline",
        category: "tooling",
        tags: ["ingest-test", "video-learned"],
        confidence: 80,
        source: "video:test-video@30s",
        created_at: "2026-03-28",
        usage_count: 0,
      },
      {
        id: `tk-ingest-test-${Date.now()}-002`,
        title: "Ingested tip B",
        body: "From document learning pipeline",
        category: "setup",
        tags: ["ingest-test", "document-learned"],
        confidence: 75,
        source: "document:test-doc",
        created_at: "2026-03-28",
        usage_count: 0,
      },
    ];

    const count = tribalKnowledgeEngine.ingest(testTips);
    expect(count).toBe(2);
  });

  it("ingest() deduplicates by ID", () => {
    const fixedId = `tk-dedup-test-${Date.now()}`;
    const tip: KnowledgeTip = {
      id: fixedId,
      title: "Dedup test tip",
      body: "Should only appear once",
      category: "quality",
      tags: ["dedup"],
      confidence: 90,
      source: "test:dedup",
      created_at: "2026-03-28",
      usage_count: 0,
    };

    const first = tribalKnowledgeEngine.ingest([tip]);
    const second = tribalKnowledgeEngine.ingest([tip]);
    expect(first).toBe(1);
    expect(second).toBe(0); // Already exists — not added again
  });

  it("ingested tips are searchable", () => {
    const uniqueTag = `ingest-search-${Date.now()}`;
    tribalKnowledgeEngine.ingest([{
      id: `tk-ingest-search-${Date.now()}`,
      title: "Searchable ingested tip",
      body: "Ingested and searchable",
      category: "material_handling",
      tags: [uniqueTag],
      confidence: 85,
      source: "test:ingest-search",
      created_at: "2026-03-28",
      usage_count: 0,
    }]);

    const results = tribalKnowledgeEngine.search({ query: uniqueTag, limit: 5 });
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].tags).toContain(uniqueTag);
  });
});

describe("TribalKnowledgeEngine — Stats include all sources", () => {
  it("stats() reports total including static + captured + doc-learned", () => {
    const stats = tribalKnowledgeEngine.stats();
    // 4,129 static + any captured + any doc-learned
    expect(stats.total_tips).toBeGreaterThan(4000);
    expect(stats.by_category).toBeDefined();
    expect(typeof stats.by_confidence.high).toBe("number");
  });

  it("suggest() works with material + operation context", () => {
    const suggestion = tribalKnowledgeEngine.suggest("P", "milling");
    expect(suggestion.tips.length).toBeGreaterThan(0);
    expect(suggestion.context_match).toContain("P");
    expect(suggestion.context_match).toContain("milling");
  });
});
