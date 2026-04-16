/**
 * DynamicBalanceEngine — Unit Tests
 * @milestone FORGE-ENGINES-B38
 */
import { describe, it, expect } from "vitest";
import { dynamicBalanceEngine } from "../engines/DynamicBalanceEngine.js";

describe("DynamicBalanceEngine", () => {
  it("permissible unbalance > 0 with defaults", () => {
    const r = dynamicBalanceEngine.calculate({});
    expect(r.permissible_unbalance.value).toBeGreaterThan(0);
  });

  it("tighter grade means less permissible unbalance", () => {
    const loose = dynamicBalanceEngine.calculate({ balance_grade: "G16" });
    const tight = dynamicBalanceEngine.calculate({ balance_grade: "G1" });
    expect(tight.permissible_unbalance.value).toBeLessThan(
      loose.permissible_unbalance.value
    );
  });

  it("higher RPM reduces permissible unbalance", () => {
    const slow = dynamicBalanceEngine.calculate({ service_rpm: 1000 });
    const fast = dynamicBalanceEngine.calculate({ service_rpm: 6000 });
    expect(fast.permissible_unbalance.value).toBeLessThan(
      slow.permissible_unbalance.value
    );
  });

  it("heavier rotor gets more permissible unbalance", () => {
    const light = dynamicBalanceEngine.calculate({ rotor_mass_kg: 10 });
    const heavy = dynamicBalanceEngine.calculate({ rotor_mass_kg: 100 });
    expect(heavy.permissible_unbalance.value).toBeGreaterThan(
      light.permissible_unbalance.value
    );
  });

  it("two-plane splits unbalance", () => {
    const one = dynamicBalanceEngine.calculate({ num_planes: 1 });
    const two = dynamicBalanceEngine.calculate({ num_planes: 2 });
    expect(two.per_plane_unbalance.value).toBeLessThan(
      one.per_plane_unbalance.value
    );
  });

  it("correction mass > 0", () => {
    const r = dynamicBalanceEngine.calculate({});
    expect(r.correction_mass.value).toBeGreaterThan(0);
  });

  it("larger correction radius means less correction mass", () => {
    const small = dynamicBalanceEngine.calculate({ correction_radius_mm: 50 });
    const large = dynamicBalanceEngine.calculate({ correction_radius_mm: 200 });
    expect(large.correction_mass.value).toBeLessThan(
      small.correction_mass.value
    );
  });

  it("warns overhung rotor", () => {
    const r = dynamicBalanceEngine.calculate({ rotor_type: "overhung" });
    expect(r.warnings.some(w => w.includes("Overhung"))).toBe(true);
  });

  it("centrifugal force > 0", () => {
    const r = dynamicBalanceEngine.calculate({});
    expect(r.centrifugal_force.value).toBeGreaterThan(0);
  });

  it("balance grade value matches input", () => {
    const r = dynamicBalanceEngine.calculate({ balance_grade: "G2.5" });
    expect(r.balance_grade_value.value).toBe(2.5);
  });
});
