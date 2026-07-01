#!/usr/bin/env node
/**
 * catalog-jm-die-tribal-wiki-corpus.mjs
 *
 * Per /goal 2026-05-26 (lima /loop): "H:\PRISM\JM DIE\TRIBAL + WIKI".
 *
 * Walks H:/PRISM/JM DIE/TRIBAL + WIKI/ (~1.1 GB curated PDF corpus — CNC books,
 * CAM training materials, tool catalogs, references) and emits 4 artifact sets:
 *
 *   1. knowledge/wiki/code-tribal/jm-die-corpus/<slug>.md   — per-PDF wiki stub
 *      with citation-ready frontmatter pointing back to source path + size.
 *      Body is "extraction pending — run /pdf-learn <path>" so other slots
 *      can pick up the work without ambiguity.
 *
 *   2. mcp-server/data/tribal/jm-die-corpus.jsonl           — one entry per PDF
 *      with domain classification (heuristic from filename) so tribal-by-domain-
 *      inject surfaces them to mill/lathe/wedm/cam slots that need that source.
 *
 *   3. state/shared/system-viz/augmentations/jm-die-corpus.json
 *      — graph nodes (one per PDF) + ghost.jm_die_corpus roost + edges wiring
 *      every PDF as consumed-by PDFLearnEngine.
 *
 *   4. state/shared/jm-die-corpus-queue.json                — processing queue
 *      ranked by ROI (estimated knowledge density × size × domain priority).
 *      /pdf-learn can drain this queue or operators can hand-pick top items.
 *
 * Lima soul (citation mandatory): every emitted entry cites the source PDF
 * filename + byte size + last-modified date. No claims about content yet —
 * that's /pdf-learn's job. We catalog + route + queue.
 *
 * The 4 artifact sets give other PSN nodes a DISCOVERABILITY surface:
 *   - wiki-precheck-inject finds the PDFs by domain keyword
 *   - tribal-by-domain-inject surfaces them per slot
 *   - system-viz renders them under the ghost.jm_die_corpus roost
 *   - /pick-unit-style queue picks the next-highest-ROI PDF to extract
 */

import { readdirSync, statSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, basename, dirname } from "node:path";

const CORPUS_ROOT = "H:/PRISM/JM DIE/TRIBAL + WIKI";
const REPO_ROOT = "H:/prism-slot-lima";
const WIKI_DIR = join(REPO_ROOT, "knowledge", "wiki", "code-tribal", "jm-die-corpus");
const TRIBAL_PATH = join(REPO_ROOT, "mcp-server", "data", "tribal", "jm-die-corpus.jsonl");
const AUG_PATH = join(REPO_ROOT, "state", "shared", "system-viz", "augmentations", "jm-die-corpus.json");
const QUEUE_PATH = join(REPO_ROOT, "state", "shared", "jm-die-corpus-queue.json");

// ─── DOMAIN CLASSIFICATION ───────────────────────────────────────────────────

/** Heuristic: classify a PDF by filename keywords. Returns one of:
 *  cnc-programming | cam-training | lathe | mill | wedm | tooling | cad |
 *  fundamentals | reference | safety | software-cs | unknown
 */
function classifyByFilename(filename) {
  const f = filename.toLowerCase();
  if (/wedm|wire.edm|sodick/.test(f)) return "wedm";
  if (/lathe|turning|cnc.lathe/.test(f)) return "lathe";
  if (/mill|milling|face.mill|machining/.test(f) && !/multiaxis/.test(f)) return "mill";
  if (/multiaxis|5.axis|5axis|multi-axis/.test(f)) return "five-axis";
  if (/mastercam|hypermill|inventorcam|solidcam|fusion|nx.cam|powermill|esprit|catia/.test(f)) return "cam-training";
  if (/solidworks|inventor|catia|cad/.test(f)) return "cad";
  if (/tool.holder|big.daishowa|sandvik|kennametal|iscar|catalog/.test(f)) return "tooling";
  if (/g.code|gcode|g.&.m|programming/.test(f)) return "cnc-programming";
  if (/safety|osha/.test(f)) return "safety";
  if (/feeds.and.speeds|speed.feed|chip.load|calculator/.test(f)) return "speed-feed";
  if (/fundamentals|basics|introduction|easy.guide|getting.started/.test(f)) return "fundamentals";
  if (/cs50|coursera|edx/.test(f)) return "software-cs";
  if (/manual|reference|handbook/.test(f)) return "reference";
  return "unknown";
}

/** Heuristic ROI score 0-100: knowledge density × size × domain priority.
 *  Used to rank the processing queue (highest first). */
function roiScore(filename, sizeBytes, domain) {
  // Size in MB — knowledge density assumed roughly linear with size
  const mb = sizeBytes / (1024 * 1024);
  // Domain priority (manually weighted — CAM training + speed-feed = highest ROI)
  const domainWeight = {
    "speed-feed": 1.0,
    "cam-training": 0.95,
    "cnc-programming": 0.90,
    "tooling": 0.88,
    "mill": 0.85,
    "lathe": 0.85,
    "wedm": 0.85,
    "five-axis": 0.80,
    "fundamentals": 0.75,
    "cad": 0.70,
    "reference": 0.65,
    "safety": 0.60,
    "software-cs": 0.20,  // CS50 etc. — lower priority for manufacturing academy
    "unknown": 0.50,
  }[domain] || 0.5;
  // ROI: cap size contribution at 50 MB (diminishing returns — bigger PDFs
  // don't proportionally have more useful knowledge; some are reference dumps)
  const sizePoints = Math.min(50, mb) * 0.6;  // 0-30 points
  const domainPoints = domainWeight * 70;     // 0-70 points
  return Math.round(sizePoints + domainPoints);
}

/** Filesystem-safe slug from PDF filename. */
function slugify(filename) {
  return filename
    .toLowerCase()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ─── WALK ────────────────────────────────────────────────────────────────────

function walkCorpus(rootDir) {
  const entries = [];
  try {
    const items = readdirSync(rootDir, { withFileTypes: true });
    for (const item of items) {
      if (item.isFile() && /\.pdf$/i.test(item.name)) {
        const fullPath = join(rootDir, item.name);
        const stats = statSync(fullPath);
        const domain = classifyByFilename(item.name);
        entries.push({
          filename: item.name,
          source_path: fullPath,
          size_bytes: stats.size,
          size_mb: +(stats.size / 1024 / 1024).toFixed(2),
          mtime_iso: stats.mtime.toISOString().slice(0, 10),
          domain,
          slug: slugify(item.name),
          roi_score: roiScore(item.name, stats.size, domain),
        });
      } else if (item.isFile() && /\.(zip|cls|xlsm)$/i.test(item.name)) {
        // Catalog non-PDF assets too (tool catalogs in .zip, macros in .cls)
        const fullPath = join(rootDir, item.name);
        const stats = statSync(fullPath);
        entries.push({
          filename: item.name,
          source_path: fullPath,
          size_bytes: stats.size,
          size_mb: +(stats.size / 1024 / 1024).toFixed(2),
          mtime_iso: stats.mtime.toISOString().slice(0, 10),
          domain: classifyByFilename(item.name),
          slug: slugify(item.name),
          roi_score: roiScore(item.name, stats.size, classifyByFilename(item.name)),
          asset_type: item.name.toLowerCase().split(".").pop(),
        });
      }
    }
  } catch (err) {
    console.error("walk failed:", err.message);
  }
  return entries.sort((a, b) => b.roi_score - a.roi_score);
}

// ─── EMITTERS ────────────────────────────────────────────────────────────────

function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

function emitWikiStubs(entries) {
  ensureDir(WIKI_DIR);
  let count = 0;
  for (const e of entries) {
    const path = join(WIKI_DIR, e.slug + ".md");
    const body = `---
name: jm-die-corpus-${e.slug}
namespace: code-tribal
type: source-pdf-stub
domain: ${e.domain}
source_path: "${e.source_path.replace(/\\/g, "/")}"
filename: "${e.filename}"
size_mb: ${e.size_mb}
mtime: "${e.mtime_iso}"
roi_score: ${e.roi_score}
extraction_status: pending
extraction_command: "/pdf-learn ${e.source_path.replace(/\\/g, "/")}"
last_verified: "2026-05-26"
tags: ["jm-die-corpus", "${e.domain}", "pdf-source"]
---

# JM Die Corpus — ${e.filename}

**Source PDF**: \`${e.source_path}\` (${e.size_mb} MB, modified ${e.mtime_iso})
**Domain (heuristic)**: ${e.domain}
**ROI score**: ${e.roi_score} / 100
**Status**: Catalog entry — content extraction pending.

## How to extract knowledge from this PDF

Run \`/pdf-learn "${e.source_path.replace(/\\/g, "/")}"\` from any PRISM session.
The skill will OCR + chunk + extract tribal tips, formulas, and parameter
tables into the appropriate PRISM components.

## Cross-links

- Parent corpus: [[jm-die-tribal-wiki-corpus-index]]
- Processing queue: \`state/shared/jm-die-corpus-queue.json\` (ranked by ROI)
- Consumer engine: \`PDFLearnEngine\`
- Tribal feed: \`mcp-server/data/tribal/jm-die-corpus.jsonl\` (entries with \`source_slug: "${e.slug}"\`)

## Citation contract

Per lima soul (specialist-academy): every tribal tip or course module that
references this source MUST cite the source filename + page number + extraction
date. The frontmatter \`source_path\` above is the canonical citation path.
`;
    writeFileSync(path, body);
    count++;
  }
  return count;
}

function emitTribalJsonl(entries) {
  ensureDir(dirname(TRIBAL_PATH));
  const lines = entries.map(e => JSON.stringify({
    id: `jm-die-corpus-${e.slug}`,
    domain: e.domain,
    source_slug: e.slug,
    claim: `JM Die curated training corpus PDF: "${e.filename}" (${e.size_mb} MB). Domain: ${e.domain}. ROI score ${e.roi_score}/100. Extract via /pdf-learn.`,
    source: `${e.source_path} (modified ${e.mtime_iso})`,
    confidence: 0.95,
    verified_at: "2026-05-26",
    extraction_status: "pending",
    metadata: {
      size_bytes: e.size_bytes,
      mtime_iso: e.mtime_iso,
      roi_score: e.roi_score,
    },
  }));
  writeFileSync(TRIBAL_PATH, lines.join("\n") + "\n");
  return lines.length;
}

function emitAugmentation(entries) {
  ensureDir(dirname(AUG_PATH));
  const nodes = [];
  const edges = [];

  // Roost
  nodes.push({
    id: "ghost.jm_die_corpus",
    type: "ghost-roost",
    layer: "L7",
    label: `JM Die Curated Corpus (${entries.length} PDFs / .zips)`,
    child_pattern: "jm-die-corpus.*",
    built: true,
  });

  // One node per PDF
  for (const e of entries) {
    const nodeId = `jm-die-corpus.${e.slug}`;
    nodes.push({
      id: nodeId,
      type: "source-pdf",
      layer: "L8",
      label: e.filename,
      domain: e.domain,
      size_mb: e.size_mb,
      roi_score: e.roi_score,
      extraction_status: "pending",
      source_path: e.source_path,
      built: true,
    });
    edges.push({ from: "ghost.jm_die_corpus", to: nodeId, relation: "contains" });
    edges.push({ from: nodeId, to: "PDFLearnEngine", relation: "consumed-by" });
    // Cross-link to per-domain consumer engine where applicable
    const domainEngineMap = {
      "speed-feed": "UltimateSpeedFeedEngine",
      "cam-training": "CAMStrategyOrchestratorEngine",
      "cnc-programming": "GCodeProgrammingKnowledgeEngine",
      "tooling": "ToolSelectionEngine",
      "wedm": "WireEDMProgressiveEngine",
      "five-axis": "FiveAxisStrategyEngine",
    };
    if (domainEngineMap[e.domain]) {
      edges.push({ from: nodeId, to: domainEngineMap[e.domain], relation: "feeds-into" });
    }
  }

  const aug = {
    schemaVersion: "1.0.0",
    generator: "catalog-jm-die-tribal-wiki-corpus.mjs",
    generated_at: "2026-05-26",
    nodes,
    edges,
  };
  writeFileSync(AUG_PATH, JSON.stringify(aug, null, 2));
  return { nodes: nodes.length, edges: edges.length };
}

function emitProcessingQueue(entries) {
  ensureDir(dirname(QUEUE_PATH));
  const queue = {
    schemaVersion: "1.0.0",
    generator: "catalog-jm-die-tribal-wiki-corpus.mjs",
    generated_at: "2026-05-26",
    total: entries.length,
    by_domain: entries.reduce((acc, e) => {
      acc[e.domain] = (acc[e.domain] || 0) + 1;
      return acc;
    }, {}),
    pending: entries.map(e => ({
      slug: e.slug,
      filename: e.filename,
      source_path: e.source_path,
      domain: e.domain,
      size_mb: e.size_mb,
      roi_score: e.roi_score,
      status: "pending",
      extract_command: `/pdf-learn "${e.source_path.replace(/\\/g, "/")}"`,
    })),
  };
  writeFileSync(QUEUE_PATH, JSON.stringify(queue, null, 2));
  return queue;
}

// ─── INDEX WIKI ENTRY ────────────────────────────────────────────────────────

function emitIndexWiki(entries) {
  const indexPath = join(WIKI_DIR, "_index.md");
  // Domain rollup
  const byDomain = {};
  let totalSize = 0;
  for (const e of entries) {
    byDomain[e.domain] = byDomain[e.domain] || { count: 0, size_mb: 0 };
    byDomain[e.domain].count++;
    byDomain[e.domain].size_mb += e.size_mb;
    totalSize += e.size_mb;
  }
  const domainRows = Object.entries(byDomain)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([d, s]) => `| ${d} | ${s.count} | ${s.size_mb.toFixed(1)} |`)
    .join("\n");

  const topTen = entries.slice(0, 10)
    .map(e => `- **[[jm-die-corpus-${e.slug}]]** (ROI ${e.roi_score}, ${e.size_mb} MB, ${e.domain}) — \`${e.filename}\``)
    .join("\n");

  const body = `---
name: jm-die-tribal-wiki-corpus-index
namespace: code-tribal
type: corpus-index
source_dir: "${CORPUS_ROOT}"
total_files: ${entries.length}
total_size_mb: ${totalSize.toFixed(1)}
last_verified: "2026-05-26"
tags: ["jm-die-corpus", "index", "pdf-corpus"]
---

# JM Die Curated Tribal + Wiki Corpus — Index

**Source directory**: \`${CORPUS_ROOT}\`
**Total**: ${entries.length} files / ${totalSize.toFixed(1)} MB
**Generated**: 2026-05-26

## What this is

The \`TRIBAL + WIKI/\` folder in the JM Die archive is a curated PDF library
of CNC training materials, CAM software docs, tool catalogs, and reference
material. It is the **canonical source corpus** for PRISM Academy tribal
knowledge + wiki entries about JM Die's manufacturing domain.

This index lists every catalogued source. Each PDF has its own stub wiki
entry at \`knowledge/wiki/code-tribal/jm-die-corpus/<slug>.md\` (citation-ready).

## Domain breakdown

| Domain | Files | Size (MB) |
|--------|-------|-----------|
${domainRows}

## Top 10 by ROI (process these first)

${topTen}

## How to process

Drain the queue (highest ROI first):

\`\`\`bash
# Show next-highest-ROI pending entry
node -e "console.log(JSON.stringify(require('./state/shared/jm-die-corpus-queue.json').pending[0], null, 2))"

# Process the top item via /pdf-learn skill
/pdf-learn "<source_path from queue>"
\`\`\`

## Provenance + citation rule (lima soul)

Every tribal tip or course module that draws from these PDFs MUST cite the
source filename + page number + extraction date. The per-PDF stub entries
under \`jm-die-corpus/\` carry the canonical citation path in their frontmatter.

## Cross-links

- Tribal feed: \`mcp-server/data/tribal/jm-die-corpus.jsonl\`
- System-viz roost: \`ghost.jm_die_corpus\` (${entries.length} children)
- Processing queue: \`state/shared/jm-die-corpus-queue.json\`
- Consumer engine: \`PDFLearnEngine\`
- Per-domain consumer engines wired via system-viz augmentation
`;
  writeFileSync(indexPath, body);
  return indexPath;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const dryRun = process.argv.includes("--dry-run");

console.log(`Walking ${CORPUS_ROOT} ...`);
const entries = walkCorpus(CORPUS_ROOT);
console.log(`Found ${entries.length} catalogable files.`);

if (dryRun) {
  console.log("DRY RUN — not writing artifacts.");
  console.log("Top 5 by ROI:");
  entries.slice(0, 5).forEach(e =>
    console.log(`  ${e.roi_score}  ${e.size_mb}MB  ${e.domain.padEnd(20)}  ${e.filename}`)
  );
  process.exit(0);
}

const wikiCount = emitWikiStubs(entries);
const indexPath = emitIndexWiki(entries);
const tribalCount = emitTribalJsonl(entries);
const augResult = emitAugmentation(entries);
const queue = emitProcessingQueue(entries);

console.log(JSON.stringify({
  ok: true,
  catalogged: entries.length,
  wiki_stubs: wikiCount,
  wiki_index: indexPath,
  tribal_entries: tribalCount,
  graph_nodes: augResult.nodes,
  graph_edges: augResult.edges,
  queue_path: QUEUE_PATH,
  by_domain: queue.by_domain,
}, null, 2));
