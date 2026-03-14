/**
 * Action schemas for PostProcessorPipelineEngine
 * 5 actions for the universal post processor pipeline
 */
import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

const isoGroupZ = z.enum(["P", "M", "K", "N", "S", "H"]).optional();
const controllerZ = z.enum([
  "fanuc", "siemens", "heidenhain", "haas", "mazak", "okuma",
  "brother", "doosan", "hurco", "mitsubishi", "fagor",
]).optional();
const toolTypeZ = z.enum([
  "flat_endmill", "ball_endmill", "bull_nose", "face_mill",
  "drill", "tap", "reamer", "chamfer", "boring_bar",
  "insert_mill", "thread_mill", "slot_drill",
]).optional();
const optimizeForZ = z.enum(["balanced", "max_speed", "max_tool_life", "min_cost", "surface_quality"]).optional();

const toolDefZ = z.object({
  id: z.string().optional(),
  tool_number: z.number().optional(),
  type: toolTypeZ,
  diameter_mm: z.number(),
  flute_count: z.number().optional(),
  flute_length_mm: z.number().optional(),
  corner_radius_mm: z.number().optional(),
  helix_angle_deg: z.number().optional(),
  material: z.enum(["carbide", "hss", "cermet", "ceramic", "cbn", "pcd"]).optional(),
  coating: z.string().optional(),
  max_Vc_m_min: z.number().optional(),
  max_rpm: z.number().optional(),
  kc1_1: z.number().optional(),
  mc: z.number().optional(),
}).passthrough();

const machineDefZ = z.object({
  name: z.string(),
  controller: controllerZ,
  max_rpm: z.number().optional(),
  max_power_kW: z.number().optional(),
  axes: z.number().optional(),
}).passthrough();

const materialDefZ = z.object({
  name: z.string(),
  iso_group: isoGroupZ,
  hardness_HB: z.number().optional(),
  hardness_HRC: z.number().optional(),
}).passthrough();

const stageConfigZ = z.object({
  speed_feed: z.boolean().optional(),
  constitutive: z.boolean().optional(),
  stability_lobes: z.boolean().optional(),
  engagement_analysis: z.boolean().optional(),
  chip_thinning: z.boolean().optional(),
  adaptive_feed: z.boolean().optional(),
  corner_detection: z.boolean().optional(),
  wear_progression: z.boolean().optional(),
  thermal_tracking: z.boolean().optional(),
  safety_analysis: z.boolean().optional(),
  playbook_rules: z.boolean().optional(),
  tribal_knowledge: z.boolean().optional(),
  monte_carlo: z.boolean().optional(),
  gcode_generation: z.boolean().optional(),
  analytics_report: z.boolean().optional(),
  cycle_time: z.boolean().optional(),
}).passthrough();

const operationZ = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  type: z.string(),
  tool_number: z.number(),
  ae_mm: z.number().optional(),
  ap_mm: z.number().optional(),
  tolerance_mm: z.number().optional(),
  surface_finish_Ra: z.number().optional(),
}).passthrough();

/** pp_run_full — Run complete post processor pipeline */
const pp_run_full = z.object({
  gcode: z.string().optional().describe("Raw G-code to optimize"),
  cl_data: z.string().optional().describe("CL/APT data to process"),
  material: materialDefZ.optional().describe("Material specification"),
  machine: machineDefZ.optional().describe("Machine specification"),
  controller: controllerZ.describe("Controller family for output format"),
  tools: z.array(toolDefZ).optional().describe("Tool definitions"),
  operations: z.array(operationZ).optional().describe("Operation definitions with ae/ap"),
  aggressiveness: z.number().min(0).max(1).optional().describe("0.0=conservative, 1.0=aggressive, default 0.5"),
  optimization_target: optimizeForZ.describe("Optimization priority"),
  stages: stageConfigZ.optional().describe("Enable/disable individual pipeline stages"),
  tolerance_mm: z.number().optional().describe("Default tolerance for all operations"),
  surface_finish_Ra: z.number().optional().describe("Default Ra target"),
  include_setup_sheet: z.boolean().optional(),
  include_analytics: z.boolean().optional(),
  include_probe_routines: z.boolean().optional(),
  debug: z.boolean().optional(),
}).passthrough();

/** pp_run_partial — Run specific phase range only */
const pp_run_partial = z.object({
  gcode: z.string().describe("G-code to process"),
  material: materialDefZ.optional(),
  machine: machineDefZ.optional(),
  controller: controllerZ,
  tools: z.array(toolDefZ).optional(),
  aggressiveness: z.number().min(0).max(1).optional(),
  stages: stageConfigZ.optional().describe("Select which stages to run"),
}).passthrough();

/** pp_analyze — Dry run, return analytics without generating G-code */
const pp_analyze = z.object({
  gcode: z.string().describe("G-code to analyze"),
  material: materialDefZ.optional(),
  machine: machineDefZ.optional(),
  tools: z.array(toolDefZ).optional(),
  aggressiveness: z.number().min(0).max(1).optional(),
}).passthrough();

/** pp_reoptimize — Phase B re-optimization of existing G-code */
const pp_reoptimize = z.object({
  gcode: z.string().describe("Existing G-code to re-optimize"),
  material: z.string().describe("Material name"),
  iso_group: isoGroupZ,
  machine: z.string().optional().describe("Machine name for catalog lookup"),
  controller: controllerZ,
  aggressiveness: z.number().min(0).max(1).optional(),
  stages: stageConfigZ.optional(),
}).passthrough();

/** pp_resolve_context — Resolve machine/tool/material without running pipeline */
const pp_resolve_context = z.object({
  material: materialDefZ.optional(),
  machine: machineDefZ.optional(),
  tools: z.array(toolDefZ).optional(),
}).passthrough();

export const ACTION_POST_PROCESSOR_PIPELINE_SCHEMAS: ActionSchemaMap = {
  pp_run_full,
  pp_run_partial,
  pp_analyze,
  pp_reoptimize,
  pp_resolve_context,
};
