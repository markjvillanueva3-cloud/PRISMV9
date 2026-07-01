/**
 * nn-graph-retrain-lifecycle.test.mjs — NN-GRAPH-MS2 / U2-SELF-RETRAIN-LIFECYCLE
 *
 * Reference-valued node:test suite for the GNN self-retrain lifecycle. The pure
 * decision functions (graphFingerprint / driftDecision / promoteDecision) are
 * tested against concrete expected values; runLifecycle is exercised end-to-end
 * with injected dependencies covering happy path + failure modes + adversarial
 * inputs. One REAL-WIRING test drives the actual runAssessment() to prove the
 * checkpoint-path contract the injected fakes assume ("hermetic fakes don't
 * prove production wiring" — RGS-TOOL-AUTOINVOKE-MS1 / FLEET-REAPER-TIER2
 * lesson class).
 *
 * Run: node --max-old-space-size=8192 --test scripts/__tests__/nn-graph-retrain-lifecycle.test.mjs
 *   (the heap flag is REQUIRED: one real-wiring test drives runAssessment(), which loads the
 *    live ~550MB system graph in-process and OOMs under node's default heap — the same class of
 *    OOM the lifecycle's own self-reexec heap guard fixes.)
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  graphFingerprint,
  driftDecision,
  promoteDecision,
  runLifecycle,
  parseArgs,
  main,
  renderResult,
  formatDeployedStatus,
  shouldReexecForHeap,
  hasHeapFlag,
  nodeArgsWithHeap,
  classifyTrainResult,
  LIFECYCLE_DEFAULTS,
} from "../nn-graph-retrain-lifecycle.mjs";
import { runAssessment } from "../lib/nn-graph-eval.mjs";

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/** Build a fully-injected runLifecycle opts bundle + a call recorder. */
function harness(over = {}) {
  const calls = {
    lockAcquired: 0,
    released: 0,
    trainArgs: [],
    evalArgs: [],
    promoteArgs: [],
    writeBaseline: [],
    ledger: [],
    refreshWorklist: 0,
  };
  const opts = {
    env: {},
    now: "2026-05-17T12:00:00.000Z",
    acquireLock: () => {
      calls.lockAcquired++;
      return { ok: true };
    },
    releaseLock: () => {
      calls.released++;
    },
    readGraph: () => ({
      nodes: [{ kind: "ghost.unwired-engine", label: "X" }],
      edges: [["a", "b"]],
    }),
    readBaseline: () => null, // no baseline -> drift gate always retrains
    writeBaseline: (o) => calls.writeBaseline.push(o),
    trainFn: (a) => {
      calls.trainArgs.push(a);
      return { ok: true, code: 0 };
    },
    evalFn: (a) => {
      calls.evalArgs.push(a);
      return {
        deferred: false,
        grade: { pass: true, verdict: "deploy-ready", failures: [] },
        metrics: { auroc: 0.81, macroF1: 0.6, brier: 0.1, accuracy: 0.8 },
        holdoutN: 12,
      };
    },
    promoteCheckpoint: (a) => calls.promoteArgs.push(a),
    // Stub the active-learning worklist refresh so tests never spawn the real
    // gnn-active-pool-select subprocess over the 713MB graph (keeps the suite pure/fast).
    refreshWorklistImpl: () => {
      calls.refreshWorklist++;
      return { ok: true, stubbed: true };
    },
    appendLedger: (r) => calls.ledger.push(r),
    // Default no-op stubs for the two pre-fingerprint ref-pool apply stages (1a vault,
    // 1b outcome) so a runLifecycle test NEVER spawns the real --apply subprocess (542MB
    // graph read+write -- a hermeticity regression once stage 1a/1b shipped). The
    // stage-specific tests override these via `over` (spread last -> their fn wins).
    applyVaultRefpool: () => ({ status: 0, summary: "stub" }),
    applyOutcomeRefpool: () => ({ status: 0, summary: "stub" }),
    // Stage 4b (ghost-embedding refresh + direct-embed assessment) -- stub both so
    // runLifecycle tests never spawn build-node-embeddings or load the graph via a real
    // direct-embed runAssessment; stage-specific tests override via `over` (spread last).
    refreshGhostEmbeddings: () => ({ status: 0, summary: "stub" }),
    directEvalFn: () => ({ deferred: false, grade: { pass: false, verdict: "shipped-research-only", failures: [] }, metrics: { auroc: 0.79, macroF1: 0.41, brier: 0.19, accuracy: 0.62 }, selective: { deployGrade: { pass: true, verdict: "deploy-ready-selective" }, deployPoint: { robustAboveGate: true, productionMinConf: 0.7 } }, holdoutN: 84 }),
    // Stub the NN-EVAL writer so stage 4b never writes the real state/shared/nn-graph/NN-EVAL.{md,json} during tests.
    writeAssessmentFn: () => ({ ok: true, outDir: "stub" }),
    ...over,
  };
  return { opts, calls };
}

/** ISO timestamp `hours` before the harness reference `now`. */
function hoursBefore(hours) {
  return new Date(Date.parse("2026-05-17T12:00:00.000Z") - hours * 3.6e6).toISOString();
}

/* ------------------------------------------------------------------ *
 * graphFingerprint
 * ------------------------------------------------------------------ */

test("graphFingerprint — counts nodes, edges, and exact ghost kinds", () => {
  const fp = graphFingerprint({
    nodes: [
      { kind: "ghost.unwired-engine", label: "A" },
      { kind: "ghost.unwired-engine", label: "B" },
      { kind: "engine", label: "C" },
      { kind: "wiki_entry" },
    ],
    edges: [["a", "b"], ["b", "c"], ["c", "d"]],
  });
  assert.deepEqual(fp, { nodeCount: 4, edgeCount: 3, ghostCount: 2 });
});

test("graphFingerprint — null graph yields all-zero counts (no throw)", () => {
  assert.deepEqual(graphFingerprint(null), { nodeCount: 0, edgeCount: 0, ghostCount: 0 });
});

test("graphFingerprint — empty object yields zeros", () => {
  assert.deepEqual(graphFingerprint({}), { nodeCount: 0, edgeCount: 0, ghostCount: 0 });
});

test("graphFingerprint — non-array nodes/edges degrade to zeros", () => {
  assert.deepEqual(
    graphFingerprint({ nodes: "not-an-array", edges: 42 }),
    { nodeCount: 0, edgeCount: 0, ghostCount: 0 },
  );
});

test("graphFingerprint — null entries inside the nodes array are skipped", () => {
  const fp = graphFingerprint({
    nodes: [null, { kind: "ghost.unwired-engine" }, undefined, 7],
    edges: [],
  });
  assert.equal(fp.nodeCount, 4);
  assert.equal(fp.ghostCount, 1); // only the one well-formed ghost node
});

test("graphFingerprint — ghost kind must match exactly (no substring/number match)", () => {
  const fp = graphFingerprint({
    nodes: [
      { kind: "ghost.unwired-engine" }, // counts
      { kind: "ghost" }, // does NOT
      { kind: "ghost.unwired-engine-extra" }, // does NOT
      { kind: 1 }, // does NOT
    ],
    edges: [],
  });
  assert.equal(fp.ghostCount, 1);
});

/* ------------------------------------------------------------------ *
 * driftDecision
 * ------------------------------------------------------------------ */

test("driftDecision — force always retrains, even with a matching baseline", () => {
  const d = driftDecision({
    force: true,
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 5 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(1) },
  });
  assert.equal(d.retrain, true);
  assert.match(d.reason, /forc/i);
});

test("driftDecision — no baseline triggers a first-run retrain", () => {
  const d = driftDecision({ current: { nodeCount: 10, edgeCount: 10, ghostCount: 1 } });
  assert.equal(d.retrain, true);
  assert.match(d.reason, /no baseline|first/i);
});

test("driftDecision — stable graph + fresh baseline => skip", () => {
  const d = driftDecision({
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 5 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(1) },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(d.retrain, false);
  assert.match(d.reason, /no significant drift/i);
});

test("driftDecision — node-count drift past the band retrains", () => {
  const d = driftDecision({
    current: { nodeCount: 130, edgeCount: 50, ghostCount: 5 }, // +30%
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(1) },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(d.retrain, true);
  assert.match(d.reason, /graph drift/i);
});

test("driftDecision — edge-count drift past the band retrains", () => {
  const d = driftDecision({
    current: { nodeCount: 100, edgeCount: 70, ghostCount: 5 }, // edges +40%
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(1) },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(d.retrain, true);
  assert.match(d.reason, /graph drift/i);
});

test("driftDecision — ghost-pool drift retrains even when nodes/edges are stable", () => {
  const d = driftDecision({
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 12 }, // ghosts 5 -> 12 = +140%
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(1) },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(d.retrain, true);
  assert.match(d.reason, /reference-pool drift/i);
});

test("driftDecision — node delta exactly at the band is inclusive (retrains)", () => {
  const d = driftDecision({
    current: { nodeCount: 110, edgeCount: 50, ghostCount: 5 }, // exactly +10%
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(1) },
    cfg: { minNodeDeltaPct: 10 },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(d.retrain, true);
});

test("driftDecision — baseline older than the age floor retrains", () => {
  const d = driftDecision({
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 5 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(200) },
    cfg: { maxAgeHours: 168 },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(d.retrain, true);
  assert.match(d.reason, /stale|age/i);
});

test("driftDecision — baseline younger than the age floor skips", () => {
  const d = driftDecision({
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 5 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(10) },
    cfg: { maxAgeHours: 168 },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(d.retrain, false);
});

test("driftDecision — non-finite current count retrains defensively", () => {
  const d = driftDecision({
    current: { nodeCount: NaN, edgeCount: 50, ghostCount: 5 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 }, recordedAt: hoursBefore(1) },
  });
  assert.equal(d.retrain, true);
  assert.match(d.reason, /unreadable/i);
});

test("driftDecision — zero-baseline count: 0->0 no trigger, 0->N triggers", () => {
  // ghost 0 -> 0 (and node/edge stable) => no drift => skip
  const stable = driftDecision({
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 0 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 0 }, recordedAt: hoursBefore(1) },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(stable.retrain, false);
  // ghost 0 -> 7: an infinite delta must trigger (no division-by-zero NaN)
  const grew = driftDecision({
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 7 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 0 }, recordedAt: hoursBefore(1) },
    now: "2026-05-17T12:00:00.000Z",
  });
  assert.equal(grew.retrain, true);
  assert.match(grew.reason, /reference-pool drift/i);
});

test("driftDecision — baseline with no parseable recordedAt skips on counts alone (no crash)", () => {
  const d = driftDecision({
    current: { nodeCount: 100, edgeCount: 50, ghostCount: 5 },
    baseline: { fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 5 } }, // no recordedAt
  });
  assert.equal(d.retrain, false);
  assert.match(d.reason, /no significant drift/i);
});

/* ------------------------------------------------------------------ *
 * promoteDecision — THE SAFETY INVARIANT
 * ------------------------------------------------------------------ */

test("promoteDecision — graded + pass:true promotes", () => {
  const p = promoteDecision({
    assessment: { deferred: false, grade: { pass: true, verdict: "deploy-ready" } },
  });
  assert.equal(p.promote, true);
});

test("promoteDecision — sub-gate (pass:false) is NEVER promoted", () => {
  const p = promoteDecision({
    assessment: { deferred: false, grade: { pass: false, failures: ["AUROC 0.0961 < 0.78"] } },
  });
  assert.equal(p.promote, false);
  assert.match(p.reason, /sub-gate|gate not cleared/i);
});

test("promoteDecision — a deferred (un-graded) candidate is NEVER promoted", () => {
  const p = promoteDecision({
    assessment: { deferred: true, reason: "insufficient-reference-pool" },
  });
  assert.equal(p.promote, false);
  assert.match(p.reason, /deferred|not graded/i);
});

test("promoteDecision — null assessment => promote:false", () => {
  assert.equal(promoteDecision({ assessment: null }).promote, false);
  assert.equal(promoteDecision({}).promote, false);
});

test("promoteDecision — graded but missing grade object => promote:false", () => {
  assert.equal(promoteDecision({ assessment: { deferred: false } }).promote, false);
});

test("promoteDecision — strict: deferred must be the boolean false, not the string", () => {
  const p = promoteDecision({
    assessment: { deferred: "false", grade: { pass: true } },
  });
  assert.equal(p.promote, false); // "false" !== false
});

test("promoteDecision — strict: grade.pass must be the boolean true, not the string", () => {
  const p = promoteDecision({
    assessment: { deferred: false, grade: { pass: "true" } },
  });
  assert.equal(p.promote, false); // "true" !== true
});

/* ------------------------------------------------------------------ *
 * runLifecycle — end to end
 * ------------------------------------------------------------------ */

test("runLifecycle — happy path: trains, evaluates, promotes a passing candidate", () => {
  const { opts, calls } = harness();
  const r = runLifecycle(opts);
  assert.equal(r.action, "promoted");
  assert.equal(r.promoted, true);
  assert.equal(r.ok, true);
  assert.equal(calls.promoteArgs.length, 1);
  assert.equal(calls.writeBaseline.length, 1); // baseline advanced
  assert.equal(calls.ledger.length, 1); // one ledger row
  assert.equal(calls.released, 1); // lock released
  assert.equal(calls.refreshWorklist, 0); // worklist refresh is gated OUT on a promoted candidate
});

test("runLifecycle — passes the CANDIDATE (not live) checkpoint path to train + eval", () => {
  const { opts, calls } = harness();
  runLifecycle(opts);
  assert.match(calls.trainArgs[0].candidatePath, /graphsage-checkpoint\.candidate\.json$/);
  assert.match(calls.trainArgs[0].graphPath, /system-graph\.json$/);
  assert.match(calls.evalArgs[0].checkpointPath, /graphsage-checkpoint\.candidate\.json$/);
  // promote swaps candidate -> live, preserving the prior live as .prev
  assert.match(calls.promoteArgs[0].candidatePath, /\.candidate\.json$/);
  assert.match(calls.promoteArgs[0].livePath, /graphsage-checkpoint\.json$/);
  assert.match(calls.promoteArgs[0].prevPath, /\.prev\.json$/);
});

test("runLifecycle — a sub-gate candidate is trained but NOT promoted", () => {
  const { opts, calls } = harness({
    evalFn: () => ({ deferred: false, grade: { pass: false, failures: ["AUROC 0.0961 < 0.78"] } }),
    promoteCheckpoint: () => {
      throw new Error("promoteCheckpoint must NOT be called for a sub-gate candidate");
    },
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "not-promoted");
  assert.equal(r.promoted, false);
  assert.equal(r.ok, true); // a correct no-promote is not an operational failure
  assert.equal(calls.writeBaseline.length, 1); // baseline still advances (deterministic trainer)
  assert.equal(calls.released, 1);
  // active-learning loop closure fires on a not-promoted (label-starved) candidate
  assert.equal(calls.refreshWorklist, 1);
  assert.deepEqual(r.activeWorklist, { ok: true, stubbed: true });
});

test("runLifecycle — a deferred candidate is NOT promoted", () => {
  const { opts } = harness({
    evalFn: () => ({ deferred: true, reason: "insufficient-reference-pool", poolSize: 0 }),
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "not-promoted");
  assert.equal(r.promoted, false);
  assert.match(r.promote.reason, /deferred/i);
});

test("runLifecycle — no drift => skip (no train, no eval, no baseline write)", () => {
  const { opts, calls } = harness({
    readBaseline: () => ({
      fingerprint: { nodeCount: 1, edgeCount: 1, ghostCount: 1 }, // matches the harness graph
      recordedAt: hoursBefore(2),
    }),
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "skip");
  assert.equal(calls.trainArgs.length, 0);
  assert.equal(calls.evalArgs.length, 0);
  assert.equal(calls.writeBaseline.length, 0);
  assert.equal(calls.ledger.length, 1); // a skip is still ledgered
  assert.equal(calls.released, 1);
});

test("runLifecycle — training failure: no eval, baseline NOT advanced, ok:false", () => {
  const { opts, calls } = harness({
    trainFn: () => ({ ok: false, code: 1, error: "trainer exited 1" }),
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "train-failed");
  assert.equal(r.ok, false);
  assert.equal(calls.evalArgs.length, 0);
  assert.equal(calls.writeBaseline.length, 0); // baseline must NOT advance — retry next run
  assert.equal(calls.released, 1);
  assert.ok(r.errors.some((e) => /training failed/i.test(e)));
});

test("runLifecycle — evaluation throwing is caught; baseline IS advanced (we trained)", () => {
  const { opts, calls } = harness({
    evalFn: () => {
      throw new Error("eval blew up");
    },
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "eval-failed");
  assert.equal(r.ok, false);
  assert.equal(calls.writeBaseline.length, 1); // a candidate WAS produced
  assert.equal(calls.released, 1);
});

test("runLifecycle — promote failure surfaces ok:false (lock still released)", () => {
  const { opts, calls } = harness({
    promoteCheckpoint: () => {
      throw new Error("disk full");
    },
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "promote-failed");
  assert.equal(r.ok, false);
  assert.equal(r.promoted, false);
  assert.equal(calls.released, 1);
  assert.ok(r.errors.some((e) => /promote/i.test(e)));
});

test("runLifecycle — kill switch: PRISM_NN_RETRAIN_DISABLE=1 does nothing", () => {
  const { opts, calls } = harness({ env: { PRISM_NN_RETRAIN_DISABLE: "1" } });
  const r = runLifecycle(opts);
  assert.equal(r.action, "disabled");
  assert.equal(calls.lockAcquired, 0); // no lock acquired -> nothing to release
  assert.equal(calls.released, 0);
  assert.equal(calls.trainArgs.length, 0);
  assert.equal(calls.ledger.length, 0);
});

test("runLifecycle — a held lock yields action:locked, ok:true, body skipped", () => {
  const { opts, calls } = harness({
    acquireLock: () => ({ ok: false, heldByPid: 4242 }),
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "locked");
  assert.equal(r.ok, true); // a peer owning the cycle is not a failure
  assert.equal(calls.released, 0); // we never held the lock
  assert.equal(calls.trainArgs.length, 0);
  assert.ok(r.errors.some((e) => /4242/.test(e)));
});

test("runLifecycle — graph read failure is caught (action:error, lock released)", () => {
  const { opts, calls } = harness({
    readGraph: () => {
      throw new Error("system-graph.json missing");
    },
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "error");
  assert.equal(r.ok, false);
  assert.equal(calls.released, 1);
});

test("runLifecycle — dry-run trains+evals but never promotes nor moves the baseline", () => {
  const { opts, calls } = harness({ dryRun: true });
  const r = runLifecycle(opts);
  assert.equal(r.action, "dry-run-would-promote");
  assert.equal(r.promoted, false);
  assert.equal(calls.promoteArgs.length, 0); // no checkpoint swap
  assert.equal(calls.writeBaseline.length, 0); // dry-run must not mutate lifecycle state
  assert.equal(calls.trainArgs.length, 1); // it DID train (so the operator can inspect)
  assert.equal(calls.evalArgs.length, 1);
});

test("runLifecycle — appendLedger throwing does not abort the run (advisory)", () => {
  const { opts } = harness({
    appendLedger: () => {
      throw new Error("ledger disk error");
    },
  });
  const r = runLifecycle(opts);
  assert.equal(r.action, "promoted"); // the mission still completed
  assert.equal(r.promoted, true);
  assert.ok(r.errors.some((e) => /ledger/i.test(e)));
});

test("runLifecycle — env knobs override the drift bands", () => {
  // baseline 100 nodes; graph 108 nodes => +8% node drift. Ghost/edge stable.
  const graph = { nodes: Array.from({ length: 108 }, () => ({})), edges: Array.from({ length: 50 }, () => []) };
  const baseline = {
    fingerprint: { nodeCount: 100, edgeCount: 50, ghostCount: 0 },
    recordedAt: hoursBefore(2),
  };
  // band 5% -> 8% drift retrains
  const tight = runLifecycle(harness({
    env: { PRISM_NN_RETRAIN_MIN_NODE_DELTA_PCT: "5" },
    readGraph: () => graph,
    readBaseline: () => baseline,
  }).opts);
  assert.equal(tight.action, "promoted");
  // band 50% -> 8% drift is under -> skip
  const loose = runLifecycle(harness({
    env: { PRISM_NN_RETRAIN_MIN_NODE_DELTA_PCT: "50" },
    readGraph: () => graph,
    readBaseline: () => baseline,
  }).opts);
  assert.equal(loose.action, "skip");
});

test("runLifecycle — never throws even when every injected dependency throws", () => {
  const explode = () => {
    throw new Error("boom");
  };
  const r = runLifecycle({
    env: {},
    acquireLock: () => ({ ok: true }),
    releaseLock: explode,
    readGraph: explode,
    readBaseline: explode,
    appendLedger: explode,
  });
  assert.equal(r.ok, false);
  assert.equal(r.action, "error");
  assert.ok(Array.isArray(r.errors) && r.errors.length > 0);
});

/* ------------------------------------------------------------------ *
 * REAL-WIRING — drive the actual runAssessment(), not a fake
 * ------------------------------------------------------------------ */

test("real-wiring — runAssessment reads exactly the checkpoint path it is given", () => {
  // The lifecycle's defaultEval calls runAssessment({checkpoint: candidatePath}).
  // If runAssessment ignored opts.checkpoint and read a fixed (live) path, the
  // lifecycle would grade the wrong model. Prove the path flows through by
  // spying the injected file reader — a fail-on-revert oracle for the contract
  // every injected-evalFn test in this file silently assumes.
  const seen = [];
  const spyRead = (p) => {
    seen.push(String(p));
    const err = new Error("ENOENT (spy)");
    err.code = "ENOENT";
    throw err; // checkpoint "not found" -> runAssessment defers, never throws
  };
  const tinyGraph = { nodes: [], edges: [] };

  const a = runAssessment({
    checkpoint: "/spy/path/CANDIDATE-A.json",
    graph: tinyGraph, // injected graph -> no 150MB system-graph load
    readFileImpl: spyRead,
  });
  assert.equal(a.deferred, true); // missing checkpoint defers, not throws
  assert.ok(
    seen.some((p) => p.includes("CANDIDATE-A.json")),
    `runAssessment must read the supplied checkpoint path; reader saw: ${seen.join(", ")}`,
  );

  // A different checkpoint path must route to that different path.
  const seen2 = [];
  const spyRead2 = (p) => {
    seen2.push(String(p));
    const err = new Error("ENOENT (spy)");
    err.code = "ENOENT";
    throw err;
  };
  runAssessment({ checkpoint: "/spy/path/CANDIDATE-B.json", graph: tinyGraph, readFileImpl: spyRead2 });
  assert.ok(seen2.some((p) => p.includes("CANDIDATE-B.json")));
  assert.ok(!seen2.some((p) => p.includes("CANDIDATE-A.json"))); // no path bleed-through
});

/* ------------------------------------------------------------------ *
 * parseArgs / main / renderResult
 * ------------------------------------------------------------------ */

test("parseArgs — recognizes every flag", () => {
  assert.deepEqual(parseArgs(["--force"]), { force: true });
  assert.deepEqual(parseArgs(["--dry-run"]), { dryRun: true });
  assert.deepEqual(parseArgs(["--status"]), { status: true });
  assert.deepEqual(parseArgs(["--help"]), { help: true });
  assert.deepEqual(parseArgs(["-h"]), { help: true });
});

test("parseArgs — no args yields an empty options object", () => {
  assert.deepEqual(parseArgs([]), {});
  assert.deepEqual(parseArgs(undefined), {});
});

test("parseArgs — an unknown argument throws", () => {
  assert.throws(() => parseArgs(["--bogus"]), /unknown argument/i);
});

test("main — --help exits 0", () => {
  assert.equal(main(["--help"]), 0);
});

test("main — an unknown argument exits 2", () => {
  assert.equal(main(["--nope"]), 2);
});

test("renderResult — renders a minimal result without throwing, includes the action", () => {
  const out = renderResult({
    action: "skip",
    ok: true,
    fingerprint: { nodeCount: 1, edgeCount: 1, ghostCount: 1 },
    drift: { retrain: false, reason: "no significant drift" },
    errors: [],
  });
  assert.match(out, /action=skip/);
  assert.match(out, /no significant drift/);
});

test("renderResult — surfaces a deferred assessment", () => {
  const out = renderResult({
    action: "not-promoted",
    ok: true,
    assessment: { deferred: true, reason: "insufficient-reference-pool" },
    promote: { promote: false, reason: "candidate not graded" },
    errors: [],
  });
  assert.match(out, /DEFERRED/);
  assert.match(out, /insufficient-reference-pool/);
});

/* ------------------------------------------------------------------ *
 * formatDeployedStatus -- the --status deployed-direct-embed line (U-GNN-STATUS-DEPLOYED-METRIC)
 *
 * --status printed only the trained checkpoint's link-pred PRETEXT AUROC (~0.096), with no deployed
 * direct-embed line -> a reader misreads leg #10 as broken (the wrong-mode footgun). These pin that
 * the deployed line is sourced from NN-EVAL.json and distinguishes mode/deferred/absent.
 * ------------------------------------------------------------------ */
test("formatDeployedStatus -- direct-mode renders the deployed metric + selective verdict (NOT the pretext)", () => {
  const out = formatDeployedStatus({
    embeddingMode: "direct",
    holdoutN: 84,
    metrics: { auroc: 0.7891, macroF1: 0.4101, brier: 0.1887 },
    selective: { deployGrade: { verdict: "deploy-ready-selective", productionGate: 0.7, robustAboveGate: true, operatingPoint: { coverage: 0.2738, brier: 0.0417, macroF1: 1 } } },
  }).join("\n");
  assert.match(out, /Deployed \(direct-embed/);
  assert.match(out, /AUROC 0\.7891/);
  assert.match(out, /deploy-ready-selective/);
  assert.match(out, /coverage 27\.4%/);
  assert.match(out, /robust/);
  assert.doesNotMatch(out, /NOT the deployed/, "direct mode is the deployed path -- no warning");
});

test("formatDeployedStatus -- a model-mode report is flagged NOT the deployed direct-embed path", () => {
  const out = formatDeployedStatus({ embeddingMode: "model", holdoutN: 62, metrics: { auroc: 0.5 } }).join("\n");
  assert.match(out, /embeddingMode=model/);
  assert.match(out, /NOT the deployed direct-embed path/);
});

test("formatDeployedStatus -- deferred + absent are surfaced honestly (R12)", () => {
  assert.match(formatDeployedStatus({ deferred: true, reason: "insufficient-reference-pool" }).join("\n"), /DEFERRED -- insufficient-reference-pool/);
  assert.match(formatDeployedStatus(null).join("\n"), /no NN-EVAL\.json/);
});

/* ------------------------------------------------------------------ *
 * classifyTrainResult — silent-trainer-failure guard (R12, 2026-06-11)
 *
 * A trainer that exits 0 but writes NO fresh checkpoint is a SILENT FAILURE
 * (the H2GCN native-OOM: hops=3 dies exit-0 / no-output / no-checkpoint at the
 * default node cap). These pin that a clean exit without a checkpoint is NOT ok.
 * ------------------------------------------------------------------ */
test("classifyTrainResult — exit 0 WITH a fresh checkpoint is success", () => {
  assert.deepEqual(classifyTrainResult({ status: 0, signal: null, error: undefined, wroteCheckpoint: true }), { ok: true, code: 0 });
});

test("classifyTrainResult — exit 0 with NO checkpoint is a SILENT FAILURE (the H2GCN OOM)", () => {
  const r = classifyTrainResult({ status: 0, signal: null, error: undefined, wroteCheckpoint: false });
  assert.equal(r.ok, false);
  assert.equal(r.code, 0);
  assert.match(r.error, /no fresh candidate checkpoint/);
  assert.match(r.error, /max-nodes|heterophily/); // actionable hint
});

test("classifyTrainResult — spawn error and signal both fail (no checkpoint check needed)", () => {
  assert.deepEqual(classifyTrainResult({ status: null, signal: null, error: "ENOENT node", wroteCheckpoint: false }), { ok: false, code: null, error: "ENOENT node" });
  const sig = classifyTrainResult({ status: null, signal: "SIGKILL", error: undefined, wroteCheckpoint: false });
  assert.equal(sig.ok, false);
  assert.match(sig.error, /SIGKILL/);
});

test("classifyTrainResult — non-zero exit is a failure even if a (stale) checkpoint exists", () => {
  assert.equal(classifyTrainResult({ status: 1, signal: null, error: undefined, wroteCheckpoint: true }).ok, false);
});

test("LIFECYCLE_DEFAULTS — exposes the documented tuning knobs and is frozen", () => {
  assert.equal(Object.isFrozen(LIFECYCLE_DEFAULTS), true);
  assert.equal(LIFECYCLE_DEFAULTS.nodeTypeField, "layer");
  assert.equal(LIFECYCLE_DEFAULTS.negPHard, 0.7);
  assert.ok(LIFECYCLE_DEFAULTS.maxAgeHours > 0);
});

/* ------------------------------------------------------------------ *
 * shouldReexecForHeap — heap-OOM guard (regression 2026-06-11)
 *
 * The lifecycle runs the eval + base-embedding builds IN-PROCESS (each loads the
 * ~550MB graph) but only the spawned trainer got a heap bump, so an ad-hoc
 * `node ...lifecycle --force` OOM'd at the default ceiling. The fix re-execs once
 * with --max-old-space-size; these pin the decision so a refactor can't silently
 * (a) stop bumping graph-loading runs or (b) re-enter an infinite re-exec loop.
 * ------------------------------------------------------------------ */

test("shouldReexecForHeap — a default --force run re-execs with a heap bump", () => {
  assert.equal(shouldReexecForHeap(["--force"], {}), true);
  assert.equal(shouldReexecForHeap([], {}), true); // bare poll loads the graph too
});

test("shouldReexecForHeap — the bumped child does NOT re-exec (no infinite loop)", () => {
  assert.equal(shouldReexecForHeap(["--force"], { PRISM_NN_RETRAIN_REEXEC: "1" }), false);
});

test("shouldReexecForHeap — operator opt-out is honored", () => {
  assert.equal(shouldReexecForHeap(["--force"], { PRISM_NN_RETRAIN_NO_REEXEC: "1" }), false);
});

test("shouldReexecForHeap — cheap modes skip the re-exec (no graph load)", () => {
  assert.equal(shouldReexecForHeap(["--status"], {}), false);
  assert.equal(shouldReexecForHeap(["--help"], {}), false);
  assert.equal(shouldReexecForHeap(["-h"], {}), false);
  assert.equal(shouldReexecForHeap(["--status", "--force"], {}), false); // status wins
});

test("shouldReexecForHeap — tolerates non-array argv defensively", () => {
  assert.equal(shouldReexecForHeap(undefined, {}), true);
  assert.equal(shouldReexecForHeap(null, {}), true);
});

test("shouldReexecForHeap — skips re-exec when node was already launched with a heap flag", () => {
  // The scheduled task launches node WITH --max-old-space-size; re-execing would add a
  // redundant intermediate process (scrutiny arm-A P2 / arm-C P1). execArgv carries it.
  assert.equal(shouldReexecForHeap(["--force"], {}, ["--max-old-space-size=8192"]), false);
  assert.equal(shouldReexecForHeap(["--force"], {}, []), true); // no flag -> still re-exec
  assert.equal(shouldReexecForHeap(["--force"], {}), true); // execArgv defaults to []
});

test("hasHeapFlag — detects an existing --max-old-space-size in execArgv", () => {
  assert.equal(hasHeapFlag(["--max-old-space-size=8192"]), true);
  assert.equal(hasHeapFlag(["--max-old-space-size"]), true); // bare form (paired-value style)
  assert.equal(hasHeapFlag(["--enable-source-maps"]), false);
  assert.equal(hasHeapFlag([]), false);
  assert.equal(hasHeapFlag(undefined), false); // defensive
});

test("nodeArgsWithHeap — flag precedes the script path (node consumes V8 flags first)", () => {
  // Regression-lock for BOTH heavy spawn sites: a refactor that drops the flag or mis-orders it
  // re-introduces the OOM. The flag MUST be argv[0] and the script argv[1] (scrutiny arm-B P1a).
  assert.deepEqual(nodeArgsWithHeap("/x/y.mjs", 8192, ["--force"]), [
    "--max-old-space-size=8192",
    "/x/y.mjs",
    "--force",
  ]);
  assert.deepEqual(nodeArgsWithHeap("/x/y.mjs", 4096), ["--max-old-space-size=4096", "/x/y.mjs"]);
  // never lets a non-array scriptArgs blow up
  assert.deepEqual(nodeArgsWithHeap("/x/y.mjs", 8192, null), ["--max-old-space-size=8192", "/x/y.mjs"]);
});

/* ------------------------------------------------------------------ *
 * promoteDecision -- SELECTIVE-DEPLOY promotion path (opt-in, AI-SYSTEMS)
 * The live tier-5 runs an ancient 0.096 8-dim checkpoint; a robustly deploy-
 * ready-selective candidate is strictly better (consumer abstains below minConf).
 * ------------------------------------------------------------------ */

// A candidate that FAILS the full-coverage gate but is robustly deploy-ready-selective.
function selectiveReadyAssessment(over = {}) {
  return {
    deferred: false,
    grade: { pass: false, failures: ["macroF1 0.439 < 0.55 (full-coverage)"] },
    selective: {
      deployGrade: { pass: true, verdict: "deploy-ready-selective" },
      deployPoint: { robustAboveGate: true, productionMinConf: 0.7 },
    },
    ...over,
  };
}

test("promoteDecision -- selective-ready + allowSelective promotes (mode:selective)", () => {
  const p = promoteDecision({ assessment: selectiveReadyAssessment(), allowSelective: true });
  assert.equal(p.promote, true);
  assert.equal(p.mode, "selective");
  assert.match(p.reason, /selective-deploy promotion/i);
});

test("promoteDecision -- selective-ready WITHOUT allowSelective is NOT promoted (no auto-flip, default safety)", () => {
  const p = promoteDecision({ assessment: selectiveReadyAssessment() }); // allowSelective defaults falsy
  assert.equal(p.promote, false);
  assert.match(p.reason, /gate not cleared/i);
});

test("promoteDecision -- selective pass but NOT robustAboveGate is NOT promoted (a lone tau spike is rejected)", () => {
  const a = selectiveReadyAssessment({
    selective: { deployGrade: { pass: true, verdict: "deploy-ready-selective" }, deployPoint: { robustAboveGate: false, productionMinConf: 0.7 } },
  });
  const p = promoteDecision({ assessment: a, allowSelective: true });
  assert.equal(p.promote, false);
  assert.match(p.reason, /selective path also not robust/i);
});

test("promoteDecision -- selective deployGrade.pass:false + allowSelective is NOT promoted (must clear the selective grade)", () => {
  const a = selectiveReadyAssessment({
    selective: { deployGrade: { pass: false, verdict: "no-deployable-operating-point" }, deployPoint: { robustAboveGate: true, productionMinConf: 0.7 } },
  });
  assert.equal(promoteDecision({ assessment: a, allowSelective: true }).promote, false);
});

test("promoteDecision -- full-coverage pass STILL promotes with mode:full (regression: selective path is additive)", () => {
  const p = promoteDecision({ assessment: { deferred: false, grade: { pass: true, verdict: "deploy-ready" } }, allowSelective: true });
  assert.equal(p.promote, true);
  assert.equal(p.mode, "full");
});

test("promoteDecision -- a deferred candidate is NEVER promoted even with allowSelective (no grade to trust)", () => {
  const p = promoteDecision({ assessment: { deferred: true, reason: "insufficient-reference-pool" }, allowSelective: true });
  assert.equal(p.promote, false);
});

/* ------------------------------------------------------------------ *
 * vaultRefpool durability stage (U-VAULT-REFPOOL-DURABLE, pre-fingerprint)
 * ------------------------------------------------------------------ */

// Stub stage 2b (embedding-source build) so these tests don't load the real
// ~550MB graph -- my stage (1a) runs BEFORE 2b and none of these assertions touch
// it, so skipping it keeps the suite fast without changing what we're verifying.
function vrHarness(over = {}) {
  return harness({ buildEmbeddingSource: () => ({ ok: false, matched: 0 }), ...over });
}

test("vaultRefpool -- runs as a pre-fingerprint stage on a retrain (telemetry on result)", () => {
  let applyCalls = 0;
  const { opts } = vrHarness({ applyVaultRefpool: () => { applyCalls++; return { status: 0, summary: "UP-TO-DATE -- no write" }; } });
  const result = runLifecycle(opts);
  assert.equal(applyCalls, 1, "apply ran once");
  assert.equal(result.vaultRefpool.ran, true);
  assert.equal(result.vaultRefpool.status, 0);
});

test("vaultRefpool -- runs BEFORE the graph fingerprint read (pre-fingerprint ordering is the correctness invariant)", () => {
  const order = [];
  const { opts } = vrHarness({
    applyVaultRefpool: () => { order.push("apply"); return { status: 0 }; },
    readGraph: () => { order.push("readGraph"); return { nodes: [{ kind: "ghost.unwired-engine", label: "X" }], edges: [["a", "b"]] }; },
  });
  runLifecycle(opts);
  assert.deepEqual(order.slice(0, 2), ["apply", "readGraph"], "apply must precede the fingerprint read -- else the restored ghosts trip the NEXT tick's drift gate");
});

test("vaultRefpool -- opt-out via PRISM_NN_RETRAIN_VAULT_REFPOOL_DISABLE (not called)", () => {
  let applyCalls = 0;
  const { opts } = vrHarness({ env: { PRISM_NN_RETRAIN_VAULT_REFPOOL_DISABLE: "1" }, applyVaultRefpool: () => { applyCalls++; return { status: 0 }; } });
  const result = runLifecycle(opts);
  assert.equal(applyCalls, 0, "disabled -> not called");
  assert.equal(result.vaultRefpool.disabled, true);
});

test("vaultRefpool -- fail-soft: a throw is recorded but the retrain still proceeds (never aborts)", () => {
  const { opts, calls } = vrHarness({ applyVaultRefpool: () => { throw new Error("graph locked"); } });
  const result = runLifecycle(opts);
  assert.equal(calls.trainArgs.length, 1, "training still ran despite the apply throw");
  assert.notEqual(result.action, "error");
  assert.ok(result.errors.some((e) => /vault ref-pool apply failed/.test(e)), "the failure is surfaced, not swallowed");
});

test("vaultRefpool -- a non-zero exit is surfaced (R12) but non-fatal", () => {
  const { opts, calls } = vrHarness({ applyVaultRefpool: () => ({ status: 2, stderr: "partial restore" }) });
  const result = runLifecycle(opts);
  assert.equal(result.vaultRefpool.status, 2);
  assert.ok(result.errors.some((e) => /vault ref-pool apply: exit 2/.test(e)));
  assert.equal(calls.trainArgs.length, 1, "training still ran");
});

test("vaultRefpool -- a timeout/spawn-fail (null status) is surfaced to the ledger, not silently missed (R12, scrutiny P2)", () => {
  const { opts, calls } = vrHarness({ applyVaultRefpool: () => ({ status: null, error: "ETIMEDOUT", signal: "SIGTERM" }) });
  const result = runLifecycle(opts);
  assert.equal(result.vaultRefpool.status, null);
  assert.ok(result.errors.some((e) => /vault ref-pool apply: no exit status/.test(e)), "null-status restore-miss must be recorded (errors[] is the only persisted signal)");
  assert.equal(calls.trainArgs.length, 1, "training still ran");
});

/* ------------------------------------------------------------------ *
 * outcomeRefpool durability stage (U-OUTCOME-REFPOOL-DURABLE, pre-fingerprint, 1b)
 * The BIGGER ref pool (~139 confirmed-outcome refs vs ~14 vault). Mirrors the vault
 * stage (1a); stage 1a runs first via its default vrHarness/harness no-op stub.
 * ------------------------------------------------------------------ */

test("outcomeRefpool -- runs as a pre-fingerprint stage on a retrain (telemetry on result)", () => {
  let applyCalls = 0;
  const { opts } = vrHarness({ applyOutcomeRefpool: () => { applyCalls++; return { status: 0, summary: "UP-TO-DATE -- no write" }; } });
  const result = runLifecycle(opts);
  assert.equal(applyCalls, 1, "apply ran once");
  assert.equal(result.outcomeRefpool.ran, true);
  assert.equal(result.outcomeRefpool.status, 0);
});

test("outcomeRefpool -- runs BEFORE the graph fingerprint read (pre-fingerprint ordering invariant)", () => {
  const order = [];
  const { opts } = vrHarness({
    applyOutcomeRefpool: () => { order.push("apply"); return { status: 0 }; },
    readGraph: () => { order.push("readGraph"); return { nodes: [{ kind: "ghost.unwired-engine", label: "X" }], edges: [["a", "b"]] }; },
  });
  runLifecycle(opts);
  assert.deepEqual(order.slice(0, 2), ["apply", "readGraph"], "outcome apply must precede the fingerprint read -- else the restored ghosts trip the NEXT tick's drift gate");
});

test("outcomeRefpool -- vault stage (1a) runs BEFORE outcome stage (1b), both pre-fingerprint", () => {
  const order = [];
  const { opts } = vrHarness({
    applyVaultRefpool: () => { order.push("vault"); return { status: 0 }; },
    applyOutcomeRefpool: () => { order.push("outcome"); return { status: 0 }; },
    readGraph: () => { order.push("readGraph"); return { nodes: [{ kind: "ghost.unwired-engine", label: "X" }], edges: [["a", "b"]] }; },
  });
  runLifecycle(opts);
  assert.deepEqual(order.slice(0, 3), ["vault", "outcome", "readGraph"], "1a vault -> 1b outcome -> fingerprint read");
});

test("outcomeRefpool -- opt-out via PRISM_NN_RETRAIN_OUTCOME_REFPOOL_DISABLE (not called)", () => {
  let applyCalls = 0;
  const { opts } = vrHarness({ env: { PRISM_NN_RETRAIN_OUTCOME_REFPOOL_DISABLE: "1" }, applyOutcomeRefpool: () => { applyCalls++; return { status: 0 }; } });
  const result = runLifecycle(opts);
  assert.equal(applyCalls, 0, "disabled -> not called");
  assert.equal(result.outcomeRefpool.disabled, true);
});

test("outcomeRefpool -- fail-soft: a throw is recorded but the retrain still proceeds (never aborts)", () => {
  const { opts, calls } = vrHarness({ applyOutcomeRefpool: () => { throw new Error("graph locked"); } });
  const result = runLifecycle(opts);
  assert.equal(calls.trainArgs.length, 1, "training still ran despite the apply throw");
  assert.notEqual(result.action, "error");
  assert.ok(result.errors.some((e) => /outcome ref-pool apply failed/.test(e)), "the failure is surfaced, not swallowed");
});

test("outcomeRefpool -- a non-zero exit is surfaced (R12) but non-fatal", () => {
  const { opts, calls } = vrHarness({ applyOutcomeRefpool: () => ({ status: 3, stderr: "partial restore" }) });
  const result = runLifecycle(opts);
  assert.equal(result.outcomeRefpool.status, 3);
  assert.ok(result.errors.some((e) => /outcome ref-pool apply: exit 3/.test(e)));
  assert.equal(calls.trainArgs.length, 1, "training still ran");
});

test("outcomeRefpool -- a timeout/spawn-fail (null status) is surfaced to the ledger, not silently missed (R12)", () => {
  const { opts, calls } = vrHarness({ applyOutcomeRefpool: () => ({ status: null, error: "ETIMEDOUT", signal: "SIGTERM" }) });
  const result = runLifecycle(opts);
  assert.equal(result.outcomeRefpool.status, null);
  assert.ok(result.errors.some((e) => /outcome ref-pool apply: no exit status/.test(e)), "null-status restore-miss must be recorded");
  assert.equal(calls.trainArgs.length, 1, "training still ran");
});

/* ------------------------------------------------------------------ *
 * ghostEmbedRefresh + direct-embed assessment (U-GNN-GHOST-EMBED-DURABLE, stage 4b)
 * The DEPLOYED direct-embed path: refresh ghost-node-embeddings.jsonl from the current
 * graph + record the direct-embed assessment each run. ADDITIVE -- promotion still gates
 * on the model-mode assessment, never the direct-embed one.
 * ------------------------------------------------------------------ */

test("ghostEmbedRefresh -- runs + records telemetry; direct-embed assessment recorded (additive)", () => {
  let refreshCalls = 0, directCalls = 0;
  const { opts } = vrHarness({
    refreshGhostEmbeddings: () => { refreshCalls++; return { status: 0, summary: "embedded=355" }; },
    directEvalFn: () => { directCalls++; return { deferred: false, grade: { pass: false, verdict: "shipped-research-only" }, metrics: { auroc: 0.79, macroF1: 0.41, brier: 0.19 }, selective: { deployGrade: { verdict: "deploy-ready-selective" } } }; },
  });
  const result = runLifecycle(opts);
  assert.equal(refreshCalls, 1, "ghost-embed refresh ran once");
  assert.equal(result.ghostEmbedRefresh.ran, true);
  assert.equal(result.ghostEmbedRefresh.status, 0);
  assert.equal(directCalls, 1, "direct-embed assessment ran once");
  assert.ok(result.directEmbedAssessment, "direct-embed assessment recorded alongside model-mode");
});

test("ghostEmbedRefresh -- does NOT gate promotion (model-mode pass drives promote, failing direct-embed ignored)", () => {
  const { opts } = vrHarness({
    directEvalFn: () => ({ deferred: false, grade: { pass: false, verdict: "shipped-research-only" }, metrics: { auroc: 0.5 } }),
  });
  const result = runLifecycle(opts);
  assert.ok(result.directEmbedAssessment, "direct-embed recorded");
  assert.equal(result.promote.promote, true, "promotion gated on model-mode (which passed), NOT the failing direct-embed");
  assert.notEqual(result.action, "error");
});

test("ghostEmbedRefresh -- opt-out via PRISM_NN_RETRAIN_GHOST_EMBED_DISABLE (neither refresh nor direct-embed runs)", () => {
  let refreshCalls = 0, directCalls = 0;
  const { opts } = vrHarness({
    env: { PRISM_NN_RETRAIN_GHOST_EMBED_DISABLE: "1" },
    refreshGhostEmbeddings: () => { refreshCalls++; return { status: 0 }; },
    directEvalFn: () => { directCalls++; return { deferred: false, grade: {} }; },
  });
  const result = runLifecycle(opts);
  assert.equal(refreshCalls, 0, "disabled -> refresh not called");
  assert.equal(directCalls, 0, "disabled -> direct-embed not called");
  assert.equal(result.ghostEmbedRefresh, undefined);
  assert.equal(result.directEmbedAssessment, undefined);
});

test("ghostEmbedRefresh -- fail-soft: a throw is recorded, retrain still completes (model gate unaffected)", () => {
  const { opts, calls } = vrHarness({ refreshGhostEmbeddings: () => { throw new Error("ollama down"); } });
  const result = runLifecycle(opts);
  assert.ok(result.errors.some((e) => /ghost-embedding refresh failed/.test(e)), "failure surfaced");
  assert.notEqual(result.action, "error");
  assert.equal(calls.trainArgs.length, 1, "training still ran");
});

test("ghostEmbedRefresh -- non-zero exit surfaced (R12), non-fatal", () => {
  const { opts } = vrHarness({ refreshGhostEmbeddings: () => ({ status: 1, stderr: "nomic 500" }) });
  const result = runLifecycle(opts);
  assert.equal(result.ghostEmbedRefresh.status, 1);
  assert.ok(result.errors.some((e) => /ghost-embedding refresh: exit 1/.test(e)));
});

test("ghostEmbedRefresh -- null status (Ollama down/timeout) surfaced to the ledger (R12)", () => {
  const { opts } = vrHarness({ refreshGhostEmbeddings: () => ({ status: null, error: "ETIMEDOUT", signal: "SIGTERM" }) });
  const result = runLifecycle(opts);
  assert.equal(result.ghostEmbedRefresh.status, null);
  assert.ok(result.errors.some((e) => /ghost-embedding refresh: no exit status/.test(e)), "null-status surfaced");
});

test("ghostEmbedRefresh -- a direct-embed assessment throw is fail-soft (model-mode gate unaffected)", () => {
  const { opts, calls } = vrHarness({ directEvalFn: () => { throw new Error("graph load OOM"); } });
  const result = runLifecycle(opts);
  assert.ok(result.errors.some((e) => /direct-embed assessment failed/.test(e)), "failure surfaced");
  assert.equal(result.directEmbedAssessment, undefined);
  assert.notEqual(result.action, "error");
  assert.equal(calls.trainArgs.length, 1, "training still ran + model-mode assessment intact");
});

test("ghostEmbedRefresh -- persists the direct-embed assessment to NN-EVAL via writeAssessment (P2: deployed-state self-updates)", () => {
  let writeArgs = null;
  const da = { deferred: false, grade: { pass: false, verdict: "shipped-research-only" }, metrics: { auroc: 0.79 }, selective: { deployGrade: { verdict: "deploy-ready-selective" } } };
  const { opts } = vrHarness({
    directEvalFn: () => da,
    writeAssessmentFn: (res, dir, _report, opts4) => { writeArgs = { res, dir, opts4 }; return { ok: true, outDir: dir }; },
  });
  const result = runLifecycle(opts);
  assert.equal(writeArgs && writeArgs.res, da, "writeAssessment received the RAW direct-embed result (renderReport needs the full object, not the summarized one)");
  // The lifecycle is the AUTHORITATIVE deployed-state writer -- it must pass force:true so its assessment
  // always lands over a prior report (the bare-CLI downgrade guard fences only non-forced callers).
  assert.deepEqual(writeArgs && writeArgs.opts4, { force: true }, "stage 4b persists with force:true (authoritative writer)");
  assert.equal(result.directEmbedWritten, true);
});

test("ghostEmbedRefresh -- a NN-EVAL write failure is surfaced (R12) but fail-soft (assessment still recorded, retrain completes)", () => {
  const { opts, calls } = vrHarness({ writeAssessmentFn: () => ({ ok: false, error: "EACCES" }) });
  const result = runLifecycle(opts);
  assert.equal(result.directEmbedWritten, false);
  assert.ok(result.directEmbedAssessment, "assessment still recorded on result despite the write failure");
  assert.ok(result.errors.some((e) => /direct-embed NN-EVAL write failed/.test(e)), "write failure surfaced (R12)");
  assert.equal(calls.trainArgs.length, 1, "retrain completed");
  assert.notEqual(result.action, "error");
});
