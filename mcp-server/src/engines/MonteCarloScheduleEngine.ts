/**
 * MonteCarloScheduleEngine — U-FORE-15 (Real Planning Algorithms)
 * ================================================================
 *
 * Monte Carlo simulation over an activity-on-node DAG. Samples each
 * task's duration from a triangular distribution parameterised by
 * (optimistic, most-likely, pessimistic) estimates — the standard
 * PERT three-point shape — and propagates through the precedence
 * network to compute a distribution of project makespans.
 *
 * Triangular inverse CDF:
 *   fm = (M - O) / (P - O)
 *   if u < fm: d = O + sqrt(u * (P - O) * (M - O))
 *   else:      d = P - sqrt((1 - u) * (P - O) * (P - M))
 *
 * Why triangular and not full beta-PERT? For schedule risk at small N
 * (≤ 100 tasks, ≤ 10k trials) the difference is well under the noise
 * from imprecise O/M/P estimates, and triangular avoids importing a
 * gamma-function library. Standard in PRINCE2/PMI practice.
 *
 * Inputs  → { tasks[], trials?, seed? }
 * Outputs → { makespans[], p10, p25, p50, p75, p90, p99, mean, stdDev,
 *              tasksCriticalityPct, trials }
 */

export interface MCScheduleTask {
  id: string;
  optimistic: number;
  likely: number;
  pessimistic: number;
  predecessors?: string[];
}

export interface MCScheduleInput {
  tasks: MCScheduleTask[];
  trials?: number;
  seed?: number;
}

export interface MCScheduleResult {
  makespans: number[];
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  p99: number;
  mean: number;
  stdDev: number;
  tasksCriticalityPct: Record<string, number>;
  trials: number;
}

const DEFAULT_TRIALS = 2000;
const MIN_TRIALS = 100;
const MAX_TRIALS = 200_000;
const EPSILON = 1e-9;

function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleTriangular(rng: () => number, O: number, M: number, P: number): number {
  if (P - O < EPSILON) return M;
  const u = rng();
  const fm = (M - O) / (P - O);
  if (u < fm) return O + Math.sqrt(u * (P - O) * (M - O));
  return P - Math.sqrt((1 - u) * (P - O) * (P - M));
}

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * (sorted.length - 1))));
  return sorted[idx];
}

function topoSort(tasks: MCScheduleTask[]): string[] {
  const indeg = new Map<string, number>();
  const succ = new Map<string, string[]>();
  for (const t of tasks) {
    indeg.set(t.id, (t.predecessors ?? []).length);
    if (!succ.has(t.id)) succ.set(t.id, []);
  }
  for (const t of tasks) {
    for (const p of t.predecessors ?? []) {
      if (!succ.has(p)) succ.set(p, []);
      succ.get(p)!.push(t.id);
    }
  }
  const queue: string[] = [];
  for (const [id, deg] of indeg) if (deg === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(id);
    for (const s of succ.get(id) ?? []) {
      indeg.set(s, indeg.get(s)! - 1);
      if (indeg.get(s) === 0) queue.push(s);
    }
  }
  if (order.length !== tasks.length) {
    throw new Error("MonteCarloScheduleEngine: cycle detected in predecessors");
  }
  return order;
}

export class MonteCarloScheduleEngine {
  readonly name = "MonteCarloScheduleEngine";

  simulate(input: MCScheduleInput): MCScheduleResult {
    this.validate(input);
    const order = topoSort(input.tasks);
    const byId = new Map(input.tasks.map((t) => [t.id, t] as const));
    const trials = Math.min(MAX_TRIALS, Math.max(MIN_TRIALS, input.trials ?? DEFAULT_TRIALS));
    const rng = mulberry32((input.seed ?? 1) | 0);

    const makespans: number[] = new Array(trials);
    const critCounts = new Map<string, number>();
    for (const id of order) critCounts.set(id, 0);

    for (let trial = 0; trial < trials; trial++) {
      const finish = new Map<string, number>();
      const duration = new Map<string, number>();
      for (const id of order) {
        const task = byId.get(id)!;
        const d = sampleTriangular(rng, task.optimistic, task.likely, task.pessimistic);
        duration.set(id, d);
        const preds = task.predecessors ?? [];
        const start = preds.length === 0 ? 0 : Math.max(...preds.map((p) => finish.get(p)!));
        finish.set(id, start + d);
      }
      const makespan = Math.max(...finish.values());
      makespans[trial] = makespan;

      const stack: string[] = [];
      for (const [id, f] of finish) {
        if (Math.abs(f - makespan) < EPSILON) stack.push(id);
      }
      const visited = new Set<string>();
      while (stack.length > 0) {
        const id = stack.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);
        critCounts.set(id, critCounts.get(id)! + 1);
        const preds = byId.get(id)!.predecessors ?? [];
        const myStart = finish.get(id)! - duration.get(id)!;
        for (const p of preds) {
          if (Math.abs(finish.get(p)! - myStart) < EPSILON) stack.push(p);
        }
      }
    }

    const sorted = [...makespans].sort((a, b) => a - b);
    const mean = makespans.reduce((s, x) => s + x, 0) / trials;
    const variance = makespans.reduce((s, x) => s + (x - mean) ** 2, 0) / trials;
    const stdDev = Math.sqrt(variance);

    const tasksCriticalityPct: Record<string, number> = {};
    for (const [id, n] of critCounts) tasksCriticalityPct[id] = n / trials;

    return {
      makespans,
      p10: percentile(sorted, 0.10),
      p25: percentile(sorted, 0.25),
      p50: percentile(sorted, 0.50),
      p75: percentile(sorted, 0.75),
      p90: percentile(sorted, 0.90),
      p99: percentile(sorted, 0.99),
      mean,
      stdDev,
      tasksCriticalityPct,
      trials,
    };
  }

  private validate(input: MCScheduleInput): void {
    if (!input || !Array.isArray(input.tasks) || input.tasks.length === 0) {
      throw new Error("MonteCarloScheduleEngine.simulate: non-empty tasks array required");
    }
    const ids = new Set<string>();
    for (const t of input.tasks) {
      if (!t || typeof t.id !== "string") {
        throw new Error("MonteCarloScheduleEngine.simulate: each task must have an id");
      }
      if (ids.has(t.id)) throw new Error(`MonteCarloScheduleEngine.simulate: duplicate id '${t.id}'`);
      ids.add(t.id);
      if (!Number.isFinite(t.optimistic) || !Number.isFinite(t.likely) || !Number.isFinite(t.pessimistic)) {
        throw new Error(`MonteCarloScheduleEngine.simulate: task '${t.id}' needs finite O/M/P`);
      }
      if (!(t.optimistic <= t.likely && t.likely <= t.pessimistic)) {
        throw new Error(`MonteCarloScheduleEngine.simulate: task '${t.id}' requires O ≤ M ≤ P`);
      }
    }
    for (const t of input.tasks) {
      for (const p of t.predecessors ?? []) {
        if (!ids.has(p)) {
          throw new Error(`MonteCarloScheduleEngine.simulate: task '${t.id}' has unknown predecessor '${p}'`);
        }
      }
    }
  }
}

export const monteCarloScheduleEngine = new MonteCarloScheduleEngine();
