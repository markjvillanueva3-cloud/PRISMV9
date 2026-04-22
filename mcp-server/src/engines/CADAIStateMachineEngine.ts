/**
 * CADAIStateMachineEngine — U-CADC-AI04 / CAD-COMPLETE-MS0 PHASE-30
 *
 * Observable finite-state machine for the CAD AI control loop. Models
 * multi-step flows as transitions between a fixed set of named states
 * so callers can pause, resume, inspect, and replay long-running
 * sessions (e.g. blisk generation: sketch → extrude-hub →
 * pattern-blades → fillet-junctions → export).
 *
 * State space (8):
 *   IDLE        — no work in flight
 *   DECOMPOSING — CADIntentDecomposerEngine (AI02) is parsing NL input
 *   PLANNING    — CADOperationPlanner/ComplexPart/Assembly emitting ops
 *   EXECUTING   — adapter.buildScript + optional adapter.executeScript
 *   VALIDATING  — adapter.validateOutput
 *   LEARNING    — feedback loop into MLC07 / HumanInLoop
 *   FAILED      — terminal failure (reason + last-good state recorded)
 *   COMPLETE    — terminal success
 *
 * Transition events (10):
 *   start, decomposed, planned, executed, validated, learned,
 *   fail, reset, pause, resume
 *
 * Observer contract:
 *   - Every transition fires to every registered observer with a
 *     TransitionEvent; observer throws are logged + swallowed so one
 *     bad listener cannot derail the FSM.
 *   - All transitions are appended to an in-memory log ringbuffer
 *     (default 1000 entries, configurable) and exposed via getLog().
 *
 * Pause/resume:
 *   - pause() stamps the current state as the "paused-at" state and
 *     enters a PAUSED overlay flag; getState() still returns the
 *     underlying state so the UI can render "DECOMPOSING (paused)".
 *   - resume() clears the flag; dispatch() refuses work while paused
 *     (throws PausedError) unless the event is `resume` or `reset`.
 *
 * @module engines/CADAIStateMachineEngine
 */

/** Every named state in the CAD AI loop. */
export const CAD_AI_STATES = [
  "IDLE",
  "DECOMPOSING",
  "PLANNING",
  "EXECUTING",
  "VALIDATING",
  "LEARNING",
  "FAILED",
  "COMPLETE",
] as const;
export type CADAIState = (typeof CAD_AI_STATES)[number];

/** Every event the FSM accepts. */
export const CAD_AI_EVENTS = [
  "start",
  "decomposed",
  "planned",
  "executed",
  "validated",
  "learned",
  "fail",
  "reset",
  "pause",
  "resume",
] as const;
export type CADAIEvent = (typeof CAD_AI_EVENTS)[number];

/** One historical transition. */
export interface TransitionEvent {
  /** Monotonic transition id (0-based). */
  id: number;
  /** Session id the FSM instance belongs to. */
  sessionId: string;
  /** Incoming state. */
  from: CADAIState;
  /** Outgoing state. */
  to: CADAIState;
  /** Triggering event. */
  event: CADAIEvent;
  /** Unix ms. */
  at: number;
  /** Optional payload carried by the caller (intent, op counts, errors). */
  payload?: unknown;
  /** True if this transition was refused due to pause. */
  refusedDueToPause?: boolean;
}

/** Observer callback. */
export type FSMObserver = (ev: TransitionEvent) => void | Promise<void>;

/** Instance snapshot for MCP + UI. */
export interface FSMSnapshot {
  sessionId: string;
  state: CADAIState;
  paused: boolean;
  lastEvent: CADAIEvent | null;
  transitionCount: number;
  startedAt: number | null;
  lastTransitionAt: number | null;
  failedReason?: string;
  terminal: boolean;
}

/** Typed errors. */
export class IllegalTransitionError extends Error {
  constructor(
    public readonly from: CADAIState,
    public readonly event: CADAIEvent,
  ) {
    super(`Illegal transition: event "${event}" not allowed in state "${from}"`);
    this.name = "IllegalTransitionError";
  }
}
export class PausedError extends Error {
  constructor(public readonly state: CADAIState) {
    super(`FSM is paused in state "${state}"; call resume() or reset() first.`);
    this.name = "PausedError";
  }
}
export class UnknownSessionError extends Error {
  constructor(public readonly sessionId: string) {
    super(`Unknown FSM session: ${sessionId}`);
    this.name = "UnknownSessionError";
  }
}

// ── Transition table ─────────────────────────────────────────────────────

/** Maps (state, event) → next state. undefined means illegal transition. */
const TRANSITIONS: Readonly<Partial<Record<CADAIState, Partial<Record<CADAIEvent, CADAIState>>>>> = {
  IDLE: {
    start: "DECOMPOSING",
    reset: "IDLE",
    fail: "FAILED",
  },
  DECOMPOSING: {
    decomposed: "PLANNING",
    fail: "FAILED",
    reset: "IDLE",
  },
  PLANNING: {
    planned: "EXECUTING",
    fail: "FAILED",
    reset: "IDLE",
  },
  EXECUTING: {
    executed: "VALIDATING",
    fail: "FAILED",
    reset: "IDLE",
  },
  VALIDATING: {
    validated: "LEARNING",
    fail: "FAILED",
    reset: "IDLE",
  },
  LEARNING: {
    learned: "COMPLETE",
    fail: "FAILED",
    reset: "IDLE",
  },
  FAILED: {
    reset: "IDLE",
  },
  COMPLETE: {
    reset: "IDLE",
    start: "DECOMPOSING", // recycle the same session for the next flow
  },
};

const TERMINAL_STATES = new Set<CADAIState>(["FAILED", "COMPLETE"]);

// ── Single-session FSM ───────────────────────────────────────────────────

class FSMInstance {
  state: CADAIState = "IDLE";
  paused = false;
  lastEvent: CADAIEvent | null = null;
  startedAt: number | null = null;
  lastTransitionAt: number | null = null;
  failedReason?: string;
  readonly log: TransitionEvent[] = [];
  nextTransitionId = 0;
  constructor(
    public readonly sessionId: string,
    private readonly logCap: number,
  ) {}
  appendLog(ev: TransitionEvent): void {
    this.log.push(ev);
    if (this.log.length > this.logCap) this.log.shift();
  }
}

// ── Engine ───────────────────────────────────────────────────────────────

/**
 * Multi-session FSM host. Each caller owns a `sessionId`; the engine
 * tracks one FSMInstance per session and fans transitions out to
 * registered observers.
 */
export class CADAIStateMachineEngine {
  private readonly sessions = new Map<string, FSMInstance>();
  private readonly observers: FSMObserver[] = [];
  private readonly logCap: number;

  constructor(options: { logCap?: number } = {}) {
    this.logCap = options.logCap ?? 1000;
  }

  /** Create or reset a session to IDLE. Idempotent. */
  open(sessionId: string): FSMSnapshot {
    if (typeof sessionId !== "string" || sessionId.trim().length === 0) {
      throw new Error("sessionId is required");
    }
    let inst = this.sessions.get(sessionId);
    if (!inst) {
      inst = new FSMInstance(sessionId, this.logCap);
      this.sessions.set(sessionId, inst);
    } else {
      // Force back to IDLE without a transition event.
      inst.state = "IDLE";
      inst.paused = false;
      inst.lastEvent = null;
      inst.startedAt = null;
      inst.lastTransitionAt = null;
      inst.failedReason = undefined;
    }
    return this.snapshot(inst);
  }

  /** Drop a session (and its log) entirely. */
  close(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  /** Does this session exist? */
  has(sessionId: string): boolean {
    return this.sessions.has(sessionId);
  }

  /** List currently tracked sessions. */
  list(): string[] {
    return Array.from(this.sessions.keys());
  }

  /** Fire an event. Throws IllegalTransitionError / PausedError. */
  dispatch(sessionId: string, event: CADAIEvent, payload?: unknown): FSMSnapshot {
    const inst = this.require(sessionId);

    // Pause gate — only resume/reset pass through.
    if (inst.paused && event !== "resume" && event !== "reset") {
      const ev: TransitionEvent = {
        id: inst.nextTransitionId++,
        sessionId,
        from: inst.state,
        to: inst.state,
        event,
        at: Date.now(),
        payload,
        refusedDueToPause: true,
      };
      inst.appendLog(ev);
      this.notifyObservers(ev);
      throw new PausedError(inst.state);
    }

    // Pause/resume are orthogonal to the transition table.
    if (event === "pause") {
      if (!inst.paused) inst.paused = true;
      const ev: TransitionEvent = {
        id: inst.nextTransitionId++,
        sessionId,
        from: inst.state,
        to: inst.state,
        event,
        at: Date.now(),
        payload,
      };
      inst.appendLog(ev);
      inst.lastEvent = event;
      inst.lastTransitionAt = ev.at;
      this.notifyObservers(ev);
      return this.snapshot(inst);
    }
    if (event === "resume") {
      if (inst.paused) inst.paused = false;
      const ev: TransitionEvent = {
        id: inst.nextTransitionId++,
        sessionId,
        from: inst.state,
        to: inst.state,
        event,
        at: Date.now(),
        payload,
      };
      inst.appendLog(ev);
      inst.lastEvent = event;
      inst.lastTransitionAt = ev.at;
      this.notifyObservers(ev);
      return this.snapshot(inst);
    }

    // Normal transitions via table.
    const row = TRANSITIONS[inst.state];
    const next = row?.[event];
    if (!next) throw new IllegalTransitionError(inst.state, event);

    const prev = inst.state;
    inst.state = next;
    inst.lastEvent = event;
    const now = Date.now();
    inst.lastTransitionAt = now;
    if (event === "start" && inst.startedAt === null) inst.startedAt = now;
    if (event === "fail") {
      inst.failedReason =
        typeof payload === "object" && payload !== null && "reason" in payload
          ? String((payload as { reason?: unknown }).reason ?? "")
          : typeof payload === "string"
            ? payload
            : undefined;
    }
    if (event === "reset") {
      inst.paused = false;
      inst.startedAt = null;
      inst.failedReason = undefined;
    }

    const tev: TransitionEvent = {
      id: inst.nextTransitionId++,
      sessionId,
      from: prev,
      to: next,
      event,
      at: now,
      payload,
    };
    inst.appendLog(tev);
    this.notifyObservers(tev);
    return this.snapshot(inst);
  }

  /** Full snapshot for UI + MCP. */
  snapshot(sessionIdOrInst: string | FSMInstance): FSMSnapshot {
    const inst =
      typeof sessionIdOrInst === "string"
        ? this.require(sessionIdOrInst)
        : sessionIdOrInst;
    return {
      sessionId: inst.sessionId,
      state: inst.state,
      paused: inst.paused,
      lastEvent: inst.lastEvent,
      transitionCount: inst.nextTransitionId,
      startedAt: inst.startedAt,
      lastTransitionAt: inst.lastTransitionAt,
      failedReason: inst.failedReason,
      terminal: TERMINAL_STATES.has(inst.state),
    };
  }

  /** Return (at most `tail`) latest transitions for a session. */
  getLog(sessionId: string, tail = 100): TransitionEvent[] {
    const inst = this.require(sessionId);
    if (tail <= 0) return [];
    return inst.log.slice(-tail);
  }

  /** Valid events from the current state (useful for UI button gating). */
  allowedEvents(sessionId: string): CADAIEvent[] {
    const inst = this.require(sessionId);
    const row = TRANSITIONS[inst.state] ?? {};
    const base = Object.keys(row) as CADAIEvent[];
    // pause/resume are always available (pause in non-paused, resume in paused).
    const overlay: CADAIEvent[] = inst.paused ? ["resume", "reset"] : ["pause"];
    return Array.from(new Set([...base, ...overlay]));
  }

  /** Add a transition observer. Returns an unsubscribe function. */
  subscribe(fn: FSMObserver): () => void {
    this.observers.push(fn);
    return () => {
      const idx = this.observers.indexOf(fn);
      if (idx >= 0) this.observers.splice(idx, 1);
    };
  }

  /** Flush all observers (mostly for tests). */
  clearObservers(): void {
    this.observers.length = 0;
  }

  // ── helpers ────────────────────────────────────────────────────────────

  private require(sessionId: string): FSMInstance {
    const inst = this.sessions.get(sessionId);
    if (!inst) throw new UnknownSessionError(sessionId);
    return inst;
  }

  private notifyObservers(ev: TransitionEvent): void {
    for (const obs of this.observers) {
      try {
        void obs(ev);
      } catch {
        /* observer faults are swallowed by design */
      }
    }
  }
}

export const cadAIStateMachineEngine = new CADAIStateMachineEngine();
