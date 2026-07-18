// chat-slots-preview-reclaimable.test.mjs
// FLEET-REAPER cry-wolf fix (slot:golf 2026-06-04)
//
// previewReclaimable() is the READ-ONLY dry-run of reclaimCrashed: it reports what
// a reclaim WOULD free vs keep, using the SAME decision functions (classifySlot +
// shouldKeepSlotAlive) but with NO mutation and NO lock. The fleet-reaper advisory
// uses it so "N dead-PID slots → run reclaim" reports the ACTUALLY-reclaimable
// subset instead of the weaker recorded-pid count (which over-reports: a slot's
// recorded pid dies across /compact while the chat + its window live on).
//
// These tests pin the contract that makes that safe:
//   • READ-ONLY — the state file is byte-identical after a preview (a mutation
//     here would be a real bug: reclaimCrashed mutates, preview must NOT).
//   • crashed + window-dead → reclaimable (the genuinely-abandoned case).
//   • fresh heartbeat → neither (not crashed → never touched).
//   • crashed + window-ALIVE → KEPT, and the PRISM_SLOT_PID_ALIVE_CHECK_DISABLE
//     knob is LOAD-BEARING (without it → kept; with it → reclaimable).
//
// Hermetic: a complete v2 fixture (all SLOT_NAMES present → readSlots has nothing
// to migrate → no write). Window-liveness is made deterministic via the documented
// env knobs + a valid stable-tier twid (tw-pa-<this-live-pid>) so results never
// depend on a real transcript file. Stale age derives from the exported
// CRASH_TTL_MS so the fixture stays correct if the threshold ever changes.

import { test } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir, hostname } from "node:os";
import { join } from "node:path";
import { previewReclaimable, SLOT_NAMES, CRASH_TTL_MS } from "./chat-slots.mjs";

const HOST = hostname();

function writeFixture(dir, overrides) {
  const slots = {};
  for (const n of SLOT_NAMES) slots[n] = null;
  Object.assign(slots, overrides);
  const p = join(dir, "chat-slots.json");
  writeFileSync(p, JSON.stringify({ schemaVersion: 2, lastUpdated: new Date().toISOString(), slots }, null, 2));
  return p;
}

// A slot heartbeat-crashed by default (2× CRASH_TTL stale); staleMs:0 → fresh/alive.
function makeSlot({ chatId, host = HOST, terminalWindowId = null, staleMs = 2 * CRASH_TTL_MS }) {
  return {
    chatId, host, terminalWindowId,
    branch: null, topic: null, activity: "test",
    lastHeartbeat: new Date(Date.now() - staleMs).toISOString(),
  };
}

function withEnv(overrides, fn) {
  const prev = {};
  for (const k of Object.keys(overrides)) { prev[k] = process.env[k]; process.env[k] = overrides[k]; }
  try { return fn(); }
  finally { for (const k of Object.keys(overrides)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
}

test("READ-ONLY: previewReclaimable does not mutate the state file", () => {
  const dir = mkdtempSync(join(tmpdir(), "pv-ro-"));
  try {
    const p = writeFixture(dir, { alpha: makeSlot({ chatId: "claude-pvtest-ro", terminalWindowId: null }) });
    const before = readFileSync(p, "utf8");
    withEnv({ PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE: "1" }, () => previewReclaimable(p));
    assert.equal(readFileSync(p, "utf8"), before, "state file must be byte-identical after a read-only preview");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("crashed + window-dead → reclaimable (no transcript, no twid)", () => {
  const dir = mkdtempSync(join(tmpdir(), "pv-dead-"));
  try {
    const p = writeFixture(dir, { alpha: makeSlot({ chatId: "claude-pvtest-dead", terminalWindowId: null }) });
    const r = withEnv({ PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE: "1" }, () => previewReclaimable(p));
    assert.equal(r.ok, true);
    assert.deepEqual(r.reclaimable.map((s) => s.slot), ["alpha"]);
    assert.equal(r.kept.length, 0);
    assert.equal(r.reclaimable[0].chatId, "claude-pvtest-dead");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("fresh heartbeat → neither reclaimable nor kept (not crashed)", () => {
  const dir = mkdtempSync(join(tmpdir(), "pv-fresh-"));
  try {
    const p = writeFixture(dir, { bravo: makeSlot({ chatId: "claude-pvtest-fresh", staleMs: 0 }) });
    const r = withEnv({ PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE: "1" }, () => previewReclaimable(p));
    assert.equal(r.reclaimable.length, 0);
    assert.equal(r.kept.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("crashed + window-ALIVE → KEPT; PRISM_SLOT_PID_ALIVE_CHECK_DISABLE=1 makes the knob load-bearing", () => {
  const dir = mkdtempSync(join(tmpdir(), "pv-knob-"));
  try {
    // tw-pa-<pid> is a STABLE-tier twid; extractWindowPid resolves it to THIS live
    // process pid → isWindowAlive true. Transcript-liveness disabled so the decision
    // rests purely on the twid pid probe (deterministic, no real transcript needed).
    const p = writeFixture(dir, { charlie: makeSlot({ chatId: "claude-pvtest-knob", terminalWindowId: `tw-pa-${process.pid}` }) });

    // WITHOUT the kill-check knob: window is alive → slot is KEPT (not reclaimable).
    const keep = withEnv({ PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE: "1" }, () => previewReclaimable(p));
    assert.deepEqual(keep.kept.map((s) => s.slot), ["charlie"], "live-window crashed slot must be KEPT");
    assert.equal(keep.reclaimable.length, 0, "must NOT reclaim a live-window slot");

    // WITH the knob: shouldKeepSlotAlive short-circuits false → slot becomes reclaimable.
    const reap = withEnv(
      { PRISM_SLOT_TRANSCRIPT_LIVENESS_DISABLE: "1", PRISM_SLOT_PID_ALIVE_CHECK_DISABLE: "1" },
      () => previewReclaimable(p),
    );
    assert.deepEqual(reap.reclaimable.map((s) => s.slot), ["charlie"], "the knob disables window-keep → reclaimable");
    assert.equal(reap.kept.length, 0);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("empty fleet (all slots null) → { reclaimable: [], kept: [] }", () => {
  const dir = mkdtempSync(join(tmpdir(), "pv-empty-"));
  try {
    const p = writeFixture(dir, {});
    const r = previewReclaimable(p);
    assert.equal(r.ok, true);
    assert.deepEqual(r.reclaimable, []);
    assert.deepEqual(r.kept, []);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
