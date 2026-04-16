/**
 * Zod Action Schemas — qualityDispatcher
 * =========================================
 * 13 actions: spc_calculate, cpk_predict, cmm_plan, measurement_analyze,
 *   tolerance_stack, gdt_validate, bias_correct, gauge_rr,
 *   blueprint_extract, blueprint_setup_sheet, blueprint_inspection_plan,
 *   blueprint_compare_revisions, blueprint_dxf_dimensions
 *
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// SPC / QUALITY PREDICTION (4)
// ============================================================================

/** spc_calculate — Statistical process control calculation */
const spc_calculate = z.object({
  measurements: z.array(z.number()).optional(),
  data: z.array(z.number()).optional(),
  usl: z.number().optional(),
  upper_spec_limit: z.number().optional(),
  lsl: z.number().optional(),
  lower_spec_limit: z.number().optional(),
}).passthrough();

/** cpk_predict — Predict future Cpk */
const cpk_predict = z.object({
  current_cpk: z.number().optional(),
  measurements: z.array(z.number()).optional(),
  trend_data: z.array(z.number()).optional(),
  prediction_horizon: z.number().int().positive().optional(),
}).passthrough();

/** cmm_plan — Generate CMM inspection plan */
const cmm_plan = z.object({
  features: z.array(z.record(z.string(), z.unknown())).optional(),
  points_per_feature: z.number().int().min(1).max(100).optional(),
  strategy: z.string().optional(),
}).passthrough();

/** measurement_analyze — Analyze dimensional measurements */
const measurement_analyze = z.object({
  measurements: z.array(z.number()).optional(),
  nominal: z.number().optional(),
  tolerance: z.number().positive().optional(),
  feature_type: z.string().optional(),
}).passthrough();

// ============================================================================
// TOLERANCE & GD&T (3)
// ============================================================================

/** tolerance_stack — Tolerance stack-up analysis */
const tolerance_stack = z.object({
  dimensions: z.array(z.record(z.string(), z.unknown())).optional(),
  method: z.enum(["worst_case", "rss"]).optional(),
  min_gap_mm: z.number().optional(),
}).passthrough();

/** gdt_validate — GD&T validation */
const gdt_validate = z.object({
  nominal: z.number().optional(),
  actual: z.number().optional(),
  tolerance: z.number().positive().optional(),
  gdt_type: z.string().optional(),
}).passthrough();

/** bias_correct — Measurement bias correction */
const bias_correct = z.object({
  measured: z.number().optional(),
  bias: z.number().optional(),
  uncertainty: z.number().nonnegative().optional(),
}).passthrough();

// ============================================================================
// GAUGE R&R (1)
// ============================================================================

/** gauge_rr — Gauge Repeatability & Reproducibility study */
const gauge_rr = z.object({
  parts: z.number().int().min(1).optional(),
  operators: z.number().int().min(1).optional(),
  trials: z.number().int().min(1).optional(),
  tolerance: z.number().positive().optional(),
  equipment_variation: z.number().nonnegative().optional(),
  appraiser_variation: z.number().nonnegative().optional(),
  part_variation: z.number().nonnegative().optional(),
}).passthrough();

// ============================================================================
// BLUEPRINT / PRINT READING (5)
// ============================================================================

/** blueprint_extract — Extract dimensions from blueprint text */
const blueprint_extract = z.object({
  text: z.string().optional(),
  unit: z.string().optional(),
}).passthrough();

/** blueprint_setup_sheet — Generate setup sheet from blueprint */
const blueprint_setup_sheet = z.object({
  text: z.string().optional(),
  unit: z.string().optional(),
}).passthrough();

/** blueprint_inspection_plan — Generate inspection plan from blueprint */
const blueprint_inspection_plan = z.object({
  text: z.string().optional(),
  unit: z.string().optional(),
}).passthrough();

/** blueprint_compare_revisions — Compare two blueprint revisions */
const blueprint_compare_revisions = z.object({
  old_text: z.string().optional(),
  new_text: z.string().optional(),
  text_a: z.string().optional(),
  text_b: z.string().optional(),
  unit: z.string().optional(),
}).passthrough();

/** blueprint_dxf_dimensions — Extract dimensions from DXF text */
const blueprint_dxf_dimensions = z.object({
  dxf_text: z.string().optional(),
  text: z.string().optional(),
  unit: z.string().optional(),
}).passthrough();

// ============================================================================
// FIRST ARTICLE INSPECTION — AS9102 (4)
// ============================================================================

/** fai_run — Run full FAI pipeline per AS9102 */
const fai_run = z.object({
  part_number: z.string(),
  revision: z.string(),
  features: z.array(z.object({
    feature_id: z.string(),
    feature_name: z.string(),
    reference_location: z.string(),
    designator: z.enum(["critical", "major", "minor"]),
    nominal: z.number(),
    tolerance_plus: z.number(),
    tolerance_minus: z.number(),
    unit: z.string().optional(),
    inspection_method: z.string().optional(),
    equipment_id: z.string().optional(),
  }).passthrough()),
  material_cert_id: z.string().optional(),
  measurements: z.array(z.object({
    feature_id: z.string(),
    measured_value: z.number(),
    inspection_method: z.string().optional(),
    equipment_id: z.string().optional(),
  }).passthrough()).optional(),
  serial_number: z.string().optional(),
  purchase_order: z.string().optional(),
  supplier: z.string().optional(),
  drawing_number: z.string().optional(),
  organization: z.string().optional(),
  inspector: z.string().optional(),
}).passthrough();

/** fai_generate_forms — Generate AS9102 Form 1/2/3 from a completed FAI */
const fai_generate_forms = z.object({
  fai_id: z.string(),
}).passthrough();

/** fai_evaluate_characteristic — Evaluate single characteristic tolerance */
const fai_evaluate_characteristic = z.object({
  nominal: z.number(),
  tolerance_plus: z.number(),
  tolerance_minus: z.number(),
  measured: z.number().optional(),
  measured_value: z.number().optional(),
}).passthrough();

/** fai_disposition — Determine accept/reject/MRB from characteristic results */
const fai_disposition = z.object({
  results: z.array(z.record(z.string(), z.unknown())).optional(),
  characteristics: z.array(z.record(z.string(), z.unknown())).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const QUALITY_ACTION_SCHEMAS: ActionSchemaMap = {
  // SPC / Quality Prediction (4)
  spc_calculate,
  cpk_predict,
  cmm_plan,
  measurement_analyze,
  // Tolerance & GD&T (3)
  tolerance_stack,
  gdt_validate,
  bias_correct,
  // Gauge R&R (1)
  gauge_rr,
  // Blueprint / Print Reading (5)
  blueprint_extract,
  blueprint_setup_sheet,
  blueprint_inspection_plan,
  blueprint_compare_revisions,
  blueprint_dxf_dimensions,
  // First Article Inspection — AS9102 (4)
  fai_run,
  fai_generate_forms,
  fai_evaluate_characteristic,
  fai_disposition,
};
