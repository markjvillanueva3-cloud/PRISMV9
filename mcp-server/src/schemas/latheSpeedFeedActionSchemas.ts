/**
 * Lathe Speed & Feed Dispatcher Action Schemas
 * =============================================
 * Per-action Zod schemas for lathe speed/feed calculation actions
 * wired through camDispatcher.
 *
 * Actions:
 *   lathe_sf_calculate   — Base physics calculation
 *   lathe_sf_advise      — Deep learning recommendation
 *   lathe_sf_whatif      — What-if reasoning analysis
 *   lathe_sf_cite_sources — Cite standards and formulas
 *   lathe_sf_explain     — Audience-tailored explanation
 *   lathe_sf_full        — Full orchestration pipeline
 *
 * @module schemas/latheSpeedFeedActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ─── Shared schemas ───────────────────────────────────────────────────────

const materialSchema = z
  .string()
  .min(1)
  .describe("Material designation (e.g. '4140', '316L', 'Ti-6Al-4V').");

const isoGroupSchema = z
  .enum(["P", "M", "K", "N", "S", "H"])
  .optional()
  .describe("ISO 513 material classification. Auto-detected if omitted.");

const toolSchema = z
  .object({
    type: z
      .string()
      .optional()
      .describe("Tool type (e.g. 'turning_insert', 'drill', 'boring_bar')."),
    grade: z.string().optional().describe("Carbide grade (e.g. 'GC4325')."),
    geometry: z.string().optional().describe("Insert geometry code."),
    nose_radius_mm: z.number().positive().optional(),
    lead_angle_deg: z.number().optional(),
    coating: z.string().optional(),
  })
  .passthrough()
  .optional();

const operationSchema = z
  .object({
    type: z
      .enum(["roughing", "finishing", "semi_finishing", "grooving", "threading", "parting", "boring"])
      .optional()
      .describe("Operation type. Default: roughing."),
    target_ra_um: z.number().positive().optional().describe("Target surface finish Ra (μm)."),
    depth_of_cut_mm: z.number().positive().optional(),
    approach_angle_deg: z.number().optional(),
  })
  .passthrough()
  .optional();

const machineSchema = z
  .object({
    max_power_kw: z.number().positive().optional(),
    max_rpm: z.number().int().positive().optional(),
    spindle_type: z.enum(["belt", "gear", "direct"]).optional(),
    rigidity: z.enum(["low", "medium", "high"]).optional(),
  })
  .passthrough()
  .optional();

const workpieceSchema = z
  .object({
    diameter_mm: z.number().positive().optional(),
    length_mm: z.number().positive().optional(),
    wall_thickness_mm: z.number().positive().optional(),
    hardness_hrc: z.number().optional(),
  })
  .passthrough()
  .optional();

const strategySchema = z
  .enum(["conservative", "balanced", "aggressive", "maximize_mrr", "maximize_tool_life"])
  .optional()
  .describe("Cutting strategy. Default: balanced.");

// ─── lathe_sf_calculate ───────────────────────────────────────────────────

const lathe_sf_calculate = z
  .object({
    material: materialSchema,
    iso_group: isoGroupSchema,
    tool: toolSchema,
    operation: operationSchema,
    machine: machineSchema,
    workpiece: workpieceSchema,
    strategy: strategySchema,
  })
  .passthrough();

// ─── lathe_sf_advise ──────────────────────────────────────────────────────

const lathe_sf_advise = z
  .object({
    material: materialSchema,
    iso_group: isoGroupSchema,
    tool: toolSchema,
    operation: operationSchema,
    machine: machineSchema,
    workpiece: workpieceSchema,
    strategy: strategySchema,
    prior_outcomes: z
      .array(
        z.object({
          speed: z.number(),
          feed: z.number(),
          result: z.enum(["good", "poor_finish", "chatter", "tool_wear", "overload"]),
        }),
      )
      .optional()
      .describe("Historical outcomes for adaptive recommendation."),
  })
  .passthrough();

// ─── lathe_sf_whatif ──────────────────────────────────────────────────────

const lathe_sf_whatif = z
  .object({
    material: materialSchema,
    tool: toolSchema,
    operation: operationSchema,
    base_speed: z.number().positive().describe("Current cutting speed (m/min)."),
    base_feed: z.number().positive().describe("Current feed (mm/rev)."),
    delta_speed_pct: z.number().optional().describe("Speed change % to analyze."),
    delta_feed_pct: z.number().optional().describe("Feed change % to analyze."),
    scenarios: z
      .array(z.string())
      .optional()
      .describe("Specific scenarios to analyze (e.g. 'increase_speed_20%')."),
  })
  .passthrough();

// ─── lathe_sf_cite_sources ────────────────────────────────────────────────

const lathe_sf_cite_sources = z
  .object({
    material: materialSchema,
    include_formulas: z
      .boolean()
      .optional()
      .describe("Include formula definitions (Kienzle, Taylor, Ra). Default: false."),
    include_standards: z
      .boolean()
      .optional()
      .describe("Include ISO/ANSI standard references. Default: false."),
  })
  .passthrough();

// ─── lathe_sf_explain ─────────────────────────────────────────────────────

const lathe_sf_explain = z
  .object({
    material: materialSchema,
    tool: toolSchema,
    operation: operationSchema,
    strategy: strategySchema,
    target_audience: z
      .enum(["machinist", "engineer", "beginner"])
      .optional()
      .describe("Explanation detail level. Default: machinist."),
  })
  .passthrough();

// ─── lathe_sf_full ────────────────────────────────────────────────────────

const lathe_sf_full = z
  .object({
    material: materialSchema,
    iso_group: isoGroupSchema,
    tool: toolSchema,
    operation: operationSchema,
    machine: machineSchema,
    workpiece: workpieceSchema,
    strategy: strategySchema,
    shop_profile_id: z
      .string()
      .optional()
      .describe("Shop profile ID for shop-aware tuning (e.g. 'jm-die')."),
    include_reasoning: z
      .boolean()
      .optional()
      .describe("Include reasoning chain. Default: true."),
    include_alternatives: z
      .boolean()
      .optional()
      .describe("Include alternative recommendations. Default: false."),
  })
  .passthrough();

// ─── Export map ───────────────────────────────────────────────────────────

export const ACTION_LATHE_SF_SCHEMAS: ActionSchemaMap = {
  lathe_sf_calculate,
  lathe_sf_advise,
  lathe_sf_whatif,
  lathe_sf_cite_sources,
  lathe_sf_explain,
  lathe_sf_full,
};
