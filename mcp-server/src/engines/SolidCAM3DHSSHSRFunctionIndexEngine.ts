/**
 * SolidCAM3DHSSHSRFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM35
 *
 * Function index engine for SolidCAM 3D HSS (High Speed Surface) and HSR
 * (High Speed Roughing) catalog. Provides typed access to operations,
 * parameter groups, category filtering, and steep/shallow strategy lookup.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface SolidCAM3DParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

export interface SolidCAM3DOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count: number;
  parameters: Record<string, Record<string, SolidCAM3DParameter>>;
}

export interface SolidCAM3DSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, SolidCAM3DOperation>;
  training_topics: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface ThreeDOperationSummary {
  operation_id: string;
  display_name: string;
  category: string;
  parameter_count: number;
  description: string;
}

export class SolidCAM3DHSSHSRFunctionIndexEngine {
  private static section: SolidCAM3DSection | null = null;

  private static readonly DATA_PATH = join(
    __dirname,
    "../../data/cam-functions/solidcam/3d-hss-hsr.json"
  );

  private static loadSection(): SolidCAM3DSection | null {
    if (this.section) return this.section;

    if (!existsSync(this.DATA_PATH)) {
      return null;
    }

    try {
      this.section = JSON.parse(
        readFileSync(this.DATA_PATH, "utf-8")
      ) as SolidCAM3DSection;
      return this.section;
    } catch {
      return null;
    }
  }

  /**
   * Get the complete 3D HSS/HSR section
   */
  static getIndex(): SolidCAM3DSection | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 3D HSS/HSR data not found" };
    }
    return section;
  }

  /**
   * Get summary statistics
   */
  static getSummary(): {
    system_id: string;
    section_key: string;
    total_operations: number;
    total_parameters: number;
    categories: string[];
    training_topics_count: number;
  } | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 3D HSS/HSR data not found" };
    }
    return {
      system_id: section.system_id,
      section_key: section.section_key,
      total_operations: section.summary.total_operations,
      total_parameters: section.summary.total_parameters,
      categories: section.summary.categories,
      training_topics_count: section.training_topics.length,
    };
  }

  /**
   * List all operations
   */
  static listOperations(): ThreeDOperationSummary[] | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 3D HSS/HSR data not found" };
    }

    return Object.entries(section.operations).map(([id, op]) => ({
      operation_id: id,
      display_name: op.display_name,
      category: op.category,
      parameter_count: op.parameter_count,
      description: op.description,
    }));
  }

  /**
   * Get a specific operation by ID
   */
  static getOperation(
    operationId: string
  ): SolidCAM3DOperation | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 3D HSS/HSR data not found" };
    }

    const op = section.operations[operationId];
    if (!op) {
      const available = Object.keys(section.operations).join(", ");
      return {
        error: `Operation '${operationId}' not found. Available: ${available}`,
      };
    }

    return op;
  }

  /**
   * Get operations by category
   */
  static getOperationsByCategory(
    category: string
  ): ThreeDOperationSummary[] | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 3D HSS/HSR data not found" };
    }

    const lowerCat = category.toLowerCase();
    const results: ThreeDOperationSummary[] = [];

    Object.entries(section.operations).forEach(([id, op]) => {
      if (op.category.toLowerCase() === lowerCat) {
        results.push({
          operation_id: id,
          display_name: op.display_name,
          category: op.category,
          parameter_count: op.parameter_count,
          description: op.description,
        });
      }
    });

    return results;
  }

  /**
   * Search parameters by name
   */
  static findParameter(
    parameterName: string,
    limit = 20
  ): Array<{
    operation_id: string;
    group: string;
    parameter_name: string;
    parameter: SolidCAM3DParameter;
  }> {
    const section = this.loadSection();
    if (!section) return [];

    const results: Array<{
      operation_id: string;
      group: string;
      parameter_name: string;
      parameter: SolidCAM3DParameter;
    }> = [];
    const lowerName = parameterName.toLowerCase();

    for (const [opId, op] of Object.entries(section.operations)) {
      for (const [groupName, group] of Object.entries(op.parameters)) {
        for (const [paramName, param] of Object.entries(group)) {
          if (paramName.toLowerCase().includes(lowerName)) {
            results.push({
              operation_id: opId,
              group: groupName,
              parameter_name: paramName,
              parameter: param,
            });
            if (results.length >= limit) return results;
          }
        }
      }
    }

    return results;
  }

  /**
   * Recommend an HSS strategy based on surface character.
   * Steep wall angle thresholds:
   *   > 60deg → constant_z (waterline)
   *   30-60deg → combined_finish or constant_z
   *   < 30deg → linear / 3d_stepover / spiral / radial (per geometry hint)
   *
   * @param wallAngleDeg Surface inclination 0=horizontal, 90=vertical
   * @param geometryHint Optional hint: "rotational" | "freeform" | "planar" | "boundary"
   */
  static recommendStrategy(
    wallAngleDeg: number,
    geometryHint?: "rotational" | "freeform" | "planar" | "boundary"
  ): { primary: string; alternative: string; reason: string } {
    if (!Number.isFinite(wallAngleDeg) || wallAngleDeg < 0 || wallAngleDeg > 90) {
      return {
        primary: "hss_combined_finish",
        alternative: "hss_3d_stepover",
        reason: "Invalid angle — defaulting to combined finish for safety",
      };
    }

    if (wallAngleDeg >= 60) {
      return {
        primary: "hss_constant_z",
        alternative: "hss_combined_finish",
        reason: `Steep wall (${wallAngleDeg.toFixed(0)}deg ≥ 60) — Z-level waterline preferred`,
      };
    }

    if (wallAngleDeg >= 30) {
      return {
        primary: "hss_combined_finish",
        alternative: "hss_constant_z",
        reason: `Mixed steep/shallow region (${wallAngleDeg.toFixed(0)}deg) — combined finish auto-blends`,
      };
    }

    // Shallow regions — branch on geometry hint
    if (geometryHint === "rotational") {
      return {
        primary: "hss_radial",
        alternative: "hss_spiral",
        reason: `Shallow rotational feature — radial pass from center`,
      };
    }
    if (geometryHint === "boundary") {
      return {
        primary: "hss_boundary",
        alternative: "hss_morph",
        reason: `Shallow region with defined boundary — boundary offset`,
      };
    }
    if (geometryHint === "planar") {
      return {
        primary: "hss_linear",
        alternative: "hss_3d_stepover",
        reason: `Shallow planar surface — linear parallel passes`,
      };
    }
    // freeform default
    return {
      primary: "hss_3d_stepover",
      alternative: "hss_linear",
      reason: `Shallow freeform (${wallAngleDeg.toFixed(0)}deg) — constant scallop`,
    };
  }

  /**
   * Compute step-over from target scallop height for a given ball-end tool radius.
   *   scallop = R - sqrt(R^2 - (s/2)^2)
   *   step-over s = 2 * sqrt(2*R*h - h^2)
   *
   * @param toolRadiusMm Ball-end tool radius (= diameter/2)
   * @param scallopHeightMm Target scallop height
   * @returns step-over in mm, or null on invalid inputs
   */
  static stepOverFromScallop(
    toolRadiusMm: number,
    scallopHeightMm: number
  ): number | null {
    if (
      !Number.isFinite(toolRadiusMm) ||
      !Number.isFinite(scallopHeightMm) ||
      toolRadiusMm <= 0 ||
      scallopHeightMm <= 0 ||
      scallopHeightMm >= toolRadiusMm
    ) {
      return null;
    }
    const inner = 2 * toolRadiusMm * scallopHeightMm - scallopHeightMm * scallopHeightMm;
    if (inner <= 0) return null;
    return 2 * Math.sqrt(inner);
  }

  /**
   * Get all training topics
   */
  static getTrainingTopics(): Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }> {
    const section = this.loadSection();
    if (!section) return [];
    return section.training_topics;
  }

  /**
   * Category breakdown with op counts
   */
  static getCategoryBreakdown(): Array<{
    category: string;
    operations: string[];
    total_parameters: number;
  }> {
    const section = this.loadSection();
    if (!section) return [];

    const categories = new Map<
      string,
      { ops: string[]; params: number }
    >();

    for (const [opId, op] of Object.entries(section.operations)) {
      if (!categories.has(op.category)) {
        categories.set(op.category, { ops: [], params: 0 });
      }
      const entry = categories.get(op.category)!;
      entry.ops.push(opId);
      entry.params += op.parameter_count;
    }

    return Array.from(categories.entries()).map(([cat, data]) => ({
      category: cat,
      operations: data.ops,
      total_parameters: data.params,
    }));
  }
}

export const solidCAM3DHSSHSRFunctionIndexEngine =
  SolidCAM3DHSSHSRFunctionIndexEngine;
