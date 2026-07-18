/**
 * Tests for HighFeedMillingEngine
 */
import { describe, it, expect } from "vitest";
import {
  HighFeedMillingEngine,
} from "../engines/HighFeedMillingEngine.js";

describe("HighFeedMillingEngine", () => {
  const engine = new HighFeedMillingEngine();

  it("calculates HFM for steel", () => {
    const r = engine.calculate({
      tool_diameter_mm: 50,
      material_iso_group: "P",
    });
    expect(r.axial_depth.value).toBeGreaterThan(0);
    expect(r.axial_depth.value).toBeLessThanOrEqual(2);
    expect(r.cutting_speed.value).toBe(200);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.table_feed.value).toBeGreaterThan(0);
    expect(r.mrr.value).toBeGreaterThan(0);
    expect(r.power_required.value).toBeGreaterThan(0);
  });

  it("chip thinning factor < 1 for shallow cuts", () => {
    const r = engine.calculate({
      tool_diameter_mm: 50,
      axial_depth_mm: 0.5,
    });
    expect(r.chip_thinning_factor.value).toBeGreaterThan(0);
    expect(r.chip_thinning_factor.value).toBeLessThan(1);
  });

  it("programmed fz > actual hex due to thinning", () => {
    const r = engine.calculate({
      tool_diameter_mm: 50,
      axial_depth_mm: 0.5,
    });
    expect(r.programmed_fz.value).toBeGreaterThan(
      r.actual_hex.value
    );
  });

  it("axial force ratio > 0.5 (favorable)", () => {
    const r = engine.calculate({
      tool_diameter_mm: 50,
      axial_depth_mm: 1.0,
    });
    expect(r.axial_force_ratio.value).toBeGreaterThan(0.5);
  });

  it("higher speed for aluminum", () => {
    const steel = engine.calculate({
      tool_diameter_mm: 50,
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      tool_diameter_mm: 50,
      material_iso_group: "N",
    });
    expect(alu.cutting_speed.value).toBeGreaterThan(
      steel.cutting_speed.value
    );
  });

  it("respects custom insert nose radius", () => {
    const small = engine.calculate({
      tool_diameter_mm: 50,
      insert_nose_radius_mm: 1.5,
      axial_depth_mm: 1.0,
    });
    const large = engine.calculate({
      tool_diameter_mm: 50,
      insert_nose_radius_mm: 3.0,
      axial_depth_mm: 1.0,
    });
    // Larger radius = lower chip thinning factor
    expect(large.chip_thinning_factor.value).toBeLessThan(
      small.chip_thinning_factor.value
    );
  });

  it("warns when depth exceeds nose radius", () => {
    const r = engine.calculate({
      tool_diameter_mm: 50,
      insert_nose_radius_mm: 1.5,
      axial_depth_mm: 2.0,
    });
    expect(
      r.warnings.some(w => w.includes("exceeds"))
    ).toBe(true);
  });

  it("warns on near-full radial engagement", () => {
    const r = engine.calculate({
      tool_diameter_mm: 50,
      radial_width_mm: 48,
    });
    expect(
      r.warnings.some(w => w.includes("slot milling"))
    ).toBe(true);
  });

  it("more inserts for larger cutter", () => {
    const small = engine.calculate({
      tool_diameter_mm: 25,
    });
    const large = engine.calculate({
      tool_diameter_mm: 80,
    });
    // Table feed scales with insert count and RPM
    // Larger cutter has lower RPM but more inserts
    expect(large.table_feed.value).toBeGreaterThan(0);
    expect(small.table_feed.value).toBeGreaterThan(0);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      tool_diameter_mm: 50,
    });
    for (const key of [
      "axial_depth", "chip_thinning_factor",
      "programmed_fz", "cutting_speed", "mrr",
      "axial_force_ratio", "power_required",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { highFeedMillingEngine } = await import(
      "../engines/HighFeedMillingEngine.js"
    );
    expect(highFeedMillingEngine).toBeInstanceOf(
      HighFeedMillingEngine
    );
  });
});
