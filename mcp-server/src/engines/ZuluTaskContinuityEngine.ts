/**
 * ZuluTaskContinuityEngine -- durable cross-session mid-flight task continuity.
 *
 * C2 (ZULU fleet). The gap this fills: the fleet already has
 *   - AtomicClaimBrokerEngine        -- WHO owns a resource (CAS claim + TTL)
 *   - SessionHandoffV2Engine         -- end-of-session human-readable handoff
 *   - CrossSessionOrchestratorEngine -- facade over both + broadcast
 * but NONE of them persist a per-UNIT working-state checkpoint that a
 * different session can pick up and continue mid-build. A handoff is a
 * session-scoped summary; a claim says only who holds a resource. Neither
 * answers "I was 3 files into MILESTONE::U-FOO with this partial state -- let
 * the next chat resume exactly there."
 *
 * This engine owns that one job: durable per-unit continuation records.
 *   checkpoint(unit, state) -- write/overwrite the record for a unit
 *   resume(unit)            -- read it back (with a stale flag if >24h old)
 *   listMidflights()        -- every active continuation record
 *
 * Durability + safety contract (mirrors slot-task-claim.mjs discipline):
 *   - One JSON store, schemaVersion-tagged, atomic tmp+rename write.
 *   - CROSS-PROCESS LOCK: every writer (checkpoint/clear) runs its
 *     read-modify-write inside a sync O_EXCL lockfile (`<store>.lock`) with a
 *     stale/dead-PID reaper, so two slots writing different unit ids cannot
 *     lost-update each other. The lock is held by CONTENT (a unique per-acquire
 *     nonce): verify-own-write detects a racing reaper that clobbered our fresh
 *     lock, the reap is snapshot-guarded (never unlink a fresh lock written
 *     under us), and release unlinks only if the nonce is still OURS (never
 *     clobber a peer's lock). Readers (resume/list) are lock-free -- the atomic
 *     rename guarantees they see a complete store, never a torn one.
 *   - FAIL-CLOSED on corrupt/unparseable state: NEVER silently clobber. The
 *     store goes read-only (corrupt file preserved as `.corrupt-<iso>`); a
 *     subsequent checkpoint THROWS rather than overwrite a peer's data.
 *   - FAIL-CLOSED on a NEWER schemaVersion: a forward-compat peer must not be
 *     clobbered by this (older) code -- store goes read-only.
 *   - Stale guard: a record older than 24h is returned with `stale:true` so a
 *     resumer never blindly trusts ancient state.
 *
 * Pure-ish: filesystem is the only side effect, and the store path is
 * overridable (PRISM_ZULU_CONTINUITY_PATH / ctor opt) to keep tests hermetic.
 *
 * @module engines/ZuluTaskContinuityEngine
 * @unit ZULU/C2-TASK-CONTINUITY
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

// ============================================================================
// Constants
// ============================================================================

const SCHEMA_VERSION = 1;
const DEFAULT_STORE_PATH = "H:/prism/mcp-server/data/state/zulu-task-continuity.json";
/** A record older than this is flagged `stale:true` on resume/list. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
/** Hard ceiling on serialized record state to prevent a runaway oversize write. */
const MAX_STATE_BYTES = 256 * 1024;
/** Unit id format: MILESTONE::U-ID (matches slot-task-claim UNIT_ID_RE). */
const UNIT_ID_RE = /^[A-Z][A-Z0-9_-]{1,80}::[A-Za-z0-9_+.-]{1,80}$/;
const ATOMIC_RENAME_RETRIES = 5;
const RENAME_RETRY_MS = 25;
const PREVIEW_LEN = 60;
const TAG_MAX_LEN = 64;
// Cross-process lock on the store read-modify-write (checkpoint/clear). The critical
// section is sub-ms so contention is rare; 50 * 20ms = ~1s max wait before a writer
// gives up. A lock older than STALE_LOCK_MS, held by a dead same-host PID, or
// unreadable, is reaped. Defaults are ctor-overridable (lockCfg) for fast tests.
const LOCK_RETRIES_DEFAULT = 50;
const LOCK_RETRY_MS_DEFAULT = 20;
const STALE_LOCK_MS_DEFAULT = 30_000;

/** Thrown when a writer cannot acquire the store lock within its retry budget. */
class ZuluStoreLockTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ZuluStoreLockTimeoutError";
  }
}

// ============================================================================
// Types (exported for dispatcher + tests)
// ============================================================================

/** A single durable mid-flight continuation record. */
export interface ContinuityRecord {
  unitId: string;
  /** Opaque caller-supplied working state (files touched, phase, next-action, etc.). */
  state: Record<string, unknown>;
  /** Identity of the writer (slot/chat/host) -- best-effort, never trusted for auth. */
  writer: {
    slot?: string;
    chatId?: string;
    host: string;
    pid: number;
  };
  /** ISO-8601 timestamp of the first checkpoint for this unit. */
  createdAt: string;
  /** ISO-8601 timestamp of the most recent checkpoint. */
  updatedAt: string;
  /** Monotonic count of checkpoints written for this unit. */
  revision: number;
}

export interface CheckpointInput {
  slot?: string;
  chatId?: string;
  /** Optional explicit ISO timestamp (test hermeticity); defaults to now. */
  now?: string;
}

export interface CheckpointResult {
  ok: boolean;
  record?: ContinuityRecord;
  created?: boolean;
  error?: string;
}

export interface ResumeResult {
  found: boolean;
  record?: ContinuityRecord;
  /** True when the record is older than STALE_AFTER_MS (by updatedAt). */
  stale?: boolean;
  ageMs?: number;
  error?: string;
  reason?: string;
}

export interface MidflightSummary {
  unitId: string;
  slot?: string;
  chatId?: string;
  updatedAt: string;
  ageMs: number;
  stale: boolean;
  revision: number;
}

export interface ListResult {
  ok: boolean;
  count: number;
  midflights: MidflightSummary[];
  /** Set when the store is read-only (corruption / schema mismatch). */
  readOnly?: boolean;
  reason?: string;
}

/** Internal on-disk shape. */
interface StoreShape {
  schemaVersion: number;
  records: Record<string, ContinuityRecord>;
}

/** readStore sentinel: when readOnly is set, callers MUST NOT write. */
interface ReadStoreResult extends StoreShape {
  readOnly?: boolean;
  reason?: string;
}

// ============================================================================
// Engine
// ============================================================================

class ZuluTaskContinuityEngine {
  private static instance: ZuluTaskContinuityEngine;
  private readonly storePath: string;
  private readonly host: string;
  private readonly pid: number;
  private readonly lockRetries: number;
  private readonly lockRetryMs: number;
  private readonly staleLockMs: number;
  /** Monotonic per-instance counter for unique lock-ownership nonces. */
  private lockSeq = 0;

  private constructor(storePath?: string, lockCfg?: { retries?: number; retryMs?: number; staleMs?: number }) {
    this.storePath =
      storePath || process.env.PRISM_ZULU_CONTINUITY_PATH || DEFAULT_STORE_PATH;
    this.host = os.hostname();
    this.pid = process.pid;
    this.lockRetries = lockCfg?.retries ?? LOCK_RETRIES_DEFAULT;
    this.lockRetryMs = lockCfg?.retryMs ?? LOCK_RETRY_MS_DEFAULT;
    this.staleLockMs = lockCfg?.staleMs ?? STALE_LOCK_MS_DEFAULT;
  }

  static getInstance(): ZuluTaskContinuityEngine {
    if (!ZuluTaskContinuityEngine.instance) {
      ZuluTaskContinuityEngine.instance = new ZuluTaskContinuityEngine();
    }
    return ZuluTaskContinuityEngine.instance;
  }

  /**
   * Build an isolated instance bound to a specific store path. For tests only
   * (the singleton resolves the canonical/env path). Not for production use.
   */
  static __forTests(
    storePath: string,
    lockCfg?: { retries?: number; retryMs?: number; staleMs?: number },
  ): ZuluTaskContinuityEngine {
    return new ZuluTaskContinuityEngine(storePath, lockCfg);
  }

  getStorePath(): string {
    return this.storePath;
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Write (or overwrite) the durable continuation record for a unit.
   *
   * @param unit  MILESTONE::U-ID (validated against UNIT_ID_RE).
   * @param state Opaque working state. Must be a plain object; serialized size
   *              is capped at MAX_STATE_BYTES.
   * @param input Optional slot/chatId/now metadata.
   * @returns CheckpointResult. ok:false (never throws on validation) for bad
   *          input; THROWS only when the store is read-only (corrupt/newer
   *          schema) so a peer's data is never clobbered.
   */
  checkpoint(unit: string, state: unknown, input: CheckpointInput = {}): CheckpointResult {
    const unitId = this.normalizeUnit(unit);
    if (!unitId) {
      return { ok: false, error: `invalid unit id: expected MILESTONE::U-ID, got ${this.preview(unit)}` };
    }
    const stateCheck = this.validateState(state);
    if (!stateCheck.ok) {
      return { ok: false, error: stateCheck.error };
    }
    const nowIso = this.resolveNow(input.now);
    if (!nowIso) {
      return { ok: false, error: `invalid now timestamp: ${this.preview(input.now)}` };
    }

    // Read-modify-write the shared store under the cross-process lock so two slots
    // checkpointing different unit ids cannot lost-update each other (this engine's
    // first producer, wave_loop_step, makes that race reachable). A transient lock
    // timeout surfaces as ok:false (the hot path retries next tick); the read-only +
    // atomic-write throws propagate unchanged (corruption is more severe than contention).
    try {
      return this.withStoreLock((): CheckpointResult => {
        const store = this.readStore();
        if (store.readOnly) {
          // FAIL-CLOSED: refuse to write over a corrupt / forward-compat store.
          throw new Error(
            `ZuluTaskContinuity: refusing to checkpoint into read-only store: ${store.reason || "(unspecified)"}`
          );
        }

        const existing = store.records[unitId];
        const created = !existing;
        const priorRev = existing && Number.isFinite(existing.revision) ? existing.revision : 0;
        const record: ContinuityRecord = {
          unitId,
          state: stateCheck.value,
          writer: {
            slot: this.cleanTag(input.slot),
            chatId: this.cleanTag(input.chatId),
            host: this.host,
            pid: this.pid,
          },
          createdAt: existing?.createdAt && this.isIso(existing.createdAt) ? existing.createdAt : nowIso,
          updatedAt: nowIso,
          revision: priorRev + 1,
        };
        store.records[unitId] = record;
        this.writeStore(store);
        return { ok: true, record, created };
      });
    } catch (e) {
      if (e instanceof ZuluStoreLockTimeoutError) {
        return { ok: false, error: e.message };
      }
      throw e;
    }
  }

  /**
   * Read back the continuation record for a unit.
   *
   * @param unit MILESTONE::U-ID.
   * @param now  Optional explicit ISO now (test hermeticity).
   * @returns ResumeResult. `stale:true` when the record is older than 24h
   *          (by updatedAt) -- the caller should re-verify before trusting it.
   */
  resume(unit: string, now?: string): ResumeResult {
    const unitId = this.normalizeUnit(unit);
    if (!unitId) {
      return { found: false, error: `invalid unit id: expected MILESTONE::U-ID, got ${this.preview(unit)}` };
    }
    const store = this.readStore();
    // Read is allowed even in read-only mode (the corrupt file was already
    // rotated; readStore returns an empty record map) -- surface the reason.
    const record = store.records[unitId];
    if (!record) {
      const miss: ResumeResult = { found: false };
      if (store.readOnly) miss.reason = store.reason;
      return miss;
    }
    const nowMs = Date.parse(this.resolveNow(now) || new Date().toISOString());
    const updatedMs = Date.parse(record.updatedAt);
    const ageMs = Number.isFinite(nowMs) && Number.isFinite(updatedMs) ? Math.max(0, nowMs - updatedMs) : NaN;
    // Unknown age -> treat as stale (fail-safe: never present old state as fresh).
    const stale = Number.isFinite(ageMs) ? ageMs > STALE_AFTER_MS : true;
    return { found: true, record, stale, ageMs };
  }

  /**
   * List every active continuation record as a compact summary (no full state
   * payloads -- keeps the listing token-cheap for the dispatcher surface).
   *
   * @param now Optional explicit ISO now (test hermeticity).
   */
  listMidflights(now?: string): ListResult {
    const store = this.readStore();
    const nowMs = Date.parse(this.resolveNow(now) || new Date().toISOString());
    const midflights: MidflightSummary[] = [];
    for (const record of Object.values(store.records)) {
      const updatedMs = Date.parse(record.updatedAt);
      const ageMs = Number.isFinite(nowMs) && Number.isFinite(updatedMs) ? Math.max(0, nowMs - updatedMs) : NaN;
      const stale = Number.isFinite(ageMs) ? ageMs > STALE_AFTER_MS : true;
      midflights.push({
        unitId: record.unitId,
        slot: record.writer?.slot,
        chatId: record.writer?.chatId,
        updatedAt: record.updatedAt,
        ageMs: Number.isFinite(ageMs) ? ageMs : -1,
        stale,
        revision: record.revision,
      });
    }
    // Newest first.
    midflights.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    const out: ListResult = { ok: true, count: midflights.length, midflights };
    if (store.readOnly) {
      out.readOnly = true;
      out.reason = store.reason;
    }
    return out;
  }

  /**
   * Remove a unit's continuation record (called when a unit is committed/done).
   * @param unit MILESTONE::U-ID.
   * @returns true if a record was removed, false if none existed. THROWS on a
   *          read-only store (same fail-closed contract as checkpoint).
   */
  clear(unit: string): boolean {
    const unitId = this.normalizeUnit(unit);
    if (!unitId) return false;
    // Same cross-process lock as checkpoint. clear has no error channel (boolean),
    // so a lock timeout THROWS (fail-loud) -- consistent with its read-only throw.
    return this.withStoreLock((): boolean => {
      const store = this.readStore();
      if (store.readOnly) {
        throw new Error(
          `ZuluTaskContinuity: refusing to clear into read-only store: ${store.reason || "(unspecified)"}`
        );
      }
      if (!store.records[unitId]) return false;
      delete store.records[unitId];
      this.writeStore(store);
      return true;
    });
  }

  // --------------------------------------------------------------------------
  // Storage layer -- read + atomic write
  // --------------------------------------------------------------------------

  /**
   * Read the store. On parse failure or schema-version mismatch the store is
   * returned with `readOnly:true` (and the corrupt file rotated to
   * `.corrupt-<iso>`) so a writer NEVER clobbers a peer's data.
   */
  private readStore(): ReadStoreResult {
    if (!fs.existsSync(this.storePath)) {
      return { schemaVersion: SCHEMA_VERSION, records: {} };
    }
    let raw: string;
    try {
      raw = fs.readFileSync(this.storePath, "utf8");
    } catch (e) {
      return {
        schemaVersion: SCHEMA_VERSION,
        records: {},
        readOnly: true,
        reason: `read failed: ${(e as NodeJS.ErrnoException)?.code || (e as Error)?.message}`,
      };
    }
    if (raw.trim().length === 0) {
      return { schemaVersion: SCHEMA_VERSION, records: {} };
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      this.rotateCorrupt();
      return {
        schemaVersion: SCHEMA_VERSION,
        records: {},
        readOnly: true,
        reason: `parse failed: ${(e as Error)?.message} -- corrupt file preserved`,
      };
    }
    const asStore = parsed as Partial<StoreShape>;
    if (typeof parsed !== "object" || parsed === null || typeof asStore.records !== "object" || asStore.records === null) {
      return {
        schemaVersion: SCHEMA_VERSION,
        records: {},
        readOnly: true,
        reason: "schema-shape failure: missing records map",
      };
    }
    const sv = asStore.schemaVersion;
    if (sv !== SCHEMA_VERSION) {
      // FAIL-CLOSED: a newer-schema peer must never be clobbered by older code.
      // (An older-schema file would be migrated here; v1 is the floor so any
      // mismatch today is forward-incompat -> refuse-write.)
      return {
        schemaVersion: SCHEMA_VERSION,
        records: {},
        readOnly: true,
        reason: `schema-version mismatch: file=${sv} engine=${SCHEMA_VERSION} (peer may be newer; refusing to clobber)`,
      };
    }
    // Drop malformed records rather than fail the whole read (a single bad row
    // must not deny resume of every other unit).
    const clean: Record<string, ContinuityRecord> = {};
    for (const [key, row] of Object.entries(asStore.records as Record<string, unknown>)) {
      if (this.isValidRecord(row)) clean[key] = row as ContinuityRecord;
    }
    return { schemaVersion: SCHEMA_VERSION, records: clean };
  }

  private writeStore(store: StoreShape): void {
    if ((store as ReadStoreResult).readOnly) {
      throw new Error(
        `ZuluTaskContinuity: refusing to write read-only store: ${(store as ReadStoreResult).reason || "(unspecified)"}`
      );
    }
    const dir = path.dirname(this.storePath);
    fs.mkdirSync(dir, { recursive: true });
    const payload = JSON.stringify({ schemaVersion: SCHEMA_VERSION, records: store.records }, null, 2);
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
    try { fs.unlinkSync(tmp); } catch { /* best-effort cleanup of leaked tmp */ }
    throw new Error(
      `ZuluTaskContinuity: atomic write failed after ${ATOMIC_RENAME_RETRIES} retries: ${lastErr?.message || "unknown"}`
    );
  }

  private rotateCorrupt(): void {
    const corruptPath = `${this.storePath}.corrupt-${new Date().toISOString().replace(/[:.]/g, "-")}`;
    try {
      fs.renameSync(this.storePath, corruptPath);
    } catch {
      /* best-effort: evidence preservation must not throw and mask the parse error */
    }
  }

  // --------------------------------------------------------------------------
  // Validation + helpers
  // --------------------------------------------------------------------------

  private isValidRecord(row: unknown): boolean {
    if (typeof row !== "object" || row === null) return false;
    const r = row as Partial<ContinuityRecord>;
    if (typeof r.unitId !== "string" || !UNIT_ID_RE.test(r.unitId)) return false;
    if (typeof r.state !== "object" || r.state === null) return false;
    if (typeof r.updatedAt !== "string" || !this.isIso(r.updatedAt)) return false;
    if (typeof r.createdAt !== "string" || !this.isIso(r.createdAt)) return false;
    if (typeof r.revision !== "number" || !Number.isFinite(r.revision)) return false;
    if (typeof r.writer !== "object" || r.writer === null) return false;
    return true;
  }

  private normalizeUnit(unit: unknown): string | null {
    if (typeof unit !== "string") return null;
    const trimmed = unit.trim();
    if (!UNIT_ID_RE.test(trimmed)) return null;
    return trimmed;
  }

  private validateState(state: unknown): { ok: boolean; value: Record<string, unknown>; error?: string } {
    if (typeof state !== "object" || state === null || Array.isArray(state)) {
      return { ok: false, value: {}, error: `state must be a non-null plain object, got ${this.preview(state)}` };
    }
    let serialized: string | undefined;
    try {
      serialized = JSON.stringify(state);
    } catch (e) {
      // Circular references / BigInt / etc. -- adversarial input.
      return { ok: false, value: {}, error: `state is not JSON-serializable: ${(e as Error)?.message}` };
    }
    if (serialized === undefined) {
      return { ok: false, value: {}, error: "state serialized to undefined" };
    }
    const bytes = Buffer.byteLength(serialized, "utf8");
    if (bytes > MAX_STATE_BYTES) {
      return { ok: false, value: {}, error: `state too large: ${bytes} bytes > ${MAX_STATE_BYTES} cap` };
    }
    // Round-trip to strip any non-plain values (functions, undefined props are
    // dropped by JSON.stringify) and guarantee what we persist is what we read.
    return { ok: true, value: JSON.parse(serialized) as Record<string, unknown> };
  }

  private resolveNow(now: unknown): string | null {
    if (now === undefined || now === null) return new Date().toISOString();
    if (typeof now !== "string") return null;
    const ms = Date.parse(now);
    // Reject NaN, negative, and non-finite timestamps (adversarial input).
    if (!Number.isFinite(ms) || ms < 0) return null;
    // Re-stamp to canonical ISO so the stored value is always well-formed.
    return new Date(ms).toISOString();
  }

  private isIso(s: unknown): boolean {
    if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}T/.test(s)) return false;
    return Number.isFinite(Date.parse(s));
  }

  private cleanTag(v: string | undefined): string | undefined {
    if (typeof v !== "string") return undefined;
    const t = v.trim();
    if (!t) return undefined;
    return t.slice(0, TAG_MAX_LEN);
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

  // --------------------------------------------------------------------------
  // Cross-process store lock (checkpoint/clear RMW) -- sync O_EXCL lockfile with
  // a stale/dead-PID reaper. Readers (resume/list) are lock-free: the atomic
  // rename means a reader always sees a complete store, never a torn one.
  // --------------------------------------------------------------------------

  private lockFilePath(): string {
    return `${this.storePath}.lock`;
  }

  /** process.kill(pid, 0): no signal sent, just an existence probe. EPERM = alive (not ours). */
  private pidAlive(pid: number): boolean {
    if (!Number.isInteger(pid) || pid <= 0) return false;
    try {
      process.kill(pid, 0);
      return true;
    } catch (e) {
      return (e as NodeJS.ErrnoException).code === "EPERM";
    }
  }

  /** A unique ownership token for one acquisition (the lock is held by content, not by an open fd). */
  private newLockNonce(): string {
    return `${this.pid}.${this.host}.${Date.now()}.${++this.lockSeq}`;
  }

  /** The nonce written into the current lock file, or null if absent/unreadable. */
  private readLockNonce(lockPath: string): string | null {
    try {
      const parsed = JSON.parse(fs.readFileSync(lockPath, "utf8")) as { nonce?: unknown };
      return typeof parsed.nonce === "string" ? parsed.nonce : null;
    } catch {
      return null;
    }
  }

  /** A parsed lock payload is stale if older than staleLockMs or held by a dead SAME-HOST PID. */
  private payloadIsStale(parsed: { pid?: number; host?: string; ts?: number }): boolean {
    if (typeof parsed.ts === "number" && Number.isFinite(parsed.ts) && Date.now() - parsed.ts > this.staleLockMs) {
      return true;
    }
    // Only a SAME-HOST holder's liveness is verifiable; a foreign-host lock is
    // reaped only by the ts-age check above (never kill a live remote holder).
    if (parsed.host === this.host && typeof parsed.pid === "number" && !this.pidAlive(parsed.pid)) {
      return true;
    }
    return false;
  }

  /**
   * Reap the lock IFF it is stale AND its bytes are UNCHANGED between the staleness
   * check and the unlink (snapshot-guard). A fresh lock another writer wrote in the
   * meantime has different bytes, so we never delete it -- this shrinks the
   * reap-collision window (two reapers can no longer both unlink a freshly-recreated
   * lock). An unreadable/corrupt/fieldless lock is treated as stale.
   * @returns true if reaped/already-gone (caller retries immediately); false if fresh.
   */
  private reapIfStale(lockPath: string): boolean {
    let snapshot: string;
    try {
      snapshot = fs.readFileSync(lockPath, "utf8");
    } catch {
      return true; // already gone / unreadable -> retry
    }
    let parsed: { pid?: number; host?: string; ts?: number } = {};
    try { parsed = JSON.parse(snapshot) as typeof parsed; } catch { /* corrupt -> stale */ }
    const corrupt = !snapshot || typeof parsed !== "object" || parsed === null || Object.keys(parsed).length === 0;
    if (!corrupt && !this.payloadIsStale(parsed)) return false; // fresh -> respect it
    try {
      // Snapshot-guard: only unlink if the file is STILL the exact stale bytes we
      // inspected; if a peer replaced it with a fresh lock, leave it (re-evaluate).
      if (fs.readFileSync(lockPath, "utf8") === snapshot) fs.unlinkSync(lockPath);
    } catch {
      /* gone / replaced under us -> fine, retry */
    }
    return true;
  }

  /**
   * Acquire the store lock (sync O_EXCL) and return an ownership token (nonce). The lock
   * is held by FILE CONTENT (our nonce), not an open fd. Verify-own-write: after creating
   * the lock we confirm our nonce survived on disk, so a racing reaper that clobbered our
   * fresh lock is detected (we retry instead of proceeding on a lock we no longer hold).
   * Reaps a stale holder (snapshot-guarded). THROWS ZuluStoreLockTimeoutError on exhaustion.
   */
  private acquireStoreLock(): string {
    const lockPath = this.lockFilePath();
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    for (let attempt = 0; attempt < this.lockRetries; attempt++) {
      const nonce = this.newLockNonce();
      try {
        const fd = fs.openSync(lockPath, "wx"); // wx = O_CREAT|O_EXCL: fails EEXIST if held
        try {
          fs.writeSync(fd, JSON.stringify({ pid: this.pid, host: this.host, ts: Date.now(), nonce }));
        } finally {
          try { fs.closeSync(fd); } catch { /* close best-effort; the file IS the lock */ }
        }
        // verify-own-write: confirm OUR nonce is what is on disk. A racing reaper that
        // unlinked our fresh lock and wrote its own between create and now is caught here.
        if (this.readLockNonce(lockPath) === nonce) return nonce;
        this.sleep(this.lockRetryMs); // lost the race -> back off and retry
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e; // unexpected fs error -> fail loud
        if (this.reapIfStale(lockPath)) continue; // reaped a stale/dead holder -> retry now
        this.sleep(this.lockRetryMs);
      }
    }
    throw new ZuluStoreLockTimeoutError(
      `could not acquire store lock after ${this.lockRetries} attempts: ${lockPath}`,
    );
  }

  /** Release the lock ONLY if we still own it (nonce match) -- never clobber a peer's lock. */
  private releaseStoreLock(token: string): void {
    try {
      if (this.readLockNonce(this.lockFilePath()) === token) fs.unlinkSync(this.lockFilePath());
    } catch {
      /* gone / not ours -> nothing to release */
    }
  }

  /** Run a writer's read-modify-write critical section under the cross-process store lock. */
  private withStoreLock<T>(critical: () => T): T {
    const token = this.acquireStoreLock();
    try {
      return critical();
    } finally {
      this.releaseStoreLock(token);
    }
  }
}

// ============================================================================
// Export singleton + class (class exported for tests)
// ============================================================================

export const zuluTaskContinuityEngine = ZuluTaskContinuityEngine.getInstance();
export { ZuluTaskContinuityEngine, SCHEMA_VERSION as ZULU_CONTINUITY_SCHEMA_VERSION, STALE_AFTER_MS, MAX_STATE_BYTES };
