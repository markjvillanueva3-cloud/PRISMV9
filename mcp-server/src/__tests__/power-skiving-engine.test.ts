/**
 * Tests for PowerSkivingEngine
 */
import { describe, it, expect } from "vitest";
import {
  PowerSkivingEngine,
} from "../engines/PowerSkivingEngine.js";

describe("PowerSkivingEngine", () => {
  const engine = new PowerSkivingEngine();

  it("calculates power skiving for module 2 gear", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 80,
      module_mm: 2,
      num_teeth_workpiece: 40,
    });
    expect(r.crossed_axis_angle.value).toBe(20);
    expect(r.tool_rpm.value).toBeGreaterThan(0);
    expect(r.workpiece_rpm.value).toBeGreaterThan(0);
    expect(r.cutting_speed.value).toBe(150);
    expect(r.num_passes.value).toBeGreaterThanOrEqual(5);
    expect(r.total_tooth_depth.value).toBeCloseTo(4.5, 1);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("sync ratio = Zw/Zt", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 80,
      module_mm: 2,
      num_teeth_workpiece: 40,
      num_teeth_tool: 20,
    });
    expect(r.sync_ratio.value).toBeCloseTo(2.0, 2);
  });

  it("more passes for larger module", () => {
    const small = engine.calculate({
      workpiece_diameter_mm: 40,
      module_mm: 1,
      num_teeth_workpiece: 40,
    });
    const large = engine.calculate({
      workpiece_diameter_mm: 120,
      module_mm: 4,
      num_teeth_workpiece: 30,
    });
    expect(large.num_passes.value).toBeGreaterThanOrEqual(
      small.num_passes.value
    );
  });

  it("tooth depth = 2.25 × module", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 60,
      module_mm: 3,
      num_teeth_workpiece: 20,
    });
    expect(r.total_tooth_depth.value).toBeCloseTo(6.75, 1);
  });

  it("respects custom crossed-axis angle", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 80,
      module_mm: 2,
      num_teeth_workpiece: 40,
      crossed_axis_angle_deg: 15,
    });
    expect(r.crossed_axis_angle.value).toBe(15);
  });

  it("higher speed for aluminum", () => {
    const steel = engine.calculate({
      workpiece_diameter_mm: 80,
      module_mm: 2,
      num_teeth_workpiece: 40,
      material_iso_group: "P",
    });
    const alu = engine.calculate({
      workpiece_diameter_mm: 80,
      module_mm: 2,
      num_teeth_workpiece: 40,
      material_iso_group: "N",
    });
    expect(alu.cutting_speed.value).toBeGreaterThan(
      steel.cutting_speed.value
    );
  });

  it("warns on low crossed-axis angle", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 80,
      module_mm: 2,
      num_teeth_workpiece: 40,
      crossed_axis_angle_deg: 8,
    });
    expect(
      r.warnings.some(w => w.includes("clearance"))
    ).toBe(true);
  });

  it("warns on large module", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 200,
      module_mm: 8,
      num_teeth_workpiece: 25,
    });
    expect(
      r.warnings.some(w => w.includes("Large module"))
    ).toBe(true);
  });

  it("warns on low tooth count", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 40,
      module_mm: 3,
      num_teeth_workpiece: 12,
    });
    expect(
      r.warnings.some(w => w.includes("Low tooth"))
    ).toBe(true);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      workpiece_diameter_mm: 80,
      module_mm: 2,
      num_teeth_workpiece: 40,
    });
    for (const key of [
      "crossed_axis_angle", "tool_rpm", "workpiece_rpm",
      "cutting_speed", "num_passes", "cycle_time",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { powerSkivingEngine } = await import(
      "../engines/PowerSkivingEngine.js"
    );
    expect(powerSkivingEngine).toBeInstanceOf(
      PowerSkivingEngine
    );
  });
});
