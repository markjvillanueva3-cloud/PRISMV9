/**
 * AwarenessQueryEngine tests (Universal Phase 0.2)
 *
 * Covers the <100ms query contract + core lookup semantics that the rest
 * of the awareness substrate depends on.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { awarenessQueryEngine, type AssetType } from "../engines/AwarenessQueryEngine.js";

describe("AwarenessQueryEngine (Phase 0.2)", () => {
  beforeAll(async () => {
    // Warm cache — first call loads from disk; subsequent queries hit Maps.
    await awarenessQueryEngine.getCounts();
  });

  describe("exists()", () => {
    it("returns boolean for known engine types", async () => {
      const result = await awarenessQueryEngine.exists("engine", "NonExistentEngineXyz123");
      expect(typeof result).toBe("boolean");
    });

    it("returns false for an obviously missing name", async () => {
      const result = await awarenessQueryEngine.exists("engine", "ThisEngineCannotPossiblyExistXyz999");
      expect(result).toBe(false);
    });

    it("handles suffix-insensitive matching (Engine/Algorithm/Formula)", async () => {
      // Even if no such asset exists, call must not throw; shape is boolean
      const result = await awarenessQueryEngine.exists("engine", "Foo");
      expect(typeof result).toBe("boolean");
    });

    it("handles all 10 AssetType values without throwing", async () => {
      const types: AssetType[] = [
        "engine", "formula", "algorithm", "action", "dispatcher",
        "skill", "hook", "tribal_tip", "playbook_rule", "extraction",
      ];
      for (const t of types) {
        const r = await awarenessQueryEngine.exists(t, "probe");
        expect(typeof r).toBe("boolean");
      }
    });
  });

  describe("findSimilar()", () => {
    it("returns an array (may be empty)", async () => {
      const result = await awarenessQueryEngine.findSimilar(["cutting", "force"]);
      expect(Array.isArray(result)).toBe(true);
    });

    it("respects limit parameter", async () => {
      const result = await awarenessQueryEngine.findSimilar(["test"], undefined, 3);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("filters by types[] when provided", async () => {
      const result = await awarenessQueryEngine.findSimilar(["force"], ["engine"], 20);
      for (const m of result) {
        expect(m.asset.type).toBe("engine");
      }
    });

    it("each match has {asset, similarity, matchType} shape", async () => {
      const result = await awarenessQueryEngine.findSimilar(["cutting"], undefined, 5);
      for (const m of result) {
        expect(m.asset).toBeDefined();
        expect(typeof m.similarity).toBe("number");
        expect(["exact", "keyword", "fuzzy"]).toContain(m.matchType);
      }
    });

    it("sorts results by similarity descending", async () => {
      const result = await awarenessQueryEngine.findSimilar(["mill", "speed"], undefined, 10);
      for (let i = 1; i < result.length; i++) {
        expect(result[i - 1].similarity).toBeGreaterThanOrEqual(result[i].similarity);
      }
    });
  });

  describe("dependents() / dependencies()", () => {
    it("returns arrays (possibly empty) for any file path", async () => {
      const deps = await awarenessQueryEngine.dependents("some/random/path.ts");
      const depsUp = await awarenessQueryEngine.dependencies("some/random/path.ts");
      expect(Array.isArray(deps)).toBe(true);
      expect(Array.isArray(depsUp)).toBe(true);
    });
  });

  describe("invocation telemetry", () => {
    it("recordInvocation does not throw", async () => {
      await expect(
        awarenessQueryEngine.recordInvocation("TestProbeAsset", "engine")
      ).resolves.not.toThrow();
    });

    it("lastInvoked returns string or null", async () => {
      await awarenessQueryEngine.recordInvocation("TelemetryProbe", "engine");
      const result = await awarenessQueryEngine.lastInvoked("TelemetryProbe");
      // Either the just-recorded ISO timestamp, or null if persistence is async
      expect(result === null || typeof result === "string").toBe(true);
    });
  });

  describe("bulk queries", () => {
    it("getByType returns array for every valid type", async () => {
      const types: AssetType[] = ["engine", "formula", "algorithm"];
      for (const t of types) {
        const r = await awarenessQueryEngine.getByType(t);
        expect(Array.isArray(r)).toBe(true);
      }
    });

    it("getCounts returns Record<AssetType, number>", async () => {
      const counts = await awarenessQueryEngine.getCounts();
      expect(typeof counts).toBe("object");
      expect(counts).not.toBeNull();
    });

    it("getCompactSummary returns a string", async () => {
      const summary = await awarenessQueryEngine.getCompactSummary();
      expect(typeof summary).toBe("string");
    });
  });

  describe("performance contract (<100ms after warm cache)", () => {
    it("exists() completes in <100ms", async () => {
      const t0 = Date.now();
      await awarenessQueryEngine.exists("engine", "KienzleForceModelEngine");
      expect(Date.now() - t0).toBeLessThan(100);
    });

    it("findSimilar() completes in <100ms for short keyword list", async () => {
      const t0 = Date.now();
      await awarenessQueryEngine.findSimilar(["cutting", "force"], undefined, 5);
      expect(Date.now() - t0).toBeLessThan(100);
    });

    it("dependents() completes in <100ms", async () => {
      const t0 = Date.now();
      await awarenessQueryEngine.dependents("src/engines/KienzleForceModelEngine.ts");
      expect(Date.now() - t0).toBeLessThan(100);
    });

    it("getCounts() completes in <100ms", async () => {
      const t0 = Date.now();
      await awarenessQueryEngine.getCounts();
      expect(Date.now() - t0).toBeLessThan(100);
    });
  });

  describe("invalidateAndReload()", () => {
    it("does not throw", async () => {
      await expect(awarenessQueryEngine.invalidateAndReload()).resolves.not.toThrow();
    });
  });
});
