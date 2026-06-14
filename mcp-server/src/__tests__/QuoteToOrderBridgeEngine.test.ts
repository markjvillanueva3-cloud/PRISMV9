/**
 * Tests for QuoteToOrderBridgeEngine — the ERP ↔ quoting bridge
 * (U-BRIDGE-ERP-QUOTE).
 *
 * Verifies that a quote estimate genuinely maps into an ERP order:
 *  - field mapping (customer / part number / quantity / material)
 *  - lead-time → due-date derivation
 *  - rush → priority derivation
 *  - per-operation work-order fan-out with cycle×qty+setup time math
 *  - the bridge composes the REAL QuoteEstimatorEngine + OrderManagerEngine
 *    (no mocks — this is a non-mocked cross-engine contract test, per R9).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { quoteToOrderBridgeEngine } from "../engines/QuoteToOrderBridgeEngine.js";
import {
  quoteEstimatorEngine,
  type QuoteEstimateInput,
} from "../engines/QuoteEstimatorEngine.js";
import { orderManagerEngine } from "../engines/OrderManagerEngine.js";

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Canonical 2-operation mill quote input. */
function makeInput(overrides: Partial<QuoteEstimateInput> = {}): QuoteEstimateInput {
  return {
    quantity: 100,
    material: "aluminum_6061",
    complexity: "medium",
    part_name: "BRACKET-A",
    part_number: "PN-1001",
    machine_type: "cnc_mill_3axis",
    operations: [
      { name: "rough", type: "milling", cycle_time_min: 5, setup_time_min: 30 },
      { name: "finish", type: "milling", cycle_time_min: 3, setup_time_min: 15 },
    ],
    ...overrides,
  };
}

/**
 * Replicates the engine's lead-time → due-date arithmetic at an EXPLICIT
 * instant. The engine's `isoDatePlusDays` calls `Date.now()` internally; tests
 * bracket the engine call with before/after timestamps and accept either
 * candidate date, so a UTC-midnight rollover mid-call cannot flake the suite.
 */
function dueDateAt(nowMs: number, leadDays: number): string {
  return new Date(nowMs + Math.max(0, Math.ceil(leadDays)) * 86_400_000)
    .toISOString()
    .slice(0, 10);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// ── Tests ────────────────────────────────────────────────────────────────────

describe("QuoteToOrderBridgeEngine", () => {
  // Reset OrderManager so order IDs are deterministic per test.
  beforeEach(() => orderManagerEngine.reset());

  describe("estimateAndCreateOrder", () => {
    it("creates an order carrying the customer from opts", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.order.customer).toBe("ALCOA");
      expect(res.order.id).toMatch(/^ORD-\d{4}$/);
      expect(res.bridge.customer).toBe("ALCOA");
    });

    it("uses opts.part_number override for the order part number", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
        part_number: "OVERRIDE-99",
      });
      expect(res.order.partNumber).toBe("OVERRIDE-99");
    });

    it("falls back to input.part_number when no override is given", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.order.partNumber).toBe("PN-1001");
    });

    it("falls back to part_name when part_number is absent", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(
        makeInput({ part_number: undefined }),
        { customer: "ALCOA" },
      );
      expect(res.order.partNumber).toBe("BRACKET-A");
    });

    it("maps quote quantity and input material onto the order", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.order.quantity).toBe(100);
      expect(res.order.quantity).toBe(res.quote.quantity);
      expect(res.order.material).toBe("aluminum_6061");
    });

    it("leaves the order in draft status by default", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.order.status).toBe("draft");
    });

    it("transitions the order to confirmed when confirm:true", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
        confirm: true,
      });
      expect(res.order.status).toBe("confirmed");
      // The persisted order must also reflect the confirmed status.
      expect(orderManagerEngine.getOrder(res.order.id)?.status).toBe("confirmed");
    });

    it("fans out one work order per input operation", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.work_orders).toHaveLength(2);
      expect(res.bridge.work_order_count).toBe(2);
      expect(res.work_orders.map((w) => w.operation)).toEqual(["rough", "finish"]);
    });

    it("computes work-order estimatedTime as cycle×qty + setup", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      // rough: 5 min/part × 100 + 30 setup = 530 ; finish: 3 × 100 + 15 = 315
      expect(res.work_orders[0].estimatedTime).toBe(530);
      expect(res.work_orders[1].estimatedTime).toBe(315);
      expect(res.bridge.total_estimated_minutes).toBe(845);
    });

    it("assigns input.machine_type to every work order", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.work_orders.map((w) => w.machine)).toEqual([
        "cnc_mill_3axis",
        "cnc_mill_3axis",
      ]);
    });

    it("links work orders to the parent order and persists them", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.work_orders.map((w) => w.orderId)).toEqual([
        res.order.id,
        res.order.id,
      ]);
      expect(orderManagerEngine.getWorkOrders(res.order.id)).toHaveLength(2);
      expect(orderManagerEngine.getOrder(res.order.id)?.workOrders).toHaveLength(2);
    });

    it("skips work orders when create_work_orders:false", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
        create_work_orders: false,
      });
      expect(res.work_orders).toHaveLength(0);
      expect(res.bridge.total_estimated_minutes).toBe(0);
    });

    it("produces no work orders when the input has no operations", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(
        makeInput({ operations: [] }),
        { customer: "ALCOA" },
      );
      expect(res.work_orders).toHaveLength(0);
    });

    it("derives priority 3 for a standard (non-rush) quote", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.order.priority).toBe(3);
      expect(res.bridge.rush).toBe(false);
    });

    it("derives priority 1 for a rush quote", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(
        makeInput({ rush: true }),
        { customer: "ALCOA" },
      );
      expect(res.order.priority).toBe(1);
      expect(res.bridge.rush).toBe(true);
    });

    it("honors an explicit priority override", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
        priority: 5,
      });
      expect(res.order.priority).toBe(5);
      expect(res.bridge.derived_priority).toBe(5);
    });

    it("derives the due date from the quote's standard lead time", () => {
      const before = Date.now();
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      const after = Date.now();
      const leadDays = res.quote.lead_time.total_standard_days;
      // Accept either bracket endpoint — guards a midnight rollover mid-call.
      const candidates = [dueDateAt(before, leadDays), dueDateAt(after, leadDays)];
      expect(candidates).toContain(res.bridge.derived_due_date);
      expect(res.order.dueDate).toBe(res.bridge.derived_due_date);
      expect(res.bridge.derived_due_date).toMatch(ISO_DATE);
    });

    it("derives the due date from the rush lead time for a rush quote", () => {
      const before = Date.now();
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(
        makeInput({ rush: true }),
        { customer: "ALCOA" },
      );
      const after = Date.now();
      const leadDays = res.quote.lead_time.total_rush_days;
      expect([
        dueDateAt(before, leadDays),
        dueDateAt(after, leadDays),
      ]).toContain(res.order.dueDate);
    });

    it("honors an explicit due_date override", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
        due_date: "2026-12-31",
      });
      expect(res.order.dueDate).toBe("2026-12-31");
      expect(res.bridge.derived_due_date).toBe("2026-12-31");
    });

    it("writes a trace note referencing the source quote", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.order.notes).toContain(res.quote.quote_id);
      // Pin the full trace format — quote id, both prices, confidence %.
      expect(res.order.notes).toMatch(
        /^Bridged from quote .+ — unit \$[\d.]+, total \$[\d.]+, \d+% confidence$/,
      );
    });

    it("appends caller notes after the auto-generated trace note", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
        notes: "PO#4471",
      });
      expect(res.order.notes).toContain(res.quote.quote_id);
      expect(res.order.notes).toContain("PO#4471");
      expect(res.order.notes!.indexOf("Bridged")).toBeLessThan(
        res.order.notes!.indexOf("PO#4471"),
      );
    });

    it("returns the computed quote and mirrors its pricing in bridge meta", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
        customer: "ALCOA",
      });
      expect(res.bridge.quote_id).toBe(res.quote.quote_id);
      expect(res.bridge.quote_total_price).toBe(res.quote.pricing.total_price);
      expect(res.bridge.quote_unit_price).toBe(res.quote.pricing.unit_price);
    });
  });

  describe("createOrderFromQuote", () => {
    it("bridges an already-computed quote result into an order", () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = quoteToOrderBridgeEngine.createOrderFromQuote(quote, {
        customer: "ITW",
        material: "aluminum_6061",
      });
      expect(res.order.customer).toBe("ITW");
      expect(res.order.quantity).toBe(quote.quantity);
      expect(res.order.material).toBe("aluminum_6061");
      expect(res.bridge.quote_id).toBe(quote.quote_id);
    });

    it("takes the part number from the quote result's part_name", () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = quoteToOrderBridgeEngine.createOrderFromQuote(quote, {
        customer: "ITW",
      });
      expect(res.order.partNumber).toBe(quote.part_name);
    });

    it("fans out work orders from the caller-supplied operations", () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = quoteToOrderBridgeEngine.createOrderFromQuote(quote, {
        customer: "ITW",
        machine: "HAAS-VF2",
        operations: [
          { name: "drill", cycle_time_min: 2, setup_time_min: 10 },
          { name: "tap", machine: "HAAS-VF4", cycle_time_min: 1, setup_time_min: 8 },
        ],
      });
      expect(res.work_orders).toHaveLength(2);
      // drill: 2 × 100 + 10 = 210 ; tap: 1 × 100 + 8 = 108
      expect(res.work_orders[0].estimatedTime).toBe(210);
      expect(res.work_orders[1].estimatedTime).toBe(108);
      // op without machine → default; op with machine → its own
      expect(res.work_orders[0].machine).toBe("HAAS-VF2");
      expect(res.work_orders[1].machine).toBe("HAAS-VF4");
    });

    it("produces no work orders when no operations are supplied", () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = quoteToOrderBridgeEngine.createOrderFromQuote(quote, {
        customer: "ITW",
      });
      expect(res.work_orders).toHaveLength(0);
      expect(res.bridge.work_order_count).toBe(0);
    });

    it("infers rush from the quote result's rush premium", () => {
      const rushQuote = quoteEstimatorEngine.estimate(makeInput({ rush: true }));
      const res = quoteToOrderBridgeEngine.createOrderFromQuote(rushQuote, {
        customer: "ITW",
      });
      expect(res.bridge.rush).toBe(true);
      expect(res.order.priority).toBe(1);
    });
  });

  describe("edge cases & validation", () => {
    it("throws when customer is missing", () => {
      expect(() =>
        quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {} as never),
      ).toThrow(/customer/i);
    });

    it("throws when customer is empty / whitespace", () => {
      expect(() =>
        quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
          customer: "   ",
        }),
      ).toThrow(/customer/i);
    });

    it("throws when customer is not a string", () => {
      expect(() =>
        quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {
          customer: 123 as never,
        }),
      ).toThrow(/customer/i);
    });

    it("does not create an order when validation fails", () => {
      expect(() =>
        quoteToOrderBridgeEngine.estimateAndCreateOrder(makeInput(), {} as never),
      ).toThrow();
      expect(orderManagerEngine.metrics().totalOrders).toBe(0);
    });

    it("treats omitted cycle/setup times as zero", () => {
      const res = quoteToOrderBridgeEngine.estimateAndCreateOrder(
        makeInput({ operations: [{ name: "deburr", type: "manual" }] }),
        { customer: "ALCOA" },
      );
      expect(res.work_orders[0].estimatedTime).toBe(0);
      expect(res.bridge.total_estimated_minutes).toBe(0);
    });
  });
});
