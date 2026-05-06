/**
 * CrossSessionMemoryBridgeEngine — federate a recall query across every
 * per-worktree `memory.db` discovered by P15-U01's audit script and return
 * a merged, ranked top-K of hits with provenance.
 *
 * Milestone: INTEL-OLLAMA-OBSIDIAN-MS0 / P15-U02.
 *
 * Why this exists
 * ---------------
 * P15-U01 audited the per-worktree memory.db files but didn't query them.
 * This engine is the recall surface — given a prompt, it asks every DB
 * "what do you remember about X?", merges the answers, and ranks them so
 * Claude in chat A can see what chat B captured weeks ago.
 *
 * Schema-adaptive: each DB is read via an injected `DBReader` interface so
 * the engine can be unit-tested without sqlite, and so different DB
 * dialects (claude-memory vs swarm-memory) can use different readers
 * sharing the same merge/rank pipeline.
 *
 * Pure-keyword scoring (token-overlap × frequency) mirrors
 * ObsidianMemoryRagEngine for consistency. No embeddings dependency.
 *
 * @module engines/CrossSessionMemoryBridgeEngine
 */

const TOKEN_RE = /[a-z][a-z0-9_]{2,}/g;
const DEFAULT_TOP_K = 10;
const DEFAULT_MIN_SCORE = 0.5;
const DEFAULT_MAX_ROWS_PER_DB = 5000;
const MAX_TEXT_PREVIEW_CHARS = 1500;

export type DBClass = "claude-memory" | "swarm-memory" | "unknown";

export interface DBRow {
  /** The body text of one memory/message/event row. */
  text: string;
  /** Optional row metadata for traceability — id, timestamp, kind, etc. */
  metadata?: Record<string, unknown>;
}

export interface DBQueryResult {
  /** Absolute path of the DB this came from. */
  source_path: string;
  rows: DBRow[];
  /** Empty string on success; populated on read failure (DB skipped). */
  error: string;
}

export interface DBReader {
  /**
   * Read up to `maxRows` candidate rows from one DB. NEVER throws — read
   * failures land in the returned `error` field so a single broken DB
   * doesn't abort the federation.
   */
  readRows(dbPath: string, opts?: { maxRows?: number }): DBQueryResult;
}

export interface CrossSessionHit {
  source_path: string;
  source_class: DBClass;
  text: string;
  score: number;
  uniqueOverlap: number;
  metadata: Record<string, unknown>;
}

export interface RecallInput {
  /** User prompt. */
  query: string;
  /** Absolute paths of DBs to federate. Empty list → empty result. */
  dbPaths: readonly string[];
  /** Required: how to read rows. Driver injects better-sqlite3 backed reader. */
  reader: DBReader;
  /** Per-kind-merge top-K. Default 10. */
  topK?: number;
  /** Score floor; below this filtered out. Default 0.5. */
  minScore?: number;
  /** Hard cap on rows pulled per DB so a multi-million row DB can't OOM. */
  maxRowsPerDB?: number;
}

export interface RecallResult {
  ok: boolean;
  hits: CrossSessionHit[];
  scanned: number;             // total rows seen across all DBs
  dbsQueried: number;
  errors: Array<{ source_path: string; error: string }>;
  durationMs: number;
  query: string;
}

export class CrossSessionMemoryBridgeEngine {
  /**
   * Federate a recall query across N DBs and return top-K merged hits.
   * The reader is REQUIRED (no default sqlite import — keeps the engine
   * sqlite-free and unit-testable). Driver script wires up better-sqlite3.
   */
  recall(input: RecallInput): RecallResult {
    const start = Date.now();
    const result: RecallResult = {
      ok: true,
      hits: [],
      scanned: 0,
      dbsQueried: 0,
      errors: [],
      durationMs: 0,
      query: typeof input?.query === "string" ? input.query : "",
    };

    if (!input || typeof input !== "object") {
      result.ok = false;
      result.errors.push({ source_path: "(input)", error: "input required" });
      result.durationMs = Date.now() - start;
      return result;
    }
    if (typeof input.query !== "string" || input.query.length === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }
    if (!input.reader || typeof input.reader.readRows !== "function") {
      result.ok = false;
      result.errors.push({ source_path: "(input)", error: "reader.readRows required" });
      result.durationMs = Date.now() - start;
      return result;
    }
    if (!Array.isArray(input.dbPaths) || input.dbPaths.length === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }

    const topK = this.clampPositiveInt(input.topK, DEFAULT_TOP_K);
    const minScore = this.clampNonNegative(input.minScore, DEFAULT_MIN_SCORE);
    const maxRowsPerDB = this.clampPositiveInt(input.maxRowsPerDB, DEFAULT_MAX_ROWS_PER_DB);

    const queryTokens = this.tokenize(input.query);
    if (queryTokens.size === 0) {
      result.durationMs = Date.now() - start;
      return result;
    }

    const candidates: CrossSessionHit[] = [];
    for (const dbPath of input.dbPaths) {
      if (typeof dbPath !== "string" || dbPath.length === 0) continue;
      const cls = this.classifyDBPath(dbPath);
      let q;
      try { q = input.reader.readRows(dbPath, { maxRows: maxRowsPerDB }); }
      catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        result.errors.push({ source_path: dbPath, error: `reader-threw: ${msg.slice(0, 200)}` });
        continue;
      }
      if (!q || typeof q !== "object") {
        result.errors.push({ source_path: dbPath, error: "reader returned non-object" });
        continue;
      }
      result.dbsQueried++;
      if (typeof q.error === "string" && q.error.length > 0) {
        result.errors.push({ source_path: q.source_path ?? dbPath, error: q.error });
        continue;
      }
      if (!Array.isArray(q.rows)) continue;
      for (const row of q.rows) {
        result.scanned++;
        if (!row || typeof row !== "object" || typeof row.text !== "string" || row.text.length === 0) continue;
        const { score, uniqueOverlap } = this.scoreText(row.text, queryTokens);
        if (!Number.isFinite(score) || score < minScore || uniqueOverlap === 0) continue;
        candidates.push({
          source_path: q.source_path ?? dbPath,
          source_class: cls,
          text: row.text.length > MAX_TEXT_PREVIEW_CHARS
            ? row.text.slice(0, MAX_TEXT_PREVIEW_CHARS) + "\n[…truncated]"
            : row.text,
          score,
          uniqueOverlap,
          metadata: row.metadata && typeof row.metadata === "object" ? { ...row.metadata } : {},
        });
      }
    }

    candidates.sort((a, b) =>
      b.score - a.score
      || b.uniqueOverlap - a.uniqueOverlap
      || a.source_path.localeCompare(b.source_path),
    );
    result.hits = candidates.slice(0, topK);
    result.durationMs = Date.now() - start;
    return result;
  }

  /**
   * Score one text against query tokens. Returns:
   *   - score = uniqueOverlap × 4 + totalOccurrences × 0.5
   *   - uniqueOverlap = distinct query tokens present in text
   * Same shape as ObsidianMemoryRagEngine for consistency.
   */
  scoreText(text: string, queryTokens: Map<string, number>): { score: number; uniqueOverlap: number } {
    if (typeof text !== "string" || text.length === 0) return { score: 0, uniqueOverlap: 0 };
    if (!queryTokens || queryTokens.size === 0) return { score: 0, uniqueOverlap: 0 };
    const docTokens = this.tokenize(text);
    let unique = 0;
    let total = 0;
    for (const [t] of queryTokens) {
      const c = docTokens.get(t);
      if (c === undefined) continue;
      unique++;
      total += c;
    }
    return { score: unique * 4 + total * 0.5, uniqueOverlap: unique };
  }

  /** Tokenize text → Map<token, frequency>. Min length 3, lowercased. */
  tokenize(text: string): Map<string, number> {
    const out = new Map<string, number>();
    if (typeof text !== "string") return out;
    const words = text.toLowerCase().match(TOKEN_RE) ?? [];
    for (const w of words) out.set(w, (out.get(w) ?? 0) + 1);
    return out;
  }

  /** Same path classifier as CSMMemoryDBAuditEngine — kept here for self-containment. */
  classifyDBPath(p: string): DBClass {
    if (typeof p !== "string" || p.length === 0) return "unknown";
    const norm = p.replace(/\\/g, "/").toLowerCase();
    if (/(?:^|\/)\.claude\/memory\.db$/.test(norm)) return "claude-memory";
    if (/(?:^|\/)\.swarm\/memory\.db$/.test(norm)) return "swarm-memory";
    return "unknown";
  }

  // ---- private helpers ----

  private clampPositiveInt(v: unknown, fallback: number): number {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) return fallback;
    return Math.floor(v);
  }

  private clampNonNegative(v: unknown, fallback: number): number {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return fallback;
    return v;
  }
}

export const crossSessionMemoryBridgeEngine = new CrossSessionMemoryBridgeEngine();
