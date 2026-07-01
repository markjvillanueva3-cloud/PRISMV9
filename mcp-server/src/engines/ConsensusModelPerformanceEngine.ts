// WIRE-EXEMPT: consumed exclusively by MultiModelConsensusEngine (the
//   wrapper engine, lines 222-227) — the consensus engine owns
//   loadState / recommendVendors / recordOutcome lifecycle. No user-facing
//   dispatcher action; the perf state is a private governance signal.
//   GRAPH-OCTOPUS-AUTOWIRE-MS0/U-GO-C6 ships the real implementation.
/**
 * ConsensusModelPerformanceEngine — tracks per-vendor reward EMAs per
 * taskType and recommends which vendors to use for a consensus run.
 *
 * GRAPH-OCTOPUS-AUTOWIRE-MS0 / U-GO-C6 (2026-05-22, slot echo).
 *
 * Replaces the CLEANUP-MS0/U-ENGINE-FOSSIL-2 stub. The stub threw to fail-
 * fast; MultiModelConsensusEngine wrapped the throw in try/catch and kept
 * every vendor — so consensus ran without perf-weighted vendor selection.
 * This real implementation:
 *
 *   1. loadState(path?) reads a JSON state file at the given (or default)
 *      path containing { vendors: { [vendor]: { [taskType]: {ema, n,
 *      lastUpdate} } } }. Missing file / invalid JSON → empty state (cold
 *      start). NEVER throws.
 *   2. recommendVendors(state, taskType, available, {floor}) ranks the
 *      available vendors by ema for the given taskType, keeps all with
 *      non-zero ema (or all of them on cold-start), and enforces a hard
 *      minimum of `floor` vendors so consensus can never collapse below
 *      that count. Returns { ranked: [{vendor,score}], rationale }.
 *
 * The CONSUMER at MultiModelConsensusEngine.ts:222-227 uses
 * `rec.ranked.map(r => r.vendor)` to determine which vendors to include in
 * the fan-out — so this is the active gate that the old stub broke.
 *
 * Karpathy discipline:
 *   CLASSIFY: deterministic vendor-selection engine
 *   TECHNIQUE: EMA lookup → score-sort → floor-clamped top-K keep
 *   EDGE CASES: missing file, invalid JSON, missing vendor entries, NaN
 *     ema, empty available[], floor>available, floor<=0, cold start (all
 *     ema=0), schema-versioned state
 *   FAILURE MODES: loadState fail-open → empty state; recommendVendors
 *     handles empty available + cold start + degenerate floor without
 *     throwing; the only failure path that propagates is a programmer
 *     error (non-array `available`) which is caught with a clear message
 *
 * @module engines/ConsensusModelPerformanceEngine
 */

import * as fs from "node:fs";

export interface VendorPerformance {
  /** Exponentially-weighted moving average of recent rewards in [0,1]. */
  ema: number;
  /** Number of observations contributing to the ema. */
  n: number;
  /** ISO timestamp of the last observation. */
  lastUpdate: string;
}

export interface ConsensusPerformanceState {
  schemaVersion: string;
  /** Per-vendor, per-taskType performance. */
  vendors: Record<string, Record<string, VendorPerformance>>;
}

export interface RankedVendor {
  vendor: string;
  /** EMA reward for this (vendor, taskType); 0 on cold start. */
  score: number;
}

export interface VendorRecommendation {
  /**
   * The vendors to KEEP for the consensus fan-out, sorted by descending
   * score. Consumer uses `ranked.map(r => r.vendor)` to filter the active
   * vendor set.
   */
  ranked: RankedVendor[];
  /** Human-readable explanation of the keep decision. */
  rationale: string;
}

export interface RecommendOpts {
  /** Hard minimum vendors to keep (default 2; consensus needs >=2 voices). */
  floor?: number;
}

const SCHEMA_VERSION = "1.0.0";
const DEFAULT_STATE_PATH = "H:/prism/state/shared/consensus-model-performance.json";
const DEFAULT_FLOOR = 2;

class ConsensusModelPerformanceEngineImpl {
  /**
   * Load per-vendor performance state from disk. Fail-open: any error
   * (missing file, invalid JSON, wrong shape) returns a fresh empty state
   * so consensus can always proceed.
   */
  loadState(filePath?: string): ConsensusPerformanceState {
    const path = typeof filePath === "string" && filePath.length > 0 ? filePath : DEFAULT_STATE_PATH;
    let raw: string;
    try {
      if (!fs.existsSync(path)) return emptyState();
      raw = fs.readFileSync(path, "utf-8");
    } catch {
      return emptyState();
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return emptyState();
    }
    if (parsed === null || typeof parsed !== "object") return emptyState();
    const vendors = (parsed as { vendors?: unknown }).vendors;
    if (vendors === null || typeof vendors !== "object" || Array.isArray(vendors)) return emptyState();
    return {
      schemaVersion: typeof (parsed as { schemaVersion?: unknown }).schemaVersion === "string"
        ? ((parsed as { schemaVersion: string }).schemaVersion)
        : SCHEMA_VERSION,
      vendors: vendors as Record<string, Record<string, VendorPerformance>>,
    };
  }

  /**
   * Recommend which vendors to include in a consensus fan-out for the
   * given taskType. Pure function (no I/O). Hard floor of `opts.floor`
   * vendors so consensus can never collapse to a single voice.
   */
  recommendVendors(
    state: ConsensusPerformanceState,
    taskType: unknown,
    available: readonly string[],
    opts?: RecommendOpts,
  ): VendorRecommendation {
    if (!Array.isArray(available)) {
      return { ranked: [], rationale: "no available vendors (input not an array)" };
    }
    const safeAvailable = available.filter((v) => typeof v === "string" && v.length > 0);
    if (safeAvailable.length === 0) {
      return { ranked: [], rationale: "no available vendors" };
    }

    const requestedFloor = opts?.floor;
    const floor = Number.isFinite(requestedFloor) && (requestedFloor as number) >= 1
      ? Math.min(Math.floor(requestedFloor as number), safeAvailable.length)
      : Math.min(DEFAULT_FLOOR, safeAvailable.length);

    const taskKey = typeof taskType === "string" && taskType.length > 0 ? taskType : "auto";
    const safeVendors = (state !== null && typeof state === "object" && state.vendors !== null && typeof state.vendors === "object")
      ? state.vendors
      : {};

    const scored: RankedVendor[] = safeAvailable.map((vendor) => {
      const perf = safeVendors[vendor]?.[taskKey];
      const ema = (perf !== null && perf !== undefined && Number.isFinite(perf.ema)) ? perf.ema : 0;
      return { vendor, score: ema };
    });
    // Sort by score descending; ties broken by stable insertion order (vendor name).
    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.vendor.localeCompare(b.vendor);
    });

    const nonZero = scored.filter((s) => s.score > 0);
    let keep: RankedVendor[];
    let rationale: string;
    if (nonZero.length === 0) {
      // Cold start — no observations yet; keep everyone so we accumulate
      // data on every taskType.
      keep = scored;
      rationale = `cold start (no ema data for taskType="${taskKey}"); keeping all ${keep.length} vendors`;
    } else if (nonZero.length >= floor) {
      // We have signal — keep only the vendors with non-zero ema.
      keep = nonZero;
      rationale = `kept ${keep.length} vendors with non-zero ema for taskType="${taskKey}" (floor=${floor})`;
    } else {
      // Some signal, but less than floor — extend by including zero-ema
      // vendors in sort order to reach floor.
      keep = scored.slice(0, floor);
      rationale = `floor=${floor} > nonZero=${nonZero.length} for taskType="${taskKey}"; padded keep set to floor`;
    }

    return { ranked: keep, rationale };
  }

  /**
   * Update the EMA for one (vendor, taskType) observation. Pure — returns
   * a new state, does not mutate. Caller persists via writeState/JSON.
   * Alpha is the standard EMA smoothing factor in (0,1].
   */
  recordOutcome(
    state: ConsensusPerformanceState,
    vendor: string,
    taskType: string,
    reward: number,
    alpha: number = 0.2,
  ): ConsensusPerformanceState {
    if (typeof vendor !== "string" || vendor.length === 0) return state;
    if (typeof taskType !== "string" || taskType.length === 0) return state;
    if (!Number.isFinite(reward)) return state;
    const safeAlpha = Number.isFinite(alpha) && alpha > 0 && alpha <= 1 ? alpha : 0.2;
    const clampedReward = Math.max(0, Math.min(1, reward));
    const prev = state.vendors[vendor]?.[taskType];
    const newEma = prev !== undefined
      ? prev.ema + safeAlpha * (clampedReward - prev.ema)
      : clampedReward;
    const newN = (prev?.n ?? 0) + 1;
    return {
      schemaVersion: state.schemaVersion,
      vendors: {
        ...state.vendors,
        [vendor]: {
          ...(state.vendors[vendor] ?? {}),
          [taskType]: {
            ema: newEma,
            n: newN,
            lastUpdate: new Date().toISOString(),
          },
        },
      },
    };
  }

  /**
   * Persist state to disk atomically (tmp + rename). The WRITE counterpart to
   * loadState -- without it, recordOutcome's returned state could never be
   * durably recorded, so the vendor-performance learning loop stayed frozen
   * (recommendVendors always read a never-updated file). Fail-SOFT: returns
   * {ok:false,error} on any I/O error and NEVER throws, mirroring loadState's
   * fail-open contract -- a failed perf write must never break consensus delivery.
   */
  saveState(state: ConsensusPerformanceState, filePath?: string): { ok: boolean; path: string; error?: string } {
    const path = typeof filePath === "string" && filePath.length > 0 ? filePath : DEFAULT_STATE_PATH;
    const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
    try {
      fs.writeFileSync(tmp, JSON.stringify(state, null, 2), "utf-8");
      fs.renameSync(tmp, path);
      return { ok: true, path };
    } catch (e) {
      // Clean up the tmp if write succeeded but rename failed (mirrors the
      // canonical atomic-write pattern in AtomicClaimBrokerEngine) -- otherwise a
      // rename failure leaks an orphan .tmp file. Best-effort; never throws.
      try { fs.unlinkSync(tmp); } catch { /* tmp may not exist if writeFileSync failed */ }
      return { ok: false, path, error: e instanceof Error ? e.message : String(e) };
    }
  }

  /**
   * Closure convenience: load -> recordOutcome -> save, in one fail-soft call.
   * This is the single API the consensus OWNER (MultiModelConsensusEngine) calls
   * to feed an actual reward back per (vendor, taskType) after a round, closing
   * the vendor-performance loop that recommendVendors reads. Keeps the engine
   * WIRE-EXEMPT (a private in-process governance signal, NOT a user-facing
   * dispatcher action). Returns the updated VendorPerformance + the persist receipt.
   */
  recordOutcomeAndPersist(
    vendor: string,
    taskType: string,
    reward: number,
    opts: { filePath?: string; alpha?: number } = {},
  ): { ok: boolean; vendor: string; taskType: string; performance: VendorPerformance | null; path: string; error?: string } {
    const state = this.loadState(opts.filePath);
    const next = this.recordOutcome(state, vendor, taskType, reward, opts.alpha ?? 0.2);
    const saved = this.saveState(next, opts.filePath);
    const perf = next.vendors[vendor]?.[taskType] ?? null;
    return { ok: saved.ok, vendor, taskType, performance: perf, path: saved.path, error: saved.error };
  }

  /**
   * Batch closure: load ONCE -> fold recordOutcome over every observation -> save
   * ONCE. The whole-round counterpart to recordOutcomeAndPersist. The consensus
   * OWNER feeds a round's worth of per-vendor rewards in a single call so the
   * state file is read+written exactly once per round instead of once per vendor.
   * Folding through the pure recordOutcome means the final EMA is IDENTICAL to N
   * sequential recordOutcomeAndPersist calls (each load-sees-prior-write), but the
   * single atomic save also closes the within-round N-write window and shrinks the
   * cross-process last-writer-wins surface to one rename per round. Fail-SOFT:
   * never throws; empty/all-invalid input is a no-op that returns ok:true count:0.
   * `count` is the number of observations that actually mutated the state (a blank
   * vendor / non-finite reward is skipped by recordOutcome and not counted).
   */
  recordOutcomesAndPersist(
    observations: ReadonlyArray<{ vendor: string; taskType: string; reward: number }>,
    opts: { filePath?: string; alpha?: number } = {},
  ): { ok: boolean; count: number; path: string; error?: string } {
    const path = typeof opts.filePath === "string" && opts.filePath.length > 0 ? opts.filePath : DEFAULT_STATE_PATH;
    if (!Array.isArray(observations) || observations.length === 0) {
      return { ok: true, count: 0, path };
    }
    let state = this.loadState(opts.filePath);
    let applied = 0;
    for (const o of observations) {
      if (o === null || typeof o !== "object") continue;
      const before = state;
      // recordOutcome is pure + self-validating: it returns the SAME state ref on a
      // blank vendor / blank taskType / non-finite reward, so the ref compare both
      // skips invalid rows and counts only the ones that genuinely moved an EMA.
      state = this.recordOutcome(state, o.vendor, o.taskType, o.reward, opts.alpha ?? 0.2);
      if (state !== before) applied++;
    }
    const saved = this.saveState(state, opts.filePath);
    return { ok: saved.ok, count: applied, path: saved.path, error: saved.error };
  }
}

function emptyState(): ConsensusPerformanceState {
  return { schemaVersion: SCHEMA_VERSION, vendors: {} };
}

export const consensusModelPerformanceEngine = new ConsensusModelPerformanceEngineImpl();
export const ConsensusModelPerformanceEngine = ConsensusModelPerformanceEngineImpl;
export const CONSENSUS_MODEL_PERFORMANCE_SCHEMA_VERSION = SCHEMA_VERSION;
