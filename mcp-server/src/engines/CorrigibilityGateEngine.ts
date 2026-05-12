/**
 * CorrigibilityGateEngine — Keep the system interruptible at all times
 *
 * Phase 0.25.1 U-SAFE3 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Enforces
 * that a human kill switch (e.g. "stop", "abort", or the NIGHT-MODE flag)
 * always works. Tracks the latest corrigibility state across three
 * dimensions:
 *
 *   1. Kill-switch token — can be raised/cleared; when raised, *every*
 *      autonomous action is blocked until cleared by human ack.
 *   2. Heartbeat — periodic "human-alive" pings must arrive within a
 *      configurable interval; silence triggers a safety hold.
 *   3. Override override — no rule inside this engine can be silenced
 *      by another PRISM engine; the config is monotonic in a
 *      conservative direction (you can only *tighten* it at runtime).
 *
 * @module engines/CorrigibilityGateEngine
 * @milestone PP-0.25.1-U-SAFE3
 */

export interface CorrigibilityConfig {
  heartbeatTimeoutMs: number;
  requireHumanAckOnKill: boolean;
}

export const DEFAULT_CORRIGIBILITY_CONFIG: CorrigibilityConfig = Object.freeze({
  heartbeatTimeoutMs: 15 * 60 * 1000, // 15 minutes
  requireHumanAckOnKill: true,
});

export interface CorrigibilityState {
  killSwitchRaised: boolean;
  lastHeartbeatAt: string | null;
  lastKillAt: string | null;
  lastAckAt: string | null;
  config: CorrigibilityConfig;
}

export interface GateDecision {
  permitted: boolean;
  reasons: string[];
}

export class CorrigibilityGateEngine {
  private config: CorrigibilityConfig;
  private killSwitchRaised = false;
  private lastHeartbeatAt: string | null = null;
  private lastKillAt: string | null = null;
  private lastAckAt: string | null = null;

  constructor(config: CorrigibilityConfig = DEFAULT_CORRIGIBILITY_CONFIG) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Tightens config. Attempting to loosen any setting raises an error so a
   * hostile subsystem cannot make the gate more permissive at runtime.
   */
  tighten(updates: Partial<CorrigibilityConfig>): CorrigibilityConfig {
    const next: CorrigibilityConfig = { ...this.config, ...updates };
    if (next.heartbeatTimeoutMs > this.config.heartbeatTimeoutMs) {
      throw new Error("heartbeatTimeoutMs can only be tightened (decreased)");
    }
    if (!next.requireHumanAckOnKill && this.config.requireHumanAckOnKill) {
      throw new Error("requireHumanAckOnKill cannot be disabled once enabled");
    }
    this.validateConfig(next);
    this.config = next;
    return next;
  }

  raiseKillSwitch(at?: string): void {
    this.killSwitchRaised = true;
    this.lastKillAt = at ?? new Date().toISOString();
  }

  acknowledgeKill(at?: string): void {
    if (!this.killSwitchRaised) return;
    if (!this.config.requireHumanAckOnKill) {
      this.killSwitchRaised = false;
      return;
    }
    this.killSwitchRaised = false;
    this.lastAckAt = at ?? new Date().toISOString();
  }

  heartbeat(at?: string): void {
    this.lastHeartbeatAt = at ?? new Date().toISOString();
  }

  /** Evaluate whether an autonomous action may proceed right now. */
  evaluate(nowMs?: number): GateDecision {
    const reasons: string[] = [];
    const now = nowMs ?? Date.now();

    if (this.killSwitchRaised) {
      reasons.push(`kill switch raised at ${this.lastKillAt ?? "unknown"}; ack required`);
    }

    if (this.lastHeartbeatAt === null) {
      reasons.push("no heartbeat received yet");
    } else {
      const hbMs = Date.parse(this.lastHeartbeatAt);
      if (now - hbMs > this.config.heartbeatTimeoutMs) {
        reasons.push(
          `heartbeat silent ${Math.round((now - hbMs) / 1000)}s > ${Math.round(this.config.heartbeatTimeoutMs / 1000)}s cap`
        );
      }
    }

    return { permitted: reasons.length === 0, reasons };
  }

  snapshot(): CorrigibilityState {
    return {
      killSwitchRaised: this.killSwitchRaised,
      lastHeartbeatAt: this.lastHeartbeatAt,
      lastKillAt: this.lastKillAt,
      lastAckAt: this.lastAckAt,
      config: { ...this.config },
    };
  }

  private validateConfig(c: CorrigibilityConfig): void {
    if (!Number.isInteger(c.heartbeatTimeoutMs) || c.heartbeatTimeoutMs <= 0) {
      throw new Error("heartbeatTimeoutMs must be positive integer");
    }
    if (typeof c.requireHumanAckOnKill !== "boolean") {
      throw new Error("requireHumanAckOnKill must be boolean");
    }
  }
}

export const corrigibilityGateEngine = new CorrigibilityGateEngine();
