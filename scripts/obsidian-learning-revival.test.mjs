/**
 * obsidian-learning-revival.test.mjs — real-behavior tests for the no-elevation
 * offline-learning revival actuator. node:test (matches the codebase's .mjs
 * test convention, e.g. fleet-task-health-watch peers).
 *
 * Coverage: pure planning core (the gate logic), date helpers (reference
 * values), the freshness→revive decision, and runOnce orchestration with
 * INJECTED sampler/spawn/io so no real PowerShell or engine ever runs in test.
 * Happy + ≥3 failure modes + ≥2 adversarial per R9/R15.
 */

import { strict as assert } from "node:assert";
import { test } from "node:test";

import {
  planRevival, isoDate, mostRecentSunday, taskStatusByName, runOnce,
  LEARNING_ENGINES, DEFAULT_SPAWN_TIMEOUT_MS,
} from "./obsidian-learning-revival.mjs";

// ─── Date helpers — reference values (R9: a test that fails if the math drifts) ──

test("isoDate: known timestamp → exact UTC date", () => {
  // 2026-06-08T13:48:05Z → 2026-06-08
  assert.equal(isoDate(Date.parse("2026-06-08T13:48:05.961Z")), "2026-06-08");
  // Just before UTC midnight stays on the same day; just after rolls over.
  assert.equal(isoDate(Date.parse("2026-06-08T23:59:59Z")), "2026-06-08");
  assert.equal(isoDate(Date.parse("2026-06-09T00:00:00Z")), "2026-06-09");
});

test("mostRecentSunday: reference anchors across the week", () => {
  // 2026-06-08 is a Monday → most-recent Sunday is 2026-06-07.
  assert.equal(mostRecentSunday(Date.parse("2026-06-08T13:00:00Z")), "2026-06-07");
  // On the Sunday itself → that Sunday.
  assert.equal(mostRecentSunday(Date.parse("2026-06-07T10:00:00Z")), "2026-06-07");
  // Saturday → the PRIOR Sunday (6 days back), not the upcoming one.
  assert.equal(mostRecentSunday(Date.parse("2026-06-13T23:00:00Z")), "2026-06-07");
  // Crossing a month boundary backwards.
  assert.equal(mostRecentSunday(Date.parse("2026-03-02T00:00:00Z")), "2026-03-01");
});

// ─── planRevival — the pure gate (happy + failure + adversarial) ────────────

test("planRevival: fresh output is the only skip (happy path)", () => {
  const plan = planRevival([
    { key: "dream-cycle", taskName: "T1", outputFresh: true, taskStatus: "disabled" },
  ]);
  assert.equal(plan[0].revive, false);
  assert.equal(plan[0].reason, "fresh");
});

test("planRevival: dark task + stale output → revive with task-dark reason", () => {
  for (const status of ["disabled", "missing", "failing", "stale", "trigger-stalled", "never-ran", "unknown-state"]) {
    const plan = planRevival([{ key: "k", taskName: "T", outputFresh: false, taskStatus: status }]);
    assert.equal(plan[0].revive, true, `dark status ${status} must revive`);
    assert.equal(plan[0].reason, `task-dark(${status})`);
  }
});

test("planRevival: healthy task but stale output → still revive (backfill)", () => {
  // Scheduler alive (Ready) but PC was off at trigger time → output behind.
  const plan = planRevival([{ key: "k", taskName: "T", outputFresh: false, taskStatus: "healthy" }]);
  assert.equal(plan[0].revive, true);
  assert.equal(plan[0].reason, "task-healthy-but-output-stale");
});

test("planRevival: --force reruns even when fresh (adversarial: fresh must not block force)", () => {
  const plan = planRevival(
    [{ key: "k", taskName: "T", outputFresh: true, taskStatus: "healthy" }],
    { force: true },
  );
  assert.equal(plan[0].revive, true);
  assert.equal(plan[0].reason, "forced");
});

test("planRevival: adversarial — missing/garbled taskStatus defaults to a dark revive, never a silent skip", () => {
  // A null/undefined status must NOT be treated as 'fresh enough to skip'.
  const plan = planRevival([{ key: "k", taskName: "T", outputFresh: false, taskStatus: undefined }]);
  assert.equal(plan[0].revive, true);
  assert.equal(plan[0].reason, "task-dark(unknown-state)");
});

// ─── taskStatusByName — classifier reuse + missing detection ────────────────

test("taskStatusByName: Disabled task classified disabled; absent task is 'missing' downstream", () => {
  const now = Date.parse("2026-06-08T13:00:00Z");
  const sample = {
    tasks: [
      { name: "PRISM Hermes Dream-Cycle Synth", state: "Disabled", lastRunTime: "2026-06-04T03:17:00Z", lastTaskResult: 0, triggerIntervals: [] },
    ],
  };
  const map = taskStatusByName(sample, now, 3);
  assert.equal(map.get("PRISM Hermes Dream-Cycle Synth"), "disabled");
  // A task not in the sample is simply absent from the map → caller maps to "missing".
  assert.equal(map.has("PRISM Hermes Self-Reflect Weekly"), false);
});

test("taskStatusByName: failure-mode — empty/garbage sample yields an empty map, no throw", () => {
  assert.equal(taskStatusByName({ tasks: [] }, Date.now(), 3).size, 0);
  assert.equal(taskStatusByName({}, Date.now(), 3).size, 0);
  assert.equal(taskStatusByName(null, Date.now(), 3).size, 0);
  // Tasks array with junk entries are skipped, not crashed on.
  assert.equal(taskStatusByName({ tasks: [null, 7, { name: "" }] }, Date.now(), 3).size, 0);
});

// ─── runOnce orchestration — injected sampler/spawn/io (no real PS/engine) ──

function fakeSample(states) {
  // states: { [taskName]: 'Disabled'|'Ready'|... }  — absent ⇒ task missing.
  return () => ({
    tasks: Object.entries(states).map(([name, state]) => ({
      name, state, lastRunTime: "2026-06-04T03:17:00Z", nextRunTime: null,
      lastTaskResult: 0, triggerIntervals: ["P1D"],
    })),
  });
}

test("runOnce: dark task + stale output → would-revive in dry-run, no spawn, no write", () => {
  let spawned = 0;
  const r = runOnce({
    dryRun: true,
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: LEARNING_ENGINES,
    sampler: fakeSample({
      "PRISM Hermes Dream-Cycle Synth": "Disabled",
      "PRISM Hermes Self-Reflect Weekly": "Disabled",
    }),
    // Freshness io: pretend NO output files exist (everything stale).
    _io: { statSync: () => { throw new Error("ENOENT"); } },
    _spawn: () => { spawned++; return { status: 0 }; },
  });
  assert.equal(spawned, 0, "dry-run must never spawn");
  assert.ok(r.outcomes.every((o) => o.action === "would-revive"));
  // P1-1: a planned (dry-run) revival reports level:"planned", NOT "revived" —
  // nothing was actually revived. The level field must not lie about dry state.
  assert.equal(r.level, "planned");
  assert.equal(r.exitCode, 0);
});

test("runOnce: P2-1 — spawns the engine with the canonical --date/--anchor anchor (referential transparency)", () => {
  const seenArgs = [];
  let postRun = false;
  runOnce({
    nowMs: Date.parse("2026-06-08T23:59:59.900Z"), // adversarial: ms before UTC midnight
    engines: LEARNING_ENGINES,
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "Disabled", "PRISM Hermes Self-Reflect Weekly": "Disabled" }),
    _io: { statSync: () => { if (!postRun) throw new Error("ENOENT"); return { isFile: () => true, size: 4096 }; } },
    _spawn: (_node, argv) => { seenArgs.push(argv); postRun = true; return { status: 0 }; },
  });
  // The dream engine must be pinned to 2026-06-08 (the actuator's probed date),
  // NOT left to recompute its own Date.now() which could roll to 06-09.
  const dreamCall = seenArgs.find((a) => a.some((x) => String(x).includes("hermes-dream-cycle-synth")));
  assert.ok(dreamCall, "dream engine was spawned");
  const di = dreamCall.indexOf("--date");
  assert.ok(di >= 0, "dream engine pinned with --date");
  assert.equal(dreamCall[di + 1], "2026-06-08", "pinned to the probed UTC date, not a recomputed one");
  // The reflect engine must be pinned to the most-recent Sunday (2026-06-07).
  const reflectCall = seenArgs.find((a) => a.some((x) => String(x).includes("hermes-self-reflect-populater")));
  assert.ok(reflectCall, "reflect engine was spawned");
  const ai = reflectCall.indexOf("--anchor");
  assert.ok(ai >= 0, "reflect engine pinned with --anchor");
  assert.equal(reflectCall[ai + 1], "2026-06-07", "pinned to the probed Sunday anchor");
});

test("runOnce: fresh output → skip, clean, no spawn (idempotent — happy steady state)", () => {
  let spawned = 0;
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "Ready", "PRISM Hermes Self-Reflect Weekly": "Ready" }),
    _io: { statSync: () => ({ isFile: () => true, size: 4096 }) }, // all fresh
    _spawn: () => { spawned++; return { status: 0 }; },
  });
  assert.equal(spawned, 0, "fresh output must skip the engine");
  assert.ok(r.outcomes.every((o) => o.action === "skip"));
  assert.equal(r.level, "clean");
  assert.equal(r.exitCode, 0);
});

test("runOnce: ADVERSARIAL — engine exits 0 but output never lands → reported FAILED, exit 1 (no fabricated success)", () => {
  let statCall = 0;
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: [LEARNING_ENGINES[0]], // dream-cycle only
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "Disabled" }),
    // First stat (pre-run freshness) AND post-run stat both throw → file never lands.
    _io: { statSync: () => { statCall++; throw new Error("ENOENT"); } },
    _spawn: () => ({ status: 0, stdout: '{"ok":true}' }), // engine LIES green
  });
  assert.ok(statCall >= 2, "must re-check freshness AFTER the engine runs");
  assert.equal(r.outcomes[0].action, "failed");
  assert.match(r.outcomes[0].error, /did not land/);
  assert.equal(r.level, "failed");
  assert.equal(r.exitCode, 1);
});

test("runOnce: ADVERSARIAL — engine spawn nonzero exit → FAILED with captured stderr, exit 1", () => {
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: [LEARNING_ENGINES[0]],
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "stale" }),
    _io: { statSync: () => { throw new Error("ENOENT"); } },
    _spawn: () => ({ status: 2, stderr: "synth boom" }),
  });
  assert.equal(r.outcomes[0].action, "failed");
  assert.match(r.outcomes[0].error, /exited 2/);
  assert.match(r.outcomes[0].error, /synth boom/);
  assert.equal(r.exitCode, 1);
});

test("runOnce: a spawn TIMEOUT (ETIMEDOUT) is benign DEFERRED, never failed -- no false 'loop did not run' alarm", () => {
  // spawnSync KILLS the child + sets error.code ETIMEDOUT when `timeout` is exceeded. A
  // heavy-model synthesis that is merely SLOW under fleet load must NOT be mislabeled a
  // broken engine (which SessionStart surfaces as "the compounding loop did not run").
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: [LEARNING_ENGINES[0]],
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "stale" }),
    _io: { statSync: () => { throw new Error("ENOENT"); } },
    _spawn: () => ({ error: Object.assign(new Error("spawnSync timed out"), { code: "ETIMEDOUT" }), signal: "SIGTERM", status: null }),
  });
  assert.equal(r.outcomes[0].action, "deferred", "a timeout-kill is benign-transient, not a broken engine");
  assert.match(r.outcomes[0].error, /timed out/);
  assert.equal(r.level, "deferred");
  assert.equal(r.exitCode, 0, "deferred is benign -- must NOT exit 1 (failed)");
});

test("runOnce: ADVERSARIAL -- a NON-timeout spawn error (ENOENT) stays FAILED (no over-broadening of deferred)", () => {
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: [LEARNING_ENGINES[0]],
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "stale" }),
    _io: { statSync: () => { throw new Error("ENOENT"); } },
    _spawn: () => ({ error: Object.assign(new Error("not found"), { code: "ENOENT" }), status: null }),
  });
  assert.equal(r.outcomes[0].action, "failed", "a real spawn failure (ENOENT) is still failed, not deferred");
  assert.match(r.outcomes[0].error, /spawn failed: ENOENT/);
  assert.equal(r.level, "failed");
  assert.equal(r.exitCode, 1);
});

test("runOnce: MIXED precedence -- a timeout (deferred) + a genuine failure (failed) in one run -> level failed DOMINATES, exit 1", () => {
  // Production has 2 engines (dream-cycle + self-reflect), so a mixed run is reachable.
  // A real failure must win over a benign timeout (locks the failed>...>deferred ladder
  // against future reordering -- scrutiny arm B P2).
  let call = 0;
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: [LEARNING_ENGINES[0], LEARNING_ENGINES[1]],
    sampler: fakeSample({
      "PRISM Hermes Dream-Cycle Synth": "stale",
      "PRISM Hermes Self-Reflect Weekly": "stale",
    }),
    _io: { statSync: () => { throw new Error("ENOENT"); } },
    // engine 0 times out (-> deferred); engine 1 has a real ENOENT spawn error (-> failed).
    _spawn: () => {
      call += 1;
      return call === 1
        ? { error: Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }), signal: "SIGTERM", status: null }
        : { error: Object.assign(new Error("not found"), { code: "ENOENT" }), status: null };
    },
  });
  assert.deepEqual(r.outcomes.map((o) => o.action).sort(), ["deferred", "failed"], "one deferred timeout + one real failure");
  assert.equal(r.level, "failed", "a genuine failure must DOMINATE a benign timeout");
  assert.equal(r.exitCode, 1, "a mixed run containing a real failure exits 1");
});

test("runOnce: revive succeeds when engine runs AND output lands → revived, exit 0", () => {
  let postRun = false;
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: [LEARNING_ENGINES[0]],
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "Disabled" }),
    // stale before run, fresh after run (the spawn callback flips it).
    _io: { statSync: () => {
      if (!postRun) throw new Error("ENOENT");
      return { isFile: () => true, size: 8192 };
    } },
    _spawn: () => { postRun = true; return { status: 0, stdout: '{"ok":true}' }; },
  });
  assert.equal(r.outcomes[0].action, "revived");
  assert.equal(r.level, "revived");
  assert.equal(r.exitCode, 0);
});

test("runOnce: BLOCKER-FIX (scrutiny C) — a telemetry/chat-bus append THROW must NOT downgrade a successful revival to a measurement failure", () => {
  // The bug: appendFileSync EACCES/ENOSPC after outcomes are finalized `revived`
  // propagated out of runOnce → CLI mapped any throw to exit 2 "measurement
  // failure", losing the success AND the telemetry row the SessionStart hook reads.
  let postRun = false;
  const r = runOnce({
    nowMs: Date.parse("2026-06-08T13:00:00Z"),
    engines: [LEARNING_ENGINES[0]],
    sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "Disabled" }),
    _io: {
      // stale before run, fresh after → a genuine successful revival
      statSync: () => { if (!postRun) throw new Error("ENOENT"); return { isFile: () => true, size: 8192 }; },
      // EVERY append throws (simulates EACCES on the telemetry/chat-bus write)
      appendFileSync: () => { throw new Error("EACCES: permission denied"); },
      mkdirSync: () => {},
    },
    _spawn: () => { postRun = true; return { status: 0, stdout: '{"ok":true}' }; },
  });
  // The revival succeeded and stays succeeded — the append failure is swallowed.
  assert.equal(r.outcomes[0].action, "revived", "append throw must not flip revived→failed");
  assert.equal(r.level, "revived");
  assert.equal(r.exitCode, 0, "a swallowed telemetry write must NOT become exit 2");
});

test("runOnce: measurement failure — sampler throws → propagates (caller maps to exit 2)", () => {
  assert.throws(() => runOnce({
    sampler: () => { throw new Error("PowerShell wedged"); },
    _io: { statSync: () => { throw new Error("ENOENT"); } },
  }), /PowerShell wedged/);
});

test("runOnce: PRISM_OBSIDIAN_REVIVAL_DISABLE=1 forces dry behavior (no spawn, no write)", () => {
  const prev = process.env.PRISM_OBSIDIAN_REVIVAL_DISABLE;
  process.env.PRISM_OBSIDIAN_REVIVAL_DISABLE = "1";
  let spawned = 0;
  try {
    const r = runOnce({
      nowMs: Date.parse("2026-06-08T13:00:00Z"),
      engines: [LEARNING_ENGINES[0]],
      sampler: fakeSample({ "PRISM Hermes Dream-Cycle Synth": "Disabled" }),
      _io: { statSync: () => { throw new Error("ENOENT"); } },
      _spawn: () => { spawned++; return { status: 0 }; },
    });
    assert.equal(spawned, 0);
    assert.equal(r.dryRun, true);
    assert.equal(r.outcomes[0].action, "would-revive");
  } finally {
    if (prev === undefined) delete process.env.PRISM_OBSIDIAN_REVIVAL_DISABLE;
    else process.env.PRISM_OBSIDIAN_REVIVAL_DISABLE = prev;
  }
});

// ─── Config sanity — drift guard against the installer task names ───────────

test("LEARNING_ENGINES: task names match the installer -TaskName defaults (drift guard)", () => {
  const names = LEARNING_ENGINES.map((e) => e.taskName);
  assert.ok(names.includes("PRISM Hermes Dream-Cycle Synth"));
  assert.ok(names.includes("PRISM Hermes Self-Reflect Weekly"));
  // Every engine self-describes the fields the orchestrator depends on.
  for (const e of LEARNING_ENGINES) {
    assert.ok(typeof e.key === "string" && e.key.length > 0);
    assert.ok(e.engine.endsWith(".mjs"));
    assert.ok(["daily", "weekly"].includes(e.period));
    assert.equal(typeof e.freshFile, "function");
    assert.ok(e.freshFile(Date.now()).endsWith(".md"));
  }
  assert.equal(typeof DEFAULT_SPAWN_TIMEOUT_MS, "number");
});
