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
  private indexByCoating: Map<string, Set<string>> = new Map();
  private indexByCategory: Map<string, Set<string>> = new Map();
  
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
    
    // R1: Load from both extracted/ and data/ paths (dual-path fix)
    await this.loadFromPath(PATHS.TOOLS_DB);
    await this.loadFromPath("C:\\PRISM\\data\\tools");
    this.buildIndexes();
    
    if (this.entries.size > 0) {
      this.loaded = true;
      log.info(`ToolRegistry loaded: ${this.entries.size} tools`);
    } else {
      log.warn(`ToolRegistry: 0 tools loaded — will retry on next call`);
    }
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
          const data = await readJsonFile<any>(filePath);
          
          // R1: Handle both direct arrays and wrapper format {category, count, tools: [...]}
          let tools: any[];
          if (Array.isArray(data)) {
            tools = data;
          } else if (data.tools && Array.isArray(data.tools)) {
            tools = data.tools;
          } else {
            tools = [data];
          }
          
          for (const tool of tools) {
            if (tool.id && !this.entries.has(tool.id)) {
              this.set(tool.id, tool as CuttingTool);
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
    this.indexByCoating.clear();
    this.indexByCategory.clear();
    
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
      
      // Index by manufacturer/vendor — R1-MS5: data uses 'vendor', interface uses 'manufacturer'
      const mfrName = tool.manufacturer || (tool as any).vendor;
      if (mfrName) {
        const mfr = String(mfrName).toLowerCase();
        if (!this.indexByManufacturer.has(mfr)) {
          this.indexByManufacturer.set(mfr, new Set());
        }
        this.indexByManufacturer.get(mfr)?.add(id);
      }
      
      // Index by category (R1-MS5: new index for faceted search)
      const catName = (tool as any).category;
      if (catName) {
        const cat = String(catName).toLowerCase();
        if (!this.indexByCategory.has(cat)) {
          this.indexByCategory.set(cat, new Set());
        }
        this.indexByCategory.get(cat)?.add(id);
      }
      
      // Index by coating (R1-MS5: new index for faceted search)
      const coatingName = (tool as any).coating || (tool as any).coating_type;
      if (coatingName) {
        const coat = String(coatingName).toLowerCase();
        if (!this.indexByCoating.has(coat)) {
          this.indexByCoating.set(coat, new Set());
        }
        this.indexByCoating.get(coat)?.add(id);
      }
      
      // Index by material group
      // Source 1: explicit material_groups array
      if (tool.material_groups) {
        for (const group of tool.material_groups) {
          if (!this.indexByMaterialGroup.has(group)) {
            this.indexByMaterialGroup.set(group, new Set());
          }
          this.indexByMaterialGroup.get(group)?.add(id);
        }
      }
      // Source 2: derive from cutting_params.materials keys (P_STEELS → P, M_STAINLESS → M, etc.)
      const cpMaterials = (tool as any).cutting_params?.materials;
      if (cpMaterials && typeof cpMaterials === 'object') {
        for (const matKey of Object.keys(cpMaterials)) {
          // Extract ISO group letter: P_STEELS → P, M_STAINLESS → M, K_CAST_IRON → K, etc.
          const isoGroup = matKey.split('_')[0].toUpperCase();
          if (isoGroup.length === 1 && /[PMKNSH]/.test(isoGroup)) {
            if (!this.indexByMaterialGroup.has(isoGroup)) {
              this.indexByMaterialGroup.set(isoGroup, new Set());
            }
            this.indexByMaterialGroup.get(isoGroup)?.add(id);
          }
        }
      }
      
      // Index by diameter (rounded to nearest 0.5mm)
      const toolDiameter = (tool as any).cutting_diameter_mm || tool.geometry?.diameter;
      if (toolDiameter) {
        const d = Math.round(toolDiameter * 2) / 2;
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
      if ((tool as any).catalog_number && (tool as any).catalog_number.toLowerCase() === catalogNumber.toLowerCase()) {
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
    if (options.query && options.query !== "*") {
      const query = options.query.toLowerCase().replace(/[_-]/g, '');
      results = results.filter(t => {
        try {
          const normalize = (s: string) => s.toLowerCase().replace(/[_-]/g, '');
          return normalize(String(t.name || "")).includes(query) ||
            normalize(String((t as any).catalog_number || "")).includes(query) ||
            normalize(String((t as any).manufacturer || (t as any).vendor || "")).includes(query) ||
            normalize(String((t as any).type || "")).includes(query) ||
            normalize(String((t as any).category || "")).includes(query) ||
            normalize(String((t as any).subcategory || "")).includes(query) ||
            normalize(String((t as any).description || "")).includes(query) ||
            normalize(String((t as any).spindle_interface || "")).includes(query) ||
            normalize(String((t as any).holder_type || "")).includes(query);
        } catch { return false; }
      });
    }
    
    if (options.diameter_min !== undefined) {
      results = results.filter(t => {
        const d = (t as any).cutting_diameter_mm || t.geometry?.diameter || 0;
        return d >= options.diameter_min!;
      });
    }
    
    if (options.diameter_max !== undefined) {
      results = results.filter(t => {
        const d = (t as any).cutting_diameter_mm || t.geometry?.diameter || 0;
        return d > 0 && d <= options.diameter_max!;
      });
    }
    
    if (options.flutes !== undefined) {
      results = results.filter(t => {
        const f = (t as any).flute_count || t.geometry?.flutes;
        return f === options.flutes;
      });
    }
    
    if (options.coating) {
      const coatQuery = options.coating.toLowerCase();
      results = results.filter(t => {
        const c = ((t as any).coating?.type || (t as any).coating || (t as any).coating_type || '').toString().toLowerCase();
        return c.includes(coatQuery);
      });
    }
    
    if (options.substrate) {
      results = results.filter(t => 
        ((t as any).substrate || "").toLowerCase().includes(options.substrate!.toLowerCase())
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
    
    // Get tools compatible with material — with ISO group fallback mapping
    // S (superalloys) → try S, then M (stainless)
    // H (hardened) → try H, then P (steels)
    const groupFallbacks: Record<string, string[]> = {
      'S': ['S', 'M'],  // Superalloy tools overlap with stainless
      'H': ['H', 'P'],  // Hardened steel tools overlap with steel
      'X': ['X', 'P', 'M', 'K', 'N'], // Specialty: try all
    };
    
    const groupsToTry = groupFallbacks[options.material_iso_group] || [options.material_iso_group];
    const compatibleIdSet = new Set<string>();
    for (const group of groupsToTry) {
      const ids = this.indexByMaterialGroup.get(group);
      if (ids) {
        for (const id of ids) compatibleIdSet.add(id);
      }
    }
    if (compatibleIdSet.size === 0) return [];
    
    let candidates = Array.from(compatibleIdSet)
      .map(id => this.get(id)!)
      .filter(Boolean);
    
    // Filter by operation compatibility using PRISM taxonomy
    const op = options.operation.toLowerCase();
    candidates = candidates.filter(t => {
      if (t.application?.length > 0) {
        return t.application.some(a => a.toLowerCase().includes(op));
      }
      
      const type = ((t as any).type || '').toLowerCase();
      const subcat = ((t as any).subcategory || '').toLowerCase();
      const cat = ((t as any).category || '').toLowerCase();
      
      // ALWAYS exclude toolholders — they're not cutting tools
      if (cat === 'toolholders' || cat === 'toolholding') return false;
      
      // Strict category-based filtering using PRISM taxonomy
      if (op === 'milling' || op === 'roughing' || op === 'finishing') {
        return cat === 'milling' || cat === 'indexable_milling' || cat === 'milling_inserts' ||
               subcat.includes('end_mill') || subcat.includes('face_mill') ||
               type.includes('end_mill') || type.includes('ball_nose') || type.includes('corner_radius') ||
               type.includes('high_feed') || type.includes('roughing') || type.includes('finishing') ||
               type.includes('shoulder_mill') || type.includes('face_mill') || type.includes('exchangeable');
      }
      if (op === 'turning') {
        return cat === 'turning' || cat === 'turning_inserts' ||
               subcat.includes('insert') && !cat.includes('mill') || // inserts but NOT milling inserts
               subcat === 'external_holders' || subcat === 'grooving_inserts' ||
               type.includes('cnmg') || type.includes('tnmg') || type.includes('dnmg') ||
               type.includes('wnmg') || type.includes('snmg') || type.includes('vnmg') ||
               type.includes('ccmt') || type.includes('dcmt') || type.includes('tcmt');
      }
      if (op === 'drilling') {
        return cat === 'drilling' || subcat.includes('drill') || subcat.includes('twist') ||
               subcat.includes('spot') || subcat.includes('indexable') && type.includes('drill') ||
               type.includes('drill') || type.includes('step_drill');
      }
      if (op === 'boring') {
        return cat === 'boring' || subcat.includes('boring') ||
               type.includes('boring') || type.includes('fine_boring');
      }
      if (op === 'threading') {
        return cat === 'threading' || subcat.includes('tap') || subcat.includes('thread') ||
               type.includes('tap') || type.includes('thread');
      }
      if (op === 'reaming') {
        return cat === 'hole_finishing' || subcat.includes('ream') || type.includes('ream');
      }
      
      return false; // Don't return random tools for unknown operations
    });
    
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
    let score = 50;
    const op = options.operation.toLowerCase();
    const cat = ((tool as any).category || '').toLowerCase();
    const type = ((tool as any).type || '').toLowerCase();
    const subcat = ((tool as any).subcategory || '').toLowerCase();
    
    // Prefer actual cutting tools over inserts for milling/drilling
    if (op === 'milling' || op === 'roughing' || op === 'finishing' || op === 'drilling') {
      if (cat === 'milling' || cat === 'drilling') score += 15; // Solid tools preferred
      if (cat.includes('insert')) score -= 5; // Inserts are less useful without a body
    }
    // For turning, prefer inserts
    if (op === 'turning') {
      if (cat === 'turning_inserts' || type.includes('insert')) score += 15;
      if (cat === 'turning' && subcat === 'external_holders') score += 10;
    }
    
    // Vendor quality tier
    const vendor = ((tool as any).vendor || '').toLowerCase();
    if (['sandvik coromant', 'kennametal', 'walter', 'iscar', 'seco'].some(v => vendor.includes(v))) score += 10;
    if (['mitsubishi', 'kyocera', 'tungaloy', 'sumitomo'].some(v => vendor.includes(v))) score += 8;
    
    // Confidence score
    const conf = (tool as any).confidence || 0;
    if (conf >= 0.95) score += 10;
    else if (conf >= 0.90) score += 5;
    
    // Coolant through — big advantage for deep cuts and difficult materials
    if ((tool as any).coolant_through) score += 8;
    
    // Diameter match
    if (options.diameter_target) {
      const toolDiam = (tool as any).cutting_diameter_mm || tool.geometry?.diameter || 0;
      if (toolDiam > 0) {
        const diamDiff = Math.abs(toolDiam - options.diameter_target);
        if (diamDiff === 0) score += 30;
        else if (diamDiff < 1) score += 20;
        else if (diamDiff < 2) score += 10;
        else if (diamDiff < 5) score += 5;
      }
    }
    
    // Coating quality for material ISO group
    const coating = ((tool as any).coating?.type || (tool as any).coating || (tool as any).coating_type || '').toString().toUpperCase();
    if (coating) {
      if (options.material_iso_group === "P") {
        if (coating.includes("ALTI") || coating.includes("TIAL")) score += 15;
        else if (coating.includes("TICN") || coating.includes("TICRN")) score += 10;
        else if (coating.includes("CVD")) score += 8;
      }
      if (options.material_iso_group === "M") {
        if (coating.includes("ALTI") || coating.includes("TIAL")) score += 12;
        else if (coating.includes("TICN")) score += 8;
      }
      if (options.material_iso_group === "N") {
        if (coating.includes("DLC") || coating.includes("DIAMOND") || coating.includes("UNCOATED")) score += 15;
        else if (coating.includes("ZRN")) score += 10;
      }
      if (options.material_iso_group === "K") {
        if (coating.includes("CVD") || coating.includes("AL2O3")) score += 12;
        else if (coating.includes("TICN")) score += 8;
      }
      if (options.material_iso_group === "S") {
        if (coating.includes("ALTI") || coating.includes("TIAL")) score += 10;
        if ((tool as any).coolant_through) score += 5; // Extra bonus for S group
      }
      if (options.material_iso_group === "H") {
        if (coating.includes("ALCRN") || coating.includes("TISIN")) score += 15;
        else if (coating.includes("ALTI")) score += 10;
      }
      if (coating.includes("TIN") && !coating.includes("TICN")) score += 3;
    }
    
    // Flute count optimization (milling only)
    const flutes = (tool as any).flute_count || tool.geometry?.flutes || 0;
    if (flutes > 0) {
      if (op === 'roughing') {
        if (flutes <= 3) score += 10;
        if (options.material_iso_group === "N" && flutes <= 2) score += 5; // Fewer flutes for aluminum
      } else if (op === 'finishing') {
        if (flutes >= 4) score += 10;
      } else if (op === 'milling') {
        if (flutes === 4) score += 5; // 4-flute is most versatile
      }
    }
    
    // Substrate quality
    const substrate = ((tool as any).substrate || (tool as any).substrate_grade || '').toString().toLowerCase();
    if (substrate.includes("carbide")) score += 10;
    if (substrate.includes("pcd")) score += 20; // For aluminum
    if (substrate.includes("cbn")) score += 15; // For hardened
    
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
   * R1-MS5: Faceted search — returns counts per facet for building filter dropdowns.
   * Optionally applies filters to show counts within a filtered result set.
   */
  getFacets(filters?: {
    category?: string;
    vendor?: string;
    type?: string;
    coating?: string;
    material_group?: string;
    diameter_min?: number;
    diameter_max?: number;
  }): {
    categories: { name: string; count: number }[];
    vendors: { name: string; count: number }[];
    types: { name: string; count: number }[];
    coatings: { name: string; count: number }[];
    material_groups: { name: string; count: number }[];
    diameter_range: { min: number; max: number };
    total_tools: number;
    filtered_tools: number;
  } {
    // Start with all tools or filtered set
    let toolIds: Set<string>;
    
    if (filters && Object.keys(filters).some(k => (filters as any)[k] !== undefined)) {
      // Apply filters to get intersection
      const sets: Set<string>[] = [];
      
      if (filters.category) {
        const ids = this.indexByCategory.get(filters.category.toLowerCase());
        if (ids) sets.push(ids); else sets.push(new Set());
      }
      if (filters.vendor) {
        const ids = this.indexByManufacturer.get(filters.vendor.toLowerCase());
        if (ids) sets.push(ids); else sets.push(new Set());
      }
      if (filters.type) {
        const ids = this.indexByType.get(filters.type.toLowerCase());
        if (ids) sets.push(ids); else sets.push(new Set());
      }
      if (filters.coating) {
        const ids = this.indexByCoating.get(filters.coating.toLowerCase());
        if (ids) sets.push(ids); else sets.push(new Set());
      }
      if (filters.material_group) {
        const ids = this.indexByMaterialGroup.get(filters.material_group);
        if (ids) sets.push(ids); else sets.push(new Set());
      }
      
      if (sets.length > 0) {
        // Intersection of all filter sets
        toolIds = new Set(sets[0]);
        for (let i = 1; i < sets.length; i++) {
          for (const id of toolIds) {
            if (!sets[i].has(id)) toolIds.delete(id);
          }
        }
      } else {
        toolIds = new Set(Array.from(this.entries.keys()));
      }
      
      // Apply diameter filter (requires checking actual values)
      if (filters.diameter_min !== undefined || filters.diameter_max !== undefined) {
        const filtered = new Set<string>();
        for (const id of toolIds) {
          const tool = this.get(id);
          if (!tool) continue;
          const d = (tool as any).cutting_diameter_mm || tool.geometry?.diameter || 0;
          if (d <= 0) continue;
          if (filters.diameter_min !== undefined && d < filters.diameter_min) continue;
          if (filters.diameter_max !== undefined && d > filters.diameter_max) continue;
          filtered.add(id);
        }
        toolIds = filtered;
      }
    } else {
      toolIds = new Set(Array.from(this.entries.keys()));
    }
    
    // Count facets within filtered set
    const catCounts = new Map<string, number>();
    const vendorCounts = new Map<string, number>();
    const typeCounts = new Map<string, number>();
    const coatingCounts = new Map<string, number>();
    const matGroupCounts = new Map<string, number>();
    let dMin = Infinity, dMax = -Infinity;
    
    for (const id of toolIds) {
      const tool = this.get(id);
      if (!tool) continue;
      
      const cat = ((tool as any).category || 'unknown').toLowerCase();
      catCounts.set(cat, (catCounts.get(cat) || 0) + 1);
      
      const vendor = ((tool as any).vendor || (tool as any).manufacturer || 'unknown').toLowerCase();
      vendorCounts.set(vendor, (vendorCounts.get(vendor) || 0) + 1);
      
      const type = ((tool as any).type || 'unknown').toLowerCase();
      typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      
      const coating = ((tool as any).coating || 'unknown').toLowerCase();
      coatingCounts.set(coating, (coatingCounts.get(coating) || 0) + 1);
      
      // Material groups from cutting_params
      const cpMaterials = (tool as any).cutting_params?.materials;
      if (cpMaterials && typeof cpMaterials === 'object') {
        for (const matKey of Object.keys(cpMaterials)) {
          const isoGroup = matKey.split('_')[0].toUpperCase();
          if (isoGroup.length === 1 && /[PMKNSH]/.test(isoGroup)) {
            matGroupCounts.set(isoGroup, (matGroupCounts.get(isoGroup) || 0) + 1);
          }
        }
      }
      
      const d = (tool as any).cutting_diameter_mm || tool.geometry?.diameter || 0;
      if (d > 0) {
        if (d < dMin) dMin = d;
        if (d > dMax) dMax = d;
      }
    }
    
    const toSorted = (m: Map<string, number>) => 
      Array.from(m.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    
    return {
      categories: toSorted(catCounts),
      vendors: toSorted(vendorCounts).slice(0, 50),
      types: toSorted(typeCounts).slice(0, 50),
      coatings: toSorted(coatingCounts),
      material_groups: toSorted(matGroupCounts),
      diameter_range: { 
        min: dMin === Infinity ? 0 : dMin, 
        max: dMax === -Infinity ? 0 : dMax 
      },
      total_tools: this.entries.size,
      filtered_tools: toolIds.size
    };
  }

  /**
   * R1-MS5: Get index health stats — verify indexes are populated
   */
  getIndexStats(): {
    byType: number;
    byManufacturer: number;
    byCategory: number;
    byCoating: number;
    byMaterialGroup: number;
    byDiameter: number;
    total: number;
  } {
    return {
      byType: this.indexByType.size,
      byManufacturer: this.indexByManufacturer.size,
      byCategory: this.indexByCategory.size,
      byCoating: this.indexByCoating.size,
      byMaterialGroup: this.indexByMaterialGroup.size,
      byDiameter: this.indexByDiameter.size,
      total: this.entries.size
    };
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
      const sub = ((tool as any).substrate || 'unknown').toString().toLowerCase();
      substrateCounts[sub] = (substrateCounts[sub] || 0) + 1;
      if ((tool as any).coating) stats.withCoating++;
    }
    stats.bySubstrate = substrateCounts;
    
    return stats;
  }
}

// Singleton instance
export const toolRegistry = new ToolRegistry();
