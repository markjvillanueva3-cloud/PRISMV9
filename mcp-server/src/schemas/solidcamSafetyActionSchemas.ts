/**
 * SolidCAM Safety Action Schemas — Zod v4
 *
 * 3 dispatcher actions (SolidCAMSafetyHooksEngine E1114):
 *   solidcam_safety_validate      — validate a single SolidCAM operation against 15 safety rules
 *   solidcam_safety_validate_all  — validate a batch of SolidCAM operations
 *   solidcam_safety_rules         — list all safety rules with descriptions
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ─────────────────────────────────────────────────────────

const operationTypeZ = z.enum([
  "contour_3d", "drilling", "hsr", "hss",
  "imachining_2d", "imachining_3d", "irest",
  "other", "pocket_2d", "simultaneous_5axis",
  "swarf_5axis", "thread_milling", "turning",
]).describe("SolidCAM operation / toolpath type");

const operationZ = z.object({
  name: z.string().optional().describe("Operation label for reporting"),
  type: operationTypeZ,
  has_imachining_boundary: z.boolean().optional().describe(
    "Whether an iMachining boundary is defined for the operation"
  ),
  boundary_encloses_machining_area: z.boolean().optional().describe(
    "Whether the iMachining boundary fully encloses the entire machining area"
  ),
  imachining_stepdown_mm: z.number().positive().optional().describe(
    "iMachining step-down per level, mm"
  ),
  technology_wizard_level: z.number().int().min(1).max(8).optional().describe(
    "SolidCAM Technology Wizard level (1 = conservative, 8 = maximum)"
  ),
  morphing_spiral_intersects_islands: z.boolean().optional().describe(
    "Whether the iMachining morphing spiral toolpath intersects islands or internal bosses"
  ),
  hss_stepover_mm: z.number().positive().optional().describe(
    "HSS finishing stepover in mm"
  ),
  target_ra_um: z.number().positive().optional().describe(
    "Target surface roughness Ra in µm"
  ),
  ballnose_radius_mm: z.number().positive().optional().describe(
    "Ball-nose tool radius in mm (used for HSS Ra scallop calculation)"
  ),
  sim5axis_tilt_deg: z.number().min(0).max(180).optional().describe(
    "Simultaneous 5-axis tilt angle in degrees"
  ),
  is_ruled_surface: z.boolean().optional().describe(
    "Whether the surface being cut is a ruled surface (required for SWARF)"
  ),
  tool_level_slider: z.number().min(0).max(1).optional().describe(
    "iMachining Tool Level Slider value (0.0 = most conservative, 1.0 = most aggressive)"
  ),
  gpp_post_name: z.string().optional().describe(
    "GPP post processor name as configured in SolidCAM Job Manager"
  ),
  solidworks_stock_is_current: z.boolean().optional().describe(
    "Whether the SolidWorks in-process stock model is synchronized and current"
  ),
  feed_entry_mm_min: z.number().positive().optional().describe(
    "Entry helical feed rate, mm/min"
  ),
  feed_cutting_mm_min: z.number().positive().optional().describe(
    "Full cutting feed rate, mm/min"
  ),
  channel_width_mm: z.number().positive().optional().describe(
    "iMachining channel width, mm"
  ),
  irest_stock_is_current: z.boolean().optional().describe(
    "Whether the iRest stock model reflects all prior operations"
  ),
  thread_pitch_mm: z.number().positive().optional().describe(
    "Thread mill helix pitch as programmed, mm"
  ),
  thread_spec_pitch_mm: z.number().positive().optional().describe(
    "Target thread specification pitch, mm"
  ),
  coolant_pressure_bar: z.number().nonnegative().optional().describe(
    "Programmed coolant pressure, bar"
  ),
}).passthrough();

const toolZ = z.object({
  diameter_mm: z.number().positive().describe("Nominal tool diameter, mm"),
  flute_length_mm: z.number().positive().optional().describe("Flute length, mm"),
  overall_length_mm: z.number().positive().optional().describe("Tool overall length, mm"),
  stickout_mm: z.number().positive().optional().describe("Stickout / gauge length, mm"),
  type: z.enum([
    "ballnose", "barrel", "bullnose", "drill", "endmill",
    "face_mill", "other", "thread_mill",
  ]).describe("Tool type"),
  holder_body_diameter_mm: z.number().positive().optional().describe(
    "Holder body widest diameter, mm"
  ),
  holder_length_mm: z.number().positive().optional().describe(
    "Holder length below spindle face, mm"
  ),
}).passthrough();

const materialZ = z.object({
  iso_group: z.enum(["H", "K", "M", "N", "P", "S"]).describe(
    "ISO material group: P=Steel, M=Stainless, K=Cast Iron, N=Non-ferrous, S=Superalloy, H=Hardened"
  ),
  hardness_hrc: z.number().min(0).max(70).optional().describe("Material hardness, HRC"),
  name: z.string().optional().describe("Material name for context"),
}).passthrough();

const machineZ = z.object({
  type: z.enum([
    "3axis_horizontal", "3axis_vertical", "4axis", "5axis", "mill_turn", "other",
  ]).describe("CNC machine type"),
  rigidity_class: z.enum(["heavy", "light", "medium"]).optional().describe(
    "Machine rigidity class — affects Technology Wizard level limits"
  ),
  max_tilt_deg: z.number().min(0).max(180).optional().describe(
    "Maximum physical tilt axis limit in degrees (for 5-axis machines)"
  ),
  controller_name: z.string().optional().describe(
    "Target CNC controller name or family for GPP post compatibility check"
  ),
  max_rpm: z.number().positive().optional().describe("Machine maximum spindle speed, RPM"),
}).passthrough();

const strategyZ = z.object({
  name: z.string().optional().describe("Strategy name for contextual notes"),
}).passthrough().optional();

const operationBatchEntryZ = z.object({
  operation: operationZ.describe("SolidCAM operation parameters"),
  tool: toolZ.describe("Cutting tool and holder data"),
  material: materialZ.describe("Workpiece material"),
  machine: machineZ.describe("CNC machine configuration"),
  strategy: strategyZ.describe("Optional strategy metadata"),
});

// ── Action Schemas ─────────────────────────────────────────────────────────────

export const ACTION_SOLIDCAM_SAFETY_SCHEMAS: ActionSchemaMap = {
  solidcam_safety_validate: z.object({
    operation: operationZ.describe("SolidCAM operation to validate"),
    tool: toolZ.describe("Cutting tool and holder data"),
    material: materialZ.describe("Workpiece material"),
    machine: machineZ.describe("CNC machine configuration"),
    strategy: strategyZ,
  }),

  solidcam_safety_validate_all: z.object({
    operations: z.array(operationBatchEntryZ).min(1).max(50).describe(
      "Array of SolidCAM operation entries to validate in batch (max 50)"
    ),
  }),

  solidcam_safety_rules: z.object({}).passthrough(),
};
