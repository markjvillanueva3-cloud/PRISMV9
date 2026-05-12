/**
 * Tests for LedgerRetentionEngine (Phase 0.16 U-OP6)
 */

import { describe, it, expect } from "vitest";
import {
  LedgerRetentionEngine,
  DEFAULT_RETENTION,
  ledgerRetentionEngine,
} from "../engines/LedgerRetentionEngine.js";

const NOW = Date.parse("2026-04-16T12:00:00.000Z");

function daysAgo(n: number): string {
  return new Date(NOW - n * 24 * 60 * 60 * 1000).toISOString();
}

describe("LedgerRetentionEngine", () => {
  const engine = new LedgerRetentionEngine();

  describe("construction", () => {
    it("uses default retention when none supplied", () => {
      expect(engine.getConfig()).toEqual(DEFAULT_RETENTION);
    });

    it("rejects negative durations", () => {
      expect(() => new LedgerRetentionEngine({ hotAgeDays: -1, warmAgeDays: 30 })).toThrow(/hotAgeDays/);
      expect(() => new LedgerRetentionEngine({ hotAgeDays: 7, warmAgeDays: -1 })).toThrow(/warmAgeDays/);
    });

    it("rejects warmAgeDays < hotAgeDays", () => {
      expect(() => new LedgerRetentionEngine({ hotAgeDays: 10, warmAgeDays: 5 })).toThrow(/warmAgeDays/);
    });

    it("accepts warmAgeDays == hotAgeDays (degenerate but valid)", () => {
      expect(() => new LedgerRetentionEngine({ hotAgeDays: 7, warmAgeDays: 7 })).not.toThrow();
    });
  });

  describe("classify()", () => {
    it("hot for ≤ hotAgeDays", () => {
      expect(engine.classify(0)).toBe("hot");
      expect(engine.classify(7)).toBe("hot");
    });

    it("warm for hotAgeDays < age ≤ warmAgeDays", () => {
      expect(engine.classify(7.0001)).toBe("warm");
      expect(engine.classify(30)).toBe("warm");
    });

    it("cold for > warmAgeDays", () => {
      expect(engine.classify(30.0001)).toBe("cold");
      expect(engine.classify(365)).toBe("cold");
    });
  });

  describe("tierOf()", () => {
    it("extracts timestamp from `at` field", () => {
      const r = engine.tierOf({ at: daysAgo(3) }, NOW);
      expect(r.tier).toBe("hot");
      expect(r.ageDays).toBeGreaterThanOrEqual(3);
      expect(r.ageDays).toBeLessThan(4);
    });

    it("falls back to `timestamp` field", () => {
      const r = engine.tierOf({ timestamp: daysAgo(10) }, NOW);
      expect(r.tier).toBe("warm");
    });

    it("throws on missing timestamp", () => {
      expect(() => engine.tierOf({}, NOW)).toThrow(/at.*timestamp/);
    });

    it("throws on unparseable timestamp", () => {
      expect(() => engine.tierOf({ at: "yesterday" }, NOW)).toThrow(/unparseable/);
    });

    it("clamps negative ages to zero for future-dated entries", () => {
      const future = new Date(NOW + 3 * 24 * 60 * 60 * 1000).toISOString();
      const r = engine.tierOf({ at: future }, NOW);
      expect(r.ageDays).toBe(0);
      expect(r.tier).toBe("hot");
    });
  });

  describe("plan()", () => {
    it("counts entries per tier", () => {
      const entries = [
        { at: daysAgo(1) }, // hot
        { at: daysAgo(5) }, // hot
        { at: daysAgo(10) }, // warm
        { at: daysAgo(40) }, // cold
        { at: daysAgo(100) }, // cold
      ];
      const p = engine.plan(entries, NOW);
      expect(p.hot).toBe(2);
      expect(p.warm).toBe(1);
      expect(p.cold).toBe(2);
    });

    it("includes suggestion lines for non-empty tiers", () => {
      const entries = [{ at: daysAgo(1) }, { at: daysAgo(40) }];
      const p = engine.plan(entries, NOW);
      const tiers = p.actions.map((a) => a.tier);
      expect(tiers).toContain("hot");
      expect(tiers).toContain("cold");
      expect(tiers).not.toContain("warm");
    });

    it("handles an empty input", () => {
      const p = engine.plan([], NOW);
      expect(p.hot).toBe(0);
      expect(p.warm).toBe(0);
      expect(p.cold).toBe(0);
    });

    it("stamps `now` as ISO", () => {
      const p = engine.plan([], NOW);
      expect(p.now).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });

  describe("archiveDirFor()", () => {
    it("returns YYYY-MM for a UTC timestamp", () => {
      expect(engine.archiveDirFor("2026-03-15T10:00:00.000Z")).toBe("2026-03");
      expect(engine.archiveDirFor("2025-12-31T23:59:59.000Z")).toBe("2025-12");
    });

    it("throws on unparseable input", () => {
      expect(() => engine.archiveDirFor("nope")).toThrow(/unparseable/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      expect(ledgerRetentionEngine).toBeInstanceOf(LedgerRetentionEngine);
    });
  });
});
