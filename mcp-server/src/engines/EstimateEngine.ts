/**
 * EstimateEngine — customer estimates / quotes for the PRISM ERP (galaxy:business, slot:hotel).
 *
 * QuickBooks-parity: the "Estimate" function set (build a non-binding price proposal, discount it,
 * compute tax, send → accept/reject/expire, convert an accepted estimate to a sales order).
 * QB-PARITY-MS0 Phase-2 engine #1 (A/R revenue cycle, the first step of the QB sales workflow:
 * Estimate → Sales Order → Invoice → Payment).
 *
 * PRISM synergy (QUICKBOOKS-PARITY-PLAN.md thesis): an estimate is BORN from a quote —
 * `quote_to_ship` / the quoting galaxy produces an accepted price → formalized here as an estimate;
 * the tax line is computed by `SalesUseTaxEngine` (not re-derived); an accepted estimate hands off
 * to `SalesOrderEngine` (Phase-2 #2). An estimate is NON-BINDING and posts nothing to the GL until it
 * becomes an invoice — so it carries no GL effect (deliberately: §8.4 — not money movement yet).
 *
 * Financial-invariant compliance (business/GSD.md §2):
 *  - line totals reconcile (Σ line extension == subtotal; subtotal − discount + tax == grandTotal).
 *  - half-even rounding to the cent (reused from SalesUseTaxEngine — DRY).
 *  - discount can never exceed the subtotal (clamped); negative qty/price THROW (no silent coercion).
 *  - status moves only along the policy FSM (estimate-policy.ts) — an illegal transition THROWS.
 *  - tax via SalesUseTaxEngine (imported rates) — never an inlined rate here.
 */
// WIRE-EXEMPT: dispatcher wiring is BLOCKED by worktree-dispatcher divergence — the slot/hotel
// businessDispatcher.ts is a stale 441-action copy vs main's 879; wiring + golf-merging the worktree
// copy would CLOBBER ~438 main actions. Wire estimate_create / estimate_transition / estimate_to_sales_order
// into MAIN businessDispatcher.ts (additive) AFTER this engine reaches main. See business/QUICKBOOKS-PARITY-PLAN.md.
import { z } from "zod";
import { SalesUseTaxEngine } from "./SalesUseTaxEngine.js";
import { roundCentsHalfEven } from "../data/money.js";
import {
  DEFAULT_ESTIMATE_VALIDITY_DAYS,
  isValidEstimateTransition,
  ESTIMATE_POLICY_SCHEMA_VERSION,
  type EstimateStatus,
  type DiscountType,
} from "../data/estimate-policy.js";

const LineSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().finite().positive(),
  unitPrice: z.number().finite().nonnegative(),
  taxable: z.boolean().optional().default(true),
});
const DiscountSchema = z.object({
  type: z.enum(["percent", "fixed"]),
  value: z.number().finite().nonnegative(),
});
const EstimateInputSchema = z.object({
  estimateId: z.string().optional(),
  customerId: z.string().min(1),
  customerName: z.string().optional(),
  issueDate: z.string().min(1), // ISO YYYY-MM-DD (or full ISO — date part is used)
  validDays: z.number().int().positive().optional().default(DEFAULT_ESTIMATE_VALIDITY_DAYS),
  lines: z.array(LineSchema).min(1),
  discount: DiscountSchema.optional(),
  taxJurisdiction: z.string().optional(),
  taxExempt: z.boolean().optional().default(false),
  exemptReason: z.string().optional(),
});
export type EstimateInput = z.input<typeof EstimateInputSchema>;

export interface EstimateLineResult {
  description: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
  extension: number; // quantity * unitPrice, rounded
}
export interface Estimate {
  estimateId: string;
  customerId: string;
  customerName: string | null;
  issueDate: string;
  validUntil: string;
  status: EstimateStatus;
  lines: EstimateLineResult[];
  subtotal: number;
  discountType: DiscountType | null;
  discountAmount: number;
  taxableBase: number;
  taxJurisdiction: string | null;
  tax: number;
  grandTotal: number;
  policySchemaVersion: string;
}

/** Add whole days to an ISO date, returning a YYYY-MM-DD string (UTC, deterministic). */
function addDays(iso: string, days: number): string {
  const datePart = iso.slice(0, 10);
  const d = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`[estimate] invalid issueDate "${iso}" — expected ISO YYYY-MM-DD`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Deterministic content hash over an estimate's DISTINGUISHING fields — appended to the fallback
 * estimateId so two DIFFERENT estimates for the same customer on the same day get DIFFERENT ids
 * (the prior `EST-<cust>-<date>` fallback silently collided → a downstream store keyed by estimateId
 * would overwrite the first). Identical inputs hash identically (re-creating the same estimate yields
 * the same id — idempotent, not a collision). FNV-1a 32-bit → base36: PURE + dependency-free (no
 * Date/Math.random → determinism preserved); a disambiguator, NOT a cryptographic identifier.
 */
function estimateContentHash(e: {
  lines: ReadonlyArray<{ description: string; quantity: number; unitPrice: number; taxable: boolean }>;
  discount?: { type: DiscountType; value: number };
  taxJurisdiction?: string;
  taxExempt: boolean;
  exemptReason?: string;
  validDays: number;
}): string {
  const canon = JSON.stringify([
    e.lines.map((l) => [l.description, l.quantity, l.unitPrice, l.taxable]),
    e.discount ? [e.discount.type, e.discount.value] : null,
    e.taxJurisdiction ?? null,
    e.taxExempt,
    e.exemptReason ?? null,
    e.validDays,
  ]);
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < canon.length; i++) {
    h ^= canon.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0; // FNV prime, kept unsigned 32-bit
  }
  return h.toString(36);
}

export class EstimateEngine {
  /** Build a new estimate (status "draft") with reconciled line/subtotal/discount/tax/total. */
  static create(input: EstimateInput): Estimate {
    const e = EstimateInputSchema.parse(input); // throws on negative qty/price, empty lines, etc.

    const lines: EstimateLineResult[] = e.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      taxable: l.taxable,
      extension: roundCentsHalfEven(l.quantity * l.unitPrice),
    }));
    const subtotal = roundCentsHalfEven(lines.reduce((s, l) => s + l.extension, 0));

    let discountAmount = 0;
    if (e.discount) {
      if (e.discount.type === "percent" && e.discount.value > 100) {
        throw new Error(`[estimate] percent discount ${e.discount.value}% exceeds 100%`); // validate BEFORE clamping
      }
      const raw = e.discount.type === "percent" ? (subtotal * e.discount.value) / 100 : e.discount.value;
      discountAmount = Math.min(roundCentsHalfEven(raw), subtotal); // a fixed discount over subtotal is clamped (total floored at $0)
    }

    // Tax applies to the taxable portion of (subtotal − discount). Discount is applied pro-rata to the
    // taxable share so a discount on a partly-exempt estimate doesn't under/over-tax.
    const taxableExtension = roundCentsHalfEven(lines.filter((l) => l.taxable).reduce((s, l) => s + l.extension, 0));
    const taxableShare = subtotal > 0 ? taxableExtension / subtotal : 0;
    const taxableBase = roundCentsHalfEven((subtotal - discountAmount) * taxableShare);

    // Validate + compute tax whenever a jurisdiction is given — even at a $0 taxable base. calcSalesTax
    // validates the jurisdiction (THROWS on unknown — a silent 0% is under-collection liability) and the
    // exempt audit-trail reason. Short-circuiting on taxableBase>0 would silently accept a typo'd
    // jurisdiction / a reasonless exemption on an all-non-taxable or fully-discounted estimate.
    let tax = 0;
    if (e.taxJurisdiction) {
      tax = SalesUseTaxEngine.calcSalesTax({
        amount: taxableBase,
        jurisdiction: e.taxJurisdiction,
        exempt: e.taxExempt,
        exemptReason: e.exemptReason,
        reference: e.estimateId,
      }).tax;
    }

    const grandTotal = roundCentsHalfEven(subtotal - discountAmount + tax);
    return {
      // explicit id wins; else a customer+date+content-hash fallback (the hash prevents the prior
      // silent same-customer-same-day collision — see estimateContentHash).
      estimateId: e.estimateId ?? `EST-${e.customerId}-${e.issueDate.slice(0, 10)}-${estimateContentHash(e)}`,
      customerId: e.customerId,
      customerName: e.customerName ?? null,
      issueDate: e.issueDate.slice(0, 10),
      validUntil: addDays(e.issueDate, e.validDays),
      status: "draft",
      lines,
      subtotal,
      discountType: e.discount?.type ?? null,
      discountAmount,
      taxableBase,
      taxJurisdiction: e.taxJurisdiction ?? null,
      tax,
      grandTotal,
      policySchemaVersion: ESTIMATE_POLICY_SCHEMA_VERSION,
    };
  }

  /** Move an estimate to a new status along the policy FSM. Throws on an illegal transition. */
  static transition(estimate: Estimate, to: EstimateStatus): Estimate {
    if (!isValidEstimateTransition(estimate.status, to)) {
      throw new Error(`[estimate] illegal status transition ${estimate.status} → ${to} (estimate ${estimate.estimateId})`);
    }
    return { ...estimate, status: to };
  }

  /** Is the estimate expired as of a given ISO date? (Accepted/converted estimates do not "expire".) */
  static isExpired(estimate: Estimate, asOfISO: string): boolean {
    if (estimate.status === "accepted" || estimate.status === "converted") return false;
    const asOf = asOfISO.slice(0, 10);
    if (asOf.length < 10) throw new Error(`[estimate] invalid asOf date "${asOfISO}"`);
    return asOf > estimate.validUntil; // YYYY-MM-DD lexicographic compare is chronological
  }

  /**
   * Hand an accepted estimate off to a sales order (Phase-2 #2 consumer). Throws unless the estimate
   * is "accepted". Returns the sales-order draft shape; does NOT post to the GL (that happens at invoice).
   */
  static toSalesOrder(estimate: Estimate): {
    fromEstimateId: string;
    customerId: string;
    lines: EstimateLineResult[];
    subtotal: number;
    discountAmount: number;
    tax: number;
    total: number;
    /**
     * the source estimate flipped to "converted" (via the FSM). Persist THIS — a second toSalesOrder on
     * the converted estimate then THROWS (status !== "accepted"), making conversion idempotent instead of
     * silently minting a duplicate sales order from one estimate.
     */
    convertedEstimate: Estimate;
  } {
    if (estimate.status !== "accepted") {
      throw new Error(`[estimate] cannot convert estimate ${estimate.estimateId} to a sales order from status "${estimate.status}" (must be "accepted")`);
    }
    return {
      fromEstimateId: estimate.estimateId,
      customerId: estimate.customerId,
      lines: estimate.lines,
      subtotal: estimate.subtotal,
      discountAmount: estimate.discountAmount,
      tax: estimate.tax,
      total: estimate.grandTotal,
      convertedEstimate: EstimateEngine.transition(estimate, "converted"),
    };
  }
}

export const estimateEngine = EstimateEngine;
