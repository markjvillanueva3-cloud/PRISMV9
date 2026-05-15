/**
 * businessDispatcher.pm-wire.test.ts
 *
 * OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-PM —
 * round-trip wire tests for the 9 new `pm_*` actions wrapping
 * PreventiveMaintenanceEngine through prism_business.
 *
 * Engine math verified against the source:
 *   - completeWorkOrder cost = labor_hours × $75 + Σ(qty × unit_cost)   (engine lines 153-154, LABOR_RATE)
 *   - isScheduleDue (hours)  : (current - last_completed) ≥ interval    (line 110)
 *   - isScheduleDue (calendar): last_completed_at + days × 86400000 ≤ now (line 104)
 *   - generateWorkOrder rejects when an open WO exists for the schedule (lines 118-121)
 */

import { describe, it, expect, beforeAll } from "vitest";
import { registerBusinessDispatcher } from "../tools/dispatchers/businessDispatcher.js";

type Handler = (args: { action: string; params?: Record<string, any> }) => Promise<any>;

function createServer(): { handler: Promise<Handler> } {
  let resolve!: (h: Handler) => void;
  const handler = new Promise<Handler>((r) => (resolve = r));
  const fakeServer = {
    tool(_name: string, _desc: string, _schema: any, fn: Handler) {
      resolve(fn);
    },
  };
  registerBusinessDispatcher(fakeServer);
  return { handler };
}

async function call(
  handler: Handler,
  action: string,
  params: Record<string, any> = {},
): Promise<any> {
  const r = await handler({ action, params });
  // businessDispatcher returns Shape B: { type: "text", text: "<json>" }  (slimResponse output direct)
  // qualityDispatcher etc return Shape A: { content: [{ type: "text", text: "<json>" }] }
  let text: string | undefined;
  if (r && typeof r === "object" && Array.isArray(r.content) && r.content[0]?.text) {
    text = r.content[0].text;
  } else if (r && typeof r === "object" && r.type === "text" && typeof r.text === "string") {
    text = r.text;
  }
  if (text) {
    try { return JSON.parse(text); } catch { /* fall through */ }
  }
  return r;
}

const PREFIX = `t10-${Date.now()}`;
let nextSeq = 0;
function uniqMachine(): string {
  return `${PREFIX}-m-${nextSeq++}`;
}

describe("prism_business pm_* wire (OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-PM)", () => {
  let handler: Handler;

  beforeAll(async () => {
    handler = await createServer().handler;
  });

  describe("pm_schedule_create", () => {
    it("calendar-trigger schedule round-trips with id prefix 'PM-' and persists fields", async () => {
      const machine = uniqMachine();
      const r = await call(handler, "pm_schedule_create", {
        machine_id: machine,
        machine_name: "Haas VF-2",
        task_name: "Oil change",
        trigger_type: "calendar",
        interval_days: 90,
        estimated_duration_min: 45,
        instructions: "Drain pan, replace filter, refill to mark.",
      });
      expect(r.schedule.id).toMatch(/^PM-\d+-[a-z0-9]+$/);
      expect(r.schedule.machine_id).toBe(machine);
      expect(r.schedule.machine_name).toBe("Haas VF-2");
      expect(r.schedule.trigger_type).toBe("calendar");
      expect(r.schedule.interval_days).toBe(90);
      expect(r.schedule.task_name).toBe("Oil change");
      expect(r.schedule.estimated_duration_min).toBe(45);
      expect(r.schedule.instructions).toBe("Drain pan, replace filter, refill to mark.");
      expect(r.schedule.parts_list).toEqual([]);
    });

    it("hours-trigger schedule with parts_list preserves the parts array verbatim", async () => {
      const r = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(),
        machine_name: "Mazak",
        task_name: "Spindle bearing inspection",
        trigger_type: "hours",
        interval_hours: 2000,
        parts_list: [
          { part_name: "Grease cartridge", part_number: "GR-NLGI2", quantity: 1, unit_cost: 18.50 },
        ],
        estimated_duration_min: 30,
        instructions: "Inspect bearing temperature trace.",
      });
      expect(r.schedule.parts_list).toHaveLength(1);
      expect(r.schedule.parts_list[0]).toEqual({
        part_name: "Grease cartridge",
        part_number: "GR-NLGI2",
        quantity: 1,
        unit_cost: 18.5,
      });
      expect(r.schedule.interval_hours).toBe(2000);
    });

    it("calendar trigger missing interval_days → engine error 'Calendar-based schedules require interval_days'", async () => {
      const r = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(),
        machine_name: "Haas",
        task_name: "Oil change",
        trigger_type: "calendar",
        estimated_duration_min: 45,
        instructions: "x",
      });
      expect(String(r.error ?? "")).toMatch(/Calendar-based schedules require interval_days/);
    });

    it("hours trigger missing interval_hours → engine error 'Hours-based schedules require interval_hours'", async () => {
      const r = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(),
        machine_name: "Mazak",
        task_name: "Bearing check",
        trigger_type: "hours",
        estimated_duration_min: 30,
        instructions: "x",
      });
      expect(String(r.error ?? "")).toMatch(/Hours-based schedules require interval_hours/);
    });

    it("invalid trigger_type → schema rejects (Invalid params)", async () => {
      const r = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(),
        machine_name: "Haas",
        task_name: "x",
        trigger_type: "moon_phase",
        estimated_duration_min: 30,
        instructions: "x",
      });
      expect(String(r.error ?? "")).toMatch(/invalid params/i);
    });
  });

  describe("pm_schedule_list", () => {
    it("filter by machine_id only returns matching schedules", async () => {
      const machineA = uniqMachine();
      const machineB = uniqMachine();
      const createdA = await call(handler, "pm_schedule_create", {
        machine_id: machineA, machine_name: `A`, task_name: "A-check",
        trigger_type: "calendar", interval_days: 1,
        estimated_duration_min: 10, instructions: "x",
      });
      const createdB = await call(handler, "pm_schedule_create", {
        machine_id: machineB, machine_name: `B`, task_name: "B-check",
        trigger_type: "calendar", interval_days: 1,
        estimated_duration_min: 10, instructions: "x",
      });
      const r = await call(handler, "pm_schedule_list", { machine_id: machineA });
      const schedules: any[] = r.schedules ?? [];
      const ids = schedules.map(s => s.id);
      expect(ids).toContain(createdA.schedule.id);
      expect(ids).not.toContain(createdB.schedule.id);
      // Every returned schedule must be for machineA
      for (const s of schedules) {
        expect(s.machine_id).toBe(machineA);
      }
    });
  });

  describe("pm_schedule_is_due", () => {
    it("calendar schedule never completed → due (engine line 103: last_completed_at undefined → true)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Daily",
        trigger_type: "calendar", interval_days: 7,
        estimated_duration_min: 5, instructions: "x",
      });
      const r = await call(handler, "pm_schedule_is_due", { schedule_id: created.schedule.id });
      expect(r.is_due).toBe(true);
    });

    it("hours schedule never completed → due (engine line 108: last_completed_hours undefined → true)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Mazak", task_name: "Bearing",
        trigger_type: "hours", interval_hours: 500,
        estimated_duration_min: 30, instructions: "x",
      });
      const r = await call(handler, "pm_schedule_is_due", { schedule_id: created.schedule.id });
      expect(r.is_due).toBe(true);
    });

    it("hours schedule completed but current_hours missing → false (engine line 109)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Mazak", task_name: "Bearing",
        trigger_type: "hours", interval_hours: 500, last_completed_hours: 1000,
        estimated_duration_min: 30, instructions: "x",
      });
      const r = await call(handler, "pm_schedule_is_due", { schedule_id: created.schedule.id });
      expect(r.is_due).toBe(false);
    });

    it("hours schedule with elapsed=600 ≥ interval=500 → due (engine line 110)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Mazak", task_name: "Bearing",
        trigger_type: "hours", interval_hours: 500, last_completed_hours: 1000,
        estimated_duration_min: 30, instructions: "x",
      });
      const r = await call(handler, "pm_schedule_is_due", {
        schedule_id: created.schedule.id, current_hours: 1600,
      });
      expect(r.is_due).toBe(true);
    });

    it("hours schedule with elapsed=200 < interval=500 → not due (boundary)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Mazak", task_name: "Bearing",
        trigger_type: "hours", interval_hours: 500, last_completed_hours: 1000,
        estimated_duration_min: 30, instructions: "x",
      });
      const r = await call(handler, "pm_schedule_is_due", {
        schedule_id: created.schedule.id, current_hours: 1200,
      });
      expect(r.is_due).toBe(false);
    });

    it("hours schedule with elapsed exactly equal to interval → due (boundary, ≥ not >)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Mazak", task_name: "Bearing",
        trigger_type: "hours", interval_hours: 500, last_completed_hours: 1000,
        estimated_duration_min: 30, instructions: "x",
      });
      const r = await call(handler, "pm_schedule_is_due", {
        schedule_id: created.schedule.id, current_hours: 1500,
      });
      expect(r.is_due).toBe(true);
    });

    it("unknown schedule_id → 'not found' error", async () => {
      const r = await call(handler, "pm_schedule_is_due", { schedule_id: "PM-does-not-exist" });
      expect(String(r.error ?? "")).toMatch(/not found/i);
    });
  });

  describe("pm_work_order_generate", () => {
    it("generates WO with WO- prefix, status=open, inherits parts_list", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Coolant change",
        trigger_type: "calendar", interval_days: 30,
        parts_list: [{ part_name: "Coolant", part_number: "CL-100", quantity: 5, unit_cost: 12 }],
        estimated_duration_min: 60, instructions: "x",
      });
      const r = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-06-01",
      });
      expect(r.work_order.id).toMatch(/^WO-\d+-[a-z0-9]+$/);
      expect(r.work_order.status).toBe("open");
      expect(r.work_order.schedule_id).toBe(created.schedule.id);
      expect(r.work_order.machine_id).toBe(created.schedule.machine_id);
      expect(r.work_order.task_name).toBe("Coolant change");
      expect(r.work_order.scheduled_date).toBe("2026-06-01");
      expect(r.work_order.parts_list).toHaveLength(1);
      expect(r.work_order.parts_list[0].quantity).toBe(5);
      expect(r.work_order.parts_list[0].unit_cost).toBe(12);
    });

    it("second WO for same schedule while first is open → rejected with 'active work order already exists'", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Filter swap",
        trigger_type: "calendar", interval_days: 30,
        estimated_duration_min: 15, instructions: "x",
      });
      const first = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-06-01",
      });
      expect(first.work_order.status).toBe("open");
      const second = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-06-15",
      });
      expect(String(second.error ?? "")).toMatch(/active work order already exists/i);
    });

    it("unknown schedule_id → 'PM schedule not found' error", async () => {
      const r = await call(handler, "pm_work_order_generate", {
        schedule_id: "PM-not-a-real-id", scheduled_date: "2026-06-01",
      });
      expect(String(r.error ?? "")).toMatch(/PM schedule not found/i);
    });
  });

  describe("pm_work_order_complete", () => {
    it("total_cost = labor_hours×75 + Σ(qty×unit_cost) per LABOR_RATE engine line 59", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Coolant change",
        trigger_type: "calendar", interval_days: 30,
        estimated_duration_min: 60, instructions: "x",
      });
      const wo = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-06-01",
      });
      const completed = await call(handler, "pm_work_order_complete", {
        work_order_id: wo.work_order.id,
        labor_hours: 2,
        parts_used: [
          { part_name: "Coolant 5gal",  part_number: "CL-5G",  quantity: 3, unit_cost: 50 },  // 150
          { part_name: "Filter element", part_number: "F-100", quantity: 1, unit_cost: 25 }, //  25
        ],
        notes: "Complete",
      });
      // labor = 2×75 = 150 ; parts = 3×50 + 1×25 = 175 ; total = 325
      expect(completed.work_order.total_cost).toBe(325);
      expect(completed.work_order.status).toBe("complete");
      expect(completed.work_order.labor_hours).toBe(2);
      // completed_at is a parseable ISO timestamp
      expect(Number.isFinite(Date.parse(completed.work_order.completed_at))).toBe(true);
      // parts_used override is reflected in parts_list (engine line 161)
      expect(completed.work_order.parts_list).toHaveLength(2);
      expect(completed.work_order.parts_list[0].quantity).toBe(3);
      expect(completed.work_order.parts_list[1].quantity).toBe(1);
    });

    it("zero parts_used → cost is labor only: 3×75 = 225", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Inspection",
        trigger_type: "calendar", interval_days: 30,
        estimated_duration_min: 30, instructions: "x",
      });
      const wo = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-06-01",
      });
      const completed = await call(handler, "pm_work_order_complete", {
        work_order_id: wo.work_order.id, labor_hours: 3,
      });
      expect(completed.work_order.total_cost).toBe(225);
    });

    it("LABOR_RATE=75 verified by 1h labor + 0 parts → total_cost=75 exactly", async () => {
      // Independent boundary that pins the constant
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Tiny",
        trigger_type: "calendar", interval_days: 30,
        estimated_duration_min: 1, instructions: "x",
      });
      const wo = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-06-01",
      });
      const completed = await call(handler, "pm_work_order_complete", {
        work_order_id: wo.work_order.id, labor_hours: 1,
      });
      expect(completed.work_order.total_cost).toBe(75);
    });

    it("completion bumps parent schedule.last_completed_at to wo.completed_at (engine lines 167-172)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Mazak", task_name: "Calibration",
        trigger_type: "calendar", interval_days: 365,
        estimated_duration_min: 120, instructions: "x",
      });
      const wo = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-06-01",
      });
      const completed = await call(handler, "pm_work_order_complete", {
        work_order_id: wo.work_order.id, labor_hours: 1,
      });
      const schedulesAfter = await call(handler, "pm_schedule_list", { machine_id: created.schedule.machine_id });
      const updated = (schedulesAfter.schedules ?? []).find((s: any) => s.id === created.schedule.id);
      expect(updated.last_completed_at).toBe(completed.work_order.completed_at);
    });

    it("unknown work_order_id → 'Work order not found' error", async () => {
      const r = await call(handler, "pm_work_order_complete", {
        work_order_id: "WO-does-not-exist", labor_hours: 1,
      });
      expect(String(r.error ?? "")).toMatch(/Work order not found/i);
    });
  });

  describe("pm_overdue_alerts", () => {
    it("never-completed calendar schedule → days_overdue=999 (engine line 195)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Never done",
        trigger_type: "calendar", interval_days: 7,
        estimated_duration_min: 5, instructions: "x",
      });
      const r = await call(handler, "pm_overdue_alerts", {});
      const alert = (r.alerts ?? []).find((a: any) => a.schedule.id === created.schedule.id);
      expect(alert.days_overdue).toBe(999);
    });

    it("hours alert returns hours_overdue = current - last_completed - interval (engine line 198)", async () => {
      const machine = uniqMachine();
      const created = await call(handler, "pm_schedule_create", {
        machine_id: machine, machine_name: "Mazak", task_name: "Bearing",
        trigger_type: "hours", interval_hours: 500, last_completed_hours: 1000,
        estimated_duration_min: 30, instructions: "x",
      });
      const r = await call(handler, "pm_overdue_alerts", {
        current_machine_hours: { [machine]: 1750 },   // 1750 - 1000 - 500 = 250
      });
      const alert = (r.alerts ?? []).find((a: any) => a.schedule.id === created.schedule.id);
      expect(alert.hours_overdue).toBe(250);
    });
  });

  describe("pm_downtime_record", () => {
    it("auto-computes duration_min from started_at + ended_at (engine line 212: 90 min)", async () => {
      const r = await call(handler, "pm_downtime_record", {
        machine_id: uniqMachine(),
        type: "scheduled",
        started_at: "2026-05-15T10:00:00.000Z",
        ended_at:   "2026-05-15T11:30:00.000Z",   // exactly 90 minutes
      });
      expect(r.downtime.id).toMatch(/^DT-\d+-[a-z0-9]+$/);
      expect(r.downtime.duration_min).toBe(90);
      expect(r.downtime.type).toBe("scheduled");
    });

    it("60-minute downtime → duration_min=60 exactly (independent boundary)", async () => {
      const r = await call(handler, "pm_downtime_record", {
        machine_id: uniqMachine(),
        type: "unscheduled",
        started_at: "2026-05-15T08:00:00.000Z",
        ended_at:   "2026-05-15T09:00:00.000Z",
      });
      expect(r.downtime.duration_min).toBe(60);
    });

    it("open downtime (no ended_at) → duration_min absent (slimResponse strips undefined)", async () => {
      const r = await call(handler, "pm_downtime_record", {
        machine_id: uniqMachine(),
        type: "unscheduled",
        started_at: "2026-05-15T10:00:00.000Z",
        cause: "Tool crash",
      });
      expect(r.downtime.duration_min == null).toBe(true);
      expect(r.downtime.cause).toBe("Tool crash");
      expect(r.downtime.type).toBe("unscheduled");
    });

    it("invalid type enum → Invalid params (schema z.enum guard)", async () => {
      const r = await call(handler, "pm_downtime_record", {
        machine_id: uniqMachine(),
        type: "scheduled_maintenance",       // not in {scheduled, unscheduled}
        started_at: "2026-05-15T10:00:00Z",
      });
      expect(String(r.error ?? "")).toMatch(/invalid params/i);
    });
  });

  describe("pm_work_order_list", () => {
    it("returns WOs sorted ascending by scheduled_date (engine line 224 localeCompare)", async () => {
      const machine = uniqMachine();
      const createdA = await call(handler, "pm_schedule_create", {
        machine_id: machine, machine_name: "Haas", task_name: "First",
        trigger_type: "calendar", interval_days: 30,
        estimated_duration_min: 10, instructions: "x",
      });
      const wo1 = await call(handler, "pm_work_order_generate", {
        schedule_id: createdA.schedule.id, scheduled_date: "2026-09-01",
      });
      await call(handler, "pm_work_order_complete", { work_order_id: wo1.work_order.id, labor_hours: 1 });

      const createdB = await call(handler, "pm_schedule_create", {
        machine_id: machine, machine_name: "Haas", task_name: "Second",
        trigger_type: "calendar", interval_days: 60,
        estimated_duration_min: 15, instructions: "x",
      });
      const wo2 = await call(handler, "pm_work_order_generate", {
        schedule_id: createdB.schedule.id, scheduled_date: "2026-07-01",
      });
      expect(wo2.work_order.scheduled_date).toBe("2026-07-01");

      const r = await call(handler, "pm_work_order_list", { machine_id: machine });
      const wos: any[] = r.work_orders ?? [];
      expect(wos.length).toBeGreaterThanOrEqual(2);
      // 2026-07-01 comes BEFORE 2026-09-01 lexicographically
      const idx1 = wos.findIndex(w => w.scheduled_date === "2026-07-01");
      const idx2 = wos.findIndex(w => w.scheduled_date === "2026-09-01");
      expect(idx1).toBeLessThan(idx2);
      expect(idx1).toBeGreaterThanOrEqual(0);
    });

    it("filter by status=open returns only open WOs (no completed/cancelled leak)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Status filter test",
        trigger_type: "calendar", interval_days: 30,
        estimated_duration_min: 5, instructions: "x",
      });
      const made = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-08-01",
      });
      const r = await call(handler, "pm_work_order_list", { status: "open" });
      const wos: any[] = r.work_orders ?? [];
      // Our just-made WO must appear in the open list
      expect(wos.some(w => w.id === made.work_order.id)).toBe(true);
      // Every entry has status="open"
      for (const w of wos) {
        expect(w.status).toBe("open");
      }
    });

    it("invalid status enum → Invalid params", async () => {
      const r = await call(handler, "pm_work_order_list", { status: "pretending" });
      expect(String(r.error ?? "")).toMatch(/invalid params/i);
    });
  });

  describe("pm_work_order_assign", () => {
    it("assigns operator AND flips status open → in_progress (engine line 231)", async () => {
      const created = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "Haas", task_name: "Assign test",
        trigger_type: "calendar", interval_days: 30,
        estimated_duration_min: 5, instructions: "x",
      });
      const wo = await call(handler, "pm_work_order_generate", {
        schedule_id: created.schedule.id, scheduled_date: "2026-08-01",
      });
      // pre-assignment status check (sanity)
      expect(wo.work_order.status).toBe("open");
      const r = await call(handler, "pm_work_order_assign", {
        work_order_id: wo.work_order.id,
        assigned_to: "avery.stone",
      });
      expect(r.work_order.assigned_to).toBe("avery.stone");
      expect(r.work_order.status).toBe("in_progress");
      expect(r.work_order.id).toBe(wo.work_order.id);
    });

    it("unknown work_order_id → 'Work order not found' error", async () => {
      const r = await call(handler, "pm_work_order_assign", {
        work_order_id: "WO-nope", assigned_to: "avery.stone",
      });
      expect(String(r.error ?? "")).toMatch(/Work order not found/i);
    });
  });

  // ---------------------------------------------------------------------
  // Dispatcher wiring round-trip — independent E2E per action via documented happy path
  // ---------------------------------------------------------------------

  describe("dispatcher wiring round-trip (each action returns its documented payload key)", () => {
    it("pm_schedule_create returns r.schedule and is reachable through prism_business", async () => {
      const r = await call(handler, "pm_schedule_create", {
        machine_id: uniqMachine(), machine_name: "x", task_name: "x",
        trigger_type: "calendar", interval_days: 1,
        estimated_duration_min: 1, instructions: "x",
      });
      expect(r.schedule.id).toMatch(/^PM-/);
    });

    it("pm_schedule_list returns r.schedules array", async () => {
      const r = await call(handler, "pm_schedule_list", {});
      expect(Array.isArray(r.schedules)).toBe(true);
    });

    it("pm_overdue_alerts returns r.alerts array", async () => {
      const r = await call(handler, "pm_overdue_alerts", {});
      expect(Array.isArray(r.alerts)).toBe(true);
    });

    it("pm_work_order_list returns r.work_orders array", async () => {
      const r = await call(handler, "pm_work_order_list", {});
      expect(Array.isArray(r.work_orders)).toBe(true);
    });

    it("pm_downtime_record happy path returns r.downtime with id prefix DT-", async () => {
      const r = await call(handler, "pm_downtime_record", {
        machine_id: uniqMachine(),
        type: "scheduled",
        started_at: "2026-05-15T00:00:00.000Z",
        ended_at:   "2026-05-15T01:00:00.000Z",
      });
      expect(r.downtime.id).toMatch(/^DT-/);
      expect(r.downtime.duration_min).toBe(60);
    });
  });
});
