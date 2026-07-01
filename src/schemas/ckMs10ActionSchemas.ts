/**
 * CK-MS10 Action Schemas — Zod v4
 *
 * 8 new dispatcher actions for TurningProfileEngine, SheetNestingEngine, DXFParserEngine:
 *   turning_profile_od      — OD contour profile for G71/G70
 *   turning_profile_id      — ID bore contour for G71/G70
 *   turning_profile_thread  — G76 thread cycle parameters
 *   turning_profile_gcode   — Convert profile to G-code blocks
 *   sheet_nest              — Nest parts on sheet (BLF/FFD/strip)
 *   sheet_nest_optimize     — Try all strategies, return best
 *   sheet_cut_order         — Optimal cutting sequence
 *   dxf_parse               — Parse DXF or SVG content to polygons
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── Shared sub-schemas ────────────────────────────────────────────────────

const controllerZ = z
  .enum(["fanuc", "haas", "mazak", "okuma"])
  .optional()
  .describe("CNC controller variant");

const materialKeyZ = z
  .enum([
    "low_carbon_steel", "medium_carbon_steel", "alloy_steel",
    "stainless_steel", "cast_iron", "aluminum", "brass",
    "titanium", "inconel", "hardened_steel", "copper", "plastic",
  ])
  .optional()
  .describe("Material key for speed/feed DB lookup");

const turningFeatureZ = z.object({
  type: z.enum([
    "cylinder", "taper", "radius", "chamfer",
    "groove", "undercut", "relief_groove", "shoulder", "face",
  ]),
  diameter_mm: z.number().positive(),
  z_start_mm: z.number(),
  z_end_mm: z.number(),
  taper_angle_deg: z.number().optional(),
  radius_mm: z.number().positive().optional(),
  chamfer_mm: z.number().positive().optional(),
  groove_width_mm: z.number().positive().optional(),
  groove_depth_mm: z.number().positive().optional(),
}).passthrough();

const point2DZ = z.object({ x: z.number(), y: z.number() });

const polygon2DZ = z.object({
  id: z.string(),
  vertices: z.array(point2DZ).min(3),
  quantity: z.number().int().positive().optional(),
}).passthrough();

const sheetZ = z.object({
  width_mm: z.number().positive(),
  height_mm: z.number().positive(),
  boundary: z.array(point2DZ).optional(),
  material: z.string().optional(),
  thickness_mm: z.number().positive().optional(),
  cost_per_mm2: z.number().nonnegative().optional(),
}).passthrough();

const nestingOptionsZ = z.object({
  spacing_mm: z.number().nonnegative().optional(),
  rotation_allowed: z.boolean().optional(),
  mirror_allowed: z.boolean().optional(),
  grain_direction: z.enum(["X", "Y"]).nullable().optional(),
  strategy: z.enum(["blf", "ffd", "strip"]).optional(),
}).passthrough().optional();

// ─── turning_profile_od ────────────────────────────────────────────────────

const turning_profile_od = z.object({
  features: z.array(turningFeatureZ).min(1),
  stock_diameter_mm: z.number().positive(),
  material: materialKeyZ,
  nose_radius_mm: z.number().positive().optional(),
  num_passes: z.number().int().positive().optional(),
  controller: controllerZ,
}).passthrough();

// ─── turning_profile_id ────────────────────────────────────────────────────

const turning_profile_id = z.object({
  features: z.array(turningFeatureZ).min(1),
  bore_diameter_mm: z.number().positive(),
  stock_bore_diameter_mm: z.number().positive(),
  material: materialKeyZ,
  nose_radius_mm: z.number().positive().optional(),
  num_passes: z.number().int().positive().optional(),
  controller: controllerZ,
}).passthrough();

// ─── turning_profile_thread ───────────────────────────────────────────────

const turning_profile_thread = z.object({
  type: z.enum(["external", "internal"]).optional(),
  nominal_diameter_mm: z.number().positive(),
  pitch_mm: z.number().positive(),
  length_mm: z.number().positive(),
  z_start_mm: z.number().optional(),
  thread_depth_mm: z.number().positive().optional(),
  infeed_method: z.enum(["straight", "flank", "modified_flank"]).optional(),
  spring_passes: z.number().int().nonnegative().optional(),
  first_pass_doc_mm: z.number().positive().optional(),
  controller: controllerZ,
}).passthrough();

// ─── turning_profile_gcode ────────────────────────────────────────────────

const profilePointZ = z.object({
  X: z.number(),
  Z: z.number(),
  type: z.enum(["rapid", "linear", "arc_cw", "arc_ccw"]),
  I: z.number().optional(),
  K: z.number().optional(),
  R: z.number().optional(),
  feed: z.number().optional(),
  comment: z.string().optional(),
}).passthrough();

const turning_profile_gcode = z.object({
  profile: z.object({
    type: z.enum(["OD", "ID", "Face", "Thread"]),
    points: z.array(profilePointZ).min(1),
    stock_diameter_mm: z.number().positive(),
    finish_diameter_mm: z.number(),
    length_mm: z.number().positive(),
    num_passes: z.number().int().positive(),
    doc_mm: z.number().positive(),
    feed_mmrev: z.number().positive(),
    speed_rpm: z.number().positive(),
    surface_speed_mmin: z.number().positive(),
    mrr_cm3min: z.number(),
    cutting_force_N: z.number(),
    ra_predicted_um: z.number(),
    warnings: z.array(z.string()),
  }).passthrough(),
  controller: controllerZ,
  program_number: z.number().int().positive().optional(),
  sequence_start: z.number().int().positive().optional(),
  sequence_increment: z.number().int().positive().optional(),
  g71_p_label: z.number().int().positive().optional(),
  g71_q_label: z.number().int().positive().optional(),
  include_g70: z.boolean().optional(),
  rpm_css: z.boolean().optional(),
  max_rpm: z.number().positive().optional(),
}).passthrough();

// ─── sheet_nest ───────────────────────────────────────────────────────────

const sheet_nest = z.object({
  parts: z.array(polygon2DZ).min(1),
  sheet: sheetZ,
  options: nestingOptionsZ,
}).passthrough();

// ─── sheet_nest_optimize ─────────────────────────────────────────────────

const sheet_nest_optimize = z.object({
  parts: z.array(polygon2DZ).min(1),
  sheet: sheetZ,
  options: nestingOptionsZ,
}).passthrough();

// ─── sheet_cut_order ──────────────────────────────────────────────────────

const placedPartZ = z.object({
  part_id: z.string(),
  instance: z.number().int().nonnegative(),
  sheet_index: z.number().int().nonnegative(),
  x: z.number(),
  y: z.number(),
  rotation_deg: z.number(),
  mirrored: z.boolean(),
  bbox: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
}).passthrough();

const sheet_cut_order = z.object({
  nesting: z.object({
    placed: z.array(placedPartZ),
    unplaced: z.array(z.object({ part_id: z.string(), instance: z.number() })),
    sheets_used: z.number().int().positive(),
    utilization_pct: z.number(),
    total_part_area_mm2: z.number(),
    total_sheet_area_mm2: z.number(),
    scrap_area_mm2: z.number(),
    scrap_cost: z.number().optional(),
    cut_order: z.array(placedPartZ),
  }).passthrough(),
}).passthrough();

// ─── dxf_parse ────────────────────────────────────────────────────────────

const dxf_parse = z.object({
  content: z.string().min(1).describe("Raw DXF or SVG file content as string"),
  format: z.enum(["dxf", "svg"]).optional().describe("File format (auto-detected if omitted)"),
  classify_contours: z.boolean().optional().describe("Run hole/outer classification (default true)"),
}).passthrough();

// ─── Export ───────────────────────────────────────────────────────────────

export const ACTION_CK_MS10_SCHEMAS: ActionSchemaMap = {
  turning_profile_od,
  turning_profile_id,
  turning_profile_thread,
  turning_profile_gcode,
  sheet_nest,
  sheet_nest_optimize,
  sheet_cut_order,
  dxf_parse,
};
