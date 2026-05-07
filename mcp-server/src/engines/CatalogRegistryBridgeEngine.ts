/**
 * CatalogRegistryBridgeEngine — Bridge extracted catalog data into PRISM registries
 *
 * RX-P5-U02: Registry enrichment — merge extracted data into existing registries
 *
 * Handles 47+ catalog files → ToolRegistry, MachineRegistry, MaterialRegistry
 *
 * @module engines/CatalogRegistryBridgeEngine
 */

import { toolRegistry, CuttingTool, ToolGeometry, ToolPerformance } from "../registries/ToolRegistry.js";
import { machineRegistry } from "../registries/MachineRegistry.js";
import { materialRegistry } from "../registries/MaterialRegistry.js";

// ============================================================================
// TYPES
// ============================================================================

export interface CatalogEnrichmentResult {
  catalog_name: string;
  registry_target: "tool" | "machine" | "material";
  records_processed: number;
  records_added: number;
  records_enhanced: number;
  records_skipped: number;
  errors: string[];
  processing_time_ms: number;
}

export interface BulkEnrichmentResult {
  catalogs_processed: number;
  total_records: number;
  total_added: number;
  total_enhanced: number;
  total_skipped: number;
  total_errors: number;
  results: CatalogEnrichmentResult[];
  processing_time_ms: number;
}

export interface CatalogMapping {
  catalog_file: string;
  registry: "tool" | "machine" | "material";
  id_field: string;
  field_mappings: Record<string, string | ((src: any) => any)>;
}

// ============================================================================
// CATALOG MAPPINGS
// ============================================================================

const TOOL_CATALOG_MAPPINGS: CatalogMapping[] = [
  {
    catalog_file: "sgs-tool-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: "description",
      type: (src: any) => src.tool_type || "endmill",
      manufacturer: () => "SGS",
      catalog_number: "part_number",
      substrate: "substrate",
      coating_type: "coating",
      "geometry.diameter": "diameter_mm",
      "geometry.flute_length": "flute_length_mm",
      "geometry.overall_length": "overall_length_mm",
      "geometry.flutes": "flute_count",
      "geometry.helix_angle": "helix_angle_deg",
      "geometry.corner_radius": "corner_radius_mm",
    },
  },
  {
    catalog_file: "sandvik-tool-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: "description",
      type: (src: any) => src.tool_type || src.category || "endmill",
      manufacturer: () => "Sandvik Coromant",
      catalog_number: "part_number",
      substrate: "substrate",
      grade: "grade",
      coating_type: "coating",
      "geometry.diameter": "cutting_diameter_mm",
      "geometry.flutes": "flute_count",
      material_groups: "material_compatibility",
    },
  },
  {
    catalog_file: "kennametal-turning-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: "description",
      type: () => "insert",
      manufacturer: () => "Kennametal",
      catalog_number: "part_number",
      grade: "grade",
      coating_type: "coating",
      application: "application",
    },
  },
  {
    catalog_file: "tungaloy-endmill-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: (src: any) => src.description || `Tungaloy ${src.series} ${src.diameter_mm}mm`,
      type: () => "endmill",
      manufacturer: () => "Tungaloy",
      catalog_number: "part_number",
      grade: "grade",
      coating_type: "coating",
      "geometry.diameter": "diameter_mm",
      "geometry.flutes": "flute_count",
      "geometry.helix_angle": "helix_angle_deg",
      "geometry.overall_length": "overall_length_mm",
      "geometry.flute_length": "flute_length_mm",
    },
  },
  {
    catalog_file: "osg-tool-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: "description",
      type: (src: any) => src.tool_type || "endmill",
      manufacturer: () => "OSG",
      catalog_number: "part_number",
      coating_type: "coating",
      "geometry.diameter": "diameter_mm",
      "geometry.flutes": "flute_count",
    },
  },
  {
    catalog_file: "guhring-tool-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: "description",
      type: (src: any) => src.tool_type || "drill",
      manufacturer: () => "Guhring",
      catalog_number: "part_number",
      coating_type: "coating",
      "geometry.diameter": "diameter_mm",
      "geometry.overall_length": "overall_length_mm",
      "geometry.point_angle": "point_angle_deg",
    },
  },
  {
    catalog_file: "seco-tool-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: "description",
      type: (src: any) => src.tool_type || "insert",
      manufacturer: () => "Seco Tools",
      catalog_number: "part_number",
      grade: "grade",
      coating_type: "coating",
    },
  },
  {
    catalog_file: "mitsubishi-tool-catalog",
    registry: "tool",
    id_field: "part_number",
    field_mappings: {
      name: "description",
      type: (src: any) => src.tool_type || "insert",
      manufacturer: () => "Mitsubishi",
      catalog_number: "part_number",
      grade: "grade",
      coating_type: "coating",
    },
  },
];

const MACHINE_CATALOG_MAPPINGS: CatalogMapping[] = [
  {
    catalog_file: "machine-profiles-catalog",
    registry: "machine",
    id_field: "id",
    field_mappings: {
      name: "name",
      manufacturer: "manufacturer",
      model: "model",
      type: "machine_type",
      "specs.x_travel_mm": "x_travel_mm",
      "specs.y_travel_mm": "y_travel_mm",
      "specs.z_travel_mm": "z_travel_mm",
      "specs.max_rpm": "max_spindle_rpm",
      "specs.spindle_power_kw": "spindle_power_kw",
      "specs.spindle_torque_nm": "spindle_torque_nm",
      "specs.rapid_xy_mpm": "rapid_xy_mpm",
      "specs.rapid_z_mpm": "rapid_z_mpm",
      "specs.tool_capacity": "tool_capacity",
      controller: "controller",
    },
  },
];

// ============================================================================
// ENGINE
// ============================================================================

export class CatalogRegistryBridgeEngine {
  private catalogs: Map<string, any[]> = new Map();

  /**
   * Load a catalog module and cache its data
   */
  async loadCatalog(catalogName: string): Promise<any[]> {
    if (this.catalogs.has(catalogName)) {
      return this.catalogs.get(catalogName)!;
    }

    try {
      const mod = await import(`../data/${catalogName}.js`);
      const data = this.extractCatalogData(mod);
      this.catalogs.set(catalogName, data);
      return data;
    } catch (e) {
      return [];
    }
  }

  /**
   * Extract array data from catalog module export
   */
  private extractCatalogData(mod: any): any[] {
    // Try common export patterns
    if (Array.isArray(mod.default)) return mod.default;
    if (mod.tools && Array.isArray(mod.tools)) return mod.tools;
    if (mod.catalog && Array.isArray(mod.catalog)) return mod.catalog;
    if (mod.entries && Array.isArray(mod.entries)) return mod.entries;
    if (mod.data && Array.isArray(mod.data)) return mod.data;
    if (mod.machines && Array.isArray(mod.machines)) return mod.machines;
    if (mod.profiles && Array.isArray(mod.profiles)) return mod.profiles;
    if (mod.materials && Array.isArray(mod.materials)) return mod.materials;

    // Try first array-valued export
    for (const key of Object.keys(mod)) {
      if (Array.isArray(mod[key]) && mod[key].length > 0) {
        return mod[key];
      }
    }

    return [];
  }

  /**
   * Enrich a single catalog into its target registry
   */
  async enrichFromCatalog(mapping: CatalogMapping): Promise<CatalogEnrichmentResult> {
    const start = Date.now();
    const result: CatalogEnrichmentResult = {
      catalog_name: mapping.catalog_file,
      registry_target: mapping.registry,
      records_processed: 0,
      records_added: 0,
      records_enhanced: 0,
      records_skipped: 0,
      errors: [],
      processing_time_ms: 0,
    };

    const data = await this.loadCatalog(mapping.catalog_file);
    if (data.length === 0) {
      result.errors.push(`No data found in catalog ${mapping.catalog_file}`);
      result.processing_time_ms = Date.now() - start;
      return result;
    }

    for (const record of data) {
      result.records_processed++;
      try {
        const id = this.extractField(record, mapping.id_field);
        if (!id) {
          result.records_skipped++;
          continue;
        }

        const mapped = this.applyMapping(record, mapping);
        mapped.id = String(id);

        if (mapping.registry === "tool") {
          await this.enrichToolRegistry(mapped, result);
        } else if (mapping.registry === "machine") {
          await this.enrichMachineRegistry(mapped, result);
        } else if (mapping.registry === "material") {
          await this.enrichMaterialRegistry(mapped, result);
        }
      } catch (e: any) {
        result.errors.push(`Record error: ${e.message}`);
        result.records_skipped++;
      }
    }

    result.processing_time_ms = Date.now() - start;
    return result;
  }

  /**
   * Apply field mappings to transform catalog record → registry format
   */
  private applyMapping(record: any, mapping: CatalogMapping): any {
    const result: any = {};

    for (const [targetField, sourceMapping] of Object.entries(mapping.field_mappings)) {
      let value: any;

      if (typeof sourceMapping === "function") {
        value = sourceMapping(record);
      } else {
        value = this.extractField(record, sourceMapping);
      }

      if (value !== undefined && value !== null) {
        this.setNestedField(result, targetField, value);
      }
    }

    return result;
  }

  /**
   * Extract field from record (supports dot notation)
   */
  private extractField(record: any, field: string): any {
    const parts = field.split(".");
    let current = record;
    for (const part of parts) {
      if (current === undefined || current === null) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Set nested field in object (supports dot notation)
   */
  private setNestedField(obj: any, field: string, value: any): void {
    const parts = field.split(".");
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) current[part] = {};
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  }

  /**
   * Enrich tool registry with mapped record
   */
  private async enrichToolRegistry(mapped: any, result: CatalogEnrichmentResult): Promise<void> {
    const existing = toolRegistry.get(mapped.id);
    if (existing) {
      await toolRegistry.enhanceTool(mapped.id, mapped, "catalog-bridge");
      result.records_enhanced++;
    } else {
      // Build minimal valid CuttingTool
      const tool: CuttingTool = this.buildCuttingTool(mapped);
      await toolRegistry.addTool(tool, "CATALOG");
      result.records_added++;
    }
  }

  /**
   * Build valid CuttingTool from mapped data
   */
  private buildCuttingTool(mapped: any): CuttingTool {
    const defaultGeometry: ToolGeometry = {
      diameter: mapped.geometry?.diameter || 10,
      overall_length: mapped.geometry?.overall_length || 75,
      flute_length: mapped.geometry?.flute_length || 25,
      shank_diameter: mapped.geometry?.shank_diameter || mapped.geometry?.diameter || 10,
      flutes: mapped.geometry?.flutes || 4,
      helix_angle: mapped.geometry?.helix_angle || 30,
      rake_angle: mapped.geometry?.rake_angle || 12,
      relief_angle: mapped.geometry?.relief_angle || 8,
      corner_radius: mapped.geometry?.corner_radius,
      point_angle: mapped.geometry?.point_angle,
    };

    const defaultPerformance: ToolPerformance = {
      recommendations: {},
      expected_life_minutes: 60,
      wear_pattern: "normal",
      max_speed_sfm: 500,
      max_feed_ipt: 0.015,
      max_radial_engagement: 100,
      max_axial_engagement: 100,
      achievable_surface_finish: 1.6,
      achievable_tolerance: "IT8",
    };

    return {
      id: mapped.id,
      name: mapped.name || `Tool ${mapped.id}`,
      type: mapped.type || "endmill",
      manufacturer: mapped.manufacturer || "Unknown",
      catalog_number: mapped.catalog_number || mapped.id,
      substrate: mapped.substrate || "carbide",
      grade: mapped.grade || "K10",
      coating: mapped.coating_type,
      geometry: { ...defaultGeometry, ...mapped.geometry },
      performance: defaultPerformance,
      material_groups: mapped.material_groups || ["P", "M", "K"],
      application: mapped.application || ["general"],
      layer: "CATALOG",
    };
  }

  /**
   * Enrich machine registry with mapped record
   */
  private async enrichMachineRegistry(mapped: any, result: CatalogEnrichmentResult): Promise<void> {
    const existing = machineRegistry.get(mapped.id);
    if (existing) {
      machineRegistry.set(mapped.id, { ...existing, ...mapped }, "catalog-bridge");
      result.records_enhanced++;
    } else {
      machineRegistry.set(mapped.id, mapped, "catalog-bridge");
      result.records_added++;
    }
  }

  /**
   * Enrich material registry with mapped record
   */
  private async enrichMaterialRegistry(mapped: any, result: CatalogEnrichmentResult): Promise<void> {
    const existing = materialRegistry.get(mapped.id);
    if (existing) {
      materialRegistry.set(mapped.id, { ...existing, ...mapped }, "catalog-bridge");
      result.records_enhanced++;
    } else {
      materialRegistry.set(mapped.id, mapped, "catalog-bridge");
      result.records_added++;
    }
  }

  /**
   * Bulk enrich all configured catalogs
   */
  async enrichAll(): Promise<BulkEnrichmentResult> {
    const start = Date.now();
    const allMappings = [...TOOL_CATALOG_MAPPINGS, ...MACHINE_CATALOG_MAPPINGS];

    const results: CatalogEnrichmentResult[] = [];
    let totalAdded = 0;
    let totalEnhanced = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let totalRecords = 0;

    for (const mapping of allMappings) {
      const result = await this.enrichFromCatalog(mapping);
      results.push(result);
      totalRecords += result.records_processed;
      totalAdded += result.records_added;
      totalEnhanced += result.records_enhanced;
      totalSkipped += result.records_skipped;
      totalErrors += result.errors.length;
    }

    return {
      catalogs_processed: allMappings.length,
      total_records: totalRecords,
      total_added: totalAdded,
      total_enhanced: totalEnhanced,
      total_skipped: totalSkipped,
      total_errors: totalErrors,
      results,
      processing_time_ms: Date.now() - start,
    };
  }

  /**
   * Get catalog mappings summary
   */
  getCatalogMappings(): { tool: number; machine: number; material: number } {
    return {
      tool: TOOL_CATALOG_MAPPINGS.length,
      machine: MACHINE_CATALOG_MAPPINGS.length,
      material: 0,
    };
  }

  /**
   * Get specific catalog mapping by name
   */
  getMapping(catalogName: string): CatalogMapping | undefined {
    return [...TOOL_CATALOG_MAPPINGS, ...MACHINE_CATALOG_MAPPINGS].find(
      (m) => m.catalog_file === catalogName
    );
  }

  /**
   * List all mapped catalogs
   */
  listMappedCatalogs(): string[] {
    return [...TOOL_CATALOG_MAPPINGS, ...MACHINE_CATALOG_MAPPINGS].map((m) => m.catalog_file);
  }
}

export const catalogRegistryBridgeEngine = new CatalogRegistryBridgeEngine();
