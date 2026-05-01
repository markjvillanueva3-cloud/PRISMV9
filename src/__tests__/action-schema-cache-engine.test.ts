import { describe, it, expect, beforeEach } from "vitest";
import { ActionSchemaCacheEngine } from "../engines/ActionSchemaCacheEngine.js";

describe("ActionSchemaCacheEngine", () => {
  let engine: ActionSchemaCacheEngine;

  beforeEach(() => {
    engine = new ActionSchemaCacheEngine();
  });

  describe("getSchema", () => {
    it("returns schema for known action", () => {
      const schema = engine.getSchema("state_load");
      expect(schema).not.toBeNull();
      expect(schema!.action).toBe("state_load");
      expect(schema!.dispatcher).toContain("session");
    });

    it("returns null for unknown action", () => {
      expect(engine.getSchema("zzz_nonexistent")).toBeNull();
    });
  });

  describe("searchSchemas", () => {
    it("finds schemas by action name", () => {
      const results = engine.searchSchemas("material");
      expect(results.length).toBeGreaterThan(0);
      results.forEach(r => {
        expect(r.action.includes("material") || r.dispatcher.includes("material")).toBe(true);
      });
    });

    it("returns signature strings", () => {
      const results = engine.searchSchemas("state");
      if (results.length > 0) {
        expect(results[0].signature).toContain("(");
        expect(results[0].signature).toContain(")");
      }
    });

    it("respects max limit", () => {
      const results = engine.searchSchemas("a", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getParamHint", () => {
    it("returns compact param hint", () => {
      const hint = engine.getParamHint("state_load");
      expect(hint).toContain("state_load");
    });

    it("shows unknown for missing action", () => {
      const hint = engine.getParamHint("zzz");
      expect(hint).toContain("unknown");
    });
  });

  describe("getDispatcherActions", () => {
    it("returns all actions for a dispatcher", () => {
      const actions = engine.getDispatcherActions("sessionDispatcher");
      expect(actions.length).toBeGreaterThan(5);
      actions.forEach(a => {
        expect(a.dispatcher).toContain("session");
      });
    });
  });

  describe("getStats", () => {
    it("returns counts", () => {
      const stats = engine.getStats();
      expect(stats.actions).toBeGreaterThan(100);
      expect(stats.dispatchers).toBeGreaterThan(10);
    });
  });

  describe("caching", () => {
    it("invalidate forces rescan", () => {
      const stats1 = engine.getStats();
      engine.invalidate();
      const stats2 = engine.getStats();
      expect(stats2.actions).toBe(stats1.actions);
    });
  });
});
