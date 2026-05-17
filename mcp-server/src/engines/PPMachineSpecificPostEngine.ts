/**
 * PPMachineSpecificPostEngine — Phase 2+3 Capstone
 *
 * Generates complete post-processor configurations for specific machines
 * by combining all PP-AGI layers:
 *   - Controller embedding → identify dialect
 *   - Machine profile → kinematics + capabilities
 *   - Controller adaptation → machine-specific G-code tuning
 *   - Physics validation → ensure safety
 *   - Safety rules → operational compliance
 *
 * Produces a ready-to-use PostConfig for each supported machine,
 * including JM Die's actual inventory: Haas VF, Hurco VMX, Okuma
 * lathes/mill, Mitsubishi EDMs, Roku-Roku.
 *
 * @module PPMachineSpecificPostEngine
 */

import { controllerDialectEngine } from "./ControllerDialectEngine.js";
import { ppControllerAdaptationEngine } from "./PPControllerAdaptationEngine.js";
import { ppPhysicsConstraintValidatorEngine } from "./PPPhysicsConstraintValidatorEngine.js";

// ── Types ─────────────────────────────────────────────────────────────

export interface MachinePostConfig {
  machine_id: string;
  machine_name: string;
  controller_id: string;
  controller_name: string;

  // Program structure
  program_start: string[];
  safe_start: string;
  program_end: string[];
  comment_format: { open: string; close: string };

  // Movement codes
  rapid: string;
  linear: string;
  cw_arc: string;
  ccw_arc: string;
  arc_format: string;

  // Tool change
  tool_change_sequence: string[];

  // Spindle & coolant
  spindle_cw: string;
  spindle_ccw: string;
  spindle_stop: string;
  coolant_flood: string;
  coolant_mist: string;
  coolant_off: string;
  coolant_tsc?: string;

  // Work offsets
  work_offset_base: string;
  work_offset_extended?: string;

  // Features
  smoothing_codes: Record<string, string>;
  hsc_codes: Record<string, string>;
  tcpc?: { on: string; off: string };

  // Machine limits
  max_rpm: number;
  max_power_kW: number;
  max_feed_mm_min: number;
  axis_count: number;
  travel_mm: { x: number; y: number; z: number };

  // Optimization
  recommended_settings: {
    roughing: { feed_factor: number; doc_factor: number; notes: string };
    finishing: { feed_factor: number; doc_factor: number; notes: string };
  };

  // Metadata
  validation: "verified" | "inferred" | "untested";
  source: string;
  notes: string[];
}

// ── JM Die Machine Registry ───────────────────────────────────────────

interface JMDieMachineSpec {
  machine_id: string;
  machine_name: string;
  controller_id: string;
  controller_name: string;
  max_rpm: number;
  max_power_kW: number;
  max_feed_mm_min: number;
  axis_count: number;
  travel_mm: { x: number; y: number; z: number };
  coolant_tsc: boolean;
  validation: "verified" | "inferred";
  notes: string[];
}

const JM_DIE_MACHINES: JMDieMachineSpec[] = [
  // Mills
  { machine_id: "jmdie-haas-vf2", machine_name: "Haas VF-2", controller_id: "haas_ngc", controller_name: "Haas NGC", max_rpm: 8100, max_power_kW: 22.4, max_feed_mm_min: 16500, axis_count: 3, travel_mm: { x: 762, y: 406, z: 508 }, coolant_tsc: true, validation: "verified", notes: ["Primary mill", "CAT40 spindle", "20-station ATC"] },
  { machine_id: "jmdie-hurco-vmx30i", machine_name: "Hurco VMX 30i", controller_id: "hurco_max5", controller_name: "Hurco WinMAX", max_rpm: 12000, max_power_kW: 22, max_feed_mm_min: 20000, axis_count: 3, travel_mm: { x: 762, y: 508, z: 610 }, coolant_tsc: false, validation: "verified", notes: ["Conversational + G-code", "UltiMotion", "CAT40"] },
  { machine_id: "jmdie-hurco-vmx42", machine_name: "Hurco VMX 42", controller_id: "hurco_max5", controller_name: "Hurco WinMAX", max_rpm: 10000, max_power_kW: 18.6, max_feed_mm_min: 16500, axis_count: 3, travel_mm: { x: 1067, y: 610, z: 610 }, coolant_tsc: false, validation: "verified", notes: ["Larger envelope", "CAT40"] },
  { machine_id: "jmdie-okuma-m460v-5ax", machine_name: "Okuma Genos M460V-5AX", controller_id: "okuma_osp_p300", controller_name: "Okuma OSP-P300M", max_rpm: 15000, max_power_kW: 22, max_feed_mm_min: 32000, axis_count: 5, travel_mm: { x: 762, y: 460, z: 460 }, coolant_tsc: true, validation: "verified", notes: ["5-axis trunnion", "A/C rotary", "High-speed spindle"] },
  { machine_id: "jmdie-roku-roku", machine_name: "Roku-Roku HC-658", controller_id: "fanuc_31i", controller_name: "Fanuc 31i-B5", max_rpm: 40000, max_power_kW: 3.7, max_feed_mm_min: 30000, axis_count: 3, travel_mm: { x: 650, y: 550, z: 350 }, coolant_tsc: false, validation: "verified", notes: ["Ultra-precision", "Graphite/electrode milling", "40K spindle"] },

  // Lathes (Okuma)
  { machine_id: "jmdie-okuma-lb3000", machine_name: "Okuma LB3000 EX", controller_id: "okuma_osp_p300", controller_name: "Okuma OSP-P300L", max_rpm: 5000, max_power_kW: 22, max_feed_mm_min: 20000, axis_count: 2, travel_mm: { x: 260, y: 0, z: 600 }, coolant_tsc: true, validation: "verified", notes: ["Production lathe", "12-station turret"] },
  { machine_id: "jmdie-okuma-lu3000", machine_name: "Okuma LU3000 EX", controller_id: "okuma_osp_p300", controller_name: "Okuma OSP-P300L", max_rpm: 5000, max_power_kW: 30, max_feed_mm_min: 20000, axis_count: 4, travel_mm: { x: 260, y: 0, z: 600 }, coolant_tsc: true, validation: "verified", notes: ["Twin-turret", "Sub-spindle capable"] },

  // EDM
  { machine_id: "jmdie-mitsubishi-ea12v", machine_name: "Mitsubishi EA12V Sinker EDM", controller_id: "mitsubishi_m80", controller_name: "Mitsubishi M80", max_rpm: 0, max_power_kW: 5, max_feed_mm_min: 500, axis_count: 3, travel_mm: { x: 350, y: 250, z: 250 }, coolant_tsc: false, validation: "inferred", notes: ["Sinker EDM", "C-axis orbiting"] },
  { machine_id: "jmdie-mitsubishi-mv1200r", machine_name: "Mitsubishi MV1200R Wire EDM", controller_id: "mitsubishi_m80", controller_name: "Mitsubishi W30", max_rpm: 0, max_power_kW: 3, max_feed_mm_min: 200, axis_count: 4, travel_mm: { x: 400, y: 300, z: 215 }, coolant_tsc: false, validation: "inferred", notes: ["Wire EDM", "UV taper", "Submerged cutting"] },
];

// ── Engine ─────────────────────────────────────────────────────────────

export class PPMachineSpecificPostEngine {
  /**
   * Generate a complete post config for a JM Die machine.
   */
  generateConfig(machineId: string): MachinePostConfig | null {
    const spec = JM_DIE_MACHINES.find(m => m.machine_id === machineId);
    if (!spec) return null;

    const dialect = controllerDialectEngine.getDialect(spec.controller_id);
    const adaptation = ppControllerAdaptationEngine.adapt({
      controller_id: spec.controller_id,
      operation: "roughing",
    });

    return {
      machine_id: spec.machine_id,
      machine_name: spec.machine_name,
      controller_id: spec.controller_id,
      controller_name: spec.controller_name,

      program_start: dialect.program_start,
      safe_start: dialect.safe_start,
      program_end: dialect.program_end,
      comment_format: { open: dialect.comment_open, close: dialect.comment_close },

      rapid: dialect.rapid_code,
      linear: dialect.linear_code,
      cw_arc: dialect.cw_arc_code,
      ccw_arc: dialect.ccw_arc_code,
      arc_format: dialect.arc_format,

      tool_change_sequence: dialect.tool_change_sequence,

      spindle_cw: dialect.spindle_cw,
      spindle_ccw: dialect.spindle_ccw,
      spindle_stop: dialect.spindle_stop,
      coolant_flood: dialect.coolant_flood,
      coolant_mist: dialect.coolant_mist,
      coolant_off: dialect.coolant_off,
      coolant_tsc: spec.coolant_tsc ? (dialect.coolant_tsc ?? "M51") : undefined,

      work_offset_base: dialect.work_offsets.base,
      work_offset_extended: dialect.work_offsets.extended,

      smoothing_codes: adaptation.adapted.smoothing_setting
        ? { roughing: "", finishing: adaptation.adapted.smoothing_setting }
        : {},
      hsc_codes: adaptation.adapted.hsc_setting
        ? { finishing: adaptation.adapted.hsc_setting }
        : {},
      tcpc: dialect.features.tcpc,

      max_rpm: spec.max_rpm,
      max_power_kW: spec.max_power_kW,
      max_feed_mm_min: spec.max_feed_mm_min,
      axis_count: spec.axis_count,
      travel_mm: spec.travel_mm,

      recommended_settings: {
        roughing: {
          feed_factor: adaptation.adapted.feed_rate ? (adaptation.adapted.feed_rate / 1000) : 1.0,
          doc_factor: 1.0,
          notes: adaptation.adjustments.map(a => a.reason).join("; ") || "Standard parameters",
        },
        finishing: {
          feed_factor: 0.5,
          doc_factor: 0.2,
          notes: `Use ${adaptation.adapted.smoothing_setting ?? "standard"} smoothing`,
        },
      },

      validation: spec.validation,
      source: "JM Die Company machine inventory",
      notes: spec.notes,
    };
  }

  /** List all JM Die machines. */
  listMachines(): Array<{ id: string; name: string; controller: string; axes: number }> {
    return JM_DIE_MACHINES.map(m => ({
      id: m.machine_id, name: m.machine_name,
      controller: m.controller_name, axes: m.axis_count,
    }));
  }

  /** Get machine by ID. */
  getMachine(id: string): JMDieMachineSpec | null {
    return JM_DIE_MACHINES.find(m => m.machine_id === id) ?? null;
  }

  /** Generate configs for ALL JM Die machines. */
  generateAllConfigs(): MachinePostConfig[] {
    return JM_DIE_MACHINES.map(m => this.generateConfig(m.machine_id)!).filter(Boolean);
  }

  /** Validate a post config against physics for given conditions. */
  validateForJob(
    machineId: string,
    conditions: { spindle_rpm: number; feed_mm_min: number; doc_mm: number; woc_mm: number; tool_dia_mm: number; tool_flutes: number; kc?: number },
  ): { safe: boolean; issues: string[] } {
    const spec = JM_DIE_MACHINES.find(m => m.machine_id === machineId);
    if (!spec) return { safe: false, issues: ["Unknown machine"] };

    const issues: string[] = [];

    if (conditions.spindle_rpm > spec.max_rpm) {
      issues.push(`RPM ${conditions.spindle_rpm} exceeds machine max ${spec.max_rpm}`);
    }
    if (conditions.feed_mm_min > spec.max_feed_mm_min) {
      issues.push(`Feed ${conditions.feed_mm_min} exceeds machine max ${spec.max_feed_mm_min}`);
    }

    const validation = ppPhysicsConstraintValidatorEngine.validate({
      spindle_speed_rpm: conditions.spindle_rpm,
      feed_rate_mm_min: conditions.feed_mm_min,
      depth_of_cut_mm: conditions.doc_mm,
      width_of_cut_mm: conditions.woc_mm,
      tool_diameter_mm: conditions.tool_dia_mm,
      tool_flute_count: conditions.tool_flutes,
      material_kc1_1: conditions.kc,
      spindle_power_kW: spec.max_power_kW,
      machine_max_rpm: spec.max_rpm,
    });

    for (const check of validation.checks) {
      if (check.severity === "violation" || check.severity === "critical") {
        issues.push(check.message);
      }
    }

    return { safe: issues.length === 0, issues };
  }

  /** Get machine count. */
  getMachineCount(): number {
    return JM_DIE_MACHINES.length;
  }
}

export const ppMachineSpecificPostEngine = new PPMachineSpecificPostEngine();
