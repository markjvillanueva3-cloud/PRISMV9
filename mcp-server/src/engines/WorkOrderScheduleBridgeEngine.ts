/**
 * WorkOrderScheduleBridgeEngine — bridges OrderManager work-orders to scheduling/capacity engines.
 *
 * BRIDGE-DEEP / U-BRIDGE-ERP-SCHED (slot:hotel, 2026-05-20).
 *
 * Gap closed: OrderManagerEngine emits work-orders (id, machine, operation,
 * estimatedTime, parent-order priority+dueDate) but nothing schedules them onto
 * the capacity model. schedulingEngine.schedule() / capacityPlanningEngine.whatIfJob()
 * both take their own job-shapes; this bridge does the field mapping + correlates
 * the results back to work-order ids so an operator can dispatch what came out
 * of the bridge.
 *
 * CONVENTION NOTE — engine convention is split: engines/.claude/CLAUDE.md says
 * static methods; mcp-server/CLAUDE.md says export singletons. Per R7
 * (conflicting rules → pick the more recent / more tested) + R11 (match the
 * surrounding code), this bridge is a singleton: the three engines it composes
 * (orderManagerEngine, schedulingEngine, capacityPlanningEngine) are all
 * `export const ...Engine = new ...Engine()`. A static-method class would be
 * a lone outlier in this composition.
 */

import {
  orderManagerEngine,
  type WorkOrder,
  type Order,
} from "./OrderManagerEngine.js";
import {
  schedulingEngine,
  type Job,
  type MachineSlot,
  type ScheduleResult,
  type ScheduleStrategy,
} from "./SchedulingEngine.js";
import {
  capacityPlanningEngine,
  type WhatIfResult,
} from "./CapacityPlanningEngine.js";

// ============================================================================
// TYPES
// ============================================================================

const MS_PER_DAY = 86_400_000;

export interface ScheduleOpenOptions {
  /** Override the default strategy ("balanced"). */
  strategy?: ScheduleStrategy;
  /** Restrict to a single machine (work-order.machine === filterMachine). */
  filterMachine?: string;
  /** Override the OrderManager's open work-order set (testing / dry-run). */
  workOrders?: WorkOrder[];
  /** Required: machines available to the schedule. Caller supplies — the
   *  schedule contract demands explicit capacity (avoids hidden coupling to
   *  capacityPlanningEngine's default 8-machine fleet). */
  machines: MachineSlot[];
  /** Fallback setup time (min) per work-order when not split out separately.
   *  Default 0 — `estimatedTime` is treated as fully baked. */
  defaultSetupMin?: number;
}

export interface ScheduledWorkOrder {
  work_order_id: string;
  order_id: string;
  machine_id: string;
  start_day: number;
  end_day: number;
  start_date: string;   // ISO date, derived from start_day + today
  end_date: string;     // ISO date, derived from end_day + today
  duration_hours: number;
  on_time: boolean;
  slack_days: number;
}

export interface WorkOrderScheduleResult {
  scheduled: ScheduledWorkOrder[];
  /** Schedule-level summary directly from schedulingEngine. */
  total_makespan_days: number;
  machine_utilization: Record<string, number>;
  late_work_orders: string[];     // IDs of work-orders not on-time
  schedule_score: number;         // 0-100
  /** Bridge meta — what got mapped, what got dropped. */
  bridge: {
    work_orders_considered: number;
    work_orders_scheduled: number;
    orphans: string[];            // WO ids whose parent order disappeared
    strategy: ScheduleStrategy;
  };
}

export interface WhatIfWorkOrderOptions {
  /** Desired start date (ISO YYYY-MM-DD). Default = today. */
  desired_start?: string;
}

export interface WhatIfWorkOrderResult extends WhatIfResult {
  bridge: {
    work_order_id: string;
    order_id: string;
    machine_id: string;
    hours: number;
    priority: number;       // 1-5, from parent order
  };
}

// ============================================================================
// PRIORITY MAPPING — Order.priority (1-5, 1=highest) → Job.priority enum
// ============================================================================

function orderPriorityToJobPriority(p: number): Job["priority"] {
  if (p <= 1) return "critical";
  if (p === 2) return "high";
  if (p === 3) return "normal";
  return "low";
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function isoDatePlusDays(nowMs: number, days: number): string {
  return isoDate(new Date(nowMs + days * MS_PER_DAY));
}

// ============================================================================
// ENGINE
// ============================================================================

export class WorkOrderScheduleBridgeEngine {
  /**
   * Schedule every open work-order onto the supplied machines via
   * schedulingEngine.schedule(), then correlate JobAssignment → WorkOrder so
   * the result is keyed on work-order ids (not synthetic Job ids).
   *
   * Skips work-orders whose parent order has disappeared (defensive — should
   * not happen under normal OrderManager use, but a manual cancellation +
   * orphan WO would otherwise crash sortByStrategy).
   */
  scheduleOpenWorkOrders(opts: ScheduleOpenOptions): WorkOrderScheduleResult {
    if (!Array.isArray(opts.machines) || opts.machines.length === 0) {
      throw new Error("scheduleOpenWorkOrders: 'machines' is required and must be non-empty");
    }

    const sourceWOs = opts.workOrders ?? this.listOpenWorkOrders();
    const considered = opts.filterMachine
      ? sourceWOs.filter(wo => wo.machine === opts.filterMachine)
      : sourceWOs;

    const orphans: string[] = [];
    const jobs: Job[] = [];
    const woById = new Map<string, WorkOrder>();
    const orderByWoId = new Map<string, Order>();
    const setupMin = opts.defaultSetupMin ?? 0;

    for (const wo of considered) {
      const order = orderManagerEngine.getOrder(wo.orderId);
      if (!order) { orphans.push(wo.id); continue; }
      woById.set(wo.id, wo);
      orderByWoId.set(wo.id, order);

      // cycle_time_min = (estimatedTime - setup) / qty; clamp to >= 0
      // estimatedTime is total min for the WO; the scheduler then re-multiplies
      // by quantity (jobDuration = qty*cycle + setup), so cycle = (total-setup)/qty.
      const qty = Math.max(1, wo.quantity);
      const cycleMin = Math.max(0, (wo.estimatedTime - setupMin) / qty);

      jobs.push({
        id: wo.id,
        part_name: wo.operation,
        quantity: qty,
        cycle_time_min: cycleMin,
        setup_time_min: setupMin,
        due_date: order.dueDate ?? isoDatePlusDays(Date.now(), 14),
        priority: orderPriorityToJobPriority(order.priority),
        required_machine_type: wo.machine || undefined,
      });
    }

    const strategy: ScheduleStrategy = opts.strategy ?? "balanced";
    const result: ScheduleResult = schedulingEngine.schedule(jobs, opts.machines, strategy);
    const nowMs = Date.now();

    const scheduled: ScheduledWorkOrder[] = result.assignments.map(a => ({
      work_order_id: a.job_id,
      order_id: woById.get(a.job_id)!.orderId,
      machine_id: a.machine_id,
      start_day: a.start_day,
      end_day: a.end_day,
      start_date: isoDatePlusDays(nowMs, a.start_day),
      end_date: isoDatePlusDays(nowMs, a.end_day),
      duration_hours: a.duration_hours,
      on_time: a.on_time,
      slack_days: a.slack_days,
    }));

    return {
      scheduled,
      total_makespan_days: result.total_makespan_days,
      machine_utilization: result.machine_utilization,
      late_work_orders: result.late_jobs,
      schedule_score: result.schedule_score,
      bridge: {
        work_orders_considered: considered.length,
        work_orders_scheduled: scheduled.length,
        orphans,
        strategy,
      },
    };
  }

  /**
   * Run a capacityPlanningEngine.whatIfJob() check for a single work-order.
   * Surfaces capacity impact + bottleneck conflicts without committing the
   * schedule.
   */
  whatIfWorkOrder(
    workOrderId: string,
    opts: WhatIfWorkOrderOptions = {},
  ): WhatIfWorkOrderResult {
    if (typeof workOrderId !== "string" || workOrderId.trim().length === 0) {
      throw new Error("whatIfWorkOrder: 'workOrderId' must be a non-empty string");
    }

    // OrderManager has no get-by-WO accessor; iterate from any order that
    // references it. The work-order is the same shape `getWorkOrders` returns.
    const wo = this.getWorkOrder(workOrderId);
    if (!wo) throw new Error(`whatIfWorkOrder: work-order not found: ${workOrderId}`);
    const order = orderManagerEngine.getOrder(wo.orderId);
    if (!order) throw new Error(`whatIfWorkOrder: parent order missing: ${wo.orderId}`);
    if (!wo.machine || wo.machine.trim().length === 0) {
      throw new Error(`whatIfWorkOrder: work-order has no machine assigned: ${workOrderId}`);
    }

    // P1 fix (3-of-3 scrutiny arm A on 9918fc663b): pre-validate the WO's
    // machine against capacityPlanningEngine's fleet at the bridge layer so
    // the error names the *bridge* assumption, not the underlying capacity
    // engine's "Machine X not found" (which surfaces from the wrong layer).
    const fleet = capacityPlanningEngine.getMachines();
    if (!fleet.some(m => m.machine_id === wo.machine)) {
      throw new Error(
        `whatIfWorkOrder: machine '${wo.machine}' is not registered with capacityPlanningEngine (fleet has ${fleet.length} machines)`,
      );
    }

    const hours = wo.estimatedTime / 60;
    const whatIf = capacityPlanningEngine.whatIfJob({
      operations: [{ machine_id: wo.machine, hours }],
      desired_start: opts.desired_start,
    });

    return {
      ...whatIf,
      bridge: {
        work_order_id: wo.id,
        order_id: wo.orderId,
        machine_id: wo.machine,
        hours,
        priority: order.priority,
      },
    };
  }

  /** Enumerate every open work-order across every order (not just one order).
   *
   * "Open" means scheduleable — `pending` or `queued`. `setup` and `running`
   * WOs are ACTIVE on the floor and must NOT be re-scheduled (double-booking).
   * `complete` and `cancelled` are terminal. P1 fix per 3-of-3 scrutiny arm C
   * on 9918fc663b — original filter only excluded complete+cancelled, which
   * let active floor work re-enter the schedule. */
  listOpenWorkOrders(): WorkOrder[] {
    const open: WorkOrder[] = [];
    for (const order of orderManagerEngine.listOrders()) {
      for (const wo of orderManagerEngine.getWorkOrders(order.id)) {
        // Positive whitelist — only WOs that are *not yet on a spindle*.
        if (wo.status === "pending" || wo.status === "queued") open.push(wo);
      }
    }
    return open;
  }

  /** Find a single work-order by id by sweeping every order. O(N) but bounded
   *  by the OrderManager's working set — acceptable for the bridge surface. */
  getWorkOrder(workOrderId: string): WorkOrder | undefined {
    for (const order of orderManagerEngine.listOrders()) {
      for (const wo of orderManagerEngine.getWorkOrders(order.id)) {
        if (wo.id === workOrderId) return wo;
      }
    }
    return undefined;
  }
}

export const workOrderScheduleBridgeEngine = new WorkOrderScheduleBridgeEngine();
