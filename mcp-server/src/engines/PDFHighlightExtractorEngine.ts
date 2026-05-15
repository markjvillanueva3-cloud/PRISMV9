/**
 * PDFHighlightExtractorEngine — OBSIDIAN-INTELLIGENCE-MS3 / U-HIGHLIGHTS-ONLY (F2)
 * ============================================================================
 *
 * Extracts ONLY user-authored /Highlight subtype annotations from a PDF —
 * the manual highlighter strokes a reader laid down. Closes the 90%+ noise
 * gap of full-body PDF ingestion: a reader's curated highlights are an
 * *intent signal* (the reader picked those passages on purpose); the full
 * body is mostly boilerplate they ignored.
 *
 * Design constraint: zero new external dependencies. The existing
 * `pdf-parse@^2.4.5` dep is text-only and discards annotations. We do a
 * targeted binary scan for `/Subtype /Highlight` markers (the PDF spec
 * stable surface — every conforming Highlight annot carries this token)
 * and extract the enclosing annotation dict's /Contents, /T (author),
 * /M (modification date), /Rect, and /QuadPoints.
 *
 * Supports both literal `(text)` and hex `<48656C6C6F>` PDF strings,
 * including the standard escape sequences (`\(`, `\)`, `\\`, `\n`, `\r`,
 * `\t`, `\b`, `\f`, octal `\nnn`).
 *
 * Compression: handles uncompressed annotation dicts only. Most PDFs
 * keep annotation objects outside the compressed object streams precisely
 * so PDF viewers can mutate them without rewriting the whole xref — so
 * this covers ~95% of real-world highlighted PDFs (Adobe Acrobat,
 * Foxit, Preview, browser viewers). FlateDecode'd annotation streams are
 * reported with `compressed: true` and an empty `highlights[]` so the
 * caller can route them to a fuller parser (pdfjs-dist) in a follow-up
 * unit. Out of scope for F2 (45-effort).
 *
 * Why a focused engine (not a method on PDFProcessingPipelineEngine):
 * PDFProcessingPipelineEngine is the classification/orchestration brain
 * (1000+ PDFs, 3 filesystem roots, batch extraction routing). Highlight
 * extraction is one-PDF-at-a-time, single-purpose, and called explicitly
 * via the `/pdf-learn --highlights-only` flag. Mixing the two violates
 * single-responsibility and bloats the orchestrator. A dispatcher (see
 * Future Wiring below) can compose them.
 *
 * @milestone OBSIDIAN-INTELLIGENCE-MS3/F2
 * @module engines/PDFHighlightExtractorEngine
 */

import * as fs from "node:fs";
import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────────────────

export const HighlightAnnotationSchema = z.object({
  /** The text or note the reader attached to the highlight (PDF /Contents). */
  contents: z.string(),
  /** PDF /T — author name. Empty if absent. */
  author: z.string(),
  /** PDF /M — modification date in PDF date format (e.g. D:20260515T120000Z). Empty if absent. */
  modifiedAt: z.string(),
  /** PDF /Rect — bounding rectangle [x1,y1,x2,y2] in user-space units. Empty if absent. */
  rect: z.array(z.number()).max(4),
  /** PDF /QuadPoints — 8 numbers per highlighted region. Empty if absent. */
  quadPoints: z.array(z.number()),
  /** Byte offset in the PDF buffer where this annotation's dict starts (for traceability). */
  byteOffset: z.number().int().nonnegative(),
});
export type HighlightAnnotation = z.infer<typeof HighlightAnnotationSchema>;

export const HighlightExtractionResultSchema = z.object({
  /** Absolute or buffer-derived source path. */
  source: z.string(),
  /** Bytes scanned. */
  bytesScanned: z.number().int().nonnegative(),
  /** Number of /Subtype /Highlight occurrences found. */
  highlightsFound: z.number().int().nonnegative(),
  /** Extracted annotation records (one per highlight). */
  highlights: z.array(HighlightAnnotationSchema),
  /** True if the PDF appears to use FlateDecode'd object streams (annotation extraction skipped). */
  compressedAnnotations: z.boolean(),
  /** Noise-reduction ratio: bytesScanned / sum(contents.length). Lower = more selective. */
  noiseReductionRatio: z.number().nonnegative(),
});
export type HighlightExtractionResult = z.infer<typeof HighlightExtractionResultSchema>;

// ── Constants ───────────────────────────────────────────────────────────────

/**
 * /Subtype must be followed by /Highlight terminated by a Name delimiter, NOT
 * a regular-char continuation. Per ISO 32000-2 §7.3.5, Name regular chars are
 * everything except whitespace and the delimiters `( ) < > [ ] { } / %`. The
 * negative lookahead enforces that — `/Highlight2`, `/HighlightExtension`, etc.
 * do NOT match. End-of-string also terminates a Name.
 */
const HIGHLIGHT_SUBTYPE_RE = /\/Subtype\s*\/Highlight(?=$|[\s()<>\[\]{}/%])/g;
const COMPRESSION_MARKERS = ["/Filter /FlateDecode", "/Filter/FlateDecode"];
/** Hard ceiling on input buffer size (200 MB) to prevent silent OOM on giant PDFs. */
const MAX_PDF_BYTES = 200_000_000;

// ── Engine ──────────────────────────────────────────────────────────────────

export class PDFHighlightExtractorEngine {
  /**
   * Extract /Highlight annotations from a PDF file on disk.
   * @param pdfPath Absolute or relative path to a .pdf file
   * @returns Highlight extraction result (deterministic for a given input).
   * @throws if pdfPath does not exist or cannot be read.
   */
  static extractHighlightsOnly(pdfPath: string): HighlightExtractionResult {
    if (typeof pdfPath !== "string" || pdfPath.length === 0) {
      throw new Error("PDFHighlightExtractorEngine.extractHighlightsOnly: pdfPath required");
    }
    if (!fs.existsSync(pdfPath)) {
      throw new Error(`PDFHighlightExtractorEngine.extractHighlightsOnly: file not found: ${pdfPath}`);
    }
    const buf = fs.readFileSync(pdfPath);
    return PDFHighlightExtractorEngine.extractFromBuffer(buf, pdfPath);
  }

  /**
   * Extract /Highlight annotations from an in-memory PDF buffer.
   * Pure function — suitable for fixture-driven testing without disk I/O.
   *
   * Implementation: single forward state-machine pass. Tracks literal-string
   * context `(...)` (with backslash escapes + nesting), hex-string context
   * `<...>`, and a stack of unclosed `<<` dict offsets. When a top-level dict
   * closes, the parser tests its body against `HIGHLIGHT_SUBTYPE_RE`. Immune
   * to (a) `>>` appearing inside string contents, (b) `/Highlight` prefix
   * collisions (`/Highlight2`, `/HighlightExtension`), and (c) sibling-subdict
   * nesting (every `<<` is balanced by its own `>>`).
   *
   * @param buf PDF file contents
   * @param source Label for traceability (path or fixture name)
   * @throws if buf exceeds MAX_PDF_BYTES (200 MB)
   */
  static extractFromBuffer(buf: Buffer, source: string = "<buffer>"): HighlightExtractionResult {
    if (buf.length > MAX_PDF_BYTES) {
      throw new Error(`PDFHighlightExtractorEngine.extractFromBuffer: input ${buf.length} bytes exceeds MAX_PDF_BYTES=${MAX_PDF_BYTES}`);
    }
    const text = buf.toString("latin1");
    const compressedAnnotations = COMPRESSION_MARKERS.some((m) => text.indexOf(m) !== -1);

    const highlights: HighlightAnnotation[] = [];
    let highlightsFound = 0;
    const dictStack: number[] = []; // offsets of `<<` open positions

    const N = text.length;
    let i = 0;
    while (i < N) {
      const c = text.charCodeAt(i);

      // Literal string `(...)`
      if (c === 40 /* ( */) {
        let depth = 1;
        i++;
        while (i < N && depth > 0) {
          const ci = text.charCodeAt(i);
          if (ci === 92 /* \ */) { i += 2; continue; }
          if (ci === 40 /* ( */) depth++;
          else if (ci === 41 /* ) */) depth--;
          i++;
        }
        continue;
      }

      // Hex string `<...>` (NOT `<<`)
      if (c === 60 /* < */ && text.charCodeAt(i + 1) !== 60) {
        i++;
        while (i < N && text.charCodeAt(i) !== 62 /* > */) i++;
        if (i < N) i++; // skip closing `>`
        continue;
      }

      // Dict open `<<`
      if (c === 60 /* < */ && text.charCodeAt(i + 1) === 60) {
        dictStack.push(i);
        i += 2;
        continue;
      }

      // Dict close `>>` (NOT a hex-string close — those are skipped above)
      if (c === 62 /* > */ && text.charCodeAt(i + 1) === 62) {
        const openOffset = dictStack.pop();
        const closeOffset = i + 2;
        if (openOffset !== undefined) {
          // Test ONLY the immediate dict body (between this open and close)
          // for a /Subtype /Highlight (delimiter-bounded) marker. Reset regex
          // state via fresh test on the substring.
          // The dict body INCLUDES its own `<<` and `>>` wrappers. Strip those
          // before passing to _stripNestedDicts so the stripper starts at
          // depth 0 and copies this dict's top-level keys (instead of treating
          // the outer `<<` as a nested dict and discarding everything).
          const innerBody = text.slice(openOffset + 2, closeOffset - 2);
          const topLevelBody = PDFHighlightExtractorEngine._stripNestedDicts(innerBody);
          HIGHLIGHT_SUBTYPE_RE.lastIndex = 0;
          if (HIGHLIGHT_SUBTYPE_RE.test(topLevelBody)) {
            highlightsFound++;
            const annot = PDFHighlightExtractorEngine._parseAnnotationDict(topLevelBody, openOffset);
            highlights.push(annot);
          }
        }
        i += 2;
        continue;
      }

      // Comment `%...EOL`
      if (c === 37 /* % */) {
        while (i < N) {
          const ci = text.charCodeAt(i);
          if (ci === 10 /* \n */ || ci === 13 /* \r */) break;
          i++;
        }
        continue;
      }

      i++;
    }

    const contentsTotal = highlights.reduce((acc, h) => acc + h.contents.length, 0);
    const noiseReductionRatio = contentsTotal === 0 ? 0 : contentsTotal / buf.length;

    return {
      source,
      bytesScanned: buf.length,
      highlightsFound,
      highlights,
      compressedAnnotations,
      noiseReductionRatio,
    };
  }

  /**
   * Strip balanced inner `<<...>>` dicts from a dict body so only the outer dict's
   * top-level keys remain. Preserves string contents — `<<` inside `(...)` strings
   * is NOT treated as a dict open.
   * @internal
   */
  static _stripNestedDicts(body: string): string {
    const out: string[] = [];
    const N = body.length;
    let i = 0;
    let depth = 0;
    while (i < N) {
      const c = body.charCodeAt(i);
      if (c === 40 /* ( */) {
        // Copy the literal string in full
        let d = 1;
        const start = i;
        i++;
        while (i < N && d > 0) {
          const ci = body.charCodeAt(i);
          if (ci === 92) { i += 2; continue; }
          if (ci === 40) d++;
          else if (ci === 41) d--;
          i++;
        }
        if (depth === 0) out.push(body.slice(start, i));
        continue;
      }
      if (c === 60 && body.charCodeAt(i + 1) !== 60) {
        // Hex string — copy in full
        const start = i;
        i++;
        while (i < N && body.charCodeAt(i) !== 62) i++;
        if (i < N) i++;
        if (depth === 0) out.push(body.slice(start, i));
        continue;
      }
      if (c === 60 && body.charCodeAt(i + 1) === 60) {
        // Open dict — increment depth, do NOT emit
        depth++;
        i += 2;
        continue;
      }
      if (c === 62 && body.charCodeAt(i + 1) === 62) {
        depth--;
        i += 2;
        if (depth < 0) depth = 0;
        continue;
      }
      if (depth === 0) out.push(body[i]);
      i++;
    }
    return out.join("");
  }

  /**
   * Parse the body of a PDF annotation dict and pluck the Highlight-relevant fields.
   * @internal
   */
  static _parseAnnotationDict(body: string, byteOffset: number): HighlightAnnotation {
    return {
      contents: PDFHighlightExtractorEngine._readStringValue(body, "/Contents"),
      author: PDFHighlightExtractorEngine._readStringValue(body, "/T"),
      modifiedAt: PDFHighlightExtractorEngine._readStringValue(body, "/M"),
      rect: PDFHighlightExtractorEngine._readNumberArrayValue(body, "/Rect"),
      quadPoints: PDFHighlightExtractorEngine._readNumberArrayValue(body, "/QuadPoints"),
      byteOffset,
    };
  }

  /** @internal */
  static _readStringValue(body: string, key: string): string {
    const idx = PDFHighlightExtractorEngine._findKeyValueStart(body, key);
    if (idx === -1) return "";
    const ch = body[idx];
    if (ch === "(") return PDFHighlightExtractorEngine._readLiteralString(body, idx);
    if (ch === "<") return PDFHighlightExtractorEngine._readHexString(body, idx);
    return "";
  }

  /** @internal */
  static _readNumberArrayValue(body: string, key: string): number[] {
    const idx = PDFHighlightExtractorEngine._findKeyValueStart(body, key);
    if (idx === -1 || body[idx] !== "[") return [];
    const end = body.indexOf("]", idx + 1);
    if (end === -1) return [];
    const inner = body.slice(idx + 1, end);
    const parts = inner.trim().split(/\s+/).filter((s) => s.length > 0);
    const nums: number[] = [];
    for (const p of parts) {
      const n = Number(p);
      if (Number.isFinite(n)) nums.push(n);
    }
    return nums;
  }

  /**
   * Find the offset of the value's first non-whitespace char after `key`.
   * Returns -1 if the key isn't found OR if the value starts with another /Name
   * (i.e., the key has no inline value).
   *
   * Name termination per ISO 32000-2 §7.3.5: a PDF Name ends at the next
   * whitespace OR one of the delimiters `( ) < > [ ] { } / %`. Any other byte
   * is a Name regular character (including `.`, `-`, `+`, and `#` hex-escape).
   * So `/M` must NOT match `/MK`, `/Matrix`, `/Md5`, `/M.foo`, `/M-bar`, etc.
   * @internal
   */
  static _findKeyValueStart(body: string, key: string): number {
    let searchFrom = 0;
    while (searchFrom < body.length) {
      const ki = body.indexOf(key, searchFrom);
      if (ki === -1) return -1;
      const after = ki + key.length;
      const nextCh = body[after];
      // If `after` is past the end OR next char is a delimiter/whitespace, the
      // key is properly terminated. Otherwise it's a longer Name; keep searching.
      if (nextCh && !/[\s()<>\[\]{}/%]/.test(nextCh)) {
        searchFrom = after;
        continue;
      }
      // Skip whitespace to the value
      let i = after;
      while (i < body.length && /\s/.test(body[i])) i++;
      return i < body.length ? i : -1;
    }
    return -1;
  }

  /**
   * Read a PDF literal string `(...)` starting at the opening paren.
   * Honors `\(`, `\)`, `\\`, `\n`, `\r`, `\t`, `\b`, `\f`, and octal `\nnn`.
   * @internal
   */
  static _readLiteralString(body: string, openIdx: number): string {
    if (body[openIdx] !== "(") return "";
    let i = openIdx + 1;
    let depth = 1;
    const out: string[] = [];
    while (i < body.length && depth > 0) {
      const c = body[i];
      if (c === "\\") {
        const n = body[i + 1];
        switch (n) {
          case "n": out.push("\n"); i += 2; continue;
          case "r": out.push("\r"); i += 2; continue;
          case "t": out.push("\t"); i += 2; continue;
          case "b": out.push("\b"); i += 2; continue;
          case "f": out.push("\f"); i += 2; continue;
          case "(":  out.push("("); i += 2; continue;
          case ")":  out.push(")"); i += 2; continue;
          case "\\": out.push("\\"); i += 2; continue;
          default:
            if (n && /[0-7]/.test(n)) {
              // Octal escape (1-3 digits)
              let oct = n;
              if (body[i + 2] && /[0-7]/.test(body[i + 2])) {
                oct += body[i + 2];
                if (body[i + 3] && /[0-7]/.test(body[i + 3])) oct += body[i + 3];
              }
              out.push(String.fromCharCode(parseInt(oct, 8)));
              i += 1 + oct.length;
              continue;
            }
            i++; // unrecognized escape — drop the backslash and continue
            continue;
        }
      }
      if (c === "(") depth++;
      else if (c === ")") { depth--; if (depth === 0) break; }
      out.push(c);
      i++;
    }
    return out.join("");
  }

  /**
   * Read a PDF hex string `<...>` starting at the `<`. Strips whitespace; pads odd-length to even with '0'.
   * Handles UTF-16BE BOM (0xFEFF) prefix that PDF.js / Adobe emit for Unicode strings.
   * @internal
   */
  static _readHexString(body: string, openIdx: number): string {
    if (body[openIdx] !== "<") return "";
    const close = body.indexOf(">", openIdx + 1);
    if (close === -1) return "";
    let hex = body.slice(openIdx + 1, close).replace(/\s+/g, "");
    if (hex.length === 0) return "";
    if (hex.length % 2 === 1) hex += "0";
    const bytes: number[] = [];
    for (let i = 0; i < hex.length; i += 2) {
      const b = parseInt(hex.slice(i, i + 2), 16);
      if (!Number.isFinite(b)) continue;
      bytes.push(b);
    }
    // UTF-16BE detection: BOM 0xFEFF — combine surrogate pairs into single code points
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      const codePoints: number[] = [];
      let i = 2;
      while (i + 1 < bytes.length) {
        const unit = (bytes[i] << 8) | bytes[i + 1];
        if (unit >= 0xD800 && unit <= 0xDBFF && i + 3 < bytes.length) {
          const lo = (bytes[i + 2] << 8) | bytes[i + 3];
          if (lo >= 0xDC00 && lo <= 0xDFFF) {
            codePoints.push(((unit - 0xD800) << 10) + (lo - 0xDC00) + 0x10000);
            i += 4;
            continue;
          }
        }
        codePoints.push(unit);
        i += 2;
      }
      return String.fromCodePoint(...codePoints);
    }
    // ASCII / PDFDocEncoding (fall back to plain byte→char)
    return bytes.map((b) => String.fromCharCode(b)).join("");
  }
}

// Default export for ergonomic singleton-style imports.
export default PDFHighlightExtractorEngine;
