/**
 * Tests for FacingEngine
 */
import { describe, it, expect } from "vitest";
import { FacingEngine } from "../engines/FacingEngine.js";

describe("FacingEngine", () => {
  const engine = new FacingEngine();

  // ── Face Milling ──────────────────────────────────────────────

  it("calculates face milling for steel", () => {
    const r = engine.faceMill({
      workpiece_width_mm: 80,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
      material_iso_group: "P",
    });
    expect(r.cutting_speed.value).toBe(200);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.feed_per_tooth.value).toBe(0.20);
    expect(r.table_feed.value).toBeGreaterThan(0);
    expect(r.mrr.value).toBeGreaterThan(0);
    expect(r.power_required.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("single pass when cutter > workpiece width", () => {
    const r = engine.faceMill({
      workpiece_width_mm: 50,
      workpiece_length_mm: 100,
      cutter_diameter_mm: 100,
    });
    expect(r.num_passes.value).toBe(1);
  });

  it("multiple passes for narrow cutter", () => {
    const r = engine.faceMill({
      workpiece_width_mm: 200,
      workpiece_length_mm: 100,
      cutter_diameter_mm: 80,
    });
    expect(r.num_passes.value).toBeGreaterThan(1);
  });

  it("higher speed for aluminum", () => {
    const steel = engine.faceMill({
      workpiece_width_mm: 80,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
      material_iso_group: "P",
    });
    const alu = engine.faceMill({
      workpiece_width_mm: 80,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
      material_iso_group: "N",
    });
    expect(alu.cutting_speed.value).toBeGreaterThan(
      steel.cutting_speed.value
    );
  });

  it("respects custom step-over ratio", () => {
    const wide = engine.faceMill({
      workpiece_width_mm: 150,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
      step_over_ratio: 0.5,
    });
    const narrow = engine.faceMill({
      workpiece_width_mm: 150,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
      step_over_ratio: 0.3,
    });
    expect(narrow.num_passes.value).toBeGreaterThan(
      wide.num_passes.value
    );
  });

  it("calculates engagement angle", () => {
    const r = engine.faceMill({
      workpiece_width_mm: 80,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
    });
    expect(r.engagement_angle.value).toBeGreaterThan(0);
    expect(r.engagement_angle.value).toBeLessThan(180);
  });

  it("predicts surface finish", () => {
    const r = engine.faceMill({
      workpiece_width_mm: 80,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
    });
    expect(r.predicted_ra.value).toBeGreaterThan(0);
    expect(r.predicted_ra.unit).toBe("µm");
  });

  it("warns on undersized cutter", () => {
    const r = engine.faceMill({
      workpiece_width_mm: 100,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 60,
    });
    expect(
      r.warnings.some(w => w.includes("larger cutter"))
    ).toBe(true);
  });

  // ── Lathe Facing ──────────────────────────────────────────────

  it("calculates lathe facing for 50mm bar", () => {
    const r = engine.latheFace({
      workpiece_diameter_mm: 50,
      material_iso_group: "P",
    });
    expect(r.cutting_speed.value).toBe(250);
    expect(r.rpm_at_od.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBe(0.25);
    expect(r.use_css).toBe(true);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("RPM increases toward center", () => {
    const r = engine.latheFace({
      workpiece_diameter_mm: 80,
    });
    expect(r.rpm_at_center.value).toBeGreaterThan(
      r.rpm_at_od.value
    );
  });

  it("multiple passes for deep face cut", () => {
    const r = engine.latheFace({
      workpiece_diameter_mm: 50,
      face_depth_mm: 5,
    });
    expect(r.num_passes.value).toBeGreaterThan(1);
  });

  it("single pass for light skim", () => {
    const r = engine.latheFace({
      workpiece_diameter_mm: 50,
      face_depth_mm: 0.5,
    });
    expect(r.num_passes.value).toBe(1);
  });

  it("calculates hollow workpiece facing", () => {
    const r = engine.latheFace({
      workpiece_diameter_mm: 80,
      is_hollow: true,
      bore_diameter_mm: 40,
    });
    expect(r.cycle_time.value).toBeGreaterThan(0);
    expect(r.use_css).toBe(true);
    // Hollow should have warnings about bore
    expect(r.rpm_at_od.value).toBeGreaterThan(0);
  });

  it("predicts surface finish from nose radius", () => {
    const coarse = engine.latheFace({
      workpiece_diameter_mm: 50,
      tool_nose_radius_mm: 0.4,
    });
    const fine = engine.latheFace({
      workpiece_diameter_mm: 50,
      tool_nose_radius_mm: 1.2,
    });
    expect(fine.predicted_ra.value).toBeLessThan(
      coarse.predicted_ra.value
    );
  });

  it("warns on thin wall hollow", () => {
    const r = engine.latheFace({
      workpiece_diameter_mm: 50,
      is_hollow: true,
      bore_diameter_mm: 48,
    });
    expect(
      r.warnings.some(w => w.includes("thin wall"))
    ).toBe(true);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format for face mill", () => {
    const r = engine.faceMill({
      workpiece_width_mm: 80,
      workpiece_length_mm: 200,
      cutter_diameter_mm: 100,
    });
    for (const key of [
      "cutting_speed", "spindle_rpm", "feed_per_tooth",
      "table_feed", "mrr", "power_required", "predicted_ra",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { facingEngine } = await import(
      "../engines/FacingEngine.js"
    );
    expect(facingEngine).toBeInstanceOf(FacingEngine);
  });
});
