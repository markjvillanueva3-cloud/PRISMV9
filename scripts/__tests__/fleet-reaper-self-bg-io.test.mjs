/**
 * FLEET-REAPER-MS3/U-FR-MS3-D — reaper self-IO priority guard tests.
 *
 * 14 cases:
 *   1-5  shouldEngage gating (kill switch, master kill, platform, dry-run, status, clean)
 *   6-9  setSelfPriority (apply, throw fail-soft, unknown level, mock injection)
 *   10-11 begin/end pair (round-trip + idempotent end)
 *   12   exit-hook registration (latch idempotent)
 *   13   LEGACY PARITY — disabled path produces zero side-effects
 *   14   REAL-PROCESS ORACLE — spawn a child node, set priority, read it back
 *
 * Test-runner: node:test (matches MS2 pattern; vitest is not used for new
 * fleet-reaper tests per existing convention in the repo).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import {
  shouldEngage,
  setSelfPriority,
  beginBackgroundMode,
  endBackgroundMode,
  registerExitRestore,
  _resetForTest,
  _peekForTest,
} from "../lib/reaper-self-io-priority.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Build a hermetic os-mock that records calls and lets a test assert what
 * the helper did. Default: setPriority succeeds silently.
 */
function makeOsMock({ throwOnSet = false } = {}) {
  const calls = [];
  return {
    calls,
    mock: {
      constants: {
        priority: {
          // Per Node docs: nice-style values; higher = lower priority.
          PRIORITY_NORMAL: 0,
          PRIORITY_BELOW_NORMAL: 10,
        },
      },
      setPriority(pid, value) {
        calls.push({ pid, value });
        if (throwOnSet) throw new Error("simulated EPERM");
      },
    },
  };
}

// 1 — kill switch
test("shouldEngage: PRISM_FR_SELF_BG_IO_DISABLE=1 blocks engage", () => {
  const r = shouldEngage({ env: { PRISM_FR_SELF_BG_IO_DISABLE: "1" }, platform: "win32" });
  assert.deepEqual(r, { ok: false, reason: "disabled-by-env" });
});

// 2 — master fleet-reaper kill switch
test("shouldEngage: PRISM_FLEET_REAPER_DISABLE=1 also blocks engage", () => {
  const r = shouldEngage({ env: { PRISM_FLEET_REAPER_DISABLE: "1" }, platform: "win32" });
  assert.deepEqual(r, { ok: false, reason: "master-disabled" });
});

// 3 — non-Windows is a no-op
test("shouldEngage: non-win32 platform blocks engage", () => {
  const r = shouldEngage({ env: {}, platform: "linux" });
  assert.equal(r.ok, false);
  assert.ok(r.reason && r.reason.startsWith("unsupported-platform:"), `got: ${r.reason}`);
});

// 4 — dry-run blocks
test("shouldEngage: dryRun true blocks engage", () => {
  const r = shouldEngage({ env: {}, platform: "win32", dryRun: true });
  assert.deepEqual(r, { ok: false, reason: "dry-run" });
});

// 5 — status mode is read-only
test("shouldEngage: mode=status blocks engage", () => {
  const r = shouldEngage({ env: {}, platform: "win32", mode: "status" });
  assert.deepEqual(r, { ok: false, reason: "status-mode" });
});

// 6 — clean win32 path engages
test("shouldEngage: win32 + no flags returns ok:true", () => {
  const r = shouldEngage({ env: {}, platform: "win32" });
  assert.deepEqual(r, { ok: true });
});

// 7 — setSelfPriority applies via injected os
test("setSelfPriority: applies BELOW_NORMAL via injected os.setPriority", () => {
  const { mock, calls } = makeOsMock();
  const r = setSelfPriority("BELOW_NORMAL", { env: {}, platform: "win32", os: mock });
  assert.deepEqual(r, { applied: true, level: "BELOW_NORMAL", value: 10 });
  assert.deepEqual(calls, [{ pid: 0, value: 10 }]);
});

// 8 — setSelfPriority fail-soft on throw
test("setSelfPriority: throwing os.setPriority returns applied:false (no rethrow)", () => {
  const { mock } = makeOsMock({ throwOnSet: true });
  const r = setSelfPriority("BELOW_NORMAL", { env: {}, platform: "win32", os: mock });
  assert.equal(r.applied, false);
  assert.ok(r.reason && r.reason.startsWith("set-priority-failed:"), `got: ${r.reason}`);
  assert.ok(r.reason.includes("simulated EPERM"));
});

// 9 — unknown level
test("setSelfPriority: unknown level returns unknown-level reason", () => {
  const { mock } = makeOsMock();
  const r = setSelfPriority("HIGH", { env: {}, platform: "win32", os: mock });
  assert.deepEqual(r, { applied: false, level: "HIGH", reason: "unknown-level" });
});

// 10 — begin/end round-trip
test("beginBackgroundMode → endBackgroundMode round-trip restores NORMAL", () => {
  const { mock, calls } = makeOsMock();
  const guard = beginBackgroundMode({ env: {}, platform: "win32", os: mock });
  assert.equal(guard.engaged, true);
  assert.equal(guard.level, "BELOW_NORMAL");
  assert.deepEqual(calls[0], { pid: 0, value: 10 });

  const r = endBackgroundMode(guard);
  assert.deepEqual(r, { restored: true, level: "NORMAL" });
  assert.deepEqual(calls[1], { pid: 0, value: 0 });
  // guard now disengaged
  assert.equal(guard.engaged, false);
});

// 11 — endBackgroundMode idempotent: 2nd call no-ops
test("endBackgroundMode: calling twice is harmless (idempotent)", () => {
  const { mock, calls } = makeOsMock();
  const guard = beginBackgroundMode({ env: {}, platform: "win32", os: mock });
  endBackgroundMode(guard);
  const r2 = endBackgroundMode(guard);
  assert.deepEqual(r2, { restored: false, reason: "not-engaged" });
  // only 2 calls total (begin + first end), no spurious restore
  assert.equal(calls.length, 2);
});

// 12 — registerExitRestore latch is idempotent (hook installs once)
test("registerExitRestore: hook installs once across multiple registers", () => {
  _resetForTest();
  // synthetic process with .once spy
  const onceCalls = [];
  // Synthetic process where `.once(eventName, handler)` records only the event
  // name so the test can assert install-count is 1 (idempotent latch).
  const fakeProc = {
    once(evt) { onceCalls.push(evt); },
  };
  const guard1 = { engaged: true, deps: {} };
  const guard2 = { engaged: true, deps: {} };
  registerExitRestore(guard1, { process: fakeProc });
  registerExitRestore(guard2, { process: fakeProc });
  // only one (beforeExit, exit) install pair — second register reused the latch
  assert.deepEqual(onceCalls, ["beforeExit", "exit"]);
  const peek = _peekForTest();
  assert.equal(peek.exitHookInstalled, true);
  assert.equal(peek.pendingGuards, 2);
});

// 13 — LEGACY PARITY: disabled path makes zero setPriority calls (byte-identical to
//      pre-MS3 behavior — the reaper process priority is untouched)
test("LEGACY PARITY: PRISM_FR_SELF_BG_IO_DISABLE=1 produces zero os.setPriority side-effects", () => {
  const { mock, calls } = makeOsMock();
  const env = { PRISM_FR_SELF_BG_IO_DISABLE: "1" };
  const guard = beginBackgroundMode({ env, platform: "win32", os: mock });
  assert.equal(guard.engaged, false);
  assert.equal(guard.reason, "disabled-by-env");
  // try-block end shouldn't restore because we never engaged
  const r = endBackgroundMode(guard);
  assert.deepEqual(r, { restored: false, reason: "not-engaged" });
  // CRITICAL: zero calls = pre-MS3 byte-identical behavior
  assert.deepEqual(calls, []);
});

// 14 — REAL-PROCESS ORACLE: spawn a child node, engage the guard, read back
//      the priority via os.getPriority(0). Must use the actual node + os APIs.
//      Skips loudly on non-Windows so Linux/Mac contributors can still run the suite.
test("REAL-PROCESS ORACLE: child node process actually drops + restores its CPU priority", (t) => {
  if (process.platform !== "win32") {
    t.diagnostic(`skipped: non-win32 (platform=${process.platform}) — guard intentionally no-ops here`);
    return;
  }
  const helperPath = join(__dirname, "..", "lib", "reaper-self-io-priority.mjs");
  // Windows ESM requires a proper file:// URL (raw absolute paths fail with
  // ERR_UNSUPPORTED_ESM_URL_SCHEME). pathToFileURL handles the drive-letter +
  // backslash → URL-encoded conversion correctly.
  const helperUrl = (new URL("file:///" + helperPath.replace(/\\/g, "/"))).href;
  const childScript = `
import os from "node:os";
import { beginBackgroundMode, endBackgroundMode } from ${JSON.stringify(helperUrl)};
const before = os.getPriority(0);
const guard = beginBackgroundMode({});
const mid = os.getPriority(0);
endBackgroundMode(guard);
const after = os.getPriority(0);
process.stdout.write(JSON.stringify({ before, mid, after, engaged: guard.engaged === false }));
`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", childScript], {
    encoding: "utf8",
    timeout: 10_000,
    env: { ...process.env, PRISM_FR_SELF_BG_IO_DISABLE: undefined, PRISM_FLEET_REAPER_DISABLE: undefined },
  });
  assert.equal(result.status, 0, `child exited ${result.status}: stderr=${result.stderr}`);
  const out = JSON.parse(result.stdout);
  // Per Node docs, PRIORITY_BELOW_NORMAL is the nice-style value 10
  // (higher = lower priority); maps to Windows BELOW_NORMAL_PRIORITY_CLASS.
  assert.equal(out.mid, 10, `expected mid=10 (BELOW_NORMAL) got ${out.mid}`);
  // After end, must be restored to 0 (NORMAL)
  assert.equal(out.after, 0, `expected after=0 (NORMAL) got ${out.after}`);
  // Guard must report disengaged
  assert.equal(out.engaged, true);
});
