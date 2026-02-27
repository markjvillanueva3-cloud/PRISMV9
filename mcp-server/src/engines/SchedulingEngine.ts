/**
 * SchedulingEngine — Manufacturing Intelligence Layer
 *
 * Schedules manufacturing jobs across machines using priority rules
 * and optimization. Supports EDD, SPT, and load-balancing strategies.
 *
 * Actions: schedule_jobs, schedule_optimize, schedule_capacity, schedule_gantt
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Job {
  id: string;
  part_name: string;
  quantity: number;
  cycle_time_min: number;
  setup_time_min: number;
  due_date: string;                  // ISO date
  priority: "critical" | "high" | "normal" | "low";
  required_machine_type?: string;    // "VMC", "5-Axis", etc.
  required_tools?: string[];
  predecessor_job_id?: string;       // must complete before this starts
}

export interface MachineSlot {
  machine_id: string;
  machine_name: string;
  type: string;
  available_hours_per_day: number;   // typically 16 (2-shift)
  current_load_hours: number;
  efficiency: number;                // 0.0–1.0
}

export interface ScheduleResult {
  assignments: JobAssignment[];
  total_makespan_days: number;
  machine_utilization: Record<string, number>;
  late_jobs: string[];
  schedule_score: number;            // 0–100
}

export interface JobAssignment {
  job_id: string;
  machine_id: string;
  start_day: number;
  end_day: number;
  start_hour: number;
  duration_hours: number;
  on_time: boolean;
  slack_days: number;
}

export interface CapacityReport {
  total_hours_needed: number;
  total_hours_available: number;
  utilization_pct: number;
  bottleneck_machine: string | null;
  overtime_needed_hours: number;
  feasible: boolean;
}

export type ScheduleStrategy = "EDD" | "SPT" | "priority" | "balanced";

// ============================================================================
// SCHEDULING LOGIC
// ============================================================================

const PRIORITY_WEIGHT: Record<string, number> = { critical: 4, high: 3, normal: 2, low: 1 };

function jobDuration(job: Job): number {
  return (job.quantity * job.cycle_time_min + job.setup_time_min) / 60;
}

function daysBetween(d1: string, d2: string): number {
  return (new Date(d1).getTime() - new Date(d2).getTime()) / (1000 * 60 * 60 * 24);
}

function sortByStrategy(jobs: Job[], strategy: ScheduleStrategy): Job[] {
  const sorted = [...jobs];
  switch (strategy) {
    case "EDD":
      sorted.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
      break;
    case "SPT":
      sorted.sort((a, b) => jobDuration(a) - jobDuration(b));
      break;
    case "priority":
      sorted.sort((a, b) => (PRIORITY_WEIGHT[b.priority] || 2) - (PRIORITY_WEIGHT[a.priority] || 2));
      break;
    case "balanced":
      sorted.sort((a, b) => {
        const pa = PRIORITY_WEIGHT[a.priority] || 2;
        const pb = PRIORITY_WEIGHT[b.priority] || 2;
        if (pa !== pb) return pb - pa;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      });
      break;
  }
  return sorted;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SchedulingEngine {
  schedule(jobs: Job[], machines: MachineSlot[], strategy: ScheduleStrategy = "balanced"): ScheduleResult {
    const sortedJobs = sortByStrategy(jobs, strategy);
    const machineLoads = new Map<string, number>(); // machine_id → cumulative hours
    for (const m of machines) {
      machineLoads.set(m.machine_id, m.current_load_hours);
    }

    const assignments: JobAssignment[] = [];
    const today = new Date().toISOString().slice(0, 10);
    const lateJobs: string[] = [];

    for (const job of sortedJobs) {
      // Find best machine for this job
      const eligible = machines.filter(m =>
        !job.required_machine_type || m.type === job.required_machine_type
      );

      if (eligible.length === 0) {
        // No eligible machine — assign to first available
        const fallback = machines[0];
        eligible.push(fallback);
      }

      // Pick machine with least load (load balancing)
      let bestMachine = eligible[0];
      let bestLoad = machineLoads.get(bestMachine.machine_id) || 0;
      for (const m of eligible) {
        const load = machineLoads.get(m.machine_id) || 0;
        if (load < bestLoad) { bestMachine = m; bestLoad = load; }
      }

      const duration = jobDuration(job) / Math.max(bestMachine.efficiency, 0.5);
      const startHour = bestLoad;
      const endHour = startHour + duration;

      const startDay = Math.floor(startHour / bestMachine.available_hours_per_day);
      const endDay = Math.ceil(endHour / bestMachine.available_hours_per_day);

      const dueDays = Math.max(0, daysBetween(job.due_date, today));
      const onTime = endDay <= dueDays;
      if (!onTime) lateJobs.push(job.id);

      assignments.push({
        job_id: job.id, machine_id: bestMachine.machine_id,
        start_day: startDay, end_day: endDay,
        start_hour: Math.round(startHour * 100) / 100,
        duration_hours: Math.round(duration * 100) / 100,
        on_time: onTime,
        slack_days: Math.round((dueDays - endDay) * 10) / 10,
      });

      machineLoads.set(bestMachine.machine_id, endHour);
    }

    // Machine utilization
    const utilization: Record<string, number> = {};
    const maxEndDay = assignments.reduce((max, a) => Math.max(max, a.end_day), 0);
    for (const m of machines) {
      const totalLoad = machineLoads.get(m.machine_id) || 0;
      const totalAvailable = maxEndDay * m.available_hours_per_day;
      utilization[m.machine_id] = totalAvailable > 0
        ? Math.round((totalLoad / totalAvailable) * 10000) / 100
        : 0;
    }

    const scheduleScore = Math.max(0, Math.min(100,
      100 - (lateJobs.length / Math.max(jobs.length, 1)) * 50
      - (maxEndDay > 30 ? 20 : 0)
    ));

    return {
      assignments, total_makespan_days: maxEndDay,
      machine_utilization: utilization, late_jobs: lateJobs,
      schedule_score: Math.round(scheduleScore),
    };
  }

  optimize(jobs: Job[], machines: MachineSlot[]): { best_strategy: ScheduleStrategy; results: Record<string, ScheduleResult> } {
    const strategies: ScheduleStrategy[] = ["EDD", "SPT", "priority", "balanced"];
    const results: Record<string, ScheduleResult> = {};
    let bestStrategy: ScheduleStrategy = "balanced";
    let bestScore = -1;

    for (const s of strategies) {
      const result = this.schedule(jobs, machines, s);
      results[s] = result;
      if (result.schedule_score > bestScore) {
        bestScore = result.schedule_score;
        bestStrategy = s;
      }
    }

    return { best_strategy: bestStrategy, results };
  }

  capacity(jobs: Job[], machines: MachineSlot[], horizonDays: number = 30): CapacityReport {
    let totalNeeded = 0;
    for (const job of jobs) totalNeeded += jobDuration(job);

    let totalAvailable = 0;
    let bottleneck: string | null = null;
    let bottleneckUtil = 0;

    for (const m of machines) {
      const avail = m.available_hours_per_day * horizonDays * m.efficiency;
      totalAvailable += avail;
      const util = m.current_load_hours / Math.max(avail, 1);
      if (util > bottleneckUtil) { bottleneckUtil = util; bottleneck = m.machine_id; }
    }

    const utilPct = totalAvailable > 0 ? (totalNeeded / totalAvailable) * 100 : 100;
    const overtime = Math.max(0, totalNeeded - totalAvailable);

    return {
      total_hours_needed: Math.round(totalNeeded * 100) / 100,
      total_hours_available: Math.round(totalAvailable * 100) / 100,
      utilization_pct: Math.round(utilPct * 10) / 10,
      bottleneck_machine: bottleneck,
      overtime_needed_hours: Math.round(overtime * 100) / 100,
      feasible: totalNeeded <= totalAvailable,
    };
  }
}

export const schedulingEngine = new SchedulingEngine();
