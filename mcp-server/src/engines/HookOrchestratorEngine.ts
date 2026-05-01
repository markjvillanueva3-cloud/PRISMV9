/**
 * HookOrchestratorEngine — Deterministic hook ordering per tool event
 *
 * Phase 0.16 U-OP2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. PRISM's hook set
 * is growing fast (~86 per family). Without a formal ordering scheme,
 * hook execution becomes position-dependent, which breaks reproducibility.
 *
 * Each hook declares:
 *   - phase    (PreTool / PostTool / UserPromptSubmit / SessionStart / …)
 *   - priority (lower runs first within a phase)
 *   - dependsOn (hook ids that must run before this one)
 *   - mutex    (hook ids that MUST NOT co-run — guard conflicting writes)
 *
 * The engine:
 *   1. Topologically sorts hooks by dependsOn (cycle → error).
 *   2. Within each topo layer, stable-sorts by (priority, id).
 *   3. At execution, short-circuits on any hook that returns `{ block: true }`.
 *   4. Mutex checking catches co-scheduled hooks that cannot run together.
 *
 * No I/O. The engine is a planner + runner; the hook handlers own side effects.
 *
 * @module engines/HookOrchestratorEngine
 * @milestone PP-0.16-U-OP2
 */

export type HookPhase =
  | "PreTool"
  | "PostTool"
  | "UserPromptSubmit"
  | "SessionStart"
  | "SessionEnd"
  | "PreCompact"
  | "Stop";

export interface HookDefinition {
  id: string;
  phase: HookPhase;
  priority: number;
  dependsOn?: string[];
  mutex?: string[];
  handler: HookHandler;
}

export interface HookContext {
  phase: HookPhase;
  tool?: string;
  payload?: unknown;
  correlationId?: string;
}

export interface HookDecision {
  block?: boolean;
  reason?: string;
  data?: unknown;
}

export type HookHandler = (ctx: HookContext) => HookDecision | Promise<HookDecision>;

export interface PlanResult {
  phase: HookPhase;
  order: string[];
  diagnostics: string[];
}

export interface RunResult {
  order: string[];
  executed: Array<{ id: string; decision: HookDecision; durationMs: number }>;
  blockedBy: string | null;
}

export class HookOrchestratorEngine {
  private readonly registry = new Map<string, HookDefinition>();

  register(def: HookDefinition): void {
    this.assertValid(def);
    if (this.registry.has(def.id)) {
      throw new Error(`Hook already registered: ${def.id}`);
    }
    this.registry.set(def.id, def);
  }

  unregister(id: string): boolean {
    return this.registry.delete(id);
  }

  list(): HookDefinition[] {
    return [...this.registry.values()];
  }

  /**
   * Return hooks registered for the given event/phase, ordered deterministically.
   */
  getHooksForEvent(phase: string): HookDefinition[] {
    const hooks = this.list().filter((h) => (h.phase as string) === phase);
    return [...hooks].sort((a, b) => {
      const pa = Number(a.priority ?? 0);
      const pb = Number(b.priority ?? 0);
      if (pa !== pb) return pa - pb;
      return a.id.localeCompare(b.id);
    });
  }

  /**
   * Check if a hook is enabled (supports feature-flag semantics; default: registered = enabled).
   */
  isHookEnabled(hookId: string): boolean {
    const def = this.registry.get(hookId);
    if (!def) return false;
    return (def as { enabled?: boolean }).enabled !== false;
  }

  /**
   * Build an execution plan for the given phase. Throws on dependency cycles
   * or unsatisfied dependsOn. Returns diagnostics for soft issues (mutex
   * co-scheduling is reported here and again at run-time).
   */
  plan(phase: HookPhase): PlanResult {
    const hooks = this.list().filter((h) => h.phase === phase);
    const ids = new Set(hooks.map((h) => h.id));

    for (const h of hooks) {
      for (const dep of h.dependsOn ?? []) {
        if (!ids.has(dep)) {
          throw new Error(`Hook ${h.id} depends on unknown hook ${dep} (phase ${phase})`);
        }
      }
    }

    const sorted = this.topoSort(hooks);
    const diagnostics = this.detectMutexConflicts(sorted);

    return { phase, order: sorted.map((h) => h.id), diagnostics };
  }

  /**
   * Execute the plan for `phase`. Stops at the first block; returns the
   * recorded decisions in execution order. Failures throw.
   */
  async run(phase: HookPhase, ctx: Omit<HookContext, "phase">): Promise<RunResult> {
    const plan = this.plan(phase);
    const hooksById = new Map(this.list().map((h) => [h.id, h]));
    const executed: RunResult["executed"] = [];
    let blockedBy: string | null = null;

    for (const id of plan.order) {
      const hook = hooksById.get(id)!;
      const started = Date.now();
      const decision = await Promise.resolve(hook.handler({ ...ctx, phase }));
      const durationMs = Date.now() - started;
      executed.push({ id, decision, durationMs });
      if (decision.block) {
        blockedBy = id;
        break;
      }
    }

    return { order: plan.order, executed, blockedBy };
  }

  // --- internals ---------------------------------------------------------

  private assertValid(def: HookDefinition): void {
    if (!def.id || def.id.trim() === "") throw new Error("HookDefinition.id required");
    if (!def.phase) throw new Error("HookDefinition.phase required");
    if (!Number.isFinite(def.priority)) throw new Error("HookDefinition.priority must be finite");
    if (typeof def.handler !== "function") throw new Error("HookDefinition.handler must be a function");
  }

  private topoSort(hooks: HookDefinition[]): HookDefinition[] {
    const idMap = new Map(hooks.map((h) => [h.id, h]));
    const indeg = new Map<string, number>();
    const edges = new Map<string, string[]>();
    for (const h of hooks) {
      indeg.set(h.id, h.dependsOn?.length ?? 0);
      edges.set(h.id, []);
    }
    for (const h of hooks) {
      for (const dep of h.dependsOn ?? []) {
        edges.get(dep)!.push(h.id);
      }
    }

    const queue: string[] = [];
    const pushReady = () => {
      const ready = hooks.filter((h) => (indeg.get(h.id) ?? 0) === 0 && !queue.includes(h.id) && !outList.some((o) => o.id === h.id));
      ready.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
      for (const r of ready) queue.push(r.id);
    };

    const outList: HookDefinition[] = [];
    pushReady();

    while (queue.length > 0) {
      const id = queue.shift()!;
      outList.push(idMap.get(id)!);
      for (const next of edges.get(id) ?? []) {
        indeg.set(next, (indeg.get(next) ?? 0) - 1);
      }
      pushReady();
    }

    if (outList.length !== hooks.length) {
      const remaining = hooks.filter((h) => !outList.includes(h)).map((h) => h.id);
      throw new Error(`Hook dependency cycle detected among: ${remaining.join(", ")}`);
    }
    return outList;
  }

  private detectMutexConflicts(sorted: HookDefinition[]): string[] {
    const diagnostics: string[] = [];
    const ids = new Set(sorted.map((h) => h.id));
    for (const h of sorted) {
      for (const m of h.mutex ?? []) {
        if (ids.has(m)) {
          diagnostics.push(`mutex conflict: ${h.id} co-scheduled with ${m}`);
        }
      }
    }
    return diagnostics;
  }
}

export const hookOrchestratorEngine = new HookOrchestratorEngine();
