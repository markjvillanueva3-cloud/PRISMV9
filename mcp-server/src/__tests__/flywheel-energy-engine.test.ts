/**
 * FlywheelEnergyEngine — Unit Tests
 * @milestone FORGE-ENGINES-B36
 */
import { describe, it, expect } from "vitest";
import { flywheelEnergyEngine } from "../engines/FlywheelEnergyEngine.js";

describe("FlywheelEnergyEngine", () => {
  it("max energy > 0 with defaults", () => {
    const r = flywheelEnergyEngine.calculate({});
    expect(r.max_energy.value).toBeGreaterThan(0);
  });

  it("usable energy < max energy", () => {
    const r = flywheelEnergyEngine.calculate({});
    expect(r.usable_energy.value).toBeLessThan(r.max_energy.value);
    expect(r.usable_energy.value).toBeGreaterThan(0);
  });

  it("higher RPM stores more energy", () => {
    const low = flywheelEnergyEngine.calculate({ max_rpm: 1000, min_rpm: 900 });
    const high = flywheelEnergyEngine.calculate({ max_rpm: 3000, min_rpm: 2700 });
    expect(high.max_energy.value).toBeGreaterThan(low.max_energy.value);
  });

  it("larger radius increases inertia", () => {
    const small = flywheelEnergyEngine.calculate({ outer_radius_mm: 100 });
    const large = flywheelEnergyEngine.calculate({ outer_radius_mm: 300 });
    expect(large.moment_of_inertia.value).toBeGreaterThan(
      small.moment_of_inertia.value
    );
  });

  it("hollow disc lighter than solid disc", () => {
    const solid = flywheelEnergyEngine.calculate({ geometry: "solid_disc" });
    const hollow = flywheelEnergyEngine.calculate({
      geometry: "hollow_disc",
      inner_radius_mm: 100,
    });
    expect(hollow.flywheel_mass.value).toBeLessThan(solid.flywheel_mass.value);
  });

  it("coefficient of fluctuation reflects speed range", () => {
    const narrow = flywheelEnergyEngine.calculate({
      max_rpm: 1500,
      min_rpm: 1450,
    });
    const wide = flywheelEnergyEngine.calculate({
      max_rpm: 1500,
      min_rpm: 1000,
    });
    expect(wide.coefficient_of_fluctuation.value).toBeGreaterThan(
      narrow.coefficient_of_fluctuation.value
    );
  });

  it("rim stress increases with RPM", () => {
    const low = flywheelEnergyEngine.calculate({ max_rpm: 1000 });
    const high = flywheelEnergyEngine.calculate({ max_rpm: 5000 });
    expect(high.rim_stress.value).toBeGreaterThan(low.rim_stress.value);
  });

  it("warns low burst safety factor at very high speed", () => {
    const r = flywheelEnergyEngine.calculate({
      max_rpm: 30000,
      outer_radius_mm: 300,
    });
    expect(r.warnings.some(w => w.includes("safety factor"))).toBe(true);
  });

  it("warns high rim velocity", () => {
    const r = flywheelEnergyEngine.calculate({
      max_rpm: 20000,
      outer_radius_mm: 200,
    });
    expect(r.warnings.some(w => w.includes("Rim velocity"))).toBe(true);
  });

  it("aluminum lighter than steel at same size", () => {
    const steel = flywheelEnergyEngine.calculate({ material: "steel" });
    const alum = flywheelEnergyEngine.calculate({ material: "aluminum" });
    expect(alum.flywheel_mass.value).toBeLessThan(steel.flywheel_mass.value);
  });
});
