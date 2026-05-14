/**
 * PartFolderOrganizerEngine — JM Die per-customer / per-part-number folder library
 *
 * Maintains the standardized intake folder for every part that enters the system:
 *
 *   <libraryRoot>/<CUSTOMER>/<PART NUMBER>/
 *     <PART NUMBER>__<srcpdf>__p<page>.pdf   ← the print(s) + related docs (folder root)
 *     part.json                               ← manifest (provenance, match confidence, source paths)
 *     CNC PROGRAM/                             ← .min / .nc / .eia / .hnc / ...  (the NC program(s))
 *       <files>
 *     CAD-CAM/                                 ← .mcx-8 / .ipt / .iam / .step / .dwg / ...  (CAM project + CAD model)
 *       <files>
 *
 * libraryRoot defaults to `H:/PRISM/JM DIE/_PART LIBRARY`. Layout knobs (subdir names,
 * sanitization rules, file-classification ext lists, customer-resolution priority) live in
 * `mcp-server/data/state/part-library-layout.json` so this engine and the one-time bulk
 * backfill `Docustrata/.index/phase18-build-part-library.py` agree on the structure.
 *
 * This engine is the ON-DEMAND interface (one new order at a time):
 *   - createPartFolder(input)        — file/refile a part; idempotent (skips a complete folder)
 *   - getPartFolder({customer,part}) — look one up
 *   - partLibraryStats({})           — count parts / customers / coverage / disk
 *   - populateFromJoinTable({...})    — drain N rows of the print->program join table into folders
 *                                       (default limit small; the python script is the unbounded bulk path)
 *
 * Source of the matches: `Docustrata/.index/blueprint-program-join-full-v6.jsonl` (read directly;
 * does NOT depend on BlueprintProgramJoinEngine "serve" mode). v6 = phase16-v6 join over the
 * cleaned phase20 verified-prints index (44k dup page records dropped, dates/phones/dimension
 * callouts filtered out) — supersedes v5. doc_id -> source-PDF path comes from
 * `Docustrata/.index/phase7-drawing-candidates.jsonl`. Callers may still override `joinJsonl`.
 *
 * Print page isolation: when copyMode==="copy" and a print is given as {sourcePdf, page}, the page is
 * extracted to a single-page PDF via PyMuPDF (fitz) shelled out to the portable python. If python is
 * unavailable or extraction fails, the whole source PDF is copied instead (the print is still PRESENT)
 * and the manifest records the page index + a note.
 *
 * @module engines/PartFolderOrganizerEngine
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

// ─────────────────────────────────────────────────────────────────────────────
// Layout config (single source of truth, shared with the python backfill)
// ─────────────────────────────────────────────────────────────────────────────

// PRISM is H:-rooted (see CLAUDE.md "Source of truth: H:/prism"); override with PRISM_PART_LIBRARY_LAYOUT
// if running from elsewhere. If the file isn't found, getLayout() falls back to DEFAULT_LAYOUT (identical
// values), so a wrong/missing path here is non-fatal — it just makes the layout non-editable-via-file.
//
// Resolved lazily on every getLayout() call (NOT captured at module load) so tests can swap
// PRISM_PART_LIBRARY_LAYOUT mid-run and get the new config; otherwise the prod default would
// be baked in at the first import and every test override would be silently ignored.
function layoutConfigPath(): string {
  return process.env.PRISM_PART_LIBRARY_LAYOUT || "H:/prism/mcp-server/data/state/part-library-layout.json";
}

export interface PartLibraryLayout {
  schemaVersion: string;
  libraryRoot: string;
  cncSubdir: string;
  cadCamSubdir: string;
  manifestName: string;
  unassignedCustomer: string;
  templateFolder: string;
  buildSummaryName: string;
  readmeName: string;
  sanitize: {
    maxLen: number;
    illegalChars: string;
    stripControlChars: boolean;
    collapseWhitespace: boolean;
    trimDotsAndSpaces: boolean;
    uppercase: boolean;
    emptyFallback: string;
    rejectTraversal: boolean;
  };
  fileClassification: { cncExts: string[]; cadCamExts: string[]; comment?: string };
  customerResolution: {
    priority: string[];
    printOcrRejectPatterns: string[];
    /** canonical -> [OCR-garble variants that mean the same company]. Used by canonicalizeCustomer. */
    aliases?: Array<{ canonical: string; variants?: string[] }>;
    /** UPPERCASE prefixes that route a sanitized candidate to _UNASSIGNED. */
    noisePrefixes?: string[];
    /** Regex sources (JS flavor, case-insensitive at apply time) that route to _UNASSIGNED. */
    noiseRegexes?: string[];
    comment?: string;
    aliasesComment?: string;
  };
  manifestFields?: { required: string[]; optional: string[]; comment?: string };
}

const DEFAULT_LAYOUT: PartLibraryLayout = {
  schemaVersion: "1.0.0",
  libraryRoot: "H:/PRISM/JM DIE/_PART LIBRARY",
  cncSubdir: "CNC PROGRAM",
  cadCamSubdir: "CAD-CAM",
  manifestName: "part.json",
  unassignedCustomer: "_UNASSIGNED",
  templateFolder: "_TEMPLATE",
  buildSummaryName: "_BUILD_SUMMARY.md",
  readmeName: "README.md",
  sanitize: {
    maxLen: 80,
    illegalChars: '<>:"/\\|?*',
    stripControlChars: true,
    collapseWhitespace: true,
    trimDotsAndSpaces: true,
    uppercase: true,
    emptyFallback: "_UNNAMED",
    rejectTraversal: true,
  },
  fileClassification: {
    cncExts: [".min", ".nc", ".eia", ".hnc", ".h", ".cnc", ".tap", ".ngc", ".mpf", ".spf", ".pim", ".pit", ".lib", ".nci"],
    cadCamExts: [".mcx-8", ".mcx-9", ".mcx-7", ".mcx", ".mcam", ".emcam", ".ipt", ".iam", ".idw", ".ipn", ".sldprt", ".sldasm", ".slddrw", ".step", ".stp", ".igs", ".iges", ".x_t", ".x_b", ".dwg", ".dxf", ".catpart", ".catproduct", ".f3d", ".f3z", ".stl", ".prt", ".par", ".psm", ".asm", ".3dm", ".jt", ".sat"],
  },
  customerResolution: {
    priority: ["program_path", "print_ocr", "unassigned"],
    printOcrRejectPatterns: ["^\\d+$", "^[\\d\\s\\-./]+$", "^\\d{1,5}\\s", "^(PO|P\\.?O\\.?|QTY|REV|DWG|PART|SHEET|SCALE|DATE|JOB)\\b", "STREET|AVENUE|SUITE|FAX|PHONE|TEL\\b|ZIP\\b"],
  },
};

let _layoutCache: { mtimeMs: number; cfg: PartLibraryLayout } | null = null;

/** Load (and cache, with mtime invalidation) the layout config. Falls back to DEFAULT_LAYOUT. */
export function getLayout(): PartLibraryLayout {
  try {
    const st = fs.statSync(layoutConfigPath());
    if (_layoutCache && _layoutCache.mtimeMs === st.mtimeMs) return _layoutCache.cfg;
    const raw = JSON.parse(fs.readFileSync(layoutConfigPath(), "utf-8"));
    const cfg: PartLibraryLayout = { ...DEFAULT_LAYOUT, ...raw, sanitize: { ...DEFAULT_LAYOUT.sanitize, ...(raw.sanitize ?? {}) }, fileClassification: { ...DEFAULT_LAYOUT.fileClassification, ...(raw.fileClassification ?? {}) }, customerResolution: { ...DEFAULT_LAYOUT.customerResolution, ...(raw.customerResolution ?? {}) } };
    _layoutCache = { mtimeMs: st.mtimeMs, cfg };
    return cfg;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sanitization & path safety
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Make `raw` safe to use as a single path segment (folder or file name component).
 * Strips path separators, illegal chars, control chars, leading/trailing dots & spaces,
 * collapses whitespace, uppercases, truncates to maxLen, and never returns "" / "." / ".." /
 * a string containing a separator. Anything that would escape its parent collapses to the fallback.
 */
export function sanitizeSegment(raw: unknown, maxLen?: number): string {
  const cfg = getLayout().sanitize;
  let s = typeof raw === "string" ? raw : raw == null ? "" : String(raw);
  // kill control chars + the literal NUL
  if (cfg.stripControlChars) s = s.replace(/[\x00-\x1f\x7f]/g, "");
  // kill path separators outright (they would create nesting / escape)
  s = s.replace(/[/\\]/g, " ");
  // kill explicitly-illegal filename chars
  if (cfg.illegalChars) {
    const set = new Set(cfg.illegalChars.split(""));
    s = s.split("").map((ch) => (set.has(ch) ? " " : ch)).join("");
  }
  if (cfg.collapseWhitespace) s = s.replace(/\s+/g, " ");
  s = s.trim();
  if (cfg.trimDotsAndSpaces) s = s.replace(/^[.\s]+|[.\s]+$/g, "");
  // Windows reserved device names
  if (/^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(s)) s = `_${s}`;
  if (cfg.uppercase) s = s.toUpperCase();
  const lim = Math.max(1, maxLen ?? cfg.maxLen);
  if (s.length > lim) s = s.slice(0, lim).replace(/[.\s]+$/, "");
  // traversal / empties
  if (s === "" || s === "." || s === ".." || (cfg.rejectTraversal && s.includes(".."))) {
    return cfg.emptyFallback;
  }
  return s;
}

/** Compute (and validate) the folder path for a part. Throws if the result would escape libraryRoot. */
export function partFolderPath(customer: unknown, partNumber: unknown, libraryRoot?: string): string {
  const cfg = getLayout();
  const root = path.resolve(libraryRoot || cfg.libraryRoot);
  const cust = sanitizeSegment(customer);
  const part = sanitizeSegment(partNumber);
  const folder = path.resolve(root, cust, part);
  const rootWithSep = root.endsWith(path.sep) ? root : root + path.sep;
  if (folder !== root && !folder.startsWith(rootWithSep)) {
    throw new Error(`PartFolderOrganizer: refusing path traversal — '${String(customer)}'/'${String(partNumber)}' resolves outside ${root}`);
  }
  // a part folder must be exactly two levels under root (customer/part); never the root or a customer dir alone
  const rel = path.relative(root, folder);
  const parts = rel.split(path.sep).filter(Boolean);
  if (parts.length !== 2) {
    throw new Error(`PartFolderOrganizer: bad part path depth (${parts.length}) for '${String(customer)}'/'${String(partNumber)}'`);
  }
  return folder;
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer resolution & file classification
// ─────────────────────────────────────────────────────────────────────────────

/** Reject patterns -> compiled once. */
let _rejectRe: RegExp[] | null = null;
function rejectRes(): RegExp[] {
  if (_rejectRe) return _rejectRe;
  _rejectRe = getLayout().customerResolution.printOcrRejectPatterns.map((p) => {
    try { return new RegExp(p, "i"); } catch { return /a^/; }
  });
  return _rejectRe;
}

/** Is `c` a plausible real customer name (not a number / address fragment / form label)? */
export function isPlausibleCustomer(c: unknown): boolean {
  if (typeof c !== "string") return false;
  const t = c.trim();
  if (t.length < 2 || t.length > 100) return false;
  for (const re of rejectRes()) if (re.test(t)) return false;
  return /[a-z]/i.test(t); // must contain at least one letter
}

// ─────────────────────────────────────────────────────────────────────────────
// Customer canonicalization (aliases + noise patterns from layout config)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Memoized index of customerResolution.{aliases, noisePrefixes, noiseRegexes}, keyed on the
 * config's mtime so an in-place edit of part-library-layout.json is picked up without restart
 * (matching getLayout()'s invalidation semantics). Built lazily on first canonicalizeCustomer call.
 */
let _aliasIndex: { mtimeMs: number; map: Map<string, string>; prefixes: string[]; regexes: RegExp[] } | null = null;

function buildAliasIndex(mtimeMs: number): { mtimeMs: number; map: Map<string, string>; prefixes: string[]; regexes: RegExp[] } {
  const cr = getLayout().customerResolution;
  // Aggressive mode skips noiseRegexes containing the `{N,}$` quantifier-anchor pair
  // (e.g. `^[A-Z]{5,}$`, the all-uppercase catch-all). Those match real customer names
  // like `POPCUST` / `WIDGET` and only fire conservatively when explicitly opted-in.
  // Mirrors the AGGRESSIVE flag in Docustrata/.index/phase19-consolidate-customers.py.
  const aggressive = process.env.PRISM_PART_CANONICAL_AGGRESSIVE === "1";
  const map = new Map<string, string>();
  for (const a of cr.aliases ?? []) {
    const can = String(a?.canonical ?? "").toUpperCase().trim();
    if (!can) continue;
    map.set(can, can); // canonical -> itself (idempotent)
    for (const v of a?.variants ?? []) {
      const vu = String(v ?? "").toUpperCase().trim();
      if (vu) map.set(vu, can);
    }
  }
  const prefixes = (cr.noisePrefixes ?? []).map((p: unknown) => String(p ?? "").toUpperCase().trim()).filter(Boolean);
  const regexes: RegExp[] = [];
  for (const rx of cr.noiseRegexes ?? []) {
    const s = String(rx);
    if (!aggressive && s.includes("{5,}$")) continue; // conservative default
    try { regexes.push(new RegExp(s, "i")); } catch { /* skip malformed */ }
  }
  return { mtimeMs, map, prefixes, regexes };
}

function aliasIndex(): { map: Map<string, string>; prefixes: string[]; regexes: RegExp[] } {
  // tie cache validity to the layout cache's mtime (or 0 if file missing — DEFAULT_LAYOUT path)
  const mt = _layoutCache?.mtimeMs ?? 0;
  if (!_aliasIndex || _aliasIndex.mtimeMs !== mt) _aliasIndex = buildAliasIndex(mt);
  return _aliasIndex;
}

/**
 * Apply the `customerResolution.aliases` + `noisePrefixes` + `noiseRegexes` map from
 * part-library-layout.json to an already-sanitized (UPPERCASE) customer name.
 *
 * Returns:
 *   - the canonical company name when the input matches an alias variant (or canonical itself);
 *   - `_UNASSIGNED` when the input matches a noisePrefix or noiseRegex;
 *   - the input unchanged when no rule applies (so unknown but plausible names still create
 *     a customer folder under their own name — phase19 / human review handles the long tail).
 *
 * Matching is on the sanitized name as-is, then with leading digits stripped (OCR often prepends
 * a page/line number, e.g. `61BARNESINDUSTR`). `_UNASSIGNED` / `_UNNAMED` / empty inputs are
 * returned unchanged. Mirrors the canonicalize() logic in
 * `Docustrata/.index/phase19-consolidate-customers.py` so the two paths agree.
 */
export function canonicalizeCustomer(sanitized: string): string {
  if (typeof sanitized !== "string") return "";
  const cfg = getLayout();
  const unassigned = cfg.unassignedCustomer || "_UNASSIGNED";
  const empty = cfg.sanitize?.emptyFallback || "_UNNAMED";
  if (sanitized === "" || sanitized === unassigned || sanitized === empty) return sanitized;
  const idx = aliasIndex();
  // 1) exact alias / canonical
  if (idx.map.has(sanitized)) return idx.map.get(sanitized)!;
  // 2) leading-digit strip, try again
  const stripped = sanitized.replace(/^\d+/, "").trim();
  if (stripped && stripped !== sanitized && idx.map.has(stripped)) return idx.map.get(stripped)!;
  // 3) noise prefix / regex on both candidates
  const candidates = stripped && stripped !== sanitized ? [sanitized, stripped] : [sanitized];
  for (const c of candidates) {
    for (const p of idx.prefixes) if (p && c.startsWith(p)) return unassigned;
    for (const rx of idx.regexes) if (rx.test(c)) return unassigned;
  }
  // 4) no rule — keep as-is (a plausible but unmapped customer)
  return sanitized;
}

/** Test-only: clear the memoized alias index so a config edit is picked up without an mtime change. */
export function _resetCanonicalizationCache(): void {
  _aliasIndex = null;
  _layoutCache = null;
}

/**
 * Pick the customer folder name. Priority (from the layout config): the human-filed program-folder
 * customer > a sane OCR'd print title-block customer > `_UNASSIGNED`. The chosen raw name is
 * sanitized AND canonicalized (aliases collapse OCR-garble variants to the canonical company;
 * noise patterns route obvious non-customers to `_UNASSIGNED`). Returns the canonical name plus
 * which raw source it came from — note `source` records *provenance*, not the final routing,
 * so a name from program_path that got noise-routed still reports source="program_path" with
 * customer="_UNASSIGNED" (the manifest preserves that as "<source>+consolidated" downstream).
 */
export function resolveCustomer(input: { programCustomers?: unknown[]; printCustomers?: unknown[] }): { customer: string; source: "program_path" | "print_ocr" | "unassigned" } {
  const cfg = getLayout();
  const unassigned = sanitizeSegment(cfg.unassignedCustomer);
  for (const src of cfg.customerResolution.priority) {
    if (src === "program_path") {
      for (const c of input.programCustomers ?? []) {
        if (isPlausibleCustomer(c)) {
          const customer = canonicalizeCustomer(sanitizeSegment(c));
          return { customer, source: customer === unassigned ? "unassigned" : "program_path" };
        }
      }
    } else if (src === "print_ocr") {
      for (const c of input.printCustomers ?? []) {
        if (isPlausibleCustomer(c)) {
          const customer = canonicalizeCustomer(sanitizeSegment(c));
          return { customer, source: customer === unassigned ? "unassigned" : "print_ocr" };
        }
      }
    }
  }
  return { customer: unassigned, source: "unassigned" };
}

/** Classify a program/CAD file path into the CNC-program bucket or the CAD-CAM bucket. */
export function classifyFile(filePath: string, kind3Hint?: string): "cnc" | "cadcam" {
  if (kind3Hint === "nc_program") return "cnc";
  if (kind3Hint === "cam_project") return "cadcam";
  const cfg = getLayout().fileClassification;
  const ext = path.extname(filePath || "").toLowerCase();
  if (cfg.cncExts.includes(ext)) return "cnc";
  if (cfg.cadCamExts.includes(ext)) return "cadcam";
  // unknown -> default to CAD-CAM (it's the catch-all for "design artifact"); NC files almost always have a known ext
  return "cadcam";
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest types
// ─────────────────────────────────────────────────────────────────────────────

export interface PrintRef {
  /** Source multi-page PDF the print page lives in. */
  sourcePdf?: string;
  /** 0-based page index inside sourcePdf. */
  page?: number;
  /** Alternatively, a standalone file already on disk to copy in as-is (a single-page PDF, an image, a doc). */
  file?: string;
  drawingScore?: number;
  docId?: string;
  /** Human label, e.g. "print" / "PO" / "router". */
  label?: string;
}
export interface ProgramRef {
  sourcePath: string;
  machineCategory?: string;
  kind3?: string;
  kind?: string;
  customer?: string;
  via?: string;
  customerMatch?: string;
}
export interface PartManifest {
  schemaVersion: string;
  partNumber: string;
  partNumberRaw?: string;
  partNumberNormalized?: string;
  rawVariants?: string[];
  customer: string;
  customerSource: "program_path" | "print_ocr" | "unassigned" | "explicit";
  printCustomersOCR?: string[];
  matchConfidence?: string;
  prints: Array<{ copiedAs: string | null; sourcePdf?: string; page?: number; file?: string; drawingScore?: number; docId?: string; label?: string; note?: string }>;
  cncPrograms: Array<{ copiedAs: string | null; sourcePath: string; ext: string; machineCategory?: string; kind3?: string; via?: string; customerMatch?: string; note?: string }>;
  cadCam: Array<{ copiedAs: string | null; sourcePath: string; ext: string; machineCategory?: string; kind3?: string; via?: string; customerMatch?: string; note?: string }>;
  copyMode: "copy" | "manifest" | "hardlink";
  joinTableSource?: string;
  notes?: string[];
  createdAt: string;
  createdBy: string;
  lastUpdatedAt?: string;
}

export interface CreatePartFolderInput {
  partNumber: string | number;
  customer?: string;
  partNumberNormalized?: string;
  rawVariants?: string[];
  printCustomers?: unknown[];
  programCustomers?: unknown[];
  matchConfidence?: string;
  prints?: PrintRef[];
  cncPrograms?: ProgramRef[];
  cadCam?: ProgramRef[];
  /** Un-split program list — the engine routes each to cnc/cadcam via classifyFile. */
  programs?: ProgramRef[];
  libraryRoot?: string;
  copyMode?: "copy" | "manifest" | "hardlink";
  overwrite?: boolean;
  joinTableSource?: string;
  notes?: string[];
  createdBy?: string;
}
export interface CreatePartFolderResult {
  ok: boolean;
  folderPath: string;
  customer: string;
  partNumber: string;
  created: boolean;
  skipped: boolean;
  manifest: PartManifest;
  copied: { prints: number; cnc: number; cadcam: number };
  warnings: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// File ops
// ─────────────────────────────────────────────────────────────────────────────

function pythonBin(): string {
  return process.env.PRISM_PYTHON || "H:/Tools/python/python.exe";
}

/** Strip filesystem-illegal chars + control chars from a *file name* (NOT a folder segment): no uppercasing,
 *  no whitespace collapsing — original case / spaces / hyphens / dots-in-extensions are preserved. */
function sanitizeFilename(name: string): string {
  const ILLEGAL = new Set(['<', '>', ':', '"', '/', '\\', '|', '?', '*']);
  let n = String(name ?? "").split("").map((c) => (ILLEGAL.has(c) || c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127 ? "_" : c)).join("");
  n = n.replace(/^\.+/, "_").replace(/[. ]+$/, "");
  return n.length > 0 ? n.slice(0, 200) : "file";
}

/** Make `name` unique inside `dir` by suffixing " (2)", " (3)", ... before the extension. */
function uniqueName(dir: string, name: string): string {
  if (!fs.existsSync(path.join(dir, name))) return name;
  const ext = path.extname(name);
  const base = name.slice(0, name.length - ext.length);
  for (let i = 2; i < 1000; i++) {
    const cand = `${base} (${i})${ext}`;
    if (!fs.existsSync(path.join(dir, cand))) return cand;
  }
  return `${base} (${Date.now()})${ext}`;
}

/** Copy / hardlink one source file into destDir; returns the written filename or null on failure. */
function placeFile(src: string, destDir: string, destName: string, mode: "copy" | "hardlink", warnings: string[]): string | null {
  if (typeof src !== "string" || src.length === 0) { warnings.push(`invalid source path: ${String(src)}`); return null; }
  try {
    if (!fs.existsSync(src) || !fs.statSync(src).isFile()) {
      warnings.push(`source missing: ${src}`);
      return null;
    }
    const name = uniqueName(destDir, sanitizeFilename(destName));
    const dest = path.join(destDir, name);
    if (mode === "hardlink") {
      try { fs.linkSync(src, dest); return name; }
      catch { /* cross-device or unsupported — fall through to copy */ }
    }
    fs.copyFileSync(src, dest);
    return name;
  } catch (e: unknown) {
    warnings.push(`copy failed (${src}): ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}

/** Extract page `page` (0-based) from `srcPdf` into destDir as a single-page PDF. Returns filename or null. */
function extractPdfPage(srcPdf: string, page: number, destDir: string, destName: string, warnings: string[]): string | null {
  if (typeof srcPdf !== "string" || srcPdf.length === 0) { warnings.push(`invalid source PDF path: ${String(srcPdf)}`); return null; }
  try {
    if (!fs.existsSync(srcPdf)) { warnings.push(`source PDF missing: ${srcPdf}`); return null; }
    const name = uniqueName(destDir, sanitizeFilename(destName));
    const dest = path.join(destDir, name);
    const py = `import sys,fitz\ns,d,p=sys.argv[1],sys.argv[2],int(sys.argv[3])\nsrc=fitz.open(s)\nif p<0 or p>=src.page_count: p=max(0,min(p,src.page_count-1))\nout=fitz.open()\nout.insert_pdf(src,from_page=p,to_page=p)\nout.save(d)\nout.close(); src.close()\nprint("OK")`;
    execFileSync(pythonBin(), ["-c", py, srcPdf, dest, String(page)], { stdio: ["ignore", "pipe", "pipe"], timeout: 60_000 });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) return name;
    warnings.push(`page-extract produced empty file: ${srcPdf} p${page}`);
    try { fs.unlinkSync(dest); } catch { /* ok */ }
    return null;
  } catch (e: unknown) {
    warnings.push(`page-extract failed (${srcPdf} p${page}): ${(e instanceof Error ? e.message : String(e)).split("\n")[0]}`);
    return null;
  }
}

function baseNoExt(p: string): string {
  const b = path.basename(String(p ?? ""));
  const ext = path.extname(b);
  return b.slice(0, b.length - ext.length) || b;
}

function isManifestComplete(m: unknown): boolean {
  if (!m || typeof m !== "object") return false;
  const r = m as Record<string, unknown>;
  return typeof r.partNumber === "string" && typeof r.customer === "string" && Array.isArray(r.prints) && Array.isArray(r.cncPrograms) && Array.isArray(r.cadCam) && typeof r.createdAt === "string";
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

const CREATED_BY = "PartFolderOrganizerEngine v1";

function createPartFolder(input: CreatePartFolderInput): CreatePartFolderResult {
  const cfg = getLayout();
  const warnings: string[] = [];
  const copyMode: "copy" | "manifest" | "hardlink" = input.copyMode === "manifest" || input.copyMode === "hardlink" ? input.copyMode : "copy";

  const rawPN = input.partNumber == null ? "" : String(input.partNumber);
  const partNumber = sanitizeSegment(rawPN);
  if (partNumber === cfg.sanitize.emptyFallback && rawPN.trim() === "") {
    throw new Error("PartFolderOrganizer.createPartFolder: partNumber is required");
  }

  // customer
  let customer: string;
  let customerSource: PartManifest["customerSource"];
  if (typeof input.customer === "string" && input.customer.trim() !== "") {
    customer = sanitizeSegment(input.customer);
    customerSource = "explicit";
  } else {
    const r = resolveCustomer({ programCustomers: input.programCustomers, printCustomers: input.printCustomers });
    customer = r.customer;
    customerSource = r.source;
  }

  const folderPath = partFolderPath(customer, partNumber, input.libraryRoot);

  // idempotency: a complete folder is left alone unless overwrite
  const manifestPath = path.join(folderPath, cfg.manifestName);
  if (!input.overwrite && fs.existsSync(manifestPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      if (isManifestComplete(existing)) {
        return { ok: true, folderPath, customer, partNumber, created: false, skipped: true, manifest: existing, copied: { prints: 0, cnc: 0, cadcam: 0 }, warnings };
      }
    } catch { /* fall through and rebuild */ }
  }

  // build the tree
  const cncDir = path.join(folderPath, cfg.cncSubdir);
  const cadDir = path.join(folderPath, cfg.cadCamSubdir);
  fs.mkdirSync(folderPath, { recursive: true });
  fs.mkdirSync(cncDir, { recursive: true });
  fs.mkdirSync(cadDir, { recursive: true });

  const manifest: PartManifest = {
    schemaVersion: "1.0.0",
    partNumber,
    partNumberRaw: rawPN !== partNumber ? rawPN : undefined,
    partNumberNormalized: input.partNumberNormalized,
    rawVariants: input.rawVariants && input.rawVariants.length ? input.rawVariants : undefined,
    customer,
    customerSource,
    printCustomersOCR: (input.printCustomers ?? []).filter((x): x is string => typeof x === "string" && x.trim() !== ""),
    matchConfidence: input.matchConfidence,
    prints: [],
    cncPrograms: [],
    cadCam: [],
    copyMode,
    joinTableSource: input.joinTableSource,
    notes: input.notes && input.notes.length ? [...input.notes] : undefined,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy || CREATED_BY,
  };
  if (!manifest.printCustomersOCR || manifest.printCustomersOCR.length === 0) delete manifest.printCustomersOCR;

  let nPrints = 0, nCnc = 0, nCad = 0;

  // normalize ref objects — tolerate snake_case (raw join-table rows / un-camelCased dispatcher params) + drop junk entries
  const asRec = (v: unknown): Record<string, unknown> => (v && typeof v === "object" ? (v as Record<string, unknown>) : {});
  const _s = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
  const _n = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);
  const normPrint = (v: unknown): PrintRef => { const r = asRec(v); return { sourcePdf: _s(r.sourcePdf ?? r.source_pdf), file: _s(r.file), page: _n(r.page), drawingScore: _n(r.drawingScore ?? r.drawing_score), docId: _s(r.docId ?? r.doc_id), label: _s(r.label) }; };
  const normProg = (v: unknown): ProgramRef => { const r = asRec(v); return { sourcePath: _s(r.sourcePath ?? r.source_path) ?? "", machineCategory: _s(r.machineCategory ?? r.machine_category), kind3: _s(r.kind3), kind: _s(r.kind), customer: _s(r.customer), via: _s(r.via), customerMatch: _s(r.customerMatch ?? r.customer_match) }; };
  const prints = (input.prints ?? []).map(normPrint).filter((r) => r.sourcePdf || r.file);
  const cncIn = (input.cncPrograms ?? []).map(normProg).filter((r) => r.sourcePath);
  const cadIn = (input.cadCam ?? []).map(normProg).filter((r) => r.sourcePath);
  const progsIn = (input.programs ?? []).map(normProg).filter((r) => r.sourcePath);

  // ── prints + related docs (folder root) ──
  for (const pr of prints) {
    if (pr.file) {
      // a standalone file already on disk
      if (copyMode === "manifest") {
        manifest.prints.push({ copiedAs: null, file: pr.file, label: pr.label, docId: pr.docId, drawingScore: pr.drawingScore, note: "manifest mode — not copied" });
        continue;
      }
      const dn = `${partNumber}__${path.basename(pr.file)}`;
      const w = placeFile(pr.file, folderPath, dn, copyMode === "hardlink" ? "hardlink" : "copy", warnings);
      manifest.prints.push({ copiedAs: w, file: pr.file, label: pr.label, docId: pr.docId, drawingScore: pr.drawingScore });
      if (w) nPrints++;
    } else if (pr.sourcePdf != null) {
      const pageIdx = Number.isFinite(pr.page as number) ? (pr.page as number) : 0;
      if (copyMode === "manifest") {
        manifest.prints.push({ copiedAs: null, sourcePdf: pr.sourcePdf, page: pageIdx, label: pr.label, docId: pr.docId, drawingScore: pr.drawingScore, note: "manifest mode — not copied" });
        continue;
      }
      const dn = `${partNumber}__${baseNoExt(pr.sourcePdf)}__p${pageIdx + 1}.pdf`;
      let w = extractPdfPage(pr.sourcePdf, pageIdx, folderPath, dn, warnings);
      let note: string | undefined;
      if (!w) {
        // fall back: copy the whole source PDF so the print is at least present
        w = placeFile(pr.sourcePdf, folderPath, `${partNumber}__${path.basename(pr.sourcePdf)}`, "copy", warnings);
        if (w) note = `page-extract unavailable — whole PDF copied; the print is page ${pageIdx + 1}`;
      }
      manifest.prints.push({ copiedAs: w, sourcePdf: pr.sourcePdf, page: pageIdx, label: pr.label, docId: pr.docId, drawingScore: pr.drawingScore, note });
      if (w) nPrints++;
    }
  }

  // ── programs (split or pre-split) ──
  const cncList: ProgramRef[] = [...cncIn];
  const cadList: ProgramRef[] = [...cadIn];
  for (const p of progsIn) {
    (classifyFile(p.sourcePath, p.kind3) === "cnc" ? cncList : cadList).push(p);
  }
  for (const p of cncList) {
    const ext = path.extname(p.sourcePath || "").toLowerCase();
    if (copyMode === "manifest") { manifest.cncPrograms.push({ copiedAs: null, sourcePath: p.sourcePath, ext, machineCategory: p.machineCategory, kind3: p.kind3, via: p.via, customerMatch: p.customerMatch, note: "manifest mode — not copied" }); continue; }
    const w = placeFile(p.sourcePath, cncDir, path.basename(p.sourcePath), copyMode === "hardlink" ? "hardlink" : "copy", warnings);
    manifest.cncPrograms.push({ copiedAs: w, sourcePath: p.sourcePath, ext, machineCategory: p.machineCategory, kind3: p.kind3, via: p.via, customerMatch: p.customerMatch });
    if (w) nCnc++;
  }
  for (const p of cadList) {
    const ext = path.extname(p.sourcePath || "").toLowerCase();
    if (copyMode === "manifest") { manifest.cadCam.push({ copiedAs: null, sourcePath: p.sourcePath, ext, machineCategory: p.machineCategory, kind3: p.kind3, via: p.via, customerMatch: p.customerMatch, note: "manifest mode — not copied" }); continue; }
    const w = placeFile(p.sourcePath, cadDir, path.basename(p.sourcePath), copyMode === "hardlink" ? "hardlink" : "copy", warnings);
    manifest.cadCam.push({ copiedAs: w, sourcePath: p.sourcePath, ext, machineCategory: p.machineCategory, kind3: p.kind3, via: p.via, customerMatch: p.customerMatch });
    if (w) nCad++;
  }

  if (warnings.length) manifest.notes = [...(manifest.notes ?? []), ...warnings.map((w) => `warn: ${w}`)];

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");

  return { ok: true, folderPath, customer, partNumber, created: true, skipped: false, manifest, copied: { prints: nPrints, cnc: nCnc, cadcam: nCad }, warnings };
}

function getPartFolder(input: { customer: string; partNumber: string | number; libraryRoot?: string }): { exists: boolean; folderPath: string; manifest?: PartManifest } {
  const cfg = getLayout();
  let folderPath: string;
  try { folderPath = partFolderPath(input.customer, input.partNumber, input.libraryRoot); }
  catch { return { exists: false, folderPath: "" }; }
  const exists = fs.existsSync(folderPath) && fs.statSync(folderPath).isDirectory();
  if (!exists) return { exists: false, folderPath };
  let manifest: PartManifest | undefined;
  try { manifest = JSON.parse(fs.readFileSync(path.join(folderPath, cfg.manifestName), "utf-8")); } catch { /* no manifest */ }
  return { exists: true, folderPath, manifest };
}

function dirSizeAndCount(dir: string): { bytes: number; files: number } {
  let bytes = 0, files = 0;
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return { bytes, files }; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { const r = dirSizeAndCount(full); bytes += r.bytes; files += r.files; }
    else { try { bytes += fs.statSync(full).size; files++; } catch { /* ok */ } }
  }
  return { bytes, files };
}

function partLibraryStats(input?: { libraryRoot?: string; byCustomer?: boolean; withDisk?: boolean }): {
  libraryRoot: string; exists: boolean; customers: number; parts: number;
  partsWithCnc: number; partsWithCad: number; partsPrintOnly: number;
  totalFiles?: number; diskBytes?: number; diskHuman?: string;
  byCustomer?: Record<string, { parts: number; withCnc: number; withCad: number }>;
} {
  const cfg = getLayout();
  const root = path.resolve(input?.libraryRoot || cfg.libraryRoot);
  const out = { libraryRoot: root, exists: false, customers: 0, parts: 0, partsWithCnc: 0, partsWithCad: 0, partsPrintOnly: 0 } as any;
  if (!fs.existsSync(root)) return out;
  out.exists = true;
  const skipTop = new Set([cfg.templateFolder, cfg.buildSummaryName, cfg.readmeName].map((x) => x));
  let custDirs: fs.Dirent[];
  try { custDirs = fs.readdirSync(root, { withFileTypes: true }); } catch { return out; }
  const byCustomer: Record<string, { parts: number; withCnc: number; withCad: number }> = {};
  let totalFiles = 0, diskBytes = 0;
  for (const cd of custDirs) {
    if (!cd.isDirectory() || skipTop.has(cd.name)) continue;
    out.customers++;
    const custPath = path.join(root, cd.name);
    let partDirs: fs.Dirent[];
    try { partDirs = fs.readdirSync(custPath, { withFileTypes: true }); } catch { continue; }
    let cParts = 0, cCnc = 0, cCad = 0;
    for (const pd of partDirs) {
      if (!pd.isDirectory()) continue;
      out.parts++; cParts++;
      const pPath = path.join(custPath, pd.name);
      let hasCnc = false, hasCad = false;
      try { hasCnc = fs.readdirSync(path.join(pPath, cfg.cncSubdir)).some((f) => !f.startsWith(".")); } catch { /* ok */ }
      try { hasCad = fs.readdirSync(path.join(pPath, cfg.cadCamSubdir)).some((f) => !f.startsWith(".")); } catch { /* ok */ }
      if (hasCnc) { out.partsWithCnc++; cCnc++; }
      if (hasCad) { out.partsWithCad++; cCad++; }
      if (!hasCnc && !hasCad) out.partsPrintOnly++;
      if (input?.withDisk) { const r = dirSizeAndCount(pPath); totalFiles += r.files; diskBytes += r.bytes; }
    }
    if (input?.byCustomer) byCustomer[cd.name] = { parts: cParts, withCnc: cCnc, withCad: cCad };
  }
  if (input?.withDisk) { out.totalFiles = totalFiles; out.diskBytes = diskBytes; out.diskHuman = `${(diskBytes / 1024 / 1024 / 1024).toFixed(2)} GB`; }
  if (input?.byCustomer) out.byCustomer = byCustomer;
  return out;
}

/**
 * Drain up to `limit` rows of the print->program join table into part folders.
 * The unbounded production backfill is `Docustrata/.index/phase18-build-part-library.py` — this is the
 * in-engine path for the dispatcher action / tests / small top-ups. Skips `match_confidence` in
 * `confidenceFilter`'s complement is NOT how this works — pass `confidenceFilter` to include only those
 * tiers; default skips only "garbage".
 */
function populateFromJoinTable(input?: {
  joinJsonl?: string; phase7Jsonl?: string; libraryRoot?: string;
  confidenceFilter?: string[]; copyMode?: "copy" | "manifest" | "hardlink";
  limit?: number; offset?: number; dryRun?: boolean;
}): { ok: boolean; scanned: number; created: number; skipped: number; errors: number; warnings: string[]; limit: number; reachedEnd: boolean; sample: string[] } {
  const cfg = getLayout();
  const joinPath = input?.joinJsonl || "H:/prism/Docustrata/.index/blueprint-program-join-full-v6.jsonl";
  const joinBasename = joinPath.replace(/\\/g, "/").split("/").pop() || joinPath;
  const phase7Path = input?.phase7Jsonl || "H:/prism/Docustrata/.index/phase7-drawing-candidates.jsonl";
  const limit = Math.max(1, Math.min(input?.limit ?? 25, 100_000));
  const offset = Math.max(0, input?.offset ?? 0);
  const copyMode = input?.copyMode ?? "copy";
  const include = input?.confidenceFilter && input.confidenceFilter.length ? new Set(input.confidenceFilter) : null;
  const warnings: string[] = [];
  const sample: string[] = [];
  let scanned = 0, created = 0, skipped = 0, errors = 0;

  if (!fs.existsSync(joinPath)) return { ok: false, scanned: 0, created: 0, skipped: 0, errors: 1, warnings: [`join table not found: ${joinPath}`], limit, reachedEnd: true, sample };

  // doc_id -> source pdf disk path
  const docPath = new Map<string, string>();
  try {
    for (const line of fs.readFileSync(phase7Path, "utf-8").split("\n")) {
      if (!line.trim()) continue;
      try { const r = JSON.parse(line); if (r.doc_id && r.disk_path) docPath.set(r.doc_id, r.disk_path); } catch { /* skip */ }
    }
  } catch { warnings.push(`phase7 candidates not loaded (${phase7Path}) — prints will use filename only`); }

  const lines = fs.readFileSync(joinPath, "utf-8").split("\n");
  let rowIdx = -1, processedHere = 0, reachedEnd = true;
  for (const line of lines) {
    if (!line.trim()) continue;
    rowIdx++;
    let row: any;
    try { row = JSON.parse(line); } catch { continue; }
    const conf = String(row.match_confidence ?? "miss");
    if (conf === "garbage") continue;
    if (include && !include.has(conf)) continue;
    if (rowIdx < offset) continue;
    if (processedHere >= limit) { reachedEnd = false; break; }
    processedHere++; scanned++;
    try {
      const prints: PrintRef[] = [];
      const seen = new Set<string>();
      for (const bp of row.blueprints ?? []) {
        const src = docPath.get(bp.doc_id);
        const key = `${src ?? bp.filename}::${bp.page_index}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (src) prints.push({ sourcePdf: src, page: bp.page_index ?? 0, drawingScore: bp.drawing_score, docId: bp.doc_id, label: "print" });
      }
      const cncP: ProgramRef[] = [], cadP: ProgramRef[] = [];
      const progCustomers: string[] = [];
      for (const pg of row.programs ?? []) {
        const ref: ProgramRef = { sourcePath: pg.source_path, machineCategory: pg.machineCategory, kind3: pg.kind3, kind: pg.kind, customer: pg.customer, via: pg.via, customerMatch: pg.customer_match };
        if (pg.customer) progCustomers.push(pg.customer);
        (classifyFile(ref.sourcePath, ref.kind3) === "cnc" ? cncP : cadP).push(ref);
      }
      if (input?.dryRun) {
        const cust = (typeof row.customer === "string" && row.customer) ? row.customer : resolveCustomer({ programCustomers: progCustomers, printCustomers: row.print_customers }).customer;
        if (sample.length < 25) sample.push(`${cust}/${sanitizeSegment(row.part_number)}  (conf=${conf}, prints=${prints.length}, cnc=${cncP.length}, cad=${cadP.length})`);
        continue;
      }
      const res = createPartFolder({
        partNumber: row.part_number, partNumberNormalized: row.part_number_normalized, rawVariants: row.raw_pn_variants,
        printCustomers: row.print_customers, programCustomers: progCustomers, matchConfidence: conf,
        prints, cncPrograms: cncP, cadCam: cadP, libraryRoot: input?.libraryRoot, copyMode,
        joinTableSource: `${joinBasename} row ${rowIdx}`,
        notes: ["Prints = drawing-likely pages from the phase15 OCR pass; non-drawing related docs (POs/routers) not yet keyed by PN."],
      });
      if (res.skipped) skipped++; else created++;
      if (res.warnings.length) for (const w of res.warnings.slice(0, 3)) warnings.push(`${res.customer}/${res.partNumber}: ${w}`);
      if (sample.length < 25) sample.push(`${res.customer}/${res.partNumber}${res.skipped ? " (skip)" : ""}`);
    } catch (e: any) {
      errors++;
      if (warnings.length < 200) warnings.push(`row ${rowIdx} (${row?.part_number}): ${String(e?.message ?? e).split("\n")[0]}`);
    }
  }
  return { ok: errors === 0 || created > 0 || skipped > 0, scanned, created, skipped, errors, warnings: warnings.slice(0, 50), limit, reachedEnd, sample };
}

// ─────────────────────────────────────────────────────────────────────────────
// Exports — static class + singleton (PRISM convention)
// ─────────────────────────────────────────────────────────────────────────────

export class PartFolderOrganizerEngine {
  static getLayout = getLayout;
  static sanitizeSegment = sanitizeSegment;
  static partFolderPath = partFolderPath;
  static isPlausibleCustomer = isPlausibleCustomer;
  static resolveCustomer = resolveCustomer;
  static classifyFile = classifyFile;
  static createPartFolder = createPartFolder;
  static getPartFolder = getPartFolder;
  static partLibraryStats = partLibraryStats;
  static populateFromJoinTable = populateFromJoinTable;
}

export const partFolderOrganizerEngine = {
  getLayout,
  sanitizeSegment,
  partFolderPath,
  isPlausibleCustomer,
  resolveCustomer,
  classifyFile,
  createPartFolder,
  getPartFolder,
  partLibraryStats,
  populateFromJoinTable,
};

export default partFolderOrganizerEngine;
