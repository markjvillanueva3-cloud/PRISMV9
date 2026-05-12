/**
 * Tests for SVIImpactProjectorEngine (Phase 0.14 U-SVI2)
 */

import { describe, it, expect } from "vitest";
import {
  SVIImpactProjectorEngine,
  DEFAULT_WEIGHTS,
  sviImpactProjectorEngine,
  type ProposedAsset,
} from "../engines/SVIImpactProjectorEngine.js";

describe("SVIImpactProjectorEngine", () => {
  const engine = new SVIImpactProjectorEngine();

  const basicEngineProposal: ProposedAsset = {
    type: "engine",
    name: "FooEngine",
    wiredConsumers: [],
    testCoverage: 0,
  };

  describe("validation", () => {
    it("rejects missing name", () => {
      expect(() => engine.project({ type: "engine", name: "" })).toThrow(/non-empty/);
      expect(() => engine.project({ type: "engine", name: "   " })).toThrow(/non-empty/);
    });

    it("rejects out-of-range testCoverage", () => {
      expect(() => engine.project({ type: "engine", name: "X", testCoverage: -0.1 })).toThrow(/testCoverage/);
      expect(() => engine.project({ type: "engine", name: "X", testCoverage: 1.1 })).toThrow(/testCoverage/);
    });

    it("rejects unknown asset type", () => {
      expect(() => engine.project({ type: "alien" as "engine", name: "X" })).toThrow(/type/);
    });
  });

  describe("orphan detection", () => {
    it("penalises a new engine with zero wired consumers", () => {
      const r = engine.project(basicEngineProposal);
      expect(r.psiDelta).toBeLessThan(0);
      expect(r.rationale.join(" ")).toContain("no wired consumers");
    });

    it("classifies severe orphans as high risk", () => {
      const r = engine.project(basicEngineProposal);
      expect(r.risk).toBe("high");
    });
  });

  describe("wiring bonus", () => {
    it("rewards one wired consumer", () => {
      const orphan = engine.project(basicEngineProposal);
      const wired = engine.project({ ...basicEngineProposal, wiredConsumers: ["fooDispatcher"] });
      expect(wired.psiDelta).toBeGreaterThan(orphan.psiDelta);
    });

    it("caps the wiring bonus", () => {
      const many = engine.project({
        ...basicEngineProposal,
        wiredConsumers: Array.from({ length: 100 }, (_, i) => `d${i}`),
      });
      const few = engine.project({
        ...basicEngineProposal,
        wiredConsumers: ["a", "b", "c", "d", "e"],
      });
      const bonusFew = parseFloat(
        few.rationale.find((r) => r.includes("wired consumer"))?.match(/\+([0-9.]+)/)?.[1] ?? "0"
      );
      const bonusMany = parseFloat(
        many.rationale.find((r) => r.includes("wired consumer"))?.match(/\+([0-9.]+)/)?.[1] ?? "0"
      );
      expect(bonusMany).toBeLessThanOrEqual(DEFAULT_WEIGHTS.wiringBonusCap);
      expect(bonusFew).toBeLessThanOrEqual(bonusMany);
    });
  });

  describe("test coverage", () => {
    it("rewards 100% coverage", () => {
      const bare = engine.project({ ...basicEngineProposal, wiredConsumers: ["x"] });
      const tested = engine.project({ ...basicEngineProposal, wiredConsumers: ["x"], testCoverage: 1.0 });
      expect(tested.psiDelta).toBeGreaterThan(bare.psiDelta);
    });

    it("scales linearly with coverage", () => {
      const low = engine.project({ ...basicEngineProposal, wiredConsumers: ["x"], testCoverage: 0.25 });
      const high = engine.project({ ...basicEngineProposal, wiredConsumers: ["x"], testCoverage: 0.75 });
      expect(high.psiDelta).toBeGreaterThan(low.psiDelta);
    });

    it("rationale mentions no test coverage when zero", () => {
      const r = engine.project({ ...basicEngineProposal, wiredConsumers: ["x"] });
      expect(r.rationale.join(" ")).toContain("no test coverage");
    });
  });

  describe("watched surface bonus", () => {
    it("adds the watched-surface bonus", () => {
      const plain = engine.project({ ...basicEngineProposal, wiredConsumers: ["x"] });
      const watched = engine.project({
        ...basicEngineProposal,
        wiredConsumers: ["x"],
        touchesWatchedSurface: true,
      });
      expect(watched.psiDelta).toBeGreaterThan(plain.psiDelta);
    });
  });

  describe("maintenance", () => {
    it("returns neutral delta for maintenance proposals", () => {
      const r = engine.project({ type: "engine", name: "BugFix", isMaintenance: true });
      expect(r.psiDelta).toBe(0);
      expect(r.rationale.join(" ")).toContain("maintenance");
    });
  });

  describe("classify()", () => {
    it("high for delta <= -0.5", () => {
      expect(engine.classify(-1)).toBe("high");
      expect(engine.classify(-0.5)).toBe("high");
    });

    it("medium for -0.5 < delta <= 0.5", () => {
      expect(engine.classify(0)).toBe("medium");
      expect(engine.classify(0.5)).toBe("medium");
    });

    it("low for delta > 0.5", () => {
      expect(engine.classify(0.51)).toBe("low");
      expect(engine.classify(5)).toBe("low");
    });
  });

  describe("badgeFor()", () => {
    it("adds + sign for non-negative", () => {
      expect(engine.badgeFor(1.23)).toBe("Ψ +1.23");
      expect(engine.badgeFor(0)).toBe("Ψ +0.00");
    });

    it("omits + sign for negative (keeps minus)", () => {
      expect(engine.badgeFor(-1.23)).toBe("Ψ -1.23");
    });
  });

  describe("asset type handling", () => {
    const types: Array<ProposedAsset["type"]> = ["engine", "action", "route", "schema", "dispatcher", "skill", "hook"];
    for (const t of types) {
      it(`scores a typical ${t} proposal with wiring + tests positively`, () => {
        const r = engine.project({
          type: t,
          name: "X",
          wiredConsumers: ["d1", "d2"],
          testCoverage: 1.0,
          touchesWatchedSurface: true,
        });
        expect(r.psiDelta).toBeGreaterThan(0);
        expect(r.risk).not.toBe("high");
      });
    }
  });

  describe("psiDelta rounding", () => {
    it("rounds to two decimal places", () => {
      const r = engine.project({
        type: "engine",
        name: "X",
        wiredConsumers: ["a"],
        testCoverage: 0.3333,
      });
      const decimals = (r.psiDelta.toString().split(".")[1] ?? "").length;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe("default weights", () => {
    it("covers every asset type in baseByType", () => {
      const types: Array<ProposedAsset["type"]> = ["engine", "action", "route", "schema", "dispatcher", "skill", "hook"];
      for (const t of types) {
        expect(DEFAULT_WEIGHTS.baseByType[t]).toBeGreaterThan(0);
      }
    });
  });

  describe("module singleton", () => {
    it("exports a ready-to-use instance", () => {
      const r = sviImpactProjectorEngine.project({
        type: "engine",
        name: "X",
        wiredConsumers: ["a"],
        testCoverage: 1.0,
      });
      expect(r.psiDelta).toBeGreaterThan(0);
    });
  });
});
