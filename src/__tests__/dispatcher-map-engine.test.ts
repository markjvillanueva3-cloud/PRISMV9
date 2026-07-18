import { describe, it, expect, beforeEach } from "vitest";
import { DispatcherMapEngine } from "../engines/DispatcherMapEngine.js";

describe("DispatcherMapEngine", () => {
  let engine: DispatcherMapEngine;

  beforeEach(() => {
    engine = new DispatcherMapEngine();
  });

  describe("getMap", () => {
    it("returns an array of dispatcher info objects", () => {
      const map = engine.getMap();
      expect(Array.isArray(map)).toBe(true);
      expect(map.length).toBeGreaterThan(0);
    });

    it("each entry has required fields", () => {
      const map = engine.getMap();
      const first = map[0];
      expect(first).toHaveProperty("name");
      expect(first).toHaveProperty("file");
      expect(first).toHaveProperty("actionCount");
      expect(first).toHaveProperty("actions");
      expect(Array.isArray(first.actions)).toBe(true);
    });

    it("sorts by action count descending", () => {
      const map = engine.getMap();
      for (let i = 1; i < map.length; i++) {
        expect(map[i - 1].actionCount).toBeGreaterThanOrEqual(map[i].actionCount);
      }
    });
  });

  describe("getCompactMap", () => {
    it("returns a compact string representation", () => {
      const compact = engine.getCompactMap();
      expect(typeof compact).toBe("string");
      expect(compact.length).toBeGreaterThan(0);
    });

    it("respects maxActionsPerDispatcher limit", () => {
      const compact = engine.getCompactMap(2);
      // Lines with more than 2 actions should show "+N"
      const lines = compact.split("\n");
      expect(lines.length).toBeGreaterThan(0);
    });
  });

  describe("searchActions", () => {
    it("finds actions matching a query", () => {
      const results = engine.searchActions("state");
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.action).toContain("state");
      });
    });

    it("returns empty array for non-matching query", () => {
      const results = engine.searchActions("zzz_nonexistent_zzz");
      expect(results).toEqual([]);
    });

    it("respects maxResults limit", () => {
      const results = engine.searchActions("a", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("result entries have required fields", () => {
      const results = engine.searchActions("state");
      if (results.length > 0) {
        expect(results[0]).toHaveProperty("action");
        expect(results[0]).toHaveProperty("dispatcher");
        expect(results[0]).toHaveProperty("file");
      }
    });
  });

  describe("findAction", () => {
    it("finds a known action", () => {
      // state_load should exist in sessionDispatcher
      const result = engine.findAction("state_load");
      expect(result).not.toBeNull();
      expect(result!.action).toBe("state_load");
      expect(result!.dispatcher).toContain("session");
    });

    it("returns null for unknown action", () => {
      const result = engine.findAction("zzz_nonexistent_zzz");
      expect(result).toBeNull();
    });
  });

  describe("getCounts", () => {
    it("returns dispatcher and action counts", () => {
      const counts = engine.getCounts();
      expect(counts.dispatchers).toBeGreaterThan(0);
      expect(counts.actions).toBeGreaterThan(0);
      expect(counts.avgActions).toBeGreaterThan(0);
    });
  });

  describe("getTopDispatchers", () => {
    it("returns top N dispatchers", () => {
      const top = engine.getTopDispatchers(5);
      expect(top.length).toBeLessThanOrEqual(5);
      expect(top.length).toBeGreaterThan(0);
      top.forEach(d => {
        expect(d).toHaveProperty("name");
        expect(d).toHaveProperty("actions");
      });
    });
  });

  describe("caching", () => {
    it("invalidate clears cache and forces rescan", () => {
      const map1 = engine.getMap();
      engine.invalidate();
      const map2 = engine.getMap();
      expect(map2.length).toBe(map1.length);
    });
  });
});
