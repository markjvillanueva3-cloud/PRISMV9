/**
 * jm-die-content-classifier.mjs — content-based fallback classifier for
 * the JM Die TRIBAL+WIKI corpus.
 *
 * Iter11 finding: 57/94 advanced+complex candidates carry
 * `controller: null` because the iter8 filename classifier misses
 * vendor/controller markers that live INSIDE the extract text, not in
 * the filename (e.g., "English - Mill Operator's Manual" → Haas
 * controller is only discoverable from page 1 chrome).
 *
 * This module runs the filename classifier first; when controller is
 * null OR vendor is null OR domain is reference, it scans the leading
 * pages of the extract for vendor + controller keywords and merges any
 * unambiguous winner into the classification.
 *
 * Pure functions only. Single-keyword conflict resolution: first match
 * wins per keyword class (vendor, controller); we do NOT vote across
 * pages because vendor manuals often quote competitor codes.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-CONTENT-CLASSIFIER
 * @slot echo · @iter 12 · @date 2026-05-26
 */
import { classifyTribalWikiPdf } from "./jm-die-tribal-wiki-classifier.mjs";

const CONTROLLER_MARKERS = [
  { key: "haas", patterns: [/\bHaas\s+Mill\b/i, /\bHaas\s+Lathe\b/i, /\bHaas\s+(NGC|Next\s+Gen)\b/i, /Haas\s+Automation/i, /haascnc\.com/i] },
  { key: "okuma", patterns: [/\bOkuma\b/i, /\bOSP[- ]?P?\d{2,3}[A-Z]?\b/i, /Okuma\s+America/i, /Macturn/i, /Multus/i] },
  { key: "mazak", patterns: [/\bMazak\b/i, /\bMazatrol\b/i, /\bMatrix\s+(2|II)?\b/i, /Yamazaki\s+Mazak/i] },
  { key: "hurco", patterns: [/\bHurco\b/i, /\bWinMax\b/i, /\bUltiMotion\b/i] },
  { key: "siemens", patterns: [/\bSinumerik\b/i, /Siemens\s+Industry/i, /840D/i, /828D/i] },
  { key: "heidenhain", patterns: [/\bHeidenhain\b/i, /\bTNC\s?\d{3}/i, /iTNC\s?530/i] },
  { key: "fanuc", patterns: [/\bFanuc\b/i, /\bFANUC\b/, /\bGE\s+Fanuc\b/i, /0i-M/i, /16i-/i, /30i-/i] },
  { key: "mitsubishi", patterns: [/\bMitsubishi\s+(Electric|CNC|Heavy)\b/i, /\bMELDAS\b/i, /\bM7\d{2}\b/] },
  { key: "fagor", patterns: [/\bFagor\b/i, /\b8055\b/, /\b8060\b/] },
  { key: "dmg_mori", patterns: [/\bDMG\s+MORI\b/i, /\bDMG\b\s+Mori/i, /Celos/i] },
  { key: "brother", patterns: [/\bBrother\s+CNC\b/i, /Speedio/i, /\bTC-S2D\b/i] },
];

const VENDOR_MARKERS = [
  { key: "Haas", patterns: [/Haas\s+Automation/i, /haascnc\.com/i, /\bHaas\s+(Mill|Lathe|NGC)\b/i] },
  { key: "Autodesk", patterns: [/\bAutodesk\b/i, /Inventor\s+CAM/i, /Fusion\s*360/i, /\bHSMWorks\b/i] },
  { key: "Mastercam", patterns: [/\bMastercam\b/i, /\bCNC\s+Software,\s+Inc\b/i] },
  { key: "OpenMind", patterns: [/\bhyperMILL\b/i, /\bOpenMind\b/i] },
  { key: "SolidCAM", patterns: [/\bSolidCAM\b/i, /InventorCAM/i, /iMachining/i] },
  { key: "Siemens", patterns: [/Siemens\s+Industry/i, /Sinumerik/i, /NX\s+CAM/i] },
  { key: "Heidenhain", patterns: [/\bHeidenhain\b/i, /\bTNC\s?\d{3}/i] },
  { key: "OkumaCorp", patterns: [/\bOkuma\s+Corporation\b/i, /Okuma\s+America/i] },
  { key: "MazakCorp", patterns: [/Yamazaki\s+Mazak/i, /Mazak\s+Corporation/i] },
];

/** Pure: get the first N pages of an extract joined as a single string. */
export function leadingPages(extractText, n) {
  if (extractText == null) return "";
  const pages = String(extractText).split("\f");
  const limit = Number.isInteger(n) && n > 0 ? Math.min(n, pages.length) : Math.min(5, pages.length);
  return pages.slice(0, limit).join("\n");
}

/** Pure: scan text for the first matching controller key. Returns null on no match. */
export function detectController(text) {
  if (text == null) return null;
  const s = String(text);
  for (const m of CONTROLLER_MARKERS) {
    for (const p of m.patterns) {
      if (p.test(s)) return m.key;
    }
  }
  return null;
}

/** Pure: scan text for the first matching vendor key. Returns null on no match. */
export function detectVendor(text) {
  if (text == null) return null;
  const s = String(text);
  for (const m of VENDOR_MARKERS) {
    for (const p of m.patterns) {
      if (p.test(s)) return m.key;
    }
  }
  return null;
}

/** Pure: filename classifier + content fallback. Returns merged classification. */
export function classifyWithContent(filename, extractText, opts = {}) {
  const base = classifyTribalWikiPdf(filename);
  const leadingN = opts.leadingPages || 5;
  const head = leadingPages(extractText, leadingN);
  const out = { ...base, controllerSource: base.controller ? "filename" : null, vendorSource: base.vendor ? "filename" : null };
  if (!base.controller) {
    const c = detectController(head);
    if (c) { out.controller = c; out.controllerSource = "content"; }
  }
  if (!base.vendor) {
    const v = detectVendor(head);
    if (v) { out.vendor = v; out.vendorSource = "content"; }
  }
  return out;
}
