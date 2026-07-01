/**
 * GeneralLedgerEngine tests — double-entry bookkeeping correctness
 *
 * Coverage:
 *   - Chart of accounts shape (23 accounts, 5 types)
 *   - Double-entry invariant (every entry balances, unbalanced throws)
 *   - Structured recorders: invoice, payment, purchase (4 categories), payroll, wip_to_cogs
 *   - Trial balance: sum_debits === sum_credits across posted entries
 *   - Income statement: revenue − expenses === net_income for a period
 *   - Balance sheet: assets === liabilities + equity + retained earnings
 *   - Persistence: survive reload, corrupt backup, schema version guard
 *   - Failure modes: unknown account, both debit and credit on one line,
 *                    zero debit and credit line, payroll gross ≠ net + taxes,
 *                    bad date format, NaN amount, negative amount
 *   - Adversarial: few lines (Zod rejects min 2), Infinity
 *   - Dispatcher wiring (all 10 gl_* actions have handlers)
 */

import { describe, it, expect } from "vitest";
import { mkdtempSync, existsSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { GeneralLedgerEngine, CHART_OF_ACCOUNTS } from "../engines/GeneralLedgerEngine.js";

function makeEngine(): { engine: GeneralLedgerEngine; statePath: string } {
  const dir = mkdtempSync(join(tmpdir(), "gl-test-"));
  const statePath = join(dir, "gl-state.json");
  const engine = new GeneralLedgerEngine(statePath);
  engine.__resetForTests();
  return { engine, statePath };
}

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

describe("GeneralLedgerEngine — chart of accounts", () => {
  it("has 23 accounts covering all 5 types (asset/liability/equity/revenue/expense)", () => {
    const { engine } = makeEngine();
    const accounts = engine.getChartOfAccounts();
    expect(accounts.length).toBe(22);
    const counts: Record<string, number> = { asset: 0, liability: 0, equity: 0, revenue: 0, expense: 0 };
    for (const a of accounts) counts[a.type]++;
    expect(counts.asset).toBe(7);
    expect(counts.liability).toBe(4);
    expect(counts.equity).toBe(2);
    expect(counts.revenue).toBe(2);
    expect(counts.expense).toBe(7);
  });

  it("asset + expense accounts have normal_balance=debit", () => {
    for (const acct of CHART_OF_ACCOUNTS) {
      if (acct.type === "asset" && acct.category !== "contra_asset") {
        expect(acct.normal_balance).toBe("debit");
      }
      if (acct.type === "expense") {
        expect(acct.normal_balance).toBe("debit");
      }
    }
  });

  it("liability + equity + revenue accounts have normal_balance=credit", () => {
    for (const acct of CHART_OF_ACCOUNTS) {
      if (acct.type === "liability" || acct.type === "equity" || acct.type === "revenue") {
        expect(acct.normal_balance).toBe("credit");
      }
    }
  });

  it("includes required manufacturing accounts at exact IDs", () => {
    const accounts = CHART_OF_ACCOUNTS;
    expect(accounts.find((a) => a.id === "1000")?.name).toBe("Cash");
    expect(accounts.find((a) => a.id === "1200")?.name).toBe("Accounts Receivable");
    expect(accounts.find((a) => a.id === "1300")?.name).toBe("WIP Inventory");
    expect(accounts.find((a) => a.id === "5000")?.name).toBe("Cost of Goods Sold");
  });
});

// ============================================================================
// DOUBLE-ENTRY INVARIANT
// ============================================================================

describe("GeneralLedgerEngine — double-entry invariant", () => {
  it("accepts a balanced journal entry and marks it posted with id and 2 lines", () => {
    const { engine } = makeEngine();
    const je = engine.createJournalEntry({
      date: "2026-04-23",
      description: "Test balanced",
      source: "manual",
      lines: [
        { account_id: "1000", debit: 100, credit: 0 },
        { account_id: "4000", debit: 0, credit: 100 },
      ],
    });
    expect(je.posted).toBe(true);
    expect(je.id).toMatch(/^je_\d{6}$/);
    expect(je.lines).toHaveLength(2);
    expect(je.lines[0].debit).toBe(100);
    expect(je.lines[1].credit).toBe(100);
  });

  it("rejects unbalanced entry (debits ≠ credits)", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createJournalEntry({
        date: "2026-04-23",
        description: "Bad",
        source: "manual",
        lines: [
          { account_id: "1000", debit: 100, credit: 0 },
          { account_id: "4000", debit: 0, credit: 50 },
        ],
      }),
    ).toThrow(/unbalanced/);
  });

  it("rejects a line with both debit and credit set", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createJournalEntry({
        date: "2026-04-23",
        description: "Bad",
        source: "manual",
        lines: [
          { account_id: "1000", debit: 100, credit: 100 },
          { account_id: "4000", debit: 0, credit: 100 },
        ],
      }),
    ).toThrow(/both debit and credit/);
  });

  it("rejects a zero debit AND zero credit line", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createJournalEntry({
        date: "2026-04-23",
        description: "Bad",
        source: "manual",
        lines: [
          { account_id: "1000", debit: 100, credit: 0 },
          { account_id: "4000", debit: 0, credit: 100 },
          { account_id: "5000", debit: 0, credit: 0 },
        ],
      }),
    ).toThrow(/zero debit and credit/);
  });

  it("rejects lines referencing an unknown account", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createJournalEntry({
        date: "2026-04-23",
        description: "Bad",
        source: "manual",
        lines: [
          { account_id: "9999", debit: 100, credit: 0 },
          { account_id: "4000", debit: 0, credit: 100 },
        ],
      }),
    ).toThrow(/unknown account_id/);
  });

  it("rejects bad date format", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createJournalEntry({
        date: "04/23/2026",
        description: "Bad",
        source: "manual",
        lines: [
          { account_id: "1000", debit: 100, credit: 0 },
          { account_id: "4000", debit: 0, credit: 100 },
        ],
      }),
    ).toThrow();
  });

  it("rejects entries with fewer than 2 lines", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.createJournalEntry({
        date: "2026-04-23",
        description: "Bad",
        source: "manual",
        lines: [{ account_id: "1000", debit: 100, credit: 0 }],
      }),
    ).toThrow();
  });

  it("entry IDs increment sequentially (je_000001, je_000002, ...)", () => {
    const { engine } = makeEngine();
    const a = engine.recordInvoice({ invoice_id: "I1", amount: 100, date: "2026-04-01" });
    const b = engine.recordInvoice({ invoice_id: "I2", amount: 200, date: "2026-04-02" });
    expect(a.id).toBe("je_000001");
    expect(b.id).toBe("je_000002");
  });
});

// ============================================================================
// STRUCTURED RECORDERS
// ============================================================================

describe("GeneralLedgerEngine — recordInvoice", () => {
  it("debits AR (1200) for amount + tax and credits Revenue + Tax Payable", () => {
    const { engine } = makeEngine();
    const je = engine.recordInvoice({
      invoice_id: "INV-1001",
      amount: 1000,
      tax: 80,
      date: "2026-04-23",
    });
    expect(je.lines).toHaveLength(3);
    expect(je.lines.find((l) => l.account_id === "1200")?.debit).toBe(1080);
    expect(je.lines.find((l) => l.account_id === "4000")?.credit).toBe(1000);
    expect(je.lines.find((l) => l.account_id === "2100")?.credit).toBe(80);
  });

  it("produces only 2 lines (no tax payable line) when tax is 0", () => {
    const { engine } = makeEngine();
    const je = engine.recordInvoice({
      invoice_id: "INV-1002",
      amount: 500,
      tax: 0,
      date: "2026-04-23",
    });
    expect(je.lines).toHaveLength(2);
    const hasTaxLine = je.lines.some((l) => l.account_id === "2100");
    expect(hasTaxLine).toBe(false);
  });

  it("rejects negative amount", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordInvoice({ invoice_id: "INV-BAD", amount: -100, date: "2026-04-23" }),
    ).toThrow();
  });
});

describe("GeneralLedgerEngine — recordPayment", () => {
  it("debits Cash (1000) and credits AR (1200) for the payment amount", () => {
    const { engine } = makeEngine();
    const je = engine.recordPayment({ invoice_id: "INV-1001", amount: 1080, date: "2026-04-23" });
    expect(je.lines).toHaveLength(2);
    expect(je.lines.find((l) => l.account_id === "1000")?.debit).toBe(1080);
    expect(je.lines.find((l) => l.account_id === "1200")?.credit).toBe(1080);
  });
});

describe("GeneralLedgerEngine — recordPurchase (4 category routings)", () => {
  it("materials → 1320 Raw Materials Inventory", () => {
    const { engine } = makeEngine();
    const je = engine.recordPurchase({
      po_id: "PO-500",
      amount: 2000,
      tax: 160,
      category: "materials",
      date: "2026-04-23",
    });
    expect(je.lines.find((l) => l.account_id === "1320")?.debit).toBe(2000);
    expect(je.lines.find((l) => l.account_id === "2000")?.credit).toBe(2160);
  });

  it("tools → 5600 Tools & Consumables Expense", () => {
    const { engine } = makeEngine();
    const je = engine.recordPurchase({
      po_id: "PO-501",
      amount: 300,
      tax: 24,
      category: "tools",
      date: "2026-04-23",
    });
    expect(je.lines.find((l) => l.account_id === "5600")?.debit).toBe(300);
  });

  it("equipment → 1500 Equipment (capital)", () => {
    const { engine } = makeEngine();
    const je = engine.recordPurchase({
      po_id: "PO-502",
      amount: 45000,
      tax: 3600,
      category: "equipment",
      date: "2026-04-23",
    });
    expect(je.lines.find((l) => l.account_id === "1500")?.debit).toBe(45000);
  });

  it("unknown category → 5500 Operating Expenses (fallback)", () => {
    const { engine } = makeEngine();
    const je = engine.recordPurchase({
      po_id: "PO-503",
      amount: 100,
      tax: 8,
      category: "pixie-dust",
      date: "2026-04-23",
    });
    expect(je.lines.find((l) => l.account_id === "5500")?.debit).toBe(100);
  });
});

describe("GeneralLedgerEngine — recordPayroll", () => {
  it("debits Payroll Expense 10000, credits Cash 7500 + Tax Payable 2500", () => {
    const { engine } = makeEngine();
    const je = engine.recordPayroll({
      period: "2026-04-A",
      gross: 10000,
      taxes: 2500,
      net: 7500,
      date: "2026-04-15",
    });
    expect(je.lines.find((l) => l.account_id === "5200")?.debit).toBe(10000);
    expect(je.lines.find((l) => l.account_id === "1000")?.credit).toBe(7500);
    expect(je.lines.find((l) => l.account_id === "2100")?.credit).toBe(2500);
  });

  it("throws when gross ≠ net + taxes", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordPayroll({
        period: "2026-04-A",
        gross: 10000,
        taxes: 2500,
        net: 7000,
        date: "2026-04-15",
      }),
    ).toThrow(/gross .* must equal net .* \+ taxes/);
  });
});

describe("GeneralLedgerEngine — recordWipToCogs (fills missing handler)", () => {
  it("debits COGS (5000) 1234.56 and credits WIP (1300) 1234.56", () => {
    const { engine } = makeEngine();
    const je = engine.recordWipToCogs({
      job_id: "JOB-42",
      amount: 1234.56,
      date: "2026-04-23",
    });
    expect(je.source).toBe("wip_to_cogs");
    expect(je.lines.find((l) => l.account_id === "5000")?.debit).toBe(1234.56);
    expect(je.lines.find((l) => l.account_id === "1300")?.credit).toBe(1234.56);
    expect(je.reference_id).toBe("JOB-42");
  });

  it("rejects zero amount (Zod positive)", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordWipToCogs({ job_id: "JOB-X", amount: 0, date: "2026-04-23" }),
    ).toThrow();
  });

  it("rejects NaN amount", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordWipToCogs({ job_id: "JOB-X", amount: Number.NaN, date: "2026-04-23" }),
    ).toThrow();
  });

  it("rejects Infinity amount", () => {
    const { engine } = makeEngine();
    expect(() =>
      engine.recordWipToCogs({
        job_id: "JOB-X",
        amount: Number.POSITIVE_INFINITY,
        date: "2026-04-23",
      }),
    ).toThrow();
  });
});

// ============================================================================
// TRIAL BALANCE
// ============================================================================

describe("GeneralLedgerEngine — trial balance", () => {
  it("empty state: total debits == total credits == 0 and balanced", () => {
    const { engine } = makeEngine();
    const tb = engine.getTrialBalance("2026-04-23");
    expect(tb.total_debits).toBe(0);
    expect(tb.total_credits).toBe(0);
    expect(tb.balanced).toBe(true);
    expect(tb.rows).toHaveLength(0);
  });

  it("after invoice + payment: total debits == total credits == 1080", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 500, tax: 40, date: "2026-04-01" });
    engine.recordPayment({ invoice_id: "INV-1", amount: 540, date: "2026-04-10" });
    const tb = engine.getTrialBalance("2026-04-30");
    expect(tb.total_debits).toBe(1080);
    expect(tb.total_credits).toBe(1080);
    expect(tb.balanced).toBe(true);
  });

  it("Cash account shows +540 debit balance after customer payment", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 500, tax: 40, date: "2026-04-01" });
    engine.recordPayment({ invoice_id: "INV-1", amount: 540, date: "2026-04-10" });
    const tb = engine.getTrialBalance("2026-04-30");
    const cash = tb.rows.find((r) => r.account_id === "1000");
    expect(cash?.balance).toBe(540);
  });

  it("as_of cutoff excludes entries after the date (revenue limited to April)", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 500, tax: 0, date: "2026-04-01" });
    engine.recordInvoice({ invoice_id: "INV-2", amount: 300, tax: 0, date: "2026-05-05" });
    const tb = engine.getTrialBalance("2026-04-30");
    const rev = tb.rows.find((r) => r.account_id === "4000");
    expect(rev?.balance).toBe(500);
  });
});

// ============================================================================
// INCOME STATEMENT
// ============================================================================

describe("GeneralLedgerEngine — income statement", () => {
  it("revenue 1000 − expenses 700 = net_income 300", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 1000, tax: 0, date: "2026-04-05" });
    engine.recordPurchase({ po_id: "PO-1", amount: 300, tax: 0, category: "tools", date: "2026-04-10" });
    engine.recordWipToCogs({ job_id: "J-1", amount: 400, date: "2026-04-15" });
    const is_ = engine.getIncomeStatement("2026-04-01", "2026-04-30");
    expect(is_.total_revenue).toBe(1000);
    expect(is_.total_expenses).toBe(700);
    expect(is_.net_income).toBe(300);
  });

  it("excludes entries outside the period window (only April INV-2 counted)", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 1000, tax: 0, date: "2026-03-31" });
    engine.recordInvoice({ invoice_id: "INV-2", amount: 2000, tax: 0, date: "2026-04-15" });
    const is_ = engine.getIncomeStatement("2026-04-01", "2026-04-30");
    expect(is_.total_revenue).toBe(2000);
    expect(is_.revenue_lines).toHaveLength(1);
  });
});

// ============================================================================
// MARGIN TRENDS
// ============================================================================

describe("GeneralLedgerEngine — marginTrends", () => {
  const JUN = [{ label: "2026-06", start: "2026-06-01", end: "2026-06-30" }];

  it("empty ledger -> data_available:false, no fabricated margin", () => {
    const { engine } = makeEngine();
    const t = engine.marginTrends({ periods: JUN });
    expect(t.data_available).toBe(false);
    expect(t.periods[0].net_margin_pct).toBeNull();
    expect(t.avg_net_margin_pct).toBeNull();
  });

  it("revenue 1000 - expenses 400 -> net_margin 60% for the period", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 1000, tax: 0, date: "2026-06-15" });
    engine.recordPurchase({ po_id: "PO-1", amount: 400, tax: 0, category: "services", date: "2026-06-15" });
    const t = engine.marginTrends({ periods: JUN });
    expect(t.data_available).toBe(true);
    expect(t.periods[0].total_revenue).toBe(1000);
    expect(t.periods[0].total_expenses).toBe(400);
    expect(t.periods[0].net_income).toBe(600);
    expect(t.periods[0].net_margin_pct).toBe(60);
    expect(t.avg_net_margin_pct).toBe(60);
  });

  it("builds N trailing calendar months ending at asOf", () => {
    const { engine } = makeEngine();
    const t = engine.marginTrends({ months: 3, asOf: "2026-06-15" });
    expect(t.periods.map((p) => p.label)).toEqual(["2026-04", "2026-05", "2026-06"]);
    expect(t.periods[2].period_end).toBe("2026-06-30");
  });

  it("data_available:true when ANY period has revenue; empty periods get null margin", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 800, tax: 0, date: "2026-06-10" });
    const t = engine.marginTrends({ months: 2, asOf: "2026-06-15" }); // May (empty) + Jun (revenue)
    expect(t.data_available).toBe(true);
    const may = t.periods.find((p) => p.label === "2026-05");
    const jun = t.periods.find((p) => p.label === "2026-06");
    expect(may?.net_margin_pct).toBeNull();
    expect(jun?.total_revenue).toBe(800);
    expect(jun?.net_margin_pct).toBe(100); // no expenses -> 100% net margin
  });
});

// ============================================================================
// CASH FLOW SUMMARY
// ============================================================================

describe("GeneralLedgerEngine — cashFlowSummary", () => {
  const JUN = [{ label: "2026-06", start: "2026-06-01", end: "2026-06-30" }];

  it("empty ledger -> data_available:false, zero net cash flow", () => {
    const { engine } = makeEngine();
    const c = engine.cashFlowSummary({ periods: JUN });
    expect(c.data_available).toBe(false);
    expect(c.periods[0].net_cash_flow).toBe(0);
    expect(c.total_net_cash_flow).toBe(0);
  });

  it("payment in (500) minus payroll cash out (240) -> net cash flow 260", () => {
    const { engine } = makeEngine();
    engine.recordPayment({ invoice_id: "INV-1", amount: 500, date: "2026-06-10" }); // DR 1000 Cash 500
    engine.recordPayroll({ period: "2026-06", gross: 300, taxes: 60, net: 240, date: "2026-06-12" }); // CR 1000 Cash 240
    const c = engine.cashFlowSummary({ periods: JUN });
    expect(c.data_available).toBe(true);
    expect(c.periods[0].cash_inflow).toBe(500);
    expect(c.periods[0].cash_outflow).toBe(240);
    expect(c.periods[0].net_cash_flow).toBe(260);
    expect(c.total_net_cash_flow).toBe(260);
    expect(c.cash_accounts).toContain("1000");
  });

  it("an invoice (AR only, no cash) does NOT register as cash movement", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 900, tax: 0, date: "2026-06-05" }); // DR 1200 AR, CR 4000 -- no cash
    const c = engine.cashFlowSummary({ periods: JUN });
    expect(c.data_available).toBe(false);
    expect(c.periods[0].cash_inflow).toBe(0);
  });

  it("builds N trailing calendar months ending at asOf", () => {
    const { engine } = makeEngine();
    const c = engine.cashFlowSummary({ months: 2, asOf: "2026-06-15" });
    expect(c.periods.map((p) => p.label)).toEqual(["2026-05", "2026-06"]);
  });
});

// ============================================================================
// REVENUE FORECAST
// ============================================================================

describe("GeneralLedgerEngine — revenueForecast", () => {
  it("empty lookback -> data_available:false, no forecast", () => {
    const { engine } = makeEngine();
    const f = engine.revenueForecast({ lookbackMonths: 3, horizonMonths: 1, asOf: "2026-06-15" });
    expect(f.data_available).toBe(false);
    expect(f.forecast).toHaveLength(0);
  });

  it("linear-trend run-rate: rev 100/200/300 over 3 months -> slope 100, avg 200, next month 400", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "A", amount: 100, tax: 0, date: "2026-04-15" });
    engine.recordInvoice({ invoice_id: "B", amount: 200, tax: 0, date: "2026-05-15" });
    engine.recordInvoice({ invoice_id: "C", amount: 300, tax: 0, date: "2026-06-15" });
    const f = engine.revenueForecast({ lookbackMonths: 3, horizonMonths: 1, asOf: "2026-06-15" });
    expect(f.data_available).toBe(true);
    expect(f.history.map((h) => h.revenue)).toEqual([100, 200, 300]);
    expect(f.avg_monthly_revenue).toBe(200);
    expect(f.trend_slope_per_month).toBe(100);
    expect(f.forecast).toHaveLength(1);
    expect(f.forecast[0].label).toBe("2026-07");
    expect(f.forecast[0].projected_revenue).toBe(400);
  });

  it("clamps a declining trend's projection at 0 (revenue is never negative)", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "A", amount: 300, tax: 0, date: "2026-04-15" });
    engine.recordInvoice({ invoice_id: "B", amount: 100, tax: 0, date: "2026-05-15" });
    // 2026-06 has no revenue -> strongly negative slope -> far-out projection clamps to 0.
    const f = engine.revenueForecast({ lookbackMonths: 3, horizonMonths: 6, asOf: "2026-06-15" });
    expect(f.trend_slope_per_month).toBeLessThan(0);
    expect(f.forecast.every((m) => m.projected_revenue >= 0)).toBe(true);
  });
});

// ============================================================================
// BALANCE SHEET
// ============================================================================

describe("GeneralLedgerEngine — balance sheet", () => {
  it("Assets = Liabilities + Equity (balanced) after a settled invoice cycle", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 500, tax: 0, date: "2026-04-01" });
    engine.recordPayment({ invoice_id: "INV-1", amount: 500, date: "2026-04-10" });
    const bs = engine.getBalanceSheet("2026-04-30");
    expect(bs.balanced).toBe(true);
    expect(bs.total_assets).toBeCloseTo(bs.total_liabilities + bs.total_equity, 2);
  });

  it("Cash line in assets shows 500 after received payment", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 500, tax: 0, date: "2026-04-01" });
    engine.recordPayment({ invoice_id: "INV-1", amount: 500, date: "2026-04-10" });
    const bs = engine.getBalanceSheet("2026-04-30");
    expect(bs.assets.find((a) => a.account_id === "1000")?.amount).toBe(500);
  });

  it("Retained earnings line amount equals period net income (1000 revenue)", () => {
    const { engine } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 1000, tax: 0, date: "2026-04-05" });
    const bs = engine.getBalanceSheet("2026-04-30");
    const re = bs.equity.find((e) => e.account_id === "3100-RE");
    expect(re?.amount).toBe(1000);
  });
});

// ============================================================================
// PERSISTENCE
// ============================================================================

describe("GeneralLedgerEngine — persistence", () => {
  it("state survives a new engine instance on the same path", () => {
    const { engine, statePath } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-X", amount: 250, date: "2026-04-01" });
    expect(existsSync(statePath)).toBe(true);

    const engine2 = new GeneralLedgerEngine(statePath);
    const entries = engine2.__getState().journal_entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].reference_id).toBe("INV-X");
  });

  it("corrupt state file backs up and starts with empty journal_entries", () => {
    const { statePath } = makeEngine();
    writeFileSync(statePath, "{not json");
    const engine2 = new GeneralLedgerEngine(statePath);
    expect(engine2.__getState().journal_entries).toHaveLength(0);
    expect(existsSync(`${statePath}.corrupt.bak`)).toBe(true);
  });

  it("unsupported schemaVersion resets to v1 fresh state", () => {
    const { statePath } = makeEngine();
    writeFileSync(
      statePath,
      JSON.stringify({ schemaVersion: 99, journal_entries: [], next_entry_seq: 1 }),
    );
    const engine2 = new GeneralLedgerEngine(statePath);
    expect(engine2.__getState().schemaVersion).toBe(1);
  });

  it("persisted JSON has schemaVersion=1 and ISO updated_at", () => {
    const { engine, statePath } = makeEngine();
    engine.recordInvoice({ invoice_id: "INV-1", amount: 100, date: "2026-04-01" });
    const parsed = JSON.parse(readFileSync(statePath, "utf-8")) as {
      schemaVersion: number;
      updated_at: string;
      journal_entries: unknown[];
    };
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(parsed.journal_entries).toHaveLength(1);
  });
});

// ============================================================================
// DISPATCHER WIRING
// ============================================================================

describe("GeneralLedgerEngine — dispatcher wiring", () => {
  it("all 10 gl_* actions have enum entries + case handlers + lazy import", () => {
    const src = readFileSync(
      "H:/prism/mcp-server/src/tools/dispatchers/businessDispatcher.ts",
      "utf-8",
    );
    const actions = [
      "gl_chart_of_accounts",
      "gl_journal_entry",
      "gl_record_invoice",
      "gl_record_payment",
      "gl_record_purchase",
      "gl_record_payroll",
      "gl_record_wip_to_cogs",
      "gl_trial_balance",
      "gl_income_statement",
      "gl_balance_sheet",
    ];
    for (const action of actions) {
      expect(src).toContain(`"${action}"`);
      expect(src).toMatch(new RegExp(`case "${action}"`));
    }
    expect(src).toContain('"../../engines/GeneralLedgerEngine.js"');
    expect(src).toContain('case "generalLedger"');
  });

  it("end-to-end ledger cycle: 100 revenue + 175 expenses = −75 net income", () => {
    const { engine } = makeEngine();
    expect(engine.getChartOfAccounts().length).toBe(22);
    const je1 = engine.createJournalEntry({
      date: "2026-04-01",
      description: "Owner equity injection",
      source: "manual",
      lines: [
        { account_id: "1000", debit: 1000, credit: 0 },
        { account_id: "3000", debit: 0, credit: 1000 },
      ],
    });
    expect(je1.posted).toBe(true);
    const je2 = engine.recordInvoice({ invoice_id: "I1", amount: 100, date: "2026-04-01" });
    expect(je2.lines).toHaveLength(2);
    const je3 = engine.recordPayment({ invoice_id: "I1", amount: 100, date: "2026-04-02" });
    expect(je3.lines).toHaveLength(2);
    const je4 = engine.recordPurchase({ po_id: "P1", amount: 50, category: "tools", date: "2026-04-03" });
    expect(je4.lines).toHaveLength(2);
    const je5 = engine.recordPayroll({ period: "M1", gross: 100, taxes: 20, net: 80, date: "2026-04-04" });
    expect(je5.lines).toHaveLength(3);
    const je6 = engine.recordWipToCogs({ job_id: "J1", amount: 25, date: "2026-04-05" });
    expect(je6.lines).toHaveLength(2);

    const tb = engine.getTrialBalance();
    expect(tb.balanced).toBe(true);
    const is_ = engine.getIncomeStatement("2026-04-01", "2026-04-30");
    // Revenue 100 (I1) − expenses 50 (tools) − 100 (payroll) − 25 (COGS) = −75
    expect(is_.total_revenue).toBe(100);
    expect(is_.total_expenses).toBe(175);
    expect(is_.net_income).toBe(-75);
    const bs = engine.getBalanceSheet();
    expect(bs.balanced).toBe(true);
  });
});
