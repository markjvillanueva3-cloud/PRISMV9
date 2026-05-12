/**
 * Tests for SpringPassEngine
 */
import { describe, it, expect } from "vitest";
import {
  SpringPassEngine,
} from "../engines/SpringPassEngine.js";

describe("SpringPassEngine", () => {
  const engine = new SpringPassEngine();

  it("calculates spring passes for typical setup", () => {
    const r = engine.calculate({
      cutting_force_n: 500,
      tool_stiffness_n_per_mm: 5000,
      workpiece_stiffness_n_per_mm: 10000,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    expect(r.initial_deflection.value).toBeGreaterThan(0);
    expect(r.num_spring_passes.value).toBeGreaterThan(0);
    expect(r.recovery_percentage.value).toBeGreaterThan(80);
    expect(r.added_cycle_time.value).toBeGreaterThan(0);
  });

  it("deflection = force / system stiffness", () => {
    const r = engine.calculate({
      cutting_force_n: 1000,
      tool_stiffness_n_per_mm: 5000,
      workpiece_stiffness_n_per_mm: 5000,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    // k_system = 5000×5000/(5000+5000) = 2500
    // deflection = 1000/2500 = 0.4mm
    expect(r.initial_deflection.value).toBeCloseTo(0.4, 1);
  });

  it("residual decreases with each pass", () => {
    const r = engine.calculate({
      cutting_force_n: 500,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    if (r.residual_after_passes.length >= 2) {
      expect(r.residual_after_passes[1].value).toBeLessThan(
        r.residual_after_passes[0].value
      );
    }
  });

  it("recovery > 90% after 3 passes", () => {
    const r = engine.calculate({
      cutting_force_n: 500,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    expect(r.recovery_percentage.value).toBeGreaterThan(90);
  });

  it("dimensional error reduces after passes", () => {
    const r = engine.calculate({
      cutting_force_n: 500,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    expect(r.dimensional_error_after.value).toBeLessThan(
      r.dimensional_error_before.value
    );
  });

  it("Ra improvement factor > 1", () => {
    const r = engine.calculate({
      cutting_force_n: 500,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    expect(r.ra_improvement_factor.value).toBeGreaterThan(1);
  });

  it("warns on high deflection", () => {
    const r = engine.calculate({
      cutting_force_n: 2000,
      tool_stiffness_n_per_mm: 3000,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    expect(
      r.warnings.some(w => w.includes("stiffness"))
    ).toBe(true);
  });

  it("warns spring passes unnecessary for low deflection", () => {
    const r = engine.calculate({
      cutting_force_n: 10,
      tool_stiffness_n_per_mm: 50000,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    expect(
      r.warnings.some(w => w.includes("unnecessary"))
    ).toBe(true);
  });

  it("fewer passes for small deflection", () => {
    const small = engine.calculate({
      cutting_force_n: 50,
      tool_stiffness_n_per_mm: 20000,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    const large = engine.calculate({
      cutting_force_n: 1000,
      tool_stiffness_n_per_mm: 3000,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    expect(small.num_spring_passes.value).toBeLessThanOrEqual(
      large.num_spring_passes.value
    );
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      cutting_force_n: 500,
      programmed_depth_mm: 0.5,
      feed_rate_mm_per_rev: 0.1,
      spindle_rpm: 3000,
    });
    for (const key of [
      "initial_deflection", "total_material_recovered",
      "recovery_percentage", "ra_improvement_factor",
      "added_cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { springPassEngine } = await import(
      "../engines/SpringPassEngine.js"
    );
    expect(springPassEngine).toBeInstanceOf(SpringPassEngine);
  });
});
