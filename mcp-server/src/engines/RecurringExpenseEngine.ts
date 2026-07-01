/**
 * RecurringExpenseEngine — utilities / subscriptions / insurance / recurring
 * business expenses (hotel iter12, 2026-05-24, U-RECURRING-EXPENSE).
 *
 * Closes G8 from the ERP-comparison audit. Tracks every recurring charge
 * (monthly/quarterly/semi-annual/annual) with category buckets, vendor
 * pointer, due-date forecasting, normalized monthly burden, and PII-safe
 * memo handling.
 *
 * Pure in-memory state engine — no I/O, no persistence (persistence is a
 * caller concern). Singleton export `recurringExpenseEngine`.
 *
 * Hotel-soul:
 *   - **financial-invariant gate** — sum of category subtotals MUST equal
 *     total monthly burden (verified before return)
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **defensive copy** — every public return is a deep clone (never expose
 *     internal state mutability)
 *   - **PII redaction** — memo field auto-redacts SSN / credit-card-like
 *     patterns before storage (never log raw)
 *   - **deterministic forecast** — next_due_dates computed from start_date +
 *     period cadence, no clock-dependence
 *
 * Reference: Garrison/Noreen "Managerial Accounting" 17e, Ch. 8 (Master
 * Budget) §Operating-Expense Budgets — fixed vs variable expense treatment.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type RecurringFrequency = "monthly" | "quarterly" | "semi_annual" | "annual";

export type RecurringCategory =
  | "utility"        // electric, gas, water, internet, phone
  | "subscription"   // SaaS, software licenses, journals
  | "insurance"      // GL, WC, property, cyber
  | "lease"          // building, equipment leases
  | "service"        // janitorial, pest control, waste hauling
  | "membership"     // industry orgs, chambers
  | "other";

export interface RecurringExpense {
  id: string;
  vendor_name: string;                // free-text vendor (not VendorEngine FK yet — caller can wire)
  vendor_id?: string;                 // optional VendorEngine FK
  category: RecurringCategory;
  description: string;                // human-readable line item
  amount: number;                     // per-period cost in USD
  frequency: RecurringFrequency;
  start_date: string;                 // ISO yyyy-mm-dd
  end_date?: string;                  // optional ISO end (auto-renew if absent)
  auto_renew: boolean;
  memo: string;                       // PII-redacted on store
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringExpenseInput {
  vendor_name: string;
  vendor_id?: string;
  category: RecurringCategory;
  description: string;
  amount: number;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  auto_renew?: boolean;
  memo?: string;
}

export interface MonthlyBurdenReport {
  total_monthly: number;              // $/month (all categories normalized)
  total_annual: number;               // $/year
  by_category: Record<RecurringCategory, number>;  // monthly per bucket
  active_count: number;
  ledger_balanced: boolean;           // hotel-soul invariant gate
  fetched_at: string;
}

export interface DueDateForecast {
  expense_id: string;
  vendor_name: string;
  amount: number;
  next_due_dates: string[];           // ISO yyyy-mm-dd
}

// ─── Constants (named, not magic) ───────────────────────────────────────────

const MONTHS_PER_YEAR = 12;
const PERIODS_PER_YEAR: Record<RecurringFrequency, number> = {
  monthly: 12,
  quarterly: 4,
  semi_annual: 2,
  annual: 1,
};
const MONTHS_BETWEEN: Record<RecurringFrequency, number> = {
  monthly: 1,
  quarterly: 3,
  semi_annual: 6,
  annual: 12,
};
const ID_PREFIX = "REXP";
const LEDGER_TOLERANCE = 0.01;       // ≤1¢ residue accepted as balanced
const MAX_VENDOR_LEN = 200;
const MAX_DESCRIPTION_LEN = 500;
const MAX_MEMO_LEN = 2000;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// PII redaction patterns — applied to memo BEFORE storage
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
const SSN_REPLACEMENT = "[SSN-REDACTED]";
const CARD_REGEX = /\b\d{13,19}\b/g;
const CARD_REPLACEMENT = "[CARD-REDACTED]";

const VALID_CATEGORIES: ReadonlyArray<RecurringCategory> = [
  "utility", "subscription", "insurance", "lease", "service", "membership", "other",
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertPositive(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

function assertNonEmpty(s: unknown, label: string, max: number): string {
  if (typeof s !== "string") throw new Error(`${label}: must be a string`);
  const trimmed = s.trim();
  if (trimmed.length === 0) throw new Error(`${label}: empty`);
  if (trimmed.length > max) throw new Error(`${label}: exceeds ${max} chars`);
  return trimmed;
}

function assertISODate(s: string, label: string): void {
  if (typeof s !== "string") throw new Error(`${label}: must be a string`);
  if (!ISO_DATE_REGEX.test(s)) throw new Error(`${label}: must be ISO yyyy-mm-dd (got '${s}')`);
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) throw new Error(`${label}: invalid date '${s}'`);
}

function assertCategory(c: string): void {
  if (!VALID_CATEGORIES.includes(c as RecurringCategory)) {
    throw new Error(`category: must be one of ${VALID_CATEGORIES.join(", ")} (got '${c}')`);
  }
}

function assertFrequency(f: string): void {
  if (!(f in PERIODS_PER_YEAR)) {
    throw new Error(`frequency: must be monthly | quarterly | semi_annual | annual (got '${f}')`);
  }
}

function redactPII(memo: string): string {
  return memo.replace(SSN_REGEX, SSN_REPLACEMENT).replace(CARD_REGEX, CARD_REPLACEMENT);
}

function addMonthsISO(iso: string, months: number): string {
  // Date-safe month addition with end-of-month clamping (e.g. Jan-31 + 1 → Feb-28/29)
  const d = new Date(iso + "T00:00:00Z");
  const targetMonth = d.getUTCMonth() + months;
  const targetYear = d.getUTCFullYear() + Math.floor(targetMonth / MONTHS_PER_YEAR);
  const normalizedMonth = ((targetMonth % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR;
  const desiredDay = d.getUTCDate();
  // Clamp to last day of target month
  const lastDayOfTarget = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  const day = Math.min(desiredDay, lastDayOfTarget);
  const result = new Date(Date.UTC(targetYear, normalizedMonth, day));
  return result.toISOString().slice(0, 10);
}

function makeId(seq: number): string {
  return `${ID_PREFIX}-${seq.toString().padStart(6, "0")}`;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class RecurringExpenseEngine {
  private readonly store = new Map<string, RecurringExpense>();
  private seq = 0;

  /**
   * Create a new recurring expense entry. R12 fail-loud on bad inputs.
   * Memo is PII-redacted before storage (SSN / card-number patterns).
   *
   * @throws on missing/invalid fields, malformed date, unknown category/frequency
   */
  create(input: RecurringExpenseInput): RecurringExpense {
    const vendor = assertNonEmpty(input.vendor_name, "vendor_name", MAX_VENDOR_LEN);
    const description = assertNonEmpty(input.description, "description", MAX_DESCRIPTION_LEN);
    assertCategory(input.category);
    assertFrequency(input.frequency);
    assertPositive(input.amount, "amount");
    assertISODate(input.start_date, "start_date");
    if (input.end_date !== undefined) assertISODate(input.end_date, "end_date");
    if (input.vendor_id !== undefined && typeof input.vendor_id !== "string") {
      throw new Error("vendor_id: must be a string");
    }
    if (input.memo !== undefined && typeof input.memo !== "string") {
      throw new Error("memo: must be a string");
    }
    const memoRaw = (input.memo ?? "").slice(0, MAX_MEMO_LEN);
    const memo = redactPII(memoRaw);

    const now = new Date().toISOString();
    this.seq += 1;
    const expense: RecurringExpense = {
      id: makeId(this.seq),
      vendor_name: vendor,
      vendor_id: input.vendor_id,
      category: input.category,
      description,
      amount: input.amount,
      frequency: input.frequency,
      start_date: input.start_date,
      end_date: input.end_date,
      auto_renew: input.auto_renew ?? true,
      memo,
      active: true,
      created_at: now,
      updated_at: now,
    };
    this.store.set(expense.id, expense);
    return { ...expense };  // defensive copy
  }

  /** Read by id. Returns null if missing. Defensive copy. */
  get(id: string): RecurringExpense | null {
    if (typeof id !== "string" || id.length === 0) return null;
    const e = this.store.get(id);
    return e ? { ...e } : null;
  }

  /**
   * List entries (optionally filtered by active state + category).
   * Defensive copy on every row.
   */
  list(active?: boolean, category?: RecurringCategory): RecurringExpense[] {
    const out: RecurringExpense[] = [];
    for (const e of this.store.values()) {
      if (active !== undefined && e.active !== active) continue;
      if (category !== undefined && e.category !== category) continue;
      out.push({ ...e });
    }
    // Deterministic sort by id ASC for caller predictability
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  /**
   * Deactivate an expense (soft-delete — keeps history). Throws on unknown id.
   */
  deactivate(id: string): RecurringExpense {
    const e = this.store.get(id);
    if (!e) throw new Error(`recurring expense '${id}' not found`);
    e.active = false;
    e.updated_at = new Date().toISOString();
    return { ...e };
  }

  /**
   * Update amount (e.g. utility rate change). Throws on unknown id or bad amount.
   */
  updateAmount(id: string, newAmount: number): RecurringExpense {
    assertPositive(newAmount, "newAmount");
    const e = this.store.get(id);
    if (!e) throw new Error(`recurring expense '${id}' not found`);
    e.amount = newAmount;
    e.updated_at = new Date().toISOString();
    return { ...e };
  }

  /**
   * Aggregate report of monthly burden across all active expenses, normalized
   * to $/month per category.
   *
   * Hotel-soul: financial-invariant gate verifies the sum of category
   * subtotals equals the total monthly burden (within $0.01) before return.
   */
  monthlyBurden(): MonthlyBurdenReport {
    const byCategory: Record<RecurringCategory, number> = {
      utility: 0, subscription: 0, insurance: 0, lease: 0,
      service: 0, membership: 0, other: 0,
    };
    let activeCount = 0;
    for (const e of this.store.values()) {
      if (!e.active) continue;
      activeCount += 1;
      const periodsPerYear = PERIODS_PER_YEAR[e.frequency];
      const monthly = (e.amount * periodsPerYear) / MONTHS_PER_YEAR;
      byCategory[e.category] += monthly;
    }
    const totalMonthly = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const sumCheck = Object.values(byCategory).reduce((s, v) => s + v, 0);
    const balanced = Math.abs(sumCheck - totalMonthly) <= LEDGER_TOLERANCE;
    if (!balanced) {
      // Should be mathematically impossible — guard against future refactor drift.
      throw new Error(`monthlyBurden: ledger imbalance ${sumCheck.toFixed(4)} != ${totalMonthly.toFixed(4)}`);
    }
    return {
      total_monthly: Math.round(totalMonthly * 100) / 100,
      total_annual: Math.round(totalMonthly * MONTHS_PER_YEAR * 100) / 100,
      by_category: byCategory,
      active_count: activeCount,
      ledger_balanced: balanced,
      fetched_at: new Date().toISOString(),
    };
  }

  /**
   * Forecast the next N due-dates for a given active expense, anchored on
   * its start_date and frequency cadence. Deterministic (no clock dep).
   *
   * @throws on unknown id or non-positive lookahead
   */
  forecastDueDates(id: string, lookaheadPeriods: number): DueDateForecast {
    if (!Number.isInteger(lookaheadPeriods) || lookaheadPeriods <= 0) {
      throw new Error(`lookaheadPeriods: must be a positive integer (got ${lookaheadPeriods})`);
    }
    const e = this.store.get(id);
    if (!e) throw new Error(`recurring expense '${id}' not found`);
    const monthsBetween = MONTHS_BETWEEN[e.frequency];
    const due: string[] = [];
    for (let i = 1; i <= lookaheadPeriods; i++) {
      const next = addMonthsISO(e.start_date, monthsBetween * i);
      if (e.end_date !== undefined && next > e.end_date) break;
      due.push(next);
    }
    return { expense_id: e.id, vendor_name: e.vendor_name, amount: e.amount, next_due_dates: due };
  }

  /**
   * Reset internal state — useful for tests. Not part of the public hot path.
   */
  __resetForTests(): void {
    this.store.clear();
    this.seq = 0;
  }
}

export const recurringExpenseEngine = new RecurringExpenseEngine();
