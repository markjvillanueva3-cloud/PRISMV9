/**
 * CADPreviewEngine — CAD-COMPLETE-MS0 / U-AI-07
 * ==============================================
 *
 * Pure dry-run preview for CAD operations. Projects the believed `CADWorldState`
 * forward through one or many ops AND returns the canonical `CADWorldDiff`
 * WITHOUT ever mutating the real `cadWorldModelEngine` singleton.
 *
 * The CAD agent uses this to answer "what would happen if I applied these
 * ops?" before deciding whether to actually commit them. Examples:
 *
 *  - DFM advisor wants to score a proposed extrude+fillet sequence before
 *    asking the human to approve it.
 *  - Planner wants to confirm a delete cascades correctly (subtree removal,
 *    selection cleanup) before letting the user click "apply".
 *  - Multi-chat coordinator wants to surface "this op will succeed/fail in
 *    the current world state" without racing other chats' writes.
 *
 * Composition contract — strict purity:
 *
 *  1. **Real world is never invoked with a mutating call.** The engine never
 *     calls `realWorld.applyOp()`, `restore()`, `reset()`, `checkpoint()`,
 *     or `getOrCreate()` for a docId that does not already exist. For a
 *     not-yet-known docId, the engine fabricates an empty baseline locally
 *     so production state is not silently materialised by a preview call.
 *
 *  2. **Sandbox is fresh per call.** Each preview() / previewAll() builds
 *     a new ephemeral `CADWorldModelEngine` instance and seeds it via
 *     `restore()` with a deep-copy of the baseline. The sandbox dies with
 *     the call (garbage-collected). No cross-call state survives — preview
 *     results are deterministic functions of (baseline, ops).
 *
 *  3. **Atomicity for multi-op previews via composition.** previewAll()
 *     constructs a fresh `CADTransactionEngine` bound to the sandbox and
 *     calls its `applyAll()` — inheriting the same auto-rollback-on-failure
 *     contract the real transaction engine guarantees. A bad op mid-sequence
 *     does NOT leave a half-projected state; the preview either reports
 *     "all N ops would succeed → here is the projected diff" or "the K-th
 *     op would throw → here is the error and the diff up to op K-1".
 *
 *  4. **Diff via canonical static method.** Uses `CADWorldModelEngine.diff`
 *     so the preview's `parametersChanged` semantics match the real world's
 *     (float-epsilon equality, `identical` flag, sorted entity-id lists).
 *
 * @module engines/CADPreviewEngine
 * @version 1.0.0
 */

import {
  CADWorldModelEngine,
  cadWorldModelEngine,
  type CADWorldOp,
  type CADWorldState,
  type CADWorldDiff,
  type CADUnits,
} from "./CADWorldModelEngine.js";
import { CADTransactionEngine } from "./CADTransactionEngine.js";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Result of a single-op preview.
 *
 *  - `applied=true`  — op would succeed; `projectedState` and `diff` describe
 *                      the post-op world; `errors` is empty.
 *  - `applied=false` — op would throw in the real world; `projectedState` is
 *                      null; `diff` is the identical-diff of baseline vs
 *                      baseline (so callers can safely render it); the error
 *                      message is in `errors[0]`.
 */
export interface CADPreviewResult {
  docId: string;
  applied: boolean;
  baseline: CADWorldState;
  projectedState: CADWorldState | null;
  diff: CADWorldDiff;
  opsApplied: number;
  errors: string[];
}

/**
 * Result of a multi-op preview.
 *
 *  - `applied=true`  — every op in the batch would succeed; `projectedState`
 *                      describes the post-batch world; `diff` is the change
 *                      from baseline to that final state.
 *  - `applied=false` — at least one op would fail; the batch was rolled
 *                      back (transaction semantics — all-or-nothing in
 *                      production). `projectedState` is null; `diff` is the
 *                      identical-diff of baseline vs baseline. `errors`
 *                      carries the failure messages from the sandbox txn.
 */
export interface CADPreviewAllResult {
  docId: string;
  applied: boolean;
  baseline: CADWorldState;
  projectedState: CADWorldState | null;
  diff: CADWorldDiff;
  opsApplied: number;
  opsAttempted: number;
  errors: string[];
}

/**
 * Minimal real-world contract used by the preview engine. Mirrors the
 * subset of `CADWorldModelEngine` we touch (READ-ONLY methods only — the
 * preview engine never calls a mutating method on the real world).
 */
export interface CADRealWorldLike {
  list(): string[];
  getOrCreate(docId: string, units?: CADUnits): CADWorldState;
}

/**
 * Optional injection bag — lets tests substitute a fake real-world and
 * fake sandbox factory for deterministic assertions.
 */
export interface CADPreviewEngineOptions {
  realWorld?: CADRealWorldLike;
  /**
   * Factory for the sandbox `CADWorldModelEngine`. Defaults to
   * `() => new CADWorldModelEngine()`. Tests pass a stub to assert that
   * the engine never reuses sandboxes across calls.
   */
  sandboxFactory?: () => CADWorldModelEngine;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

export class CADPreviewEngine {
  private readonly realWorld: CADRealWorldLike;
  private readonly sandboxFactory: () => CADWorldModelEngine;

  constructor(opts: CADPreviewEngineOptions = {}) {
    this.realWorld = opts.realWorld ?? (cadWorldModelEngine as CADRealWorldLike);
    this.sandboxFactory =
      opts.sandboxFactory ?? (() => new CADWorldModelEngine());
  }

  /**
   * Preview the projected world-state delta for a single op without
   * mutating the real world. See `CADPreviewResult` for the return shape.
   *
   * @throws Error only for static-input violations (docId not a non-empty
   *   string, op not an object). A runtime rejection from `applyOp` is
   *   captured in `errors` — it is NOT re-thrown, because a preview call
   *   asking "would this op succeed?" must always answer either "yes"
   *   (applied=true) or "no, because <reason>" (applied=false, errors[0]),
   *   never throw the question back at the caller.
   */
  preview(docId: string, op: CADWorldOp, units: CADUnits = "mm"): CADPreviewResult {
    const id = this.normalizeDocId(docId);
    if (op === null || typeof op !== "object") {
      throw new Error("CADPreviewEngine: op must be an object");
    }
    const baseline = this.snapshotBaseline(id, units);
    const sandbox = this.makeSandbox(id, baseline);
    let projectedState: CADWorldState | null = null;
    const errors: string[] = [];
    try {
      projectedState = sandbox.applyOp(id, op);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
    const diff = CADWorldModelEngine.diff(baseline, projectedState ?? baseline);
    return {
      docId: id,
      applied: projectedState !== null,
      baseline,
      projectedState,
      diff,
      opsApplied: projectedState !== null ? 1 : 0,
      errors,
    };
  }

  /**
   * Preview the projected world-state delta for an ordered batch of ops.
   * Inherits transaction-style all-or-nothing semantics from
   * `CADTransactionEngine.applyAll`: if any op throws, the sandbox is
   * auto-rolled-back and the returned result reports `applied=false`. See
   * `CADPreviewAllResult` for the return shape.
   *
   * The `units` param seeds the sandbox baseline only when the docId is
   * not yet known to the real world; for known docs the real document's
   * recorded units win (same semantics as `cadWorldModelEngine.applyOp`
   * would see in production).
   *
   * @throws Error only for static-input violations (docId, ops not an
   *   array). Per-op runtime rejections are captured in `errors`.
   */
  previewAll(
    docId: string,
    ops: CADWorldOp[],
    units: CADUnits = "mm",
  ): CADPreviewAllResult {
    const id = this.normalizeDocId(docId);
    if (!Array.isArray(ops)) {
      throw new Error("CADPreviewEngine: previewAll requires an ops array");
    }
    const baseline = this.snapshotBaseline(id, units);
    const sandbox = this.makeSandbox(id, baseline);
    // Compose the txn engine onto the sandbox — inherits atomicity for free.
    const sandboxTxn = new CADTransactionEngine({ world: sandbox });
    const txResult = sandboxTxn.applyAll(id, ops, units);
    const committed = txResult.committed;
    let projectedState: CADWorldState | null = null;
    if (committed && txResult.result.state === "committed") {
      projectedState = txResult.result.finalState;
    }
    const diff = CADWorldModelEngine.diff(baseline, projectedState ?? baseline);
    return {
      docId: id,
      applied: committed,
      baseline,
      projectedState,
      diff,
      opsApplied: txResult.opsApplied,
      opsAttempted: txResult.opsAttempted,
      errors: [...txResult.errors],
    };
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private normalizeDocId(docId: string): string {
    if (typeof docId !== "string") {
      throw new Error("CADPreviewEngine: docId must be a string");
    }
    const id = docId.trim();
    if (id.length === 0) {
      throw new Error("CADPreviewEngine: docId must be a non-empty string");
    }
    return id;
  }

  /**
   * Build the preview baseline WITHOUT mutating the real world.
   *
   *  - Known docId: return a deep-copy of the real world's snapshot. The
   *    deep copy defends against (a) the real world handing back a live
   *    reference (it doesn't today, but the contract could drift) and
   *    (b) a peer chat mutating the snapshot between read and use.
   *  - Unknown docId: fabricate an empty `CADWorldState` LOCALLY — do not
   *    call `realWorld.getOrCreate`, which would silently materialise the
   *    document in production state.
   */
  private snapshotBaseline(id: string, units: CADUnits): CADWorldState {
    const knownIds = new Set(this.realWorld.list());
    if (!knownIds.has(id)) {
      return {
        docId: id,
        entities: [],
        parameters: {},
        selection: [],
        units,
        opCount: 0,
      };
    }
    const raw = this.realWorld.getOrCreate(id);
    return {
      docId: raw.docId,
      entities: raw.entities.map((e) => ({ ...e })),
      parameters: { ...raw.parameters },
      selection: [...raw.selection],
      units: raw.units,
      opCount: raw.opCount,
    };
  }

  /**
   * Build a fresh sandbox `CADWorldModelEngine` seeded with the baseline.
   * The sandbox is a write-only target for the preview — the real world
   * is never touched.
   */
  private makeSandbox(id: string, baseline: CADWorldState): CADWorldModelEngine {
    const sandbox = this.sandboxFactory();
    sandbox.restore(id, baseline);
    return sandbox;
  }
}

/**
 * Process-wide singleton, default-bound to the real `cadWorldModelEngine`.
 * Tests can instantiate their own via `new CADPreviewEngine({...})` and
 * pass a fake real-world or sandbox factory — the singleton stays bound
 * to the production world model.
 */
export const cadPreviewEngine = new CADPreviewEngine();
