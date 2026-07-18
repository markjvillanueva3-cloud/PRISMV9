import { describe, it, expect } from "vitest";
import { PayrollLiabilityFilingEngine as P, type WageRecord, type Form941Result, type FormW2Record } from "../engines/PayrollLiabilityFilingEngine.js";
import { getPayrollTaxTable } from "../data/payroll-tax-tables.js";

/**
 * All reference values hand-computed against IRS Form 941 / 940 / W-2 rules using the canonical
 * payroll-tax-tables.ts figures:
 *   2024: SS 6.2% / base $168,600 / Medicare 1.45% / addl 0.9% over $200k / FUTA net 0.6% on first $7,000.
 *   2025: same rates, SS base $176,100.
 * A test FAILS if the business math changes (no truthy/defined stubs).
 */
const T2024 = getPayrollTaxTable(2024);
const T2025 = getPayrollTaxTable(2025);

/** Build a wage record with sane defaults; override per test. */
const wage = (over: Partial<WageRecord> & { employeeId: string }): WageRecord => ({
  name: `Emp ${over.employeeId}`,
  ssn: "123456789",
  grossPay: 0,
  fedIncomeTaxWithheld: 0,
  socialSecurityWages: 0,
  medicareWages: 0,
  stateTax: 0,
  ...over,
});

describe("getPayrollTaxTable — canonical constants", () => {
  it("exposes the 2024 statutory figures exactly", () => {
    expect(T2024.socialSecurityRate).toBe(0.062);
    expect(T2024.socialSecurityWageBase).toBe(168600);
    expect(T2024.medicareRate).toBe(0.0145);
    expect(T2024.medicareAdditionalRate).toBe(0.009);
    expect(T2024.medicareAdditionalThreshold).toBe(200000);
    expect(T2024.futaCreditNetRate).toBe(0.006);
    expect(T2024.futaWageBase).toBe(7000);
  });

  it("2025 re-indexes the SS wage base to $176,100 (rates unchanged)", () => {
    expect(T2025.socialSecurityWageBase).toBe(176100);
    expect(T2025.socialSecurityRate).toBe(0.062);
  });

  it("throws on an unknown tax year (never guesses a statutory rate)", () => {
    expect(() => getPayrollTaxTable(1999)).toThrow(/no canonical tax table/);
    expect(() => getPayrollTaxTable(2.5 as number)).toThrow(/must be an integer/);
  });
});

describe("compute941 — quarterly federal tax return", () => {
  it("computes combined SS (12.4%) + Medicare (2.9%) + FIT, both-ways reconciled", () => {
    const r = P.compute941({
      year: 2024,
      quarter: 1,
      depositsMade: 15000,
      quarterWages: [wage({ employeeId: "e1", grossPay: 50000, fedIncomeTaxWithheld: 8000, socialSecurityWages: 50000, medicareWages: 50000 })],
    });
    expect(r.socialSecurityTax).toBeCloseTo(6200, 2);   // 50000 × 2 × 0.062
    expect(r.medicareTax).toBeCloseTo(1450, 2);          // 50000 × 2 × 0.0145
    expect(r.additionalMedicareTax).toBeCloseTo(0, 2);   // under $200k threshold
    expect(r.totalFitWithheld).toBeCloseTo(8000, 2);
    expect(r.totalTaxLiability).toBeCloseTo(15650, 2);   // 8000 + 6200 + 1450
    expect(r.balanceDue).toBeCloseTo(650, 2);            // 15650 − 15000
  });

  it("totalTaxLiability reconciles to the sum of its parts (forward == reverse)", () => {
    const r = P.compute941({
      year: 2024,
      quarter: 2,
      quarterWages: [
        wage({ employeeId: "e1", grossPay: 30000, fedIncomeTaxWithheld: 4000, socialSecurityWages: 30000, medicareWages: 30000 }),
        wage({ employeeId: "e2", grossPay: 20000, fedIncomeTaxWithheld: 2500, socialSecurityWages: 20000, medicareWages: 20000 }),
      ],
    });
    const reconstructed = r.totalFitWithheld + r.socialSecurityTax + r.medicareTax + r.additionalMedicareTax;
    expect(r.totalTaxLiability).toBeCloseTo(reconstructed, 2);
    // SS 50000×2×0.062=6200, Med 50000×2×0.0145=1450, FIT 6500 → 14150
    expect(r.totalTaxLiability).toBeCloseTo(14150, 2);
    expect(r.employeeCount).toBe(2);
  });

  it("applies Additional Medicare 0.9% ONLY on wages over the $200k threshold", () => {
    const r = P.compute941({
      year: 2024,
      quarter: 4,
      quarterWages: [wage({ employeeId: "exec", grossPay: 250000, fedIncomeTaxWithheld: 60000, socialSecurityWages: 168600, medicareWages: 250000 })],
    });
    expect(r.additionalMedicareWages).toBeCloseTo(50000, 2);     // 250000 − 200000
    expect(r.additionalMedicareTax).toBeCloseTo(450, 2);          // 50000 × 0.009
    expect(r.medicareTax).toBeCloseTo(7250, 2);                   // 250000 × 2 × 0.0145
    expect(r.socialSecurityTax).toBeCloseTo(20906.4, 2);          // 168600 × 2 × 0.062
  });

  it("balanceDue is negative (overpayment) when deposits exceed liability", () => {
    const r = P.compute941({
      year: 2024,
      quarter: 3,
      depositsMade: 20000,
      quarterWages: [wage({ employeeId: "e1", grossPay: 50000, fedIncomeTaxWithheld: 8000, socialSecurityWages: 50000, medicareWages: 50000 })],
    });
    expect(r.balanceDue).toBeCloseTo(15650 - 20000, 2); // −4350 overpayment
  });

  it("an empty quarter yields zero liability (no employees) and reconciles", () => {
    const r = P.compute941({ year: 2024, quarter: 1, quarterWages: [] });
    expect(r.employeeCount).toBe(0);
    expect(r.totalTaxLiability).toBe(0);
    expect(r.balanceDue).toBe(0);
  });

  it("throws on a negative wage (never silently coerces)", () => {
    expect(() =>
      P.compute941({ year: 2024, quarter: 1, quarterWages: [wage({ employeeId: "e1", grossPay: -100, socialSecurityWages: 0, medicareWages: 0 })] })
    ).toThrow(/negative grossPay/);
  });

  it("throws on a non-finite wage (NaN/Infinity)", () => {
    expect(() =>
      P.compute941({ year: 2024, quarter: 1, quarterWages: [wage({ employeeId: "e1", grossPay: Number.NaN, socialSecurityWages: 0, medicareWages: 0 })] })
    ).toThrow();
  });

  it("throws on negative depositsMade and on an out-of-range quarter", () => {
    expect(() => P.compute941({ year: 2024, quarter: 1, depositsMade: -5, quarterWages: [] })).toThrow(/depositsMade cannot be negative/);
    expect(() => P.compute941({ year: 2024, quarter: 5 as 1, quarterWages: [] })).toThrow(/quarter must be 1-4/);
  });

  it("throws on an unknown tax year", () => {
    expect(() => P.compute941({ year: 1990, quarter: 1, quarterWages: [] })).toThrow(/no canonical tax table/);
  });
});

describe("compute940 — annual FUTA with per-employee $7,000 cap", () => {
  it("caps each employee at the FUTA wage base and applies the 0.6% net rate", () => {
    const r = P.compute940({
      year: 2024,
      annualWagesByEmployee: [
        wage({ employeeId: "e1", grossPay: 50000 }), // capped to 7000
        wage({ employeeId: "e2", grossPay: 5000 }),  // under cap → 5000
      ],
    });
    expect(r.perEmployee[0].futaTaxableWages).toBe(7000);  // CAP respected
    expect(r.perEmployee[1].futaTaxableWages).toBe(5000);  // no cap
    expect(r.totalFutaTaxableWages).toBe(12000);
    expect(r.futaTax).toBeCloseTo(72, 2);                  // 12000 × 0.006
    expect(r.totalGrossWages).toBe(55000);
  });

  it("an employee exactly at the cap is not over-taxed", () => {
    const r = P.compute940({ year: 2024, annualWagesByEmployee: [wage({ employeeId: "e1", grossPay: 7000 })] });
    expect(r.perEmployee[0].futaTaxableWages).toBe(7000);
    expect(r.futaTax).toBeCloseTo(42, 2); // 7000 × 0.006
  });

  it("no employees → zero FUTA", () => {
    const r = P.compute940({ year: 2025, annualWagesByEmployee: [] });
    expect(r.futaTax).toBe(0);
    expect(r.totalFutaTaxableWages).toBe(0);
  });

  it("throws on a negative gross wage", () => {
    expect(() => P.compute940({ year: 2024, annualWagesByEmployee: [wage({ employeeId: "e1", grossPay: -1 })] })).toThrow(/negative grossPay/);
  });
});

describe("generateW2 — SS wage-base cap, Additional Medicare, SSN masking", () => {
  it("caps box3 SS wages at the 2024 base and box4 plateaus", () => {
    const [w] = P.generateW2({
      year: 2024,
      employeeYtd: [wage({ employeeId: "e1", name: "Jane Welder", ssn: "123-45-6789", grossPay: 200000, fedIncomeTaxWithheld: 40000, socialSecurityWages: 200000, medicareWages: 200000, stateTax: 9000 })],
    });
    expect(w.box3SocialSecurityWages).toBe(168600);          // capped at 2024 base
    expect(w.box4SocialSecurityTaxWithheld).toBeCloseTo(10453.2, 2); // 168600 × 0.062
    expect(w.box1WagesTipsOtherComp).toBe(200000);
    expect(w.box2FederalIncomeTaxWithheld).toBe(40000);
    expect(w.box16StateWages).toBe(200000);
    expect(w.box17StateIncomeTax).toBe(9000);
  });

  it("2025 wage-base produces a DIFFERENT box4 cap (proves wage-base difference is honored)", () => {
    const [w24] = P.generateW2({ year: 2024, employeeYtd: [wage({ employeeId: "e1", grossPay: 200000, socialSecurityWages: 200000, medicareWages: 200000 })] });
    const [w25] = P.generateW2({ year: 2025, employeeYtd: [wage({ employeeId: "e1", grossPay: 200000, socialSecurityWages: 200000, medicareWages: 200000 })] });
    expect(w24.box3SocialSecurityWages).toBe(168600);
    expect(w25.box3SocialSecurityWages).toBe(176100);
    expect(w24.box4SocialSecurityTaxWithheld).toBeCloseTo(10453.2, 2);  // 168600 × 0.062
    expect(w25.box4SocialSecurityTaxWithheld).toBeCloseTo(10918.2, 2);  // 176100 × 0.062
    expect(w25.box4SocialSecurityTaxWithheld).not.toBeCloseTo(w24.box4SocialSecurityTaxWithheld, 2);
  });

  it("adds the 0.9% Additional Medicare to box6 over the $200k threshold", () => {
    const [w] = P.generateW2({ year: 2024, employeeYtd: [wage({ employeeId: "exec", grossPay: 250000, socialSecurityWages: 168600, medicareWages: 250000 })] });
    // box6 = 250000 × 0.0145 + (250000 − 200000) × 0.009 = 3625 + 450
    expect(w.box6MedicareTaxWithheld).toBeCloseTo(4075, 2);
    expect(w.box5MedicareWagesAndTips).toBe(250000);
  });

  it("MASKS the SSN to ***-**-#### — raw SSN never appears in the record", () => {
    const [w] = P.generateW2({ year: 2024, employeeYtd: [wage({ employeeId: "e1", ssn: "123-45-6789", grossPay: 50000, socialSecurityWages: 50000, medicareWages: 50000 })] });
    expect(w.ssnMasked).toBe("***-**-6789");
    expect(JSON.stringify(w)).not.toContain("123456789");
    expect(JSON.stringify(w)).not.toContain("123-45-6789");
  });

  it("throws when a W-2 employee has an invalid/missing SSN", () => {
    expect(() => P.generateW2({ year: 2024, employeeYtd: [wage({ employeeId: "e1", ssn: "12345", grossPay: 50000, socialSecurityWages: 50000, medicareWages: 50000 })] })).toThrow(/SSN must be 9 digits/);
    expect(() => P.generateW2({ year: 2024, employeeYtd: [{ ...wage({ employeeId: "e1", grossPay: 1, socialSecurityWages: 0, medicareWages: 0 }), ssn: undefined }] })).toThrow(/SSN must be 9 digits/);
  });
});

describe("reconcileW2sTo941 — year-end cross-check", () => {
  // One employee, full year, kept under the SS wage base so quarterly + annual SS agree.
  const quarterWage = wage({ employeeId: "e1", grossPay: 50000, fedIncomeTaxWithheld: 8000, socialSecurityWages: 40000, medicareWages: 50000 });
  const fourQuarters = (): Form941Result[] =>
    ([1, 2, 3, 4] as const).map((q) => P.compute941({ year: 2024, quarter: q, quarterWages: [quarterWage] }));
  const annualW2 = (): FormW2Record[] =>
    P.generateW2({ year: 2024, employeeYtd: [wage({ employeeId: "e1", grossPay: 200000, fedIncomeTaxWithheld: 32000, socialSecurityWages: 160000, medicareWages: 200000 })] });

  it("PASSES when ΣW-2 box2 == Σ941 FIT and ΣW-2 box4 == employee-half of Σ941 SS", () => {
    const rec = P.reconcileW2sTo941({ w2s: annualW2(), the4Quarters: fourQuarters() });
    expect(rec.reconciled).toBe(true);
    expect(rec.total941Fit).toBeCloseTo(32000, 2);              // 4 × 8000
    expect(rec.totalW2Box2Fit).toBeCloseTo(32000, 2);
    // 941 combined SS per Q = 40000×2×0.062 = 4960; 4Q = 19840; employee half = 9920
    expect(rec.total941EmployeeSocialSecurity).toBeCloseTo(9920, 2);
    // W-2 box4 = 160000 × 0.062 = 9920 (annual SS wages under the cap)
    expect(rec.totalW2Box4SocialSecurity).toBeCloseTo(9920, 2);
  });

  it("THROWS on a FIT mismatch (W-2 FIT skewed from the 941s)", () => {
    const w2s = annualW2();
    w2s[0].box2FederalIncomeTaxWithheld = 30000; // skew by $2000
    expect(() => P.reconcileW2sTo941({ w2s, the4Quarters: fourQuarters() })).toThrow(/reconciliation FAILED on FIT/);
  });

  it("THROWS on a Social Security mismatch", () => {
    const w2s = annualW2();
    w2s[0].box4SocialSecurityTaxWithheld = 9000; // wrong employee SS
    expect(() => P.reconcileW2sTo941({ w2s, the4Quarters: fourQuarters() })).toThrow(/reconciliation FAILED on Social Security/);
  });

  it("THROWS when not exactly 4 quarters are supplied", () => {
    expect(() => P.reconcileW2sTo941({ w2s: annualW2(), the4Quarters: fourQuarters().slice(0, 3) })).toThrow(/exactly 4 quarterly 941s/);
  });
});

describe("contractor1099Totals — BRIDGE to Form1099NECEngine (no re-derivation)", () => {
  it("delegates to the 1099-NEC engine and returns its filing verbatim", () => {
    const filing = P.contractor1099Totals({
      taxYear: 2025,
      payees: [{ payeeId: "c1", legalName: "Acme Contractor", tin: "987654321", entityType: "individual" }],
      payments: [{ payeeId: "c1", amount: 5000, paymentMethod: "check" }],
    });
    expect(filing.forms).toHaveLength(1);
    expect(filing.forms[0].box1NonemployeeCompensation).toBe(5000);
    expect(filing.forms[0].reason).toBe("threshold_met");
    expect(filing.summary.formCount).toBe(1);
  });

  it("propagates the 1099 engine's threshold logic (under $600 TY2025 → no form)", () => {
    const filing = P.contractor1099Totals({
      taxYear: 2025,
      payees: [{ payeeId: "c1", legalName: "Acme Contractor", tin: "987654321", entityType: "individual" }],
      payments: [{ payeeId: "c1", amount: 400, paymentMethod: "check" }],
    });
    expect(filing.forms).toHaveLength(0);
  });
});

describe("remitLiability — balanced GL journal lines", () => {
  it("emits DR 2100 Tax Payable / CR 1000 Cash that balance to the cent", () => {
    const r = P.remitLiability(15650, "2024-04-30");
    expect(r.balanced).toBe(true);
    expect(r.amount).toBe(15650);
    expect(r.lines).toHaveLength(2);
    expect(r.lines[0]).toMatchObject({ account_id: "2100", account_name: "Tax Payable", debit: 15650, credit: 0 });
    expect(r.lines[1]).toMatchObject({ account_id: "1000", account_name: "Cash", debit: 0, credit: 15650 });
    const totalDebit = r.lines.reduce((s, l) => s + l.debit, 0);
    const totalCredit = r.lines.reduce((s, l) => s + l.credit, 0);
    expect(totalDebit).toBeCloseTo(totalCredit, 2);
    expect(totalDebit).toBeCloseTo(15650, 2);
  });

  it("rounds the remit amount half-even to the cent", () => {
    const r = P.remitLiability(100.125, "2024-04-30"); // ties-to-even → 100.12
    expect(r.amount).toBe(100.12);
    expect(r.lines[0].debit).toBe(100.12);
  });

  it("throws on a non-positive or non-finite remit amount, or a missing date", () => {
    expect(() => P.remitLiability(0, "2024-04-30")).toThrow(/must be positive/);
    expect(() => P.remitLiability(-100, "2024-04-30")).toThrow(/must be positive/);
    expect(() => P.remitLiability(Number.NaN, "2024-04-30")).toThrow(/must be finite/);
    expect(() => P.remitLiability(100, "")).toThrow(/requires an ISO date/);
  });
});
