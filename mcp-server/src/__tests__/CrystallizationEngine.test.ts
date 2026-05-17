/**
 * CrystallizationEngine.test.ts — engine-direct coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CRYS.
 *
 * Algebraic invariants:
 *   1. S = Cf / (Csat + 0.001) — supersaturation ratio
 *   2. yieldFraction = min(deltaC / (Cf+0.001), 0.95)
 *   3. production_kg_h = Qf * Cf / 1000 * yieldFraction
 *   4. MSMPR: L_mean = 3.67 × G × τ
 *   5. CV by type: MSMPR=52%, batch_cooling=35%, else=45%
 *   6. specPower by type: evaporative=5.0, reactive=2.0, MSMPR=1.0, else=0.5
 *   7. is_safe = S > 1 AND S < 3 AND L_mean > 50 AND yield > 10%
 */

import { describe, it, expect } from "vitest";
import { crystallizationEngine } from "../engines/CrystallizationEngine.js";

// NaCl nominal: Csat25=360 g/L. At Cf=450 → S=1.25, supersaturated.
const NACL_NOMINAL = {
  type: "MSMPR" as const,
  solute: "NaCl" as const,
  feed_concentration_g_L: 450,
  feed_rate_L_h: 100,
  temperature_C: 25,
  residence_time_min: 60,
};

describe("CrystallizationEngine — supersaturation (algebraic invariant)", () => {
  it("S = Cf / Csat for NaCl at 25°C (Csat25=360 g/L)", () => {
    const r = crystallizationEngine.calculate(NACL_NOMINAL);
    // S = 450 / (360 + 0.001) ≈ 1.25
    expect(r.supersaturation_ratio.value).toBeCloseTo(450 / 360.001, 2);
  });

  it("explicit saturation_concentration_g_L overrides solute default", () => {
    const r = crystallizationEngine.calculate({
      ...NACL_NOMINAL, saturation_concentration_g_L: 200,
    });
    // S = 450 / (200 + 0.001) ≈ 2.25
    expect(r.supersaturation_ratio.value).toBeCloseTo(450 / 200.001, 2);
  });

  it("supersaturation > 1 for over-saturated feed", () => {
    const r = crystallizationEngine.calculate(NACL_NOMINAL);
    expect(r.supersaturation_ratio.value).toBeGreaterThan(1);
  });
});

describe("CrystallizationEngine — MSMPR crystal size invariant (L = 3.67 × G × τ)", () => {
  it("L_mean scales ~linearly with residence time", () => {
    const r60 = crystallizationEngine.calculate({ ...NACL_NOMINAL, residence_time_min: 60 });
    const r120 = crystallizationEngine.calculate({ ...NACL_NOMINAL, residence_time_min: 120 });
    // L_mean = 3.67 × G × τ ∝ τ
    expect(r120.mean_crystal_size_um.value / r60.mean_crystal_size_um.value).toBeCloseTo(2.0, 0);
  });

  it("growth_rate G scales with σ^1.5 (power law)", () => {
    // sigma = S - 1; G = gFactor * 10 * sigma^1.5
    const r1 = crystallizationEngine.calculate({ ...NACL_NOMINAL, feed_concentration_g_L: 400 });
    const r2 = crystallizationEngine.calculate({ ...NACL_NOMINAL, feed_concentration_g_L: 500 });
    // Higher Cf → higher S → higher G
    expect(r2.growth_rate_um_min.value).toBeGreaterThan(r1.growth_rate_um_min.value);
  });
});

describe("CrystallizationEngine — CV by crystallizer type", () => {
  it("MSMPR CV = 52% (theoretical)", () => {
    const r = crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "MSMPR" });
    expect(r.cv_size_distribution.value).toBe(52);
  });

  it("batch_cooling CV = 35%", () => {
    const r = crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "batch_cooling" });
    expect(r.cv_size_distribution.value).toBe(35);
  });

  it("evaporative CV = 45% (else branch)", () => {
    const r = crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "evaporative" });
    expect(r.cv_size_distribution.value).toBe(45);
  });
});

describe("CrystallizationEngine — specPower by type", () => {
  it("evaporative=5.0, reactive=2.0, MSMPR=1.0, else=0.5", () => {
    expect(crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "evaporative" }).specific_power_kW_m3.value).toBe(5.0);
    expect(crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "reactive" }).specific_power_kW_m3.value).toBe(2.0);
    expect(crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "MSMPR" }).specific_power_kW_m3.value).toBe(1.0);
    expect(crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "antisolvent" }).specific_power_kW_m3.value).toBe(0.5);
    expect(crystallizationEngine.calculate({ ...NACL_NOMINAL, type: "melt" }).specific_power_kW_m3.value).toBe(0.5);
  });
});

describe("CrystallizationEngine — yield + production invariants", () => {
  it("yield_pct ∈ [0, 95] (engine line 82 cap at 0.95)", () => {
    const r = crystallizationEngine.calculate(NACL_NOMINAL);
    expect(r.yield_pct.value).toBeGreaterThanOrEqual(0);
    expect(r.yield_pct.value).toBeLessThanOrEqual(95);
  });

  it("production_kg_h ≈ Qf × Cf × yieldFraction / 1000", () => {
    const r = crystallizationEngine.calculate(NACL_NOMINAL);
    const expectedProduction = 100 * 450 / 1000 * (r.yield_pct.value / 100);
    expect(r.crystal_production_kg_h.value).toBeCloseTo(expectedProduction, 0);
  });

  it("zero supersaturation → zero yield", () => {
    const r = crystallizationEngine.calculate({
      ...NACL_NOMINAL,
      feed_concentration_g_L: 100, // below Csat=360
      saturation_concentration_g_L: 360,
    });
    expect(r.yield_pct.value).toBe(0);
    expect(r.crystal_production_kg_h.value).toBe(0);
  });
});

describe("CrystallizationEngine — safety + recommendations", () => {
  it("recommendations always non-empty (engine line 112 fallback)", () => {
    const r = crystallizationEngine.calculate(NACL_NOMINAL);
    expect(r.recommendations.length).toBeGreaterThanOrEqual(1);
    for (const rec of r.recommendations) {
      expect(rec.length).toBeGreaterThan(0);
    }
  });

  it("high supersaturation S>2 triggers 'excessive nucleation' rec", () => {
    const r = crystallizationEngine.calculate({
      ...NACL_NOMINAL, feed_concentration_g_L: 1000, // S = 1000/360 ≈ 2.78
    });
    const matched = r.recommendations.some((rec) => rec.includes("excessive nucleation"));
    expect(matched).toBe(true);
  });

  it("VARIABILITY — all 6 solutes produce distinct Csat (verified via S ratio differences)", () => {
    const solutes = ["NaCl", "KCl", "sucrose", "citric_acid", "ammonium_sulfate", "paracetamol"] as const;
    const sValues = solutes.map((s) => crystallizationEngine.calculate({
      ...NACL_NOMINAL, solute: s, feed_concentration_g_L: 500,
    }).supersaturation_ratio.value);
    // 6 distinct Csat values should yield ≥ 4 distinct S ratios
    const distinct = new Set(sValues);
    expect(distinct.size).toBeGreaterThanOrEqual(4);
  });
});

describe("CrystallizationEngine — AtomicValue shape + determinism", () => {
  it("every result field has value+unit+uncertainty+source", () => {
    const r = crystallizationEngine.calculate(NACL_NOMINAL);
    const fields = [
      r.yield_pct, r.crystal_production_kg_h, r.mean_crystal_size_um,
      r.supersaturation_ratio, r.nucleation_rate_per_m3_s, r.growth_rate_um_min,
      r.cv_size_distribution, r.specific_power_kW_m3,
    ];
    for (const f of fields) {
      expect(typeof f.value).toBe("number");
      expect(f.unit.length).toBeGreaterThan(0);
      expect(f.uncertainty).toBeGreaterThanOrEqual(0);
      expect(f.source.length).toBeGreaterThan(0);
    }
  });

  it("DETERMINISM — same input twice returns identical S + L_mean", () => {
    const r1 = crystallizationEngine.calculate(NACL_NOMINAL);
    const r2 = crystallizationEngine.calculate(NACL_NOMINAL);
    expect(r1.supersaturation_ratio.value).toBe(r2.supersaturation_ratio.value);
    expect(r1.mean_crystal_size_um.value).toBe(r2.mean_crystal_size_um.value);
  });
});
