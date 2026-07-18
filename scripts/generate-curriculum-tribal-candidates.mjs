#!/usr/bin/env node
/**
 * generate-curriculum-tribal-candidates.mjs — CLI that joins iter9
 * curriculum JSONL to source .txt extracts and emits ready-to-curate
 * tribal-tip candidates (advanced + complex pages, full body text).
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-CURRICULUM-TRIBAL-CANDIDATES
 * @slot echo · @iter 11 · @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadCurriculum } from "./lib/training-curriculum-query.mjs";
import {
  buildCandidate,
  selectHighSignalRecords,
  deduplicateCandidates,
  groupCandidatesByDomain,
} from "./lib/curriculum-tribal-candidate.mjs";
import { classifyWithContent } from "./lib/jm-die-content-classifier.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const CURRICULUM_JSONL = path.join(ROOT, "mcp-server/data/ingestion_cache/training-curriculum/jm-die-easy-to-complex.jsonl");
const EXTRACT_DIR = path.join(ROOT, "state/shared/pdf-extracts/jm-die-tribal-wiki");
const OUT_DIR = path.join(ROOT, "mcp-server/data/ingestion_cache/curriculum-tribal-candidates");
const OUT_JSONL = path.join(OUT_DIR, "jm-die-curriculum-tribal-candidates.jsonl");
const OUT_SPEC = path.join(ROOT, "state/shared/specs/JM-DIE-CURRICULUM-TRIBAL-CANDIDATES-2026-05-26.md");

/** Match generate-training-curriculum.mjs slug rule. */
function safeExtractName(pdfFilename) {
  return String(pdfFilename).replace(/\.pdf$/i, "")
    .toLowerCase().replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function main() {
  const all = loadCurriculum(CURRICULUM_JSONL);
  if (all.length === 0) {
    console.error(`FAIL-LOUD: curriculum JSONL empty/missing: ${CURRICULUM_JSONL}`);
    console.error("Run scripts/generate-training-curriculum.mjs first.");
    return 2;
  }

  const highSignal = selectHighSignalRecords(all);
  if (highSignal.length === 0) {
    console.error("FAIL-LOUD: no advanced/complex records — re-extract corpus or lower difficulty floor");
    return 3;
  }

  const extractCache = new Map();
  const candidates = [];
  let missingExtracts = 0;
  let contentClassifierWins = 0;
  for (const rec of highSignal) {
    const slug = safeExtractName(rec.filename);
    const txtPath = path.join(EXTRACT_DIR, `${slug}.txt`);
    if (!extractCache.has(txtPath)) {
      if (!fs.existsSync(txtPath)) { extractCache.set(txtPath, null); }
      else {
        try { extractCache.set(txtPath, fs.readFileSync(txtPath, "utf8")); }
        catch (e) { console.error(`FAIL-LOUD: read error on ${txtPath}: ${e.message}`); extractCache.set(txtPath, null); }
      }
    }
    const text = extractCache.get(txtPath);
    if (text == null) { missingExtracts++; continue; }
    const enriched = classifyWithContent(rec.filename, text);
    const recEnriched = { ...rec };
    if (!recEnriched.controller && enriched.controller) {
      recEnriched.controller = enriched.controller;
      recEnriched.controllerSource = enriched.controllerSource;
      contentClassifierWins++;
    }
    if (!recEnriched.vendor && enriched.vendor) {
      recEnriched.vendor = enriched.vendor;
      recEnriched.vendorSource = enriched.vendorSource;
    }
    candidates.push(buildCandidate(recEnriched, text));
  }

  const unique = deduplicateCandidates(candidates);
  const byDomain = groupCandidatesByDomain(unique);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const jsonlBody = unique.map((c) => JSON.stringify(c)).join("\n") + (unique.length > 0 ? "\n" : "");
  fs.writeFileSync(OUT_JSONL, jsonlBody);

  const lines = [];
  lines.push(`# JM DIE curriculum → tribal-tip candidates`);
  lines.push(``);
  lines.push(`**Generated:** ${new Date().toISOString()}`);
  lines.push(`**Slot:** echo · **Milestone:** POST-PDF-NODE-MS0/U-JM-CURRICULUM-TRIBAL-CANDIDATES · **Iter:** 11`);
  lines.push(``);
  lines.push(`## Pipeline`);
  lines.push(`1. iter9 generate-training-curriculum.mjs emits page-by-page JSONL ranked easy→complex`);
  lines.push(`2. iter11 (this script) filters advanced + complex records, joins to source .txt extract, emits candidate-shaped records with full body text`);
  lines.push(`3. operator curation step (manual or LLM-assisted): convert highest-quality candidates into typed CitedTip entries in \`mcp-server/src/data/tribal-tips/\``);
  lines.push(``);
  lines.push(`## Headline`);
  lines.push(`- high-signal source records:    ${highSignal.length} (from ${all.length} total curriculum records)`);
  lines.push(`- candidates emitted:            ${unique.length}`);
  lines.push(`- missing extracts (skipped):    ${missingExtracts}`);
  lines.push(`- content-classifier wins:       ${contentClassifierWins} (controllers recovered from extract text where filename was silent)`);
  lines.push(`- output JSONL:                  \`${path.relative(ROOT, OUT_JSONL).replace(/\\/g, "/")}\``);
  lines.push(``);
  lines.push(`## Distribution by domain`);
  lines.push(`| Domain | Count |`);
  lines.push(`|--------|------:|`);
  for (const [d, items] of [...byDomain.entries()].sort((a, b) => b[1].length - a[1].length)) {
    lines.push(`| ${d} | ${items.length} |`);
  }
  lines.push(``);
  lines.push(`## Distribution by controller`);
  const byController = new Map();
  for (const c of unique) {
    const k = c.controller || "(unspecified)";
    byController.set(k, (byController.get(k) || 0) + 1);
  }
  lines.push(`| Controller | Count |`);
  lines.push(`|------------|------:|`);
  for (const [k, n] of [...byController.entries()].sort((a, b) => b[1] - a[1])) {
    lines.push(`| ${k} | ${n} |`);
  }
  lines.push(``);
  lines.push(`## Top 10 candidates (by score)`);
  const top = unique.slice().sort((a, b) => b.score - a.score).slice(0, 10);
  lines.push(`| # | difficulty | score | domain | controller | citation | body length |`);
  lines.push(`|--:|------------|------:|--------|------------|----------|------------:|`);
  for (let i = 0; i < top.length; i++) {
    const c = top[i];
    lines.push(`| ${i + 1} | ${c.difficulty} | ${c.score} | ${c.domain} | ${c.controller || "-"} | ${c.citation} | ${c.bodyLength} |`);
  }
  lines.push(``);
  lines.push(`## Consumer wiring`);
  lines.push(`- Operator curation: pick high-score candidates → convert body → cited tip with id+sourceId+citation+body fields per the iter6 \`CitedPostTip\` pattern.`);
  lines.push(`- Target: \`mcp-server/src/data/tribal-tips/{controller}-{topic}-cited-tips.ts\` (one file per controller for queryability).`);
  lines.push(`- Cross-references: ranker (\`scripts/lib/training-difficulty-ranker.mjs\`), joiner (\`scripts/lib/curriculum-tribal-candidate.mjs\`), query (\`scripts/lib/training-curriculum-query.mjs\`).`);
  fs.writeFileSync(OUT_SPEC, lines.join("\n") + "\n");

  console.log(`wrote ${OUT_JSONL}`);
  console.log(`wrote ${OUT_SPEC}`);
  console.log(`  high-signal source records: ${highSignal.length}`);
  console.log(`  candidates emitted:         ${unique.length}`);
  console.log(`  missing extracts:           ${missingExtracts}`);
  console.log(`  content-classifier wins:    ${contentClassifierWins}`);
  console.log(`  by domain:                  ${JSON.stringify([...byDomain.entries()].map(([k, v]) => [k, v.length]))}`);
  return 0;
}

process.exit(main());
