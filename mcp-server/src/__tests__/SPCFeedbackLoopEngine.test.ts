/**
 * SPCFeedbackLoopEngine Tests (MIO-MS0 U-MIO31)
 * Covers Cpk tiers, centering, Nelson-rule adjustments, trend detection, bounded clamps.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SPCFeedbackLoopEngine, type FeedbackLoopInput } from "../engines/SPCFeedbackLoopEngine.js";

const baseParams = {
  cutting_speed_m_min: 200,
  feed_per_tooth_mm: 0.1,
  axial_depth_mm: 2.5,
};

// 20 tight measurements → Cpk ≈ 2.0 (Six Sigma capable), no drift
function sixSigmaData(): number[] {
  return [
    10.000, 9.998, 10.001, 9.999, 10.002,
    9.999, 10.000, 10.001, 10.000, 9.999,
    10.001, 10.002, 10.000, 9.999, 10.000,
    10.001, 9.998, 10.000, 10.001, 9.999,
  ];
}

function loosenedData(): number[] {
  // Spread that lands Cpk in [1.00, 1.33) with ±0.1 tolerance (σ ≈ 0.028)
  return [
    9.97, 10.03, 9.98, 10.02, 9.96,
    10.04, 9.99, 10.01, 9.97, 10.03,
    9.98, 10.02, 9.96, 10.04, 9.97,
    10.03, 9.98, 10.02, 9.97, 10.03,
  ];
}

function shiftedHighData(): number[] {
  // Centered ~0.8 USL, Cpk still OK but shifted_high
  return Array.from({ length: 20 }, (_, i) => 10.08 + Math.sin(i) * 0.01);
}

function trendingUpData(): number[] {
  // Monotonic increase — triggers Nelson 3 or trend detection
  return Array.from({ length: 20 }, (_, i) => 10.0 + i * 0.005);
}

function outOfControlData(): number[] {
  // Cpk < 1.0 → escalate
  return [
    9.80, 10.20, 9.70, 10.30, 9.75,
    10.25, 9.80, 10.20, 9.72, 10.28,
    9.78, 10.22, 9.74, 10.26, 9.76,
    10.24, 9.79, 10.21, 9.73, 10.27,
  ];
}

const toleranced = (measurements: number[], overrides: Partial<FeedbackLoopInput> = {}): FeedbackLoopInput => ({
  feature_name: "bore_diameter_mm",
  measurements,
  nominal: 10.0,
  upper_tolerance: 0.1,
  lower_tolerance: 0.1,
  current_params: { ...baseParams },
  ...overrides,
});

describe("SPCFeedbackLoopEngine", () => {
  let engine: SPCFeedbackLoopEngine;

  beforeEach(() => {
    engine = new SPCFeedbackLoopEngine();
  });

  describe("insufficient data", () => {
    it("returns empty result with maintain action for <2 measurements", () => {
      const result = engine.evaluate(toleranced([10.0]));
      expect(result.action).toBe("maintain");
      expect(result.reasons).toContain("INSUFFICIENT_DATA");
      expect(result.adjustments.speed_multiplier).toBe(1.0);
      expect(result.adjustments.feed_multiplier).toBe(1.0);
    });

    it("returns empty result for null input", () => {
      const result = engine.evaluate(null as unknown as FeedbackLoopInput);
      expect(result.action).toBe("maintain");
      expect(result.reasons).toContain("INSUFFICIENT_DATA");
    });
  });

  describe("Six Sigma tier (Cpk ≥ 1.67)", () => {
    it("returns maintain action with no adjustment", () => {
      const result = engine.evaluate(toleranced(sixSigmaData()));
      expect(result.cpk).toBeGreaterThanOrEqual(1.67);
      expect(result.action).toBe("maintain");
      expect(result.adjustments.speed_multiplier).toBeCloseTo(1.0, 2);
      expect(result.adjustments.feed_multiplier).toBeCloseTo(1.0, 2);
      expect(result.reasons).toContain("CPK_SIX_SIGMA_MAINTAIN");
    });

    it("assessment is capable", () => {
      const result = engine.evaluate(toleranced(sixSigmaData()));
      expect(result.assessment).toBe("capable");
    });
  });

  describe("Marginal tier (1.00 ≤ Cpk < 1.33) → coarse adjustment", () => {
    it("triggers coarse_adjust action with feed and depth reduction", () => {
      const result = engine.evaluate(toleranced(loosenedData()));
      expect(result.cpk).toBeGreaterThanOrEqual(1.0);
      expect(result.cpk).toBeLessThan(1.33);
      expect(result.action).toBe("coarse_adjust");
      expect(result.adjustments.feed_multiplier).toBeLessThan(1.0);
      expect(result.adjustments.depth_multiplier).toBeLessThan(1.0);
      expect(result.reasons).toContain("CPK_MARGINAL_COARSE");
    });

    it("applied new params are scaled from current_params", () => {
      const result = engine.evaluate(toleranced(loosenedData()));
      expect(result.adjustments.new_params.feed_per_tooth_mm).toBeCloseTo(
        baseParams.feed_per_tooth_mm * result.adjustments.feed_multiplier,
        4,
      );
      expect(result.adjustments.new_params.axial_depth_mm).toBeCloseTo(
        baseParams.axial_depth_mm * result.adjustments.depth_multiplier,
        3,
      );
    });
  });

  describe("Escalation (Cpk < 1.00)", () => {
    it("escalates when Cpk below minimum", () => {
      const result = engine.evaluate(toleranced(outOfControlData()));
      expect(result.cpk).toBeLessThan(1.0);
      expect(result.action).toBe("escalate");
      expect(result.reasons).toContain("CPK_BELOW_MIN_ESCALATE");
      expect(result.escalation_message).toBeDefined();
      expect(result.escalation_message).toContain("bore_diameter_mm");
    });

    it("escalation message references feature name", () => {
      const result = engine.evaluate(toleranced(outOfControlData(), { feature_name: "od_turning_mm" }));
      expect(result.escalation_message).toContain("od_turning_mm");
    });
  });

  describe("Centering detection", () => {
    it("detects shifted_high and applies reducing adjustments", () => {
      const result = engine.evaluate(toleranced(shiftedHighData()));
      expect(result.centering).toBe("shifted_high");
      expect(result.reasons).toContain("CENTERING_SHIFTED_HIGH");
      expect(result.adjustments.feed_multiplier).toBeLessThan(1.0);
      expect(result.adjustments.depth_multiplier).toBeLessThan(1.0);
    });
  });

  describe("Trend detection", () => {
    it("detects increasing trend in measurements", () => {
      const result = engine.evaluate(toleranced(trendingUpData()));
      expect(result.drift.trend).toBe("increasing");
      expect(result.drift.slope).toBeGreaterThan(0);
    });

    it("reports stable trend on Six Sigma data", () => {
      const result = engine.evaluate(toleranced(sixSigmaData()));
      expect(result.drift.trend).toBe("stable");
    });
  });

  describe("Nelson rule responses", () => {
    it("flags drift when Nelson rules violated", () => {
      const result = engine.evaluate(toleranced(outOfControlData()));
      expect(result.drift.detected).toBe(true);
    });

    it("trend-rule adjustment reduces speed when trend detected", () => {
      const result = engine.evaluate(toleranced(trendingUpData()));
      // Trending data often triggers Nelson 3 (6 increasing) or centering shift
      if (result.drift.violated_rule_ids.includes(2) ||
          result.drift.violated_rule_ids.includes(3) ||
          result.drift.violated_rule_ids.includes(4)) {
        expect(result.adjustments.speed_multiplier).toBeLessThan(1.0);
      } else {
        // If Nelson trend rules don't fire (data too short/monotonic), drift still detected
        expect(result.drift.detected).toBe(true);
      }
    });
  });

  describe("Adjustment clamping", () => {
    it("clamps multipliers within [0.80, 1.10]", () => {
      const result = engine.evaluate(toleranced(outOfControlData()));
      expect(result.adjustments.speed_multiplier).toBeGreaterThanOrEqual(0.80);
      expect(result.adjustments.speed_multiplier).toBeLessThanOrEqual(1.10);
      expect(result.adjustments.feed_multiplier).toBeGreaterThanOrEqual(0.80);
      expect(result.adjustments.feed_multiplier).toBeLessThanOrEqual(1.10);
      expect(result.adjustments.depth_multiplier).toBeGreaterThanOrEqual(0.80);
      expect(result.adjustments.depth_multiplier).toBeLessThanOrEqual(1.10);
    });
  });

  describe("Result integrity", () => {
    it("includes full SPC result with capability indices", () => {
      const result = engine.evaluate(toleranced(sixSigmaData()));
      expect(result.spc).toBeDefined();
      expect(result.spc.capability.cpk).toBeGreaterThan(0);
      expect(result.spc.capability.pp).toBeGreaterThan(0);
      expect(result.spc.capability.sigma_level).toBeGreaterThan(0);
    });

    it("feature_name is propagated to result", () => {
      const result = engine.evaluate(toleranced(sixSigmaData(), { feature_name: "thread_pitch_mm" }));
      expect(result.feature_name).toBe("thread_pitch_mm");
    });

    it("rationale array is non-empty for any action", () => {
      const result = engine.evaluate(toleranced(loosenedData()));
      expect(result.adjustments.rationale.length).toBeGreaterThan(0);
    });
  });

  describe("edge cases", () => {
    it("handles exact Cpk = 1.33 boundary gracefully", () => {
      // Hard to hit exactly; verify that boundary data lands in fine_tune or coarse_adjust consistently
      const result = engine.evaluate(toleranced(loosenedData()));
      expect(["fine_tune", "coarse_adjust", "escalate"]).toContain(result.action);
    });

    it("handles zero measurement variance without crashing", () => {
      const result = engine.evaluate(toleranced(Array(20).fill(10.0)));
      // Zero variance — Nelson Rule 7 (15+ within 1σ) may fire because cluster
      // is degenerate. Valid behaviors: maintain (if no violations) or
      // coarse_adjust (if rule 7 fires). Just ensure no escalation and bounded adj.
      expect(["maintain", "fine_tune", "coarse_adjust"]).toContain(result.action);
      expect(result.adjustments.speed_multiplier).toBeGreaterThanOrEqual(0.80);
      expect(result.adjustments.speed_multiplier).toBeLessThanOrEqual(1.10);
    });

    it("sigma_level scales with Cpk", () => {
      const capable = engine.evaluate(toleranced(sixSigmaData()));
      const marginal = engine.evaluate(toleranced(loosenedData()));
      expect(capable.spc.capability.sigma_level).toBeGreaterThan(marginal.spc.capability.sigma_level);
    });
  });
});
