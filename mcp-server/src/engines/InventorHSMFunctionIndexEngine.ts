/**
 * InventorHSMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM26
 *
 * Complete function index for Inventor HSM / InventorCAM.
 * Provides unified access to all 2.5D milling operations, 3D HSM, multi-axis,
 * turning, and drilling capabilities with full parameter documentation.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface InventorHSMParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

export interface InventorHSMOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count?: number;
  parameters: Record<string, Record<string, InventorHSMParameter>>;
}

export interface InventorHSMSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary?: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, InventorHSMOperation>;
  training_topics?: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface InventorHSMCatalog {
  meta: {
    title: string;
    version: string;
    generated: string;
    total_parameters: number;
    total_operations: number;
  };
  operations: Record<string, Record<string, InventorHSMOperation>>;
}

export interface InventorHSMFunctionIndex {
  system_id: "inventor-hsm";
  sections: Record<string, InventorHSMSection>;
  total_operations: number;
  total_parameters: number;
  categories: string[];
}

export class InventorHSMFunctionIndexEngine {
  private static index: InventorHSMFunctionIndex | null = null;
  private static catalog: InventorHSMCatalog | null = null;

  private static readonly DATA_DIR = join(
    __dirname,
    "../../data/cam-functions/inventor-hsm"
  );

  private static loadIndex(): InventorHSMFunctionIndex {
    if (this.index) return this.index;

    const sections: Record<string, InventorHSMSection> = {};
    let totalOps = 0;
    let totalParams = 0;
    const allCategories = new Set<string>();

    const files = [
      { file: "2.5d-milling.json", key: "2.5d_milling" },
      { file: "3d-hsm.json", key: "3d_hsm" },
      { file: "multi-axis.json", key: "multi_axis" },
      { file: "turning.json", key: "turning" },
      { file: "drilling.json", key: "drilling" },
    ];

    for (const { file, key } of files) {
      const path = join(this.DATA_DIR, file);
      if (existsSync(path)) {
        try {
          const data = JSON.parse(
            readFileSync(path, "utf-8")
          ) as InventorHSMSection;
          sections[key] = data;

          const ops = Object.keys(data.operations || {}).length;
          totalOps += ops;

          if (data.summary?.total_parameters) {
            totalParams += data.summary.total_parameters;
          } else {
            for (const op of Object.values(data.operations || {})) {
              for (const group of Object.values(op.parameters || {})) {
                totalParams += Object.keys(group).length;
              }
            }
          }

          if (data.summary?.categories) {
            data.summary.categories.forEach((c) => allCategories.add(c));
          }
        } catch {
          // Section file not yet created
        }
      }
    }

    // Also load from complete catalog if exists
    const catalogPath = join(
      this.DATA_DIR,
      "INVENTOR_HSM_COMPLETE_PARAMETER_CATALOG.json"
    );
    if (existsSync(catalogPath) && totalOps === 0) {
      try {
        this.catalog = JSON.parse(
          readFileSync(catalogPath, "utf-8")
        ) as InventorHSMCatalog;
        if (this.catalog.meta) {
          totalOps = this.catalog.meta.total_operations || 0;
          totalParams = this.catalog.meta.total_parameters || 0;
        }
      } catch {
        // Catalog load error
      }
    }

    this.index = {
      system_id: "inventor-hsm",
      sections,
      total_operations: totalOps,
      total_parameters: totalParams,
      categories: Array.from(allCategories),
    };

    return this.index;
  }

  private static loadCatalog(): InventorHSMCatalog | null {
    if (this.catalog) return this.catalog;

    const path = join(
      this.DATA_DIR,
      "INVENTOR_HSM_COMPLETE_PARAMETER_CATALOG.json"
    );
    if (existsSync(path)) {
      try {
        this.catalog = JSON.parse(
          readFileSync(path, "utf-8")
        ) as InventorHSMCatalog;
        return this.catalog;
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Get the complete function index
   */
  static getIndex(): InventorHSMFunctionIndex {
    return this.loadIndex();
  }

  /**
   * List all available sections
   */
  static listSections(): string[] {
    const idx = this.loadIndex();
    return Object.keys(idx.sections);
  }

  /**
   * Get a specific section by key
   */
  static getSection(
    sectionKey: string
  ): InventorHSMSection | { error: string } {
    const idx = this.loadIndex();
    const section = idx.sections[sectionKey];
    if (!section) {
      // Try from catalog
      const catalog = this.loadCatalog();
      if (catalog?.operations?.[sectionKey]) {
        return {
          schemaVersion: 1,
          system_id: "inventor-hsm",
          section_key: sectionKey,
          operations: catalog.operations[sectionKey],
        };
      }
      return {
        error: `Section '${sectionKey}' not found. Available: ${Object.keys(idx.sections).join(", ")}`,
      };
    }
    return section;
  }

  /**
   * List all operations across all sections
   */
  static listOperations(): Array<{
    operation_id: string;
    display_name: string;
    section: string;
    category: string;
  }> {
    const results: Array<{
      operation_id: string;
      display_name: string;
      section: string;
      category: string;
    }> = [];

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        results.push({
          operation_id: opId,
          display_name: op.display_name,
          section: sectionKey,
          category: op.category,
        });
      }
    }

    // Also include from catalog if sections empty
    const catalog = this.loadCatalog();
    if (results.length === 0 && catalog?.operations) {
      for (const [sectionKey, ops] of Object.entries(catalog.operations)) {
        for (const [opId, op] of Object.entries(ops)) {
          results.push({
            operation_id: opId,
            display_name: op.display_name,
            section: sectionKey,
            category: op.category,
          });
        }
      }
    }

    return results;
  }

  /**
   * Find a parameter by name across all operations
   */
  static findParameter(parameterName: string): Array<{
    operation_id: string;
    section: string;
    group: string;
    parameter: InventorHSMParameter;
  }> {
    const results: Array<{
      operation_id: string;
      section: string;
      group: string;
      parameter: InventorHSMParameter;
    }> = [];
    const lowerName = parameterName.toLowerCase();

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        for (const [groupName, group] of Object.entries(op.parameters || {})) {
          for (const [paramName, param] of Object.entries(group)) {
            if (paramName.toLowerCase().includes(lowerName)) {
              results.push({
                operation_id: opId,
                section: sectionKey,
                group: groupName,
                parameter: { ...param, name: paramName } as InventorHSMParameter & { name: string },
              });
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Search parameters by partial match
   */
  static searchParameters(
    query: string,
    limit = 20
  ): Array<{
    operation_id: string;
    section: string;
    parameter_name: string;
    description?: string;
  }> {
    const results: Array<{
      operation_id: string;
      section: string;
      parameter_name: string;
      description?: string;
    }> = [];
    const lowerQuery = query.toLowerCase();

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        for (const group of Object.values(op.parameters || {})) {
          for (const [paramName, param] of Object.entries(group)) {
            const nameMatch = paramName.toLowerCase().includes(lowerQuery);
            const descMatch = param.description
              ?.toLowerCase()
              .includes(lowerQuery);
            if (nameMatch || descMatch) {
              results.push({
                operation_id: opId,
                section: sectionKey,
                parameter_name: paramName,
                description: param.description,
              });
              if (results.length >= limit) return results;
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Get operations by category
   */
  static getOperationsByCategory(category: string): Array<{
    operation_id: string;
    display_name: string;
    section: string;
    description: string;
  }> {
    const results: Array<{
      operation_id: string;
      display_name: string;
      section: string;
      description: string;
    }> = [];
    const lowerCat = category.toLowerCase();

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        if (op.category.toLowerCase().includes(lowerCat)) {
          results.push({
            operation_id: opId,
            display_name: op.display_name,
            section: sectionKey,
            description: op.description,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get summary statistics
   */
  static getSummary(): {
    system_id: string;
    total_sections: number;
    total_operations: number;
    total_parameters: number;
    sections: Array<{ key: string; operations: number }>;
    categories: string[];
  } {
    const idx = this.loadIndex();
    const sectionStats: Array<{ key: string; operations: number }> = [];

    for (const [key, section] of Object.entries(idx.sections)) {
      sectionStats.push({
        key,
        operations: Object.keys(section.operations || {}).length,
      });
    }

    return {
      system_id: idx.system_id,
      total_sections: Object.keys(idx.sections).length,
      total_operations: idx.total_operations,
      total_parameters: idx.total_parameters,
      sections: sectionStats,
      categories: idx.categories,
    };
  }

  /**
   * Get HSM-capable operations (adaptive clearing)
   */
  static getHSMOperations(): Array<{
    operation_id: string;
    display_name: string;
    section: string;
    description: string;
  }> {
    const results: Array<{
      operation_id: string;
      display_name: string;
      section: string;
      description: string;
    }> = [];

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        if (
          opId.includes("adaptive") ||
          op.display_name.toLowerCase().includes("adaptive") ||
          op.description.toLowerCase().includes("constant engagement")
        ) {
          results.push({
            operation_id: opId,
            display_name: op.display_name,
            section: sectionKey,
            description: op.description,
          });
        }
      }
    }

    return results;
  }

  /**
   * Get 2.5D milling operations
   */
  static get25DOperations(): Array<{
    operation_id: string;
    display_name: string;
    category: string;
    parameter_count: number;
  }> {
    const section = this.getSection("2.5d_milling");
    if ("error" in section) return [];

    return Object.entries(section.operations || {}).map(([opId, op]) => ({
      operation_id: opId,
      display_name: op.display_name,
      category: op.category,
      parameter_count: op.parameter_count || 0,
    }));
  }

  /**
   * Get training topics for a section
   */
  static getTrainingTopics(
    sectionKey: string
  ): Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }> {
    const section = this.getSection(sectionKey);
    if ("error" in section) return [];
    return section.training_topics || [];
  }
}
