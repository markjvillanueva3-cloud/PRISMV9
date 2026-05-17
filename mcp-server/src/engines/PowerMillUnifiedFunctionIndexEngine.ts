/**
 * PowerMillUnifiedFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM46
 *
 * Unified index aggregating all PowerMill function catalogs:
 *   - Roughing (12 operations, 189 parameters)
 *   - Finishing (12 operations, 221 parameters)
 *   - 5-Axis/Robot (14 operations, 298 parameters)
 *
 * Total: 38 operations, 708 parameters across 13 categories.
 *
 * Features:
 *   - getUnifiedCatalog: combined view of all operations
 *   - searchOperations: fuzzy search across all catalogs
 *   - listAllCategories: unique categories from all catalogs
 *   - recommendByIntent: intent routing across all strategies
 *   - getCatalogStats: parameter/operation counts per catalog
 *   - validateAllCatalogs: cross-catalog consistency check
 */

import { PowerMillRoughingFunctionIndexEngine } from "./PowerMillRoughingFunctionIndexEngine.js";
import { PowerMillFinishingFunctionIndexEngine } from "./PowerMillFinishingFunctionIndexEngine.js";
import { PowerMill5AxisFunctionIndexEngine } from "./PowerMill5AxisFunctionIndexEngine.js";

export type UnifiedCategory =
  | "roughing"
  | "area_clearance"
  | "rest_machining"
  | "pattern_machining"
  | "finishing"
  | "pencil_corner"
  | "specialized"
  | "continuous_5axis"
  | "indexed_5axis"
  | "blade_hub_port"
  | "robot_machining";

export type UnifiedIntent =
  // Roughing intents
  | "bulk_material_removal"
  | "adaptive_rough"
  | "rest_area_detect"
  | "pattern_pocket"
  // Finishing intents
  | "surface_finish_3d"
  | "pencil_trace"
  | "corner_finish"
  | "steep_shallow_combine"
  // 5-axis intents
  | "ruled_surface_side_mill"
  | "turbine_blade_5axis"
  | "impeller_hub"
  | "robot_arm_mill"
  | "collision_avoidance";

interface UnifiedOperation {
  id: string;
  catalog: "roughing" | "finishing" | "5axis_robot";
  display_name: string;
  category: string;
  parameter_count: number;
  description: string;
}

/** Shape of a per-catalog operation entry — narrows the `any` returned by the
 *  roughing/finishing source-index engines' getIndex()/getCatalog(). */
interface CatalogOpEntry {
  display_name: string;
  category: string;
  parameter_count: number;
  description: string;
}

interface CatalogStats {
  catalog: string;
  operations: number;
  parameters: number;
  categories: string[];
}

export class PowerMillUnifiedFunctionIndexEngine {
  /**
   * Returns all operations from all catalogs in a unified view.
   */
  static getUnifiedCatalog(): {
    system_id: string;
    total_operations: number;
    total_parameters: number;
    catalogs: string[];
    operations: UnifiedOperation[];
  } {
    const roughing = PowerMillRoughingFunctionIndexEngine.getIndex();
    const finishing = PowerMillFinishingFunctionIndexEngine.getCatalog();
    const fiveAxis = PowerMill5AxisFunctionIndexEngine.getCatalog();

    const operations: UnifiedOperation[] = [];

    for (const [id, op] of Object.entries(roughing.operations) as [string, CatalogOpEntry][]) {
      operations.push({
        id,
        catalog: "roughing",
        display_name: op.display_name,
        category: op.category,
        parameter_count: op.parameter_count,
        description: op.description,
      });
    }

    for (const [id, op] of Object.entries(finishing.operations) as [string, CatalogOpEntry][]) {
      operations.push({
        id,
        catalog: "finishing",
        display_name: op.display_name,
        category: op.category,
        parameter_count: op.parameter_count,
        description: op.description,
      });
    }

    for (const [id, op] of Object.entries(fiveAxis.operations)) {
      operations.push({
        id,
        catalog: "5axis_robot",
        display_name: op.display_name,
        category: op.category,
        parameter_count: op.parameter_count,
        description: op.description,
      });
    }

    // Compute total parameters from operations (roughing lacks total_parameters at root)
    const totalParams = operations.reduce((sum, op) => sum + op.parameter_count, 0);

    return {
      system_id: "powermill_unified",
      total_operations: operations.length,
      total_parameters: totalParams,
      catalogs: ["roughing", "finishing", "5axis_robot"],
      operations,
    };
  }

  /**
   * Lists all operation IDs across all catalogs.
   */
  static listAllOperations(): string[] {
    const roughing = PowerMillRoughingFunctionIndexEngine.listOperations();
    const finishing = PowerMillFinishingFunctionIndexEngine.listOperations();
    const fiveAxis = PowerMill5AxisFunctionIndexEngine.listOperations();
    return [...roughing, ...finishing, ...fiveAxis];
  }

  /**
   * Gets operation details from any catalog.
   */
  static getOperation(operationId: string): UnifiedOperation | null {
    // Note: roughing engine returns { error: "..." } instead of null when not found
    const roughOp = PowerMillRoughingFunctionIndexEngine.getOperation(operationId);
    if (roughOp && !roughOp.error) {
      return {
        id: operationId,
        catalog: "roughing",
        display_name: roughOp.display_name,
        category: roughOp.category,
        parameter_count: roughOp.parameter_count,
        description: roughOp.description,
      };
    }

    const finishOp = PowerMillFinishingFunctionIndexEngine.getOperation(operationId);
    if (finishOp) {
      return {
        id: operationId,
        catalog: "finishing",
        display_name: finishOp.display_name,
        category: finishOp.category,
        parameter_count: finishOp.parameter_count,
        description: finishOp.description,
      };
    }

    const fiveAxisOp = PowerMill5AxisFunctionIndexEngine.getOperation(operationId);
    if (fiveAxisOp) {
      return {
        id: operationId,
        catalog: "5axis_robot",
        display_name: fiveAxisOp.display_name,
        category: fiveAxisOp.category,
        parameter_count: fiveAxisOp.parameter_count,
        description: fiveAxisOp.description,
      };
    }

    return null;
  }

  /**
   * Searches operations by keyword across all catalogs.
   */
  static searchOperations(query: string): UnifiedOperation[] {
    const catalog = this.getUnifiedCatalog();
    const q = query.toLowerCase();
    return catalog.operations.filter(
      (op) =>
        op.id.toLowerCase().includes(q) ||
        op.display_name.toLowerCase().includes(q) ||
        op.description.toLowerCase().includes(q) ||
        op.category.toLowerCase().includes(q)
    );
  }

  /**
   * Lists all unique categories across all catalogs.
   */
  static listAllCategories(): string[] {
    // Roughing engine doesn't have getCategories() — extract from catalog
    const roughingCatalog = PowerMillRoughingFunctionIndexEngine.getIndex();
    const roughing = roughingCatalog.categories as string[];
    const finishing = PowerMillFinishingFunctionIndexEngine.getCategories();
    const fiveAxis = PowerMill5AxisFunctionIndexEngine.getCategories();
    return [...new Set([...roughing, ...finishing, ...fiveAxis])];
  }

  /**
   * Lists operations by category from any catalog.
   */
  static listByCategory(category: string): UnifiedOperation[] {
    const catalog = this.getUnifiedCatalog();
    return catalog.operations.filter((op) => op.category === category);
  }

  /**
   * Recommends an operation based on unified intent.
   */
  static recommendByIntent(intent: UnifiedIntent): {
    operation_id: string;
    catalog: string;
    display_name: string;
    category: string;
    reason: string;
    alternatives: UnifiedOperation[];
  } {
    const intentMapping: Record<string, { catalog: "roughing" | "finishing" | "5axis_robot"; opId: string }> = {
      bulk_material_removal: { catalog: "roughing", opId: "offset_area_clear" },
      adaptive_rough: { catalog: "roughing", opId: "vortex_roughing" },
      rest_area_detect: { catalog: "roughing", opId: "rest_roughing" },
      pattern_pocket: { catalog: "roughing", opId: "pattern_pocket" },
      surface_finish_3d: { catalog: "finishing", opId: "raster_finishing" },
      pencil_trace: { catalog: "finishing", opId: "pencil_finishing" },
      corner_finish: { catalog: "finishing", opId: "corner_finishing" },
      steep_shallow_combine: { catalog: "finishing", opId: "steep_shallow" },
      ruled_surface_side_mill: { catalog: "5axis_robot", opId: "swarf_5axis" },
      turbine_blade_5axis: { catalog: "5axis_robot", opId: "blade_finishing" },
      impeller_hub: { catalog: "5axis_robot", opId: "hub_finishing" },
      robot_arm_mill: { catalog: "5axis_robot", opId: "robot_milling" },
      collision_avoidance: { catalog: "5axis_robot", opId: "collision_avoidance_5axis" },
    };

    const mapping = intentMapping[intent];
    if (!mapping) {
      return {
        operation_id: "offset_area_clear",
        catalog: "roughing",
        display_name: "Offset Area Clearance",
        category: "area_clearance",
        reason: `Unknown intent '${intent}'. Defaulting to versatile area clearance.`,
        alternatives: this.searchOperations("clear").slice(0, 3),
      };
    }

    const op = this.getOperation(mapping.opId);
    if (!op) {
      return {
        operation_id: mapping.opId,
        catalog: mapping.catalog,
        display_name: mapping.opId,
        category: "unknown",
        reason: `Intent '${intent}' maps to ${mapping.opId} but operation not found.`,
        alternatives: [],
      };
    }

    const alternatives = this.listByCategory(op.category)
      .filter((o) => o.id !== op.id)
      .slice(0, 3);

    return {
      operation_id: op.id,
      catalog: op.catalog,
      display_name: op.display_name,
      category: op.category,
      reason: `Intent '${intent}' maps to ${op.display_name} in ${op.catalog} catalog.`,
      alternatives,
    };
  }

  /**
   * Returns statistics for each catalog.
   */
  static getCatalogStats(): CatalogStats[] {
    const roughing = PowerMillRoughingFunctionIndexEngine.getIndex();
    const finishing = PowerMillFinishingFunctionIndexEngine.getCatalog();
    const fiveAxis = PowerMill5AxisFunctionIndexEngine.getCatalog();

    // Roughing catalog uses different structure — compute counts from operations
    const roughingOps = Object.values(roughing.operations) as Array<{ parameter_count: number }>;
    const roughingOpCount = roughingOps.length;
    const roughingParamCount = roughingOps.reduce((sum, op) => sum + op.parameter_count, 0);

    return [
      {
        catalog: "roughing",
        operations: roughingOpCount,
        parameters: roughingParamCount,
        categories: [...roughing.categories],
      },
      {
        catalog: "finishing",
        operations: finishing.total_operations,
        parameters: finishing.total_parameters,
        categories: [...finishing.categories],
      },
      {
        catalog: "5axis_robot",
        operations: fiveAxis.total_operations,
        parameters: fiveAxis.total_parameters,
        categories: [...fiveAxis.categories],
      },
    ];
  }

  /**
   * Validates consistency across all catalogs.
   */
  static validateAllCatalogs(): {
    is_consistent: boolean;
    total_operations: number;
    total_parameters: number;
    catalogs_checked: number;
    issues: string[];
    per_catalog: Array<{ catalog: string; is_consistent: boolean; issues: string[] }>;
  } {
    // Roughing engine doesn't have validateConsistency or total_operations at root
    // Manual validation: check operations object is valid and has expected structure
    const roughingCat = PowerMillRoughingFunctionIndexEngine.getIndex();
    const roughingOps = Object.values(roughingCat.operations) as Array<{ parameter_count: number; category: string }>;
    const roughingIssues: string[] = [];
    if (roughingOps.length === 0) {
      roughingIssues.push("No operations found in roughing catalog");
    }
    for (const op of roughingOps) {
      if (typeof op.parameter_count !== "number" || typeof op.category !== "string") {
        roughingIssues.push("Invalid operation structure in roughing catalog");
        break;
      }
    }
    const roughingVal = { is_consistent: roughingIssues.length === 0, issues: roughingIssues };

    const finishingVal = PowerMillFinishingFunctionIndexEngine.validateConsistency();
    const fiveAxisVal = PowerMill5AxisFunctionIndexEngine.validateConsistency();

    const allIssues: string[] = [];
    const perCatalog = [
      { catalog: "roughing", is_consistent: roughingVal.is_consistent, issues: roughingVal.issues },
      { catalog: "finishing", is_consistent: finishingVal.is_consistent, issues: finishingVal.issues },
      { catalog: "5axis_robot", is_consistent: fiveAxisVal.is_consistent, issues: fiveAxisVal.issues },
    ];

    for (const cat of perCatalog) {
      for (const issue of cat.issues) {
        allIssues.push(`[${cat.catalog}] ${issue}`);
      }
    }

    // Check for duplicate operation IDs across catalogs
    const allOps = this.listAllOperations();
    const seen = new Set<string>();
    for (const op of allOps) {
      if (seen.has(op)) {
        allIssues.push(`Duplicate operation ID '${op}' found across catalogs`);
      }
      seen.add(op);
    }

    const stats = this.getCatalogStats();
    const totalOps = stats.reduce((sum, s) => sum + s.operations, 0);
    const totalParams = stats.reduce((sum, s) => sum + s.parameters, 0);

    return {
      is_consistent: allIssues.length === 0,
      total_operations: totalOps,
      total_parameters: totalParams,
      catalogs_checked: 3,
      issues: allIssues,
      per_catalog: perCatalog,
    };
  }

  /**
   * Suggests operation workflow based on part requirements.
   */
  static suggestWorkflow(requirements: {
    has_pockets?: boolean;
    has_complex_surfaces?: boolean;
    needs_5axis?: boolean;
    has_thin_walls?: boolean;
    material_hardness?: "soft" | "medium" | "hard";
  }): {
    roughing_ops: string[];
    finishing_ops: string[];
    fiveaxis_ops: string[];
    workflow_notes: string[];
  } {
    const roughingOps: string[] = [];
    const finishingOps: string[] = [];
    const fiveaxisOps: string[] = [];
    const notes: string[] = [];

    // Roughing selection
    if (requirements.has_pockets) {
      roughingOps.push("offset_area_clear", "pattern_pocket");
      notes.push("Use offset area clear for open pockets, pattern for closed pockets");
    } else {
      roughingOps.push("offset_area_clear");
    }

    if (requirements.material_hardness === "hard") {
      roughingOps.push("vortex_roughing");
      notes.push("Vortex roughing recommended for hard materials — constant engagement");
    }

    // Finishing selection
    if (requirements.has_complex_surfaces) {
      finishingOps.push("raster_finishing", "steep_shallow", "pencil_finishing");
      notes.push("Combine steep/shallow with pencil for complete surface coverage");
    } else {
      finishingOps.push("raster_finishing");
    }

    if (requirements.has_thin_walls) {
      finishingOps.push("constant_z_finishing");
      notes.push("Constant-Z finishing preserves thin wall integrity");
    }

    // 5-axis selection
    if (requirements.needs_5axis) {
      fiveaxisOps.push("swarf_5axis", "collision_avoidance_5axis");
      notes.push("Enable collision avoidance for automatic tool tilting");
    }

    return {
      roughing_ops: roughingOps,
      finishing_ops: finishingOps,
      fiveaxis_ops: fiveaxisOps,
      workflow_notes: notes,
    };
  }
}
