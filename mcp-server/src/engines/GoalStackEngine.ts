/**
 * GoalStackEngine — Hierarchical goal management for session awareness
 *
 * Phase 0.13 U-SAW3 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. A hierarchical
 * goal stack where each goal may have sub-goals. Hooks call `topN()` on
 * UserPromptSubmit to inject the top 5 active goals into the next prompt so
 * the session cannot drift. Design intents:
 *
 *   - Pure in-memory structure. Serialize via `toJSON()` / `fromJSON()`.
 *   - Deterministic IDs from a monotonically-increasing counter so tests can
 *     rely on the IDs produced during a sequence.
 *   - Goals are never mutated in place; completion / abandonment updates
 *     status+timestamp fields and leaves the tree structure intact so the
 *     insights ledger can reconstruct the timeline later.
 *
 * @module engines/GoalStackEngine
 * @milestone PP-0.13-U-SAW3
 */

export type GoalStatus = "active" | "completed" | "abandoned";

export interface Goal {
  id: string;
  text: string;
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
  parentId: string | null;
  childIds: string[];
  depth: number;
  priority: number;
}

export interface PushOptions {
  parentId?: string | null;
  priority?: number;
  at?: string;
}

export interface TopNEntry {
  id: string;
  text: string;
  depth: number;
  priority: number;
  parentId: string | null;
}

export class GoalStackEngine {
  private goals = new Map<string, Goal>();
  private order: string[] = []; // insertion order, used for tie-breaking
  private nextId = 1;

  push(text: string, opts: PushOptions = {}): Goal {
    const trimmed = (text ?? "").trim();
    if (!trimmed) throw new Error("GoalStackEngine.push: text must be a non-empty string");

    const parentId = opts.parentId ?? null;
    if (parentId !== null && !this.goals.has(parentId)) {
      throw new Error(`GoalStackEngine.push: unknown parentId ${parentId}`);
    }

    const parent = parentId !== null ? this.goals.get(parentId)! : null;
    const depth = parent ? parent.depth + 1 : 0;
    const id = `g${this.nextId++}`;
    const now = opts.at ?? new Date().toISOString();

    const goal: Goal = {
      id,
      text: trimmed,
      status: "active",
      createdAt: now,
      updatedAt: now,
      parentId,
      childIds: [],
      depth,
      priority: opts.priority ?? 0,
    };

    this.goals.set(id, goal);
    this.order.push(id);
    if (parent) parent.childIds.push(id);
    return goal;
  }

  /**
   * Mark a goal as completed. Returns the updated goal or null if id is unknown.
   * Does not touch children — caller decides whether to cascade.
   */
  complete(id: string, at?: string): Goal | null {
    return this.markStatus(id, "completed", at);
  }

  abandon(id: string, at?: string): Goal | null {
    return this.markStatus(id, "abandoned", at);
  }

  /**
   * Completes the goal AND every active descendant. Returns the number of
   * goals whose status actually changed.
   */
  completeCascade(id: string, at?: string): number {
    const root = this.goals.get(id);
    if (!root) return 0;
    const ts = at ?? new Date().toISOString();
    let changed = 0;
    for (const g of this.descendantsIncludingSelf(root)) {
      if (g.status === "active") {
        g.status = "completed";
        g.updatedAt = ts;
        changed += 1;
      }
    }
    return changed;
  }

  current(): Goal | null {
    // "Current" = the deepest active goal, tie-broken by latest insertion.
    let best: Goal | null = null;
    for (let i = this.order.length - 1; i >= 0; i -= 1) {
      const g = this.goals.get(this.order[i])!;
      if (g.status !== "active") continue;
      if (!best || g.depth > best.depth) {
        best = g;
        if (g.depth === this.maxActiveDepth()) break;
      }
    }
    return best;
  }

  topN(n = 5): TopNEntry[] {
    if (n <= 0) return [];
    const active: Goal[] = [];
    for (const id of this.order) {
      const g = this.goals.get(id)!;
      if (g.status === "active") active.push(g);
    }
    active.sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      if (a.depth !== b.depth) return b.depth - a.depth;
      return this.order.indexOf(a.id) - this.order.indexOf(b.id);
    });
    return active.slice(0, n).map((g) => ({
      id: g.id,
      text: g.text,
      depth: g.depth,
      priority: g.priority,
      parentId: g.parentId,
    }));
  }

  tree(): Array<Goal & { children: Goal[] }> {
    const roots: Goal[] = [];
    for (const id of this.order) {
      const g = this.goals.get(id)!;
      if (g.parentId === null) roots.push(g);
    }
    return roots.map((r) => this.annotateChildren(r));
  }

  get(id: string): Goal | null {
    return this.goals.get(id) ?? null;
  }

  all(): Goal[] {
    return this.order.map((id) => this.goals.get(id)!);
  }

  activeCount(): number {
    let n = 0;
    for (const g of this.goals.values()) if (g.status === "active") n += 1;
    return n;
  }

  clear(): void {
    this.goals.clear();
    this.order = [];
    this.nextId = 1;
  }

  toJSON(): { schemaVersion: 1; goals: Goal[]; nextId: number } {
    return { schemaVersion: 1, goals: this.all(), nextId: this.nextId };
  }

  static fromJSON(data: { schemaVersion: number; goals: Goal[]; nextId: number }): GoalStackEngine {
    if (data.schemaVersion !== 1) {
      throw new Error(`GoalStackEngine.fromJSON: unsupported schemaVersion ${data.schemaVersion}`);
    }
    const e = new GoalStackEngine();
    for (const g of data.goals) {
      e.goals.set(g.id, { ...g, childIds: [...g.childIds] });
      e.order.push(g.id);
    }
    e.nextId = data.nextId;
    return e;
  }

  // --- internals ---------------------------------------------------------

  private markStatus(id: string, status: GoalStatus, at?: string): Goal | null {
    const g = this.goals.get(id);
    if (!g) return null;
    if (g.status !== "active") return g;
    g.status = status;
    g.updatedAt = at ?? new Date().toISOString();
    return g;
  }

  private maxActiveDepth(): number {
    let m = -1;
    for (const g of this.goals.values()) {
      if (g.status === "active" && g.depth > m) m = g.depth;
    }
    return m;
  }

  private *descendantsIncludingSelf(root: Goal): IterableIterator<Goal> {
    yield root;
    for (const cid of root.childIds) {
      const c = this.goals.get(cid);
      if (c) yield* this.descendantsIncludingSelf(c);
    }
  }

  private annotateChildren(g: Goal): Goal & { children: Goal[] } {
    const children = g.childIds
      .map((cid) => this.goals.get(cid)!)
      .filter(Boolean)
      .map((c) => this.annotateChildren(c));
    return { ...g, children };
  }
}

export const goalStackEngine = new GoalStackEngine();
