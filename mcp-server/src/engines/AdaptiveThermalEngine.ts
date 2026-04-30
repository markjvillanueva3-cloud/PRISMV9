/**
 * AdaptiveThermalEngine — Real-Time Thermal Compensation
 * ========================================================
 *
 * SAFETY-CRITICAL: Monitors cutting temperature and thermal expansion.
 * Adjusts parameters to prevent thermal damage and maintain accuracy.
 * Requires S(x) >= 0.990 for all operations.
 *
 * L2-P4-MS1/P0-U04 — Batch 7: Adaptive Control
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ThermalInputSchema = z.object({
  cuttingSpeed: z.number().min(1).max(1000),
  feedRate: z.number().min(1).max(50000),
  depthOfCut: z.number().min(0.01).max(50),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]),
  workMaterial: z.enum(["aluminum", "steel", "stainless", "titanium", "inconel", "hardened"]),
  coolantType: z.enum(["none", "flood", "mist", "through_tool", "cryogenic"]),
  ambientTemp: z.number().min(-20).max(50).optional(),
  measuredToolTemp: z.number().min(0).max(1200).optional(),
  measuredWorkTemp: z.number().min(0).max(800).optional(),
  spindleTemp: z.number().min(0).max(100).optional(),
  machineRuntime: z.number().min(0).optional(),
});

export const ThermalOutputSchema = z.object({
  estimatedCuttingTemp: z.number(),
  toolTempLimit: z.number(),
  tempMargin: z.number(),
  thermalExpansion: z.object({
    tool: z.number(),
    work: z.number(),
    spindle: z.number(),
    total: z.number(),
  }),
  compensations: z.object({
    zOffset: z.number(),
    feedAdjust: z.number(),
    speedAdjust: z.number(),
  }),
  thermalState: z.enum(["cold", "warming", "stable", "hot", "critical"]),
  recommendedAction: z.enum(["continue", "increase_coolant", "reduce_speed", "reduce_doc", "pause_cooldown", "emergency_stop"]),
  safetyScore: z.number().min(0).max(1),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ThermalInput = z.infer<typeof ThermalInputSchema>;
export type ThermalOutput = z.infer<typeof ThermalOutputSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const SAFETY_THRESHOLD = 0.990;

// Tool temperature limits (°C)
const TOOL_TEMP_LIMITS: Record<string, number> = {
  hss: 550,
  carbide: 800,
  ceramic: 1100,
  cbn: 1200,
  pcd: 700, // PCD degrades above this
};

// Thermal expansion coefficients (µm/m/°C)
const EXPANSION_COEFFICIENTS: Record<string, number> = {
  steel: 12,
  aluminum: 23,
  stainless: 16,
  titanium: 8.6,
  inconel: 13,
  hardened: 11,
  carbide: 5,
  spindle: 12, // Steel spindle
};

// Coolant effectiveness factors
const COOLANT_FACTORS: Record<string, number> = {
  none: 1.0,
  mist: 0.7,
  flood: 0.5,
  through_tool: 0.4,
  cryogenic: 0.25,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class AdaptiveThermalEngine {
  private static tempHistory: { time: number; temp: number }[] = [];
  private static stableTemp: number | null = null;

  /**
   * Analyze thermal conditions and recommend compensation
   */
  static analyze(input: ThermalInput): ThermalOutput {
    const validated = ThermalInputSchema.parse(input);
    const warnings: string[] = [];

    const ambient = validated.ambientTemp ?? 20;

    // Estimate cutting temperature using semi-empirical model
    // T = ambient + k * V^a * f^b * d^c / coolant_factor
    const coolantFactor = COOLANT_FACTORS[validated.coolantType];
    const materialFactor = this.getMaterialHeatFactor(validated.workMaterial);

    let estimatedTemp = ambient + (
      materialFactor *
      Math.pow(validated.cuttingSpeed, 0.4) *
      Math.pow(validated.feedRate / 1000, 0.2) *
      Math.pow(validated.depthOfCut, 0.1)
    ) / coolantFactor;

    // Use measured temp if available
    if (validated.measuredToolTemp) {
      estimatedTemp = validated.measuredToolTemp;
    }

    // Track temperature history
    const now = Date.now();
    this.tempHistory.push({ time: now, temp: estimatedTemp });
    if (this.tempHistory.length > 100) this.tempHistory.shift();

    // Tool temperature limit
    const toolTempLimit = TOOL_TEMP_LIMITS[validated.toolMaterial];
    const tempMargin = (toolTempLimit - estimatedTemp) / toolTempLimit;

    // Calculate thermal expansion
    const toolLength = 100; // mm typical
    const workSize = 50; // mm typical
    const spindleLength = 300; // mm typical
    const spindleTemp = validated.spindleTemp ?? (ambient + (validated.machineRuntime ?? 0) * 0.1);

    const toolExpansion = EXPANSION_COEFFICIENTS.carbide * toolLength *
      (estimatedTemp - ambient) / 1000;
    const workExpansion = EXPANSION_COEFFICIENTS[validated.workMaterial] * workSize *
      ((validated.measuredWorkTemp ?? estimatedTemp * 0.3) - ambient) / 1000;
    const spindleExpansion = EXPANSION_COEFFICIENTS.spindle * spindleLength *
      (spindleTemp - ambient) / 1000;
    const totalExpansion = toolExpansion + workExpansion + spindleExpansion;

    // Determine thermal state
    let thermalState: ThermalOutput["thermalState"] = "cold";
    if (estimatedTemp > toolTempLimit * 0.95) {
      thermalState = "critical";
    } else if (estimatedTemp > toolTempLimit * 0.85) {
      thermalState = "hot";
    } else if (this.tempHistory.length >= 10) {
      const recentAvg = this.tempHistory.slice(-10).reduce((s, t) => s + t.temp, 0) / 10;
      const olderAvg = this.tempHistory.slice(0, Math.min(10, this.tempHistory.length - 10))
        .reduce((s, t) => s + t.temp, 0) / Math.min(10, this.tempHistory.length - 10);

      if (Math.abs(recentAvg - olderAvg) < 5) {
        thermalState = "stable";
        this.stableTemp = recentAvg;
      } else if (recentAvg > olderAvg) {
        thermalState = "warming";
      }
    }

    // Safety score
    let safetyScore = Math.min(1, tempMargin + 0.1);
    if (thermalState === "critical") safetyScore = 0.2;
    else if (thermalState === "hot") safetyScore = 0.7;

    // Recommended action
    let action: ThermalOutput["recommendedAction"] = "continue";
    if (thermalState === "critical") {
      action = estimatedTemp > toolTempLimit ? "emergency_stop" : "pause_cooldown";
      warnings.push("CRITICAL: Temperature approaching tool limit");
    } else if (thermalState === "hot") {
      action = validated.coolantType === "none" ? "increase_coolant" : "reduce_speed";
      warnings.push("High temperature - parameter reduction recommended");
    } else if (thermalState === "warming" && estimatedTemp > toolTempLimit * 0.7) {
      action = "reduce_doc";
      warnings.push("Temperature rising - monitor closely");
    }

    // Calculate compensations
    const compensations = {
      zOffset: -totalExpansion, // Negative because expansion moves tool up
      feedAdjust: thermalState === "hot" ? -20 : thermalState === "warming" ? -5 : 0,
      speedAdjust: thermalState === "hot" ? -15 : thermalState === "warming" ? -5 : 0,
    };

    // Confidence based on measurements
    let confidence = 0.5;
    if (validated.measuredToolTemp) confidence += 0.25;
    if (validated.measuredWorkTemp) confidence += 0.1;
    if (validated.spindleTemp) confidence += 0.1;
    if (this.tempHistory.length > 20) confidence += 0.05;

    return ThermalOutputSchema.parse({
      estimatedCuttingTemp: Math.round(estimatedTemp),
      toolTempLimit,
      tempMargin: Math.round(tempMargin * 1000) / 1000,
      thermalExpansion: {
        tool: Math.round(toolExpansion * 1000) / 1000,
        work: Math.round(workExpansion * 1000) / 1000,
        spindle: Math.round(spindleExpansion * 1000) / 1000,
        total: Math.round(totalExpansion * 1000) / 1000,
      },
      compensations: {
        zOffset: Math.round(compensations.zOffset * 1000) / 1000,
        feedAdjust: compensations.feedAdjust,
        speedAdjust: compensations.speedAdjust,
      },
      thermalState,
      recommendedAction: action,
      safetyScore: Math.round(safetyScore * 1000) / 1000,
      warnings,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  /**
   * Get material-specific heat generation factor
   */
  private static getMaterialHeatFactor(material: string): number {
    const factors: Record<string, number> = {
      aluminum: 2.5,
      steel: 4.0,
      stainless: 5.5,
      titanium: 7.0,
      inconel: 8.5,
      hardened: 6.0,
    };
    return factors[material] ?? 4.0;
  }

  /**
   * Reset temperature history
   */
  static reset(): void {
    this.tempHistory = [];
    this.stableTemp = null;
  }

  /**
   * Get tool temperature limit
   */
  static getToolTempLimit(toolMaterial: string): number {
    return TOOL_TEMP_LIMITS[toolMaterial] ?? 600;
  }

  /**
   * Get expansion coefficient
   */
  static getExpansionCoefficient(material: string): number {
    return EXPANSION_COEFFICIENTS[material] ?? 12;
  }

  /**
   * Validate safety score meets threshold
   */
  static validateSafety(output: ThermalOutput): boolean {
    return output.safetyScore >= SAFETY_THRESHOLD;
  }

  static getSelfAwareness() {
    return {
      name: "AdaptiveThermalEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U04",
      safetyCritical: true,
      safetyThreshold: SAFETY_THRESHOLD,
      capabilities: ["analyze", "reset", "getToolTempLimit", "getExpansionCoefficient", "validateSafety"],
      toolMaterials: Object.keys(TOOL_TEMP_LIMITS),
      coolantTypes: Object.keys(COOLANT_FACTORS),
      thermalStates: ["cold", "warming", "stable", "hot", "critical"],
      dependencies: [],
    };
  }
}

export const adaptiveThermalEngine = new AdaptiveThermalEngine();
