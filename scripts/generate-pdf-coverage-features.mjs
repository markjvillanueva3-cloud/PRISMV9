#!/usr/bin/env node
/**
 * generate-pdf-coverage-features.mjs — system-viz augmentation: PDF extraction-coverage status roost.
 *
 * Closes the iter42 Stop-hook gap structurally: "889 longer-tail AUTOGEN-SPEC entries
 * unextracted". Manual per-PDF curation is 7 tips/iter; batch automation that surfaces
 * EVERY consolidated PDF in the graph with a status flag (`extracted` vs
 * `pending-extraction`) makes coverage VISIBLE without requiring each PDF to be
 * curated. PSN synergy = the graph KNOWS the gap.
 *
 * Inputs:
 *   - state/shared/cadcam-consolidated-corpus.json (iter23 — the universe)
 *   - state/shared/extracted-pdfs/*.jsonl (iter27+ — the extracted set)
 *
 * Output: state/shared/system-viz/pdf-coverage-augmentation.json
 *   - Parent roost ghost.pdf_extraction_coverage (L8)
 *   - 2 status pivots: ghost.pdf_extraction_coverage.extracted (L9, green) +
 *                      ghost.pdf_extraction_coverage.pending (L9, amber)
 *   - 1 pdf-coverage leaf per PDF entry in the consolidated corpus (L10)
 *
 * Status determination: a PDF is "extracted" iff some tip in extracted-pdfs/*.jsonl
 * cites its pdf_path. Otherwise "pending".
 *
 * Pure-fn API + tested. Idempotent + byte-stable.
 *
 * @milestone MIT-COURSE-INTEGRATION/U-PDF-COVERAGE-SURFACE
 * @slot india
 * @iter 43
 * @date 2026-05-25
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");
export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.pdf_extraction_coverage";
export const EXTRACTED_PIVOT_ID = `${ROOST_ID}.extracted`;
export const PENDING_PIVOT_ID = `${ROOST_ID}.pending`;
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const PIVOT_LAYER = "L9";
export const LEAF_LAYER = "L10";
export const MAX_LABEL = 80;
export const MAX_INFO = 160;

const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const CORPUS_PATH = path.join(ROOT, "state/shared/cadcam-consolidated-corpus.json");
const TIPS_DIR = path.join(ROOT, "state/shared/extracted-pdfs");
const OUT_PATH = path.join(VIZ_DIR, "pdf-coverage-augmentation.json");

/** Pure: normalize a path (Windows backslash → forward, lowercase drive letter). */
export function normalizePath(p) {
  if (!p || typeof p !== "string") return "";
  return p.replace(/\\/g, "/").replace(/^([a-z]):/i, (_, d) => d.toUpperCase() + ":");
}

/** Pure: parse one jsonl line → tip object (or null on bad input). */
export function parseTipLine(line) {
  if (!line || !line.trim()) return null;
  try {
    const t = JSON.parse(line.trim());
    if (t && typeof t.id === "string" && t.source && typeof t.source.pdf_path === "string") return t;
  } catch { /* skip */ }
  return null;
}

/** Pure: collect the set of NORMALIZED pdf_paths referenced by any extracted tip. */
export function collectExtractedPdfPaths(tipsDirText) {
  const out = new Set();
  for (const text of tipsDirText) {
    for (const line of String(text || "").split(/\r?\n/)) {
      const tip = parseTipLine(line);
      if (tip) out.add(normalizePath(tip.source.pdf_path));
    }
  }
  return out;
}

/** Read every *.jsonl under TIPS_DIR and return their raw text bodies. */
export function loadAllTipsText(dir = TIPS_DIR) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const f of fs.readdirSync(dir).sort()) {
    if (!f.endsWith(".jsonl")) continue;
    try { out.push(fs.readFileSync(path.join(dir, f), "utf8")); }
    catch { /* skip */ }
  }
  return out;
}

/** Pure: shape a PDF coverage leaf node. */
export function pdfLeaf(entry, isExtracted) {
  const status = isExtracted ? "extracted" : "pending-extraction";
  const parent = isExtracted ? EXTRACTED_PIVOT_ID : PENDING_PIVOT_ID;
  const audience = entry.classification?.cad
    ? (entry.classification?.cam ? "delta+kilo" : "delta")
    : (entry.classification?.cam ? "kilo" : "general");
  return {
    id: `pdf-coverage.${entry.slug}`,
    label: `[${isExtracted ? "✓" : "○"}] ${entry.slug}`.slice(0, MAX_LABEL),
    layer: LEAF_LAYER,
    ghost: true,
    status: isExtracted ? "ghost" : "ghost-pending",
    kind: "pdf-coverage",
    parent,
    info: `[${entry.kind} · →${audience} · ${status}] ${String(entry.id || "").slice(0, MAX_INFO)}`,
  };
}

/** Pure: build {newNodes, newEdges, stats} from corpus + extracted set + existingNodeIds. */
export function generate(corpus, extractedPdfPaths, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const extracted = extractedPdfPaths instanceof Set ? extractedPdfPaths : new Set(extractedPdfPaths || []);
  const allEntries = [
    ...(Array.isArray(corpus?.cad) ? corpus.cad : []),
    ...(Array.isArray(corpus?.cam) ? corpus.cam : []),
    ...(Array.isArray(corpus?.both) ? corpus.both : []),
  ];
  // Dedupe by slug (cad+cam dual entries can appear twice)
  const seenSlugs = new Set();
  const entries = allEntries.filter(e => {
    if (!e || typeof e.slug !== "string") return false;
    if (seenSlugs.has(e.slug)) return false;
    seenSlugs.add(e.slug);
    return true;
  });

  // Skip non-PDF entries (corpus may contain course folders too)
  const pdfEntries = entries.filter(e => e.source_type === "pdf" || (typeof e.source === "string" && e.source.toLowerCase().endsWith(".pdf")));

  const newNodes = [];
  let roostEmitted = 0, extractedPivot = 0, pendingPivot = 0;
  let extractedLeaves = 0, pendingLeaves = 0, skipped = 0;

  // Count for label (normalize corpus source path for comparison vs extracted set)
  let extCount = 0, pendCount = 0;
  for (const e of pdfEntries) {
    if (e.source && extracted.has(normalizePath(e.source))) extCount++;
    else pendCount++;
  }

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `PDF Extraction Coverage (${extCount}/${pdfEntries.length})`,
      layer: ROOST_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `${extCount} of ${pdfEntries.length} corpus PDFs have at least one curated tribal tip (iter27-42 manual extraction). ${pendCount} pending. Each pending leaf is a candidate for batch extraction.`,
    });
    ids.add(ROOST_ID);
    roostEmitted = 1;
  }

  if (!ids.has(EXTRACTED_PIVOT_ID)) {
    newNodes.push({
      id: EXTRACTED_PIVOT_ID,
      label: `✓ Extracted (${extCount})`,
      layer: PIVOT_LAYER,
      ghost: true,
      status: "ghost",
      kind: "ghost-roost",
      parent: ROOST_ID,
      info: `${extCount} PDFs with curated tips. Source: state/shared/extracted-pdfs/*.jsonl.`,
    });
    ids.add(EXTRACTED_PIVOT_ID);
    extractedPivot = 1;
  }

  if (!ids.has(PENDING_PIVOT_ID)) {
    newNodes.push({
      id: PENDING_PIVOT_ID,
      label: `○ Pending extraction (${pendCount})`,
      layer: PIVOT_LAYER,
      ghost: true,
      status: "ghost-pending",
      kind: "ghost-roost",
      parent: ROOST_ID,
      info: `${pendCount} PDFs in the iter23 consolidated corpus that have NO curated tips yet. Candidates for batch automation or future manual extraction iters.`,
    });
    ids.add(PENDING_PIVOT_ID);
    pendingPivot = 1;
  }

  for (const e of pdfEntries) {
    const id = `pdf-coverage.${e.slug}`;
    if (ids.has(id)) { skipped++; continue; }
    const isExtracted = e.source && extracted.has(normalizePath(e.source));
    newNodes.push(pdfLeaf(e, !!isExtracted));
    ids.add(id);
    if (isExtracted) extractedLeaves++;
    else pendingLeaves++;
  }

  return {
    newNodes,
    newEdges: [],
    stats: {
      roostEmitted, extractedPivot, pendingPivot,
      totalPdfs: pdfEntries.length,
      extractedLeaves, pendingLeaves, skipped,
      extractedPaths: extracted.size,
    },
  };
}

export function main() {
  if (!fs.existsSync(CORPUS_PATH)) {
    console.error(`FATAL: ${CORPUS_PATH} missing — run consolidate-cadcam-corpus.mjs first`);
    return 1;
  }
  let corpus;
  try { corpus = JSON.parse(fs.readFileSync(CORPUS_PATH, "utf8")); }
  catch (e) { console.error(`FATAL: corpus parse failed — ${e.message}`); return 2; }

  const tipsText = loadAllTipsText(TIPS_DIR);
  const extracted = collectExtractedPdfPaths(tipsText);

  let result;
  try {
    const { newNodes, newEdges, stats } = generate(corpus, extracted, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: "state/shared/cadcam-consolidated-corpus.json + state/shared/extracted-pdfs/*.jsonl",
      newNodes,
      newEdges,
      stats,
    };
  } catch (e) { console.error(`FATAL: generate failed — ${e.message}`); return 2; }

  try { fs.mkdirSync(VIZ_DIR, { recursive: true }); fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  total PDFs in corpus:      ${result.stats.totalPdfs}`);
  console.log(`  extracted (curated):       ${result.stats.extractedLeaves}`);
  console.log(`  pending extraction:        ${result.stats.pendingLeaves}`);
  console.log(`  extracted-pdf-paths set:   ${result.stats.extractedPaths}`);
  console.log(`  total new nodes:           ${result.newNodes.length}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
