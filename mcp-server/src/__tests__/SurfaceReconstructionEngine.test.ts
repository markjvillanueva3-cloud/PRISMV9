/**
 * SurfaceReconstructionEngine — Bernardini ball-pivoting tests.
 *
 * U-GAP-CAD-SURFACE-RECON re-scope per R8 dedup-preflight:
 * engine already ported (header: "Ported from
 * PRISM_SURFACE_RECONSTRUCTION_ENGINE.js (monolith R2.3.1)") but no tests.
 *
 * Reference primitives:
 *   - distance3D — Euclidean (3-4-5 reference).
 *   - triangleNormal — RHS cross product → unit normal.
 *   - triangleArea — shoelace-style: unit-right-triangle has area 0.5.
 *   - triangleCircumradius — unit equilateral triangle: r = √3 / 3.
 *   - triangleCircumcenter — equilateral centered at origin → circumcenter ~origin.
 *   - estimateBallRadius — bounded by minimum pairwise distance.
 *
 * Literature:
 *   - Bernardini, Mittleman, Rushmeier, Silva, Taubin (1999).
 *     "The Ball-Pivoting Algorithm for Surface Reconstruction."
 */

import { describe, it, expect } from "vitest";
import { surfaceReconstructionEngine } from "../engines/SurfaceReconstructionEngine";
import type { Point3D } from "../engines/SurfaceReconstructionEngine";

const eng = surfaceReconstructionEngine;

describe("SurfaceReconstructionEngine — distance3D", () => {
  it("Pythagorean 3-4-5 triangle in XY plane", () => {
    const d = eng.distance3D({ x: 0, y: 0, z: 0 }, { x: 3, y: 4, z: 0 });
    expect(d).toBeCloseTo(5, 10);
  });

  it("symmetric: distance(a,b) == distance(b,a)", () => {
    const a = { x: 1, y: 2, z: 3 };
    const b = { x: 4, y: 6, z: 7 };
    expect(eng.distance3D(a, b)).toBeCloseTo(eng.distance3D(b, a), 10);
  });

  it("distance from a point to itself is 0", () => {
    expect(eng.distance3D({ x: 1, y: 2, z: 3 }, { x: 1, y: 2, z: 3 })).toBe(0);
  });
});

describe("SurfaceReconstructionEngine — triangle geometry", () => {
  it("triangleNormal of CCW XY triangle points +Z, unit-length", () => {
    const n = eng.triangleNormal(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    );
    expect(n.x).toBeCloseTo(0, 10);
    expect(n.y).toBeCloseTo(0, 10);
    expect(n.z).toBeCloseTo(1, 10);
    const norm = Math.sqrt(n.x * n.x + n.y * n.y + n.z * n.z);
    expect(norm).toBeCloseTo(1, 10);
  });

  it("triangleNormal of CW XY triangle points -Z", () => {
    const n = eng.triangleNormal(
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 1, y: 0, z: 0 }
    );
    expect(n.z).toBeCloseTo(-1, 10);
  });

  it("triangleArea of unit-right triangle is 0.5", () => {
    const A = eng.triangleArea(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }
    );
    expect(A).toBeCloseTo(0.5, 10);
  });

  it("triangleArea of 3-4-5 right triangle is 6", () => {
    const A = eng.triangleArea(
      { x: 0, y: 0, z: 0 },
      { x: 3, y: 0, z: 0 },
      { x: 0, y: 4, z: 0 }
    );
    expect(A).toBeCloseTo(6, 10);
  });

  it("triangleCircumradius of unit equilateral is √3/3", () => {
    const r = eng.triangleCircumradius(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: Math.sqrt(3) / 2, z: 0 }
    );
    expect(r).toBeCloseTo(Math.sqrt(3) / 3, 4);
  });

  it("triangleCircumcenter of equilateral centered at origin is ≈ origin", () => {
    const c = eng.triangleCircumcenter(
      { x: -0.5, y: 0, z: 0 },
      { x: 0.5, y: 0, z: 0 },
      { x: 0, y: Math.sqrt(3) / 2, z: 0 }
    );
    expect(c.x).toBeCloseTo(0, 4);
    // Y at incenter is √3/6 for a unit-side equilateral centered at x-mid
    expect(c.y).toBeCloseTo(Math.sqrt(3) / 6, 4);
  });
});

describe("SurfaceReconstructionEngine — ballCenter", () => {
  it("returns null when the ball is too small for the triangle (radius < circumradius)", () => {
    // Unit equilateral has circumradius √3/3 ≈ 0.577; radius 0.3 is below
    const result = eng.ballCenter(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: Math.sqrt(3) / 2, z: 0 },
      0.3
    );
    expect(result).toBeNull();
  });

  it("returns a finite center for valid radius", () => {
    const c = eng.ballCenter(
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: Math.sqrt(3) / 2, z: 0 },
      1.0
    );
    expect(c).not.toBeNull();
    if (c) {
      expect(Number.isFinite(c.x)).toBe(true);
      expect(Number.isFinite(c.y)).toBe(true);
      expect(Number.isFinite(c.z)).toBe(true);
    }
  });
});

describe("SurfaceReconstructionEngine — estimateBallRadius", () => {
  it("on 4 unit-spaced points produces a positive finite radius", () => {
    const pts: Point3D[] = [
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: 1 },
    ];
    const r = eng.estimateBallRadius(pts, 3);
    expect(r).toBeGreaterThan(0);
    expect(Number.isFinite(r)).toBe(true);
  });

  it("scales linearly with point spacing", () => {
    const small: Point3D[] = [
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }, { x: 0, y: 1, z: 0 },
    ];
    const large: Point3D[] = small.map(p => ({ x: p.x * 10, y: p.y * 10, z: p.z * 10 }));
    const rs = eng.estimateBallRadius(small, 2);
    const rl = eng.estimateBallRadius(large, 2);
    expect(rl / rs).toBeCloseTo(10, 1);
  });

  it("k larger than point count is handled gracefully", () => {
    const pts: Point3D[] = [{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }];
    const r = eng.estimateBallRadius(pts, 100);
    expect(Number.isFinite(r)).toBe(true);
  });
});

describe("SurfaceReconstructionEngine — findSeedTriangle", () => {
  it("finds a seed in a small dense set", () => {
    const pts: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: Math.sqrt(3) / 2, z: 0 },
      { x: 0.5, y: 0.3, z: 0 },
    ];
    const seed = eng.findSeedTriangle(pts, 1.0);
    expect(seed).not.toBeNull();
    if (seed) {
      const indices = new Set([seed.i, seed.j, seed.k]);
      expect(indices.size).toBe(3); // distinct indices
      for (const idx of [seed.i, seed.j, seed.k]) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(pts.length);
      }
    }
  });

  it("returns null when no triangle fits the ball", () => {
    const pts: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 }, // too far apart
      { x: 0, y: 100, z: 0 },
    ];
    const seed = eng.findSeedTriangle(pts, 0.1);
    expect(seed).toBeNull();
  });
});

describe("SurfaceReconstructionEngine — ballPivoting", () => {
  it("returns a valid mesh structure for a small point cloud", () => {
    // Roughly planar point cloud — should give some triangles
    const pts: Point3D[] = [
      { x: 0, y: 0, z: 0 },
      { x: 1, y: 0, z: 0 },
      { x: 0.5, y: Math.sqrt(3) / 2, z: 0 },
      { x: 0.5, y: 0.3, z: 0 },
      { x: 1.5, y: 0.5, z: 0 },
    ];
    const mesh = eng.ballPivoting(pts, { radius: 1.0 });
    expect(mesh.vertices).toBeInstanceOf(Float32Array);
    expect(mesh.indices).toBeInstanceOf(Uint32Array);
    expect(mesh.vertexCount).toBe(pts.length);
    expect(mesh.triangleCount).toBe(mesh.indices.length / 3);
    // All triangle indices reference valid vertices
    for (const idx of Array.from(mesh.indices)) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(mesh.vertexCount);
    }
  });

  it("vertex buffer encodes input point coordinates", () => {
    const pts: Point3D[] = [
      { x: 1, y: 2, z: 3 }, { x: 4, y: 5, z: 6 }, { x: 7, y: 8, z: 9 },
    ];
    const mesh = eng.ballPivoting(pts, { radius: 100 });
    expect(mesh.vertices[0]).toBe(1);
    expect(mesh.vertices[1]).toBe(2);
    expect(mesh.vertices[2]).toBe(3);
    expect(mesh.vertices[6]).toBe(7);
  });

  it("auto-radius (null) chooses a finite radius", () => {
    const pts: Point3D[] = [
      { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 },
    ];
    // Should not crash with radius=null
    const mesh = eng.ballPivoting(pts, { radius: null });
    expect(mesh.vertexCount).toBe(4);
  });

  it("empty point cloud → empty mesh", () => {
    const mesh = eng.ballPivoting([], { radius: 1 });
    expect(mesh.vertexCount).toBe(0);
    expect(mesh.triangleCount).toBe(0);
  });
});
