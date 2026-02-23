/**
 * OperationSequencerEngine.ts — R13-MS3: Operation Sequencer Extraction
 *
 * Extracted from monolith modules:
 *   - PRISM_ACO_SEQUENCER.js (full ACO with elitist strategy, convergence control)
 *   - PRISM_JOB_SHOP_SCHEDULING_ENGINE.js (dispatching rules, Johnson's, job shop)
 *
 * New MCP actions: optimize_sequence_advanced, schedule_operations
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface Feature {
  x: number; y: number; z?: number;
  toolId?: string; tool?: string;
  id?: string; name?: string;
}

export interface ACOConfig {
  numAnts?: number;
  iterations?: number;
  alpha?: number;        // Pheromone importance
  beta?: number;         // Distance heuristic importance
  evaporation?: number;  // Pheromone evaporation rate (0-1)
  Q?: number;            // Pheromone deposit factor
  elitistWeight?: number;
  convergenceThreshold?: number;
  stagnationLimit?: number;
  toolChangeTime?: number;   // seconds per tool change
  setupChangeTime?: number;  // seconds per setup change
  startNode?: number;
}

export interface ACOResult {
  success: boolean;
  sequence: number[];
  cost: number;
  baselineCost: number;
  improvement: string;
  improvementPct: number;
  iterations: number;
  executionTimeMs: number;
  toolChanges: number;
  featureCount: number;
  message: string;
  convergence: { stagnatedAt?: number; converged: boolean };
}

export interface Job {
  id: string;
  processingTime: number;
  arrivalTime?: number;
  dueDate?: number;
  remainingTime?: number;
  priority?: number;
  // For Johnson's 2-machine
  machine1Time?: number;
  machine2Time?: number;
  // For job shop
  operations?: Array<{ machine: string; processingTime: number }>;
}

export interface ScheduleEntry {
  jobId: string;
  startTime: number;
  endTime: number;
  tardiness?: number;
  flowTime?: number;
  machine?: string;
  operationIndex?: number;
}

export type DispatchRule = 'FIFO' | 'SPT' | 'LPT' | 'EDD' | 'CR' | 'SLACK';

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const ACO_DEFAULTS: Required<ACOConfig> = {
  numAnts: 20,
  iterations: 100,
  alpha: 1.0,
  beta: 2.0,
  evaporation: 0.5,
  Q: 100,
  elitistWeight: 2.0,
  convergenceThreshold: 0.001,
  stagnationLimit: 20,
  toolChangeTime: 15,
  setupChangeTime: 300,
  startNode: -1,
};

const MAX_FEATURES = 1000;
const MIN_PHEROMONE = 0.001;

// ─── OPERATION SEQUENCER ENGINE ─────────────────────────────────────────────

export class OperationSequencerEngine {

  // ══════════════════════════════════════════════════════════════════════════
  // ACO CORE — Ant Colony Optimization with Elitist Strategy
  // ══════════════════════════════════════════════════════════════════════════

  /** Initialize pheromone matrix NxN */
  private initPheromones(n: number, initial = 1.0): number[][] {
    const m: number[][] = [];
    for (let i = 0; i < n; i++) {
      m[i] = [];
      for (let j = 0; j < n; j++) m[i][j] = i === j ? 0 : initial;
    }
    return m;
  }

  /** 3D Euclidean distance matrix */
  private distanceMatrix(features: Feature[]): number[][] {
    const n = features.length;
    const d: number[][] = [];
    for (let i = 0; i < n; i++) {
      d[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) { d[i][j] = Infinity; continue; }
        const dx = (features[j].x || 0) - (features[i].x || 0);
        const dy = (features[j].y || 0) - (features[i].y || 0);
        const dz = (features[j].z || 0) - (features[i].z || 0);
        d[i][j] = Math.sqrt(dx * dx + dy * dy + dz * dz);
      }
    }
    return d;
  }

  /** Tool change penalty matrix */
  private toolChangeMatrix(features: Feature[], penalty: number): number[][] {
    const n = features.length;
    const m: number[][] = [];
    for (let i = 0; i < n; i++) {
      m[i] = [];
      for (let j = 0; j < n; j++) {
        if (i === j) { m[i][j] = 0; continue; }
        const t1 = features[i].toolId || features[i].tool || '';
        const t2 = features[j].toolId || features[j].tool || '';
        m[i][j] = (t1 && t2 && t1 !== t2) ? penalty : 0;
      }
    }
    return m;
  }

  /** Roulette wheel selection of next node */
  private selectNext(current: number, unvisited: number[], pheromones: number[][], distances: number[][], alpha: number, beta: number): number {
    const probs: Array<{ node: number; prob: number }> = [];
    let total = 0;
    for (const node of unvisited) {
      const tau = Math.pow(pheromones[current][node], alpha);
      const dist = distances[current][node];
      const eta = dist > 0 && dist !== Infinity ? Math.pow(1 / dist, beta) : 1;
      const prob = tau * eta;
      probs.push({ node, prob });
      total += prob;
    }
    if (total <= 0) return unvisited[Math.floor(Math.random() * unvisited.length)];

    let r = Math.random() * total;
    for (const { node, prob } of probs) {
      r -= prob;
      if (r <= 0) return node;
    }
    return probs[probs.length - 1].node;
  }

  /** Construct a single ant tour */
  private constructTour(startNode: number, n: number, pheromones: number[][], distances: number[][], alpha: number, beta: number): { path: number[]; cost: number } {
    const path: number[] = [];
    const unvisited = new Set<number>();
    for (let i = 0; i < n; i++) unvisited.add(i);

    let current = (startNode >= 0 && startNode < n) ? startNode : Math.floor(Math.random() * n);
    path.push(current);
    unvisited.delete(current);

    while (unvisited.size > 0) {
      const next = this.selectNext(current, Array.from(unvisited), pheromones, distances, alpha, beta);
      path.push(next);
      unvisited.delete(next);
      current = next;
    }

    return { path, cost: this.pathCost(path, distances) };
  }

  /** Calculate total path cost (distance + optional tool changes) */
  private pathCost(path: number[], distances: number[][], toolChanges?: number[][]): number {
    let cost = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const f = path[i], t = path[i + 1];
      cost += distances[f][t] === Infinity ? 0 : distances[f][t];
      if (toolChanges) cost += toolChanges[f][t];
    }
    return cost;
  }

  /** Update pheromone trails with evaporation + deposit + elitist bonus */
  private updatePheromones(
    pheromones: number[][], tours: Array<{ path: number[]; cost: number }>,
    evaporation: number, Q: number, elitistWeight: number,
    bestTour: { path: number[]; cost: number } | null
  ): void {
    const n = pheromones.length;

    // Evaporation
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++)
        pheromones[i][j] = Math.max(MIN_PHEROMONE, pheromones[i][j] * (1 - evaporation));

    // Deposit from all ants
    for (const tour of tours) {
      if (tour.cost <= 0) continue;
      const deposit = Q / tour.cost;
      for (let i = 0; i < tour.path.length - 1; i++) {
        const f = tour.path[i], t = tour.path[i + 1];
        pheromones[f][t] += deposit;
        pheromones[t][f] += deposit;
      }
    }

    // Elitist bonus for global best
    if (bestTour && bestTour.cost > 0) {
      const elitistDeposit = (Q / bestTour.cost) * elitistWeight;
      for (let i = 0; i < bestTour.path.length - 1; i++) {
        const f = bestTour.path[i], t = bestTour.path[i + 1];
        pheromones[f][t] += elitistDeposit;
        pheromones[t][f] += elitistDeposit;
      }
    }
  }

  /** Full ACO optimization with convergence control */
  optimizeSequence(features: Feature[], options: ACOConfig = {}): ACOResult {
    const t0 = Date.now();

    if (!features || features.length < 2) {
      return { success: true, sequence: features ? features.map((_, i) => i) : [], cost: 0, baselineCost: 0, improvement: '0%', improvementPct: 0, iterations: 0, executionTimeMs: 0, toolChanges: 0, featureCount: features?.length || 0, message: 'Trivial case — no optimization needed', convergence: { converged: true } };
    }

    const n = features.length;
    if (n > MAX_FEATURES) return { success: false, sequence: [], cost: 0, baselineCost: 0, improvement: '0%', improvementPct: 0, iterations: 0, executionTimeMs: 0, toolChanges: 0, featureCount: n, message: `Feature count ${n} exceeds limit ${MAX_FEATURES}`, convergence: { converged: false } };

    const cfg = { ...ACO_DEFAULTS, ...options };
    const distances = this.distanceMatrix(features);
    const toolChanges = this.toolChangeMatrix(features, cfg.toolChangeTime);
    const pheromones = this.initPheromones(n);

    // Combined cost matrix (distance + tool change)
    const combined: number[][] = [];
    for (let i = 0; i < n; i++) {
      combined[i] = [];
      for (let j = 0; j < n; j++) {
        combined[i][j] = (distances[i][j] === Infinity ? 0 : distances[i][j]) + toolChanges[i][j];
      }
    }

    // Baseline: sequential order
    const baselinePath = features.map((_, i) => i);
    const baselineCost = this.pathCost(baselinePath, distances, toolChanges);

    let bestTour: { path: number[]; cost: number } | null = null;
    let bestCost = Infinity;
    let stagnationCount = 0;
    let lastBestCost = Infinity;
    let convergedAt: number | undefined;

    for (let iter = 0; iter < cfg.iterations; iter++) {
      const tours: Array<{ path: number[]; cost: number }> = [];

      for (let ant = 0; ant < cfg.numAnts; ant++) {
        const tour = this.constructTour(cfg.startNode, n, pheromones, distances, cfg.alpha, cfg.beta);
        // Recalculate with tool changes
        tour.cost = this.pathCost(tour.path, distances, toolChanges);
        tours.push(tour);

        if (tour.cost < bestCost) {
          bestCost = tour.cost;
          bestTour = { ...tour };
        }
      }

      this.updatePheromones(pheromones, tours, cfg.evaporation, cfg.Q, cfg.elitistWeight, bestTour);

      // Convergence check
      if (Math.abs(lastBestCost - bestCost) < cfg.convergenceThreshold) {
        stagnationCount++;
        if (stagnationCount >= cfg.stagnationLimit) {
          convergedAt = iter;
          break;
        }
      } else {
        stagnationCount = 0;
      }
      lastBestCost = bestCost;
    }

    const improvementPct = baselineCost > 0 ? ((baselineCost - bestCost) / baselineCost) * 100 : 0;
    const toolChangeCount = bestTour ? this.countToolChanges(bestTour.path, features) : 0;

    return {
      success: true,
      sequence: bestTour?.path || baselinePath,
      cost: Math.round(bestCost * 100) / 100,
      baselineCost: Math.round(baselineCost * 100) / 100,
      improvement: `${improvementPct.toFixed(1)}%`,
      improvementPct: Math.round(improvementPct * 10) / 10,
      iterations: convergedAt ?? cfg.iterations,
      executionTimeMs: Date.now() - t0,
      toolChanges: toolChangeCount,
      featureCount: n,
      message: `Optimized ${n} features: ${improvementPct.toFixed(1)}% improvement, ${toolChangeCount} tool changes`,
      convergence: { stagnatedAt: convergedAt, converged: convergedAt !== undefined },
    };
  }

  /** Count tool changes in a path */
  private countToolChanges(path: number[], features: Feature[]): number {
    let changes = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const t1 = features[path[i]].toolId || features[path[i]].tool || '';
      const t2 = features[path[i + 1]].toolId || features[path[i + 1]].tool || '';
      if (t1 && t2 && t1 !== t2) changes++;
    }
    return changes;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // JOB SHOP SCHEDULING — 6 Dispatching Rules + Johnson's + Multi-Machine
  // ══════════════════════════════════════════════════════════════════════════

  /** Apply dispatching rule to sort jobs */
  private applyRule(jobs: Job[], rule: DispatchRule, currentTime: number): Job[] {
    const sorted = [...jobs];
    switch (rule) {
      case 'FIFO': return sorted.sort((a, b) => (a.arrivalTime || 0) - (b.arrivalTime || 0));
      case 'SPT':  return sorted.sort((a, b) => a.processingTime - b.processingTime);
      case 'LPT':  return sorted.sort((a, b) => b.processingTime - a.processingTime);
      case 'EDD':  return sorted.sort((a, b) => (a.dueDate || Infinity) - (b.dueDate || Infinity));
      case 'CR':   return sorted.sort((a, b) => {
        const crA = ((a.dueDate || Infinity) - currentTime) / (a.remainingTime || a.processingTime);
        const crB = ((b.dueDate || Infinity) - currentTime) / (b.remainingTime || b.processingTime);
        return crA - crB;
      });
      case 'SLACK': return sorted.sort((a, b) => {
        const sA = (a.dueDate || Infinity) - currentTime - (a.remainingTime || a.processingTime);
        const sB = (b.dueDate || Infinity) - currentTime - (b.remainingTime || b.processingTime);
        return sA - sB;
      });
      default: return sorted;
    }
  }

  /** Single machine scheduling with dispatching rule */
  scheduleSingleMachine(jobs: Job[], rule: DispatchRule = 'SPT'): { schedule: ScheduleEntry[]; makespan: number; totalFlowTime: number; averageFlowTime: number; totalTardiness: number; numberOfTardyJobs: number; rule: string } {
    const sorted = this.applyRule(jobs, rule, 0);
    let currentTime = 0;
    const schedule: ScheduleEntry[] = [];
    let totalFlowTime = 0, totalTardiness = 0, tardinessCount = 0;

    for (const job of sorted) {
      const startTime = Math.max(currentTime, job.arrivalTime || 0);
      const endTime = startTime + job.processingTime;
      const tardiness = Math.max(0, endTime - (job.dueDate || Infinity));
      if (tardiness > 0) tardinessCount++;

      schedule.push({ jobId: job.id, startTime, endTime, tardiness, flowTime: endTime - (job.arrivalTime || 0) });
      totalFlowTime += endTime - (job.arrivalTime || 0);
      totalTardiness += tardiness;
      currentTime = endTime;
    }

    return { schedule, makespan: currentTime, totalFlowTime, averageFlowTime: totalFlowTime / jobs.length, totalTardiness, numberOfTardyJobs: tardinessCount, rule };
  }

  /** Johnson's algorithm for optimal 2-machine flow shop sequencing */
  johnsonsAlgorithm(jobs: Job[]): { sequence: string[]; schedule: Array<{ jobId: string; machine1: { start: number; end: number }; machine2: { start: number; end: number } }>; makespan: number } {
    const U: Job[] = [];
    const V: Job[] = [];
    for (const job of jobs) {
      if ((job.machine1Time || 0) <= (job.machine2Time || 0)) U.push(job);
      else V.push(job);
    }
    U.sort((a, b) => (a.machine1Time || 0) - (b.machine1Time || 0));
    V.sort((a, b) => (b.machine2Time || 0) - (a.machine2Time || 0));

    const sequence = [...U, ...V];
    let m1End = 0, m2End = 0;
    const schedule: Array<{ jobId: string; machine1: { start: number; end: number }; machine2: { start: number; end: number } }> = [];

    for (const job of sequence) {
      const m1Start = m1End;
      m1End = m1Start + (job.machine1Time || 0);
      const m2Start = Math.max(m1End, m2End);
      m2End = m2Start + (job.machine2Time || 0);
      schedule.push({ jobId: job.id, machine1: { start: m1Start, end: m1End }, machine2: { start: m2Start, end: m2End } });
    }

    return { sequence: sequence.map(j => j.id), schedule, makespan: m2End };
  }

  /** Multi-machine job shop scheduling with dispatching rule simulation */
  scheduleJobShop(jobs: Job[], machines: Array<{ id: string }>, rule: DispatchRule = 'SPT'): { schedule: ScheduleEntry[]; makespan: number; rule: string; completedOperations: number; totalOperations: number; machineUtilization: Record<string, number> } {
    const machineAvailable: Record<string, number> = {};
    const machineWorkTime: Record<string, number> = {};
    for (const m of machines) { machineAvailable[m.id] = 0; machineWorkTime[m.id] = 0; }

    const jobProgress: Record<string, { nextOpIndex: number; available: number }> = {};
    for (const job of jobs) jobProgress[job.id] = { nextOpIndex: 0, available: job.arrivalTime || 0 };

    const schedule: ScheduleEntry[] = [];
    let completedOps = 0;
    const totalOps = jobs.reduce((sum, j) => sum + (j.operations?.length || 0), 0);
    let currentTime = 0;
    const maxTime = 100000;

    while (completedOps < totalOps && currentTime < maxTime) {
      // Build machine queues
      const machineQueues: Record<string, Job[]> = {};
      for (const m of machines) machineQueues[m.id] = [];

      for (const job of jobs) {
        const progress = jobProgress[job.id];
        if (!job.operations || progress.nextOpIndex >= job.operations.length) continue;
        const op = job.operations[progress.nextOpIndex];
        if (progress.available <= currentTime) {
          machineQueues[op.machine].push({
            id: job.id,
            processingTime: op.processingTime,
            arrivalTime: progress.available,
            dueDate: job.dueDate,
            remainingTime: job.operations.slice(progress.nextOpIndex).reduce((s, o) => s + o.processingTime, 0),
          });
        }
      }

      // Process each machine
      for (const m of machines) {
        if (machineAvailable[m.id] <= currentTime && machineQueues[m.id].length > 0) {
          const queue = this.applyRule(machineQueues[m.id], rule, currentTime);
          const selected = queue[0];
          const startTime = currentTime;
          const endTime = startTime + selected.processingTime;

          schedule.push({ jobId: selected.id, operationIndex: jobProgress[selected.id].nextOpIndex, machine: m.id, startTime, endTime });
          machineAvailable[m.id] = endTime;
          machineWorkTime[m.id] = (machineWorkTime[m.id] || 0) + selected.processingTime;
          jobProgress[selected.id].nextOpIndex++;
          jobProgress[selected.id].available = endTime;
          completedOps++;
        }
      }

      // Advance to next event
      const nextEvents = [
        ...Object.values(machineAvailable).filter(t => t > currentTime),
        ...Object.values(jobProgress).map(p => p.available).filter(t => t > currentTime),
      ];
      currentTime = nextEvents.length > 0 ? Math.min(...nextEvents) : currentTime + 1;
    }

    const makespan = schedule.length > 0 ? Math.max(...schedule.map(s => s.endTime)) : 0;
    const utilization: Record<string, number> = {};
    for (const m of machines) utilization[m.id] = makespan > 0 ? Math.round((machineWorkTime[m.id] || 0) / makespan * 1000) / 10 : 0;

    return { schedule, makespan, rule, completedOperations: completedOps, totalOperations: totalOps, machineUtilization: utilization };
  }

  /** Compare all dispatching rules for a job set */
  compareRules(jobs: Job[]): Array<{ rule: DispatchRule; makespan: number; avgFlowTime: number; totalTardiness: number; tardyJobs: number }> {
    const rules: DispatchRule[] = ['FIFO', 'SPT', 'LPT', 'EDD', 'CR', 'SLACK'];
    return rules.map(rule => {
      const result = this.scheduleSingleMachine(jobs, rule);
      return { rule, makespan: result.makespan, avgFlowTime: Math.round(result.averageFlowTime * 10) / 10, totalTardiness: result.totalTardiness, tardyJobs: result.numberOfTardyJobs };
    });
  }
}

// ── SINGLETON EXPORT ─────────────────────────────────────────────────────────

export const operationSequencer = new OperationSequencerEngine();

// ── ACTION DISPATCHER (for MCP wiring) ─────────────────────────────────────

export function executeSequencerAction(action: string, params: Record<string, any>): any {
  switch (action) {
    case 'optimize_sequence_advanced': {
      const features = params.features as Feature[];
      if (!features?.length) return { error: 'features array required (each with x, y, optional z, toolId)' };
      return operationSequencer.optimizeSequence(features, {
        numAnts: params.numAnts ?? params.ants,
        iterations: params.iterations,
        alpha: params.alpha,
        beta: params.beta,
        evaporation: params.evaporation,
        elitistWeight: params.elitistWeight,
        convergenceThreshold: params.convergenceThreshold,
        stagnationLimit: params.stagnationLimit,
        toolChangeTime: params.toolChangeTime,
        startNode: params.startNode,
      });
    }

    case 'schedule_operations': {
      const jobs = params.jobs as Job[];
      if (!jobs?.length) return { error: 'jobs array required' };
      const rule = (params.rule || 'SPT').toUpperCase() as DispatchRule;

      // Johnson's 2-machine flow shop
      if (params.mode === 'johnsons' || params.mode === 'flow_shop') {
        return { ...operationSequencer.johnsonsAlgorithm(jobs), mode: 'johnsons' };
      }

      // Multi-machine job shop
      if (params.machines?.length) {
        return { ...operationSequencer.scheduleJobShop(jobs, params.machines, rule), mode: 'job_shop' };
      }

      // Compare all rules
      if (params.compare) {
        return { comparison: operationSequencer.compareRules(jobs), mode: 'compare', jobCount: jobs.length };
      }

      // Default: single machine
      return { ...operationSequencer.scheduleSingleMachine(jobs, rule), mode: 'single_machine' };
    }

    default:
      throw new Error(`Unknown sequencer action: ${action}`);
  }
}
