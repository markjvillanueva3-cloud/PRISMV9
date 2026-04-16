/**
 * WEDMAutonomyEngine — SAE J3016-adapted autonomy level management for WEDM.
 *
 * Phase 4 / P4-MS1 / U-P4-01 of the WEDM AGI Intelligence Roadmap.
 *
 * Adapts the SAE J3016 taxonomy (originally for on-road automated driving
 * systems) to wire-EDM machining. The six-level ladder (L0 Manual → L5
 * Self-improving) defines — for each level — what the AI is allowed to do
 * without human confirmation and what the human must still own. The engine
 * is the single gatekeeper that downstream components consult before
 * acting; no other module should hard-code level rules.
 *
 * Key properties:
 *   - **Level-aware permission checks** — `can(action)` returns true iff the
 *     current level authorises `action` (param suggest vs. auto-adjust vs.
 *     unattended run vs. autonomous optimisation).
 *   - **One-step transitions** — operators can only step up or down by ±1
 *     level per request (gate-review pattern). Direct jumps (e.g. L0→L4)
 *     are rejected; this is a deliberate guardrail against accidental
 *     lights-out promotion.
 *   - **Downgrade on fault** — a failed safety check or wire-break escalation
 *     can force `level = min(level, floor)` without a counter-sign.
 *   - **Full audit trail** — every transition is appended to the in-memory
 *     history (optionally mirrored to `WEDM_AUTONOMY_STATE.json`).
 *
 * Level rights (superset inclusion — higher includes lower):
 *   L0 Manual         : no AI action at all
 *   L1 Assisted       : AI may *suggest* parameters; operator applies
 *   L2 Semi-auto      : AI may auto-adjust within explicit bounds
 *   L3 Supervised     : AI may run a job; human must be present
 *   L4 Full auto      : AI may run unattended (lights-out)
 *   L5 Self-improving : AI may autonomously update its own policy
 *
 * Composes with:
 *   - `WEDMSafetyEnvelopeEngine` (U-P4-05) — downgrade trigger on violation
 *   - `WEDMHumanHandoffEngine` (U-P4-03) — consumer of escalation decisions
 *   - `WEDMFailsafeEngine` (U-P4-06) — consumer of degrade() signals
 *
 * @module engines/WEDMAutonomyEngine
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Six-level autonomy ladder. Monotonic — higher number ⇒ more AI agency,
 * less human involvement. Rights are superset-inclusive (L3 includes L2's).
 */
export type AutonomyLevel = 0 | 1 | 2 | 3 | 4 | 5;

export const AUTONOMY_LEVEL_NAMES: Record<AutonomyLevel, string> = {
  0: "Manual",
  1: "Assisted",
  2: "Semi-auto",
  3: "Supervised",
  4: "Full auto",
  5: "Self-improving",
};

export const AUTONOMY_LEVEL_HUMAN_ROLE: Record<AutonomyLevel, string> = {
  0: "Full control — operator runs every move",
  1: "Applies AI suggestions manually",
  2: "Sets bounds; monitors auto-adjustments",
  3: "Monitors; ready to intervene",
  4: "Periodic check-in; lights-out capable",
  5: "Audits policy updates post-hoc",
};

/**
 * The set of discrete capabilities the engine gates. A capability is
 * authorised if the current level is ≥ its required level. This mapping is
 * the single source of truth for autonomy policy.
 */
export type AutonomyCapability =
  | "suggest_parameters"
  | "auto_adjust_parameters"
  | "execute_job_supervised"
  | "execute_job_unattended"
  | "self_modify_policy";

export const CAPABILITY_MIN_LEVEL: Record<AutonomyCapability, AutonomyLevel> = {
  suggest_parameters: 1,
  auto_adjust_parameters: 2,
  execute_job_supervised: 3,
  execute_job_unattended: 4,
  self_modify_policy: 5,
};

export interface AutonomyTransition {
  from: AutonomyLevel;
  to: AutonomyLevel;
  /** ISO-8601 timestamp. */
  at: string;
  /** Who / what initiated the change. */
  actor: string;
  /** Free-form reason (e.g. "operator promote", "wire_break_limit"). */
  reason: string;
  /** True if the transition was forced (not counter-signed). */
  forced: boolean;
}

export interface AutonomySnapshot {
  level: AutonomyLevel;
  name: string;
  humanRole: string;
  /** Number of transitions since engine instantiation (monotonic). */
  version: number;
  /** Most-recent transition, if any. */
  last?: AutonomyTransition;
  /** Full chronological history. */
  history: AutonomyTransition[];
}

export interface PromoteOptions {
  actor?: string;
  reason?: string;
  /** Counter-sign from a second operator (required for L3→L4 and L4→L5). */
  counterSign?: string;
  /** ISO timestamp override for tests. Defaults to `new Date().toISOString()`. */
  timestamp?: string;
}

export interface DegradeOptions {
  actor?: string;
  reason?: string;
  /** Mandatory — clamp the level to at most this (defensive downgrade). */
  floorToLevel: AutonomyLevel;
  timestamp?: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Level pairs that require a counter-sign (lights-out + self-mod). */
const COUNTERSIGN_TRANSITIONS: ReadonlyArray<[AutonomyLevel, AutonomyLevel]> = [
  [3, 4],
  [4, 5],
];

/** Initial level for a freshly-instantiated engine. */
export const DEFAULT_STARTING_LEVEL: AutonomyLevel = 0;

/** Highest level permitted by the schema (clamps runaway promote calls). */
export const MAX_LEVEL: AutonomyLevel = 5;
/** Lowest level. */
export const MIN_LEVEL: AutonomyLevel = 0;

// ============================================================================
// ENGINE
// ============================================================================

export class WEDMAutonomyEngine {
  private level: AutonomyLevel;
  private history: AutonomyTransition[];

  constructor(startingLevel: AutonomyLevel = DEFAULT_STARTING_LEVEL) {
    this.assertLevel(startingLevel, "startingLevel");
    this.level = startingLevel;
    this.history = [];
  }

  // --------------------------------------------------------------------------
  // Queries
  // --------------------------------------------------------------------------

  /** Current autonomy level. */
  getLevel(): AutonomyLevel {
    return this.level;
  }

  /** Human-readable name for the current level. */
  getName(): string {
    return AUTONOMY_LEVEL_NAMES[this.level];
  }

  /** Expected human role for the current level. */
  getHumanRole(): string {
    return AUTONOMY_LEVEL_HUMAN_ROLE[this.level];
  }

  /**
   * Return `true` iff the current level authorises `capability`.
   * This is the canonical gatekeeper — call this before ANY action that
   * differs by autonomy level.
   */
  can(capability: AutonomyCapability): boolean {
    const min = CAPABILITY_MIN_LEVEL[capability];
    if (min === undefined) {
      throw new Error(`WEDMAutonomyEngine.can: unknown capability ${capability}`);
    }
    return this.level >= min;
  }

  /** Full immutable snapshot (safe to serialise). */
  snapshot(): AutonomySnapshot {
    return {
      level: this.level,
      name: this.getName(),
      humanRole: this.getHumanRole(),
      version: this.history.length,
      last: this.history.length > 0 ? { ...this.history[this.history.length - 1] } : undefined,
      history: this.history.map((h) => ({ ...h })),
    };
  }

  // --------------------------------------------------------------------------
  // Transitions
  // --------------------------------------------------------------------------

  /**
   * Step up one level (L_n → L_{n+1}). Rejects direct jumps and rejects
   * lights-out / self-improve promotions that lack a counter-sign.
   */
  promote(opts: PromoteOptions = {}): AutonomyTransition {
    if (this.level >= MAX_LEVEL) {
      throw new Error(`promote: already at max level L${MAX_LEVEL}`);
    }
    const from = this.level;
    const to = (from + 1) as AutonomyLevel;

    if (this.requiresCounterSign(from, to) && !opts.counterSign) {
      throw new Error(
        `promote: transition L${from}→L${to} requires counterSign (second operator)`,
      );
    }

    return this.record({
      from,
      to,
      at: opts.timestamp ?? new Date().toISOString(),
      actor: opts.actor ?? "operator",
      reason: opts.reason ?? "promote",
      forced: false,
    });
  }

  /**
   * Step down one level (L_n → L_{n-1}). Always allowed without counter-sign;
   * the conservative direction never needs a second signature.
   */
  demote(opts: PromoteOptions = {}): AutonomyTransition {
    if (this.level <= MIN_LEVEL) {
      throw new Error(`demote: already at min level L${MIN_LEVEL}`);
    }
    const from = this.level;
    const to = (from - 1) as AutonomyLevel;
    return this.record({
      from,
      to,
      at: opts.timestamp ?? new Date().toISOString(),
      actor: opts.actor ?? "operator",
      reason: opts.reason ?? "demote",
      forced: false,
    });
  }

  /**
   * Forced defensive downgrade — clamp to `floorToLevel`. A no-op if the
   * current level is already ≤ floor. Never requires a counter-sign; this
   * is the path safety hooks take on a violation.
   */
  degrade(opts: DegradeOptions): AutonomyTransition | null {
    this.assertLevel(opts.floorToLevel, "floorToLevel");
    const from = this.level;
    if (from <= opts.floorToLevel) return null;
    return this.record({
      from,
      to: opts.floorToLevel,
      at: opts.timestamp ?? new Date().toISOString(),
      actor: opts.actor ?? "system",
      reason: opts.reason ?? "forced_downgrade",
      forced: true,
    });
  }

  /**
   * Reset to a specific level, clearing history. Tests and fresh sessions
   * only — never call during a live job.
   */
  reset(level: AutonomyLevel = DEFAULT_STARTING_LEVEL): void {
    this.assertLevel(level, "level");
    this.level = level;
    this.history = [];
  }

  /**
   * Restore engine state from a snapshot (used by the persistence layer).
   * Does not validate transitions — the file is presumed validated on load.
   */
  load(snapshot: { level: AutonomyLevel; history: AutonomyTransition[] }): void {
    this.assertLevel(snapshot.level, "snapshot.level");
    this.level = snapshot.level;
    this.history = snapshot.history.map((h) => ({ ...h }));
  }

  // --------------------------------------------------------------------------
  // Private
  // --------------------------------------------------------------------------

  /** Return true iff (from, to) requires a counter-sign for promotion. */
  private requiresCounterSign(from: AutonomyLevel, to: AutonomyLevel): boolean {
    return COUNTERSIGN_TRANSITIONS.some(([a, b]) => a === from && b === to);
  }

  private record(t: AutonomyTransition): AutonomyTransition {
    this.level = t.to;
    this.history.push(t);
    return { ...t };
  }

  private assertLevel(level: number, name: string): asserts level is AutonomyLevel {
    if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) {
      throw new Error(
        `WEDMAutonomyEngine: ${name} must be integer ${MIN_LEVEL}..${MAX_LEVEL}, got ${level}`,
      );
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const wedmAutonomyEngine = new WEDMAutonomyEngine();
