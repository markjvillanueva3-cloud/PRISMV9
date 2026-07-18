import { test } from "node:test";
import assert from "node:assert/strict";
import {
  selectUnclosedBgTasks, resolveChatPid, decideEnforcement, parseCsvLine, parseWmicDate, enumerateProcesses,
  intersectAlive, selectStableBgTasks,
} from "./stop-close-own-bg-tasks.mjs";

const NOW = 1_000_000_000_000;
const old = NOW - 60_000;   // 60s
const young = NOW - 2_000;  // 2s
// chatPid = 100 (claude.exe); 150 = intermediate node; tree below
const tree = [
  { pid: 100, ppid: 1, name: "claude.exe" },
  { pid: 150, ppid: 100, name: "node.exe" },
  { pid: 200, ppid: 100, name: "bash.exe", createdMs: old },   // direct old bash -> FLAG
  { pid: 201, ppid: 100, name: "bash.exe", createdMs: young },  // too young -> skip
  { pid: 202, ppid: 999, name: "bash.exe", createdMs: old },    // diff chain -> skip
  { pid: 203, ppid: 100, name: "node.exe", createdMs: old },    // node -> skip
  { pid: 204, ppid: 500, name: "bash.exe", createdMs: old },    // detached (500 absent) -> skip
  { pid: 205, ppid: 150, name: "bash.exe", createdMs: old },    // 150->100 descendant -> FLAG
];

test("selectUnclosedBgTasks flags only old bash descendants of chatPid", () => {
  const r = selectUnclosedBgTasks(tree, 100, { ageFloorSec: 10, now: NOW });
  assert.deepEqual(r.map((x) => x.pid).sort((a, b) => a - b), [200, 205]);
});

test("ignores bash younger than age floor", () => {
  const r = selectUnclosedBgTasks(tree, 100, { ageFloorSec: 10, now: NOW });
  assert.ok(!r.some((x) => x.pid === 201));
});

test("ignores node.exe and detached/cross-chat bash", () => {
  const r = selectUnclosedBgTasks(tree, 100, { ageFloorSec: 10, now: NOW });
  for (const skip of [202, 203, 204]) assert.ok(!r.some((x) => x.pid === skip));
});

test("empty/invalid input -> empty", () => {
  assert.deepEqual(selectUnclosedBgTasks([], 100, { now: NOW }), []);
  assert.deepEqual(selectUnclosedBgTasks(tree, null, { now: NOW }), []);
  assert.deepEqual(selectUnclosedBgTasks(null, 100, { now: NOW }), []);
});

test("resolveChatPid finds nearest claude.exe ancestor", () => {
  assert.equal(resolveChatPid(tree, 205), 100); // 205->150->100
  assert.equal(resolveChatPid(tree, 150), 100);
  assert.equal(resolveChatPid([{ pid: 7, ppid: 1, name: "node.exe" }], 7), null);
});

test("decideEnforcement: block twice then auto-reap (deadlock-proof)", () => {
  assert.deepEqual(decideEnforcement(5, 0, { maxBlocks: 2, mode: "block" }), { action: "block", nextAttempts: 1 });
  assert.deepEqual(decideEnforcement(5, 1, { maxBlocks: 2, mode: "block" }), { action: "block", nextAttempts: 2 });
  assert.deepEqual(decideEnforcement(5, 2, { maxBlocks: 2, mode: "block" }), { action: "reap", nextAttempts: 0 });
});

test("decideEnforcement: pass on zero, mode overrides", () => {
  assert.equal(decideEnforcement(0, 3, {}).action, "pass");
  assert.equal(decideEnforcement(4, 0, { mode: "advisory" }).action, "advise");
  assert.equal(decideEnforcement(4, 0, { mode: "reap" }).action, "reap");
});

test("parseCsvLine handles quoted commas", () => {
  assert.deepEqual(parseCsvLine('a,"b,c",d'), ["a", "b,c", "d"]);
});

test("parseWmicDate parses local WMIC timestamp; junk -> undefined", () => {
  const ms = parseWmicDate("20260530030415.123456+000");
  assert.ok(Number.isFinite(ms));
  assert.equal(parseWmicDate(""), undefined);
  assert.equal(parseWmicDate("garbage"), undefined);
});

test("enumerateProcesses returns real processes (P0 regression: WMIC header offset)", () => {
  const procs = enumerateProcesses();
  assert.ok(procs.length > 50, "expected many procs, got " + procs.length);
  assert.ok(procs.some((p) => /^claude\.exe$/i.test(p.name)), "expected >=1 claude.exe");
  assert.ok(procs.every((p) => Number.isFinite(p.pid) && Number.isFinite(p.ppid)), "all rows have numeric pid/ppid");
});

test("selectUnclosedBgTasks skips bash with unknown creation date (fail-safe, no false block)", () => {
  const t = [
    { pid: 100, ppid: 1, name: "claude.exe" },
    { pid: 300, ppid: 100, name: "bash.exe", createdMs: undefined },
  ];
  assert.deepEqual(selectUnclosedBgTasks(t, 100, { ageFloorSec: 10, now: NOW }), []);
});

// --- 2026-06-13 false-positive fix (slot charlie): 45s floor + stability gate ---
test("default 45s floor excludes the transient-burst class (24s-old bash NOT flagged)", () => {
  // The 253-false-block incident: bash.exe descendants 13-24s old (subshell/hook bursts) were
  // flagged at the old 10s floor. At the new 45s default only genuinely-lingering bash survives.
  const t = [
    { pid: 100, ppid: 1, name: "claude.exe" },
    { pid: 210, ppid: 100, name: "bash.exe", createdMs: NOW - 24_000 }, // 24s -> transient burst -> skip
    { pid: 211, ppid: 100, name: "bash.exe", createdMs: NOW - 60_000 }, // 60s -> genuine lingering -> flag
  ];
  assert.deepEqual(selectUnclosedBgTasks(t, 100, { ageFloorSec: 45, now: NOW }).map((x) => x.pid), [211]);
});

test("intersectAlive keeps persistent candidates, drops vanished ones (stability gate)", () => {
  const cand = [{ pid: 200 }, { pid: 205 }, { pid: 999 }];
  assert.deepEqual(intersectAlive(cand, new Set([200, 205])).map((x) => x.pid), [200, 205]);
  assert.deepEqual(intersectAlive(cand, new Set()), []);              // all vanished -> none flagged
  assert.deepEqual(intersectAlive(cand, [200]).map((x) => x.pid), [200]); // array form accepted
  assert.deepEqual(intersectAlive([], new Set([1])), []);
  assert.deepEqual(intersectAlive(null, new Set([1])), []);           // non-array -> empty (no throw)
});

// --- selectStableBgTasks: the main() detection wiring (injected enumerate/sleep) ---
// These prove the gate is WIRED (not just intersectAlive in isolation): a revert of the
// reassignment or wrong-snapshot wiring fails here, not silently green.
const CLAUDE_ONLY = [{ pid: 100, ppid: 1, name: "claude.exe" }];
test("selectStableBgTasks: a burst that vanishes on re-snapshot is dropped (no block)", () => {
  const first = [...CLAUDE_ONLY, { pid: 220, ppid: 100, name: "bash.exe", createdMs: NOW - 60_000 }];
  let sleptMs = -1;
  const out = selectStableBgTasks({
    procs: first, chatPid: 100, ageFloorSec: 45, now: NOW, stabilityMs: 1500,
    enumerate: () => CLAUDE_ONLY,            // pid 220 GONE on re-snapshot
    sleep: (ms) => { sleptMs = ms; },
  });
  assert.equal(sleptMs, 1500);              // the gate actually slept before re-checking
  assert.deepEqual(out, []);                // transient burst dropped -> no false block
});
test("selectStableBgTasks: a persistent task survives the re-check (still flagged)", () => {
  const first = [...CLAUDE_ONLY, { pid: 221, ppid: 100, name: "bash.exe", createdMs: NOW - 90_000 }];
  const out = selectStableBgTasks({
    procs: first, chatPid: 100, ageFloorSec: 45, now: NOW, stabilityMs: 1500,
    enumerate: () => [...CLAUDE_ONLY, { pid: 221, ppid: 100, name: "bash.exe" }], // still alive
    sleep: () => {},
  });
  assert.deepEqual(out.map((x) => x.pid), [221]); // real orphan still caught (no false-negative)
});
test("selectStableBgTasks: stabilityMs=0 skips the re-check entirely (no enumerate/sleep)", () => {
  let enumCalls = 0, slept = false;
  const first = [...CLAUDE_ONLY, { pid: 222, ppid: 100, name: "bash.exe", createdMs: NOW - 60_000 }];
  const out = selectStableBgTasks({
    procs: first, chatPid: 100, ageFloorSec: 45, now: NOW, stabilityMs: 0,
    enumerate: () => { enumCalls++; return []; }, sleep: () => { slept = true; },
  });
  assert.equal(enumCalls, 0);               // gate skipped -> no 2nd WMIC snapshot
  assert.equal(slept, false);
  assert.deepEqual(out.map((x) => x.pid), [222]); // first-pass result unchanged
});