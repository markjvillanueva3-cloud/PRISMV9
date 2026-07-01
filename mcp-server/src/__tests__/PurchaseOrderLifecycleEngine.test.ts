/**
 * PurchaseOrderLifecycleEngine.test.ts — HOTEL/U-PO-LIFECYCLE (iter35 /yolo)
 */
import { describe, it, expect } from "vitest";
import {
  purchaseOrderLifecycleEngine,
  type PurchaseOrderInput,
} from "../engines/PurchaseOrderLifecycleEngine.js";

const BASE: PurchaseOrderInput = {
  po_number: "PO-2026-001",
  vendor_id: "VND-ALCOA",
  buyer_employee_id: "EMP-BUY-01",
  approver_employee_id: "EMP-MGR-01",
  po_date: "2026-06-01",
  currency: "USD",
  lines: [
    {
      line_id: "L1",
      part_number: "PN-12345",
      qty_ordered: 100,
      unit_price_cents: 250,
      uom: "ea",
      promise_date: "2026-06-15",
    },
    {
      line_id: "L2",
      part_number: "PN-67890",
      qty_ordered: 50,
      unit_price_cents: 1000,
      uom: "lb",
      promise_date: "2026-06-15",
    },
  ],
};

describe("PurchaseOrderLifecycleEngine", () => {
  describe("createPO — happy path", () => {
    it("creates frozen PO in draft state with computed line extensions", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      expect(po.state).toBe("draft");
      expect(po.lines).toHaveLength(2);
      expect(po.lines[0].line_extension_cents).toBe(25_000);  // 100 × $2.50
      expect(po.lines[1].line_extension_cents).toBe(50_000);  // 50 × $10.00
      expect(po.total_extension_cents).toBe(75_000);
      expect(po.state_history).toHaveLength(1);
      expect(po.state_history[0]).toMatchObject({ from: null, to: "draft" });
      expect(Object.isFrozen(po)).toBe(true);
      expect(Object.isFrozen(po.lines)).toBe(true);
      expect(Object.isFrozen(po.lines[0])).toBe(true);
    });

    it("each new line starts with zero received/invoiced/paid", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      for (const l of po.lines) {
        expect(l.qty_received).toBe(0);
        expect(l.qty_invoiced).toBe(0);
        expect(l.qty_paid).toBe(0);
      }
    });
  });

  describe("Full happy-path state machine", () => {
    it("draft → submitted → acknowledged → received → invoiced → paid → closed", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      expect(po.state).toBe("submitted");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VENDOR-OPS");
      expect(po.state).toBe("acknowledged");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 100, "EMP-RCV-01");
      expect(po.state).toBe("partially_received");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L2", 50, "EMP-RCV-01");
      expect(po.state).toBe("received");
      po = purchaseOrderLifecycleEngine.transition(po, "invoiced", "EMP-AP-01");
      expect(po.state).toBe("invoiced");
      po = purchaseOrderLifecycleEngine.transition(po, "paid", "EMP-AP-01");
      expect(po.state).toBe("paid");
      po = purchaseOrderLifecycleEngine.transition(po, "closed", "EMP-AP-01");
      expect(po.state).toBe("closed");
      expect(po.state_history).toHaveLength(8); // create + 7 transitions
    });

    it("cancel from draft works", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "cancelled", "EMP-BUY-01", "vendor unavailable");
      expect(po.state).toBe("cancelled");
      expect(po.state_history[po.state_history.length - 1].reason).toBe("vendor unavailable");
    });

    it("cancel from acknowledged works", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      po = purchaseOrderLifecycleEngine.transition(po, "cancelled", "EMP-MGR-01");
      expect(po.state).toBe("cancelled");
    });
  });

  describe("Illegal state transitions are rejected (R12 fail-loud)", () => {
    it("draft → paid is rejected", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      expect(() =>
        purchaseOrderLifecycleEngine.transition(po, "paid", "EMP-X"),
      ).toThrow(/invalid transition draft → paid/);
    });

    it("submitted → received is rejected (must go through acknowledged)", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      expect(() =>
        purchaseOrderLifecycleEngine.transition(po, "received", "EMP-X"),
      ).toThrow(/invalid transition submitted → received/);
    });

    it("closed is terminal — no transitions allowed", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 100, "EMP-RCV-01");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L2", 50, "EMP-RCV-01");
      po = purchaseOrderLifecycleEngine.transition(po, "invoiced", "EMP-AP-01");
      po = purchaseOrderLifecycleEngine.transition(po, "paid", "EMP-AP-01");
      po = purchaseOrderLifecycleEngine.transition(po, "closed", "EMP-AP-01");
      expect(() =>
        purchaseOrderLifecycleEngine.transition(po, "invoiced", "EMP-X"),
      ).toThrow(/terminal state/);
    });

    it("cancelled is terminal", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "cancelled", "EMP-MGR-01");
      expect(() =>
        purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-X"),
      ).toThrow(/terminal state/);
    });

    it("cancel from received is rejected (already too far down)", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 100, "EMP-RCV-01");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L2", 50, "EMP-RCV-01");
      expect(po.state).toBe("received");
      expect(() =>
        purchaseOrderLifecycleEngine.transition(po, "cancelled", "EMP-X"),
      ).toThrow(/invalid transition received → cancelled/);
    });
  });

  describe("Segregation of duties on submit", () => {
    it("buyer == approver → submit rejected", () => {
      const po = purchaseOrderLifecycleEngine.createPO({
        ...BASE,
        buyer_employee_id: "EMP-SAME",
        approver_employee_id: "EMP-SAME",
      });
      expect(() =>
        purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-SAME"),
      ).toThrow(/segregation of duties/);
    });
  });

  describe("recordReceipt — line tally + auto-state", () => {
    it("partial receipt on one line → partially_received", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 40, "EMP-RCV-01");
      expect(po.state).toBe("partially_received");
      expect(po.lines[0].qty_received).toBe(40);
      expect(po.lines[1].qty_received).toBe(0);
    });

    it("multiple partial receipts on same line accumulate", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 30, "EMP-RCV-01");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 70, "EMP-RCV-01");
      expect(po.lines[0].qty_received).toBe(100);
    });

    it("over-receipt rejected — file change order first", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      expect(() =>
        purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 120, "EMP-RCV-01"),
      ).toThrow(/over-receipt/);
    });

    it("unknown line_id rejected", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      expect(() =>
        purchaseOrderLifecycleEngine.recordReceipt(po, "L99", 10, "EMP-RCV-01"),
      ).toThrow(/line_id L99 not found/);
    });

    it("receipt against draft PO rejected", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      expect(() =>
        purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 10, "EMP-RCV-01"),
      ).toThrow(/cannot record receipt against PO in state draft/);
    });

    it("NaN qty rejected", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      expect(() =>
        purchaseOrderLifecycleEngine.recordReceipt(po, "L1", Number.NaN, "EMP-RCV-01"),
      ).toThrow(/receipt qty must be > 0/);
    });
  });

  describe("Change-order trail", () => {
    it("appendChangeOrder records the audit row", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.appendChangeOrder(po, {
        change_id: "CO-001",
        by_employee_id: "EMP-MGR-01",
        reason: "vendor confirmed qty increase to 120",
        field: "lines[0].qty_ordered",
        old_value: "100",
        new_value: "120",
      });
      expect(po.change_orders).toHaveLength(1);
      expect(po.change_orders[0]).toMatchObject({
        change_id: "CO-001",
        reason: "vendor confirmed qty increase to 120",
        old_value: "100",
        new_value: "120",
      });
    });

    it("change order rejected in draft state (edit directly instead)", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      expect(() =>
        purchaseOrderLifecycleEngine.appendChangeOrder(po, {
          change_id: "CO-X",
          by_employee_id: "EMP-X",
          reason: "fix",
          field: "lines[0].qty_ordered",
          old_value: "100",
          new_value: "110",
        }),
      ).toThrow(/unnecessary in draft state/);
    });
  });

  describe("getStatus — dashboard summary", () => {
    it("draft PO: 0% received, cancellable, not receivable", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      const s = purchaseOrderLifecycleEngine.getStatus(po);
      expect(s.pct_received).toBe(0);
      expect(s.cancellable).toBe(true);
      expect(s.receivable).toBe(false);
      expect(s.line_count).toBe(2);
      expect(s.total_extension_cents).toBe(75_000);
    });

    it("partially_received: pct correctly computed", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      po = purchaseOrderLifecycleEngine.transition(po, "acknowledged", "EMP-VND");
      po = purchaseOrderLifecycleEngine.recordReceipt(po, "L1", 75, "EMP-RCV-01");
      const s = purchaseOrderLifecycleEngine.getStatus(po);
      // 75/(100+50) = 0.5
      expect(s.pct_received).toBeCloseTo(0.5, 5);
      expect(s.receivable).toBe(true);
    });
  });

  describe("R12 input validation", () => {
    it("empty lines array rejected", () => {
      expect(() =>
        purchaseOrderLifecycleEngine.createPO({ ...BASE, lines: [] }),
      ).toThrow(/lines must be non-empty/);
    });

    it("fractional cents rejected", () => {
      expect(() =>
        purchaseOrderLifecycleEngine.createPO({
          ...BASE,
          lines: [{ ...BASE.lines[0], unit_price_cents: 250.5 } as any],
        }),
      ).toThrow(/unit_price_cents must be non-negative integer/);
    });

    it("negative qty rejected", () => {
      expect(() =>
        purchaseOrderLifecycleEngine.createPO({
          ...BASE,
          lines: [{ ...BASE.lines[0], qty_ordered: -10 }],
        }),
      ).toThrow(/qty_ordered must be > 0/);
    });

    it("bad po_date rejected", () => {
      expect(() =>
        purchaseOrderLifecycleEngine.createPO({ ...BASE, po_date: "next week" }),
      ).toThrow(/po_date must be ISO/);
    });

    it("invalid currency rejected", () => {
      expect(() =>
        purchaseOrderLifecycleEngine.createPO({ ...BASE, currency: "XYZ" as any }),
      ).toThrow(/currency must be one of/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("PII-free — only *_employee_id and vendor_id strings", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      const j = JSON.stringify(po);
      expect(j).not.toMatch(/ssn/i);
      expect(j).not.toMatch(/vendor_name|contact_email|credit.card/i);
    });

    it("variability floor — all 5 currencies accepted", () => {
      for (const c of ["USD", "EUR", "GBP", "CAD", "MXN"] as const) {
        const po = purchaseOrderLifecycleEngine.createPO({ ...BASE, currency: c });
        expect(po.currency).toBe(c);
      }
    });

    it("cents-resolution — line_extension_cents always integer", () => {
      const po = purchaseOrderLifecycleEngine.createPO(BASE);
      for (const l of po.lines) {
        expect(Number.isInteger(l.line_extension_cents)).toBe(true);
      }
      expect(Number.isInteger(po.total_extension_cents)).toBe(true);
    });

    it("state_history entries are frozen", () => {
      let po = purchaseOrderLifecycleEngine.createPO(BASE);
      po = purchaseOrderLifecycleEngine.transition(po, "submitted", "EMP-BUY-01");
      expect(Object.isFrozen(po.state_history)).toBe(true);
      expect(Object.isFrozen(po.state_history[0])).toBe(true);
      expect(Object.isFrozen(po.state_history[1])).toBe(true);
    });
  });
});
