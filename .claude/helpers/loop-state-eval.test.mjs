// Tests for loop-state.mjs U3 (eval-score capture) + U0 (carry evalsByType through
// roll). Real values; every assertion fails on a real regression (R9). Pure helpers
// tested directly; the U0 carry-forward tested via a real CLI round-trip.
import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEvalScore, welfordUpdate, deriveUnitType } from "./loop-state.mjs";

const HELPER = fileURLToPath(new URL("./loop-state.mjs", import.meta.url));
const STATE_DIR = path.join("H:", "prism", "state", "shared", "loop-state");
const TEST_SID = "__test_u0u3_carry__";
const TEST_FILE = path.join(STATE_DIR, `loop-${TEST_SID}.json`);

function runCli(...args) {
  const r = spawnSync(process.execPath, [HELPER, ...args], { encoding: "utf-8", timeout: 30000 });
  try { return JSON.parse((r.stdout || "").trim().split("\n").pop()); } catch { return { _raw: r.stdout, _err: r.stderr }; }
}
function cleanup() { try { fs.unlinkSync(TEST_FILE); } catch { /* ignore */ } }

// ---- U3: parseEvalScore -- the P0 spurious-PASS guard ----
test("parseEvalScore: bare flag (boolean true) -> null (the spurious-PASS regression oracle)", () => {
  assert.equal(parseEvalScore(true), null);
});
test("parseEvalScore: numeric string -> number", () => {
  assert.equal(parseEvalScore("0.87"), 0.87);
  assert.equal(parseEvalScore("0"), 0);
  assert.equal(parseEvalScore("1"), 1);
});
test("parseEvalScore: junk / absent -> null", () => {
  for (const bad of ["abc", undefined, null, NaN, {}]) assert.equal(parseEvalScore(bad), null);
});

// ---- U3: welfordUpdate ----
test("welfordUpdate: running mean correct over 3 ticks", () => {
  let a = welfordUpdate(undefined, 0.8);
  assert.deepEqual(a, { n: 1, mean: 0.8 });
  a = welfordUpdate(a, 0.4);
  assert.equal(a.n, 2);
  assert.ok(Math.abs(a.mean - 0.6) < 1e-9);
  a = welfordUpdate(a, 0.6);
  assert.equal(a.n, 3);
  assert.ok(Math.abs(a.mean - 0.6) < 1e-9);
});
test("welfordUpdate: corrupt accumulator treated as empty (never NaN)", () => {
  const a = welfordUpdate({ n: "x", mean: null }, 0.5);
  assert.deepEqual(a, { n: 1, mean: 0.5 });
});

// ---- U3: deriveUnitType -- taxonomy must match classifyUnit ----
test("deriveUnitType: explicit type wins", () => {
  assert.equal(deriveUnitType("bridge", "anything"), "bridge");
});
test("deriveUnitType: RGS milestone -> backend-dev (matches classifyUnit)", () => {
  assert.equal(deriveUnitType(undefined, "RGS-PLANNING-LOOP-BRIDGE-MS0/U3: x"), "backend-dev");
});
test("deriveUnitType: no extractable milestone -> unknown (never guesses)", () => {
  assert.equal(deriveUnitType(undefined, "just a free directive"), "unknown");
  assert.equal(deriveUnitType(undefined, ""), "unknown");
});

// ---- U0 + U3: CLI round-trip -- evalsByType survives a roll ----
test("CLI: tick --eval-score stores score + evalsByType, and roll CARRIES it (U0)", () => {
  cleanup();
  try {
    const started = runCli("start", "--session", TEST_SID, "--task", "RGS-PLANNING-LOOP-BRIDGE-MS0/U3: x", "--target", "20");
    assert.equal(started.ok, true);
    const t = runCli("tick", "--session", TEST_SID, "--status", "ok", "--eval-score", "0.8");
    assert.equal(t.evalScore, 0.8);
    const before = runCli("read", "--session", TEST_SID);
    assert.equal(before.iterations[0].evalScore, 0.8);
    assert.deepEqual(before.evalsByType["backend-dev"], { n: 1, mean: 0.8 });
    // Roll onto an explicit next task; evalsByType MUST survive (the U0 fix).
    const rolled = runCli("next", "--session", TEST_SID, "--resume", "NEXT-MS0/U-X: y");
    assert.equal(rolled.rolled, true);
    const after = runCli("read", "--session", TEST_SID);
    assert.equal(after.iterations.length, 0); // fresh roll
    assert.deepEqual(after.evalsByType["backend-dev"], { n: 1, mean: 0.8 }); // CARRIED
  } finally { cleanup(); }
});
test("CLI: bare --eval-score does NOT write a spurious 1.0 (P0 end-to-end)", () => {
  cleanup();
  try {
    runCli("start", "--session", TEST_SID, "--task", "RGS-X-MS0/U1: x", "--target", "20");
    const t = runCli("tick", "--session", TEST_SID, "--status", "ok", "--eval-score");
    assert.equal(t.evalScore, null);
    const s = runCli("read", "--session", TEST_SID);
    assert.equal(s.iterations[0].evalScore, null);
    assert.deepEqual(s.evalsByType, {}); // no spurious accumulation
  } finally { cleanup(); }
});
test("CLI: fail status with no score synthesizes 0.0 (not dropped by U1 null-filter)", () => {
  cleanup();
  try {
    runCli("start", "--session", TEST_SID, "--task", "RGS-X-MS0/U1: x", "--target", "20");
    const t = runCli("tick", "--session", TEST_SID, "--status", "fail");
    assert.equal(t.evalScore, 0.0);
  } finally { cleanup(); }
});
