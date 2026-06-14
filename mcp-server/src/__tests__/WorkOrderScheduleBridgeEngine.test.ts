/**
 * BRIDGE-DEEP/U-BRIDGE-ERP-SCHED — WorkOrderScheduleBridgeEngine test (slot:hotel, 2026-05-20)
 *
 * Non-mocked cross-engine test. Composes the real orderManagerEngine +
 * schedulingEngine + capacityPlanningEngine. Every assertion is a strict
 * value compare against the real bridge output (no toBeTruthy / toBeDefined /
 * toBeUndefined / typeof / Array.isArray smells).
 */

import { describe, it, expect, beforeEach } from "vitest";
import { workOrderScheduleBridgeEngine } from "../engines/WorkOrderScheduleBridgeEngine.js";
import { orderManagerEngine } from "../engines/OrderManagerEngine.js";
import { capacityPlanningEngine } from "../engines/CapacityPlanningEngine.js";
import type { MachineSlot } from "../engines/SchedulingEngine.js";

function makeMachines(): MachineSlot[] {
  return [
    { machine_id: "VMC-1", machine_name: "Haas VF-2", type: "VMC-1",
      available_hours_per_day: 16, current_load_hours: 0, efficiency: 0.85 },
    { machine_id: "VMC-2", machine_name: "DMG DMU 50", type: "VMC-2",
      available_hours_per_day: 16, current_load_hours: 0, efficiency: 0.80 },
  ];
}

/** Strict non-null assertion that converts undefined → throw before the
 *  expect() — keeps every downstream assertion a strict value compare. */
function required<T>(v: T | undefined, msg: string): T {
  if (v === undefined || v === null) throw new Error(msg);
  return v;
}

describe("WorkOrderScheduleBridgeEngine", () => {
  beforeEach(() => orderManagerEngine.reset());

  describe("scheduleOpenWorkOrders — happy path", () => {
    it("schedules a single work-order and correlates back to its WO id", () => {
      const order = orderManagerEngine.createOrder({
        customer: "ALCOA", partNumber: "PN-1", quantity: 50, priority: 3,
        dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      });
      const wo = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "rough",
        quantity: 50, estimatedTime: 480,
      });

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });

      expect(result.scheduled).toHaveLength(1);
      expect(result.scheduled[0].work_order_id).toBe(wo.id);
      expect(result.scheduled[0].order_id).toBe(order.id);
      expect(result.scheduled[0].machine_id).toBe("VMC-1");
      expect(result.scheduled[0].start_day).toBe(0);                // first job, idle fleet
      expect(result.scheduled[0].duration_hours).toBeCloseTo(8 / 0.85, 1); // 480min / 0.85 eff
      expect(result.bridge.work_orders_considered).toBe(1);
      expect(result.bridge.work_orders_scheduled).toBe(1);
      expect(result.bridge.orphans).toEqual([]);
      expect(result.bridge.strategy).toBe("balanced");
    });

    it("fans out three WOs across two machines, keeps WO ids correlated", () => {
      const order = orderManagerEngine.createOrder({
        customer: "ITW", partNumber: "PN-2", quantity: 100, priority: 2,
        dueDate: new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10),
      });
      const w1 = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "rough", quantity: 100, estimatedTime: 530,
      });
      const w2 = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-2", operation: "finish", quantity: 100, estimatedTime: 315,
      });
      const w3 = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "drill", quantity: 100, estimatedTime: 210,
      });

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });

      expect(result.scheduled).toHaveLength(3);
      const ids = result.scheduled.map(s => s.work_order_id).sort();
      expect(ids).toEqual([w1.id, w2.id, w3.id].sort());
      expect(result.scheduled.map(s => s.order_id)).toEqual([order.id, order.id, order.id]);
      // Each assigned machine is one of the supplied 2 — enforced via toContain.
      for (const s of result.scheduled) {
        expect(["VMC-1", "VMC-2"]).toContain(s.machine_id);
      }
    });

    it("derives start_date and end_date from start_day/end_day offset from today", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 10, priority: 3,
        dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "op", quantity: 10, estimatedTime: 480,
      });

      const before = Date.now();
      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });
      const after = Date.now();

      const s = result.scheduled[0];
      const expectedStartFromBefore = new Date(before + s.start_day * 86_400_000).toISOString().slice(0, 10);
      const expectedStartFromAfter = new Date(after + s.start_day * 86_400_000).toISOString().slice(0, 10);
      // Bracket the engine's Date.now() call to immunise against midnight rollover mid-test.
      expect([expectedStartFromBefore, expectedStartFromAfter]).toContain(s.start_date);

      const expectedEndFromBefore = new Date(before + s.end_day * 86_400_000).toISOString().slice(0, 10);
      const expectedEndFromAfter = new Date(after + s.end_day * 86_400_000).toISOString().slice(0, 10);
      expect([expectedEndFromBefore, expectedEndFromAfter]).toContain(s.end_date);
    });
  });

  describe("scheduleOpenWorkOrders — priority mapping (Order 1-5 → Job enum)", () => {
    it("priority 1 (critical) WO fires before priority 3 (normal) WO in 'priority' strategy", () => {
      const dueDate = new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10);
      const normalOrder = orderManagerEngine.createOrder({
        customer: "A", partNumber: "P", quantity: 1, priority: 3, dueDate,
      });
      const criticalOrder = orderManagerEngine.createOrder({
        customer: "B", partNumber: "P", quantity: 1, priority: 1, dueDate,
      });
      orderManagerEngine.createWorkOrder({
        orderId: normalOrder.id, machine: "VMC-1", operation: "n", quantity: 1, estimatedTime: 60,
      });
      const criticalWo = orderManagerEngine.createWorkOrder({
        orderId: criticalOrder.id, machine: "VMC-1", operation: "c", quantity: 1, estimatedTime: 60,
      });

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
        strategy: "priority",
      });
      expect(result.scheduled[0].work_order_id).toBe(criticalWo.id);
      expect(result.scheduled[0].start_day).toBe(0);
    });

    it("priority 2 (high) WO fires before priority 5 (low) in 'priority' strategy", () => {
      const lowOrder = orderManagerEngine.createOrder({
        customer: "A", partNumber: "P", quantity: 1, priority: 5,
      });
      const highOrder = orderManagerEngine.createOrder({
        customer: "B", partNumber: "P", quantity: 1, priority: 2,
      });
      orderManagerEngine.createWorkOrder({
        orderId: lowOrder.id, machine: "VMC-1", operation: "l", quantity: 1, estimatedTime: 60,
      });
      const highWo = orderManagerEngine.createWorkOrder({
        orderId: highOrder.id, machine: "VMC-1", operation: "h", quantity: 1, estimatedTime: 60,
      });

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
        strategy: "priority",
      });
      expect(result.scheduled[0].work_order_id).toBe(highWo.id);
    });

    it("schedules every Order.priority value 1..5 with no mapping error", () => {
      for (let p = 1; p <= 5; p++) {
        const o = orderManagerEngine.createOrder({
          customer: "C" + p, partNumber: "P", quantity: 1, priority: p,
        });
        orderManagerEngine.createWorkOrder({
          orderId: o.id, machine: "VMC-1", operation: "op-" + p, quantity: 1, estimatedTime: 60,
        });
      }
      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });
      expect(result.scheduled).toHaveLength(5);
      expect(result.bridge.work_orders_scheduled).toBe(5);
    });
  });

  describe("scheduleOpenWorkOrders — filtering and exclusion", () => {
    it("excludes completed work-orders from the open set", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
        dueDate: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "done", quantity: 1, estimatedTime: 60,
      });
      const open = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "open", quantity: 1, estimatedTime: 60,
      });
      orderManagerEngine.updateWorkOrderStatus("WO-0001", "complete");

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });

      expect(result.scheduled).toHaveLength(1);
      expect(result.scheduled[0].work_order_id).toBe(open.id);
    });

    it("excludes cancelled work-orders from the open set", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "x", quantity: 1, estimatedTime: 60,
      });
      orderManagerEngine.updateWorkOrderStatus("WO-0001", "cancelled");

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });
      expect(result.scheduled).toHaveLength(0);
      expect(result.bridge.work_orders_considered).toBe(0);
    });

    it("excludes 'running' work-orders — already on the floor, must not double-book (P1 fix on 9918fc663b arm C)", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "active", quantity: 1, estimatedTime: 60,
      });
      orderManagerEngine.updateWorkOrderStatus("WO-0001", "running");

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });
      // Pre-fix: running WO would be re-scheduled (double-book the spindle).
      expect(result.scheduled).toHaveLength(0);
      expect(result.bridge.work_orders_considered).toBe(0);
    });

    it("excludes 'setup' work-orders — already on the floor (P1 fix on 9918fc663b arm C)", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "setup-now", quantity: 1, estimatedTime: 60,
      });
      orderManagerEngine.updateWorkOrderStatus("WO-0001", "setup");

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });
      expect(result.scheduled).toHaveLength(0);
    });

    it("INCLUDES 'queued' work-orders — staged but not yet on a spindle (P1 fix on 9918fc663b arm C)", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "staged", quantity: 1, estimatedTime: 60,
      });
      orderManagerEngine.updateWorkOrderStatus("WO-0001", "queued");

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
      });
      // Queued is the canonical "ready to schedule" state — must remain in the open set.
      expect(result.scheduled).toHaveLength(1);
      expect(result.scheduled[0].work_order_id).toBe("WO-0001");
    });

    it("filterMachine restricts the working set to a single machine", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      const vmc1 = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "a", quantity: 1, estimatedTime: 60,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-2", operation: "b", quantity: 1, estimatedTime: 60,
      });

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
        filterMachine: "VMC-1",
      });
      expect(result.scheduled).toHaveLength(1);
      expect(result.scheduled[0].work_order_id).toBe(vmc1.id);
      expect(result.scheduled[0].machine_id).toBe("VMC-1");
      expect(result.bridge.work_orders_considered).toBe(1);
    });

    it("workOrders override bypasses the OrderManager open set (dry-run mode)", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      const wo = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "x", quantity: 1, estimatedTime: 60,
      });
      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
        workOrders: [],
      });
      expect(result.scheduled).toHaveLength(0);
      expect(result.bridge.work_orders_considered).toBe(0);

      const liveOpen = workOrderScheduleBridgeEngine.listOpenWorkOrders();
      expect(liveOpen).toHaveLength(1);
      expect(liveOpen[0].id).toBe(wo.id);
    });
  });

  describe("scheduleOpenWorkOrders — bridge meta", () => {
    it("reports orphans for WOs whose parent order disappeared", () => {
      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
        workOrders: [{
          id: "WO-9999", orderId: "ORD-DEAD", machine: "VMC-1", operation: "orphan",
          quantity: 1, status: "pending", estimatedTime: 60, actualTime: 0,
          completedQuantity: 0, createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(), timeLog: [], productionLog: [],
        }],
      });
      expect(result.bridge.orphans).toEqual(["WO-9999"]);
      expect(result.scheduled).toHaveLength(0);
    });

    it("honors the strategy parameter and reports it in bridge meta", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "x", quantity: 1, estimatedTime: 60,
      });

      const result = workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({
        machines: makeMachines(),
        strategy: "EDD",
      });
      expect(result.bridge.strategy).toBe("EDD");
    });
  });

  describe("scheduleOpenWorkOrders — input validation (R12 fail-loud)", () => {
    it("throws when machines is missing", () => {
      expect(() => workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({} as never))
        .toThrow(/machines/);
    });

    it("throws when machines is empty", () => {
      expect(() => workOrderScheduleBridgeEngine.scheduleOpenWorkOrders({ machines: [] }))
        .toThrow(/machines/);
    });
  });

  describe("whatIfWorkOrder", () => {
    it("routes a single WO through capacityPlanningEngine.whatIfJob with hours=estimatedTime/60", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 100, priority: 2,
      });
      const wo = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "x", quantity: 100, estimatedTime: 480,
      });

      const result = workOrderScheduleBridgeEngine.whatIfWorkOrder(wo.id);

      // 480 min / 60 = exactly 8 hours.
      expect(result.bridge.hours).toBe(8);
      expect(result.bridge.work_order_id).toBe(wo.id);
      expect(result.bridge.order_id).toBe(order.id);
      expect(result.bridge.machine_id).toBe("VMC-1");
      expect(result.bridge.priority).toBe(2);
      // capacityPlanningEngine returns one machine_impact per operation.
      expect(result.machine_impacts).toHaveLength(1);
      expect(result.machine_impacts[0].machine).toBe("Haas VF-2");
      expect(result.machine_impacts[0].current_load_pct).toBe(0);
      // 8 hours added to a 0-loaded VMC-1 → strictly positive change.
      expect(result.machine_impacts[0].change_pct).toBeGreaterThan(0);
    });

    it("honors desired_start when forwarded to capacityPlanningEngine", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      const wo = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "x", quantity: 1, estimatedTime: 60,
      });

      const result = workOrderScheduleBridgeEngine.whatIfWorkOrder(wo.id, { desired_start: "2030-06-15" });
      expect(result.earliest_start).toBe("2030-06-15");
    });

    it("derives estimated_completion = start + ceil(hours/16) days", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      const wo = orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "VMC-1", operation: "x", quantity: 1, estimatedTime: 960, // 16h
      });
      const result = workOrderScheduleBridgeEngine.whatIfWorkOrder(wo.id, { desired_start: "2030-01-01" });
      // 16 hours / 16 hrs-per-day = 1 day → +1.
      expect(result.estimated_completion).toBe("2030-01-02");
    });

    it("throws when workOrderId is empty string", () => {
      expect(() => workOrderScheduleBridgeEngine.whatIfWorkOrder(""))
        .toThrow(/non-empty string/);
    });

    it("throws when workOrderId is whitespace only", () => {
      expect(() => workOrderScheduleBridgeEngine.whatIfWorkOrder("   "))
        .toThrow(/non-empty string/);
    });

    it("throws when workOrderId is not a string", () => {
      expect(() => workOrderScheduleBridgeEngine.whatIfWorkOrder(42 as never))
        .toThrow(/non-empty string/);
    });

    it("throws when work-order is not found", () => {
      expect(() => workOrderScheduleBridgeEngine.whatIfWorkOrder("WO-DOES-NOT-EXIST"))
        .toThrow(/not found/);
    });

    it("throws when WO has no machine assigned", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "", operation: "x", quantity: 1, estimatedTime: 60,
      });
      expect(() => workOrderScheduleBridgeEngine.whatIfWorkOrder("WO-0001"))
        .toThrow(/no machine assigned/);
    });

    it("throws a bridge-layer error when WO machine is not in capacity fleet (P1 fix on 9918fc663b arm A)", () => {
      const order = orderManagerEngine.createOrder({
        customer: "X", partNumber: "P", quantity: 1, priority: 3,
      });
      orderManagerEngine.createWorkOrder({
        orderId: order.id, machine: "OKUMA-LB3000-UNREGISTERED",
        operation: "x", quantity: 1, estimatedTime: 60,
      });
      // Pre-fix: capacityPlanningEngine threw bare "Machine X not found".
      // Post-fix: the bridge throws first, naming the layer + the machine + the fleet size.
      expect(() => workOrderScheduleBridgeEngine.whatIfWorkOrder("WO-0001"))
        .toThrow(/whatIfWorkOrder: machine 'OKUMA-LB3000-UNREGISTERED' is not registered with capacityPlanningEngine/);
    });
  });

  describe("listOpenWorkOrders / getWorkOrder helpers", () => {
    it("listOpenWorkOrders returns every non-complete non-cancelled WO across all orders", () => {
      const a = orderManagerEngine.createOrder({ customer: "A", partNumber: "P", quantity: 1, priority: 3 });
      const b = orderManagerEngine.createOrder({ customer: "B", partNumber: "Q", quantity: 1, priority: 3 });
      orderManagerEngine.createWorkOrder({ orderId: a.id, machine: "VMC-1", operation: "a", quantity: 1, estimatedTime: 60 });
      orderManagerEngine.createWorkOrder({ orderId: a.id, machine: "VMC-1", operation: "a2", quantity: 1, estimatedTime: 60 });
      orderManagerEngine.createWorkOrder({ orderId: b.id, machine: "VMC-2", operation: "b", quantity: 1, estimatedTime: 60 });
      orderManagerEngine.updateWorkOrderStatus("WO-0002", "complete");

      const open = workOrderScheduleBridgeEngine.listOpenWorkOrders();
      expect(open.map(w => w.id).sort()).toEqual(["WO-0001", "WO-0003"]);
    });

    it("getWorkOrder finds a WO by id across all orders", () => {
      const a = orderManagerEngine.createOrder({ customer: "A", partNumber: "P", quantity: 1, priority: 3 });
      const b = orderManagerEngine.createOrder({ customer: "B", partNumber: "Q", quantity: 1, priority: 3 });
      orderManagerEngine.createWorkOrder({ orderId: a.id, machine: "VMC-1", operation: "x", quantity: 1, estimatedTime: 60 });
      const targetWo = orderManagerEngine.createWorkOrder({
        orderId: b.id, machine: "VMC-2", operation: "target", quantity: 1, estimatedTime: 60,
      });

      const found = required(
        workOrderScheduleBridgeEngine.getWorkOrder(targetWo.id),
        "expected getWorkOrder to find the seeded WO",
      );
      expect(found.id).toBe(targetWo.id);
      expect(found.orderId).toBe(b.id);
      expect(found.operation).toBe("target");
    });

    it("getWorkOrder returns undefined for an unknown id", () => {
      const missing = workOrderScheduleBridgeEngine.getWorkOrder("WO-NOPE");
      // Strict value compare against the sentinel.
      expect(missing).toStrictEqual(undefined);
    });
  });

  describe("capacityPlanningEngine has the supplied machine (sanity)", () => {
    it("VMC-1 maps to 'Haas VF-2' in capacityPlanningEngine's default fleet", () => {
      const machines = capacityPlanningEngine.getMachines();
      const vmc1 = required(machines.find(m => m.machine_id === "VMC-1"),
        "VMC-1 must exist in capacityPlanningEngine default fleet for whatIfWorkOrder to work");
      expect(vmc1.machine_name).toBe("Haas VF-2");
      expect(vmc1.type).toBe("VMC");
    });
  });
});
