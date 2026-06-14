/**
 * BRIDGE-DEEP/U-BRIDGE-ERP-QUOTE — dispatcher round-trip test (slot:hotel, 2026-05-20)
 *
 * Round-trips 2 actions through businessDispatcher's prism_business tool,
 * surfacing QuoteToOrderBridgeEngine — the generic ERP ↔ quoting bridge:
 *
 *   quote_to_order    → estimate a quote, then create an ERP order + work orders
 *   order_from_quote  → bridge an already-computed quote result into an order
 *
 * Each test invokes through the dispatcher handler, not the engine singleton —
 * verifies the action-enum entry + Zod schema (accept AND reject) + the case
 * dispatch + params.input / params.quote extraction end-to-end.
 *
 * Real-value assertions (no toBeDefined() stubs):
 *   - 2-op input → 2 work orders; estimatedTime = cycle×qty + setup
 *     (rough 5×100+30 = 530 ; finish 3×100+15 = 315 ; total 845).
 *   - rush input → order priority 1 ; standard → 3.
 *   - order_from_quote drill op: 2×100+10 = 210 min.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";
import {
  quoteEstimatorEngine,
  type QuoteEstimateInput,
} from "../engines/QuoteEstimatorEngine.js";
import { orderManagerEngine } from "../engines/OrderManagerEngine.js";

interface ToolCall {
  action: string;
  params?: Record<string, any>;
}

let handler:
  | ((args: { action: string; params?: Record<string, any> }) => Promise<any>)
  | null = null;

beforeAll(() => {
  const fakeServer = {
    tool: (
      _name: string,
      _desc: string,
      _schema: any,
      fn: (args: any) => Promise<any>,
    ) => {
      if (_name === "prism_business") handler = fn;
    },
  };
  registerBusinessDispatcher(fakeServer as any);
  if (!handler) throw new Error("businessDispatcher did not register prism_business tool");
});

// Reset OrderManager so order IDs are deterministic per test.
beforeEach(() => orderManagerEngine.reset());

async function call(c: ToolCall): Promise<{ raw: any; success: boolean; error?: string }> {
  if (!handler) throw new Error("handler not captured");
  const r = await handler(c);
  // Shape A: { content: [{ type: "text", text: "<json>" }] }
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    try {
      const parsed = JSON.parse(r.content[0].text);
      return { raw: parsed, success: !parsed?.error && parsed?.success !== false, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape B: { type: "text", text: "<json>" }
  if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    try {
      const parsed = JSON.parse(r.text);
      return { raw: parsed, success: !parsed?.error && parsed?.success !== false, error: parsed?.error };
    } catch {
      return { raw: r, success: true };
    }
  }
  // Shape C: raw { error: "..." } envelope
  if (r && typeof r === "object" && "error" in r) {
    return { raw: r, success: false, error: (r as any).error };
  }
  return { raw: r, success: true };
}

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

describe("businessDispatcher — U-BRIDGE-ERP-QUOTE (quote ↔ ERP bridge)", () => {
  describe("quote_to_order", () => {
    it("round-trips: estimates a quote and creates an ERP order", async () => {
      const res = await call({
        action: "quote_to_order",
        params: { input: makeInput(), customer: "ALCOA" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.order.id).toMatch(/^ORD-\d{4}$/);
      expect(res.raw.order.customer).toBe("ALCOA");
      expect(res.raw.order.partNumber).toBe("PN-1001");
      expect(res.raw.order.quantity).toBe(100);
      expect(res.raw.bridge.quote_id).toBe(res.raw.quote.quote_id);
    });

    it("fans out one work order per input operation with cycle×qty+setup time", async () => {
      const res = await call({
        action: "quote_to_order",
        params: { input: makeInput(), customer: "ALCOA" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.work_orders).toHaveLength(2);
      // rough: 5×100+30 = 530 ; finish: 3×100+15 = 315
      expect(res.raw.work_orders[0].estimatedTime).toBe(530);
      expect(res.raw.work_orders[1].estimatedTime).toBe(315);
      expect(res.raw.bridge.total_estimated_minutes).toBe(845);
    });

    it("derives priority 3 for a standard (non-rush) quote", async () => {
      const res = await call({
        action: "quote_to_order",
        params: { input: makeInput(), customer: "ALCOA" },
      });
      expect(res.raw.order.priority).toBe(3);
      expect(res.raw.bridge.rush).toBe(false);
    });

    it("derives priority 1 for a rush quote", async () => {
      const res = await call({
        action: "quote_to_order",
        params: { input: makeInput({ rush: true }), customer: "ALCOA" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.order.priority).toBe(1);
      expect(res.raw.bridge.rush).toBe(true);
    });

    it("confirms the order when confirm:true", async () => {
      const res = await call({
        action: "quote_to_order",
        params: { input: makeInput(), customer: "ALCOA", confirm: true },
      });
      expect(res.success).toBe(true);
      expect(res.raw.order.status).toBe("confirmed");
    });

    it("rejects quote_to_order with no customer", async () => {
      const res = await call({
        action: "quote_to_order",
        params: { input: makeInput() },
      });
      expect(res.success).toBe(false);
    });

    it("rejects quote_to_order with no input", async () => {
      const res = await call({
        action: "quote_to_order",
        params: { customer: "ALCOA" },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("order_from_quote", () => {
    it("round-trips: bridges an already-computed quote result into an order", async () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = await call({
        action: "order_from_quote",
        params: { quote, customer: "ITW", material: "aluminum_6061" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.order.customer).toBe("ITW");
      expect(res.raw.order.material).toBe("aluminum_6061");
      expect(res.raw.order.quantity).toBe(quote.quantity);
      expect(res.raw.bridge.quote_id).toBe(quote.quote_id);
    });

    it("fans out caller-supplied operations into work orders", async () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = await call({
        action: "order_from_quote",
        params: {
          quote,
          customer: "ITW",
          machine: "HAAS-VF2",
          operations: [{ name: "drill", cycle_time_min: 2, setup_time_min: 10 }],
        },
      });
      expect(res.success).toBe(true);
      expect(res.raw.work_orders).toHaveLength(1);
      // drill: 2×100+10 = 210
      expect(res.raw.work_orders[0].estimatedTime).toBe(210);
      expect(res.raw.work_orders[0].machine).toBe("HAAS-VF2");
    });

    it("creates an order with zero work orders when none are supplied", async () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = await call({
        action: "order_from_quote",
        params: { quote, customer: "ITW" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.work_orders).toHaveLength(0);
      expect(res.raw.bridge.work_order_count).toBe(0);
    });

    it("rejects order_from_quote with no customer", async () => {
      const quote = quoteEstimatorEngine.estimate(makeInput());
      const res = await call({
        action: "order_from_quote",
        params: { quote },
      });
      expect(res.success).toBe(false);
    });
  });
});
