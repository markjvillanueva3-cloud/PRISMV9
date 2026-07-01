/**
 * Tests for PartingGroovingEngine
 */
import { describe, it, expect } from "vitest";
import {
  PartingGroovingEngine,
} from "../engines/PartingGroovingEngine.js";

describe("PartingGroovingEngine", () => {
  const engine = new PartingGroovingEngine();

  // ── Parting ────────────────────────────────────────────────────

  it("calculates parting for 25mm steel bar", () => {
    const r = engine.parting({
      bar_diameter_mm: 25,
      material_iso_group: "P",
    });
    expect(r.blade_width.value).toBe(2.0);
    expect(r.cutting_speed.value).toBe(100);
    expect(r.spindle_rpm_start.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBe(0.08);
    expect(r.use_constant_speed).toBe(true);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("recommends blade width by diameter", () => {
    const small = engine.parting({ bar_diameter_mm: 8 });
    const medium = engine.parting({ bar_diameter_mm: 50 });
    const large = engine.parting({ bar_diameter_mm: 80 });
    expect(small.blade_width.value).toBe(1.0);
    expect(medium.blade_width.value).toBe(3.0);
    expect(large.blade_width.value).toBe(4.0);
  });

  it("uses custom blade width", () => {
    const r = engine.parting({
      bar_diameter_mm: 30,
      blade_width_mm: 2.5,
    });
    expect(r.blade_width.value).toBe(2.5);
  });

  it("adjusts speed for material", () => {
    const alu = engine.parting({
      bar_diameter_mm: 30,
      material_iso_group: "N",
    });
    const steel = engine.parting({
      bar_diameter_mm: 30,
      material_iso_group: "P",
    });
    expect(alu.cutting_speed.value).toBeGreaterThan(
      steel.cutting_speed.value
    );
  });

  it("calculates hollow bar parting", () => {
    const r = engine.parting({
      bar_diameter_mm: 50,
      is_hollow: true,
      wall_thickness_mm: 5,
    });
    // Cycle time should be shorter for hollow
    const solid = engine.parting({ bar_diameter_mm: 50 });
    expect(r.cycle_time.value).toBeLessThan(
      solid.cycle_time.value
    );
  });

  it("calculates material waste", () => {
    const r = engine.parting({ bar_diameter_mm: 30 });
    expect(r.material_waste.value).toBeGreaterThan(0);
    expect(r.material_waste.unit).toBe("kg");
  });

  it("warns on wide blade for diameter", () => {
    const r = engine.parting({
      bar_diameter_mm: 10,
      blade_width_mm: 3,
    });
    expect(
      r.warnings.some(w => w.includes("waste"))
    ).toBe(true);
  });

  it("warns on narrow blade for large diameter", () => {
    const r = engine.parting({
      bar_diameter_mm: 80,
      blade_width_mm: 2,
    });
    expect(
      r.warnings.some(w => w.includes("vibration"))
    ).toBe(true);
  });

  it("RPM increases toward center", () => {
    const r = engine.parting({ bar_diameter_mm: 40 });
    expect(r.spindle_rpm_end.value).toBeGreaterThan(
      r.spindle_rpm_start.value
    );
  });

  it("reduced feed diameter is 30% of bar", () => {
    const r = engine.parting({ bar_diameter_mm: 60 });
    expect(r.reduced_feed_diameter.value).toBeCloseTo(18, 0);
  });

  // ── Grooving ───────────────────────────────────────────────────

  it("calculates basic groove", () => {
    const r = engine.groove({
      workpiece_diameter_mm: 50,
      groove_width_mm: 3,
      groove_depth_mm: 2,
    });
    expect(r.tool_width.value).toBe(3);
    expect(r.num_plunges.value).toBe(1);
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("multi-plunge for wide groove", () => {
    const r = engine.groove({
      workpiece_diameter_mm: 50,
      groove_width_mm: 12,
      groove_depth_mm: 3,
      tool_width_mm: 4,
    });
    expect(r.num_plunges.value).toBe(3);
  });

  it("recommends peck for deep groove", () => {
    const r = engine.groove({
      workpiece_diameter_mm: 50,
      groove_width_mm: 3,
      groove_depth_mm: 10,
      tool_width_mm: 3,
    });
    expect(r.peck_recommended).toBe(true);
    expect(r.peck_depth.value).toBeLessThan(10);
  });

  it("no peck for shallow groove", () => {
    const r = engine.groove({
      workpiece_diameter_mm: 50,
      groove_width_mm: 3,
      groove_depth_mm: 1,
      tool_width_mm: 3,
    });
    expect(r.peck_recommended).toBe(false);
  });

  it("warns on deep groove", () => {
    const r = engine.groove({
      workpiece_diameter_mm: 30,
      groove_width_mm: 3,
      groove_depth_mm: 8,
    });
    expect(
      r.warnings.some(w => w.includes("Deep"))
    ).toBe(true);
  });

  it("warns on narrow tool", () => {
    const r = engine.groove({
      workpiece_diameter_mm: 50,
      groove_width_mm: 0.8,
      groove_depth_mm: 2,
      tool_width_mm: 0.8,
    });
    expect(
      r.warnings.some(w => w.includes("Narrow"))
    ).toBe(true);
  });

  it("grooving feed is 80% of parting feed", () => {
    const r = engine.groove({
      workpiece_diameter_mm: 50,
      groove_width_mm: 3,
      groove_depth_mm: 2,
      material_iso_group: "P",
    });
    // Parting feed for P = 0.08, groove = 0.08 × 0.8 = 0.064
    expect(r.feed_rate.value).toBeCloseTo(0.064, 3);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format for parting", () => {
    const r = engine.parting({ bar_diameter_mm: 25 });
    for (const key of [
      "blade_width", "cutting_speed", "spindle_rpm_start",
      "spindle_rpm_end", "feed_rate", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { partingGroovingEngine } = await import(
      "../engines/PartingGroovingEngine.js"
    );
    expect(partingGroovingEngine).toBeInstanceOf(
      PartingGroovingEngine
    );
  });
});
