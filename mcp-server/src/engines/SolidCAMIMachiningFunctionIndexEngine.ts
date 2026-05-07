/**
 * SolidCAMIMachiningFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM34
 *
 * Function index engine for SolidCAM iMachining catalog (2D, 3D,
 * Technology Wizard, Tool Database). Provides typed access to operations,
 * parameter groups, and category filtering.
 */

import { readFileSync, existsSync } from "fs";
import { join } from "path";

export interface SolidCAMIMParameter {
  type: string;
  description?: string;
  unit?: string;
  default?: unknown;
  range?: [number, number];
  values?: string[];
  required?: boolean;
  tab?: string;
}

export interface SolidCAMIMOperation {
  display_name: string;
  category: string;
  description: string;
  dialog_tabs: string[];
  parameter_count: number;
  parameters: Record<string, Record<string, SolidCAMIMParameter>>;
}

export interface SolidCAMIMSection {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  summary: {
    total_operations: number;
    total_parameters: number;
    categories: string[];
  };
  operations: Record<string, SolidCAMIMOperation>;
  training_topics: Array<{
    topic: string;
    key_concepts: string[];
    best_practices: string[];
  }>;
}

export interface IMOperationSummary {
  operation_id: string;
  display_name: string;
  category: string;
  parameter_count: number;
  description: string;
}

export class SolidCAMIMachiningFunctionIndexEngine {
  private static section: SolidCAMIMSection | null = null;

  private static readonly DATA_PATH = join(
    __dirname,
    "../../data/cam-functions/solidcam/imachining.json"
  );

  private static loadSection(): SolidCAMIMSection | null {
    if (this.section) return this.section;

    if (!existsSync(this.DATA_PATH)) {
      return null;
    }

    try {
      this.section = JSON.parse(
        readFileSync(this.DATA_PATH, "utf-8")
      ) as SolidCAMIMSection;
      return this.section;
    } catch {
      return null;
    }
  }

  /**
   * Get the complete iMachining section
   */
  static getIndex(): SolidCAMIMSection | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM iMachining data not found" };
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
      return { error: "SolidCAM iMachining data not found" };
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
  static listOperations(): IMOperationSummary[] | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM iMachining data not found" };
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
  ): SolidCAMIMOperation | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM iMachining data not found" };
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
  ): IMOperationSummary[] | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM iMachining data not found" };
    }

    const lowerCat = category.toLowerCase();
    const results: IMOperationSummary[] = [];

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
    parameter: SolidCAMIMParameter;
  }> {
    const section = this.loadSection();
    if (!section) return [];

    const results: Array<{
      operation_id: string;
      group: string;
      parameter_name: string;
      parameter: SolidCAMIMParameter;
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
   * Get the Technology Wizard parameter set
   */
  static getWizardParams(): {
    operation: SolidCAMIMOperation;
    inputs: Record<string, SolidCAMIMParameter>;
    outputs: Record<string, SolidCAMIMParameter>;
  } | { error: string } {
    const section = this.loadSection();
    if (!section) {
      return { error: "SolidCAM iMachining data not found" };
    }

    const op = section.operations["technology_wizard"];
    if (!op) {
      return { error: "Technology Wizard operation not found" };
    }

    const inputs: Record<string, SolidCAMIMParameter> = {};
    for (const [groupName, group] of Object.entries(op.parameters)) {
      if (groupName === "output") continue;
      Object.assign(inputs, group);
    }

    return {
      operation: op,
      inputs,
      outputs: op.parameters["output"] || {},
    };
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

export const solidCAMIMachiningFunctionIndexEngine =
  SolidCAMIMachiningFunctionIndexEngine;
