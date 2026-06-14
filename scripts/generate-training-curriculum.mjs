#!/usr/bin/env node
/**
 * generate-training-curriculum.mjs — page-by-page easy→complex training corpus
 * for echo's JM Die TRIBAL+WIKI extracts.
 *
 * Operator directive 2026-05-26 (iter9): "extract page by page of notable
 * data that will train the system from the easiest input to complex work".
 *
 * Reads every .txt under state/shared/pdf-extracts/jm-die-tribal-wiki/,
 * cross-references it back to its classifier domain via the iter8 classifier,
 * splits each into pages, ranks each page on a 6-signal difficulty score,
 * filters noise (TOC / very short pages), and emits ONE merged training
 * corpus ordered easy→complex.
 *
 * Outputs:
 *   - mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl
 *   - state/shared/specs/JM-DIE-TRAINING-CURRICULUM-2026-05-26.md
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM
 * @slot echo · @iter 9 · @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyTribalWikiPdf } from "./lib/jm-die-tribal-wiki-classifier.mjs";
import {
  rankPagesEasyToComplex,
  mergeCurricula,
  difficultyDistribution,
} from "./lib/training-difficulty-ranker.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CORPUS_DIR = "H:/PRISM/JM DIE/TRIBAL + WIKI";
const EXTRACT_DIR = path.join(ROOT, "state/shared/pdf-extracts/jm-die-tribal-wiki");
const OUT_JSONL_DIR = path.join(ROOT, "mcp-server/data/ingestion_cache/training-curriculum");
const OUT_JSONL = path.join(OUT_JSONL_DIR, "jm-die-easy-to-complex.jsonl");
const OUT_SPEC_DIR = path.join(ROOT, "state/shared/specs");
const OUT_SPEC = path.join(OUT_SPEC_DIR, "JM-DIE-TRAINING-CURRICULUM-2026-05-26.md");
const SCHEMA_VERSION = "1.0.0";
const ECHO_DOMAIN_ALLOWLIST = new Set(["mill", "cam", "post", "wire", "reference"]);

/** Pure: lower-then-alnum-dash slug (matches safeExtractName in jm-die generator). */
function safeExtractName(pdfFilename) {
  return String(pdfFilename).replace(/\.pdf$/i, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function listCorpusPdfs() {
  if (!fs.existsSync(CORPUS_DIR)) return [];
  return fs.readdirSync(CORPUS_DIR).filter((f) => /\.pdf$/i.test(f)).sort();
}

function listExtractTxts() {
  if (!fs.existsSync(EXTRACT_DIR)) return new Set();
  return new Set(fs.readdirSync(EXTRACT_DIR).filter((f) => f.endsWith(".txt")).map((f) => f.replace(/\.txt$/i, "")));
}

function buildIndexExtractByDomain(pdfs) {
  const map = new Map();
  const skippedOtherDomain = [];
  for (const pdf of pdfs) {
    const cls = classifyTribalWikiPdf(pdf);
    const safe = safeExtractName(pdf);
    const txt = path.join(EXTRACT_DIR, `${safe}.txt`);
    if (!fs.existsSync(txt)) continue;
    if (!ECHO_DOMAIN_ALLOWLIST.has(cls.domain)) {
      skippedOtherDomain.push({ filename: pdf, domain: cls.domain });
      continue;
    }
    map.set(safe, { filename: pdf, domain: cls.domain, vendor: cls.vendor, controller: cls.controller, txtPath: txt });
  }
  return { map, skippedOtherDomain };
}

/** R12 fail-loud: detect orphan .txt extracts that don't correspond to any corpus PDF. */
function reconcileExtracts(pdfs, indexedSize) {
  const expectedSlugs = new Set(pdfs.map(safeExtractName));
  const onDisk = listExtractTxts();
  const orphans = [];
  for (const slug of onDisk) if (!expectedSlugs.has(slug)) orphans.push(slug);
  return { onDiskCount: onDisk.size, corpusPdfCount: pdfs.length, indexedSize, orphans };
}

function main() {
  const pdfs = listCorpusPdfs();
  const { map: indexed, skippedOtherDomain } = buildIndexExtractByDomain(pdfs);
  const reconciliation = reconcileExtracts(pdfs, indexed.size);
  if (indexed.size === 0) {
    console.error("FATAL: no extracts present in", EXTRACT_DIR);
    return 2;
  }
  if (reconciliation.orphans.length > 0) {
    console.error(`FAIL-LOUD: ${reconciliation.orphans.length} orphan .txt extract(s) on disk that match no corpus PDF`);
    for (const o of reconciliation.orphans.slice(0, 10)) console.error(`  orphan: ${o}.txt`);
    return 3;
  }

  const ranked = [];
  let totalPages = 0;
  let totalNoisePages = 0;
  let emptyExtracts = 0;
  for (const meta of indexed.values()) {
    let text;
    try { text = fs.readFileSync(meta.txtPath, "utf8"); }
    catch (e) { console.error(`FAIL-LOUD: read error on ${meta.txtPath}: ${e.message}`); continue; }
    if (text.length === 0) { console.error(`FAIL-LOUD: 0-byte extract: ${meta.txtPath}`); emptyExtracts++; continue; }
    const pageRanked = rankPagesEasyToComplex(text, { filename: meta.filename, previewChars: 280 });
    const pagesAll = text.split("\f").length;
    totalPages += pagesAll;
    totalNoisePages += (pagesAll - pageRanked.length);
    for (const r of pageRanked) {
      r.domain = meta.domain;
      r.vendor = meta.vendor;
      r.controller = meta.controller;
    }
    ranked.push(pageRanked);
  }

  const curriculum = mergeCurricula(ranked);
  const distribution = difficultyDistribution(curriculum);
  const byDomain = {};
  for (const r of curriculum) {
    byDomain[r.domain] = (byDomain[r.domain] || 0) + 1;
  }

  fs.mkdirSync(OUT_JSONL_DIR, { recursive: true });
  const ranked_jsonl = curriculum.map((r, i) => JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    rank: i + 1,
    filename: r.filename,
    domain: r.domain,
    vendor: r.vendor,
    controller: r.controller,
    pageNum: r.pageNum,
    totalPages: r.totalPages,
    difficulty: r.difficulty,
    score: r.score,
    signals: r.signals,
    preview: r.preview,
  })).join("\n") + "\n";
  fs.writeFileSync(OUT_JSONL, ranked_jsonl);

  fs.mkdirSync(OUT_SPEC_DIR, { recursive: true });
  const lines = [];
  lines.push(`# JM DIE TRIBAL+WIKI training curriculum — page-by-page easy→complex`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Slot:** echo · **Milestone:** POST-PDF-NODE-MS0/U-JM-TRAINING-CURRICULUM · **Iter:** 9`);
  lines.push(`**Source corpus:** \`H:/PRISM/JM DIE/TRIBAL + WIKI\` · ${indexed.size} extracts indexed (of ${pdfs.length} PDFs in corpus)`);
  lines.push(``);
  lines.push(`## Coverage reconciliation (R12 fail-loud)`);
  lines.push(`- corpus PDFs:            ${reconciliation.corpusPdfCount}`);
  lines.push(`- extracts on disk:       ${reconciliation.onDiskCount}`);
  lines.push(`- indexed (echo-domain):  ${indexed.size}`);
  const skippedByDomain = skippedOtherDomain.reduce((acc, s) => { acc[s.domain] = (acc[s.domain] || 0) + 1; return acc; }, {});
  const skippedSummary = Object.entries(skippedByDomain).map(([k, v]) => `${k}=${v}`).join(", ") || "none";
  lines.push(`- skipped other-domain:   ${skippedOtherDomain.length} (${skippedSummary})`);
  lines.push(`- orphan .txt extracts:   ${reconciliation.orphans.length}`);
  lines.push(`- empty-extract failures: ${emptyExtracts}`);
  lines.push(`- corpus PDFs not yet extracted: ${reconciliation.corpusPdfCount - reconciliation.onDiskCount}`);
  lines.push(``);
  lines.push(`## Headline`);
  lines.push(`- **${curriculum.length}** training-grade pages (after noise filter)`);
  lines.push(`- **${totalPages}** total pages scanned · ${totalNoisePages} dropped as noise (TOC / page-numbers / blanks)`);
  lines.push(`- **Output JSONL:** \`${path.relative(ROOT, OUT_JSONL).replace(/\\/g, "/")}\` (sorted ascending by difficulty score, rank field assigned, schemaVersion=${SCHEMA_VERSION})`);
  lines.push(``);
  lines.push(`## Distribution by difficulty bucket`);
  lines.push(`| Bucket | Count | %  |`);
  lines.push(`|--------|------:|---:|`);
  const total = curriculum.length || 1;
  for (const b of ["unscored", "easy", "intermediate", "advanced", "complex"]) {
    const n = distribution[b];
    lines.push(`| ${b} | ${n} | ${((n * 100) / total).toFixed(1)}% |`);
  }
  lines.push(``);
  lines.push(`## Distribution by classifier domain`);
  lines.push(`| Domain | Pages |`);
  lines.push(`|--------|------:|`);
  for (const [d, n] of Object.entries(byDomain).sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${d} | ${n} |`);
  }
  lines.push(``);
  lines.push(`## First 5 pages (easiest)`);
  lines.push(`| # | difficulty | score | filename · page | preview |`);
  lines.push(`|--:|------------|------:|-----------------|---------|`);
  for (let i = 0; i < Math.min(5, curriculum.length); i++) {
    const r = curriculum[i];
    const prev = r.preview.replace(/\|/g, "\\|").slice(0, 80);
    lines.push(`| ${i + 1} | ${r.difficulty} | ${r.score} | ${r.filename} · p${r.pageNum} | ${prev}… |`);
  }
  lines.push(``);
  lines.push(`## Last 5 pages (hardest)`);
  lines.push(`| # | difficulty | score | filename · page | preview |`);
  lines.push(`|--:|------------|------:|-----------------|---------|`);
  for (let i = Math.max(0, curriculum.length - 5); i < curriculum.length; i++) {
    const r = curriculum[i];
    const prev = r.preview.replace(/\|/g, "\\|").slice(0, 80);
    lines.push(`| ${i + 1} | ${r.difficulty} | ${r.score} | ${r.filename} · p${r.pageNum} | ${prev}… |`);
  }
  lines.push(``);
  lines.push(`## Consumer wiring`);
  lines.push(`- Page-by-page records can feed any retrieval / fine-tune / curriculum-learning pipeline.`);
  lines.push(`- For a controller-aware progressive trainer: filter by \`domain\` + \`controller\`, then iterate in JSONL order.`);
  lines.push(`- Cross-references: classifier (\`scripts/lib/jm-die-tribal-wiki-classifier.mjs\`), ranker (\`scripts/lib/training-difficulty-ranker.mjs\`).`);
  fs.writeFileSync(OUT_SPEC, lines.join("\n") + "\n");

  console.log(`wrote ${OUT_JSONL}`);
  console.log(`wrote ${OUT_SPEC}`);
  console.log(`  extracts indexed:   ${indexed.size} (of ${pdfs.length} PDFs in corpus)`);
  console.log(`  pages scanned:      ${totalPages}`);
  console.log(`  noise pages:        ${totalNoisePages}`);
  console.log(`  training pages:     ${curriculum.length}`);
  console.log(`  by difficulty:      ${JSON.stringify(distribution)}`);
  console.log(`  by domain:          ${JSON.stringify(byDomain)}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());

export { main, safeExtractName };
