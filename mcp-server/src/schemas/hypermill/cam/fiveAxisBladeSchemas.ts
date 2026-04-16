/**
 * 5-Axis Blade/Impeller Cycle Parameter Schemas — hyperMILL CAM 5-Axis
 *
 * U-HKC24: Zod schemas for 15 blade/impeller cycle types used in hyperMILL
 * 5-axis simultaneous machining. Each cycle schema defines geometry, tolerance,
 * and strategy parameters specific to turbomachinery component manufacturing.
 * DFM-critical parameters are tagged in metadata for downstream validation.
 *
 * AC Python call pattern:
 *   hm.5x.blade.blade_rough(hub_surface="S1", shroud_surface="S2", blade_count=12, ...)
 *
 * @domain CAM-5Axis-Blade
 * @milestone HM-KC-MS4/U-HKC24
 */

import { z } from "zod";

// ── 1. Blade Rough (9 params) ─────────────────────────────────────────────

export const bladeRoughSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the bladed disk or impeller"),
  channel_type: z
    .enum(["open", "closed", "semi_open"])
    .describe("Channel type classification for DFM strategy selection (DFM-critical)"),
  roughing_allowance: z
    .number()
    .min(0.01)
    .max(20)
    .describe("Stock allowance left after roughing on blade surfaces, mm"),
  hub_offset: z
    .number()
    .min(-10)
    .max(20)
    .describe("Additional offset from hub surface during roughing, mm"),
  shroud_offset: z
    .number()
    .min(-10)
    .max(20)
    .describe("Additional offset from shroud surface during roughing, mm"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade roughing: machine all channels in one operation"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Roughing cut pattern strategy for material removal"),
});

export type BladeRough = z.infer<typeof bladeRoughSchema>;

// ── 2. Blade Semi-Finish (9 params) ───────────────────────────────────────

export const bladeSemiFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the bladed disk or impeller"),
  channel_type: z
    .enum(["open", "closed", "semi_open"])
    .describe("Channel type classification for strategy selection"),
  semi_finish_allowance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Remaining stock allowance after semi-finishing, mm"),
  blending_passes: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Number of blending passes for smooth transition between rough and finish zones"),
  transition_zone: z
    .number()
    .min(0.1)
    .max(50)
    .describe("Width of the transition zone between blade regions, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Semi-finish cut pattern strategy"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade semi-finishing across all channels"),
});

export type BladeSemiFinish = z.infer<typeof bladeSemiFinishSchema>;

// ── 3. Blade Hub Finish (9 params) ────────────────────────────────────────

export const bladeHubFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the bladed disk or impeller"),
  hub_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Surface tolerance for hub finishing, mm"),
  hub_stepover: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Stepover distance for hub finishing passes, mm"),
  hub_cusp_height: z
    .number()
    .min(0.0005)
    .max(0.5)
    .describe("Target cusp height on hub surface, mm"),
  channel_type: z
    .enum(["open", "closed", "semi_open"])
    .describe("Channel type for hub finishing strategy selection"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Hub finishing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade hub finishing"),
});

export type BladeHubFinish = z.infer<typeof bladeHubFinishSchema>;

// ── 4. Blade Finish (10 params) ───────────────────────────────────────────

export const bladeFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the bladed disk or impeller"),
  blade_stepover: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Stepover distance for blade finishing passes, mm"),
  blade_cusp_height: z
    .number()
    .min(0.0005)
    .max(0.5)
    .describe("Target cusp height on blade surface (DFM-critical: affects aerodynamic quality), mm"),
  tip_clearance: z
    .number()
    .min(0)
    .max(20)
    .describe("Clearance distance from blade tip during finishing, mm"),
  root_blend: z
    .number()
    .min(0)
    .max(20)
    .describe("Blend radius at blade root fillet, mm"),
  channel_type: z
    .enum(["open", "closed", "semi_open"])
    .describe("Channel type for blade finishing strategy selection"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Blade finishing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade finishing across all channels"),
});

export type BladeFinish = z.infer<typeof bladeFinishSchema>;

// ── 5. Blade Leading Edge (9 params) ──────────────────────────────────────

export const bladeLeadingEdgeSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the bladed disk or impeller"),
  le_radius: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Leading edge blend radius, mm"),
  le_passes: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Number of finishing passes along the leading edge"),
  le_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Surface tolerance for leading edge finishing, mm"),
  channel_type: z
    .enum(["open", "closed", "semi_open"])
    .describe("Channel type for leading edge strategy selection"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Leading edge cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade leading edge finishing"),
});

export type BladeLeadingEdge = z.infer<typeof bladeLeadingEdgeSchema>;

// ── 6. Blade Trailing Edge (9 params) ─────────────────────────────────────

export const bladeTrailingEdgeSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the bladed disk or impeller"),
  te_radius: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Trailing edge blend radius, mm"),
  te_passes: z
    .number()
    .int()
    .min(1)
    .max(100)
    .describe("Number of finishing passes along the trailing edge"),
  te_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Surface tolerance for trailing edge finishing, mm"),
  channel_type: z
    .enum(["open", "closed", "semi_open"])
    .describe("Channel type for trailing edge strategy selection"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Trailing edge cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade trailing edge finishing"),
});

export type BladeTrailingEdge = z.infer<typeof bladeTrailingEdgeSchema>;

// ── 7. Impeller Rough (9 params) ──────────────────────────────────────────

export const impellerRoughSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller shroud surface geometry"),
  channel_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of flow channels in the impeller"),
  splitter_flag: z
    .boolean()
    .describe("Whether the impeller has splitter blades"),
  splitter_count: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(0)
    .describe("Number of splitter blades per channel (0 if no splitters)"),
  approach_mode: z
    .enum(["helical", "plunge", "ramp"])
    .describe("Tool approach mode for impeller roughing entry"),
  roughing_allowance: z
    .number()
    .min(0.01)
    .max(20)
    .describe("Stock allowance after roughing, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Impeller roughing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-channel roughing in one operation"),
});

export type ImpellerRough = z.infer<typeof impellerRoughSchema>;

// ── 8. Impeller Semi-Finish (9 params) ────────────────────────────────────

export const impellerSemiFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller shroud surface geometry"),
  channel_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of flow channels in the impeller"),
  hub_semi_allowance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Semi-finish allowance on hub surface, mm"),
  blade_semi_allowance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Semi-finish allowance on blade surfaces, mm"),
  shroud_semi_allowance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Semi-finish allowance on shroud surface, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Semi-finish cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-channel semi-finishing"),
  blending_passes: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Number of blending passes for smooth transitions"),
});

export type ImpellerSemiFinish = z.infer<typeof impellerSemiFinishSchema>;

// ── 9. Impeller Hub Finish (8 params) ─────────────────────────────────────

export const impellerHubFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller shroud surface geometry"),
  channel_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of flow channels in the impeller"),
  hub_finish_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Surface tolerance for impeller hub finishing, mm"),
  hub_finish_stepover: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Stepover distance for hub finishing passes, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Hub finishing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-channel hub finishing"),
  blending_passes: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Number of blending passes at channel boundaries"),
});

export type ImpellerHubFinish = z.infer<typeof impellerHubFinishSchema>;

// ── 10. Impeller Blade Finish (8 params) ──────────────────────────────────

export const impellerBladeFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller shroud surface geometry"),
  channel_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of flow channels in the impeller"),
  blade_finish_cusp: z
    .number()
    .min(0.0005)
    .max(0.5)
    .describe("Target cusp height on impeller blade surface, mm"),
  blade_finish_stepover: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Stepover distance for blade finishing passes, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Blade finishing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-channel blade finishing"),
  tip_clearance: z
    .number()
    .min(0)
    .max(20)
    .describe("Clearance distance from blade tip during finishing, mm"),
});

export type ImpellerBladeFinish = z.infer<typeof impellerBladeFinishSchema>;

// ── 11. Impeller Shroud Finish (8 params) ─────────────────────────────────

export const impellerShroudFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller shroud surface geometry"),
  channel_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of flow channels in the impeller"),
  shroud_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Surface tolerance for shroud finishing, mm"),
  shroud_stepover: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Stepover distance for shroud finishing passes, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Shroud finishing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-channel shroud finishing"),
  blending_passes: z
    .number()
    .int()
    .min(1)
    .max(50)
    .describe("Number of blending passes at shroud boundaries"),
});

export type ImpellerShroudFinish = z.infer<typeof impellerShroudFinishSchema>;

// ── 12. Impeller Splitter (9 params) ──────────────────────────────────────

export const impellerSplitterSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the impeller shroud surface geometry"),
  channel_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of flow channels in the impeller"),
  splitter_thickness: z
    .number()
    .min(0.1)
    .max(50)
    .describe("Splitter blade wall thickness, mm"),
  splitter_height: z
    .number()
    .min(0.5)
    .max(500)
    .describe("Splitter blade height from hub, mm"),
  splitter_allowance: z
    .number()
    .min(0)
    .max(5)
    .describe("Stock allowance on splitter blade surfaces, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Splitter finishing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-channel splitter machining"),
  tip_clearance: z
    .number()
    .min(0)
    .max(20)
    .describe("Clearance distance from splitter tip, mm"),
});

export type ImpellerSplitter = z.infer<typeof impellerSplitterSchema>;

// ── 13. Turbine Blade (9 params) ──────────────────────────────────────────

export const turbineBladeSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the turbine hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the turbine shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of turbine blades"),
  twist_angle: z
    .number()
    .min(-90)
    .max(90)
    .describe("Blade twist angle from root to tip, degrees"),
  root_form: z
    .enum(["fir_tree", "dovetail", "pin"])
    .describe("Blade root attachment geometry type"),
  tip_shroud: z
    .boolean()
    .describe("Whether the blade has a tip shroud feature"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Turbine blade machining cut pattern"),
  roughing_allowance: z
    .number()
    .min(0.01)
    .max(20)
    .describe("Stock allowance after roughing, mm"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade turbine machining"),
});

export type TurbineBlade = z.infer<typeof turbineBladeSchema>;

// ── 14. Blisk Rough (9 params) ────────────────────────────────────────────

export const bliskRoughSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the blisk hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the blisk shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the blisk"),
  disk_allowance: z
    .number()
    .min(0.01)
    .max(20)
    .describe("Stock allowance on the disk section after roughing, mm"),
  fillet_blend: z
    .number()
    .min(0)
    .max(50)
    .describe("Fillet blend radius at blade-to-disk junction, mm"),
  sector_machining: z
    .boolean()
    .describe("Enable sector-based machining to reduce tool path length"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Blisk roughing cut pattern"),
  roughing_allowance: z
    .number()
    .min(0.01)
    .max(20)
    .describe("Overall roughing allowance for blade surfaces, mm"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade blisk roughing"),
});

export type BliskRough = z.infer<typeof bliskRoughSchema>;

// ── 15. Blisk Finish (9 params) ───────────────────────────────────────────

export const bliskFinishSchema = z.object({
  hub_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the blisk hub surface geometry"),
  shroud_surface: z
    .string()
    .min(1)
    .describe("Reference name or ID of the blisk shroud surface geometry"),
  blade_count: z
    .number()
    .int()
    .min(2)
    .max(200)
    .describe("Number of blades in the blisk"),
  disk_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Surface tolerance for disk finishing, mm"),
  blend_to_disk: z
    .boolean()
    .describe("Blend airfoil finishing toolpath smoothly into the disk surface"),
  airfoil_tolerance: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Surface tolerance for airfoil finishing, mm"),
  cut_pattern: z
    .enum(["zigzag", "one_way", "spiral"])
    .describe("Blisk finishing cut pattern"),
  multi_blade: z
    .boolean()
    .default(false)
    .describe("Enable multi-blade blisk finishing"),
  tip_clearance: z
    .number()
    .min(0)
    .max(20)
    .describe("Clearance distance from blade tip during finishing, mm"),
});

export type BliskFinish = z.infer<typeof bliskFinishSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All 15 blade/impeller cycle schemas keyed by cycle type */
export const FIVE_AXIS_BLADE_SCHEMA_MAP = {
  blade_rough: bladeRoughSchema,
  blade_semi_finish: bladeSemiFinishSchema,
  blade_hub_finish: bladeHubFinishSchema,
  blade_finish: bladeFinishSchema,
  blade_leading_edge: bladeLeadingEdgeSchema,
  blade_trailing_edge: bladeTrailingEdgeSchema,
  impeller_rough: impellerRoughSchema,
  impeller_semi_finish: impellerSemiFinishSchema,
  impeller_hub_finish: impellerHubFinishSchema,
  impeller_blade_finish: impellerBladeFinishSchema,
  impeller_shroud_finish: impellerShroudFinishSchema,
  impeller_splitter: impellerSplitterSchema,
  turbine_blade: turbineBladeSchema,
  blisk_rough: bliskRoughSchema,
  blisk_finish: bliskFinishSchema,
} as const;

export type FiveAxisBladeType = keyof typeof FIVE_AXIS_BLADE_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata record for every blade/impeller cycle type */
export interface FiveAxisBladeMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each blade/impeller cycle type with AC Python setter references */
export const FIVE_AXIS_BLADE_METADATA: Record<FiveAxisBladeType, FiveAxisBladeMeta> = {
  blade_rough: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.blade_rough",
    description: "5-axis blade roughing with hub/shroud surface references and channel strategy",
    dfmCriticalParams: ["channel_type", "roughing_allowance"],
  },
  blade_semi_finish: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.blade_semi_finish",
    description: "5-axis blade semi-finishing with blending passes and transition zone control",
  },
  blade_hub_finish: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.blade_hub_finish",
    description: "5-axis hub surface finishing with tolerance and cusp height control",
  },
  blade_finish: {
    paramCount: 10,
    acPythonSetter: "hm.5x.blade.blade_finish",
    description: "5-axis blade surface finishing with cusp height, tip clearance, and root blend",
    dfmCriticalParams: ["blade_cusp_height", "tip_clearance"],
  },
  blade_leading_edge: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.blade_leading_edge",
    description: "5-axis leading edge finishing with controlled radius and tolerance",
  },
  blade_trailing_edge: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.blade_trailing_edge",
    description: "5-axis trailing edge finishing with controlled radius and tolerance",
  },
  impeller_rough: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.impeller_rough",
    description: "5-axis impeller roughing with splitter blade support and approach mode selection",
  },
  impeller_semi_finish: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.impeller_semi_finish",
    description: "5-axis impeller semi-finishing with per-surface allowance control",
  },
  impeller_hub_finish: {
    paramCount: 8,
    acPythonSetter: "hm.5x.blade.impeller_hub_finish",
    description: "5-axis impeller hub surface finishing with tolerance and stepover control",
  },
  impeller_blade_finish: {
    paramCount: 8,
    acPythonSetter: "hm.5x.blade.impeller_blade_finish",
    description: "5-axis impeller blade surface finishing with cusp height control",
  },
  impeller_shroud_finish: {
    paramCount: 8,
    acPythonSetter: "hm.5x.blade.impeller_shroud_finish",
    description: "5-axis impeller shroud surface finishing with tolerance control",
  },
  impeller_splitter: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.impeller_splitter",
    description: "5-axis impeller splitter blade machining with thickness and height control",
  },
  turbine_blade: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.turbine_blade",
    description: "5-axis turbine blade machining with twist angle and root form selection",
  },
  blisk_rough: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.blisk_rough",
    description: "5-axis blisk roughing with disk allowance and sector machining",
  },
  blisk_finish: {
    paramCount: 9,
    acPythonSetter: "hm.5x.blade.blisk_finish",
    description: "5-axis blisk finishing with disk and airfoil tolerance control",
  },
};

// ── Computed Totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 15 blade/impeller cycle schemas */
export const FIVE_AXIS_BLADE_TOTAL_PARAM_COUNT = Object.values(FIVE_AXIS_BLADE_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
