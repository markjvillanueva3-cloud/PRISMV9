/**
 * CapacityPlanningEngine — Machine-level scheduling, load analysis, bottleneck detection.
 * Answers: "Can I take this job and still hit my dates?"
 */

export interface MachineCapacity {
  machine_id: string;
  machine_name: string;
  type: string;
  hours_per_shift: number;
  shifts_per_day: number;
  days_per_week: number;
  weekly_capacity_hours: number;
  efficiency_factor: number;
  effective_weekly_hours: number;
}

export interface MachineLoad {
  machine_id: string;
  machine_name: string;
  period: string;
  capacity_hours: number;
  loaded_hours: number;
  available_hours: number;
  utilization_pct: number;
  jobs: { job_id: string; operation: string; hours: number; due_date: string; priority: number }[];
  status: 'under_loaded' | 'optimal' | 'over_loaded' | 'critical';
}

export interface BottleneckReport {
  period: string;
  bottleneck_machine: string;
  utilization_pct: number;
  overload_hours: number;
  blocked_jobs: string[];
  recommendations: string[];
}

export interface WhatIfResult {
  feasible: boolean;
  machine_impacts: { machine: string; current_load_pct: number; new_load_pct: number; change_pct: number }[];
  earliest_start: string;
  estimated_completion: string;
  conflicts: string[];
  recommendations: string[];
}

export interface ScheduleSlot {
  job_id: string;
  operation: string;
  machine_id: string;
  start_date: string;
  end_date: string;
  hours: number;
  priority: number;
}

const DEFAULT_MACHINES: Omit<MachineCapacity, 'weekly_capacity_hours' | 'effective_weekly_hours'>[] = [
  { machine_id: 'VMC-1', machine_name: 'Haas VF-2', type: 'VMC', hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5, efficiency_factor: 0.85 },
  { machine_id: 'VMC-2', machine_name: 'DMG MORI DMU 50', type: '5-axis', hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5, efficiency_factor: 0.80 },
  { machine_id: 'LTH-1', machine_name: 'Mazak QTN-200', type: 'Lathe', hours_per_shift: 8, shifts_per_day: 2, days_per_week: 5, efficiency_factor: 0.85 },
  { machine_id: 'LTH-2', machine_name: 'Okuma LB3000', type: 'Lathe', hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5, efficiency_factor: 0.85 },
  { machine_id: 'GRN-1', machine_name: 'Studer S33', type: 'Grinder', hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5, efficiency_factor: 0.75 },
  { machine_id: 'EDM-1', machine_name: 'Makino EDAF3', type: 'EDM', hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5, efficiency_factor: 0.70 },
  { machine_id: 'SAW-1', machine_name: 'DoAll C-916', type: 'Saw', hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5, efficiency_factor: 0.90 },
  { machine_id: 'CMM-1', machine_name: 'Zeiss Contura', type: 'CMM', hours_per_shift: 8, shifts_per_day: 1, days_per_week: 5, efficiency_factor: 0.80 },
];

class CapacityPlanningEngine {
  private machines: Map<string, MachineCapacity> = new Map();
  private schedule: ScheduleSlot[] = [];
  /** U-BIZREG2: Source of machine data for diagnostics */
  machineSource: string = "default";

  constructor() {
    // Resolution chain: ShopConfigurationEngine → MachineRegistry → DEFAULT_MACHINES
    let machines: typeof DEFAULT_MACHINES = DEFAULT_MACHINES;
    let source = "default_hardcoded";

    // 1. Try ShopConfigurationEngine (shop-specific config)
    try {
      const shopMachines = require("./ShopConfigurationEngine.js").shopConfigurationEngine.toCapacityMachines();
      if (shopMachines?.length > 0) { machines = shopMachines; source = "ShopConfigurationEngine"; }
    } catch { /* not available */ }

    // 2. U-BIZREG2: Try MachineRegistry (910 machines from manufacturer data)
    if (source === "default_hardcoded") {
      try {
        const registry = require("../registries/MachineRegistry.js").machineRegistry;
        const registryMachines: typeof DEFAULT_MACHINES = [];
        // Look up each default machine by manufacturer + model in the registry
        for (const dm of DEFAULT_MACHINES) {
          const parts = dm.machine_name.split(" ");
          const found = registry.getByIdOrModel?.(dm.machine_name) ?? registry.getByModel?.(parts[0], parts.slice(1).join(" "));
          if (found) {
            registryMachines.push({
              ...dm,
              type: found.type ?? dm.type,
              machine_name: `${found.manufacturer ?? parts[0]} ${found.model ?? parts.slice(1).join(" ")}`,
            });
          } else {
            registryMachines.push(dm); // keep default if not found in registry
          }
        }
        if (registryMachines.length > 0) { machines = registryMachines; source = "MachineRegistry+defaults"; }
      } catch { /* registry not available */ }
    }

    this.machineSource = source;
    for (const m of machines) {
      const weekly = m.hours_per_shift * m.shifts_per_day * m.days_per_week;
      this.machines.set(m.machine_id, {
        ...m,
        weekly_capacity_hours: weekly,
        effective_weekly_hours: weekly * m.efficiency_factor,
      });
    }
  }

  getMachines(): MachineCapacity[] {
    return [...this.machines.values()];
  }

  addMachine(params: Omit<MachineCapacity, 'weekly_capacity_hours' | 'effective_weekly_hours'>): MachineCapacity {
    const weekly = params.hours_per_shift * params.shifts_per_day * params.days_per_week;
    const machine: MachineCapacity = {
      ...params,
      weekly_capacity_hours: weekly,
      effective_weekly_hours: weekly * params.efficiency_factor,
    };
    this.machines.set(params.machine_id, machine);
    return machine;
  }

  scheduleJob(params: {
    job_id: string;
    operations: { operation: string; machine_id: string; hours: number }[];
    due_date: string;
    priority?: number;
  }): ScheduleSlot[] {
    const slots: ScheduleSlot[] = [];
    let currentDate = new Date().toISOString().slice(0, 10);

    for (const op of params.operations) {
      const machine = this.machines.get(op.machine_id);
      if (!machine) throw new Error(`Machine ${op.machine_id} not found`);

      const daysNeeded = Math.ceil(op.hours / (machine.hours_per_shift * machine.shifts_per_day * machine.efficiency_factor));
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + daysNeeded);

      const slot: ScheduleSlot = {
        job_id: params.job_id,
        operation: op.operation,
        machine_id: op.machine_id,
        start_date: currentDate,
        end_date: endDate.toISOString().slice(0, 10),
        hours: op.hours,
        priority: params.priority ?? 5,
      };
      slots.push(slot);
      this.schedule.push(slot);
      currentDate = endDate.toISOString().slice(0, 10);
    }

    return slots;
  }

  getMachineLoad(machine_id: string, period_weeks?: number): MachineLoad {
    const machine = this.machines.get(machine_id);
    if (!machine) throw new Error(`Machine ${machine_id} not found`);

    const weeks = period_weeks ?? 1;
    const capacity = machine.effective_weekly_hours * weeks;
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + weeks * 7);
    const periodStr = `${now.toISOString().slice(0, 10)} to ${periodEnd.toISOString().slice(0, 10)}`;

    const machineSlots = this.schedule.filter((s) =>
      s.machine_id === machine_id &&
      s.start_date <= periodEnd.toISOString().slice(0, 10) &&
      s.end_date >= now.toISOString().slice(0, 10)
    );

    const loaded = machineSlots.reduce((s, slot) => s + slot.hours, 0);
    const utilization = capacity > 0 ? (loaded / capacity) * 100 : 0;

    return {
      machine_id, machine_name: machine.machine_name,
      period: periodStr,
      capacity_hours: capacity,
      loaded_hours: loaded,
      available_hours: Math.max(capacity - loaded, 0),
      utilization_pct: utilization,
      jobs: machineSlots.map((s) => ({
        job_id: s.job_id, operation: s.operation, hours: s.hours,
        due_date: s.end_date, priority: s.priority,
      })),
      status: utilization > 100 ? 'critical' : utilization > 90 ? 'over_loaded' : utilization > 70 ? 'optimal' : 'under_loaded',
    };
  }

  getAllMachineLoads(period_weeks?: number): MachineLoad[] {
    return [...this.machines.keys()].map((id) => this.getMachineLoad(id, period_weeks));
  }

  findBottlenecks(period_weeks?: number): BottleneckReport[] {
    const loads = this.getAllMachineLoads(period_weeks);
    return loads
      .filter((l) => l.utilization_pct > 90)
      .map((l) => {
        const overload = Math.max(l.loaded_hours - l.capacity_hours, 0);
        const recommendations: string[] = [];
        if (l.utilization_pct > 100) {
          recommendations.push(`Add ${Math.ceil(overload / 8)} shifts to ${l.machine_name}`);
          recommendations.push(`Outsource ${overload.toFixed(1)} hours of ${l.machine_name} work`);
        }
        if (l.utilization_pct > 90) {
          recommendations.push(`Consider scheduling lower-priority jobs to next period`);
        }
        return {
          period: l.period,
          bottleneck_machine: l.machine_name,
          utilization_pct: l.utilization_pct,
          overload_hours: overload,
          blocked_jobs: l.jobs.filter((j) => j.priority > 5).map((j) => j.job_id),
          recommendations,
        };
      })
      .sort((a, b) => b.utilization_pct - a.utilization_pct);
  }

  whatIfJob(params: {
    operations: { machine_id: string; hours: number }[];
    desired_start?: string;
    desired_end?: string;
  }): WhatIfResult {
    const impacts: WhatIfResult['machine_impacts'] = [];
    const conflicts: string[] = [];

    for (const op of params.operations) {
      const load = this.getMachineLoad(op.machine_id, 4);
      const newLoad = load.loaded_hours + op.hours;
      const newPct = load.capacity_hours > 0 ? (newLoad / load.capacity_hours) * 100 : 0;

      impacts.push({
        machine: load.machine_name,
        current_load_pct: load.utilization_pct,
        new_load_pct: newPct,
        change_pct: newPct - load.utilization_pct,
      });

      if (newPct > 100) {
        conflicts.push(`${load.machine_name} would be at ${newPct.toFixed(0)}% capacity`);
      }
    }

    const totalHours = params.operations.reduce((s, op) => s + op.hours, 0);
    const startDate = params.desired_start ?? new Date().toISOString().slice(0, 10);
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + Math.ceil(totalHours / 16));

    const recommendations: string[] = [];
    if (conflicts.length > 0) {
      recommendations.push('Consider splitting across shifts or outsourcing overloaded operations');
      recommendations.push('Review priority of existing jobs — can any be deferred?');
    }

    return {
      feasible: conflicts.length === 0,
      machine_impacts: impacts,
      earliest_start: startDate,
      estimated_completion: completionDate.toISOString().slice(0, 10),
      conflicts,
      recommendations,
    };
  }

  shopFloorSummary(): {
    total_machines: number;
    avg_utilization: number;
    bottleneck_count: number;
    idle_machines: string[];
    overloaded_machines: string[];
    total_scheduled_hours: number;
  } {
    const loads = this.getAllMachineLoads(1);
    const avgUtil = loads.length > 0 ? loads.reduce((s, l) => s + l.utilization_pct, 0) / loads.length : 0;

    return {
      total_machines: this.machines.size,
      avg_utilization: avgUtil,
      bottleneck_count: loads.filter((l) => l.utilization_pct > 90).length,
      idle_machines: loads.filter((l) => l.utilization_pct === 0).map((l) => l.machine_name),
      overloaded_machines: loads.filter((l) => l.utilization_pct > 100).map((l) => l.machine_name),
      total_scheduled_hours: this.schedule.reduce((s, slot) => s + slot.hours, 0),
    };
  }
}

export const capacityPlanningEngine = new CapacityPlanningEngine();
