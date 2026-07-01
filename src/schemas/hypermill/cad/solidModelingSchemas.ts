/**
 * Solid Modeling Parameter Schemas — hyperCAD-S Solid Operations
 *
 * U-HKC08: Zod schemas for 11 solid modeling operation types used in hyperCAD-S.
 * Each schema defines the parameter set the AC Python API accepts when creating
 * or editing a solid modeling feature.
 *
 * AC Python call pattern:
 *   hm.solid.extrude(sketch_ref=<ref>, direction='normal', distance=25.0, ...)
 *
 * @domain CAD-Solid
 * @milestone HM-KC-MS1/U-HKC08
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every solid operation type */
export interface SolidOperationMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Extrude ───────────────────────────────────────────────────────────────

export const extrudeSchema = z.object({
  direction: z
    .enum(["normal", "reverse", "symmetric", "two_sides"])
    .default("normal")
    .describe("Extrusion direction relative to the sketch plane normal"),
  distance: z
    .number()
    .min(0.001)
    .max(100000)
    .describe("Extrusion distance along the direction vector, mm"),
  distance_2: z
    .number()
    .min(0)
    .max(100000)
    .default(0)
    .describe("Second side distance for two_sides mode, mm (ignored if direction != two_sides)"),
  taper_angle: z
    .number()
    .min(-89)
    .max(89)
    .default(0)
    .describe("Draft taper angle applied along extrusion, degrees (DFM: keep <= 5 for moldability)"),
  draft_inward: z
    .boolean()
    .default(false)
    .describe("Taper direction: false = outward (expands), true = inward (shrinks)"),
  boolean_type: z
    .enum(["new_body", "add", "cut", "intersect"])
    .default("new_body")
    .describe("Boolean operation with existing body"),
  cap_end: z
    .boolean()
    .default(true)
    .describe("Close the end face of the extrusion (false = open shell)"),
});

export type Extrude = z.infer<typeof extrudeSchema>;

// ── 2. Revolve ───────────────────────────────────────────────────────────────

export const revolveSchema = z.object({
  axis: z
    .enum(["x_axis", "y_axis", "z_axis", "sketch_line", "custom"])
    .default("sketch_line")
    .describe("Revolution axis reference"),
  angle: z
    .number()
    .min(0.1)
    .max(360)
    .default(360)
    .describe("Revolution sweep angle, degrees"),
  direction: z
    .enum(["clockwise", "counter_clockwise", "symmetric"])
    .default("counter_clockwise")
    .describe("Revolution direction around the axis"),
  boolean_type: z
    .enum(["new_body", "add", "cut", "intersect"])
    .default("new_body")
    .describe("Boolean operation with existing body"),
});

export type Revolve = z.infer<typeof revolveSchema>;

// ── 3. Sweep ─────────────────────────────────────────────────────────────────

export const sweepSchema = z.object({
  path_type: z
    .enum(["single_path", "guide_rail", "guide_surface"])
    .default("single_path")
    .describe("How the sweep path is defined"),
  twist_angle: z
    .number()
    .min(-3600)
    .max(3600)
    .default(0)
    .describe("Total twist applied to the profile along the sweep path, degrees"),
  scale_factor: z
    .number()
    .min(0.01)
    .max(100)
    .default(1.0)
    .describe("Scale factor applied to the profile from start to end (1.0 = uniform)"),
  orientation: z
    .enum(["follow_path", "keep_normal", "keep_parallel"])
    .default("follow_path")
    .describe("Profile orientation mode along the sweep path"),
  boolean_type: z
    .enum(["new_body", "add", "cut", "intersect"])
    .default("new_body")
    .describe("Boolean operation with existing body"),
  merge_tangent_faces: z
    .boolean()
    .default(true)
    .describe("Merge adjacent tangent faces in the result for cleaner geometry"),
});

export type Sweep = z.infer<typeof sweepSchema>;

// ── 4. Loft ──────────────────────────────────────────────────────────────────

export const loftSchema = z.object({
  continuity_start: z
    .enum(["g0", "g1", "g2"])
    .default("g0")
    .describe("Surface continuity at the start profile (G0=positional, G1=tangent, G2=curvature)"),
  continuity_end: z
    .enum(["g0", "g1", "g2"])
    .default("g0")
    .describe("Surface continuity at the end profile"),
  guide_mode: z
    .enum(["none", "centerline", "rails"])
    .default("none")
    .describe("Guide curve mode that controls the shape between profiles"),
  closed_loft: z
    .boolean()
    .default(false)
    .describe("Connect the last profile back to the first for a closed loop"),
  boolean_type: z
    .enum(["new_body", "add", "cut", "intersect"])
    .default("new_body")
    .describe("Boolean operation with existing body"),
});

export type Loft = z.infer<typeof loftSchema>;

// ── 5. Shell ─────────────────────────────────────────────────────────────────

export const shellSchema = z.object({
  wall_thickness: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Uniform wall thickness for the shell, mm (DFM: >= 1.0mm for CNC, >= 0.8mm for injection)"),
  direction: z
    .enum(["inward", "outward", "both"])
    .default("inward")
    .describe("Shell offset direction from the selected faces"),
  open_faces_count: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(1)
    .describe("Number of faces to remove (open) when creating the shell"),
  uniform: z
    .boolean()
    .default(true)
    .describe("True = uniform thickness on all walls; false = per-face thickness overrides allowed"),
});

export type Shell = z.infer<typeof shellSchema>;

// ── 6. Draft ─────────────────────────────────────────────────────────────────

export const draftSchema = z.object({
  draft_angle: z
    .number()
    .min(0.1)
    .max(60)
    .describe("Draft angle applied to selected faces, degrees (DFM: 1-3 typical for molds)"),
  pull_direction: z
    .enum(["normal_to_parting", "custom_vector", "face_normal"])
    .default("normal_to_parting")
    .describe("Direction vector defining the mold pull or part removal axis"),
  fixed_edge: z
    .boolean()
    .default(true)
    .describe("Keep the parting line edge fixed while tilting the face"),
  stepped_draft: z
    .boolean()
    .default(false)
    .describe("Apply stepped draft (split face at parting line) instead of smooth tilt"),
  tangent_propagation: z
    .boolean()
    .default(true)
    .describe("Automatically extend draft to tangent-connected faces"),
});

export type Draft = z.infer<typeof draftSchema>;

// ── 7. Fillet ────────────────────────────────────────────────────────────────

export const filletSchema = z.object({
  radius: z
    .number()
    .min(0.01)
    .max(10000)
    .describe("Fillet radius, mm (DFM: internal corners >= tool radius for machinability)"),
  variable_radius: z
    .boolean()
    .default(false)
    .describe("Enable variable radius fillet with control points along the edge"),
  radius_start: z
    .number()
    .min(0.01)
    .max(10000)
    .optional()
    .describe("Start radius for variable fillet, mm (only when variable_radius = true)"),
  radius_end: z
    .number()
    .min(0.01)
    .max(10000)
    .optional()
    .describe("End radius for variable fillet, mm (only when variable_radius = true)"),
  face_blend: z
    .boolean()
    .default(false)
    .describe("Use face-blend mode (fillet between two faces instead of along edges)"),
  continuity: z
    .enum(["g1", "g2"])
    .default("g1")
    .describe("Cross-section continuity: G1 = circular arc, G2 = curvature-continuous"),
  overflow_handling: z
    .enum(["trim", "keep", "error"])
    .default("trim")
    .describe("How to handle fillets that overlap adjacent features"),
});

export type Fillet = z.infer<typeof filletSchema>;

// ── 8. Chamfer ───────────────────────────────────────────────────────────────

export const chamferSchema = z.object({
  chamfer_type: z
    .enum(["equal_distance", "two_distances", "distance_angle"])
    .default("equal_distance")
    .describe("Chamfer definition method"),
  distance_1: z
    .number()
    .min(0.01)
    .max(10000)
    .describe("Primary chamfer setback distance, mm"),
  distance_2: z
    .number()
    .min(0.01)
    .max(10000)
    .optional()
    .describe("Second distance for two_distances mode, mm"),
  angle: z
    .number()
    .min(0.1)
    .max(89.9)
    .default(45)
    .describe("Chamfer angle for distance_angle mode, degrees"),
  flip_direction: z
    .boolean()
    .default(false)
    .describe("Swap the two distance references (which face gets distance_1 vs distance_2)"),
});

export type Chamfer = z.infer<typeof chamferSchema>;

// ── 9. Boolean ───────────────────────────────────────────────────────────────

export const booleanSchema = z.object({
  operation: z
    .enum(["unite", "subtract", "intersect"])
    .describe("Boolean operation type"),
  keep_tools: z
    .boolean()
    .default(false)
    .describe("Keep the tool bodies after the boolean operation (non-destructive)"),
  simplify_result: z
    .boolean()
    .default(true)
    .describe("Merge coincident faces and edges in the result"),
  tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.001)
    .describe("Geometric tolerance for face matching during boolean, mm"),
});

export type BooleanOp = z.infer<typeof booleanSchema>;

// ── 10. Pattern (3D) ─────────────────────────────────────────────────────────

export const pattern3dSchema = z.object({
  pattern_type: z
    .enum(["linear", "circular", "mirror"])
    .default("linear")
    .describe("3D pattern distribution type"),
  count_primary: z
    .number()
    .int()
    .min(2)
    .max(10000)
    .default(2)
    .describe("Number of instances along primary direction"),
  spacing_primary: z
    .number()
    .min(0.001)
    .max(100000)
    .default(10)
    .describe("Spacing between instances along primary axis, mm"),
  count_secondary: z
    .number()
    .int()
    .min(1)
    .max(10000)
    .default(1)
    .describe("Number of instances along secondary direction (1 = single row)"),
  spacing_secondary: z
    .number()
    .min(0.001)
    .max(100000)
    .default(10)
    .describe("Spacing along secondary axis, mm"),
  associative: z
    .boolean()
    .default(true)
    .describe("Keep pattern linked to the seed feature — changes propagate"),
  suppress_instances: z
    .array(z.number().int().min(0))
    .default([])
    .describe("Zero-based indices of instances to suppress (skip) in the pattern"),
});

export type Pattern3d = z.infer<typeof pattern3dSchema>;

// ── 11. Mirror ───────────────────────────────────────────────────────────────

export const mirrorSchema = z.object({
  mirror_plane: z
    .enum(["xy", "xz", "yz", "custom", "face"])
    .default("xz")
    .describe("Plane of symmetry for the mirror operation"),
  merge_result: z
    .boolean()
    .default(true)
    .describe("Merge the mirrored body with the original into a single body"),
  keep_original: z
    .boolean()
    .default(true)
    .describe("Keep the original body (false = move only, no copy)"),
  feature_pattern: z
    .boolean()
    .default(false)
    .describe("Mirror at the feature level (true) vs. body level (false)"),
});

export type Mirror = z.infer<typeof mirrorSchema>;

// ── Solid Operation Schema Map ───────────────────────────────────────────────

/** Union type of all solid modeling parameter objects */
export type SolidModelingSchemas = {
  extrude: Extrude;
  revolve: Revolve;
  sweep: Sweep;
  loft: Loft;
  shell: Shell;
  draft: Draft;
  fillet: Fillet;
  chamfer: Chamfer;
  boolean: BooleanOp;
  pattern: Pattern3d;
  mirror: Mirror;
};

/** Flat map from operation name to its Zod schema */
export const SOLID_OPERATION_SCHEMA_MAP = {
  extrude: extrudeSchema,
  revolve: revolveSchema,
  sweep: sweepSchema,
  loft: loftSchema,
  shell: shellSchema,
  draft: draftSchema,
  fillet: filletSchema,
  chamfer: chamferSchema,
  boolean: booleanSchema,
  pattern: pattern3dSchema,
  mirror: mirrorSchema,
} as const;

// ── Solid Operation Metadata ─────────────────────────────────────────────────

export const SOLID_OPERATION_METADATA: Record<string, SolidOperationMeta> = {
  extrude: {
    paramCount: 7,
    acPythonSetter:
      "hm.solid.extrude(sketch_ref={sketch}, direction='{direction}', distance={distance}, distance_2={distance_2}, taper={taper_angle}, draft_inward={draft_inward}, bool='{boolean_type}', cap={cap_end})",
    description: "Creates a prismatic solid by sweeping a sketch profile along its normal",
    dfmCriticalParams: ["taper_angle"],
  },
  revolve: {
    paramCount: 4,
    acPythonSetter:
      "hm.solid.revolve(sketch_ref={sketch}, axis='{axis}', angle={angle}, dir='{direction}', bool='{boolean_type}')",
    description: "Creates a solid of revolution by rotating a sketch profile around an axis",
  },
  sweep: {
    paramCount: 6,
    acPythonSetter:
      "hm.solid.sweep(profile={sketch}, path={path_ref}, path_type='{path_type}', twist={twist_angle}, scale={scale_factor}, orient='{orientation}', bool='{boolean_type}', merge_tangent={merge_tangent_faces})",
    description: "Creates a solid by sweeping a profile along a path curve with optional twist and scale",
  },
  loft: {
    paramCount: 5,
    acPythonSetter:
      "hm.solid.loft(profiles=[{profiles}], cont_start='{continuity_start}', cont_end='{continuity_end}', guide='{guide_mode}', closed={closed_loft}, bool='{boolean_type}')",
    description: "Creates a solid by blending between two or more cross-section profiles",
  },
  shell: {
    paramCount: 4,
    acPythonSetter:
      "hm.solid.shell(body={body_ref}, faces=[{open_faces}], thickness={wall_thickness}, dir='{direction}', uniform={uniform})",
    description: "Hollows out a solid body leaving walls of specified thickness",
    dfmCriticalParams: ["wall_thickness"],
  },
  draft: {
    paramCount: 5,
    acPythonSetter:
      "hm.solid.draft(faces=[{faces}], angle={draft_angle}, pull='{pull_direction}', fixed_edge={fixed_edge}, stepped={stepped_draft}, propagate={tangent_propagation})",
    description: "Adds a taper angle to faces for mold release or manufacturing clearance",
    dfmCriticalParams: ["draft_angle"],
  },
  fillet: {
    paramCount: 7,
    acPythonSetter:
      "hm.solid.fillet(edges=[{edges}], radius={radius}, variable={variable_radius}, r_start={radius_start}, r_end={radius_end}, face_blend={face_blend}, cont='{continuity}', overflow='{overflow_handling}')",
    description: "Rounds edges with a constant or variable radius blend",
    dfmCriticalParams: ["radius"],
  },
  chamfer: {
    paramCount: 5,
    acPythonSetter:
      "hm.solid.chamfer(edges=[{edges}], type='{chamfer_type}', d1={distance_1}, d2={distance_2}, angle={angle}, flip={flip_direction})",
    description: "Bevels edges with distance or distance-angle chamfer",
  },
  boolean: {
    paramCount: 4,
    acPythonSetter:
      "hm.solid.boolean(target={target_body}, tools=[{tool_bodies}], op='{operation}', keep_tools={keep_tools}, simplify={simplify_result}, tol={tolerance})",
    description: "Combines or subtracts solid bodies using unite, subtract, or intersect",
  },
  pattern: {
    paramCount: 7,
    acPythonSetter:
      "hm.solid.pattern(feature={feature_ref}, type='{pattern_type}', count1={count_primary}, spacing1={spacing_primary}, count2={count_secondary}, spacing2={spacing_secondary}, assoc={associative}, suppress=[{suppress_instances}])",
    description: "Creates a linear, circular, or mirror pattern of 3D features",
  },
  mirror: {
    paramCount: 4,
    acPythonSetter:
      "hm.solid.mirror(body={body_ref}, plane='{mirror_plane}', merge={merge_result}, keep_orig={keep_original}, feat_pattern={feature_pattern})",
    description: "Creates a mirror copy of a body or feature about a symmetry plane",
  },
};

/**
 * Total parameter count across all 11 solid modeling operation schemas.
 */
export const SOLID_TOTAL_PARAM_COUNT: number = Object.values(
  SOLID_OPERATION_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
