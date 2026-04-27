/**
 * EspritFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM-FIDX-10
 *
 * Complete function index for ESPRIT (DP Technology / Hexagon).
 * Provides unified access to milling, turning, mill-turn, and Swiss
 * operations with full parameter documentation. Mirrors the
 * FunctionIndexEngine pattern shipped in U-CAM41..U-CAM48 + U-CAM-FIDX-09.
 *
 * Sections:
 *   - milling      (profitmilling_rough, pocket_rough, contour_finish,
 *                   z_level_finish, face_mill)
 *   - turning      (profitturning, rough_turn, finish_turn, thread, groove)
 *   - mill_turn    (live_tool_drill_cyl, live_tool_mill_face,
 *                   sub_spindle_handoff, balanced_cut)
 *   - swiss        (swiss_turn, back_work, thread_whirling,
 *                   polygon_turning)
 *
 * Catalogs are JSON, loaded once and cached.
 *
 * Reference: ESPRIT TNG Reference / Hexagon (DP Technology) public docs.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface EspritParameter {
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

export interface EspritOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count?: number;
  parameters: Record<string, Record<string, EspritParameter>>;
}

export interface EspritSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary?: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, EspritOperation>;
  training_topics?: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface EspritFunctionIndex {
  system_id: "esprit";
  sections: Record<string, EspritSection>;
  total_operations: number;
  total_parameters: number;
  categories: string[];
}

const SECTION_FILES: Array<{ file: string; key: string }> = [
  { file: "milling.json", key: "milling" },
  { file: "turning.json", key: "turning" },
  { file: "mill_turn.json", key: "mill_turn" },
  { file: "swiss.json", key: "swiss" },
];

export class EspritFunctionIndexEngine {
  private static index: EspritFunctionIndex | null = null;

  private static readonly DATA_DIR = join(
    __dirname,
    "../../data/cam-functions/esprit"
  );

  private static loadIndex(): EspritFunctionIndex {
    if (this.index) return this.index;

    const sections: Record<string, EspritSection> = {};
    let totalOps = 0;
    let totalParams = 0;
    const allCategories = new Set<string>();

    for (const { file, key } of SECTION_FILES) {
      const path = join(this.DATA_DIR, file);
      if (!existsSync(path)) continue;
      try {
        const data = JSON.parse(readFileSync(path, "utf-8")) as EspritSection;
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
          `EspritFunctionIndexEngine: failed to parse ${file}: ${(err as Error).message}`
        );
      }
    }

    this.index = {
      system_id: "esprit",
      sections,
      total_operations: totalOps,
      total_parameters: totalParams,
      categories: Array.from(allCategories),
    };

    return this.index;
  }

  /** Reset the cached index. Test-only helper for catalog hot-reload tests. */
  static resetCache(): void {
    this.index = null;
  }

  /** Returns the complete function index (cached). */
  static getIndex(): EspritFunctionIndex {
    return this.loadIndex();
  }

  /** Returns the list of section keys actually loaded from disk. */
  static listSections(): string[] {
    return Object.keys(this.loadIndex().sections);
  }

  /** Get a single section by key, or an error object if missing. */
  static getSection(
    sectionKey: string
  ): EspritSection | { error: string; available: string[] } {
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
    parameter: EspritParameter;
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
      parameter: EspritParameter;
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
   * Profit-family ops — ESPRIT's signature constant-engagement strategies
   * (ProfitMilling, ProfitTurning). Equivalent of HSM / Waveform on peers.
   */
  static getProfitOperations(): Array<{
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
        if (
          opId.startsWith("profit") ||
          op.display_name.toLowerCase().startsWith("profit") ||
          op.category === "high_efficiency"
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
   * Mill-turn / Swiss specialty ops — what makes ESPRIT distinctive.
   * Returns ops in the mill_turn or swiss sections.
   */
  static getMillTurnOperations(): Array<{
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
      if (sectionKey !== "mill_turn" && sectionKey !== "swiss") continue;
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

  /** Lookup a single operation by id, scanning all sections. */
  static getOperation(operationId: string):
    | { operation_id: string; section: string; operation: EspritOperation }
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
