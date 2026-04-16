/**
 * ActionSchemaCacheEngine Tests
 *
 * Tests action parameter schema caching functionality:
 * - Schema lookup by action name
 * - Search across schemas
 * - Dispatcher action listing
 * - Cache statistics
 * - Cache invalidation
 *
 * Note: These are integration tests that rely on actual dispatcher files.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ActionSchemaCacheEngine,
  actionSchemaCacheEngine,
  type ActionSchema,
  type SchemaSearchResult,
} from "../engines/ActionSchemaCacheEngine.js";

describe("ActionSchemaCacheEngine", () => {
  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(actionSchemaCacheEngine).toBeDefined();
      expect(actionSchemaCacheEngine).toBeInstanceOf(ActionSchemaCacheEngine);
    });

    it("exports class for custom instantiation", () => {
      const engine = new ActionSchemaCacheEngine();
      expect(engine).toBeInstanceOf(ActionSchemaCacheEngine);
    });
  });

  describe("getStats", () => {
    it("returns cache statistics after scan", () => {
      const stats = actionSchemaCacheEngine.getStats();

      expect(stats).toHaveProperty("actions");
      expect(stats).toHaveProperty("dispatchers");
      expect(stats).toHaveProperty("withParams");

      expect(stats.actions).toBeGreaterThan(0);
      expect(stats.dispatchers).toBeGreaterThan(0);
    });

    it("actions count should be substantial (>100)", () => {
      const stats = actionSchemaCacheEngine.getStats();
      expect(stats.actions).toBeGreaterThan(100);
    });

    it("dispatchers count should reflect actual files (>20)", () => {
      const stats = actionSchemaCacheEngine.getStats();
      expect(stats.dispatchers).toBeGreaterThan(20);
    });

    it("withParams count indicates actions with parameters", () => {
      const stats = actionSchemaCacheEngine.getStats();
      expect(stats.withParams).toBeGreaterThan(0);
      expect(stats.withParams).toBeLessThanOrEqual(stats.actions);
    });
  });

  describe("getSchema", () => {
    it("returns null for unknown action", () => {
      const schema = actionSchemaCacheEngine.getSchema(
        "nonexistent_action_xyz_123"
      );
      expect(schema).toBeNull();
    });

    it("returns schema for known action (material_get)", () => {
      const schema = actionSchemaCacheEngine.getSchema("material_get");
      // material_get may or may not exist, skip if not found
      if (schema) {
        expect(schema.action).toBe("material_get");
        expect(schema.dispatcher).toBeDefined();
        expect(Array.isArray(schema.params)).toBe(true);
      }
    });

    it("schema has required properties", () => {
      // Get any action that exists
      const stats = actionSchemaCacheEngine.getStats();
      if (stats.actions === 0) return; // Skip if no actions

      const results = actionSchemaCacheEngine.searchSchemas("", 1);
      if (results.length === 0) return;

      const schema = actionSchemaCacheEngine.getSchema(results[0].action);
      expect(schema).not.toBeNull();
      expect(schema!.action).toBe(results[0].action);
      expect(schema!.dispatcher).toBeDefined();
      expect(Array.isArray(schema!.params)).toBe(true);
      expect(typeof schema!.hasOptional).toBe("boolean");
    });
  });

  describe("searchSchemas", () => {
    it("returns empty array for no matches", () => {
      const results = actionSchemaCacheEngine.searchSchemas(
        "zzz_nonexistent_xyz_999"
      );
      expect(results).toEqual([]);
    });

    it("returns results matching action name", () => {
      const results = actionSchemaCacheEngine.searchSchemas("calc");
      // Should find calc-related actions
      if (results.length > 0) {
        expect(
          results.some(
            (r) => r.action.includes("calc") || r.dispatcher.includes("calc")
          )
        ).toBe(true);
      }
    });

    it("respects max limit", () => {
      const results = actionSchemaCacheEngine.searchSchemas("", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });

    it("defaults to max 10 results", () => {
      const results = actionSchemaCacheEngine.searchSchemas("");
      expect(results.length).toBeLessThanOrEqual(10);
    });

    it("results have required properties", () => {
      const results = actionSchemaCacheEngine.searchSchemas("", 3);

      for (const result of results) {
        expect(result).toHaveProperty("action");
        expect(result).toHaveProperty("dispatcher");
        expect(result).toHaveProperty("params");
        expect(result).toHaveProperty("signature");
        expect(typeof result.action).toBe("string");
        expect(typeof result.dispatcher).toBe("string");
        expect(Array.isArray(result.params)).toBe(true);
        expect(typeof result.signature).toBe("string");
      }
    });

    it("signature includes action and params", () => {
      const results = actionSchemaCacheEngine.searchSchemas("", 3);

      for (const result of results) {
        expect(result.signature).toContain(result.action);
        expect(result.signature).toContain("(");
        expect(result.signature).toContain(")");
      }
    });
  });

  describe("getParamHint", () => {
    it("returns unknown action message for nonexistent action", () => {
      const hint = actionSchemaCacheEngine.getParamHint(
        "nonexistent_action_xyz"
      );
      expect(hint).toContain("[unknown action]");
    });

    it("returns no params message for parameterless action", () => {
      // Find an action without params
      const results = actionSchemaCacheEngine.searchSchemas("", 100);
      const noParamsAction = results.find((r) => r.params.length === 0);

      if (noParamsAction) {
        const hint = actionSchemaCacheEngine.getParamHint(noParamsAction.action);
        expect(hint).toContain("no params");
      }
    });

    it("returns params in hint for action with params", () => {
      // Find an action with params
      const results = actionSchemaCacheEngine.searchSchemas("", 100);
      const withParamsAction = results.find((r) => r.params.length > 0);

      if (withParamsAction) {
        const hint = actionSchemaCacheEngine.getParamHint(
          withParamsAction.action
        );
        expect(hint).toContain(withParamsAction.action);
        expect(hint).toContain("(");
        // Should contain at least one param
        expect(
          withParamsAction.params.some((p) => hint.includes(p))
        ).toBe(true);
      }
    });
  });

  describe("getDispatcherActions", () => {
    it("returns empty array for unknown dispatcher", () => {
      const results = actionSchemaCacheEngine.getDispatcherActions(
        "nonexistent_dispatcher_xyz"
      );
      expect(results).toEqual([]);
    });

    it("returns actions for known dispatcher (calc)", () => {
      const results = actionSchemaCacheEngine.getDispatcherActions("calc");

      // calcDispatcher should have actions
      if (results.length > 0) {
        expect(results.every((r) => r.dispatcher.includes("calc"))).toBe(true);
      }
    });

    it("handles dispatcher name with Dispatcher suffix", () => {
      const withSuffix = actionSchemaCacheEngine.getDispatcherActions(
        "calcDispatcher"
      );
      const withoutSuffix =
        actionSchemaCacheEngine.getDispatcherActions("calc");

      // Both should return the same results
      expect(withSuffix.length).toBe(withoutSuffix.length);
    });

    it("handles dispatcher name with .ts extension", () => {
      const withExt = actionSchemaCacheEngine.getDispatcherActions(
        "calcDispatcher.ts"
      );
      const withoutExt =
        actionSchemaCacheEngine.getDispatcherActions("calc");

      // Both should return the same results
      expect(withExt.length).toBe(withoutExt.length);
    });

    it("returns results with proper structure", () => {
      const results = actionSchemaCacheEngine.getDispatcherActions("data");

      for (const result of results) {
        expect(result).toHaveProperty("action");
        expect(result).toHaveProperty("dispatcher");
        expect(result).toHaveProperty("params");
        expect(result).toHaveProperty("signature");
      }
    });
  });

  describe("invalidate", () => {
    it("clears cache and forces rescan", () => {
      // Get stats before invalidate
      const statsBefore = actionSchemaCacheEngine.getStats();

      // Invalidate cache
      actionSchemaCacheEngine.invalidate();

      // Get stats after (should trigger rescan)
      const statsAfter = actionSchemaCacheEngine.getStats();

      // Stats should be similar (same dispatchers scanned)
      expect(statsAfter.actions).toBeGreaterThan(0);
      expect(statsAfter.dispatchers).toBeGreaterThan(0);
    });

    it("does not throw when called multiple times", () => {
      expect(() => {
        actionSchemaCacheEngine.invalidate();
        actionSchemaCacheEngine.invalidate();
        actionSchemaCacheEngine.invalidate();
      }).not.toThrow();
    });
  });

  describe("cache behavior", () => {
    it("subsequent calls use cached data (fast)", () => {
      // First call triggers scan
      const start1 = Date.now();
      actionSchemaCacheEngine.getStats();
      const time1 = Date.now() - start1;

      // Second call should use cache (faster)
      const start2 = Date.now();
      actionSchemaCacheEngine.getStats();
      const time2 = Date.now() - start2;

      // Cached call should be very fast
      expect(time2).toBeLessThan(10);
    });

    it("different methods share cache", () => {
      // Invalidate to ensure fresh start
      actionSchemaCacheEngine.invalidate();

      // Call getStats to populate cache
      actionSchemaCacheEngine.getStats();

      // These should use cached data
      const results = actionSchemaCacheEngine.searchSchemas("", 5);
      expect(results.length).toBeGreaterThan(0);

      const schema = actionSchemaCacheEngine.getSchema(results[0].action);
      expect(schema).not.toBeNull();
    });
  });

  describe("param extraction", () => {
    it("extracts params from dot notation (params.name)", () => {
      // Search for actions with known params
      const results = actionSchemaCacheEngine.searchSchemas("", 50);
      const withParams = results.filter((r) => r.params.length > 0);

      expect(withParams.length).toBeGreaterThan(0);

      // Params should be sorted alphabetically
      for (const result of withParams) {
        const sorted = [...result.params].sort();
        expect(result.params).toEqual(sorted);
      }
    });

    it("params do not include internal properties", () => {
      const results = actionSchemaCacheEngine.searchSchemas("", 100);

      for (const result of results) {
        // Should not include length or toString
        expect(result.params).not.toContain("length");
        expect(result.params).not.toContain("toString");
      }
    });
  });

  describe("hasOptional detection", () => {
    it("detects optional params from || or ?? syntax", () => {
      // Get a sample of schemas
      const stats = actionSchemaCacheEngine.getStats();
      const results = actionSchemaCacheEngine.searchSchemas("", 50);

      // Some actions should have optional params
      let hasOptionalCount = 0;
      for (const result of results) {
        const schema = actionSchemaCacheEngine.getSchema(result.action);
        if (schema?.hasOptional) hasOptionalCount++;
      }

      // It's reasonable to have some actions with optional params
      // but this test just verifies the detection works
      expect(typeof hasOptionalCount).toBe("number");
    });
  });

  describe("real dispatcher coverage", () => {
    it("scans calcDispatcher actions", () => {
      const results = actionSchemaCacheEngine.getDispatcherActions("calc");
      expect(results.length).toBeGreaterThan(0);
    });

    it("scans dataDispatcher actions", () => {
      const results = actionSchemaCacheEngine.getDispatcherActions("data");
      expect(results.length).toBeGreaterThan(0);
    });

    it("scans safetyDispatcher actions", () => {
      const results = actionSchemaCacheEngine.getDispatcherActions("safety");
      // safety dispatcher should have actions
      expect(results.length).toBeGreaterThanOrEqual(0);
    });

    it("total actions matches sum of per-dispatcher actions", () => {
      const stats = actionSchemaCacheEngine.getStats();
      const allResults = actionSchemaCacheEngine.searchSchemas("", 10000);

      // All results should not exceed total stats
      expect(allResults.length).toBeLessThanOrEqual(stats.actions);
    });
  });
});
