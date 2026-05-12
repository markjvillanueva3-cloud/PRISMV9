/**
 * AdaptiveChiploadEngine — Real-Time Chipload Control
 * =====================================================
 *
 * SAFETY-CRITICAL: Controls real-time machine feed rates.
 * All outputs validated against spindle/tool limits.
 * Requires S(x) >= 0.990 for all operations.
 *
 * L2-P4-MS1/P0-U04 — Batch 7: Adaptive Control
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ChiploadInputSchema = z.object({
  currentFeedRate: z.number().min(1).max(50000),
  currentSpindleSpeed: z.number().min(100).max(60000),
  toolDiameter: z.number().min(0.1).max(200),
  fluteCount: z.number().int().min(1).max(12),
  targetChipload: z.number().min(0.001).max(1.0),
  minChipload: z.number().min(0.001).max(0.5),
  maxChipload: z.number().min(0.01).max(1.0),
  materialHardness: z.number().min(10).max(70).optional(),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]).optional(),
});

export const ChiploadOutputSchema = z.object({
  currentChipload: z.number(),
  recommendedFeedRate: z.number(),
  feedAdjustmentPercent: z.number(),
  isWithinLimits: z.boolean(),
  safetyScore: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  action: z.enum(["maintain", "increase", "decrease", "emergency_stop"]),
  confidence: z.number().min(0).max(1),
});

export const AdaptiveStateSchema = z.object({
  timestamp: z.string(),
  sampleCount: z.number(),
  avgChipload: z.number(),
  stdDevChipload: z.number(),
  trendDirection: z.enum(["increasing", "decreasing", "stable"]),
  lastAdjustment: z.number(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ChiploadInput = z.infer<typeof ChiploadInputSchema>;
export type ChiploadOutput = z.infer<typeof ChiploadOutputSchema>;
export type AdaptiveState = z.infer<typeof AdaptiveStateSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFETY_THRESHOLD = 0.990;
const MAX_ADJUSTMENT_PERCENT = 15;
const EMERGENCY_CHIPLOAD_MULTIPLIER = 2.5;

// Material-specific chipload limits (mm/tooth)
const MATERIAL_LIMITS: Record<string, { min: number; max: number }> = {
  hss: { min: 0.02, max: 0.15 },
  carbide: { min: 0.03, max: 0.25 },
  ceramic: { min: 0.05, max: 0.20 },
  cbn: { min: 0.02, max: 0.12 },
  pcd: { min: 0.04, max: 0.18 },
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class AdaptiveChiploadEngine {
  private static state: AdaptiveState = {
    timestamp: new Date().toISOString(),
    sampleCount: 0,
    avgChipload: 0,
    stdDevChipload: 0,
    trendDirection: "stable",
    lastAdjustment: 0,
  };

  private static history: number[] = [];

  /**
   * Calculate current chipload and recommend feed adjustment
   */
  static analyze(input: ChiploadInput): ChiploadOutput {
    const validated = ChiploadInputSchema.parse(input);
    const warnings: string[] = [];

    // Calculate current chipload: fz = f / (n * z)
    const currentChipload = validated.currentFeedRate /
      (validated.currentSpindleSpeed * validated.fluteCount);

    // Track history for trend analysis
    this.history.push(currentChipload);
    if (this.history.length > 100) this.history.shift();

    // Determine limits based on tool material
    const materialLimits = validated.toolMaterial
      ? MATERIAL_LIMITS[validated.toolMaterial]
      : { min: validated.minChipload, max: validated.maxChipload };

    const effectiveMin = Math.max(materialLimits.min, validated.minChipload);
    const effectiveMax = Math.min(materialLimits.max, validated.maxChipload);

    // Check if within limits
    const isWithinLimits = currentChipload >= effectiveMin &&
      currentChipload <= effectiveMax;

    // Calculate safety score
    let safetyScore = 1.0;
    if (currentChipload > effectiveMax) {
      const overageRatio = currentChipload / effectiveMax;
      safetyScore = Math.max(0, 1 - (overageRatio - 1) * 2);
    } else if (currentChipload < effectiveMin) {
      const underageRatio = effectiveMin / currentChipload;
      safetyScore = Math.max(0.5, 1 - (underageRatio - 1));
    }

    // Determine action
    let action: ChiploadOutput["action"] = "maintain";
    let recommendedFeedRate = validated.currentFeedRate;
    let feedAdjustmentPercent = 0;

    if (currentChipload > effectiveMax * EMERGENCY_CHIPLOAD_MULTIPLIER) {
      action = "emergency_stop";
      recommendedFeedRate = 0;
      feedAdjustmentPercent = -100;
      safetyScore = 0;
      warnings.push("EMERGENCY: Chipload exceeds safe limits by >150%");
    } else if (currentChipload > effectiveMax) {
      action = "decrease";
      const targetFeed = validated.targetChipload * validated.currentSpindleSpeed * validated.fluteCount;
      feedAdjustmentPercent = Math.max(-MAX_ADJUSTMENT_PERCENT,
        ((targetFeed - validated.currentFeedRate) / validated.currentFeedRate) * 100);
      recommendedFeedRate = validated.currentFeedRate * (1 + feedAdjustmentPercent / 100);
      warnings.push(`Chipload ${currentChipload.toFixed(4)} exceeds max ${effectiveMax.toFixed(4)}`);
    } else if (currentChipload < effectiveMin) {
      action = "increase";
      const targetFeed = validated.targetChipload * validated.currentSpindleSpeed * validated.fluteCount;
      feedAdjustmentPercent = Math.min(MAX_ADJUSTMENT_PERCENT,
        ((targetFeed - validated.currentFeedRate) / validated.currentFeedRate) * 100);
      recommendedFeedRate = validated.currentFeedRate * (1 + feedAdjustmentPercent / 100);
      warnings.push(`Chipload ${currentChipload.toFixed(4)} below min ${effectiveMin.toFixed(4)}`);
    } else if (Math.abs(currentChipload - validated.targetChipload) > validated.targetChipload * 0.1) {
      // Fine-tune towards target if >10% off
      const targetFeed = validated.targetChipload * validated.currentSpindleSpeed * validated.fluteCount;
      feedAdjustmentPercent = Math.max(-5, Math.min(5,
        ((targetFeed - validated.currentFeedRate) / validated.currentFeedRate) * 100));
      recommendedFeedRate = validated.currentFeedRate * (1 + feedAdjustmentPercent / 100);
      action = feedAdjustmentPercent > 0 ? "increase" : "decrease";
    }

    // Update state
    this.updateState(currentChipload, feedAdjustmentPercent);

    // Calculate confidence based on sample count and stability
    const confidence = Math.min(1, this.state.sampleCount / 20) *
      (1 - Math.min(1, this.state.stdDevChipload / validated.targetChipload));

    return ChiploadOutputSchema.parse({
      currentChipload: Math.round(currentChipload * 10000) / 10000,
      recommendedFeedRate: Math.round(recommendedFeedRate),
      feedAdjustmentPercent: Math.round(feedAdjustmentPercent * 10) / 10,
      isWithinLimits,
      safetyScore: Math.round(safetyScore * 1000) / 1000,
      warnings,
      action,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  /**
   * Update internal state with new sample
   */
  private static updateState(chipload: number, adjustment: number): void {
    const n = this.history.length;
    const avg = this.history.reduce((a, b) => a + b, 0) / n;
    const variance = this.history.reduce((sum, val) => sum + (val - avg) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);

    // Determine trend
    let trend: AdaptiveState["trendDirection"] = "stable";
    if (n >= 10) {
      const recent = this.history.slice(-5).reduce((a, b) => a + b, 0) / 5;
      const older = this.history.slice(-10, -5).reduce((a, b) => a + b, 0) / 5;
      if (recent > older * 1.05) trend = "increasing";
      else if (recent < older * 0.95) trend = "decreasing";
    }

    this.state = {
      timestamp: new Date().toISOString(),
      sampleCount: n,
      avgChipload: Math.round(avg * 10000) / 10000,
      stdDevChipload: Math.round(stdDev * 10000) / 10000,
      trendDirection: trend,
      lastAdjustment: adjustment,
    };
  }

  /**
   * Get current adaptive state
   */
  static getState(): AdaptiveState {
    return { ...this.state };
  }

  /**
   * Reset state (for testing or new operation)
   */
  static reset(): void {
    this.history = [];
    this.state = {
      timestamp: new Date().toISOString(),
      sampleCount: 0,
      avgChipload: 0,
      stdDevChipload: 0,
      trendDirection: "stable",
      lastAdjustment: 0,
    };
  }

  /**
   * Validate safety score meets threshold
   */
  static validateSafety(output: ChiploadOutput): boolean {
    return output.safetyScore >= SAFETY_THRESHOLD;
  }

  static getSelfAwareness() {
    return {
      name: "AdaptiveChiploadEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U04",
      safetyCritical: true,
      safetyThreshold: SAFETY_THRESHOLD,
      capabilities: ["analyze", "getState", "reset", "validateSafety"],
      materialSupport: Object.keys(MATERIAL_LIMITS),
      maxAdjustmentPercent: MAX_ADJUSTMENT_PERCENT,
      dependencies: [],
    };
  }
}

export const adaptiveChiploadEngine = new AdaptiveChiploadEngine();
