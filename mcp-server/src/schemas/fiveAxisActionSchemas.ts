/**
 * Five-Axis Dispatcher Action Schemas
 * =====================================
 * Per-action Zod schemas for all 5 prism_5axis actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 * STRICT mode: safety-critical — reject invalid params.
 *
 * @module schemas/fiveAxisActionSchemas
 * @version 1.0.0
 * @milestone SYS-MS6-U02
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

const kinematicType = z.enum([
  "table_table", "head_head", "mixed_AC", "mixed_BC", "head_table", "mixed",
  "table_table_AC", "table_table_BC", "head_head_AC", "head_head_BC",
]);

const unitVector = z.object({ i: z.number(), j: z.number(), k: z.number() }).passthrough();
const point3d = z.object({ x: z.number(), y: z.number(), z: z.number() }).passthrough();

// ============================================================================
// RTCP COMPENSATION
// ============================================================================

const rtcp_calc = z.object({
  kinematic_type: kinematicType,
  pivot_to_gauge_mm: posNum,
  pivot_to_table_mm: posNum,
  tool_length_mm: posNum,
  tool_gauge_length_mm: posNum,
  A_deg: z.number(),
  B_deg: optNum,
  C_deg: z.number(),
  X_mm: z.number(),
  Y_mm: z.number(),
  Z_mm: z.number(),
  tolerance_mm: z.number().positive().default(0.01),
}).passthrough();

// ============================================================================
// SINGULARITY DETECTION
// ============================================================================

const singularity_check = z.object({
  kinematic_type: kinematicType,
  toolpath_points: z.array(z.object({
    x: z.number(), y: z.number(), z: z.number(),
    i: z.number(), j: z.number(), k: z.number(),
  })).min(1),
  rotary_axis_1: z.enum(["A", "B"]),
  rotary_axis_2: z.enum(["C"]).default("C"),
  angular_velocity_limit_deg_per_sec: posNum,
  feed_rate_mm_per_min: posNum,
}).passthrough();

// ============================================================================
// TILT ANGLE OPTIMIZATION
// ============================================================================

const tilt_optimize = z.object({
  tool_type: z.enum(["ball_nose", "bull_nose", "flat_end", "barrel", "lens"]),
  tool_diameter_mm: posNum,
  corner_radius_mm: optPosNum,
  barrel_radius_mm: optPosNum,
  surface_normal: unitVector,
  surface_curvature_1_per_mm: optNum,
  step_over_mm: posNum,
  scallop_target_um: posNum,
  strategy: z.enum(["lead_only", "tilt_only", "lead_and_tilt", "auto_optimal"]),
  max_tilt_deg: z.number().positive().max(90).default(30),
}).passthrough();

// ============================================================================
// WORK ENVELOPE VALIDATION
// ============================================================================

const work_envelope = z.object({
  axis_limits: z.object({
    X_min_mm: z.number(), X_max_mm: z.number(),
    Y_min_mm: z.number(), Y_max_mm: z.number(),
    Z_min_mm: z.number(), Z_max_mm: z.number(),
    A_min_deg: optNum, A_max_deg: optNum,
    B_min_deg: optNum, B_max_deg: optNum,
    C_min_deg: optNum, C_max_deg: optNum,
  }).passthrough(),
  toolpath_points: z.array(z.object({
    X: z.number(), Y: z.number(), Z: z.number(),
    A: optNum, B: optNum, C: optNum,
    is_rapid: z.boolean().optional(),
  }).passthrough()).min(1),
  tool_length_mm: posNum,
  workpiece_height_mm: posNum,
  fixture_height_mm: posNum,
  safety_margin_mm: posNum,
}).passthrough();

// ============================================================================
// INVERSE KINEMATICS
// ============================================================================

const inverse_kin = z.object({
  kinematic_type: kinematicType,
  tip_x_mm: z.number(),
  tip_y_mm: z.number(),
  tip_z_mm: z.number(),
  axis_i: z.number(),
  axis_j: z.number(),
  axis_k: z.number(),
  pivot_length_mm: posNum,
  tool_gauge_length_mm: posNum,
  prev_A_deg: optNum,
  prev_B_deg: optNum,
  prev_C_deg: optNum,
}).passthrough();

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

/** A C T I O N_ F I V E A X I S_ S C H E M A S constant.
 */
export const ACTION_FIVEAXIS_SCHEMAS: ActionSchemaMap = {
  rtcp_calc,
  singularity_check,
  tilt_optimize,
  work_envelope,
  inverse_kin,
};
