/**
 * RecurringExpenseEngine.test.ts — hotel iter12 / U-RECURRING-EXPENSE.
 * Covers the financial-invariant gate, PII redaction, R12 fail-loud
 * surface, and deterministic due-date forecast with end-of-month clamping.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { recurringExpenseEngine } from "../engines/RecurringExpenseEngine.js";

const COMED_INPUT = {
  vendor_name: "ComEd",
  category: "utility" as const,
  description: "Electric service",
  amount: 1_250.00,
  frequency: "monthly" as const,
  start_date: "2026-01-15",
};

const ADOBE_INPUT = {
  vendor_name: "Adobe",
  category: "subscription" as const,
  description: "Creative Cloud (5 seats)",
  amount: 299.95,
  frequency: "monthly" as const,
  start_date: "2026-02-01",
};

const INS_INPUT = {
  vendor_name: "Hartford",
  category: "insurance" as const,
  description: "General Liability + WC",
  amount: 4_800.00,
  frequency: "quarterly" as const,
  start_date: "2026-03-01",
};

const ANNUAL_DUES_INPUT = {
  vendor_name: "PMA",
  category: "membership" as const,
  description: "Precision Metalforming Association",
  amount: 2_400.00,
  frequency: "annual" as const,
  start_date: "2026-01-01",
};

describe("RecurringExpenseEngine — create + read", () => {
  beforeEach(() => recurringExpenseEngine.__resetForTests());

  it("creates an expense with REXP-NNNNNN id and defensive copy", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT);
    expect(e.id).toMatch(/^REXP-\d{6}$/);
    expect(e.vendor_name).toBe("ComEd");
    expect(e.active).toBe(true);
    expect(e.auto_renew).toBe(true);
    // Mutating the returned object does NOT affect storage
    e.vendor_name = "MUTATED";
    const reread = recurringExpenseEngine.get(e.id);
    expect(reread?.vendor_name).toBe("ComEd");
  });

  it("get(null/empty/missing) returns null (never throws)", () => {
    expect(recurringExpenseEngine.get("")).toBe(null);
    expect(recurringExpenseEngine.get("REXP-999999")).toBe(null);
  });

  it("list returns all entries in deterministic id ASC order", () => {
    const a = recurringExpenseEngine.create(COMED_INPUT);
    const b = recurringExpenseEngine.create(ADOBE_INPUT);
    const c = recurringExpenseEngine.create(INS_INPUT);
    const all = recurringExpenseEngine.list();
    expect(all.map(e => e.id)).toEqual([a.id, b.id, c.id]);
  });

  it("list(category) filters correctly", () => {
    recurringExpenseEngine.create(COMED_INPUT);
    recurringExpenseEngine.create(ADOBE_INPUT);
    const utilities = recurringExpenseEngine.list(undefined, "utility");
    expect(utilities.length).toBe(1);
    expect(utilities[0].vendor_name).toBe("ComEd");
  });

  it("list(active=false) returns only deactivated entries", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT);
    recurringExpenseEngine.create(ADOBE_INPUT);
    recurringExpenseEngine.deactivate(e.id);
    const inactive = recurringExpenseEngine.list(false);
    expect(inactive.length).toBe(1);
    expect(inactive[0].id).toBe(e.id);
  });
});

describe("RecurringExpenseEngine — PII redaction (hotel-soul)", () => {
  beforeEach(() => recurringExpenseEngine.__resetForTests());

  it("redacts SSN-pattern in memo before storage", () => {
    const e = recurringExpenseEngine.create({
      ...COMED_INPUT,
      memo: "Owner SSN 123-45-6789 on file for ACH setup",
    });
    expect(e.memo).not.toContain("123-45-6789");
    expect(e.memo).toContain("[SSN-REDACTED]");
  });

  it("redacts credit-card-pattern (13-19 digits) in memo", () => {
    const e = recurringExpenseEngine.create({
      ...ADOBE_INPUT,
      memo: "Charged to 4111111111111111 monthly",
    });
    expect(e.memo).not.toContain("4111111111111111");
    expect(e.memo).toContain("[CARD-REDACTED]");
  });

  it("preserves non-PII text in memo", () => {
    const e = recurringExpenseEngine.create({
      ...COMED_INPUT,
      memo: "Account ABC-001 — main shop meter",
    });
    expect(e.memo).toBe("Account ABC-001 — main shop meter");
  });
});

describe("RecurringExpenseEngine — monthlyBurden (financial-invariant gate)", () => {
  beforeEach(() => recurringExpenseEngine.__resetForTests());

  it("normalizes mixed frequencies to $/month correctly", () => {
    recurringExpenseEngine.create(COMED_INPUT);       // $1250/mo
    recurringExpenseEngine.create(ADOBE_INPUT);       // $299.95/mo
    recurringExpenseEngine.create(INS_INPUT);         // $4800/qtr = $1600/mo
    recurringExpenseEngine.create(ANNUAL_DUES_INPUT); // $2400/yr = $200/mo
    const r = recurringExpenseEngine.monthlyBurden();
    // 1250 + 299.95 + 1600 + 200 = 3349.95
    expect(r.total_monthly).toBeCloseTo(3349.95, 2);
    expect(r.total_annual).toBeCloseTo(3349.95 * 12, 2);
  });

  it("sum of category subtotals equals total_monthly (ledger gate)", () => {
    recurringExpenseEngine.create(COMED_INPUT);
    recurringExpenseEngine.create(ADOBE_INPUT);
    recurringExpenseEngine.create(INS_INPUT);
    const r = recurringExpenseEngine.monthlyBurden();
    const sum = Object.values(r.by_category).reduce((s, v) => s + v, 0);
    expect(Math.abs(sum - r.total_monthly)).toBeLessThan(0.01);
    expect(r.ledger_balanced).toBe(true);
  });

  it("by_category buckets match expected normalized values", () => {
    recurringExpenseEngine.create(COMED_INPUT);       // utility: $1250
    recurringExpenseEngine.create(INS_INPUT);         // insurance: $1600
    recurringExpenseEngine.create(ANNUAL_DUES_INPUT); // membership: $200
    const r = recurringExpenseEngine.monthlyBurden();
    expect(r.by_category.utility).toBeCloseTo(1250, 2);
    expect(r.by_category.insurance).toBeCloseTo(1600, 2);
    expect(r.by_category.membership).toBeCloseTo(200, 2);
    expect(r.by_category.subscription).toBe(0);
  });

  it("deactivated expenses excluded from burden total", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT);
    recurringExpenseEngine.create(ADOBE_INPUT);
    recurringExpenseEngine.deactivate(e.id);
    const r = recurringExpenseEngine.monthlyBurden();
    expect(r.active_count).toBe(1);
    expect(r.total_monthly).toBeCloseTo(299.95, 2);
  });

  it("empty store: zeros + ledger_balanced=true", () => {
    const r = recurringExpenseEngine.monthlyBurden();
    expect(r.total_monthly).toBe(0);
    expect(r.active_count).toBe(0);
    expect(r.ledger_balanced).toBe(true);
  });
});

describe("RecurringExpenseEngine — forecastDueDates (deterministic)", () => {
  beforeEach(() => recurringExpenseEngine.__resetForTests());

  it("monthly: 12 lookahead from 2026-01-15 → 2026-02-15..2027-01-15", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT); // start 2026-01-15, monthly
    const f = recurringExpenseEngine.forecastDueDates(e.id, 12);
    expect(f.next_due_dates.length).toBe(12);
    expect(f.next_due_dates[0]).toBe("2026-02-15");
    expect(f.next_due_dates[11]).toBe("2027-01-15");
  });

  it("quarterly: 4 lookahead from 2026-03-01 → 2026-06/09/12/2027-03", () => {
    const e = recurringExpenseEngine.create(INS_INPUT); // start 2026-03-01, quarterly
    const f = recurringExpenseEngine.forecastDueDates(e.id, 4);
    expect(f.next_due_dates).toEqual(["2026-06-01", "2026-09-01", "2026-12-01", "2027-03-01"]);
  });

  it("end-of-month clamping: Jan-31 monthly → Feb-28 next", () => {
    const e = recurringExpenseEngine.create({
      ...COMED_INPUT, start_date: "2026-01-31",
    });
    const f = recurringExpenseEngine.forecastDueDates(e.id, 1);
    expect(f.next_due_dates[0]).toBe("2026-02-28");
  });

  it("end_date cutoff stops forecast early", () => {
    const e = recurringExpenseEngine.create({
      ...COMED_INPUT, start_date: "2026-01-15", end_date: "2026-04-30",
    });
    const f = recurringExpenseEngine.forecastDueDates(e.id, 12);
    // Feb-15, Mar-15, Apr-15 only (May-15 exceeds end_date)
    expect(f.next_due_dates).toEqual(["2026-02-15", "2026-03-15", "2026-04-15"]);
  });

  it("rejects non-positive lookahead", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT);
    expect(() => recurringExpenseEngine.forecastDueDates(e.id, 0)).toThrow(/positive integer/);
    expect(() => recurringExpenseEngine.forecastDueDates(e.id, -1)).toThrow(/positive integer/);
    expect(() => recurringExpenseEngine.forecastDueDates(e.id, 1.5)).toThrow(/positive integer/);
  });

  it("rejects unknown id", () => {
    expect(() => recurringExpenseEngine.forecastDueDates("REXP-999999", 5)).toThrow(/not found/);
  });
});

describe("RecurringExpenseEngine — mutations", () => {
  beforeEach(() => recurringExpenseEngine.__resetForTests());

  it("updateAmount changes amount + updated_at", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT);
    const originalUpdated = e.updated_at;
    // Force a tick on updated_at by ensuring some time passes
    const updated = recurringExpenseEngine.updateAmount(e.id, 1_400);
    expect(updated.amount).toBe(1_400);
    expect(updated.updated_at >= originalUpdated).toBe(true);
  });

  it("updateAmount rejects non-positive", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT);
    expect(() => recurringExpenseEngine.updateAmount(e.id, 0)).toThrow(/> 0/);
    expect(() => recurringExpenseEngine.updateAmount(e.id, -1)).toThrow(/> 0/);
  });

  it("updateAmount rejects unknown id", () => {
    expect(() => recurringExpenseEngine.updateAmount("REXP-999999", 100)).toThrow(/not found/);
  });

  it("deactivate flips active=false + updates updated_at", () => {
    const e = recurringExpenseEngine.create(COMED_INPUT);
    const deact = recurringExpenseEngine.deactivate(e.id);
    expect(deact.active).toBe(false);
  });

  it("deactivate rejects unknown id", () => {
    expect(() => recurringExpenseEngine.deactivate("REXP-999999")).toThrow(/not found/);
  });
});

describe("RecurringExpenseEngine — R12 fail-loud on create", () => {
  beforeEach(() => recurringExpenseEngine.__resetForTests());

  it("rejects empty vendor_name", () => {
    expect(() => recurringExpenseEngine.create({ ...COMED_INPUT, vendor_name: "" })).toThrow(/empty/);
  });

  it("rejects empty description", () => {
    expect(() => recurringExpenseEngine.create({ ...COMED_INPUT, description: "" })).toThrow(/empty/);
  });

  it("rejects unknown category", () => {
    expect(() => recurringExpenseEngine.create({
      ...COMED_INPUT, category: "groceries" as never,
    })).toThrow(/category/);
  });

  it("rejects unknown frequency", () => {
    expect(() => recurringExpenseEngine.create({
      ...COMED_INPUT, frequency: "biweekly" as never,
    })).toThrow(/frequency/);
  });

  it("rejects non-positive amount", () => {
    expect(() => recurringExpenseEngine.create({ ...COMED_INPUT, amount: 0 })).toThrow(/> 0/);
    expect(() => recurringExpenseEngine.create({ ...COMED_INPUT, amount: -1 })).toThrow(/> 0/);
  });

  it("rejects NaN amount", () => {
    expect(() => recurringExpenseEngine.create({ ...COMED_INPUT, amount: NaN })).toThrow(/finite/);
  });

  it("rejects malformed start_date", () => {
    expect(() => recurringExpenseEngine.create({ ...COMED_INPUT, start_date: "01/15/2026" })).toThrow(/ISO/);
    expect(() => recurringExpenseEngine.create({ ...COMED_INPUT, start_date: "2026-13-01" })).toThrow(/invalid date/);
  });

  it("rejects malformed end_date", () => {
    expect(() => recurringExpenseEngine.create({
      ...COMED_INPUT, end_date: "not-a-date",
    })).toThrow(/ISO/);
  });
});
