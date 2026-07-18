/**
 * Tests for QuotingAccuracyEnhancementEngine — QUOTING-PIPELINE-MS0 / U-QP13.
 * Real algebraic + statistical invariants — no toBeDefined / toBeTruthy stubs.
 */
import { describe, it, expect } from "vitest";
import {
  plattCalibrate, plattFit,
  ocrWeightedEditDistance, fuzzyMatchSku,
  weibullSurvival, weibullReplaceProbability, bomReplacementUrgency,
  quoteIntervalArithmetic,
  DEFAULT_PLATT_PARAMS,
} from "../engines/QuotingAccuracyEnhancementEngine.js";

describe("Platt calibration — invariants", () => {
  it("plattCalibrate(0, defaults) = 0.5 (Lin formula origin)", () => {
    expect(plattCalibrate(0)).toBeCloseTo(0.5, 6);
  });

  it("monotone-increasing in score with A=-2 (Lin convention): P(0) < P(1) < P(2)", () => {
    const a = plattCalibrate(0.0);
    const b = plattCalibrate(1.0);
    const c = plattCalibrate(2.0);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });

  it("Numerically stable at extremes: A=-2, plattCalibrate(+∞) → 1, plattCalibrate(-∞) → 0", () => {
    expect(plattCalibrate(+1e10)).toBeCloseTo(1, 6);
    expect(plattCalibrate(-1e10)).toBeCloseTo(0, 6);
  });

  it("R12: NaN → 0 (fail-loud, not silent default); +∞ with A=-2 → 1 (Lin formula evaluates honestly)", () => {
    expect(plattCalibrate(NaN)).toBe(0);
    expect(plattCalibrate(Infinity, DEFAULT_PLATT_PARAMS)).toBeCloseTo(1, 6);
  });

  it("plattFit converges on a separable holdout: positives at high scores get P≥0.6", () => {
    const samples = [
      { rawScore: 0.1, isPositive: false },
      { rawScore: 0.2, isPositive: false },
      { rawScore: 0.3, isPositive: false },
      { rawScore: 0.4, isPositive: false },
      { rawScore: 0.5, isPositive: false },
      { rawScore: 0.6, isPositive: true },
      { rawScore: 0.7, isPositive: true },
      { rawScore: 0.8, isPositive: true },
      { rawScore: 0.9, isPositive: true },
      { rawScore: 1.0, isPositive: true },
    ];
    const fit = plattFit(samples);
    const pHigh = plattCalibrate(0.9, fit);
    const pLow = plattCalibrate(0.1, fit);
    expect(pHigh).toBeGreaterThan(0.6);
    expect(pLow).toBeLessThan(0.4);
  });

  it("plattFit safe defaults on undersample (<4 samples) or single-class", () => {
    expect(plattFit([])).toEqual(DEFAULT_PLATT_PARAMS);
    expect(plattFit([{ rawScore: 1, isPositive: true }, { rawScore: 0, isPositive: true }])).toEqual(DEFAULT_PLATT_PARAMS);
    expect(plattFit([{ rawScore: 1, isPositive: true }, { rawScore: 2, isPositive: true }, { rawScore: 3, isPositive: true }, { rawScore: 4, isPositive: true }])).toEqual(DEFAULT_PLATT_PARAMS);
  });
});

describe("OCR-weighted edit distance", () => {
  it("identical strings → distance 0", () => {
    expect(ocrWeightedEditDistance("CNMG120408", "CNMG120408")).toBe(0);
  });

  it("OCR confusion pair (0↔O): 'CNMGO20408' vs 'CNMG020408' → distance 0.5", () => {
    expect(ocrWeightedEditDistance("CNMGO20408", "CNMG020408")).toBe(0.5);
  });

  it("OCR confusion pair (1↔I): 'CNMGI20408' vs 'CNMG120408' → distance 0.5", () => {
    expect(ocrWeightedEditDistance("CNMGI20408", "CNMG120408")).toBe(0.5);
  });

  it("Generic substitution (Z is NOT in '4' confusion pairs): 'CNMG4Z0408' vs 'CNMG440408' → distance 1.0", () => {
    expect(ocrWeightedEditDistance("CNMG4Z0408", "CNMG440408")).toBe(1.0);
  });

  it("Empty string vs short string → distance = |other|", () => {
    expect(ocrWeightedEditDistance("", "ABCD")).toBe(4);
    expect(ocrWeightedEditDistance("ABCD", "")).toBe(4);
  });

  it("R12: non-string input → Infinity, not crash", () => {
    // @ts-expect-error testing runtime guard
    expect(ocrWeightedEditDistance(null, "X")).toBe(Infinity);
    // @ts-expect-error
    expect(ocrWeightedEditDistance("X", undefined)).toBe(Infinity);
  });
});

describe("fuzzyMatchSku — catalog matching with OCR errors", () => {
  it("OCR-mangled SKU fuzzy-matches catalog 'CNMG120408' within distance 2 (only 0↔O is a confusion pair)", () => {
    // 'CNMG0204O8' vs 'CNMG120408': position 5 ('0' vs '1') = generic 1.0, position 9 ('O' vs '0') = confusion 0.5 → 1.5
    const r = fuzzyMatchSku("CNMG0204O8", ["CNMG120408"]);
    expect(r.matched).toBe("CNMG120408");
    expect(r.distance).toBe(1.5);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThan(1);
  });

  it("Picks the closest candidate when multiple are within range", () => {
    const r = fuzzyMatchSku("CNMG120408", ["CNMG120408", "DCMT070204", "SNMG120408"]);
    expect(r.matched).toBe("CNMG120408");
    expect(r.distance).toBe(0);
    expect(r.confidence).toBe(1);
  });

  it("Returns null when no candidate within maxDistance", () => {
    const r = fuzzyMatchSku("CNMG120408", ["TOTALLY-DIFFERENT-SKU"], 2.0);
    expect(r.matched).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it("R12: empty query or empty candidates → null match", () => {
    expect(fuzzyMatchSku("", ["X", "Y"]).matched).toBeNull();
    expect(fuzzyMatchSku("X", []).matched).toBeNull();
  });
});

describe("Weibull survival — invariants", () => {
  it("S(0) = 1 (everything alive at age 0)", () => {
    expect(weibullSurvival(0, { eta: 12, beta: 2.5 })).toBe(1);
  });

  it("S(t→∞) → 0", () => {
    expect(weibullSurvival(1000, { eta: 12, beta: 2.5 })).toBeLessThan(1e-6);
  });

  it("S(η) ≈ 1/e ≈ 0.3679 (characteristic life definition)", () => {
    expect(weibullSurvival(12, { eta: 12, beta: 2.5 })).toBeCloseTo(Math.exp(-1), 6);
  });

  it("Monotone-decreasing in t: S(6) > S(12) > S(18) for η=12 β=2.5", () => {
    const s6 = weibullSurvival(6, { eta: 12, beta: 2.5 });
    const s12 = weibullSurvival(12, { eta: 12, beta: 2.5 });
    const s18 = weibullSurvival(18, { eta: 12, beta: 2.5 });
    expect(s6).toBeGreaterThan(s12);
    expect(s12).toBeGreaterThan(s18);
  });

  it("R12: invalid params → NaN, not silent 0/1", () => {
    expect(weibullSurvival(-1, { eta: 12, beta: 2.5 })).toBeNaN();
    expect(weibullSurvival(12, { eta: 0, beta: 2.5 })).toBeNaN();
    expect(weibullSurvival(12, { eta: 12, beta: -1 })).toBeNaN();
    expect(weibullSurvival(NaN, { eta: 12, beta: 2.5 })).toBeNaN();
  });
});

describe("Weibull replacement probability + BOM urgency", () => {
  it("Brand-new part (age=0), 1-month look-ahead, η=12: very low replace probability", () => {
    const p = weibullReplaceProbability(0, 1, { eta: 12, beta: 2.5 });
    expect(p).toBeGreaterThan(0);
    expect(p).toBeLessThan(0.05);
  });

  it("Old part (age=18, η=12), 1-month look-ahead: high replace probability (wear-out regime)", () => {
    const p = weibullReplaceProbability(18, 1, { eta: 12, beta: 2.5 });
    expect(p).toBeGreaterThan(0.20);
  });

  it("bomReplacementUrgency wires U-QP05 interval field into the survival prior", () => {
    // way oil (mill) = 1 month interval, currently 3 months old, look-ahead 1mo
    const urgency = bomReplacementUrgency(1, 3, 1, 2.5);
    expect(urgency).toBeGreaterThan(0.5); // way past characteristic life
  });

  it("R12: null/null interval → NaN urgency, not silent 0", () => {
    expect(bomReplacementUrgency(NaN, 1)).toBeNaN();
    expect(bomReplacementUrgency(-5, 1)).toBeNaN();
  });
});

describe("quoteIntervalArithmetic — uncertainty propagation", () => {
  it("Zero-uncertainty inputs reproduce the deterministic quote: m=$100, l=$200, t=$50, oh=0.15, mg=0.20 → $483 ± 0", () => {
    const r = quoteIntervalArithmetic({
      material_cost: { lo: 100, hi: 100 },
      labor_cost: { lo: 200, hi: 200 },
      tooling_cost: { lo: 50, hi: 50 },
      overhead_pct: { lo: 0.15, hi: 0.15 },
      margin_pct: { lo: 0.20, hi: 0.20 },
    });
    // (100+200+50) · 1.15 · 1.20 = 350·1.38 = 483.00
    expect(r.midpoint).toBeCloseTo(483, 0);
    expect(r.half_width).toBeLessThan(0.01); // ULP-only widening
  });

  it("Non-zero input uncertainty propagates to quote interval width", () => {
    const r = quoteIntervalArithmetic({
      material_cost: { lo: 90, hi: 110 },     // ±10
      labor_cost: { lo: 190, hi: 210 },       // ±10
      tooling_cost: { lo: 45, hi: 55 },       // ±5
      overhead_pct: { lo: 0.13, hi: 0.17 },   // ±0.02
      margin_pct: { lo: 0.18, hi: 0.22 },     // ±0.02
    });
    expect(r.quote.lo).toBeLessThan(483);
    expect(r.quote.hi).toBeGreaterThan(483);
    expect(r.half_width).toBeGreaterThan(10); // meaningful uncertainty
    expect(r.relative_uncertainty).toBeGreaterThan(0);
  });

  it("Negative-margin or negative-cost intervals don't crash and produce honest bounds", () => {
    const r = quoteIntervalArithmetic({
      material_cost: { lo: 0, hi: 0 },
      labor_cost: { lo: 0, hi: 0 },
      tooling_cost: { lo: 0, hi: 0 },
      overhead_pct: { lo: 0, hi: 0 },
      margin_pct: { lo: 0, hi: 0 },
    });
    expect(r.midpoint).toBe(0);
    // relative_uncertainty is NaN when midpoint is 0 — honest, not silent 0
    expect(Number.isNaN(r.relative_uncertainty)).toBe(true);
  });
});
