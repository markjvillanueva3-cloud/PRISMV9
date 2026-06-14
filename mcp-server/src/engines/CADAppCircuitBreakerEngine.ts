/**
 * CADAppCircuitBreakerEngine — CAD-COMPLETE-MS0 / U-AI-09
 * ========================================================
 *
 * A per-CAD-application circuit breaker. When a CAD adapter (Fusion 360,
 * hyperMILL, SolidWorks, …) starts failing, the breaker OPENS so the agent
 * stops hammering a dead app and can reroute (see CADFallbackRoutingEngine).
 * After a cooldown it goes HALF_OPEN and lets a limited number of trial
 * calls through; consecutive successes close it again.
 *
 *   closed  ──failureThreshold consecutive failures──▶  open
 *   open    ──cooldown elapsed──▶  half_open
 *   half_open ──successThreshold consecutive successes──▶  closed
 *   half_open ──any failure──▶  open
 *
 * The clock is injectable so the cooldown timing is deterministically
 * testable.
 *
 * @module engines/CADAppCircuitBreakerEngine
 * @version 1.0.0
 */

export type BreakerState = "closed" | "open" | "half_open";

/** Tunable breaker thresholds. */
export interface BreakerConfig {
  /** Consecutive failures in CLOSED that trip the breaker OPEN. */
  failureThreshold: number;
  /** Consecutive successes in HALF_OPEN that close the breaker. */
  successThreshold: number;
  /** Milliseconds OPEN before a HALF_OPEN trial is permitted. */
  cooldownMs: number;
  /** Max trial calls allowed concurrently while HALF_OPEN. */
  halfOpenMaxProbes: number;
}

export const DEFAULT_BREAKER_CONFIG: BreakerConfig = {
  failureThreshold: 5,
  successThreshold: 2,
  cooldownMs: 30_000,
  halfOpenMaxProbes: 1,
};

/** Live state of one CAD app's breaker. */
export interface AppBreakerSnapshot {
  appId: string;
  state: BreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  /** Trial calls currently in flight while HALF_OPEN. */
  halfOpenProbesInFlight: number;
  openedAt: number | null;
  lastTransitionAt: number;
  lastError: string | null;
  totals: {
    calls: number;
    successes: number;
    failures: number;
    rejections: number;
    trips: number;
  };
  config: BreakerConfig;
}

/** Verdict for whether a call to a CAD app may proceed. */
export interface ProceedDecision {
  appId: string;
  allowed: boolean;
  state: BreakerState;
  reason: string;
  /** ms until the breaker would next permit a trial — only when allowed=false & OPEN. */
  retryAfterMs?: number;
}

interface MutableBreaker {
  appId: string;
  state: BreakerState;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  halfOpenProbesInFlight: number;
  openedAt: number | null;
  lastTransitionAt: number;
  lastError: string | null;
  calls: number;
  successes: number;
  failures: number;
  rejections: number;
  trips: number;
  config: BreakerConfig;
}

export class CADAppCircuitBreakerEngine {
  private readonly breakers = new Map<string, MutableBreaker>();

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Override the breaker config for one CAD app (created if absent). */
  configure(appId: string, config: Partial<BreakerConfig>): AppBreakerSnapshot {
    const b = this.ensure(appId);
    const merged: BreakerConfig = { ...b.config };
    // Partial semantics: an explicit `undefined` leaves the existing value.
    if (config.failureThreshold !== undefined) merged.failureThreshold = config.failureThreshold;
    if (config.successThreshold !== undefined) merged.successThreshold = config.successThreshold;
    if (config.cooldownMs !== undefined) merged.cooldownMs = config.cooldownMs;
    if (config.halfOpenMaxProbes !== undefined) merged.halfOpenMaxProbes = config.halfOpenMaxProbes;
    b.config = this.sanitizeConfig(merged);
    return this.snapshotOf(b);
  }

  /**
   * Decide whether a call to `appId` may proceed. OPEN→HALF_OPEN transition
   * happens here lazily once the cooldown has elapsed. A permitted HALF_OPEN
   * trial reserves a probe slot — release it with recordSuccess/recordFailure.
   */
  canProceed(appId: string): ProceedDecision {
    const b = this.ensure(appId);

    if (b.state === "closed") {
      return { appId, allowed: true, state: "closed", reason: "Breaker closed — call permitted." };
    }

    if (b.state === "open") {
      const elapsed = b.openedAt === null ? Infinity : this.now() - b.openedAt;
      if (elapsed >= b.config.cooldownMs) {
        this.transition(b, "half_open");
        b.halfOpenProbesInFlight = 1;
        return {
          appId,
          allowed: true,
          state: "half_open",
          reason: "Cooldown elapsed — permitting a HALF_OPEN trial call.",
        };
      }
      b.rejections += 1;
      return {
        appId,
        allowed: false,
        state: "open",
        reason: "Breaker open — call rejected fast; reroute to a fallback CAD app.",
        retryAfterMs: Math.max(0, b.config.cooldownMs - elapsed),
      };
    }

    // half_open
    // A trial probe in flight for a full cooldown with no recorded outcome is
    // presumed dead — re-open rather than wedge the breaker in half_open forever.
    if (b.halfOpenProbesInFlight > 0 && this.now() - b.lastTransitionAt >= b.config.cooldownMs) {
      this.transition(b, "open");
      b.rejections += 1;
      return {
        appId,
        allowed: false,
        state: "open",
        reason: "Half-open trial probe stalled (no outcome within the cooldown) — breaker re-opened.",
        retryAfterMs: b.config.cooldownMs,
      };
    }
    if (b.halfOpenProbesInFlight >= b.config.halfOpenMaxProbes) {
      b.rejections += 1;
      return {
        appId,
        allowed: false,
        state: "half_open",
        reason: "Breaker half-open and trial slot(s) already in flight — call rejected.",
      };
    }
    b.halfOpenProbesInFlight += 1;
    return { appId, allowed: true, state: "half_open", reason: "HALF_OPEN trial call permitted." };
  }

  /** Record a successful call to `appId`. */
  recordSuccess(appId: string): AppBreakerSnapshot {
    const b = this.ensure(appId);
    b.calls += 1;
    b.successes += 1;
    b.consecutiveFailures = 0;
    b.lastError = null;

    if (b.state === "half_open") {
      b.halfOpenProbesInFlight = Math.max(0, b.halfOpenProbesInFlight - 1);
      b.consecutiveSuccesses += 1;
      if (b.consecutiveSuccesses >= b.config.successThreshold) {
        this.transition(b, "closed");
      }
    } else {
      // A success in CLOSED (or a stray success in OPEN) just resets the streak.
      b.consecutiveSuccesses += 1;
    }
    return this.snapshotOf(b);
  }

  /** Record a failed call to `appId`. */
  recordFailure(appId: string, error?: string): AppBreakerSnapshot {
    const b = this.ensure(appId);
    b.calls += 1;
    b.failures += 1;
    b.consecutiveSuccesses = 0;
    b.lastError = error ?? "unspecified failure";

    if (b.state === "half_open") {
      // A failed trial immediately re-opens the breaker.
      b.halfOpenProbesInFlight = Math.max(0, b.halfOpenProbesInFlight - 1);
      this.transition(b, "open");
      return this.snapshotOf(b);
    }

    b.consecutiveFailures += 1;
    if (b.state === "closed" && b.consecutiveFailures >= b.config.failureThreshold) {
      this.transition(b, "open");
    }
    return this.snapshotOf(b);
  }

  /** Current state of one CAD app's breaker (created closed if absent). */
  getState(appId: string): AppBreakerSnapshot {
    return this.snapshotOf(this.ensure(appId));
  }

  /** Snapshot of every tracked CAD app breaker. */
  snapshot(): AppBreakerSnapshot[] {
    return [...this.breakers.values()].map((b) => this.snapshotOf(b));
  }

  /** Reset one app (or all apps) back to a fresh CLOSED breaker. */
  reset(appId?: string): void {
    if (appId === undefined) {
      this.breakers.clear();
      return;
    }
    this.breakers.delete(appId);
  }

  // --- internal ---

  private ensure(appId: string): MutableBreaker {
    const id = String(appId ?? "").trim();
    if (id.length === 0) throw new Error("CADAppCircuitBreakerEngine: appId must be a non-empty string");
    let b = this.breakers.get(id);
    if (!b) {
      b = {
        appId: id,
        state: "closed",
        consecutiveFailures: 0,
        consecutiveSuccesses: 0,
        halfOpenProbesInFlight: 0,
        openedAt: null,
        lastTransitionAt: this.now(),
        lastError: null,
        calls: 0,
        successes: 0,
        failures: 0,
        rejections: 0,
        trips: 0,
        config: { ...DEFAULT_BREAKER_CONFIG },
      };
      this.breakers.set(id, b);
    }
    return b;
  }

  private transition(b: MutableBreaker, to: BreakerState): void {
    if (b.state === to) return;
    b.state = to;
    b.lastTransitionAt = this.now();
    if (to === "open") {
      b.openedAt = this.now();
      b.consecutiveSuccesses = 0;
      b.halfOpenProbesInFlight = 0;
      b.trips += 1;
    } else if (to === "closed") {
      b.openedAt = null;
      b.consecutiveFailures = 0;
      b.consecutiveSuccesses = 0;
      b.halfOpenProbesInFlight = 0;
    } else if (to === "half_open") {
      // Enter the trial with a clean slate — a stray success/failure recorded
      // while OPEN must not leak into the half-open success/failure streak.
      b.consecutiveFailures = 0;
      b.consecutiveSuccesses = 0;
      b.halfOpenProbesInFlight = 0;
    }
    // half_open keeps openedAt so retryAfter math stays meaningful if it re-opens.
  }

  private sanitizeConfig(c: BreakerConfig): BreakerConfig {
    return {
      failureThreshold: Math.max(1, Math.floor(c.failureThreshold)),
      successThreshold: Math.max(1, Math.floor(c.successThreshold)),
      cooldownMs: Math.max(0, c.cooldownMs),
      halfOpenMaxProbes: Math.max(1, Math.floor(c.halfOpenMaxProbes)),
    };
  }

  private snapshotOf(b: MutableBreaker): AppBreakerSnapshot {
    return {
      appId: b.appId,
      state: b.state,
      consecutiveFailures: b.consecutiveFailures,
      consecutiveSuccesses: b.consecutiveSuccesses,
      halfOpenProbesInFlight: b.halfOpenProbesInFlight,
      openedAt: b.openedAt,
      lastTransitionAt: b.lastTransitionAt,
      lastError: b.lastError,
      totals: {
        calls: b.calls,
        successes: b.successes,
        failures: b.failures,
        rejections: b.rejections,
        trips: b.trips,
      },
      config: { ...b.config },
    };
  }
}

export const cadAppCircuitBreakerEngine = new CADAppCircuitBreakerEngine();

/** Factory for a breaker with an injected clock — used by deterministic tests. */
export function createCADAppCircuitBreaker(now: () => number): CADAppCircuitBreakerEngine {
  return new CADAppCircuitBreakerEngine(now);
}
