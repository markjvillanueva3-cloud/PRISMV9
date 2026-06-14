/**
 * ZipArchiveEngine — HCAP10 zip-archive structural model.
 *
 * Pure-core: caller drives the actual zip parsing (yauzl, adm-zip, etc.)
 * and supplies a list of entries; engine produces structure (counts,
 * compression ratio, deepest path depth, suspicious-pattern flags).
 *
 * Composes with U-HCAP02 ExcelStructure + U-HCAP03 PDFStructure when the
 * archive contains spreadsheets / PDFs.
 *
 * @module engines/ZipArchiveEngine
 */

import { z } from "zod";

export const ZipEntrySchema = z.object({
  path: z.string().min(1).max(2000),
  uncompressed_size: z.number().int().min(0),
  compressed_size: z.number().int().min(0),
  is_directory: z.boolean().default(false),
  crc32: z.number().int().optional(),
});
export type ZipEntry = z.infer<typeof ZipEntrySchema>;

export interface ZipStructure {
  archive_id: string;
  entry_count: number;
  file_count: number;
  directory_count: number;
  total_uncompressed: number;
  total_compressed: number;
  compression_ratio: number;
  max_depth: number;
  suspicious_entries: { path: string; reason: string }[];
}

const TRAVERSAL_RE = /\.\.[/\\]/;
const ABSOLUTE_RE = /^([/\\]|[A-Za-z]:[/\\])/;

function suspicionReason(entry: ZipEntry): string | null {
  if (TRAVERSAL_RE.test(entry.path)) return "path traversal '../' detected";
  if (ABSOLUTE_RE.test(entry.path)) return "absolute path";
  if (entry.uncompressed_size > 0 && entry.compressed_size > 0) {
    const ratio = entry.uncompressed_size / entry.compressed_size;
    if (ratio > 100) return `zip-bomb candidate: ratio ${ratio.toFixed(1)}`;
  }
  return null;
}

function pathDepth(p: string): number {
  return p.split(/[/\\]/).filter((s) => s.length > 0).length;
}

export class ZipArchiveEngine {
  static validateEntry(e: unknown): ZipEntry { return ZipEntrySchema.parse(e); }

  /** Analyze a list of entries → archive structure + suspicious-flags. */
  static analyze(archive_id: string, entries: readonly ZipEntry[]): ZipStructure {
    if (!archive_id) throw new Error("ZipArchive.analyze: archive_id required");
    if (!Array.isArray(entries)) throw new Error("ZipArchive.analyze: entries must be an array");
    for (const e of entries) ZipEntrySchema.parse(e);

    const file_count = entries.filter((e) => !e.is_directory).length;
    const directory_count = entries.filter((e) => e.is_directory).length;
    const total_uncompressed = entries.reduce((s, e) => s + e.uncompressed_size, 0);
    const total_compressed = entries.reduce((s, e) => s + e.compressed_size, 0);
    const compression_ratio = total_compressed === 0 ? 0 : total_uncompressed / total_compressed;
    const max_depth = entries.reduce((m, e) => Math.max(m, pathDepth(e.path)), 0);

    const suspicious_entries: ZipStructure["suspicious_entries"] = [];
    for (const e of entries) {
      const reason = suspicionReason(e);
      if (reason) suspicious_entries.push({ path: e.path, reason });
    }

    return {
      archive_id,
      entry_count: entries.length,
      file_count, directory_count,
      total_uncompressed, total_compressed,
      compression_ratio, max_depth,
      suspicious_entries,
    };
  }

  /** Filter entries by extension (after normalizing path separator). */
  static filterByExtension(entries: readonly ZipEntry[], ext: string): ZipEntry[] {
    const e = ext.startsWith(".") ? ext : `.${ext}`;
    const lc = e.toLowerCase();
    return entries.filter((entry) => !entry.is_directory && entry.path.toLowerCase().endsWith(lc));
  }

  static renderStructure(s: ZipStructure): string {
    const sus = s.suspicious_entries.length > 0 ? ` [⚠ ${s.suspicious_entries.length} suspicious]` : "";
    return `[ZIP ${s.archive_id}] files=${s.file_count} dirs=${s.directory_count} depth=${s.max_depth} ratio=${s.compression_ratio.toFixed(2)}${sus}`;
  }
}

export const zipArchiveEngine = ZipArchiveEngine;
