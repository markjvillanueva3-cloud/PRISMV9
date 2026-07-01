/**
 * Tests for LatheSpeedFeedReasoningBridgeEngine
 * LATHE-MASTER U-LTH09 — Phase P1: Speed & Feed Calculator
 *
 * Exit conditions: >=6 what-if scenarios, confidence drops under extrapolation
 */
import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedReasoningBridgeEngine,
  type ReasoningInput,
  type WhatIfScenario,
} from "../engines/LatheSpeedFeedReasoningBridgeEngine.js";

const buildBaseInput = () => ({
  material: "4140",
  tool: {
    type: "turning_insert",
    diameter_mm: 12,
    nose_radius_mm: 0.8,
  },
  operation: {
    type: "roughing",
    coolant: "flood",
  },
});

const buildReasoningInput = (
  scenarios: WhatIfScenario[],
  overrides: Partial<ReasoningInput> = {}
): ReasoningInput => ({
  base_input: buildBaseInput(),
  scenarios,
  ...overrides,
});

describe("LatheSpeedFeedReasoningBridgeEngine", () => {
  describe("analyze() — main entry point", () => {
    it("returns successful result for valid input with scenarios", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "conservative" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.baseline.success).toBe(true);
      expect(result.scenarios.length).toBe(1);
    });

    it("returns failure for invalid base input", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze({
        base_input: { material: "unobtainium" } as any,
        scenarios: [],
      });

      expect(result.success).toBe(false);
    });

    it("handles empty scenarios array", () => {
      const input = buildReasoningInput([]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios.length).toBe(0);
      expect(result.baseline.success).toBe(true);
    });
  });

  describe("what-if scenarios (>=6 types)", () => {
    it("supports change_strategy scenario", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "aggressive" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios[0].scenario_type).toBe("change_strategy");
      expect(result.scenarios[0].description).toContain("aggressive");
    });

    it("supports change_material scenario", () => {
      const input = buildReasoningInput([
        { type: "change_material", params: { material: "aluminum_6061" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios[0].scenario_type).toBe("change_material");
      expect(result.scenarios[0].is_extrapolation).toBe(true);
    });

    it("supports change_operation scenario", () => {
      const input = buildReasoningInput([
        { type: "change_operation", params: { type: "finishing" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios[0].scenario_type).toBe("change_operation");
    });

    it("supports change_coolant scenario", () => {
      const input = buildReasoningInput([
        { type: "change_coolant", params: { coolant: "dry" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios[0].scenario_type).toBe("change_coolant");
    });

    it("supports increase_speed scenario", () => {
      const input = buildReasoningInput([
        { type: "increase_speed", delta_percent: 20 },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios[0].scenario_type).toBe("increase_speed");
    });

    it("supports decrease_feed scenario", () => {
      const input = buildReasoningInput([
        { type: "decrease_feed" },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios[0].scenario_type).toBe("decrease_feed");
    });

    it("supports change_tool scenario", () => {
      const input = buildReasoningInput([
        { type: "change_tool", params: { nose_radius_mm: 1.2 } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios[0].scenario_type).toBe("change_tool");
    });

    it("processes multiple scenarios in single call", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "conservative" } },
        { type: "change_strategy", params: { strategy: "aggressive" } },
        { type: "change_operation", params: { type: "finishing" } },
        { type: "change_coolant", params: { coolant: "dry" } },
        { type: "change_coolant", params: { coolant: "high_pressure" } },
        { type: "change_material", params: { material: "aluminum_6061" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.success).toBe(true);
      expect(result.scenarios.length).toBe(6);
    });
  });

  describe("confidence under extrapolation", () => {
    it("reduces confidence for material change (extrapolation)", () => {
      const noExtrapolation = LatheSpeedFeedReasoningBridgeEngine.analyze(
        buildReasoningInput([{ type: "change_strategy", params: { strategy: "conservative" } }])
      );
      const withExtrapolation = LatheSpeedFeedReasoningBridgeEngine.analyze(
        buildReasoningInput([{ type: "change_material", params: { material: "titanium_gr5" } }])
      );

      expect(withExtrapolation.scenarios[0].is_extrapolation).toBe(true);
      expect(withExtrapolation.scenarios[0].confidence).toBeLessThan(
        noExtrapolation.scenarios[0].confidence
      );
    });

    it("marks large speed increase as extrapolation", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(
        buildReasoningInput([{ type: "increase_speed", delta_percent: 60 }])
      );

      expect(result.scenarios[0].is_extrapolation).toBe(true);
    });

    it("does not mark small changes as extrapolation", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(
        buildReasoningInput([{ type: "decrease_feed" }])
      );

      expect(result.scenarios[0].is_extrapolation).toBe(false);
    });

    it("adds warning for extrapolation scenarios", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(
        buildReasoningInput([{ type: "change_material", params: { material: "inconel_718" } }])
      );

      expect(result.warnings.some((w) => w.includes("extrapolation"))).toBe(true);
    });
  });

  describe("comparison metrics", () => {
    it("calculates delta percentages for all parameters", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "aggressive" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      const comparison = result.scenarios[0].comparison;
      expect(typeof comparison.speed_delta_percent).toBe("number");
      expect(typeof comparison.feed_delta_percent).toBe("number");
      expect(typeof comparison.depth_delta_percent).toBe("number");
      expect(typeof comparison.rpm_delta_percent).toBe("number");
      expect(typeof comparison.tool_life_delta_percent).toBe("number");
      expect(typeof comparison.force_delta_percent).toBe("number");
      expect(typeof comparison.power_delta_percent).toBe("number");
    });

    it("aggressive strategy increases parameters vs baseline", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "aggressive" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      const comparison = result.scenarios[0].comparison;
      // Aggressive should increase feed and/or depth
      expect(
        comparison.feed_delta_percent > 0 || comparison.depth_delta_percent > 0
      ).toBe(true);
    });

    it("conservative strategy decreases parameters vs baseline", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "conservative" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      const comparison = result.scenarios[0].comparison;
      // Conservative should decrease feed and/or depth
      expect(
        comparison.feed_delta_percent < 0 || comparison.depth_delta_percent < 0
      ).toBe(true);
    });
  });

  describe("causal explanations", () => {
    it("generates causal explanation for each scenario", () => {
      const input = buildReasoningInput([
        { type: "increase_speed" },
        { type: "increase_feed" },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      for (const scenario of result.scenarios) {
        expect(typeof scenario.causal_explanation).toBe("string");
        expect(scenario.causal_explanation.length).toBeGreaterThan(0);
      }
    });

    it("causal explanation mentions relevant physics", () => {
      const input = buildReasoningInput([{ type: "increase_speed" }]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      // Speed scenario should mention Taylor or tool life
      const explanation = result.scenarios[0].causal_explanation.toLowerCase();
      expect(
        explanation.includes("taylor") ||
        explanation.includes("tool") ||
        explanation.includes("life") ||
        explanation.includes("temperature")
      ).toBe(true);
    });
  });

  describe("sensitivity analysis", () => {
    it("returns sensitivity entries when requested", () => {
      const input = buildReasoningInput([], { include_sensitivity: true });
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.sensitivity).toBeDefined();
      expect(result.sensitivity!.length).toBeGreaterThan(0);
    });

    it("sensitivity entries have required fields", () => {
      const input = buildReasoningInput([], { include_sensitivity: true });
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      for (const entry of result.sensitivity!) {
        expect(typeof entry.parameter).toBe("string");
        expect(typeof entry.elasticity).toBe("number");
        expect(["positive", "negative", "nonlinear"]).toContain(entry.impact_direction);
        expect(typeof entry.rank).toBe("number");
        expect(typeof entry.explanation).toBe("string");
      }
    });

    it("sensitivity entries are ranked by elasticity", () => {
      const input = buildReasoningInput([], { include_sensitivity: true });
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      for (let i = 1; i < result.sensitivity!.length; i++) {
        expect(result.sensitivity![i - 1].elasticity).toBeGreaterThanOrEqual(
          result.sensitivity![i].elasticity
        );
        expect(result.sensitivity![i].rank).toBe(i + 1);
      }
    });
  });

  describe("causal chain", () => {
    it("returns causal chain when requested", () => {
      const input = buildReasoningInput([], { include_causal_chain: true });
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.causal_chain).toBeDefined();
      expect(result.causal_chain!.length).toBeGreaterThan(0);
    });

    it("causal links have required fields", () => {
      const input = buildReasoningInput([], { include_causal_chain: true });
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      for (const link of result.causal_chain!) {
        expect(typeof link.cause).toBe("string");
        expect(typeof link.effect).toBe("string");
        expect(typeof link.strength).toBe("number");
        expect(link.strength).toBeGreaterThanOrEqual(0);
        expect(link.strength).toBeLessThanOrEqual(1);
        expect(typeof link.mechanism).toBe("string");
      }
    });

    it("includes key physics relationships", () => {
      const input = buildReasoningInput([], { include_causal_chain: true });
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      const causes = result.causal_chain!.map((l) => l.cause);
      expect(causes).toContain("cutting_speed");
      expect(causes).toContain("feed_rate");
      expect(causes).toContain("depth_of_cut");
    });
  });

  describe("standardWhatIf() convenience method", () => {
    it("runs 6 standard scenarios", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.standardWhatIf(buildBaseInput() as any);

      expect(result.success).toBe(true);
      expect(result.scenarios.length).toBe(6);
    });

    it("includes sensitivity and causal chain", () => {
      const result = LatheSpeedFeedReasoningBridgeEngine.standardWhatIf(buildBaseInput() as any);

      expect(result.sensitivity).toBeDefined();
      expect(result.causal_chain).toBeDefined();
    });
  });

  describe("summary generation", () => {
    it("generates summary with baseline parameters", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "aggressive" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.summary).toContain("Vc=");
      expect(result.summary).toContain("m/min");
    });

    it("mentions extrapolation in summary when present", () => {
      const input = buildReasoningInput([
        { type: "change_material", params: { material: "titanium_gr5" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      expect(result.summary.toLowerCase()).toContain("extrapolation");
    });
  });

  describe("overall confidence", () => {
    it("calculates overall confidence as average of scenarios", () => {
      const input = buildReasoningInput([
        { type: "change_strategy", params: { strategy: "conservative" } },
        { type: "change_material", params: { material: "titanium_gr5" } },
      ]);
      const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);

      const avgConfidence =
        result.scenarios.reduce((sum, s) => sum + s.confidence, 0) / result.scenarios.length;
      // overall_confidence is the scenario-average rounded to the engine's 2-decimal
      // output precision (LatheSpeedFeedReasoningBridgeEngine L656). Compare against the
      // same rounding so a boundary average like 0.575 (IEEE-754 0.57499...) does not
      // fail by exactly 0.005 against an unrounded expectation.
      const expectedOverall = Math.round(avgConfidence * 100) / 100;

      expect(result.overall_confidence).toBeCloseTo(expectedOverall, 10);
    });

    it("overall confidence is bounded [0.3, 0.95]", () => {
      const inputs = [
        buildReasoningInput([{ type: "change_material", params: { material: "inconel_718" } }]),
        buildReasoningInput([{ type: "change_strategy", params: { strategy: "balanced" } }]),
      ];

      for (const input of inputs) {
        const result = LatheSpeedFeedReasoningBridgeEngine.analyze(input);
        expect(result.overall_confidence).toBeGreaterThanOrEqual(0.3);
        expect(result.overall_confidence).toBeLessThanOrEqual(0.95);
      }
    });
  });

  describe("getVersion()", () => {
    it("returns version string in semver format", () => {
      const version = LatheSpeedFeedReasoningBridgeEngine.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
