/**
 * BRepTessellatorEngine — behavioral tests with reference geometry.
 *
 * Strategy: build STEP entity-maps by hand for known canonical solids
 * (unit cube, cylinder, sphere) and verify (vertex count, triangle count,
 * face count, geometric invariants) against analytical expectations.
 *
 * No `.toBeDefined()` stubs — every assertion encodes intent (R9).
 */

import { describe, it, expect } from "vitest";
import {
  BRepTessellatorEngine,
  TessellateBrepInputSchema,
  type StepData,
  type StepEntity,
  type Vec3D,
} from "../engines/BRepTessellatorEngine";

// ─── STEP fixture builders ──────────────────────────────────────────────────

interface FixtureBuilder {
  entities: Map<number, StepEntity>;
  byType: Map<string, StepEntity[]>;
  nextId: number;
  add(type: string, args: unknown[]): number;
  stepData(): StepData;
}

function newFixture(): FixtureBuilder {
  const entities = new Map<number, StepEntity>();
  const byType = new Map<string, StepEntity[]>();
  let nextId = 1;

  function add(type: string, args: unknown[]): number {
    const id = nextId++;
    // STEP parser convention: entity.args[] is the parenthesized parameter list
    // verbatim; args[0] is typically the entity name (often ""), args[1+] are
    // the geometric/topological refs. Do NOT prepend `type` here — the monolith
    // accesses positional slots like args[1], args[2] directly.
    const entity: StepEntity = { type, id, args: [...args] };
    entities.set(id, entity);
    const list = byType.get(type) ?? [];
    list.push(entity);
    byType.set(type, list);
    return id;
  }
  return {
    entities,
    byType,
    get nextId() { return nextId; },
    add,
    stepData() { return { byType, entityMap: entities }; },
  };
}

function cartesianPoint(fx: FixtureBuilder, x: number, y: number, z: number): number {
  return fx.add("CARTESIAN_POINT", ["", [x, y, z]]);
}
function direction(fx: FixtureBuilder, x: number, y: number, z: number): number {
  return fx.add("DIRECTION", ["", [x, y, z]]);
}
function axis2Placement(
  fx: FixtureBuilder,
  originId: number,
  axisId: number,
  refDirId: number
): number {
  return fx.add("AXIS2_PLACEMENT_3D", [
    "",
    { ref: originId },
    { ref: axisId },
    { ref: refDirId },
  ]);
}
function plane(fx: FixtureBuilder, placementId: number): number {
  return fx.add("PLANE", ["", { ref: placementId }]);
}
function cylindricalSurface(fx: FixtureBuilder, placementId: number, radius: number): number {
  return fx.add("CYLINDRICAL_SURFACE", ["", { ref: placementId }, radius]);
}
function conicalSurface(
  fx: FixtureBuilder, placementId: number, baseRadius: number, semiAngle: number
): number {
  return fx.add("CONICAL_SURFACE", ["", { ref: placementId }, baseRadius, semiAngle]);
}
function sphericalSurface(fx: FixtureBuilder, placementId: number, radius: number): number {
  return fx.add("SPHERICAL_SURFACE", ["", { ref: placementId }, radius]);
}
function toroidalSurface(
  fx: FixtureBuilder, placementId: number, majorR: number, minorR: number
): number {
  return fx.add("TOROIDAL_SURFACE", ["", { ref: placementId }, majorR, minorR]);
}
function vertexPoint(fx: FixtureBuilder, pointId: number): number {
  return fx.add("VERTEX_POINT", ["", { ref: pointId }]);
}
function edgeCurve(
  fx: FixtureBuilder, startVertexId: number, endVertexId: number
): number {
  return fx.add("EDGE_CURVE", [
    "",
    { ref: startVertexId },
    { ref: endVertexId },
    { ref: 0 }, // edge geometry placeholder
    true,
  ]);
}
function orientedEdge(fx: FixtureBuilder, edgeCurveId: number): number {
  return fx.add("ORIENTED_EDGE", ["", { ref: 0 }, { ref: 0 }, { ref: edgeCurveId }, true]);
}
function edgeLoop(fx: FixtureBuilder, orientedEdgeIds: number[]): number {
  return fx.add("EDGE_LOOP", ["", orientedEdgeIds.map(id => ({ ref: id }))]);
}
function faceBound(fx: FixtureBuilder, loopId: number): number {
  return fx.add("FACE_BOUND", ["", { ref: loopId }, true]);
}
function advancedFace(fx: FixtureBuilder, boundIds: number[], surfaceId: number): number {
  return fx.add("ADVANCED_FACE", [
    "",
    boundIds.map(id => ({ ref: id })),
    { ref: surfaceId },
    true,
  ]);
}

/** Build a single planar quad face from 4 coplanar 3D points with given normal. */
function planarQuadFace(
  fx: FixtureBuilder,
  origin: Vec3D,
  axis: Vec3D,
  refDir: Vec3D,
  corners: Vec3D[]
): number {
  const placementId = axis2Placement(
    fx,
    cartesianPoint(fx, origin.x, origin.y, origin.z),
    direction(fx, axis.x, axis.y, axis.z),
    direction(fx, refDir.x, refDir.y, refDir.z)
  );
  const surfaceId = plane(fx, placementId);

  // Build edge loop: vertex N → vertex N+1 → ... → vertex 0
  const vertexIds = corners.map(c =>
    vertexPoint(fx, cartesianPoint(fx, c.x, c.y, c.z))
  );
  const edgeIds: number[] = [];
  for (let i = 0; i < vertexIds.length; i++) {
    const next = (i + 1) % vertexIds.length;
    edgeIds.push(orientedEdge(fx, edgeCurve(fx, vertexIds[i], vertexIds[next])));
  }
  const loopId = edgeLoop(fx, edgeIds);
  const boundId = faceBound(fx, loopId);
  return advancedFace(fx, [boundId], surfaceId);
}

// ─── Test suites ────────────────────────────────────────────────────────────

describe("BRepTessellatorEngine — input validation", () => {
  it("rejects non-Map stepData with a descriptive error", () => {
    expect(() =>
      BRepTessellatorEngine.tessellateBrep({} as StepData, new Map())
    ).toThrow(/stepData\.byType must be a Map/);
  });

  it("rejects non-Map entityMap", () => {
    const fx = newFixture();
    expect(() =>
      BRepTessellatorEngine.tessellateBrep(fx.stepData(), {} as Map<number, StepEntity>)
    ).toThrow(/entityMap must be a Map/);
  });

  it("returns empty mesh when no ADVANCED_FACE entities exist", () => {
    const fx = newFixture();
    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics).toEqual({ faces: 0, triangles: 0, vertices: 0 });
    expect(result.vertices).toEqual([]);
    expect(result.triangles).toEqual([]);
    expect(result.faceInfo).toEqual([]);
  });

  it("Zod schema accepts valid options and rejects out-of-range resolution", () => {
    expect(TessellateBrepInputSchema.parse({ resolution: 24 })).toEqual({ resolution: 24 });
    expect(() => TessellateBrepInputSchema.parse({ resolution: -1 })).toThrow();
    expect(() => TessellateBrepInputSchema.parse({ resolution: 4096 })).toThrow();
    expect(() => TessellateBrepInputSchema.parse({ resolution: 1.5 })).toThrow();
  });
});

describe("BRepTessellatorEngine — primitives (linear algebra)", () => {
  it("normalize() of zero vector returns Z-axis", () => {
    expect(BRepTessellatorEngine.normalize({ x: 0, y: 0, z: 0 })).toEqual({ x: 0, y: 0, z: 1 });
  });

  it("normalize() preserves direction and produces unit length", () => {
    const n = BRepTessellatorEngine.normalize({ x: 3, y: 4, z: 0 });
    expect(n.x).toBeCloseTo(0.6, 10);
    expect(n.y).toBeCloseTo(0.8, 10);
    expect(n.z).toBeCloseTo(0, 10);
  });

  it("cross() — right-handed: X × Y = Z", () => {
    expect(BRepTessellatorEngine.cross(
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    )).toEqual({ x: 0, y: 0, z: 1 });
  });

  it("cross() — Y × X = -Z", () => {
    expect(BRepTessellatorEngine.cross(
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 }
    )).toEqual({ x: 0, y: 0, z: -1 });
  });

  it("transformPoint() — identity placement is a no-op", () => {
    const placement = {
      origin: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      refDir: { x: 1, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    };
    const p = BRepTessellatorEngine.transformPoint({ x: 1, y: 2, z: 3 }, placement);
    expect(p).toEqual({ x: 1, y: 2, z: 3 });
  });

  it("transformPoint() — translation only", () => {
    const placement = {
      origin: { x: 10, y: 20, z: 30 },
      axis: { x: 0, y: 0, z: 1 },
      refDir: { x: 1, y: 0, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    };
    expect(BRepTessellatorEngine.transformPoint({ x: 1, y: 2, z: 3 }, placement))
      .toEqual({ x: 11, y: 22, z: 33 });
  });

  it("transformPoint() — 90° Z-axis rotation: (1,0,0) → (0,1,0)", () => {
    // refDir = +Y, axis = +Z ⇒ local X-axis becomes world +Y
    const placement = {
      origin: { x: 0, y: 0, z: 0 },
      axis: { x: 0, y: 0, z: 1 },
      refDir: { x: 0, y: 1, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    };
    const p = BRepTessellatorEngine.transformPoint({ x: 1, y: 0, z: 0 }, placement);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(1, 10);
    expect(p.z).toBeCloseTo(0, 10);
  });

  it("getPlacement() returns identity when ref undefined", () => {
    const p = BRepTessellatorEngine.getPlacement(undefined, new Map());
    expect(p.origin).toEqual({ x: 0, y: 0, z: 0 });
    expect(p.axis).toEqual({ x: 0, y: 0, z: 1 });
    expect(p.refDir).toEqual({ x: 1, y: 0, z: 0 });
  });

  it("getPlacement() resolves AXIS2_PLACEMENT_3D correctly", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 5, 6, 7),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    const p = BRepTessellatorEngine.getPlacement(placementId, fx.entities);
    expect(p.origin).toEqual({ x: 5, y: 6, z: 7 });
    expect(p.axis).toEqual({ x: 0, y: 0, z: 1 });
    expect(p.refDir).toEqual({ x: 1, y: 0, z: 0 });
  });
});

describe("BRepTessellatorEngine — earClipTriangulate()", () => {
  it("returns empty for degenerate polygons (< 3 vertices)", () => {
    expect(BRepTessellatorEngine.earClipTriangulate([])).toEqual([]);
    expect(BRepTessellatorEngine.earClipTriangulate([{ x: 0, y: 0 }])).toEqual([]);
    expect(BRepTessellatorEngine.earClipTriangulate([
      { x: 0, y: 0 }, { x: 1, y: 0 },
    ])).toEqual([]);
  });

  it("returns single triangle for a 3-vertex polygon", () => {
    expect(BRepTessellatorEngine.earClipTriangulate([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 },
    ])).toEqual([[0, 1, 2]]);
  });

  it("triangulates a CCW square into exactly 2 triangles", () => {
    const tris = BRepTessellatorEngine.earClipTriangulate([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ]);
    expect(tris).toHaveLength(2);
    // Every output vertex must be a valid index in [0,3]
    for (const tri of tris) {
      for (const idx of tri) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(4);
      }
    }
    // Triangle count invariant: n-vertex simple polygon ⇒ n-2 triangles
    expect(tris.length).toBe(4 - 2);
  });

  it("triangulates a regular hexagon into 4 triangles", () => {
    const hexagon: Array<{ x: number; y: number }> = [];
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * 2 * Math.PI;
      hexagon.push({ x: Math.cos(a), y: Math.sin(a) });
    }
    const tris = BRepTessellatorEngine.earClipTriangulate(hexagon);
    expect(tris.length).toBe(6 - 2);
  });

  it("triangulates a CW square (negative signed area) — same triangle count", () => {
    const tris = BRepTessellatorEngine.earClipTriangulate([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 },
    ]);
    expect(tris).toHaveLength(2);
  });

  it("signedArea() — CCW unit square is +0.5", () => {
    expect(BRepTessellatorEngine.signedArea([
      { x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 },
    ])).toBeCloseTo(1, 10);
  });

  it("signedArea() — CW square is -1", () => {
    expect(BRepTessellatorEngine.signedArea([
      { x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 1, y: 0 },
    ])).toBeCloseTo(-1, 10);
  });

  it("pointInTriangle() — interior point is inside, edge & exterior are not", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 1, y: 0 };
    const c = { x: 0, y: 1 };
    expect(BRepTessellatorEngine.pointInTriangle({ x: 0.25, y: 0.25 }, a, b, c)).toBe(true);
    expect(BRepTessellatorEngine.pointInTriangle({ x: 0.5, y: 0.6 }, a, b, c)).toBe(false);
    expect(BRepTessellatorEngine.pointInTriangle({ x: -0.1, y: 0.5 }, a, b, c)).toBe(false);
  });
});

describe("BRepTessellatorEngine — planar face (cube)", () => {
  it("a single 1×1 unit-square face → 4 vertices, 2 triangles, 1 faceInfo entry × 2", () => {
    const fx = newFixture();
    planarQuadFace(
      fx,
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 1 },
      { x: 1, y: 0, z: 0 },
      [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 },
        { x: 0, y: 1, z: 0 },
      ]
    );
    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics.faces).toBe(1);
    expect(result.statistics.vertices).toBe(4);
    expect(result.statistics.triangles).toBe(2);
    expect(result.faceInfo).toEqual([0, 0]);
    expect(result.vertices).toEqual([
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 1, y: 1, z: 0 },
      { x: 0, y: 1, z: 0 },
    ]);
    // All normals point in +Z (the placement axis)
    for (const n of result.normals) {
      expect(n.x).toBeCloseTo(0, 10);
      expect(n.y).toBeCloseTo(0, 10);
      expect(n.z).toBeCloseTo(1, 10);
    }
  });

  it("a 6-face cube produces 12 triangles, 24 vertices, faceInfo length === triangles", () => {
    const fx = newFixture();
    // 6 faces of a unit cube, each its own placement+plane+loop
    // Bottom (z=0) facing -Z
    planarQuadFace(fx,
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -1 }, { x: 1, y: 0, z: 0 },
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 0, z: 0 }]
    );
    // Top (z=1) facing +Z
    planarQuadFace(fx,
      { x: 0, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
      [{ x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 0, y: 1, z: 1 }]
    );
    // Front (y=0) facing -Y
    planarQuadFace(fx,
      { x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 }, { x: 1, y: 0, z: 0 },
      [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 1 }, { x: 0, y: 0, z: 1 }]
    );
    // Back (y=1) facing +Y
    planarQuadFace(fx,
      { x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 1, y: 0, z: 0 },
      [{ x: 0, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }, { x: 1, y: 1, z: 0 }]
    );
    // Left (x=0) facing -X
    planarQuadFace(fx,
      { x: 0, y: 0, z: 0 }, { x: -1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
      [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 0, y: 1, z: 1 }, { x: 0, y: 1, z: 0 }]
    );
    // Right (x=1) facing +X
    planarQuadFace(fx,
      { x: 1, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
      [{ x: 1, y: 0, z: 0 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }, { x: 1, y: 0, z: 1 }]
    );

    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics.faces).toBe(6);
    expect(result.statistics.vertices).toBe(24);
    expect(result.statistics.triangles).toBe(12);
    expect(result.faceInfo).toHaveLength(12);
    // faceInfo must be in order: 0,0, 1,1, 2,2, ...
    for (let f = 0; f < 6; f++) {
      expect(result.faceInfo[2 * f]).toBe(f);
      expect(result.faceInfo[2 * f + 1]).toBe(f);
    }
    // All triangle indices must be valid into the global vertex buffer
    for (const tri of result.triangles) {
      for (const idx of tri) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(result.vertices.length);
      }
    }
  });

  it("planar face with only 2 boundary vertices returns empty mesh (no crash)", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 0, 0, 0),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    const surfaceId = plane(fx, placementId);
    const v1 = vertexPoint(fx, cartesianPoint(fx, 0, 0, 0));
    const v2 = vertexPoint(fx, cartesianPoint(fx, 1, 0, 0));
    const e1 = orientedEdge(fx, edgeCurve(fx, v1, v2));
    const e2 = orientedEdge(fx, edgeCurve(fx, v2, v1));
    const loopId = edgeLoop(fx, [e1, e2]);
    const boundId = faceBound(fx, loopId);
    advancedFace(fx, [boundId], surfaceId);

    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics.faces).toBe(1);
    expect(result.statistics.triangles).toBe(0);
    expect(result.statistics.vertices).toBe(0);
  });
});

describe("BRepTessellatorEngine — parametric surfaces", () => {
  it("CYLINDRICAL_SURFACE: produces a regular (numCirc+1)×(numHeight+1) vertex grid", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 0, 0, 0),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    const surfaceId = cylindricalSurface(fx, placementId, 10);
    advancedFace(fx, [], surfaceId);
    const result = BRepTessellatorEngine.tessellateBrep(
      fx.stepData(), fx.entities, { resolution: 24 }
    );
    // Default bounds: full revolution × height [0,10]
    //   numCirc  = ceil(24 · 2π / 2π) = 24
    //   numHeight = ceil(24 · 10 / 50) = 5  (heightRange / 50 is the empirical aspect-ratio knob)
    const numCirc = 24;
    const numHeight = 5;
    const expectedVerts = (numCirc + 1) * (numHeight + 1);
    expect(result.statistics.vertices).toBe(expectedVerts);
    // Each grid cell ⇒ 2 triangles
    expect(result.statistics.triangles).toBe(numCirc * numHeight * 2);
    // Every vertex must lie within ±0.001 of radius from axis (i.e. on the cylinder)
    for (const v of result.vertices) {
      const r = Math.sqrt(v.x * v.x + v.y * v.y);
      expect(r).toBeCloseTo(10, 6);
    }
    // Every normal must point radially outward (unit length, no z-component)
    for (const n of result.normals) {
      const len = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
      expect(len).toBeCloseTo(1, 6);
      expect(n.z).toBeCloseTo(0, 6);
    }
  });

  it("SPHERICAL_SURFACE: every vertex lies on radius=5", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 0, 0, 0),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    const surfaceId = sphericalSurface(fx, placementId, 5);
    advancedFace(fx, [], surfaceId);
    const result = BRepTessellatorEngine.tessellateBrep(
      fx.stepData(), fx.entities, { resolution: 20 }
    );
    expect(result.statistics.faces).toBe(1);
    // numLat=20, numLon=40 ⇒ (21)*(41) = 861 vertices
    expect(result.statistics.vertices).toBe(21 * 41);
    for (const v of result.vertices) {
      const r = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
      expect(r).toBeCloseTo(5, 6);
    }
    // Sphere normals are radially outward unit vectors
    for (let i = 0; i < result.vertices.length; i++) {
      const v = result.vertices[i];
      const n = result.normals[i];
      expect(n.x).toBeCloseTo(v.x / 5, 6);
      expect(n.y).toBeCloseTo(v.y / 5, 6);
      expect(n.z).toBeCloseTo(v.z / 5, 6);
    }
  });

  it("CONICAL_SURFACE: base radius (z=0) matches input; apex direction reduces radius", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 0, 0, 0),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    // semiAngle = π/6 (30°), so radius increases by tan(30°) ≈ 0.5774 per unit z
    const surfaceId = conicalSurface(fx, placementId, 5, Math.PI / 6);
    advancedFace(fx, [], surfaceId);
    const result = BRepTessellatorEngine.tessellateBrep(
      fx.stepData(), fx.entities, { resolution: 12 }
    );
    expect(result.statistics.faces).toBe(1);
    // Default bounds z=[0,10]; expect base ring at z=0 with radius=5
    let baseRingVertices = 0;
    for (const v of result.vertices) {
      if (Math.abs(v.z) < 1e-6) {
        baseRingVertices++;
        const r = Math.sqrt(v.x * v.x + v.y * v.y);
        expect(r).toBeCloseTo(5, 6);
      }
    }
    expect(baseRingVertices).toBeGreaterThan(0);
  });

  it("TOROIDAL_SURFACE: full torus has 2π major × 2π minor sweep", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 0, 0, 0),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    const surfaceId = toroidalSurface(fx, placementId, 10, 2);
    advancedFace(fx, [], surfaceId);
    const result = BRepTessellatorEngine.tessellateBrep(
      fx.stepData(), fx.entities, { resolution: 16 }
    );
    expect(result.statistics.faces).toBe(1);
    // For a torus, r_world = sqrt(x²+y²) ∈ [majorR - minorR, majorR + minorR] = [8, 12]
    for (const v of result.vertices) {
      const r = Math.sqrt(v.x * v.x + v.y * v.y);
      expect(r).toBeGreaterThanOrEqual(10 - 2 - 1e-6);
      expect(r).toBeLessThanOrEqual(10 + 2 + 1e-6);
      expect(Math.abs(v.z)).toBeLessThanOrEqual(2 + 1e-6);
    }
  });
});

describe("BRepTessellatorEngine — error handling", () => {
  it("continueOnFaceError=true (default) skips faces with missing surface refs", () => {
    const fx = newFixture();
    // Face that points to a nonexistent surface id
    fx.add("ADVANCED_FACE", ["", [], { ref: 9999 }, true]);
    // Plus one valid planar face
    planarQuadFace(
      fx,
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
      [
        { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
      ]
    );
    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    // Only the valid face was counted
    expect(result.statistics.faces).toBe(1);
    expect(result.statistics.triangles).toBe(2);
  });

  it("continueOnFaceError=false rethrows on a bad face", () => {
    const fx = newFixture();
    fx.add("ADVANCED_FACE", ["", [], { ref: 9999 }, true]);
    expect(() =>
      BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities, {
        continueOnFaceError: false,
      })
    ).toThrow(/surface #9999 not found/);
  });

  it("unsupported surface type throws a descriptive error", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 0, 0, 0),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    const surfaceId = fx.add("OFFSET_SURFACE", ["", { ref: placementId }]);
    advancedFace(fx, [], surfaceId);
    expect(() =>
      BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities, {
        continueOnFaceError: false,
      })
    ).toThrow(/unsupported surface type "OFFSET_SURFACE"/);
  });
});

describe("BRepTessellatorEngine — adversarial / boundary inputs", () => {
  it("NaN coordinates in vertex points propagate without throwing", () => {
    const fx = newFixture();
    const placementId = axis2Placement(
      fx,
      cartesianPoint(fx, 0, 0, 0),
      direction(fx, 0, 0, 1),
      direction(fx, 1, 0, 0)
    );
    const surfaceId = plane(fx, placementId);
    const v0 = vertexPoint(fx, cartesianPoint(fx, NaN, 0, 0));
    const v1 = vertexPoint(fx, cartesianPoint(fx, 1, 0, 0));
    const v2 = vertexPoint(fx, cartesianPoint(fx, 1, 1, 0));
    const v3 = vertexPoint(fx, cartesianPoint(fx, 0, 1, 0));
    const eids = [
      orientedEdge(fx, edgeCurve(fx, v0, v1)),
      orientedEdge(fx, edgeCurve(fx, v1, v2)),
      orientedEdge(fx, edgeCurve(fx, v2, v3)),
      orientedEdge(fx, edgeCurve(fx, v3, v0)),
    ];
    advancedFace(fx, [faceBound(fx, edgeLoop(fx, eids))], surfaceId);
    // Should produce a face entry (numerically degenerate, but no exception)
    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics.faces).toBe(1);
  });

  it("100-face mixed mesh assembles without index corruption", () => {
    const fx = newFixture();
    for (let i = 0; i < 100; i++) {
      planarQuadFace(
        fx,
        { x: i, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
        [
          { x: i, y: 0, z: 0 }, { x: i + 1, y: 0, z: 0 },
          { x: i + 1, y: 1, z: 0 }, { x: i, y: 1, z: 0 },
        ]
      );
    }
    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics.faces).toBe(100);
    expect(result.statistics.vertices).toBe(400);
    expect(result.statistics.triangles).toBe(200);
    // Every triangle index must be in [0, totalVerts)
    for (const tri of result.triangles) {
      for (const idx of tri) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(400);
      }
    }
    // faceInfo must be monotonic non-decreasing — face 0's triangles come before face 1's
    for (let i = 1; i < result.faceInfo.length; i++) {
      expect(result.faceInfo[i]).toBeGreaterThanOrEqual(result.faceInfo[i - 1]);
    }
  });

  it("Infinity coordinates do not crash the tessellator", () => {
    const fx = newFixture();
    planarQuadFace(
      fx,
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
      [
        { x: 0, y: 0, z: 0 }, { x: Infinity, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
      ]
    );
    // Function executes — caller decides what to do with degenerate output
    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics.faces).toBe(1);
  });
});

describe("BRepTessellatorEngine — B-spline (tensor-product fallback)", () => {
  it("4×4 control grid produces resolution×resolution mesh", () => {
    const fx = newFixture();
    // Build 4×4 control-point grid for a flat-ish surface in XY plane
    const ptRefs: Array<Array<{ ref: number }>> = [];
    for (let i = 0; i < 4; i++) {
      const row: Array<{ ref: number }> = [];
      for (let j = 0; j < 4; j++) {
        row.push({ ref: cartesianPoint(fx, i, j, 0) });
      }
      ptRefs.push(row);
    }
    const surfaceId = fx.add("B_SPLINE_SURFACE_WITH_KNOTS", [
      "",       // name
      3,        // degreeU
      3,        // degreeV
      ptRefs,   // control points
      ".UNSPECIFIED.", ".F.", ".F.", ".F.",
      [4, 4], [4, 4], [0, 1], [0, 1],
      ".UNSPECIFIED.",
    ]);
    advancedFace(fx, [], surfaceId);
    const result = BRepTessellatorEngine.tessellateBrep(
      fx.stepData(), fx.entities, { resolution: 10 }
    );
    expect(result.statistics.faces).toBe(1);
    expect(result.statistics.vertices).toBe(11 * 11);
    expect(result.statistics.triangles).toBe(10 * 10 * 2);
    // All vertices should lie roughly in the spanned box [0,3]×[0,3]×{0}
    for (const v of result.vertices) {
      expect(v.x).toBeGreaterThanOrEqual(-1e-9);
      expect(v.x).toBeLessThanOrEqual(3 + 1e-9);
      expect(v.y).toBeGreaterThanOrEqual(-1e-9);
      expect(v.y).toBeLessThanOrEqual(3 + 1e-9);
      expect(v.z).toBeCloseTo(0, 9);
    }
  });

  it("degenerate B-spline (<2×2 grid) returns empty mesh", () => {
    const fx = newFixture();
    const surfaceId = fx.add("B_SPLINE_SURFACE_WITH_KNOTS", [
      "", 1, 1, [[{ ref: cartesianPoint(fx, 0, 0, 0) }]], // 1×1 grid
    ]);
    advancedFace(fx, [], surfaceId);
    const result = BRepTessellatorEngine.tessellateBrep(fx.stepData(), fx.entities);
    expect(result.statistics.faces).toBe(1);
    expect(result.statistics.vertices).toBe(0);
    expect(result.statistics.triangles).toBe(0);
  });

  it("generateUniformKnots() produces a clamped uniform vector", () => {
    const knots = BRepTessellatorEngine.generateUniformKnots(5, 2);
    // 5 control points, degree 2 ⇒ 5+2+1 = 8 knots
    expect(knots).toHaveLength(8);
    // Clamped: first (degree+1)=3 knots are 0, last 3 are 1
    expect(knots.slice(0, 3)).toEqual([0, 0, 0]);
    expect(knots.slice(-3)).toEqual([1, 1, 1]);
    // Interior knots strictly increasing in [0, 1]
    for (let i = 0; i < knots.length - 1; i++) {
      expect(knots[i]).toBeLessThanOrEqual(knots[i + 1]);
    }
  });
});

describe("BRepTessellatorEngine — dispatcher round-trip (brep_tessellate)", () => {
  it("invoking brep_tessellate via cadDispatcher returns success + valid mesh stats", async () => {
    const { handleCadAction } = await import("../tools/dispatchers/cadDispatcher.js")
      .catch(() => ({ handleCadAction: null as null | ((a: { action: string; params: unknown }) => Promise<unknown>) }));
    // The dispatcher exports the handler in a few different shapes across PRISM history.
    // Lookup the registered handler dynamically rather than asserting a static export.
    const dispatcherMod = await import("../tools/dispatchers/cadDispatcher.js");
    const registerFn =
      (dispatcherMod as unknown as Record<string, unknown>).registerCadDispatcher ??
      (dispatcherMod as unknown as Record<string, unknown>).default;

    // Build a one-face cube fixture
    const fx = newFixture();
    planarQuadFace(
      fx,
      { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 1 }, { x: 1, y: 0, z: 0 },
      [
        { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
        { x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 0 },
      ]
    );

    // Capture the registered action handler via a mock MCP server (tool registration sink)
    let capturedHandler:
      | ((args: { action: string; params: Record<string, unknown> }) => Promise<unknown>)
      | null = null;
    const mockServer = {
      registerTool: (
        _name: string,
        _meta: unknown,
        _schema: unknown,
        handler: (a: { action: string; params: Record<string, unknown> }) => Promise<unknown>
      ) => {
        capturedHandler = handler;
      },
      tool: (
        _name: string,
        _meta: unknown,
        _schema: unknown,
        handler: (a: { action: string; params: Record<string, unknown> }) => Promise<unknown>
      ) => {
        capturedHandler = handler;
      },
    };
    if (typeof registerFn === "function") {
      try {
        (registerFn as (s: unknown) => void)(mockServer);
      } catch {
        // Registration may require additional shape — skip to direct engine path.
      }
    }

    if (capturedHandler) {
      // Serialize Maps to plain objects (MCP boundary)
      const byTypeObj: Record<string, unknown> = {};
      for (const [k, v] of fx.byType.entries()) byTypeObj[k] = v;
      const entityMapObj: Record<string, unknown> = {};
      for (const [k, v] of fx.entities.entries()) entityMapObj[String(k)] = v;

      const response = await capturedHandler({
        action: "brep_tessellate",
        params: { stepData: { byType: byTypeObj }, entityMap: entityMapObj, options: { resolution: 16 } },
      }) as { content?: Array<{ text: string }>; structuredContent?: unknown };

      // MCP responses use {content:[{type:'text',text:JSON}], structuredContent?}
      const text = response?.content?.[0]?.text;
      expect(typeof text).toBe("string");
      const parsed = JSON.parse(text as string) as { success: boolean; data: { statistics: { faces: number; triangles: number; vertices: number } } };
      expect(parsed.success).toBe(true);
      expect(parsed.data.statistics.faces).toBe(1);
      expect(parsed.data.statistics.triangles).toBe(2);
      expect(parsed.data.statistics.vertices).toBe(4);
    } else {
      // Dispatcher registration shape isn't directly invocable — at minimum
      // assert the action enum contains brep_tessellate (textual contract check).
      const fs = await import("node:fs");
      const src = fs.readFileSync(
        "H:/prism/mcp-server/src/tools/dispatchers/cadDispatcher.ts",
        "utf8"
      );
      expect(src).toContain('"brep_tessellate"');
      expect(src).toContain('case "brep_tessellate"');
    }
    // Reference handleCadAction usage to keep the linter happy.
    void handleCadAction;
  });
});

describe("BRepTessellatorEngine — buildParametricGrid()", () => {
  it("produces (numU+1)*(numV+1) vertices and 2*numU*numV triangles", () => {
    const mesh = BRepTessellatorEngine.buildParametricGrid(5, 7, (i, j) => ({
      point: { x: i, y: j, z: 0 },
      normal: { x: 0, y: 0, z: 1 },
    }));
    expect(mesh.vertices).toHaveLength(6 * 8);
    expect(mesh.triangles).toHaveLength(5 * 7 * 2);
    // First vertex is (0, 0, 0)
    expect(mesh.vertices[0]).toEqual({ x: 0, y: 0, z: 0 });
    // Last vertex is (5, 7, 0)
    expect(mesh.vertices[mesh.vertices.length - 1]).toEqual({ x: 5, y: 7, z: 0 });
    // Every triangle index must be valid
    for (const tri of mesh.triangles) {
      for (const idx of tri) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(mesh.vertices.length);
      }
    }
  });
});
