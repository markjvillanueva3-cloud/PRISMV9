/**
 * JaegerTempFieldShimEquivalence — anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-03.
 *
 * Verifies that the engine's exported `cuttingTemperature()` (which now delegates
 * to `JaegerTempField.cuttingTemperatureCompat()`) is BIT-EQUIVALENT to the
 * pre-shim inline implementation across a sweep of realistic inputs.
 *
 * Frozen-baseline approach (matches U-SFPSN-02A KienzleShimEquivalence at
 * commit d46733d245 and U-SFPSN-05 GilbertMRRModel at commit 669d0cddec):
 * the previous inline body is preserved here as `oldCuttingTemperature()` so
 * future module-side optimizations (e.g., adopting the richer Jaeger band
 * source from `calculate()`) cannot silently change the engine's outputs
 * without an explicit test fixture re-baseline + 3-of-3 scrutiny.
 *
 * Acceptance: |delta| / max(|old|, 1e-9) < REL_TOLERANCE for every fixture.
 *
 * CONVENTION DEVIATION (per CLAUDE.md R7 — surface, don't average):
 * mcp-server/src/__tests__/.claude/CLAUDE.md mandates `toBeCloseTo` for
 * floating-point assertions, but this is a BIT-EQUIVALENCE anti-regression
 * where `rel-err === 0` is the contract. `toBeCloseTo` (5-decimal default)
 * would silently mask 1e-6 divergence — defeating the frozen-baseline guard.
 * Use of `toBe` / `toBeLessThan(1e-12)` is intentional; do NOT "fix" to
 * match the broader convention.
 *
 * @module __tests__/JaegerTempFieldShimEquivalence
 */

import { describe, it, expect } from "vitest";
import { JaegerTempField } from "../algorithms/JaegerTempField.js";
import { cuttingTemperature } from "../engines/UltimateSpeedFeedEngine.js";

const REL_TOLERANCE = 1e-12;

/**
 * Frozen pre-shim body of UltimateSpeedFeedEngine.ts:1382-1392 (HEAD~1).
 * NEVER edit to chase a fixture failure — that would defeat the anti-regression.
 * If a divergence is intentional, the test must be re-baselined under a fresh
 * 3-of-3 scrutiny pass with the rationale documented in the milestone envelope.
 */
function oldCuttingTemperature(
  Vc_mpm: number, fz_mm: number, material_k: number,
  material_rho_cp: number, kc1_1: number,
): number {
  const T_ambient = 20;
  const K_coeff = 0.4;
  const Vc_ms = Vc_mpm / 60;
  const T_rise = K_coeff * Math.pow(Vc_ms, 0.4) * Math.pow(Math.max(0.01, fz_mm), 0.2)
    * Math.pow(kc1_1, 0.5) / Math.pow(Math.max(1, material_k * material_rho_cp / 1e6), 0.3);
  return T_ambient + T_rise * 1000;
}

interface MatSpec { name: string; k: number; rho_cp: number; kc1_1: number; }

// 5 representative ISO-group materials with realistic property triples.
const MATERIALS: MatSpec[] = [
  { name: "ISO-P aisi-1045",   k: 50,   rho_cp: 3500000, kc1_1: 1800 },
  { name: "ISO-M ss-304",      k: 16,   rho_cp: 4000000, kc1_1: 2100 },
  { name: "ISO-K cast-iron",   k: 55,   rho_cp: 3700000, kc1_1: 1100 },
  { name: "ISO-N aluminum",    k: 230,  rho_cp: 2400000, kc1_1: 700  },
  { name: "ISO-S inconel-718", k: 11,   rho_cp: 3800000, kc1_1: 2800 },
];

const Vc_GRID = [50, 150, 300, 600, 1000];                 // m/min
const FZ_GRID = [0.02, 0.08, 0.20, 0.40];                  // mm

/**
 * Bit-equivalence acceptance: |delta| / max(|old|, 1e-9) < REL_TOLERANCE.
 * The 1e-9 floor guards against vacuous divisions when both branches return ~0.
 */
function assertEquivalent(actual: number, expected: number, label: string): void {
  const rel = Math.abs(actual - expected) / Math.max(Math.abs(expected), 1e-9);
  expect(rel, `${label}: rel-err=${rel.toExponential(3)}, old=${expected}, new=${actual}`).toBeLessThan(REL_TOLERANCE);
}

describe("JaegerTempField shim equivalence — SF-PSN-WIRE-MS0/U-SFPSN-03", () => {
  it("static method matches frozen inline across 100 fixtures (5 Vc × 4 fz × 5 materials)", () => {
    let n = 0;
    for (const m of MATERIALS) {
      for (const Vc of Vc_GRID) {
        for (const fz of FZ_GRID) {
          const expected = oldCuttingTemperature(Vc, fz, m.k, m.rho_cp, m.kc1_1);
          const actual = JaegerTempField.cuttingTemperatureCompat(Vc, fz, m.k, m.rho_cp, m.kc1_1);
          assertEquivalent(actual, expected, `static[${m.name}, Vc=${Vc}, fz=${fz}]`);
          n++;
        }
      }
    }
    expect(n).toBe(100);
  });

  it("engine delegate matches frozen inline across the same 100 fixtures", () => {
    let n = 0;
    for (const m of MATERIALS) {
      for (const Vc of Vc_GRID) {
        for (const fz of FZ_GRID) {
          const expected = oldCuttingTemperature(Vc, fz, m.k, m.rho_cp, m.kc1_1);
          const actual = cuttingTemperature(Vc, fz, m.k, m.rho_cp, m.kc1_1);
          assertEquivalent(actual, expected, `engine[${m.name}, Vc=${Vc}, fz=${fz}]`);
          n++;
        }
      }
    }
    expect(n).toBe(100);
  });

  it("engine delegate equals static method exactly (the delegation chain is identity)", () => {
    for (const m of MATERIALS) {
      for (const Vc of Vc_GRID) {
        for (const fz of FZ_GRID) {
          const viaEngine = cuttingTemperature(Vc, fz, m.k, m.rho_cp, m.kc1_1);
          const viaStatic = JaegerTempField.cuttingTemperatureCompat(Vc, fz, m.k, m.rho_cp, m.kc1_1);
          expect(viaEngine).toBe(viaStatic);
        }
      }
    }
  });

  describe("clamp boundary equivalence", () => {
    it("fz < 0.01 clamps to 0.01 (both branches)", () => {
      const m = MATERIALS[0];
      const expected = oldCuttingTemperature(150, 0.001, m.k, m.rho_cp, m.kc1_1);
      const actual = JaegerTempField.cuttingTemperatureCompat(150, 0.001, m.k, m.rho_cp, m.kc1_1);
      assertEquivalent(actual, expected, "fz=0.001 clamp");
      // Also verify the clamp engages: result equals fz=0.01 case
      const atFloor = JaegerTempField.cuttingTemperatureCompat(150, 0.01, m.k, m.rho_cp, m.kc1_1);
      expect(actual).toBe(atFloor);
    });

    it("fz = 0 clamps to 0.01 (both branches)", () => {
      const m = MATERIALS[2];
      const expected = oldCuttingTemperature(300, 0, m.k, m.rho_cp, m.kc1_1);
      const actual = JaegerTempField.cuttingTemperatureCompat(300, 0, m.k, m.rho_cp, m.kc1_1);
      assertEquivalent(actual, expected, "fz=0 clamp");
    });

    it("tiny material_k*rho_cp clamps the denominator to 1", () => {
      // Pathological material with k*rho_cp/1e6 < 1
      const expected = oldCuttingTemperature(200, 0.1, 0.1, 100, 1500);
      const actual = JaegerTempField.cuttingTemperatureCompat(200, 0.1, 0.1, 100, 1500);
      assertEquivalent(actual, expected, "tiny k·ρcp clamp");
    });

    it("very high cutting speed remains finite", () => {
      const m = MATERIALS[3]; // aluminum
      const T = JaegerTempField.cuttingTemperatureCompat(5000, 0.3, m.k, m.rho_cp, m.kc1_1);
      expect(Number.isFinite(T)).toBe(true);
      expect(T).toBeGreaterThan(20); // above ambient
    });
  });

  describe("model identity preserved", () => {
    it("T_ambient = 20°C is the floor (Vc→0 limit cannot drop below ambient because T_rise·1000 ≥ 0)", () => {
      const m = MATERIALS[0];
      // The formula's Vc^0.4 term + T_rise*1000 → ambient when Vc is tiny
      const Tlow = JaegerTempField.cuttingTemperatureCompat(1, 0.01, m.k, m.rho_cp, m.kc1_1);
      expect(Tlow).toBeGreaterThanOrEqual(20);
    });

    it("higher Vc produces higher temperature (monotonic in cutting speed)", () => {
      const m = MATERIALS[0];
      const T_low = JaegerTempField.cuttingTemperatureCompat(50, 0.1, m.k, m.rho_cp, m.kc1_1);
      const T_high = JaegerTempField.cuttingTemperatureCompat(500, 0.1, m.k, m.rho_cp, m.kc1_1);
      expect(T_high).toBeGreaterThan(T_low);
    });

    it("higher thermal conductivity produces lower temperature (heat carried away)", () => {
      const Tlowk = JaegerTempField.cuttingTemperatureCompat(150, 0.1, 10, 3500000, 1800);
      const Thighk = JaegerTempField.cuttingTemperatureCompat(150, 0.1, 200, 3500000, 1800);
      expect(Thighk).toBeLessThan(Tlowk);
    });
  });
});
