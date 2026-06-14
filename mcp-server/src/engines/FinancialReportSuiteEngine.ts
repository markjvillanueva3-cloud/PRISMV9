/**
 * FinancialReportSuiteEngine — QuickBooks financial-report suite for the PRISM ERP
 * (galaxy:business, slot:hotel). QB-PARITY Phase-4 #3.
 *
 * GeneralLedgerEngine ALREADY ships the three core statements
 * (getTrialBalance / getIncomeStatement / getBalanceSheet) and the chart of
 * accounts. This engine is the LAYER ON TOP: it adds the QB report types the GL
 * LACKS, consuming GL journal entries (the same `JournalEntry[]` shape GL posts)
 * and the GL chart for account classification. It NEVER reimplements double-entry,
 * the chart, balance-validation, or the three base statements — those are reused.
 *
 * Reports added (the GL gap):
 *   - cashFlowStatement  — Statement of Cash Flows, 3 sections (operating /
 *     investing / financing) classified by GL account. Net change in cash MUST
 *     reconcile to the Cash (1000) account delta over the period — the CF
 *     integrity check THROWS on drift (a CF that does not tie to the cash
 *     account is a lie, never silently emitted).
 *   - salesByCustomer / salesByItem — grouped revenue rankings; each grouping's
 *     parts MUST sum to the grand total (reconcile-both-ways; THROW on drift).
 *   - plByClass          — P&L segmented by a QB "class" tag carried per journal
 *     entry (QB classes tag TRANSACTIONS, not accounts). Revenue/expense are
 *     routed by the GL account TYPE (reusing the chart), grouped by class tag.
 *   - comparativePeriods — two reports side-by-side with $ and % variance
 *     (variance = p2 − p1 exact; % = (p2−p1)/|p1| with a documented 0-base rule).
 *
 * Financial invariants (refuse-on-violation, fail loud):
 *   - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from
 *     SalesUseTaxEngine; never re-implemented, never inlined.
 *   - CF net-change-in-cash === ending Cash − beginning Cash (THROW on drift).
 *   - sales-by groupings sum to the grand total (THROW on drift).
 *   - comparative variance = p2 − p1 exact.
 *   - non-finite / NaN amounts THROW; never silently coerced.
 *   - account classification routes via the GL chart (CHART_OF_ACCOUNTS), never a
 *     duplicated chart.
 *
 * PRISM synergy: the shop-ops producer is the order→ship→invoice cycle —
 * `ShippingReceivingLogEngine` outbound births a `BillingEngine` invoice, posted
 * to the GL by `GeneralLedgerEngine`; this suite then renders the period's
 * QB-style books (cash flow, sales-by-customer/item, class P&L, period compares)
 * for the QuickBooks books/reporting cycle and the manufacturing-networking
 * platform's financial-reporting surface (buyer-facing shop financial health).
 *
 * @milestone QB-PARITY-MS0 Phase-4
 * @version 1.0.0
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire financial_report_cash_flow / financial_report_sales_by_customer / financial_report_sales_by_item /
// financial_report_pl_by_class / financial_report_comparative_periods in main post golf-merge.
import { z } from "zod";
import {
  CHART_OF_ACCOUNTS,
  type Account,
  type AccountType,
  type JournalEntry,
  type JournalLine,
} from "./GeneralLedgerEngine.js";
import { roundCentsHalfEven } from "../data/money.js";

// ============================================================================
// CONSTANTS — cash + section classification (derived from the GL chart, NOT
// duplicated; the account ids below are looked up against CHART_OF_ACCOUNTS).
// ============================================================================

/** The single Cash account in the GL chart. Net cash change is measured here. */
export const CASH_ACCOUNT_ID = "1000";

/** Reconciliation tolerance in dollars (one cent — floating-point safety). */
const RECONCILE_TOLERANCE = 0.005;

export type CashFlowSection = "operating" | "investing" | "financing";

/**
 * Account id → cash-flow section. Built from the GL chart's accounts:
 *   - investing: long-lived asset acquisition/disposal — Equipment (1500) and its
 *     contra Accumulated Depreciation (1600).
 *   - financing: capital structure — Long-term Debt (2500) and all equity (3xxx).
 *   - operating: everything else (AR/AP/inventory/tax/accrued payroll/revenue/expense).
 * Cash itself (1000) is excluded — it is the thing being explained, not a section.
 */
const INVESTING_ACCOUNTS: ReadonlySet<string> = new Set(["1500", "1600"]);
const FINANCING_ACCOUNTS: ReadonlySet<string> = new Set(["2500", "3000", "3100"]);

const ACCOUNT_INDEX: ReadonlyMap<string, Account> = new Map(
  CHART_OF_ACCOUNTS.map((a) => [a.id, a]),
);

/**
 * Classify a (non-cash) GL account into a cash-flow section. Investing/financing
 * are explicit sets derived from the chart; all other real accounts are operating.
 */
export function sectionForAccount(accountId: string): CashFlowSection {
  if (INVESTING_ACCOUNTS.has(accountId)) return "investing";
  if (FINANCING_ACCOUNTS.has(accountId)) return "financing";
  return "operating";
}

// ============================================================================
// SCHEMAS
// ============================================================================

const PeriodSchema = z.object({
  periodStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "periodStart must be YYYY-MM-DD"),
  periodEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "periodEnd must be YYYY-MM-DD"),
});
export type Period = z.input<typeof PeriodSchema>;

/** Optional opening Cash balance (cash on hand at periodStart, before the period's flows). */
const CashFlowOptsSchema = PeriodSchema.extend({
  openingCash: z.number().finite().default(0),
});
export type CashFlowOpts = z.input<typeof CashFlowOptsSchema>;

const InvoiceSchema = z.object({
  invoice_id: z.string().min(1),
  customer: z.string().min(1),
  amount: z.number().finite(),
});
export type SalesInvoice = z.input<typeof InvoiceSchema>;

const InvoiceLineSchema = z.object({
  invoice_id: z.string().optional(),
  item: z.string().min(1),
  amount: z.number().finite(),
  qty: z.number().finite().nonnegative().optional(),
});
export type SalesInvoiceLine = z.input<typeof InvoiceLineSchema>;

const ComparativeOptsSchema = z.object({
  p1Label: z.string().min(1).default("Period 1"),
  p2Label: z.string().min(1).default("Period 2"),
});
export type ComparativeOpts = z.input<typeof ComparativeOptsSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface CashFlowLine {
  account_id: string;
  account_name: string;
  /** Net cash effect attributable to this account over the period (signed). */
  amount: number;
}

export interface CashFlowSectionResult {
  section: CashFlowSection;
  lines: CashFlowLine[];
  subtotal: number;
}

export interface CashFlowStatement {
  period_start: string;
  period_end: string;
  operating: CashFlowSectionResult;
  investing: CashFlowSectionResult;
  financing: CashFlowSectionResult;
  net_change_in_cash: number;
  opening_cash: number;
  closing_cash: number;
  /** Independent measure: Σ(debit−credit) on the Cash account over the period. */
  cash_account_delta: number;
  reconciled: boolean;
}

export interface RankedGroup {
  key: string;
  amount: number;
  /** Share of the grand total in [0,1]; 0 when total is 0. */
  share: number;
}

export interface SalesRanking {
  groupBy: "customer" | "item";
  groups: RankedGroup[];
  total: number;
  groupCount: number;
  reconciled: boolean;
}

export interface PlByClassRow {
  classTag: string;
  total_revenue: number;
  total_expenses: number;
  net_income: number;
}

export interface PlByClassReport {
  period_start: string;
  period_end: string;
  rows: PlByClassRow[];
  grand_revenue: number;
  grand_expenses: number;
  grand_net_income: number;
  reconciled: boolean;
}

export interface VarianceRow {
  key: string;
  p1: number;
  p2: number;
  /** p2 − p1 (exact). */
  variance: number;
  /** (p2 − p1) / |p1| as a fraction; null when p1 is 0 (no defined % base). */
  variancePct: number | null;
}

export interface ComparativeReport {
  p1Label: string;
  p2Label: string;
  rows: VarianceRow[];
}

// ============================================================================
// ENGINE
// ============================================================================

/** A GL journal entry that may optionally carry a QB "class" tag for plByClass. */
export type ClassTaggedEntry = JournalEntry & { class_tag?: string };

export class FinancialReportSuiteEngine {
  // --------------------------------------------------------------------------
  // CASH FLOW STATEMENT
  // --------------------------------------------------------------------------

  /**
   * Statement of Cash Flows for a period, classified into operating / investing /
   * financing sections by GL account.
   *
   * Method: for every journal entry in the period that touches Cash (1000), the
   * cash movement (Σdebit−credit on the cash lines of that entry) is balanced by
   * the entry's NON-cash legs. Each non-cash leg's NET (debit−credit) is the
   * mirror of the cash it drove, so we attribute −(legNet) to that leg's section.
   * Because each cash-touching entry balances (GL invariant), the sum of all
   * attributed section amounts equals the total cash movement EXACTLY — making the
   * CF integrity check (Σ sections === cash-account delta) a provable identity,
   * not an approximation. We still re-derive the cash delta independently and
   * THROW if the two disagree (defends against malformed/unbalanced input entries).
   *
   * @param entries GL journal entries (the shape GeneralLedgerEngine posts).
   * @param opts periodStart/periodEnd (YYYY-MM-DD) + optional openingCash.
   * @returns the 3-section statement with net_change_in_cash reconciled to the
   *          independent cash-account delta.
   * @throws if any entry/line is non-finite, the period is invalid, or the section
   *         total fails to reconcile to the cash-account delta (the CF integrity check).
   */
  static cashFlowStatement(entries: JournalEntry[], opts: CashFlowOpts): CashFlowStatement {
    const o = CashFlowOptsSchema.parse(opts);
    if (o.periodStart > o.periodEnd) {
      throw new Error(
        `[financial-report] cashFlowStatement: periodStart ${o.periodStart} is after periodEnd ${o.periodEnd}`,
      );
    }
    const inPeriod = this.#entriesInRange(entries, o.periodStart, o.periodEnd);

    // Section accumulators keyed by account id.
    const sectionAcc: Record<CashFlowSection, Map<string, number>> = {
      operating: new Map(),
      investing: new Map(),
      financing: new Map(),
    };
    // Independent cash-account delta (the thing sections must reconcile to).
    let cashDelta = 0;

    for (const entry of inPeriod) {
      let entryCash = 0; // Σ(debit−credit) on cash lines of THIS entry
      const nonCashLegs: JournalLine[] = [];
      for (const line of entry.lines) {
        const net = this.#lineNet(line); // debit − credit, finite-validated
        if (line.account_id === CASH_ACCOUNT_ID) {
          entryCash += net;
        } else {
          nonCashLegs.push(line);
        }
      }
      if (entryCash === 0) continue; // entry did not move cash → not a cash-flow event
      cashDelta += entryCash;

      // Attribute the cash movement to the counterpart legs. Each non-cash leg's
      // contribution to cash is −(its net): a credit to Sales (revenue +) that is
      // matched by a debit to Cash means cash rose, attributed to operating as +.
      for (const leg of nonCashLegs) {
        const section = sectionForAccount(leg.account_id);
        const contribution = -this.#lineNet(leg);
        const acc = sectionAcc[section];
        acc.set(leg.account_id, (acc.get(leg.account_id) ?? 0) + contribution);
      }
    }

    const operating = this.#buildSection("operating", sectionAcc.operating);
    const investing = this.#buildSection("investing", sectionAcc.investing);
    const financing = this.#buildSection("financing", sectionAcc.financing);

    const netChange = roundCentsHalfEven(
      operating.subtotal + investing.subtotal + financing.subtotal,
    );
    const cashAccountDelta = roundCentsHalfEven(cashDelta);

    // CF INTEGRITY CHECK — net change in cash MUST equal the independent cash-account
    // delta. A drift means a non-cash leg landed in a section whose sign/attribution
    // was wrong, or an input entry was unbalanced. Fail loud — never emit a CF that
    // does not tie to the cash account.
    if (Math.abs(netChange - cashAccountDelta) > RECONCILE_TOLERANCE) {
      throw new Error(
        `[financial-report] cashFlowStatement CF integrity violation: section net change ` +
          `(${netChange}) != cash-account delta (${cashAccountDelta}) for ${o.periodStart}..${o.periodEnd}`,
      );
    }

    const openingCash = roundCentsHalfEven(o.openingCash);
    const closingCash = roundCentsHalfEven(openingCash + netChange);

    // Ending − beginning identity (the spec's reconciliation framing): closing −
    // opening must equal net change. This is algebraic given closing's definition,
    // but assert it so any future refactor that breaks it fails loud.
    if (Math.abs(closingCash - openingCash - netChange) > RECONCILE_TOLERANCE) {
      throw new Error(
        `[financial-report] cashFlowStatement: closing(${closingCash}) − opening(${openingCash}) ` +
          `!= net change(${netChange})`,
      );
    }

    return {
      period_start: o.periodStart,
      period_end: o.periodEnd,
      operating,
      investing,
      financing,
      net_change_in_cash: netChange,
      opening_cash: openingCash,
      closing_cash: closingCash,
      cash_account_delta: cashAccountDelta,
      reconciled: true,
    };
  }

  // --------------------------------------------------------------------------
  // SALES BY CUSTOMER / ITEM
  // --------------------------------------------------------------------------

  /**
   * Group invoice revenue by customer and rank descending. The summed group
   * amounts MUST equal the grand total (reconcile-both-ways) — THROW on drift.
   *
   * @param invoices invoices with { customer, amount } (amount = net revenue).
   * @returns ranking with per-customer totals, shares, and grand total.
   */
  static salesByCustomer(invoices: SalesInvoice[]): SalesRanking {
    if (!Array.isArray(invoices)) {
      throw new Error("[financial-report] salesByCustomer: invoices must be an array");
    }
    const grouped = new Map<string, number>();
    for (const raw of invoices) {
      const inv = InvoiceSchema.parse(raw); // throws on NaN/Infinity/missing fields
      const key = inv.customer.trim();
      grouped.set(key, roundCentsHalfEven((grouped.get(key) ?? 0) + inv.amount));
    }
    return this.#rank("customer", grouped, invoices.map((i) => i.amount));
  }

  /**
   * Group revenue by line item (SKU / service) and rank descending. Summed group
   * amounts MUST equal the grand total — THROW on drift.
   *
   * @param lines invoice line items with { item, amount }.
   * @returns ranking with per-item totals, shares, and grand total.
   */
  static salesByItem(lines: SalesInvoiceLine[]): SalesRanking {
    if (!Array.isArray(lines)) {
      throw new Error("[financial-report] salesByItem: lines must be an array");
    }
    const grouped = new Map<string, number>();
    for (const raw of lines) {
      const ln = InvoiceLineSchema.parse(raw);
      const key = ln.item.trim();
      grouped.set(key, roundCentsHalfEven((grouped.get(key) ?? 0) + ln.amount));
    }
    return this.#rank("item", grouped, lines.map((l) => l.amount));
  }

  // --------------------------------------------------------------------------
  // P&L BY CLASS
  // --------------------------------------------------------------------------

  /**
   * Profit & loss segmented by a QB "class" tag. QB classes tag TRANSACTIONS, so
   * the tag is read from each journal entry (`class_tag`); entries without a tag
   * fall into the supplied `untaggedLabel`. Revenue/expense legs are routed by the
   * GL account TYPE (reusing CHART_OF_ACCOUNTS — revenue rises on credits, expense
   * on debits, matching getIncomeStatement). Per-class net income sums to the grand
   * net income — THROW on drift.
   *
   * @param entries class-tagged GL journal entries.
   * @param period periodStart/periodEnd (YYYY-MM-DD).
   * @param untaggedLabel bucket for entries lacking a class_tag (default "Unclassified").
   * @returns P&L rows per class plus reconciled grand totals.
   */
  static plByClass(
    entries: ClassTaggedEntry[],
    period: Period,
    untaggedLabel = "Unclassified",
  ): PlByClassReport {
    const p = PeriodSchema.parse(period);
    if (p.periodStart > p.periodEnd) {
      throw new Error(
        `[financial-report] plByClass: periodStart ${p.periodStart} is after periodEnd ${p.periodEnd}`,
      );
    }
    const inPeriod = this.#entriesInRange(entries, p.periodStart, p.periodEnd) as ClassTaggedEntry[];

    const byClass = new Map<string, { rev: number; exp: number }>();
    for (const entry of inPeriod) {
      const tag = (entry.class_tag && entry.class_tag.trim()) || untaggedLabel;
      const bucket = byClass.get(tag) ?? { rev: 0, exp: 0 };
      for (const line of entry.lines) {
        const acct = ACCOUNT_INDEX.get(line.account_id);
        if (!acct) continue; // unknown account → not part of the P&L surface
        const net = this.#lineNet(line);
        if (acct.type === "revenue") bucket.rev += -net; // revenue rises on credit (net<0)
        else if (acct.type === "expense") bucket.exp += net; // expense rises on debit (net>0)
      }
      byClass.set(tag, bucket);
    }

    const rows: PlByClassRow[] = [];
    let grandRev = 0;
    let grandExp = 0;
    for (const [tag, b] of byClass) {
      const rev = roundCentsHalfEven(b.rev);
      const exp = roundCentsHalfEven(b.exp);
      rows.push({
        classTag: tag,
        total_revenue: rev,
        total_expenses: exp,
        net_income: roundCentsHalfEven(rev - exp),
      });
      grandRev += rev;
      grandExp += exp;
    }
    rows.sort((a, b) => b.net_income - a.net_income || a.classTag.localeCompare(b.classTag));

    const grandRevenue = roundCentsHalfEven(grandRev);
    const grandExpenses = roundCentsHalfEven(grandExp);
    const grandNet = roundCentsHalfEven(grandRevenue - grandExpenses);

    const summedNet = roundCentsHalfEven(rows.reduce((s, r) => s + r.net_income, 0));
    if (Math.abs(summedNet - grandNet) > RECONCILE_TOLERANCE) {
      throw new Error(
        `[financial-report] plByClass: per-class net (${summedNet}) != grand net (${grandNet})`,
      );
    }

    return {
      period_start: p.periodStart,
      period_end: p.periodEnd,
      rows,
      grand_revenue: grandRevenue,
      grand_expenses: grandExpenses,
      grand_net_income: grandNet,
      reconciled: true,
    };
  }

  // --------------------------------------------------------------------------
  // COMPARATIVE PERIODS
  // --------------------------------------------------------------------------

  /**
   * Two-period side-by-side comparison with $ and % variance. Each report is a
   * flat key→amount map (e.g. account totals, sales-by-customer totals — the
   * caller flattens the report to compare). Variance = p2 − p1 EXACTLY; % is
   * (p2−p1)/|p1| as a fraction (null when p1 is 0 — no defined % base, surfaced
   * rather than fabricated as ∞ or 100%).
   *
   * @param p1 period-1 key→amount map.
   * @param p2 period-2 key→amount map.
   * @param opts optional labels.
   * @returns one VarianceRow per key present in EITHER period (missing → 0).
   * @throws on any non-finite amount.
   */
  static comparativePeriods(
    p1: Record<string, number>,
    p2: Record<string, number>,
    opts: ComparativeOpts = {},
  ): ComparativeReport {
    const o = ComparativeOptsSchema.parse(opts);
    if (p1 == null || typeof p1 !== "object" || p2 == null || typeof p2 !== "object") {
      throw new Error("[financial-report] comparativePeriods: p1 and p2 must be key→amount maps");
    }
    const keys = new Set<string>([...Object.keys(p1), ...Object.keys(p2)]);
    const rows: VarianceRow[] = [];
    for (const key of keys) {
      const v1 = this.#finite(p1[key] ?? 0, `comparativePeriods p1["${key}"]`);
      const v2 = this.#finite(p2[key] ?? 0, `comparativePeriods p2["${key}"]`);
      const a1 = roundCentsHalfEven(v1);
      const a2 = roundCentsHalfEven(v2);
      const variance = roundCentsHalfEven(a2 - a1); // p2 − p1 exact
      const variancePct = a1 === 0 ? null : (a2 - a1) / Math.abs(a1);
      rows.push({ key, p1: a1, p2: a2, variance, variancePct });
    }
    rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance) || a.key.localeCompare(b.key));
    return { p1Label: o.p1Label, p2Label: o.p2Label, rows };
  }

  // --------------------------------------------------------------------------
  // INTERNALS
  // --------------------------------------------------------------------------

  /** debit − credit for a line; throws on non-finite values. */
  static #lineNet(line: JournalLine): number {
    const debit = this.#finite(line.debit, `line ${line.account_id} debit`);
    const credit = this.#finite(line.credit, `line ${line.account_id} credit`);
    return debit - credit;
  }

  static #finite(n: number, where: string): number {
    if (typeof n !== "number" || !Number.isFinite(n)) {
      throw new Error(`[financial-report] non-finite amount at ${where}: ${n}`);
    }
    return n;
  }

  static #entriesInRange(entries: JournalEntry[], start: string, end: string): JournalEntry[] {
    if (!Array.isArray(entries)) {
      throw new Error("[financial-report] entries must be an array");
    }
    return entries.filter((e) => {
      if (!e || typeof e.date !== "string" || !Array.isArray(e.lines)) {
        throw new Error(`[financial-report] malformed journal entry: ${JSON.stringify(e)}`);
      }
      // Honor the GL `posted` flag when present (unposted drafts are excluded);
      // entries lacking the flag are treated as posted (caller-supplied fixtures).
      const posted = e.posted === undefined ? true : e.posted;
      return posted && e.date >= start && e.date <= end;
    });
  }

  static #buildSection(section: CashFlowSection, acc: Map<string, number>): CashFlowSectionResult {
    const lines: CashFlowLine[] = [];
    let subtotal = 0;
    for (const [accountId, amount] of acc) {
      const rounded = roundCentsHalfEven(amount);
      if (rounded === 0) continue; // suppress zero-net accounts (no cash effect)
      const acct = ACCOUNT_INDEX.get(accountId);
      lines.push({
        account_id: accountId,
        account_name: acct?.name ?? accountId,
        amount: rounded,
      });
      subtotal += rounded;
    }
    lines.sort((a, b) => a.account_id.localeCompare(b.account_id));
    return { section, lines, subtotal: roundCentsHalfEven(subtotal) };
  }

  static #rank(
    groupBy: "customer" | "item",
    grouped: Map<string, number>,
    rawAmounts: number[],
  ): SalesRanking {
    // Grand total from the RAW amounts (independent of the grouping path) so the
    // reconcile check is a genuine cross-check, not a tautology.
    let rawTotal = 0;
    for (const a of rawAmounts) {
      rawTotal += this.#finite(a, `${groupBy} ranking raw amount`);
    }
    const total = roundCentsHalfEven(rawTotal);

    const groups: RankedGroup[] = [];
    let groupedSum = 0;
    for (const [key, amount] of grouped) {
      groups.push({
        key,
        amount,
        share: total === 0 ? 0 : amount / total,
      });
      groupedSum += amount;
    }
    groups.sort((a, b) => b.amount - a.amount || a.key.localeCompare(b.key));

    // Reconcile-both-ways: Σ group amounts === grand total.
    if (Math.abs(roundCentsHalfEven(groupedSum) - total) > RECONCILE_TOLERANCE) {
      throw new Error(
        `[financial-report] salesBy${groupBy}: grouped sum (${roundCentsHalfEven(groupedSum)}) ` +
          `!= grand total (${total})`,
      );
    }

    return { groupBy, groups, total, groupCount: groups.length, reconciled: true };
  }
}

export const financialReportSuiteEngine = FinancialReportSuiteEngine;
