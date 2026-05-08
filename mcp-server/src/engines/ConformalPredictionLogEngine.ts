/**
 * ConformalPredictionLogEngine — XPROC-NEURAL Tier 5 (T5-02e)
 *
 * The bridge primitive that closes the predictor ↔ calibration-monitor loop.
 * The four conformal classifiers (LAC, APS, RAPS, regression) compute a
 * prediction set at prediction time. The monitor (CONFORMAL02 — 6fa74fb27)
 * needs (predictedSet, actualLabel) pairs to compute rolling empirical
 * coverage — but those two arrive at different times and from different
 * subsystems. This engine is the time-bridging stash: log a prediction
 * at time T, pair with the matching outcome at time T + Δ.
 *
 * Sibling stack:
 *   - CrossProcessConformalClassificationEngine    (LAC — fd519f1ab)
 *   - CrossProcessAPSClassificationEngine          (APS — 1e81c888d)
 *   - CrossProcessRAPSClassificationEngine         (RAPS — d4dd74e96)
 *   - ConformalCalibrationMonitorEngine            (drift detector — 6fa74fb27)
 *
 * Design — pure key-value stash with TTL eviction + optional bus auto-sync:
 *   - logPrediction({id, predictedSet})           append entry
 *   - pairAndRecord({id, actualLabel, evict?})    look up + push to monitor
 *   - prune({olderThanMs?})                       TTL eviction sweep
 *   - pendingCount() / pendingIds() / status()    introspection
 *   - enableAutoSync(opts) / disableAutoSync()    subscribe to FeedbackBus
 *     'outcome.recorded' and auto-pair by record.id; maps OutcomeRecord
 *     outcome.kind → integer class label using the conventional mapping
 *     used everywhere else in the cross-process stack:
 *       success=0, failure=1, operator_override=2, pending → skip.
 *
 * Why TTL eviction:
 *   In normal operation every prediction eventually has an outcome. But
 *   shop-floor reality includes aborted jobs, machine alarms, and parts
 *   that get scrapped before they're measured — predictions whose
 *   outcomes never arrive. Without eviction the stash grows unbounded.
 *   Default TTL is 24h (typical lights-out + first-shift cycle).
 *
 * Why a separate engine instead of folding into the monitor:
 *   The four conformal predictors are independent producers; the monitor
 *   is one consumer. Putting the log in a third engine keeps each surface
 *   small and lets multiple monitors (one per α level, or one per
 *   process family) attach without contention. Also: the monitor's
 *   contract is "I'm given (predictedSet, actualLabel)" — keeping the
 *   id-pairing logic out of it preserves that simplicity.
 *
 * Failure modes covered:
 *   1. logPrediction with empty predictedSet           → invalid_input
 *   2. logPrediction with non-string id or empty id    → invalid_input
 *   3. Negative or non-integer label                   → invalid_input
 *   4. pairAndRecord on unknown id                     → invalid_state +
 *      monitor untouched (no record() call); caller chooses the response
 *   5. Re-log of same id without explicit replace      → invalid_input
 *   6. Capacity overflow (MAX_PENDING)                 → invalid_input on
 *      logPrediction; caller must prune or raise capacity
 *   7. enableAutoSync called twice without disable     → invalid_state
 *   8. Bus event with malformed payload (missing record / outcome / id)
 *      → silently skipped (defensive — bus subscribers must not crash)
 *   9. outcome.kind === "pending" or unknown            → silently skipped
 *      (pending has no label; unknown is treated as pending)
 *
 * @module ConformalPredictionLogEngine
 */

import { z } from "zod";
import {
  feedbackBusEngine,
  type FeedbackEvent,
  type SubscriptionHandle,
} from "./FeedbackBusEngine.js";
import { ConformalCalibrationMonitorEngine } from "./ConformalCalibrationMonitorEngine.js";

// ============================================================================
// Constants
// ============================================================================

/** Default TTL — 24h in ms. Covers a typical lights-out + first-shift cycle
 *  during which a print-to-program prediction's outcome should land. */
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

/** Floor on TTL — 1 minute. Sub-second TTLs would race with the bus
 *  microtask delivery and evict before the outcome event lands. */
const MIN_TTL_MS = 60 * 1000;

/** Hard cap on outstanding pending entries. 100k matches the calibration
 *  pair cap on the predictor engines — they can't outpace this stash. */
const MAX_PENDING = 100_000;

/** Conventional outcome.kind → integer class label mapping. Matches
 *  CrossProcessNeuralLearningEngine's CLASS_SUCCESS/_FAILURE/_OVERRIDE. */
const KIND_TO_LABEL: Record<string, number | null> = {
  success: 0,
  failure: 1,
  operator_override: 2,
  pending: null, // no label yet — skip
};

// ============================================================================
// Schemas
// ============================================================================

const LogPredictionInputSchema = z.object({
  id: z.string().min(1).describe("Stable identifier (typically the OutcomeRecord id)"),
  predictedSet: z.array(z.number().int().nonnegative()).min(1),
  /** If true, replacing an existing id silently overwrites; default false
   *  — re-log of the same id is treated as a contract violation. */
  replace: z.boolean().default(false),
});

const PairAndRecordInputSchema = z.object({
  id: z.string().min(1),
  actualLabel: z.number().int().nonnegative(),
  /** Default true — pop the entry after pairing. Set false to keep it
   *  (useful for debugging or for monitors that re-pair under different α). */
  evict: z.boolean().default(true),
});

const PruneInputSchema = z.object({
  /** Entries older than this (ms) are evicted. Defaults to the configured TTL. */
  olderThanMs: z.number().int().min(MIN_TTL_MS).optional(),
});

const ConfigureInputSchema = z.object({
  ttlMs: z.number().int().min(MIN_TTL_MS).optional(),
});

const AutoSyncInputSchema = z.object({
  /** Whether to evict the prediction entry after recording the pair. */
  evictAfterRecord: z.boolean().default(true),
});

// ============================================================================
// Public types
// ============================================================================

export interface PendingEntry {
  id: string;
  predictedSet: number[];
  /** ms since epoch. */
  loggedAt: number;
}

export interface LogStatus {
  pending: number;
  ttlMs: number;
  totalLogged: number;
  totalPaired: number;
  totalEvicted: number;
  totalDuplicates: number;
  totalAutoSyncSkipped: number;
  autoSyncActive: boolean;
}

export interface LogOk {
  ok: true;
  pending: number;
  totalLogged: number;
}

export interface PairOk {
  ok: true;
  predictedSet: number[];
  covered: boolean;
  monitorStatus: ReturnType<typeof ConformalCalibrationMonitorEngine.status>;
  pending: number;
}

export interface PruneOk {
  ok: true;
  evictedCount: number;
  pending: number;
}

export interface ConfigureOk {
  ok: true;
  ttlMs: number;
}

export interface AutoSyncOk {
  ok: true;
  handle: { id: number; topic: string };
  active: boolean;
}

export interface DisableOk {
  ok: true;
  removed: boolean;
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type LogResult = LogOk | OpErr;
export type PairResult = PairOk | OpErr;
export type PruneResult = PruneOk | OpErr;
export type ConfigureResult = ConfigureOk | OpErr;
export type AutoSyncResult = AutoSyncOk | OpErr;
export type DisableResult = DisableOk | OpErr;

// ============================================================================
// Engine state
// ============================================================================

interface EngineState {
  pending: Map<string, PendingEntry>;
  ttlMs: number;
  totalLogged: number;
  totalPaired: number;
  totalEvicted: number;
  totalDuplicates: number;
  totalAutoSyncSkipped: number;
  autoSyncHandle: SubscriptionHandle | null;
  autoSyncEvictAfter: boolean;
  /** Injectable clock — overridden in tests for deterministic TTL testing. */
  clock: () => number;
}

function freshState(): EngineState {
  return {
    pending: new Map(),
    ttlMs: DEFAULT_TTL_MS,
    totalLogged: 0,
    totalPaired: 0,
    totalEvicted: 0,
    totalDuplicates: 0,
    totalAutoSyncSkipped: 0,
    autoSyncHandle: null,
    autoSyncEvictAfter: true,
    clock: () => Date.now(),
  };
}

let state: EngineState = freshState();

function snapshotStatus(): LogStatus {
  return {
    pending: state.pending.size,
    ttlMs: state.ttlMs,
    totalLogged: state.totalLogged,
    totalPaired: state.totalPaired,
    totalEvicted: state.totalEvicted,
    totalDuplicates: state.totalDuplicates,
    totalAutoSyncSkipped: state.totalAutoSyncSkipped,
    autoSyncActive: state.autoSyncHandle !== null,
  };
}

// ============================================================================
// Engine API
// ============================================================================

export class ConformalPredictionLogEngine {
  /**
   * Log a prediction so it can later be paired with the matching outcome.
   * Returns OpErr if the id is already pending and replace=false.
   */
  static logPrediction(input: unknown): LogResult {
    const parsed = LogPredictionInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `logPrediction: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const { id, predictedSet, replace } = parsed.data;
    if (state.pending.size >= MAX_PENDING && !state.pending.has(id)) {
      return {
        ok: false,
        error: "invalid_input",
        message: `logPrediction: pending ${state.pending.size} at MAX_PENDING=${MAX_PENDING}; call prune() or raise capacity`,
      };
    }
    if (state.pending.has(id) && !replace) {
      state.totalDuplicates += 1;
      return {
        ok: false,
        error: "invalid_input",
        message: `logPrediction: id '${id}' already pending; pass replace=true to overwrite`,
      };
    }
    state.pending.set(id, {
      id,
      predictedSet: [...predictedSet], // defensive copy — caller may mutate
      loggedAt: state.clock(),
    });
    state.totalLogged += 1;
    return { ok: true, pending: state.pending.size, totalLogged: state.totalLogged };
  }

  /**
   * Pair a logged prediction with its observed actualLabel and forward the
   * pair to the CalibrationMonitor. Default behaviour evicts the entry
   * after recording.
   */
  static pairAndRecord(input: unknown): PairResult {
    const parsed = PairAndRecordInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `pairAndRecord: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const { id, actualLabel, evict } = parsed.data;
    const entry = state.pending.get(id);
    if (!entry) {
      return {
        ok: false,
        error: "invalid_state",
        message: `pairAndRecord: no pending prediction for id '${id}'`,
      };
    }
    const monitorRes = ConformalCalibrationMonitorEngine.record({
      predictedSet: entry.predictedSet,
      actualLabel,
    });
    if (!monitorRes.ok) {
      // Pass through monitor's validation error verbatim — the typical
      // case is actualLabel < 0 or windowSize misconfig. Don't evict on
      // failure so the caller can fix and retry.
      return {
        ok: false,
        error: "invalid_input",
        message: `pairAndRecord: monitor rejected — ${monitorRes.message}`,
      };
    }
    if (evict) {
      state.pending.delete(id);
    }
    state.totalPaired += 1;
    return {
      ok: true,
      predictedSet: entry.predictedSet,
      covered: monitorRes.covered,
      monitorStatus: monitorRes.status,
      pending: state.pending.size,
    };
  }

  /**
   * TTL eviction sweep. Removes any pending entry older than the supplied
   * threshold (defaults to the configured TTL).
   */
  static prune(input: unknown = {}): PruneResult {
    const parsed = PruneInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `prune: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const threshold = parsed.data.olderThanMs ?? state.ttlMs;
    const cutoff = state.clock() - threshold;
    let evicted = 0;
    for (const [id, entry] of state.pending) {
      if (entry.loggedAt < cutoff) {
        state.pending.delete(id);
        evicted += 1;
      }
    }
    state.totalEvicted += evicted;
    return { ok: true, evictedCount: evicted, pending: state.pending.size };
  }

  /** Re-configure the TTL. Does not retroactively evict — call prune() after. */
  static configure(input: unknown): ConfigureResult {
    const parsed = ConfigureInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `configure: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    if (parsed.data.ttlMs !== undefined) state.ttlMs = parsed.data.ttlMs;
    return { ok: true, ttlMs: state.ttlMs };
  }

  /**
   * Subscribe to FeedbackBus 'outcome.recorded' events and auto-pair them
   * with logged predictions by id. Maps the OutcomeRecord's outcome.kind
   * to an integer class label using the conventional mapping. Pending /
   * unknown kinds are silently skipped (counted in totalAutoSyncSkipped).
   */
  static enableAutoSync(input: unknown = {}): AutoSyncResult {
    const parsed = AutoSyncInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `enableAutoSync: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    if (state.autoSyncHandle !== null) {
      return {
        ok: false,
        error: "invalid_state",
        message: "enableAutoSync: already active. Call disableAutoSync() first.",
      };
    }
    state.autoSyncEvictAfter = parsed.data.evictAfterRecord;
    const handle = feedbackBusEngine.subscribe(
      "outcome.recorded",
      (event: FeedbackEvent) => {
        const payload = event.payload as
          | { id?: unknown; outcomeKind?: unknown; record?: { id?: unknown; outcome?: { kind?: unknown } } }
          | undefined;
        if (!payload) {
          state.totalAutoSyncSkipped += 1;
          return;
        }
        // The OutcomeStore publishes top-level `id` and `outcomeKind`
        // alongside the full `record`. We accept either path.
        const id = typeof payload.id === "string"
          ? payload.id
          : (typeof payload.record?.id === "string" ? payload.record.id : null);
        const kind = typeof payload.outcomeKind === "string"
          ? payload.outcomeKind
          : (typeof payload.record?.outcome?.kind === "string" ? payload.record.outcome.kind : null);
        if (id === null || kind === null) {
          state.totalAutoSyncSkipped += 1;
          return;
        }
        const label = KIND_TO_LABEL[kind];
        if (label === null || label === undefined) {
          // pending or unknown — no usable label.
          state.totalAutoSyncSkipped += 1;
          return;
        }
        if (!state.pending.has(id)) {
          // Outcome arrived for something we never logged a prediction
          // for — common at startup or when predictions were sourced
          // from a different process. Skip silently.
          state.totalAutoSyncSkipped += 1;
          return;
        }
        // Defensive: catch monitor rejections so a bad config can't
        // cascade into a bus crash. The skip counter still increments.
        try {
          const result = ConformalPredictionLogEngine.pairAndRecord({
            id,
            actualLabel: label,
            evict: state.autoSyncEvictAfter,
          });
          if (!result.ok) state.totalAutoSyncSkipped += 1;
        } catch {
          state.totalAutoSyncSkipped += 1;
        }
      },
    );
    state.autoSyncHandle = handle;
    return { ok: true, handle: { id: handle.id, topic: handle.topic }, active: true };
  }

  /** Unsubscribe the auto-sync handler. Idempotent. */
  static disableAutoSync(): DisableResult {
    if (state.autoSyncHandle === null) {
      return { ok: true, removed: false };
    }
    feedbackBusEngine.unsubscribe(state.autoSyncHandle);
    state.autoSyncHandle = null;
    return { ok: true, removed: true };
  }

  /** Read the current rolling status. */
  static status(): LogStatus {
    return snapshotStatus();
  }

  /** List the ids of all pending entries (sorted ascending for determinism). */
  static pendingIds(): string[] {
    return [...state.pending.keys()].sort();
  }

  /** Wipe all state. Unsubscribes auto-sync if active. */
  static reset(): void {
    if (state.autoSyncHandle !== null) {
      feedbackBusEngine.unsubscribe(state.autoSyncHandle);
    }
    state = freshState();
  }

  /** Test-only clock injector. Set to undefined to restore Date.now. */
  static __setClockForTests(clock: (() => number) | undefined): void {
    state.clock = clock ?? (() => Date.now());
  }

  static constants(): {
    DEFAULT_TTL_MS: number;
    MIN_TTL_MS: number;
    MAX_PENDING: number;
    KIND_TO_LABEL: Record<string, number | null>;
  } {
    return { DEFAULT_TTL_MS, MIN_TTL_MS, MAX_PENDING, KIND_TO_LABEL };
  }
}

export const conformalPredictionLogEngine = ConformalPredictionLogEngine;

/** Dispatcher convenience wrapper. */
export function conformalPredictionLog(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_predlog_log":
      return ConformalPredictionLogEngine.logPrediction(params);
    case "xproc_predlog_pair":
      return ConformalPredictionLogEngine.pairAndRecord(params);
    case "xproc_predlog_prune":
      return ConformalPredictionLogEngine.prune(params);
    case "xproc_predlog_configure":
      return ConformalPredictionLogEngine.configure(params);
    case "xproc_predlog_status":
      return ConformalPredictionLogEngine.status();
    case "xproc_predlog_pending_ids":
      return { ok: true, ids: ConformalPredictionLogEngine.pendingIds() };
    case "xproc_predlog_enable_autosync":
      return ConformalPredictionLogEngine.enableAutoSync(params);
    case "xproc_predlog_disable_autosync":
      return ConformalPredictionLogEngine.disableAutoSync();
    case "xproc_predlog_reset":
      ConformalPredictionLogEngine.reset();
      return { ok: true };
    case "xproc_predlog_constants":
      return ConformalPredictionLogEngine.constants();
    default:
      throw new Error(`conformalPredictionLog: unknown action '${action}'`);
  }
}
