/**
 * BidWinCalibratorEngine.test.ts — HOTEL/U-BID-WIN-CALIBRATOR (iter14)
 *
 * Axis D logistic markup optimizer. Tests cover: outcome recording, IRLS calibration,
 * monotonicity invariants (higher markup → lower P(win)), markup optimization,
 * R12 fail-loud rejection, hotel-soul invariants.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { bidWinCalibratorEngine } from "../engines/BidWinCalibratorEngine.js";

/**
 * Synthetic-but-realistic outcome generator. Models a shop where:
 *   - higher markup makes wins less likely (logistic dropoff around 40%)
 *   - tier-1 customers (anchor accounts) bid less aggressively, accept higher markup
 *   - large-qty orders are MORE competitive (more vendors), markup pressure
 *
 * Generates a balanced wins/losses set so logistic regression can fit.
 */
function seedRealisticOutcomes(): void {
  // Deterministic pseudo-random — Mulberry32 for reproducibility.
  let s = 0x9e3779b9;
  const rand = () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  // True latent model: z = 2.0 - 6.0*markup + 1.5*tier + 0.6*log10(qty)
  // Anchor (tier=0.9, qty=1, markup=0.25): z = 2 - 1.5 + 1.35 + 0 = 1.85, p≈0.86
  // Cold (tier=0.1, qty=100, markup=0.50): z = 2 - 3 + 0.15 + 1.2 = 0.35, p≈0.59
  // Cold (tier=0.1, qty=100, markup=0.80): z = 2 - 4.8 + 0.15 + 1.2 = -1.45, p≈0.19
  for (let i = 0; i < 80; i++) {
    const tier = rand();
    const qty = Math.max(1, Math.round(rand() * 500));
    const markup = 0.10 + rand() * 0.70; // 10%-80%
    const z = 2.0 - 6.0 * markup + 1.5 * tier + 0.6 * Math.log10(qty);
    const pTrue = 1 / (1 + Math.exp(-z));
    const won = rand() < pTrue;
    bidWinCalibratorEngine.recordOutcome({
      quote_id: `Q-${i}`,
      customer_tier_score: tier,
      quantity: qty,
      cost_estimate_cents: 50_000 + Math.round(rand() * 1_000_000), // $500-$10,500
      markup_pct: markup,
      won,
    });
  }
}

describe("BidWinCalibratorEngine", () => {
  beforeEach(() => bidWinCalibratorEngine.reset());

  describe("recordOutcome — input validation (R12 fail-loud)", () => {
    it("accepts a valid outcome", () => {
      const o = bidWinCalibratorEngine.recordOutcome({
        quote_id: "Q-001",
        customer_tier_score: 0.7,
        quantity: 25,
        cost_estimate_cents: 120_000,
        markup_pct: 0.35,
        won: true,
      });
      expect(o.outcome_id).toMatch(/^BWO-\d{6}$/);
      expect(o.won).toBe(true);
    });

    it("throws on missing quote_id", () => {
      expect(() =>
        bidWinCalibratorEngine.recordOutcome({
          quote_id: "",
          customer_tier_score: 0.5,
          quantity: 1,
          cost_estimate_cents: 1000,
          markup_pct: 0.3,
          won: false,
        }),
      ).toThrow(/quote_id required/);
    });

    it("throws on zero cost (financial-invariant gate)", () => {
      expect(() =>
        bidWinCalibratorEngine.recordOutcome({
          quote_id: "Q-x",
          customer_tier_score: 0.5,
          quantity: 1,
          cost_estimate_cents: 0,
          markup_pct: 0.3,
          won: false,
        }),
      ).toThrow(/cost_estimate_cents must be ≥1/);
    });

    it("throws on out-of-range tier_score", () => {
      expect(() =>
        bidWinCalibratorEngine.recordOutcome({
          quote_id: "Q-y",
          customer_tier_score: 1.5,
          quantity: 1,
          cost_estimate_cents: 1000,
          markup_pct: 0.3,
          won: false,
        }),
      ).toThrow(/customer_tier_score must be in/);
    });

    it("throws on insane markup", () => {
      expect(() =>
        bidWinCalibratorEngine.recordOutcome({
          quote_id: "Q-z",
          customer_tier_score: 0.5,
          quantity: 1,
          cost_estimate_cents: 1000,
          markup_pct: 7.0,
          won: false,
        }),
      ).toThrow(/markup_pct .* outside sane range/);
    });
  });

  describe("calibrate — IRLS Newton-Raphson", () => {
    it("R12 throws when <20 outcomes", () => {
      for (let i = 0; i < 5; i++) {
        bidWinCalibratorEngine.recordOutcome({
          quote_id: `Q-${i}`,
          customer_tier_score: 0.5,
          quantity: 10,
          cost_estimate_cents: 10_000,
          markup_pct: 0.30,
          won: i % 2 === 0,
        });
      }
      expect(() => bidWinCalibratorEngine.calibrate()).toThrow(/need ≥20 outcomes/);
    });

    it("R12 throws when all outcomes are wins (separation)", () => {
      for (let i = 0; i < 25; i++) {
        bidWinCalibratorEngine.recordOutcome({
          quote_id: `Q-${i}`,
          customer_tier_score: 0.9,
          quantity: 1,
          cost_estimate_cents: 10_000,
          markup_pct: 0.10,
          won: true,
        });
      }
      expect(() => bidWinCalibratorEngine.calibrate()).toThrow(/need both wins and losses/);
    });

    it("converges on realistic data and recovers correct sign pattern", () => {
      seedRealisticOutcomes();
      const model = bidWinCalibratorEngine.calibrate();
      // β_markup must be NEGATIVE (higher markup → lower P(win))
      expect(model.beta_markup).toBeLessThan(0);
      // β_tier must be POSITIVE (better relationship → higher P(win))
      expect(model.beta_tier).toBeGreaterThan(0);
      // Training count
      expect(model.training_n).toBe(80);
      // Log-likelihood is negative but finite
      expect(model.log_likelihood).toBeLessThan(0);
      expect(Number.isFinite(model.log_likelihood)).toBe(true);
    });
  });

  describe("predictWin — monotonicity + value bounds", () => {
    beforeEach(() => {
      seedRealisticOutcomes();
      bidWinCalibratorEngine.calibrate();
    });

    it("returns p_win in [0, 1]", () => {
      const p = bidWinCalibratorEngine.predictWin({
        markup_pct: 0.35,
        tier_score: 0.5,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      expect(p.p_win).toBeGreaterThanOrEqual(0);
      expect(p.p_win).toBeLessThanOrEqual(1);
    });

    it("monotonicity — P(win) decreases as markup increases", () => {
      const lo = bidWinCalibratorEngine.predictWin({
        markup_pct: 0.15,
        tier_score: 0.5,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      const mid = bidWinCalibratorEngine.predictWin({
        markup_pct: 0.40,
        tier_score: 0.5,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      const hi = bidWinCalibratorEngine.predictWin({
        markup_pct: 0.90,
        tier_score: 0.5,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      expect(lo.p_win).toBeGreaterThan(mid.p_win);
      expect(mid.p_win).toBeGreaterThan(hi.p_win);
    });

    it("monotonicity — P(win) increases as tier improves", () => {
      const cold = bidWinCalibratorEngine.predictWin({
        markup_pct: 0.40,
        tier_score: 0.1,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      const anchor = bidWinCalibratorEngine.predictWin({
        markup_pct: 0.40,
        tier_score: 0.95,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      expect(anchor.p_win).toBeGreaterThan(cold.p_win);
    });

    it("expected_contribution_cents = round(p_win × markup × cost)", () => {
      const cost = 100_000;
      const markup = 0.25;
      const p = bidWinCalibratorEngine.predictWin({
        markup_pct: markup,
        tier_score: 0.5,
        quantity: 10,
        cost_estimate_cents: cost,
      });
      const expected = Math.round(p.p_win * markup * cost);
      expect(p.expected_contribution_cents).toBe(expected);
    });

    it("R12 throws if not calibrated", () => {
      bidWinCalibratorEngine.reset();
      expect(() =>
        bidWinCalibratorEngine.predictWin({
          markup_pct: 0.3,
          tier_score: 0.5,
          quantity: 1,
          cost_estimate_cents: 1000,
        }),
      ).toThrow(/must calibrate\(\) first/);
    });
  });

  describe("optimalMarkup — grid search over markup range", () => {
    beforeEach(() => {
      seedRealisticOutcomes();
      bidWinCalibratorEngine.calibrate();
    });

    it("finds a markup within the search range", () => {
      const opt = bidWinCalibratorEngine.optimalMarkup({
        tier_score: 0.5,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      expect(opt.markup_pct).toBeGreaterThanOrEqual(0.05);
      expect(opt.markup_pct).toBeLessThanOrEqual(1.0);
      expect(opt.expected_contribution_cents).toBeGreaterThan(0);
    });

    it("returns top-5 alternatives sorted descending by expected contribution", () => {
      const opt = bidWinCalibratorEngine.optimalMarkup({
        tier_score: 0.5,
        quantity: 50,
        cost_estimate_cents: 200_000,
      });
      expect(opt.alternatives.length).toBe(5);
      for (let i = 1; i < opt.alternatives.length; i++) {
        expect(opt.alternatives[i].expected_contribution_cents).toBeLessThanOrEqual(
          opt.alternatives[i - 1].expected_contribution_cents,
        );
      }
    });

    it("variability — anchor accounts get higher recommended markup than cold leads", () => {
      const cold = bidWinCalibratorEngine.optimalMarkup({
        tier_score: 0.05,
        quantity: 100,
        cost_estimate_cents: 200_000,
      });
      const anchor = bidWinCalibratorEngine.optimalMarkup({
        tier_score: 0.95,
        quantity: 100,
        cost_estimate_cents: 200_000,
      });
      // Tier coefficient is positive → anchor accounts tolerate ≥ cold leads' markup
      expect(anchor.markup_pct).toBeGreaterThanOrEqual(cold.markup_pct);
      // And expected contribution dominates
      expect(anchor.expected_contribution_cents).toBeGreaterThan(cold.expected_contribution_cents);
    });

    it("R12 throws on invalid range", () => {
      expect(() =>
        bidWinCalibratorEngine.optimalMarkup({
          tier_score: 0.5,
          quantity: 10,
          cost_estimate_cents: 1000,
          lo: 0.5,
          hi: 0.3,
        }),
      ).toThrow(/invalid range/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned outcome + model are frozen", () => {
      seedRealisticOutcomes();
      const model = bidWinCalibratorEngine.calibrate();
      expect(Object.isFrozen(model)).toBe(true);
      const fromGetter = bidWinCalibratorEngine.getModel();
      expect(fromGetter && Object.isFrozen(fromGetter)).toBe(true);
    });

    it("PII-free — only opaque IDs and numeric scores", () => {
      const o = bidWinCalibratorEngine.recordOutcome({
        quote_id: "Q-XYZ",
        customer_tier_score: 0.5,
        quantity: 1,
        cost_estimate_cents: 1000,
        markup_pct: 0.3,
        won: false,
      });
      const keys = Object.keys(o);
      expect(keys).not.toContain("customer_name");
      expect(keys).not.toContain("contact_email");
      expect(keys).not.toContain("ssn");
    });

    it("outcomeCount tracks insertions", () => {
      expect(bidWinCalibratorEngine.outcomeCount()).toBe(0);
      bidWinCalibratorEngine.recordOutcome({
        quote_id: "Q-1",
        customer_tier_score: 0.5,
        quantity: 1,
        cost_estimate_cents: 1000,
        markup_pct: 0.3,
        won: true,
      });
      expect(bidWinCalibratorEngine.outcomeCount()).toBe(1);
    });
  });
});
