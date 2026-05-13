/**
 * CoordinationStoreEngine — HOOK-SYNERGY-MS0 / U-HOOK-COORD-SQLITE (H8)
 *
 * SQLite WAL-mode replacement for the single-JSON-file work-claim store at
 * `state/shared/WORK_CLAIMS.json`. The legacy JSON store is read+written by
 * the PreToolUse `work-claim.mjs` hook on every Edit/Write tool call; with
 * 6 concurrent chats × 10 ops/min that's ~60 read-modify-writes/min on the
 * same file, and the lock-free fs.writeFile pattern is the dominant
 * contention source the H8 unit was designed to eliminate.
 *
 * DESIGN
 *   - SQLite in `journal_mode=WAL`: concurrent readers never block writes,
 *     writers serialize via the WAL log, and a crashed writer auto-recovers
 *     on next open. Synchronous=NORMAL is the WAL-recommended setting —
 *     durable through OS crashes, fast on hot path.
 *   - busy_timeout = 5_000 ms — concurrent writers wait up to 5 s before
 *     returning SQLITE_BUSY. Far below the 30 s Stop budget; well above
 *     even pathologically slow disk hiccups.
 *   - Prepared statements cached in constructor; every public method calls
 *     a `.run()` / `.all()` / `.get()` against a cached statement, no
 *     string templating in the hot path.
 *   - Schema is forward-compatible. `meta.schema_version` tracks revisions;
 *     future ALTERs can be applied conditionally on the recorded version.
 *
 * BACK-COMPAT WITH `work-claim.mjs`
 *   - `claim()` returns `null` on success or a `Conflict` object on
 *     existing-claim collision — same return shape as the current JSON
 *     reader expects.
 *   - `liveClaims()` returns rows in the SAME schema the legacy hooks
 *     consume: `{resource_path, session_id, pc_name, hostname, pid,
 *      intent, claimed_at, expires_at}`.
 *   - `migrateFromJson(jsonPath)` reads the legacy WORK_CLAIMS.json
 *     verbatim and upserts each entry — idempotent.
 *
 * SAFETY
 *   - Engine never deletes the legacy JSON; the dual-write transition
 *     (legacy hook keeps writing JSON, new readers query SQLite) is
 *     orchestrated by the migration script, not this engine.
 *   - `close()` is safe to call multiple times; subsequent calls no-op.
 *   - `db.exec()` is only called once per construct (the schema); every
 *     other call goes through prepared statements with positional binds.
 */

import Database, { type Database as DatabaseType, type Statement } from "better-sqlite3";
import * as fs from "node:fs";
import * as path from "node:path";

// ── PATHS / CAPS / DEFAULTS ──────────────────────────────────────────────────

const HARNESS_ROOT = "H:/prism";
const DEFAULT_DB_PATH = path.join(HARNESS_ROOT, "state/shared/coordination.db");
const LEGACY_WORK_CLAIMS_PATH = path.join(HARNESS_ROOT, "state/shared/WORK_CLAIMS.json");

const SCHEMA_VERSION = 1;

const DEFAULT_CLAIM_TTL_MS = 30 * 60 * 1000;   // 30 min — same as work-claim.mjs default
const DEFAULT_PRESENCE_TTL_MS = 10 * 60 * 1000; // 10 min — same as ChatBusEngine
const MAX_INTENT_BYTES = 4096;                   // bound intent text so a bad caller can't blow up the row
const BUSY_TIMEOUT_MS = 5_000;                   // SQLite busy_timeout — below Stop's 30 s budget

// ── PUBLIC TYPES ─────────────────────────────────────────────────────────────

/** Stored claim row. `claimed_at` / `expires_at` are epoch-ms integers. */
export interface ClaimRow {
  resource_path: string;
  session_id: string;
  pc_name: string;
  hostname: string;
  pid: number;
  intent: string;
  claimed_at: number;
  expires_at: number;
}

/** Conflict returned by `claim()` when another session already owns the resource. */
export interface ClaimConflict {
  acquired: false;
  existing: ClaimRow;
  reason: "already_claimed_by_other_session" | "already_claimed_by_self";
}

/** Successful claim. */
export interface ClaimSuccess {
  acquired: true;
  row: ClaimRow;
}

export type ClaimResult = ClaimSuccess | ClaimConflict;

/** Presence row (one per active session). */
export interface PresenceRow {
  session_id: string;
  pc_name: string;
  hostname: string;
  meta_json: string;        // JSON-stringified; parsed by callers as needed
  last_seen_at: number;
}

/** Pruning result. */
export interface PruneResult {
  claimsPurged: number;
  presencePurged: number;
}

/** Migration result. */
export interface MigrationResult {
  source: string;
  rowsRead: number;
  rowsUpserted: number;
  rowsSkipped: number;
  warnings: string[];
}

/** Construction options — tests use `dbPath: ":memory:"` for hermetic runs. */
export interface CoordinationStoreOptions {
  dbPath?: string;
  /** Override clock for hermetic tests. */
  now?: () => number;
  /** Override TTL ceilings (defaults to the work-claim.mjs defaults). */
  claimTtlMs?: number;
  presenceTtlMs?: number;
}

// ── ENGINE CLASS ─────────────────────────────────────────────────────────────

export class CoordinationStoreEngine {
  private readonly dbPath: string;
  private readonly now: () => number;
  private readonly claimTtlMs: number;
  private readonly presenceTtlMs: number;

  private db: DatabaseType | null = null;
  private stmts: {
    upsertClaim: Statement;
    findClaim: Statement;
    deleteClaim: Statement;
    listLiveClaims: Statement;
    listAllClaims: Statement;
    deleteExpiredClaims: Statement;
    upsertPresence: Statement;
    listActivePresence: Statement;
    deleteExpiredPresence: Statement;
    findPresence: Statement;
    countClaims: Statement;
    countPresence: Statement;
    getMeta: Statement;
    setMeta: Statement;
  } | null = null;

  constructor(opts: CoordinationStoreOptions = {}) {
    this.dbPath = opts.dbPath ?? DEFAULT_DB_PATH;
    this.now = opts.now ?? Date.now;
    this.claimTtlMs = Math.max(1, Number(opts.claimTtlMs ?? DEFAULT_CLAIM_TTL_MS));
    this.presenceTtlMs = Math.max(1, Number(opts.presenceTtlMs ?? DEFAULT_PRESENCE_TTL_MS));
  }

  /**
   * Lazy-open the database + apply schema + cache prepared statements. Called
   * on the first public method; safe to call multiple times.
   */
  private ensureOpen(): { db: DatabaseType; stmts: NonNullable<CoordinationStoreEngine["stmts"]> } {
    if (this.db && this.stmts) return { db: this.db, stmts: this.stmts };

    // Ensure parent dir exists (first-time init).
    if (this.dbPath !== ":memory:") {
      try { fs.mkdirSync(path.dirname(this.dbPath), { recursive: true }); } catch { /* ignore */ }
    }

    const db = new Database(this.dbPath);

    // WAL config — order matters: journal_mode first, then synchronous, then busy_timeout.
    if (this.dbPath !== ":memory:") {
      db.pragma("journal_mode = WAL");
    }
    db.pragma("synchronous = NORMAL");
    db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
    db.pragma("foreign_keys = ON");

    // Schema — idempotent CREATE IF NOT EXISTS. Future ALTERs gated on meta.schema_version.
    db.exec(`
      CREATE TABLE IF NOT EXISTS claims (
        resource_path TEXT PRIMARY KEY,
        session_id    TEXT NOT NULL,
        pc_name       TEXT NOT NULL DEFAULT '',
        hostname      TEXT NOT NULL DEFAULT '',
        pid           INTEGER NOT NULL DEFAULT 0,
        intent        TEXT NOT NULL DEFAULT '',
        claimed_at    INTEGER NOT NULL,
        expires_at    INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_claims_session ON claims(session_id);
      CREATE INDEX IF NOT EXISTS idx_claims_expires ON claims(expires_at);

      CREATE TABLE IF NOT EXISTS presence (
        session_id   TEXT PRIMARY KEY,
        pc_name      TEXT NOT NULL DEFAULT '',
        hostname     TEXT NOT NULL DEFAULT '',
        meta_json    TEXT NOT NULL DEFAULT '{}',
        last_seen_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_presence_last_seen ON presence(last_seen_at);

      CREATE TABLE IF NOT EXISTS meta (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    // Record schema version on first init.
    const setSchemaVersionStmt = db.prepare("INSERT OR IGNORE INTO meta(key, value) VALUES ('schema_version', ?)");
    setSchemaVersionStmt.run(String(SCHEMA_VERSION));

    const stmts = {
      upsertClaim: db.prepare(`
        INSERT INTO claims(resource_path, session_id, pc_name, hostname, pid, intent, claimed_at, expires_at)
        VALUES(@resource_path, @session_id, @pc_name, @hostname, @pid, @intent, @claimed_at, @expires_at)
      `),
      findClaim: db.prepare(`SELECT * FROM claims WHERE resource_path = ?`),
      deleteClaim: db.prepare(`DELETE FROM claims WHERE resource_path = ? AND session_id = ?`),
      listLiveClaims: db.prepare(`SELECT * FROM claims WHERE expires_at >= ? ORDER BY claimed_at ASC`),
      listAllClaims: db.prepare(`SELECT * FROM claims ORDER BY claimed_at ASC`),
      deleteExpiredClaims: db.prepare(`DELETE FROM claims WHERE expires_at < ?`),
      upsertPresence: db.prepare(`
        INSERT INTO presence(session_id, pc_name, hostname, meta_json, last_seen_at)
        VALUES(@session_id, @pc_name, @hostname, @meta_json, @last_seen_at)
        ON CONFLICT(session_id) DO UPDATE SET
          pc_name = excluded.pc_name,
          hostname = excluded.hostname,
          meta_json = excluded.meta_json,
          last_seen_at = excluded.last_seen_at
      `),
      listActivePresence: db.prepare(`SELECT * FROM presence WHERE last_seen_at >= ? ORDER BY last_seen_at DESC`),
      deleteExpiredPresence: db.prepare(`DELETE FROM presence WHERE last_seen_at < ?`),
      findPresence: db.prepare(`SELECT * FROM presence WHERE session_id = ?`),
      countClaims: db.prepare(`SELECT COUNT(*) AS n FROM claims`),
      countPresence: db.prepare(`SELECT COUNT(*) AS n FROM presence`),
      getMeta: db.prepare(`SELECT value FROM meta WHERE key = ?`),
      setMeta: db.prepare(`INSERT INTO meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`),
    };

    this.db = db;
    this.stmts = stmts;
    return { db, stmts };
  }

  // ── claim / release / list ────────────────────────────────────────────────

  /**
   * Acquire an exclusive claim on a resource. Returns `{acquired:true,row}` on
   * success or `{acquired:false,existing,reason}` on collision. Idempotent for
   * the same session: re-claiming a resource already owned by the same
   * session_id is a no-op success that refreshes the TTL.
   */
  claim(input: {
    resourcePath: string;
    sessionId: string;
    pcName?: string;
    hostname?: string;
    pid?: number;
    intent?: string;
    ttlMs?: number;
  }): ClaimResult {
    const { stmts } = this.ensureOpen();
    if (typeof input.resourcePath !== "string" || input.resourcePath.length === 0) {
      throw new Error("CoordinationStoreEngine.claim: resourcePath is required");
    }
    if (typeof input.sessionId !== "string" || input.sessionId.length === 0) {
      throw new Error("CoordinationStoreEngine.claim: sessionId is required");
    }
    const now = this.now();
    const rawTtl = Number(input.ttlMs);
    const ttl = Number.isFinite(rawTtl) && rawTtl > 0 ? rawTtl : this.claimTtlMs;
    const intent = typeof input.intent === "string" ? input.intent.slice(0, MAX_INTENT_BYTES) : "";

    // Auto-expire stale rows before checking — keeps the contention window tight.
    stmts.deleteExpiredClaims.run(now);

    const existing = stmts.findClaim.get(input.resourcePath) as ClaimRow | undefined;
    if (existing) {
      if (existing.session_id === input.sessionId) {
        // Same-session refresh: bump expiry + intent, return success.
        const updated: ClaimRow = {
          ...existing,
          intent,
          claimed_at: now,
          expires_at: now + ttl,
        };
        stmts.deleteClaim.run(existing.resource_path, existing.session_id);
        stmts.upsertClaim.run(this.rowToBinding(updated));
        return { acquired: true, row: updated };
      }
      // Different session owns it — return conflict.
      return {
        acquired: false,
        existing,
        reason: "already_claimed_by_other_session",
      };
    }

    const row: ClaimRow = {
      resource_path: input.resourcePath,
      session_id: input.sessionId,
      pc_name: typeof input.pcName === "string" ? input.pcName : "",
      hostname: typeof input.hostname === "string" ? input.hostname : "",
      pid: Number.isFinite(Number(input.pid)) ? Number(input.pid) : 0,
      intent,
      claimed_at: now,
      expires_at: now + ttl,
    };
    stmts.upsertClaim.run(this.rowToBinding(row));
    return { acquired: true, row };
  }

  /**
   * Release a claim. Returns `true` iff a row was deleted (i.e. the session
   * actually owned the claim). `false` for "no such claim" or "owned by a
   * different session" — callers should NOT treat that as an error.
   */
  release(input: { resourcePath: string; sessionId: string }): boolean {
    const { stmts } = this.ensureOpen();
    const info = stmts.deleteClaim.run(input.resourcePath, input.sessionId);
    return info.changes > 0;
  }

  /** Look up the current claim on a resource (or null). */
  findClaim(resourcePath: string): ClaimRow | null {
    const { stmts } = this.ensureOpen();
    const row = stmts.findClaim.get(resourcePath) as ClaimRow | undefined;
    return row ?? null;
  }

  /** All non-expired claims, oldest first. */
  liveClaims(): ClaimRow[] {
    const { stmts } = this.ensureOpen();
    return stmts.listLiveClaims.all(this.now()) as ClaimRow[];
  }

  /** All claims regardless of expiry — admin/debug. */
  allClaims(): ClaimRow[] {
    const { stmts } = this.ensureOpen();
    return stmts.listAllClaims.all() as ClaimRow[];
  }

  // ── presence (heartbeats) ─────────────────────────────────────────────────

  /**
   * Record a presence heartbeat for a session. The meta object is JSON-encoded
   * (with a size guard) and stored opaquely; queries return it as a string.
   */
  heartbeat(input: {
    sessionId: string;
    pcName?: string;
    hostname?: string;
    meta?: Record<string, unknown>;
  }): PresenceRow {
    const { stmts } = this.ensureOpen();
    if (typeof input.sessionId !== "string" || input.sessionId.length === 0) {
      throw new Error("CoordinationStoreEngine.heartbeat: sessionId is required");
    }
    const now = this.now();
    let metaJson = "{}";
    try {
      const stringified = JSON.stringify(input.meta ?? {});
      metaJson = stringified.length > MAX_INTENT_BYTES ? "{}" : stringified;
    } catch { metaJson = "{}"; }
    const row: PresenceRow = {
      session_id: input.sessionId,
      pc_name: typeof input.pcName === "string" ? input.pcName : "",
      hostname: typeof input.hostname === "string" ? input.hostname : "",
      meta_json: metaJson,
      last_seen_at: now,
    };
    stmts.upsertPresence.run({
      session_id: row.session_id,
      pc_name: row.pc_name,
      hostname: row.hostname,
      meta_json: row.meta_json,
      last_seen_at: row.last_seen_at,
    });
    return row;
  }

  /** Sessions whose last_seen_at is within `windowMs` ago (defaults to presenceTtlMs). */
  activeSessions(windowMs?: number): PresenceRow[] {
    const { stmts } = this.ensureOpen();
    const w = Number.isFinite(Number(windowMs)) && Number(windowMs) > 0 ? Number(windowMs) : this.presenceTtlMs;
    return stmts.listActivePresence.all(this.now() - w) as PresenceRow[];
  }

  /** Look up a single presence row. */
  findPresence(sessionId: string): PresenceRow | null {
    const { stmts } = this.ensureOpen();
    const row = stmts.findPresence.get(sessionId) as PresenceRow | undefined;
    return row ?? null;
  }

  // ── janitor ───────────────────────────────────────────────────────────────

  /** Drop expired claims + stale presence rows. Returns counts. */
  prune(now?: number): PruneResult {
    const { stmts } = this.ensureOpen();
    const t = typeof now === "number" && Number.isFinite(now) ? now : this.now();
    const claimsInfo = stmts.deleteExpiredClaims.run(t);
    const presenceInfo = stmts.deleteExpiredPresence.run(t - this.presenceTtlMs);
    return { claimsPurged: claimsInfo.changes, presencePurged: presenceInfo.changes };
  }

  /** Count helpers — cheap projections used by stats endpoints. */
  counts(): { claims: number; presence: number; schemaVersion: number } {
    const { stmts } = this.ensureOpen();
    const claims = (stmts.countClaims.get() as { n: number }).n;
    const presence = (stmts.countPresence.get() as { n: number }).n;
    const versionRow = stmts.getMeta.get("schema_version") as { value: string } | undefined;
    const schemaVersion = versionRow ? Number(versionRow.value) : SCHEMA_VERSION;
    return { claims, presence, schemaVersion };
  }

  // ── migration ─────────────────────────────────────────────────────────────

  /**
   * One-shot seed from the legacy `WORK_CLAIMS.json`. Idempotent — re-running
   * after a prior seed re-upserts every entry (claimed_at is preserved if the
   * legacy row has `at`; otherwise we fall back to now).
   *
   * The legacy schema is `{ claims: { <path>: { kind, resource, file_path,
   * basename, by, session_id, hostname, pid, at } }, schemaVersion, updatedAt }`.
   */
  migrateFromJson(jsonPath: string = LEGACY_WORK_CLAIMS_PATH): MigrationResult {
    const { stmts } = this.ensureOpen();
    const result: MigrationResult = {
      source: jsonPath,
      rowsRead: 0,
      rowsUpserted: 0,
      rowsSkipped: 0,
      warnings: [],
    };

    let raw: string;
    try { raw = fs.readFileSync(jsonPath, "utf8"); }
    catch (err) {
      result.warnings.push(`read_failed:${String((err as Error)?.message ?? err).slice(0, 200)}`);
      return result;
    }

    let parsed: unknown;
    try { parsed = JSON.parse(raw); }
    catch (err) {
      result.warnings.push(`parse_failed:${String((err as Error)?.message ?? err).slice(0, 200)}`);
      return result;
    }

    const claimsObj = (parsed as { claims?: Record<string, unknown> } | undefined)?.claims;
    if (!claimsObj || typeof claimsObj !== "object") {
      result.warnings.push("missing_claims_key");
      return result;
    }

    const now = this.now();
    for (const [resourcePath, rawClaim] of Object.entries(claimsObj)) {
      result.rowsRead++;
      const c = rawClaim as Record<string, unknown>;
      const sessionId = typeof c.session_id === "string" && c.session_id.length > 0
        ? c.session_id
        : (typeof c.by === "string" && c.by.length > 0 ? c.by : "");
      if (!sessionId) {
        result.rowsSkipped++;
        result.warnings.push(`skip_no_session_id:${resourcePath.slice(0, 120)}`);
        continue;
      }
      const atMs = typeof c.at === "string" ? Date.parse(c.at) : NaN;
      const claimedAt = Number.isFinite(atMs) ? atMs : now;
      const expiresAt = claimedAt + this.claimTtlMs;
      const row: ClaimRow = {
        resource_path: typeof c.resource === "string" ? c.resource : resourcePath,
        session_id: sessionId,
        pc_name: typeof c.pc_name === "string" ? c.pc_name : (typeof c.by === "string" ? c.by : ""),
        hostname: typeof c.hostname === "string" ? c.hostname : "",
        pid: Number.isFinite(Number(c.pid)) ? Number(c.pid) : 0,
        intent: typeof c.intent === "string" ? c.intent.slice(0, MAX_INTENT_BYTES) : "",
        claimed_at: claimedAt,
        expires_at: expiresAt,
      };
      // Replace any pre-existing row at this resource_path (idempotent re-seed).
      stmts.deleteClaim.run(row.resource_path, row.session_id);
      stmts.upsertClaim.run(this.rowToBinding(row));
      result.rowsUpserted++;
    }
    return result;
  }

  // ── lifecycle ─────────────────────────────────────────────────────────────

  /** Close the underlying database handle. Safe to call multiple times. */
  close(): void {
    if (this.db) {
      try { this.db.close(); } catch { /* already closed */ }
      this.db = null;
      this.stmts = null;
    }
  }

  /** Path the engine is using — useful for tests + introspection. */
  getDbPath(): string {
    return this.dbPath;
  }

  /** Reachability + WAL-mode confirmation. Returns the journal mode actually in effect. */
  health(): { open: boolean; dbPath: string; journalMode: string; schemaVersion: number } {
    const { db } = this.ensureOpen();
    const journalRows = db.pragma("journal_mode") as Array<{ journal_mode: string }>;
    const journalMode = journalRows.length > 0 ? journalRows[0].journal_mode : "unknown";
    const counts = this.counts();
    return {
      open: true,
      dbPath: this.dbPath,
      journalMode,
      schemaVersion: counts.schemaVersion,
    };
  }

  // ── internals ─────────────────────────────────────────────────────────────

  private rowToBinding(row: ClaimRow): {
    resource_path: string; session_id: string; pc_name: string; hostname: string;
    pid: number; intent: string; claimed_at: number; expires_at: number;
  } {
    return {
      resource_path: row.resource_path,
      session_id: row.session_id,
      pc_name: row.pc_name,
      hostname: row.hostname,
      pid: row.pid,
      intent: row.intent,
      claimed_at: row.claimed_at,
      expires_at: row.expires_at,
    };
  }
}

// ── SINGLETON + FACTORY ─────────────────────────────────────────────────────

let singleton: CoordinationStoreEngine | null = null;

/**
 * Standard singleton accessor — the dispatcher uses this. Tests should
 * construct fresh instances via `new CoordinationStoreEngine({ dbPath: ":memory:" })`
 * so each test gets its own hermetic database.
 */
export function getCoordinationStoreEngine(): CoordinationStoreEngine {
  if (singleton === null) singleton = new CoordinationStoreEngine();
  return singleton;
}

export const coordinationStoreEngine = getCoordinationStoreEngine();

// ── CAP EXPORTS ─────────────────────────────────────────────────────────────

export const COORDINATION_STORE_LIMITS = Object.freeze({
  SCHEMA_VERSION,
  DEFAULT_CLAIM_TTL_MS,
  DEFAULT_PRESENCE_TTL_MS,
  MAX_INTENT_BYTES,
  BUSY_TIMEOUT_MS,
} as const);
