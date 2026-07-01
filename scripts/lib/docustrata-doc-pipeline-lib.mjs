// scripts/lib/docustrata-doc-pipeline-lib.mjs
//
// U-QP-DOCUSTRATA-RUN-ALL (slot:charlie, 2026-06-12) -- PURE CORE for the
// end-to-end "run ALL Docustrata documents through the quoting pipeline" runner.
//
// The pipeline the orchestrator (scripts/docustrata-run-all-documents.mjs) drives:
//
//   classified index  --[ROUTE]-->  text-layer docs --[pypdf]-----\
//   (73,506 records)                                                >--[MERGE]--> text-extracted
//                      \--------->  scanned docs    --[vision OCR]--/             (extractor input)
//                                                                       |
//                                                          extract-docustrata-outcomes.mjs
//                                                                       |
//                                                              (quoted,actual) pairs
//
// This module is PURE (no fs, no fetch, no spawn) so every stage is unit-testable
// without touching the 257K-file corpus or the GPU. The orchestrator owns I/O.
//
// WHY a router (the efficiency that makes 257K docs tractable): a born-digital PDF
// (most modern quotes/invoices) already carries a text layer -- pypdf extracts it
// in milliseconds with no GPU. Only true scans need the ~49s/page vision model.
// Routing first means we never spend vision inference on a document we can read for free.

// Roles the quoting closed-loop cares about (MUST match extract-docustrata-outcomes.mjs).
export const TARGET_ROLES = Object.freeze(["SALES_ORDER", "CLOSED_ORDER", "INVOICE", "QUOTE"]);

// Match the extractor's MIN_ROLE_CONFIDENCE so the work-set the orchestrator OCRs
// is exactly the set the extractor will later accept (no wasted OCR on rows the
// extractor would drop).
export const DEFAULT_MIN_ROLE_CONFIDENCE = 0.50;

// A born-digital PDF's text layer must carry at least this many chars to be
// trusted as the cheap route. Below it (e.g. a scan with a few stray OCR glyphs
// from a prior tool) we fall through to vision OCR. A real quote/invoice text
// layer is thousands of chars; a scan is ~0.
export const DEFAULT_TEXT_LAYER_MIN_CHARS = 200;

// The extractor requires text length >= 40 to attempt a parse (its own gate).
export const EXTRACTOR_MIN_TEXT_CHARS = 40;

/** Pure: is this a finite number >= 0? */
function nonNegNum(x) {
  const n = Number(x);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Pure: does a classified record qualify for the quoting work-set?
 * Mirrors the extractor's role + confidence gate exactly.
 * @param {object} rec
 * @param {{minRoleConfidence?: number, roles?: string[]}} [opts]
 */
export function isWorkSetDoc(rec, opts = {}) {
  if (!rec || typeof rec !== "object") return false;
  const roles = Array.isArray(opts.roles) && opts.roles.length ? opts.roles : TARGET_ROLES;
  const minConf = Number.isFinite(opts.minRoleConfidence) ? opts.minRoleConfidence : DEFAULT_MIN_ROLE_CONFIDENCE;
  if (!roles.includes(rec.inferred_role)) return false;
  const conf = nonNegNum(rec.role_confidence);
  if (conf == null || conf < minConf) return false;
  // must resolve to a real file on disk for any extraction route to run
  return typeof rec.disk_path === "string" && rec.disk_path.length > 0;
}

/**
 * Pure: filter classified records to the quoting work-set, with per-role counts.
 * @param {object[]} records
 * @param {{minRoleConfidence?: number, roles?: string[]}} [opts]
 * @returns {{docs: object[], byRole: Record<string, number>, total: number, matched: number}}
 */
export function selectDocumentWorkSet(records, opts = {}) {
  const docs = [];
  const byRole = {};
  let total = 0;
  if (Array.isArray(records)) {
    for (const rec of records) {
      total += 1;
      if (!isWorkSetDoc(rec, opts)) continue;
      docs.push(rec);
      byRole[rec.inferred_role] = (byRole[rec.inferred_role] || 0) + 1;
    }
  }
  return { docs, byRole, total, matched: docs.length };
}

// The on-disk JMD folder name IS the ground-truth document role -- far more
// reliable than the .index `inferred_role` classifier (which tags 36K docs
// SCAN_GENERIC and only 2 as a real doc-role). The quote/order corpus lives
// entirely OUTSIDE the .index (verified 2026-06-12: 0 index records inside a
// JMD quote/order folder), so this folder-name map is the only correct source
// for the 35,231 real quote/order PDFs. PACKING_SLIP is carried for completeness
// but is not a pairing target (no price). See reference_docustrata_index_misses_jmd_folders.
export const FOLDER_ROLE_MAP = Object.freeze({
  "JMD Quotes": "QUOTE",
  "JMD Sales Orders": "SALES_ORDER",
  "JMD Orders Closed": "CLOSED_ORDER",
  "JMD Packing Slips": "PACKING_SLIP",
});

/**
 * Pure: build a work-set straight from on-disk folder globs. The caller globs
 * each JMD folder and passes {ROLE: [absolute pdf paths]}; each path becomes a
 * work-set record with role = the folder's ground-truth role (confidence 1.0)
 * and an explicit text-layer-first route (folder docs have no index metadata).
 *
 * @param {Record<string, string[]>} pdfsByRole  e.g. { QUOTE: [...], SALES_ORDER: [...] }
 * @param {{roles?: string[]}} [opts]  restrict to these roles (default: all keys)
 * @returns {{docs: object[], byRole: Record<string, number>, total: number, matched: number}}
 */
export function buildWorkSetFromFolders(pdfsByRole, opts = {}) {
  const docs = [];
  const byRole = {};
  const seen = new Set();
  const roleFilter = Array.isArray(opts.roles) && opts.roles.length ? new Set(opts.roles) : null;
  if (pdfsByRole && typeof pdfsByRole === "object") {
    for (const [role, paths] of Object.entries(pdfsByRole)) {
      if (roleFilter && !roleFilter.has(role)) continue;
      if (!Array.isArray(paths)) continue;
      for (const raw of paths) {
        const p = typeof raw === "string" ? raw.trim() : "";
        if (!p || seen.has(p)) continue;
        seen.add(p);
        docs.push({ disk_path: p, inferred_role: role, role_confidence: 1.0, _route: "textLayer", source: "folder" });
        byRole[role] = (byRole[role] || 0) + 1;
      }
    }
  }
  return { docs, byRole, total: docs.length, matched: docs.length };
}

/**
 * Pure: which extraction route a work-set doc takes.
 *   "textLayer" -- born-digital, pypdf reads the text layer (cheap, no GPU)
 *   "ocr"       -- scanned image, needs the vision model (expensive)
 *
 * Precedence: an explicit needs_ocr:true ALWAYS forces OCR (the index already
 * decided it has no usable layer). Otherwise a sufficiently long text layer wins.
 * Default (no signal) = OCR -- the safe choice: a scan with no detected layer
 * must go through vision, never be silently skipped as "text-layer empty".
 *
 * @param {object} rec
 * @param {{textLayerMinChars?: number}} [opts]
 * @returns {"textLayer"|"ocr"}
 */
export function routeDocument(rec, opts = {}) {
  const minChars = Number.isFinite(opts.textLayerMinChars) ? opts.textLayerMinChars : DEFAULT_TEXT_LAYER_MIN_CHARS;
  if (!rec || typeof rec !== "object") return "ocr";
  // Explicit route override (folder-sourced docs carry no index metadata, so they
  // probe the cheap text-layer route first; pypdf failures fall through to OCR).
  if (rec._route === "textLayer" || rec._route === "ocr") return rec._route;
  if (rec.needs_ocr === true) return "ocr";
  const chars = nonNegNum(rec.text_layer_chars);
  if (rec.has_text_layer === true && chars != null && chars >= minChars) return "textLayer";
  if (chars != null && chars >= minChars) return "textLayer";
  return "ocr";
}

/**
 * Pure: partition the work-set into the two extraction routes.
 * @param {object[]} docs
 * @param {{textLayerMinChars?: number}} [opts]
 * @returns {{textLayer: object[], ocr: object[]}}
 */
export function partitionByRoute(docs, opts = {}) {
  const out = { textLayer: [], ocr: [] };
  if (Array.isArray(docs)) {
    for (const rec of docs) out[routeDocument(rec, opts)].push(rec);
  }
  return out;
}

/**
 * Pure: build a de-duplicated, order-preserving worklist of disk paths from
 * records (skips records without a disk_path). Returns the array; the caller
 * joins with "\n" for the OCR runner's --worklist file.
 * @param {object[]} docs
 * @returns {string[]}
 */
export function buildWorklistPaths(docs) {
  const seen = new Set();
  const out = [];
  if (!Array.isArray(docs)) return out;
  for (const rec of docs) {
    const p = rec && typeof rec.disk_path === "string" ? rec.disk_path.trim() : "";
    if (!p || seen.has(p)) continue;
    seen.add(p);
    out.push(p);
  }
  return out;
}

/**
 * Pure: parse a document-OCR/text checkpoint JSONL into a Map(disk_path -> text).
 * The orchestrator writes one line per processed doc: {path, text, ok, ...}.
 * Tolerant of malformed lines (skips them). Last write for a path wins (resume).
 * Only ok==true rows with non-empty text are indexed.
 * @param {string} jsonlText
 * @returns {Map<string,string>}
 */
export function parseDocTextCheckpoint(jsonlText) {
  const map = new Map();
  if (typeof jsonlText !== "string" || !jsonlText) return map;
  for (const line of jsonlText.split(/\r?\n/)) {
    const s = line.trim();
    if (!s) continue;
    let o;
    try { o = JSON.parse(s); } catch { continue; }
    if (!o || typeof o !== "object") continue;
    if (o.ok !== true) continue;
    const path = typeof o.path === "string" ? o.path.trim() : "";
    const text = typeof o.text === "string" ? o.text : "";
    if (!path || !text) continue;
    map.set(path, text);
  }
  return map;
}

/**
 * Pure: merge OCR/text-layer text onto a classified record, producing a record
 * in the shape extract-docustrata-outcomes.mjs reads (it looks for
 * rec.extracted?.text ?? rec.text ?? rec.extracted_text). We set BOTH rec.text
 * and rec.extracted.text so the extractor finds it regardless of which it checks.
 * Returns null when no text is available for the record (caller skips it).
 * @param {object} rec
 * @param {Map<string,string>} textByPath
 * @returns {object|null}
 */
export function mergeTextIntoRecord(rec, textByPath) {
  if (!rec || typeof rec !== "object") return null;
  const path = typeof rec.disk_path === "string" ? rec.disk_path.trim() : "";
  if (!path) return null;
  const text = textByPath instanceof Map ? textByPath.get(path) : null;
  if (typeof text !== "string" || text.length === 0) return null;
  const extracted = (rec.extracted && typeof rec.extracted === "object") ? { ...rec.extracted } : {};
  extracted.text = text;
  return { ...rec, text, extracted };
}

/**
 * Pure: build the coverage funnel -- the operator-facing "how much of the corpus
 * did we actually run through" answer. Every stage is an absolute count plus a
 * percentage of the stage above it, so a starved pipeline is impossible to hide.
 *
 * @param {{
 *   totalClassified: number, roleMatched: number, byRole?: Record<string,number>,
 *   routeTextLayer: number, routeOcr: number,
 *   textObtained: number, extractorQualified?: number, pairs?: number
 * }} c
 */
export function coverageFunnel(c) {
  const safe = (x) => (Number.isFinite(Number(x)) && Number(x) >= 0 ? Math.floor(Number(x)) : 0);
  const pct = (num, den) => (den > 0 ? Math.round((num / den) * 1000) / 10 : 0);
  const totalClassified = safe(c && c.totalClassified);
  const roleMatched = safe(c && c.roleMatched);
  const routeTextLayer = safe(c && c.routeTextLayer);
  const routeOcr = safe(c && c.routeOcr);
  const textObtained = safe(c && c.textObtained);
  const extractorQualified = safe(c && c.extractorQualified);
  const pairs = safe(c && c.pairs);
  return Object.freeze({
    schemaVersion: "1.0.0",
    total_classified: totalClassified,
    role_matched: roleMatched,
    role_matched_pct_of_total: pct(roleMatched, totalClassified),
    by_role: Object.freeze({ ...(c && c.byRole && typeof c.byRole === "object" ? c.byRole : {}) }),
    route_text_layer: routeTextLayer,
    route_ocr: routeOcr,
    text_obtained: textObtained,
    text_obtained_pct_of_matched: pct(textObtained, roleMatched),
    extractor_qualified: extractorQualified,
    pairs,
    pairs_pct_of_matched: pct(pairs, roleMatched),
  });
}
