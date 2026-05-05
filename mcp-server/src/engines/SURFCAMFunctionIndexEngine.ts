/**
 * SURFCAMFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM51
 *
 * Complete function index for SURFCAM (Hexagon — Vero Software, formerly
 * Surfware). Distinctive: TrueMill™ HSM strategy with patented
 * constant-engagement-angle (CEA) trochoidal toolpaths
 * (US Patent 6,648,560). 4-7x feedrate over conventional pocket on
 * hardened steels and nickel alloys.
 *
 * Sections:
 *   - milling_2d  (pocket_2d, contour_2d, drill_2d, slot_2d, face_2d)
 *   - milling_3d  (zlevel_rough_3d, parallel_finish_3d, scallop_3d, rest_mill_3d)
 *   - turning     (turn_rough, turn_finish, groove, thread, cutoff)
 *   - truemill    (truemill_pocket, truemill_profile, truemill_rest)  ← flagship
 *
 * Reference: SURFCAM 2024 Reference (Vero Software / Hexagon Manufacturing
 * Intelligence) + SURFCAM Velocity TrueMill HSM training material.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface SURFCAMParameter {
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

export interface SURFCAMOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count?: number;
  parameters: Record<string, Record<string, SURFCAMParameter>>;
}

export interface SURFCAMSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary?: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, SURFCAMOperation>;
  training_topics?: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface SURFCAMFunctionIndex {
  system_id: "surfcam";
  sections: Record<string, SURFCAMSection>;
  total_operations: number;
  total_parameters: number;
  categories: string[];
}

const SECTION_FILES: Array<{ file: string; key: string }> = [
  { file: "milling-2d.json", key: "milling_2d" },
  { file: "milling-3d.json", key: "milling_3d" },
  { file: "turning.json", key: "turning" },
  { file: "truemill.json", key: "truemill" },
];

export class SURFCAMFunctionIndexEngine {
  private static index: SURFCAMFunctionIndex | null = null;

  private static readonly DATA_DIR = join(
    __dirname,
    "../../data/cam-functions/surfcam"
  );

  private static loadIndex(): SURFCAMFunctionIndex {
    if (this.index) return this.index;

    const sections: Record<string, SURFCAMSection> = {};
    let totalOps = 0;
    let totalParams = 0;
    const allCategories = new Set<string>();

    for (const { file, key } of SECTION_FILES) {
      const path = join(this.DATA_DIR, file);
      if (!existsSync(path)) continue;
      try {
        const data = JSON.parse(readFileSync(path, "utf-8")) as SURFCAMSection;
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
          `SURFCAMFunctionIndexEngine: failed to parse ${file}: ${(err as Error).message}`
        );
      }
    }

    this.index = {
      system_id: "surfcam",
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

  /**
   * Returns the complete function index (cached after first call).
   * @returns The aggregated SURFCAM function index across all 4 sections.
   */
  static getIndex(): SURFCAMFunctionIndex {
    return this.loadIndex();
  }

  /**
   * @returns Section keys that loaded successfully from disk.
   */
  static listSections(): string[] {
    return Object.keys(this.loadIndex().sections);
  }

  /**
   * @param sectionKey  Section identifier (e.g. "truemill").
   * @returns The section, or an error object listing available keys.
   */
  static getSection(
    sectionKey: string
  ): SURFCAMSection | { error: string; available: string[] } {
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
   * @returns A flat list of every operation across every loaded section.
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
   * Find every parameter whose name contains the query (case-insensitive).
   * @param parameterName  Substring of parameter key to match.
   * @throws if parameterName is empty or non-string.
   */
  static findParameter(parameterName: string): Array<{
    operation_id: string;
    section: string;
    group: string;
    parameter_name: string;
    parameter: SURFCAMParameter;
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
      parameter: SURFCAMParameter;
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
   * Search parameters by name OR description; results clamped by limit.
   * @param query  Substring (case-insensitive) to match in name or description.
   * @param limit  Max result count, clamped to [1, 500]. Default 20.
   * @throws if query is empty or non-string.
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

  /**
   * @param category  Category substring to match (case-insensitive).
   * @returns Operations whose category contains the substring.
   * @throws if category is empty or non-string.
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

  /** Summary stats for the dashboard / capability census. */
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
   * TrueMill HSM operations — SURFCAM's flagship CEA-trochoidal strategy
   * (US Patent 6,648,560). Returned as a flat list with section context.
   */
  static getTrueMillOperations(): Array<{
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
    const tm = idx.sections["truemill"];
    if (!tm) return out;
    for (const [opId, op] of Object.entries(tm.operations || {})) {
      out.push({
        operation_id: opId,
        display_name: op.display_name,
        section: "truemill",
        category: op.category,
      });
    }
    return out;
  }

  /**
   * Lookup a single operation by id, scanning every section.
   * @throws if operationId is empty or non-string.
   */
  static getOperation(operationId: string):
    | { operation_id: string; section: string; operation: SURFCAMOperation }
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

  /** Training topics for a section (empty array if section missing). */
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
