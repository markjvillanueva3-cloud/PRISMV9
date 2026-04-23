// WIRE-EXEMPT: cross-agent scheduling analysis consumed by swarm orchestrator and roadmap dashboards
/**
 * DistributedCriticalPathEngine — U-FORE-18 (Multi-Agent Coordination Spine)
 *
 * Computes the critical path across tasks owned by multiple agents,
 * accounting for per-agent serial execution (an agent can work on
 * only one task at a time) and cross-agent handoffs.
 *
 * Differs from CPMPERTEngine: this engine treats each agent as a
 * single-machine resource. If two tasks share an owner they must run
 * in series even if they don't list each other as predecessors.
 *
 * Inputs  → { tasks: Array<{id, duration, owner, predecessors}> }
 * Outputs → {
 *   schedule: Record<id, {ES, EF, owner, critical}>,
 *   criticalPath,
 *   makespan,
 *   agentLoad: Record<agent, totalHours>,
 *   handoffEdges: Array<{from, to, across}>
 * }
 */

export interface AgentTask {
  id: string;
  duration: number;
  owner: string;
  predecessors?: string[];
}

export interface DistributedSchedule {
  id: string;
  owner: string;
  ES: number;
  EF: number;
  LS: number;
  LF: number;
  slack: number;
  critical: boolean;
}

export interface DistributedResult {
  schedule: Record<string, DistributedSchedule>;
  criticalPath: string[];
  makespan: number;
  agentLoad: Record<string, number>;
  handoffEdges: Array<{ from: string; to: string; across: boolean }>;
}

export class DistributedCriticalPathEngine {
  readonly name = "DistributedCriticalPathEngine";

  analyze(tasks: AgentTask[]): DistributedResult {
    if (!Array.isArray(tasks) || tasks.length === 0) {
      throw new Error("DistributedCriticalPathEngine.analyze: non-empty tasks required");
    }
    const byId = new Map<string, AgentTask>();
    for (const t of tasks) {
      if (!t || typeof t.id !== "string") {
        throw new Error("DistributedCriticalPathEngine.analyze: each task must have id");
      }
      if (!Number.isFinite(t.duration) || t.duration < 0) {
        throw new Error(`DistributedCriticalPathEngine.analyze: task '${t.id}' needs finite non-negative duration`);
      }
      if (typeof t.owner !== "string" || t.owner.length === 0) {
        throw new Error(`DistributedCriticalPathEngine.analyze: task '${t.id}' needs owner`);
      }
      if (byId.has(t.id)) throw new Error(`DistributedCriticalPathEngine.analyze: duplicate id '${t.id}'`);
      byId.set(t.id, t);
    }
    for (const t of tasks) {
      for (const p of t.predecessors ?? []) {
        if (!byId.has(p)) {
          throw new Error(`DistributedCriticalPathEngine.analyze: task '${t.id}' unknown predecessor '${p}'`);
        }
      }
    }

    const order = this.topoSort(tasks);
    const finish = new Map<string, number>();
    const start = new Map<string, number>();
    const agentBusyUntil = new Map<string, number>();

    for (const id of order) {
      const task = byId.get(id)!;
      const preds = task.predecessors ?? [];
      const predReady = preds.length === 0 ? 0 : Math.max(...preds.map((p) => finish.get(p)!));
      const agentFree = agentBusyUntil.get(task.owner) ?? 0;
      const earliestStart = Math.max(predReady, agentFree);
      const earliestFinish = earliestStart + task.duration;
      start.set(id, earliestStart);
      finish.set(id, earliestFinish);
      agentBusyUntil.set(task.owner, earliestFinish);
    }

    const makespan = Math.max(...finish.values());
    const schedule: Record<string, DistributedSchedule> = {};
    for (const id of order) {
      const task = byId.get(id)!;
      schedule[id] = {
        id,
        owner: task.owner,
        ES: start.get(id)!,
        EF: finish.get(id)!,
        LS: 0,
        LF: 0,
        slack: 0,
        critical: false,
      };
    }

    for (const id of [...order].reverse()) {
      const task = byId.get(id)!;
      const successors = tasks.filter((t) => (t.predecessors ?? []).includes(id));
      const sameAgentAfter = tasks
        .filter((t) => t.owner === task.owner && t.id !== id)
        .map((t) => schedule[t.id])
        .filter((s) => s.ES >= schedule[id].EF);
      const lateBoundCandidates: number[] = [];
      for (const s of successors) lateBoundCandidates.push(schedule[s.id].LS);
      for (const s of sameAgentAfter) lateBoundCandidates.push(s.LS);
      const lf = lateBoundCandidates.length === 0 ? makespan : Math.min(...lateBoundCandidates);
      schedule[id].LF = lf;
      schedule[id].LS = lf - task.duration;
      schedule[id].slack = schedule[id].LS - schedule[id].ES;
      schedule[id].critical = Math.abs(schedule[id].slack) < 1e-9;
    }

    const criticalPath = this.buildCriticalPath(order, schedule, byId);
    const agentLoad: Record<string, number> = {};
    for (const task of tasks) {
      agentLoad[task.owner] = (agentLoad[task.owner] ?? 0) + task.duration;
    }
    const handoffEdges: Array<{ from: string; to: string; across: boolean }> = [];
    for (const t of tasks) {
      for (const p of t.predecessors ?? []) {
        const predOwner = byId.get(p)!.owner;
        handoffEdges.push({ from: p, to: t.id, across: predOwner !== t.owner });
      }
    }

    return {
      schedule,
      criticalPath,
      makespan,
      agentLoad,
      handoffEdges,
    };
  }

  private topoSort(tasks: AgentTask[]): string[] {
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
      throw new Error("DistributedCriticalPathEngine.analyze: cycle detected in predecessors");
    }
    return order;
  }

  private buildCriticalPath(
    order: string[],
    schedule: Record<string, DistributedSchedule>,
    byId: Map<string, AgentTask>,
  ): string[] {
    const path: string[] = [];
    const roots = order.filter((id) => schedule[id].critical && (byId.get(id)!.predecessors ?? []).length === 0);
    if (roots.length === 0) return path;
    let cursor: string | undefined = roots[0];
    while (cursor !== undefined) {
      path.push(cursor);
      const nextId: string | undefined = order.find((id) => {
        const preds = byId.get(id)!.predecessors ?? [];
        return schedule[id].critical && preds.includes(cursor!);
      });
      cursor = nextId;
    }
    return path;
  }
}

export const distributedCriticalPathEngine = new DistributedCriticalPathEngine();
