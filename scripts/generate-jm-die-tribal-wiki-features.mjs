#!/usr/bin/env node
/**
 * generate-jm-die-tribal-wiki-features.mjs — system-viz augmentation for the
 * 80-PDF JM Die TRIBAL+WIKI consolidated corpus (1.1 GB).
 *
 * Operator directive 2026-05-26: "H:\PRISM\JM DIE\TRIBAL + WIKI — I
 * consolidated [the tribal+wiki PDFs] there".
 *
 * Reads the directory at regen time, classifies each PDF via the pure
 * scripts/lib/jm-die-tribal-wiki-classifier.mjs classifier, emits:
 *   - ghost.jm_die_tribal_wiki_corpus (L8 roost)
 *   - 7 domain pivots (L9) — mill / lathe / cam / cad / wire / post / reference
 *   - 80 L10 PDF nodes (one per file) parented to their domain pivot
 *   - per-PDF bridge edges to relevant engines per DOMAIN_TO_ENGINE_BRIDGES
 *
 * Idempotent: merge-augmentations.mjs is the authoritative dedupe.
 *
 * @milestone POST-PDF-NODE-MS0/U-JM-TRIBAL-WIKI-CORPUS
 * @slot echo
 * @iter 8
 * @date 2026-05-26
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyTribalWikiPdf, DOMAIN_TO_ENGINE_BRIDGES } from "./lib/jm-die-tribal-wiki-classifier.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "..");

export const SCHEMA_VERSION = "1.0.0";
export const ROOST_ID = "ghost.jm_die_tribal_wiki_corpus";
export const PLANNED_PARENT = "ghost.planned_features";
export const ROOST_LAYER = "L8";
export const PIVOT_LAYER = "L9";
export const PDF_LAYER = "L10";
export const MAX_LABEL = 80;
export const MAX_INFO = 200;

const CORPUS_DIR = path.join("H:/PRISM/JM DIE/TRIBAL + WIKI");
const VIZ_DIR = path.join(ROOT, "state/shared/system-viz");
const OUT_PATH = path.join(VIZ_DIR, "jm-die-tribal-wiki-augmentation.json");

// Iter9 note: per-PDF section/chapter JSONL emission was removed (the
// post-pdf-corpus-parser is tuned for post-processor heading structure,
// which these training PDFs do not have, producing silent zero output).
// Page-level training-data extraction is owned by:
//   scripts/generate-training-curriculum.mjs
// which uses scripts/lib/training-difficulty-ranker.mjs to produce
// rank-ordered easy→complex JSONL training data.

/** Pure: filesystem-safe slug. */
export function safeSlug(raw) {
  return String(raw || "x").toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-").replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "").slice(0, 60) || "x";
}

/** Pure: build nodes + edges from a classified-pdfs array. */
export function generate(items, existingNodeIds = []) {
  const ids = existingNodeIds instanceof Set ? new Set(existingNodeIds) : new Set(existingNodeIds || []);
  const newNodes = [];
  const newEdges = [];

  if (!ids.has(ROOST_ID)) {
    newNodes.push({
      id: ROOST_ID,
      label: `JM Die TRIBAL+WIKI corpus (${items.length} PDFs, 1.1 GB)`.slice(0, MAX_LABEL),
      layer: ROOST_LAYER,
      ghost: true, status: "ghost", kind: "ghost-roost",
      parent: PLANNED_PARENT,
      info: `Consolidated JM Die tribal + wiki PDF corpus. ${items.length} PDFs across mill/lathe/cam/cad/wire/post/reference. Source: H:\\PRISM\\JM DIE\\TRIBAL + WIKI`.slice(0, MAX_INFO),
    });
    ids.add(ROOST_ID);
  }

  const byDomain = new Map();
  for (const it of items) {
    const d = it.domain || "reference";
    if (!byDomain.has(d)) byDomain.set(d, []);
    byDomain.get(d).push(it);
  }

  let pivotsEmitted = 0, pdfsEmitted = 0, edgesEmitted = 0;

  for (const [domain, group] of byDomain.entries()) {
    const pivotId = `${ROOST_ID}.${safeSlug(domain)}`;
    if (!ids.has(pivotId)) {
      newNodes.push({
        id: pivotId,
        label: `📂 ${domain} (${group.length})`.slice(0, MAX_LABEL),
        layer: PIVOT_LAYER,
        ghost: true, status: "ghost", kind: "ghost-roost",
        parent: ROOST_ID,
        info: `${group.length} PDFs in the ${domain} domain.`.slice(0, MAX_INFO),
      });
      ids.add(pivotId);
      pivotsEmitted++;
    }

    const bridgeEngines = DOMAIN_TO_ENGINE_BRIDGES[domain] || [];

    for (const pdf of group) {
      const pdfId = `${pivotId}.${safeSlug(pdf.filename.replace(/\.pdf$/i, ""))}`;
      if (ids.has(pdfId)) continue;
      const meta = [];
      if (pdf.vendor) meta.push(`vendor=${pdf.vendor}`);
      if (pdf.cam_system) meta.push(`cam=${pdf.cam_system}`);
      if (pdf.controller) meta.push(`controller=${pdf.controller}`);
      newNodes.push({
        id: pdfId,
        label: `📘 ${pdf.filename.replace(/\.pdf$/i, "").slice(0, 76)}`.slice(0, MAX_LABEL),
        layer: PDF_LAYER,
        ghost: true, status: "ghost", kind: "tribal-pdf",
        parent: pivotId,
        info: `[${pdf.domain}] ${meta.join(" · ") || "no metadata"} · tags: ${pdf.tags.join(",")}`.slice(0, MAX_INFO),
      });
      ids.add(pdfId);
      pdfsEmitted++;

      for (const engine of bridgeEngines) {
        newEdges.push({
          from: pdfId,
          to: engine,
          kind: "bridge-tribal-engine",
          semantic: "informs",
          label: `informs · ${pdf.domain}`,
        });
        edgesEmitted++;
      }
    }
  }

  return {
    newNodes, newEdges,
    stats: {
      pdfsClassified: items.length,
      pivotsEmitted,
      pdfsEmitted,
      edgesEmitted,
      byDomain: Object.fromEntries([...byDomain.entries()].map(([d, g]) => [d, g.length])),
    },
  };
}

/** Read directory + classify. */
function loadCorpus() {
  if (!fs.existsSync(CORPUS_DIR)) {
    console.error(`WARN: corpus dir missing: ${CORPUS_DIR} — emitting empty augmentation`);
    return [];
  }
  const files = fs.readdirSync(CORPUS_DIR)
    .filter(f => /\.pdf$/i.test(f))
    .sort();
  return files.map(classifyTribalWikiPdf);
}

export function main() {
  const items = loadCorpus();
  let result;
  try {
    const { newNodes, newEdges, stats } = generate(items, []);
    result = {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      source: CORPUS_DIR,
      newNodes, newEdges,
      stats,
    };
  } catch (e) {
    console.error(`FATAL: generate failed — ${e.message}`);
    return 2;
  }

  try {
    fs.mkdirSync(VIZ_DIR, { recursive: true });
    fs.writeFileSync(OUT_PATH, JSON.stringify(result, null, 2));
  } catch (e) {
    console.error(`FATAL: write failed — ${e.message}`);
    return 2;
  }

  console.log(`wrote ${OUT_PATH}`);
  console.log(`  PDFs classified:   ${result.stats.pdfsClassified}`);
  console.log(`  pivots emitted:    ${result.stats.pivotsEmitted}`);
  console.log(`  PDF nodes emitted: ${result.stats.pdfsEmitted}`);
  console.log(`  bridge edges:      ${result.stats.edgesEmitted}`);
  console.log(`  by domain:         ${JSON.stringify(result.stats.byDomain)}`);
  console.log(`  (training-data extraction: run scripts/generate-training-curriculum.mjs)`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
