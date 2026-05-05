/**
 * ConsensusBaselineWarmstartEngine — bootstrap a fresh perf state from
 * the JSONL training feed using unweighted-mean credit per (vendor,
 * task_type), so a brand-new deployment starts warm instead of cold.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-PERF-WEIGHTS-WARMSTART.
 *
 * Why this exists
 * ---------------
 * `applyFromFeed` (in ConsensusNeuralCreditAssignmentEngine) advances
 * an alpha-blended EMA chain — recent observations weight more, and
 * the result depends on the order in which lines were appended. That's
 * the right behavior for ongoing operation: a vendor's recent failures
 * should outweigh stale successes.
 *
 * It is the WRONG behavior for cold-start bootstrapping. When you've
 * just lost `consensus-model-performance.json` and need to reconstruct
 * a baseline from history, you want every observation weighted equally.
 * Otherwise older runs (which the EMA chain effectively ignores) waste
 * away even though they carry just as much ground-truth signal.
 *
 * This engine computes an UNWEIGHTED mean credit per (vendor, task_type)
 * across all valid datums in the feed, then writes a perf state where
 *   ema = mean(credits), n = count(observations)
 *
 * Two modes:
 *   - persist=true (default): writes the baseline to disk
 *   - persist=false: returns the state without writing (probe / preview)
 *
 * Two merge modes:
 *   - mergeWithExisting=false (default): replaces any existing state
 *   - mergeWithExisting=true: preserves existing (vendor, task_type)
 *     EMAs that already have observations (n > 0) — only fills gaps.
 *     Useful when you want to backfill cold-start combos without
 *     clobbering vendors that already have real EMA history.
 *
 * Credit math reuses ConsensusNeuralCreditAssignmentEngine
 * .computeCreditFromDatum() so the formula stays consistent across
 * the three apply paths (online from result, online from datum batch,
 * baseline warmstart). One source of truth, one set of tests pin it.
 *
 * @module engines/ConsensusBaselineWarmstartEngine
 */

import * as fs from "node:fs";
import {
  ConsensusModelPerformanceEngine,
  consensusModelPerformanceEngine,
  type PerformanceState,
  type VendorTaskStats,
} from "./ConsensusModelPerformanceEngine.js";
import {
  ConsensusNeuralCreditAssignmentEngine,
  consensusNeuralCreditAssignmentEngine,
} from "./ConsensusNeuralCreditAssignmentEngine.js";
import type { NeuralFeedDatum } from "./ConsensusNeuralFeedbackEngine.js";

const SCHEMA_VERSION = "1.0.0";

const DEFAULT_FEED_PATH =
  process.env.CONSENSUS_NEURAL_FEED ?? "H:/prism/state/shared/CONSENSUS_NEURAL_FEED.jsonl";

const DEFAULT_PERF_STATE_PATH =
  "H:/prism/mcp-server/data/state/consensus-model-performance.json";

/** Per-(vendor, taskType) accumulator used during warmstart aggregation. */
interface CreditAccumulator {
  sum: number;
  n: number;
  /** Most recent feed timestamp seen for this combo, ISO-8601. */
  lastTs: string | null;
}

export interface WarmstartInput {
  feedPath?: string;
  perfStatePath?: string;
  /** If false, computes state but does not write. Default true. */
  persist?: boolean;
  /** If true, preserve existing observations and only fill gaps. Default false. */
  mergeWithExisting?: boolean;
}

export interface PerVendorTaskCount {
  observations: number;
  meanCredit: number;
}

export interface WarmstartResult {
  ok: boolean;
  feedPath: string;
  perfStatePath: string;
  feedLines: number;
  skippedLines: number;
  state: PerformanceState;
  /** vendor → taskType → { observations, meanCredit } summary for telemetry. */
  perVendorTask: Record<string, Record<string, PerVendorTaskCount>>;
  persisted: boolean;
  merged: boolean;
  error: string | null;
}

export class ConsensusBaselineWarmstartEngine {
  private readonly perfEngine: ConsensusModelPerformanceEngine;
  private readonly creditEngine: ConsensusNeuralCreditAssignmentEngine;

  constructor(
    perfEngine: ConsensusModelPerformanceEngine = consensusModelPerformanceEngine,
    creditEngine: ConsensusNeuralCreditAssignmentEngine = consensusNeuralCreditAssignmentEngine,
  ) {
    this.perfEngine = perfEngine;
    this.creditEngine = creditEngine;
  }

  /**
   * Pure: compute a baseline PerformanceState from a list of feed
   * datums. Unweighted mean credit per (vendor, task_type). No I/O.
   *
   * Datums with empty models, missing task_type, or otherwise
   * unparseable structure are silently skipped — fail-open, matches
   * the rest of the consensus pipeline's behavior.
   */
  computeFromDatums(datums: readonly NeuralFeedDatum[]): PerformanceState {
    const acc: Record<string, Record<string, CreditAccumulator>> = {};
    for (const datum of datums) {
      if (!datum || !Array.isArray(datum.models) || typeof datum.task_type !== "string") {
        continue;
      }
      const taskType = datum.task_type || "untagged";
      const credits = this.creditEngine.computeCreditFromDatum(datum);
      for (const c of credits) {
        const vendorAcc = (acc[c.vendor] ??= {});
        const cell = (vendorAcc[taskType] ??= { sum: 0, n: 0, lastTs: null });
        cell.sum += c.credit;
        cell.n++;
        if (typeof datum.ts === "string") {
          // Track latest timestamp for stats.lastUpdated.
          if (cell.lastTs === null || datum.ts > cell.lastTs) {
            cell.lastTs = datum.ts;
          }
        }
      }
    }

    const state: PerformanceState = { schemaVersion: SCHEMA_VERSION, vendors: {} };
    for (const [vendor, byTask] of Object.entries(acc)) {
      const tasks: Record<string, VendorTaskStats> = {};
      for (const [taskType, cell] of Object.entries(byTask)) {
        if (cell.n === 0) continue;
        tasks[taskType] = {
          ema: Number((cell.sum / cell.n).toFixed(6)),
          n: cell.n,
          lastUpdated: cell.lastTs ?? new Date().toISOString(),
        };
      }
      if (Object.keys(tasks).length > 0) {
        state.vendors[vendor] = { tasks };
      }
    }
    return state;
  }

  /**
   * Read JSONL feed, compute baseline, optionally merge with existing,
   * optionally persist. The full warmstart flow.
   */
  warmstart(input: WarmstartInput = {}): WarmstartResult {
    const feedPath = input.feedPath ?? DEFAULT_FEED_PATH;
    const perfStatePath = input.perfStatePath ?? DEFAULT_PERF_STATE_PATH;
    const persist = input.persist !== false;
    const mergeWithExisting = input.mergeWithExisting === true;

    const empty: WarmstartResult = {
      ok: true,
      feedPath,
      perfStatePath,
      feedLines: 0,
      skippedLines: 0,
      state: this.perfEngine.empty(),
      perVendorTask: {},
      persisted: false,
      merged: false,
      error: null,
    };

    if (!fs.existsSync(feedPath)) {
      return empty;
    }

    let raw: string;
    try {
      raw = fs.readFileSync(feedPath, "utf-8");
    } catch (e) {
      return { ...empty, ok: false, error: (e as Error).message };
    }

    const lines = raw.split("\n").filter((l) => l.length > 0);
    const datums: NeuralFeedDatum[] = [];
    let skipped = 0;
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (!parsed || !Array.isArray(parsed.models) || typeof parsed.task_type !== "string") {
          skipped++;
          continue;
        }
        datums.push(parsed);
      } catch {
        skipped++;
      }
    }

    let baseline = this.computeFromDatums(datums);
    let merged = false;
    if (mergeWithExisting) {
      const existing = this.perfEngine.loadState(perfStatePath);
      baseline = this.merge(existing, baseline);
      merged = true;
    }

    let persisted = false;
    if (persist && (datums.length > 0 || mergeWithExisting)) {
      try {
        this.perfEngine.saveState(baseline, perfStatePath);
        persisted = true;
      } catch (e) {
        return {
          ok: false,
          feedPath,
          perfStatePath,
          feedLines: lines.length,
          skippedLines: skipped,
          state: baseline,
          perVendorTask: this.summarize(baseline),
          persisted: false,
          merged,
          error: (e as Error).message,
        };
      }
    }

    return {
      ok: true,
      feedPath,
      perfStatePath,
      feedLines: lines.length,
      skippedLines: skipped,
      state: baseline,
      perVendorTask: this.summarize(baseline),
      persisted,
      merged,
      error: null,
    };
  }

  /**
   * Merge an existing perf state with a freshly-computed baseline.
   * Existing (vendor, task_type) entries with n > 0 are preserved as-is.
   * Baseline-only entries (combos the existing state had no data for)
   * are added. Pure — does not mutate either input.
   */
  merge(existing: PerformanceState, baseline: PerformanceState): PerformanceState {
    const out: PerformanceState = {
      schemaVersion: existing.schemaVersion ?? SCHEMA_VERSION,
      vendors: {},
    };

    const allVendors = new Set<string>([
      ...Object.keys(existing.vendors ?? {}),
      ...Object.keys(baseline.vendors ?? {}),
    ]);

    for (const vendor of allVendors) {
      const existTasks = existing.vendors?.[vendor]?.tasks ?? {};
      const baseTasks = baseline.vendors?.[vendor]?.tasks ?? {};
      const tasks: Record<string, VendorTaskStats> = {};

      const allTasks = new Set<string>([
        ...Object.keys(existTasks),
        ...Object.keys(baseTasks),
      ]);

      for (const taskType of allTasks) {
        const e = existTasks[taskType];
        const b = baseTasks[taskType];
        if (e && typeof e.n === "number" && e.n > 0) {
          tasks[taskType] = e; // preserve real history
        } else if (b) {
          tasks[taskType] = b;
        }
      }

      if (Object.keys(tasks).length > 0) {
        out.vendors[vendor] = { tasks };
      }
    }

    return out;
  }

  /** Build the perVendorTask telemetry summary for a state. */
  private summarize(state: PerformanceState): Record<string, Record<string, PerVendorTaskCount>> {
    const out: Record<string, Record<string, PerVendorTaskCount>> = {};
    for (const [vendor, vstate] of Object.entries(state.vendors ?? {})) {
      const byTask: Record<string, PerVendorTaskCount> = {};
      for (const [taskType, stats] of Object.entries(vstate.tasks ?? {})) {
        byTask[taskType] = {
          observations: stats.n,
          meanCredit: Number(stats.ema.toFixed(6)),
        };
      }
      if (Object.keys(byTask).length > 0) out[vendor] = byTask;
    }
    return out;
  }
}

export const consensusBaselineWarmstartEngine = new ConsensusBaselineWarmstartEngine();
