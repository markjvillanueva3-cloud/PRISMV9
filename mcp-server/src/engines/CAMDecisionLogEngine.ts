/**
 * CAMDecisionLogEngine -- CAM 2-phase decision-capture store (Phase 1 of the
 * CAM per-domain learning loop; backlog item #4,
 * reference_open_learning_loops_backlog_2026_06_22).
 *
 * THE GAP THIS CLOSES: CAMFeedbackLoopEngine (U-CAM120) already owns the
 * operator-time surface -- recordOutcome() REQUIRES a real wasCorrect boolean
 * and recordCorrection() stores override training pairs -- but nothing
 * recorded a stable decisionId + decision snapshot when a CAM decision was
 * EMITTED. A later operator verdict/override therefore had nothing to
 * correlate against, and the Mann-Kendall accuracy-drift metric starved.
 * This engine is that missing Phase-1 correlation store.
 *
 * DESIGN CONTRACT (2-phase):
 *   Phase 1 (decision time)  -> capture() appends {decisionId, ts, action,
 *     task, inputs digest, decision value, confidence, source}. It NEVER
 *     stores a wasCorrect: correctness is unknowable at decision time.
 *     (Calling CAMFeedbackLoopEngine.recordOutcome at emission with a forced
 *     wasCorrect=true was evaluated and REJECTED -- it falsifies the drift
 *     metric.)
 *   Phase 2 (operator time)  -> the prism_cam `cam_decision_outcome` action
 *     looks the record up by decisionId, feeds CAMFeedbackLoopEngine with the
 *     REAL outcome/correction, then markResolved() stamps the resolution so a
 *     double-resolve can never double-count the metric.
 *
 * Distinct from (verified against source, no duplication):
 *   - prism_guard `decision_log` (guardDispatcher.ts) -- dev-time guard/error
 *     decision ledger, not CAM decision correlation.
 *   - CAMOutcomeCaptureWireEngine (U-CAM-LOOP-ONRAMP) -- labels TERMINAL
 *     emissions (toolpath_generate / collision_check_full / post_process)
 *     from their own result signals at dispatch time; a strategy DECISION has
 *     no such self-signal, hence this deferred-resolution store.
 *   - CAMConfidenceCalibrationEngine / CAMFeedbackLoopEngine /
 *     ReinforcementLearningCAMFeedbackEngine -- CONSUME resolved outcomes;
 *     this engine is the correlation substrate that feeds them.
 *
 * Storage: data/state/CAM_DECISION_LOG.json (schemaVersion 1.0.0), atomic
 * tmp+rename writes via utils/atomicWrite.safeWriteSync, bounded FIFO
 * (default cap 5000 records) with truncated prompt/value/inputs snapshots so
 * the file cannot grow unbounded. The capture path is FAIL-SOFT end to end:
 * a load/persist failure can never break the CAM action that emitted the
 * decision -- errors are surfaced in-band on the return value and in stats()
 * (R12: surfaced, never hidden), never thrown from capture(). The resolve
 * path (markResolved) is fail-loud on contract violations.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { safeWriteSync } from "../utils/atomicWrite.js";

// =============================================================================
// CONSTANTS
// =============================================================================

/** Store schema version -- bump on breaking record-shape changes. */
const SCHEMA_VERSION = "1.0.0";
/** Default FIFO cap on retained decision records (oldest evicted first). */
const DEFAULT_LOG_CAP = 5000;
/** Truncation limit for the stored prompt (mirrors CAMFeedbackLoopEngine's
 *  PROMPT_STORAGE_LIMIT intent -- bounded storage of free text). */
const PROMPT_STORAGE_LIMIT = 4096;
/** Truncation limit for a serialized decision value / actuals blob. */
const VALUE_STORAGE_LIMIT = 4096;
/** Truncation limit for the human-readable inputs summary. */
const INPUTS_SUMMARY_LIMIT = 2048;

// =============================================================================
// TYPES
// =============================================================================

/** Operator-time resolution stamped onto a decision record by Phase 2. */
export interface CAMDecisionResolution {
  /** The REAL verdict fed to CAMFeedbackLoopEngine.recordOutcome. */
  wasCorrect: boolean;
  /** True when the resolve also carried a corrected value (override). */
  hadCorrection: boolean;
  /** recordId of the OutcomeRecord created in CAMFeedbackLoopEngine. */
  outcomeRecordId: string;
  /** recordId of the CorrectionRecord (when hadCorrection). */
  correctionRecordId?: string;
  /** Optional bounded snapshot of measured actuals supplied at resolve time. */
  actuals?: unknown;
  resolvedAt: number;
}

/**
 * One logged CAM decision. NOTE the deliberate ABSENCE of any `wasCorrect`
 * field on the unresolved record -- correctness only exists inside
 * `resolution`, which Phase 2 writes. Tests assert this invariant.
 */
export interface CAMDecisionRecord {
  decisionId: string;
  ts: number;
  /** The prism_cam dispatcher action that emitted the decision. */
  action: string;
  /** CAMFeedbackLoopEngine task key (e.g. "strategy_recommend"). */
  task: string;
  /** sha256 hex of the full serialized inputs (stable dedupe/correlation aid). */
  inputsHash: string;
  /** Truncated JSON summary of the inputs (human-readable digest). */
  inputsSummary: string;
  /** Truncated prompt that produced the decision ("" when none). */
  prompt: string;
  /** The recommended decision (bounded snapshot). */
  decisionValue: unknown;
  /** Confidence the emitter stated, clamped to [0, 1] (0 when unknown). */
  confidence: number;
  /** Winning source label, when the emitter reported one. */
  source: string | null;
  resolved: boolean;
  resolution?: CAMDecisionResolution;
}

export interface CaptureDecisionInput {
  action: string;
  task: string;
  /** Raw action params -- digested + truncated, never stored whole unbounded. */
  inputs: unknown;
  prompt?: string;
  decisionValue: unknown;
  confidence?: number;
  source?: string | null;
  /** Test hook: explicit timestamp. */
  ts?: number;
}

export interface CaptureDecisionResult {
  /** Stable id the caller must return to the outside world ("" on hard reject). */
  decisionId: string;
  /** True iff the record was durably persisted (in-memory insert may still
   *  have succeeded when false -- see error). */
  logged: boolean;
  error?: string;
}

export type MarkResolvedResult =
  | { ok: true; record: CAMDecisionRecord; persisted: boolean }
  | { ok: false; error: "unknown_decision_id" | "already_resolved"; record: CAMDecisionRecord | null };

export interface DecisionLogStats {
  schemaVersion: string;
  total: number;
  unresolved: number;
  resolved: number;
  cap: number;
  storePath: string;
  lastLoadError: string | null;
  lastPersistError: string | null;
}

interface PersistedStore {
  schemaVersion: string;
  updatedAt: number;
  records: CAMDecisionRecord[];
}

// =============================================================================
// ENGINE
// =============================================================================

export class CAMDecisionLogEngine {
  /** Insertion-ordered record map (Map preserves insertion order -> FIFO). */
  private static records: Map<string, CAMDecisionRecord> | null = null;
  private static storePathOverride: string | null = null;
  private static logCap: number = DEFAULT_LOG_CAP;
  private static idCounter: number = 0;
  private static lastLoadError: string | null = null;
  private static lastPersistError: string | null = null;

  /**
   * Point the store at a different file (tests use a temp path). Resets the
   * in-memory cache so the next access loads from the new path.
   * @param p - absolute path of the JSON store file
   */
  static setStorePath(p: string): void {
    if (typeof p !== "string" || p.length === 0) {
      throw new Error("setStorePath: path must be a non-empty string");
    }
    this.storePathOverride = p;
    this.records = null;
    this.lastLoadError = null;
    this.lastPersistError = null;
  }

  /**
   * Override the FIFO cap. Evicts immediately when the store already exceeds
   * the new cap.
   * @param cap - positive integer record ceiling
   */
  static setLogCap(cap: number): void {
    if (!Number.isFinite(cap) || cap < 1) {
      throw new Error(`setLogCap: cap must be a positive integer, got ${cap}`);
    }
    this.logCap = Math.floor(cap);
    const store = this.loadStore();
    this.evict(store);
    this.persist();
  }

  /** Drop every record (test hook). Persists the empty store best-effort. */
  static clearAll(): void {
    this.records = new Map();
    this.idCounter = 0;
    this.lastLoadError = null;
    this.persist();
  }

  /**
   * Phase 1: log an emitted CAM decision under a fresh stable decisionId.
   * NEVER throws and never stores a correctness verdict -- see module doc.
   * @param input - decision snapshot (action/task required)
   * @returns decisionId + whether the record was durably persisted
   */
  static capture(input: CaptureDecisionInput): CaptureDecisionResult {
    try {
      if (!input || typeof input.action !== "string" || input.action.length === 0) {
        return { decisionId: "", logged: false, error: "capture: action must be a non-empty string" };
      }
      if (typeof input.task !== "string" || input.task.length === 0) {
        return { decisionId: "", logged: false, error: "capture: task must be a non-empty string" };
      }
      const store = this.loadStore();
      const now = typeof input.ts === "number" && Number.isFinite(input.ts) ? input.ts : Date.now();
      const serializedInputs = safeSerialize(input.inputs);
      const record: CAMDecisionRecord = {
        decisionId: this.nextId(now),
        ts: now,
        action: input.action,
        task: input.task,
        inputsHash: sha256Hex(serializedInputs),
        inputsSummary: truncateText(serializedInputs, INPUTS_SUMMARY_LIMIT),
        prompt: truncateText(typeof input.prompt === "string" ? input.prompt : "", PROMPT_STORAGE_LIMIT),
        decisionValue: boundValue(input.decisionValue),
        confidence: clamp01(input.confidence ?? 0),
        source: typeof input.source === "string" && input.source.length > 0 ? input.source : null,
        resolved: false,
      };
      store.set(record.decisionId, record);
      this.evict(store);
      const persisted = this.persist();
      if (persisted) return { decisionId: record.decisionId, logged: true };
      return {
        decisionId: record.decisionId,
        logged: false,
        error: this.lastPersistError ?? "persist failed",
      };
    } catch (err) {
      return {
        decisionId: "",
        logged: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Look up one decision record.
   * @param decisionId - id returned by capture()
   * @returns the live record (treat as read-only) or null when unknown
   */
  static get(decisionId: string): CAMDecisionRecord | null {
    if (typeof decisionId !== "string" || decisionId.length === 0) return null;
    return this.loadStore().get(decisionId) ?? null;
  }

  /**
   * Filter records (chronological order).
   * @param filter - resolved flag / task / trailing limit
   */
  static list(filter: { resolved?: boolean; task?: string; limit?: number } = {}): CAMDecisionRecord[] {
    let arr = [...this.loadStore().values()];
    if (filter.resolved !== undefined) arr = arr.filter((r) => r.resolved === filter.resolved);
    if (filter.task !== undefined) arr = arr.filter((r) => r.task === filter.task);
    if (filter.limit !== undefined) {
      const lim = Math.max(0, Math.floor(filter.limit));
      arr = arr.slice(-lim);
    }
    return arr;
  }

  /**
   * Phase 2: stamp an operator resolution onto a record. Refuses unknown ids
   * and double-resolves with structured errors (never double-counts).
   * Fail-loud (throws) only on a malformed resolution payload -- a caller bug.
   * @param decisionId - id returned by capture()
   * @param resolution - verdict + CAMFeedbackLoopEngine record ids
   */
  static markResolved(
    decisionId: string,
    resolution: {
      wasCorrect: boolean;
      hadCorrection: boolean;
      outcomeRecordId: string;
      correctionRecordId?: string;
      actuals?: unknown;
    }
  ): MarkResolvedResult {
    const store = this.loadStore();
    const rec = typeof decisionId === "string" ? store.get(decisionId) : undefined;
    if (!rec) return { ok: false, error: "unknown_decision_id", record: null };
    if (rec.resolved) return { ok: false, error: "already_resolved", record: rec };
    if (
      !resolution ||
      typeof resolution.wasCorrect !== "boolean" ||
      typeof resolution.outcomeRecordId !== "string" ||
      resolution.outcomeRecordId.length === 0
    ) {
      throw new Error("markResolved: resolution requires wasCorrect (boolean) + outcomeRecordId (non-empty string)");
    }
    rec.resolved = true;
    rec.resolution = {
      wasCorrect: resolution.wasCorrect,
      hadCorrection: resolution.hadCorrection === true,
      outcomeRecordId: resolution.outcomeRecordId,
      resolvedAt: Date.now(),
    };
    if (typeof resolution.correctionRecordId === "string" && resolution.correctionRecordId.length > 0) {
      rec.resolution.correctionRecordId = resolution.correctionRecordId;
    }
    if (resolution.actuals !== undefined && resolution.actuals !== null) {
      rec.resolution.actuals = boundValue(resolution.actuals);
    }
    const persisted = this.persist();
    return { ok: true, record: rec, persisted };
  }

  /** Store health for dashboards / R12 surfacing. */
  static stats(): DecisionLogStats {
    const store = this.loadStore();
    let resolved = 0;
    for (const r of store.values()) if (r.resolved) resolved++;
    return {
      schemaVersion: SCHEMA_VERSION,
      total: store.size,
      unresolved: store.size - resolved,
      resolved,
      cap: this.logCap,
      storePath: this.resolveStorePath(),
      lastLoadError: this.lastLoadError,
      lastPersistError: this.lastPersistError,
    };
  }

  // ---------------------------------------------------------------------------
  // INTERNAL
  // ---------------------------------------------------------------------------

  private static resolveStorePath(): string {
    return this.storePathOverride ?? join(process.cwd(), "data", "state", "CAM_DECISION_LOG.json");
  }

  /** Lazy load. Corrupt/absent/version-mismatched file -> empty store with the
   *  error surfaced in stats() (fail-soft, never throws). */
  private static loadStore(): Map<string, CAMDecisionRecord> {
    if (this.records) return this.records;
    const map = new Map<string, CAMDecisionRecord>();
    const path = this.resolveStorePath();
    try {
      if (existsSync(path)) {
        const parsed = JSON.parse(readFileSync(path, "utf-8")) as PersistedStore;
        if (parsed?.schemaVersion !== SCHEMA_VERSION || !Array.isArray(parsed.records)) {
          this.lastLoadError = `unsupported store shape (schemaVersion=${String(parsed?.schemaVersion)})`;
        } else {
          for (const r of parsed.records) {
            if (r && typeof r.decisionId === "string" && r.decisionId.length > 0) {
              map.set(r.decisionId, r);
            }
          }
        }
      }
    } catch (err) {
      this.lastLoadError = err instanceof Error ? err.message : String(err);
    }
    this.records = map;
    return map;
  }

  /** Atomic persist. Returns false (with lastPersistError set) on failure. */
  private static persist(): boolean {
    const store = this.records ?? new Map<string, CAMDecisionRecord>();
    const payload: PersistedStore = {
      schemaVersion: SCHEMA_VERSION,
      updatedAt: Date.now(),
      records: [...store.values()],
    };
    try {
      safeWriteSync(this.resolveStorePath(), JSON.stringify(payload, null, 2));
      this.lastPersistError = null;
      return true;
    } catch (err) {
      this.lastPersistError = err instanceof Error ? err.message : String(err);
      return false;
    }
  }

  /** FIFO eviction to the cap (Map iteration order = insertion order). */
  private static evict(store: Map<string, CAMDecisionRecord>): void {
    while (store.size > this.logCap) {
      const oldest = store.keys().next();
      if (oldest.done) break;
      store.delete(oldest.value);
    }
  }

  /** Unique across restarts: timestamp + in-process counter + random suffix. */
  private static nextId(ts: number): string {
    this.idCounter = (this.idCounter + 1) % 1_000_000;
    return `camdec-${ts.toString(36)}-${this.idCounter.toString(36)}-${randomBytes(3).toString("hex")}`;
  }
}

// =============================================================================
// PURE HELPERS
// =============================================================================

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}

function truncateText(s: string, max: number): string {
  if (typeof s !== "string") return "";
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

function safeSerialize(v: unknown): string {
  if (v === undefined) return "null";
  try {
    return JSON.stringify(v) ?? "null";
  } catch {
    return "[unserializable]";
  }
}

/** Store a value as-is when its serialization is bounded; otherwise a preview. */
function boundValue(v: unknown): unknown {
  const s = safeSerialize(v);
  if (s === "[unserializable]") return { truncated: true, preview: "[unserializable]" };
  if (s.length <= VALUE_STORAGE_LIMIT) return v === undefined ? null : v;
  return { truncated: true, preview: s.slice(0, VALUE_STORAGE_LIMIT) };
}

function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

// =============================================================================
// EXPORTS
// =============================================================================

export const camDecisionLogEngine = CAMDecisionLogEngine;
