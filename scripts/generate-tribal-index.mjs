#!/usr/bin/env node
/**
 * generate-tribal-index.mjs
 *
 * Generates a SINGLE Obsidian wiki entry at
 *   H:/prism/knowledge/wiki/architecture/tribal-knowledge-index.md
 *
 * The tribal corpus lives at H:/prism/knowledge/tribal/ as ~4,245 individual
 * markdown files (auto-ingested-tips-auto-N.md). Replicating each as a wiki
 * entry would 4x the architecture/ folder for low marginal value — the tips
 * ARE already markdown. Instead, this generator emits ONE index entry that:
 *   - summarizes the corpus (file count, byte size, age range)
 *   - samples N recent tips with deep-links
 *   - links to the corpus root for full Obsidian search
 *   - cross-refs the L8 graph rollup node `mem.tribal`
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const TRIBAL_DIR = resolve(PRISM_ROOT, "knowledge/tribal");
const WIKI_ARCH_DIR = resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const OUT_PATH = join(WIKI_ARCH_DIR, "tribal-knowledge-index.md");

const SAMPLE_TIPS = 12;

function ensureDir(d) { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

function listTribalFiles() {
  if (!existsSync(TRIBAL_DIR)) return [];
  const out = [];
  function walk(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(full);
    }
  }
  walk(TRIBAL_DIR);
  return out;
}

function extractTitle(content, fallback) {
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  const firstLine = content.split("\n").find((l) => l.trim().length > 0);
  return firstLine ? firstLine.slice(0, 80) : fallback;
}

function buildSample(files) {
  const enriched = files
    .map((f) => {
      try {
        const st = statSync(f);
        return { path: f, mtime: st.mtimeMs, size: st.size };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.mtime - a.mtime);
  const sample = enriched.slice(0, SAMPLE_TIPS).map((meta) => {
    let content = "";
    try { content = readFileSync(meta.path, "utf8"); } catch {}
    return {
      path: meta.path.replace(/\\/g, "/"),
      relPath: meta.path.replace(TRIBAL_DIR, "knowledge/tribal").replace(/\\/g, "/"),
      title: extractTitle(content, "(no title)"),
      mtime: new Date(meta.mtime).toISOString().slice(0, 10),
    };
  });
  return { sample, totalBytes: enriched.reduce((s, x) => s + x.size, 0) };
}

function render(files, sample, totalBytes) {
  const generatedAt = new Date().toISOString().split("T")[0];
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
  const sampleRows = sample.length
    ? sample
        .map((s) => `- [\`${s.relPath}\`](${s.relPath}) — ${s.title} *(modified ${s.mtime})*`)
        .join("\n")
    : "_(corpus empty)_";
  return `---
title: Tribal Knowledge Index
type: architecture
corpus: tribal
parent_layer: L8
generated_by: scripts/generate-tribal-index.mjs
last_verified: ${generatedAt}
tags: [architecture, tribal, knowledge-base, shop-floor]
related:
  - knowledge/wiki/architecture/layer-l8.md
  - state/shared/PRISM-SYSTEM-VIZ-DIRECTIVE.md
---

# Tribal Knowledge Index

> Compounding shop-floor tip corpus. ${files.length} markdown files (${totalMB} MB)
> at \`knowledge/tribal/\`. Used by Tier-3 AI specialists for retrieval-augmented
> reasoning and surfaced by \`prism_ai:tribal_lookup\` action.

**Corpus root:** \`H:/prism/knowledge/tribal/\`
**Total tips:** ${files.length} files · ${totalMB} MB
**Graph rollup node:** \`mem.tribal\` (L8 layer)

## Recent activity (${SAMPLE_TIPS} most-recent files)

${sampleRows}

## Schema

Each tip file follows the auto-ingested format:
- Filename: \`auto-ingested-tips-auto-<NNNN>.md\`
- H1 title summarizing the tip
- Body: shop-floor lesson with material/operation/machine context
- Tags via frontmatter (optional)

## Consumers

- \`prism_ai:tribal_lookup\` — semantic search across corpus
- \`MillingAGIMaster\`, \`LatheAGIKnowledgeUnification\`, \`WEDMNeuralTrainingEngine\` — RAG retrieval at inference time
- \`/tribal-knowledge-guide\` skill — capture + retrieval interactive guide

## See also

- L8 layer overview: [[layer-l8]]
- Tribal capture skill: \`/distill-tribal\`
- Full corpus: [knowledge/tribal/](../../tribal/)
`;
}

function main() {
  const files = listTribalFiles();
  if (files.length === 0) {
    console.warn(`no tribal files found at ${TRIBAL_DIR}`);
  }
  ensureDir(WIKI_ARCH_DIR);
  const { sample, totalBytes } = buildSample(files);
  const md = render(files, sample, totalBytes);
  writeFileSync(OUT_PATH, md, "utf8");
  console.log(`wrote tribal index: ${files.length} files indexed, ${sample.length} sampled, ${(totalBytes / 1048576).toFixed(2)}MB`);
}

main();
