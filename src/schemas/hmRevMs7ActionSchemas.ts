/**
 * HM-REV-MS7 Action Schemas — Turning/Mill-Turn + Medical Domain
 *
 * Zod schemas for:
 *   cam_hypermill_millturn_strategy  — CSS/TNRC mill-turn strategy + C-axis sync
 *   cam_hypermill_dental_route       — Dental blank router (disc/block → strategy)
 *
 * HM-REV-MS7 / U-HMR38 + U-HMR39 + U-HMR40 + U-HMR41 + U-HMR42
 */

import { z } from "zod";

// ============================================================================
// Mill-Turn Geometry Types enum
// ============================================================================

const millTurnGeometryType = z.enum([
  "od_profile", "id_profile", "mt_face",
  "groove_od", "groove_id", "groove_face",
  "thread_od", "thread_id", "parting", "bore", "recess",
  "cross_hole", "cross_slot", "off_center_feature",
]).describe("Mill-turn geometry type: od_profile, id_profile, mt_face, groove_od, groove_id, groove_face, thread_od, thread_id, parting, bore, recess, cross_hole, cross_slot, off_center_feature");

// ============================================================================
// Action Schemas
// ============================================================================

export const ACTION_HM_REV_MS7_SCHEMAS: Record<string, z.ZodTypeAny> = {

  /**
   * Mill-turn strategy calculation with CSS/TNRC physics and C-axis sync.
   *
   * Validates G96 Constant Surface Speed against machine RPM limits,
   * selects the appropriate hyperMILL mill-turn cycle, and generates
   * C-axis synchronization for live-tool features.
   *
   * HM-REV-MS7 U-HMR38 + U-HMR39 + U-HMR40
   */
  cam_hypermill_millturn_strategy: z.object({
    /** Mill-turn geometry type (OD, ID, groove, thread, parting, bore, C-axis features) */
    geometry_type: millTurnGeometryType,

    /** Operation goal */
    operation_goal: z.enum(["roughing", "finishing", "semi_finishing"])
      .default("roughing")
      .describe("Operation goal: roughing, finishing, or semi_finishing"),

    /** ISO material group (P/M/K/N/S/H) or material name */
    material: z.string().optional().describe("ISO material group (P/M/K/N/S/H) or material name (e.g. '316L', 'Ti-6Al-4V', 'Inconel 718')"),

    /** Desired surface speed Vc [m/min] for G96 CSS check */
    vc_m_min: z.number().positive().optional().describe("Desired surface speed [m/min] for G96 CSS check"),

    /** Minimum machining diameter in this operation [mm] — worst-case RPM */
    min_diameter_mm: z.number().positive().optional().describe("Minimum machining diameter [mm] — determines worst-case RPM at this Vc"),

    /** Machine max spindle RPM (overrides registry lookup if provided) */
    machine_max_rpm: z.number().positive().optional().describe("Machine max spindle RPM — sourced from MachineRegistry if omitted, defaults to 6000"),

    /** Insert nose radius [mm] — used for TNRC decision */
    nose_radius_mm: z.number().positive().optional().describe("Insert nose radius [mm] — TNRC (G41/G42) required if > 0.2mm"),

    /** C-axis live-tool configuration (optional — for cross_hole, cross_slot, off_center_feature) */
    c_axis_config: z.object({
      sync_type: z.enum(["cross_hole", "cross_slot", "off_center_feature"]).describe("Live-tool sync type"),
      c_angle_deg: z.number().min(0).max(360).describe("C-axis angle [degrees]"),
      live_tool_rpm: z.number().positive().describe("Live tool spindle RPM"),
      live_tool_diameter_mm: z.number().positive().describe("Live tool diameter [mm]"),
      feature_count: z.number().int().positive().optional().default(1).describe("Number of equally-spaced features (e.g. 4 for a 4-hole pattern)"),
    }).optional().describe("C-axis live-tool configuration (required for cross_hole/cross_slot/off_center_feature)"),

    /** Multi-channel sync config (optional) */
    multi_channel_config: z.object({
      channel1_ops: z.array(z.string()).describe("Operations in channel 1 (main spindle)"),
      channel2_ops: z.array(z.string()).describe("Operations in channel 2 (sub-spindle/turret)"),
      controller_family: z.enum(["fanuc", "siemens", "mazak", "index", "citizen", "generic"]).optional().default("generic"),
      part_transfer_required: z.boolean().optional().default(false),
      bar_feed_sequencing: z.boolean().optional().default(false),
    }).optional().describe("Multi-channel synchronization configuration"),
  }),

  /**
   * Dental blank routing — maps blank type + material to hyperMILL dental strategy.
   *
   * Disc blanks use 3+2 positioning (A-axis); block blanks use 5-axis simultaneous.
   * Routes 4 dental materials: zirconia (green/sintered), PEEK, CoCr, Ti Grade 5.
   *
   * HM-REV-MS7 U-HMR42
   */
  cam_hypermill_dental_route: z.object({
    /** Dental blank type */
    blank_type: z.enum(["disc", "block", "puck"])
      .describe("Dental blank type: disc (A-axis 3+2), block/puck (5-axis simultaneous)"),

    /** Dental material */
    material: z.enum(["zirconia", "peek", "cocr", "titanium_gr5", "pmma", "composite"])
      .describe("Dental material: zirconia, peek, cocr, titanium_gr5, pmma, composite"),

    /** Dental restoration type */
    restoration_type: z.enum([
      "crown", "bridge", "abutment", "coping", "framework",
      "implant_bar", "denture_base", "inlay_onlay",
    ]).describe("Dental restoration type — influences strategy and fixturing"),

    /** Zirconia state (only for zirconia material) */
    zirconia_state: z.enum(["green", "sintered", "pre_sintered"])
      .optional()
      .describe("Zirconia state: green (soft, high speeds), pre_sintered, sintered (fully dense, lower speeds)"),

    /** Milling unit (disk vs wet/dry milling) */
    milling_unit: z.enum(["open_dry", "open_wet", "enclosed_wet", "5axis_dental"])
      .optional()
      .default("5axis_dental")
      .describe("Dental CAD/CAM milling unit type"),

    /** Required surface finish Ra [µm] — default 0.4 for crowns */
    required_ra_um: z.number().positive().optional().describe("Required surface finish Ra [µm] — implant abutments require Ra < 0.8"),
  }),
};
