// Tests for brain-refresh.mjs (BRAIN-REFRESH-MS0 — consolidated brain-refresh orchestrator).
// Hermetic: pure fns tested directly; orchestrate()/executeRefresh() driven with injected deps
// (the main()-seam oracle that pins lock→throttle→probe→run→stamp ordering + the sidecar-write
// serialization invariant). No real fs/subprocess/Ollama touched.

import { describe, it } from "node:test";
import { strict as assert } from "node:assert";

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  ALL_STEPS,
  planSteps,
  decideThrottle,
  stepGate,
  statusFromRun,
  classifyOutcome,
  executeRefresh,
  orchestrate,
  parseArgs,
  acquireLockAt,
  releaseLockAt,
  pidAlive,
  validateOnly,
} from "./brain-refresh.mjs";

const HEALTH_UP = { daemon: true, generate: true, embeddings: true };
const HEALTH_GEN_DOWN = { daemon: true, generate: false, embeddings: true };
const HEALTH_ALL_DOWN = { daemon: false, generate: false, embeddings: false };

describe("planSteps", () => {
  it("default excludes heavy (regen-viz) steps", () => {
    const ids = planSteps().map((s) => s.id);
    assert.ok(ids.includes("mem-index") && ids.includes("galaxy-synth"));
    assert.ok(!ids.includes("regen-viz"), "heavy regen-viz excluded without --with-viz");
  });
  it("--with-viz includes the heavy step", () => {
    assert.ok(planSteps({ withHeavy: true }).map((s) => s.id).includes("regen-viz"));
  });
  it("--only filters to the named ids, preserving order", () => {
    const ids = planSteps({ only: ["mem-embed", "mem-index"] }).map((s) => s.id);
    assert.deepEqual(ids, ["mem-index", "mem-embed"], "table order preserved, not arg order");
  });
  it("--only with a heavy id still needs --with-viz", () => {
    assert.deepEqual(planSteps({ only: ["regen-viz"] }).map((s) => s.id), [], "heavy gated even when named");
    assert.deepEqual(planSteps({ only: ["regen-viz"], withHeavy: true }).map((s) => s.id), ["regen-viz"]);
  });
  it("empty/garbage only → all non-heavy (no filter)", () => {
    assert.equal(planSteps({ only: [] }).length, ALL_STEPS.filter((s) => !s.heavy).length);
  });
});

describe("decideThrottle", () => {
  it("force always runs", () => assert.equal(decideThrottle({ lastStampMs: 1, now: 1, cooldownMs: 9e9, force: true }).run, true));
  it("never-run (null/NaN stamp) runs", () => {
    assert.equal(decideThrottle({ lastStampMs: null, now: 1000, cooldownMs: 500 }).run, true);
    assert.equal(decideThrottle({ lastStampMs: NaN, now: 1000, cooldownMs: 500 }).run, true);
  });
  it("within cooldown → skip", () => {
    const d = decideThrottle({ lastStampMs: 1000, now: 1100, cooldownMs: 500 });
    assert.equal(d.run, false);
    assert.match(d.reason, /throttled/);
  });
  it("cooldown elapsed → run", () => {
    assert.equal(decideThrottle({ lastStampMs: 1000, now: 2000, cooldownMs: 500 }).run, true);
  });
  it("exactly at cooldown boundary → run (>=)", () => {
    assert.equal(decideThrottle({ lastStampMs: 1000, now: 1500, cooldownMs: 500 }).run, true);
  });
});

describe("stepGate", () => {
  const gen = ALL_STEPS.find((s) => s.id === "galaxy-synth");
  const emb = ALL_STEPS.find((s) => s.id === "mem-embed");
  const none = ALL_STEPS.find((s) => s.id === "mem-index");
  it("generate step deferred when generate down", () => {
    assert.deepEqual(stepGate({ step: gen, health: HEALTH_GEN_DOWN, priorResults: {} }), { run: false, skipStatus: "deferred-ollama" });
  });
  it("embeddings step deferred when embeddings down", () => {
    assert.deepEqual(stepGate({ step: emb, health: HEALTH_ALL_DOWN, priorResults: { "mem-index": "ok" } }), { run: false, skipStatus: "deferred-ollama" });
  });
  it("dep not ok → skipped-dep", () => {
    assert.deepEqual(stepGate({ step: emb, health: HEALTH_UP, priorResults: { "mem-index": "failed" } }), { run: false, skipStatus: "skipped-dep" });
  });
  it("dep ok + health up → runs", () => {
    assert.deepEqual(stepGate({ step: emb, health: HEALTH_UP, priorResults: { "mem-index": "ok" } }), { run: true });
  });
  it("no-requires step always gated only on deps", () => {
    assert.deepEqual(stepGate({ step: none, health: HEALTH_ALL_DOWN, priorResults: {} }), { run: true });
  });
});

describe("statusFromRun (benignExits classification)", () => {
  const amp2 = ALL_STEPS.find((s) => s.id === "galaxy-synth");
  const plain = ALL_STEPS.find((s) => s.id === "mem-index");
  const viz = ALL_STEPS.find((s) => s.id === "regen-viz");
  it("exit 0 → ok", () => assert.equal(statusFromRun(plain, { exit: 0 }), "ok"));
  it("AMP2 exit 3 → deferred (benignExits {3:deferred})", () => assert.equal(statusFromRun(amp2, { exit: 3 }), "deferred"));
  it("step with no benignExits: exit 3 → failed", () => assert.equal(statusFromRun(plain, { exit: 3 }), "failed"));
  it("nonzero → failed", () => assert.equal(statusFromRun(plain, { exit: 1 }), "failed"));
  // P1 fix: regen-viz benign exit codes must NOT read as hard failures under fleet concurrency.
  it("regen-viz exit 4 → skipped-locked (a peer chat holds the graph write-lock — routine)", () => assert.equal(statusFromRun(viz, { exit: 4 }), "skipped-locked"));
  it("regen-viz exit 3 → deferred (merge no-op)", () => assert.equal(statusFromRun(viz, { exit: 3 }), "deferred"));
  it("regen-viz exit 2 → failed (merge-fail is NOT benign)", () => assert.equal(statusFromRun(viz, { exit: 2 }), "failed"));
  it("regen-viz exit 1 → failed", () => assert.equal(statusFromRun(viz, { exit: 1 }), "failed"));
  it("ENOENT/missing → missing", () => {
    assert.equal(statusFromRun(plain, { err: "ENOENT", missing: true }), "missing");
    assert.equal(statusFromRun(plain, null), "missing");
  });
});

describe("classifyOutcome", () => {
  it("any failed → exit 1", () => assert.equal(classifyOutcome([{ status: "ok" }, { status: "failed" }, { status: "deferred" }]).exitCode, 1));
  it("missing counts as exit 1 (fail-loud on a vanished wired script)", () => assert.equal(classifyOutcome([{ status: "missing" }]).exitCode, 1));
  it("deferred (no fail) → exit 3", () => assert.equal(classifyOutcome([{ status: "ok" }, { status: "deferred-ollama" }]).exitCode, 3));
  it("all ok/skipped → exit 0", () => assert.equal(classifyOutcome([{ status: "ok" }, { status: "skipped-dep" }, { status: "skipped-heavy" }]).exitCode, 0));
  it("skipped-locked (regen-viz peer graph-lock) is benign → exit 0", () => assert.equal(classifyOutcome([{ status: "ok" }, { status: "skipped-locked" }]).exitCode, 0));
  it("empty → exit 0", () => assert.equal(classifyOutcome([]).exitCode, 0));
});

describe("executeRefresh (sequential step loop)", () => {
  it("runs steps in order, all ok → exit 0", () => {
    const ran = [];
    const r = executeRefresh({ steps: planSteps(), health: HEALTH_UP, runStep: (s) => { ran.push(s.id); return { exit: 0, ms: 5 }; } });
    assert.deepEqual(ran, ["mem-index", "mem-embed", "galaxy-synth", "wiki-tribal"]);
    assert.equal(r.exitCode, 0);
  });
  it("mem-index failure SKIPS dependent mem-embed (never embeds against a stale index)", () => {
    const ran = [];
    const steps = planSteps({ only: ["mem-index", "mem-embed"] });
    const r = executeRefresh({ steps, health: HEALTH_UP, runStep: (s) => { ran.push(s.id); return { exit: s.id === "mem-index" ? 1 : 0, ms: 5 }; } });
    assert.deepEqual(ran, ["mem-index"], "mem-embed never invoked");
    assert.equal(r.results.find((x) => x.id === "mem-embed").status, "skipped-dep");
    assert.equal(r.exitCode, 1);
  });
  it("generate down → galaxy-synth deferred, others still run → exit 3", () => {
    const ran = [];
    const r = executeRefresh({ steps: planSteps(), health: HEALTH_GEN_DOWN, runStep: (s) => { ran.push(s.id); return { exit: 0, ms: 5 }; } });
    assert.ok(!ran.includes("galaxy-synth"), "generate step not invoked when generate down");
    assert.equal(r.results.find((x) => x.id === "galaxy-synth").status, "deferred-ollama");
    assert.equal(r.exitCode, 3);
  });
  it("all ollama down → only no-requires steps run", () => {
    const ran = [];
    const r = executeRefresh({ steps: planSteps(), health: HEALTH_ALL_DOWN, runStep: (s) => { ran.push(s.id); return { exit: 0, ms: 5 }; } });
    assert.deepEqual(ran, ["mem-index"], "only the no-Ollama step runs (mem-embed dep-skips since its gate defers, wiki-tribal defers, galaxy defers)");
    assert.equal(r.exitCode, 3);
  });
});

describe("orchestrate (main-seam oracle — lock/throttle/stamp ordering + invariant)", () => {
  function rig(overrides = {}) {
    const calls = [];
    const deps = {
      readStamp: () => null,
      writeStamp: (n) => calls.push(`writeStamp:${n}`),
      acquireLock: () => { calls.push("acquireLock"); return true; },
      releaseLock: () => calls.push("releaseLock"),
      probeOllama: () => { calls.push("probe"); return HEALTH_UP; },
      runStep: (s) => { calls.push(`run:${s.id}`); return { exit: 0, ms: 5 }; },
      log: () => {},
      ...overrides,
    };
    return { calls, deps };
  }

  it("happy path: acquireLock → probe → runs → writeStamp, releaseLock LAST", () => {
    const { calls, deps } = rig();
    const r = orchestrate({ now: 7000, deps });
    assert.equal(r.action, "ran");
    assert.equal(r.exitCode, 0);
    assert.equal(calls[0], "acquireLock", "lock acquired before anything");
    assert.equal(calls[1], "probe", "probe after lock");
    const stampIdx = calls.indexOf("writeStamp:7000");
    const lastRunIdx = Math.max(...calls.map((c, i) => (c.startsWith("run:") ? i : -1)));
    assert.ok(stampIdx > lastRunIdx, "stamp written AFTER all runs (crash-mid-run re-attempts next time)");
    assert.equal(calls[calls.length - 1], "releaseLock", "lock released last");
  });

  it("throttled: never acquires lock, never runs", () => {
    const { calls, deps } = rig({ readStamp: () => 6900 });
    const r = orchestrate({ now: 7000, cooldownMs: 500, deps });
    assert.equal(r.action, "skipped-throttle");
    assert.equal(r.exitCode, 0);
    assert.deepEqual(calls, [], "no lock/probe/run/stamp when throttled");
  });

  it("lock held by peer: skips run, does NOT release a lock it never took", () => {
    const { calls, deps } = rig({ acquireLock: () => { calls.push("acquireLock"); return false; } });
    const r = orchestrate({ now: 7000, deps });
    assert.equal(r.action, "skipped-locked");
    assert.equal(r.exitCode, 0);
    assert.ok(!calls.includes("probe") && !calls.some((c) => c.startsWith("run:")), "no work under contention");
    assert.ok(!calls.includes("releaseLock"), "never release a lock we didn't acquire");
    assert.ok(!calls.some((c) => c.startsWith("writeStamp")), "no stamp when locked-out");
  });

  it("INVARIANT: releaseLock always runs even when probe throws (lock never leaks)", () => {
    const { calls, deps } = rig({ probeOllama: () => { calls.push("probe"); throw new Error("boom"); } });
    assert.throws(() => orchestrate({ now: 7000, deps }), /boom/);
    assert.ok(calls.includes("releaseLock"), "finally released the lock despite the throw");
  });

  it("force ignores throttle and runs", () => {
    const { calls, deps } = rig({ readStamp: () => 6999 });
    const r = orchestrate({ now: 7000, cooldownMs: 9e9, force: true, deps });
    assert.equal(r.action, "ran");
    assert.ok(calls.includes("acquireLock"));
  });
});

describe("parseArgs", () => {
  it("parses all flags", () => {
    const a = parseArgs(["--dry-run", "--force", "--with-viz", "--json", "--verbose", "--only", "mem-index,galaxy-synth"]);
    assert.equal(a.dryRun, true);
    assert.equal(a.force, true);
    assert.equal(a.withHeavy, true);
    assert.equal(a.json, true);
    assert.equal(a.verbose, true);
    assert.deepEqual(a.only, ["mem-index", "galaxy-synth"]);
  });
  it("--heavy is an alias for --with-viz", () => assert.equal(parseArgs(["--heavy"]).withHeavy, true));
  it("defaults are all off / null", () => {
    const a = parseArgs([]);
    assert.equal(a.dryRun, false);
    assert.equal(a.only, null);
  });
});

// P1 (both reviewers): the lock is the load-bearing single-writer invariant; it must have a
// REAL-fs regression oracle (the orchestrate oracle injects a fake acquireLock). These drive the
// actual O_EXCL + atomic rename-aside reclaim against a tmpdir.
describe("lock oracle (real fs — single-writer invariant)", () => {
  const NOW = 1_000_000;
  const TTL = 1000;
  function freshLockPath() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "brain-refresh-lock-"));
    return path.join(dir, ".brain-refresh.lock");
  }

  it("clean acquire on a free path → true, file carries our pid + now", () => {
    const lp = freshLockPath();
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL }), true);
    const h = JSON.parse(fs.readFileSync(lp, "utf8"));
    assert.equal(h.pid, process.pid);
    assert.equal(h.ts, NOW);
  });

  it("held by a LIVE recent holder → false (defers); holder untouched", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, JSON.stringify({ pid: 4242, ts: NOW }));
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL, isAlive: () => true }), false);
    assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, 4242, "did not steal a live lock");
  });

  it("held by a DEAD holder → reclaim + acquire (true), now ours", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, JSON.stringify({ pid: 4242, ts: NOW }));
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL, isAlive: () => false }), true);
    assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, process.pid);
  });

  it("held by a LIVE but TTL-EXPIRED holder → reclaim + acquire (true)", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, JSON.stringify({ pid: 4242, ts: NOW - TTL - 1 }));
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL, isAlive: () => true }), true);
    assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, process.pid);
  });

  // U-OBS-BRAIN-LOCK-RECLAIM (2026-06-09): a corrupt/unparseable lock is BY
  // DEFINITION not a live holder. The OLD behavior here was `→ false` ("conservative,
  // never run blind") — but that FROZE the dense recall arm for 27h+ on a real
  // 32-NUL-byte lock (dense sidecar stuck while BM25 advanced). Corrected intent:
  // a corrupt lock is reclaimed via the same race-safe rename-aside path as a
  // dead/stale holder. R9 — this test now fails RED on the pre-fix code.
  it("garbage (non-JSON) lock → reclaim + acquire (true), now ours", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, "not json {{{");
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL, isAlive: () => false }), true);
    assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, process.pid, "now holds a valid lock");
  });

  it("32-NUL-byte corrupt lock (the live incident) → reclaim + acquire (true)", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, Buffer.alloc(32)); // exactly the live .brain-refresh.lock that froze dense recall
    // isAlive:()=>true proves corruptness ALONE triggers reclaim — not a dead PID
    // (a 32-NUL lock has no parseable pid, so the live-holder guard must not apply).
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL, isAlive: () => true }), true);
    assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, process.pid);
  });

  it("EMPTY (0-byte) lock -> defer (false): a peer mid-creation between openSync and writeSync is a LIVE holder, not corruption", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, ""); // the open->write window: entry exists, body not yet written
    // isAlive:()=>false proves it's the EMPTY-ness that defers, not a live-PID guard:
    // even with a "dead" isAlive, a 0-byte read must NOT reclaim (could be a fresh peer).
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL, isAlive: () => false }), false, "empty lock defers, never reclaims");
    assert.equal(fs.readFileSync(lp, "utf8"), "", "the empty lock was left untouched (not renamed aside)");
  });

  it("REGRESSION: a parseable + LIVE + recent lock still blocks (corrupt-reclaim did not over-reach)", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, JSON.stringify({ pid: 4242, ts: NOW }));
    assert.equal(acquireLockAt(lp, { now: NOW, ttlMs: TTL, isAlive: () => true }), false, "live holder untouched");
    assert.equal(JSON.parse(fs.readFileSync(lp, "utf8")).pid, 4242, "did not steal a valid live lock");
  });

  it("releaseLockAt unlinks ONLY our own pid", () => {
    const lp = freshLockPath();
    fs.writeFileSync(lp, JSON.stringify({ pid: process.pid + 1, ts: NOW })); // a peer's lock
    releaseLockAt(lp);
    assert.ok(fs.existsSync(lp), "peer lock preserved");
    fs.writeFileSync(lp, JSON.stringify({ pid: process.pid, ts: NOW })); // ours
    releaseLockAt(lp);
    assert.ok(!fs.existsSync(lp), "own lock released");
  });

  it("acquire → release → re-acquire round-trip", () => {
    const lp = freshLockPath();
    assert.equal(acquireLockAt(lp, { now: NOW }), true);
    releaseLockAt(lp);
    assert.equal(acquireLockAt(lp, { now: NOW + 1 }), true, "path free again after release");
  });
});

describe("pidAlive", () => {
  it("our own pid is alive", () => assert.equal(pidAlive(process.pid), true));
  it("absurd pid is dead (no throw)", () => assert.equal(pidAlive(2 ** 30), false));
  it("invalid pids are dead, never throw", () => {
    for (const p of [-1, 0, "x", null, undefined, 1.5]) assert.equal(pidAlive(p), false);
  });
});

describe("validateOnly (--only footgun guard)", () => {
  it("null → ok (no filter)", () => assert.deepEqual(validateOnly(null), { ok: true, unknown: [] }));
  it("empty array (bare --only) → not ok", () => {
    const v = validateOnly([]);
    assert.equal(v.ok, false);
    assert.equal(v.reason, "empty");
  });
  it("known ids → ok", () => assert.equal(validateOnly(["mem-index", "regen-viz"]).ok, true));
  it("unknown id → not ok + lists it", () => {
    const v = validateOnly(["mem-index", "bogus"]);
    assert.equal(v.ok, false);
    assert.deepEqual(v.unknown, ["bogus"]);
  });
});
