/**
 * AdaptiveOverrideEngine — Intelligent Feed/Speed Override Control
 * ==================================================================
 *
 * SAFETY-CRITICAL: Coordinates all adaptive systems to generate
 * safe, optimized override values. Arbitrates between conflicting
 * recommendations from chipload, chatter, wear, and thermal engines.
 * Requires S(x) >= 0.990 for all operations.
 *
 * L2-P4-MS1/P0-U04 — Batch 7: Adaptive Control
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const OverrideInputSchema = z.object({
  baseSpindleSpeed: z.number().min(100).max(60000),
  baseFeedRate: z.number().min(1).max(50000),
  currentOverrideFeed: z.number().min(0).max(200).default(100),
  currentOverrideSpeed: z.number().min(0).max(200).default(100),
  chiploadRecommendation: z.object({
    feedAdjust: z.number(),
    safetyScore: z.number(),
  }).optional(),
  chatterRecommendation: z.object({
    speedAdjust: z.number(),
    docAdjust: z.number(),
    safetyScore: z.number(),
  }).optional(),
  wearRecommendation: z.object({
    feedAdjust: z.number(),
    speedAdjust: z.number(),
    safetyScore: z.number(),
  }).optional(),
  thermalRecommendation: z.object({
    feedAdjust: z.number(),
    speedAdjust: z.number(),
    safetyScore: z.number(),
  }).optional(),
  operatorOverride: z.number().min(50).max(150).optional(),
  mode: z.enum(["conservative", "balanced", "aggressive"]).default("balanced"),
  maxFeedOverride: z.number().min(50).max(150).default(120),
  minFeedOverride: z.number().min(10).max(100).default(50),
  maxSpeedOverride: z.number().min(50).max(150).default(120),
  minSpeedOverride: z.number().min(10).max(100).default(50),
});

export const OverrideOutputSchema = z.object({
  feedOverride: z.number(),
  speedOverride: z.number(),
  effectiveFeedRate: z.number(),
  effectiveSpindleSpeed: z.number(),
  arbitrationResult: z.object({
    chiploadWeight: z.number(),
    chatterWeight: z.number(),
    wearWeight: z.number(),
    thermalWeight: z.number(),
    limitingFactor: z.string(),
  }),
  overrideHistory: z.array(z.object({
    timestamp: z.string(),
    feed: z.number(),
    speed: z.number(),
  })),
  combinedSafetyScore: z.number().min(0).max(1),
  action: z.enum(["apply", "hold", "ramp_up", "ramp_down", "emergency_stop"]),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type OverrideInput = z.infer<typeof OverrideInputSchema>;
export type OverrideOutput = z.infer<typeof OverrideOutputSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFETY_THRESHOLD = 0.990;
const MAX_RAMP_RATE = 5; // % per cycle
const HISTORY_LENGTH = 50;

// Weight factors by mode
const MODE_WEIGHTS = {
  conservative: { safety: 1.5, performance: 0.5 },
  balanced: { safety: 1.0, performance: 1.0 },
  aggressive: { safety: 0.7, performance: 1.3 },
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class AdaptiveOverrideEngine {
  private static history: { timestamp: string; feed: number; speed: number }[] = [];
  private static lastFeedOverride = 100;
  private static lastSpeedOverride = 100;

  /**
   * Calculate optimal override values from all adaptive inputs
   */
  static calculate(input: OverrideInput): OverrideOutput {
    const validated = OverrideInputSchema.parse(input);
    const warnings: string[] = [];

    // Collect all safety scores
    const safetyScores: number[] = [];
    const feedAdjustments: { value: number; weight: number; source: string }[] = [];
    const speedAdjustments: { value: number; weight: number; source: string }[] = [];

    // Process chipload recommendation
    if (validated.chiploadRecommendation) {
      safetyScores.push(validated.chiploadRecommendation.safetyScore);
      feedAdjustments.push({
        value: validated.chiploadRecommendation.feedAdjust,
        weight: 1.0,
        source: "chipload",
      });
    }

    // Process chatter recommendation
    if (validated.chatterRecommendation) {
      safetyScores.push(validated.chatterRecommendation.safetyScore);
      speedAdjustments.push({
        value: validated.chatterRecommendation.speedAdjust,
        weight: 1.2, // Chatter has higher priority for speed
        source: "chatter",
      });
    }

    // Process wear recommendation
    if (validated.wearRecommendation) {
      safetyScores.push(validated.wearRecommendation.safetyScore);
      feedAdjustments.push({
        value: validated.wearRecommendation.feedAdjust,
        weight: 0.8,
        source: "wear",
      });
      speedAdjustments.push({
        value: validated.wearRecommendation.speedAdjust,
        weight: 0.8,
        source: "wear",
      });
    }

    // Process thermal recommendation
    if (validated.thermalRecommendation) {
      safetyScores.push(validated.thermalRecommendation.safetyScore);
      feedAdjustments.push({
        value: validated.thermalRecommendation.feedAdjust,
        weight: 1.1, // Thermal slightly higher priority
        source: "thermal",
      });
      speedAdjustments.push({
        value: validated.thermalRecommendation.speedAdjust,
        weight: 1.1,
        source: "thermal",
      });
    }

    // Combined safety score (minimum of all)
    const combinedSafetyScore = safetyScores.length > 0
      ? Math.min(...safetyScores)
      : 1.0;

    // Arbitration: weight adjustments and find consensus
    const modeWeight = MODE_WEIGHTS[validated.mode];

    let targetFeedAdjust = 0;
    let totalFeedWeight = 0;
    let limitingFeedSource = "none";
    let minFeedAdjust = Infinity;

    for (const adj of feedAdjustments) {
      const effectiveWeight = adj.weight * (adj.value < 0 ? modeWeight.safety : modeWeight.performance);
      targetFeedAdjust += adj.value * effectiveWeight;
      totalFeedWeight += effectiveWeight;
      if (adj.value < minFeedAdjust) {
        minFeedAdjust = adj.value;
        limitingFeedSource = adj.source;
      }
    }
    targetFeedAdjust = totalFeedWeight > 0 ? targetFeedAdjust / totalFeedWeight : 0;

    let targetSpeedAdjust = 0;
    let totalSpeedWeight = 0;
    let limitingSpeedSource = "none";
    let minSpeedAdjust = Infinity;

    for (const adj of speedAdjustments) {
      const effectiveWeight = adj.weight * (adj.value < 0 ? modeWeight.safety : modeWeight.performance);
      targetSpeedAdjust += adj.value * effectiveWeight;
      totalSpeedWeight += effectiveWeight;
      if (adj.value < minSpeedAdjust) {
        minSpeedAdjust = adj.value;
        limitingSpeedSource = adj.source;
      }
    }
    targetSpeedAdjust = totalSpeedWeight > 0 ? targetSpeedAdjust / totalSpeedWeight : 0;

    // Apply operator override if provided
    if (validated.operatorOverride) {
      const operatorFactor = validated.operatorOverride / 100;
      targetFeedAdjust = targetFeedAdjust * operatorFactor;
      targetSpeedAdjust = targetSpeedAdjust * operatorFactor;
    }

    // Calculate target overrides
    let targetFeedOverride = validated.currentOverrideFeed + targetFeedAdjust;
    let targetSpeedOverride = validated.currentOverrideSpeed + targetSpeedAdjust;

    // Clamp to limits
    targetFeedOverride = Math.max(validated.minFeedOverride,
      Math.min(validated.maxFeedOverride, targetFeedOverride));
    targetSpeedOverride = Math.max(validated.minSpeedOverride,
      Math.min(validated.maxSpeedOverride, targetSpeedOverride));

    // Apply ramp rate limiting
    let feedOverride = this.lastFeedOverride;
    let speedOverride = this.lastSpeedOverride;

    const feedDelta = targetFeedOverride - feedOverride;
    const speedDelta = targetSpeedOverride - speedOverride;

    if (Math.abs(feedDelta) > MAX_RAMP_RATE) {
      feedOverride += Math.sign(feedDelta) * MAX_RAMP_RATE;
    } else {
      feedOverride = targetFeedOverride;
    }

    if (Math.abs(speedDelta) > MAX_RAMP_RATE) {
      speedOverride += Math.sign(speedDelta) * MAX_RAMP_RATE;
    } else {
      speedOverride = targetSpeedOverride;
    }

    // Emergency override for low safety
    if (combinedSafetyScore < 0.5) {
      feedOverride = Math.min(feedOverride, 50);
      speedOverride = Math.min(speedOverride, 50);
      warnings.push("SAFETY: Override reduced due to low safety score");
    }

    // Update state
    this.lastFeedOverride = feedOverride;
    this.lastSpeedOverride = speedOverride;

    const timestamp = new Date().toISOString();
    this.history.push({ timestamp, feed: feedOverride, speed: speedOverride });
    if (this.history.length > HISTORY_LENGTH) this.history.shift();

    // Determine action
    let action: OverrideOutput["action"] = "apply";
    if (combinedSafetyScore < 0.3) {
      action = "emergency_stop";
      warnings.push("EMERGENCY: Safety score critical");
    } else if (feedDelta < -10 || speedDelta < -10) {
      action = "ramp_down";
    } else if (feedDelta > 10 || speedDelta > 10) {
      action = "ramp_up";
    } else if (Math.abs(feedDelta) < 1 && Math.abs(speedDelta) < 1) {
      action = "hold";
    }

    // Calculate effective rates
    const effectiveFeedRate = validated.baseFeedRate * (feedOverride / 100);
    const effectiveSpindleSpeed = validated.baseSpindleSpeed * (speedOverride / 100);

    // Confidence based on input availability
    const confidence = Math.min(1, (
      (validated.chiploadRecommendation ? 0.25 : 0) +
      (validated.chatterRecommendation ? 0.25 : 0) +
      (validated.wearRecommendation ? 0.25 : 0) +
      (validated.thermalRecommendation ? 0.25 : 0)
    ) + 0.2);

    // Determine limiting factor
    const limitingFactor = minFeedAdjust < minSpeedAdjust
      ? `feed:${limitingFeedSource}`
      : `speed:${limitingSpeedSource}`;

    return OverrideOutputSchema.parse({
      feedOverride: Math.round(feedOverride),
      speedOverride: Math.round(speedOverride),
      effectiveFeedRate: Math.round(effectiveFeedRate),
      effectiveSpindleSpeed: Math.round(effectiveSpindleSpeed),
      arbitrationResult: {
        chiploadWeight: validated.chiploadRecommendation ? 1.0 : 0,
        chatterWeight: validated.chatterRecommendation ? 1.2 : 0,
        wearWeight: validated.wearRecommendation ? 0.8 : 0,
        thermalWeight: validated.thermalRecommendation ? 1.1 : 0,
        limitingFactor,
      },
      overrideHistory: this.history.slice(-10),
      combinedSafetyScore: Math.round(combinedSafetyScore * 1000) / 1000,
      action,
      warnings,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  /**
   * Reset override state
   */
  static reset(): void {
    this.history = [];
    this.lastFeedOverride = 100;
    this.lastSpeedOverride = 100;
  }

  /**
   * Get current override state
   */
  static getState(): { feedOverride: number; speedOverride: number } {
    return {
      feedOverride: this.lastFeedOverride,
      speedOverride: this.lastSpeedOverride,
    };
  }

  /**
   * Validate combined safety score meets threshold
   */
  static validateSafety(output: OverrideOutput): boolean {
    return output.combinedSafetyScore >= SAFETY_THRESHOLD;
  }

  static getSelfAwareness() {
    return {
      name: "AdaptiveOverrideEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U04",
      safetyCritical: true,
      safetyThreshold: SAFETY_THRESHOLD,
      capabilities: ["calculate", "reset", "getState", "validateSafety"],
      modes: ["conservative", "balanced", "aggressive"],
      maxRampRate: MAX_RAMP_RATE,
      inputSources: ["chipload", "chatter", "wear", "thermal"],
      dependencies: ["AdaptiveChiploadEngine", "AdaptiveChatterEngine", "AdaptiveWearEngine", "AdaptiveThermalEngine"],
    };
  }
}

export const adaptiveOverrideEngine = new AdaptiveOverrideEngine();
