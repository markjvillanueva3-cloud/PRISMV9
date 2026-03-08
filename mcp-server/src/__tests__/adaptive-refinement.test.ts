/**
 * AdaptiveRefinementEngine Tests — CAMK-MS3/U04
 * Tests error-driven toolpath densification
 */
import { describe, it, expect } from "vitest";
import { adaptiveRefinementEngine } from "../engines/AdaptiveRefinementEngine.js";

function straightPath(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    x: i * 10, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000,
  }));
}

function curvedPath(n: number) {
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
    const a = { x: 0, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    const b = { x: 5, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    const c = { x: 10, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    expect(adaptiveRefinementEngine.chordError(a, b, c)).toBeCloseTo(0, 5);
  });

  it("computes nonzero chord error for curved path", () => {
    const a = { x: 0, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    const b = { x: 5, y: 3, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    const c = { x: 10, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    expect(adaptiveRefinementEngine.chordError(a, b, c)).toBeGreaterThan(0);
  });

  // ---- Curvature-based refinement ----
  it("straight path needs no curvature refinement", () => {
    const result = adaptiveRefinementEngine.refine({
      segments: straightPath(10),
      criteria: ["curvature"],
      tolerance_mm: 0.01,
    });
    expect(result.stats.points_added).toBe(0);
    expect(result.stats.converged).toBe(true);
  });

  it("curved path gets refined with curvature criterion", () => {
    const segments = curvedPath(5); // coarse arc → high chord error
    const result = adaptiveRefinementEngine.refine({
      segments,
      criteria: ["curvature"],
      tolerance_mm: 0.1, // tight tolerance
    });
    expect(result.stats.refined_count).toBeGreaterThanOrEqual(segments.length);
  });

  // ---- Force-based refinement ----
  it("refines where force gradient is steep", () => {
    const segments = straightPath(5).map((s, i) => ({
      ...s, force_N: i === 2 ? 500 : 100, // sudden force spike
    }));
    const result = adaptiveRefinementEngine.refine({
      segments,
      criteria: ["force"],
      force_gradient_threshold: 20,
    });
    expect(result.stats.points_added).toBeGreaterThan(0);
  });

  it("no force refinement when gradient is smooth", () => {
    const segments = straightPath(5).map((s, i) => ({
      ...s, force_N: 100 + i * 5, // gentle increase
    }));
    const result = adaptiveRefinementEngine.refine({
      segments,
      criteria: ["force"],
      force_gradient_threshold: 50,
    });
    expect(result.stats.points_added).toBe(0);
  });

  // ---- Thermal-based refinement ----
  it("refines at thermal zone boundaries", () => {
    const segments = straightPath(5).map((s, i) => ({
      ...s, temperature_C: i === 3 ? 400 : 100, // thermal spike
    }));
    const result = adaptiveRefinementEngine.refine({
      segments,
      criteria: ["thermal"],
      thermal_gradient_threshold: 10,
    });
    expect(result.stats.points_added).toBeGreaterThan(0);
  });

  // ---- Engagement-based refinement ----
  it("refines where engagement deviates significantly", () => {
    const segments = straightPath(5).map((s, i) => ({
      ...s, ae_mm: i === 2 ? 15 : 5, // sudden engagement change
    }));
    const result = adaptiveRefinementEngine.refine({
      segments,
      criteria: ["engagement"],
      engagement_deviation_pct: 10,
    });
    expect(result.stats.points_added).toBeGreaterThan(0);
  });

  // ---- Multi-criteria ----
  it("applies multiple criteria simultaneously", () => {
    const segments = straightPath(6).map((s, i) => ({
      ...s,
      force_N: i === 2 ? 500 : 100,
      temperature_C: i === 4 ? 350 : 120,
    }));
    const result = adaptiveRefinementEngine.refine({
      segments,
      criteria: ["force", "thermal"],
      force_gradient_threshold: 20,
      thermal_gradient_threshold: 10,
    });
    expect(result.stats.criteria_applied).toContain("force");
    expect(result.stats.criteria_applied).toContain("thermal");
    expect(result.stats.points_added).toBeGreaterThan(0);
  });

  // ---- Convergence ----
  it("converges within max iterations", () => {
    const result = adaptiveRefinementEngine.refine({
      segments: curvedPath(8),
      criteria: ["curvature"],
      tolerance_mm: 0.5, // loose tolerance
      max_iterations: 3,
    });
    expect(result.stats.iterations).toBeLessThanOrEqual(3);
  });

  // ---- Interpolation ----
  it("interpolated point is midpoint at t=0.5", () => {
    const a = { x: 0, y: 0, z: 0, ae_mm: 4, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 };
    const b = { x: 10, y: 10, z: 10, ae_mm: 6, ap_mm: 4, rpm: 12000, feed_mmmin: 2000 };
    const mid = adaptiveRefinementEngine.interpolate(a, b, 0.5);
    expect(mid.x).toBe(5);
    expect(mid.y).toBe(5);
    expect(mid.z).toBe(5);
    expect(mid.ae_mm).toBe(5);
    expect(mid.rpm).toBe(10000);
  });

  // ---- Refinement map ----
  it("produces correct refinement map", () => {
    const segments = straightPath(5);
    const result = adaptiveRefinementEngine.refine({
      segments,
      criteria: ["curvature"],
      tolerance_mm: 0.01,
    });
    expect(result.refinement_map).toHaveLength(5);
    // Each original point should appear at least once
    for (const entry of result.refinement_map) {
      expect(entry.refined_indices.length).toBeGreaterThan(0);
    }
  });

  // ---- Quick estimate ----
  it("estimateRefinement returns quick assessment", () => {
    const est = adaptiveRefinementEngine.estimateRefinement({
      segments: straightPath(10),
      criteria: ["curvature"],
    });
    expect(est.needs_refinement).toBe(false);
    expect(est.estimated_additions).toBe(0);
  });

  // ---- Empty/single segment ----
  it("handles empty segments", () => {
    const result = adaptiveRefinementEngine.refine({ segments: [] });
    expect(result.segments).toHaveLength(0);
    expect(result.stats.converged).toBe(true);
  });

  it("handles single segment", () => {
    const result = adaptiveRefinementEngine.refine({
      segments: [{ x: 0, y: 0, z: 0, ae_mm: 5, ap_mm: 2, rpm: 8000, feed_mmmin: 1000 }],
    });
    expect(result.segments).toHaveLength(1);
    expect(result.stats.points_added).toBe(0);
  });

  // ---- Inserted points marked correctly ----
  it("marks inserted points with is_inserted flag", () => {
    const segments = straightPath(5).map((s, i) => ({
      ...s, force_N: i === 2 ? 500 : 100,
    }));
    const result = adaptiveRefinementEngine.refine({
      segments, criteria: ["force"], force_gradient_threshold: 20,
    });
    const inserted = result.segments.filter(s => s.is_inserted);
    expect(inserted.length).toBe(result.stats.points_added);
    for (const p of inserted) {
      expect(p.refinement_reason).toBeDefined();
    }
  });
});
