/**
 * RollingContactEngine — Unit Tests
 * @milestone FORGE-ENGINES-B42
 */
import { describe, it, expect } from "vitest";
import { rollingContactEngine } from "../engines/RollingContactEngine.js";

describe("RollingContactEngine", () => {
  it("max contact pressure > 0", () => {
    const r = rollingContactEngine.calculate({});
    expect(r.max_contact_pressure.value).toBeGreaterThan(0);
  });

  it("higher force increases contact pressure", () => {
    const low = rollingContactEngine.calculate({ normal_force_n: 500 });
    const high = rollingContactEngine.calculate({ normal_force_n: 5000 });
    expect(high.max_contact_pressure.value).toBeGreaterThan(
      low.max_contact_pressure.value
    );
  });

  it("larger radius reduces contact pressure", () => {
    const small = rollingContactEngine.calculate({ radius_1_mm: 10 });
    const large = rollingContactEngine.calculate({ radius_1_mm: 50 });
    expect(large.max_contact_pressure.value).toBeLessThan(
      small.max_contact_pressure.value
    );
  });

  it("contact half-width > 0", () => {
    const r = rollingContactEngine.calculate({});
    expect(r.contact_half_width.value).toBeGreaterThan(0);
  });

  it("subsurface shear ≈ 30% of contact pressure", () => {
    const r = rollingContactEngine.calculate({});
    const ratio = r.subsurface_shear.value / r.max_contact_pressure.value;
    expect(ratio).toBeCloseTo(0.30, 1);
  });

  it("ceramic has higher equivalent modulus than bronze", () => {
    const bronze = rollingContactEngine.calculate({
      material_1: "ceramic", material_2: "bronze",
    });
    const both = rollingContactEngine.calculate({
      material_1: "bronze", material_2: "bronze",
    });
    expect(bronze.equivalent_modulus.value).toBeGreaterThan(
      both.equivalent_modulus.value
    );
  });

  it("sphere contact gives point contact area", () => {
    const r = rollingContactEngine.calculate({ geometry: "sphere_flat" });
    expect(r.contact_area.value).toBeGreaterThan(0);
  });

  it("lambda ratio > 0", () => {
    const r = rollingContactEngine.calculate({});
    expect(r.lambda_ratio.value).toBeGreaterThan(0);
  });

  it("contact life > 0", () => {
    const r = rollingContactEngine.calculate({});
    expect(r.contact_life.value).toBeGreaterThan(0);
  });

  it("warns when pressure exceeds allowable", () => {
    const r = rollingContactEngine.calculate({
      normal_force_n: 50000,
      radius_1_mm: 5,
      material_1: "bronze",
      material_2: "bronze",
    });
    expect(r.warnings.some(w => w.includes("exceeds allowable"))).toBe(true);
  });
});
