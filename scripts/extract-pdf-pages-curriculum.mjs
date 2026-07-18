#!/usr/bin/env node
// extract-pdf-pages-curriculum.mjs
//
// Page-by-page extractor that emits training-ready chunks ordered from
// EASIEST → COMPLEX work — the curriculum-friendly form of training input.
//
// Per kilo /checkin-kilo 2026-05-26 directive:
//   "extract page by page of notable data that will train the system from
//    the easiest input to complex work"
//
// Filters out NOT-notable pages (blank, TOC, copyright/legal, index, page
// numbers only) so trainers consume signal not boilerplate.
//
// Output: one JSONL row per (notable) page tagged with curriculum tier 1-5.
//   tier 1 = beginner (shop math, glossaries, quick-ref cards)
//   tier 2 = intro tutorial (getting-started PDFs)
//   tier 3 = procedural tutorial (step-by-step walkthroughs)
//   tier 4 = strategy / configuration (advanced settings, post processors)
//   tier 5 = deep reference (admin guides, full manuals, API refs)
//
// Pages within tier are ordered by PDF size ascending (smaller = more
// digestible). Within a PDF, pages are emitted in order so the trainer
// sees them sequentially.
//
// schemaVersion 1.0.0

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const SCHEMA_VERSION = '1.0.0';
const INDEX_PATH = 'H:/prism/mcp-server/data/state/cad-cam-resources-pdf-index.json';
const ROOTS = { 'resources': 'H:/prism/resources', 'jm-die': 'H:/PRISM/JM DIE' };
const OUT_BASE = 'H:/prism-slot-kilo/state/shared/cam-curriculum-pages';
const OUT_JSONL = `${OUT_BASE}/pages.jsonl`;
const PROGRESS_PATH = `${OUT_BASE}/_progress.json`;
const PER_PDF_TIMEOUT_MS = 60000;
const MIN_PAGE_CHARS = 120;        // a "page" with <120 chars is likely TOC stub or page number
const MAX_PAGES_PER_PDF = 500;     // safety cap for huge admin guides

const require = createRequire('H:/prism/mcp-server/package.json');
const { PDFParse } = require('pdf-parse');

function parseArgs(argv) {
  const out = { limit: null, tiers: null, force: false, domainFilter: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (argv[i] === '--tiers') out.tiers = argv[++i].split(',').map((x) => parseInt(x, 10));
    else if (argv[i] === '--force') out.force = true;
    else if (argv[i] === '--domain') out.domainFilter = argv[++i].split(',');
  }
  return out;
}

/**
 * Score a PDF entry into curriculum tier 1-5.
 * Lower tier = easier. Pure function — based on filename + size + path heuristics.
 * @param {{relPath: string, sizeBytes: number, domain: string, software: string, top: string}} entry
 * @returns {number} 1..5
 */
export function curriculumTier(entry) {
  const fn = String(entry.relPath || '').toLowerCase();
  const sz = entry.sizeBytes || 0;
  const top = String(entry.top || '').toLowerCase();
  // Tier 1: explicit beginner / quick-ref / glossary / shop-math
  if (/quick.ref|cheat.?sheet|glossary|shop.math|basics|fundamentals|beginner|day.[123]|drill_calc|whatsnew|readme/i.test(fn)) return 1;
  if (/[123][-\s]+basic/.test(top)) return 1;
  // Tier 2: intro tutorials, getting-started
  if (/getting.started|introduction|intro_to|intro.to|gs.\.pdf|_gs\.pdf|starter/i.test(fn)) return 2;
  // Tier 5: heavy reference / admin guides / API references / installation
  if (/admin|administration|installation|install_guide|machine.programming|operator.manual|reference.guide|api[_-]reference|programmer.s.guide/i.test(fn)) return 5;
  if (sz > 5_000_000) return 5; // >5MB is almost always a deep reference
  // Tier 4: strategy / post processor / advanced
  if (/strategy|strategies|post[_-]processor|advanced|customization|wcs|multi.?axis|multi.?surface|5.?axis|hsm|trochoidal|adaptive/i.test(fn)) return 4;
  if (/dynamic_milling|dynamic.milling/i.test(fn)) return 3; // mid-complexity tutorial
  // Tier 3: procedural tutorials (default for tutorial-flavored content)
  if (/tutorial|walkthrough|step.by.step|exercise/i.test(fn)) return 3;
  if (sz > 2_000_000) return 4; // mid-large is usually advanced
  if (sz > 500_000) return 3;   // mid is procedural
  return 2; // small + non-tutorial defaults to intro
}

/**
 * Detect boilerplate / not-notable pages: TOC, copyright, index, blank.
 * Pure function. Returns true if page should be SKIPPED.
 */
export function isBoilerplatePage(text) {
  if (!text || text.trim().length < MIN_PAGE_CHARS) return true;
  const lower = text.toLowerCase();
  const trimmed = text.trim();
  // Page-numbers-only / running header (very short repeated content).
  if (/^[\s\d.\-]+$/.test(trimmed)) return true;
  // Copyright / legal page detection.
  if (/all rights reserved|terms of use|end user license agreement|copyright (©|c) 20/.test(lower) && trimmed.length < 1500) return true;
  // Table of contents page: many "..." dot leaders or many lines ending in digit.
  const lines = trimmed.split(/\n/);
  if (lines.length > 8) {
    const tocLines = lines.filter((l) => /\.{3,}|\s+\d+\s*$/.test(l)).length;
    if (tocLines / lines.length > 0.55 && /contents|chapter|table of contents/i.test(text)) return true;
  }
  // Index page: alphabetic-by-line with page refs (>40% lines end with comma+number).
  if (lines.length > 15) {
    const indexLines = lines.filter((l) => /,\s*\d+(\s*,\s*\d+)*\s*$/.test(l)).length;
    if (indexLines / lines.length > 0.4) return true;
  }
  return false;
}

async function extractPdfPages(absPath, entry) {
  let buf;
  try { buf = fs.readFileSync(absPath); } catch (e) { return { ok: false, error: e.message }; }
  let result;
  try {
    const parser = new PDFParse({ data: buf });
    result = await Promise.race([
      parser.getText(),
      new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout ${PER_PDF_TIMEOUT_MS}ms`)), PER_PDF_TIMEOUT_MS)),
    ]);
  } catch (e) {
    return { ok: false, error: e.message || String(e) };
  }
  if (!result || !Array.isArray(result.pages)) {
    // Fallback: single-page chunk from result.text
    if (result?.text) {
      return { ok: true, pages: [{ pageNumber: 1, text: String(result.text) }] };
    }
    return { ok: false, error: 'no pages array' };
  }
  const pages = result.pages.slice(0, MAX_PAGES_PER_PDF).map((p, i) => ({
    pageNumber: i + 1,
    text: typeof p === 'string' ? p : (p?.text || p?.content || ''),
  }));
  return { ok: true, pages };
}

async function processEntry(entry, jsonlStream, stats, args) {
  if (args.tiers && !args.tiers.includes(entry._tier)) return;
  if (args.domainFilter && !args.domainFilter.includes(entry.domain)) return;
  const rootBase = ROOTS[entry.source] || ROOTS['resources'];
  const abs = path.join(rootBase, entry.relPath);
  if (!fs.existsSync(abs)) { stats.missing++; return; }
  let r;
  try { r = await extractPdfPages(abs, entry); } catch (e) { r = { ok: false, error: e.message }; }
  if (!r.ok) {
    stats.failed++;
    stats.errors.push({ relPath: entry.relPath, error: r.error });
    return;
  }
  let kept = 0;
  for (const pg of r.pages) {
    if (isBoilerplatePage(pg.text)) { stats.skippedPages++; continue; }
    const row = {
      schemaVersion: SCHEMA_VERSION,
      tier: entry._tier,
      source: entry.source,
      domain: entry.domain,
      software: entry.software,
      relPath: entry.relPath,
      pdfTitle: path.basename(entry.relPath, '.pdf'),
      pageNumber: pg.pageNumber,
      textChars: pg.text.length,
      text: pg.text,
    };
    jsonlStream.write(JSON.stringify(row) + '\n');
    kept++;
    stats.notablePages++;
  }
  stats.processedPdfs++;
  if (kept === 0) stats.zeroNotablePdfs++;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(INDEX_PATH)) {
    process.stderr.write(`ERROR: ${INDEX_PATH} missing. Run build-cad-cam-resources-pdf-index first.\n`);
    process.exit(1);
  }
  const idx = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
  // Pre-score every entry, then filter to CAM+machining-relevant domains.
  const camMachiningDomains = new Set(['cam', 'machine', 'mfg', 'blueprint', 'catalog']);
  const scored = idx.entries
    .filter((e) => camMachiningDomains.has(e.domain) || /training/.test(e.domain))
    .map((e) => ({ ...e, _tier: curriculumTier(e) }))
    .sort((a, b) => a._tier - b._tier || a.sizeBytes - b.sizeBytes);
  const queue = args.limit ? scored.slice(0, args.limit) : scored;
  fs.mkdirSync(OUT_BASE, { recursive: true });
  if (args.force && fs.existsSync(OUT_JSONL)) fs.unlinkSync(OUT_JSONL);
  // Resume support: if jsonl exists, read seen relPaths to skip.
  const seen = new Set();
  if (fs.existsSync(OUT_JSONL)) {
    const lines = fs.readFileSync(OUT_JSONL, 'utf8').split('\n').filter((l) => l.trim());
    for (const l of lines) { try { seen.add(JSON.parse(l).relPath); } catch { /* ignore */ } }
  }
  const jsonlStream = fs.createWriteStream(OUT_JSONL, { flags: 'a' });
  const stats = {
    schemaVersion: SCHEMA_VERSION,
    startedAt: new Date().toISOString(),
    queueSize: queue.length,
    processedPdfs: 0,
    skippedPdfs: 0,
    missing: 0,
    failed: 0,
    notablePages: 0,
    skippedPages: 0,
    zeroNotablePdfs: 0,
    errors: [],
    tierDistribution: {},
  };
  for (const e of queue) stats.tierDistribution[e._tier] = (stats.tierDistribution[e._tier] || 0) + 1;
  for (const entry of queue) {
    if (seen.has(entry.relPath) && !args.force) { stats.skippedPdfs++; continue; }
    try { await processEntry(entry, jsonlStream, stats, args); }
    catch (outerErr) {
      stats.failed++;
      stats.errors.push({ relPath: entry.relPath, error: `outer: ${outerErr?.message || String(outerErr)}` });
    }
  }
  jsonlStream.end();
  stats.finishedAt = new Date().toISOString();
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(stats, null, 2));
  process.stdout.write(JSON.stringify({
    ok: true,
    jsonl: OUT_JSONL,
    processedPdfs: stats.processedPdfs,
    skippedPdfs: stats.skippedPdfs,
    failed: stats.failed,
    notablePages: stats.notablePages,
    skippedPages: stats.skippedPages,
    tierDistribution: stats.tierDistribution,
  }) + '\n');
}

// Last-resort handlers — pdf-parse v2 has been observed to emit uncaught
// async events that bypass our try/catch wrappers. Swallow + log so a single
// bad PDF cannot kill the whole batch.
process.on('uncaughtException', (e) => {
  process.stderr.write(`[uncaughtException] ${e?.stack || e}\n`);
});
process.on('unhandledRejection', (e) => {
  process.stderr.write(`[unhandledRejection] ${e?.stack || e}\n`);
});

const invokedDirectly = process.argv[1]
  && path.basename(process.argv[1]) === 'extract-pdf-pages-curriculum.mjs';
if (invokedDirectly) main().catch((e) => { process.stderr.write(`FATAL: ${e.message}\n`); process.exit(1); });
