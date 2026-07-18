/**
 * Tests for TrochoidalMillingEngine
 */
import { describe, it, expect } from "vitest";
import {
  TrochoidalMillingEngine,
} from "../engines/TrochoidalMillingEngine.js";

describe("TrochoidalMillingEngine", () => {
  const engine = new TrochoidalMillingEngine();

  // ── Trochoidal Calculation ──────────────────────────────────

  it("calculates trochoidal milling for steel", () => {
    const r = engine.calculate({
      slot_width_mm: 20,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 30,
      material_iso_group: "P",
    });
    // Step over = 10 × 12% = 1.2mm
    expect(r.step_over.value).toBeCloseTo(1.2, 1);
    expect(r.engagement_angle.value).toBeGreaterThan(0);
    expect(r.engagement_angle.value).toBeLessThan(90);
    expect(r.axial_depth.value).toBeGreaterThan(0);
    expect(r.adjusted_feed.value).toBeGreaterThan(0);
    expect(r.thinning_factor.value).toBeGreaterThan(0);
    expect(r.thinning_factor.value).toBeLessThan(1);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.mrr.value).toBeGreaterThan(0);
    expect(r.arc_radius.value).toBe(5); // (20-10)/2
  });

  it("uses higher speed than conventional", () => {
    const r = engine.calculate({
      slot_width_mm: 20,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 20,
      material_iso_group: "P",
    });
    // Trochoidal speed = 200 m/min vs conventional ~120
    // RPM = 200*1000/(pi*10) ≈ 6366
    expect(r.spindle_rpm.value).toBeGreaterThan(6000);
  });

  it("warns when tool too large for slot", () => {
    const r = engine.calculate({
      slot_width_mm: 10,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 20,
    });
    expect(
      r.warnings.some(w => w.includes("cannot use trochoidal"))
    ).toBe(true);
  });

  it("warns on high tool/slot ratio", () => {
    const r = engine.calculate({
      slot_width_mm: 12,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 20,
    });
    expect(
      r.warnings.some(w => w.includes("70%"))
    ).toBe(true);
  });

  it("adjusts engagement for material", () => {
    const steel = engine.calculate({
      slot_width_mm: 30,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 20,
      material_iso_group: "P",
    });
    const super_alloy = engine.calculate({
      slot_width_mm: 30,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 20,
      material_iso_group: "S",
    });
    // S has lower max engagement (8%) vs P (12%)
    expect(super_alloy.step_over.value).toBeLessThan(
      steel.step_over.value
    );
  });

  it("uses custom engagement percentage", () => {
    const r = engine.calculate({
      slot_width_mm: 30,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 20,
      max_engagement_pct: 5,
    });
    expect(r.step_over.value).toBeCloseTo(0.5, 1);
  });

  // ── Chip Thinning ───────────────────────────────────────────

  it("calculates chip thinning compensation", () => {
    const r = engine.chipThinning({
      tool_diameter_mm: 10,
      radial_depth_mm: 1,
      desired_chip_load_mm: 0.05,
      num_flutes: 4,
      rpm: 5000,
    });
    // ae/D = 0.1, thin factor < 1, so adjusted > desired
    expect(r.adjusted_chip_load.value).toBeGreaterThan(0.05);
    expect(r.thinning_factor.value).toBeLessThan(1);
    expect(r.adjusted_feed.value).toBeGreaterThan(
      0.05 * 4 * 5000
    );
    expect(r.engagement_angle.value).toBeGreaterThan(0);
  });

  it("no compensation at 50% engagement", () => {
    const r = engine.chipThinning({
      tool_diameter_mm: 10,
      radial_depth_mm: 5,
      desired_chip_load_mm: 0.05,
      num_flutes: 4,
      rpm: 5000,
    });
    // At 50% engagement, thinning factor ≈ 1.0
    expect(r.thinning_factor.value).toBeCloseTo(1.0, 1);
    expect(r.adjusted_chip_load.value).toBeCloseTo(0.05, 2);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      slot_width_mm: 20,
      tool_diameter_mm: 10,
      num_flutes: 4,
      depth_mm: 20,
    });
    for (const key of [
      "step_over", "engagement_angle", "axial_depth",
      "adjusted_feed", "thinning_factor", "spindle_rpm",
      "actual_chip_load", "mrr", "arc_radius",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { trochoidalMillingEngine } = await import(
      "../engines/TrochoidalMillingEngine.js"
    );
    expect(trochoidalMillingEngine).toBeInstanceOf(
      TrochoidalMillingEngine
    );
  });
});
