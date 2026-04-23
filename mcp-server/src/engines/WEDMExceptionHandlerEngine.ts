/**
 * WEDMExceptionHandlerEngine — Automatic recovery from WEDM runtime faults.
 *
 * Phase 4 / P4-MS1 / U-P4-02 of the WEDM AGI Intelligence Roadmap.
 *
 * Classifies a raised fault into one of N known exception families and
 * returns a deterministic recovery directive (retry / back-off / escalate /
 * emergency). The engine is **stateful per-job** so that repeat faults of
 * the same family correctly walk the escalation ladder (e.g. 1st wire
 * break → auto re-thread, 3rd wire break → escalate to operator — same
 * threshold enforced by `WEDMSafetyEnvelopeEngine`).
 *
 * Exception families (wire-EDM specific):
 *   - wire_break              : wire severed mid-cut
 *   - short_circuit           : persistent arcing / welded wire
 *   - open_circuit            : lost spark gap
 *   - tank_low                : dielectric below minimum fill
 *   - resistivity_high        : DI water too pure (e.g. after fresh fill)
 *   - resistivity_low         : DI water saturated — resin change due
 *   - servo_fault             : spark voltage outside 20–80 V band
 *   - axis_overrun            : axis hit ± travel limit
 *   - wire_tension_out        : tension outside 500–2000 g band
 *   - filter_clogged          : particulate filter ΔP > 1 bar
 *
 * Directive semantics:
 *   - `auto_retry`      : retry the same step immediately (transient)
 *   - `auto_back_off`   : apply a recipe step-down and retry (recoverable)
 *   - `human_escalate`  : pause and hand off — no autonomous recovery
 *   - `emergency_stop`  : trigger failsafe engine (envelope violation)
 *
 * The ladder each family walks on repeat failures is deterministic and
 * defined in `DEFAULT_POLICY`. Override with `setPolicy(type, directives)`
 * for test scenarios or site-specific tuning.
 *
 * Composes with:
 *   - `WEDMAutonomyEngine` (U-P4-01) — downgrade trigger on `human_escalate`
 *   - `WEDMHumanHandoffEngine` (U-P4-03) — consumer of escalation directives
 *   - `WEDMFailsafeEngine` (U-P4-06) — target of emergency_stop
 *
 * @module engines/WEDMExceptionHandlerEngine
 */

// ============================================================================
// TYPES
// ============================================================================

export type WEDMExceptionType =
  | "wire_break"
  | "short_circuit"
  | "open_circuit"
  | "tank_low"
  | "resistivity_high"
  | "resistivity_low"
  | "servo_fault"
  | "axis_overrun"
  | "wire_tension_out"
  | "filter_clogged";

export type RecoveryDirective =
  | "auto_retry"
  | "auto_back_off"
  | "human_escalate"
  | "emergency_stop";

export interface WEDMException {
  type: WEDMExceptionType;
  /** Free-form machine message; not interpreted. */
  message?: string;
  /** ISO-8601 timestamp (optional; engine fills in if absent). */
  at?: string;
  /** Arbitrary sensor context (gap V, tension, etc.) for audit. */
  context?: Record<string, number | string>;
}

export interface RecoveryPlan {
  type: WEDMExceptionType;
  directive: RecoveryDirective;
  /** 1-based occurrence index for this type within the current job. */
  occurrence: number;
  /** Human-readable rationale (e.g. "3rd wire break — escalate"). */
  rationale: string;
  /** True if this directive is the terminal step of the ladder. */
  terminal: boolean;
}

export interface HandlerStats {
  /** Counts per exception type seen since last reset. */
  counts: Record<WEDMExceptionType, number>;
  /** Successful auto-recoveries per exception type. */
  successes: Record<WEDMExceptionType, number>;
  /** Total directives issued. */
  total: number;
}

// ============================================================================
// POLICY — default escalation ladder per exception family
// ============================================================================

/**
 * Deterministic ladder: the i-th occurrence of exception `type` within a
 * job gets the i-th directive in the list (clamped to the last). The final
 * directive is terminal — repeats beyond the ladder length stay at that
 * directive (e.g. repeated wire_break stays `human_escalate`).
 */
export const DEFAULT_POLICY: Record<WEDMExceptionType, RecoveryDirective[]> = {
  // Wire severed: retry once (auto re-thread), back off twice, then escalate.
  wire_break: ["auto_retry", "auto_back_off", "auto_back_off", "human_escalate"],
  // Stuck arc: back off immediately (reduce Ip / raise Toff), then escalate.
  short_circuit: ["auto_back_off", "auto_back_off", "human_escalate"],
  // Lost gap: retry (re-feed), then escalate (machine may be out of stock).
  open_circuit: ["auto_retry", "auto_retry", "human_escalate"],
  // Tank too low: pause and escalate immediately — no auto recovery path.
  tank_low: ["human_escalate"],
  // DI too pure: retry after resistivity settles; escalate if persistent.
  resistivity_high: ["auto_retry", "auto_retry", "human_escalate"],
  // DI saturated: back off (slow feed) and escalate for resin change.
  resistivity_low: ["auto_back_off", "human_escalate"],
  // Servo out of band: back off; escalate if recurring.
  servo_fault: ["auto_back_off", "auto_back_off", "human_escalate"],
  // Axis over travel: emergency stop — no retry path, hardware-level fault.
  axis_overrun: ["emergency_stop"],
  // Wire tension drift: retry (tensioner correction), then escalate.
  wire_tension_out: ["auto_retry", "human_escalate"],
  // Filter clogged: back off (reduce MRR) and escalate for element swap.
  filter_clogged: ["auto_back_off", "human_escalate"],
};

const ALL_EXCEPTION_TYPES: WEDMExceptionType[] = Object.keys(
  DEFAULT_POLICY,
) as WEDMExceptionType[];

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMExceptionHandlerEngine {
  private policy: Record<WEDMExceptionType, RecoveryDirective[]>;
  private counts: Record<WEDMExceptionType, number>;
  private successes: Record<WEDMExceptionType, number>;
  private total: number;

  constructor(policy?: Partial<Record<WEDMExceptionType, RecoveryDirective[]>>) {
    this.policy = { ...DEFAULT_POLICY, ...policy } as Record<
      WEDMExceptionType,
      RecoveryDirective[]
    >;
    this.validatePolicy();
    this.counts = this.zeroCounter();
    this.successes = this.zeroCounter();
    this.total = 0;
  }

  /**
   * Classify an exception and return its recovery directive. The
   * occurrence index is 1-based *for that type*, not the handler overall.
   */
  handle(ex: WEDMException): RecoveryPlan {
    if (!ex || !this.isKnownType(ex.type)) {
      throw new Error(
        `WEDMExceptionHandlerEngine.handle: unknown exception type ${String(ex?.type)}`,
      );
    }
    this.counts[ex.type] += 1;
    this.total += 1;
    const occurrence = this.counts[ex.type];
    const ladder = this.policy[ex.type];
    const idx = Math.min(occurrence - 1, ladder.length - 1);
    const directive = ladder[idx];
    const terminal = idx === ladder.length - 1;
    return {
      type: ex.type,
      directive,
      occurrence,
      rationale: this.rationale(ex.type, occurrence, directive, ladder.length),
      terminal,
    };
  }

  /**
   * Report the outcome of a previously-issued auto-recovery so the engine
   * can track auto-recovery success rates. Call only for `auto_retry` or
   * `auto_back_off` directives — escalations have no programmatic outcome.
   */
  recordOutcome(type: WEDMExceptionType, success: boolean): void {
    if (!this.isKnownType(type)) {
      throw new Error(`recordOutcome: unknown type ${String(type)}`);
    }
    if (success) this.successes[type] += 1;
  }

  /**
   * Override the directive ladder for a single exception type. The new
   * ladder must end in a terminal directive (`human_escalate` or
   * `emergency_stop`) — enforced to prevent misconfigured ladders that
   * silently auto-retry forever.
   */
  setPolicy(type: WEDMExceptionType, ladder: RecoveryDirective[]): void {
    if (!this.isKnownType(type)) {
      throw new Error(`setPolicy: unknown type ${String(type)}`);
    }
    if (ladder.length === 0) {
      throw new Error(`setPolicy: ladder for ${type} must be non-empty`);
    }
    const last = ladder[ladder.length - 1];
    if (last !== "human_escalate" && last !== "emergency_stop") {
      throw new Error(
        `setPolicy: ladder for ${type} must end in a terminal directive (human_escalate | emergency_stop)`,
      );
    }
    this.policy[type] = [...ladder];
  }

  /** Clear per-job counters and successes. Does not alter the policy. */
  resetCounters(): void {
    this.counts = this.zeroCounter();
    this.successes = this.zeroCounter();
    this.total = 0;
  }

  /** Diagnostics snapshot — safe to serialize. */
  stats(): HandlerStats {
    return {
      counts: { ...this.counts },
      successes: { ...this.successes },
      total: this.total,
    };
  }

  /** Read-only view of the currently configured policy. */
  getPolicy(): Record<WEDMExceptionType, RecoveryDirective[]> {
    const out = {} as Record<WEDMExceptionType, RecoveryDirective[]>;
    for (const t of ALL_EXCEPTION_TYPES) out[t] = [...this.policy[t]];
    return out;
  }

  /** Number of steps on the ladder before terminal for a given type. */
  ladderLength(type: WEDMExceptionType): number {
    if (!this.isKnownType(type)) {
      throw new Error(`ladderLength: unknown type ${String(type)}`);
    }
    return this.policy[type].length;
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  private isKnownType(t: unknown): t is WEDMExceptionType {
    return typeof t === "string" && Object.prototype.hasOwnProperty.call(this.policy, t);
  }

  private rationale(
    type: WEDMExceptionType,
    occurrence: number,
    directive: RecoveryDirective,
    ladderLen: number,
  ): string {
    const ord = ordinal(occurrence);
    if (occurrence >= ladderLen) {
      return `${ord} ${type} in this job — terminal ${directive} (ladder exhausted)`;
    }
    return `${ord} ${type} in this job — ${directive} per policy`;
  }

  private zeroCounter(): Record<WEDMExceptionType, number> {
    const out = {} as Record<WEDMExceptionType, number>;
    for (const t of ALL_EXCEPTION_TYPES) out[t] = 0;
    return out;
  }

  private validatePolicy(): void {
    for (const t of ALL_EXCEPTION_TYPES) {
      const ladder = this.policy[t];
      if (!Array.isArray(ladder) || ladder.length === 0) {
        throw new Error(`WEDMExceptionHandlerEngine: policy for ${t} is empty`);
      }
      const last = ladder[ladder.length - 1];
      if (last !== "human_escalate" && last !== "emergency_stop") {
        throw new Error(
          `WEDMExceptionHandlerEngine: policy for ${t} must end in terminal directive`,
        );
      }
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmExceptionHandlerEngine = new WEDMExceptionHandlerEngine();

// ============================================================================
// HELPERS
// ============================================================================

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
