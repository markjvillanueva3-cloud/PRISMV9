/**
 * SolidCAM25DFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM33
 *
 * Function index engine for SolidCAM 2.5D operations.
 * Provides unified access to profile, pocket, face milling, slot, drill,
 * thread mill, chamfer, t-slot, engrave, iMachining 2D, contour 3-axis, and reaming.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface SolidCAMParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

export interface SolidCAMOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count: number;
  parameters: Record<string, Record<string, SolidCAMParameter>>;
}

export interface SolidCAM25DSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, SolidCAMOperation>;
  training_topics: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface OperationSummary {
  operation_id: string;
  display_name: string;
  category: string;
  parameter_count: number;
  description: string;
}

export class SolidCAM25DFunctionIndexEngine {
  private static section: SolidCAM25DSection | null = null;

  private static readonly DATA_PATH = join(
    __dirname,
    "../../data/cam-functions/solidcam/2.5d-operations.json"
  );

  private static loadSection(): SolidCAM25DSection | null {
    if (this.section) return this.section;

    if (!existsSync(this.DATA_PATH)) {
      return null;
    }

    try {
      this.section = JSON.parse(
        readFileSync(this.DATA_PATH, "utf-8")
      ) as SolidCAM25DSection;
      return this.section;
    } catch {
      return null;
    }
  }

  /**
   * Get the complete 2.5D operations section
   */
  static getIndex(): SolidCAM25DSection | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 2.5D operations data not found" };
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
      return { error: "SolidCAM 2.5D operations data not found" };
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
  static listOperations(): OperationSummary[] | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 2.5D operations data not found" };
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
  ): SolidCAMOperation | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 2.5D operations data not found" };
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
  ): OperationSummary[] | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 2.5D operations data not found" };
    }

    const lowerCat = category.toLowerCase();
    const results: OperationSummary[] = [];

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
    parameter: SolidCAMParameter;
  }> {
    const section = this.loadSection();
    if (!section) return [];

    const results: Array<{
      operation_id: string;
      group: string;
      parameter_name: string;
      parameter: SolidCAMParameter;
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
   * Get training topics
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
   * Get iMachining 2D specific parameters
   */
  static getIMachiningParams(): {
    operation: SolidCAMOperation;
    imachining_params: Record<string, SolidCAMParameter>;
  } | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM 2.5D operations data not found" };
    }

    const op = section.operations["imachining_2d"];
    if (!op) {
      return { error: "iMachining 2D operation not found" };
    }

    return {
      operation: op,
      imachining_params: op.parameters["imachining"] || {},
    };
  }

  /**
   * Get all categories with operation counts
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

export const solidCAM25DFunctionIndexEngine = SolidCAM25DFunctionIndexEngine;
