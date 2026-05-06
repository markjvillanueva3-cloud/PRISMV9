/**
 * CSMSqliteRowReaderFactory — produce a `DBReader` (the interface
 * CrossSessionMemoryBridgeEngine expects) backed by `better-sqlite3`.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U02.
 *
 * Why this exists
 * ---------------
 * CrossSessionMemoryBridgeEngine accepts an injected `DBReader` so it can
 * be unit-tested without sqlite. The dispatcher needs a real reader at
 * runtime — that's what this factory builds.
 *
 * Schema-adaptive: probes each DB for a recognized table (memories,
 * messages, events, sessions, _ai_memories) and reads its body column
 * (text, content, body, message). Schema mismatches return an empty rows
 * list with a non-empty error so the bridge engine skips them gracefully.
 *
 * Idempotent + read-only: opens with `readonly: true` so the audit /
 * recall pipeline can never corrupt source DBs.
 *
 * @module engines/CSMSqliteRowReaderFactory
 */

import type { DBReader, DBQueryResult, DBRow } from "./CrossSessionMemoryBridgeEngine.js";

const DEFAULT_MAX_ROWS = 5000;

/**
 * Tables to probe in priority order. First hit wins. Body columns are also
 * priority-ordered — we pick the first column that exists on the table.
 */
const TABLE_CANDIDATES: ReadonlyArray<{ table: string; bodyCols: string[] }> = [
  { table: "memories",      bodyCols: ["text", "content", "body", "message", "value"] },
  { table: "_ai_memories",  bodyCols: ["text", "content", "body", "message", "value"] },
  { table: "messages",      bodyCols: ["content", "text", "body", "message"] },
  { table: "events",        bodyCols: ["content", "text", "body", "data"] },
  { table: "sessions",      bodyCols: ["content", "text", "summary"] },
];

interface BetterSqliteDatabase {
  prepare(sql: string): {
    all(...params: unknown[]): Array<Record<string, unknown>>;
    get(...params: unknown[]): Record<string, unknown> | undefined;
  };
  close(): void;
}

export interface BetterSqliteCtor {
  new (path: string, opts: { readonly: boolean; fileMustExist: boolean }): BetterSqliteDatabase;
}

/**
 * Build a DBReader. Throws synchronously if better-sqlite3 isn't available
 * (or the injected ctor is null) so the dispatcher can surface that as an
 * environmental error. The optional `injectedCtor` parameter lets tests
 * pass a fake Database constructor — without it, the function uses
 * `require("better-sqlite3")` for the production path.
 */
export function createBetterSqliteRowReader(injectedCtor?: BetterSqliteCtor): DBReader {
  let Database: BetterSqliteCtor;
  if (injectedCtor) {
    Database = injectedCtor;
  } else {
    try {
      // require() is the only reliable way to do a synchronous lazy import in
      // a CJS-compatible build target — the alternative dynamic import() is async
      // and would force the entire dispatcher case to await this resolution.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      Database = require("better-sqlite3") as BetterSqliteCtor;
    } catch (err: unknown) {
      throw new Error(`better-sqlite3 not installed: ${(err as Error)?.message ?? String(err)}`);
    }
  }

  return {
    readRows(dbPath: string, opts: { maxRows?: number } = {}): DBQueryResult {
      // Validate dbPath FIRST before any string operation on it.
      if (typeof dbPath !== "string" || dbPath.length === 0) {
        return {
          source_path: typeof dbPath === "string" ? dbPath : "",
          rows: [],
          error: "dbPath must be a non-empty string",
        };
      }
      const out: DBQueryResult = {
        source_path: dbPath.replace(/\\/g, "/"),
        rows: [],
        error: "",
      };
      const maxRows = typeof opts.maxRows === "number" && Number.isFinite(opts.maxRows) && opts.maxRows > 0
        ? Math.floor(opts.maxRows)
        : DEFAULT_MAX_ROWS;

      let db: BetterSqliteDatabase;
      try {
        db = new Database(dbPath, { readonly: true, fileMustExist: true });
      } catch (err) {
        out.error = `open: ${(err as Error)?.message ?? String(err)}`;
        return out;
      }

      try {
        // Find the first candidate table that exists in this DB.
        const tablesRaw = db.prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
        ).all();
        const tableSet = new Set(tablesRaw.map((r) => String((r as { name: unknown }).name)));

        let chosen: { table: string; bodyCol: string } | null = null;
        for (const { table, bodyCols } of TABLE_CANDIDATES) {
          if (!tableSet.has(table)) continue;
          // Get this table's columns (PRAGMA table_info)
          // Quote the table name to defend against names with weird chars.
          const cols = db.prepare(`PRAGMA table_info("${table.replace(/"/g, '""')}")`).all();
          const colNames = new Set(cols.map((c) => String((c as { name: unknown }).name).toLowerCase()));
          const matched = bodyCols.find((bc) => colNames.has(bc.toLowerCase()));
          if (matched) { chosen = { table, bodyCol: matched }; break; }
        }
        if (!chosen) {
          out.error = `no recognized memory table found; tables present: ${[...tableSet].slice(0, 10).join(",")}`;
          return out;
        }

        // Read up to maxRows. Order by rowid DESC so newest rows come first
        // (heuristic: most recent activity is most relevant for recall).
        const sql =
          `SELECT * FROM "${chosen.table.replace(/"/g, '""')}" ORDER BY rowid DESC LIMIT ?`;
        const rawRows = db.prepare(sql).all(maxRows);
        const rows: DBRow[] = [];
        for (const r of rawRows) {
          const text = r[chosen.bodyCol];
          if (typeof text !== "string" || text.length === 0) continue;
          // Capture all other columns as metadata (lightly filtered to JSON-safe).
          const metadata: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(r)) {
            if (k === chosen.bodyCol) continue;
            if (v === null) continue;
            const t = typeof v;
            if (t === "string" || t === "number" || t === "boolean") {
              metadata[k] = v;
            } else if (Buffer.isBuffer?.(v)) {
              metadata[k] = `<Buffer ${v.length} bytes>`;
            } else {
              metadata[k] = String(v).slice(0, 200);
            }
          }
          rows.push({ text, metadata });
        }
        out.rows = rows;
      } catch (err) {
        out.error = `read: ${(err as Error)?.message ?? String(err)}`;
      } finally {
        try { db.close(); } catch { /* ignore close error */ }
      }
      return out;
    },
  };
}
