// Tests for .claude/hooks/post-tool-batch-budget.mjs + scripts/retune-tool-batch-ceiling.mjs (U-HKA10).
//
// Run: cd H:/prism && node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/helpers/vitest.config.mjs \
//        .claude/hooks/__tests__/post-tool-batch-budget.test.mjs
//
// Intent: a session that runs more than the (self-tuned, env-overridable) ceiling of tool
// calls in the window gets a "slow down / compact" nudge — rate-limited to ~once per snooze;
// it never blocks; the ceiling adapts from observed usage; the retune script recomputes it.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  isDisabled,
  recommendCeiling,
  resolveCeiling,
  resolveConfig,
  readWindowCount,
  decideAlarm,
  cacheDir,
  logPath,
  recommendationPath,
  samplesPath,
  runBudget,
} from "../post-tool-batch-budget.mjs";
import { retune } from "../../../scripts/retune-tool-batch-ceiling.mjs";

const MIN = 60_000;
let TMP;
beforeEach(() => { TMP = fs.mkdtempSync(path.join(os.tmpdir(), "ptbb-test-")); });
afterEach(() => { try { fs.rmSync(TMP, { recursive: true, force: true }); } catch { /* ignore */ } });
const envFor = (o = {}) => ({ PRISM_TOOL_BATCH_CACHE_DIR: TMP, ...o });

describe("isDisabled", () => {
  it("PRISM_TOOL_BATCH_BUDGET=0 disables", () => {
    expect(isDisabled({ PRISM_TOOL_BATCH_BUDGET: "0" })).toBe(true);
    expect(isDisabled({})).toBe(false);
  });
});

describe("recommendCeiling — ~p90 × 1.4, clamped to [100, 20000]", () => {
  it("no samples → the 800 default", () => {
    expect(recommendCeiling([])).toBe(800);
    expect(recommendCeiling(undefined)).toBe(800);
  });
  it("a spread of samples → roughly p90×1.4", () => {
    const samples = [50, 100, 150, 200, 250, 300, 350, 400, 900, 1000]; // p90 ≈ 900
    const c = recommendCeiling(samples);
    expect(c).toBeGreaterThanOrEqual(900);  // never below the busy-hours mark
    expect(c).toBeLessThanOrEqual(1500);    // ~900*1.4 ≈ 1260
  });
  it("tiny observed usage → clamped UP to the floor 100", () => {
    expect(recommendCeiling([1, 2, 3, 4, 5])).toBe(100);
  });
  it("absurd observed usage → clamped DOWN to the cap 20000", () => {
    expect(recommendCeiling([50000, 60000, 70000])).toBe(20000);
  });
});

describe("resolveCeiling / resolveConfig — env > recommendation file > default", () => {
  it("env override wins", () => {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(recommendationPath(envFor()), JSON.stringify({ ceiling: 555 }));
    expect(resolveCeiling(envFor({ PRISM_TOOL_BATCH_CEILING: "1234" }))).toBe(1234);
  });
  it("recommendation file is used when there's no env override", () => {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(recommendationPath(envFor()), JSON.stringify({ ceiling: 555, computedAt: Date.now() }));
    expect(resolveCeiling(envFor())).toBe(555);
  });
  it("a garbage / out-of-range recommendation file falls through to the 800 default", () => {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(recommendationPath(envFor()), "{ not json");
    expect(resolveCeiling(envFor())).toBe(800);
    fs.writeFileSync(recommendationPath(envFor()), JSON.stringify({ ceiling: 99999999 })); // above cap
    expect(resolveCeiling(envFor())).toBe(800);
  });
  it("resolveConfig pulls window/snooze/recommendEvery from env with defaults", () => {
    expect(resolveConfig(envFor())).toMatchObject({ windowMs: 3_600_000, snoozeMs: 600_000 });
    expect(resolveConfig(envFor({ PRISM_TOOL_BATCH_WINDOW_MS: "120000", PRISM_TOOL_BATCH_SNOOZE_MS: "5000", PRISM_TOOL_BATCH_RECOMMEND_EVERY: "3" })))
      .toMatchObject({ windowMs: 120_000, snoozeMs: 5_000, recommendEvery: 3 });
  });
});

describe("readWindowCount", () => {
  it("counts only timestamps inside the window; tolerates a small future skew", () => {
    const f = path.join(TMP, "w.log");
    fs.mkdirSync(TMP, { recursive: true });
    const now = 10_000_000;
    fs.writeFileSync(f, [now - 1, now - 30 * MIN, now - 90 * MIN /* outside 1h */, now + 30_000 /* skew, kept */, now + 600_000 /* far future, dropped */].join("\n") + "\n");
    const { count } = readWindowCount(f, now, 3_600_000);
    expect(count).toBe(3); // now-1, now-30min, now+30s
  });
  it("ignores corrupt / blank lines, missing file → 0, flags pruneDue when much is stale", () => {
    const f = path.join(TMP, "c.log");
    fs.mkdirSync(TMP, { recursive: true });
    const now = 10_000_000;
    // 200 timestamps ~83min in the past (outside the 1h window), plus garbage/blank lines, plus `now`
    fs.writeFileSync(f, ["garbage", "NaN", "", "   ", ...Array.from({ length: 200 }, (_, i) => now - 5_000_000 - i), String(now)].join("\n"));
    const r = readWindowCount(f, now, 3_600_000);
    expect(r.count).toBe(1);          // only `now` is inside the 1h window
    expect(r.total).toBe(201);        // 200 stale + `now`; garbage/blank lines don't count
    expect(r.pruneDue).toBe(true);    // 201 valid lines vs 1 kept
    expect(readWindowCount(path.join(TMP, "nope.log"), now, MIN)).toEqual({ count: 0, total: 0, pruneDue: false });
  });
});

describe("decideAlarm — fire once per snooze window while over the ceiling", () => {
  it("below the ceiling → no alarm", () => {
    expect(decideAlarm({ count: 799, ceiling: 800, lastAlarmAt: 0, now: 1e6, snoozeMs: 600_000 }).alarm).toBe(false);
  });
  it("at/above the ceiling with no prior alarm → alarm; message says compact/batch + the numbers", () => {
    const d = decideAlarm({ count: 850, ceiling: 800, lastAlarmAt: 0, now: 1e6, snoozeMs: 600_000, windowMs: 3_600_000 });
    expect(d.alarm).toBe(true);
    expect(d.count).toBe(850);
    expect(d.ceiling).toBe(800);
    expect(d.message).toMatch(/850/);
    expect(d.message).toMatch(/800/);
    expect(d.message.toLowerCase()).toMatch(/\/compact|batch|slow/);
  });
  it("still over but within the snooze of a recent alarm → no alarm", () => {
    expect(decideAlarm({ count: 900, ceiling: 800, lastAlarmAt: 1e6 - 100, now: 1e6, snoozeMs: 600_000 }).alarm).toBe(false);
  });
  it("still over and the snooze has elapsed → alarm again", () => {
    expect(decideAlarm({ count: 900, ceiling: 800, lastAlarmAt: 1e6 - 700_000, now: 1e6, snoozeMs: 600_000 }).alarm).toBe(true);
  });
});

describe("runBudget — end to end (real cache dir, low ceiling for speed)", () => {
  it("disabled → no alarm, no log written", () => {
    const r = runBudget({ stdin: { tool_name: "Bash", session_id: "s" }, env: envFor({ PRISM_TOOL_BATCH_BUDGET: "0" }), now: 1e6 });
    expect(r).toMatchObject({ alarm: false, disabled: true });
    expect(fs.existsSync(logPath("s", envFor()))).toBe(false);
  });
  it("under the ceiling → no alarm, but the call IS logged and the state file written", () => {
    const env = envFor({ PRISM_TOOL_BATCH_CEILING: "5" });
    const r = runBudget({ stdin: { tool_name: "Read", session_id: "s1" }, env, now: 2e6 });
    expect(r.alarm).toBe(false);
    expect(fs.readFileSync(logPath("s1", env), "utf8").trim()).toBe("2000000");
  });
  it("crossing the ceiling → alarm; the very next call (within snooze) → no alarm; after the snooze → alarm again", () => {
    const env = envFor({ PRISM_TOOL_BATCH_CEILING: "3", PRISM_TOOL_BATCH_SNOOZE_MS: "1000" });
    const sid = "burst";
    expect(runBudget({ stdin: { session_id: sid }, env, now: 100 }).alarm).toBe(false); // count 1
    expect(runBudget({ stdin: { session_id: sid }, env, now: 200 }).alarm).toBe(false); // count 2
    expect(runBudget({ stdin: { session_id: sid }, env, now: 300 }).alarm).toBe(true);  // count 3 ≥ ceiling 3 → alarm
    expect(runBudget({ stdin: { session_id: sid }, env, now: 400 }).alarm).toBe(false); // still over, within 1s snooze
    expect(runBudget({ stdin: { session_id: sid }, env, now: 1500 }).alarm).toBe(true); // snooze elapsed → alarm again
  });
  it("per-session isolation: session A blowing the ceiling doesn't alarm session B", () => {
    const env = envFor({ PRISM_TOOL_BATCH_CEILING: "2", PRISM_TOOL_BATCH_SNOOZE_MS: "0" });
    const t0 = 1_000_000;
    expect(runBudget({ stdin: { session_id: "A" }, env, now: t0 }).alarm).toBe(false);     // A count 1 < 2
    expect(runBudget({ stdin: { session_id: "A" }, env, now: t0 + 1 }).alarm).toBe(true);   // A count 2 ≥ 2
    expect(runBudget({ stdin: { session_id: "A" }, env, now: t0 + 2 }).alarm).toBe(true);   // A count 3, snooze 0 → alarm again
    expect(runBudget({ stdin: { session_id: "B" }, env, now: t0 + 2 }).alarm).toBe(false);  // B's own window has just 1 call
  });
  it("the window drains: old calls stop counting toward the ceiling", () => {
    const env = envFor({ PRISM_TOOL_BATCH_CEILING: "3", PRISM_TOOL_BATCH_WINDOW_MS: "1000", PRISM_TOOL_BATCH_SNOOZE_MS: "0" });
    const sid = "drain";
    const t0 = 5_000_000;
    runBudget({ stdin: { session_id: sid }, env, now: t0 });
    runBudget({ stdin: { session_id: sid }, env, now: t0 + 100 });
    expect(runBudget({ stdin: { session_id: sid }, env, now: t0 + 200 }).alarm).toBe(true);   // 3 in the 1s window
    expect(runBudget({ stdin: { session_id: sid }, env, now: t0 + 10_000 }).alarm).toBe(false); // 10s later the window drained
  });
  it("writes a self-tuned recommendation after PRISM_TOOL_BATCH_RECOMMEND_EVERY calls", () => {
    const env = envFor({ PRISM_TOOL_BATCH_CEILING: "9999", PRISM_TOOL_BATCH_RECOMMEND_EVERY: "3" });
    const sid = "rec";
    for (let i = 1; i <= 3; i++) runBudget({ stdin: { session_id: sid }, env, now: 1000 + i });
    const rp = recommendationPath(env);
    expect(fs.existsSync(rp)).toBe(true);
    const rec = JSON.parse(fs.readFileSync(rp, "utf8"));
    expect(Number.isFinite(rec.ceiling)).toBe(true);
    expect(rec.ceiling).toBeGreaterThanOrEqual(100);
    expect(fs.existsSync(samplesPath(env))).toBe(true);
  });
  it("garbled / null stdin → no alarm, never throws", () => {
    expect(() => runBudget({ stdin: null, env: envFor(), now: 1e6 })).not.toThrow();
    expect(runBudget({ stdin: null, env: envFor(), now: 1e6 }).alarm).toBe(false);
    expect(runBudget({ stdin: "junk", env: envFor(), now: 1e6 }).alarm).toBe(false);
  });
});

describe("retune-tool-batch-ceiling.mjs", () => {
  function seedSamples(counts) {
    fs.mkdirSync(TMP, { recursive: true });
    fs.writeFileSync(samplesPath(envFor()), counts.map((c) => JSON.stringify({ at: Date.now(), count: c })).join("\n") + "\n");
  }
  it("with samples on disk → recommends ~p90×1.4 and WRITES the recommendation file", () => {
    seedSamples([50, 100, 200, 300, 400, 500, 600, 700, 900, 1000]);
    const r = retune({ env: envFor() });
    expect(r.wrote).toBe(true);
    expect(r.ceiling).toBeGreaterThanOrEqual(900);
    expect(r.stats.p90).toBe(900);
    const onDisk = JSON.parse(fs.readFileSync(recommendationPath(envFor()), "utf8"));
    expect(onDisk.ceiling).toBe(r.ceiling);
    expect(onDisk.source).toBe("retune-tool-batch-ceiling.mjs");
  });
  it("--dry-run computes but does NOT write", () => {
    seedSamples([100, 200, 300]);
    const r = retune({ env: envFor(), dryRun: true });
    expect(r.wrote).toBe(false);
    expect(fs.existsSync(recommendationPath(envFor()))).toBe(false);
    expect(r.ceiling).toBeGreaterThanOrEqual(100);
  });
  it("no samples file → recommends the 800 default, still writes", () => {
    const r = retune({ env: envFor() });
    expect(r.sampleCount).toBe(0);
    expect(r.ceiling).toBe(800);
    expect(r.wrote).toBe(true);
  });
  it("the retune output then drives the hook's ceiling (round-trip)", () => {
    seedSamples([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]); // p90 = 90 → recommend max(100, round(90*1.4)) = 126
    retune({ env: envFor() });
    expect(resolveCeiling(envFor())).toBe(126);
  });
});
