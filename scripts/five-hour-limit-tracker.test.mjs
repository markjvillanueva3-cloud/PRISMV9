// Tests for five-hour-limit-tracker.mjs -- the 429 session-limit calibration that
// turns Claude Code's own transcript rate-limit events into the OBSERVED 5h ceiling
// (replacing the guessed 88M). Real verified record shapes (pulled from 2 live
// transcripts 2026-06-18); exact reference values (R9: a test must fail if the
// business logic changes). Fixtures are ASCII-only (the live text uses a non-ASCII
// middot separator; classification is word-based so dropping it is faithful).
import { test } from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import {
  weightedOf,
  classifyRateLimitText,
  classifyRateLimitRecord,
  parseResetClock,
  clusterEvents,
  buildPrefixSums,
  weightedInWindow,
  percentile,
  calibrateFromEvidence,
  recommendBudget,
  computeStatus,
  scanTranscript,
  calibrateCeiling,
  liveStatus,
  readObservedCeiling,
  writeObservedCeiling,
  DEFAULT_ARM_PCT,
} from "./five-hour-limit-tracker.mjs";

const HOUR = 60 * 60 * 1000;

// A real session-limit 429 record (verified shape; middot dropped from text).
function sessionLimitBlock(tsIso, text = "You've hit your session limit  resets 3:10pm (America/Chicago)") {
  return {
    type: "assistant",
    timestamp: tsIso,
    message: { id: "x", model: "<synthetic>", content: [{ type: "text", text }],
      usage: { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } },
    error: "rate_limit", isApiErrorMessage: true, apiErrorStatus: 429,
    sessionId: "sess-1",
  };
}
function serverThrottleBlock(tsIso) {
  return {
    type: "assistant", timestamp: tsIso,
    message: { content: [{ type: "text", text: "API Error: Server is temporarily limiting requests (not your usage limit) - Rate limited" }] },
    error: "rate_limit", isApiErrorMessage: true, apiErrorStatus: 429, sessionId: "sess-1",
  };
}
function usageBlock(tsIso, input, output, cc = 0, cr = 0) {
  return { type: "assistant", timestamp: tsIso,
    message: { id: `u-${tsIso}`, usage: { input_tokens: input, output_tokens: output, cache_creation_input_tokens: cc, cache_read_input_tokens: cr } } };
}

// ---- weightedOf ----
test("weightedOf: applies 1.25 cache-write + 0.1 cache-read weights exactly", () => {
  // 100 + 50 + 1.25*200 + 0.1*1000 = 100 + 50 + 250 + 100 = 500
  assert.equal(weightedOf({ input: 100, output: 50, cacheCreation: 200, cacheRead: 1000 }), 500);
});
test("weightedOf: null -> 0", () => assert.equal(weightedOf(null), 0));

// ---- classifyRateLimitText: the two-kinds distinction (load-bearing) ----
test("classifyRateLimitText: session-limit text -> session-limit", () => {
  assert.equal(classifyRateLimitText("You've hit your session limit  resets 3:10pm (America/Chicago)"), "session-limit");
});
test("classifyRateLimitText: server-throttle text -> server-throttle (NOT session-limit)", () => {
  assert.equal(classifyRateLimitText("API Error: Server is temporarily limiting requests (not your usage limit) - Rate limited"), "server-throttle");
});
test("classifyRateLimitText: 'not your usage limit' wins over an incidental 'limit'", () => {
  // adversarial: text contains 'limit' but explicitly disclaims the usage limit
  assert.equal(classifyRateLimitText("rate limited (not your usage limit)"), "server-throttle");
});
test("classifyRateLimitText: empty / unrelated -> unknown", () => {
  assert.equal(classifyRateLimitText(""), "unknown");
  assert.equal(classifyRateLimitText("something else entirely"), "unknown");
});

// ---- classifyRateLimitRecord: shape guard ----
test("classifyRateLimitRecord: real session-limit 429 -> kind+tsMs", () => {
  const r = classifyRateLimitRecord(sessionLimitBlock("2026-06-08T16:38:22.867Z"));
  assert.equal(r.kind, "session-limit");
  assert.equal(r.tsMs, Date.parse("2026-06-08T16:38:22.867Z"));
  assert.equal(r.sessionId, "sess-1");
});
test("classifyRateLimitRecord: server-throttle 429 -> kind server-throttle", () => {
  assert.equal(classifyRateLimitRecord(serverThrottleBlock("2026-06-08T16:38:22.867Z")).kind, "server-throttle");
});
test("classifyRateLimitRecord: non-429 / 400 / 529 / plain assistant -> null", () => {
  assert.equal(classifyRateLimitRecord(usageBlock("2026-06-08T00:00:00Z", 1, 1)), null);
  assert.equal(classifyRateLimitRecord({ error: "rate_limit", isApiErrorMessage: true, apiErrorStatus: 400 }), null);
  assert.equal(classifyRateLimitRecord({ error: "rate_limit", isApiErrorMessage: true, apiErrorStatus: 529 }), null);
  assert.equal(classifyRateLimitRecord({ apiErrorStatus: 429 }), null); // missing error/isApiErrorMessage
  assert.equal(classifyRateLimitRecord(null), null);
});

// ---- parseResetClock ----
test("parseResetClock: extracts clock + tz", () => {
  assert.deepEqual(parseResetClock("you hit your session limit  resets 3:10pm (America/Chicago)"), { raw: "3:10pm", tz: "America/Chicago" });
});
test("parseResetClock: no reset clause -> null", () => {
  assert.equal(parseResetClock("session limit reached"), null);
});

// ---- clusterEvents: one crossing per 5h window ----
test("clusterEvents: a burst within 5h is one crossing; >5h apart is two", () => {
  const base = Date.parse("2026-06-08T10:00:00Z");
  const ev = (ms) => ({ tsMs: base + ms });
  const firsts = clusterEvents([ev(0), ev(60_000), ev(120_000), ev(6 * HOUR), ev(6 * HOUR + 60_000)]);
  assert.equal(firsts.length, 2);
  assert.equal(firsts[0].tsMs, base);
  assert.equal(firsts[1].tsMs, base + 6 * HOUR);
});
test("clusterEvents: drops null-ts events", () => {
  assert.equal(clusterEvents([{ tsMs: null }, { tsMs: NaN }]).length, 0);
});

// ---- buildPrefixSums + weightedInWindow: bounded BOTH-ends window ----
test("weightedInWindow: closed [start,end] sum, boundary inclusive", () => {
  const t0 = Date.parse("2026-06-08T00:00:00Z");
  const recs = [
    usageBlockRec(t0 + 0, 100), usageBlockRec(t0 + 1 * HOUR, 200),
    usageBlockRec(t0 + 4 * HOUR, 400), usageBlockRec(t0 + 10 * HOUR, 800),
  ];
  const pf = buildPrefixSums(recs);
  assert.equal(weightedInWindow(pf, t0, t0 + 5 * HOUR), 700);            // 100+200+400
  assert.equal(weightedInWindow(pf, t0 + 2 * HOUR, t0 + 11 * HOUR), 1200); // 400+800
  assert.equal(weightedInWindow(pf, t0 + 1 * HOUR, t0 + 4 * HOUR), 600);   // 200+400 inclusive both ends
  assert.equal(weightedInWindow(pf, t0 + 20 * HOUR, t0 + 21 * HOUR), 0);   // empty window
});
// helper: a record with a plain weighted value (input only -> weighted == input)
function usageBlockRec(tsMs, input) { return { id: `r-${tsMs}-${input}`, tsMs, input, output: 0, cacheCreation: 0, cacheRead: 0 }; }

// ---- calibrateFromEvidence: the core calibration ----
test("calibrateFromEvidence: ceiling = weighted sum over [T-5h, T] at the crossing", () => {
  const evMs = Date.parse("2026-06-08T15:00:00Z");
  // records fully covering the 5h before the event: 5 records of 1,000,000 each at -4h..-0h
  const recs = [];
  for (let h = 5; h >= 1; h--) recs.push(usageBlockRec(evMs - h * HOUR, 1_000_000));
  // plus a record AFTER the event (must be EXCLUDED by the upper bound)
  recs.push(usageBlockRec(evMs + 1 * HOUR, 9_000_000));
  // plus a record well BEFORE the window (excluded by lower bound)
  recs.push(usageBlockRec(evMs - 9 * HOUR, 5_000_000));
  const events = [{ tsMs: evMs, text: "session limit  resets 8pm", sessionId: "s" }];
  const stats = calibrateFromEvidence(recs, events, {});
  assert.equal(stats.count, 1);
  assert.equal(stats.observations[0].coverage, "full");
  assert.equal(stats.min, 5_000_000);  // the 5 in-window records only -- NOT the after/before ones
  assert.equal(stats.observations[0].ceiling, 5_000_000);
});
test("calibrateFromEvidence: marks partial coverage when history doesn't cover the full window", () => {
  const evMs = Date.parse("2026-06-08T15:00:00Z");
  // only 1 record, 1h before the event -> window start (-5h) predates earliest record -> partial
  const recs = [usageBlockRec(evMs - 1 * HOUR, 2_000_000)];
  const stats = calibrateFromEvidence(recs, [{ tsMs: evMs, text: "session limit" }], {});
  assert.equal(stats.observations[0].coverage, "partial");
  assert.equal(stats.usedCoverage, "partial-fallback");
  assert.equal(stats.min, 2_000_000); // falls back to partial obs (R12: surfaced, used only as last resort)
});
test("calibrateFromEvidence: dedups streaming-snapshot duplicate ids (keeps final)", () => {
  const evMs = Date.parse("2026-06-08T15:00:00Z");
  // same id written twice (streaming) at -2h: counts ONCE
  const recs = [
    { id: "dup", tsMs: evMs - 2 * HOUR, input: 1_000_000, output: 0, cacheCreation: 0, cacheRead: 0 },
    { id: "dup", tsMs: evMs - 2 * HOUR + 500, input: 1_000_000, output: 0, cacheCreation: 0, cacheRead: 0 },
    usageBlockRec(evMs - 3 * HOUR, 1_000_000),
  ];
  // make window fully covered: add an early record at -5h
  recs.push(usageBlockRec(evMs - 5 * HOUR, 0));
  const stats = calibrateFromEvidence(recs, [{ tsMs: evMs, text: "session limit" }], {});
  assert.equal(stats.observations[0].ceiling, 2_000_000); // dup counted once + the -3h record
});
test("calibrateFromEvidence: no events -> null ceiling (R12 honesty, never fabricate)", () => {
  const stats = calibrateFromEvidence([usageBlockRec(1, 100)], [], {});
  assert.equal(stats.min, null);
  assert.equal(stats.count, 0);
  assert.equal(recommendBudget(stats), null);
});
test("calibrateFromEvidence: 5 crossings incl a 12M outlier -> p25 ceiling rejects the outlier (live fix)", () => {
  // The exact live scenario: 5 distinct crossings, one a 12M weekly-limit artifact
  // among a 70-110M 5h cluster. The robust ceiling must be the p25 (70M), NOT 12M.
  const t0 = Date.parse("2026-05-01T00:00:00Z");
  const targets = [12_000_000, 70_000_000, 90_000_000, 100_000_000, 110_000_000];
  const recs = [usageBlockRec(t0 + 1 * HOUR - 5 * HOUR, 0)]; // anchor: full coverage for the first window
  const events = [];
  targets.forEach((w, i) => {
    const e = t0 + (i + 1) * 10 * HOUR;       // 10h apart -> distinct crossings
    recs.push(usageBlockRec(e - 1 * HOUR, w)); // one record inside each [e-5h, e] window
    events.push({ tsMs: e, text: "you hit your session limit", sessionId: `s${i}` });
  });
  const stats = calibrateFromEvidence(recs, events, {});
  assert.equal(stats.count, 5);
  assert.equal(stats.min, 12_000_000);
  assert.equal(stats.p25, 70_000_000);
  assert.equal(stats.median, 90_000_000);
  assert.equal(recommendBudget(stats).budget, 70_000_000, "robust ceiling rejects the 12M outlier");
});

// ---- percentile ----
test("percentile: linear-interpolation (numpy type-7) reference values", () => {
  const a = [12, 70, 90, 100, 110];
  assert.equal(percentile(a, 0.25), 70); // (5-1)*0.25 = 1 -> s[1]
  assert.equal(percentile(a, 0.5), 90);  // median
  assert.equal(percentile(a, 0), 12);
  assert.equal(percentile(a, 1), 110);
  assert.equal(percentile([], 0.25), null);
  assert.equal(percentile([42], 0.25), 42);
});

// ---- recommendBudget: robust p25, NOT min (the live-validated fix) ----
test("recommendBudget: with >=4 obs uses p25, REJECTS the low (weekly-limit) outlier", () => {
  // the exact live failure mode: a 12M crossing among a 70-110M cluster must NOT
  // drive the budget. p25 = 70M, so we arm at 70M, not the 12M artifact.
  const stats = { count: 5, min: 12_000_000, p25: 70_000_000, median: 90_000_000, max: 110_000_000 };
  const r = recommendBudget(stats, 0.92);
  assert.equal(r.budget, 70_000_000, "budget is p25 (70M), NOT min (12M)");
  assert.equal(r.triggerAt, 64_400_000); // 70M * 0.92
  assert.equal(r.basis, "p25-observed-ceiling");
  assert.equal(r.lowConfidence, false, ">=4 obs -> high confidence");
});
test("recommendBudget: with <4 obs falls back to min AND flags lowConfidence (P1 guard)", () => {
  const r = recommendBudget({ count: 2, min: 80_000_000, p25: 81_000_000, median: 82_000_000, max: 90_000_000 });
  assert.equal(r.budget, 80_000_000);
  assert.match(r.basis, /min-observed-ceiling/);
  assert.equal(r.pct, DEFAULT_ARM_PCT);
  assert.equal(r.lowConfidence, true, "<4 obs -> low confidence so arm --auto refuses without override");
});
test("recommendBudget: zero observations -> null (never fabricate, R12)", () => {
  assert.equal(recommendBudget({ count: 0, min: null, p25: null }), null);
  assert.equal(recommendBudget(null), null);
});

// ---- computeStatus ----
test("computeStatus: pct/remaining/burn/eta exact", () => {
  // current 80M, ceiling 100M, burn 3M over 30 min -> 100k/min, remaining 20M, eta 200 min
  const s = computeStatus({ currentWeighted: 80_000_000, ceiling: 100_000_000, burnWeighted: 3_000_000, burnWindowMs: 30 * 60 * 1000 });
  assert.equal(s.pctUsed, 0.8);
  assert.equal(s.remaining, 20_000_000);
  assert.equal(s.burnPerMin, 100_000);
  assert.equal(s.etaMinutes, 200);
  assert.equal(s.zone, "warn");
});
test("computeStatus: zones critical>=0.92, ok<0.75", () => {
  assert.equal(computeStatus({ currentWeighted: 95, ceiling: 100, burnWeighted: 0, burnWindowMs: 1 }).zone, "critical");
  assert.equal(computeStatus({ currentWeighted: 50, ceiling: 100, burnWeighted: 0, burnWindowMs: 1 }).zone, "ok");
});
test("computeStatus: no ceiling -> pct/eta null, zone unknown", () => {
  const s = computeStatus({ currentWeighted: 5, ceiling: null, burnWeighted: 1, burnWindowMs: 1000 });
  assert.equal(s.pctUsed, null);
  assert.equal(s.etaMinutes, null);
  assert.equal(s.zone, "unknown");
});
test("computeStatus: zero burn -> eta null (no false projection, R12)", () => {
  assert.equal(computeStatus({ currentWeighted: 5, ceiling: 100, burnWeighted: 0, burnWindowMs: 1000 }).etaMinutes, null);
});

// ---- scanTranscript: streaming IO + prefilter + classification (real tmp file) ----
test("scanTranscript: collects usage + session-limit events, EXCLUDES server-throttle + noise", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "5h-tracker-"));
  const file = path.join(dir, "t.jsonl");
  const lines = [
    JSON.stringify(usageBlock("2026-06-08T10:00:00Z", 1000, 500)),
    JSON.stringify(sessionLimitBlock("2026-06-08T11:00:00Z")),
    JSON.stringify(serverThrottleBlock("2026-06-08T11:05:00Z")), // must NOT become an event
    JSON.stringify({ type: "user", content: "noise, no usage, no 429" }),
    "{ this is a corrupt line",
  ];
  fs.writeFileSync(file, lines.join("\n") + "\n");
  try {
    const { usageRecords, events } = await scanTranscript(file, { sinceMs: 0 });
    // The real session-limit 429 record ALSO carries a zero-usage block (verified
    // live shape), so it is collected as a usage record too -- but it must add 0
    // weighted, leaving calibration unaffected. That harmlessness is the invariant
    // that matters, not the bare count.
    assert.equal(usageRecords.length, 2, "real usage turn + the 429's own zero-usage block");
    const totalWeighted = usageRecords.reduce((s, r) => s + weightedOf(r), 0);
    assert.equal(totalWeighted, 1500, "429 zero-usage record contributes 0 -> only the real 1000+500 turn counts");
    assert.equal(events.length, 1, "server-throttle must be excluded -- only the session-limit 429 is an event");
    assert.equal(events[0].kind, "session-limit");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("scanTranscript: sinceMs filters out old records/events", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "5h-tracker-"));
  const file = path.join(dir, "t.jsonl");
  fs.writeFileSync(file, [
    JSON.stringify(usageBlock("2020-01-01T00:00:00Z", 1, 1)),         // old
    JSON.stringify(sessionLimitBlock("2020-01-01T00:00:00Z")),        // old
    JSON.stringify(usageBlock("2026-06-08T10:00:00Z", 1, 1)),         // recent
  ].join("\n"));
  try {
    const { usageRecords, events } = await scanTranscript(file, { sinceMs: Date.parse("2026-01-01T00:00:00Z") });
    assert.equal(usageRecords.length, 1);
    assert.equal(events.length, 0);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
test("scanTranscript: missing file -> empty (fail-soft)", async () => {
  const r = await scanTranscript("H:/prism/__does_not_exist__.jsonl", {});
  assert.deepEqual(r, { usageRecords: [], events: [] });
});

// ---- calibrateCeiling orchestrator (hermetic: injected list/scan/fs) ----
test("calibrateCeiling: end-to-end with injected scan, write:false", async () => {
  const evMs = Date.parse("2026-06-08T15:00:00Z");
  const recs = [];
  for (let h = 5; h >= 1; h--) recs.push(usageBlockRec(evMs - h * HOUR, 20_000_000));
  const fakeScan = async () => ({ usageRecords: recs, events: [{ tsMs: evMs, text: "session limit  resets 8pm", sessionId: "s" }] });
  const r = await calibrateCeiling({
    nowMs: evMs + HOUR, sinceDays: 30, write: false,
    _list: () => ["f1.jsonl"], _scan: fakeScan,
  });
  assert.equal(r.observedCeiling, 100_000_000); // 5 * 20M
  assert.equal(r.crossings, 1);
  assert.equal(r.recommend.budget, 100_000_000);
  assert.equal(r.recommend.triggerAt, 92_000_000);
  assert.equal(r.wrote, false);
});
test("calibrateCeiling: no events -> observedCeiling null, does NOT write", async () => {
  const r = await calibrateCeiling({
    nowMs: Date.now(), write: true,
    _list: () => ["f1.jsonl"], _scan: async () => ({ usageRecords: [], events: [] }),
    _fs: { /* never used because write is skipped on null */ },
  });
  assert.equal(r.observedCeiling, null);
  assert.equal(r.wrote, false);
});
test("calibrateCeiling: nowMs required (fail-loud)", async () => {
  await assert.rejects(() => calibrateCeiling({ _list: () => [], _scan: async () => ({ usageRecords: [], events: [] }) }), /nowMs/);
});

// ---- liveStatus: ceiling precedence + reuse of fiveHourTokenSum ----
test("liveStatus: uses REALISTIC hard ceiling (p90) for %, reports arm trigger separately (R7 split)", () => {
  const fakeSum = ({ windowMs }) => windowMs > 60 * 60 * 1000
    ? { weightedTokens: 50_000_000, usedTokens: 9e8, transcriptsInWindow: 3, cappedTranscripts: 0 } // full 5h window
    : { weightedTokens: 2_000_000, usedTokens: 5e6, transcriptsInWindow: 1, cappedTranscripts: 0 };  // burn window
  // realistic ceiling (hard p90) 100M -> 50% used; conservative arm trigger 62M -> would fire (50M < 62M? no)
  const s = liveStatus({
    nowMs: Date.now(), _sum: fakeSum, _readBoundary: () => null, // hermetic: no account-switch floor here (orthogonal to ceiling logic)
    _readCeiling: () => ({ observedCeiling: 67_000_000, hardCeilingEstimate: 100_000_000, recommend: { triggerAt: 62_000_000 } }),
  });
  assert.equal(s.ceiling, 100_000_000, "status % uses the realistic p90, NOT the conservative p25");
  assert.equal(s.ceilingSource, "observed-sidecar:hard(p90)");
  assert.equal(s.pctUsed, 0.5);
  assert.equal(s.armTrigger, 62_000_000);
  assert.equal(s.armWouldFire, false, "current 50M < arm trigger 62M -> switch not yet");
});
test("liveStatus: armWouldFire true when current weighted >= arm trigger", () => {
  const fakeSum = ({ windowMs }) => windowMs > 60 * 60 * 1000
    ? { weightedTokens: 70_000_000, usedTokens: 9e8, transcriptsInWindow: 3, cappedTranscripts: 0 }
    : { weightedTokens: 1_000_000, usedTokens: 5e6, transcriptsInWindow: 1, cappedTranscripts: 0 };
  const s = liveStatus({ nowMs: Date.now(), _sum: fakeSum, _readBoundary: () => null, _readCeiling: () => ({ hardCeilingEstimate: 100_000_000, recommend: { triggerAt: 62_000_000 } }) });
  assert.equal(s.armWouldFire, true); // 70M >= 62M
});
test("liveStatus: falls back to arm(p25) ceiling when no hard estimate; explicit + env precedence", () => {
  const fakeSum = () => ({ weightedTokens: 50_000_000, usedTokens: 9e8, transcriptsInWindow: 3, cappedTranscripts: 0 });
  // only observedCeiling present -> arm(p25) source
  const s = liveStatus({ nowMs: Date.now(), _sum: fakeSum, _readCeiling: () => ({ observedCeiling: 100_000_000 }) });
  assert.equal(s.ceilingSource, "observed-sidecar:arm(p25)");
  assert.equal(s.ceiling, 100_000_000);
  // explicit overrides sidecar
  const s2 = liveStatus({ nowMs: Date.now(), ceiling: 200_000_000, _sum: fakeSum, _readCeiling: () => ({ hardCeilingEstimate: 100_000_000 }) });
  assert.equal(s2.ceilingSource, "explicit");
  assert.equal(s2.ceiling, 200_000_000);
  // env fallback when no sidecar
  const s3 = liveStatus({ nowMs: Date.now(), _sum: fakeSum, _readCeiling: () => null, env: { PRISM_5H_WEIGHTED_BUDGET: "80000000" } });
  assert.equal(s3.ceilingSource, "env-budget");
  assert.equal(s3.ceiling, 80_000_000);
});
test("liveStatus: no ceiling anywhere -> pct null, source null", () => {
  const fakeSum = () => ({ weightedTokens: 1_000_000, usedTokens: 2e6, transcriptsInWindow: 1, cappedTranscripts: 0 });
  const s = liveStatus({ nowMs: Date.now(), _sum: fakeSum, _readCeiling: () => null, env: {} });
  assert.equal(s.pctUsed, null);
  assert.equal(s.ceilingSource, null);
});

// ---- write/read observed-ceiling sidecar round-trip (real tmp file) ----
test("writeObservedCeiling/readObservedCeiling: atomic round-trip", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "5h-ceil-"));
  const file = path.join(dir, "five-hour-ceiling-observed.json");
  try {
    writeObservedCeiling(file, { observedCeiling: 123456789, schemaVersion: "1.0.0" });
    assert.equal(readObservedCeiling(file).observedCeiling, 123456789);
    assert.equal(readObservedCeiling(path.join(dir, "missing.json")), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ── ACCOUNT-SWITCH BOUNDARY (U-5H-ACCOUNT-BOUNDARY): per-account window floor ──
// The rolling-5h sum is per-account: after a switch the window must floor at the switch instant so
// the new account's budget tracks from 0 (else it counts the old account's tokens -> false ~100%).
import {
  effectiveWindowMs,
  readSwitchBoundaryMs,
  writeSwitchBoundary,
  liveStatus as liveStatus2,
} from "./five-hour-limit-tracker.mjs";

const FIVE_H = 5 * 3600 * 1000;
const NOW = 1_700_000_000_000;

test("effectiveWindowMs: null boundary -> requested window unchanged (backward compatible)", () => {
  assert.equal(effectiveWindowMs(NOW, FIVE_H, null), FIVE_H);
  assert.equal(effectiveWindowMs(NOW, FIVE_H, NaN), FIVE_H);
});
test("effectiveWindowMs: boundary OLDER than the window -> no effect", () => {
  assert.equal(effectiveWindowMs(NOW, FIVE_H, NOW - FIVE_H - 60000), FIVE_H);
});
test("effectiveWindowMs: boundary WITHIN the window -> shrinks to [boundary, now]", () => {
  assert.equal(effectiveWindowMs(NOW, FIVE_H, NOW - 30 * 60000), 30 * 60000);
});
test("effectiveWindowMs: boundary == now -> zero-width (just switched)", () => {
  assert.equal(effectiveWindowMs(NOW, FIVE_H, NOW), 0);
});

test("writeSwitchBoundary/readSwitchBoundaryMs: atomic round-trip via the manual marker", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "5h-boundary-"));
  const boundaryPath = path.join(dir, "account-switch-boundary.json");
  const monitorPath = path.join(dir, "nope.jsonl");
  const doc = writeSwitchBoundary(NOW, { account: "acct-2", boundaryPath });
  assert.equal(doc.switchedAtMs, NOW);
  const got = readSwitchBoundaryMs({ nowMs: NOW + 1000, boundaryPath, monitorPath });
  assert.equal(got, NOW);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readSwitchBoundaryMs: picks the MOST RECENT of marker vs auto-coordinator 'switched' event", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "5h-boundary-"));
  const boundaryPath = path.join(dir, "b.json");
  const monitorPath = path.join(dir, "m.jsonl");
  // marker older; a 'switched' ledger event NEWER -> the newer wins
  fs.writeFileSync(boundaryPath, JSON.stringify({ switchedAtMs: NOW - 3600000 }));
  fs.writeFileSync(monitorPath,
    JSON.stringify({ at: new Date(NOW - 7200000).toISOString(), status: "below-threshold" }) + "\n" +
    JSON.stringify({ at: new Date(NOW - 600000).toISOString(), status: "switched" }) + "\n" +
    JSON.stringify({ at: new Date(NOW - 60000).toISOString(), status: "not-armed" }) + "\n");
  assert.equal(readSwitchBoundaryMs({ nowMs: NOW, boundaryPath, monitorPath }), NOW - 600000);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("readSwitchBoundaryMs: ignores a FUTURE boundary (clock-skew guard) + missing sources -> null", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "5h-boundary-"));
  const boundaryPath = path.join(dir, "b.json");
  fs.writeFileSync(boundaryPath, JSON.stringify({ switchedAtMs: NOW + 999999 }));
  assert.equal(readSwitchBoundaryMs({ nowMs: NOW, boundaryPath, monitorPath: path.join(dir, "none.jsonl") }), null);
  assert.equal(readSwitchBoundaryMs({ nowMs: NOW, boundaryPath: path.join(dir, "none.json"), monitorPath: path.join(dir, "none.jsonl") }), null);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("liveStatus: a switch boundary floors the window -> per-account % (the operator's fix)", () => {
  const boundary = NOW - 30 * 60000; // switched 30 min ago
  const _sum = ({ windowMs }) => ({ weightedTokens: windowMs >= FIVE_H ? 9999 : 5, usedTokens: 5, transcriptsInWindow: 1, cappedTranscripts: 0 });
  const s = liveStatus2({
    nowMs: NOW, _sum, _readBoundary: () => boundary,
    _readCeiling: () => ({ hardCeilingEstimate: 1000, observedCeiling: 800, recommend: { triggerAt: 736 } }),
  });
  assert.equal(s.windowFlooredToSwitch, true);
  assert.equal(s.effectiveWindowMs, 30 * 60000);
  assert.equal(s.accountSwitchBoundaryMs, boundary);
  assert.equal(s.currentWeighted, 5); // floored window -> NOT the 9999 full-window value
});

test("liveStatus: no boundary -> full 5h window, no floor (backward compatible)", () => {
  const s = liveStatus2({
    nowMs: NOW,
    _sum: () => ({ weightedTokens: 5, usedTokens: 5, transcriptsInWindow: 1, cappedTranscripts: 0 }),
    _readBoundary: () => null, _readCeiling: () => null,
  });
  assert.equal(s.windowFlooredToSwitch, false);
  assert.equal(s.effectiveWindowMs, FIVE_H);
  assert.equal(s.accountSwitchBoundaryMs, null);
});
