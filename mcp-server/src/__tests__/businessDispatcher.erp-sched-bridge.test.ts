/**
 * BRIDGE-DEEP/U-BRIDGE-ERP-SCHED — dispatcher round-trip test (slot:hotel, 2026-05-20)
 *
 * Round-trips 2 actions through businessDispatcher's prism_business tool,
 * surfacing WorkOrderScheduleBridgeEngine — the generic ERP work-order ↔
 * scheduling/capacity bridge:
 *
 *   schedule_open_work_orders → schedule every open OrderManager WO onto a fleet
 *   what_if_work_order        → capacity what-if for a single WO id
 *
 * Each test invokes through the dispatcher handler, not the engine singleton —
 * verifies the action-enum entry + Zod schema (accept AND reject) + the case
 * dispatch + params.work_order_id / params.machines extraction end-to-end.
 *
 * Real-value assertions only — every check is a strict value compare.
 */

import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";
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

/** Canonical 2-machine fleet. */
function makeMachines() {
  return [
    { machine_id: "VMC-1", machine_name: "Haas VF-2", type: "VMC-1",
      available_hours_per_day: 16, current_load_hours: 0, efficiency: 0.85 },
    { machine_id: "VMC-2", machine_name: "DMG DMU 50", type: "VMC-2",
      available_hours_per_day: 16, current_load_hours: 0, efficiency: 0.80 },
  ];
}

function seedOneWO(opts: { priority?: number; estimatedMin?: number; machine?: string } = {}) {
  const order = orderManagerEngine.createOrder({
    customer: "ALCOA", partNumber: "PN-1", quantity: 50,
    priority: opts.priority ?? 3,
    dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  });
  const wo = orderManagerEngine.createWorkOrder({
    orderId: order.id,
    machine: opts.machine ?? "VMC-1",
    operation: "rough",
    quantity: 50,
    estimatedTime: opts.estimatedMin ?? 480,
  });
  return { order, wo };
}

describe("businessDispatcher — U-BRIDGE-ERP-SCHED (WO ↔ scheduling/capacity bridge)", () => {
  describe("schedule_open_work_orders", () => {
    it("round-trips: schedules a single seeded work-order", async () => {
      const { order, wo } = seedOneWO();
      const res = await call({
        action: "schedule_open_work_orders",
        params: { machines: makeMachines() },
      });
      expect(res.success).toBe(true);
      expect(res.raw.scheduled).toHaveLength(1);
      expect(res.raw.scheduled[0].work_order_id).toBe(wo.id);
      expect(res.raw.scheduled[0].order_id).toBe(order.id);
      expect(res.raw.scheduled[0].machine_id).toBe("VMC-1");
      expect(res.raw.bridge.work_orders_considered).toBe(1);
      expect(res.raw.bridge.work_orders_scheduled).toBe(1);
      expect(res.raw.bridge.orphans).toEqual([]);
      expect(res.raw.bridge.strategy).toBe("balanced");
    });

    it("honors strategy override via params", async () => {
      seedOneWO();
      const res = await call({
        action: "schedule_open_work_orders",
        params: { machines: makeMachines(), strategy: "EDD" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.bridge.strategy).toBe("EDD");
    });

    it("honors filterMachine override via params", async () => {
      seedOneWO({ machine: "VMC-1" });
      seedOneWO({ machine: "VMC-2" });
      const res = await call({
        action: "schedule_open_work_orders",
        params: { machines: makeMachines(), filterMachine: "VMC-2" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.scheduled).toHaveLength(1);
      expect(res.raw.scheduled[0].machine_id).toBe("VMC-2");
      expect(res.raw.bridge.work_orders_considered).toBe(1);
    });

    it("rejects schedule_open_work_orders with no machines", async () => {
      const res = await call({
        action: "schedule_open_work_orders",
        params: {},
      });
      expect(res.success).toBe(false);
    });

    it("rejects schedule_open_work_orders with empty machines array", async () => {
      const res = await call({
        action: "schedule_open_work_orders",
        params: { machines: [] },
      });
      expect(res.success).toBe(false);
    });

    it("rejects schedule_open_work_orders with bad strategy enum", async () => {
      const res = await call({
        action: "schedule_open_work_orders",
        params: { machines: makeMachines(), strategy: "NOT_A_STRATEGY" },
      });
      expect(res.success).toBe(false);
    });
  });

  describe("what_if_work_order", () => {
    it("round-trips: surfaces 8h impact for a 480-min WO on VMC-1", async () => {
      const { wo } = seedOneWO({ estimatedMin: 480, priority: 2 });
      const res = await call({
        action: "what_if_work_order",
        params: { work_order_id: wo.id },
      });
      expect(res.success).toBe(true);
      expect(res.raw.bridge.hours).toBe(8);
      expect(res.raw.bridge.work_order_id).toBe(wo.id);
      expect(res.raw.bridge.machine_id).toBe("VMC-1");
      expect(res.raw.bridge.priority).toBe(2);
      expect(res.raw.machine_impacts).toHaveLength(1);
      expect(res.raw.machine_impacts[0].machine).toBe("Haas VF-2");
    });

    it("honors desired_start via dispatcher params", async () => {
      const { wo } = seedOneWO();
      const res = await call({
        action: "what_if_work_order",
        params: { work_order_id: wo.id, desired_start: "2030-06-15" },
      });
      expect(res.success).toBe(true);
      expect(res.raw.earliest_start).toBe("2030-06-15");
    });

    it("rejects what_if_work_order with no work_order_id", async () => {
      const res = await call({
        action: "what_if_work_order",
        params: {},
      });
      expect(res.success).toBe(false);
    });

    it("rejects what_if_work_order with a non-string work_order_id", async () => {
      const res = await call({
        action: "what_if_work_order",
        params: { work_order_id: 42 },
      });
      expect(res.success).toBe(false);
    });

    it("surfaces engine error for unknown work-order id", async () => {
      const res = await call({
        action: "what_if_work_order",
        params: { work_order_id: "WO-DOES-NOT-EXIST" },
      });
      // Either Zod accepted the string and the engine threw, OR the dispatcher's
      // error envelope captured the throw — either way success:false.
      expect(res.success).toBe(false);
    });
  });
});
