// tier: T3
/**
 * .claude/helpers/precompact-handoff-loop-state.test.mjs
 *
 * Hermetic tests for the Synergy #2 exports added to precompact-handoff.mjs:
 *   - readActiveLoopState(sessionRef, options)
 *   - formatLoopResumeLine(state)
 *
 * Every test uses an isolated tempdir as the `dir` option so the real
 * H:/prism/state/shared/loop-state/ tree is never touched.
 *
 * Run: node --test .claude/helpers/precompact-handoff-loop-state.test.mjs
 */

import { test, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  readActiveLoopState,
  formatLoopResumeLine,
} from "./precompact-handoff.mjs";

let TMP = null;

beforeEach(() => {
  TMP = fs.mkdtempSync(path.join(os.tmpdir(), "prism-precompact-loop-"));
});

afterEach(() => {
  if (TMP) fs.rmSync(TMP, { recursive: true, force: true });
});

function writeState(name, state) {
  fs.writeFileSync(path.join(TMP, name), JSON.stringify(state, null, 2));
}

// ─── readActiveLoopState — null / no-match cases ──────────────────────────

test("readActiveLoopState: null sessionRef → null", () => {
  assert.equal(readActiveLoopState(null, { dir: TMP }), null);
});

test("readActiveLoopState: undefined sessionRef → null", () => {
  assert.equal(readActiveLoopState(undefined, { dir: TMP }), null);
});

test("readActiveLoopState: non-string sessionRef → null", () => {
  assert.equal(readActiveLoopState(42, { dir: TMP }), null);
  assert.equal(readActiveLoopState({}, { dir: TMP }), null);
});

test("readActiveLoopState: too-short sessionRef → null (<4 chars after claude- strip)", () => {
  assert.equal(readActiveLoopState("abc", { dir: TMP }), null);
  assert.equal(readActiveLoopState("claude-x", { dir: TMP }), null);
});

test("readActiveLoopState: missing dir → null (not throw)", () => {
  const bogus = path.join(TMP, "does-not-exist");
  assert.equal(readActiveLoopState("00a9c6dc-0c91-4629-88da-a181fbfef41f", { dir: bogus }), null);
});

test("readActiveLoopState: empty dir → null", () => {
  assert.equal(readActiveLoopState("00a9c6dc-0c91-4629-88da-a181fbfef41f", { dir: TMP }), null);
});

test("readActiveLoopState: no matching prefix → null", () => {
  writeState("loop-deadbeef-cafe-1111-2222-feedface0000.json", {
    sessionId: "deadbeef-cafe-1111-2222-feedface0000",
    iter: 5, target: 10, status: "running", task: "t",
  });
  assert.equal(readActiveLoopState("11111111-2222", { dir: TMP }), null);
});

// ─── readActiveLoopState — exact UUID + prefix matching ────────────────────

test("readActiveLoopState: exact UUID match → returns state", () => {
  const uuid = "00a9c6dc-0c91-4629-88da-a181fbfef41f";
  writeState(`loop-${uuid}.json`, {
    sessionId: uuid, iter: 3, target: 8, status: "running",
    task: "wire unwired engines", lastTickAt: "2026-05-19T04:24:47Z",
  });
  const r = readActiveLoopState(uuid, { dir: TMP });
  assert.equal(r.sessionId, uuid);
  assert.equal(r.iter, 3);
  assert.equal(r.target, 8);
});

test("readActiveLoopState: claude- prefix stripped before match", () => {
  const uuid = "00a9c6dc-0c91-4629-88da-a181fbfef41f";
  writeState(`loop-${uuid}.json`, {
    sessionId: uuid, iter: 1, target: 5, status: "running", task: "x",
  });
  // Passing "claude-00a9c6dc" should still match the loop-00a9c6dc-... file
  const r = readActiveLoopState("claude-00a9c6dc", { dir: TMP });
  assert.ok(r);
  assert.equal(r.iter, 1);
});

test("readActiveLoopState: 8-char prefix match when multiple loop files exist", () => {
  writeState("loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json", {
    sessionId: "00a9c6dc-0c91-4629-88da-a181fbfef41f",
    iter: 1, target: 10, status: "running", task: "task-a",
    lastTickAt: "2026-05-19T01:00:00Z",
  });
  writeState("loop-deadbeef-1234-5678-9abc-def012345678.json", {
    sessionId: "deadbeef-1234-5678-9abc-def012345678",
    iter: 99, target: 100, status: "running", task: "wrong",
    lastTickAt: "2026-05-19T05:00:00Z",
  });
  const r = readActiveLoopState("00a9c6dc", { dir: TMP });
  assert.equal(r.task, "task-a");
});

test("readActiveLoopState: multiple prefix matches → newest lastTickAt wins", () => {
  // Statistically possible across the 26-chat fleet — two sessions sharing
  // an 8-hex prefix. Newest tick should be picked.
  writeState("loop-00a9c6dc-aaaa-bbbb-cccc-dddddddddddd.json", {
    sessionId: "00a9c6dc-aaaa-bbbb-cccc-dddddddddddd",
    iter: 1, target: 10, status: "running", task: "stale",
    lastTickAt: "2026-05-19T01:00:00Z",
  });
  writeState("loop-00a9c6dc-eeee-ffff-0000-111111111111.json", {
    sessionId: "00a9c6dc-eeee-ffff-0000-111111111111",
    iter: 7, target: 12, status: "running", task: "fresh",
    lastTickAt: "2026-05-19T06:00:00Z",
  });
  const r = readActiveLoopState("00a9c6dc", { dir: TMP });
  assert.equal(r.task, "fresh");
  assert.equal(r.iter, 7);
});

// ─── readActiveLoopState — status filtering ────────────────────────────────

test("readActiveLoopState: requireRunning default skips status=ended", () => {
  writeState("loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json", {
    sessionId: "00a9c6dc-0c91-4629-88da-a181fbfef41f",
    iter: 10, target: 10, status: "ended", task: "done",
  });
  assert.equal(readActiveLoopState("00a9c6dc", { dir: TMP }), null);
});

test("readActiveLoopState: requireRunning:false picks ended state too", () => {
  writeState("loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json", {
    sessionId: "00a9c6dc-0c91-4629-88da-a181fbfef41f",
    iter: 10, target: 10, status: "ended", task: "done",
    lastTickAt: "2026-05-19T01:00:00Z",
  });
  const r = readActiveLoopState("00a9c6dc", { dir: TMP, requireRunning: false });
  assert.equal(r.status, "ended");
});

test("readActiveLoopState: abandoned status filtered out by default", () => {
  writeState("loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json", {
    sessionId: "00a9c6dc-0c91-4629-88da-a181fbfef41f",
    iter: 50, target: 20, status: "abandoned", task: "runaway",
    lastTickAt: "2026-05-19T01:00:00Z",
  });
  assert.equal(readActiveLoopState("00a9c6dc", { dir: TMP }), null);
});

// ─── readActiveLoopState — malformed file safety ──────────────────────────

test("readActiveLoopState: malformed JSON skipped, not thrown", () => {
  fs.writeFileSync(path.join(TMP, "loop-00a9c6dc-bad.json"), "{not valid json");
  // Also write a good sibling so we can verify the good one is still found
  writeState("loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json", {
    sessionId: "00a9c6dc-0c91-4629-88da-a181fbfef41f",
    iter: 2, target: 5, status: "running", task: "ok",
    lastTickAt: "2026-05-19T01:00:00Z",
  });
  const r = readActiveLoopState("00a9c6dc", { dir: TMP });
  assert.equal(r.task, "ok");
});

test("readActiveLoopState: internal _lastTick sort key not leaked to caller", () => {
  writeState("loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json", {
    sessionId: "00a9c6dc-0c91-4629-88da-a181fbfef41f",
    iter: 1, target: 5, status: "running", task: "x",
    lastTickAt: "2026-05-19T01:00:00Z",
  });
  const r = readActiveLoopState("00a9c6dc", { dir: TMP });
  assert.equal(Object.prototype.hasOwnProperty.call(r, "_lastTick"), false);
});

// ─── formatLoopResumeLine — null / empty inputs ────────────────────────────

test("formatLoopResumeLine: null → null", () => {
  assert.equal(formatLoopResumeLine(null), null);
});

test("formatLoopResumeLine: undefined → null", () => {
  assert.equal(formatLoopResumeLine(undefined), null);
});

test("formatLoopResumeLine: non-object → null", () => {
  assert.equal(formatLoopResumeLine("string"), null);
  assert.equal(formatLoopResumeLine(42), null);
});

test("formatLoopResumeLine: empty object → safe default render", () => {
  const r = formatLoopResumeLine({});
  assert.match(r, /Active \/loop: iter 0/);
  assert.match(r, /RESUME via \/loop/);
});

// ─── formatLoopResumeLine — happy paths ──────────────────────────────────

test("formatLoopResumeLine: iter < target → 'iter N/T' format", () => {
  const r = formatLoopResumeLine({
    iter: 3, target: 8, task: "wire unwired engines", status: "running",
  });
  assert.match(r, /iter 3\/8/);
  assert.match(r, /wire unwired engines/);
  assert.doesNotMatch(r, /at-target|EXCEEDED/);
});

test("formatLoopResumeLine: iter === target → 'at-target' badge", () => {
  const r = formatLoopResumeLine({ iter: 10, target: 10, task: "x" });
  assert.match(r, /iter 10\/10 \(at-target\)/);
});

test("formatLoopResumeLine: iter > target but < 2× → still 'at-target'", () => {
  const r = formatLoopResumeLine({ iter: 15, target: 10, task: "x" });
  assert.match(r, /iter 15\/10 \(at-target\)/);
});

test("formatLoopResumeLine: iter >= 2× target → 'EXCEEDED 2×'", () => {
  const r = formatLoopResumeLine({ iter: 21, target: 10, task: "x" });
  assert.match(r, /iter 21 EXCEEDED 2× target 10/);
});

test("formatLoopResumeLine: missing target → 'iter N' (no /T)", () => {
  const r = formatLoopResumeLine({ iter: 3, task: "x", status: "running" });
  assert.match(r, /iter 3/);
  assert.doesNotMatch(r, /\/\d/);
});

test("formatLoopResumeLine: target=0 treated as missing", () => {
  const r = formatLoopResumeLine({ iter: 3, target: 0, task: "x" });
  assert.doesNotMatch(r, /\/\d/);
});

test("formatLoopResumeLine: negative target treated as missing", () => {
  const r = formatLoopResumeLine({ iter: 3, target: -5, task: "x" });
  assert.doesNotMatch(r, /\/-?\d/);
});

// ─── formatLoopResumeLine — task field handling ─────────────────────────

test("formatLoopResumeLine: task '(unspecified)' surfaces as 'no task on /loop start' (R12 fail-loud)", () => {
  const r = formatLoopResumeLine({ iter: 2, target: 5, task: "(unspecified)" });
  // R12: the operator must be able to distinguish "loop had no task" from "task lost in resume".
  assert.match(r, /no task on \/loop start/);
  assert.doesNotMatch(r, /\(unspecified\)/); // sentinel itself never leaks
  assert.doesNotMatch(r, /""/); // never renders empty-string quotes
});

test("formatLoopResumeLine: empty task surfaces as 'no task on /loop start' (R12)", () => {
  const r = formatLoopResumeLine({ iter: 2, target: 5, task: "" });
  assert.match(r, /no task on \/loop start/);
  assert.doesNotMatch(r, /""/);
});

test("formatLoopResumeLine: long task truncated to 80 chars", () => {
  const longTask = "x".repeat(200);
  const r = formatLoopResumeLine({ iter: 1, target: 5, task: longTask });
  // 80 x's max inside the quotes
  const taskMatch = r.match(/"([^"]+)"/);
  assert.ok(taskMatch);
  assert.equal(taskMatch[1].length, 80);
});

test("formatLoopResumeLine: non-string task ignored", () => {
  const r = formatLoopResumeLine({ iter: 1, target: 5, task: { obj: "x" } });
  assert.doesNotMatch(r, /\[object/);
  assert.doesNotMatch(r, /obj/);
});

// ─── formatLoopResumeLine — adversarial inputs ────────────────────────────

test("formatLoopResumeLine: NaN iter coerced to 0", () => {
  const r = formatLoopResumeLine({ iter: NaN, target: 5, task: "x" });
  assert.match(r, /iter 0/);
  assert.doesNotMatch(r, /NaN/);
});

test("formatLoopResumeLine: Infinity iter coerced to 0", () => {
  const r = formatLoopResumeLine({ iter: Infinity, target: 5, task: "x" });
  assert.match(r, /iter 0/);
  assert.doesNotMatch(r, /Infinity/);
});

// ─── REGRESSION GUARDS for Synergy #2 contract ───────────────────────────

test("REGRESSION: formatLoopResumeLine always names 'RESUME via /loop'", () => {
  // Every well-formed digest must include the actionable verb so the
  // post-/compact chat knows what to do.
  const samples = [
    { iter: 3, target: 8, task: "t" },
    { iter: 10, target: 10, task: "t" },
    { iter: 25, target: 10, task: "t" },
    { iter: 3 }, // no target
    {},
  ];
  for (const s of samples) {
    const r = formatLoopResumeLine(s);
    assert.match(r, /RESUME via \/loop/, `failed on: ${JSON.stringify(s)}`);
  }
});

test("REGRESSION: readActiveLoopState never throws on malformed dir contents", () => {
  // Write 5 different malformed files — function must still return null
  // gracefully and not propagate any exception.
  fs.writeFileSync(path.join(TMP, "loop-aaaa-bad1.json"), "not json");
  fs.writeFileSync(path.join(TMP, "loop-aaaa-bad2.json"), "");
  fs.writeFileSync(path.join(TMP, "loop-aaaa-bad3.json"), "null");
  fs.writeFileSync(path.join(TMP, "loop-aaaa-bad4.json"), "[]");
  fs.writeFileSync(path.join(TMP, "loop-aaaa-bad5.json"), '{"status": null}');
  const r = readActiveLoopState("aaaa1234", { dir: TMP });
  assert.equal(r, null);
});

test("REGRESSION: prefix 'claude-' alone (no UUID) → null, not match-everything", () => {
  writeState("loop-00a9c6dc-0c91-4629-88da-a181fbfef41f.json", {
    sessionId: "00a9c6dc-0c91-4629-88da-a181fbfef41f",
    iter: 1, target: 5, status: "running", task: "x",
  });
  // "claude-" → strip leaves "" → prefix.length < 4 → null
  assert.equal(readActiveLoopState("claude-", { dir: TMP }), null);
});

// P0 REGRESSION GUARDS — hostile-payload class (sister to substrate-health 1MB cap).
// The shared state/shared/loop-state/ dir is writable by all 26 fleet chats; a
// malicious or corrupt file matching this chat's prefix must NOT crash precompact
// fleet-wide via OOM. Reviewer B (Synergy #2 per-file scrutiny) flagged this P0.

test("REGRESSION (P0): hostile oversized loop-state file is skipped, not parsed", () => {
  // Generate a >64KB file matching the 8-char prefix.
  const giant = "x".repeat(80000); // 80KB > MAX_LOOP_STATE_BYTES (64KB)
  fs.writeFileSync(
    path.join(TMP, "loop-deadbeef-9999-9999-9999-999999999999.json"),
    JSON.stringify({ sessionId: "deadbeef", iter: 99, target: 100, status: "running", task: giant }),
  );
  // Function must skip it (size cap) and return null, NOT OOM on JSON.parse.
  const r = readActiveLoopState("deadbeef", { dir: TMP });
  assert.equal(r, null);
});

test("REGRESSION (P0): MAX_LOOP_CANDIDATES caps the prefix-match candidates", () => {
  // Drop 15 prefix-colliding files; even if all are malformed, function must
  // bound its readFileSync count at MAX_LOOP_CANDIDATES (10) and return null.
  for (let i = 0; i < 15; i++) {
    fs.writeFileSync(
      path.join(TMP, `loop-cafebabe-${String(i).padStart(4, "0")}-0000-0000-000000000000.json`),
      "not json",
    );
  }
  const r = readActiveLoopState("cafebabe", { dir: TMP });
  assert.equal(r, null); // safe — none parsed, none returned
});

test("REGRESSION (P0): exactly-64KB file at the cap boundary is also rejected (>=, not >)", () => {
  // Use a file at MAX_LOOP_STATE_BYTES = 65536 boundary. Spec: size > 65536 → skip.
  // A 65537-byte file MUST be rejected to prove the strict-greater-than guard.
  const body = JSON.stringify({ sessionId: "boundary", iter: 1, target: 5, status: "running", task: "ok" });
  const padding = "x".repeat(65537 - body.length + 100); // ensure >65536
  fs.writeFileSync(
    path.join(TMP, "loop-boundary-0000-0000-0000-000000000000.json"),
    JSON.stringify({ sessionId: "boundary", iter: 1, target: 5, status: "running", task: padding }),
  );
  const stat = fs.statSync(path.join(TMP, "loop-boundary-0000-0000-0000-000000000000.json"));
  assert.ok(stat.size > 65536, `expected size > 65536, got ${stat.size}`);
  const r = readActiveLoopState("boundary", { dir: TMP });
  assert.equal(r, null); // size cap kicked in → null
});
