/**
 * KillSwitchEngine — U-HAGI11 unified operator kill switch (Voxyz Layer 12)
 *
 * Pure-core 3-level kill switch state machine.  Replaces scattered per-hook
 * disable knobs with a single primitive an operator can pull when something's
 * wrong.  Levels (forward-only — promotion never demotes a tier):
 *   - NORMAL  — system runs as usual
 *   - SOFT    — block new requests, drain in-flight (in-flight allowed to finish)
 *   - HARD    — terminate in-flight too
 *   - NUCLEAR — HARD + revoke all credentials (caller is responsible for cred ops;
 *               engine just records the level + reason + actor + timestamp)
 *
 * Pure: no I/O, no fs.  Caller supplies a state-store callback for persistence.
 * Deterministic per (state, action) pair.  Companion to U-HAGI02 control plane.
 *
 * @module engines/KillSwitchEngine
 */

import { z } from "zod";

export const KILL_LEVELS = ["normal", "soft", "hard", "nuclear"] as const;
export type KillLevel = typeof KILL_LEVELS[number];

const LEVEL_RANK: Record<KillLevel, number> = {
  normal: 0, soft: 1, hard: 2, nuclear: 3,
};

export const KillStateSchema = z.object({
  level: z.enum(KILL_LEVELS),
  reason: z.string().min(1).max(500),
  actor: z.string().min(1).max(100),
  at: z.string().min(1),
  history: z.array(z.object({
    from: z.enum(KILL_LEVELS),
    to: z.enum(KILL_LEVELS),
    reason: z.string().max(500),
    actor: z.string().max(100),
    at: z.string(),
  })).default([]),
});
export type KillState = z.infer<typeof KillStateSchema>;

export interface RequestDecision {
  allow: boolean;
  level: KillLevel;
  reason?: string;
}

export class KillSwitchEngine {
  /** Initial state — system in normal operating mode. */
  static initial(at: string = new Date().toISOString()): KillState {
    return {
      level: "normal",
      reason: "system-initialized",
      actor: "engine",
      at,
      history: [],
    };
  }

  /**
   * Promote to a stricter kill level.  Forward-only — throws if attempting to
   * demote (lower-rank level) or stay at the same level.  All transitions
   * recorded in history with actor + reason + timestamp.
   */
  static promote(
    state: KillState,
    to: KillLevel,
    reason: string,
    actor: string,
    at: string = new Date().toISOString(),
  ): KillState {
    KillStateSchema.parse(state);
    if (!reason || reason.length === 0) throw new Error("KillSwitch.promote requires a reason");
    if (!actor || actor.length === 0) throw new Error("KillSwitch.promote requires an actor");
    const fromRank = LEVEL_RANK[state.level];
    const toRank = LEVEL_RANK[to];
    if (toRank <= fromRank) {
      throw new Error(
        `KillSwitch.promote: cannot promote from ${state.level}(${fromRank}) to ${to}(${toRank}) — forward-only`,
      );
    }
    return {
      level: to,
      reason,
      actor,
      at,
      history: [...state.history, {
        from: state.level,
        to,
        reason,
        actor,
        at,
      }],
    };
  }

  /**
   * Operator-only reset back to normal.  Distinct from promote() — requires
   * explicit `force:true` flag + an actor + a reason naming WHY the operator
   * believes the situation is resolved.  Always recorded in history.
   */
  static reset(
    state: KillState,
    actor: string,
    reason: string,
    force: boolean,
    at: string = new Date().toISOString(),
  ): KillState {
    KillStateSchema.parse(state);
    if (!force) throw new Error("KillSwitch.reset requires force:true (operator confirmation)");
    if (!actor) throw new Error("KillSwitch.reset requires an actor");
    if (!reason) throw new Error("KillSwitch.reset requires a reason");
    return {
      level: "normal",
      reason: `RESET: ${reason}`,
      actor,
      at,
      history: [...state.history, {
        from: state.level,
        to: "normal",
        reason: `RESET: ${reason}`,
        actor,
        at,
      }],
    };
  }

  /**
   * Decide whether a given operation is allowed under the current kill state.
   *
   * Operation classes:
   *   - "new_request"     — caller is starting fresh work (blocked at SOFT+)
   *   - "in_flight"       — caller is continuing work already started
   *                         (blocked at HARD+, allowed at SOFT to let it finish)
   *   - "credential_use"  — caller is using an external credential
   *                         (blocked at NUCLEAR — and at HARD if blockCredsAtHard)
   */
  static decide(
    state: KillState,
    operation: "new_request" | "in_flight" | "credential_use",
    opts: { blockCredsAtHard?: boolean } = {},
  ): RequestDecision {
    const lvl = state.level;
    const blockCredsAtHard = opts.blockCredsAtHard ?? true;
    switch (operation) {
      case "new_request":
        return lvl === "normal"
          ? { allow: true, level: lvl }
          : { allow: false, level: lvl, reason: `kill-switch ${lvl}: new requests blocked` };
      case "in_flight":
        return lvl === "normal" || lvl === "soft"
          ? { allow: true, level: lvl }
          : { allow: false, level: lvl, reason: `kill-switch ${lvl}: in-flight terminated` };
      case "credential_use":
        if (lvl === "nuclear") return { allow: false, level: lvl, reason: "kill-switch nuclear: credentials revoked" };
        if (lvl === "hard" && blockCredsAtHard) return { allow: false, level: lvl, reason: "kill-switch hard: credentials blocked" };
        return { allow: true, level: lvl };
    }
  }

  static rank(level: KillLevel): number { return LEVEL_RANK[level]; }
}

export const killSwitchEngine = KillSwitchEngine;
