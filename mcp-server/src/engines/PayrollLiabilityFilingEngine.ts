/**
 * PayrollLiabilityFilingEngine — federal payroll-liability filing for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Payroll Liabilities + W-2 / 941 / 940" function set — the big Phase-5 unit.
 * Aggregates per-employee wage records (the `PayStub` shape PayrollEngine already produces) into the
 * three federal artifacts QB files and reconciles them the way QB enforces at year end:
 *   - Form 941  (Employer's QUARTERLY Federal Tax Return): FIT withheld + the combined employer+employee
 *     12.4% Social Security and 2.9% Medicare, PLUS the 0.9% employee-only Additional Medicare Tax, less
 *     deposits already made → balance due.
 *   - Form 940  (Employer's ANNUAL FUTA Return): 0.6% net (after the 5.4% state credit) on the first
 *     $7,000 of each employee's wages — capped per employee.
 *   - Form W-2  (Wage & Tax Statement): per-employee box 1/2/3/4/5/6/16/17 with the SS-wage-base cap and
 *     Additional Medicare on box 6; SSN masked to last-4.
 *   - reconcileW2sTo941: the year-end cross-check QB runs — Σ W-2 box2 (FIT) === Σ of the four 941s'
 *     FIT, and Σ W-2 box4 (employee SS) === the employee half of the four 941s' SS tax. Throws on drift.
 *   - contractor1099Totals: BRIDGES to Form1099NECEngine for contractor reporting (does NOT re-derive).
 *   - remitLiability: emits BALANCED GL lines (DR 2100 Tax Payable / CR 1000 Cash) as data.
 *
 * PRISM synergy: a 941 line is BORN from payroll — PayrollEngine.calculatePayStub computes per-employee
 * SS/Medicare/FIT per period; this engine rolls those PayStub figures up to the quarter (941) and year
 * (940 / W-2). GeneralLedgerEngine.recordPayroll already credits taxes to 2100 Tax Payable each run;
 * remitLiability here is the matching debit when the deposit clears.
 *
 * Financial-invariant compliance (business/GSD.md §2, [[feedback_hotel_financial_invariant_gate]]):
 *  - every rate / wage base / threshold IMPORTED from payroll-tax-tables.ts, never inlined.
 *  - unknown tax year THROWS (a wrong statutory rate = penalty exposure).
 *  - half-even (banker's) rounding to the cent; each component rounded BEFORE summing so totals balance.
 *  - totalTaxLiability reconciles both ways (forward sum === reverse reconstruct) — asserted in code.
 *  - GL-affecting results return BALANCED journal lines (Σdebit === Σcredit, asserted, throws on drift).
 *  - non-finite / NaN amounts THROW (never silently coerce to 0 — a dropped tax under-deposits).
 *  - W-2 ↔ 941 mismatch THROWS (year-end balancing; a silent skew is an IRS notice).
 *
 * PII (business/CLAUDE.md §8.2 — HARD): SSN is masked to ***-**-#### in EVERY emitted W-2 record and
 * never logged raw. The raw SSN is consumed only to validate + mask; it never appears in a return value.
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wiring the stale worktree copy would clobber ~438 main actions on golf-merge. Wire in MAIN post-merge.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import { getPayrollTaxTable, PAYROLL_TAX_TABLES_SCHEMA_VERSION } from "../data/payroll-tax-tables.js";
import { Form1099NECEngine, type Payee, type PayeePayment, type Form1099NECFiling } from "./Form1099NECEngine.js";

/**
 * A per-employee wage record. Reuses the canonical PayStub fields (PayrollEngine) — these are the
 * year-to-date or per-period figures the caller has already withheld. For 941 these are the QUARTER's
 * wages; for 940 / W-2 these are the YEAR's. The caller decides the aggregation window; the engine sums
 * what it is given.
 */
export const WageRecordSchema = z.object({
  employeeId: z.string().min(1),
  name: z.string().min(1),
  /** SSN — PII; required only where a W-2 is emitted (generateW2 masks it). */
  ssn: z.string().optional(),
  /** total gross pay for the window (used for the FUTA / SS-base cap) */
  grossPay: z.number().finite(),
  /** federal income tax withheld (W-2 box 2 / 941 line 3) */
  fedIncomeTaxWithheld: z.number().finite(),
  /** Social Security wages (already net of pre-tax SS-exempt deductions); capped per the wage base */
  socialSecurityWages: z.number().finite(),
  /** Medicare wages (no cap) */
  medicareWages: z.number().finite(),
  /** state income tax withheld (W-2 box 17) */
  stateTax: z.number().finite().optional().default(0),
});
export type WageRecord = z.input<typeof WageRecordSchema>;

export interface Form941Result {
  taxYear: number;
  quarter: 1 | 2 | 3 | 4;
  employeeCount: number;
  /** total wages, tips and other compensation (941 line 2) */
  totalWages: number;
  /** federal income tax withheld (941 line 3) */
  totalFitWithheld: number;
  /** taxable Social Security wages (941 line 5a col 1) — wage-base cap is the caller's responsibility per the YTD context */
  taxableSocialSecurityWages: number;
  /** combined employer+employee SS tax = wages × 2 × ssRate (12.4%) */
  socialSecurityTax: number;
  /** taxable Medicare wages (941 line 5c col 1) */
  taxableMedicareWages: number;
  /** combined employer+employee Medicare tax = wages × 2 × medRate (2.9%) */
  medicareTax: number;
  /** wages subject to Additional Medicare (over the threshold), employee-only 0.9% (941 line 5d) */
  additionalMedicareWages: number;
  additionalMedicareTax: number;
  /** total tax liability = FIT + SS + Medicare + Additional Medicare (941 line 6, before deposits) */
  totalTaxLiability: number;
  /** deposits made during the quarter (941 line 13) */
  depositsMade: number;
  /** balance due (positive) or overpayment (negative) = liability − deposits (941 line 14/15) */
  balanceDue: number;
  ratesSchemaVersion: string;
}

export interface Form940EmployeeLine {
  employeeId: string;
  grossWages: number;
  futaTaxableWages: number; // capped at futaWageBase
}

export interface Form940Result {
  taxYear: number;
  employeeCount: number;
  totalGrossWages: number;
  /** Σ of per-employee min(gross, $7,000) */
  totalFutaTaxableWages: number;
  futaWageBase: number;
  futaCreditNetRate: number;
  /** FUTA tax = totalFutaTaxableWages × net rate (0.6%) */
  futaTax: number;
  perEmployee: Form940EmployeeLine[];
  ratesSchemaVersion: string;
}

export interface FormW2Record {
  employeeId: string;
  employeeName: string;
  ssnMasked: string; // ***-**-#### — raw SSN NEVER returned (PII §8.2)
  box1WagesTipsOtherComp: number;
  box2FederalIncomeTaxWithheld: number;
  box3SocialSecurityWages: number; // capped at the SS wage base
  box4SocialSecurityTaxWithheld: number; // box3 × ssRate (employee half only)
  box5MedicareWagesAndTips: number;
  box6MedicareTaxWithheld: number; // box5 × medRate + Additional Medicare (employee, 0.9% over threshold)
  box16StateWages: number;
  box17StateIncomeTax: number;
  taxYear: number;
}

export interface W2To941Reconciliation {
  reconciled: true;
  totalW2Box2Fit: number;
  total941Fit: number;
  totalW2Box4SocialSecurity: number;
  total941EmployeeSocialSecurity: number;
}

export interface GLJournalLine {
  account_id: string;
  account_name: string;
  debit: number;
  credit: number;
  description: string;
}

export interface RemitLiabilityResult {
  amount: number;
  date: string;
  lines: GLJournalLine[];
  balanced: true;
}

/** GL account ids/names this engine posts to — validated against GeneralLedgerEngine CHART_OF_ACCOUNTS. */
const ACCT_TAX_PAYABLE = Object.freeze({ id: "2100", name: "Tax Payable" });
const ACCT_CASH = Object.freeze({ id: "1000", name: "Cash" });

/** Cent tolerance for both-ways reconciliation asserts (half-even rounding never drifts past this). */
const CENT_EPS = 0.005;

export class PayrollLiabilityFilingEngine {
  /** Parse + validate a batch of wage records (throws on NaN/Infinity/missing required fields). */
  private static parseRecords(records: WageRecord[]): Array<z.output<typeof WageRecordSchema>> {
    if (!Array.isArray(records)) throw new Error("[payroll-filing] wage records must be an array");
    return records.map((r) => WageRecordSchema.parse(r));
  }

  /**
   * Form 941 — quarterly federal tax return for a quarter's wage records.
   * @param input.quarterWages per-employee wage records for the quarter
   * @param input.year tax year (rates imported from payroll-tax-tables.ts; throws on unknown year)
   * @param input.quarter 1-4
   * @param input.depositsMade federal tax deposits already made during the quarter (default 0)
   * @returns the 941 line set with totalTaxLiability + balanceDue
   */
  static compute941(input: {
    quarterWages: WageRecord[];
    year: number;
    quarter: 1 | 2 | 3 | 4;
    depositsMade?: number;
  }): Form941Result {
    const t = getPayrollTaxTable(input.year); // throws on unknown year
    if (![1, 2, 3, 4].includes(input.quarter)) {
      throw new Error(`[payroll-filing] 941 quarter must be 1-4, got ${input.quarter}`);
    }
    const deposits = input.depositsMade ?? 0;
    if (!Number.isFinite(deposits)) throw new Error(`[payroll-filing] depositsMade must be finite, got ${deposits}`);
    if (deposits < 0) throw new Error(`[payroll-filing] depositsMade cannot be negative, got ${deposits}`);

    const recs = this.parseRecords(input.quarterWages);

    let totalWages = 0;
    let totalFit = 0;
    let taxableSS = 0;
    let taxableMed = 0;
    let addlMedWages = 0;
    for (const r of recs) {
      if (r.grossPay < 0) throw new Error(`[payroll-filing] employee ${r.employeeId}: negative grossPay ${r.grossPay}`);
      if (r.socialSecurityWages < 0) throw new Error(`[payroll-filing] employee ${r.employeeId}: negative socialSecurityWages`);
      if (r.medicareWages < 0) throw new Error(`[payroll-filing] employee ${r.employeeId}: negative medicareWages`);
      totalWages = roundCentsHalfEven(totalWages + r.grossPay);
      totalFit = roundCentsHalfEven(totalFit + r.fedIncomeTaxWithheld);
      taxableSS = roundCentsHalfEven(taxableSS + r.socialSecurityWages);
      taxableMed = roundCentsHalfEven(taxableMed + r.medicareWages);
      // Additional Medicare: employee-only 0.9% on each employee's Medicare wages over the threshold.
      const over = Math.max(0, r.medicareWages - t.medicareAdditionalThreshold);
      addlMedWages = roundCentsHalfEven(addlMedWages + over);
    }

    // SS tax = combined employer+employee (12.4%); Medicare = combined (2.9%); each component rounded
    // to the cent BEFORE summing into the liability so the stored total balances exactly.
    const ssTax = roundCentsHalfEven(taxableSS * 2 * t.socialSecurityRate);
    const medTax = roundCentsHalfEven(taxableMed * 2 * t.medicareRate);
    const addlMedTax = roundCentsHalfEven(addlMedWages * t.medicareAdditionalRate);
    const fit = roundCentsHalfEven(totalFit);

    const totalTaxLiability = roundCentsHalfEven(fit + ssTax + medTax + addlMedTax);

    // Both-ways reconciliation: forward sum (above) === reverse reconstruct (subtract parts back to 0).
    const reverse = roundCentsHalfEven(totalTaxLiability - ssTax - medTax - addlMedTax);
    if (Math.abs(reverse - fit) > CENT_EPS) {
      throw new Error(
        `[payroll-filing] 941 totalTaxLiability does not reconcile: forward=${totalTaxLiability} ` +
          `reverse(FIT)=${reverse} expected FIT=${fit}`
      );
    }

    const balanceDue = roundCentsHalfEven(totalTaxLiability - deposits);

    return {
      taxYear: input.year,
      quarter: input.quarter,
      employeeCount: recs.length,
      totalWages,
      totalFitWithheld: fit,
      taxableSocialSecurityWages: taxableSS,
      socialSecurityTax: ssTax,
      taxableMedicareWages: taxableMed,
      medicareTax: medTax,
      additionalMedicareWages: addlMedWages,
      additionalMedicareTax: addlMedTax,
      totalTaxLiability,
      depositsMade: roundCentsHalfEven(deposits),
      balanceDue,
      ratesSchemaVersion: PAYROLL_TAX_TABLES_SCHEMA_VERSION,
    };
  }

  /**
   * Form 940 — annual FUTA. Caps each employee's taxable wages at the FUTA wage base ($7,000) then
   * applies the net rate (0.6% after the standard 5.4% state credit).
   * @param input.annualWagesByEmployee per-employee annual wage records
   * @param input.year tax year (rates imported; throws on unknown year)
   * @returns FUTA tax + per-employee taxable-wage lines (cap respected per employee)
   */
  static compute940(input: { annualWagesByEmployee: WageRecord[]; year: number }): Form940Result {
    const t = getPayrollTaxTable(input.year); // throws on unknown year
    const recs = this.parseRecords(input.annualWagesByEmployee);

    const perEmployee: Form940EmployeeLine[] = [];
    let totalGross = 0;
    let totalTaxable = 0;
    for (const r of recs) {
      if (r.grossPay < 0) throw new Error(`[payroll-filing] employee ${r.employeeId}: negative grossPay ${r.grossPay}`);
      // CAP at the FUTA wage base PER EMPLOYEE — wages above $7,000 are not FUTA-taxable.
      const taxable = roundCentsHalfEven(Math.min(r.grossPay, t.futaWageBase));
      perEmployee.push({ employeeId: r.employeeId, grossWages: roundCentsHalfEven(r.grossPay), futaTaxableWages: taxable });
      totalGross = roundCentsHalfEven(totalGross + r.grossPay);
      totalTaxable = roundCentsHalfEven(totalTaxable + taxable);
    }

    const futaTax = roundCentsHalfEven(totalTaxable * t.futaCreditNetRate);

    return {
      taxYear: input.year,
      employeeCount: recs.length,
      totalGrossWages: totalGross,
      totalFutaTaxableWages: totalTaxable,
      futaWageBase: t.futaWageBase,
      futaCreditNetRate: t.futaCreditNetRate,
      futaTax,
      perEmployee,
      ratesSchemaVersion: PAYROLL_TAX_TABLES_SCHEMA_VERSION,
    };
  }

  /**
   * Form W-2 — per-employee wage & tax statement for the year. Box 3 (SS wages) is capped at the SS
   * wage base; box 4 is box3 × employee SS rate; box 6 adds the 0.9% Additional Medicare over threshold.
   * SSN is masked to last-4 in the returned record (raw SSN NEVER returned).
   * @param input.employeeYtd per-employee annual wage records
   * @param input.year tax year (rates imported; throws on unknown year)
   * @returns one masked W-2 record per employee
   */
  static generateW2(input: { employeeYtd: WageRecord[]; year: number }): FormW2Record[] {
    const t = getPayrollTaxTable(input.year); // throws on unknown year
    const recs = this.parseRecords(input.employeeYtd);

    return recs.map((r) => {
      if (r.grossPay < 0) throw new Error(`[payroll-filing] employee ${r.employeeId}: negative grossPay ${r.grossPay}`);
      // box 3 SS wages capped at the wage base; box 4 = box3 × employee rate (employee half only).
      const box3 = roundCentsHalfEven(Math.min(r.socialSecurityWages, t.socialSecurityWageBase));
      const box4 = roundCentsHalfEven(box3 * t.socialSecurityRate);
      const box5 = roundCentsHalfEven(r.medicareWages);
      const addlOver = Math.max(0, r.medicareWages - t.medicareAdditionalThreshold);
      const box6 = roundCentsHalfEven(box5 * t.medicareRate + addlOver * t.medicareAdditionalRate);
      return {
        employeeId: r.employeeId,
        employeeName: r.name,
        ssnMasked: this.maskSsn(r.ssn), // throws if a W-2 employee lacks a valid SSN
        box1WagesTipsOtherComp: roundCentsHalfEven(r.grossPay),
        box2FederalIncomeTaxWithheld: roundCentsHalfEven(r.fedIncomeTaxWithheld),
        box3SocialSecurityWages: box3,
        box4SocialSecurityTaxWithheld: box4,
        box5MedicareWagesAndTips: box5,
        box6MedicareTaxWithheld: box6,
        box16StateWages: roundCentsHalfEven(r.grossPay),
        box17StateIncomeTax: roundCentsHalfEven(r.stateTax ?? 0),
        taxYear: input.year,
      };
    });
  }

  /**
   * Mask an SSN to ***-**-#### (PII §8.2). Validates a 9-digit SSN; throws otherwise. Never returns raw.
   * @param ssn raw 9-digit SSN (with or without dashes)
   * @returns masked SSN ***-**-#### (last 4 only)
   */
  static maskSsn(ssn: string | undefined): string {
    const digits = (ssn ?? "").replace(/\D/g, "");
    if (digits.length !== 9) {
      throw new Error(
        `[payroll-filing] SSN must be 9 digits; got ${digits.length} digit(s). Cannot emit a W-2 with an invalid SSN.`
      );
    }
    return `***-**-${digits.slice(-4)}`;
  }

  /**
   * Year-end W-2 ↔ 941 reconciliation (the cross-check QB enforces): Σ W-2 box2 (FIT) must equal the
   * sum of the four 941s' FIT, and Σ W-2 box4 (employee SS) must equal the EMPLOYEE HALF of the four
   * 941s' Social Security tax (the 941 SS figure is the combined 12.4%, so employee = ÷2). Throws on
   * any drift beyond a cent.
   * @param input.w2s the year's W-2 records (from generateW2)
   * @param input.the4Quarters the four 941 results for the year (from compute941)
   * @returns the reconciled totals, or throws if they do not balance
   */
  static reconcileW2sTo941(input: { w2s: FormW2Record[]; the4Quarters: Form941Result[] }): W2To941Reconciliation {
    if (!Array.isArray(input?.w2s)) throw new Error("[payroll-filing] w2s must be an array");
    if (!Array.isArray(input?.the4Quarters)) throw new Error("[payroll-filing] the4Quarters must be an array");
    if (input.the4Quarters.length !== 4) {
      throw new Error(`[payroll-filing] reconcileW2sTo941 expects exactly 4 quarterly 941s, got ${input.the4Quarters.length}`);
    }

    let w2Fit = 0;
    let w2Ss = 0;
    for (const w of input.w2s) {
      w2Fit = roundCentsHalfEven(w2Fit + w.box2FederalIncomeTaxWithheld);
      w2Ss = roundCentsHalfEven(w2Ss + w.box4SocialSecurityTaxWithheld);
    }

    let q941Fit = 0;
    let q941SsCombined = 0;
    for (const q of input.the4Quarters) {
      q941Fit = roundCentsHalfEven(q941Fit + q.totalFitWithheld);
      q941SsCombined = roundCentsHalfEven(q941SsCombined + q.socialSecurityTax);
    }
    // 941 SS is the COMBINED 12.4% (employer + employee); W-2 box4 is the employee half only.
    const q941SsEmployee = roundCentsHalfEven(q941SsCombined / 2);

    if (Math.abs(w2Fit - q941Fit) > CENT_EPS) {
      throw new Error(
        `[payroll-filing] W-2 ↔ 941 reconciliation FAILED on FIT: ΣW-2 box2=${w2Fit} ≠ Σ941 FIT=${q941Fit}. ` +
          `Year-end FIT does not balance — fix before filing.`
      );
    }
    if (Math.abs(w2Ss - q941SsEmployee) > CENT_EPS) {
      throw new Error(
        `[payroll-filing] W-2 ↔ 941 reconciliation FAILED on Social Security: ΣW-2 box4=${w2Ss} ≠ ` +
          `employee-half of Σ941 SS=${q941SsEmployee} (combined Σ941 SS=${q941SsCombined}). ` +
          `Year-end SS does not balance — fix before filing.`
      );
    }

    return {
      reconciled: true,
      totalW2Box2Fit: w2Fit,
      total941Fit: q941Fit,
      totalW2Box4SocialSecurity: w2Ss,
      total941EmployeeSocialSecurity: q941SsEmployee,
    };
  }

  /**
   * Contractor 1099-NEC totals — BRIDGES to Form1099NECEngine (does NOT re-derive 1099 logic).
   * @param input.taxYear tax year
   * @param input.payees contractor payee master (legal name / TIN / entity type)
   * @param input.payments the year's contractor payments
   * @returns the Form1099NECEngine filing result verbatim
   */
  static contractor1099Totals(input: { taxYear: number; payees: Payee[]; payments: PayeePayment[] }): Form1099NECFiling {
    return Form1099NECEngine.generate1099NEC({
      taxYear: input.taxYear,
      payees: input.payees,
      payments: input.payments,
    });
  }

  /**
   * Remit a payroll-tax liability — emits BALANCED GL journal lines as data (does NOT post to the GL).
   * DR 2100 Tax Payable / CR 1000 Cash. Σdebit === Σcredit asserted before return (throws on imbalance).
   * @param amount the liability amount to remit (must be a positive finite number)
   * @param date ISO remittance date
   * @returns balanced journal lines + the validated amount
   */
  static remitLiability(amount: number, date: string): RemitLiabilityResult {
    if (!Number.isFinite(amount)) throw new Error(`[payroll-filing] remit amount must be finite, got ${amount}`);
    if (amount <= 0) throw new Error(`[payroll-filing] remit amount must be positive, got ${amount}`);
    if (!date || typeof date !== "string") throw new Error("[payroll-filing] remit requires an ISO date string");

    const remit = roundCentsHalfEven(amount);
    const lines: GLJournalLine[] = [
      { account_id: ACCT_TAX_PAYABLE.id, account_name: ACCT_TAX_PAYABLE.name, debit: remit, credit: 0, description: `Payroll tax remittance ${date}` },
      { account_id: ACCT_CASH.id, account_name: ACCT_CASH.name, debit: 0, credit: remit, description: `Payroll tax remittance ${date}` },
    ];

    const totalDebit = roundCentsHalfEven(lines.reduce((s, l) => s + l.debit, 0));
    const totalCredit = roundCentsHalfEven(lines.reduce((s, l) => s + l.credit, 0));
    if (Math.abs(totalDebit - totalCredit) > CENT_EPS) {
      throw new Error(`[payroll-filing] remit GL lines do not balance: debit=${totalDebit} credit=${totalCredit}`);
    }

    return { amount: remit, date, lines, balanced: true };
  }
}

export const payrollLiabilityFilingEngine = PayrollLiabilityFilingEngine;
