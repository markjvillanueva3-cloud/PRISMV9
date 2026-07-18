/**
 * rtk-archive-dashboard — pure-helpers test
 *
 * Covers the 4 exported pure helpers (parseWindow, parseArgs, readArchive,
 * aggregate). Closes the comprehensive-build-enforce coverage gate for the
 * new dashboard shipped 2026-05-18 (slot kilo, U-KILO-DEDUP-2026-05-18 fwd).
 *
 * Uses node:test (not vitest) — sibling convention.
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { writeFileSync, mkdirSync, unlinkSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { parseWindow, parseArgs, readArchive, aggregate } from "../scripts/rtk-archive-dashboard.mjs";

// ─── parseWindow ─────────────────────────────────────────────────────────────

test("parseWindow: '24h' → 24*3600*1000 ms", () => {
  assert.equal(parseWindow("24h"), 24 * 3600_000);
});

test("parseWindow: '7d' → 7*86400*1000 ms", () => {
  assert.equal(parseWindow("7d"), 7 * 86400_000);
});

test("parseWindow: invalid format returns null", () => {
  assert.equal(parseWindow("garbage"), null);
  assert.equal(parseWindow("24"), null); // missing unit
  assert.equal(parseWindow("0h"), null);  // zero not allowed
  assert.equal(parseWindow("-5h"), null); // negative not allowed
});

test("parseWindow: clamps to 168h MAX_WINDOW_MS", () => {
  // 999d would be 999 * 86_400_000 = 86 billion ms, far over 168h cap
  const clamped = parseWindow("999d");
  assert.equal(clamped, 168 * 3600_000);
});

test("parseWindow: empty/non-string defaults to 24h DEFAULT_WINDOW_MS", () => {
  assert.equal(parseWindow(""), 24 * 3600_000);
  assert.equal(parseWindow(null), 24 * 3600_000);
  assert.equal(parseWindow(undefined), 24 * 3600_000);
});

// ─── parseArgs ───────────────────────────────────────────────────────────────

test("parseArgs: defaults", () => {
  const r = parseArgs([]);
  assert.equal(r.json, false);
  assert.equal(r.window, 24 * 3600_000);
  assert.equal(r.top, 10);
});

test("parseArgs: --json flag", () => {
  const r = parseArgs(["--json"]);
  assert.equal(r.json, true);
});

test("parseArgs: --window override", () => {
  const r = parseArgs(["--window=7d"]);
  assert.equal(r.window, 7 * 86400_000);
});

test("parseArgs: --top override + bounds check", () => {
  assert.equal(parseArgs(["--top=5"]).top, 5);
  // out of range → error
  const tooLarge = parseArgs(["--top=999"]);
  assert.equal(tooLarge.error?.includes("invalid --top"), true);
  const negative = parseArgs(["--top=-1"]);
  assert.equal(negative.error?.includes("invalid --top"), true);
});

test("parseArgs: unknown arg yields error (R12 fail-loud)", () => {
  const r = parseArgs(["--unknown-flag"]);
  assert.equal(typeof r.error, "string");
  assert.match(r.error, /unknown arg/);
});

// ─── readArchive ─────────────────────────────────────────────────────────────

test("readArchive: missing file → { exists: false, entries: [] }", () => {
  const fake = join(tmpdir(), `rtk-archive-test-missing-${process.pid}-${Date.now()}.jsonl`);
  // Make sure it doesn't exist
  if (existsSync(fake)) unlinkSync(fake);
  const r = readArchive(fake);
  assert.equal(r.exists, false);
  assert.deepEqual(r.entries, []);
});

test("readArchive: real file with valid + malformed lines (fail-soft)", () => {
  const fake = join(tmpdir(), `rtk-archive-test-mixed-${process.pid}-${Date.now()}.jsonl`);
  mkdirSync(join(tmpdir()), { recursive: true });
  writeFileSync(fake, [
    JSON.stringify({ captured_at: "2026-05-18T19:00:00Z", cmd_hash: "abc", command: "rtk git status", savings: { likelyHigh: true, lines: 3 } }),
    "{ this-is-malformed",
    JSON.stringify({ captured_at: "2026-05-18T20:00:00Z", cmd_hash: "def", command: "rtk vitest run", savings: { likelyHigh: true, lines: 5 } }),
    "", // empty line skipped
  ].join("\n"));
  try {
    const r = readArchive(fake);
    assert.equal(r.exists, true);
    assert.equal(r.entries.length, 2, "should skip malformed + empty lines");
    assert.equal(r.entries[0].cmd_hash, "abc");
    assert.equal(r.entries[1].cmd_hash, "def");
  } finally {
    unlinkSync(fake);
  }
});

// ─── aggregate ───────────────────────────────────────────────────────────────

test("aggregate: empty entries → zero stats", () => {
  const stats = aggregate([], { window: 24 * 3600_000, top: 10, now: Date.now() });
  assert.equal(stats.lifetime_entries, 0);
  assert.equal(stats.window_entries, 0);
  assert.equal(stats.top_commands.length, 0);
  assert.equal(stats.high_savings_count, 0);
});

test("aggregate: window filter excludes old entries", () => {
  const now = Date.UTC(2026, 4, 18, 20, 0, 0);
  const recent = new Date(now - 1000).toISOString(); // 1s ago, in window
  const stale = new Date(now - 48 * 3600_000).toISOString(); // 48h ago, OUT of 24h window
  const stats = aggregate(
    [
      { captured_at: recent, cmd_hash: "a", command: "rtk git status", session_id: "s1", savings: { likelyHigh: true, lines: 2 } },
      { captured_at: stale, cmd_hash: "b", command: "rtk gh pr view", session_id: "s2", savings: { likelyHigh: true, lines: 4 } },
    ],
    { window: 24 * 3600_000, top: 10, now }
  );
  assert.equal(stats.lifetime_entries, 2);
  assert.equal(stats.window_entries, 1, "only the recent entry should be in window");
  assert.equal(stats.top_commands[0].cmd_hash, "a");
});

test("aggregate: top_commands sorted by count desc", () => {
  const now = Date.now();
  const ts = new Date(now - 1000).toISOString();
  const entries = [
    { captured_at: ts, cmd_hash: "git_status", command: "rtk git status", session_id: "s1", savings: { likelyHigh: true, lines: 2 } },
    { captured_at: ts, cmd_hash: "git_status", command: "rtk git status", session_id: "s2", savings: { likelyHigh: true, lines: 2 } },
    { captured_at: ts, cmd_hash: "git_status", command: "rtk git status", session_id: "s3", savings: { likelyHigh: true, lines: 2 } },
    { captured_at: ts, cmd_hash: "vitest_run", command: "rtk vitest run", session_id: "s1", savings: { likelyHigh: false, lines: 50 } },
  ];
  const stats = aggregate(entries, { window: 24 * 3600_000, top: 10, now });
  assert.equal(stats.top_commands[0].cmd_hash, "git_status");
  assert.equal(stats.top_commands[0].count, 3);
  assert.equal(stats.top_commands[1].cmd_hash, "vitest_run");
  assert.equal(stats.top_commands[1].count, 1);
  assert.equal(stats.unique_sessions, 3);
  assert.equal(stats.high_savings_count, 3, "non-high-savings entry shouldn't count");
});

test("aggregate: top-N truncates", () => {
  const now = Date.now();
  const ts = new Date(now - 1000).toISOString();
  const entries = Array.from({ length: 25 }, (_, i) => ({
    captured_at: ts, cmd_hash: `cmd_${i}`, command: `rtk cmd${i}`, savings: { likelyHigh: false, lines: 10 },
  }));
  const stats = aggregate(entries, { window: 24 * 3600_000, top: 5, now });
  assert.equal(stats.top_commands.length, 5);
});
