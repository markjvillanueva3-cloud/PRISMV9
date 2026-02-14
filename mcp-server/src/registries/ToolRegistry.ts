/**
 * PRISM MCP Server - Tool Registry
 * Complete access to 500+ cutting tools × 85 parameters
 */

import * as fs from "fs/promises";
import * as path from "path";
import { BaseRegistry } from "./base.js";
import { PATHS, TOOL_TYPES, TOOL_COATINGS, ISO_MATERIAL_GROUPS } from "../constants.js";
import { log } from "../utils/Logger.js";
import { readJsonFile, fileExists, listDirectory } from "../utils/files.js";

// ============================================================================
// TOOL TYPES
// ============================================================================

export interface ToolGeometry {
  // Basic dimensions
  diameter: number;             // mm
  overall_length: number;       // mm
  flute_length: number;         // mm
  shank_diameter: number;       // mm
  
  // Cutting geometry
  flutes: number;
  helix_angle: number;          // degrees
  rake_angle: number;           // degrees
  relief_angle: number;         // degrees
  
  // Advanced geometry
  corner_radius?: number;       // mm
  chamfer_angle?: number;       // degrees
  taper_angle?: number;         // degrees/side
  point_angle?: number;         // degrees (for drills)
  
  // Edge preparation
  edge_preparation?: "sharp" | "honed" | "chamfered" | "radiused";
  edge_radius?: number;         // µm
  
  // Chip breaking
  chip_breaker?: string;
  chip_breaker_width?: number;
  chip_breaker_depth?: number;
}

export interface ToolCoating {
  type: string;                 // TiN, TiAlN, AlTiN, DLC, etc.
  thickness: number;            // µm
  hardness: number;             // HV
  max_temperature: number;      // °C
  friction_coefficient: number;
  color: string;
  multi_layer?: boolean;
  layer_count?: number;
}

export interface ToolPerformance {
  // Recommended parameters by ISO material group
  recommendations: Record<string, {
    speed_sfm: { min: number; max: number };
    feed_ipt: { min: number; max: number };
    doc_max: number;            // mm
    woc_max: number;            // mm
    coolant: "flood" | "mist" | "air" | "none" | "through_tool";
  }>;
  
  // Tool life
  expected_life_minutes: number;
  wear_pattern: string;
  
  // Limits
  max_speed_sfm: number;
  max_feed_ipt: number;
  max_radial_engagement: number;  // %
  max_axial_engagement: number;   // %
  
  // Quality
  achievable_surface_finish: number;  // Ra in µm
  achievable_tolerance: string;       // e.g., "IT8"
}

export interface ToolHolder {
  interface: string;            // BT40, CAT50, HSK-A63, etc.
  gauge_length: number;         // mm from spindle face
  overhang: number;             // mm beyond holder
  balance_grade: string;        // e.g., "G2.5 @ 25000 RPM"
  max_rpm: number;
  pullout_force: number;        // N
}

export interface CuttingTool {
  id: string;
  name: string;
  type: string;                 // endmill, drill, face_mill, insert, etc.
  manufacturer: string;
  catalog_number: string;
  
  // Material & coating
  substrate: string;            // carbide, HSS, ceramic, PCD, CBN
  grade: string;                // manufacturer's grade
  coating?: ToolCoating;
  
  // Geometry
  geometry: ToolGeometry;
  
  // Performance
  performance: ToolPerformance;
  
  // Compatibility
  material_groups: string[];    // ISO groups this tool works with
  application: string[];        // roughing, finishing, profiling, etc.
  
  // Holder (if integrated)
  holder?: ToolHolder;
  
  // Metadata
  layer?: string;
  price?: number;               // USD
  availability?: string;
  last_updated?: string;
}

// ============================================================================
// TOOL REGISTRY CLASS
// ============================================================================

export class ToolRegistry extends BaseRegistry<CuttingTool> {
  private indexByType: Map<string, Set<string>> = new Map();
  private indexByManufacturer: Map<string, Set<string>> = new Map();
  private indexByMaterialGroup: Map<string, Set<string>> = new Map();
  private indexByDiameter: Map<number, Set<string>> = new Map();
  
  constructor() {
    super(
      "ToolRegistry",
      path.join(PATHS.STATE_DIR, "tool_registry_cache.json"),
      "1.0.0"
    );
  }

  /**
   * Load tools from database
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading ToolRegistry...");
    
    await this.loadFromPath(PATHS.TOOLS_DB);
    this.buildIndexes();
    
    this.loaded = true;
    log.info(`ToolRegistry loaded: ${this.entries.size} tools`);
  }

  /**
   * Load tools from a path
   */
  private async loadFromPath(basePath: string): Promise<void> {
    try {
      if (!await fileExists(basePath)) {
        log.debug(`Tools path does not exist: ${basePath}`);
        return;
      }
      
      const files = await listDirectory(basePath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json"));
      
      for (const file of jsonFiles) {
        try {
          const filePath = file.path;
          const data = await readJsonFile<CuttingTool | CuttingTool[]>(filePath);
          
          const tools = Array.isArray(data) ? data : [data];
          
          for (const tool of tools) {
            if (tool.id) {
              this.set(tool.id, tool);
            }
          }
        } catch (err) {
          log.warn(`Failed to load tool file ${file}: ${err}`);
        }
      }
    } catch (err) {
      log.warn(`Failed to load tools: ${err}`);
    }
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByType.clear();
    this.indexByManufacturer.clear();
    this.indexByMaterialGroup.clear();
    this.indexByDiameter.clear();
    
    for (const [id, entry] of this.entries) {
      const tool = entry.data;
      
      // Index by type
      if (tool.type) {
        const type = tool.type.toLowerCase();
        if (!this.indexByType.has(type)) {
          this.indexByType.set(type, new Set());
        }
        this.indexByType.get(type)?.add(id);
      }
      
      // Index by manufacturer
      if (tool.manufacturer) {
        const mfr = tool.manufacturer.toLowerCase();
        if (!this.indexByManufacturer.has(mfr)) {
          this.indexByManufacturer.set(mfr, new Set());
        }
        this.indexByManufacturer.get(mfr)?.add(id);
      }
      
      // Index by material group
      if (tool.material_groups) {
        for (const group of tool.material_groups) {
          if (!this.indexByMaterialGroup.has(group)) {
            this.indexByMaterialGroup.set(group, new Set());
          }
          this.indexByMaterialGroup.get(group)?.add(id);
        }
      }
      
      // Index by diameter (rounded to nearest 0.5mm)
      if (tool.geometry?.diameter) {
        const d = Math.round(tool.geometry.diameter * 2) / 2;
        if (!this.indexByDiameter.has(d)) {
          this.indexByDiameter.set(d, new Set());
        }
        this.indexByDiameter.get(d)?.add(id);
      }
    }
  }

  /**
   * Get tool by ID
   */
  getTool(id: string): CuttingTool | undefined {
    return this.get(id);
  }

  /**
   * Get tool by ID or catalog number
   */
  async getByIdOrCatalog(identifier: string): Promise<CuttingTool | undefined> {
    await this.load();
    
    // Try direct ID lookup
    let tool = this.get(identifier);
    if (tool) return tool;
    
    // Try catalog number lookup
    const lower = identifier.toLowerCase();
    for (const entry of this.entries.values()) {
      const t = entry.data;
      if (t.catalog_number?.toLowerCase() === lower) {
        return t;
      }
    }
    
    // Try partial match
    for (const entry of this.entries.values()) {
      const t = entry.data;
      if (t.catalog_number?.toLowerCase().includes(lower) ||
          t.name?.toLowerCase().includes(lower)) {
        return t;
      }
    }
    
    return undefined;
  }

  /**
   * Get tool by catalog number
   */
  getByCatalogNumber(catalogNumber: string): CuttingTool | undefined {
    for (const tool of this.all()) {
      if (tool.catalog_number.toLowerCase() === catalogNumber.toLowerCase()) {
        return tool;
      }
    }
    return undefined;
  }

  /**
   * Search tools with filters
   */
  search(options: {
    query?: string;
    type?: string;
    manufacturer?: string;
    material_group?: string;
    diameter_min?: number;
    diameter_max?: number;
    diameter_exact?: number;
    flutes?: number;
    coating?: string;
    substrate?: string;
    application?: string;
    limit?: number;
    offset?: number;
  }): { tools: CuttingTool[]; total: number } {
    let results: CuttingTool[] = [];
    
    // Start with most selective filter
    if (options.diameter_exact !== undefined) {
      const d = Math.round(options.diameter_exact * 2) / 2;
      const ids = this.indexByDiameter.get(d);
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else if (options.type) {
      const ids = this.indexByType.get(options.type.toLowerCase());
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else if (options.material_group) {
      const ids = this.indexByMaterialGroup.get(options.material_group);
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else if (options.manufacturer) {
      const ids = this.indexByManufacturer.get(options.manufacturer.toLowerCase());
      if (ids) {
        results = Array.from(ids).map(id => this.get(id)!).filter(Boolean);
      }
    } else {
      results = this.all();
    }
    
    // Apply additional filters
    if (options.query) {
      const query = options.query.toLowerCase();
      results = results.filter(t => {
        try {
          return String(t.name || "").toLowerCase().includes(query) ||
            String(t.catalog_number || "").toLowerCase().includes(query) ||
            String(t.manufacturer || "").toLowerCase().includes(query);
        } catch { return false; }
      });
    }
    
    if (options.diameter_min !== undefined) {
      results = results.filter(t => t.geometry.diameter >= options.diameter_min!);
    }
    
    if (options.diameter_max !== undefined) {
      results = results.filter(t => t.geometry.diameter <= options.diameter_max!);
    }
    
    if (options.flutes !== undefined) {
      results = results.filter(t => t.geometry.flutes === options.flutes);
    }
    
    if (options.coating) {
      results = results.filter(t => 
        t.coating?.type.toLowerCase().includes(options.coating!.toLowerCase())
      );
    }
    
    if (options.substrate) {
      results = results.filter(t => 
        (t.substrate || "").toLowerCase().includes(options.substrate!.toLowerCase())
      );
    }
    
    if (options.application) {
      results = results.filter(t => 
        t.application?.some(a => a.toLowerCase().includes(options.application!.toLowerCase()))
      );
    }
    
    const total = results.length;
    
    // Pagination
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return { tools: paged, total, hasMore: offset + paged.length < total };
  }

  /**
   * Recommend tools for a material and operation
   */
  recommendTools(options: {
    material_iso_group: string;
    operation: string;          // roughing, finishing, profiling, drilling, etc.
    diameter_target?: number;
    max_results?: number;
  }): CuttingTool[] {
    const maxResults = options.max_results || 10;
    
    // Get tools compatible with material
    const compatibleIds = this.indexByMaterialGroup.get(options.material_iso_group);
    if (!compatibleIds) return [];
    
    let candidates = Array.from(compatibleIds)
      .map(id => this.get(id)!)
      .filter(Boolean);
    
    // Filter by application
    candidates = candidates.filter(t => 
      t.application?.some(a => a.toLowerCase().includes(options.operation.toLowerCase()))
    );
    
    // Score and sort
    const scored = candidates.map(tool => ({
      tool,
      score: this.scoreToolForOperation(tool, options)
    })).sort((a, b) => b.score - a.score);
    
    return scored.slice(0, maxResults).map(s => s.tool);
  }

  /**
   * Score tool suitability for an operation
   */
  private scoreToolForOperation(tool: CuttingTool, options: {
    material_iso_group: string;
    operation: string;
    diameter_target?: number;
  }): number {
    let score = 50; // Base score
    
    // Diameter match
    if (options.diameter_target) {
      const diamDiff = Math.abs(tool.geometry.diameter - options.diameter_target);
      if (diamDiff === 0) score += 30;
      else if (diamDiff < 1) score += 20;
      else if (diamDiff < 2) score += 10;
    }
    
    // Coating quality for material
    if (tool.coating) {
      const coating = tool.coating.type.toUpperCase();
      // AlTiN/TiAlN best for steel (P group)
      if (options.material_iso_group === "P" && (coating.includes("ALTI") || coating.includes("TIAL"))) {
        score += 15;
      }
      // DLC/diamond best for aluminum (N group)
      if (options.material_iso_group === "N" && (coating.includes("DLC") || coating.includes("DIAMOND"))) {
        score += 15;
      }
      // TiN good general purpose
      if (coating === "TIN") score += 5;
    }
    
    // Flute count optimization
    if (options.operation.includes("roughing")) {
      // Fewer flutes better for chip evacuation
      if (tool.geometry.flutes <= 3) score += 10;
    } else if (options.operation.includes("finishing")) {
      // More flutes better for surface finish
      if (tool.geometry.flutes >= 4) score += 10;
    }
    
    // Substrate quality
    if (tool.substrate.toLowerCase().includes("carbide")) score += 10;
    if (tool.substrate.toLowerCase().includes("pcd")) score += 20; // For aluminum
    if (tool.substrate.toLowerCase().includes("cbn")) score += 15; // For hardened
    
    return score;
  }

  /**
   * Get tools by type
   */
  getByType(type: string): CuttingTool[] {
    const ids = this.indexByType.get(type.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get tools by manufacturer
   */
  getByManufacturer(manufacturer: string): CuttingTool[] {
    const ids = this.indexByManufacturer.get(manufacturer.toLowerCase());
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get tools compatible with material group
   */
  getForMaterialGroup(isoGroup: string): CuttingTool[] {
    const ids = this.indexByMaterialGroup.get(isoGroup);
    if (!ids) return [];
    return Array.from(ids).map(id => this.get(id)!).filter(Boolean);
  }

  /**
   * Get statistics
   */
  getStats(): {
    total: number;
    byType: Record<string, number>;
    byManufacturer: Record<string, number>;
    bySubstrate: Record<string, number>;
    withCoating: number;
  } {
    const stats = {
      total: this.entries.size,
      byType: {} as Record<string, number>,
      byManufacturer: {} as Record<string, number>,
      bySubstrate: {} as Record<string, number>,
      withCoating: 0
    };
    
    for (const [type, ids] of this.indexByType) {
      stats.byType[type] = ids.size;
    }
    
    for (const [mfr, ids] of this.indexByManufacturer) {
      stats.byManufacturer[mfr] = ids.size;
    }
    
    const substrateCounts: Record<string, number> = {};
    for (const tool of this.all()) {
      const sub = tool.substrate.toLowerCase();
      substrateCounts[sub] = (substrateCounts[sub] || 0) + 1;
      if (tool.coating) stats.withCoating++;
    }
    stats.bySubstrate = substrateCounts;
    
    return stats;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
