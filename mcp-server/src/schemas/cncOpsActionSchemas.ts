/**
 * CNC Operations Dispatcher Action Schemas
 * =========================================
 * Per-action Zod schemas for prism_cnc_ops actions.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const optNum = z.number().optional();
const optStr = z.string().optional();
const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();

// Generic CNC operation params — most engines accept these
const cncBaseParams = {
  material: optStr,
  material_id: optStr,
  tool_diameter_mm: optPosNum,
  cutting_speed_mpm: optPosNum,
  feed_per_tooth_mm: optPosNum,
  spindle_rpm: optPosNum,
  depth_of_cut_mm: optPosNum,
  width_of_cut_mm: optPosNum,
};

// Ball end mill
const ball_endmill_calculate = z.object({
  ...cncBaseParams,
  tool_diameter_mm: posNum,
  corner_radius_mm: optPosNum,
  step_over_mm: optPosNum,
  depth_of_cut_mm: optPosNum,
  cutting_speed_mpm: optPosNum,
  feed_per_tooth_mm: optPosNum,
}).passthrough();

const ball_endmill_scallop = z.object({
  tool_diameter_mm: posNum,
  step_over_mm: posNum,
  surface_angle_deg: optNum,
}).passthrough();

// Simple calculate-only schemas (most engines)
const simpleCalc = z.object({ ...cncBaseParams }).passthrough();

export const CNC_OPS_ACTION_SCHEMAS: ActionSchemaMap = {
  ball_endmill_calculate: ball_endmill_calculate,
  ball_endmill_scallop: ball_endmill_scallop,
  bar_feeder_calculate: simpleCalc,
  broach_design: simpleCalc,
  center_drill_calculate: simpleCalc,
  chamfer_calculate: z.object({
    chamfer_width_mm: optPosNum,
    chamfer_angle_deg: optNum,
    hole_diameter_mm: optPosNum,
    edge_type: z.enum(["hole", "edge", "corner"]).optional(),
    tool_type: z.enum(["chamfer_mill", "spot_drill", "countersink"]).optional(),
    ...cncBaseParams,
  }).passthrough(),
  chamfer_milling_calculate: simpleCalc,
  circular_interpolation_calculate: z.object({
    ...cncBaseParams,
    hole_diameter_mm: posNum,
    tool_diameter_mm: posNum,
    depth_mm: optPosNum,
  }).passthrough(),
  circular_pocket_calculate: z.object({
    ...cncBaseParams,
    pocket_diameter_mm: posNum,
    pocket_depth_mm: posNum,
    tool_diameter_mm: posNum,
  }).passthrough(),
  counterbore_calculate: simpleCalc,
  counterboring_calculate: simpleCalc,
  countersink_calculate: simpleCalc,
  deburring_calculate: simpleCalc,
  face_mill_calculate: z.object({
    ...cncBaseParams,
    workpiece_width_mm: posNum,
    workpiece_length_mm: optPosNum,
    cutter_diameter_mm: posNum,
    depth_of_cut_mm: optPosNum,
  }).passthrough(),
  lathe_face_calculate: simpleCalc,
  helical_interpolation_calculate: z.object({
    ...cncBaseParams,
    hole_diameter_mm: posNum,
    tool_diameter_mm: posNum,
    pitch_mm: optPosNum,
  }).passthrough(),
  honing_calculate: simpleCalc,
  keyseat_cutter_calculate: simpleCalc,
  keyway_calculate: simpleCalc,
  knurling_calculate: simpleCalc,
  parting_grooving_calculate: z.object({
    workpiece_diameter_mm: optPosNum,
    groove_width_mm: optPosNum,
    groove_depth_mm: optPosNum,
    ...cncBaseParams,
  }).passthrough(),
  power_skiving_calculate: simpleCalc,
  profiling_calculate: simpleCalc,
  ramping_calculate: z.object({
    ramp_angle_deg: optNum,
    ...cncBaseParams,
  }).passthrough(),
  slotting_calculate: z.object({
    slot_width_mm: optPosNum,
    slot_depth_mm: optPosNum,
    ...cncBaseParams,
  }).passthrough(),
  spot_drilling_calculate: z.object({
    desired_diameter_mm: optPosNum,
    drill_diameter_mm: optPosNum,
    spot_angle_deg: optNum,
    ...cncBaseParams,
  }).passthrough(),
  spring_pass_calculate: simpleCalc,
  taper_turning_calculate: z.object({
    large_diameter_mm: optPosNum,
    small_diameter_mm: optPosNum,
    taper_length_mm: optPosNum,
    taper_angle_deg: optNum,
    method: z.enum(["compound_slide", "tailstock_offset", "taper_attachment", "cnc"]).optional(),
    ...cncBaseParams,
  }).passthrough(),
  thread_turning_calculate: z.object({
    pitch_mm: optPosNum,
    major_diameter_mm: optPosNum,
    thread_type: z.enum(["external", "internal"]).optional(),
    thread_form: z.enum(["metric", "unified", "acme", "buttress", "npt"]).optional(),
    ...cncBaseParams,
  }).passthrough(),
  waterjet_calculate: simpleCalc,
  plasma_cutting_calculate: simpleCalc,
  plasma_arc_calculate: simpleCalc,
};
