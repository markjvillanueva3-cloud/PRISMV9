/**
 * CAMToolLibraryEngine — CAM Tool Library Management
 * ===================================================
 *
 * Manages tool libraries for CAM systems with standardized
 * tool definitions and parameter recommendations.
 *
 * L2-P4-MS1/P0-U03 — Batch 6: CAM Export
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const ToolTypeSchema = z.enum([
  "end_mill", "ball_mill", "bull_mill", "face_mill", "drill", "tap",
  "reamer", "boring_bar", "insert_mill", "chamfer_mill", "thread_mill",
  "slot_drill", "lollipop", "dovetail", "woodruff"
]);

export const ToolMaterialSchema = z.enum([
  "hss", "cobalt", "carbide", "ceramic", "cbn", "pcd", "diamond"
]);

export const ToolCoatingSchema = z.enum([
  "none", "tin", "ticn", "tialn", "alcrn", "diamond", "dlc", "zrn"
]);

export const CAMToolSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  type: ToolTypeSchema,
  material: ToolMaterialSchema,
  coating: ToolCoatingSchema,
  geometry: z.object({
    diameter: z.number(),
    cornerRadius: z.number().optional(),
    fluteLength: z.number(),
    overallLength: z.number(),
    shankDiameter: z.number(),
    fluteCount: z.number(),
    helixAngle: z.number().optional(),
    rakeAngle: z.number().optional(),
  }),
  holder: z.object({
    type: z.string(),
    gauge: z.number(),
    stickout: z.number(),
  }).optional(),
  speeds: z.object({
    minRPM: z.number(),
    maxRPM: z.number(),
    recommendedRPM: z.number(),
  }),
  feeds: z.object({
    minFeed: z.number(),
    maxFeed: z.number(),
    recommendedFeed: z.number(),
    plungeFeed: z.number(),
  }),
  limits: z.object({
    maxStepover: z.number(),
    maxStepdown: z.number(),
    minChipload: z.number(),
    maxChipload: z.number(),
  }),
  materials: z.array(z.string()),
  vendor: z.string().optional(),
  partNumber: z.string().optional(),
  cost: z.number().optional(),
  lifeExpectancy: z.number().optional(),
});

export const ToolLibrarySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  camSystem: z.string().optional(),
  tools: z.array(CAMToolSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToolType = z.infer<typeof ToolTypeSchema>;
export type ToolMaterial = z.infer<typeof ToolMaterialSchema>;
export type ToolCoating = z.infer<typeof ToolCoatingSchema>;
export type CAMTool = z.infer<typeof CAMToolSchema>;
export type ToolLibrary = z.infer<typeof ToolLibrarySchema>;

// ─── Data Store ───────────────────────────────────────────────────────────────

const toolLibraries: Map<string, ToolLibrary> = new Map();
const tools: Map<string, CAMTool> = new Map();
let toolCounter = 1;
let libraryCounter = 1;

// Seed with common tools
const seedTools: CAMTool[] = [
  {
    id: "TOOL-001",
    name: "1/2\" 4-Flute Carbide End Mill",
    type: "end_mill",
    material: "carbide",
    coating: "tialn",
    geometry: {
      diameter: 12.7,
      fluteLength: 25.4,
      overallLength: 76.2,
      shankDiameter: 12.7,
      fluteCount: 4,
      helixAngle: 35,
    },
    speeds: { minRPM: 3000, maxRPM: 12000, recommendedRPM: 8000 },
    feeds: { minFeed: 500, maxFeed: 3000, recommendedFeed: 1500, plungeFeed: 500 },
    limits: { maxStepover: 6.35, maxStepdown: 12.7, minChipload: 0.05, maxChipload: 0.15 },
    materials: ["aluminum", "steel", "stainless"],
    vendor: "Kennametal",
    partNumber: "K2050500",
  },
  {
    id: "TOOL-002",
    name: "1/4\" 2-Flute Ball Mill",
    type: "ball_mill",
    material: "carbide",
    coating: "alcrn",
    geometry: {
      diameter: 6.35,
      cornerRadius: 3.175,
      fluteLength: 12.7,
      overallLength: 50.8,
      shankDiameter: 6.35,
      fluteCount: 2,
      helixAngle: 30,
    },
    speeds: { minRPM: 6000, maxRPM: 20000, recommendedRPM: 15000 },
    feeds: { minFeed: 800, maxFeed: 4000, recommendedFeed: 2500, plungeFeed: 400 },
    limits: { maxStepover: 1.5, maxStepdown: 3.0, minChipload: 0.02, maxChipload: 0.08 },
    materials: ["aluminum", "steel", "titanium"],
    vendor: "Harvey Tool",
    partNumber: "HT-BN250-2",
  },
];

seedTools.forEach(t => tools.set(t.id, t));

// ─── Engine ───────────────────────────────────────────────────────────────────

export class CAMToolLibraryEngine {
  /**
   * Create a new tool library
   */
  static createLibrary(name: string, description?: string, camSystem?: string): ToolLibrary {
    const library: ToolLibrary = {
      id: `LIB-${++libraryCounter}`,
      name,
      description,
      camSystem,
      tools: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    toolLibraries.set(library.id, library);
    return library;
  }

  /**
   * Add tool to library
   */
  static addToolToLibrary(libraryId: string, tool: Omit<CAMTool, "id">): CAMTool | undefined {
    const library = toolLibraries.get(libraryId);
    if (!library) return undefined;

    const newTool: CAMTool = {
      ...tool,
      id: `TOOL-${++toolCounter}`,
    };

    library.tools.push(newTool);
    library.updatedAt = new Date().toISOString();
    tools.set(newTool.id, newTool);
    toolLibraries.set(libraryId, library);

    return newTool;
  }

  /**
   * Get tool by ID
   */
  static getTool(id: string): CAMTool | undefined {
    return tools.get(id);
  }

  /**
   * Search tools
   */
  static searchTools(query: {
    type?: ToolType;
    material?: ToolMaterial;
    minDiameter?: number;
    maxDiameter?: number;
    targetMaterial?: string;
  }): CAMTool[] {
    let results = Array.from(tools.values());

    if (query.type) {
      results = results.filter(t => t.type === query.type);
    }
    if (query.material) {
      results = results.filter(t => t.material === query.material);
    }
    if (query.minDiameter !== undefined) {
      results = results.filter(t => t.geometry.diameter >= query.minDiameter!);
    }
    if (query.maxDiameter !== undefined) {
      results = results.filter(t => t.geometry.diameter <= query.maxDiameter!);
    }
    if (query.targetMaterial) {
      results = results.filter(t =>
        t.materials.some(m => m.toLowerCase().includes(query.targetMaterial!.toLowerCase()))
      );
    }

    return results;
  }

  /**
   * Get recommended parameters for tool and material
   */
  static getRecommendedParams(toolId: string, material: string): {
    rpm: number;
    feed: number;
    stepover: number;
    stepdown: number;
    chipload: number;
  } | undefined {
    const tool = tools.get(toolId);
    if (!tool) return undefined;

    // Material-specific adjustments
    let rpmFactor = 1.0;
    let feedFactor = 1.0;
    let stepFactor = 1.0;

    switch (material.toLowerCase()) {
      case "aluminum":
        rpmFactor = 1.2;
        feedFactor = 1.3;
        stepFactor = 1.0;
        break;
      case "steel":
        rpmFactor = 0.8;
        feedFactor = 0.7;
        stepFactor = 0.8;
        break;
      case "stainless":
        rpmFactor = 0.6;
        feedFactor = 0.5;
        stepFactor = 0.6;
        break;
      case "titanium":
        rpmFactor = 0.4;
        feedFactor = 0.3;
        stepFactor = 0.5;
        break;
      case "hardened":
        rpmFactor = 0.3;
        feedFactor = 0.2;
        stepFactor = 0.3;
        break;
    }

    const rpm = Math.round(tool.speeds.recommendedRPM * rpmFactor);
    const chipload = (tool.limits.minChipload + tool.limits.maxChipload) / 2;
    const feed = Math.round(rpm * tool.geometry.fluteCount * chipload * feedFactor);

    return {
      rpm,
      feed,
      stepover: Math.round(tool.limits.maxStepover * stepFactor * 100) / 100,
      stepdown: Math.round(tool.limits.maxStepdown * stepFactor * 100) / 100,
      chipload: Math.round(chipload * 1000) / 1000,
    };
  }

  /**
   * Export library to CAM format
   */
  static exportLibrary(libraryId: string, format: "json" | "csv" | "xml"): string | undefined {
    const library = toolLibraries.get(libraryId);
    if (!library) return undefined;

    switch (format) {
      case "json":
        return JSON.stringify(library, null, 2);
      case "csv": {
        const headers = "ID,Name,Type,Material,Diameter,FluteLength,FluteCount,RPM,Feed\n";
        const rows = library.tools.map(t =>
          `${t.id},"${t.name}",${t.type},${t.material},${t.geometry.diameter},${t.geometry.fluteLength},${t.geometry.fluteCount},${t.speeds.recommendedRPM},${t.feeds.recommendedFeed}`
        ).join("\n");
        return headers + rows;
      }
      case "xml": {
        const toolsXml = library.tools.map(t => `
    <Tool id="${t.id}" type="${t.type}">
      <Name>${t.name}</Name>
      <Diameter>${t.geometry.diameter}</Diameter>
      <FluteCount>${t.geometry.fluteCount}</FluteCount>
      <Speed>${t.speeds.recommendedRPM}</Speed>
      <Feed>${t.feeds.recommendedFeed}</Feed>
    </Tool>`).join("");
        return `<?xml version="1.0"?>\n<ToolLibrary name="${library.name}">${toolsXml}\n</ToolLibrary>`;
      }
    }
  }

  /**
   * Get library by ID
   */
  static getLibrary(id: string): ToolLibrary | undefined {
    return toolLibraries.get(id);
  }

  /**
   * List all libraries
   */
  static listLibraries(): ToolLibrary[] {
    return Array.from(toolLibraries.values());
  }

  /**
   * Get all tools (standalone)
   */
  static getAllTools(): CAMTool[] {
    return Array.from(tools.values());
  }

  static getSelfAwareness() {
    return {
      name: "CAMToolLibraryEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U03",
      capabilities: ["createLibrary", "addToolToLibrary", "getTool", "searchTools", "getRecommendedParams", "exportLibrary", "getLibrary", "listLibraries", "getAllTools"],
      toolTypes: ["end_mill", "ball_mill", "bull_mill", "face_mill", "drill", "tap", "reamer", "boring_bar", "insert_mill", "chamfer_mill", "thread_mill", "slot_drill", "lollipop", "dovetail", "woodruff"],
      toolMaterials: ["hss", "cobalt", "carbide", "ceramic", "cbn", "pcd", "diamond"],
      toolCount: tools.size,
      dependencies: [],
    };
  }
}

export const camToolLibraryEngine = new CAMToolLibraryEngine();
