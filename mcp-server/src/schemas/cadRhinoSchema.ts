/**
 * cadRhinoSchema.ts — Zod schemas for RhinoCommon bridge + Grasshopper integration
 *
 * Covers:
 *   - Rhino 3DM document model (objects, layers, attributes)
 *   - Geometry types (curves, surfaces, breps, meshes)
 *   - Grasshopper data trees and component I/O
 *   - Transport commands and responses
 *
 * @module schemas/cadRhinoSchema
 */

import { z } from "zod";

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const RHINO_GEOMETRY_KINDS = [
  "point",
  "curve",
  "surface",
  "brep",
  "mesh",
  "extrusion",
  "subd",
  "pointcloud",
  "annotation",
  "hatch",
  "instance_reference",
  "light",
  "clipping_plane",
  "text_dot",
  "leader",
  "dimension",
] as const;
export type RhinoGeometryKind = (typeof RHINO_GEOMETRY_KINDS)[number];

export const RHINO_CURVE_KINDS = [
  "line",
  "arc",
  "circle",
  "ellipse",
  "polyline",
  "polycurve",
  "nurbs_curve",
] as const;
export type RhinoCurveKind = (typeof RHINO_CURVE_KINDS)[number];

export const RHINO_SURFACE_KINDS = [
  "plane",
  "sphere",
  "cylinder",
  "cone",
  "torus",
  "nurbs_surface",
  "extrusion_surface",
  "revolution_surface",
  "sum_surface",
] as const;
export type RhinoSurfaceKind = (typeof RHINO_SURFACE_KINDS)[number];

export const RHINO_OBJECT_MODES = [
  "normal",
  "hidden",
  "locked",
  "reference",
] as const;
export type RhinoObjectMode = (typeof RHINO_OBJECT_MODES)[number];

export const RHINO_COMMANDS = [
  "open_document",
  "save_document",
  "new_document",
  "list_objects",
  "get_object",
  "create_object",
  "delete_object",
  "transform_object",
  "duplicate_object",
  "list_layers",
  "create_layer",
  "set_layer",
  "get_bounding_box",
  "boolean_union",
  "boolean_difference",
  "boolean_intersection",
  "offset_curve",
  "offset_surface",
  "extrude_curve",
  "loft_curves",
  "sweep_one_rail",
  "sweep_two_rail",
  "revolve",
  "pipe",
  "fillet_edges",
  "chamfer_edges",
  "mesh_brep",
  "join_breps",
  "split_brep",
  "cap_planar_holes",
  "run_grasshopper",
  "gh_get_definition",
  "gh_set_slider",
  "gh_bake_geometry",
  "export_step",
  "export_iges",
  "export_stl",
  "import_geometry",
] as const;
export type RhinoCommand = (typeof RHINO_COMMANDS)[number];

// ────────────────────────────────────────────────────────────────────────────
// Core geometry schemas
// ────────────────────────────────────────────────────────────────────────────

export const Point3dSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Point3d = z.infer<typeof Point3dSchema>;

export const Vector3dSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});
export type Vector3d = z.infer<typeof Vector3dSchema>;

export const BoundingBoxSchema = z.object({
  min: Point3dSchema,
  max: Point3dSchema,
});
export type BoundingBox = z.infer<typeof BoundingBoxSchema>;

export const TransformSchema = z.object({
  m00: z.number(),
  m01: z.number(),
  m02: z.number(),
  m03: z.number(),
  m10: z.number(),
  m11: z.number(),
  m12: z.number(),
  m13: z.number(),
  m20: z.number(),
  m21: z.number(),
  m22: z.number(),
  m23: z.number(),
  m30: z.number(),
  m31: z.number(),
  m32: z.number(),
  m33: z.number(),
});
export type Transform = z.infer<typeof TransformSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Curve schemas
// ────────────────────────────────────────────────────────────────────────────

export const RhinoCurveSchema = z.object({
  curveId: z.string(),
  kind: z.enum(RHINO_CURVE_KINDS),
  degree: z.number().int().min(1).max(100),
  isClosed: z.boolean(),
  isPeriodic: z.boolean(),
  domain: z.tuple([z.number(), z.number()]),
  length: z.number().nonnegative(),
  pointCount: z.number().int().nonnegative(),
  startPoint: Point3dSchema,
  endPoint: Point3dSchema,
  boundingBox: BoundingBoxSchema,
});
export type RhinoCurve = z.infer<typeof RhinoCurveSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Surface schemas
// ────────────────────────────────────────────────────────────────────────────

export const RhinoSurfaceSchema = z.object({
  surfaceId: z.string(),
  kind: z.enum(RHINO_SURFACE_KINDS),
  degreeU: z.number().int().min(1).max(100),
  degreeV: z.number().int().min(1).max(100),
  isClosedU: z.boolean(),
  isClosedV: z.boolean(),
  domainU: z.tuple([z.number(), z.number()]),
  domainV: z.tuple([z.number(), z.number()]),
  pointCountU: z.number().int().nonnegative(),
  pointCountV: z.number().int().nonnegative(),
  boundingBox: BoundingBoxSchema,
});
export type RhinoSurface = z.infer<typeof RhinoSurfaceSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Brep schemas
// ────────────────────────────────────────────────────────────────────────────

export const RhinoBrepFaceSchema = z.object({
  faceIndex: z.number().int().nonnegative(),
  surfaceIndex: z.number().int().nonnegative(),
  outerLoopIndex: z.number().int().nonnegative(),
  loopCount: z.number().int().nonnegative(),
  area: z.number().nonnegative(),
  isSolid: z.boolean(),
});
export type RhinoBrepFace = z.infer<typeof RhinoBrepFaceSchema>;

export const RhinoBrepEdgeSchema = z.object({
  edgeIndex: z.number().int().nonnegative(),
  curveIndex: z.number().int().nonnegative(),
  startVertexIndex: z.number().int().nonnegative(),
  endVertexIndex: z.number().int().nonnegative(),
  tolerance: z.number().nonnegative(),
  length: z.number().nonnegative(),
});
export type RhinoBrepEdge = z.infer<typeof RhinoBrepEdgeSchema>;

export const RhinoBrepSchema = z.object({
  brepId: z.string(),
  isSolid: z.boolean(),
  isManifold: z.boolean(),
  faceCount: z.number().int().nonnegative(),
  edgeCount: z.number().int().nonnegative(),
  vertexCount: z.number().int().nonnegative(),
  faces: z.array(RhinoBrepFaceSchema),
  edges: z.array(RhinoBrepEdgeSchema),
  volume: z.number().optional(),
  area: z.number().nonnegative(),
  boundingBox: BoundingBoxSchema,
});
export type RhinoBrep = z.infer<typeof RhinoBrepSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Mesh schemas
// ────────────────────────────────────────────────────────────────────────────

export const RhinoMeshSchema = z.object({
  meshId: z.string(),
  vertexCount: z.number().int().nonnegative(),
  faceCount: z.number().int().nonnegative(),
  normalCount: z.number().int().nonnegative(),
  hasVertexColors: z.boolean(),
  hasTextureCoordinates: z.boolean(),
  isClosed: z.boolean(),
  isManifold: z.boolean(),
  volume: z.number().optional(),
  area: z.number().nonnegative(),
  boundingBox: BoundingBoxSchema,
});
export type RhinoMesh = z.infer<typeof RhinoMeshSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Object + layer schemas
// ────────────────────────────────────────────────────────────────────────────

export const RhinoObjectAttributesSchema = z.object({
  name: z.string(),
  layerIndex: z.number().int().nonnegative(),
  colorSource: z.enum(["from_layer", "from_object", "from_material", "from_parent"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  materialIndex: z.number().int().optional(),
  linetype: z.string().optional(),
  mode: z.enum(RHINO_OBJECT_MODES),
  userStrings: z.record(z.string(), z.string()).default({}),
});
export type RhinoObjectAttributes = z.infer<typeof RhinoObjectAttributesSchema>;

export const RhinoObjectSchema = z.object({
  objectId: z.string().uuid(),
  kind: z.enum(RHINO_GEOMETRY_KINDS),
  attributes: RhinoObjectAttributesSchema,
  boundingBox: BoundingBoxSchema,
  isValid: z.boolean(),
  isDeleted: z.boolean(),
  // Geometry payload is optional; full geometry retrieval is a separate call.
  geometry: z.union([RhinoCurveSchema, RhinoSurfaceSchema, RhinoBrepSchema, RhinoMeshSchema]).optional(),
});
export type RhinoObject = z.infer<typeof RhinoObjectSchema>;

export const RhinoLayerSchema = z.object({
  layerIndex: z.number().int().nonnegative(),
  name: z.string(),
  fullPath: z.string(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isVisible: z.boolean(),
  isLocked: z.boolean(),
  parentIndex: z.number().int().optional(),
  childCount: z.number().int().nonnegative(),
});
export type RhinoLayer = z.infer<typeof RhinoLayerSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Document schema
// ────────────────────────────────────────────────────────────────────────────

export const RhinoDocumentSchema = z.object({
  documentId: z.string(),
  path: z.string().optional(),
  name: z.string(),
  units: z.enum(["millimeters", "centimeters", "meters", "inches", "feet"]),
  tolerances: z.object({
    absolute: z.number().positive(),
    relative: z.number().positive(),
    angle: z.number().positive(),
  }),
  objectCount: z.number().int().nonnegative(),
  layerCount: z.number().int().nonnegative(),
  isModified: z.boolean(),
  version: z.string(),
});
export type RhinoDocument = z.infer<typeof RhinoDocumentSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Grasshopper schemas
// ────────────────────────────────────────────────────────────────────────────

export const GHDataTreePathSchema = z.object({
  indices: z.array(z.number().int().nonnegative()),
});
export type GHDataTreePath = z.infer<typeof GHDataTreePathSchema>;

export const GHDataTreeBranchSchema = z.object({
  path: GHDataTreePathSchema,
  itemCount: z.number().int().nonnegative(),
  typeName: z.string(),
});
export type GHDataTreeBranch = z.infer<typeof GHDataTreeBranchSchema>;

export const GHDataTreeSchema = z.object({
  branchCount: z.number().int().nonnegative(),
  itemCount: z.number().int().nonnegative(),
  branches: z.array(GHDataTreeBranchSchema),
});
export type GHDataTree = z.infer<typeof GHDataTreeSchema>;

export const GHSliderSchema = z.object({
  instanceGuid: z.string().uuid(),
  name: z.string(),
  minimum: z.number(),
  maximum: z.number(),
  currentValue: z.number(),
  decimalPlaces: z.number().int().nonnegative(),
  type: z.enum(["float", "integer", "even", "odd"]),
});
export type GHSlider = z.infer<typeof GHSliderSchema>;

export const GHComponentSchema = z.object({
  instanceGuid: z.string().uuid(),
  name: z.string(),
  nickname: z.string(),
  category: z.string(),
  subcategory: z.string(),
  inputCount: z.number().int().nonnegative(),
  outputCount: z.number().int().nonnegative(),
  isEnabled: z.boolean(),
  runtimeMessages: z.array(z.object({
    level: z.enum(["blank", "remark", "warning", "error"]),
    message: z.string(),
  })),
});
export type GHComponent = z.infer<typeof GHComponentSchema>;

export const GHDefinitionSchema = z.object({
  definitionId: z.string().uuid(),
  path: z.string().optional(),
  name: z.string(),
  componentCount: z.number().int().nonnegative(),
  sliderCount: z.number().int().nonnegative(),
  sliders: z.array(GHSliderSchema),
  components: z.array(GHComponentSchema),
  isExpired: z.boolean(),
});
export type GHDefinition = z.infer<typeof GHDefinitionSchema>;

// ────────────────────────────────────────────────────────────────────────────
// Transport / response schemas
// ────────────────────────────────────────────────────────────────────────────

export const RhinoResponseSchema = z.object({
  ok: z.boolean(),
  error: z.string().optional(),
  result: z.unknown().optional(),
});
export type RhinoResponse = z.infer<typeof RhinoResponseSchema>;

export const RhinoCallLogEntrySchema = z.object({
  command: z.enum(RHINO_COMMANDS),
  args: z.record(z.string(), z.unknown()),
  ok: z.boolean(),
  error: z.string().optional(),
  durationMs: z.number().nonnegative(),
  at: z.string().datetime(),
});
export type RhinoCallLogEntry = z.infer<typeof RhinoCallLogEntrySchema>;

// ────────────────────────────────────────────────────────────────────────────
// Export parameters
// ────────────────────────────────────────────────────────────────────────────

export const RhinoExportOptionsSchema = z.object({
  format: z.enum(["step", "iges", "stl", "obj", "3dm", "fbx", "dxf"]),
  // STEP options
  stepSchema: z.enum(["AP203", "AP214", "AP242"]).optional(),
  // STL options
  stlBinary: z.boolean().optional(),
  stlAngleTolerance: z.number().positive().optional(),
  stlLinearTolerance: z.number().positive().optional(),
  // General
  exportSelectedOnly: z.boolean().default(false),
});
export type RhinoExportOptions = z.infer<typeof RhinoExportOptionsSchema>;
