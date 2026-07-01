/**
 * FLEET-REAPER-MS3/U-FR-MS3-B — background-app throttle tests.
 *
 * 20 cases (spec floor: 18):
 *   1   shouldExclude: claude.exe / node.exe / svchost.exe rejected
 *   2   shouldExclude: realtime priority rejected
 *   3   shouldExclude: System32 path rejected (defensive)
 *   4   shouldExclude: Claude-descendant (non-claude.exe name) rejected
 *   5   shouldExclude: ordinary Chrome / Discord process accepted
 *   6   ancestorChain: walks parents, cycle-safe
 *   7   isClaudeRelated: direct claude.exe + descendants → true; orphan → false
 *   8   pickThrottleCandidates: RSS-sort + topN cap + minRss filter
 *   9   pickThrottleCandidates: alreadyThrottled PIDs skipped (anti-double)
 *   10  pickThrottleCandidates: empty/garbage procs → empty result
 *   11  decideAction: usedPct >= memPressurePct → throttle
 *   12  decideAction: usedPct < restoreAt with prior stamp → restore
 *   13  decideAction: hysteresis band (between restoreAt and memPressurePct) → noop
 *   14  decideAction: PRISM_FR_BG_THROTTLE_DISABLE=1 → noop
 *   15  decideAction: PRISM_FLEET_REAPER_DISABLE=1 → noop (master kill)
 *   16  decideAction: NaN usedPct → noop (fail-safe)
 *   17  clampTopN: clamps to [1, 10]
 *   18  clampMinRssMb: clamps to [64, 32768]
 *   19  readStamp: missing file → empty (fail-soft)
 *   20  LEGACY PARITY: knob-disabled never returns a throttle action
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  ancestorChain,
  isClaudeRelated,
  shouldExclude,
  pickThrottleCandidates,
  decideAction,
  clampTopN,
  clampMinRssMb,
  readStamp,
  buildStamp,
  DEFAULT_TOP_N,
  DEFAULT_MIN_RSS_MB,
  STAMP_MAX_BYTES,
  _excludedNamesForTest,
} from "../lib/bg-app-throttle.mjs";

const MB = 1024 * 1024;
function mk(pid, name, ppid, rssMb, extra = {}) {
  return { pid, name, ppid, rssBytes: rssMb * MB, ...extra };
}
function mkIndex(procs) {
  return new Map(procs.map(p => [p.pid, p]));
}

// 1
test("shouldExclude: claude.exe / node.exe / svchost.exe rejected", () => {
  const idx = mkIndex([]);
  for (const name of ["claude.exe", "node.exe", "svchost.exe", "dwm.exe", "lsass.exe", "explorer.exe"]) {
    assert.equal(shouldExclude({ pid: 1, name, rssBytes: 999 * MB }, idx), true, `should exclude: ${name}`);
  }
});

// 2
test("shouldExclude: realtime priority rejected", () => {
  const idx = mkIndex([]);
  assert.equal(shouldExclude({ pid: 1, name: "audiodg.exe", rssBytes: 100 * MB, priorityClass: "Realtime" }, idx), true);
  assert.equal(shouldExclude({ pid: 2, name: "rtaudio.exe", rssBytes: 100 * MB, priorityClass: 256 }, idx), true);
});

// 3
test("shouldExclude: System32 path rejected (defensive)", () => {
  const idx = mkIndex([]);
  assert.equal(shouldExclude({ pid: 1, name: "foo.exe", rssBytes: 100 * MB, executablePath: "C:\\Windows\\System32\\foo.exe" }, idx), true);
  assert.equal(shouldExclude({ pid: 2, name: "bar.exe", rssBytes: 100 * MB, executablePath: "C:/Windows/System32/bar.exe" }, idx), true);
});

// 4
test("shouldExclude: Claude-descendant (non-claude.exe name) rejected", () => {
  const idx = mkIndex([
    mk(100, "claude.exe", 1, 800),
    mk(200, "node.exe", 100, 400),
    mk(300, "bash.exe", 200, 50),
    mk(400, "rg.exe", 300, 10), // hypothetical non-listed child
  ]);
  assert.equal(shouldExclude({ pid: 400, name: "rg.exe", rssBytes: 600 * MB }, idx), true,
    "rg.exe under claude.exe ancestry must be excluded");
});

// 5
test("shouldExclude: ordinary Chrome / Discord process accepted", () => {
  const idx = mkIndex([
    mk(500, "chrome.exe", 1, 1500),
    mk(600, "Discord.exe", 1, 800),
    mk(700, "steam.exe", 1, 600),
  ]);
  for (const proc of [
    { pid: 500, name: "chrome.exe", rssBytes: 1500 * MB },
    { pid: 600, name: "Discord.exe", rssBytes: 800 * MB },
    { pid: 700, name: "steam.exe", rssBytes: 600 * MB },
  ]) {
    assert.equal(shouldExclude(proc, idx), false, `should accept: ${proc.name}`);
  }
});

// 6
test("ancestorChain: walks parents, cycle-safe", () => {
  const idx = mkIndex([
    mk(100, "a.exe", 1, 1),
    mk(200, "b.exe", 100, 1),
    mk(300, "c.exe", 200, 1),
  ]);
  assert.deepEqual(ancestorChain(300, idx), [300, 200, 100]);
  // Cycle
  const cycleIdx = mkIndex([
    mk(100, "a.exe", 200, 1),
    mk(200, "b.exe", 100, 1),
  ]);
  const chain = ancestorChain(100, cycleIdx);
  assert.ok(chain.length <= 2, `cycle-safe (got: ${chain.length} hops)`);
});

// 7
test("isClaudeRelated: direct claude.exe + descendants → true; orphan → false", () => {
  const idx = mkIndex([
    mk(100, "claude.exe", 1, 800),
    mk(200, "node.exe", 100, 400),
    mk(300, "bash.exe", 200, 50),
    mk(999, "chrome.exe", 1, 1500), // orphan
  ]);
  assert.equal(isClaudeRelated(100, idx), true);
  assert.equal(isClaudeRelated(200, idx), true);
  assert.equal(isClaudeRelated(300, idx), true);
  assert.equal(isClaudeRelated(999, idx), false);
});

// 8
test("pickThrottleCandidates: RSS-sorted, topN cap, minRss filter", () => {
  const procs = [
    mk(500, "chrome.exe", 1, 1500),
    mk(600, "Discord.exe", 1, 800),
    mk(700, "steam.exe", 1, 600),
    mk(800, "spotify.exe", 1, 400),  // under default 500 MB floor
    mk(900, "tiny.exe", 1, 50),       // under floor
  ];
  const idx = mkIndex(procs);
  const cands = pickThrottleCandidates(procs, idx, { topN: 3, minRssMb: 500 });
  assert.equal(cands.length, 3);
  assert.deepEqual(cands.map(c => c.pid), [500, 600, 700]);  // sorted desc by RSS, top 3
});

// 9
test("pickThrottleCandidates: alreadyThrottled PIDs skipped (anti-double-throttle)", () => {
  const procs = [
    mk(500, "chrome.exe", 1, 1500),
    mk(600, "Discord.exe", 1, 800),
    mk(700, "steam.exe", 1, 600),
  ];
  const idx = mkIndex(procs);
  const cands = pickThrottleCandidates(procs, idx, { topN: 3, minRssMb: 500, alreadyThrottled: new Set([500, 600]) });
  assert.deepEqual(cands.map(c => c.pid), [700]);
});

// 10
test("pickThrottleCandidates: empty/garbage procs → empty result", () => {
  const idx = mkIndex([]);
  assert.deepEqual(pickThrottleCandidates([], idx), []);
  assert.deepEqual(pickThrottleCandidates(null, idx), []);
  assert.deepEqual(pickThrottleCandidates([{ pid: NaN, name: "junk" }], idx), []);
});

// 11
test("decideAction: usedPct >= memPressurePct → throttle", () => {
  const r = decideAction({ usedPct: 92, memPressurePct: 90, env: {} });
  assert.equal(r.action, "throttle");
  assert.equal(r.restoreAt, 85);
});

// 12
test("decideAction: usedPct < restoreAt with prior stamp → restore", () => {
  const r = decideAction({ usedPct: 80, memPressurePct: 90, priorStampPids: [500, 600], env: {} });
  assert.equal(r.action, "restore");
});

// 13
test("decideAction: hysteresis band (between restoreAt and memPressurePct) → noop", () => {
  // usedPct=87, drop at 90, restore at 85 → still in band → noop (no new throttle, no restore)
  const r = decideAction({ usedPct: 87, memPressurePct: 90, priorStampPids: [500], env: {} });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "in-hysteresis-band");
});

// 14
test("decideAction: PRISM_FR_BG_THROTTLE_DISABLE=1 → noop", () => {
  const r = decideAction({ usedPct: 99, memPressurePct: 90, env: { PRISM_FR_BG_THROTTLE_DISABLE: "1" } });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "disabled-by-env");
});

// 15
test("decideAction: PRISM_FLEET_REAPER_DISABLE=1 → noop (master kill)", () => {
  const r = decideAction({ usedPct: 99, memPressurePct: 90, env: { PRISM_FLEET_REAPER_DISABLE: "1" } });
  assert.equal(r.action, "noop");
  assert.equal(r.reason, "master-disabled");
});

// 16
test("decideAction: NaN / non-finite usedPct → noop (fail-safe)", () => {
  const r1 = decideAction({ usedPct: NaN, memPressurePct: 90, env: {} });
  assert.equal(r1.action, "noop");
  const r2 = decideAction({ usedPct: undefined, memPressurePct: 90, env: {} });
  assert.equal(r2.action, "noop");
});

// 17
test("clampTopN: clamps to [1, 10]", () => {
  assert.equal(clampTopN(5), 5);
  assert.equal(clampTopN(0), 1);
  assert.equal(clampTopN(100), 10);
  assert.equal(clampTopN("garbage"), DEFAULT_TOP_N);
  assert.equal(clampTopN(null), DEFAULT_TOP_N);
});

// 18
test("clampMinRssMb: clamps to [64, 32768]", () => {
  assert.equal(clampMinRssMb(500), 500);
  assert.equal(clampMinRssMb(1), 64);
  assert.equal(clampMinRssMb(999999), 32768);
  assert.equal(clampMinRssMb("nope"), DEFAULT_MIN_RSS_MB);
});

// 19
test("readStamp: missing file → empty stamp (fail-soft)", () => {
  const r = readStamp("/nonexistent/path/stamp.json", {
    existsSync: () => false,
    readFileSync: () => { throw new Error("nope"); },
    statSync: () => { throw new Error("nope"); },
  });
  assert.deepEqual(r.pids, []);
  assert.equal(r.oversized, undefined);
});

// 20 — LEGACY PARITY
test("LEGACY PARITY: disabled → throttle never returned, restore-on-prior-stamp NOT triggered", () => {
  // With kill switch on, even a prior stamp at high pressure returns noop.
  // This preserves pre-MS3 behavior: no throttle ever applied, no spurious restore call.
  const env = { PRISM_FR_BG_THROTTLE_DISABLE: "1" };
  const r1 = decideAction({ usedPct: 99, memPressurePct: 90, env });
  const r2 = decideAction({ usedPct: 50, memPressurePct: 90, priorStampPids: [500], env });
  assert.equal(r1.action, "noop");
  assert.equal(r2.action, "noop");
  // buildStamp is pure — confirm shape stability so a future serializer change
  // is caught by parity.
  const s = buildStamp({ nowMs: 0, topN: 3, minRssMb: 500, usedPctAtThrottle: 95, memPressurePct: 90, pids: [500] });
  assert.equal(s.schemaVersion, 1);
  assert.equal(s.pids[0], 500);
  // STAMP_MAX_BYTES exposed for caller-side cap enforcement
  assert.equal(STAMP_MAX_BYTES, 1024 * 1024);
  // Excluded names set is exposed for audit
  const exc = _excludedNamesForTest();
  assert.ok(exc.has("claude.exe"));
  assert.ok(exc.has("svchost.exe"));
});
