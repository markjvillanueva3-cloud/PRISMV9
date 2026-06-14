/**
 * FinancialReportSuiteEngine.test.ts — QB financial-report suite (galaxy:business, slot:hotel).
 *
 * Reference values are hand-computed below each scenario. Several tests feed REAL
 * GeneralLedgerEngine-posted entries (via a temp state path) into the suite —
 * proving the report engine consumes the GL contract rather than re-implementing it.
 */
import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  FinancialReportSuiteEngine,
  sectionForAccount,
  CASH_ACCOUNT_ID,
} from "../engines/FinancialReportSuiteEngine.js";
import { GeneralLedgerEngine, type JournalEntry } from "../engines/GeneralLedgerEngine.js";

/** Build a balanced JournalEntry fixture (the shape GL posts). */
function je(date: string, lines: Array<[string, number, number]>, extra: Partial<JournalEntry> & { class_tag?: string } = {}): JournalEntry & { class_tag?: string } {
  return {
    id: extra.id ?? `je_${date}_${Math.random().toString(36).slice(2, 8)}`,
    date,
    description: extra.description ?? "test",
    source: extra.source ?? "manual",
    lines: lines.map(([account_id, debit, credit]) => ({ account_id, debit, credit })),
    posted: extra.posted ?? true,
    created_at: extra.created_at ?? new Date().toISOString(),
    ...(extra.class_tag ? { class_tag: extra.class_tag } : {}),
  };
}

function freshGL(): GeneralLedgerEngine {
  const dir = mkdtempSync(join(tmpdir(), "frse-gl-"));
  return new GeneralLedgerEngine(join(dir, "gl-state.json"));
}

describe("sectionForAccount — classification reuses the GL chart ids", () => {
  it("routes equipment + accumulated depreciation to investing", () => {
    expect(sectionForAccount("1500")).toBe("investing");
    expect(sectionForAccount("1600")).toBe("investing");
  });
  it("routes long-term debt + equity to financing", () => {
    expect(sectionForAccount("2500")).toBe("financing");
    expect(sectionForAccount("3000")).toBe("financing");
    expect(sectionForAccount("3100")).toBe("financing");
  });
  it("routes AR / AP / revenue / expense to operating", () => {
    expect(sectionForAccount("1200")).toBe("operating"); // AR
    expect(sectionForAccount("2000")).toBe("operating"); // AP
    expect(sectionForAccount("4000")).toBe("operating"); // revenue
    expect(sectionForAccount("5500")).toBe("operating"); // expense
  });
});

describe("cashFlowStatement — 3-section classification + reconciliation", () => {
  // Scenario (hand-computed):
  //   payment    DR 1000 5000 / CR 1200 5000   → cash +5000, operating(AR)  +5000
  //   equipment  DR 1500 2000 / CR 1000 2000   → cash -2000, investing      -2000
  //   debt draw  DR 1000 3000 / CR 2500 3000   → cash +3000, financing      +3000
  //   op expense DR 5500  800 / CR 1000  800   → cash  -800, operating(5500) -800
  //   net cash = 5000 - 2000 + 3000 - 800 = 5200
  //   operating = 5000 - 800 = 4200 ; investing = -2000 ; financing = +3000
  const entries: JournalEntry[] = [
    je("2026-03-05", [["1000", 5000, 0], ["1200", 0, 5000]], { source: "payment" }),
    je("2026-03-10", [["1500", 2000, 0], ["1000", 0, 2000]], { source: "purchase" }),
    je("2026-03-15", [["1000", 3000, 0], ["2500", 0, 3000]], { source: "manual" }),
    je("2026-03-20", [["5500", 800, 0], ["1000", 0, 800]], { source: "purchase" }),
  ];

  it("classifies into operating/investing/financing with correct subtotals", () => {
    const cf = FinancialReportSuiteEngine.cashFlowStatement(entries, {
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      openingCash: 1000,
    });
    expect(cf.operating.subtotal).toBeCloseTo(4200, 2);
    expect(cf.investing.subtotal).toBeCloseTo(-2000, 2);
    expect(cf.financing.subtotal).toBeCloseTo(3000, 2);
  });

  it("net change in cash reconciles to the cash-account delta (CF integrity)", () => {
    const cf = FinancialReportSuiteEngine.cashFlowStatement(entries, {
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
      openingCash: 1000,
    });
    expect(cf.net_change_in_cash).toBeCloseTo(5200, 2);
    expect(cf.cash_account_delta).toBeCloseTo(5200, 2);
    expect(cf.reconciled).toBe(true);
    // closing = opening + net change
    expect(cf.closing_cash).toBeCloseTo(6200, 2); // 1000 + 5200
    expect(cf.closing_cash - cf.opening_cash).toBeCloseTo(cf.net_change_in_cash, 2);
  });

  it("investing section names the equipment account from the GL chart", () => {
    const cf = FinancialReportSuiteEngine.cashFlowStatement(entries, {
      periodStart: "2026-03-01",
      periodEnd: "2026-03-31",
    });
    const equip = cf.investing.lines.find((l) => l.account_id === "1500");
    expect(equip?.account_name).toBe("Equipment");
    expect(equip?.amount).toBeCloseTo(-2000, 2);
    expect(cf.investing.lines).toHaveLength(1);
  });

  it("excludes out-of-period entries (date filter)", () => {
    const cf = FinancialReportSuiteEngine.cashFlowStatement(
      [...entries, je("2026-05-01", [["1000", 9999, 0], ["1200", 0, 9999]])],
      { periodStart: "2026-03-01", periodEnd: "2026-03-31", openingCash: 0 },
    );
    expect(cf.net_change_in_cash).toBeCloseTo(5200, 2); // May entry excluded
  });

  it("reconciles when fed REAL GeneralLedgerEngine-posted entries (no GL reimplementation)", () => {
    const gl = freshGL();
    gl.recordInvoice({ invoice_id: "INV-1", amount: 4000, tax: 0, date: "2026-04-02" }); // DR AR / CR Rev (no cash)
    gl.recordPayment({ invoice_id: "INV-1", amount: 4000, date: "2026-04-05" }); // DR Cash / CR AR
    gl.recordPurchase({ po_id: "PO-9", amount: 600, tax: 0, category: "equipment", date: "2026-04-10" }); // DR Equip / CR AP (no cash)
    const posted = gl.__getState().journal_entries as JournalEntry[];
    const cf = FinancialReportSuiteEngine.cashFlowStatement(posted, {
      periodStart: "2026-04-01",
      periodEnd: "2026-04-30",
      openingCash: 0,
    });
    // Only the payment touched cash: +4000 operating (AR collection).
    expect(cf.net_change_in_cash).toBeCloseTo(4000, 2);
    expect(cf.operating.subtotal).toBeCloseTo(4000, 2);
    expect(cf.investing.subtotal).toBeCloseTo(0, 2);
    expect(cf.reconciled).toBe(true);
  });

  it("empty entries → a zero, reconciled report (adversarial: nothing)", () => {
    const cf = FinancialReportSuiteEngine.cashFlowStatement([], {
      periodStart: "2026-01-01",
      periodEnd: "2026-01-31",
      openingCash: 250,
    });
    expect(cf.net_change_in_cash).toBe(0);
    expect(cf.cash_account_delta).toBe(0);
    expect(cf.closing_cash).toBeCloseTo(250, 2);
    expect(cf.operating.lines).toHaveLength(0);
    expect(cf.reconciled).toBe(true);
  });

  it("THROWS on a non-finite line amount (adversarial: NaN)", () => {
    const bad = je("2026-03-05", [["1000", Number.NaN, 0], ["1200", 0, 5000]]);
    expect(() =>
      FinancialReportSuiteEngine.cashFlowStatement([bad], {
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
      }),
    ).toThrow(/non-finite/);
  });

  it("THROWS the CF integrity check on an unbalanced cash-touching entry", () => {
    // cash +5000 but counterpart leg only 4000 → sections (4000) != cash delta (5000)
    const unbalanced = je("2026-03-05", [["1000", 5000, 0], ["1200", 0, 4000]]);
    expect(() =>
      FinancialReportSuiteEngine.cashFlowStatement([unbalanced], {
        periodStart: "2026-03-01",
        periodEnd: "2026-03-31",
      }),
    ).toThrow(/CF integrity/);
  });

  it("THROWS when periodStart is after periodEnd (failure mode)", () => {
    expect(() =>
      FinancialReportSuiteEngine.cashFlowStatement([], {
        periodStart: "2026-03-31",
        periodEnd: "2026-03-01",
      }),
    ).toThrow(/after periodEnd/);
  });
});

describe("salesByCustomer — grouped ranking sums to total", () => {
  // Acme 3000 + 1500 = 4500 ; Beta 2000 ; Gamma 500 ; total = 7000
  const invoices = [
    { invoice_id: "1", customer: "Acme", amount: 3000 },
    { invoice_id: "2", customer: "Beta", amount: 2000 },
    { invoice_id: "3", customer: "Acme", amount: 1500 },
    { invoice_id: "4", customer: "Gamma", amount: 500 },
  ];

  it("ranks customers descending and reconciles to grand total", () => {
    const r = FinancialReportSuiteEngine.salesByCustomer(invoices);
    expect(r.total).toBeCloseTo(7000, 2);
    expect(r.groups.map((g) => g.key)).toEqual(["Acme", "Beta", "Gamma"]);
    expect(r.groups[0].amount).toBeCloseTo(4500, 2);
    expect(r.groups[0].share).toBeCloseTo(4500 / 7000, 6);
    const summed = r.groups.reduce((s, g) => s + g.amount, 0);
    expect(summed).toBeCloseTo(r.total, 2);
    expect(r.reconciled).toBe(true);
  });

  it("empty invoices → zero report (adversarial: empty)", () => {
    const r = FinancialReportSuiteEngine.salesByCustomer([]);
    expect(r.total).toBe(0);
    expect(r.groupCount).toBe(0);
    expect(r.groups).toHaveLength(0);
  });

  it("THROWS on a NaN amount (adversarial)", () => {
    expect(() =>
      FinancialReportSuiteEngine.salesByCustomer([{ invoice_id: "x", customer: "Acme", amount: Number.NaN }]),
    ).toThrow();
  });
});

describe("salesByItem — grouped item ranking", () => {
  // Widget 100.10 + 50.05 = 150.15 ; Gear 75.25 ; total = 225.40
  it("groups by item and reconciles (half-even cents)", () => {
    const r = FinancialReportSuiteEngine.salesByItem([
      { item: "Widget", amount: 100.1 },
      { item: "Gear", amount: 75.25 },
      { item: "Widget", amount: 50.05 },
    ]);
    expect(r.total).toBeCloseTo(225.4, 2);
    const widget = r.groups.find((g) => g.key === "Widget");
    expect(widget?.amount).toBeCloseTo(150.15, 2);
    expect(r.groups.reduce((s, g) => s + g.amount, 0)).toBeCloseTo(r.total, 2);
  });
});

describe("plByClass — P&L segmented by class tag (reuses GL account types)", () => {
  // Mill : CR 4000 revenue 1000                         → net  1000
  // Lathe: CR 4000 revenue 600 ; DR 5500 expense 250    → net   350
  // grand rev 1600 ; exp 250 ; net 1350
  const entries = [
    je("2026-02-03", [["1200", 1000, 0], ["4000", 0, 1000]], { class_tag: "Mill" }),
    je("2026-02-08", [["1200", 600, 0], ["4000", 0, 600]], { class_tag: "Lathe" }),
    je("2026-02-12", [["5500", 250, 0], ["1000", 0, 250]], { class_tag: "Lathe" }),
  ];

  it("segments revenue/expense by class and reconciles grand net", () => {
    const pl = FinancialReportSuiteEngine.plByClass(entries, {
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
    });
    expect(pl.grand_revenue).toBeCloseTo(1600, 2);
    expect(pl.grand_expenses).toBeCloseTo(250, 2);
    expect(pl.grand_net_income).toBeCloseTo(1350, 2);
    const mill = pl.rows.find((r) => r.classTag === "Mill")!;
    const lathe = pl.rows.find((r) => r.classTag === "Lathe")!;
    expect(mill.net_income).toBeCloseTo(1000, 2);
    expect(lathe.total_revenue).toBeCloseTo(600, 2);
    expect(lathe.total_expenses).toBeCloseTo(250, 2);
    expect(lathe.net_income).toBeCloseTo(350, 2);
    // per-class net sums to grand net
    expect(pl.rows.reduce((s, r) => s + r.net_income, 0)).toBeCloseTo(pl.grand_net_income, 2);
    expect(pl.reconciled).toBe(true);
  });

  it("buckets untagged entries under the default label", () => {
    const pl = FinancialReportSuiteEngine.plByClass(
      [je("2026-02-05", [["1200", 400, 0], ["4000", 0, 400]])],
      { periodStart: "2026-02-01", periodEnd: "2026-02-28" },
    );
    expect(pl.rows).toHaveLength(1);
    expect(pl.rows[0].classTag).toBe("Unclassified");
    expect(pl.rows[0].total_revenue).toBeCloseTo(400, 2);
  });

  it("empty entries → zero report (adversarial)", () => {
    const pl = FinancialReportSuiteEngine.plByClass([], {
      periodStart: "2026-02-01",
      periodEnd: "2026-02-28",
    });
    expect(pl.grand_net_income).toBe(0);
    expect(pl.rows).toHaveLength(0);
  });
});

describe("comparativePeriods — $ and % variance", () => {
  // p1 {A:100, B:50} ; p2 {A:150, B:50, C:80}
  //   A: var +50, pct +0.5 ; B: var 0, pct 0 ; C: var +80, pct null (p1=0)
  it("computes exact $ variance and % variance with a defined zero-base rule", () => {
    const cmp = FinancialReportSuiteEngine.comparativePeriods(
      { A: 100, B: 50 },
      { A: 150, B: 50, C: 80 },
      { p1Label: "Q1", p2Label: "Q2" },
    );
    expect(cmp.p1Label).toBe("Q1");
    const a = cmp.rows.find((r) => r.key === "A")!;
    const b = cmp.rows.find((r) => r.key === "B")!;
    const c = cmp.rows.find((r) => r.key === "C")!;
    expect(a.variance).toBeCloseTo(50, 2);
    expect(a.variancePct).toBeCloseTo(0.5, 6);
    expect(b.variance).toBeCloseTo(0, 2);
    expect(b.variancePct).toBeCloseTo(0, 6);
    expect(c.variance).toBeCloseTo(80, 2);
    expect(c.variancePct).toBeNull(); // p1 = 0 → no defined % base
  });

  it("handles a negative-to-positive swing with correct sign", () => {
    const cmp = FinancialReportSuiteEngine.comparativePeriods({ X: -200 }, { X: 100 });
    const x = cmp.rows[0];
    expect(x.variance).toBeCloseTo(300, 2); // 100 - (-200)
    expect(x.variancePct).toBeCloseTo(300 / 200, 6); // /|p1|
  });

  it("THROWS on a non-finite amount (adversarial: Infinity)", () => {
    expect(() =>
      FinancialReportSuiteEngine.comparativePeriods({ A: Number.POSITIVE_INFINITY }, { A: 1 }),
    ).toThrow(/non-finite/);
  });
});

describe("module constants", () => {
  it("exposes the canonical cash account id", () => {
    expect(CASH_ACCOUNT_ID).toBe("1000");
  });
});
