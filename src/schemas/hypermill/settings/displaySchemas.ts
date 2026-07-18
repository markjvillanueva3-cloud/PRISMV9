/**
 * Display Parameter Schemas — hyperMILL Settings
 *
 * U-HKC37: Zod schemas for shading, color, mesh quality, annotation, and layer display settings.
 *
 * AC Python call pattern:
 *   hm.settings.display.set_shading(shading_mode="shaded", ...)
 *
 * @domain Settings / Display
 * @milestone HM-KC-MS7/U-HKC37
 */

import { z } from "zod";

// ============================================================================
// 1. SHADING SETTINGS (4 params)
// ============================================================================

export const shadingSettingsSchema = z.object({
  shading_mode: z
    .enum(["wireframe", "shaded", "shaded_wireframe", "realistic"])
    .default("shaded")
    .describe("3D viewport rendering mode for part and stock geometry"),
  transparency_level: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(0)
    .describe("Global transparency level for shaded models, 0 (opaque) to 100 (fully transparent)"),
  edge_display: z
    .boolean()
    .default(true)
    .describe("Display model edges as visible lines in shaded mode"),
  silhouette_edges: z
    .boolean()
    .default(true)
    .describe("Render silhouette edges (outline curves) on shaded surfaces for depth clarity"),
});

export type ShadingSettings = z.infer<typeof shadingSettingsSchema>;

// ============================================================================
// 2. COLOR SETTINGS (6 params)
// ============================================================================

const hexColorSchema = z
  .string()
  .regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color string (e.g. #FF0000)");

export const colorSettingsSchema = z.object({
  background_color: hexColorSchema
    .default("#1E1E2E")
    .describe("Viewport background color as a hex string (e.g. #1E1E2E)"),
  stock_color: hexColorSchema
    .default("#4A90D9")
    .describe("Display color for stock/raw material geometry, hex string"),
  fixture_color: hexColorSchema
    .default("#A0A0A0")
    .describe("Display color for workholding fixture geometry, hex string"),
  toolpath_color: hexColorSchema
    .default("#00CC44")
    .describe("Display color for calculated toolpath lines, hex string"),
  collision_highlight_color: hexColorSchema
    .default("#FF0000")
    .describe("Highlight color for collision zones detected during simulation, hex string"),
  selection_color: hexColorSchema
    .default("#FFAA00")
    .describe("Highlight color for selected geometry and operations, hex string"),
});

export type ColorSettings = z.infer<typeof colorSettingsSchema>;

// ============================================================================
// 3. MESH QUALITY SETTINGS (4 params)
// ============================================================================

export const meshQualitySettingsSchema = z.object({
  mesh_density: z
    .enum(["coarse", "medium", "fine", "ultra"])
    .default("medium")
    .describe("Global mesh tessellation density for display and simulation models"),
  deviation_tolerance_mm: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("Maximum chord deviation for mesh tessellation relative to true surface, mm"),
  max_triangle_count: z
    .number()
    .int()
    .min(1000)
    .max(10000000)
    .default(500000)
    .describe("Maximum triangle count per mesh object before adaptive reduction (1,000–10,000,000)"),
  adaptive_refinement: z
    .boolean()
    .default(true)
    .describe("Enable adaptive mesh refinement in high-curvature regions for better display fidelity"),
});

export type MeshQualitySettings = z.infer<typeof meshQualitySettingsSchema>;

// ============================================================================
// 4. ANNOTATION SETTINGS (5 params)
// ============================================================================

export const annotationSettingsSchema = z.object({
  show_dimensions: z
    .boolean()
    .default(true)
    .describe("Display part dimension annotations in the 3D viewport"),
  show_tolerances: z
    .boolean()
    .default(true)
    .describe("Display tolerance callouts alongside dimension annotations"),
  show_surface_finish: z
    .boolean()
    .default(true)
    .describe("Display surface finish symbols (Ra, Rz) on annotated faces"),
  dimension_text_size: z
    .number()
    .int()
    .min(6)
    .max(24)
    .default(10)
    .describe("Font size for dimension annotation text in points (6–24 pt)"),
  leader_line_style: z
    .enum(["solid", "dashed", "dotted"])
    .default("solid")
    .describe("Line style for dimension leader lines in annotations"),
});

export type AnnotationSettings = z.infer<typeof annotationSettingsSchema>;

// ============================================================================
// 5. LAYER SETTINGS (5 params)
// ============================================================================

export const layerSettingsSchema = z.object({
  default_layer_name: z
    .string()
    .min(1)
    .default("Layer_0")
    .describe("Name assigned to the default layer for new geometry and operations"),
  auto_assign_layers: z
    .boolean()
    .default(true)
    .describe("Automatically assign geometry to layers based on type or operation context"),
  layer_color_scheme: z
    .enum(["by_type", "by_operation", "custom"])
    .default("by_type")
    .describe("Color assignment strategy for layers: by geometry type, by operation, or custom"),
  max_layers: z
    .number()
    .int()
    .min(1)
    .max(256)
    .default(64)
    .describe("Maximum number of layers allowed in a single hyperMILL project (1–256)"),
  show_layer_panel: z
    .boolean()
    .default(true)
    .describe("Display the layer management panel in the hyperMILL user interface"),
});

export type LayerSettings = z.infer<typeof layerSettingsSchema>;

// ============================================================================
// Schema Map (5 types)
// ============================================================================

/** All display settings schemas keyed by type */
export const DISPLAY_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  shading: shadingSettingsSchema,
  color: colorSettingsSchema,
  mesh_quality: meshQualitySettingsSchema,
  annotation: annotationSettingsSchema,
  layer: layerSettingsSchema,
};

export type DisplaySchemaType = keyof typeof DISPLAY_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface DisplayMeta {
  paramCount: number;
  acPythonSetter: string;
  description: string;
}

export const DISPLAY_METADATA: Record<string, DisplayMeta> = {
  shading: {
    paramCount: 4,
    acPythonSetter: "hm.settings.display.set_shading",
    description: "Configure viewport shading mode, transparency, and edge rendering",
  },
  color: {
    paramCount: 6,
    acPythonSetter: "hm.settings.display.set_colors",
    description: "Configure display colors for background, stock, fixtures, toolpath, collisions, and selections",
  },
  mesh_quality: {
    paramCount: 4,
    acPythonSetter: "hm.settings.display.set_mesh_quality",
    description: "Configure mesh tessellation density, deviation tolerance, and adaptive refinement",
  },
  annotation: {
    paramCount: 5,
    acPythonSetter: "hm.settings.display.set_annotations",
    description: "Configure dimension, tolerance, and surface finish annotation display options",
  },
  layer: {
    paramCount: 5,
    acPythonSetter: "hm.settings.display.set_layers",
    description: "Configure layer naming, auto-assignment, color scheme, and layer count limit",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all display settings schemas */
export const DISPLAY_TOTAL_PARAM_COUNT = Object.values(DISPLAY_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
