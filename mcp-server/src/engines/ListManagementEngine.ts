/**
 * ListManagementEngine — QuickBooks "Lists" management for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QB-PARITY Phase-4 engine #5: the QuickBooks "Lists" infrastructure many features key off —
 * Payment Terms, Payment Methods, Customer Types, Vendor Types (the "name lists"). A Term is the
 * scheduling primitive that turns an invoice/bill date into a *due date* and an *early-pay discount
 * window*; the name-lists are the classification primitives that segment customers/vendors and tag
 * transactions with a method-of-payment.
 *
 * PRISM synergy (QUICKBOOKS-PARITY-PLAN.md thesis): this engine is the shop-ops *scheduling producer*
 * for the QB books/reporting cycle. A term born here is consumed downstream —
 *   • BillingEngine ages an A/R invoice by `dueDate(term, invoiceDate)` (the receivable's due date),
 *   • BillPaymentCheckRunEngine schedules an A/P check-run by the same dueDate (the payable's due date),
 *   • FinanceChargeDunningEngine keys its past-due test off the dueDate,
 *   • ReceivePaymentEngine offers the early-pay discount iff the payment lands on/before `discountDate`.
 * On the networking-platform financial-reporting side, customer/vendor *types* segment the
 * marketplace book (revenue-by-segment, supplier-base-by-type) without re-keying the chart of accounts.
 *
 * Relationship to GeneralLedgerEngine (NO duplication — verified):
 *   This engine imports `generalLedgerEngine` and REUSES its canonical chart of accounts solely to
 *   VALIDATE that a name-list "linkedAccount" (optional) is a real chart member — it NEVER reimplements
 *   double-entry, the chart, balance-validation, or the trial-balance / income-statement / balance-sheet
 *   reports. Payment terms drive scheduling math (calendar arithmetic), not GL postings, so the bulk of
 *   this engine touches no ledger surface at all. The GL is the system of record; this is the list layer
 *   above it.
 *
 * Financial-invariant compliance (business/GSD.md §2.1, [[feedback_hotel_financial_invariant_gate]]):
 *  - defaults are IMPORTED from list-management-defaults.ts, never inlined.
 *  - netDays must be a non-negative INTEGER; non-integer / negative / non-finite THROWS (fail loud).
 *  - discountDays ≤ netDays — a discount window past the due date is incoherent and THROWS.
 *  - discountPct ∈ (0,1]; a discount with no days (or days with no pct) THROWS (half-specified term).
 *  - duplicate term id / list-entry id THROWS (a silent overwrite would orphan downstream references).
 *  - due/discount date math is UTC calendar arithmetic — correct across month + year boundaries.
 *  - reuses roundCentsHalfEven (shared money util src/data/money.ts) for the discount-AMOUNT helper (banker's rounding).
 *
 * @milestone QB-PARITY (Phase-4 lists infrastructure)
 * @version 1.0.0
 */
// WIRE-EXEMPT: dispatcher wiring deferred to MAIN (worktree businessDispatcher stale 441 vs main 879);
// wire list_define_term / list_due_date / list_discount_date / list_add_entry / list_entries /
// list_deactivate_entry / list_terms in main post golf-merge. Wiring the stale worktree copy would
// CLOBBER ~438 main actions (regression). Tracked in business/QUICKBOOKS-PARITY-PLAN.md §Status.
import { z } from "zod";
import { roundCentsHalfEven } from "../data/money.js";
import { generalLedgerEngine } from "./GeneralLedgerEngine.js";
import {
  DEFAULT_PAYMENT_TERMS,
  DEFAULT_LIST_SEEDS,
  MANAGED_LIST_TYPES,
  LIST_MANAGEMENT_SCHEMA_VERSION,
  type ManagedListType,
  type SeedPaymentTerm,
} from "../data/list-management-defaults.js";

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Input for {@link ListManagementEngine.defineTerm}. discountPct/discountDays are jointly optional:
 * both present = a discount term; both absent = a plain net term; exactly one present THROWS
 * (a half-specified discount is a silent footgun downstream).
 */
export const DefineTermInputSchema = z.object({
  termId: z.string().min(1, "termId is required"),
  name: z.string().min(1, "name is required"),
  netDays: z.number().int("netDays must be an integer").min(0, "netDays must be >= 0").finite(),
  /** Early-payment discount fraction in (0,1] (e.g. 0.02 = 2%). */
  discountPct: z.number().gt(0, "discountPct must be > 0").max(1, "discountPct must be <= 1 (a fraction, not a percent)").finite().optional(),
  /** Days from invoice date the discount is available. */
  discountDays: z.number().int("discountDays must be an integer").min(0, "discountDays must be >= 0").finite().optional(),
});

/** Input for {@link ListManagementEngine.addListEntry}. */
export const AddListEntryInputSchema = z.object({
  listType: z.enum(MANAGED_LIST_TYPES),
  id: z.string().min(1, "list entry id is required"),
  name: z.string().min(1, "list entry name is required"),
  /** Optional GL chart account this entry maps to — validated against the canonical chart if given. */
  linkedAccount: z.string().min(1).optional(),
});

// ============================================================================
// DOMAIN TYPES
// ============================================================================

/** A payment term: net window + optional early-pay discount window. */
export interface PaymentTerm {
  termId: string;
  name: string;
  netDays: number;
  discountPct: number | null;
  discountDays: number | null;
  active: boolean;
  createdAt: string;
}

/** A name-list entry (Payment Method / Customer Type / Vendor Type). */
export interface ListEntry {
  id: string;
  name: string;
  listType: ManagedListType;
  linkedAccount: string | null;
  active: boolean;
  createdAt: string;
}

/** The early-pay discount evaluation for an invoice paid on a given date. */
export interface DiscountEvaluation {
  termId: string;
  invoiceDate: string;
  paymentDate: string;
  /** True iff the term carries a discount AND paymentDate ≤ discountDate. */
  discountAvailable: boolean;
  discountDate: string | null;
  dueDate: string;
  /** The discount amount (banker's-rounded to the cent) if available, else 0. */
  discountAmount: number;
  /** The net payable after discount (gross − discountAmount), banker's-rounded. */
  netDue: number;
}

const MS_PER_DAY = 86_400_000;

// ============================================================================
// ENGINE
// ============================================================================

/**
 * Stateless-as-singleton list registry. Terms + name-lists live in module-scoped maps seeded from
 * list-management-defaults.ts. (Persistence to disk is intentionally NOT implemented here — the GL is
 * the system of record for postings; the lists layer is a lightweight in-memory registry whose
 * authoritative seed is the imported defaults file. A future MAIN unit can persist via
 * atomicSessionWrite, mirroring GeneralLedgerEngine — out of scope for this additive phase.)
 */
export class ListManagementEngine {
  static #terms = new Map<string, PaymentTerm>();
  static #lists: Record<ManagedListType, Map<string, ListEntry>> = {
    paymentMethods: new Map(),
    customerTypes: new Map(),
    vendorTypes: new Map(),
  };
  static #seeded = false;

  /** Lazily seed the QB factory defaults once (idempotent). */
  static #ensureSeeded(): void {
    if (this.#seeded) return;
    this.#seeded = true; // set first so a seed-time defineTerm/add doesn't recurse
    for (const t of DEFAULT_PAYMENT_TERMS) this.#defineTermInternal(t, /*isSeed*/ true);
    for (const listType of MANAGED_LIST_TYPES) {
      for (const e of DEFAULT_LIST_SEEDS[listType]) {
        this.#addInternal(listType, e.id, e.name, null, /*isSeed*/ true);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Payment terms
  // --------------------------------------------------------------------------

  /**
   * Define (register) a payment term. THROWS on a duplicate termId, a half-specified discount,
   * or `discountDays > netDays` (a discount window past the due date is incoherent).
   *
   * @param input termId + name + netDays (≥0 int) + optional {discountPct ∈ (0,1], discountDays ≤ netDays}.
   * @returns the registered, frozen PaymentTerm.
   */
  static defineTerm(input: z.input<typeof DefineTermInputSchema>): PaymentTerm {
    this.#ensureSeeded();
    const parsed = DefineTermInputSchema.parse(input); // throws on NaN/Infinity/non-int/negative/out-of-range
    return this.#defineTermInternal(
      { termId: parsed.termId, name: parsed.name, netDays: parsed.netDays, discountPct: parsed.discountPct, discountDays: parsed.discountDays },
      /*isSeed*/ false,
    );
  }

  static #defineTermInternal(seed: SeedPaymentTerm, isSeed: boolean): PaymentTerm {
    const { termId, name, netDays } = seed;
    // Joint-specification invariant: discount pct and days are all-or-nothing.
    const hasPct = seed.discountPct !== undefined && seed.discountPct !== null;
    const hasDays = seed.discountDays !== undefined && seed.discountDays !== null;
    if (hasPct !== hasDays) {
      throw new Error(
        `[list-management] term '${termId}': discountPct and discountDays are jointly required — ` +
          `got discountPct=${seed.discountPct ?? "∅"}, discountDays=${seed.discountDays ?? "∅"} (a half-specified discount is rejected)`,
      );
    }
    const discountPct = hasPct ? (seed.discountPct as number) : null;
    const discountDays = hasDays ? (seed.discountDays as number) : null;
    // Coherence invariant: a discount window cannot extend past the due date.
    if (discountDays !== null && discountDays > netDays) {
      throw new Error(
        `[list-management] term '${termId}': discountDays (${discountDays}) must be <= netDays (${netDays}) — ` +
          `a discount window past the due date is incoherent`,
      );
    }
    if (this.#terms.has(termId)) {
      throw new Error(`[list-management] duplicate term id '${termId}' (terms are append-only; a silent overwrite would orphan downstream references)`);
    }
    const term: PaymentTerm = {
      termId,
      name,
      netDays,
      discountPct,
      discountDays,
      active: true,
      createdAt: new Date().toISOString(),
    };
    this.#terms.set(termId, term);
    void isSeed; // seed/non-seed share the identical path; flag retained for future provenance tagging
    return { ...term };
  }

  /** Look up a registered term by id. THROWS if unknown (never silently returns a default window). */
  static getTerm(termId: string): PaymentTerm {
    this.#ensureSeeded();
    const t = this.#terms.get(termId);
    if (!t) throw new Error(`[list-management] unknown term id '${termId}' — define it via defineTerm first`);
    return { ...t };
  }

  /** List all registered terms (active + inactive), sorted by termId for stable output. */
  static listTerms(): PaymentTerm[] {
    this.#ensureSeeded();
    return [...this.#terms.values()].map((t) => ({ ...t })).sort((a, b) => a.termId.localeCompare(b.termId));
  }

  /**
   * Compute the DUE date for a term: invoiceDate + netDays, in UTC calendar days.
   * Correct across month and year boundaries (uses epoch-ms arithmetic, not naive day-of-month add).
   *
   * @param term a PaymentTerm or a registered termId.
   * @param invoiceDate the invoice/bill date as YYYY-MM-DD.
   * @returns the due date as YYYY-MM-DD.
   */
  static dueDate(term: PaymentTerm | string, invoiceDate: string): string {
    const t = typeof term === "string" ? this.getTerm(term) : term;
    return this.#addDaysUtc(invoiceDate, t.netDays);
  }

  /**
   * Compute the early-pay DISCOUNT date for a term: invoiceDate + discountDays, in UTC calendar days.
   * Returns null if the term carries no discount.
   *
   * @param term a PaymentTerm or a registered termId.
   * @param invoiceDate the invoice/bill date as YYYY-MM-DD.
   * @returns the discount date as YYYY-MM-DD, or null if the term has no discount.
   */
  static discountDate(term: PaymentTerm | string, invoiceDate: string): string | null {
    const t = typeof term === "string" ? this.getTerm(term) : term;
    if (t.discountDays === null) return null;
    return this.#addDaysUtc(invoiceDate, t.discountDays);
  }

  /**
   * Evaluate the early-pay discount for an invoice of `grossAmount` paid on `paymentDate`.
   * The discount is available iff the term has a discount AND paymentDate ≤ discountDate.
   * Uses roundCentsHalfEven (shared money util src/data/money.ts) for the discount amount — money reconciles both ways
   * (discountAmount + netDue === gross, to the cent).
   *
   * @param term a PaymentTerm or registered termId.
   * @param invoiceDate invoice/bill date (YYYY-MM-DD).
   * @param paymentDate the date payment is tendered (YYYY-MM-DD).
   * @param grossAmount the invoice gross (finite, ≥ 0).
   * @returns a DiscountEvaluation with discountAmount + netDue.
   */
  static evaluateDiscount(
    term: PaymentTerm | string,
    invoiceDate: string,
    paymentDate: string,
    grossAmount: number,
  ): DiscountEvaluation {
    const t = typeof term === "string" ? this.getTerm(term) : term;
    if (!Number.isFinite(grossAmount) || grossAmount < 0) {
      throw new Error(`[list-management] evaluateDiscount: grossAmount must be a finite, non-negative number, got ${grossAmount}`);
    }
    // Validate the date strings up front (throws on malformed input).
    const due = this.dueDate(t, invoiceDate);
    const disc = this.discountDate(t, invoiceDate);
    const payMs = this.#parseUtc(paymentDate);
    const gross = roundCentsHalfEven(grossAmount);

    let discountAvailable = false;
    if (disc !== null && t.discountPct !== null) {
      discountAvailable = payMs <= this.#parseUtc(disc);
    }
    const discountAmount = discountAvailable && t.discountPct !== null ? roundCentsHalfEven(gross * t.discountPct) : 0;
    const netDue = roundCentsHalfEven(gross - discountAmount);
    return {
      termId: t.termId,
      invoiceDate,
      paymentDate,
      discountAvailable,
      discountDate: disc,
      dueDate: due,
      discountAmount,
      netDue,
    };
  }

  // --------------------------------------------------------------------------
  // Name lists (Payment Methods / Customer Types / Vendor Types) — CRUD-list
  // --------------------------------------------------------------------------

  /**
   * Add a name-list entry. THROWS on a duplicate id within the same list type, and on a
   * `linkedAccount` that is not a member of the canonical GL chart of accounts.
   *
   * @param input listType + id + name + optional linkedAccount (validated against the GL chart).
   * @returns the registered ListEntry.
   */
  static addListEntry(input: z.input<typeof AddListEntryInputSchema>): ListEntry {
    this.#ensureSeeded();
    const parsed = AddListEntryInputSchema.parse(input);
    return this.#addInternal(parsed.listType, parsed.id, parsed.name, parsed.linkedAccount ?? null, /*isSeed*/ false);
  }

  static #addInternal(
    listType: ManagedListType,
    id: string,
    name: string,
    linkedAccount: string | null,
    isSeed: boolean,
  ): ListEntry {
    if (linkedAccount !== null) {
      // REUSE the GL chart as the source of truth — never reimplement the account set here.
      const chart = generalLedgerEngine.getChartOfAccounts();
      if (!chart.some((a) => a.id === linkedAccount)) {
        throw new Error(
          `[list-management] linkedAccount '${linkedAccount}' is not a member of the GL chart of accounts — ` +
            `add it to GeneralLedgerEngine's chart first (the GL is the system of record)`,
        );
      }
    }
    const bucket = this.#lists[listType];
    if (bucket.has(id)) {
      throw new Error(`[list-management] duplicate ${listType} id '${id}' (name lists are append-only; a silent overwrite would orphan tagged transactions)`);
    }
    const entry: ListEntry = {
      id,
      name,
      listType,
      linkedAccount,
      active: true,
      createdAt: new Date().toISOString(),
    };
    bucket.set(id, entry);
    void isSeed;
    return { ...entry };
  }

  /**
   * List entries for a name-list type.
   * @param listType which name list.
   * @param opts.includeInactive include deactivated entries (default false — QB hides them by default).
   * @returns entries sorted by id for stable output.
   */
  static listEntries(listType: ManagedListType, opts: { includeInactive?: boolean } = {}): ListEntry[] {
    this.#ensureSeeded();
    if (!MANAGED_LIST_TYPES.includes(listType)) {
      throw new Error(`[list-management] unknown list type '${listType}' — expected one of ${MANAGED_LIST_TYPES.join(", ")}`);
    }
    const includeInactive = opts.includeInactive === true;
    return [...this.#lists[listType].values()]
      .filter((e) => includeInactive || e.active)
      .map((e) => ({ ...e }))
      .sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Deactivate (soft-delete) a name-list entry — QB never hard-deletes a list entry that
   * transactions may reference; it marks it inactive. THROWS if the id is unknown.
   *
   * @param listType which name list.
   * @param id the entry to deactivate.
   * @returns the deactivated entry.
   */
  static deactivateListEntry(listType: ManagedListType, id: string): ListEntry {
    this.#ensureSeeded();
    if (!MANAGED_LIST_TYPES.includes(listType)) {
      throw new Error(`[list-management] unknown list type '${listType}' — expected one of ${MANAGED_LIST_TYPES.join(", ")}`);
    }
    const entry = this.#lists[listType].get(id);
    if (!entry) throw new Error(`[list-management] cannot deactivate unknown ${listType} id '${id}'`);
    entry.active = false;
    return { ...entry };
  }

  // --------------------------------------------------------------------------
  // INTERNAL — UTC calendar arithmetic
  // --------------------------------------------------------------------------

  /**
   * Parse a strict YYYY-MM-DD string to a UTC epoch-ms at midnight. THROWS on malformed input or
   * a date that round-trips to a different calendar day (e.g. 2026-02-30 → rejected, never silently
   * normalized to March 2).
   */
  static #parseUtc(dateStr: string): number {
    if (typeof dateStr !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new Error(`[list-management] date must be YYYY-MM-DD, got '${dateStr}'`);
    }
    const [y, m, d] = dateStr.split("-").map(Number);
    const ms = Date.UTC(y, m - 1, d);
    const back = new Date(ms);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== m - 1 || back.getUTCDate() !== d) {
      throw new Error(`[list-management] invalid calendar date '${dateStr}'`);
    }
    return ms;
  }

  /** Add `days` calendar days to a YYYY-MM-DD date in UTC; returns YYYY-MM-DD. */
  static #addDaysUtc(dateStr: string, days: number): string {
    if (!Number.isInteger(days) || days < 0) {
      throw new Error(`[list-management] day offset must be a non-negative integer, got ${days}`);
    }
    const ms = this.#parseUtc(dateStr) + days * MS_PER_DAY;
    return new Date(ms).toISOString().slice(0, 10);
  }

  // --------------------------------------------------------------------------
  // Discovery / metadata
  // --------------------------------------------------------------------------

  /** Schema version for the list-management surface (reuses the defaults-file constant). */
  static schemaVersion(): string {
    return LIST_MANAGEMENT_SCHEMA_VERSION;
  }

  /** TEST-ONLY: clear all registered terms + lists and force a re-seed on next access. */
  static __resetForTests(): void {
    this.#terms = new Map();
    this.#lists = { paymentMethods: new Map(), customerTypes: new Map(), vendorTypes: new Map() };
    this.#seeded = false;
  }
}

export const listManagementEngine = ListManagementEngine;
