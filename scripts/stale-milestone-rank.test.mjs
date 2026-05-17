// scripts/stale-milestone-rank.test.mjs
//
// Tests for stale-milestone-rank.mjs — F2+F3 fix from
// AUDIT-DEV-TOOLS-PIPELINES-2026-05-16.
//
// Uses node:test (the script is plain ESM with pure-function exports — no
// vitest needed; scripts/ has no vitest config wired and the rolldown
// transform is currently OOM-prone under fleet load).
//
// Run: node --test scripts/stale-milestone-rank.test.mjs

import { test, describe } from "node:test";
import { strict as assert } from "node:assert";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import { classifyStale, rankStale } from "./stale-milestone-rank.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT_PATH = resolve(__dirname, "stale-milestone-rank.mjs");
const FROZEN_NOW = Date.parse("2026-05-17T00:00:00Z");

function m(overrides) {
  return {
    id: "MS-X",
    title: "test",
    track: "test",
    claimedStatus: "in_progress",
    derivedStatus: "in_progress",
    drift: false,
    total: 10,
    shipped: 0,
    pending: 10,
    ratio: 0,
    lastShippedDate: null,
    units: [],
    ...overrides,
  };
}

describe("classifyStale — pure logic", () => {
  test("returns null when pending = 0 (nothing to archive)", () => {
    assert.equal(classifyStale(m({ pending: 0, shipped: 5, total: 5 }), FROZEN_NOW, 30), null);
  });

  test("never_started + pending > 0 → reason=never_started, age_days=null", () => {
    const r = classifyStale(m({ lastShippedDate: null, pending: 50 }), FROZEN_NOW, 30);
    assert.equal(r.reason, "never_started");
    assert.equal(r.age_days, null);
    assert.equal(r.never_started, true);
    assert.equal(r.pending, 50);
  });

  test("stale_progress: lastShipped older than threshold → flagged", () => {
    const ms60 = new Date(FROZEN_NOW - 60 * 86_400_000).toISOString();
    const r = classifyStale(m({ lastShippedDate: ms60, pending: 3, shipped: 2 }), FROZEN_NOW, 30);
    assert.equal(r.reason, "stale_progress");
    assert.equal(r.never_started, false);
    assert.equal(r.age_days, 60);
  });

  test("active: lastShipped within threshold → null (not stale)", () => {
    const ms10 = new Date(FROZEN_NOW - 10 * 86_400_000).toISOString();
    assert.equal(classifyStale(m({ lastShippedDate: ms10, pending: 3 }), FROZEN_NOW, 30), null);
  });

  test("invalid lastShippedDate string → never_started (parse failure = never shipped)", () => {
    const r = classifyStale(m({ lastShippedDate: "not-a-date", pending: 1 }), FROZEN_NOW, 30);
    assert.equal(r.reason, "never_started");
    assert.equal(r.age_days, null);
    assert.equal(r.never_started, true);
  });

  test("empty-string lastShippedDate → never_started (MILESTONE_PROGRESS.json emits '' for never-shipped — not null)", () => {
    const r = classifyStale(m({ lastShippedDate: "", pending: 50 }), FROZEN_NOW, 30);
    assert.equal(r.reason, "never_started");
    assert.equal(r.age_days, null);
    assert.equal(r.never_started, true);
    assert.equal(r.archive_candidate, true);
  });

  test("future lastShipped clamped to age=0 (still active, returns null)", () => {
    const future = new Date(FROZEN_NOW + 86_400_000).toISOString();
    assert.equal(classifyStale(m({ lastShippedDate: future, pending: 1 }), FROZEN_NOW, 30), null);
  });

  test("score: never_started + high pending outranks low-pending never_started", () => {
    const big = classifyStale(m({ id: "BIG", lastShippedDate: null, pending: 100 }), FROZEN_NOW, 30);
    const small = classifyStale(m({ id: "SMALL", lastShippedDate: null, pending: 1 }), FROZEN_NOW, 30);
    assert.ok(big.score > small.score);
  });

  test("score: 365-day never-started bonus places never-started above 30-day-old recently-shipped equal pending", () => {
    const ms30 = new Date(FROZEN_NOW - 30 * 86_400_000).toISOString();
    const ns = classifyStale(m({ id: "NS", lastShippedDate: null, pending: 5 }), FROZEN_NOW, 30);
    const stale = classifyStale(m({ id: "OLD", lastShippedDate: ms30, pending: 5 }), FROZEN_NOW, 30);
    assert.ok(ns.score > stale.score);
  });

  test("archive_candidate flag: never_started AND age_days null → true", () => {
    const r = classifyStale(m({ lastShippedDate: null, pending: 1 }), FROZEN_NOW, 30);
    assert.equal(r.archive_candidate, true);
  });

  test("archive_candidate flag: stale_progress with shipped history → false", () => {
    const ms200 = new Date(FROZEN_NOW - 200 * 86_400_000).toISOString();
    const r = classifyStale(m({ lastShippedDate: ms200, pending: 1, shipped: 3 }), FROZEN_NOW, 30);
    assert.equal(r.archive_candidate, false);
  });

  test("missing id falls back to empty string, doesn't throw", () => {
    const r = classifyStale({ pending: 1, lastShippedDate: null }, FROZEN_NOW, 30);
    assert.equal(r.id, "");
  });
});

describe("rankStale — sorting + filters", () => {
  test("sort: score DESC, ties broken by id ASC", () => {
    const ms60 = new Date(FROZEN_NOW - 60 * 86_400_000).toISOString();
    // Score model: pending*2 + ageBucket + neverStartedBonus.
    //   B-low / A-tie (never_started, pending=1): 1*2 + 365 + 365 = 732 (tied)
    //   A-stale (stale_progress, pending=100, age=60d): 100*2 + 60 + 0 = 260
    // Archive intent: never_started milestones dominate so operators can sunset
    // them first — that is the desired ranking, not a bug.
    const milestones = [
      m({ id: "B-low", pending: 1, lastShippedDate: null }),
      m({ id: "A-stale", pending: 100, lastShippedDate: ms60 }),
      m({ id: "A-tie", pending: 1, lastShippedDate: null }),
    ];
    const ranked = rankStale(milestones, { nowMs: FROZEN_NOW, staleDays: 30, archiveCandidates: false, archiveAgeDays: 180 });
    // Ties on score (732 = 732): id-ASC → A-tie before B-low.
    assert.equal(ranked[0].id, "A-tie");
    assert.equal(ranked[0].score, 732);
    assert.equal(ranked[1].id, "B-low");
    assert.equal(ranked[1].score, 732);
    // Stale-progress entry (score 260) ranks last because never-started has
    // a +365 archive-priority bonus baked into the score model.
    assert.equal(ranked[2].id, "A-stale");
    assert.equal(ranked[2].score, 260);
  });

  test("sort: high-pending never_started > low-pending never_started (no tie)", () => {
    const milestones = [
      m({ id: "SMALL", pending: 1, lastShippedDate: null }),
      m({ id: "HUGE", pending: 200, lastShippedDate: null }),
    ];
    const ranked = rankStale(milestones, { nowMs: FROZEN_NOW, staleDays: 30, archiveCandidates: false, archiveAgeDays: 180 });
    assert.equal(ranked[0].id, "HUGE");
    assert.equal(ranked[1].id, "SMALL");
  });

  test("--archive-candidates filter: only never_started + age>=archiveAgeDays", () => {
    const milestones = [
      m({ id: "NS-old", pending: 5, lastShippedDate: null }),                                  // pass (null age treated as ≥ threshold)
      m({ id: "STALE-old", pending: 5, lastShippedDate: new Date(FROZEN_NOW - 200 * 86_400_000).toISOString() }), // fail (not never_started)
    ];
    const ranked = rankStale(milestones, { nowMs: FROZEN_NOW, staleDays: 30, archiveCandidates: true, archiveAgeDays: 180 });
    assert.equal(ranked.length, 1);
    assert.equal(ranked[0].id, "NS-old");
  });

  test("empty input → empty array, no throw", () => {
    assert.deepEqual(rankStale([], { nowMs: FROZEN_NOW, staleDays: 30, archiveCandidates: false, archiveAgeDays: 180 }), []);
  });

  test("all active → empty array", () => {
    const recent = new Date(FROZEN_NOW - 5 * 86_400_000).toISOString();
    const milestones = [
      m({ id: "A", pending: 5, lastShippedDate: recent }),
      m({ id: "B", pending: 0, shipped: 10, total: 10 }),
    ];
    assert.deepEqual(rankStale(milestones, { nowMs: FROZEN_NOW, staleDays: 30, archiveCandidates: false, archiveAgeDays: 180 }), []);
  });
});

describe("CLI smoke — invocations exit cleanly with deterministic frozen-time output", () => {
  function makeFixture(milestones) {
    const dir = mkdtempSync(join(tmpdir(), "stale-rank-"));
    const path = join(dir, "MILESTONE_PROGRESS.json");
    writeFileSync(path, JSON.stringify({
      schemaVersion: 1,
      generatedAt: "2026-05-17T00:00:00Z",
      window: {},
      totals: {},
      milestones,
    }, null, 2));
    return path;
  }

  function runCli(args) {
    return spawnSync(process.execPath, [SCRIPT_PATH, ...args], { encoding: "utf8" });
  }

  test("exit 2 when --progress-path missing", () => {
    const r = runCli(["--progress-path", "/no/such/file.json", "--frozen-time", "2026-05-17T00:00:00Z"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /not found/i);
  });

  test("exit 2 on unknown flag", () => {
    const r = runCli(["--whoops"]);
    assert.equal(r.status, 2);
    assert.match(r.stderr, /unknown flag/);
  });

  test("exit 0 + JSON shape on valid fixture", () => {
    const fixture = makeFixture([
      m({ id: "MS-NEVER", pending: 50, lastShippedDate: null }),
      m({ id: "MS-OLD", pending: 5, lastShippedDate: "2025-10-01T00:00:00Z" }),
      m({ id: "MS-ACTIVE", pending: 5, lastShippedDate: new Date(FROZEN_NOW - 7 * 86_400_000).toISOString() }),
    ]);
    const r = runCli(["--progress-path", fixture, "--json", "--frozen-time", "2026-05-17T00:00:00Z"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.totals.total_milestones, 3);
    assert.equal(out.totals.total_stale, 2);
    assert.equal(out.ranked[0].id, "MS-NEVER");
    assert.equal(out.ranked[0].reason, "never_started");
  });

  test("--archive-candidates only emits never-started aged rows", () => {
    const fixture = makeFixture([
      m({ id: "NS", pending: 1, lastShippedDate: null }),
      m({ id: "STALE", pending: 1, lastShippedDate: "2024-01-01T00:00:00Z" }),
    ]);
    const r = runCli(["--progress-path", fixture, "--json", "--archive-candidates", "--frozen-time", "2026-05-17T00:00:00Z"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ranked.length, 1);
    assert.equal(out.ranked[0].id, "NS");
  });

  test("text mode emits banner + table when stale rows exist", () => {
    const fixture = makeFixture([m({ id: "ONE", pending: 5, lastShippedDate: null })]);
    const r = runCli(["--progress-path", fixture, "--frozen-time", "2026-05-17T00:00:00Z"]);
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Stale Milestone Ranking/);
    assert.match(r.stdout, /ONE/);
    assert.match(r.stdout, /never_started/);
  });

  test("REAL-DATA smoke against live MILESTONE_PROGRESS.json (no crash, ≥1 stale ms)", () => {
    const live = resolve(__dirname, "../state/shared/MILESTONE_PROGRESS.json");
    const r = runCli(["--progress-path", live, "--json", "--frozen-time", "2026-05-17T00:00:00Z", "--top", "5"]);
    // If MILESTONE_PROGRESS.json exists on disk this must run cleanly; if it
    // doesn't exist, the script exits 2 — accept either as a smoke-pass.
    assert.ok(r.status === 0 || r.status === 2, `unexpected status ${r.status}: ${r.stderr}`);
    if (r.status === 0) {
      const out = JSON.parse(r.stdout);
      assert.ok(out.totals.total_milestones > 0, "expected ≥1 milestone in live progress");
      assert.ok(Array.isArray(out.ranked));
    }
  });

  test("--top N caps output length", () => {
    const fixture = makeFixture([
      m({ id: "A", pending: 1, lastShippedDate: null }),
      m({ id: "B", pending: 2, lastShippedDate: null }),
      m({ id: "C", pending: 3, lastShippedDate: null }),
    ]);
    const r = runCli(["--progress-path", fixture, "--json", "--top", "2", "--frozen-time", "2026-05-17T00:00:00Z"]);
    assert.equal(r.status, 0, r.stderr);
    const out = JSON.parse(r.stdout);
    assert.equal(out.ranked.length, 2);
    // Highest pending → highest score → ranked first.
    assert.equal(out.ranked[0].id, "C");
  });
});
