/**
 * GeneralLedgerEngine — Double-entry bookkeeping for the PRISM ERP layer
 *
 * Implements a real general ledger with:
 *   - Standard chart of accounts (manufacturing-oriented)
 *   - Double-entry journal entries (sum(debits) === sum(credits))
 *   - Structured entry recorders for common business events:
 *       recordInvoice, recordPayment, recordPurchase, recordPayroll,
 *       recordWipToCogs, createJournalEntry (generic)
 *   - Derived financial statements:
 *       getTrialBalance, getIncomeStatement, getBalanceSheet
 *
 * Accounting invariants (enforced):
 *   - Every journal entry balances: Σdebits === Σcredits
 *   - Trial balance total debits === total credits (assuming balanced entries)
 *   - Accounting equation: Assets = Liabilities + Equity + (Revenue − Expenses)
 *
 * Persistence:
 *   state/shared/general-ledger-state.json with schemaVersion=1.
 *   Atomic write via utils/atomicSessionWrite.atomicWriteJson.
 *
 * References:
 *   - FASB Accounting Standards Codification
 *   - Machinery's Handbook 31st (chart of accounts for machine shops)
 *
 * @milestone LATHE-MASTER (cross-cut ERP)
 * @version 1.0.0
 */

import { z } from "zod";
import { existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { atomicWriteJson } from "../utils/atomicSessionWrite.js";

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalBalance = "debit" | "credit";

export interface Account {
  id: string;        // e.g. "1000"
  name: string;      // e.g. "Cash"
  type: AccountType;
  normal_balance: NormalBalance;
  category: string;  // "current_asset", "fixed_asset", "current_liability", ...
}

/**
 * Standard chart of accounts for a manufacturing shop (JM Die reference).
 * Asset/expense accounts have normal debit balance; liability/equity/revenue
 * have normal credit balance.
 */
export const CHART_OF_ACCOUNTS: ReadonlyArray<Account> = [
  // Assets (1000s)
  { id: "1000", name: "Cash",                       type: "asset",     normal_balance: "debit",  category: "current_asset" },
  { id: "1200", name: "Accounts Receivable",        type: "asset",     normal_balance: "debit",  category: "current_asset" },
  { id: "1300", name: "WIP Inventory",              type: "asset",     normal_balance: "debit",  category: "current_asset" },
  { id: "1310", name: "Finished Goods Inventory",   type: "asset",     normal_balance: "debit",  category: "current_asset" },
  { id: "1320", name: "Raw Materials Inventory",    type: "asset",     normal_balance: "debit",  category: "current_asset" },
  { id: "1500", name: "Equipment",                  type: "asset",     normal_balance: "debit",  category: "fixed_asset" },
  { id: "1600", name: "Accumulated Depreciation",   type: "asset",     normal_balance: "credit", category: "contra_asset" },
  // Liabilities (2000s)
  { id: "2000", name: "Accounts Payable",           type: "liability", normal_balance: "credit", category: "current_liability" },
  { id: "2100", name: "Tax Payable",                type: "liability", normal_balance: "credit", category: "current_liability" },
  { id: "2200", name: "Accrued Payroll",            type: "liability", normal_balance: "credit", category: "current_liability" },
  { id: "2500", name: "Long-term Debt",             type: "liability", normal_balance: "credit", category: "long_term_liability" },
  // Equity (3000s)
  { id: "3000", name: "Owner's Equity",             type: "equity",    normal_balance: "credit", category: "equity" },
  { id: "3100", name: "Retained Earnings",          type: "equity",    normal_balance: "credit", category: "equity" },
  // Revenue (4000s)
  { id: "4000", name: "Sales Revenue",              type: "revenue",   normal_balance: "credit", category: "operating_revenue" },
  { id: "4100", name: "Service Revenue",            type: "revenue",   normal_balance: "credit", category: "operating_revenue" },
  // Expenses (5000s)
  { id: "5000", name: "Cost of Goods Sold",         type: "expense",   normal_balance: "debit",  category: "cogs" },
  { id: "5100", name: "Materials Expense",          type: "expense",   normal_balance: "debit",  category: "operating_expense" },
  { id: "5200", name: "Payroll Expense",            type: "expense",   normal_balance: "debit",  category: "operating_expense" },
  { id: "5300", name: "Payroll Tax Expense",        type: "expense",   normal_balance: "debit",  category: "operating_expense" },
  { id: "5400", name: "Depreciation Expense",       type: "expense",   normal_balance: "debit",  category: "operating_expense" },
  { id: "5500", name: "Operating Expenses",         type: "expense",   normal_balance: "debit",  category: "operating_expense" },
  { id: "5600", name: "Tools & Consumables Expense",type: "expense",   normal_balance: "debit",  category: "operating_expense" },
];

const ACCOUNT_INDEX = new Map<string, Account>(CHART_OF_ACCOUNTS.map((a) => [a.id, a]));

/** Maps a recordPurchase category to the target expense or asset account. */
const PURCHASE_CATEGORY_TO_ACCOUNT: Record<string, string> = {
  materials: "1320",      // Raw Materials Inventory
  tools: "5600",          // Tools & Consumables Expense
  consumables: "5600",    // Tools & Consumables Expense
  equipment: "1500",      // Equipment (capital)
  services: "5500",       // Operating Expenses
  other: "5500",          // Operating Expenses
};

// ============================================================================
// SCHEMAS
// ============================================================================

export const JournalLineSchema = z.object({
  account_id: z.string().min(1),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  description: z.string().optional(),
});
export type JournalLine = z.infer<typeof JournalLineSchema>;

export const CreateJournalEntryInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  description: z.string().min(1),
  source: z.enum(["manual", "invoice", "payment", "purchase", "payroll", "wip_to_cogs", "depreciation", "adjustment"]),
  reference_id: z.string().optional(),
  lines: z.array(JournalLineSchema).min(2),
  auto_post: z.boolean().optional(),
});

export const RecordInvoiceInputSchema = z.object({
  invoice_id: z.string().min(1),
  amount: z.number().positive().finite(),
  tax: z.number().min(0).finite().optional().default(0),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const RecordPaymentInputSchema = z.object({
  invoice_id: z.string().min(1),
  amount: z.number().positive().finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const RecordPurchaseInputSchema = z.object({
  po_id: z.string().min(1),
  amount: z.number().positive().finite(),
  tax: z.number().min(0).finite().optional().default(0),
  category: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const RecordPayrollInputSchema = z.object({
  period: z.string().min(1),
  gross: z.number().positive().finite(),
  taxes: z.number().min(0).finite(),
  net: z.number().positive().finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const RecordWipToCogsInputSchema = z.object({
  job_id: z.string().min(1),
  amount: z.number().positive().finite(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  source: string;
  reference_id?: string;
  lines: JournalLine[];
  posted: boolean;
  created_at: string;
}

export interface LedgerState {
  schemaVersion: 1;
  journal_entries: JournalEntry[];
  next_entry_seq: number;
  updated_at: string;
}

export interface TrialBalanceRow {
  account_id: string;
  account_name: string;
  type: AccountType;
  debit_total: number;
  credit_total: number;
  balance: number; // signed by normal_balance
}

export interface TrialBalance {
  as_of: string;
  rows: TrialBalanceRow[];
  total_debits: number;
  total_credits: number;
  balanced: boolean;
}

export interface IncomeStatement {
  period_start: string;
  period_end: string;
  revenue_lines: Array<{ account_id: string; account_name: string; amount: number }>;
  expense_lines: Array<{ account_id: string; account_name: string; amount: number }>;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
}

export interface BalanceSheet {
  as_of: string;
  assets: Array<{ account_id: string; account_name: string; amount: number }>;
  liabilities: Array<{ account_id: string; account_name: string; amount: number }>;
  equity: Array<{ account_id: string; account_name: string; amount: number }>;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  balanced: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

const DEFAULT_STATE_PATH = "H:/prism/state/shared/general-ledger-state.json";
const BALANCE_TOLERANCE = 0.01; // cents — floating-point safety for balance checks

class GeneralLedgerEngine {
  private state: LedgerState;
  private readonly statePath: string;

  constructor(statePath: string = DEFAULT_STATE_PATH) {
    this.statePath = statePath;
    this.state = this.loadState();
  }

  // --------------------------------------------------------------------------
  // Chart / discovery
  // --------------------------------------------------------------------------

  getChartOfAccounts(): ReadonlyArray<Account> {
    return CHART_OF_ACCOUNTS;
  }

  // --------------------------------------------------------------------------
  // Generic journal entry (double-entry validated)
  // --------------------------------------------------------------------------

  createJournalEntry(input: z.infer<typeof CreateJournalEntryInputSchema>): JournalEntry {
    const parsed = CreateJournalEntryInputSchema.parse(input);
    return this.postEntry({
      date: parsed.date,
      description: parsed.description,
      source: parsed.source,
      reference_id: parsed.reference_id,
      lines: parsed.lines,
    });
  }

  // --------------------------------------------------------------------------
  // Structured recorders for common business events
  // --------------------------------------------------------------------------

  /**
   * Customer invoice issued:
   *   DR 1200 Accounts Receivable (amount + tax)
   *   CR 4000 Sales Revenue (amount)
   *   CR 2100 Tax Payable (tax)
   */
  recordInvoice(input: z.infer<typeof RecordInvoiceInputSchema>): JournalEntry {
    const parsed = RecordInvoiceInputSchema.parse(input);
    const lines: JournalLine[] = [
      { account_id: "1200", debit: parsed.amount + parsed.tax, credit: 0, description: `Invoice ${parsed.invoice_id}` },
      { account_id: "4000", debit: 0, credit: parsed.amount, description: `Invoice ${parsed.invoice_id}` },
    ];
    if (parsed.tax > 0) {
      lines.push({ account_id: "2100", debit: 0, credit: parsed.tax, description: `Tax for invoice ${parsed.invoice_id}` });
    }
    return this.postEntry({
      date: parsed.date,
      description: `Invoice ${parsed.invoice_id} issued`,
      source: "invoice",
      reference_id: parsed.invoice_id,
      lines,
    });
  }

  /**
   * Customer payment received:
   *   DR 1000 Cash (amount)
   *   CR 1200 Accounts Receivable (amount)
   */
  recordPayment(input: z.infer<typeof RecordPaymentInputSchema>): JournalEntry {
    const parsed = RecordPaymentInputSchema.parse(input);
    return this.postEntry({
      date: parsed.date,
      description: `Payment for invoice ${parsed.invoice_id}`,
      source: "payment",
      reference_id: parsed.invoice_id,
      lines: [
        { account_id: "1000", debit: parsed.amount, credit: 0, description: `Payment ${parsed.invoice_id}` },
        { account_id: "1200", debit: 0, credit: parsed.amount, description: `Payment ${parsed.invoice_id}` },
      ],
    });
  }

  /**
   * Purchase order received:
   *   DR <category-mapped expense/asset> (amount)
   *   DR 2100 Tax Payable (tax) — contra, since paid tax is recoverable
   *   CR 2000 Accounts Payable (amount + tax)
   *
   * Categories mapped via PURCHASE_CATEGORY_TO_ACCOUNT. Unknown category
   * falls back to 5500 Operating Expenses.
   */
  recordPurchase(input: z.infer<typeof RecordPurchaseInputSchema>): JournalEntry {
    const parsed = RecordPurchaseInputSchema.parse(input);
    const expenseAcct = PURCHASE_CATEGORY_TO_ACCOUNT[parsed.category] ?? "5500";
    const lines: JournalLine[] = [
      { account_id: expenseAcct, debit: parsed.amount, credit: 0, description: `PO ${parsed.po_id}` },
    ];
    if (parsed.tax > 0) {
      // Input tax recoverable sits as debit to Tax Payable (offsets liability)
      lines.push({ account_id: "2100", debit: parsed.tax, credit: 0, description: `Input tax PO ${parsed.po_id}` });
    }
    lines.push({ account_id: "2000", debit: 0, credit: parsed.amount + parsed.tax, description: `PO ${parsed.po_id}` });
    return this.postEntry({
      date: parsed.date,
      description: `Purchase ${parsed.po_id} (${parsed.category})`,
      source: "purchase",
      reference_id: parsed.po_id,
      lines,
    });
  }

  /**
   * Payroll run:
   *   DR 5200 Payroll Expense (gross)
   *   CR 1000 Cash (net)
   *   CR 2100 Tax Payable (taxes)
   *
   * Invariant: gross === net + taxes. Throws if the invariant is violated.
   */
  recordPayroll(input: z.infer<typeof RecordPayrollInputSchema>): JournalEntry {
    const parsed = RecordPayrollInputSchema.parse(input);
    if (Math.abs(parsed.gross - (parsed.net + parsed.taxes)) > BALANCE_TOLERANCE) {
      throw new Error(
        `GeneralLedgerEngine.recordPayroll: gross (${parsed.gross}) must equal net (${parsed.net}) + taxes (${parsed.taxes})`,
      );
    }
    return this.postEntry({
      date: parsed.date,
      description: `Payroll ${parsed.period}`,
      source: "payroll",
      reference_id: parsed.period,
      lines: [
        { account_id: "5200", debit: parsed.gross, credit: 0, description: `Payroll ${parsed.period}` },
        { account_id: "1000", debit: 0, credit: parsed.net, description: `Net pay ${parsed.period}` },
        { account_id: "2100", debit: 0, credit: parsed.taxes, description: `Payroll taxes ${parsed.period}` },
      ],
    });
  }

  /**
   * Move WIP to COGS when finished job ships:
   *   DR 5000 Cost of Goods Sold (amount)
   *   CR 1300 WIP Inventory (amount)
   */
  recordWipToCogs(input: z.infer<typeof RecordWipToCogsInputSchema>): JournalEntry {
    const parsed = RecordWipToCogsInputSchema.parse(input);
    return this.postEntry({
      date: parsed.date,
      description: `WIP → COGS for job ${parsed.job_id}`,
      source: "wip_to_cogs",
      reference_id: parsed.job_id,
      lines: [
        { account_id: "5000", debit: parsed.amount, credit: 0, description: `COGS job ${parsed.job_id}` },
        { account_id: "1300", debit: 0, credit: parsed.amount, description: `WIP release job ${parsed.job_id}` },
      ],
    });
  }

  // --------------------------------------------------------------------------
  // Financial statements
  // --------------------------------------------------------------------------

  /**
   * Trial balance as of a given date (YYYY-MM-DD). Includes all posted entries
   * dated on or before as_of. Signed balance uses normal_balance:
   *   debit-normal: balance = debits − credits
   *   credit-normal: balance = credits − debits
   */
  getTrialBalance(asOf?: string): TrialBalance {
    const cutoff = asOf ?? new Date().toISOString().slice(0, 10);
    const entries = this.postedEntriesOnOrBefore(cutoff);

    const byAccount = new Map<string, { debit: number; credit: number }>();
    for (const e of entries) {
      for (const line of e.lines) {
        const cur = byAccount.get(line.account_id) ?? { debit: 0, credit: 0 };
        cur.debit += line.debit;
        cur.credit += line.credit;
        byAccount.set(line.account_id, cur);
      }
    }

    const rows: TrialBalanceRow[] = [];
    let totalDebit = 0;
    let totalCredit = 0;
    for (const [accountId, totals] of byAccount) {
      const acct = ACCOUNT_INDEX.get(accountId);
      const name = acct?.name ?? accountId;
      const normal = acct?.normal_balance ?? "debit";
      const balance = normal === "debit" ? totals.debit - totals.credit : totals.credit - totals.debit;
      rows.push({
        account_id: accountId,
        account_name: name,
        type: acct?.type ?? "asset",
        debit_total: round2(totals.debit),
        credit_total: round2(totals.credit),
        balance: round2(balance),
      });
      totalDebit += totals.debit;
      totalCredit += totals.credit;
    }
    rows.sort((a, b) => a.account_id.localeCompare(b.account_id));

    return {
      as_of: cutoff,
      rows,
      total_debits: round2(totalDebit),
      total_credits: round2(totalCredit),
      balanced: Math.abs(totalDebit - totalCredit) < BALANCE_TOLERANCE,
    };
  }

  /** Income statement over a period: total_revenue − total_expenses = net_income. */
  getIncomeStatement(periodStart: string, periodEnd: string): IncomeStatement {
    const entries = this.postedEntriesInRange(periodStart, periodEnd);

    const byAccount = new Map<string, { debit: number; credit: number }>();
    for (const e of entries) {
      for (const line of e.lines) {
        const cur = byAccount.get(line.account_id) ?? { debit: 0, credit: 0 };
        cur.debit += line.debit;
        cur.credit += line.credit;
        byAccount.set(line.account_id, cur);
      }
    }

    const revenueLines: IncomeStatement["revenue_lines"] = [];
    const expenseLines: IncomeStatement["expense_lines"] = [];

    for (const [accountId, totals] of byAccount) {
      const acct = ACCOUNT_INDEX.get(accountId);
      if (!acct) continue;
      if (acct.type === "revenue") {
        revenueLines.push({
          account_id: accountId,
          account_name: acct.name,
          amount: round2(totals.credit - totals.debit), // revenue rises on credits
        });
      } else if (acct.type === "expense") {
        expenseLines.push({
          account_id: accountId,
          account_name: acct.name,
          amount: round2(totals.debit - totals.credit), // expenses rise on debits
        });
      }
    }
    revenueLines.sort((a, b) => a.account_id.localeCompare(b.account_id));
    expenseLines.sort((a, b) => a.account_id.localeCompare(b.account_id));

    const totalRevenue = revenueLines.reduce((s, l) => s + l.amount, 0);
    const totalExpenses = expenseLines.reduce((s, l) => s + l.amount, 0);

    return {
      period_start: periodStart,
      period_end: periodEnd,
      revenue_lines: revenueLines,
      expense_lines: expenseLines,
      total_revenue: round2(totalRevenue),
      total_expenses: round2(totalExpenses),
      net_income: round2(totalRevenue - totalExpenses),
    };
  }

  /**
   * Net-margin trend over recent periods for the ERP "margin-trends" dashboard. Composes the
   * (already-correct) income statement per period -- net_margin_pct = net_income / total_revenue
   * * 100, null when a period has no revenue. Returns { data_available:false } when NO period has
   * posted revenue (honest empty, mirrors value_stream_map -- never fake zeros).
   *
   * NOTE: this is NET margin (net_income / revenue). GROSS margin (revenue - COGS) is intentionally
   * NOT computed -- the chart of accounts types every expense as "expense" with no COGS subtype to
   * split on, so a real gross-margin split needs COGS account categorization (a documented follow-up,
   * not faked here).
   *
   * @param opts.months  trailing calendar months to report (default 6); ignored when periods given
   * @param opts.asOf    end date (YYYY-MM-DD) of the trailing window (default today)
   * @param opts.periods explicit [{label,start,end}] periods -- overrides months/asOf (used by tests)
   */
  marginTrends(opts: {
    months?: number;
    asOf?: string;
    periods?: Array<{ label: string; start: string; end: string }>;
  } = {}): {
    data_available: boolean;
    generated_at: string;
    metric: "net_margin";
    periods: Array<{
      label: string;
      period_start: string;
      period_end: string;
      total_revenue: number;
      total_expenses: number;
      net_income: number;
      net_margin_pct: number | null;
    }>;
    avg_net_margin_pct: number | null;
    message?: string;
  } {
    const round1 = (n: number): number => Math.round(n * 10) / 10;
    // Cap at 60 months (5y) so an untrusted ?months= can't trigger N unbounded ledger scans.
    const months = Math.min(60, Number(opts.months) > 0 ? Math.floor(Number(opts.months)) : 6);
    const periods = opts.periods ?? this.buildTrailingMonths(months, opts.asOf);

    const rows = periods.map((p) => {
      const is = this.getIncomeStatement(p.start, p.end);
      return {
        label: p.label,
        period_start: p.start,
        period_end: p.end,
        total_revenue: is.total_revenue,
        total_expenses: is.total_expenses,
        net_income: is.net_income,
        net_margin_pct: is.total_revenue !== 0 ? round1((is.net_income / is.total_revenue) * 100) : null,
      };
    });

    const margins = rows.map((r) => r.net_margin_pct).filter((m): m is number => m !== null);
    if (rows.every((r) => r.total_revenue === 0)) {
      return {
        data_available: false,
        generated_at: new Date().toISOString(),
        metric: "net_margin",
        periods: rows,
        avg_net_margin_pct: null,
        message: "No posted revenue in the requested periods.",
      };
    }
    return {
      data_available: true,
      generated_at: new Date().toISOString(),
      metric: "net_margin",
      periods: rows,
      avg_net_margin_pct: margins.length ? round1(margins.reduce((s, m) => s + m, 0) / margins.length) : null,
    };
  }

  /**
   * Direct-method cash-flow summary over recent periods for the ERP "cash-flow" dashboard. For each
   * period it sums posted movements of the Cash account(s): a debit to cash is an INFLOW, a credit an
   * OUTFLOW; net_cash_flow = inflow - outflow. Returns { data_available:false } when NO period has any
   * cash movement (honest empty -- no fake zeros).
   *
   * NOTE: this is TOTAL net cash flow. An operating/investing/financing classification is intentionally
   * NOT computed here -- it requires categorising each entry's counterpart account, a documented
   * follow-up (not faked).
   *
   * @param opts.months  trailing calendar months (default 6, capped 60); ignored when periods given
   * @param opts.asOf    end date (YYYY-MM-DD) of the window (default today)
   * @param opts.periods explicit [{label,start,end}] periods -- overrides months/asOf (used by tests)
   */
  cashFlowSummary(opts: {
    months?: number;
    asOf?: string;
    periods?: Array<{ label: string; start: string; end: string }>;
  } = {}): {
    data_available: boolean;
    generated_at: string;
    cash_accounts: string[];
    periods: Array<{
      label: string;
      period_start: string;
      period_end: string;
      cash_inflow: number;
      cash_outflow: number;
      net_cash_flow: number;
    }>;
    total_net_cash_flow: number;
    message?: string;
  } {
    const months = Math.min(60, Number(opts.months) > 0 ? Math.floor(Number(opts.months)) : 6);
    const periods = opts.periods ?? this.buildTrailingMonths(months, opts.asOf);
    const cashIds = CHART_OF_ACCOUNTS.filter((a) => a.type === "asset" && /\bcash\b/i.test(a.name)).map((a) => a.id);
    const cashSet = new Set(cashIds);

    const rows = periods.map((p) => {
      let inflow = 0;
      let outflow = 0;
      for (const e of this.postedEntriesInRange(p.start, p.end)) {
        for (const line of e.lines) {
          if (cashSet.has(line.account_id)) {
            inflow += line.debit;
            outflow += line.credit;
          }
        }
      }
      return {
        label: p.label,
        period_start: p.start,
        period_end: p.end,
        cash_inflow: round2(inflow),
        cash_outflow: round2(outflow),
        net_cash_flow: round2(inflow - outflow),
      };
    });

    const hasMovement = rows.some((r) => r.cash_inflow !== 0 || r.cash_outflow !== 0);
    return {
      data_available: hasMovement,
      generated_at: new Date().toISOString(),
      cash_accounts: cashIds,
      periods: rows,
      total_net_cash_flow: round2(rows.reduce((s, r) => s + r.net_cash_flow, 0)),
      ...(hasMovement ? {} : { message: "No cash movement in the requested periods." }),
    };
  }

  /**
   * Revenue forecast for the ERP "revenue-forecast" dashboard. Fits a least-squares LINEAR TREND to the
   * trailing `lookbackMonths` of REAL monthly revenue (from getIncomeStatement) and projects the next
   * `horizonMonths` forward at that trend (clamped >= 0 -- revenue can't be negative). Returns
   * { data_available:false } when the lookback window has no posted revenue (cannot forecast from nothing).
   *
   * R12: this is a TREND/RUN-RATE projection of historical BOOKED revenue -- NOT a demand model, sales
   * pipeline, or order-book forecast. method = "linear_trend_runrate".
   *
   * @param opts.lookbackMonths trailing months of history to fit (default 6, capped 60)
   * @param opts.horizonMonths  future months to project (default 3, capped 24)
   * @param opts.asOf           end of history / start of forecast (default today)
   */
  revenueForecast(opts: { lookbackMonths?: number; horizonMonths?: number; asOf?: string } = {}): {
    data_available: boolean;
    generated_at: string;
    method: "linear_trend_runrate";
    lookback_months: number;
    horizon_months: number;
    avg_monthly_revenue: number;
    trend_slope_per_month: number;
    history: Array<{ label: string; revenue: number }>;
    forecast: Array<{ label: string; projected_revenue: number }>;
    message?: string;
  } {
    const lookback = Math.min(60, Number(opts.lookbackMonths) > 0 ? Math.floor(Number(opts.lookbackMonths)) : 6);
    const horizon = Math.min(24, Number(opts.horizonMonths) > 0 ? Math.floor(Number(opts.horizonMonths)) : 3);
    const history = this.buildTrailingMonths(lookback, opts.asOf).map((p) => ({
      label: p.label,
      revenue: this.getIncomeStatement(p.start, p.end).total_revenue,
    }));

    if (history.every((h) => h.revenue === 0)) {
      return {
        data_available: false, generated_at: new Date().toISOString(), method: "linear_trend_runrate",
        lookback_months: lookback, horizon_months: horizon, avg_monthly_revenue: 0, trend_slope_per_month: 0,
        history: history.map((h) => ({ label: h.label, revenue: round2(h.revenue) })), forecast: [],
        message: "No posted revenue in the lookback window -- cannot forecast.",
      };
    }

    // Least-squares linear fit y = intercept + slope*x over x = 0..n-1.
    const n = history.length;
    const ys = history.map((h) => h.revenue);
    const xbar = (n - 1) / 2;
    const ybar = ys.reduce((s, y) => s + y, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (i - xbar) * (ys[i] - ybar);
      den += (i - xbar) ** 2;
    }
    const slope = den !== 0 ? num / den : 0;
    const intercept = ybar - slope * xbar;

    const forecast = this.buildForwardMonths(horizon, opts.asOf).map((label, k) => ({
      label,
      projected_revenue: round2(Math.max(0, intercept + slope * (n + k))),
    }));

    return {
      data_available: true, generated_at: new Date().toISOString(), method: "linear_trend_runrate",
      lookback_months: lookback, horizon_months: horizon,
      avg_monthly_revenue: round2(ybar), trend_slope_per_month: round2(slope),
      history: history.map((h) => ({ label: h.label, revenue: round2(h.revenue) })),
      forecast,
    };
  }

  /** Build the next `n` forward calendar-month labels (UTC) AFTER the asOf month (default today). */
  private buildForwardMonths(n: number, asOf?: string): string[] {
    const validAsOf = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf);
    const ref = validAsOf ? new Date(`${asOf}T00:00:00.000Z`) : new Date();
    const out: string[] = [];
    for (let k = 1; k <= n; k++) {
      const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() + k, 1));
      out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
    }
    return out;
  }

  /** Build the last `n` trailing calendar months (UTC) as {label:"YYYY-MM", start, end} date strings. */
  private buildTrailingMonths(n: number, asOf?: string): Array<{ label: string; start: string; end: string }> {
    // Ignore a malformed asOf (would yield NaN-NaN labels) and fall back to today -- fail safe.
    const validAsOf = asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf);
    const ref = validAsOf ? new Date(`${asOf}T00:00:00.000Z`) : new Date();
    const out: Array<{ label: string; start: string; end: string }> = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - i, 1));
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      const mm = String(m + 1).padStart(2, "0");
      const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
      out.push({ label: `${y}-${mm}`, start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}` });
    }
    return out;
  }

  /**
   * Balance sheet as of a date. Balanced iff assets = liabilities + equity + retained earnings.
   * Retained earnings are computed as cumulative net income from all periods.
   */
  getBalanceSheet(asOf?: string): BalanceSheet {
    const cutoff = asOf ?? new Date().toISOString().slice(0, 10);
    const tb = this.getTrialBalance(cutoff);

    const assets: BalanceSheet["assets"] = [];
    const liabilities: BalanceSheet["liabilities"] = [];
    const equity: BalanceSheet["equity"] = [];

    for (const row of tb.rows) {
      if (row.type === "asset") {
        assets.push({ account_id: row.account_id, account_name: row.account_name, amount: row.balance });
      } else if (row.type === "liability") {
        liabilities.push({ account_id: row.account_id, account_name: row.account_name, amount: row.balance });
      } else if (row.type === "equity") {
        equity.push({ account_id: row.account_id, account_name: row.account_name, amount: row.balance });
      }
    }

    // Roll revenue − expenses into retained earnings (closing effect)
    const netIncome = this.getIncomeStatement("0000-01-01", cutoff).net_income;
    if (Math.abs(netIncome) > BALANCE_TOLERANCE) {
      equity.push({ account_id: "3100-RE", account_name: "Retained Earnings (period)", amount: round2(netIncome) });
    }

    const totalAssets = round2(assets.reduce((s, a) => s + a.amount, 0));
    const totalLiabilities = round2(liabilities.reduce((s, l) => s + l.amount, 0));
    const totalEquity = round2(equity.reduce((s, e) => s + e.amount, 0));

    return {
      as_of: cutoff,
      assets,
      liabilities,
      equity,
      total_assets: totalAssets,
      total_liabilities: totalLiabilities,
      total_equity: totalEquity,
      balanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < BALANCE_TOLERANCE,
    };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  private postEntry(entry: {
    date: string;
    description: string;
    source: string;
    reference_id?: string;
    lines: JournalLine[];
  }): JournalEntry {
    // Per-line sanity checks first so structural problems surface with
    // specific error messages before the aggregate balance check.
    for (const line of entry.lines) {
      if (!ACCOUNT_INDEX.has(line.account_id)) {
        throw new Error(`GeneralLedgerEngine: unknown account_id '${line.account_id}'`);
      }
      if (line.debit > 0 && line.credit > 0) {
        throw new Error(
          `GeneralLedgerEngine: line for account '${line.account_id}' has both debit and credit; split into two lines`,
        );
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new Error(`GeneralLedgerEngine: line for account '${line.account_id}' has zero debit and credit`);
      }
    }
    const { debitTotal, creditTotal } = this.sumLines(entry.lines);
    if (Math.abs(debitTotal - creditTotal) > BALANCE_TOLERANCE) {
      throw new Error(
        `GeneralLedgerEngine: journal entry unbalanced (debits=${debitTotal} credits=${creditTotal})`,
      );
    }
    const seq = this.state.next_entry_seq++;
    const journal: JournalEntry = {
      id: `je_${seq.toString().padStart(6, "0")}`,
      date: entry.date,
      description: entry.description,
      source: entry.source,
      reference_id: entry.reference_id,
      lines: entry.lines.map((l) => ({ ...l, debit: round2(l.debit), credit: round2(l.credit) })),
      posted: true,
      created_at: new Date().toISOString(),
    };
    this.state.journal_entries.push(journal);
    this.persist();
    return journal;
  }

  private sumLines(lines: JournalLine[]): { debitTotal: number; creditTotal: number } {
    let debitTotal = 0;
    let creditTotal = 0;
    for (const line of lines) {
      debitTotal += line.debit;
      creditTotal += line.credit;
    }
    return { debitTotal, creditTotal };
  }

  private postedEntriesOnOrBefore(cutoff: string): JournalEntry[] {
    return this.state.journal_entries.filter((e) => e.posted && e.date <= cutoff);
  }

  private postedEntriesInRange(start: string, end: string): JournalEntry[] {
    return this.state.journal_entries.filter((e) => e.posted && e.date >= start && e.date <= end);
  }

  private loadState(): LedgerState {
    if (!existsSync(this.statePath)) {
      return this.freshState();
    }
    try {
      const raw = readFileSync(this.statePath, "utf-8");
      const parsed = JSON.parse(raw) as LedgerState;
      if (parsed.schemaVersion !== 1) {
        throw new Error(`GeneralLedgerEngine: unsupported schemaVersion ${parsed.schemaVersion}`);
      }
      return parsed;
    } catch {
      // Corrupt → backup + reset
      const backupPath = `${this.statePath}.corrupt.bak`;
      try {
        const raw = readFileSync(this.statePath, "utf-8");
        atomicWriteJson(backupPath, { backup_at: new Date().toISOString(), raw });
      } catch {
        // swallow backup failure
      }
      return this.freshState();
    }
  }

  private freshState(): LedgerState {
    return {
      schemaVersion: 1,
      journal_entries: [],
      next_entry_seq: 1,
      updated_at: new Date().toISOString(),
    };
  }

  private persist(): void {
    this.state.updated_at = new Date().toISOString();
    const dir = dirname(this.statePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    atomicWriteJson(this.statePath, this.state);
  }

  /** TEST-ONLY: reset to fresh state. */
  __resetForTests(): void {
    this.state = this.freshState();
    this.persist();
  }

  /** TEST-ONLY: read-only state accessor. */
  __getState(): Readonly<LedgerState> {
    return this.state;
  }
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

export const generalLedgerEngine = new GeneralLedgerEngine();
export { GeneralLedgerEngine };
