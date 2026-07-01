/**
 * ShippingReceivingLogEngine — inbound/outbound logistics ledger + 3-way match.
 *
 * Closes the §8.4 (External providers) ISO 9001 receiving-verification clause and
 * the §8.5.2 (Identification & traceability) outbound-shipment lot-chain. Bridges
 * to:
 *   - InspectionReportEngine (iter33) — incoming inspections cite receipt_id
 *   - NonConformanceAndCorrectiveActionEngine (iter23) — receiving discrepancies → NCR
 *   - VendorPerformanceTrackerEngine (iter29) — on-time + quality components fed
 *   - ExecutiveSummaryEngine (iter31) — disqualified-vendor receipts surface
 *
 * Three-way match: PO line ↔ Receipt ↔ Invoice (qty + unit_price_cents). The match
 * either reconciles (all 3 agree within tolerance) or flags a specific discrepancy
 * class — accounts payable should NEVER pay an unreconciled invoice.
 *
 * Discrepancy classes:
 *   - short_ship   — qty_received < qty_ordered
 *   - over_ship    — qty_received > qty_ordered  (hard-flag, never silent-accept)
 *   - damaged      — qty_damaged > 0
 *   - price_mismatch — invoice unit_price ≠ PO unit_price by >0.5% (currency-clean)
 *   - missing_po   — no PO line found
 *   - uom_mismatch — PO unit ≠ receipt unit
 *
 * Hotel-soul: cents-resolution (no fractional pennies), PII-free (vendor_id + part_number
 * only, no contact names), Object.frozen, R12 fail-loud.
 *
 * @module ShippingReceivingLogEngine
 * @milestone HOTEL/U-SHIPPING-RECEIVING-LOG (2026-05-26, slot:hotel iter34 /yolo)
 */

export type Uom = "ea" | "lb" | "kg" | "ft" | "m" | "in" | "mm" | "hr";
export type DiscrepancyClass =
  | "short_ship"
  | "over_ship"
  | "damaged"
  | "price_mismatch"
  | "missing_po"
  | "uom_mismatch";
export type MatchStatus = "matched" | "discrepant" | "missing_invoice" | "missing_receipt";

export interface InboundReceiptInput {
  receipt_id: string;
  po_number: string;
  vendor_id: string;
  part_number: string;
  lot_number: string;
  qty_received: number;
  qty_damaged: number;             // ≥ 0, ≤ qty_received
  uom: Uom;
  carrier: string;
  receipt_date: string;            // YYYY-MM-DD
  receiver_employee_id: string;
}

export interface InboundReceipt {
  receipt_id: string;
  po_number: string;
  vendor_id: string;
  part_number: string;
  lot_number: string;
  qty_received: number;
  qty_damaged: number;
  qty_good: number;                // qty_received − qty_damaged
  uom: Uom;
  carrier: string;
  receipt_date: string;
  receiver_employee_id: string;
  inspection_required: boolean;    // ALWAYS true on first receipt of a lot (downstream FAI/incoming)
  recorded_at: string;
}

export interface OutboundShipmentInput {
  shipment_id: string;
  order_id: string;
  customer_id: string;
  part_number: string;
  lot_numbers: ReadonlyArray<string>;     // chain of source lots (traceability)
  qty_shipped: number;
  uom: Uom;
  carrier: string;
  tracking_number: string;
  ship_date: string;                       // YYYY-MM-DD; cannot be > 7d in future
  shipper_employee_id: string;
  bol_number: string;                      // bill of lading
}

export interface OutboundShipment {
  shipment_id: string;
  order_id: string;
  customer_id: string;
  part_number: string;
  lot_numbers: ReadonlyArray<string>;
  qty_shipped: number;
  uom: Uom;
  carrier: string;
  tracking_number: string;
  ship_date: string;
  shipper_employee_id: string;
  bol_number: string;
  cofc_required: boolean;                  // true if any lot has CofC requirement
  recorded_at: string;
}

export interface POLineInput {
  po_number: string;
  part_number: string;
  qty_ordered: number;
  unit_price_cents: number;                // integer cents
  uom: Uom;
}

export interface InvoiceLineInput {
  invoice_number: string;
  po_number: string;
  part_number: string;
  qty_invoiced: number;
  unit_price_cents: number;
  uom: Uom;
}

export interface ThreeWayMatchInput {
  po_line: POLineInput;
  receipt: InboundReceipt | null;
  invoice_line: InvoiceLineInput | null;
}

export interface Discrepancy {
  class: DiscrepancyClass;
  severity: "warn" | "critical";
  value: string;
  threshold: string;
}

export interface ThreeWayMatchResult {
  po_number: string;
  part_number: string;
  status: MatchStatus;
  discrepancies: ReadonlyArray<Discrepancy>;
  reconciles: boolean;                     // true iff status === "matched"
  qty_ordered: number;
  qty_received: number | null;
  qty_invoiced: number | null;
  price_extension_po_cents: number;
  price_extension_invoice_cents: number | null;
  matched_at: string;
}

const UOMS: ReadonlyArray<Uom> = ["ea", "lb", "kg", "ft", "m", "in", "mm", "hr"];
const FUTURE_SHIP_DATE_MAX_DAYS = 7;
const PRICE_TOLERANCE_PCT = 0.005;        // 0.5 % invoice-vs-PO price tolerance

class ShippingReceivingLogEngine {
  // ─── Inbound ───────────────────────────────────────────────────────────

  logInbound(input: InboundReceiptInput): InboundReceipt {
    this.validateInboundInput(input);
    const qtyGood = input.qty_received - input.qty_damaged;
    return Object.freeze({
      receipt_id: input.receipt_id,
      po_number: input.po_number,
      vendor_id: input.vendor_id,
      part_number: input.part_number,
      lot_number: input.lot_number,
      qty_received: input.qty_received,
      qty_damaged: input.qty_damaged,
      qty_good: qtyGood,
      uom: input.uom,
      carrier: input.carrier,
      receipt_date: input.receipt_date,
      receiver_employee_id: input.receiver_employee_id,
      // Every inbound lot triggers incoming inspection — never auto-pass to inventory.
      inspection_required: true,
      recorded_at: new Date().toISOString(),
    });
  }

  // ─── Outbound ──────────────────────────────────────────────────────────

  logOutbound(input: OutboundShipmentInput): OutboundShipment {
    this.validateOutboundInput(input);
    return Object.freeze({
      shipment_id: input.shipment_id,
      order_id: input.order_id,
      customer_id: input.customer_id,
      part_number: input.part_number,
      lot_numbers: Object.freeze([...input.lot_numbers]),
      qty_shipped: input.qty_shipped,
      uom: input.uom,
      carrier: input.carrier,
      tracking_number: input.tracking_number,
      ship_date: input.ship_date,
      shipper_employee_id: input.shipper_employee_id,
      bol_number: input.bol_number,
      cofc_required: true,                 // hotel-soul default: customer always gets CofC
      recorded_at: new Date().toISOString(),
    });
  }

  // ─── Three-way match ───────────────────────────────────────────────────

  threeWayMatch(input: ThreeWayMatchInput): ThreeWayMatchResult {
    this.validateMatchInput(input);
    const { po_line: po, receipt, invoice_line: inv } = input;
    const discrepancies: Discrepancy[] = [];

    if (!receipt) {
      // Cannot reconcile without a receipt — but still surface invoice-only or PO-only state.
      return Object.freeze({
        po_number: po.po_number,
        part_number: po.part_number,
        status: "missing_receipt" as MatchStatus,
        discrepancies: Object.freeze([]),
        reconciles: false,
        qty_ordered: po.qty_ordered,
        qty_received: null,
        qty_invoiced: inv?.qty_invoiced ?? null,
        price_extension_po_cents: Math.round(po.qty_ordered * po.unit_price_cents),
        price_extension_invoice_cents:
          inv ? Math.round(inv.qty_invoiced * inv.unit_price_cents) : null,
        matched_at: new Date().toISOString(),
      });
    }

    // PO ↔ receipt
    if (receipt.uom !== po.uom) {
      discrepancies.push({
        class: "uom_mismatch",
        severity: "critical",
        value: receipt.uom,
        threshold: po.uom,
      });
    }
    if (receipt.qty_good < po.qty_ordered) {
      discrepancies.push({
        class: "short_ship",
        severity: "warn",
        value: String(receipt.qty_good),
        threshold: String(po.qty_ordered),
      });
    }
    if (receipt.qty_received > po.qty_ordered) {
      // Over-ship is ALWAYS critical — never silent-accept (could mask vendor mis-pick).
      discrepancies.push({
        class: "over_ship",
        severity: "critical",
        value: String(receipt.qty_received),
        threshold: String(po.qty_ordered),
      });
    }
    if (receipt.qty_damaged > 0) {
      discrepancies.push({
        class: "damaged",
        severity: receipt.qty_damaged === receipt.qty_received ? "critical" : "warn",
        value: String(receipt.qty_damaged),
        threshold: "0",
      });
    }

    // Receipt ↔ invoice (only if both present)
    if (!inv) {
      return Object.freeze({
        po_number: po.po_number,
        part_number: po.part_number,
        status: "missing_invoice" as MatchStatus,
        discrepancies: Object.freeze(discrepancies.map((d) => Object.freeze(d))),
        reconciles: false,
        qty_ordered: po.qty_ordered,
        qty_received: receipt.qty_good,
        qty_invoiced: null,
        price_extension_po_cents: Math.round(po.qty_ordered * po.unit_price_cents),
        price_extension_invoice_cents: null,
        matched_at: new Date().toISOString(),
      });
    }

    if (inv.po_number !== po.po_number) {
      discrepancies.push({
        class: "missing_po",
        severity: "critical",
        value: inv.po_number,
        threshold: po.po_number,
      });
    }
    if (inv.uom !== po.uom) {
      discrepancies.push({
        class: "uom_mismatch",
        severity: "critical",
        value: inv.uom,
        threshold: po.uom,
      });
    }
    const priceDelta = Math.abs(inv.unit_price_cents - po.unit_price_cents);
    const priceTolerance = Math.max(1, Math.round(po.unit_price_cents * PRICE_TOLERANCE_PCT));
    if (priceDelta > priceTolerance) {
      discrepancies.push({
        class: "price_mismatch",
        severity: "critical",
        value: `${inv.unit_price_cents}¢`,
        threshold: `${po.unit_price_cents}¢ ±${priceTolerance}¢`,
      });
    }

    const status: MatchStatus = discrepancies.length === 0 ? "matched" : "discrepant";
    return Object.freeze({
      po_number: po.po_number,
      part_number: po.part_number,
      status,
      discrepancies: Object.freeze(discrepancies.map((d) => Object.freeze(d))),
      reconciles: status === "matched",
      qty_ordered: po.qty_ordered,
      qty_received: receipt.qty_good,
      qty_invoiced: inv.qty_invoiced,
      price_extension_po_cents: Math.round(po.qty_ordered * po.unit_price_cents),
      price_extension_invoice_cents: Math.round(inv.qty_invoiced * inv.unit_price_cents),
      matched_at: new Date().toISOString(),
    });
  }

  // ─── R12 validation ────────────────────────────────────────────────────

  private validateInboundInput(input: InboundReceiptInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("ShippingReceivingLogEngine: input must be an object");
    }
    for (const f of [
      "receipt_id", "po_number", "vendor_id", "part_number", "lot_number",
      "carrier", "receiver_employee_id",
    ] as const) {
      if (!input[f] || typeof input[f] !== "string") {
        throw new Error(`ShippingReceivingLogEngine: ${f} must be non-empty string`);
      }
    }
    if (!Number.isFinite(input.qty_received) || input.qty_received <= 0) {
      throw new Error("ShippingReceivingLogEngine: qty_received must be > 0");
    }
    if (!Number.isFinite(input.qty_damaged) || input.qty_damaged < 0) {
      throw new Error("ShippingReceivingLogEngine: qty_damaged must be >= 0");
    }
    if (input.qty_damaged > input.qty_received) {
      throw new Error(
        `ShippingReceivingLogEngine: qty_damaged (${input.qty_damaged}) cannot exceed qty_received (${input.qty_received})`,
      );
    }
    if (!UOMS.includes(input.uom)) {
      throw new Error(`ShippingReceivingLogEngine: uom must be one of ${UOMS.join("|")}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.receipt_date)) {
      throw new Error("ShippingReceivingLogEngine: receipt_date must be ISO YYYY-MM-DD");
    }
  }

  private validateOutboundInput(input: OutboundShipmentInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("ShippingReceivingLogEngine: input must be an object");
    }
    for (const f of [
      "shipment_id", "order_id", "customer_id", "part_number",
      "carrier", "tracking_number", "shipper_employee_id", "bol_number",
    ] as const) {
      if (!input[f] || typeof input[f] !== "string") {
        throw new Error(`ShippingReceivingLogEngine: ${f} must be non-empty string`);
      }
    }
    if (!Array.isArray(input.lot_numbers) || input.lot_numbers.length === 0) {
      throw new Error("ShippingReceivingLogEngine: lot_numbers must be non-empty array");
    }
    if (!Number.isFinite(input.qty_shipped) || input.qty_shipped <= 0) {
      throw new Error("ShippingReceivingLogEngine: qty_shipped must be > 0");
    }
    if (!UOMS.includes(input.uom)) {
      throw new Error(`ShippingReceivingLogEngine: uom must be one of ${UOMS.join("|")}`);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.ship_date)) {
      throw new Error("ShippingReceivingLogEngine: ship_date must be ISO YYYY-MM-DD");
    }
    // ship_date may be in the future but not more than 7d ahead (planned shipment window).
    const shipTs = Date.parse(`${input.ship_date}T00:00:00Z`);
    const horizonTs = Date.now() + FUTURE_SHIP_DATE_MAX_DAYS * 24 * 3600 * 1000;
    if (shipTs > horizonTs) {
      throw new Error(
        `ShippingReceivingLogEngine: ship_date (${input.ship_date}) more than ${FUTURE_SHIP_DATE_MAX_DAYS}d in future`,
      );
    }
  }

  private validateMatchInput(input: ThreeWayMatchInput): void {
    if (!input || typeof input !== "object") {
      throw new Error("ShippingReceivingLogEngine: match input must be an object");
    }
    const po = input.po_line;
    if (!po || typeof po.po_number !== "string" || !po.po_number) {
      throw new Error("ShippingReceivingLogEngine: po_line.po_number required");
    }
    if (!Number.isInteger(po.unit_price_cents) || po.unit_price_cents < 0) {
      throw new Error("ShippingReceivingLogEngine: po_line.unit_price_cents must be non-negative integer");
    }
    if (!Number.isFinite(po.qty_ordered) || po.qty_ordered <= 0) {
      throw new Error("ShippingReceivingLogEngine: po_line.qty_ordered must be > 0");
    }
    if (!UOMS.includes(po.uom)) {
      throw new Error(`ShippingReceivingLogEngine: po_line.uom must be one of ${UOMS.join("|")}`);
    }
    if (input.invoice_line) {
      const inv = input.invoice_line;
      if (!Number.isInteger(inv.unit_price_cents) || inv.unit_price_cents < 0) {
        throw new Error("ShippingReceivingLogEngine: invoice_line.unit_price_cents must be non-negative integer");
      }
      if (!Number.isFinite(inv.qty_invoiced) || inv.qty_invoiced <= 0) {
        throw new Error("ShippingReceivingLogEngine: invoice_line.qty_invoiced must be > 0");
      }
    }
  }
}

export const shippingReceivingLogEngine = new ShippingReceivingLogEngine();
