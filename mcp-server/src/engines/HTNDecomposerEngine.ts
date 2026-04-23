/**
 * HTNDecomposerEngine — U-FORE-15 (Real Planning Algorithms)
 * ==========================================================
 *
 * Hierarchical Task Network planner. Given a set of methods (compound
 * task → ordered list of subtasks) and operators (primitive actions with
 * preconditions), decomposes a goal task into a flat ordered plan of
 * primitive actions.
 *
 * Input model:
 *   - Task: { name, args? }
 *   - Method: { task, subtasks[], condition(state) }
 *   - Operator: { name, precondition(state), effect(state) }
 *   - State: arbitrary record (copied on effect)
 *
 * Strategy: total-order HTN with backtracking across applicable methods.
 * Returns the first successful primitive sequence found or throws if
 * no decomposition satisfies preconditions.
 *
 * This is a deterministic, side-effect-free planner suitable for small
 * workflow graphs (≤ 50 tasks). It is NOT a full SHOP2 implementation.
 */

export interface HTNTask {
  name: string;
  args?: Record<string, unknown>;
}

export interface HTNState {
  [key: string]: unknown;
}

export interface HTNMethod {
  task: string;
  condition?: (state: HTNState, args?: Record<string, unknown>) => boolean;
  subtasks: HTNTask[];
}

export interface HTNOperator {
  name: string;
  precondition?: (state: HTNState, args?: Record<string, unknown>) => boolean;
  effect: (state: HTNState, args?: Record<string, unknown>) => HTNState;
}

export interface HTNPlan {
  primitiveActions: Array<{ name: string; args?: Record<string, unknown> }>;
  finalState: HTNState;
  steps: number;
  depth: number;
}

export class HTNDecomposerEngine {
  readonly name = "HTNDecomposerEngine";
  private readonly maxDepth = 32;

  decompose(
    goal: HTNTask,
    initialState: HTNState,
    operators: HTNOperator[],
    methods: HTNMethod[],
  ): HTNPlan {
    this.validateInputs(goal, initialState, operators, methods);

    const opIndex = new Map(operators.map((op) => [op.name, op] as const));
    const methodIndex = new Map<string, HTNMethod[]>();
    for (const m of methods) {
      if (!methodIndex.has(m.task)) methodIndex.set(m.task, []);
      methodIndex.get(m.task)!.push(m);
    }

    const actions: HTNPlan["primitiveActions"] = [];
    const result = this.expand(
      [goal],
      { ...initialState },
      opIndex,
      methodIndex,
      actions,
      0,
    );
    if (!result.ok) {
      throw new Error(
        `HTNDecomposerEngine: no decomposition for task '${goal.name}' — ${result.reason}`,
      );
    }
    return {
      primitiveActions: actions,
      finalState: result.state,
      steps: actions.length,
      depth: result.depth,
    };
  }

  private expand(
    agenda: HTNTask[],
    state: HTNState,
    ops: Map<string, HTNOperator>,
    methods: Map<string, HTNMethod[]>,
    output: HTNPlan["primitiveActions"],
    depth: number,
  ): { ok: true; state: HTNState; depth: number } | { ok: false; reason: string } {
    if (depth > this.maxDepth) return { ok: false, reason: "max depth exceeded" };
    if (agenda.length === 0) return { ok: true, state, depth };

    const [head, ...rest] = agenda;
    const op = ops.get(head.name);
    if (op) {
      if (op.precondition && !op.precondition(state, head.args)) {
        return { ok: false, reason: `precondition failed: ${head.name}` };
      }
      const newState = op.effect(state, head.args);
      output.push({ name: head.name, args: head.args });
      return this.expand(rest, newState, ops, methods, output, depth + 1);
    }

    const candidates = methods.get(head.name) ?? [];
    if (candidates.length === 0) {
      return { ok: false, reason: `no method/operator for task '${head.name}'` };
    }

    for (const m of candidates) {
      if (m.condition && !m.condition(state, head.args)) continue;
      const savedLen = output.length;
      const result = this.expand(
        [...m.subtasks, ...rest],
        state,
        ops,
        methods,
        output,
        depth + 1,
      );
      if (result.ok) return result;
      output.length = savedLen;
    }
    return { ok: false, reason: `no applicable method for '${head.name}'` };
  }

  private validateInputs(
    goal: HTNTask,
    state: HTNState,
    operators: HTNOperator[],
    methods: HTNMethod[],
  ): void {
    if (!goal || typeof goal.name !== "string") {
      throw new Error("HTNDecomposerEngine.decompose: goal.name required");
    }
    if (!state || typeof state !== "object") {
      throw new Error("HTNDecomposerEngine.decompose: state required");
    }
    if (!Array.isArray(operators)) {
      throw new Error("HTNDecomposerEngine.decompose: operators array required");
    }
    if (!Array.isArray(methods)) {
      throw new Error("HTNDecomposerEngine.decompose: methods array required");
    }
  }
}

export const htnDecomposerEngine = new HTNDecomposerEngine();
