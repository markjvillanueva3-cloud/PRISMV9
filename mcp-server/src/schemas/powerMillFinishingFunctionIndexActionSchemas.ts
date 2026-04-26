/**
 * Zod action schemas for PowerMillFinishingFunctionIndexEngine — CAM-EXHAUST-MS0/U-CAM44
 */

import { z } from "zod";

export const pm_finishing_list_schema = z.object({
  action: z.literal("pm_finishing_list"),
});

export const pm_finishing_get_schema = z.object({
  action: z.literal("pm_finishing_get"),
  operation_id: z.string().min(1),
});

export const pm_finishing_recommend_schema = z.object({
  action: z.literal("pm_finishing_recommend"),
  intent: z.enum([
    "general_surface_finish",
    "steep_walls_waterline",
    "shallow_flats_raster",
    "mixed_steep_shallow",
    "internal_corners_pencil",
    "fillet_cleanup",
    "turbine_blade_flowline",
    "ruled_wall_swarf",
    "blade_channel_morph",
    "decorative_pattern",
    "edge_trace",
  ]),
});

export const pm_finishing_scallop_schema = z.object({
  action: z.literal("pm_finishing_scallop"),
  stepover_mm: z.number().positive(),
  ball_diameter_mm: z.number().positive(),
});

export const pm_finishing_steep_shallow_schema = z.object({
  action: z.literal("pm_finishing_steep_shallow"),
  angle_deg: z.number().min(0).max(90),
  threshold_deg: z.number().min(20).max(70).optional(),
});

export const pm_finishing_pencil_coverage_schema = z.object({
  action: z.literal("pm_finishing_pencil_coverage"),
  reference_tool_dia_mm: z.number().positive(),
  pencil_tool_dia_mm: z.number().positive(),
  corner_radius_mm: z.number().positive(),
});

export const pm_finishing_validate_schema = z.object({
  action: z.literal("pm_finishing_validate"),
});

export const pm_finishing_categories_schema = z.object({
  action: z.literal("pm_finishing_categories"),
});

export const pm_finishing_by_category_schema = z.object({
  action: z.literal("pm_finishing_by_category"),
  category: z.string().min(1),
});

export type PmFinishingListInput = z.input<typeof pm_finishing_list_schema>;
export type PmFinishingGetInput = z.input<typeof pm_finishing_get_schema>;
export type PmFinishingRecommendInput = z.input<typeof pm_finishing_recommend_schema>;
export type PmFinishingScallopInput = z.input<typeof pm_finishing_scallop_schema>;
export type PmFinishingSteepShallowInput = z.input<typeof pm_finishing_steep_shallow_schema>;
export type PmFinishingPencilCoverageInput = z.input<typeof pm_finishing_pencil_coverage_schema>;
export type PmFinishingValidateInput = z.input<typeof pm_finishing_validate_schema>;
export type PmFinishingCategoriesInput = z.input<typeof pm_finishing_categories_schema>;
export type PmFinishingByCategoryInput = z.input<typeof pm_finishing_by_category_schema>;
