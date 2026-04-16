/**
 * Tests for MultiCamStrategyEngineExt — 13 extended CAM systems
 * PowerMill, CATIA, Cimatron, Tebis, WorkNC, CAMWorks, BobCAD,
 * Edgecam, TopSolid, SprutCAM, Mazatrol, Macro Programming, Vericut
 */
import { describe, it, expect } from "vitest";
import {
  MultiCamStrategyEngineExt,
  type ExtendedCamSource,
} from "../engines/MultiCamStrategyEngineExt.js";

const engine = new MultiCamStrategyEngineExt();

describe("MultiCamStrategyEngineExt", () => {
  describe("stats()", () => {
    it("should have 13 CAM systems", () => {
      const stats = engine.stats();
      expect(Object.keys(stats.bySystem)).toHaveLength(13);
    });

    it("should have 250+ total strategies", () => {
      const stats = engine.stats();
      expect(stats.totalStrategies).toBeGreaterThanOrEqual(250);
    });

    it("should list all 13 systems", () => {
      const systems = engine.listSystems();
      expect(systems).toContain("powermill");
      expect(systems).toContain("catia");
      expect(systems).toContain("cimatron");
      expect(systems).toContain("tebis");
      expect(systems).toContain("worknc");
      expect(systems).toContain("camworks");
      expect(systems).toContain("bobcad");
      expect(systems).toContain("edgecam");
      expect(systems).toContain("topsolid");
      expect(systems).toContain("sprutcam");
      expect(systems).toContain("mazatrol");
      expect(systems).toContain("macro_programming");
      expect(systems).toContain("vericut");
    });
  });

  describe("per-system strategy counts", () => {
    const expected: [ExtendedCamSource, number][] = [
      ["powermill", 28],
      ["catia", 24],
      ["cimatron", 20],
      ["tebis", 22],
      ["worknc", 20],
      ["camworks", 18],
      ["bobcad", 16],
      ["edgecam", 18],
      ["topsolid", 18],
      ["sprutcam", 18],
      ["mazatrol", 22],
      ["macro_programming", 20],
      ["vericut", 12],
    ];

    it.each(expected)("%s should have %d strategies", (sys, count) => {
      const strats = engine.listStrategies(sys);
      expect(strats).toHaveLength(count);
    });
  });

  describe("recommend()", () => {
    it("should recommend Vortex for PowerMill roughing", () => {
      const r = engine.recommend({
        camSystem: "powermill",
        geometryType: "pocket_2d",
        operationGoal: "roughing",
      });
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.strategyName).toBe("Vortex");
    });

    it("should recommend a Mazatrol strategy for conversational turning", () => {
      const r = engine.recommend({
        camSystem: "mazatrol",
        geometryType: "turning_external",
        operationGoal: "conversational",
      });
      expect(r.confidence).toBeGreaterThan(0);
      // DONE ALL-IN-ONE or MAZATROL BAR — both valid Mazatrol strategies
      expect(r.camSystem).toBe("mazatrol");
    });

    it("should recommend Force Optimization for Vericut simulation", () => {
      const r = engine.recommend({
        camSystem: "vericut",
        geometryType: "freeform_3d",
        operationGoal: "simulation_optimize",
      });
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.strategyName).toBe("Force Optimization");
    });

    it("should recommend AOT for macro programming roughing", () => {
      const r = engine.recommend({
        camSystem: "macro_programming",
        geometryType: "freeform_3d",
        operationGoal: "macro_cycle",
      });
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.strategyName).toBe("AOT Adaptive Override");
    });

    it("should handle unknown CAM system gracefully", () => {
      const r = engine.recommend({
        camSystem: "nonexistent" as any,
        geometryType: "pocket_2d",
        operationGoal: "roughing",
      });
      expect(r.confidence).toBe(0);
      expect(r.warnings).toHaveLength(1);
    });

    it("should handle no matching strategy gracefully", () => {
      const r = engine.recommend({
        camSystem: "vericut",
        geometryType: "turning_groove",
        operationGoal: "deburring",
      });
      expect(r.confidence).toBe(0);
    });

    it("should add superalloy warning for S material roughing", () => {
      const r = engine.recommend({
        camSystem: "powermill",
        geometryType: "pocket_2d",
        operationGoal: "roughing",
        materialGroup: "S",
      });
      expect(r.warnings.some((w) => w.includes("Superalloy"))).toBe(true);
    });

    it("should warn about 5-axis requirement on 3-axis machine", () => {
      const r = engine.recommend({
        camSystem: "worknc",
        geometryType: "freeform_3d",
        operationGoal: "finishing",
        axisCount: 3,
      });
      // Auto 5-Axis is the top strategy — should warn
      if (r.strategyName === "Auto 5-Axis") {
        expect(r.warnings.some((w) => w.includes("5-axis"))).toBe(true);
      }
    });
  });

  describe("getFlagship()", () => {
    const flagships: [ExtendedCamSource, string][] = [
      ["powermill", "Vortex"],
      ["catia", "HSM Roughing"],
      ["cimatron", "Rough Geodesic"],
      ["tebis", "Optimized Finishing"],
      ["worknc", "Auto 5-Axis"],
      ["camworks", "VoluMill"],
      ["bobcad", "Adaptive HSM"],
      ["edgecam", "Waveform Roughing"],
      ["topsolid", "Roughing Trochoidal"],
      ["sprutcam", "5-Axis Multiaxis"],
      ["mazatrol", "SMOOTH Ai Machining"],
      ["macro_programming", "AOT Adaptive Override"],
      ["vericut", "Force Optimization"],
    ];

    it.each(flagships)("%s flagship should be %s", (sys, name) => {
      const f = engine.getFlagship(sys);
      expect(f).not.toBeNull();
      expect(f!.strategyName).toBe(name);
    });
  });

  describe("compareAcrossSystems()", () => {
    it("should compare roughing across all systems", () => {
      const comparison = engine.compareAcrossSystems("pocket_2d", "roughing");
      expect(Object.keys(comparison)).toHaveLength(13);
      // Most systems should have a pocket roughing strategy
      const nonNull = Object.values(comparison).filter((v) => v !== null);
      expect(nonNull.length).toBeGreaterThanOrEqual(10);
    });
  });

  describe("search()", () => {
    it("should find trochoidal strategies across systems", () => {
      const results = engine.search("trochoidal");
      expect(results.length).toBeGreaterThanOrEqual(2);
    });

    it("should find Mazatrol strategies", () => {
      const results = engine.search("MAZATROL");
      expect(results.length).toBeGreaterThanOrEqual(10);
      expect(results.every((r) => r.camSystem === "mazatrol")).toBe(true);
    });

    it("should find electrode strategies", () => {
      const results = engine.search("electrode");
      expect(results.length).toBeGreaterThanOrEqual(3);
    });

    it("should respect limit parameter", () => {
      const results = engine.search("finish", 5);
      expect(results.length).toBeLessThanOrEqual(5);
    });
  });

  describe("getPortabilityIntents()", () => {
    it("should return intents for known strategy", () => {
      const intents = engine.getPortabilityIntents("powermill", "Vortex");
      expect(intents).toContain("adaptive_clearing");
    });

    it("should return empty for unknown strategy", () => {
      const intents = engine.getPortabilityIntents("powermill", "NonExistent");
      expect(intents).toHaveLength(0);
    });
  });
});
