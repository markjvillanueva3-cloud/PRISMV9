/**
 * fleet-reaper-hunt.test.mjs — FLEET-REAPER / SYSTEM-reaper + --hunt unit.
 *
 * Covers the 2026-05-18 additions to fleet-reaper-sweep.mjs:
 *   - classifyKillError  — names an "access denied" kill failure so the report
 *     can explain WHY a process survived (an unprivileged runner cannot kill
 *     it; the SYSTEM-principal scheduled task will).
 *   - reapProcesses      — now tags every kill result with `errorClass`.
 *   - buildHuntReport    — the --hunt Task-Manager view (every node/bash/git
 *     target + reap verdict, heaviest-RSS first).
 *   - parseArgs --hunt   — the new one-shot scan mode flag.
 *
 * Real reference values + algebraic invariants — no truthy-only stubs.
 * Run: node --test scripts/__tests__/fleet-reaper-hunt.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  classifyKillError,
  buildHuntReport,
  reapProcesses,
  parseArgs,
} from "../fleet-reaper-sweep.mjs";

// ─── classifyKillError ──────────────────────────────────────────────────────

test("classifyKillError: null / empty / undefined → ok (no failure)", () => {
  assert.equal(classifyKillError(null), "ok");
  assert.equal(classifyKillError(undefined), "ok");
  assert.equal(classifyKillError(""), "ok");
});

test("classifyKillError: access-denied — every spelling the OS / Node emit", () => {
  // PowerShell Stop-Process, .NET, and POSIX all phrase this differently.
  for (const msg of [
    "Access is denied",
    "Cannot stop process: Access is denied.",
    "AccessDenied",
    "PermissionDenied",
    "kill EPERM",
    "operation not permitted",
    "Permission denied",
  ]) {
    assert.equal(classifyKillError(msg), "access-denied", `msg=${msg}`);
  }
});

test("classifyKillError: not-found — process already gone is not a real failure", () => {
  for (const msg of [
    "Cannot find a process with the process identifier 1234.",
    "No running process",
    "no process found",
    "kill ESRCH",
  ]) {
    assert.equal(classifyKillError(msg), "not-found", `msg=${msg}`);
  }
});

test("classifyKillError: an unrecognized failure → other", () => {
  assert.equal(classifyKillError("timeout after 10000ms"), "other");
  assert.equal(classifyKillError("unexpected PS output: garbage"), "other");
  assert.equal(classifyKillError("kill failed"), "other");
});

test("classifyKillError: case-insensitive (PS / .NET capitalize unpredictably)", () => {
  assert.equal(classifyKillError("ACCESS IS DENIED"), "access-denied");
  assert.equal(classifyKillError("access is denied"), "access-denied");
  assert.equal(classifyKillError("aCcEsS Is DeNiEd"), "access-denied");
});

test("classifyKillError: ADVERSARIAL non-string inputs never throw", () => {
  // .error could in principle be coerced from a non-string upstream. The
  // early-return only short-circuits the literal `null`/`undefined`/`""`
  // inputs; any other non-string is stringified then classified — garbage
  // lands in "other" (the honest "unrecognized" bucket; classifying garbage
  // as "ok" would mask a real failure).
  assert.equal(classifyKillError(42), "other");
  assert.equal(classifyKillError(NaN), "other");
  assert.equal(classifyKillError({}), "other");
  assert.equal(classifyKillError([]), "other");        // String([]) === "" but not the raw "" → falls through to other
  assert.equal(classifyKillError({ toString: () => "Access is denied" }), "access-denied");
});

// ─── reapProcesses — errorClass tagging ─────────────────────────────────────

test("reapProcesses: empty / non-array pids → [] (no killer call)", () => {
  let called = false;
  const killer = () => { called = true; return []; };
  assert.deepEqual(reapProcesses([], { killer }), []);
  assert.deepEqual(reapProcesses(null, { killer }), []);
  assert.deepEqual(reapProcesses(undefined, { killer }), []);
  assert.equal(called, false, "killer must not run for an empty pid set");
});

test("reapProcesses: dry-run never kills and tags errorClass ok", () => {
  const out = reapProcesses([111, 222], { dryRun: true, killer: () => { throw new Error("killed in dry-run!"); } });
  assert.equal(out.length, 2);
  for (const r of out) {
    assert.equal(r.killed, false);
    assert.equal(r.dryRun, true);
    assert.equal(r.errorClass, "ok");
  }
});

test("reapProcesses: a killed process is tagged errorClass ok", () => {
  const killer = (pids) => pids.map((pid) => ({ pid, killed: true, error: null }));
  const out = reapProcesses([5], { killer });
  assert.equal(out[0].killed, true);
  assert.equal(out[0].errorClass, "ok");
});

test("reapProcesses: an access-denied failure is tagged errorClass access-denied", () => {
  // The load-bearing case — this is the PID a SYSTEM scheduled task reaps.
  const killer = (pids) => pids.map((pid) => ({ pid, killed: false, error: "Access is denied" }));
  const out = reapProcesses([9001], { killer });
  assert.equal(out[0].killed, false);
  assert.equal(out[0].errorClass, "access-denied");
});

test("reapProcesses: mixed kill results each get their own errorClass", () => {
  const killer = () => [
    { pid: 1, killed: true, error: null },
    { pid: 2, killed: false, error: "Access is denied" },
    { pid: 3, killed: false, error: "Cannot find a process with the process identifier 3." },
    { pid: 4, killed: false, error: "timeout" },
  ];
  const out = reapProcesses([1, 2, 3, 4], { killer });
  assert.equal(out.find((r) => r.pid === 1).errorClass, "ok");
  assert.equal(out.find((r) => r.pid === 2).errorClass, "access-denied");
  assert.equal(out.find((r) => r.pid === 3).errorClass, "not-found");
  assert.equal(out.find((r) => r.pid === 4).errorClass, "other");
});

// ─── buildHuntReport ────────────────────────────────────────────────────────

const SAMPLE_CLASSIFIED = [
  { pid: 100, name: "node.exe", class: "owned-by-alive", isCandidate: false, ageMs: 60000, rssBytes: 50 * 1024 * 1024, ownerSlot: "alpha", ownerStatus: "alive" },
  { pid: 200, name: "node.exe", class: "unowned", isCandidate: true, ageMs: 900000, rssBytes: 600 * 1024 * 1024, ownerSlot: null, ownerStatus: null },
  { pid: 300, name: "bash.exe", class: "owned-by-crashed", isCandidate: true, ageMs: 1200000, rssBytes: 10 * 1024 * 1024, ownerSlot: "bravo", ownerStatus: "crashed" },
  { pid: 400, name: "git.exe", class: "protected", isCandidate: false, ageMs: 5000, rssBytes: 2 * 1024 * 1024, ownerSlot: null, ownerStatus: null },
];

test("buildHuntReport: one row per classified target, heaviest RSS first", () => {
  const { rows } = buildHuntReport(SAMPLE_CLASSIFIED, []);
  assert.equal(rows.length, 4);
  assert.deepEqual(rows.map((r) => r.pid), [200, 100, 300, 400],
    "rows must be sorted by rssBytes descending");
});

test("buildHuntReport: willReap + verdict come from the candidate decisions", () => {
  const candidateReport = [
    { pid: 200, willReap: true, decision: "confirmed orphan for 900s" },
    { pid: 300, willReap: false, decision: "confirming (300s/600s — ~300s left)" },
  ];
  const { rows } = buildHuntReport(SAMPLE_CLASSIFIED, candidateReport);
  const r200 = rows.find((r) => r.pid === 200);
  const r300 = rows.find((r) => r.pid === 300);
  const r100 = rows.find((r) => r.pid === 100);
  assert.equal(r200.willReap, true);
  assert.equal(r200.verdict, "confirmed orphan for 900s");
  assert.equal(r300.willReap, false);
  assert.equal(r300.verdict, "confirming (300s/600s — ~300s left)");
  // A non-candidate with no decision gets the protected verdict.
  assert.equal(r100.willReap, false);
  assert.match(r100.verdict, /protected/);
});

test("buildHuntReport: a candidate with NO ledger decision is labelled honestly", () => {
  // pid 200 is isCandidate but absent from candidateReport.
  const { rows } = buildHuntReport(SAMPLE_CLASSIFIED, []);
  const r200 = rows.find((r) => r.pid === 200);
  assert.equal(r200.isCandidate, true);
  assert.equal(r200.willReap, false);
  assert.match(r200.verdict, /candidate \(no ledger decision/);
});

test("buildHuntReport: summary counts are internally consistent", () => {
  const candidateReport = [{ pid: 200, willReap: true, decision: "confirmed" }];
  const { rows, summary } = buildHuntReport(SAMPLE_CLASSIFIED, candidateReport);
  assert.equal(summary.totalTargets, rows.length);
  assert.equal(summary.candidates, rows.filter((r) => r.isCandidate).length);
  assert.equal(summary.candidates, 2);                       // pids 200, 300
  assert.equal(summary.protectedCount, rows.filter((r) => !r.isCandidate).length);
  assert.equal(summary.protectedCount, 2);                   // pids 100, 400
  assert.equal(summary.willReap, 1);                         // only pid 200 decided
  assert.equal(summary.candidates + summary.protectedCount, summary.totalTargets,
    "every target is either a candidate or protected");
  const rssSum = SAMPLE_CLASSIFIED.reduce((s, c) => s + c.rssBytes, 0);
  assert.equal(summary.totalRssBytes, rssSum);
});

test("buildHuntReport: FAILURE MODE — non-array classified → empty report, no throw", () => {
  for (const bad of [null, undefined, {}, 42, "nope"]) {
    const { rows, summary } = buildHuntReport(bad, []);
    assert.deepEqual(rows, []);
    assert.equal(summary.totalTargets, 0);
    assert.equal(summary.totalRssBytes, 0);
  }
});

test("buildHuntReport: FAILURE MODE — non-array candidateReport tolerated", () => {
  const { rows } = buildHuntReport(SAMPLE_CLASSIFIED, null);
  assert.equal(rows.length, 4);
  for (const r of rows) assert.equal(r.willReap, false);
});

test("buildHuntReport: ADVERSARIAL — missing fields default safely", () => {
  const classified = [
    { pid: 7 },                                               // only a pid
    { pid: 8, rssBytes: NaN, ageMs: Infinity, name: null },   // bad numerics
  ];
  const { rows } = buildHuntReport(classified, []);
  assert.equal(rows.length, 2);
  for (const r of rows) {
    assert.equal(r.rssBytes, null, "non-finite rssBytes → null");
    assert.equal(r.ageMs, null, "non-finite ageMs → null");
    assert.equal(typeof r.name, "string");
    assert.equal(typeof r.class, "string");
    assert.equal(r.isCandidate, false);
  }
});

test("buildHuntReport: empty classified → zeroed summary", () => {
  const { rows, summary } = buildHuntReport([], []);
  assert.deepEqual(rows, []);
  assert.deepEqual(summary, {
    totalTargets: 0, candidates: 0, willReap: 0, protectedCount: 0, totalRssBytes: 0,
  });
});

// ─── parseArgs — the --hunt flag ────────────────────────────────────────────

test("parseArgs: --hunt sets args.hunt, no errors", () => {
  const { args, errors } = parseArgs(["--hunt"]);
  assert.equal(args.hunt, true);
  assert.deepEqual(errors, []);
});

test("parseArgs: --hunt --dry-run is a valid report-only scan", () => {
  const { args, errors } = parseArgs(["--hunt", "--dry-run"]);
  assert.equal(args.hunt, true);
  assert.equal(args.dryRun, true);
  assert.deepEqual(errors, []);
});

test("parseArgs: --hunt --json is valid", () => {
  const { args, errors } = parseArgs(["--hunt", "--json"]);
  assert.equal(args.hunt, true);
  assert.equal(args.json, true);
  assert.deepEqual(errors, []);
});

test("parseArgs: --hunt with --monitor-loop / --status is rejected", () => {
  const a = parseArgs(["--hunt", "--monitor-loop"]);
  assert.ok(a.errors.some((e) => e.includes("--hunt")), "monitor-loop combo must error");
  const b = parseArgs(["--hunt", "--status"]);
  assert.ok(b.errors.some((e) => e.includes("--hunt")), "status combo must error");
});

test("parseArgs: --hunt with --detach is rejected (report would be discarded)", () => {
  const { errors } = parseArgs(["--hunt", "--detach"]);
  assert.ok(errors.some((e) => e.includes("--hunt") && e.includes("--detach")));
});

test("parseArgs: --hunt=value is rejected — it is a boolean flag", () => {
  const { errors } = parseArgs(["--hunt=foo"]);
  assert.ok(errors.some((e) => e.includes("--hunt") && e.includes("does not take a value")));
});

test("parseArgs: a bare sweep does NOT set hunt (default off)", () => {
  const { args } = parseArgs(["--once"]);
  assert.equal(args.hunt, false);
});
