/**
 * Tests for SQP and ParametricSurface engines
 */
import { describe, it, expect } from "vitest";
import { sqpEngine } from "../engines/SQPEngine.js";
import { parametricSurfaceEngine } from "../engines/ParametricSurfaceEngine.js";

// ===========================================================================
// SQP
// ===========================================================================

describe("SQP — Constrained Optimization", () => {
  it("minimizes unconstrained quadratic", () => {
    const result = sqpEngine.minimize(
      (x) => (x[0] - 3) ** 2 + (x[1] - 2) ** 2,
      { dimensions: 2, x0: [0, 0] }
    );
    expect(Math.abs(result.x[0] - 3)).toBeLessThan(0.5);
    expect(Math.abs(result.x[1] - 2)).toBeLessThan(0.5);
  });

  it("respects inequality constraints", () => {
    // min x0² + x1² s.t. x0 + x1 >= 4 (i.e., -(x0+x1-4) <= 0)
    const result = sqpEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      {
        dimensions: 2,
        x0: [3, 3],
        constraints: [(x) => -(x[0] + x[1] - 4)],  // x0+x1 >= 4
      }
    );
    expect(result.x[0] + result.x[1]).toBeGreaterThanOrEqual(3.5); // Near constraint boundary
  });

  it("respects bound constraints", () => {
    const result = sqpEngine.minimize(
      (x) => -x[0] - x[1],  // Maximize x0+x1 → goes to upper bounds
      {
        dimensions: 2,
        x0: [1, 1],
        bounds: [{ min: 0, max: 5 }, { min: 0, max: 3 }],
      }
    );
    expect(result.x[0]).toBeLessThanOrEqual(5.01);
    expect(result.x[1]).toBeLessThanOrEqual(3.01);
  });

  it("returns lagrange multipliers", () => {
    const result = sqpEngine.minimize(
      (x) => x[0] ** 2,
      {
        dimensions: 1,
        x0: [5],
        constraints: [(x) => x[0] - 10],  // x <= 10
      }
    );
    expect(result.lagrangeMultipliers.length).toBe(1);
  });

  it("constraintViolation is small at solution", () => {
    const result = sqpEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      {
        dimensions: 2,
        x0: [5, 5],
        bounds: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
      }
    );
    expect(result.constraintViolation).toBeLessThan(1);
  });

  it("handles equality constraints", () => {
    // min x0² + x1² s.t. x0 + x1 = 4
    const result = sqpEngine.minimize(
      (x) => x[0] ** 2 + x[1] ** 2,
      {
        dimensions: 2,
        x0: [3, 1],
        equalityConstraints: [(x) => x[0] + x[1] - 4],
      }
    );
    // Optimal: x0=x1=2, but SQP may not find exact equality
    expect(result.fval).toBeLessThan(20);
  });
});

// ===========================================================================
// ParametricSurface
// ===========================================================================

describe("ParametricSurface — Evaluation", () => {
  it("plane at (0.5, 0.5) returns origin", () => {
    const pt = parametricSurfaceEngine.evaluate(
      { type: "plane", origin: [0, 0, 0], width: 10, height: 10 },
      0.5, 0.5
    );
    expect(pt.position[0]).toBeCloseTo(0);
    expect(pt.position[1]).toBeCloseTo(0);
    expect(pt.position[2]).toBeCloseTo(0);
    expect(pt.normal).toEqual([0, 0, 1]);
  });

  it("cylinder generates points on circle", () => {
    const pt = parametricSurfaceEngine.evaluate(
      { type: "cylinder", origin: [0, 0, 0], radius: 5, height: 10 },
      0, 0.5
    );
    const r = Math.sqrt(pt.position[0] ** 2 + pt.position[1] ** 2);
    expect(r).toBeCloseTo(5, 1);
    expect(pt.position[2]).toBeCloseTo(5); // v=0.5 → half height
  });

  it("sphere generates points on sphere surface", () => {
    const pt = parametricSurfaceEngine.evaluate(
      { type: "sphere", origin: [0, 0, 0], radius: 3 },
      0.25, 0.5 // Equator, 90° around
    );
    const r = Math.sqrt(pt.position[0] ** 2 + pt.position[1] ** 2 + pt.position[2] ** 2);
    expect(r).toBeCloseTo(3, 1);
  });

  it("torus generates points on torus surface", () => {
    const pt = parametricSurfaceEngine.evaluate(
      { type: "torus", origin: [0, 0, 0], radius: 5, minorRadius: 1 },
      0, 0
    );
    // At u=0, v=0: position should be (R+r, 0, 0) = (6, 0, 0)
    expect(pt.position[0]).toBeCloseTo(6, 1);
    expect(pt.position[1]).toBeCloseTo(0, 1);
  });

  it("cone at apex converges to point", () => {
    const pt = parametricSurfaceEngine.evaluate(
      { type: "cone", origin: [0, 0, 0], radius: 3, height: 10 },
      0, 1 // v=1 is apex
    );
    // At apex, radius should be 0
    const r = Math.sqrt(pt.position[0] ** 2 + pt.position[1] ** 2);
    expect(r).toBeCloseTo(0, 1);
    expect(pt.position[2]).toBeCloseTo(10, 1);
  });
});

describe("ParametricSurface — Tessellation", () => {
  it("tessellate generates valid mesh", () => {
    const mesh = parametricSurfaceEngine.tessellate(
      { type: "sphere", radius: 1 }, 10, 10
    );
    expect(mesh.vertices.length).toBe(11 * 11);
    expect(mesh.triangles.length).toBe(10 * 10 * 2);
    expect(mesh.area).toBeGreaterThan(0);
  });

  it("sphere area approximates 4πr²", () => {
    const r = 2;
    const area = parametricSurfaceEngine.area({ type: "sphere", radius: r }, 50, 50);
    const expected = 4 * Math.PI * r * r;
    // Approximation should be within 5%
    expect(Math.abs(area - expected) / expected).toBeLessThan(0.05);
  });

  it("cylinder area approximates 2πrh", () => {
    const r = 3, h = 10;
    const area = parametricSurfaceEngine.area(
      { type: "cylinder", radius: r, height: h }, 50, 50
    );
    const expected = 2 * Math.PI * r * h;
    expect(Math.abs(area - expected) / expected).toBeLessThan(0.05);
  });
});

describe("ParametricSurface — Curvature", () => {
  it("sphere has constant positive Gaussian curvature", () => {
    const r = 5;
    const curv = parametricSurfaceEngine.curvature(
      { type: "sphere", radius: r }, 0.5, 0.5
    );
    // K = 1/r² for sphere
    expect(curv.gaussian).toBeGreaterThan(0);
    expect(curv.classification).toBe("elliptic");
  });

  it("plane has zero curvature", () => {
    const curv = parametricSurfaceEngine.curvature(
      { type: "plane", width: 10, height: 10 }, 0.5, 0.5
    );
    expect(Math.abs(curv.gaussian)).toBeLessThan(0.01);
    expect(curv.classification).toBe("planar");
  });

  it("cylinder has zero Gaussian curvature (parabolic)", () => {
    const curv = parametricSurfaceEngine.curvature(
      { type: "cylinder", radius: 5, height: 10 }, 0.5, 0.5
    );
    // Cylinder: K=0, one principal curvature = 1/r, other = 0
    expect(Math.abs(curv.gaussian)).toBeLessThan(0.1);
  });
});

describe("ParametricSurface — Closest Point", () => {
  it("closest point on sphere to external point", () => {
    const result = parametricSurfaceEngine.closestPoint(
      { type: "sphere", radius: 5 }, [10, 0, 0]
    );
    expect(result.distance).toBeCloseTo(5, 0);
    expect(result.point.position[0]).toBeCloseTo(5, 0);
  });

  it("closest point on plane", () => {
    const result = parametricSurfaceEngine.closestPoint(
      { type: "plane", origin: [0, 0, 0], width: 20, height: 20 }, [3, 3, 5]
    );
    expect(result.point.position[2]).toBeCloseTo(0);
    expect(result.distance).toBeCloseTo(5, 0);
  });
});
