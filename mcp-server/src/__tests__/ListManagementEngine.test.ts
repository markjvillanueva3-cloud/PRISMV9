/**
 * ListManagementEngine.test.ts — QB "Lists" infrastructure (galaxy:business, slot:hotel).
 *
 * Reference values are hand-computed UTC calendar arithmetic + banker's-rounded discount amounts.
 * One test feeds a real ListManagementEngine term + a real GeneralLedgerEngine invoice posting to
 * prove the scheduling layer composes with the GL system-of-record (no duplication).
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  ListManagementEngine,
  type PaymentTerm,
} from "../engines/ListManagementEngine.js";
import { GeneralLedgerEngine } from "../engines/GeneralLedgerEngine.js";

beforeEach(() => {
  ListManagementEngine.__resetForTests();
});

describe("ListManagementEngine — payment terms + due-date math", () => {
  it("defines Net-30 and computes the due date 2026-01-15 → 2026-02-14 (across the month boundary)", () => {
    const term = ListManagementEngine.defineTerm({ termId: "T_NET30", name: "Net 30", netDays: 30 });
    expect(term.netDays).toBe(30);
    expect(term.discountPct).toBeNull();
    expect(term.discountDays).toBeNull();
    // 2026-01-15 + 30 days: Jan has 31 days, so +16 lands on 2026-01-31, +14 more → 2026-02-14.
    expect(ListManagementEngine.dueDate(term, "2026-01-15")).toBe("2026-02-14");
    // by-id path resolves the same way
    expect(ListManagementEngine.dueDate("T_NET30", "2026-01-15")).toBe("2026-02-14");
  });

  it("computes a Net-60 due date across a YEAR boundary 2025-12-01 → 2026-01-30", () => {
    const term = ListManagementEngine.defineTerm({ termId: "T_NET60", name: "Net 60", netDays: 60 });
    // 2025-12-01 + 60: Dec has 31 days → +30 = 2025-12-31, +30 more → 2026-01-30.
    expect(ListManagementEngine.dueDate(term, "2025-12-01")).toBe("2026-01-30");
  });

  it("Due-on-receipt (netDays=0) returns the invoice date itself, discountDate null", () => {
    const term = ListManagementEngine.defineTerm({ termId: "T_DOR", name: "Due on receipt", netDays: 0 });
    expect(ListManagementEngine.dueDate(term, "2026-03-09")).toBe("2026-03-09");
    expect(ListManagementEngine.discountDate(term, "2026-03-09")).toBeNull();
  });

  it("handles a leap-day boundary: 2024-02-01 + 30 = 2024-03-02 (2024 is a leap year, Feb has 29 days)", () => {
    const term = ListManagementEngine.defineTerm({ termId: "T_LEAP", name: "Net 30 leap", netDays: 30 });
    // 2024-02-01 + 28 → 2024-02-29, +2 more → 2024-03-02.
    expect(ListManagementEngine.dueDate(term, "2024-02-01")).toBe("2024-03-02");
  });
});

describe("ListManagementEngine — 2/10 Net 30 discount term", () => {
  let term: PaymentTerm;
  beforeEach(() => {
    term = ListManagementEngine.defineTerm({
      termId: "T_2_10_N30",
      name: "2% 10 Net 30",
      netDays: 30,
      discountPct: 0.02,
      discountDays: 10,
    });
  });

  it("computes discountDate = invoice + 10 and dueDate = invoice + 30", () => {
    // 2026-01-15 + 10 → 2026-01-25 ; + 30 → 2026-02-14.
    expect(ListManagementEngine.discountDate(term, "2026-01-15")).toBe("2026-01-25");
    expect(ListManagementEngine.dueDate(term, "2026-01-15")).toBe("2026-02-14");
  });

  it("offers the 2% discount when paid on/before the discount date and money reconciles both ways", () => {
    // gross 1000.00, paid on discount date 2026-01-25 → discount = 20.00, netDue = 980.00.
    const evalOnDate = ListManagementEngine.evaluateDiscount(term, "2026-01-15", "2026-01-25", 1000);
    expect(evalOnDate.discountAvailable).toBe(true);
    expect(evalOnDate.discountAmount).toBeCloseTo(20.0, 2);
    expect(evalOnDate.netDue).toBeCloseTo(980.0, 2);
    // both-ways reconciliation: discount + net === gross to the cent
    expect(evalOnDate.discountAmount + evalOnDate.netDue).toBeCloseTo(1000.0, 2);
  });

  it("withholds the discount when paid after the discount date (still within net window)", () => {
    // paid 2026-01-26 (one day past the 01-25 discount date) → no discount, full 1000 due.
    const evalLate = ListManagementEngine.evaluateDiscount(term, "2026-01-15", "2026-01-26", 1000);
    expect(evalLate.discountAvailable).toBe(false);
    expect(evalLate.discountAmount).toBeCloseTo(0, 2);
    expect(evalLate.netDue).toBeCloseTo(1000.0, 2);
  });

  it("applies banker's (half-even) rounding to the discount amount", () => {
    // gross 12.25, 2% → 0.245 → exactly at the half-cent tie at the 3rd decimal? 0.245 rounds to
    // the cent: 24.5 cents → tie → even → 24 cents = 0.24 (round-half-to-even, floor 24 is even).
    const e = ListManagementEngine.evaluateDiscount(term, "2026-01-15", "2026-01-20", 12.25);
    expect(e.discountAmount).toBeCloseTo(0.24, 2);
    expect(e.netDue).toBeCloseTo(12.01, 2);
    expect(e.discountAmount + e.netDue).toBeCloseTo(12.25, 2);
  });
});

describe("ListManagementEngine — term invariants (fail loud)", () => {
  it("THROWS when discountDays > netDays (discount window past the due date)", () => {
    expect(() =>
      ListManagementEngine.defineTerm({ termId: "T_BAD", name: "bad", netDays: 10, discountPct: 0.02, discountDays: 30 }),
    ).toThrow(/discountDays .* must be <= netDays/);
  });

  it("THROWS on a duplicate term id", () => {
    ListManagementEngine.defineTerm({ termId: "T_DUP", name: "first", netDays: 15 });
    expect(() => ListManagementEngine.defineTerm({ termId: "T_DUP", name: "second", netDays: 30 })).toThrow(/duplicate term id/);
  });

  it("THROWS on a negative netDays (adversarial)", () => {
    expect(() => ListManagementEngine.defineTerm({ termId: "T_NEG", name: "neg", netDays: -5 })).toThrow();
  });

  it("THROWS on a non-integer netDays (adversarial)", () => {
    expect(() => ListManagementEngine.defineTerm({ termId: "T_FRAC", name: "frac", netDays: 30.5 })).toThrow(/integer/);
  });

  it("THROWS on a non-finite netDays (NaN / Infinity adversarial)", () => {
    expect(() => ListManagementEngine.defineTerm({ termId: "T_NAN", name: "nan", netDays: Number.NaN })).toThrow();
    expect(() => ListManagementEngine.defineTerm({ termId: "T_INF", name: "inf", netDays: Number.POSITIVE_INFINITY })).toThrow();
  });

  it("THROWS on a half-specified discount (pct without days, days without pct)", () => {
    expect(() =>
      ListManagementEngine.defineTerm({ termId: "T_HALF1", name: "pct only", netDays: 30, discountPct: 0.02 }),
    ).toThrow(/jointly required/);
    expect(() =>
      ListManagementEngine.defineTerm({ termId: "T_HALF2", name: "days only", netDays: 30, discountDays: 10 }),
    ).toThrow(/jointly required/);
  });

  it("THROWS on a discountPct outside (0,1] — e.g. 2 (someone passed a percent not a fraction)", () => {
    expect(() =>
      ListManagementEngine.defineTerm({ termId: "T_PCT", name: "pct200", netDays: 30, discountPct: 2, discountDays: 10 }),
    ).toThrow(/<= 1/);
  });

  it("getTerm THROWS on an unknown term id (never silently returns a default window)", () => {
    expect(() => ListManagementEngine.getTerm("NOPE")).toThrow(/unknown term id/);
    expect(() => ListManagementEngine.dueDate("NOPE", "2026-01-15")).toThrow(/unknown term id/);
  });

  it("dueDate THROWS on a malformed invoice date and an impossible calendar date", () => {
    const t = ListManagementEngine.defineTerm({ termId: "T_DT", name: "n30", netDays: 30 });
    expect(() => ListManagementEngine.dueDate(t, "01/15/2026")).toThrow(/YYYY-MM-DD/);
    expect(() => ListManagementEngine.dueDate(t, "2026-02-30")).toThrow(/invalid calendar date/);
  });

  it("evaluateDiscount THROWS on a negative / non-finite grossAmount", () => {
    const t = ListManagementEngine.defineTerm({ termId: "T_EV", name: "2/10 n30", netDays: 30, discountPct: 0.02, discountDays: 10 });
    expect(() => ListManagementEngine.evaluateDiscount(t, "2026-01-15", "2026-01-20", -5)).toThrow(/non-negative/);
    expect(() => ListManagementEngine.evaluateDiscount(t, "2026-01-15", "2026-01-20", Number.NaN)).toThrow();
  });
});

describe("ListManagementEngine — name-list CRUD (paymentMethods / customerTypes / vendorTypes)", () => {
  it("adds a payment method, lists it, and THROWS on a duplicate id", () => {
    const e = ListManagementEngine.addListEntry({ listType: "paymentMethods", id: "ZELLE", name: "Zelle" });
    expect(e.active).toBe(true);
    expect(e.listType).toBe("paymentMethods");
    const ids = ListManagementEngine.listEntries("paymentMethods").map((x) => x.id);
    expect(ids).toContain("ZELLE");
    // seeded defaults are present too
    expect(ids).toContain("CHECK");
    expect(() => ListManagementEngine.addListEntry({ listType: "paymentMethods", id: "ZELLE", name: "dup" })).toThrow(/duplicate paymentMethods id/);
  });

  it("deactivates a list entry (soft-delete): hidden by default, visible with includeInactive", () => {
    ListManagementEngine.addListEntry({ listType: "customerTypes", id: "RESELLER", name: "Reseller" });
    const deact = ListManagementEngine.deactivateListEntry("customerTypes", "RESELLER");
    expect(deact.active).toBe(false);
    // default list hides inactive
    expect(ListManagementEngine.listEntries("customerTypes").map((x) => x.id)).not.toContain("RESELLER");
    // includeInactive surfaces it
    expect(
      ListManagementEngine.listEntries("customerTypes", { includeInactive: true }).map((x) => x.id),
    ).toContain("RESELLER");
  });

  it("deactivateListEntry THROWS on an unknown id", () => {
    expect(() => ListManagementEngine.deactivateListEntry("vendorTypes", "GHOST")).toThrow(/cannot deactivate unknown vendorTypes id/);
  });

  it("REUSES the GL chart: a valid linkedAccount passes, an invalid one THROWS", () => {
    // "4000" Sales Revenue is a real chart member → passes.
    const ok = ListManagementEngine.addListEntry({ listType: "vendorTypes", id: "COMM", name: "Commission", linkedAccount: "4000" });
    expect(ok.linkedAccount).toBe("4000");
    // "9999" is not in the canonical chart → THROWS (validated against GeneralLedgerEngine).
    expect(() =>
      ListManagementEngine.addListEntry({ listType: "vendorTypes", id: "BOGUS", name: "Bogus", linkedAccount: "9999" }),
    ).toThrow(/not a member of the GL chart/);
  });
});

describe("ListManagementEngine × GeneralLedgerEngine — scheduling layer composes with the GL system of record", () => {
  it("drives a real GL invoice's due-date schedule off a defined term (no GL re-implementation)", () => {
    // 1) Define the term in the lists layer.
    const term = ListManagementEngine.defineTerm({ termId: "T_COMPOSE", name: "Net 30", netDays: 30, discountPct: 0.02, discountDays: 10 });
    const invoiceDate = "2026-01-15";
    const dueDate = ListManagementEngine.dueDate(term, invoiceDate);
    const discountDate = ListManagementEngine.discountDate(term, invoiceDate);
    expect(dueDate).toBe("2026-02-14");
    expect(discountDate).toBe("2026-01-25");

    // 2) Post a REAL balanced invoice through the GL (isolated state path) — the lists layer does
    //    NOT post; the GL is the system of record. Proves both engines compose.
    const gl = new GeneralLedgerEngine("H:/prism/state/shared/__test_list_mgmt_compose.json");
    gl.__resetForTests();
    const je = gl.recordInvoice({ invoice_id: "INV-COMPOSE-1", amount: 1000, tax: 0, date: invoiceDate });
    expect(je.posted).toBe(true);
    // GL invariant: the posting balances (Σdebits === Σcredits).
    const dr = je.lines.reduce((s, l) => s + l.debit, 0);
    const cr = je.lines.reduce((s, l) => s + l.credit, 0);
    expect(dr).toBeCloseTo(cr, 2);
    expect(dr).toBeCloseTo(1000.0, 2);

    // 3) Evaluate the early-pay discount the buyer earns by paying on the discount date.
    const ev = ListManagementEngine.evaluateDiscount(term, invoiceDate, discountDate as string, 1000);
    expect(ev.discountAvailable).toBe(true);
    expect(ev.netDue).toBeCloseTo(980.0, 2);
  });
});

describe("ListManagementEngine — spanning configs (Net 15 / Net 45 / 1/10 Net 30)", () => {
  it("Net 15 over a 28-day February: 2026-02-20 + 15 = 2026-03-07", () => {
    const t = ListManagementEngine.defineTerm({ termId: "S_N15", name: "Net 15", netDays: 15 });
    // 2026 is NOT a leap year (Feb=28). 2026-02-20 + 8 → 2026-02-28, +7 → 2026-03-07.
    expect(ListManagementEngine.dueDate(t, "2026-02-20")).toBe("2026-03-07");
  });

  it("Net 45 spanning two month boundaries: 2026-01-20 + 45 = 2026-03-06", () => {
    const t = ListManagementEngine.defineTerm({ termId: "S_N45", name: "Net 45", netDays: 45 });
    // +11 → 2026-01-31, +28 → 2026-02-28, +6 → 2026-03-06.
    expect(ListManagementEngine.dueDate(t, "2026-01-20")).toBe("2026-03-06");
  });

  it("1/10 Net 30 discount of 1% on 2500.00 = 25.00, netDue 2475.00", () => {
    const t = ListManagementEngine.defineTerm({ termId: "S_1_10_N30", name: "1% 10 Net 30", netDays: 30, discountPct: 0.01, discountDays: 10 });
    const ev = ListManagementEngine.evaluateDiscount(t, "2026-06-01", "2026-06-10", 2500);
    expect(ev.discountDate).toBe("2026-06-11");
    expect(ev.discountAvailable).toBe(true);
    expect(ev.discountAmount).toBeCloseTo(25.0, 2);
    expect(ev.netDue).toBeCloseTo(2475.0, 2);
  });

  it("seeded factory defaults are present (Net 30 + 2/10 Net 30) on first access", () => {
    const ids = ListManagementEngine.listTerms().map((t) => t.termId);
    expect(ids).toContain("NET_30");
    expect(ids).toContain("2_10_NET_30");
    const seededDiscount = ListManagementEngine.getTerm("2_10_NET_30");
    expect(seededDiscount.discountPct).toBeCloseTo(0.02, 9);
    expect(seededDiscount.discountDays).toBe(10);
  });
});
