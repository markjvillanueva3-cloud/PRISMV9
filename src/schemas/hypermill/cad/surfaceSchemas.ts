/**
 * Surface Operation Parameter Schemas — hyperCAD-S Surface Modeling
 *
 * U-HKC09: Zod schemas for 8 surface operation types used in hyperCAD-S.
 * Each schema defines the parameter set the AC Python API accepts when
 * creating or editing a surface modeling feature.
 *
 * AC Python call pattern:
 *   hm.surface.offset(body_ref=<ref>, distance=1.0, trim_original=True, ...)
 *
 * @domain CAD-Surface
 * @milestone HM-KC-MS1/U-HKC09
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every surface operation type */
export interface SurfaceOperationMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** Primary measurement unit, if applicable */
  unit?: string;
}

// ── 1. Offset Surface ───────────────────────────────────────────────────────

export const offsetSurfaceSchema = z.object({
  distance: z
    .number()
    .min(-1000)
    .max(1000)
    .describe("Signed offset distance from the original surface, mm (negative = inward)"),
  trim_original: z
    .boolean()
    .default(false)
    .describe("Trim the original surface body at the offset boundary"),
  keep_body: z
    .boolean()
    .default(true)
    .describe("Retain the original body after creating the offset surface"),
  tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.001)
    .describe("Surface approximation tolerance for offset computation, mm"),
});

export type OffsetSurface = z.infer<typeof offsetSurfaceSchema>;

// ── 2. Thicken ──────────────────────────────────────────────────────────────

export const thickenSchema = z.object({
  thickness: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Wall thickness applied to the surface to create a solid, mm"),
  direction: z
    .enum(["inward", "outward", "both"])
    .default("outward")
    .describe("Direction of thickening relative to the surface normal"),
  cap_ends: z
    .boolean()
    .default(true)
    .describe("Close open edges of the thickened body with planar caps"),
  merge_faces: z
    .boolean()
    .default(true)
    .describe("Merge tangent-continuous faces in the thickened result"),
});

export type Thicken = z.infer<typeof thickenSchema>;

// ── 3. Extend Surface ───────────────────────────────────────────────────────

export const extendSurfaceSchema = z.object({
  extend_type: z
    .enum(["linear", "smooth", "reflective"])
    .default("linear")
    .describe("Extension continuation method: linear tangent, smooth curvature, or reflective"),
  distance: z
    .number()
    .min(0.001)
    .max(100000)
    .describe("Extension distance beyond the original surface edge, mm"),
  edge_mode: z
    .enum(["all", "selected"])
    .default("all")
    .describe("Extend all boundary edges or only user-selected edges"),
  natural_end: z
    .boolean()
    .default(false)
    .describe("Allow the extension to terminate naturally at curvature inflection points"),
});

export type ExtendSurface = z.infer<typeof extendSurfaceSchema>;

// ── 4. Trim Surface ────────────────────────────────────────────────────────

export const trimSurfaceSchema = z.object({
  trim_type: z
    .enum(["split", "trim_keep", "trim_remove"])
    .default("trim_keep")
    .describe("Operation mode: split into two, trim and keep one side, or trim and remove one side"),
  keep_side: z
    .enum(["auto", "top", "bottom"])
    .default("auto")
    .describe("Which side of the trimming boundary to retain (auto = largest area)"),
  projection_dir: z
    .enum(["normal", "x_axis", "y_axis", "z_axis", "custom"])
    .default("normal")
    .describe("Direction vector for projecting the trim curve onto the surface"),
  extend_trim_curve: z
    .boolean()
    .default(true)
    .describe("Automatically extend the trim curve to fully cross the surface boundary"),
  tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.001)
    .describe("Trim intersection tolerance, mm"),
});

export type TrimSurface = z.infer<typeof trimSurfaceSchema>;

// ── 5. Stitch ───────────────────────────────────────────────────────────────

export const stitchSchema = z.object({
  stitch_tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.01)
    .describe("Maximum edge gap that will be closed during stitching, mm"),
  max_gap: z
    .number()
    .min(0.001)
    .max(10.0)
    .default(0.1)
    .describe("Largest allowable gap between surface edges before stitch fails, mm"),
  refine_result: z
    .boolean()
    .default(true)
    .describe("Refine the stitched surface to remove degenerate edges and micro-faces"),
  create_solid: z
    .boolean()
    .default(false)
    .describe("Attempt to convert the stitched shell into a closed solid body"),
  edge_merge_angle: z
    .number()
    .min(0)
    .max(30)
    .default(5)
    .describe("Maximum angle between adjacent edge normals for automatic merging, degrees"),
});

export type Stitch = z.infer<typeof stitchSchema>;

// ── 6. Patch ────────────────────────────────────────────────────────────────

export const patchSchema = z.object({
  boundary_mode: z
    .enum(["natural", "tangent", "curvature"])
    .default("natural")
    .describe("Boundary continuity with adjacent surfaces: positional, tangent, or curvature"),
  interior_points: z
    .number()
    .int()
    .min(0)
    .max(100)
    .default(0)
    .describe("Number of interior control points for shape refinement"),
  smooth_factor: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Smoothing weight: 0 = interpolate boundary exactly, 1 = maximum smoothing"),
  max_degree: z
    .number()
    .int()
    .min(3)
    .max(12)
    .default(5)
    .describe("Maximum polynomial degree of the resulting patch surface"),
  trim_to_boundary: z
    .boolean()
    .default(true)
    .describe("Trim the generated patch surface to the exact boundary loop"),
});

export type Patch = z.infer<typeof patchSchema>;

// ── 7. Ruled Surface ────────────────────────────────────────────────────────

export const ruledSurfaceSchema = z.object({
  angle_limit: z
    .number()
    .min(0)
    .max(90)
    .default(45)
    .describe("Maximum ruling angle from the surface normal before flagging non-ruled regions, degrees"),
  direction: z
    .enum(["normal", "specified"])
    .default("normal")
    .describe("Ruling direction: normal to boundary curves or user-specified vector"),
  taper_angle: z
    .number()
    .min(-89)
    .max(89)
    .default(0)
    .describe("Taper angle applied along the ruled direction for draft surfaces, degrees"),
  flip_rulings: z
    .boolean()
    .default(false)
    .describe("Reverse the ruling direction (swap start/end boundary assignment)"),
  segments: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(20)
    .describe("Number of linear ruling segments for surface approximation"),
});

export type RuledSurface = z.infer<typeof ruledSurfaceSchema>;

// ── 8. Surface Sweep ────────────────────────────────────────────────────────

export const surfaceSweepSchema = z.object({
  twist: z
    .number()
    .min(-3600)
    .max(3600)
    .default(0)
    .describe("Total twist applied to the profile along the sweep path, degrees"),
  scale: z
    .number()
    .min(0.01)
    .max(100)
    .default(1.0)
    .describe("Scale factor applied to the profile from start to end (1.0 = uniform)"),
  continuity: z
    .enum(["g0", "g1", "g2"])
    .default("g1")
    .describe("Cross-section continuity: G0 = positional, G1 = tangent, G2 = curvature"),
  orientation: z
    .enum(["follow_path", "keep_normal", "keep_parallel"])
    .default("follow_path")
    .describe("Profile orientation mode along the sweep path"),
  merge_tangent_faces: z
    .boolean()
    .default(true)
    .describe("Merge adjacent tangent faces in the result for cleaner geometry"),
});

export type SurfaceSweep = z.infer<typeof surfaceSweepSchema>;

// ── Surface Operation Schema Map ────────────────────────────────────────────

/** Union type of all surface operation parameter objects */
export type SurfaceOperationSchemas = {
  offset_surface: OffsetSurface;
  thicken: Thicken;
  extend_surface: ExtendSurface;
  trim_surface: TrimSurface;
  stitch: Stitch;
  patch: Patch;
  ruled_surface: RuledSurface;
  surface_sweep: SurfaceSweep;
};

/** Flat map from operation name to its Zod schema */
export const SURFACE_OPERATION_SCHEMA_MAP = {
  offset_surface: offsetSurfaceSchema,
  thicken: thickenSchema,
  extend_surface: extendSurfaceSchema,
  trim_surface: trimSurfaceSchema,
  stitch: stitchSchema,
  patch: patchSchema,
  ruled_surface: ruledSurfaceSchema,
  surface_sweep: surfaceSweepSchema,
} as const;

// ── Surface Operation Metadata ──────────────────────────────────────────────

/**
 * Per-operation metadata: param count, AC Python setter template, description.
 *
 * AC Python setter patterns follow the hyperMILL Automation Center 33.0 API.
 * Curly-brace tokens are replaced at runtime with the matching schema field value.
 */
export const SURFACE_OPERATION_METADATA: Record<string, SurfaceOperationMeta> = {
  offset_surface: {
    paramCount: 4,
    acPythonSetter:
      "hm.surface.offset(body_ref={body}, distance={distance}, trim_original={trim_original}, keep_body={keep_body}, tolerance={tolerance})",
    description: "Creates an offset copy of a surface at a specified distance from the original",
    unit: "mm",
  },
  thicken: {
    paramCount: 4,
    acPythonSetter:
      "hm.surface.thicken(surface_ref={surface}, thickness={thickness}, direction='{direction}', cap_ends={cap_ends}, merge_faces={merge_faces})",
    description: "Converts a surface body into a solid by adding uniform wall thickness",
    unit: "mm",
  },
  extend_surface: {
    paramCount: 4,
    acPythonSetter:
      "hm.surface.extend(surface_ref={surface}, type='{extend_type}', distance={distance}, edge_mode='{edge_mode}', natural_end={natural_end})",
    description: "Extends surface edges outward using linear, smooth, or reflective continuation",
    unit: "mm",
  },
  trim_surface: {
    paramCount: 5,
    acPythonSetter:
      "hm.surface.trim(surface_ref={surface}, trim_type='{trim_type}', keep_side='{keep_side}', projection='{projection_dir}', extend_curve={extend_trim_curve}, tolerance={tolerance})",
    description: "Trims or splits a surface using a projected curve boundary",
    unit: "mm",
  },
  stitch: {
    paramCount: 5,
    acPythonSetter:
      "hm.surface.stitch(surfaces=[{surface_refs}], tolerance={stitch_tolerance}, max_gap={max_gap}, refine={refine_result}, to_solid={create_solid}, merge_angle={edge_merge_angle})",
    description: "Joins multiple surface bodies into a single shell or closed solid by merging shared edges",
    unit: "mm",
  },
  patch: {
    paramCount: 5,
    acPythonSetter:
      "hm.surface.patch(boundary={boundary_ref}, mode='{boundary_mode}', interior_pts={interior_points}, smooth={smooth_factor}, max_deg={max_degree}, trim={trim_to_boundary})",
    description: "Fills a boundary loop with a smooth surface patch using specified continuity conditions",
  },
  ruled_surface: {
    paramCount: 5,
    acPythonSetter:
      "hm.surface.ruled(curve1={curve1_ref}, curve2={curve2_ref}, angle_limit={angle_limit}, direction='{direction}', taper={taper_angle}, flip={flip_rulings}, segments={segments})",
    description: "Creates a ruled (developable) surface between two boundary curves with optional taper",
    unit: "degrees",
  },
  surface_sweep: {
    paramCount: 5,
    acPythonSetter:
      "hm.surface.sweep(profile={profile_ref}, path={path_ref}, twist={twist}, scale={scale}, continuity='{continuity}', orient='{orientation}', merge_tangent={merge_tangent_faces})",
    description: "Creates a surface by sweeping a profile curve along a path with optional twist and scaling",
    unit: "degrees",
  },
};

/**
 * Total parameter count across all 8 surface operation schemas.
 * Computed from SURFACE_OPERATION_METADATA at module load time.
 */
export const SURFACE_TOTAL_PARAM_COUNT: number = Object.values(
  SURFACE_OPERATION_METADATA
).reduce((sum, meta) => sum + meta.paramCount, 0);
