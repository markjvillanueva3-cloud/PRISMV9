/**
 * Batch 100 — ChemicalVaporDeposition, IonImplantation, SputteringProcess
 * @milestone FORGE-ENGINES-BATCH100
 */
import { describe, it, expect } from "vitest";
import { chemicalVaporDepositionEngine } from "../engines/ChemicalVaporDepositionEngine.js";
import { ionImplantationEngine } from "../engines/IonImplantationEngine.js";
import { sputteringProcessEngine } from "../engines/SputteringProcessEngine.js";

describe("ChemicalVaporDepositionEngine", () => {
  const base = { target_thickness_nm: 500 };
  it("growth rate > 0", () => {
    expect(chemicalVaporDepositionEngine.calculate(base).growth_rate_nm_min.value).toBeGreaterThan(0);
  });
  it("process time > 0", () => {
    expect(chemicalVaporDepositionEngine.calculate(base).process_time_min.value).toBeGreaterThan(0);
  });
  it("LPCVD better conformality than APCVD", () => {
    const lp = chemicalVaporDepositionEngine.calculate({ ...base, variant: "LPCVD" }).conformality_pct.value;
    const ap = chemicalVaporDepositionEngine.calculate({ ...base, variant: "APCVD" }).conformality_pct.value;
    expect(lp).toBeGreaterThan(ap);
  });
  it("uniformity > 80%", () => {
    expect(chemicalVaporDepositionEngine.calculate(base).uniformity_pct.value).toBeGreaterThan(80);
  });
  it("activation energy > 0", () => {
    expect(chemicalVaporDepositionEngine.calculate(base).activation_energy_eV.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(chemicalVaporDepositionEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("IonImplantationEngine", () => {
  const base = { energy_keV: 100 };
  it("projected range > 0", () => {
    expect(ionImplantationEngine.calculate(base).projected_range_nm.value).toBeGreaterThan(0);
  });
  it("higher energy → deeper range", () => {
    const r50 = ionImplantationEngine.calculate({ ...base, energy_keV: 50 }).projected_range_nm.value;
    const r500 = ionImplantationEngine.calculate({ ...base, energy_keV: 500 }).projected_range_nm.value;
    expect(r500).toBeGreaterThan(r50);
  });
  it("peak concentration > 0", () => {
    expect(ionImplantationEngine.calculate(base).peak_concentration_cm3.value).toBeGreaterThan(0);
  });
  it("implant time > 0", () => {
    expect(ionImplantationEngine.calculate(base).implant_time_s.value).toBeGreaterThan(0);
  });
  it("straggle < projected range", () => {
    const r = ionImplantationEngine.calculate(base);
    expect(r.straggle_nm.value).toBeLessThan(r.projected_range_nm.value);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(ionImplantationEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("SputteringProcessEngine", () => {
  const base = { target_thickness_nm: 200 };
  it("sputter yield > 0", () => {
    expect(sputteringProcessEngine.calculate(base).sputter_yield.value).toBeGreaterThan(0);
  });
  it("deposition rate > 0", () => {
    expect(sputteringProcessEngine.calculate(base).deposition_rate_nm_min.value).toBeGreaterThan(0);
  });
  it("higher power → faster deposition", () => {
    const r200 = sputteringProcessEngine.calculate({ ...base, power_W: 200 }).deposition_rate_nm_min.value;
    const r1000 = sputteringProcessEngine.calculate({ ...base, power_W: 1000 }).deposition_rate_nm_min.value;
    expect(r1000).toBeGreaterThan(r200);
  });
  it("process time > 0", () => {
    expect(sputteringProcessEngine.calculate(base).process_time_min.value).toBeGreaterThan(0);
  });
  it("mean free path > 0", () => {
    expect(sputteringProcessEngine.calculate(base).mean_free_path_mm.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(sputteringProcessEngine.calculate(base).recommendations)).toBe(true);
  });
});
