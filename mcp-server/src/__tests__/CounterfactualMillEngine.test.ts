import { describe, it, expect } from "vitest";
import {
  CounterfactualMillEngine,
  type MillingBaselineParams,
} from "../engines/CounterfactualMillEngine.js";

describe("CounterfactualMillEngine", () => {
  const engine = new CounterfactualMillEngine();

  const baselineParams: MillingBaselineParams = {
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.1,
    axial_depth_mm: 3,
    radial_depth_mm: 6,
    tool_diameter_mm: 12,
    number_of_teeth: 4,
    material_iso_group: "P",
    operation: "roughing",
  };

  describe("analyze", () => {
    it("should generate multiple counterfactual scenarios", () => {
      const result = engine.analyze(baselineParams);

      expect(result.baseline).toEqual(baselineParams);
      expect(result.scenarios.length).toBeGreaterThan(5);
      expect(result.baseline_estimates.cutting_force_N).toBeGreaterThan(0);
      expect(result.baseline_estimates.tool_life_min).toBeGreaterThan(0);
      expect(result.baseline_estimates.mrr_cm3_min).toBeGreaterThan(0);
    });

    it("should identify best and worst scenarios", () => {
      const result = engine.analyze(baselineParams);

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("should generate recommendations", () => {
      const result = engine.analyze(baselineParams);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should include trochoidal scenario for roughing", () => {
      const result = engine.analyze(baselineParams);

      const trochoidal = result.scenarios.find(
        s => s.intervention.counterfactual_value === "trochoidal"
      );
      expect(trochoidal).toBeDefined();
      expect(trochoidal?.recommendation).toBe("strongly_recommended");
    });
  });

  describe("generateSingleCounterfactual", () => {
    it("should generate counterfactual for speed change", () => {
      const cf = engine.generateSingleCounterfactual(baselineParams, "cutting_speed_mpm", 200);

      expect(cf.intervention.parameter).toBe("cutting_speed_mpm");
      expect(cf.intervention.baseline_value).toBe(150);
      expect(cf.intervention.counterfactual_value).toBe(200);
      expect(cf.intervention.change_pct).toBeCloseTo(33.33, 1);
      expect(cf.predicted_effects.tool_life_delta_pct).toBeLessThan(0);
    });

    it("should generate counterfactual for feed change", () => {
      const cf = engine.generateSingleCounterfactual(baselineParams, "feed_per_tooth_mm", 0.15);

      expect(cf.intervention.parameter).toBe("feed_per_tooth_mm");
      expect(cf.predicted_effects.cutting_force_delta_pct).toBeGreaterThan(0);
      expect(cf.predicted_effects.mrr_delta_pct).toBeGreaterThan(0);
    });
  });

  describe("hardened material scenarios", () => {
    it("should produce shorter tool life estimates for hardened steel", () => {
      const hardenedParams: MillingBaselineParams = {
        ...baselineParams,
        material_iso_group: "H",
        hardness_hrc: 55,
        cutting_speed_mpm: 100,
      };

      const softParams: MillingBaselineParams = {
        ...baselineParams,
        material_iso_group: "P",
        cutting_speed_mpm: 100,
      };

      const hardenedResult = engine.analyze(hardenedParams);
      const softResult = engine.analyze(softParams);

      expect(hardenedResult.baseline_estimates.tool_life_min)
        .toBeLessThan(softResult.baseline_estimates.tool_life_min);
    });
  });

  describe("scenario ranking", () => {
    it("should rank scenarios by recommendation quality", () => {
      const result = engine.analyze(baselineParams);

      const recommendationOrder = ["strongly_recommended", "recommended", "neutral", "not_recommended", "avoid"];

      for (let i = 1; i < result.scenarios.length; i++) {
        const prevRank = recommendationOrder.indexOf(result.scenarios[i - 1].recommendation);
        const currRank = recommendationOrder.indexOf(result.scenarios[i].recommendation);
        expect(prevRank).toBeLessThanOrEqual(currRank);
      }
    });
  });
});
