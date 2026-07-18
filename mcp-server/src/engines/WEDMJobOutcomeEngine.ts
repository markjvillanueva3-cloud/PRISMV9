/**
 * WEDMJobOutcomeEngine — Capture finished-job telemetry for the learning loop.
 *
 * MS-P4-DL-CORE / U-P4-DL-01
 *
 * Every finished WEDM job emits:
 *   - actual surface roughness (Ra, µm)
 *   - actual cycle time (min)
 *   - observed wire-break count
 *   - (optional) measured recast depth (µm)
 *
 * These are buffered into:
 *   - `data/state/WEDM_OUTCOME_LEDGER.jsonl` — append-only audit trail (ground truth)
 *   - `data/state/WEDM_JOB_HISTORY.json`    — rollup: aggregate stats + last-500 cache
 *
 * Downstream consumers (LoRA adapter, EWC memory, few-shot bootstrap) read the
 * JSON rollup for fast queries and the JSONL log for deep history.
 *
 * Bit-exact record+replay invariant: a job round-tripped through append()→last()
 * must match the input record field-for-field. Tests assert this with
 * synthetic fixtures.
 *
 * Units:
 *   - Ra: µm (micrometers)
 *   - Time: minutes
 *   - Length: mm
 *   - Current: A, pulse: µs, tension: N, pressure: bar
 *
 * @module engines/WEDMJobOutcomeEngine
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { log } from "../utils/Logger.js";
import {
  WEDMJobOutcomeSchema,
  WEDMJobHistorySchema,
  EMPTY_WEDM_JOB_HISTORY,
  type WEDMJobOutcome,
  type WEDMJobHistory,
} from "../schemas/wedmJobHistorySchema.js";
import { emitFromWEDMJobOutcome } from "../utils/shopFloorOutcomeBridge.js";

const DATA_ROOT = path.resolve(process.cwd(), "data/state");
const LEDGER_PATH = path.join(DATA_ROOT, "WEDM_OUTCOME_LEDGER.jsonl");
const HISTORY_PATH = path.join(DATA_ROOT, "WEDM_JOB_HISTORY.json");

const RECENT_CACHE_MAX = 500;

// ============================================================================
// RESULT TYPES
// ============================================================================

export interface AtomicValue {
  value: number;
  unit: string;
  uncertainty: number;
  confidence: number;
  source: string;
  warning?: string;
}

export interface IngestResult {
  accepted: boolean;
  jobId: string;
  reason?: string;
  raErrorUm: AtomicValue;
  cycleTimeErrorMin: AtomicValue;
  newTotalJobs: number;
}

export interface HistoryQueryResult {
  jobs: WEDMJobOutcome[];
  total: number;
  filteredBy: Record<string, string | number | undefined>;
}

export interface OutcomeStats {
  totalJobs: number;
  meanRaMAEUm: AtomicValue;
  meanCycleTimeMAEMin: AtomicValue;
  wireBreakRate: AtomicValue;
  perMaterial: Record<string, {
    count: number;
    meanRaErrorUm: number;
    meanCycleTimeErrorMin: number;
    wireBreakRate: number;
  }>;
}

// ============================================================================
// ENGINE
// ============================================================================

class WEDMJobOutcomeEngine {
  private history: WEDMJobHistory;

  constructor() {
    this.history = this.loadHistory();
  }

  // --------------------------------------------------------------------------
  // PERSISTENCE
  // --------------------------------------------------------------------------

  private loadHistory(): WEDMJobHistory {
    try {
      if (!fs.existsSync(HISTORY_PATH)) {
        return structuredClone(EMPTY_WEDM_JOB_HISTORY);
      }
      const raw = fs.readFileSync(HISTORY_PATH, "utf8");
      const parsed = JSON.parse(raw);
      const validated = WEDMJobHistorySchema.safeParse(parsed);
      if (!validated.success) {
        log.warn(`[WEDMJobOutcomeEngine] history validation failed; resetting to empty state: ${validated.error.message}`);
        return structuredClone(EMPTY_WEDM_JOB_HISTORY);
      }
      return validated.data;
    } catch (err: any) {
      log.warn(`[WEDMJobOutcomeEngine] history load failed; resetting to empty state: ${err?.message}`);
      return structuredClone(EMPTY_WEDM_JOB_HISTORY);
    }
  }

  private persistHistory(): void {
    try {
      fs.mkdirSync(DATA_ROOT, { recursive: true });
      fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.history, null, 2), "utf8");
    } catch (err: any) {
      log.warn(`[WEDMJobOutcomeEngine] history persist failed: ${err?.message}`);
    }
  }

  private appendLedger(outcome: WEDMJobOutcome): void {
    try {
      fs.mkdirSync(DATA_ROOT, { recursive: true });
      fs.appendFileSync(
        LEDGER_PATH,
        JSON.stringify({ type: "entry", ...outcome }) + "\n",
        "utf8"
      );
    } catch (err: any) {
      log.warn(`[WEDMJobOutcomeEngine] ledger append failed: ${err?.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // INGEST
  // --------------------------------------------------------------------------

  /**
   * Record a finished-job outcome. Validates with Zod, appends to ledger,
   * and refreshes the rollup. Returns error-signal AtomicValues for the
   * calibration loop.
   */
  recordOutcome(input: unknown): IngestResult {
    const parsed = WEDMJobOutcomeSchema.safeParse(input);
    if (!parsed.success) {
      return {
        accepted: false,
        jobId: typeof (input as any)?.jobId === "string" ? (input as any).jobId : "invalid",
        reason: parsed.error.message,
        raErrorUm: this.atomic(0, "um", 1, 0, "rejected", "schema validation failed"),
        cycleTimeErrorMin: this.atomic(0, "min", 1, 0, "rejected", "schema validation failed"),
        newTotalJobs: this.history.totalJobs,
      };
    }
    const outcome = parsed.data;

    // Duplicate guard on jobId — idempotent replay returns the existing record.
    if (this.history.recent.some((r) => r.jobId === outcome.jobId)) {
      return {
        accepted: false,
        jobId: outcome.jobId,
        reason: "duplicate jobId",
        raErrorUm: this.atomic(0, "um", 0, 1, "duplicate", "job already recorded"),
        cycleTimeErrorMin: this.atomic(0, "min", 0, 1, "duplicate", "job already recorded"),
        newTotalJobs: this.history.totalJobs,
      };
    }

    this.appendLedger(outcome);

    // BRIDGE-DEEP / U-BRIDGE-SHOPFLOOR-LEARN — mirror the accepted outcome to
    // the universal outcome bus so cross-domain learning consumers
    // (CrossProcessNeuralLearningEngine, LearningAdaptationEngine, etc.) see
    // WEDM job data. The bus is fire-and-forget by contract; the try/catch is
    // defense-in-depth against a future bridge-contract regression — emit
    // failure never breaks recordOutcome (the WEDM ledger above is the local
    // truth). Disable knob: PRISM_WEDM_BRIDGE_DISABLE=1 (sister to every
    // other fire-and-forget side-effect path per the
    // never-delete-only-disable doctrine).
    if (process.env.PRISM_WEDM_BRIDGE_DISABLE !== "1") {
      try {
        emitFromWEDMJobOutcome(outcome);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        log.warn(`[WEDMJobOutcomeEngine] bridge emit failed: ${msg}`);
      }
    }

    // Rollup update
    this.history.recent.unshift(outcome);
    if (this.history.recent.length > RECENT_CACHE_MAX) {
      this.history.recent.length = RECENT_CACHE_MAX;
    }
    this.history.totalJobs += 1;

    this.recomputeStats();
    this.persistHistory();

    const raErr = outcome.actual.raUm - outcome.predicted.raUm;
    const timeErr = outcome.actual.cycleTimeMin - outcome.predicted.cycleTimeMin;

    return {
      accepted: true,
      jobId: outcome.jobId,
      raErrorUm: this.atomic(raErr, "um", Math.max(0.05, Math.abs(raErr) * 0.1), 0.9, "WEDMJobOutcomeEngine:ra_error"),
      cycleTimeErrorMin: this.atomic(timeErr, "min", Math.max(0.1, Math.abs(timeErr) * 0.1), 0.9, "WEDMJobOutcomeEngine:time_error"),
      newTotalJobs: this.history.totalJobs,
    };
  }

  // --------------------------------------------------------------------------
  // QUERY
  // --------------------------------------------------------------------------

  getLast(n: number): WEDMJobOutcome[] {
    const k = Math.max(0, Math.min(Math.floor(n), this.history.recent.length));
    return this.history.recent.slice(0, k);
  }

  getById(jobId: string): WEDMJobOutcome | null {
    return this.history.recent.find((r) => r.jobId === jobId) ?? null;
  }

  queryByMaterial(material: string, limit: number = 50): HistoryQueryResult {
    const key = material.toUpperCase();
    const matches = this.history.recent.filter(
      (r) => r.material.toUpperCase() === key
    );
    return {
      jobs: matches.slice(0, Math.max(0, Math.floor(limit))),
      total: matches.length,
      filteredBy: { material: key, limit },
    };
  }

  getStats(): OutcomeStats {
    const agg = this.history.aggregate;
    const total = this.history.totalJobs;
    const perMaterial: OutcomeStats["perMaterial"] = {};
    for (const [key, stats] of Object.entries(this.history.statsByMaterial)) {
      perMaterial[key] = {
        count: stats.count,
        meanRaErrorUm: stats.meanRaErrorUm,
        meanCycleTimeErrorMin: stats.meanCycleTimeErrorMin,
        wireBreakRate: stats.wireBreakRate,
      };
    }
    const confidence = total === 0 ? 0 : Math.min(0.95, 0.3 + total * 0.02);
    return {
      totalJobs: total,
      meanRaMAEUm: this.atomic(agg.meanRaMAEUm, "um", 0.05, confidence, "WEDMJobOutcomeEngine:ra_mae"),
      meanCycleTimeMAEMin: this.atomic(agg.meanCycleTimeMAEMin, "min", 0.2, confidence, "WEDMJobOutcomeEngine:time_mae"),
      wireBreakRate: this.atomic(agg.overallWireBreakRate, "per_job", 0.01, confidence, "WEDMJobOutcomeEngine:break_rate"),
      perMaterial,
    };
  }

  /** Dump the full rollup for downstream engines. Returns a defensive copy. */
  snapshot(): WEDMJobHistory {
    return structuredClone(this.history);
  }

  // --------------------------------------------------------------------------
  // INTERNAL HELPERS
  // --------------------------------------------------------------------------

  private recomputeStats(): void {
    const recent = this.history.recent;
    if (recent.length === 0) {
      this.history.statsByMaterial = {};
      this.history.aggregate = {
        meanRaMAEUm: 0,
        meanCycleTimeMAEMin: 0,
        overallWireBreakRate: 0,
        firstFinishedAt: null,
        lastFinishedAt: null,
      };
      return;
    }

    const perMat: Record<string, {
      count: number;
      sumRaErr: number;
      sumRaAbsErr: number;
      sumTimeErr: number;
      sumTimeAbsErr: number;
      breaks: number;
      lastFinishedAt: string | null;
    }> = {};

    let sumRaAbs = 0;
    let sumTimeAbs = 0;
    let sumBreaks = 0;

    let minFinished: string | null = null;
    let maxFinished: string | null = null;

    for (const r of recent) {
      const key = r.material.toUpperCase();
      perMat[key] ??= {
        count: 0, sumRaErr: 0, sumRaAbsErr: 0, sumTimeErr: 0, sumTimeAbsErr: 0, breaks: 0, lastFinishedAt: null,
      };
      const raErr = r.actual.raUm - r.predicted.raUm;
      const timeErr = r.actual.cycleTimeMin - r.predicted.cycleTimeMin;
      perMat[key].count += 1;
      perMat[key].sumRaErr += raErr;
      perMat[key].sumRaAbsErr += Math.abs(raErr);
      perMat[key].sumTimeErr += timeErr;
      perMat[key].sumTimeAbsErr += Math.abs(timeErr);
      perMat[key].breaks += r.actual.wireBreaks;
      if (perMat[key].lastFinishedAt === null || perMat[key].lastFinishedAt! < r.finishedAt) {
        perMat[key].lastFinishedAt = r.finishedAt;
      }

      sumRaAbs += Math.abs(raErr);
      sumTimeAbs += Math.abs(timeErr);
      sumBreaks += r.actual.wireBreaks;

      if (minFinished === null || r.finishedAt < minFinished) minFinished = r.finishedAt;
      if (maxFinished === null || r.finishedAt > maxFinished) maxFinished = r.finishedAt;
    }

    const rebuiltByMaterial: WEDMJobHistory["statsByMaterial"] = {};
    for (const [key, s] of Object.entries(perMat)) {
      rebuiltByMaterial[key] = {
        count: s.count,
        meanRaErrorUm: s.sumRaErr / s.count,
        meanCycleTimeErrorMin: s.sumTimeErr / s.count,
        wireBreakRate: s.breaks / s.count,
        lastFinishedAt: s.lastFinishedAt,
      };
    }
    this.history.statsByMaterial = rebuiltByMaterial;

    this.history.aggregate = {
      meanRaMAEUm: sumRaAbs / recent.length,
      meanCycleTimeMAEMin: sumTimeAbs / recent.length,
      overallWireBreakRate: sumBreaks / recent.length,
      firstFinishedAt: minFinished,
      lastFinishedAt: maxFinished,
    };
  }

  private atomic(
    value: number,
    unit: string,
    uncertainty: number,
    confidence: number,
    source: string,
    warning?: string
  ): AtomicValue {
    return { value, unit, uncertainty, confidence, source, warning };
  }

  // --------------------------------------------------------------------------
  // TEST UTILITIES (not for production)
  // --------------------------------------------------------------------------

  /**
   * Reset in-memory state. Intended for tests — production callers must go
   * through `recordOutcome`. Does NOT delete the on-disk ledger.
   */
  _resetForTests(): void {
    this.history = structuredClone(EMPTY_WEDM_JOB_HISTORY);
    try {
      if (fs.existsSync(HISTORY_PATH)) fs.unlinkSync(HISTORY_PATH);
    } catch { /* best-effort cleanup */ }
  }
}

export const wedmJobOutcomeEngine = new WEDMJobOutcomeEngine();
export { WEDMJobOutcomeEngine };
