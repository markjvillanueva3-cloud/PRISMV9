/**
 * EDMMultiPassStrategyEngine — Multi-Pass (Skim Cut) Strategy Tests
 *
 * MS-P3-TIER6A/U-P3-T6A-02
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  EDMMultiPassStrategyEngine,
  edmMultiPassStrategyEngine,
  MultiPassInput,
  PassDefinition,
} from "../engines/EDMMultiPassStrategyEngine.js";
import { WEDM_MULTI_PASS } from "../physics/wedm-constants.js";

describe("EDMMultiPassStrategyEngine", () => {
  let engine: EDMMultiPassStrategyEngine;

  beforeEach(() => {
    engine = new EDMMultiPassStrategyEngine();
  });

  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(edmMultiPassStrategyEngine).toBeInstanceOf(EDMMultiPassStrategyEngine);
      expect(edmMultiPassStrategyEngine.name).toBe("EDMMultiPassStrategyEngine");
      expect(edmMultiPassStrategyEngine.version).toBe("1.0.0");
    });
  });

  describe("determineFinishClass", () => {
    it("uses explicit finish_class when provided", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        finish_class: "ultra",
      };
      expect(engine.determineFinishClass(input)).toBe("ultra");
    });

    it("derives finish class from target Ra", () => {
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_ra_um: 0.3 })).toBe("ultra");
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_ra_um: 0.6 })).toBe("precision");
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_ra_um: 1.2 })).toBe("standard");
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_ra_um: 2.5 })).toBe("rough_only");
    });

    it("derives finish class from target recast", () => {
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_recast_um: 1.5 })).toBe("ultra");
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_recast_um: 4 })).toBe("precision");
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_recast_um: 10 })).toBe("standard");
      expect(engine.determineFinishClass({ thickness_mm: 20, cut_length_mm: 100, target_recast_um: 20 })).toBe("rough_only");
    });

    it("defaults to standard when no targets specified", () => {
      const input: MultiPassInput = { thickness_mm: 20, cut_length_mm: 100 };
      expect(engine.determineFinishClass(input)).toBe("standard");
    });
  });

  describe("determinePassCount", () => {
    it("uses explicit pass_count when provided", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        pass_count: 5,
      };
      expect(engine.determinePassCount(input, "standard")).toBe(5);
    });

    it("clamps pass_count to valid range", () => {
      expect(engine.determinePassCount({ thickness_mm: 20, cut_length_mm: 100, pass_count: 0 }, "standard")).toBe(1);
      expect(engine.determinePassCount({ thickness_mm: 20, cut_length_mm: 100, pass_count: 10 }, "standard")).toBe(WEDM_MULTI_PASS.max_passes);
    });

    it("uses finish class pass count when not specified", () => {
      const input: MultiPassInput = { thickness_mm: 20, cut_length_mm: 100 };
      expect(engine.determinePassCount(input, "rough_only")).toBe(1);
      expect(engine.determinePassCount(input, "standard")).toBe(2);
      expect(engine.determinePassCount(input, "precision")).toBe(3);
      expect(engine.determinePassCount(input, "ultra")).toBe(4);
    });
  });

  describe("buildPassSequence", () => {
    it("builds single rough pass for rough_only", () => {
      const passes = engine.buildPassSequence(1, "rough_only");
      expect(passes).toHaveLength(1);
      expect(passes[0].pass_type).toBe("rough");
      expect(passes[0].offset_mm).toBe(0);
    });

    it("builds 2-pass standard sequence", () => {
      const passes = engine.buildPassSequence(2, "standard");
      expect(passes).toHaveLength(2);
      expect(passes[0].pass_type).toBe("rough");
      expect(passes[0].offset_mm).toBeGreaterThan(0);
      expect(passes[1].pass_type).toBe("finish");
      expect(passes[1].offset_mm).toBe(0);
    });

    it("builds 3-pass precision sequence", () => {
      const passes = engine.buildPassSequence(3, "precision");
      expect(passes).toHaveLength(3);
      expect(passes[0].pass_type).toBe("rough");
      expect(passes[1].pass_type).toBe("semi");
      expect(passes[2].pass_type).toBe("finish");
      expect(passes[2].offset_mm).toBe(0);
    });

    it("builds 4-pass ultra sequence", () => {
      const passes = engine.buildPassSequence(4, "ultra");
      expect(passes).toHaveLength(4);
      expect(passes[0].pass_type).toBe("rough");
      expect(passes[1].pass_type).toBe("semi");
      expect(passes[2].pass_type).toBe("finish");
      expect(passes[3].pass_type).toBe("precision");
    });

    it("offsets decrease monotonically", () => {
      const passes = engine.buildPassSequence(4, "ultra");
      for (let i = 1; i < passes.length; i++) {
        expect(passes[i].offset_mm).toBeLessThanOrEqual(passes[i - 1].offset_mm);
      }
    });

    it("includes expected pass parameters", () => {
      const passes = engine.buildPassSequence(2, "standard");
      const rough = passes[0];
      expect(rough.speed_factor).toBe(WEDM_MULTI_PASS.speed_factor.rough);
      expect(rough.power_factor).toBe(WEDM_MULTI_PASS.power_factor.rough);
      expect(rough.expected_ra_um).toBe(WEDM_MULTI_PASS.surface_ra_um.rough);
      expect(rough.expected_recast_um).toBe(WEDM_MULTI_PASS.recast_um.rough);
    });
  });

  describe("getPassType", () => {
    it("returns rough for single pass", () => {
      expect(engine.getPassType(1, 1)).toBe("rough");
    });

    it("returns rough for first pass always", () => {
      expect(engine.getPassType(1, 2)).toBe("rough");
      expect(engine.getPassType(1, 4)).toBe("rough");
    });

    it("returns finish for last pass of 2-pass", () => {
      expect(engine.getPassType(2, 2)).toBe("finish");
    });

    it("returns precision for last pass of 4+ passes", () => {
      expect(engine.getPassType(4, 4)).toBe("precision");
      expect(engine.getPassType(5, 5)).toBe("precision");
    });

    it("returns semi for middle passes", () => {
      expect(engine.getPassType(2, 3)).toBe("semi");
      expect(engine.getPassType(2, 4)).toBe("semi");
    });
  });

  describe("interpolateOffset", () => {
    it("returns 0 for single pass", () => {
      expect(engine.interpolateOffset(1, 1)).toBe(0);
    });

    it("returns 0 for final pass", () => {
      expect(engine.interpolateOffset(2, 2)).toBe(0);
      expect(engine.interpolateOffset(4, 4)).toBe(0);
    });

    it("returns rough offset for first pass of multi-pass", () => {
      expect(engine.interpolateOffset(1, 2)).toBe(WEDM_MULTI_PASS.offset_mm.rough);
      expect(engine.interpolateOffset(1, 4)).toBe(WEDM_MULTI_PASS.offset_mm.rough);
    });

    it("interpolates linearly between passes", () => {
      const offset2 = engine.interpolateOffset(2, 3);
      const roughOffset = WEDM_MULTI_PASS.offset_mm.rough;
      expect(offset2).toBeCloseTo(roughOffset / 2, 3);
    });
  });

  describe("plan — happy path", () => {
    it("plans standard 2-pass strategy", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        finish_class: "standard",
      };

      const result = engine.plan(input);

      expect(result.success).toBe(true);
      expect(result.pass_count).toBe(2);
      expect(result.finish_class).toBe("standard");
      expect(result.passes).toHaveLength(2);
      expect(result.time_estimates).toHaveLength(2);
      expect(result.total_time_min).toBeGreaterThan(0);
    });

    it("plans precision 3-pass strategy", () => {
      const input: MultiPassInput = {
        thickness_mm: 30,
        cut_length_mm: 200,
        finish_class: "precision",
      };

      const result = engine.plan(input);

      expect(result.success).toBe(true);
      expect(result.pass_count).toBe(3);
      expect(result.final_ra_um).toBeLessThan(WEDM_MULTI_PASS.surface_ra_um.rough);
    });

    it("includes time estimates per pass", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        finish_class: "standard",
      };

      const result = engine.plan(input);

      expect(result.time_estimates[0].cut_time_min).toBeGreaterThan(0);
      expect(result.time_estimates[1].cut_time_min).toBeGreaterThan(result.time_estimates[0].cut_time_min);
    });

    it("includes corner dwell time when specified", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        finish_class: "standard",
        corner_dwell: true,
        corner_count: 8,
      };

      const result = engine.plan(input);

      expect(result.time_estimates[0].dwell_time_min).toBeGreaterThan(0);
    });
  });

  describe("plan — material variations", () => {
    it("uses tool_steel speed by default", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
      };

      const result = engine.plan(input);
      expect(result.success).toBe(true);
      expect(result.total_time_min).toBeGreaterThan(0);
    });

    it("adjusts time for carbide (slower)", () => {
      const steelInput: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        material: "tool_steel",
      };
      const carbideInput: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        material: "carbide",
      };

      const steelResult = engine.plan(steelInput);
      const carbideResult = engine.plan(carbideInput);

      expect(carbideResult.total_time_min).toBeGreaterThan(steelResult.total_time_min);
    });

    it("adjusts time for aluminum (faster)", () => {
      const steelInput: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        material: "tool_steel",
      };
      const aluminumInput: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        material: "aluminum",
      };

      const steelResult = engine.plan(steelInput);
      const aluminumResult = engine.plan(aluminumInput);

      expect(aluminumResult.total_time_min).toBeLessThan(steelResult.total_time_min);
    });
  });

  describe("plan — thickness variations", () => {
    it("thicker material takes longer", () => {
      const thin: MultiPassInput = {
        thickness_mm: 10,
        cut_length_mm: 100,
      };
      const thick: MultiPassInput = {
        thickness_mm: 60,
        cut_length_mm: 100,
      };

      const thinResult = engine.plan(thin);
      const thickResult = engine.plan(thick);

      expect(thickResult.total_time_min).toBeGreaterThan(thinResult.total_time_min);
    });
  });

  describe("plan — invalid input handling", () => {
    it("returns invalid result for zero thickness", () => {
      const input: MultiPassInput = {
        thickness_mm: 0,
        cut_length_mm: 100,
      };

      const result = engine.plan(input);

      expect(result.success).toBe(false);
      expect(result.summary).toContain("INVALID");
    });

    it("returns invalid result for negative thickness", () => {
      const input: MultiPassInput = {
        thickness_mm: -10,
        cut_length_mm: 100,
      };

      const result = engine.plan(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for zero cut length", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 0,
      };

      const result = engine.plan(input);

      expect(result.success).toBe(false);
    });

    it("returns invalid result for NaN values", () => {
      const input: MultiPassInput = {
        thickness_mm: NaN,
        cut_length_mm: 100,
      };

      const result = engine.plan(input);

      expect(result.success).toBe(false);
    });
  });

  describe("calculateRecastAfterPasses", () => {
    it("returns rough recast for single pass", () => {
      const recast = engine.calculateRecastAfterPasses(1);
      expect(recast).toBe(WEDM_MULTI_PASS.recast_um.rough);
    });

    it("reduces recast with each pass", () => {
      const recast1 = engine.calculateRecastAfterPasses(1);
      const recast2 = engine.calculateRecastAfterPasses(2);
      const recast3 = engine.calculateRecastAfterPasses(3);

      expect(recast2).toBeLessThan(recast1);
      expect(recast3).toBeLessThan(recast2);
    });

    it("asymptotically approaches minimum residual", () => {
      const recast7 = engine.calculateRecastAfterPasses(7);
      expect(recast7).toBeGreaterThanOrEqual(0.5);
      expect(recast7).toBeLessThan(5);
    });
  });

  describe("passesForTargetRecast", () => {
    it("returns 1 for rough-level recast", () => {
      expect(engine.passesForTargetRecast(30)).toBe(1);
      expect(engine.passesForTargetRecast(25)).toBe(1);
    });

    it("returns multiple passes for finish recast", () => {
      const passes = engine.passesForTargetRecast(5);
      expect(passes).toBeGreaterThan(1);
      expect(passes).toBeLessThanOrEqual(WEDM_MULTI_PASS.max_passes);
    });

    it("returns max passes for ultra-low recast", () => {
      expect(engine.passesForTargetRecast(0.5)).toBe(WEDM_MULTI_PASS.max_passes);
    });
  });

  describe("getPassesForClass", () => {
    it("returns correct pass count for each class", () => {
      expect(engine.getPassesForClass("rough_only")).toHaveLength(1);
      expect(engine.getPassesForClass("standard")).toHaveLength(2);
      expect(engine.getPassesForClass("precision")).toHaveLength(3);
      expect(engine.getPassesForClass("ultra")).toHaveLength(4);
    });
  });

  describe("estimateCycleTime", () => {
    it("estimates total time for finish class", () => {
      const time = engine.estimateCycleTime("standard", 20, 100, "tool_steel");
      expect(time).toBeGreaterThan(0);
    });

    it("ultra takes longer than standard", () => {
      const standard = engine.estimateCycleTime("standard", 20, 100, "tool_steel");
      const ultra = engine.estimateCycleTime("ultra", 20, 100, "tool_steel");
      expect(ultra).toBeGreaterThan(standard);
    });
  });

  describe("plan — recommendations", () => {
    it("recommends wire change for 4+ passes", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        finish_class: "ultra",
      };

      const result = engine.plan(input);

      expect(result.recommendations.some(r => r.includes("wire change"))).toBe(true);
    });

    it("recommends flush check for thick sections", () => {
      const input: MultiPassInput = {
        thickness_mm: 80,
        cut_length_mm: 100,
        finish_class: "precision",
      };

      const result = engine.plan(input);

      expect(result.recommendations.some(r => r.includes("flush"))).toBe(true);
    });

    it("includes ultra-specific recommendations", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        finish_class: "ultra",
      };

      const result = engine.plan(input);

      expect(result.recommendations.some(r => r.includes("Ultra"))).toBe(true);
    });
  });

  describe("plan — summary", () => {
    it("includes pass count in summary", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
        finish_class: "precision",
      };

      const result = engine.plan(input);

      expect(result.summary).toContain("3-pass");
    });

    it("includes total time in summary", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
      };

      const result = engine.plan(input);

      expect(result.summary).toMatch(/\d+\.\d+ min/);
    });

    it("includes final surface quality in summary", () => {
      const input: MultiPassInput = {
        thickness_mm: 20,
        cut_length_mm: 100,
      };

      const result = engine.plan(input);

      expect(result.summary).toMatch(/Ra \d+(\.\d+)?µm/);
      expect(result.summary).toMatch(/recast \d+(\.\d+)?µm/);
    });
  });
});
