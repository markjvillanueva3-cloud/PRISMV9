/**
 * SolidCAMStrategyEngine — Dedicated SolidCAM Strategy Recommendation Engine
 *
 * Comprehensive SolidCAM 2024/2025 toolpath strategy database covering 35+
 * strategies across iMachining, HSR, HSS, 2.5D, Drilling, 5-Axis, and Turning.
 * Each strategy includes physics-backed parameter defaults, performance
 * ratings, material notes, and unique advantages.
 *
 * Methods:
 *   recommend(feature, material, machine, tool, priority)  — ranked strategies
 *   getParameters(strategy_name)                           — default parameters
 *   iMachiningDetails()                                    — iMachining Technology deep-dive
 *   hssDetails()                                           — HSS finishing deep-dive
 *   listStrategies(category?)                              — all strategies or filtered by category
 *
 * @engine SolidCAMStrategyEngine
 * @shortcode E1106
 * @dispatcher camDispatcher
 * @actions solidcam_strategy_recommend, solidcam_strategy_params, solidcam_imachining_details, solidcam_hss_details, solidcam_strategy_list
 * @milestone CAMX-MS3/U02
 */
export type SolidCAMCategory = "imachining" | "hsr" | "hss" | "two_five_d" | "drilling" | "five_axis" | "turning";
export type SolidCAMPriority = "cycle_time" | "tool_life" | "surface_finish" | "balanced";
export interface SolidCAMFeature {
    /** Feature type */
    type: "pocket" | "contour" | "slot" | "face" | "bore" | "freeform_3d" | "steep_wall" | "flat_area" | "groove" | "thread" | "turning_external" | "turning_internal" | "hole" | "impeller" | "ruled_surface" | "chamfer" | "engrave";
    /** Depth in mm */
    depth_mm?: number;
    /** Wall angle in degrees (0 = flat, 90 = vertical) */
    wall_angle_deg?: number;
    /** Whether previous roughing has been done */
    has_previous_roughing?: boolean;
    /** Number of axes available */
    axis_count?: 3 | 4 | 5;
}
export interface SolidCAMMaterial {
    /** ISO material group */
    iso_group: "P" | "M" | "K" | "N" | "S" | "H";
    /** Hardness HRC (optional, influences strategy selection) */
    hardness_hrc?: number;
    /** Material name for notes lookup */
    name?: string;
}
export interface SolidCAMMachine {
    /** Machine type */
    type: "3axis_vertical" | "3axis_