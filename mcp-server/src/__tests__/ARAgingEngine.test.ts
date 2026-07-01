/**
 * ARAgingEngine.test.ts — hotel iter13 / U-AR-AGING.
 * Verifies financial-invariant gate, double-entry payment refusal,
 * 5-bucket aging, DSO, balance-weighted bad-debt allowance, R12 fail-loud.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { arAgingEngine } from "../engines/ARAgingEngine.js";

const AS_OF = "2026-06-01";  // fixed reference date for deterministic tests
const CUST_A = "CUST-ALCOA";
const CUST_B = "CUST-FASTENAL";

describe("ARAgingEngine — recordInvoice", () => {
  beforeEach(() => arAgingEngine.__resetForTests());

  it("creates an invoice with INV-NNNNNN id + initial open_balance = amount", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-05-01", amount: 5_000,
    });
    expect(i.id).toMatch(/^INV-\d{6}$/);
    expect(i.amount).toBe(5_000);
    expect(i.paid).toBe(0);
    expect(i.open_balance).toBe(5_000);
    expect(i.status).toBe("open");
  });

  it("defensive copy — mutation does not affect storage", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-05-01", amount: 1_000,
    });
    i.amount = 99_999;
    const reread = arAgingEngine.get(i.id);
    expect(reread?.amount).toBe(1_000);
  });

  it("R12: rejects empty customer_id", () => {
    expect(() => arAgingEngine.recordInvoice({
      customer_id: "", invoice_date: "2026-05-01", amount: 1000,
    })).toThrow(/empty/);
  });

  it("R12: rejects non-positive amount", () => {
    expect(() => arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-05-01", amount: 0,
    })).toThrow(/> 0/);
  });

  it("R12: rejects malformed invoice_date", () => {
    expect(() => arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "05/01/2026", amount: 1000,
    })).toThrow(/ISO/);
  });
});

describe("ARAgingEngine — recordPayment (double-entry gate)", () => {
  beforeEach(() => arAgingEngine.__resetForTests());

  it("partial payment: status='partial', open_balance reduced", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-04-01", amount: 1_000,
    });
    const updated = arAgingEngine.recordPayment(i.id, 300);
    expect(updated.paid).toBe(300);
    expect(updated.open_balance).toBe(700);
    expect(updated.status).toBe("partial");
  });

  it("full payment: status='paid', open_balance=0", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-04-01", amount: 1_000,
    });
    const updated = arAgingEngine.recordPayment(i.id, 1_000);
    expect(updated.paid).toBe(1_000);
    expect(updated.open_balance).toBe(0);
    expect(updated.status).toBe("paid");
  });

  it("HOTEL-SOUL: refuses overpayment (no silent absorption)", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-04-01", amount: 1_000,
    });
    expect(() => arAgingEngine.recordPayment(i.id, 1_001)).toThrow(/exceeds.*open balance/);
  });

  it("HOTEL-SOUL: refuses overpayment after partial too", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-04-01", amount: 1_000,
    });
    arAgingEngine.recordPayment(i.id, 600);
    // open_balance now 400 — paying 500 should refuse
    expect(() => arAgingEngine.recordPayment(i.id, 500)).toThrow(/exceeds/);
  });

  it("R12: rejects non-positive payment", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-04-01", amount: 1_000,
    });
    expect(() => arAgingEngine.recordPayment(i.id, 0)).toThrow(/> 0/);
    expect(() => arAgingEngine.recordPayment(i.id, -10)).toThrow(/> 0/);
  });

  it("R12: rejects unknown invoice id", () => {
    expect(() => arAgingEngine.recordPayment("INV-999999", 100)).toThrow(/not found/);
  });

  it("two partial payments summing to amount → paid status", () => {
    const i = arAgingEngine.recordInvoice({
      customer_id: CUST_A, invoice_date: "2026-04-01", amount: 1_000,
    });
    arAgingEngine.recordPayment(i.id, 400);
    const final = arAgingEngine.recordPayment(i.id, 600);
    expect(final.status).toBe("paid");
    expect(final.open_balance).toBe(0);
  });
});

describe("ARAgingEngine — agingReport (5-bucket + invariant gate)", () => {
  beforeEach(() => arAgingEngine.__resetForTests());

  it("buckets invoices correctly by days-overdue", () => {
    // as_of = 2026-06-01
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-06-15", amount: 100 }); // current (future-dated)
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-15", amount: 200 }); // 17 days → 1_30
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-04-15", amount: 300 }); // 47 days → 31_60
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-03-15", amount: 400 }); // 78 days → 61_90
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-02-15", amount: 500 }); // 106 days → 91_plus

    const r = arAgingEngine.agingReport(AS_OF);
    expect(r.by_bucket.current).toBe(100);
    expect(r.by_bucket["1_30"]).toBe(200);
    expect(r.by_bucket["31_60"]).toBe(300);
    expect(r.by_bucket["61_90"]).toBe(400);
    expect(r.by_bucket["91_plus"]).toBe(500);
    expect(r.total_open_ar).toBe(1500);
    expect(r.ledger_balanced).toBe(true);
  });

  it("HOTEL-SOUL: sum of bucket totals == total open AR (within $0.01)", () => {
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-15", amount: 1234.56 });
    arAgingEngine.recordInvoice({ customer_id: CUST_B, invoice_date: "2026-03-01", amount: 5678.90 });
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-04-12", amount: 9999.99 });
    const r = arAgingEngine.agingReport(AS_OF);
    const sum = Object.values(r.by_bucket).reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - r.total_open_ar)).toBeLessThan(0.01);
    expect(r.ledger_balanced).toBe(true);
  });

  it("by_customer rolls up correctly across multiple invoices", () => {
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-01", amount: 1_000 });
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-04-01", amount: 2_000 });
    arAgingEngine.recordInvoice({ customer_id: CUST_B, invoice_date: "2026-03-01", amount: 3_000 });
    const r = arAgingEngine.agingReport(AS_OF);
    expect(r.by_customer[CUST_A]).toBe(3_000);
    expect(r.by_customer[CUST_B]).toBe(3_000);
  });

  it("paid invoices excluded from report", () => {
    const i1 = arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-04-01", amount: 1_000 });
    arAgingEngine.recordInvoice({ customer_id: CUST_B, invoice_date: "2026-04-01", amount: 2_000 });
    arAgingEngine.recordPayment(i1.id, 1_000);
    const r = arAgingEngine.agingReport(AS_OF);
    expect(r.total_open_ar).toBe(2_000);
    expect(r.invoice_count_open).toBe(1);
  });

  it("partial payments reflected in open_balance bucketing", () => {
    const i = arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-04-15", amount: 1_000 });
    arAgingEngine.recordPayment(i.id, 600);
    const r = arAgingEngine.agingReport(AS_OF);
    // 2026-04-15 → 47 days overdue → 31_60 bucket → open 400
    expect(r.by_bucket["31_60"]).toBe(400);
    expect(r.total_open_ar).toBe(400);
  });

  it("DSO computed from trailing-year sales", () => {
    // Total trailing sales: $10,000; open AR: $1,500
    // DSO = (1500 / 10000) * 365 = 54.75
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-15", amount: 1_500 }); // open
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-03-01", amount: 8_500 }); // will pay
    const paid = arAgingEngine.list({ status: "open" })[1];
    arAgingEngine.recordPayment(paid.id, 8_500);
    const r = arAgingEngine.agingReport(AS_OF);
    expect(r.dso_days).toBeCloseTo(54.75, 1);
  });

  it("DSO=null when no trailing-year sales", () => {
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2020-01-01", amount: 500 });
    const r = arAgingEngine.agingReport(AS_OF);
    expect(r.dso_days).toBe(null);
  });

  it("bad-debt allowance applies balance-weighted rates", () => {
    // current=$100*0.005, 1_30=$200*0.01, 31_60=$300*0.05, 61_90=$400*0.15, 91_plus=$500*0.40
    // = 0.5 + 2 + 15 + 60 + 200 = 277.5
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-06-15", amount: 100 });
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-15", amount: 200 });
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-04-15", amount: 300 });
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-03-15", amount: 400 });
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-02-15", amount: 500 });
    const r = arAgingEngine.agingReport(AS_OF);
    expect(r.bad_debt_allowance).toBeCloseTo(277.5, 2);
  });

  it("empty store: all zeros + ledger_balanced=true", () => {
    const r = arAgingEngine.agingReport(AS_OF);
    expect(r.total_open_ar).toBe(0);
    expect(r.invoice_count_open).toBe(0);
    expect(r.ledger_balanced).toBe(true);
    expect(r.bad_debt_allowance).toBe(0);
    expect(r.dso_days).toBe(null);
  });

  it("R12: rejects malformed as_of date", () => {
    expect(() => arAgingEngine.agingReport("2026/06/01")).toThrow(/ISO/);
  });
});

describe("ARAgingEngine — list + get", () => {
  beforeEach(() => arAgingEngine.__resetForTests());

  it("list filters by customer", () => {
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-01", amount: 100 });
    arAgingEngine.recordInvoice({ customer_id: CUST_B, invoice_date: "2026-05-01", amount: 200 });
    const aOnly = arAgingEngine.list({ customer_id: CUST_A });
    expect(aOnly.length).toBe(1);
    expect(aOnly[0].customer_id).toBe(CUST_A);
  });

  it("list filters by status", () => {
    const i = arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-01", amount: 100 });
    arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-01", amount: 200 });
    arAgingEngine.recordPayment(i.id, 100);
    expect(arAgingEngine.list({ status: "paid" }).length).toBe(1);
    expect(arAgingEngine.list({ status: "open" }).length).toBe(1);
  });

  it("get(null/empty/missing) returns null (never throws)", () => {
    expect(arAgingEngine.get("")).toBe(null);
    expect(arAgingEngine.get("INV-999999")).toBe(null);
  });

  it("list ordered by id ASC (deterministic)", () => {
    const a = arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-01", amount: 100 });
    const b = arAgingEngine.recordInvoice({ customer_id: CUST_B, invoice_date: "2026-05-01", amount: 200 });
    const c = arAgingEngine.recordInvoice({ customer_id: CUST_A, invoice_date: "2026-05-01", amount: 300 });
    const all = arAgingEngine.list();
    expect(all.map(i => i.id)).toEqual([a.id, b.id, c.id]);
  });
});
