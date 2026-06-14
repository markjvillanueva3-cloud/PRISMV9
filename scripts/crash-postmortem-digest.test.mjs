#!/usr/bin/env node
/**
 * Hermetic suite for crash-postmortem-digest.mjs -- exercises the pure aggregation
 * core with LIVE-shaped fixtures (the real chat-crash row shape written by
 * fleet-reaper-crash-watch.mjs). Verifies INTENT (R9): the advisory fires ONLY on
 * real signal (crashes or flapping) and stays silent otherwise (no cry-wolf), and
 * the flapping detection pins the >= FLAPPING_THRESHOLD boundary.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseJsonlRows, filterWindow, aggregateCrashes, aggregateReenables,
  buildDigestAdvisory, renderDigestMarkdown, FLAPPING_THRESHOLD,
} from "./crash-postmortem-digest.mjs";

// Real row shape (verbatim from state/shared/chat-crash-postmortems.jsonl).
const crash = (slot, ts, frozenMinutes, pressureTier = "normal") => ({
  schemaVersion: 1, ts, kind: "chat-crash", slot, chatId: `claude-${slot}`,
  lastHeartbeatIso: ts, frozenMs: frozenMinutes * 60000, frozenMinutes,
  sweepGapMs: 65536, memUsedPct: 60.7, pressureTier,
});

test("parseJsonlRows: parses valid rows, skips blanks + ONE malformed (never throws)", () => {
  const text = [
    JSON.stringify(crash("alpha", "2026-06-09T23:00:00.000Z", 10)),
    "",
    "{ this is : not json",                       // malformed -> dropped, not thrown
    JSON.stringify(crash("bravo", "2026-06-09T23:05:00.000Z", 31)),
  ].join("\n");
  const rows = parseJsonlRows(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].slot, "alpha");
  assert.equal(parseJsonlRows("").length, 0);
  assert.equal(parseJsonlRows(null).length, 0);
});

test("filterWindow: keeps only rows whose ts is within [since, now]", () => {
  const rows = [
    crash("alpha", "2026-06-01T00:00:00.000Z", 10),   // out (too old)
    crash("bravo", "2026-06-09T12:00:00.000Z", 10),   // in
    { kind: "chat-crash", slot: "x" },                 // no ts -> dropped
  ];
  const now = Date.parse("2026-06-10T00:00:00.000Z");
  const since = now - 7 * 24 * 60 * 60 * 1000;
  const out = filterWindow(rows, since, now);
  assert.equal(out.length, 1);
  assert.equal(out[0].slot, "bravo");
});

test("aggregateCrashes: counts, ranks top slot, averages frozen minutes, histograms pressure", () => {
  const rows = [
    crash("alpha", "2026-06-09T23:00:00.000Z", 10, "normal"),
    crash("alpha", "2026-06-09T23:30:00.000Z", 20, "warn"),
    crash("foxtrot", "2026-06-09T23:10:00.000Z", 31, "normal"),
    crash("yankee", "2026-06-10T00:00:00.000Z", 20, "critical"),
    { kind: "not-a-crash", slot: "alpha" },            // ignored (wrong kind)
  ];
  const agg = aggregateCrashes(rows);
  assert.equal(agg.totalCrashes, 4);
  assert.equal(agg.distinctSlots, 3);
  assert.equal(agg.bySlot[0].slot, "alpha");           // 2 crashes -> ranked first
  assert.equal(agg.bySlot[0].count, 2);
  assert.equal(agg.bySlot[0].avgFrozenMin, 15);        // (10+20)/2
  assert.deepEqual(agg.byPressure, { normal: 2, warn: 1, critical: 1, unknown: 0 });
});

test("aggregateCrashes: null/absent pressureTier -> 'unknown' bucket (the LIVE writer default)", () => {
  // The real writer emits pressureTier:null when ctx has none (crash-watch.mjs:122),
  // so the unknown path is the common one -- it must not crash or mis-bucket.
  const rows = [
    { kind: "chat-crash", slot: "alpha", ts: "2026-06-09T23:00:00.000Z", pressureTier: null },
    { kind: "chat-crash", slot: "bravo", ts: "2026-06-09T23:01:00.000Z" },           // field absent
    { kind: "chat-crash", slot: "charlie", ts: "2026-06-09T23:02:00.000Z", pressureTier: "bogus" },
  ];
  const agg = aggregateCrashes(rows);
  assert.equal(agg.totalCrashes, 3);
  assert.equal(agg.byPressure.unknown, 3);
  assert.equal(agg.byPressure.normal, 0);
});

test("aggregateReenables: per-task counts + flapping set at the >= FLAPPING_THRESHOLD boundary", () => {
  const ledger = [
    { task: "PRISM Zombie Reaper v2" }, { task: "PRISM Zombie Reaper v2" }, { task: "PRISM Zombie Reaper v2" },
    { task: "PRISM Fleet Reaper" }, { task: "PRISM Fleet Reaper" },         // count 2 -> NOT flapping
    { nottask: "junk" },                                                     // ignored
  ];
  const agg = aggregateReenables(ledger);
  assert.equal(agg.totalReenables, 5);
  assert.equal(agg.byTask[0].task, "PRISM Zombie Reaper v2");
  assert.equal(agg.byTask[0].count, 3);
  assert.equal(agg.flapping.length, 1);
  assert.equal(agg.flapping[0].task, "PRISM Zombie Reaper v2");
  // boundary: exactly FLAPPING_THRESHOLD-1 must NOT flap
  const below = aggregateReenables(Array.from({ length: FLAPPING_THRESHOLD - 1 }, () => ({ task: "T" })));
  assert.equal(below.flapping.length, 0);
});

test("buildDigestAdvisory: SILENT when no crashes and no flapping (R9 cry-wolf boundary)", () => {
  assert.equal(buildDigestAdvisory({ totalCrashes: 0, bySlot: [], byPressure: { critical: 0 } },
    { flapping: [] }), null);
  assert.equal(buildDigestAdvisory(null, null), null);
});

test("buildDigestAdvisory: fires on flapping (leads) and on crashes; names the disabler hunt", () => {
  const crashAgg = { totalCrashes: 4, distinctSlots: 3,
    bySlot: [{ slot: "alpha", count: 2 }, { slot: "foxtrot", count: 1 }, { slot: "yankee", count: 1 }],
    byPressure: { critical: 1 } };
  const reAgg = { flapping: [{ task: "PRISM Zombie Reaper v2", count: 4 }] };
  const adv = buildDigestAdvisory(crashAgg, reAgg);
  assert.match(adv, /FLAPPING/);
  assert.match(adv, /Zombie Reaper v2 x4/);
  assert.match(adv, /find the disabler/);
  assert.match(adv, /4 chat-crash/);
  assert.match(adv, /CRITICAL mem pressure/);
  // flapping must come BEFORE the crash clause (it names a real unresolved failure)
  assert.ok(adv.indexOf("FLAPPING") < adv.indexOf("chat-crash"));
});

test("renderDigestMarkdown: surfaces the flapping disabler-hunt note; honest empty state", () => {
  const flapMd = renderDigestMarkdown(
    { totalCrashes: 1, distinctSlots: 1, bySlot: [{ slot: "alpha", count: 1, avgFrozenMin: 10, lastTs: "x" }], byPressure: { normal: 1, warn: 0, critical: 0, unknown: 0 } },
    { totalReenables: 4, byTask: [{ task: "PRISM Zombie Reaper v2", count: 4 }], flapping: [{ task: "PRISM Zombie Reaper v2", count: 4 }] },
    { generatedIso: "2026-06-10T01:00:00.000Z", windowDays: 7, rowsScanned: 5 });
  assert.match(flapMd, /FLAPPING/);
  assert.match(flapMd, /Get-ScheduledTaskInfo/);                 // the actionable next step
  const emptyMd = renderDigestMarkdown(
    { totalCrashes: 0, distinctSlots: 0, bySlot: [], byPressure: { normal: 0, warn: 0, critical: 0, unknown: 0 } },
    { totalReenables: 0, byTask: [], flapping: [] }, {});
  assert.match(emptyMd, /No chat-crash rows/);
  assert.match(emptyMd, /ledger empty or absent/);
});
