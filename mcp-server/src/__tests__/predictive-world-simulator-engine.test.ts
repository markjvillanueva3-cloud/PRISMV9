/**
 * Tests for PredictiveWorldSimulatorEngine (Phase 0.18 U-AGI9)
 */

import { describe, it, expect } from "vitest";
import {
  PredictiveWorldSimulatorEngine,
  DEFAULT_SIMULATOR_WEIGHTS,
  predictiveWorldSimulatorEngine,
  type ChangeDescriptor,
} from "../engines/PredictiveWorldSimulatorEngine.js";

function change(overrides: Partial<ChangeDescriptor> = {}): ChangeDescriptor {
  return {
    path: overrides.path ?? "src/engines/FooEngine.ts",
    kind: overrides.kind ?? "edit",
    testFiles: overrides.testFiles,
    dependents: overrides.dependents,
    criticalFile: overrides.criticalFile,
    sizeDeltaLines: overrides.sizeDeltaLines,
    touchesPublicApi: overrides.touchesPublicApi,
  };
}

describe("PredictiveWorldSimulatorEngine", () => {
  const engine = new PredictiveWorldSimulatorEngine();

  describe("validation", () => {
    it("rejects empty path", () => {
      expect(() => engine.simulate(change({ path: "" }))).toThrow(/path/);
    });

    it("rejects invalid kind", () => {
      expect(() => engine.simulate({ path: "x", kind: "foo" as "edit" })).toThrow(/kind/);
    });

    it("rejects negative sizeDelta", () => {
      expect(() => engine.simulate(change({ sizeDeltaLines: -1 }))).toThrow(/sizeDeltaLines/);
    });
  });

  describe("risk classification", () => {
    it("low risk for minor edit with tests present", () => {
      const r = engine.simulate(change({ testFiles: ["a.test.ts"] }));
      expect(r.risk).toBe("low");
    });

    it("elevates risk when tests are absent", () => {
      const r = engine.simulate(change());
      expect(["medium", "high"]).toContain(r.risk);
    });

    it("high risk when critical file + many dependents + public API", () => {
      const r = engine.simulate(change({
        criticalFile: true,
        touchesPublicApi: true,
        dependents: Array.from({ length: 50 }, (_, i) => `dep-${i}`),
        testFiles: ["a.test.ts"],
      }));
      expect(r.risk).toBe("high");
    });
  });

  describe("warnings", () => {
    it("flags critical file", () => {
      const r = engine.simulate(change({ criticalFile: true, testFiles: ["a.test.ts"] }));
      expect(r.warnings.join(" ")).toMatch(/critical/);
    });

    it("flags public API change", () => {
      const r = engine.simulate(change({ touchesPublicApi: true, testFiles: ["a.test.ts"] }));
      expect(r.warnings.join(" ")).toMatch(/API/i);
    });

    it("flags large delta", () => {
      const r = engine.simulate(change({
        sizeDeltaLines: DEFAULT_SIMULATOR_WEIGHTS.largeDelta + 50,
        testFiles: ["a.test.ts"],
      }));
      expect(r.warnings.join(" ")).toMatch(/large delta/);
    });

    it("flags dependent count", () => {
      const r = engine.simulate(change({ dependents: ["a", "b"], testFiles: ["a.test.ts"] }));
      expect(r.warnings.join(" ")).toMatch(/dependent/);
    });

    it("flags missing tests on non-delete changes", () => {
      const r = engine.simulate(change({ kind: "edit" }));
      expect(r.warnings.join(" ")).toMatch(/no tests/);
    });

    it("does not flag missing tests on delete", () => {
      const r = engine.simulate(change({ kind: "delete" }));
      expect(r.warnings.join(" ")).not.toMatch(/no tests/);
    });
  });

  describe("likelyAffected", () => {
    it("merges tests and dependents, capped at 10", () => {
      const deps = Array.from({ length: 15 }, (_, i) => `d-${i}`);
      const r = engine.simulate(change({ testFiles: ["t1", "t2"], dependents: deps }));
      expect(r.likelyAffected.length).toBeLessThanOrEqual(10);
    });

    it("dedupes overlapping tests and dependents", () => {
      const r = engine.simulate(change({ testFiles: ["a", "b"], dependents: ["a", "c"] }));
      expect(new Set(r.likelyAffected).size).toBe(r.likelyAffected.length);
    });
  });

  describe("breakProbability", () => {
    it("is bounded in [0, 1]", () => {
      const r = engine.simulate(change({
        criticalFile: true,
        touchesPublicApi: true,
        sizeDeltaLines: 10000,
        dependents: Array.from({ length: 1000 }, (_, i) => `d${i}`),
        kind: "delete",
      }));
      expect(r.breakProbability).toBeGreaterThanOrEqual(0);
      expect(r.breakProbability).toBeLessThanOrEqual(1);
    });

    it("delete kind has higher multiplier than write", () => {
      // Provide tests on both so the missing-tests penalty doesn't dominate;
      // now only the kind multiplier differs.
      const del = engine.simulate(change({ kind: "delete", criticalFile: true, testFiles: ["a.test.ts"] }));
      const wri = engine.simulate(change({ kind: "write", criticalFile: true, testFiles: ["a.test.ts"] }));
      expect(del.breakProbability).toBeGreaterThan(wri.breakProbability);
    });
  });

  describe("recommendation", () => {
    it("mentions run simulation + review on high risk", () => {
      const r = engine.simulate(change({
        criticalFile: true,
        touchesPublicApi: true,
        dependents: Array.from({ length: 20 }, (_, i) => `d${i}`),
      }));
      expect(r.recommendation).toMatch(/simulation|review/);
    });

    it("says proceed on low risk", () => {
      const r = engine.simulate(change({ testFiles: ["a.test.ts"] }));
      expect(r.recommendation).toMatch(/proceed/);
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = predictiveWorldSimulatorEngine.simulate(change({ testFiles: ["a.test.ts"] }));
      expect(["low", "medium", "high"]).toContain(r.risk);
    });
  });
});
