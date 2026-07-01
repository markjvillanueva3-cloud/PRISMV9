/**
 * Secondary Ops Action Schemas — Zod v4
 * 2 actions for SecondaryOpsPipelineEngine
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const secondaryOpZ = z.object({
  id: z.string(),
  type: z.string(),
  chamfer_size_mm: z.number().optional(),
  edge_break_mm: z.number().optional(),
  feature_ids: z.array(z.string()).optional(),
  probe_axis: z.string().optional(),
  nominal_mm: z.number().optional(),
  tolerance_mm: z.number().optional(),
  work_offset_to_update: z.string().optional(),
  alarm_on_fail: z.boolean().optional(),
  text: z.string().optional(),
  font_height_mm: z.number().optional(),
  depth_mm: z.number().optional(),
  position_x_mm: z.number().optional(),
  position_y_mm: z.number().optional(),
  dwell_sec: z.number().optional(),
  pressure: z.string().optional(),
}).passthrough();

const secondaryOpsInputZ = z.object({
  part_number: z.string().optional(),
  operations: z.array(secondaryOpZ),
  machine_type: z.enum(["mill", "lathe", "turn_mill"]).optional(),
  controller: z.enum(["fanuc", "haas", "siemens"]).optional(),
  probe_system: z.string().optional(),
  max_spindle_rpm: z.number().optional(),
}).passthrough();

const secondary_ops_pipeline = secondaryOpsInputZ;
const secondary_ops_plan = secondaryOpsInputZ;

export const ACTION_SECONDARY_OPS_SCHEMAS: ActionSchemaMap = {
  secondary_ops_pipeline,
  secondary_ops_plan,
};
