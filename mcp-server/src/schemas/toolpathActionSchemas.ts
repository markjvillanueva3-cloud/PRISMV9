/**
 * Toolpath Dispatcher Action Schemas
 * ====================================
 * Per-action Zod schemas for prism_toolpath actions (9 actions).
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * Design:
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the engine/handler actually reads
 * - Aliases resolved by normalizeParams BEFORE validation
 *
 * Actions: strategy_select, params_calculate, strategy_search, strategy_list,
 *          strategy_info, stats, material_strategies, prism_novel, generate
 *
 * @module schemas/toolpathActionSchemas
 * @version 1.0.0
 * @milestone SYS-MS6-U03
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELDS
// ============================================================================

const optStr = z.string().optional();
const optPosNum = z.number().positive().optional();
const optPosInt = z.number().int().positive().optional();

// ============================================================================
// STRATEGY SELECTION (1)
// ============================================================================

const strategy_select = z.object({
  feature_type: z.string().min(1),
  material: z.string().min(1),
  operation: z.enum(["roughing", "finishing"]),
  priority: z.enum(["time", "quality", "tool_life", "balanced"]).optional(),
  cam_software: optStr,
  axes: z.enum(["2D", "2.5D", "3D", "4D", "5D"]).optional(),
}).passthrough();

// ============================================================================
// PARAMS CALCULATE (1)
// ============================================================================

const params_calculate = z.object({
  strategy_id: z.string().min(1),
  tool_diameter: z.number().positive(),
  material: z.string().min(1),
  operation: z.enum(["roughing", "finishing"]).optional(),
}).passthrough();

// ============================================================================
// STRATEGY SEARCH (1)
// ============================================================================

const strategy_search = z.object({
  keyword: z.string().min(1),
  category: optStr,
  material: optStr,
  limit: optPosInt,
}).passthrough();

// ============================================================================
// STRATEGY LIST (1)
// ============================================================================

const strategy_list = z.object({
  category: z.enum([
    "milling_roughing", "milling_finishing", "hole_making",
    "turning", "multiaxis", "prism_novel",
  ]),
  subcategory: optStr,
}).passthrough();

// ============================================================================
// STRATEGY INFO (1)
// ============================================================================

const strategy_info = z.object({
  strategy_id: z.string().min(1),
}).passthrough();

// ============================================================================
// STATS (1) — no required params
// ============================================================================

const stats = z.object({}).passthrough();

// ============================================================================
// MATERIAL STRATEGIES (1)
// ============================================================================

const material_strategies = z.object({
  material: z.string().min(1),
  operation: z.enum(["roughing", "finishing", "both"]).optional(),
}).passthrough();

// ============================================================================
// PRISM NOVEL (1)
// ============================================================================

const prism_novel = z.object({
  subcategory: z.enum(["ai", "hybrid", "physics", "optimization", "specialized"]).optional(),
}).passthrough();

// ============================================================================
// GENERATE (1) — ToolpathGenerationEngine.generate()
// ============================================================================

const generate = z.object({
  feature_type: optStr,
  // Dimensions
  width_mm: optPosNum,
  length_mm: optPosNum,
  depth_mm: optPosNum,
  diameter_mm: optPosNum,
  // Toolpath params
  strategy: optStr,
  tool_diameter_mm: optPosNum,
  stepover_pct: z.number().min(0).max(100).optional(),
  stepdown_mm: optPosNum,
  feed_rate_mmmin: optPosNum,
  plunge_rate_mmmin: optPosNum,
  spindle_rpm: optPosNum,
  cut_direction: z.enum(["climb", "conventional", "both"]).optional(),
  coolant: z.enum(["flood", "mist", "air", "none"]).optional(),
  retract_height_mm: optPosNum,
  stock_to_leave_mm: z.number().min(0).optional(),
  entry_strategy: z.enum(["helix", "ramp", "plunge", "pre_drill"]).optional(),
}).passthrough();

// ============================================================================
// ALGORITHM SELECT (1) — AlgorithmSelectorEngine [CAMK-MS0/U02]
// ============================================================================

const algorithm_select = z.object({
  zone_type: z.enum([
    "flat", "steep_wall", "freeform", "pocket", "corner",
    "rib", "undercut", "boss", "shallow", "hole",
  ]),
  material: z.string().min(1),
  priority: z.enum([
    "speed", "quality", "tool_life", "balanced",
    "cost", "reliability", "surface_finish",
  ]).optional(),
  machine: z.object({
    axes: z.enum(["3", "4", "5"]).transform(Number),
    max_rpm: z.number().positive(),
    max_feed_mmmin: z.number().positive(),
    has_through_spindle_coolant: z.boolean().optional(),
    has_high_pressure_coolant: z.boolean().optional(),
    spindle_power_kw: z.number().positive().optional(),
    rigidity: z.enum(["low", "medium", "high"]).optional(),
  }).optional(),
  depth_ratio: z.number().positive().optional(),
  wall_thickness_mm: z.number().positive().optional(),
  target_ra_um: z.number().positive().optional(),
}).passthrough();

// ============================================================================
// FEATURE TO ZONE (1) — FeatureToZoneEngine [CAMK-MS0/U01]
// ============================================================================

const feature_to_zone = z.object({
  features: z.array(z.object({
    id: z.string().min(1),
    type: z.enum([
      "pocket", "slot", "boss", "hole", "freeform_surface",
      "planar_face", "chamfer", "fillet", "rib", "thin_wall",
      "stepped_pocket", "contour",
    ]),
    dims: z.object({
      length_mm: z.number().positive().optional(),
      width_mm: z.number().positive().optional(),
      depth_mm: z.number().positive().optional(),
      diameter_mm: z.number().positive().optional(),
      height_mm: z.number().positive().optional(),
    }),
    wall_angles_deg: z.array(z.number()).optional(),
    corner_radii_mm: z.array(z.number().positive()).optional(),
    curvature: z.object({
      min_radius_mm: z.number().positive().optional(),
      max_radius_mm: z.number().positive().optional(),
      avg_radius_mm: z.number().positive().optional(),
      type: z.enum(["convex", "concave", "saddle", "flat"]).optional(),
    }).optional(),
    floor: z.enum(["flat", "curved", "stepped"]).optional(),
    accessible_from: z.array(z.enum(["+Z", "-Z", "+X", "-X", "+Y", "-Y"])).optional(),
    tolerance_mm: z.number().positive().optional(),
    target_ra_um: z.number().positive().optional(),
  })).min(1),
  output_format: z.enum(["unified", "mthzd", "macs"]).optional(),
}).passthrough();

// ============================================================================
// EXPORT: ACTION_TOOLPATH_SCHEMAS
// ============================================================================

/** A C T I O N_ T O O L P A T H_ S C H E M A S constant.
 */
export const ACTION_TOOLPATH_SCHEMAS: ActionSchemaMap = {
  // Strategy selection & params
  strategy_select,
  params_calculate,
  // Strategy discovery
  strategy_search,
  strategy_list,
  strategy_info,
  // Registry stats
  stats,
  // Material-specific
  material_strategies,
  // PRISM novel
  prism_novel,
  // Generation engine
  generate,
  // Feature-to-zone decomposition [CAMK-MS0/U01]
  feature_to_zone,
  // Algorithm selection [CAMK-MS0/U02]
  algorithm_select,
};
