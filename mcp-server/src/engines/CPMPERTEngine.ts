/**
 * CPMPERTEngine — U-FORE-15 (Real Planning Algorithms)
 * =====================================================
 *
 * Critical Path Method + Program Evaluation and Review Technique.
 *
 * CPM (deterministic): computes earliest/latest start/finish and slack
 * for each task in an activity-on-node DAG, then identifies the critical
 * path (the chain of zero-slack tasks that dictates project duration).
 *
 * PERT (probabilistic): uses three-point estimates (optimistic,
 * most-likely, pessimistic) to compute expected duration and variance
 * per task via te = (O + 4M + P) / 6, v = ((P - O) / 6)^2. Project
 * duration ~ N(sum_expected_on_critical, sum_variance_on_critical) by
 * the central limit theorem, so P(finish ≤ T) = Phi((T - μ) / σ).
 *
 * Input:
 *   tasks: [{ id, duration?, optimistic?, likely?, pessimistic?, predecessors: [] }]
 * Output:
 *   { schedule: {id: {ES, EF, LS, LF, slack, critical}}, criticalPath[],
 *     projectDuration, pert: { expected, variance, stdDev, p50, p90, probabilityBy(T) } }
 */

export interface CPMTask {
  id: string;
  duration?: number;
  optimistic?: number;
  likely?: number;
  pessimistic?: number;
  predecessors?: string[];
}

export interface TaskSchedule {
  id: string;
  ES: number;
  EF: number;
  LS: number;
  LF: number;
  slack: number;
  critical: boolean;
  duration: number;
  expected: number;
  variance: number;
}

export interface CPMResult {
  schedule: Record<string, TaskSchedule>;
  criticalPath: string[];
  projectDuration: number;
  pert: {
    expectedDuration: number;
    variance: number;
    stdDev: number;
    p50: number;
    p90: number;
    probabilityByT: (T: number) => number;
  };
}

const P90_Z = 1.2816;

function standardNormalCdf(z: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989422804 * Math.exp(-z * z / 2);
  const poly = (((1.330274429 * t - 1.821255978) * t + 1.781477937) * t - 0.356563782) * t + 0.319381530;
  const p = d * t * poly;
  return z >= 0 ? 1 - p : p;
}

function computePERT(t: CPMTask): { expected: number; variance: number; duration: number } {
  if (t.optimistic !== undefined && t.likely !== undefined && t.pessimistic !== undefined) {
    const expected = (t.optimistic + 4 * t.likely + t.pessimistic) / 6;
    const variance = ((t.pessimistic - t.optimistic) / 6) ** 2;
    const duration = t.duration ?? expected;
    return { expected, variance, duration };
  }
  const d = t.duration ?? 0;
  return { expected: d, variance: 0, duration: d };
}

export class CPMPERTEngine {
  readonly name = "CPMPERTEngine";

  analyze(tasks: CPMTask[]): CPMResult {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error("CPMPERTEngine.analyze: non-empty tasks array required");
    }
    for (const t of tasks) {
      if (!t || typeof t.id !== "string") {
        throw new Error("CPMPERTEngine.analyze: each task must have an id");
      }
    }

    const byId = new Map<string, CPMTask>();
    for (const t of tasks) {
      if (byId.has(t.id)) throw new Error(`CPMPERTEngine.analyze: duplicate task id '${t.id}'`);
      byId.set(t.id, t);
    }
    for (const t of tasks) {
      for (const p of t.predecessors ?? []) {
        if (!byId.has(p)) {
          throw new Error(`CPMPERTEngine.analyze: task '${t.id}' has unknown predecessor '${p}'`);
        }
      }
    }

    const order = this.topoSort(tasks);
    const schedule = new Map<string, TaskSchedule>();
    for (const t of tasks) {
      const { expected, variance, duration } = computePERT(t);
      schedule.set(t.id, {
        id: t.id,
        ES: 0,
        EF: 0,
        LS: 0,
        LF: 0,
        slack: 0,
        critical: false,
        duration,
        expected,
        variance,
      });
    }

    for (const id of order) {
      const node = schedule.get(id)!;
      const preds = byId.get(id)!.predecessors ?? [];
      node.ES = preds.length === 0 ? 0 : Math.max(...preds.map((p) => schedule.get(p)!.EF));
      node.EF = node.ES + node.duration;
    }

    const projectDuration = Math.max(...Array.from(schedule.values()).map((n) => n.EF));
    for (const id of [...order].reverse()) {
      const node = schedule.get(id)!;
      const successors = tasks.filter((t) => (t.predecessors ?? []).includes(id));
      node.LF = successors.length === 0 ? projectDuration : Math.min(...successors.map((s) => schedule.get(s.id)!.LS));
      node.LS = node.LF - node.duration;
      node.slack = node.LS - node.ES;
      node.critical = Math.abs(node.slack) < 1e-9;
    }

    const criticalPath = this.buildCriticalPath(order, schedule, byId);
    const pertExpected = criticalPath.reduce((s, id) => s + schedule.get(id)!.expected, 0);
    const pertVariance = criticalPath.reduce((s, id) => s + schedule.get(id)!.variance, 0);
    const stdDev = Math.sqrt(pertVariance);
    const probabilityByT = (T: number) => stdDev === 0
      ? (T >= pertExpected ? 1 : 0)
      : standardNormalCdf((T - pertExpected) / stdDev);
    const p50 = pertExpected;
    const p90 = pertExpected + P90_Z * stdDev;

    return {
      schedule: Object.fromEntries(schedule),
      criticalPath,
      projectDuration,
      pert: {
        expectedDuration: pertExpected,
        variance: pertVariance,
        stdDev,
        p50,
        p90,
        probabilityByT,
      },
    };
  }

  private topoSort(tasks: CPMTask[]): string[] {
    const indeg = new Map<string, number>();
    const successors = new Map<string, string[]>();
    for (const t of tasks) {
      indeg.set(t.id, (t.predecessors ?? []).length);
      if (!successors.has(t.id)) successors.set(t.id, []);
    }
    for (const t of tasks) {
      for (const p of t.predecessors ?? []) {
        if (!successors.has(p)) successors.set(p, []);
        successors.get(p)!.push(t.id);
      }
    }
    const queue: string[] = [];
    for (const [id, deg] of indeg) if (deg === 0) queue.push(id);
    const order: string[] = [];
    while (queue.length > 0) {
      const id = queue.shift()!;
      order.push(id);
      for (const s of successors.get(id) ?? []) {
        indeg.set(s, indeg.get(s)! - 1);
        if (indeg.get(s) === 0) queue.push(s);
      }
    }
    if (order.length !== tasks.length) {
      throw new Error("CPMPERTEngine.analyze: cycle detected in predecessors");
    }
    return order;
  }

  private buildCriticalPath(
    order: string[],
    schedule: Map<string, TaskSchedule>,
    byId: Map<string, CPMTask>,
  ): string[] {
    const path: string[] = [];
    const starts = order.filter((id) => {
      const t = byId.get(id)!;
      return schedule.get(id)!.critical && (t.predecessors ?? []).length === 0;
    });
    if (starts.length === 0) return path;
    let cursor: string | undefined = starts[0];
    while (cursor !== undefined) {
      path.push(cursor);
      const nextId: string | undefined = order.find((id) => {
        const t = byId.get(id)!;
        return schedule.get(id)!.critical && (t.predecessors ?? []).includes(cursor!);
      });
      cursor = nextId;
    }
    return path;
  }
}

export const cpmPertEngine = new CPMPERTEngine();
