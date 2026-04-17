/**
 * SFCCalculateEngine — Surface Finish Calculation
 * =================================================
 *
 * Calculates theoretical and predicted surface finish (Ra, Rz, Rt)
 * based on cutting parameters, tool geometry, and material properties.
 *
 * L2-P4-MS1/P0-U05 — Batch 8: Surface Finish
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const SFCInputSchema = z.object({
  operation: z.enum(["turning", "milling", "grinding", "boring", "drilling"]),
  feedRate: z.number().min(0.001).max(10),
  toolNoseRadius: z.number().min(0.1).max(25).optional(),
  toolDiameter: z.number().min(0.1).max(200).optional(),
  fluteCount: z.number().int().min(1).max(12).optional(),
  cuttingSpeed: z.number().min(1).max(1000),
  depthOfCut: z.number().min(0.001).max(50),
  material: z.enum(["aluminum", "steel", "stainless", "titanium", "cast_iron", "brass", "plastic"]),
  toolCondition: z.enum(["new", "good", "worn", "critical"]).default("good"),
  coolant: z.enum(["none", "flood", "mist", "through_tool"]).default("flood"),
  vibrationLevel: z.number().min(0).max(10).default(0),
});

export const SFCOutputSchema = z.object({
  theoreticalRa: z.number(),
  predictedRa: z.number(),
  theoreticalRz: z.number(),
  predictedRz: z.number(),
  theoreticalRt: z.number(),
  predictedRt: z.number(),
  qualityGrade: z.enum(["N1", "N2", "N3", "N4", "N5", "N6", "N7", "N8", "N9", "N10", "N11", "N12"]),
  adjustmentFactors: z.object({
    toolWear: z.number(),
    vibration: z.number(),
    material: z.number(),
    coolant: z.number(),
  }),
  recommendations: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type SFCInput = z.infer<typeof SFCInputSchema>;
export type SFCOutput = z.infer<typeof SFCOutputSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

// ISO N grades (Ra values in µm)
const ISO_GRADES: { grade: SFCOutput["qualityGrade"]; maxRa: number }[] = [
  { grade: "N1", maxRa: 0.025 },
  { grade: "N2", maxRa: 0.05 },
  { grade: "N3", maxRa: 0.1 },
  { grade: "N4", maxRa: 0.2 },
  { grade: "N5", maxRa: 0.4 },
  { grade: "N6", maxRa: 0.8 },
  { grade: "N7", maxRa: 1.6 },
  { grade: "N8", maxRa: 3.2 },
  { grade: "N9", maxRa: 6.3 },
  { grade: "N10", maxRa: 12.5 },
  { grade: "N11", maxRa: 25 },
  { grade: "N12", maxRa: 50 },
];

// Material surface finish factors
const MATERIAL_FACTORS: Record<string, number> = {
  aluminum: 0.85,
  brass: 0.9,
  plastic: 0.8,
  steel: 1.0,
  stainless: 1.15,
  cast_iron: 1.1,
  titanium: 1.25,
};

// Tool condition factors
const TOOL_CONDITION_FACTORS: Record<string, number> = {
  new: 0.9,
  good: 1.0,
  worn: 1.3,
  critical: 1.8,
};

// Coolant factors
const COOLANT_FACTORS: Record<string, number> = {
  none: 1.3,
  mist: 1.1,
  flood: 1.0,
  through_tool: 0.95,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SFCCalculateEngine {
  /**
   * Calculate surface finish
   */
  static calculate(input: SFCInput): SFCOutput {
    const validated = SFCInputSchema.parse(input);
    const recommendations: string[] = [];

    // Calculate theoretical Ra based on operation
    let theoreticalRa: number;

    if (validated.operation === "turning" || validated.operation === "boring") {
      // Ra = f² / (32 * r) where f = feed, r = nose radius
      const noseRadius = validated.toolNoseRadius ?? 0.8;
      theoreticalRa = (validated.feedRate ** 2) / (32 * noseRadius) * 1000; // µm
    } else if (validated.operation === "milling") {
      // Ra = f² / (32 * D * z) simplified for face milling
      const diameter = validated.toolDiameter ?? 12;
      const fluteCount = validated.fluteCount ?? 4;
      const feedPerTooth = validated.feedRate / fluteCount;
      theoreticalRa = (feedPerTooth ** 2) / (32 * (diameter / 2)) * 1000;
    } else if (validated.operation === "grinding") {
      // Grinding typically achieves 0.1-1.6 µm Ra
      theoreticalRa = 0.2 + validated.depthOfCut * 0.1;
    } else {
      // Drilling - rougher surface
      theoreticalRa = validated.feedRate * 5;
    }

    // Apply adjustment factors
    const toolWearFactor = TOOL_CONDITION_FACTORS[validated.toolCondition];
    const materialFactor = MATERIAL_FACTORS[validated.material];
    const coolantFactor = COOLANT_FACTORS[validated.coolant];
    const vibrationFactor = 1 + validated.vibrationLevel * 0.1;

    const totalFactor = toolWearFactor * materialFactor * coolantFactor * vibrationFactor;
    const predictedRa = theoreticalRa * totalFactor;

    // Calculate Rz and Rt (typical ratios)
    const theoreticalRz = theoreticalRa * 4.5;
    const predictedRz = predictedRa * 4.5;
    const theoreticalRt = theoreticalRa * 6;
    const predictedRt = predictedRa * 6;

    // Determine quality grade
    const qualityGrade = this.getQualityGrade(predictedRa);

    // Generate recommendations
    if (predictedRa > 3.2) {
      recommendations.push("Consider reducing feed rate to improve surface finish");
    }
    if (validated.toolCondition === "worn" || validated.toolCondition === "critical") {
      recommendations.push("Tool change recommended for better surface quality");
    }
    if (validated.vibrationLevel > 3) {
      recommendations.push("High vibration detected - check toolholding and fixturing");
    }
    if (validated.coolant === "none" && validated.material !== "cast_iron") {
      recommendations.push("Add coolant to improve surface finish and tool life");
    }

    // Confidence based on input completeness
    let confidence = 0.7;
    if (validated.toolNoseRadius || validated.toolDiameter) confidence += 0.1;
    if (validated.vibrationLevel > 0) confidence += 0.1;
    if (validated.toolCondition !== "good") confidence += 0.05;

    return SFCOutputSchema.parse({
      theoreticalRa: Math.round(theoreticalRa * 1000) / 1000,
      predictedRa: Math.round(predictedRa * 1000) / 1000,
      theoreticalRz: Math.round(theoreticalRz * 1000) / 1000,
      predictedRz: Math.round(predictedRz * 1000) / 1000,
      theoreticalRt: Math.round(theoreticalRt * 1000) / 1000,
      predictedRt: Math.round(predictedRt * 1000) / 1000,
      qualityGrade,
      adjustmentFactors: {
        toolWear: toolWearFactor,
        vibration: vibrationFactor,
        material: materialFactor,
        coolant: coolantFactor,
      },
      recommendations,
      confidence: Math.round(confidence * 100) / 100,
    });
  }

  /**
   * Get ISO quality grade from Ra value
   */
  private static getQualityGrade(ra: number): SFCOutput["qualityGrade"] {
    for (const { grade, maxRa } of ISO_GRADES) {
      if (ra <= maxRa) return grade;
    }
    return "N12";
  }

  /**
   * Calculate required feed for target Ra
   */
  static calculateFeedForTarget(
    targetRa: number,
    operation: SFCInput["operation"],
    toolNoseRadius?: number,
    toolDiameter?: number
  ): number {
    if (operation === "turning" || operation === "boring") {
      const r = toolNoseRadius ?? 0.8;
      // Ra = f² / (32 * r) => f = sqrt(Ra * 32 * r / 1000)
      return Math.sqrt(targetRa * 32 * r / 1000);
    } else if (operation === "milling") {
      const d = toolDiameter ?? 12;
      // Simplified: f = sqrt(Ra * 32 * (d/2) / 1000)
      return Math.sqrt(targetRa * 32 * (d / 2) / 1000);
    } else if (operation === "grinding") {
      return (targetRa - 0.2) / 0.1; // Approximate depth
    } else {
      return targetRa / 5;
    }
  }

  static getSelfAwareness() {
    return {
      name: "SFCCalculateEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U05",
      capabilities: ["calculate", "calculateFeedForTarget"],
      operations: ["turning", "milling", "grinding", "boring", "drilling"],
      qualityGrades: ISO_GRADES.map(g => g.grade),
      dependencies: [],
    };
  }
}

export const sfcCalculateEngine = new SFCCalculateEngine();
