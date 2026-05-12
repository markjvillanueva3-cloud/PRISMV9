/**
 * AdaptiveRefinementEngine Tests — CAMK-MS3/U04
 * Tests error-driven toolpath densification (iterative midpoint insertion).
 */
import { describe, it, expect } from "vitest";
import { adaptiveRefinementEngine, type InputPoint, type RefinementCriterion } from "../engines/AdaptiveRefinementEngine.js";

function straightPath(n: number): InputPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    x: i * 10, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000,
  }));
}

function curvedPath(n: number): InputPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    x: Math.cos(i * Math.PI / (n - 1)) * 50,
    y: Math.sin(i * Math.PI / (n - 1)) * 50,
    z: 0,
    ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000,
  }));
}

describe("AdaptiveRefinementEngine", () => {
  // ---- Chord error ----
  it("computes chord error for 3 collinear points as 0", () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 5, y: 0, z: 0 };
    const c = { x: 10, y: 0, z: 0 };
    expect(adaptiveRefinementEngine.chordError(a, b, c)).toBeCloseTo(0, 5);
  });

  it("computes nonzero chord error for curved path", () => {
    const a = { x: 0, y: 0, z: 0 };
    const b = { x: 5, y: 3, z: 0 };
    const c = { x: 10, y: 0, z: 0 };
    expect(adaptiveRefinementEngine.chordError(a, b, c)).toBeGreaterThan(0);
  });

  // ---- Midpoint interpolation ----
  it("insertMidpoint produces correct midpoint", () => {
    const a: InputPoint = { x: 0, y: 0, z: 0, ae_mm: 4, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    const b: InputPoint = { x: 10, y: 10, z: 10, ae_mm: 6, ap_mm: 4, rpm: 12000, feed_mmmin: 2000 };
    const mid = adaptiveRefinementEngine.insertMidpoint(a, b);
    expect(mid.x).toBe(5);
    expect(mid.y).toBe(5);
    expect(mid.z).toBe(5);
    expect(mid.ae_mm).toBe(5);
    expect(mid.rpm).toBe(10000);
    expect(mid.original).toBe(false);
  });

  // ---- Curvature-based refinement ----
  it("straight path needs no curvature refinement", () => {
    const result = adaptiveRefinementEngine.refine({
      points: straightPath(10),
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.01 },
    });
    expect(result.points_added).toBe(0);
    expect(result.converged).toBe(true);
  });

  it("curved path gets refined with curvature criterion", () => {
    const points = curvedPath(5); // coarse arc → high chord error
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.1 },
    });
    expect(result.refined_count).toBeGreaterThanOrEqual(points.length);
  });

  // ---- Force-based refinement ----
  it("refines where force gradient is steep", () => {
    const points = straightPath(5).map((s, i) => ({
      ...s, force_N: i === 2 ? 500 : 100,
    }));
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["force"],
      tolerances: { max_force_gradient_N_mm: 20 },
    });
    expect(result.points_added).toBeGreaterThan(0);
  });

  it("no force refinement when gradient is smooth", () => {
    const points = straightPath(5).map((s, i) => ({
      ...s, force_N: 100 + i * 5,
    }));
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["force"],
      tolerances: { max_force_gradient_N_mm: 50 },
    });
    expect(result.points_added).toBe(0);
  });

  // ---- Thermal-based refinement ----
  it("refines at thermal zone boundaries", () => {
    const points = straightPath(5).map((s, i) => ({
      ...s, temperature_C: i === 3 ? 400 : 100,
    }));
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["thermal"],
      tolerances: { max_temp_gradient_C_mm: 10 },
    });
    expect(result.points_added).toBeGreaterThan(0);
  });

  // ---- Engagement-based refinement ----
  it("refines where MRR deviates significantly", () => {
    const points = straightPath(5).map((s, i) => ({
      ...s, mrr_mm3_min: i === 2 ? 1500 : 500,
    }));
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["engagement"],
      tolerances: { mrr_deviation_pct: 10 },
    });
    expect(result.points_added).toBeGreaterThan(0);
  });

  // ---- Multi-criteria ----
  it("applies multiple criteria simultaneously", () => {
    const points = straightPath(6).map((s, i) => ({
      ...s,
      force_N: i === 2 ? 500 : 100,
      temperature_C: i === 4 ? 350 : 120,
    }));
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["force", "thermal"] as RefinementCriterion[],
      tolerances: { max_force_gradient_N_mm: 20, max_temp_gradient_C_mm: 10 },
    });
    const stats = result.refinement_stats;
    expect(stats.force_inserts + stats.thermal_inserts).toBeGreaterThan(0);
    expect(result.points_added).toBeGreaterThan(0);
  });

  // ---- Convergence ----
  it("converges within max iterations", () => {
    const result = adaptiveRefinementEngine.refine({
      points: curvedPath(8),
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.5 },
      max_iterations: 3,
    });
    expect(result.iterations).toBeLessThanOrEqual(3);
  });

  // ---- Point cap ----
  it("respects max_points cap", () => {
    const result = adaptiveRefinementEngine.refine({
      points: curvedPath(10),
      criteria: ["curvature"],
      tolerances: { chord_error_mm: 0.001 },
      max_points: 20,
    });
    expect(result.refined_count).toBeLessThanOrEqual(20);
  });

  // ---- Empty/single point ----
  it("handles empty points", () => {
    const result = adaptiveRefinementEngine.refine({
      points: [],
      criteria: ["curvature"],
    });
    expect(result.refined_points).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("handles single point", () => {
    const result = adaptiveRefinementEngine.refine({
      points: [{ x: 0, y: 0, z: 0 }],
      criteria: ["curvature"],
    });
    expect(result.refined_points).toHaveLength(1);
    expect(result.points_added).toBe(0);
  });

  // ---- Inserted points marked correctly ----
  it("marks inserted points with original=false", () => {
    const points = straightPath(5).map((s, i) => ({
      ...s, force_N: i === 2 ? 500 : 100,
    }));
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["force"],
      tolerances: { max_force_gradient_N_mm: 20 },
    });
    const inserted = result.refined_points.filter(p => !p.original);
    expect(inserted.length).toBe(result.points_added);
    for (const p of inserted) {
      expect(p.refinement_reason).toBeDefined();
    }
  });

  // ---- Formula string ----
  it("includes formula string with context", () => {
    const result = adaptiveRefinementEngine.refine({
      points: straightPath(5),
      criteria: ["curvature"],
      algorithm_context: "PTDC",
    });
    expect(result.formula).toContain("AdaptiveRefinement");
    expect(result.formula).toContain("PTDC");
    expect(result.formula).toContain("curvature");
  });

  // ---- Density improvement ----
  it("reports density improvement percentage", () => {
    const points = straightPath(5).map((s, i) => ({
      ...s, force_N: i === 2 ? 500 : 100,
    }));
    const result = adaptiveRefinementEngine.refine({
      points,
      criteria: ["force"],
      tolerances: { max_force_gradient_N_mm: 20 },
    });
    if (result.points_added > 0) {
      expect(result.density_improvement_pct).toBeGreaterThan(0);
    }
  });
});
