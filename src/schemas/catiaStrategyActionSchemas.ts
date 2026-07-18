/**
 * CATIA Strategy Action Schemas — Zod v4
 *
 * 5 dispatcher actions (CATIAStrategyEngine E1108):
 *   catia_strategy_recommend  — ranked strategy recommendations
 *   catia_strategy_params     — default parameters for a strategy
 *   catia_kbm_details         — Knowledge-Based Machining deep-dive
 *   catia_mfg_program         — Manufacturing Program structure deep-dive
 *   catia_strategy_list       — list all strategies (optionally filtered by category)
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ────────────────────────────────────────────────────────

const featureZ = z.object({
  type: z.enum([
    "freeform_3d", "flat_area", "groove", "hole", "impeller",
    "pattern", "pocket", "point_to_point", "profile",
    "ruled_surface", "slot", "face", "steep_wall",
    "stl_surface", "thread", "turning_external", "turning_internal",
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
    "ballnose", "barrel", "bullnose", "circle_segment", "drill",
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
  "lathe", "mill_turn", "multi_axis",
  "prismatic_finishing", "prismatic_roughing",
  "stl_machining", "surface_finishing", "surface_roughing",
]).optional().describe("Filter by CATIA strategy category");

const strategyNameZ = z.string().min(1).describe(
  "Strategy name, e.g. 'pocketing', 'zlevel', 'multiaxis_flank'. Use catia_strategy_list to see all."
);

// ── Action Schemas ────────────────────────────────────────────────────────────

export const ACTION_CATIA_STRATEGY_SCHEMAS: ActionSchemaMap = {
  catia_strategy_recommend: z.object({
    feature: featureZ.describe("Feature to machine"),
    material: materialZ.describe("Workpiece material"),
    machine: machineZ.describe("CNC machine"),
    tool: toolZ.describe("Cutting tool"),
    priority: priorityZ,
  }),

  catia_strategy_params: z.object({
    strategy_name: strategyNameZ,
  }),

  catia_kbm_details: z.object({}).passthrough(),

  catia_mfg_program: z.object({}).passthrough(),

  catia_strategy_list: z.object({
    category: categoryZ,
  }),
};
