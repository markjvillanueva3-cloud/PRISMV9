/**
 * JournalEntryEngine.test.ts — Memorized / Recurring / Reversing journal entries
 * (galaxy:business, slot:hotel). QB-PARITY Phase-4 #2.
 *
 * Tests use REAL hand-computed reference values and exercise the contract end-to-end against the
 * real GeneralLedgerEngine: every materialized / reversing entry the engine emits is fed into
 * GeneralLedgerEngine.createJournalEntry and asserted to post (proving the engine produces exactly
 * GL-acceptable, balanced double-entries — and proving no duplication of the GL post path).
 */
import { describe, it, expect } from "vitest";
import {
  JournalEntryEngine,
  journalEntryEngine,
  type MemorizedTemplate,
} from "../engines/JournalEntryEngine.js";
import {
  GeneralLedgerEngine,
  type CreateJournalEntryInput,
} from "../engines/GeneralLedgerEngine.js";
import {
  RECURRING_COUNT_MAX,
  TEMPLATE_GL_SOURCE,
  REVERSING_GL_SOURCE,
} from "../data/journal-entry-templates.js";

// A balanced monthly rent accrual: DR 5500 Operating Expenses 1500.00 / CR 2000 A/P 1500.00.
const RENT_LINES = [
  { account_id: "5500", debit: 1500.0, credit: 0, description: "Monthly rent" },
  { account_id: "2000", debit: 0, credit: 1500.0, description: "Rent payable" },
];

function memorizeRent(): MemorizedTemplate {
  return JournalEntryEngine.memorize({
    name: "Monthly Rent",
    description: "Monthly facility rent accrual",
    lines: RENT_LINES,
  });
}

/** A fresh GL on an isolated temp state path so posts don't collide with the shared ledger. */
function freshGL(tag: string): GeneralLedgerEngine {
  const gl = new GeneralLedgerEngine(`H:/prism-slot-hotel/mcp-server/data/state/__test-je-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  gl.__resetForTests();
  return gl;
}

/** Sum the debit/credit totals of a CreateJournalEntryInput's lines (post-default). */
function lineTotals(entry: CreateJournalEntryInput): { dr: number; cr: number } {
  let dr = 0;
  let cr = 0;
  for (const l of entry.lines) {
    dr += l.debit ?? 0;
    cr += l.credit ?? 0;
  }
  return { dr: Math.round(dr * 100) / 100, cr: Math.round(cr * 100) / 100 };
}

describe("JournalEntryEngine — memorize", () => {
  it("memorizes a balanced template and reports balanced totals (happy path)", () => {
    const t = memorizeRent();
    expect(t.name).toBe("Monthly Rent");
    expect(t.source).toBe(TEMPLATE_GL_SOURCE); // defaults to "manual"
    expect(t.lines).toHaveLength(2);
    expect(t.totalDebits).toBeCloseTo(1500.0, 2);
    expect(t.totalCredits).toBeCloseTo(1500.0, 2);
    expect(t.totalDebits).toBeCloseTo(t.totalCredits, 2);
  });

  it("applies half-even rounding when memorizing sub-cent lines (REUSES roundCentsHalfEven)", () => {
    // 100.005 ties to even → 100.00 ; 100.015 ties to even → 100.02. Build a balanced pair.
    const t = JournalEntryEngine.memorize({
      name: "Half-even",
      description: "banker rounding probe",
      lines: [
        { account_id: "5500", debit: 100.005, credit: 0 }, // → 100.00
        { account_id: "2000", debit: 0, credit: 100.005 }, // → 100.00
      ],
    });
    expect(t.lines[0].debit).toBeCloseTo(100.0, 2);
    expect(t.lines[1].credit).toBeCloseTo(100.0, 2);
    expect(t.totalDebits).toBeCloseTo(t.totalCredits, 2);
  });

  it("THROWS when memorizing an UNBALANCED template (fail loud — never store)", () => {
    expect(() =>
      JournalEntryEngine.memorize({
        name: "Bad",
        description: "debits != credits",
        lines: [
          { account_id: "5500", debit: 1500.0, credit: 0 },
          { account_id: "2000", debit: 0, credit: 1400.0 }, // off by 100
        ],
      }),
    ).toThrow(/unbalanced/i);
  });

  it("THROWS on an unknown account_id (mirrors GL chart membership)", () => {
    expect(() =>
      JournalEntryEngine.memorize({
        name: "Unknown acct",
        description: "bogus account",
        lines: [
          { account_id: "9999", debit: 100, credit: 0 },
          { account_id: "2000", debit: 0, credit: 100 },
        ],
      }),
    ).toThrow(/unknown account_id/i);
  });

  it("THROWS on a single-line (sub-double-entry) template", () => {
    expect(() =>
      JournalEntryEngine.memorize({
        name: "One line",
        description: "not double-entry",
        lines: [{ account_id: "5500", debit: 100, credit: 0 }], // .min(2) is a runtime guard, not a TS length type — throws at parse
      }),
    ).toThrow();
  });

  it("THROWS on a non-finite (NaN/Infinity) line amount", () => {
    expect(() =>
      JournalEntryEngine.memorize({
        name: "NaN line",
        description: "non-finite amount",
        lines: [
          { account_id: "5500", debit: Number.NaN, credit: 0 },
          { account_id: "2000", debit: 0, credit: 100 },
        ],
      }),
    ).toThrow();
  });
});

describe("JournalEntryEngine — materialize → GL post", () => {
  it("materializes a dated, balanced entry the REAL GeneralLedgerEngine accepts", () => {
    const t = memorizeRent();
    const entry = JournalEntryEngine.materialize(t, { date: "2026-01-31", refId: "RENT-2026-01" });
    expect(entry.date).toBe("2026-01-31");
    expect(entry.reference_id).toBe("RENT-2026-01");
    const { dr, cr } = lineTotals(entry);
    expect(dr).toBeCloseTo(1500.0, 2);
    expect(cr).toBeCloseTo(1500.0, 2);

    // Feed into the real GL — this is the proof of GL-acceptability (no duplicate post path).
    const gl = freshGL("materialize");
    const posted = gl.createJournalEntry(entry);
    expect(posted.posted).toBe(true);
    expect(posted.lines).toHaveLength(2);
    const tb = gl.getTrialBalance("2026-01-31");
    expect(tb.balanced).toBe(true);
    expect(tb.total_debits).toBeCloseTo(1500.0, 2);
    expect(tb.total_credits).toBeCloseTo(1500.0, 2);
  });

  it("THROWS on a malformed materialize date", () => {
    const t = memorizeRent();
    expect(() => JournalEntryEngine.materialize(t, { date: "01-31-2026" })).toThrow(/YYYY-MM-DD/);
  });
});

describe("JournalEntryEngine — scheduleRecurring", () => {
  it("monthly × 3 → 3 dated entries, each balanced and GL-postable (end-of-month clamp)", () => {
    const t = memorizeRent();
    const occ = JournalEntryEngine.scheduleRecurring(t, {
      frequency: "monthly",
      startDate: "2026-01-31",
      count: 3,
      refId: "RENT",
    });
    expect(occ).toHaveLength(3);
    // Jan-31 → Feb-28 (2026 not leap) → Mar-31  (clamping proven, NOT Mar-03)
    expect(occ.map((o) => o.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    expect(occ.map((o) => o.sequence)).toEqual([1, 2, 3]);

    // Post all three into the real GL; trial balance = 3 × 1500 each side.
    const gl = freshGL("recurring-monthly");
    for (const o of occ) {
      const { dr, cr } = lineTotals(o.entry);
      expect(dr).toBeCloseTo(1500.0, 2);
      expect(cr).toBeCloseTo(1500.0, 2);
      gl.createJournalEntry(o.entry);
    }
    const tb = gl.getTrialBalance("2026-03-31");
    expect(tb.balanced).toBe(true);
    expect(tb.total_debits).toBeCloseTo(4500.0, 2); // 3 × 1500
    expect(tb.total_credits).toBeCloseTo(4500.0, 2);
  });

  it("weekly × 4 → +7-day steps", () => {
    const t = memorizeRent();
    const occ = JournalEntryEngine.scheduleRecurring(t, {
      frequency: "weekly",
      startDate: "2026-02-26", // crosses month boundary into March
      count: 4,
    });
    expect(occ.map((o) => o.date)).toEqual(["2026-02-26", "2026-03-05", "2026-03-12", "2026-03-19"]);
  });

  it("quarterly × 4 → +3-month steps spanning a year", () => {
    const t = memorizeRent();
    const occ = JournalEntryEngine.scheduleRecurring(t, {
      frequency: "quarterly",
      startDate: "2026-01-15",
      count: 4,
    });
    expect(occ.map((o) => o.date)).toEqual(["2026-01-15", "2026-04-15", "2026-07-15", "2026-10-15"]);
  });

  it("THROWS on count = 0 (adversarial)", () => {
    const t = memorizeRent();
    expect(() =>
      JournalEntryEngine.scheduleRecurring(t, { frequency: "monthly", startDate: "2026-01-01", count: 0 }),
    ).toThrow(/count must be in/i);
  });

  it("THROWS on count = NaN (adversarial — Zod number schema rejects NaN at the boundary)", () => {
    const t = memorizeRent();
    // z.number() treats NaN as not-a-number → throws "expected number, received NaN" before the
    // explicit #assertValidCount finite-check. Either layer satisfies fail-loud; assert it throws.
    expect(() =>
      JournalEntryEngine.scheduleRecurring(t, { frequency: "monthly", startDate: "2026-01-01", count: Number.NaN }),
    ).toThrow(/NaN|finite/i);
  });

  it("THROWS on count = Infinity (adversarial — Zod number schema rejects non-finite at the boundary)", () => {
    const t = memorizeRent();
    // z.number() rejects Infinity ("expected number, received number") before #assertValidCount.
    // Fail-loud is satisfied at the schema layer; assert the throw happens.
    expect(() =>
      JournalEntryEngine.scheduleRecurring(t, { frequency: "monthly", startDate: "2026-01-01", count: Number.POSITIVE_INFINITY }),
    ).toThrow();
  });

  it("THROWS on a non-integer count (adversarial)", () => {
    const t = memorizeRent();
    expect(() =>
      JournalEntryEngine.scheduleRecurring(t, { frequency: "monthly", startDate: "2026-01-01", count: 2.5 }),
    ).toThrow(/integer/i);
  });

  it("THROWS on count over RECURRING_COUNT_MAX (blast-radius bound)", () => {
    const t = memorizeRent();
    expect(() =>
      JournalEntryEngine.scheduleRecurring(t, {
        frequency: "monthly",
        startDate: "2026-01-01",
        count: RECURRING_COUNT_MAX + 1,
      }),
    ).toThrow(/count must be in/i);
  });
});

describe("JournalEntryEngine — createReversing", () => {
  it("swaps dr↔cr, dates reverseDate, tags adjustment, and nets to ZERO with the original in GL", () => {
    // Original accrual: DR 5300 Payroll Tax Expense 875.50 / CR 2200 Accrued Payroll 875.50.
    const original = JournalEntryEngine.materialize(
      JournalEntryEngine.memorize({
        name: "Payroll tax accrual",
        description: "Period-end payroll tax accrual",
        lines: [
          { account_id: "5300", debit: 875.5, credit: 0 },
          { account_id: "2200", debit: 0, credit: 875.5 },
        ],
      }),
      { date: "2026-01-31", refId: "ACCR-PRTAX-JAN" },
    );

    const reversing = JournalEntryEngine.createReversing(original, { reverseDate: "2026-02-01" });
    expect(reversing.date).toBe("2026-02-01");
    expect(reversing.source).toBe(REVERSING_GL_SOURCE); // "adjustment"
    // dr↔cr swap: account 5300 was a 875.50 debit → now a 875.50 credit; 2200 the reverse.
    const l5300 = reversing.lines.find((l) => l.account_id === "5300")!;
    const l2200 = reversing.lines.find((l) => l.account_id === "2200")!;
    expect(l5300.credit).toBeCloseTo(875.5, 2);
    expect(l5300.debit ?? 0).toBeCloseTo(0, 2);
    expect(l2200.debit).toBeCloseTo(875.5, 2);
    expect(l2200.credit ?? 0).toBeCloseTo(0, 2);

    // Reversing entry itself balances.
    const rt = lineTotals(reversing);
    expect(rt.dr).toBeCloseTo(875.5, 2);
    expect(rt.cr).toBeCloseTo(875.5, 2);

    // Post BOTH into the real GL — net effect per account must be zero (accrual reversed out).
    const gl = freshGL("reversing");
    gl.createJournalEntry(original);
    gl.createJournalEntry(reversing);
    const tb = gl.getTrialBalance("2026-02-01");
    expect(tb.balanced).toBe(true);
    const row5300 = tb.rows.find((r) => r.account_id === "5300")!;
    const row2200 = tb.rows.find((r) => r.account_id === "2200")!;
    expect(row5300.balance).toBeCloseTo(0, 2); // expense accrued then reversed → net 0
    expect(row2200.balance).toBeCloseTo(0, 2); // liability accrued then reversed → net 0
  });

  it("preserves total magnitude across the reversal (multi-line, uneven split)", () => {
    // 3-line original: DR 5100 600 + DR 5200 400 / CR 2000 1000.
    const original: CreateJournalEntryInput = {
      date: "2026-03-31",
      description: "Multi-line accrual",
      source: "adjustment",
      lines: [
        { account_id: "5100", debit: 600, credit: 0 },
        { account_id: "5200", debit: 400, credit: 0 },
        { account_id: "2000", debit: 0, credit: 1000 },
      ],
    };
    const rev = JournalEntryEngine.createReversing(original, { reverseDate: "2026-04-01" });
    const ot = lineTotals(original);
    const rt = lineTotals(rev);
    // magnitude preserved: original Σdr == reversal Σcr, and vice-versa.
    expect(rt.cr).toBeCloseTo(ot.dr, 2); // 1000
    expect(rt.dr).toBeCloseTo(ot.cr, 2); // 1000
    expect(rt.dr).toBeCloseTo(rt.cr, 2); // reversal balances
  });

  it("THROWS when reversing an entry with no lines[] array (adversarial)", () => {
    expect(() =>
      // @ts-expect-error intentionally missing lines for the adversarial test
      JournalEntryEngine.createReversing({ description: "no lines" }, { reverseDate: "2026-02-01" }),
    ).toThrow(/lines\[\] array/);
  });

  it("THROWS when reversing an UNBALANCED source entry (would hide the imbalance)", () => {
    const bad: CreateJournalEntryInput = {
      date: "2026-01-31",
      description: "unbalanced source",
      source: "adjustment",
      lines: [
        { account_id: "5500", debit: 500, credit: 0 },
        { account_id: "2000", debit: 0, credit: 400 }, // off by 100
      ],
    };
    expect(() => JournalEntryEngine.createReversing(bad, { reverseDate: "2026-02-01" })).toThrow(/unbalanced/i);
  });
});

describe("JournalEntryEngine — exports", () => {
  it("exposes the camelCase alias bound to the class", () => {
    expect(journalEntryEngine).toBe(JournalEntryEngine);
  });
});
