/**
 * EdgecamFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM-FIDX-09
 *
 * Complete function index for Edgecam (Vero / Hexagon).
 * Provides unified access to milling, turning, drilling and 5-axis operations
 * with full parameter documentation. Mirrors the FunctionIndexEngine pattern
 * already used for Mastercam, Fusion 360, InventorCAM/HSM, hyperMILL,
 * NXCAM, PowerMill, SolidCAM and CATIA (U-CAM41..U-CAM48).
 *
 * Sections:
 *   - milling      (rough_profile, rough_pocket, waveform_rough, finish_profile,
 *                   finish_pocket, face_mill)
 *   - turning      (rough_turn, finish_turn, groove, thread, drill_axial, part_off)
 *   - drilling     (drill, peck_drill, deep_hole, tap, ream)
 *   - five_axis    (indexed 3+2, swarf, contour, hole_drill)
 *
 * Catalogs are JSON, loaded once and cached.
 *
 * Reference: Edgecam 2024 R1 Reference / Vero Software (Hexagon) public docs.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface EdgecamParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
  value?: unknown;
}

export interface EdgecamOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count?: number;
  parameters: Record<string, Record<string, EdgecamParameter>>;
}

export interface EdgecamSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary?: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, EdgecamOperation>;
  training_topics?: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface EdgecamFunctionIndex {
  system_id: "edgecam";
  sections: Record<string, EdgecamSection>;
  total_operations: number;
  total_parameters: number;
  categories: string[];
}

const SECTION_FILES: Array<{ file: string; key: string }> = [
  { file: "milling.json", key: "milling" },
  { file: "turning.json", key: "turning" },
  { file: "drilling.json", key: "drilling" },
  { file: "five_axis.json", key: "five_axis" },
];

export class EdgecamFunctionIndexEngine {
  private static index: EdgecamFunctionIndex | null = null;

  private static readonly DATA_DIR = join(
    __dirname,
    "../../data/cam-functions/edgecam"
  );

  private static loadIndex(): EdgecamFunctionIndex {
    if (this.index) return this.index;

    const sections: Record<string, EdgecamSection> = {};
    let totalOps = 0;
    let totalParams = 0;
    const allCategories = new Set<string>();

    for (const { file, key } of SECTION_FILES) {
      const path = join(this.DATA_DIR, file);
      if (!existsSync(path)) continue;
      try {
        const data = JSON.parse(readFileSync(path, "utf-8")) as EdgecamSection;
        sections[key] = data;

        const ops = Object.keys(data.operations || {}).length;
        totalOps += ops;

        if (typeof data.summary?.total_parameters === "number") {
          totalParams += data.summary.total_parameters;
        } else {
          for (const op of Object.values(data.operations || {})) {
            for (const group of Object.values(op.parameters || {})) {
              totalParams += Object.keys(group).length;
            }
          }
        }

        if (data.summary?.categories) {
          for (const c of data.summary.categories) allCategories.add(c);
        }
      } catch (err) {
        // Bad section JSON — leave it out, surface in summary by absence
        throw new Error(
          `EdgecamFunctionIndexEngine: failed to parse ${file}: ${(err as Error).message}`
        );
      }
    }

    this.index = {
      system_id: "edgecam",
      sections,
      total_operations: totalOps,
      total_parameters: totalParams,
      categories: Array.from(allCategories),
    };

    return this.index;
  }

  /**
   * Reset the cached index. Test-only helper for catalog hot-reload tests.
   */
  static resetCache(): void {
    this.index = null;
  }

  /**
   * Returns the complete function index (cached).
   */
  static getIndex(): EdgecamFunctionIndex {
    return this.loadIndex();
  }

  /**
   * Returns the list of section keys actually loaded from disk.
   */
  static listSections(): string[] {
    return Object.keys(this.loadIndex().sections);
  }

  /**
   * Get a single section by key, or an error object if missing.
   */
  static getSection(
    sectionKey: string
  ): EdgecamSection | { error: string; available: string[] } {
    const idx = this.loadIndex();
    const section = idx.sections[sectionKey];
    if (!section) {
      return {
        error: `Section '${sectionKey}' not found`,
        available: Object.keys(idx.sections),
      };
    }
    return section;
  }

  /**
   * List every operation across every section.
   */
  static listOperations(): Array<{
    operation_id: string;
    display_name: string;
    section: string;
    category: string;
  }> {
    const idx = this.loadIndex();
    const out: Array<{
      operation_id: string;
      display_name: string;
      section: string;
      category: string;
    }> = [];
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        out.push({
          operation_id: opId,
          display_name: op.display_name,
          section: sectionKey,
          category: op.category,
        });
      }
    }
    return out;
  }

  /**
   * Find every parameter whose name contains the query (case-insensitive),
   * across every operation and group.
   */
  static findParameter(parameterName: string): Array<{
    operation_id: string;
    section: string;
    group: string;
    parameter_name: string;
    parameter: EdgecamParameter;
  }> {
    if (!parameterName || typeof parameterName !== "string") {
      throw new Error("findParameter: parameterName must be a non-empty string");
    }
    const needle = parameterName.toLowerCase();
    const out: Array<{
      operation_id: string;
      section: string;
      group: string;
      parameter_name: string;
      parameter: EdgecamParameter;
    }> = [];

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        for (const [groupName, group] of Object.entries(op.parameters || {})) {
          for (const [paramName, param] of Object.entries(group)) {
            if (paramName.toLowerCase().includes(needle)) {
              out.push({
                operation_id: opId,
                section: sectionKey,
                group: groupName,
                parameter_name: paramName,
                parameter: param,
              });
            }
          }
        }
      }
    }
    return out;
  }

  /**
   * Search parameters by name or description (case-insensitive),
   * stopping at `limit` matches.
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
    if (!query || typeof query !== "string") {
      throw new Error("searchParameters: query must be a non-empty string");
    }
    const safeLimit = Math.max(1, Math.min(500, Math.floor(limit) || 20));
    const needle = query.toLowerCase();
    const out: Array<{
      operation_id: string;
      section: string;
      parameter_name: string;
      description?: string;
    }> = [];

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        for (const group of Object.values(op.parameters || {})) {
          for (const [paramName, param] of Object.entries(group)) {
            const nameMatch = paramName.toLowerCase().includes(needle);
            const descMatch = param.description
              ?.toLowerCase()
              .includes(needle);
            if (nameMatch || descMatch) {
              out.push({
                operation_id: opId,
                section: sectionKey,
                parameter_name: paramName,
                description: param.description,
              });
              if (out.length >= safeLimit) return out;
            }
          }
        }
      }
    }
    return out;
  }

  /**
   * Operations matching a category (case-insensitive substring).
   */
  static getOperationsByCategory(category: string): Array<{
    operation_id: string;
    display_name: string;
    section: string;
    description: string;
  }> {
    if (!category || typeof category !== "string") {
      throw new Error("getOperationsByCategory: category must be a non-empty string");
    }
    const needle = category.toLowerCase();
    const out: Array<{
      operation_id: string;
      display_name: string;
      section: string;
      description: string;
    }> = [];

    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        if (op.category.toLowerCase().includes(needle)) {
          out.push({
            operation_id: opId,
            display_name: op.display_name,
            section: sectionKey,
            description: op.description,
          });
        }
      }
    }
    return out;
  }

  /**
   * High-level summary statistics — what the dashboard surfaces.
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
   * Edgecam Waveform Roughing — return all waveform / high-efficiency operations.
   * Equivalent of "HSM toolpaths" surfaces on Mastercam/Fusion FunctionIndex engines.
   */
  static getWaveformOperations(): Array<{
    operation_id: string;
    display_name: string;
    section: string;
    description: string;
  }> {
    const idx = this.loadIndex();
    const out: Array<{
      operation_id: string;
      display_name: string;
      section: string;
      description: string;
    }> = [];
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      for (const [opId, op] of Object.entries(section.operations || {})) {
        const cat = op.category.toLowerCase();
        const name = op.display_name.toLowerCase();
        if (
          opId.includes("waveform") ||
          name.includes("waveform") ||
          cat === "high_efficiency" ||
          cat.includes("constant_engagement")
        ) {
          out.push({
            operation_id: opId,
            display_name: op.display_name,
            section: sectionKey,
            description: op.description,
          });
        }
      }
    }
    return out;
  }

  /**
   * Lookup a single operation by id, scanning all sections.
   */
  static getOperation(operationId: string):
    | {
        operation_id: string;
        section: string;
        operation: EdgecamOperation;
      }
    | { error: string } {
    if (!operationId || typeof operationId !== "string") {
      throw new Error("getOperation: operationId must be a non-empty string");
    }
    const idx = this.loadIndex();
    for (const [sectionKey, section] of Object.entries(idx.sections)) {
      const op = section.operations?.[operationId];
      if (op) {
        return {
          operation_id: operationId,
          section: sectionKey,
          operation: op,
        };
      }
    }
    return { error: `Operation '${operationId}' not found` };
  }

  /**
   * Training topics for a section.
   */
  static getTrainingTopics(sectionKey: string): Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }> {
    const section = this.getSection(sectionKey);
    if ("error" in section) return [];
    return section.training_topics || [];
  }
}
