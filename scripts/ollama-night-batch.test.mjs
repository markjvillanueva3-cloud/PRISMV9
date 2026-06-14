// Tests for ollama-night-batch.mjs (U-NIGHT-BATCH, slot:zulu 2026-06-12).
// R9: each test pins WHY -- the window gate keeps day work unaffected, the
// validator keeps the lane repo-scripts-only (no shell), runJobs isolates job
// failures, and a corrupt registry fails LOUD running nothing.
// Pure core tested hermetically (runImpl/logImpl injected); the live registry
// file is validated as real data (it must parse with the shipped schema).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import {
  inWindow,
  jobInvalidReason,
  parseRegistry,
  runJobs,
  REGISTRY_PATH,
} from "./ollama-night-batch.mjs";

// ── inWindow (wrapping + edges) ──────────────────────────────────────────────

test("inWindow: wraps midnight (22..6): 23 and 2 in; 12 and 21 out; boundary 22 in, 6 out", () => {
  assert.equal(inWindow(23, 22, 6), true);
  assert.equal(inWindow(2, 22, 6), true);
  assert.equal(inWindow(12, 22, 6), false);
  assert.equal(inWindow(21, 22, 6), false);
  assert.equal(inWindow(22, 22, 6), true, "start boundary inclusive");
  assert.equal(inWindow(6, 22, 6), false, "end boundary exclusive");
});

test("inWindow: non-wrapping window + degenerate/garbage hours (failure modes)", () => {
  assert.equal(inWindow(3, 1, 5), true);
  assert.equal(inWindow(5, 1, 5), false);
  assert.equal(inWindow(4, 4, 4), false, "zero-width window is never in");
  assert.equal(inWindow(NaN, 22, 6), false);
  assert.equal(inWindow(-1, 22, 6), false);
  assert.equal(inWindow(24, 22, 6), false);
});

// ── jobInvalidReason (the no-shell contract) ─────────────────────────────────

test("jobInvalidReason: valid node job passes; non-node cmd[0] rejected", () => {
  assert.equal(jobInvalidReason({ id: "x", cmd: ["node", "scripts/a.mjs"], timeoutMs: 1000 }), null);
  assert.match(jobInvalidReason({ id: "x", cmd: ["powershell", "evil.ps1"], timeoutMs: 1000 }), /must be 'node'/);
});

test("jobInvalidReason: ADVERSARIAL shell metacharacters in any arg are rejected", () => {
  for (const evil of ["a;rm -rf /", "a|b", "a&&b", "$(boom)", "a>out", "`tick`"]) {
    assert.match(
      jobInvalidReason({ id: "x", cmd: ["node", evil], timeoutMs: 1000 }) || "",
      /metacharacters/,
      `arg ${JSON.stringify(evil)} must be rejected`
    );
  }
});

test("jobInvalidReason: missing id / short cmd / bad timeout all rejected (failure modes)", () => {
  assert.ok(jobInvalidReason({ cmd: ["node", "scripts/a.mjs"], timeoutMs: 1000 }));
  assert.ok(jobInvalidReason({ id: "x", cmd: ["node"], timeoutMs: 1000 }));
  assert.ok(jobInvalidReason({ id: "x", cmd: ["node", "scripts/a.mjs"], timeoutMs: 0 }));
  assert.ok(jobInvalidReason({ id: "x", cmd: ["node", "scripts/a.mjs"], timeoutMs: "soon" }));
  assert.ok(jobInvalidReason({ id: "x", cmd: ["node", "scripts/a.mjs"], timeoutMs: true }), "boolean timeout would coerce to 1ms instant-kill");
  assert.ok(jobInvalidReason(null));
});

test("jobInvalidReason: ADVERSARIAL repo-script confinement -- node options / absolute / traversal rejected (scrutiny P1)", () => {
  // Without cmd[1] confinement these all EXECUTED: -e runs arbitrary JS with
  // zero metacharacters; absolute + ../ escape the repo.
  for (const evil of [
    ["node", "-e", "anything"],
    ["node", "--eval", "anything"],
    ["node", "C:/anywhere/evil.mjs"],
    ["node", "/tmp/evil.mjs"],
    ["node", "../outside.mjs"],
    ["node", "scripts/../outside.mjs"],
    ["node", "scripts/evil.ps1"],
  ]) {
    assert.match(
      jobInvalidReason({ id: "x", cmd: evil, timeoutMs: 1000 }) || "",
      /relative repo script/,
      `${JSON.stringify(evil)} must be rejected`
    );
  }
  // The confinement must not over-reject real shapes: script flags AFTER the
  // script path may start with '-'.
  assert.equal(jobInvalidReason({ id: "x", cmd: ["node", "scripts/a.mjs", "--out", "--next-count", "2"], timeoutMs: 1000 }), null);
});

// ── parseRegistry ────────────────────────────────────────────────────────────

test("parseRegistry: corrupt JSON / wrong schema / dup ids / bad job all FAIL LOUD (nothing runs)", () => {
  assert.equal(parseRegistry("{ torn").ok, false);
  assert.equal(parseRegistry(JSON.stringify({ schemaVersion: "9.9.9", jobs: [] })).ok, false);
  const dup = { schemaVersion: "1.0.0", jobs: [
    { id: "a", cmd: ["node", "scripts/x.mjs"], timeoutMs: 1 },
    { id: "a", cmd: ["node", "scripts/y.mjs"], timeoutMs: 1 },
  ] };
  assert.match(parseRegistry(JSON.stringify(dup)).error, /duplicate/);
  const bad = { schemaVersion: "1.0.0", jobs: [{ id: "a", cmd: ["sh", "x"], timeoutMs: 1 }] };
  assert.equal(parseRegistry(JSON.stringify(bad)).ok, false);
});

test("parseRegistry: degenerate window (zero-width / out-of-range / non-integer) FAILS LOUD", () => {
  const mk = (window) => JSON.stringify({ schemaVersion: "1.0.0", window, jobs: [] });
  assert.match(parseRegistry(mk({ startHour: 6, endHour: 6 })).error, /zero-width/);
  assert.equal(parseRegistry(mk({ startHour: 25, endHour: 6 })).ok, false);
  assert.equal(parseRegistry(mk({ startHour: "22", endHour: 6 })).ok, false);
  assert.equal(parseRegistry(mk({ startHour: 22, endHour: 6 })).ok, true, "the shipped window shape stays valid");
});

test("parseRegistry: the SHIPPED live registry parses clean AND every target script exists on disk", () => {
  const r = parseRegistry(readFileSync(REGISTRY_PATH, "utf8"));
  assert.equal(r.ok, true, r.error);
  assert.ok(r.registry.jobs.length >= 2, "seeded with the verified probe + miner jobs");
  for (const j of r.registry.jobs) {
    assert.equal(jobInvalidReason(j), null);
    // A renamed/deleted target would otherwise fail silently at 22:23 (the
    // task-health watchdog only counts HRESULT launch failures -- scrutiny P2).
    assert.ok(existsSync(`H:/prism/${j.cmd[1]}`), `registry target missing on disk: ${j.cmd[1]}`);
  }
});

// ── runJobs (isolation + accounting) ─────────────────────────────────────────

test("runJobs: one job failing never stops the next; accounting + log rows correct", () => {
  const logged = [];
  const jobs = [
    { id: "ok1", cmd: ["node", "a.mjs"], timeoutMs: 5 },
    { id: "boom", cmd: ["node", "b.mjs"], timeoutMs: 5 },
    { id: "off", cmd: ["node", "c.mjs"], timeoutMs: 5, enabled: false },
    { id: "ok2", cmd: ["node", "d.mjs"], timeoutMs: 5 },
  ];
  const r = runJobs(jobs, {
    runImpl: (cmd) => (cmd[1] === "b.mjs"
      ? { status: 1, stdout: "", stderr: "kaboom" }
      : { status: 0, stdout: "fine", stderr: "" }),
    logImpl: (row) => logged.push(row),
    nowIso: () => "2026-06-12T23:00:00Z",
  });
  assert.equal(r.ran, 2);
  assert.equal(r.failed, 1);
  assert.equal(r.skipped, 1);
  assert.equal(logged.length, 3, "disabled job logs nothing");
  assert.equal(logged[1].jobId, "boom");
  assert.equal(logged[1].exitCode, 1);
  assert.match(logged[1].tail, /kaboom/);
  assert.equal(logged[2].jobId, "ok2", "job AFTER the failure still ran");
});

test("runJobs: between-jobs window re-check stops remaining jobs when the window closes mid-run (scrutiny P2)", () => {
  let checks = 0;
  const logged = [];
  const r = runJobs(
    [
      { id: "j1", cmd: ["node", "scripts/a.mjs"], timeoutMs: 5 },
      { id: "j2", cmd: ["node", "scripts/b.mjs"], timeoutMs: 5 },
      { id: "j3", cmd: ["node", "scripts/c.mjs"], timeoutMs: 5 },
    ],
    {
      runImpl: () => ({ status: 0, stdout: "ok", stderr: "" }),
      logImpl: (row) => logged.push(row),
      windowCheck: () => ++checks <= 1, // in-window for the first job only
    }
  );
  assert.equal(r.ran, 1, "first job ran (was in-window at entry)");
  assert.equal(r.skippedWindow, 2, "both later jobs skipped after the window closed");
  assert.equal(logged[1].skipped, "window-closed");
  assert.equal(logged[2].jobId, "j3", "every skipped job is individually logged");
  // Back-compat: no windowCheck -> nothing window-skipped (pinned by the value, not absence)
  const noCheck = runJobs([{ id: "j1", cmd: ["node", "scripts/a.mjs"], timeoutMs: 5 }],
    { runImpl: () => ({ status: 0, stdout: "", stderr: "" }), logImpl: () => {} });
  assert.equal(noCheck.skippedWindow, 0);
});

test("runJobs: ADVERSARIAL runImpl throw and timeout(null status) are contained as failures", () => {
  const r = runJobs(
    [
      { id: "throws", cmd: ["node", "x.mjs"], timeoutMs: 5 },
      { id: "timesout", cmd: ["node", "y.mjs"], timeoutMs: 5 },
    ],
    {
      runImpl: (cmd) => {
        if (cmd[1] === "x.mjs") throw new Error("spawn exploded");
        return { status: null, stdout: "", stderr: "" }; // timeout/kill shape
      },
      logImpl: () => {},
    }
  );
  assert.equal(r.failed, 2);
  assert.equal(r.ran, 0);
  assert.match(r.rows[0].tail, /spawn exploded/);
  assert.equal(r.rows[1].exitCode, -1, "null status maps to -1, never a silent 0");
});
