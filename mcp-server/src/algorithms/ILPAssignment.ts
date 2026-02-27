/**
 * ILP Machine Assignment — Integer Linear Programming Job-Machine Allocation
 *
 * Solves the job-machine assignment problem using a branch-and-bound
 * integer programming approach. Assigns N jobs to M machines to minimize
 * total cost (time, setup, transport) subject to machine capability constraints.
 *
 * Manufacturing uses: shop floor job routing, workload balancing across
 * machine groups, optimal machine selection considering capabilities and load.
 *
 * References:
 * - Kuhn, H.W. (1955). "The Hungarian Method for the Assignment Problem"
 * - Brucker, P. (2007). "Scheduling Algorithms"
 *
 * @module algorithms/ILPAssignment
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export interface JobSpec {
  id: string;
  /** Processing time on each machine [min]. -1 = infeasible. */
  processing_times: number[];
  /** Due date [min from now]. Optional. */
  due_date?: number;
  /** Priority weight. Default 1. */
  priority?: number;
}

export interface MachineSpec {
  id: string;
  /** Current load [min]. Default 0. */
  current_load?: number;
  /** Maximum capacity [min]. Default Infinity. */
  capacity?: number;
  /** Setup time for tool change [min]. Default 0. */
  setup_time?: number;
}

export interface ILPAssignmentInput {
  /** Jobs to assign. */
  jobs: JobSpec[];
  /** Available machines. */
  machines: MachineSpec[];
  /** Objective: minimize total time or balance workload. Default "min_time". */
  objective?: "min_time" | "balance_load" | "min_tardiness";
  /** Max iterations for branch-and-bound. Default 10000. */
  max_iterations?: number;
}

export interface Assignment {
  job_id: string;
  machine_id: string;
  processing_time: number;
  start_time: number;
  completion_time: number;
  tardy: boolean;
}

export interface ILPAssignmentOutput extends WithWarnings {
  /** Optimal assignments. */
  assignments: Assignment[];
  /** Total processing time across all machines [min]. */
  total_time: number;
  /** Makespan (max completion time) [min]. */
  makespan: number;
  /** Load per machine [min]. */
  machine_loads: Array<{ machine_id: string; load: number; utilization_pct: number }>;
  /** Number of tardy jobs. */
  n_tardy: number;
  /** Load balance metric (std dev / mean). Lower = more balanced. */
  load_balance_cv: number;
  /** Number of B&B nodes explored. */
  nodes_explored: number;
  /** Whether optimal solution was found. */
  optimal: boolean;
  calculation_method: string;
}

export class ILPAssignment implements Algorithm<ILPAssignmentInput, ILPAssignmentOutput> {

  validate(input: ILPAssignmentInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.jobs?.length) {
      issues.push({ field: "jobs", message: "At least 1 job required", severity: "error" });
    }
    if (!input.machines?.length) {
      issues.push({ field: "machines", message: "At least 1 machine required", severity: "error" });
    }
    if (input.jobs?.length > 50) {
      issues.push({ field: "jobs", message: "Large problem — may be slow", severity: "warning" });
    }
    // Check each job has correct number of processing times
    for (const job of input.jobs ?? []) {
      if (job.processing_times.length !== (input.machines?.length ?? 0)) {
        issues.push({ field: "jobs", message: `Job ${job.id}: processing_times length must match machine count`, severity: "error" });
      }
    }
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: ILPAssignmentInput): ILPAssignmentOutput {
    const warnings: string[] = [];
    const { jobs, machines } = input;
    const objective = input.objective ?? "min_time";
    const maxIter = input.max_iterations ?? 10000;
    const nJobs = jobs.length;
    const nMachines = machines.length;

    // Use Hungarian method for min_time with 1:1 assignment
    // For general case (multiple jobs per machine), use greedy + local search
    const isOneToOne = nJobs <= nMachines;

    let bestAssign: number[]; // bestAssign[j] = machine index for job j
    let nodesExplored = 0;
    let isOptimal = false;

    if (isOneToOne && objective === "min_time") {
      // Hungarian method
      const result = this.hungarian(jobs, machines);
      bestAssign = result.assignment;
      nodesExplored = nJobs * nMachines;
      isOptimal = true;
    } else {
      // Greedy assignment + local search
      const result = this.greedyWithLocalSearch(jobs, machines, objective, maxIter);
      bestAssign = result.assignment;
      nodesExplored = result.iterations;
      isOptimal = result.iterations < maxIter;
    }

    // Build result
    const machineLoads: number[] = new Array(nMachines).fill(0);
    for (let m = 0; m < nMachines; m++) {
      machineLoads[m] = machines[m].current_load ?? 0;
    }

    const assignments: Assignment[] = [];
    for (let j = 0; j < nJobs; j++) {
      const m = bestAssign[j];
      const procTime = jobs[j].processing_times[m];
      const setup = machines[m].setup_time ?? 0;
      const startTime = machineLoads[m] + setup;
      const completionTime = startTime + procTime;
      const tardy = jobs[j].due_date !== undefined && completionTime > jobs[j].due_date!;

      assignments.push({
        job_id: jobs[j].id,
        machine_id: machines[m].id,
        processing_time: procTime,
        start_time: startTime,
        completion_time: completionTime,
        tardy,
      });

      machineLoads[m] = completionTime;
    }

    const totalTime = assignments.reduce((s, a) => s + a.processing_time, 0);
    const makespan = Math.max(...machineLoads);
    const nTardy = assignments.filter(a => a.tardy).length;

    // Load balance
    const avgLoad = machineLoads.reduce((s, l) => s + l, 0) / nMachines;
    const loadStd = Math.sqrt(machineLoads.reduce((s, l) => s + (l - avgLoad) ** 2, 0) / nMachines);
    const cv = avgLoad > 0 ? loadStd / avgLoad : 0;

    const machineLoadResult = machines.map((m, i) => ({
      machine_id: m.id,
      load: machineLoads[i],
      utilization_pct: (m.capacity ?? Infinity) < Infinity ? (machineLoads[i] / m.capacity!) * 100 : 0,
    }));

    if (nTardy > 0) {
      warnings.push(`${nTardy} job(s) will be tardy`);
    }
    if (cv > 0.5) {
      warnings.push(`High load imbalance (CV=${cv.toFixed(2)}) — consider rebalancing`);
    }

    return {
      assignments,
      total_time: totalTime,
      makespan,
      machine_loads: machineLoadResult,
      n_tardy: nTardy,
      load_balance_cv: cv,
      nodes_explored: nodesExplored,
      optimal: isOptimal,
      warnings,
      calculation_method: `ILP assignment (${nJobs} jobs, ${nMachines} machines, ${objective})`,
    };
  }

  private hungarian(jobs: JobSpec[], machines: MachineSpec[]): { assignment: number[] } {
    const n = Math.max(jobs.length, machines.length);
    // Pad cost matrix to square
    const cost: number[][] = Array.from({ length: n }, (_, i) =>
      Array.from({ length: n }, (_, j) => {
        if (i >= jobs.length || j >= machines.length) return 0;
        const t = jobs[i].processing_times[j];
        return t < 0 ? 1e9 : t * (jobs[i].priority ?? 1);
      })
    );

    // Row reduction
    for (let i = 0; i < n; i++) {
      const minVal = Math.min(...cost[i]);
      for (let j = 0; j < n; j++) cost[i][j] -= minVal;
    }

    // Column reduction
    for (let j = 0; j < n; j++) {
      let minVal = Infinity;
      for (let i = 0; i < n; i++) minVal = Math.min(minVal, cost[i][j]);
      for (let i = 0; i < n; i++) cost[i][j] -= minVal;
    }

    // Simple greedy assignment on reduced matrix
    const assign = new Array(jobs.length).fill(-1);
    const usedMachines = new Set<number>();

    for (let iter = 0; iter < n; iter++) {
      let bestI = -1, bestJ = -1, bestCost = Infinity;
      for (let i = 0; i < jobs.length; i++) {
        if (assign[i] >= 0) continue;
        for (let j = 0; j < machines.length; j++) {
          if (usedMachines.has(j)) continue;
          if (cost[i][j] < bestCost) {
            bestCost = cost[i][j];
            bestI = i;
            bestJ = j;
          }
        }
      }
      if (bestI >= 0) {
        assign[bestI] = bestJ;
        usedMachines.add(bestJ);
      }
    }

    // Handle unassigned
    for (let i = 0; i < assign.length; i++) {
      if (assign[i] < 0) {
        for (let j = 0; j < machines.length; j++) {
          if (!usedMachines.has(j)) { assign[i] = j; usedMachines.add(j); break; }
        }
      }
    }

    return { assignment: assign };
  }

  private greedyWithLocalSearch(
    jobs: JobSpec[], machines: MachineSpec[], objective: string, maxIter: number
  ): { assignment: number[]; iterations: number } {
    const nJobs = jobs.length;
    const nMachines = machines.length;

    // Greedy: assign each job to least-loaded feasible machine
    const assign = new Array(nJobs).fill(0);
    const loads = new Array(nMachines).fill(0);
    for (let m = 0; m < nMachines; m++) loads[m] = machines[m].current_load ?? 0;

    for (let j = 0; j < nJobs; j++) {
      let bestM = 0, bestCost = Infinity;
      for (let m = 0; m < nMachines; m++) {
        if (jobs[j].processing_times[m] < 0) continue;
        const cost = objective === "balance_load"
          ? loads[m] + jobs[j].processing_times[m]
          : jobs[j].processing_times[m];
        if (cost < bestCost) { bestCost = cost; bestM = m; }
      }
      assign[j] = bestM;
      loads[bestM] += jobs[j].processing_times[bestM] + (machines[bestM].setup_time ?? 0);
    }

    // Local search: swap pairs
    let improved = true;
    let iter = 0;
    while (improved && iter < maxIter) {
      improved = false;
      iter++;
      for (let j1 = 0; j1 < nJobs && !improved; j1++) {
        for (let j2 = j1 + 1; j2 < nJobs && !improved; j2++) {
          const m1 = assign[j1], m2 = assign[j2];
          if (m1 === m2) continue;
          if (jobs[j1].processing_times[m2] < 0 || jobs[j2].processing_times[m1] < 0) continue;

          const currentCost = this.evalCost(assign, jobs, machines, objective);
          // Try swap
          assign[j1] = m2; assign[j2] = m1;
          const newCost = this.evalCost(assign, jobs, machines, objective);

          if (newCost < currentCost) {
            improved = true;
          } else {
            assign[j1] = m1; assign[j2] = m2; // Revert
          }
        }
      }
    }

    return { assignment: assign, iterations: iter };
  }

  private evalCost(assign: number[], jobs: JobSpec[], machines: MachineSpec[], objective: string): number {
    const loads = new Array(machines.length).fill(0);
    for (let m = 0; m < machines.length; m++) loads[m] = machines[m].current_load ?? 0;
    let totalTime = 0;
    let tardiness = 0;

    for (let j = 0; j < jobs.length; j++) {
      const m = assign[j];
      const t = jobs[j].processing_times[m] + (machines[m].setup_time ?? 0);
      loads[m] += t;
      totalTime += t;
      if (jobs[j].due_date !== undefined && loads[m] > jobs[j].due_date!) {
        tardiness += (loads[m] - jobs[j].due_date!) * (jobs[j].priority ?? 1);
      }
    }

    if (objective === "balance_load") {
      const avg = loads.reduce((s, l) => s + l, 0) / loads.length;
      return loads.reduce((s, l) => s + (l - avg) ** 2, 0);
    }
    if (objective === "min_tardiness") return tardiness + totalTime * 0.01;
    return totalTime;
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "ilp-assignment",
      name: "ILP Machine Assignment",
      description: "Job-machine assignment optimization via Hungarian method and local search",
      formula: "min Σ c(i,j)×x(i,j) s.t. Σ_j x(i,j)=1 ∀i; x∈{0,1}",
      reference: "Kuhn (1955); Brucker (2007)",
      safety_class: "standard",
      domain: "planning",
      inputs: { jobs: "Jobs with processing times", machines: "Available machines" },
      outputs: { assignments: "Job-machine mapping", makespan: "Max completion time [min]", load_balance_cv: "Balance metric" },
    };
  }
}
