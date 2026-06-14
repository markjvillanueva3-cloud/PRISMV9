/**
 * FLEET-REAPER-MS3/U-FR-MS3-A — claude-tree-priority helper tests.
 *
 * 17 cases (spec floor: 15):
 *   1   parsePriorityName: accepted values
 *   2   parsePriorityName: rejected values (High/Realtime/Idle/junk/null)
 *   3   winPriorityValue: returns Win32 PROCESS_*_PRIORITY_CLASS for valid input
 *   4   clampTtlSec: clamps [MIN, MAX], default on garbage
 *   5   isWindows: branches on platform string
 *   6   findClaudeAncestor: walks parent chain to claude.exe
 *   7   findClaudeAncestor: returns null when no claude.exe in chain
 *   8   findClaudeAncestor: cycle-safe (parent loop returns null)
 *   9   findClaudeAncestor: gives up after maxHops
 *   10  walkClaudeTree: includes anchor + every descendant
 *   11  walkClaudeTree: rejects non-Claude anchor (anti-regression #2)
 *   12  walkClaudeTree: cycle-safe
 *   13  setPriorityForPids: rejects invalid priority (returns errors, no exec)
 *   14  setPriorityForPids: rejects non-Windows (returns errors, no exec)
 *   15  setPriorityForPids: invokes wmic with correct args + value
 *   16  setPriorityForPids: per-pid failure does not affect siblings (fail-soft)
 *   17  enumerateProcessIndex: returns empty Map on non-Windows / PS failure
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  isWindows,
  parsePriorityName,
  winPriorityValue,
  clampTtlSec,
  findClaudeAncestor,
  walkClaudeTree,
  setPriorityForPids,
  enumerateProcessIndex,
  DEFAULT_BOOST_TTL_SEC,
  MIN_BOOST_TTL_SEC,
  MAX_BOOST_TTL_SEC,
  _winPriorityValuesForTest,
} from "../../.claude/helpers/claude-tree-priority.mjs";

/**
 * Build an inline procIndex from {pid, name, ppid} entries (test convenience).
 */
function mkIndex(entries) {
  const m = new Map();
  for (const e of entries) m.set(e.pid, { pid: e.pid, name: e.name, ppid: e.ppid });
  return m;
}

// 1
test("parsePriorityName: accepts AboveNormal/Normal/BelowNormal canonical", () => {
  assert.equal(parsePriorityName("AboveNormal"), "AboveNormal");
  assert.equal(parsePriorityName("Normal"), "Normal");
  assert.equal(parsePriorityName("BelowNormal"), "BelowNormal");
});

// 2
test("parsePriorityName: rejects High/Realtime/Idle/junk/null (anti-regression #1)", () => {
  for (const bad of ["High", "Realtime", "Idle", "ABOVENORMAL", "above_normal", "", null, undefined, 32, {}]) {
    assert.equal(parsePriorityName(bad), null, `expected null for: ${JSON.stringify(bad)}`);
  }
});

// 3
test("winPriorityValue: matches the Win32 PROCESS_*_PRIORITY_CLASS constants", () => {
  // Pin actual Win32 numeric values — these are documented + load-bearing
  assert.equal(winPriorityValue("Normal"), 32);
  assert.equal(winPriorityValue("BelowNormal"), 16384);
  assert.equal(winPriorityValue("AboveNormal"), 32768);
  // Internal table coherence: the helper's frozen table matches the values
  const tbl = _winPriorityValuesForTest();
  assert.equal(tbl.AboveNormal, 32768);
  assert.equal(tbl.Normal, 32);
});

// 4
test("clampTtlSec: clamps to [MIN, MAX], falls back to DEFAULT on garbage", () => {
  assert.equal(clampTtlSec(300), 300);
  assert.equal(clampTtlSec(MIN_BOOST_TTL_SEC - 1), MIN_BOOST_TTL_SEC);
  assert.equal(clampTtlSec(MAX_BOOST_TTL_SEC + 1), MAX_BOOST_TTL_SEC);
  assert.equal(clampTtlSec(MAX_BOOST_TTL_SEC), MAX_BOOST_TTL_SEC);
  assert.equal(clampTtlSec(MIN_BOOST_TTL_SEC), MIN_BOOST_TTL_SEC);
  assert.equal(clampTtlSec("NaN"), DEFAULT_BOOST_TTL_SEC);
  assert.equal(clampTtlSec(null), DEFAULT_BOOST_TTL_SEC);
  assert.equal(clampTtlSec(undefined), DEFAULT_BOOST_TTL_SEC);
  assert.equal(clampTtlSec(123.7), 123); // floor
});

// 5
test("isWindows: branches on platform string", () => {
  assert.equal(isWindows("win32"), true);
  assert.equal(isWindows("linux"), false);
  assert.equal(isWindows("darwin"), false);
});

// 6
test("findClaudeAncestor: walks parent chain to claude.exe", () => {
  // tree: claude.exe(100) → node(200) → bash(300) → git(400)
  const idx = mkIndex([
    { pid: 100, name: "claude.exe", ppid: 1 },
    { pid: 200, name: "node.exe", ppid: 100 },
    { pid: 300, name: "bash.exe", ppid: 200 },
    { pid: 400, name: "git.exe", ppid: 300 },
  ]);
  assert.equal(findClaudeAncestor(400, idx), 100);
  assert.equal(findClaudeAncestor(200, idx), 100);
  assert.equal(findClaudeAncestor(100, idx), 100); // self
});

// 7
test("findClaudeAncestor: returns null when chain has no claude.exe", () => {
  const idx = mkIndex([
    { pid: 200, name: "node.exe", ppid: 1 },
    { pid: 300, name: "bash.exe", ppid: 200 },
  ]);
  assert.equal(findClaudeAncestor(300, idx), null);
  // Self-pid with no entry in index → null
  assert.equal(findClaudeAncestor(9999, idx), null);
  // Invalid input → null
  assert.equal(findClaudeAncestor(0, idx), null);
  assert.equal(findClaudeAncestor(-1, idx), null);
  assert.equal(findClaudeAncestor(NaN, idx), null);
});

// 8
test("findClaudeAncestor: cycle-safe (mutual parent loop → null, not infinite)", () => {
  const idx = mkIndex([
    { pid: 100, name: "node.exe", ppid: 200 },
    { pid: 200, name: "node.exe", ppid: 100 }, // mutual cycle
  ]);
  // Should return null without looping forever
  assert.equal(findClaudeAncestor(100, idx), null);
});

// 9
test("findClaudeAncestor: gives up after maxHops without claude.exe", () => {
  // 20-deep chain; explicitly cap at 3 hops
  const entries = [];
  for (let i = 1; i <= 20; i++) entries.push({ pid: i, name: "node.exe", ppid: i + 1 });
  const idx = mkIndex(entries);
  assert.equal(findClaudeAncestor(1, idx, 3), null);
});

// 10
test("walkClaudeTree: returns anchor + every descendant", () => {
  const idx = mkIndex([
    { pid: 100, name: "claude.exe", ppid: 1 },
    { pid: 200, name: "node.exe", ppid: 100 },
    { pid: 201, name: "node.exe", ppid: 100 },
    { pid: 300, name: "bash.exe", ppid: 200 },
    { pid: 999, name: "explorer.exe", ppid: 1 }, // outside tree
  ]);
  const tree = walkClaudeTree(100, idx);
  assert.deepEqual(Array.from(tree).sort((a, b) => a - b), [100, 200, 201, 300]);
});

// 11
test("walkClaudeTree: rejects non-Claude anchor (returns empty Set — anti-regression #2)", () => {
  const idx = mkIndex([
    { pid: 100, name: "node.exe", ppid: 1 }, // NOT claude.exe
    { pid: 200, name: "node.exe", ppid: 100 },
  ]);
  const tree = walkClaudeTree(100, idx);
  assert.equal(tree.size, 0);
});

// 12
test("walkClaudeTree: cycle-safe (self-referencing parent does not infinite loop)", () => {
  const idx = mkIndex([
    { pid: 100, name: "claude.exe", ppid: 1 },
    { pid: 200, name: "node.exe", ppid: 100 },
    { pid: 300, name: "node.exe", ppid: 200 },
    { pid: 200, name: "node.exe", ppid: 300 }, // duplicate entry overwrites — won't introduce a cycle in Map
  ]);
  // Index dedup is via pid; second entry for pid=200 overwrites the first
  // (creating ppid: 300 → cycle 200→300→200). Walk must still terminate.
  const tree = walkClaudeTree(100, idx);
  assert.ok(tree.has(100));
  assert.ok(tree.size <= 4);
});

// 13
test("setPriorityForPids: rejects invalid priority (no execFile invocation)", () => {
  let called = false;
  const exec = () => { called = true; return { status: 0 }; };
  const r = setPriorityForPids([100, 200], "High", { execFile: exec, platform: "win32" });
  assert.equal(called, false);
  assert.equal(r.length, 2);
  assert.equal(r[0].ok, false);
  assert.ok(r[0].error.startsWith("rejected-priority:"));
});

// 14
test("setPriorityForPids: rejects non-Windows (no execFile invocation)", () => {
  let called = false;
  const exec = () => { called = true; return { status: 0 }; };
  const r = setPriorityForPids([100], "AboveNormal", { execFile: exec, platform: "linux" });
  assert.equal(called, false);
  assert.equal(r[0].ok, false);
  assert.ok(r[0].error.startsWith("unsupported-platform:"));
});

// 15
test("setPriorityForPids: invokes wmic with correct CALL setpriority <value>", () => {
  const calls = [];
  const exec = (cmd, args) => {
    calls.push({ cmd, args });
    return { status: 0 };
  };
  const r = setPriorityForPids([100, 200], "AboveNormal", { execFile: exec, platform: "win32" });
  assert.equal(r.length, 2);
  assert.ok(r.every(x => x.ok === true));
  assert.equal(calls.length, 2);
  assert.equal(calls[0].cmd, "wmic");
  assert.deepEqual(calls[0].args, ["process", "where", "ProcessId=100", "CALL", "setpriority", "32768"]);
  assert.deepEqual(calls[1].args, ["process", "where", "ProcessId=200", "CALL", "setpriority", "32768"]);
});

// 16
test("setPriorityForPids: per-pid failure is fail-soft (siblings still succeed)", () => {
  const exec = (cmd, args) => {
    // Fail for the second pid only
    if (args.includes("ProcessId=200")) return { status: 1, stderr: "Access denied" };
    return { status: 0 };
  };
  const r = setPriorityForPids([100, 200, 300], "Normal", { execFile: exec, platform: "win32" });
  assert.equal(r.length, 3);
  assert.equal(r[0].ok, true);
  assert.equal(r[1].ok, false);
  assert.ok(r[1].error.includes("Access denied"));
  assert.equal(r[2].ok, true);
});

// 17
test("enumerateProcessIndex: returns empty Map on non-Windows / PS failure", () => {
  // Non-Windows
  let r = enumerateProcessIndex({ platform: "linux" });
  assert.equal(r.size, 0);
  // PS exits non-zero
  const failExec = () => ({ status: 1, stdout: "", stderr: "PS failed" });
  r = enumerateProcessIndex({ platform: "win32", execFile: failExec });
  assert.equal(r.size, 0);
  // PS returns garbage JSON
  const junkExec = () => ({ status: 0, stdout: "not json" });
  r = enumerateProcessIndex({ platform: "win32", execFile: junkExec });
  assert.equal(r.size, 0);
  // PS returns valid JSON — should populate the Map
  const goodExec = () => ({ status: 0, stdout: JSON.stringify([{ pid: 100, name: "claude.exe", ppid: 1 }, { pid: 200, name: "node.exe", ppid: 100 }]) });
  r = enumerateProcessIndex({ platform: "win32", execFile: goodExec });
  assert.equal(r.size, 2);
  assert.equal(r.get(100).name, "claude.exe");
  assert.equal(r.get(200).ppid, 100);
});
