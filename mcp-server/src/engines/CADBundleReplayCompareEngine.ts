/**
 * CADBundleReplayCompareEngine — U-FS-15 (PHASE-47)
 *
 * Re-executes recorded CAD operations on new inputs (regression harness),
 * performs op-by-op cross-bundle diff, supports cross-bundle search by
 * op kind / parameter, and emits retrain entries for failed replays to
 * feed PHASE-27 retraining.
 *
 * The engine does not actually run geometry — a caller-provided `OperationExecutor`
 * does that. The engine orchestrates: state checks, timing, failure
 * classification, result aggregation.
 *
 * @module engines/CADBundleReplayCompareEngine
 */

import {
  CADBundleSchema,
  CADOperationSchema,
  ReplayOpOutcomeSchema,
  ReplayRunSchema,
  OpDiffSchema,
  BundleDiffSchema,
  SearchHitSchema,
  RetrainEntrySchema,
  type CADBundle,
  type CADOperation,
  type ReplayRun,
  type ReplayOpOutcome,
  type BundleDiff,
  type OpDiff,
  type SearchHit,
  type RetrainEntry,
  type FailureClass,
  type OpKind,
} from "../schemas/cadBundleReplaySchema.js";

export interface ReplayClock {
  now(): string;
  monotonicMs(): number;
}

export interface OperationExecutor {
  /**
   * Execute `op` against the given current body state. Returns the new body
   * state SHA or a failure class. Runtime exceptions must be caught and
   * returned as { ok: false, failureClass: "op_threw" }.
   */
  execute(op: CADOperation, currentStateSha: string): ReplayExecutionResult;
}

export type ReplayExecutionResult =
  | { ok: true; outputStateSha256: string; durationMs: number }
  | {
      ok: false;
      failureClass: Exclude<FailureClass, "none">;
      reason: string;
      durationMs: number;
      observedOutputSha256?: string;
    };

export class CADBundleReplayCompareEngine {
  private bundles = new Map<string, CADBundle>();
  private retrainQueue: RetrainEntry[] = [];
  private clock: ReplayClock;

  constructor(opts: { clock?: ReplayClock } = {}) {
    this.clock = opts.clock ?? defaultClock();
  }

  // ── Bundle ingestion ──────────────────────────────────────────────────────

  registerBundle(b: CADBundle): CADBundle {
    const parsed = CADBundleSchema.parse(b);
    this.bundles.set(parsed.bundleId, parsed);
    return parsed;
  }

  getBundle(bundleId: string): CADBundle | undefined {
    return this.bundles.get(bundleId);
  }

  listBundles(): CADBundle[] {
    return [...this.bundles.values()];
  }

  // ── Replay ────────────────────────────────────────────────────────────────

  /**
   * Replay the ops in a bundle. Caller provides the starting state SHA
   * (e.g. empty body) and an executor. Replay halts on first failure but
   * records its outcome; callers can opt-in to continueOnFailure if they
   * want to test every op independently.
   */
  replay(
    bundleId: string,
    initialStateSha: string,
    executor: OperationExecutor,
    opts: { continueOnFailure?: boolean; timeoutMsPerOp?: number } = {},
  ): ReplayRun {
    const bundle = this.bundles.get(bundleId);
    if (!bundle) throw new Error(`Unknown bundle ${bundleId}`);
    const startedAt = this.clock.now();
    const startTime = this.clock.monotonicMs();
    const outcomes: ReplayOpOutcome[] = [];
    let currentState = initialStateSha;
    let firstFailure: string | undefined;

    for (const op of bundle.operations) {
      if (currentState !== op.inputStateSha256) {
        const outcome = ReplayOpOutcomeSchema.parse({
          opId: op.opId,
          sequence: op.sequence,
          success: false,
          failureClass: "input_state_mismatch",
          reason: `Expected input state ${op.inputStateSha256} but had ${currentState}`,
          durationMs: 0,
        });
        outcomes.push(outcome);
        firstFailure ??= op.opId;
        this.enqueueRetrain(bundle.bundleId, op, outcome);
        if (!opts.continueOnFailure) break;
        continue;
      }
      const t0 = this.clock.monotonicMs();
      const result = executor.execute(op, currentState);
      const elapsed = this.clock.monotonicMs() - t0;
      if (
        opts.timeoutMsPerOp !== undefined &&
        elapsed > opts.timeoutMsPerOp
      ) {
        const outcome = ReplayOpOutcomeSchema.parse({
          opId: op.opId,
          sequence: op.sequence,
          success: false,
          failureClass: "timeout",
          reason: `Op exceeded timeout ${opts.timeoutMsPerOp}ms (took ${elapsed}ms)`,
          durationMs: elapsed,
        });
        outcomes.push(outcome);
        firstFailure ??= op.opId;
        this.enqueueRetrain(bundle.bundleId, op, outcome);
        if (!opts.continueOnFailure) break;
        continue;
      }
      if (result.ok) {
        if (result.outputStateSha256 !== op.outputStateSha256) {
          const outcome = ReplayOpOutcomeSchema.parse({
            opId: op.opId,
            sequence: op.sequence,
            success: false,
            failureClass: "output_state_mismatch",
            reason: `Expected output state ${op.outputStateSha256} but got ${result.outputStateSha256}`,
            observedOutputSha256: result.outputStateSha256,
            durationMs: result.durationMs,
          });
          outcomes.push(outcome);
          firstFailure ??= op.opId;
          this.enqueueRetrain(bundle.bundleId, op, outcome);
          if (!opts.continueOnFailure) break;
          continue;
        }
        outcomes.push(
          ReplayOpOutcomeSchema.parse({
            opId: op.opId,
            sequence: op.sequence,
            success: true,
            failureClass: "none",
            reason: "OK",
            observedOutputSha256: result.outputStateSha256,
            durationMs: result.durationMs,
          }),
        );
        currentState = result.outputStateSha256;
      } else {
        const outcome = ReplayOpOutcomeSchema.parse({
          opId: op.opId,
          sequence: op.sequence,
          success: false,
          failureClass: result.failureClass,
          reason: result.reason,
          observedOutputSha256: result.observedOutputSha256,
          durationMs: result.durationMs,
        });
        outcomes.push(outcome);
        firstFailure ??= op.opId;
        this.enqueueRetrain(bundle.bundleId, op, outcome);
        if (!opts.continueOnFailure) break;
      }
    }
    const totalDurationMs = this.clock.monotonicMs() - startTime;
    const run: ReplayRun = ReplayRunSchema.parse({
      runId: `run-${bundle.bundleId}-${startTime}`,
      bundleId: bundle.bundleId,
      startedAt,
      endedAt: this.clock.now(),
      outcomes,
      overallSuccess: firstFailure === undefined && outcomes.length === bundle.operations.length,
      firstFailureOpId: firstFailure,
      totalDurationMs,
    });
    return run;
  }

  // ── Cross-bundle diff ─────────────────────────────────────────────────────

  /**
   * Diff two bundles op-by-op. Matches by sequence + opId; falls back to
   * sequence-only. Produces added/removed/modified/reordered/unchanged.
   */
  diff(leftBundleId: string, rightBundleId: string): BundleDiff {
    const left = this.mustGet(leftBundleId);
    const right = this.mustGet(rightBundleId);

    const leftByKey = new Map<string, CADOperation>();
    for (const o of left.operations) leftByKey.set(opKey(o), o);
    const rightByKey = new Map<string, CADOperation>();
    for (const o of right.operations) rightByKey.set(opKey(o), o);

    const diffs: OpDiff[] = [];
    const seen = new Set<string>();

    // Walk left in order
    for (const l of left.operations) {
      const key = opKey(l);
      seen.add(key);
      const r = rightByKey.get(key);
      if (!r) {
        diffs.push(
          OpDiffSchema.parse({
            sequence: l.sequence,
            left: l,
            right: null,
            diff: "removed",
          }),
        );
        continue;
      }
      const changed = changedFields(l, r);
      if (changed.length === 0) {
        diffs.push(
          OpDiffSchema.parse({
            sequence: l.sequence,
            left: l,
            right: r,
            diff: l.sequence === r.sequence ? "unchanged" : "reordered",
          }),
        );
      } else {
        diffs.push(
          OpDiffSchema.parse({
            sequence: l.sequence,
            left: l,
            right: r,
            diff: "modified",
            changedFields: changed,
          }),
        );
      }
    }
    // Anything in right not seen is "added"
    for (const r of right.operations) {
      const key = opKey(r);
      if (seen.has(key)) continue;
      diffs.push(
        OpDiffSchema.parse({
          sequence: r.sequence,
          left: null,
          right: r,
          diff: "added",
        }),
      );
    }

    const summary = {
      added: diffs.filter((d) => d.diff === "added").length,
      removed: diffs.filter((d) => d.diff === "removed").length,
      modified: diffs.filter((d) => d.diff === "modified").length,
      unchanged: diffs.filter((d) => d.diff === "unchanged").length,
    };
    return BundleDiffSchema.parse({
      leftBundleId,
      rightBundleId,
      diffs,
      summary,
    });
  }

  // ── Cross-bundle search ───────────────────────────────────────────────────

  /**
   * Find ops across all registered bundles whose kind matches and whose
   * parameter set is a superset of the query. Score is fraction of query
   * keys matched.
   */
  search(q: {
    kinds?: OpKind[];
    paramEquals?: Record<string, string | number | boolean | null>;
    limit?: number;
  }): SearchHit[] {
    const hits: SearchHit[] = [];
    const paramKeys = Object.keys(q.paramEquals ?? {});
    const limit = q.limit ?? 50;
    for (const bundle of this.bundles.values()) {
      for (const op of bundle.operations) {
        if (q.kinds && q.kinds.length > 0 && !q.kinds.includes(op.kind)) continue;
        let matchedKeys = 0;
        for (const k of paramKeys) {
          if (op.params[k] === q.paramEquals![k]) matchedKeys++;
        }
        if (paramKeys.length > 0 && matchedKeys === 0) continue;
        const score = paramKeys.length === 0 ? 1 : matchedKeys / paramKeys.length;
        hits.push(
          SearchHitSchema.parse({
            bundleId: bundle.bundleId,
            opId: op.opId,
            sequence: op.sequence,
            score,
            reason: paramKeys.length === 0
              ? `kind=${op.kind}`
              : `matched ${matchedKeys}/${paramKeys.length} params`,
          }),
        );
      }
    }
    hits.sort((a, b) => b.score - a.score);
    return hits.slice(0, limit);
  }

  // ── Retrain queue ─────────────────────────────────────────────────────────

  retrainEntries(): RetrainEntry[] {
    return [...this.retrainQueue];
  }

  drainRetrainQueue(): RetrainEntry[] {
    const out = [...this.retrainQueue];
    this.retrainQueue = [];
    return out;
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private enqueueRetrain(
    bundleId: string,
    op: CADOperation,
    outcome: ReplayOpOutcome,
  ): void {
    const priority = priorityForFailure(outcome.failureClass);
    const entry = RetrainEntrySchema.parse({
      entryId: `retrain-${bundleId}-${op.opId}-${Date.now()}`,
      bundleId,
      opId: op.opId,
      failureClass: outcome.failureClass,
      reason: outcome.reason,
      capturedAt: this.clock.now(),
      priority,
    });
    this.retrainQueue.push(entry);
  }

  private mustGet(id: string): CADBundle {
    const b = this.bundles.get(id);
    if (!b) throw new Error(`Unknown bundle ${id}`);
    return b;
  }
}

function opKey(op: CADOperation): string {
  return `${op.sequence}::${op.opId}`;
}

function changedFields(a: CADOperation, b: CADOperation): string[] {
  const out: string[] = [];
  if (a.kind !== b.kind) out.push("kind");
  if (a.inputStateSha256 !== b.inputStateSha256) out.push("inputStateSha256");
  if (a.outputStateSha256 !== b.outputStateSha256) out.push("outputStateSha256");
  if (JSON.stringify(a.params) !== JSON.stringify(b.params)) out.push("params");
  return out;
}

function priorityForFailure(fc: FailureClass): number {
  switch (fc) {
    case "op_threw":
      return 9;
    case "geometry_check_failed":
      return 8;
    case "output_state_mismatch":
      return 7;
    case "tolerance_violation":
      return 6;
    case "input_state_mismatch":
      return 5;
    case "timeout":
      return 4;
    default:
      return 1;
  }
}

function defaultClock(): ReplayClock {
  return {
    now: () => new Date().toISOString(),
    monotonicMs: () => Date.now(),
  };
}

export const cadBundleReplayCompareEngine = new CADBundleReplayCompareEngine();
