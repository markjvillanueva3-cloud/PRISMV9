/**
 * Regression tests for U-SDF21 PowerShell-anchor protection.
 *
 * Locks in the invariant: pwsh.exe / powershell.exe / WindowsTerminal.exe /
 * conhost.exe are NEVER reapable by fleet-reaper. They host the chat-slot
 * binding via PS-window-pin; reaping one would close the user's terminal
 * AND destroy the window→slot mapping.
 *
 * Uses node:test (helpers/ vitest config has a pre-existing infra bug).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PERMANENT_PROTECTED_NAMES,
  TARGET_NAMES,
  isPermanentlyProtected,
  classifyProcess,
} from "./process-slot-map.mjs";

// ─── Constant-shape invariants ─────────────────────────────────────────────
test("PERMANENT_PROTECTED_NAMES contains pwsh and powershell", () => {
  assert.ok(PERMANENT_PROTECTED_NAMES.has("pwsh"));
  assert.ok(PERMANENT_PROTECTED_NAMES.has("powershell"));
});

test("PERMANENT_PROTECTED_NAMES covers terminal hosts", () => {
  assert.ok(PERMANENT_PROTECTED_NAMES.has("windowsterminal"));
  assert.ok(PERMANENT_PROTECTED_NAMES.has("conhost"));
});

test("PERMANENT_PROTECTED_NAMES and TARGET_NAMES are disjoint", () => {
  // Critical invariant: a name cannot be both "protected" and "reap target".
  for (const name of PERMANENT_PROTECTED_NAMES) {
    assert.ok(
      !TARGET_NAMES.has(name),
      `${name} is in BOTH PERMANENT_PROTECTED_NAMES and TARGET_NAMES — invariant broken`
    );
  }
});

// ─── isPermanentlyProtected helper ─────────────────────────────────────────
test("isPermanentlyProtected matches exact names", () => {
  assert.equal(isPermanentlyProtected("pwsh"), true);
  assert.equal(isPermanentlyProtected("powershell"), true);
  assert.equal(isPermanentlyProtected("WindowsTerminal"), true);
  assert.equal(isPermanentlyProtected("conhost"), true);
});

test("isPermanentlyProtected matches .exe-suffixed names (Windows)", () => {
  assert.equal(isPermanentlyProtected("pwsh.exe"), true);
  assert.equal(isPermanentlyProtected("powershell.exe"), true);
  assert.equal(isPermanentlyProtected("WindowsTerminal.exe"), true);
  assert.equal(isPermanentlyProtected("conhost.exe"), true);
});

test("isPermanentlyProtected is case-insensitive", () => {
  assert.equal(isPermanentlyProtected("PowerShell"), true);
  assert.equal(isPermanentlyProtected("POWERSHELL.EXE"), true);
  assert.equal(isPermanentlyProtected("PWSH"), true);
});

test("isPermanentlyProtected returns false for reap targets", () => {
  assert.equal(isPermanentlyProtected("node"), false);
  assert.equal(isPermanentlyProtected("node.exe"), false);
  assert.equal(isPermanentlyProtected("bash"), false);
  assert.equal(isPermanentlyProtected("bash.exe"), false);
  assert.equal(isPermanentlyProtected("git"), false);
  assert.equal(isPermanentlyProtected("sh"), false);
});

test("isPermanentlyProtected returns false for empty/null", () => {
  assert.equal(isPermanentlyProtected(""), false);
  assert.equal(isPermanentlyProtected(null), false);
  assert.equal(isPermanentlyProtected(undefined), false);
});

// ─── classifyProcess — the load-bearing invariant ──────────────────────────
function makeCtx(extra = {}) {
  return {
    byPid: new Map(),
    ancestorsOf: () => [],
    slotPidMap: new Map(),
    selfPid: null,
    now: Date.now(),
    slotsResolved: true,
    ...extra,
  };
}

test("classifyProcess: pwsh.exe is protected (never reapable)", () => {
  const proc = { pid: 49008, ppid: 1, name: "pwsh.exe", cmd: "pwsh", createdMs: Date.now() };
  const result = classifyProcess(proc, makeCtx());
  assert.equal(result.class, "protected");
  assert.equal(result.isCandidate, false);
  assert.match(result.reason, /permanent-protection/);
});

test("classifyProcess: powershell.exe is protected (never reapable)", () => {
  const proc = { pid: 62400, ppid: 1, name: "powershell.exe", cmd: "powershell", createdMs: Date.now() };
  const result = classifyProcess(proc, makeCtx());
  assert.equal(result.class, "protected");
  assert.equal(result.isCandidate, false);
});

test("classifyProcess: WindowsTerminal.exe is protected", () => {
  const proc = { pid: 9999, ppid: 1, name: "WindowsTerminal.exe", cmd: "wt", createdMs: Date.now() };
  const result = classifyProcess(proc, makeCtx());
  assert.equal(result.class, "protected");
  assert.equal(result.isCandidate, false);
});

test("classifyProcess: conhost.exe is protected", () => {
  const proc = { pid: 7777, ppid: 1, name: "conhost.exe", cmd: "conhost", createdMs: Date.now() };
  const result = classifyProcess(proc, makeCtx());
  assert.equal(result.class, "protected");
  assert.equal(result.isCandidate, false);
});

test("classifyProcess: pwsh case-insensitive (PWSH.EXE)", () => {
  const proc = { pid: 49008, ppid: 1, name: "PWSH.EXE", cmd: "pwsh", createdMs: Date.now() };
  const result = classifyProcess(proc, makeCtx());
  assert.equal(result.class, "protected");
});

test("classifyProcess: protection runs BEFORE not-target gate (no fallthrough)", () => {
  // Even if context contains a crashed slot owning this pwsh PID (impossible
  // in production but tested to verify the early-return gate), the verdict
  // stays `protected`, never `owned-by-crashed`.
  const proc = { pid: 49008, ppid: 1, name: "pwsh.exe", cmd: "pwsh", createdMs: Date.now() };
  const slotPidMap = new Map([[49008, { slot: "golf", status: "crashed" }]]);
  const result = classifyProcess(proc, makeCtx({ slotPidMap }));
  assert.equal(result.class, "protected");
  assert.notEqual(result.class, "owned-by-crashed");
});

test("classifyProcess: real reap targets still classify normally", () => {
  // Sanity check the early-return doesn't break the non-protected paths.
  const proc = { pid: 1234, ppid: 1, name: "node.exe", cmd: "node script.js", createdMs: Date.now() };
  const result = classifyProcess(proc, makeCtx());
  // No ancestry, not in any slot → `unowned` reapable.
  assert.equal(result.class, "indeterminate"); // no-ancestry path
});

test("classifyProcess: bash.exe still classifiable (not over-protected)", () => {
  const proc = { pid: 5678, ppid: 1, name: "bash.exe", cmd: "bash -c foo", createdMs: Date.now() };
  const result = classifyProcess(proc, makeCtx());
  // bash is in TARGET_NAMES → not classified as protected → goes through normal flow.
  assert.notEqual(result.class, "protected");
});
