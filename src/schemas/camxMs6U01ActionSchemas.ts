/**
 * CAMX-MS6 U01 Action Schemas — Zod v4
 *
 * 5 dispatcher actions (PowerMillStrategyEngine E1105):
 *   pm_recommend              — ranked PowerMill strategy recommendations
 *   pm_parameters             — default parameters for a named strategy
 *   pm_vortex_details         — Vortex roughing technology details
 *   pm_steep_shallow_details  — Steep & Shallow finishing technology details
 *   pm_list_strategies        — list all strategies with optional category filter
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS6_U01_SCHEMAS: ActionSchemaMap = {

  /**
   * Recommend ranked PowerMill strategies for a given feature, material, and machine.
   * Returns top 5 strategies with confidence scores, parameters, and warnings.
   */
  pm_recommend: z.object({
    feature_type: z.enum([
      "blade", "blend_radius", "bore", "bulkhead", "cavity", "contour",
      "corner", "face", "flat_area", "freeform", "impeller",
      "mold_cavity", "mold_core", "pocket", "port", "rib",
      "ruled_surface", "slot", "steep_wall", "wing_spar",
    ]).describe(
      "Part feature type to machine"
    ),
    material_group: z.enum(["H", "K", "M", "N", "P", "S"]).optional().describe(
      "ISO material group: P=steel, M=stainless, K=cast iron, N=non-ferrous, S=superalloy, H=hardened"
    ),
    machine_type: z.enum([
      "3_axis", "3_plus_2", "4_axis", "5_axis_continuous", "mill_turn",
    ]).optional().default("3_axis").describe(
      "Machine configuration. Default 3_axis"
    ),
    tool_diameter_mm: z.number().positive().optional().describe(
      "Tool diameter in mm — used for ae/ap factor calculations"
    ),
    wall_angle_deg: z.number().min(0).max(90).optional().describe(
      "Dominant wall angle in degrees (0=flat, 90=vertical). Influences steep vs shallow strategy selection"
    ),
    pocket_depth_mm: z.number().positive().optional().describe(
      "Pocket or cavity depth in mm. Deep pockets (>50 mm) favour Vortex and Plunge Roughing"
    ),
    has_previous_roughing: z.boolean().optional().default(false).describe(
      "Whether a prior roughing operation exists (required for Rest Roughing)"
    ),
    tolerance_mm: z.number().positive().optional().describe(
      "Part tolerance (bilateral +/-) in mm. Tight tolerances boost finishing strategies"
    ),
    priority: z.enum([
      "balanced", "quality", "speed", "tool_life",
    ]).optional().default("balanced").describe(
      "Optimization priority. Default balanced"
    ),
    enable_viewmill: z.boolean().optional().default(false).describe(
      "Request a ViewMill simulation note in the recommendations"
    ),
  }),

  /**
   * Get default cutting parameters for a named PowerMill strategy.
   * Returns ae%, ap%, fz range, Vc range, coolant, and engagement settings.
   */
  pm_parameters: z.object({
    strategy_name: z.string().min(1).describe(
      "Strategy name, e.g. 'Vortex', 'Steep and Shallow Finishing', 'Swarf Finishing'"
    ),
  }),

  /**
   * Return Vortex roughing technology details: engagement parameters, benefits,
   * ideal applications, limitations, and key parameter descriptions.
   * No parameters required.
   */
  pm_vortex_details: z.object({}).passthrough(),

  /**
   * Return Steep & Shallow finishing technology details: threshold angles,
   * sub-strategy assignments, transition handling, and parameter descriptions.
   * No parameters required.
   */
  pm_steep_shallow_details: z.object({}).passthrough(),

  /**
   * List all available PowerMill strategies, optionally filtered by category.
   */
  pm_list_strategies: z.object({
    category: z.enum([
      "drilling", "finishing", "multi_axis", "roughing",
    ]).optional().describe(
      "Filter by strategy category. Omit to list all strategies"
    ),
  }),
};
