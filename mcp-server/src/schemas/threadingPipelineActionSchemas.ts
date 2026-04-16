/**
 * Threading Pipeline Action Schemas — Zod v4
 * 3 actions for ThreadingPipelineEngine
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const threadSpecZ = z.object({
  id: z.string(),
  type: z.string(),
  method: z.string(),
  major_diameter_mm: z.number(),
  pitch_mm: z.number(),
  tpi: z.number().optional(),
  thread_class: z.string().optional(),
  length_mm: z.number(),
  starts: z.number().optional(),
  hand: z.enum(["right", "left"]).optional(),
  internal: z.boolean(),
  included_angle_deg: z.number().optional(),
  taper_deg_per_side: z.number().optional(),
  chamfer_threads: z.number().optional(),
  surface_finish_Ra_um: z.number().optional(),
}).passthrough();

const threadMaterialZ = z.object({
  material_name: z.string(),
  iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
  hardness_hrc: z.number().optional(),
}).passthrough();

const threadInputZ = z.object({
  part_number: z.string().optional(),
  material: threadMaterialZ,
  threads: z.array(threadSpecZ),
  machine_type: z.enum(["lathe", "mill", "turn_mill"]).optional(),
  max_spindle_rpm: z.number().optional(),
  max_power_kW: z.number().optional(),
  controller: z.enum(["fanuc", "haas", "siemens", "mazak"]).optional(),
  optimization_target: z.enum(["balanced", "max_speed", "max_tool_life", "surface_quality"]).optional(),
}).passthrough();

const threading_pipeline = threadInputZ;
const threading_plan = threadInputZ;
const threading_pass_schedule = threadInputZ;

export const ACTION_THREADING_PIPELINE_SCHEMAS: ActionSchemaMap = {
  threading_pipeline,
  threading_plan,
  threading_pass_schedule,
};
