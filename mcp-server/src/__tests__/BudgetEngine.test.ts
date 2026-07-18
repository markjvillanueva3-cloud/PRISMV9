/**
 * BudgetEngine tests — QB Budgets + budget-vs-actual variance.
 *
 * Real hand-computed reference values (no toBeDefined stubs). Covers: 12-period budget creation,
 * per-period variance, annual rollups, grand total, favorable/unfavorable by account type,
 * zero-budget variancePct null (no Infinity), reconciliation both ways, half-even rounding,
 * duplicate same-period actual summing, and adversarial inputs (NaN, period 13, wrong array length,
 * unknown/duplicate accounts). One test feeds REAL GeneralLedgerEngine-derived actuals into the
 * report to prove the GL reuse contract.
 */
import { describe, it, expect } from "vitest";
import { BudgetEngine, BUDGET_PERIODS, type Budget } from "../engines/BudgetEngine.js";
import { GeneralLedgerEngine, CHART_OF_ACCOUNTS } from "../engines/GeneralLedgerEngine.js";

/** Helper: a flat 12-period array of one value. */
const flat = (v: number): number[] => new Array(BUDGET_PERIODS).fill(v);

describe("BudgetEngine.createBudget — validated 12-period budget", () => {
  it("creates a per-account 12-period budget with correct annual rollups", () => {
    const b = BudgetEngine.createBudget({
      budgetId: "FY26",
      fiscalYear: 2026,
      lines: [
        { accountId: "4000", periodAmounts: flat(1000) }, // Sales Revenue
        { accountId: "5000", periodAmounts: flat(500) }, // COGS
      ],
    });
    expect(b.budgetId).toBe("FY26");
    expect(b.fiscalYear).toBe(2026);
    expect(b.lines).toHaveLength(2);

    const rev = b.lines.find((l) => l.accountId === "4000")!;
    expect(rev.accountName).toBe("Sales Revenue");
    expect(rev.accountType).toBe("revenue");
    expect(rev.periodAmounts).toHaveLength(12);
    expect(rev.annualBudget).toBeCloseTo(12000, 2); // 1000 * 12

    const cogs = b.lines.find((l) => l.accountId === "5000")!;
    expect(cogs.accountType).toBe("expense");
    expect(cogs.annualBudget).toBeCloseTo(6000, 2); // 500 * 12

    expect(b.totalAnnualBudget).toBeCloseTo(18000, 2); // 12000 + 6000
  });

  it("validates accountId against the SAME GL chart of accounts (reuse proof)", () => {
    // Every accountId used must be a real GL chart account. Spot-check the chart contains them.
    const ids = new Set(CHART_OF_ACCOUNTS.map((a) => a.id));
    expect(ids.has("4000")).toBe(true);
    expect(ids.has("5000")).toBe(true);
    // And a budget built only from chart accounts succeeds.
    const b = BudgetEngine.createBudget({
      budgetId: "FY26",
      fiscalYear: 2026,
      lines: [{ accountId: "5100", periodAmounts: flat(100) }], // Materials Expense
    });
    expect(b.lines[0].accountName).toBe("Materials Expense");
  });

  it("applies half-even (banker's) rounding to period amounts", () => {
    const b = BudgetEngine.createBudget({
      budgetId: "FYR",
      fiscalYear: 2026,
      // 0.125 ties to even → 0.12 ; 0.135 ties to even → 0.14
      lines: [{ accountId: "5500", periodAmounts: [0.125, 0.135, ...new Array(10).fill(0)] }],
    });
    expect(b.lines[0].periodAmounts[0]).toBeCloseTo(0.12, 5);
    expect(b.lines[0].periodAmounts[1]).toBeCloseTo(0.14, 5);
    expect(b.lines[0].annualBudget).toBeCloseTo(0.26, 5); // 0.12 + 0.14
  });

  it("throws on an unknown accountId (not in the GL chart)", () => {
    expect(() =>
      BudgetEngine.createBudget({
        budgetId: "FY26",
        fiscalYear: 2026,
        lines: [{ accountId: "9999", periodAmounts: flat(100) }],
      }),
    ).toThrow(/unknown accountId/i);
  });

  it("throws on a duplicate accountId across lines", () => {
    expect(() =>
      BudgetEngine.createBudget({
        budgetId: "FY26",
        fiscalYear: 2026,
        lines: [
          { accountId: "4000", periodAmounts: flat(100) },
          { accountId: "4000", periodAmounts: flat(200) },
        ],
      }),
    ).toThrow(/duplicate accountId/i);
  });

  it("throws on a wrong periodAmounts length (not 12)", () => {
    expect(() =>
      BudgetEngine.createBudget({
        budgetId: "FY26",
        fiscalYear: 2026,
        lines: [{ accountId: "4000", periodAmounts: [1, 2, 3] }], // length 3
      }),
    ).toThrow();
  });

  it("throws on a non-finite (NaN) period amount", () => {
    expect(() =>
      BudgetEngine.createBudget({
        budgetId: "FY26",
        fiscalYear: 2026,
        lines: [{ accountId: "4000", periodAmounts: [NaN, ...new Array(11).fill(0)] }],
      }),
    ).toThrow();
  });

  it("throws on an Infinity period amount (adversarial)", () => {
    expect(() =>
      BudgetEngine.createBudget({
        budgetId: "FY26",
        fiscalYear: 2026,
        lines: [{ accountId: "4000", periodAmounts: [Infinity, ...new Array(11).fill(0)] }],
      }),
    ).toThrow();
  });

  it("throws on an empty lines array", () => {
    expect(() =>
      BudgetEngine.createBudget({ budgetId: "FY26", fiscalYear: 2026, lines: [] }),
    ).toThrow();
  });
});

describe("BudgetEngine.budgetVsActual — per-period variance + favorability", () => {
  const budget: Budget = BudgetEngine.createBudget({
    budgetId: "FY26",
    fiscalYear: 2026,
    lines: [
      { accountId: "4000", periodAmounts: flat(1000) }, // revenue, 12000 annual
      { accountId: "5000", periodAmounts: flat(500) }, // expense, 6000 annual
    ],
  });

  it("computes variance = actual − budget EXACTLY per period, with correct pct", () => {
    const report = BudgetEngine.budgetVsActual(budget, [
      { accountId: "4000", period: 1, amount: 1200 }, // +200
      { accountId: "4000", period: 2, amount: 800 }, // −200
      { accountId: "5000", period: 1, amount: 600 }, // +100
      { accountId: "5000", period: 2, amount: 400 }, // −100
    ]);

    const c = (id: string, p: number) =>
      report.cells.find((x) => x.accountId === id && x.period === p)!;

    // 4000 p1: actual 1200 − budget 1000 = +200; pct = 200/1000 = 0.2
    expect(c("4000", 1).variance).toBeCloseTo(200, 2);
    expect(c("4000", 1).variancePct).toBeCloseTo(0.2, 4);
    // reconciles both ways: actual = budget + variance
    expect(c("4000", 1).actual).toBeCloseTo(c("4000", 1).budget + c("4000", 1).variance, 2);

    // 4000 p2: 800 − 1000 = −200; pct −0.2
    expect(c("4000", 2).variance).toBeCloseTo(-200, 2);
    expect(c("4000", 2).variancePct).toBeCloseTo(-0.2, 4);

    // 5000 p1: 600 − 500 = +100; pct 0.2
    expect(c("5000", 1).variance).toBeCloseTo(100, 2);
    expect(c("5000", 1).variancePct).toBeCloseTo(0.2, 4);

    // 5000 p3: no actual → actual 0, variance −500
    expect(c("5000", 3).actual).toBeCloseTo(0, 2);
    expect(c("5000", 3).variance).toBeCloseTo(-500, 2);
  });

  it("flags favorable/unfavorable by account type", () => {
    const report = BudgetEngine.budgetVsActual(budget, [
      { accountId: "4000", period: 1, amount: 1200 }, // revenue over → favorable
      { accountId: "4000", period: 2, amount: 800 }, // revenue under → unfavorable
      { accountId: "5000", period: 1, amount: 600 }, // expense over → unfavorable
      { accountId: "5000", period: 2, amount: 400 }, // expense under → favorable
    ]);
    const c = (id: string, p: number) =>
      report.cells.find((x) => x.accountId === id && x.period === p)!;

    expect(c("4000", 1).favorability).toBe("favorable"); // revenue above plan
    expect(c("4000", 2).favorability).toBe("unfavorable"); // revenue below plan
    expect(c("5000", 1).favorability).toBe("unfavorable"); // expense above plan
    expect(c("5000", 2).favorability).toBe("favorable"); // expense below plan
    // exact-on-budget period → neutral (no actual = variance −500, not 0; use a matched one)
    const matched = BudgetEngine.budgetVsActual(budget, [{ accountId: "4000", period: 5, amount: 1000 }]);
    expect(matched.cells.find((x) => x.accountId === "4000" && x.period === 5)!.favorability).toBe(
      "neutral",
    );
  });

  it("rolls up annual per-account and grand total (reconciles)", () => {
    const report = BudgetEngine.budgetVsActual(budget, [
      { accountId: "4000", period: 1, amount: 1200 },
      { accountId: "4000", period: 2, amount: 800 },
      { accountId: "5000", period: 1, amount: 600 },
      { accountId: "5000", period: 2, amount: 400 },
    ]);

    const rev = report.byAccount.find((r) => r.accountId === "4000")!;
    // annual budget 12000; annual actual = 1200 + 800 = 2000; variance = −10000
    expect(rev.annualBudget).toBeCloseTo(12000, 2);
    expect(rev.annualActual).toBeCloseTo(2000, 2);
    expect(rev.annualVariance).toBeCloseTo(-10000, 2);
    expect(rev.annualVariancePct).toBeCloseTo(-0.8333, 4); // −10000/12000
    expect(rev.favorability).toBe("unfavorable"); // revenue below plan

    const cogs = report.byAccount.find((r) => r.accountId === "5000")!;
    // annual budget 6000; actual = 600 + 400 = 1000; variance = −5000
    expect(cogs.annualBudget).toBeCloseTo(6000, 2);
    expect(cogs.annualActual).toBeCloseTo(1000, 2);
    expect(cogs.annualVariance).toBeCloseTo(-5000, 2);
    expect(cogs.favorability).toBe("favorable"); // expense below plan

    // grand total: budget 18000, actual 3000, variance −15000
    expect(report.grandTotal.budget).toBeCloseTo(18000, 2);
    expect(report.grandTotal.actual).toBeCloseTo(3000, 2);
    expect(report.grandTotal.variance).toBeCloseTo(-15000, 2);
    expect(report.grandTotal.variancePct).toBeCloseTo(-0.8333, 4); // −15000/18000

    // reconcile: grand variance == Σ per-account annual variances
    const sumAcctVar = report.byAccount.reduce((s, r) => s + r.annualVariance, 0);
    expect(report.grandTotal.variance).toBeCloseTo(sumAcctVar, 2);
  });

  it("returns variancePct = null (NOT Infinity) for a zero-budget period with an actual", () => {
    // 5600 (Tools) is NOT in the budget → budget 0 in every period.
    const report = BudgetEngine.budgetVsActual(budget, [{ accountId: "5600", period: 1, amount: 250 }]);
    const cell = report.cells.find((x) => x.accountId === "5600" && x.period === 1)!;
    expect(cell.budget).toBeCloseTo(0, 2);
    expect(cell.actual).toBeCloseTo(250, 2);
    expect(cell.variance).toBeCloseTo(250, 2); // variance = actual − 0
    expect(cell.variancePct).toBeNull(); // 0-budget → null, never Infinity
    expect(Number.isFinite(cell.variancePct as number)).toBe(false);

    // annual rollup likewise null pct
    const acct = report.byAccount.find((r) => r.accountId === "5600")!;
    expect(acct.annualVariancePct).toBeNull();
  });

  it("sums multiple actuals for the same (account, period) [duplicate-posting case]", () => {
    const report = BudgetEngine.budgetVsActual(budget, [
      { accountId: "4000", period: 3, amount: 100 },
      { accountId: "4000", period: 3, amount: 50 }, // same period → sums to 150
    ]);
    const cell = report.cells.find((x) => x.accountId === "4000" && x.period === 3)!;
    expect(cell.actual).toBeCloseTo(150, 2);
    expect(cell.variance).toBeCloseTo(-850, 2); // 150 − 1000
  });

  it("throws on an actual referencing an account in neither budget nor chart", () => {
    expect(() => BudgetEngine.budgetVsActual(budget, [{ accountId: "9999", period: 1, amount: 100 }])).toThrow(
      /unknown accountId/i,
    );
  });

  it("throws on an out-of-range period (period 13, adversarial)", () => {
    expect(() => BudgetEngine.budgetVsActual(budget, [{ accountId: "4000", period: 13, amount: 100 }])).toThrow();
  });

  it("throws on a period of 0 (below range)", () => {
    expect(() => BudgetEngine.budgetVsActual(budget, [{ accountId: "4000", period: 0, amount: 100 }])).toThrow();
  });

  it("throws on a non-finite actual amount (NaN/Infinity, adversarial)", () => {
    expect(() => BudgetEngine.budgetVsActual(budget, [{ accountId: "4000", period: 1, amount: NaN }])).toThrow();
    expect(() =>
      BudgetEngine.budgetVsActual(budget, [{ accountId: "4000", period: 1, amount: Infinity }]),
    ).toThrow();
  });

  it("handles an empty actuals list (all budget, zero actual)", () => {
    const report = BudgetEngine.budgetVsActual(budget, []);
    const rev = report.byAccount.find((r) => r.accountId === "4000")!;
    expect(rev.annualActual).toBeCloseTo(0, 2);
    expect(rev.annualVariance).toBeCloseTo(-12000, 2); // 0 − 12000
    expect(report.grandTotal.actual).toBeCloseTo(0, 2);
  });
});

describe("BudgetEngine.budgetVsActual — REAL GeneralLedgerEngine-derived actuals (GL reuse)", () => {
  it("compares a budget against actuals pulled from real GL income-statement lines", () => {
    // Build a budget for Sales Revenue (4000) and COGS (5000).
    const budget = BudgetEngine.createBudget({
      budgetId: "FY26-GL",
      fiscalYear: 2026,
      lines: [
        { accountId: "4000", periodAmounts: flat(1000) }, // expect ~1000/mo revenue
        { accountId: "5000", periodAmounts: flat(500) }, // expect ~500/mo COGS
      ],
    });

    // Post REAL journal entries via the GL engine in an isolated state file, then derive January
    // actuals from its income statement (the canonical actuals source for budget-vs-actual).
    const gl = new GeneralLedgerEngine(
      "H:/prism-slot-hotel/mcp-server/data/state/__test_budget_gl_state.json",
    );
    gl.__resetForTests();
    gl.recordInvoice({ invoice_id: "INV-JAN-1", amount: 1500, tax: 0, date: "2026-01-15" }); // CR 4000 1500
    gl.recordWipToCogs({ job_id: "JOB-JAN-1", amount: 700, date: "2026-01-20" }); // DR 5000 700

    const jan = gl.getIncomeStatement("2026-01-01", "2026-01-31");
    const revLine = jan.revenue_lines.find((l) => l.account_id === "4000")!;
    const cogsLine = jan.expense_lines.find((l) => l.account_id === "5000")!;
    expect(revLine.amount).toBeCloseTo(1500, 2); // real GL revenue
    expect(cogsLine.amount).toBeCloseTo(700, 2); // real GL COGS

    // Feed the real GL period actuals into the budget report (period 1 = January).
    const report = BudgetEngine.budgetVsActual(budget, [
      { accountId: "4000", period: 1, amount: revLine.amount },
      { accountId: "5000", period: 1, amount: cogsLine.amount },
    ]);

    const rev = report.cells.find((x) => x.accountId === "4000" && x.period === 1)!;
    expect(rev.actual).toBeCloseTo(1500, 2);
    expect(rev.variance).toBeCloseTo(500, 2); // 1500 − 1000
    expect(rev.favorability).toBe("favorable"); // revenue over plan

    const cogs = report.cells.find((x) => x.accountId === "5000" && x.period === 1)!;
    expect(cogs.actual).toBeCloseTo(700, 2);
    expect(cogs.variance).toBeCloseTo(200, 2); // 700 − 500
    expect(cogs.favorability).toBe("unfavorable"); // expense over plan

    gl.__resetForTests();
  });
});
