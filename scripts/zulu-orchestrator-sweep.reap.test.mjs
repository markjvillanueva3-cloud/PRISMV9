/**
 * Tests for reapLoopLedger (U-ZULU-LOOP-REAP, 2026-06-25, slot:zulu).
 *
 * Verifies the loop-ledger self-maintenance helper wired into the zulu
 * orchestrator sweep is FAIL-SOFT (a reap error never throws, never breaks the
 * sweep) and reports the reaped count honestly.
 *
 * Run directly (node:test auto-runs on exit):  node scripts/zulu-orchestrator-sweep.reap.test.mjs
 * (NOT `node --test <file>` -- that runs 0 tests in this portable-node env.)
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { reapLoopLedger } from "./zulu-orchestrator-sweep.mjs";

/** Build a fake spawnSync that returns a fixed result object. */
const fakeSpawn = (result) => () => result;

test("disabled knob -> skipped, never spawns (no work, no IO)", () => {
  let called = false;
  const spy = () => {
    called = true;
    return { status: 0, stdout: '{"reaped":9}' };
  };
  const r = reapLoopLedger({ PRISM_ZULU_LOOP_REAP_DISABLE: "1" }, spy);
  assert.equal(r.ok, false);
  assert.equal(r.skipped, "disabled");
  assert.equal(called, false, "must NOT spawn the subprocess when disabled");
});

test("happy path: status 0 + valid JSON -> ok with real reaped count", () => {
  const r = reapLoopLedger({}, fakeSpawn({ status: 0, stdout: '{"ok":true,"reaped":318}\n', stderr: "" }));
  assert.deepEqual(r, { ok: true, reaped: 318 });
});

test("status 0 + no reaped field -> ok, reaped 0 (clean ledger)", () => {
  const r = reapLoopLedger({}, fakeSpawn({ status: 0, stdout: '{"ok":true}', stderr: "" }));
  assert.equal(r.ok, true);
  assert.equal(r.reaped, 0);
});

// --- failure mode 1: subprocess exits non-zero ---
test("non-zero status -> ok:false with stderr error (fail-soft, no throw)", () => {
  const r = reapLoopLedger({}, fakeSpawn({ status: 1, stdout: "", stderr: "loop-state crashed" }));
  assert.equal(r.ok, false);
  assert.match(r.error, /loop-state crashed/);
  assert.equal(r.reaped, undefined);
});

// --- failure mode 2: spawn could not launch (returns null/undefined) ---
test("null spawn result -> ok:false, never throws", () => {
  const r = reapLoopLedger({}, fakeSpawn(null));
  assert.equal(r.ok, false);
  assert.ok(r.error, "must surface an error string");
});

// --- failure mode 3: spawn itself throws (ENOENT, etc.) ---
test("spawn throws -> caught, ok:false, error never propagates", () => {
  const r = reapLoopLedger({}, () => {
    throw new Error("ENOENT spawn node");
  });
  assert.equal(r.ok, false);
  assert.match(r.error, /ENOENT/);
});

// --- adversarial 1: malformed stdout must not crash, reap still counted as ran ---
test("status 0 + non-JSON stdout -> ok, reaped 0 (subprocess ran, output garbled)", () => {
  const r = reapLoopLedger({}, fakeSpawn({ status: 0, stdout: "<<not json>>", stderr: "" }));
  assert.equal(r.ok, true);
  assert.equal(r.reaped, 0);
});

// --- adversarial 2: a huge stderr must be truncated so it never bloats a log line ---
test("oversized stderr is truncated to <=200 chars", () => {
  const r = reapLoopLedger({}, fakeSpawn({ status: 2, stdout: "", stderr: "x".repeat(500) }));
  assert.equal(r.ok, false);
  assert.ok(r.error.length <= 200, `error len ${r.error.length} must be <=200`);
});

// --- adversarial 3: non-numeric reaped field must coerce to 0, not NaN ---
test("non-numeric reaped field -> coerced to 0 (never NaN)", () => {
  const r = reapLoopLedger({}, fakeSpawn({ status: 0, stdout: '{"reaped":"lots"}', stderr: "" }));
  assert.equal(r.ok, true);
  assert.equal(r.reaped, 0);
  assert.equal(Number.isNaN(r.reaped), false);
});
