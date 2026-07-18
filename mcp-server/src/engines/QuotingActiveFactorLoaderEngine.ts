/**
 * QuotingActiveFactorLoaderEngine — durable bridge from calibration JSON to live quote path
 *
 * Closes the runtime loop for U-QT10 calibration. The active factors live at
 * `state/shared/calibration/quoting-calibration-active.json` (produced by
 * `QuotingCalibrationEngine.derive()` + the calibration-cycle runner). This
 * loader is the bridge that lets EVERY downstream quote consumer (QuoteEstimator,
 * QuoteBuilderPage, Xometry-style flow, etc.) pull the currently-active
 * calibration factors with a 60-second cache + safe fallback.
 *
 * WITHOUT this engine, the U-QT10 calibration cycle ships dormant — factors
 * exist on disk but never reach the live quote path.
 * WITH this engine, any predicted_usd from the quoting stack gets the
 * systematic over-prediction corrected automatically.
 *
 * Surface contract:
 *   - getActiveFactors() — cached read of active JSON; metadata + ok/reason
 *   - applyToQuote(predicted_usd, customer?) — convenience wrapper, calls into
 *     QuotingCalibrationEngine.apply() with active factors
 *   - refresh() — force-clear cache + reload from disk
 *   - getMetadata() — generated_at + ageMinutes + signature + isStale + hasFactors
 *
 * Design per Karpathy R8 (read before write) + R12 (fail loud):
 *   - File-missing → returns {ok:false, reason:"active-factors-file-missing"};
 *     does NOT invent factors.
 *   - JSON-malformed → returns {ok:false, reason:"json-parse-failed"};
 *     does NOT silently use partial data.
 *   - Stale (>24h) → still returns factors but flags isStale=true so the UI
 *     can prompt operator to re-derive.
 *
 * @milestone DEEP-REASONING-BRIDGE-MS0/U-COV-QUOTING-ACTIVE
 * @author slot:charlie /goal-19 (continuing), 2026-05-25
 */

import { promises as fs, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { resolveRepoRoot } from "../utils/resolve-repo-root.js";
import { quotingCalibrationEngine, type CalibrationFactors, type CalibrationApplyResult } from "./QuotingCalibrationEngine.js";

/**
 * Repo root resolved DEPTH-INDEPENDENTLY (U-QP-CALIB-HEALTH-ROOT-FIX, charlie 2026-06-26).
 * The default paths below MUST anchor on the repo root, NOT `process.cwd()`: the production
 * MCP server is launched with cwd = `mcp-server/` (verified live via the `:3100` bridge —
 * `training_status` resolved to `H:\prism\mcp-server\state\shared\quoting\...`, file-missing),
 * but the closed-loop train-cycle writes these files to the REPO ROOT
 * `H:/prism/state/shared/...`. A `process.cwd()` anchor therefore made the
 * `QuotingCalibrationHealthPage` show "file-missing" for BOTH `training_status` and
 * `quoting_active_factor_get` while the data existed on disk. Same producer/consumer
 * cwd-mismatch class as U-DISPATCHER-REPO-ROOT-FIX (2026-06-25, india). resolveRepoRoot()
 * fails loud (R12) if the marker pair isn't found, never silently returns a wrong root.
 */
const REPO_ROOT = resolveRepoRoot();

/** Default path — overridable for tests + multi-tenant deployments. */
export const DEFAULT_ACTIVE_FACTOR_PATH = resolve(REPO_ROOT, "state/shared/calibration/quoting-calibration-active.json");

/**
 * U-QP-TRAINING-STATUS-ACTION (charlie 2026-06-02): default path of the closed-loop
 * training-cycle status snapshot written by quoting-train-cycle.mjs
 * (buildTrainingStatusSnapshot → latest-training-status.json). This is the front-to-back
 * synergy surface — the latest cycle's MAPE / data-source coverage / baseline-fallback
 * provenance / skip_reason in one small file. Overridable for tests.
 */
export const DEFAULT_TRAINING_STATUS_PATH = resolve(REPO_ROOT, "state/shared/quoting/latest-training-status.json");

/** Cache TTL — re-reads disk if older than this. Operator can force via refresh(). */
const CACHE_TTL_MS = 60_000;

/** Staleness threshold — flagged for UI but factors still returned. */
const STALENESS_THRESHOLD_HOURS = 24;

/**
 * Minimum data-source coverage PERCENT (0-100 scale) a training-cycle MAPE must have
 * before it is allowed to flow onto the live quote-time CI band. The producer
 * (quoting-train-cycle.mjs buildTrainingStatusSnapshot) writes data_source_coverage as
 * an OBJECT { consumed_count, available_count, coverage_pct, unconsumed_available } where
 * coverage_pct is `round(consumed/available * 100)` -- a 0-100 percent, NOT a 0-1 fraction.
 * Below this floor the sample is too thin/partial to honestly characterize the model's
 * error, so the band falls back to theory-only (U-QP-LIVE-MAPE-FEED). 40% mirrors the
 * closed-loop's own observed coverage floor (~2-of-5 sources; see
 * reference_charlie_ci_calibration_aware).
 */
const MIN_COVERAGE_PCT_FOR_LIVE_MAPE = 40;

/**
 * skip_reason markers that mean the cycle did NOT produce a production-trustworthy MAPE
 * (dry-run / write-withheld / not-activated). A MAPE carrying any of these must never
 * reach a customer-facing band -- the live snapshot today is a dry-run with a degenerate
 * 755% MAPE, exactly the kind of value this guard keeps off a quote.
 */
const NON_TRUSTWORTHY_SKIP_MARKERS = ["dry-run", "dry_run", "writeifsafe=false", "skip", "withheld"];

/** Result of gating a training-status snapshot for live-MAPE eligibility. */
export interface LiveMapeGateResult {
  /** The MAPE percent when the snapshot passes every freshness/provenance gate; null otherwise. */
  mape_pct: number | null;
  /** Why the MAPE was admitted or refused (R12 traceability). */
  reason: string;
}

/**
 * gateObservedMape -- the PURE freshness + provenance gate deciding whether a
 * closed-loop training-cycle MAPE may flow onto the LIVE quote-time CI band
 * (U-QP-LIVE-MAPE-FEED, Lever 2). This is the safety core: the india soul refuses
 * "training/embedding on a stale/synthetic distribution without a freshness preflight",
 * and the charlie soul refuses "training on a stale bootstrap distribution without a
 * freshness preflight" -- so a MAPE is admitted ONLY when it is provably from a fresh,
 * real (non-baseline-fallback), sufficiently-covered, activation-eligible cycle.
 *
 * The gate is written against the REAL producer contract (buildTrainingStatusSnapshot in
 * scripts/quoting-train-cycle.mjs + the live latest-training-status.json), verified by
 * reading both -- NOT an assumed shape:
 *   - mape_pct                : number | null
 *   - baseline_fallback       : null (no fallback) | OBJECT (fallback used). NEVER boolean.
 *   - data_source_coverage    : OBJECT { coverage_pct: 0-100, ... } | null
 *   - safe_to_activate        : boolean (the cycle's own go/no-go)
 *   - skip_reason             : string | null (e.g. "writeIfSafe=false (dry-run mode)")
 *
 * Refuses (returns null) when ANY of:
 *   - no snapshot / mape_pct missing / non-finite / non-positive
 *   - stale: ageMinutes past the staleness ceiling, OR ageMinutes is undefined (no
 *     parseable ts_iso -- cannot confirm freshness, so REFUSE rather than trust)
 *   - safe_to_activate !== true -- the cycle itself said do-not-activate
 *   - skip_reason carries a dry-run / write-withheld marker -- not a production MAPE
 *   - baseline_fallback is non-null (object) OR absent -- bootstrap/degraded provenance
 *     (NOT real (predicted,actual) pairs); a real activation-eligible cycle writes null
 *   - data_source_coverage missing / not an object / coverage_pct < the floor
 *
 * A null result is SAFE: the CI band stays theory-only (never narrows on missing data).
 * Reuses ONLY fields the snapshot already carries -- invents no persistence, runs no
 * training.
 *
 * @param snapshot   the raw latest-training-status.json object (may be undefined)
 * @param ageMinutes minutes since the cycle ran (undefined when ts_iso unparseable)
 * @param staleThresholdHours staleness ceiling in hours (default STALENESS_THRESHOLD_HOURS)
 * @returns {mape_pct, reason} -- mape_pct is the admitted percent, or null when refused
 */
export function gateObservedMape(
  snapshot: Record<string, unknown> | undefined,
  ageMinutes: number | undefined,
  staleThresholdHours: number = STALENESS_THRESHOLD_HOURS,
): LiveMapeGateResult {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return { mape_pct: null, reason: "no-snapshot" };
  }
  const mape = snapshot.mape_pct;
  if (typeof mape !== "number" || !Number.isFinite(mape) || mape <= 0) {
    return { mape_pct: null, reason: "mape-missing-or-non-positive" };
  }
  // Freshness: no parseable ts_iso (undefined age) -> REFUSE -- a customer band must not
  // trust a snapshot whose age cannot be confirmed (uniform "refuse on doubt" posture).
  if (ageMinutes === undefined) {
    return { mape_pct: null, reason: "freshness-unknown: no parseable ts_iso" };
  }
  if (ageMinutes > staleThresholdHours * 60) {
    return { mape_pct: null, reason: `stale: age ${ageMinutes}min > ${staleThresholdHours}h` };
  }
  // The cycle's OWN go/no-go: if it did not deem itself safe to activate, its MAPE is
  // not production-trustworthy for a customer band.
  if (snapshot.safe_to_activate !== true) {
    return { mape_pct: null, reason: "safe_to_activate is not true" };
  }
  // skip_reason markers (dry-run / write-withheld) mean the cycle did not really produce
  // an activatable MAPE -- keep its (often degenerate) error off the live band.
  const skip = snapshot.skip_reason;
  if (typeof skip === "string" && NON_TRUSTWORTHY_SKIP_MARKERS.some((m) => skip.toLowerCase().includes(m))) {
    return { mape_pct: null, reason: `skip_reason refuses live use: "${skip}"` };
  }
  // baseline_fallback: null = no fallback (real distribution). Any non-null object means
  // the bootstrap/configured-baseline distribution was used -> refuse (soul refuse-list).
  // Absent/undefined also refuses: a real activation-eligible cycle writes it explicitly.
  if (snapshot.baseline_fallback === undefined || snapshot.baseline_fallback !== null) {
    return { mape_pct: null, reason: "baseline_fallback non-null/absent: bootstrap or unproven provenance" };
  }
  // data_source_coverage is an OBJECT carrying coverage_pct (0-100).
  const cov = snapshot.data_source_coverage;
  const coveragePct =
    cov && typeof cov === "object" && !Array.isArray(cov)
      ? (cov as Record<string, unknown>).coverage_pct
      : undefined;
  if (typeof coveragePct !== "number" || !Number.isFinite(coveragePct) || coveragePct < MIN_COVERAGE_PCT_FOR_LIVE_MAPE) {
    return {
      mape_pct: null,
      reason: `coverage_pct ${typeof coveragePct === "number" ? coveragePct : "n/a"} < ${MIN_COVERAGE_PCT_FOR_LIVE_MAPE}% floor`,
    };
  }
  return { mape_pct: mape, reason: `admitted: mape ${mape.toFixed(2)}% coverage ${coveragePct}%` };
}

export interface ActiveFactorMetadata {
  ok: boolean;
  reason?: string;
  /** Generated_at from the JSON, ISO-8601. */
  generated_at?: string;
  /** Minutes since generated_at; undefined when not loaded. */
  ageMinutes?: number;
  /** True when ageMinutes > STALENESS_THRESHOLD_HOURS*60. */
  isStale?: boolean;
  /** Source report signature for change detection. */
  signature?: string;
  /** Whether the file exists + parsed + has ok=true factors. */
  hasFactors: boolean;
  /** File path used (informational). */
  path?: string;
  /** Cache age (ms since last disk read). */
  cacheAgeMs?: number;
}

export interface ActiveFactorReadResult {
  ok: boolean;
  reason?: string;
  factors?: CalibrationFactors;
  metadata: ActiveFactorMetadata;
}

/** Result of reading the latest closed-loop training-cycle status snapshot. */
export interface TrainingStatusReadResult {
  ok: boolean;
  /** Failure reason when ok=false (file-missing / parse-failed / not-an-object). */
  reason?: string;
  /** Full latest-training-status.json snapshot (schemaVersion, ts_iso, mape_pct, data_source_coverage, baseline_fallback, skip_reason, ...). */
  snapshot?: Record<string, unknown>;
  /** schemaVersion carried by the snapshot (informational). */
  schemaVersion?: string;
  /** ts_iso from the snapshot (when the cycle ran). */
  generated_at?: string;
  /** Minutes since generated_at; undefined when ts_iso is missing/unparseable. */
  ageMinutes?: number;
  /** True when ageMinutes exceeds the staleness threshold — the loop may have stopped running. */
  isStale?: boolean;
  /** File path read (informational). */
  path: string;
}

export interface ActiveFactorApplyResult extends CalibrationApplyResult {
  ok: boolean;
  /** When factors are not loaded, the result is a 1.0 pass-through with this flag. */
  fallback_used: boolean;
  fallback_reason?: string;
  /** Metadata for the factors used (or absent if fallback). */
  factor_metadata?: ActiveFactorMetadata;
}

export class QuotingActiveFactorLoaderEngine {
  private path: string;
  private cache: { factors: CalibrationFactors | null; readAtMs: number; reason?: string } | null = null;

  constructor(opts: { path?: string } = {}) {
    this.path = opts.path ?? DEFAULT_ACTIVE_FACTOR_PATH;
  }

  /** Override the active-factor file path (e.g., for tests, multi-tenant). */
  setPath(path: string): void {
    if (typeof path !== "string" || path.length === 0) {
      throw new Error("QuotingActiveFactorLoader: path must be a non-empty string");
    }
    if (path !== this.path) {
      this.cache = null; // path change invalidates cache
      this.path = path;
    }
  }

  /** Get the currently-loaded path (for diagnostics). */
  getPath(): string {
    return this.path;
  }

  /**
   * Read the active calibration factors. Returns cached value if fresh,
   * otherwise re-reads from disk. NEVER invents factors when file is missing —
   * returns {ok:false, reason} so callers can decide pass-through vs error.
   */
  async getActiveFactors(): Promise<ActiveFactorReadResult> {
    const cached = await this.maybeReadCache();
    return {
      ok: cached.factors !== null && cached.factors.ok === true,
      reason: cached.reason,
      factors: cached.factors ?? undefined,
      metadata: this.buildMetadata(cached.factors, cached.readAtMs, cached.reason),
    };
  }

  /**
   * Apply active calibration factors to a predicted FMV. Convenience wrapper
   * that loads + delegates to QuotingCalibrationEngine.apply().
   *
   * Fallback behavior: when no active factors exist (file missing, parse fail,
   * factors.ok=false), returns the input unchanged with fallback_used=true.
   * This is intentional — the quoting pipeline should NEVER reject a quote
   * because calibration isn't loaded; it should just emit the uncalibrated
   * predicted_usd with a warning flag.
   */
  async applyToQuote(predicted_usd: number, customer?: string): Promise<ActiveFactorApplyResult> {
    if (!Number.isFinite(predicted_usd) || predicted_usd <= 0) {
      return {
        ok: false,
        predicted_usd,
        corrected_usd: predicted_usd,
        factor_used: 1,
        factor_source: "balanced-pass-through",
        fallback_used: true,
        fallback_reason: "invalid-predicted-usd",
      };
    }
    const read = await this.getActiveFactors();
    if (!read.ok || !read.factors) {
      return {
        ok: false,
        predicted_usd,
        corrected_usd: predicted_usd,
        factor_used: 1,
        factor_source: "balanced-pass-through",
        fallback_used: true,
        fallback_reason: read.reason ?? "no-active-factors",
        factor_metadata: read.metadata,
      };
    }
    const applied = quotingCalibrationEngine.apply(read.factors, predicted_usd, { customer });
    return {
      ok: true,
      ...applied,
      fallback_used: false,
      factor_metadata: read.metadata,
    };
  }

  /** Force a disk re-read on the next read. */
  refresh(): void {
    this.cache = null;
  }

  /**
   * U-QP-TRAINING-STATUS-ACTION (charlie 2026-06-02): read the latest closed-loop
   * training-cycle status snapshot (latest-training-status.json, written each cycle by
   * quoting-train-cycle.mjs → buildTrainingStatusSnapshot). This is the front-to-back
   * data-synergy READ: the frontend + any backend consumer gets the latest MAPE /
   * data-source coverage / baseline-fallback provenance / skip_reason from ONE small file
   * rather than tail-parsing the train-cycle-history.jsonl ledger.
   *
   * Fail-loud (R12), mirroring getActiveFactors(): file-missing →
   * {ok:false, reason:"training-status-file-missing"}; malformed JSON / non-object →
   * {ok:false, reason}; NEVER invents a status. A stale snapshot (default >24h) still
   * returns ok:true with the snapshot but flags isStale=true so the UI can warn that the
   * loop may have stopped running.
   *
   * NOT cached (unlike getActiveFactors): a status read is infrequent and its FRESHNESS is
   * the signal — a cache would mask a dead loop. Uses its OWN path (the status file),
   * independent of this loader's active-factor path.
   *
   * @param opts.path                override the status-file path (tests / multi-tenant)
   * @param opts.staleThresholdHours staleness flag threshold in hours (default 24, must be >0)
   */
  async readLatestTrainingStatus(
    opts: { path?: string; staleThresholdHours?: number } = {}
  ): Promise<TrainingStatusReadResult> {
    const path = opts.path ?? DEFAULT_TRAINING_STATUS_PATH;
    const staleHours =
      typeof opts.staleThresholdHours === "number" && opts.staleThresholdHours > 0
        ? opts.staleThresholdHours
        : STALENESS_THRESHOLD_HOURS;
    let raw: string;
    try {
      raw = await fs.readFile(path, "utf-8");
    } catch (err: any) {
      if (err && err.code === "ENOENT") {
        return { ok: false, reason: "training-status-file-missing", path };
      }
      return { ok: false, reason: `disk-read-error: ${err?.message ?? String(err)}`, path };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err: any) {
      return { ok: false, reason: `json-parse-failed: ${err?.message ?? String(err)}`, path };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false, reason: "training-status-not-an-object", path };
    }
    const snap = parsed as Record<string, unknown>;
    const tsIso = typeof snap.ts_iso === "string" ? snap.ts_iso : undefined;
    const generatedMs = tsIso ? Date.parse(tsIso) : NaN;
    const ageMinutes = Number.isFinite(generatedMs) ? Math.round((Date.now() - generatedMs) / 60_000) : undefined;
    const isStale = ageMinutes !== undefined && ageMinutes > staleHours * 60;
    return {
      ok: true,
      snapshot: snap,
      schemaVersion: typeof snap.schemaVersion === "string" ? snap.schemaVersion : undefined,
      generated_at: tsIso,
      ageMinutes,
      isStale,
      path,
    };
  }

  /**
   * getLiveObservedMapePct -- the LIVE quote-time MAPE feed (U-QP-LIVE-MAPE-FEED, Lever 2).
   *
   * Reads the latest closed-loop training-status snapshot and returns its MAPE percent
   * ONLY when it passes gateObservedMape (fresh + real + sufficiently covered). This is
   * what finally connects the closed-loop's measured error to the InstantQuote CI band
   * shipped in U-QP-CI-CALIBRATION-AWARE: before this, observed_mape_pct was an input
   * that no live caller ever populated, so the calibration-aware band ran theory-only on
   * every real quote. Now the band tightens/widens with the real (predicted, actual)
   * history -- and AUTO-TIGHTENS as the loop drives MAPE down.
   *
   * SYNCHRONOUS by design: InstantQuoteEngine.quote() is synchronous and has many callers;
   * adding an await would force an API break across the quoting stack. The status file is
   * tiny and read infrequently, so a readFileSync at quote time is acceptable (mirrors the
   * fail-closed disk-read contract of readLatestTrainingStatus, just sync).
   *
   * Returns null on ANY failure or refusal (file-missing / parse-failed / gate-refused),
   * which is SAFE -- the CI band stays theory-only and never narrows on missing data (R12).
   *
   * @param opts.path                override the status-file path (tests / multi-tenant)
   * @param opts.staleThresholdHours staleness ceiling in hours (default 24)
   * @returns {mape_pct, reason} -- mape_pct admitted percent or null; reason is always set
   */
  getLiveObservedMapePct(
    opts: { path?: string; staleThresholdHours?: number } = {},
  ): LiveMapeGateResult {
    const path = opts.path ?? DEFAULT_TRAINING_STATUS_PATH;
    const staleHours =
      typeof opts.staleThresholdHours === "number" && opts.staleThresholdHours > 0
        ? opts.staleThresholdHours
        : STALENESS_THRESHOLD_HOURS;
    let raw: string;
    try {
      raw = readFileSync(path, "utf-8");
    } catch (err: any) {
      if (err && err.code === "ENOENT") {
        return { mape_pct: null, reason: "training-status-file-missing" };
      }
      return { mape_pct: null, reason: `disk-read-error: ${err?.message ?? String(err)}` };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err: any) {
      return { mape_pct: null, reason: `json-parse-failed: ${err?.message ?? String(err)}` };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { mape_pct: null, reason: "training-status-not-an-object" };
    }
    const snap = parsed as Record<string, unknown>;
    const tsIso = typeof snap.ts_iso === "string" ? snap.ts_iso : undefined;
    const generatedMs = tsIso ? Date.parse(tsIso) : NaN;
    const ageMinutes = Number.isFinite(generatedMs)
      ? Math.round((Date.now() - generatedMs) / 60_000)
      : undefined;
    return gateObservedMape(snap, ageMinutes, staleHours);
  }

  /**
   * Get metadata without forcing a disk read (uses cache when fresh).
   * Cheap; safe to call on every quote.
   */
  async getMetadata(): Promise<ActiveFactorMetadata> {
    const cached = await this.maybeReadCache();
    return this.buildMetadata(cached.factors, cached.readAtMs, cached.reason);
  }

  // ────────────────────────────────────────────────────────────────────────
  // Private
  // ────────────────────────────────────────────────────────────────────────

  private async maybeReadCache(): Promise<{ factors: CalibrationFactors | null; readAtMs: number; reason?: string }> {
    const now = Date.now();
    if (this.cache && (now - this.cache.readAtMs) < CACHE_TTL_MS) {
      return this.cache;
    }
    const fresh = await this.readFromDisk();
    this.cache = { factors: fresh.factors, readAtMs: now, reason: fresh.reason };
    return this.cache;
  }

  private async readFromDisk(): Promise<{ factors: CalibrationFactors | null; reason?: string }> {
    let raw: string;
    try {
      raw = await fs.readFile(this.path, "utf-8");
    } catch (err: any) {
      if (err && err.code === "ENOENT") {
        return { factors: null, reason: "active-factors-file-missing" };
      }
      return { factors: null, reason: `disk-read-error: ${err?.message ?? String(err)}` };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err: any) {
      return { factors: null, reason: `json-parse-failed: ${err?.message ?? String(err)}` };
    }
    if (!parsed || typeof parsed !== "object") {
      return { factors: null, reason: "active-factors-not-an-object" };
    }
    const factors = parsed as CalibrationFactors;
    if (typeof factors.ok !== "boolean" || typeof factors.generated_at !== "string" || typeof factors.global !== "object") {
      return { factors: null, reason: "active-factors-shape-invalid" };
    }
    return { factors };
  }

  private buildMetadata(
    factors: CalibrationFactors | null,
    readAtMs: number,
    reason?: string
  ): ActiveFactorMetadata {
    const baseFalse: ActiveFactorMetadata = {
      ok: false,
      reason,
      hasFactors: false,
      path: this.path,
      cacheAgeMs: readAtMs ? Date.now() - readAtMs : undefined,
    };
    if (!factors) return baseFalse;
    if (!factors.ok) {
      return {
        ...baseFalse,
        generated_at: factors.generated_at,
        reason: factors.reason ?? reason ?? "factors-not-ok",
        signature: factors.source_report_signature,
      };
    }
    const generatedMs = Date.parse(factors.generated_at);
    const ageMinutes = Number.isFinite(generatedMs) ? Math.round((Date.now() - generatedMs) / 60_000) : undefined;
    const isStale = ageMinutes !== undefined && ageMinutes > STALENESS_THRESHOLD_HOURS * 60;
    return {
      ok: true,
      generated_at: factors.generated_at,
      ageMinutes,
      isStale,
      signature: factors.source_report_signature,
      hasFactors: true,
      path: this.path,
      cacheAgeMs: Date.now() - readAtMs,
    };
  }
}

export const quotingActiveFactorLoaderEngine = new QuotingActiveFactorLoaderEngine();
export default quotingActiveFactorLoaderEngine;
