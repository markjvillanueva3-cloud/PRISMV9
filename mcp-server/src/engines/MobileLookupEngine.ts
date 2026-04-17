/**
 * MobileLookupEngine — Mobile Reference Data Lookup
 * ==================================================
 *
 * Provides quick mobile access to reference data: materials,
 * tools, machines, speeds/feeds, and G/M codes.
 *
 * L2-P4-MS1/P0-U01 — Batch 2: Mobile Field Engines
 *
 * @version 1.0.0
 */

import { z } from "zod";

// ─── Schemas ──────────────────────────────────────────────────────────────────

export const MaterialLookupSchema = z.object({
  code: z.string(),
  name: z.string(),
  category: z.string(),
  hardnessHRC: z.number().optional(),
  machinability: z.number(),
  recommendedSpeed: z.number(),
  recommendedFeed: z.number(),
  notes: z.string().optional(),
});

export const ToolLookupSchema = z.object({
  toolId: z.string(),
  description: z.string(),
  type: z.string(),
  diameter: z.number(),
  length: z.number(),
  material: z.string(),
  coating: z.string().optional(),
  flutes: z.number().optional(),
  location: z.string(),
  quantity: z.number(),
});

export const GCodeLookupSchema = z.object({
  code: z.string(),
  description: z.string(),
  syntax: z.string(),
  example: z.string(),
  controller: z.string(),
  notes: z.string().optional(),
});

export const SpeedFeedLookupSchema = z.object({
  material: z.string(),
  toolType: z.string(),
  operation: z.string(),
  surfaceSpeed: z.number(),
  feedPerTooth: z.number(),
  depthOfCut: z.number(),
  widthOfCut: z.number().optional(),
  coolant: z.string(),
});

export const LookupQuerySchema = z.object({
  type: z.enum(["material", "tool", "gcode", "speedfeed", "machine"]),
  query: z.string(),
  controller: z.string().optional(),
  limit: z.number().default(10),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type MaterialLookup = z.infer<typeof MaterialLookupSchema>;
export type ToolLookup = z.infer<typeof ToolLookupSchema>;
export type GCodeLookup = z.infer<typeof GCodeLookupSchema>;
export type SpeedFeedLookup = z.infer<typeof SpeedFeedLookupSchema>;
export type LookupQuery = z.infer<typeof LookupQuerySchema>;

// ─── Reference Data ───────────────────────────────────────────────────────────

const materials: MaterialLookup[] = [
  { code: "4140", name: "4140 Steel", category: "alloy_steel", hardnessHRC: 28, machinability: 65, recommendedSpeed: 300, recommendedFeed: 0.008, notes: "Common die steel" },
  { code: "D2", name: "D2 Tool Steel", category: "tool_steel", hardnessHRC: 60, machinability: 35, recommendedSpeed: 150, recommendedFeed: 0.004, notes: "High wear resistance" },
  { code: "M2", name: "M2 HSS", category: "hss", hardnessHRC: 64, machinability: 30, recommendedSpeed: 120, recommendedFeed: 0.003, notes: "High speed steel" },
  { code: "S7", name: "S7 Shock Steel", category: "tool_steel", hardnessHRC: 56, machinability: 45, recommendedSpeed: 180, recommendedFeed: 0.005, notes: "Impact resistant" },
  { code: "6061", name: "6061-T6 Aluminum", category: "aluminum", machinability: 90, recommendedSpeed: 800, recommendedFeed: 0.015, notes: "Common aluminum alloy" },
  { code: "TC", name: "Tungsten Carbide", category: "carbide", hardnessHRC: 85, machinability: 15, recommendedSpeed: 60, recommendedFeed: 0.002, notes: "Wire EDM recommended" },
];

const tools: ToolLookup[] = [
  { toolId: "EM-0500-4FL", description: "1/2\" 4-Flute Carbide End Mill", type: "end_mill", diameter: 0.5, length: 3, material: "carbide", coating: "TiAlN", flutes: 4, location: "Crib-A-12", quantity: 8 },
  { toolId: "EM-0250-2FL", description: "1/4\" 2-Flute Carbide End Mill", type: "end_mill", diameter: 0.25, length: 2, material: "carbide", coating: "TiAlN", flutes: 2, location: "Crib-A-15", quantity: 12 },
  { toolId: "DR-0312", description: "5/16\" Carbide Drill", type: "drill", diameter: 0.3125, length: 4, material: "carbide", coating: "TiN", location: "Crib-B-03", quantity: 6 },
  { toolId: "INS-CNMG", description: "CNMG 432 Insert", type: "insert", diameter: 0.5, length: 0.187, material: "carbide", coating: "CVD", location: "Crib-C-08", quantity: 50 },
  { toolId: "TAP-0375", description: "3/8-16 Spiral Flute Tap", type: "tap", diameter: 0.375, length: 2.5, material: "hss", coating: "TiN", location: "Crib-D-01", quantity: 4 },
];

const gcodes: GCodeLookup[] = [
  { code: "G00", description: "Rapid positioning", syntax: "G00 X_ Y_ Z_", example: "G00 X1.0 Y2.0 Z0.1", controller: "universal", notes: "Non-cutting move" },
  { code: "G01", description: "Linear interpolation", syntax: "G01 X_ Y_ Z_ F_", example: "G01 X1.0 Y2.0 F10.0", controller: "universal" },
  { code: "G02", description: "CW circular interpolation", syntax: "G02 X_ Y_ I_ J_ F_", example: "G02 X1.0 Y0 I0.5 J0 F8.0", controller: "universal" },
  { code: "G03", description: "CCW circular interpolation", syntax: "G03 X_ Y_ I_ J_ F_", example: "G03 X1.0 Y0 I0.5 J0 F8.0", controller: "universal" },
  { code: "G28", description: "Return to machine home", syntax: "G28 [U_ V_ W_]", example: "G28 U0 W0", controller: "fanuc" },
  { code: "G41", description: "Cutter compensation left", syntax: "G41 D_ X_ Y_", example: "G41 D01 X1.0 Y0.5", controller: "universal" },
  { code: "G43", description: "Tool length compensation", syntax: "G43 H_ Z_", example: "G43 H01 Z1.0", controller: "universal" },
  { code: "G54", description: "Work coordinate system 1", syntax: "G54", example: "G54", controller: "universal", notes: "First WCS" },
  { code: "G76", description: "Threading cycle", syntax: "G76 P_ Q_ R_ [X_ Z_ I_ K_ D_ F_ A_]", example: "G76 P010060 Q100 R100", controller: "fanuc", notes: "Multi-pass threading" },
  { code: "M03", description: "Spindle on CW", syntax: "M03 S_", example: "M03 S3000", controller: "universal" },
  { code: "M05", description: "Spindle stop", syntax: "M05", example: "M05", controller: "universal" },
  { code: "M06", description: "Tool change", syntax: "M06 T_", example: "M06 T01", controller: "universal" },
  { code: "M08", description: "Coolant on", syntax: "M08", example: "M08", controller: "universal" },
];

const speedFeeds: SpeedFeedLookup[] = [
  { material: "4140", toolType: "carbide_endmill", operation: "roughing", surfaceSpeed: 350, feedPerTooth: 0.006, depthOfCut: 0.25, widthOfCut: 0.3, coolant: "flood" },
  { material: "4140", toolType: "carbide_endmill", operation: "finishing", surfaceSpeed: 450, feedPerTooth: 0.003, depthOfCut: 0.02, widthOfCut: 0.5, coolant: "flood" },
  { material: "D2", toolType: "carbide_endmill", operation: "roughing", surfaceSpeed: 180, feedPerTooth: 0.003, depthOfCut: 0.1, widthOfCut: 0.25, coolant: "flood" },
  { material: "6061", toolType: "carbide_endmill", operation: "roughing", surfaceSpeed: 1000, feedPerTooth: 0.012, depthOfCut: 0.5, widthOfCut: 0.5, coolant: "flood" },
  { material: "6061", toolType: "carbide_endmill", operation: "finishing", surfaceSpeed: 1200, feedPerTooth: 0.006, depthOfCut: 0.03, widthOfCut: 0.5, coolant: "mist" },
];

// ─── Engine ───────────────────────────────────────────────────────────────────

export class MobileLookupEngine {
  /**
   * Search for materials
   * @param query - Search term
   * @param limit - Maximum results
   * @returns Matching materials
   */
  static searchMaterials(query: string, limit: number = 10): MaterialLookup[] {
    const q = query.toLowerCase();
    return materials
      .filter(m => m.code.toLowerCase().includes(q) || m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
      .slice(0, limit);
  }

  /**
   * Search for tools
   * @param query - Search term
   * @param limit - Maximum results
   * @returns Matching tools
   */
  static searchTools(query: string, limit: number = 10): ToolLookup[] {
    const q = query.toLowerCase();
    return tools
      .filter(t => t.toolId.toLowerCase().includes(q) || t.description.toLowerCase().includes(q) || t.type.toLowerCase().includes(q))
      .slice(0, limit);
  }

  /**
   * Search for G/M codes
   * @param query - Search term
   * @param controller - Optional controller filter
   * @param limit - Maximum results
   * @returns Matching codes
   */
  static searchGCodes(query: string, controller?: string, limit: number = 10): GCodeLookup[] {
    const q = query.toLowerCase();
    let results = gcodes.filter(g => g.code.toLowerCase().includes(q) || g.description.toLowerCase().includes(q));

    if (controller) {
      results = results.filter(g => g.controller === "universal" || g.controller === controller);
    }

    return results.slice(0, limit);
  }

  /**
   * Get speed/feed recommendations
   * @param material - Material code
   * @param operation - Operation type
   * @returns Speed/feed recommendations
   */
  static getSpeedFeed(material: string, operation?: string): SpeedFeedLookup[] {
    let results = speedFeeds.filter(sf => sf.material.toLowerCase() === material.toLowerCase());
    if (operation) {
      results = results.filter(sf => sf.operation === operation);
    }
    return results;
  }

  /**
   * Universal search across all reference data
   * @param query - Search query
   * @returns Combined search results
   */
  static universalSearch(query: LookupQuery): {
    materials: MaterialLookup[];
    tools: ToolLookup[];
    gcodes: GCodeLookup[];
    speedFeeds: SpeedFeedLookup[];
  } {
    const validated = LookupQuerySchema.parse(query);
    const q = validated.query;

    switch (validated.type) {
      case "material":
        return { materials: this.searchMaterials(q, validated.limit), tools: [], gcodes: [], speedFeeds: [] };
      case "tool":
        return { materials: [], tools: this.searchTools(q, validated.limit), gcodes: [], speedFeeds: [] };
      case "gcode":
        return { materials: [], tools: [], gcodes: this.searchGCodes(q, validated.controller, validated.limit), speedFeeds: [] };
      case "speedfeed":
        return { materials: [], tools: [], gcodes: [], speedFeeds: this.getSpeedFeed(q) };
      default:
        return {
          materials: this.searchMaterials(q, 3),
          tools: this.searchTools(q, 3),
          gcodes: this.searchGCodes(q, undefined, 3),
          speedFeeds: this.getSpeedFeed(q),
        };
    }
  }

  /**
   * Get material by exact code
   * @param code - Material code
   * @returns Material or undefined
   */
  static getMaterial(code: string): MaterialLookup | undefined {
    return materials.find(m => m.code.toLowerCase() === code.toLowerCase());
  }

  /**
   * Get tool by ID
   * @param toolId - Tool identifier
   * @returns Tool or undefined
   */
  static getTool(toolId: string): ToolLookup | undefined {
    return tools.find(t => t.toolId.toLowerCase() === toolId.toLowerCase());
  }

  /**
   * Get G-code by code
   * @param code - G/M code
   * @returns Code definition or undefined
   */
  static getGCode(code: string): GCodeLookup | undefined {
    return gcodes.find(g => g.code.toLowerCase() === code.toLowerCase());
  }

  static getSelfAwareness() {
    return {
      name: "MobileLookupEngine",
      version: "1.0.0",
      milestone: "L2-P4-MS1/P0-U01",
      capabilities: ["searchMaterials", "searchTools", "searchGCodes", "getSpeedFeed", "universalSearch", "getMaterial", "getTool", "getGCode"],
      dependencies: [],
      dataSize: { materials: materials.length, tools: tools.length, gcodes: gcodes.length, speedFeeds: speedFeeds.length },
    };
  }
}

export const mobileLookupEngine = new MobileLookupEngine();
