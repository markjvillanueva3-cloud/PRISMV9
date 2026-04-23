/**
 * cadNXAssemblyDrawingSchema.ts — Zod schemas for Siemens NX Open Assembly and Drafting API
 *
 * Covers:
 *   - Assembly components and constraints
 *   - Assembly positioning and mates
 *   - Drawing views (orthographic, section, detail, isometric)
 *   - Drawing dimensions and annotations
 *   - BOM and parts list
 *
 * NXOpen References:
 *   - NXOpen.Assemblies namespace
 *   - NXOpen.Drawings namespace
 *   - NXOpen.Annotations namespace
 *
 * @module schemas/cadNXAssemblyDrawingSchema
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Assembly Constants
// ────────────────────────────────────────────────────────────────────────────

export const NX_CONSTRAINT_TYPES = [
  "touch_align",
  "concentric",
  "distance",
  "parallel",
  "perpendicular",
  "center",
  "angle",
  "fit",
  "bond",
  "fix",
] as const;
export type NXConstraintType = (typeof NX_CONSTRAINT_TYPES)[number];

export const NX_COMPONENT_STATUS = [
  "loaded",
  "partially_loaded",
  "not_loaded",
  "suppressed",
  "out_of_date",
  "missing",
] as const;
export type NXComponentStatus = (typeof NX_COMPONENT_STATUS)[number];

export const NX_ASSEMBLY_COMMANDS = [
  "add_component",
  "remove_component",
  "replace_component",
  "suppress_component",
  "unsuppress_component",
  "add_constraint",
  "remove_constraint",
  "edit_constraint",
  "position_component",
  "reposition_component",
  "create_pattern",
  "mirror_assembly",
  "get_components",
  "get_constraints",
  "check_interference",
  "get_mass_properties",
  "explode_view",
  "collapse_view",
  "get_bom",
  "create_arrangement",
  "activate_arrangement",
] as const;
export type NXAssemblyCommand = (typeof NX_ASSEMBLY_COMMANDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Drawing Constants
// ────────────────────────────────────────────────────────────────────────────

export const NX_VIEW_TYPES = [
  "base",
  "projected",
  "auxiliary",
  "section",
  "detail",
  "broken",
  "isometric",
  "trimetric",
  "dimetric",
  "perspective",
] as const;
export type NXViewType = (typeof NX_VIEW_TYPES)[number];

export const NX_SECTION_TYPES = [
  "full",
  "half",
  "offset",
  "aligned",
  "broken_out",
  "revolved",
] as const;
export type NXSectionType = (typeof NX_SECTION_TYPES)[number];

export const NX_DIMENSION_TYPES = [
  "horizontal",
  "vertical",
  "parallel",
  "perpendicular",
  "angular",
  "radial",
  "diametral",
  "arc_length",
  "ordinate",
  "chamfer",
  "hole_callout",
] as const;
export type NXDimensionType = (typeof NX_DIMENSION_TYPES)[number];

export const NX_ANNOTATION_TYPES = [
  "note",
  "label",
  "balloon",
  "id_symbol",
  "surface_finish",
  "datum_feature",
  "datum_target",
  "feature_control_frame",
  "weld_symbol",
  "centerline",
  "center_mark",
] as const;
export type NXAnnotationType = (typeof NX_ANNOTATION_TYPES)[number];

export const NX_DRAWING_COMMANDS = [
  "create_drawing",
  "add_sheet",
  "delete_sheet",
  "add_base_view",
  "add_projected_view",
  "add_section_view",
  "add_detail_view",
  "add_isometric_view",
  "delete_view",
  "move_view",
  "update_view",
  "add_dimension",
  "add_annotation",
  "add_centerline",
  "add_center_mark",
  "add_balloon",
  "add_parts_list",
  "add_title_block",
  "edit_dimension",
  "delete_dimension",
  "get_views",
  "get_dimensions",
  "export_pdf",
  "export_dwg",
] as const;
export type NXDrawingCommand = (typeof NX_DRAWING_COMMANDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Geometry Primitives
// ────────────────────────────────────────────────────────────────────────────

export const NXPoint3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type NXPoint3D = z.infer<typeof NXPoint3DSchema>;

export const NXVector3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type NXVector3D = z.infer<typeof NXVector3DSchema>;

export const NXMatrix3x3Schema = z.array(z.array(z.number()).length(3)).length(3);
export type NXMatrix3x3 = z.infer<typeof NXMatrix3x3Schema>;

export const NXTransformSchema = z.object({
  origin: NXPoint3DSchema,
  orientation: NXMatrix3x3Schema,
  scale: z.number().positive().default(1),
});
export type NXTransform = z.infer<typeof NXTransformSchema>;

export const NXPoint2DSchema = z.object({
  x: z.number(),
  y: z.number(),
});
export type NXPoint2D = z.infer<typeof NXPoint2DSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Assembly Component
// ────────────────────────────────────────────────────────────────────────────

export const NXComponentSchema = z.object({
  componentId: z.string(),
  displayName: z.string(),
  partFile: z.string().describe("Path to the part file"),
  refsetName: z.string().optional().describe("Reference set used"),
  status: z.enum(NX_COMPONENT_STATUS),
  transform: NXTransformSchema,
  parent: z.string().optional().describe("Parent component ID for subassemblies"),
  children: z.array(z.string()).optional().describe("Child component IDs"),
  layer: z.number().int().nonnegative().optional(),
  color: z.number().int().nonnegative().optional(),
  isSuppressed: z.boolean().default(false),
  quantityInBom: z.number().int().positive().default(1),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type NXComponent = z.infer<typeof NXComponentSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Assembly Constraint
// ────────────────────────────────────────────────────────────────────────────

export const NXConstraintGeometrySchema = z.object({
  componentId: z.string(),
  geometryTag: z.string().describe("NX tag for face/edge/point"),
  geometryType: z.enum(["face", "edge", "point", "axis", "plane", "csys"]),
});
export type NXConstraintGeometry = z.infer<typeof NXConstraintGeometrySchema>;

export const NXAssemblyConstraintSchema = z.object({
  constraintId: z.string(),
  constraintType: z.enum(NX_CONSTRAINT_TYPES),
  geometry1: NXConstraintGeometrySchema,
  geometry2: NXConstraintGeometrySchema.optional(),
  offset: z.number().optional().describe("Offset distance for distance constraints"),
  angle: z.number().optional().describe("Angle in degrees for angle constraints"),
  orientation: z.enum(["align", "anti_align", "center_center", "center_axis"]).optional(),
  isActive: z.boolean().default(true),
  status: z.enum(["satisfied", "not_satisfied", "redundant", "inconsistent"]),
});
export type NXAssemblyConstraint = z.infer<typeof NXAssemblyConstraintSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Assembly Analysis
// ────────────────────────────────────────────────────────────────────────────

export const NXInterferenceResultSchema = z.object({
  component1: z.string(),
  component2: z.string(),
  interferenceType: z.enum(["hard", "soft", "touching", "clearance"]),
  volume: z.number().nonnegative().describe("Interference volume in mm³"),
  centroid: NXPoint3DSchema.optional(),
  depth: z.number().nonnegative().optional().describe("Maximum penetration depth in mm"),
});
export type NXInterferenceResult = z.infer<typeof NXInterferenceResultSchema>;

export const NXMassPropertiesSchema = z.object({
  mass: z.number().nonnegative().describe("Mass in kg"),
  volume: z.number().nonnegative().describe("Volume in mm³"),
  surfaceArea: z.number().nonnegative().describe("Surface area in mm²"),
  centroid: NXPoint3DSchema,
  momentsOfInertia: z.object({
    ixx: z.number(),
    iyy: z.number(),
    izz: z.number(),
    ixy: z.number(),
    ixz: z.number(),
    iyz: z.number(),
  }),
  principalMoments: z.object({
    i1: z.number(),
    i2: z.number(),
    i3: z.number(),
  }),
  principalAxes: z.array(NXVector3DSchema).length(3),
  accuracy: z.number().min(0).max(1).describe("Calculation accuracy 0-1"),
});
export type NXMassProperties = z.infer<typeof NXMassPropertiesSchema>;

// ────────────────────────────────────────────────────────────────────────────
// BOM
// ────────────────────────────────────────────────────────────────────────────

export const NXBomItemSchema = z.object({
  itemNumber: z.number().int().positive(),
  partNumber: z.string(),
  partName: z.string(),
  description: z.string().optional(),
  quantity: z.number().int().positive(),
  unit: z.string().default("EA"),
  material: z.string().optional(),
  weight: z.number().nonnegative().optional(),
  componentIds: z.array(z.string()).describe("Component instances"),
  level: z.number().int().nonnegative().describe("BOM indentation level"),
  isPhantom: z.boolean().default(false),
  attributes: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
});
export type NXBomItem = z.infer<typeof NXBomItemSchema>;

export const NXBomSchema = z.object({
  bomId: z.string(),
  assemblyFile: z.string(),
  bomType: z.enum(["single_level", "multi_level", "indented", "where_used"]),
  items: z.array(NXBomItemSchema),
  totalParts: z.number().int().nonnegative(),
  uniqueParts: z.number().int().nonnegative(),
  generatedAt: z.string().datetime(),
});
export type NXBom = z.infer<typeof NXBomSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Drawing Sheet
// ────────────────────────────────────────────────────────────────────────────

export const NXDrawingSheetSchema = z.object({
  sheetId: z.string(),
  sheetNumber: z.number().int().positive(),
  sheetName: z.string(),
  size: z.enum(["A", "B", "C", "D", "E", "A0", "A1", "A2", "A3", "A4", "custom"]),
  width: z.number().positive().describe("Sheet width in mm"),
  height: z.number().positive().describe("Sheet height in mm"),
  scale: z.string().default("1:1"),
  projection: z.enum(["first_angle", "third_angle"]),
  units: z.enum(["millimeters", "inches"]),
  titleBlockId: z.string().optional(),
});
export type NXDrawingSheet = z.infer<typeof NXDrawingSheetSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Drawing View
// ────────────────────────────────────────────────────────────────────────────

export const NXDrawingViewSchema = z.object({
  viewId: z.string(),
  viewName: z.string(),
  viewType: z.enum(NX_VIEW_TYPES),
  sheetId: z.string(),
  anchor: NXPoint2DSchema.describe("View anchor point on sheet"),
  scale: z.number().positive(),
  orientation: NXMatrix3x3Schema.optional().describe("View orientation matrix"),
  boundaryWidth: z.number().positive().optional(),
  boundaryHeight: z.number().positive().optional(),
  parentViewId: z.string().optional().describe("Parent view for projected/section/detail"),
  hiddenLinesVisible: z.boolean().default(false),
  tangentEdgesVisible: z.boolean().default(false),
  silhouetteEdgesVisible: z.boolean().default(true),
  renderStyle: z.enum(["wireframe", "hidden_line", "shaded", "shaded_with_edges"]),
  isUpToDate: z.boolean().default(true),
});
export type NXDrawingView = z.infer<typeof NXDrawingViewSchema>;

export const NXSectionViewSchema = NXDrawingViewSchema.extend({
  viewType: z.literal("section"),
  sectionType: z.enum(NX_SECTION_TYPES),
  cuttingPlane: z.object({
    points: z.array(NXPoint3DSchema).min(2),
    direction: NXVector3DSchema,
  }),
  hatchPattern: z.string().optional(),
  hatchAngle: z.number().optional(),
  hatchScale: z.number().positive().optional(),
  excludedComponents: z.array(z.string()).optional(),
});
export type NXSectionView = z.infer<typeof NXSectionViewSchema>;

export const NXDetailViewSchema = NXDrawingViewSchema.extend({
  viewType: z.literal("detail"),
  detailBoundary: z.enum(["circle", "rectangle", "freehand"]),
  detailCenter: NXPoint2DSchema.describe("Center in parent view coordinates"),
  detailRadius: z.number().positive().optional(),
  detailWidth: z.number().positive().optional(),
  detailHeight: z.number().positive().optional(),
  detailLabel: z.string(),
  scaleFactor: z.number().positive().describe("Scale relative to parent"),
});
export type NXDetailView = z.infer<typeof NXDetailViewSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Dimensions and Annotations
// ────────────────────────────────────────────────────────────────────────────

export const NXDimensionSchema = z.object({
  dimensionId: z.string(),
  dimensionType: z.enum(NX_DIMENSION_TYPES),
  viewId: z.string(),
  value: z.number(),
  displayValue: z.string().describe("Formatted dimension text"),
  tolerance: z.object({
    type: z.enum(["none", "symmetric", "bilateral", "limit", "basic"]),
    upper: z.number().optional(),
    lower: z.number().optional(),
  }).optional(),
  textPosition: NXPoint2DSchema,
  extensionLine1: NXPoint2DSchema.optional(),
  extensionLine2: NXPoint2DSchema.optional(),
  arrowStyle: z.enum(["arrow", "tick", "dot", "none"]),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
  isPrimary: z.boolean().default(true),
  associatedGeometry: z.array(z.string()).describe("Geometry tags"),
});
export type NXDimension = z.infer<typeof NXDimensionSchema>;

export const NXAnnotationSchema = z.object({
  annotationId: z.string(),
  annotationType: z.enum(NX_ANNOTATION_TYPES),
  viewId: z.string(),
  position: NXPoint2DSchema,
  text: z.string().optional(),
  leaderPoints: z.array(NXPoint2DSchema).optional(),
  symbol: z.string().optional(),
  layer: z.number().int().nonnegative().optional(),
});
export type NXAnnotation = z.infer<typeof NXAnnotationSchema>;

export const NXPartsListSchema = z.object({
  partsListId: z.string(),
  sheetId: z.string(),
  anchor: NXPoint2DSchema,
  columns: z.array(z.object({
    header: z.string(),
    attribute: z.string(),
    width: z.number().positive(),
  })),
  bomId: z.string(),
  rowHeight: z.number().positive(),
  headerHeight: z.number().positive(),
  sortBy: z.string().optional(),
  filterExpression: z.string().optional(),
});
export type NXPartsList = z.infer<typeof NXPartsListSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Drawing Object
// ────────────────────────────────────────────────────────────────────────────

export const NXDrawingSchema = z.object({
  drawingId: z.string(),
  drawingName: z.string(),
  sourceAssembly: z.string().optional(),
  sourcePart: z.string().optional(),
  sheets: z.array(NXDrawingSheetSchema),
  views: z.array(NXDrawingViewSchema),
  dimensions: z.array(NXDimensionSchema),
  annotations: z.array(NXAnnotationSchema),
  partsLists: z.array(NXPartsListSchema).optional(),
  createdAt: z.string().datetime(),
  modifiedAt: z.string().datetime(),
});
export type NXDrawing = z.infer<typeof NXDrawingSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Command Results
// ────────────────────────────────────────────────────────────────────────────

export const NXAssemblyResultSchema = z.object({
  success: z.boolean(),
  command: z.enum(NX_ASSEMBLY_COMMANDS),
  componentId: z.string().optional(),
  constraintId: z.string().optional(),
  components: z.array(NXComponentSchema).optional(),
  constraints: z.array(NXAssemblyConstraintSchema).optional(),
  interferences: z.array(NXInterferenceResultSchema).optional(),
  massProperties: NXMassPropertiesSchema.optional(),
  bom: NXBomSchema.optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});
export type NXAssemblyResult = z.infer<typeof NXAssemblyResultSchema>;

export const NXDrawingResultSchema = z.object({
  success: z.boolean(),
  command: z.enum(NX_DRAWING_COMMANDS),
  drawingId: z.string().optional(),
  sheetId: z.string().optional(),
  viewId: z.string().optional(),
  dimensionId: z.string().optional(),
  annotationId: z.string().optional(),
  drawing: NXDrawingSchema.optional(),
  views: z.array(NXDrawingViewSchema).optional(),
  dimensions: z.array(NXDimensionSchema).optional(),
  exportPath: z.string().optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});
export type NXDrawingResult = z.infer<typeof NXDrawingResultSchema>;
