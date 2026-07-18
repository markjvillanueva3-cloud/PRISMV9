/**
 * PRISM MCP Server — Job Shop Scheduling Engine
 *
 * @deprecated U-CONSOL2: All algorithms merged into ShopSchedulerEngine (canonical).
 * ShopSchedulerEngine now has: scheduleSingleMachine(), johnsonsAlgorithm(),
 * scheduleJobShop(), criticalPathMethod() — identical implementations.
 * All dispatcher actions route to ShopSchedulerEngine.
 * This file is retained for backward compatibility of direct imports only.
 *
 * Canonical engine: ShopSchedulerEngine
 *
 * Ported from PRISM_JOB_SHOP_SCHEDULING_ENGINE.js (monolith R2.3.1).
 *
 * @module JobShopSchedulingEngine
 */

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// DISPATCHING RULES
// ============================================================================

type QueueItem = {
  jobId: string;
  processingTime: number;
  arrivalTime: number;
  dueDate: number;
  remainingTime: number;
  opIndex?: number;
};

function applyRule(queue: QueueItem[], rule: DispatchRule, currentTime: number): void {
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

// ============================================================================
// ENGINE
// ============================================================================

class JobShopSchedulingEngineImpl {

  scheduleSingleMachine(
    jobs: ScheduleJob[],
    rule: DispatchRule = "SPT",
  ): SingleMachineResult {
    if (jobs.length === 0) {
      return {
        schedule: [], makespan: 0, totalFlowTime: 0,
        averageFlowTime: 0, totalTardiness: 0, numberOfTardyJobs: 0, rule,
      };
    }

    const queue: QueueItem[] = jobs.map(j => ({
      jobId: j.id,
      processingTime: j.processingTime,
      arrivalTime: j.arrivalTime ?? 0,
      dueDate: j.dueDate ?? Infinity,
      remainingTime: j.remainingTime ?? j.processingTime,
    }));

    applyRule(queue, rule, 0);

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

  johnsonsAlgorithm(jobs: FlowShopJob[]): FlowShopResult {
    if (jobs.length === 0) {
      return { sequence: [], schedule: [], makespan: 0 };
    }

    const U: FlowShopJob[] = [];
    const V: FlowShopJob[] = [];

    for (const job of jobs) {
      if (job.machine1Time <= job.machine2Time) {
        U.push(job);
      } else {
        V.push(job);
      }
    }

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

  scheduleJobShop(
    jobs: JobShopJob[],
    machines: Array<{ id: string }>,
    rule: DispatchRule = "SPT",
  ): JobShopResult {
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
      // Build machine queues
      const machineQueues: Record<string, QueueItem[]> = {};
      for (const m of machines) machineQueues[m.id] = [];

      for (const job of jobs) {
        const progress = jobProgress[job.id];
        if (progress.nextOpIndex < job.operations.length
          && progress.available <= currentTime) {
          const op = job.operations[progress.nextOpIndex];
          if (machineAvailable[op.machine] <= currentTime) {
            machineQueues[op.machine].push({
              jobId: job.id,
              opIndex: progress.nextOpIndex,
              processingTime: op.processingTime,
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
          applyRule(q, rule, currentTime);
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

  criticalPathMethod(activities: CPMActivity[]): CPMResult {
    if (activities.length === 0) {
      return { success: true, projectDuration: 0, criticalPath: [], schedule: [] };
    }

    const nodes = activities.map(a => a.id);
    const edges: Array<{ from: string; to: string }> = [];
    const actMap = new Map(activities.map(a => [a.id, a]));

    for (const act of activities) {
      for (const pred of (act.predecessors ?? [])) {
        edges.push({ from: pred, to: act.id });
      }
    }

    // Topological sort (Kahn's)
    const inDegree: Record<string, number> = {};
    const adjacency: Record<string, string[]> = {};
    for (const n of nodes) { inDegree[n] = 0; adjacency[n] = []; }
    for (const e of edges) { adjacency[e.from].push(e.to); inDegree[e.to]++; }

    const queue = nodes.filter(n => inDegree[n] === 0);
    const sorted: string[] = [];
    while (queue.length > 0) {
      const n = queue.shift()!;
      sorted.push(n);
      for (const nb of adjacency[n]) {
        inDegree[nb]--;
        if (inDegree[nb] === 0) queue.push(nb);
      }
    }

    if (sorted.length !== nodes.length) {
      return { success: false, reason: "Cyclic dependency" };
    }

    // Forward pass
    const ES: Record<string, number> = {};
    const EF: Record<string, number> = {};
    for (const id of sorted) {
      const preds = actMap.get(id)!.predecessors ?? [];
      ES[id] = preds.length === 0 ? 0 : Math.max(...preds.map(p => EF[p]));
      EF[id] = ES[id] + actMap.get(id)!.duration;
    }

    const projectDuration = Math.max(...Object.values(EF));

    // Backward pass
    const LF: Record<string, number> = {};
    const LS: Record<string, number> = {};
    for (const id of sorted.slice().reverse()) {
      const successors = activities
        .filter(a => (a.predecessors ?? []).includes(id))
        .map(a => a.id);
      LF[id] = successors.length === 0 ? projectDuration : Math.min(...successors.map(s => LS[s]));
      LS[id] = LF[id] - actMap.get(id)!.duration;
    }

    const criticalPath: string[] = [];
    const schedule = activities.map(a => {
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

    return { success: true, projectDuration, criticalPath, schedule };
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const jobShopSchedulingEngine = new JobShopSchedulingEngineImpl();
