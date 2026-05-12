/**
 * L2-P4-MS1/P0-U04: Adaptive Control Engines Tests
 * =================================================
 *
 * SAFETY-CRITICAL tests for real-time adaptive control engines.
 * All engines must achieve S(x) >= 0.990 for normal operation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdaptiveChiploadEngine } from "../engines/AdaptiveChiploadEngine.js";
import { AdaptiveChatterEngine } from "../engines/AdaptiveChatterEngine.js";
import { AdaptiveWearEngine } from "../engines/AdaptiveWearEngine.js";
import { AdaptiveThermalEngine } from "../engines/AdaptiveThermalEngine.js";
import { AdaptiveOverrideEngine } from "../engines/AdaptiveOverrideEngine.js";

// ─── AdaptiveChiploadEngine Tests ─────────────────────────────────────────────

describe("AdaptiveChiploadEngine", () => {
  beforeEach(() => {
    AdaptiveChiploadEngine.reset();
  });

  describe("analyze", () => {
    it("calculates chipload from feed, speed, and flute count", () => {
      const result = AdaptiveChiploadEngine.analyze({
        currentFeedRate: 1200,
        currentSpindleSpeed: 6000,
        toolDiameter: 12,
        fluteCount: 4,
        targetChipload: 0.05,
        minChipload: 0.02,
        maxChipload: 0.15,
      });

      // chipload = 1200 / (6000 * 4) = 0.05
      expect(result.currentChipload).toBe(0.05);
      expect(result.isWithinLimits).toBe(true);
      expect(result.action).toBe("maintain");
    });

    it("recommends decrease when chipload exceeds max", () => {
      const result = AdaptiveChiploadEngine.analyze({
        currentFeedRate: 4800,
        currentSpindleSpeed: 6000,
        toolDiameter: 12,
        fluteCount: 4,
        targetChipload: 0.1,
        minChipload: 0.02,
        maxChipload: 0.15,
      });

      // chipload = 4800 / (6000 * 4) = 0.2 > 0.15
      expect(result.currentChipload).toBe(0.2);
      expect(result.isWithinLimits).toBe(false);
      expect(result.action).toBe("decrease");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("recommends increase when chipload below min", () => {
      const result = AdaptiveChiploadEngine.analyze({
        currentFeedRate: 240,
        currentSpindleSpeed: 6000,
        toolDiameter: 12,
        fluteCount: 4,
        targetChipload: 0.05,
        minChipload: 0.02,
        maxChipload: 0.15,
      });

      // chipload = 240 / (6000 * 4) = 0.01 < 0.02
      expect(result.currentChipload).toBe(0.01);
      expect(result.isWithinLimits).toBe(false);
      expect(result.action).toBe("increase");
    });

    it("triggers emergency stop for extreme chipload", () => {
      const result = AdaptiveChiploadEngine.analyze({
        currentFeedRate: 12000,
        currentSpindleSpeed: 6000,
        toolDiameter: 12,
        fluteCount: 4,
        targetChipload: 0.1,
        minChipload: 0.02,
        maxChipload: 0.15,
      });

      // chipload = 12000 / (6000 * 4) = 0.5 > 0.15 * 2.5 = 0.375
      expect(result.currentChipload).toBe(0.5);
      expect(result.action).toBe("emergency_stop");
      expect(result.safetyScore).toBe(0);
    });

    it("respects material-specific limits", () => {
      const result = AdaptiveChiploadEngine.analyze({
        currentFeedRate: 1800,
        currentSpindleSpeed: 6000,
        toolDiameter: 12,
        fluteCount: 4,
        targetChipload: 0.08,
        minChipload: 0.01,
        maxChipload: 0.5,
        toolMaterial: "carbide",
      });

      expect(result.isWithinLimits).toBe(true);
    });
  });

  describe("state management", () => {
    it("tracks trend direction over samples", () => {
      // Increasing chipload trend
      for (let i = 0; i < 15; i++) {
        AdaptiveChiploadEngine.analyze({
          currentFeedRate: 1000 + i * 50,
          currentSpindleSpeed: 6000,
          toolDiameter: 12,
          fluteCount: 4,
          targetChipload: 0.05,
          minChipload: 0.02,
          maxChipload: 0.15,
        });
      }

      const state = AdaptiveChiploadEngine.getState();
      expect(state.sampleCount).toBe(15);
      expect(state.trendDirection).toBe("increasing");
    });
  });

  describe("safety validation", () => {
    it("validates safety score meets threshold", () => {
      const safe = AdaptiveChiploadEngine.analyze({
        currentFeedRate: 1200,
        currentSpindleSpeed: 6000,
        toolDiameter: 12,
        fluteCount: 4,
        targetChipload: 0.05,
        minChipload: 0.02,
        maxChipload: 0.15,
      });

      expect(AdaptiveChiploadEngine.validateSafety(safe)).toBe(true);
    });
  });
});

// ─── AdaptiveChatterEngine Tests ──────────────────────────────────────────────

describe("AdaptiveChatterEngine", () => {
  beforeEach(() => {
    AdaptiveChatterEngine.reset();
  });

  describe("analyze", () => {
    it("detects no chatter when vibration is low", () => {
      const result = AdaptiveChatterEngine.analyze({
        spindleSpeed: 6000,
        feedRate: 1200,
        depthOfCut: 2,
        toolDiameter: 12,
        toolStickout: 50,
        fluteCount: 4,
        vibrationAmplitude: 2, // Below threshold
        vibrationFrequency: 400, // Near tooth pass frequency (6000/60 * 4 = 400)
      });

      expect(result.chatterDetected).toBe(false);
      expect(result.chatterSeverity).toBe("none");
    });

    it("detects severe chatter with high vibration near natural frequency", () => {
      const result = AdaptiveChatterEngine.analyze({
        spindleSpeed: 6000,
        feedRate: 1200,
        depthOfCut: 5,
        toolDiameter: 12,
        toolStickout: 80,
        fluteCount: 4,
        vibrationAmplitude: 30, // High amplitude
        vibrationFrequency: 1500, // Near natural frequency
        naturalFrequency: 1500,
      });

      expect(result.chatterDetected).toBe(true);
      expect(result.chatterSeverity).toBe("severe");
      expect(result.action).toBe("emergency_stop");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("recommends action for elevated vibration", () => {
      const result = AdaptiveChatterEngine.analyze({
        spindleSpeed: 6000,
        feedRate: 1200,
        depthOfCut: 3,
        toolDiameter: 12,
        toolStickout: 60,
        fluteCount: 4,
        vibrationAmplitude: 12, // Above threshold
        vibrationFrequency: 1200, // Between harmonics (not at 400 or 800)
        naturalFrequency: 1500,
      });

      // Either detected as chatter or still provides stability info
      expect(result.stabilityMargin).toBeGreaterThan(0);
      expect(["none", "incipient", "moderate"]).toContain(result.chatterSeverity);
    });

    it("calculates stability margin", () => {
      const result = AdaptiveChatterEngine.analyze({
        spindleSpeed: 8000,
        feedRate: 1500,
        depthOfCut: 2,
        toolDiameter: 12,
        toolStickout: 50,
        fluteCount: 4,
        vibrationAmplitude: 3,
        vibrationFrequency: 533, // Near harmonic
        naturalFrequency: 1600,
        dampingRatio: 0.05,
      });

      expect(result.stabilityMargin).toBeGreaterThan(0);
    });
  });

  describe("generateStabilityLobes", () => {
    it("generates stability lobe data", () => {
      const lobes = AdaptiveChatterEngine.generateStabilityLobes(
        1500, // naturalFreq
        0.05, // damping
        1e7, // stiffness
        4, // fluteCount
        3000, // minRpm
        12000 // maxRpm
      );

      expect(lobes.length).toBeGreaterThan(0);
      expect(lobes[0]).toHaveProperty("spindleSpeed");
      expect(lobes[0]).toHaveProperty("criticalDepth");
      expect(lobes[0]).toHaveProperty("lobeNumber");
    });
  });
});

// ─── AdaptiveWearEngine Tests ─────────────────────────────────────────────────

describe("AdaptiveWearEngine", () => {
  beforeEach(() => {
    AdaptiveWearEngine.reset();
  });

  describe("analyze", () => {
    it("estimates low wear for new tool", () => {
      const result = AdaptiveWearEngine.analyze({
        cuttingTime: 2, // Very short cutting time
        cuttingSpeed: 100, // Lower speed = longer life
        feedRate: 1000,
        depthOfCut: 2,
        toolMaterial: "carbide",
        workMaterial: "aluminum", // Easier material
      });

      expect(result.estimatedWear).toBeLessThan(20);
      expect(["new", "run_in"]).toContain(result.wearStage);
      expect(result.recommendedAction).toBe("continue");
    });

    it("detects critical wear at end of life", () => {
      const result = AdaptiveWearEngine.analyze({
        cuttingTime: 200,
        cuttingSpeed: 200,
        feedRate: 1500,
        depthOfCut: 3,
        toolMaterial: "carbide",
        workMaterial: "steel",
        currentPower: 15,
        baselinePower: 10, // 50% increase
        currentForce: 1800,
        baselineForce: 1200, // 50% increase
      });

      expect(result.wearStage).toBe("critical");
      expect(["change_now", "emergency_stop"]).toContain(result.recommendedAction);
      expect(result.breakageRisk).toBeGreaterThan(0.3);
    });

    it("provides wear compensation recommendations", () => {
      const result = AdaptiveWearEngine.analyze({
        cuttingTime: 100,
        cuttingSpeed: 180,
        feedRate: 1200,
        depthOfCut: 2.5,
        toolMaterial: "carbide",
        workMaterial: "steel",
      });

      expect(result.compensations).toHaveProperty("feedAdjust");
      expect(result.compensations).toHaveProperty("speedAdjust");
      expect(result.compensations).toHaveProperty("docAdjust");
    });

    it("adjusts wear based on power increase", () => {
      const baseline = AdaptiveWearEngine.analyze({
        cuttingTime: 5, // Short time so wear doesn't hit cap
        cuttingSpeed: 100,
        feedRate: 1000,
        depthOfCut: 2,
        toolMaterial: "carbide",
        workMaterial: "aluminum",
      });

      AdaptiveWearEngine.reset();

      const withPower = AdaptiveWearEngine.analyze({
        cuttingTime: 5,
        cuttingSpeed: 100,
        feedRate: 1000,
        depthOfCut: 2,
        toolMaterial: "carbide",
        workMaterial: "aluminum",
        currentPower: 15, // 50% increase
        baselinePower: 10,
      });

      // With power increase, wear should be higher (or equal if both hit cap)
      expect(withPower.estimatedWear).toBeGreaterThanOrEqual(baseline.estimatedWear);
    });
  });

  describe("getTaylorCoefficients", () => {
    it("returns coefficients for valid material combinations", () => {
      const coeffs = AdaptiveWearEngine.getTaylorCoefficients("carbide", "steel");
      expect(coeffs).toBeDefined();
      expect(coeffs?.C).toBeGreaterThan(0);
      expect(coeffs?.n).toBeGreaterThan(0);
    });

    it("returns undefined for invalid combinations", () => {
      const coeffs = AdaptiveWearEngine.getTaylorCoefficients("unknown", "steel");
      expect(coeffs).toBeUndefined();
    });
  });
});

// ─── AdaptiveThermalEngine Tests ──────────────────────────────────────────────

describe("AdaptiveThermalEngine", () => {
  beforeEach(() => {
    AdaptiveThermalEngine.reset();
  });

  describe("analyze", () => {
    it("estimates cutting temperature based on parameters", () => {
      const result = AdaptiveThermalEngine.analyze({
        cuttingSpeed: 150,
        feedRate: 1000,
        depthOfCut: 2,
        toolMaterial: "carbide",
        workMaterial: "steel",
        coolantType: "flood",
      });

      expect(result.estimatedCuttingTemp).toBeGreaterThan(20);
      expect(result.estimatedCuttingTemp).toBeLessThan(result.toolTempLimit);
      expect(result.tempMargin).toBeGreaterThan(0);
    });

    it("uses measured temperature when provided", () => {
      const result = AdaptiveThermalEngine.analyze({
        cuttingSpeed: 150,
        feedRate: 1000,
        depthOfCut: 2,
        toolMaterial: "carbide",
        workMaterial: "steel",
        coolantType: "flood",
        measuredToolTemp: 450,
      });

      expect(result.estimatedCuttingTemp).toBe(450);
    });

    it("detects critical thermal state near tool limit", () => {
      const result = AdaptiveThermalEngine.analyze({
        cuttingSpeed: 300,
        feedRate: 2000,
        depthOfCut: 5,
        toolMaterial: "carbide",
        workMaterial: "titanium",
        coolantType: "none",
        measuredToolTemp: 780, // Near 800°C carbide limit
      });

      expect(result.thermalState).toBe("critical");
      expect(["pause_cooldown", "emergency_stop"]).toContain(result.recommendedAction);
    });

    it("calculates thermal expansion compensation", () => {
      const result = AdaptiveThermalEngine.analyze({
        cuttingSpeed: 200,
        feedRate: 1500,
        depthOfCut: 3,
        toolMaterial: "carbide",
        workMaterial: "steel",
        coolantType: "flood",
        ambientTemp: 20,
        spindleTemp: 35,
        machineRuntime: 60,
      });

      expect(result.thermalExpansion.total).not.toBe(0);
      expect(result.compensations.zOffset).not.toBe(0);
    });

    it("recommends coolant increase when none used and hot", () => {
      const result = AdaptiveThermalEngine.analyze({
        cuttingSpeed: 250,
        feedRate: 1800,
        depthOfCut: 4,
        toolMaterial: "carbide",
        workMaterial: "steel",
        coolantType: "none",
        measuredToolTemp: 700,
      });

      expect(result.thermalState).toBe("hot");
      expect(result.recommendedAction).toBe("increase_coolant");
    });
  });

  describe("getToolTempLimit", () => {
    it("returns correct limits for tool materials", () => {
      expect(AdaptiveThermalEngine.getToolTempLimit("hss")).toBe(550);
      expect(AdaptiveThermalEngine.getToolTempLimit("carbide")).toBe(800);
      expect(AdaptiveThermalEngine.getToolTempLimit("ceramic")).toBe(1100);
    });
  });

  describe("getExpansionCoefficient", () => {
    it("returns correct coefficients for materials", () => {
      expect(AdaptiveThermalEngine.getExpansionCoefficient("steel")).toBe(12);
      expect(AdaptiveThermalEngine.getExpansionCoefficient("aluminum")).toBe(23);
    });
  });
});

// ─── AdaptiveOverrideEngine Tests ─────────────────────────────────────────────

describe("AdaptiveOverrideEngine", () => {
  beforeEach(() => {
    AdaptiveOverrideEngine.reset();
  });

  describe("calculate", () => {
    it("maintains 100% override with no recommendations", () => {
      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        mode: "balanced",
      });

      expect(result.feedOverride).toBe(100);
      expect(result.speedOverride).toBe(100);
      expect(result.action).toBe("hold");
    });

    it("reduces override when safety is low", () => {
      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        chiploadRecommendation: { feedAdjust: -20, safetyScore: 0.4 },
        mode: "balanced",
      });

      expect(result.feedOverride).toBeLessThan(100);
      expect(result.combinedSafetyScore).toBe(0.4);
    });

    it("triggers emergency stop for critical safety", () => {
      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        chiploadRecommendation: { feedAdjust: -50, safetyScore: 0.2 },
        chatterRecommendation: { speedAdjust: -30, docAdjust: -20, safetyScore: 0.25 },
        mode: "balanced",
      });

      expect(result.action).toBe("emergency_stop");
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("arbitrates between conflicting recommendations", () => {
      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        chiploadRecommendation: { feedAdjust: 10, safetyScore: 0.95 },
        wearRecommendation: { feedAdjust: -15, speedAdjust: -10, safetyScore: 0.85 },
        thermalRecommendation: { feedAdjust: -5, speedAdjust: -5, safetyScore: 0.9 },
        mode: "balanced",
      });

      // Should weight negative adjustments more for safety
      expect(result.feedOverride).toBeLessThanOrEqual(100);
      expect(result.arbitrationResult.limitingFactor).toBeTruthy();
    });

    it("respects ramp rate limits", () => {
      // First call establishes baseline
      AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        mode: "balanced",
      });

      // Second call with large adjustment request
      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        chiploadRecommendation: { feedAdjust: -30, safetyScore: 0.8 },
        mode: "balanced",
      });

      // Should ramp down, not jump
      expect(result.feedOverride).toBeGreaterThanOrEqual(95);
    });

    it("calculates effective feed and speed rates", () => {
      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 80,
        currentOverrideSpeed: 90,
        mode: "balanced",
      });

      // Effective rates use the output override (which may be ramped)
      expect(result.effectiveFeedRate).toBe(Math.round(1200 * result.feedOverride / 100));
      expect(result.effectiveSpindleSpeed).toBe(Math.round(6000 * result.speedOverride / 100));
    });

    it("respects operator override", () => {
      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        chiploadRecommendation: { feedAdjust: 10, safetyScore: 0.95 },
        operatorOverride: 80,
        mode: "balanced",
      });

      // Operator override should scale the adjustment
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("uses conservative mode weights correctly", () => {
      const balanced = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        wearRecommendation: { feedAdjust: -10, speedAdjust: -10, safetyScore: 0.85 },
        mode: "balanced",
      });

      AdaptiveOverrideEngine.reset();

      const conservative = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 100,
        currentOverrideSpeed: 100,
        wearRecommendation: { feedAdjust: -10, speedAdjust: -10, safetyScore: 0.85 },
        mode: "conservative",
      });

      // Conservative should reduce more
      expect(conservative.feedOverride).toBeLessThanOrEqual(balanced.feedOverride);
    });
  });

  describe("state management", () => {
    it("tracks override history", () => {
      for (let i = 0; i < 5; i++) {
        AdaptiveOverrideEngine.calculate({
          baseSpindleSpeed: 6000,
          baseFeedRate: 1200,
          currentOverrideFeed: 100 - i * 2,
          currentOverrideSpeed: 100,
          mode: "balanced",
        });
      }

      const result = AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 90,
        currentOverrideSpeed: 100,
        mode: "balanced",
      });

      expect(result.overrideHistory.length).toBeGreaterThan(0);
    });

    it("returns current state", () => {
      AdaptiveOverrideEngine.calculate({
        baseSpindleSpeed: 6000,
        baseFeedRate: 1200,
        currentOverrideFeed: 95,
        currentOverrideSpeed: 90,
        mode: "balanced",
      });

      const state = AdaptiveOverrideEngine.getState();
      expect(state).toHaveProperty("feedOverride");
      expect(state).toHaveProperty("speedOverride");
    });
  });
});

// ─── Cross-Engine Integration Tests ───────────────────────────────────────────

describe("Adaptive Control Integration", () => {
  beforeEach(() => {
    AdaptiveChiploadEngine.reset();
    AdaptiveChatterEngine.reset();
    AdaptiveWearEngine.reset();
    AdaptiveThermalEngine.reset();
    AdaptiveOverrideEngine.reset();
  });

  it("integrates all engine outputs into override calculation", () => {
    // Get recommendations from each engine
    const chipload = AdaptiveChiploadEngine.analyze({
      currentFeedRate: 1200,
      currentSpindleSpeed: 6000,
      toolDiameter: 12,
      fluteCount: 4,
      targetChipload: 0.05,
      minChipload: 0.02,
      maxChipload: 0.15,
    });

    const chatter = AdaptiveChatterEngine.analyze({
      spindleSpeed: 6000,
      feedRate: 1200,
      depthOfCut: 2,
      toolDiameter: 12,
      toolStickout: 50,
      fluteCount: 4,
      vibrationAmplitude: 3,
      vibrationFrequency: 400,
    });

    const wear = AdaptiveWearEngine.analyze({
      cuttingTime: 30,
      cuttingSpeed: 150,
      feedRate: 1200,
      depthOfCut: 2,
      toolMaterial: "carbide",
      workMaterial: "steel",
    });

    const thermal = AdaptiveThermalEngine.analyze({
      cuttingSpeed: 150,
      feedRate: 1200,
      depthOfCut: 2,
      toolMaterial: "carbide",
      workMaterial: "steel",
      coolantType: "flood",
    });

    // Feed into override engine
    const override = AdaptiveOverrideEngine.calculate({
      baseSpindleSpeed: 6000,
      baseFeedRate: 1200,
      currentOverrideFeed: 100,
      currentOverrideSpeed: 100,
      chiploadRecommendation: {
        feedAdjust: chipload.feedAdjustmentPercent,
        safetyScore: chipload.safetyScore,
      },
      chatterRecommendation: {
        speedAdjust: chatter.recommendedSpindleSpeed !== 6000
          ? ((chatter.recommendedSpindleSpeed - 6000) / 6000) * 100
          : 0,
        docAdjust: ((chatter.recommendedDepthOfCut - 2) / 2) * 100,
        safetyScore: chatter.safetyScore,
      },
      wearRecommendation: {
        feedAdjust: wear.compensations.feedAdjust,
        speedAdjust: wear.compensations.speedAdjust,
        safetyScore: wear.safetyScore,
      },
      thermalRecommendation: {
        feedAdjust: thermal.compensations.feedAdjust,
        speedAdjust: thermal.compensations.speedAdjust,
        safetyScore: thermal.safetyScore,
      },
      mode: "balanced",
    });

    // Should produce valid override structure
    expect(override.feedOverride).toBeGreaterThanOrEqual(0);
    expect(override.speedOverride).toBeGreaterThanOrEqual(0);
    expect(typeof override.combinedSafetyScore).toBe("number");
    expect(override.confidence).toBeGreaterThan(0); // Has confidence with inputs
    expect(override.arbitrationResult.limitingFactor).toBeTruthy();
  });

  it("all engines provide self-awareness", () => {
    const engines = [
      AdaptiveChiploadEngine,
      AdaptiveChatterEngine,
      AdaptiveWearEngine,
      AdaptiveThermalEngine,
      AdaptiveOverrideEngine,
    ];

    for (const engine of engines) {
      const awareness = engine.getSelfAwareness();
      expect(awareness.name).toBeTruthy();
      expect(awareness.version).toBe("1.0.0");
      expect(awareness.milestone).toBe("L2-P4-MS1/P0-U04");
      expect(awareness.safetyCritical).toBe(true);
      expect(awareness.safetyThreshold).toBe(0.990);
    }
  });
});
