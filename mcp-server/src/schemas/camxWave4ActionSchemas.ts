/**
 * CAMX Wave 4 Action Schemas — Zod v4
 *
 * 11 dispatcher actions across 4 engines:
 *   E1137 ToolChangeOptimizationEngine (CAMX-MS13/U02):
 *     tool_change_optimize     — resequence operations to minimize tool changes
 *     tool_change_magazine     — optimize magazine layout for min rotation time
 *     tool_change_sharing      — consolidate tools across operations
 *
 *   E1138 SafetyEscalationEngine (CAMX-MS14/U03):
 *     safety_escalate          — auto-escalate vetoed parameters (iterative derating)
 *     safety_escalate_preview  — preview escalation without applying
 *
 *   E1139 CollisionPreventionEngine (CAMX-MS14/U04):
 *     collision_prevent_full   — full toolpath collision pre-check
 *     collision_prevent_certify — quick pass/fail certification
 *     collision_prevent_zones  — get contiguous collision zones
 *
 *   E1140 FleetLearningStrategyEngine (CAMX-MS15/U04):
 *     fleet_aggregate          — hierarchical Bayesian aggregation across shops
 *     fleet_transfer           — transfer learning from source to target context
 *     fleet_insights           — fleet-level performance intelligence
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── E1137: ToolChangeOptimizationEngine ──────────────────────────────────────

const toolChangeOperationZ = z.object({
  id: z.string().min(1).describe("Operation identifier"),
  tool_id: z.string().min(1).describe("Tool identifier"),
  tool_diameter_mm: z.number().positive().describe("Tool diameter [mm]"),
  num_flutes: z.number().int().positive().optional(),
  tool_type: z.enum(["flat", "ball", "bull_nose", "drill", "tap", "reamer", "chamfer", "face_mill"]).optional(),
  operation_type: z.enum(["rough", "semi_finish", "finish", "drill", "bore", "thread", "deburr", "chamfer"]).optional(),
  cutting_time_min: z.number().nonnegative().optional(),
  required_Ra_um: z.number().positive().optional(),
  feature_id: z.string().optional(),
  prerequisites: z.array(z.string()).optional(),
  wear_fraction: z.number().min(0).max(1).optional(),
}).passthrough();

const magazineToolZ = z.object({
  tool_id: z.string().min(1),
  diameter_mm: z.number().positive(),
  length_mm: z.number().positive(),
  weight_kg: z.number().nonnegative().optional(),
  pockets_required: z.number().int().positive().optional(),
  usage_rank: z.number().int().positive().optional(),
  current_wear_pct: z.number().min(0).max(100).optional(),
  is_sister: z.boolean().optional(),
  sister_of: z.string().optional(),
}).passthrough();

const machineConfigZ = z.object({
  magazine_capacity: z.number().int().positive().describe("Total magazine pockets"),
  magazine_type: z.enum(["linear", "drum", "chain", "matrix"]).optional(),
  atc_swap_sec: z.number().positive().optional(),
  time_per_slot_sec: z.number().positive().optional(),
  blocked_pockets: z.array(z.number().int().positive()).optional(),
  heavy_pockets: z.array(z.number().int().positive()).optional(),
}).passthrough();

// ── E1138: SafetyEscalationEngine ────────────────────────────────────────────

const vetoRuleZ = z.enum([
  "power_veto", "deflection_veto", "chatter_veto", "collision_veto",
  "workholding_veto", "coolant_veto", "rpm_veto", "torque_veto",
]);

const escalationVetoReportZ = z.object({
  vetoed: z.boolean(),
  active_vetoes: z.array(vetoRuleZ),
  details: z.record(z.string(), z.object({
    original_value: z.number(),
    limit: z.number(),
    detail: z.string(),
  })).optional(),
}).passthrough();

const escalationParamsZ = z.object({
  ap_mm: z.number().positive().describe("Axial depth of cut [mm]"),
  fz_mm: z.number().positive().describe("Feed per tooth [mm/tooth]"),
  Vc_mpm: z.number().positive().describe("Cutting speed [m/min]"),
  RPM: z.number().positive().describe("Spindle speed [rpm]"),
  D_mm: z.number().positive().describe("Tool diameter [mm]"),
  L_mm: z.number().positive().optional().describe("Tool overhang [mm]"),
  ae_mm: z.number().positive().optional().describe("Radial depth of cut [mm]"),
  num_flutes: z.number().int().positive().optional(),
  strategy: z.string().optional(),
  has_spring_pass: z.boolean().optional(),
}).passthrough();

const escalationMachineLimitsZ = z.object({
  max_power_kW: z.number().positive(),
  max_rpm: z.number().positive(),
  max_torque_Nm: z.number().positive(),
}).passthrough();

// ── E1139: CollisionPreventionEngine ─────────────────────────────────────────

const toolpathBlockZ = z.object({
  index: z.number().int().nonnegative(),
  x: z.number(), y: z.number(), z: z.number(),
  i: z.number().optional(), j: z.number().optional(), k: z.number().optional(),
  motion: z.enum(["rapid", "linear", "cw_arc", "ccw_arc"]).optional(),
  feed_mmpm: z.number().nonnegative().optional(),
}).passthrough();

const preventionToolAssemblyZ = z.object({
  diameter_mm: z.number().positive().describe("Tool cutting diameter [mm]"),
  cutting_length_mm: z.number().positive().optional(),
  overall_length_mm: z.number().positive().optional(),
  holder_diameter_mm: z.number().positive().optional(),
  holder_length_mm: z.number().positive().optional(),
  spindle_diameter_mm: z.number().positive().optional(),
  tool_type: z.enum(["flat", "ball", "bull_nose", "drill", "tap", "barrel"]).optional(),
  barrel_radius_mm: z.number().positive().optional(),
  gauge_length_mm: z.number().positive().optional(),
}).passthrough();

const boundingBoxZ = z.object({
  id: z.string().min(1),
  body_type: z.enum(["stock", "fixture", "machine_structure", "rotary_table"]),
  min_x: z.number(), min_y: z.number(), min_z: z.number(),
  max_x: z.number(), max_y: z.number(), max_z: z.number(),
}).passthrough();

// ── E1140: FleetLearningStrategyEngine ───────────────────────────────────────

const fleetIsoGroupZ = z.enum(["P", "M", "K", "N", "S", "H"]);

const shopPerformanceRecordZ = z.object({
  shop_id: z.string().min(1),
  machine_id: z.string().min(1),
  strategy_id: z.string().min(1),
  feature_type: z.string().min(1),
  material_iso: fleetIsoGroupZ,
  tool_diameter_mm: z.number().positive(),
  cycle_time_min: z.number().positive(),
  tool_life_min: z.number().positive().optional(),
  Ra_um: z.number().positive().optional(),
  outcome: z.enum(["success", "failure", "partial"]),
  timestamp: z.string().min(1),
  user_id: z.string().optional(),
  tags: z.record(z.string(), z.string()).optional(),
}).passthrough();

const shopDataZ = z.object({
  shop_id: z.string().min(1),
  shop_name: z.string().optional(),
  machine_count: z.number().int().positive().optional(),
  records: z.array(shopPerformanceRecordZ),
}).passthrough();

const transferContextZ = z.object({
  feature_type: z.string().min(1),
  material_iso: fleetIsoGroupZ,
  tool_diameter_mm: z.number().positive(),
  machine_type: z.enum(["3axis", "5axis", "lathe", "mill_turn"]).optional(),
  strategy_id: z.string().optional(),
  hardness_HRC: z.number().positive().optional(),
}).passthrough();

// ── Exported schema map ──────────────────────────────────────────────────────

export const ACTION_CAMX_WAVE4_SCHEMAS: ActionSchemaMap = {
  // E1137
  tool_change_optimize: z.object({
    operations: z.array(toolChangeOperationZ).min(1).describe("Operations to resequence"),
    tools: z.array(magazineToolZ).optional().describe("Available tools"),
    magazine_capacity: z.number().int().positive().optional().describe("Magazine pocket count"),
  }),
  tool_change_magazine: z.object({
    tools: z.array(magazineToolZ).min(1).describe("Tools to place in magazine"),
    machine: machineConfigZ.describe("Machine magazine configuration"),
    operation_sequence: z.array(z.string()).optional().describe("Planned tool usage order (tool_ids)"),
  }),
  tool_change_sharing: z.object({
    operations: z.array(toolChangeOperationZ).min(1).describe("Operations to analyze for tool sharing"),
  }),

  // E1138
  safety_escalate: z.object({
    veto_report: escalationVetoReportZ.describe("Veto report from SafetyVetoEngine"),
    params: escalationParamsZ.describe("Original machining parameters"),
    machine_limits: escalationMachineLimitsZ.optional(),
    max_iterations: z.number().int().min(1).max(10).optional().describe("Max escalation attempts (default 3)"),
  }),
  safety_escalate_preview: z.object({
    veto_report: escalationVetoReportZ.describe("Veto report from SafetyVetoEngine"),
    params: escalationParamsZ.describe("Original machining parameters"),
    machine_limits: escalationMachineLimitsZ.optional(),
    max_iterations: z.number().int().min(1).max(10).optional(),
  }),

  // E1139
  collision_prevent_full: z.object({
    blocks: z.array(toolpathBlockZ).min(1).describe("Toolpath blocks to check"),
    tool_assembly: preventionToolAssemblyZ,
    stock: boundingBoxZ.describe("Stock bounding box"),
    fixtures: z.array(boundingBoxZ).optional().describe("Fixture bodies"),
    machine_envelope: z.object({
      min_x: z.number(), min_y: z.number(), min_z: z.number(),
      max_x: z.number(), max_y: z.number(), max_z: z.number(),
    }).optional(),
    safety_margin_mm: z.number().positive().optional().describe("Safety margin [mm] (default 2)"),
  }),
  collision_prevent_certify: z.object({
    blocks: z.array(toolpathBlockZ).min(1),
    tool_assembly: preventionToolAssemblyZ,
    stock: boundingBoxZ,
    fixtures: z.array(boundingBoxZ).optional(),
    safety_margin_mm: z.number().positive().optional(),
  }),
  collision_prevent_zones: z.object({
    blocks: z.array(toolpathBlockZ).min(1),
    tool_assembly: preventionToolAssemblyZ,
    stock: boundingBoxZ,
    fixtures: z.array(boundingBoxZ).optional(),
    safety_margin_mm: z.number().positive().optional(),
  }),

  // E1140
  fleet_aggregate: z.object({
    shop_data: z.array(shopDataZ).min(1).describe("Performance data from multiple shops"),
    strategy_filter: z.string().optional().describe("Filter to specific strategy"),
    material_filter: fleetIsoGroupZ.optional().describe("Filter to specific material group"),
  }),
  fleet_transfer: z.object({
    source_data: z.array(shopDataZ).min(1).describe("Source fleet data"),
    source_context: transferContextZ.describe("Source manufacturing context"),
    target_context: transferContextZ.describe("Target manufacturing context"),
  }),
  fleet_insights: z.object({
    shop_data: z.array(shopDataZ).min(1),
    strategy_id: z.string().min(1).describe("Strategy to analyze"),
    material_iso: fleetIsoGroupZ.describe("Material group"),
    top_k: z.number().int().positive().optional().describe("Number of top/bottom shops (default 5)"),
  }),
};
