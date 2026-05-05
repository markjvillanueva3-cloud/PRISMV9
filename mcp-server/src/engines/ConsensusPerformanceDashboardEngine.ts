/**
 * ConsensusPerformanceDashboardEngine — read-only analytics over the
 * multi-model consensus learning state.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CONSENSUS-DASHBOARD.
 *
 * Why this exists
 * ---------------
 * U-NEURAL-CREDIT-ASSIGN closed the learning loop (consensus runs now
 * update vendor EMAs). U-CREDIT-DISPATCHER exposed the engine as
 * dispatcher actions for backfill + status. But "status" only returns
 * raw cursor + perf state — answering "are my vendors calibrated for
 * task X?" requires manual JSON spelunking.
 *
 * This engine produces a structured dashboard view that answers:
 *
 *   - Which vendors are best per task type (top-K by EMA)
 *   - Where are the cold-start gaps (vendor × task_type with n=0)
 *   - What's the recent reward trend (rolling window from feed)
 *   - Which probes should I run next to fill the most painful gaps
 *
 * Read-only. No mutation, no I/O beyond loading existing state +
 * tail-reading the feed. Safe to call from any context — including hot
 * paths that just want a quick "do I have data for this vendor?"
 * answer.
 *
 * Pure where possible. The internals (sortVendors, gapDetect,
 * suggestProbes) are pure functions over the loaded state — testable
 * without any filesystem.
 *
 * @module engines/ConsensusPerformanceDashboardEngine
 */

import * as fs from "node:fs";
import {
  ConsensusModelPerformanceEngine,
  consensusModelPerformanceEngine,
  type PerformanceState,
  type VendorTaskStats,
} from "./ConsensusModelPerformanceEngine.js";
import type { NeuralFeedDatum } from "./ConsensusNeuralFeedbackEngine.js";

const DEFAULT_PERF_STATE_PATH =
  "H:/prism/mcp-server/data/state/consensus-model-performance.json";
const DEFAULT_FEED_PATH =
  process.env.CONSENSUS_NEURAL_FEED ?? "H:/prism/state/shared/CONSENSUS_NEURAL_FEED.jsonl";

const DEFAULT_TOP_K = 5;
const DEFAULT_TREND_WINDOW = 100;
const SPARSE_N_THRESHOLD = 3;

/**
 * Default vendor pool — what consensus is expected to fan out to.
 * Override via opts for environment-specific configurations.
 */
const DEFAULT_VENDORS = ["anthropic", "openai", "google", "ollama", "xai"] as const;

/**
 * Default task-type pool — what consensus is expected to be asked about.
 * Mirrors AIBridge's AITaskType union.
 */
const DEFAULT_TASK_TYPES = ["plan", "build", "review", "decide", "explain", "extract", "validate"] as const;

export interface VendorRanking {
  vendor: string;
  ema: number;
  n: number;
  lastUpdated: string | null;
  /** rank 1 = best EMA. Tied EMAs share rank. */
  rank: number;
}

export interface TaskCoverage {
  covered: string[];
  missing: string[];
  sparse: string[]; // covered but n < SPARSE_N_THRESHOLD
}

export interface PerTaskTypeView {
  taskType: string;
  vendors: VendorRanking[];
  totalObservations: number;
  coverage: TaskCoverage;
}

export interface ColdStartCombo {
  vendor: string;
  taskType: string;
  reason: "missing" | "sparse" | "stale";
  /** Days since last update (only set for "stale"). */
  ageDays?: number;
  /** Current observation count (only set for "sparse"). */
  n?: number;
}

export interface SuggestedProbe {
  vendor: string;
  taskType: string;
  reason: ColdStartCombo["reason"];
  /** Higher priority = more painful gap. 1.0 = brand new combo, 0 = well-calibrated. */
  priority: number;
}

export interface FeedTrend {
  feedLines: number;
  scannedLines: number;
  recentRewards: {
    count: number;
    mean: number;
    p50: number;
    p90: number;
  } | null;
  rewardByTaskType: Record<string, { mean: number; n: number }>;
}

export interface DashboardOpts {
  perfStatePath?: string;
  feedPath?: string;
  expectedVendors?: readonly string[];
  expectedTaskTypes?: readonly string[];
  topK?: number;
  /** Tail window for trend (lines from end of feed). */
  trendWindow?: number;
  /** Days after which an EMA observation is considered "stale". 0 disables stale detection. */
  staleAfterDays?: number;
}

export interface Dashboard {
  generatedAt: string;
  perfStatePath: string;
  feedPath: string;
  perTaskType: Record<string, PerTaskTypeView>;
  overall: {
    totalVendors: number;
    totalTaskTypes: number;
    totalObservations: number;
    coldStartCombos: ColdStartCombo[];
    coverage: { fullyCovered: number; partial: number; uncovered: number };
  };
  trend: FeedTrend;
  suggestedProbes: SuggestedProbe[];
}

const SCHEMA_VERSION = "1.0.0";

const DAY_MS = 24 * 60 * 60 * 1000;

export class ConsensusPerformanceDashboardEngine {
  private readonly perfEngine: ConsensusModelPerformanceEngine;

  constructor(perfEngine: ConsensusModelPerformanceEngine = consensusModelPerformanceEngine) {
    this.perfEngine = perfEngine;
  }

  /**
   * Compute the full dashboard view. Default opts produce a
   * 5-vendor × 7-task-type matrix, top-5 ranking per task, and a
   * 100-line rolling trend window.
   */
  compute(opts: DashboardOpts = {}): Dashboard {
    const perfStatePath = opts.perfStatePath ?? DEFAULT_PERF_STATE_PATH;
    const feedPath = opts.feedPath ?? DEFAULT_FEED_PATH;
    const expectedVendors = opts.expectedVendors ?? DEFAULT_VENDORS;
    const expectedTaskTypes = opts.expectedTaskTypes ?? DEFAULT_TASK_TYPES;
    const topK = opts.topK ?? DEFAULT_TOP_K;
    const trendWindow = opts.trendWindow ?? DEFAULT_TREND_WINDOW;
    const staleAfterDays = opts.staleAfterDays ?? 0;

    const state = this.perfEngine.loadState(perfStatePath);
    const trend = this.computeTrend(feedPath, trendWindow);

    const perTaskType: Record<string, PerTaskTypeView> = {};
    let totalObservations = 0;
    let fullyCovered = 0;
    let partial = 0;
    let uncovered = 0;
    const coldStartCombos: ColdStartCombo[] = [];

    for (const taskType of expectedTaskTypes) {
      const view = this.computeForTaskType(taskType, state, {
        expectedVendors,
        topK,
        staleAfterDays,
      });
      perTaskType[taskType] = view;
      totalObservations += view.totalObservations;

      // Bucket coverage: full = no missing AND no sparse, partial = some
      // missing or sparse, uncovered = all missing.
      if (view.coverage.missing.length === expectedVendors.length) {
        uncovered++;
      } else if (view.coverage.missing.length === 0 && view.coverage.sparse.length === 0) {
        fullyCovered++;
      } else {
        partial++;
      }

      // Accumulate combos.
      for (const v of view.coverage.missing) {
        coldStartCombos.push({ vendor: v, taskType, reason: "missing" });
      }
      for (const v of view.coverage.sparse) {
        const stats = state.vendors[v]?.tasks?.[taskType];
        coldStartCombos.push({ vendor: v, taskType, reason: "sparse", n: stats?.n ?? 0 });
      }
      // Stale detection: only if staleAfterDays > 0
      if (staleAfterDays > 0) {
        for (const ranked of view.vendors) {
          if (ranked.lastUpdated == null) continue;
          const ageDays = (Date.now() - new Date(ranked.lastUpdated).getTime()) / DAY_MS;
          if (Number.isFinite(ageDays) && ageDays > staleAfterDays) {
            coldStartCombos.push({
              vendor: ranked.vendor,
              taskType,
              reason: "stale",
              ageDays: Number(ageDays.toFixed(1)),
            });
          }
        }
      }
    }

    return {
      generatedAt: new Date().toISOString(),
      perfStatePath,
      feedPath,
      perTaskType,
      overall: {
        totalVendors: expectedVendors.length,
        totalTaskTypes: expectedTaskTypes.length,
        totalObservations,
        coldStartCombos,
        coverage: { fullyCovered, partial, uncovered },
      },
      trend,
      suggestedProbes: this.suggestProbes(coldStartCombos, expectedVendors.length),
    };
  }

  /**
   * Compute view for a single task type. Used internally by compute(),
   * also exposed publicly for callers who only care about one task.
   */
  computeForTaskType(
    taskType: string,
    state?: PerformanceState,
    opts: { expectedVendors?: readonly string[]; topK?: number; staleAfterDays?: number } = {},
  ): PerTaskTypeView {
    const s = state ?? this.perfEngine.loadState();
    const expectedVendors = opts.expectedVendors ?? DEFAULT_VENDORS;
    const topK = opts.topK ?? DEFAULT_TOP_K;

    const ranked: VendorRanking[] = [];
    const covered: string[] = [];
    const missing: string[] = [];
    const sparse: string[] = [];
    let totalObs = 0;

    const scored: Array<VendorRanking> = [];
    for (const vendor of expectedVendors) {
      const stats = s.vendors?.[vendor]?.tasks?.[taskType];
      if (!stats || !Number.isFinite(stats.ema) || stats.n === 0) {
        missing.push(vendor);
        continue;
      }
      covered.push(vendor);
      totalObs += stats.n;
      if (stats.n < SPARSE_N_THRESHOLD) sparse.push(vendor);
      scored.push({
        vendor,
        ema: Number(stats.ema.toFixed(6)),
        n: stats.n,
        lastUpdated: stats.lastUpdated ?? null,
        rank: 0, // assigned below
      });
    }

    // Sort by EMA desc, stable within ties.
    scored.sort((a, b) => b.ema - a.ema);
    let prevEma = Number.NaN;
    let curRank = 0;
    let assigned = 0;
    for (const v of scored) {
      assigned++;
      if (v.ema !== prevEma) {
        curRank = assigned;
        prevEma = v.ema;
      }
      ranked.push({ ...v, rank: curRank });
    }

    return {
      taskType,
      vendors: ranked.slice(0, topK),
      totalObservations: totalObs,
      coverage: { covered, missing, sparse },
    };
  }

  /**
   * Tail-read the feed and compute trend stats. Pure I/O bookkeeping —
   * cold-start safe (returns zeroed trend if feed missing).
   */
  computeTrend(feedPath?: string, trendWindow: number = DEFAULT_TREND_WINDOW): FeedTrend {
    const target = feedPath ?? DEFAULT_FEED_PATH;
    const empty: FeedTrend = {
      feedLines: 0,
      scannedLines: 0,
      recentRewards: null,
      rewardByTaskType: {},
    };
    if (!fs.existsSync(target)) return empty;

    let raw: string;
    try {
      raw = fs.readFileSync(target, "utf-8");
    } catch {
      return empty;
    }
    const lines = raw.split("\n").filter((l) => l.length > 0);
    const totalLines = lines.length;
    const tail = trendWindow > 0 ? lines.slice(-trendWindow) : lines;

    const rewards: number[] = [];
    const byTask: Record<string, { sum: number; n: number }> = {};

    for (const line of tail) {
      let datum: NeuralFeedDatum;
      try {
        datum = JSON.parse(line);
      } catch {
        continue;
      }
      if (typeof datum.reward !== "number" || !Number.isFinite(datum.reward)) continue;
      rewards.push(datum.reward);
      const t = typeof datum.task_type === "string" ? datum.task_type : "untagged";
      const bucket = byTask[t] ?? { sum: 0, n: 0 };
      bucket.sum += datum.reward;
      bucket.n++;
      byTask[t] = bucket;
    }

    const rewardByTaskType: Record<string, { mean: number; n: number }> = {};
    for (const [t, b] of Object.entries(byTask)) {
      rewardByTaskType[t] = {
        mean: Number((b.sum / b.n).toFixed(4)),
        n: b.n,
      };
    }

    let recentRewards: FeedTrend["recentRewards"] = null;
    if (rewards.length > 0) {
      const sorted = rewards.slice().sort((a, b) => a - b);
      const mean = rewards.reduce((a, b) => a + b, 0) / rewards.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)] ?? sorted[sorted.length - 1];
      const p90idx = Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9));
      const p90 = sorted[p90idx];
      recentRewards = {
        count: rewards.length,
        mean: Number(mean.toFixed(4)),
        p50: Number(p50.toFixed(4)),
        p90: Number(p90.toFixed(4)),
      };
    }

    return {
      feedLines: totalLines,
      scannedLines: tail.length,
      recentRewards,
      rewardByTaskType,
    };
  }

  /**
   * Pure: rank cold-start combos by priority.
   *
   * Priority: missing > sparse > stale, then by lex order for stability.
   * `priority` is a [0,1] score: 1.0 = brand-new combo (most painful),
   * tapering for sparse (some signal), and stale (had signal but old).
   */
  suggestProbes(combos: readonly ColdStartCombo[], totalVendors: number): SuggestedProbe[] {
    const totalSlots = Math.max(1, totalVendors);
    const out: SuggestedProbe[] = combos.map((c) => {
      let priority = 0;
      if (c.reason === "missing") {
        priority = 1.0;
      } else if (c.reason === "sparse") {
        // priority decays from ~0.7 (n=1) toward ~0.4 (n=SPARSE_N_THRESHOLD-1)
        const n = c.n ?? 0;
        priority = 0.7 - 0.1 * Math.min(SPARSE_N_THRESHOLD, n);
      } else if (c.reason === "stale") {
        priority = 0.3;
      }
      return {
        vendor: c.vendor,
        taskType: c.taskType,
        reason: c.reason,
        priority: Number(priority.toFixed(3)),
      };
    });

    out.sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      if (a.taskType !== b.taskType) return a.taskType < b.taskType ? -1 : 1;
      return a.vendor < b.vendor ? -1 : 1;
    });

    // Cap output to keep dashboard payloads bounded.
    const cap = totalSlots * DEFAULT_TASK_TYPES.length;
    return out.slice(0, cap);
  }

  /** Schema version for the dashboard payload. */
  schemaVersion(): string {
    return SCHEMA_VERSION;
  }
}

export const consensusPerformanceDashboardEngine = new ConsensusPerformanceDashboardEngine();
