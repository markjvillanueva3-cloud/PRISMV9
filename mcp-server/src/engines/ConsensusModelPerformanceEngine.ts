/**
 * ConsensusModelPerformanceEngine — performance-weighted vendor selection
 * for the multi-model consensus pool.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / U-CODEX-COORD-FIX (restore).
 *
 * Why this exists
 * ---------------
 * MultiModelConsensusEngine accepts an opt-in `usePerformanceWeights` flag.
 * When enabled, it down-selects the vendor pool based on each vendor's
 * historical reward EMA on the current task_type. This lets the pool drop
 * vendors that have empirically been unhelpful for similar prompts (saving
 * tokens + latency) while preserving a floor of vendors so consensus never
 * collapses to a single voice.
 *
 * State shape
 * -----------
 * State JSON is a per-vendor reward EMA keyed by `taskType`. Schema:
 *
 *   {
 *     "schemaVersion": "1.0.0",
 *     "vendors": {
 *       "anthropic": { "tasks": { "build": { ema: 0.84, n: 12 }, ... } },
 *       "openai":    { "tasks": { ... } },
 *       ...
 *     }
 *   }
 *
 * Missing vendors / tasks default to ema=0.5 (no signal yet) so cold-start
 * behavior is "include everyone, learn from outcomes".
 *
 * Fail-open: a missing or corrupt state file returns an empty default state.
 * The MultiModelConsensusEngine wraps this call in try/catch anyway.
 *
 * @module engines/ConsensusModelPerformanceEngine
 */

import * as fs from "node:fs";

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_STATE_PATH = "H:/prism/mcp-server/data/state/consensus-model-performance.json";
const COLD_START_EMA = 0.5;

export interface VendorTaskStats {
  ema: number;          // exponentially-weighted moving average of reward in [0, 1]
  n: number;            // number of observations
  lastUpdated?: string; // ISO timestamp of last update
}

export interface VendorState {
  tasks: Record<string, VendorTaskStats>;
}

export interface PerformanceState {
  schemaVersion: string;
  vendors: Record<string, VendorState>;
}

export interface RecommendOpts {
  /** Minimum vendors to keep in the pool. Default 2 — never collapse to single voice. */
  floor?: number;
  /** Reward EMA threshold below which a vendor is dropped (still respecting floor). Default 0.30. */
  dropThreshold?: number;
}

export interface RankedVendor {
  vendor: string;
  ema: number;
  n: number;
}

export interface RecommendResult {
  ranked: RankedVendor[];
  dropped: RankedVendor[];
  floor: number;
  taskType: string;
}

const DEFAULT_FLOOR = 2;
const DEFAULT_DROP_THRESHOLD = 0.30;

export class ConsensusModelPerformanceEngine {
  /**
   * Load state from disk. Fail-open — returns an empty default state if
   * the file is missing, unreadable, or malformed JSON.
   */
  loadState(filePath?: string | null): PerformanceState {
    const path = filePath ?? DEFAULT_STATE_PATH;
    try {
      if (!fs.existsSync(path)) return this.empty();
      const raw = fs.readFileSync(path, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return this.empty();
      const vendors = (parsed as PerformanceState).vendors;
      if (!vendors || typeof vendors !== "object") return this.empty();
      return {
        schemaVersion: typeof (parsed as PerformanceState).schemaVersion === "string"
          ? (parsed as PerformanceState).schemaVersion
          : SCHEMA_VERSION,
        vendors,
      };
    } catch {
      return this.empty();
    }
  }

  /**
   * Rank `available` vendors by their reward EMA for `taskType`, then drop
   * vendors below `dropThreshold` while preserving at least `floor` vendors.
   * Cold-start vendors (no observations) get ema=0.5 so they aren't dropped
   * before they have a chance to prove themselves.
   */
  recommendVendors(
    state: PerformanceState,
    taskType: string,
    available: readonly string[],
    opts: RecommendOpts = {},
  ): RecommendResult {
    const floor = Math.max(1, opts.floor ?? DEFAULT_FLOOR);
    const dropThreshold = opts.dropThreshold ?? DEFAULT_DROP_THRESHOLD;

    const scored: RankedVendor[] = available.map((vendor) => {
      const v = state.vendors?.[vendor];
      const t = v?.tasks?.[taskType];
      return {
        vendor,
        ema: typeof t?.ema === "number" && Number.isFinite(t.ema) ? t.ema : COLD_START_EMA,
        n: typeof t?.n === "number" && Number.isFinite(t.n) ? t.n : 0,
      };
    });

    scored.sort((a, b) => b.ema - a.ema);

    const ranked: RankedVendor[] = [];
    const dropped: RankedVendor[] = [];
    for (const v of scored) {
      if (ranked.length < floor) {
        ranked.push(v);
      } else if (v.ema >= dropThreshold) {
        ranked.push(v);
      } else {
        dropped.push(v);
      }
    }

    return { ranked, dropped, floor, taskType };
  }

  /**
   * Apply a single observation to the EMA. Pure: returns a NEW state, never
   * mutates the input. Smoothing factor alpha=0.2 by default — recent
   * observations meaningfully shift but don't dominate.
   */
  applyObservation(
    state: PerformanceState,
    vendor: string,
    taskType: string,
    reward: number,
    alpha = 0.2,
  ): PerformanceState {
    if (!Number.isFinite(reward) || reward < 0 || reward > 1) {
      throw new Error("reward must be a finite number in [0, 1]");
    }
    if (!Number.isFinite(alpha) || alpha <= 0 || alpha >= 1) {
      throw new Error("alpha must be in (0, 1)");
    }
    const next: PerformanceState = {
      schemaVersion: state.schemaVersion ?? SCHEMA_VERSION,
      vendors: { ...state.vendors },
    };
    const existing = next.vendors[vendor]?.tasks?.[taskType];
    const prevEma = existing?.ema ?? COLD_START_EMA;
    const prevN = existing?.n ?? 0;
    const newEma = prevN === 0 ? reward : alpha * reward + (1 - alpha) * prevEma;
    const newStats: VendorTaskStats = {
      ema: newEma,
      n: prevN + 1,
      lastUpdated: new Date().toISOString(),
    };
    next.vendors[vendor] = {
      tasks: { ...(next.vendors[vendor]?.tasks ?? {}), [taskType]: newStats },
    };
    return next;
  }

  /** Serialize state to disk via temp+rename for atomicity. */
  saveState(state: PerformanceState, filePath?: string | null): void {
    const path = filePath ?? DEFAULT_STATE_PATH;
    const dir = path.replace(/[/\\][^/\\]+$/, "");
    fs.mkdirSync(dir, { recursive: true });
    const tmp = `${path}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(state, null, 2) + "\n", "utf-8");
    try { fs.renameSync(tmp, path); }
    catch {
      try { fs.unlinkSync(path); } catch { /* ignore */ }
      fs.renameSync(tmp, path);
    }
  }

  empty(): PerformanceState {
    return { schemaVersion: SCHEMA_VERSION, vendors: {} };
  }
}

export const consensusModelPerformanceEngine = new ConsensusModelPerformanceEngine();
