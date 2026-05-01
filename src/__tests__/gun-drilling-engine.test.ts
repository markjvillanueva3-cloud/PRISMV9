/**
 * Tests for GunDrillingEngine
 */
import { describe, it, expect } from "vitest";
import { GunDrillingEngine } from "../engines/GunDrillingEngine.js";

describe("GunDrillingEngine", () => {
  const engine = new GunDrillingEngine();

  it("calculates gun drill for 10mm × 200mm hole", () => {
    const r = engine.calculate({
      hole_diameter_mm: 10,
      hole_depth_mm: 200,
      material_iso_group: "P",
    });
    expect(r.method).toBe("gun_drill");
    expect(r.cutting_speed.value).toBe(80);
    expect(r.feed_rate.value).toBeGreaterThan(0);
    expect(r.spindle_rpm.value).toBeGreaterThan(0);
    expect(r.coolant_pressure.value).toBeGreaterThan(0);
    expect(r.coolant_flow.value).toBeGreaterThan(0);
    expect(r.ld_ratio.value).toBe(20);
    expect(r.cycle_time.value).toBeGreaterThan(0);
  });

  it("selects BTA for large diameter", () => {
    const r = engine.calculate({
      hole_diameter_mm: 50,
      hole_depth_mm: 500,
    });
    // 50mm > 40mm threshold → BTA
    expect(r.method).toBe("bta");
  });

  it("selects BTA for extreme L/D", () => {
    const r = engine.calculate({
      hole_diameter_mm: 5,
      hole_depth_mm: 600,
    });
    // L/D = 120 → BTA
    expect(r.method).toBe("bta");
  });

  it("allows explicit method", () => {
    const r = engine.calculate({
      hole_diameter_mm: 20,
      hole_depth_mm: 200,
      method: "ejector",
    });
    expect(r.method).toBe("ejector");
  });

  it("higher pressure for smaller holes", () => {
    const small = engine.calculate({
      hole_diameter_mm: 3,
      hole_depth_mm: 60,
    });
    const large = engine.calculate({
      hole_diameter_mm: 25,
      hole_depth_mm: 500,
    });
    expect(small.coolant_pressure.value).toBeGreaterThan(
      large.coolant_pressure.value
    );
  });

  it("recommends peck for difficult material", () => {
    const r = engine.calculate({
      hole_diameter_mm: 10,
      hole_depth_mm: 300,
      material_iso_group: "S",
    });
    expect(r.peck_recommended).toBe(true);
    expect(r.peck_depth.value).toBeGreaterThan(0);
  });

  it("no peck for standard steel at moderate depth", () => {
    const r = engine.calculate({
      hole_diameter_mm: 10,
      hole_depth_mm: 100,
      material_iso_group: "P",
    });
    expect(r.peck_recommended).toBe(false);
  });

  it("warns on extreme L/D", () => {
    const r = engine.calculate({
      hole_diameter_mm: 3,
      hole_depth_mm: 400,
    });
    expect(
      r.warnings.some(w => w.includes("L/D"))
    ).toBe(true);
  });

  it("warns on micro drilling", () => {
    const r = engine.calculate({
      hole_diameter_mm: 0.5,
      hole_depth_mm: 10,
    });
    expect(
      r.warnings.some(w => w.includes("Micro"))
    ).toBe(true);
  });

  it("warns on straightness risk", () => {
    const r = engine.calculate({
      hole_diameter_mm: 10,
      hole_depth_mm: 500,
      straightness_requirement_mm: 0.1,
    });
    expect(
      r.warnings.some(w => w.includes("straightness"))
    ).toBe(true);
  });

  it("warns on blind deep hole", () => {
    const r = engine.calculate({
      hole_diameter_mm: 8,
      hole_depth_mm: 300,
      is_through_hole: false,
    });
    expect(
      r.warnings.some(w => w.includes("Blind"))
    ).toBe(true);
  });

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      hole_diameter_mm: 10,
      hole_depth_mm: 200,
    });
    for (const key of [
      "cutting_speed", "feed_rate", "spindle_rpm",
      "coolant_pressure", "coolant_flow",
      "predicted_straightness", "cycle_time", "ld_ratio",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
    }
  });

  it("exports singleton", async () => {
    const { gunDrillingEngine } = await import(
      "../engines/GunDrillingEngine.js"
    );
    expect(gunDrillingEngine).toBeInstanceOf(GunDrillingEngine);
  });
});
