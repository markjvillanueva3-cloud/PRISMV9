/**
 * Tests for WaterjetEngine
 */
import { describe, it, expect } from "vitest";
import { WaterjetEngine } from "../engines/WaterjetEngine.js";

describe("WaterjetEngine", () => {
  const engine = new WaterjetEngine();

  it("calculates waterjet for 25mm steel Q3", () => {
    const r = engine.calculate({
      material_thickness_mm: 25,
      material_type: "steel",
      quality_grade: 3,
    });
    expect(r.cutting_speed.value).toBeGreaterThan(0);
    expect(r.pump_pressure.value).toBe(4000);
    expect(r.water_flow_rate.value).toBeGreaterThan(0);
    expect(r.abrasive_flow_rate.value).toBeGreaterThan(0);
    expect(r.kerf_width.value).toBeGreaterThan(1);
    expect(r.predicted_ra.value).toBe(6.3);
    expect(r.quality_grade).toBe(3);
  });

  it("faster for thinner material", () => {
    const thin = engine.calculate({
      material_thickness_mm: 5,
    });
    const thick = engine.calculate({
      material_thickness_mm: 50,
    });
    expect(thin.cutting_speed.value).toBeGreaterThan(
      thick.cutting_speed.value
    );
  });

  it("faster for aluminum than steel", () => {
    const steel = engine.calculate({
      material_thickness_mm: 25,
      material_type: "steel",
    });
    const alu = engine.calculate({
      material_thickness_mm: 25,
      material_type: "aluminum",
    });
    expect(alu.cutting_speed.value).toBeGreaterThan(
      steel.cutting_speed.value
    );
  });

  it("slower for titanium than steel", () => {
    const steel = engine.calculate({
      material_thickness_mm: 25,
      material_type: "steel",
    });
    const ti = engine.calculate({
      material_thickness_mm: 25,
      material_type: "titanium",
    });
    expect(ti.cutting_speed.value).toBeLessThan(
      steel.cutting_speed.value
    );
  });

  it("Q1 faster than Q5", () => {
    const fast = engine.calculate({
      material_thickness_mm: 25,
      quality_grade: 1,
    });
    const fine = engine.calculate({
      material_thickness_mm: 25,
      quality_grade: 5,
    });
    expect(fast.cutting_speed.value).toBeGreaterThan(
      fine.cutting_speed.value
    );
  });

  it("finer Ra at higher quality", () => {
    const q1 = engine.calculate({
      material_thickness_mm: 25,
      quality_grade: 1,
    });
    const q5 = engine.calculate({
      material_thickness_mm: 25,
      quality_grade: 5,
    });
    expect(q5.predicted_ra.value).toBeLessThan(
      q1.predicted_ra.value
    );
  });

  it("less taper at higher quality", () => {
    const q1 = engine.calculate({
      material_thickness_mm: 25,
      quality_grade: 1,
    });
    const q5 = engine.calculate({
      material_thickness_mm: 25,
      quality_grade: 5,
    });
    expect(q5.taper_angle.value).toBeLessThan(
      q1.taper_angle.value
    );
  });

  it("higher pressure = faster speed", () => {
    const low = engine.calculate({
      material_thickness_mm: 25,
      pump_pressure_bar: 3000,
    });
    const high = engine.calculate({
      material_thickness_mm: 25,
      pump_pressure_bar: 6000,
    });
    expect(high.cutting_speed.value).toBeGreaterThan(
      low.cutting_speed.value
    );
  });

  it("estimates pierce time", () => {
    const r = engine.calculate({
      material_thickness_mm: 25,
    });
    expect(r.pierce_time.value).toBeGreaterThan(0);
  });

  it("estimates cost per meter", () => {
    const r = engine.calculate({
      material_thickness_mm: 25,
    });
    expect(r.cost_per_meter.value).toBeGreaterThan(0);
    expect(r.cost_per_meter.unit).toBe("$/m");
  });

  it("warns on thick material", () => {
    const r = engine.calculate({
      material_thickness_mm: 250,
    });
    expect(
      r.warnings.some(w => w.includes("200mm"))
    ).toBe(true);
  });

  it("warns on composite delamination", () => {
    const r = engine.calculate({
      material_thickness_mm: 10,
      material_type: "composite",
    });
    expect(
      r.warnings.some(w => w.includes("delamination"))
    ).toBe(true);
  });

  // ── AtomicValue Format ────────────────────────────────────────

  it("returns AtomicValue format", () => {
    const r = engine.calculate({
      material_thickness_mm: 25,
    });
    for (const key of [
      "cutting_speed", "pump_pressure",
      "water_flow_rate", "kerf_width",
      "predicted_ra", "cost_per_meter",
    ] as const) {
      expect(r[key]).toHaveProperty("value");
      expect(r[key]).toHaveProperty("unit");
      expect(r[key]).toHaveProperty("uncertainty");
      expect(r[key]).toHaveProperty("source");
    }
  });

  it("exports singleton", async () => {
    const { waterjetEngine } = await import(
      "../engines/WaterjetEngine.js"
    );
    expect(waterjetEngine).toBeInstanceOf(WaterjetEngine);
  });
});
