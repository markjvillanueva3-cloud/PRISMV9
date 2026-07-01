// window-slot-bindings.test.mjs — fail-on-revert regression oracle for the
// durable twid→slot persistence layer. Pure-helper assertions exercise every
// export against realistic shapes plus edge cases (missing/null/wrong-shape).

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

import {
  isEnabled,
  readBindings,
  writeBindings,
  pruneBindings,
  findSlotByTwid,
  recordBinding,
  clearBinding,
} from "./window-slot-bindings.mjs";

// ── Test fixtures + helpers ─────────────────────────────────────────────────

const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "window-slot-bindings-test-"));
const FIXTURE_FILE = path.join(TMP_DIR, "bindings.json");

function freshFixture() {
  if (fs.existsSync(FIXTURE_FILE)) fs.unlinkSync(FIXTURE_FILE);
}

function setEnabled(on) {
  if (on) process.env.PRISM_WINDOW_SLOT_BIND = "1";
  else delete process.env.PRISM_WINDOW_SLOT_BIND;
  process.env.PRISM_WINDOW_SLOT_BIND_FILE = FIXTURE_FILE;
}

before(() => { setEnabled(true); });
after(() => {
  delete process.env.PRISM_WINDOW_SLOT_BIND;
  delete process.env.PRISM_WINDOW_SLOT_BIND_FILE;
  try { fs.rmSync(TMP_DIR, { recursive: true, force: true }); } catch {}
});

// ── isEnabled ───────────────────────────────────────────────────────────────

test("isEnabled: gates on PRISM_WINDOW_SLOT_BIND === '1'", () => {
  assert.equal(isEnabled({ PRISM_WINDOW_SLOT_BIND: "1" }), true);
  assert.equal(isEnabled({ PRISM_WINDOW_SLOT_BIND: "0" }), false);
  assert.equal(isEnabled({ PRISM_WINDOW_SLOT_BIND: "" }), false);
  assert.equal(isEnabled({}), false);
});

// ── readBindings: fail-soft on every error class ────────────────────────────

test("readBindings: missing file → empty state", () => {
  freshFixture();
  const s = readBindings({ file: FIXTURE_FILE });
  assert.equal(s.schemaVersion, 1);
  assert.deepEqual(s.bindings, {});
});

test("readBindings: empty file → empty state (no throw)", () => {
  freshFixture();
  fs.writeFileSync(FIXTURE_FILE, "");
  assert.deepEqual(readBindings({ file: FIXTURE_FILE }).bindings, {});
});

test("readBindings: malformed JSON → empty state (no throw)", () => {
  freshFixture();
  fs.writeFileSync(FIXTURE_FILE, "{not-json");
  assert.deepEqual(readBindings({ file: FIXTURE_FILE }).bindings, {});
});

test("readBindings: wrong schemaVersion → empty state", () => {
  freshFixture();
  fs.writeFileSync(FIXTURE_FILE, JSON.stringify({ schemaVersion: 999, bindings: { a: {} } }));
  assert.deepEqual(readBindings({ file: FIXTURE_FILE }).bindings, {});
});

test("readBindings: drops malformed entries (missing slot/lastChatId/lastWrittenAt)", () => {
  freshFixture();
  const payload = {
    schemaVersion: 1,
    lastUpdated: "2026-05-20T19:00:00.000Z",
    bindings: {
      "tw-wt-good":   { slot: "india", lastChatId: "claude-deadbeef", lastWrittenAt: "2026-05-20T18:00:00.000Z" },
      "tw-wt-noslot": { lastChatId: "x", lastWrittenAt: "2026-05-20T18:00:00.000Z" },
      "tw-wt-nochat": { slot: "alpha", lastWrittenAt: "2026-05-20T18:00:00.000Z" },
      "tw-wt-nots":   { slot: "alpha", lastChatId: "x" },
      "tw-wt-null":   null,
    },
  };
  fs.writeFileSync(FIXTURE_FILE, JSON.stringify(payload));
  const s = readBindings({ file: FIXTURE_FILE });
  assert.deepEqual(Object.keys(s.bindings), ["tw-wt-good"], "only the well-formed entry survives");
});

// ── writeBindings ───────────────────────────────────────────────────────────

test("writeBindings: round-trips a valid state", () => {
  freshFixture();
  const state = {
    schemaVersion: 1,
    lastUpdated: null,
    bindings: {
      "tw-wt-a": { slot: "alpha", lastChatId: "claude-aaaaaaaa", lastWrittenAt: "2026-05-20T18:00:00.000Z" },
      "tw-ps-1234": { slot: "bravo", lastChatId: "claude-bbbbbbbb", lastWrittenAt: "2026-05-20T18:01:00.000Z" },
    },
  };
  assert.equal(writeBindings(state, { file: FIXTURE_FILE }), true);
  const back = readBindings({ file: FIXTURE_FILE });
  assert.equal(Object.keys(back.bindings).length, 2);
  assert.equal(back.bindings["tw-wt-a"].slot, "alpha");
});

test("writeBindings: lastUpdated is refreshed on write", () => {
  freshFixture();
  writeBindings({ bindings: { "tw-wt-x": { slot: "echo", lastChatId: "claude-12345678", lastWrittenAt: "2026-05-20T18:00:00.000Z" } } }, { file: FIXTURE_FILE });
  const back = readBindings({ file: FIXTURE_FILE });
  assert.ok(typeof back.lastUpdated === "string" && back.lastUpdated.length > 0, "lastUpdated set");
});

// ── pruneBindings: pure ─────────────────────────────────────────────────────

test("pruneBindings: drops entries older than maxAgeMs", () => {
  const now = Date.parse("2026-05-20T20:00:00.000Z");
  const oneHourMs = 60 * 60 * 1000;
  const bindings = {
    "tw-wt-fresh": { slot: "alpha", lastChatId: "x", lastWrittenAt: "2026-05-20T19:30:00.000Z" }, // 30m ago
    "tw-wt-stale": { slot: "bravo", lastChatId: "x", lastWrittenAt: "2026-05-20T15:00:00.000Z" }, // 5h ago
  };
  const pruned = pruneBindings(bindings, { now, maxAgeMs: oneHourMs });
  assert.ok("tw-wt-fresh" in pruned, "fresh entry kept");
  assert.ok(!("tw-wt-stale" in pruned), "stale entry dropped");
});

test("pruneBindings: caps at maxBindings, keeping newest", () => {
  const now = Date.parse("2026-05-20T20:00:00.000Z");
  const bindings = {};
  for (let i = 0; i < 10; i++) {
    const ts = new Date(now - (i * 1000)).toISOString(); // i=0 newest, i=9 oldest
    bindings[`tw-wt-${i}`] = { slot: "alpha", lastChatId: "x", lastWrittenAt: ts };
  }
  const pruned = pruneBindings(bindings, { now, maxBindings: 3, maxAgeMs: 1e12 });
  assert.equal(Object.keys(pruned).length, 3, "capped at 3");
  assert.ok("tw-wt-0" in pruned && "tw-wt-1" in pruned && "tw-wt-2" in pruned, "newest 3 kept");
});

test("pruneBindings: drops entries with unparseable lastWrittenAt", () => {
  const now = Date.parse("2026-05-20T20:00:00.000Z");
  const bindings = {
    "tw-wt-good": { slot: "alpha", lastChatId: "x", lastWrittenAt: "2026-05-20T19:30:00.000Z" },
    "tw-wt-bad":  { slot: "bravo", lastChatId: "x", lastWrittenAt: "not-a-date" },
  };
  const pruned = pruneBindings(bindings, { now });
  assert.ok("tw-wt-good" in pruned);
  assert.ok(!("tw-wt-bad" in pruned));
});

test("pruneBindings: null/undefined input → empty", () => {
  assert.deepEqual(pruneBindings(null), {});
  assert.deepEqual(pruneBindings(undefined), {});
  assert.deepEqual(pruneBindings({}), {});
});

// ── findSlotByTwid: gated read path ─────────────────────────────────────────

test("findSlotByTwid: returns the bound slot when enabled", () => {
  freshFixture();
  setEnabled(true);
  recordBinding("tw-wt-find-test", "delta", "claude-fffffff1", { file: FIXTURE_FILE });
  assert.equal(findSlotByTwid("tw-wt-find-test", { file: FIXTURE_FILE }), "delta");
});

test("findSlotByTwid: returns null when layer disabled", () => {
  freshFixture();
  setEnabled(true);
  recordBinding("tw-wt-disabled-test", "echo", "claude-fffffff2", { file: FIXTURE_FILE });
  setEnabled(false);
  assert.equal(findSlotByTwid("tw-wt-disabled-test", { file: FIXTURE_FILE }), null);
  setEnabled(true);
});

test("findSlotByTwid: null for unknown twid", () => {
  freshFixture();
  assert.equal(findSlotByTwid("tw-wt-never-seen", { file: FIXTURE_FILE }), null);
});

test("findSlotByTwid: rejects non-string twid (no throw)", () => {
  assert.equal(findSlotByTwid(null, { file: FIXTURE_FILE }), null);
  assert.equal(findSlotByTwid(undefined, { file: FIXTURE_FILE }), null);
  assert.equal(findSlotByTwid(12345, { file: FIXTURE_FILE }), null);
  assert.equal(findSlotByTwid("", { file: FIXTURE_FILE }), null);
});

// ── recordBinding: gated write path ─────────────────────────────────────────

test("recordBinding: writes when enabled, returns true", () => {
  freshFixture();
  setEnabled(true);
  const ok = recordBinding("tw-wt-write-test", "foxtrot", "claude-fffffff3", { file: FIXTURE_FILE });
  assert.equal(ok, true);
  const state = readBindings({ file: FIXTURE_FILE });
  assert.equal(state.bindings["tw-wt-write-test"].slot, "foxtrot");
  assert.equal(state.bindings["tw-wt-write-test"].lastChatId, "claude-fffffff3");
});

test("recordBinding: no-op when disabled, returns false", () => {
  freshFixture();
  setEnabled(false);
  const ok = recordBinding("tw-wt-disabled-write", "alpha", "claude-fffffff4", { file: FIXTURE_FILE });
  assert.equal(ok, false);
  assert.equal(fs.existsSync(FIXTURE_FILE), false, "no file written");
  setEnabled(true);
});

test("recordBinding: rejects missing/empty inputs", () => {
  freshFixture();
  assert.equal(recordBinding("", "alpha", "claude-1", { file: FIXTURE_FILE }), false);
  assert.equal(recordBinding("tw-wt-x", "", "claude-1", { file: FIXTURE_FILE }), false);
  assert.equal(recordBinding("tw-wt-x", "alpha", "", { file: FIXTURE_FILE }), false);
  assert.equal(recordBinding(null, "alpha", "claude-1", { file: FIXTURE_FILE }), false);
});

test("recordBinding: overwrites the same twid (rebinding)", () => {
  freshFixture();
  recordBinding("tw-wt-rebind", "alpha", "claude-11111111", { file: FIXTURE_FILE });
  recordBinding("tw-wt-rebind", "bravo", "claude-22222222", { file: FIXTURE_FILE });
  const state = readBindings({ file: FIXTURE_FILE });
  assert.equal(state.bindings["tw-wt-rebind"].slot, "bravo", "rebinding wins");
  assert.equal(state.bindings["tw-wt-rebind"].lastChatId, "claude-22222222");
});

// ── clearBinding ────────────────────────────────────────────────────────────

test("clearBinding: drops the entry, returns true when present", () => {
  freshFixture();
  recordBinding("tw-wt-clear", "delta", "claude-33333333", { file: FIXTURE_FILE });
  assert.equal(clearBinding("tw-wt-clear", { file: FIXTURE_FILE }), true);
  assert.equal(findSlotByTwid("tw-wt-clear", { file: FIXTURE_FILE }), null);
});

test("clearBinding: false when twid absent", () => {
  freshFixture();
  assert.equal(clearBinding("tw-wt-never-seen", { file: FIXTURE_FILE }), false);
});

test("clearBinding: no-op when disabled", () => {
  freshFixture();
  setEnabled(true);
  recordBinding("tw-wt-disabled-clear", "alpha", "claude-44444444", { file: FIXTURE_FILE });
  setEnabled(false);
  assert.equal(clearBinding("tw-wt-disabled-clear", { file: FIXTURE_FILE }), false);
  // entry still there
  setEnabled(true);
  assert.equal(findSlotByTwid("tw-wt-disabled-clear", { file: FIXTURE_FILE }), "alpha");
});

// ── End-to-end scenarios ────────────────────────────────────────────────────

test("e2e: window survives slot eviction → next chat re-binds same slot", () => {
  freshFixture();
  setEnabled(true);
  // Window-1 in PowerShell tab A originally claimed india.
  recordBinding("tw-wt-window-1", "india", "claude-aaaaaaa1", { file: FIXTURE_FILE });
  // Simulate slot eviction (the slot in chat-slots.json gets nulled by sweep)
  // → the sidecar entry is UNAFFECTED.
  const sidecarAfterEvict = readBindings({ file: FIXTURE_FILE });
  assert.equal(sidecarAfterEvict.bindings["tw-wt-window-1"].slot, "india");
  // New chat-2 starts in same PowerShell tab → same twid resolved.
  // Tier-1.5 lookup returns "india" → caller knows to claim that slot.
  assert.equal(findSlotByTwid("tw-wt-window-1", { file: FIXTURE_FILE }), "india");
});

test("e2e: operator moves window to a different slot → /checkin-other clears + rebinds", () => {
  freshFixture();
  setEnabled(true);
  recordBinding("tw-wt-window-mover", "india", "claude-mmmmmmm1", { file: FIXTURE_FILE });
  // Operator: /checkin-charlie — explicit re-bind
  clearBinding("tw-wt-window-mover", { file: FIXTURE_FILE });
  recordBinding("tw-wt-window-mover", "charlie", "claude-mmmmmmm2", { file: FIXTURE_FILE });
  assert.equal(findSlotByTwid("tw-wt-window-mover", { file: FIXTURE_FILE }), "charlie");
});
