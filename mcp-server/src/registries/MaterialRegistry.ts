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
  private indexByName: Map<string, string> = new Map();
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
      
      // Index by name (normalized for case-insensitive search)
      if (material.name) {
        const normalizedName = material.name.toLowerCase().trim().replace(/\s+/g, ' ');
        const existing = this.indexByName.get(normalizedName);
        if (existing && existing !== id) {
          log.warn(`[MaterialRegistry] Name collision: "${material.name}" (${id}) normalizes to same key as existing entry (${existing}) — keeping first entry`);
        } else {
          this.indexByName.set(normalizedName, id);
        }
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
    const idFromName = this.indexByName.get(normalizedSearch);
    if (idFromName) {
      return this.get(idFromName);
    }
    
    // Try partial name match - ALL words must be present
    const searchWords = identifier.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    for (const [name, id] of this.indexByName) {
      // Check if ALL search words are in the name
      if (searchWords.every(word => name.includes(word))) {
        return this.get(id);
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
        (m.mechanical?.hardness_hrc || 0) >= options.hardness_min! ||
        (m.mechanical?.hardness_hb || 0) >= options.hardness_min!
      );
    }
    
    if (options.hardness_max !== undefined) {
      results = results.filter(m => 
        (m.mechanical?.hardness_hrc || 999) <= options.hardness_max! ||
        (m.mechanical?.hardness_hb || 999) <= options.hardness_max!
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
    
    // Update indexes
    this.buildIndexes();
    
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
}

// Export singleton instance
export const materialRegistry = new MaterialRegistry();
