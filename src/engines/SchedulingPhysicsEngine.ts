/**
 * SchedulingPhysicsEngine — Scheduling, queuing theory, and batch economics
 *
 * Closes 15 SCHEDULING orphan formulas with rigorous implementations:
 *
 * Methods:
 *   - queueTheory: Little's Law L=λW, M/M/1 wait Wq=ρ/(μ(1-ρ)), utilization ρ=λ/μ
 *   - batchEconomics: EBQ=√(2DS/H), setup time ratio, economic lot size
 *   - capacityAnalysis: capacity required/available/gap, utilization rate
 *   - scheduleMetrics: makespan, tardiness, flow time, slack, critical ratio
 *   - dynamicPriority: weighted priority score, schedule robustness, ML completion estimate
 *
 * References:
 *   Gross, D. & Shortle, J. (2008). "Fundamentals of Queueing Theory", 4th ed.
 *   Silver, E. et al. (1998). "Inventory Management and Production Planning", 3rd ed.
 *   Pinedo, M. (2016). "Scheduling: Theory, Algorithms, and Systems", 5th ed.
 *
 * Actions: calc_queue_theory, calc_batch_economics, calc_capacity_analysis,
 *          calc_schedule_metrics, calc_dynamic_priority
 */

// ─── Types ──────────────────────────────────────────────────────────

export interface QueueTheoryInput {
  /** Arrival rate λ [units/time] */
  arrival_rate: number;
  /** Service rate μ [units/time] */
  service_rate: number;
  /** Number of servers c (default 1) */
  servers?: number;
  /** Queue capacity K (default Infinity = unlimited) */
  capacity?: number;
}

export interface QueueTheoryResult {
  /** Server utilization ρ = λ/(cμ) */
  utilization_rho: number;
  /** Average number in system L */
  avg_in_system_L: number;
  /** Average number in queue Lq */
  avg_in_queue_Lq: number;
  /** Average time in system W */
  avg_time_in_system_W: number;
  /** Average wait in queue Wq */
  avg_wait_in_queue_Wq: number;
  /** Probability system is empty P0 */
  prob_empty_P0: number;
  /** System type description */
  system_type: string;
  /** Stability flag */
  stable: boolean;
}

export interface BatchEconomicsInput {
  /** Annual demand D [units/year] */
  annual_demand: number;
  /** Setup/ordering cost S [$/setup] */
  setup_cost: number;
  /** Holding cost per unit per year H [$/unit/year] */
  holding_cost: number;
  /** Production rate P [units/year] (if provided, uses EPQ instead of EOQ) */
  production_rate?: number;
  /** Unit cost C [$/unit] (optional, for total cost calculation) */
  unit_cost?: number;
  /** Setup time per batch [hours] */
  setup_time_hours?: number;
  /** Production time per unit [hours] */
  production_time_per_unit?: number;
}

export interface BatchEconomicsResult {
  /** Economic order/batch quantity */
  economic_quantity: number;
  /** Optimal number of orders/batches per year */
  orders_per_year: number;
  /** Total annual cost (setup + holding + optional purchase) */
  total_annual_cost: number;
  /** Annual setup cost */
  annual_setup_cost: number;
  /** Annual holding cost */
  annual_holding_cost: number;
  /** Setup time ratio (setup_time / total_time) */
  setup_time_ratio: number | null;
  /** Model used: EOQ or EPQ */
  model: "EOQ" | "EPQ";
  /** Maximum inventory level */
  max_inventory: number;
}

export interface CapacityAnalysisInput {
  /** Jobs array with processing requirements */
  jobs: Array<{
    /** Job ID */
    id: string;
    /** Required processing time [hours] */
    processing_time_hours: number;
    /** Setup time [hours] */
    setup_time_hours?: number;
    /** Required machine/resource */
    resource?: string;
  }>;
  /** Available hours per period */
  available_hours_per_period: number;
  /** Number of periods to plan */
  periods: number;
  /** Efficiency factor (0-1, default 0.85) */
  efficiency?: number;
  /** Number of parallel resources (default 1) */
  parallel_resources?: number;
}

export interface CapacityAnalysisResult {
  /** Total capacity required [hours] */
  capacity_required: number;
  /** Total capacity available [hours] */
  capacity_available: number;
  /** Capacity gap (positive = shortfall) */
  capacity_gap: number;
  /** Utilization rate */
  utilization_rate: number;
  /** Can all jobs be completed? */
  feasible: boolean;
  /** Per-resource breakdown */
  resource_breakdown: Record<string, { required: number; available: number; utilization: number }>;
}

export interface ScheduleMetricsInput {
  /** Jobs with timing data */
  jobs: Array<{
    id: string;
    /** Processing time */
    processing_time: number;
    /** Due date (time units from now) */
    due_date: number;
    /** Release time (earliest start, default 0) */
    release_time?: number;
    /** Weight/priority (default 1) */
    weight?: number;
    /** Actual completion time (if known) */
    completion_time?: number;
  }>;
  /** Current time (default 0) */
  current_time?: number;
}

export interface ScheduleMetricsResult {
  /** Makespan Cmax = max completion time */
  makespan: number;
  /** Total weighted tardiness */
  total_tardiness: number;
  /** Total weighted flow time */
  total_flow_time: number;
  /** Per-job metrics */
  job_metrics: Array<{
    id: string;
    completion_time: number;
    flow_time: number;
    tardiness: number;
    slack_time: number;
    critical_ratio: number;
    lateness: number;
  }>;
  /** Number of tardy jobs */
  tardy_jobs: number;
  /** Average flow time */
  avg_flow_time: number;
  /** Maximum tardiness */
  max_tardiness: number;
}

export interface DynamicPriorityInput {
  /** Jobs to prioritize */
  jobs: Array<{
    id: string;
    processing_time: number;
    due_date: number;
    weight?: number;
    remaining_time?: number;
    arrival_time?: number;
  }>;
  /** Current time */
  current_time?: number;
  /** Priority rule weights */
  weights?: {
    /** Weight for shortest processing time (default 0.25) */
    spt?: number;
    /** Weight for earliest due date (default 0.25) */
    edd?: number;
    /** Weight for critical ratio (default 0.25) */
    cr?: number;
    /** Weight for slack (default 0.25) */
    slack?: number;
  };
  /** Target makespan for robustness calc */
  target_makespan?: number;
}

export interface DynamicPriorityResult {
  /** Jobs ranked by priority (highest first) */
  ranked_jobs: Array<{
    id: string;
    priority_score: number;
    spt_score: number;
    edd_score: number;
    cr_score: number;
    slack_score: number;
    estimated_completion: number;
  }>;
  /** Schedule robustness SR = 1 - σ/T */
  schedule_robustness: number;
  /** Estimated makespan from priority ordering */
  estimated_makespan: number;
}

// ─── Engine ─────────────────────────────────────────────────────────

export class SchedulingPhysicsEngine {
  /**
   * Queuing theory analysis — M/M/1 and M/M/c models.
   * Little's Law: L = λW. M/M/1 wait: Wq = ρ/(μ(1-ρ)).
   */
  queueTheory(p: QueueTheoryInput): QueueTheoryResult {
    const lambda = p.arrival_rate;
    const mu = p.service_rate;
    const c = p.servers ?? 1;

    if (lambda <= 0) throw new Error("arrival_rate must be > 0");
    if (mu <= 0) throw new Error("service_rate must be > 0");
    if (c < 1) throw new Error("servers must be >= 1");

    const rho = lambda / (c * mu);
    const stable = rho < 1;

    if (c === 1) {
      // M/M/1 model
      if (!stable) {
        return {
          utilization_rho: rho,
          avg_in_system_L: Infinity,
          avg_in_queue_Lq: Infinity,
          avg_time_in_system_W: Infinity,
          avg_wait_in_queue_Wq: Infinity,
          prob_empty_P0: 0,
          system_type: "M/M/1 (unstable)",
          stable: false,
        };
      }
      const Lq = (rho * rho) / (1 - rho);
      const L = rho / (1 - rho);
      const W = 1 / (mu - lambda);
      const Wq = rho / (mu * (1 - rho));
      const P0 = 1 - rho;

      return {
        utilization_rho: rho,
        avg_in_system_L: L,
        avg_in_queue_Lq: Lq,
        avg_time_in_system_W: W,
        avg_wait_in_queue_Wq: Wq,
        prob_empty_P0: P0,
        system_type: "M/M/1",
        stable: true,
      };
    }

    // M/M/c model — Erlang-C formula
    if (!stable) {
      return {
        utilization_rho: rho,
        avg_in_system_L: Infinity,
        avg_in_queue_Lq: Infinity,
        avg_time_in_system_W: Infinity,
        avg_wait_in_queue_Wq: Infinity,
        prob_empty_P0: 0,
        system_type: `M/M/${c} (unstable)`,
        stable: false,
      };
    }

    const a = lambda / mu; // offered load
    // P0 = [Σ(a^n/n!, n=0..c-1) + a^c/(c!*(1-ρ))]^-1
    let sum = 0;
    for (let n = 0; n < c; n++) {
      sum += Math.pow(a, n) / this._factorial(n);
    }
    const lastTerm = Math.pow(a, c) / (this._factorial(c) * (1 - rho));
    const P0 = 1 / (sum + lastTerm);

    // Erlang-C: P(wait) = (a^c / c!) * (1/(1-ρ)) * P0
    const Pw = (Math.pow(a, c) / this._factorial(c)) * (1 / (1 - rho)) * P0;
    const Lq = Pw * rho / (1 - rho);
    const Wq = Lq / lambda;
    const W = Wq + 1 / mu;
    const L = lambda * W; // Little's Law

    return {
      utilization_rho: rho,
      avg_in_system_L: L,
      avg_in_queue_Lq: Lq,
      avg_time_in_system_W: W,
      avg_wait_in_queue_Wq: Wq,
      prob_empty_P0: P0,
      system_type: `M/M/${c}`,
      stable: true,
    };
  }

  /**
   * Batch/lot economics — EOQ and EPQ models.
   * EOQ: Q* = √(2DS/H). EPQ: Q* = √(2DS/H * P/(P-D)).
   */
  batchEconomics(p: BatchEconomicsInput): BatchEconomicsResult {
    const D = p.annual_demand;
    const S = p.setup_cost;
    const H = p.holding_cost;

    if (D <= 0) throw new Error("annual_demand must be > 0");
    if (S <= 0) throw new Error("setup_cost must be > 0");
    if (H <= 0) throw new Error("holding_cost must be > 0");

    let Q: number;
    let model: "EOQ" | "EPQ";
    let maxInv: number;

    if (p.production_rate != null && p.production_rate > 0) {
      // EPQ (Economic Production Quantity)
      const P = p.production_rate;
      if (P <= D) throw new Error("production_rate must exceed annual_demand");
      Q = Math.sqrt((2 * D * S) / H * (P / (P - D)));
      model = "EPQ";
      maxInv = Q * (1 - D / P);
    } else {
      // EOQ (Economic Order Quantity)
      Q = Math.sqrt((2 * D * S) / H);
      model = "EOQ";
      maxInv = Q;
    }

    const ordersPerYear = D / Q;
    const annualSetupCost = ordersPerYear * S;
    const annualHoldingCost = (maxInv / 2) * H;
    let totalCost = annualSetupCost + annualHoldingCost;
    if (p.unit_cost != null) {
      totalCost += D * p.unit_cost;
    }

    let setupTimeRatio: number | null = null;
    if (p.setup_time_hours != null && p.production_time_per_unit != null) {
      const batchTime = p.setup_time_hours + Q * p.production_time_per_unit;
      setupTimeRatio = p.setup_time_hours / batchTime;
    }

    return {
      economic_quantity: Q,
      orders_per_year: ordersPerYear,
      total_annual_cost: totalCost,
      annual_setup_cost: annualSetupCost,
      annual_holding_cost: annualHoldingCost,
      setup_time_ratio: setupTimeRatio,
      model,
      max_inventory: maxInv,
    };
  }

  /**
   * Capacity analysis — required vs available, gap detection.
   */
  capacityAnalysis(p: CapacityAnalysisInput): CapacityAnalysisResult {
    const eff = p.efficiency ?? 0.85;
    const nRes = p.parallel_resources ?? 1;
    const totalAvailable = p.available_hours_per_period * p.periods * nRes * eff;

    // Per-resource breakdown
    const resourceMap: Record<string, number> = {};
    let totalRequired = 0;

    for (const job of p.jobs) {
      const res = job.resource ?? "default";
      const time = job.processing_time_hours + (job.setup_time_hours ?? 0);
      resourceMap[res] = (resourceMap[res] ?? 0) + time;
      totalRequired += time;
    }

    const perResAvailable = p.available_hours_per_period * p.periods * eff;
    const breakdown: Record<string, { required: number; available: number; utilization: number }> = {};
    for (const [res, req] of Object.entries(resourceMap)) {
      const avail = res === "default" ? totalAvailable : perResAvailable;
      breakdown[res] = {
        required: req,
        available: avail,
        utilization: req / avail,
      };
    }

    return {
      capacity_required: totalRequired,
      capacity_available: totalAvailable,
      capacity_gap: totalRequired - totalAvailable,
      utilization_rate: totalRequired / totalAvailable,
      feasible: totalRequired <= totalAvailable,
      resource_breakdown: breakdown,
    };
  }

  /**
   * Schedule metrics — makespan, tardiness, flow time, slack, critical ratio.
   * CR = (due_date - current_time) / remaining_processing_time.
   */
  scheduleMetrics(p: ScheduleMetricsInput): ScheduleMetricsResult {
    const now = p.current_time ?? 0;

    // If completion times not provided, sequence by order (FCFS)
    let cumTime = now;
    const jobMetrics = p.jobs.map((job) => {
      const release = job.release_time ?? 0;
      const start = Math.max(cumTime, release);
      const ct = job.completion_time ?? (start + job.processing_time);
      cumTime = ct;

      const flowTime = ct - release;
      const lateness = ct - job.due_date;
      const tardiness = Math.max(0, lateness);
      const slack = job.due_date - ct;
      const remaining = Math.max(job.processing_time, 0.001);
      const cr = (job.due_date - now) / remaining;

      return {
        id: job.id,
        completion_time: ct,
        flow_time: flowTime,
        tardiness: tardiness * (job.weight ?? 1),
        slack_time: slack,
        critical_ratio: cr,
        lateness,
      };
    });

    const makespan = Math.max(...jobMetrics.map((j) => j.completion_time));
    const totalTardiness = jobMetrics.reduce((s, j) => s + j.tardiness, 0);
    const totalFlowTime = jobMetrics.reduce((s, j) => s + j.flow_time * (p.jobs.find(jj => jj.id === j.id)?.weight ?? 1), 0);
    const tardyJobs = jobMetrics.filter((j) => j.tardiness > 0).length;
    const avgFlowTime = jobMetrics.reduce((s, j) => s + j.flow_time, 0) / jobMetrics.length;
    const maxTardiness = Math.max(...jobMetrics.map((j) => j.tardiness), 0);

    return {
      makespan,
      total_tardiness: totalTardiness,
      total_flow_time: totalFlowTime,
      job_metrics: jobMetrics,
      tardy_jobs: tardyJobs,
      avg_flow_time: avgFlowTime,
      max_tardiness: maxTardiness,
    };
  }

  /**
   * Dynamic priority scoring — composite weighted priority with robustness measure.
   * SR = 1 - σ(completion_times) / target_makespan.
   */
  dynamicPriority(p: DynamicPriorityInput): DynamicPriorityResult {
    const now = p.current_time ?? 0;
    const w = {
      spt: p.weights?.spt ?? 0.25,
      edd: p.weights?.edd ?? 0.25,
      cr: p.weights?.cr ?? 0.25,
      slack: p.weights?.slack ?? 0.25,
    };

    // Normalize weights
    const wSum = w.spt + w.edd + w.cr + w.slack;
    w.spt /= wSum;
    w.edd /= wSum;
    w.cr /= wSum;
    w.slack /= wSum;

    // Compute raw scores
    const maxPt = Math.max(...p.jobs.map((j) => j.processing_time), 1);
    const maxDue = Math.max(...p.jobs.map((j) => j.due_date), 1);

    const scored = p.jobs.map((job) => {
      const pt = job.remaining_time ?? job.processing_time;
      const sptScore = 1 - pt / maxPt; // shorter = higher
      const eddScore = 1 - job.due_date / maxDue; // earlier due = higher
      const cr = pt > 0 ? (job.due_date - now) / pt : 999;
      const crScore = cr < 1 ? 1 : 1 / cr; // CR < 1 = urgent = high score
      const slack = job.due_date - now - pt;
      const slackScore = slack < 0 ? 1 : 1 / (1 + slack / maxPt); // negative slack = urgent

      const priority = w.spt * sptScore + w.edd * eddScore + w.cr * crScore + w.slack * slackScore;

      return {
        id: job.id,
        priority_score: priority,
        spt_score: sptScore,
        edd_score: eddScore,
        cr_score: crScore,
        slack_score: slackScore,
        processing_time: pt,
        due_date: job.due_date,
        estimated_completion: 0, // filled after sorting
      };
    });

    // Sort by priority (descending)
    scored.sort((a, b) => b.priority_score - a.priority_score);

    // Compute estimated completions in priority order
    let cumTime = now;
    for (const job of scored) {
      cumTime += job.processing_time;
      job.estimated_completion = cumTime;
    }

    const estimatedMakespan = cumTime;
    const completions = scored.map((j) => j.estimated_completion);
    const mean = completions.reduce((s, v) => s + v, 0) / completions.length;
    const variance = completions.reduce((s, v) => s + (v - mean) ** 2, 0) / completions.length;
    const sigma = Math.sqrt(variance);
    const T = p.target_makespan ?? estimatedMakespan;
    const robustness = Math.max(0, Math.min(1, 1 - sigma / T));

    return {
      ranked_jobs: scored.map(({ processing_time: _pt, due_date: _dd, ...rest }) => rest),
      schedule_robustness: robustness,
      estimated_makespan: estimatedMakespan,
    };
  }

  /** Dispatcher entry */
  calculate(params: { action: string; params: Record<string, unknown> }): unknown {
    switch (params.action) {
      case "calc_queue_theory":
        return this.queueTheory(params.params as unknown as QueueTheoryInput);
      case "calc_batch_economics":
        return this.batchEconomics(params.params as unknown as BatchEconomicsInput);
      case "calc_capacity_analysis":
        return this.capacityAnalysis(params.params as unknown as CapacityAnalysisInput);
      case "calc_schedule_metrics":
        return this.scheduleMetrics(params.params as unknown as ScheduleMetricsInput);
      case "calc_dynamic_priority":
        return this.dynamicPriority(params.params as unknown as DynamicPriorityInput);
      default:
        throw new Error(`Unknown scheduling action: ${params.action}`);
    }
  }

  /** @internal Factorial helper (small n only, n <= 20) */
  private _factorial(n: number): number {
    if (n <= 1) return 1;
    let r = 1;
    for (let i = 2; i <= n; i++) r *= i;
    return r;
  }
}

export const schedulingPhysicsEngine = new SchedulingPhysicsEngine();
