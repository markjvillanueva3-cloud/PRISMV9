/**
 * ZuluAdaptiveBackPressureEngine -- C5 (ZULU fleet, HZP-NEW-02).
 *
 * Trend-aware fan-out throttle. The gap this fills: HermesParallelBudgetEnvelopeEngine
 * (HZP03) is a per-CALL budget check (within/over/refused) with NO model of a slot's
 * recent trajectory -- it cannot say "slot alpha has had queue_depth > 8 for the last 5
 * checks and a 40% error rate: do not fan-out more tasks to it." This engine reads a
 * SLIDING WINDOW of per-slot queue-depth + error-rate samples (sourced from C3
 * ZuluFleetHealthSynthesisEngine's FleetHealthVector over time) and emits a
 * BackPressureSignal so the orchestrator backs off a saturated slot before a
 * cascading-failure overload (saturated slot -> more failures -> more self-correction
 * retries -> more load).
 *
 * SAFETY -- ADVISORY by default:
 *   - The engine NEVER vetoes. It emits a signal (pressure_level + recommended_delay_ms
 *     + cause); enforcement is the consumer's choice (PRISM_BACKPRESSURE_ENFORCE=1 to
 *     act on it; default 0 = advise-only for initial rollout). It must NEVER override a
 *     ZuluFleetGovernor-authorized action unilaterally.
 *   - TREND-aware, not spike-reactive: a single high sample does NOT escalate; a level
 *     escalates only when >= minConsecutiveHigh recent samples breach a threshold, so a
 *     transient blip never throttles a healthy slot.
 *   - Sustained "blocked" sets escalate=true so a consumer can surface to AGENT_CHAT.
 *   - A corrupt sample store degrades to "low" (no throttle) -- safe for an advisory,
 *     non-vetoing signal (worst case = the pre-C5 status quo of no throttling); the
 *     corruption is surfaced (status readOnly) and mutations throw (never silent-clobber).
 *
 * Pure-core (heavily tested, no IO): assessBackPressure(). The durable instance methods
 * (recordSample/recentSamples/assess/status) wrap it, cloning ZuluTaskContinuityEngine (C2)
 * store discipline: schemaVersion-tagged, atomic tmp+rename, fail-closed on corrupt/schema,
 * per-slot ring capped + window-pruned, store path overridable for hermetic tests.
 *
 * @module engines/ZuluAdaptiveBackPressureEngine
 * @unit ZULU/C5-ADAPTIVE-BACKPRESSURE
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ============================================================================
// Constants
// ============================================================================

const SCHEMA_VERSION = 1;
const DEFAULT_STORE_PATH = "H:/prism/mcp-server/data/state/zulu-backpressure-samples.json";
const ATOMIC_RENAME_RETRIES = 5;
const RENAME_RETRY_MS = 25;
const SLOT_RE = /^[a-z][a-z0-9-]{1,31}$/i;
const PREVIEW_LEN = 60;

/** Default sliding-window + threshold configuration. All overridable via assess opts. */
const DEFAULTS = Object.freeze({
  windowMs: 300_000, // 5 min sliding window
  maxSamplesPerSlot: 50, // ring-buffer cap (prevents unbounded growth)
  minConsecutiveHigh: 3, // trend gate: N recent breaching samples before escalating
  queueMedium: 4,
  queueHigh: 8, // spec example "queue_depth > 8"
  errorMedium: 0.2,
  errorHigh: 0.4, // spec example "40% error rate"
  blockedErrorRate: 0.5, // sustained >= this -> blocked
  delayMs: Object.freeze({ low: 0, medium: 5_000, high: 30_000, blocked: 120_000 }),
});

// ============================================================================
// Types (exported for dispatcher + tests)
// ============================================================================

export type PressureLevel = "low" | "medium" | "high" | "blocked";

export interface HealthSample {
  slot: string;
  /** Pending/queued task count for the slot (>= 0). */
  queue_depth: number;
  /** Recent error rate in [0,1]. */
  error_rate: number;
  /** ISO-8601 sample timestamp. */
  ts: string;
}

export interface BackPressureSignal {
  slot: string;
  pressure_level: PressureLevel;
  recommended_delay_ms: number;
  cause: string;
  /** True when sustained "blocked" -> a consumer should escalate (e.g. AGENT_CHAT). */
  escalate: boolean;
  /** How many samples in the window were considered. */
  samples_considered: number;
  windowMs: number;
  /** Advisory unless the consumer opts into enforcement (PRISM_BACKPRESSURE_ENFORCE=1). */
  advisory: boolean;
}

export interface AssessOpts {
  now?: string;
  windowMs?: number;
  minConsecutiveHigh?: number;
  queueMedium?: number;
  queueHigh?: number;
  errorMedium?: number;
  errorHigh?: number;
  blockedErrorRate?: number;
  /** Force the advisory flag (defaults to !(PRISM_BACKPRESSURE_ENFORCE === "1")). */
  advisory?: boolean;
}

interface StoreShape {
  schemaVersion: number;
  /** slot -> chronological samples (oldest first). */
  samples: Record<string, HealthSample[]>;
}
interface ReadStoreResult extends StoreShape {
  readOnly?: boolean;
  reason?: string;
}

// ============================================================================
// Engine
// ============================================================================

class ZuluAdaptiveBackPressureEngine {
  private static instance: ZuluAdaptiveBackPressureEngine;
  private readonly storePath: string;
  private readonly pid: number;

  private constructor(storePath?: string) {
    this.storePath = storePath || process.env.PRISM_ZULU_BACKPRESSURE_PATH || DEFAULT_STORE_PATH;
    this.pid = process.pid;
  }

  static getInstance(): ZuluAdaptiveBackPressureEngine {
    if (!ZuluAdaptiveBackPressureEngine.instance) {
      ZuluAdaptiveBackPressureEngine.instance = new ZuluAdaptiveBackPressureEngine();
    }
    return ZuluAdaptiveBackPressureEngine.instance;
  }

  /** Isolated instance bound to a specific store path. Tests only. */
  static __forTests(storePath: string): ZuluAdaptiveBackPressureEngine {
    return new ZuluAdaptiveBackPressureEngine(storePath);
  }

  getStorePath(): string {
    return this.storePath;
  }

  // --------------------------------------------------------------------------
  // PURE CORE (no IO) -- the trend-assessment logic
  // --------------------------------------------------------------------------

  /**
   * Assess back-pressure for a slot from a window of recent samples. Pure.
   *
   * TREND-aware: a level escalates only when >= minConsecutiveHigh of the most-recent
   * in-window samples breach the corresponding threshold, so a single spike never
   * throttles. Evaluated most-severe-first (blocked > high > medium > low).
   *
   * @param slot    The slot being assessed (echoed into the signal).
   * @param samples Chronological samples (any slot mix tolerated; only `slot`'s and
   *                in-window ones are considered).
   * @param opts    Window + thresholds + now (injected for hermetic tests).
   */
  static assessBackPressure(slot: string, samples: readonly HealthSample[], opts: AssessOpts = {}): BackPressureSignal {
    const cfg = {
      windowMs: posNum(opts.windowMs, DEFAULTS.windowMs),
      minConsecutiveHigh: Math.max(1, Math.floor(posNum(opts.minConsecutiveHigh, DEFAULTS.minConsecutiveHigh))),
      queueMedium: posNum(opts.queueMedium, DEFAULTS.queueMedium),
      queueHigh: posNum(opts.queueHigh, DEFAULTS.queueHigh),
      errorMedium: clamp01(opts.errorMedium, DEFAULTS.errorMedium),
      errorHigh: clamp01(opts.errorHigh, DEFAULTS.errorHigh),
      blockedErrorRate: clamp01(opts.blockedErrorRate, DEFAULTS.blockedErrorRate),
    };
    const nowMs = parseNow(opts.now);
    const advisory = opts.advisory ?? (process.env.PRISM_BACKPRESSURE_ENFORCE !== "1");

    // Keep only this slot's in-window samples, newest first.
    const inWindow = (Array.isArray(samples) ? samples : [])
      .filter((s) => s && s.slot === slot && Number.isFinite(Date.parse(s.ts)) && nowMs - Date.parse(s.ts) <= cfg.windowMs)
      .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));

    const considered = inWindow.length;
    const base = (level: PressureLevel, cause: string): BackPressureSignal => ({
      slot,
      pressure_level: level,
      recommended_delay_ms: DEFAULTS.delayMs[level],
      cause,
      escalate: level === "blocked",
      samples_considered: considered,
      windowMs: cfg.windowMs,
      advisory,
    });

    if (considered === 0) return base("low", "no-samples-in-window");

    // Count, over the most-recent `minConsecutiveHigh` samples, how many breach each band.
    // `need` is the FULL threshold (not Math.min with the available count): a slot must have
    // accumulated at least `minConsecutiveHigh` in-window samples AND have that many breach
    // before escalating above "low". This honors the documented contract that a single spike
    // (or a cold slot's first 1-2 samples) never escalates -- previously a 1-sample window
    // collapsed `need` to 1 and a lone spike escalated. Advisory-only, but the contract matters.
    const recent = inWindow.slice(0, cfg.minConsecutiveHigh);
    const need = cfg.minConsecutiveHigh;
    const breach = (pred: (s: HealthSample) => boolean) => recent.length >= need && recent.filter(pred).length >= need;

    // blocked: sustained very-high error rate OR sustained extreme queue (2x high).
    if (breach((s) => clamp01(s.error_rate, 0) >= cfg.blockedErrorRate)) {
      return base("blocked", `sustained-error-rate>=${cfg.blockedErrorRate} over ${need} samples`);
    }
    if (breach((s) => num(s.queue_depth) >= cfg.queueHigh * 2)) {
      return base("blocked", `sustained-queue-depth>=${cfg.queueHigh * 2} over ${need} samples`);
    }
    // high: sustained high queue OR sustained high error.
    if (breach((s) => num(s.queue_depth) > cfg.queueHigh)) {
      return base("high", `sustained-queue-depth>${cfg.queueHigh} over ${need} samples`);
    }
    if (breach((s) => clamp01(s.error_rate, 0) > cfg.errorHigh)) {
      return base("high", `sustained-error-rate>${cfg.errorHigh} over ${need} samples`);
    }
    // medium: sustained moderate queue OR error.
    if (breach((s) => num(s.queue_depth) >= cfg.queueMedium)) {
      return base("medium", `sustained-queue-depth>=${cfg.queueMedium} over ${need} samples`);
    }
    if (breach((s) => clamp01(s.error_rate, 0) >= cfg.errorMedium)) {
      return base("medium", `sustained-error-rate>=${cfg.errorMedium} over ${need} samples`);
    }
    return base("low", "nominal");
  }

  // --------------------------------------------------------------------------
  // Durable API (per-slot ring buffer over the sliding window)
  // --------------------------------------------------------------------------

  /**
   * Record a health sample for a slot (append + prune old + cap the ring). Returns the
   * stored sample, or ok:false (never throws) on bad input; THROWS on read-only store.
   */
  recordSample(
    slot: string,
    sample: { queue_depth: number; error_rate: number },
    opts: { now?: string; maxSamplesPerSlot?: number; windowMs?: number } = {},
  ): { ok: boolean; sample?: HealthSample; error?: string } {
    if (typeof slot !== "string" || !SLOT_RE.test(slot)) {
      return { ok: false, error: `invalid slot: ${this.preview(slot)}` };
    }
    const qd = num(sample?.queue_depth);
    const er = sample?.error_rate;
    if (!Number.isFinite(qd) || qd < 0) return { ok: false, error: `queue_depth must be a finite >= 0 number` };
    if (!Number.isFinite(Number(er)) || Number(er) < 0 || Number(er) > 1) return { ok: false, error: `error_rate must be in [0,1]` };
    const nowIso = this.resolveNow(opts.now);
    if (!nowIso) return { ok: false, error: `invalid now timestamp: ${this.preview(opts.now)}` };
    const cap = Math.max(1, Math.floor(posNum(opts.maxSamplesPerSlot, DEFAULTS.maxSamplesPerSlot)));
    const windowMs = posNum(opts.windowMs, DEFAULTS.windowMs);
    const nowMs = Date.parse(nowIso);

    const store = this.readStore();
    if (store.readOnly) {
      throw new Error(`ZuluAdaptiveBackPressure: refusing to record into read-only store: ${store.reason || "(unspecified)"}`);
    }
    const rec: HealthSample = { slot, queue_depth: Math.floor(qd), error_rate: Number(er), ts: nowIso };
    const prior = Array.isArray(store.samples[slot]) ? store.samples[slot] : [];
    // prune out-of-window, append, cap to the most-recent `cap`.
    const pruned = prior.filter((s) => Number.isFinite(Date.parse(s.ts)) && nowMs - Date.parse(s.ts) <= windowMs);
    pruned.push(rec);
    pruned.sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
    store.samples[slot] = pruned.slice(-cap);
    this.writeStore(store);
    return { ok: true, sample: rec };
  }

  /** Recent in-window samples for a slot (oldest first). Read-only. */
  recentSamples(slot: string, opts: { now?: string; windowMs?: number } = {}): HealthSample[] {
    const store = this.readStore();
    const nowMs = Date.parse(this.resolveNow(opts.now) || new Date().toISOString());
    const windowMs = posNum(opts.windowMs, DEFAULTS.windowMs);
    const all = Array.isArray(store.samples[slot]) ? store.samples[slot] : [];
    return all.filter((s) => Number.isFinite(Date.parse(s.ts)) && nowMs - Date.parse(s.ts) <= windowMs);
  }

  /** Assess back-pressure for a slot from the persisted window. Never throws. */
  assess(slot: string, opts: AssessOpts = {}): BackPressureSignal {
    const store = this.readStore();
    const all = Array.isArray(store.samples[slot]) ? store.samples[slot] : [];
    return ZuluAdaptiveBackPressureEngine.assessBackPressure(slot, all, opts);
  }

  /** Per-slot signal summary across all tracked slots. Read-only; surfaces readOnly. */
  status(opts: AssessOpts = {}): { ok: boolean; count: number; signals: BackPressureSignal[]; readOnly?: boolean; reason?: string } {
    const store = this.readStore();
    const signals = Object.keys(store.samples)
      .map((slot) => ZuluAdaptiveBackPressureEngine.assessBackPressure(slot, store.samples[slot] || [], opts))
      .sort((a, b) => severity(b.pressure_level) - severity(a.pressure_level));
    const out = { ok: true, count: signals.length, signals } as ReturnType<ZuluAdaptiveBackPressureEngine["status"]>;
    if (store.readOnly) {
      out.readOnly = true;
      out.reason = store.reason;
    }
    return out;
  }

  // --------------------------------------------------------------------------
  // Storage layer -- clones ZuluTaskContinuityEngine (C2) discipline
  // --------------------------------------------------------------------------

  private readStore(): ReadStoreResult {
    if (!fs.existsSync(this.storePath)) return { schemaVersion: SCHEMA_VERSION, samples: {} };
    let raw: string;
    try {
      raw = fs.readFileSync(this.storePath, "utf8");
    } catch (e) {
      return { schemaVersion: SCHEMA_VERSION, samples: {}, readOnly: true, reason: `read failed: ${(e as NodeJS.ErrnoException)?.code || (e as Error)?.message}` };
    }
    if (raw.trim().length === 0) return { schemaVersion: SCHEMA_VERSION, samples: {} };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      this.rotateCorrupt();
      return { schemaVersion: SCHEMA_VERSION, samples: {}, readOnly: true, reason: `parse failed: ${(e as Error)?.message} -- corrupt file preserved` };
    }
    const asStore = parsed as Partial<StoreShape>;
    if (typeof parsed !== "object" || parsed === null || typeof asStore.samples !== "object" || asStore.samples === null) {
      return { schemaVersion: SCHEMA_VERSION, samples: {}, readOnly: true, reason: "schema-shape failure: missing samples map" };
    }
    if (asStore.schemaVersion !== SCHEMA_VERSION) {
      return { schemaVersion: SCHEMA_VERSION, samples: {}, readOnly: true, reason: `schema-version mismatch: file=${asStore.schemaVersion} engine=${SCHEMA_VERSION} (peer may be newer; refusing to clobber)` };
    }
    // Drop malformed rows rather than fail the whole read.
    const clean: Record<string, HealthSample[]> = {};
    for (const [slot, rows] of Object.entries(asStore.samples as Record<string, unknown>)) {
      if (!Array.isArray(rows)) continue;
      const valid = rows.filter((r) => this.isValidSample(r)) as HealthSample[];
      if (valid.length) clean[slot] = valid;
    }
    return { schemaVersion: SCHEMA_VERSION, samples: clean };
  }

  private writeStore(store: StoreShape): void {
    if ((store as ReadStoreResult).readOnly) {
      throw new Error(`ZuluAdaptiveBackPressure: refusing to write read-only store: ${(store as ReadStoreResult).reason || "(unspecified)"}`);
    }
    const dir = path.dirname(this.storePath);
    fs.mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, samples: store.samples }, null, 2);
    const tmp = `${this.storePath}.tmp-${this.pid}-${Date.now()}`;
    fs.writeFileSync(tmp, payload, "utf8");
    let lastErr: NodeJS.ErrnoException | null = null;
    for (let attempt = 0; attempt < ATOMIC_RENAME_RETRIES; attempt++) {
      try {
        fs.renameSync(tmp, this.storePath);
        return;
      } catch (e) {
        lastErr = e as NodeJS.ErrnoException;
        if (lastErr.code !== "EBUSY" && lastErr.code !== "EPERM" && lastErr.code !== "EACCES") break;
        this.sleep(RENAME_RETRY_MS);
      }
    }
    try { fs.unlinkSync(tmp); } catch { /* best-effort tmp cleanup */ }
    throw new Error(`ZuluAdaptiveBackPressure: atomic write failed after ${ATOMIC_RENAME_RETRIES} retries: ${lastErr?.message || "unknown"}`);
  }

  private rotateCorrupt(): void {
    const corruptPath = `${this.storePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    try {
      fs.renameSync(this.storePath, corruptPath);
    } catch {
      /* best-effort evidence preservation */
    }
  }

  private isValidSample(row: unknown): boolean {
    if (typeof row !== "object" || row === null) return false;
    const r = row as Partial<HealthSample>;
    if (typeof r.slot !== "string") return false;
    if (typeof r.queue_depth !== "number" || !Number.isFinite(r.queue_depth) || r.queue_depth < 0) return false;
    if (typeof r.error_rate !== "number" || !Number.isFinite(r.error_rate) || r.error_rate < 0 || r.error_rate > 1) return false;
    if (typeof r.ts !== "string" || !Number.isFinite(Date.parse(r.ts))) return false;
    return true;
  }

  private resolveNow(now: unknown): string | null {
    if (now === undefined || now === null) return new Date().toISOString();
    if (typeof now !== "string") return null;
    const ms = Date.parse(now);
    if (!Number.isFinite(ms) || ms < 0) return null;
    return new Date(ms).toISOString();
  }

  private preview(v: unknown): string {
    try {
      const s = typeof v === "string" ? v : JSON.stringify(v);
      return (s ?? String(v)).slice(0, PREVIEW_LEN);
    } catch {
      return typeof v;
    }
  }

  private sleep(ms: number): void {
    const buf = new Int32Array(new SharedArrayBuffer(4));
    Atomics.wait(buf, 0, 0, Math.max(0, Math.floor(ms)));
  }
}

// ============================================================================
// Local pure helpers
// ============================================================================

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}
function posNum(v: unknown, dflt: number): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : dflt;
}
function clamp01(v: unknown, dflt: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(1, Math.max(0, n));
}
function parseNow(now: unknown): number {
  if (typeof now === "string") {
    const ms = Date.parse(now);
    if (Number.isFinite(ms)) return ms;
  }
  return Date.now();
}
function severity(level: PressureLevel): number {
  return level === "blocked" ? 3 : level === "high" ? 2 : level === "medium" ? 1 : 0;
}

// ============================================================================
// Exports
// ============================================================================

export const zuluAdaptiveBackPressureEngine = ZuluAdaptiveBackPressureEngine.getInstance();
export { ZuluAdaptiveBackPressureEngine, DEFAULTS as ZULU_BACKPRESSURE_DEFAULTS, SCHEMA_VERSION as ZULU_BACKPRESSURE_SCHEMA_VERSION };
