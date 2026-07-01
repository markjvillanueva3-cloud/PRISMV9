/**
 * EDM Dispatcher Action Schemas
 * ==============================
 * Per-action Zod schemas for all 4 prism_edm actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/edmActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();

// ============================================================================
// electrode_design — ElectrodeDesignEngine
// ============================================================================

const electrode_design = z.object({
  cavity_depth_mm: posNum,
  cavity_width_mm: posNum,
  cavity_length_mm: posNum,
  workpiece_material: z.string().min(1),
  workpiece_hardness_HRC: z.number().min(0).max(72),
  surface_finish_target_Ra_um: posNum,
  tolerance_mm: posNum,
  num_cavities: z.number().int().min(1).max(100),
  electrode_material: z.enum(["graphite_fine", "graphite_std", "copper", "copper_tungsten", "tellurium_copper"]).optional(),
}).passthrough();

// ============================================================================
// wire_settings — WireEDMSettingsEngine
// ============================================================================

const wire_settings = z.object({
  wire_type: z.enum(["brass_0.25", "brass_0.20", "coated_0.25", "coated_0.20", "moly_0.10", "tungsten_0.05"]).optional(),
  workpiece_material: z.string().min(1),
  workpiece_thickness_mm: posNum,
  workpiece_hardness_HRC: z.number().min(0).max(72),
  target_surface_finish_Ra_um: posNum,
  target_accuracy_mm: posNum,
  taper_angle_deg: z.number().min(0).max(45).optional(),
  is_submerged: z.boolean().optional(),
}).passthrough();

// ============================================================================
// surface_integrity — EDMSurfaceIntegrityEngine
// ============================================================================

const surface_integrity = z.object({
  edm_type: z.enum(["wire", "sinker", "hole_drill", "micro"]).optional(),
  discharge_energy_mJ: posNum,
  num_skim_passes: z.number().int().min(0).max(20),
  workpiece_material: z.string().min(1),
  workpiece_hardness_HRC: z.number().min(0).max(72),
  is_fatigue_critical: z.boolean().optional(),
  application: z.enum(["aerospace", "medical", "automotive", "tooling", "general"]).optional(),
  spec_standard: z.string().optional(),
}).passthrough();

// ============================================================================
// micro_edm — MicroEDMEngine
// ============================================================================

const micro_edm = z.object({
  process: z.enum(["micro_drill", "micro_mill", "micro_wire", "micro_sinker"]).optional(),
  feature_size_um: posNum,
  depth_um: posNum,
  workpiece_material: z.string().min(1),
  electrode_diameter_um: optPosNum,
  wire_diameter_um: optPosNum,
  target_accuracy_um: posNum,
  target_surface_finish_Ra_um: posNum,
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const EDM_ACTION_SCHEMAS: ActionSchemaMap = {
  electrode_design,
  wire_settings,
  surface_integrity,
  micro_edm,
};
