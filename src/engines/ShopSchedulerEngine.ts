/**
 * PRISM MCP Server — Shop Scheduler Engine (R7-MS5)
 *
 * Canonical scheduling engine. Consolidates ShopScheduler (priority-dispatch
 * with capability filtering) and JobShopSchedulingEngine (academic OR algorithms:
 * dispatching rules, Johnson's 2-machine flow shop, multi-machine job shop, CPM).
 *
 * U-CONSOL2: JobShopSchedulingEngine merged into this engine.
 *
 * Practical scheduling (multi-machine, capability-aware):
 *   optimize_for = 'min_makespan'     → Longest Processing Time first (LPT)
 *   optimize_for = 'min_tardiness'    → Earliest Due Date first (EDD)
 *   optimize_for = 'max_utilization'  → Spread load across machines evenly
 *   optimize_for = 'balanced'         → Weighted combo of all three
 *
 * Academic OR scheduling (merged from JobShopSchedulingEngine):
 *   scheduleSingleMachine()  → 6 dispatching rules (FIFO, SPT, LPT, EDD, CR, SLACK)
 *   johnsonsAlgorithm()      → Johnson's 2-machine flow shop (makespan minimization)
 *   scheduleJobShop()        → Multi-machine job shop simulation with dispatch rules
 *   criticalPathMethod()     → CPM with forward/backward pass and critical path
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

/** Job Input configuration/data structure.
 */
export interface JobInput {
  id: string;
  operations: OperationInput[];
  due_date?: string;                 // ISO date string or minutes-from-now number
  priority: 'rush' | 'normal' | 'low';
}

/** Machine Input configuration/data structure.
 */
export interface MachineInput {
  id: string;
  capabilities?: string[];
  max_rpm?: number;
  max_power_kw?: number;
  hourly_rate?: number;
}

/** Optimize For type definition.
 */
export type OptimizeFor = 'min_makespan' | 'min_tardiness' | 'max_utilization' | 'balanced';

/** Shop Schedule Input configuration/data structure.
 */
export interface ShopScheduleInput {
  jobs: JobInput[];
  machines: (string | MachineInput)[];
  optimize_for?: OptimizeFor;
  schedule_start?: string;           // ISO date (default: now)
}

/** Assignment configuration/data structure.
 */
export interface Assignment {
  job_id: string;
  operation_index: number;
  operation_type: string;
  start_time_min: number;
  end_time_min: number;
}

/** Machine Schedule configuration/data structure.
 */
export interface MachineSchedule {
  machine: string;
  assignments: Assignment[];
  utilization_pct: number;
  total_busy_min: number;
}

/** Schedule Metrics configuration/data structure.
 */
export interface ScheduleMetrics {
  total_makespan_min: number;
  average_utilization_pct: number;
  jobs_on_time: number;
  jobs_late: number;
  total_jobs: number;
  total_operations: number;
  unschedulable_operations: number;
}

/** Shop Schedule Result configuration/data structure.
 */
export interface ShopScheduleResult {
  schedule: MachineSchedule[];
  metrics: ScheduleMetrics;
  bottlenecks: string[];
  unscheduled: { job_id: string; operation_index: number; reason: string }[];
  safety: { score: number; warnings: string[] };
}

/** Machine Utilization Input configuration/data structure.
 */
export interface MachineUtilizationInput {
  machines: (string | MachineInput)[];
  schedule?: ShopScheduleResult;
  jobs?: JobInput[];
}

/** Machine Utilization Result configuration/data structure.
 */
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

// ─── Scheduler Source File Catalog ───────────────────────────────────────────
// Maps 19 extracted MEDIUM-safety business JS files from the PRISM v8.89.002
// monolith that feed into ShopSchedulerEngine workflows. Used for traceability,
// safety auditing, and wiring verification.

/** S C H E D U L E R_ S O U R C E_ F I L E_ C A T A L O G constant.
 */
export const SCHEDULER_SOURCE_FILE_CATALOG: Record<string, {
  filename: string;
  source_dir: string;
  category: string;
  lines: number;
  safety_class: "MEDIUM";
  description: string;
}> = {
  // ── extracted/engines/business/ (11 files) ─────────────────────────────────

  PRISM_FINANCIAL_ENGINE: {
    filename: "PRISM_FINANCIAL_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "financial",
    lines: 183,
    safety_class: "MEDIUM",
    description: "NPV, IRR, and financial viability calculations for capital projects",
  },
  PRISM_INVENTORY_ENGINE: {
    filename: "PRISM_INVENTORY_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "inventory",
    lines: 159,
    safety_class: "MEDIUM",
    description: "EOQ, reorder points, and inventory optimization models",
  },
  PRISM_JOB_COSTING_ENGINE: {
    filename: "PRISM_JOB_COSTING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "costing",
    lines: 379,
    safety_class: "MEDIUM",
    description: "Job cost rollups: labor, machine, material, overhead, and setup rates",
  },
  PRISM_JOB_SHOP_SCHEDULING_ENGINE: {
    filename: "PRISM_JOB_SHOP_SCHEDULING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "scheduling",
    lines: 926,
    safety_class: "MEDIUM",
    description: "Dispatching rules (FIFO, SPT, EDD, CR, SLACK) and job-shop optimization",
  },
  PRISM_JOB_TRACKING_ENGINE: {
    filename: "PRISM_JOB_TRACKING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "tracking",
    lines: 246,
    safety_class: "MEDIUM",
    description: "Job lifecycle state machine: quoted through invoiced/closed",
  },
  PRISM_ORDER_MANAGER: {
    filename: "PRISM_ORDER_MANAGER.js",
    source_dir: "extracted/engines/business",
    category: "orders",
    lines: 330,
    safety_class: "MEDIUM",
    description: "Order creation, work order management, and order lifecycle tracking",
  },
  PRISM_PURCHASING_SYSTEM: {
    filename: "PRISM_PURCHASING_SYSTEM.js",
    source_dir: "extracted/engines/business",
    category: "purchasing",
    lines: 342,
    safety_class: "MEDIUM",
    description: "Supplier catalog (MSC, Grainger, etc.) and procurement workflows",
  },
  PRISM_QUOTING_ENGINE: {
    filename: "PRISM_QUOTING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "quoting",
    lines: 215,
    safety_class: "MEDIUM",
    description: "Quote generation with margin targets, volume discounts, and rush pricing",
  },
  PRISM_REPORTING_ENGINE: {
    filename: "PRISM_REPORTING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "reporting",
    lines: 412,
    safety_class: "MEDIUM",
    description: "KPI dashboards, production summaries, and financial/quality reports",
  },
  PRISM_SCHEDULING_ENGINE_CORE: {
    filename: "PRISM_SCHEDULING_ENGINE.js",
    source_dir: "extracted/engines/business",
    category: "scheduling",
    lines: 182,
    safety_class: "MEDIUM",
    description: "Johnson's algorithm for 2-machine flow shop makespan minimization",
  },
  PRISM_SUBSCRIPTION_SYSTEM: {
    filename: "PRISM_SUBSCRIPTION_SYSTEM.js",
    source_dir: "extracted/engines/business",
    category: "subscription",
    lines: 270,
    safety_class: "MEDIUM",
    description: "Tier definitions (Essentials through Enterprise) and billing configuration",
  },

  // ── extracted/business/ (7 files) ──────────────────────────────────────────

  PRISM_BUSINESS_AI_SYSTEM: {
    filename: "PRISM_BUSINESS_AI_SYSTEM.js",
    source_dir: "extracted/business",
    category: "ai-orchestrator",
    lines: 211,
    safety_class: "MEDIUM",
    description: "Business intelligence orchestrator: wires costing, quoting, analytics, and AI models",
  },
  PRISM_COST_DATABASE: {
    filename: "PRISM_COST_DATABASE.js",
    source_dir: "extracted/business",
    category: "costing",
    lines: 1026,
    safety_class: "MEDIUM",
    description: "Machine TCO hourly rates, material costs, and tooling cost factors",
  },
  PRISM_COST_ESTIMATION: {
    filename: "PRISM_COST_ESTIMATION.js",
    source_dir: "extracted/business",
    category: "costing",
    lines: 213,
    safety_class: "MEDIUM",
    description: "Parametric cost estimation: machine hourly, labor rates, and overhead multipliers",
  },
  PRISM_SCHEDULING_ENGINE_BUSINESS: {
    filename: "PRISM_SCHEDULING_ENGINE.js",
    source_dir: "extracted/business",
    category: "scheduling",
    lines: 175,
    safety_class: "MEDIUM",
    description: "Johnson's algorithm and flow-shop scheduling (business-layer duplicate)",
  },
  PRISM_SHOP_ANALYTICS_ENGINE: {
    filename: "PRISM_SHOP_ANALYTICS_ENGINE.js",
    source_dir: "extracted/business",
    category: "analytics",
    lines: 183,
    safety_class: "MEDIUM",
    description: "OEE calculation (Availability x Performance x Quality) and machine analytics",
  },
  PRISM_SHOP_LEARNING_ENGINE: {
    filename: "PRISM_SHOP_LEARNING_ENGINE.js",
    source_dir: "extracted/business",
    category: "learning",
    lines: 150,
    safety_class: "MEDIUM",
    description: "Bayesian estimation factor updates from job outcomes and operator/machine performance",
  },
  PRISM_SHOP_OPTIMIZER: {
    filename: "PRISM_SHOP_OPTIMIZER.js",
    source_dir: "extracted/business",
    category: "optimization",
    lines: 228,
    safety_class: "MEDIUM",
    description: "Genetic algorithm schedule optimizer and operation sequence optimization",
  },

  // ── extracted/engines/ (MEDIUM wiring — wave 2) ─────────────────────────────

  SPEED_FEED_UI: {
    filename: "SPEED_FEED_UI.js",
    source_dir: "extracted/engines",
    category: "ui-engine",
    lines: 894,
    safety_class: "MEDIUM",
    description: "Speed-and-feed UI calculation bridge: parameter binding, unit conversion, and recommendation display logic",
  },
};

/** Returns the scheduler source file catalog for introspection and audit. */
export function getSchedulerSourceFileCatalog() {
  return SCHEDULER_SOURCE_FILE_CATALOG;
}

// ============================================================================
// MACHINE RESOLUTION
// ============================================================================

interface ResolvedMachine {
  id: string;
  capabilities: string[];
  hourly_rate: number;
}

/**
 * U-BIZREG2: Derive capabilities from MachineRegistry machine type/axes.
 */
function _deriveCapabilities(regMachine: { type?: string; axes?: { simultaneous_axes?: number; rotary_axes?: number } }): string[] | null {
  if (!regMachine?.type) return null;
  const t = regMachine.type.toUpperCase();
  const caps: string[] = [];
  if (t.includes("VMC") || t.includes("HMC") || t.includes("MILL")) {
    caps.push("milling", "3-axis");
    const simAxes = regMachine.axes?.simultaneous_axes ?? 0;
    if (simAxes >= 5 || t.includes("5")) caps.push("5-axis");
    if (simAxes >= 4 || t.includes("4")) caps.push("4-axis");
  }
  if (t.includes("LATHE") || t.includes("TURN")) {
    caps.push("turning", "boring", "threading");
    if (t.includes("LIVE") || t.includes("MILL_TURN") || t.includes("SWISS")) caps.push("live tooling", "milling");
  }
  if (t.includes("GRIND")) caps.push("grinding");
  if (t.includes("EDM")) caps.push("edm", "wire edm");
  if (t.includes("DRILL")) caps.push("drilling");
  return caps.length > 0 ? caps : null;
}

function resolveMachines(machines: (string | MachineInput)[]): ResolvedMachine[] {
  return machines.map((m) => {
    if (typeof m === 'string') {
      // U-BIZREG2: Try MachineRegistry first (910 machines)
      try {
        const registry = require("../registries/MachineRegistry.js").machineRegistry;
        const found = registry.getByIdOrModel?.(m);
        if (found) {
          const caps = _deriveCapabilities(found);
          if (caps) return { id: m, capabilities: caps, hourly_rate: 80 };
        }
      } catch { /* registry not available */ }

      // Fallback: match known machine type prefix
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

/** Shop Schedule.
 * @param input - input input
 * @returns shop schedule result
 */
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

/** Machine Utilization.
 * @param input - input input
 * @returns machine utilization result
 */
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
// U-CONSOL2: MERGED OR ALGORITHMS (from JobShopSchedulingEngine)
// ============================================================================

// ── Types (from JobShopSchedulingEngine, re-exported for backward compat) ──

export type DispatchRule = "FIFO" | "SPT" | "LPT" | "EDD" | "CR" | "SLACK";

export interface ScheduleJob {
  id: string;
  processingTime: number;
  arrivalTime?: number;
  dueDate?: number;
  remainingTime?: number;
}

export interface SingleMachineResult {
  schedule: Array<{
    jobId: string;
    startTime: number;
    endTime: number;
    tardiness: number;
    flowTime: number;
  }>;
  makespan: number;
  totalFlowTime: number;
  averageFlowTime: number;
  totalTardiness: number;
  numberOfTardyJobs: number;
  rule: DispatchRule;
}

export interface FlowShopJob {
  id: string;
  machine1Time: number;
  machine2Time: number;
}

export interface FlowShopResult {
  sequence: string[];
  schedule: Array<{
    jobId: string;
    machine1: { start: number; end: number };
    machine2: { start: number; end: number };
  }>;
  makespan: number;
}

export interface JobShopJob {
  id: string;
  arrivalTime?: number;
  dueDate?: number;
  operations: Array<{
    machine: string;
    processingTime: number;
  }>;
}

export interface JobShopResult {
  schedule: Array<{
    jobId: string;
    operationIndex: number;
    machine: string;
    startTime: number;
    endTime: number;
  }>;
  makespan: number;
  rule: DispatchRule;
  completedOperations: number;
  totalOperations: number;
}

export interface CPMActivity {
  id: string;
  duration: number;
  predecessors?: string[];
}

export interface CPMResult {
  success: boolean;
  reason?: string;
  projectDuration?: number;
  criticalPath?: string[];
  schedule?: Array<{
    id: string;
    duration: number;
    ES: number;
    EF: number;
    LS: number;
    LF: number;
    slack: number;
    isCritical: boolean;
  }>;
}

// ── Dispatch rule sorter ──

type ORQueueItem = {
  jobId: string;
  processingTime: number;
  arrivalTime: number;
  dueDate: number;
  remainingTime: number;
  opIndex?: number;
};

function applyDispatchRule(queue: ORQueueItem[], rule: DispatchRule, currentTime: number): void {
  switch (rule) {
    case "FIFO":
      queue.sort((a, b) => a.arrivalTime - b.arrivalTime);
      break;
    case "SPT":
      queue.sort((a, b) => a.processingTime - b.processingTime);
      break;
    case "LPT":
      queue.sort((a, b) => b.processingTime - a.processingTime);
      break;
    case "EDD":
      queue.sort((a, b) => a.dueDate - b.dueDate);
      break;
    case "CR":
      queue.sort((a, b) => {
        const crA = (a.dueDate - currentTime) / Math.max(a.remainingTime, 0.001);
        const crB = (b.dueDate - currentTime) / Math.max(b.remainingTime, 0.001);
        return crA - crB;
      });
      break;
    case "SLACK":
      queue.sort((a, b) => {
        const slA = a.dueDate - currentTime - a.remainingTime;
        const slB = b.dueDate - currentTime - b.remainingTime;
        return slA - slB;
      });
      break;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ============================================================================
// UNIFIED CLASS (wraps practical + OR scheduling)
// ============================================================================

class ShopSchedulerEngineImpl {

  /** Practical multi-machine scheduling with capability filtering. */
  schedule(input: ShopScheduleInput): ShopScheduleResult {
    return shopSchedule(input);
  }

  /** Fleet utilization analysis. */
  machineUtilization(input: MachineUtilizationInput): MachineUtilizationResult {
    return machineUtilization(input);
  }

  // ── OR Scheduling Algorithms (merged from JobShopSchedulingEngine) ──

  /**
   * Single-machine scheduling with 6 dispatching rules.
   * Reference: Baker & Trietsch, "Principles of Sequencing and Scheduling", Ch. 4
   * @param jobs - jobs with processing times and optional due dates
   * @param rule - dispatch rule: FIFO | SPT | LPT | EDD | CR | SLACK
   */
  scheduleSingleMachine(
    jobs: ScheduleJob[],
    rule: DispatchRule = "SPT",
  ): SingleMachineResult {
    if (!jobs || jobs.length === 0) {
      return {
        schedule: [], makespan: 0, totalFlowTime: 0,
        averageFlowTime: 0, totalTardiness: 0, numberOfTardyJobs: 0, rule,
      };
    }

    const queue: ORQueueItem[] = jobs.map(j => ({
      jobId: j.id,
      processingTime: Math.max(0, j.processingTime ?? 0),
      arrivalTime: Math.max(0, j.arrivalTime ?? 0),
      dueDate: j.dueDate ?? Infinity,
      remainingTime: Math.max(0, j.remainingTime ?? j.processingTime ?? 0),
    }));

    applyDispatchRule(queue, rule, 0);

    let currentTime = 0;
    let totalFlowTime = 0;
    let totalTardiness = 0;
    let tardinessCount = 0;
    const schedule: SingleMachineResult["schedule"] = [];

    for (const item of queue) {
      const startTime = Math.max(currentTime, item.arrivalTime);
      const endTime = startTime + item.processingTime;
      const tardiness = Math.max(0, endTime - item.dueDate);
      if (tardiness > 0) tardinessCount++;

      schedule.push({
        jobId: item.jobId,
        startTime, endTime, tardiness,
        flowTime: endTime - item.arrivalTime,
      });

      totalFlowTime += endTime - item.arrivalTime;
      totalTardiness += tardiness;
      currentTime = endTime;
    }

    return {
      schedule,
      makespan: currentTime,
      totalFlowTime,
      averageFlowTime: round2(totalFlowTime / jobs.length),
      totalTardiness,
      numberOfTardyJobs: tardinessCount,
      rule,
    };
  }

  /**
   * Johnson's algorithm for 2-machine flow shop makespan minimization.
   * Reference: Johnson, S.M. (1954). "Optimal two- and three-stage production
   * schedules with setup times included." Naval Research Logistics, 1(1), 61-68.
   * @param jobs - jobs with machine1Time and machine2Time
   */
  johnsonsAlgorithm(jobs: FlowShopJob[]): FlowShopResult {
    if (!jobs || jobs.length === 0) {
      return { sequence: [], schedule: [], makespan: 0 };
    }

    // Partition: U = jobs where m1 <= m2, V = jobs where m1 > m2
    const U: FlowShopJob[] = [];
    const V: FlowShopJob[] = [];

    for (const job of jobs) {
      if ((job.machine1Time ?? 0) <= (job.machine2Time ?? 0)) {
        U.push(job);
      } else {
        V.push(job);
      }
    }

    // U sorted ascending by m1 time, V sorted descending by m2 time
    U.sort((a, b) => a.machine1Time - b.machine1Time);
    V.sort((a, b) => b.machine2Time - a.machine2Time);

    const sequence = [...U, ...V];

    let m1End = 0;
    let m2End = 0;
    const schedule: FlowShopResult["schedule"] = [];

    for (const job of sequence) {
      const m1Start = m1End;
      m1End = m1Start + job.machine1Time;
      const m2Start = Math.max(m1End, m2End);
      m2End = m2Start + job.machine2Time;

      schedule.push({
        jobId: job.id,
        machine1: { start: m1Start, end: m1End },
        machine2: { start: m2Start, end: m2End },
      });
    }

    return {
      sequence: sequence.map(j => j.id),
      schedule,
      makespan: m2End,
    };
  }

  /**
   * Multi-machine job shop scheduling simulation with dispatch rules.
   * Reference: Pinedo, M. (2016). "Scheduling: Theory, Algorithms, and Systems",
   * Springer, 5th ed., Ch. 7 (Job Shop scheduling).
   * @param jobs - jobs with operation sequences across machines
   * @param machines - machine IDs
   * @param rule - dispatch rule for queue ordering
   */
  scheduleJobShop(
    jobs: JobShopJob[],
    machines: Array<{ id: string }>,
    rule: DispatchRule = "SPT",
  ): JobShopResult {
    if (!jobs || !machines || jobs.length === 0 || machines.length === 0) {
      return { schedule: [], makespan: 0, rule, completedOperations: 0, totalOperations: 0 };
    }

    const machineAvailable: Record<string, number> = {};
    for (const m of machines) machineAvailable[m.id] = 0;

    const jobProgress: Record<string, { nextOpIndex: number; available: number }> = {};
    for (const job of jobs) {
      jobProgress[job.id] = { nextOpIndex: 0, available: job.arrivalTime ?? 0 };
    }

    const schedule: JobShopResult["schedule"] = [];
    let completedOps = 0;
    const totalOps = jobs.reduce((s, j) => s + j.operations.length, 0);
    let currentTime = 0;
    const maxTime = 100000;

    while (completedOps < totalOps && currentTime < maxTime) {
      const machineQueues: Record<string, ORQueueItem[]> = {};
      for (const m of machines) machineQueues[m.id] = [];

      for (const job of jobs) {
        const progress = jobProgress[job.id];
        if (progress.nextOpIndex < job.operations.length
          && progress.available <= currentTime) {
          const op = job.operations[progress.nextOpIndex];
          if (machineAvailable[op.machine] !== undefined
            && machineAvailable[op.machine] <= currentTime) {
            machineQueues[op.machine].push({
              jobId: job.id,
              opIndex: progress.nextOpIndex,
              processingTime: Math.max(0, op.processingTime),
              arrivalTime: progress.available,
              dueDate: job.dueDate ?? Infinity,
              remainingTime: job.operations
                .slice(progress.nextOpIndex)
                .reduce((s, o) => s + o.processingTime, 0),
            });
          }
        }
      }

      let anyScheduled = false;
      for (const m of machines) {
        const q = machineQueues[m.id];
        if (q.length > 0 && machineAvailable[m.id] <= currentTime) {
          applyDispatchRule(q, rule, currentTime);
          const selected = q[0];

          schedule.push({
            jobId: selected.jobId,
            operationIndex: selected.opIndex!,
            machine: m.id,
            startTime: currentTime,
            endTime: currentTime + selected.processingTime,
          });

          machineAvailable[m.id] = currentTime + selected.processingTime;
          jobProgress[selected.jobId].nextOpIndex++;
          jobProgress[selected.jobId].available = currentTime + selected.processingTime;
          completedOps++;
          anyScheduled = true;
        }
      }

      if (!anyScheduled) {
        const nextEvents = [
          ...Object.values(machineAvailable).filter(t => t > currentTime),
          ...Object.values(jobProgress).map(p => p.available).filter(t => t > currentTime),
        ];
        currentTime = nextEvents.length > 0 ? Math.min(...nextEvents) : currentTime + 1;
      }
    }

    const makespan = schedule.length > 0
      ? Math.max(...schedule.map(s => s.endTime)) : 0;

    return { schedule, makespan, rule, completedOperations: completedOps, totalOperations: totalOps };
  }

  /**
   * Critical Path Method (CPM) — project scheduling with forward/backward pass.
   * Reference: Kelley, J.E. & Walker, M.R. (1959). "Critical-Path Planning
   * and Scheduling." Proc. Eastern Joint Computer Conference, 160-173.
   * @param activities - activities with durations and predecessor lists
   */
  criticalPathMethod(activities: CPMActivity[]): CPMResult {
    if (!activities || activities.length === 0) {
      return { success: true, projectDuration: 0, criticalPath: [], schedule: [] };
    }

    const nodes = activities.map(a => a.id);
    const edges: Array<{ from: string; to: string }> = [];
    const actMap = new Map(activities.map(a => [a.id, a]));

    for (const act of activities) {
      for (const pred of (act.predecessors ?? [])) {
        if (!actMap.has(pred)) continue; // skip invalid predecessor refs
        edges.push({ from: pred, to: act.id });
      }
    }

    // Topological sort (Kahn's algorithm)
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};
    for (const n of nodes) { inDegree[n] = 0; adjacency[n] = []; }
    for (const e of edges) { adjacency[e.from].push(e.to); inDegree[e.to]++; }

    const kQueue = nodes.filter(n => inDegree[n] === 0);
    const sorted: string[] = [];
    while (kQueue.length > 0) {
      const n = kQueue.shift()!;
      sorted.push(n);
      for (const nb of adjacency[n]) {
        inDegree[nb]--;
        if (inDegree[nb] === 0) kQueue.push(nb);
      }
    }

    if (sorted.length !== nodes.length) {
      return { success: false, reason: "Cyclic dependency detected in activity graph" };
    }

    // Forward pass — ES/EF
    const ES: Record<string, number> = {};
    const EF: Record<string, number> = {};
    for (const id of sorted) {
      const preds = actMap.get(id)!.predecessors ?? [];
      ES[id] = preds.length === 0 ? 0 : Math.max(...preds.filter(p => EF[p] !== undefined).map(p => EF[p]));
      EF[id] = ES[id] + Math.max(0, actMap.get(id)!.duration);
    }

    const projectDuration = Math.max(...Object.values(EF));

    // Backward pass — LS/LF
    const LF: Record<string, number> = {};
    const LS: Record<string, number> = {};
    for (const id of sorted.slice().reverse()) {
      const successors = activities
        .filter(a => (a.predecessors ?? []).includes(id))
        .map(a => a.id);
      LF[id] = successors.length === 0 ? projectDuration : Math.min(...successors.map(s => LS[s]));
      LS[id] = LF[id] - Math.max(0, actMap.get(id)!.duration);
    }

    const criticalPath: string[] = [];
    const cpmSchedule = activities.map(a => {
      const slack = round2(LS[a.id] - ES[a.id]);
      const isCritical = Math.abs(slack) < 0.001;
      if (isCritical) criticalPath.push(a.id);
      return {
        id: a.id, duration: a.duration,
        ES: ES[a.id], EF: EF[a.id],
        LS: LS[a.id], LF: LF[a.id],
        slack, isCritical,
      };
    });

    return { success: true, projectDuration, criticalPath, schedule: cpmSchedule };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

/** Canonical scheduler engine instance (U-CONSOL2). */
export const shopSchedulerEngine = new ShopSchedulerEngineImpl();

// ── Dispatcher entry point (backward compat) ──

const ACTIONS: Record<string, (params: Record<string, any>) => any> = {
  shop_schedule: (params) => shopSchedule(params as unknown as ShopScheduleInput),
  machine_utilization: (params) => machineUtilization(params as unknown as MachineUtilizationInput),
};

/** Action-dispatch entry point (backward compat for intelligenceDispatcher). */
export function shopScheduler(action: string, params: Record<string, any>): any {
  const fn = ACTIONS[action];
  if (!fn) {
    return { error: `Unknown shop_scheduler action: ${action}`, valid_actions: Object.keys(ACTIONS) };
  }
  return fn(params);
}
