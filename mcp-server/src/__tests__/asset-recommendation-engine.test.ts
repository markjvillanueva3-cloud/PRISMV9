/**
 * Tests for AssetRecommendationEngine (Phase 0.24 U-WIRE6)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AssetRecommendationEngine,
  assetRecommendationEngine,
  type RecommendableAsset,
} from "../engines/AssetRecommendationEngine.js";

function asset(overrides: Partial<RecommendableAsset> = {}): RecommendableAsset {
  return {
    id: overrides.id ?? "a1",
    kind: overrides.kind ?? "engine",
    keywords: overrides.keywords ?? ["kienzle", "force"],
    importance: overrides.importance,
    lastUsedAt: overrides.lastUsedAt,
    description: overrides.description,
  };
}

describe("AssetRecommendationEngine", () => {
  let e: AssetRecommendationEngine;

  beforeEach(() => {
    e = new AssetRecommendationEngine();
  });

  describe("register()", () => {
    it("lowercases and dedupes keywords", () => {
      const stored = e.register(asset({ keywords: ["Kienzle", "KIENZLE", "Force"] }));
      expect(stored.keywords.sort()).toEqual(["force", "kienzle"]);
    });

    it("rejects missing id/kind/keywords", () => {
      expect(() => e.register(asset({ id: "" }))).toThrow(/id/);
      expect(() => e.register({ ...asset(), kind: undefined as unknown as "engine" })).toThrow(/kind/);
      expect(() => e.register(asset({ keywords: [] }))).toThrow(/keywords/);
    });

    it("rejects out-of-range importance", () => {
      expect(() => e.register(asset({ importance: 1.5 }))).toThrow(/importance/);
    });

    it("registerAll stores multiple assets", () => {
      e.registerAll([asset({ id: "a" }), asset({ id: "b" })]);
      expect(e.size()).toBe(2);
    });
  });

  describe("recommend() — matching", () => {
    beforeEach(() => {
      e.registerAll([
        asset({ id: "kienzle", keywords: ["kienzle", "force"], importance: 0.9 }),
        asset({ id: "taylor", kind: "formula", keywords: ["taylor", "tool", "life"], importance: 0.8 }),
        asset({ id: "svi", kind: "action", keywords: ["svi", "psi"], importance: 0.5 }),
      ]);
    });

    it("returns an empty list when no query tokens match", () => {
      expect(e.recommend({ keywords: ["aardvark"] })).toEqual([]);
    });

    it("returns empty when query has no usable tokens", () => {
      expect(e.recommend({ keywords: [] })).toEqual([]);
    });

    it("matches single-word keywords", () => {
      const r = e.recommend({ keywords: ["kienzle"] });
      expect(r[0].asset.id).toBe("kienzle");
    });

    it("tokenizes multi-word queries", () => {
      const r = e.recommend({ keywords: ["tool life please"] });
      expect(r[0].asset.id).toBe("taylor");
    });

    it("respects limit and minScore", () => {
      const r = e.recommend({ keywords: ["kienzle taylor svi"], limit: 2 });
      expect(r).toHaveLength(2);
      const strict = e.recommend({ keywords: ["kienzle"], minScore: 0.99 });
      expect(strict).toEqual([]);
    });

    it("preferKinds boosts matching kinds", () => {
      e.clear();
      e.registerAll([
        asset({ id: "engA", kind: "engine", keywords: ["match"], importance: 0.8 }),
        asset({ id: "actB", kind: "action", keywords: ["match"], importance: 0.8 }),
      ]);
      const r = e.recommend({ keywords: ["match"], preferKinds: ["action"] });
      expect(r[0].asset.id).toBe("actB");
    });

    it("rationale reports kind and keyword overlap", () => {
      const r = e.recommend({ keywords: ["kienzle"] });
      expect(r[0].rationale).toContain("engine");
      expect(r[0].rationale).toContain("overlap");
    });
  });

  describe("recommend() — recency", () => {
    it("recent use boosts score relative to stale", () => {
      e.clear();
      const now = new Date();
      const recent = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
      const stale = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
      e.registerAll([
        asset({ id: "recent", keywords: ["term"], importance: 0.5, lastUsedAt: recent }),
        asset({ id: "stale", keywords: ["term"], importance: 0.5, lastUsedAt: stale }),
      ]);
      const r = e.recommend({ keywords: ["term"] });
      expect(r[0].asset.id).toBe("recent");
    });

    it("recencyBoostDays=0 disables recency boost", () => {
      e.clear();
      const now = new Date();
      const recent = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString();
      e.registerAll([
        asset({ id: "r", keywords: ["term"], importance: 0.5, lastUsedAt: recent }),
        asset({ id: "s", keywords: ["term"], importance: 0.5 }),
      ]);
      const r = e.recommend({ keywords: ["term"], recencyBoostDays: 0 });
      expect(r[0].score).toBe(r[1].score);
    });

    it("invalid recencyBoostDays raises", () => {
      expect(() => e.recommend({ keywords: ["x"], recencyBoostDays: -1 })).toThrow(/recencyBoostDays/);
    });

    it("invalid minScore raises", () => {
      expect(() => e.recommend({ keywords: ["x"], minScore: 1.1 })).toThrow(/minScore/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      assetRecommendationEngine.clear();
      assetRecommendationEngine.register(asset({ id: "singleton" }));
      expect(assetRecommendationEngine.size()).toBe(1);
      assetRecommendationEngine.clear();
    });
  });
});
