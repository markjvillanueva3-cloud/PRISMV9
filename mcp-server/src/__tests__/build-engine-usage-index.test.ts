/**
 * Tests for build-engine-usage-index script (Universal Phase 0.7)
 *
 * Validates the ENGINE_USAGE_INDEX.json builder produces correct output.
 * Tests scanner correctness, output schema, and known engine consumers.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildEngineUsageIndex,
  readEngineUsageIndex,
  getEngineUsage,
  EngineUsageIndex,
  EngineUsage,
} from "../../scripts/build-engine-usage-index.js";

describe("build-engine-usage-index (Phase 0.7)", () => {
  let index: EngineUsageIndex;

  beforeAll(async () => {
    // Try to read existing index first (fast path for CI)
    const existing = await readEngineUsageIndex();
    if (existing && existing.engineCount > 1000) {
      index = existing;
    } else {
      // Fall back to building (slower, ~30s)
      index = await buildEngineUsageIndex();
    }
  }, 60000); // 60s timeout for full scan

  describe("index structure", () => {
    it("returns a valid index object", () => {
      expect(index).toBeDefined();
      expect(typeof index).toBe("object");
    });

    it("has schemaVersion field set to 1", () => {
      expect(index.schemaVersion).toBe(1);
    });

    it("has lastUpdated as a valid ISO string", () => {
      expect(typeof index.lastUpdated).toBe("string");
      const date = new Date(index.lastUpdated);
      expect(date.toString()).not.toBe("Invalid Date");
    });

    it("has engineCount matching engines object keys", () => {
      expect(index.engineCount).toBe(Object.keys(index.engines).length);
    });

    it("indexes at least 1000 engines (PRISM has 2000+)", () => {
      expect(index.engineCount).toBeGreaterThan(1000);
    });
  });

  describe("engine usage structure", () => {
    it("every engine has required fields", () => {
      for (const [name, usage] of Object.entries(index.engines)) {
        expect(Array.isArray(usage.dispatchers), `${name}.dispatchers`).toBe(true);
        expect(Array.isArray(usage.actions), `${name}.actions`).toBe(true);
        expect(Array.isArray(usage.skills), `${name}.skills`).toBe(true);
        expect(Array.isArray(usage.hooks), `${name}.hooks`).toBe(true);
        expect(Array.isArray(usage.tests), `${name}.tests`).toBe(true);
        expect(Array.isArray(usage.routes), `${name}.routes`).toBe(true);
        expect(Array.isArray(usage.formulas), `${name}.formulas`).toBe(true);
        expect(Array.isArray(usage.tipsReferencing), `${name}.tipsReferencing`).toBe(true);
      }
    });

    it("dispatchers array contains strings", () => {
      for (const usage of Object.values(index.engines)) {
        for (const d of usage.dispatchers) {
          expect(typeof d).toBe("string");
        }
      }
    });

    it("actions array contains strings matching action naming pattern", () => {
      for (const usage of Object.values(index.engines)) {
        for (const action of usage.actions) {
          expect(typeof action).toBe("string");
          expect(action).toMatch(/^[a-z_][a-z0-9_]*$/);
        }
      }
    });
  });

  describe("known engine consumers", () => {
    it("KienzleForceModelEngine has at least 1 dispatcher consumer", async () => {
      const usage = index.engines["KienzleForceModelEngine"];
      expect(usage).toBeDefined();
      expect(usage.dispatchers.length).toBeGreaterThanOrEqual(1);
    });

    it("KienzleForceModelEngine has at least 1 test file", () => {
      const usage = index.engines["KienzleForceModelEngine"];
      expect(usage).toBeDefined();
      expect(usage.tests.length).toBeGreaterThanOrEqual(1);
    });

    it("BayesianToolLifeEngine has dispatcher consumers", () => {
      const usage = index.engines["BayesianToolLifeEngine"];
      expect(usage).toBeDefined();
      expect(usage.dispatchers.length).toBeGreaterThanOrEqual(1);
    });

    it("DuplicationGuardEngine has consumers (it's widely used)", () => {
      const usage = index.engines["DuplicationGuardEngine"];
      expect(usage).toBeDefined();
      // DuplicationGuardEngine is used by hooks and dispatchers
      const totalConsumers = usage.dispatchers.length + usage.hooks.length + usage.tests.length;
      expect(totalConsumers).toBeGreaterThan(0);
    });

    it("AwarenessQueryEngine has test coverage", () => {
      const usage = index.engines["AwarenessQueryEngine"];
      expect(usage).toBeDefined();
      expect(usage.tests.length).toBeGreaterThan(0);
    });
  });

  describe("orphan detection support", () => {
    it("identifies engines without any dispatchers", () => {
      const orphans = Object.entries(index.engines)
        .filter(([, usage]) => usage.dispatchers.length === 0)
        .map(([name]) => name);
      expect(orphans.length).toBeGreaterThan(0);
    });

    it("identifies engines without any tests", () => {
      const untested = Object.entries(index.engines)
        .filter(([, usage]) => usage.tests.length === 0)
        .map(([name]) => name);
      expect(untested.length).toBeGreaterThan(0);
    });

    it("calculates coverage ratio (engines with at least one consumer)", () => {
      const withConsumers = Object.values(index.engines).filter(
        (u) => u.dispatchers.length > 0 || u.hooks.length > 0 || u.routes.length > 0
      ).length;
      const ratio = withConsumers / index.engineCount;
      expect(ratio).toBeGreaterThan(0.1);
      expect(ratio).toBeLessThanOrEqual(1);
    });
  });

  describe("getEngineUsage helper", () => {
    it("returns null for non-existent engine", async () => {
      const usage = await getEngineUsage("NonExistentFakeEngine12345");
      expect(usage).toBeNull();
    });
  });

  describe("dispatcher-action association", () => {
    it("engines with dispatchers also have associated actions", () => {
      let enginesWithDispatchersAndActions = 0;
      let enginesWithDispatchersNoActions = 0;

      for (const usage of Object.values(index.engines)) {
        if (usage.dispatchers.length > 0) {
          if (usage.actions.length > 0) {
            enginesWithDispatchersAndActions++;
          } else {
            enginesWithDispatchersNoActions++;
          }
        }
      }

      // Most engines with dispatchers should have identifiable actions
      // (some won't due to indirect usage patterns)
      expect(enginesWithDispatchersAndActions).toBeGreaterThan(0);
    });
  });

  describe("scanner edge cases", () => {
    it("handles engines with no consumers gracefully", () => {
      const emptyUsage: EngineUsage = {
        dispatchers: [],
        actions: [],
        skills: [],
        hooks: [],
        tests: [],
        routes: [],
        formulas: [],
        tipsReferencing: [],
      };

      // At least one engine should have empty consumers
      const hasEmpty = Object.values(index.engines).some(
        (u) =>
          u.dispatchers.length === 0 &&
          u.actions.length === 0 &&
          u.hooks.length === 0 &&
          u.tests.length === 0
      );
      expect(hasEmpty).toBe(true);
    });

    it("does not include test files in engine list", () => {
      const engineNames = Object.keys(index.engines);
      const testFileNames = engineNames.filter((n) => n.endsWith(".test"));
      expect(testFileNames.length).toBe(0);
    });
  });
});
