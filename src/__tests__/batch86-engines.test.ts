/**
 * Batch 86 — BrazingSoldering, RivetedJoint, UltrasonicWelding
 * @milestone FORGE-ENGINES-BATCH86
 */
import { describe, it, expect } from "vitest";
import { brazingSolderingEngine } from "../engines/BrazingSolderingEngine.js";
import { rivetedJointEngine } from "../engines/RivetedJointEngine.js";
import { ultrasonicWeldingEngine } from "../engines/UltrasonicWeldingEngine.js";

describe("BrazingSolderingEngine", () => {
  const base = { joint_area_mm2: 200, load_N: 1000 };
  it("safety factor > 0", () => {
    expect(brazingSolderingEngine.calculate(base).safety_factor.value).toBeGreaterThan(0);
  });
  it("larger area → higher safety factor", () => {
    const sf200 = brazingSolderingEngine.calculate(base).safety_factor.value;
    const sf400 = brazingSolderingEngine.calculate({ ...base, joint_area_mm2: 400 }).safety_factor.value;
    expect(sf400).toBeGreaterThan(sf200);
  });
  it("brazing stronger than soldering", () => {
    const braze = brazingSolderingEngine.calculate({ ...base, process: "brazing" }).joint_shear_strength_MPa.value;
    const solder = brazingSolderingEngine.calculate({ ...base, process: "soldering" }).joint_shear_strength_MPa.value;
    expect(braze).toBeGreaterThan(solder);
  });
  it("capillary pressure > 0", () => {
    expect(brazingSolderingEngine.calculate(base).capillary_pressure_kPa.value).toBeGreaterThan(0);
  });
  it("process temperature > 0", () => {
    expect(brazingSolderingEngine.calculate(base).process_temperature_C.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(brazingSolderingEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("RivetedJointEngine", () => {
  const base = { rivet_diameter_mm: 10, plate_thickness_mm: 5, num_rivets: 4, pitch_mm: 40, applied_load_N: 20000 };
  it("safety factor > 0", () => {
    expect(rivetedJointEngine.calculate(base).safety_factor.value).toBeGreaterThan(0);
  });
  it("more rivets → higher safety factor", () => {
    const sf4 = rivetedJointEngine.calculate(base).safety_factor.value;
    const sf8 = rivetedJointEngine.calculate({ ...base, num_rivets: 8 }).safety_factor.value;
    expect(sf8).toBeGreaterThan(sf4);
  });
  it("joint efficiency < 100%", () => {
    const eff = rivetedJointEngine.calculate(base).joint_efficiency_pct.value;
    expect(eff).toBeGreaterThan(0);
    expect(eff).toBeLessThan(100);
  });
  it("load per rivet = total/n", () => {
    expect(rivetedJointEngine.calculate(base).load_per_rivet_N.value).toBe(5000);
  });
  it("shear stress > 0", () => {
    expect(rivetedJointEngine.calculate(base).shear_stress_MPa.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(rivetedJointEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("UltrasonicWeldingEngine", () => {
  const base = { material_thickness_mm: 3, weld_area_mm2: 100 };
  it("power > 0", () => {
    expect(ultrasonicWeldingEngine.calculate(base).power_W.value).toBeGreaterThan(0);
  });
  it("weld energy > 0", () => {
    expect(ultrasonicWeldingEngine.calculate(base).weld_energy_J.value).toBeGreaterThan(0);
  });
  it("higher amplitude → more power", () => {
    const p30 = ultrasonicWeldingEngine.calculate({ ...base, amplitude_um: 30 }).power_W.value;
    const p60 = ultrasonicWeldingEngine.calculate({ ...base, amplitude_um: 60 }).power_W.value;
    expect(p60).toBeGreaterThan(p30);
  });
  it("interface temperature > ambient", () => {
    expect(ultrasonicWeldingEngine.calculate(base).interface_temperature_C.value).toBeGreaterThan(25);
  });
  it("weld strength > 0", () => {
    expect(ultrasonicWeldingEngine.calculate(base).weld_strength_MPa.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(ultrasonicWeldingEngine.calculate(base).recommendations)).toBe(true);
  });
});
