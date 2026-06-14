// Tests for loop-state.mjs U5: deriveLoopSignals + attemptAtcsReplan (pure) and the
// cmdNext planningAction wiring (CLI round-trip). Real values; fail on real
// regression (R9). U1 (decidePlanningAction) is the single termination authority.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { deriveLoopSignals, attemptAtcsReplan } from "./loop-state.mjs";

const HELPER = fileURLToPath(new URL("./loop-state.mjs", import.meta.url));
const STATE_DIR = path.join("H:", "prism", "state", "shared", "loop-state");
const TEST_SID = "__test_u5_decide__";
const TEST_FILE = path.join(STATE_DIR, `loop-${TEST_SID}.json`);

function runCli(args, env = {}) {
  const r = spawnSync(process.execPath, [HELPER, ...args], { encoding: "utf-8", timeout: 30000, env: { ...process.env, ...env } });
  try { return JSON.parse((r.stdout || "").trim().split("\n").pop()); } catch { return { _raw: r.stdout, _err: r.stderr }; }
}
function cleanup() { try { fs.unlinkSync(TEST_FILE); } catch { /* ignore */ } }

// ---- deriveLoopSignals (pure) ----
test("deriveLoopSignals: null state -> safe defaults", () => {
  const s = deriveLoopSignals(null);
  assert.deepEqual(s.recentEvals, []);
  assert.equal(s.consecutiveFails, 0);
  assert.equal(s.budgetRemaining, Infinity);
  assert.equal(s.replansSoFar, 0);
});
test("deriveLoopSignals: window + trailing fail run + budget", () => {
  const state = {
    target: 10, iter: 3,
    iterations: [{ evalScore: 0.9 }, { evalScore: 0.1 }, { evalScore: 0.2 }],
  };
  const s = deriveLoopSignals(state);
  assert.deepEqual(s.recentEvals, [0.9, 0.1, 0.2]);
  assert.equal(s.consecutiveFails, 2); // 0.2 and 0.1 < 0.5; 0.9 breaks
  assert.equal(s.budgetRemaining, 7);
});
test("deriveLoopSignals: status-based fail when evalScore absent", () => {
  const state = { target: 5, iter: 3, iterations: [{ status: "ok" }, { status: "fail" }, { status: "fail" }] };
  const s = deriveLoopSignals(state);
  assert.deepEqual(s.recentEvals, []); // no finite scores
  assert.equal(s.consecutiveFails, 2);
});
test("deriveLoopSignals: replansSoFar from replanLog length", () => {
  assert.equal(deriveLoopSignals({ replanLog: [{}, {}] }).replansSoFar, 2);
});

// ---- attemptAtcsReplan: honest by construction ----
test("attemptAtcsReplan: no autonomous-tasks dir -> skipped (never a false 'executed')", () => {
  const r = attemptAtcsReplan({ root: path.join(os.tmpdir(), `no-atcs-${Date.now()}`) });
  assert.equal(r.status, "skipped");
  assert.match(r.reason, /no active ATCS task/);
});

// ---- CLI: planningAction is attached + the decision is correct ----
test("CLI: 2 fail ticks -> next reports planningAction.action == 'replan'", () => {
  cleanup();
  try {
    runCli(["start", "--session", TEST_SID, "--task", "RGS-X-MS0/U1: x", "--target", "10"]);
    runCli(["tick", "--session", TEST_SID, "--status", "fail"]);
    runCli(["tick", "--session", TEST_SID, "--status", "fail"]);
    const nxt = runCli(["next", "--session", TEST_SID, "--resume", "NEXT-MS0/U-Y: z"]);
    assert.ok(nxt.planningAction, "planningAction attached");
    assert.equal(nxt.planningAction.action, "replan");
    assert.equal(nxt.rolled, true); // roll still happens (additive, non-breaking)
  } finally { cleanup(); }
});
test("CLI: --atcs-replan logs an HONEST replanResult (skipped, not false-executed)", () => {
  cleanup();
  try {
    runCli(["start", "--session", TEST_SID, "--task", "RGS-X-MS0/U1: x", "--target", "10"]);
    runCli(["tick", "--session", TEST_SID, "--status", "fail"]);
    runCli(["tick", "--session", TEST_SID, "--status", "fail"]);
    const nxt = runCli(["next", "--session", TEST_SID, "--resume", "NEXT-MS0/U-Y: z", "--atcs-replan"]);
    assert.ok(nxt.replanResult, "replanResult present when --atcs-replan + replan decision");
    assert.ok(["skipped", "deferred"].includes(nxt.replanResult.status), "honest status, never a false executed");
    const after = runCli(["read", "--session", TEST_SID]);
    assert.equal(after.replanLog.length, 1); // logged + carried through the roll
  } finally { cleanup(); }
});
test("CLI: exhausted next -> planningAction.action == 'stop' (single termination authority)", () => {
  cleanup();
  try {
    runCli(["start", "--session", TEST_SID, "--task", "RGS-X-MS0/U1: x", "--target", "10"]);
    const nxt = runCli(["next", "--session", TEST_SID], { PRISM_LOOP_NEXT_NO_PICKUNIT: "1" });
    assert.equal(nxt.exhausted, true);
    assert.equal(nxt.planningAction.action, "stop");
  } finally { cleanup(); }
});
test("CLI: --atcs-replan OFF by default -> no replanResult even on a replan decision", () => {
  cleanup();
  try {
    runCli(["start", "--session", TEST_SID, "--task", "RGS-X-MS0/U1: x", "--target", "10"]);
    runCli(["tick", "--session", TEST_SID, "--status", "fail"]);
    runCli(["tick", "--session", TEST_SID, "--status", "fail"]);
    const nxt = runCli(["next", "--session", TEST_SID, "--resume", "NEXT-MS0/U-Y: z"]);
    assert.equal(nxt.planningAction.action, "replan");
    assert.equal(nxt.replanResult, undefined); // opt-in only
  } finally { cleanup(); }
});
