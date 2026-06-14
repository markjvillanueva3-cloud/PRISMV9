/**
 * StabilityShimEquivalence — anti-regression for SF-PSN-WIRE-MS0/U-SFPSN-04.
 *
 * Verifies bit-equivalence between the engine's exported `estimateStability()`
 * (which now delegates to `StabilityLobeDiagram.stabilityEstimateCompat`) and
 * the FROZEN pre-shim inline body across realistic stability inputs.
 *
 * Pattern matches U-SFPSN-03 JaegerTempFieldShimEquivalence + U-02A KienzleShim
 * + U-05 GilbertMRR (commits 2d6a1ffba8, d46733d245, 669d0cddec). Frozen baseline
 * MUST NOT be edited to chase a failure — any intentional divergence triggers
 * a re-baseline under 3-of-3 scrutiny.
 *
 * CONVENTION DEVIATION: uses `toBe` / `toBeLessThan(1e-12)` instead of the
 * project's default `toBeCloseTo` (5-decimal). Bit-equivalence contract
 * requires exact comparison — `toBeCloseTo` would mask 1e-6 divergence.
 * Same rationale as JaegerTempFieldShimEquivalence (commit 409cc89d5d).
 *
 * @module __tests__/StabilityShimEquivalence
 */

import { describe, it, expect } from "vitest";
import {
  stabilityEstimateCompat,
  StabilityLobeDiagram,
  type StabilityCompatResult,
} from "../algorithms/StabilityLobeDiagram.js";
import { FRFStabilityLobe } from "../algorithms/FRFStabilityLobe.js";
import { RCSA } from "../algorithms/RCSA.js";
import { estimateStability } from "../engines/UltimateSpeedFeedEngine.js";

const REL_TOLERANCE = 1e-12;

/** Frozen pre-shim copy of UltimateSpeedFeedEngine.estimateStability() (HEAD~N).
 * NEVER edit to make a fixture pass — that defeats the anti-regression.
 */
function oldEstimateStability(
  rpm: number, z: number, Kc: number,
  k: number, fn: number, zeta: number, ap?: number,
): StabilityCompatResult {
  const omega_n = 2 * Math.PI * fn;
  const omega_c = omega_n * Math.sqrt(1 - zeta * zeta);
  const alpha_xx = 0.5;
  const r = omega_c / omega_n;
  const denom = (1 - r * r) * (1 - r * r) + (2 * zeta * r) * (2 * zeta * r);
  const G_real = (1 - r * r) / denom;
  // RE-BASELINED 2026-06-06 (oscar): corrected the 1e9 unit error that pinned
  // critical_doc at the 50 mm clamp for every stiffness (intentional divergence,
  // per the docblock's sanctioned re-baseline path). Frozen copy mirrors the live
  // StabilityLobeDiagram.stabilityEstimateCompat fix exactly so equivalence holds.
  const reG_mm_per_N = G_real / (k / 1000);
  const b_lim_mm = Math.min(50, Math.max(0.1, Math.abs(1 / (2 * Kc * alpha_xx * z * reG_mm_per_N))));
  let bestRPM: number | undefined;
  for (let lobe = 1; lobe <= 10; lobe++) {
    const epsilon = Math.atan2(2 * zeta * r, 1 - r * r);
    const N_sweet = (60 * omega_c) / (2 * Math.PI * (lobe + epsilon / (2 * Math.PI)) * z);
    if (N_sweet >= 1000 && N_sweet <= 20000) {
      bestRPM = Math.round(N_sweet);
      break;
    }
  }
  const margin = ap ? ((b_lim_mm - ap) / b_lim_mm) * 100 : 100;
  const roundSig = (n: number, sig: number): number => {
    if (n === 0) return 0;
    const d = Math.ceil(Math.log10(Math.abs(n)));
    const power = sig - d;
    const mag = Math.pow(10, power);
    return Math.round(n * mag) / mag;
  };
  return {
    critical_doc_mm: roundSig(b_lim_mm, 2),
    is_stable: ap ? ap < b_lim_mm : true,
    margin_pct: roundSig(Math.max(-100, margin), 1),
    best_rpm: bestRPM,
    chatter_freq_hz: roundSig(omega_c / (2 * Math.PI), 1),
  };
}

function assertEquivalent(a: StabilityCompatResult, b: StabilityCompatResult, label: string): void {
  // Use toBe (exact) for rounded values + best_rpm + is_stable
  expect(a.critical_doc_mm, `${label} critical_doc_mm`).toBe(b.critical_doc_mm);
  expect(a.is_stable, `${label} is_stable`).toBe(b.is_stable);
  expect(a.margin_pct, `${label} margin_pct`).toBe(b.margin_pct);
  expect(a.best_rpm, `${label} best_rpm`).toBe(b.best_rpm);
  expect(a.chatter_freq_hz, `${label} chatter_freq_hz`).toBe(b.chatter_freq_hz);
}

// Fixture grid: realistic VMC + lathe + finishing scenarios
const FIXTURES: Array<{ name: string; rpm: number; z: number; Kc: number; k: number; fn: number; zeta: number; ap?: number }> = [];
const Z_VALUES = [2, 4, 6];                              // 3 fluting variants
const KC_VALUES = [700, 1800, 2800];                     // ISO N / P / S
const K_VALUES = [1e7, 2e7, 4e7];                        // 10 / 20 / 40 MN/m
const FN_VALUES = [400, 800, 1600];                      // Hz
const ZETA_VALUES = [0.02, 0.05];                        // 2% and 5% damping
const AP_VALUES: (number | undefined)[] = [undefined, 0.5, 2.0, 5.0];

for (const z of Z_VALUES) {
  for (const Kc of KC_VALUES) {
    for (const k of K_VALUES) {
      for (const fn of FN_VALUES) {
        for (const zeta of ZETA_VALUES) {
          for (const ap of AP_VALUES) {
            FIXTURES.push({
              name: `z=${z},Kc=${Kc},k=${k.toExponential(0)},fn=${fn},ζ=${zeta},ap=${ap ?? "u"}`,
              rpm: 10000, // rpm unused inside the function — kept for signature compat
              z, Kc, k, fn, zeta, ap,
            });
          }
        }
      }
    }
  }
}

describe("Stability shim equivalence — SF-PSN-WIRE-MS0/U-SFPSN-04", () => {
  it(`module shim matches frozen inline across ${FIXTURES.length} fixtures`, () => {
    for (const f of FIXTURES) {
      const expected = oldEstimateStability(f.rpm, f.z, f.Kc, f.k, f.fn, f.zeta, f.ap);
      const actual = stabilityEstimateCompat(f.rpm, f.z, f.Kc, f.k, f.fn, f.zeta, f.ap);
      assertEquivalent(actual, expected, `module[${f.name}]`);
    }
    expect(FIXTURES.length).toBeGreaterThanOrEqual(100); // Z_VALUES × KC × K × FN × ZETA × AP
  });

  it(`engine delegate matches frozen inline across the same ${FIXTURES.length} fixtures`, () => {
    for (const f of FIXTURES) {
      const expected = oldEstimateStability(f.rpm, f.z, f.Kc, f.k, f.fn, f.zeta, f.ap);
      const actual = estimateStability(f.rpm, f.z, f.Kc, f.k, f.fn, f.zeta, f.ap);
      assertEquivalent(actual, expected, `engine[${f.name}]`);
    }
  });

  it("engine delegate === module shim (identity chain)", () => {
    for (const f of FIXTURES) {
      const viaEngine = estimateStability(f.rpm, f.z, f.Kc, f.k, f.fn, f.zeta, f.ap);
      const viaModule = stabilityEstimateCompat(f.rpm, f.z, f.Kc, f.k, f.fn, f.zeta, f.ap);
      expect(viaEngine.critical_doc_mm).toBe(viaModule.critical_doc_mm);
      expect(viaEngine.is_stable).toBe(viaModule.is_stable);
      expect(viaEngine.best_rpm).toBe(viaModule.best_rpm);
      expect(viaEngine.chatter_freq_hz).toBe(viaModule.chatter_freq_hz);
    }
  });

  describe("clamp + truthy-edge equivalence", () => {
    it("b_lim_mm clamps to 50mm ceiling for high-stiffness machines", () => {
      const expected = oldEstimateStability(10000, 4, 1800, 1e9, 200, 0.05);
      const actual = stabilityEstimateCompat(10000, 4, 1800, 1e9, 200, 0.05);
      expect(actual.critical_doc_mm).toBe(expected.critical_doc_mm);
      expect(actual.critical_doc_mm).toBeLessThanOrEqual(50);
    });

    it("b_lim_mm clamps to 0.1mm floor for low-stiffness machines", () => {
      const expected = oldEstimateStability(10000, 8, 2800, 1e4, 4000, 0.01);
      const actual = stabilityEstimateCompat(10000, 8, 2800, 1e4, 4000, 0.01);
      expect(actual.critical_doc_mm).toBe(expected.critical_doc_mm);
      expect(actual.critical_doc_mm).toBeGreaterThanOrEqual(0.1);
    });

    it("ap=0 takes the truthy-false branch (is_stable=true, margin=100)", () => {
      const expected = oldEstimateStability(10000, 4, 1800, 2e7, 800, 0.05, 0);
      const actual = stabilityEstimateCompat(10000, 4, 1800, 2e7, 800, 0.05, 0);
      expect(actual.is_stable).toBe(expected.is_stable);
      expect(actual.is_stable).toBe(true);
      expect(actual.margin_pct).toBe(expected.margin_pct);
      expect(actual.margin_pct).toBe(100);
    });

    it("ap=undefined matches ap=0 (both falsy)", () => {
      const undef = stabilityEstimateCompat(10000, 4, 1800, 2e7, 800, 0.05, undefined);
      const zero = stabilityEstimateCompat(10000, 4, 1800, 2e7, 800, 0.05, 0);
      expect(undef.is_stable).toBe(zero.is_stable);
      expect(undef.margin_pct).toBe(zero.margin_pct);
    });

    it("margin clamped at -100% for ap >> b_lim_mm", () => {
      // Force massive ap relative to weak system
      const r = stabilityEstimateCompat(10000, 8, 2800, 1e4, 4000, 0.01, 100);
      expect(r.margin_pct).toBeGreaterThanOrEqual(-100);
    });

    it("no sweet RPM in [1000, 20000] returns best_rpm=undefined", () => {
      // Pick fn very low so all lobes fall below 1000 rpm
      const r = stabilityEstimateCompat(10000, 4, 1800, 2e7, 50, 0.05);
      const expected = oldEstimateStability(10000, 4, 1800, 2e7, 50, 0.05);
      expect(r.best_rpm).toBe(expected.best_rpm);
      expect(r.best_rpm).toBeUndefined();
    });
  });

  describe("model identity preserved", () => {
    it("higher stiffness produces higher critical_doc (more rigid → cuts deeper before chatter)", () => {
      const lowK = stabilityEstimateCompat(10000, 4, 1800, 5e6, 800, 0.05);
      const highK = stabilityEstimateCompat(10000, 4, 1800, 5e8, 800, 0.05);
      expect(highK.critical_doc_mm).toBeGreaterThanOrEqual(lowK.critical_doc_mm);
    });

    it("chatter_freq_hz ≈ natural frequency for low damping (omega_c → omega_n as ζ→0)", () => {
      // For ζ=0.01, omega_c = omega_n * sqrt(1-0.0001) ≈ omega_n. Expect within 1% of fn=1000.
      const r = stabilityEstimateCompat(10000, 4, 1800, 2e7, 1000, 0.01);
      expect(typeof r.chatter_freq_hz).toBe("number");
      expect(Math.abs((r.chatter_freq_hz ?? 0) - 1000) / 1000).toBeLessThan(0.01);
    });

    it("higher Kc reduces critical depth (more cutting force → easier to chatter)", () => {
      const lowKc = stabilityEstimateCompat(10000, 4, 700, 2e7, 800, 0.05);
      const highKc = stabilityEstimateCompat(10000, 4, 2800, 2e7, 800, 0.05);
      expect(highKc.critical_doc_mm).toBeLessThanOrEqual(lowKc.critical_doc_mm);
    });
  });

  describe("composition registration — imports prove leverage rank", () => {
    it("StabilityLobeDiagram singleton is imported and exposes getMetadata", () => {
      const meta = StabilityLobeDiagram.getMetadata();
      expect(meta.id).toBe("stability_lobe_sdof");
      expect(meta.domain).toBe("stability");
    });

    it("FRFStabilityLobe class is imported (named export)", () => {
      expect(FRFStabilityLobe.name).toBe("FRFStabilityLobe");
      expect(typeof FRFStabilityLobe).toBe("function");
    });

    it("RCSA class is imported (named export)", () => {
      expect(RCSA.name).toBe("RCSA");
      expect(typeof RCSA).toBe("function");
    });
  });
});