// WIRE-EXEMPT: phase-0 seed for CLEANUP-MS0 — consumed by B6 cron (pending)
// + F8 golf dashboard (pending). No in-tree caller yet; the unit deliberately
// lands the projection primitive before its consumers per the spec's phasing.

/**
 * LedgerProjectorEngine — CLEANUP-MS0 / U-CLEANUP-B11 (R3-VER2)
 *
 * Projects the B10 SQLite ledger into JSONL files so the existing JSONL
 * consumers (chat-bus-inject hook, MILESTONE_PROGRESS readers, F3/F4/F5/F6
 * dashboards) keep working unchanged. SQLite is the source of truth; the
 * JSONLs are read-side views for legacy compatibility.
 *
 * DEVIATION FROM R3-VER2: spec says "in-process callback on every INSERT".
 * B10 LedgerStoreEngine has no event-emitter surface, so B11 uses cursor-
 * poll instead. B6 cron is the polling trigger. Net behaviour is identical
 * from the consumer side (JSONL advances after each ledger write), but
 * latency is bounded by cron cadence (typically 1-5 minutes) instead of
 * being sync-on-insert.
 *
 * DESIGN
 *   - Each ledger table projects to its own JSONL under state/shared/. Each
 *     projection tracks a cursor (the highest `id` projected so far) in a
 *     side-channel JSON file so re-runs are O(new-rows) not O(all-rows).
 *   - Cursor file at state/shared/.ledger-projector-cursors.json — schema v1
 *     with per-table `last_projected_id`. Tests inject a custom path.
 *   - **Atomic for the cursor** via tmp + rename. NOT atomic for the JSONL
 *     append on Windows when multiple processes write to the same file —
 *     `appendFileSync` from two processes can interleave at OS block
 *     boundaries. SINGLE-WRITER ONLY: B6 cron is the sole live writer in
 *     production; tests use distinct outputDir per case for isolation.
 *   - If the process dies mid-append, the cursor stays behind and the next
 *     run re-projects (potentially duplicating lines). Consumers must be
 *     idempotent on `id` field.
 *   - schemaVersion forward-compat: a future cursor file with
 *     `schemaVersion > 1` emits a stderr warning but is still readable
 *     (best-effort), matching the B3 git-log-tail convention.
 *
 * WORKTREE ISOLATION (R3-UU3-adjacent)
 *   - Default outputDir is derived from `repoRoot` (or env override) so a
 *     worktree caller writes JSONLs INSIDE its own worktree, not the main
 *     tree's `state/shared/`. The cross-worktree firewall pattern doesn't
 *     match `.jsonl` (currently `.json/.md` only), so this DI is the only
 *     guardrail. Document for B6 cron authors who run from H:/prism-* trees.
 *
 * CALLED BY (when wired)
 *   - B6 (golf cron) after every peer_audit_tick to advance the JSONL views.
 *   - F8 dashboard refresh.
 *   - Any test that wants to inspect projected output.
 *
 * @see H:/prism/state/shared/specs/GOLF-WATCHDOG-MS0-2026-05-13.md §R3-VER2
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, appendFileSync, renameSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { LedgerStoreEngine, getLedgerStoreEngine, type BugAttributionRow, type PeerAuditTickRow, type ChatBusSignalRow, type EnvelopeMutationRow } from "./LedgerStoreEngine.js";

// ── CONFIG ───────────────────────────────────────────────────────────────────

const HARNESS_ROOT = "H:/prism";
const DEFAULT_OUTPUT_DIR = "state/shared";
const DEFAULT_CURSOR_FILENAME = ".ledger-projector-cursors.json";

const CURSOR_SCHEMA_VERSION = 1;
const MAX_ROWS_PER_PROJECTION_RUN = 10_000;

const PROJECTION_FILES = Object.freeze({
  bug_attribution: "peer-bug-attribution.jsonl",
  peer_audit_ticks: "peer-audit-ticks.jsonl",
  chat_bus_signals: "peer-bus-signals.jsonl",
  golf_envelope_mutations: "golf-envelope-mutations.jsonl",
} as const);

type ProjectionTable = keyof typeof PROJECTION_FILES;
const ALL_TABLES: ReadonlyArray<ProjectionTable> = Object.freeze(["bug_attribution", "peer_audit_ticks", "chat_bus_signals", "golf_envelope_mutations"]);

export const LEDGER_PROJECTOR_LIMITS = Object.freeze({
  HARNESS_ROOT,
  DEFAULT_OUTPUT_DIR,
  DEFAULT_CURSOR_FILENAME,
  CURSOR_SCHEMA_VERSION,
  MAX_ROWS_PER_PROJECTION_RUN,
  PROJECTION_FILES,
});

// ── PUBLIC TYPES ─────────────────────────────────────────────────────────────

export interface ProjectionResult {
  table: ProjectionTable;
  outputPath: string;
  cursorBefore: number;
  cursorAfter: number;
  rowsProjected: number;
  truncated: boolean;
}

export interface ProjectAllResult {
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  perTable: ProjectionResult[];
  totalRowsProjected: number;
}

interface CursorFile {
  schemaVersion: number;
  cursors: Partial<Record<ProjectionTable, number>>;
  updatedAt: string | null;
}

export interface LedgerProjectorOptions {
  /** Repo root (for worktree isolation). Default: HARNESS_ROOT = "H:/prism". */
  repoRoot?: string;
  outputDir?: string;
  cursorPath?: string;
  ledger?: LedgerStoreEngine;
  now?: () => number;
}

// ── ENGINE CLASS ─────────────────────────────────────────────────────────────

export class LedgerProjectorEngine {
  private readonly outputDir: string;
  private readonly cursorPath: string;
  private readonly ledger: LedgerStoreEngine;
  private readonly now: () => number;

  constructor(opts: LedgerProjectorOptions = {}) {
    // Derive outputDir from repoRoot so worktree callers (H:/prism-<scope>/)
    // default to writing INSIDE their worktree. Explicit outputDir overrides
    // for tests + advanced callers.
    const repoRoot = opts.repoRoot ?? HARNESS_ROOT;
    this.outputDir = opts.outputDir ?? join(repoRoot, DEFAULT_OUTPUT_DIR);
    this.cursorPath = opts.cursorPath ?? join(this.outputDir, DEFAULT_CURSOR_FILENAME);
    this.ledger = opts.ledger ?? getLedgerStoreEngine();
    this.now = opts.now ?? Date.now;
  }

  /**
   * Project every supported table. Each table runs independently — a failure
   * on one doesn't block the others. Returns per-table stats + totals.
   */
  projectAll(): ProjectAllResult {
    const startedAt = this.now();
    const perTable: ProjectionResult[] = [];
    let totalRowsProjected = 0;
    for (const table of ALL_TABLES) {
      const result = this.projectTable(table);
      perTable.push(result);
      totalRowsProjected += result.rowsProjected;
    }
    const finishedAt = this.now();
    return {
      startedAt,
      finishedAt,
      durationMs: finishedAt - startedAt,
      perTable,
      totalRowsProjected,
    };
  }

  /**
   * Project a single table. Reads the persisted cursor, queries rows
   * `WHERE id > cursor ORDER BY id LIMIT MAX`, appends each as a JSONL
   * line, then advances the cursor.
   */
  projectTable(table: ProjectionTable): ProjectionResult {
    const cursorFile = this.loadCursorFile();
    const cursorBefore = cursorFile.cursors[table] ?? 0;
    const rows = this.queryNewRows(table, cursorBefore);
    const truncated = rows.length >= MAX_ROWS_PER_PROJECTION_RUN;

    const outputPath = join(this.outputDir, PROJECTION_FILES[table]);
    let rowsProjected = 0;
    let newCursor = cursorBefore;

    if (rows.length > 0) {
      mkdirSync(dirname(outputPath), { recursive: true });
      const lines = rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
      appendFileSync(outputPath, lines);
      rowsProjected = rows.length;
      newCursor = Number((rows[rows.length - 1] as { id: number }).id);
    }

    if (newCursor > cursorBefore) {
      cursorFile.cursors[table] = newCursor;
      this.saveCursorFile(cursorFile);
    }

    return {
      table,
      outputPath,
      cursorBefore,
      cursorAfter: newCursor,
      rowsProjected,
      truncated,
    };
  }

  /**
   * Reset cursors so the next `projectAll()` re-projects everything from id=0.
   * Existing JSONL files are NOT truncated — re-projection appends and consumers
   * must dedupe by `id`. Use `forceClear=true` to also delete the JSONL files.
   */
  resetCursors(opts: { forceClearJsonl?: boolean } = {}): void {
    this.saveCursorFile({ schemaVersion: CURSOR_SCHEMA_VERSION, cursors: {}, updatedAt: new Date(this.now()).toISOString() });
    if (opts.forceClearJsonl) {
      for (const table of ALL_TABLES) {
        const p = join(this.outputDir, PROJECTION_FILES[table]);
        if (existsSync(p)) {
          try { unlinkSync(p); } catch { /* best-effort */ }
        }
      }
    }
  }

  /** Read-only inspection. */
  getCursor(table: ProjectionTable): number {
    return this.loadCursorFile().cursors[table] ?? 0;
  }

  /** Read-only inspection. */
  getAllCursors(): Partial<Record<ProjectionTable, number>> {
    return { ...this.loadCursorFile().cursors };
  }

  // ── Internals ─────────────────────────────────────────────────────────────

  private queryNewRows(table: ProjectionTable, cursor: number): Array<BugAttributionRow | PeerAuditTickRow | ChatBusSignalRow | EnvelopeMutationRow> {
    const sql = `SELECT * FROM ${table} WHERE id > ? ORDER BY id ASC LIMIT ${MAX_ROWS_PER_PROJECTION_RUN}`;
    return this.ledger.query(sql, [cursor]) as Array<BugAttributionRow | PeerAuditTickRow | ChatBusSignalRow | EnvelopeMutationRow>;
  }

  private loadCursorFile(): CursorFile {
    if (!existsSync(this.cursorPath)) return this.emptyCursorFile();
    try {
      const parsed = JSON.parse(readFileSync(this.cursorPath, "utf-8"));
      if (!parsed || typeof parsed !== "object") return this.emptyCursorFile();
      const cursors: Partial<Record<ProjectionTable, number>> = {};
      const srcCursors = (parsed as { cursors?: Record<string, unknown> }).cursors;
      if (srcCursors && typeof srcCursors === "object") {
        for (const t of ALL_TABLES) {
          const v = Number(srcCursors[t]);
          if (Number.isFinite(v) && v >= 0 && Number.isInteger(v)) {
            cursors[t] = v;
          }
        }
      }
      const sv = Number((parsed as { schemaVersion?: unknown }).schemaVersion);
      const updatedAt = typeof (parsed as { updatedAt?: unknown }).updatedAt === "string"
        ? (parsed as { updatedAt: string }).updatedAt
        : null;
      // Forward-compat warn: a future writer with schemaVersion > current
      // reader knows. Still return best-effort parsed cursors, but flag so
      // operators see drift before the reader silently misinterprets.
      if (Number.isFinite(sv) && sv > CURSOR_SCHEMA_VERSION) {
        try {
          process.stderr.write(`LedgerProjectorEngine: unknown cursor schemaVersion=${sv} in ${this.cursorPath} (reader knows v${CURSOR_SCHEMA_VERSION}); attempting best-effort read\n`);
        } catch { /* ignore */ }
      }
      return {
        schemaVersion: Number.isFinite(sv) && sv > 0 ? sv : CURSOR_SCHEMA_VERSION,
        cursors,
        updatedAt,
      };
    } catch {
      return this.emptyCursorFile();
    }
  }

  private saveCursorFile(cf: CursorFile): void {
    const payload: CursorFile = {
      schemaVersion: CURSOR_SCHEMA_VERSION,
      cursors: cf.cursors,
      updatedAt: new Date(this.now()).toISOString(),
    };
    mkdirSync(dirname(this.cursorPath), { recursive: true });
    const tmp = `${this.cursorPath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    let tmpWritten = false;
    try {
      writeFileSync(tmp, JSON.stringify(payload, null, 2) + "\n");
      tmpWritten = true;
      renameSync(tmp, this.cursorPath);
    } catch (err) {
      if (tmpWritten) { try { unlinkSync(tmp); } catch { /* best-effort */ } }
      throw err;
    }
  }

  private emptyCursorFile(): CursorFile {
    return { schemaVersion: CURSOR_SCHEMA_VERSION, cursors: {}, updatedAt: null };
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

let _singleton: LedgerProjectorEngine | null = null;

export function getLedgerProjectorEngine(): LedgerProjectorEngine {
  if (_singleton === null) _singleton = new LedgerProjectorEngine();
  return _singleton;
}

export const ledgerProjectorEngine = {
  get instance(): LedgerProjectorEngine { return getLedgerProjectorEngine(); },
};
