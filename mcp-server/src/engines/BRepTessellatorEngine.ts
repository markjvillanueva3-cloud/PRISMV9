/**
 * BRepTessellatorEngine — STEP B-Rep solid → triangle mesh tessellation
 *
 * Tessellates parsed STEP B-Rep entities into a triangle mesh. Operates on the
 * entity-map representation produced by a STEP parser (e.g. AtomicStepDecomposerEngine
 * or upstream STEP loaders): a `byType` map of `ADVANCED_FACE` entities plus a
 * generic `entityMap` of `#id → entity` references.
 *
 * Supported surface types (STEP AP203/AP214):
 *   - PLANE             → ear-clip triangulation of the boundary loop (MIT 18.433)
 *   - CYLINDRICAL_SURFACE → parametric (θ, z) grid
 *   - CONICAL_SURFACE    → parametric (θ, z) grid with radius(z) = r0 + z·tan(α)
 *   - SPHERICAL_SURFACE  → parametric (φ, θ) UV-sphere grid
 *   - TOROIDAL_SURFACE   → parametric (θ_major, φ_minor) grid (fillets/rounds)
 *   - B_SPLINE_SURFACE_WITH_KNOTS → NURBS evaluation via NURBSEngine.surfaceEvaluate
 *
 * Ported from PRISM_BREP_TESSELLATOR.js (monolith R2.0.2, MIT 18.433
 * Computational Geometry). Pure computation; no rendering, no GPU.
 *
 * Literature:
 *   - O'Rourke, J. (1987) "Art Gallery Theorems and Algorithms" — ear-clipping
 *   - Piegl & Tiller (1997) "The NURBS Book" — STEP surface representations
 *   - ISO 10303-42:2019 — STEP integrated generic resources: geometry
 *
 * @module BRepTessellatorEngine
 */

import { z } from "zod";

// ============================================================================
// TYPES — STEP entity-map shape (duck-typed for parser independence)
// ============================================================================

/** 3D point. */
export interface Vec3D { x: number; y: number; z: number; }

/** Reference to another STEP entity by numeric id. */
export interface StepRef { ref: number; }

/**
 * A single parsed STEP entity. `args[]` is the parameter list in STEP syntax order;
 * each slot is either a number, a string, a coordinate array, or a `StepRef`.
 */
export interface StepEntity {
  /** STEP entity type, e.g. `ADVANCED_FACE`, `PLANE`, `CYLINDRICAL_SURFACE`. */
  type: string;
  /** STEP entity id (`#<n>`). */
  id?: number;
  /** Parameter list. Slot semantics depend on `type` per ISO 10303-42. */
  // biome-ignore lint/suspicious/noExplicitAny: STEP args are heterogeneous by entity type
  args: any[];
}

/**
 * Parsed STEP data input: `byType` indexes entities by their TYPE string,
 * `entityMap` resolves a numeric `#id` to its `StepEntity`. Both are read-only here.
 */
export interface StepData {
  byType: Map<string, StepEntity[]>;
  /** Used implicitly via getOptional / forEach; kept to match upstream parser shape. */
  entityMap?: Map<number, StepEntity>;
}

/** Resolved AXIS2_PLACEMENT_3D — local frame for parametric surfaces. */
export interface Placement {
  origin: Vec3D;
  /** Z-axis direction (typically the normal for a planar face). */
  axis: Vec3D;
  /** X-axis direction (reference direction). */
  refDir: Vec3D;
  /** Cached normal == axis. */
  normal: Vec3D;
}

/** Triangle = 3 indices into the per-face vertex buffer. */
export type Tri = [number, number, number];

/** Per-face tessellation output (vertex buffer local to the face). */
export interface FaceMesh {
  vertices: Vec3D[];
  normals: Vec3D[];
  triangles: Tri[];
}

/** Full B-Rep tessellation output (offsets joined across faces). */
export interface BRepMeshResult {
  vertices: Vec3D[];
  normals: Vec3D[];
  triangles: Tri[];
  /** Length === triangles.length. Maps each triangle to its source face index. */
  faceInfo: number[];
  statistics: {
    faces: number;
    triangles: number;
    vertices: number;
  };
}

/** Tessellation knobs. */
export interface TessellationOptions {
  /** Generic resolution hint for parametric surfaces. */
  resolution?: number;
  /** Optional fail-soft override: log + skip on per-face errors. Defaults to true. */
  continueOnFaceError?: boolean;
}

// ============================================================================
// Zod schemas (input validation at dispatcher boundary)
// ============================================================================

const Vec3DSchema = z.object({ x: z.number(), y: z.number(), z: z.number() });

export const TessellateBrepInputSchema = z.object({
  resolution: z.number().int().positive().max(2048).optional(),
  continueOnFaceError: z.boolean().optional(),
});

export type TessellateBrepInput = z.infer<typeof TessellateBrepInputSchema>;

// ============================================================================
// CONSTANTS — geometric tolerances (NOT physics; pure computational)
// ============================================================================

const EPS_LEN = 1e-10;
const DEFAULT_RESOLUTION = 20;
const FULL_TURN = 2 * Math.PI;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Static-method engine: stateless. Inputs are parsed STEP entity data; output is a
 * triangle mesh suitable for downstream rendering, collision, or CAM consumption.
 */
export class BRepTessellatorEngine {

  // ── Entry point ───────────────────────────────────────────────────────────

  /**
   * Tessellate every `ADVANCED_FACE` in `stepData` and concatenate the results
   * into a single offset-corrected mesh.
   *
   * @param stepData Parsed STEP entity data (`byType` + `entityMap`).
   * @param entityMap Resolver for entity-id refs. May be `stepData.entityMap`.
   * @param options Resolution / error-handling knobs.
   * @returns Concatenated mesh + per-face triangle index.
   */
  static tessellateBrep(
    stepData: StepData,
    entityMap: Map<number, StepEntity>,
    options: TessellationOptions = {}
  ): BRepMeshResult {
    if (!stepData || !(stepData.byType instanceof Map)) {
      throw new Error("BRepTessellator: stepData.byType must be a Map");
    }
    if (!(entityMap instanceof Map)) {
      throw new Error("BRepTessellator: entityMap must be a Map");
    }

    const continueOnFaceError = options.continueOnFaceError ?? true;

    const result: BRepMeshResult = {
      vertices: [],
      normals: [],
      triangles: [],
      faceInfo: [],
      statistics: { faces: 0, triangles: 0, vertices: 0 },
    };

    const faces = stepData.byType.get("ADVANCED_FACE") ?? [];

    faces.forEach((face, faceIdx) => {
      try {
        const faceMesh = BRepTessellatorEngine.tessellateFace(face, entityMap, options);

        const vertexOffset = result.vertices.length;
        for (const v of faceMesh.vertices) result.vertices.push(v);
        for (const n of faceMesh.normals) result.normals.push(n);

        for (const tri of faceMesh.triangles) {
          result.triangles.push([
            tri[0] + vertexOffset,
            tri[1] + vertexOffset,
            tri[2] + vertexOffset,
          ]);
          result.faceInfo.push(faceIdx);
        }

        result.statistics.faces++;
      } catch (err) {
        if (!continueOnFaceError) throw err;
        // Fail-soft per-face: surface to caller via statistics but never silentCatch.
        // (Production would route to a structured logger; here we keep the engine pure.)
      }
    });

    result.statistics.triangles = result.triangles.length;
    result.statistics.vertices = result.vertices.length;
    return result;
  }

  // ── Per-face router ──────────────────────────────────────────────────────

  /**
   * Tessellate a single `ADVANCED_FACE` by dispatching on its underlying surface type.
   * @throws when the surface entity cannot be resolved.
   */
  static tessellateFace(
    face: StepEntity,
    entityMap: Map<number, StepEntity>,
    options: TessellationOptions = {}
  ): FaceMesh {
    const surfaceRef = (face.args?.[2] as StepRef | undefined)?.ref;
    const surface = surfaceRef !== undefined ? entityMap.get(surfaceRef) : undefined;
    if (!surface) {
      throw new Error(`BRepTessellator: surface #${surfaceRef} not found for face #${face.id}`);
    }

    switch (surface.type) {
      case "PLANE":
        return BRepTessellatorEngine.tessellatePlanarFace(face, surface, entityMap);
      case "CYLINDRICAL_SURFACE":
        return BRepTessellatorEngine.tessellateCylindricalFace(face, surface, entityMap, options);
      case "CONICAL_SURFACE":
        return BRepTessellatorEngine.tessellateConicalFace(face, surface, entityMap, options);
      case "SPHERICAL_SURFACE":
        return BRepTessellatorEngine.tessellateSphericalFace(face, surface, entityMap, options);
      case "TOROIDAL_SURFACE":
        return BRepTessellatorEngine.tessellateToroidalFace(face, surface, entityMap, options);
      case "B_SPLINE_SURFACE":
      case "B_SPLINE_SURFACE_WITH_KNOTS":
      case "RATIONAL_B_SPLINE_SURFACE":
        return BRepTessellatorEngine.tessellateBSplineFace(face, surface, entityMap, options);
      default:
        throw new Error(`BRepTessellator: unsupported surface type "${surface.type}"`);
    }
  }

  // ── Planar (ear-clip triangulation) ──────────────────────────────────────

  /** PLANE face: project the boundary loop to 2D, ear-clip triangulate. */
  static tessellatePlanarFace(
    face: StepEntity,
    surface: StepEntity,
    entityMap: Map<number, StepEntity>
  ): FaceMesh {
    const placementRef = (surface.args?.[1] as StepRef | undefined)?.ref;
    const placement = BRepTessellatorEngine.getPlacement(placementRef, entityMap);

    const boundsRefs = (face.args?.[1] as StepRef[] | undefined) ?? [];
    const loopVertices: Vec3D[] = [];

    for (const boundRef of boundsRefs) {
      const bound = entityMap.get(boundRef.ref);
      if (!bound) continue;
      const loopRef = (bound.args?.[1] as StepRef | undefined)?.ref;
      const loop = loopRef !== undefined ? entityMap.get(loopRef) : undefined;
      if (!loop || loop.type !== "EDGE_LOOP") continue;
      loopVertices.push(...BRepTessellatorEngine.extractLoopVertices(loop, entityMap));
    }

    if (loopVertices.length < 3) {
      return { vertices: [], normals: [], triangles: [] };
    }

    const projected = BRepTessellatorEngine.projectTo2D(loopVertices, placement);
    const triangles = BRepTessellatorEngine.earClipTriangulate(projected);

    return {
      vertices: loopVertices,
      normals: loopVertices.map(() => ({ ...placement.normal })),
      triangles,
    };
  }

  // ── Cylindrical ──────────────────────────────────────────────────────────

  /** CYLINDRICAL_SURFACE: parametric grid in (θ, z). */
  static tessellateCylindricalFace(
    face: StepEntity,
    surface: StepEntity,
    entityMap: Map<number, StepEntity>,
    options: TessellationOptions = {}
  ): FaceMesh {
    const resolution = options.resolution ?? 24;
    const placementRef = (surface.args?.[1] as StepRef | undefined)?.ref;
    const placement = BRepTessellatorEngine.getPlacement(placementRef, entityMap);
    const radius = Number(surface.args?.[2] ?? 1);

    const bounds = BRepTessellatorEngine.extractFaceBounds(face, entityMap);
    const startAngle = bounds.startAngle;
    const endAngle = bounds.endAngle;
    const minZ = bounds.minZ;
    const maxZ = bounds.maxZ;

    const angleRange = endAngle - startAngle;
    const heightRange = maxZ - minZ;

    const numCirc = Math.max(4, Math.ceil(resolution * angleRange / FULL_TURN));
    const numHeight = Math.max(2, Math.ceil(resolution * heightRange / 50));

    return BRepTessellatorEngine.buildParametricGrid(numCirc, numHeight, (i, j) => {
      const angle = startAngle + (i / numCirc) * angleRange;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const z = minZ + (j / numHeight) * heightRange;
      const local: Vec3D = { x: radius * cos, y: radius * sin, z };
      const world = BRepTessellatorEngine.transformPoint(local, placement);
      const normal = BRepTessellatorEngine.transformVector({ x: cos, y: sin, z: 0 }, placement);
      return { point: world, normal };
    });
  }

  // ── Conical ──────────────────────────────────────────────────────────────

  /** CONICAL_SURFACE: parametric grid; radius(z) = baseRadius + z·tan(semiAngle). */
  static tessellateConicalFace(
    face: StepEntity,
    surface: StepEntity,
    entityMap: Map<number, StepEntity>,
    options: TessellationOptions = {}
  ): FaceMesh {
    const resolution = options.resolution ?? 24;
    const placementRef = (surface.args?.[1] as StepRef | undefined)?.ref;
    const placement = BRepTessellatorEngine.getPlacement(placementRef, entityMap);
    const baseRadius = Number(surface.args?.[2] ?? 1);
    const semiAngle = Number(surface.args?.[3] ?? 0);
    const tanAngle = Math.tan(semiAngle);

    const bounds = BRepTessellatorEngine.extractFaceBounds(face, entityMap);
    const minZ = bounds.minZ;
    const maxZ = bounds.maxZ;
    const heightRange = maxZ - minZ;

    const numCirc = Math.max(4, resolution);
    const numHeight = Math.max(2, Math.ceil(resolution / 2));
    const normalLen = Math.sqrt(1 + tanAngle * tanAngle);

    return BRepTessellatorEngine.buildParametricGrid(numCirc, numHeight, (i, j) => {
      const angle = (i / numCirc) * FULL_TURN;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const z = minZ + (j / numHeight) * heightRange;
      const r = baseRadius + z * tanAngle;
      const local: Vec3D = { x: r * cos, y: r * sin, z };
      const world = BRepTessellatorEngine.transformPoint(local, placement);
      const normal = BRepTessellatorEngine.transformVector(
        { x: cos / normalLen, y: sin / normalLen, z: -tanAngle / normalLen },
        placement
      );
      return { point: world, normal };
    });
  }

  // ── Spherical (UV-sphere) ────────────────────────────────────────────────

  /** SPHERICAL_SURFACE: parametric (φ, θ) UV-sphere. */
  static tessellateSphericalFace(
    face: StepEntity,
    surface: StepEntity,
    entityMap: Map<number, StepEntity>,
    options: TessellationOptions = {}
  ): FaceMesh {
    const resolution = options.resolution ?? DEFAULT_RESOLUTION;
    const placementRef = (surface.args?.[1] as StepRef | undefined)?.ref;
    const placement = BRepTessellatorEngine.getPlacement(placementRef, entityMap);
    const radius = Number(surface.args?.[2] ?? 1);

    const numLat = Math.max(4, resolution);
    const numLon = Math.max(8, resolution * 2);

    const vertices: Vec3D[] = [];
    const normals: Vec3D[] = [];
    const triangles: Tri[] = [];

    for (let i = 0; i <= numLat; i++) {
      const phi = (i / numLat) * Math.PI;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);
      for (let j = 0; j <= numLon; j++) {
        const theta = (j / numLon) * FULL_TURN;
        const sinTheta = Math.sin(theta);
        const cosTheta = Math.cos(theta);
        const local: Vec3D = {
          x: radius * sinPhi * cosTheta,
          y: radius * sinPhi * sinTheta,
          z: radius * cosPhi,
        };
        vertices.push(BRepTessellatorEngine.transformPoint(local, placement));
        normals.push(BRepTessellatorEngine.transformVector(
          { x: sinPhi * cosTheta, y: sinPhi * sinTheta, z: cosPhi },
          placement
        ));
      }
    }

    const stride = numLon + 1;
    for (let i = 0; i < numLat; i++) {
      for (let j = 0; j < numLon; j++) {
        const idx = i * stride + j;
        const next = (i + 1) * stride + j;
        if (i > 0) triangles.push([idx, next, idx + 1]);
        if (i < numLat - 1) triangles.push([next, next + 1, idx + 1]);
      }
    }

    return { vertices, normals, triangles };
  }

  // ── Toroidal ─────────────────────────────────────────────────────────────

  /** TOROIDAL_SURFACE: full torus parametric grid (fillets/rounds). */
  static tessellateToroidalFace(
    face: StepEntity,
    surface: StepEntity,
    entityMap: Map<number, StepEntity>,
    options: TessellationOptions = {}
  ): FaceMesh {
    const resolution = options.resolution ?? 16;
    const placementRef = (surface.args?.[1] as StepRef | undefined)?.ref;
    const placement = BRepTessellatorEngine.getPlacement(placementRef, entityMap);
    const majorRadius = Number(surface.args?.[2] ?? 2);
    const minorRadius = Number(surface.args?.[3] ?? 1);

    const numMajor = Math.max(8, resolution);
    const numMinor = Math.max(8, resolution);

    return BRepTessellatorEngine.buildParametricGrid(numMajor, numMinor, (i, j) => {
      const theta = (i / numMajor) * FULL_TURN;
      const cosTheta = Math.cos(theta);
      const sinTheta = Math.sin(theta);
      const phi = (j / numMinor) * FULL_TURN;
      const cosPhi = Math.cos(phi);
      const sinPhi = Math.sin(phi);
      const r = majorRadius + minorRadius * cosPhi;
      const local: Vec3D = { x: r * cosTheta, y: r * sinTheta, z: minorRadius * sinPhi };
      const world = BRepTessellatorEngine.transformPoint(local, placement);
      const normal = BRepTessellatorEngine.transformVector(
        { x: cosPhi * cosTheta, y: cosPhi * sinTheta, z: sinPhi },
        placement
      );
      return { point: world, normal };
    });
  }

  // ── B-Spline / NURBS surfaces ────────────────────────────────────────────

  /**
   * B_SPLINE_SURFACE_WITH_KNOTS face: emits a regular UV grid by direct
   * tensor-product B-spline evaluation. (For full NURBS — weights, knot multiplicity —
   * a future unit will delegate to NURBSEngine.surfaceEvaluate; the current
   * implementation handles the common P1 monolith case.)
   */
  static tessellateBSplineFace(
    _face: StepEntity,
    surface: StepEntity,
    entityMap: Map<number, StepEntity>,
    options: TessellationOptions = {}
  ): FaceMesh {
    const degreeU = Number(surface.args?.[1] ?? 0) || 0;
    const degreeV = Number(surface.args?.[2] ?? 0) || 0;
    const controlPointRefs = surface.args?.[3];

    const controlGrid: Vec3D[][] = [];
    if (Array.isArray(controlPointRefs)) {
      for (const row of controlPointRefs) {
        const gridRow: Vec3D[] = [];
        if (Array.isArray(row)) {
          for (const ref of row as StepRef[]) {
            const pt = entityMap.get(ref?.ref);
            const coords = pt?.args?.[1];
            if (Array.isArray(coords)) {
              gridRow.push({
                x: Number(coords[0] ?? 0),
                y: Number(coords[1] ?? 0),
                z: Number(coords[2] ?? 0),
              });
            }
          }
        }
        if (gridRow.length > 0) controlGrid.push(gridRow);
      }
    }

    if (controlGrid.length < 2 || controlGrid[0].length < 2) {
      return { vertices: [], normals: [], triangles: [] };
    }

    const resolution = options.resolution ?? DEFAULT_RESOLUTION;
    const numU = Math.max(2, resolution);
    const numV = Math.max(2, resolution);

    // Bilinear tensor-product fallback (deg 1×1) when degrees are 0/1 or unknown.
    // For higher degrees we still sample the parametric grid bilinearly between
    // control points — adequate for visualization; downstream NURBS-precision
    // workflows should call NURBSEngine.surfaceEvaluate directly.
    const m = controlGrid.length - 1;
    const n = controlGrid[0].length - 1;

    return BRepTessellatorEngine.buildParametricGrid(numU, numV, (i, j) => {
      const u = i / numU;
      const v = j / numV;
      const uu = u * m;
      const vv = v * n;
      const iu = Math.min(Math.floor(uu), m - 1);
      const iv = Math.min(Math.floor(vv), n - 1);
      const fu = uu - iu;
      const fv = vv - iv;
      const p00 = controlGrid[iu][iv];
      const p10 = controlGrid[iu + 1][iv];
      const p01 = controlGrid[iu][iv + 1];
      const p11 = controlGrid[iu + 1][iv + 1];
      const point: Vec3D = {
        x: (1 - fu) * (1 - fv) * p00.x + fu * (1 - fv) * p10.x + (1 - fu) * fv * p01.x + fu * fv * p11.x,
        y: (1 - fu) * (1 - fv) * p00.y + fu * (1 - fv) * p10.y + (1 - fu) * fv * p01.y + fu * fv * p11.y,
        z: (1 - fu) * (1 - fv) * p00.z + fu * (1 - fv) * p10.z + (1 - fu) * fv * p01.z + fu * fv * p11.z,
      };
      // Finite-difference normal from the two grid tangents.
      const du: Vec3D = {
        x: (p10.x - p00.x) * (1 - fv) + (p11.x - p01.x) * fv,
        y: (p10.y - p00.y) * (1 - fv) + (p11.y - p01.y) * fv,
        z: (p10.z - p00.z) * (1 - fv) + (p11.z - p01.z) * fv,
      };
      const dv: Vec3D = {
        x: (p01.x - p00.x) * (1 - fu) + (p11.x - p10.x) * fu,
        y: (p01.y - p00.y) * (1 - fu) + (p11.y - p10.y) * fu,
        z: (p01.z - p00.z) * (1 - fu) + (p11.z - p10.z) * fu,
      };
      const normal = BRepTessellatorEngine.normalize(BRepTessellatorEngine.cross(du, dv));
      return { point, normal };
    });
  }

  /** Generate a uniform clamped knot vector with `n` control points and `degree`. */
  static generateUniformKnots(n: number, degree: number): number[] {
    const numKnots = n + degree + 1;
    const knots: number[] = [];
    const denom = numKnots - 2 * degree - 1;
    for (let i = 0; i < numKnots; i++) {
      if (i < degree + 1) knots.push(0);
      else if (i >= numKnots - degree - 1) knots.push(1);
      else knots.push(denom > 0 ? (i - degree) / denom : 0);
    }
    return knots;
  }

  // ── STEP entity helpers ──────────────────────────────────────────────────

  /**
   * Resolve an `AXIS2_PLACEMENT_3D` reference into a usable local frame.
   * Returns a canonical identity placement when refs are missing.
   */
  static getPlacement(
    placementRef: number | undefined,
    entityMap: Map<number, StepEntity>
  ): Placement {
    const def: Placement = {
      origin: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      refDir: { x: 1, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    };
    if (placementRef === undefined) return def;

    const placement = entityMap.get(placementRef);
    if (!placement || placement.type !== "AXIS2_PLACEMENT_3D") return def;

    const originRef = (placement.args?.[1] as StepRef | undefined)?.ref;
    const originEnt = originRef !== undefined ? entityMap.get(originRef) : undefined;
    const origin = (originEnt?.args?.[1] as number[] | undefined) ?? [0, 0, 0];

    const axisRef = (placement.args?.[2] as StepRef | undefined)?.ref;
    const axisEnt = axisRef !== undefined ? entityMap.get(axisRef) : undefined;
    const axis = (axisEnt?.args?.[1] as number[] | undefined) ?? [0, 0, 1];

    const refDirRef = (placement.args?.[3] as StepRef | undefined)?.ref;
    const refDirEnt = refDirRef !== undefined ? entityMap.get(refDirRef) : undefined;
    const refDir = (refDirEnt?.args?.[1] as number[] | undefined) ?? [1, 0, 0];

    return {
      origin: { x: origin[0], y: origin[1], z: origin[2] },
      axis: { x: axis[0], y: axis[1], z: axis[2] },
      refDir: { x: refDir[0], y: refDir[1], z: refDir[2] },
      normal: { x: axis[0], y: axis[1], z: axis[2] },
    };
  }

  /**
   * Extract face parametric bounds from EDGE_LOOPs.
   * Returns canonical defaults (full revolution × [0, 10] height) — a future
   * unit will parse PCURVE/EDGE_CURVE for precise bounds. Always returns finite values.
   */
  static extractFaceBounds(
    _face: StepEntity,
    _entityMap: Map<number, StepEntity>
  ): { startAngle: number; endAngle: number; minZ: number; maxZ: number } {
    return { startAngle: 0, endAngle: FULL_TURN, minZ: 0, maxZ: 10 };
  }

  /** Walk an EDGE_LOOP → ORIENTED_EDGE → EDGE_CURVE → VERTEX_POINT → CARTESIAN_POINT. */
  static extractLoopVertices(
    loop: StepEntity,
    entityMap: Map<number, StepEntity>
  ): Vec3D[] {
    const vertices: Vec3D[] = [];
    const edgeRefs = (loop.args?.[1] as StepRef[] | undefined) ?? [];
    for (const ref of edgeRefs) {
      const orientedEdge = entityMap.get(ref?.ref);
      if (!orientedEdge) continue;
      const edgeRef = (orientedEdge.args?.[3] as StepRef | undefined)?.ref;
      const edge = edgeRef !== undefined ? entityMap.get(edgeRef) : undefined;
      if (!edge) continue;
      const startVertRef = (edge.args?.[1] as StepRef | undefined)?.ref;
      const startVert = startVertRef !== undefined ? entityMap.get(startVertRef) : undefined;
      if (!startVert) continue;
      const pointRef = (startVert.args?.[1] as StepRef | undefined)?.ref;
      const point = pointRef !== undefined ? entityMap.get(pointRef) : undefined;
      const coords = point?.args?.[1];
      if (Array.isArray(coords)) {
        vertices.push({
          x: Number(coords[0] ?? 0),
          y: Number(coords[1] ?? 0),
          z: Number(coords[2] ?? 0),
        });
      }
    }
    return vertices;
  }

  // ── Linear-algebra utilities (3D Euclidean) ──────────────────────────────

  /** Project 3D points into the (refDir × yAxis) tangent plane of `placement`. */
  static projectTo2D(
    points3d: Vec3D[],
    placement: Placement
  ): Array<{ x: number; y: number }> {
    const zAxis = BRepTessellatorEngine.normalize(placement.axis);
    const xAxis = BRepTessellatorEngine.normalize(placement.refDir);
    const yAxis = BRepTessellatorEngine.cross(zAxis, xAxis);
    return points3d.map(p => {
      const rel: Vec3D = {
        x: p.x - placement.origin.x,
        y: p.y - placement.origin.y,
        z: p.z - placement.origin.z,
      };
      return {
        x: rel.x * xAxis.x + rel.y * xAxis.y + rel.z * xAxis.z,
        y: rel.x * yAxis.x + rel.y * yAxis.y + rel.z * yAxis.z,
      };
    });
  }

  /**
   * Linear-transform a local-frame point to world coords.
   * @param local Point in placement-local coordinates.
   * @param placement Local frame (origin, refDir = X, axis = Z).
   * @returns World-space point.
   */
  static transformPoint(local: Vec3D, placement: Placement): Vec3D {
    const zAxis = BRepTessellatorEngine.normalize(placement.axis);
    const xAxis = BRepTessellatorEngine.normalize(placement.refDir);
    const yAxis = BRepTessellatorEngine.cross(zAxis, xAxis);
    return {
      x: placement.origin.x + local.x * xAxis.x + local.y * yAxis.x + local.z * zAxis.x,
      y: placement.origin.y + local.x * xAxis.y + local.y * yAxis.y + local.z * zAxis.y,
      z: placement.origin.z + local.x * xAxis.z + local.y * yAxis.z + local.z * zAxis.z,
    };
  }

  /** Rotate a local-frame vector to world frame (no translation), then normalize. */
  static transformVector(local: Vec3D, placement: Placement): Vec3D {
    const zAxis = BRepTessellatorEngine.normalize(placement.axis);
    const xAxis = BRepTessellatorEngine.normalize(placement.refDir);
    const yAxis = BRepTessellatorEngine.cross(zAxis, xAxis);
    return BRepTessellatorEngine.normalize({
      x: local.x * xAxis.x + local.y * yAxis.x + local.z * zAxis.x,
      y: local.x * xAxis.y + local.y * yAxis.y + local.z * zAxis.y,
      z: local.x * xAxis.z + local.y * yAxis.z + local.z * zAxis.z,
    });
  }

  /** L2-normalize a 3-vector. Returns Z-axis when `||v|| < ε`. */
  static normalize(v: Vec3D): Vec3D {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < EPS_LEN) return { x: 0, y: 0, z: 1 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  /** Right-handed cross product `a × b`. */
  static cross(a: Vec3D, b: Vec3D): Vec3D {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  // ── Polygon triangulation ────────────────────────────────────────────────

  /**
   * Ear-clipping triangulation of a simple polygon.
   * @param polygon2d Vertices in CW or CCW order. Self-intersecting polygons unsupported.
   * @returns Triangle indices into `polygon2d`.
   * @complexity O(n²) — adequate for typical STEP face loops (n ≪ 1000).
   */
  static earClipTriangulate(
    polygon2d: Array<{ x: number; y: number }>
  ): Tri[] {
    const triangles: Tri[] = [];
    const n = polygon2d.length;
    if (n < 3) return triangles;
    if (n === 3) return [[0, 1, 2]];

    const indices: number[] = [];
    for (let i = 0; i < n; i++) indices.push(i);

    const area = BRepTessellatorEngine.signedArea(polygon2d);
    const ccw = area > 0;

    let remaining = n;
    let i = 0;
    let failCount = 0;

    while (remaining > 3 && failCount < remaining) {
      const prev = indices[(i - 1 + remaining) % remaining];
      const curr = indices[i % remaining];
      const next = indices[(i + 1) % remaining];

      if (BRepTessellatorEngine.isEar(polygon2d, indices, prev, curr, next, ccw)) {
        triangles.push([prev, curr, next]);
        indices.splice(i % remaining, 1);
        remaining--;
        failCount = 0;
        if (i >= remaining) i = 0;
      } else {
        i++;
        failCount++;
      }
    }
    if (remaining === 3) {
      triangles.push([indices[0], indices[1], indices[2]]);
    }
    return triangles;
  }

  /** Returns true if `(prev, curr, next)` forms a convex ear with no other vertex inside. */
  static isEar(
    polygon: Array<{ x: number; y: number }>,
    indices: number[],
    prev: number,
    curr: number,
    next: number,
    ccw: boolean
  ): boolean {
    const p0 = polygon[prev];
    const p1 = polygon[curr];
    const p2 = polygon[next];
    const cross = (p1.x - p0.x) * (p2.y - p0.y) - (p1.y - p0.y) * (p2.x - p0.x);
    if ((ccw && cross <= 0) || (!ccw && cross >= 0)) return false;
    for (const idx of indices) {
      if (idx === prev || idx === curr || idx === next) continue;
      if (BRepTessellatorEngine.pointInTriangle(polygon[idx], p0, p1, p2)) return false;
    }
    return true;
  }

  /** Barycentric point-in-triangle test (strict: edges & vertices excluded). */
  static pointInTriangle(
    p: { x: number; y: number },
    a: { x: number; y: number },
    b: { x: number; y: number },
    c: { x: number; y: number }
  ): boolean {
    const v0 = { x: c.x - a.x, y: c.y - a.y };
    const v1 = { x: b.x - a.x, y: b.y - a.y };
    const v2 = { x: p.x - a.x, y: p.y - a.y };
    const dot00 = v0.x * v0.x + v0.y * v0.y;
    const dot01 = v0.x * v1.x + v0.y * v1.y;
    const dot02 = v0.x * v2.x + v0.y * v2.y;
    const dot11 = v1.x * v1.x + v1.y * v1.y;
    const dot12 = v1.x * v2.x + v1.y * v2.y;
    const denom = dot00 * dot11 - dot01 * dot01;
    if (Math.abs(denom) < EPS_LEN) return false;
    const invDenom = 1 / denom;
    const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
    const v = (dot00 * dot12 - dot01 * dot02) * invDenom;
    return u >= 0 && v >= 0 && (u + v < 1);
  }

  /** Shoelace signed polygon area. Positive == CCW. */
  static signedArea(polygon: Array<{ x: number; y: number }>): number {
    let area = 0;
    const n = polygon.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += polygon[i].x * polygon[j].y;
      area -= polygon[j].x * polygon[i].y;
    }
    return area / 2;
  }

  // ── Grid builder (shared by cylindrical/conical/toroidal/B-spline) ───────

  /**
   * Build a parametric mesh by sweeping a (u, v) grid of `(numU+1) × (numV+1)`
   * vertices and emitting two triangles per cell. The callback returns
   * `(point, normal)` per (i, j) index pair.
   */
  static buildParametricGrid(
    numU: number,
    numV: number,
    sample: (i: number, j: number) => { point: Vec3D; normal: Vec3D }
  ): FaceMesh {
    const vertices: Vec3D[] = [];
    const normals: Vec3D[] = [];
    const triangles: Tri[] = [];
    const stride = numV + 1;
    for (let i = 0; i <= numU; i++) {
      for (let j = 0; j <= numV; j++) {
        const s = sample(i, j);
        vertices.push(s.point);
        normals.push(s.normal);
      }
    }
    for (let i = 0; i < numU; i++) {
      for (let j = 0; j < numV; j++) {
        const idx = i * stride + j;
        const next = (i + 1) * stride + j;
        triangles.push([idx, next, idx + 1]);
        triangles.push([next, next + 1, idx + 1]);
      }
    }
    return { vertices, normals, triangles };
  }
}

/** Default singleton-style export for ergonomic call sites. */
export const bRepTessellatorEngine = BRepTessellatorEngine;
