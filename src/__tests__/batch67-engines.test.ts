/**
 * Batch 67 — HertzContact, JournalBearing, BallScrew
 * @milestone FORGE-ENGINES-BATCH67
 */
import { describe, it, expect } from "vitest";
import { hertzContactEngine } from "../engines/HertzContactEngine.js";
import { journalBearingEngine } from "../engines/JournalBearingEngine.js";
import { ballScrewEngine } from "../engines/BallScrewEngine.js";

describe("HertzContactEngine", () => {
  const base = { normal_force_N: 1000, radius1_mm: 10 };
  it("max pressure > 0", () => {
    expect(hertzContactEngine.calculate(base).max_contact_pressure_MPa.value).toBeGreaterThan(0);
  });
  it("contact radius > 0", () => {
    expect(hertzContactEngine.calculate(base).contact_radius_mm.value).toBeGreaterThan(0);
  });
  it("subsurface shear < max pressure", () => {
    const r = hertzContactEngine.calculate(base);
    expect(r.subsurface_shear_MPa.value).toBeLessThan(r.max_contact_pressure_MPa.value);
  });
  it("more force = more pressure", () => {
    const lo = hertzContactEngine.calculate({ ...base, normal_force_N: 100 });
    const hi = hertzContactEngine.calculate({ ...base, normal_force_N: 10000 });
    expect(hi.max_contact_pressure_MPa.value).toBeGreaterThan(lo.max_contact_pressure_MPa.value);
  });
  it("larger radius = lower pressure", () => {
    const small = hertzContactEngine.calculate({ ...base, radius1_mm: 5 });
    const big = hertzContactEngine.calculate({ ...base, radius1_mm: 50 });
    expect(big.max_contact_pressure_MPa.value).toBeLessThan(small.max_contact_pressure_MPa.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(hertzContactEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("JournalBearingEngine", () => {
  const base = { shaft_diameter_mm: 50, radial_load_N: 5000, speed_rpm: 1500 };
  it("sommerfeld number > 0", () => {
    expect(journalBearingEngine.calculate(base).sommerfeld_number.value).toBeGreaterThan(0);
  });
  it("min film thickness > 0", () => {
    expect(journalBearingEngine.calculate(base).min_film_thickness_um.value).toBeGreaterThan(0);
  });
  it("power loss > 0", () => {
    expect(journalBearingEngine.calculate(base).power_loss_W.value).toBeGreaterThan(0);
  });
  it("eccentricity ratio 0-1", () => {
    const e = journalBearingEngine.calculate(base).eccentricity_ratio.value;
    expect(e).toBeGreaterThan(0);
    expect(e).toBeLessThan(1);
  });
  it("higher load = thinner film", () => {
    const lo = journalBearingEngine.calculate({ ...base, radial_load_N: 1000 });
    const hi = journalBearingEngine.calculate({ ...base, radial_load_N: 20000 });
    expect(hi.min_film_thickness_um.value).toBeLessThan(lo.min_film_thickness_um.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(journalBearingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("BallScrewEngine", () => {
  const base = { axial_force_N: 5000, stroke_mm: 500, max_speed_mm_s: 200 };
  it("screw diameter > 0", () => {
    expect(ballScrewEngine.calculate(base).screw_diameter_mm.value).toBeGreaterThan(0);
  });
  it("drive torque > 0", () => {
    expect(ballScrewEngine.calculate(base).drive_torque_Nm.value).toBeGreaterThan(0);
  });
  it("critical speed > 0", () => {
    expect(ballScrewEngine.calculate(base).critical_speed_rpm.value).toBeGreaterThan(0);
  });
  it("buckling load > axial force", () => {
    expect(ballScrewEngine.calculate(base).buckling_load_N.value).toBeGreaterThan(base.axial_force_N);
  });
  it("calculated life > 0", () => {
    expect(ballScrewEngine.calculate(base).calculated_life_hours.value).toBeGreaterThan(0);
  });
  it("higher force = bigger screw", () => {
    const lo = ballScrewEngine.calculate({ ...base, axial_force_N: 500 });
    const hi = ballScrewEngine.calculate({ ...base, axial_force_N: 50000 });
    expect(hi.screw_diameter_mm.value).toBeGreaterThanOrEqual(lo.screw_diameter_mm.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(ballScrewEngine.calculate(base).recommendations)).toBe(true);
  });
});
