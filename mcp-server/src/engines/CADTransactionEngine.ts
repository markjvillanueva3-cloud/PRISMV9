/**
 * CADTransactionEngine — CAD-COMPLETE-MS0 / U-AI-08
 * ==================================================
 *
 * Atomic transaction wrapper over `CADWorldModelEngine`. Composes the
 * world-model's `getOrCreate()` + `applyOp()` + `restore()` primitives
 * into ACID-style begin / apply / commit / rollback semantics so the CAD
 * agent can group multiple operations into a single, all-or-nothing unit
 * of work — and rewind the believed state if any op fails.
 *
 * The world model already guarantees that a single invalid op THROWS
 * rather than silently corrupting state, but a single bad op mid-sequence
 * (e.g. a 6-op extrude+pattern sequence whose 4th op references an entity
 * the prior op failed to create) would otherwise leave the world model
 * partially advanced. The transaction engine snapshots the pre-transaction
 * `CADWorldState` at `begin()`, and either replays the snapshot
 * (`rollback()`) or finalizes the diff (`commit()`).
 *
 * Design choices, with the contracts they enforce:
 *
 *  1. **One active transaction per docId.** Two concurrent transactions
 *     on the same document would race-corrupt the believed state — the
 *     second transaction's baseline would already include the first's
 *     half-applied ops. `begin()` throws if a pending transaction for the
 *     docId already exists.
 *
 *  2. **Auto-rollback on apply failure.** If `apply()` throws (the world
 *     model rejected the op), the engine immediately rolls the document
 *     back to the baseline and marks the transaction `failed`. The caller
 *     cannot keep adding ops to a failed transaction — atomicity is the
 *     point. The error is preserved in `txn.errors` for diagnosis.
 *
 *  3. **Commit / rollback are terminal.** Once a transaction is in any
 *     terminal state (`committed`, `rolled_back`, `failed`), `apply()`,
 *     `commit()`, and `rollback()` all throw. The transaction can still
 *     be inspected via `status()` and `list()` — terminal transactions
 *     stay in the registry until `reset()` so an agent can audit them.
 *
 *  4. **Instance-method singleton.** Mirrors the sibling
 *     `CADWorldModelEngine` (see R11 — match local convention). Diverges
 *     from the global "static methods" engine rule because the world-model
 *     pattern is the surrounding convention this engine composes with.
 *
 * @module engines/CADTransactionEngine
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

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * Transaction lifecycle states.
 *
 *  - `pending`     — begin() succeeded, apply() may be called
 *  - `committed`   — commit() succeeded, diff captured, terminal
 *  - `rolled_back` — rollback() invoked explicitly, baseline restored, terminal
 *  - `failed`      — apply() threw and auto-rollback ran, terminal
 */
export type TxnState = "pending" | "committed" | "rolled_back" | "failed";

/** A snapshot of one in-flight transaction. */
export interface CADTransaction {
  txnId: string;
  docId: string;
  /** ms epoch when begin() was called. */
  startedAt: number;
  /** ms epoch when terminal state was reached, null while pending. */
  endedAt: number | null;
  state: TxnState;
  /** Pre-transaction snapshot, used by rollback() and auto-rollback. */
  baseline: CADWorldState;
  /** Ops that have been successfully applied (in order). */
  ops: CADWorldOp[];
  /** Errors accumulated by failed apply() / commit() / rollback() calls. */
  errors: string[];
}

/** Result of a successful apply() call. */
export interface TxnApplyResult {
  txnId: string;
  docId: string;
  /** New believed state after the op committed. */
  state: CADWorldState;
  /** Number of ops applied so far (including this one). */
  opsApplied: number;
}

/** Result of a successful commit() call. */
export interface TxnCommitResult {
  txnId: string;
  docId: string;
  state: "committed";
  opsApplied: number;
  /** Diff of the final state vs the pre-transaction baseline. */
  diff: CADWorldDiff;
  /** Final believed state after commit. */
  finalState: CADWorldState;
}

/** Result of a successful rollback() call. */
export interface TxnRollbackResult {
  txnId: string;
  docId: string;
  state: "rolled_back" | "failed";
  opsReverted: number;
  /** Believed state after baseline restore. */
  restoredState: CADWorldState;
}

/** Read-only view of a transaction (returned by status() / list()). */
export interface TxnStatus {
  txnId: string;
  docId: string;
  state: TxnState;
  opsApplied: number;
  errorCount: number;
  startedAt: number;
  endedAt: number | null;
  /** Wall-clock age in ms (now - startedAt), useful for stale-detection. */
  ageMs: number;
}

/** Result of an applyAll() convenience call. */
export interface TxnApplyAllResult {
  /** True iff all ops applied AND commit() succeeded. */
  committed: boolean;
  txnId: string;
  docId: string;
  state: TxnState;
  opsApplied: number;
  opsAttempted: number;
  errors: string[];
  /** Commit diff if committed, restored state if rolled back. */
  result: TxnCommitResult | TxnRollbackResult;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

/**
 * Minimal world-model contract used by the transaction engine. Defined as
 * a structural type so tests can inject a fake without depending on the
 * full CADWorldModelEngine surface area.
 */
export interface CADWorldModelLike {
  getOrCreate(docId: string, units?: CADUnits): CADWorldState;
  applyOp(docId: string, op: CADWorldOp): CADWorldState;
  restore(docId: string, state: CADWorldState): CADWorldState;
}

/**
 * Optional injection bag for `CADTransactionEngine` — primarily for tests,
 * where deterministic ids and clocks make assertions stable.
 */
export interface CADTransactionEngineOptions {
  world?: CADWorldModelLike;
  /** Stable id generator (default: per-process sequential `txn-N`). */
  idGen?: () => string;
  /** Clock for startedAt/endedAt (default: Date.now). */
  clock?: () => number;
}

export class CADTransactionEngine {
  private readonly txns = new Map<string, CADTransaction>();
  /** docId → txnId of the in-flight pending transaction (lookup index). */
  private readonly activeByDoc = new Map<string, string>();
  private readonly world: CADWorldModelLike;
  private readonly idGen: () => string;
  private readonly clock: () => number;
  private seq = 0;

  constructor(opts: CADTransactionEngineOptions = {}) {
    this.world = opts.world ?? (cadWorldModelEngine as CADWorldModelLike);
    this.idGen = opts.idGen ?? (() => `txn-${++this.seq}`);
    this.clock = opts.clock ?? (() => Date.now());
  }

  /**
   * Open a new transaction for the given document. Snapshots the current
   * believed state as the rollback baseline. Throws if another transaction
   * for the same docId is still pending (one-active-per-doc invariant).
   *
   * @param docId — document identifier
   * @param units — units to assume if the document does not yet exist
   * @returns A snapshot of the new transaction
   */
  begin(docId: string, units: CADUnits = "mm"): CADTransaction {
    const id = this.normalizeDocId(docId);
    const existing = this.activeByDoc.get(id);
    if (existing) {
      throw new Error(
        `CADTransactionEngine: document "${id}" already has an active transaction "${existing}"`,
      );
    }
    // getOrCreate returns a fresh serialisable snapshot (the live MutableWorld
    // is never exposed). We defensively deep-copy the surface fields anyway so
    // a contract change in the world model — or a peer chat mutating the
    // returned snapshot — cannot corrupt our rollback baseline. The cost is
    // one extra spread per begin(), in exchange for a load-bearing invariant.
    const raw = this.world.getOrCreate(id, units);
    const baseline: CADWorldState = {
      docId: raw.docId,
      entities: raw.entities.map((e) => ({ ...e })),
      parameters: { ...raw.parameters },
      selection: [...raw.selection],
      units: raw.units,
      opCount: raw.opCount,
    };
    const txn: CADTransaction = {
      txnId: this.idGen(),
      docId: id,
      startedAt: this.clock(),
      endedAt: null,
      state: "pending",
      baseline,
      ops: [],
      errors: [],
    };
    this.txns.set(txn.txnId, txn);
    this.activeByDoc.set(id, txn.txnId);
    return this.snapshot(txn);
  }

  /**
   * Apply one operation inside the transaction. On the world model
   * rejecting the op, the transaction is auto-rolled-back to the baseline
   * and marked `failed` — the caller cannot keep adding ops to a poisoned
   * transaction. The original error is re-thrown so the caller learns
   * about it the same way they would from a direct applyOp().
   *
   * @throws Error when the transaction is not pending or the op was rejected
   */
  apply(txnId: string, op: CADWorldOp): TxnApplyResult {
    const txn = this.requirePending(txnId);
    let state: CADWorldState;
    try {
      state = this.world.applyOp(txn.docId, op);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      txn.errors.push(msg);
      // Auto-rollback before surfacing the error so the believed state is
      // never left half-advanced after a failed transactional apply.
      try {
        this.world.restore(txn.docId, txn.baseline);
      } catch (restoreErr) {
        const rmsg = restoreErr instanceof Error ? restoreErr.message : String(restoreErr);
        txn.errors.push(`auto-rollback failed: ${rmsg}`);
      }
      this.finalize(txn, "failed");
      throw err instanceof Error ? err : new Error(msg);
    }
    txn.ops.push(op);
    return {
      txnId: txn.txnId,
      docId: txn.docId,
      state,
      opsApplied: txn.ops.length,
    };
  }

  /**
   * Finalize a pending transaction. Returns the diff of the final state
   * vs the pre-transaction baseline so the caller can inspect what
   * changed. Idempotency is NOT provided — commit() throws on a terminal
   * transaction (atomicity demands a single commit point).
   */
  commit(txnId: string): TxnCommitResult {
    const txn = this.requirePending(txnId);
    const finalState = this.world.getOrCreate(txn.docId);
    const diff = this.computeDiff(txn.baseline, finalState);
    this.finalize(txn, "committed");
    return {
      txnId: txn.txnId,
      docId: txn.docId,
      state: "committed",
      opsApplied: txn.ops.length,
      diff,
      finalState,
    };
  }

  /**
   * Restore the document to its pre-transaction baseline and mark the
   * transaction `rolled_back`. Throws on a terminal transaction — the
   * auto-rollback path that follows a failed apply() handles its own
   * cleanup and does not need an external rollback() call.
   */
  rollback(txnId: string): TxnRollbackResult {
    const txn = this.requirePending(txnId);
    const opsReverted = txn.ops.length;
    let restoredState: CADWorldState;
    try {
      restoredState = this.world.restore(txn.docId, txn.baseline);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      txn.errors.push(`rollback restore failed: ${msg}`);
      this.finalize(txn, "failed");
      throw err instanceof Error ? err : new Error(msg);
    }
    this.finalize(txn, "rolled_back");
    return {
      txnId: txn.txnId,
      docId: txn.docId,
      state: "rolled_back",
      opsReverted,
      restoredState,
    };
  }

  /** Read-only status snapshot — null if the txn id is unknown. */
  status(txnId: string): TxnStatus | null {
    const txn = this.txns.get(txnId);
    if (!txn) return null;
    return this.statusOf(txn);
  }

  /**
   * List every transaction (optionally filtered by docId). Returns
   * read-only status views so callers cannot mutate engine state.
   */
  list(docId?: string): TxnStatus[] {
    const filterId = docId !== undefined ? this.normalizeDocId(docId) : null;
    const out: TxnStatus[] = [];
    for (const txn of this.txns.values()) {
      if (filterId !== null && txn.docId !== filterId) continue;
      out.push(this.statusOf(txn));
    }
    // Stable order: oldest first, then deterministic lex on txnId
    out.sort((a, b) =>
      a.startedAt !== b.startedAt
        ? a.startedAt - b.startedAt
        : a.txnId.localeCompare(b.txnId),
    );
    return out;
  }

  /**
   * Convenience: open a transaction, apply every op in order, and commit.
   * If any op throws, the transaction auto-rolls-back inside `apply()` and
   * this method returns `{ committed: false, ... }` with the rollback
   * result and the captured error — no exception escapes. Use this for
   * the common "ship these N ops as one unit" pattern.
   */
  applyAll(
    docId: string,
    ops: CADWorldOp[],
    units: CADUnits = "mm",
  ): TxnApplyAllResult {
    if (!Array.isArray(ops)) {
      throw new Error("CADTransactionEngine: applyAll requires an ops array");
    }
    const txn = this.begin(docId, units);
    let opsApplied = 0;
    try {
      for (const op of ops) {
        this.apply(txn.txnId, op);
        opsApplied += 1;
      }
    } catch (err) {
      // The failing apply() already triggered auto-rollback and finalised the
      // transaction as "failed". If the registry was concurrently reset, the
      // txn entry may be gone — surface that with a precise error rather than
      // crashing with a misleading TypeError.
      const finalTxn = this.txns.get(txn.txnId);
      if (!finalTxn) {
        throw new Error(
          `CADTransactionEngine: applyAll lost transaction "${txn.txnId}" mid-loop (registry reset?). Original error: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
      // restoredState is what auto-rollback actually replayed (the baseline),
      // not the live world — which a peer could have mutated between
      // restore-completion and this read. The baseline is already defensively
      // deep-copied at begin(), so handing it out is safe.
      const restoredState = finalTxn.baseline;
      return {
        committed: false,
        txnId: finalTxn.txnId,
        docId: finalTxn.docId,
        state: finalTxn.state,
        opsApplied,
        opsAttempted: ops.length,
        errors: [...finalTxn.errors],
        result: {
          txnId: finalTxn.txnId,
          docId: finalTxn.docId,
          state: finalTxn.state === "failed" ? "failed" : "rolled_back",
          // opsReverted == count of ops that successfully landed before the
          // failure (the (N+1)th throwing op was never applied). The rollback
          // wholesale-restored baseline, so this is "how many successful ops
          // were undone", NOT a count of discrete reverse-ops.
          opsReverted: opsApplied,
          restoredState,
        },
      };
    }
    const commit = this.commit(txn.txnId);
    return {
      committed: true,
      txnId: commit.txnId,
      docId: commit.docId,
      state: "committed",
      opsApplied,
      opsAttempted: ops.length,
      errors: [],
      result: commit,
    };
  }

  /** Drop every transaction from the registry (test / reset hook). */
  reset(): void {
    this.txns.clear();
    this.activeByDoc.clear();
  }

  // -------------------------------------------------------------------------
  // Internal
  // -------------------------------------------------------------------------

  private normalizeDocId(docId: string): string {
    if (typeof docId !== "string") {
      throw new Error("CADTransactionEngine: docId must be a string");
    }
    const id = docId.trim();
    if (id.length === 0) {
      throw new Error("CADTransactionEngine: docId must be a non-empty string");
    }
    return id;
  }

  /** Resolve a txn that MUST be pending; throws with a precise reason. */
  private requirePending(txnId: string): CADTransaction {
    if (typeof txnId !== "string" || txnId.trim().length === 0) {
      throw new Error("CADTransactionEngine: txnId must be a non-empty string");
    }
    const txn = this.txns.get(txnId);
    if (!txn) {
      throw new Error(`CADTransactionEngine: unknown txnId "${txnId}"`);
    }
    if (txn.state !== "pending") {
      throw new Error(
        `CADTransactionEngine: transaction "${txnId}" is ${txn.state}, not pending`,
      );
    }
    return txn;
  }

  /** Move a transaction to a terminal state and release its doc lock. */
  private finalize(txn: CADTransaction, state: TxnState): void {
    txn.state = state;
    txn.endedAt = this.clock();
    if (this.activeByDoc.get(txn.docId) === txn.txnId) {
      this.activeByDoc.delete(txn.docId);
    }
  }

  private snapshot(txn: CADTransaction): CADTransaction {
    // Shallow clone — baseline + ops + errors are already immutable shapes
    // from the world model's perspective, but we expose a new object so
    // mutation of the returned snapshot cannot corrupt registry state.
    return {
      txnId: txn.txnId,
      docId: txn.docId,
      startedAt: txn.startedAt,
      endedAt: txn.endedAt,
      state: txn.state,
      baseline: txn.baseline,
      ops: [...txn.ops],
      errors: [...txn.errors],
    };
  }

  private statusOf(txn: CADTransaction): TxnStatus {
    return {
      txnId: txn.txnId,
      docId: txn.docId,
      state: txn.state,
      opsApplied: txn.ops.length,
      errorCount: txn.errors.length,
      startedAt: txn.startedAt,
      endedAt: txn.endedAt,
      ageMs: Math.max(0, this.clock() - txn.startedAt),
    };
  }

  /**
   * Delegates to `CADWorldModelEngine.diff(before, after)` so we share one
   * canonical diff algorithm (including float-epsilon parameter equality,
   * sort order, and `identical` semantics) with the world model. Avoids
   * the contract drift hazard of maintaining two implementations.
   */
  private computeDiff(before: CADWorldState, after: CADWorldState): CADWorldDiff {
    return CADWorldModelEngine.diff(before, after);
  }
}

/**
 * Process-wide singleton mirroring `cadWorldModelEngine`. Tests can
 * instantiate their own via `new CADTransactionEngine({...})` and pass a
 * fake world model — the singleton stays bound to the real world model
 * for production use.
 */
export const cadTransactionEngine = new CADTransactionEngine();
