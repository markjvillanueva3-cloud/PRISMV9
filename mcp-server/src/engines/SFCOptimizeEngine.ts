/**
 * SFCOptimizeEngine — Surface Finish Optimization
 * =================================================
 *
 * Optimizes cutting parameters to achieve target surface finish
 * while maximizing productivity and tool life.
 *
 * L2-P4-MS1/P0-U05 — Batch 8: Surface Finish
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const OptimizeInputSchema = z.object({
  targetRa: z.number().min(0.025).max(50),
  toleranceRa: z.number().min(0.001).max(10),
  operation: z.enum(["turning", "milling", "grinding", "boring"]),
  material: z.enum(["aluminum", "steel", "stainless", "titanium", "cast_iron", "brass"]),
  toolNoseRadius: z.number().min(0.1).max(25).optional(),
  toolDiameter: z.number().min(0.1).max(200).optional(),
  fluteCount: z.number().int().min(1).max(12).optional(),
  currentFeedRate: z.number().min(0.001).max(10).optional(),
  currentSpeed: z.number().min(1).max(1000).optional(),
  minFeedRate: z.number().min(0.001).max(1).default(0.01),
  maxFeedRate: z.number().min(0.1).max(10).default(1.0),
  minSpeed: z.number().min(10).max(500).default(50),
  maxSpeed: z.number().min(50).max(1000).default(500),
  prioritize: z.enum(["surface_finish", "productivity", "tool_life", "balanced"]).default("balanced"),
});

export const OptimizeOutputSchema = z.object({
  optimizedFeedRate: z.number(),
  optimizedSpeed: z.number(),
  predictedRa: z.number(),
  predictedRz: z.number(),
  productivityIndex: z.number(),
  toolLifeIndex: z.number(),
  cycleTimeChange: z.number(),
  mrrChange: z.number(),
  tradeoffs: z.object({
    raVsProductivity: z.string(),
    raVsToolLife: z.string(),
  }),
  alternatives: z.array(z.object({
    feedRate: z.number(),
    speed: z.number(),
    predictedRa: z.number(),
    productivityIndex: z.number(),
  })),
  confidence: z.number().min(0).max(1),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type OptimizeInput = z.infer<typeof OptimizeInputSchema>;
export type OptimizeOutput = z.infer<typeof OptimizeOutputSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

// Priority weights
const PRIORITY_WEIGHTS = {
  surface_finish: { ra: 1.0, productivity: 0.2, toolLife: 0.3 },
  productivity: { ra: 0.5, productivity: 1.0, toolLife: 0.3 },
  tool_life: { ra: 0.5, productivity: 0.3, toolLife: 1.0 },
  balanced: { ra: 0.6, productivity: 0.5, toolLife: 0.5 },
};

// Material speed multipliers
const MATERIAL_SPEED_FACTORS: Record<string, number> = {
  aluminum: 1.5,
  brass: 1.3,
  steel: 1.0,
  cast_iron: 0.9,
  stainless: 0.7,
  titanium: 0.5,
};

// ─── Engine ───────────────────────────────────────────────────────────────────

export class SFCOptimizeEngine {
  /**
   * Optimize parameters for target surface finish
   */
  static optimize(input: OptimizeInput): OptimizeOutput {
    const validated = OptimizeInputSchema.parse(input);

    const weights = PRIORITY_WEIGHTS[validated.prioritize];
    const materialFactor = MATERIAL_SPEED_FACTORS[validated.material];

    // Calculate ideal feed for target Ra
    const idealFeed = this.calculateFeedForRa(
      validated.targetRa,
      validated.operation,
      validated.toolNoseRadius ?? 0.8,
      validated.toolDiameter ?? 12
    );

    // Clamp to limits
    const optimizedFeedRate = Math.max(
      validated.minFeedRate,
      Math.min(validated.maxFeedRate, idealFeed)
    );

    // Optimize speed based on priority
    let optimizedSpeed: number;
    if (validated.prioritize === "surface_finish") {
      // Lower speed for better finish
      optimizedSpeed = validated.minSpeed + (validated.maxSpeed - validated.minSpeed) * 0.4;
    } else if (validated.prioritize === "productivity") {
      // Higher speed for productivity
      optimizedSpeed = validated.minSpeed + (validated.maxSpeed - validated.minSpeed) * 0.8;
    } else if (validated.prioritize === "tool_life") {
      // Moderate speed for tool life
      optimizedSpeed = validated.minSpeed + (validated.maxSpeed - validated.minSpeed) * 0.5;
    } else {
      // Balanced
      optimizedSpeed = validated.minSpeed + (validated.maxSpeed - validated.minSpeed) * 0.6;
    }

    // Apply material factor
    optimizedSpeed *= materialFactor;
    optimizedSpeed = Math.max(validated.minSpeed, Math.min(validated.maxSpeed, optimizedSpeed));

    // Predict Ra with optimized parameters
    const predictedRa = this.predictRa(
      optimizedFeedRate,
      validated.operation,
      validated.toolNoseRadius ?? 0.8,
      validated.toolDiameter ?? 12
    );
    const predictedRz = predictedRa * 4.5;

    // Calculate indices
    const productivityIndex = (optimizedFeedRate * optimizedSpeed) /
      ((validated.maxFeedRate * validated.maxSpeed) / 2);
    const toolLifeIndex = 1 - (optimizedSpeed / validated.maxSpeed) * 0.5 -
      (optimizedFeedRate / validated.maxFeedRate) * 0.3;

    // Calculate changes from current
    let cycleTimeChange = 0;
    let mrrChange = 0;
    if (validated.currentFeedRate && validated.currentSpeed) {
      const currentMrr = validated.currentFeedRate * validated.currentSpeed;
      const optimizedMrr = optimizedFeedRate * optimizedSpeed;
      mrrChange = ((optimizedMrr - currentMrr) / currentMrr) * 100;
      cycleTimeChange = -mrrChange; // Inverse relationship
    }

    // Generate alternatives
    const alternatives = this.generateAlternatives(validated, optimizedFeedRate, optimizedSpeed);

    // Tradeoff descriptions
    const tradeoffs = {
      raVsProductivity: predictedRa <= validated.targetRa
        ? `Achieving Ra ${predictedRa.toFixed(3)}µm with ${(productivityIndex * 100).toFixed(0)}% productivity`
        : `Ra ${predictedRa.toFixed(3)}µm may exceed target - reduce feed for better finish`,
      raVsToolLife: toolLifeIndex > 0.6
        ? "Good tool life expected with current parameters"
        : "Consider reducing speed to extend tool life",
    };

    return OptimizeOutputSchema.parse({
      optimizedFeedRate: Math.round(optimizedFeedRate * 1000) / 1000,
      optimizedSpeed: Math.round(optimizedSpeed),
      predictedRa: Math.round(predictedRa * 1000) / 1000,
      predictedRz: Math.round(predictedRz * 1000) / 1000,
      productivityIndex: Math.round(productivityIndex * 100) / 100,
      toolLifeIndex: Math.round(toolLifeIndex * 100) / 100,
      cycleTimeChange: Math.round(cycleTimeChange * 10) / 10,
      mrrChange: Math.round(mrrChange * 10) / 10,
      tradeoffs,
      alternatives,
      confidence: 0.85,
    });
  }

  /**
   * Calculate feed rate for target Ra
   */
  private static calculateFeedForRa(
    targetRa: number,
    operation: string,
    noseRadius: number,
    diameter: number
  ): number {
    if (operation === "turning" || operation === "boring") {
      // Ra = f² / (32 * r) => f = sqrt(Ra * 32 * r / 1000)
      return Math.sqrt(targetRa * 32 * noseRadius / 1000);
    } else if (operation === "milling") {
      return Math.sqrt(targetRa * 32 * (diameter / 2) / 1000);
    } else {
      return (targetRa - 0.2) / 0.1;
    }
  }

  /**
   * Predict Ra from parameters
   */
  private static predictRa(
    feedRate: number,
    operation: string,
    noseRadius: number,
    diameter: number
  ): number {
    if (operation === "turning" || operation === "boring") {
      return (feedRate ** 2) / (32 * noseRadius) * 1000;
    } else if (operation === "milling") {
      return (feedRate ** 2) / (32 * (diameter / 2)) * 1000;
    } else {
      return 0.2 + feedRate * 0.1;
    }
  }

  /**
   * Generate alternative parameter sets
   */
  private static generateAlternatives(
    input: OptimizeInput,
    baseFeed: number,
    baseSpeed: number
  ): OptimizeOutput["alternatives"] {
    const alternatives: OptimizeOutput["alternatives"] = [];

    const feedVariations = [0.8, 1.2];
    const speedVariations = [0.8, 1.2];

    for (const fv of feedVariations) {
      for (const sv of speedVariations) {
        const feed = Math.max(input.minFeedRate, Math.min(input.maxFeedRate, baseFeed * fv));
        const speed = Math.max(input.minSpeed, Math.min(input.maxSpeed, baseSpeed * sv));
        const ra = this.predictRa(feed, input.operation, input.toolNoseRadius ?? 0.8, input.toolDiameter ?? 12);
        const productivity = (feed * speed) / ((input.maxFeedRate * input.maxSpeed) / 2);

        alternatives.push({
          feedRate: Math.round(feed * 1000) / 1000,
          speed: Math.round(speed),
          predictedRa: Math.round(ra * 1000) / 1000,
          productivityIndex: Math.round(productivity * 100) / 100,
        });
      }
    }

    return alternatives;
  }

  static getSelfAwareness() {
    return {
      name: "SFCOptimizeEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U05",
      capabilities: ["optimize"],
      priorities: ["surface_finish", "productivity", "tool_life", "balanced"],
      operations: ["turning", "milling", "grinding", "boring"],
      dependencies: [],
    };
  }
}

export const sfcOptimizeEngine = new SFCOptimizeEngine();
