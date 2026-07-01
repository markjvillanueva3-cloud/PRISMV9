/**
 * PrintCorpusTableWriter — append-only JSONL writer for the corpus-wide
 * print-scan inventory. Wraps PrintCorpusRow with an sha256-keyed byte-offset
 * index for O(1) lookup, resumable checkpoint, atomic writes under O_EXCL lock,
 * and a per-customer sub-table mirror.
 *
 * Storage layout (default DEFAULT_DIR):
 *   rows.jsonl            — append-only canonical record (one JSON-line per row)
 *   index.json            — { sha256: byteOffset } map for O(1) read(sha)
 *   checkpoint.json       — { shasSeen, lastScannedAt, totalRowsWritten } for
 *                           orchestrator resume
 *   by-customer/<slug>.jsonl — per-customer mirror (for 100% accuracy gate)
 *   .write.lock           — O_EXCL lock file (stale-locked after 30s)
 *
 * Concurrency:
 *   - Multiple orchestrator processes may write concurrently — the lock
 *     serialises Index + rows.jsonl updates; rows.jsonl is opened with O_APPEND
 *     so the kernel guarantees a single atomic append per write() call.
 *   - Reads (read, has, allShas, iterAllRows) are lock-free and tolerate
 *     concurrent appends (they snapshot index.json at call time).
 *
 * Idempotency:
 *   - write(row) returns { status: "already_exists" } when sourceSha256 already
 *     in the index — never produces a duplicate row.
 *
 * Used by PRINT-OCR-100PCT-MS0/U2 (orchestrator) as the corpus-level sink, by
 * U3 (accuracy proof harness) as the source of truth for coverage %, and by
 * U4 (wiki+tribal batch) as the pattern-mining input.
 */

import fs from "node:fs";
import path from "node:path";
import {
  PrintCorpusRowSchema,
  type PrintCorpusRow,
} from "../schemas/PrintCorpusRow.js";

const DEFAULT_DIR = "H:/prism/state/shared/print-corpus-tables";
const ROWS_FILE = "rows.jsonl";
const INDEX_FILE = "index.json";
const CHECKPOINT_FILE = "checkpoint.json";
const LOCK_FILE = ".write.lock";
const LOCK_STALE_MS = 30_000;
const LOCK_TIMEOUT_DEFAULT_MS = 5_000;
const LOCK_SPIN_MS = 25;
const READ_BUFFER_BYTES = 64 * 1024;
const CHECKPOINT_SCHEMA_VERSION = "1.0.0" as const;

export interface PrintCorpusWriteResult {
  status: "written" | "already_exists";
  rowId: string;
  byteOffset: number | null;
}

export interface PrintCorpusCheckpoint {
  schemaVersion: typeof CHECKPOINT_SCHEMA_VERSION;
  shasSeen: string[];
  lastScannedAt: string;
  totalRowsWritten: number;
}

export class PrintCorpusTableWriter {
  private readonly dir: string;

  constructor(dir: string = DEFAULT_DIR) {
    this.dir = dir;
    fs.mkdirSync(dir, { recursive: true });
    fs.mkdirSync(path.join(dir, "by-customer"), { recursive: true });
  }

  /** Path getter for orchestrator + harness introspection. */
  get directory(): string {
    return this.dir;
  }

  /** Acquire O_EXCL write lock. Stale-detect after 30s. */
  private acquireLock(timeoutMs: number = LOCK_TIMEOUT_DEFAULT_MS): number {
    const lockPath = path.join(this.dir, LOCK_FILE);
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        return fs.openSync(lockPath, "wx");
      } catch (e) {
        const err = e as NodeJS.ErrnoException;
        if (err.code !== "EEXIST") throw e;
        // Stale-lock detection: anything older than 30s gets reaped.
        try {
          const st = fs.statSync(lockPath);
          if (Date.now() - st.mtimeMs > LOCK_STALE_MS) {
            fs.unlinkSync(lockPath);
          }
        } catch {
          /* ignore — lock vanished between stat and unlink */
        }
        // Brief spin (busy-wait kept short to avoid hot loops).
        const until = Date.now() + LOCK_SPIN_MS;
        while (Date.now() < until) {
          /* spin */
        }
      }
    }
    throw new Error(
      `PrintCorpusTableWriter: lock acquire timeout after ${timeoutMs}ms`,
    );
  }

  private releaseLock(fd: number): void {
    try {
      fs.closeSync(fd);
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(path.join(this.dir, LOCK_FILE));
    } catch {
      /* ignore */
    }
  }

  private loadIndex(): Record<string, number> {
    const p = path.join(this.dir, INDEX_FILE);
    if (!fs.existsSync(p)) return {};
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      return {};
    }
  }

  private saveIndex(idx: Record<string, number>): void {
    const p = path.join(this.dir, INDEX_FILE);
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(idx));
    fs.renameSync(tmp, p);
  }

  /**
   * Write one row. Idempotent on sourceSha256 — returns "already_exists" when
   * the sha is already in the index (no duplicate row written, no index churn).
   */
  write(row: PrintCorpusRow): PrintCorpusWriteResult {
    // Schema-validate before locking — fail-fast on malformed input.
    PrintCorpusRowSchema.parse(row);

    const lockFd = this.acquireLock();
    try {
      const idx = this.loadIndex();
      if (Object.prototype.hasOwnProperty.call(idx, row.sourceSha256)) {
        return {
          status: "already_exists",
          rowId: row.rowId,
          byteOffset: idx[row.sourceSha256],
        };
      }

      const rowsPath = path.join(this.dir, ROWS_FILE);
      const fd = fs.openSync(rowsPath, "a");
      try {
        const offset = fs.fstatSync(fd).size;
        const line = JSON.stringify(row) + "\n";
        fs.writeSync(fd, line);
        fs.fsyncSync(fd);

        idx[row.sourceSha256] = offset;
        this.saveIndex(idx);

        if (row.customer) {
          const slug =
            row.customer.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) ||
            "unknown";
          const subPath = path.join(this.dir, "by-customer", `${slug}.jsonl`);
          fs.appendFileSync(subPath, line);
        }

        this.updateCheckpoint(row.sourceSha256, row.scannedAt);

        return { status: "written", rowId: row.rowId, byteOffset: offset };
      } finally {
        try {
          fs.closeSync(fd);
        } catch {
          /* ignore */
        }
      }
    } finally {
      this.releaseLock(lockFd);
    }
  }

  /** Read a row by sha256 (O(1) via the byte-offset index). */
  read(sha256: string): PrintCorpusRow | null {
    const idx = this.loadIndex();
    const offset = idx[sha256];
    if (offset === undefined) return null;

    const rowsPath = path.join(this.dir, ROWS_FILE);
    if (!fs.existsSync(rowsPath)) return null;
    const fd = fs.openSync(rowsPath, "r");
    try {
      const buf = Buffer.allocUnsafe(READ_BUFFER_BYTES);
      const bytesRead = fs.readSync(fd, buf, 0, buf.length, offset);
      const text = buf.subarray(0, bytesRead).toString("utf-8");
      const newline = text.indexOf("\n");
      const lineText = newline >= 0 ? text.slice(0, newline) : text;
      return PrintCorpusRowSchema.parse(JSON.parse(lineText));
    } finally {
      try {
        fs.closeSync(fd);
      } catch {
        /* ignore */
      }
    }
  }

  has(sha256: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.loadIndex(), sha256);
  }

  allShas(): string[] {
    return Object.keys(this.loadIndex());
  }

  readCheckpoint(): PrintCorpusCheckpoint | null {
    const p = path.join(this.dir, CHECKPOINT_FILE);
    if (!fs.existsSync(p)) return null;
    try {
      return JSON.parse(fs.readFileSync(p, "utf-8"));
    } catch {
      return null;
    }
  }

  private updateCheckpoint(sha256: string, scannedAt: string): void {
    const p = path.join(this.dir, CHECKPOINT_FILE);
    const existing = this.readCheckpoint();
    const cp: PrintCorpusCheckpoint = existing ?? {
      schemaVersion: CHECKPOINT_SCHEMA_VERSION,
      shasSeen: [],
      lastScannedAt: scannedAt,
      totalRowsWritten: 0,
    };
    if (!cp.shasSeen.includes(sha256)) {
      cp.shasSeen.push(sha256);
      cp.totalRowsWritten += 1;
    }
    cp.lastScannedAt = scannedAt;
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(cp, null, 2));
    fs.renameSync(tmp, p);
  }

  /** Stream all rows in write order. Malformed lines are skipped silently. */
  *iterAllRows(): Generator<PrintCorpusRow> {
    const rowsPath = path.join(this.dir, ROWS_FILE);
    if (!fs.existsSync(rowsPath)) return;
    const raw = fs.readFileSync(rowsPath, "utf-8");
    for (const line of raw.split("\n")) {
      if (!line.trim()) continue;
      try {
        yield PrintCorpusRowSchema.parse(JSON.parse(line));
      } catch {
        /* skip malformed (orchestrator crash mid-write would leave a partial) */
      }
    }
  }

  /** Total row count (cheap — uses index, not rows.jsonl). */
  totalRowCount(): number {
    return Object.keys(this.loadIndex()).length;
  }
}

export const defaultPrintCorpusTableWriter = new PrintCorpusTableWriter();
