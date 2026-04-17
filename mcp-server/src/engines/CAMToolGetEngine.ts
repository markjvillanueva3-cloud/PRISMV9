/**
 * CAMToolGetEngine — CAM Tool Data Retrieval
 * ===========================================
 *
 * Fast tool lookup and data retrieval for CAM operations
 * with caching and intelligent recommendations.
 *
 * L2-P4-MS1/P0-U03 — Batch 6: CAM Export
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ToolQuerySchema = z.object({
  toolNumber: z.number().optional(),
  toolId: z.string().optional(),
  diameter: z.number().optional(),
  type: z.string().optional(),
  operation: z.string().optional(),
  material: z.string().optional(),
});

export const ToolDataSchema = z.object({
  id: z.string(),
  number: z.number(),
  name: z.string(),
  type: z.string(),
  diameter: z.number(),
  cornerRadius: z.number().optional(),
  fluteCount: z.number(),
  fluteLength: z.number(),
  overallLength: z.number(),
  holderGauge: z.number(),
  stickout: z.number(),
  material: z.string(),
  coating: z.string(),
  recommendedRPM: z.number(),
  recommendedFeed: z.number(),
  maxStepover: z.number(),
  maxStepdown: z.number(),
  coolant: z.string(),
  notes: z.string().optional(),
});

export const ToolSelectionSchema = z.object({
  primary: ToolDataSchema,
  alternatives: z.array(z.object({
    tool: ToolDataSchema,
    reason: z.string(),
    tradeoff: z.string(),
  })),
  warnings: z.array(z.string()),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolQuery = z.infer<typeof ToolQuerySchema>;
export type ToolData = z.infer<typeof ToolDataSchema>;
export type ToolSelection = z.infer<typeof ToolSelectionSchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const toolCache: Map<number, ToolData> = new Map();
const toolIndex: Map<string, number[]> = new Map(); // type -> tool numbers

// Seed with common tools
const seedTools: ToolData[] = [
  {
    id: "T1",
    number: 1,
    name: "1/2 Carbide End Mill",
    type: "end_mill",
    diameter: 12.7,
    fluteCount: 4,
    fluteLength: 25.4,
    overallLength: 76.2,
    holderGauge: 50,
    stickout: 40,
    material: "carbide",
    coating: "TiAlN",
    recommendedRPM: 8000,
    recommendedFeed: 1500,
    maxStepover: 6.35,
    maxStepdown: 12.7,
    coolant: "flood",
  },
  {
    id: "T2",
    number: 2,
    name: "1/4 Ball Mill",
    type: "ball_mill",
    diameter: 6.35,
    cornerRadius: 3.175,
    fluteCount: 2,
    fluteLength: 12.7,
    overallLength: 50.8,
    holderGauge: 35,
    stickout: 25,
    material: "carbide",
    coating: "AlCrN",
    recommendedRPM: 15000,
    recommendedFeed: 2500,
    maxStepover: 1.5,
    maxStepdown: 3.0,
    coolant: "mist",
  },
  {
    id: "T3",
    number: 3,
    name: "1/8 Drill",
    type: "drill",
    diameter: 3.175,
    fluteCount: 2,
    fluteLength: 19.05,
    overallLength: 44.45,
    holderGauge: 30,
    stickout: 20,
    material: "carbide",
    coating: "TiN",
    recommendedRPM: 6000,
    recommendedFeed: 300,
    maxStepover: 3.175,
    maxStepdown: 9.525,
    coolant: "through_tool",
  },
  {
    id: "T4",
    number: 4,
    name: "3/4 Face Mill",
    type: "face_mill",
    diameter: 50.8,
    fluteCount: 5,
    fluteLength: 10,
    overallLength: 40,
    holderGauge: 63,
    stickout: 30,
    material: "insert",
    coating: "coated_insert",
    recommendedRPM: 3000,
    recommendedFeed: 2000,
    maxStepover: 38.1,
    maxStepdown: 3.0,
    coolant: "flood",
  },
  {
    id: "T5",
    number: 5,
    name: "1/4 Chamfer Mill",
    type: "chamfer_mill",
    diameter: 6.35,
    fluteCount: 4,
    fluteLength: 8,
    overallLength: 50,
    holderGauge: 35,
    stickout: 20,
    material: "carbide",
    coating: "TiAlN",
    recommendedRPM: 10000,
    recommendedFeed: 800,
    maxStepover: 6.35,
    maxStepdown: 3.0,
    coolant: "air",
  },
];

// Initialize cache and index
seedTools.forEach(t => {
  toolCache.set(t.number, t);
  const typeTools = toolIndex.get(t.type) || [];
  typeTools.push(t.number);
  toolIndex.set(t.type, typeTools);
});

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CAMToolGetEngine {
  /**
   * Get tool by number
   */
  static getByNumber(toolNumber: number): ToolData | undefined {
    return toolCache.get(toolNumber);
  }

  /**
   * Get tool by ID
   */
  static getById(toolId: string): ToolData | undefined {
    for (const tool of toolCache.values()) {
      if (tool.id === toolId) return tool;
    }
    return undefined;
  }

  /**
   * Query tools with filters
   */
  static query(q: ToolQuery): ToolData[] {
    let results = Array.from(toolCache.values());

    if (q.toolNumber !== undefined) {
      const tool = toolCache.get(q.toolNumber);
      return tool ? [tool] : [];
    }

    if (q.toolId !== undefined) {
      const tool = this.getById(q.toolId);
      return tool ? [tool] : [];
    }

    if (q.type) {
      results = results.filter(t => t.type === q.type);
    }

    if (q.diameter !== undefined) {
      // Find closest diameter
      results = results.filter(t =>
        Math.abs(t.diameter - q.diameter!) <= t.diameter * 0.1
      );
    }

    return results;
  }

  /**
   * Select best tool for operation
   */
  static selectForOperation(
    operation: string,
    material: string,
    featureSize?: number
  ): ToolSelection {
    const warnings: string[] = [];
    let candidates: ToolData[] = [];

    // Map operation to tool types
    const operationToolTypes: Record<string, string[]> = {
      roughing: ["end_mill", "face_mill"],
      finishing: ["end_mill", "ball_mill"],
      facing: ["face_mill", "end_mill"],
      drilling: ["drill"],
      chamfering: ["chamfer_mill"],
      contouring: ["end_mill", "ball_mill"],
      pocketing: ["end_mill"],
      "3d_finish": ["ball_mill"],
    };

    const preferredTypes = operationToolTypes[operation.toLowerCase()] || ["end_mill"];

    for (const type of preferredTypes) {
      const typeTools = toolIndex.get(type) || [];
      for (const num of typeTools) {
        const tool = toolCache.get(num);
        if (tool) candidates.push(tool);
      }
    }

    if (candidates.length === 0) {
      // Fallback to any end mill
      candidates = Array.from(toolCache.values()).filter(t => t.type === "end_mill");
    }

    // Sort by suitability
    if (featureSize) {
      candidates.sort((a, b) => {
        const aFit = Math.abs(a.diameter - featureSize * 0.6);
        const bFit = Math.abs(b.diameter - featureSize * 0.6);
        return aFit - bFit;
      });
    }

    // Apply material adjustments
    const primary = { ...candidates[0] };
    if (material.toLowerCase().includes("steel")) {
      primary.recommendedRPM = Math.round(primary.recommendedRPM * 0.7);
      primary.recommendedFeed = Math.round(primary.recommendedFeed * 0.6);
    } else if (material.toLowerCase().includes("aluminum")) {
      primary.recommendedRPM = Math.round(primary.recommendedRPM * 1.2);
      primary.recommendedFeed = Math.round(primary.recommendedFeed * 1.3);
    } else if (material.toLowerCase().includes("titanium")) {
      primary.recommendedRPM = Math.round(primary.recommendedRPM * 0.4);
      primary.recommendedFeed = Math.round(primary.recommendedFeed * 0.3);
      warnings.push("Titanium requires through-tool coolant and low engagement");
    }

    const alternatives = candidates.slice(1, 4).map(tool => ({
      tool,
      reason: tool.diameter !== primary.diameter ? "Different diameter" : "Alternative coating",
      tradeoff: tool.diameter > primary.diameter ? "Faster but less detail" : "More detail but slower",
    }));

    return {
      primary,
      alternatives,
      warnings,
    };
  }

  /**
   * Get all tools in magazine
   */
  static getMagazine(): ToolData[] {
    return Array.from(toolCache.values()).sort((a, b) => a.number - b.number);
  }

  /**
   * Register a new tool
   */
  static registerTool(tool: ToolData): void {
    toolCache.set(tool.number, tool);
    const typeTools = toolIndex.get(tool.type) || [];
    if (!typeTools.includes(tool.number)) {
      typeTools.push(tool.number);
      toolIndex.set(tool.type, typeTools);
    }
  }

  /**
   * Get tool count by type
   */
  static getToolCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const [type, numbers] of toolIndex) {
      counts[type] = numbers.length;
    }
    return counts;
  }

  /**
   * Find replacement tool
   */
  static findReplacement(brokenToolNumber: number): ToolData | undefined {
    const broken = toolCache.get(brokenToolNumber);
    if (!broken) return undefined;

    // Find same type with closest diameter
    const sameType = Array.from(toolCache.values())
      .filter(t => t.type === broken.type && t.number !== brokenToolNumber)
      .sort((a, b) =>
        Math.abs(a.diameter - broken.diameter) - Math.abs(b.diameter - broken.diameter)
      );

    return sameType[0];
  }

  static getSelfAwareness() {
    return {
      name: "CAMToolGetEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      capabilities: ["getByNumber", "getById", "query", "selectForOperation", "getMagazine", "registerTool", "getToolCounts", "findReplacement"],
      toolsInCache: toolCache.size,
      toolTypes: Array.from(toolIndex.keys()),
      dependencies: [],
    };
  }
}

export const camToolGetEngine = new CAMToolGetEngine();
