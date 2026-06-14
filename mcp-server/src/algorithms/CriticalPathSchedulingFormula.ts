/**
 * CriticalPathSchedulingFormula — Critical Path Method (CPM) scheduling
 * for production/job/project networks (hotel iter16, 2026-05-24,
 * U-CPM-SCHEDULING).
 *
 * Closes G5 from the ERP-comparison audit. Given a DAG of tasks with
 * durations + precedence constraints, computes:
 *   - ES (earliest start) / EF (earliest finish)  — forward pass
 *   - LS (latest start)   / LF (latest finish)    — backward pass
 *   - total slack = LS - ES                       — float (delay budget)
 *   - critical path = chain of tasks with slack ≤ tolerance
 *   - project duration = max EF across all tasks
 *
 * Hotel-soul:
 *   - **R12 fail-loud** — cycles, unknown predecessor refs, negative
 *     durations, duplicate IDs all throw
 *   - **deterministic** — topological order tie-break by id ASC; no PRNG
 *   - **graph-integrity gate** — cycle detection before scheduling (a job
 *     network with a cycle is unschedulable; refuse to compute, don't
 *     produce silently-wrong critical path)
 *
 * Reference: Kelley & Walker 1959 (DuPont CPM original); Moder/Phillips/
 * Davis "Project Management with CPM, PERT and Precedence Diagramming"
 * 3e (Van Nostrand Reinhold 1983), Ch.4 (Forward/Backward Pass).
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface TaskInput {
  id: string;
  duration: number;             // minutes (or any time unit — caller decides)
  predecessor_ids?: string[];   // ids that must finish before this can start
  label?: string;
}

export interface ScheduledTask {
  id: string;
  label?: string;
  duration: number;
  predecessor_ids: string[];
  successor_ids: string[];
  earliest_start: number;
  earliest_finish: number;
  latest_start: number;
  latest_finish: number;
  total_slack: number;
  is_critical: boolean;
}

export interface CriticalPathResult {
  tasks: ScheduledTask[];           // sorted by id ASC for deterministic output
  topological_order: string[];      // forward-pass evaluation order
  project_duration: number;         // max EF
  critical_path: string[];          // ordered chain of critical tasks
  fetched_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const SLACK_CRITICAL_TOLERANCE = 1e-9;
const MAX_TASKS = 10_000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function assertNonEmptyArray(a: unknown, label: string): TaskInput[] {
  if (!Array.isArray(a)) throw new Error(`${label}: must be an array`);
  if (a.length === 0) throw new Error(`${label}: empty`);
  if (a.length > MAX_TASKS) throw new Error(`${label}: exceeds ${MAX_TASKS}`);
  return a as TaskInput[];
}

function assertTask(t: unknown, idx: number): TaskInput {
  if (t === null || typeof t !== "object") {
    throw new Error(`tasks[${idx}]: must be an object`);
  }
  const o = t as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.trim().length === 0) {
    throw new Error(`tasks[${idx}].id: must be non-empty string`);
  }
  if (!Number.isFinite(o.duration)) {
    throw new Error(`tasks[${idx}].duration: must be finite (got ${String(o.duration)})`);
  }
  if ((o.duration as number) < 0) {
    throw new Error(`tasks[${idx}].duration: must be >= 0 (got ${o.duration})`);
  }
  const preds = o.predecessor_ids;
  if (preds !== undefined && !Array.isArray(preds)) {
    throw new Error(`tasks[${idx}].predecessor_ids: must be array if provided`);
  }
  return {
    id: (o.id as string).trim(),
    duration: o.duration as number,
    predecessor_ids: (preds as string[] | undefined) ?? [],
    label: typeof o.label === "string" ? o.label : undefined,
  };
}

/**
 * Kahn's topological sort. Throws on cycle detection (hotel-soul: never
 * silently mis-schedule a cyclic network).
 *
 * Tie-break order = id ASC for deterministic output.
 */
function topologicalSort(
  ids: string[],
  predMap: Map<string, string[]>,
  succMap: Map<string, string[]>,
): string[] {
  const inDegree = new Map<string, number>();
  for (const id of ids) inDegree.set(id, (predMap.get(id) ?? []).length);
  // Ready queue = nodes with in-degree 0, sorted ASC by id
  const ready: string[] = ids
    .filter(id => (inDegree.get(id) ?? 0) === 0)
    .sort((a, b) => a.localeCompare(b));
  const order: string[] = [];
  while (ready.length > 0) {
    const cur = ready.shift()!;
    order.push(cur);
    for (const succ of succMap.get(cur) ?? []) {
      const newDeg = (inDegree.get(succ) ?? 0) - 1;
      inDegree.set(succ, newDeg);
      if (newDeg === 0) {
        // Insert sorted to keep determinism
        const insertIdx = ready.findIndex(x => x.localeCompare(succ) > 0);
        if (insertIdx === -1) ready.push(succ);
        else ready.splice(insertIdx, 0, succ);
      }
    }
  }
  if (order.length !== ids.length) {
    const unscheduled = ids.filter(id => !order.includes(id));
    throw new Error(`CPM: cycle detected — unscheduled tasks: ${unscheduled.slice(0, 10).join(", ")}${unscheduled.length > 10 ? "..." : ""}`);
  }
  return order;
}

// ─── Main scheduler ────────────────────────────────────────────────────────

/**
 * Schedule a DAG of tasks via CPM forward + backward pass.
 *
 * @param tasksInput — task list with durations + predecessor refs
 * @throws on cycle, unknown predecessor id, duplicate task id, malformed
 *         input (all hotel-soul fail-loud)
 */
export function scheduleCriticalPath(tasksInput: TaskInput[]): CriticalPathResult {
  const arr = assertNonEmptyArray(tasksInput, "tasks");
  const validated = arr.map((t, i) => assertTask(t, i));

  // Build id → task map; detect duplicate ids
  const taskMap = new Map<string, TaskInput>();
  for (const t of validated) {
    if (taskMap.has(t.id)) throw new Error(`tasks: duplicate id '${t.id}'`);
    taskMap.set(t.id, t);
  }

  // Verify every predecessor reference resolves to a known task
  const ids = [...taskMap.keys()];
  const predMap = new Map<string, string[]>();
  const succMap = new Map<string, string[]>();
  for (const id of ids) { predMap.set(id, []); succMap.set(id, []); }
  for (const t of validated) {
    for (const pid of t.predecessor_ids ?? []) {
      if (!taskMap.has(pid)) {
        throw new Error(`tasks[${t.id}].predecessor_ids: unknown task '${pid}'`);
      }
      if (pid === t.id) {
        throw new Error(`tasks[${t.id}]: self-loop (predecessor refers to self)`);
      }
      predMap.get(t.id)!.push(pid);
      succMap.get(pid)!.push(t.id);
    }
  }

  // Topological sort (throws on cycle)
  const order = topologicalSort(ids, predMap, succMap);

  // Forward pass: ES, EF
  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of order) {
    const preds = predMap.get(id) ?? [];
    const myES = preds.length === 0 ? 0 : Math.max(...preds.map(p => ef.get(p) ?? 0));
    const dur = taskMap.get(id)!.duration;
    es.set(id, myES);
    ef.set(id, myES + dur);
  }

  // Project duration = max EF
  const projectDuration = Math.max(...ids.map(id => ef.get(id) ?? 0));

  // Backward pass: LF, LS (process in reverse topological order)
  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    const succs = succMap.get(id) ?? [];
    const myLF = succs.length === 0 ? projectDuration : Math.min(...succs.map(s => ls.get(s) ?? projectDuration));
    const dur = taskMap.get(id)!.duration;
    lf.set(id, myLF);
    ls.set(id, myLF - dur);
  }

  // Build output rows; identify critical tasks (slack ≤ tolerance)
  const tasks: ScheduledTask[] = ids.map(id => {
    const slack = (ls.get(id) ?? 0) - (es.get(id) ?? 0);
    return {
      id,
      label: taskMap.get(id)?.label,
      duration: taskMap.get(id)!.duration,
      predecessor_ids: [...(predMap.get(id) ?? [])].sort((a, b) => a.localeCompare(b)),
      successor_ids: [...(succMap.get(id) ?? [])].sort((a, b) => a.localeCompare(b)),
      earliest_start: es.get(id) ?? 0,
      earliest_finish: ef.get(id) ?? 0,
      latest_start: ls.get(id) ?? 0,
      latest_finish: lf.get(id) ?? 0,
      total_slack: slack,
      is_critical: slack <= SLACK_CRITICAL_TOLERANCE,
    };
  }).sort((a, b) => a.id.localeCompare(b.id));

  // Reconstruct critical path: chain critical tasks from start → end via successor
  // following the earliest-ES + highest-EF critical successor at each step
  const criticalIds = new Set(tasks.filter(t => t.is_critical).map(t => t.id));
  const startCritical = order.find(id => criticalIds.has(id) && (predMap.get(id) ?? []).every(p => !criticalIds.has(p)));
  const criticalPath: string[] = [];
  if (startCritical !== undefined) {
    let cursor: string | undefined = startCritical;
    const visited = new Set<string>();
    while (cursor !== undefined && !visited.has(cursor)) {
      visited.add(cursor);
      criticalPath.push(cursor);
      const succs = (succMap.get(cursor) ?? []).filter(s => criticalIds.has(s));
      cursor = succs.sort((a, b) => a.localeCompare(b))[0];
    }
  }

  return {
    tasks,
    topological_order: order,
    project_duration: projectDuration,
    critical_path: criticalPath,
    fetched_at: new Date().toISOString(),
  };
}
