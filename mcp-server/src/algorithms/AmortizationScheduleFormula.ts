/**
 * AmortizationScheduleFormula — loan/lease/depreciation amortization
 * (hotel iter12, 2026-05-24, U-AMORTIZATION-FORMULA).
 *
 * Pure mathematical primitive — foundation for any GL/AP/lease/depreciation
 * work. Three independent surfaces:
 *
 *   1. fixedPayment(principal, rate_periodic, n_periods)
 *      Closed-form fixed-payment formula for level-pay loans/leases:
 *          PMT = P · r / (1 − (1+r)^−n)
 *      Reduces to PMT = P / n when r = 0.
 *
 *   2. amortizationSchedule(principal, rate_annual, n_periods, periods_per_year)
 *      Period-by-period breakdown: principal_payment + interest_payment +
 *      remaining_balance. Sum of principal_payments = original principal
 *      (exactly, by ledger balancing on the final row).
 *
 *   3. straightLineDepreciation(cost, salvage, life_years)
 *      Annual depreciation = (cost − salvage) / life. The simplest GAAP method.
 *
 * Hotel-soul:
 *   - **financial-invariant gate** — sum of principal_payments equals
 *     original principal (verified by an in-engine assertion before return)
 *   - **R12 fail-loud** — bad inputs (NaN / Infinity / negative / zero periods)
 *     throw with descriptive errors
 *   - **deterministic** — no PRNG, no clock, no I/O
 *
 * Reference: Brigham & Houston, "Fundamentals of Financial Management" 15e
 * (Cengage 2019), Ch. 5 (Time Value of Money). PMT formula derivation in §5.3.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AmortizationRow {
  period: number;
  payment: number;
  principal_payment: number;
  interest_payment: number;
  remaining_balance: number;
}

export interface AmortizationSchedule {
  principal: number;
  rate_annual: number;
  rate_periodic: number;
  n_periods: number;
  periods_per_year: number;
  payment: number;          // level-pay $ per period
  total_paid: number;       // payment × n_periods
  total_interest: number;   // total_paid − principal
  rows: AmortizationRow[];
}

export interface DepreciationRow {
  year: number;
  depreciation: number;
  accumulated: number;
  book_value: number;
}

export interface DepreciationSchedule {
  cost: number;
  salvage: number;
  life_years: number;
  annual_depreciation: number;
  rows: DepreciationRow[];
}

// ─── Constants (named, not magic) ───────────────────────────────────────────

const ROUNDING_PRECISION_DIGITS = 4;       // ledger row rounding (4 = ten-thousandth)
const ROUND_EPSILON_TOLERANCE = 0.01;       // accept ≤1¢ balancing residue on final row
const PERIODS_PER_YEAR_MONTHLY = 12;        // canonical default

// ─── Helpers ────────────────────────────────────────────────────────────────

function round(x: number): number {
  const f = Math.pow(10, ROUNDING_PRECISION_DIGITS);
  return Math.round(x * f) / f;
}

function assertPositive(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

function assertNonNegative(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x < 0) throw new Error(`${label}: must be >= 0 (got ${x})`);
}

function assertPositiveInteger(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (!Number.isInteger(x)) throw new Error(`${label}: must be integer (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

// ─── Surface 1: fixed-payment closed form ───────────────────────────────────

/**
 * Level-payment formula PMT = P · r / (1 − (1+r)^−n)
 * Returns the periodic payment in the same currency as principal.
 *
 * Edge: r = 0 (zero-interest loan) reduces to PMT = P / n.
 *
 * @param principal — loan/lease principal (must be > 0)
 * @param rate_periodic — periodic rate, decimal (e.g. 0.005 = 0.5%/month)
 * @param n_periods — total number of periods (must be positive integer)
 */
export function fixedPayment(principal: number, rate_periodic: number, n_periods: number): number {
  assertPositive(principal, "fixedPayment.principal");
  assertNonNegative(rate_periodic, "fixedPayment.rate_periodic");
  assertPositiveInteger(n_periods, "fixedPayment.n_periods");
  if (rate_periodic === 0) return principal / n_periods;
  return principal * rate_periodic / (1 - Math.pow(1 + rate_periodic, -n_periods));
}

// ─── Surface 2: full amortization schedule ──────────────────────────────────

/**
 * Period-by-period amortization schedule. Hotel-soul: sum of
 * principal_payments equals original principal exactly (ledger balanced on
 * the final row via remainder-absorption).
 */
export function amortizationSchedule(
  principal: number,
  rate_annual: number,
  n_periods: number,
  periods_per_year: number = PERIODS_PER_YEAR_MONTHLY,
): AmortizationSchedule {
  assertPositive(principal, "amortizationSchedule.principal");
  assertNonNegative(rate_annual, "amortizationSchedule.rate_annual");
  assertPositiveInteger(n_periods, "amortizationSchedule.n_periods");
  assertPositiveInteger(periods_per_year, "amortizationSchedule.periods_per_year");

  const rate_periodic = rate_annual / periods_per_year;
  const payment = fixedPayment(principal, rate_periodic, n_periods);

  const rows: AmortizationRow[] = [];
  let balance = principal;
  let totalPrincipalPaid = 0;
  for (let i = 1; i <= n_periods; i++) {
    const interest = balance * rate_periodic;
    let principalPayment = payment - interest;
    // Final row: absorb floating-point residue so ledger balances exactly.
    if (i === n_periods) {
      principalPayment = balance;
    }
    balance -= principalPayment;
    totalPrincipalPaid += principalPayment;
    rows.push({
      period: i,
      payment: round(i === n_periods ? interest + principalPayment : payment),
      principal_payment: round(principalPayment),
      interest_payment: round(interest),
      remaining_balance: round(Math.max(0, balance)),
    });
  }

  // Financial-invariant gate (hotel-soul): sum of principal_payments must
  // equal original principal — refuse return on imbalance.
  const principalSum = rows.reduce((s, r) => s + r.principal_payment, 0);
  if (Math.abs(principalSum - principal) > ROUND_EPSILON_TOLERANCE) {
    throw new Error(`amortizationSchedule: principal-payment sum ${principalSum.toFixed(4)} != original ${principal.toFixed(4)} (delta=${(principalSum - principal).toFixed(4)})`);
  }

  return {
    principal,
    rate_annual,
    rate_periodic,
    n_periods,
    periods_per_year,
    payment: round(payment),
    total_paid: round(payment * n_periods),
    total_interest: round(payment * n_periods - principal),
    rows,
  };
}

// ─── Surface 3: straight-line depreciation ──────────────────────────────────

/**
 * Straight-line depreciation: annual = (cost − salvage) / life_years.
 * Returns a year-by-year schedule with running book value.
 * Hotel-soul: book_value never goes below salvage; final-year residue absorbed.
 *
 * @param cost — initial asset cost (must be > 0)
 * @param salvage — residual value at end of life (>= 0, < cost)
 * @param life_years — useful life in years (positive integer)
 */
export function straightLineDepreciation(cost: number, salvage: number, life_years: number): DepreciationSchedule {
  assertPositive(cost, "depreciation.cost");
  assertNonNegative(salvage, "depreciation.salvage");
  assertPositiveInteger(life_years, "depreciation.life_years");
  if (salvage >= cost) throw new Error(`depreciation: salvage (${salvage}) must be < cost (${cost})`);

  const annual = (cost - salvage) / life_years;
  const rows: DepreciationRow[] = [];
  let bookValue = cost;
  let accumulated = 0;
  for (let y = 1; y <= life_years; y++) {
    let depreciation = annual;
    // Final-year residue absorption to hit exact salvage value.
    if (y === life_years) {
      depreciation = bookValue - salvage;
    }
    bookValue -= depreciation;
    accumulated += depreciation;
    rows.push({
      year: y,
      depreciation: round(depreciation),
      accumulated: round(accumulated),
      book_value: round(Math.max(salvage, bookValue)),
    });
  }
  return { cost, salvage, life_years, annual_depreciation: round(annual), rows };
}
