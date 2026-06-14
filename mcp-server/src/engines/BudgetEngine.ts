/**
 * BudgetEngine — QuickBooks "Budgets" + budget-vs-actual variance reporting for the PRISM ERP
 * (galaxy:business, slot:hotel). QB-PARITY-MS0 Phase-4 engine #4.
 *
 * QuickBooks parity: the "Budgets" feature set — build a per-account, per-period (12-month fiscal)
 * budget, then run a "Budget vs. Actuals" report that shows variance per account-per-period plus
 * rollups (annual per account + grand total) and a favorable/unfavorable flag by account type.
 *
 * This engine is a LAYER ON TOP of {@link GeneralLedgerEngine}. It does NOT reimplement the chart of
 * accounts, double-entry posting, balance validation, or the three statements. It REUSES:
 *   - {@link generalLedgerEngine.getChartOfAccounts} / the exported `CHART_OF_ACCOUNTS` — the single
 *     canonical 22-account chart; budget accountIds are validated against it (unknown → THROW).
 *   - the exported {@link AccountType} ("revenue" vs "expense" vs asset/liability/equity) — drives the
 *     favorable/unfavorable polarity of a variance.
 *   - {@link roundCentsHalfEven} from the shared money util (src/data/money.ts) — banker's rounding to the cent, the
 *     fleet-canonical money-rounding helper. Never re-derived here.
 *
 * Financial invariants (refuse-on-violation, fail loud; business/GSD.md §2.1,
 * [[feedback_hotel_financial_invariant_gate]]):
 *  - variance = actual − budget EXACTLY (reconciles both ways: actual = budget + variance).
 *  - variancePct = variance / budget; a zero budget yields `null` (NOT Infinity/NaN) — fail-soft on the
 *    percentage ONLY (the absolute variance is still exact and surfaced).
 *  - half-even (banker's) rounding to the cent on every dollar amount, via the imported helper.
 *  - period numbers are 1..12; periodAmounts arrays are length 12; every amount must be finite.
 *  - non-finite / out-of-range / unknown-account / duplicate-account / bad-length THROW — never a silent
 *    coercion or a swallowed catch.
 *  - rollups reconcile: annual-per-account = Σ its 12 periods; grand-total = Σ all account annuals
 *    (both budget and actual sides), computed on rounded period values so report Σ == displayed lines.
 *
 * PRISM synergy: the shop-ops producer is the QB books/reporting cycle — `GeneralLedgerEngine` posts the
 * real journal entries from invoices/payroll/job-costs, `FinancialReportSuiteEngine`/`getIncomeStatement`
 * derive period actuals, and THIS engine compares those actuals against the operator's plan. It also
 * feeds the networking-platform financial reporting surface (planned-vs-actual per shop is the core of a
 * marketplace shop's P&L health card).
 *
 * @milestone QB-PARITY-MS0 (Phase-4 #4)
 * @version 1.0.0
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire budget_create / budget_vs_actual in main post golf-merge. Wiring + golf-merging the worktree
// businessDispatcher.ts copy would CLOBBER ~438 main actions (regression). Add the BudgetEngine actions
// (ACTIONS enum + switch cases + lazy import) to MAIN businessDispatcher.ts AFTER this engine reaches
// main. Tracked in business/QUICKBOOKS-PARITY-PLAN.md §Status.

import { z } from "zod";
import { CHART_OF_ACCOUNTS, type Account, type AccountType } from "./GeneralLedgerEngine.js";
import { roundCentsHalfEven } from "../data/money.js";

// ============================================================================
// CONSTANTS (intrinsic to the QB monthly-budget contract; not physics/material)
// ============================================================================

/** A QB fiscal budget is exactly 12 monthly periods. */
export const BUDGET_PERIODS = 12;
const MIN_PERIOD = 1;
const MAX_PERIOD = BUDGET_PERIODS;

/** Canonical chart index: accountId → Account. Reuses GL's exported chart (no re-derivation). */
const ACCOUNT_INDEX: ReadonlyMap<string, Account> = new Map(
  CHART_OF_ACCOUNTS.map((a) => [a.id, a]),
);

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * A budget line: one account, 12 monthly amounts. Amounts may be negative (e.g. a contra-account or a
 * planned reversal) but must be finite; length is validated to be exactly 12 below.
 */
export const BudgetLineSchema = z.object({
  accountId: z.string().min(1, "accountId is required"),
  periodAmounts: z
    .array(z.number().finite("periodAmounts entries must be finite (no NaN/Infinity)"))
    .length(BUDGET_PERIODS, `periodAmounts must have exactly ${BUDGET_PERIODS} entries (one per month)`),
});
export type BudgetLineInput = z.input<typeof BudgetLineSchema>;

export const CreateBudgetInputSchema = z.object({
  budgetId: z.string().min(1, "budgetId is required"),
  fiscalYear: z.number().int().gte(1900).lte(9999),
  lines: z.array(BudgetLineSchema).min(1, "a budget needs at least one line"),
});
export type CreateBudgetInput = z.input<typeof CreateBudgetInputSchema>;

export const ActualEntrySchema = z.object({
  accountId: z.string().min(1, "accountId is required"),
  period: z
    .number()
    .int("period must be an integer 1..12")
    .gte(MIN_PERIOD, `period must be >= ${MIN_PERIOD}`)
    .lte(MAX_PERIOD, `period must be <= ${MAX_PERIOD}`),
  amount: z.number().finite("actual amount must be finite (no NaN/Infinity)"),
});
export type ActualEntryInput = z.input<typeof ActualEntrySchema>;

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/** A validated, per-account, per-period budget. periodAmounts are rounded to the cent. */
export interface Budget {
  budgetId: string;
  fiscalYear: number;
  lines: Array<{
    accountId: string;
    accountName: string;
    accountType: AccountType;
    /** length 12, indexed period-1..12 → array index 0..11; rounded to the cent (half-even). */
    periodAmounts: number[];
    /** Σ of the 12 period amounts, rounded. */
    annualBudget: number;
  }>;
  /** Σ of every line's annualBudget, rounded. */
  totalAnnualBudget: number;
  createdAt: string;
}

/** One cell of the budget-vs-actual report: a single account in a single period. */
export interface VarianceCell {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  /** period 1..12. */
  period: number;
  budget: number;
  actual: number;
  /** actual − budget, EXACT (rounded to the cent for display, reconciles both ways). */
  variance: number;
  /** variance / budget; `null` when budget == 0 (fail-soft — no Infinity/NaN). */
  variancePct: number | null;
  /**
   * Favorable when the variance helps the bottom line:
   *  - revenue: actual > budget (more revenue than planned) = favorable
   *  - expense: actual < budget (less spend than planned)   = favorable
   * For non-P&L accounts (asset/liability/equity) and a zero variance, this is "neutral".
   */
  favorability: "favorable" | "unfavorable" | "neutral";
}

/** Per-account annual rollup of the variance report. */
export interface AccountRollup {
  accountId: string;
  accountName: string;
  accountType: AccountType;
  annualBudget: number;
  annualActual: number;
  annualVariance: number;
  /** annualVariance / annualBudget; `null` when annualBudget == 0. */
  annualVariancePct: number | null;
  favorability: "favorable" | "unfavorable" | "neutral";
}

export interface BudgetVsActualReport {
  budgetId: string;
  fiscalYear: number;
  /** every account-period cell that has a budget or an actual (sorted by accountId then period). */
  cells: VarianceCell[];
  /** one row per account (sorted by accountId). */
  byAccount: AccountRollup[];
  grandTotal: {
    budget: number;
    actual: number;
    variance: number;
    /** variance / budget; `null` when total budget == 0. */
    variancePct: number | null;
  };
  generatedAt: string;
}

// ============================================================================
// ENGINE
// ============================================================================

export class BudgetEngine {
  /**
   * Build a validated per-account, per-period (12-month) budget (the QB "create budget" path).
   *
   * Validates: budgetId/fiscalYear present and in range; ≥1 line; each line's accountId EXISTS in the
   * GL chart of accounts (unknown → THROW); no duplicate accountId across lines (a dup would
   * silently double the plan); periodAmounts length === 12 and every entry finite. Period amounts are
   * rounded to the cent (half-even); the annual rollup is Σ of the rounded periods so it reconciles
   * exactly with the stored lines.
   *
   * @param input budgetId + fiscalYear + lines[{accountId, periodAmounts[12]}].
   * @returns the validated {@link Budget} with per-line annuals + a total annual.
   * @throws if validation fails (bad shape, unknown/duplicate account, non-finite, wrong length).
   */
  static createBudget(input: CreateBudgetInput): Budget {
    const parsed = CreateBudgetInputSchema.parse(input); // throws on shape/length/finite/range

    const seen = new Set<string>();
    const lines: Budget["lines"] = [];
    let totalAnnual = 0;

    for (const raw of parsed.lines) {
      const acct = ACCOUNT_INDEX.get(raw.accountId);
      if (!acct) {
        throw new Error(
          `BudgetEngine.createBudget: unknown accountId '${raw.accountId}' — not in the GL chart of accounts ` +
            `(reuse GeneralLedgerEngine.getChartOfAccounts(); budget=${parsed.budgetId})`,
        );
      }
      if (seen.has(raw.accountId)) {
        throw new Error(
          `BudgetEngine.createBudget: duplicate accountId '${raw.accountId}' — each account may appear once ` +
            `per budget (a duplicate silently doubles the plan; budget=${parsed.budgetId})`,
        );
      }
      seen.add(raw.accountId);

      const periodAmounts = raw.periodAmounts.map((n) => roundCentsHalfEven(n));
      const annualBudget = roundCentsHalfEven(periodAmounts.reduce((s, n) => s + n, 0));
      lines.push({
        accountId: raw.accountId,
        accountName: acct.name,
        accountType: acct.type,
        periodAmounts,
        annualBudget,
      });
      totalAnnual += annualBudget;
    }

    return {
      budgetId: parsed.budgetId,
      fiscalYear: parsed.fiscalYear,
      lines,
      totalAnnualBudget: roundCentsHalfEven(totalAnnual),
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Budget-vs-actual variance report (the QB "Budget vs. Actuals" report).
   *
   * Produces a per-account-per-period variance cell {budget, actual, variance, variancePct,
   * favorability}, an annual per-account rollup, and a grand total. Variance is `actual − budget`
   * EXACTLY (computed on rounded values so report sums match displayed lines, and reconciles both
   * ways). variancePct is `variance / budget`, with a ZERO budget producing `null` rather than
   * Infinity/NaN (fail-soft on the percentage only). Favorability is account-type aware (see
   * {@link VarianceCell}).
   *
   * Actuals are validated against the SAME GL chart: an actual for an account not in the budget AND
   * not in the chart THROWS; an actual for a chart account that simply was not budgeted is allowed
   * (budget 0 → variance = actual, variancePct null). Each actual's period is validated 1..12 and its
   * amount finite by the schema. A duplicate (accountId, period) actual is summed (multiple postings
   * in the same month), matching QB's "actuals are the sum of all transactions in the period".
   *
   * @param budget a {@link Budget} from {@link createBudget}.
   * @param actuals list of {accountId, period (1..12), amount} — typically derived from GL postings.
   * @returns the full {@link BudgetVsActualReport}.
   * @throws if the budget shape is invalid, or an actual references an account in neither the budget
   *         nor the chart, or an actual is out-of-range/non-finite.
   */
  static budgetVsActual(budget: Budget, actuals: ActualEntryInput[]): BudgetVsActualReport {
    if (!budget || typeof budget !== "object" || !Array.isArray(budget.lines)) {
      throw new Error("BudgetEngine.budgetVsActual: budget must be a Budget object with a lines array");
    }
    if (!Array.isArray(actuals)) {
      throw new Error("BudgetEngine.budgetVsActual: actuals must be an array");
    }

    // 1) Index the budget by account → period → amount (already rounded by createBudget).
    //    accountMeta also carries name/type for accounts that appear only on the budget side.
    const accountMeta = new Map<string, { name: string; type: AccountType }>();
    const budgetByAcct = new Map<string, number[]>();
    for (const line of budget.lines) {
      if (!Array.isArray(line.periodAmounts) || line.periodAmounts.length !== BUDGET_PERIODS) {
        throw new Error(
          `BudgetEngine.budgetVsActual: budget line '${line.accountId}' must have exactly ${BUDGET_PERIODS} periodAmounts`,
        );
      }
      accountMeta.set(line.accountId, { name: line.accountName, type: line.accountType });
      budgetByAcct.set(line.accountId, line.periodAmounts.slice());
    }

    // 2) Fold actuals into account → period → summed amount, validating each via the schema.
    const actualByAcct = new Map<string, number[]>();
    for (const rawActual of actuals) {
      const a = ActualEntrySchema.parse(rawActual); // throws on bad period / non-finite amount
      let meta = accountMeta.get(a.accountId);
      if (!meta) {
        const chartAcct = ACCOUNT_INDEX.get(a.accountId);
        if (!chartAcct) {
          throw new Error(
            `BudgetEngine.budgetVsActual: actual references unknown accountId '${a.accountId}' — ` +
              `not in the budget and not in the GL chart of accounts`,
          );
        }
        meta = { name: chartAcct.name, type: chartAcct.type };
        accountMeta.set(a.accountId, meta);
      }
      let arr = actualByAcct.get(a.accountId);
      if (!arr) {
        arr = new Array(BUDGET_PERIODS).fill(0);
        actualByAcct.set(a.accountId, arr);
      }
      const idx = a.period - 1; // period 1..12 → index 0..11
      arr[idx] = roundCentsHalfEven(arr[idx] + a.amount); // sum same-period postings, rounded
    }

    // 3) Build per-account-per-period cells across the union of budgeted + actual accounts.
    const allAccounts = new Set<string>([...budgetByAcct.keys(), ...actualByAcct.keys()]);
    const cells: VarianceCell[] = [];
    const byAccount: AccountRollup[] = [];
    let grandBudget = 0;
    let grandActual = 0;

    for (const accountId of allAccounts) {
      const meta = accountMeta.get(accountId)!; // guaranteed: came from budget or chart lookup above
      const budgetPeriods = budgetByAcct.get(accountId) ?? new Array(BUDGET_PERIODS).fill(0);
      const actualPeriods = actualByAcct.get(accountId) ?? new Array(BUDGET_PERIODS).fill(0);

      let annualBudget = 0;
      let annualActual = 0;
      for (let p = 0; p < BUDGET_PERIODS; p++) {
        const b = roundCentsHalfEven(budgetPeriods[p]);
        const act = roundCentsHalfEven(actualPeriods[p]);
        const variance = roundCentsHalfEven(act - b); // actual − budget, exact
        cells.push({
          accountId,
          accountName: meta.name,
          accountType: meta.type,
          period: p + 1,
          budget: b,
          actual: act,
          variance,
          variancePct: BudgetEngine.#variancePct(variance, b),
          favorability: BudgetEngine.#favorability(meta.type, variance),
        });
        annualBudget += b;
        annualActual += act;
      }

      annualBudget = roundCentsHalfEven(annualBudget);
      annualActual = roundCentsHalfEven(annualActual);
      const annualVariance = roundCentsHalfEven(annualActual - annualBudget);
      byAccount.push({
        accountId,
        accountName: meta.name,
        accountType: meta.type,
        annualBudget,
        annualActual,
        annualVariance,
        annualVariancePct: BudgetEngine.#variancePct(annualVariance, annualBudget),
        favorability: BudgetEngine.#favorability(meta.type, annualVariance),
      });
      grandBudget += annualBudget;
      grandActual += annualActual;
    }

    cells.sort((x, y) => x.accountId.localeCompare(y.accountId) || x.period - y.period);
    byAccount.sort((x, y) => x.accountId.localeCompare(y.accountId));

    grandBudget = roundCentsHalfEven(grandBudget);
    grandActual = roundCentsHalfEven(grandActual);
    const grandVariance = roundCentsHalfEven(grandActual - grandBudget);

    return {
      budgetId: budget.budgetId,
      fiscalYear: budget.fiscalYear,
      cells,
      byAccount,
      grandTotal: {
        budget: grandBudget,
        actual: grandActual,
        variance: grandVariance,
        variancePct: BudgetEngine.#variancePct(grandVariance, grandBudget),
      },
      generatedAt: new Date().toISOString(),
    };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /**
   * variancePct = variance / budget, rounded to 4 decimal places (a ratio, e.g. 0.1 = +10%).
   * A ZERO budget returns `null` — fail-soft on the percentage so we never emit Infinity/NaN. The
   * absolute variance is still exact and is surfaced separately on the cell.
   */
  static #variancePct(variance: number, budget: number): number | null {
    if (budget === 0) return null; // 0-budget → null, never Infinity/NaN
    const pct = variance / budget;
    if (!Number.isFinite(pct)) return null; // defensive (budget is finite & non-zero here)
    return Math.round(pct * 1e4) / 1e4;
  }

  /**
   * Favorability by account type:
   *   revenue: variance > 0 (more revenue than planned) = favorable; < 0 = unfavorable
   *   expense: variance < 0 (less spend than planned)    = favorable; > 0 = unfavorable
   *   other (asset/liability/equity) or zero variance    = neutral
   */
  static #favorability(type: AccountType, variance: number): "favorable" | "unfavorable" | "neutral" {
    if (variance === 0) return "neutral";
    if (type === "revenue") return variance > 0 ? "favorable" : "unfavorable";
    if (type === "expense") return variance < 0 ? "favorable" : "unfavorable";
    return "neutral";
  }
}

export const budgetEngine = BudgetEngine;
