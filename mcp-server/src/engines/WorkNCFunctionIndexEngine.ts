/**
 * WorkNCFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM-FIDX-12
 *
 * Complete function index for WorkNC (Vero / Hexagon Manufacturing
 * Intelligence). Mold/die specialist with distinctive features —
 * Auto5 (3+2 conversion), Vortex (licensed Delcam HSM roughing),
 * Pencil tracing, EDM pocket prep.
 *
 * Sections:
 *   - mold_die    (global_roughing, vortex_rough, rest_rough,
 *                  core_cavity_finish, edm_pocket)
 *   - hsm         (scallop_finish, z_level_finish, pencil_trace,
 *                  rib_machining)
 *   - five_axis   (auto5_3plus2 flagship, five_axis_swarf,
 *                  five_axis_drive_curve, five_axis_drill_indexed)
 *   - drilling    (drill, peck_drill, tap, ream)
 *
 * Catalogs are JSON, loaded once and cached.
 *
 * Reference: WorkNC 2024 Reference / Vero / Hexagon Mfg Intelligence.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface WorkNCParameter {
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

export interface WorkNCOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count?: number;
  parameters: Record<string, Record<string, WorkNCParameter>>;
}

export interface WorkNCSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary?: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, WorkNCOperation>;
  training_topics?: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface WorkNCFunctionIndex {
  system_id: "worknc";
  sections: Record<string, WorkNCSection>;
  total_operations: number;
  total_parameters: number;
  categories: string[];
}

const SECTION_FILES: Array<{ file: string; key: string }> = [
  { file: "mold_die.json", key: "mold_die" },
  { file: "hsm.json", key: "hsm" },
  { file: "five_axis.json", key: "five_axis" },
  { file: "drilling.json", key: "drilling" },
];

export class WorkNCFunctionIndexEngine {
  private static index: WorkNCFunctionIndex | null = null;

  private static readonly DATA_DIR = join(
    __dirname,
    "../../data/cam-functions/worknc"
  );

  private static loadIndex(): WorkNCFunctionIndex {
    if (this.index) return this.index;

    const sections: Record<string, WorkNCSection> = {};
    let totalOps = 0;
    let totalParams = 0;
    const allCategories = new Set<string>();

    for (const { file, key } of SECTION_FILES) {
      const path = join(this.DATA_DIR, file);
      if (!existsSync(path)) continue;
      try {
        const data = JSON.parse(readFileSync(path, "utf-8")) as WorkNCSection;
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
        throw new Error(
          `WorkNCFunctionIndexEngine: failed to parse ${file}: ${(err as Error).message}`
        );
      }
    }

    this.index = {
      system_id: "worknc",
      sections,
      total_operations: totalOps,
      total_parameters: totalParams,
      categories: Array.from(allCategories),
    };

    return this.index;
  }

  /** Reset the cached index. Test-only helper. */
  static resetCache(): void {
    this.index = null;
  }

  /** Returns the complete function index (cached). */
  static getIndex(): WorkNCFunctionIndex {
    return this.loadIndex();
  }

  /** Returns the list of section keys actually loaded from disk. */
  static listSections(): string[] {
    return Object.keys(this.loadIndex().sections);
  }

  /** Get a single section by key, or an error object if missing. */
  static getSection(
    sectionKey: string
  ): WorkNCSection | { error: string; available: string[] } {
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

  /** List every operation across every section. */
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

  /** Find every parameter whose name contains the query (case-insensitive). */
  static findParameter(parameterName: string): Array<{
    operation_id: string;
    section: string;
    group: string;
    parameter_name: string;
    parameter: WorkNCParameter;
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
      parameter: WorkNCParameter;
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

  /** Search parameters by name or description; clamped limit. */
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
            const descMatch = param.description?.toLowerCase().includes(needle);
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

  /** Operations matching a category (case-insensitive substring). */
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

  /** Summary statistics for the dashboard. */
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
   * Auto5 + 5-axis operations — WorkNC's distinctive 3+2 auto-conversion
   * surface plus simultaneous 5-axis. Equivalent of HSM-toolpaths surface
   * on peers.
   */
  static getAuto5Operations(): Array<{
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
    const fa = idx.sections["five_axis"];
    if (!fa) return out;
    for (const [opId, op] of Object.entries(fa.operations || {})) {
      out.push({
        operation_id: opId,
        display_name: op.display_name,
        section: "five_axis",
        description: op.description,
      });
    }
    return out;
  }

  /**
   * Mold/die specialty operations — WorkNC's home turf.
   */
  static getMoldDieOperations(): Array<{
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
    const md = idx.sections["mold_die"];
    if (!md) return out;
    for (const [opId, op] of Object.entries(md.operations || {})) {
      out.push({
        operation_id: opId,
        display_name: op.display_name,
        section: "mold_die",
        category: op.category,
      });
    }
    return out;
  }

  /** Lookup a single operation by id, scanning all sections. */
  static getOperation(operationId: string):
    | { operation_id: string; section: string; operation: WorkNCOperation }
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

  /** Training topics for a section. */
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
