/**
 * stop-token-savings-summary — pure-helper unit tests
 *
 * TOKEN-SAVINGS-SUMMARY/U-TSS01 (2026-05-24, slot:alpha)
 *
 * Validates the 4 exported pure helpers:
 *   - parseLedgerTail(text)      → jsonl nudge/saved-token aggregator
 *   - parseLedgerJson(obj)       → object-shape (ollama/mcp-route/route-savings) aggregator
 *   - aggregateAcrossLedgers(by) → cross-ledger sum + top-3 reasons
 *   - formatSummary(agg)         → one-line human message
 *   - shouldEmit(lockPath, now)  → throttle gate
 *
 * Uses node:test (matches sibling hook tests, e.g. auto-learn-budget-guard.test.mjs).
 */

import { test } from "node:test";
import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync, utimesSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  parseLedgerTail,
  parseLedgerJson,
  aggregateAcrossLedgers,
  formatSummary,
  shouldEmit,
} from "../stop-token-savings-summary.mjs";

// ── parseLedgerTail ────────────────────────────────────────────────────────

test("parseLedgerTail counts nudge:true entries and tallies reasons", () => {
  const text = [
    JSON.stringify({ ts: "x", tool: "Grep", nudge: true, reason: "broad-grep" }),
    JSON.stringify({ ts: "x", tool: "Grep", nudge: true, reason: "broad-grep" }),
    JSON.stringify({ ts: "x", tool: "Bash", nudge: true, reason: "verbose-bash" }),
    JSON.stringify({ ts: "x", tool: "Glob", nudge: false, reason: "scoped-enough" }),
    "",
    "{malformed",
  ].join("\n");
  const r = parseLedgerTail(text);
  assert.equal(r.nudgeCount, 3);
  assert.equal(r.nudgeReasons["broad-grep"], 2);
  assert.equal(r.nudgeReasons["verbose-bash"], 1);
  assert.ok(!r.nudgeReasons["scoped-enough"], "non-nudge should not contribute");
  assert.equal(r.lines, 4, "malformed line + empty line skipped");
});

test("parseLedgerTail sums rtk measured saved-tokens (est − observed)", () => {
  const text = [
    JSON.stringify({ ts: "x", kind: "measured", base: "ls", est_tokens: 650, observed_tokens: 129 }),
    JSON.stringify({ ts: "x", kind: "measured", base: "git", est_tokens: 700, observed_tokens: 43 }),
    JSON.stringify({ ts: "x", kind: "measured", base: "ls", est_tokens: 500, observed_tokens: 500 }),
  ].join("\n");
  const r = parseLedgerTail(text);
  // (650-129) + (700-43) + (500-500) = 521 + 657 + 0 = 1178
  assert.equal(r.savedTokens, 1178);
  assert.equal(r.nudgeReasons["rtk:ls"], 2);
  assert.equal(r.nudgeReasons["rtk:git"], 1);
});

test("parseLedgerTail handles null/empty/non-string input fail-soft", () => {
  assert.deepEqual(parseLedgerTail(null), { nudgeCount: 0, nudgeReasons: {}, savedTokens: 0, lines: 0 });
  assert.deepEqual(parseLedgerTail(""),   { nudgeCount: 0, nudgeReasons: {}, savedTokens: 0, lines: 0 });
  assert.deepEqual(parseLedgerTail(42),   { nudgeCount: 0, nudgeReasons: {}, savedTokens: 0, lines: 0 });
});

// ── parseLedgerJson ────────────────────────────────────────────────────────

test("parseLedgerJson extracts ollama-offload-stats shape", () => {
  const obj = {
    estimatedTokensSaved: 12345,
    byHook: { "ollama-pipeline-injector": 30, "wiki-read-offload-advisory": { suggested: 10 } },
    byCategory: { summarize: 20, explain: 5 },
  };
  const r = parseLedgerJson(obj);
  assert.equal(r.savedTokens, 12345);
  assert.equal(r.nudgeReasons["ollama-pipeline-injector"], 30);
  assert.equal(r.nudgeReasons["wiki-read-offload-advisory"], 10);
  assert.equal(r.nudgeReasons["summarize"], 20);
});

test("parseLedgerJson extracts mcp-route-suggest-stats shape", () => {
  const obj = {
    totalFires: 1067,
    byClassifier: { backendAuditChain: 792, isBroadGrep: 1, doctrineSurface: 211 },
    byToolName: { Read: 426, Edit: 385 },
  };
  const r = parseLedgerJson(obj);
  assert.equal(r.nudgeCount, 1067);
  assert.equal(r.nudgeReasons["backendAuditChain"], 792);
  assert.equal(r.nudgeReasons["doctrineSurface"], 211);
  assert.equal(r.nudgeReasons["Read"], 426);
});

test("parseLedgerJson fail-soft on null/garbage", () => {
  assert.equal(parseLedgerJson(null).savedTokens, 0);
  assert.equal(parseLedgerJson("string").savedTokens, 0);
  assert.equal(parseLedgerJson({}).savedTokens, 0);
});

// ── aggregateAcrossLedgers ─────────────────────────────────────────────────

test("aggregateAcrossLedgers sums across all 5 ledgers and emits top-3", () => {
  const byLedger = {
    "pre-tool-savings-multi": { nudgeCount: 3, nudgeReasons: { "broad-grep": 2, "verbose-bash": 1 }, savedTokens: 0, lines: 5 },
    "rtk-adoption-measure":   { nudgeCount: 0, nudgeReasons: { "rtk:git": 5, "rtk:ls": 2 }, savedTokens: 1178, lines: 7 },
    "ollama-offload-stats":   { nudgeCount: 0, nudgeReasons: { "ollama-pipeline-injector": 30 }, savedTokens: 12345, lines: 0 },
    "route-savings-stats":    { nudgeCount: 0, nudgeReasons: {}, savedTokens: 0, lines: 0 },
    "mcp-route-suggest":      { nudgeCount: 1067, nudgeReasons: { "backendAuditChain": 792, "doctrineSurface": 211 }, savedTokens: 0, lines: 0 },
  };
  const r = aggregateAcrossLedgers(byLedger);
  assert.equal(r.totalSavedTokens, 1178 + 12345);
  assert.equal(r.totalNudges, 3 + 1067);
  assert.equal(r.ledgersWithData, 4, "route-savings-stats has no data");
  assert.equal(r.topReasons.length, 3);
  // Highest count first
  assert.deepEqual(r.topReasons[0], ["backendAuditChain", 792]);
  assert.deepEqual(r.topReasons[1], ["doctrineSurface", 211]);
  assert.deepEqual(r.topReasons[2], ["ollama-pipeline-injector", 30]);
});

test("aggregateAcrossLedgers handles empty/null input fail-soft", () => {
  const r1 = aggregateAcrossLedgers(null);
  assert.equal(r1.totalSavedTokens, 0);
  assert.equal(r1.totalNudges, 0);
  assert.equal(r1.ledgersWithData, 0);
  const r2 = aggregateAcrossLedgers({});
  assert.equal(r2.ledgersWithData, 0);
});

// ── formatSummary ──────────────────────────────────────────────────────────

test("formatSummary renders 💰 line with k-scale + top reasons", () => {
  const msg = formatSummary({
    totalSavedTokens: 13523,
    totalNudges: 1070,
    ledgersWithData: 4,
    topReasons: [["backendAuditChain", 792], ["doctrineSurface", 211], ["broad-grep", 2]],
  });
  assert.ok(msg.startsWith("💰 Session token-savings: "), "must start with 💰 marker");
  assert.ok(msg.includes("~13.5k tokens"), "must format k-scale");
  assert.ok(msg.includes("4/5 ledgers"), "must include ledger fraction");
  assert.ok(msg.includes("1070 nudges"), "must include nudge total");
  assert.ok(msg.includes("backendAuditChain×792"));
  assert.ok(msg.includes("doctrineSurface×211"));
  assert.ok(msg.includes("broad-grep×2"));
});

test("formatSummary returns empty-window message when nothing tracked", () => {
  const msg = formatSummary({ totalSavedTokens: 0, totalNudges: 0, ledgersWithData: 0, topReasons: [] });
  assert.ok(msg.includes("no telemetry tracked"));
});

test("formatSummary falls back to raw count when <1000", () => {
  const msg = formatSummary({
    totalSavedTokens: 521,
    totalNudges: 3,
    ledgersWithData: 1,
    topReasons: [["broad-grep", 2]],
  });
  assert.ok(msg.includes("~521 tokens"), "no k-scale below 1000");
  assert.ok(!msg.includes("k tokens"));
});

// ── shouldEmit (throttle) ──────────────────────────────────────────────────

test("shouldEmit returns true when lock file missing", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "tss-"));
  const lockPath = path.join(tmp, "throttle.lock");
  assert.equal(shouldEmit(lockPath, Date.now(), 30 * 60_000), true);
});

test("shouldEmit returns false when lock is fresh (<throttle)", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "tss-"));
  const lockPath = path.join(tmp, "throttle.lock");
  writeFileSync(lockPath, "", "utf8");
  // touch to now
  const now = Date.now();
  const recent = new Date(now - 5 * 60_000); // 5 min ago
  utimesSync(lockPath, recent, recent);
  assert.equal(shouldEmit(lockPath, now, 30 * 60_000), false);
});

test("shouldEmit returns true when lock is stale (>=throttle)", () => {
  const tmp = mkdtempSync(path.join(tmpdir(), "tss-"));
  const lockPath = path.join(tmp, "throttle.lock");
  writeFileSync(lockPath, "", "utf8");
  const now = Date.now();
  const old = new Date(now - 45 * 60_000); // 45 min ago, > 30 min throttle
  utimesSync(lockPath, old, old);
  assert.equal(shouldEmit(lockPath, now, 30 * 60_000), true);
});
