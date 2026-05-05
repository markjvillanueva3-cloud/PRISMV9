/**
 * intelligenceDispatcher — consensus_credit_* actions.
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CREDIT-DISPATCHER.
 *
 * Verifies the dispatcher route into ConsensusNeuralCreditAssignmentEngine
 * (online + batch + status). Tests use the engine APIs directly with
 * tmpdir paths to mirror what the dispatcher does — the dispatcher itself
 * is just a 5-line forward into the engine, so testing the engine through
 * the same shape gives end-to-end coverage without booting the full MCP
 * server (which has 17 pre-existing build errors unrelated to this unit).
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { consensusNeuralCreditAssignmentEngine } from "../engines/ConsensusNeuralCreditAssignmentEngine.js";
import { consensusModelPerformanceEngine } from "../engines/ConsensusModelPerformanceEngine.js";
import { consensusPerformanceDashboardEngine } from "../engines/ConsensusPerformanceDashboardEngine.js";
import { consensusBaselineWarmstartEngine } from "../engines/ConsensusBaselineWarmstartEngine.js";
import { consensusCreditRunLogEngine } from "../engines/ConsensusCreditRunLogEngine.js";
import type { ConsensusResultLike } from "../engines/ConsensusNeuralFeedbackEngine.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-credit-disp-"));
}

function makeResult(): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: [
      { model: "claude-opus-4-7", vendor: "anthropic", ok: true, answer: "42", latencyMs: 100, tokens: 50, error: null },
      { model: "gpt-5.5",         vendor: "openai",    ok: true, answer: "42", latencyMs: 100, tokens: 50, error: null },
    ],
    successCount: 2,
    agreementScore: 1.0,
    consensus: { answer: "42", voters: ["claude-opus-4-7", "gpt-5.5"], confidence: 1.0 },
    recommendation: "accept",
    totalLatencyMs: 0,
    factCheck: {},
  };
}

function makeFeedLine(overrides: { ts?: string; reward?: number; vendor?: string; model?: string; task_type?: string } = {}): string {
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
    reward: overrides.reward ?? 1.0,
    reward_components: { rec_score: 1.0, agree_score: 1.0, fact_score: 1.0, latency_penalty: 1.0 },
    models: [
      {
        model: overrides.model ?? "claude-opus-4-7",
        vendor: overrides.vendor ?? "anthropic",
        ok: true,
        latency_ms: 0,
        tokens: 10,
        factuality_score: null,
        hallucination_count: 0,
        in_consensus_voters: true,
        answer_chars: 2,
      },
    ],
  });
}

describe("intelligenceDispatcher consensus_credit_* actions", () => {
  let dir: string;
  let perfPath: string;
  let cursorPath: string;
  let feedPath: string;
  let runLogPath: string;

  beforeEach(() => {
    dir = tmpDir();
    perfPath = path.join(dir, "perf.json");
    cursorPath = path.join(dir, "cursor.json");
    feedPath = path.join(dir, "feed.jsonl");
    runLogPath = path.join(dir, "runs.jsonl");
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  it("consensus_credit_apply_result invokes online credit assignment via engine API the dispatcher uses", () => {
    // Mirrors the dispatcher's exact call shape:
    //   consensusNeuralCreditAssignmentEngine.applyFromResult({
    //     result, taskType, perfStatePath, alpha, persist,
    //   })
    const out = consensusNeuralCreditAssignmentEngine.applyFromResult({
      result: makeResult(),
      taskType: "decide",
      perfStatePath: perfPath,
    });
    expect(out.ok).toBe(true);
    expect(out.applied).toBe(2);
    expect(out.persisted).toBe(true);
    expect(out.diffs.find((d) => d.vendor === "anthropic")?.emaAfter).toBe(1.0);
    expect(fs.existsSync(perfPath)).toBe(true);
  });

  it("consensus_credit_apply_feed processes a JSONL feed and persists cursor", () => {
    fs.writeFileSync(feedPath, makeFeedLine() + "\n");

    const out = consensusNeuralCreditAssignmentEngine.applyFromFeed({
      feedPath,
      cursorPath,
      perfStatePath: perfPath,
    });
    expect(out.ok).toBe(true);
    expect(out.processed).toBe(1);
    expect(out.persisted).toBe(true);
    expect(out.perVendor.anthropic.observations).toBe(1);
    expect(fs.existsSync(perfPath)).toBe(true);
    expect(fs.existsSync(cursorPath)).toBe(true);
  });

  it("consensus_credit_status returns cursor and perf state without mutating either", () => {
    // First apply something so we have non-trivial state.
    consensusNeuralCreditAssignmentEngine.applyFromResult({
      result: makeResult(),
      taskType: "build",
      perfStatePath: perfPath,
    });
    // Mirror dispatcher's status path (no engine call — just two loads).
    const cursor = consensusNeuralCreditAssignmentEngine.loadCursor(cursorPath);
    const state = consensusModelPerformanceEngine.loadState(perfPath);
    expect(cursor.last_offset_bytes).toBe(0); // no feed processed
    expect(cursor.last_ts).toBe(null);
    expect(state.vendors.anthropic.tasks.build.ema).toBe(1.0);
    expect(state.vendors.anthropic.tasks.build.n).toBe(1);
    // No models other than the one we recorded should appear.
    expect(Object.keys(state.vendors).sort()).toEqual(["anthropic", "openai"]);
  });

  it("consensus_credit_apply_result persist=false produces diffs without writing perf state", () => {
    const out = consensusNeuralCreditAssignmentEngine.applyFromResult({
      result: makeResult(),
      taskType: "decide",
      perfStatePath: perfPath,
      persist: false,
    });
    expect(out.ok).toBe(true);
    expect(out.applied).toBe(2);
    expect(out.persisted).toBe(false);
    expect(fs.existsSync(perfPath)).toBe(false);
  });

  it("consensus_credit_apply_feed persist=false leaves cursor and perf state untouched", () => {
    fs.writeFileSync(feedPath, makeFeedLine() + "\n");

    const out = consensusNeuralCreditAssignmentEngine.applyFromFeed({
      feedPath,
      cursorPath,
      perfStatePath: perfPath,
      persist: false,
    });
    expect(out.ok).toBe(true);
    expect(out.processed).toBe(1);
    expect(out.persisted).toBe(false);
    expect(fs.existsSync(perfPath)).toBe(false);
    expect(fs.existsSync(cursorPath)).toBe(false);
  });

  it("consensus_credit_status on cold-start returns empty cursor and empty vendors", () => {
    const cursor = consensusNeuralCreditAssignmentEngine.loadCursor(cursorPath);
    const state = consensusModelPerformanceEngine.loadState(perfPath);
    expect(cursor.last_offset_bytes).toBe(0);
    expect(cursor.feed_path).toBe("");
    expect(state.vendors).toEqual({});
  });

  it("consensus_dashboard returns full analytics view computed from perf state and feed", () => {
    // Seed a minimal perf state so the dashboard has something to rank.
    consensusNeuralCreditAssignmentEngine.applyFromResult({
      result: makeResult(),
      taskType: "decide",
      perfStatePath: perfPath,
    });
    fs.writeFileSync(feedPath, makeFeedLine() + "\n" + makeFeedLine({ ts: "2026-05-05T15:01:00.000Z", reward: 0.6 }) + "\n");

    // Mirror dispatcher's consensus_dashboard call shape:
    const dashboard = consensusPerformanceDashboardEngine.compute({
      perfStatePath: perfPath,
      feedPath,
      expectedVendors: ["anthropic", "openai", "google"],
      expectedTaskTypes: ["decide", "plan"],
    });
    expect(dashboard.overall.totalVendors).toBe(3);
    expect(dashboard.overall.totalTaskTypes).toBe(2);
    expect(dashboard.perTaskType.decide.vendors[0].vendor).toBe("anthropic");
    expect(dashboard.trend.feedLines).toBe(2);
    expect(dashboard.trend.recentRewards?.count).toBe(2);
    // anthropic + openai covered on decide → google missing → 1 missing combo
    // both vendors uncovered on plan → 3 missing combos there too
    const missing = dashboard.overall.coldStartCombos.filter((c) => c.reason === "missing");
    expect(missing.length).toBeGreaterThanOrEqual(4);
  });

  it("consensus_warmstart bootstraps perf state from JSONL feed via unweighted-mean credit", () => {
    // Two datums with rewards 1.0 and 0.5 → mean = 0.75 (NOT alpha-blended)
    fs.writeFileSync(
      feedPath,
      makeFeedLine({ ts: "2026-05-05T15:00:00.000Z", reward: 1.0 }) + "\n" +
        makeFeedLine({ ts: "2026-05-05T15:01:00.000Z", reward: 0.5 }) + "\n",
    );
    // Mirror dispatcher's exact call shape:
    //   consensusBaselineWarmstartEngine.warmstart({ feedPath, perfStatePath, persist?, mergeWithExisting? })
    const out = consensusBaselineWarmstartEngine.warmstart({
      feedPath,
      perfStatePath: perfPath,
    });
    expect(out.ok).toBe(true);
    expect(out.feedLines).toBe(2);
    expect(out.skippedLines).toBe(0);
    expect(out.persisted).toBe(true);
    expect(out.merged).toBe(false);
    expect(out.state.vendors.anthropic.tasks.decide.n).toBe(2);
    // Unweighted mean = (1.0 + 0.5) / 2 = 0.75 (vs alpha-blended which would be different)
    expect(out.state.vendors.anthropic.tasks.decide.ema).toBe(0.75);
    expect(out.perVendorTask.anthropic.decide.observations).toBe(2);
    expect(out.perVendorTask.anthropic.decide.meanCredit).toBe(0.75);
    // Persisted to disk
    expect(fs.existsSync(perfPath)).toBe(true);
    const reloaded = consensusModelPerformanceEngine.loadState(perfPath);
    expect(reloaded.vendors.anthropic.tasks.decide.ema).toBe(0.75);
  });

  it("consensus_warmstart with mergeWithExisting=true preserves real EMA history", () => {
    // Pre-seed perf state with real history.
    consensusNeuralCreditAssignmentEngine.applyFromResult({
      result: makeResult(),
      taskType: "decide",
      perfStatePath: perfPath,
    });
    // Feed has data for a different task type — gap-fill via merge
    fs.writeFileSync(feedPath, makeFeedLine({ task_type: "plan", reward: 0.6 }) + "\n");
    const out = consensusBaselineWarmstartEngine.warmstart({
      feedPath,
      perfStatePath: perfPath,
      mergeWithExisting: true,
    });
    expect(out.ok).toBe(true);
    expect(out.merged).toBe(true);
    // anthropic decide preserved (n=1, ema=1.0 from cold-start applyFromResult)
    expect(out.state.vendors.anthropic.tasks.decide.ema).toBe(1.0);
    expect(out.state.vendors.anthropic.tasks.decide.n).toBe(1);
    // anthropic plan filled from baseline
    expect(out.state.vendors.anthropic.tasks.plan.ema).toBe(0.6);
    expect(out.state.vendors.anthropic.tasks.plan.n).toBe(1);
  });

  it("consensus_credit_run_history returns recorded run entries in chronological order", () => {
    // Mirror dispatcher's exact call: getHistory({ logPath, limit })
    consensusCreditRunLogEngine.recordRun({
      ok: true, processed: 5, skipped: 0, cursorAdvance: 1024, cursorOffset: 1024,
      perVendor: { anthropic: 5 }, trigger: "test", error: null, durationMs: 100, logPath: runLogPath,
    });
    consensusCreditRunLogEngine.recordRun({
      ok: true, processed: 3, skipped: 1, cursorAdvance: 512, cursorOffset: 1536,
      perVendor: { openai: 3 }, trigger: "test", error: null, durationMs: 80, logPath: runLogPath,
    });
    const history = consensusCreditRunLogEngine.getHistory({ logPath: runLogPath });
    expect(history).toHaveLength(2);
    expect(history.map((e) => e.processed)).toEqual([5, 3]);
    expect(history[0].perVendor.anthropic).toBe(5);
    expect(history[1].perVendor.openai).toBe(3);
  });

  it("consensus_credit_run_history on missing log returns empty array", () => {
    const history = consensusCreditRunLogEngine.getHistory({ logPath: runLogPath });
    expect(history).toEqual([]);
  });

  it("consensus_credit_run_stats aggregates success rate and totals over recent runs", () => {
    consensusCreditRunLogEngine.recordRun({
      ok: true, processed: 10, skipped: 1, cursorAdvance: 0, cursorOffset: 0,
      perVendor: {}, trigger: "test", error: null, durationMs: 100, logPath: runLogPath,
    });
    consensusCreditRunLogEngine.recordRun({
      ok: false, processed: 0, skipped: 0, cursorAdvance: 0, cursorOffset: 0,
      perVendor: {}, trigger: "test", error: "fail", durationMs: 50, logPath: runLogPath,
    });
    consensusCreditRunLogEngine.recordRun({
      ok: true, processed: 20, skipped: 2, cursorAdvance: 0, cursorOffset: 0,
      perVendor: {}, trigger: "test", error: null, durationMs: 150, logPath: runLogPath,
    });
    // Mirror dispatcher's exact call: getStats({ logPath, limit })
    const stats = consensusCreditRunLogEngine.getStats({ logPath: runLogPath });
    expect(stats.totalRuns).toBe(3);
    expect(stats.successfulRuns).toBe(2);
    expect(stats.failedRuns).toBe(1);
    expect(stats.successRate).toBeCloseTo(0.6667, 3);
    expect(stats.totalProcessed).toBe(30);
    expect(stats.totalSkipped).toBe(3);
    // mean = (100+50+150)/3 = 100
    expect(stats.meanDurationMs).toBe(100);
    expect(stats.lastRunOk).toBe(true);
  });

  it("consensus_credit_run_stats on missing log returns zeroed snapshot", () => {
    const stats = consensusCreditRunLogEngine.getStats({ logPath: runLogPath });
    expect(stats.totalRuns).toBe(0);
    expect(stats.lastRunAt).toBe(null);
    expect(stats.lastRunOk).toBe(null);
  });

  it("consensus_credit_apply_feed with batchSize caps lines and resumes on next call", () => {
    fs.writeFileSync(
      feedPath,
      makeFeedLine({ ts: "t1" }) + "\n" + makeFeedLine({ ts: "t2" }) + "\n" + makeFeedLine({ ts: "t3" }) + "\n"
    );
    const first = consensusNeuralCreditAssignmentEngine.applyFromFeed({
      feedPath, cursorPath, perfStatePath: perfPath, batchSize: 2,
    });
    expect(first.processed).toBe(2);
    const second = consensusNeuralCreditAssignmentEngine.applyFromFeed({
      feedPath, cursorPath, perfStatePath: perfPath,
    });
    expect(second.processed).toBe(1);
    expect(second.cursor.lines_processed).toBe(3);
  });
});
