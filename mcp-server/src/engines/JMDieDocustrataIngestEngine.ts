/**
 * JMDieDocustrataIngestEngine — JM-DIE-FINANCIAL-BASELINE-MS0 / U-JM01
 *
 * Walks the JM Die archive under `H:/PRISM/JM DIE/_PART LIBRARY/<customer>/<part>/<docs>`
 * and extracts structured ingest records: {customer, part_id, doc_filename, doc_date,
 * doc_extension, abs_path}.
 *
 * Date extraction strategy:
 *   - First: parse filename pattern `MM_DD_YYYY HH_MM AM/PM` (Brother MFC scanner default)
 *   - Second: fall back to file mtime (filesystem)
 *   - Third (R12 fail-loud): record reason="no-date-parseable" so the caller knows
 *
 * Per CLAUDE.md R5: pure traversal + parsing, no LLM calls.
 * Per CLAUDE.md R12: every parse failure is surfaced with an explicit reason field.
 *
 * @milestone JM-DIE-FINANCIAL-BASELINE-MS0/U-JM01-INGEST
 * @author slot:charlie /goal-14 iter1, 2026-05-24
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface IngestRecord {
  customer: string;
  part_id: string;
  doc_filename: string;
  doc_extension: string;
  doc_date: string | null; // ISO date YYYY-MM-DD or null
  date_source: "filename" | "mtime" | "none";
  abs_path: string;
  size_bytes: number;
  /** R12: non-null when parse failed in any way */
  reason?: string;
}

export interface IngestSummary {
  total_files_scanned: number;
  records: IngestRecord[];
  customers_seen: string[];
  parts_seen: number;
  errors: Array<{ path: string; reason: string }>;
}

// Filename date patterns commonly seen in JM Die archive
// "Scanned Document - MM_DD_YYYY HH_MM AM"
const FILENAME_DATE_RE = /(\d{1,2})_(\d{1,2})_(\d{4})\s+(\d{1,2})_(\d{2})\s+(AM|PM)/i;
// Bare MM_DD_YYYY (no time)
const FILENAME_DATE_BARE_RE = /(?:^|[^\d])(\d{1,2})_(\d{1,2})_(\d{4})(?:[^\d]|$)/;
// MM-DD-YYYY or MM/DD/YYYY
const FILENAME_DATE_DASH_RE = /(?:^|[^\d])(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[^\d]|$)/;

function parseDateFromFilename(filename: string): string | null {
  const tryDates: number[][] = [];
  let m = filename.match(FILENAME_DATE_RE);
  if (m) tryDates.push([parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]);
  m = filename.match(FILENAME_DATE_BARE_RE);
  if (m) tryDates.push([parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]);
  m = filename.match(FILENAME_DATE_DASH_RE);
  if (m) tryDates.push([parseInt(m[1], 10), parseInt(m[2], 10), parseInt(m[3], 10)]);

  for (const [mo, dy, yr] of tryDates) {
    if (mo < 1 || mo > 12) continue;
    if (dy < 1 || dy > 31) continue;
    if (yr < 1990 || yr > 2100) continue;
    // ISO YYYY-MM-DD
    const moPad = mo.toString().padStart(2, "0");
    const dyPad = dy.toString().padStart(2, "0");
    return `${yr}-${moPad}-${dyPad}`;
  }
  return null;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

export class JMDieDocustrataIngestEngine {
  /**
   * Walk a JM Die `_PART LIBRARY` root and return ingest records.
   * `opts.limit` — cap records (0 = unlimited, default 1000).
   * `opts.extensions` — restrict by extension (default ["pdf", "xlsx", "xls", "doc", "docx"]).
   */
  ingest(rootDir: string, opts: { limit?: number; extensions?: string[] } = {}): IngestSummary {
    const summary: IngestSummary = {
      total_files_scanned: 0,
      records: [],
      customers_seen: [],
      parts_seen: 0,
      errors: [],
    };

    if (!rootDir || typeof rootDir !== "string") {
      summary.errors.push({ path: String(rootDir), reason: "empty-or-missing-rootDir" });
      return summary;
    }
    if (!fs.existsSync(rootDir)) {
      summary.errors.push({ path: rootDir, reason: "rootDir-does-not-exist" });
      return summary;
    }
    if (!fs.statSync(rootDir).isDirectory()) {
      summary.errors.push({ path: rootDir, reason: "rootDir-not-a-directory" });
      return summary;
    }

    const limit = opts.limit ?? 1000;
    const extFilter = new Set((opts.extensions ?? ["pdf", "xlsx", "xls", "doc", "docx"]).map((e) => e.toLowerCase()));
    const customers = new Set<string>();
    const parts = new Set<string>();

    let customerDirs: string[] = [];
    try {
      customerDirs = fs.readdirSync(rootDir, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
    } catch (err) {
      summary.errors.push({ path: rootDir, reason: `readdir-failed:${err instanceof Error ? err.message : String(err)}` });
      return summary;
    }

    outer: for (const customer of customerDirs) {
      const customerPath = path.join(rootDir, customer);
      let partDirs: string[] = [];
      try {
        partDirs = fs.readdirSync(customerPath, { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name);
      } catch {
        continue; // skip unreadable customer dir
      }
      customers.add(customer);

      for (const partId of partDirs) {
        const partPath = path.join(customerPath, partId);
        let files: string[] = [];
        try {
          files = fs.readdirSync(partPath, { withFileTypes: true })
            .filter((d) => d.isFile())
            .map((d) => d.name);
        } catch {
          continue;
        }
        parts.add(`${customer}/${partId}`);

        for (const filename of files) {
          summary.total_files_scanned++;
          const ext = extOf(filename);
          if (extFilter.size > 0 && !extFilter.has(ext)) continue;

          const absPath = path.join(partPath, filename);
          let size = 0;
          let mtime: Date | null = null;
          try {
            const st = fs.statSync(absPath);
            size = st.size;
            mtime = st.mtime;
          } catch (err) {
            summary.errors.push({ path: absPath, reason: `stat-failed:${err instanceof Error ? err.message : String(err)}` });
            continue;
          }

          const dateFromFilename = parseDateFromFilename(filename);
          let docDate: string | null = dateFromFilename;
          let dateSource: IngestRecord["date_source"] = dateFromFilename ? "filename" : "none";
          if (!docDate && mtime) {
            docDate = mtime.toISOString().slice(0, 10);
            dateSource = "mtime";
          }

          const record: IngestRecord = {
            customer,
            part_id: partId,
            doc_filename: filename,
            doc_extension: ext,
            doc_date: docDate,
            date_source: dateSource,
            abs_path: absPath,
            size_bytes: size,
          };
          if (!docDate) record.reason = "no-date-parseable";
          summary.records.push(record);

          if (limit > 0 && summary.records.length >= limit) break outer;
        }
      }
    }

    summary.customers_seen = [...customers].sort();
    summary.parts_seen = parts.size;
    return summary;
  }
}

export const jmDieDocustrataIngestEngine = new JMDieDocustrataIngestEngine();
