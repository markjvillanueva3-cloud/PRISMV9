/**
 * ElectrodeCoverageAuditEngine
 * ===========================================
 *
 * Read-only inventory + cross-reference audit of the JM Die ELECTRODE / TAPTITE
 * corpus against the "Automated Program" tracking workbook
 * (`H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm`).
 *
 * SAFETY-CRITICAL READ-ONLY (per spec TRAINING-LEARNING-MS0 / MS0-U3):
 *   - Engine never writes to the .xlsm. Only `fs.statSync()` + `fs.readFileSync()`
 *     (binary, for sha256 fingerprint) are used. NO `fs.write*`, NO `fs.unlink*`,
 *     NO `fs.rename*`, NO `fs.chmod*` are called on the .xlsm path or anywhere else.
 *   - Engine never re-walks the JM Die corpus to mutate it.
 *   - Test contract: `fs.statSync(.xlsm).mtimeMs` is unchanged after `engine.report()`.
 *
 * Public surface (called by camDispatcher cases):
 *   - scanCorpus(opts?)        → CorpusScan       (live walk OR presetSnapshot)
 *   - xlsmFingerprint(opts?)   → XlsmFingerprint  (mtime + size + sha256, no parse)
 *   - report(opts?)            → ElectrodeCoverageReport (combined audit)
 *
 * Wires to (per spec, MS0-U3):
 *   - prism_cam: electrode_corpus_scan / electrode_xlsm_fingerprint /
 *                electrode_coverage_audit
 *
 * Baseline (frozen — see milestone envelope `inventory_baseline`):
 *   - electrode files: 73
 *   - taptite files: 22
 *
 * Output shape: discriminated `{ok: true|false}` so the dispatcher can bridge to
 * `success: true|false` without treating recoverable errors (missing .xlsm,
 * unreadable subdir) as success. Mirrors the lathe/mill sibling pattern.
 *
 * NEVER emits runnable G-code. NEVER opens the .xlsm with write intent. NEVER
 * follows symlinks during the corpus walk (avoids infinite loops + accidental
 * out-of-tree reads).
 *
 * Reuses:
 *   - Node stdlib only (fs, path, crypto). No xlsx parser dependency — the
 *     companion python script `Docustrata/.index/phase20-electrode-coverage-audit.py`
 *     handles Excel content extraction; this engine fingerprints + cross-references
 *     against a snapshot.
 *
 * @module engines/ElectrodeCoverageAuditEngine
 * @milestone TRAINING-LEARNING-MS0 / MS0-U3
 * @safety SAFETY-CRITICAL READ-ONLY
 * @version 1.0.0
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

// ───────────────────────────────────────────────────────────────────────────────
// Constants — match milestone envelope `inventory_baseline` exactly.

/** Canonical .xlsm path per spec `read_only_assets`. */
export const DEFAULT_XLSM_PATH =
  "H:/PRISM/JM DIE/Automated Program_Corrected 5-25.xlsm";

/** Canonical corpus root — top of JM Die tree. */
export const DEFAULT_CORPUS_ROOT = "H:/PRISM/JM DIE";

/** Baseline file counts (frozen per milestone envelope MS0-U3). */
export const BASELINE_EXPECTED = Object.freeze({
  electrodes: 73,
  taptites: 22,
});

/** Default walk depth — 8 covers the JM Die tree (verified 77,552 dirs). */
export const DEFAULT_MAX_DEPTH = 8;

/** Max sample paths to surface per category. */
export const SAMPLE_PATHS_PER_CATEGORY = 8;

/** Engine schema version — bump on breaking output-shape changes. */
export const SCHEMA_VERSION = 1;

/** SHA-256 read chunk size — 64 KiB matches typical FS block size. */
const SHA256_CHUNK_BYTES = 64 * 1024;

/** Hard upper bound on .xlsm fingerprint reads — 200 MiB safety guard. The
 *  JM Die .xlsm is ~5.6 MiB; anything larger is suspicious + we refuse to read. */
const MAX_XLSM_FINGERPRINT_BYTES = 200 * 1024 * 1024;

// ───────────────────────────────────────────────────────────────────────────────
// Public types.

/** Result of `scanCorpus()`. Shape mirrors `engine.report().corpusScan`. */
export interface CorpusScan {
  ok: true;
  /** Live count of electrode files in corpusRoot (filename regex match). */
  electrodeCount: number;
  /** Live count of taptite files in corpusRoot (filename regex match). */
  taptiteCount: number;
  /** Top-level dir of each electrode file → count. */
  byTopDir: {
    electrodes: Record<string, number>;
    taptites: Record<string, number>;
  };
  /** File extension (lowercased, dot-prefixed) → count. */
  byExtension: {
    electrodes: Record<string, number>;
    taptites: Record<string, number>;
  };
  /** Up to SAMPLE_PATHS_PER_CATEGORY paths per category — deterministic order. */
  samplePaths: {
    electrodes: string[];
    taptites: string[];
  };
  /** Number of directories the walker visited (including the root). */
  dirsVisited: number;
  /** Wall-clock ms spent walking. */
  walkTimeMs: number;
  /** Corpus root used. */
  corpusRoot: string;
  /** Max depth used. */
  maxDepth: number;
  /** True if the walk hit `maxDepth` and stopped — counts may be undercounts. */
  truncated: boolean;
  /** ISO timestamp at scan completion. */
  scannedAt: string;
  /** Source: "live" = filesystem walk, "preset" = caller-supplied snapshot. */
  source: "live" | "preset";
}

/** Result of `scanCorpus()` when the walk could not start (root missing). */
export interface CorpusScanError {
  ok: false;
  error: string;
  detail?: string;
  corpusRoot: string;
}

/** Result of `xlsmFingerprint()` when the file exists and is fingerprinted. */
export interface XlsmFingerprintPresent {
  ok: true;
  exists: true;
  path: string;
  mtimeMs: number;
  sizeBytes: number;
  /** SHA-256 hex digest of the file content (binary). */
  sha256: string;
  fingerprintedAt: string;
}

/** Result of `xlsmFingerprint()` when the file does not exist. */
export interface XlsmFingerprintAbsent {
  ok: true;
  exists: false;
  path: string;
  fingerprintedAt: string;
}

/** Result of `xlsmFingerprint()` when an error occurs (oversize, EACCES…). */
export interface XlsmFingerprintError {
  ok: false;
  error: string;
  detail?: string;
  path: string;
}

export type XlsmFingerprint =
  | XlsmFingerprintPresent
  | XlsmFingerprintAbsent
  | XlsmFingerprintError;

/** Combined audit report — `engine.report()` result on success. */
export interface ElectrodeCoverageReport {
  ok: true;
  corpusScan: CorpusScan;
  xlsmFingerprint: XlsmFingerprint;
  baselineExpected: { electrodes: number; taptites: number };
  baselineMatch: { electrodes: boolean; taptites: boolean };
  /** Human-readable drift messages — empty when corpus + .xlsm both healthy. */
  driftWarnings: string[];
  reportedAt: string;
  schemaVersion: number;
}

/** `engine.report()` result on corpus-walk failure (root missing/unreadable). */
export interface ElectrodeCoverageReportError {
  ok: false;
  error: string;
  detail?: string;
  corpusScan?: CorpusScanError;
  xlsmFingerprint?: XlsmFingerprint;
}

// ───────────────────────────────────────────────────────────────────────────────
// Options.

export interface ScanCorpusOptions {
  /** Override corpus root. Defaults to DEFAULT_CORPUS_ROOT. */
  corpusRoot?: string;
  /** Override max walk depth. Defaults to DEFAULT_MAX_DEPTH. */
  maxDepth?: number;
  /** Caller-supplied snapshot (test fixture or python-emitted JSON). When
   *  present, the engine skips the live walk and returns the snapshot as-is
   *  with `source: "preset"`. */
  presetSnapshot?: CorpusScan;
}

export interface XlsmFingerprintOptions {
  /** Override .xlsm path. Defaults to DEFAULT_XLSM_PATH. */
  xlsmPath?: string;
}

export interface ReportOptions
  extends ScanCorpusOptions,
    XlsmFingerprintOptions {
  /** Optional override of baseline counts (used by tests; production reads the
   *  frozen BASELINE_EXPECTED constant). Must contain both `electrodes` and
   *  `taptites` when provided — partial overrides are rejected. */
  baselineOverride?: { electrodes: number; taptites: number };
}

// ───────────────────────────────────────────────────────────────────────────────
// Filename classifiers — anchored to the spec's electrode + taptite definitions.
// Case-insensitive substring match (matches the phase20-* python script + the
// inventory_baseline probe that produced the 73/22 frozen counts). The
// substring is specific enough to avoid false-positives:
//   - "electrode" is NOT a substring of "electroplate", "electronics" etc.
//   - "taptite" is NOT a substring of "tap.txt", "taproot" etc.
// Files in the real JM Die corpus like "BFELECTRODE.MIN" + "TAPTITE2000.x_t"
// have letters/digits adjacent to the anchor word — word-boundary regex was
// too strict + dropped 1+ legitimate file (spec MS0-U3 reviewer-fix).

const ELECTRODE_NAME_RE = /electrode/i;
const TAPTITE_NAME_RE = /taptite/i;

function isElectrodeName(basename: string): boolean {
  return ELECTRODE_NAME_RE.test(basename);
}

function isTaptiteName(basename: string): boolean {
  return TAPTITE_NAME_RE.test(basename);
}

// ───────────────────────────────────────────────────────────────────────────────
// Internal walker — depth-limited, symlink-safe, never throws on EACCES.

interface WalkResult {
  electrodes: string[];
  taptites: string[];
  dirsVisited: number;
  truncated: boolean;
  errors: string[];
}

function walkCorpus(
  root: string,
  maxDepth: number,
): WalkResult {
  const result: WalkResult = {
    electrodes: [],
    taptites: [],
    dirsVisited: 0,
    truncated: false,
    errors: [],
  };

  const stack: Array<{ dir: string; depth: number }> = [{ dir: root, depth: 0 }];

  while (stack.length > 0) {
    const { dir, depth } = stack.pop()!;
    if (depth > maxDepth) {
      result.truncated = true;
      continue;
    }
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      result.errors.push(
        `${dir}: ${e instanceof Error ? e.message : String(e)}`,
      );
      continue;
    }
    result.dirsVisited++;

    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      // Never follow symlinks — prevents loops + out-of-tree reads.
      if (ent.isSymbolicLink()) continue;
      if (ent.isDirectory()) {
        stack.push({ dir: full, depth: depth + 1 });
      } else if (ent.isFile()) {
        if (isElectrodeName(ent.name)) result.electrodes.push(full);
        else if (isTaptiteName(ent.name)) result.taptites.push(full);
      }
    }
  }

  // Deterministic order — tests must not depend on FS traversal order.
  result.electrodes.sort();
  result.taptites.sort();
  return result;
}

// ───────────────────────────────────────────────────────────────────────────────
// Tally helpers.

function topDirOf(filePath: string, root: string): string {
  const rel = path.relative(root, filePath);
  const parts = rel.split(/[\\/]+/).filter(Boolean);
  return parts[0] ?? "(root)";
}

function extOf(filePath: string): string {
  const base = path.basename(filePath);
  const dot = base.lastIndexOf(".");
  if (dot < 0 || dot === base.length - 1) return "(noext)";
  return base.slice(dot).toLowerCase();
}

function tally(items: string[], keyFn: (s: string) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of items) {
    const k = keyFn(s);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────────
// SHA-256 helpers — streaming so we never load >SHA256_CHUNK_BYTES at a time.

function sha256OfFile(filePath: string, sizeBytes: number): string {
  if (sizeBytes > MAX_XLSM_FINGERPRINT_BYTES) {
    throw new Error(
      `xlsm size ${sizeBytes} exceeds MAX_XLSM_FINGERPRINT_BYTES ${MAX_XLSM_FINGERPRINT_BYTES}`,
    );
  }
  const hash = crypto.createHash("sha256");
  // readFileSync IS allowed — read intent only. Buffer is discarded after hashing.
  // For files larger than SHA256_CHUNK_BYTES we use a chunked read via fd to
  // avoid a single huge allocation.
  let fd: number | null = null;
  try {
    fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(SHA256_CHUNK_BYTES);
    let bytesRead = 0;
    let off = 0;
    do {
      bytesRead = fs.readSync(fd, buf, 0, SHA256_CHUNK_BYTES, off);
      if (bytesRead > 0) hash.update(buf.subarray(0, bytesRead));
      off += bytesRead;
    } while (bytesRead === SHA256_CHUNK_BYTES);
    return hash.digest("hex");
  } finally {
    if (fd !== null) {
      try {
        fs.closeSync(fd);
      } catch {
        // Ignore — best-effort close.
      }
    }
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Engine class.

export class ElectrodeCoverageAuditEngine {
  /** Scan the corpus root for electrode + taptite files. READ-ONLY. */
  scanCorpus(opts?: ScanCorpusOptions): CorpusScan | CorpusScanError {
    if (opts?.presetSnapshot) {
      // Caller-supplied snapshot — surface verbatim with source set to "preset".
      return { ...opts.presetSnapshot, source: "preset" };
    }

    const corpusRoot = opts?.corpusRoot ?? DEFAULT_CORPUS_ROOT;
    const maxDepth =
      typeof opts?.maxDepth === "number" && Number.isFinite(opts.maxDepth)
        ? Math.max(0, Math.min(20, Math.floor(opts.maxDepth)))
        : DEFAULT_MAX_DEPTH;

    // Refuse to walk if root doesn't exist or isn't a directory.
    let rootStat: fs.Stats;
    try {
      rootStat = fs.statSync(corpusRoot);
    } catch (e) {
      return {
        ok: false,
        error: "corpus_root_missing",
        detail: e instanceof Error ? e.message : String(e),
        corpusRoot,
      };
    }
    if (!rootStat.isDirectory()) {
      return {
        ok: false,
        error: "corpus_root_not_directory",
        detail: `${corpusRoot} is not a directory`,
        corpusRoot,
      };
    }

    const startedAt = Date.now();
    const walk = walkCorpus(corpusRoot, maxDepth);
    const walkTimeMs = Date.now() - startedAt;

    return {
      ok: true,
      electrodeCount: walk.electrodes.length,
      taptiteCount: walk.taptites.length,
      byTopDir: {
        electrodes: tally(walk.electrodes, (p) => topDirOf(p, corpusRoot)),
        taptites: tally(walk.taptites, (p) => topDirOf(p, corpusRoot)),
      },
      byExtension: {
        electrodes: tally(walk.electrodes, extOf),
        taptites: tally(walk.taptites, extOf),
      },
      samplePaths: {
        electrodes: walk.electrodes.slice(0, SAMPLE_PATHS_PER_CATEGORY),
        taptites: walk.taptites.slice(0, SAMPLE_PATHS_PER_CATEGORY),
      },
      dirsVisited: walk.dirsVisited,
      walkTimeMs,
      corpusRoot,
      maxDepth,
      truncated: walk.truncated,
      scannedAt: new Date().toISOString(),
      source: "live",
    };
  }

  /** Fingerprint the .xlsm — mtime + size + sha256. READ-ONLY (no parse). */
  xlsmFingerprint(opts?: XlsmFingerprintOptions): XlsmFingerprint {
    const xlsmPath = opts?.xlsmPath ?? DEFAULT_XLSM_PATH;
    let stat: fs.Stats;
    try {
      stat = fs.statSync(xlsmPath);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err && err.code === "ENOENT") {
        return {
          ok: true,
          exists: false,
          path: xlsmPath,
          fingerprintedAt: new Date().toISOString(),
        };
      }
      return {
        ok: false,
        error: "xlsm_stat_failed",
        detail: err && err.message ? err.message : String(e),
        path: xlsmPath,
      };
    }

    if (!stat.isFile()) {
      return {
        ok: false,
        error: "xlsm_not_a_file",
        detail: `${xlsmPath} exists but is not a regular file`,
        path: xlsmPath,
      };
    }

    let sha256: string;
    try {
      sha256 = sha256OfFile(xlsmPath, stat.size);
    } catch (e) {
      return {
        ok: false,
        error: "xlsm_read_failed",
        detail: e instanceof Error ? e.message : String(e),
        path: xlsmPath,
      };
    }

    return {
      ok: true,
      exists: true,
      path: xlsmPath,
      mtimeMs: stat.mtimeMs,
      sizeBytes: stat.size,
      sha256,
      fingerprintedAt: new Date().toISOString(),
    };
  }

  /** Combined audit report — corpus scan + .xlsm fingerprint + drift warnings. */
  report(opts?: ReportOptions): ElectrodeCoverageReport | ElectrodeCoverageReportError {
    // Validate baselineOverride if provided. Widen to {electrodes:number; taptites:number}
    // so the override branch can assign a non-literal-typed object (BASELINE_EXPECTED
    // is `Object.freeze`d with literal 73/22 — TS narrows it to those literals).
    let baseline: { electrodes: number; taptites: number } = BASELINE_EXPECTED;
    if (opts?.baselineOverride) {
      const bo = opts.baselineOverride;
      if (
        typeof bo.electrodes !== "number" ||
        typeof bo.taptites !== "number" ||
        !Number.isFinite(bo.electrodes) ||
        !Number.isFinite(bo.taptites) ||
        bo.electrodes < 0 ||
        bo.taptites < 0
      ) {
        return {
          ok: false,
          error: "invalid_baseline_override",
          detail:
            "baselineOverride must have finite non-negative electrodes + taptites",
        };
      }
      baseline = {
        electrodes: Math.floor(bo.electrodes),
        taptites: Math.floor(bo.taptites),
      };
    }

    const corpusScan = this.scanCorpus({
      corpusRoot: opts?.corpusRoot,
      maxDepth: opts?.maxDepth,
      presetSnapshot: opts?.presetSnapshot,
    });
    if (!corpusScan.ok) {
      return {
        ok: false,
        error: "corpus_scan_failed",
        detail: corpusScan.detail,
        corpusScan,
      };
    }

    const xlsmFingerprint = this.xlsmFingerprint({ xlsmPath: opts?.xlsmPath });

    const driftWarnings: string[] = [];
    const electrodeMatch = corpusScan.electrodeCount === baseline.electrodes;
    const taptiteMatch = corpusScan.taptiteCount === baseline.taptites;

    if (!electrodeMatch) {
      const dir = corpusScan.electrodeCount > baseline.electrodes ? "+" : "-";
      driftWarnings.push(
        `electrode count drifted: live=${corpusScan.electrodeCount} expected=${baseline.electrodes} (${dir}${Math.abs(corpusScan.electrodeCount - baseline.electrodes)})`,
      );
    }
    if (!taptiteMatch) {
      const dir = corpusScan.taptiteCount > baseline.taptites ? "+" : "-";
      driftWarnings.push(
        `taptite count drifted: live=${corpusScan.taptiteCount} expected=${baseline.taptites} (${dir}${Math.abs(corpusScan.taptiteCount - baseline.taptites)})`,
      );
    }
    if (xlsmFingerprint.ok) {
      if ("exists" in xlsmFingerprint && !xlsmFingerprint.exists) {
        driftWarnings.push(`xlsm reference missing at ${xlsmFingerprint.path}`);
      }
    } else {
      driftWarnings.push(
        `xlsm fingerprint error (${xlsmFingerprint.error}) at ${xlsmFingerprint.path}`,
      );
    }
    if (corpusScan.truncated) {
      driftWarnings.push(
        `corpus walk truncated at maxDepth=${corpusScan.maxDepth} — counts may be undercounts`,
      );
    }

    return {
      ok: true,
      corpusScan,
      xlsmFingerprint,
      baselineExpected: { ...baseline },
      baselineMatch: { electrodes: electrodeMatch, taptites: taptiteMatch },
      driftWarnings,
      reportedAt: new Date().toISOString(),
      schemaVersion: SCHEMA_VERSION,
    };
  }
}

/** Singleton — camDispatcher case-handlers import this. */
export const electrodeCoverageAuditEngine = new ElectrodeCoverageAuditEngine();
