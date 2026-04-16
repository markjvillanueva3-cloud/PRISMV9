/**
 * HM-REV-MS3 Action Schemas — Cycle Parameter Pipeline
 *
 * Zod schemas for the cam:hypermill_cycle_recommend action and related
 * HM-REV-MS3 actions wired in camDispatcher.
 *
 * HM-REV-MS3 / U-HMR16 + U-HMR17 + U-HMR18
 */

import { z } from "zod";

// ============================================================================
// Action schemas
// ============================================================================

export const ACTION_HM_REV_MS3_SCHEMAS: Record<string, z.ZodTypeAny> = {
  /**
   * Recommend a hyperMILL cycle type for a given feature geometry,
   * with factory defaults and controller adjustments.
   * Calls CycleParameterPipeline + SpeedFeedOrchestrator for physics-backed S/F.
   * U-HMR16 + U-HMR18
   */
  cam_hypermill_cycle_recommend: z.object({
    /**
     * Feature geometry type.
     * One of: "drill", "pocket", "3d_rough", "3d_finish", "5axis_swarf",
     * "thread", "2d_contour", "face", "slot"
     */
    feature_type: z
      .string()
      .min(1, "feature_type is required")
      .describe(
        "Feature geometry type: drill, pocket, 3d_rough, 3d_finish, 5axis_swarf, thread, 2d_contour, face, slot"
      ),
    /** Optional ISO material group (P/M/K/N/S/H) or material name */
    material: z.string().optional().describe("ISO material group or material name (e.g. '316L', '7075', 'P20')"),
    /** Optional controller family ID (e.g. 'fanuc', 'siemens_840d', 'heidenhain') */
    controller_id: z.string().optional().describe("Controller family ID: fanuc, siemens, heidenhain, haas, mazak, etc."),
    /** Feature depth in mm */
    depth_mm: z.number().positive().optional().describe("Feature depth in mm"),
    /** Tool or feature diameter in mm */
    diameter_mm: z.number().positive().optional().describe("Tool or feature diameter in mm"),
    /** Machining tolerance in mm (default: 0.01) */
    tolerance_mm: z.number().positive().optional().describe("Machining tolerance in mm (default 0.01)"),
    /** If true, also call SpeedFeedOrchestrator and return physics S/F alongside cycle data */
    include_speed_feed: z.boolean().optional().default(false).describe("Include SpeedFeedOrchestrator physics S/F in response"),
    /** If true, return the full validated cycle defaults (may be large) */
    include_full_defaults: z.boolean().optional().default(false).describe("Include full resolved factory defaults in response"),
  }),

  /**
   * Validate proposed cycle parameters against factory defaults.
   * Warns if >30% deviation; blocks if physically impossible.
   * U-HMR17
   */
  cam_hypermill_validate_cycle_defaults: z.object({
    /** Cycle code for context (e.g. "3D_Roughing", "Drilling") */
    cycle_code: z
      .string()
      .min(1, "cycle_code is required")
      .describe("Cycle code or name for context messages"),
    /** Proposed parameter values from programmer */
    proposed: z
      .record(z.string(), z.number())
      .describe("Proposed cycle parameters: { paramName: value, ... }"),
    /** Factory default values (from CycleDefaultsEngine or known defaults) */
    factory_defaults: z
      .record(z.string(), z.number())
      .describe("Factory default parameter values for comparison"),
  }),
};
