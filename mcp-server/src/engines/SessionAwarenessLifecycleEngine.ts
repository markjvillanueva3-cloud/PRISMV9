/**
 * SessionAwarenessLifecycleEngine — 8-phase awareness loop orchestrator
 *
 * Phase 0.13 U-SAW2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. A deterministic
 * state machine over the session awareness lifecycle:
 *
 *   BOOT → VERIFY → BRIEF → EXECUTE ⇄ METACOG_CHECK → REFLECT → HANDOFF → NEXT_BOOT
 *
 * This engine does not perform I/O or call other engines; it is the skeleton
 * that hook handlers and dispatchers use to agree on *which* phase a session
 * is in and *which* transitions are legal. That split keeps transition logic
 * unit-testable without mocking a filesystem.
 *
 * Separate from SessionLifecycleEngine (metrics + checkpointing) by design:
 * this one tracks cognitive phase, that one tracks operational counters.
 *
 * @module engines/SessionAwarenessLifecycleEngine
 * @milestone PP-0.13-U-SAW2
 */

export type LifecyclePhase =
  | "BOOT"
  | "VERIFY"
  | "BRIEF"
  | "EXECUTE"
  | "METACOG_CHECK"
  | "REFLECT"
  | "HANDOFF"
  | "NEXT_BOOT";

export const LIFECYCLE_PHASES: readonly LifecyclePhase[] = Object.freeze([
  "BOOT",
  "VERIFY",
  "BRIEF",
  "EXECUTE",
  "METACOG_CHECK",
  "REFLECT",
  "HANDOFF",
  "NEXT_BOOT",
]);

/**
 * Legal forward transitions for the awareness loop. EXECUTE and METACOG_CHECK
 * form a two-way loop; every other edge is strictly forward.
 */
const TRANSITIONS: Readonly<Record<LifecyclePhase, readonly LifecyclePhase[]>> = Object.freeze({
  BOOT: ["VERIFY"],
  VERIFY: ["BRIEF"],
  BRIEF: ["EXECUTE"],
  EXECUTE: ["METACOG_CHECK", "REFLECT"],
  METACOG_CHECK: ["EXECUTE", "REFLECT"],
  REFLECT: ["HANDOFF"],
  HANDOFF: ["NEXT_BOOT"],
  NEXT_BOOT: [],
});

export interface PhaseEntry {
  phase: LifecyclePhase;
  enteredAt: string;
  reason?: string;
  note?: string;
}

export interface LifecycleSnapshot {
  sessionId: string;
  current: LifecyclePhase;
  history: PhaseEntry[];
  executeToMetacogCount: number;
  lastTransitionAt: string;
}

export interface TransitionResult {
  ok: boolean;
  from: LifecyclePhase;
  to: LifecyclePhase;
  reason?: string;
}

export class SessionAwarenessLifecycleEngine {
  private readonly sessionId: string;
  private readonly history: PhaseEntry[] = [];
  private current: LifecyclePhase = "BOOT";
  private executeToMetacogCount = 0;

  constructor(sessionId: string, startedAt: string = new Date().toISOString()) {
    if (!sessionId || sessionId.trim() === "") {
      throw new Error("SessionAwarenessLifecycleEngine requires a non-empty sessionId");
    }
    this.sessionId = sessionId;
    this.history.push({ phase: "BOOT", enteredAt: startedAt });
  }

  static legalTransitions(from: LifecyclePhase): readonly LifecyclePhase[] {
    return TRANSITIONS[from];
  }

  static canTransition(from: LifecyclePhase, to: LifecyclePhase): boolean {
    return TRANSITIONS[from].includes(to);
  }

  getCurrent(): LifecyclePhase {
    return this.current;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getHistory(): readonly PhaseEntry[] {
    return this.history;
  }

  getExecuteToMetacogCount(): number {
    return this.executeToMetacogCount;
  }

  isTerminal(): boolean {
    return this.current === "NEXT_BOOT";
  }

  transition(to: LifecyclePhase, opts: { reason?: string; note?: string; at?: string } = {}): TransitionResult {
    if (!SessionAwarenessLifecycleEngine.canTransition(this.current, to)) {
      return {
        ok: false,
        from: this.current,
        to,
        reason: `Illegal transition: ${this.current} -> ${to}`,
      };
    }

    const enteredAt = opts.at ?? new Date().toISOString();
    if (this.current === "EXECUTE" && to === "METACOG_CHECK") {
      this.executeToMetacogCount += 1;
    }

    const from = this.current;
    this.current = to;
    this.history.push({ phase: to, enteredAt, reason: opts.reason, note: opts.note });

    return { ok: true, from, to };
  }

  snapshot(): LifecycleSnapshot {
    const last = this.history[this.history.length - 1];
    return {
      sessionId: this.sessionId,
      current: this.current,
      history: [...this.history],
      executeToMetacogCount: this.executeToMetacogCount,
      lastTransitionAt: last.enteredAt,
    };
  }

  /**
   * Returns the shortest ordered path from the current phase to a target phase,
   * or null if no such path exists. Used by hook handlers to decide whether a
   * fast-forward transition sequence is legal before emitting it.
   */
  pathTo(target: LifecyclePhase): LifecyclePhase[] | null {
    if (this.current === target) return [this.current];
    const visited = new Set<LifecyclePhase>([this.current]);
    const queue: LifecyclePhase[][] = [[this.current]];
    while (queue.length > 0) {
      const p = queue.shift()!;
      const head = p[p.length - 1];
      for (const next of TRANSITIONS[head]) {
        if (visited.has(next)) continue;
        const extended = [...p, next];
        if (next === target) return extended;
        visited.add(next);
        queue.push(extended);
      }
    }
    return null;
  }
}

/**
 * Returns a fresh engine. Unlike most PRISM engines we do NOT export a module
 * singleton: each session deserves its own lifecycle instance.
 */
export function createSessionAwarenessLifecycle(sessionId: string): SessionAwarenessLifecycleEngine {
  return new SessionAwarenessLifecycleEngine(sessionId);
}
