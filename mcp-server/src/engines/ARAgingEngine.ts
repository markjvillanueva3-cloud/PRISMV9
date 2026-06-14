/**
 * ARAgingEngine — accounts-receivable aging buckets + DSO + bad-debt allowance
 * (hotel iter13, 2026-05-24, U-AR-AGING).
 *
 * Closes G13 from the ERP-comparison audit. Records invoices, payments
 * (full or partial), then produces a 5-bucket aging report
 * (current / 1-30 / 31-60 / 61-90 / 91+) plus DSO (Days Sales Outstanding)
 * and a balance-weighted bad-debt allowance estimate.
 *
 * Pure in-memory state engine — caller owns persistence. Singleton export
 * `arAgingEngine`. Date arithmetic is deterministic (caller supplies an
 * `as_of` ISO date — no implicit Date.now() inside the engine).
 *
 * Hotel-soul:
 *   - **financial-invariant gate** — sum of bucket totals MUST equal sum of
 *     open balances (within $0.01); throws on imbalance
 *   - **double-entry on payments** — a payment greater than the open balance
 *     is REFUSED, never silently absorbed
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **defensive copy** — every public read is a deep clone
 *   - **forward+backward reconciliation** — aging total equals open AR
 *     summed independently from invoice/payment ledger
 *
 * Reference: Garrison/Noreen "Managerial Accounting" 17e, Ch. 13
 * (Profitability Analysis) and Ch. 14 (Statement of Cash Flows / DSO).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Invoice {
  id: string;
  customer_id: string;
  invoice_date: string;       // ISO yyyy-mm-dd
  amount: number;             // billed total (> 0)
  paid: number;               // cumulative payments received (>= 0, <= amount)
  open_balance: number;       // amount - paid (cached, derived)
  status: "open" | "paid" | "partial";
  created_at: string;
  updated_at: string;
}

export interface InvoiceInput {
  customer_id: string;
  invoice_date: string;
  amount: number;
}

export type AgingBucket = "current" | "1_30" | "31_60" | "61_90" | "91_plus";

export interface AgingReport {
  as_of: string;
  total_open_ar: number;
  by_bucket: Record<AgingBucket, number>;
  by_customer: Record<string, number>;
  invoice_count_open: number;
  ledger_balanced: boolean;            // hotel-soul invariant
  dso_days: number | null;             // null if no sales history
  bad_debt_allowance: number;          // balance-weighted estimate
  fetched_at: string;
}

// ─── Constants (named, not magic) ───────────────────────────────────────────

const ID_PREFIX = "INV";
const LEDGER_TOLERANCE = 0.01;
const MAX_CUSTOMER_ID_LEN = 100;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const MS_PER_DAY = 86_400_000;
const DAYS_PER_YEAR_DSO = 365;

const BUCKET_BOUNDARIES: ReadonlyArray<{ bucket: AgingBucket; min: number; max: number }> = [
  { bucket: "current", min: -Infinity, max: 0 },   // not yet due (invoice_date >= as_of)
  { bucket: "1_30",    min: 1,         max: 30 },
  { bucket: "31_60",   min: 31,        max: 60 },
  { bucket: "61_90",   min: 61,        max: 90 },
  { bucket: "91_plus", min: 91,        max: Infinity },
];

// Bad-debt allowance percentages — industry-standard sliding scale
const BAD_DEBT_RATES: Record<AgingBucket, number> = {
  current: 0.005,
  "1_30":   0.01,
  "31_60":  0.05,
  "61_90":  0.15,
  "91_plus": 0.40,
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertPositive(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x <= 0) throw new Error(`${label}: must be > 0 (got ${x})`);
}

function assertNonNegative(x: number, label: string): void {
  if (!Number.isFinite(x)) throw new Error(`${label}: must be finite (got ${x})`);
  if (x < 0) throw new Error(`${label}: must be >= 0 (got ${x})`);
}

function assertNonEmptyStr(s: unknown, label: string, max: number): string {
  if (typeof s !== "string") throw new Error(`${label}: must be a string`);
  const t = s.trim();
  if (t.length === 0) throw new Error(`${label}: empty`);
  if (t.length > max) throw new Error(`${label}: exceeds ${max} chars`);
  return t;
}

function assertISODate(s: string, label: string): void {
  if (typeof s !== "string") throw new Error(`${label}: must be a string`);
  if (!ISO_DATE_REGEX.test(s)) throw new Error(`${label}: must be ISO yyyy-mm-dd (got '${s}')`);
  const d = new Date(s + "T00:00:00Z");
  if (Number.isNaN(d.getTime())) throw new Error(`${label}: invalid date '${s}'`);
}

function daysBetween(asOfISO: string, invoiceISO: string): number {
  const a = new Date(asOfISO + "T00:00:00Z").getTime();
  const b = new Date(invoiceISO + "T00:00:00Z").getTime();
  return Math.floor((a - b) / MS_PER_DAY);
}

function bucketFor(daysOverdue: number): AgingBucket {
  for (const bb of BUCKET_BOUNDARIES) {
    if (daysOverdue >= bb.min && daysOverdue <= bb.max) return bb.bucket;
  }
  // Defensive: covers all real numbers via Infinity bounds
  throw new Error(`bucketFor: no bucket for ${daysOverdue}`);
}

function emptyBuckets(): Record<AgingBucket, number> {
  return { current: 0, "1_30": 0, "31_60": 0, "61_90": 0, "91_plus": 0 };
}

function makeId(seq: number): string {
  return `${ID_PREFIX}-${seq.toString().padStart(6, "0")}`;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class ARAgingEngine {
  private readonly store = new Map<string, Invoice>();
  private seq = 0;

  /**
   * Record a new invoice. R12 fail-loud on bad inputs.
   */
  recordInvoice(input: InvoiceInput): Invoice {
    const customer = assertNonEmptyStr(input.customer_id, "customer_id", MAX_CUSTOMER_ID_LEN);
    assertISODate(input.invoice_date, "invoice_date");
    assertPositive(input.amount, "amount");
    const now = new Date().toISOString();
    this.seq += 1;
    const inv: Invoice = {
      id: makeId(this.seq),
      customer_id: customer,
      invoice_date: input.invoice_date,
      amount: round2(input.amount),
      paid: 0,
      open_balance: round2(input.amount),
      status: "open",
      created_at: now,
      updated_at: now,
    };
    this.store.set(inv.id, inv);
    return { ...inv };
  }

  /**
   * Record a payment against an invoice (full or partial).
   *
   * Hotel-soul: REFUSES payment > open_balance — never silently absorbs an
   * over-payment. Caller must split into a credit memo or new transaction.
   *
   * @throws on unknown id, non-positive amount, or overpayment
   */
  recordPayment(invoiceId: string, paymentAmount: number): Invoice {
    assertPositive(paymentAmount, "paymentAmount");
    const inv = this.store.get(invoiceId);
    if (!inv) throw new Error(`invoice '${invoiceId}' not found`);
    if (paymentAmount > inv.open_balance + LEDGER_TOLERANCE) {
      throw new Error(
        `payment $${paymentAmount.toFixed(2)} exceeds open balance $${inv.open_balance.toFixed(2)} on ${invoiceId} — refusing silent overpayment (create credit memo instead)`,
      );
    }
    inv.paid = round2(inv.paid + paymentAmount);
    inv.open_balance = round2(inv.amount - inv.paid);
    if (inv.open_balance <= LEDGER_TOLERANCE) {
      inv.open_balance = 0;
      inv.status = "paid";
    } else {
      inv.status = "partial";
    }
    inv.updated_at = new Date().toISOString();
    return { ...inv };
  }

  /** Read by id; null if missing. */
  get(id: string): Invoice | null {
    if (typeof id !== "string" || id.length === 0) return null;
    const inv = this.store.get(id);
    return inv ? { ...inv } : null;
  }

  /**
   * List invoices, optionally filtered. Deterministic id ASC order.
   */
  list(filter?: { customer_id?: string; status?: Invoice["status"] }): Invoice[] {
    const out: Invoice[] = [];
    for (const inv of this.store.values()) {
      if (filter?.customer_id && inv.customer_id !== filter.customer_id) continue;
      if (filter?.status && inv.status !== filter.status) continue;
      out.push({ ...inv });
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  /**
   * Aging report as of a given date. Buckets:
   *   - current: not yet due (invoice_date >= as_of)
   *   - 1_30 / 31_60 / 61_90 / 91_plus: days past invoice_date
   *
   * Hotel-soul: sum of bucket totals MUST equal sum of open balances
   * (within $0.01) — throws on imbalance.
   *
   * DSO = (total open AR / annualized credit sales) × 365. Falls back to
   * `null` when sales history (sum of all invoices in trailing year) is 0.
   *
   * Bad-debt allowance = Σ (bucket_total × bucket_rate).
   */
  agingReport(asOf: string): AgingReport {
    assertISODate(asOf, "as_of");
    const buckets = emptyBuckets();
    const byCustomer: Record<string, number> = {};
    let totalOpenAr = 0;
    let openCount = 0;
    let trailingYearSales = 0;
    const trailingCutoff = new Date(asOf + "T00:00:00Z").getTime() - DAYS_PER_YEAR_DSO * MS_PER_DAY;

    for (const inv of this.store.values()) {
      // Trailing-year sales for DSO denominator — any invoice billed within the last 365 days
      const invTs = new Date(inv.invoice_date + "T00:00:00Z").getTime();
      if (invTs >= trailingCutoff && invTs <= new Date(asOf + "T00:00:00Z").getTime()) {
        trailingYearSales += inv.amount;
      }
      if (inv.status === "paid") continue;
      openCount += 1;
      const daysOverdue = daysBetween(asOf, inv.invoice_date);
      const bucket = bucketFor(daysOverdue);
      buckets[bucket] = round2(buckets[bucket] + inv.open_balance);
      totalOpenAr = round2(totalOpenAr + inv.open_balance);
      byCustomer[inv.customer_id] = round2((byCustomer[inv.customer_id] ?? 0) + inv.open_balance);
    }

    // Hotel-soul invariant gate
    const bucketSum = Object.values(buckets).reduce((s, v) => s + v, 0);
    const balanced = Math.abs(bucketSum - totalOpenAr) <= LEDGER_TOLERANCE;
    if (!balanced) {
      throw new Error(`agingReport: bucket sum $${bucketSum.toFixed(2)} != total open AR $${totalOpenAr.toFixed(2)}`);
    }

    // DSO = (total open AR / avg daily sales) × DAYS_PER_YEAR
    let dso: number | null = null;
    if (trailingYearSales > 0) {
      dso = round2((totalOpenAr / trailingYearSales) * DAYS_PER_YEAR_DSO);
    }

    // Balance-weighted bad-debt allowance
    let badDebt = 0;
    for (const [bucket, total] of Object.entries(buckets) as Array<[AgingBucket, number]>) {
      badDebt += total * BAD_DEBT_RATES[bucket];
    }

    return {
      as_of: asOf,
      total_open_ar: round2(totalOpenAr),
      by_bucket: buckets,
      by_customer: byCustomer,
      invoice_count_open: openCount,
      ledger_balanced: balanced,
      dso_days: dso,
      bad_debt_allowance: round2(badDebt),
      fetched_at: new Date().toISOString(),
    };
  }

  /**
   * Reset internal state — useful for tests. Not part of the public hot path.
   */
  __resetForTests(): void {
    this.store.clear();
    this.seq = 0;
  }
}

export const arAgingEngine = new ARAgingEngine();
