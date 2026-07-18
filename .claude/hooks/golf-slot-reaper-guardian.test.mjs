// Unit tests for golf-slot-reaper-guardian.mjs pure helpers.
//
// Focus: isTransientQueryResult must distinguish a TRANSIENT schtasks failure
// (4s timeout / spawn-refusal -> r.status null / r.error set / killed by signal)
// from a CLEAN process exit. Conflating the two was the root cause of the
// 2026-06-14 false "reaper NOT REGISTERED" alarm that fired while the durable
// task was REGISTERED + Running (prior art:
// reference_reaper_guardian_false_negative_2026_05_26). A transient failure must
// degrade to "query-failed" (UNKNOWN, no alarm), NOT "not-registered" (a hard
// "reaper down -> elevated re-register" advisory).
import { test } from "node:test";
import assert from "node:assert/strict";
import { isTransientQueryResult } from "./golf-slot-reaper-guardian.mjs";

// --- TRANSIENT (must NOT be read as "task absent") ---

test("spawnSync timeout (SIGTERM, status null) is transient", () => {
  // This is the exact shape spawnSync returns on `timeout:` expiry.
  assert.equal(isTransientQueryResult({ status: null, signal: "SIGTERM", stdout: "", stderr: "" }), true);
});

test("spawn-refusal under load (r.error set, status null) is transient", () => {
  assert.equal(isTransientQueryResult({ error: new Error("spawn ENOMEM"), status: null }), true);
});

test("status undefined is transient", () => {
  assert.equal(isTransientQueryResult({ status: undefined }), true);
});

test("null / undefined result is transient (defensive)", () => {
  assert.equal(isTransientQueryResult(null), true);
  assert.equal(isTransientQueryResult(undefined), true);
});

// --- CLEAN verdict (a real schtasks answer -> NOT transient) ---

test("clean not-found (status 1, no error/signal) is NOT transient", () => {
  // schtasks ran and reported the task genuinely absent -> downstream "not-registered" is correct.
  assert.equal(isTransientQueryResult({ status: 1, stdout: "", signal: null, error: undefined }), false);
});

test("clean success (status 0, real output) is NOT transient", () => {
  assert.equal(isTransientQueryResult({
    status: 0,
    stdout: "TaskName: \\PRISM Fleet Reaper\nStatus: Ready\nNext Run Time: 6/14/2026 11:48:32 AM",
  }), false);
});

// --- ADVERSARIAL: a clean nonzero exit must stay non-transient even with empty stdout ---

test("status 0 with empty stdout is still NOT transient (clean exit; downstream handles empty)", () => {
  // A clean exit with empty stdout is NOT a transient spawn failure -- it is a real
  // (if odd) verdict; the !r.stdout gate downstream handles it, not the transient path.
  assert.equal(isTransientQueryResult({ status: 0, stdout: "" }), false);
});
