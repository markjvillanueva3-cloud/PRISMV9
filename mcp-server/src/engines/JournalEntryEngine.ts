/**
 * JournalEntryEngine — Memorized / Recurring / Reversing journal entries for the PRISM ERP
 * (galaxy:business, slot:hotel). QuickBooks-parity: the "Memorized / Recurring / Reversing"
 * journal-entry function set (QB-PARITY Phase-4 #2).
 *
 * This is the SCHEDULING / TEMPLATE layer that GeneralLedgerEngine lacks. It does NOT reimplement
 * double-entry, the chart of accounts, balance validation, or the financial statements — it REUSES
 * GeneralLedgerEngine for all of that:
 *   - memorize(template)            → validates the template balances NOW by mirroring GL's exact
 *                                     balance contract (Σdebits == Σcredits, ≥2 lines, known
 *                                     accounts) via GeneralLedgerEngine.CreateJournalEntryInputSchema
 *                                     + the GL chart. Never stores an unbalanced template.
 *   - materialize(template, opts)   → produces a concrete, balanced CreateJournalEntryInput, ready
 *                                     to hand to GeneralLedgerEngine.createJournalEntry verbatim.
 *   - scheduleRecurring(t, opts)    → expands a template into the next N dated, balanced entries
 *                                     (monthly / weekly / quarterly).
 *   - createReversing(entry, opts)  → swaps every line's debit↔credit, dated reverseDate (the
 *                                     standard period-end accrual reversal). Original + reversal net
 *                                     to zero per account.
 *
 * Producer in the shop-ops cycle (PRISM synergy): the QB books / reporting cycle memorizes the
 * recurring monthly entries a die shop posts on autopilot (rent, equipment depreciation accrual,
 * straight-line tooling amortization, the period-end payroll-accrual reversal) so they post on
 * schedule into GeneralLedgerEngine, then roll straight into FinancialReport* / getIncomeStatement /
 * getBalanceSheet — and into the networking-platform financial reporting that consumes those GL
 * statements. Memorized + auto-reversing entries are the difference between books that need a
 * bookkeeper every month and books that close themselves.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - frequency/source/count-bound constants are IMPORTED from data/journal-entry-templates.ts, never inlined.
 *  - a memorized template that does NOT balance THROWS at memorize time (fail loud — never store an
 *    unbalanced template that would later be rejected at GL post, or worse, post a one-sided entry).
 *  - half-even (banker's) rounding to the cent — REUSES roundCentsHalfEven (shared money util) from the shared money util src/data/money.ts.
 *  - recurring count must be a finite positive integer in [1, RECURRING_COUNT_MAX]; NaN/0/negative/
 *    non-integer/over-max THROW.
 *  - createReversing preserves total magnitude and flips sign; the reversed entry also balances and
 *    nets to zero against the original (asserted by construction + verified in tests).
 *  - non-finite / negative line amounts THROW (via the GL line schema we reuse).
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire journal_entry_memorize / journal_entry_materialize / journal_entry_schedule_recurring /
// journal_entry_create_reversing in main post golf-merge. Wiring the stale worktree dispatcher copy
// would clobber ~438 main actions (regression).
import { z } from "zod";
import {
  CreateJournalEntryInputSchema,
  JournalLineSchema,
  CHART_OF_ACCOUNTS,
  type JournalLine,
  type JournalEntry,
} from "./GeneralLedgerEngine.js";
import { roundCentsHalfEven } from "../data/money.js";
import {
  RECURRING_FREQUENCIES,
  FREQUENCY_STEP,
  RECURRING_COUNT_MIN,
  RECURRING_COUNT_MAX,
  TEMPLATE_GL_SOURCE,
  REVERSING_GL_SOURCE,
  ISO_DATE_REGEX,
  JOURNAL_ENTRY_TEMPLATES_SCHEMA_VERSION,
  type RecurringFrequency,
} from "../data/journal-entry-templates.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** cents — mirrors GeneralLedgerEngine.BALANCE_TOLERANCE; floating-point safety for balance checks. */
const BALANCE_TOLERANCE = 0.01;
const MILLIS_PER_DAY = 86_400_000;
const MONTHS_PER_YEAR = 12;

// ============================================================================
// SCHEMAS
// ============================================================================

/** Known account ids, derived from the single source of truth (GL's chart). */
const KNOWN_ACCOUNT_IDS: ReadonlySet<string> = new Set(CHART_OF_ACCOUNTS.map((a) => a.id));

/**
 * A memorize() input. Lines reuse GL's JournalLineSchema (debit/credit ≥0, finite, default 0,
 * non-empty account_id) so a line that GL would reject is rejected here too — no divergent
 * line contract. `source` is constrained to GL's source enum via CreateJournalEntryInputSchema.
 */
const MemorizeTemplateInputSchema = z.object({
  name: z.string().min(1, "template name is required"),
  lines: z.array(JournalLineSchema).min(2, "a journal entry template needs ≥2 lines"),
  source: CreateJournalEntryInputSchema.shape.source.optional(),
  description: z.string().min(1, "template description is required"),
});
export type MemorizeTemplateInput = z.input<typeof MemorizeTemplateInputSchema>;

const MaterializeOptionsSchema = z.object({
  date: z.string().regex(ISO_DATE_REGEX, "date must be YYYY-MM-DD"),
  refId: z.string().min(1).optional(),
});
export type MaterializeOptions = z.input<typeof MaterializeOptionsSchema>;

const ScheduleRecurringOptionsSchema = z.object({
  frequency: z.enum(RECURRING_FREQUENCIES),
  startDate: z.string().regex(ISO_DATE_REGEX, "startDate must be YYYY-MM-DD"),
  count: z.number(),
  refId: z.string().min(1).optional(),
});
export type ScheduleRecurringOptions = z.input<typeof ScheduleRecurringOptionsSchema>;

const ReversingOptionsSchema = z.object({
  reverseDate: z.string().regex(ISO_DATE_REGEX, "reverseDate must be YYYY-MM-DD"),
  refId: z.string().min(1).optional(),
});
export type ReversingOptions = z.input<typeof ReversingOptionsSchema>;

// ============================================================================
// RESULT TYPES
// ============================================================================

/** The concrete, balanced input ready to feed verbatim into GeneralLedgerEngine.createJournalEntry. */
export type CreateJournalEntryInput = z.infer<typeof CreateJournalEntryInputSchema>;

/** A memorized, balance-validated template. Immutable once stored. */
export interface MemorizedTemplate {
  name: string;
  source: CreateJournalEntryInput["source"];
  description: string;
  /** Rounded-to-the-cent lines; balances by construction (validated at memorize time). */
  lines: JournalLine[];
  /** Σdebits == Σcredits, rounded to the cent — carried for fast re-verification at materialize. */
  totalDebits: number;
  totalCredits: number;
  memorizedAt: string;
  schemaVersion: string;
}

/** A single materialized recurring occurrence: a dated, balanced GL input + its index in the series. */
export interface RecurringOccurrence {
  sequence: number; // 1-based
  date: string;
  entry: CreateJournalEntryInput;
}

// ============================================================================
// ENGINE
// ============================================================================

export class JournalEntryEngine {
  // --------------------------------------------------------------------------
  // memorize — store a named reusable template; validate it balances NOW
  // --------------------------------------------------------------------------

  /**
   * Memorize a named, reusable journal-entry template, validating it balances NOW.
   *
   * Mirrors GeneralLedgerEngine's exact balance contract — ≥2 lines (schema), all account_ids known
   * to the GL chart, no both-debit-and-credit line, no zero-zero line, and Σdebits == Σcredits — so
   * a template that GL would reject at post is rejected here instead of being silently stored. An
   * unbalanced template THROWS (fail loud); it is never stored.
   *
   * @param input template `{ name, lines, source?, description }`. `source` defaults to "manual".
   * @returns the stored, balance-validated MemorizedTemplate (cent-rounded lines).
   * @throws if name/description empty, <2 lines, unknown account, malformed line, or unbalanced.
   */
  static memorize(input: MemorizeTemplateInput): MemorizedTemplate {
    const parsed = MemorizeTemplateInputSchema.parse(input); // throws on <2 lines, NaN/neg line amounts, empty name
    const lines = this.#validateAndRoundLines(parsed.lines, `template "${parsed.name}"`);
    const { totalDebits, totalCredits } = this.#assertBalanced(lines, `template "${parsed.name}"`);
    return {
      name: parsed.name,
      source: parsed.source ?? TEMPLATE_GL_SOURCE,
      description: parsed.description,
      lines,
      totalDebits,
      totalCredits,
      memorizedAt: new Date().toISOString(),
      schemaVersion: JOURNAL_ENTRY_TEMPLATES_SCHEMA_VERSION,
    };
  }

  // --------------------------------------------------------------------------
  // materialize — template + date → concrete balanced GL input
  // --------------------------------------------------------------------------

  /**
   * Materialize a memorized template into a concrete, balanced GL input dated `opts.date`, ready to
   * hand verbatim to GeneralLedgerEngine.createJournalEntry. Re-verifies balance (defensive — guards
   * against a hand-mutated template object) and re-parses through GL's own input schema so the
   * returned value is exactly what GL will accept.
   *
   * @param template a MemorizedTemplate (from memorize) — or any balance-valid template-shaped object.
   * @param opts `{ date: YYYY-MM-DD, refId? }`.
   * @returns a CreateJournalEntryInput that GL.createJournalEntry will accept and post.
   * @throws on bad date, or if the template no longer balances.
   */
  static materialize(template: MemorizedTemplate, opts: MaterializeOptions): CreateJournalEntryInput {
    const o = MaterializeOptionsSchema.parse(opts);
    const lines = this.#validateAndRoundLines(template.lines, `template "${template.name}"`);
    this.#assertBalanced(lines, `template "${template.name}" at materialize`);
    const candidate = {
      date: o.date,
      description: template.description,
      source: template.source ?? TEMPLATE_GL_SOURCE,
      reference_id: o.refId,
      lines,
    };
    // Round-trip through GL's own schema so the output is exactly GL-acceptable (defaults applied).
    return CreateJournalEntryInputSchema.parse(candidate);
  }

  // --------------------------------------------------------------------------
  // scheduleRecurring — expand a template into the next N dated entries
  // --------------------------------------------------------------------------

  /**
   * Generate the next N dated, balanced entries from a memorized template at a fixed frequency.
   * Each occurrence is a fully-formed CreateJournalEntryInput (balanced, GL-acceptable). Dates step
   * by the FREQUENCY_STEP for the chosen frequency, computed with explicit UTC calendar math:
   *   - weekly    → +7 days each step,
   *   - monthly   → +1 month, clamped to end-of-month (Jan-31 → Feb-28/29, not Mar-03),
   *   - quarterly → +3 months, same clamping.
   *
   * @param template a MemorizedTemplate.
   * @param opts `{ frequency, startDate: YYYY-MM-DD, count, refId? }`. count ∈ [1, RECURRING_COUNT_MAX].
   * @returns N RecurringOccurrence rows, each `{ sequence, date, entry }`, in chronological order.
   * @throws if count is not a finite positive integer in range, or startDate/frequency invalid.
   */
  static scheduleRecurring(template: MemorizedTemplate, opts: ScheduleRecurringOptions): RecurringOccurrence[] {
    const o = ScheduleRecurringOptionsSchema.parse(opts);
    this.#assertValidCount(o.count);
    const step = FREQUENCY_STEP[o.frequency as RecurringFrequency];
    const occurrences: RecurringOccurrence[] = [];
    for (let i = 0; i < o.count; i++) {
      const date =
        step.unit === "day"
          ? addDaysUTC(o.startDate, step.amount * i)
          : addMonthsUTC(o.startDate, step.amount * i);
      occurrences.push({
        sequence: i + 1,
        date,
        entry: this.materialize(template, { date, refId: o.refId }),
      });
    }
    return occurrences;
  }

  // --------------------------------------------------------------------------
  // createReversing — swap dr↔cr, dated reverseDate
  // --------------------------------------------------------------------------

  /**
   * Create the standard auto-reversing entry for an accrual: every line's debit and credit are
   * swapped, dated `opts.reverseDate`. The reversed entry balances (swapping dr↔cr preserves
   * Σdebits == Σcredits) and the original + reversal net to zero per account (each line's effect is
   * exactly negated). The returned value is a GL-acceptable CreateJournalEntryInput tagged source
   * "adjustment" (the textbook period-end reversal).
   *
   * Accepts either a posted GeneralLedgerEngine.JournalEntry or a CreateJournalEntryInput (anything
   * with `lines` + a `description`); both round-trip through GL's input schema.
   *
   * @param entry the entry to reverse (posted JournalEntry or a CreateJournalEntryInput).
   * @param opts `{ reverseDate: YYYY-MM-DD, refId? }`.
   * @returns a balanced, dr↔cr-swapped CreateJournalEntryInput dated reverseDate.
   * @throws on bad date, <2 lines, unknown account, malformed line, or unbalanced source entry.
   */
  static createReversing(
    entry: JournalEntry | CreateJournalEntryInput,
    opts: ReversingOptions,
  ): CreateJournalEntryInput {
    const o = ReversingOptionsSchema.parse(opts);
    if (!entry || !Array.isArray((entry as { lines?: unknown }).lines)) {
      throw new Error("JournalEntryEngine.createReversing: entry must have a lines[] array");
    }
    const sourceLines = this.#validateAndRoundLines(
      (entry as { lines: JournalLine[] }).lines,
      "entry to reverse",
    );
    // The source entry must itself balance — reversing a one-sided entry would hide the imbalance.
    this.#assertBalanced(sourceLines, "entry to reverse");

    const reversedLines: JournalLine[] = sourceLines.map((l) => ({
      account_id: l.account_id,
      // swap: a debit becomes a credit of the same magnitude, and vice-versa
      debit: roundCentsHalfEven(l.credit),
      credit: roundCentsHalfEven(l.debit),
      description: l.description ? `Reversal: ${l.description}` : undefined,
    }));
    // By construction the swap preserves totals (Σdr_rev == old Σcr == old Σdr == Σcr_rev), but
    // re-assert to fail loud if a future change to the swap logic breaks the invariant.
    this.#assertBalanced(reversedLines, "reversing entry");

    const baseDescription =
      (entry as { description?: string }).description ?? "journal entry";
    const candidate = {
      date: o.reverseDate,
      description: `Reversing entry — ${baseDescription}`,
      source: REVERSING_GL_SOURCE,
      reference_id: o.refId ?? (entry as { reference_id?: string }).reference_id,
      lines: reversedLines,
    };
    return CreateJournalEntryInputSchema.parse(candidate);
  }

  // --------------------------------------------------------------------------
  // INTERNALS — mirror GL's line + balance contract (do NOT reimplement, mirror)
  // --------------------------------------------------------------------------

  /**
   * Validate every line against GL's structural contract and round amounts to the cent (half-even).
   * Mirrors GeneralLedgerEngine.postEntry's per-line checks so a template rejected here is exactly a
   * template GL would reject at post: known account, not both-sided, not zero-zero.
   */
  static #validateAndRoundLines(lines: JournalLine[], ctx: string): JournalLine[] {
    if (!Array.isArray(lines) || lines.length < 2) {
      throw new Error(`JournalEntryEngine: ${ctx} needs ≥2 lines (double-entry)`);
    }
    return lines.map((raw) => {
      const line = JournalLineSchema.parse(raw); // throws on NaN/Infinity/negative debit|credit, empty account_id
      if (!KNOWN_ACCOUNT_IDS.has(line.account_id)) {
        throw new Error(`JournalEntryEngine: ${ctx} references unknown account_id '${line.account_id}'`);
      }
      const debit = roundCentsHalfEven(line.debit);
      const credit = roundCentsHalfEven(line.credit);
      if (debit > 0 && credit > 0) {
        throw new Error(
          `JournalEntryEngine: ${ctx} line for account '${line.account_id}' has both debit and credit; split into two lines`,
        );
      }
      if (debit === 0 && credit === 0) {
        throw new Error(`JournalEntryEngine: ${ctx} line for account '${line.account_id}' has zero debit and credit`);
      }
      return { account_id: line.account_id, debit, credit, description: line.description };
    });
  }

  /** Assert Σdebits == Σcredits within tolerance; return the rounded totals. Throws if unbalanced. */
  static #assertBalanced(lines: JournalLine[], ctx: string): { totalDebits: number; totalCredits: number } {
    let debitTotal = 0;
    let creditTotal = 0;
    for (const l of lines) {
      debitTotal += l.debit;
      creditTotal += l.credit;
    }
    const totalDebits = roundCentsHalfEven(debitTotal);
    const totalCredits = roundCentsHalfEven(creditTotal);
    if (Math.abs(totalDebits - totalCredits) > BALANCE_TOLERANCE) {
      throw new Error(
        `JournalEntryEngine: ${ctx} is unbalanced (Σdebits=${totalDebits} Σcredits=${totalCredits}); ` +
          `every journal entry must satisfy Σdebits == Σcredits`,
      );
    }
    return { totalDebits, totalCredits };
  }

  /** count must be a finite positive integer in [RECURRING_COUNT_MIN, RECURRING_COUNT_MAX]. */
  static #assertValidCount(count: number): void {
    if (!Number.isFinite(count)) {
      throw new Error(`JournalEntryEngine.scheduleRecurring: count must be a finite number, got ${count}`);
    }
    if (!Number.isInteger(count)) {
      throw new Error(`JournalEntryEngine.scheduleRecurring: count must be an integer, got ${count}`);
    }
    if (count < RECURRING_COUNT_MIN || count > RECURRING_COUNT_MAX) {
      throw new Error(
        `JournalEntryEngine.scheduleRecurring: count must be in [${RECURRING_COUNT_MIN}, ${RECURRING_COUNT_MAX}], got ${count}`,
      );
    }
  }
}

// ============================================================================
// UTC CALENDAR DATE MATH (no Date-string-parse ambiguity, no library)
// ============================================================================

/** Parse a YYYY-MM-DD string into {y, m (1-12), d} — throws on a malformed/invalid calendar date. */
function parseISODate(iso: string): { y: number; m: number; d: number } {
  if (!ISO_DATE_REGEX.test(iso)) {
    throw new Error(`JournalEntryEngine: malformed date '${iso}' (expected YYYY-MM-DD)`);
  }
  const y = Number(iso.slice(0, 4));
  const m = Number(iso.slice(5, 7));
  const d = Number(iso.slice(8, 10));
  if (m < 1 || m > MONTHS_PER_YEAR) throw new Error(`JournalEntryEngine: invalid month in date '${iso}'`);
  const dim = daysInMonth(y, m);
  if (d < 1 || d > dim) throw new Error(`JournalEntryEngine: invalid day in date '${iso}' (month has ${dim} days)`);
  return { y, m, d };
}

/** Number of days in a given month (1-12) of a given year (Gregorian leap rules). */
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate(); // day 0 of next month = last day of month m
}

function fmt(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Add `n` whole days to an ISO date (UTC, exact — no DST drift). */
function addDaysUTC(iso: string, n: number): string {
  const { y, m, d } = parseISODate(iso);
  const t = Date.UTC(y, m - 1, d) + n * MILLIS_PER_DAY;
  const dt = new Date(t);
  return fmt(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/**
 * Add `n` months to an ISO date (UTC), clamping the day to the target month's last day so
 * end-of-month dates never roll forward (Jan-31 +1mo → Feb-28/29, never Mar-03).
 */
function addMonthsUTC(iso: string, n: number): string {
  const { y, m, d } = parseISODate(iso);
  const zeroBased = (m - 1) + n; // 0-based month index, can exceed 11 / go negative
  const targetYear = y + Math.floor(zeroBased / MONTHS_PER_YEAR);
  const targetMonth = ((zeroBased % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR + 1; // 1-12
  const clampedDay = Math.min(d, daysInMonth(targetYear, targetMonth));
  return fmt(targetYear, targetMonth, clampedDay);
}

export const journalEntryEngine = JournalEntryEngine;
