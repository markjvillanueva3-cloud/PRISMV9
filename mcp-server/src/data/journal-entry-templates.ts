/**
 * journal-entry-templates.ts — constants for the JournalEntryEngine scheduling/template layer
 * (galaxy:business, slot:hotel). QuickBooks-parity: "Memorized / Recurring / Reversing" journal
 * entries (QB-PARITY Phase-4 #2).
 *
 * These are the *non-physics* domain constants the engine must never inline:
 *  - the recurring-frequency enum + the calendar step each frequency advances,
 *  - the GL `source` tags the template/scheduling layer is allowed to stamp on a materialized entry
 *    (must be members of GeneralLedgerEngine's CreateJournalEntryInputSchema.source enum — a
 *    materialized entry that carries an unknown source would be rejected at GL.createJournalEntry,
 *    so we constrain the surface here),
 *  - hard bounds for the recurring `count` (a runaway count is a real footgun: it would post N real
 *    GL entries).
 *
 * Financial-invariant compliance ([[feedback_hotel_financial_invariant_gate]]): constants imported,
 * never inlined; out-of-range values THROW at the engine boundary.
 *
 * @version 1.0.0
 */

export const JOURNAL_ENTRY_TEMPLATES_SCHEMA_VERSION = "1.0.0" as const;

/** Recurring schedule frequencies the engine can expand. */
export const RECURRING_FREQUENCIES = ["weekly", "monthly", "quarterly"] as const;
export type RecurringFrequency = (typeof RECURRING_FREQUENCIES)[number];

/**
 * Calendar step each frequency advances when generating the next dated entry.
 * `unit` is consumed by an explicit UTC date-math walker in the engine (NOT by inlining a
 * "+30 days" approximation — month/quarter steps must land on the same day-of-month, with
 * end-of-month clamping, so monthly from Jan-31 → Feb-28/29, never Mar-03).
 */
export const FREQUENCY_STEP: Readonly<Record<RecurringFrequency, { unit: "day" | "month"; amount: number }>> = {
  weekly: { unit: "day", amount: 7 },
  monthly: { unit: "month", amount: 1 },
  quarterly: { unit: "month", amount: 3 },
};

/**
 * Bounds for the recurring `count` (number of dated entries to generate). count must be a finite
 * positive integer in [MIN, MAX]; anything else THROWS. MAX bounds the blast radius of a single
 * scheduleRecurring call (each generated entry is a real, postable GL double-entry).
 */
export const RECURRING_COUNT_MIN = 1 as const;
export const RECURRING_COUNT_MAX = 120 as const; // 10 years monthly / ~2.3 years weekly — generous, finite

/**
 * GL `source` tags this layer stamps on materialized entries. Each MUST be a member of
 * GeneralLedgerEngine's CreateJournalEntryInputSchema.source enum or the entry is rejected at post.
 *  - "manual" — a memorized/recurring template materializes as a manual JE (operator-defined).
 *  - "adjustment" — a reversing entry is a period-end accrual reversal (the textbook use of an
 *    auto-reversing JE), tagged as an adjustment.
 */
export const TEMPLATE_GL_SOURCE = "manual" as const;
export const REVERSING_GL_SOURCE = "adjustment" as const;

/** ISO YYYY-MM-DD shape shared with GeneralLedgerEngine (CreateJournalEntryInputSchema.date). */
export const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
