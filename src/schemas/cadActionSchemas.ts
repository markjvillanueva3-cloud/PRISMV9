/**
 * CAD Dispatcher Action Schemas
 * ==============================
 * Per-action Zod schemas for all 33 prism_cad actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/cadActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optPosNum = z.number().positive().optional();
const optBool = z.boolean().optional();
const point2d = z.object({ x: z.number(), y: z.number() });
const optPoint2d = point2d.optional();
const point3d = z.object({ x: z.number(), y: z.number(), z: z.number() });
const optPoint3d = point3d.optional();

// ============================================================================
// Geometry actions (3)
// ============================================================================

const geometry_create = z.object({
  type: z.string().optional(),
  dimensions: z.record(z.string(), z.unknown()).optional(),
  position: optPoint3d,
  material: optStr,
}).passthrough();

const geometry_transform = z.object({
  geometry_id: optStr,
  operation: z.enum(["translate", "rotate", "scale", "mirror"]).optional(),
  vector: optPoint3d,
  angle: optNum,
  axis: optStr,
  scale_factor: optPosNum,
}).passthrough();

const geometry_analyze = z.object({
  geometry_id: optStr,
  analysis_type: optStr,
}).passthrough();

// ============================================================================
// Mesh actions (3)
// ============================================================================

const mesh_generate = z.object({
  geometry_id: optStr,
  element_size_mm: optPosNum,
  element_type: z.enum(["tri", "quad", "tet", "hex"]).optional(),
  refinement_level: z.number().int().min(0).max(5).optional(),
}).passthrough();

const mesh_import = z.object({
  format: z.enum(["stl", "obj", "ply", "step"]).optional(),
  data: z.string().optional(),
  file_path: optStr,
}).passthrough();

const mesh_export = z.object({
  mesh_id: optStr,
  format: z.enum(["stl", "obj", "ply", "step"]).optional(),
  file_path: optStr,
}).passthrough();

// ============================================================================
// Feature actions (2)
// ============================================================================

const feature_recognize = z.object({
  geometry_id: optStr,
  feature_types: z.array(z.string()).optional(),
}).passthrough();

const feature_edit = z.object({
  feature_id: z.string().min(1),
  operation: optStr,
  parameters: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

// ============================================================================
// Stock / WCS / DfM actions (5)
// ============================================================================

const stock_model = z.object({
  stock_type: z.enum(["rectangular", "cylindrical", "near_net"]).optional(),
  dimensions: z.record(z.string(), z.unknown()).optional(),
  material: optStr,
  allowance_mm: optPosNum,
}).passthrough();

const wcs_setup = z.object({
  part_id: optStr,
  origin: optPoint3d,
  orientation: z.record(z.string(), z.unknown()).optional(),
  datum_features: z.array(z.string()).optional(),
}).passthrough();

const dfm_check = z.object({
  geometry_id: optStr,
  material: optStr,
  process: optStr,
  rules: z.array(z.string()).optional(),
}).passthrough();

const face_mill_select = z.object({
  width_mm: optPosNum,
  length_mm: optPosNum,
  material: optStr,
  surface_finish_ra: optPosNum,
}).passthrough();

const deep_hole_technique = z.object({
  diameter_mm: z.number().positive(),
  depth_mm: z.number().positive(),
  material: optStr,
  tolerance: optPosNum,
}).passthrough();

// ============================================================================
// DFM Pipeline actions (5)
// ============================================================================

const dfm_feature_schema = z.object({
  id: optStr.describe("Feature ID for cross-referencing issues"),
  type: z.string().describe("Feature type: hole, pocket, slot, thread, undercut, wall, boss, bore, contour, fillet, chamfer, rib"),
  count: z.number().int().positive().default(1).describe("Number of instances"),
  dimensions: z.object({
    length_mm: optPosNum, width_mm: optPosNum, depth_mm: optPosNum,
    diameter_mm: optPosNum, height_mm: optPosNum,
  }).optional().describe("Feature dimensions"),
  tolerance_mm: optPosNum.describe("Bilateral tolerance in mm"),
  surface_finish_Ra: optPosNum.describe("Surface finish Ra in μm"),
  wall_thickness_mm: optPosNum.describe("Wall thickness in mm"),
  corner_radius_mm: optPosNum.describe("Internal corner radius in mm"),
  is_blind: z.boolean().optional().describe("True for blind holes/threads"),
  requires_5axis: z.boolean().optional().describe("True if feature needs 5-axis access"),
  draft_angle_deg: optPosNum.describe("Draft angle for injection mold features"),
  thread_pitch_mm: optPosNum.describe("Thread pitch in mm"),
  thread_nominal_mm: optPosNum.describe("Thread nominal diameter in mm"),
  gdt_callout: z.object({
    symbol: z.string().describe("GD&T symbol: flatness, position, perpendicularity, etc."),
    tolerance_mm: z.number().positive().describe("GD&T tolerance in mm"),
    datum_refs: z.array(z.string()).optional().describe("Datum references (e.g. ['A','B'])"),
    material_condition: z.enum(["MMC", "LMC", "RFS"]).optional(),
  }).optional(),
}).passthrough();

const dfm_analyze = z.object({
  part_name: optStr.describe("Part name for reporting"),
  features: z.array(dfm_feature_schema).describe("Features to analyze"),
  material: optStr.describe("Material name"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
  hardness_hb: optPosNum.describe("Brinell hardness"),
  machine_type: z.enum(["3axis", "5axis_indexed", "5axis_continuous", "lathe", "mill_turn"]).optional(),
  machine_axes: z.number().int().optional(),
  is_injection_mold: z.boolean().optional().describe("True to enable draft angle checks"),
}).passthrough();

const dfm_quick = dfm_analyze.describe("Quick DFM check — skips accessibility and GD&T");

const dfm_tolerance_check = z.object({
  dimensions: z.array(z.object({
    name: z.string().describe("Dimension name"),
    nominal_mm: z.number().describe("Nominal dimension in mm"),
    tolerance_mm: z.number().positive().describe("Bilateral tolerance in mm"),
  })).describe("Tolerance stack dimensions"),
  method: z.enum(["linear", "rss"]).describe("Stack-up method: linear (worst-case) or rss (statistical)"),
  assembly_gap_requirement_mm: optPosNum.describe("Required assembly gap in mm"),
}).passthrough();

const dfm_cost_impact = dfm_analyze.describe("DFM cost impact analysis — returns only cost data per issue");

const dfm_get_rules = z.object({}).passthrough().describe("List all DFM rules across all engines");

// ============================================================================
// Sketch actions (5)
// ============================================================================

const sketch_create = z.object({
  name: optStr,
  plane: z.enum(["XY", "XZ", "YZ"]).optional(),
}).passthrough();

const sketch_add_entity = z.object({
  sketch: z.record(z.string(), z.unknown()),
  entity_type: z.enum(["line", "arc", "circle", "rectangle", "polygon", "ellipse", "slot", "spline"]),
  // line
  start: optPoint2d,
  end: optPoint2d,
  construction: optBool,
  // arc / circle / polygon / ellipse
  center: optPoint2d,
  radius: optPosNum,
  start_angle: optNum,
  end_angle: optNum,
  // rectangle
  corner: optPoint2d,
  width: optPosNum,
  height: optPosNum,
  // polygon
  sides: z.number().int().min(3).optional(),
  // ellipse
  major_radius: optPosNum,
  minor_radius: optPosNum,
  // slot
  center1: optPoint2d,
  center2: optPoint2d,
  // spline
  points: z.array(point2d).optional(),
  closed: optBool,
}).passthrough();

const sketch_analyze = z.object({
  sketch: z.record(z.string(), z.unknown()),
}).passthrough();

const sketch_to_svg = z.object({
  sketch: z.record(z.string(), z.unknown()),
  view_box: z.string().optional(),
}).passthrough();

const sketch_to_cadquery = z.object({
  part: z.record(z.string(), z.unknown()),
}).passthrough();

// ============================================================================
// Part actions (8)
// ============================================================================

const part_create = z.object({
  name: optStr,
  material: optStr,
}).passthrough();

const part_add_feature = z.object({
  part: z.record(z.string(), z.unknown()),
  feature: z.object({
    type: z.enum(["extrude", "extrude_cut", "revolve", "hole", "fillet", "chamfer", "shell"]),
    sketch_id: optStr,
    depth: optPosNum,
    symmetric: optBool,
    draft_angle: optNum,
    through_all: optBool,
    angle: optNum,
    axis_entity_id: optStr,
    diameter: optPosNum,
    position: optPoint2d,
    countersink: z.record(z.string(), z.unknown()).optional(),
    counterbore: z.record(z.string(), z.unknown()).optional(),
    radius: optPosNum,
    distance: optPosNum,
    edge_ids: z.array(z.string()).optional(),
    thickness: optPosNum,
    faces_to_remove: z.array(z.string()).optional(),
  }).passthrough(),
}).passthrough();

const part_estimate_volume = z.object({
  part: z.record(z.string(), z.unknown()),
}).passthrough();

const part_template_box = z.object({
  name: optStr,
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
  material: optStr,
}).passthrough();

const part_template_cylinder = z.object({
  name: optStr,
  diameter: z.number().positive(),
  height: z.number().positive(),
  material: optStr,
}).passthrough();

const part_template_flange = z.object({
  name: optStr,
  outer_diameter: z.number().positive(),
  bore_diameter: z.number().positive(),
  thickness: z.number().positive(),
  bolt_circle_diameter: z.number().positive(),
  hole_count: z.number().int().positive(),
  hole_diameter: z.number().positive(),
  material: optStr,
}).passthrough();

const part_template_bracket = z.object({
  name: optStr,
  base_width: z.number().positive(),
  base_height: z.number().positive(),
  base_thickness: z.number().positive(),
  wall_height: z.number().positive(),
  wall_thickness: z.number().positive(),
  hole_diameter: optPosNum,
  material: optStr,
}).passthrough();

// ============================================================================
// Part Library actions (2)
// ============================================================================

const part_library_create = z.object({
  part_type: z.string().min(1),
}).passthrough();

const part_library_list_types = z.object({}).passthrough();

// ============================================================================
// Assembly actions (6)
// ============================================================================

const assembly_create = z.object({
  name: optStr,
  description: optStr,
}).passthrough();

const assembly_add_component = z.object({
  assembly: z.record(z.string(), z.unknown()),
  name: z.string().min(1),
  part_type: z.string().min(1),
  cadquery_build_code: optStr,
  position: optPoint3d,
  rotation: optPoint3d,
  quantity: z.number().int().positive().optional(),
  material: optStr,
  color: optStr,
}).passthrough();

const assembly_add_mate = z.object({
  assembly: z.record(z.string(), z.unknown()),
  mate_type: z.string().min(1),
  component_a_id: z.string().min(1),
  component_b_id: z.string().min(1),
  selector_a: optStr,
  selector_b: optStr,
  value: optNum,
  flip: optBool,
}).passthrough();

const assembly_position = z.object({
  assembly: z.record(z.string(), z.unknown()),
  component_id: z.string().min(1),
  position: optPoint3d,
  rotation: optPoint3d,
}).passthrough();

const assembly_bom = z.object({
  assembly: z.record(z.string(), z.unknown()),
  markdown: optBool,
}).passthrough();

const assembly_to_cadquery = z.object({
  assembly: z.record(z.string(), z.unknown()),
}).passthrough();

// ============================================================================
// CadQuery execute + prompt (2)
// ============================================================================

const cadquery_execute_script = z.object({
  script: z.string().min(1),
  output_path: z.string().optional(),
  format: z.enum(["step", "stl", "both"]).optional(),
}).passthrough();

const cadquery_codegen_prompt = z.object({}).passthrough();

// ============================================================================
// EXPORT MAP — 35 actions
// ============================================================================

export const ACTION_CAD_SCHEMAS: ActionSchemaMap = {
  // Geometry (3)
  geometry_create,
  geometry_transform,
  geometry_analyze,
  // Mesh (3)
  mesh_generate,
  mesh_import,
  mesh_export,
  // Feature (2)
  feature_recognize,
  feature_edit,
  // Stock / WCS / DfM (5)
  stock_model,
  wcs_setup,
  dfm_check,
  face_mill_select,
  deep_hole_technique,
  // DFM Pipeline (5)
  dfm_analyze,
  dfm_quick,
  dfm_tolerance_check,
  dfm_cost_impact,
  dfm_get_rules,
  // Sketch (5)
  sketch_create,
  sketch_add_entity,
  sketch_analyze,
  sketch_to_svg,
  sketch_to_cadquery,
  // Part (8)
  part_create,
  part_add_feature,
  part_estimate_volume,
  part_template_box,
  part_template_cylinder,
  part_template_flange,
  part_template_bracket,
  // Part Library (2)
  part_library_create,
  part_library_list_types,
  // Assembly (6)
  assembly_create,
  assembly_add_component,
  assembly_add_mate,
  assembly_position,
  assembly_bom,
  assembly_to_cadquery,
  // CadQuery execute + prompt (2)
  cadquery_execute_script,
  cadquery_codegen_prompt,
};
