/**
 * cadNXSketchSchema.ts — Zod schemas for Siemens NX Open Sketcher API
 *
 * Covers:
 *   - Sketch entities (line, arc, circle, ellipse, spline, conic, point)
 *   - Geometric constraints (coincident, perpendicular, tangent, etc.)
 *   - Dimensional constraints (distance, angle, radius, etc.)
 *   - Sketch status and solving
 *
 * NXOpen References:
 *   - NXOpen.Sketch namespace
 *   - NXOpen.SketchConstraint, NXOpen.SketchDimensionalConstraint
 *   - NXOpen.Features.SketchFeature
 *
 * @module schemas/cadNXSketchSchema
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Entity Types
// ────────────────────────────────────────────────────────────────────────────

export const NX_SKETCH_ENTITY_TYPES = [
  "line",
  "arc",
  "circle",
  "ellipse",
  "ellipse_arc",
  "spline",
  "conic",
  "point",
  "text",
  "centerline",
  "construction_line",
  "construction_arc",
  "construction_circle",
] as const;
export type NXSketchEntityType = (typeof NX_SKETCH_ENTITY_TYPES)[number];

export const NX_GEOMETRIC_CONSTRAINT_TYPES = [
  "horizontal",
  "vertical",
  "perpendicular",
  "parallel",
  "tangent",
  "coincident",
  "concentric",
  "collinear",
  "equal_length",
  "equal_radius",
  "midpoint",
  "point_on_curve",
  "point_on_string",
  "symmetric",
  "fixed",
  "fully_fixed",
  "slope",
  "uniform",
] as const;
export type NXGeometricConstraintType = (typeof NX_GEOMETRIC_CONSTRAINT_TYPES)[number];

export const NX_DIMENSIONAL_CONSTRAINT_TYPES = [
  "horizontal_dim",
  "vertical_dim",
  "parallel_dim",
  "perpendicular_dim",
  "angular_dim",
  "radius_dim",
  "diameter_dim",
  "arc_length_dim",
  "perimeter_dim",
] as const;
export type NXDimensionalConstraintType = (typeof NX_DIMENSIONAL_CONSTRAINT_TYPES)[number];

export const NX_SKETCH_STATUS = [
  "fully_constrained",
  "under_constrained",
  "over_constrained",
  "inconsistent",
  "not_updated",
] as const;
export type NXSketchStatus = (typeof NX_SKETCH_STATUS)[number];

export const NX_SKETCH_COMMANDS = [
  "create_sketch",
  "open_sketch",
  "close_sketch",
  "update_sketch",
  "delete_sketch",
  "create_line",
  "create_arc",
  "create_circle",
  "create_ellipse",
  "create_spline",
  "create_conic",
  "create_point",
  "create_text",
  "create_centerline",
  "delete_entity",
  "add_geometric_constraint",
  "add_dimensional_constraint",
  "remove_constraint",
  "modify_dimension",
  "trim_curve",
  "extend_curve",
  "offset_curve",
  "mirror_entities",
  "pattern_entities",
  "fillet_curves",
  "chamfer_curves",
  "project_curve",
  "intersect_curves",
  "get_sketch_info",
  "get_entities",
  "get_constraints",
  "get_dimensions",
  "solve_sketch",
  "analyze_degrees_of_freedom",
  "auto_dimension",
  "convert_to_reference",
  "convert_to_active",
  "attach_to_plane",
  "reattach_sketch",
] as const;
export type NXSketchCommand = (typeof NX_SKETCH_COMMANDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Geometry Primitives
// ────────────────────────────────────────────────────────────────────────────

export const NXPoint2DSchema = z.object({
  x: z.number().describe("X coordinate in sketch units"),
  y: z.number().describe("Y coordinate in sketch units"),
});
export type NXPoint2D = z.infer<typeof NXPoint2DSchema>;

export const NXPoint3DSchema = z.object({
  x: z.number().describe("X coordinate in part units"),
  y: z.number().describe("Y coordinate in part units"),
  z: z.number().describe("Z coordinate in part units"),
});
export type NXPoint3D = z.infer<typeof NXPoint3DSchema>;

export const NXVector3DSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type NXVector3D = z.infer<typeof NXVector3DSchema>;

export const NXPlaneSchema = z.object({
  origin: NXPoint3DSchema.describe("Plane origin in part coordinates"),
  normal: NXVector3DSchema.describe("Plane normal vector"),
  xDirection: NXVector3DSchema.optional().describe("Plane X direction for sketch orientation"),
});
export type NXPlane = z.infer<typeof NXPlaneSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Sketch Entities
// ────────────────────────────────────────────────────────────────────────────

export const NXSketchLineSchema = z.object({
  entityType: z.literal("line"),
  entityId: z.string(),
  startPoint: NXPoint2DSchema,
  endPoint: NXPoint2DSchema,
  isConstruction: z.boolean().default(false),
  isCenterline: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchLine = z.infer<typeof NXSketchLineSchema>;

export const NXSketchArcSchema = z.object({
  entityType: z.literal("arc"),
  entityId: z.string(),
  center: NXPoint2DSchema,
  radius: z.number().positive(),
  startAngle: z.number().describe("Start angle in degrees"),
  endAngle: z.number().describe("End angle in degrees"),
  isClockwise: z.boolean().default(false),
  isConstruction: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchArc = z.infer<typeof NXSketchArcSchema>;

export const NXSketchCircleSchema = z.object({
  entityType: z.literal("circle"),
  entityId: z.string(),
  center: NXPoint2DSchema,
  radius: z.number().positive(),
  isConstruction: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchCircle = z.infer<typeof NXSketchCircleSchema>;

export const NXSketchEllipseSchema = z.object({
  entityType: z.literal("ellipse"),
  entityId: z.string(),
  center: NXPoint2DSchema,
  majorRadius: z.number().positive(),
  minorRadius: z.number().positive(),
  rotationAngle: z.number().default(0).describe("Rotation angle in degrees"),
  isConstruction: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchEllipse = z.infer<typeof NXSketchEllipseSchema>;

export const NXSketchEllipseArcSchema = z.object({
  entityType: z.literal("ellipse_arc"),
  entityId: z.string(),
  center: NXPoint2DSchema,
  majorRadius: z.number().positive(),
  minorRadius: z.number().positive(),
  rotationAngle: z.number().default(0).describe("Rotation angle in degrees"),
  startAngle: z.number().describe("Start angle in degrees"),
  endAngle: z.number().describe("End angle in degrees"),
  isConstruction: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchEllipseArc = z.infer<typeof NXSketchEllipseArcSchema>;

export const NXSplinePointSchema = z.object({
  point: NXPoint2DSchema,
  tangentIn: NXPoint2DSchema.optional().describe("Incoming tangent vector"),
  tangentOut: NXPoint2DSchema.optional().describe("Outgoing tangent vector"),
  weight: z.number().positive().default(1).describe("NURBS weight"),
});
export type NXSplinePoint = z.infer<typeof NXSplinePointSchema>;

export const NXSketchSplineSchema = z.object({
  entityType: z.literal("spline"),
  entityId: z.string(),
  points: z.array(NXSplinePointSchema).min(2),
  degree: z.number().int().min(1).max(24).default(3),
  isClosed: z.boolean().default(false),
  isPeriodic: z.boolean().default(false),
  isConstruction: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchSpline = z.infer<typeof NXSketchSplineSchema>;

export const NXSketchConicSchema = z.object({
  entityType: z.literal("conic"),
  entityId: z.string(),
  conicType: z.enum(["parabola", "hyperbola", "general"]),
  startPoint: NXPoint2DSchema,
  endPoint: NXPoint2DSchema,
  shoulderPoint: NXPoint2DSchema.optional().describe("Control point defining shape"),
  rho: z.number().min(0).max(1).optional().describe("Conic shape factor (0=ellipse, 0.5=parabola, 1=hyperbola)"),
  isConstruction: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchConic = z.infer<typeof NXSketchConicSchema>;

export const NXSketchPointSchema = z.object({
  entityType: z.literal("point"),
  entityId: z.string(),
  position: NXPoint2DSchema,
  isConstruction: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchPoint = z.infer<typeof NXSketchPointSchema>;

export const NXSketchTextSchema = z.object({
  entityType: z.literal("text"),
  entityId: z.string(),
  position: NXPoint2DSchema,
  text: z.string(),
  height: z.number().positive(),
  angle: z.number().default(0).describe("Text rotation in degrees"),
  fontName: z.string().optional(),
  isBold: z.boolean().default(false),
  isItalic: z.boolean().default(false),
  layer: z.number().int().nonnegative().optional(),
});
export type NXSketchText = z.infer<typeof NXSketchTextSchema>;

export const NXSketchEntitySchema = z.discriminatedUnion("entityType", [
  NXSketchLineSchema,
  NXSketchArcSchema,
  NXSketchCircleSchema,
  NXSketchEllipseSchema,
  NXSketchEllipseArcSchema,
  NXSketchSplineSchema,
  NXSketchConicSchema,
  NXSketchPointSchema,
  NXSketchTextSchema,
]);
export type NXSketchEntity = z.infer<typeof NXSketchEntitySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Constraints
// ────────────────────────────────────────────────────────────────────────────

export const NXGeometricConstraintSchema = z.object({
  constraintId: z.string(),
  constraintType: z.enum(NX_GEOMETRIC_CONSTRAINT_TYPES),
  entityIds: z.array(z.string()).min(1).max(4).describe("IDs of constrained entities"),
  isDriving: z.boolean().default(true),
  isActive: z.boolean().default(true),
});
export type NXGeometricConstraint = z.infer<typeof NXGeometricConstraintSchema>;

export const NXDimensionalConstraintSchema = z.object({
  constraintId: z.string(),
  constraintType: z.enum(NX_DIMENSIONAL_CONSTRAINT_TYPES),
  entityIds: z.array(z.string()).min(1).max(2),
  value: z.number().describe("Dimension value in sketch units"),
  expression: z.string().optional().describe("NX expression for parametric value"),
  tolerance: z.object({
    upper: z.number(),
    lower: z.number(),
    type: z.enum(["symmetric", "bilateral", "unilateral_plus", "unilateral_minus"]),
  }).optional(),
  textPosition: NXPoint2DSchema.optional().describe("Override dimension text position"),
  isDriving: z.boolean().default(true),
  isActive: z.boolean().default(true),
  prefix: z.string().optional(),
  suffix: z.string().optional(),
});
export type NXDimensionalConstraint = z.infer<typeof NXDimensionalConstraintSchema>;

export const NXSketchConstraintSchema = z.union([
  NXGeometricConstraintSchema,
  NXDimensionalConstraintSchema,
]);
export type NXSketchConstraint = z.infer<typeof NXSketchConstraintSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Sketch Status / Analysis
// ────────────────────────────────────────────────────────────────────────────

export const NXDegreeOfFreedomSchema = z.object({
  entityId: z.string(),
  freedoms: z.array(z.enum(["translate_x", "translate_y", "rotate"])),
  description: z.string(),
});
export type NXDegreeOfFreedom = z.infer<typeof NXDegreeOfFreedomSchema>;

export const NXSketchAnalysisSchema = z.object({
  status: z.enum(NX_SKETCH_STATUS),
  totalDOF: z.number().int().nonnegative().describe("Total degrees of freedom remaining"),
  entityCount: z.number().int().nonnegative(),
  constraintCount: z.number().int().nonnegative(),
  dimensionCount: z.number().int().nonnegative(),
  underConstrainedEntities: z.array(NXDegreeOfFreedomSchema),
  overConstrainedGroups: z.array(z.object({
    constraintIds: z.array(z.string()),
    conflictDescription: z.string(),
  })),
  inconsistentConstraints: z.array(z.object({
    constraintId: z.string(),
    reason: z.string(),
  })),
});
export type NXSketchAnalysis = z.infer<typeof NXSketchAnalysisSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Sketch Object
// ────────────────────────────────────────────────────────────────────────────

export const NXSketchSchema = z.object({
  sketchId: z.string(),
  name: z.string(),
  featureTag: z.string().optional().describe("NX feature tag for the sketch feature"),
  plane: NXPlaneSchema,
  origin: NXPoint3DSchema,
  entities: z.array(NXSketchEntitySchema),
  geometricConstraints: z.array(NXGeometricConstraintSchema),
  dimensionalConstraints: z.array(NXDimensionalConstraintSchema),
  status: z.enum(NX_SKETCH_STATUS),
  isActive: z.boolean().default(false).describe("Whether sketch is currently being edited"),
  isInternal: z.boolean().default(false).describe("Internal sketch (e.g., inside a feature)"),
  timestamp: z.string().datetime().optional(),
});
export type NXSketch = z.infer<typeof NXSketchSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Operation Inputs/Outputs
// ────────────────────────────────────────────────────────────────────────────

export const NXCreateLineInputSchema = z.object({
  startPoint: NXPoint2DSchema,
  endPoint: NXPoint2DSchema,
  isConstruction: z.boolean().optional(),
});
export type NXCreateLineInput = z.infer<typeof NXCreateLineInputSchema>;

export const NXCreateArcInputSchema = z.union([
  z.object({
    mode: z.literal("center_radius"),
    center: NXPoint2DSchema,
    radius: z.number().positive(),
    startAngle: z.number(),
    endAngle: z.number(),
    isClockwise: z.boolean().optional(),
  }),
  z.object({
    mode: z.literal("three_point"),
    startPoint: NXPoint2DSchema,
    midPoint: NXPoint2DSchema,
    endPoint: NXPoint2DSchema,
  }),
  z.object({
    mode: z.literal("start_end_radius"),
    startPoint: NXPoint2DSchema,
    endPoint: NXPoint2DSchema,
    radius: z.number().positive(),
    isLargeArc: z.boolean().optional(),
    isClockwise: z.boolean().optional(),
  }),
]);
export type NXCreateArcInput = z.infer<typeof NXCreateArcInputSchema>;

export const NXCreateCircleInputSchema = z.union([
  z.object({
    mode: z.literal("center_radius"),
    center: NXPoint2DSchema,
    radius: z.number().positive(),
  }),
  z.object({
    mode: z.literal("center_diameter"),
    center: NXPoint2DSchema,
    diameter: z.number().positive(),
  }),
  z.object({
    mode: z.literal("three_point"),
    point1: NXPoint2DSchema,
    point2: NXPoint2DSchema,
    point3: NXPoint2DSchema,
  }),
]);
export type NXCreateCircleInput = z.infer<typeof NXCreateCircleInputSchema>;

export const NXCreateSplineInputSchema = z.object({
  points: z.array(NXPoint2DSchema).min(2),
  degree: z.number().int().min(1).max(24).optional(),
  isClosed: z.boolean().optional(),
  tangentStart: NXPoint2DSchema.optional(),
  tangentEnd: NXPoint2DSchema.optional(),
});
export type NXCreateSplineInput = z.infer<typeof NXCreateSplineInputSchema>;

export const NXTrimInputSchema = z.object({
  entityId: z.string().describe("Entity to trim"),
  trimPoint: NXPoint2DSchema.describe("Point near where to trim"),
  boundaryEntityIds: z.array(z.string()).optional().describe("Entities to trim to"),
});
export type NXTrimInput = z.infer<typeof NXTrimInputSchema>;

export const NXOffsetInputSchema = z.object({
  entityIds: z.array(z.string()).min(1),
  distance: z.number(),
  side: z.enum(["left", "right", "both"]).optional(),
  makeConstruction: z.boolean().optional(),
});
export type NXOffsetInput = z.infer<typeof NXOffsetInputSchema>;

export const NXMirrorInputSchema = z.object({
  entityIds: z.array(z.string()).min(1),
  mirrorLineId: z.string().describe("Centerline or line to mirror about"),
  copy: z.boolean().default(true).describe("Create copies vs move"),
});
export type NXMirrorInput = z.infer<typeof NXMirrorInputSchema>;

export const NXPatternInputSchema = z.object({
  entityIds: z.array(z.string()).min(1),
  patternType: z.enum(["linear", "circular"]),
  xCount: z.number().int().positive().optional(),
  yCount: z.number().int().positive().optional(),
  xSpacing: z.number().optional(),
  ySpacing: z.number().optional(),
  angularCount: z.number().int().positive().optional(),
  angularSpacing: z.number().optional(),
  center: NXPoint2DSchema.optional().describe("Center for circular pattern"),
});
export type NXPatternInput = z.infer<typeof NXPatternInputSchema>;

export const NXFilletInputSchema = z.object({
  entityId1: z.string(),
  entityId2: z.string(),
  radius: z.number().positive(),
  trimInputCurves: z.boolean().default(true),
});
export type NXFilletInput = z.infer<typeof NXFilletInputSchema>;

export const NXChamferInputSchema = z.object({
  entityId1: z.string(),
  entityId2: z.string(),
  distance1: z.number().positive(),
  distance2: z.number().positive().optional().describe("If not provided, symmetric chamfer"),
});
export type NXChamferInput = z.infer<typeof NXChamferInputSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Command Result
// ────────────────────────────────────────────────────────────────────────────

export const NXSketchResultSchema = z.object({
  success: z.boolean(),
  command: z.enum(NX_SKETCH_COMMANDS),
  sketchId: z.string().optional(),
  createdEntityIds: z.array(z.string()).optional(),
  modifiedEntityIds: z.array(z.string()).optional(),
  deletedEntityIds: z.array(z.string()).optional(),
  constraintId: z.string().optional(),
  analysis: NXSketchAnalysisSchema.optional(),
  sketch: NXSketchSchema.optional(),
  error: z.string().optional(),
  warnings: z.array(z.string()).optional(),
});
export type NXSketchResult = z.infer<typeof NXSketchResultSchema>;
