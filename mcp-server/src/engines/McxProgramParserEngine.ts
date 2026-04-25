/**
 * McxProgramParserEngine — LATHE-PROD-READY-MS0/U-LPR26
 * ======================================================
 *
 * Parses Mastercam **binary** part files into a structured
 * {@link McxProgramMetadata}.  Mastercam's container is proprietary; full
 * toolpath extraction requires the Mastercam SDK / NETHOOK.  This engine
 * therefore deliberately stops at *metadata* — what every PRISM downstream
 * (corpus reverse-engineer, training-tuple builder, dedup) actually needs:
 *
 *   • Format detection (.mcx, .mcx-8, .mcx-9, .mcam) by extension + magic.
 *   • Version inference from header signature.
 *   • Embedded printable runs (ASCII + UTF-16 LE) ≥ 4 chars — Mastercam
 *     leaves tool names, post names, machine descriptions, and operation
 *     comments in the clear between compressed sections.
 *   • Tool / machine / post-processor hint classification from those runs.
 *   • Zlib-chunk count (operation blocks are compressed `78 9C` / `78 DA`).
 *   • Rough operation-count estimate.
 *
 * Design contract — every choice exists for a reason worth defending:
 *
 *   1. **Never throw.**  The JM Die corpus has 5,538 .mcx-* files plus
 *      legacy mirrors; any one of them can be torn, partially overwritten,
 *      created by a third-party Mastercam clone, or padded with a wrong
 *      extension.  Every exit point returns a `McxProgramMetadata` with
 *      `parse_ok` set, never raises.
 *
 *   2. **Bounded I/O for hostile input.**  `parseFile` caps reads at
 *      `MAX_FILE_BYTES` (default 64 MiB; configurable per call).  Larger
 *      files are reported as `oversized` and only the first 64 MiB is
 *      scanned.  Mastercam .mcx-8 files in JM Die's corpus run 0.4–1.5 MiB;
 *      legitimate parts never approach the cap.
 *
 *   3. **Format detection prefers extension, validates with magic.**
 *      A `.mcx-8` file with a wrong magic still parses (operator may have
 *      rebranded a corrupt file), but the metadata flags
 *      `magic_verified=false` so downstream gating can be strict.
 *
 *   4. **String extraction is encoding-aware.**  Mastercam stores most
 *      operator-visible text as UTF-16 LE; tool labels and post names also
 *      appear as plain ASCII.  We pull both with a single linear scan.
 *
 *   5. **Hint classification is conservative.**  Pattern-match on
 *      well-known substrings (`LATHE`, `MILL`, `ROUTER`, `TURN`,
 *      `MASTERCAM`, `.PST`, `TOOL `, etc.) — never invent semantics.
 *
 *   6. **Pure unless `parseFile` is invoked.**  `parseBuffer` is fully
 *      pure: identical input → identical output.  This makes the engine
 *      trivial to fuzz from {@link U-LPR-PARSER-FUZZ}.
 *
 * @module engines/McxProgramParserEngine
 * @milestone LATHE-PROD-READY-MS0 / U-LPR26
 */

import * as fs from "node:fs";
import * as path from "node:path";

// --------------------------------------------------------------------------
// Public types
// --------------------------------------------------------------------------

export type McxFormat = ".mcx" | ".mcx-8" | ".mcx-9" | ".mcam" | "unknown";

export type McxMachineHint = "lathe" | "mill" | "router" | "wire" | "swiss" | "millturn" | "unknown";

export interface McxProgramMetadata {
  /** Source filename (basename only — no path). */
  filename: string;
  /** Detected container format. */
  format: McxFormat;
  /** Inferred Mastercam release token, e.g. `"X8"`, `"X9"`, `"2017"`, `null` if unknown. */
  version: string | null;
  /** Bytes actually scanned (≤ MAX_FILE_BYTES). */
  bytes_scanned: number;
  /** True total bytes of the source if known (≥ bytes_scanned), else `null`. */
  bytes_total: number | null;
  /** Was the file larger than the per-call read cap? */
  oversized: boolean;
  /** Did the magic-byte check confirm a real Mastercam container? */
  magic_verified: boolean;
  /** Distinct printable runs ≥ MIN_STRING_LEN chars (ASCII ∪ UTF-16 LE). */
  embedded_strings: string[];
  /** Heuristic tool labels — strings starting with `TOOL ` or matching `T\d+ -`. */
  tool_labels: string[];
  /** Machine-class hints derived from embedded strings. */
  machine_hints: McxMachineHint[];
  /** Post-processor hints — substrings ending in `.PST` etc. */
  post_processor_hints: string[];
  /** Material hints from operator comments (uppercase short tokens like D2/M2/S7/4140). */
  material_hints: string[];
  /** Count of zlib-stream magic-byte sequences (`78 9C`, `78 DA`, `78 5E`, `78 01`). */
  zlib_chunks: number;
  /** Rough operation-count estimate (≈ zlib chunks ÷ 2 — Mastercam packs op + result). */
  estimated_operations: number;
  /** Human-readable warnings — empty on a clean parse. */
  warnings: string[];
  /** Hard errors — populated when parse_ok is false. */
  errors: string[];
  /** Did the file parse without hard errors?  Warnings do not flip this. */
  parse_ok: boolean;
}

export interface ParseFileOptions {
  /** Maximum bytes to read; default = MAX_FILE_BYTES (64 MiB). */
  maxBytes?: number;
}

// --------------------------------------------------------------------------
// Constants
// --------------------------------------------------------------------------

/** 64 MiB. Mastercam .mcx-8 in JM Die corpus tops out around 1.5 MiB. */
export const MAX_FILE_BYTES = 64 * 1024 * 1024;

/** Strings shorter than this are noise (random byte runs hit 3 chars often). */
export const MIN_STRING_LEN = 4;

/** Cap how many strings we keep — pathological binaries can yield thousands. */
export const MAX_STRINGS = 4096;

const SUPPORTED_EXTENSIONS: ReadonlySet<string> = new Set([
  ".mcx",
  ".mcx-8",
  ".mcx-9",
  ".mcam",
]);

/** Mastercam .mcx-8 record-length header observed empirically (JM Die corpus). */
const MAGIC_MCX_8: ReadonlyArray<number> = [0x98, 0x00, 0x00, 0x00];
/** OLE compound document magic — older .mcx (X-X7) wrap content in OLE/CFBF. */
const MAGIC_OLE: ReadonlyArray<number> = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
/** Mastercam 2017+ .mcam frequently uses ZIP (`PK\x03\x04`). */
const MAGIC_ZIP: ReadonlyArray<number> = [0x50, 0x4b, 0x03, 0x04];

const MACHINE_PATTERNS: ReadonlyArray<readonly [RegExp, McxMachineHint]> = [
  [/\bMILL[ -_]?TURN\b|\bMILLTURN\b/i, "millturn"],
  [/\bSWISS\b|\bCITIZEN\b|\bTSUGAMI\b|\bSTAR ?SR\b/i, "swiss"],
  [/\bWIRE[ -_]?EDM\b|\bWEDM\b/i, "wire"],
  [/\bROUTER\b/i, "router"],
  [/\bLATHE\b|\bTURN(?:ING)?\b|\bOKUMA\b|\bMAZAK\b|\bDOOSAN\b|\bHAAS ?ST\b/i, "lathe"],
  [/\bMILL\b|\bMACHINING ?CENTER\b|\bVMC\b|\bHMC\b/i, "mill"],
];

/** Known Mastercam version tokens we may see embedded in the file. */
const VERSION_PATTERNS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bMastercam ?2026\b/i, "2026"],
  [/\bMastercam ?2025\b/i, "2025"],
  [/\bMastercam ?2024\b/i, "2024"],
  [/\bMastercam ?2023\b/i, "2023"],
  [/\bMastercam ?2022\b/i, "2022"],
  [/\bMastercam ?2021\b/i, "2021"],
  [/\bMastercam ?2020\b/i, "2020"],
  [/\bMastercam ?2019\b/i, "2019"],
  [/\bMastercam ?2018\b/i, "2018"],
  [/\bMastercam ?2017\b/i, "2017"],
  [/\bMastercam ?X9\b/i, "X9"],
  [/\bMastercam ?X8\b/i, "X8"],
  [/\bMastercam ?X7\b/i, "X7"],
  [/\bMastercam ?X6\b/i, "X6"],
  [/\bMastercam ?X5\b/i, "X5"],
];

const COMMON_MATERIAL_TOKENS: ReadonlyArray<RegExp> = [
  /\b(?:M2|M4|M42|D2|D3|S7|A2|A6|H13|O1|W1|4140|4340|8620|1018|1045|1144|12L14|303|304|316|17-?4 ?PH|6061|7075|2024|TI[ -]?6AL[ -]?4V|INCO ?718|HAST(?:ELLOY)?|WC[ -]?CO|GRAPHITE)\b/i,
];

// --------------------------------------------------------------------------
// Engine
// --------------------------------------------------------------------------

export class McxProgramParserEngine {
  /**
   * Parse a Mastercam binary file by path.  Reads at most {@link MAX_FILE_BYTES}
   * bytes regardless of true size.  Never throws — I/O failures are surfaced
   * via the returned metadata's `errors[]`.
   */
  parseFile(filePath: string, opts: ParseFileOptions = {}): McxProgramMetadata {
    const filename = path.basename(filePath);
    const cap = Math.max(1, Math.min(opts.maxBytes ?? MAX_FILE_BYTES, MAX_FILE_BYTES));

    let stat: fs.Stats;
    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      return this.errorMetadata(filename, this.detectFormatFromExt(filename), [
        `stat failed: ${(e as Error).message}`,
      ]);
    }

    if (!stat.isFile()) {
      return this.errorMetadata(filename, this.detectFormatFromExt(filename), [
        "path is not a regular file",
      ]);
    }

    const total = stat.size;
    const oversized = total > cap;

    let buf: Buffer;
    try {
      // Open + bounded read (avoids loading 100 GB if someone hands us /dev/zero).
      const fd = fs.openSync(filePath, "r");
      try {
        buf = Buffer.alloc(Math.min(total, cap));
        if (buf.length > 0) {
          fs.readSync(fd, buf, 0, buf.length, 0);
        }
      } finally {
        fs.closeSync(fd);
      }
    } catch (e) {
      return this.errorMetadata(filename, this.detectFormatFromExt(filename), [
        `read failed: ${(e as Error).message}`,
      ]);
    }

    const md = this.parseBuffer(buf, filename);
    md.bytes_total = total;
    md.oversized = oversized;
    if (oversized) {
      md.warnings.push(
        `file truncated to ${cap} bytes for parsing (true size ${total})`,
      );
    }
    return md;
  }

  /**
   * Pure parse over an in-memory buffer.  Same input → same output.
   */
  parseBuffer(buf: Buffer, filename: string): McxProgramMetadata {
    const safeName = path.basename(filename ?? "<unnamed>");
    const format = this.detectFormatFromExt(safeName);

    if (!Buffer.isBuffer(buf)) {
      return this.errorMetadata(safeName, format, ["input is not a Buffer"]);
    }
    if (buf.length === 0) {
      return this.errorMetadata(safeName, format, ["empty buffer"]);
    }
    if (format === "unknown") {
      // Still scan — operator may have stripped extension — but flag.
      const md = this.scan(buf, safeName, format);
      md.warnings.push(
        `unknown extension; format inference relies on magic + content`,
      );
      return md;
    }
    return this.scan(buf, safeName, format);
  }

  /** Magic-byte test only.  Useful for content sniffing without full parse. */
  detectMagic(buf: Buffer): { mastercam: boolean; container: "raw" | "ole" | "zip" | "unknown" } {
    if (!Buffer.isBuffer(buf) || buf.length < 4) {
      return { mastercam: false, container: "unknown" };
    }
    if (this.bufStartsWith(buf, MAGIC_OLE)) {
      return { mastercam: true, container: "ole" };
    }
    if (this.bufStartsWith(buf, MAGIC_ZIP)) {
      // ZIP could be many things, but for a Mastercam-extension file it's
      // overwhelmingly `.mcam` (2017+).  Caller's extension check qualifies.
      return { mastercam: true, container: "zip" };
    }
    if (this.bufStartsWith(buf, MAGIC_MCX_8)) {
      return { mastercam: true, container: "raw" };
    }
    return { mastercam: false, container: "unknown" };
  }

  /** Return the canonical extension token for a filename. */
  detectFormatFromExt(filename: string): McxFormat {
    const lower = (filename ?? "").toLowerCase();
    // Order matters: `.mcx-8` must be checked before `.mcx`.
    if (lower.endsWith(".mcx-8")) return ".mcx-8";
    if (lower.endsWith(".mcx-9")) return ".mcx-9";
    if (lower.endsWith(".mcam")) return ".mcam";
    if (lower.endsWith(".mcx")) return ".mcx";
    return "unknown";
  }

  /** Extract printable ASCII + UTF-16 LE runs ≥ minLen chars from a buffer. */
  extractStrings(buf: Buffer, minLen: number = MIN_STRING_LEN): string[] {
    const out = new Set<string>();
    if (!Buffer.isBuffer(buf) || buf.length === 0) return [];
    const cap = Math.max(1, minLen);

    // ── ASCII pass: 0x20..0x7E (printable) + tab — runs ≥ cap chars.
    let runStart = -1;
    for (let i = 0; i <= buf.length; i++) {
      const b = i < buf.length ? buf[i]! : 0;
      const printable = i < buf.length && ((b >= 0x20 && b <= 0x7e) || b === 0x09);
      if (printable) {
        if (runStart < 0) runStart = i;
      } else if (runStart >= 0) {
        if (i - runStart >= cap) {
          out.add(buf.toString("ascii", runStart, i));
          if (out.size >= MAX_STRINGS) return [...out];
        }
        runStart = -1;
      }
    }

    // ── UTF-16 LE pass: char[i] = byte[2i] in 0x20..0x7E with byte[2i+1]=0.
    //    Real Mastercam binaries embed UTF-16 strings at arbitrary offsets
    //    (the leading record header is variable length).  We therefore scan
    //    from BOTH alignment offsets (0 and 1) so a UTF-16 string starting at
    //    an odd byte is still discovered.  The Set dedupes any overlap.
    for (const startOffset of [0, 1]) {
      runStart = -1;
      for (let i = startOffset; i + 1 <= buf.length; i += 2) {
        const lo = buf[i] ?? 0;
        const hi = i + 1 < buf.length ? buf[i + 1]! : 1;
        const printable = hi === 0 && ((lo >= 0x20 && lo <= 0x7e) || lo === 0x09);
        if (printable) {
          if (runStart < 0) runStart = i;
        } else if (runStart >= 0) {
          const charCount = (i - runStart) / 2;
          if (charCount >= cap) {
            // Decode just this slice as UTF-16 LE.
            out.add(buf.toString("utf16le", runStart, i));
            if (out.size >= MAX_STRINGS) return [...out];
          }
          runStart = -1;
        }
      }
      if (runStart >= 0) {
        const charCount = (buf.length - runStart) / 2;
        if (charCount >= cap) out.add(buf.toString("utf16le", runStart, buf.length));
      }
    }

    return [...out];
  }

  /** Count zlib-stream magic byte pairs.  Operations in Mastercam are zlib-deflated. */
  countZlibChunks(buf: Buffer): number {
    if (!Buffer.isBuffer(buf) || buf.length < 2) return 0;
    let count = 0;
    // Walk byte-by-byte; zlib starts: 0x78 then {0x01, 0x5E, 0x9C, 0xDA}.
    for (let i = 0; i < buf.length - 1; i++) {
      if (buf[i] === 0x78) {
        const n = buf[i + 1]!;
        if (n === 0x01 || n === 0x5e || n === 0x9c || n === 0xda) {
          count++;
          // Skip ahead to avoid re-counting the trailing byte as the start of
          // the next sequence — minimum reasonable zlib payload is 6 bytes.
          i += 1;
        }
      }
    }
    return count;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Internals
  // ──────────────────────────────────────────────────────────────────────────

  private scan(buf: Buffer, filename: string, format: McxFormat): McxProgramMetadata {
    const warnings: string[] = [];
    const magic = this.detectMagic(buf);
    if (!magic.mastercam) {
      warnings.push(
        `magic-byte check did not match any known Mastercam container (saw ${this.firstBytesHex(buf, 8)})`,
      );
    }

    const strings = this.extractStrings(buf, MIN_STRING_LEN);
    const tool_labels = this.classifyToolLabels(strings);
    const machine_hints = this.classifyMachineHints(strings);
    const post_processor_hints = this.classifyPostProcessorHints(strings);
    const material_hints = this.classifyMaterialHints(strings);
    const version = this.classifyVersion(strings);
    const zlib_chunks = this.countZlibChunks(buf);
    const estimated_operations = Math.max(0, Math.floor(zlib_chunks / 2));

    return {
      filename,
      format,
      version,
      bytes_scanned: buf.length,
      bytes_total: buf.length,
      oversized: false,
      magic_verified: magic.mastercam,
      embedded_strings: strings,
      tool_labels,
      machine_hints,
      post_processor_hints,
      material_hints,
      zlib_chunks,
      estimated_operations,
      warnings,
      errors: [],
      parse_ok: true,
    };
  }

  private errorMetadata(
    filename: string,
    format: McxFormat,
    errors: string[],
  ): McxProgramMetadata {
    return {
      filename,
      format,
      version: null,
      bytes_scanned: 0,
      bytes_total: null,
      oversized: false,
      magic_verified: false,
      embedded_strings: [],
      tool_labels: [],
      machine_hints: [],
      post_processor_hints: [],
      material_hints: [],
      zlib_chunks: 0,
      estimated_operations: 0,
      warnings: [],
      errors,
      parse_ok: false,
    };
  }

  private bufStartsWith(buf: Buffer, magic: ReadonlyArray<number>): boolean {
    if (buf.length < magic.length) return false;
    for (let i = 0; i < magic.length; i++) {
      if (buf[i] !== magic[i]) return false;
    }
    return true;
  }

  private firstBytesHex(buf: Buffer, n: number): string {
    const slice = buf.subarray(0, Math.min(n, buf.length));
    return [...slice].map((b) => b.toString(16).padStart(2, "0")).join(" ");
  }

  private classifyToolLabels(strings: ReadonlyArray<string>): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const re = /\b(?:TOOL\s+\d+|T\d+\s*[-:]\s*[A-Z0-9 ./_-]{2,})\b/i;
    for (const s of strings) {
      const m = s.match(re);
      if (m && m[0]) {
        const norm = m[0].trim();
        if (!seen.has(norm)) {
          seen.add(norm);
          out.push(norm);
        }
      }
    }
    return out;
  }

  private classifyMachineHints(strings: ReadonlyArray<string>): McxMachineHint[] {
    const found = new Set<McxMachineHint>();
    for (const s of strings) {
      for (const [re, hint] of MACHINE_PATTERNS) {
        if (re.test(s)) found.add(hint);
      }
    }
    return [...found];
  }

  private classifyPostProcessorHints(strings: ReadonlyArray<string>): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    const re = /\b([A-Z0-9 _-]{2,40}\.PST)\b/i;
    for (const s of strings) {
      const m = s.match(re);
      if (m && m[1]) {
        const norm = m[1].toUpperCase();
        if (!seen.has(norm)) {
          seen.add(norm);
          out.push(norm);
        }
      }
    }
    return out;
  }

  private classifyMaterialHints(strings: ReadonlyArray<string>): string[] {
    const out: string[] = [];
    const seen = new Set<string>();
    for (const s of strings) {
      for (const re of COMMON_MATERIAL_TOKENS) {
        const m = s.match(re);
        if (m && m[0]) {
          const norm = m[0].toUpperCase().replace(/\s+/g, "");
          if (!seen.has(norm)) {
            seen.add(norm);
            out.push(norm);
          }
        }
      }
    }
    return out;
  }

  private classifyVersion(strings: ReadonlyArray<string>): string | null {
    for (const s of strings) {
      for (const [re, tok] of VERSION_PATTERNS) {
        if (re.test(s)) return tok;
      }
    }
    return null;
  }
}

export const mcxProgramParserEngine = new McxProgramParserEngine();

/** Re-export sentinel set for callers wiring extension lists. */
export { SUPPORTED_EXTENSIONS as MCX_SUPPORTED_EXTENSIONS };
