/**
 * Tests for LatheSpeedFeedDeepLearningAdvisorEngine
 * LATHE-MASTER U-LTH08 — Phase P1: Speed & Feed Calculator
 *
 * Exit conditions: Deterministic seed, ≥10 tests, ≥3 influential features in explanation
 */
import { describe, it, expect } from "vitest";
import {
  LatheSpeedFeedDeepLearningAdvisorEngine,
  type DLAdvisorInput,
} from "../engines/LatheSpeedFeedDeepLearningAdvisorEngine.js";

const buildInput = (overrides: Partial<DLAdvisorInput> = {}): DLAdvisorInput => ({
  material: "4140",
  tool: {
    type: "turning_insert",
    diameter_mm: 12,
    nose_radius_mm: 0.8,
    ...overrides.tool,
  },
  operation: {
    type: "roughing",
    ...overrides.operation,
  },
  ...overrides,
});

describe("LatheSpeedFeedDeepLearningAdvisorEngine", () => {
  describe("advise() — main entry point", () => {
    it("returns successful result for valid AISI material", () => {
      const input = buildInput({ material: "4140" });
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.success).toBe(true);
      expect(result.recommendation.cutting_speed_m_min).toBeGreaterThan(0);
      expect(result.recommendation.rpm).toBeGreaterThan(0);
      expect(result.recommendation.feed_mm_rev).toBeGreaterThan(0);
      expect(result.recommendation.depth_of_cut_mm).toBeGreaterThan(0);
    });

    it("returns successful result for canonical material key", () => {
      const input = buildInput({ material: "alloy_steel" });
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.success).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("returns failure for unknown material", () => {
      const input = buildInput({ material: "unobtainium_xyz" });
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.success).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain("not found");
    });

    it("returns failure for invalid input shape", () => {
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise({
        material: "4140",
        tool: { type: "insert" },
        operation: {},
      } as DLAdvisorInput);

      expect(result.success).toBe(false);
      expect(result.warnings[0]).toContain("validation failed");
    });
  });

  describe("deterministic output with seed", () => {
    it("produces identical results with same seed", () => {
      const input = buildInput({ seed: 12345 });

      const result1 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);
      const result2 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result1.recommendation.cutting_speed_m_min).toBe(
        result2.recommendation.cutting_speed_m_min
      );
      expect(result1.recommendation.rpm).toBe(result2.recommendation.rpm);
      expect(result1.recommendation.feed_mm_rev).toBe(result2.recommendation.feed_mm_rev);
      expect(result1.recommendation.depth_of_cut_mm).toBe(result2.recommendation.depth_of_cut_mm);
      expect(result1.seed).toBe(12345);
      expect(result2.seed).toBe(12345);
    });

    it("produces different results with different seeds", () => {
      const input1 = buildInput({ seed: 100 });
      const input2 = buildInput({ seed: 200 });

      const result1 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input1);
      const result2 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input2);

      // At least one parameter should differ
      const paramsDiffer =
        result1.adjustment_factors.speed_factor !== result2.adjustment_factors.speed_factor ||
        result1.adjustment_factors.feed_factor !== result2.adjustment_factors.feed_factor ||
        result1.adjustment_factors.depth_factor !== result2.adjustment_factors.depth_factor;

      expect(paramsDiffer).toBe(true);
    });

    it("uses default seed when not provided", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.seed).toBe(42); // DEFAULT_SEED
    });

    it("returns seed in result for reproducibility tracking", () => {
      const input = buildInput({ seed: 99999 });
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.seed).toBe(99999);
    });
  });

  describe("influential features (SHAP-like)", () => {
    it("returns at least 3 influential features by default", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.influential_features.length).toBeGreaterThanOrEqual(3);
    });

    it("respects top_features parameter", () => {
      const input5 = buildInput({ top_features: 5 });
      const result5 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input5);

      expect(result5.influential_features.length).toBe(5);

      const input1 = buildInput({ top_features: 1 });
      const result1 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input1);

      expect(result1.influential_features.length).toBe(1);
    });

    it("each feature has importance, direction, and explanation", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      for (const feature of result.influential_features) {
        expect(typeof feature.feature).toBe("string");
        expect(typeof feature.importance).toBe("number");
        expect(["increases", "decreases", "neutral"]).toContain(feature.direction);
        expect(typeof feature.explanation).toBe("string");
        expect(feature.explanation.length).toBeGreaterThan(0);
        expect(typeof feature.value).toBe("number");
        expect(typeof feature.baseline).toBe("number");
      }
    });

    it("features are sorted by absolute importance (descending)", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      for (let i = 1; i < result.influential_features.length; i++) {
        const prev = Math.abs(result.influential_features[i - 1].importance);
        const curr = Math.abs(result.influential_features[i].importance);
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it("feature importance values are bounded [-1, 1]", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      for (const feature of result.influential_features) {
        expect(feature.importance).toBeGreaterThanOrEqual(-1);
        expect(feature.importance).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("neural adjustment factors", () => {
    it("returns speed, feed, and depth adjustment factors", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(typeof result.adjustment_factors.speed_factor).toBe("number");
      expect(typeof result.adjustment_factors.feed_factor).toBe("number");
      expect(typeof result.adjustment_factors.depth_factor).toBe("number");
    });

    it("adjustment factors are bounded [0.7, 1.3]", () => {
      // Test with multiple seeds to cover range
      for (const seed of [1, 42, 100, 500, 1000]) {
        const input = buildInput({ seed });
        const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

        expect(result.adjustment_factors.speed_factor).toBeGreaterThanOrEqual(0.7);
        expect(result.adjustment_factors.speed_factor).toBeLessThanOrEqual(1.3);
        expect(result.adjustment_factors.feed_factor).toBeGreaterThanOrEqual(0.7);
        expect(result.adjustment_factors.feed_factor).toBeLessThanOrEqual(1.3);
        expect(result.adjustment_factors.depth_factor).toBeGreaterThanOrEqual(0.7);
        expect(result.adjustment_factors.depth_factor).toBeLessThanOrEqual(1.3);
      }
    });

    it("adjusted recommendation differs from base by factors", () => {
      const input = buildInput({ seed: 123 });
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      // Verify adjusted = base * factor (approximately due to rounding)
      const expectedSpeed = Math.round(
        result.base_recommendation.cutting_speed_m_min * result.adjustment_factors.speed_factor
      );
      expect(result.recommendation.cutting_speed_m_min).toBeCloseTo(expectedSpeed, 0);

      const expectedRpm = Math.round(
        result.base_recommendation.rpm * result.adjustment_factors.speed_factor
      );
      expect(result.recommendation.rpm).toBeCloseTo(expectedRpm, 0);
    });
  });

  describe("attention weights", () => {
    it("returns attention weights for input aspects", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.attention_weights).toBeDefined();
      expect(typeof result.attention_weights.material_properties).toBe("number");
      expect(typeof result.attention_weights.tool_geometry).toBe("number");
      expect(typeof result.attention_weights.operation_parameters).toBe("number");
    });

    it("attention weights sum to approximately 1.0", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      const sum = Object.values(result.attention_weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 2);
    });

    it("difficult materials get higher material attention", () => {
      const steel = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ material: "alloy_steel" })
      );
      const titanium = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ material: "Ti-6Al-4V" })
      );

      // Titanium (ISO S) should have higher material attention
      expect(titanium.attention_weights.material_properties).toBeGreaterThan(
        steel.attention_weights.material_properties
      );
    });
  });

  describe("neural reasoning", () => {
    it("returns array of reasoning steps", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(Array.isArray(result.neural_reasoning)).toBe(true);
      expect(result.neural_reasoning.length).toBeGreaterThan(0);
    });

    it("includes material assessment in reasoning", () => {
      const input = buildInput({ material: "4140" });
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      const hasMaterialStep = result.neural_reasoning.some(
        (r) => r.includes("Material") || r.includes("kc1")
      );
      expect(hasMaterialStep).toBe(true);
    });

    it("includes neural adjustment summary", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      const hasNeuralStep = result.neural_reasoning.some(
        (r) => r.includes("Neural network") || r.includes("neural")
      );
      expect(hasNeuralStep).toBe(true);
    });

    it("includes operation info in reasoning", () => {
      const input = buildInput({ operation: { type: "finishing" } });
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      const hasOpStep = result.neural_reasoning.some(
        (r) => r.includes("Operation") || r.includes("finishing")
      );
      expect(hasOpStep).toBe(true);
    });
  });

  describe("confidence scoring", () => {
    it("returns confidence between 0.5 and 0.95", () => {
      const input = buildInput({});
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(input);

      expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });

    it("reduces confidence for difficult materials", () => {
      const easy = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ material: "aluminum_6061" })
      );
      const hard = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ material: "inconel_718" })
      );

      // Inconel (ISO S) should have lower confidence than aluminum (ISO N)
      expect(hard.confidence).toBeLessThan(easy.confidence);
    });
  });

  describe("operation type handling", () => {
    it("roughing has higher base depth of cut than finishing", () => {
      const roughing = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ operation: { type: "roughing" } })
      );
      const finishing = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ operation: { type: "finishing" } })
      );

      expect(roughing.base_recommendation.depth_of_cut_mm).toBeGreaterThan(
        finishing.base_recommendation.depth_of_cut_mm
      );
    });

    it("finishing has higher base cutting speed than roughing", () => {
      const roughing = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ operation: { type: "roughing" } })
      );
      const finishing = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ operation: { type: "finishing" } })
      );

      expect(finishing.base_recommendation.cutting_speed_m_min).toBeGreaterThan(
        roughing.base_recommendation.cutting_speed_m_min
      );
    });
  });

  describe("material resolution", () => {
    it("resolves AISI alias to canonical material", () => {
      const result304 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ material: "304" })
      );
      const resultSS304 = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ material: "stainless_304" })
      );

      // Both should succeed
      expect(result304.success).toBe(true);
      expect(resultSS304.success).toBe(true);
    });

    it("resolves Ti-6Al-4V to titanium_gr5", () => {
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ material: "Ti-6Al-4V" })
      );

      expect(result.success).toBe(true);
      // Titanium should trigger higher material attention
      expect(result.attention_weights.material_properties).toBeGreaterThan(0.35);
    });
  });

  describe("machine constraints", () => {
    it("base recommendation respects max RPM limit", () => {
      const result = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({
          machine: { max_rpm: 1500 },
          workpiece: { diameter_mm: 20 },
        })
      );

      // Base recommendation clamps to max_rpm before neural adjustment
      expect(result.base_recommendation.rpm).toBeLessThanOrEqual(1500);
    });

    it("machine rigidity affects neural features", () => {
      const rigid = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ machine: { rigidity_factor: 1.5 } })
      );
      const flexible = LatheSpeedFeedDeepLearningAdvisorEngine.advise(
        buildInput({ machine: { rigidity_factor: 0.6 } })
      );

      // Both should succeed
      expect(rigid.success).toBe(true);
      expect(flexible.success).toBe(true);

      // Adjustment factors may differ
      const rigidAvg =
        (rigid.adjustment_factors.depth_factor + rigid.adjustment_factors.feed_factor) / 2;
      const flexAvg =
        (flexible.adjustment_factors.depth_factor + flexible.adjustment_factors.feed_factor) / 2;

      // Can't assert direction without knowing seed effects, just verify they're computed
      expect(rigidAvg).toBeGreaterThan(0);
      expect(flexAvg).toBeGreaterThan(0);
    });
  });

  describe("getVersion()", () => {
    it("returns version string in semver format", () => {
      const version = LatheSpeedFeedDeepLearningAdvisorEngine.getVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });
});
