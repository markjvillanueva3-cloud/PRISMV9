/**
 * Sketch Constraint Schemas — hyperCAD-S Parametric Sketch Engine
 *
 * U-HKC07: Zod schemas for 20 sketch constraint types used in hyperCAD-S
 * geometric constraint solving. Each schema defines the parameter set that
 * the AC Python API accepts when applying or editing a constraint.
 *
 * AC Python call pattern uses named keyword arguments on the HyperCAD
 * Sketch.Constraint namespace, e.g.:
 *   hm.sketch.add_coincident(entity1=<ref>, entity2=<ref>, tolerance=0.01)
 *
 * @domain CAD-Sketch
 * @milestone HM-KC-MS1/U-HKC07
 */

import { z } from "zod";

// ── Shared helper types ────────────────────────────────────────────────────────

/** Metadata record shape for every constraint type */
export interface ConstraintMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template — {placeholders} map to param names */
  acPythonSetter: string;
  /** Human-readable description of what the constraint enforces */
  description: string;
  /** Measurement unit string for the primary value, if applicable */
  unit?: string;
}

// ── 1. Coincident ──────────────────────────────────────────────────────────────

export const coincidentConstraintSchema = z.object({
  point_snap_tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.01)
    .describe("Maximum point distance that counts as coincident, mm"),
  merge_points: z
    .boolean()
    .default(true)
    .describe("Merge the two endpoints into a single shared vertex"),
});

export type CoincidentConstraint = z.infer<typeof coincidentConstraintSchema>;

// ── 2. Tangent ─────────────────────────────────────────────────────────────────

export const tangentConstraintSchema = z.object({
  curve_type: z
    .enum(["arc", "b_spline", "circle", "conic", "ellipse", "line", "spline"])
    .default("line")
    .describe("Geometry class of the entity receiving tangency"),
  tangent_side: z
    .enum(["auto", "external", "internal"])
    .default("auto")
    .describe("Which side of the curve the tangency is applied — auto resolves from topology"),
  continuity_order: z
    .enum(["g1", "g2"])
    .default("g1")
    .describe("Continuity order: G1 = tangent direction, G2 = curvature continuous"),
});

export type TangentConstraint = z.infer<typeof tangentConstraintSchema>;

// ── 3. Equal ──────────────────────────────────────────────────────────────────

export const equalConstraintSchema = z.object({
  reference_entity: z
    .string()
    .min(1)
    .describe("Entity ID or label whose value is the source (radius / length)"),
  target_entity: z
    .string()
    .min(1)
    .describe("Entity ID or label that will be resized to match reference"),
  quantity: z
    .enum(["length", "radius", "angle"])
    .default("length")
    .describe("Which geometric quantity is equalized"),
});

export type EqualConstraint = z.infer<typeof equalConstraintSchema>;

// ── 4. Parallel ───────────────────────────────────────────────────────────────

export const parallelConstraintSchema = z.object({
  offset_distance: z
    .number()
    .min(0)
    .max(10000)
    .default(0)
    .describe("Perpendicular offset between the two parallel entities, mm (0 = no gap)"),
  keep_direction: z
    .boolean()
    .default(true)
    .describe("Preserve the original orientation sign (prevent 180° flip)"),
  allow_reverse: z
    .boolean()
    .default(false)
    .describe("Allow anti-parallel resolution (vectors point in opposite directions)"),
});

export type ParallelConstraint = z.infer<typeof parallelConstraintSchema>;

// ── 5. Perpendicular ──────────────────────────────────────────────────────────

export const perpendicularConstraintSchema = z.object({
  angle_tolerance: z
    .number()
    .min(0.001)
    .max(5.0)
    .default(0.1)
    .describe("Angular deviation from 90° that is still accepted as perpendicular, degrees"),
  enforce_intersection: z
    .boolean()
    .default(false)
    .describe("Extend both entities to their intersection before applying perpendicularity"),
});

export type PerpendicularConstraint = z.infer<typeof perpendicularConstraintSchema>;

// ── 6. Horizontal ─────────────────────────────────────────────────────────────

export const horizontalConstraintSchema = z.object({
  axis_lock: z
    .enum(["global_x", "sketch_x", "view_x"])
    .default("sketch_x")
    .describe("Reference axis: global world X, sketch local X, or view projection X"),
  tolerance_deg: z
    .number()
    .min(0)
    .max(2.0)
    .default(0.01)
    .describe("Angular tolerance from true horizontal, degrees"),
});

export type HorizontalConstraint = z.infer<typeof horizontalConstraintSchema>;

// ── 7. Vertical ───────────────────────────────────────────────────────────────

export const verticalConstraintSchema = z.object({
  axis_lock: z
    .enum(["global_y", "sketch_y", "view_y"])
    .default("sketch_y")
    .describe("Reference axis: global world Y, sketch local Y, or view projection Y"),
  tolerance_deg: z
    .number()
    .min(0)
    .max(2.0)
    .default(0.01)
    .describe("Angular tolerance from true vertical, degrees"),
});

export type VerticalConstraint = z.infer<typeof verticalConstraintSchema>;

// ── 8. Dimension (linear / distance) ─────────────────────────────────────────

export const dimensionConstraintSchema = z.object({
  value: z
    .number()
    .min(0)
    .max(100000)
    .describe("Driven dimension value, mm"),
  tolerance_upper: z
    .number()
    .min(0)
    .max(50)
    .default(0.05)
    .describe("Upper tolerance band (+), mm"),
  tolerance_lower: z
    .number()
    .min(-50)
    .max(0)
    .default(-0.05)
    .describe("Lower tolerance band (−), mm"),
  display_format: z
    .enum(["bilateral", "limit", "nominal", "unilateral_lower", "unilateral_upper"])
    .default("nominal")
    .describe("How the dimension is displayed in the sketch view"),
  driving: z
    .boolean()
    .default(true)
    .describe("True = driving dimension (controls geometry), false = reference only"),
});

export type DimensionConstraint = z.infer<typeof dimensionConstraintSchema>;

// ── 9. Radius ─────────────────────────────────────────────────────────────────

export const radiusConstraintSchema = z.object({
  value: z
    .number()
    .min(0.001)
    .max(100000)
    .describe("Target radius value, mm"),
  center_locked: z
    .boolean()
    .default(false)
    .describe("Fix the arc/circle center point in place while resizing radius"),
  min_radius: z
    .number()
    .min(0.001)
    .default(0.1)
    .describe("Lower bound enforced by constraint solver, mm"),
  max_radius: z
    .number()
    .min(0.001)
    .default(10000)
    .describe("Upper bound enforced by constraint solver, mm"),
  display_diameter: z
    .boolean()
    .default(false)
    .describe("Show as diameter dimension in annotations"),
});

export type RadiusConstraint = z.infer<typeof radiusConstraintSchema>;

// ── 10. Angle ─────────────────────────────────────────────────────────────────

export const angleConstraintSchema = z.object({
  value: z
    .number()
    .min(0)
    .max(360)
    .describe("Angle value, degrees"),
  reference_line: z
    .enum(["entity_start_tangent", "sketch_x_axis", "sketch_y_axis"])
    .default("sketch_x_axis")
    .describe("The axis or entity edge from which the angle is measured"),
  direction: z
    .enum(["ccw", "cw"])
    .default("ccw")
    .describe("Positive rotation direction"),
  supplementary: z
    .boolean()
    .default(false)
    .describe("Use the supplementary (180° − value) angle as the constraint target"),
});

export type AngleConstraint = z.infer<typeof angleConstraintSchema>;

// ── 11. Concentric ────────────────────────────────────────────────────────────

export const concentricConstraintSchema = z.object({
  snap_tolerance: z
    .number()
    .min(0.001)
    .max(5.0)
    .default(0.05)
    .describe("Distance within which two centers are snapped to coincide, mm"),
  merge_centers: z
    .boolean()
    .default(true)
    .describe("Merge the two center points into a single shared point"),
  lock_primary: z
    .boolean()
    .default(false)
    .describe("Keep the primary entity's center fixed — move the secondary to align"),
});

export type ConcentricConstraint = z.infer<typeof concentricConstraintSchema>;

// ── 12. Symmetric ─────────────────────────────────────────────────────────────

export const symmetricConstraintSchema = z.object({
  axis_entity: z
    .string()
    .min(1)
    .describe("Entity ID or label of the symmetry axis line"),
  mirror_side: z
    .enum(["auto", "left", "right"])
    .default("auto")
    .describe("Which side is driven (mirrored) vs. fixed (master)"),
  position_only: z
    .boolean()
    .default(false)
    .describe("Enforce positional symmetry only, ignore size/angle differences"),
});

export type SymmetricConstraint = z.infer<typeof symmetricConstraintSchema>;

// ── 13. Midpoint ──────────────────────────────────────────────────────────────

export const midpointConstraintSchema = z.object({
  target_curve: z
    .string()
    .min(1)
    .describe("Entity ID of the curve whose midpoint is the target"),
  parameterized: z
    .boolean()
    .default(true)
    .describe("Use parametric midpoint (t=0.5) — disable for polylines to use length midpoint"),
  snap_tolerance: z
    .number()
    .min(0.001)
    .max(2.0)
    .default(0.05)
    .describe("Point-to-midpoint snap distance before applying the constraint, mm"),
});

export type MidpointConstraint = z.infer<typeof midpointConstraintSchema>;

// ── 14. Fix ───────────────────────────────────────────────────────────────────

export const fixConstraintSchema = z.object({
  fix_position: z
    .boolean()
    .default(true)
    .describe("Fix the entity's position (XY translation locked)"),
  fix_rotation: z
    .boolean()
    .default(false)
    .describe("Also fix the entity's orientation (rotation locked)"),
  fix_size: z
    .boolean()
    .default(false)
    .describe("Also lock the entity's size (radius/length cannot change)"),
});

export type FixConstraint = z.infer<typeof fixConstraintSchema>;

// ── 15. Lock ──────────────────────────────────────────────────────────────────

export const lockConstraintSchema = z.object({
  lock_x: z
    .boolean()
    .default(true)
    .describe("Prevent translation along the sketch X axis"),
  lock_y: z
    .boolean()
    .default(true)
    .describe("Prevent translation along the sketch Y axis"),
  lock_all: z
    .boolean()
    .default(false)
    .describe("Override individual axis flags — lock every degree of freedom"),
});

export type LockConstraint = z.infer<typeof lockConstraintSchema>;

// ── 16. Offset ────────────────────────────────────────────────────────────────

export const offsetConstraintSchema = z.object({
  distance: z
    .number()
    .min(-10000)
    .max(10000)
    .describe("Signed perpendicular offset from the reference entity, mm"),
  reference_entity: z
    .string()
    .min(1)
    .describe("Entity ID of the curve or line being offset from"),
  flip_side: z
    .boolean()
    .default(false)
    .describe("Flip the offset to the opposite normal side"),
  bidirectional: z
    .boolean()
    .default(false)
    .describe("Create a symmetric double-sided offset"),
});

export type OffsetConstraint = z.infer<typeof offsetConstraintSchema>;

// ── 17. Colinear ──────────────────────────────────────────────────────────────

export const colinearConstraintSchema = z.object({
  tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.001)
    .describe("Maximum lateral deviation from the shared infinite line, mm"),
  extend_to_meet: z
    .boolean()
    .default(false)
    .describe("Extend shorter segments to fill the gap between them"),
});

export type ColinearConstraint = z.infer<typeof colinearConstraintSchema>;

// ── 18. Pattern (Sketch) ──────────────────────────────────────────────────────

export const sketchPatternConstraintSchema = z.object({
  pattern_type: z
    .enum(["circular", "linear"])
    .default("linear")
    .describe("Pattern topology: equally-spaced along a line or around a center"),
  count: z
    .number()
    .int()
    .min(2)
    .max(1000)
    .default(2)
    .describe("Total number of instances including the original"),
  spacing: z
    .number()
    .min(0.001)
    .max(100000)
    .default(10)
    .describe("Distance between instances (linear) or arc angle per step (circular), mm or degrees"),
  angle: z
    .number()
    .min(-360)
    .max(360)
    .default(0)
    .describe("Pattern direction angle from sketch X axis (linear only), degrees"),
  associative: z
    .boolean()
    .default(true)
    .describe("Keep pattern instances linked to the master — changes propagate"),
});

export type SketchPatternConstraint = z.infer<typeof sketchPatternConstraintSchema>;

// ── 19. Trim ──────────────────────────────────────────────────────────────────

export const trimConstraintSchema = z.object({
  trim_to_intersection: z
    .boolean()
    .default(true)
    .describe("Trim the entity to its nearest intersection with any crossing entity"),
  keep_side: z
    .enum(["auto", "larger", "smaller"])
    .default("auto")
    .describe("Which segment to keep after trimming: auto = side closest to the cursor pick"),
  delete_remaining: z
    .boolean()
    .default(false)
    .describe("Delete the trimmed-off segment instead of leaving it as a separate entity"),
});

export type TrimConstraint = z.infer<typeof trimConstraintSchema>;

// ── 20. Extend ────────────────────────────────────────────────────────────────

export const extendConstraintSchema = z.object({
  extend_to_entity: z
    .string()
    .min(1)
    .describe("Entity ID of the boundary curve that the entity is extended to meet"),
  gap_tolerance: z
    .number()
    .min(0)
    .max(100)
    .default(0.1)
    .describe("Maximum gap between entity endpoint and the boundary before extension fails, mm"),
  tangent_extension: z
    .boolean()
    .default(true)
    .describe("Extend along the entity's end tangent direction (true) vs. shortest path (false)"),
});

export type ExtendConstraint = z.infer<typeof extendConstraintSchema>;

// ── Constraint Schema Map ─────────────────────────────────────────────────────

/** Union type of all sketch constraint parameter objects */
export type SketchConstraintSchemas = {
  coincident: CoincidentConstraint;
  tangent: TangentConstraint;
  equal: EqualConstraint;
  parallel: ParallelConstraint;
  perpendicular: PerpendicularConstraint;
  horizontal: HorizontalConstraint;
  vertical: VerticalConstraint;
  dimension: DimensionConstraint;
  radius: RadiusConstraint;
  angle: AngleConstraint;
  concentric: ConcentricConstraint;
  symmetric: SymmetricConstraint;
  midpoint: MidpointConstraint;
  fix: FixConstraint;
  lock: LockConstraint;
  offset: OffsetConstraint;
  colinear: ColinearConstraint;
  pattern: SketchPatternConstraint;
  trim: TrimConstraint;
  extend: ExtendConstraint;
};

/** Flat map from constraint name to its Zod schema object */
export const SKETCH_CONSTRAINT_SCHEMA_MAP = {
  coincident: coincidentConstraintSchema,
  tangent: tangentConstraintSchema,
  equal: equalConstraintSchema,
  parallel: parallelConstraintSchema,
  perpendicular: perpendicularConstraintSchema,
  horizontal: horizontalConstraintSchema,
  vertical: verticalConstraintSchema,
  dimension: dimensionConstraintSchema,
  radius: radiusConstraintSchema,
  angle: angleConstraintSchema,
  concentric: concentricConstraintSchema,
  symmetric: symmetricConstraintSchema,
  midpoint: midpointConstraintSchema,
  fix: fixConstraintSchema,
  lock: lockConstraintSchema,
  offset: offsetConstraintSchema,
  colinear: colinearConstraintSchema,
  pattern: sketchPatternConstraintSchema,
  trim: trimConstraintSchema,
  extend: extendConstraintSchema,
} as const;

// ── Constraint Metadata ───────────────────────────────────────────────────────

/**
 * Per-constraint metadata: param count, AC Python setter template, description.
 *
 * AC Python setter patterns follow the hyperMILL Automation Center 33.0 API.
 * Curly-brace tokens are replaced at runtime with the matching schema field value.
 */
export const SKETCH_CONSTRAINT_METADATA: Record<string, ConstraintMeta> = {
  coincident: {
    paramCount: 2,
    acPythonSetter:
      "hm.sketch.add_coincident(entity1={entity1}, entity2={entity2}, tolerance={point_snap_tolerance}, merge={merge_points})",
    description: "Makes two sketch points occupy the same position",
    unit: "mm",
  },
  tangent: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_tangent(entity1={entity1}, entity2={entity2}, curve_type='{curve_type}', side='{tangent_side}', continuity='{continuity_order}')",
    description: "Constrains two curves to meet with tangent (G1) or curvature (G2) continuity",
  },
  equal: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_equal(ref_entity={reference_entity}, target_entity={target_entity}, quantity='{quantity}')",
    description: "Forces a target entity to match the length, radius, or angle of a reference entity",
  },
  parallel: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_parallel(entity1={entity1}, entity2={entity2}, offset={offset_distance}, keep_dir={keep_direction})",
    description: "Forces two lines or edges to remain parallel; optional offset maintains separation",
    unit: "mm",
  },
  perpendicular: {
    paramCount: 2,
    acPythonSetter:
      "hm.sketch.add_perpendicular(entity1={entity1}, entity2={entity2}, tolerance={angle_tolerance}, force_intersect={enforce_intersection})",
    description: "Constrains two entities to meet at exactly 90°",
    unit: "degrees",
  },
  horizontal: {
    paramCount: 2,
    acPythonSetter:
      "hm.sketch.add_horizontal(entity={entity1}, axis='{axis_lock}', tolerance={tolerance_deg})",
    description: "Locks a line to be exactly horizontal relative to the chosen reference axis",
    unit: "degrees",
  },
  vertical: {
    paramCount: 2,
    acPythonSetter:
      "hm.sketch.add_vertical(entity={entity1}, axis='{axis_lock}', tolerance={tolerance_deg})",
    description: "Locks a line to be exactly vertical relative to the chosen reference axis",
    unit: "degrees",
  },
  dimension: {
    paramCount: 5,
    acPythonSetter:
      "hm.sketch.add_dimension(entity={entity1}, value={value}, tol_upper={tolerance_upper}, tol_lower={tolerance_lower}, format='{display_format}', driving={driving})",
    description: "Applies a driven linear dimension; can be driving (controls geometry) or reference",
    unit: "mm",
  },
  radius: {
    paramCount: 5,
    acPythonSetter:
      "hm.sketch.add_radius(entity={entity1}, value={value}, lock_center={center_locked}, min_r={min_radius}, max_r={max_radius}, show_dia={display_diameter})",
    description: "Sets an exact radius on an arc or circle with optional center lock and bounds",
    unit: "mm",
  },
  angle: {
    paramCount: 4,
    acPythonSetter:
      "hm.sketch.add_angle(entity1={entity1}, entity2={entity2}, value={value}, ref='{reference_line}', dir='{direction}', supplementary={supplementary})",
    description: "Constrains the included angle between two lines or the absolute angle of one line",
    unit: "degrees",
  },
  concentric: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_concentric(entity1={entity1}, entity2={entity2}, tolerance={snap_tolerance}, merge={merge_centers}, lock_primary={lock_primary})",
    description: "Forces two arcs or circles to share the same center point",
    unit: "mm",
  },
  symmetric: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_symmetric(entity1={entity1}, entity2={entity2}, axis={axis_entity}, side='{mirror_side}', pos_only={position_only})",
    description: "Mirrors one entity about a symmetry axis so it is geometrically symmetric with another",
  },
  midpoint: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_midpoint(point={entity1}, curve={target_curve}, parametric={parameterized}, tolerance={snap_tolerance})",
    description: "Pins a point to the exact midpoint of a curve",
    unit: "mm",
  },
  fix: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_fix(entity={entity1}, fix_pos={fix_position}, fix_rot={fix_rotation}, fix_size={fix_size})",
    description: "Prevents an entity from moving, rotating, or resizing during constraint solving",
  },
  lock: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.add_lock(entity={entity1}, lock_x={lock_x}, lock_y={lock_y}, lock_all={lock_all})",
    description: "Selectively prevents translation along one or both sketch axes",
  },
  offset: {
    paramCount: 4,
    acPythonSetter:
      "hm.sketch.add_offset(entity={entity1}, ref={reference_entity}, dist={distance}, flip={flip_side}, bidir={bidirectional})",
    description: "Maintains a constant perpendicular distance between an entity and a reference curve",
    unit: "mm",
  },
  colinear: {
    paramCount: 2,
    acPythonSetter:
      "hm.sketch.add_colinear(entity1={entity1}, entity2={entity2}, tolerance={tolerance}, extend={extend_to_meet})",
    description: "Forces two line segments to lie on the same infinite line",
    unit: "mm",
  },
  pattern: {
    paramCount: 5,
    acPythonSetter:
      "hm.sketch.add_pattern(entity={entity1}, type='{pattern_type}', count={count}, spacing={spacing}, angle={angle}, assoc={associative})",
    description: "Creates a linear or circular pattern of sketch entities with a fixed count and spacing",
  },
  trim: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.trim(entity={entity1}, to_intersection={trim_to_intersection}, keep='{keep_side}', delete_rest={delete_remaining})",
    description: "Trims a sketch entity at its nearest intersection with a crossing entity",
  },
  extend: {
    paramCount: 3,
    acPythonSetter:
      "hm.sketch.extend(entity={entity1}, to={extend_to_entity}, gap_tol={gap_tolerance}, tangent={tangent_extension})",
    description: "Extends a sketch entity until it meets a boundary entity",
    unit: "mm",
  },
};

/**
 * Total parameter count across all 20 sketch constraint schemas.
 * Computed from SKETCH_CONSTRAINT_METADATA at module load time.
 */
export const SKETCH_TOTAL_PARAM_COUNT: number = Object.values(
  SKETCH_CONSTRAINT_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
