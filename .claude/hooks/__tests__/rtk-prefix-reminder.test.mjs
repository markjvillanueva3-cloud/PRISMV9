/**
 * rtk-prefix-reminder — rate-limit helper tests
 *
 * Closes the P1 from the 2026-05-18 (slot kilo) per-file scrutiny gate after the
 * rate-limit port from rtk-auto-suggest.mjs. Without these tests, a silent
 * regression in the rate-limiter (env-var parse drift / pruning typo / tmpfs
 * race) would re-introduce the original nag-storm with no oracle signal.
 *
 * Uses node:test (not vitest) — matches sibling hook test convention
 * (auto-learn-budget-guard.test.mjs).
 *
 * Test surface:
 *   - shouldNagNow: cold cache, within window, post window
 *   - recordNag: timestamp record + prune horizon (windowMs * RATE_PRUNE_MULT)
 *   - loadRateState: fail-soft on missing file / parse error
 *   - saveRateState ↔ loadRateState round-trip via real tmpdir
 *   - 4-helper contract integration (load → shouldNagNow → recordNag → save)
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { existsSync, unlinkSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";

import {
  shouldNagNow,
  recordNag,
  loadRateState,
  saveRateState,
  buildReminder,
} from "../rtk-prefix-reminder.mjs";

const RATE_FILE = join(tmpdir(), "prism-hook-state", "rtk-prefix-reminder.last.json");
const WINDOW_MS = 120_000;
const PRUNE_MULT = 10;

// ─── shouldNagNow ────────────────────────────────────────────────────────────

test("shouldNagNow: cold cache (no entry for baseCmd) → true", () => {
  assert.equal(shouldNagNow("git", {}, 1_700_000_000_000, WINDOW_MS), true);
});

test("shouldNagNow: within window (now - last < windowMs) → false", () => {
  const state = { git: 1_700_000_000_000 };
  const now = 1_700_000_060_000; // 60s later, half-window
  assert.equal(shouldNagNow("git", state, now, WINDOW_MS), false);
});

test("shouldNagNow: at exact window boundary (now - last === windowMs) → true", () => {
  const state = { git: 1_700_000_000_000 };
  const now = 1_700_000_000_000 + WINDOW_MS;
  assert.equal(shouldNagNow("git", state, now, WINDOW_MS), true);
});

test("shouldNagNow: post window (now - last > windowMs) → true", () => {
  const state = { git: 1_700_000_000_000 };
  const now = 1_700_000_000_000 + WINDOW_MS + 1;
  assert.equal(shouldNagNow("git", state, now, WINDOW_MS), true);
});

test("shouldNagNow: different baseCmd ignores state entries for other commands", () => {
  const state = { git: 1_700_000_000_000 };
  // npm has no entry — should nag even when git is in-window
  assert.equal(shouldNagNow("npm", state, 1_700_000_060_000, WINDOW_MS), true);
});

// ─── recordNag ───────────────────────────────────────────────────────────────

test("recordNag: writes now timestamp to state[baseCmd]", () => {
  const state = {};
  const now = 1_700_000_000_000;
  recordNag("git", state, now, WINDOW_MS);
  assert.equal(state.git, now);
});

test("recordNag: returns the same state object it mutated", () => {
  const state = {};
  const ret = recordNag("git", state, 1_700_000_000_000, WINDOW_MS);
  assert.equal(ret, state); // identity check — confirms the documented dual return-and-mutate contract
});

test("recordNag: prunes entries older than windowMs * PRUNE_MULT (20 min default)", () => {
  const now = 1_700_000_000_000;
  const pruneHorizon = WINDOW_MS * PRUNE_MULT; // 1.2M ms
  const state = {
    stale: now - pruneHorizon - 1, // outside horizon → should be deleted
    fresh: now - WINDOW_MS,         // inside horizon → should remain
    boundary: now - pruneHorizon,   // exactly at horizon → kept (strict > prune check)
  };
  recordNag("git", state, now, WINDOW_MS);
  assert.equal(state.stale, undefined, "stale entry should be pruned");
  assert.equal(state.fresh, now - WINDOW_MS, "fresh entry should remain");
  assert.equal(state.boundary, now - pruneHorizon, "boundary entry should remain (strict >)");
  assert.equal(state.git, now, "new entry should be recorded");
});

// ─── loadRateState fail-soft ─────────────────────────────────────────────────

test("loadRateState: returns {} when RATE_FILE missing (fail-soft)", () => {
  // Move any existing state file aside so we hit the missing-file branch
  const backup = `${RATE_FILE}.test-backup-${process.pid}`;
  let hadFile = false;
  if (existsSync(RATE_FILE)) {
    hadFile = true;
    const content = readFileSync(RATE_FILE, "utf8");
    writeFileSync(backup, content);
    unlinkSync(RATE_FILE);
  }
  try {
    const state = loadRateState();
    assert.deepEqual(state, {}, "missing file should yield empty object, not throw");
  } finally {
    if (hadFile) {
      // Restore the backup
      const content = readFileSync(backup, "utf8");
      mkdirSync(dirname(RATE_FILE), { recursive: true });
      writeFileSync(RATE_FILE, content);
      unlinkSync(backup);
    }
  }
});

test("loadRateState: returns {} on corrupt JSON (fail-soft, no crash)", () => {
  // Stash any existing state file
  const backup = `${RATE_FILE}.corrupt-backup-${process.pid}`;
  let hadFile = false;
  if (existsSync(RATE_FILE)) {
    hadFile = true;
    writeFileSync(backup, readFileSync(RATE_FILE, "utf8"));
  }
  try {
    mkdirSync(dirname(RATE_FILE), { recursive: true });
    writeFileSync(RATE_FILE, "{not-valid-json"); // garbage payload
    const state = loadRateState();
    assert.deepEqual(state, {}, "corrupt file should yield empty object, not throw");
  } finally {
    if (hadFile) {
      writeFileSync(RATE_FILE, readFileSync(backup, "utf8"));
      unlinkSync(backup);
    } else if (existsSync(RATE_FILE)) {
      unlinkSync(RATE_FILE);
    }
  }
});

// ─── buildReminder tool-selection branches ───────────────────────────────────

test("buildReminder('cat'): redirects to Read tool, never says 'rtk cat'", () => {
  const msg = buildReminder("cat");
  assert.match(msg, /Read tool/, "should name the Read tool redirect");
  assert.doesNotMatch(msg, /rtk cat/i, "must not suggest `rtk cat` — CLAUDE.md doctrine");
  assert.match(msg, /offset\/limit/, "should cite Read's range support");
});

test("buildReminder('ls'): redirects to Glob tool, never says 'rtk ls'", () => {
  const msg = buildReminder("ls");
  assert.match(msg, /Glob tool/, "should name the Glob tool redirect");
  assert.doesNotMatch(msg, /rtk ls/i, "must not suggest `rtk ls` — CLAUDE.md doctrine");
});

test("buildReminder('git'): falls through to default rtk advisory", () => {
  const msg = buildReminder("git");
  assert.match(msg, /rtk git/, "default branch should still suggest `rtk git`");
  assert.match(msg, /token reduction/, "default branch should cite token savings");
});

test("buildReminder() truncates oversized baseCmd to 32 chars (DoS guard)", () => {
  const long = "x".repeat(500);
  const msg = buildReminder(long);
  // The suggested-command line embeds `rtk <safe> ...` — `safe` is sliced to 32
  assert.equal(msg.includes("x".repeat(33)), false, "should not echo more than 32 chars");
});

// ─── 4-helper contract integration ───────────────────────────────────────────

test("integration: load → shouldNagNow=true → recordNag → save → load shows new entry", () => {
  // Stash any existing state file so the test is hermetic
  const backup = `${RATE_FILE}.integration-backup-${process.pid}`;
  let hadFile = false;
  if (existsSync(RATE_FILE)) {
    hadFile = true;
    writeFileSync(backup, readFileSync(RATE_FILE, "utf8"));
    unlinkSync(RATE_FILE);
  }
  try {
    const now = Date.now();
    // 1. load → cold cache
    const state1 = loadRateState();
    assert.deepEqual(state1, {}, "cold cache should be empty");
    // 2. shouldNagNow → true on cold cache
    assert.equal(shouldNagNow("integration-test-cmd", state1, now, WINDOW_MS), true);
    // 3. recordNag → mutates state
    saveRateState(recordNag("integration-test-cmd", state1, now, WINDOW_MS));
    // 4. reload → new entry visible
    const state2 = loadRateState();
    assert.equal(state2["integration-test-cmd"], now, "saved state should round-trip");
    // 5. within-window second call → shouldNagNow=false
    assert.equal(
      shouldNagNow("integration-test-cmd", state2, now + 1000, WINDOW_MS),
      false,
      "within-window second call should be suppressed"
    );
  } finally {
    if (hadFile) {
      writeFileSync(RATE_FILE, readFileSync(backup, "utf8"));
      unlinkSync(backup);
    } else if (existsSync(RATE_FILE)) {
      unlinkSync(RATE_FILE);
    }
  }
});
