/**
 * ConsensusPerformanceDashboardEngine — INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DASHBOARD.
 *
 * Verifies the read-only dashboard view over consensus learning state:
 * per-task vendor ranking, cold-start gap detection, trend computation
 * from feed, and probe suggestion ordering.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ConsensusPerformanceDashboardEngine,
  type DashboardOpts,
} from "../engines/ConsensusPerformanceDashboardEngine.js";
import {
  ConsensusModelPerformanceEngine,
  type PerformanceState,
} from "../engines/ConsensusModelPerformanceEngine.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-dash-"));
}

function makeState(seed: Record<string, Record<string, { ema: number; n: number; lastUpdated?: string }>>): PerformanceState {
  const vendors: PerformanceState["vendors"] = {};
  for (const [vendor, tasks] of Object.entries(seed)) {
    const taskMap: Record<string, { ema: number; n: number; lastUpdated?: string }> = {};
    for (const [t, stats] of Object.entries(tasks)) {
      taskMap[t] = stats;
    }
    vendors[vendor] = { tasks: taskMap };
  }
  return { schemaVersion: "1.0.0", vendors };
}

function feedLine(overrides: { ts?: string; reward?: number; task_type?: string; vendor?: string } = {}): string {
  return JSON.stringify({
    schema_version: "1.0.0",
    ts: overrides.ts ?? "2026-05-05T15:00:00.000Z",
    prompt_hash: "h",
    prompt: "p",
    task_type: overrides.task_type ?? "decide",
    source_session: "test",
    recommendation: "accept",
    agreement_score: 1.0,
    total_latency_ms: 0,
    reward: overrides.reward ?? 0.8,
    reward_components: { rec_score: 1, agree_score: 1, fact_score: 1, latency_penalty: 1 },
    models: [
      { model: "m1", vendor: overrides.vendor ?? "anthropic", ok: true, latency_ms: 0, tokens: 10, factuality_score: null, hallucination_count: 0, in_consensus_voters: true, answer_chars: 2 },
    ],
  });
}

describe("ConsensusPerformanceDashboardEngine", () => {
  let dir: string;
  let perfPath: string;
  let feedPath: string;
  let perfEngine: ConsensusModelPerformanceEngine;
  let dashEngine: ConsensusPerformanceDashboardEngine;

  beforeEach(() => {
    dir = tmpDir();
    perfPath = path.join(dir, "perf.json");
    feedPath = path.join(dir, "feed.jsonl");
    perfEngine = new ConsensusModelPerformanceEngine();
    dashEngine = new ConsensusPerformanceDashboardEngine(perfEngine);
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ---- empty / cold-start ----

  it("compute on empty state returns all-cold dashboard with every combo flagged missing", () => {
    const out = dashEngine.compute({ perfStatePath: perfPath, feedPath });
    expect(out.overall.totalObservations).toBe(0);
    // 5 default vendors × 7 default task types = 35 missing combos
    expect(out.overall.coldStartCombos).toHaveLength(35);
    expect(out.overall.coldStartCombos.every((c) => c.reason === "missing")).toBe(true);
    expect(out.overall.coverage.uncovered).toBe(7);
    expect(out.overall.coverage.fullyCovered).toBe(0);
    // every per-task view should be empty
    for (const v of Object.values(out.perTaskType)) {
      expect(v.vendors).toEqual([]);
      expect(v.coverage.missing).toHaveLength(5);
    }
  });

  it("compute uses custom expected vendor and task pools when provided", () => {
    const out = dashEngine.compute({
      perfStatePath: perfPath,
      feedPath,
      expectedVendors: ["anthropic", "openai"],
      expectedTaskTypes: ["plan", "decide"],
    });
    expect(out.overall.totalVendors).toBe(2);
    expect(out.overall.totalTaskTypes).toBe(2);
    expect(out.overall.coldStartCombos).toHaveLength(4);
    expect(Object.keys(out.perTaskType).sort()).toEqual(["decide", "plan"]);
  });

  // ---- ranking ----

  it("computeForTaskType ranks vendors by EMA descending and assigns dense rank", () => {
    const state = makeState({
      anthropic: { decide: { ema: 0.92, n: 10 } },
      openai: { decide: { ema: 0.88, n: 8 } },
      google: { decide: { ema: 0.88, n: 5 } },
      ollama: { decide: { ema: 0.62, n: 12 } },
    });
    const view = dashEngine.computeForTaskType("decide", state, {
      expectedVendors: ["anthropic", "openai", "google", "ollama", "xai"],
    });
    expect(view.vendors[0]).toMatchObject({ vendor: "anthropic", ema: 0.92, rank: 1 });
    // tied EMA at 0.88 → both rank=2 (dense rank)
    expect(view.vendors[1]).toMatchObject({ ema: 0.88, rank: 2 });
    expect(view.vendors[2]).toMatchObject({ ema: 0.88, rank: 2 });
    expect(view.vendors[3]).toMatchObject({ vendor: "ollama", rank: 4 });
    expect(view.coverage.missing).toEqual(["xai"]);
  });

  it("computeForTaskType respects topK cap", () => {
    const state = makeState({
      a: { decide: { ema: 0.9, n: 5 } },
      b: { decide: { ema: 0.8, n: 5 } },
      c: { decide: { ema: 0.7, n: 5 } },
      d: { decide: { ema: 0.6, n: 5 } },
    });
    const view = dashEngine.computeForTaskType("decide", state, {
      expectedVendors: ["a", "b", "c", "d"],
      topK: 2,
    });
    expect(view.vendors).toHaveLength(2);
    expect(view.vendors.map((v) => v.vendor)).toEqual(["a", "b"]);
    // total observations counts ALL covered vendors, not just the topK cut
    expect(view.totalObservations).toBe(20);
  });

  // ---- coverage / gaps ----

  it("computeForTaskType buckets sparse vendors (n<3) separately from missing", () => {
    const state = makeState({
      anthropic: { decide: { ema: 0.85, n: 12 } }, // covered
      openai: { decide: { ema: 0.6, n: 1 } },      // sparse
      google: { decide: { ema: 0.7, n: 2 } },      // sparse
      // ollama, xai missing
    });
    const view = dashEngine.computeForTaskType("decide", state);
    expect(view.coverage.covered.sort()).toEqual(["anthropic", "google", "openai"]);
    expect(view.coverage.sparse.sort()).toEqual(["google", "openai"]);
    expect(view.coverage.missing.sort()).toEqual(["ollama", "xai"]);
  });

  it("compute aggregates fullyCovered/partial/uncovered buckets correctly", () => {
    const state = makeState({
      anthropic: {
        plan: { ema: 0.9, n: 10 },
        decide: { ema: 0.85, n: 10 },
      },
      openai: {
        plan: { ema: 0.9, n: 10 },
        decide: { ema: 0.85, n: 10 },
      },
      google: { plan: { ema: 0.85, n: 10 }, decide: { ema: 0.8, n: 10 } },
      ollama: { plan: { ema: 0.7, n: 10 }, decide: { ema: 0.65, n: 10 } },
      xai: { plan: { ema: 0.75, n: 10 } }, // missing on decide
    });
    perfEngine.saveState(state, perfPath);
    const out = dashEngine.compute({
      perfStatePath: perfPath,
      feedPath,
      expectedVendors: ["anthropic", "openai", "google", "ollama", "xai"],
      expectedTaskTypes: ["plan", "decide", "review"],
    });
    // plan: 5/5 covered with n=10 each → fullyCovered
    // decide: 4/5 covered → partial
    // review: 0/5 covered → uncovered
    expect(out.overall.coverage.fullyCovered).toBe(1);
    expect(out.overall.coverage.partial).toBe(1);
    expect(out.overall.coverage.uncovered).toBe(1);
  });

  // ---- trend ----

  it("computeTrend on missing feed returns zeroed trend", () => {
    const t = dashEngine.computeTrend(feedPath);
    expect(t.feedLines).toBe(0);
    expect(t.recentRewards).toBe(null);
    expect(t.rewardByTaskType).toEqual({});
  });

  it("computeTrend computes mean/p50/p90 across feed tail and groups by task_type", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 10; i++) {
      lines.push(feedLine({ ts: `2026-05-05T15:0${i}:00.000Z`, reward: i / 10, task_type: "decide" }));
    }
    for (let i = 1; i <= 5; i++) {
      lines.push(feedLine({ ts: `2026-05-05T16:0${i}:00.000Z`, reward: 0.5, task_type: "build" }));
    }
    fs.writeFileSync(feedPath, lines.join("\n") + "\n");

    const t = dashEngine.computeTrend(feedPath);
    expect(t.feedLines).toBe(15);
    expect(t.scannedLines).toBe(15);
    expect(t.recentRewards).not.toBe(null);
    expect(t.recentRewards!.count).toBe(15);
    // decide rewards 0.1..1.0; build all 0.5; mean ≈ (5.5 + 2.5)/15 = 0.5333
    expect(t.recentRewards!.mean).toBeCloseTo(0.5333, 3);
    expect(t.rewardByTaskType.decide.mean).toBeCloseTo(0.55, 3);
    expect(t.rewardByTaskType.build.mean).toBeCloseTo(0.5, 3);
    expect(t.rewardByTaskType.decide.n).toBe(10);
    expect(t.rewardByTaskType.build.n).toBe(5);
  });

  it("computeTrend respects trendWindow tail cap", () => {
    const lines: string[] = [];
    for (let i = 1; i <= 50; i++) {
      lines.push(feedLine({ ts: `2026-05-05T15:${String(i).padStart(2, "0")}:00.000Z`, reward: i / 100 }));
    }
    fs.writeFileSync(feedPath, lines.join("\n") + "\n");

    const t = dashEngine.computeTrend(feedPath, 10);
    expect(t.feedLines).toBe(50);
    expect(t.scannedLines).toBe(10);
    // Last 10 rewards: 0.41..0.50 → mean ≈ 0.455
    expect(t.recentRewards!.mean).toBeCloseTo(0.455, 3);
  });

  it("computeTrend skips malformed JSON lines without halting", () => {
    const lines = [feedLine({ reward: 0.8 }), "{garbage", feedLine({ reward: 0.6 })];
    fs.writeFileSync(feedPath, lines.join("\n") + "\n");
    const t = dashEngine.computeTrend(feedPath);
    expect(t.feedLines).toBe(3);
    expect(t.recentRewards!.count).toBe(2);
    expect(t.recentRewards!.mean).toBeCloseTo(0.7, 3);
  });

  // ---- suggested probes ----

  it("suggestProbes ranks missing > sparse > stale, then alphabetically for ties", () => {
    const probes = dashEngine.suggestProbes(
      [
        { vendor: "ollama", taskType: "review", reason: "stale", ageDays: 60 },
        { vendor: "xai", taskType: "decide", reason: "missing" },
        { vendor: "openai", taskType: "build", reason: "sparse", n: 1 },
        { vendor: "anthropic", taskType: "plan", reason: "missing" },
        { vendor: "google", taskType: "extract", reason: "sparse", n: 2 },
      ],
      5,
    );
    expect(probes[0]).toMatchObject({ reason: "missing", priority: 1.0 });
    expect(probes[1]).toMatchObject({ reason: "missing", priority: 1.0 });
    // Within reason=missing, alphabetical by taskType then vendor:
    // "decide"+xai vs "plan"+anthropic — decide < plan
    expect(probes[0].taskType).toBe("decide");
    expect(probes[1].taskType).toBe("plan");
    // sparse next, n=1 (priority 0.6) before n=2 (priority 0.5)
    expect(probes[2]).toMatchObject({ reason: "sparse", vendor: "openai" });
    expect(probes[2].priority).toBeGreaterThan(probes[3].priority);
    // stale last
    expect(probes[4]).toMatchObject({ reason: "stale" });
  });

  it("suggestProbes priority decays for sparse as n grows", () => {
    const probes = dashEngine.suggestProbes(
      [
        { vendor: "v1", taskType: "t", reason: "sparse", n: 1 },
        { vendor: "v2", taskType: "t", reason: "sparse", n: 2 },
      ],
      2,
    );
    expect(probes[0].vendor).toBe("v1"); // n=1 wins
    expect(probes[0].priority).toBeGreaterThan(probes[1].priority);
  });

  // ---- stale detection ----

  it("compute flags vendors as stale when staleAfterDays exceeded", () => {
    const oldTimestamp = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const state = makeState({
      anthropic: { decide: { ema: 0.85, n: 10, lastUpdated: oldTimestamp } },
      openai: { decide: { ema: 0.8, n: 10, lastUpdated: new Date().toISOString() } },
    });
    perfEngine.saveState(state, perfPath);
    const out = dashEngine.compute({
      perfStatePath: perfPath,
      feedPath,
      expectedVendors: ["anthropic", "openai"],
      expectedTaskTypes: ["decide"],
      staleAfterDays: 30,
    });
    const staleProbes = out.overall.coldStartCombos.filter((c) => c.reason === "stale");
    expect(staleProbes).toHaveLength(1);
    expect(staleProbes[0].vendor).toBe("anthropic");
    expect(staleProbes[0].ageDays).toBeGreaterThan(30);
  });

  it("compute does not flag stale combos when staleAfterDays=0 (default)", () => {
    const oldTimestamp = "2020-01-01T00:00:00.000Z";
    const state = makeState({
      anthropic: { decide: { ema: 0.85, n: 10, lastUpdated: oldTimestamp } },
    });
    perfEngine.saveState(state, perfPath);
    const out = dashEngine.compute({
      perfStatePath: perfPath,
      feedPath,
      expectedVendors: ["anthropic"],
      expectedTaskTypes: ["decide"],
    });
    expect(out.overall.coldStartCombos.filter((c) => c.reason === "stale")).toEqual([]);
  });

  // ---- end-to-end ----

  it("compute end-to-end: state + feed produce consistent dashboard", () => {
    const state = makeState({
      anthropic: { decide: { ema: 0.9, n: 10 }, plan: { ema: 0.85, n: 5 } },
      openai: { decide: { ema: 0.85, n: 8 } },
    });
    perfEngine.saveState(state, perfPath);
    fs.writeFileSync(
      feedPath,
      [feedLine({ reward: 0.9 }), feedLine({ reward: 0.85, task_type: "plan" })].join("\n") + "\n",
    );

    const out = dashEngine.compute({
      perfStatePath: perfPath,
      feedPath,
      expectedVendors: ["anthropic", "openai", "google"],
      expectedTaskTypes: ["decide", "plan"],
    });
    expect(out.perTaskType.decide.vendors[0].vendor).toBe("anthropic");
    expect(out.perTaskType.plan.vendors[0].vendor).toBe("anthropic");
    expect(out.overall.totalObservations).toBe(23); // 10+5+8
    expect(out.trend.feedLines).toBe(2);
    expect(out.trend.recentRewards!.mean).toBeCloseTo(0.875, 3);
    expect(out.suggestedProbes.length).toBeGreaterThan(0);
  });
});
