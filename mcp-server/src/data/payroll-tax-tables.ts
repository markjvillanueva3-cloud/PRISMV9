/**
 * payroll-tax-tables.ts — canonical US federal payroll-tax rate/wage-base table for the PRISM ERP
 * (galaxy:business, slot:hotel).
 *
 * Imported by PayrollEngine + PayrollLiabilityFilingEngine — NEVER inline a FICA/Medicare/FUTA rate,
 * wage base, or threshold in engine code (financial-invariant / anti-pattern #1: these are statutory
 * IRS/SSA values that are TAX-YEAR-KEYED and change annually; a stale/typo'd inlined value = wrong
 * withholding/deposit = real penalty exposure under IRC §6651/§6656 and an under-/over-collected
 * employee). This module is the single source of truth — the file the QB-parity payroll audit flagged
 * missing.
 *
 * ⚠ HONESTY: the Social Security wage base is re-indexed every year by SSA (cost-of-living); the FUTA
 * net rate of 0.6% ASSUMES a full 5.4% state-unemployment credit (a credit-reduction state pays more —
 * reconcile against the year's Form 940 Schedule A before filing). Verify each year against the final
 * IRS Pub 15 / SSA release before running production payroll. getPayrollTaxTable() THROWS on a year
 * with no canonical figure — a silent guess at a statutory rate is unacceptable.
 *
 * Sources:
 *  - IRS Pub 15 (Circular E) — FICA Social Security 6.2% (employee) + 6.2% (employer match), Medicare
 *    1.45% (employee) + 1.45% (employer match).
 *  - IRS / Additional Medicare Tax (IRC §3101(b)(2)) — extra 0.9% employee-only on Medicare wages over
 *    $200,000 (single-filer withholding threshold; not employer-matched). Threshold is NOT indexed.
 *  - SSA — Social Security (OASDI) contribution & benefit (wage) base: 2024 = $168,600, 2025 = $176,100.
 *  - IRS Form 940 (FUTA) — gross 6.0% on the first $7,000 of each employee's wages; net 0.6% after the
 *    standard 5.4% state-unemployment credit. The $7,000 FUTA wage base has been fixed since 1983.
 *
 * schemaVersion bumps on any rate change or a new tax-year entry + add a migration note. Citizens:
 * PayrollEngine, PayrollLiabilityFilingEngine.
 */

export const PAYROLL_TAX_TABLES_SCHEMA_VERSION = "1.0.0";

export interface PayrollTaxTable {
  /** Social Security (OASDI) employee rate (decimal). Employer matches at the same rate. IRS Pub 15. */
  socialSecurityRate: number;
  /** SSA OASDI contribution & benefit (wage) base — SS tax stops once YTD SS wages reach this. */
  socialSecurityWageBase: number;
  /** Medicare (HI) employee rate (decimal). Employer matches at the same rate. No wage cap. IRS Pub 15. */
  medicareRate: number;
  /** Additional Medicare Tax rate (IRC §3101(b)(2)) — employee-only, NOT employer-matched. */
  medicareAdditionalRate: number;
  /** Wages over this trigger the Additional Medicare Tax withholding (single-filer). NOT indexed. */
  medicareAdditionalThreshold: number;
  /** FUTA gross rate (decimal) before the state-unemployment credit. IRS Form 940. */
  futaRate: number;
  /** FUTA net rate (decimal) after the standard 5.4% state credit (credit-reduction states pay more). */
  futaCreditNetRate: number;
  /** FUTA taxable wage base per employee (first $7,000 of wages, fixed since 1983). IRS Form 940. */
  futaWageBase: number;
}

/**
 * Keyed by tax year. Both 2024 and 2025 provided. The employer SS/Medicare match rate EQUALS the
 * employee rate (FICA is split 50/50 employer/employee), so a single rate field serves both halves —
 * the engine doubles it for the combined 941 liability (12.4% SS / 2.9% Medicare).
 */
export const PAYROLL_TAX_TABLES: Readonly<Record<number, PayrollTaxTable>> = Object.freeze({
  2024: Object.freeze({
    socialSecurityRate: 0.062,
    socialSecurityWageBase: 168600, // SSA 2024 OASDI wage base
    medicareRate: 0.0145,
    medicareAdditionalRate: 0.009,
    medicareAdditionalThreshold: 200000,
    futaRate: 0.06,
    futaCreditNetRate: 0.006,
    futaWageBase: 7000,
  }),
  2025: Object.freeze({
    socialSecurityRate: 0.062,
    socialSecurityWageBase: 176100, // SSA 2025 OASDI wage base (re-indexed from $168,600)
    medicareRate: 0.0145,
    medicareAdditionalRate: 0.009,
    medicareAdditionalThreshold: 200000,
    futaRate: 0.06,
    futaCreditNetRate: 0.006,
    futaWageBase: 7000,
  }),
});

/** Resolve the payroll-tax table for a tax year or throw (never guess a statutory rate). */
export function getPayrollTaxTable(year: number): PayrollTaxTable {
  if (!Number.isInteger(year)) {
    throw new Error(`[payroll-tax] tax year must be an integer, got ${year}`);
  }
  const t = PAYROLL_TAX_TABLES[year];
  if (!t) {
    throw new Error(
      `[payroll-tax] no canonical tax table for year ${year}. ` +
        `Known: ${Object.keys(PAYROLL_TAX_TABLES).join(", ")}. ` +
        `Add the year (with IRS Pub 15 / SSA / Form 940 sources) after confirming the figures — do NOT guess.`
    );
  }
  return t;
}
