/**
 * PRISM MCP Server - Material Registry
 * Complete access to 1,047 materials × 127 parameters
 * 4-Layer Hierarchy: LEARNED → USER → ENHANCED → CORE
 */

import * as fs from "fs/promises";
import * as path from "path";
import { BaseRegistry, type RegistryEntry } from "./base.js";
import { PATHS, DATA_LAYERS, ISO_GROUPS, MATERIAL_CATEGORIES } from "../constants.js";
import type { Material } from "../types.js";
import { log } from "../utils/Logger.js";
import { fileExists, readJsonFile, writeJsonFile, listDirectory } from "../utils/files.js";

// ============================================================================
// MATERIAL REGISTRY
// ============================================================================

export class MaterialRegistry extends BaseRegistry<Material> {
  private layerCaches: Map<string, Map<string, Material>> = new Map();
  private indexByName: Map<string, string[]> = new Map();
  private indexByISO: Map<string, string[]> = new Map();
  private indexByCategory: Map<string, string[]> = new Map();
  
  constructor() {
    super(
      "MaterialRegistry",
      path.join(PATHS.STATE_DIR, "material-registry.json"),
      "1.0.0"
    );
    
    // Initialize layer caches
    for (const layer of Object.values(DATA_LAYERS)) {
      this.layerCaches.set(layer, new Map());
    }
  }

  /**
   * Load materials from all layers
   */
  async load(): Promise<void> {
    if (this.loaded) return;
    
    log.info("Loading MaterialRegistry...");
    log.info(`  MATERIALS_DB path: ${PATHS.MATERIALS_DB}`);
    
    // Load from ISO group directories (P_STEELS, M_STAINLESS, etc.)
    const isoGroups = ["P_STEELS", "M_STAINLESS", "K_CAST_IRON", "N_NONFERROUS", "S_SUPERALLOYS", "H_HARDENED", "X_SPECIALTY"];
    
    for (const group of isoGroups) {
      const groupPath = path.join(PATHS.MATERIALS_DB, group);
      const exists = await fileExists(groupPath);
      if (exists) {
        const beforeCount = this.entries.size;
        await this.loadISOGroup(group, groupPath);
        const added = this.entries.size - beforeCount;
        log.info(`  ${group}: +${added} materials (total: ${this.entries.size})`);
      } else {
        log.info(`  ${group}: directory not found at ${groupPath}`);
      }
    }
    
    // Build indexes
    this.buildIndexes();
    
    // W5: Only mark loaded if we actually loaded data or no data files exist
    // Prevents marking "loaded" with 0 entries when files exist but failed to read
    if (this.entries.size > 0) {
      this.loaded = true;
      log.info(`MaterialRegistry loaded: ${this.entries.size} materials`);
    } else {
      // Check if data files exist — if they do, something went wrong
      let hasDataFiles = false;
      for (const group of isoGroups) {
        const groupPath = path.join(PATHS.MATERIALS_DB, group);
        if (await fileExists(groupPath)) {
          const files = await listDirectory(groupPath);
          if (files.some(f => f.name.endsWith(".json") && f.name !== "index.json")) {
            hasDataFiles = true;
            break;
          }
        }
      }
      if (hasDataFiles) {
        log.warn(`MaterialRegistry: 0 materials loaded despite data files existing! NOT marking as loaded — will retry on next call.`);
        // Don't set this.loaded = true — allow retry
      } else {
        this.loaded = true;
        log.info(`MaterialRegistry loaded: 0 materials (no data files found)`);
      }
    }
  }
  
  /**
   * Load materials from an ISO group directory
   */
  private async loadISOGroup(group: string, groupPath: string): Promise<void> {
    try {
      log.info(`  [loadISOGroup] ${group}: reading directory ${groupPath}`);
      const files = await listDirectory(groupPath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json") && f.name !== "index.json");
      log.info(`  [loadISOGroup] ${group}: found ${jsonFiles.length} JSON files (total files: ${files.length})`);
      
      for (const file of jsonFiles) {
        try {
          const data = await readJsonFile<{ materials?: Material[], category?: string }>(file.path);
          const materials = data.materials || [];
          const fileName = file.name.replace('.json', '');
          
          for (let i = 0; i < materials.length; i++) {
            const material = materials[i];
            // Generate unique ID including filename to prevent duplicates across files
            const id = material.material_id || material.id || `${group}-${fileName}-${i.toString().padStart(4, '0')}`;
            if (id) {
              this.entries.set(id, {
                id,
                data: { ...material, material_id: id, iso_group: material.iso_group || group.charAt(0) },
                metadata: {
                  created: new Date().toISOString(),
                  updated: new Date().toISOString(),
                  version: 1,
                  source: group
                }
              });
              this.layerCaches.get(DATA_LAYERS.CORE)?.set(id, material);
            }
          }
          log.info(`  [loadISOGroup] ${group}/${file.name}: ${materials.length} materials parsed, entries.size now: ${this.entries.size}`);
        } catch (error) {
          log.warn(`Failed to load material file ${file.name}: ${error}`);
        }
      }
    } catch (error) {
      log.warn(`Failed to load ISO group ${group}: ${error}`);
    }
  }

  /**
   * Load materials from a specific layer directory
   */
  private async loadLayer(layer: string, layerPath: string): Promise<void> {
    if (!await fileExists(layerPath)) {
      log.debug(`Layer path not found: ${layerPath}`);
      return;
    }
    
    try {
      const files = await listDirectory(layerPath);
      const jsonFiles = files.filter(f => f.name.endsWith(".json"));
      
      for (const file of jsonFiles) {
        const filePath = file.path;
        try {
          const data = await readJsonFile<Material | Material[]>(filePath);
          const materials = Array.isArray(data) ? data : [data];
          
          for (const material of materials) {
            const id = material.material_id || material.id;
            if (id) {
              // Higher layers override lower layers
              const existingEntry = this.entries.get(id);
              const shouldOverride = !existingEntry || 
                this.getLayerPriority(layer) > this.getLayerPriority(existingEntry.metadata.source || DATA_LAYERS.CORE);
              
              if (shouldOverride) {
                this.entries.set(id, {
                  id,
                  data: material,
                  metadata: {
                    created: existingEntry?.metadata.created || new Date().toISOString(),
                    updated: new Date().toISOString(),
                    version: (existingEntry?.metadata.version || 0) + 1,
                    source: layer
                  }
                });
              }
              
              // Cache in layer
              this.layerCaches.get(layer)?.set(id, material);
            }
          }
        } catch (error) {
          log.warn(`Failed to load material file ${file}: ${error}`);
        }
      }
      
      log.debug(`Loaded ${this.layerCaches.get(layer)?.size || 0} materials from ${layer} layer`);
    } catch (error) {
      log.warn(`Failed to load layer ${layer}: ${error}`);
    }
  }

  /**
   * Get layer priority (higher = more priority)
   */
  private getLayerPriority(layer: string): number {
    const priorities: Record<string, number> = {
      [DATA_LAYERS.CORE]: 1,
      [DATA_LAYERS.ENHANCED]: 2,
      [DATA_LAYERS.USER]: 3,
      [DATA_LAYERS.LEARNED]: 4
    };
    return priorities[layer] || 0;
  }

  /**
   * Build search indexes
   */
  private buildIndexes(): void {
    this.indexByName.clear();
    this.indexByISO.clear();
    this.indexByCategory.clear();
    
    for (const [id, entry] of this.entries) {
      const material = entry.data;
      
      // Index by name (normalized for case-insensitive search) — multi-value
      if (material.name) {
        const normalizedName = material.name.toLowerCase().trim().replace(/\s+/g, ' ');
        if (!this.indexByName.has(normalizedName)) {
          this.indexByName.set(normalizedName, []);
        }
        this.indexByName.get(normalizedName)!.push(id);
      }
      
      // Index by ISO group — check both classification.iso_group AND top-level iso_group
      const iso = material.classification?.iso_group || (material as any).iso_group;
      if (iso) {
        if (!this.indexByISO.has(iso)) {
          this.indexByISO.set(iso, []);
        }
        this.indexByISO.get(iso)!.push(id);
      }
      
      // Index by category — check classification.category, material_type, and subcategory
      const category = material.classification?.category || (material as any).material_type || (material as any).subcategory;
      if (category) {
        if (!this.indexByCategory.has(category)) {
          this.indexByCategory.set(category, []);
        }
        this.indexByCategory.get(category)!.push(id);
      }
    }
    
    log.debug(`Built indexes: ${this.indexByName.size} names, ${this.indexByISO.size} ISO groups, ${this.indexByCategory.size} categories`);
  }

  /**
   * Incrementally add a single material to indexes (avoids full rebuild)
   */
  private addToIndexes(id: string, material: Material): void {
    if (material.name) {
      const normalizedName = material.name.toLowerCase().trim().replace(/\s+/g, ' ');
      if (!this.indexByName.has(normalizedName)) {
        this.indexByName.set(normalizedName, []);
      }
      this.indexByName.get(normalizedName)!.push(id);
    }

    const iso = material.classification?.iso_group || (material as any).iso_group;
    if (iso) {
      if (!this.indexByISO.has(iso)) {
        this.indexByISO.set(iso, []);
      }
      this.indexByISO.get(iso)!.push(id);
    }

    const category = material.classification?.category || (material as any).material_type || (material as any).subcategory;
    if (category) {
      if (!this.indexByCategory.has(category)) {
        this.indexByCategory.set(category, []);
      }
      this.indexByCategory.get(category)!.push(id);
    }
  }

  /**
   * Get material by ID or name
   */
  async getByIdOrName(identifier: string): Promise<Material | undefined> {
    await this.load();
    
    if (!identifier) return undefined;
    
    // Try direct ID lookup
    let material = this.get(identifier);
    if (material) return material;
    
    // Try name lookup (case-insensitive, whitespace-normalized)
    const normalizedSearch = identifier.toLowerCase().trim().replace(/\s+/g, ' ');
    const idsFromName = this.indexByName.get(normalizedSearch);
    if (idsFromName && idsFromName.length > 0) {
      return this.get(idsFromName[0]);
    }
    
    // Try partial name match - ALL words must be present
    const searchWords = identifier.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    for (const [name, ids] of this.indexByName) {
      // Check if ALL search words are in the name
      if (searchWords.every(word => name.includes(word))) {
        return this.get(ids[0]);
      }
    }
    
    return undefined;
  }

  /**
   * Search materials with filters
   */
  async search(options: {
    query?: string;
    iso_group?: string;
    category?: string;
    hardness_min?: number;
    hardness_max?: number;
    machinability_min?: number;
    has_kienzle?: boolean;
    has_taylor?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ materials: Material[]; total: number; hasMore: boolean }> {
    await this.load();
    
    let results: Material[] = [];
    
    // Start with ISO group filter if specified (most selective)
    if (options.iso_group && this.indexByISO.has(options.iso_group)) {
      const ids = this.indexByISO.get(options.iso_group)!;
      results = ids.map(id => this.get(id)).filter(Boolean) as Material[];
    }
    // Or category filter
    else if (options.category && this.indexByCategory.has(options.category)) {
      const ids = this.indexByCategory.get(options.category)!;
      results = ids.map(id => this.get(id)).filter(Boolean) as Material[];
    }
    // Otherwise start with all materials
    else {
      results = this.all();
    }
    
    // W5 DEBUG: Log entry count and sample for search diagnostics
    log.info(`  Search: ${results.length} candidates, query="${options.query}", iso="${options.iso_group}"`);
    if (results.length > 0) {
      const sample = results[0] as any;
      log.info(`  Sample[0]: id=${sample.material_id||sample.id}, name=${sample.name}, type=${sample.material_type}, sub=${sample.subcategory}`);
    }
    
    // Apply additional filters
    // Treat "*" or empty query as "return all" — skip text filter
    if (options.query && options.query !== "*") {
      const query = options.query.toLowerCase();
      results = results.filter(m => 
        m.name?.toLowerCase().includes(query) ||
        m.material_id?.toLowerCase().includes(query) ||
        m.common_names?.some((n: string) => n.toLowerCase().includes(query)) ||
        (m as any).material_type?.toLowerCase().includes(query) ||
        (m as any).subcategory?.toLowerCase().includes(query) ||
        (m as any).iso_group?.toLowerCase().includes(query) ||
        (m as any).condition?.toLowerCase().includes(query)
      );
    }
    
    if (options.iso_group && !this.indexByISO.has(options.iso_group)) {
      results = results.filter(m => m.classification?.iso_group === options.iso_group);
    }
    
    if (options.category && !this.indexByCategory.has(options.category)) {
      results = results.filter(m => m.classification?.category === options.category);
    }
    
    if (options.hardness_min !== undefined) {
      results = results.filter(m =>
        (m.mechanical?.hardness?.rockwell_c || 0) >= options.hardness_min! ||
        (m.mechanical?.hardness?.brinell || 0) >= options.hardness_min!
      );
    }

    if (options.hardness_max !== undefined) {
      results = results.filter(m =>
        (m.mechanical?.hardness?.rockwell_c || 999) <= options.hardness_max! ||
        (m.mechanical?.hardness?.brinell || 999) <= options.hardness_max!
      );
    }
    
    if (options.machinability_min !== undefined) {
      results = results.filter(m => 
        (m.machining?.machinability_rating || 0) >= options.machinability_min!
      );
    }
    
    if (options.has_kienzle) {
      results = results.filter(m => m.kienzle?.kc1_1 && m.kienzle?.mc);
    }
    
    if (options.has_taylor) {
      results = results.filter(m => m.taylor?.C && m.taylor?.n);
    }
    
    // Pagination
    const total = results.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;
    const paged = results.slice(offset, offset + limit);
    
    return {
      materials: paged,
      total,
      hasMore: offset + paged.length < total
    };
  }

  /**
   * Get materials by ISO group
   */
  async getByISO(isoGroup: string): Promise<Material[]> {
    await this.load();
    
    const ids = this.indexByISO.get(isoGroup) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Material[];
  }

  /**
   * Get materials by category
   */
  async getByCategory(category: string): Promise<Material[]> {
    await this.load();
    
    const ids = this.indexByCategory.get(category) || [];
    return ids.map(id => this.get(id)).filter(Boolean) as Material[];
  }

  /**
   * Add material to USER or LEARNED layer
   */
  async addMaterial(material: Material, layer: string = DATA_LAYERS.USER): Promise<string> {
    await this.load();
    
    const id = material.material_id || material.id || `MAT-${Date.now()}`;
    
    // Validate layer
    if (layer !== DATA_LAYERS.USER && layer !== DATA_LAYERS.LEARNED) {
      throw new Error(`Can only add materials to USER or LEARNED layer, not ${layer}`);
    }
    
    // Check for duplicates
    if (this.has(id)) {
      throw new Error(`Material ${id} already exists. Use enhance() to update.`);
    }
    
    // Set the ID
    material.material_id = id;
    
    // Add to registry
    this.set(id, material, layer);
    this.layerCaches.get(layer)?.set(id, material);
    
    // Incremental index update (avoids full rebuild)
    this.addToIndexes(id, material);
    
    // Persist to layer file
    await this.persistToLayer(id, material, layer);
    
    log.info(`Added material ${id} to ${layer} layer`);
    return id;
  }

  /**
   * Enhance existing material with new data
   */
  async enhanceMaterial(
    id: string, 
    enhancements: Partial<Material>,
    source?: string
  ): Promise<Material> {
    await this.load();
    
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Material ${id} not found`);
    }
    
    // Deep merge enhancements
    const enhanced = this.deepMerge(existing, enhancements);
    
    // Update in registry
    this.set(id, enhanced, source || DATA_LAYERS.ENHANCED);
    
    // Update indexes
    this.buildIndexes();
    
    // Persist
    await this.persistToLayer(id, enhanced, DATA_LAYERS.ENHANCED);
    
    log.info(`Enhanced material ${id}`);
    return enhanced;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };
    
    for (const key of Object.keys(source)) {
      if (source[key] !== null && typeof source[key] === "object" && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else if (source[key] !== undefined) {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  /**
   * Persist material to layer file
   */
  private async persistToLayer(id: string, material: Material, layer: string): Promise<void> {
    const layerPath = path.join(PATHS.MATERIALS_DB, layer.toLowerCase());
    
    try {
      await fs.mkdir(layerPath, { recursive: true });
      
      const filePath = path.join(layerPath, `${id}.json`);
      await writeJsonFile(filePath, material);
      
      log.debug(`Persisted material ${id} to ${filePath}`);
    } catch (error) {
      log.error(`Failed to persist material ${id}: ${error}`);
    }
  }

  /**
   * Get statistics about materials database
   */
  async getStats(): Promise<{
    total: number;
    byISO: Record<string, number>;
    byCategory: Record<string, number>;
    byLayer: Record<string, number>;
    withKienzle: number;
    withTaylor: number;
    withJohnsonCook: number;
  }> {
    await this.load();
    
    const stats = {
      total: this.entries.size,
      byISO: {} as Record<string, number>,
      byCategory: {} as Record<string, number>,
      byLayer: {} as Record<string, number>,
      withKienzle: 0,
      withTaylor: 0,
      withJohnsonCook: 0
    };
    
    for (const isoGroup of Object.values(ISO_GROUPS)) {
      stats.byISO[isoGroup] = this.indexByISO.get(isoGroup)?.length || 0;
    }
    
    for (const category of Object.values(MATERIAL_CATEGORIES)) {
      stats.byCategory[category] = this.indexByCategory.get(category)?.length || 0;
    }
    
    for (const layer of Object.values(DATA_LAYERS)) {
      stats.byLayer[layer] = this.layerCaches.get(layer)?.size || 0;
    }
    
    for (const entry of this.entries.values()) {
      const m = entry.data;
      if (m.kienzle?.kc1_1 && m.kienzle?.mc) stats.withKienzle++;
      if (m.taylor?.C && m.taylor?.n) stats.withTaylor++;
      if (m.johnson_cook?.A) stats.withJohnsonCook++;
    }
    
    return stats;
  }

  /**
   * Compare multiple materials
   */
  async compare(ids: string[], properties?: string[]): Promise<{ materials: Material[]; comparison: Record<string, any>[] }> {
    await this.load();
    
    const materials = ids.map(id => this.get(id)).filter(Boolean) as Material[];
    
    if (materials.length < 2) {
      return { materials: [], comparison: [] };
    }
    
    const defaultProperties = [
      "name",
      "iso_group",
      "category",
      "mechanical.tensile_strength",
      "mechanical.hardness.brinell",
      "machining.machinability_rating",
      "kienzle.kc1_1",
      "kienzle.mc",
      "taylor.C",
      "taylor.n"
    ];
    
    const propsToCompare = properties || defaultProperties;
    
    const comparison = materials.map(m => {
      const result: Record<string, any> = { material_id: m.material_id || m.id, name: m.name };
      
      for (const prop of propsToCompare) {
        const value = this.getNestedValue(m, prop);
        result[prop] = value;
      }
      
      return result;
    });
    
    return { materials, comparison };
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split(".").reduce((o, k) => o?.[k], obj);
  }

  /**
   * Get the catalog of 81 source files targeting MaterialRegistry (65 MEDIUM + 16 LOW).
   * Static access — no instance required.
   */
  static getSourceFileCatalog(): Record<string, MaterialSourceFileEntry> {
    return MATERIAL_SOURCE_FILE_CATALOG;
  }

  /**
   * Get catalog entries as an array with module names, optionally filtered by ISO group.
   * Instance method for convenient access from registry consumers.
   */
  catalogSourceFiles(options?: {
    iso_group?: string;
    category?: string;
    subcategory?: string;
  }): Array<{ module: string } & MaterialSourceFileEntry> {
    const entries = Object.entries(MATERIAL_SOURCE_FILE_CATALOG).map(
      ([module, entry]) => ({ module, ...entry })
    );

    if (!options) return entries;

    return entries.filter((e) => {
      if (options.iso_group && e.iso_group !== options.iso_group) return false;
      if (options.category && e.category !== options.category) return false;
      if (options.subcategory && e.subcategory !== options.subcategory) return false;
      return true;
    });
  }
}

// ============================================================================
// MATERIAL SOURCE FILE CATALOG
// 81 extracted JS source files targeting MaterialRegistry
//   65 MEDIUM-priority (285,019 lines)  — extracted/
//   16 LOW-priority    (347,390 lines)  — materials_complete + materials_enhanced
// Total: 632,409 lines of material database source code
// Generated: 2026-02-23 from MASTER_EXTRACTION_INDEX_V2.json
// ============================================================================

/** Type for a cataloged material source file entry */
export interface MaterialSourceFileEntry {
  filename: string;
  source_dir: string;
  category: string;
  subcategory: string;
  lines: number;
  safety_class: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  description: string;
  iso_group?: string;
}

/**
 * Catalog of 81 extracted JS source files targeting MaterialRegistry.
 *
 * MEDIUM (65 files, 285,019 lines):
 *   P - Steels (15 files, carbon/alloy/tool/free-machining)
 *   M - Stainless steels (3 files)
 *   K - Cast irons (3 files, gray/ductile/special)
 *   N - Nonferrous metals (18 files, aluminum/copper/titanium/magnesium/zinc)
 *   S - Superalloys (3 + 17 V9 batch files)
 *   Plus 4 top-level material files and 2 engine files.
 *
 * LOW (16 files, 347,390 lines — P-MS5 Wave 4):
 *   materials_complete/ — 2 complete profiles (P_STEELS, M_STAINLESS)
 *   materials_enhanced/ — 14 enhanced profiles (12 P_STEELS, 2 M_STAINLESS)
 */
export const MATERIAL_SOURCE_FILE_CATALOG: Record<string, MaterialSourceFileEntry> = {
  // --- engines/materials (2 files) ---
  "PRISM_MATERIAL_SIMULATION_ENGINE": {
    filename: "PRISM_MATERIAL_SIMULATION_ENGINE.js",
    source_dir: "extracted/engines/materials",
    category: "engines",
    subcategory: "materials",
    lines: 232,
    safety_class: "MEDIUM",
    description: "Material simulation engine for property prediction and modeling",
    iso_group: undefined
  },
  "PRISM_REST_MATERIAL_ENGINE": {
    filename: "PRISM_REST_MATERIAL_ENGINE.js",
    source_dir: "extracted/engines/materials",
    category: "engines",
    subcategory: "materials",
    lines: 234,
    safety_class: "MEDIUM",
    description: "Material REST API engine for material data access and queries",
    iso_group: undefined
  },

  // --- materials/ top-level (4 files) ---
  "EXOTIC_MATERIALS_DATABASE": {
    filename: "EXOTIC_MATERIALS_DATABASE.js",
    source_dir: "extracted/materials",
    category: "materials",
    subcategory: "",
    lines: 560,
    safety_class: "MEDIUM",
    description: "Exotic materials database with specialty alloy properties and cutting data",
    iso_group: undefined
  },
  "PRISM_ENHANCED_MATERIAL_DATABASE": {
    filename: "PRISM_ENHANCED_MATERIAL_DATABASE.js",
    source_dir: "extracted/materials",
    category: "materials",
    subcategory: "",
    lines: 252,
    safety_class: "MEDIUM",
    description: "Enhanced material database with extended property coverage",
    iso_group: undefined
  },
  "PRISM_MATERIALS_COMPLETE": {
    filename: "PRISM_MATERIALS_COMPLETE.js",
    source_dir: "extracted/materials",
    category: "materials",
    subcategory: "",
    lines: 1293,
    safety_class: "MEDIUM",
    description: "Complete materials collection with full parameter coverage",
    iso_group: undefined
  },
  "SCHEMA_127_PARAMETERS": {
    filename: "SCHEMA_127_PARAMETERS.js",
    source_dir: "extracted/materials",
    category: "materials",
    subcategory: "",
    lines: 417,
    safety_class: "MEDIUM",
    description: "Material schema defining all 127 parameters per material entry",
    iso_group: undefined
  },

  // --- materials/K_CAST_IRON (3 files, ISO group K) ---
  "ductile_cast_irons_016_035": {
    filename: "ductile_cast_irons_016_035.js",
    source_dir: "extracted/materials/K_CAST_IRON",
    category: "materials",
    subcategory: "K_CAST_IRON",
    lines: 1636,
    safety_class: "MEDIUM",
    description: "Ductile cast iron properties, machining parameters, and cutting data",
    iso_group: "K"
  },
  "gray_cast_irons_001_015": {
    filename: "gray_cast_irons_001_015.js",
    source_dir: "extracted/materials/K_CAST_IRON",
    category: "materials",
    subcategory: "K_CAST_IRON",
    lines: 2930,
    safety_class: "MEDIUM",
    description: "Gray cast iron properties, machining parameters, and cutting data",
    iso_group: "K"
  },
  "special_cast_irons_036_060": {
    filename: "special_cast_irons_036_060.js",
    source_dir: "extracted/materials/K_CAST_IRON",
    category: "materials",
    subcategory: "K_CAST_IRON",
    lines: 4874,
    safety_class: "MEDIUM",
    description: "Special cast iron properties, machining parameters, and cutting data",
    iso_group: "K"
  },

  // --- materials/M_STAINLESS (3 files, ISO group M) ---
  "stainless_conditions_generated": {
    filename: "stainless_conditions_generated.js",
    source_dir: "extracted/materials/M_STAINLESS",
    category: "materials",
    subcategory: "M_STAINLESS",
    lines: 11197,
    safety_class: "MEDIUM",
    description: "Stainless steel condition variants with heat treatment parameters",
    iso_group: "M"
  },
  "stainless_steels_001_050": {
    filename: "stainless_steels_001_050.js",
    source_dir: "extracted/materials/M_STAINLESS",
    category: "materials",
    subcategory: "M_STAINLESS",
    lines: 17796,
    safety_class: "MEDIUM",
    description: "Stainless steel grades 001-050 properties and cutting data",
    iso_group: "M"
  },
  "stainless_steels_051_100": {
    filename: "stainless_steels_051_100.js",
    source_dir: "extracted/materials/M_STAINLESS",
    category: "materials",
    subcategory: "M_STAINLESS",
    lines: 18242,
    safety_class: "MEDIUM",
    description: "Stainless steel grades 051-100 properties and cutting data",
    iso_group: "M"
  },

  // --- materials/N_NONFERROUS (18 files, ISO group N) ---
  "aluminum_2xxx_011_030": {
    filename: "aluminum_2xxx_011_030.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 1848,
    safety_class: "MEDIUM",
    description: "Aluminum 2xxx series alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_2xxx_021_030": {
    filename: "aluminum_2xxx_021_030.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 1219,
    safety_class: "MEDIUM",
    description: "Aluminum 2xxx series alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_6xxx_031_050": {
    filename: "aluminum_6xxx_031_050.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 649,
    safety_class: "MEDIUM",
    description: "Aluminum 6xxx series alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_6xxx_045_050": {
    filename: "aluminum_6xxx_045_050.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 375,
    safety_class: "MEDIUM",
    description: "Aluminum 6xxx series alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_6xxx_generated": {
    filename: "aluminum_6xxx_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 2243,
    safety_class: "MEDIUM",
    description: "Generated aluminum 6xxx series alloy properties and cutting data",
    iso_group: "N"
  },
  "aluminum_7xxx_051_070": {
    filename: "aluminum_7xxx_051_070.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 2390,
    safety_class: "MEDIUM",
    description: "Aluminum 7xxx series alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_7xxx_generated": {
    filename: "aluminum_7xxx_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 4260,
    safety_class: "MEDIUM",
    description: "Generated aluminum 7xxx series alloy properties and cutting data",
    iso_group: "N"
  },
  "aluminum_alloys_001_010": {
    filename: "aluminum_alloys_001_010.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 2164,
    safety_class: "MEDIUM",
    description: "Aluminum alloy base grades properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_cast_071_090": {
    filename: "aluminum_cast_071_090.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 2428,
    safety_class: "MEDIUM",
    description: "Aluminum cast alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_cast_generated": {
    filename: "aluminum_cast_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 1119,
    safety_class: "MEDIUM",
    description: "Generated aluminum cast alloy properties and cutting data",
    iso_group: "N"
  },
  "aluminum_temper_conditions": {
    filename: "aluminum_temper_conditions.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 15595,
    safety_class: "MEDIUM",
    description: "Aluminum temper condition variants with mechanical properties",
    iso_group: "N"
  },
  "aluminum_wrought_011_050": {
    filename: "aluminum_wrought_011_050.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 1852,
    safety_class: "MEDIUM",
    description: "Aluminum wrought alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "aluminum_wrought_generated": {
    filename: "aluminum_wrought_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 2277,
    safety_class: "MEDIUM",
    description: "Generated aluminum wrought alloy properties and cutting data",
    iso_group: "N"
  },
  "copper_alloys_generated": {
    filename: "copper_alloys_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 2933,
    safety_class: "MEDIUM",
    description: "Copper alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "copper_temper_conditions": {
    filename: "copper_temper_conditions.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 8585,
    safety_class: "MEDIUM",
    description: "Copper temper condition variants with mechanical properties",
    iso_group: "N"
  },
  "magnesium_alloys_generated": {
    filename: "magnesium_alloys_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 1447,
    safety_class: "MEDIUM",
    description: "Magnesium alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "titanium_alloys_generated": {
    filename: "titanium_alloys_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 1714,
    safety_class: "MEDIUM",
    description: "Titanium alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },
  "zinc_alloys_generated": {
    filename: "zinc_alloys_generated.js",
    source_dir: "extracted/materials/N_NONFERROUS",
    category: "materials",
    subcategory: "N_NONFERROUS",
    lines: 1146,
    safety_class: "MEDIUM",
    description: "Zinc alloy properties, machining parameters, and cutting data",
    iso_group: "N"
  },

  // --- materials/P_STEELS (15 files, ISO group P) ---
  "alloy_steels_065_100": {
    filename: "alloy_steels_065_100.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 13126,
    safety_class: "MEDIUM",
    description: "Alloy steel grades properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "carbon_alloy_steel_conditions": {
    filename: "carbon_alloy_steel_conditions.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 29941,
    safety_class: "MEDIUM",
    description: "Carbon and alloy steel condition variants with heat treatment parameters",
    iso_group: "P"
  },
  "carbon_steels_001_010": {
    filename: "carbon_steels_001_010.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 1440,
    safety_class: "MEDIUM",
    description: "Carbon steel grades properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "carbon_steels_011_020": {
    filename: "carbon_steels_011_020.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 2238,
    safety_class: "MEDIUM",
    description: "Carbon steel grades properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "carbon_steels_021_030": {
    filename: "carbon_steels_021_030.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 2011,
    safety_class: "MEDIUM",
    description: "Carbon steel grades properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "carbon_steels_031_040": {
    filename: "carbon_steels_031_040.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 1264,
    safety_class: "MEDIUM",
    description: "Carbon steel grades properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "carbon_steels_041_050": {
    filename: "carbon_steels_041_050.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 797,
    safety_class: "MEDIUM",
    description: "Carbon steel grades properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "free_machining_steels_051_064": {
    filename: "free_machining_steels_051_064.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 5210,
    safety_class: "MEDIUM",
    description: "Free machining steel properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "steels_151_200": {
    filename: "steels_151_200.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 15911,
    safety_class: "MEDIUM",
    description: "Steel grades 151-200 properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "steels_201_250": {
    filename: "steels_201_250.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 8960,
    safety_class: "MEDIUM",
    description: "Steel grades 201-250 properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "steels_251_300": {
    filename: "steels_251_300.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 7961,
    safety_class: "MEDIUM",
    description: "Steel grades 251-300 properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "steels_301_350": {
    filename: "steels_301_350.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 6467,
    safety_class: "MEDIUM",
    description: "Steel grades 301-350 properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "steels_351_400": {
    filename: "steels_351_400.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 6775,
    safety_class: "MEDIUM",
    description: "Steel grades 351-400 properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "tool_steels_101_150": {
    filename: "tool_steels_101_150.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 17497,
    safety_class: "MEDIUM",
    description: "Tool steel grades properties, machining parameters, and cutting data",
    iso_group: "P"
  },
  "tool_steels_hardness_conditions": {
    filename: "tool_steels_hardness_conditions.js",
    source_dir: "extracted/materials/P_STEELS",
    category: "materials",
    subcategory: "P_STEELS",
    lines: 31048,
    safety_class: "MEDIUM",
    description: "Tool steel hardness condition variants with heat treatment parameters",
    iso_group: "P"
  },

  // --- materials/S_SUPERALLOYS (3 files, ISO group S) ---
  "cobalt_superalloys_generated": {
    filename: "cobalt_superalloys_generated.js",
    source_dir: "extracted/materials/S_SUPERALLOYS",
    category: "materials",
    subcategory: "S_SUPERALLOYS",
    lines: 1188,
    safety_class: "MEDIUM",
    description: "Cobalt-based superalloy properties, machining parameters, and cutting data",
    iso_group: "S"
  },
  "nickel_superalloys_011_020": {
    filename: "nickel_superalloys_011_020.js",
    source_dir: "extracted/materials/S_SUPERALLOYS",
    category: "materials",
    subcategory: "S_SUPERALLOYS",
    lines: 1568,
    safety_class: "MEDIUM",
    description: "Nickel superalloy grades properties, machining parameters, and cutting data",
    iso_group: "S"
  },
  "nickel_superalloys_generated": {
    filename: "nickel_superalloys_generated.js",
    source_dir: "extracted/materials/S_SUPERALLOYS",
    category: "materials",
    subcategory: "S_SUPERALLOYS",
    lines: 1473,
    safety_class: "MEDIUM",
    description: "Generated nickel superalloy properties and cutting data",
    iso_group: "S"
  },

  // --- materials_v9_complete/S_SUPERALLOYS (17 V9 batch files, ISO group S) ---
  "s_superalloys_batch_20260125_010013": {
    filename: "s_superalloys_batch_20260125_010013.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 993,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_010133": {
    filename: "s_superalloys_batch_20260125_010133.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 1008,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_010249": {
    filename: "s_superalloys_batch_20260125_010249.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 988,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_010411": {
    filename: "s_superalloys_batch_20260125_010411.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 1019,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_010524": {
    filename: "s_superalloys_batch_20260125_010524.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 983,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_010641": {
    filename: "s_superalloys_batch_20260125_010641.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 1003,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_010755": {
    filename: "s_superalloys_batch_20260125_010755.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 978,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_010910": {
    filename: "s_superalloys_batch_20260125_010910.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 978,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011032": {
    filename: "s_superalloys_batch_20260125_011032.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 1003,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011147": {
    filename: "s_superalloys_batch_20260125_011147.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 993,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011312": {
    filename: "s_superalloys_batch_20260125_011312.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 988,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011429": {
    filename: "s_superalloys_batch_20260125_011429.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 998,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011545": {
    filename: "s_superalloys_batch_20260125_011545.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 984,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011706": {
    filename: "s_superalloys_batch_20260125_011706.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 999,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011827": {
    filename: "s_superalloys_batch_20260125_011827.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 1008,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_011941": {
    filename: "s_superalloys_batch_20260125_011941.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 943,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },
  "s_superalloys_batch_20260125_012013": {
    filename: "s_superalloys_batch_20260125_012013.js",
    source_dir: "extracted/materials_v9_complete/S_SUPERALLOYS",
    category: "materials_v9_complete",
    subcategory: "S_SUPERALLOYS",
    lines: 371,
    safety_class: "MEDIUM",
    description: "V9-enhanced superalloy profile batch with extended machining data",
    iso_group: "S"
  },

  // --- LOW priority: materials_complete + materials_enhanced (P-MS5 Wave 4) ---

  // --- materials_complete/ (2 files, 218,727 lines) ---
  "M_STAINLESS_complete": {
    filename: "M_STAINLESS_complete.js",
    source_dir: "extracted/materials_complete/M_STAINLESS",
    category: "materials_complete",
    subcategory: "M_STAINLESS",
    lines: 61969,
    safety_class: "LOW",
    description: "Complete stainless steel profile with full machining data library",
    iso_group: "M"
  },
  "P_STEELS_complete": {
    filename: "P_STEELS_complete.js",
    source_dir: "extracted/materials_complete/P_STEELS",
    category: "materials_complete",
    subcategory: "P_STEELS",
    lines: 156758,
    safety_class: "LOW",
    description: "Complete steel profile with full machining data library",
    iso_group: "P"
  },

  // --- materials_enhanced/M_STAINLESS (2 files, ISO group M) ---
  "stainless_steels_001_050_enhanced": {
    filename: "stainless_steels_001_050_enhanced.js",
    source_dir: "extracted/materials_enhanced/M_STAINLESS",
    category: "materials_enhanced",
    subcategory: "M_STAINLESS",
    lines: 15615,
    safety_class: "LOW",
    description: "Enhanced stainless steel 001-050 profile with extended cutting parameters",
    iso_group: "M"
  },
  "stainless_steels_051_100_enhanced": {
    filename: "stainless_steels_051_100_enhanced.js",
    source_dir: "extracted/materials_enhanced/M_STAINLESS",
    category: "materials_enhanced",
    subcategory: "M_STAINLESS",
    lines: 18594,
    safety_class: "LOW",
    description: "Enhanced stainless steel 051-100 profile with extended cutting parameters",
    iso_group: "M"
  },

  // --- materials_enhanced/P_STEELS (12 files, ISO group P) ---
  "alloy_steels_065_100_enhanced": {
    filename: "alloy_steels_065_100_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 11549,
    safety_class: "LOW",
    description: "Enhanced alloy steel profile with extended cutting parameters",
    iso_group: "P"
  },
  "carbon_steels_011_020_enhanced": {
    filename: "carbon_steels_011_020_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 3148,
    safety_class: "LOW",
    description: "Enhanced carbon steel 011-020 profile with extended cutting parameters",
    iso_group: "P"
  },
  "carbon_steels_021_030_enhanced": {
    filename: "carbon_steels_021_030_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 3149,
    safety_class: "LOW",
    description: "Enhanced carbon steel 021-030 profile with extended cutting parameters",
    iso_group: "P"
  },
  "carbon_steels_031_040_enhanced": {
    filename: "carbon_steels_031_040_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 3144,
    safety_class: "LOW",
    description: "Enhanced carbon steel 031-040 profile with extended cutting parameters",
    iso_group: "P"
  },
  "carbon_steels_041_050_enhanced": {
    filename: "carbon_steels_041_050_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 3149,
    safety_class: "LOW",
    description: "Enhanced carbon steel 041-050 profile with extended cutting parameters",
    iso_group: "P"
  },
  "free_machining_steels_051_064_enhanced": {
    filename: "free_machining_steels_051_064_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 4580,
    safety_class: "LOW",
    description: "Enhanced free machining steel profile with extended cutting parameters",
    iso_group: "P"
  },
  "steels_151_200_enhanced": {
    filename: "steels_151_200_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 19735,
    safety_class: "LOW",
    description: "Enhanced steel 151-200 profile with extended cutting parameters",
    iso_group: "P"
  },
  "steels_201_250_enhanced": {
    filename: "steels_201_250_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 11801,
    safety_class: "LOW",
    description: "Enhanced steel 201-250 profile with extended cutting parameters",
    iso_group: "P"
  },
  "steels_251_300_enhanced": {
    filename: "steels_251_300_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 9654,
    safety_class: "LOW",
    description: "Enhanced steel 251-300 profile with extended cutting parameters",
    iso_group: "P"
  },
  "steels_301_350_enhanced": {
    filename: "steels_301_350_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 4465,
    safety_class: "LOW",
    description: "Enhanced steel 301-350 profile with extended cutting parameters",
    iso_group: "P"
  },
  "steels_351_400_enhanced": {
    filename: "steels_351_400_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 4765,
    safety_class: "LOW",
    description: "Enhanced steel 351-400 profile with extended cutting parameters",
    iso_group: "P"
  },
  "tool_steels_101_150_enhanced": {
    filename: "tool_steels_101_150_enhanced.js",
    source_dir: "extracted/materials_enhanced/P_STEELS",
    category: "materials_enhanced",
    subcategory: "P_STEELS",
    lines: 15315,
    safety_class: "LOW",
    description: "Enhanced tool steel profile with extended cutting parameters",
    iso_group: "P"
  }
};

// Export singleton instance
export const materialRegistry = new MaterialRegistry();
