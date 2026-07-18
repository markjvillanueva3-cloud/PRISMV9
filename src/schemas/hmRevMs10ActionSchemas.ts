/**
 * HM-REV-MS10 Action Schemas — Quality Chain + Setup Sheet + Formula Registry
 *
 * Zod schemas for:
 *   cam_hypermill_quality_package  — U-HMR54: SPC + FAI + Metrology quality package
 *   cam_hypermill_setup_sheet      — U-HMR55: Auto-generated setup sheet from hyperMILL job
 *
 * HM-REV-MS10 / U-HMR54 + U-HMR55
 */

import { z } from "zod";

// ── Shared sub-schemas ──────────────────────────────────────────────────────

const operationZ = z.object({
  operation_id: z.string().describe("Unique operation identifier"),
  operation_name: z.string().describe("Operation name (e.g., 'Face Mill', '3D Rough')"),
  cycle_type: z.string().optional().describe("hyperMILL cycle type code (e.g., 'hmSf3', 'hmDrl')"),
  tool_number: z.number().int().min(1).describe("Tool number in magazine"),
  tool_description: z.string().describe("Tool description"),
  feature_type: z.string().optional().describe("Feature type being machined"),
  nominal_dimension_mm: z.number().optional().describe("Nominal dimension to achieve (mm)"),
  tolerance_plus_mm: z.number().optional().describe("Plus tolerance (mm)"),
  tolerance_minus_mm: z.number().optional().describe("Minus tolerance (mm)"),
  is_critical: z.boolean().optional().default(false).describe("Whether this is a critical characteristic"),
  speed_rpm: z.number().optional().describe("Spindle speed (RPM)"),
  feed_mmpm: z.number().optional().describe("Feed rate (mm/min)"),
  ap_mm: z.number().optional().describe("Axial depth of cut (mm)"),
  ae_mm: z.number().optional().describe("Radial depth of cut (mm)"),
  coolant: z.string().optional().describe("Coolant type"),
}).describe("A single hyperMILL operation");

const fixtureZ = z.object({
  fixture_id: z.string().optional().describe("Fixture identifier"),
  description: z.string().describe("Fixture description"),
  wcs_offset: z.string().optional().describe("WCS offset designation (e.g., G54)"),
  datum_x_mm: z.number().optional().describe("Datum X offset (mm)"),
  datum_y_mm: z.number().optional().describe("Datum Y offset (mm)"),
  datum_z_mm: z.number().optional().describe("Datum Z offset (mm)"),
}).describe("Fixture and WCS information");

// ── Action Schemas ──────────────────────────────────────────────────────────

export const ACTION_HM_REV_MS10_SCHEMAS: Record<string, z.ZodTypeAny> = {

  /**
   * Generate complete quality package from hyperMILL job data (U-HMR54).
   * Connects SPCProcessCapabilityEngine, FirstArticleInspectionPipelineEngine,
   * and MetrologyUncertaintyEngine to produce a full quality documentation package.
   */
  cam_hypermill_quality_package: z.object({
    job_id: z.string().describe("hyperMILL job identifier"),
    part_number: z.string().describe("Part number"),
    part_description: z.string().optional().describe("Part description"),
    material: z.string().describe("Material name (e.g., 'AlMg4.5Mn', 'Ti6Al4V')"),
    operations: z.array(operationZ).min(1).describe("List of hyperMILL operations"),
    fixture: fixtureZ.optional().describe("Fixture and WCS information"),
    target_cpk: z.number().optional().default(1.33).describe("Target Cpk for all critical features (default 1.33)"),
    measurement_system: z.enum(["CMM", "gauge", "optical", "manual"]).optional().default("CMM").describe("Primary measurement system"),
    include_spc_plan: z.boolean().optional().default(true).describe("Include SPC control plan"),
    include_fai_plan: z.boolean().optional().default(true).describe("Include AS9102 FAI plan"),
    include_uncertainty_budget: z.boolean().optional().default(true).describe("Include measurement uncertainty budget"),
    subgroup_size: z.number().int().min(1).max(25).optional().default(5).describe("SPC subgroup size (n>=5 → X-bar R chart, n<5 → Individual MR chart)"),
  }),

  /**
   * Auto-generate setup sheet from hyperMILL job data (U-HMR55).
   * Includes machine, WCS/datum, tool list, operation sequence,
   * fixture description, safety notes, quality checkpoints,
   * and hyperMILL-specific fields (controller, post, AC scripts).
   */
  cam_hypermill_setup_sheet: z.object({
    job_id: z.string().describe("hyperMILL job identifier"),
    part_number: z.string().describe("Part number"),
    part_description: z.string().optional().describe("Part description"),
    material: z.string().describe("Material name"),
    machine: z.string().describe("Machine name/identifier"),
    controller_model: z.string().optional().describe("CNC controller model (e.g., 'FANUC 31i-B', 'Siemens 840D sl')"),
    post_processor: z.string().optional().describe("Post-processor variant (e.g., 'FANUC_5X_HEID', 'DMG_DMU50')"),
    ac_script_refs: z.array(z.string()).optional().describe("hyperMILL Automation Center script references"),
    programmer: z.string().optional().describe("Programmer name"),
    program_number: z.string().optional().describe("NC program number"),
    operations: z.array(operationZ).min(1).describe("List of hyperMILL operations"),
    fixture: fixtureZ.optional().describe("Fixture and WCS information"),
    format: z.enum(["json", "markdown", "printable"]).optional().default("json").describe("Output format"),
    include_quality_checkpoints: z.boolean().optional().default(true).describe("Include quality checkpoints per operation"),
    include_safety_notes: z.boolean().optional().default(true).describe("Include safety and setup notes"),
  }),

};
