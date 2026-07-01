/**
 * VendorQuoteToPurchaseOrderEngine — vendor-quote → purchase-order lifecycle
 * (hotel iter19, 2026-05-24, U-VENDOR-QUOTE-TO-PO).
 *
 * Closes G3 from the ERP-comparison audit (vendor-side, complements existing
 * QuoteToOrderBridgeEngine which handles customer-quote → sales-order side).
 *
 * Lifecycle: vendor_quote → purchase_order → receipt → three_way_match.
 *
 * Pure in-memory state engine — caller owns persistence. Singleton
 * `vendorQuoteToPurchaseOrderEngine`.
 *
 * Hotel-soul:
 *   - **financial-invariant gate** — three-way match (PO line totals ==
 *     receipt line totals == invoice line totals, within $0.01); refuses
 *     match-confirm on mismatch
 *   - **over-receipt refusal** — receiving more than PO-ordered qty is
 *     REFUSED (never silently absorbed); operator must amend PO or create
 *     variance entry
 *   - **R12 fail-loud** — bad inputs throw with descriptive errors
 *   - **defensive copy** — every public read deep-clones internal state
 *   - **state-machine forward-only** — quote→PO→partially_received→fully_received→matched
 *     transitions are enforced; backward moves throw
 *
 * Reference: APICS CSCP body of knowledge §4 (Purchasing & 3-way match);
 * Garrison/Noreen Managerial Accounting 17e Ch.4 (Job-Order Costing).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface VendorQuoteLineItem {
  sku: string;
  description: string;
  quoted_qty: number;
  unit_price: number;
}

export interface VendorQuoteInput {
  vendor_id: string;
  vendor_name: string;
  line_items: VendorQuoteLineItem[];
  valid_until: string;          // ISO yyyy-mm-dd
}

export interface VendorQuote {
  id: string;
  vendor_id: string;
  vendor_name: string;
  line_items: VendorQuoteLineItem[];
  valid_until: string;
  status: "open" | "converted" | "expired";
  total_value: number;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderLineItem {
  sku: string;
  description: string;
  ordered_qty: number;
  unit_price: number;
  received_qty: number;         // running total of received receipts
  extended_cost: number;        // ordered_qty * unit_price
}

export type POStatus = "open" | "partially_received" | "fully_received" | "matched" | "cancelled";

export interface PurchaseOrder {
  id: string;
  source_quote_id: string;
  vendor_id: string;
  vendor_name: string;
  line_items: PurchaseOrderLineItem[];
  status: POStatus;
  total_ordered_value: number;
  total_received_value: number;
  created_at: string;
  updated_at: string;
}

export interface POReceiptLineItem {
  sku: string;
  received_qty: number;
}

export interface ThreeWayMatchInput {
  po_id: string;
  invoice_total: number;        // invoice $ to reconcile against PO + receipts
}

export interface ThreeWayMatchResult {
  po_id: string;
  po_total: number;
  receipt_total: number;
  invoice_total: number;
  matched: boolean;
  variance: number;             // worst-case absolute delta across legs
  message: string;
  fetched_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const QUOTE_ID_PREFIX = "VQ";
const PO_ID_PREFIX = "PO";
const LEDGER_TOLERANCE = 0.01;
const MAX_VENDOR_LEN = 200;
const MAX_LINE_ITEMS = 500;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

function validateLineItems(items: unknown, label: string): VendorQuoteLineItem[] {
  if (!Array.isArray(items)) throw new Error(`${label}: must be an array`);
  if (items.length === 0) throw new Error(`${label}: empty`);
  if (items.length > MAX_LINE_ITEMS) throw new Error(`${label}: exceeds ${MAX_LINE_ITEMS}`);
  const seenSkus = new Set<string>();
  const out: VendorQuoteLineItem[] = [];
  for (let i = 0; i < items.length; i++) {
    const li = items[i] as Record<string, unknown>;
    if (li === null || typeof li !== "object") throw new Error(`${label}[${i}]: must be object`);
    const sku = assertNonEmptyStr(li.sku, `${label}[${i}].sku`, 100);
    if (seenSkus.has(sku)) throw new Error(`${label}[${i}].sku: duplicate '${sku}'`);
    seenSkus.add(sku);
    const desc = assertNonEmptyStr(li.description, `${label}[${i}].description`, 500);
    assertPositive(li.quoted_qty as number, `${label}[${i}].quoted_qty`);
    assertPositive(li.unit_price as number, `${label}[${i}].unit_price`);
    out.push({
      sku, description: desc,
      quoted_qty: li.quoted_qty as number,
      unit_price: li.unit_price as number,
    });
  }
  return out;
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

function makeQuoteId(seq: number): string {
  return `${QUOTE_ID_PREFIX}-${seq.toString().padStart(6, "0")}`;
}

function makePOId(seq: number): string {
  return `${PO_ID_PREFIX}-${seq.toString().padStart(6, "0")}`;
}

// ─── Engine ─────────────────────────────────────────────────────────────────

export class VendorQuoteToPurchaseOrderEngine {
  private readonly quotes = new Map<string, VendorQuote>();
  private readonly pos = new Map<string, PurchaseOrder>();
  private quoteSeq = 0;
  private poSeq = 0;

  /** Record a new vendor quote. R12 fail-loud on bad inputs. */
  recordVendorQuote(input: VendorQuoteInput): VendorQuote {
    const vendorId = assertNonEmptyStr(input.vendor_id, "vendor_id", MAX_VENDOR_LEN);
    const vendorName = assertNonEmptyStr(input.vendor_name, "vendor_name", MAX_VENDOR_LEN);
    assertISODate(input.valid_until, "valid_until");
    const lineItems = validateLineItems(input.line_items, "line_items");
    const total = round2(lineItems.reduce((s, li) => s + li.quoted_qty * li.unit_price, 0));
    const now = new Date().toISOString();
    this.quoteSeq += 1;
    const quote: VendorQuote = {
      id: makeQuoteId(this.quoteSeq),
      vendor_id: vendorId,
      vendor_name: vendorName,
      line_items: lineItems,
      valid_until: input.valid_until,
      status: "open",
      total_value: total,
      created_at: now,
      updated_at: now,
    };
    this.quotes.set(quote.id, quote);
    return this.deepCopyQuote(quote);
  }

  /**
   * Convert an open quote into a purchase order. Supports partial quantities
   * (operator may order less than quoted). Quote transitions to "converted".
   *
   * @throws on unknown quote, expired quote, requested_qty > quoted_qty,
   *         unknown SKU, non-positive qty
   */
  convertQuoteToPO(
    quoteId: string,
    requestedQtys: Record<string, number>,
  ): PurchaseOrder {
    const quote = this.quotes.get(quoteId);
    if (!quote) throw new Error(`quote '${quoteId}' not found`);
    if (quote.status === "expired") {
      throw new Error(`quote '${quoteId}' is expired (status=${quote.status})`);
    }
    if (quote.status === "converted") {
      throw new Error(`quote '${quoteId}' already converted to PO`);
    }
    const poLineItems: PurchaseOrderLineItem[] = [];
    for (const [sku, qty] of Object.entries(requestedQtys)) {
      assertPositive(qty, `requestedQtys['${sku}']`);
      const qLine = quote.line_items.find(li => li.sku === sku);
      if (!qLine) throw new Error(`requestedQtys['${sku}']: SKU not on quote ${quoteId}`);
      if (qty > qLine.quoted_qty + LEDGER_TOLERANCE) {
        throw new Error(`requestedQtys['${sku}']: ${qty} exceeds quoted ${qLine.quoted_qty}`);
      }
      poLineItems.push({
        sku, description: qLine.description,
        ordered_qty: qty,
        unit_price: qLine.unit_price,
        received_qty: 0,
        extended_cost: round2(qty * qLine.unit_price),
      });
    }
    if (poLineItems.length === 0) {
      throw new Error(`convertQuoteToPO: requestedQtys empty for quote ${quoteId}`);
    }

    const totalOrdered = round2(poLineItems.reduce((s, li) => s + li.extended_cost, 0));
    const now = new Date().toISOString();
    this.poSeq += 1;
    const po: PurchaseOrder = {
      id: makePOId(this.poSeq),
      source_quote_id: quote.id,
      vendor_id: quote.vendor_id,
      vendor_name: quote.vendor_name,
      line_items: poLineItems,
      status: "open",
      total_ordered_value: totalOrdered,
      total_received_value: 0,
      created_at: now,
      updated_at: now,
    };
    this.pos.set(po.id, po);
    // Update quote status forward
    quote.status = "converted";
    quote.updated_at = now;
    return this.deepCopyPO(po);
  }

  /**
   * Record a receipt against a PO. Multiple receipts permitted (partial
   * deliveries). Status transitions: open → partially_received →
   * fully_received as receipts accumulate.
   *
   * Hotel-soul: REFUSES over-receipt (received_qty + new > ordered_qty);
   * operator must amend PO via separate flow or create variance entry.
   */
  recordPOReceipt(poId: string, receiptLines: POReceiptLineItem[]): PurchaseOrder {
    const po = this.pos.get(poId);
    if (!po) throw new Error(`PO '${poId}' not found`);
    if (po.status === "cancelled") {
      throw new Error(`PO '${poId}' is cancelled`);
    }
    if (po.status === "matched") {
      throw new Error(`PO '${poId}' already 3-way matched (no further receipts)`);
    }
    if (!Array.isArray(receiptLines) || receiptLines.length === 0) {
      throw new Error(`receiptLines: must be non-empty array`);
    }

    for (const r of receiptLines) {
      const sku = assertNonEmptyStr(r.sku, "receiptLine.sku", 100);
      assertPositive(r.received_qty, `receiptLine['${sku}'].received_qty`);
      const line = po.line_items.find(li => li.sku === sku);
      if (!line) throw new Error(`receiptLine['${sku}']: SKU not on PO ${poId}`);
      const newReceived = round2(line.received_qty + r.received_qty);
      if (newReceived > line.ordered_qty + LEDGER_TOLERANCE) {
        throw new Error(
          `receiptLine['${sku}']: receipt ${r.received_qty} would push total received ${newReceived.toFixed(2)} above ordered ${line.ordered_qty.toFixed(2)} — refusing silent over-receipt`,
        );
      }
      line.received_qty = newReceived;
    }

    // Recompute totals + status
    let totalReceived = 0;
    let fullyReceived = true;
    for (const li of po.line_items) {
      totalReceived = round2(totalReceived + li.received_qty * li.unit_price);
      if (li.received_qty + LEDGER_TOLERANCE < li.ordered_qty) fullyReceived = false;
    }
    po.total_received_value = totalReceived;
    po.status = fullyReceived ? "fully_received" : "partially_received";
    po.updated_at = new Date().toISOString();
    return this.deepCopyPO(po);
  }

  /**
   * Three-way match: PO total ↔ receipt total ↔ invoice total.
   * Hotel-soul: refuses to mark matched on variance > $0.01; surfaces the
   * delta so accounting can investigate (never silently absorbs reconcile
   * gaps).
   */
  threeWayMatch(input: ThreeWayMatchInput): ThreeWayMatchResult {
    const po = this.pos.get(input.po_id);
    if (!po) throw new Error(`PO '${input.po_id}' not found`);
    assertPositive(input.invoice_total, "invoice_total");
    if (po.status !== "fully_received") {
      throw new Error(`3-way match: PO ${po.id} not fully_received (status=${po.status})`);
    }
    const variance = Math.max(
      Math.abs(po.total_ordered_value - po.total_received_value),
      Math.abs(po.total_received_value - input.invoice_total),
      Math.abs(po.total_ordered_value - input.invoice_total),
    );
    const matched = variance <= LEDGER_TOLERANCE;
    let message: string;
    if (matched) {
      po.status = "matched";
      po.updated_at = new Date().toISOString();
      message = "3-way match successful; PO marked matched";
    } else {
      message = `3-way variance $${variance.toFixed(2)} exceeds tolerance — investigate before posting`;
    }
    return {
      po_id: po.id,
      po_total: po.total_ordered_value,
      receipt_total: po.total_received_value,
      invoice_total: input.invoice_total,
      matched,
      variance: round2(variance),
      message,
      fetched_at: new Date().toISOString(),
    };
  }

  /** Read by id; null if missing. */
  getQuote(id: string): VendorQuote | null {
    if (typeof id !== "string" || id.length === 0) return null;
    const q = this.quotes.get(id);
    return q ? this.deepCopyQuote(q) : null;
  }

  getPO(id: string): PurchaseOrder | null {
    if (typeof id !== "string" || id.length === 0) return null;
    const po = this.pos.get(id);
    return po ? this.deepCopyPO(po) : null;
  }

  listQuotes(filter?: { vendor_id?: string; status?: VendorQuote["status"] }): VendorQuote[] {
    const out: VendorQuote[] = [];
    for (const q of this.quotes.values()) {
      if (filter?.vendor_id && q.vendor_id !== filter.vendor_id) continue;
      if (filter?.status && q.status !== filter.status) continue;
      out.push(this.deepCopyQuote(q));
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  listPOs(filter?: { vendor_id?: string; status?: POStatus }): PurchaseOrder[] {
    const out: PurchaseOrder[] = [];
    for (const po of this.pos.values()) {
      if (filter?.vendor_id && po.vendor_id !== filter.vendor_id) continue;
      if (filter?.status && po.status !== filter.status) continue;
      out.push(this.deepCopyPO(po));
    }
    out.sort((a, b) => a.id.localeCompare(b.id));
    return out;
  }

  /** Reset internal state — test helper. */
  __resetForTests(): void {
    this.quotes.clear();
    this.pos.clear();
    this.quoteSeq = 0;
    this.poSeq = 0;
  }

  private deepCopyQuote(q: VendorQuote): VendorQuote {
    return { ...q, line_items: q.line_items.map(li => ({ ...li })) };
  }

  private deepCopyPO(po: PurchaseOrder): PurchaseOrder {
    return { ...po, line_items: po.line_items.map(li => ({ ...li })) };
  }
}

export const vendorQuoteToPurchaseOrderEngine = new VendorQuoteToPurchaseOrderEngine();
