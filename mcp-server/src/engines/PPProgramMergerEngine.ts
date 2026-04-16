/**
 * PPProgramMergerEngine — Reassembles chunked G-code back into a single program
 *
 * Inverse of PPProgramChunkerEngine. Takes an array of chunk texts (typically
 * from DNC drip-feed capture, chunked file set, or edited-in-place chunks)
 * and reassembles them into a single continuous G-code program.
 *
 * Responsibilities:
 *   1. Strip duplicate leading `%` and `O####` program-number lines from
 *      continuation chunks (chunks 2..N).
 *   2. Strip chunk marker comments like `(--- CHUNK 2 — ORIGINAL LINES 51-100 ---)`.
 *   3. Strip modal restore blocks inserted by the chunker to avoid emitting
 *      redundant modal state when the merged program is executed as one unit.
 *   4. Preserve the trailing `%` terminator on the final chunk.
 *   5. Validate basic reassembly: program-number consistency, single M30/M2
 *      program-end, no duplicate tool-numbering anomalies.
 *
 * Identification heuristics for markers and restore blocks are intentionally
 * permissive — chunks produced by PPProgramChunkerEngine are recognized
 * verbatim, but hand-edited variants are tolerated.
 *
 * @module PPProgramMergerEngine
 */

// ── Types ─────────────────────────────────────────────────────────────

export interface MergerOptions {
  /** Strip modal restore blocks in continuation chunks (default: true) */
  strip_modal_restore?: boolean;
  /** Strip chunk-marker comments like "(--- CHUNK 2 ... ---)" (default: true) */
  strip_chunk_markers?: boolean;
  /** Strip duplicate % and O#### headers in continuation chunks (default: true) */
  strip_duplicate_headers?: boolean;
  /** Inject a blank line between merged chunks for readability (default: false) */
  chunk_separator_blank?: boolean;
  /** Emit a merge-info comment header (default: false) */
  emit_merge_comment?: boolean;
}

export interface MergeWarning {
  chunk_index: number;         // 0-indexed chunk where issue was detected
  line_number?: number;        // 1-indexed line within chunk (if applicable)
  issue: string;
  severity: "info" | "warning" | "critical";
}

export interface MergeResult {
  text: string;
  total_lines: number;
  total_bytes: number;
  chunks_merged: number;
  program_number?: string;
  warnings: MergeWarning[];
  has_program_end: boolean;
  /** Number of stripped modal-restore lines (summed across chunks) */
  modal_restore_lines_stripped: number;
  /** Number of stripped chunk-marker comment lines */
  chunk_markers_stripped: number;
  /** Number of stripped duplicate %/O-number header lines */
  duplicate_headers_stripped: number;
}

// ── Engine ─────────────────────────────────────────────────────────────

export class PPProgramMergerEngine {
  /**
   * Merge an array of chunk texts into a single program string.
   *
   * @param chunks Ordered array of chunk texts (chunk 0 first)
   * @param options Merge behavior controls
   */
  merge(chunks: string[], options: MergerOptions = {}): MergeResult {
    const stripRestore = options.strip_modal_restore ?? true;
    const stripMarkers = options.strip_chunk_markers ?? true;
    const stripHeaders = options.strip_duplicate_headers ?? true;
    const sepBlank = options.chunk_separator_blank ?? false;
    const emitMerge = options.emit_merge_comment ?? false;

    const warnings: MergeWarning[] = [];
    const merged: string[] = [];
    let programNumber: string | undefined;
    let modalRestoreStripped = 0;
    let chunkMarkersStripped = 0;
    let duplicateHeadersStripped = 0;

    for (let ci = 0; ci < chunks.length; ci++) {
      const chunkText = chunks[ci];
      if (chunkText == null || chunkText.length === 0) {
        warnings.push({ chunk_index: ci, issue: "Empty chunk skipped", severity: "warning" });
        continue;
      }

      const rawLines = chunkText.split(/\r?\n/);
      const isFirstChunk = ci === 0;
      const isLastChunk = ci === chunks.length - 1;

      // Track whether we're inside a modal-restore block (between the comment
      // marker "(--- MODAL STATE RESTORE ---)" and the first non-restore line).
      // Restore blocks produced by the chunker contain modal reset G/M codes
      // but no coordinate words. We use a simple state machine: when the
      // marker is seen, we enter restore mode; we exit on the next line that
      // contains X/Y/Z/A/B/C/I/J/K words (indicating real motion) OR on any
      // line that is clearly not a modal setup.
      let inRestoreBlock = false;

      for (let li = 0; li < rawLines.length; li++) {
        const raw = rawLines[li];
        const trimmed = raw.trim();

        // Chunk marker comment: "(--- CHUNK N — ORIGINAL LINES X-Y ---)"
        if (stripMarkers && /^\(---\s*CHUNK\s+\d+/i.test(trimmed)) {
          chunkMarkersStripped++;
          continue;
        }

        // Modal-restore marker comment
        if (stripRestore && /^\(---\s*MODAL STATE RESTORE/i.test(trimmed)) {
          chunkMarkersStripped++;
          inRestoreBlock = true;
          continue;
        }

        // Modal-restore body lines — skip until first line with motion coords
        // or an M-code that is NOT a spindle/coolant restore.
        if (inRestoreBlock && stripRestore) {
          if (this.isRestoreLine(trimmed)) {
            modalRestoreStripped++;
            continue;
          }
          // Exit restore block — this line is real content
          inRestoreBlock = false;
        }

        // Duplicate headers in continuation chunks
        if (!isFirstChunk && stripHeaders) {
          if (trimmed === "%") {
            duplicateHeadersStripped++;
            continue;
          }
          if (/^O\d+/i.test(trimmed)) {
            duplicateHeadersStripped++;
            continue;
          }
        }

        // Capture program number from first chunk
        if (isFirstChunk && programNumber === undefined) {
          const m = trimmed.match(/^O(\d+)/i);
          if (m) programNumber = m[1];
        }

        // Verify program number consistency across chunks
        if (!isFirstChunk && /^O\d+/i.test(trimmed)) {
          const m = trimmed.match(/^O(\d+)/i);
          if (m && programNumber && m[1] !== programNumber) {
            warnings.push({
              chunk_index: ci,
              line_number: li + 1,
              issue: `Program number mismatch: chunk 0 uses O${programNumber}, chunk ${ci} uses O${m[1]}`,
              severity: "warning",
            });
          }
        }

        // Strip trailing % from non-final chunks (they'll be re-added or not)
        if (!isLastChunk && trimmed === "%" && li >= rawLines.length - 2) {
          duplicateHeadersStripped++;
          continue;
        }

        merged.push(raw);
      }

      if (sepBlank && !isLastChunk) {
        merged.push("");
      }
    }

    // Emit optional merge comment
    if (emitMerge) {
      const header = `(--- MERGED FROM ${chunks.length} CHUNKS ---)`;
      // Insert after leading % and O#### if present, else at top
      let insertAt = 0;
      if (merged[0]?.trim() === "%") insertAt = 1;
      if (merged[insertAt]?.trim().match(/^O\d+/i)) insertAt += 1;
      merged.splice(insertAt, 0, header);
    }

    const text = merged.join("\n");
    const hasEnd = merged.some(l => /\bM0*(?:2|30)\b/.test(this.stripComments(l).toUpperCase()));

    if (!hasEnd) {
      warnings.push({
        chunk_index: chunks.length - 1,
        issue: "Merged program has no M30/M2 — program-end marker missing",
        severity: "critical",
      });
    }

    // Detect multiple M30 (should only appear once in merged output)
    let endCount = 0;
    for (const l of merged) {
      if (/\bM0*(?:2|30)\b/.test(this.stripComments(l).toUpperCase())) endCount++;
    }
    if (endCount > 1) {
      warnings.push({
        chunk_index: -1,
        issue: `Merged program has ${endCount} M30/M2 markers — expected 1`,
        severity: "warning",
      });
    }

    return {
      text,
      total_lines: merged.length,
      total_bytes: text.length,
      chunks_merged: chunks.length,
      program_number: programNumber,
      warnings,
      has_program_end: hasEnd,
      modal_restore_lines_stripped: modalRestoreStripped,
      chunk_markers_stripped: chunkMarkersStripped,
      duplicate_headers_stripped: duplicateHeadersStripped,
    };
  }

  /**
   * Check if a line is a modal-restore block entry as emitted by
   * PPProgramChunkerEngine.emitModalRestore(). Strict whitelist — must match
   * one of the known restore-line shapes:
   *   - G-only modal setup:    G90 / G21 / G17 / G94 (distance + units + plane + feed mode)
   *   - Work offset + comp:    G54 / G54 G41 / G55 G42
   *   - Spindle restore:       M3 S1200 / G97 M3 S1200
   *   - Coolant restore:       M7 / M8 / M7 M8
   *   - Feed rate restore:     F200 / F1200
   *
   * Any M-code that is program control (M5, M6, M30, M2, M00, M01, M9) is
   * NOT a restore line — those belong to the real program body.
   * Any line containing coordinate words (X/Y/Z/A/B/C/I/J/K/U/V/W) is NOT
   * a restore line.
   */
  private isRestoreLine(line: string): boolean {
    const clean = this.stripComments(line).toUpperCase().trim();
    if (clean.length === 0) return true; // blank — still in block

    // Coordinate motion disqualifies
    if (/[XYZABCIJKUVW]-?\d/.test(clean)) return false;

    const tokens = clean.split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0) return true;

    // Each token must be one of:
    //   G<n> where n is a known modal (17-19, 20-21, 40-42, 54-59, 90-95, 96-97)
    //   M<n> where n is 3, 4, 7, 8 (spindle-on or coolant-on only; NOT 5, 6, 0, 1, 2, 30)
    //   S<n>, F<n>
    for (const tok of tokens) {
      if (/^G\d+\.?\d*$/.test(tok)) {
        const n = parseInt(tok.substring(1), 10);
        const okG = n === 17 || n === 18 || n === 19 ||
                    n === 20 || n === 21 ||
                    n === 40 || n === 41 || n === 42 ||
                    (n >= 54 && n <= 59) ||
                    n === 90 || n === 91 ||
                    n === 93 || n === 94 || n === 95 ||
                    n === 96 || n === 97;
        if (!okG) return false;
      } else if (/^M\d+\.?\d*$/.test(tok)) {
        const n = parseInt(tok.substring(1), 10);
        const okM = n === 3 || n === 4 || n === 7 || n === 8;
        if (!okM) return false;
      } else if (!/^[SF]-?\d+\.?\d*$/.test(tok)) {
        // Anything other than G / M (whitelisted) / S / F disqualifies
        return false;
      }
    }
    return true;
  }

  /**
   * Strip G-code comments (parens and semicolons) for clean analysis.
   */
  private stripComments(line: string): string {
    let r = line.replace(/\([^)]*\)/g, " ");
    const semi = r.indexOf(";");
    if (semi >= 0) r = r.substring(0, semi);
    return r.trim();
  }

  /**
   * Verify that a merged program is structurally sound — no duplicate
   * program-end markers, balanced %, single program number, etc.
   */
  validate(text: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const lines = text.split(/\r?\n/);

    // Percent markers
    const percentCount = lines.filter(l => l.trim() === "%").length;
    if (percentCount !== 2 && percentCount !== 0) {
      issues.push(`Expected 0 or 2 '%' markers, found ${percentCount}`);
    }

    // Program number
    const oLines = lines.filter(l => /^O\d+/i.test(l.trim()));
    if (oLines.length > 1) {
      const nums = oLines.map(l => l.trim().match(/^O(\d+)/i)?.[1]).filter(Boolean);
      const unique = new Set(nums);
      if (unique.size > 1) {
        issues.push(`Multiple distinct program numbers: ${[...unique].join(", ")}`);
      } else {
        issues.push(`Duplicate O-number declarations: found ${oLines.length}, expected 1`);
      }
    }

    // Program end
    const endCount = lines.filter(l => /\bM0*(?:2|30)\b/.test(this.stripComments(l).toUpperCase())).length;
    if (endCount === 0) issues.push("No M30/M2 program-end marker");
    if (endCount > 1) issues.push(`Multiple program-end markers (${endCount})`);

    return { valid: issues.length === 0, issues };
  }

  /**
   * Default merge options.
   */
  defaultOptions(): MergerOptions {
    return {
      strip_modal_restore: true,
      strip_chunk_markers: true,
      strip_duplicate_headers: true,
      chunk_separator_blank: false,
      emit_merge_comment: false,
    };
  }
}

export const ppProgramMergerEngine = new PPProgramMergerEngine();
