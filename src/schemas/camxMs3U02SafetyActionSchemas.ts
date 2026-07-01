/**
 * CAMX-MS3 U02 Safety Action Schemas — Zod v4
 *
 * 3 dispatcher actions (MastercamSafetyHooksEngine E1113):
 *   mastercam_safety_validate      — validate a single operation against 15 safety rules
 *   mastercam_safety_validate_all  — validate a batch of operations
 *   mastercam_safety_rules         — list all safety rules with descriptions
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Shared sub-schemas ─────────────────────────────────────────────────────────

const operationTypeZ = z.enum([
  "bore", "contour", "drill", "dynamic_mill", "face",
  "multiaxis", "optirough", "other", "peel_mill",
  "pocket", "surface_finish", "thread_mill",
]).describe("Mastercam toolpath / operation type");

const operationZ = z.object({
  name: z.string().optional().describe("Operation label for reporting"),
  type: operationTypeZ,
  cut_direction: z.enum(["climb", "conventional", "mixed"]).optional().describe(
    "Programmed cut direction (climb = preferred for most strategies)"
  ),
  has_containment_boundary: z.boolean().optional().describe(
    "Whether a containment boundary is defined for the operation"
  ),
  containment_encloses_stock_and_fixture: z.boolean().optional().describe(
    "Whether the containment boundary fully encloses stock + fixture + clamps"
  ),
  stock_model_is_current: z.boolean().optional().describe(
    "Whether the in-process stock model has been regenerated for this operation"
  ),
  retract_height_z_mm: z.number().optional().describe("Retract height absolute Z, mm"),
  stock_top_z_mm: z.number().optional().describe("Highest Z of stock surface, mm"),
  fixture_top_z_mm: z.number().optional().describe("Highest Z of fixture or clamp body, mm"),
  rapid_height_z_mm: z.number().optional().describe("Rapid clearance height absolute Z, mm"),
  feature_depth_mm: z.number().positive().optional().describe("Machined feature depth, mm"),
  feed_entry: z.number().positive().optional().describe("Entry feed rate, mm/min"),
  feed_cutting: z.number().positive().optional().describe("Full cutting feed rate, mm/min"),
  dynamic_engagement_deg: z.number().min(0).max(180).optional().describe(
    "Dynamic Motion max engagement angle, degrees"
  ),
  optirough_stepdown_mm: z.number().positive().optional().describe("OptiRough step-down per pass, mm"),
  through_tool_coolant: z.boolean().optional().describe("Whether through-tool coolant is selected"),
  coolant_pressure_bar: z.number().nonnegative().optional().describe("Programmed coolant pressure, bar"),
  rpm: z.number().positive().optional().describe("Programmed spindle speed, RPM"),
  thread_pitch_mm: z.number().positive().optional().describe("Thread mill helix pitch, mm"),
  thread_spec_pitch_mm: z.number().positive().optional().describe("Target thread specification pitch, mm"),
  peel_ae_mm: z.number().positive().optional().describe("Peel mill radial engagement (ae), mm"),
  five_axis_active: z.boolean().optional().describe("Whether 5-axis or tilted-tool-axis control is active"),
}).passthrough();

const toolZ = z.object({
  diameter_mm: z.number().positive().describe("Nominal tool diameter, mm"),
  overall_length_mm: z.number().positive().describe("Tool overall length, mm"),
  stickout_mm: z.number().positive().describe("Stickout / gauge length, mm"),
  flute_length_mm: z.number().positive().optional().describe("Flute length, mm"),
  type: z.enum([
    "ballnose", "barrel", "bullnose", "drill", "endmill",
    "face_mill", "lens", "other", "peel_mill", "thread_mill", "turning_insert",
  ]).describe("Tool type"),
  holder_balance_rpm: z.number().positive().optional().describe(
    "Holder balance rating in RPM (G2.5 or G6.3 rating)"
  ),
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
}).passthrough();

const machineZ = z.object({
  type: z.enum([
    "3axis_horizontal", "3axis_vertical", "4axis", "5axis", "mill_turn", "other",
  ]).describe("CNC machine type"),
  max_rpm: z.number().positive().optional().describe("Machine max spindle speed, RPM"),
  coolant_pressure_bar: z.number().nonnegative().optional().describe(
    "Machine available coolant pressure, bar"
  ),
}).passthrough();

const strategyZ = z.object({
  name: z.string().optional().describe("Strategy name for contextual notes"),
}).passthrough().optional();

const operationBatchEntryZ = z.object({
  operation: operationZ.describe("Operation parameters"),
  tool: toolZ.describe("Cutting tool and holder data"),
  material: materialZ.describe("Workpiece material"),
  machine: machineZ.describe("CNC machine"),
  strategy: strategyZ.describe("Optional strategy metadata"),
});

// ── Action Schemas ─────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS3_U02_SAFETY_SCHEMAS: ActionSchemaMap = {
  mastercam_safety_validate: z.object({
    operation: operationZ.describe("Mastercam operation to validate"),
    tool: toolZ.describe("Cutting tool and holder data"),
    material: materialZ.describe("Workpiece material"),
    machine: machineZ.describe("CNC machine configuration"),
    strategy: strategyZ,
  }),

  mastercam_safety_validate_all: z.object({
    operations: z.array(operationBatchEntryZ).min(1).max(50).describe(
      "Array of operation entries to validate in batch (max 50)"
    ),
  }),

  mastercam_safety_rules: z.object({}).passthrough(),
};
