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
// FIVE-AXIS DEEP LEARNING (deepReason + learning-outcome feedback loop)
// ============================================================================

// Geometry is accepted as a free string: deepReason matches it against the
// strategy catalog and falls back gracefully on an unknown geometry, so it is
// not hard-enumed here (forward-compatible with new FiveAxisGeometry values).
const featureSignatureSchema = z.object({
  type: z.string().min(1),
  dimensions: z.object({}).passthrough().optional(),
  complexity_score: optNum,
  undercut_count: optNum,
  thin_wall_count: optNum,
  tight_tolerance_count: optNum,
  surface_area_mm2: optNum,
  volume_mm3: optNum,
}).passthrough();

// deepReason (via generateChainOfThought) dereferences part_features[0].type,
// material.iso_group, constraints.operator_skill, AND machine.{machine_id,
// kinematic_type,rtcp_enabled,primary_axis,secondary_axis} -- it CRASHES if any
// is missing (empty part_features -> part_features[0]; absent machine ->
// machine.machine_id). All are required; deriveParameters is machine-independent
// so axis_limits/pivot fields stay optional (passthrough).
const five_axis_deep_learn = z.object({
  part_features: z.array(featureSignatureSchema).min(1),
  material: z.object({
    iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
    // kc11_mpa is the division denominator in getMaterialScale (engine:1283) on the
    // template-scaling path -> a missing/zero value yields NaN spindle_rpm/feed/ap
    // cutting params (slimResponse does NOT strip NaN). Require it positive so a
    // malformed material is rejected at the boundary, never emitting NaN from this
    // safety-critical dispatcher.
    kc11_mpa: posNum,
  }).passthrough(),
  machine: z.object({
    machine_id: z.string().min(1),
    kinematic_type: z.enum(["table_table", "head_head", "mixed_AC", "mixed_BC"]),
    primary_axis: z.enum(["A", "B"]),
    secondary_axis: z.enum(["C"]).default("C"),
    rtcp_enabled: z.boolean(),
  }).passthrough(),
  constraints: z.object({
    batch_size: posNum,
    operator_skill: z.number().int().min(1).max(5),
    max_cycle_time_min: optPosNum,
    target_ra_um: optPosNum,
  }).passthrough(),
  similar_templates: z.array(z.object({}).passthrough()).optional(),
  require_explanation: z.boolean().default(false),
}).passthrough();

// recordOutcome: predicted.cycle_time_min / surface_ra_um are denominators in
// getLearningStats' error-% calc, so they must be positive (guards a div-by-zero
// -> NaN in the aggregated stats).
const five_axis_deep_learn_feedback = z.object({
  template_id: z.string().min(1),
  prediction_id: z.string().min(1),
  predicted: z.object({
    cycle_time_min: posNum,
    surface_ra_um: posNum,
    tool_life_pct: z.number(),
  }).passthrough(),
  actual: z.object({
    cycle_time_min: z.number(),
    surface_ra_um: z.number(),
    tool_life_pct: z.number(),
  }).passthrough(),
  success: z.boolean(),
  feedback: z.string().optional(),
}).passthrough();

// getLearningStats takes no params.
const five_axis_deep_learn_stats = z.object({}).passthrough();

// ============================================================================
// FIVE-AXIS DECISION (FiveAxisDecisionEngine.decide)
// ============================================================================

// decide() + its sub-methods (buildReasoningChain/analyzeRTCP/analyzeSingularities/
// generateCandidates...) dereference part_features[0], machine.machine_name,
// machine.axis_limits.{A_min,A_max,C_min,C_max}, tool.*, and the flat scalar
// fields. A missing parent object throws, so the parents (+ machine.axis_limits)
// are required; matches FiveAxisDecisionInput. (decide is deterministic: the
// use_llm_reasoning flag does NOT trigger an external call.)
const five_axis_decision = z.object({
  part_features: z.array(z.object({
    feature_type: z.string().min(1),
    // min(1): a 5-axis feature needs >=1 tool orientation; an empty array makes
    // buildReasoningChain's Math.max(...[]) = -Infinity -> a "NaN" string in the
    // reasoning text (cosmetic but a real defect). Reject it at the boundary.
    required_orientations: z.array(
      z.object({ i: z.number(), j: z.number(), k: z.number() }).passthrough(),
    ).min(1),
    surface_tolerance_mm: posNum,
    max_depth_mm: posNum,
    min_tool_length_mm: posNum,
    has_undercuts: z.boolean(),
    has_thin_walls: z.boolean(),
    accessibility_score: z.number(),
    scallop_height_mm: optPosNum,
  }).passthrough()).min(1),
  machine: z.object({
    machine_name: z.string().min(1),
    kinematic_type: z.string().min(1),
    primary_rotary: z.enum(["A", "B"]),
    secondary_rotary: z.enum(["C"]).default("C"),
    axis_limits: z.object({
      A_min: z.number(),
      A_max: z.number(),
      B_min: optNum,
      B_max: optNum,
      C_min: z.number(),
      C_max: z.number(),
    }).passthrough(),
    max_rpm: posNum,
    max_rotary_speed_deg_per_sec: posNum,
    pivot_to_gauge_mm: posNum,
    pivot_to_table_mm: posNum,
    rtcp_enabled: z.boolean(),
  }).passthrough(),
  tool: z.object({
    type: z.enum(["ball_nose", "bull_nose", "flat_end", "lollipop", "barrel"]),
    diameter_mm: posNum,
    flute_length_mm: posNum,
    overall_length_mm: posNum,
    gauge_length_mm: posNum,
  }).passthrough(),
  material: z.string().min(1),
  batch_size: posNum,
  operator_skill: z.number().int().min(1).max(5),
  feed_rate_mm_per_min: posNum,
  include_reasoning: z.boolean().optional(),
  use_llm_reasoning: z.boolean().optional(),
}).passthrough();

// ============================================================================
// FUSION 5-AXIS STRATEGY (Fusion5AxisEngine.recommendStrategy)
// ============================================================================

// recommendStrategy(geometry, operation, tool) reads tool.type (crashes if tool
// absent); geometry/operation only filter+score (an unknown value degrades to an
// empty recommendation, never a crash) -> geometry stays a forward-compatible
// string, operation + tool are strict.
const fusion_5axis_strategy = z.object({
  geometry: z.string().min(1),
  operation: z.enum(["roughing", "semi_finishing", "finishing"]),
  tool: z.object({
    type: z.enum(["ball_nose", "bull_nose", "flat_end", "barrel", "tapered_ball", "lollipop"]),
    diameter_mm: posNum,
    corner_radius_mm: optPosNum,
    flute_count: posNum,
    flute_length_mm: posNum,
    overall_length_mm: posNum,
    helix_angle_deg: z.number(),
  }).passthrough(),
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
  five_axis_decision,
  fusion_5axis_strategy,
  five_axis_deep_learn,
  five_axis_deep_learn_feedback,
  five_axis_deep_learn_stats,
};
