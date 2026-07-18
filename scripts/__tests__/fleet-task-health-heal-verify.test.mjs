/**
 * fleet-task-health-heal-verify.test.mjs -- U-GOLF-HEAL-VERIFY-LEG.
 *
 * The G10 auto-re-enable guard reports a task `healed` the instant
 * Enable-ScheduledTask returns OK. ENABLED != RAN: a task can be enabled yet
 * never fire (stalled trigger), fire-and-fail, or be re-disabled (flapping).
 * These tests pin the verify-leg that catches the false-healed case by comparing
 * the task's LastRunTime against when it was healed.
 *
 * Pure functions, real reference values; node:test (the scripts/ convention).
 *   Run: node H:/prism/scripts/__tests__/fleet-task-health-heal-verify.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  classifyHealEffectiveness,
  parseRecentHeals,
  readReenableLedgerText,
  assessHealEffectiveness,
  runOnce,
  DEFAULT_HEAL_VERIFY_GRACE_MULT,
  DEFAULT_HEAL_VERIFY_FALLBACK_GRACE_MS,
  DEFAULT_HEAL_VERIFY_LOOKBACK_MS,
} from "../fleet-task-health-watch.mjs";

const MIN = 60 * 1000;

// ─── classifyHealEffectiveness ──────────────────────────────────────────────

test("classifyHealEffectiveness: ran AFTER the heal -> effective", () => {
  const v = classifyHealEffectiveness({
    healedAtMs: 1_000_000, lastRunTimeMs: 1_000_000 + 5 * MIN,
    intervalMs: 5 * MIN, nowMs: 1_000_000 + 6 * MIN,
  });
  assert.equal(v.outcome, "effective");
  assert.match(v.reason, /after the re-enable/);
});

test("classifyHealEffectiveness: not-yet-run but inside the interval grace -> pending", () => {
  // interval 10min, graceMult 2 -> 20min grace; only 5min elapsed.
  const v = classifyHealEffectiveness({
    healedAtMs: 0, lastRunTimeMs: null, intervalMs: 10 * MIN,
    nowMs: 5 * MIN, graceMult: 2,
  });
  assert.equal(v.outcome, "pending");
  assert.match(v.reason, /within the 20min grace window/);
});

test("classifyHealEffectiveness: not-run past the interval grace -> ineffective", () => {
  // interval 5min, graceMult 2 -> 10min grace; 15min elapsed, still never ran.
  const v = classifyHealEffectiveness({
    healedAtMs: 0, lastRunTimeMs: null, intervalMs: 5 * MIN,
    nowMs: 15 * MIN, graceMult: 2,
  });
  assert.equal(v.outcome, "ineffective");
  assert.match(v.reason, /did not take/);
});

test("classifyHealEffectiveness: no interval -> uses the fallback grace (ineffective past 1h)", () => {
  const v = classifyHealEffectiveness({
    healedAtMs: 0, lastRunTimeMs: null, intervalMs: null,
    nowMs: 2 * DEFAULT_HEAL_VERIFY_FALLBACK_GRACE_MS,   // 2h, fallback is 1h
  });
  assert.equal(v.outcome, "ineffective");
});

test("classifyHealEffectiveness: no interval, inside fallback grace -> pending", () => {
  const v = classifyHealEffectiveness({
    healedAtMs: 0, lastRunTimeMs: null, intervalMs: null,
    nowMs: Math.floor(DEFAULT_HEAL_VERIFY_FALLBACK_GRACE_MS / 2),  // 30min < 1h
  });
  assert.equal(v.outcome, "pending");
});

test("classifyHealEffectiveness: a run AT the heal instant is NOT proof (strict >) -> ineffective past grace", () => {
  // lastRun == healedAt (a stale pre-heal run at the same ms) must not count as
  // effective; once grace elapses with no LATER run it is ineffective.
  const v = classifyHealEffectiveness({
    healedAtMs: 1_000, lastRunTimeMs: 1_000, intervalMs: 5 * MIN,
    nowMs: 1_000 + 12 * MIN, graceMult: 2,   // grace 10min, 12min elapsed
  });
  assert.equal(v.outcome, "ineffective");
});

test("classifyHealEffectiveness: grace boundary is inclusive of ineffective (sinceHeal == grace)", () => {
  // grace = 5min*2 = 10min; sinceHeal exactly 10min -> NOT < grace -> ineffective.
  const atBoundary = classifyHealEffectiveness({
    healedAtMs: 0, lastRunTimeMs: null, intervalMs: 5 * MIN, nowMs: 10 * MIN, graceMult: 2,
  });
  assert.equal(atBoundary.outcome, "ineffective");
  const justInside = classifyHealEffectiveness({
    healedAtMs: 0, lastRunTimeMs: null, intervalMs: 5 * MIN, nowMs: 10 * MIN - 1, graceMult: 2,
  });
  assert.equal(justInside.outcome, "pending");
});

test("classifyHealEffectiveness: missing healedAt -> pending (never a false ineffective)", () => {
  assert.equal(classifyHealEffectiveness({ healedAtMs: NaN, lastRunTimeMs: null, nowMs: 9e9 }).outcome, "pending");
  assert.equal(classifyHealEffectiveness({}).outcome, "pending");
});

test("classifyHealEffectiveness: adversarial -- future healedAt (clock skew) -> pending, not ineffective", () => {
  const v = classifyHealEffectiveness({ healedAtMs: 5000, lastRunTimeMs: null, nowMs: 1000, intervalMs: MIN });
  assert.equal(v.outcome, "pending");
  assert.match(v.reason, /future/);
});

test("classifyHealEffectiveness: adversarial -- invalid graceMult/fallback fall back to defaults", () => {
  // graceMult 0/NaN -> DEFAULT (2); proves a bad config cannot make grace=0 and
  // flip every freshly-healed task to ineffective.
  const v = classifyHealEffectiveness({
    healedAtMs: 0, lastRunTimeMs: null, intervalMs: 5 * MIN,
    nowMs: 9 * MIN, graceMult: 0, fallbackGraceMs: -1,
  });
  // default grace = 5min * 2 = 10min; 9min elapsed -> still pending.
  assert.equal(v.outcome, "pending");
  assert.equal(DEFAULT_HEAL_VERIFY_GRACE_MULT, 2);
});

// ─── parseRecentHeals ───────────────────────────────────────────────────────

const NOW = Date.parse("2026-06-20T00:00:00.000Z");
const iso = (msAgo) => new Date(NOW - msAgo).toISOString();

test("parseRecentHeals: keeps the MOST RECENT ok:true heal per task", () => {
  const text = [
    JSON.stringify({ ts: iso(3 * 60 * MIN), task: "PRISM Fleet Reaper", ok: true }),
    JSON.stringify({ ts: iso(1 * 60 * MIN), task: "PRISM Fleet Reaper", ok: true }),   // newer
  ].join("\n");
  const m = parseRecentHeals(text, { nowMs: NOW });
  assert.equal(m.size, 1);
  assert.equal(m.get("PRISM Fleet Reaper"), NOW - 1 * 60 * MIN);   // the newer ts wins
});

test("parseRecentHeals: ok:false rows are NOT heals (a failed enable was never claimed healed)", () => {
  const text = JSON.stringify({ ts: iso(MIN), task: "PRISM X", ok: false });
  assert.equal(parseRecentHeals(text, { nowMs: NOW }).size, 0);
});

test("parseRecentHeals: heals older than the lookback window are dropped", () => {
  const text = [
    JSON.stringify({ ts: iso(2 * DEFAULT_HEAL_VERIFY_LOOKBACK_MS), task: "PRISM Old", ok: true }),   // 48h ago
    JSON.stringify({ ts: iso(60 * MIN), task: "PRISM Recent", ok: true }),                            // 1h ago
  ].join("\n");
  const m = parseRecentHeals(text, { nowMs: NOW });
  assert.deepEqual([...m.keys()], ["PRISM Recent"]);
});

test("parseRecentHeals: malformed lines / bad ts are skipped, not thrown", () => {
  const text = [
    "{not json",
    JSON.stringify({ ts: "not-a-date", task: "PRISM Bad", ok: true }),
    JSON.stringify({ task: "PRISM NoTs", ok: true }),
    "",
    JSON.stringify({ ts: iso(MIN), task: "PRISM Good", ok: true }),
  ].join("\n");
  const m = parseRecentHeals(text, { nowMs: NOW });
  assert.deepEqual([...m.keys()], ["PRISM Good"]);
});

test("parseRecentHeals: empty / non-string -> empty map", () => {
  assert.equal(parseRecentHeals("", { nowMs: NOW }).size, 0);
  assert.equal(parseRecentHeals(null, { nowMs: NOW }).size, 0);
  assert.equal(parseRecentHeals(undefined).size, 0);
});

// ─── readReenableLedgerText ─────────────────────────────────────────────────

test("readReenableLedgerText: missing file -> empty string (fail-soft)", () => {
  assert.equal(readReenableLedgerText("/no/such/path", { existsSync: () => false }), "");
});

test("readReenableLedgerText: read error -> empty string, never throws", () => {
  const io = { existsSync: () => true, readFileSync: () => { throw new Error("EACCES"); } };
  assert.equal(readReenableLedgerText("x", io), "");
});

test("readReenableLedgerText: reads the live file content when present (no .1 generation)", () => {
  const io = { existsSync: (p) => p === "x", readFileSync: (p) => (p === "x" ? "line1\nline2" : "") };
  assert.equal(readReenableLedgerText("x", io), "line1\nline2");
});

test("readReenableLedgerText: concatenates the rotated .1 generation before the live file (rotation-robust)", () => {
  // A recent heal rotated to <path>.1 must still be visible within the lookback;
  // omitting it was the P2 fail-safe miss the verify-leg now closes.
  const io = { existsSync: () => true, readFileSync: (p) => (p.endsWith(".1") ? "older-rows" : "live-rows") };
  assert.equal(readReenableLedgerText("x", io), "older-rows\nlive-rows");
});

// ─── assessHealEffectiveness ────────────────────────────────────────────────

test("assessHealEffectiveness: partitions effective / pending / ineffective from live classifieds", () => {
  const recentHeals = new Map([
    ["PRISM Eff", NOW - 30 * MIN],
    ["PRISM Pend", NOW - 2 * MIN],
    ["PRISM Bad", NOW - 60 * MIN],
  ]);
  const classified = [
    // ran 10min after its heal -> effective
    { name: "PRISM Eff", lastRunTime: new Date(NOW - 20 * MIN).toISOString(), intervalMs: 5 * MIN },
    // healed 2min ago, never ran, interval 10min (grace 20min) -> pending
    { name: "PRISM Pend", lastRunTime: null, intervalMs: 10 * MIN },
    // healed 60min ago, last run is BEFORE the heal, interval 5min (grace 10min) -> ineffective
    { name: "PRISM Bad", lastRunTime: new Date(NOW - 90 * MIN).toISOString(), intervalMs: 5 * MIN },
  ];
  const r = assessHealEffectiveness(classified, recentHeals, NOW, { graceMult: 2 });
  assert.deepEqual(r.effective.map((x) => x.name), ["PRISM Eff"]);
  assert.deepEqual(r.pending.map((x) => x.name), ["PRISM Pend"]);
  assert.deepEqual(r.ineffective.map((x) => x.name), ["PRISM Bad"]);
  // ineffective item carries the evidence the operator needs.
  assert.equal(r.ineffective[0].healedAt, new Date(NOW - 60 * MIN).toISOString());
});

test("assessHealEffectiveness: a healed task NOT in this sample is skipped (missing-detection owns it)", () => {
  const recentHeals = new Map([["PRISM Vanished", NOW - 60 * MIN]]);
  const r = assessHealEffectiveness([], recentHeals, NOW, {});
  assert.deepEqual(r, { effective: [], pending: [], ineffective: [] });
});

test("assessHealEffectiveness: empty recentHeals -> empty partition (no heals to verify)", () => {
  const r = assessHealEffectiveness(
    [{ name: "PRISM X", lastRunTime: null, intervalMs: 5 * MIN }], new Map(), NOW, {});
  assert.deepEqual(r, { effective: [], pending: [], ineffective: [] });
});

test("assessHealEffectiveness: ineffective list is sorted by name (deterministic)", () => {
  const recentHeals = new Map([
    ["PRISM Zeta", NOW - 60 * MIN],
    ["PRISM Alpha", NOW - 60 * MIN],
  ]);
  const classified = [
    { name: "PRISM Zeta", lastRunTime: null, intervalMs: 5 * MIN },
    { name: "PRISM Alpha", lastRunTime: null, intervalMs: 5 * MIN },
  ];
  const r = assessHealEffectiveness(classified, recentHeals, NOW, { graceMult: 2 });
  assert.deepEqual(r.ineffective.map((x) => x.name), ["PRISM Alpha", "PRISM Zeta"]);
});

test("assessHealEffectiveness: non-Map recentHeals -> empty (defensive)", () => {
  assert.deepEqual(
    assessHealEffectiveness([{ name: "x" }], null, NOW, {}),
    { effective: [], pending: [], ineffective: [] });
});

// ─── E2E: round-trip THROUGH runOnce (not just the singletons) ──────────────

test("runOnce: heal-verify partitions live-sampled tasks vs an injected ledger (E2E)", () => {
  const healedAt = NOW - 60 * MIN;
  const ledgerText = [
    JSON.stringify({ schemaVersion: 1, ts: new Date(healedAt).toISOString(), task: "PRISM Fleet Reaper", ok: true, by: "t" }),
    JSON.stringify({ schemaVersion: 1, ts: new Date(healedAt).toISOString(), task: "PRISM Fleet Memory Monitor", ok: true, by: "t" }),
    // an ok:false (failed-enable) row must NOT be verified as a heal
    JSON.stringify({ schemaVersion: 1, ts: new Date(healedAt).toISOString(), task: "PRISM Cleanup Orchestrator", ok: false, by: "t" }),
  ].join("\n");
  const sampler = () => ({ tasks: [
    // healed 60min ago, last ran 90min ago (BEFORE the heal) -> ineffective
    { name: "PRISM Fleet Reaper", state: "Ready", lastRunTime: new Date(NOW - 90 * MIN).toISOString(),
      nextRunTime: new Date(NOW + 5 * MIN).toISOString(), lastTaskResult: 0, triggerIntervals: ["PT5M"] },
    // healed 60min ago, last ran 30min ago (AFTER the heal) -> effective
    { name: "PRISM Fleet Memory Monitor", state: "Ready", lastRunTime: new Date(NOW - 30 * MIN).toISOString(),
      nextRunTime: new Date(NOW + 5 * MIN).toISOString(), lastTaskResult: 0, triggerIntervals: ["PT5M"] },
    // the ok:false task is present + Ready but was never a "heal" -> not in any partition
    { name: "PRISM Cleanup Orchestrator", state: "Ready", lastRunTime: new Date(NOW - 90 * MIN).toISOString(),
      nextRunTime: new Date(NOW + 5 * MIN).toISOString(), lastTaskResult: 0, triggerIntervals: ["PT5M"] },
  ] });
  const res = runOnce({
    dryRun: true, nowMs: NOW, sampler,
    discoverInstallers: () => new Set(),
    _healLedgerIo: { existsSync: () => true, readFileSync: () => ledgerText },
    healVerifyGraceMult: 2,
  });
  // round-trip: the audit result AND the telemetry row (what the Stop hook reads)
  assert.deepEqual(res.healVerify.ineffective.map((x) => x.name), ["PRISM Fleet Reaper"]);
  assert.deepEqual(res.healVerify.effective.map((x) => x.name), ["PRISM Fleet Memory Monitor"]);
  assert.ok(res.row.healVerify, "telemetry row carries healVerify for the Stop hook");
  assert.deepEqual(res.row.healVerify.ineffective.map((x) => x.name), ["PRISM Fleet Reaper"]);
  // the ok:false enable was never claimed healed -> never verified (no false alarm)
  const allNames = [...res.healVerify.effective, ...res.healVerify.pending, ...res.healVerify.ineffective].map((x) => x.name);
  assert.ok(!allNames.includes("PRISM Cleanup Orchestrator"));
});
