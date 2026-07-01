/**
 * AmortizationScheduleFormula.test.ts — hotel iter12 / U-AMORTIZATION-FORMULA.
 * Reference cases cross-checked against canonical financial-math sources:
 *   - $100k / 30yr / 6% APR → $599.55/mo (Brigham & Houston Table 5-A, §5.3 Ex.5-3)
 *   - $200k / 15yr / 4% APR → $1,479.38/mo (mortgage-calculator industry standard)
 *   - Zero-interest reduction: PMT = P/n exactly
 *   - Depreciation $50k cost / $5k salvage / 10yr → $4500/yr SL (FASB ASC 360)
 */

import { describe, it, expect } from "vitest";
import {
  fixedPayment,
  amortizationSchedule,
  straightLineDepreciation,
  type AmortizationSchedule,
  type DepreciationSchedule,
} from "../algorithms/AmortizationScheduleFormula.js";

// ── Reference scenarios (cross-checked) ───────────────────────────────────
const MORTGAGE_100K_30Y_6PCT = {
  principal: 100_000,
  rate_annual: 0.06,
  n_periods: 360,
  periods_per_year: 12,
  expected_payment: 599.55,        // Brigham & Houston Table 5-A
};

const MORTGAGE_200K_15Y_4PCT = {
  principal: 200_000,
  rate_annual: 0.04,
  n_periods: 180,
  periods_per_year: 12,
  expected_payment: 1_479.38,      // industry-standard mortgage calc
};

const ZERO_INTEREST_1200_12MO = {
  principal: 1_200,
  rate_annual: 0,
  n_periods: 12,
  periods_per_year: 12,
  expected_payment: 100.00,        // P/n when r=0
};

const DEPREC_50K_5K_10YR = {
  cost: 50_000,
  salvage: 5_000,
  life_years: 10,
  expected_annual: 4_500,          // (50k - 5k) / 10
};

const PAYMENT_TOLERANCE_PCT = 0.0005; // ±0.05% on closed-form payment

// ─── fixedPayment ─────────────────────────────────────────────────────────

describe("fixedPayment — canonical reference cases", () => {
  it("$100k / 30yr / 6% APR → ≈$599.55/mo (±0.05%)", () => {
    const pmt = fixedPayment(
      MORTGAGE_100K_30Y_6PCT.principal,
      MORTGAGE_100K_30Y_6PCT.rate_annual / MORTGAGE_100K_30Y_6PCT.periods_per_year,
      MORTGAGE_100K_30Y_6PCT.n_periods,
    );
    const expected = MORTGAGE_100K_30Y_6PCT.expected_payment;
    expect(Math.abs(pmt - expected) / expected).toBeLessThan(PAYMENT_TOLERANCE_PCT);
  });

  it("$200k / 15yr / 4% APR → ≈$1,479.38/mo (±0.05%)", () => {
    const pmt = fixedPayment(
      MORTGAGE_200K_15Y_4PCT.principal,
      MORTGAGE_200K_15Y_4PCT.rate_annual / MORTGAGE_200K_15Y_4PCT.periods_per_year,
      MORTGAGE_200K_15Y_4PCT.n_periods,
    );
    const expected = MORTGAGE_200K_15Y_4PCT.expected_payment;
    expect(Math.abs(pmt - expected) / expected).toBeLessThan(PAYMENT_TOLERANCE_PCT);
  });

  it("zero-interest reduces to P/n exactly", () => {
    const pmt = fixedPayment(1_200, 0, 12);
    expect(pmt).toBe(100);
  });

  it("single-period loan: PMT covers principal + 1 period of interest", () => {
    const pmt = fixedPayment(1_000, 0.05, 1);
    // PMT = P * r / (1 - (1+r)^-1) = P * r * (1+r) / r = P * (1+r)
    expect(pmt).toBeCloseTo(1_050, 6);
  });
});

describe("fixedPayment — R12 fail-loud", () => {
  it("rejects NaN principal", () => {
    expect(() => fixedPayment(NaN, 0.005, 12)).toThrow(/finite/);
  });

  it("rejects negative principal", () => {
    expect(() => fixedPayment(-100, 0.005, 12)).toThrow(/> 0/);
  });

  it("rejects negative rate", () => {
    expect(() => fixedPayment(1000, -0.01, 12)).toThrow(/>= 0/);
  });

  it("rejects non-integer n_periods", () => {
    expect(() => fixedPayment(1000, 0.005, 12.5)).toThrow(/integer/);
  });

  it("rejects n_periods = 0", () => {
    expect(() => fixedPayment(1000, 0.005, 0)).toThrow(/> 0/);
  });

  it("rejects Infinity rate", () => {
    expect(() => fixedPayment(1000, Infinity, 12)).toThrow(/finite/);
  });
});

// ─── amortizationSchedule ─────────────────────────────────────────────────

describe("amortizationSchedule — ledger invariants (hotel-soul gate)", () => {
  it("$100k / 30yr / 6%: sum of principal_payments equals original principal exactly", () => {
    const s = amortizationSchedule(100_000, 0.06, 360, 12);
    const sum = s.rows.reduce((acc, r) => acc + r.principal_payment, 0);
    expect(Math.abs(sum - 100_000)).toBeLessThan(0.01);
  });

  it("rows count equals n_periods", () => {
    const s = amortizationSchedule(50_000, 0.05, 60, 12);
    expect(s.rows.length).toBe(60);
  });

  it("final-row remaining_balance is 0 (ledger fully paid)", () => {
    const s = amortizationSchedule(25_000, 0.045, 36, 12);
    expect(s.rows[s.rows.length - 1].remaining_balance).toBe(0);
  });

  it("interest_payment monotonically decreases (typical amortization curve)", () => {
    const s = amortizationSchedule(100_000, 0.06, 360, 12);
    for (let i = 1; i < s.rows.length; i++) {
      // Each interest payment is ≤ the previous (within floating-point)
      expect(s.rows[i].interest_payment).toBeLessThanOrEqual(s.rows[i - 1].interest_payment + 1e-6);
    }
  });

  it("principal_payment monotonically increases (typical amortization curve)", () => {
    const s = amortizationSchedule(100_000, 0.06, 360, 12);
    // Final-row residue absorption may distort the very last row by < $0.01 —
    // assert monotonicity only on rows 0..n-2 to keep the invariant clean.
    for (let i = 1; i < s.rows.length - 1; i++) {
      expect(s.rows[i].principal_payment).toBeGreaterThanOrEqual(s.rows[i - 1].principal_payment - 1e-6);
    }
  });

  it("total_paid = payment × n_periods (within rounding)", () => {
    const s = amortizationSchedule(50_000, 0.05, 60, 12);
    expect(s.total_paid).toBeCloseTo(s.payment * 60, 2);
  });

  it("total_interest = total_paid − principal", () => {
    const s = amortizationSchedule(50_000, 0.05, 60, 12);
    expect(s.total_interest).toBeCloseTo(s.total_paid - 50_000, 2);
  });
});

describe("amortizationSchedule — defaults + R12", () => {
  it("defaults periods_per_year to 12 (monthly)", () => {
    const s = amortizationSchedule(1_200, 0.06, 12);
    expect(s.periods_per_year).toBe(12);
    expect(s.rate_periodic).toBeCloseTo(0.06 / 12, 10);
  });

  it("rejects NaN rate_annual", () => {
    expect(() => amortizationSchedule(1000, NaN, 12)).toThrow(/finite/);
  });

  it("rejects negative principal", () => {
    expect(() => amortizationSchedule(-100, 0.05, 12)).toThrow(/> 0/);
  });
});

// ─── straightLineDepreciation ─────────────────────────────────────────────

describe("straightLineDepreciation — canonical FASB case", () => {
  it("$50k / $5k salvage / 10yr → $4500/yr × 10", () => {
    const s = straightLineDepreciation(
      DEPREC_50K_5K_10YR.cost,
      DEPREC_50K_5K_10YR.salvage,
      DEPREC_50K_5K_10YR.life_years,
    );
    expect(s.annual_depreciation).toBe(DEPREC_50K_5K_10YR.expected_annual);
    expect(s.rows.length).toBe(10);
    for (const row of s.rows) {
      expect(row.depreciation).toBeCloseTo(4_500, 2);
    }
  });

  it("final-year book_value equals salvage exactly", () => {
    const s = straightLineDepreciation(33_333.33, 1_234.56, 7);
    const last = s.rows[s.rows.length - 1];
    expect(last.book_value).toBeCloseTo(1_234.56, 2);
  });

  it("accumulated depreciation in final year = cost − salvage", () => {
    const s = straightLineDepreciation(80_000, 8_000, 5);
    const last = s.rows[s.rows.length - 1];
    expect(last.accumulated).toBeCloseTo(72_000, 2);
  });

  it("book_value monotonically decreases", () => {
    const s = straightLineDepreciation(100_000, 10_000, 8);
    for (let i = 1; i < s.rows.length; i++) {
      expect(s.rows[i].book_value).toBeLessThanOrEqual(s.rows[i - 1].book_value + 1e-6);
    }
  });

  it("zero-salvage case: book_value lands at 0", () => {
    const s = straightLineDepreciation(10_000, 0, 5);
    expect(s.annual_depreciation).toBe(2_000);
    expect(s.rows[4].book_value).toBe(0);
  });
});

describe("straightLineDepreciation — R12 fail-loud", () => {
  it("rejects salvage >= cost", () => {
    expect(() => straightLineDepreciation(10_000, 10_000, 5)).toThrow(/salvage.*< cost/);
  });

  it("rejects salvage > cost", () => {
    expect(() => straightLineDepreciation(10_000, 15_000, 5)).toThrow(/salvage.*< cost/);
  });

  it("rejects negative cost", () => {
    expect(() => straightLineDepreciation(-1, 0, 5)).toThrow(/> 0/);
  });

  it("rejects negative salvage", () => {
    expect(() => straightLineDepreciation(10_000, -100, 5)).toThrow(/>= 0/);
  });

  it("rejects life_years = 0", () => {
    expect(() => straightLineDepreciation(10_000, 1_000, 0)).toThrow(/> 0/);
  });

  it("rejects non-integer life_years", () => {
    expect(() => straightLineDepreciation(10_000, 1_000, 5.5)).toThrow(/integer/);
  });

  it("rejects NaN cost", () => {
    expect(() => straightLineDepreciation(NaN, 0, 5)).toThrow(/finite/);
  });
});
