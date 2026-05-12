/**
 * Tests for AssetSynergyDetectorEngine (Phase 0.24 U-WIRE8)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  AssetSynergyDetectorEngine,
  assetSynergyDetectorEngine,
} from "../engines/AssetSynergyDetectorEngine.js";

describe("AssetSynergyDetectorEngine", () => {
  let e: AssetSynergyDetectorEngine;

  beforeEach(() => {
    e = new AssetSynergyDetectorEngine();
  });

  describe("observe()", () => {
    it("rejects empty sessionId", () => {
      expect(() => e.observe({ sessionId: "", assets: ["a"] })).toThrow(/sessionId/);
    });

    it("rejects non-array assets", () => {
      expect(() =>
        e.observe({ sessionId: "s1", assets: "a" as unknown as readonly string[] })
      ).toThrow(/assets/);
    });

    it("dedupes observations from the same session", () => {
      e.observe({ sessionId: "s1", assets: ["a", "b"] });
      e.observe({ sessionId: "s1", assets: ["c", "d"] });
      expect(e.sessionCount()).toBe(1);
    });

    it("ignores duplicate asset ids within a single observation", () => {
      e.observe({ sessionId: "s1", assets: ["a", "a", "b"] });
      const report = e.topSynergies(10, 1);
      expect(report.top).toHaveLength(1);
    });
  });

  describe("topSynergies() — PPMI ranking", () => {
    beforeEach(() => {
      e.observe({ sessionId: "1", assets: ["a", "b"] });
      e.observe({ sessionId: "2", assets: ["a", "b"] });
      e.observe({ sessionId: "3", assets: ["a", "b", "c"] });
      e.observe({ sessionId: "4", assets: ["c", "d"] });
      e.observe({ sessionId: "5", assets: ["e"] });
    });

    it("returns an empty report when no sessions observed", () => {
      const fresh = new AssetSynergyDetectorEngine();
      expect(fresh.topSynergies().top).toEqual([]);
    });

    it("reports pairs above minCoOccurrence", () => {
      const r = e.topSynergies(10, 2);
      expect(r.top.some((p) => p.assetA === "a" && p.assetB === "b")).toBe(true);
    });

    it("drops pairs below minCoOccurrence", () => {
      const r = e.topSynergies(10, 2);
      expect(r.top.find((p) => (p.assetA === "c" && p.assetB === "d") || (p.assetA === "d" && p.assetB === "c"))).toBeUndefined();
    });

    it("computes positive PPMI (not negative)", () => {
      const r = e.topSynergies(10, 1);
      for (const p of r.top) expect(p.ppmi).toBeGreaterThanOrEqual(0);
    });

    it("orders by PPMI desc then co-occurrence then alphabetically", () => {
      const r = e.topSynergies(10, 1);
      for (let i = 1; i < r.top.length; i += 1) {
        const prev = r.top[i - 1];
        const cur = r.top[i];
        if (prev.ppmi === cur.ppmi) {
          if (prev.coOccurrence === cur.coOccurrence) {
            expect(prev.assetA.localeCompare(cur.assetA)).toBeLessThanOrEqual(0);
          } else {
            expect(prev.coOccurrence).toBeGreaterThanOrEqual(cur.coOccurrence);
          }
        } else {
          expect(prev.ppmi).toBeGreaterThanOrEqual(cur.ppmi);
        }
      }
    });

    it("respects limit (0 returns all)", () => {
      expect(e.topSynergies(1, 1).top).toHaveLength(1);
      const all = e.topSynergies(0, 1).top;
      expect(all.length).toBeGreaterThan(1);
    });

    it("rejects invalid limit / minCoOccurrence", () => {
      expect(() => e.topSynergies(-1)).toThrow(/limit/);
      expect(() => e.topSynergies(1, 0)).toThrow(/minCoOccurrence/);
    });

    it("normalized pair key sorts endpoints alphabetically", () => {
      const fresh = new AssetSynergyDetectorEngine();
      fresh.observe({ sessionId: "1", assets: ["zzz", "aaa"] });
      fresh.observe({ sessionId: "2", assets: ["aaa", "zzz"] });
      const r = fresh.topSynergies(10, 1);
      expect(r.top[0].assetA).toBe("aaa");
      expect(r.top[0].assetB).toBe("zzz");
    });
  });

  describe("synergiesFor()", () => {
    beforeEach(() => {
      e.observe({ sessionId: "1", assets: ["a", "b", "c"] });
      e.observe({ sessionId: "2", assets: ["a", "b"] });
      e.observe({ sessionId: "3", assets: ["b", "c"] });
    });

    it("returns only pairs involving the named asset", () => {
      const pairs = e.synergiesFor("a", 10, 1);
      for (const p of pairs) {
        expect(p.assetA === "a" || p.assetB === "a").toBe(true);
      }
    });

    it("respects the limit argument", () => {
      expect(e.synergiesFor("b", 1, 1)).toHaveLength(1);
    });
  });

  describe("lifecycle", () => {
    it("clear resets all counters", () => {
      e.observe({ sessionId: "1", assets: ["a", "b"] });
      e.clear();
      expect(e.sessionCount()).toBe(0);
      expect(e.topSynergies().top).toEqual([]);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      assetSynergyDetectorEngine.clear();
      assetSynergyDetectorEngine.observe({ sessionId: "s", assets: ["a", "b"] });
      expect(assetSynergyDetectorEngine.sessionCount()).toBe(1);
      assetSynergyDetectorEngine.clear();
    });
  });
});
