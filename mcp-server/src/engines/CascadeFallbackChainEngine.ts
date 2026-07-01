/**
 * CascadeFallbackChainEngine — multi-level fallback (cheap → mid → strong)
 * with per-tentacle circuit-breaker.
 *
 * COST-CASCADE-MS0 / U-CASCADE-FALLBACK-CHAIN.
 *
 * Closes the gap left by U-DISPATCHER-ACTION-TWO-PASS (which is binary: cheap +
 * strong only). Real cascades need 3+ tiers and an outage-aware skip so that a
 * dead mid-tier tentacle doesn't waste retry budget on every call.
 *
 * Design: pure-core + injected-deps + an internal CircuitBreaker per tentacle.
 *
 * Calibration: the cascade order is a list of tentacle ids passed in config.
 * U-CASCADE-CALIBRATE is externally blocked (K2-CLOUD-MS0::K2-K0); this
 * engine accepts a calibration-stub mode (`stubCalibration: true`) that uses
 * a default cascade order ["cheap", "mid", "strong"]. Real calibration will
 * later replace stub mode with per-task-class data-driven orderings.
 *
 * R12 invariants:
 *   1. chain throws -> error envelope (not a real exception leak)
 *   2. all breakers open -> ALL_BREAKERS_OPEN + last failure reason
 *   3. cascade config missing -> CALIBRATION_MISSING exit
 *   4. breaker state corrupted (NaN, undefined) -> reset all + BREAKER_STATE_RESET
 *   5. tentacle not registered -> skip + log (does not abort the chain)
 *   6. flip-flap (sub-ms close->open) -> debounce via minDwellMs
 *   7. half-open success closes the breaker; half-open fail reopens it
 *      (and does NOT consume the breaker's "next-try" budget)
 */

export type BreakerState = "closed" | "open" | "half-open";

export interface CircuitBreakerConfig {
  openAfterFails: number; // consecutive failures before opening
  halfOpenAfterMs: number; // ms after open before transition to half-open
  minDwellMs: number; // debounce — minimum time in a state before another transition
}

export interface BreakerSnapshot {
  tentacleId: string;
  state: BreakerState;
  consecutiveFails: number;
  lastFailAt: string | null;
  lastSuccessAt: string | null;
  openedAt: string | null;
  config: CircuitBreakerConfig;
}

export interface TentacleSpec {
  id: string; // stable id ("cheap", "mid", "strong" or model name)
  costEstimate: "free" | "low" | "medium" | "high";
}

export interface CascadeRunInput {
  taskClass: string;
  prompt: string;
  forceTentacle?: string | null; // bypass cascade — invoke only this one
}

export interface CascadeRunResult {
  ok: boolean;
  attemptedTentacles: string[];
  skippedTentacles: Array<{ tentacleId: string; reason: string }>;
  resolvedBy: string | null;
  output: unknown;
  errorCode?: "ALL_BREAKERS_OPEN" | "CALIBRATION_MISSING" | "CHAIN_THREW" | "BREAKER_STATE_RESET";
  errorMessage?: string;
  lastFailureReason?: string;
  cascadeSnapshot: BreakerSnapshot[];
  source: "CascadeFallbackChainEngine.run";
}

export interface CascadeConfig {
  cascade: string[]; // ordered tentacle ids; first = cheapest
  perTentacle: Record<string, CircuitBreakerConfig>;
  cascadableTaskClasses: string[]; // task classes that route through this engine
}

export type TentacleRunner = (
  spec: TentacleSpec,
  input: CascadeRunInput,
) => Promise<{ ok: boolean; output: unknown; failureReason?: string }>;

export interface CascadeDeps {
  config: CascadeConfig | null; // null -> CALIBRATION_MISSING
  runTentacle: TentacleRunner;
  tentacles: Record<string, TentacleSpec>;
  now: () => Date;
  logWarn?: (msg: string) => void;
}

// ============================================================================
// Defaults + stub calibration
// ============================================================================

const DEFAULT_BREAKER_CONFIG: CircuitBreakerConfig = Object.freeze({
  openAfterFails: 3,
  halfOpenAfterMs: 60_000,
  minDwellMs: 1_000,
}) as CircuitBreakerConfig;

export const STUB_CALIBRATION: CascadeConfig = Object.freeze({
  cascade: ["cheap", "mid", "strong"],
  perTentacle: {
    cheap: DEFAULT_BREAKER_CONFIG,
    mid: DEFAULT_BREAKER_CONFIG,
    strong: DEFAULT_BREAKER_CONFIG,
  },
  cascadableTaskClasses: ["reasoning", "code_review", "search"],
}) as CascadeConfig;

// ============================================================================
// Circuit breaker (pure transitions)
// ============================================================================

interface BreakerInternal {
  state: BreakerState;
  consecutiveFails: number;
  lastFailAt: Date | null;
  lastSuccessAt: Date | null;
  openedAt: Date | null;
  lastTransitionAt: Date | null;
  config: CircuitBreakerConfig;
}

function freshBreaker(config: CircuitBreakerConfig): BreakerInternal {
  return {
    state: "closed",
    consecutiveFails: 0,
    lastFailAt: null,
    lastSuccessAt: null,
    openedAt: null,
    lastTransitionAt: null,
    config: { ...config },
  };
}

function isBreakerCorrupt(b: BreakerInternal): boolean {
  if (!b) return true;
  if (typeof b.consecutiveFails !== "number" || !Number.isFinite(b.consecutiveFails) || b.consecutiveFails < 0) return true;
  if (b.state !== "closed" && b.state !== "open" && b.state !== "half-open") return true;
  return false;
}

/**
 * Decide whether this tentacle should be skipped this tick. Pure: takes a
 * snapshot of internal state + now, returns {skip, reason, newState (if
 * elapsed half-open transition)}.
 */
export function evaluateBreaker(
  b: BreakerInternal,
  now: Date,
): { skip: boolean; reason: string; transitionTo?: BreakerState } {
  if (b.state === "closed") return { skip: false, reason: "closed" };
  if (b.state === "half-open") return { skip: false, reason: "half-open: probing" };
  // open: check whether halfOpenAfterMs has elapsed
  if (b.openedAt == null) return { skip: true, reason: "open (openedAt missing — failsafe skip)" };
  const elapsed = now.getTime() - b.openedAt.getTime();
  if (elapsed >= b.config.halfOpenAfterMs) {
    return { skip: false, reason: "open->half-open: probing", transitionTo: "half-open" };
  }
  return { skip: true, reason: `open: ${Math.max(0, b.config.halfOpenAfterMs - elapsed)}ms until half-open` };
}

export function recordSuccess(b: BreakerInternal, now: Date): void {
  b.lastSuccessAt = now;
  b.consecutiveFails = 0;
  if (b.state === "closed") return;
  // half-open is itself the dwell-gate for the open->closed path; a successful
  // probe must close immediately. closed->open->closed via N failures still
  // honors minDwellMs (recordFailure path).
  if (b.state === "half-open" || canTransition(b, now)) {
    b.state = "closed";
    b.openedAt = null;
    b.lastTransitionAt = now;
  }
}

export function recordFailure(b: BreakerInternal, now: Date): void {
  b.lastFailAt = now;
  b.consecutiveFails += 1;
  if (b.state === "half-open") {
    // Half-open fail → reopen (but always reset openedAt timestamp)
    b.state = "open";
    b.openedAt = now;
    b.lastTransitionAt = now;
    return;
  }
  if (b.state === "closed" && b.consecutiveFails >= b.config.openAfterFails) {
    if (canTransition(b, now)) {
      b.state = "open";
      b.openedAt = now;
      b.lastTransitionAt = now;
    }
  }
}

function canTransition(b: BreakerInternal, now: Date): boolean {
  if (b.lastTransitionAt == null) return true;
  const dwell = now.getTime() - b.lastTransitionAt.getTime();
  return dwell >= b.config.minDwellMs;
}

function snapshotBreaker(tentacleId: string, b: BreakerInternal): BreakerSnapshot {
  return {
    tentacleId,
    state: b.state,
    consecutiveFails: b.consecutiveFails,
    lastFailAt: b.lastFailAt?.toISOString() ?? null,
    lastSuccessAt: b.lastSuccessAt?.toISOString() ?? null,
    openedAt: b.openedAt?.toISOString() ?? null,
    config: { ...b.config },
  };
}

// ============================================================================
// Engine
// ============================================================================

export class CascadeFallbackChainEngine {
  private breakers: Map<string, BreakerInternal> = new Map();
  private corruptResetCount: number = 0;

  /**
   * Run the cascade. Never throws — every error path returns a structured envelope.
   */
  async run(input: CascadeRunInput, deps: CascadeDeps): Promise<CascadeRunResult> {
    const attempted: string[] = [];
    const skipped: Array<{ tentacleId: string; reason: string }> = [];
    const now = deps.now();
    const logWarn = deps.logWarn ?? (() => undefined);

    if (deps.config == null) {
      return {
        ok: false,
        attemptedTentacles: attempted,
        skippedTentacles: skipped,
        resolvedBy: null,
        output: null,
        errorCode: "CALIBRATION_MISSING",
        errorMessage: "cascade calibration absent — pass STUB_CALIBRATION for stub mode",
        cascadeSnapshot: this.snapshotAll(),
        source: "CascadeFallbackChainEngine.run",
      };
    }

    let lastFailureReason: string | undefined;
    const cascadeOrder = input.forceTentacle ? [input.forceTentacle] : deps.config.cascade;

    try {
      for (const tentacleId of cascadeOrder) {
        const spec = deps.tentacles[tentacleId];
        if (!spec) {
          // R12 #5 — skip + log
          skipped.push({ tentacleId, reason: "tentacle not registered" });
          logWarn(`tentacle '${tentacleId}' not registered — skipping`);
          continue;
        }

        let breaker = this.breakers.get(tentacleId);
        const cfg = deps.config.perTentacle[tentacleId] ?? DEFAULT_BREAKER_CONFIG;
        if (!breaker) {
          breaker = freshBreaker(cfg);
          this.breakers.set(tentacleId, breaker);
        } else if (isBreakerCorrupt(breaker)) {
          // R12 #4 — reset and log
          this.corruptResetCount += 1;
          logWarn(`BREAKER_STATE_RESET for '${tentacleId}' (corruptResetCount=${this.corruptResetCount})`);
          breaker = freshBreaker(cfg);
          this.breakers.set(tentacleId, breaker);
        }

        const evald = evaluateBreaker(breaker, now);
        if (evald.transitionTo) {
          if (canTransition(breaker, now)) {
            breaker.state = evald.transitionTo;
            breaker.lastTransitionAt = now;
          }
        }
        if (evald.skip) {
          skipped.push({ tentacleId, reason: evald.reason });
          continue;
        }

        attempted.push(tentacleId);
        let res: { ok: boolean; output: unknown; failureReason?: string };
        try {
          res = await deps.runTentacle(spec, input);
        } catch (e) {
          res = { ok: false, output: null, failureReason: `runTentacle threw: ${(e as Error).message}` };
        }

        if (res.ok) {
          recordSuccess(breaker, now);
          return {
            ok: true,
            attemptedTentacles: attempted,
            skippedTentacles: skipped,
            resolvedBy: tentacleId,
            output: res.output,
            cascadeSnapshot: this.snapshotAll(),
            source: "CascadeFallbackChainEngine.run",
          };
        }

        recordFailure(breaker, now);
        lastFailureReason = res.failureReason ?? `${tentacleId} returned ok:false`;
      }

      // Loop exhausted without success
      return {
        ok: false,
        attemptedTentacles: attempted,
        skippedTentacles: skipped,
        resolvedBy: null,
        output: null,
        errorCode: "ALL_BREAKERS_OPEN",
        errorMessage:
          attempted.length === 0
            ? "every tentacle skipped (all breakers open or unregistered)"
            : "every tentacle attempted and failed",
        lastFailureReason,
        cascadeSnapshot: this.snapshotAll(),
        source: "CascadeFallbackChainEngine.run",
      };
    } catch (e) {
      // R12 #1 — chain itself throws
      return {
        ok: false,
        attemptedTentacles: attempted,
        skippedTentacles: skipped,
        resolvedBy: null,
        output: null,
        errorCode: "CHAIN_THREW",
        errorMessage: (e as Error).message,
        lastFailureReason,
        cascadeSnapshot: this.snapshotAll(),
        source: "CascadeFallbackChainEngine.run",
      };
    }
  }

  /** Read-only snapshot of every breaker (for `cascade_status` action). */
  status(): BreakerSnapshot[] {
    return this.snapshotAll();
  }

  /** Operator/test affordance — wipe all breakers. */
  reset(): void {
    this.breakers.clear();
    this.corruptResetCount = 0;
  }

  /** Convenience predicate for AISystemRouter integration. */
  isCascadable(taskClass: string, config: CascadeConfig | null): boolean {
    if (!config) return false;
    return config.cascadableTaskClasses.includes(taskClass);
  }

  private snapshotAll(): BreakerSnapshot[] {
    const out: BreakerSnapshot[] = [];
    for (const [id, b] of this.breakers.entries()) out.push(snapshotBreaker(id, b));
    return out;
  }
}

// ============================================================================
// Singleton + default exports
// ============================================================================

export const cascadeFallbackChainEngine = new CascadeFallbackChainEngine();
