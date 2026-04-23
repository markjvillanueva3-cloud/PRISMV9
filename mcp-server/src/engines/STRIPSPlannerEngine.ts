/**
 * STRIPSPlannerEngine — U-FORE-15 (Real Planning Algorithms)
 * ===========================================================
 *
 * Classical STRIPS-style planner. Given an initial set of facts, a goal
 * set of facts, and a library of actions (each with precondition, add,
 * and delete effects), finds a sequence of actions transforming initial
 * → goal.
 *
 * Algorithm: forward state-space search with best-first heuristic
 * (h = number of unsatisfied goal facts). Uses closed set to prevent
 * revisiting identical states. Bounded by maxNodes to avoid infinite
 * expansion on unsolvable instances.
 *
 * Inputs  → { initial: Set<string>, goal: Set<string>, actions: Action[] }
 * Outputs → { plan: string[], expanded: number, foundGoal: boolean }
 */

export interface STRIPSAction {
  name: string;
  preconditions: string[];
  add: string[];
  delete: string[];
  cost?: number;
}

export interface STRIPSInput {
  initial: string[];
  goal: string[];
  actions: STRIPSAction[];
  maxNodes?: number;
}

export interface STRIPSResult {
  plan: string[];
  expanded: number;
  foundGoal: boolean;
  pathCost: number;
}

type Node = {
  state: Set<string>;
  key: string;
  plan: string[];
  cost: number;
  h: number;
};

function stateKey(facts: Set<string>): string {
  return Array.from(facts).sort().join("|");
}

function heuristic(state: Set<string>, goal: Set<string>): number {
  let missing = 0;
  for (const g of goal) if (!state.has(g)) missing++;
  return missing;
}

function applicable(state: Set<string>, act: STRIPSAction): boolean {
  for (const p of act.preconditions) if (!state.has(p)) return false;
  return true;
}

function apply(state: Set<string>, act: STRIPSAction): Set<string> {
  const next = new Set(state);
  for (const d of act.delete) next.delete(d);
  for (const a of act.add) next.add(a);
  return next;
}

const DEFAULT_MAX_NODES = 20_000;

export class STRIPSPlannerEngine {
  readonly name = "STRIPSPlannerEngine";

  plan(input: STRIPSInput): STRIPSResult {
    this.validate(input);
    const goal = new Set(input.goal);
    const start: Set<string> = new Set(input.initial);
    const maxNodes = Math.max(1, input.maxNodes ?? DEFAULT_MAX_NODES);

    if (heuristic(start, goal) === 0) {
      return { plan: [], expanded: 0, foundGoal: true, pathCost: 0 };
    }

    const frontier: Node[] = [{
      state: start,
      key: stateKey(start),
      plan: [],
      cost: 0,
      h: heuristic(start, goal),
    }];
    const closed = new Map<string, number>();
    let expanded = 0;

    while (frontier.length > 0) {
      frontier.sort((a, b) => (a.cost + a.h) - (b.cost + b.h));
      const node = frontier.shift()!;
      if (node.h === 0) {
        return { plan: node.plan, expanded, foundGoal: true, pathCost: node.cost };
      }
      const prevCost = closed.get(node.key);
      if (prevCost !== undefined && prevCost <= node.cost) continue;
      closed.set(node.key, node.cost);
      expanded++;
      if (expanded > maxNodes) break;

      for (const act of input.actions) {
        if (!applicable(node.state, act)) continue;
        const next = apply(node.state, act);
        const key = stateKey(next);
        const cost = node.cost + (act.cost ?? 1);
        const h = heuristic(next, goal);
        const plan = [...node.plan, act.name];
        const prev = closed.get(key);
        if (prev !== undefined && prev <= cost) continue;
        frontier.push({ state: next, key, plan, cost, h });
      }
    }
    return { plan: [], expanded, foundGoal: false, pathCost: 0 };
  }

  private validate(input: STRIPSInput): void {
    if (!input) throw new Error("STRIPSPlannerEngine.plan: input required");
    if (!Array.isArray(input.initial)) throw new Error("STRIPSPlannerEngine.plan: initial[] required");
    if (!Array.isArray(input.goal)) throw new Error("STRIPSPlannerEngine.plan: goal[] required");
    if (!Array.isArray(input.actions)) throw new Error("STRIPSPlannerEngine.plan: actions[] required");
    for (const a of input.actions) {
      if (!a || typeof a.name !== "string") {
        throw new Error("STRIPSPlannerEngine.plan: each action must have a name");
      }
      if (!Array.isArray(a.preconditions) || !Array.isArray(a.add) || !Array.isArray(a.delete)) {
        throw new Error(`STRIPSPlannerEngine.plan: action '${a.name}' missing preconditions/add/delete`);
      }
    }
  }
}

export const stripsPlannerEngine = new STRIPSPlannerEngine();
