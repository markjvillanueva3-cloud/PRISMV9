/**
 * Batch 55 — CrankshaftDesign, PistonDesign, ConnectingRod
 * @milestone FORGE-ENGINES-BATCH55
 */
import { describe, it, expect } from "vitest";
import { crankshaftDesignEngine } from "../engines/CrankshaftDesignEngine.js";
import { pistonDesignEngine } from "../engines/PistonDesignEngine.js";
import { connectingRodEngine } from "../engines/ConnectingRodEngine.js";

// ── CrankshaftDesignEngine ─────────────────────────────────────────
describe("CrankshaftDesignEngine", () => {
  const base = {
    bore_mm: 86,
    stroke_mm: 86,
    num_cylinders: 4,
    max_rpm: 6500,
  };

  it("gas force > 0", () => {
    const r = crankshaftDesignEngine.calculate(base);
    expect(r.max_gas_force_kN.value).toBeGreaterThan(0);
  });

  it("inertia force > 0", () => {
    const r = crankshaftDesignEngine.calculate(base);
    expect(r.max_inertia_force_kN.value).toBeGreaterThan(0);
  });

  it("von Mises stress > 0", () => {
    const r = crankshaftDesignEngine.calculate(base);
    expect(r.von_mises_stress_MPa.value).toBeGreaterThan(0);
  });

  it("higher RPM increases inertia force", () => {
    const lo = crankshaftDesignEngine.calculate({
      ...base, max_rpm: 3000,
    });
    const hi = crankshaftDesignEngine.calculate({
      ...base, max_rpm: 9000,
    });
    expect(hi.max_inertia_force_kN.value).toBeGreaterThan(
      lo.max_inertia_force_kN.value
    );
  });

  it("fatigue safety factor > 0", () => {
    const r = crankshaftDesignEngine.calculate(base);
    expect(r.fatigue_safety_factor.value).toBeGreaterThan(0);
  });

  it("critical speed > 0", () => {
    const r = crankshaftDesignEngine.calculate(base);
    expect(r.critical_speed_rpm.value).toBeGreaterThan(0);
  });

  it("journal and pin diameters > 0", () => {
    const r = crankshaftDesignEngine.calculate(base);
    expect(r.journal_diameter_mm.value).toBeGreaterThan(0);
    expect(r.pin_diameter_mm.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = crankshaftDesignEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── PistonDesignEngine ─────────────────────────────────────────────
describe("PistonDesignEngine", () => {
  const base = {
    bore_mm: 86,
    stroke_mm: 86,
    max_rpm: 6500,
  };

  it("crown thickness > 0", () => {
    const r = pistonDesignEngine.calculate(base);
    expect(r.crown_thickness_mm.value).toBeGreaterThan(0);
  });

  it("piston mass > 0", () => {
    const r = pistonDesignEngine.calculate(base);
    expect(r.piston_mass_g.value).toBeGreaterThan(0);
  });

  it("mean piston speed > 0", () => {
    const r = pistonDesignEngine.calculate(base);
    expect(r.mean_piston_speed_m_s.value).toBeGreaterThan(0);
  });

  it("higher pressure needs thicker crown", () => {
    const lo = pistonDesignEngine.calculate({
      ...base, max_pressure_MPa: 4,
    });
    const hi = pistonDesignEngine.calculate({
      ...base, max_pressure_MPa: 15,
    });
    expect(hi.crown_thickness_mm.value).toBeGreaterThan(
      lo.crown_thickness_mm.value
    );
  });

  it("thermal expansion > 0", () => {
    const r = pistonDesignEngine.calculate(base);
    expect(r.thermal_expansion_mm.value).toBeGreaterThan(0);
  });

  it("cold clearance > thermal expansion", () => {
    const r = pistonDesignEngine.calculate(base);
    expect(r.cold_clearance_mm.value).toBeGreaterThan(
      r.thermal_expansion_mm.value
    );
  });

  it("pin diameter > 0", () => {
    const r = pistonDesignEngine.calculate(base);
    expect(r.pin_diameter_mm.value).toBeGreaterThan(0);
  });

  it("recommendations is array", () => {
    const r = pistonDesignEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});

// ── ConnectingRodEngine ────────────────────────────────────────────
describe("ConnectingRodEngine", () => {
  const base = {
    bore_mm: 86,
    stroke_mm: 86,
    max_rpm: 6500,
  };

  it("tensile force > 0", () => {
    const r = connectingRodEngine.calculate(base);
    expect(r.max_tensile_force_kN.value).toBeGreaterThan(0);
  });

  it("compressive force > 0", () => {
    const r = connectingRodEngine.calculate(base);
    expect(r.max_compressive_force_kN.value).toBeGreaterThan(0);
  });

  it("buckling load > 0", () => {
    const r = connectingRodEngine.calculate(base);
    expect(r.buckling_load_kN.value).toBeGreaterThan(0);
  });

  it("buckling safety factor > 0", () => {
    const r = connectingRodEngine.calculate(base);
    expect(r.buckling_safety_factor.value).toBeGreaterThan(0);
  });

  it("adequate section has SF ≥ 1", () => {
    const r = connectingRodEngine.calculate({
      ...base, cross_section_area_mm2: 800,
    });
    expect(r.buckling_safety_factor.value).toBeGreaterThanOrEqual(1);
  });

  it("fatigue safety factor > 0", () => {
    const r = connectingRodEngine.calculate({
      ...base, cross_section_area_mm2: 800,
    });
    expect(r.fatigue_safety_factor.value).toBeGreaterThan(0);
  });

  it("rod mass > 0", () => {
    const r = connectingRodEngine.calculate(base);
    expect(r.rod_mass_g.value).toBeGreaterThan(0);
  });

  it("big end > small end", () => {
    const r = connectingRodEngine.calculate(base);
    expect(r.big_end_diameter_mm.value).toBeGreaterThan(
      r.small_end_diameter_mm.value
    );
  });

  it("higher RPM increases tensile force", () => {
    const lo = connectingRodEngine.calculate({
      ...base, max_rpm: 3000,
    });
    const hi = connectingRodEngine.calculate({
      ...base, max_rpm: 9000,
    });
    expect(hi.max_tensile_force_kN.value).toBeGreaterThan(
      lo.max_tensile_force_kN.value
    );
  });

  it("recommendations is array", () => {
    const r = connectingRodEngine.calculate(base);
    expect(Array.isArray(r.recommendations)).toBe(true);
  });
});
