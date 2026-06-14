/**
 * fleet-reaper-crash-watch.test.mjs — hermetic coverage for U-FR-CRASH-WATCH.
 * Pure-function + injected-IO tests. No real filesystem, no spawn.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  snapshotSlotState,
  detectCrashes,
  formatPostmortemRow,
  readPrevSnapshot,
  writeSnapshot,
  appendPostmortems,
  DEFAULT_CRASH_STALE_MS,
  CRASH_WATCH_SCHEMA_VERSION,
  CRASH_WATCH_LOG_ROTATE_BYTES,
} from "./fleet-reaper-crash-watch.mjs";

const NOW = 1_779_060_000_000;
const ISO = (ms) => new Date(ms).toISOString();

// ─── snapshotSlotState ──────────────────────────────────────────────────────

test("snapshotSlotState: nested {slots:{}} shape", () => {
  const hb = NOW - 5000;
  const s = snapshotSlotState({ slots: { alpha: { chatId: "claude-aa", lastHeartbeat: ISO(hb) } } }, NOW);
  assert.equal(s.ts, NOW);
  assert.equal(s.slots.alpha.chatId, "claude-aa");
  assert.equal(s.slots.alpha.lastHeartbeatMs, hb);
});

test("snapshotSlotState: flat shape (no .slots wrapper)", () => {
  const hb = NOW - 1000;
  const s = snapshotSlotState({ bravo: { chatId: "claude-bb", lastHeartbeat: ISO(hb) } }, NOW);
  assert.equal(s.slots.bravo.chatId, "claude-bb");
  assert.equal(s.slots.bravo.lastHeartbeatMs, hb);
});

test("snapshotSlotState: slot with no chatId is skipped", () => {
  const s = snapshotSlotState({ slots: { alpha: { lastHeartbeat: ISO(NOW) } } }, NOW);
  assert.equal(Object.keys(s.slots).length, 0);
});

test("snapshotSlotState: unparseable lastHeartbeat → null (not NaN)", () => {
  const s = snapshotSlotState({ slots: { a: { chatId: "x", lastHeartbeat: "garbage" } } }, NOW);
  assert.equal(s.slots.a.lastHeartbeatMs, null);
});

test("snapshotSlotState: null/non-object input → empty snapshot", () => {
  assert.deepEqual(snapshotSlotState(null, NOW).slots, {});
  assert.deepEqual(snapshotSlotState("nope", NOW).slots, {});
  assert.deepEqual(snapshotSlotState(42, NOW).slots, {});
});

test("snapshotSlotState: null slot state value tolerated", () => {
  const s = snapshotSlotState({ slots: { a: null, b: { chatId: "y", lastHeartbeat: ISO(NOW) } } }, NOW);
  assert.equal(Object.keys(s.slots).length, 1);
  assert.equal(s.slots.b.chatId, "y");
});

test("snapshotSlotState: non-finite now → uses Date.now (ts is a number)", () => {
  const s = snapshotSlotState({ slots: {} }, NaN);
  assert.ok(Number.isFinite(s.ts));
});

// ─── detectCrashes ──────────────────────────────────────────────────────────

const mkSnap = (ts, slots) => ({ ts, slots });

test("detectCrashes: frozen heartbeat + same chatId + stale → CRASH", () => {
  const frozenHb = NOW - DEFAULT_CRASH_STALE_MS - 60_000;
  const prev = mkSnap(NOW - 300_000, { alpha: { chatId: "claude-aa", lastHeartbeatMs: frozenHb } });
  const curr = mkSnap(NOW, { alpha: { chatId: "claude-aa", lastHeartbeatMs: frozenHb } });
  const r = detectCrashes(prev, curr, NOW);
  assert.equal(r.length, 1);
  assert.equal(r[0].slot, "alpha");
  assert.equal(r[0].chatId, "claude-aa");
  assert.ok(r[0].frozenMs >= DEFAULT_CRASH_STALE_MS);
  assert.equal(r[0].sweepGapMs, 300_000);
});

test("detectCrashes: heartbeat ADVANCED between sweeps → NOT a crash (alive)", () => {
  const prev = mkSnap(NOW - 60_000, { alpha: { chatId: "claude-aa", lastHeartbeatMs: NOW - 120_000 } });
  const curr = mkSnap(NOW, { alpha: { chatId: "claude-aa", lastHeartbeatMs: NOW - 1_000 } });
  assert.equal(detectCrashes(prev, curr, NOW).length, 0);
});

test("detectCrashes: chatId changed → re-claim, NOT a crash", () => {
  const frozenHb = NOW - DEFAULT_CRASH_STALE_MS - 60_000;
  const prev = mkSnap(NOW - 300_000, { alpha: { chatId: "claude-OLD", lastHeartbeatMs: frozenHb } });
  const curr = mkSnap(NOW, { alpha: { chatId: "claude-NEW", lastHeartbeatMs: frozenHb } });
  assert.equal(detectCrashes(prev, curr, NOW).length, 0);
});

test("detectCrashes: frozen but NOT stale enough yet → no crash (confirm window)", () => {
  const recentHb = NOW - 60_000; // only 1 min frozen, < 10 min floor
  const prev = mkSnap(NOW - 30_000, { alpha: { chatId: "claude-aa", lastHeartbeatMs: recentHb } });
  const curr = mkSnap(NOW, { alpha: { chatId: "claude-aa", lastHeartbeatMs: recentHb } });
  assert.equal(detectCrashes(prev, curr, NOW).length, 0);
});

test("detectCrashes: slot new this sweep (not in prev) → skipped", () => {
  const prev = mkSnap(NOW - 300_000, {});
  const curr = mkSnap(NOW, { alpha: { chatId: "claude-aa", lastHeartbeatMs: NOW - 999_999 } });
  assert.equal(detectCrashes(prev, curr, NOW).length, 0);
});

test("detectCrashes: null lastHeartbeatMs → skipped (can't reason)", () => {
  const prev = mkSnap(NOW - 300_000, { alpha: { chatId: "claude-aa", lastHeartbeatMs: null } });
  const curr = mkSnap(NOW, { alpha: { chatId: "claude-aa", lastHeartbeatMs: null } });
  assert.equal(detectCrashes(prev, curr, NOW).length, 0);
});

test("detectCrashes: custom staleMs honored", () => {
  const frozenHb = NOW - 120_000; // 2 min frozen
  const prev = mkSnap(NOW - 60_000, { a: { chatId: "x", lastHeartbeatMs: frozenHb } });
  const curr = mkSnap(NOW, { a: { chatId: "x", lastHeartbeatMs: frozenHb } });
  assert.equal(detectCrashes(prev, curr, NOW, 60_000).length, 1);   // 2min > 1min floor
  assert.equal(detectCrashes(prev, curr, NOW, 600_000).length, 0);  // 2min < 10min floor
});

test("detectCrashes: invalid staleMs falls back to DEFAULT", () => {
  const frozenHb = NOW - DEFAULT_CRASH_STALE_MS - 1000;
  const prev = mkSnap(NOW - 300_000, { a: { chatId: "x", lastHeartbeatMs: frozenHb } });
  const curr = mkSnap(NOW, { a: { chatId: "x", lastHeartbeatMs: frozenHb } });
  assert.equal(detectCrashes(prev, curr, NOW, -5).length, 1);
  assert.equal(detectCrashes(prev, curr, NOW, NaN).length, 1);
});

test("detectCrashes: null prev/curr → empty (first run / defensive)", () => {
  assert.deepEqual(detectCrashes(null, mkSnap(NOW, {}), NOW), []);
  assert.deepEqual(detectCrashes(mkSnap(NOW, {}), null, NOW), []);
  assert.deepEqual(detectCrashes(undefined, undefined, NOW), []);
});

test("detectCrashes: multi-slot — only the frozen one flagged", () => {
  const frozen = NOW - DEFAULT_CRASH_STALE_MS - 30_000;
  const prev = mkSnap(NOW - 300_000, {
    alpha: { chatId: "claude-aa", lastHeartbeatMs: frozen },
    bravo: { chatId: "claude-bb", lastHeartbeatMs: NOW - 400_000 },
  });
  const curr = mkSnap(NOW, {
    alpha: { chatId: "claude-aa", lastHeartbeatMs: frozen },         // frozen → crash
    bravo: { chatId: "claude-bb", lastHeartbeatMs: NOW - 2_000 },    // advanced → alive
  });
  const r = detectCrashes(prev, curr, NOW);
  assert.equal(r.length, 1);
  assert.equal(r[0].slot, "alpha");
});

test("detectCrashes: missing ts on snapshots → sweepGapMs null, still detects", () => {
  const frozen = NOW - DEFAULT_CRASH_STALE_MS - 1000;
  const prev = { slots: { a: { chatId: "x", lastHeartbeatMs: frozen } } };
  const curr = { slots: { a: { chatId: "x", lastHeartbeatMs: frozen } } };
  const r = detectCrashes(prev, curr, NOW);
  assert.equal(r.length, 1);
  assert.equal(r[0].sweepGapMs, null);
});

// ─── formatPostmortemRow ────────────────────────────────────────────────────

test("formatPostmortemRow: full context", () => {
  const crash = { slot: "alpha", chatId: "claude-aa", lastHeartbeatMs: NOW - 700_000, frozenMs: 700_000, sweepGapMs: 300_000 };
  const row = formatPostmortemRow(crash, { memUsedPct: 97, pressureTier: "critical", now: NOW });
  assert.equal(row.schemaVersion, CRASH_WATCH_SCHEMA_VERSION);
  assert.equal(row.kind, "chat-crash");
  assert.equal(row.slot, "alpha");
  assert.equal(row.chatId, "claude-aa");
  assert.equal(row.frozenMinutes, 12); // 700000/60000 ≈ 11.67 → round 12
  assert.equal(row.memUsedPct, 97);
  assert.equal(row.pressureTier, "critical");
  assert.equal(row.ts, ISO(NOW));
});

test("formatPostmortemRow: missing context fields → null, not crash", () => {
  const crash = { slot: "b", chatId: "claude-bb", lastHeartbeatMs: NOW, frozenMs: 0, sweepGapMs: null };
  const row = formatPostmortemRow(crash, { now: NOW });
  assert.equal(row.memUsedPct, null);
  assert.equal(row.pressureTier, null);
  assert.equal(row.sweepGapMs, null);
});

test("formatPostmortemRow: non-finite lastHeartbeatMs → lastHeartbeatIso null", () => {
  const row = formatPostmortemRow({ slot: "c", chatId: "z", lastHeartbeatMs: null, frozenMs: null }, { now: NOW });
  assert.equal(row.lastHeartbeatIso, null);
  assert.equal(row.frozenMinutes, null);
});

// ─── readPrevSnapshot (injected reader) ─────────────────────────────────────

test("readPrevSnapshot: valid JSON with slots → returned", () => {
  const data = JSON.stringify({ ts: NOW, slots: { a: { chatId: "x", lastHeartbeatMs: NOW } } });
  const r = readPrevSnapshot("/fake", () => data);
  assert.equal(r.slots.a.chatId, "x");
});

test("readPrevSnapshot: read throws → null", () => {
  const r = readPrevSnapshot("/fake", () => { throw new Error("ENOENT"); });
  assert.equal(r, null);
});

test("readPrevSnapshot: empty / malformed / no-slots → null", () => {
  assert.equal(readPrevSnapshot("/f", () => ""), null);
  assert.equal(readPrevSnapshot("/f", () => "not json"), null);
  assert.equal(readPrevSnapshot("/f", () => '{"ts":1}'), null); // no .slots
  assert.equal(readPrevSnapshot("/f", () => "42"), null);
});

// ─── writeSnapshot (injected IO) ────────────────────────────────────────────

test("writeSnapshot: tmp-then-rename atomic pattern", () => {
  const calls = [];
  const io = {
    pid: 999,
    write: (p, c) => calls.push(["write", p, c.length > 0]),
    rename: (a, b) => calls.push(["rename", a, b]),
  };
  const r = writeSnapshot("/dst", { ts: NOW, slots: {} }, io);
  assert.equal(r.ok, true);
  assert.deepEqual(calls[0], ["write", "/dst.tmp.999", true]);
  assert.deepEqual(calls[1], ["rename", "/dst.tmp.999", "/dst"]);
});

test("writeSnapshot: write throws → {ok:false,error} (fail-soft, no throw)", () => {
  const io = { pid: 1, write: () => { throw new Error("disk full"); }, rename: () => {} };
  const r = writeSnapshot("/dst", {}, io);
  assert.equal(r.ok, false);
  assert.match(r.error, /disk full/);
});

test("writeSnapshot: rename throws → {ok:false} (fail-soft)", () => {
  const io = { pid: 1, write: () => {}, rename: () => { throw new Error("EXDEV"); } };
  assert.equal(writeSnapshot("/dst", {}, io).ok, false);
});

// ─── appendPostmortems (injected IO) ────────────────────────────────────────

test("appendPostmortems: empty rows → no-op {ok,written:0}", () => {
  const r = appendPostmortems([], "/p", {});
  assert.deepEqual(r, { ok: true, written: 0 });
});

test("appendPostmortems: writes JSONL, one row per line", () => {
  let appended = "";
  const io = { size: () => 0, append: (_p, b) => { appended = b; }, rotate: () => {} };
  const rows = [{ a: 1 }, { b: 2 }];
  const r = appendPostmortems(rows, "/p", io);
  assert.equal(r.written, 2);
  const lines = appended.trim().split("\n");
  assert.equal(lines.length, 2);
  assert.deepEqual(JSON.parse(lines[0]), { a: 1 });
  assert.deepEqual(JSON.parse(lines[1]), { b: 2 });
});

test("appendPostmortems: rotates when size >= cap", () => {
  let rotated = null;
  const io = {
    size: () => CRASH_WATCH_LOG_ROTATE_BYTES + 1,
    rotate: (a, b) => { rotated = [a, b]; },
    append: () => {},
  };
  appendPostmortems([{ x: 1 }], "/p", io);
  assert.deepEqual(rotated, ["/p", "/p.1"]);
});

test("appendPostmortems: size() throws → treated as 0, still appends", () => {
  let appended = false;
  const io = { size: () => { throw new Error("stat fail"); }, append: () => { appended = true; }, rotate: () => {} };
  const r = appendPostmortems([{ x: 1 }], "/p", io);
  assert.equal(r.ok, true);
  assert.equal(appended, true);
});

test("appendPostmortems: append throws → {ok:false} (fail-soft)", () => {
  const io = { size: () => 0, append: () => { throw new Error("EIO"); }, rotate: () => {} };
  const r = appendPostmortems([{ x: 1 }], "/p", io);
  assert.equal(r.ok, false);
  assert.equal(r.written, 0);
});

test("appendPostmortems: rotate throws → swallowed, append still happens", () => {
  let appended = false;
  const io = {
    size: () => CRASH_WATCH_LOG_ROTATE_BYTES + 1,
    rotate: () => { throw new Error("rename fail"); },
    append: () => { appended = true; },
  };
  const r = appendPostmortems([{ x: 1 }], "/p", io);
  assert.equal(r.ok, true);
  assert.equal(appended, true);
});

// ─── End-to-end pure pipeline ───────────────────────────────────────────────

test("E2E: chat-slots content → snapshot → detect → postmortem row", () => {
  const frozenHb = NOW - DEFAULT_CRASH_STALE_MS - 90_000;
  const slotsDataPrev = { slots: { delta: { chatId: "claude-dd", lastHeartbeat: ISO(frozenHb) } } };
  const slotsDataCurr = { slots: { delta: { chatId: "claude-dd", lastHeartbeat: ISO(frozenHb) } } };
  const prev = snapshotSlotState(slotsDataPrev, NOW - 300_000);
  const curr = snapshotSlotState(slotsDataCurr, NOW);
  const crashes = detectCrashes(prev, curr, NOW);
  assert.equal(crashes.length, 1);
  const row = formatPostmortemRow(crashes[0], { memUsedPct: 96, pressureTier: "critical", now: NOW });
  assert.equal(row.slot, "delta");
  assert.equal(row.chatId, "claude-dd");
  assert.equal(row.kind, "chat-crash");
  assert.ok(row.frozenMinutes >= 11);
});
