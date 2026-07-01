/**
 * TorsionBarEngine — Unit Tests
 * @milestone FORGE-ENGINES-B43
 */
import { describe, it, expect } from "vitest";
import { torsionBarEngine } from "../engines/TorsionBarEngine.js";

describe("TorsionBarEngine", () => {
  it("shear stress > 0 with defaults", () => {
    const r = torsionBarEngine.calculate({});
    expect(r.shear_stress.value).toBeGreaterThan(0);
  });

  it("higher torque increases shear stress", () => {
    const low = torsionBarEngine.calculate({ torque_nm: 50 });
    const high = torsionBarEngine.calculate({ torque_nm: 500 });
    expect(high.shear_stress.value).toBeGreaterThan(low.shear_stress.value);
  });

  it("larger diameter reduces shear stress", () => {
    const small = torsionBarEngine.calculate({ outer_diameter_mm: 15 });
    const large = torsionBarEngine.calculate({ outer_diameter_mm: 40 });
    expect(large.shear_stress.value).toBeLessThan(small.shear_stress.value);
  });

  it("angle of twist > 0", () => {
    const r = torsionBarEngine.calculate({});
    expect(r.angle_of_twist.value).toBeGreaterThan(0);
  });

  it("longer bar twists more", () => {
    const short = torsionBarEngine.calculate({ length_mm: 200 });
    const long = torsionBarEngine.calculate({ length_mm: 1000 });
    expect(long.angle_of_twist.value).toBeGreaterThan(
      short.angle_of_twist.value
    );
  });

  it("hollow has less weight than solid at same OD", () => {
    const solid = torsionBarEngine.calculate({ section: "solid_round" });
    const hollow = torsionBarEngine.calculate({
      section: "hollow_round",
      inner_diameter_mm: 15,
    });
    expect(hollow.weight.value).toBeLessThan(solid.weight.value);
  });

  it("safety factor > 0", () => {
    const r = torsionBarEngine.calculate({});
    expect(r.safety_factor_yield.value).toBeGreaterThan(0);
  });

  it("energy stored > 0", () => {
    const r = torsionBarEngine.calculate({});
    expect(r.energy_stored.value).toBeGreaterThan(0);
  });

  it("titanium has higher capacity than aluminum", () => {
    const alum = torsionBarEngine.calculate({ material: "aluminum" });
    const ti = torsionBarEngine.calculate({ material: "titanium" });
    expect(ti.max_torque_capacity.value).toBeGreaterThan(
      alum.max_torque_capacity.value
    );
  });

  it("warns low yield safety factor", () => {
    const r = torsionBarEngine.calculate({
      torque_nm: 1000,
      outer_diameter_mm: 15,
    });
    expect(r.warnings.some(w => w.includes("Yield SF"))).toBe(true);
  });
});
