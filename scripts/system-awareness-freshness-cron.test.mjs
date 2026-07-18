/**
 * system-awareness-freshness-cron.test.mjs — paired with the U-SAF-F2 cron wrapper.
 *
 * Coverage floor: happy + ≥3 failure modes + ≥2 adversarial + ≥3 variability.
 *
 * Tests the pure core (shouldRefreshBaseline / buildHistoryRow / baselineNameForDate /
 * planBaselineRefresh) + subprocess oracle for the script entry point.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  shouldRefreshBaseline,
  buildHistoryRow,
  baselineNameForDate,
  planBaselineRefresh,
} from "./system-awareness-freshness-cron.mjs";

const CRON_PATH = fileURLToPath(new URL("./system-awareness-freshness-cron.mjs", import.meta.url));
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── shouldRefreshBaseline ───────────────────────────────────────────────

test("shouldRefreshBaseline: missing baseline (mtime null/0) → refresh", () => {
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: null, nowMs: Date.now(), refreshDays: 7 }), true);
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: 0, nowMs: Date.now(), refreshDays: 7 }), true);
});

test("shouldRefreshBaseline: baseline 8 days old → refresh", () => {
  const now = Date.now();
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: now - 8 * MS_PER_DAY, nowMs: now, refreshDays: 7 }), true);
});

test("shouldRefreshBaseline: baseline 3 days old → keep", () => {
  const now = Date.now();
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: now - 3 * MS_PER_DAY, nowMs: now, refreshDays: 7 }), false);
});

test("shouldRefreshBaseline: exactly at the threshold (>=) → refresh", () => {
  const now = Date.now();
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: now - 7 * MS_PER_DAY, nowMs: now, refreshDays: 7 }), true);
});

test("shouldRefreshBaseline: NaN nowMs → skip refresh (conservative)", () => {
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: 100, nowMs: NaN, refreshDays: 7 }), false);
});

// ─── buildHistoryRow ─────────────────────────────────────────────────────

test("buildHistoryRow: well-formed audit → stable row shape", () => {
  const audit = {
    generatedAt: "2026-05-19T22:00:00.000Z",
    lookbackDays: 7,
    commitCount: 100,
    milestoneTokenCount: 50,
    summary: { total: 30, byCategory: { 1: 25, 3: 5 }, bySeverity: { high: 28, low: 2 } },
  };
  const row = buildHistoryRow(audit);
  assert.equal(row.total, 30);
  assert.equal(row.bySeverity.high, 28);
  assert.equal(row.byCategory[1], 25);
  assert.equal(row.lookbackDays, 7);
});

test("buildHistoryRow: missing summary → throws (fail-loud)", () => {
  assert.throws(() => buildHistoryRow({}), /needs audit with summary/);
  assert.throws(() => buildHistoryRow(null), /needs audit with summary/);
});

// ─── baselineNameForDate ────────────────────────────────────────────────

test("baselineNameForDate: known epoch → expected ISO-date suffix", () => {
  // 2026-05-19 12:00:00 UTC ≈ epoch 1779360000000
  const name = baselineNameForDate(new Date("2026-05-19T12:00:00.000Z").getTime());
  // The date used is local-date, so we just assert the prefix + .json shape.
  assert.match(name, /^SYSTEM-AWARENESS-FRESHNESS-BASELINE-\d{4}-\d{2}-\d{2}\.json$/);
});

test("baselineNameForDate: zero-pads single-digit month + day", () => {
  // 2026-01-05
  const name = baselineNameForDate(new Date("2026-01-05T12:00:00.000Z").getTime());
  assert.match(name, /BASELINE-2026-01-0\d\.json/);
});

// ─── planBaselineRefresh ─────────────────────────────────────────────────

test("planBaselineRefresh: no baseline → refresh with today's name", () => {
  const r = planBaselineRefresh({ latestName: null, latestMtimeMs: null, nowMs: Date.now() });
  assert.equal(r.refresh, true);
  assert.match(r.targetName, /^SYSTEM-AWARENESS-FRESHNESS-BASELINE-/);
  assert.match(r.reason, /no baseline/);
});

test("planBaselineRefresh: stale baseline → refresh", () => {
  const now = Date.now();
  const r = planBaselineRefresh({
    latestName: "SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-10.json",
    latestMtimeMs: now - 10 * MS_PER_DAY,
    nowMs: now, refreshDays: 7,
  });
  assert.equal(r.refresh, true);
  assert.match(r.reason, /older than 7d/);
});

test("planBaselineRefresh: fresh baseline → keep, no refresh", () => {
  const now = Date.now();
  const r = planBaselineRefresh({
    latestName: "SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-19.json",
    latestMtimeMs: now - 2 * MS_PER_DAY,
    nowMs: now, refreshDays: 7,
  });
  assert.equal(r.refresh, false);
  assert.equal(r.targetName, "SYSTEM-AWARENESS-FRESHNESS-BASELINE-2026-05-19.json");
  assert.match(r.reason, /fresh enough/);
});

// ─── Subprocess oracle (cron entry point) ────────────────────────────────

function runCron(env = {}, args = []) {
  const r = spawnSync(process.execPath, [CRON_PATH, ...args], {
    env: { ...process.env, ...env },
    encoding: "utf-8",
    timeout: 30000,
  });
  return { code: r.status, signal: r.signal, stdout: r.stdout || "", stderr: r.stderr || "" };
}

test("cron E2E: --dry-run --json against live repo → ok structured summary", () => {
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), "saf-cron-"));
    const history = join(dir, "history.jsonl");
    const r = runCron(
      { PRISM_SAF_CRON_HISTORY: history },
      ["--dry-run", "--json"],
    );
    // Should not write history in --dry-run.
    assert.equal(existsSync(history), false);
    assert.ok([0, 1].includes(r.code), "exit 0 or 1 (1 = staleness found, both ok)");
    const summary = JSON.parse(r.stdout);
    assert.equal(summary.ok, true);
    assert.equal(summary.historyAppended, false);
    assert.ok(typeof summary.audit7Total === "number");
    assert.ok(typeof summary.audit7High === "number");
  } finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
});

test("cron E2E: live apply → history.jsonl gets one row appended", () => {
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), "saf-cron-"));
    const history = join(dir, "history.jsonl");
    const r = runCron({ PRISM_SAF_CRON_HISTORY: history }, []);
    assert.ok([0, 1].includes(r.code));
    assert.equal(existsSync(history), true);
    const lines = readFileSync(history, "utf-8").trim().split("\n").filter(Boolean);
    assert.equal(lines.length, 1, "exactly one row per cron pass");
    const row = JSON.parse(lines[0]);
    assert.ok(typeof row.total === "number");
    assert.ok(row.generatedAt);
    assert.ok(typeof row.commitCount === "number");
  } finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
});

test("cron E2E: PRISM_SAF_CRON_DISABLE=1 → exit 0, no output", () => {
  const r = runCron({ PRISM_SAF_CRON_DISABLE: "1" }, ["--json"]);
  assert.equal(r.code, 0);
  assert.equal(r.stdout, ""); // disable bypass returns silently
});

// ─── Failure modes ───────────────────────────────────────────────────────

test("failure: history path in unwritable dir → exit 2 (R12 surface the error)", () => {
  // Pointing to a path inside a deep non-existent dir → appendFileSync throws.
  const r = runCron(
    { PRISM_SAF_CRON_HISTORY: "/no/such/dir/that/cannot/exist/history.jsonl" },
    [],
  );
  assert.equal(r.code, 2);
  assert.match(r.stderr, /saf-cron: error/);
});

test("failure: invalid PRISM_SAF_CRON_BASELINE_REFRESH_DAYS=garbage → falls back to default (no crash)", () => {
  let dir;
  try {
    dir = mkdtempSync(join(tmpdir(), "saf-cron-"));
    const r = runCron(
      { PRISM_SAF_CRON_HISTORY: join(dir, "h.jsonl"), PRISM_SAF_CRON_BASELINE_REFRESH_DAYS: "abc" },
      ["--dry-run", "--json"],
    );
    assert.ok([0, 1].includes(r.code));
    const summary = JSON.parse(r.stdout);
    assert.equal(summary.ok, true);
  } finally { if (dir) rmSync(dir, { recursive: true, force: true }); }
});

// ─── Adversarial ─────────────────────────────────────────────────────────

test("adversarial: shouldRefreshBaseline with Infinity refreshDays → never refresh fresh baselines", () => {
  const now = Date.now();
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: now, nowMs: now, refreshDays: Infinity }), false);
});

test("adversarial: shouldRefreshBaseline with negative refreshDays → always refresh (threshold ≤ 0)", () => {
  const now = Date.now();
  // ageMs (0) >= refreshDays * MS_PER_DAY (negative) is true → refresh.
  assert.equal(shouldRefreshBaseline({ latestMtimeMs: now, nowMs: now, refreshDays: -1 }), true);
});

test("adversarial: planBaselineRefresh with NaN mtime → falls through to no-baseline path", () => {
  const r = planBaselineRefresh({ latestName: "x.json", latestMtimeMs: NaN, nowMs: Date.now() });
  // NaN treated as missing (shouldRefreshBaseline returns true for non-finite mtime)
  assert.equal(r.refresh, true);
});

// ─── Variability ─────────────────────────────────────────────────────────

test("variability: refreshDays = 1, 7, 30 — boundary cases all decide correctly", () => {
  const now = Date.now();
  for (const days of [1, 7, 30]) {
    const justUnder = shouldRefreshBaseline({ latestMtimeMs: now - (days - 0.5) * MS_PER_DAY, nowMs: now, refreshDays: days });
    const justOver = shouldRefreshBaseline({ latestMtimeMs: now - (days + 0.5) * MS_PER_DAY, nowMs: now, refreshDays: days });
    assert.equal(justUnder, false, "just under " + days + "d → keep");
    assert.equal(justOver, true, "just over " + days + "d → refresh");
  }
});

test("variability: history-row shape stable across audit-shape variants", () => {
  const audits = [
    { generatedAt: "X", lookbackDays: 1, commitCount: 0, milestoneTokenCount: 0,
      summary: { total: 0, byCategory: {}, bySeverity: {} } },
    { generatedAt: "Y", lookbackDays: 7, commitCount: 100, milestoneTokenCount: 50,
      summary: { total: 10, byCategory: { 1: 10 }, bySeverity: { high: 10 } } },
    { generatedAt: "Z", lookbackDays: 30, commitCount: 1000, milestoneTokenCount: 500,
      summary: { total: 500, byCategory: { 1: 400, 3: 50, 5: 10, 6: 40 }, bySeverity: { high: 460, low: 40 } } },
  ];
  for (const audit of audits) {
    const row = buildHistoryRow(audit);
    assert.equal(typeof row.total, "number");
    assert.equal(typeof row.commitCount, "number");
    assert.ok(row.byCategory);
    assert.ok(row.bySeverity);
  }
});

test("variability: baselineNameForDate produces deterministic stable output for the same epoch", () => {
  const epoch = new Date("2026-05-19T12:00:00.000Z").getTime();
  const a = baselineNameForDate(epoch);
  const b = baselineNameForDate(epoch);
  assert.equal(a, b);
});
