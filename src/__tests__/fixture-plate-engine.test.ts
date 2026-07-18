/**
 * FixturePlateEngine — Unit Tests
 * @milestone FORGE-ENGINES-B22
 */
import { describe, it, expect } from "vitest";
import { fixturePlateEngine } from "../engines/FixturePlateEngine.js";

describe("FixturePlateEngine", () => {
  it("calculates grid holes from plate size", () => {
    const r = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      plate_length_mm: 600,
      plate_width_mm: 400,
      grid_spacing_mm: 50,
    });
    expect(r.grid_holes_x.value).toBe(13); // 600/50+1
    expect(r.grid_holes_y.value).toBe(9);  // 400/50+1
  });

  it("counts parts that fit on plate", () => {
    const r = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      plate_length_mm: 600,
      plate_width_mm: 400,
    });
    expect(r.parts_fit.value).toBeGreaterThan(0);
  });

  it("min 2 clamps always required", () => {
    const r = fixturePlateEngine.calculate({
      part_length_mm: 50,
      part_width_mm: 50,
      cutting_force_n: 100,
    });
    expect(r.min_clamps_needed.value).toBeGreaterThanOrEqual(2);
  });

  it("higher cutting force needs more clamps", () => {
    const light = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      cutting_force_n: 500,
    });
    const heavy = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      cutting_force_n: 15000,
    });
    expect(heavy.min_clamps_needed.value).toBeGreaterThan(
      light.min_clamps_needed.value
    );
  });

  it("toggle clamps are strongest", () => {
    const toe = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      cutting_force_n: 5000,
      clamp_type: "toe",
    });
    const toggle = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      cutting_force_n: 5000,
      clamp_type: "toggle",
    });
    expect(toggle.min_clamps_needed.value).toBeLessThanOrEqual(
      toe.min_clamps_needed.value
    );
  });

  it("thicker plate deflects less", () => {
    const thin = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      plate_thickness_mm: 15,
    });
    const thick = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      plate_thickness_mm: 40,
    });
    expect(thick.plate_deflection.value).toBeLessThan(
      thin.plate_deflection.value
    );
  });

  it("steel plate deflects less than aluminum", () => {
    const alu = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      plate_material: "aluminum",
    });
    const steel = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
      plate_material: "steel",
    });
    expect(steel.plate_deflection.value).toBeLessThan(
      alu.plate_deflection.value
    );
  });

  it("warns when parts don't fit", () => {
    const r = fixturePlateEngine.calculate({
      part_length_mm: 300,
      part_width_mm: 200,
      part_count: 10,
      plate_length_mm: 400,
      plate_width_mm: 300,
    });
    expect(
      r.warnings.some(w => w.includes("fit"))
    ).toBe(true);
  });

  it("area utilization < 100%", () => {
    const r = fixturePlateEngine.calculate({
      part_length_mm: 100,
      part_width_mm: 80,
    });
    expect(r.area_utilization.value).toBeLessThan(100);
    expect(r.area_utilization.value).toBeGreaterThan(0);
  });

  it("warns excessive deflection", () => {
    const r = fixturePlateEngine.calculate({
      part_length_mm: 200,
      part_width_mm: 150,
      plate_thickness_mm: 10,
      plate_material: "aluminum",
      cutting_force_n: 10000,
      part_count: 4,
    });
    expect(
      r.warnings.some(w => w.includes("deflection"))
    ).toBe(true);
  });
});
