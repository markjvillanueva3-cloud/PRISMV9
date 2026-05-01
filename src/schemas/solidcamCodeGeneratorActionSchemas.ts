/**
 * SolidCAM Code Generator Action Schemas — Zod v4
 *
 * 2 dispatcher actions (SolidCAMCodeGeneratorEngine E1118):
 *   solidcam_code_generate   — generate a complete SolidWorks VBA/VSTA macro
 *   solidcam_code_templates  — list available VBA script templates
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const operationTypeZ = z.enum([
  "batch",
  "coordinate_system",
  "face_2d",
  "hsr",
  "hss",
  "imachining_2d",
  "imachining_3d",
  "pocket_2d",
  "post_process",
  "profile_2d",
  "slot_2d",
  "tool_setup",
]).describe("SolidCAM operation type for VBA code generation");

const operationZ = z.object({
  type: operationTypeZ,
  name: z.string().optional().describe("Operation label used in VBA comment and AddOperation call"),
  technology_wizard_level: z.number().int().min(1).max(8).optional().describe(
    "SolidCAM Technology Wizard level (1=ultra-conservative, 8=maximum aggressive)"
  ),
  tool_level_slider: z.number().min(0).max(1).optional().describe(
    "iMachining Tool Level Slider (0.0=most conservative, 1.0=most aggressive)"
  ),
  stepdown_mm: z.number().positive().optional().describe("Step-down per level, mm"),
  stepover_mm: z.number().positive().optional().describe("Step-over (ae), mm — for HSS, HSR, 2.5D ops"),
  angle_deg: z.number().min(0).max(360).optional().describe("HSS morphing angle, degrees"),
  depth_mm: z.number().positive().optional().describe("Operation depth (Z), mm"),
  width_mm: z.number().positive().optional().describe("Slot width, mm"),
  feed_mm_min: z.number().positive().optional().describe("Cutting feed rate, mm/min"),
  spindle_rpm: z.number().positive().optional().describe("Spindle speed, RPM"),
  coolant: z.enum(["air", "flood", "mist", "off", "tsc"]).optional().describe("Coolant mode"),
  tool_slot: z.number().int().positive().optional().describe("SolidCAM tool library slot number"),
  cs_index: z.number().int().min(1).optional().describe("Coordinate system index (1-based)"),
  gpp_post_name: z.string().optional().describe("GPP post-processor name as configured in SolidCAM Job Manager"),
  verify_after_post: z.boolean().optional().describe("Whether to run simulation/verify after post-processing"),
}).passthrough();

const toolZ = z.object({
  slot: z.number().int().positive().describe("SolidCAM tool library slot number"),
  type: z.enum(["ballnose", "bullnose", "drill", "endmill", "face_mill", "other", "thread_mill"]).describe("Tool type"),
  diameter_mm: z.number().positive().describe("Nominal tool diameter, mm"),
  flutes: z.number().int().positive().optional().describe("Number of cutting flutes"),
  flute_length_mm: z.number().positive().optional().describe("Flute (cutting) length, mm"),
  overall_length_mm: z.number().positive().optional().describe("Tool overall length, mm"),
  material: z.enum(["carbide", "cbn", "ceramic", "cermet", "hss", "pcd"]).optional().describe("Tool substrate material"),
  coating: z.string().optional().describe("Tool coating (e.g. TiAlN, AlCrN)"),
  label: z.string().optional().describe("Descriptive label for the tool"),
}).passthrough();

const paramsZ = z.object({
  part_name: z.string().optional().describe("SolidWorks part name or file path"),
  job_name: z.string().optional().describe("SolidCAM job name"),
  machine_name: z.string().optional().describe("SolidCAM machine configuration name"),
  add_error_handling: z.boolean().optional().describe("Add On Error GoTo error handler to the macro"),
  add_progress_msgs: z.boolean().optional().describe("Add MsgBox progress dialogs during execution"),
  nc_output_folder: z.string().optional().describe("NC file output folder path for post-processing"),
  run_simulation: z.boolean().optional().describe("Run SolidCAM simulation after generating all operations"),
}).passthrough();

const templateCategoryZ = z.enum([
  "batch",
  "coordinate_system",
  "face_2d",
  "hsr",
  "hss",
  "imachining_2d",
  "imachining_3d",
  "pocket_2d",
  "post_process",
  "profile_2d",
  "slot_2d",
  "tool_setup",
]).optional().describe("Filter templates by operation category — omit to return all");

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_SOLIDCAM_CODE_GENERATOR_SCHEMAS: ActionSchemaMap = {
  solidcam_code_generate: z.object({
    operations: z.array(operationZ).min(1).max(30).describe(
      "Ordered list of SolidCAM operations to include in the generated VBA macro (max 30)"
    ),
    tools: z.array(toolZ).optional().describe(
      "Tool library entries referenced by operation.tool_slot — used to emit SetDiameter/SetFlutes calls"
    ),
    params: paramsZ.optional().describe(
      "Global generation options (part name, error handling, NC output folder, etc.)"
    ),
  }),

  solidcam_code_templates: z.object({
    category: templateCategoryZ,
  }),
};
