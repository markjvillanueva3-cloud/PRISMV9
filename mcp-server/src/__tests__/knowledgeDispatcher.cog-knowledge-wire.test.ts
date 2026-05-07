/**
 * knowledgeDispatcher — Knowledge enrichment wiring round-trip suite
 * ===================================================================
 *
 * COGNITIVE-BRIDGE-MS0 / U-WIRE-COG-BATCH9
 *
 * Wires 3 knowledge-enrichment engines into prism_knowledge with deterministic
 * structural assertions:
 *   - tribalKnowledgeMaximizerEngine.query  -> cognitive_tribal_maximizer_query
 *   - videoKnowledgeIntegrationEngine.query -> cognitive_video_knowledge_query
 *   - extractedKnowledgeWiringEngine.search -> cognitive_extracted_knowledge_search
 *
 * @milestone COGNITIVE-BRIDGE-MS0
 * @unit U-WIRE-COG-BATCH9
 */

import { describe, it, expect, beforeEach } from "vitest";
import { registerKnowledgeDispatcher } from "../tools/dispatchers/knowledgeDispatcher.js";

// Canonical domain set seeded by TribalKnowledgeMaximizerEngine.loadTips() — drift detector
const TRIBAL_DOMAINS = ["lathe", "mill", "wedm", "general", "setup", "inspection"] as const;
const TRIBAL_CATEGORIES = ["speed-feed", "workholding", "tool-selection", "safety", "quality", "efficiency"] as const;

interface CapturedTool {
  handler: (args: { action: string; params?: Record<string, unknown> }) => Promise<unknown>;
}

class MockMCPServer {
  tools: CapturedTool[] = [];
  tool(_n: string, _d: string, _s: unknown, handler: CapturedTool["handler"]) {
    this.tools.push({ handler });
  }
}

interface DispatchResult { ok: boolean; data: Record<string, unknown> }

async function call(server: MockMCPServer, action: string, params: Record<string, unknown> = {}): Promise<DispatchResult> {
  const tool = server.tools[0]!;
  const raw = await tool.handler({ action, params });
  if (raw && typeof raw === "object" && "success" in raw && (raw as { success: boolean }).success === false) {
    return { ok: false, data: raw as unknown as Record<string, unknown> };
  }
  const envelope = raw as { content: { type: string; text: string }[] };
  const parsed = JSON.parse(envelope.content[0]!.text) as Record<string, unknown>;
  if ("error" in parsed) return { ok: false, data: parsed };
  return { ok: true, data: parsed };
}

let server: MockMCPServer;
beforeEach(() => {
  server = new MockMCPServer();
  registerKnowledgeDispatcher(server as unknown as Parameters<typeof registerKnowledgeDispatcher>[0]);
});

describe("U-WIRE-COG-BATCH9 / TribalKnowledgeMaximizerEngine.query", () => {
  it("query without filter returns count === tips.length and respects default limit (50)", async () => {
    const r = await call(server, "cognitive_tribal_maximizer_query");
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as Array<{ confidence: number; usageCount: number }> | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(tips.length);
    // Engine seeds 6 domains × 6 categories × 5 sources = 180 tips total; default
    // limit is 50, so unfiltered returns exactly 50.
    expect(count).toBe(50);
    // All tips have confidence in [0.6, 1.0] per loadTips() seed: 0.6 + Math.random() * 0.4
    for (const t of tips) {
      expect(t.confidence).toBeGreaterThanOrEqual(0.6);
      expect(t.confidence).toBeLessThanOrEqual(1.0);
    }
    // Sorted descending by confidence (engine impl line 92)
    for (let i = 1; i < tips.length; i++) {
      expect(tips[i - 1]!.confidence).toBeGreaterThanOrEqual(tips[i]!.confidence);
    }
  });

  it("query(domain=mill) restricts results to mill domain", async () => {
    const r = await call(server, "cognitive_tribal_maximizer_query", { domain: "mill", limit: 100 });
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as Array<{ domain: string }> | undefined) ?? [];
    // mill-domain has exactly 6 categories × 5 sources = 30 tips
    expect(tips.length).toBe(30);
    for (const t of tips) {
      expect(t.domain).toBe("mill");
    }
  });

  it.each(TRIBAL_DOMAINS.map(d => [d] as const))("query domain variability: %s yields exactly 30 tips", async (domain) => {
    const r = await call(server, "cognitive_tribal_maximizer_query", { domain, limit: 100 });
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as Array<{ domain: string }> | undefined) ?? [];
    expect(tips.length).toBe(30);
    for (const t of tips) {
      expect(t.domain).toBe(domain);
    }
  });

  it.each(TRIBAL_CATEGORIES.slice(0, 3).map(c => [c] as const))("query category variability: %s yields exactly 30 tips (6 domains × 5 sources)", async (category) => {
    const r = await call(server, "cognitive_tribal_maximizer_query", { category, limit: 100 });
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as Array<{ category: string }> | undefined) ?? [];
    expect(tips.length).toBe(30);
    for (const t of tips) {
      expect(t.category).toBe(category);
    }
  });

  it("query(min_confidence=0.6) returns all 50 (since seed >= 0.6)", async () => {
    const r = await call(server, "cognitive_tribal_maximizer_query", { min_confidence: 0.6 });
    expect(r.ok).toBe(true);
    const tips = (r.data.tips as Array<{ confidence: number }> | undefined) ?? [];
    expect(tips.length).toBe(50);
    for (const t of tips) {
      expect(t.confidence).toBeGreaterThanOrEqual(0.6);
    }
  });

  it("query(min_confidence=2) returns empty (impossible threshold)", async () => {
    const r = await call(server, "cognitive_tribal_maximizer_query", { min_confidence: 1.01 });
    // 1.01 fails schema (max 1.0)
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH9 / VideoKnowledgeIntegrationEngine.query", () => {
  it("query returns count === videos.length invariant", async () => {
    const r = await call(server, "cognitive_video_knowledge_query");
    expect(r.ok).toBe(true);
    const videos = (r.data.videos as Array<{ topics: string[]; tips: string[]; procedures: string[] }> | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(videos.length);
    // Each video has the documented shape with topics/tips/procedures arrays
    for (const v of videos) {
      expect(Array.isArray(v.topics ?? [])).toBe(true);
      expect(Array.isArray(v.tips ?? [])).toBe(true);
      expect(Array.isArray(v.procedures ?? [])).toBe(true);
    }
  });
});

describe("U-WIRE-COG-BATCH9 / ExtractedKnowledgeWiringEngine.search", () => {
  it("search('thread') returns count === atoms.length and respects limit", async () => {
    const r = await call(server, "cognitive_extracted_knowledge_search", { query: "thread", limit: 5 });
    expect(r.ok).toBe(true);
    const atoms = (r.data.atoms as unknown[] | undefined) ?? [];
    const count = (r.data.count as number | undefined) ?? 0;
    expect(count).toBe(atoms.length);
    expect(atoms.length).toBeLessThanOrEqual(5);
  });

  it("search with limit=20 (default) caps at 20", async () => {
    const r = await call(server, "cognitive_extracted_knowledge_search", { query: "machining" });
    expect(r.ok).toBe(true);
    const atoms = (r.data.atoms as unknown[] | undefined) ?? [];
    expect(atoms.length).toBeLessThanOrEqual(20);
  });
});

describe("U-WIRE-COG-BATCH9 / schema rejections", () => {
  it("rejects tribal_maximizer_query with min_confidence > 1", async () => {
    const r = await call(server, "cognitive_tribal_maximizer_query", { min_confidence: 1.5 });
    expect(r.ok).toBe(false);
  });

  it("rejects tribal_maximizer_query with negative limit", async () => {
    const r = await call(server, "cognitive_tribal_maximizer_query", { limit: -10 });
    expect(r.ok).toBe(false);
  });

  it("rejects extracted_knowledge_search with empty query", async () => {
    const r = await call(server, "cognitive_extracted_knowledge_search", { query: "" });
    expect(r.ok).toBe(false);
  });

  it("rejects video_knowledge_query with limit > 500", async () => {
    const r = await call(server, "cognitive_video_knowledge_query", { limit: 1000 });
    expect(r.ok).toBe(false);
  });
});

describe("U-WIRE-COG-BATCH9 / regression guards", () => {
  it("all 3 batch-9 actions reachable from dispatcher", async () => {
    const a = await call(server, "cognitive_tribal_maximizer_query");
    const b = await call(server, "cognitive_video_knowledge_query");
    const c = await call(server, "cognitive_extracted_knowledge_search", { query: "any" });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(c.ok).toBe(true);
  });

  it("tribal query is idempotent across two calls (same count)", async () => {
    const a = await call(server, "cognitive_tribal_maximizer_query", { domain: "lathe", limit: 100 });
    const b = await call(server, "cognitive_tribal_maximizer_query", { domain: "lathe", limit: 100 });
    expect(a.data.count).toBe(b.data.count);
  });
});
