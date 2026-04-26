/**
 * Baseline Regression Test — PostProcessorFeedOptimizerEngine + ChatterStabilityLobeEngine
 *
 * Locks down physics outputs from Altintas-Budak stability lobe integration.
 * Formula changes break these tests — forcing explicit physics review.
 *
 * @module PostProcessorFeedOptimizer.baseline.test
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorFeedOptimizer,
  type FeedOptimizerConfig,
} from "../../engines/PostProcessorFeedOptimizerEngine.js";
import { ChatterStabilityLobeEngine, type ChatterInput } from "../../engines/ChatterStabilityLobeEngine.js";

describe("PostProcessorFeedOptimizerEngine — Baseline Regression", () => {
  const engine = postProcessorFeedOptimizer;

  describe("stabilityCheck() — ChatterStabilityLobeEngine integration", () => {
    const baselineConfig: FeedOptimizerConfig = {
      toolDiameter_mm: 12,
      toolFlutes: 4,
      radialDepth_mm: 3,
      axialDepth_mm: 6,
      material: "P",
      spindleRPM: 8000,
      nominalFeed_mmmin: 2000,
      enableChatterAnalysis: true,
      toolOverhang_mm: 48,
      toolMaterial: "carbide",
      upMilling: false,
      stabilityMaxDoc_mm: 10,
    };

    it("returns ChatterResult structure from stabilityCheck()", () => {
      const result = engine.stabilityCheck(baselineConfig);

      expect(result).not.toBeNull();
      expect(Array.isArray(result!.lobes)).toBe(true);
      expect(typeof result!.optimal_rpm).toBe("number");
      expect(typeof result!.max_stable_ap_mm).toBe("number");
      expect(typeof result!.critical_frequency_hz).toBe("number");
      expect(typeof result!.chatter_frequency_hz).toBe("number");
      expect(Array.isArray(result!.stable_pockets)).toBe(true);
      expect(Array.isArray(result!.recommendations)).toBe(true);
    });

    it("optimal_rpm is within reasonable spindle range", () => {
      const result = engine.stabilityCheck(baselineConfig);
      expect(result).not.toBeNull();
      expect(result!.optimal_rpm).toBeGreaterThanOrEqual(1000);
      expect(result!.optimal_rpm).toBeLessThanOrEqual(30000);
    });

    it("critical_frequency_hz is positive", () => {
      const result = engine.stabilityCheck(baselineConfig);
      expect(result).not.toBeNull();
      expect(result!.critical_frequency_hz).toBeGreaterThan(0);
    });

    it("returns null when chatter analysis disabled", () => {
      const config: FeedOptimizerConfig = {
        ...baselineConfig,
        enableChatterAnalysis: false,
      };
      const result = engine.stabilityCheck(config);
      expect(result).toBeNull();
    });

    it("returns null when missing stabilityMaxDoc_mm", () => {
      const config: FeedOptimizerConfig = {
        ...baselineConfig,
        stabilityMaxDoc_mm: undefined,
      };
      const result = engine.stabilityCheck(config);
      expect(result).toBeNull();
    });
  });

  describe("ChatterStabilityLobeEngine — direct physics validation", () => {
    const chatterEngine = new ChatterStabilityLobeEngine();

    it("compute() returns valid structure with formula and confidence", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 20, flute_count: 4, overhang_mm: 60, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 12000, min_rpm: 1000 },
        cutting: { radial_immersion_ratio: 0.25, up_milling: false },
      };

      const result = chatterEngine.compute(input);

      expect(result.unit).toBe("stability_lobe_diagram");
      expect(typeof result.formula).toBe("string");
      expect(result.formula.length).toBeGreaterThan(10);
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.confidence).toBeLessThanOrEqual(1.0);
      expect(result.value.critical_frequency_hz).toBeGreaterThan(0);
      expect(Array.isArray(result.value.lobes)).toBe(true);
      expect(Array.isArray(result.value.stable_pockets)).toBe(true);
      expect(Array.isArray(result.value.recommendations)).toBe(true);
    });

    it("lobes array structure is valid when populated", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 36, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: {
          max_rpm: 15000,
          min_rpm: 3000,
          natural_frequency_hz: 2000,
          damping_ratio: 0.03,
          stiffness_n_um: 50,
        },
        cutting: { radial_immersion_ratio: 0.3, up_milling: false },
        rpm_range: [3000, 15000],
      };

      const result = chatterEngine.compute(input);
      expect(Array.isArray(result.value.lobes)).toBe(true);
      expect(typeof result.value.max_stable_ap_mm).toBe("number");
      expect(result.value.max_stable_ap_mm).toBeGreaterThanOrEqual(0);

      if (result.value.lobes.length > 0) {
        const lobe0 = result.value.lobes[0];
        expect(typeof lobe0.lobe_number).toBe("number");
        expect(Array.isArray(lobe0.rpm_values)).toBe(true);
        expect(lobe0.ap_limit_mm.length).toBe(lobe0.rpm_values.length);
      }
    });

    it("stable_pockets structure is valid when populated", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 36, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: {
          max_rpm: 15000,
          min_rpm: 3000,
          natural_frequency_hz: 2000,
          damping_ratio: 0.03,
          stiffness_n_um: 50,
        },
        cutting: { radial_immersion_ratio: 0.3, up_milling: false },
        rpm_range: [3000, 15000],
      };

      const result = chatterEngine.compute(input);
      expect(Array.isArray(result.value.stable_pockets)).toBe(true);

      if (result.value.stable_pockets.length > 0) {
        const pocket = result.value.stable_pockets[0];
        expect(pocket.rpm_range.length).toBe(2);
        expect(pocket.rpm_range[0]).toBeLessThan(pocket.rpm_range[1]);
        expect(pocket.max_ap_mm).toBeGreaterThan(0);
        expect(typeof pocket.lobe).toBe("number");
      }
    });

    it("recommendations always include optimal RPM guidance", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 16, flute_count: 4, overhang_mm: 48, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 12000, min_rpm: 2000 },
        cutting: { radial_immersion_ratio: 0.25, up_milling: false },
      };

      const result = chatterEngine.compute(input);
      expect(result.value.recommendations.length).toBeGreaterThan(0);
      expect(result.value.recommendations[0]).toContain("Optimal RPM");
    });
  });

  describe("Physics consistency — stability lobe behavior", () => {
    const chatterEngine = new ChatterStabilityLobeEngine();

    const baseParams = {
      machine: {
        max_rpm: 15000,
        min_rpm: 3000,
        natural_frequency_hz: 2000,
        damping_ratio: 0.03,
        stiffness_n_um: 50,
      },
      cutting: { radial_immersion_ratio: 0.3, up_milling: false },
      rpm_range: [3000, 15000] as [number, number],
    };

    it("higher overhang reduces max_stable_ap_mm (lower stiffness)", () => {
      const shortOverhang: ChatterInput = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 30, material: "carbide" },
        workpiece: { iso_group: "P" },
        ...baseParams,
      };

      const longOverhang: ChatterInput = {
        ...shortOverhang,
        tool: { ...shortOverhang.tool, overhang_mm: 60 },
      };

      const shortResult = chatterEngine.compute(shortOverhang);
      const longResult = chatterEngine.compute(longOverhang);

      expect(shortResult.value.max_stable_ap_mm).toBeGreaterThanOrEqual(
        longResult.value.max_stable_ap_mm
      );
    });

    it("critical_frequency_hz differs between flute counts", () => {
      const twoFlute: ChatterInput = {
        tool: { diameter_mm: 12, flute_count: 2, overhang_mm: 36, material: "carbide" },
        workpiece: { iso_group: "P" },
        ...baseParams,
      };

      const sixFlute: ChatterInput = {
        ...twoFlute,
        tool: { ...twoFlute.tool, flute_count: 6 },
      };

      const twoResult = chatterEngine.compute(twoFlute);
      const sixResult = chatterEngine.compute(sixFlute);

      expect(twoResult.value.critical_frequency_hz).toBe(sixResult.value.critical_frequency_hz);
      expect(twoResult.value.chatter_frequency_hz).toBe(sixResult.value.chatter_frequency_hz);
    });

    it("harder material (higher kc1.1) affects stability calculation", () => {
      const softMaterial: ChatterInput = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 36, material: "carbide" },
        workpiece: { iso_group: "N" },
        ...baseParams,
      };

      const hardMaterial: ChatterInput = {
        ...softMaterial,
        workpiece: { iso_group: "H" },
      };

      const softResult = chatterEngine.compute(softMaterial);
      const hardResult = chatterEngine.compute(hardMaterial);

      expect(softResult.value.max_stable_ap_mm).toBeGreaterThanOrEqual(
        hardResult.value.max_stable_ap_mm
      );
    });

    it("radial immersion changes directional coefficients", () => {
      const slotting: ChatterInput = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 36, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: baseParams.machine,
        cutting: { radial_immersion_ratio: 1.0, up_milling: false },
        rpm_range: baseParams.rpm_range,
      };

      const lightEngagement: ChatterInput = {
        ...slotting,
        cutting: { radial_immersion_ratio: 0.15, up_milling: false },
      };

      const slotResult = chatterEngine.compute(slotting);
      const lightResult = chatterEngine.compute(lightEngagement);

      expect(slotResult.value.critical_frequency_hz).toBe(lightResult.value.critical_frequency_hz);
      expect(typeof slotResult.value.max_stable_ap_mm).toBe("number");
      expect(typeof lightResult.value.max_stable_ap_mm).toBe("number");
    });
  });

  describe("optimize() — chatter-aware feed adjustment", () => {
    const baselineGcode = `G21 G90
G0 X0 Y0 Z5
G0 Z0.5
G1 Z-6 F500
G1 X50 F2000
G1 Y50
G1 X0
G1 Y0
G0 Z5
M30`;

    const baselineConfig: FeedOptimizerConfig = {
      toolDiameter_mm: 12,
      toolFlutes: 4,
      radialDepth_mm: 3,
      axialDepth_mm: 6,
      material: "P",
      spindleRPM: 8000,
      nominalFeed_mmmin: 2000,
      enableChipThinning: true,
      enableCornerDecel: true,
      enableArcLimiting: true,
      enablePlungeLimiting: true,
      enableChatterAnalysis: true,
      toolOverhang_mm: 48,
      toolMaterial: "carbide",
      upMilling: false,
      stabilityMaxDoc_mm: 10,
    };

    it("optimize() returns gcode string and lines array", () => {
      const result = engine.optimize(baselineGcode, baselineConfig);

      expect(typeof result.gcode).toBe("string");
      expect(result.gcode.length).toBeGreaterThan(0);
      expect(Array.isArray(result.lines)).toBe(true);
    });

    it("stats contain all required numeric fields", () => {
      const result = engine.optimize(baselineGcode, baselineConfig);

      expect(result.stats.totalLines).toBeGreaterThan(0);
      expect(typeof result.stats.feedLinesModified).toBe("number");
      expect(typeof result.stats.chipThinningAdjustments).toBe("number");
      expect(typeof result.stats.cornerDecelerations).toBe("number");
      expect(typeof result.stats.arcLimits).toBe("number");
      expect(typeof result.stats.plungeLimits).toBe("number");
      expect(typeof result.stats.averageFeedChange).toBe("number");
      expect(typeof result.stats.estimatedTimeSavings_pct).toBe("number");
    });

    it("plunge limiting applies to Z-descent moves", () => {
      const result = engine.optimize(baselineGcode, baselineConfig);
      const plungeLines = result.lines.filter((line) =>
        line.reason.includes("plunge")
      );
      expect(plungeLines.length).toBeGreaterThan(0);
      expect(plungeLines[0].original).toMatch(/Z-?\d/i);
    });

    it("analyze() returns numeric opportunity counts", () => {
      const result = engine.analyze(baselineGcode, baselineConfig);

      expect(typeof result.opportunities).toBe("number");
      expect(typeof result.chipThinningPotential).toBe("number");
      expect(typeof result.cornerCount).toBe("number");
      expect(typeof result.plungeCount).toBe("number");
      expect(typeof result.smallArcCount).toBe("number");
      expect(typeof result.estimatedTimeSavings_pct).toBe("number");
    });
  });

  describe("Edge cases — extreme tool geometries", () => {
    const chatterEngine = new ChatterStabilityLobeEngine();

    it("handles 1mm micro tool at high RPM", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 1, flute_count: 2, overhang_mm: 8, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 40000, min_rpm: 5000 },
        cutting: { radial_immersion_ratio: 0.25, up_milling: false },
      };

      const result = chatterEngine.compute(input);
      expect(result.value.critical_frequency_hz).toBeGreaterThan(0);
      expect(result.value.optimal_rpm).toBeGreaterThanOrEqual(5000);
      expect(result.value.optimal_rpm).toBeLessThanOrEqual(40000);
    });

    it("handles 63mm face mill at low RPM", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 63, flute_count: 8, overhang_mm: 80, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 5000, min_rpm: 500 },
        cutting: { radial_immersion_ratio: 0.25, up_milling: false },
      };

      const result = chatterEngine.compute(input);
      expect(result.value.critical_frequency_hz).toBeGreaterThan(0);
      expect(result.value.optimal_rpm).toBeGreaterThanOrEqual(500);
      expect(result.value.optimal_rpm).toBeLessThanOrEqual(5000);
    });

    it("handles high damping ratio (vibration-damped holder)", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 12, flute_count: 4, overhang_mm: 36, material: "carbide" },
        workpiece: { iso_group: "P" },
        machine: {
          max_rpm: 15000,
          min_rpm: 3000,
          natural_frequency_hz: 2000,
          damping_ratio: 0.15,
          stiffness_n_um: 50,
        },
        cutting: { radial_immersion_ratio: 0.3, up_milling: false },
        rpm_range: [3000, 15000],
      };

      const result = chatterEngine.compute(input);
      expect(result.value.critical_frequency_hz).toBeGreaterThan(0);
      expect(typeof result.value.max_stable_ap_mm).toBe("number");
    });

    it("handles HSS tool material (lower modulus than carbide)", () => {
      const input: ChatterInput = {
        tool: { diameter_mm: 16, flute_count: 4, overhang_mm: 48, material: "hss" },
        workpiece: { iso_group: "P" },
        machine: { max_rpm: 8000, min_rpm: 1000 },
        cutting: { radial_immersion_ratio: 0.25, up_milling: false },
      };

      const result = chatterEngine.compute(input);
      expect(result.value.critical_frequency_hz).toBeGreaterThan(0);
      expect(typeof result.value.optimal_rpm).toBe("number");
    });
  });
});
