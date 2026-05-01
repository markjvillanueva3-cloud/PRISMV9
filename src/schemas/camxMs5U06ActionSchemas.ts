/**
 * CAMX-MS5 U06 Action Schemas — Zod v4
 *
 * 2 dispatcher actions (NXCAMCodeGeneratorEngine E1119):
 *   nx_code_generate  — generate NXOpen automation scripts (Python / C#)
 *   nx_code_templates — list available script templates by category
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const NXOperationSchema = z.object({
  type: z.enum([
    "adaptive_milling",
    "boring",
    "cavity_mill",
    "contour_area",
    "drill",
    "face_milling",
    "fixed_contour",
    "flowcut",
    "planar_mill",
    "plunge_milling",
    "spot_drill",
    "surface_contouring",
    "tapping",
    "thread_milling",
    "turn_groove",
    "turn_id",
    "turn_od",
    "zlevel_profile",
  ]).describe("NX operation type"),
  name: z.string().optional().describe("Operation name in the program group"),
  tool_ref: z.string().optional().describe("Tool reference string matching a tool in the tools array"),
  depth_mm: z.number().positive().optional().describe("Max cutting depth in mm"),
  stepdown_mm: z.number().positive().optional().describe("Depth per cut / axial step-down in mm"),
  stepover_pct: z.number().min(1).max(100).optional().describe("Radial stepover as % of tool diameter"),
  feed_mmpm: z.number().positive().optional().describe("Cut feed rate in mm/min"),
  speed_rpm: z.number().positive().optional().describe("Spindle speed in RPM"),
  coolant: z.enum(["air", "dry", "flood", "mist", "through_tool"]).optional().describe("Coolant method"),
  use_ipw: z.boolean().optional().describe("Use In-Process Workpiece stock for this operation"),
  tolerance_mm: z.number().positive().optional().describe("Machining tolerance in mm"),
  stock_to_leave_mm: z.number().min(0).optional().describe("Remaining stock after this operation in mm"),
  cut_pattern: z.enum([
    "follow_part",
    "follow_periphery",
    "spiral",
    "trochoidal",
    "zig",
    "zigzag",
  ]).optional().describe("Cut pattern / tool motion style"),
});

const NXToolSchema = z.object({
  ref: z.string().describe("Unique tool reference ID"),
  type: z.enum([
    "ball_mill",
    "boring_bar",
    "bull_nose",
    "drill",
    "end_mill",
    "face_mill",
    "tap",
    "thread_mill",
  ]).describe("Tool geometry type"),
  diameter_mm: z.number().positive().describe("Tool cutting diameter in mm"),
  flutes: z.number().int().positive().optional().describe("Number of cutting flutes"),
  corner_radius_mm: z.number().min(0).optional().describe("Corner radius for bull-nose tools in mm"),
  length_mm: z.number().positive().optional().describe("Overall tool length in mm"),
  holder: z.string().optional().describe("Holder designation (e.g. BT40, HSK63A)"),
  material: z.enum(["carbide", "cbn", "ceramic", "cermet", "hss"]).optional().describe("Cutting material"),
  coating: z.enum(["AlTiN", "TiAlN", "TiCN", "TiN", "uncoated"]).optional().describe("Tool coating"),
});

const NXCodeGenParamsSchema = z.object({
  part_name: z.string().optional().describe("Part name written into script comments"),
  setup_name: z.string().optional().describe("CAM program group / setup name. Default PRISM_SETUP"),
  post_processor: z.string().optional().describe(
    "Post-processor name as registered in NX, e.g. FANUC_30i, SIEMENS_840D, HAAS. Omit to skip post-processing block"
  ),
  output_file: z.string().optional().describe("NC output file path for post-processing block"),
  machine_name: z.string().optional().describe("Machine tool name (informational)"),
  workpiece_ref: z.string().optional().describe("Geometry body name used as blank/workpiece"),
  coordinate_system: z.string().optional().describe("MCS/WCS name in the part"),
  journal_mode: z.boolean().optional().describe("Format output as NX Journal recording equivalent"),
  ipw_enabled: z.boolean().optional().describe("Add IPW (In-Process Workpiece) initialisation block"),
  fbm_enabled: z.boolean().optional().describe("Add Feature-Based Machining auto-recognition block"),
  verify_before_post: z.boolean().optional().describe("Add toolpath verification call before post-processing"),
  comment_level: z.enum(["full", "minimal", "none"]).optional().describe(
    "Script comment verbosity. Default full"
  ),
});

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS5_U06_SCHEMAS: ActionSchemaMap = {

  /**
   * Generate an NXOpen automation script (Python or C#) from operations, tools, and setup params.
   * Supports Cavity Mill, Adaptive, Z-Level, Fixed Contour, FBM, IPW, post-processing, MKE.
   */
  nx_code_generate: z.object({
    language: z.enum(["csharp", "python"]).optional().default("python").describe(
      "Script language. Default python (NXOpen Python API)"
    ),
    operations: z.array(NXOperationSchema).min(1).describe(
      "Ordered list of CAM operations to generate code for"
    ),
    tools: z.array(NXToolSchema).optional().default([]).describe(
      "Tool definitions. Referenced by operations via tool_ref"
    ),
    params: NXCodeGenParamsSchema.optional().describe(
      "Setup parameters: part name, post-processor, IPW/FBM flags, comment level"
    ),
    description: z.string().optional().describe(
      "Natural language description — if provided, operations list is ignored and best-effort generation is used"
    ),
  }),

  /**
   * List available NXOpen script templates, optionally filtered by category.
   * Returns template id, name, category, language, description, and supported feature flags.
   */
  nx_code_templates: z.object({
    category: z.enum([
      "fbm",
      "finishing",
      "ipw",
      "mke",
      "post_processing",
      "roughing",
      "tool_assembly",
      "utility",
    ]).optional().describe(
      "Filter by template category. Omit to list all templates"
    ),
  }),
};
