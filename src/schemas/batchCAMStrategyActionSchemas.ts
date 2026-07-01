/**
 * Batch CAM Strategy Action Schemas — Zod v4
 *
 * 12 dispatcher actions (BatchCAMStrategyEngines E1109):
 *   tebis_strategy_recommend, tebis_strategy_list
 *   edgecam_strategy_recommend, edgecam_strategy_list
 *   esprit_strategy_recommend, esprit_strategy_list
 *   gibbscam_strategy_recommend, gibbscam_strategy_list
 *   camworks_strategy_recommend, camworks_strategy_list
 *   sprutcam_strategy_recommend, sprutcam_strategy_list
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const featureZ = z.object({
  type: z.enum([
    "bore", "contour", "face", "flat_area", "freeform_3d", "groove", "hole",
    "impeller", "pocket", "ruled_surface", "slot", "steep_wall", "thread",
    "turning_external", "turning_internal",
  ]).describe("Feature geometry type"),
  depth_mm: z.number().positive().optional().describe("Feature depth in mm"),
  wall_angle_deg: z.number().min(0).max(90).optional().describe("Wall angle in degrees"),
  has_previous_roughing: z.boolean().optional().default(false).describe("Whether previous roughing done"),
  axis_count: z.enum(["3", "4", "5"]).transform(Number).optional().describe("Number of axes available"),
}).passthrough();

const materialZ = z.object({
  iso_group: z.enum(["H", "K", "M", "N", "P", "S"]).optional().describe("ISO material group"),
  hardness_hrc: z.number().min(0).max(70).optional().describe("Hardness in HRC"),
}).passthrough();

const priorityZ = z.enum([
  "balanced", "cycle_time", "surface_finish", "tool_life",
]).optional().default("balanced").describe("Optimization priority");

const categoryZ = z.enum([
  "drilling", "finishing", "multi_axis", "roughing", "specialty", "turning",
]).optional().describe("Filter by strategy category");

// ── Recommend schema (shared by all 6) ───────────────────────────────────────

const recommendSchema = z.object({
  feature: featureZ.describe("Feature to machine"),
  material: materialZ.optional().describe("Workpiece material"),
  priority: priorityZ,
});

// ── List schema (shared by all 6) ────────────────────────────────────────────

const listSchema = z.object({
  category: categoryZ,
});

// ── Action Schemas ───────────────────────────────────────────────────────────

export const ACTION_BATCH_CAM_STRATEGY_SCHEMAS: ActionSchemaMap = {
  tebis_strategy_recommend: recommendSchema,
  tebis_strategy_list: listSchema,
  edgecam_strategy_recommend: recommendSchema,
  edgecam_strategy_list: listSchema,
  esprit_strategy_recommend: recommendSchema,
  esprit_strategy_list: listSchema,
  gibbscam_strategy_recommend: recommendSchema,
  gibbscam_strategy_list: listSchema,
  camworks_strategy_recommend: recommendSchema,
  camworks_strategy_list: listSchema,
  sprutcam_strategy_recommend: recommendSchema,
  sprutcam_strategy_list: listSchema,
};
