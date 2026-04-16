/**
 * CAMX-MS3 U02 Action Schemas — Zod v4
 *
 * 5 dispatcher actions (SolidCAMStrategyEngine E1106):
 *   solidcam_strategy_recommend       — ranked strategy recommendations
 *   solidcam_strategy_params          — default parameters for a strategy
 *   solidcam_imachining_details       — iMachining Technology deep-dive
 *   solidcam_hss_details              — HSS finishing deep-dive
 *   solidcam_strategy_list            — list all strategies
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const featureZ = z.object({
  type: z.enum([
    "bore", "chamfer", "contour", "engrave", "face", "flat_area", "freeform_3d",
    "groove", "hole", "impeller", "pocket", "ruled_surface", "slot", "steep_wall",
    "thread", "turning_external", "turning_internal",
  ]).describe("Feature geometry type"),
  depth_mm: z.number().positive().optional().describe("Feature depth in mm"),
  wall_angle_deg: z.number().min(0).max(90).optional().describe(
    "Wall angle in degrees (0 = flat, 90 = vertical)"
  ),
  has_previous_roughing: z.boolean().optional().default(false).describe(
    "Whether previous roughing has been completed"
  ),
  axis_count: z.enum(["3", "4", "5"]).transform(Number).optional().describe(
    "Number of axes available"
  ),
}).passthrough();

const materialZ = z.object({
  iso_group: z.enum(["H", "K", "M", "N", "P", "S"]).describe(
    "ISO material group: P=Steel, M=Stainless, K=Cast Iron, N=Non-ferrous, S=Superalloy, H=Hardened"
  ),
  hardness_hrc: z.number().min(0).max(70).optional().describe(
    "Material hardness in HRC (influences strategy selection)"
  ),
  name: z.string().optional().describe("Material name for notes lookup"),
}).passthrough();

const machineZ = z.object({
  type: z.enum([
    "3axis_horizontal", "3axis_vertical", "4axis", "5axis", "lathe", "mill_turn",
  ]).describe("Machine type"),
  max_rpm: z.number().positive().optional().describe("Max spindle speed, RPM"),
  spindle_kw: z.number().positive().optional().describe("Spindle power, kW"),
  hpc: z.boolean().optional().default(false).describe("High-pressure coolant available"),
}).passthrough();

const toolZ = z.object({
  diameter_mm: z.number().positive().describe("Tool diameter, mm"),
  flute_count: z.number().int().positive().describe("Number of flutes"),
  type: z.enum([
    "ballnose", "barrel", "bullnose", "chamfer_mill", "circle_segment", "drill",
    "endmill", "face_mill", "insert", "tap", "thread_mill", "turning_insert",
  ]).describe("Tool type"),
  corner_radius_mm: z.number().nonnegative().optional().describe("Corner radius, mm"),
}).passthrough();

const priorityZ = z.enum([
  "balanced", "cycle_time", "surface_finish", "tool_life",
]).optional().default("balanced").describe(
  "Optimization priority: balanced (default), cycle_time, tool_life, or surface_finish"
);

const categoryZ = z.enum([
  "drilling", "five_axis", "hsr", "hss", "imachining", "turning", "two_five_d",
]).optional().describe("Filter by strategy category");

const strategyNameZ = z.string().min(1).describe(
  "Strategy name, e.g. 'imachining_2d', 'hss_spiral', 'sim5x_impeller'. Use solidcam_strategy_list to see all."
);

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS3_U02_SCHEMAS: ActionSchemaMap = {
  solidcam_strategy_recommend: z.object({
    feature: featureZ.describe("Feature to machine"),
    material: materialZ.describe("Workpiece material"),
    machine: machineZ.describe("CNC machine"),
    tool: toolZ.describe("Cutting tool"),
    priority: priorityZ,
  }),

  solidcam_strategy_params: z.object({
    strategy_name: strategyNameZ,
  }),

  solidcam_imachining_details: z.object({}).passthrough(),

  solidcam_hss_details: z.object({}).passthrough(),

  solidcam_strategy_list: z.object({
    category: categoryZ,
  }),
};
