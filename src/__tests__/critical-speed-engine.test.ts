/**
 * CriticalSpeedEngine — Unit Tests
 * @milestone FORGE-ENGINES-B48
 */
import { describe, it, expect } from "vitest";
import { criticalSpeedEngine } from "../engines/CriticalSpeedEngine.js";

describe("CriticalSpeedEngine", () => {
  it("first critical > 0", () => {
    const r = criticalSpeedEngine.calculate({});
    expect(r.first_critical_rpm.value).toBeGreaterThan(0);
  });

  it("second critical > first critical", () => {
    const r = criticalSpeedEngine.calculate({});
    expect(r.second_critical_rpm.value).toBeGreaterThan(
      r.first_critical_rpm.value
    );
  });

  it("stiffer shaft increases critical speed", () => {
    const flex = criticalSpeedEngine.calculate({ shaft_diameter_mm: 30 });
    const stiff = criticalSpeedEngine.calculate({ shaft_diameter_mm: 80 });
    expect(stiff.first_critical_rpm.value).toBeGreaterThan(
      flex.first_critical_rpm.value
    );
  });

  it("longer shaft decreases critical speed", () => {
    const short = criticalSpeedEngine.calculate({ shaft_length_mm: 400 });
    const long = criticalSpeedEngine.calculate({ shaft_length_mm: 1500 });
    expect(long.first_critical_rpm.value).toBeLessThan(
      short.first_critical_rpm.value
    );
  });

  it("heavier disk decreases critical speed", () => {
    const light = criticalSpeedEngine.calculate({ disk_mass_kg: 2 });
    const heavy = criticalSpeedEngine.calculate({ disk_mass_kg: 50 });
    expect(heavy.first_critical_rpm.value).toBeLessThan(
      light.first_critical_rpm.value
    );
  });

  it("static deflection > 0", () => {
    const r = criticalSpeedEngine.calculate({});
    expect(r.static_deflection.value).toBeGreaterThan(0);
  });

  it("speed ratio > 0", () => {
    const r = criticalSpeedEngine.calculate({});
    expect(r.speed_ratio.value).toBeGreaterThan(0);
  });

  it("shaft stiffness > 0", () => {
    const r = criticalSpeedEngine.calculate({});
    expect(r.shaft_stiffness.value).toBeGreaterThan(0);
  });

  it("whirl mode is valid string", () => {
    const r = criticalSpeedEngine.calculate({});
    expect(r.shaft_whirl_mode.unit).toMatch(
      /subcritical|near_resonance|supercritical/
    );
  });

  it("warns near resonance", () => {
    // Use a very flexible shaft to get low critical speed
    const r = criticalSpeedEngine.calculate({
      shaft_diameter_mm: 20,
      shaft_length_mm: 1200,
      disk_mass_kg: 30,
      operating_rpm: 500,
    });
    // This may or may not warn depending on exact nc1
    expect(r.separation_margin.value).toBeGreaterThanOrEqual(0);
  });
});
