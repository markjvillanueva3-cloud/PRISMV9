/**
 * Batch CAM Strategy 2 Action Schemas — Zod v4
 *
 * 8 dispatcher actions (BatchCAMStrategyEngines2 E1110):
 *   worknc_strategy_recommend, worknc_strategy_list
 *   topsolid_strategy_recommend, topsolid_strategy_list
 *   bobcad_strategy_recommend, bobcad_strategy_list
 *   cimatron_strategy_recommend, cimatron_strategy_list
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

// ── Recommend schema (shared by all 4) ───────────────────────────────────────

const recommendSchema = z.object({
  feature: featureZ.describe("Feature to machine"),
  material: materialZ.optional().describe("Workpiece material"),
  priority: priorityZ,
});

// ── List schema (shared by all 4) ────────────────────────────────────────────

const listSchema = z.object({
  category: categoryZ,
});

// ── Action Schemas ───────────────────────────────────────────────────────────

export const ACTION_BATCH_CAM_STRATEGY2_SCHEMAS: ActionSchemaMap = {
  worknc_strategy_recommend: recommendSchema,
  worknc_strategy_list: listSchema,
  topsolid_strategy_recommend: recommendSchema,
  topsolid_strategy_list: listSchema,
  bobcad_strategy_recommend: recommendSchema,
  bobcad_strategy_list: listSchema,
  cimatron_strategy_recommend: recommendSchema,
  cimatron_strategy_list: listSchema,
};
