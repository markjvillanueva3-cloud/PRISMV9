/**
 * CAMRecommendEngine — CAM Strategy Recommendations
 * ==================================================
 *
 * Recommends optimal CAM strategies based on part geometry,
 * material, machine capabilities, and production requirements.
 *
 * L2-P4-MS1/P0-U03 — Batch 6: CAM Export
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const OperationTypeSchema = z.enum([
  "facing", "roughing", "semi_finish", "finish", "rest_machining",
  "pocket", "contour", "drilling", "tapping", "boring", "reaming",
  "thread_milling", "chamfer", "deburr", "3d_roughing", "3d_finish"
]);

export const StrategySchema = z.enum([
  "adaptive", "trochoidal", "hsm", "conventional", "climb", "plunge",
  "waterline", "scallop", "pencil", "spiral", "parallel", "radial"
]);

export const RecommendationSchema = z.object({
  id: z.string(),
  operationType: OperationTypeSchema,
  strategy: StrategySchema,
  confidence: z.number().min(0).max(1),
  reasoning: z.array(z.string()),
  parameters: z.object({
    stepover: z.number().optional(),
    stepdown: z.number().optional(),
    feedRate: z.number().optional(),
    spindleSpeed: z.number().optional(),
    toolDiameter: z.number().optional(),
    coolant: z.enum(["flood", "mist", "air", "through_tool", "none"]).optional(),
  }),
  alternatives: z.array(z.object({
    strategy: StrategySchema,
    confidence: z.number(),
    tradeoff: z.string(),
  })),
  warnings: z.array(z.string()),
});

export const PartAnalysisSchema = z.object({
  material: z.string(),
  hardness: z.number().optional(),
  xSize: z.number(),
  ySize: z.number(),
  zSize: z.number(),
  features: z.array(z.enum(["pocket", "hole", "slot", "boss", "fillet", "chamfer", "thin_wall", "deep_cavity"])),
  tolerance: z.number().optional(),
  surfaceFinish: z.number().optional(),
  quantity: z.number().default(1),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type OperationType = z.infer<typeof OperationTypeSchema>;
export type Strategy = z.infer<typeof StrategySchema>;
export type Recommendation = z.infer<typeof RecommendationSchema>;
export type PartAnalysis = z.infer<typeof PartAnalysisSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const recommendations: Map<string, Recommendation[]> = new Map();
let recCounter = 1;

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CAMRecommendEngine {
  /**
   * Get strategy recommendations for part
   */
  static recommend(analysis: PartAnalysis, machineType?: string): Recommendation[] {
    const recs: Recommendation[] = [];

    // Analyze and recommend based on features and requirements
    if (analysis.features.includes("pocket")) {
      recs.push(this.recommendPocket(analysis));
    }

    if (analysis.features.includes("deep_cavity")) {
      recs.push(this.recommendDeepCavity(analysis));
    }

    if (analysis.features.includes("thin_wall")) {
      recs.push(this.recommendThinWall(analysis));
    }

    if (analysis.features.includes("hole")) {
      recs.push(this.recommendDrilling(analysis));
    }

    // Always recommend roughing for significant material removal
    if (analysis.zSize > 10) {
      recs.push(this.recommendRoughing(analysis));
    }

    // Recommend finishing based on surface requirements
    if (analysis.surfaceFinish && analysis.surfaceFinish < 3.2) {
      recs.push(this.recommendFinishing(analysis));
    }

    // Store recommendations
    const key = `PART-${++recCounter}`;
    recommendations.set(key, recs);

    return recs;
  }

  /**
   * Recommend pocket strategy
   */
  private static recommendPocket(analysis: PartAnalysis): Recommendation {
    const isHardMaterial = analysis.hardness && analysis.hardness > 35;
    const isDeep = analysis.zSize > analysis.xSize * 0.5;

    let strategy: Strategy = "adaptive";
    let confidence = 0.85;
    const reasoning: string[] = [];
    const alternatives: Recommendation["alternatives"] = [];
    const warnings: string[] = [];

    if (isHardMaterial) {
      strategy = "trochoidal";
      reasoning.push("Hard material benefits from constant chip load");
      confidence = 0.90;
    } else if (isDeep) {
      strategy = "adaptive";
      reasoning.push("Deep pocket requires adaptive for chip evacuation");
      alternatives.push({ strategy: "plunge", confidence: 0.70, tradeoff: "Slower but better chip control" });
    } else {
      strategy = "hsm";
      reasoning.push("Shallow pocket in soft material ideal for HSM");
      confidence = 0.88;
    }

    reasoning.push(`Material: ${analysis.material}`);
    reasoning.push(`Pocket depth: ${analysis.zSize}mm`);

    if (analysis.features.includes("thin_wall")) {
      warnings.push("Thin wall adjacent - reduce radial engagement");
    }

    return {
      id: `REC-${++recCounter}`,
      operationType: "pocket",
      strategy,
      confidence,
      reasoning,
      parameters: {
        stepover: isHardMaterial ? 0.25 : 0.40,
        stepdown: isDeep ? 1.0 : 2.0,
        coolant: isHardMaterial ? "through_tool" : "flood",
      },
      alternatives,
      warnings,
    };
  }

  /**
   * Recommend deep cavity strategy
   */
  private static recommendDeepCavity(analysis: PartAnalysis): Recommendation {
    return {
      id: `REC-${++recCounter}`,
      operationType: "3d_roughing",
      strategy: "adaptive",
      confidence: 0.92,
      reasoning: [
        "Deep cavity requires aggressive chip evacuation",
        "Adaptive clearing minimizes tool engagement",
        `Depth: ${analysis.zSize}mm requires multiple passes`,
      ],
      parameters: {
        stepover: 0.30,
        stepdown: Math.min(2.0, analysis.zSize / 10),
        coolant: "through_tool",
      },
      alternatives: [
        { strategy: "plunge", confidence: 0.75, tradeoff: "Better for very deep cavities >5xD" },
        { strategy: "trochoidal", confidence: 0.80, tradeoff: "Better surface but slower" },
      ],
      warnings: ["Ensure tool reach is sufficient", "Consider tool deflection"],
    };
  }

  /**
   * Recommend thin wall strategy
   */
  private static recommendThinWall(analysis: PartAnalysis): Recommendation {
    return {
      id: `REC-${++recCounter}`,
      operationType: "semi_finish",
      strategy: "climb",
      confidence: 0.88,
      reasoning: [
        "Thin wall requires low cutting forces",
        "Climb milling reduces deflection",
        "Multiple light passes recommended",
      ],
      parameters: {
        stepover: 0.15,
        stepdown: 0.5,
        coolant: "mist",
      },
      alternatives: [
        { strategy: "hsm", confidence: 0.75, tradeoff: "Faster but higher vibration risk" },
      ],
      warnings: [
        "Monitor for chatter",
        "Consider rest machining for corners",
        "Reduce spindle speed if vibration occurs",
      ],
    };
  }

  /**
   * Recommend drilling strategy
   */
  private static recommendDrilling(analysis: PartAnalysis): Recommendation {
    const isDeep = analysis.zSize > 30;

    return {
      id: `REC-${++recCounter}`,
      operationType: "drilling",
      strategy: isDeep ? "plunge" : "conventional",
      confidence: 0.95,
      reasoning: [
        isDeep ? "Deep hole requires peck drilling" : "Standard drilling suitable",
        `Hole depth: ${analysis.zSize}mm`,
      ],
      parameters: {
        coolant: isDeep ? "through_tool" : "flood",
      },
      alternatives: [],
      warnings: isDeep ? ["Use peck cycle G83", "Increase dwell at bottom"] : [],
    };
  }

  /**
   * Recommend roughing strategy
   */
  private static recommendRoughing(analysis: PartAnalysis): Recommendation {
    const isHardMaterial = analysis.hardness && analysis.hardness > 40;
    const mrr = analysis.xSize * analysis.ySize * analysis.zSize;

    let strategy: Strategy = "adaptive";
    if (mrr > 100000) {
      strategy = "adaptive";
    } else if (isHardMaterial) {
      strategy = "trochoidal";
    }

    return {
      id: `REC-${++recCounter}`,
      operationType: "roughing",
      strategy,
      confidence: 0.90,
      reasoning: [
        `Material removal volume: ${mrr.toFixed(0)}mm³`,
        `Material: ${analysis.material}`,
        strategy === "adaptive" ? "Adaptive maximizes MRR" : "Trochoidal for hard material",
      ],
      parameters: {
        stepover: 0.40,
        stepdown: isHardMaterial ? 1.5 : 3.0,
        coolant: "flood",
      },
      alternatives: [
        { strategy: "conventional", confidence: 0.60, tradeoff: "Simpler but lower efficiency" },
      ],
      warnings: [],
    };
  }

  /**
   * Recommend finishing strategy
   */
  private static recommendFinishing(analysis: PartAnalysis): Recommendation {
    const targetRa = analysis.surfaceFinish || 1.6;
    let strategy: Strategy = "parallel";

    if (targetRa < 0.8) {
      strategy = "pencil";
    } else if (analysis.features.includes("fillet")) {
      strategy = "scallop";
    }

    return {
      id: `REC-${++recCounter}`,
      operationType: "finish",
      strategy,
      confidence: 0.87,
      reasoning: [
        `Target Ra: ${targetRa}µm`,
        `Strategy: ${strategy} for optimal surface`,
      ],
      parameters: {
        stepover: targetRa < 1.0 ? 0.05 : 0.10,
        stepdown: 0.3,
        coolant: targetRa < 0.8 ? "mist" : "flood",
      },
      alternatives: [
        { strategy: "waterline", confidence: 0.80, tradeoff: "Better for steep walls" },
        { strategy: "spiral", confidence: 0.75, tradeoff: "Better for circular features" },
      ],
      warnings: targetRa < 0.8 ? ["May require grinding for Ra < 0.8"] : [],
    };
  }

  /**
   * Get recommendations for specific operation
   */
  static recommendForOperation(
    operation: OperationType,
    material: string,
    toolDiameter: number
  ): Recommendation {
    const analysis: PartAnalysis = {
      material,
      xSize: toolDiameter * 10,
      ySize: toolDiameter * 10,
      zSize: toolDiameter * 2,
      features: [],
      quantity: 1,
    };

    const allRecs = this.recommend(analysis);
    return allRecs.find(r => r.operationType === operation) || this.recommendRoughing(analysis);
  }

  /**
   * List available strategies
   */
  static listStrategies(): { strategy: Strategy; description: string; bestFor: string[] }[] {
    return [
      { strategy: "adaptive", description: "Constant engagement adaptive clearing", bestFor: ["roughing", "pockets", "hard materials"] },
      { strategy: "trochoidal", description: "Circular motion for constant chip load", bestFor: ["slots", "hard materials", "deep cuts"] },
      { strategy: "hsm", description: "High-speed machining with smooth paths", bestFor: ["aluminum", "shallow pockets", "finishing"] },
      { strategy: "conventional", description: "Traditional zigzag pattern", bestFor: ["simple shapes", "soft materials"] },
      { strategy: "climb", description: "Climb milling for better finish", bestFor: ["finishing", "thin walls"] },
      { strategy: "plunge", description: "Vertical plunge roughing", bestFor: ["deep cavities", "weak machines"] },
      { strategy: "waterline", description: "Constant Z-level finishing", bestFor: ["steep walls", "3D surfaces"] },
      { strategy: "scallop", description: "Constant scallop height", bestFor: ["curved surfaces", "fillets"] },
      { strategy: "pencil", description: "Corner cleanup passes", bestFor: ["rest machining", "tight corners"] },
      { strategy: "spiral", description: "Spiral-out pattern", bestFor: ["circular features", "pockets"] },
      { strategy: "parallel", description: "Parallel passes", bestFor: ["flat surfaces", "facing"] },
      { strategy: "radial", description: "Radial passes from center", bestFor: ["circular pockets", "bosses"] },
    ];
  }

  static getSelfAwareness() {
    return {
      name: "CAMRecommendEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      capabilities: ["recommend", "recommendForOperation", "listStrategies"],
      operationTypes: ["facing", "roughing", "semi_finish", "finish", "rest_machining", "pocket", "contour", "drilling", "tapping", "boring", "reaming", "thread_milling", "chamfer", "deburr", "3d_roughing", "3d_finish"],
      strategies: ["adaptive", "trochoidal", "hsm", "conventional", "climb", "plunge", "waterline", "scallop", "pencil", "spiral", "parallel", "radial"],
      dependencies: [],
    };
  }
}

export const camRecommendEngine = new CAMRecommendEngine();
