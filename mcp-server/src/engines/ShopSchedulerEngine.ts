/**
 * PRISM MCP Server — Shop Scheduler Engine (R7-MS5)
 *
 * Job-shop scheduling + machine utilization analysis for manufacturing floors.
 * Given N jobs and M machines, produces an optimized schedule that:
 *   - Respects machine capability constraints (5-axis, live tooling, etc.)
 *   - Honors priority levels (rush > normal > low)
 *   - Minimizes makespan / tardiness or maximizes utilization
 *   - Identifies bottleneck machines and recommends balancing actions
 *
 * Algorithm: Priority-dispatching heuristic with capability filtering.
 *   optimize_for = 'min_makespan'     → Longest Processing Time first (LPT)
 *   optimize_for = 'min_tardiness'    → Earliest Due Date first (EDD)
 *   optimize_for = 'max_utilization'  → Spread load across machines evenly
 *   optimize_for = 'balanced'         → Weighted combo of all three
 *
 * @module ShopSchedulerEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OperationInput {
  type: string;                      // milling, turning, grinding, etc.
  estimated_time_min: number;
  required_capabilities?: string[];  // "5-axis", "live tooling", etc.
  material?: string;
  tolerance_mm?: number;
}

export interface JobInput {
  id: string;
  operations: OperationInput[];
  due_date?: string;                 // ISO date string or minutes-from-now number
  priority: 'rush' | 'normal' | 'low';
}

export interface MachineInput {
  id: string;
  capabilities?: string[];
  max_rpm?: number;
  max_power_kw?: number;
  hourly_rate?: number;
}

export type OptimizeFor = 'min_makespan' | 'min_tardiness' | 'max_utilization' | 'balanced';

export interface ShopScheduleInput {
  jobs: JobInput[];
  machines: (string | MachineInput)[];
  optimize_for?: OptimizeFor;
  schedule_start?: string;           // ISO date (default: now)
}

export interface Assignment {
  job_id: string;
  operation_index: number;
  operation_type: string;
  start_time_min: number;
  end_time_min: number;
}

export interface MachineSchedule {
  machine: string;
  assignments: Assignment[];
  utilization_pct: number;
  total_busy_min: number;
}

export interface ScheduleMetrics {
  total_makespan_min: number;
  average_utilization_pct: number;
  jobs_on_time: number;
  jobs_late: number;
  total_jobs: number;
  total_operations: number;
  unschedulable_operations: number;
}

export interface ShopScheduleResult {
  schedule: MachineSchedule[];
  metrics: ScheduleMetrics;
  bottlenecks: string[];
  unscheduled: { job_id: string; operation_index: number; reason: string }[];
  safety: { score: number; warnings: string[] };
}

export interface MachineUtilizationInput {
  machines: (string | MachineInput)[];
  schedule?: ShopScheduleResult;
  jobs?: JobInput[];
}

export interface MachineUtilizationResult {
  machines: {
    id: string;
    capabilities: string[];
    utilization_pct: number;
    assigned_jobs: number;
    busy_min: number;
    idle_min: number;
    status: 'overloaded' | 'balanced' | 'underutilized' | 'idle';
  }[];
  fleet_summary: {
    total_machines: number;
    avg_utilization_pct: number;
    overloaded_count: number;
    underutilized_count: number;
    idle_count: number;
  };
  recommendations: string[];
  capability_gaps: string[];
  safety: { score: number; warnings: string[] };
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PRIORITY_WEIGHT: Record<string, number> = { rush: 0, normal: 1, low: 2 };

// Default capabilities per machine type (fallback when registry not available)
const DEFAULT_MACHINE_CAPS: Record<string, string[]> = {
  'CNC_MILL_3AXIS': ['milling', '3-axis'],
  'CNC_MILL_5AXIS': ['milling', '3-axis', '5-axis'],
  'CNC_LATHE': ['turning', 'boring', 'threading'],
  'CNC_LATHE_LIVE': ['turning', 'boring', 'threading', 'live tooling', 'milling'],
  'GRINDER': ['grinding'],
  'EDM': ['edm', 'wire edm'],
  'DRILL_PRESS': ['drilling'],
};

// ============================================================================
// MACHINE RESOLUTION
// ============================================================================

interface ResolvedMachine {
  id: string;
  capabilities: string[];
  hourly_rate: number;
}

function resolveMachines(machines: (string | MachineInput)[]): ResolvedMachine[] {
  return machines.map((m) => {
    if (typeof m === 'string') {
      // Try to match known machine type prefix
      const upper = m.toUpperCase();
      for (const [key, caps] of Object.entries(DEFAULT_MACHINE_CAPS)) {
        if (upper.includes(key) || upper.includes(key.replace(/_/g, ''))) {
          return { id: m, capabilities: caps, hourly_rate: 80 };
        }
      }
      // Generic machine — assume universal capabilities
      return { id: m, capabilities: ['milling', 'turning', 'drilling', 'grinding', '3-axis'], hourly_rate: 80 };
    }
    return {
      id: m.id,
      capabilities: m.capabilities ?? ['milling', 'turning', 'drilling', '3-axis'],
      hourly_rate: m.hourly_rate ?? 80,
    };
  });
}

// ============================================================================
// CAPABILITY CHECKING
// ============================================================================

function machineCanDoOp(machine: ResolvedMachine, op: OperationInput): boolean {
  if (!op.required_capabilities || op.required_capabilities.length === 0) {
    // No specific requirements — check if machine supports op type
    const opType = op.type.toLowerCase();
    return machine.capabilities.some(
      (c) => c.toLowerCase().includes(opType) || opType.includes(c.toLowerCase())
    );
  }
  // All required capabilities must be present
  return op.required_capabilities.every((req) =>
    machine.capabilities.some(
      (cap) => cap.toLowerCase() === req.toLowerCase()
    )
  );
}

// ============================================================================
// SCHEDULING ALGORITHM
// ============================================================================

interface OpTask {
  job_id: string;
  op_index: number;
  op: OperationInput;
  priority: number;       // 0 = rush, 1 = normal, 2 = low
  due_min: number;         // Due date as minutes from schedule start
  total_job_time: number;  // Sum of all ops in this job
}

function parseDueDate(due_date: string | undefined, scheduleStart: number): number {
  if (!due_date) return Infinity;
  // Try as number (minutes from now)
  const num = Number(due_date);
  if (!isNaN(num)) return num;
  // Try as ISO date
  const d = new Date(due_date);
  if (!isNaN(d.getTime())) {
    return Math.max(0, (d.getTime() - scheduleStart) / 60000);
  }
  return Infinity;
}

function buildOpTasks(jobs: JobInput[], scheduleStart: number): OpTask[] {
  const tasks: OpTask[] = [];
  for (const job of jobs) {
    const dueMin = parseDueDate(job.due_date, scheduleStart);
    const totalJobTime = job.operations.reduce((s, op) => s + op.estimated_time_min, 0);
    for (let i = 0; i < job.operations.length; i++) {
      tasks.push({
        job_id: job.id,
        op_index: i,
        op: job.operations[i],
        priority: PRIORITY_WEIGHT[job.priority] ?? 1,
        due_min: dueMin,
        total_job_time: totalJobTime,
      });
    }
  }
  return tasks;
}

function sortTasks(tasks: OpTask[], optimizeFor: OptimizeFor): OpTask[] {
  const sorted = [...tasks];
  sorted.sort((a, b) => {
    // Priority always first (rush=0 < normal=1 < low=2)
    if (a.priority !== b.priority) return a.priority - b.priority;

    switch (optimizeFor) {
      case 'min_makespan':
        // LPT: Longest Processing Time first → better load balancing
        return b.op.estimated_time_min - a.op.estimated_time_min;
      case 'min_tardiness':
        // EDD: Earliest Due Date first
        return a.due_min - b.due_min;
      case 'max_utilization':
        // Shortest Processing Time first → fills gaps
        return a.op.estimated_time_min - b.op.estimated_time_min;
      case 'balanced':
      default:
        // EDD with LPT tie-breaking
        if (a.due_min !== b.due_min) return a.due_min - b.due_min;
        return b.op.estimated_time_min - a.op.estimated_time_min;
    }
  });
  return sorted;
}

export function shopSchedule(input: ShopScheduleInput): ShopScheduleResult {
  const machines = resolveMachines(input.machines);
  const optimizeFor = input.optimize_for ?? 'balanced';
  const scheduleStart = input.schedule_start ? new Date(input.schedule_start).getTime() : Date.now();
  const warnings: string[] = [];

  if (machines.length === 0) {
    return {
      schedule: [],
      metrics: { total_makespan_min: 0, average_utilization_pct: 0, jobs_on_time: 0, jobs_late: 0, total_jobs: 0, total_operations: 0, unschedulable_operations: 0 },
      bottlenecks: [],
      unscheduled: [],
      safety: { score: 0.90, warnings: ['No machines provided'] },
    };
  }
  if (input.jobs.length === 0) {
    return {
      schedule: machines.map((m) => ({ machine: m.id, assignments: [], utilization_pct: 0, total_busy_min: 0 })),
      metrics: { total_makespan_min: 0, average_utilization_pct: 0, jobs_on_time: 0, jobs_late: 0, total_jobs: 0, total_operations: 0, unschedulable_operations: 0 },
      bottlenecks: [],
      unscheduled: [],
      safety: { score: 0.95, warnings: [] },
    };
  }

  // Build and sort operation tasks
  const tasks = buildOpTasks(input.jobs, scheduleStart);
  const sorted = sortTasks(tasks, optimizeFor);

  // Track machine availability (earliest free time per machine)
  const machineAvail = new Map<string, number>();
  for (const m of machines) machineAvail.set(m.id, 0);

  // Track job operation sequencing (op i+1 can't start before op i finishes)
  const jobOpEnd = new Map<string, Map<number, number>>(); // job_id → op_index → end_time

  // Build schedule
  const machineAssignments = new Map<string, Assignment[]>();
  for (const m of machines) machineAssignments.set(m.id, []);

  const unscheduled: { job_id: string; operation_index: number; reason: string }[] = [];

  for (const task of sorted) {
    // Find compatible machines
    const compatible = machines.filter((m) => machineCanDoOp(m, task.op));

    if (compatible.length === 0) {
      unscheduled.push({
        job_id: task.job_id,
        operation_index: task.op_index,
        reason: `No machine has capabilities: ${(task.op.required_capabilities ?? [task.op.type]).join(', ')}`,
      });
      continue;
    }

    // Earliest start = max(machine free, previous op of same job done)
    const prevOpEnd = jobOpEnd.get(task.job_id)?.get(task.op_index - 1) ?? 0;

    // Pick the machine that gives earliest completion
    let bestMachine = compatible[0];
    let bestStart = Math.max(machineAvail.get(bestMachine.id) ?? 0, prevOpEnd);

    if (optimizeFor === 'max_utilization') {
      // For utilization: pick machine with least total busy time (spread load)
      let minBusy = Infinity;
      for (const m of compatible) {
        const busy = (machineAssignments.get(m.id) ?? []).reduce(
          (s, a) => s + (a.end_time_min - a.start_time_min), 0
        );
        const start = Math.max(machineAvail.get(m.id) ?? 0, prevOpEnd);
        if (busy < minBusy || (busy === minBusy && start < bestStart)) {
          minBusy = busy;
          bestMachine = m;
          bestStart = start;
        }
      }
    } else {
      // For other modes: pick machine that finishes earliest
      for (const m of compatible) {
        const start = Math.max(machineAvail.get(m.id) ?? 0, prevOpEnd);
        if (start < bestStart) {
          bestMachine = m;
          bestStart = start;
        }
      }
    }

    const endTime = bestStart + task.op.estimated_time_min;

    // Record assignment
    const assignment: Assignment = {
      job_id: task.job_id,
      operation_index: task.op_index,
      operation_type: task.op.type,
      start_time_min: +bestStart.toFixed(1),
      end_time_min: +endTime.toFixed(1),
    };
    machineAssignments.get(bestMachine.id)!.push(assignment);
    machineAvail.set(bestMachine.id, endTime);

    // Track job sequencing
    if (!jobOpEnd.has(task.job_id)) jobOpEnd.set(task.job_id, new Map());
    jobOpEnd.get(task.job_id)!.set(task.op_index, endTime);
  }

  // Compute metrics
  const makespan = Math.max(...Array.from(machineAvail.values()));
  const schedule: MachineSchedule[] = machines.map((m) => {
    const assignments = machineAssignments.get(m.id) ?? [];
    // Sort assignments by start time
    assignments.sort((a, b) => a.start_time_min - b.start_time_min);
    const busyMin = assignments.reduce((s, a) => s + (a.end_time_min - a.start_time_min), 0);
    const utilPct = makespan > 0 ? +(busyMin / makespan * 100).toFixed(1) : 0;
    return { machine: m.id, assignments, utilization_pct: utilPct, total_busy_min: +busyMin.toFixed(1) };
  });

  const avgUtil = schedule.length > 0
    ? +(schedule.reduce((s, ms) => s + ms.utilization_pct, 0) / schedule.length).toFixed(1)
    : 0;

  // Check tardiness
  let onTime = 0;
  let late = 0;
  for (const job of input.jobs) {
    const dueMin = parseDueDate(job.due_date, scheduleStart);
    if (dueMin === Infinity) { onTime++; continue; }
    // Find latest end time across all ops of this job
    let maxEnd = 0;
    for (const ms of schedule) {
      for (const a of ms.assignments) {
        if (a.job_id === job.id && a.end_time_min > maxEnd) maxEnd = a.end_time_min;
      }
    }
    if (maxEnd <= dueMin) onTime++;
    else late++;
  }

  // Bottleneck detection
  const bottlenecks: string[] = [];
  for (const ms of schedule) {
    if (ms.utilization_pct > 90) {
      bottlenecks.push(`${ms.machine} is overloaded (${ms.utilization_pct}% utilization) — consider adding capacity or outsourcing`);
    }
  }

  // Check if a single machine is a constraint
  const capabilityDemand = new Map<string, number>();
  for (const task of sorted) {
    for (const cap of (task.op.required_capabilities ?? [task.op.type])) {
      capabilityDemand.set(cap, (capabilityDemand.get(cap) ?? 0) + 1);
    }
  }
  for (const [cap, demand] of capabilityDemand) {
    const machinesWithCap = machines.filter((m) =>
      m.capabilities.some((c) => c.toLowerCase() === cap.toLowerCase())
    );
    if (machinesWithCap.length === 1 && demand > 1) {
      bottlenecks.push(`Only ${machinesWithCap[0].id} has "${cap}" capability — single point of failure for ${demand} operations`);
    }
  }

  if (unscheduled.length > 0) {
    warnings.push(`${unscheduled.length} operation(s) could not be scheduled`);
  }

  const safetyScore = unscheduled.length > 0 ? 0.65 : bottlenecks.length > 0 ? 0.80 : 0.95;

  return {
    schedule,
    metrics: {
      total_makespan_min: +makespan.toFixed(1),
      average_utilization_pct: avgUtil,
      jobs_on_time: onTime,
      jobs_late: late,
      total_jobs: input.jobs.length,
      total_operations: sorted.length,
      unschedulable_operations: unscheduled.length,
    },
    bottlenecks,
    unscheduled,
    safety: { score: safetyScore, warnings },
  };
}

// ============================================================================
// MACHINE UTILIZATION ANALYSIS
// ============================================================================

export function machineUtilization(input: MachineUtilizationInput): MachineUtilizationResult {
  const resolved = resolveMachines(input.machines);
  const warnings: string[] = [];

  // If schedule is provided, extract utilization from it
  let scheduleData = input.schedule;
  if (!scheduleData && input.jobs && input.jobs.length > 0) {
    // Generate a schedule to analyze
    scheduleData = shopSchedule({
      jobs: input.jobs,
      machines: input.machines,
      optimize_for: 'balanced',
    });
  }

  const machineStats = resolved.map((m) => {
    const sched = scheduleData?.schedule.find((s) => s.machine === m.id);
    const busyMin = sched?.total_busy_min ?? 0;
    const makespan = scheduleData?.metrics.total_makespan_min ?? 1;
    const utilPct = makespan > 0 ? +(busyMin / makespan * 100).toFixed(1) : 0;
    const assignedJobs = sched ? new Set(sched.assignments.map((a) => a.job_id)).size : 0;

    let status: 'overloaded' | 'balanced' | 'underutilized' | 'idle';
    if (utilPct > 85) status = 'overloaded';
    else if (utilPct > 40) status = 'balanced';
    else if (utilPct > 0) status = 'underutilized';
    else status = 'idle';

    return {
      id: m.id,
      capabilities: m.capabilities,
      utilization_pct: utilPct,
      assigned_jobs: assignedJobs,
      busy_min: +busyMin.toFixed(1),
      idle_min: +(makespan - busyMin).toFixed(1),
      status,
    };
  });

  const overloaded = machineStats.filter((m) => m.status === 'overloaded').length;
  const underutilized = machineStats.filter((m) => m.status === 'underutilized').length;
  const idle = machineStats.filter((m) => m.status === 'idle').length;
  const avgUtil = machineStats.length > 0
    ? +(machineStats.reduce((s, m) => s + m.utilization_pct, 0) / machineStats.length).toFixed(1)
    : 0;

  // Recommendations
  const recommendations: string[] = [];
  if (overloaded > 0) {
    const overloadedNames = machineStats.filter((m) => m.status === 'overloaded').map((m) => m.id);
    recommendations.push(`Redistribute load from overloaded machines: ${overloadedNames.join(', ')}`);
  }
  if (idle > 0 && overloaded > 0) {
    const idleNames = machineStats.filter((m) => m.status === 'idle').map((m) => m.id);
    recommendations.push(`Consider training operators or adding tooling to idle machines (${idleNames.join(', ')}) to absorb overflow`);
  }
  if (underutilized > resolved.length / 2) {
    recommendations.push(`Over half the fleet is underutilized — review staffing and shift patterns`);
  }
  if (avgUtil < 30 && resolved.length > 3) {
    recommendations.push(`Average utilization is only ${avgUtil}% — consolidate jobs to fewer machines to reduce overhead`);
  }
  if (avgUtil > 80) {
    recommendations.push(`Fleet running near capacity (${avgUtil}%) — schedule preventive maintenance during off-peak`);
  }

  // Capability gaps
  const capabilityGaps: string[] = [];
  if (scheduleData?.unscheduled) {
    const missingCaps = new Set<string>();
    for (const u of scheduleData.unscheduled) {
      const match = u.reason.match(/capabilities: (.+)/);
      if (match) match[1].split(', ').forEach((c) => missingCaps.add(c));
    }
    for (const cap of missingCaps) {
      capabilityGaps.push(`No machine has "${cap}" capability — ${scheduleData.unscheduled.filter((u) => u.reason.includes(cap)).length} operation(s) affected`);
    }
  }

  const safetyScore = overloaded > resolved.length / 2 ? 0.70 : 0.90;

  return {
    machines: machineStats,
    fleet_summary: {
      total_machines: resolved.length,
      avg_utilization_pct: avgUtil,
      overloaded_count: overloaded,
      underutilized_count: underutilized,
      idle_count: idle,
    },
    recommendations,
    capability_gaps: capabilityGaps,
    safety: { score: safetyScore, warnings },
  };
}

// ============================================================================
// DISPATCHER ENTRY POINT
// ============================================================================

const ACTIONS: Record<string, (params: Record<string, any>) => any> = {
  shop_schedule: (params) => shopSchedule(params as unknown as ShopScheduleInput),
  machine_utilization: (params) => machineUtilization(params as unknown as MachineUtilizationInput),
};

export function shopScheduler(action: string, params: Record<string, any>): any {
  const fn = ACTIONS[action];
  if (!fn) {
    return { error: `Unknown shop_scheduler action: ${action}`, valid_actions: Object.keys(ACTIONS) };
  }
  return fn(params);
}
