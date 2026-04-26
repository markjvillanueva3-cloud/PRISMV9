/**
 * PowerMill5AxisFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM45
 *
 * Index engine for PowerMill 5-axis and robot machining strategies.
 * 14 operations across 4 categories: continuous_5axis, indexed_5axis,
 * blade_hub_port, robot_machining.
 *
 * Features:
 *   - getCatalog/listOperations/getOperation: catalog lookup
 *   - listByCategory/getCategories: category filtering
 *   - recommendByFeature: intent-based operation routing
 *   - axisLimitCheck: validates machine axis capabilities
 *   - singularityRiskEstimate: robot singularity proximity
 *   - toolReachCheck: verifies tool can reach geometry
 *   - validateConsistency: catalog integrity check
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export type PM5AxisCategory = "continuous_5axis" | "indexed_5axis" | "blade_hub_port" | "robot_machining";

export type PM5AxisIntent =
  | "ruled_surface_side_mill"
  | "turbine_blade_5axis"
  | "impeller_hub"
  | "intake_port"
  | "organic_surface_flow"
  | "reuse_3axis_5axis"
  | "avoid_collision_tilt"
  | "fixed_angle_rigid"
  | "cylindrical_wrap"
  | "robot_arm_mill"
  | "robot_composite_trim"
  | "robot_weld_seam"
  | "external_positioner"
  | "smooth_axis_vectors";

interface Operation {
  category: PM5AxisCategory;
  display_name: string;
  description: string;
  parameter_count: number;
  dialog_tabs: string[];
  parameters: Record<string, unknown>;
}

interface Catalog {
  schemaVersion: number;
  system_id: string;
  section_key: string;
  version: string;
  categories: PM5AxisCategory[];
  total_operations: number;
  total_parameters: number;
  operations: Record<string, Operation>;
  intent_mapping: Record<string, string>;
}

let _catalog: Catalog | null = null;

function loadCatalog(): Catalog {
  if (_catalog) return _catalog;
  const catalogPath = join(__dirname, "../../data/cam-functions/powermill/5axis-robot.json");
  const raw = readFileSync(catalogPath, "utf-8");
  _catalog = JSON.parse(raw) as Catalog;
  return _catalog;
}

export class PowerMill5AxisFunctionIndexEngine {
  /**
   * Returns the full 5-axis/robot catalog.
   */
  static getCatalog(): Catalog {
    return loadCatalog();
  }

  /**
   * Lists all operation IDs.
   */
  static listOperations(): string[] {
    const c = loadCatalog();
    return Object.keys(c.operations);
  }

  /**
   * Gets a specific operation by ID.
   */
  static getOperation(operationId: string): Operation | null {
    const c = loadCatalog();
    return c.operations[operationId] ?? null;
  }

  /**
   * Lists operations in a specific category.
   */
  static listByCategory(category: PM5AxisCategory): string[] {
    const c = loadCatalog();
    return Object.entries(c.operations)
      .filter(([, op]) => op.category === category)
      .map(([id]) => id);
  }

  /**
   * Gets all available categories.
   */
  static getCategories(): PM5AxisCategory[] {
    const c = loadCatalog();
    return [...c.categories];
  }

  /**
   * Recommends an operation based on machining intent.
   */
  static recommendByFeature(intent: PM5AxisIntent): {
    operation_id: string;
    display_name: string;
    category: PM5AxisCategory;
    reason: string;
    alternatives: string[];
  } {
    const c = loadCatalog();
    const mapping = c.intent_mapping as Record<string, string>;
    const opId = mapping[intent];

    if (!opId || !c.operations[opId]) {
      return {
        operation_id: "swarf_5axis",
        display_name: "5-Axis Swarf Machining",
        category: "continuous_5axis",
        reason: `Unknown intent '${intent}'. Defaulting to versatile swarf strategy.`,
        alternatives: ["flowline_5axis", "projection_5axis"],
      };
    }

    const op = c.operations[opId];
    const sameCategory = Object.entries(c.operations)
      .filter(([id, o]) => o.category === op.category && id !== opId)
      .map(([id]) => id)
      .slice(0, 3);

    return {
      operation_id: opId,
      display_name: op.display_name,
      category: op.category,
      reason: `Intent '${intent}' maps to ${op.display_name}.`,
      alternatives: sameCategory,
    };
  }

  /**
   * Checks if machine axis limits can accommodate the required motion.
   * Returns pass/fail with details.
   */
  static axisLimitCheck(
    requiredA: { min: number; max: number },
    requiredC: { min: number; max: number },
    machineA: { min: number; max: number } = { min: -30, max: 30 },
    machineC: { min: number; max: number } = { min: -180, max: 180 }
  ): {
    passes: boolean;
    a_axis: { required: { min: number; max: number }; machine: { min: number; max: number }; ok: boolean };
    c_axis: { required: { min: number; max: number }; machine: { min: number; max: number }; ok: boolean };
    recommendation: string;
  } {
    const aOk = requiredA.min >= machineA.min && requiredA.max <= machineA.max;
    const cOk = requiredC.min >= machineC.min && requiredC.max <= machineC.max;

    let recommendation = "";
    if (!aOk && !cOk) {
      recommendation = "Both A and C axis limits exceeded. Consider indexed 3+2 approach or different workholding.";
    } else if (!aOk) {
      recommendation = `A-axis requires ${requiredA.min}° to ${requiredA.max}° but machine limited to ${machineA.min}° to ${machineA.max}°. Rotate part or use indexed strategy.`;
    } else if (!cOk) {
      recommendation = `C-axis requires ${requiredC.min}° to ${requiredC.max}° but machine limited to ${machineC.min}° to ${machineC.max}°. Consider wrapping or segmenting toolpath.`;
    } else {
      recommendation = "All axis limits within machine capability.";
    }

    return {
      passes: aOk && cOk,
      a_axis: { required: requiredA, machine: machineA, ok: aOk },
      c_axis: { required: requiredC, machine: machineC, ok: cOk },
      recommendation,
    };
  }

  /**
   * Estimates robot singularity risk based on joint angles.
   * Wrist singularity occurs when J4 and J6 axes align.
   * Overhead singularity occurs when J5 approaches 0°.
   */
  static singularityRiskEstimate(
    j5Angle: number,
    wristAlignmentAngle: number,
    wristThreshold: number = 5,
    overheadThreshold: number = 10
  ): {
    risk_level: "low" | "medium" | "high" | "critical";
    wrist_singularity: { angle: number; threshold: number; at_risk: boolean };
    overhead_singularity: { angle: number; threshold: number; at_risk: boolean };
    recommendation: string;
  } {
    const wristRisk = Math.abs(wristAlignmentAngle) < wristThreshold;
    const overheadRisk = Math.abs(j5Angle) < overheadThreshold;

    let riskLevel: "low" | "medium" | "high" | "critical" = "low";
    let recommendation = "No singularity concerns. Path is safe.";

    if (wristRisk && overheadRisk) {
      riskLevel = "critical";
      recommendation = "CRITICAL: Both wrist and overhead singularity zones. Reconfigure robot or modify path.";
    } else if (wristRisk) {
      riskLevel = "high";
      recommendation = "Wrist singularity zone detected. J4/J6 alignment may cause erratic motion. Add waypoints or change configuration.";
    } else if (overheadRisk) {
      riskLevel = "high";
      recommendation = "Overhead singularity zone detected. J5 near zero may cause rapid axis reversal. Tilt workpiece or modify approach.";
    } else if (Math.abs(wristAlignmentAngle) < wristThreshold * 2 || Math.abs(j5Angle) < overheadThreshold * 2) {
      riskLevel = "medium";
      recommendation = "Approaching singularity zones. Monitor for axis speed issues.";
    }

    return {
      risk_level: riskLevel,
      wrist_singularity: { angle: wristAlignmentAngle, threshold: wristThreshold, at_risk: wristRisk },
      overhead_singularity: { angle: j5Angle, threshold: overheadThreshold, at_risk: overheadRisk },
      recommendation,
    };
  }

  /**
   * Checks if tool can reach the geometry considering holder and shank.
   * Returns reach assessment with recommendations.
   */
  static toolReachCheck(
    pocketDepth: number,
    minClearance: number,
    toolCuttingLength: number,
    toolShankDiameter: number,
    holderDiameter: number,
    narrowestOpening: number
  ): {
    can_reach: boolean;
    cutting_length_ok: boolean;
    shank_clearance_ok: boolean;
    holder_clearance_ok: boolean;
    depth_mm: number;
    effective_reach_mm: number;
    recommendation: string;
  } {
    const effectiveReach = toolCuttingLength - minClearance;
    const cuttingOk = effectiveReach >= pocketDepth;
    const shankOk = toolShankDiameter < narrowestOpening;
    const holderOk = holderDiameter < narrowestOpening || pocketDepth < toolCuttingLength * 0.8;

    const canReach = cuttingOk && shankOk && holderOk;

    let recommendation = "";
    if (!cuttingOk) {
      recommendation = `Pocket depth ${pocketDepth}mm exceeds effective reach ${effectiveReach.toFixed(1)}mm. Use longer tool or multi-pass approach.`;
    } else if (!shankOk) {
      recommendation = `Shank diameter ${toolShankDiameter}mm exceeds opening ${narrowestOpening}mm. Use necked or tapered tool.`;
    } else if (!holderOk) {
      recommendation = `Holder may collide at full depth. Consider shrink-fit holder or extended reach tool.`;
    } else {
      recommendation = "Tool geometry compatible with pocket. Safe to proceed.";
    }

    return {
      can_reach: canReach,
      cutting_length_ok: cuttingOk,
      shank_clearance_ok: shankOk,
      holder_clearance_ok: holderOk,
      depth_mm: pocketDepth,
      effective_reach_mm: effectiveReach,
      recommendation,
    };
  }

  /**
   * Validates catalog consistency.
   */
  static validateConsistency(): {
    is_consistent: boolean;
    expected_operations: number;
    actual_operations: number;
    expected_parameters: number;
    actual_parameters: number;
    issues: string[];
  } {
    const c = loadCatalog();
    const ops = Object.keys(c.operations);
    const actualOps = ops.length;
    const actualParams = ops.reduce((sum, id) => sum + (c.operations[id].parameter_count || 0), 0);

    const issues: string[] = [];
    if (actualOps !== c.total_operations) {
      issues.push(`Operation count mismatch: expected ${c.total_operations}, found ${actualOps}`);
    }
    if (actualParams !== c.total_parameters) {
      issues.push(`Parameter count mismatch: expected ${c.total_parameters}, found ${actualParams}`);
    }

    for (const [id, op] of Object.entries(c.operations)) {
      if (!c.categories.includes(op.category)) {
        issues.push(`Operation '${id}' has unknown category '${op.category}'`);
      }
    }

    return {
      is_consistent: issues.length === 0,
      expected_operations: c.total_operations,
      actual_operations: actualOps,
      expected_parameters: c.total_parameters,
      actual_parameters: actualParams,
      issues,
    };
  }
}
