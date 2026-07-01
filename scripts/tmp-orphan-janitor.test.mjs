// node --test scripts/tmp-orphan-janitor.test.mjs
// Real-value assertions on the janitor's pure decision logic — the safety-critical core.
import { test } from "node:test";
import assert from "node:assert/strict";
import { pidOf, isAlive, classify, isTmpName } from "./tmp-orphan-janitor.mjs";

const MIN = 30 * 60_000;       // 30 min
const NOPID = 24 * 3_600_000;  // 24 h

test("pidOf — atomic-json pattern <name>.tmp-<pid>", () => {
  assert.equal(pidOf("roadmap-index.json.tmp-12345"), 12345);
});
test("pidOf — leaker A <name>.<pid>.tmp", () => {
  assert.equal(pidOf("tribal-embed-index.json.94236.tmp"), 94236);
});
test("pidOf — leaker B <name>.<pid>.<hash>.tmp", () => {
  assert.equal(pidOf("ACTIVE_ROADMAP_CLAIMS.json.10256.43c95520.tmp"), 10256);
});
test("pidOf — bare <name>.tmp has no pid", () => {
  assert.equal(pidOf("tribal-embed-index.json.tmp"), null);
});
test("pidOf — hash-only (no numeric pid segment) is null", () => {
  assert.equal(pidOf("x.json.deadbeef.tmp"), null);
});
test("pidOf — P0 REGRESSION: multi-numeric basename → pid is the segment before .tmp, NOT a date stamp", () => {
  assert.equal(pidOf("HANDOFF-claude-abc.20260529.168704.tmp"), 168704);
  assert.equal(pidOf("ledger.123.168704.tmp"), 168704);
  assert.equal(pidOf("foo.2026.05.29.12345.tmp"), 12345);
});
test("pidOf — hex hash WITH letters → pid is the segment before the hash", () => {
  assert.equal(pidOf("ACTIVE_ROADMAP_CLAIMS.json.10256.43c95520.tmp"), 10256);
});

test("isAlive — dead pid via injected killer that throws ESRCH", () => {
  const killer = () => { const e = new Error("no such process"); e.code = "ESRCH"; throw e; };
  assert.equal(isAlive(99999, killer), false);
});
test("isAlive — alive pid (killer returns)", () => {
  assert.equal(isAlive(1234, () => true), true);
});
test("isAlive — EPERM means alive-but-not-ours", () => {
  const killer = () => { const e = new Error("perm"); e.code = "EPERM"; throw e; };
  assert.equal(isAlive(4, killer), true);
});
test("isAlive — invalid pids rejected", () => {
  assert.equal(isAlive(0, () => true), false);
  assert.equal(isAlive(-5, () => true), false);
  assert.equal(isAlive(null, () => true), false);
});

test("classify — RECLAIM: dead pid, old", () => {
  const v = classify({ name: "x.json.111.tmp", ageMs: MIN + 1, pid: 111, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(v.action, "reclaim");
});
test("classify — KEEP: alive pid is never reclaimed (in-flight 382MB write)", () => {
  const v = classify({ name: "tribal-embed-index.json.222.tmp", ageMs: 10 * NOPID, pid: 222, alive: true, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(v.action, "keep-alive");
});
test("classify — KEEP: dead pid but too young (race-safety window)", () => {
  const v = classify({ name: "x.json.333.tmp", ageMs: MIN - 1, pid: 333, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(v.action, "keep-young");
});
test("classify — no-pid: reclaim only when very old", () => {
  assert.equal(classify({ name: "x.json.tmp", ageMs: NOPID + 1, pid: null, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID }).action, "reclaim");
  assert.equal(classify({ name: "x.json.tmp", ageMs: NOPID - 1, pid: null, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID }).action, "keep-nopid-young");
});
test("classify — non-.tmp is never touched", () => {
  assert.equal(classify({ name: "roadmap-index.json", ageMs: 10 * NOPID, pid: null, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID }).action, "keep-not-tmp");
});

test("isTmpName — accepts all three tmp patterns, rejects canonical files", () => {
  assert.equal(isTmpName("defer-queue.json.tmp-12345"), true);          // .tmp-<pid> family (was wrongly skipped)
  assert.equal(isTmpName("ollama-offload-stats.json.tmp-9"), true);
  assert.equal(isTmpName("tribal-embed-index.json.94236.tmp"), true);   // .<pid>.tmp
  assert.equal(isTmpName("ACTIVE_ROADMAP_CLAIMS.json.10256.43c95520.tmp"), true); // .<pid>.<hash>.tmp
  assert.equal(isTmpName("x.json.tmp"), true);                          // bare .tmp
  assert.equal(isTmpName("defer-queue.json"), false);                  // canonical file — never
  assert.equal(isTmpName("note.tmp-"), false);                         // no numeric pid → not a tmp-<pid>
  assert.equal(isTmpName(null), false);
});

test("classify — P0 GAP FIX: .tmp-<pid> family is reclaimable (was wrongly keep-not-tmp)", () => {
  // Before the 2026-05-30 fix the scan/classify gates only accepted .endsWith('.tmp'),
  // so the dominant leakers (defer-queue.json.tmp-<pid>, ollama-offload-stats.json.tmp-<pid>)
  // were SKIPPED entirely — 3438 orphans / 98.6MB leaked despite the janitor existing (slot golf).
  const dead = classify({ name: "defer-queue.json.tmp-111", ageMs: MIN + 1, pid: 111, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(dead.action, "reclaim");
  const alive = classify({ name: "ollama-offload-stats.json.tmp-222", ageMs: 10 * NOPID, pid: 222, alive: true, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(alive.action, "keep-alive");  // a live writer mid-rename is still spared
  const young = classify({ name: "x.json.tmp-333", ageMs: MIN - 1, pid: 333, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(young.action, "keep-young");
});

test("pidOf — GAP FIX: <name>.tmp.<pid>[.<rand>] family (golf 2026-05-31)", () => {
  // The family matched by NO janitor before this fix — ollama-stats legacy + MACHINE_REGISTRY /
  // fleet-reaper-crash-watch / fleet-task-health writers (65 orphans measured 2026-05-31).
  assert.equal(pidOf("ollama-offload-stats.json.tmp.27168.g0zog5"), 27168); // .tmp.<pid>.<base36>
  assert.equal(pidOf("MACHINE_REGISTRY.json.tmp.12345"), 12345);            // .tmp.<pid>
  assert.equal(pidOf("fleet-task-health-state.json.tmp.999.ab12"), 999);
});
test("isTmpName — GAP FIX: accepts .tmp.<pid>[.<rand>] but NEVER a real *.tmp.<word> file", () => {
  assert.equal(isTmpName("ollama-offload-stats.json.tmp.27168.g0zog5"), true);
  assert.equal(isTmpName("MACHINE_REGISTRY.json.tmp.12345"), true);
  assert.equal(isTmpName(".fleet-task-health-stop.stamp.tmp.4521"), true);
  // SAFETY BOUNDARY: a real file with a non-digit after `.tmp.` must NOT be swept (no \d+ anchor match).
  assert.equal(isTmpName("config.tmp.json"), false);
  assert.equal(isTmpName("data.tmp.backup"), false);
});
test("classify — GAP FIX: dead .tmp.<pid> reclaimed, live one spared", () => {
  const dead = classify({ name: "MACHINE_REGISTRY.json.tmp.111.gx2", ageMs: MIN + 1, pid: 111, alive: false, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(dead.action, "reclaim");
  const alive = classify({ name: "MACHINE_REGISTRY.json.tmp.222.gx2", ageMs: 10 * NOPID, pid: 222, alive: true, minAgeMs: MIN, nopidAgeMs: NOPID });
  assert.equal(alive.action, "keep-alive");
});
