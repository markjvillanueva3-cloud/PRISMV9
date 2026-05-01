/**
 * HyperMill Code Generator Action Schemas — Zod v4
 *
 * 2 dispatcher actions (HyperMillCodeGeneratorEngine E1120):
 *   hypermill_code_generate  — generate a complete hyperMILL Automation Center Python script
 *   hypermill_code_templates — list available AC Python script templates
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ─────────────────────────────────────────────────────────

const operationTypeZ = z.enum([
  // 3D Roughing
  "hpc_roughing",
  "maxx_roughing",
  "offset_roughing",
  "optimized_roughing",
  "z_level_roughing",
  // 3D Finishing
  "pencil_finishing",
  "profile_finishing",
  "rest_machining_3d",
  "scallop_finishing",
  "z_level_finishing",
  "parallel_finishing",
  // 5-Axis
  "blade_finishing",
  "blade_roughing",
  "five_axis_surface",
  "impeller_finishing",
  "impeller_roughing",
  "port_finishing",
  "port_roughing",
  "swarf_cutting",
  "tangent_plane",
  // 2D / Drilling
  "contour_2d",
  "drilling",
  "face_milling",
  "pocket_2d",
  "thread_milling",
  // Utility
  "batch",
  "job_setup",
  "nc_generation",
  "tool_setup",
]).describe("hyperMILL Automation Center operation type");

const operationZ = z.object({
  type: operationTypeZ,
  name: z.string().optional().describe("Operation name shown in hyperMILL job list"),
  cycle_code: z.string().optional().describe(
    "hyperMILL cycle code (e.g. '3D:Z-Level Finishing') — auto-derived from type if omitted"
  ),
  tool_number: z.number().int().positive().optional().describe(
    "Tool number in hyperMILL tool database"
  ),
  stepdown_mm: z.number().positive().optional().describe("Axial depth of cut (ap), mm"),
  stepover_mm: z.number().positive().optional().describe("Radial stepover (ae), mm"),
  scallop_height_mm: z.number().positive().optional().describe(
    "Target scallop height for equidistant/parallel finishing, mm"
  ),
  stock_leave_mm: z.number().min(0).optional().describe("Stock to leave on walls and floor, mm"),
  floor_stock_mm: z.number().min(0).optional().describe("Floor-only stock allowance, mm"),
  feed_mm_min: z.number().positive().optional().describe("Cutting feed rate, mm/min"),
  spindle_rpm: z.number().positive().optional().describe("Spindle speed, RPM"),
  approach: z.enum(["helical", "none", "plunge", "predrill", "ramp"]).optional().describe(
    "Approach motion type into material"
  ),
  retract: z.enum(["direct", "normal", "tangential"]).optional().describe("Retract motion type"),
  clearance_z_mm: z.number().optional().describe("Clearance plane absolute Z height, mm"),
  safety_distance_mm: z.number().positive().optional().describe(
    "Safety distance above the model surface, mm"
  ),
  coolant: z.enum(["air", "flood", "mist", "off", "tsc"]).optional().describe("Coolant mode"),
  cut_direction: z.enum(["both", "climb", "conventional"]).optional().describe("Cutting direction"),
  angle_deg: z.number().min(0).max(360).optional().describe(
    "Parallel finishing direction angle, degrees"
  ),
  pass_count: z.number().int().positive().optional().describe(
    "Number of passes for blade/impeller operations"
  ),
  use_rest: z.boolean().optional().describe("Enable rest machining from a reference operation"),
  rest_ref_op: z.string().optional().describe("Reference operation name for rest material"),
  post_name: z.string().optional().describe(
    "NcGenerator post-processor name (e.g. 'omPPFI') — for nc_generation operations"
  ),
  nc_output_path: z.string().optional().describe("NC file output directory path"),
  extra_lines: z.array(z.string()).optional().describe(
    "Verbatim AC Python lines appended after the operation block"
  ),
}).passthrough();

const toolZ = z.object({
  number: z.number().int().positive().describe("hyperMILL tool database tool number"),
  type: z.enum([
    "barrel_mill",
    "chamfer_mill",
    "drill",
    "endmill_ball",
    "endmill_flat",
    "endmill_torus",
    "face_mill",
    "lollipop",
    "other",
    "reamer",
    "tap",
    "tapered_endmill",
    "thread_mill",
  ]).describe("hyperMILL tool geometry class"),
  diameter_mm: z.number().positive().describe("Nominal tool diameter, mm"),
  corner_radius_mm: z.number().min(0).optional().describe("Corner / tip radius (torus), mm"),
  flute_length_mm: z.number().positive().optional().describe("Cutting length, mm"),
  overall_length_mm: z.number().positive().optional().describe("Overall tool length, mm"),
  flutes: z.number().int().positive().optional().describe("Number of teeth/flutes"),
  material: z.enum(["carbide", "cbn", "ceramic", "cermet", "hss", "pcd"]).optional().describe(
    "Tool substrate material"
  ),
  coating: z.string().optional().describe("Tool coating (e.g. TiAlN, AlCrN)"),
  label: z.string().optional().describe("Descriptive label for the tool"),
}).passthrough();

const paramsZ = z.object({
  part_name: z.string().optional().describe("hyperMILL project / part name"),
  job_name: z.string().optional().describe("hyperMILL job list name"),
  machine_name: z.string().optional().describe(
    "hyperMILL machine configuration name (as defined in Machine Manager)"
  ),
  wcs_name: z.string().optional().describe("Coordinate system / WCS name"),
  stock_model_name: z.string().optional().describe("Stock model (NCSurf) reference name"),
  nc_output_folder: z.string().optional().describe("Global NC file output folder path"),
  add_error_handling: z.boolean().optional().describe(
    "Wrap script in try/except error handler"
  ),
  add_progress_msgs: z.boolean().optional().describe(
    "Emit print() progress statements during execution"
  ),
  run_nc_generation: z.boolean().optional().describe(
    "Run NC generation via NcGenerator after all operations are built"
  ),
  post_processor: z.string().optional().describe(
    "NcGenerator post-processor name for auto-NC-gen (e.g. 'omPPFI' for FANUC 5-axis)"
  ),
  hm_version: z.string().optional().describe(
    "hyperMILL version string for header comment (default '33.0')"
  ),
}).passthrough();

const templateCategoryZ = z.enum([
  "batch",
  "finishing_3d",
  "five_axis",
  "job_setup",
  "nc_generation",
  "roughing_3d",
  "tool_setup",
]).optional().describe("Filter templates by category — omit to return all");

// ── Action Schemas ─────────────────────────────────────────────────────────────

export const ACTION_HYPERMILL_CODE_GENERATOR_SCHEMAS: ActionSchemaMap = {
  hypermill_code_generate: z.object({
    operations: z.array(operationZ).min(1).max(40).describe(
      "Ordered list of hyperMILL AC operations to include in the generated Python script (max 40)"
    ),
    tools: z.array(toolZ).optional().describe(
      "Tool database entries to configure via AC — referenced by operation.tool_number"
    ),
    params: paramsZ.optional().describe(
      "Global script options: job name, machine, WCS, NC output folder, error handling, etc."
    ),
  }),

  hypermill_code_templates: z.object({
    category: templateCategoryZ,
  }),
};
