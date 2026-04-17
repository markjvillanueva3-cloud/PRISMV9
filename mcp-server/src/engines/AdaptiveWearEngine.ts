/**
 * AdaptiveWearEngine — Real-Time Tool Wear Monitoring & Compensation
 * ====================================================================
 *
 * SAFETY-CRITICAL: Monitors tool wear and adjusts parameters to maintain quality.
 * Predicts tool breakage risk and triggers tool change alerts.
 * Requires S(x) >= 0.990 for all operations.
 *
 * L2-P4-MS1/P0-U04 — Batch 7: Adaptive Control
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const WearInputSchema = z.object({
  cuttingTime: z.number().min(0),
  cuttingSpeed: z.number().min(1).max(1000),
  feedRate: z.number().min(1).max(50000),
  depthOfCut: z.number().min(0.01).max(50),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]),
  workMaterial: z.enum(["aluminum", "steel", "stainless", "titanium", "inconel", "hardened"]),
  currentPower: z.number().min(0).optional(),
  baselinePower: z.number().min(0).optional(),
  currentForce: z.number().min(0).optional(),
  baselineForce: z.number().min(0).optional(),
  surfaceFinish: z.number().min(0).optional(),
  baselineSurfaceFinish: z.number().min(0).optional(),
});

export const WearOutputSchema = z.object({
  estimatedWear: z.number(),
  wearRate: z.number(),
  remainingLife: z.number(),
  lifePercent: z.number(),
  wearStage: z.enum(["new", "run_in", "steady", "accelerated", "critical"]),
  breakageRisk: z.number(),
  recommendedAction: z.enum(["continue", "monitor", "reduce_params", "change_soon", "change_now", "emergency_stop"]),
  compensations: z.object({
    feedAdjust: z.number(),
    speedAdjust: z.number(),
    docAdjust: z.number(),
  }),
  safetyScore: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type WearInput = z.infer<typeof WearInputSchema>;
export type WearOutput = z.infer<typeof WearOutputSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFETY_THRESHOLD = 0.990;

// Taylor tool life coefficients (C, n) for tool/work material combinations
const TAYLOR_COEFFICIENTS: Record<string, Record<string, { C: number; n: number }>> = {
  carbide: {
    aluminum: { C: 800, n: 0.4 },
    steel: { C: 300, n: 0.25 },
    stainless: { C: 200, n: 0.22 },
    titanium: { C: 100, n: 0.2 },
    inconel: { C: 50, n: 0.18 },
    hardened: { C: 80, n: 0.15 },
  },
  hss: {
    aluminum: { C: 300, n: 0.35 },
    steel: { C: 100, n: 0.2 },
    stainless: { C: 60, n: 0.18 },
    titanium: { C: 30, n: 0.15 },
    inconel: { C: 15, n: 0.12 },
    hardened: { C: 20, n: 0.1 },
  },
  ceramic: {
    aluminum: { C: 1200, n: 0.5 },
    steel: { C: 500, n: 0.35 },
    stainless: { C: 400, n: 0.3 },
    titanium: { C: 200, n: 0.25 },
    inconel: { C: 150, n: 0.22 },
    hardened: { C: 300, n: 0.28 },
  },
  cbn: {
    steel: { C: 600, n: 0.3 },
    stainless: { C: 400, n: 0.28 },
    hardened: { C: 500, n: 0.32 },
    aluminum: { C: 400, n: 0.35 },
    titanium: { C: 150, n: 0.2 },
    inconel: { C: 100, n: 0.18 },
  },
  pcd: {
    aluminum: { C: 2000, n: 0.6 },
    steel: { C: 200, n: 0.2 },
    stainless: { C: 150, n: 0.18 },
    titanium: { C: 100, n: 0.15 },
    inconel: { C: 50, n: 0.12 },
    hardened: { C: 100, n: 0.15 },
  },
};

// Wear stage thresholds (% of tool life)
const WEAR_STAGES = {
  new: 0,
  run_in: 5,
  steady: 15,
  accelerated: 75,
  critical: 90,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class AdaptiveWearEngine {
  private static wearHistory: { time: number; wear: number }[] = [];

  /**
   * Analyze tool wear and recommend action
   */
  static analyze(input: WearInput): WearOutput {
    const validated = WearInputSchema.parse(input);
    const warnings: string[] = [];

    // Get Taylor coefficients
    const coeffs = TAYLOR_COEFFICIENTS[validated.toolMaterial]?.[validated.workMaterial] ??
      { C: 200, n: 0.25 };

    // Taylor equation: T = (C/V)^(1/n)
    const expectedLife = Math.pow(coeffs.C / validated.cuttingSpeed, 1 / coeffs.n);

    // Estimate wear based on cutting time and indirect measurements
    let estimatedWear = (validated.cuttingTime / expectedLife) * 100;

    // Adjust based on power/force increase if available
    if (validated.currentPower && validated.baselinePower) {
      const powerRatio = validated.currentPower / validated.baselinePower;
      estimatedWear *= Math.pow(powerRatio, 1.5);
    }
    if (validated.currentForce && validated.baselineForce) {
      const forceRatio = validated.currentForce / validated.baselineForce;
      estimatedWear *= Math.pow(forceRatio, 1.2);
    }
    if (validated.surfaceFinish && validated.baselineSurfaceFinish) {
      const finishRatio = validated.surfaceFinish / validated.baselineSurfaceFinish;
      estimatedWear *= Math.pow(finishRatio, 0.8);
    }

    estimatedWear = Math.min(100, Math.max(0, estimatedWear));

    // Track history for wear rate calculation
    this.wearHistory.push({ time: validated.cuttingTime, wear: estimatedWear });
    if (this.wearHistory.length > 100) this.wearHistory.shift();

    // Calculate wear rate
    let wearRate = 0;
    if (this.wearHistory.length >= 2) {
      const recent = this.wearHistory.slice(-10);
      const deltaWear = recent[recent.length - 1].wear - recent[0].wear;
      const deltaTime = recent[recent.length - 1].time - recent[0].time;
      wearRate = deltaTime > 0 ? deltaWear / deltaTime : 0;
    }

    // Remaining life
    const remainingLife = Math.max(0, (100 - estimatedWear) / Math.max(0.001, wearRate));
    const lifePercent = 100 - estimatedWear;

    // Determine wear stage
    let wearStage: WearOutput["wearStage"] = "new";
    if (estimatedWear >= WEAR_STAGES.critical) wearStage = "critical";
    else if (estimatedWear >= WEAR_STAGES.accelerated) wearStage = "accelerated";
    else if (estimatedWear >= WEAR_STAGES.steady) wearStage = "steady";
    else if (estimatedWear >= WEAR_STAGES.run_in) wearStage = "run_in";

    // Breakage risk (exponential increase in accelerated/critical stages)
    let breakageRisk = 0;
    if (wearStage === "critical") {
      breakageRisk = 0.5 + (estimatedWear - 90) * 0.05;
    } else if (wearStage === "accelerated") {
      breakageRisk = 0.1 + (estimatedWear - 75) * 0.02;
    } else if (wearRate > 2) {
      breakageRisk = 0.05 * wearRate;
    }
    breakageRisk = Math.min(1, Math.max(0, breakageRisk));

    // Safety score
    let safetyScore = 1 - breakageRisk;
    if (wearStage === "critical") safetyScore *= 0.5;
    else if (wearStage === "accelerated") safetyScore *= 0.8;

    // Recommended action
    let action: WearOutput["recommendedAction"] = "continue";
    if (breakageRisk > 0.8 || wearStage === "critical") {
      action = breakageRisk > 0.9 ? "emergency_stop" : "change_now";
      warnings.push("CRITICAL: Tool at end of life - change immediately");
    } else if (wearStage === "accelerated" || breakageRisk > 0.3) {
      action = "change_soon";
      warnings.push("Tool entering accelerated wear phase");
    } else if (wearRate > 1.5 || breakageRisk > 0.1) {
      action = "reduce_params";
      warnings.push("Elevated wear rate detected");
    } else if (wearStage === "steady" && estimatedWear > 50) {
      action = "monitor";
    }

    // Calculate compensations
    const compensations = {
      feedAdjust: wearStage === "accelerated" ? -15 : wearStage === "steady" ? -5 : 0,
      speedAdjust: wearStage === "accelerated" ? -10 : wearStage === "steady" ? -3 : 0,
      docAdjust: wearStage === "accelerated" ? -20 : wearStage === "steady" ? -5 : 0,
    };

    // Confidence based on data availability
    let confidence = 0.5;
    if (validated.currentPower && validated.baselinePower) confidence += 0.15;
    if (validated.currentForce && validated.baselineForce) confidence += 0.15;
    if (validated.surfaceFinish && validated.baselineSurfaceFinish) confidence += 0.1;
    if (this.wearHistory.length > 20) confidence += 0.1;

    return WearOutputSchema.parse({
      estimatedWear: Math.round(estimatedWear * 10) / 10,
      wearRate: Math.round(wearRate * 100) / 100,
      remainingLife: Math.round(remainingLife * 10) / 10,
      lifePercent: Math.round(lifePercent * 10) / 10,
      wearStage,
      breakageRisk: Math.round(breakageRisk * 1000) / 1000,
      recommendedAction: action,
      compensations,
      safetyScore: Math.round(safetyScore * 1000) / 1000,
      warnings,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  /**
   * Reset wear history
   */
  static reset(): void {
    this.wearHistory = [];
  }

  /**
   * Get Taylor coefficients for material combination
   */
  static getTaylorCoefficients(toolMaterial: string, workMaterial: string): { C: number; n: number } | undefined {
    return TAYLOR_COEFFICIENTS[toolMaterial]?.[workMaterial];
  }

  /**
   * Validate safety score meets threshold
   */
  static validateSafety(output: WearOutput): boolean {
    return output.safetyScore >= SAFETY_THRESHOLD;
  }

  static getSelfAwareness() {
    return {
      name: "AdaptiveWearEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U04",
      safetyCritical: true,
      safetyThreshold: SAFETY_THRESHOLD,
      capabilities: ["analyze", "reset", "getTaylorCoefficients", "validateSafety"],
      toolMaterials: ["hss", "carbide", "ceramic", "cbn", "pcd"],
      workMaterials: ["aluminum", "steel", "stainless", "titanium", "inconel", "hardened"],
      wearStages: Object.keys(WEAR_STAGES),
      dependencies: [],
    };
  }
}

export const adaptiveWearEngine = new AdaptiveWearEngine();
