/**
 * Grinding Dispatcher Action Schemas
 * ====================================
 * Per-action Zod schemas for all 6 prism_grinding actions.
 * SAFETY CRITICAL — burn/white-layer risk, coolant pressure.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/grindingActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();

const grindingMode = z.enum(["surface", "cylindrical_external", "cylindrical_internal", "creep_feed", "centerless"]).optional();
const coolantType = z.enum(["flood", "mist", "dry", "cryogenic"]).optional();

// ============================================================================
// wheel_select — inline wheel selection logic
// ============================================================================

const wheel_select = z.object({
  material: z.string().optional(),
  hardness_hrc: z.number().min(0).max(72).optional(),
  operation: z.string().optional(),
  target_Ra_um: optPosNum,
}).passthrough();

// ============================================================================
// dress_params — inline dressing parameter calculation
// ============================================================================

const dress_params = z.object({
  wheel_diameter_mm: optPosNum,
  dresser_type: z.string().optional(),
  dress_depth_um: optPosNum,
  dress_lead_mm_rev: optPosNum,
  passes: z.number().int().min(1).max(20).optional(),
}).passthrough();

// ============================================================================
// burn_threshold — grinding burn risk assessment
// ============================================================================

const burn_threshold = z.object({
  specific_energy_J_mm3: optPosNum,
  stock_removal_mm3_s: optPosNum,
  coolant: z.enum(["none", "mist", "flood"]).optional(),
  burn_threshold_W: optPosNum,
}).passthrough();

// ============================================================================
// surface_integrity — post-grind surface assessment
// ============================================================================

const surface_integrity = z.object({
  Ra_um: optPosNum,
  residual_stress_MPa: optNum,
  burn_detected: z.boolean().optional(),
  micro_cracks: z.boolean().optional(),
}).passthrough();

// ============================================================================
// grinding_force — GrindingForceEngine
// ============================================================================

const grinding_force = z.object({
  wheel_diameter_mm: posNum,
  wheel_speed_m_s: z.number().min(1).max(120),
  work_speed_m_min: posNum,
  depth_of_cut_mm: z.number().positive().max(5), // safety: >5mm DOC in grinding is extreme
  width_of_cut_mm: posNum,
  grinding_mode: grindingMode,
  workpiece_diameter_mm: optPosNum,
  specific_energy_J_mm3: optPosNum,
  hardness_hrc: z.number().min(0).max(72).optional(),
  coolant_type: coolantType,
  grain_density: optPosNum,
  grain_radius_um: optPosNum,
}).passthrough();

// ============================================================================
// surface_finish_predict — GrindingSurfaceFinishEngine
// ============================================================================

const surface_finish_predict = z.object({
  wheel_diameter_mm: posNum,
  wheel_speed_m_s: z.number().min(1).max(120),
  work_speed_m_min: posNum,
  depth_of_cut_mm: z.number().positive().max(5),
  width_of_cut_mm: posNum,
  grinding_mode: grindingMode,
  workpiece_diameter_mm: optPosNum,
  grain_size_mesh: z.number().int().min(16).max(600).optional(),
  grain_density: optPosNum,
  dressing_condition: z.enum(["sharp", "medium", "dull"]).optional(),
  dressing_overlap_ratio: z.number().min(1).max(20).optional(),
  spark_out_passes: z.number().int().min(0).max(10).optional(),
  coolant_type: coolantType,
  hardness_hrc: z.number().min(0).max(72).optional(),
  target_Ra_um: optPosNum,
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const GRINDING_ACTION_SCHEMAS: ActionSchemaMap = {
  wheel_select,
  dress_params,
  burn_threshold,
  surface_integrity,
  grinding_force,
  surface_finish_predict,
};
