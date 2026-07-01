#!/usr/bin/env node
/**
 * cad-print-classifier.mjs -- DELTA-CAD-COMPLETION / U-DELTA-PDF-CLASS (v1 path-tier).
 *
 * Splits the H:/prism PDF corpus (344,600 files) into drawing-CANDIDATES vs business/reference, so the
 * expensive content classifier (Ollama-VLM title-block/dimension detection, v2) only runs on the small
 * candidate pool instead of all 344K. Grounded in the REAL corpus distribution (sampled 2026-06-27):
 *
 *   ~75% live under Docustrata/ (doc-management: Sales Orders, POs, Packing Slips, Scans, Quotes, Taxes,
 *   UPS) -> BUSINESS by folder design. Reference docs live under resources/{MANUFACTURER_CATALOGS,
 *   MIT COURSES,OPEN MIND}. Drawing CANDIDATES live under JM DIE/ (esp. "Prism JM Die", ~85K) + small
 *   resources/RESOURCE PDFS -- but even there filenames are scanned+paginated ("PART__YYYY_MM_DD__pN.pdf"),
 *   so a candidate is NOT yet a confirmed drawing; content classification (v2) confirms.
 *
 * v1 is deliberately COARSE + HONEST: it emits a TIER (business | reference | drawing-candidate | unknown)
 * with a confidence + the signal that decided it. It does NOT claim "drawing" -- only "drawing-candidate".
 * The master-plan F1>=0.95 drawing/business gate needs the v2 content tier on top of this path pre-filter.
 *
 * Pure + importable (sibling of cad-holdout-guard.mjs). No I/O beyond the explicit corpus reader.
 */

export const TIER = Object.freeze({
  BUSINESS: "business",
  REFERENCE: "reference",
  DRAWING_CANDIDATE: "drawing-candidate",
  UNKNOWN: "unknown",
});

/** Normalize a path to a repo-relative, forward-slash, lowercase form for matching. */
export function normalizeRel(p) {
  if (typeof p !== "string") return "";
  let s = p.trim().replace(/\\/g, "/").toLowerCase();
  const i = s.indexOf("/prism/");
  if (i >= 0) s = s.slice(i + "/prism/".length); // strip leading .../prism/
  else if (s.startsWith("h:/prism/")) s = s.slice("h:/prism/".length);
  return s.replace(/^\/+/, "");
}

/** basename of a normalized path. */
export function baseName(rel) {
  const r = String(rel || "");
  const i = r.lastIndexOf("/");
  return i >= 0 ? r.slice(i + 1) : r;
}

// Strong, UNAMBIGUOUS business-document filename signals. Substring-based (NOT \b-anchored): the corpus
// filenames use "__"/"_" separators heavily (e.g. "id__11242025_Purchase_Order_001__p11.pdf"), and "_" is a
// regex word char so \binvoice\b FAILS on "__Invoice". Deliberately conservative -- only unambiguous
// business doc types -- because in the drawing zone a false business-override DROPS a real drawing (the bad
// direction); ambiguous short tokens (po/ups/tax/cert/quote) are excluded to avoid that.
const BUSINESS_FN = /(purchase[_\s-]?order|packing[_\s-]?(slip|list)|sales[_\s-]?order|invoice|remittance|debit[_\s-]?memo|credit[_\s-]?memo)/i;

/**
 * Classify a single PDF path into a coarse tier (v1 path/filename heuristic).
 * @param {string} p abs or repo-relative path to a .pdf
 * @returns {{tier:string, confidence:number, signal:string, rel:string}}
 */
export function classifyPdfPath(p) {
  const rel = normalizeRel(p);
  const fn = baseName(rel);

  // 1) Docustrata = JM document-management corpus -> business (the 75% bulk). Coarse but by-design.
  if (rel.startsWith("docustrata/")) {
    // a few Docustrata subfolders are unambiguous business buckets -> higher confidence
    if (/^docustrata\/(jmd sales orders|jmd orders closed|jmd packing slips|jmd quotes|jmd ups|jmd taxesirs|jmd laser sheets)\//.test(rel)) {
      return { tier: TIER.BUSINESS, confidence: 0.97, signal: "docustrata-business-bucket", rel };
    }
    return { tier: TIER.BUSINESS, confidence: 0.9, signal: "docustrata-doc-management", rel };
  }

  // 2) resources/ reference material (vendor catalogs, courseware, CAM e-learning) -> reference, not a JM drawing.
  if (/^resources\/(manufacturer_catalogs|mit courses|open mind)\//.test(rel)) {
    return { tier: TIER.REFERENCE, confidence: 0.95, signal: "resources-reference-material", rel };
  }

  // 3) Drawing CANDIDATE zones: JM DIE/ part folders + resources training/print sets. Within these,
  //    a strong business filename keyword (PO/invoice/packing/order) overrides to business.
  const inDrawingZone =
    rel.startsWith("jm die/") ||
    /^resources\/(resource pdfs|1\/|2\/|3-basic training day)/.test(rel);
  if (inDrawingZone) {
    if (BUSINESS_FN.test(fn)) {
      return { tier: TIER.BUSINESS, confidence: 0.75, signal: "drawing-zone-but-business-filename", rel };
    }
    return { tier: TIER.DRAWING_CANDIDATE, confidence: 0.6, signal: "jm-drawing-zone-needs-content-confirm", rel };
  }

  // 4) Anywhere else: lean on the filename only.
  if (BUSINESS_FN.test(fn)) return { tier: TIER.BUSINESS, confidence: 0.6, signal: "business-filename", rel };
  return { tier: TIER.UNKNOWN, confidence: 0.3, signal: "no-path-or-filename-signal", rel };
}

/**
 * Bucket a list of PDF paths into tier counts + per-tier confidence sums (for a mean).
 * @param {string[]} paths
 * @returns {{total:number, byTier:Record<string,number>, meanConfidence:number, drawingCandidates:number}}
 */
export function summarizeCorpus(paths) {
  const byTier = { [TIER.BUSINESS]: 0, [TIER.REFERENCE]: 0, [TIER.DRAWING_CANDIDATE]: 0, [TIER.UNKNOWN]: 0 };
  let confSum = 0;
  let total = 0;
  if (Array.isArray(paths)) {
    for (const p of paths) {
      if (typeof p !== "string" || !p.trim()) continue;
      const c = classifyPdfPath(p);
      byTier[c.tier] = (byTier[c.tier] || 0) + 1;
      confSum += c.confidence;
      total++;
    }
  }
  return {
    total,
    byTier,
    meanConfidence: total > 0 ? confSum / total : 0,
    drawingCandidates: byTier[TIER.DRAWING_CANDIDATE] || 0,
  };
}
