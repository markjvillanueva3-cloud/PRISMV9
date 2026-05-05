/**
 * ConsensusBaselineWarmstartEngine — INTEL-OLLAMA-OBSIDIAN-MS0/U-PERF-WEIGHTS-WARMSTART.
 *
 * Verifies cold-start bootstrapping from the JSONL feed using
 * unweighted-mean credit per (vendor, task_type), plus merge-with-existing
 * behavior, persistence modes, malformed input handling, and
 * variability across vendors + task types + recommendation outcomes.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ConsensusBaselineWarmstartEngine,
} from "../engines/ConsensusBaselineWarmstartEngine.js";
import {
  ConsensusModelPerformanceEngine,
  type PerformanceState,
} from "../engines/ConsensusModelPerformanceEngine.js";
import type { NeuralFeedDatum } from "../engines/ConsensusNeuralFeedbackEngine.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-warmstart-"));
}

interface ModelOverride {
  model?: string;
  vendor?: string;
  ok?: boolean;
  factuality_score?: number | null;
  in_consensus_voters?: boolean;
}

function makeDatum(overrides: {
  ts?: string;
  task_type?: string;
  reward?: number;
  recommendation?: "accept" | "review" | "escalate";
  models?: ModelOverride[];
} = {}): NeuralFeedDatum {
  const models = (overrides.models ?? [
    { model: "claude-opus-4-7", vendor: "anthropic", ok: true, in_consensus_voters: true },
    { model: "gpt-5.5", vendor: "openai", ok: true, in_consensus_voters: true },
  ]).map((m) => ({
    model: m.model ?? "m",
    vendor: m.vendor ?? "v",
    ok: m.ok !== false,
    latency_ms: 100,
    tokens: 50,
    factuality_score: m.factuality_score === undefined ? null : m.factuality_score,
    hallucination_count: 0,
    in_consensus_voters: m.in_consensus_voters !== false,
    answer_chars: 2,
  }));
  return {
    schema_version: "1.0.0",
    ts: overrides.ts ?? "2026-05-05T15:00:00.000Z",
    prompt_hash: "h",
    prompt: "p",
    task_type: overrides.task_type ?? "decide",
    source_session: "test",
    recommendation: overrides.recommendation ?? "accept",
    agreement_score: 1.0,
    total_latency_ms: 0,
    reward: overrides.reward ?? 1.0,
    reward_components: { rec_score: 1.0, agree_score: 1.0, fact_score: 1.0, latency_penalty: 1.0 },
    models,
  };
}

describe("ConsensusBaselineWarmstartEngine", () => {
  let dir: string;
  let perfPath: string;
  let feedPath: string;
  let perfEngine: ConsensusModelPerformanceEngine;
  let engine: ConsensusBaselineWarmstartEngine;

  beforeEach(() => {
    dir = tmpDir();
    perfPath = path.join(dir, "perf.json");
    feedPath = path.join(dir, "feed.jsonl");
    perfEngine = new ConsensusModelPerformanceEngine();
    engine = new ConsensusBaselineWarmstartEngine(perfEngine);
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ---- pure computeFromDatums ----

  it("computeFromDatums returns empty state for empty input", () => {
    const state = engine.computeFromDatums([]);
    expect(state.schemaVersion).toBe("1.0.0");
    expect(Object.keys(state.vendors)).toEqual([]);
  });

  it("computeFromDatums on single accept-all datum yields ema=credit and n=1", () => {
    const datum = makeDatum({
      reward: 1.0,
      models: [{ model: "m", vendor: "anthropic", in_consensus_voters: true }],
    });
    const state = engine.computeFromDatums([datum]);
    expect(state.vendors.anthropic.tasks.decide.n).toBe(1);
    // voter + no fact penalty + ok + reward 1.0 → credit 1.0
    expect(state.vendors.anthropic.tasks.decide.ema).toBe(1.0);
    expect(state.vendors.anthropic.tasks.decide.lastUpdated).toBe("2026-05-05T15:00:00.000Z");
  });

  it("computeFromDatums averages credit across multiple datums per (vendor, task)", () => {
    const datums = [
      makeDatum({ ts: "t1", reward: 1.0, models: [{ model: "m", vendor: "anthropic", in_consensus_voters: true }] }),
      makeDatum({ ts: "t2", reward: 0.5, models: [{ model: "m", vendor: "anthropic", in_consensus_voters: true }] }),
      makeDatum({ ts: "t3", reward: 0.0, models: [{ model: "m", vendor: "anthropic", in_consensus_voters: true }] }),
    ];
    const state = engine.computeFromDatums(datums);
    expect(state.vendors.anthropic.tasks.decide.n).toBe(3);
    // unweighted mean = (1.0 + 0.5 + 0.0) / 3 = 0.5
    expect(state.vendors.anthropic.tasks.decide.ema).toBeCloseTo(0.5, 5);
  });

  it("computeFromDatums groups by task_type independently (no cross-bucket leakage)", () => {
    const datums = [
      makeDatum({ task_type: "plan", reward: 0.9, models: [{ model: "m", vendor: "anthropic", in_consensus_voters: true }] }),
      makeDatum({ task_type: "decide", reward: 0.6, models: [{ model: "m", vendor: "anthropic", in_consensus_voters: true }] }),
      makeDatum({ task_type: "build", reward: 0.3, models: [{ model: "m", vendor: "anthropic", in_consensus_voters: true }] }),
    ];
    const state = engine.computeFromDatums(datums);
    expect(state.vendors.anthropic.tasks.plan.ema).toBeCloseTo(0.9, 5);
    expect(state.vendors.anthropic.tasks.decide.ema).toBeCloseTo(0.6, 5);
    expect(state.vendors.anthropic.tasks.build.ema).toBeCloseTo(0.3, 5);
    // decide bucket got exactly 1 observation, not 3
    expect(state.vendors.anthropic.tasks.decide.n).toBe(1);
  });

  // ---- variability floor (≥3 vendors, ≥3 task types, ≥3 outcomes) ----

  it("computeFromDatums spans 5 vendors × 7 task types × 3 outcomes correctly", () => {
    const vendors = ["anthropic", "openai", "google", "ollama", "xai"];
    const taskTypes = ["plan", "build", "review", "decide", "explain", "extract", "validate"];
    const outcomes: Array<{ rec: "accept" | "review" | "escalate"; reward: number }> = [
      { rec: "accept", reward: 0.9 },
      { rec: "review", reward: 0.5 },
      { rec: "escalate", reward: 0.05 },
    ];

    const datums: NeuralFeedDatum[] = [];
    let i = 0;
    for (const vendor of vendors) {
      for (const taskType of taskTypes) {
        for (const outcome of outcomes) {
          datums.push(makeDatum({
            ts: `2026-05-05T15:${String(i++).padStart(3, "0")}:00.000Z`,
            task_type: taskType,
            recommendation: outcome.rec,
            reward: outcome.reward,
            models: [{ model: "m", vendor, in_consensus_voters: true }],
          }));
        }
      }
    }

    const state = engine.computeFromDatums(datums);
    expect(Object.keys(state.vendors).sort()).toEqual([...vendors].sort());
    for (const vendor of vendors) {
      const taskKeys = Object.keys(state.vendors[vendor].tasks).sort();
      expect(taskKeys).toEqual([...taskTypes].sort());
      for (const taskType of taskTypes) {
        const stats = state.vendors[vendor].tasks[taskType];
        expect(stats.n).toBe(3);
        // Mean of 3 outcome credits = (0.9 + 0.5 + 0.05) / 3 ≈ 0.4833
        expect(stats.ema).toBeCloseTo(0.4833, 3);
      }
    }
  });

  it("computeFromDatums penalizes failed (ok=false) models with credit=0", () => {
    const datums = [
      makeDatum({
        models: [
          { model: "m1", vendor: "ok_vendor", ok: true, in_consensus_voters: true },
          { model: "m2", vendor: "fail_vendor", ok: false, in_consensus_voters: true },
        ],
      }),
    ];
    const state = engine.computeFromDatums(datums);
    expect(state.vendors.ok_vendor.tasks.decide.ema).toBe(1.0);
    expect(state.vendors.fail_vendor.tasks.decide.ema).toBe(0);
    expect(state.vendors.fail_vendor.tasks.decide.n).toBe(1);
  });

  it("computeFromDatums non-voters get half credit (voter_bonus=0.5)", () => {
    const datums = [
      makeDatum({
        models: [
          { model: "voter", vendor: "v_voter", in_consensus_voters: true },
          { model: "dissenter", vendor: "v_dissenter", in_consensus_voters: false },
        ],
      }),
    ];
    const state = engine.computeFromDatums(datums);
    expect(state.vendors.v_voter.tasks.decide.ema).toBe(1.0);
    expect(state.vendors.v_dissenter.tasks.decide.ema).toBe(0.5);
  });

  // ---- adversarial / failure modes ----

  it("computeFromDatums silently skips datums with empty models array", () => {
    const datums = [makeDatum(), makeDatum({ models: [] })];
    const state = engine.computeFromDatums(datums);
    // Only the first datum contributes (its 2 default models).
    expect(state.vendors.anthropic.tasks.decide.n).toBe(1);
    expect(state.vendors.openai.tasks.decide.n).toBe(1);
    // Confirm no spurious vendor key from the empty-models datum
    expect(Object.keys(state.vendors).sort()).toEqual(["anthropic", "openai"]);
  });

  it("computeFromDatums tolerates malformed datums in the array", () => {
    // Use unknown[] to express the adversarial mix without double-casts.
    const datums: unknown[] = [
      null,
      makeDatum({ reward: 1.0 }),
      { models: "not an array" },
      makeDatum({ reward: 0.0 }),
    ];
    const state = engine.computeFromDatums(datums as NeuralFeedDatum[]);
    expect(state.vendors.anthropic.tasks.decide.n).toBe(2);
    // Mean = (1.0 + 0.0) / 2 = 0.5
    expect(state.vendors.anthropic.tasks.decide.ema).toBe(0.5);
  });

  it("computeFromDatums uses 'untagged' bucket when task_type is empty string", () => {
    const datums = [makeDatum({ task_type: "" })];
    const state = engine.computeFromDatums(datums);
    expect(state.vendors.anthropic.tasks.untagged.n).toBe(1);
    expect(state.vendors.anthropic.tasks.untagged.ema).toBe(1.0);
  });

  // ---- warmstart full flow ----

  it("warmstart on missing feed returns ok=true with empty state and no write", () => {
    const out = engine.warmstart({ feedPath, perfStatePath: perfPath });
    expect(out.ok).toBe(true);
    expect(out.feedLines).toBe(0);
    expect(Object.keys(out.state.vendors)).toEqual([]);
    expect(out.persisted).toBe(false);
    expect(fs.existsSync(perfPath)).toBe(false);
  });

  it("warmstart computes baseline from real JSONL and persists", () => {
    fs.writeFileSync(
      feedPath,
      [
        makeDatum({ ts: "2026-05-05T15:00:00.000Z", reward: 1.0 }),
        makeDatum({ ts: "2026-05-05T15:01:00.000Z", reward: 0.5 }),
      ].map((d) => JSON.stringify(d)).join("\n") + "\n",
    );
    const out = engine.warmstart({ feedPath, perfStatePath: perfPath });
    expect(out.ok).toBe(true);
    expect(out.feedLines).toBe(2);
    expect(out.skippedLines).toBe(0);
    expect(out.persisted).toBe(true);
    expect(fs.existsSync(perfPath)).toBe(true);
    // Persisted state matches in-memory state.
    const reloaded = perfEngine.loadState(perfPath);
    expect(reloaded.vendors.anthropic.tasks.decide.n).toBe(2);
    // Mean = (1.0 + 0.5) / 2 = 0.75
    expect(reloaded.vendors.anthropic.tasks.decide.ema).toBe(0.75);
    // Telemetry summary populated
    expect(out.perVendorTask.anthropic.decide.observations).toBe(2);
    expect(out.perVendorTask.anthropic.decide.meanCredit).toBe(0.75);
  });

  it("warmstart with persist=false returns state without writing", () => {
    fs.writeFileSync(feedPath, JSON.stringify(makeDatum()) + "\n");
    const out = engine.warmstart({ feedPath, perfStatePath: perfPath, persist: false });
    expect(out.ok).toBe(true);
    expect(out.persisted).toBe(false);
    expect(fs.existsSync(perfPath)).toBe(false);
    // State still computed in-memory
    expect(out.state.vendors.anthropic.tasks.decide.n).toBe(1);
  });

  it("warmstart skips malformed JSON lines and counts them in skippedLines", () => {
    fs.writeFileSync(
      feedPath,
      JSON.stringify(makeDatum()) + "\n" +
        "{garbage\n" +
        JSON.stringify(makeDatum({ ts: "2026-05-05T16:00:00.000Z" })) + "\n" +
        '{"models":"not array"}' + "\n",
    );
    const out = engine.warmstart({ feedPath, perfStatePath: perfPath });
    expect(out.feedLines).toBe(4);
    expect(out.skippedLines).toBe(2);
    expect(out.state.vendors.anthropic.tasks.decide.n).toBe(2);
  });

  // ---- merge-with-existing ----

  it("warmstart with mergeWithExisting=true preserves real EMA history and only fills gaps", () => {
    // Seed existing state with real history.
    const existing: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: {
        anthropic: { tasks: { decide: { ema: 0.95, n: 50, lastUpdated: "2026-05-04T00:00:00.000Z" } } },
      },
    };
    perfEngine.saveState(existing, perfPath);

    // Feed only contains data for openai (a gap in existing state).
    fs.writeFileSync(
      feedPath,
      JSON.stringify(makeDatum({
        models: [{ model: "m", vendor: "openai", in_consensus_voters: true }],
      })) + "\n",
    );
    const out = engine.warmstart({
      feedPath, perfStatePath: perfPath, mergeWithExisting: true,
    });
    expect(out.ok).toBe(true);
    expect(out.merged).toBe(true);
    // anthropic preserved
    expect(out.state.vendors.anthropic.tasks.decide.ema).toBe(0.95);
    expect(out.state.vendors.anthropic.tasks.decide.n).toBe(50);
    // openai filled from baseline
    expect(out.state.vendors.openai.tasks.decide.n).toBe(1);
    expect(out.state.vendors.openai.tasks.decide.ema).toBe(1.0);
    // Both vendors present in final state
    expect(Object.keys(out.state.vendors).sort()).toEqual(["anthropic", "openai"]);
  });

  it("warmstart without merge replaces existing state entirely", () => {
    const existing: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: {
        anthropic: { tasks: { decide: { ema: 0.95, n: 50 } } },
      },
    };
    perfEngine.saveState(existing, perfPath);
    fs.writeFileSync(
      feedPath,
      JSON.stringify(makeDatum({
        reward: 0.4,
        models: [{ model: "m", vendor: "openai", in_consensus_voters: true }],
      })) + "\n",
    );
    const out = engine.warmstart({ feedPath, perfStatePath: perfPath });
    expect(out.merged).toBe(false);
    // anthropic gone (not in feed); only openai remains
    expect(Object.keys(out.state.vendors)).toEqual(["openai"]);
    expect(out.state.vendors.openai.tasks.decide.ema).toBe(0.4);
  });

  // ---- merge() pure function ----

  it("merge preserves existing entries with n>0 and fills baseline-only entries", () => {
    const existing: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: {
        anthropic: { tasks: { decide: { ema: 0.85, n: 10 }, plan: { ema: 0.0, n: 0 } } },
      },
    };
    const baseline: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: {
        anthropic: { tasks: { decide: { ema: 0.5, n: 5 }, plan: { ema: 0.7, n: 3 } } },
        openai: { tasks: { decide: { ema: 0.6, n: 4 } } },
      },
    };
    const out = engine.merge(existing, baseline);
    // existing wins where n>0
    expect(out.vendors.anthropic.tasks.decide.ema).toBe(0.85);
    expect(out.vendors.anthropic.tasks.decide.n).toBe(10);
    // baseline wins where existing has n=0
    expect(out.vendors.anthropic.tasks.plan.ema).toBe(0.7);
    expect(out.vendors.anthropic.tasks.plan.n).toBe(3);
    // baseline-only vendor included
    expect(out.vendors.openai.tasks.decide.n).toBe(4);
    expect(out.vendors.openai.tasks.decide.ema).toBe(0.6);
  });

  it("merge does not mutate either input (purity check)", () => {
    const existing: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: { a: { tasks: { t: { ema: 0.9, n: 10 } } } },
    };
    const baseline: PerformanceState = {
      schemaVersion: "1.0.0",
      vendors: { b: { tasks: { t: { ema: 0.5, n: 1 } } } },
    };
    const existingSnapshot = JSON.stringify(existing);
    const baselineSnapshot = JSON.stringify(baseline);
    engine.merge(existing, baseline);
    expect(JSON.stringify(existing)).toBe(existingSnapshot);
    expect(JSON.stringify(baseline)).toBe(baselineSnapshot);
  });
});
