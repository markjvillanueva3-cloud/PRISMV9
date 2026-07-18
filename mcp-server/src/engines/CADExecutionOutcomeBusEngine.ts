/**
 * CADExecutionOutcomeBusEngine — U-CADC-LP01 / CAD-COMPLETE-MS0
 *
 * CAD-specific outcome bus. Dual-channel emitter:
 *   1. Durable channel — every published outcome is also forwarded to the
 *      universal OutcomeCaptureBus (cad shard, kind=cad_execution_outcome)
 *      so downstream offline learners (LP03/LP04 + neural-ledger pipelines)
 *      can re-read history.
 *   2. In-process channel — synchronous fan-out to registered subscribers
 *      (LP02 collector, LP04 propagator) so real-time learners react
 *      without polling the JSONL shard.
 *
 * Design invariants (per duplication-guard review against existing
 * OutcomeCaptureBus + FeedbackBus):
 *   1. NEVER swallow subscriber errors silently — each handler is isolated
 *      with try/catch, errors recorded in stats.handlerErrors but other
 *      handlers still fire. R12: fail-loud via stats, not via exception.
 *   2. NEVER block the producer — publish() returns immediately even if
 *      the durable bus rejects (busOk=false in the return surface).
 *   3. NEVER mutate published outcomes — subscribers receive a frozen copy.
 *   4. Stats are exact totals — publish increments, no rolling-window
 *      drift; that's LP02's responsibility (windowed metrics).
 *   5. Validation at the boundary — adapterId required, timingMs must be
 *      a non-negative finite number.
 *
 * Composes (per duplication-guard): outcomeCaptureBusEngine (U-LEARN-01).
 * Consumed by: CADPerAdapterFeedbackCollectorEngine (LP02),
 *              MasterBrainBackpropPropagatorEngine (LP04).
 *
 * @module engines/CADExecutionOutcomeBusEngine
 * @milestone CAD-COMPLETE-MS0 U-CADC-LP01
 */

import { randomUUID } from "node:crypto";
import { outcomeCaptureBusEngine } from "./OutcomeCaptureBusEngine.js";

/** Shape of a single CAD execution outcome event. */
export interface CADExecutionOutcome {
  /** CAD adapter identifier — e.g. "freecad", "fusion360", "mastercam". Required. */
  adapterId: string;
  /** Optional script/program id this outcome belongs to. */
  scriptId?: string;
  /** True iff the CAD operation completed without an error. */
  success: boolean;
  /** Brief error message when success=false; otherwise omitted. */
  errorMessage?: string;
  /** Wall-clock execution time in ms, non-negative finite. */
  timingMs: number;
  /** True iff a fixture/tool/stock collision was reported during execution. */
  collision?: boolean;
  /** True iff post-execute regeneration validation passed. */
  regenerationOk?: boolean;
  /** Optional lineage id to chain outcome → recommendation. Auto-issued if omitted. */
  lineageId?: string;
  /** Optional ISO timestamp; auto-stamped if omitted. */
  timestamp?: string;
}

/** Subscriber handler called with a frozen outcome copy. */
export type CADOutcomeSubscriber = (outcome: Readonly<CADExecutionOutcome>) => void;

/** Per-adapter running counters maintained inside the bus. */
export interface PerAdapterCounter {
  success: number;
  failure: number;
  collisions: number;
  regenOk: number;
}

/** Aggregate stats reported by getStats(). */
export interface BusStats {
  totalPublished: number;
  totalSuccess: number;
  totalFailure: number;
  subscriberCount: number;
  handlerErrors: number;
  busWriteFailures: number;
  byAdapter: Record<string, PerAdapterCounter>;
}

/** Result returned from publish(). */
export interface PublishResult {
  published: boolean;
  lineageId: string;
  timestamp: string;
  subscribersNotified: number;
  handlerErrors: number;
  busOk: boolean;
  busWarning?: string;
}

function validateOutcome(o: CADExecutionOutcome): void {
  if (!o || typeof o !== "object") {
    throw new TypeError("CADExecutionOutcome: outcome must be an object");
  }
  if (typeof o.adapterId !== "string" || o.adapterId.length === 0) {
    throw new TypeError("CADExecutionOutcome: adapterId must be a non-empty string");
  }
  if (typeof o.success !== "boolean") {
    throw new TypeError("CADExecutionOutcome: success must be a boolean");
  }
  if (typeof o.timingMs !== "number" || !Number.isFinite(o.timingMs) || o.timingMs < 0) {
    throw new TypeError("CADExecutionOutcome: timingMs must be a non-negative finite number");
  }
}

/**
 * CADExecutionOutcomeBusEngine — singleton (also constructible for tests).
 *
 * Callers should use the exported `cadExecutionOutcomeBusEngine` singleton in
 * production; the class is exposed so tests can spin up an isolated bus.
 */
export class CADExecutionOutcomeBusEngine {
  private subscribers: Set<CADOutcomeSubscriber> = new Set();
  private stats: BusStats = {
    totalPublished: 0,
    totalSuccess: 0,
    totalFailure: 0,
    subscriberCount: 0,
    handlerErrors: 0,
    busWriteFailures: 0,
    byAdapter: {},
  };

  /** Publish an outcome to both durable + in-process channels. */
  publish(outcome: CADExecutionOutcome): PublishResult {
    validateOutcome(outcome);

    const lineageId = outcome.lineageId ?? randomUUID();
    const timestamp = outcome.timestamp ?? new Date().toISOString();

    // Build the canonical frozen copy that subscribers and durable bus see.
    const canonical: Readonly<CADExecutionOutcome> = Object.freeze({
      ...outcome,
      lineageId,
      timestamp,
    });

    // Update stats first — even if downstream fails, the producer gets accurate counts.
    this.stats.totalPublished++;
    if (canonical.success) {
      this.stats.totalSuccess++;
    } else {
      this.stats.totalFailure++;
    }
    const ctr = this.stats.byAdapter[canonical.adapterId] ?? {
      success: 0, failure: 0, collisions: 0, regenOk: 0,
    };
    if (canonical.success) ctr.success++; else ctr.failure++;
    if (canonical.collision === true) ctr.collisions++;
    if (canonical.regenerationOk === true) ctr.regenOk++;
    this.stats.byAdapter[canonical.adapterId] = ctr;

    // Forward to the universal outcome-capture bus (best-effort, never throws back).
    let busOk = true;
    let busWarning: string | undefined;
    try {
      const result = outcomeCaptureBusEngine.record({
        domain: "cad",
        kind: "cad_execution_outcome",
        // OutcomeSource is a controlled vocabulary — "system" is the canonical
        // value for a PRISM-engine-emitted outcome ("engine" is NOT in the enum
        // and is rejected at OutcomeEventSchema.safeParse → silent ok:false).
        source: "system",
        lineage_id: lineageId,
        // OutcomeSeverity enum is {info,low,medium,high,critical} — "warning" is
        // not a member (rejected at safeParse → silent ok:false). A failed CAD
        // op maps to "medium": a real but non-safety-critical pipeline failure.
        severity: canonical.success ? "info" : "medium",
        context: {
          adapter_id: canonical.adapterId,
          script_id: canonical.scriptId,
          collision: canonical.collision ?? false,
          regeneration_ok: canonical.regenerationOk ?? null,
          timing_ms: canonical.timingMs,
        },
        actual: { success: canonical.success, error: canonical.errorMessage },
        timestamp,
      });
      if (!result.ok) {
        busOk = false;
        busWarning = result.warning ?? "outcome capture bus rejected";
        this.stats.busWriteFailures++;
      }
    } catch (err) {
      busOk = false;
      busWarning = err instanceof Error ? err.message : String(err);
      this.stats.busWriteFailures++;
    }

    // Fan out to in-process subscribers. Each handler is isolated.
    let handlerErrors = 0;
    let subscribersNotified = 0;
    for (const fn of this.subscribers) {
      try {
        fn(canonical);
        subscribersNotified++;
      } catch {
        // R12 fail-loud via stats — we don't throw, we count.
        handlerErrors++;
      }
    }
    this.stats.handlerErrors += handlerErrors;

    return {
      published: true,
      lineageId,
      timestamp,
      subscribersNotified,
      handlerErrors,
      busOk,
      busWarning,
    };
  }

  /** Subscribe a handler. Returns an unsubscribe function (idempotent). */
  subscribe(handler: CADOutcomeSubscriber): () => void {
    if (typeof handler !== "function") {
      throw new TypeError("subscribe: handler must be a function");
    }
    this.subscribers.add(handler);
    this.stats.subscriberCount = this.subscribers.size;
    return () => {
      this.subscribers.delete(handler);
      this.stats.subscriberCount = this.subscribers.size;
    };
  }

  /** Number of active subscribers. */
  listSubscribers(): number {
    return this.subscribers.size;
  }

  /** Snapshot of running stats. byAdapter is a fresh object copy. */
  getStats(): BusStats {
    return {
      ...this.stats,
      byAdapter: Object.fromEntries(
        Object.entries(this.stats.byAdapter).map(([k, v]) => [k, { ...v }]),
      ),
    };
  }

  /** Test helper — clears subscribers + zeroes stats. Not for production use. */
  reset(): void {
    this.subscribers.clear();
    this.stats = {
      totalPublished: 0,
      totalSuccess: 0,
      totalFailure: 0,
      subscriberCount: 0,
      handlerErrors: 0,
      busWriteFailures: 0,
      byAdapter: {},
    };
  }
}

/** Singleton instance — use this in production code paths. */
export const cadExecutionOutcomeBusEngine = new CADExecutionOutcomeBusEngine();
