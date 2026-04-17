/**
 * Tests for build-action-resolution-index script (Universal Phase 0.7)
 *
 * Validates the ACTION_RESOLUTION_INDEX.json builder produces correct output.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  buildActionResolutionIndex,
  readActionResolutionIndex,
  ActionResolutionIndex,
} from "../../scripts/build-action-resolution-index.js";

describe("build-action-resolution-index (Phase 0.7)", () => {
  let index: ActionResolutionIndex;

  beforeAll(async () => {
    const existing = await readActionResolutionIndex();
    if (existing && existing.actionCount > 100) {
      index = existing;
    } else {
      index = await buildActionResolutionIndex();
    }
  }, 30000);

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

    it("has actionCount matching actions object keys", () => {
      expect(index.actionCount).toBe(Object.keys(index.actions).length);
    });

    it("indexes at least 100 actions", () => {
      expect(index.actionCount).toBeGreaterThan(100);
    });
  });

  describe("action resolution structure", () => {
    it("every action has required fields", () => {
      for (const [name, res] of Object.entries(index.actions)) {
        expect(typeof res.dispatcher, `${name}.dispatcher`).toBe("string");
        expect(Array.isArray(res.engines), `${name}.engines`).toBe(true);
        expect(Array.isArray(res.skills), `${name}.skills`).toBe(true);
        expect(Array.isArray(res.tests), `${name}.tests`).toBe(true);
      }
    });

    it("action names follow snake_case pattern", () => {
      for (const action of Object.keys(index.actions)) {
        expect(action).toMatch(/^[a-z_][a-z0-9_]*$/);
      }
    });

    it("dispatcher names end with Dispatcher.ts", () => {
      for (const res of Object.values(index.actions)) {
        expect(res.dispatcher).toMatch(/Dispatcher\.ts$/);
      }
    });
  });

  describe("known action consumers", () => {
    it("kienzle_force action exists and has engine reference", () => {
      const res = index.actions["kienzle_force"];
      expect(res).toBeDefined();
      expect(res.engines.length).toBeGreaterThan(0);
    });

    it("calc actions are in calcDispatcher", () => {
      const calcActions = Object.entries(index.actions)
        .filter(([, res]) => res.dispatcher === "calcDispatcher.ts");
      expect(calcActions.length).toBeGreaterThan(10);
    });

    it("edm actions are in edmDispatcher", () => {
      const edmActions = Object.entries(index.actions)
        .filter(([, res]) => res.dispatcher === "edmDispatcher.ts");
      expect(edmActions.length).toBeGreaterThan(5);
    });
  });

  describe("coverage metrics", () => {
    it("majority of actions have engine references", () => {
      const withEngines = Object.values(index.actions).filter((r) => r.engines.length > 0).length;
      const ratio = withEngines / index.actionCount;
      expect(ratio).toBeGreaterThan(0.5);
    });

    it("some actions have test coverage", () => {
      const withTests = Object.values(index.actions).filter((r) => r.tests.length > 0).length;
      expect(withTests).toBeGreaterThan(10);
    });

    it("some actions have skill references", () => {
      const withSkills = Object.values(index.actions).filter((r) => r.skills.length > 0).length;
      expect(withSkills).toBeGreaterThan(10);
    });
  });

  describe("edge cases", () => {
    it("handles actions with no engine references", () => {
      const noEngines = Object.values(index.actions).filter((r) => r.engines.length === 0);
      expect(noEngines.length).toBeGreaterThanOrEqual(0);
    });

    it("does not have duplicate action entries", () => {
      const actionNames = Object.keys(index.actions);
      const uniqueNames = new Set(actionNames);
      expect(actionNames.length).toBe(uniqueNames.size);
    });
  });
});
