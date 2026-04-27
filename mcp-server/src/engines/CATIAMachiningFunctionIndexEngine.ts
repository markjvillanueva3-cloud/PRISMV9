/**
 * CATIAMachiningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM-FIDX-23
 *
 * Complete function index for Dassault Systèmes CATIA V5 Machining
 * (Prismatic, Surface, Advanced, Drilling, Lathe, DELMIA Integration).
 * Distinctive: PPR-tree process planning (Product/Process/Resource), DELMIA
 * machining-cell simulation handoff, integrated tool catalogue, NC code
 * post-processing via OEM IMSpost or PEPS post.
 *
 * The data file is a single unified machining.json with 16 operations spread
 * across 6 categories. Unlike multi-file FIDX engines (Alphacam, Creo,
 * PartMaker), the engine pivots ops by category to form virtual sections.
 *
 * Categories / virtual sections:
 *   - prismatic_machining   (facing, pocketing, profile_contouring, sweeping)
 *   - surface_machining     (zlevel, pencil_tracing, spiral_milling, multi_axis_sweeping)
 *   - advanced_machining    (swarf_cutting)
 *   - drilling              (drilling, tapping)
 *   - lathe_machining       (lathe_roughing, lathe_finishing, grooving)
 *   - delmia_integration    (nc_simulation, post_processor)
 *
 * Reference: Dassault Systèmes CATIA V5 Machining documentation +
 * DELMIA Machining Cell training material.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface CATIAParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  min?: number;
  max?: number;
  values?: string[];
  required?: boolean;
  tab?: string;
  value?: unknown;
}

export interface CATIAOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count?: number;
  parameters: Record<string, Record<string, CATIAParameter>>;
}

export interface CATIASection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary?: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, CATIAOperation>;
  training_topics?: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface CATIAFunctionIndex {
  system_id: "catia";
  sections: Record<string, CATIASection>;
  total_operations: number;
  total_parameters: number;
  categories: string[];
}

interface RawCATIAFile {
  schemaVersion: number;
  system_id: string;
  version?: string;
  categories: string[];
  operations: Record<string, CATIAOperation>;
}

const DATA_FILE = "machining.json";

export class CATIAMachiningFunctionIndexEngine {
  private static index: CATIAFunctionIndex | null = null;

  private static readonly DATA_DIR = join(
    __dirname,
    "../../data/cam-functions/catia"
  );

  private static loadIndex(): CATIAFunctionIndex {
    if (this.index) return this.index;

    const path = join(this.DATA_DIR, DATA_FILE);
    if (!existsSync(path)) {
      throw new Error(
        `CATIAMachiningFunctionIndexEngine: data file not found at ${path}`
      );
    }

    let raw: RawCATIAFile;
    try {
      raw = JSON.parse(readFileSync(path, "utf-8")) as RawCATIAFile;
    } catch (err) {
      throw new Error(
        `CATIAMachiningFunctionIndexEngine: failed to parse ${DATA_FILE}: ${(err as Error).message}`
      );
    }

    // Pivot ops by category into virtual sections
    const sections: Record<string, CATIASection> = {};
    const seenCategories = new Set<string>();
    let totalOps = 0;
    let totalParams = 0;

    for (const [opId, op] of Object.entries(raw.operations || {})) {
      const cat = op.category;
      seenCategories.add(cat);
      if (!sections[cat]) {
        sections[cat] = {
          schemaVersion: raw.schemaVersion ?? 1,
          system_id: "catia",
          section_key: cat,
          operations: {},
        };
      }
      sections[cat].operations[opId] = op;
      totalOps += 1;
      for (const group of Object.values(op.parameters || {})) {
        totalParams += Object.keys(group).length;
      }
    }

    // Per-section summary
    for (const [cat, section] of Object.entries(sections)) {
      const ops = Object.keys(section.operations).length;
      let p = 0;
      for (const op of Object.values(section.operations)) {
        for (const group of Object.values(op.parameters || {})) {
          p += Object.keys(group).length;
        }
      }
      section.summary = {
        total_operations: ops,
        total_parameters: p,
        categories: [cat],
      };
    }

    this.index = {
      system_id: "catia",
      sections,
      total_operations: totalOps,
      total_parameters: totalParams,
      categories: Array.from(seenCategories),
    };

    return this.index;
  }

  /** Reset the cached index. Test-only helper. */
  static resetCache(): void {
    this.index = null;
  }

  /** Returns the complete function index (cached). */
  static getIndex(): CATIAFunctionIndex {
    return this.loadIndex();
  }

  /** Returns the list of section keys (one per category). */
  static listSections(): string[] {
    return Object.keys(this.loadIndex().sections);
  }

  /** Get a single virtual section by category key. */
  static getSection(
    sectionKey: string
  ): CATIASection | { error: string; available: string[] } {
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
    parameter: CATIAParameter;
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
      parameter: CATIAParameter;
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
   * Surface machining operations — CATIA's signature aerospace surface
   * (sweeping, isoparametric, multi-axis sweeping for blade/blisk/impeller).
   */
  static getSurfaceMachiningOperations(): Array<{
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
    const ss = idx.sections["surface_machining"];
    if (!ss) return out;
    for (const [opId, op] of Object.entries(ss.operations || {})) {
      out.push({
        operation_id: opId,
        display_name: op.display_name,
        section: "surface_machining",
        category: op.category,
      });
    }
    return out;
  }

  /**
   * Lathe machining operations — CATIA's turning surface.
   */
  static getLatheMachiningOperations(): Array<{
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
    const ls = idx.sections["lathe_machining"];
    if (!ls) return out;
    for (const [opId, op] of Object.entries(ls.operations || {})) {
      out.push({
        operation_id: opId,
        display_name: op.display_name,
        section: "lathe_machining",
        category: op.category,
      });
    }
    return out;
  }

  /** Lookup a single operation by id, scanning all sections. */
  static getOperation(operationId: string):
    | { operation_id: string; section: string; operation: CATIAOperation }
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

  /** Training topics for a section (CATIA file does not embed topics). */
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
