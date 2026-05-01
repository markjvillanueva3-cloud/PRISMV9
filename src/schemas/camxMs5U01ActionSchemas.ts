/**
 * CAMX-MS5 U01 Action Schemas — Zod v4
 *
 * 5 dispatcher actions (NXCAMStrategyEngine E1104):
 *   nx_cam_recommend        — ranked NX CAM strategy recommendations
 *   nx_cam_parameters       — default parameters for a named strategy
 *   nx_cam_ipw              — IPW capability details
 *   nx_cam_fbm              — FBM feature-to-strategy mapping
 *   nx_cam_list_strategies  — list all strategies with optional category filter
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ── Action schemas ────────────────────────────────────────────────────────────

export const ACTION_CAMX_MS5_U01_SCHEMAS: ActionSchemaMap = {

  /**
   * Recommend ranked NX CAM strategies for a given feature/material/machine.
   * Returns top 5 strategies with confidence scores and warnings.
   */
  nx_cam_recommend: z.object({
    feature_type: z.enum([
      "blade", "bore", "cavity", "contour", "edge_deburr",
      "external_turning", "face", "flat_area", "freeform",
      "groove_turning", "impeller", "internal_turning", "pocket",
      "port", "rib", "slot", "steep_wall", "thread",
      "thread_turning", "tube",
    ]).describe(
      "Part feature type to machine"
    ),
    material_group: z.enum(["H", "K", "M", "N", "P", "S"]).optional().describe(
      "ISO material group: P=steel, M=stainless, K=cast iron, N=non-ferrous, S=superalloy, H=hardened"
    ),
    machine_type: z.enum([
      "3_axis", "4_axis", "5_axis", "lathe", "mill_turn",
    ]).optional().default("3_axis").describe(
      "Machine configuration. Default 3_axis"
    ),
    tool_diameter_mm: z.number().positive().optional().describe(
      "Tool diameter in mm. Used for ae/ap factor calculations"
    ),
    wall_angle_deg: z.number().min(0).max(90).optional().describe(
      "Dominant wall angle in degrees (0=flat, 90=vertical). Affects strategy selection for steep vs flat areas"
    ),
    pocket_depth_mm: z.number().positive().optional().describe(
      "Pocket/cavity depth in mm. Deeper cavities favor plunge milling"
    ),
    has_previous_roughing: z.boolean().optional().default(false).describe(
      "Whether a prior roughing operation exists (required for rest milling)"
    ),
    tolerance_mm: z.number().positive().optional().describe(
      "Part tolerance (bilateral +/-) in mm. Tight tolerances boost finishing strategies"
    ),
    priority: z.enum([
      "balanced", "cost", "quality", "speed", "tool_life",
    ]).optional().default("balanced").describe(
      "Optimization priority. Default balanced"
    ),
  }),

  /**
   * Get default cutting parameters for a named NX CAM strategy.
   * Returns ae%, ap%, fz range, Vc range, coolant, and engagement settings.
   */
  nx_cam_parameters: z.object({
    strategy_name: z.string().min(1).describe(
      "Strategy name, e.g. 'Cavity Mill', 'Adaptive Milling', 'Blade Milling'"
    ),
  }),

  /**
   * Return all IPW (In-Process Workpiece) capabilities and details.
   * No parameters required.
   */
  nx_cam_ipw: z.object({}).passthrough(),

  /**
   * Get FBM (Feature-Based Machining) mapping for a feature type.
   * Returns auto-assigned strategy, operation sequence, and MKE availability.
   */
  nx_cam_fbm: z.object({
    feature_type: z.string().min(1).describe(
      "Feature type to look up, e.g. 'pocket', 'bore', 'thread', 'impeller'"
    ),
  }),

  /**
   * List all available NX CAM strategies, optionally filtered by category.
   */
  nx_cam_list_strategies: z.object({
    category: z.enum([
      "finishing", "hole_making", "milling", "multi_axis", "roughing", "turning",
    ]).optional().describe(
      "Filter by strategy category. Omit to list all strategies"
    ),
  }),
};
