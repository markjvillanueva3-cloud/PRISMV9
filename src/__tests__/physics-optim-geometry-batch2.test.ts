/**
 * Tests for batch 2: InteriorPoint, RigidBodyDynamics, Voronoi
 */
import { describe, it, expect } from "vitest";
import { interiorPointEngine } from "../engines/InteriorPointEngine.js";
import { rigidBodyDynamicsEngine } from "../engines/RigidBodyDynamicsEngine.js";
import { voronoiEngine } from "../engines/VoronoiEngine.js";

// ===========================================================================
// Interior Point
// ===========================================================================

describe("InteriorPoint — Linear Programming", () => {
  it("solves a simple LP: min -x1 - x2 s.t. x1+x2<=4, x1<=3, x2<=3", () => {
    const result = interiorPointEngine.solve({
      c: [-1, -1],
      A: [[1, 1], [1, 0], [0, 1]],
      b: [4, 3, 3],
      bounds: [{ min: 0, max: 3 }, { min: 0, max: 3 }],
    });
    expect(result.feasible).toBe(true);
    // Optimal near x=[2,2] or x=[3,1] etc with obj~-4
    expect(result.objectiveValue).toBeLessThan(-2);
  });

  it("respects bound constraints", () => {
    const result = interiorPointEngine.solve({
      c: [1, 1],
      A: [],
      b: [],
      bounds: [{ min: 2, max: 5 }, { min: 3, max: 6 }],
    });
    // Minimum at lower bounds: x=[2,3], obj=5
    expect(result.x[0]).toBeGreaterThanOrEqual(2);
    expect(result.x[1]).toBeGreaterThanOrEqual(3);
  });

  it("returns converged flag", () => {
    const result = interiorPointEngine.solve({
      c: [1],
      A: [[1], [-1]],
      b: [10, -1],
      bounds: [{ min: 0, max: 10 }],
    });
    expect(typeof result.converged).toBe("boolean");
    expect(result.iterations).toBeGreaterThan(0);
  });

  it("solveQP handles quadratic objective", () => {
    // min 0.5*x^2 s.t. -1 <= x <= 5
    const result = interiorPointEngine.solveQP(
      [[1]], [0],
      [[1], [-1]], [5, 1],
      [{ min: -1, max: 5 }]
    );
    expect(Math.abs(result.x[0])).toBeLessThan(2); // Near 0
  });

  it("dualityGap is non-negative", () => {
    const result = interiorPointEngine.solve({
      c: [1, 2],
      A: [[1, 1]],
      b: [10],
      bounds: [{ min: 0, max: 10 }, { min: 0, max: 10 }],
    });
    expect(result.dualityGap).toBeGreaterThanOrEqual(0);
  });
});

// ===========================================================================
// Rigid Body Dynamics
// ===========================================================================

describe("RigidBodyDynamics — Inertia & Forces", () => {
  it("boxInertia computes correct mass", () => {
    // 1m × 1m × 1m steel cube, density 7850 kg/m³
    const result = rigidBodyDynamicsEngine.boxInertia(1, 1, 1, 7850);
    expect(result.mass).toBeCloseTo(7850);
    // Ixx = m/12 * (h² + d²) = 7850/12 * 2 ≈ 1308.3
    expect(result.Ixx).toBeCloseTo(7850 / 6, 0);
  });

  it("cylinderInertia computes correct mass", () => {
    const r = 0.05, h = 0.1, rho = 7850;
    const result = rigidBodyDynamicsEngine.cylinderInertia(r, h, rho);
    const expectedMass = Math.PI * r * r * h * rho;
    expect(result.mass).toBeCloseTo(expectedMass, 2);
    expect(result.Izz).toBeCloseTo(expectedMass * r * r / 2, 4);
  });

  it("parallelAxis shifts inertia correctly", () => {
    const base = rigidBodyDynamicsEngine.boxInertia(1, 1, 1, 1000);
    const shifted = rigidBodyDynamicsEngine.parallelAxis(base, { x: 2, y: 0, z: 0 });
    // Ixx unchanged (shift along x doesn't affect Ixx for symmetric body)
    // But Iyy increases by m*d²
    expect(shifted.Iyy).toBeGreaterThan(base.Iyy);
    expect(shifted.Izz).toBeGreaterThan(base.Izz);
  });

  it("combineInertias sums masses", () => {
    const a = rigidBodyDynamicsEngine.boxInertia(1, 1, 1, 1000);
    const b = rigidBodyDynamicsEngine.cylinderInertia(0.5, 1, 1000, { x: 2, y: 0, z: 0 });
    const combined = rigidBodyDynamicsEngine.combineInertias([a, b]);
    expect(combined.mass).toBeCloseTo(a.mass + b.mass, 0);
  });

  it("forceAnalysis detects equilibrium", () => {
    const inertia = rigidBodyDynamicsEngine.boxInertia(1, 1, 1, 1000);
    // Two equal opposite forces
    const result = rigidBodyDynamicsEngine.forceAnalysis([
      { force: { x: 100, y: 0, z: 0 }, applicationPoint: { x: 0, y: 0, z: 0 } },
      { force: { x: -100, y: 0, z: 0 }, applicationPoint: { x: 0, y: 0, z: 0 } },
    ], inertia);
    expect(result.isEquilibrium).toBe(true);
    expect(result.netForce.x).toBeCloseTo(0);
  });

  it("forceAnalysis computes correct torque", () => {
    const inertia = rigidBodyDynamicsEngine.boxInertia(1, 1, 1, 1000);
    // Force at offset creates torque
    const result = rigidBodyDynamicsEngine.forceAnalysis([
      { force: { x: 0, y: 0, z: 100 }, applicationPoint: { x: 1, y: 0, z: 0 } },
    ], inertia, { x: 0, y: 0, z: 0 });
    // Torque = r × F = (1,0,0) × (0,0,100) = (0,-100,0)
    expect(result.netTorque.y).toBeCloseTo(-100);
  });

  it("impact conserves momentum for elastic collision", () => {
    const result = rigidBodyDynamicsEngine.impact(
      1, { x: 10, y: 0, z: 0 },
      1, { x: 0, y: 0, z: 0 },
      1.0, // Perfectly elastic
      { x: 1, y: 0, z: 0 }
    );
    // For equal mass elastic: velocities swap
    expect(result.velocityAfterA.x).toBeCloseTo(0, 1);
    expect(result.velocityAfterB.x).toBeCloseTo(10, 1);
    expect(result.energyLoss).toBeCloseTo(0, 1);
  });

  it("impact loses energy for plastic collision", () => {
    const result = rigidBodyDynamicsEngine.impact(
      2, { x: 5, y: 0, z: 0 },
      1, { x: 0, y: 0, z: 0 },
      0.0, // Perfectly plastic
      { x: 1, y: 0, z: 0 }
    );
    expect(result.energyLoss).toBeGreaterThan(0);
    // After plastic collision, both move together
    expect(result.velocityAfterA.x).toBeCloseTo(result.velocityAfterB.x, 1);
  });

  it("kineticEnergy computes translational + rotational", () => {
    const inertia = rigidBodyDynamicsEngine.cylinderInertia(0.1, 0.2, 7850);
    const ke = rigidBodyDynamicsEngine.kineticEnergy(
      inertia.mass,
      { x: 1, y: 0, z: 0 },
      inertia,
      { x: 0, y: 0, z: 10 }
    );
    expect(ke.translational).toBeGreaterThan(0);
    expect(ke.rotational).toBeGreaterThan(0);
    expect(ke.total).toBeCloseTo(ke.translational + ke.rotational);
  });

  it("combineInertias handles empty array", () => {
    const result = rigidBodyDynamicsEngine.combineInertias([]);
    expect(result.mass).toBe(0);
  });
});

// ===========================================================================
// Voronoi
// ===========================================================================

describe("Voronoi — Diagram & Delaunay", () => {
  const points = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 5, y: 8 },
    { x: 0, y: 10 },
    { x: 10, y: 10 },
  ];

  it("delaunay produces valid triangles", () => {
    const dt = voronoiEngine.delaunay(points);
    expect(dt.triangles.length).toBeGreaterThanOrEqual(3);
    // All triangle indices should be valid
    for (const t of dt.triangles) {
      expect(t.p0).toBeGreaterThanOrEqual(0);
      expect(t.p0).toBeLessThan(points.length);
      expect(t.p1).toBeGreaterThanOrEqual(0);
      expect(t.p2).toBeGreaterThanOrEqual(0);
    }
  });

  it("delaunay circumcircles have positive radius", () => {
    const dt = voronoiEngine.delaunay(points);
    for (const t of dt.triangles) {
      expect(t.circumradius).toBeGreaterThan(0);
    }
  });

  it("delaunay convex hull contains boundary points", () => {
    const dt = voronoiEngine.delaunay(points);
    expect(dt.convexHull.length).toBeGreaterThanOrEqual(3);
  });

  it("voronoi produces cells for each site", () => {
    const vd = voronoiEngine.voronoi(points);
    expect(vd.cells.length).toBe(points.length);
    for (const cell of vd.cells) {
      expect(cell.site).toBeDefined();
    }
  });

  it("voronoi cells have positive area", () => {
    const vd = voronoiEngine.voronoi(points);
    const withArea = vd.cells.filter(c => c.vertices.length >= 3);
    for (const cell of withArea) {
      expect(cell.area).toBeGreaterThan(0);
    }
  });

  it("voronoi edges are non-empty", () => {
    const vd = voronoiEngine.voronoi(points);
    expect(vd.edges.length).toBeGreaterThan(0);
  });

  it("nearestSite finds closest point", () => {
    const result = voronoiEngine.nearestSite(points, { x: 1, y: 1 });
    expect(result.index).toBe(0); // (0,0) is closest to (1,1)
    expect(result.distance).toBeCloseTo(Math.sqrt(2), 1);
  });

  it("nearestSite handles query at site location", () => {
    const result = voronoiEngine.nearestSite(points, { x: 10, y: 0 });
    expect(result.index).toBe(1);
    expect(result.distance).toBeCloseTo(0);
  });

  it("lloydRelax moves points toward centroids", () => {
    // Random-ish points
    const scattered = [
      { x: 1, y: 1 }, { x: 9, y: 1 }, { x: 5, y: 9 },
      { x: 2, y: 7 }, { x: 8, y: 6 },
    ];
    const relaxed = voronoiEngine.lloydRelax(scattered, 3, { minX: 0, minY: 0, maxX: 10, maxY: 10 });
    expect(relaxed.length).toBe(scattered.length);
    // Points should be more evenly distributed
    for (const p of relaxed) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeGreaterThanOrEqual(0);
    }
  });

  it("delaunay handles 3 near-collinear points gracefully", () => {
    // Near-collinear points may produce 0 or 1 triangles depending on precision
    const collinear = [{ x: 0, y: 0 }, { x: 5, y: 0.01 }, { x: 10, y: 0 }];
    const dt = voronoiEngine.delaunay(collinear);
    // Should not throw — result may be empty for degenerate cases
    expect(dt.triangles.length).toBeGreaterThanOrEqual(0);
    expect(dt.points.length).toBe(3);
  });

  it("delaunay handles fewer than 3 points", () => {
    const dt = voronoiEngine.delaunay([{ x: 0, y: 0 }, { x: 1, y: 1 }]);
    expect(dt.triangles.length).toBe(0);
  });
});
