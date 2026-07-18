/**
 * JMDieScanLedgerEngine — JM-DIE-FLEET-SCAN-MS0 / U-FS01
 *
 * Append-only JSONL ledger that tracks which files in the JM Die archive have
 * already been scanned. Lets the coordinator skip re-work across sessions +
 * across parallel agent batches. Idempotent: appending the same abs_path twice
 * is harmless (loadScanned() de-duplicates identical strings via Set -- but NOT
 * across path FORMATS; fold through canonScanPath before any membership test).
 *
 * Ledger row schema (JSONL):
 *   {
 *     abs_path: string,        // absolute path AS WRITTEN by the producer (format varies)
 *     sha_short?: string,      // first 8 hex of sha256(RAW abs_path) -- NOT a canonical key:
 *                              // it splits across path formats; use canonScanPath for dedup
 *     size_bytes: number,
 *     mtime_iso: string,
 *     scanned_at: string,      // ISO 8601
 *     source: "financial-baseline" | "program-analysis" | "fleet-scan-batch" | "seed",
 *     machine_family?: string,
 *     kind?: "cnc-program" | "docustrata" | "other"
 *   }
 *
 * Per R5: pure ledger I/O — no walking, no scoring. Per R12: missing dir →
 * created on demand (mkdir recursive); corrupt JSON lines are dropped with
 * a counted-error return, never silently swallowed.
 *
 * @milestone JM-DIE-FLEET-SCAN-MS0/U-FS01-SCAN-LEDGER
 * @author slot:charlie /goal-16 iter1, 2026-05-24
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

export type LedgerSource = "financial-baseline" | "program-analysis" | "fleet-scan-batch" | "seed";
export type LedgerKind = "cnc-program" | "docustrata" | "other";

export interface LedgerRow {
  abs_path: string;
  sha_short: string;
  size_bytes: number;
  mtime_iso: string;
  scanned_at: string;
  source: LedgerSource;
  machine_family?: string;
  kind?: LedgerKind;
}

export interface AppendInput {
  abs_path: string;
  size_bytes?: number;
  mtime_iso?: string;
  source: LedgerSource;
  machine_family?: string;
  kind?: LedgerKind;
}

export interface LedgerStats {
  ok: true;
  total_rows: number;
  unique_paths: number;
  by_source: Record<string, number>;
  by_kind: Record<string, number>;
  parse_errors: number;
  ledger_path: string;
}

const DEFAULT_LEDGER_PATH = "H:/prism/state/shared/scan-tracking/jm-die-scan-ledger.jsonl";

/**
 * Canonical COMPARISON key for an archive path: forward slashes + lowercase.
 * NTFS is case-insensitive and callers pass mixed roots ("H:/prism/JM DIE" vs
 * "H:/PRISM/JM DIE"), while the walker emits backslash absolutes -- a raw string
 * Set intersects to ZERO across formats. That made the batch planner report
 * to_scan == walked_files with 301,948 rows already on the ledger (2026-07-02):
 * every "scan the remainder" run would re-scan the whole 317K-file corpus and
 * double the ledger in a second path format. Stored rows keep their ORIGINAL
 * casing (display fidelity); this key is for membership/dedup ONLY.
 * NTFS-SCOPE key: the case-fold is safe because every comparison stays within
 * the one Windows corpus + its own ledger -- do NOT reuse this for membership
 * on a case-sensitive filesystem (two distinct files could canon-collide).
 */
export function canonScanPath(p: string): string {
  return p.replace(/\\/g, "/").toLowerCase();
}

function shaShort(absPath: string): string {
  return crypto.createHash("sha256").update(absPath).digest("hex").slice(0, 8);
}

export class JMDieScanLedgerEngine {
  private readonly ledgerPath: string;

  constructor(ledgerPath: string = DEFAULT_LEDGER_PATH) {
    this.ledgerPath = ledgerPath;
  }

  /** Resolved on-disk path of the ledger. */
  getPath(): string {
    return this.ledgerPath;
  }

  /** Append a batch of scanned files to the ledger atomically. Returns count appended. */
  appendBatch(inputs: AppendInput[]): { ok: true; appended: number; ledger_path: string } {
    if (!Array.isArray(inputs) || inputs.length === 0) {
      return { ok: true, appended: 0, ledger_path: this.ledgerPath };
    }
    const dir = path.dirname(this.ledgerPath);
    fs.mkdirSync(dir, { recursive: true });
    const nowIso = new Date().toISOString();
    const lines: string[] = [];
    for (const it of inputs) {
      if (!it || typeof it.abs_path !== "string" || it.abs_path.length === 0) continue;
      const row: LedgerRow = {
        abs_path: it.abs_path,
        sha_short: shaShort(it.abs_path),
        size_bytes: typeof it.size_bytes === "number" && it.size_bytes >= 0 ? it.size_bytes : 0,
        mtime_iso: typeof it.mtime_iso === "string" && it.mtime_iso.length > 0 ? it.mtime_iso : nowIso,
        scanned_at: nowIso,
        source: it.source,
      };
      if (it.machine_family) row.machine_family = it.machine_family;
      if (it.kind) row.kind = it.kind;
      lines.push(JSON.stringify(row));
    }
    if (lines.length === 0) {
      return { ok: true, appended: 0, ledger_path: this.ledgerPath };
    }
    fs.appendFileSync(this.ledgerPath, lines.join("\n") + "\n", "utf8");
    return { ok: true, appended: lines.length, ledger_path: this.ledgerPath };
  }

  /**
   * Returns the Set of RAW abs_paths already on the ledger. O(rows) one-shot read.
   * WARNING: raw strings -- the ledger mixes path formats (forward/backslash,
   * casing), so fold BOTH sides through canonScanPath before any membership
   * test, or you re-create the 2026-07-02 zero-intersect planner bug.
   * Parse errors are counted in the second return value; corrupt lines are
   * dropped, never silently treated as scanned (R12 fail-loud surfaces the
   * count to the caller).
   */
  loadScanned(): { paths: Set<string>; parse_errors: number } {
    const paths = new Set<string>();
    if (!fs.existsSync(this.ledgerPath)) return { paths, parse_errors: 0 };
    let parseErrors = 0;
    const raw = fs.readFileSync(this.ledgerPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      try {
        const row = JSON.parse(trimmed) as Partial<LedgerRow>;
        if (typeof row.abs_path === "string" && row.abs_path.length > 0) {
          paths.add(row.abs_path);
        } else {
          parseErrors++;
        }
      } catch {
        parseErrors++;
      }
    }
    return { paths, parse_errors: parseErrors };
  }

  /**
   * U-CROSS-PART-SYNERGY-FROM-JM-FLEET (iter17) — read every parseable ledger row.
   * O(rows) one-shot read. Corrupt lines are dropped (NOT silently surfaced as
   * scanned — caller can also call stats() if they need parse_error counts).
   * Throws when the ledger exists but cannot be read (permission, etc.) so the
   * caller can surface real errors instead of swallowing them. ENOENT remains
   * an empty-array return, since "ledger never written" is normal for cold shops.
   */
  readAllRows(): LedgerRow[] {
    if (!fs.existsSync(this.ledgerPath)) return [];
    const rows: LedgerRow[] = [];
    const raw = fs.readFileSync(this.ledgerPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      try {
        const row = JSON.parse(trimmed) as Partial<LedgerRow>;
        if (
          typeof row.abs_path === "string" && row.abs_path.length > 0 &&
          typeof row.sha_short === "string" &&
          typeof row.size_bytes === "number" &&
          typeof row.mtime_iso === "string" &&
          typeof row.scanned_at === "string" &&
          typeof row.source === "string"
        ) {
          rows.push(row as LedgerRow);
        }
      } catch {
        // Drop corrupt lines silently — stats() is the right surface for parse_errors.
      }
    }
    return rows;
  }

  /** Aggregate counts for operator surface + dispatcher action. */
  stats(): LedgerStats {
    const paths = new Set<string>();
    const bySource: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let parseErrors = 0;
    let totalRows = 0;
    if (!fs.existsSync(this.ledgerPath)) {
      return { ok: true, total_rows: 0, unique_paths: 0, by_source: {}, by_kind: {}, parse_errors: 0, ledger_path: this.ledgerPath };
    }
    const raw = fs.readFileSync(this.ledgerPath, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      totalRows++;
      try {
        const row = JSON.parse(trimmed) as Partial<LedgerRow>;
        if (typeof row.abs_path !== "string" || row.abs_path.length === 0) {
          parseErrors++;
          continue;
        }
        // unique_paths counts CANONICAL paths -- the same file written once with
        // forward slashes and once with backslashes is ONE file, not two.
        paths.add(canonScanPath(row.abs_path));
        const src = String(row.source ?? "unknown");
        bySource[src] = (bySource[src] ?? 0) + 1;
        if (row.kind) byKind[row.kind] = (byKind[row.kind] ?? 0) + 1;
      } catch {
        parseErrors++;
      }
    }
    return {
      ok: true,
      total_rows: totalRows,
      unique_paths: paths.size,
      by_source: bySource,
      by_kind: byKind,
      parse_errors: parseErrors,
      ledger_path: this.ledgerPath,
    };
  }
}

export const jmDieScanLedgerEngine = new JMDieScanLedgerEngine();
