/**
 * LatheCapacityPlanningEngine — Shop Capacity Planning & Analysis
 *
 * U-LTH54: Capacity planning, load balancing, bottleneck detection
 * Uses JobSchedulingEngine + MachineCapacityEngine + LoadBalancingEngine patterns
 *
 * @module engines/LatheCapacityPlanningEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Machine {
  machine_id: string;
  name: string;
  type: "cnc_lathe" | "manual_lathe" | "swiss_lathe" | "multitask";
  max_diameter_mm: number;
  max_length_mm: number;
  spindle_hp: number;
  live_tooling: boolean;
  sub_spindle: boolean;
  efficiency_factor: number;
  hourly_rate: number;
  shifts_available: number;
  hours_per_shift: number;
  scheduled_downtime_pct: number;
}

export interface Job {
  job_id: string;
  part_number: string;
  quantity: number;
  cycle_time_min: number;
  setup_time_min: number;
  required_capabilities: string[];
  priority: "low" | "normal" | "high" | "rush";
  due_date: string;
  machine_id?: string;
  status: "pending" | "scheduled" | "in_progress" | "complete";
}

export interface CapacityPeriod {
  period_start: string;
  period_end: string;
  total_hours: number;
  scheduled_hours: number;
  available_hours: number;
  utilization_pct: number;
  jobs_scheduled: number;
}

export interface MachineLoad {
  machine_id: string;
  machine_name: string;
  total_capacity_hours: number;
  scheduled_hours: number;
  available_hours: number;
  utilization_pct: number;
  jobs: Array<{ job_id: string; hours: number; due_date: string }>;
  overload: boolean;
  overload_hours: number;
}

export interface Bottleneck {
  machine_id: string;
  machine_name: string;
  utilization_pct: number;
  overload_hours: number;
  affected_jobs: string[];
  severity: "critical" | "warning" | "moderate";
  recommendations: string[];
}

export interface CapacityForecast {
  period: string;
  total_demand_hours: number;
  total_capacity_hours: number;
  utilization_pct: number;
  shortfall_hours: number;
  surplus_hours: number;
  status: "overcapacity" | "balanced" | "undercapacity";
}

export interface LoadBalanceResult {
  original_utilization: Record<string, number>;
  balanced_utilization: Record<string, number>;
  reassignments: Array<{
    job_id: string;
    from_machine: string;
    to_machine: string;
    reason: string;
  }>;
  improvement_pct: number;
}

export interface WhatIfScenario {
  scenario_id: string;
  description: string;
  changes: Array<{
    type: "add_job" | "remove_job" | "change_capacity" | "add_machine";
    details: Record<string, unknown>;
  }>;
  result: {
    feasible: boolean;
    utilization_impact: number;
    bottlenecks_created: string[];
    recommendations: string[];
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const HOURS_PER_WEEK = 40;

// ============================================================================
// ENGINE
// ============================================================================

class LatheCapacityPlanningEngine {
  private machines: Map<string, Machine> = new Map();
  private jobs: Map<string, Job> = new Map();

  constructor() {
    this.initializeJMDieMachines();
  }

  private initializeJMDieMachines(): void {
    const jmDieLathes: Machine[] = [
      {
        machine_id: "LB-3000",
        name: "Okuma LB-3000 EX II",
        type: "cnc_lathe",
        max_diameter_mm: 380,
        max_length_mm: 1000,
        spindle_hp: 30,
        live_tooling: true,
        sub_spindle: true,
        efficiency_factor: 0.85,
        hourly_rate: 95,
        shifts_available: 2,
        hours_per_shift: 8,
        scheduled_downtime_pct: 5,
      },
      {
        machine_id: "LB-2000",
        name: "Okuma LB-2000",
        type: "cnc_lathe",
        max_diameter_mm: 300,
        max_length_mm: 600,
        spindle_hp: 20,
        live_tooling: true,
        sub_spindle: false,
        efficiency_factor: 0.82,
        hourly_rate: 85,
        shifts_available: 2,
        hours_per_shift: 8,
        scheduled_downtime_pct: 5,
      },
      {
        machine_id: "LB-15II",
        name: "Okuma LB-15 II",
        type: "cnc_lathe",
        max_diameter_mm: 250,
        max_length_mm: 500,
        spindle_hp: 15,
        live_tooling: false,
        sub_spindle: false,
        efficiency_factor: 0.80,
        hourly_rate: 75,
        shifts_available: 2,
        hours_per_shift: 8,
        scheduled_downtime_pct: 5,
      },
      {
        machine_id: "GENOS-L200",
        name: "Okuma GENOS L200",
        type: "cnc_lathe",
        max_diameter_mm: 200,
        max_length_mm: 350,
        spindle_hp: 15,
        live_tooling: true,
        sub_spindle: false,
        efficiency_factor: 0.83,
        hourly_rate: 80,
        shifts_available: 1,
        hours_per_shift: 8,
        scheduled_downtime_pct: 5,
      },
      {
        machine_id: "CITIZEN-L20",
        name: "Citizen L20 Swiss",
        type: "swiss_lathe",
        max_diameter_mm: 20,
        max_length_mm: 200,
        spindle_hp: 5,
        live_tooling: true,
        sub_spindle: true,
        efficiency_factor: 0.88,
        hourly_rate: 110,
        shifts_available: 2,
        hours_per_shift: 8,
        scheduled_downtime_pct: 3,
      },
    ];

    for (const machine of jmDieLathes) {
      this.machines.set(machine.machine_id, machine);
    }
  }

  // --------------------------------------------------------------------------
  // Capacity Calculations
  // --------------------------------------------------------------------------

  getWeeklyCapacity(machineId: string): number {
    const machine = this.machines.get(machineId);
    if (!machine) return 0;

    const grossHours = machine.shifts_available * machine.hours_per_shift * 5;
    const netHours = grossHours * (1 - machine.scheduled_downtime_pct / 100);
    return netHours * machine.efficiency_factor;
  }

  getTotalShopCapacity(weeks: number = 1): number {
    let total = 0;
    for (const machineId of this.machines.keys()) {
      total += this.getWeeklyCapacity(machineId) * weeks;
    }
    return Math.round(total * 10) / 10;
  }

  calculateJobHours(job: Job): number {
    const cycleHours = (job.cycle_time_min * job.quantity) / 60;
    const setupHours = job.setup_time_min / 60;
    return cycleHours + setupHours;
  }

  // --------------------------------------------------------------------------
  // Machine Load Analysis
  // --------------------------------------------------------------------------

  getMachineLoad(machineId: string, weeks: number = 1): MachineLoad | null {
    const machine = this.machines.get(machineId);
    if (!machine) return null;

    const capacity = this.getWeeklyCapacity(machineId) * weeks;
    const assignedJobs = Array.from(this.jobs.values()).filter(
      (j) => j.machine_id === machineId && j.status !== "complete"
    );

    const scheduledHours = assignedJobs.reduce(
      (sum, job) => sum + this.calculateJobHours(job),
      0
    );

    const overload = scheduledHours > capacity;

    return {
      machine_id: machineId,
      machine_name: machine.name,
      total_capacity_hours: Math.round(capacity * 10) / 10,
      scheduled_hours: Math.round(scheduledHours * 10) / 10,
      available_hours: Math.round(Math.max(0, capacity - scheduledHours) * 10) / 10,
      utilization_pct: Math.round((scheduledHours / capacity) * 1000) / 10,
      jobs: assignedJobs.map((j) => ({
        job_id: j.job_id,
        hours: Math.round(this.calculateJobHours(j) * 10) / 10,
        due_date: j.due_date,
      })),
      overload,
      overload_hours: overload ? Math.round((scheduledHours - capacity) * 10) / 10 : 0,
    };
  }

  getAllMachineLoads(weeks: number = 1): MachineLoad[] {
    const loads: MachineLoad[] = [];
    for (const machineId of this.machines.keys()) {
      const load = this.getMachineLoad(machineId, weeks);
      if (load) loads.push(load);
    }
    return loads.sort((a, b) => b.utilization_pct - a.utilization_pct);
  }

  // --------------------------------------------------------------------------
  // Bottleneck Detection
  // --------------------------------------------------------------------------

  detectBottlenecks(threshold: number = 90): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];
    const loads = this.getAllMachineLoads();

    for (const load of loads) {
      if (load.utilization_pct >= threshold) {
        let severity: Bottleneck["severity"];
        if (load.utilization_pct >= 120) {
          severity = "critical";
        } else if (load.utilization_pct >= 100) {
          severity = "warning";
        } else {
          severity = "moderate";
        }

        const recommendations: string[] = [];
        if (load.overload) {
          recommendations.push(`Redistribute ${load.overload_hours}h to other machines`);
          recommendations.push("Consider overtime or additional shift");
        }
        if (load.utilization_pct > 100) {
          recommendations.push("Prioritize jobs by due date");
          recommendations.push("Evaluate outsourcing options");
        }
        recommendations.push("Review setup times for optimization");

        bottlenecks.push({
          machine_id: load.machine_id,
          machine_name: load.machine_name,
          utilization_pct: load.utilization_pct,
          overload_hours: load.overload_hours,
          affected_jobs: load.jobs.map((j) => j.job_id),
          severity,
          recommendations,
        });
      }
    }

    return bottlenecks.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, moderate: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // --------------------------------------------------------------------------
  // Capacity Forecast
  // --------------------------------------------------------------------------

  forecastCapacity(weeks: number): CapacityForecast[] {
    const forecasts: CapacityForecast[] = [];
    const now = new Date();

    for (let w = 0; w < weeks; w++) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() + w * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const periodStr = `W${w + 1} (${weekStart.toISOString().substring(0, 10)})`;
      const totalCapacity = this.getTotalShopCapacity(1);

      const weekJobs = Array.from(this.jobs.values()).filter((j) => {
        const dueDate = new Date(j.due_date);
        return dueDate >= weekStart && dueDate <= weekEnd && j.status !== "complete";
      });

      const demandHours = weekJobs.reduce((sum, j) => sum + this.calculateJobHours(j), 0);
      const utilization = totalCapacity > 0 ? (demandHours / totalCapacity) * 100 : 0;

      let status: CapacityForecast["status"];
      if (utilization > 100) {
        status = "overcapacity";
      } else if (utilization > 80) {
        status = "balanced";
      } else {
        status = "undercapacity";
      }

      forecasts.push({
        period: periodStr,
        total_demand_hours: Math.round(demandHours * 10) / 10,
        total_capacity_hours: Math.round(totalCapacity * 10) / 10,
        utilization_pct: Math.round(utilization * 10) / 10,
        shortfall_hours:
          demandHours > totalCapacity ? Math.round((demandHours - totalCapacity) * 10) / 10 : 0,
        surplus_hours:
          demandHours < totalCapacity ? Math.round((totalCapacity - demandHours) * 10) / 10 : 0,
        status,
      });
    }

    return forecasts;
  }

  // --------------------------------------------------------------------------
  // Load Balancing
  // --------------------------------------------------------------------------

  balanceLoad(): LoadBalanceResult {
    const originalLoads = this.getAllMachineLoads();
    const originalUtilization: Record<string, number> = {};
    for (const load of originalLoads) {
      originalUtilization[load.machine_id] = load.utilization_pct;
    }

    const reassignments: LoadBalanceResult["reassignments"] = [];
    const overloadedMachines = originalLoads.filter((l) => l.utilization_pct > 100);
    const underloadedMachines = originalLoads.filter((l) => l.utilization_pct < 70);

    for (const overloaded of overloadedMachines) {
      const overloadHours = overloaded.overload_hours;
      const jobsToMove = overloaded.jobs
        .sort((a, b) => a.hours - b.hours)
        .filter((j) => {
          const job = this.jobs.get(j.job_id);
          return job && job.priority !== "rush";
        });

      let hoursReassigned = 0;

      for (const jobInfo of jobsToMove) {
        if (hoursReassigned >= overloadHours) break;

        const job = this.jobs.get(jobInfo.job_id);
        if (!job) continue;

        const targetMachine = underloadedMachines.find((m) => {
          const machine = this.machines.get(m.machine_id);
          if (!machine) return false;
          return this.canMachineHandleJob(machine, job) && m.available_hours >= jobInfo.hours;
        });

        if (targetMachine) {
          reassignments.push({
            job_id: jobInfo.job_id,
            from_machine: overloaded.machine_id,
            to_machine: targetMachine.machine_id,
            reason: `Relieve overload on ${overloaded.machine_name}`,
          });

          job.machine_id = targetMachine.machine_id;
          this.jobs.set(job.job_id, job);

          targetMachine.available_hours -= jobInfo.hours;
          hoursReassigned += jobInfo.hours;
        }
      }
    }

    const balancedLoads = this.getAllMachineLoads();
    const balancedUtilization: Record<string, number> = {};
    for (const load of balancedLoads) {
      balancedUtilization[load.machine_id] = load.utilization_pct;
    }

    const originalVariance = this.calculateUtilizationVariance(originalUtilization);
    const balancedVariance = this.calculateUtilizationVariance(balancedUtilization);
    const improvement =
      originalVariance > 0 ? ((originalVariance - balancedVariance) / originalVariance) * 100 : 0;

    return {
      original_utilization: originalUtilization,
      balanced_utilization: balancedUtilization,
      reassignments,
      improvement_pct: Math.round(improvement * 10) / 10,
    };
  }

  private calculateUtilizationVariance(utilization: Record<string, number>): number {
    const values = Object.values(utilization);
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return variance;
  }

  private canMachineHandleJob(machine: Machine, job: Job): boolean {
    for (const cap of job.required_capabilities) {
      if (cap === "live_tooling" && !machine.live_tooling) return false;
      if (cap === "sub_spindle" && !machine.sub_spindle) return false;
      if (cap === "swiss" && machine.type !== "swiss_lathe") return false;
    }
    return true;
  }

  // --------------------------------------------------------------------------
  // What-If Analysis
  // --------------------------------------------------------------------------

  runWhatIfScenario(scenario: Omit<WhatIfScenario, "result">): WhatIfScenario {
    const machineSnapshot = new Map(this.machines);
    const jobSnapshot = new Map(this.jobs);

    for (const change of scenario.changes) {
      if (change.type === "add_job") {
        const newJob = change.details as Job;
        this.jobs.set(newJob.job_id, newJob);
      } else if (change.type === "remove_job") {
        this.jobs.delete(change.details.job_id as string);
      } else if (change.type === "add_machine") {
        const newMachine = change.details as Machine;
        this.machines.set(newMachine.machine_id, newMachine);
      } else if (change.type === "change_capacity") {
        const machineId = change.details.machine_id as string;
        const machine = this.machines.get(machineId);
        if (machine) {
          machine.shifts_available = (change.details.shifts as number) || machine.shifts_available;
          this.machines.set(machineId, machine);
        }
      }
    }

    const bottlenecks = this.detectBottlenecks(90);
    const forecast = this.forecastCapacity(1)[0];

    const originalLoads = Array.from(machineSnapshot.keys())
      .map((id) => this.getMachineLoad(id, 1))
      .filter((l): l is MachineLoad => l !== null);

    const avgOriginalUtil =
      originalLoads.reduce((s, l) => s + l.utilization_pct, 0) / originalLoads.length;

    const newLoads = this.getAllMachineLoads();
    const avgNewUtil = newLoads.reduce((s, l) => s + l.utilization_pct, 0) / newLoads.length;

    const recommendations: string[] = [];
    if (bottlenecks.length > 0) {
      recommendations.push(`${bottlenecks.length} bottleneck(s) identified`);
    }
    if (forecast && forecast.status === "overcapacity") {
      recommendations.push(`Capacity shortfall of ${forecast.shortfall_hours}h`);
    }
    if (avgNewUtil > avgOriginalUtil + 20) {
      recommendations.push("Consider adding capacity or outsourcing");
    }

    const result: WhatIfScenario = {
      ...scenario,
      scenario_id: `WIF-${Date.now().toString(36)}`,
      result: {
        feasible: bottlenecks.filter((b) => b.severity === "critical").length === 0,
        utilization_impact: Math.round((avgNewUtil - avgOriginalUtil) * 10) / 10,
        bottlenecks_created: bottlenecks.map((b) => b.machine_id),
        recommendations,
      },
    };

    this.machines = machineSnapshot;
    this.jobs = jobSnapshot;

    return result;
  }

  // --------------------------------------------------------------------------
  // Job & Machine Management
  // --------------------------------------------------------------------------

  addJob(job: Job): Job {
    this.jobs.set(job.job_id, job);
    return job;
  }

  assignJobToMachine(jobId: string, machineId: string): Job | null {
    const job = this.jobs.get(jobId);
    const machine = this.machines.get(machineId);
    if (!job || !machine) return null;

    if (!this.canMachineHandleJob(machine, job)) {
      return null;
    }

    job.machine_id = machineId;
    job.status = "scheduled";
    this.jobs.set(jobId, job);
    return job;
  }

  getMachine(machineId: string): Machine | null {
    return this.machines.get(machineId) || null;
  }

  getAllMachines(): Machine[] {
    return Array.from(this.machines.values());
  }

  getJob(jobId: string): Job | null {
    return this.jobs.get(jobId) || null;
  }

  getAllJobs(): Job[] {
    return Array.from(this.jobs.values());
  }

  clearAll(): void {
    this.jobs.clear();
  }
}

export const latheCapacityPlanningEngine = new LatheCapacityPlanningEngine();
