/**
 * Batch 65 — SpringDesign, Flywheel, VibrationIsolator
 * @milestone FORGE-ENGINES-BATCH65
 */
import { describe, it, expect } from "vitest";
import { springDesignEngine } from "../engines/SpringDesignEngine.js";
import { flywheelEngine } from "../engines/FlywheelEngine.js";
import { vibrationIsolatorEngine } from "../engines/VibrationIsolatorEngine.js";

describe("SpringDesignEngine", () => {
  const base = { max_load_N: 100, max_deflection_mm: 20 };
  it("wire diameter > 0", () => {
    expect(springDesignEngine.calculate(base).wire_diameter_mm.value).toBeGreaterThan(0);
  });
  it("spring rate = load/deflection approx", () => {
    const r = springDesignEngine.calculate(base);
    expect(r.spring_rate_N_mm.value).toBeCloseTo(100 / 20, 0);
  });
  it("active coils > 0", () => {
    expect(springDesignEngine.calculate(base).active_coils.value).toBeGreaterThan(0);
  });
  it("free length > solid length", () => {
    const r = springDesignEngine.calculate(base);
    expect(r.free_length_mm.value).toBeGreaterThan(r.solid_length_mm.value);
  });
  it("max stress > 0", () => {
    expect(springDesignEngine.calculate(base).max_shear_stress_MPa.value).toBeGreaterThan(0);
  });
  it("higher load = thicker wire", () => {
    const lo = springDesignEngine.calculate({ ...base, max_load_N: 10 });
    const hi = springDesignEngine.calculate({ ...base, max_load_N: 1000 });
    expect(hi.wire_diameter_mm.value).toBeGreaterThan(lo.wire_diameter_mm.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(springDesignEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FlywheelEngine", () => {
  const base = { energy_storage_kJ: 10, speed_rpm: 1500 };
  it("mass > 0", () => {
    expect(flywheelEngine.calculate(base).mass_kg.value).toBeGreaterThan(0);
  });
  it("inertia > 0", () => {
    expect(flywheelEngine.calculate(base).moment_of_inertia_kg_m2.value).toBeGreaterThan(0);
  });
  it("burst speed > operating speed", () => {
    const r = flywheelEngine.calculate(base);
    expect(r.burst_speed_rpm.value).toBeGreaterThan(base.speed_rpm);
  });
  it("rim stress > 0", () => {
    expect(flywheelEngine.calculate(base).rim_stress_MPa.value).toBeGreaterThan(0);
  });
  it("more energy = bigger flywheel", () => {
    const lo = flywheelEngine.calculate({ ...base, energy_storage_kJ: 1 });
    const hi = flywheelEngine.calculate({ ...base, energy_storage_kJ: 100 });
    expect(hi.mass_kg.value).toBeGreaterThan(lo.mass_kg.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(flywheelEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("VibrationIsolatorEngine", () => {
  const base = { machine_mass_kg: 500, disturbing_frequency_Hz: 30 };
  it("natural frequency < disturbing frequency", () => {
    const r = vibrationIsolatorEngine.calculate(base);
    expect(r.natural_frequency_Hz.value).toBeLessThan(base.disturbing_frequency_Hz);
  });
  it("isolation efficiency > 80%", () => {
    expect(vibrationIsolatorEngine.calculate(base).isolation_efficiency_pct.value).toBeGreaterThan(80);
  });
  it("transmissibility < 1", () => {
    expect(vibrationIsolatorEngine.calculate(base).transmissibility.value).toBeLessThan(1);
  });
  it("frequency ratio > sqrt(2)", () => {
    expect(vibrationIsolatorEngine.calculate(base).frequency_ratio.value).toBeGreaterThan(1.41);
  });
  it("stiffness per mount > 0", () => {
    expect(vibrationIsolatorEngine.calculate(base).stiffness_per_mount_N_mm.value).toBeGreaterThan(0);
  });
  it("better isolation = lower natural frequency", () => {
    const r90 = vibrationIsolatorEngine.calculate({ ...base, required_isolation_pct: 90 });
    const r99 = vibrationIsolatorEngine.calculate({ ...base, required_isolation_pct: 99 });
    expect(r99.natural_frequency_Hz.value).toBeLessThan(r90.natural_frequency_Hz.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(vibrationIsolatorEngine.calculate(base).recommendations)).toBe(true);
  });
});
