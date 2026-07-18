/**
 * Turning Program Action Schemas — Zod v4
 *
 * Schemas for 12 turning program actions across 11 engines.
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const turningFeatureZ = z.object({
  id: z.string(),
  type: z.string(),
  od_mm: z.number().optional(),
  id_mm: z.number().optional(),
  length_mm: z.number(),
  depth_mm: z.number().optional(),
  width_mm: z.number().optional(),
  taper_angle_deg: z.number().optional(),
  thread_pitch_mm: z.number().optional(),
  thread_class: z.string().optional(),
  thread_starts: z.number().optional(),
  tolerance_mm: z.number().optional(),
  surface_finish_Ra_um: z.number().optional(),
  groove_width_mm: z.number().optional(),
  groove_depth_mm: z.number().optional(),
  diameter_mm: z.number().optional(),
  position_z_mm: z.number().optional(),
}).passthrough();

const turningMaterialZ = z.object({
  material_name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
}).passthrough();

const turningInputZ = z.object({
  part_number: z.string().optional(),
  material: turningMaterialZ,
  bar_stock_od_mm: z.number(),
  finished_od_mm: z.number().optional(),
  part_length_mm: z.number(),
  chuck_type: z.enum(["3_jaw", "collet", "4_jaw", "face_plate"]).optional(),
  max_spindle_rpm: z.number().optional(),
  max_power_kW: z.number().optional(),
  features: z.array(turningFeatureZ),
  optimization_target: z.enum(["balanced", "max_speed", "max_tool_life", "min_cost", "surface_quality"]).optional(),
  tailstock: z.boolean().optional(),
  sub_spindle: z.boolean().optional(),
}).passthrough();

// Both actions take the same input shape
const turning_print_to_program = turningInputZ;
const turning_process_plan = turningInputZ;

// CAD Import — STEP/IGES solid → turning profile
const turning_cad_import = z.object({
  source_format: z.enum(["step", "iges", "brep", "mesh", "manual"]).describe("Source CAD format"),
  filename: z.string().optional().describe("Source filename"),
  faces: z.array(z.object({
    id: z.string(),
    type: z.enum(["planar", "cylindrical", "conical", "spherical", "toroidal", "freeform"]),
    axis: z.object({
      origin: z.object({ x: z.number(), y: z.number(), z: z.number() }),
      direction: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    }).optional(),
    radius_mm: z.number().optional(),
    half_angle_deg: z.number().optional(),
    area_mm2: z.number(),
    sense: z.enum(["outward", "inward"]),
    edge_ids: z.array(z.string()),
  })).describe("Solid faces"),
  edges: z.array(z.object({
    id: z.string(),
    type: z.enum(["line", "arc", "circle", "ellipse", "bspline"]),
    start: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    end: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    center: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
    radius_mm: z.number().optional(),
    face_ids: z.array(z.string()),
  })).describe("Solid edges"),
  vertices: z.array(z.object({
    id: z.string(),
    position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  })).describe("Solid vertices"),
  bounding_box: z.object({
    min: z.object({ x: z.number(), y: z.number(), z: z.number() }),
    max: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  }).describe("Overall bounding box"),
  units: z.enum(["mm", "in"]).optional().describe("Model units (default mm)"),
}).passthrough();

// Stock Selection — part geometry → optimal bar stock
const turning_stock_select = z.object({
  max_finished_od_mm: z.number().describe("Maximum finished OD (mm)"),
  part_length_mm: z.number().describe("Total finished part length (mm)"),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("Material ISO group"),
  density_kg_m3: z.number().optional().describe("Material density override (kg/m³)"),
  preferred_shape: z.enum(["round", "tube", "hex", "square"]).optional().describe("Preferred stock shape"),
  preferred_units: z.enum(["metric", "imperial", "any"]).optional().describe("Preferred unit system"),
  min_bore_id_mm: z.number().optional().describe("Minimum bore ID (mm) — triggers tube stock consideration"),
  bar_feeder_max_od_mm: z.number().optional().describe("Bar feeder max OD capacity (mm)"),
  chuck_max_od_mm: z.number().optional().describe("Chuck max OD capacity (mm)"),
  cutoff_width_mm: z.number().optional().describe("Cutoff tool width (mm, default 3.0)"),
  grip_length_mm: z.number().optional().describe("Grip length (mm, default 25)"),
  facing_allowance_mm: z.number().optional().describe("Facing allowance per end (mm, default 1.0)"),
}).passthrough();

// Ambiguity Resolution — features → classified gaps + defaults + questions
const turning_resolve_ambiguity = z.object({
  features: z.array(turningFeatureZ).describe("Features extracted so far"),
  has_material: z.boolean().describe("Whether material was specified"),
  material_callout: z.string().optional().describe("Material string"),
  has_general_tolerance: z.boolean().describe("Whether general tolerance class was found"),
  general_tolerance_class: z.enum(["f", "m", "c", "v"]).optional().describe("ISO 2768 class"),
  has_gdt: z.boolean().describe("Whether any GD&T was found"),
  part_number: z.string().optional().describe("Part number from title block"),
  has_default_surface_finish: z.boolean().describe("Whether drawing-level finish was found"),
  default_ra_um: z.number().optional().describe("Default Ra (μm)"),
  part_max_od_mm: z.number().optional().describe("Part envelope max OD (mm)"),
  part_total_length_mm: z.number().optional().describe("Part envelope total length (mm)"),
}).passthrough();

// Rev Profile — STEP solid → 2D XZ silhouette
const turning_rev_profile = turning_cad_import; // Same CAD solid input

// Feature Taxonomy — XZ profile → classified TurningFeature[]
const turning_feature_taxonomy = z.object({
  od_profile: z.array(z.object({
    start: z.object({ x: z.number(), z: z.number() }),
    end: z.object({ x: z.number(), z: z.number() }),
    type: z.enum(["line", "arc"]),
    arc_center: z.object({ x: z.number(), z: z.number() }).optional(),
    arc_radius_mm: z.number().optional(),
    arc_direction: z.enum(["cw", "ccw"]).optional(),
    source_face_id: z.string().optional(),
  })).describe("OD profile segments from TurningRevProfileEngine"),
  id_profile: z.array(z.object({
    start: z.object({ x: z.number(), z: z.number() }),
    end: z.object({ x: z.number(), z: z.number() }),
    type: z.enum(["line", "arc"]),
    arc_center: z.object({ x: z.number(), z: z.number() }).optional(),
    arc_radius_mm: z.number().optional(),
    arc_direction: z.enum(["cw", "ccw"]).optional(),
    source_face_id: z.string().optional(),
  })).describe("ID profile segments"),
  ocr_dimensions: z.array(z.object({
    id: z.string(),
    value_mm: z.number(),
    tolerance_plus_mm: z.number().optional(),
    tolerance_minus_mm: z.number().optional(),
    fit_notation: z.string().optional(),
    surface_finish_Ra_um: z.number().optional(),
    thread_callout: z.string().optional(),
    type_hint: z.enum(["diameter", "length", "depth", "width", "angle", "thread", "radius"]).optional(),
  })).optional().describe("OCR-extracted dimensions for proximity matching"),
  iso2768_class: z.enum(["f", "m", "c", "v"]).optional().describe("ISO 2768 tolerance class"),
  default_ra_um: z.number().optional().describe("Default surface finish Ra (µm)"),
}).passthrough();

// Fit Notation Parser — H7/g6 → µm deviations
const turning_parse_fit = z.object({
  notation: z.string().describe("Fit notation string (e.g., 'H7/g6', 'H7', 'p6')"),
  nominal_diameter_mm: z.number().describe("Nominal diameter in mm"),
}).passthrough();

// ISO 2768 Applicator — apply general tolerances
const turning_apply_iso2768 = z.object({
  dimensions: z.array(z.object({
    id: z.string(),
    nominal_mm: z.number(),
    type: z.enum(["linear", "angular", "broken_edge", "diameter", "depth", "radius"]),
    explicit_tolerance_plus_mm: z.number().optional(),
    explicit_tolerance_minus_mm: z.number().optional(),
    feature_id: z.string().optional(),
    description: z.string().optional(),
  })).describe("Dimensions to tolerance"),
  geometrical: z.array(z.object({
    id: z.string(),
    type: z.enum(["straightness", "flatness", "circularity", "parallelism", "perpendicularity", "symmetry", "runout"]),
    nominal_range_mm: z.number(),
    explicit_value_mm: z.number().optional(),
    feature_id: z.string().optional(),
  })).optional().describe("Geometrical tolerances"),
  linear_class: z.enum(["f", "m", "c", "v"]).describe("ISO 2768-1 tolerance class"),
  geometrical_class: z.enum(["H", "K", "L"]).optional().describe("ISO 2768-2 tolerance class"),
}).passthrough();

// Lathe UI submit — same input as turning_print_to_program (from web wizard)
const lathe_ui_submit = turningInputZ;

// Lathe orchestrator — 35-stage pipeline (extends turning input with safety fields)
const lathe_orchestrate = turningInputZ.extend({
  workpiece_type: z.enum(["bar_stock", "chucked", "casting", "forging"]).optional(),
  bar_feeder: z.boolean().optional(),
  bar_extension_behind_spindle_mm: z.number().optional(),
  part_catcher: z.boolean().optional(),
  prove_out: z.boolean().optional(),
  safety_only: z.boolean().optional(),
}).passthrough();

export const ACTION_TURNING_PROGRAM_SCHEMAS: ActionSchemaMap = {
  turning_print_to_program,
  turning_process_plan,
  turning_cad_import,
  turning_stock_select,
  turning_resolve_ambiguity,
  turning_rev_profile,
  turning_feature_taxonomy,
  turning_parse_fit,
  turning_apply_iso2768,
  lathe_ui_submit,
  lathe_orchestrate,
};
