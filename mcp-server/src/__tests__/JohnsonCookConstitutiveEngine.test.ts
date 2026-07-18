/**
 * JohnsonCookConstitutiveEngine — canonical-value + formula tests.
 * U-EXTRACT-JC-CONSTANTS (slot:golf 2026-05-24).
 *
 * Pins:
 *  - All 5 materials present (Al/Ti/steel/inconel coverage)
 *  - Stress at reference conditions (ε=1, ε̇=1, T=T_room) reduces to A + B*1 = A + B
 *  - Alias resolution for common shop-floor names
 *  - Thermal softening behavior at T_melt → 0
 *  - Strain-rate boost at high ε̇ vs reference rate
 */

import { describe, it, expect } from "vitest";
import {
  JohnsonCookConstitutiveEngine,
  JOHNSON_COOK_PARAMS,
} from "../engines/JohnsonCookConstitutiveEngine.js";

describe("JohnsonCookConstitutiveEngine.getParams", () => {
  it("returns canonical params for all 5 materials by canonical key", () => {
    for (const m of ["AISI_1018", "AISI_4340", "Ti6Al4V", "Al_2024_T3", "Inconel_718"] as const) {
      const p = JohnsonCookConstitutiveEngine.getParams(m);
      expect(p).not.toBeNull();
      expect(p?.A).toBeGreaterThan(0);
      expect(p?.B).toBeGreaterThan(0);
      expect(p?.T_melt).toBeGreaterThan(p!.T_room);
    }
  });

  it("resolves common aliases (case-insensitive, separator-stripped)", () => {
    expect(JohnsonCookConstitutiveEngine.getParams("1018")).toBe(JOHNSON_COOK_PARAMS.AISI_1018);
    expect(JohnsonCookConstitutiveEngine.getParams("Ti-6Al-4V")).toBe(JOHNSON_COOK_PARAMS.Ti6Al4V);
    expect(JohnsonCookConstitutiveEngine.getParams("titanium")).toBe(JOHNSON_COOK_PARAMS.Ti6Al4V);
    expect(JohnsonCookConstitutiveEngine.getParams("Inconel 718")).toBe(JOHNSON_COOK_PARAMS.Inconel_718);
    expect(JohnsonCookConstitutiveEngine.getParams("Al 2024-T3")).toBe(JOHNSON_COOK_PARAMS.Al_2024_T3);
  });

  it("returns null for unknown material (fail-loud — caller decides fallback)", () => {
    expect(JohnsonCookConstitutiveEngine.getParams("UNOBTAINIUM")).toBeNull();
    expect(JohnsonCookConstitutiveEngine.getParams("")).toBeNull();
  });

  it("specific published values present (Ti6Al4V — A=862, B=331)", () => {
    const p = JohnsonCookConstitutiveEngine.getParams("Ti6Al4V")!;
    expect(p.A).toBe(862);
    expect(p.B).toBe(331);
    expect(p.n).toBeCloseTo(0.34, 4);
    expect(p.m).toBeCloseTo(0.80, 4);
  });
});

describe("JohnsonCookConstitutiveEngine.stress", () => {
  it("reference conditions (ε=1, ε̇=ε̇₀, T=T_room): σ = A + B (term2=1, term3=1)", () => {
    const p = JOHNSON_COOK_PARAMS.AISI_4340;
    const sigma = JohnsonCookConstitutiveEngine.stress(1.0, p.eps_dot_0, p.T_room, p);
    // term1 = A + B * 1^n = A + B = 792 + 510 = 1302
    expect(sigma).toBeCloseTo(p.A + p.B, 3);
  });

  it("thermal softening at T = T_melt: σ → 0 (T* = 1 → term3 = 0)", () => {
    const p = JOHNSON_COOK_PARAMS.Ti6Al4V;
    const sigma = JohnsonCookConstitutiveEngine.stress(1.0, p.eps_dot_0, p.T_melt, p);
    expect(sigma).toBeCloseTo(0, 6);
  });

  it("strain-rate sensitivity: σ at ε̇=1000 > σ at ε̇=1 (term2 > 1)", () => {
    const p = JOHNSON_COOK_PARAMS.AISI_1018;
    const sigmaSlow = JohnsonCookConstitutiveEngine.stress(1.0, 1.0, p.T_room, p);
    const sigmaFast = JohnsonCookConstitutiveEngine.stress(1.0, 1000.0, p.T_room, p);
    expect(sigmaFast).toBeGreaterThan(sigmaSlow);
  });

  it("strain hardening: σ at ε=0.5 < σ at ε=2.0 (B·ε^n grows)", () => {
    const p = JOHNSON_COOK_PARAMS.Inconel_718;
    const sigmaLowStrain = JohnsonCookConstitutiveEngine.stress(0.5, p.eps_dot_0, p.T_room, p);
    const sigmaHighStrain = JohnsonCookConstitutiveEngine.stress(2.0, p.eps_dot_0, p.T_room, p);
    expect(sigmaHighStrain).toBeGreaterThan(sigmaLowStrain);
  });

  it("BOUNDARY: T > T_melt clamped (no negative stress)", () => {
    const p = JOHNSON_COOK_PARAMS.AISI_1018;
    const sigma = JohnsonCookConstitutiveEngine.stress(1.0, p.eps_dot_0, p.T_melt + 500, p);
    expect(sigma).toBeGreaterThanOrEqual(0);
  });

  it("BOUNDARY: ε=0 doesn't NaN (saturated to 1e-3)", () => {
    const p = JOHNSON_COOK_PARAMS.AISI_1018;
    const sigma = JohnsonCookConstitutiveEngine.stress(0, p.eps_dot_0, p.T_room, p);
    expect(Number.isFinite(sigma)).toBe(true);
    expect(sigma).toBeGreaterThan(0);
  });
});

describe("JohnsonCookConstitutiveEngine.materials", () => {
  it("returns all 5 canonical material keys", () => {
    const mats = JohnsonCookConstitutiveEngine.materials();
    expect(mats).toHaveLength(5);
    expect(mats).toContain("Ti6Al4V");
    expect(mats).toContain("Inconel_718");
  });
});
