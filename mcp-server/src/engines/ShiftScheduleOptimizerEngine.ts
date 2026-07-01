/**
 * ShiftScheduleOptimizerEngine — Production Shift & Job Schedule Optimization
 *
 * Assigns jobs to machines to minimize idle time and makespan using greedy
 * priority-sorted scheduling. Supports load balancing and what-if analysis.
 *
 * Algorithm: Greedy assignment with priority sorting (due date -> priority ->
 * shortest job first). For each job operation, find machine with earliest
 * available slot matching the required type. Tracks Gantt timeline.
 *
 * @engine ShiftScheduleOptimizerEngine
 * @dispatcher businessDispatcher
 * @actions schedule_optimize, schedule_balance, schedule_what_if
 */

// ── Types ──

export interface JobOperation {
  machine_types: string[];
  cycle_time_min: number;
  setup_time_min?: number;
}

export interface JobInput {
  id: string;
  name: string;
  operations: JobOperation[];
  due_date?: string;
  priority?: number;
}

export interface MachineInput {
  id: string;
  type: string;
  available_hours: number;
  shift: string;
  hourly_rate?: number;
}

export interface ScheduleConstraints {
  max_overtime_hours?: number;
  prefer_due_date?: boolean;
}

export interface ScheduleInput {
  jobs: JobInput[];
  machines: MachineInput[];
  constraints?: ScheduleConstraints;
}

export interface ScheduleEntry {
  machine_id: string;
  job_id: string;
  start_min: number;
  end_min: number;
  operation_index: number;
}

export interface GanttBlock {
  job: string;
  start: number;
  end: number;
  type: "setup" | "run" | "idle";
}

export interface GanttRow {
  machine: string;
  blocks: GanttBlock[];
}

export interface LateJob {
  job_id: string;
  due_date: string;
  completion_date: string;
  days_late: number;
}

export interface ScheduleResult {
  schedule: ScheduleEntry[];
  makespan_hours: number;
  utilization_pct_per_machine: Record<string, number>;
  idle_time_total_hours: number;
  late_jobs: LateJob[];
  gantt_data: GanttRow[];
}

export interface LoadBalanceInput {
  machines: Array<{ id: string; current_load_hours: number; capacity_hours: number; type: string }>;
  unassigned_jobs: Array<{ id: string; required_hours: number; machine_type: string }>;
}

export interface LoadBalanceResult {
  assignments: Array<{ job_id: string; machine_id: string }>;
  load_balance_score: number;
  overloaded: string[];
  underutilized: string[];
}

export interface WhatIfInput {
  current_schedule: ScheduleResult;
  new_machine: MachineInput;
}

export interface WhatIfResult {
  new_makespan_hours: number;
  makespan_improvement_pct: number;
  new_utilization: Record<string, number>;
  roi_estimate: number;
}

// ── Engine ──

class ShiftScheduleOptimizerEngine {
  /**
   * Assign jobs to machines minimizing idle time and makespan.
   * Greedy: sort jobs by due_date -> priority -> shortest total time.
   * For each operation, pick the machine with the earliest available slot.
   */
  optimizeSchedule(input: ScheduleInput): ScheduleResult {
    const { jobs, machines, constraints } = input;
    if (!jobs || jobs.length === 0) {
      // No jobs -> graceful empty schedule. Guard machines with `?? []` too: an empty {} body has neither
      // jobs nor machines and was crashing on machines.map here. The jobs-present + no-machines case is
      // intentionally handled by the explicit throw below (a tested contract) -- do NOT swallow it here.
      return {
        schedule: [], makespan_hours: 0,
        utilization_pct_per_machine: Object.fromEntries((machines ?? []).map(m => [m.id, 0])),
        idle_time_total_hours: 0, late_jobs: [], gantt_data: [],
      };
    }
    if (!machines || machines.length === 0) {
      throw new Error("No machines provided for scheduling");
    }

    const preferDueDate = constraints?.prefer_due_date !== false;
    const maxOvertimeMin = (constraints?.max_overtime_hours ?? 0) * 60;

    // Sort jobs: due date ascending, then priority descending, then shortest job first
    const sortedJobs = [...jobs].sort((a, b) => {
      if (preferDueDate && a.due_date && b.due_date) {
        const da = new Date(a.due_date).getTime();
        const db = new Date(b.due_date).getTime();
        if (da !== db) return da - db;
      }
      const pa = a.priority ?? 0;
      const pb = b.priority ?? 0;
      if (pa !== pb) return pb - pa; // higher priority first
      const ta = a.operations.reduce((s, o) => s + o.cycle_time_min + (o.setup_time_min ?? 0), 0);
      const tb = b.operations.reduce((s, o) => s + o.cycle_time_min + (o.setup_time_min ?? 0), 0);
      return ta - tb; // shortest job first
    });

    // Track machine availability (minutes from shift start)
    const machineAvail: Record<string, number> = {};
    const machineCapacity: Record<string, number> = {};
    const machineBusy: Record<string, number> = {}; // total busy minutes
    for (const m of machines) {
      machineAvail[m.id] = 0;
      machineCapacity[m.id] = m.available_hours * 60 + maxOvertimeMin;
      machineBusy[m.id] = 0;
    }

    const schedule: ScheduleEntry[] = [];
    const ganttBlocks: Record<string, GanttBlock[]> = {};
    for (const m of machines) ganttBlocks[m.id] = [];

    // Track job completion times for late detection
    const jobCompletion: Record<string, number> = {};

    for (const job of sortedJobs) {
      let jobLatestEnd = 0;
      for (let opIdx = 0; opIdx < job.operations.length; opIdx++) {
        const op = job.operations[opIdx];
        const setupMin = op.setup_time_min ?? 0;
        const totalOpMin = setupMin + op.cycle_time_min;

        // Find best machine: matching type, earliest available
        let bestMachine: MachineInput | null = null;
        let bestStart = Infinity;

        for (const m of machines) {
          if (!op.machine_types.includes(m.type)) continue;
          const avail = machineAvail[m.id];
          // Also require that the previous op of this job is done
          const earliestStart = Math.max(avail, jobLatestEnd);
          if (earliestStart + totalOpMin <= machineCapacity[m.id] && earliestStart < bestStart) {
            bestStart = earliestStart;
            bestMachine = m;
          }
        }

        // If no machine found within capacity, pick least-loaded matching machine anyway
        if (!bestMachine) {
          let minAvail = Infinity;
          for (const m of machines) {
            if (!op.machine_types.includes(m.type)) continue;
            const earliestStart = Math.max(machineAvail[m.id], jobLatestEnd);
            if (earliestStart < minAvail) {
              minAvail = earliestStart;
              bestMachine = m;
              bestStart = earliestStart;
            }
          }
        }

        if (!bestMachine) {
          // No matching machine type at all — skip operation
          continue;
        }

        const startMin = bestStart;
        const endMin = startMin + totalOpMin;

        schedule.push({
          machine_id: bestMachine.id,
          job_id: job.id,
          start_min: startMin,
          end_min: endMin,
          operation_index: opIdx,
        });

        // Add Gantt blocks
        if (setupMin > 0) {
          ganttBlocks[bestMachine.id].push({
            job: job.id, start: startMin, end: startMin + setupMin, type: "setup",
          });
          ganttBlocks[bestMachine.id].push({
            job: job.id, start: startMin + setupMin, end: endMin, type: "run",
          });
        } else {
          ganttBlocks[bestMachine.id].push({
            job: job.id, start: startMin, end: endMin, type: "run",
          });
        }

        machineAvail[bestMachine.id] = endMin;
        machineBusy[bestMachine.id] += totalOpMin;
        jobLatestEnd = endMin;
      }
      jobCompletion[job.id] = jobLatestEnd;
    }

    // Calculate makespan
    const makespanMin = Math.max(0, ...Object.values(machineAvail));
    const makespanHours = makespanMin / 60;

    // Calculate utilization per machine
    const utilization: Record<string, number> = {};
    let totalIdleMin = 0;
    for (const m of machines) {
      const busy = machineBusy[m.id];
      const totalUsed = machineAvail[m.id];
      const capacity = m.available_hours * 60;
      utilization[m.id] = capacity > 0 ? Math.round((busy / capacity) * 1000) / 10 : 0;
      totalIdleMin += Math.max(0, totalUsed - busy);
      // Also add idle from end of last job to shift end
      if (totalUsed < capacity) {
        totalIdleMin += capacity - totalUsed;
      }
    }

    // Add idle blocks to Gantt
    for (const m of machines) {
      const blocks = ganttBlocks[m.id];
      blocks.sort((a, b) => a.start - b.start);
      const idleBlocks: GanttBlock[] = [];
      let cursor = 0;
      for (const b of blocks) {
        if (b.start > cursor) {
          idleBlocks.push({ job: "", start: cursor, end: b.start, type: "idle" });
        }
        cursor = Math.max(cursor, b.end);
      }
      // Idle at end of shift
      const shiftEnd = m.available_hours * 60;
      if (cursor < shiftEnd) {
        idleBlocks.push({ job: "", start: cursor, end: shiftEnd, type: "idle" });
      }
      ganttBlocks[m.id] = [...blocks, ...idleBlocks].sort((a, b) => a.start - b.start);
    }

    // Late jobs
    const lateJobs: LateJob[] = [];
    const now = new Date();
    for (const job of jobs) {
      if (!job.due_date) continue;
      const completionMin = jobCompletion[job.id] ?? 0;
      // Convert minutes to date (assume shift starts at now)
      const completionDate = new Date(now.getTime() + completionMin * 60000);
      const dueDate = new Date(job.due_date);
      if (completionDate > dueDate) {
        const daysLate = Math.ceil((completionDate.getTime() - dueDate.getTime()) / 86400000);
        lateJobs.push({
          job_id: job.id,
          due_date: job.due_date,
          completion_date: completionDate.toISOString().slice(0, 10),
          days_late: daysLate,
        });
      }
    }

    return {
      schedule,
      makespan_hours: Math.round(makespanHours * 100) / 100,
      utilization_pct_per_machine: utilization,
      idle_time_total_hours: Math.round((totalIdleMin / 60) * 100) / 100,
      late_jobs: lateJobs,
      gantt_data: machines.map(m => ({ machine: m.id, blocks: ganttBlocks[m.id] })),
    };
  }

  /**
   * Balance load across machines by assigning unassigned jobs to least-loaded
   * compatible machines. Uses greedy bin-packing.
   */
  balanceLoad(input: LoadBalanceInput): LoadBalanceResult {
    const { machines, unassigned_jobs } = input;
    if (!machines || machines.length === 0) {
      return { assignments: [], load_balance_score: 0, overloaded: [], underutilized: [] };
    }

    // Clone load state
    const load: Record<string, number> = {};
    const capacity: Record<string, number> = {};
    const typeMap: Record<string, string[]> = {}; // type -> machine ids
    for (const m of machines) {
      load[m.id] = m.current_load_hours;
      capacity[m.id] = m.capacity_hours;
      if (!typeMap[m.type]) typeMap[m.type] = [];
      typeMap[m.type].push(m.id);
    }

    const assignments: Array<{ job_id: string; machine_id: string }> = [];

    // Sort jobs: largest first (first-fit decreasing bin packing)
    const sorted = [...unassigned_jobs].sort((a, b) => b.required_hours - a.required_hours);

    for (const job of sorted) {
      const candidates = typeMap[job.machine_type] ?? [];
      if (candidates.length === 0) continue;

      // Pick machine with most remaining capacity
      let bestId = candidates[0];
      let bestRemaining = capacity[bestId] - load[bestId];
      for (const cid of candidates) {
        const rem = capacity[cid] - load[cid];
        if (rem > bestRemaining) {
          bestRemaining = rem;
          bestId = cid;
        }
      }

      assignments.push({ job_id: job.id, machine_id: bestId });
      load[bestId] += job.required_hours;
    }

    // Calculate balance score: 1 - coefficient of variation of utilization ratios
    const utilRatios = machines.map(m => load[m.id] / Math.max(capacity[m.id], 0.001));
    const mean = utilRatios.reduce((s, v) => s + v, 0) / utilRatios.length;
    const variance = utilRatios.reduce((s, v) => s + (v - mean) ** 2, 0) / utilRatios.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;
    const balanceScore = Math.max(0, Math.min(1, Math.round((1 - cv) * 1000) / 1000));

    const overloaded = machines.filter(m => load[m.id] > capacity[m.id]).map(m => m.id);
    const underutilized = machines.filter(m => load[m.id] / Math.max(capacity[m.id], 0.001) < 0.5).map(m => m.id);

    return { assignments, load_balance_score: balanceScore, overloaded, underutilized };
  }

  /**
   * What-if analysis: estimate impact of adding a new machine to an existing schedule.
   */
  whatIfAddMachine(input: WhatIfInput): WhatIfResult {
    const { current_schedule, new_machine } = input;
    if (!current_schedule || !new_machine) {
      // No baseline schedule / candidate machine -> graceful zero-delta result. Was crashing on
      // current_schedule.makespan_hours when the input lacked a baseline (e.g. an empty {} body).
      return { new_makespan_hours: 0, makespan_improvement_pct: 0, new_utilization: {}, roi_estimate: 0 };
    }
    const currentMakespan = current_schedule.makespan_hours;

    // Estimate: redistribute work that matches the new machine's type
    // Count how much work could shift to the new machine
    const matchingEntries = current_schedule.schedule.filter(e => {
      // Check if any gantt row's blocks have this machine type's work
      return true; // We'll estimate based on utilization
    });

    // Find machines with highest utilization that match the new machine type
    const highUtilMachines = Object.entries(current_schedule.utilization_pct_per_machine)
      .filter(([, u]) => u > 70)
      .sort(([, a], [, b]) => b - a);

    let redistributableHours = 0;
    for (const [machineId, util] of highUtilMachines) {
      // Estimate: could offload (util - 70)% of that machine's work
      const machineBlocks = current_schedule.gantt_data.find(g => g.machine === machineId);
      if (!machineBlocks) continue;
      const totalMin = machineBlocks.blocks
        .filter(b => b.type === "run" || b.type === "setup")
        .reduce((s, b) => s + (b.end - b.start), 0);
      redistributableHours += (totalMin / 60) * Math.max(0, (util - 70) / 100);
    }

    // Cap by new machine capacity
    const availableCapacity = new_machine.available_hours;
    const actualRedistributed = Math.min(redistributableHours, availableCapacity);

    // Estimate new makespan
    const reductionFactor = currentMakespan > 0 ? actualRedistributed / (currentMakespan * Math.max(highUtilMachines.length, 1)) : 0;
    const newMakespan = Math.max(0, currentMakespan * (1 - reductionFactor));
    const improvementPct = currentMakespan > 0 ? ((currentMakespan - newMakespan) / currentMakespan) * 100 : 0;

    // New utilization estimate
    const newUtilization: Record<string, number> = { ...current_schedule.utilization_pct_per_machine };
    for (const [machineId, util] of highUtilMachines) {
      newUtilization[machineId] = Math.max(50, util - reductionFactor * 100);
    }
    newUtilization[new_machine.id] = availableCapacity > 0
      ? Math.round((actualRedistributed / availableCapacity) * 1000) / 10
      : 0;

    // ROI estimate: savings from reduced makespan vs machine cost
    const hourlyRate = new_machine.hourly_rate ?? 75;
    const savingsPerShift = (currentMakespan - newMakespan) * hourlyRate;
    const dailyCost = availableCapacity * hourlyRate;
    const roi = dailyCost > 0 ? Math.round((savingsPerShift / dailyCost) * 1000) / 1000 : 0;

    return {
      new_makespan_hours: Math.round(newMakespan * 100) / 100,
      makespan_improvement_pct: Math.round(improvementPct * 100) / 100,
      new_utilization: newUtilization,
      roi_estimate: roi,
    };
  }
}

/** Singleton */
export const shiftScheduleOptimizerEngine = new ShiftScheduleOptimizerEngine();
