/**
 * FLEET-REAPER-MS3/U-FR-MS3-A — boost + decay hook orchestration tests.
 *
 * Hook helper logic only (no spawnSync to wmic — that's covered by the
 * underlying claude-tree-priority.test.mjs suite). 12 cases here PLUS the 17
 * helper cases = 29 total for U-FR-MS3-A (spec floor: 15).
 *
 *   1   pickExpiredStamps: drops stamps with expiresAt in the future
 *   2   pickExpiredStamps: keeps stamps with expiresAt <= now
 *   3   pickExpiredStamps: rejects malformed stamps (missing/non-numeric expiresAt)
 *   4   pickExpiredStamps: rejects null / non-object entries
 *   5   loadStamps: parses valid JSON stamps, attaches _path
 *   6   loadStamps: skips malformed JSON / read errors (fail-soft)
 *   7   listStampDir: returns [] when dir does not exist (no-op safe path)
 *   8   listStampDir: returns only .json files (rejects other extensions)
 *   9   decay.main: no-op when stamp dir empty
 *   10  decay.main: revert flow — expired stamp → setPriorityForPids called with Normal → unlink
 *   11  decay.main: leaves non-expired stamps alone (does NOT revert or unlink)
 *   12  decay.main: malformed stamps with no pids → unlink but no setter call
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { listStampDir } from "../active-chat-priority-boost.mjs";
import {
  pickExpiredStamps,
  loadStamps,
  main as decayMain,
} from "../active-chat-priority-decay.mjs";

// ─── pickExpiredStamps ───────────────────────────────────────────────────────

// 1
test("pickExpiredStamps: drops future-expiry stamps", () => {
  const r = pickExpiredStamps(
    [{ chatId: "alpha", expiresAt: 2000 }, { chatId: "bravo", expiresAt: 5000 }],
    1500,
  );
  assert.equal(r.length, 0);
});

// 2
test("pickExpiredStamps: keeps past-expiry stamps (==now also expires)", () => {
  const r = pickExpiredStamps(
    [
      { chatId: "alpha", expiresAt: 1000 },
      { chatId: "bravo", expiresAt: 1500 }, // == now
      { chatId: "charlie", expiresAt: 9999 }, // future
    ],
    1500,
  );
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(s => s.chatId).sort(), ["alpha", "bravo"]);
});

// 3
test("pickExpiredStamps: malformed (non-numeric / missing expiresAt) → dropped silently", () => {
  const r = pickExpiredStamps(
    [
      { chatId: "alpha" /* no expiresAt */ },
      { chatId: "bravo", expiresAt: "yesterday" },
      { chatId: "charlie", expiresAt: NaN },
      { chatId: "delta", expiresAt: 100 }, // valid + expired
    ],
    500,
  );
  assert.equal(r.length, 1);
  assert.equal(r[0].chatId, "delta");
});

// 4
test("pickExpiredStamps: null / non-object entries silently dropped", () => {
  const r = pickExpiredStamps([null, undefined, "string", 42, { expiresAt: 100 }], 200);
  assert.equal(r.length, 1);
});

// ─── loadStamps ──────────────────────────────────────────────────────────────

// 5
test("loadStamps: parses valid JSON + attaches _path", () => {
  const stampList = [{ path: "/tmp/a.json", name: "a.json", mtimeMs: 0 }];
  const fakeRead = () => JSON.stringify({ chatId: "alpha", expiresAt: 999, pids: [100] });
  const r = loadStamps(stampList, { readFile: fakeRead });
  assert.equal(r.length, 1);
  assert.equal(r[0].chatId, "alpha");
  assert.equal(r[0]._path, "/tmp/a.json");
  assert.deepEqual(r[0].pids, [100]);
});

// 6
test("loadStamps: skips malformed JSON / read errors (fail-soft, valid kept)", () => {
  const stampList = [
    { path: "/tmp/bad.json", name: "bad.json", mtimeMs: 0 },
    { path: "/tmp/missing.json", name: "missing.json", mtimeMs: 0 },
    { path: "/tmp/good.json", name: "good.json", mtimeMs: 0 },
  ];
  const fakeRead = (p) => {
    if (p === "/tmp/bad.json") return "not json {{{";
    if (p === "/tmp/missing.json") throw new Error("ENOENT");
    return JSON.stringify({ chatId: "z", expiresAt: 1 });
  };
  const r = loadStamps(stampList, { readFile: fakeRead });
  assert.equal(r.length, 1);
  assert.equal(r[0].chatId, "z");
});

// ─── listStampDir ────────────────────────────────────────────────────────────

// 7
test("listStampDir: returns [] when dir does not exist", () => {
  const tmp = mkdtempSync(join(tmpdir(), "acp-"));
  const r = listStampDir(join(tmp, "nope"));
  assert.deepEqual(r, []);
});

// 8
test("listStampDir: returns .json files only (skips other extensions)", () => {
  const tmp = mkdtempSync(join(tmpdir(), "acp-"));
  mkdirSync(tmp, { recursive: true });
  writeFileSync(join(tmp, "alpha.json"), "{}", "utf8");
  writeFileSync(join(tmp, "bravo.json"), "{}", "utf8");
  writeFileSync(join(tmp, "readme.md"), "x", "utf8");
  writeFileSync(join(tmp, "data.txt"), "x", "utf8");
  const r = listStampDir(tmp);
  assert.equal(r.length, 2);
  assert.deepEqual(r.map(e => e.name).sort(), ["alpha.json", "bravo.json"]);
});

// ─── decay.main orchestration ────────────────────────────────────────────────

// 9
test("decay.main: empty stamp dir → silent no-op (no setter call)", () => {
  let setterCalls = 0;
  let unlinkCalls = 0;
  decayMain({
    _forceForTest: true,
    listStampDir: () => [],
    setPriorityForPids: () => { setterCalls += 1; return []; },
    unlink: () => { unlinkCalls += 1; },
    nowMs: 1000,
  });
  assert.equal(setterCalls, 0, "empty stamp dir should not invoke setter");
  assert.equal(unlinkCalls, 0, "empty stamp dir should not unlink");
});

// 10
test("decay.main: expired stamp → setter called with Normal + stamp unlinked", () => {
  let setterCalls = [];
  const unlinked = [];
  decayMain({
    _forceForTest: true,
    listStampDir: () => [{ path: "/tmp/alpha.json", name: "alpha.json", mtimeMs: 0 }],
    loadStamps: () => [{ chatId: "alpha", expiresAt: 500, pids: [100, 200], _path: "/tmp/alpha.json" }],
    setPriorityForPids: (pids, level) => {
      setterCalls.push({ pids, level });
      return pids.map(p => ({ pid: p, ok: true }));
    },
    unlink: (p) => unlinked.push(p),
    nowMs: 1000, // > expiresAt 500
  });
  assert.equal(setterCalls.length, 1);
  assert.deepEqual(setterCalls[0].pids, [100, 200]);
  assert.equal(setterCalls[0].level, "Normal");
  assert.deepEqual(unlinked, ["/tmp/alpha.json"]);
});

// 11
test("decay.main: non-expired stamps are NOT reverted or unlinked", () => {
  let setterCalls = 0;
  let unlinkCalls = 0;
  decayMain({
    _forceForTest: true,
    listStampDir: () => [{ path: "/tmp/future.json", name: "future.json", mtimeMs: 0 }],
    loadStamps: () => [{ chatId: "alpha", expiresAt: 9999, pids: [100], _path: "/tmp/future.json" }],
    setPriorityForPids: () => { setterCalls += 1; return []; },
    unlink: () => { unlinkCalls += 1; },
    nowMs: 1000,
  });
  assert.equal(setterCalls, 0);
  assert.equal(unlinkCalls, 0);
});

// 12
test("decay.main: expired stamp with empty pids → unlinked but no setter call", () => {
  let setterCalls = 0;
  const unlinked = [];
  decayMain({
    _forceForTest: true,
    listStampDir: () => [{ path: "/tmp/empty.json", name: "empty.json", mtimeMs: 0 }],
    loadStamps: () => [{ chatId: "alpha", expiresAt: 100, pids: [], _path: "/tmp/empty.json" }],
    setPriorityForPids: () => { setterCalls += 1; return []; },
    unlink: (p) => unlinked.push(p),
    nowMs: 1000,
  });
  assert.equal(setterCalls, 0);
  assert.deepEqual(unlinked, ["/tmp/empty.json"]);
});
