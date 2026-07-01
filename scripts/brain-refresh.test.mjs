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
  buildLastRunReport,
  executeRefresh,
  orchestrate,
  parseArgs,
  acquireLockAt,
  releaseLockAt,
  pidAlive,
  validateOnly,
  stepNodeArgs,
  sanitizeChildEnv,
  stderrTail,
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

// U-SIERRA-BRAIN-LASTRUN (2026-06-25, slot:sierra): the durable last-run report makes a failed
// overnight refresh self-diagnosing (which of the N pipelines broke), instead of a bare cron exit 1
// that needed sidecar-mtime forensics to attribute. The pure builder is the testable oracle.
describe("buildLastRunReport (durable per-step diagnostic)", () => {
  it("names the FAILED step ids explicitly (the 'what broke' answer)", () => {
    const result = { action: "ran", verdict: "failed", exitCode: 1, health: { daemon: true, generate: true, embeddings: true },
      results: [{ id: "mem-index", status: "ok", exit: 0, ms: 1300 }, { id: "galaxy-synth", status: "failed", exit: 1, ms: 28000 }, { id: "wiki-tribal", status: "ok", exit: 0, ms: 5000 }] };
    const rep = buildLastRunReport(result, "2026-06-26T00:00:00.000Z");
    assert.deepEqual(rep.failedSteps, ["galaxy-synth"], "the one failed step is named (mirrors the live exit-1 root cause)");
    assert.equal(rep.exitCode, 1);
    assert.equal(rep.verdict, "failed");
    assert.equal(rep.steps.length, 3);
    assert.equal(rep.generatedAt, "2026-06-26T00:00:00.000Z", "producer emits generatedAt (vault-health ages the report off this exact field name)");
    assert.deepEqual(rep.steps.find((s) => s.id === "mem-index"), { id: "mem-index", status: "ok", exit: 0, ms: 1300, err: null });
  });
  it("counts a 'missing' step as failed too (vanished wired script)", () => {
    const rep = buildLastRunReport({ action: "ran", verdict: "failed", exitCode: 1, results: [{ id: "regen-viz", status: "missing" }] }, "t");
    assert.deepEqual(rep.failedSteps, ["regen-viz"]);
  });
  it("empty/clean run → no failedSteps, verdict ok", () => {
    const rep = buildLastRunReport({ action: "ran", verdict: "ok", exitCode: 0, results: [{ id: "mem-index", status: "ok", exit: 0, ms: 5 }] }, "t");
    assert.deepEqual(rep.failedSteps, []);
    assert.equal(rep.verdict, "ok");
  });
  it("tolerates missing fields (defaults, never throws)", () => {
    const rep = buildLastRunReport({}, "t");
    assert.equal(rep.action, "unknown");
    assert.equal(rep.verdict, null);
    assert.equal(rep.exitCode, null);
    assert.deepEqual(rep.steps, []);
    assert.deepEqual(rep.failedSteps, []);
  });
});

describe("step spawn heap + stderr opacity (U-SIERRA-BRAIN-STEP-HEAP)", () => {
  it("stepNodeArgs prepends an explicit heap ceiling before the script + args", () => {
    const a = stepNodeArgs("H:/prism/scripts/vault-link-doctor.mjs", ["--ambiguous"]);
    assert.equal(a[0], "--max-old-space-size=4096", "default 4GB ceiling is the first node arg");
    assert.equal(a[1], "H:/prism/scripts/vault-link-doctor.mjs", "script path follows the flag");
    assert.deepEqual(a.slice(2), ["--ambiguous"], "step args follow the script");
  });
  it("stepNodeArgs honors a custom heap and floors a too-small value at 512 (never starves a step)", () => {
    assert.equal(stepNodeArgs("s.mjs", [], 8192)[0], "--max-old-space-size=8192");
    assert.equal(stepNodeArgs("s.mjs", [], 128)[0], "--max-old-space-size=512", "a sub-512 request is floored, not honored");
    assert.equal(stepNodeArgs("s.mjs", [], 0)[0], "--max-old-space-size=4096", "0/NaN falls back to the 4GB default");
  });
  it("sanitizeChildEnv strips an inherited --max-old-space-size cap so the argv flag is authoritative", () => {
    // The exact overnight failure mode: a parent context exporting a 384MB cap into the child.
    const cleaned = sanitizeChildEnv({ NODE_OPTIONS: "--max-old-space-size=384 --enable-source-maps" });
    assert.equal(cleaned.NODE_OPTIONS, "--enable-source-maps", "cap removed, the unrelated flag preserved");
    const spaceForm = sanitizeChildEnv({ NODE_OPTIONS: "--max_old_space_size 256" });
    assert.equal(spaceForm.NODE_OPTIONS, undefined, "a cap-only NODE_OPTIONS is deleted, not left empty");
    assert.equal(sanitizeChildEnv({ NODE_OPTIONS: "--enable-source-maps" }).NODE_OPTIONS, "--enable-source-maps", "a cap-free NODE_OPTIONS is untouched");
    assert.equal("NODE_OPTIONS" in sanitizeChildEnv({ FOO: "bar" }), false, "absent NODE_OPTIONS stays absent");
  });
  it("stderrTail surfaces the FATAL heap line over the last line (the actionable cause)", () => {
    const oom = "some noise\nFATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory\n 1: 0x00 trace\n 2: 0x01 trace";
    assert.match(stderrTail(oom), /Reached heap limit/, "the heap-OOM marker is picked even when a stack trace is the last line");
    assert.equal(stderrTail("line one\nthe real tail"), "the real tail", "no marker -> last non-empty line");
    assert.equal(stderrTail(""), "", "empty stderr -> empty tail");
    assert.equal(stderrTail(null), "", "null stderr -> empty tail (never throws)");
    assert.equal(stderrTail(Buffer.from("FATAL ERROR: boom")), "FATAL ERROR: boom", "accepts a Buffer (default execFileSync encoding)");
    assert.ok(stderrTail("x".repeat(500)).endsWith("..."), "an overlong line is truncated with an ellipsis");
  });
  it("a failed step's stderr cause reaches the DURABLE record (the opacity fix, end-to-end)", () => {
    // Pre-fix, buildLastRunReport dropped `err` -> a heap-OOM step recorded a bare 'failed' with no cause.
    const runStep = (step) => step.id === "vault-links"
      ? { exit: 134, ms: 3796, err: "signal:SIGABRT: FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory" }
      : { exit: 0, ms: 10 };
    const steps = [{ id: "vault-rot", label: "rot", script: "x.mjs", args: [], requires: "none" },
                   { id: "vault-links", label: "links", script: "y.mjs", args: [], requires: "none" }];
    const result = executeRefresh({ steps, health: HEALTH_UP, runStep });
    const rep = buildLastRunReport(result, "2026-06-28T00:00:00.000Z");
    assert.deepEqual(rep.failedSteps, ["vault-links"]);
    const vl = rep.steps.find((s) => s.id === "vault-links");
    assert.match(vl.err, /Reached heap limit/, "the durable record now NAMES the heap-OOM cause (was a bare 'failed' pre-fix)");
    assert.equal(rep.steps.find((s) => s.id === "vault-rot").err, null, "a clean step carries err:null, no noise");
  });
});

describe("executeRefresh (sequential step loop)", () => {
  it("runs steps in order, all ok → exit 0", () => {
    const ran = [];
    const r = executeRefresh({ steps: planSteps(), health: HEALTH_UP, runStep: (s) => { ran.push(s.id); return { exit: 0, ms: 5 }; } });
    assert.deepEqual(ran, ["mem-index", "mem-embed", "galaxy-synth", "wiki-tribal", "vault-rot", "supersession", "vault-links", "vault-health"]);
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
    assert.deepEqual(ran, ["mem-index", "vault-rot", "supersession", "vault-links", "vault-health"], "only no-requires steps run (mem-embed/wiki-tribal defer on embeddings, galaxy defers on generate; the gap-sentinels + link-doctor + the vault-health rollup are Ollama-independent)");
    assert.equal(r.exitCode, 3);
  });
});

// U-SIERRA-BRAIN-ROLLUP-FRESH (2026-06-28, slot:sierra): the vault-health rollup step READS
// .brain-refresh-last-run.json, but main() publishes that record only AFTER every step -- so the
// rollup used to read the PRIOR run's record and bake a stale "FAILED: <prior step>" into
// vault-health.json, which the next SessionStart surfaced as a FALSE brain-FAILED alarm (cry-wolf
// masking real failures). Fix: executeRefresh flushes a provisional CURRENT-run report just before
// the consumesLastRun step. Intent (R9): the rollup must see THIS run's results, never the last run's.
describe("rollup last-run freshness (U-SIERRA-BRAIN-ROLLUP-FRESH)", () => {
  const FRESH_STEPS = [
    { id: "vault-links", label: "vl", requires: "none", dependsOn: null },
    { id: "vault-health", label: "vh", requires: "none", dependsOn: null, consumesLastRun: true },
  ];

  it("flushes a CURRENT-run report before the consumesLastRun rollup step (kills the stale prior-run read)", () => {
    const flushed = [];
    let seenByRollup = null;
    executeRefresh({
      steps: FRESH_STEPS, health: HEALTH_ALL_DOWN,
      runStep: (s) => { if (s.id === "vault-health") seenByRollup = flushed[flushed.length - 1] ?? null; return { exit: 0, ms: 5 }; },
      flushLastRun: (rep) => flushed.push(rep),
      nowIso: "2026-06-28T00:00:00.000Z",
    });
    assert.ok(seenByRollup, "rollup step must read a flushed CURRENT-run report (pre-fix it read the prior run's record on disk)");
    assert.deepEqual(seenByRollup.steps.map((s) => s.id), ["vault-links"], "report reflects THIS run's already-completed steps");
    assert.deepEqual(seenByRollup.failedSteps, [], "vault-links ok this run -> rollup sees no failure (no false FAILED alarm)");
    assert.equal(seenByRollup.generatedAt, "2026-06-28T00:00:00.000Z", "provisional stamped with the current run's nowIso");
    assert.equal(seenByRollup.provisional, true, "mid-run record self-identifies as provisional (rollup not yet counted)");
  });

  it("the flushed report reflects THIS run's failure, not a stale clean record", () => {
    const flushed = [];
    let seenByRollup = null;
    executeRefresh({
      steps: FRESH_STEPS, health: HEALTH_ALL_DOWN,
      runStep: (s) => { if (s.id === "vault-health") seenByRollup = flushed.at(-1) ?? null; return { exit: s.id === "vault-links" ? 1 : 0, ms: 5 }; },
      flushLastRun: (rep) => flushed.push(rep),
      nowIso: "t",
    });
    assert.deepEqual(seenByRollup.failedSteps, ["vault-links"], "rollup sees this run's real failure -- proves the record is current, not stale");
  });

  it("flushes ONLY before the consumesLastRun step (flag-driven, exactly one provisional write, ordered right before the rollup)", () => {
    const events = [];
    const steps = [
      { id: "vault-rot", label: "vr", requires: "none", dependsOn: null },
      { id: "supersession", label: "ss", requires: "none", dependsOn: null },
      ...FRESH_STEPS.slice(1), // vault-health (consumesLastRun)
    ];
    executeRefresh({
      steps, health: HEALTH_ALL_DOWN,
      runStep: (s) => { events.push("run:" + s.id); return { exit: 0, ms: 1 }; },
      flushLastRun: () => events.push("flush"),
      nowIso: "t",
    });
    assert.equal(events.filter((e) => e === "flush").length, 1, "exactly one flush -- only the rollup consumes the record");
    assert.deepEqual(events, ["run:vault-rot", "run:supersession", "flush", "run:vault-health"], "flush lands immediately before the rollup, after its inputs ran");
  });

  it("back-compat: executeRefresh without flushLastRun still runs the rollup (optional dep, no crash)", () => {
    const ran = [];
    const r = executeRefresh({ steps: [FRESH_STEPS[1]], health: HEALTH_ALL_DOWN, runStep: (s) => { ran.push(s.id); return { exit: 0, ms: 1 }; } });
    assert.deepEqual(ran, ["vault-health"], "rollup runs even when flushLastRun is omitted");
    assert.equal(r.exitCode, 0);
  });

  it("ALL_STEPS: only the vault-health rollup carries consumesLastRun (no spurious flushes on other steps)", () => {
    const flagged = ALL_STEPS.filter((s) => s.consumesLastRun).map((s) => s.id);
    assert.deepEqual(flagged, ["vault-health"], "exactly the rollup step reads .brain-refresh-last-run.json");
  });

  it("the FINAL last-run record (buildLastRunReport via main) is NOT marked provisional", () => {
    const final = buildLastRunReport({ results: [{ id: "vault-health", status: "ok" }], action: "ran", verdict: "ok" }, "t");
    assert.equal(final.provisional, undefined, "only the mid-run flush carries provisional:true; the complete final record does not");
  });
});

// U-SIERRA-BRAIN-GAP-SENTINELS (2026-06-25, slot:sierra): the vault gap-sentinels (vault-rot,
// supersession) are now consolidated into this orchestrator so they auto-refresh instead of rotting
// (they had ZERO auto-callers -> 7.8d stale). Intent (R9): they are Ollama-INDEPENDENT so the
// "orphan nodes reveal gaps" measurement is always current even on an Ollama-down night, and a
// sentinel failure is loud (no benignExits mask).
describe("vault gap-sentinels (U-SIERRA-BRAIN-GAP-SENTINELS)", () => {
  it("vault-rot + supersession wired as requires:none --write (measure-only) steps, no dep, not heavy", () => {
    // Both MEASURE only -- supersession auto-mark was reverted (3-of-3 arm-C: unattended marking
    // mis-classified episodic dated series as superseded; U-SIERRA-SUPERSEDE-SERIES-FIX). Applying
    // the now-series-safe --mark is an operator-judgment manual action, not a nightly write.
    for (const id of ["vault-rot", "supersession"]) {
      const s = ALL_STEPS.find((x) => x.id === id);
      assert.ok(s, `${id} wired into ALL_STEPS`);
      assert.equal(s.requires, "none", `${id} gap-measure must be Ollama-independent`);
      assert.deepEqual(s.args, ["--write"], `${id} measures (persists report) -- never auto-mutates memos`);
      assert.equal(s.dependsOn, null, `${id} has no prerequisite`);
      assert.ok(!s.heavy, `${id} runs every refresh, not heavy-gated`);
    }
  });
  it("default refresh runs them in table order, after wiki-tribal and before regen-viz", () => {
    const ids = planSteps().map((s) => s.id);
    assert.deepEqual(ids, ["mem-index", "mem-embed", "galaxy-synth", "wiki-tribal", "vault-rot", "supersession", "vault-links", "vault-health"]);
  });
  it("vault-links + vault-health are requires:none; the rollup runs LAST, after every sentinel it aggregates", () => {
    for (const id of ["vault-links", "vault-health"]) {
      const s = ALL_STEPS.find((x) => x.id === id);
      assert.ok(s && s.requires === "none" && !s.heavy, `${id} runs every refresh, Ollama-independent`);
    }
    const ids = ALL_STEPS.map((s) => s.id);
    // vault-health aggregates rot + supersession + ambiguous(vault-links), so it must follow all three.
    for (const sentinel of ["vault-rot", "supersession", "vault-links"]) {
      assert.ok(ids.indexOf("vault-health") > ids.indexOf(sentinel), `rollup must run after ${sentinel}`);
    }
  });
  it("gap-sentinels STILL refresh when Ollama is fully down (graph-gap view never goes stale)", () => {
    const ran = [];
    executeRefresh({ steps: planSteps(), health: HEALTH_ALL_DOWN, runStep: (s) => { ran.push(s.id); return { exit: 0, ms: 5 }; } });
    assert.ok(ran.includes("vault-rot") && ran.includes("supersession"), "gap-measure refreshes even on an Ollama-down night");
  });
  it("a failing gap-sentinel fails the refresh loud (no benignExits mask)", () => {
    const vr = ALL_STEPS.find((s) => s.id === "vault-rot");
    const ss = ALL_STEPS.find((s) => s.id === "supersession");
    assert.equal(statusFromRun(vr, { exit: 1 }), "failed");
    assert.equal(statusFromRun(ss, { exit: 2 }), "failed");
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
