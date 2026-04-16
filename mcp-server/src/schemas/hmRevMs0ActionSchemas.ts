/**
 * HM-REV-MS0 Action Schemas — Zod v4
 *
 * Dispatcher actions for HyperCAD-S CAD Automation + Mock Layer (HM-REV-MS0):
 *   cam_hyperCADS_analyze      — draft/undercut/wall-thickness analysis script
 *   cam_hyperCADS_automate     — full automation sequence (import → heal → analyze)
 *   cam_hyperCADS_heal         — geometry healing script
 *   cam_hyperCADS_import       — STEP/IGES/DXF import script (also used by PrintToHyperCADSBridge)
 *   cam_hyperCADS_stock_model  — automated stock model creation
 *   cam_feature_to_strategy    — feature recognition results → strategy recommendations
 *
 * HM-REV-MS0 / U-HMR01 + U-HMR02 + U-HMR03 + U-HMR04 + U-HMR05
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const cadFileFormatZ = z.enum(["DXF", "IGES", "PARASOLID", "STEP", "STL"])
  .describe("CAD file format — STEP/IGES/DXF/STL/PARASOLID");

const coordinateSystemZ = z.object({
  x_axis:        z.tuple([z.number(), z.number(), z.number()]).optional()
    .describe("X-axis vector [x, y, z]"),
  y_axis:        z.tuple([z.number(), z.number(), z.number()]).optional()
    .describe("Y-axis vector [x, y, z]"),
  origin_offset: z.tuple([z.number(), z.number(), z.number()]).optional()
    .describe("Origin offset [x, y, z] in mm"),
}).describe("Coordinate system setup for import");

const importParamsZ = z.object({
  file_path:          z.string().describe("Absolute path to the CAD file"),
  format:             cadFileFormatZ.optional(),
  tolerance_mm:       z.number().positive().optional()
    .describe("Import tolerance in mm (default 0.01)"),
  coordinate_system:  coordinateSystemZ.optional(),
  set_as_workpiece:   z.boolean().optional()
    .describe("Assign imported body as hyperCAD-S workpiece"),
  part_name:          z.string().optional()
    .describe("Name for the imported body (defaults to filename stem)"),
}).describe("CAD file import parameters");

const healParamsZ = z.object({
  body_name:              z.string().optional()
    .describe("Body name to heal (defaults to active body)"),
  stitch_tolerance_mm:    z.number().positive().optional()
    .describe("Edge stitching tolerance in mm (default 0.01)"),
  heal_tolerance_mm:      z.number().positive().optional()
    .describe("Full heal tolerance in mm (default 0.05)"),
  align_normals:          z.boolean().optional()
    .describe("Align face normals outward"),
  remove_duplicates:      z.boolean().optional()
    .describe("Remove duplicate surfaces"),
  fill_holes_diameter_mm: z.number().positive().optional()
    .describe("Fill holes smaller than this diameter in mm"),
}).describe("Geometry healing parameters");

const analyzeParamsZ = z.object({
  body_name:               z.string().optional()
    .describe("Body name to analyze (defaults to active body)"),
  draft_angle_deg:         z.number().min(0).max(90).optional()
    .describe("Minimum draft angle threshold in degrees (default 3.0°)"),
  detect_undercuts:        z.boolean().optional()
    .describe("Enable undercut detection"),
  min_wall_thickness_mm:   z.number().positive().optional()
    .describe("Minimum acceptable wall thickness in mm (default 1.0)"),
  tool_direction:          z.tuple([z.number(), z.number(), z.number()]).optional()
    .describe("Analysis tool direction vector [x, y, z] (default [0,0,1])"),
}).describe("CAD feature analysis parameters");

const featureTypeZ = z.enum([
  "boss",
  "chamfer",
  "channel",
  "contour",
  "corner",
  "freeform",
  "freeform_surface",
  "groove",
  "hole",
  "pocket",
  "rib",
  "slot",
  "thread",
  "face",
]).describe("Recognized geometric feature type");

const recognizedFeatureZ = z.object({
  type:               featureTypeZ,
  depth_mm:           z.number().positive().optional()
    .describe("Feature depth in mm"),
  width_mm:           z.number().positive().optional()
    .describe("Feature width or diameter in mm"),
  draft_angle_deg:    z.number().min(0).max(90).optional()
    .describe("Wall draft angle in degrees"),
  surface_area_mm2:   z.number().positive().optional()
    .describe("Feature surface area in mm²"),
  previously_roughed: z.boolean().optional()
    .describe("Feature was previously roughed — selects semi-finish/finish goal"),
  part_tolerance_mm:  z.number().positive().optional()
    .describe("Required part tolerance in mm (tighter → finishing)"),
  material_group:     z.string().optional()
    .describe("ISO material group (P/M/K/N/S/H) or material name"),
  feature_id:         z.string().optional()
    .describe("Feature ID from CAD recognition output"),
}).describe("Recognized geometric feature from CAD analysis");

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_HM_REV_MS0_SCHEMAS: ActionSchemaMap = {

  /**
   * cam_hyperCADS_analyze
   * Generate AC Python draft/undercut/wall-thickness analysis script.
   * No USB key required — generates script only.
   */
  cam_hyperCADS_analyze: z.object({
    body_name:               z.string().optional()
      .describe("Body name to analyze (defaults to active body)"),
    draft_angle_deg:         z.number().min(0).max(90).optional()
      .describe("Minimum draft angle threshold in degrees (default 3.0°)"),
    detect_undercuts:        z.boolean().optional()
      .describe("Enable undercut detection in analysis script"),
    min_wall_thickness_mm:   z.number().positive().optional()
      .describe("Minimum wall thickness threshold in mm (default 1.0)"),
    tool_direction:          z.tuple([z.number(), z.number(), z.number()]).optional()
      .describe("Tool direction vector for analysis [x, y, z]"),
  }),

  /**
   * cam_hyperCADS_automate
   * Generate full CAD automation sequence: import → heal → analyze.
   * Forge-triple action for HM-REV-MS0.
   */
  cam_hyperCADS_automate: z.object({
    import_params: importParamsZ,
    heal:          z.boolean().optional()
      .describe("Run geometry healing after import (default true)"),
    heal_params:   healParamsZ.optional(),
    analyze:       z.boolean().optional()
      .describe("Run feature analysis after healing (default false)"),
    analyze_params: analyzeParamsZ.optional(),
  }),

  /**
   * cam_hyperCADS_heal
   * Generate AC Python geometry healing script (stitch edges, align normals, fill holes).
   */
  cam_hyperCADS_heal: z.object({
    body_name:              z.string().optional()
      .describe("Part body name to heal"),
    stitch_tolerance_mm:    z.number().positive().optional()
      .describe("Edge stitching tolerance in mm (default 0.01)"),
    heal_tolerance_mm:      z.number().positive().optional()
      .describe("Full heal tolerance in mm (default 0.05)"),
    align_normals:          z.boolean().optional()
      .describe("Align face normals outward (default true)"),
    remove_duplicates:      z.boolean().optional()
      .describe("Remove duplicate surfaces (default true)"),
    fill_holes_diameter_mm: z.number().positive().optional()
      .describe("Fill holes smaller than this diameter in mm"),
  }),

  /**
   * cam_hyperCADS_import
   * Generate AC Python import script for STEP/IGES/DXF files.
   * Bridges to PrintToHyperCADSBridge when material is provided.
   */
  cam_hyperCADS_import: z.object({
    file_path:         z.string().describe("Absolute path to STEP/IGES/DXF file"),
    format:            cadFileFormatZ.optional(),
    tolerance_mm:      z.number().positive().optional()
      .describe("Import tolerance in mm (default 0.01)"),
    coordinate_system: coordinateSystemZ.optional(),
    set_as_workpiece:  z.boolean().optional()
      .describe("Set imported body as hyperCAD-S workpiece"),
    part_name:         z.string().optional()
      .describe("Name for the imported part body"),
    material:          z.string().optional()
      .describe("Material for PrintToHyperCADSBridge (e.g. '316L', 'Ti-6Al-4V', 'P') — triggers bridge mode"),
    run_heal:          z.boolean().optional()
      .describe("Chain heal after import when material is provided (default true)"),
  }),

  /**
   * cam_hyperCADS_stock_model
   * Generate AC Python stock model creation script (bounding_box | offset_solid | cylinder).
   * Default allowance: 2.0mm.
   */
  cam_hyperCADS_stock_model: z.object({
    mode: z.enum(["bounding_box", "cylinder", "offset_solid"])
      .describe("Stock generation mode: bounding_box, offset_solid, or cylinder"),
    body_name:           z.string().optional()
      .describe("Part body name to create stock from (bounding_box/offset_solid)"),
    offset_mm:           z.number().positive().optional()
      .describe("Uniform offset on all sides in mm (bounding_box mode, default 2.0)"),
    axial_allowance_mm:  z.number().positive().optional()
      .describe("Axial (Z) stock allowance in mm (offset_solid mode, default 2.0)"),
    radial_allowance_mm: z.number().positive().optional()
      .describe("Radial (XY) stock allowance in mm (offset_solid mode, default 2.0)"),
    od_mm:               z.number().positive().optional()
      .describe("Outer diameter of cylinder stock in mm (cylinder mode, required)"),
    length_mm:           z.number().positive().optional()
      .describe("Cylinder length in mm (cylinder mode, required)"),
    axis:                z.enum(["X", "Y", "Z"]).optional()
      .describe("Cylinder axis direction (cylinder mode, default Z)"),
    stock_name:          z.string().optional()
      .describe("Name for the created stock model"),
    material:            z.string().optional()
      .describe("Material name for stock assignment (cylinder mode)"),
  }),

  /**
   * cam_feature_to_strategy
   * Map recognized CAD features to hyperMILL machining strategy recommendations.
   * Uses HyperMillStrategyEngine internally for cycle selection.
   */
  cam_feature_to_strategy: z.object({
    features: z.array(recognizedFeatureZ).min(1).max(50)
      .describe("Recognized geometric features from CAD analysis (max 50)"),
    default_material_group: z.string().optional()
      .describe("Default ISO material group (P/M/K/N/S/H) for features without material_group"),
    default_tolerance_mm:   z.number().positive().optional()
      .describe("Default part tolerance in mm for features without tolerance"),
  }),
};
