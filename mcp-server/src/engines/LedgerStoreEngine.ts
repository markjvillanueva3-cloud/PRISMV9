/**
 * LedgerStoreEngine — CLEANUP-MS0 / U-CLEANUP-B10
 *
 * Domain ledger for the golf-slot watchdog + peer chats. Wraps the SAME
 * SQLite WAL database as `CoordinationStoreEngine` (state/shared/coordination.db)
 * via an independent connection — better-sqlite3 + WAL mode supports multiple
 * concurrent connections to the same file, so we get atomicity without sharing
 * a Database handle (which would couple lifecycle in a way that flaky-out either
 * engine's tests).
 *
 * TABLES (DDL in src/migrations/golf-ledger-v1.sql):
 *   bug_attribution         — per-bug audit trail (chat, commit, files, severity).
 *   peer_audit_ticks        — golf watchdog poll cycles (start/end/findings).
 *   chat_bus_signals        — structured cross-chat signals (replaces AGENT_CHAT.md chunks).
 *   golf_envelope_mutations — queued envelope mutations golf wants applied via R3-UU3.
 *   ledger_meta             — schema_version + key/value.
 *
 * API (per R3-VER1):
 *   insert(table, row)  — typed insert; returns the inserted row with `id` populated.
 *   query(sql, params)  — read-only SELECT proxy (rejects writes).
 *   migrate(version)    — apply the v1 DDL if not already at the requested version.
 *
 * Plus typed accessors per table: insertBugAttribution, listOpenBugs,
 * insertAuditTick, finishAuditTick, listRecentTicks, emitSignal, drainSignals,
 * queueEnvelopeMutation, listPendingMutations, markMutationApplied / rejected.
 *
 * SAFETY
 *   - Engine NEVER calls `.exec()` outside the schema-bootstrap path; all
 *     hot-path queries go through prepared statements with named binds.
 *   - `query()` rejects any statement that isn't `SELECT` / `WITH` so a caller
 *     cannot accidentally tamper with structured data via the free-form API.
 *   - `migrate(version)` is idempotent: re-running at v1 is a no-op via the
 *     `CREATE TABLE IF NOT EXISTS` form in the DDL plus a guard on
 *     ledger_meta.ledger_schema_version.
 *   - All callers MUST close the engine (or rely on `process.exit` cleanup);
 *     the connection is held until `close()` is called.
 *
 * @see H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §R3-VER1
 */

import Database, { type Database as DatabaseType, type Statement } from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import * as path from "node:path";

// ── PATHS / CAPS / DEFAULTS ──────────────────────────────────────────────────

const HARNESS_ROOT = "H:/prism";
const DEFAULT_DB_PATH = path.join(HARNESS_ROOT, "state/shared/coordination.db");
const DEFAULT_MIGRATION_SQL_PATH = path.join(
  HARNESS_ROOT,
  "mcp-server/src/migrations/golf-ledger-v1.sql"
);

export const LEDGER_SCHEMA_VERSION = 1;

const BUSY_TIMEOUT_MS = 5_000;
const MAX_TEXT_BYTES = 16_384;   // bound any free-text column the caller passes
const MAX_PAYLOAD_JSON_BYTES = 65_536;
const MAX_QUERY_PARAMS = 64;
const MAX_QUERY_ROWS = 10_000;

// ── PUBLIC TYPES ─────────────────────────────────────────────────────────────

export type LedgerTable =
  | "bug_attribution"
  | "peer_audit_ticks"
  | "chat_bus_signals"
  | "golf_envelope_mutations";

export type BugSeverity = "P0" | "P1" | "P2" | "P3";

export interface BugAttributionRow {
  id: number;
  bug_id: string;
  originating_chat: string;
  commit_sha: string;
  file_paths_json: string;        // JSON-stringified string[]
  severity: BugSeverity;
  summary: string;
  detected_at: number;
  resolved_at: number | null;
  resolved_by: string | null;
  resolution_note: string | null;
}

export interface PeerAuditTickRow {
  id: number;
  tick_id: string;
  started_at: number;
  finished_at: number | null;
  commits_seen: number;
  findings_count: number;
  status: "running" | "complete" | "failed" | "aborted";
  error_text: string | null;
  meta_json: string;
}

export interface ChatBusSignalRow {
  id: number;
  signal_id: string;
  from_chat: string;
  to_chat: string;
  signal_type: string;
  payload_json: string;
  emitted_at: number;
  consumed_at: number | null;
  consumed_by: string | null;
}

export interface EnvelopeMutationRow {
  id: number;
  mutation_id: string;
  target_path: string;
  json_patch: string;
  rationale: string;
  queued_at: number;
  applied_at: number | null;
  applier_chat: string | null;
  apply_error: string | null;
  status: "pending" | "applied" | "rejected" | "superseded";
}

/** Per-table input shapes (omit auto-managed columns: id, status defaults, audit nulls). */
export type LedgerInsertInput =
  | { table: "bug_attribution"; row: Omit<BugAttributionRow, "id" | "resolved_at" | "resolved_by" | "resolution_note"> }
  | { table: "peer_audit_ticks"; row: Omit<PeerAuditTickRow, "id" | "finished_at" | "findings_count" | "error_text"> & { findings_count?: number; meta_json?: string } }
  | { table: "chat_bus_signals"; row: Omit<ChatBusSignalRow, "id" | "consumed_at" | "consumed_by"> }
  | { table: "golf_envelope_mutations"; row: Omit<EnvelopeMutationRow, "id" | "applied_at" | "applier_chat" | "apply_error"> };

export type LedgerInsertResult =
  | { table: "bug_attribution"; row: BugAttributionRow }
  | { table: "peer_audit_ticks"; row: PeerAuditTickRow }
  | { table: "chat_bus_signals"; row: ChatBusSignalRow }
  | { table: "golf_envelope_mutations"; row: EnvelopeMutationRow };

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  appliedSqlBytes: number;
  alreadyAtVersion: boolean;
}

export interface LedgerStoreOptions {
  dbPath?: string;
  migrationSqlPath?: string;
  now?: () => number;
}

// ── ENGINE CLASS ─────────────────────────────────────────────────────────────

export class LedgerStoreEngine {
  private readonly dbPath: string;
  private readonly migrationSqlPath: string;
  private readonly now: () => number;
  private db: DatabaseType | null = null;
  private stmts: {
    insertBug: Statement;
    insertTick: Statement;
    finishTick: Statement;
    insertSignal: Statement;
    consumeSignal: Statement;
    insertMutation: Statement;
    markMutationApplied: Statement;
    markMutationRejected: Statement;
    listOpenBugs: Statement;
    listRecentTicks: Statement;
    listPendingSignals: Statement;
    listPendingMutations: Statement;
    getLedgerMeta: Statement;
    setLedgerMeta: Statement;
    countBugs: Statement;
    countTicks: Statement;
    countSignals: Statement;
    countMutations: Statement;
  } | null = null;

  constructor(opts: LedgerStoreOptions = {}) {
    this.dbPath = opts.dbPath ?? DEFAULT_DB_PATH;
    this.migrationSqlPath = opts.migrationSqlPath ?? DEFAULT_MIGRATION_SQL_PATH;
    this.now = opts.now ?? Date.now;
  }

  /** Lazy-open + bootstrap. Idempotent. */
  private ensureOpen(): { db: DatabaseType; stmts: NonNullable<LedgerStoreEngine["stmts"]> } {
    if (this.db && this.stmts) return { db: this.db, stmts: this.stmts };

    if (this.dbPath !== ":memory:") {
      try { mkdirSync(path.dirname(this.dbPath), { recursive: true }); } catch { /* ignore */ }
    }
    const db = new Database(this.dbPath);

    if (this.dbPath !== ":memory:") db.pragma("journal_mode = WAL");
    db.pragma("synchronous = NORMAL");
    db.pragma(`busy_timeout = ${BUSY_TIMEOUT_MS}`);
    db.pragma("foreign_keys = ON");

    // Apply schema (idempotent via CREATE IF NOT EXISTS in the DDL).
    this.applyMigrationSql(db);

    const stmts = {
      insertBug: db.prepare(`
        INSERT INTO bug_attribution(bug_id, originating_chat, commit_sha, file_paths_json, severity, summary, detected_at)
        VALUES(@bug_id, @originating_chat, @commit_sha, @file_paths_json, @severity, @summary, @detected_at)
      `),
      insertTick: db.prepare(`
        INSERT INTO peer_audit_ticks(tick_id, started_at, commits_seen, findings_count, status, meta_json)
        VALUES(@tick_id, @started_at, @commits_seen, @findings_count, @status, @meta_json)
      `),
      finishTick: db.prepare(`
        UPDATE peer_audit_ticks
           SET finished_at = @finished_at,
               findings_count = @findings_count,
               status = @status,
               error_text = @error_text
         WHERE tick_id = @tick_id
      `),
      insertSignal: db.prepare(`
        INSERT INTO chat_bus_signals(signal_id, from_chat, to_chat, signal_type, payload_json, emitted_at)
        VALUES(@signal_id, @from_chat, @to_chat, @signal_type, @payload_json, @emitted_at)
      `),
      consumeSignal: db.prepare(`
        UPDATE chat_bus_signals
           SET consumed_at = @consumed_at,
               consumed_by = @consumed_by
         WHERE signal_id = @signal_id AND consumed_at IS NULL
      `),
      insertMutation: db.prepare(`
        INSERT INTO golf_envelope_mutations(mutation_id, target_path, json_patch, rationale, queued_at, status)
        VALUES(@mutation_id, @target_path, @json_patch, @rationale, @queued_at, @status)
      `),
      markMutationApplied: db.prepare(`
        UPDATE golf_envelope_mutations
           SET status = 'applied',
               applied_at = @applied_at,
               applier_chat = @applier_chat,
               apply_error = NULL
         WHERE mutation_id = @mutation_id AND status = 'pending'
      `),
      markMutationRejected: db.prepare(`
        UPDATE golf_envelope_mutations
           SET status = 'rejected',
               applied_at = @applied_at,
               applier_chat = @applier_chat,
               apply_error = @apply_error
         WHERE mutation_id = @mutation_id AND status = 'pending'
      `),
      listOpenBugs: db.prepare(`
        SELECT * FROM bug_attribution
         WHERE resolved_at IS NULL
         ORDER BY detected_at DESC
         LIMIT ?
      `),
      listRecentTicks: db.prepare(`
        SELECT * FROM peer_audit_ticks
         ORDER BY started_at DESC
         LIMIT ?
      `),
      listPendingSignals: db.prepare(`
        SELECT * FROM chat_bus_signals
         WHERE consumed_at IS NULL
           AND (to_chat = ? OR to_chat = '*')
         ORDER BY emitted_at ASC
         LIMIT ?
      `),
      listPendingMutations: db.prepare(`
        SELECT * FROM golf_envelope_mutations
         WHERE status = 'pending'
         ORDER BY queued_at ASC
         LIMIT ?
      `),
      getLedgerMeta: db.prepare(`SELECT value FROM ledger_meta WHERE key = ?`),
      setLedgerMeta: db.prepare(`
        INSERT INTO ledger_meta(key, value) VALUES(?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `),
      countBugs: db.prepare(`SELECT COUNT(*) AS n FROM bug_attribution`),
      countTicks: db.prepare(`SELECT COUNT(*) AS n FROM peer_audit_ticks`),
      countSignals: db.prepare(`SELECT COUNT(*) AS n FROM chat_bus_signals`),
      countMutations: db.prepare(`SELECT COUNT(*) AS n FROM golf_envelope_mutations`),
    };

    this.db = db;
    this.stmts = stmts;
    return { db, stmts };
  }

  private applyMigrationSql(db: DatabaseType): number {
    if (!existsSync(this.migrationSqlPath)) {
      throw new Error(`LedgerStoreEngine: migration SQL not found at ${this.migrationSqlPath}`);
    }
    const sql = readFileSync(this.migrationSqlPath, "utf-8");
    db.exec(sql);
    return sql.length;
  }

  // ── Generic API (per R3-VER1 spec) ────────────────────────────────────────

  /**
   * Apply (or re-apply) the v1 DDL. Idempotent: returns alreadyAtVersion=true
   * if ledger_meta.ledger_schema_version already matches `version`.
   *
   * Bootstrap semantics: `ensureOpen()` runs the DDL so tables exist before
   * prepared statements compile, BUT does NOT seed `ledger_schema_version`.
   * That seed happens here, so a fresh-DB first call correctly returns
   * `{fromVersion:0, toVersion:1, alreadyAtVersion:false}` — the contract
   * "migrate applies DDL if not at version" stays meaningful.
   */
  migrate(version: number = LEDGER_SCHEMA_VERSION): MigrationResult {
    if (version !== LEDGER_SCHEMA_VERSION) {
      throw new Error(`LedgerStoreEngine.migrate: only v${LEDGER_SCHEMA_VERSION} is implemented (got v${version})`);
    }
    const { db, stmts } = this.ensureOpen();
    const row = stmts.getLedgerMeta.get("ledger_schema_version") as { value: string } | undefined;
    const current = row ? Number(row.value) : 0;
    if (current === version) {
      return { fromVersion: current, toVersion: version, appliedSqlBytes: 0, alreadyAtVersion: true };
    }
    // Re-apply DDL (idempotent) and bump meta. `applyMigrationSql` returns
    // the byte count so we don't re-read the file just to measure it.
    const sqlBytes = this.applyMigrationSql(db);
    stmts.setLedgerMeta.run("ledger_schema_version", String(version));
    return { fromVersion: current, toVersion: version, appliedSqlBytes: sqlBytes, alreadyAtVersion: false };
  }

  /**
   * Generic typed insert. Returns the full row with `id` populated and any
   * server-side defaults (status, etc.) materialized via a follow-up SELECT.
   */
  insert(input: LedgerInsertInput): LedgerInsertResult {
    const { db, stmts } = this.ensureOpen();
    if (input.table === "bug_attribution") {
      const r = input.row;
      this.assertText(r.bug_id, "bug_id");
      this.assertText(r.originating_chat, "originating_chat");
      this.assertText(r.commit_sha, "commit_sha");
      this.assertSeverity(r.severity);
      this.assertJsonArrayString(r.file_paths_json, "file_paths_json");
      const info = stmts.insertBug.run({
        bug_id: r.bug_id,
        originating_chat: r.originating_chat,
        commit_sha: r.commit_sha,
        file_paths_json: r.file_paths_json,
        severity: r.severity,
        summary: this.truncate(r.summary ?? "", MAX_TEXT_BYTES),
        detected_at: this.assertEpochMs(r.detected_at, "detected_at"),
      });
      const row = db.prepare(`SELECT * FROM bug_attribution WHERE id = ?`).get(info.lastInsertRowid) as BugAttributionRow;
      return { table: "bug_attribution", row };
    }
    if (input.table === "peer_audit_ticks") {
      const r = input.row;
      this.assertText(r.tick_id, "tick_id");
      this.assertEpochMs(r.started_at, "started_at");
      const info = stmts.insertTick.run({
        tick_id: r.tick_id,
        started_at: r.started_at,
        commits_seen: Math.max(0, Math.floor(Number(r.commits_seen) || 0)),
        findings_count: Math.max(0, Math.floor(Number(r.findings_count) || 0)),
        status: r.status ?? "running",
        meta_json: this.truncate(r.meta_json ?? "{}", MAX_PAYLOAD_JSON_BYTES),
      });
      const row = db.prepare(`SELECT * FROM peer_audit_ticks WHERE id = ?`).get(info.lastInsertRowid) as PeerAuditTickRow;
      return { table: "peer_audit_ticks", row };
    }
    if (input.table === "chat_bus_signals") {
      const r = input.row;
      this.assertText(r.signal_id, "signal_id");
      this.assertText(r.from_chat, "from_chat");
      this.assertText(r.signal_type, "signal_type");
      this.assertJsonObjectString(r.payload_json, "payload_json");
      const info = stmts.insertSignal.run({
        signal_id: r.signal_id,
        from_chat: r.from_chat,
        to_chat: r.to_chat ?? "*",
        signal_type: r.signal_type,
        payload_json: this.truncate(r.payload_json, MAX_PAYLOAD_JSON_BYTES),
        emitted_at: this.assertEpochMs(r.emitted_at, "emitted_at"),
      });
      const row = db.prepare(`SELECT * FROM chat_bus_signals WHERE id = ?`).get(info.lastInsertRowid) as ChatBusSignalRow;
      return { table: "chat_bus_signals", row };
    }
    if (input.table === "golf_envelope_mutations") {
      const r = input.row;
      this.assertText(r.mutation_id, "mutation_id");
      this.assertText(r.target_path, "target_path");
      this.assertJsonArrayString(r.json_patch, "json_patch");
      const info = stmts.insertMutation.run({
        mutation_id: r.mutation_id,
        target_path: r.target_path,
        json_patch: this.truncate(r.json_patch, MAX_PAYLOAD_JSON_BYTES),
        rationale: this.truncate(r.rationale ?? "", MAX_TEXT_BYTES),
        queued_at: this.assertEpochMs(r.queued_at, "queued_at"),
        status: r.status ?? "pending",
      });
      const row = db.prepare(`SELECT * FROM golf_envelope_mutations WHERE id = ?`).get(info.lastInsertRowid) as EnvelopeMutationRow;
      return { table: "golf_envelope_mutations", row };
    }
    // Unreachable by types — runtime guard for JS callers.
    const exhaustive: never = input;
    throw new Error(`LedgerStoreEngine.insert: unsupported table ${JSON.stringify(exhaustive)}`);
  }

  /**
   * Read-only SELECT proxy. REJECTS any SQL that doesn't begin with
   * SELECT/WITH after whitespace strip — prevents accidental mutations
   * through this generic API. For writes, use the typed methods.
   */
  query(sql: string, params: unknown[] = []): unknown[] {
    if (typeof sql !== "string" || sql.length === 0) {
      throw new Error("LedgerStoreEngine.query: sql must be a non-empty string");
    }
    const stripped = sql.trim().toLowerCase();
    if (!stripped.startsWith("select") && !stripped.startsWith("with")) {
      throw new Error("LedgerStoreEngine.query: only SELECT / WITH statements allowed");
    }
    if (!Array.isArray(params) || params.length > MAX_QUERY_PARAMS) {
      throw new Error(`LedgerStoreEngine.query: params must be an array of at most ${MAX_QUERY_PARAMS}`);
    }
    const { db } = this.ensureOpen();
    const stmt = db.prepare(sql);
    const rows = stmt.all(...params);
    return rows.length > MAX_QUERY_ROWS ? rows.slice(0, MAX_QUERY_ROWS) : rows;
  }

  // ── Typed accessors per table ─────────────────────────────────────────────

  listOpenBugs(limit = 100): BugAttributionRow[] {
    const { stmts } = this.ensureOpen();
    const lim = Math.min(Math.max(1, Math.floor(limit)), MAX_QUERY_ROWS);
    return stmts.listOpenBugs.all(lim) as BugAttributionRow[];
  }

  resolveBug(bug_id: string, resolved_by: string, resolution_note: string = ""): boolean {
    const { db } = this.ensureOpen();
    this.assertText(bug_id, "bug_id");
    this.assertText(resolved_by, "resolved_by");
    const info = db.prepare(`
      UPDATE bug_attribution
         SET resolved_at = ?, resolved_by = ?, resolution_note = ?
       WHERE bug_id = ? AND resolved_at IS NULL
    `).run(this.now(), resolved_by, this.truncate(resolution_note, MAX_TEXT_BYTES), bug_id);
    return info.changes > 0;
  }

  finishAuditTick(input: { tick_id: string; findings_count: number; status: "complete" | "failed" | "aborted"; error_text?: string | null }): boolean {
    const { stmts } = this.ensureOpen();
    this.assertText(input.tick_id, "tick_id");
    if (input.status !== "complete" && input.status !== "failed" && input.status !== "aborted") {
      throw new Error(`LedgerStoreEngine.finishAuditTick: invalid status ${input.status}`);
    }
    const info = stmts.finishTick.run({
      tick_id: input.tick_id,
      finished_at: this.now(),
      findings_count: Math.max(0, Math.floor(Number(input.findings_count) || 0)),
      status: input.status,
      error_text: input.error_text ?? null,
    });
    return info.changes > 0;
  }

  listRecentTicks(limit = 50): PeerAuditTickRow[] {
    const { stmts } = this.ensureOpen();
    const lim = Math.min(Math.max(1, Math.floor(limit)), MAX_QUERY_ROWS);
    return stmts.listRecentTicks.all(lim) as PeerAuditTickRow[];
  }

  drainSignalsFor(chat: string, limit = 100): ChatBusSignalRow[] {
    const { stmts } = this.ensureOpen();
    this.assertText(chat, "chat");
    const lim = Math.min(Math.max(1, Math.floor(limit)), MAX_QUERY_ROWS);
    return stmts.listPendingSignals.all(chat, lim) as ChatBusSignalRow[];
  }

  markSignalConsumed(signal_id: string, consumed_by: string): boolean {
    const { stmts } = this.ensureOpen();
    this.assertText(signal_id, "signal_id");
    this.assertText(consumed_by, "consumed_by");
    const info = stmts.consumeSignal.run({
      signal_id,
      consumed_at: this.now(),
      consumed_by,
    });
    return info.changes > 0;
  }

  listPendingMutations(limit = 100): EnvelopeMutationRow[] {
    const { stmts } = this.ensureOpen();
    const lim = Math.min(Math.max(1, Math.floor(limit)), MAX_QUERY_ROWS);
    return stmts.listPendingMutations.all(lim) as EnvelopeMutationRow[];
  }

  markMutationApplied(mutation_id: string, applier_chat: string): boolean {
    const { stmts } = this.ensureOpen();
    this.assertText(mutation_id, "mutation_id");
    this.assertText(applier_chat, "applier_chat");
    const info = stmts.markMutationApplied.run({
      mutation_id,
      applied_at: this.now(),
      applier_chat,
    });
    return info.changes > 0;
  }

  markMutationRejected(mutation_id: string, applier_chat: string, apply_error: string): boolean {
    const { stmts } = this.ensureOpen();
    this.assertText(mutation_id, "mutation_id");
    this.assertText(applier_chat, "applier_chat");
    const info = stmts.markMutationRejected.run({
      mutation_id,
      applied_at: this.now(),
      applier_chat,
      apply_error: this.truncate(apply_error ?? "", MAX_TEXT_BYTES),
    });
    return info.changes > 0;
  }

  // ── Diagnostics ───────────────────────────────────────────────────────────

  counts(): { bugs: number; ticks: number; signals: number; mutations: number } {
    const { stmts } = this.ensureOpen();
    const bugs = (stmts.countBugs.get() as { n: number }).n;
    const ticks = (stmts.countTicks.get() as { n: number }).n;
    const signals = (stmts.countSignals.get() as { n: number }).n;
    const mutations = (stmts.countMutations.get() as { n: number }).n;
    return { bugs, ticks, signals, mutations };
  }

  schemaVersion(): number {
    const { stmts } = this.ensureOpen();
    const row = stmts.getLedgerMeta.get("ledger_schema_version") as { value: string } | undefined;
    return row ? Number(row.value) : 0;
  }

  /** Close the underlying connection. Safe to call multiple times. */
  close(): void {
    if (this.db) {
      try { this.db.close(); } catch { /* best-effort */ }
      this.db = null;
      this.stmts = null;
    }
  }

  // ── Validators ────────────────────────────────────────────────────────────

  private assertText(v: unknown, name: string): asserts v is string {
    if (typeof v !== "string" || v.length === 0) {
      throw new Error(`LedgerStoreEngine: ${name} must be a non-empty string`);
    }
    if (v.length > MAX_TEXT_BYTES) {
      throw new Error(`LedgerStoreEngine: ${name} exceeds ${MAX_TEXT_BYTES} bytes`);
    }
  }

  private assertSeverity(v: unknown): asserts v is BugSeverity {
    if (v !== "P0" && v !== "P1" && v !== "P2" && v !== "P3") {
      throw new Error(`LedgerStoreEngine: severity must be one of P0..P3 (got ${JSON.stringify(v)})`);
    }
  }

  private assertEpochMs(v: unknown, name: string): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) {
      throw new Error(`LedgerStoreEngine: ${name} must be a non-negative integer epoch-ms (got ${JSON.stringify(v)})`);
    }
    return n;
  }

  private assertJsonArrayString(v: unknown, name: string): asserts v is string {
    if (typeof v !== "string") throw new Error(`LedgerStoreEngine: ${name} must be a JSON-stringified array`);
    if (v.length > MAX_PAYLOAD_JSON_BYTES) throw new Error(`LedgerStoreEngine: ${name} exceeds ${MAX_PAYLOAD_JSON_BYTES} bytes`);
    let parsed: unknown;
    try { parsed = JSON.parse(v); } catch { throw new Error(`LedgerStoreEngine: ${name} is not valid JSON`); }
    if (!Array.isArray(parsed)) throw new Error(`LedgerStoreEngine: ${name} must parse to an array`);
  }

  private assertJsonObjectString(v: unknown, name: string): asserts v is string {
    if (typeof v !== "string") throw new Error(`LedgerStoreEngine: ${name} must be a JSON-stringified object`);
    if (v.length > MAX_PAYLOAD_JSON_BYTES) throw new Error(`LedgerStoreEngine: ${name} exceeds ${MAX_PAYLOAD_JSON_BYTES} bytes`);
    let parsed: unknown;
    try { parsed = JSON.parse(v); } catch { throw new Error(`LedgerStoreEngine: ${name} is not valid JSON`); }
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error(`LedgerStoreEngine: ${name} must parse to an object`);
    }
  }

  private truncate(s: string, maxBytes: number): string {
    if (typeof s !== "string") return "";
    return s.length <= maxBytes ? s : s.slice(0, maxBytes);
  }
}

// ── Singleton (mirrors CoordinationStoreEngine pattern) ──────────────────────
//
// B2 (prism_dev wiring) consumes this engine as a singleton — instantiate-per-
// action would re-open the SQLite connection on every dispatcher call (~1ms
// overhead × 100s of calls/hour). Lazy construction via `let` + null guard so
// test code can still construct its own instance with a custom dbPath without
// touching the shared singleton's connection. Tests must NOT touch the
// singleton — they pass dbPath via `new LedgerStoreEngine({...})` directly.
//
// FIREWALL NOTE (R3-UU3): the singleton's default dbPath is
// `state/shared/coordination.db` (.db extension, NOT in the cross-worktree
// firewall pattern which matches .json/.md only). Worktree-side writes to
// coordination.db rely on SQLite WAL safety, not the firewall guarantee.
// If a future worktree-only hook needs to write to the ledger, it must
// either (a) pass `dbPath` pointing to a worktree-local DB, or (b) defer
// writes to a main-tree drainer (the R3-UU3 envelope-mutation pattern).

let _singleton: LedgerStoreEngine | null = null;

export function getLedgerStoreEngine(): LedgerStoreEngine {
  if (_singleton === null) _singleton = new LedgerStoreEngine();
  return _singleton;
}

/** Singleton accessor — preferred by B2 dispatcher wiring + B4/B5/B11 callers. */
export const ledgerStoreEngine = {
  get instance(): LedgerStoreEngine { return getLedgerStoreEngine(); },
};

