/**
 * Tests for CenterDrillEngine
 */
import { describe, it, expect } from "vitest";
import { CenterDrillEngine } from "../engines/CenterDrillEngine.js";

describe("CenterDrillEngine", () => {
  const engine = new CenterDrillEngine();

  // ── Spot Drilling ───────────────────────────────────────────

  it("calculates spot drill for 10mm drill", () => {
    const r = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
      material_iso_group: "P",
    });
    expect(r.spot_diameter.value).toBeGreaterThanOrEqual(10);
    expect(r.spot_depth.value).toBeGreaterThan(0);
    expect(r.chamfer_at_depth.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.spot_angle.value).toBe(90);
    expect(r.chisel_edge_clearance.value).toBeGreaterThan(1);
  });

  it("uses custom spot angle", () => {
    const r = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
      spot_drill_angle_deg: 120,
    });
    expect(r.spot_angle.value).toBe(120);
  });

  it("warns when spot drill smaller than drill", () => {
    const r = engine.spotDrill({
      subsequent_drill_diameter_mm: 20,
      spot_drill_diameter_mm: 12,
    });
    expect(
      r.warnings.some(w => w.includes("smaller"))
    ).toBe(true);
  });

  it("warns on very acute spot angle", () => {
    const r = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
      spot_drill_angle_deg: 50,
    });
    expect(
      r.warnings.some(w => w.includes("fragile"))
    ).toBe(true);
  });

  it("warns on very obtuse spot angle", () => {
    const r = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
      spot_drill_angle_deg: 150,
    });
    expect(
      r.warnings.some(w => w.includes("shallow"))
    ).toBe(true);
  });

  it("adjusts speed for material", () => {
    const steel = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
      material_iso_group: "P",
    });
    const alu = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
      material_iso_group: "N",
    });
    expect(alu.spindle_rpm.value).toBeGreaterThan(
      steel.spindle_rpm.value
    );
  });

  it("uses custom depth", () => {
    const r = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
      depth_mm: 3,
    });
    expect(r.spot_depth.value).toBe(3);
  });

  // ── Center Drilling ─────────────────────────────────────────

  it("selects center drill for 10mm drill", () => {
    const r = engine.centerDrill({
      subsequent_drill_diameter_mm: 10,
    });
    expect(r.pilot_diameter.value).toBeGreaterThan(0);
    expect(r.pilot_diameter.value).toBeLessThan(10);
    expect(r.body_diameter.value).toBeGreaterThan(
      r.pilot_diameter.value
    );
    expect(r.drill_point_angle.value).toBe(60);
    expect(r.countersink_angle.value).toBe(60);
    expect(r.recommended_depth.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
  });

  it("uses specified center drill size", () => {
    const r = engine.centerDrill({
      subsequent_drill_diameter_mm: 20,
      center_drill_size: "4",
    });
    expect(r.recommended_size).toBe("4");
    expect(r.pilot_diameter.value).toBe(2.5);
    expect(r.body_diameter.value).toBe(6.35);
  });

  it("warns on too-large pilot for drill", () => {
    const r = engine.centerDrill({
      subsequent_drill_diameter_mm: 3,
      center_drill_size: "3",
    });
    // Pilot 2.0mm is 67% of 3mm drill → warn
    expect(
      r.warnings.some(w => w.includes("60%"))
    ).toBe(true);
  });

  it("warns on very small drill", () => {
    const r = engine.centerDrill({
      subsequent_drill_diameter_mm: 1,
    });
    expect(
      r.warnings.some(w => w.includes("small drill"))
    ).toBe(true);
  });

  // ── Spot Depth Calculation ──────────────────────────────────

  it("calculates spot depth for chamfer", () => {
    const r = engine.spotDepth({
      target_chamfer_diameter_mm: 10,
      spot_angle_deg: 90,
    });
    // At 90°, half angle = 45°, tan(45°) = 1
    // depth = (10/2) / 1 = 5
    expect(r.depth.value).toBeCloseTo(5, 2);
  });

  it("calculates depth for 120° spot", () => {
    const r = engine.spotDepth({
      target_chamfer_diameter_mm: 10,
      spot_angle_deg: 120,
    });
    // half angle = 60°, tan(60°) ≈ 1.732
    // depth = 5 / 1.732 ≈ 2.887
    expect(r.depth.value).toBeCloseTo(2.887, 2);
  });

  // ── AtomicValue Format ──────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.spotDrill({
      subsequent_drill_diameter_mm: 10,
    });
    for (const key of [
      "spot_diameter", "spot_depth", "chamfer_at_depth",
      "spindle_rpm", "feed_rate", "spot_angle",
      "chisel_edge_clearance",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { centerDrillEngine } = await import(
      "../engines/CenterDrillEngine.js"
    );
    expect(centerDrillEngine).toBeInstanceOf(CenterDrillEngine);
  });
});
