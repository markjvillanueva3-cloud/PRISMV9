/**
 * U-W100-03a: Klocke Ra formula consistency test
 *
 * Verifies that all EDM engines use the shared klockeRa utility
 * and produce consistent Ra values for equivalent inputs.
 */
import { describe, it, expect } from "vitest";
import { klockeRa, klockeRaFromEnergy, getRaCoefficients, puertasLuisRa, puertasLuisInverseI } from "../engines/utils/klockeRa.js";
import { edmWireEngine } from "../engines/EDMWireEngine.js";
import { stochasticEDMEngine } from "../engines/StochasticEDMEngine.js";
import { edmParameterEngine } from "../engines/EDMParameterEngine.js";

describe("U-W100-03a: Klocke Ra formula consistency", () => {
  it("shared utility matches Klocke (2013) canonical form", () => {
    // Ra = k_ra × I_p^α × t_on^β
    // Steel defaults: k_ra=0.38, α=0.40, β=0.28
    const I_p = 10; // Amperes
    const t_on = 50; // microseconds

    const expected = 0.38 * Math.pow(I_p, 0.40) * Math.pow(t_on, 0.28);
    const actual = klockeRa(I_p, t_on, "tool_steel");

    expect(actual).toBeCloseTo(expected, 6);
  });

  it("material-specific coefficients are applied correctly", () => {
    const I_p = 8;
    const t_on = 30;

    const steelRa = klockeRa(I_p, t_on, "tool_steel");
    const aluminumRa = klockeRa(I_p, t_on, "aluminum");
    const carbideRa = klockeRa(I_p, t_on, "carbide");

    // Aluminum has higher alpha (0.42) but lower k_ra (0.35)
    // Carbide has lowest k_ra (0.32) but highest beta (0.32)
    expect(steelRa).not.toEqual(aluminumRa);
    expect(steelRa).not.toEqual(carbideRa);
    expect(aluminumRa).not.toEqual(carbideRa);
  });

  it("energy-based function produces consistent results", () => {
    // klockeRaFromEnergy derives I_p and t_on from energy
    const E_mJ = 5;
    const direct = klockeRaFromEnergy(E_mJ, "tool_steel");

    // Should produce reasonable Ra for typical EDM conditions
    expect(direct).toBeGreaterThan(0.5);
    expect(direct).toBeLessThan(10);
  });

  it("EDMWireEngine uses shared Klocke formula", () => {
    const result = edmWireEngine.calculate({
      workpiece_thickness_mm: 25,
      discharge_voltage_V: 60,
      discharge_current_A: 8,
      pulse_on_us: 10,
      pulse_off_us: 20,
      cutting_mode: "rough",
    });

    // Verify Ra is derived from Klocke formula
    // E_pulse = V × I × t_on = 60 × 8 × 10e-6 = 4.8mJ
    const E_pulse_mJ = 60 * 8 * 10 * 1e-3;
    const expectedRa = klockeRaFromEnergy(E_pulse_mJ, "tool_steel");

    // Rough mode uses full Ra_base
    expect(result.surface_roughness_Ra_um.value).toBeCloseTo(expectedRa, 1);
  });

  it("StochasticEDMEngine edmRoughness uses shared formula", () => {
    const E_mJ = 2;
    const t_on = 20;

    // edmRoughness derives I_p from energy and t_on
    const V_gap = 45;
    const t_on_s = t_on * 1e-6;
    const I_p = (E_mJ / 1000) / (V_gap * t_on_s);

    const expected = klockeRa(I_p, t_on, "tool_steel");
    const actual = stochasticEDMEngine.edmRoughness(E_mJ, t_on);

    expect(actual).toBeCloseTo(expected, 6);
  });

  it("EDMParameterEngine uses material-aware Klocke formula", () => {
    // Carbide material should use carbide coefficients
    const carbideResult = edmParameterEngine.calculate({
      edm_type: "sinker",
      workpiece_material: "carbide",
      cut_type: "roughing",
    });

    const steelResult = edmParameterEngine.calculate({
      edm_type: "sinker",
      workpiece_material: "steel",
      cut_type: "roughing",
    });

    // Same cut parameters but different materials = different Ra
    expect(carbideResult.surface_roughness.value).not.toEqual(
      steelResult.surface_roughness.value
    );
  });

  it("getRaCoefficients returns correct values for known materials", () => {
    const steel = getRaCoefficients("d2");
    expect(steel.k_ra).toBe(0.38);
    expect(steel.alpha).toBe(0.40);
    expect(steel.beta).toBe(0.28);

    const aluminum = getRaCoefficients("6061");
    expect(aluminum.k_ra).toBe(0.35);
    expect(aluminum.alpha).toBe(0.42);
    expect(aluminum.beta).toBe(0.25);

    const stainless = getRaCoefficients("316ss");
    expect(stainless.k_ra).toBe(0.42);
    expect(stainless.alpha).toBe(0.38);
    expect(stainless.beta).toBe(0.30);
  });

  it("falls back to steel defaults for unknown materials", () => {
    const unknown = getRaCoefficients("unobtainium");
    const steel = getRaCoefficients("tool_steel");

    expect(unknown).toEqual(steel);
  });

  // U-W100-03b: Puertas & Luis (2004) model tests
  it("Puertas&Luis Ra calculation matches expected form", () => {
    // Ra = C_ra × I^α × t_on^β
    const coeffs = { C_ra: 1.25, alpha: 0.39, beta: 0.25 };
    const I_p = 10;
    const t_on = 50;

    const expected = 1.25 * Math.pow(I_p, 0.39) * Math.pow(t_on, 0.25);
    const actual = puertasLuisRa(I_p, t_on, coeffs);

    expect(actual).toBeCloseTo(expected, 6);
  });

  it("Puertas&Luis inverse solves correctly for I_p", () => {
    const coeffs = { C_ra: 1.25, alpha: 0.39, beta: 0.25 };
    const t_on = 50;

    // Start with known Ra, solve for I, then verify forward calculation
    const targetRa = 5.0;
    const solvedI = puertasLuisInverseI(targetRa, t_on, coeffs);
    const verifyRa = puertasLuisRa(solvedI, t_on, coeffs);

    expect(verifyRa).toBeCloseTo(targetRa, 4);
  });

  it("Puertas&Luis differs significantly from Klocke (expected)", () => {
    // These are DIFFERENT empirical models — Ra values should NOT match
    const I_p = 10;
    const t_on = 50;

    const klockeVal = klockeRa(I_p, t_on, "d2");
    const puertasVal = puertasLuisRa(I_p, t_on, { C_ra: 1.25, alpha: 0.39, beta: 0.25 });

    // Expect >30% difference (they are different models)
    const diff = Math.abs(puertasVal - klockeVal) / klockeVal;
    expect(diff).toBeGreaterThan(0.3);
  });
});
