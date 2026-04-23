/**
 * PowerMill5AxisRobotFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM45
 *
 * PowerMill 2024 5-Axis & Robot Machining catalog: 12 operations across 5 categories.
 *   swarf_blade_port : swarf_simul5, blade_simul5, port_simul5
 *   tool_axis        : tool_axis_strategy, projection_5axis
 *   positional       : index_3plus2, curve_5axis
 *   wireframe        : wireframe_swarf
 *   robot            : robot_config, robot_reach, robot_trim, robot_post
 *
 * Helpers (real classification/selection logic):
 *   - recommendByFeature(intent) → routing
 *   - classifyKinematicConfig(rotary_axes_on_head, rotary_axes_on_table) → head_head / table_table / mixed / robot_articulated
 *   - checkSingularityRisk(primary_rotary_deg, kinematic_type, threshold_deg) → safe / caution / critical based on proximity to 0°
 *   - validateRobotReach(target_distance_mm, upper_arm_mm, forearm_mm) → reach annulus check (|L1-L2| ≤ d ≤ L1+L2)
 */

import * as path from "path";
import { fileURLToPath } from "url";
import * as fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let _catalog: any | null = null;
function loadCatalog(): any {
  if (_catalog) return _catalog;
  const candidates = [
    path.resolve(__dirname, "../../data/cam-functions/powermill/5axis-robot.json"),
    path.resolve(__dirname, "../data/cam-functions/powermill/5axis-robot.json"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      _catalog = JSON.parse(fs.readFileSync(p, "utf8"));
      return _catalog;
    }
  }
  throw new Error("PowerMill5AxisRobotFunctionIndexEngine: 5axis-robot.json not found");
}

export type PM5AxisRobotIntent =
  | "ruled_swarf_wall"
  | "impeller_blade_full_chain"
  | "intake_exhaust_port"
  | "axis_overlay_on_3axis"
  | "project_2d_pattern_to_3d"
  | "indexed_3plus2_undercut"
  | "engrave_along_curve"
  | "wireframe_only_swarf"
  | "robot_cell_setup"
  | "robot_pre_flight_validation"
  | "robot_composite_trim"
  | "robot_vendor_post";

export type KinematicType = "head_head" | "table_table" | "mixed" | "robot_articulated";

export interface KinematicClassification {
  kinematic_type: KinematicType;
  rotary_on_head: number;
  rotary_on_table: number;
  reason: string;
}

export interface SingularityResult {
  classification: "safe" | "caution" | "critical";
  primary_rotary_deg: number;
  proximity_to_singularity_deg: number;
  threshold_deg: number;
  recommendation: string;
}

export interface RobotReachResult {
  is_reachable: boolean;
  status: "in_envelope" | "too_close" | "too_far";
  target_distance_mm: number;
  min_reach_mm: number;
  max_reach_mm: number;
  margin_mm: number;
  recommendation: string;
}

export class PowerMill5AxisRobotFunctionIndexEngine {
  static getIndex(): any { return loadCatalog(); }

  static getSummary(): any {
    const c = loadCatalog();
    const ops = Object.values(c.operations) as any[];
    return {
      schemaVersion: c.schemaVersion,
      system_id: c.system_id,
      section_key: c.section_key,
      version: c.version,
      total_operations: ops.length,
      total_parameters: ops.reduce((a, o) => a + o.parameter_count, 0),
      categories: c.categories,
      training_topics_count: c.training_topics.length,
    };
  }

  static listOperations() {
    const c = loadCatalog();
    return Object.entries(c.operations).map(([id, op]: any) => ({
      operation_id: id,
      category: op.category,
      parameter_count: op.parameter_count,
      display_name: op.display_name,
    }));
  }

  static getOperation(operation_id: string): any {
    const c = loadCatalog();
    const op = c.operations[operation_id];
    if (!op) return { error: `Unknown PowerMill 5-axis/robot operation: ${operation_id}` };
    return { operation_id, ...op };
  }

  static getOperationsByCategory(category: string) {
    const c = loadCatalog();
    const target = String(category).toLowerCase();
    return Object.entries(c.operations)
      .filter(([_id, op]: any) => op.category.toLowerCase() === target)
      .map(([id, op]: any) => ({
        operation_id: id,
        category: op.category,
        parameter_count: op.parameter_count,
        display_name: op.display_name,
      }));
  }

  static findParameter(parameter_name: string, limit = 20) {
    const c = loadCatalog();
    const needle = String(parameter_name).toLowerCase();
    const out: Array<{ operation_id: string; group: string; parameter: string }> = [];
    for (const [opId, op] of Object.entries(c.operations) as any) {
      for (const [grp, params] of Object.entries(op.parameters) as any) {
        for (const pName of Object.keys(params)) {
          if (pName.toLowerCase().includes(needle)) {
            out.push({ operation_id: opId, group: grp, parameter: pName });
            if (out.length >= limit) return out;
          }
        }
      }
    }
    return out;
  }

  static getCategoryBreakdown() {
    const c = loadCatalog();
    const map = new Map<string, { ops: string[]; params: number }>();
    for (const [id, op] of Object.entries(c.operations) as any) {
      const e = map.get(op.category) ?? { ops: [], params: 0 };
      e.ops.push(id);
      e.params += op.parameter_count;
      map.set(op.category, e);
    }
    return Array.from(map.entries()).map(([category, v]) => ({
      category,
      operations: v.ops,
      total_parameters: v.params,
    }));
  }

  static getTrainingTopics(): any[] { return loadCatalog().training_topics; }

  /**
   * recommendByFeature — 12 intents → (primary, alternative, reason).
   */
  static recommendByFeature(intent: PM5AxisRobotIntent | string): { primary: string; alternative: string[]; reason: string } {
    const map: Record<string, { primary: string; alternative: string[]; reason: string }> = {
      ruled_swarf_wall: { primary: "swarf_simul5", alternative: ["wireframe_swarf"], reason: "Flank-cut on ruled drive surface — single pass per V step." },
      impeller_blade_full_chain: { primary: "blade_simul5", alternative: ["swarf_simul5"], reason: "Multi-stage impeller chain (rough slice → finish PS/SS → hub fillet → LE cleanup)." },
      intake_exhaust_port: { primary: "port_simul5", alternative: [], reason: "Centerline-driven port machining for cylinder-head intake/exhaust." },
      axis_overlay_on_3axis: { primary: "tool_axis_strategy", alternative: [], reason: "Layer a tool-axis policy onto an existing 3-axis or wireframe path." },
      project_2d_pattern_to_3d: { primary: "projection_5axis", alternative: ["tool_axis_strategy"], reason: "Project raster/radial/spiral/pencil onto 3D surface with tilt." },
      indexed_3plus2_undercut: { primary: "index_3plus2", alternative: [], reason: "Lock rotary axes; run normal 3-axis in undercut frame." },
      engrave_along_curve: { primary: "curve_5axis", alternative: [], reason: "Tool follows a 3D curve with controlled axis (engrave/deburr/edge break)." },
      wireframe_only_swarf: { primary: "wireframe_swarf", alternative: ["swarf_simul5"], reason: "Swarf driven by paired top/bottom curves (no surface)." },
      robot_cell_setup: { primary: "robot_config", alternative: [], reason: "Robot kinematic chain definition (vendor, links, joint limits, TCP)." },
      robot_pre_flight_validation: { primary: "robot_reach", alternative: [], reason: "Reach + singularity + joint-limit check before posting." },
      robot_composite_trim: { primary: "robot_trim", alternative: [], reason: "Trim composite parts (CFRP/GFRP/foam) along a path projection." },
      robot_vendor_post: { primary: "robot_post", alternative: [], reason: "Convert toolpath to vendor-native dialect (RAPID/KRL/TPP/INFORM)." },
    };
    return map[String(intent)] ?? {
      primary: "tool_axis_strategy",
      alternative: ["swarf_simul5"],
      reason: `Unknown intent '${intent}' — defaulting to tool-axis-strategy overlay.`,
    };
  }

  /**
   * classifyKinematicConfig — categorize a 5-axis machine by where the rotary
   * axes live: on the head, on the table, mixed, or articulated robot.
   *
   *   head_head        : ≥ 2 rotary axes on the spindle head (e.g. DMG B-C head)
   *   table_table      : ≥ 2 rotary axes on the table (e.g. Mazak A-C trunnion)
   *   mixed            : 1 rotary on head + 1 on table (e.g. Hermle B-head + C-table)
   *   robot_articulated: 6-DOF arm — set both inputs to 0 and pass robot=true via type
   *
   * Robot path: callers pass rotary_on_head=0 + rotary_on_table=0; the function
   * still accepts that as articulated when robot_articulated_override is true,
   * which is exposed via a 3rd (default false) parameter.
   */
  static classifyKinematicConfig(
    rotary_on_head: number,
    rotary_on_table: number,
    robot_articulated_override = false,
  ): KinematicClassification | { error: string } {
    if (!Number.isInteger(rotary_on_head) || rotary_on_head < 0 || rotary_on_head > 3) {
      return { error: "rotary_on_head must be a non-negative integer ≤ 3" };
    }
    if (!Number.isInteger(rotary_on_table) || rotary_on_table < 0 || rotary_on_table > 3) {
      return { error: "rotary_on_table must be a non-negative integer ≤ 3" };
    }
    if (robot_articulated_override) {
      return {
        kinematic_type: "robot_articulated",
        rotary_on_head,
        rotary_on_table,
        reason: "Articulated robot (6-DOF arm) — kinematics handled by robot_config strategy.",
      };
    }
    let kinematic_type: KinematicType;
    let reason: string;
    const total = rotary_on_head + rotary_on_table;
    if (total < 2) {
      return {
        kinematic_type: "table_table",
        rotary_on_head,
        rotary_on_table,
        reason: `Only ${total} rotary axis present — not a 5-axis configuration.`,
      };
    }
    if (rotary_on_head >= 2 && rotary_on_table === 0) {
      kinematic_type = "head_head";
      reason = "Both rotary axes on spindle head — head-head config (B-C head, e.g. DMG MORI).";
    } else if (rotary_on_table >= 2 && rotary_on_head === 0) {
      kinematic_type = "table_table";
      reason = "Both rotary axes on table — table-table config (A-C trunnion, e.g. Mazak / Haas UMC).";
    } else {
      kinematic_type = "mixed";
      reason = "1 rotary on head + 1 on table — mixed config (B-head + C-table, e.g. Hermle).";
    }
    return { kinematic_type, rotary_on_head, rotary_on_table, reason };
  }

  /**
   * checkSingularityRisk — most 5-axis kinematics have a singularity at the
   * pole of their primary rotary (B=0 on head-head, A=0 on table-table). When
   * the path passes near the pole, the secondary rotary swings wildly to
   * compensate. This helper reports proximity risk.
   *
   *   safe:     |angle| > threshold + buffer   (default buffer = 5°)
   *   caution:  threshold ≤ |angle| ≤ threshold + buffer
   *   critical: |angle| < threshold
   */
  static checkSingularityRisk(
    primary_rotary_deg: number,
    threshold_deg = 3,
  ): SingularityResult | { error: string } {
    if (!Number.isFinite(primary_rotary_deg)) {
      return { error: "primary_rotary_deg must be a finite number" };
    }
    if (!Number.isFinite(threshold_deg) || threshold_deg <= 0 || threshold_deg > 30) {
      return { error: "threshold_deg must be in (0, 30]" };
    }
    const buffer = 5;
    const proximity = Math.abs(primary_rotary_deg);
    let classification: SingularityResult["classification"];
    let rec: string;
    if (proximity > threshold_deg + buffer) {
      classification = "safe";
      rec = `Primary rotary ${primary_rotary_deg}° is well clear of pole (>${(threshold_deg + buffer).toFixed(1)}°).`;
    } else if (proximity >= threshold_deg) {
      classification = "caution";
      rec = `Primary rotary ${primary_rotary_deg}° is near pole — enable axis smoothing and verify motion in simulation.`;
    } else {
      classification = "critical";
      rec = `Primary rotary ${primary_rotary_deg}° is INSIDE singularity zone (|angle|<${threshold_deg}°) — secondary axis will swing; reroute the path.`;
    }
    return {
      classification,
      primary_rotary_deg,
      proximity_to_singularity_deg: proximity,
      threshold_deg,
      recommendation: rec,
    };
  }

  /**
   * validateRobotReach — checks whether a target point is inside the robot's
   * reach annulus. For a 2-link arm:
   *
   *   max_reach = upper_arm + forearm
   *   min_reach = |upper_arm - forearm|
   *
   * The point is reachable iff min_reach ≤ distance ≤ max_reach. Wrist offset
   * is added to max_reach as a small bonus.
   */
  static validateRobotReach(
    target_distance_mm: number,
    upper_arm_mm: number,
    forearm_mm: number,
    wrist_offset_mm = 0,
  ): RobotReachResult | { error: string } {
    if (!Number.isFinite(target_distance_mm) || target_distance_mm < 0) {
      return { error: "target_distance_mm must be a non-negative finite number" };
    }
    if (!Number.isFinite(upper_arm_mm) || upper_arm_mm <= 0) {
      return { error: "upper_arm_mm must be a positive finite number" };
    }
    if (!Number.isFinite(forearm_mm) || forearm_mm <= 0) {
      return { error: "forearm_mm must be a positive finite number" };
    }
    if (!Number.isFinite(wrist_offset_mm) || wrist_offset_mm < 0) {
      return { error: "wrist_offset_mm must be a non-negative finite number" };
    }
    const max_reach = upper_arm_mm + forearm_mm + wrist_offset_mm;
    const min_reach = Math.abs(upper_arm_mm - forearm_mm);
    let status: RobotReachResult["status"];
    let margin: number;
    let rec: string;
    if (target_distance_mm > max_reach) {
      status = "too_far";
      margin = target_distance_mm - max_reach;
      rec = `Target ${target_distance_mm}mm > max reach ${max_reach}mm — out of reach by ${margin.toFixed(1)}mm. Reposition base or use larger robot.`;
    } else if (target_distance_mm < min_reach) {
      status = "too_close";
      margin = min_reach - target_distance_mm;
      rec = `Target ${target_distance_mm}mm < min reach ${min_reach}mm — too close (deficit ${margin.toFixed(1)}mm). Reposition base further from part.`;
    } else {
      status = "in_envelope";
      const margin_to_max = max_reach - target_distance_mm;
      const margin_to_min = target_distance_mm - min_reach;
      margin = Math.min(margin_to_max, margin_to_min);
      rec = `In reach envelope. Tightest margin ${margin.toFixed(1)}mm.`;
    }
    return {
      is_reachable: status === "in_envelope",
      status,
      target_distance_mm,
      min_reach_mm: min_reach,
      max_reach_mm: max_reach,
      margin_mm: margin,
      recommendation: rec,
    };
  }
}

export const powerMill5AxisRobotFunctionIndexEngine = PowerMill5AxisRobotFunctionIndexEngine;
