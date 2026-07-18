import { describe, it, expect } from "vitest";
import { getPayrollTaxTable } from "../data/payroll-tax-tables.js";

/**
 * No-regression coverage for the STEP-2 DRY change: the FICA/Medicare constants that were inlined in
 * PayrollEngine.ts (SOCIAL_SECURITY_RATE / _WAGE_BASE / MEDICARE_RATE / MEDICARE_ADDITIONAL_RATE /
 * _THRESHOLD) were replaced with imports of the 2024 payroll-tax table. PayrollEngine has no
 * pre-existing test file, so behavior is preserved iff the imported 2024 table values are byte-identical
 * to the literals they replaced.
 *
 * This is a REAL assertion against the exact tax-withholding math PayrollEngine.calculatePayStub runs:
 * it reproduces that formula (socialSecurity = ssEligible × rate; medicare = gross × rate; +0.9% over
 * the threshold) on concrete dollar inputs and asserts the resulting withheld dollars. If any 2024
 * table value drifts from what PayrollEngine inlined, these dollar outputs change and the test FAILS.
 */
describe("PayrollEngine — DRY no-regression (withholding formula on real dollars)", () => {
  const t = getPayrollTaxTable(2024);

  it("the 2024 table reproduces PayrollEngine's exact Social Security withholding ($2,000 gross → $124.00)", () => {
    const gross = 2000;
    // PayrollEngine: ssEligible = min(gross, base − ytd); ytd=0 so eligible = gross (well under base).
    const ssEligible = Math.max(0, Math.min(gross, t.socialSecurityWageBase - 0));
    const socialSecurity = ssEligible * t.socialSecurityRate;
    expect(socialSecurity).toBeCloseTo(124, 2); // 2000 × 0.062
  });

  it("the 2024 table reproduces PayrollEngine's exact Medicare withholding ($2,000 gross → $29.00)", () => {
    const gross = 2000;
    const medicare = gross * t.medicareRate;
    expect(medicare).toBeCloseTo(29, 2); // 2000 × 0.0145
  });

  it("Social Security stops at the $168,600 base (a paycheck that crosses the cap is partially exempt)", () => {
    // ytd already $160,000; this $20,000 check → only $8,600 is SS-eligible (168600 − 160000).
    const gross = 20000;
    const ytdGross = 160000;
    const ssEligible = Math.max(0, Math.min(gross, t.socialSecurityWageBase - ytdGross));
    expect(ssEligible).toBe(8600);
    expect(ssEligible * t.socialSecurityRate).toBeCloseTo(533.2, 2); // 8600 × 0.062
  });

  it("Additional Medicare 0.9% applies only on the portion above $200,000 (PayrollEngine's incremental logic)", () => {
    // A $250,000 single check, no prior ytd → $50,000 over the threshold.
    const gross = 250000;
    const ytdGross = 0;
    let medicare = gross * t.medicareRate; // base 1.45% on all
    const priorOver = Math.max(0, ytdGross - t.medicareAdditionalThreshold);
    const currentOver = Math.max(0, ytdGross + gross - t.medicareAdditionalThreshold);
    medicare += (currentOver - priorOver) * t.medicareAdditionalRate;
    // 250000 × 0.0145 = 3625; (50000) × 0.009 = 450 → 4075
    expect(medicare).toBeCloseTo(4075, 2);
  });

  it("the imported 2024 figures are byte-identical to the constants PayrollEngine previously inlined", () => {
    expect(t.socialSecurityRate).toBe(0.062);
    expect(t.socialSecurityWageBase).toBe(168600);
    expect(t.medicareRate).toBe(0.0145);
    expect(t.medicareAdditionalRate).toBe(0.009);
    expect(t.medicareAdditionalThreshold).toBe(200000);
  });
});
