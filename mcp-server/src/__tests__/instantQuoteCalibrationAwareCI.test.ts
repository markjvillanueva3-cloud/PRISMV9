/**
 * instantQuoteCalibrationAwareCI.test.ts -- U-QP-CI-CALIBRATION-AWARE (slot:charlie).
 *
 * The CI95 band on an instant quote was built PURELY from static AACE 18R-97 CV
 * constants -- blind to the closed-loop's real measured error. So a quote could
 * report a tight theoretical +/- band while the model was historically off by ~45%
 * (the most dangerous kind of false confidence). This unit floors the per-part
 * sigma at the calibrator's observed-MAPE-implied sigma, so the band NEVER claims
 * more confidence than the real quote-vs-actual history supports (R12 honest band).
 *
 * Tests are reference-value (R9): the pure floor math is verified against exact
 * computed values, and the integration path proves the band only ever WIDENS.
 */
import { describe, it, expect } from "vitest";
import {
  computeObservedSigma,
  instantQuoteEngine,
  type InstantQuoteInput,
} from "../engines/InstantQuoteEngine.js";

const Z_95 = 1.96; // mirrors the engine constant; the math below depends on it

// ---------------------------------------------------------------------------
// computeObservedSigma -- the pure calibration-aware floor (reference values)
// ---------------------------------------------------------------------------

describe("computeObservedSigma -- observed-MAPE-implied per-part sigma", () => {
  it("45% MAPE on a $100 part -> sigma = (0.45/1.96)*100 (reference value)", () => {
    const sigma = computeObservedSigma(45, 100);
    expect(sigma).toBeCloseTo((45 / 100 / Z_95) * 100, 6); // ~22.959
    expect(sigma).toBeCloseTo(22.9591837, 4);
  });

  it("scales linearly with unit price (10% MAPE: $200 sigma is 2x the $100 sigma)", () => {
    const s100 = computeObservedSigma(10, 100);
    const s200 = computeObservedSigma(10, 200);
    expect(s200).toBeCloseTo(2 * s100, 6);
    expect(s100).toBeCloseTo((10 / 100 / Z_95) * 100, 6); // ~5.102
  });

  it("scales linearly with MAPE (90% sigma is exactly 2x the 45% sigma)", () => {
    expect(computeObservedSigma(90, 100)).toBeCloseTo(2 * computeObservedSigma(45, 100), 6);
  });

  // ---- failure / degraded-data modes: must return 0 (theory band stands) ----
  it("null/undefined MAPE -> 0 (no calibration data, theory only)", () => {
    expect(computeObservedSigma(null, 100)).toBe(0);
    expect(computeObservedSigma(undefined, 100)).toBe(0);
  });

  it("zero or negative MAPE -> 0 (never narrows; safe direction)", () => {
    expect(computeObservedSigma(0, 100)).toBe(0);
    expect(computeObservedSigma(-5, 100)).toBe(0);
  });

  it("non-positive unit price -> 0 (cannot floor a $0 / negative band)", () => {
    expect(computeObservedSigma(45, 0)).toBe(0);
    expect(computeObservedSigma(45, -10)).toBe(0);
  });

  // ---- adversarial inputs ----
  it("NaN / Infinity MAPE or price -> 0 (never propagates a poisoned band)", () => {
    expect(computeObservedSigma(NaN, 100)).toBe(0);
    expect(computeObservedSigma(Infinity, 100)).toBe(0);
    expect(computeObservedSigma(45, NaN)).toBe(0);
    expect(computeObservedSigma(45, Infinity)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Integration: a high observed MAPE WIDENS the CI95 band on a real quote
// ---------------------------------------------------------------------------

const BASE: InstantQuoteInput = {
  part_name: "CI-CAL-TEST",
  material: "AL6061",
  quantity: 10,
  stock_dimensions_mm: { length: 50, width: 50, height: 25 },
};

describe("InstantQuoteEngine.quote -- CI95 is calibration-aware", () => {
  // The theory-only baselines pin observed_mape_pct: 0 so they are HERMETIC -- a bare
  // quote(BASE) now self-populates from the live training-status file (U-QP-LIVE-MAPE-FEED),
  // so an explicit 0 (which computeObservedSigma maps to sigma 0 -> theory stands) keeps
  // these baselines independent of production state, never flaking on a future live MAPE.
  it("a large observed MAPE produces a WIDER CI95 than theory-only", () => {
    const theoryOnly = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 0 });
    const calibrated = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 60 });

    // Same center price (the floor only touches the band, never the point estimate).
    expect(calibrated.unit_price).toBeCloseTo(theoryOnly.unit_price, 2);

    const theoryWidth = theoryOnly.ci95_high - theoryOnly.ci95_low;
    const calWidth = calibrated.ci95_high - calibrated.ci95_low;
    // A 60% MAPE is far larger than the static CVs (max 25%), so it must widen.
    expect(calWidth).toBeGreaterThan(theoryWidth);
    expect(calibrated.ci95_high).toBeGreaterThan(theoryOnly.ci95_high);
  });

  it("a tiny observed MAPE does NOT narrow the band (floor never shrinks theory)", () => {
    const theoryOnly = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 0 });
    // 0.001% MAPE implies a sigma far below the theoretical band -> max() keeps theory.
    const calibrated = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 0.001 });
    const theoryWidth = theoryOnly.ci95_high - theoryOnly.ci95_low;
    const calWidth = calibrated.ci95_high - calibrated.ci95_low;
    expect(calWidth).toBeCloseTo(theoryWidth, 2);
  });

  it("null observed MAPE is identical to omitting it (both take the same resolution path)", () => {
    // Both forms leave observed_mape_pct == null, so both self-populate from the same live
    // feed in the same run -> they must agree regardless of what the live file says. This is
    // hermetic by construction (the two sides share whatever the live state is), so it stays
    // bare on purpose: it verifies null and absent are treated identically.
    const omitted = instantQuoteEngine.quote(BASE);
    const nulled = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: null });
    expect(nulled.ci95_low).toBeCloseTo(omitted.ci95_low, 2);
    expect(nulled.ci95_high).toBeCloseTo(omitted.ci95_high, 2);
  });

  it("when the band is widened by calibration, a confidence_factor surfaces the MAPE", () => {
    const calibrated = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 60 });
    const hasBandNote = calibrated.confidence_factors.some((f) =>
      /observed quote-vs-actual error/i.test(f) && /MAPE/i.test(f),
    );
    expect(hasBandNote).toBe(true);
  });

  it("widened band lowers the confidence score (honest: more measured error = less confident)", () => {
    const theoryOnly = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 0 });
    const calibrated = instantQuoteEngine.quote({ ...BASE, observed_mape_pct: 60 });
    expect(calibrated.confidence).toBeLessThanOrEqual(theoryOnly.confidence);
  });
});
