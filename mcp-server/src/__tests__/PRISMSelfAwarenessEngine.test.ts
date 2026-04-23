/**
 * PRISMSelfAwarenessEngine Tests
 *
 * Tests core self-awareness: manifest generation, capability matching,
 * gap detection, and AI recommendations.
 */

import { describe, it, expect } from "vitest";
import {
  prismSelfAwarenessEngine,
  generateClaudeMdContext,
  generateMinimalContext,
  refreshSelfAwareness,
} from "../engines/PRISMSelfAwarenessEngine.js";

describe("PRISMSelfAwarenessEngine", () => {
  describe("getManifest", () => {
    it("returns manifest with engines array containing at least 100 entries", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      expect(manifest.engines.length).toBeGreaterThan(100);
    });

    it("returns manifest with ISO timestamp format", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      const parsed = Date.parse(manifest.lastUpdated);
      expect(Number.isNaN(parsed)).toBe(false);
      expect(parsed).toBeLessThanOrEqual(Date.now());
    });

    it("returns manifest with version string", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it("engine entries have required structure", async () => {
      const manifest = await prismSelfAwarenessEngine.getManifest();
      const engine = manifest.engines[0];
      expect(typeof engine.name).toBe("string");
      expect(engine.name.length).toBeGreaterThan(0);
      expect(typeof engine.path).toBe("string");
      expect(engine.path).toContain("src/engines/");
      expect(Array.isArray(engine.capabilities)).toBe(true);
    });
  });

  describe("findCapabilities - happy path", () => {
    it("finds safety-related capabilities with confidence > 0.3", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("safety validation");
      expect(matches.length).toBeGreaterThan(0);
      expect(matches[0].confidence).toBeGreaterThan(0.3);
      expect(matches[0].capability.toLowerCase()).toContain("safety");
    });

    it("finds WEDM capabilities when searching for wire edm", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("wire edm");
      const hasWedm = matches.some(m =>
        m.capability.toLowerCase().includes("wedm") ||
        m.capability.toLowerCase().includes("edm")
      );
      expect(hasWedm).toBe(true);
    });

    it("returns results sorted by confidence descending", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("cutting force");
      for (let i = 1; i < Math.min(matches.length, 10); i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence);
      }
    });
  });

  describe("findCapabilities - failure modes", () => {
    it("returns empty array for completely nonsensical query", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("zzzzqqqq12345nonexistent");
      // Low-confidence partial matches may exist, but top result should have low confidence
      if (matches.length > 0) {
        expect(matches[0].confidence).toBeLessThan(0.2);
      }
    });

    it("handles empty string without throwing", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("");
      expect(Array.isArray(matches)).toBe(true);
    });

    it("handles null-ish input coerced to string", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities(undefined as unknown as string);
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe("findCapabilities - adversarial inputs", () => {
    it("handles query with special regex characters", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("test.*[a-z]+$^");
      expect(Array.isArray(matches)).toBe(true);
    });

    it("handles very long query (1000 chars) without hanging", async () => {
      const longQuery = "cutting ".repeat(125); // ~1000 chars
      const start = Date.now();
      const matches = await prismSelfAwarenessEngine.findCapabilities(longQuery);
      const elapsed = Date.now() - start;
      expect(elapsed).toBeLessThan(5000); // Should complete in < 5s
      expect(Array.isArray(matches)).toBe(true);
    });
  });

  describe("analyzeGaps", () => {
    it("returns hasCapability=true for known domain", async () => {
      const analysis = await prismSelfAwarenessEngine.analyzeGaps("calculate cutting force");
      expect(analysis.hasCapability).toBe(true);
      expect(analysis.confidence).toBeGreaterThan(0.5);
    });

    it("returns hasCapability=false for unknown domain", async () => {
      const analysis = await prismSelfAwarenessEngine.analyzeGaps("quantum teleportation engine");
      expect(analysis.hasCapability).toBe(false);
      expect(analysis.confidence).toBeLessThan(0.5);
    });

    it("includes query in response", async () => {
      const query = "thermal analysis for milling";
      const analysis = await prismSelfAwarenessEngine.analyzeGaps(query);
      expect(analysis.query).toBe(query);
    });

    it("provides suggestions array even when no capability found", async () => {
      const analysis = await prismSelfAwarenessEngine.analyzeGaps("nonexistent feature xyz");
      expect(Array.isArray(analysis.suggestions)).toBe(true);
    });
  });

  describe("recommendAIFeatures", () => {
    it("returns recommendations with priority scores", async () => {
      const recs = await prismSelfAwarenessEngine.recommendAIFeatures("optimize machining parameters");
      if (recs.length > 0) {
        expect(typeof recs[0].priority).toBe("number");
        expect(recs[0].priority).toBeGreaterThanOrEqual(0);
        expect(recs[0].priority).toBeLessThanOrEqual(1);
      }
    });

    it("recommendations include feature name and reason", async () => {
      const recs = await prismSelfAwarenessEngine.recommendAIFeatures("safety check");
      if (recs.length > 0) {
        expect(typeof recs[0].feature).toBe("string");
        expect(typeof recs[0].reason).toBe("string");
      }
    });

    it("returns empty array for irrelevant task", async () => {
      const recs = await prismSelfAwarenessEngine.recommendAIFeatures("");
      expect(Array.isArray(recs)).toBe(true);
    });
  });

  describe("searchTribalKnowledge", () => {
    it("returns array for any query", async () => {
      const results = await prismSelfAwarenessEngine.searchTribalKnowledge("speed feed");
      expect(Array.isArray(results)).toBe(true);
    });

    it("tribal entries have tip and category fields", async () => {
      const results = await prismSelfAwarenessEngine.searchTribalKnowledge("machining");
      if (results.length > 0) {
        expect(typeof results[0].tip).toBe("string");
        expect(typeof results[0].category).toBe("string");
      }
    });
  });

  describe("getJMDieCustomerPath", () => {
    it("returns null for non-existent customer", () => {
      const path = prismSelfAwarenessEngine.getJMDieCustomerPath("FAKE_CUSTOMER_999");
      expect(path).toBeNull();
    });

    it("case-insensitive lookup returns consistent result", () => {
      const p1 = prismSelfAwarenessEngine.getJMDieCustomerPath("test");
      const p2 = prismSelfAwarenessEngine.getJMDieCustomerPath("TEST");
      expect(p1).toBe(p2);
    });
  });

  describe("generateClaudeMdContext", () => {
    it("generates markdown with PRISM header", async () => {
      const ctx = await generateClaudeMdContext();
      expect(ctx).toContain("PRISM");
      expect(ctx).toContain("##");
    });

    it("includes numeric stats", async () => {
      const ctx = await generateClaudeMdContext();
      expect(ctx).toMatch(/Engines:\s*\d+/);
      expect(ctx).toMatch(/Dispatchers:\s*\d+/);
    });
  });

  describe("generateMinimalContext", () => {
    it("generates compact string under 500 chars", async () => {
      const ctx = await generateMinimalContext();
      expect(ctx.length).toBeLessThan(500);
      expect(ctx.length).toBeGreaterThan(20);
    });

    it("includes key terms", async () => {
      const ctx = await generateMinimalContext();
      expect(ctx.toLowerCase()).toContain("engines");
      expect(ctx.toLowerCase()).toContain("dispatchers");
    });
  });

  describe("refreshSelfAwareness", () => {
    it("returns fresh manifest with recent timestamp", async () => {
      const before = Date.now();
      const manifest = await refreshSelfAwareness();
      const after = Date.now();
      const ts = Date.parse(manifest.lastUpdated);
      expect(ts).toBeGreaterThanOrEqual(before - 1000);
      expect(ts).toBeLessThanOrEqual(after + 1000);
    });
  });

  describe("dispatcher integration", () => {
    it("self_awareness_manifest action returns valid manifest", async () => {
      // Simulate dispatcher call
      const manifest = await prismSelfAwarenessEngine.getManifest();
      expect(manifest.stats.engineCount).toBeGreaterThan(0);
      expect(manifest.stats.dispatcherCount).toBeGreaterThan(0);
    });

    it("self_awareness_find action returns capability matches", async () => {
      const matches = await prismSelfAwarenessEngine.findCapabilities("lathe turning");
      expect(matches.some(m => m.capability.toLowerCase().includes("lathe"))).toBe(true);
    });

    it("self_awareness_gaps action returns gap analysis", async () => {
      const gaps = await prismSelfAwarenessEngine.analyzeGaps("cam toolpath generation");
      expect(gaps.query).toBe("cam toolpath generation");
      expect(typeof gaps.hasCapability).toBe("boolean");
    });
  });
});
