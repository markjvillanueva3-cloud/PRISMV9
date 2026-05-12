/**
 * SustainOptimizeEngine — Sustainability Optimization
 * =====================================================
 *
 * Optimizes machining parameters for reduced environmental impact
 * while maintaining quality and productivity requirements.
 *
 * L2-P4-MS1/P0-U05 — Batch 9: Sustainability
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const SustainInputSchema = z.object({
  currentPower: z.number().min(0).max(500),
  cuttingTime: z.number().min(0),
  idleTime: z.number().min(0).default(0),
  spindleSpeed: z.number().min(100).max(60000),
  feedRate: z.number().min(1).max(50000),
  coolantFlow: z.number().min(0).max(100),
  coolantType: z.enum(["mineral", "synthetic", "semi_synthetic", "mql", "dry"]),
  material: z.string(),
  materialWeight: z.number().min(0).optional(),
  chipWeight: z.number().min(0).optional(),
  toolMaterial: z.enum(["hss", "carbide", "ceramic", "cbn", "pcd"]),
  minProductivity: z.number().min(0).max(1).default(0.7),
  qualityConstraint: z.number().min(0).max(50).optional(),
});

export const SustainOutputSchema = z.object({
  currentImpact: z.object({
    energyKwh: z.number(),
    carbonKgCO2: z.number(),
    coolantLiters: z.number(),
    wasteKg: z.number(),
  }),
  optimizedParams: z.object({
    spindleSpeed: z.number(),
    feedRate: z.number(),
    coolantFlow: z.number(),
  }),
  optimizedImpact: z.object({
    energyKwh: z.number(),
    carbonKgCO2: z.number(),
    coolantLiters: z.number(),
    wasteKg: z.number(),
  }),
  savings: z.object({
    energyPercent: z.number(),
    carbonPercent: z.number(),
    coolantPercent: z.number(),
  }),
  productivityImpact: z.number(),
  recommendations: z.array(z.string()),
  sustainabilityScore: z.number().min(0).max(100),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type SustainInput = z.infer<typeof SustainInputSchema>;
export type SustainOutput = z.infer<typeof SustainOutputSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

// Carbon intensity (kg CO2 per kWh) - varies by grid
const CARBON_INTENSITY = 0.4;

// Coolant environmental factors
const COOLANT_FACTORS: Record<string, { envImpact: number; efficiency: number }> = {
  mineral: { envImpact: 1.0, efficiency: 0.8 },
  semi_synthetic: { envImpact: 0.7, efficiency: 0.9 },
  synthetic: { envImpact: 0.5, efficiency: 0.95 },
  mql: { envImpact: 0.1, efficiency: 0.85 },
  dry: { envImpact: 0, efficiency: 0.7 },
};

// Tool material energy factors (manufacturing embodied energy)
const TOOL_ENERGY_FACTORS: Record<string, number> = {
  hss: 0.5,
  carbide: 1.0,
  ceramic: 1.2,
  cbn: 2.0,
  pcd: 2.5,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SustainOptimizeEngine {
  /**
   * Optimize for sustainability
   */
  static optimize(input: SustainInput): SustainOutput {
    const validated = SustainInputSchema.parse(input);
    const recommendations: string[] = [];

    // Calculate current impact
    const totalTime = (validated.cuttingTime + validated.idleTime) / 60; // hours
    const currentEnergyKwh = validated.currentPower * totalTime / 1000;
    const currentCarbonKg = currentEnergyKwh * CARBON_INTENSITY;
    const currentCoolantL = validated.coolantFlow * validated.cuttingTime / 60;
    const currentWasteKg = validated.chipWeight ?? 0;

    // Optimization strategy
    // 1. Reduce idle power
    // 2. Optimize cutting parameters
    // 3. Reduce coolant usage

    // Optimized spindle speed (slight reduction saves energy)
    const optSpindleSpeed = Math.round(validated.spindleSpeed * 0.92);

    // Optimized feed rate (increase to reduce cycle time)
    const optFeedRate = Math.round(validated.feedRate * 1.1);

    // Optimized coolant flow
    const coolantEfficiency = COOLANT_FACTORS[validated.coolantType].efficiency;
    const optCoolantFlow = Math.round(validated.coolantFlow * coolantEfficiency * 0.85);

    // Calculate optimized impact
    // Power reduction from lower speed (approx cubic relationship with speed)
    const powerReduction = 1 - Math.pow(optSpindleSpeed / validated.spindleSpeed, 2.5);
    const optPower = validated.currentPower * (1 - powerReduction * 0.3);

    // Time reduction from higher feed
    const timeReduction = 1 - (validated.feedRate / optFeedRate);
    const optCuttingTime = validated.cuttingTime * (1 - timeReduction);
    const optTotalTime = (optCuttingTime + validated.idleTime * 0.8) / 60;

    const optEnergyKwh = optPower * optTotalTime / 1000;
    const optCarbonKg = optEnergyKwh * CARBON_INTENSITY;
    const optCoolantL = optCoolantFlow * optCuttingTime / 60;
    const optWasteKg = currentWasteKg; // Chip volume unchanged

    // Calculate savings
    const energySavings = ((currentEnergyKwh - optEnergyKwh) / currentEnergyKwh) * 100;
    const carbonSavings = ((currentCarbonKg - optCarbonKg) / currentCarbonKg) * 100;
    const coolantSavings = currentCoolantL > 0
      ? ((currentCoolantL - optCoolantL) / currentCoolantL) * 100
      : 0;

    // Productivity impact (positive = faster)
    const productivityImpact = ((validated.cuttingTime - optCuttingTime) / validated.cuttingTime) * 100;

    // Sustainability score (0-100)
    let sustainabilityScore = 50; // Base
    sustainabilityScore += energySavings * 0.5;
    sustainabilityScore += coolantSavings * 0.3;
    if (validated.coolantType === "mql" || validated.coolantType === "dry") {
      sustainabilityScore += 15;
    }
    sustainabilityScore = Math.min(100, Math.max(0, sustainabilityScore));

    // Generate recommendations
    if (validated.coolantType === "mineral") {
      recommendations.push("Consider switching to semi-synthetic or synthetic coolant");
    }
    if (validated.coolantType !== "mql" && validated.coolantType !== "dry") {
      recommendations.push("Evaluate MQL (Minimum Quantity Lubrication) for this operation");
    }
    if (validated.idleTime > validated.cuttingTime * 0.2) {
      recommendations.push("High idle time - optimize part loading/unloading");
    }
    if (energySavings > 10) {
      recommendations.push(`Potential ${energySavings.toFixed(0)}% energy savings with optimized parameters`);
    }
    if (validated.materialWeight && validated.chipWeight) {
      const materialUtilization = 1 - (validated.chipWeight / validated.materialWeight);
      if (materialUtilization < 0.5) {
        recommendations.push("Low material utilization - consider near-net-shape blanks");
      }
    }

    return SustainOutputSchema.parse({
      currentImpact: {
        energyKwh: Math.round(currentEnergyKwh * 1000) / 1000,
        carbonKgCO2: Math.round(currentCarbonKg * 1000) / 1000,
        coolantLiters: Math.round(currentCoolantL * 100) / 100,
        wasteKg: Math.round(currentWasteKg * 1000) / 1000,
      },
      optimizedParams: {
        spindleSpeed: optSpindleSpeed,
        feedRate: optFeedRate,
        coolantFlow: optCoolantFlow,
      },
      optimizedImpact: {
        energyKwh: Math.round(optEnergyKwh * 1000) / 1000,
        carbonKgCO2: Math.round(optCarbonKg * 1000) / 1000,
        coolantLiters: Math.round(optCoolantL * 100) / 100,
        wasteKg: Math.round(optWasteKg * 1000) / 1000,
      },
      savings: {
        energyPercent: Math.round(energySavings * 10) / 10,
        carbonPercent: Math.round(carbonSavings * 10) / 10,
        coolantPercent: Math.round(coolantSavings * 10) / 10,
      },
      productivityImpact: Math.round(productivityImpact * 10) / 10,
      recommendations,
      sustainabilityScore: Math.round(sustainabilityScore),
    });
  }

  static getSelfAwareness() {
    return {
      name: "SustainOptimizeEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U05",
      capabilities: ["optimize"],
      coolantTypes: Object.keys(COOLANT_FACTORS),
      carbonIntensity: CARBON_INTENSITY,
      dependencies: [],
    };
  }
}

export const sustainOptimizeEngine = new SustainOptimizeEngine();
