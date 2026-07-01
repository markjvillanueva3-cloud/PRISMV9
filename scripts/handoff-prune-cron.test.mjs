#!/usr/bin/env node
/**
 * Tests for handoff-prune-cron.mjs (ECHO-UNDONE H6 / U-HANDOFF-PRUNE-CRON).
 * Run: node --test scripts/handoff-prune-cron.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  archiveSubdir,
  parseWrittenAt,
  planArchive,
  shouldRun,
  STALE_DAYS,
  THROTTLE_DAYS,
} from "./handoff-prune-cron.mjs";

const T0 = Date.parse("2026-05-20T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (d) => T0 - d * DAY;

// ───────────────────────── archiveSubdir ─────────────────────────

test("archiveSubdir: YYYY-MM from a timestamp, zero-padded month", () => {
  assert.equal(archiveSubdir(Date.parse("2026-03-07T00:00:00Z")), "2026-03");
  assert.equal(archiveSubdir(Date.parse("2026-11-30T00:00:00Z")), "2026-11");
  assert.equal(archiveSubdir(Date.parse("2025-01-01T00:00:00Z")), "2025-01");
});

// ───────────────────────── parseWrittenAt ─────────────────────────

test("parseWrittenAt: extracts the frontmatter written_at timestamp", () => {
  const head = "---\nsession: claude-x\nslot: echo\nwritten_at: 2026-05-20T22:00:28.445Z\nmachine: D\n---\n";
  assert.equal(parseWrittenAt(head), Date.parse("2026-05-20T22:00:28.445Z"));
});

test("parseWrittenAt: case-insensitive key, tolerates trailing space", () => {
  assert.equal(parseWrittenAt("Written_At:  2026-03-01T00:00:00Z  "),
    Date.parse("2026-03-01T00:00:00Z"));
});

test("parseWrittenAt: missing/garbage → null (caller falls back to mtime)", () => {
  assert.equal(parseWrittenAt("---\nslot: echo\n---\n"), null);
  assert.equal(parseWrittenAt("written_at: not-a-date"), null);
  assert.equal(parseWrittenAt(""), null);
  assert.equal(parseWrittenAt(null), null);
});

// ───────────────────────── planArchive ─────────────────────────

test("planArchive: only handoffs older than STALE_DAYS are eligible", () => {
  const files = [
    { name: "HANDOFF-golf-fresh.md", mtimeMs: daysAgo(2) },        // active
    { name: "HANDOFF-golf-edge.md", mtimeMs: daysAgo(STALE_DAYS) },// exactly 30d → stale
    { name: "HANDOFF-golf-old.md", mtimeMs: daysAgo(90) },         // stale
  ];
  const plan = planArchive(files, T0, STALE_DAYS);
  assert.equal(plan.length, 2, "fresh kept, 30d + 90d archived");
  assert.deepEqual(plan.map((p) => p.name), ["HANDOFF-golf-old.md", "HANDOFF-golf-edge.md"], "oldest first");
  assert.equal(plan[0].ageDays, 90);
});

test("planArchive: boundary — exactly STALE_DAYS is stale, one ms under is not", () => {
  const onEdge = [{ name: "HANDOFF-x-a.md", mtimeMs: daysAgo(STALE_DAYS) }];
  const justUnder = [{ name: "HANDOFF-x-b.md", mtimeMs: T0 - (STALE_DAYS * DAY - 1) }];
  assert.equal(planArchive(onEdge, T0, STALE_DAYS).length, 1, "exactly 30d → archived");
  assert.equal(planArchive(justUnder, T0, STALE_DAYS).length, 0, "1ms under 30d → kept");
});

test("planArchive: subdir is the handoff's own month, not the run month", () => {
  const f = [{ name: "HANDOFF-x-c.md", mtimeMs: Date.parse("2026-02-14T00:00:00Z") }];
  assert.equal(planArchive(f, T0, STALE_DAYS)[0].subdir, "2026-02");
});

test("planArchive: ignores non-HANDOFF names and missing mtimes", () => {
  const files = [
    { name: "README.md", mtimeMs: daysAgo(99) },
    { name: "HANDOFF-x-d.md" },                       // no mtimeMs
    { name: "HANDOFF-x-e.md", mtimeMs: NaN },
    { name: "HANDOFF-x-f.md", mtimeMs: daysAgo(99) }, // the only valid stale one
  ];
  const plan = planArchive(files, T0, STALE_DAYS);
  assert.deepEqual(plan.map((p) => p.name), ["HANDOFF-x-f.md"]);
});

test("planArchive: empty/null → []", () => {
  assert.deepEqual(planArchive([], T0), []);
  assert.deepEqual(planArchive(null, T0), []);
});

// ───────────────────────── shouldRun (throttle) ─────────────────────────

test("shouldRun: no prior run → run", () => {
  assert.equal(shouldRun(null, T0).run, true);
  assert.equal(shouldRun({}, T0).run, true);
  assert.equal(shouldRun({ lastRunAt: "garbage" }, T0).run, true);
});

test("shouldRun: monthly cadence — exactly THROTTLE_DAYS elapsed → run", () => {
  const last = new Date(T0 - THROTTLE_DAYS * DAY).toISOString();
  assert.equal(shouldRun({ lastRunAt: last }, T0, THROTTLE_DAYS).run, true);
});

test("shouldRun: within the window → throttled (no run)", () => {
  const last = new Date(T0 - 10 * DAY).toISOString();
  const r = shouldRun({ lastRunAt: last }, T0, THROTTLE_DAYS);
  assert.equal(r.run, false);
  assert.ok(r.reason.includes("throttled"));
});

test("shouldRun: one day short of the window → still throttled", () => {
  const last = new Date(T0 - (THROTTLE_DAYS - 1) * DAY).toISOString();
  assert.equal(shouldRun({ lastRunAt: last }, T0, THROTTLE_DAYS).run, false);
});

// ───────────────────────── determinism ─────────────────────────

test("planArchive: deterministic — same input twice is identical", () => {
  const files = [
    { name: "HANDOFF-b-1.md", mtimeMs: daysAgo(40) },
    { name: "HANDOFF-a-1.md", mtimeMs: daysAgo(40) },
    { name: "HANDOFF-c-1.md", mtimeMs: daysAgo(50) },
  ];
  assert.equal(JSON.stringify(planArchive(files, T0)), JSON.stringify(planArchive(files, T0)));
  // equal-age tie broken by name
  const plan = planArchive(files, T0);
  assert.deepEqual(plan.map((p) => p.name), ["HANDOFF-c-1.md", "HANDOFF-a-1.md", "HANDOFF-b-1.md"]);
});
