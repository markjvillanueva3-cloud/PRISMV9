/**
 * cadAutoCADSchema.ts — Zod schemas for AutoCAD .NET bridge
 *
 * Covers:
 *   - Documents and drawings (DWG)
 *   - Entities (lines, arcs, circles, polylines, solids, blocks)
 *   - Layers, linetypes, text styles
 *   - Dimensions and annotations
 *   - Selection sets and filters
 *   - AutoLISP evaluation
 *   - Plot/print configuration
 *
 * @module schemas/cadAutoCADSchema
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const ACAD_ENTITY_TYPES = [
  "LINE",
  "ARC",
  "CIRCLE",
  "ELLIPSE",
  "POLYLINE",
  "LWPOLYLINE",
  "SPLINE",
  "POINT",
  "TEXT",
  "MTEXT",
  "DIMENSION",
  "LEADER",
  "HATCH",
  "SOLID",
  "3DSOLID",
  "REGION",
  "BLOCK",
  "INSERT",
  "ATTRIB",
  "ATTDEF",
  "XREF",
  "IMAGE",
  "VIEWPORT",
  "TABLE",
  "MESH",
  "SURFACE",
] as const;
export type AcadEntityType = (typeof ACAD_ENTITY_TYPES)[number];

export const ACAD_LINETYPE_NAMES = [
  "Continuous",
  "Center",
  "Dashed",
  "Hidden",
  "Phantom",
  "Dot",
  "DashDot",
  "Border",
  "Divide",
] as const;
export type AcadLinetypeName = (typeof ACAD_LINETYPE_NAMES)[number];

export const ACAD_PLOT_STYLES = [
  "monochrome",
  "grayscale",
  "screening",
  "stb",
  "ctb",
] as const;
export type AcadPlotStyle = (typeof ACAD_PLOT_STYLES)[number];

export const ACAD_DIMENSION_TYPES = [
  "LINEAR",
  "ALIGNED",
  "ANGULAR",
  "RADIAL",
  "DIAMETRIC",
  "ORDINATE",
  "ARC_LENGTH",
] as const;
export type AcadDimensionType = (typeof ACAD_DIMENSION_TYPES)[number];

export const ACAD_COMMANDS = [
  "open_drawing",
  "save_drawing",
  "close_drawing",
  "new_drawing",
  "get_drawing_info",
  "create_entity",
  "get_entity",
  "update_entity",
  "delete_entity",
  "list_entities",
  "select_entities",
  "create_layer",
  "get_layer",
  "update_layer",
  "delete_layer",
  "list_layers",
  "create_block",
  "insert_block",
  "explode_block",
  "get_block",
  "list_blocks",
  "create_dimension",
  "get_dimension",
  "update_dimension",
  "create_text",
  "create_hatch",
  "create_xref",
  "reload_xref",
  "detach_xref",
  "eval_lisp",
  "run_command",
  "plot_drawing",
  "export_pdf",
  "export_dwf",
  "purge",
  "audit",
  "zoom_extents",
  "set_ucs",
  "get_system_variable",
  "set_system_variable",
] as const;
export type AcadCommand = (typeof ACAD_COMMANDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Point / Geometry schemas
// ────────────────────────────────────────────────────────────────────────────

export const AcadPoint2dSchema = z.tuple([z.number(), z.number()]);
export type AcadPoint2d = z.infer<typeof AcadPoint2dSchema>;

export const AcadPoint3dSchema = z.tuple([z.number(), z.number(), z.number()]);
export type AcadPoint3d = z.infer<typeof AcadPoint3dSchema>;

export const AcadColorSchema = z.object({
  colorIndex: z.number().int().min(0).max(256).optional(),
  rgb: z.tuple([z.number().int().min(0).max(255), z.number().int().min(0).max(255), z.number().int().min(0).max(255)]).optional(),
  colorName: z.string().optional(),
});
export type AcadColor = z.infer<typeof AcadColorSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Layer schema
// ────────────────────────────────────────────────────────────────────────────

export const AcadLayerSchema = z.object({
  name: z.string(),
  color: AcadColorSchema.optional(),
  linetype: z.string().optional(),
  lineweight: z.number().optional(),
  isOff: z.boolean().default(false),
  isFrozen: z.boolean().default(false),
  isLocked: z.boolean().default(false),
  isPlottable: z.boolean().default(true),
  description: z.string().optional(),
});
export type AcadLayer = z.infer<typeof AcadLayerSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Entity schemas
// ────────────────────────────────────────────────────────────────────────────

export const AcadEntityBaseSchema = z.object({
  handle: z.string(),
  entityType: z.enum(ACAD_ENTITY_TYPES),
  layer: z.string(),
  color: AcadColorSchema.optional(),
  linetype: z.string().optional(),
  lineweight: z.number().optional(),
  visible: z.boolean().default(true),
});

export const AcadLineSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("LINE"),
  startPoint: AcadPoint3dSchema,
  endPoint: AcadPoint3dSchema,
});
export type AcadLine = z.infer<typeof AcadLineSchema>;

export const AcadArcSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("ARC"),
  center: AcadPoint3dSchema,
  radius: z.number().positive(),
  startAngle: z.number(),
  endAngle: z.number(),
});
export type AcadArc = z.infer<typeof AcadArcSchema>;

export const AcadCircleSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("CIRCLE"),
  center: AcadPoint3dSchema,
  radius: z.number().positive(),
});
export type AcadCircle = z.infer<typeof AcadCircleSchema>;

export const AcadPolylineSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("LWPOLYLINE"),
  vertices: z.array(AcadPoint2dSchema),
  bulges: z.array(z.number()).optional(),
  closed: z.boolean().default(false),
  constantWidth: z.number().optional(),
  elevation: z.number().default(0),
});
export type AcadPolyline = z.infer<typeof AcadPolylineSchema>;

export const AcadTextSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("TEXT"),
  insertionPoint: AcadPoint3dSchema,
  textString: z.string(),
  height: z.number().positive(),
  rotation: z.number().default(0),
  styleName: z.string().optional(),
  horizontalMode: z.enum(["Left", "Center", "Right", "Aligned", "Middle", "Fit"]).default("Left"),
  verticalMode: z.enum(["Baseline", "Bottom", "Middle", "Top"]).default("Baseline"),
});
export type AcadText = z.infer<typeof AcadTextSchema>;

export const AcadMTextSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("MTEXT"),
  insertionPoint: AcadPoint3dSchema,
  contents: z.string(),
  width: z.number().positive(),
  textHeight: z.number().positive(),
  rotation: z.number().default(0),
  styleName: z.string().optional(),
  attachment: z.enum([
    "TopLeft", "TopCenter", "TopRight",
    "MiddleLeft", "MiddleCenter", "MiddleRight",
    "BottomLeft", "BottomCenter", "BottomRight",
  ]).default("TopLeft"),
});
export type AcadMText = z.infer<typeof AcadMTextSchema>;

export const AcadDimensionSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("DIMENSION"),
  dimensionType: z.enum(ACAD_DIMENSION_TYPES),
  defPoint1: AcadPoint3dSchema.optional(),
  defPoint2: AcadPoint3dSchema.optional(),
  dimLinePoint: AcadPoint3dSchema,
  measurement: z.number(),
  textOverride: z.string().optional(),
  styleName: z.string().optional(),
});
export type AcadDimension = z.infer<typeof AcadDimensionSchema>;

export const AcadHatchSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("HATCH"),
  patternName: z.string(),
  patternScale: z.number().positive().default(1),
  patternAngle: z.number().default(0),
  isSolid: z.boolean().default(false),
  boundaryHandles: z.array(z.string()),
});
export type AcadHatch = z.infer<typeof AcadHatchSchema>;

export const AcadBlockRefSchema = AcadEntityBaseSchema.extend({
  entityType: z.literal("INSERT"),
  blockName: z.string(),
  insertionPoint: AcadPoint3dSchema,
  scale: AcadPoint3dSchema.default([1, 1, 1]),
  rotation: z.number().default(0),
  attributes: z.record(z.string(), z.string()).optional(),
});
export type AcadBlockRef = z.infer<typeof AcadBlockRefSchema>;

export const AcadEntitySchema = z.discriminatedUnion("entityType", [
  AcadLineSchema,
  AcadArcSchema,
  AcadCircleSchema,
  AcadPolylineSchema,
  AcadTextSchema,
  AcadMTextSchema,
  AcadDimensionSchema,
  AcadHatchSchema,
  AcadBlockRefSchema,
]);
export type AcadEntity = z.infer<typeof AcadEntitySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Block definition schema
// ────────────────────────────────────────────────────────────────────────────

export const AcadBlockDefSchema = z.object({
  name: z.string(),
  basePoint: AcadPoint3dSchema.default([0, 0, 0]),
  description: z.string().optional(),
  isAnonymous: z.boolean().default(false),
  isXref: z.boolean().default(false),
  xrefPath: z.string().optional(),
  entityCount: z.number().int().nonnegative(),
});
export type AcadBlockDef = z.infer<typeof AcadBlockDefSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Drawing / Document schema
// ────────────────────────────────────────────────────────────────────────────

export const AcadDrawingSchema = z.object({
  path: z.string(),
  name: z.string(),
  version: z.string().optional(),
  isReadOnly: z.boolean().default(false),
  isModified: z.boolean().default(false),
  units: z.enum(["Inches", "Feet", "Miles", "Millimeters", "Centimeters", "Meters", "Kilometers", "Unitless"]).default("Inches"),
  extents: z.object({
    min: AcadPoint3dSchema,
    max: AcadPoint3dSchema,
  }).optional(),
  layerCount: z.number().int().nonnegative(),
  entityCount: z.number().int().nonnegative(),
  blockCount: z.number().int().nonnegative(),
});
export type AcadDrawing = z.infer<typeof AcadDrawingSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Selection filter schema
// ────────────────────────────────────────────────────────────────────────────

export const AcadSelectionFilterSchema = z.object({
  entityTypes: z.array(z.enum(ACAD_ENTITY_TYPES)).optional(),
  layers: z.array(z.string()).optional(),
  colors: z.array(z.number().int()).optional(),
  handles: z.array(z.string()).optional(),
  region: z.object({
    min: AcadPoint3dSchema,
    max: AcadPoint3dSchema,
  }).optional(),
  onScreen: z.boolean().optional(),
});
export type AcadSelectionFilter = z.infer<typeof AcadSelectionFilterSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Plot / Export schemas
// ────────────────────────────────────────────────────────────────────────────

export const AcadPlotConfigSchema = z.object({
  device: z.string(),
  paperSize: z.string(),
  plotArea: z.enum(["Display", "Extents", "Limits", "View", "Window"]).default("Extents"),
  scale: z.union([z.literal("Fit"), z.number().positive()]).default("Fit"),
  plotStyleTable: z.string().optional(),
  orientation: z.enum(["Portrait", "Landscape"]).default("Landscape"),
  plotOffset: AcadPoint2dSchema.default([0, 0]),
  centerPlot: z.boolean().default(true),
  lineweightScale: z.number().positive().default(1),
});
export type AcadPlotConfig = z.infer<typeof AcadPlotConfigSchema>;

export const AcadExportOptionsSchema = z.object({
  format: z.enum(["PDF", "DWF", "DWFx", "DXF", "DGN", "SVG", "PNG", "JPG"]),
  outputPath: z.string(),
  includeLayerInfo: z.boolean().default(true),
  includePlotStyles: z.boolean().default(true),
  resolution: z.number().int().positive().default(300),
  colorMode: z.enum(["Color", "Grayscale", "Monochrome"]).default("Color"),
});
export type AcadExportOptions = z.infer<typeof AcadExportOptionsSchema>;

// ────────────────────────────────────────────────────────────────────────────
// AutoLISP / Command schemas
// ────────────────────────────────────────────────────────────────────────────

export const AcadLispResultSchema = z.object({
  expression: z.string(),
  result: z.unknown(),
  resultType: z.enum(["nil", "T", "integer", "real", "string", "list", "entity", "selection", "error"]),
  errorMessage: z.string().optional(),
  executionTimeMs: z.number().nonnegative(),
});
export type AcadLispResult = z.infer<typeof AcadLispResultSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Response / Transport schemas
// ────────────────────────────────────────────────────────────────────────────

export const AcadResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  errorCode: z.number().optional(),
  result: z.unknown().optional(),
});
export type AcadResponse = z.infer<typeof AcadResponseSchema>;

export const AcadCallLogEntrySchema = z.object({
  command: z.enum(ACAD_COMMANDS),
  args: z.record(z.string(), z.unknown()),
  ok: z.boolean(),
  error: z.string().optional(),
  durationMs: z.number().nonnegative(),
  at: z.string().datetime(),
});
export type AcadCallLogEntry = z.infer<typeof AcadCallLogEntrySchema>;
