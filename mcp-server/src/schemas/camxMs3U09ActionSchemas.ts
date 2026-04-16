/**
 * CAMX-MS3 U09 Action Schemas — Zod v4
 *
 * 2 dispatcher actions (MastercamCodeGeneratorEngine E1117):
 *   mastercam_code_generate   — generate VBScript or C# NetHook code from spec
 *   mastercam_code_templates  — list available script templates, optionally filtered by category
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const toolSpecZ = z.object({
  diameter: z.number().positive().describe("Tool diameter (mm or inches)"),
  cutting_length_mm: z.number().positive().optional().describe("Cutting length / flute length, mm"),
  flutes: z.number().int().positive().optional().describe("Number of cutting flutes"),
  holder: z.string().optional().describe("Holder description or catalog number"),
  length_mm: z.number().positive().optional().describe("Overall tool length, mm"),
  offset_number: z.number().int().positive().optional().describe("Offset register number"),
  tool_number: z.number().int().positive().optional().describe("Magazine / turret tool number"),
  type: z.enum([
    "ballnose", "bullnose", "drill", "endmill", "face_mill", "tap",
  ]).optional().describe("Tool type"),
}).describe("Tool specification");

const cuttingParamsZ = z.object({
  chipload_mm: z.number().positive().optional().describe("Chipload / feed per tooth, mm"),
  coolant: z.enum([
    "flood", "mist", "mql", "none", "through_tool",
  ]).optional().describe("Coolant mode"),
  doc_axial_mm: z.number().positive().optional().describe("Axial depth of cut (ap), mm"),
  doc_radial_mm: z.number().positive().optional().describe("Radial depth of cut / stepover, mm"),
  entry_feed_mmpm: z.number().positive().optional().describe("Entry feed rate, mm/min"),
  feed_mmpm: z.number().positive().optional().describe("Cutting feed rate, mm/min"),
  plunge_feed_mmpm: z.number().positive().optional().describe("Plunge feed rate, mm/min"),
  spindle_rpm: z.number().positive().optional().describe("Spindle speed, RPM"),
  stepover_fraction: z.number().min(0.01).max(1).optional().describe("Stepover as fraction of diameter (0–1)"),
  surface_speed_mpm: z.number().positive().optional().describe("Surface speed, m/min (used if spindle_rpm omitted)"),
}).describe("Cutting parameters");

const strategyParamsZ = z.object({
  clearance_height_mm: z.number().positive().optional().describe("Clearance height above stock, mm"),
  climb_mill: z.boolean().optional().describe("Use climb milling (true) vs conventional (false)"),
  corner_smoothing_mm: z.number().nonnegative().optional().describe("Corner smoothing radius, mm"),
  dynamic_engagement_deg: z.number().min(1).max(180).optional().describe("Dynamic Motion max engagement angle, degrees"),
  micro_lift_mm: z.number().nonnegative().optional().describe("Micro-lift distance, mm"),
  min_radius_mm: z.number().nonnegative().optional().describe("Minimum toolpath radius to avoid sharp corners, mm"),
  optirough_step_down_mm: z.number().positive().optional().describe("OptiRough step-down per pass, mm"),
  retract_height_mm: z.number().positive().optional().describe("Retract height above top of part, mm"),
  stock_to_leave_mm: z.number().nonnegative().optional().describe("Stock to leave for finishing, mm"),
}).describe("Strategy / motion parameters");

const operationSpecZ = z.object({
  type: z.enum([
    "contour_2d", "drill", "dynamic_mill", "face", "optirough", "pocket",
  ]).describe("Mastercam operation type"),
  cutting: cuttingParamsZ.optional().describe("Cutting parameters for this operation"),
  geometry_ref: z.string().optional().describe("Chain or geometry reference identifier"),
  name: z.string().optional().describe("Human label for the operation"),
  strategy: strategyParamsZ.optional().describe("Strategy / motion parameters for this operation"),
  tool: toolSpecZ.optional().describe("Tool for this operation (overrides shared tools list)"),
}).describe("Single Mastercam operation specification");

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS3_U09_SCHEMAS: ActionSchemaMap = {

  mastercam_code_generate: z.object({
    script_type: z.enum([
      "nethook_csharp", "vbscript",
    ]).describe("Output script format: vbscript (Mastercam 2024+ ActiveX/COM) or nethook_csharp (.NET plug-in)"),
    defaults: z.intersection(cuttingParamsZ, strategyParamsZ).optional()
      .describe("Default cutting and strategy parameters inherited by all operations"),
    error_handling: z.boolean().optional().default(false)
      .describe("Include error handling (VBScript: On Error; C#: try/catch)"),
    nc_output_path: z.string().optional().describe("Output NC file path (used with run_post)"),
    operations: z.array(operationSpecZ).optional().describe("List of operations to generate code for"),
    part_file: z.string().optional().describe("Mastercam part file path to open (.mcam)"),
    post_processor: z.string().optional().describe("Post processor name, e.g. MPFAN (default MPFAN)"),
    regenerate_all: z.boolean().optional().default(false)
      .describe("Include MCRegenerateAllDirtyToolpaths() / RegenerateAllDirtyToolpaths() call"),
    run_post: z.boolean().optional().default(false)
      .describe("Include post-processor call after operations"),
    tools: z.array(toolSpecZ).optional().describe("Shared tool list; operations can reference by tool_number"),
  }),

  mastercam_code_templates: z.object({
    category: z.enum([
      "batch", "drilling", "finishing", "post_processing", "roughing", "setup", "tool_management",
    ]).optional().describe("Filter templates by category (omit for all templates)"),
    script_type: z.enum([
      "nethook_csharp", "vbscript",
    ]).optional().describe("Filter templates by script type"),
  }),

};
