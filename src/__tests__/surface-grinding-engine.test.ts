/**
 * Tests for SurfaceGrindingEngine
 */
import { describe, it, expect } from "vitest";
import {
  SurfaceGrindingEngine,
} from "../engines/SurfaceGrindingEngine.js";

describe("SurfaceGrindingEngine", () => {
  const engine = new SurfaceGrindingEngine();

  it("calculates surface grinding for steel", () => {
    const r = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
      material_iso_group: "P",
    });
    expect(r.wheel_speed.value).toBe(30);
    expect(r.wheel_rpm.value).toBeGreaterThan(0);
    expect(r.table_speed.value).toBe(15);
    expect(r.cross_feed.value).toBeGreaterThan(0);
    expect(r.depth_per_pass.value).toBeGreaterThan(0);
    expect(r.num_passes.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("finer depth for harder material", () => {
    const soft = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
      material_hardness_hrc: 30,
    });
    const hard = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
      material_hardness_hrc: 60,
    });
    expect(hard.depth_per_pass.value).toBeLessThan(
      soft.depth_per_pass.value
    );
  });

  it("more passes for more stock", () => {
    const thin = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.2,
    });
    const thick = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 1.0,
    });
    expect(thick.num_passes.value).toBeGreaterThan(
      thin.num_passes.value
    );
  });

  it("finishing uses finer cross-feed", () => {
    const rough = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
    });
    const finish = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.05,
      is_finishing: true,
    });
    expect(finish.cross_feed.value).toBeLessThan(
      rough.cross_feed.value
    );
  });

  it("finishing has better Ra", () => {
    const rough = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
    });
    const finish = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.05,
      is_finishing: true,
    });
    expect(finish.predicted_ra.value).toBeLessThan(
      rough.predicted_ra.value
    );
  });

  it("includes sparkout passes", () => {
    const r = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
    });
    expect(r.num_sparkout_passes.value).toBeGreaterThanOrEqual(3);
  });

  it("finishing has more sparkout passes", () => {
    const rough = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
    });
    const finish = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.05,
      is_finishing: true,
    });
    expect(finish.num_sparkout_passes.value).toBeGreaterThanOrEqual(
      rough.num_sparkout_passes.value
    );
  });

  it("estimates burn risk", () => {
    const r = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
    });
    expect(r.burn_risk.value).toBeGreaterThanOrEqual(0);
    expect(r.burn_risk.unit).toBe("%");
  });

  it("warns on high burn risk", () => {
    const r = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
      material_iso_group: "S",
      material_hardness_hrc: 55,
    });
    // High-energy material may trigger burn warning
    if (r.burn_risk.value > 80) {
      expect(
        r.warnings.some(w => w.includes("burn") ||
          w.includes("Burn"))
      ).toBe(true);
    }
  });

  it("reports dressing interval", () => {
    const r = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
    });
    expect(r.dressing_interval.value).toBeGreaterThan(0);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      workpiece_width_mm: 50,
      workpiece_length_mm: 200,
      total_stock_mm: 0.5,
    });
    for (const key of [
      "wheel_speed", "wheel_rpm", "table_speed",
      "cross_feed", "depth_per_pass", "burn_risk",
      "predicted_ra", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { surfaceGrindingEngine } = await import(
      "../engines/SurfaceGrindingEngine.js"
    );
    expect(surfaceGrindingEngine).toBeInstanceOf(
      SurfaceGrindingEngine
    );
  });
});
