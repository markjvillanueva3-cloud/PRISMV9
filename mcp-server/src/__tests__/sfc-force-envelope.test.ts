/**
 * sfc-force-envelope.test.ts
 * ============================================================================
 * Oscar task #17 (fz force-envelope half) — PRISM-SFC-PHYSICS-FIDELITY
 *
 * Asserts that UltimateSpeedFeedEngine cutting-force output obeys the Kienzle
 * size-effect invariants across the full feed-per-tooth (fz) envelope.
 *
 * PHYSICS BASIS (Kienzle, ISO 3685:1993):
 *   hex = fz   (milling at ae/Dc = 0.50 => immersionRatio = 0.5 => hex = fz exactly)
 *   Kc  = kc1_1 * hex^(-mc)          [specific cutting force, N/mm2]
 *   Fc  = Kc * ap * hex               [tangential cutting force, N]
 *      = kc1_1 * ap * fz^(1-mc)
 *   P   = Fc * Vc / 60000             [spindle power, kW]
 *
 * KEY INVARIANTS:
 *   I1. Fc strictly increases with fz  (exponent 1-mc > 0 for mc in [0.2,0.3])
 *   I2. Kc strictly decreases with fz  (size effect: kc proportional to fz^(-mc))
 *   I3. Fc growth is sub-linear: doubling fz raises Fc by factor ~2^(1-mc) < 2
 *   I4. Fc roughly doubles when ap doubles (at same fz)
 *   I5. Power tracks Fc at fixed Vc (P = Fc * Vc / 60000)
 *   I6. fz very small => Fc finite, positive, non-NaN, non-Infinity
 *   I7. fz very large => no NaN / Infinity / overflow in Fc
 *   I8. fz = 0 supplied => engine floors it (never returns NaN or Infinity)
 *   I9. fz negative => engine does not emit NaN or Infinity in Fc
 *
 * TEST SETUP:
 *   - ISO group P (steel): CANONICAL_KIENZLE P mc = 0.25, kc1_1 = 1800
 *   - ae/Dc = 50% => immersionRatio = 0.50 => hex_mm = fz (exact, no trig distortion)
 *   - Fixed Vc = 150 m/min (user-pinned via cutting_speed_mpm) to decouple force from
 *     speed inference. All fz cases hold Vc constant so power proportional to Fc exactly.
 *   - Tests call the real engine -- no mocks, no stubs.
 *   - All tests round-trip through calculate(), not kienzleCuttingForce() directly.
 *
 * NOTE ON Kc BACK-CALCULATION:
 *   The engine does not emit Kc as its own result field. We derive it as:
 *     Kc_derived = Fc / (ap * hex_mm)
 *   where hex_mm = fz (at 50% immersion, verified by engine source ~line 2387-2388).
 *   The rake correction in kienzleCuttingForce at rake=0 (engine default) equals 1.0,
 *   so Kc_derived = kc1_1 * fz^(-mc) (pure Kienzle, no correction distortion).
 *
 * @module __tests__/sfc-force-envelope
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  UltimateSpeedFeedEngine,
  type UltimateSpeedFeedInput,
  type UltimateSpeedFeedResult,
} from "../engines/UltimateSpeedFeedEngine.js";
import { CANONICAL_KIENZLE } from "../physics/constants.js";

// ============================================================================
// NAMED CONSTANTS (no magic literals in assertions -- CLAUDE.md anti-pattern rule)
// ============================================================================

/** beforeAll timeout: 11 engine calls x ~2.5s each + buffer. */
const BEFORE_ALL_TIMEOUT_MS = 180_000;

/** ISO P mc exponent from canonical constants (never inline). */
const MC_P = CANONICAL_KIENZLE.P.mc;  // 0.25

/** kc1_1 for ISO P from canonical constants. */
const KC1_1_P = CANONICAL_KIENZLE.P.kc1_1;  // 1800 N/mm2

/** Cutting speed (m/min) pinned via cutting_speed_mpm for all fixture calls. */
const VC_MPIN = 150;

/** Tool diameter (mm) for the sweep fixture. */
const TOOL_DIAM_MM = 12;

/** Radial engagement (% of diameter) -- 50% gives hex_mm = fz exactly. */
const RADIAL_PCT = 50;

/** Axial depth (mm) used for baseline calls. */
const AP_BASELINE_MM = 4;

/** Axial depth (mm) for the ap-doubling invariant (I4). */
const AP_DOUBLE_MM = 8;

/** Mid-point fz (mm/tooth) used for single-pair invariants. */
const FZ_MID_MM = 0.08;

/**
 * Expected Fc growth factor when fz doubles, derived from canonical mc.
 * Fc proportional to fz^(1-mc) => ratio = 2^(1-mc).
 * At mc=0.25: ratio = 2^0.75 ~= 1.6818 (strictly between 1 and 2).
 */
const EXPECTED_FC_DOUBLE_RATIO = Math.pow(2, 1 - MC_P);

// ============================================================================
// SHARED ENGINE INSTANCE
// ============================================================================

const eng = new UltimateSpeedFeedEngine();

// ============================================================================
// FIXTURE BUILDER
// ============================================================================

/**
 * Canonical baseline: ISO P steel, 50% radial (hex=fz), Vc pinned so fz is
 * the only free variable for the force/Kc sweep. ap=4mm, D=12mm, z=4 flutes.
 */
function makeInput(overrides: Partial<UltimateSpeedFeedInput> = {}): UltimateSpeedFeedInput {
  return {
    material: "steel",
    operation: "milling",
    cut_type: "roughing",
    tool_diameter_mm: TOOL_DIAM_MM,
    flutes: 4,
    // 50% radial: immersionRatio = 0.5 => hex_mm = fz (no trig)
    radial_depth_pct: RADIAL_PCT,
    axial_depth_mm: AP_BASELINE_MM,
    // Pin Vc so rpm/fz/Fc are deterministic across the fz sweep
    cutting_speed_mpm: VC_MPIN,
    // Skip telemetry side-effects in a test sweep
    fast_bulk: true,
    ...overrides,
  };
}

/** Extract tangential cutting force Fc [N] from a result. */
const getFc = (r: UltimateSpeedFeedResult): number => r.forces.tangential_force_N.value;

/** Extract required spindle power [kW] from a result. */
const getPkw = (r: UltimateSpeedFeedResult): number => r.power.required_power_kw.value;

/**
 * Back-calculate Kc [N/mm2] from Fc, ap, and hex (which equals fz at 50% immersion).
 * Kc_derived = Fc / (ap * hex) = Fc / (ap * fz).
 */
function derivedKc(r: UltimateSpeedFeedResult, fz_mm: number, ap_mm: number): number {
  // hex_mm = fz at immersionRatio = 0.5 (engine source line ~2387)
  const hex = fz_mm;
  return getFc(r) / (ap_mm * hex);
}

// ============================================================================
// PRE-COMPUTE SWEEP (memoised -- engine ~2.5s/call)
// ============================================================================

/**
 * Five fz values spanning the realistic milling envelope for a 12mm carbide
 * endmill in steel: 0.02 -> 0.04 -> 0.08 -> 0.12 -> 0.16 mm/tooth.
 * All held at ap=4mm, ae=6mm (50% of D12), Vc=150 m/min.
 */
const FZ_SWEEP_MM = [0.02, 0.04, 0.08, 0.12, 0.16] as const;

let sweepResults: UltimateSpeedFeedResult[] = [];
let rApNormal: UltimateSpeedFeedResult;
let rApDouble: UltimateSpeedFeedResult;
let rFzTiny: UltimateSpeedFeedResult;   // fz = 0.001 (near-zero edge case)
let rFzHuge: UltimateSpeedFeedResult;   // fz = 2.0 (very large, outside normal range)
let rFzZero: UltimateSpeedFeedResult;   // fz = 0 supplied (adversarial)
let rFzNeg: UltimateSpeedFeedResult;    // fz = -0.05 supplied (adversarial)

beforeAll(() => {
  // 5 sweep calls
  sweepResults = FZ_SWEEP_MM.map((fz) =>
    eng.calculate(makeInput({ feed_per_tooth_mm: fz }))
  );

  // ap-doubling pair at FZ_MID_MM
  rApNormal = eng.calculate(makeInput({ feed_per_tooth_mm: FZ_MID_MM, axial_depth_mm: AP_BASELINE_MM }));
  rApDouble = eng.calculate(makeInput({ feed_per_tooth_mm: FZ_MID_MM, axial_depth_mm: AP_DOUBLE_MM }));

  // Failure / adversarial modes (4 extra calls)
  rFzTiny = eng.calculate(makeInput({ feed_per_tooth_mm: 0.001 }));
  rFzHuge = eng.calculate(makeInput({ feed_per_tooth_mm: 2.0 }));
  rFzZero = eng.calculate(makeInput({ feed_per_tooth_mm: 0 }));
  rFzNeg  = eng.calculate(makeInput({ feed_per_tooth_mm: -0.05 }));
}, BEFORE_ALL_TIMEOUT_MS);

// ============================================================================
// TESTS
// ============================================================================

describe("SFC fz force-envelope — Kienzle invariants (oscar U#17)", () => {

  // --------------------------------------------------------------------------
  // I1: Fc strictly increases with fz
  // --------------------------------------------------------------------------
  it("I1: tangential_force_N is strictly monotonically increasing across the fz sweep", () => {
    // Fc = kc1_1 * ap * fz^(1-mc); exponent (1-mc)=0.75>0 so Fc must grow with fz.
    const forces = sweepResults.map(getFc);
    for (let i = 1; i < forces.length; i++) {
      expect(forces[i]).toBeGreaterThan(forces[i - 1]);
    }
    // At 8x fz increase (0.02->0.16): Fc ratio ~= 8^0.75 ~= 4.76 (mc=0.25)
    expect(forces[forces.length - 1]).toBeGreaterThan(forces[0] * 3.0);
  });

  // --------------------------------------------------------------------------
  // I2: Kc (derived) strictly decreases with fz (size effect)
  // --------------------------------------------------------------------------
  it("I2: derived specific cutting force Kc = Fc/(ap*fz) is strictly decreasing (Kienzle size effect)", () => {
    // Kc proportional to fz^(-mc): as fz grows the chip is thicker and less
    // energy-per-mm2 is needed. Monotonically decreasing is a hard invariant.
    const kcs = sweepResults.map((r, i) => derivedKc(r, FZ_SWEEP_MM[i], AP_BASELINE_MM));
    for (let j = 1; j < kcs.length; j++) {
      expect(kcs[j]).toBeLessThan(kcs[j - 1]);
    }
    // Every Kc must stay positive (never zero or negative across the whole range)
    kcs.forEach((kc) => {
      expect(kc).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // I3: Sub-linear Fc growth -- doubling fz raises Fc by 2^(1-mc), NOT 2x
  // --------------------------------------------------------------------------
  it("I3: doubling fz raises Fc by ~2^(1-mc) = 2^0.75 (sub-linear, confirmed via CANONICAL_KIENZLE.P.mc)", () => {
    // Use the 0.04->0.08 pair (exact 2x fz, index 1->2 in sweep).
    const fcLow  = getFc(sweepResults[1]);  // fz = 0.04
    const fcHigh = getFc(sweepResults[2]);  // fz = 0.08
    const ratio = fcHigh / fcLow;

    // Theoretical ratio = 2^(1-mc) = 2^0.75 ~= 1.6818 for mc=0.25.
    // Allow +/-15% tolerance to accommodate rake correction and the fact that
    // engine MATERIAL_DB["steel"].mc=0.26 differs slightly from CANONICAL_KIENZLE.P.mc=0.25.
    const TOL = 0.15;
    expect(ratio).toBeGreaterThan(EXPECTED_FC_DOUBLE_RATIO * (1 - TOL));
    expect(ratio).toBeLessThan(EXPECTED_FC_DOUBLE_RATIO * (1 + TOL));

    // Hard bounds: always sub-linear (< 2) and always growing (> 1)
    expect(ratio).toBeLessThan(2.0);
    expect(ratio).toBeGreaterThan(1.0);
  });

  // --------------------------------------------------------------------------
  // I4: Fc approximately doubles when ap doubles (Fc is linear in ap)
  // --------------------------------------------------------------------------
  it("I4: doubling ap at constant fz doubles Fc within +/-15% tolerance (Kienzle linear-ap law)", () => {
    // Kienzle: Fc = Kc * ap * hex -- linear in ap; Kc and hex unchanged.
    const fcNorm   = getFc(rApNormal);
    const fcDouble = getFc(rApDouble);
    const ratio = fcDouble / fcNorm;

    expect(ratio).toBeGreaterThan(1.85);
    expect(ratio).toBeLessThan(2.15);
  });

  // --------------------------------------------------------------------------
  // I5: Power tracks Fc at constant Vc  (P = Fc * Vc / 60000)
  // --------------------------------------------------------------------------
  it("I5: required_power_kw = tangential_force_N * Vc / 60000 within 5% across entire sweep", () => {
    sweepResults.forEach((r) => {
      const pExpected = getFc(r) * VC_MPIN / 60_000; // kW
      const pActual   = getPkw(r);
      // 5% tolerance covers Math.round(Fc) in the engine before the power formula.
      const relErr = Math.abs(pActual - pExpected) / pExpected;
      expect(relErr).toBeLessThan(0.05);
    });
  });

  // --------------------------------------------------------------------------
  // I6 (failure mode): fz very small => finite, positive, non-NaN Fc
  // --------------------------------------------------------------------------
  it("I6 (failure): fz=0.001 (near-zero) yields finite, positive, non-NaN tangential force", () => {
    const fc = getFc(rFzTiny);
    expect(Number.isFinite(fc)).toBe(true);
    expect(Number.isNaN(fc)).toBe(false);
    expect(fc).toBeGreaterThan(0);
    // Rough lower bound: kc1_1 * ap * fz_min = KC1_1_P * AP_BASELINE_MM * 0.001 = 7.2 N
    // (before rake correction etc.). Use half that as a conservative floor.
    expect(fc).toBeGreaterThan(KC1_1_P * AP_BASELINE_MM * 0.001 * 0.5);
  });

  // --------------------------------------------------------------------------
  // I7 (failure mode): fz very large => no NaN/Infinity, still physically ordered
  // --------------------------------------------------------------------------
  it("I7 (failure): fz=2.0 (extremely large) yields finite, positive Fc and Power -- no NaN/Infinity", () => {
    const fc = getFc(rFzHuge);
    const pw = getPkw(rFzHuge);

    expect(Number.isFinite(fc)).toBe(true);
    expect(Number.isNaN(fc)).toBe(false);
    expect(fc).toBeGreaterThan(0);

    expect(Number.isFinite(pw)).toBe(true);
    expect(Number.isNaN(pw)).toBe(false);
    expect(pw).toBeGreaterThan(0);

    // Very large fz must produce larger Fc than the middle of the normal sweep.
    expect(fc).toBeGreaterThan(getFc(sweepResults[2]));  // must beat fz=0.08
  });

  // --------------------------------------------------------------------------
  // I8 (adversarial): fz=0 supplied => engine floors it; Fc must be safe
  // --------------------------------------------------------------------------
  it("I8 (adversarial): fz=0 supplied -- engine floors/infers fz; Fc is finite, positive, non-NaN", () => {
    // Engine floors hex_mm at Math.max(0.01, ...) inside kienzleCuttingForce.
    // Whatever path is taken: result must not contain NaN, Infinity, or zero.
    const fc = getFc(rFzZero);
    expect(Number.isFinite(fc)).toBe(true);
    expect(Number.isNaN(fc)).toBe(false);
    expect(fc).toBeGreaterThan(0);
    // Power must also be non-degenerate
    expect(Number.isFinite(getPkw(rFzZero))).toBe(true);
    expect(getPkw(rFzZero)).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // I9 (adversarial): fz negative => engine does not propagate NaN/Infinity
  // --------------------------------------------------------------------------
  it("I9 (adversarial): fz=-0.05 supplied -- engine does not emit NaN or Infinity in Fc", () => {
    const fc = getFc(rFzNeg);
    expect(Number.isFinite(fc)).toBe(true);
    expect(Number.isNaN(fc)).toBe(false);
    expect(fc).toBeGreaterThan(0);
  });

  // --------------------------------------------------------------------------
  // I10: Kc at typical fz is in the physically plausible band for ISO P steel
  // --------------------------------------------------------------------------
  it("I10: derived Kc at fz=0.08mm is in the physical plausibility band for ISO P steel", () => {
    // CANONICAL_KIENZLE.P: kc1_1=1800, mc=0.25.
    // Theory: Kc = 1800 * 0.08^(-0.25) ~= 3203 N/mm2.
    // Physical range for carbon/alloy steel: 1500-6000 N/mm2 (Sandvik/Boothroyd-Knight).
    const kc = derivedKc(rApNormal, FZ_MID_MM, AP_BASELINE_MM);
    expect(kc).toBeGreaterThan(1500);
    expect(kc).toBeLessThan(6000);
  });

  // --------------------------------------------------------------------------
  // I11 (round-trip end-to-end): Kc ratio across 8x fz span matches theory
  // --------------------------------------------------------------------------
  it("I11 (round-trip): Kc at fz=0.16 vs fz=0.02 matches 2^(-4*mc) Kienzle prediction within 20%", () => {
    const kc_low  = derivedKc(sweepResults[0], FZ_SWEEP_MM[0], AP_BASELINE_MM); // fz=0.02
    const kc_high = derivedKc(sweepResults[4], FZ_SWEEP_MM[4], AP_BASELINE_MM); // fz=0.16

    // Hard monotonic bound: Kc decreases going from 0.02 to 0.16
    expect(kc_high).toBeLessThan(kc_low);

    // Theoretical ratio: (0.02/0.16)^mc = (1/8)^0.25 ~= 0.595
    // For mc in [0.20, 0.30]: ratio in [0.53, 0.67].
    // Allow +/-20% to cover MATERIAL_DB mc=0.26 vs canonical mc=0.25.
    const measuredRatio = kc_high / kc_low;
    const theoreticalRatio = Math.pow(FZ_SWEEP_MM[0] / FZ_SWEEP_MM[4], MC_P);
    const TOL = 0.20;
    expect(measuredRatio).toBeGreaterThan(theoreticalRatio * (1 - TOL));
    expect(measuredRatio).toBeLessThan(theoreticalRatio * (1 + TOL));
  });
});
