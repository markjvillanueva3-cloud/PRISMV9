#!/usr/bin/env node
/**
 * lathe-tribal-corpus-discover.mjs -- slot:whiskey [U-W6-VISION]
 * ==========================================================================
 * Pure corpus-discovery for the lathe tribal ingest. Globs the verified
 * lathe/turning reference roots and filters PDFs by a lathe-keyword whitelist
 * so the ingest queue auto-tracks ALL lathe PDFs (not a hard-coded 12) --
 * rot-proof + "all means all" (operator directive 2026-06-12).
 *
 * Pure: `discoverLathePdfs` takes an INJECTED `listFn` (no FS here) so it is
 * unit-testable; the CLI supplies the real recursive reader. Inclusion-based
 * filter: a pure-mill / general-manufacturing doc matches NO lathe keyword and
 * is therefore excluded (we never dilute lathe tribal with mill/CAD noise).
 */

// Roots RELATIVE TO REPO (H:/prism). Verified present 2026-06-26 (corpus scan).
export const LATHE_PDF_ROOTS = Object.freeze([
  "resources/RESOURCE PDFS",
  "resources/cimco-2025/CIMCOEdit/Templates/Attachments",
  "resources/cimco-2026/CIMCOEdit/Templates/Attachments",
  "resources/MANUFACTURER_CATALOGS",
  "JM DIE/CONTROLLERS/HAAS/manuals",
  "JM DIE/TRIBAL + WIKI",
]);

// A PDF qualifies for the lathe tribal corpus iff its BASENAME matches one of
// these (lowercase substring). Turning-specific terms only -- a mill catalog
// ("milling-cat.pdf") matches nothing and is dropped.
export const LATHE_KEYWORDS = Object.freeze([
  "turning", "lathe", "millturn", "mill-turn", "mill turn", "swiss",
  "groov", "parting", "part-off", "part off", "thread",
  "g76", "g71", "g72", "g70",
  "cycle92", "cycle93", "cycle94", "cycle95", "cycle96", "cycle97",
  "osp-p200", "osp-p300", "p200l", "p300l", "macturn", "multus",
  "boring",
]);

// Turning-tooling VENDOR brands whose GENERAL catalogs carry substantial turning /
// insert / grade / feed-speed / boring / grooving / threading data even when the
// FILENAME has no turning keyword (e.g. "korloy solid.pdf", "Accupro 2013.pdf",
// "cobra-carbide.pdf", "BIG DAISHOWA ... Vol 5.pdf"). The operator directive
// (2026-06-28) -- "max out lathe tribal ... including vendor catalogs which always
// have tips and tricks on inserts for materials and tool paths" -- is exactly these.
// SCOPE: ONLY turning-insert / boring-bar / grooving / threading / Swiss-turn makers.
// Pure end-mill / drill / tap vendors (Guhring, OSG, MA Ford, Data Flute, Dixi,
// Balax, Besly, Drill Masters, Rapidkut) are intentionally ABSENT -- a brand match
// must not dilute lathe tribal with mill/drill noise; the MILL_EXCLUDE veto below
// still removes a turning-vendor's explicitly-milling catalog. The downstream tip
// extractor is topic-aware and keeps only turning-relevant tips, so a mixed general
// catalog from a turning vendor contributes turning tips and ignores the rest.
export const VENDOR_TURNING_BRANDS = Object.freeze([
  "korloy", "sandvik", "coromant", "sumitomo", "mitsubishi", "kennametal",
  "iscar", "tungaloy", "seco", "walter", "kyocera", "ceratizit",
  "horn", "ingersoll", "carmex", "vargus", "vardex", "applitec", "schwanog",
  "dorian", "criterion", "big daishowa", "daishowa", "big kaiser", "big-kaiser",
  "kaiser", "cobra carbide", "cobra-carbide", "accupro", "tornos",
]);

// Mill-specific tokens: a doc matching these is EXCLUDED even if it ALSO matches a
// lathe keyword (e.g. "Thread Milling" is a MILL op -- "thread" would include it, so
// "milling" must veto it). Bare "mill" is intentionally NOT here -- it would wrongly
// drop "mill-turn"/"millturn", which ARE lathe (turn/mill combo machines).
export const MILL_EXCLUDE = Object.freeze(["milling", "end mill", "endmill", "face mill"]);

// Keywords matched as a WHOLE WORD (delimited), not substring, to kill false-positives
// like "boring" inside "neighboring". ("thread" stays a substring so it still matches
// "threading"; the MILL_EXCLUDE veto above removes the mill-threading noise.)
const WORD_BOUNDARY_KEYWORDS = Object.freeze(["boring"]);

function matchKeyword(f, k) {
  if (WORD_BOUNDARY_KEYWORDS.includes(k)) return new RegExp(`(^|[^a-z0-9])${k}([^a-z0-9]|$)`).test(f);
  return f.includes(k);
}

// Brand match is ALWAYS word-boundary: a short/dictionary-word brand token ("seco","horn",
// "kaiser","walter","dorian") must never substring-match an unrelated basename ("second-op",
// "horner-plc", "kaiserslautern") and pull a non-turning PDF into the corpus. Delimited brand
// tokens (incl multi-word "big daishowa" / hyphenated "cobra-carbide") still match -- the
// boundary is any non-[a-z0-9] char, and the brand is regex-escaped for robustness.
function matchBrand(f, b) {
  const esc = b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${esc}([^a-z0-9]|$)`).test(f);
}

/**
 * True iff `filename` is a PDF that belongs in the lathe tribal corpus:
 *   (basename matches a turning KEYWORD) OR (basename names a turning-tooling VENDOR),
 * and is NOT a mill-specific doc. The vendor arm pulls in general turning-insert
 * catalogs whose filename lacks a turning keyword (korloy solid / Accupro / cobra).
 */
export function isLathePdf(filename) {
  if (typeof filename !== "string") return false;
  const f = filename.toLowerCase();
  if (!f.endsWith(".pdf")) return false;
  if (MILL_EXCLUDE.some((m) => f.includes(m))) return false;   // mill-specific doc -> never lathe tribal
  if (LATHE_KEYWORDS.some((k) => matchKeyword(f, k))) return true;
  return VENDOR_TURNING_BRANDS.some((b) => matchBrand(f, b));   // turning-tooling vendor general catalog (word-boundary)
}

/**
 * discoverLathePdfs(roots, listFn) -> string[] of paths (whatever shape listFn
 * returns -- the CLI uses repo-relative). `listFn(root)` returns an array of
 * file paths under `root`; a throwing/empty root is skipped (other roots still
 * contribute). Filters by BASENAME via isLathePdf, dedupes, sorts.
 */
export function discoverLathePdfs(roots, listFn) {
  const out = new Set();
  for (const root of roots || []) {
    let files;
    try { files = listFn(root) || []; } catch { files = []; }
    for (const fp of files) {
      const base = String(fp).split(/[\\/]/).pop();
      if (isLathePdf(base)) out.add(String(fp));
    }
  }
  return [...out].sort();
}
