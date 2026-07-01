#!/usr/bin/env node
/**
 * pdf-parse-extract.mjs — pdftotext-free PDF extractor (uses mcp-server/node_modules/pdf-parse).
 *
 * Fallback for when the `pdftotext` binary is missing on the host (Windows often
 * lacks it). Walks a small, operator-curated set of top-priority milling
 * order-of-operations PDFs from H:/PRISM/resources/RESOURCE PDFS/, extracts
 * first N pages via pdf-parse, emits:
 *   - knowledge/wiki/lessons/pdf-extract-<slug>.md  (one per PDF, batch-stub quality)
 *   - state/shared/extracted-pdfs/whiskey-milling-oop-<yyyy-mm-dd>.jsonl  (appended)
 *
 * Output rows carry confidence: 0.3 + needs_curation: true so downstream curators
 * surface them as candidates — operator promotes selected sections to full
 * wiki/code-tribal entries with confidence ≥0.7.
 *
 * Pure helpers in scripts/lib/pdf-parse-extract-helpers.mjs.
 *
 * Usage:
 *   node scripts/pdf-parse-extract.mjs --dry-run            # plan only
 *   node scripts/pdf-parse-extract.mjs                      # extract top 1 PDF
 *   node scripts/pdf-parse-extract.mjs --max 5              # top 5
 *   node scripts/pdf-parse-extract.mjs --file path.pdf      # single file (repeatable)
 *   node scripts/pdf-parse-extract.mjs --pages 30           # pages per PDF
 *
 * @milestone WHISKEY-PDF-WIKI-TRIBAL-MS0/U-WPWT-EXTRACT-FALLBACK
 * @slot whiskey
 * @date 2026-05-25
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import {
  parseArgs,
  pdfPathToSlug,
  chooseTargets,
  harvestStructure,
  formatTribalJsonl,
  formatWikiMarkdown,
  buildOutputDescriptor,
  classifyPdfExtraction,
  extractionSignals,
  deriveDomainTopic,
  TOP_MILLING_OOP_PDFS,
} from "./lib/pdf-parse-extract-helpers.mjs";

const PDF_PARSE_REQUIRE_BASE = "H:/prism/mcp-server/package.json";

/** Load pdf-parse v2 PDFParse class (the modern class-based API, not the legacy function). */
async function loadPdfParse() {
  const req = createRequire(PDF_PARSE_REQUIRE_BASE);
  const mod = req("pdf-parse");
  const PDFParse = mod?.PDFParse ?? mod?.default?.PDFParse;
  if (typeof PDFParse !== "function") {
    throw new Error("pdf-parse module did not export PDFParse class — got keys=" + Object.keys(mod || {}).join(","));
  }
  return PDFParse;
}

function ensureDir(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
}

function appendLine(file, line) {
  ensureDir(file);
  fs.appendFileSync(file, line + "\n");
}

async function extractOne(pdfPath, PDFParse, opts) {
  const slug = pdfPathToSlug(pdfPath);
  const title = path.basename(pdfPath).replace(/\.pdf$/i, "");
  const extractedAt = new Date().toISOString();
  if (!fs.existsSync(pdfPath)) {
    return { ok: false, slug, path: pdfPath, error: "file-not-found" };
  }
  const buf = fs.readFileSync(pdfPath);
  let parser;
  let result;
  try {
    parser = new PDFParse({ data: new Uint8Array(buf) });
    result = await parser.getText({ first: opts.pages });
  } catch (e) {
    if (parser) { try { await parser.destroy(); } catch { /* swallow */ } }
    return { ok: false, slug, path: pdfPath, error: "pdf-parse-failed: " + (e?.message || String(e)) };
  }
  try { await parser.destroy(); } catch { /* swallow */ }
  const pagesTotal = result?.total ?? 0;
  const text = result?.text || "";
  const { headings, firstParagraph, lineCount, charCount } = harvestStructure(text);
  // Resolve the real domain/topic (U-XRAY-GDT-DOMAIN-TAG): a GD&T source under the
  // blueprint-gdt-corpus drop-zone is tagged gdt, not the legacy milling default,
  // so the curated tribal/wiki rows reach the right consumers (xray/delta).
  const { domain, topic } = deriveDomainTopic(pdfPath, opts.domain, opts.topic);
  return {
    ok: true,
    slug,
    path: pdfPath,
    title,
    extractedAt,
    pagesExtracted: Math.min(opts.pages, pagesTotal || opts.pages),
    pagesTotal,
    headings,
    firstParagraph,
    lineCount,
    charCount,
    domain,
    topic,
  };
}

function writeOutputs(record, opts) {
  const desc = buildOutputDescriptor(record, opts.outRoot);
  const md = formatWikiMarkdown(record);
  const jsonl = formatTribalJsonl(record);
  ensureDir(desc.wikiPath);
  fs.writeFileSync(desc.wikiPath, md, "utf8");
  appendLine(desc.jsonlPath, jsonl);
  return desc;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const targets = chooseTargets(opts);
  const summary = {
    schema_version: "1.0.0",
    extractor: "pdf-parse-extract.mjs",
    slot: opts.slot,
    started_at: new Date().toISOString(),
    options: opts,
    target_count: targets.length,
    dry_run: opts.dryRun,
    targets_total_available: TOP_MILLING_OOP_PDFS.length,
    results: [],
  };
  if (opts.dryRun) {
    summary.results = targets.map((p) => ({ path: p, slug: pdfPathToSlug(p), would_extract: true }));
    // Schema parity with the live path (no consumer parses dry-run, but keep keys consistent).
    summary.emitted_count = 0;
    summary.routed_to_ocr_count = 0;
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  const pdfParse = await loadPdfParse();
  for (const pdfPath of targets) {
    const rec = await extractOne(pdfPath, pdfParse, opts);
    // Scan-vs-text routing (BLUEPRINT-GDT-TRIBAL-INJECTION-PLAN section 2): an
    // image-based drawing PDF parses with 0 headings + 0 real paragraphs. Emitting
    // it produces a hollow tribal/wiki note that pollutes the corpus, so route it
    // to the OCR lane (skip emit) instead. Text-bearing PDFs are unaffected.
    let outputs = null;
    let classification = null;
    if (rec.ok) {
      classification = classifyPdfExtraction(extractionSignals(rec));
      if (classification.lane === "text") outputs = writeOutputs(rec, opts);
    }
    summary.results.push({
      ok: rec.ok,
      path: pdfPath,
      slug: rec.slug,
      pages_extracted: rec.pagesExtracted,
      pages_total: rec.pagesTotal,
      heading_count: rec.headings?.length || 0,
      first_paragraph_chars: (rec.firstParagraph || "").length,
      char_count: rec.charCount || 0,
      line_count: rec.lineCount || 0,
      domain: rec.domain || null,
      lane: classification ? classification.lane : null,
      routed_to_ocr: classification ? classification.isScan : false,
      skip_reason: classification && classification.lane === "ocr" ? classification.reason : undefined,
      error: rec.error,
      outputs,
    });
  }
  // R12 fail-loud: report how many PDFs were emitted vs routed to the OCR lane.
  summary.emitted_count = summary.results.filter((r) => r.outputs).length;
  summary.routed_to_ocr_count = summary.results.filter((r) => r.routed_to_ocr).length;
  summary.completed_at = new Date().toISOString();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
