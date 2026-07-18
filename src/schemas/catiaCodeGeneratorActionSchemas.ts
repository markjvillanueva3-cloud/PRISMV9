/**
 * CATIA Code Generator Action Schemas — Zod v4
 *
 * 2 dispatcher actions (CATIACodeGeneratorEngine E1122):
 *   catia_code_generate  — generate a CATIA V5 VBA/CATVBA macro or 3DEXPERIENCE EKL script
 *   catia_code_templates — list available script templates by category
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const scriptTypeZ = z.enum(["vba", "ekl"]).describe(
  "Script language: vba = CATIA V5 VBA/CATVBA macro, ekl = 3DEXPERIENCE EKL script"
);

const operationTypeZ = z.enum([
  "batch_compute",
  "drilling",
  "facing",
  "multi_axis_sweep",
  "nc_export",
  "plunge_roughing",
  "pocket_prismatic",
  "profile_contouring",
  "sweeping_finishing",
  "tool_path_compute",
  "zlevel_roughing",
]).describe("CATIA manufacturing operation type");

const operationZ = z.object({
  type: operationTypeZ,
  name: z.string().optional().describe("Operation label used in VBA/EKL comment"),
  tool_number: z.number().int().positive().optional().describe("Tool number (T#) in PP Table"),
  depth_mm: z.number().positive().optional().describe("Axial depth of cut, mm"),
  stepover_mm: z.number().positive().optional().describe("Step-over (ae), mm"),
  stepdown_mm: z.number().positive().optional().describe("Step-down per level (ap), mm"),
  feed_mm_min: z.number().positive().optional().describe("Cutting feed rate, mm/min"),
  spindle_rpm: z.number().positive().optional().describe("Spindle speed, RPM"),
  coolant: z.enum(["air", "flood", "mist", "off", "tsc"]).optional().describe("Coolant mode"),
  axial_feed_mm_min: z.number().positive().optional().describe("Axial (plunge) feed rate, mm/min"),
  retract_feed_mm_min: z.number().positive().optional().describe("Retract feed rate, mm/min"),
  scallop_height_mm: z.number().positive().optional().describe("Scallop height for surface finishing, mm"),
  tolerance_mm: z.number().positive().optional().describe("Machining accuracy tolerance, mm"),
  machining_mode: z.enum(["climb", "conventional"]).optional().describe("Climb or conventional milling"),
}).passthrough();

const vbaToolZ = z.object({
  number: z.number().int().positive().describe("Tool number in CATIA PP Table"),
  type: z.enum([
    "ballnose", "boring_bar", "bullnose", "drill", "endmill",
    "face_mill", "reamer", "tap", "thread_mill",
  ]).describe("Tool type"),
  diameter_mm: z.number().positive().describe("Nominal tool diameter, mm"),
  flutes: z.number().int().positive().optional().describe("Number of cutting flutes"),
  corner_radius_mm: z.number().min(0).optional().describe("Corner radius, mm (0 for sharp)"),
  length_mm: z.number().positive().optional().describe("Tool overall length, mm"),
  material: z.enum(["carbide", "cbn", "ceramic", "cermet", "hss", "pcd"]).optional().describe("Cutting material"),
  coating: z.string().optional().describe("Tool coating (e.g. TiAlN, AlCrN)"),
  label: z.string().optional().describe("Descriptive tool label"),
}).passthrough();

const vbaParamsZ = z.object({
  part_name: z.string().optional().describe("CATIA V5 CATPart or CATProduct file name"),
  mfg_program_name: z.string().optional().describe("Manufacturing Program name in the PPR tree"),
  pp_table_name: z.string().optional().describe("PP Table (post-processor) name to use for NC export"),
  nc_output_folder: z.string().optional().describe("Folder path for NC output files"),
  add_error_handling: z.boolean().optional().describe("Add On Error GoTo VBA error handler"),
  add_progress_msgs: z.boolean().optional().describe("Add MsgBox progress messages during execution"),
  run_compute_all: z.boolean().optional().describe("Call ComputeToolPath on all operations before export"),
  machine_name: z.string().optional().describe("CATIA V5 machine resource name"),
}).passthrough();

const eklRuleZ = z.object({
  name: z.string().describe("Rule or check name"),
  condition: z.string().optional().describe("EKL condition expression (left of =>)"),
  action: z.string().optional().describe("EKL action expression (right of =>)"),
  description: z.string().optional().describe("Human-readable description of this rule"),
}).passthrough();

const eklTemplateRefZ = z.object({
  template_id: z.string().describe(
    "KBM template ID to reference (e.g. 'prismatic_pocket', 'sweep_finishing', 'kbm_apply')"
  ),
  parameters: z.record(z.string(), z.unknown()).optional().describe("Template parameter overrides"),
}).passthrough();

const templateCategoryZ = z.enum([
  "batch",
  "drilling",
  "ekl",
  "facing",
  "multi_axis",
  "nc_export",
  "pocket_prismatic",
  "profile_contouring",
  "roughing",
  "surface_finishing",
  "tool_setup",
]).optional().describe("Filter templates by category — omit to return all");

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_CATIA_CODE_GENERATOR_SCHEMAS: ActionSchemaMap = {
  catia_code_generate: z.object({
    script_type: scriptTypeZ,
    operations: z.array(operationZ).min(1).max(40).describe(
      "Ordered list of manufacturing operations to include in the generated script (max 40)"
    ),
    tools: z.array(vbaToolZ).optional().describe(
      "Tool definitions referenced by operation.tool_number — used to emit SetToolData calls"
    ),
    params: vbaParamsZ.optional().describe(
      "Global generation options (part name, PP table, NC output, error handling, etc.)"
    ),
    ekl_rules: z.array(eklRuleZ).optional().describe(
      "Knowledge Advisor rules to include (EKL script_type only)"
    ),
    ekl_templates: z.array(eklTemplateRefZ).optional().describe(
      "KBM template applications to emit (EKL script_type only)"
    ),
    from_description: z.string().optional().describe(
      "Natural-language description — generates a best-effort script if provided (overrides operations)"
    ),
  }),

  catia_code_templates: z.object({
    category: templateCategoryZ,
  }),
};
