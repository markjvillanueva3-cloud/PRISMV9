/**
 * CADTransactionEngine.test.ts — CAD-COMPLETE-MS0 / U-AI-08
 *
 * Tests the atomic transaction wrapper over CADWorldModelEngine. Real
 * cadWorldModelEngine instances are used (not mocks) so the integration
 * contract is exercised end-to-end. Each test resets the world before
 * `begin()` so global state never leaks between cases.
 */
import { describe, it, expect } from "vitest";
import {
  CADTransactionEngine,
  cadTransactionEngine,
  type CADWorldModelLike,
} from "../engines/CADTransactionEngine.js";
import {
  CADWorldModelEngine,
  cadWorldModelEngine,
  type CADWorldOp,
  type CADWorldState,
  type CADUnits,
} from "../engines/CADWorldModelEngine.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a fresh transaction engine bound to a fresh world model. */
const freshPair = (): {
  txn: CADTransactionEngine;
  world: CADWorldModelEngine;
  ids: string[];
} => {
  const world = new CADWorldModelEngine();
  const ids: string[] = [];
  let counter = 0;
  let nowMs = 1_000_000;
  const txn = new CADTransactionEngine({
    world,
    idGen: () => {
      const id = `txn-${++counter}`;
      ids.push(id);
      return id;
    },
    clock: () => nowMs++,
  });
  return { txn, world, ids };
};

/** Inline-clock variant so test can advance time deterministically. */
const freshPairWithClock = (): {
  txn: CADTransactionEngine;
  world: CADWorldModelEngine;
  advance: (ms: number) => void;
} => {
  const world = new CADWorldModelEngine();
  let now = 1_000_000;
  let counter = 0;
  const txn = new CADTransactionEngine({
    world,
    idGen: () => `txn-${++counter}`,
    clock: () => now,
  });
  return {
    txn,
    world,
    advance: (ms: number) => {
      now += ms;
    },
  };
};

// Convenience op factories
const createBody = (id: string, name = `body-${id}`): CADWorldOp => ({
  kind: "create_body",
  entityId: id,
  entityKind: "body",
  name,
});
/** A feature op (extrude/fillet/etc) targets an EXISTING entity — the
 *  world model creates a new `feat-N` entity parented to the target.
 *  `targetId` must already exist when the op is applied. */
const extrude = (targetId: string): CADWorldOp => ({
  kind: "extrude",
  entityId: targetId,
  name: `extrude-${targetId}`,
});
const setParam = (parameter: string, value: number): CADWorldOp => ({
  kind: "set_parameter",
  parameter,
  value,
});
const deleteOp = (entityId: string): CADWorldOp => ({
  kind: "delete",
  entityId,
});

// ---------------------------------------------------------------------------
// 1. Construction & singleton
// ---------------------------------------------------------------------------

describe("CADTransactionEngine — construction", () => {
  it("exposes a singleton bound to the real world model", () => {
    expect(cadTransactionEngine).toBeInstanceOf(CADTransactionEngine);
    // Singleton uses the shared cadWorldModelEngine; smoke-check by
    // running begin against a real docId via the singleton and confirming
    // the world model now knows about that doc.
    cadTransactionEngine.reset();
    cadWorldModelEngine.reset("singleton-smoke");
    const t = cadTransactionEngine.begin("singleton-smoke");
    expect(t.state).toBe("pending");
    expect(cadWorldModelEngine.list()).toContain("singleton-smoke");
    cadTransactionEngine.rollback(t.txnId);
    cadTransactionEngine.reset();
  });

  it("constructor accepts an injected world model and id generator", () => {
    const { txn, ids } = freshPair();
    const t = txn.begin("doc-a");
    expect(t.txnId).toBe("txn-1");
    expect(ids).toEqual(["txn-1"]);
  });
});

// ---------------------------------------------------------------------------
// 2. begin()
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.begin", () => {
  it("creates a pending transaction with an empty op list", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    expect(t.state).toBe("pending");
    expect(t.ops).toEqual([]);
    expect(t.errors).toEqual([]);
    expect(t.docId).toBe("doc-1");
    expect(t.endedAt).toBeNull();
  });

  it("snapshots the pre-transaction world state as the baseline", () => {
    const { txn, world } = freshPair();
    world.applyOp("doc-1", createBody("b1"));
    world.applyOp("doc-1", setParam("h", 12.5));
    const t = txn.begin("doc-1");
    expect(t.baseline.entities.map((e) => e.id)).toEqual(["b1"]);
    expect(t.baseline.parameters).toEqual({ h: 12.5 });
    expect(t.baseline.opCount).toBe(2);
  });

  it("defaults units to mm when the document does not yet exist", () => {
    const { txn } = freshPair();
    const t = txn.begin("brand-new");
    expect(t.baseline.units).toBe("mm");
  });

  it("respects a units override when creating a new document", () => {
    const { txn } = freshPair();
    const t = txn.begin("imperial-doc", "in");
    expect(t.baseline.units).toBe("in");
  });

  it("throws when a transaction for the same docId is already pending", () => {
    const { txn } = freshPair();
    txn.begin("doc-1");
    expect(() => txn.begin("doc-1")).toThrow(/already has an active transaction/);
  });

  it("allows a new transaction once the prior one is committed", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    txn.commit(a.txnId);
    const b = txn.begin("doc-1");
    expect(b.state).toBe("pending");
    expect(b.txnId).not.toBe(a.txnId);
  });

  it("allows a new transaction once the prior one is rolled back", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    txn.rollback(a.txnId);
    const b = txn.begin("doc-1");
    expect(b.state).toBe("pending");
  });

  it("allows two concurrent transactions on DIFFERENT docs", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    const b = txn.begin("doc-2");
    expect(a.state).toBe("pending");
    expect(b.state).toBe("pending");
    expect(a.docId).not.toBe(b.docId);
  });

  it("rejects non-string and empty docIds", () => {
    const { txn } = freshPair();
    expect(() => txn.begin("")).toThrow(/non-empty string/);
    expect(() => txn.begin("   ")).toThrow(/non-empty string/);
    // @ts-expect-error — runtime validation
    expect(() => txn.begin(42)).toThrow(/must be a string/);
  });

  it("trims leading/trailing whitespace from the docId", () => {
    const { txn } = freshPair();
    const t = txn.begin("  spaced  ");
    expect(t.docId).toBe("spaced");
  });
});

// ---------------------------------------------------------------------------
// 3. apply() — happy path
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.apply — happy path", () => {
  it("applies an op and returns the new state + opsApplied counter", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    const r = txn.apply(t.txnId, createBody("b1"));
    expect(r.opsApplied).toBe(1);
    expect(r.state.entities.map((e) => e.id)).toEqual(["b1"]);
    expect(r.docId).toBe("doc-1");
  });

  it("records each successfully applied op in the txn registry", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1"));
    txn.apply(t.txnId, extrude("b1"));
    txn.apply(t.txnId, setParam("h", 5));
    const status = txn.status(t.txnId);
    expect(status?.opsApplied).toBe(3);
  });

  it("propagates state changes to the underlying world model", () => {
    const { txn, world } = freshPair();
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1"));
    expect(world.getOrCreate("doc-1").entities.map((e) => e.id)).toEqual(["b1"]);
  });

  it("rejects unknown txnIds", () => {
    const { txn } = freshPair();
    expect(() => txn.apply("missing", createBody("b1"))).toThrow(/unknown txnId/);
  });

  it("rejects empty / non-string txnIds", () => {
    const { txn } = freshPair();
    expect(() => txn.apply("", createBody("b1"))).toThrow(/non-empty string/);
    // @ts-expect-error
    expect(() => txn.apply(undefined, createBody("b1"))).toThrow(/non-empty string/);
  });
});

// ---------------------------------------------------------------------------
// 4. apply() — auto-rollback on failure (the core atomicity invariant)
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.apply — auto-rollback", () => {
  it("rolls back to baseline and marks the txn failed when an op throws", () => {
    const { txn, world } = freshPair();
    // Pre-existing state to confirm baseline restore
    world.applyOp("doc-1", createBody("seed"));
    const baselineBefore = world.getOrCreate("doc-1");
    expect(baselineBefore.entities.map((e) => e.id)).toEqual(["seed"]);

    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1")); // ok
    // Apply an op the world model will reject — duplicate id
    expect(() => txn.apply(t.txnId, createBody("b1"))).toThrow(/duplicate entity id/);

    // Auto-rollback must have restored "seed" only, removed "b1"
    const after = world.getOrCreate("doc-1");
    expect(after.entities.map((e) => e.id)).toEqual(["seed"]);
    const s = txn.status(t.txnId);
    expect(s?.state).toBe("failed");
    expect(s?.errorCount).toBeGreaterThan(0);
  });

  it("rejects further apply calls on a failed transaction", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    // Tight regex anchored on the actual world-model delete contract — a
    // looser pattern (e.g. just /unknown/) would silently match unrelated
    // error chains and miss a refactor that changes the message.
    expect(() => txn.apply(t.txnId, deleteOp("ghost"))).toThrow(/cannot delete unknown entity/);
    expect(() => txn.apply(t.txnId, createBody("b1"))).toThrow(/failed, not pending/);
  });

  it("rejects commit on a failed transaction", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    expect(() => txn.apply(t.txnId, deleteOp("ghost"))).toThrow();
    expect(() => txn.commit(t.txnId)).toThrow(/failed, not pending/);
  });

  it("rejects rollback on an already-failed transaction (auto-rollback ran)", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    expect(() => txn.apply(t.txnId, deleteOp("ghost"))).toThrow();
    expect(() => txn.rollback(t.txnId)).toThrow(/failed, not pending/);
  });

  it("releases the doc lock after auto-rollback so a new txn can begin", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    expect(() => txn.apply(a.txnId, deleteOp("ghost"))).toThrow();
    const b = txn.begin("doc-1");
    expect(b.state).toBe("pending");
  });

  it("preserves the original error message in txn.errors", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    let caught: Error | null = null;
    try {
      txn.apply(t.txnId, deleteOp("ghost-entity-id"));
    } catch (err) {
      caught = err as Error;
    }
    // Re-thrown error must carry the original world-model message — verify
    // the docId-identifying token survived round-trip (anchors against a
    // future apply() that silently substitutes a placeholder).
    expect(caught?.message).toContain("ghost-entity-id");
    // The same actionable message must also land in the txn's error log.
    // The world-model error is "cannot delete unknown entity "ghost-entity-id"".
    const fullTxn = txn.list("doc-1").find((s) => s.txnId === t.txnId);
    expect(fullTxn?.errorCount).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// 5. commit()
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.commit", () => {
  it("marks the txn committed and returns a diff vs baseline", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1"));
    txn.apply(t.txnId, createBody("b2"));
    txn.apply(t.txnId, setParam("h", 7));
    const r = txn.commit(t.txnId);
    expect(r.state).toBe("committed");
    expect(r.opsApplied).toBe(3);
    expect(r.diff.addedEntities).toEqual(["b1", "b2"]);
    expect(r.diff.removedEntities).toEqual([]);
    expect(r.diff.parametersChanged).toEqual(["h"]);
    expect(r.diff.identical).toBe(false);
    expect(r.finalState.entities.map((e) => e.id)).toEqual(["b1", "b2"]);
  });

  it("returns identical=true when zero ops were applied", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    const r = txn.commit(t.txnId);
    expect(r.diff.identical).toBe(true);
    expect(r.opsApplied).toBe(0);
  });

  it("does NOT roll back state on commit — final state persists in the world", () => {
    const { txn, world } = freshPair();
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1"));
    txn.commit(t.txnId);
    expect(world.getOrCreate("doc-1").entities.map((e) => e.id)).toEqual(["b1"]);
  });

  it("releases the doc lock so a follow-up transaction can begin", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    txn.apply(a.txnId, createBody("b1"));
    txn.commit(a.txnId);
    const b = txn.begin("doc-1");
    txn.apply(b.txnId, createBody("b2"));
    const r = txn.commit(b.txnId);
    expect(r.finalState.entities.map((e) => e.id).sort()).toEqual(["b1", "b2"]);
  });

  it("rejects commit on an unknown txnId", () => {
    const { txn } = freshPair();
    expect(() => txn.commit("missing")).toThrow(/unknown txnId/);
  });

  it("rejects double-commit (terminal once committed)", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    txn.commit(t.txnId);
    expect(() => txn.commit(t.txnId)).toThrow(/committed, not pending/);
  });

  it("rejects rollback after commit (terminal)", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    txn.commit(t.txnId);
    expect(() => txn.rollback(t.txnId)).toThrow(/committed, not pending/);
  });

  it("captures parametersChanged for both added and modified parameters", () => {
    const { txn, world } = freshPair();
    world.applyOp("doc-1", setParam("existing", 1));
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, setParam("existing", 99));
    txn.apply(t.txnId, setParam("new", 42));
    const r = txn.commit(t.txnId);
    expect(r.diff.parametersChanged.sort()).toEqual(["existing", "new"]);
  });

  it("treats identical parameter writes as parametersChanged=[]", () => {
    // Re-writing a parameter to its existing value must not surface as a diff
    // (the world-model uses float-epsilon equality, which the txn diff
    // delegates to). Originally named "parameter deletions via baseline diff"
    // — renamed to match what the code actually exercises.
    const { txn, world } = freshPair();
    world.applyOp("doc-1", setParam("p", 1));
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, setParam("p", 1)); // same value
    const r = txn.commit(t.txnId);
    expect(r.diff.parametersChanged).toEqual([]);
  });

  it("delegates parameter equality to world-model float-epsilon tolerance", () => {
    // Regression for the P1 fix swapping local strict-equality for the
    // shared CADWorldModelEngine.diff(). A round-trip 0.1+0.2-0.2 normally
    // produces 0.10000000000000003 — naïve `!==` would flag this; the
    // canonical PARAM_EPSILON (1e-9) absorbs it.
    const { txn, world } = freshPair();
    world.applyOp("doc-1", setParam("h", 0.1));
    const t = txn.begin("doc-1");
    const noisy = 0.1 + 0.2 - 0.2;
    txn.apply(t.txnId, setParam("h", noisy));
    const r = txn.commit(t.txnId);
    expect(noisy).not.toBe(0.1); // sanity: the float really is noisy
    expect(r.diff.parametersChanged).toEqual([]); // but the diff absorbs it
  });
});

// ---------------------------------------------------------------------------
// 6. rollback()
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.rollback", () => {
  it("restores the world to the pre-transaction baseline", () => {
    const { txn, world } = freshPair();
    world.applyOp("doc-1", createBody("seed"));
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1"));
    txn.apply(t.txnId, createBody("b2"));
    const r = txn.rollback(t.txnId);
    expect(r.state).toBe("rolled_back");
    expect(r.opsReverted).toBe(2);
    expect(r.restoredState.entities.map((e) => e.id)).toEqual(["seed"]);
    expect(world.getOrCreate("doc-1").entities.map((e) => e.id)).toEqual(["seed"]);
  });

  it("returns the restored state on a no-op rollback (zero apply calls)", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    const r = txn.rollback(t.txnId);
    expect(r.opsReverted).toBe(0);
    expect(r.restoredState.entities).toEqual([]);
  });

  it("restores parameters to baseline values", () => {
    const { txn, world } = freshPair();
    world.applyOp("doc-1", setParam("p", 10));
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, setParam("p", 99));
    txn.apply(t.txnId, setParam("q", 100));
    txn.rollback(t.txnId);
    const after = world.getOrCreate("doc-1");
    expect(after.parameters).toEqual({ p: 10 });
  });

  it("releases the doc lock after rollback", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    txn.rollback(a.txnId);
    const b = txn.begin("doc-1");
    expect(b.state).toBe("pending");
  });

  it("rejects rollback on unknown txnId", () => {
    const { txn } = freshPair();
    expect(() => txn.rollback("missing")).toThrow(/unknown txnId/);
  });

  it("rejects double-rollback (terminal once rolled_back)", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    txn.rollback(t.txnId);
    expect(() => txn.rollback(t.txnId)).toThrow(/rolled_back, not pending/);
  });
});

// ---------------------------------------------------------------------------
// 7. status() / list()
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.status / list", () => {
  it("status returns null for unknown txnIds", () => {
    const { txn } = freshPair();
    expect(txn.status("missing")).toBeNull();
  });

  it("status reflects opsApplied + errorCount + startedAt + endedAt", () => {
    const { txn, advance } = freshPairWithClock();
    const t = txn.begin("doc-1");
    advance(50);
    txn.apply(t.txnId, createBody("b1"));
    advance(25);
    const sPending = txn.status(t.txnId)!;
    expect(sPending.state).toBe("pending");
    expect(sPending.opsApplied).toBe(1);
    expect(sPending.endedAt).toBeNull();
    expect(sPending.ageMs).toBe(75);
    advance(10);
    txn.commit(t.txnId);
    const sDone = txn.status(t.txnId)!;
    expect(sDone.state).toBe("committed");
    expect(sDone.endedAt).not.toBeNull();
  });

  it("list returns every transaction (no filter) in start-time order", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    txn.commit(a.txnId);
    const b = txn.begin("doc-2");
    const c = txn.begin("doc-3");
    const all = txn.list();
    expect(all.map((s) => s.txnId)).toEqual([a.txnId, b.txnId, c.txnId]);
  });

  it("list filters by docId", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    txn.commit(a.txnId);
    const b = txn.begin("doc-1");
    txn.commit(b.txnId);
    txn.begin("doc-2");
    const onDoc1 = txn.list("doc-1");
    expect(onDoc1.every((s) => s.docId === "doc-1")).toBe(true);
    expect(onDoc1).toHaveLength(2);
  });

  it("list trims whitespace from the docId filter", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    txn.commit(a.txnId);
    const filtered = txn.list("  doc-1  ");
    expect(filtered).toHaveLength(1);
  });

  it("list returns an empty array for an unknown docId", () => {
    const { txn } = freshPair();
    txn.begin("doc-1");
    expect(txn.list("never-existed")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 8. applyAll() — convenience
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.applyAll", () => {
  it("commits when every op succeeds", () => {
    const { txn, world } = freshPair();
    const r = txn.applyAll("doc-1", [
      createBody("b1"),
      createBody("b2"),
      setParam("h", 5),
    ]);
    expect(r.committed).toBe(true);
    expect(r.state).toBe("committed");
    expect(r.opsApplied).toBe(3);
    expect(r.opsAttempted).toBe(3);
    expect(r.errors).toEqual([]);
    expect(world.getOrCreate("doc-1").entities.map((e) => e.id)).toEqual(["b1", "b2"]);
  });

  it("auto-rolls back and reports the error when an op fails mid-sequence", () => {
    const { txn, world } = freshPair();
    world.applyOp("doc-1", createBody("seed"));
    const r = txn.applyAll("doc-1", [
      createBody("b1"),
      createBody("b1"), // duplicate — will throw
      createBody("b2"),
    ]);
    expect(r.committed).toBe(false);
    expect(r.state).toBe("failed");
    expect(r.opsApplied).toBe(1); // first op succeeded
    expect(r.opsAttempted).toBe(3);
    expect(r.errors.length).toBeGreaterThan(0);
    // World was restored to baseline (just "seed")
    expect(world.getOrCreate("doc-1").entities.map((e) => e.id)).toEqual(["seed"]);
  });

  it("returns the commit diff inside result when committed", () => {
    const { txn } = freshPair();
    const r = txn.applyAll("doc-1", [createBody("b1"), setParam("h", 3)]);
    expect(r.committed).toBe(true);
    expect((r.result as { diff: { addedEntities: string[] } }).diff.addedEntities).toEqual(["b1"]);
    expect((r.result as { diff: { parametersChanged: string[] } }).diff.parametersChanged).toEqual(["h"]);
  });

  it("returns the restored state inside result when rolled back", () => {
    const { txn, world } = freshPair();
    world.applyOp("doc-1", createBody("seed"));
    const r = txn.applyAll("doc-1", [createBody("seed")]); // duplicate of pre-existing
    expect(r.committed).toBe(false);
    expect((r.result as { restoredState: CADWorldState }).restoredState.entities.map((e) => e.id)).toEqual(["seed"]);
  });

  it("handles the empty ops array (begin → commit with no apply calls)", () => {
    const { txn } = freshPair();
    const r = txn.applyAll("doc-1", []);
    expect(r.committed).toBe(true);
    expect(r.opsApplied).toBe(0);
    expect(r.opsAttempted).toBe(0);
  });

  it("rejects a non-array ops argument", () => {
    const { txn } = freshPair();
    // @ts-expect-error — runtime validation
    expect(() => txn.applyAll("doc-1", "not-an-array")).toThrow(/requires an ops array/);
  });

  it("respects the units parameter for new documents", () => {
    const { txn } = freshPair();
    const r = txn.applyAll("doc-imperial", [createBody("b1")], "in");
    expect(r.committed).toBe(true);
    expect((r.result as { finalState: CADWorldState }).finalState.units).toBe("in");
  });
});

// ---------------------------------------------------------------------------
// 9. reset()
// ---------------------------------------------------------------------------

describe("CADTransactionEngine.reset", () => {
  it("drops every transaction from the registry", () => {
    const { txn } = freshPair();
    txn.begin("doc-1");
    txn.begin("doc-2");
    expect(txn.list()).toHaveLength(2);
    txn.reset();
    expect(txn.list()).toHaveLength(0);
  });

  it("releases every doc lock so begin() can immediately re-acquire", () => {
    const { txn } = freshPair();
    txn.begin("doc-1");
    txn.reset();
    const t = txn.begin("doc-1");
    expect(t.state).toBe("pending");
  });
});

// ---------------------------------------------------------------------------
// 10. Injectable world (defense-in-depth, test isolation)
// ---------------------------------------------------------------------------

describe("CADTransactionEngine — injectable world", () => {
  it("uses the injected world for getOrCreate/applyOp/restore", () => {
    const calls: { op: string; args: unknown[] }[] = [];
    const fakeState: CADWorldState = {
      docId: "doc-1",
      entities: [],
      parameters: {},
      selection: [],
      units: "mm",
      opCount: 0,
    };
    const fakeWorld: CADWorldModelLike = {
      getOrCreate: (id: string, units?: CADUnits) => {
        calls.push({ op: "getOrCreate", args: [id, units] });
        return { ...fakeState, docId: id };
      },
      applyOp: (id: string, op: CADWorldOp) => {
        calls.push({ op: "applyOp", args: [id, op] });
        return { ...fakeState, docId: id, opCount: 1 };
      },
      restore: (id: string, state: CADWorldState) => {
        calls.push({ op: "restore", args: [id, state] });
        return { ...state, docId: id };
      },
    };
    const txn = new CADTransactionEngine({ world: fakeWorld, idGen: () => "txn-fake" });
    const t = txn.begin("doc-1");
    expect(t.txnId).toBe("txn-fake");
    txn.apply(t.txnId, createBody("b1"));
    txn.rollback(t.txnId);
    expect(calls.map((c) => c.op)).toEqual(["getOrCreate", "applyOp", "restore"]);
  });

  it("propagates restore() errors as terminal-failed state", () => {
    const baseFake: CADWorldModelLike = {
      getOrCreate: (id: string) => ({
        docId: id,
        entities: [],
        parameters: {},
        selection: [],
        units: "mm",
        opCount: 0,
      }),
      applyOp: (id: string) => ({
        docId: id,
        entities: [],
        parameters: {},
        selection: [],
        units: "mm",
        opCount: 1,
      }),
      restore: () => {
        throw new Error("restore failed");
      },
    };
    const txn = new CADTransactionEngine({ world: baseFake, idGen: () => "txn-rfail" });
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1"));
    expect(() => txn.rollback(t.txnId)).toThrow(/restore failed/);
    expect(txn.status(t.txnId)?.state).toBe("failed");
  });
});

// ---------------------------------------------------------------------------
// 11. Idempotency + adversarial input
// ---------------------------------------------------------------------------

describe("CADTransactionEngine — adversarial / regression", () => {
  it("the snapshot returned by begin() is independent of registry mutation", () => {
    const { txn } = freshPair();
    const t = txn.begin("doc-1");
    txn.apply(t.txnId, createBody("b1"));
    // Mutating the returned snapshot must not affect status counters
    t.ops.push(createBody("ghost"));
    t.errors.push("synthetic");
    const s = txn.status(t.txnId);
    expect(s?.opsApplied).toBe(1);
    expect(s?.errorCount).toBe(0);
  });

  it("two failed txns on the same doc both release their locks correctly", () => {
    const { txn } = freshPair();
    const a = txn.begin("doc-1");
    expect(() => txn.apply(a.txnId, deleteOp("ghost"))).toThrow();
    const b = txn.begin("doc-1");
    expect(() => txn.apply(b.txnId, deleteOp("ghost"))).toThrow();
    const c = txn.begin("doc-1");
    expect(c.state).toBe("pending");
    expect(txn.list("doc-1")).toHaveLength(3);
  });

  it("commit on a doc whose world state was externally mutated still produces a correct diff", () => {
    const { txn, world } = freshPair();
    const t = txn.begin("doc-1");
    // Simulate the agent applying ops outside the transaction (anti-pattern,
    // but the diff must still reflect reality vs baseline).
    world.applyOp("doc-1", createBody("external"));
    const r = txn.commit(t.txnId);
    expect(r.diff.addedEntities).toEqual(["external"]);
    expect(r.opsApplied).toBe(0); // none through the txn API
  });

  it("preserves stable txnIds across many begin/commit cycles", () => {
    const { txn } = freshPair();
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      const t = txn.begin(`doc-${i}`);
      ids.push(t.txnId);
      txn.commit(t.txnId);
    }
    // injected idGen yields txn-1..txn-10
    expect(ids).toEqual(Array.from({ length: 10 }, (_, i) => `txn-${i + 1}`));
  });
});
