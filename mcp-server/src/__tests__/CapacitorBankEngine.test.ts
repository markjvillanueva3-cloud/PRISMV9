/**
 * CapacitorBankEngine.test.ts — engine-direct coverage for
 * WIRE-UNWIRED-MS0/U-WIRE-CAPB.
 *
 * Algebraic invariants:
 *   1. Q = P × (tan(acos(pf1)) - tan(acos(pf2)))
 *      For pf1=0.75, pf2=0.95, P=100:
 *      tan(acos(0.75)) ≈ 0.8819; tan(acos(0.95)) ≈ 0.3287
 *      Q ≈ 100 × (0.8819 - 0.3287) = 55.32 kVAR
 *   2. Apparent power: S = P / pf
 *   3. Demand reduction: (1 - S2/S1) × 100 = (1 - pf1/pf2) × 100
 *   4. Resonance: h_r = sqrt(Ssc / Qc) where Ssc = S1 × 100 / Zsc
 *   5. is_safe = Qc > 0 AND |h_r - h_dom| > 0.5
 */

import { describe, it, expect } from "vitest";
import { capacitorBankEngine } from "../engines/CapacitorBankEngine.js";

// Reference shop scenario: 100 kW load, PF 0.75 → 0.95 target, 480V 60Hz.
const REFERENCE = {
  real_power_kW: 100,
  current_pf: 0.75,
  target_pf: 0.95,
  voltage_V: 480,
  frequency_Hz: 60,
  harmonic_order: 5,
  transformer_impedance_pct: 5,
};

describe("CapacitorBankEngine — required kVAR (algebraic invariant)", () => {
  it("Q ≈ 55.32 kVAR for P=100kW, pf1=0.75, pf2=0.95 (reference computation)", () => {
    const r = capacitorBankEngine.calculate(REFERENCE);
    // tan(acos(0.75)) = 0.88192; tan(acos(0.95)) = 0.32868
    const expected = 100 * (Math.tan(Math.acos(0.75)) - Math.tan(Math.acos(0.95)));
    expect(r.required_kVAR.value).toBeCloseTo(expected, 0);
  });

  it("Q scales linearly with P (when pf1, pf2 fixed)", () => {
    const r50 = capacitorBankEngine.calculate({ ...REFERENCE, real_power_kW: 50 });
    const r100 = capacitorBankEngine.calculate({ ...REFERENCE, real_power_kW: 100 });
    const r200 = capacitorBankEngine.calculate({ ...REFERENCE, real_power_kW: 200 });
    expect(r100.required_kVAR.value / r50.required_kVAR.value).toBeCloseTo(2.0, 1);
    expect(r200.required_kVAR.value / r100.required_kVAR.value).toBeCloseTo(2.0, 1);
  });
});

describe("CapacitorBankEngine — apparent power (S = P/pf)", () => {
  it("S_before = P / pf1; S_after = P / pf2", () => {
    const r = capacitorBankEngine.calculate(REFERENCE);
    expect(r.apparent_power_before_kVA.value).toBeCloseTo(100 / 0.75, 0);
    expect(r.apparent_power_after_kVA.value).toBeCloseTo(100 / 0.95, 0);
  });

  it("S_after < S_before (correction reduces apparent power)", () => {
    const r = capacitorBankEngine.calculate(REFERENCE);
    expect(r.apparent_power_after_kVA.value).toBeLessThan(r.apparent_power_before_kVA.value);
  });
});

describe("CapacitorBankEngine — demand reduction invariant", () => {
  it("demand_reduction = (1 - pf1/pf2) × 100 ≈ 21.05% for 0.75→0.95", () => {
    const r = capacitorBankEngine.calculate(REFERENCE);
    // (1 - 0.75/0.95) * 100 ≈ 21.053
    const expected = (1 - 0.75 / 0.95) * 100;
    expect(r.demand_reduction_pct.value).toBeCloseTo(expected, 0);
  });
});

describe("CapacitorBankEngine — safety + recommendations", () => {
  it("is_safe=true for nominal correction with resonance well clear of 5th", () => {
    const r = capacitorBankEngine.calculate(REFERENCE);
    expect(r.is_safe).toBe(true);
  });

  it("recommendations always non-empty (engine line 91 fallback)", () => {
    const r = capacitorBankEngine.calculate(REFERENCE);
    expect(r.recommendations.length).toBeGreaterThanOrEqual(1);
    for (const rec of r.recommendations) {
      expect(rec.length).toBeGreaterThan(0);
    }
  });

  it("pf1 > pf2 triggers 'already exceeds target' rec", () => {
    const r = capacitorBankEngine.calculate({
      ...REFERENCE, current_pf: 0.98, target_pf: 0.90,
    });
    const matched = r.recommendations.some((rec) => rec.includes("already exceeds"));
    expect(matched).toBe(true);
  });

  it("very high target_pf=0.99 triggers 'risk of leading PF' rec", () => {
    const r = capacitorBankEngine.calculate({
      ...REFERENCE, target_pf: 0.99,
    });
    const matched = r.recommendations.some((rec) => rec.includes("leading PF"));
    expect(matched).toBe(true);
  });
});

describe("CapacitorBankEngine — AtomicValue shape", () => {
  it("every result field has value+unit+uncertainty+source", () => {
    const r = capacitorBankEngine.calculate(REFERENCE);
    const fields = [
      r.required_kVAR,
      r.capacitance_uF,
      r.current_A,
      r.apparent_power_before_kVA,
      r.apparent_power_after_kVA,
      r.demand_reduction_pct,
      r.resonance_order,
      r.energy_savings_pct,
    ];
    for (const f of fields) {
      expect(typeof f.value).toBe("number");
      expect(f.unit.length).toBeGreaterThan(0);
      expect(f.uncertainty).toBeGreaterThanOrEqual(0);
      expect(f.source.length).toBeGreaterThan(0);
    }
  });
});

describe("CapacitorBankEngine — determinism + VARIABILITY", () => {
  it("DETERMINISM — same input twice returns identical kVAR", () => {
    const r1 = capacitorBankEngine.calculate(REFERENCE);
    const r2 = capacitorBankEngine.calculate(REFERENCE);
    expect(r1.required_kVAR.value).toBe(r2.required_kVAR.value);
    expect(r1.capacitance_uF.value).toBe(r2.capacitance_uF.value);
  });

  it("VARIABILITY — 3 voltage levels (240/480/4160) yield distinct currents", () => {
    const voltages = [240, 480, 4160];
    const currents = voltages.map((V) => capacitorBankEngine.calculate({ ...REFERENCE, voltage_V: V }).current_A.value);
    // Ic = Qc * 1000 / (sqrt(3) * V) — higher V → lower I
    expect(currents[0]).toBeGreaterThan(currents[1]);
    expect(currents[1]).toBeGreaterThan(currents[2]);
  });

  it("VARIABILITY — 3 starting PFs (0.6/0.75/0.85) yield distinct kVAR (lower PF needs more correction)", () => {
    const pfs = [0.6, 0.75, 0.85];
    const kvars = pfs.map((pf) => capacitorBankEngine.calculate({ ...REFERENCE, current_pf: pf }).required_kVAR.value);
    expect(kvars[0]).toBeGreaterThan(kvars[1]);
    expect(kvars[1]).toBeGreaterThan(kvars[2]);
  });
});
