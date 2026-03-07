/**
 * ParallelismEngine — Unit Tests
 * @milestone FORGE-ENGINES-B19
 */
import { describe, it, expect } from "vitest";
import { parallelismEngine } from "../engines/ParallelismEngine.js";

describe("ParallelismEngine", () => {
  it("calculates measurement points for surface", () => {
    const r = parallelismEngine.calculate({
      surface_length_mm: 300,
      surface_width_mm: 200,
      tolerance_mm: 0.02,
    });
    expect(r.measurement_points.value).toBeGreaterThanOrEqual(9);
    expect(r.grid_spacing.value).toBeGreaterThan(0);
  });

  it("indicator resolution is tolerance/10", () => {
    const r = parallelismEngine.calculate({
      surface_length_mm: 200,
      surface_width_mm: 100,
      tolerance_mm: 0.01,
    });
    expect(r.indicator_resolution.value).toBe(0.001);
  });

  it("calculates thermal error from CTE", () => {
    const r = parallelismEngine.calculate({
      surface_length_mm: 500,
      surface_width_mm: 100,
      tolerance_mm: 0.02,
      material_type: "aluminum",
      cte_delta_deg_c: 2,
    });
    // 23 × 1e-6 × 500 × 2 × 1000 = 0.023mm
    expect(r.thermal_error.value).toBeCloseTo(0.023, 2);
  });

  it("warns thermal error vs tolerance", () => {
    const r = parallelismEngine.calculate({
      surface_length_mm: 500,
      surface_width_mm: 100,
      tolerance_mm: 0.01,
      material_type: "aluminum",
      cte_delta_deg_c: 2,
    });
    expect(
      r.warnings.some(w => w.includes("Thermal") ||
        w.includes("temperature"))
    ).toBe(true);
  });

  it("warns process cannot meet tolerance", () => {
    const r = parallelismEngine.calculate({
      surface_length_mm: 300,
      surface_width_mm: 200,
      tolerance_mm: 0.002,
      machining_process: "milling",
    });
    expect(
      r.warnings.some(w => w.includes("Upgrade") ||
        w.includes("grinding") || w.includes("lapping"))
    ).toBe(true);
  });

  it("grinding achieves tighter tolerance than milling", () => {
    const mill = parallelismEngine.calculate({
      surface_length_mm: 300,
      surface_width_mm: 200,
      tolerance_mm: 0.01,
      machining_process: "milling",
    });
    const grind = parallelismEngine.calculate({
      surface_length_mm: 300,
      surface_width_mm: 200,
      tolerance_mm: 0.01,
      machining_process: "grinding",
    });
    expect(grind.achievable_tolerance.value).toBeLessThan(
      mill.achievable_tolerance.value
    );
  });

  it("calculates process capability", () => {
    const r = parallelismEngine.calculate({
      surface_length_mm: 200,
      surface_width_mm: 100,
      tolerance_mm: 0.05,
      machining_process: "grinding",
    });
    expect(r.process_capability.value).toBeGreaterThan(0);
  });

  it("measurement uncertainty is RSS", () => {
    const r = parallelismEngine.calculate({
      surface_length_mm: 200,
      surface_width_mm: 100,
      tolerance_mm: 0.01,
    });
    expect(r.measurement_uncertainty.value).toBeGreaterThan(0);
  });
});
