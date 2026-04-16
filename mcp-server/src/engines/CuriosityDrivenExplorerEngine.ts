/**
 * CuriosityDrivenExplorerEngine — Proactively hunt knowledge gaps
 *
 * Phase 0.18 U-AGI5 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Runs at idle
 * moments to queue exploration targets: never-accessed registry entries,
 * unregistered files on disk, zero-citation tips, dispatcher actions with
 * zero invocations. The result is a rank-ordered exploration queue the hook
 * layer drains at 1-per-50 tool calls.
 *
 * No I/O. Callers feed observation lists; this engine scores and queues.
 *
 * @module engines/CuriosityDrivenExplorerEngine
 * @milestone PP-0.18-U-AGI5
 */

export type ExplorationKind =
  | "never-accessed-asset"
  | "unregistered-file"
  | "zero-citation-tip"
  | "zero-invocation-action"
  | "orphan-route"
  | "other";

export interface Observation {
  kind: ExplorationKind;
  target: string; // e.g., asset name, file path, action id
  ageDays?: number;
  context?: string;
}

export interface ExplorationCandidate extends Observation {
  score: number;
  priority: "low" | "medium" | "high";
  rationale: string;
}

export interface ExplorerWeights {
  base: Record<ExplorationKind, number>;
  ageBonusPerDay: number;
  ageBonusCap: number;
}

export const DEFAULT_EXPLORER_WEIGHTS: ExplorerWeights = Object.freeze({
  base: {
    "never-accessed-asset": 2,
    "unregistered-file": 3,
    "zero-citation-tip": 1,
    "zero-invocation-action": 2,
    "orphan-route": 3,
    other: 1,
  },
  ageBonusPerDay: 0.01,
  ageBonusCap: 2,
});

export class CuriosityDrivenExplorerEngine {
  private readonly weights: ExplorerWeights;
  private readonly queue: ExplorationCandidate[] = [];
  private readonly seen = new Set<string>();

  constructor(weights: ExplorerWeights = DEFAULT_EXPLORER_WEIGHTS) {
    this.weights = weights;
  }

  observe(obs: Observation): ExplorationCandidate | null {
    this.assertValid(obs);
    const key = `${obs.kind}:${obs.target}`;
    if (this.seen.has(key)) return null;
    this.seen.add(key);
    const candidate = this.score(obs);
    this.queue.push(candidate);
    return candidate;
  }

  observeBatch(observations: readonly Observation[]): ExplorationCandidate[] {
    const added: ExplorationCandidate[] = [];
    for (const o of observations) {
      const c = this.observe(o);
      if (c) added.push(c);
    }
    return added;
  }

  rank(limit = 10): ExplorationCandidate[] {
    if (limit <= 0) return [];
    const sorted = [...this.queue].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.target.localeCompare(b.target);
    });
    return sorted.slice(0, limit);
  }

  /**
   * Pop the next exploration target from the queue, removing it permanently.
   * Returns null when the queue is empty.
   */
  pop(): ExplorationCandidate | null {
    if (this.queue.length === 0) return null;
    this.queue.sort((a, b) => b.score - a.score || a.target.localeCompare(b.target));
    return this.queue.shift() ?? null;
  }

  size(): number {
    return this.queue.length;
  }

  clear(): void {
    this.queue.length = 0;
    this.seen.clear();
  }

  private score(obs: Observation): ExplorationCandidate {
    const base = this.weights.base[obs.kind];
    let score = base;
    if (obs.ageDays !== undefined && obs.ageDays > 0) {
      const bonus = Math.min(this.weights.ageBonusCap, obs.ageDays * this.weights.ageBonusPerDay);
      score += bonus;
    }
    const rounded = Math.round(score * 100) / 100;
    const priority: ExplorationCandidate["priority"] = rounded >= 4 ? "high" : rounded >= 2 ? "medium" : "low";
    return {
      ...obs,
      score: rounded,
      priority,
      rationale: this.buildRationale(obs, base, rounded),
    };
  }

  private buildRationale(obs: Observation, base: number, score: number): string {
    const parts = [`${obs.kind} (base ${base})`];
    if (obs.ageDays !== undefined && obs.ageDays > 0) parts.push(`age ${obs.ageDays}d`);
    parts.push(`score ${score}`);
    return parts.join(", ");
  }

  private assertValid(obs: Observation): void {
    if (!obs.kind) throw new Error("kind required");
    if (!(obs.kind in this.weights.base)) throw new Error(`unknown kind: ${obs.kind}`);
    if (!obs.target || obs.target.trim() === "") throw new Error("target required");
    if (obs.ageDays !== undefined && (!Number.isFinite(obs.ageDays) || obs.ageDays < 0)) {
      throw new Error("ageDays must be non-negative finite");
    }
  }
}

export const curiosityDrivenExplorerEngine = new CuriosityDrivenExplorerEngine();
