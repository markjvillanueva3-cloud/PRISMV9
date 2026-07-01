/**
 * ShippingReceivingLogEngine.test.ts — HOTEL/U-SHIPPING-RECEIVING-LOG (iter34 /yolo)
 */
import { describe, it, expect } from "vitest";
import {
  shippingReceivingLogEngine,
  type InboundReceiptInput,
  type OutboundShipmentInput,
  type POLineInput,
  type InvoiceLineInput,
} from "../engines/ShippingReceivingLogEngine.js";

const INBOUND_OK: InboundReceiptInput = {
  receipt_id: "RCV-001",
  po_number: "PO-1001",
  vendor_id: "VND-ALCOA",
  part_number: "PN-12345",
  lot_number: "LOT-V-2026-001",
  qty_received: 100,
  qty_damaged: 0,
  uom: "ea",
  carrier: "FedEx",
  receipt_date: "2026-06-01",
  receiver_employee_id: "EMP-RCV-01",
};

const OUTBOUND_OK: OutboundShipmentInput = {
  shipment_id: "SHP-001",
  order_id: "ORD-9001",
  customer_id: "CUST-ATF",
  part_number: "PN-12345",
  lot_numbers: ["LOT-2026-001"],
  qty_shipped: 50,
  uom: "ea",
  carrier: "FedEx",
  tracking_number: "TRK123456",
  ship_date: "2026-06-02",
  shipper_employee_id: "EMP-SHP-01",
  bol_number: "BOL-001",
};

const PO_LINE: POLineInput = {
  po_number: "PO-1001",
  part_number: "PN-12345",
  qty_ordered: 100,
  unit_price_cents: 250, // $2.50/ea
  uom: "ea",
};

describe("ShippingReceivingLogEngine", () => {
  describe("logInbound — happy path", () => {
    it("records receipt with qty_good = received − damaged", () => {
      const r = shippingReceivingLogEngine.logInbound(INBOUND_OK);
      expect(r.qty_good).toBe(100);
      expect(r.inspection_required).toBe(true);
      expect(Object.isFrozen(r)).toBe(true);
    });

    it("partial-damage receipt: qty_good correctly reduced", () => {
      const r = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_damaged: 5 });
      expect(r.qty_good).toBe(95);
      expect(r.qty_damaged).toBe(5);
    });
  });

  describe("logOutbound — happy path", () => {
    it("records shipment with frozen lot chain", () => {
      const s = shippingReceivingLogEngine.logOutbound(OUTBOUND_OK);
      expect(s.qty_shipped).toBe(50);
      expect(s.cofc_required).toBe(true);
      expect(Object.isFrozen(s)).toBe(true);
      expect(Object.isFrozen(s.lot_numbers)).toBe(true);
    });

    it("multi-lot shipment preserves chain", () => {
      const s = shippingReceivingLogEngine.logOutbound({
        ...OUTBOUND_OK,
        lot_numbers: ["LOT-A", "LOT-B", "LOT-C"],
      });
      expect(s.lot_numbers).toEqual(["LOT-A", "LOT-B", "LOT-C"]);
    });
  });

  describe("threeWayMatch — happy path", () => {
    it("PO + matching receipt + matching invoice → matched + reconciles", () => {
      const receipt = shippingReceivingLogEngine.logInbound(INBOUND_OK);
      const invoice: InvoiceLineInput = {
        invoice_number: "INV-001",
        po_number: "PO-1001",
        part_number: "PN-12345",
        qty_invoiced: 100,
        unit_price_cents: 250,
        uom: "ea",
      };
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE,
        receipt,
        invoice_line: invoice,
      });
      expect(m.status).toBe("matched");
      expect(m.reconciles).toBe(true);
      expect(m.discrepancies).toHaveLength(0);
      expect(m.price_extension_po_cents).toBe(25_000); // 100 × $2.50
      expect(m.price_extension_invoice_cents).toBe(25_000);
    });
  });

  describe("threeWayMatch — discrepancy classes", () => {
    it("short-ship → warn discrepancy", () => {
      const receipt = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_received: 80 });
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE,
        receipt,
        invoice_line: null,
      });
      expect(m.status).toBe("missing_invoice");
      const short = m.discrepancies.find((d) => d.class === "short_ship");
      expect(short).toMatchObject({ severity: "warn", value: "80", threshold: "100" });
    });

    it("over-ship → CRITICAL discrepancy (never silent-accept)", () => {
      const receipt = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_received: 120 });
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE,
        receipt,
        invoice_line: null,
      });
      const over = m.discrepancies.find((d) => d.class === "over_ship");
      expect(over?.severity).toBe("critical");
      expect(m.reconciles).toBe(false);
    });

    it("damaged > 0 → warn; all-damaged → critical", () => {
      const partial = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_damaged: 10 });
      const m1 = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt: partial, invoice_line: null,
      });
      expect(m1.discrepancies.find((d) => d.class === "damaged")?.severity).toBe("warn");

      const allBad = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_damaged: 100 });
      const m2 = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt: allBad, invoice_line: null,
      });
      expect(m2.discrepancies.find((d) => d.class === "damaged")?.severity).toBe("critical");
    });

    it("uom_mismatch (receipt) → critical", () => {
      const receipt = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, uom: "lb" });
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt, invoice_line: null,
      });
      const u = m.discrepancies.find((d) => d.class === "uom_mismatch");
      expect(u?.severity).toBe("critical");
    });

    it("price_mismatch (>0.5% off) → critical", () => {
      const receipt = shippingReceivingLogEngine.logInbound(INBOUND_OK);
      const invoice: InvoiceLineInput = {
        invoice_number: "INV-002",
        po_number: "PO-1001",
        part_number: "PN-12345",
        qty_invoiced: 100,
        unit_price_cents: 300,         // PO was 250¢, delta=50¢ → way over 0.5%
        uom: "ea",
      };
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt, invoice_line: invoice,
      });
      const p = m.discrepancies.find((d) => d.class === "price_mismatch");
      expect(p?.severity).toBe("critical");
      expect(m.reconciles).toBe(false);
    });

    it("price within 0.5% tolerance → no discrepancy", () => {
      // PO 1000¢, 0.5% = 5¢, so 1004¢ should reconcile
      const receipt = shippingReceivingLogEngine.logInbound(INBOUND_OK);
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: { ...PO_LINE, unit_price_cents: 1000 },
        receipt,
        invoice_line: {
          invoice_number: "INV-003", po_number: "PO-1001", part_number: "PN-12345",
          qty_invoiced: 100, unit_price_cents: 1004, uom: "ea",
        },
      });
      expect(m.reconciles).toBe(true);
    });

    it("missing PO on invoice (cross-PO) → critical missing_po", () => {
      const receipt = shippingReceivingLogEngine.logInbound(INBOUND_OK);
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt,
        invoice_line: {
          invoice_number: "INV-X", po_number: "PO-WRONG", part_number: "PN-12345",
          qty_invoiced: 100, unit_price_cents: 250, uom: "ea",
        },
      });
      expect(m.discrepancies.find((d) => d.class === "missing_po")?.severity).toBe("critical");
    });

    it("missing receipt entirely → missing_receipt status", () => {
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt: null, invoice_line: null,
      });
      expect(m.status).toBe("missing_receipt");
      expect(m.reconciles).toBe(false);
      expect(m.qty_received).toBeNull();
    });
  });

  describe("R12 input validation", () => {
    it("inbound: qty_received <= 0 throws", () => {
      expect(() =>
        shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_received: 0 }),
      ).toThrow(/qty_received must be > 0/);
    });

    it("inbound: NaN qty_received throws", () => {
      expect(() =>
        shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_received: Number.NaN }),
      ).toThrow(/qty_received must be > 0/);
    });

    it("inbound: qty_damaged > qty_received throws", () => {
      expect(() =>
        shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_received: 10, qty_damaged: 15 }),
      ).toThrow(/qty_damaged.*cannot exceed qty_received/);
    });

    it("inbound: bad receipt_date throws", () => {
      expect(() =>
        shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, receipt_date: "yesterday" }),
      ).toThrow(/receipt_date/);
    });

    it("inbound: invalid uom throws", () => {
      expect(() =>
        shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, uom: "barrels" as any }),
      ).toThrow(/uom must be one of/);
    });

    it("outbound: empty lot_numbers array throws", () => {
      expect(() =>
        shippingReceivingLogEngine.logOutbound({ ...OUTBOUND_OK, lot_numbers: [] }),
      ).toThrow(/lot_numbers must be non-empty/);
    });

    it("outbound: ship_date > 7d future throws", () => {
      const future = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
      expect(() =>
        shippingReceivingLogEngine.logOutbound({ ...OUTBOUND_OK, ship_date: future }),
      ).toThrow(/more than 7d in future/);
    });

    it("match: PO unit_price_cents fractional throws", () => {
      expect(() =>
        shippingReceivingLogEngine.threeWayMatch({
          po_line: { ...PO_LINE, unit_price_cents: 250.5 } as any,
          receipt: null, invoice_line: null,
        }),
      ).toThrow(/unit_price_cents must be non-negative integer/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("PII-free — only vendor_id / customer_id / employee_id strings", () => {
      const r = shippingReceivingLogEngine.logInbound(INBOUND_OK);
      const s = shippingReceivingLogEngine.logOutbound(OUTBOUND_OK);
      for (const j of [JSON.stringify(r), JSON.stringify(s)]) {
        expect(j).not.toMatch(/ssn/i);
        expect(j).not.toMatch(/vendor_name|customer_name|contact_email/i);
        expect(j).not.toMatch(/credit.card/i);
      }
    });

    it("cents-resolution — no fractional pennies in match output", () => {
      const receipt = shippingReceivingLogEngine.logInbound(INBOUND_OK);
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt,
        invoice_line: {
          invoice_number: "INV-Q", po_number: "PO-1001", part_number: "PN-12345",
          qty_invoiced: 100, unit_price_cents: 250, uom: "ea",
        },
      });
      expect(Number.isInteger(m.price_extension_po_cents)).toBe(true);
      expect(Number.isInteger(m.price_extension_invoice_cents!)).toBe(true);
    });

    it("variability floor — all 8 UOMs accepted", () => {
      for (const u of ["ea", "lb", "kg", "ft", "m", "in", "mm", "hr"] as const) {
        const r = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, uom: u });
        expect(r.uom).toBe(u);
      }
    });

    it("match returns are deeply frozen", () => {
      const receipt = shippingReceivingLogEngine.logInbound({ ...INBOUND_OK, qty_received: 80 });
      const m = shippingReceivingLogEngine.threeWayMatch({
        po_line: PO_LINE, receipt, invoice_line: null,
      });
      expect(Object.isFrozen(m)).toBe(true);
      expect(Object.isFrozen(m.discrepancies)).toBe(true);
      if (m.discrepancies.length > 0) {
        expect(Object.isFrozen(m.discrepancies[0])).toBe(true);
      }
    });
  });
});
