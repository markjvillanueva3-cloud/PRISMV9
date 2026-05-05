/**
 * Consensus learning loop — integration test.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-LOOP-E2E.
 *
 * Verifies the full neural learning loop end-to-end with real I/O,
 * spanning all six engines that compose the surface:
 *
 *   ConsensusNeuralFeedbackEngine          (already shipped — producer)
 *   ConsensusNeuralCreditAssignmentEngine  (U-NEURAL-CREDIT-ASSIGN)
 *   ConsensusModelPerformanceEngine        (already shipped — EMA tracker)
 *   ConsensusBaselineWarmstartEngine       (U-PERF-WEIGHTS-WARMSTART)
 *   ConsensusPerformanceDashboardEngine    (U-CONSENSUS-DASHBOARD)
 *   ConsensusDashboardRendererEngine       (U-CONSENSUS-DASHBOARD-CLI)
 *   ConsensusCreditRunLogEngine            (U-CREDIT-CRON)
 *
 * Realistic data: 5 vendors × 3 task types × multiple outcomes, written
 * as JSONL via the actual feedback engine, processed via the actual
 * credit-assignment engine, surfaced via the actual dashboard, rendered
 * via the actual renderer, and logged via the actual run-log engine.
 *
 * No mocks. Every operation goes through the real engine API and a
 * real tmpdir filesystem.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { consensusNeuralFeedbackEngine } from "../engines/ConsensusNeuralFeedbackEngine.js";
import { consensusNeuralCreditAssignmentEngine } from "../engines/ConsensusNeuralCreditAssignmentEngine.js";
import { consensusModelPerformanceEngine } from "../engines/ConsensusModelPerformanceEngine.js";
import { consensusBaselineWarmstartEngine } from "../engines/ConsensusBaselineWarmstartEngine.js";
import { consensusPerformanceDashboardEngine } from "../engines/ConsensusPerformanceDashboardEngine.js";
import { consensusDashboardRendererEngine } from "../engines/ConsensusDashboardRendererEngine.js";
import { consensusCreditRunLogEngine } from "../engines/ConsensusCreditRunLogEngine.js";

import type { ConsensusResultLike } from "../engines/ConsensusNeuralFeedbackEngine.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-consensus-e2e-"));
}

interface ScenarioInput {
  vendor: string;
  model: string;
  taskType: string;
  recommendation: "accept" | "review" | "escalate";
  agreementScore: number;
  voters: string[];
  ok: boolean;
}

function makeResult(scenario: ScenarioInput, allModels: Array<{ vendor: string; model: string }>): ConsensusResultLike {
  return {
    ok: true,
    mode: "compare",
    responses: allModels.map(({ vendor, model }) => ({
      model,
      vendor,
      ok: scenario.ok || model !== scenario.model,
      answer: "answer",
      latencyMs: 100,
      tokens: 50,
      error: scenario.ok || model !== scenario.model ? null : "synthetic_failure",
    })),
    successCount: allModels.length - (scenario.ok ? 0 : 1),
    agreementScore: scenario.agreementScore,
    consensus: scenario.voters.length > 0
      ? { answer: "answer", voters: scenario.voters, confidence: scenario.agreementScore }
      : null,
    recommendation: scenario.recommendation,
    totalLatencyMs: 100,
    factCheck: {},
  };
}

describe("Consensus learning loop — integration (E2E)", () => {
  let dir: string;
  let feedPath: string;
  let perfPath: string;
  let cursorPath: string;
  let runLogPath: string;
  let warmstartPerfPath: string;

  // Realistic 5-vendor pool spanning the full consensus stack.
  const allModels = [
    { vendor: "anthropic", model: "claude-opus-4-7" },
    { vendor: "openai",    model: "gpt-5.5" },
    { vendor: "google",    model: "gemini-3-pro" },
    { vendor: "ollama",    model: "deepseek-r1:14b" },
    { vendor: "xai",       model: "grok-4" },
  ];

  beforeEach(() => {
    dir = tmpDir();
    feedPath = path.join(dir, "feed.jsonl");
    perfPath = path.join(dir, "perf.json");
    cursorPath = path.join(dir, "cursor.json");
    runLogPath = path.join(dir, "runs.jsonl");
    warmstartPerfPath = path.join(dir, "warmstart-perf.json");
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ---- Phase 1: feed → credit assignment → perf state ----

  it("phase 1: writes consensus runs to feed via FeedbackEngine, replays via CreditAssignment, EMAs update", () => {
    // 9 scenarios spanning 3 task types × 3 outcomes (variability floor).
    const scenarios: ScenarioInput[] = [
      // plan: anthropic + openai win consistently, others trail
      { vendor: "anthropic", model: "claude-opus-4-7", taskType: "plan", recommendation: "accept",
        agreementScore: 1.0, voters: ["claude-opus-4-7", "gpt-5.5"], ok: true },
      { vendor: "anthropic", model: "claude-opus-4-7", taskType: "plan", recommendation: "accept",
        agreementScore: 0.9, voters: ["claude-opus-4-7", "gpt-5.5", "gemini-3-pro"], ok: true },
      { vendor: "anthropic", model: "claude-opus-4-7", taskType: "plan", recommendation: "review",
        agreementScore: 0.7, voters: ["claude-opus-4-7", "gpt-5.5"], ok: true },
      // build: openai dominates
      { vendor: "openai", model: "gpt-5.5", taskType: "build", recommendation: "accept",
        agreementScore: 1.0, voters: ["gpt-5.5", "claude-opus-4-7"], ok: true },
      { vendor: "openai", model: "gpt-5.5", taskType: "build", recommendation: "accept",
        agreementScore: 0.9, voters: ["gpt-5.5", "claude-opus-4-7", "deepseek-r1:14b"], ok: true },
      { vendor: "openai", model: "gpt-5.5", taskType: "build", recommendation: "escalate",
        agreementScore: 0.3, voters: [], ok: true },
      // decide: split outcome
      { vendor: "anthropic", model: "claude-opus-4-7", taskType: "decide", recommendation: "accept",
        agreementScore: 1.0, voters: ["claude-opus-4-7", "gpt-5.5", "gemini-3-pro"], ok: true },
      { vendor: "anthropic", model: "claude-opus-4-7", taskType: "decide", recommendation: "review",
        agreementScore: 0.5, voters: ["claude-opus-4-7"], ok: true },
      { vendor: "anthropic", model: "claude-opus-4-7", taskType: "decide", recommendation: "escalate",
        agreementScore: 0.2, voters: [], ok: true },
    ];

    // Phase 1a: write feed via the actual FeedbackEngine — same path
    // AIBridge.reason() takes during a real consensus run.
    for (const s of scenarios) {
      const result = makeResult(s, allModels);
      const fed = consensusNeuralFeedbackEngine.record({
        prompt: `e2e prompt for ${s.taskType} #${s.recommendation}`,
        taskType: s.taskType,
        sourceSession: "e2e-test",
        result,
        feedPath,
      });
      expect(fed.ok).toBe(true);
    }

    // Phase 1b: cron-style backfill via the actual CreditAssignment engine.
    const out = consensusNeuralCreditAssignmentEngine.applyFromFeed({
      feedPath, cursorPath, perfStatePath: perfPath,
    });
    expect(out.ok).toBe(true);
    expect(out.processed).toBe(scenarios.length);
    expect(out.skipped).toBe(0);

    // Phase 1c: perf state is reloadable, has expected vendor count.
    const reloaded = consensusModelPerformanceEngine.loadState(perfPath);
    expect(Object.keys(reloaded.vendors).sort()).toEqual(
      ["anthropic", "google", "ollama", "openai", "xai"],
    );
    // Each scenario adds an observation per model in the consensus run.
    expect(reloaded.vendors.anthropic.tasks.plan.n).toBe(3);
    expect(reloaded.vendors.anthropic.tasks.decide.n).toBe(3);
    expect(reloaded.vendors.openai.tasks.build.n).toBe(3);
  });

  // ---- Phase 2: dashboard surfaces the learned EMAs ----

  it("phase 2: dashboard ranks vendors per task and detects gaps after credit assignment", () => {
    // Seed perf state via an applyFromResult call (simpler than feed roundtrip).
    consensusNeuralCreditAssignmentEngine.applyFromResult({
      result: makeResult(
        { vendor: "anthropic", model: "claude-opus-4-7", taskType: "plan",
          recommendation: "accept", agreementScore: 1.0,
          voters: ["claude-opus-4-7", "gpt-5.5"], ok: true },
        allModels,
      ),
      taskType: "plan",
      perfStatePath: perfPath,
    });
    fs.writeFileSync(feedPath, JSON.stringify({
      schema_version: "1.0.0",
      ts: "2026-05-05T15:00:00.000Z",
      prompt_hash: "h", prompt: "p", task_type: "plan", source_session: "e2e",
      recommendation: "accept", agreement_score: 1.0, total_latency_ms: 0,
      reward: 1.0, reward_components: { rec_score: 1, agree_score: 1, fact_score: 1, latency_penalty: 1 },
      models: allModels.map((m) => ({
        model: m.model, vendor: m.vendor, ok: true, latency_ms: 100, tokens: 50,
        factuality_score: null, hallucination_count: 0,
        in_consensus_voters: m.vendor === "anthropic" || m.vendor === "openai",
        answer_chars: 6,
      })),
    }) + "\n");

    const dashboard = consensusPerformanceDashboardEngine.compute({
      perfStatePath: perfPath, feedPath,
      expectedVendors: allModels.map((m) => m.vendor),
      expectedTaskTypes: ["plan", "build", "decide"],
    });

    // Plan is calibrated; build + decide are uncovered.
    expect(dashboard.perTaskType.plan.vendors.length).toBe(5);
    expect(dashboard.perTaskType.build.coverage.missing.length).toBe(5);
    expect(dashboard.perTaskType.decide.coverage.missing.length).toBe(5);

    // Voters get ema=1.0, dissenters ema=0.5 — voters rank above dissenters.
    const planRanking = dashboard.perTaskType.plan.vendors;
    const top = planRanking.slice(0, 2).map((v) => v.vendor).sort();
    expect(top).toEqual(["anthropic", "openai"]);

    // Trend reflects the single feed line.
    expect(dashboard.trend.feedLines).toBe(1);
    expect(dashboard.trend.recentRewards?.count).toBe(1);
  });

  // ---- Phase 3: renderer produces operator-facing markdown ----

  it("phase 3: renderer transforms dashboard into terminal-scannable markdown", () => {
    consensusNeuralCreditAssignmentEngine.applyFromResult({
      result: makeResult(
        { vendor: "anthropic", model: "claude-opus-4-7", taskType: "decide",
          recommendation: "accept", agreementScore: 1.0,
          voters: ["claude-opus-4-7", "gpt-5.5"], ok: true },
        allModels,
      ),
      taskType: "decide",
      perfStatePath: perfPath,
    });

    const dashboard = consensusPerformanceDashboardEngine.compute({
      perfStatePath: perfPath, feedPath,
      expectedVendors: allModels.map((m) => m.vendor),
      expectedTaskTypes: ["decide"],
    });
    const md = consensusDashboardRendererEngine.render(dashboard);

    expect(md).toContain("# Consensus Dashboard");
    expect(md).toContain("### decide");
    expect(md).toContain("anthropic");
    expect(md).toContain("openai");
    expect(md).toContain("| Rank | Vendor | EMA | n |");
    expect(md.endsWith("\n")).toBe(true);
  });

  // ---- Phase 4: cron run-log captures every backfill cycle ----

  it("phase 4: simulated cron loop records each run; stats aggregate correctly", () => {
    // Simulate 3 cron cycles.
    const cycles = [
      // cycle 1: 2 entries
      [{ task: "plan", reward: 0.9 }, { task: "decide", reward: 0.8 }],
      // cycle 2: 1 entry
      [{ task: "build", reward: 0.7 }],
      // cycle 3: 0 entries (no-op, idempotent)
      [],
    ];

    let totalLines = 0;
    for (const [i, cycle] of cycles.entries()) {
      // Append this cycle's data to the feed.
      for (const item of cycle) {
        fs.appendFileSync(feedPath, JSON.stringify({
          schema_version: "1.0.0",
          ts: `2026-05-05T15:${String(i * 10).padStart(2, "0")}:00.000Z`,
          prompt_hash: "h", prompt: "p", task_type: item.task,
          source_session: "e2e", recommendation: "accept",
          agreement_score: 1.0, total_latency_ms: 0,
          reward: item.reward,
          reward_components: { rec_score: 1, agree_score: 1, fact_score: 1, latency_penalty: 1 },
          models: [{
            model: "claude-opus-4-7", vendor: "anthropic", ok: true,
            latency_ms: 100, tokens: 50, factuality_score: null,
            hallucination_count: 0, in_consensus_voters: true, answer_chars: 6,
          }],
        }) + "\n");
        totalLines++;
      }

      // Mirror what consensus-credit-cron.mjs does:
      const before = consensusNeuralCreditAssignmentEngine.loadCursor(cursorPath);
      const startedAt = Date.now();
      const result = consensusNeuralCreditAssignmentEngine.applyFromFeed({
        feedPath, cursorPath, perfStatePath: perfPath,
      });
      const durationMs = Date.now() - startedAt;
      const cursorAdvance = (result.cursor.last_offset_bytes ?? 0) - (before.last_offset_bytes ?? 0);
      const perVendorCounts: Record<string, number> = {};
      for (const [v, totals] of Object.entries(result.perVendor)) {
        perVendorCounts[v] = totals.observations;
      }
      consensusCreditRunLogEngine.recordRun({
        ok: result.ok,
        processed: result.processed,
        skipped: result.skipped,
        cursorAdvance,
        cursorOffset: result.cursor.last_offset_bytes,
        perVendor: perVendorCounts,
        trigger: "e2e-cron",
        error: result.error,
        durationMs,
        logPath: runLogPath,
      });
    }

    // Verify run log captured all 3 cycles.
    const history = consensusCreditRunLogEngine.getHistory({ logPath: runLogPath });
    expect(history).toHaveLength(3);
    expect(history[0].processed).toBe(2);
    expect(history[1].processed).toBe(1);
    expect(history[2].processed).toBe(0); // idempotent no-op

    // Aggregate stats reflect 3 successful cycles.
    const stats = consensusCreditRunLogEngine.getStats({ logPath: runLogPath });
    expect(stats.totalRuns).toBe(3);
    expect(stats.successfulRuns).toBe(3);
    expect(stats.successRate).toBe(1.0);
    expect(stats.totalProcessed).toBe(totalLines); // sum of all processed
    expect(stats.lastRunOk).toBe(true);

    // Cursor advanced exactly equal to feed file size.
    const finalCursor = consensusNeuralCreditAssignmentEngine.loadCursor(cursorPath);
    expect(finalCursor.last_offset_bytes).toBe(fs.statSync(feedPath).size);
  });

  // ---- Phase 5: warmstart parity vs applyFromFeed numerical contrast ----

  it("phase 5: warmstart produces unweighted-mean baseline; applyFromFeed produces alpha-blended chain", () => {
    // Two consensus runs for the same vendor/task — first reward 1.0, second 0.0.
    fs.writeFileSync(feedPath, [
      JSON.stringify({
        schema_version: "1.0.0",
        ts: "2026-05-05T15:00:00.000Z",
        prompt_hash: "h1", prompt: "p1", task_type: "decide",
        source_session: "e2e", recommendation: "accept",
        agreement_score: 1.0, total_latency_ms: 0,
        reward: 1.0,
        reward_components: { rec_score: 1, agree_score: 1, fact_score: 1, latency_penalty: 1 },
        models: [{
          model: "m", vendor: "anthropic", ok: true, latency_ms: 0, tokens: 10,
          factuality_score: null, hallucination_count: 0,
          in_consensus_voters: true, answer_chars: 2,
        }],
      }),
      JSON.stringify({
        schema_version: "1.0.0",
        ts: "2026-05-05T15:01:00.000Z",
        prompt_hash: "h2", prompt: "p2", task_type: "decide",
        source_session: "e2e", recommendation: "escalate",
        agreement_score: 0.0, total_latency_ms: 0,
        reward: 0.0,
        reward_components: { rec_score: 0.1, agree_score: 0, fact_score: 1, latency_penalty: 1 },
        models: [{
          model: "m", vendor: "anthropic", ok: true, latency_ms: 0, tokens: 10,
          factuality_score: null, hallucination_count: 0,
          in_consensus_voters: false, answer_chars: 2,
        }],
      }),
    ].join("\n") + "\n");

    // Path A: applyFromFeed (alpha-blended EMA chain).
    consensusNeuralCreditAssignmentEngine.applyFromFeed({
      feedPath, cursorPath, perfStatePath: perfPath,
    });
    const alphaState = consensusModelPerformanceEngine.loadState(perfPath);
    const alphaEma = alphaState.vendors.anthropic.tasks.decide.ema;

    // Path B: warmstart (unweighted mean) — fresh perf path.
    const ws = consensusBaselineWarmstartEngine.warmstart({
      feedPath, perfStatePath: warmstartPerfPath,
    });
    const meanEma = ws.state.vendors.anthropic.tasks.decide.ema;

    // First datum: voter, reward=1.0 → credit=1.0
    // Second datum: non-voter (in_consensus_voters=false), reward=0.0 → credit=0.0
    // Unweighted mean = (1.0 + 0.0) / 2 = 0.5
    expect(meanEma).toBe(0.5);

    // applyFromFeed cold-start replaces on first observation, then alpha-blends:
    //   ema_after_first  = 1.0  (cold-start replace)
    //   ema_after_second = 0.2 * 0.0 + 0.8 * 1.0 = 0.8
    expect(alphaEma).toBeCloseTo(0.8, 5);

    // Numerical contrast: alpha-blended favors first observation, mean is balanced.
    expect(alphaEma).toBeGreaterThan(meanEma);
  });

  // ---- Phase 6: full pipeline coherence ----

  it("phase 6: full pipeline (feed → credit → dashboard → render → log) produces coherent operator view", () => {
    // Seed 6 runs across 3 task types × 2 vendor profiles.
    const runs: Array<{ taskType: string; voters: string[]; reward: number }> = [
      { taskType: "plan",   voters: ["claude-opus-4-7", "gpt-5.5"],                 reward: 0.9 },
      { taskType: "plan",   voters: ["claude-opus-4-7", "gpt-5.5", "gemini-3-pro"], reward: 0.85 },
      { taskType: "build",  voters: ["gpt-5.5", "claude-opus-4-7"],                 reward: 0.95 },
      { taskType: "build",  voters: ["gpt-5.5", "deepseek-r1:14b"],                 reward: 0.7 },
      { taskType: "decide", voters: ["claude-opus-4-7"],                            reward: 0.5 },
      { taskType: "decide", voters: ["gpt-5.5", "claude-opus-4-7"],                 reward: 0.8 },
    ];

    for (const r of runs) {
      consensusNeuralFeedbackEngine.record({
        prompt: `e2e ${r.taskType}`,
        taskType: r.taskType,
        sourceSession: "e2e",
        result: {
          ok: true,
          mode: "compare",
          responses: allModels.map((m) => ({
            model: m.model, vendor: m.vendor, ok: true, answer: "a",
            latencyMs: 100, tokens: 50, error: null,
          })),
          successCount: 5,
          agreementScore: r.reward,
          consensus: { answer: "a", voters: r.voters, confidence: r.reward },
          recommendation: r.reward > 0.7 ? "accept" : r.reward > 0.3 ? "review" : "escalate",
          totalLatencyMs: 100,
          factCheck: {},
        },
        feedPath,
      });
    }

    // Apply the whole feed.
    const apply = consensusNeuralCreditAssignmentEngine.applyFromFeed({
      feedPath, cursorPath, perfStatePath: perfPath,
    });
    expect(apply.processed).toBe(6);

    // Record one cron entry summarizing the apply.
    consensusCreditRunLogEngine.recordRun({
      ok: apply.ok,
      processed: apply.processed,
      skipped: apply.skipped,
      cursorAdvance: apply.cursor.last_offset_bytes,
      cursorOffset: apply.cursor.last_offset_bytes,
      perVendor: Object.fromEntries(
        Object.entries(apply.perVendor).map(([v, t]) => [v, t.observations]),
      ),
      trigger: "e2e",
      error: null,
      durationMs: 1,
      logPath: runLogPath,
    });

    // Dashboard sees 5 vendors covered across 3 task types (each run scores all 5 models).
    const dashboard = consensusPerformanceDashboardEngine.compute({
      perfStatePath: perfPath, feedPath,
      expectedVendors: allModels.map((m) => m.vendor),
      expectedTaskTypes: ["plan", "build", "decide"],
    });
    expect(dashboard.overall.totalVendors).toBe(5);
    expect(dashboard.overall.totalTaskTypes).toBe(3);
    // Every vendor scored on every task type → fully covered (no missing combos).
    expect(dashboard.overall.coldStartCombos.filter((c) => c.reason === "missing")).toEqual([]);
    expect(dashboard.trend.feedLines).toBe(6);

    // Renderer produces non-empty markdown with all 3 task headers.
    const md = consensusDashboardRendererEngine.render(dashboard);
    expect(md).toContain("### plan");
    expect(md).toContain("### build");
    expect(md).toContain("### decide");

    // Run-log has the cron entry.
    const stats = consensusCreditRunLogEngine.getStats({ logPath: runLogPath });
    expect(stats.totalRuns).toBe(1);
    expect(stats.successfulRuns).toBe(1);
    expect(stats.totalProcessed).toBe(6);
  });
});
