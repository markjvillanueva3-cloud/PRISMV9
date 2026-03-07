/**
 * AdhesiveBondEngine — Unit Tests
 * @milestone FORGE-ENGINES-B45
 */
import { describe, it, expect } from "vitest";
import { adhesiveBondEngine } from "../engines/AdhesiveBondEngine.js";

describe("AdhesiveBondEngine", () => {
  it("average shear stress > 0", () => {
    const r = adhesiveBondEngine.calculate({});
    expect(r.average_shear_stress.value).toBeGreaterThan(0);
  });

  it("peak shear ≥ average shear", () => {
    const r = adhesiveBondEngine.calculate({});
    expect(r.peak_shear_stress.value).toBeGreaterThanOrEqual(
      r.average_shear_stress.value
    );
  });

  it("shear lag factor ≥ 1", () => {
    const r = adhesiveBondEngine.calculate({});
    expect(r.shear_lag_factor.value).toBeGreaterThanOrEqual(1);
  });

  it("bond strength > 0", () => {
    const r = adhesiveBondEngine.calculate({});
    expect(r.bond_strength.value).toBeGreaterThan(0);
  });

  it("solvent wipe reduces bond strength vs chemical etch", () => {
    const good = adhesiveBondEngine.calculate({ surface_prep: "chemical_etch" });
    const poor = adhesiveBondEngine.calculate({ surface_prep: "solvent_wipe" });
    expect(poor.bond_strength.value).toBeLessThan(good.bond_strength.value);
  });

  it("high temperature reduces strength (derating < 1)", () => {
    const r = adhesiveBondEngine.calculate({ adhesive_type: "epoxy", temperature_c: 110 });
    expect(r.temperature_derating.value).toBeLessThan(1);
  });

  it("submerged environment derates", () => {
    const r = adhesiveBondEngine.calculate({ service_environment: "submerged" });
    expect(r.environment_derating.value).toBeLessThan(1);
  });

  it("optimal overlap > 0", () => {
    const r = adhesiveBondEngine.calculate({});
    expect(r.optimal_overlap.value).toBeGreaterThan(0);
  });

  it("warns solvent wipe poor durability", () => {
    const r = adhesiveBondEngine.calculate({ surface_prep: "solvent_wipe" });
    expect(r.warnings.some(w => w.includes("olvent"))).toBe(true);
  });

  it("double lap increases bond strength", () => {
    const single = adhesiveBondEngine.calculate({ joint_type: "single_lap" });
    const double = adhesiveBondEngine.calculate({ joint_type: "double_lap" });
    expect(double.bond_strength.value).toBeGreaterThan(single.bond_strength.value);
  });
});
