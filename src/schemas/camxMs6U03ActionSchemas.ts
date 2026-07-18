/**
 * CAMX-MS6 U03 Action Schemas — Zod v4
 *
 * 2 dispatcher actions (PowerMillCodeGeneratorEngine E1121):
 *   powermill_code_generate  — generate a complete PMILL macro script
 *   powermill_code_templates — list available PMILL macro templates by category
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const PMOperationSchema = z.object({
  type: z.enum([
    "batch_foreach",
    "boundary_create",
    "constant_z",
    "corner_finishing",
    "drill",
    "face_milling",
    "model_area_clearance",
    "offset_finishing",
    "pattern_finishing",
    "post_process",
    "raster_finishing",
    "steep_shallow",
    "swarf_finishing",
    "tool_create",
    "viewmill_verify",
    "vortex_roughing",
    "workplane_create",
  ]).describe("PowerMill operation type for PMILL macro generation"),
  name: z.string().optional().describe("Toolpath/workplane/boundary name used in CREATE and ACTIVATE commands"),
  tool_ref: z.string().optional().describe("Tool name or number matching an entry in the tools array"),
  boundary_name: z.string().optional().describe("Containment boundary name to apply to the toolpath"),
  workplane_name: z.string().optional().describe("Workplane name to machine within"),
  stepdown_mm: z.number().positive().optional().describe("Axial depth of cut (stepdown) per pass, mm"),
  stepover_mm: z.number().positive().optional().describe("Radial stepover / scallop height, mm"),
  vortex_angle_deg: z.number().min(10).max(180).optional().describe(
    "Vortex constant tool-engagement angle, degrees (default 90)"
  ),
  tolerance_mm: z.number().positive().optional().describe("Machining tolerance, mm"),
  stock_to_leave_mm: z.number().min(0).optional().describe("Stock remaining after this operation, mm"),
  safe_z_mm: z.number().optional().describe("Rapid / safe Z height above part datum, mm"),
  steep_angle_deg: z.number().min(0).max(90).optional().describe(
    "Steep/shallow split threshold angle, degrees (default 30)"
  ),
  spindle_rpm: z.number().positive().optional().describe("Spindle speed, RPM"),
  feed_mm_min: z.number().positive().optional().describe("Cutting feed rate, mm/min"),
  plunge_feed_mm_min: z.number().positive().optional().describe("Plunge / ramp feed rate, mm/min"),
  coolant: z.enum(["air", "flood", "mist", "off", "through_tool"]).optional().describe("Coolant mode"),
  post_name: z.string().optional().describe("Post-processor name as registered in PowerMill (e.g. ductpost_fanuc)"),
  nc_output_path: z.string().optional().describe("NC output file path or folder for POST command"),
  calculate: z.boolean().optional().describe("Whether to CALCULATE TOOLPATH after creation (default true)"),
  activate: z.boolean().optional().describe("Whether to ACTIVATE TOOLPATH before calculating (default true)"),
  foreach_target: z.enum(["boundary", "tool", "toolpath"]).optional().describe(
    "FOREACH loop iteration target for batch_foreach operations"
  ),
  raw_commands: z.array(z.string()).optional().describe(
    "Verbatim PMILL command lines to include inside a FOREACH or operation block"
  ),
}).passthrough();

const PMToolSchema = z.object({
  name: z.string().describe("Tool name in PowerMill — used in CREATE TOOL and ACTIVATE TOOL commands"),
  type: z.enum([
    "ball_nosed",
    "bull_nosed",
    "drill",
    "end_mill",
    "face_mill",
    "slot_mill",
    "tap",
    "thread_mill",
    "tipped_disc",
  ]).describe("PowerMill tool geometry type"),
  diameter_mm: z.number().positive().describe("Cutting diameter, mm"),
  flutes: z.number().int().positive().optional().describe("Number of cutting flutes"),
  corner_radius_mm: z.number().min(0).optional().describe("Corner radius for bull-nosed tools, mm"),
  length_mm: z.number().positive().optional().describe("Overall tool length, mm"),
  flute_length_mm: z.number().positive().optional().describe("Flute (cutting) length, mm"),
  material: z.enum(["carbide", "cbn", "ceramic", "cermet", "hss", "pcd"]).optional().describe("Tool substrate material"),
  coating: z.string().optional().describe("Tool coating designation (e.g. TiAlN, AlCrN)"),
  tool_number: z.number().int().positive().optional().describe("Magazine tool number"),
}).passthrough();

const PMParamsSchema = z.object({
  project_name: z.string().optional().describe("PowerMill project name — written into macro header comment"),
  part_name: z.string().optional().describe("Part / model name for documentation"),
  machine_name: z.string().optional().describe("Machine tool configuration name in PowerMill"),
  add_error_checks: z.boolean().optional().describe(
    "Add IF EXISTS / DELETE checks before creating toolpaths to avoid name conflicts"
  ),
  add_progress_print: z.boolean().optional().describe("Add PRINT statements for step-by-step progress reporting"),
  add_form_display: z.boolean().optional().describe(
    "Add FORM DISPLAY ; PARAMETERS dialog for interactive parameter override at runtime"
  ),
  safe_z_mm: z.number().optional().describe("Global safe Z height above part datum, mm"),
  stock_to_leave_mm: z.number().min(0).optional().describe("Global stock to leave on all surfaces, mm"),
  active_workplane: z.string().optional().describe("Workplane name to activate at the start of the macro"),
}).passthrough();

const PMTemplateCategoryZ = z.enum([
  "batch",
  "boundary",
  "finishing",
  "multi_axis",
  "post_processing",
  "roughing",
  "tool_create",
  "viewmill",
  "workplane",
]).optional().describe("Filter templates by category — omit to return all templates");

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS6_U03_SCHEMAS: ActionSchemaMap = {

  /**
   * Generate a complete PMILL macro script from operations, tool definitions, and parameters.
   * Supports Vortex roughing, Model Area Clearance, Steep & Shallow, Swarf, Raster,
   * Offset, Constant-Z, Pattern, Corner finishing, boundary creation, workplane setup,
   * ViewMill simulation, post-processing, and FOREACH batch loops.
   */
  powermill_code_generate: z.object({
    operations: z.array(PMOperationSchema).min(1).max(30).describe(
      "Ordered list of PowerMill operations to generate PMILL macro code for (max 30)"
    ),
    tools: z.array(PMToolSchema).optional().describe(
      "Tool definitions emitted as CREATE TOOL blocks before operations — referenced by operation.tool_ref"
    ),
    params: PMParamsSchema.optional().describe(
      "Global macro options: project name, error checks, progress print, safe Z, FORM DISPLAY"
    ),
    description: z.string().optional().describe(
      "Natural language description — if provided, operations list is ignored and best-effort PMILL generation is used"
    ),
  }),

  /**
   * List available PMILL macro templates, optionally filtered by category.
   * Returns template id, title, category, description, required/optional params, and example snippet.
   */
  powermill_code_templates: z.object({
    category: PMTemplateCategoryZ,
  }),
};
