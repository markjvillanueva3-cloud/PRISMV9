/**
 * PreventiveMaintenanceEngine — BIZ-MS5 U-BIZ36
 * PM schedule management (calendar + hours-based triggers), work order generation,
 * downtime recording, overdue alerts.
 */
import { persistenceBridge } from "../db/PersistenceBridge.js";

export interface PMPart {
  part_name: string;
  part_number: string;
  quantity: number;
  unit_cost: number;
}

export interface PMSchedule {
  id: string;
  machine_id: string;
  machine_name: string;
  task_name: string;
  trigger_type: "calendar" | "hours";
  interval_days: number | undefined;
  interval_hours: number | undefined;
  last_completed_at: string | undefined;
  last_completed_hours: number | undefined;
  parts_list: PMPart[];
  estimated_duration_min: number;
  instructions: string;
  created_at: string;
}

export interface PMWorkOrder {
  id: string;
  schedule_id: string;
  machine_id: string;
  machine_name: string;
  task_name: string;
  parts_list: PMPart[];
  status: "open" | "in_progress" | "complete" | "cancelled";
  assigned_to: string | undefined;
  scheduled_date: string;
  completed_at: string | undefined;
  labor_hours: number | undefined;
  total_cost: number | undefined;
  notes: string | undefined;
  created_at: string;
}

export interface MaintenanceDowntime {
  id: string;
  machine_id: string;
  type: "scheduled" | "unscheduled";
  started_at: string;
  ended_at: string | undefined;
  duration_min: number | undefined;
  work_order_id: string | undefined;
  cause: string | undefined;
}

const LABOR_RATE = 75; // $/hr default

class PreventiveMaintenanceEngine {
  private pmSchedules = new Map<string, PMSchedule>();
  private pmWorkOrders = new Map<string, PMWorkOrder>();
  private maintenanceDowntime = new Map<string, MaintenanceDowntime>();

  constructor() {
    persistenceBridge.registerMap({ entity: "pm_schedules", getMap: () => this.pmSchedules as unknown as Map<string, any>, keyField: "id" });
    persistenceBridge.registerMap({ entity: "pm_work_orders", getMap: () => this.pmWorkOrders as unknown as Map<string, any>, keyField: "id" });
    persistenceBridge.registerMap({ entity: "maintenance_downtime", getMap: () => this.maintenanceDowntime as unknown as Map<string, any>, keyField: "id" });
  }

  createSchedule(params: Omit<PMSchedule, "id" | "created_at">): PMSchedule {
    if (params.trigger_type === "calendar" && !params.interval_days) {
      throw new Error("Calendar-based schedules require interval_days");
    }
    if (params.trigger_type === "hours" && !params.interval_hours) {
      throw new Error("Hours-based schedules require interval_hours");
    }
    const schedule: PMSchedule = {
      ...params,
      id: `PM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      parts_list: params.parts_list ?? [],
      created_at: new Date().toISOString(),
    };
    this.pmSchedules.set(schedule.id, schedule);
    persistenceBridge.persist("pm_schedules", schedule.id, schedule as any);
    return schedule;
  }

  listSchedules(filters?: { machine_id?: string; overdue_only?: boolean }): PMSchedule[] {
    let results = Array.from(this.pmSchedules.values());
    if (filters?.machine_id) {
      results = results.filter(s => s.machine_id === filters.machine_id);
    }
    if (filters?.overdue_only) {
      results = results.filter(s => this.isScheduleDue(s));
    }
    return results;
  }

  isScheduleDue(schedule: PMSchedule, currentHours?: number): boolean {
    if (schedule.trigger_type === "calendar") {
      if (!schedule.last_completed_at) return true;
      const dueMs = Date.parse(schedule.last_completed_at) + (schedule.interval_days ?? 0) * 86400000;
      return Date.now() >= dueMs;
    }
    // hours-based
    if (schedule.last_completed_hours === undefined) return true;
    if (currentHours === undefined) return false;
    return (currentHours - schedule.last_completed_hours) >= (schedule.interval_hours ?? 0);
  }

  generateWorkOrder(scheduleId: string, scheduledDate: string): PMWorkOrder {
    const schedule = this.pmSchedules.get(scheduleId);
    if (!schedule) throw new Error(`PM schedule not found: ${scheduleId}`);

    // Check for existing open/in_progress WO for this schedule
    for (const wo of this.pmWorkOrders.values()) {
      if (wo.schedule_id === scheduleId && (wo.status === "open" || wo.status === "in_progress")) {
        throw new Error(`An active work order already exists for schedule ${scheduleId}: ${wo.id}`);
      }
    }

    const wo: PMWorkOrder = {
      id: `WO-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      schedule_id: scheduleId,
      machine_id: schedule.machine_id,
      machine_name: schedule.machine_name,
      task_name: schedule.task_name,
      parts_list: [...schedule.parts_list],
      status: "open",
      assigned_to: undefined,
      scheduled_date: scheduledDate,
      completed_at: undefined,
      labor_hours: undefined,
      total_cost: undefined,
      notes: undefined,
      created_at: new Date().toISOString(),
    };
    this.pmWorkOrders.set(wo.id, wo);
    persistenceBridge.persist("pm_work_orders", wo.id, wo as any);
    return wo;
  }

  completeWorkOrder(workOrderId: string, params: {
    labor_hours: number;
    notes?: string;
    parts_used?: PMPart[];
  }): PMWorkOrder {
    const wo = this.pmWorkOrders.get(workOrderId);
    if (!wo) throw new Error(`Work order not found: ${workOrderId}`);

    const partsCost = (params.parts_used ?? []).reduce((s, p) => s + p.quantity * p.unit_cost, 0);
    const laborCost = params.labor_hours * LABOR_RATE;

    wo.status = "complete";
    wo.completed_at = new Date().toISOString();
    wo.labor_hours = params.labor_hours;
    wo.notes = params.notes;
    wo.total_cost = partsCost + laborCost;
    if (params.parts_used) wo.parts_list = params.parts_used;

    this.pmWorkOrders.set(wo.id, wo);
    persistenceBridge.persist("pm_work_orders", wo.id, wo as any);

    // Update parent schedule last_completed_at
    const schedule = this.pmSchedules.get(wo.schedule_id);
    if (schedule) {
      schedule.last_completed_at = wo.completed_at;
      this.pmSchedules.set(schedule.id, schedule);
      persistenceBridge.persist("pm_schedules", schedule.id, schedule as any);
    }

    return wo;
  }

  getOverdueAlerts(currentMachineHours?: Map<string, number>): Array<{
    schedule: PMSchedule;
    days_overdue: number;
    hours_overdue: number | undefined;
  }> {
    const alerts: Array<{ schedule: PMSchedule; days_overdue: number; hours_overdue: number | undefined }> = [];
    for (const schedule of this.pmSchedules.values()) {
      const machineHours = currentMachineHours?.get(schedule.machine_id);
      if (!this.isScheduleDue(schedule, machineHours)) continue;

      let daysOverdue = 0;
      let hoursOverdue: number | undefined;

      if (schedule.trigger_type === "calendar") {
        if (schedule.last_completed_at) {
          const dueMs = Date.parse(schedule.last_completed_at) + (schedule.interval_days ?? 0) * 86400000;
          daysOverdue = Math.max(0, Math.floor((Date.now() - dueMs) / 86400000));
        } else {
          daysOverdue = 999; // Never completed
        }
      } else if (schedule.trigger_type === "hours" && machineHours !== undefined) {
        hoursOverdue = machineHours - (schedule.last_completed_hours ?? 0) - (schedule.interval_hours ?? 0);
      }

      alerts.push({ schedule, days_overdue: daysOverdue, hours_overdue: hoursOverdue });
    }
    return alerts;
  }

  recordDowntime(params: Omit<MaintenanceDowntime, "id">): MaintenanceDowntime {
    const dt: MaintenanceDowntime = {
      ...params,
      id: `DT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    if (dt.ended_at && dt.started_at) {
      dt.duration_min = (Date.parse(dt.ended_at) - Date.parse(dt.started_at)) / 60000;
    }
    this.maintenanceDowntime.set(dt.id, dt);
    persistenceBridge.persist("maintenance_downtime", dt.id, dt as any);
    return dt;
  }

  listWorkOrders(filters?: { status?: string; machine_id?: string; assigned_to?: string }): PMWorkOrder[] {
    let results = Array.from(this.pmWorkOrders.values());
    if (filters?.status) results = results.filter(w => w.status === filters.status);
    if (filters?.machine_id) results = results.filter(w => w.machine_id === filters.machine_id);
    if (filters?.assigned_to) results = results.filter(w => w.assigned_to === filters.assigned_to);
    return results.sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }

  assignWorkOrder(workOrderId: string, assignedTo: string): PMWorkOrder {
    const wo = this.pmWorkOrders.get(workOrderId);
    if (!wo) throw new Error(`Work order not found: ${workOrderId}`);
    wo.assigned_to = assignedTo;
    wo.status = "in_progress";
    this.pmWorkOrders.set(wo.id, wo);
    persistenceBridge.persist("pm_work_orders", wo.id, wo as any);
    return wo;
  }
}

export const preventiveMaintenanceEngine = new PreventiveMaintenanceEngine();
