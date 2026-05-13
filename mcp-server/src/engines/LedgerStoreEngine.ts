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
const MIGRATION_SQL_DIR = path.join(HARNESS_ROOT, "mcp-server/src/migrations");

/**
 * Resolve the on-disk migration SQL file for a given ledger schema version.
 * Each version's DDL lives in its own file (`golf-ledger-v{n}.sql`) — this
 * lets `migrate(n)` re-read the correct script without the engine needing to
 * carry the SQL inline. The v1 file uses CREATE TABLE IF NOT EXISTS so it
 * doubles as the bootstrap; v2+ files contain pure ALTER + CREATE INDEX
 * statements guarded by the engine's own pragma table_info() check.
 */
export function getMigrationSqlPath(version: number): string {
  if (!Number.isInteger(version) || version < 1) {
    throw new Error(`LedgerStoreEngine.getMigrationSqlPath: invalid version ${version}`);
  }
  return path.join(MIGRATION_SQL_DIR, `golf-ledger-v${version}.sql`);
}

/** Back-compat alias for the v1-only path. */
const DEFAULT_MIGRATION_SQL_PATH = getMigrationSqlPath(1);

export const LEDGER_SCHEMA_VERSION = 2;

/**
 * Conversion factor for `cost_usd_micros`. The bug_attribution column stores
 * cost in 10⁻⁶ USD (1 USD = 1_000_000 micros) so SUM aggregates never drift.
 * Callers pass USD-decimal and read USD-decimal via the helper functions
 * below — the integer-micro representation never leaks past the engine.
 */
export const MICROS_PER_USD = 1_000_000;

/** Convert integer micro-USD (DB storage) → decimal USD (API surface). */
export function microsToUsd(micros: number): number {
  if (!Number.isFinite(micros)) return 0;
  return micros / MICROS_PER_USD;
}

/** Convert decimal USD (API surface) → integer micro-USD (DB storage). */
export function usdToMicros(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd * MICROS_PER_USD);
}

const BUSY_TIMEOUT_MS = 5_000;
const MAX_TEXT_BYTES = 16_384;   // bound any free-text column the caller passes
const MAX_PAYLOAD_JSON_BYTES = 65_536;
const MAX_QUERY_PARAMS = 64;
const MAX_QUERY_ROWS = 10_000;
const DISPATCH_PROMPT_MAX_BYTES = 64_000;   // B5: bound dispatch_prompt size (Arm A P2)
const SCORE_WINDOW_MS_24H = 24 * 60 * 60 * 1_000;
/** Severity → score weight for getSlotScore24h. P0 worst → highest score. */
const SEVERITY_WEIGHT: Record<BugSeverity, number> = {
  P0: 100,
  P1: 25,
  P2: 5,
  P3: 1,
};

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
  /* v2 / U-CLEANUP-B5 — cost attribution + compaction-survival context. */
  tokens_spent: number;                       // total LLM tokens spent on the bug-handling
  cost_usd_micros: number;                    // cost in 10⁻⁶ USD; use microsToUsd() at API boundary
  agent_type: string | null;                  // e.g. "claude-opus-4-7", "ollama-deepseek-r1-14b"
  dispatch_prompt: string | null;             // verbatim reviewer/analysis prompt (truncated to ≤64KB)
  expected_files_json: string | null;         // JSON-stringified string[] of paths the dispatch was scoped to
  originating_tick_id: string | null;         // logical FK → peer_audit_ticks.tick_id
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

/**
 * Per-table input shapes (omit auto-managed columns: id, status defaults,
 * audit nulls). v2 / B5 update: bug_attribution inputs may include the 6 new
 * columns; all are optional with sensible engine defaults so legacy callers
 * still type-check.
 */
export type LedgerInsertInput =
  | { table: "bug_attribution"; row: Omit<BugAttributionRow,
      "id" | "resolved_at" | "resolved_by" | "resolution_note"
      | "tokens_spent" | "cost_usd_micros"
      | "agent_type" | "dispatch_prompt" | "expected_files_json" | "originating_tick_id"
    > & Partial<Pick<BugAttributionRow,
      "tokens_spent" | "cost_usd_micros"
      | "agent_type" | "dispatch_prompt" | "expected_files_json" | "originating_tick_id"
    >> }
  | { table: "peer_audit_ticks"; row: Omit<PeerAuditTickRow, "id" | "finished_at" | "findings_count" | "error_text"> & { findings_count?: number; meta_json?: string } }
  | { table: "chat_bus_signals"; row: Omit<ChatBusSignalRow, "id" | "consumed_at" | "consumed_by"> }
  | { table: "golf_envelope_mutations"; row: Omit<EnvelopeMutationRow, "id" | "applied_at" | "applier_chat" | "apply_error"> };

export type LedgerInsertResult =
  | { table: "bug_attribution"; row: BugAttributionRow }
  | { table: "peer_audit_ticks"; row: PeerAuditTickRow }
  | { table: "chat_bus_signals"; row: ChatBusSignalRow }
  | { table: "golf_envelope_mutations"; row: EnvelopeMutationRow };

/**
 * Input shape for `insertPreDispatchRow` — the compaction-survival row written
 * BEFORE a reviewer/agent is dispatched. Captures the inputs the result handler
 * will need to reconstruct context from disk if the originating chat compacts
 * before the reply lands. `summary` defaults to `"[pending result]"` and
 * `severity` defaults to `P3`; both should be updated by `resolveBug` (or a
 * follow-up UPDATE) once the dispatch returns. `cost_usd_micros` is computed
 * via `usdToMicros(opts.costUsdEstimate)` — callers pass USD-decimal.
 */
export interface BugPreDispatchInput {
  bug_id: string;
  originating_chat: string;
  commit_sha: string;
  file_paths_json: string;
  agent_type: string;
  dispatch_prompt: string;
  expected_files_json: string;
  originating_tick_id: string;
  detected_at: number;
  /** Optional severity at dispatch time (default P3 — re-classified at resolve). */
  severity?: BugSeverity;
  /** Optional summary at dispatch time (default `"[pending result]"`). */
  summary?: string;
  /** Optional token spend already incurred (default 0). */
  tokens_spent?: number;
  /** Optional cost-estimate IN USD-DECIMAL (default 0). Engine converts to micro-USD. */
  cost_usd_estimate?: number;
}

/** Per-slot rolling 24h score returned by `getSlotScore24h`. */
export interface SlotScore24h {
  slot: string;                         // originating_chat / "alpha".."golf" / "unknown"
  windowStartMs: number;                // detected_at lower bound used for the slice
  windowEndMs: number;                  // detected_at upper bound (= now)
  bugCount: number;                     // total bugs in window
  byCount: Record<BugSeverity, number>; // count per severity
  weightedScore: number;                // sum of SEVERITY_WEIGHT[sev]
  totalTokens: number;                  // sum tokens_spent across window
  totalCostUsd: number;                 // sum cost_usd_micros / MICROS_PER_USD (USD-decimal)
}

export interface MigrationResult {
  fromVersion: number;
  toVersion: number;
  appliedSqlBytes: number;
  alreadyAtVersion: boolean;
}

export interface LedgerStoreOptions {
  dbPath?: string;
  /**
   * Legacy / v1-only migration SQL path. Kept for backward compat with B10
   * tests. New code should rely on the version-resolved path via
   * `getMigrationSqlPath(version)`; override only for hermetic test setups.
   */
  migrationSqlPath?: string;
  /**
   * Per-version migration SQL path override (test seam). When set, takes
   * precedence over `migrationSqlPath` and the default version-resolver for
   * the specific version key.
   */
  migrationSqlPathByVersion?: Partial<Record<number, string>>;
  now?: () => number;
}

// ── ENGINE CLASS ─────────────────────────────────────────────────────────────

export class LedgerStoreEngine {
  private readonly dbPath: string;
  /** v1 migration path (legacy override). For v2+ use `resolveMigrationSqlPath`. */
  private readonly migrationSqlPath: string;
  /** Per-version SQL path overrides (test seam). */
  private readonly migrationSqlPathByVersion: Partial<Record<number, string>>;
  private readonly now: () => number;
  private db: DatabaseType | null = null;
  private stmts: {
    insertBug: Statement;
    insertPreDispatch: Statement;          // v2 / B5
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
    /** v2 / B5 — rolling 24h scoring stmt; param 1 = window-start ms, param 2 = window-end ms. */
    scoreWindowByChat: Statement;
  } | null = null;

  constructor(opts: LedgerStoreOptions = {}) {
    this.dbPath = opts.dbPath ?? DEFAULT_DB_PATH;
    this.migrationSqlPath = opts.migrationSqlPath ?? DEFAULT_MIGRATION_SQL_PATH;
    this.migrationSqlPathByVersion = opts.migrationSqlPathByVersion ?? {};
    this.now = opts.now ?? Date.now;
  }

  /**
   * Resolve the migration SQL file for a given version. Test overrides via
   * `migrationSqlPathByVersion[v]` (highest precedence), then legacy
   * `migrationSqlPath` (v1 only), then `getMigrationSqlPath(v)`.
   */
  private resolveMigrationSqlPath(version: number): string {
    const override = this.migrationSqlPathByVersion[version];
    if (override) return override;
    if (version === 1) return this.migrationSqlPath;
    return getMigrationSqlPath(version);
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

    // Apply v1 schema (idempotent — CREATE IF NOT EXISTS in the DDL covers both
    // fresh-DB and v1-already-applied cases).
    this.applyMigrationSql(db, 1);

    // Auto-bootstrap to LEDGER_SCHEMA_VERSION before compiling prepared
    // statements — otherwise statements that reference v2+ columns
    // (insertBug with tokens_spent / cost_usd_micros etc.) would fail to
    // compile on a fresh DB. The bootstrap is column-existence-gated so it's
    // safe to call on already-migrated DBs.
    this.bootstrapToCurrentVersion(db);

    // v2 / B5 — `insertBug` and `insertPreDispatch` share the SAME SQL so any
    // column addition to bug_attribution stays in sync between the two paths.
    // Two prepared statements (rather than one) for grep-ability: a future
    // reader can search `insertPreDispatch` and find the compaction-survival
    // codepath. SQLite prepared-statement compilation is <1ms — negligible
    // overhead vs the safety win.
    const INSERT_BUG_SQL = `
      INSERT INTO bug_attribution(
        bug_id, originating_chat, commit_sha, file_paths_json,
        severity, summary, detected_at,
        tokens_spent, cost_usd_micros,
        agent_type, dispatch_prompt, expected_files_json, originating_tick_id
      ) VALUES(
        @bug_id, @originating_chat, @commit_sha, @file_paths_json,
        @severity, @summary, @detected_at,
        @tokens_spent, @cost_usd_micros,
        @agent_type, @dispatch_prompt, @expected_files_json, @originating_tick_id
      )
    `;

    const stmts = {
      insertBug: db.prepare(INSERT_BUG_SQL),
      insertPreDispatch: db.prepare(INSERT_BUG_SQL),
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
      /**
       * v2 / B5 — per-slot rolling 24h score. Aggregates over `detected_at`
       * in the supplied window, grouped by `originating_chat` (the slot).
       * Rows with NULL originating_chat are mapped to "unknown" by the engine
       * post-query (SQL groups NULLs into one bucket).
       */
      scoreWindowByChat: db.prepare(`
        SELECT
          originating_chat,
          severity,
          COUNT(*)              AS n,
          SUM(tokens_spent)     AS tokens_total,
          SUM(cost_usd_micros)  AS cost_micros_total
        FROM bug_attribution
        WHERE detected_at >= @window_start_ms
          AND detected_at <  @window_end_ms
        GROUP BY originating_chat, severity
      `),
    };

    this.db = db;
    this.stmts = stmts;
    return { db, stmts };
  }

  /**
   * Read the recorded schema version from `ledger_meta`. Returns 0 if the row
   * is missing (fresh DB or pre-meta seed) — callers should treat 0 as "no
   * recorded version, but tables may already exist via the IF NOT EXISTS
   * DDL".
   */
  private readRecordedVersion(db: DatabaseType): number {
    const row = db.prepare(`SELECT value FROM ledger_meta WHERE key = ?`)
      .get("ledger_schema_version") as { value: string } | undefined;
    if (!row) return 0;
    const n = Number(row.value);
    return Number.isFinite(n) ? n : 0;
  }

  /**
   * Check whether `column` exists on `table` via `PRAGMA table_info`. Used by
   * the v2 migration guard so ALTER TABLE re-runs are skipped on already-
   * migrated DBs.
   */
  private columnExists(db: DatabaseType, table: string, column: string): boolean {
    const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return rows.some((r) => r.name === column);
  }

  /**
   * Apply a single version's migration SQL file. Versioned-path resolver
   * lets callers (incl. `migrate(2)`) target a specific file without
   * mutating engine state.
   */
  private applyMigrationSql(db: DatabaseType, version: number = 1): number {
    const sqlPath = this.resolveMigrationSqlPath(version);
    if (!existsSync(sqlPath)) {
      throw new Error(`LedgerStoreEngine: migration SQL not found at ${sqlPath} (version ${version})`);
    }
    const sql = readFileSync(sqlPath, "utf-8");
    db.exec(sql);
    return sql.length;
  }

  /**
   * Apply the v2 ALTER TABLEs with a pragma `table_info` guard so the file
   * is safe to replay on an already-v2 DB. Returns bytes of SQL ACTUALLY
   * applied — 0 when all columns already exist (Arm A P1 fix from 2026-05-13
   * scrutiny: was reporting non-zero bytes for the idempotent CREATE INDEX
   * IF NOT EXISTS DDL even when nothing changed; the `appliedSqlBytes` was
   * therefore misleading as a "did anything happen" signal).
   *
   * Layout: each ALTER + its companion index is checked independently. If a
   * subset of columns is already present (e.g. a partial migration that
   * crashed mid-way), only the missing ones are added — fail-loud-on-
   * inconsistency principle preserves the no-skip-with-silent-mismatch contract.
   */
  private applyV2GuardedMigrations(db: DatabaseType): number {
    let bytes = 0;
    let columnsAdded = 0;
    const requiredColumns: Array<{ name: string; ddl: string }> = [
      { name: "tokens_spent",         ddl: "ALTER TABLE bug_attribution ADD COLUMN tokens_spent INTEGER NOT NULL DEFAULT 0" },
      { name: "cost_usd_micros",      ddl: "ALTER TABLE bug_attribution ADD COLUMN cost_usd_micros INTEGER NOT NULL DEFAULT 0" },
      { name: "agent_type",           ddl: "ALTER TABLE bug_attribution ADD COLUMN agent_type TEXT" },
      { name: "dispatch_prompt",      ddl: "ALTER TABLE bug_attribution ADD COLUMN dispatch_prompt TEXT" },
      { name: "expected_files_json",  ddl: "ALTER TABLE bug_attribution ADD COLUMN expected_files_json TEXT" },
      { name: "originating_tick_id",  ddl: "ALTER TABLE bug_attribution ADD COLUMN originating_tick_id TEXT" },
    ];
    for (const col of requiredColumns) {
      if (!this.columnExists(db, "bug_attribution", col.name)) {
        db.exec(col.ddl + ";");
        bytes += col.ddl.length + 1;
        columnsAdded += 1;
      }
    }
    // Indexes are guarded by IF NOT EXISTS in the v2.sql file; safe to re-run
    // even when columns existed but the indexes were dropped. We use the
    // raw v2.sql path here so the engine's "indexes mirror what v2.sql
    // says" contract is enforced from a single source. Only count their
    // bytes against `appliedSqlBytes` when we actually added columns — if
    // no columns were added, the index re-creates are pure idempotent
    // replays and shouldn't show up in the "applied" total.
    const indexDdl = `
      CREATE INDEX IF NOT EXISTS idx_bug_attribution_tick  ON bug_attribution(originating_tick_id);
      CREATE INDEX IF NOT EXISTS idx_bug_attribution_agent ON bug_attribution(agent_type);
    `;
    db.exec(indexDdl);
    if (columnsAdded > 0) bytes += indexDdl.length;
    return bytes;
  }

  /**
   * Auto-bootstrap a freshly-opened DB to LEDGER_SCHEMA_VERSION. Called by
   * `ensureOpen` AFTER the v1 DDL is applied, BEFORE prepared statements
   * compile, so statements that reference v2+ columns are safe to compile.
   *
   * IMPORTANT — does NOT seed `ledger_meta.ledger_schema_version`. The first
   * call to `migrate(v)` owns the meta seed so the B10 contract
   * "first migrate is alreadyAtVersion=false" is preserved across the v2
   * schema bump. After bootstrap the DB is *physically* at v2 schema but the
   * meta row still reads 0 (or 1 if a v1-vintage DB was opened); `migrate(2)`
   * is what advances the recorded version.
   */
  private bootstrapToCurrentVersion(db: DatabaseType): void {
    if (LEDGER_SCHEMA_VERSION >= 2) {
      this.applyV2GuardedMigrations(db);
    }
  }

  // ── Generic API (per R3-VER1 spec) ────────────────────────────────────────

  /**
   * Advance the ledger schema to `version` (default = LEDGER_SCHEMA_VERSION).
   *
   * Idempotent: returns `alreadyAtVersion=true` when the recorded version is
   * already ≥ `version`. Supports v1 and v2 — pass an unsupported version and
   * the method throws per R12 "fail loud" (mis-config caught at the call site
   * rather than silently no-oping).
   *
   * Bootstrap interaction: `ensureOpen()` physically applies all DDL up to
   * LEDGER_SCHEMA_VERSION before this method ever runs, but deliberately does
   * NOT seed `ledger_meta.ledger_schema_version`. That seed happens HERE, so
   * the first public `migrate(v)` call correctly returns
   * `{fromVersion: 0, toVersion: v, alreadyAtVersion: false}` — the contract
   * "migrate applies DDL if not at version" stays meaningful even when the
   * underlying DDL is already physically in place.
   *
   * Forward-only: meta is never downgraded. `migrate(1)` on a v2-recorded DB
   * returns `alreadyAtVersion=true` because the DB is *at-least* at v1.
   */
  migrate(version: number = LEDGER_SCHEMA_VERSION): MigrationResult {
    if (!Number.isInteger(version) || version < 1 || version > LEDGER_SCHEMA_VERSION) {
      throw new Error(`LedgerStoreEngine.migrate: only v1..v${LEDGER_SCHEMA_VERSION} supported (got v${version})`);
    }
    const { db, stmts } = this.ensureOpen();
    const recorded = this.readRecordedVersion(db);
    if (recorded >= version) {
      return { fromVersion: recorded, toVersion: version, appliedSqlBytes: 0, alreadyAtVersion: true };
    }

    let bytes = 0;
    // recorded < 1 → apply v1 DDL (idempotent via CREATE IF NOT EXISTS).
    // ensureOpen() already did this physically, but re-running is cheap and
    // preserves the public-API contract that `migrate(1)` from version 0 is
    // observable work.
    if (recorded < 1 && version >= 1) {
      bytes += this.applyMigrationSql(db, 1);
    }
    // recorded < 2 AND target ≥ 2 → run the column-existence-guarded ALTERs
    // (already applied physically by ensureOpen; the guard makes this a
    // no-op for column presence but still reports byte-count for the
    // CREATE INDEX section).
    if (recorded < 2 && version >= 2) {
      bytes += this.applyV2GuardedMigrations(db);
    }
    // Forward-only: never overwrite a higher recorded version with a lower
    // requested one.
    const newRecorded = Math.max(recorded, version);
    stmts.setLedgerMeta.run("ledger_schema_version", String(newRecorded));
    return { fromVersion: recorded, toVersion: version, appliedSqlBytes: bytes, alreadyAtVersion: false };
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
      // v2 / B5 — validate optional fields if supplied
      if (r.expected_files_json !== undefined && r.expected_files_json !== null) {
        this.assertJsonArrayString(r.expected_files_json, "expected_files_json");
      }
      const info = stmts.insertBug.run({
        bug_id: r.bug_id,
        originating_chat: r.originating_chat,
        commit_sha: r.commit_sha,
        file_paths_json: r.file_paths_json,
        severity: r.severity,
        summary: this.truncate(r.summary ?? "", MAX_TEXT_BYTES),
        detected_at: this.assertEpochMs(r.detected_at, "detected_at"),
        // v2 / B5 — defaults for legacy callers that don't supply v2 fields
        tokens_spent: this.clampNonNegInt(r.tokens_spent),
        cost_usd_micros: this.clampNonNegInt(r.cost_usd_micros),
        agent_type: this.optionalText(r.agent_type, MAX_TEXT_BYTES),
        dispatch_prompt: this.optionalText(r.dispatch_prompt, DISPATCH_PROMPT_MAX_BYTES),
        expected_files_json: this.optionalText(r.expected_files_json, MAX_PAYLOAD_JSON_BYTES),
        originating_tick_id: this.optionalText(r.originating_tick_id, MAX_TEXT_BYTES),
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

  /**
   * v2 / B5 — write the pre-dispatch compaction-survival row.
   *
   * Called BEFORE the reviewer/agent is dispatched. Captures the full
   * reconstruction context (commit, files, agent, prompt, expected outputs,
   * originating tick) so the result handler can rebuild state from disk if
   * the originating chat compacts before the reviewer reply lands.
   *
   * `summary` defaults to `"[pending result]"` and `severity` to `P3`; the
   * result handler updates both via `resolveBug` (or a direct UPDATE) once
   * the reply lands. `cost_usd_estimate` is passed in USD-decimal and stored
   * as integer micro-USD — see header for the float-drift rationale.
   *
   * Returns the inserted row (matches `insert()` shape for ergonomics).
   */
  insertPreDispatchRow(input: BugPreDispatchInput): BugAttributionRow {
    const { db, stmts } = this.ensureOpen();
    this.assertText(input.bug_id, "bug_id");
    this.assertText(input.originating_chat, "originating_chat");
    this.assertText(input.commit_sha, "commit_sha");
    this.assertText(input.agent_type, "agent_type");
    // dispatch_prompt uses DISPATCH_PROMPT_MAX_BYTES (64KB), NOT MAX_TEXT_BYTES
    // (16KB) — reviewer prompts can be long. Validate non-empty separately
    // so the 16KB assertText cap doesn't pre-empt the documented 64KB truncate.
    this.assertNonEmptyString(input.dispatch_prompt, "dispatch_prompt");
    this.assertText(input.originating_tick_id, "originating_tick_id");
    this.assertJsonArrayString(input.file_paths_json, "file_paths_json");
    this.assertJsonArrayString(input.expected_files_json, "expected_files_json");
    const detectedAt = this.assertEpochMs(input.detected_at, "detected_at");
    const severity: BugSeverity = input.severity ?? "P3";
    this.assertSeverity(severity);
    const summary = this.truncate(input.summary ?? "[pending result]", MAX_TEXT_BYTES);
    const tokensSpent = this.clampNonNegInt(input.tokens_spent);
    const costMicros = usdToMicros(Number(input.cost_usd_estimate) || 0);
    const info = stmts.insertPreDispatch.run({
      bug_id: input.bug_id,
      originating_chat: input.originating_chat,
      commit_sha: input.commit_sha,
      file_paths_json: input.file_paths_json,
      severity,
      summary,
      detected_at: detectedAt,
      tokens_spent: tokensSpent,
      cost_usd_micros: costMicros,
      agent_type: this.truncate(input.agent_type, MAX_TEXT_BYTES),
      dispatch_prompt: this.truncate(input.dispatch_prompt, DISPATCH_PROMPT_MAX_BYTES),
      expected_files_json: this.truncate(input.expected_files_json, MAX_PAYLOAD_JSON_BYTES),
      originating_tick_id: this.truncate(input.originating_tick_id, MAX_TEXT_BYTES),
    });
    return db.prepare(`SELECT * FROM bug_attribution WHERE id = ?`)
      .get(info.lastInsertRowid) as BugAttributionRow;
  }

  /**
   * v2 / B5 — rolling 24-hour score for one slot (originating_chat). Returns
   * the per-severity breakdown, a single weighted score (sum of
   * `SEVERITY_WEIGHT[sev] * count`), total tokens spent and total USD cost
   * for the window.
   *
   * `windowMs` (optional, default 24h) lets callers compute shorter / longer
   * rolling windows without rewriting the SQL. `nowMs` (optional, default
   * `this.now()`) makes the window's upper bound injectable for hermetic
   * tests. The window is `[now - windowMs, now)` — closed-open to avoid
   * double-counting bugs that land exactly on a window boundary.
   */
  getSlotScore24h(slot: string, windowMs: number = SCORE_WINDOW_MS_24H, nowMs?: number): SlotScore24h {
    this.assertText(slot, "slot");
    const all = this.getSlotScoresAll24h(windowMs, nowMs);
    const found = all.find((s) => s.slot === slot);
    if (found) return found;
    // No bugs in window — return zero row anchored at the same window the
    // bulk method would have used so callers can compare apples-to-apples.
    const end = Number.isFinite(nowMs as number) ? Number(nowMs) : this.now();
    return {
      slot,
      windowStartMs: end - this.clampWindowMs(windowMs),
      windowEndMs: end,
      bugCount: 0,
      byCount: { P0: 0, P1: 0, P2: 0, P3: 0 },
      weightedScore: 0,
      totalTokens: 0,
      totalCostUsd: 0,
    };
  }

  /**
   * v2 / B5 — `getSlotScore24h` for all slots seen in the window. Slots with
   * zero bugs in the window are OMITTED (caller can fill in zero rows via
   * `getSlotScore24h(slot)` if a complete fleet snapshot is needed). NULL
   * `originating_chat` rows are bucketed under the literal slot `"unknown"`.
   *
   * SORT ORDER: returned array is sorted **highest-`weightedScore` first**
   * so leaderboard consumers can take the head without an extra .sort()
   * round-trip. Stable for ties (Array.prototype.sort is stable since ES2019).
   */
  getSlotScoresAll24h(windowMs: number = SCORE_WINDOW_MS_24H, nowMs?: number): SlotScore24h[] {
    const { stmts } = this.ensureOpen();
    const end = Number.isFinite(nowMs as number) ? Number(nowMs) : this.now();
    const win = this.clampWindowMs(windowMs);
    const start = end - win;
    const rows = stmts.scoreWindowByChat.all({
      window_start_ms: start,
      window_end_ms: end,
    }) as Array<{
      originating_chat: string | null;
      severity: BugSeverity;
      n: number;
      tokens_total: number | null;
      cost_micros_total: number | null;
    }>;
    // Reshape: SQL returns one row per (slot, severity); collapse to
    // one SlotScore24h per slot.
    const bySlot = new Map<string, SlotScore24h>();
    for (const r of rows) {
      const slot = r.originating_chat ?? "unknown";
      let s = bySlot.get(slot);
      if (!s) {
        s = {
          slot,
          windowStartMs: start,
          windowEndMs: end,
          bugCount: 0,
          byCount: { P0: 0, P1: 0, P2: 0, P3: 0 },
          weightedScore: 0,
          totalTokens: 0,
          totalCostUsd: 0,
        };
        bySlot.set(slot, s);
      }
      const sevWeight = SEVERITY_WEIGHT[r.severity] ?? 0;
      const n = Number(r.n) || 0;
      s.bugCount += n;
      s.byCount[r.severity] = (s.byCount[r.severity] ?? 0) + n;
      s.weightedScore += sevWeight * n;
      s.totalTokens += Number(r.tokens_total) || 0;
      s.totalCostUsd += microsToUsd(Number(r.cost_micros_total) || 0);
    }
    // Sort highest-score-first so callers consuming a leaderboard can take
    // the head without an extra .sort() round-trip.
    return Array.from(bySlot.values()).sort((a, b) => b.weightedScore - a.weightedScore);
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

  /**
   * Return the RECORDED schema version from `ledger_meta`. Note this may LAG
   * the physical schema: `ensureOpen()` applies all DDL up to
   * LEDGER_SCHEMA_VERSION but deliberately does NOT seed `ledger_meta` (so
   * the first public `migrate(v)` returns `alreadyAtVersion=false` per the
   * B10 contract). On a freshly-opened v1-vintage DB the physical schema is
   * already at v2 but `schemaVersion()` returns 1 (or 0 if v1.sql never
   * seeded the meta row) until the consumer invokes `migrate(2)`.
   *
   * If you need the PHYSICAL schema version (the columns that actually exist
   * on disk), call `physicalSchemaVersion()` instead. For the conventional
   * "is the DB ready for v2 reads/writes" check, prefer the physical one.
   */
  schemaVersion(): number {
    const { stmts } = this.ensureOpen();
    const row = stmts.getLedgerMeta.get("ledger_schema_version") as { value: string } | undefined;
    return row ? Number(row.value) : 0;
  }

  /**
   * Return the PHYSICAL schema version by probing `pragma table_info`. Reads
   * the v2 marker column (`cost_usd_micros`) — its presence implies all
   * other v2 columns are present too (the bootstrap is atomic per ALTER but
   * the column set is added together). Use this when the answer must
   * reflect on-disk schema reality (e.g. before a v2-only query).
   *
   * Returns 1 if only the v1 columns exist, 2 if the v2 columns are present.
   */
  physicalSchemaVersion(): number {
    const { db } = this.ensureOpen();
    return this.columnExists(db, "bug_attribution", "cost_usd_micros") ? 2 : 1;
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

  /**
   * v2 / B5 — non-empty-string validator without the MAX_TEXT_BYTES cap.
   * Used for fields with column-specific size caps (e.g. dispatch_prompt
   * uses DISPATCH_PROMPT_MAX_BYTES = 64 KB) — the caller applies the right
   * truncate() limit before INSERT.
   */
  private assertNonEmptyString(v: unknown, name: string): asserts v is string {
    if (typeof v !== "string" || v.length === 0) {
      throw new Error(`LedgerStoreEngine: ${name} must be a non-empty string`);
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

  /**
   * v2 / B5 — clamp an optional number to a non-negative integer. Used for
   * tokens_spent and cost_usd_micros where the SQL column is `INTEGER NOT
   * NULL DEFAULT 0` so undefined/null/negative/NaN inputs must all collapse
   * to 0 without throwing.
   */
  private clampNonNegInt(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return Math.floor(n);
  }

  /**
   * v2 / B5 — pass through an optional text column, truncating to `maxBytes`
   * if present. Returns null for missing/empty/non-string inputs so the SQL
   * NULL semantics are preserved (vs `truncate()` which returns "").
   */
  private optionalText(v: unknown, maxBytes: number): string | null {
    if (v === null || v === undefined) return null;
    if (typeof v !== "string") return null;
    if (v.length === 0) return null;
    return v.length <= maxBytes ? v : v.slice(0, maxBytes);
  }

  /**
   * v2 / B5 — clamp the rolling-window length to a sane range. Negative /
   * NaN / non-finite values fall back to 24h; values larger than 30 days
   * are clamped to 30 days to prevent accidentally pulling the entire
   * ledger into a single aggregation.
   */
  private clampWindowMs(v: unknown): number {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return SCORE_WINDOW_MS_24H;
    const maxMs = 30 * 24 * 60 * 60 * 1000;
    return Math.min(Math.floor(n), maxMs);
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

