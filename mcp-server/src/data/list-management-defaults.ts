/**
 * list-management-defaults.ts — seed catalog + invariant constants for the QuickBooks
 * "Lists" infrastructure in the PRISM ERP (galaxy:business, slot:hotel).
 *
 * Single source of truth for ListManagementEngine so the engine NEVER inlines a default term,
 * a list-type key, or a reconciliation tolerance (business/GSD.md §2.1 financial-invariant gate,
 * [[feedback_hotel_financial_invariant_gate]]).
 *
 * QuickBooks parity: the "Lists" menu seeds every fresh company file with a standard set of
 * Terms (Net 15/30/60, 2% 10 Net 30) and Payment Methods (Check, Cash, Credit Card, ACH).
 * These are the QB factory defaults; an operator adds shop-specific entries on top via the CRUD API.
 *
 * Account numbers / GL surface are NOT defined here — payment TERMS drive due-date math
 * (an A/R + A/P scheduling input), they do not post to the ledger themselves. The downstream
 * BillingEngine / BillPaymentCheckRunEngine consume a term's dueDate to age receivables/payables.
 */

/** Schema version for the list-management seed + state snapshot. */
export const LIST_MANAGEMENT_SCHEMA_VERSION = "1.0.0";

/**
 * Floating-point tolerance (one ten-thousandth) for discount-percent reconciliation invariants.
 * Discount percents are fractions in [0,1]; this guards equality checks against binary-float drift.
 */
export const PCT_RECONCILE_TOLERANCE = 1e-9;

/** The three QuickBooks "name list" types this engine manages CRUD for (besides Terms). */
export const MANAGED_LIST_TYPES = ["paymentMethods", "customerTypes", "vendorTypes"] as const;
export type ManagedListType = (typeof MANAGED_LIST_TYPES)[number];

/** A seed payment term shape (mirrors the engine's PaymentTerm minus the runtime-stamped fields). */
export interface SeedPaymentTerm {
  termId: string;
  name: string;
  netDays: number;
  /** Early-payment discount fraction in [0,1] (e.g. 0.02 = 2%); omitted = no discount. */
  discountPct?: number;
  /** Days from invoice date the discount is available; omitted = no discount. */
  discountDays?: number;
}

/**
 * QuickBooks factory-default payment terms. discountDays ≤ netDays holds for every seed
 * (the engine re-validates this invariant on every defineTerm + on load).
 */
export const DEFAULT_PAYMENT_TERMS: ReadonlyArray<SeedPaymentTerm> = [
  { termId: "DUE_ON_RECEIPT", name: "Due on receipt", netDays: 0 },
  { termId: "NET_15", name: "Net 15", netDays: 15 },
  { termId: "NET_30", name: "Net 30", netDays: 30 },
  { termId: "NET_60", name: "Net 60", netDays: 60 },
  { termId: "2_10_NET_30", name: "2% 10 Net 30", netDays: 30, discountPct: 0.02, discountDays: 10 },
  { termId: "1_10_NET_30", name: "1% 10 Net 30", netDays: 30, discountPct: 0.01, discountDays: 10 },
];

/** A seed name-list entry (Payment Method / Customer Type / Vendor Type). */
export interface SeedListEntry {
  id: string;
  name: string;
}

/** QuickBooks factory-default Payment Methods. */
export const DEFAULT_PAYMENT_METHODS: ReadonlyArray<SeedListEntry> = [
  { id: "CHECK", name: "Check" },
  { id: "CASH", name: "Cash" },
  { id: "CREDIT_CARD", name: "Credit Card" },
  { id: "ACH", name: "ACH / e-Check" },
  { id: "WIRE", name: "Wire Transfer" },
];

/** QuickBooks factory-default Customer Types (shop-segment classification). */
export const DEFAULT_CUSTOMER_TYPES: ReadonlyArray<SeedListEntry> = [
  { id: "COMMERCIAL", name: "Commercial" },
  { id: "OEM", name: "OEM" },
  { id: "DISTRIBUTOR", name: "Distributor" },
  { id: "GOVERNMENT", name: "Government" },
];

/** QuickBooks factory-default Vendor Types (supply-base classification). */
export const DEFAULT_VENDOR_TYPES: ReadonlyArray<SeedListEntry> = [
  { id: "MATERIAL", name: "Material Supplier" },
  { id: "TOOLING", name: "Tooling Supplier" },
  { id: "SERVICE", name: "Service / Subcontractor" },
  { id: "UTILITY", name: "Utility" },
];

/** Seed map keyed by managed list type — drives the engine's default seeding loop. */
export const DEFAULT_LIST_SEEDS: Readonly<Record<ManagedListType, ReadonlyArray<SeedListEntry>>> = {
  paymentMethods: DEFAULT_PAYMENT_METHODS,
  customerTypes: DEFAULT_CUSTOMER_TYPES,
  vendorTypes: DEFAULT_VENDOR_TYPES,
};
