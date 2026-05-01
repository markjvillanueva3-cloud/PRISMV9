/**
 * HM-REV-MS2 Action Schemas — Material Bridge + PPP Default Path
 *
 * Zod schemas for the cam:hypermill_material_to_physics action and related
 * HM-REV-MS2 actions wired in camDispatcher.
 *
 * HM-REV-MS2 / U-HMR11 + U-HMR12 + U-HMR13 + U-HMR14 + U-HMR15
 */

import { z } from "zod";

// ============================================================================
// Action schemas
// ============================================================================

export const ACTION_HM_REV_MS2_SCHEMAS: Record<string, z.ZodTypeAny> = {
  /**
   * Resolve any hyperMILL material name to Kienzle physics parameters.
   * Chain: material name → BridgeEngine fuzzy match → ISO group → kc1.1.
   * U-HMR11
   */
  cam_hypermill_material_to_physics: z.object({
    /** Material name, Werkstoff number, AISI code, trade name, etc. */
    material: z.string().min(1, "material is required"),
    /** If true, also run the safety gate and include gate result. */
    include_gate: z.boolean().optional().default(false),
  }),

  /**
   * Resolve a hyperMILL quality ID to SpeedFeedOrchestrator input params.
   * U-HMR12
   */
  cam_hypermill_material_to_orchestrator: z.object({
    /** hyperMILL quality ID (e.g. "1_6_4") or free-text material name. */
    quality_id_or_name: z.string().min(1, "quality_id_or_name is required"),
  }),

  /**
   * Compare PRISM physics-computed Vc against hypermill-cutting-tech.json
   * catalog for a given material. Flags >20% deviation.
   * U-HMR13
   */
  cam_hypermill_calibration_compare: z.object({
    /** Material name to look up in cutting-tech catalog. */
    material: z.string().min(1, "material is required"),
    /** Tool diameter [mm] used for fz reference. Default: 10. */
    tool_diameter_mm: z.number().positive().optional().default(10),
  }),

  /**
   * Get the default PPP (Post-Process Pipeline) configuration for hyperMILL.
   * Optionally resolve G-code dialect from controller ID.
   * U-HMR14
   */
  cam_hypermill_ppp_defaults: z.object({
    /** Optional controller family ID (e.g. "fanuc_0i", "siemens_840d"). */
    controller_id: z.string().optional(),
    /** Partial overrides for the returned config. */
    optimize_for: z.enum(["balanced", "tool_life", "productivity"]).optional(),
    output_annotated: z.boolean().optional(),
    preserve_rapids: z.boolean().optional(),
    five_axis: z.boolean().optional(),
  }),

  /**
   * Register hyperMILL strategies into the ToolpathStrategyRegistry and
   * return the registered strategies list.
   * U-HMR15
   */
  cam_hypermill_register_strategies: z.object({
    /** If true, return all registered hyperMILL strategies; otherwise just count. */
    return_list: z.boolean().optional().default(true),
  }),
};
