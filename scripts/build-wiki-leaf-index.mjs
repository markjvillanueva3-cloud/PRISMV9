#!/usr/bin/env node
/**
 * build-wiki-leaf-index.mjs
 *
 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
 *   knowledge/wiki/architecture/_leaf-index.jsonl
 *
 * One line per entry: { name, title, type, desc, path } where:
 *   - name  = basename without .md  (the [[wiki-link]] target)
 *   - title = frontmatter title (falls back to first H1)
 *   - type  = frontmatter type (architecture | engine | action | skill | hook | …)
 *   - desc  = the first blockquote line (the "> …" summary line)
 *   - path  = repo-relative path
 *
 * Why a separate file: index.md is loaded on every SessionStart + keyword match,
 * so it must stay small (~hundreds of lines). The architecture tree has ~13K leaf
 * entries — keeping them in a JSONL the recall hook reads lazily means the
 * leaves are searchable without bloating index.md.
 *
 * Idempotent. Skips the AUTO/XLINK marker noise — just pulls title + the one
 * blockquote line. ~13K entries → ~2 MB JSONL, parses in <100ms.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname, join, relative, basename } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
const ARCH_DIR = resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const OUT_PATH = join(ARCH_DIR, "_leaf-index.jsonl");
const STATS_PATH = join(ARCH_DIR, "_stats.md");
const ORPHANS_PATH = resolve(PRISM_ROOT, "state/shared/wiki-orphans.json");
// Extra corpora to fold into the recall index (not under architecture/, but the
// recall hooks should still surface them): the ~4.2K atomic tribal tips and the
// canonical code-tribal entries. Each line gets a distinct `type` so consumers
// can tell them apart from architecture entries.
const TRIBAL_DIR = resolve(PRISM_ROOT, "knowledge/tribal");
const CODE_TRIBAL_DIR = resolve(PRISM_ROOT, "knowledge/wiki/code-tribal");

const DESC_MAX = 200;

function walkMd(dir) {
  const out = [];
  function rec(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(d, e.name);
      if (e.isDirectory()) rec(full);
      else if (e.isFile() && e.name.endsWith(".md") && e.name !== "_leaf-index.jsonl") out.push(full);
    }
  }
  rec(dir);
  return out;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return {};
  const fm = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_-]+)\s*:\s*(.*)$/i);
    if (!kv) continue;
    let v = kv[2].trim().replace(/^['"]|['"]$/g, "");
    fm[kv[1].trim()] = v;
  }
  return fm;
}

function firstH1(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function firstBlockquote(content) {
  // The convention across generators: a single "> …" line right after the H1.
  const m = content.match(/^>\s+(.+)$/m);
  return m ? m[1].trim().slice(0, DESC_MAX) : "";
}

function main() {
  if (!existsSync(ARCH_DIR)) {
    process.stderr.write(`architecture dir missing at ${ARCH_DIR}\n`);
    process.exit(2);
  }
  const t0 = Date.now();
  const files = walkMd(ARCH_DIR);
  const lines = [];
  let skipped = 0;
  const seenNames = Object.create(null); // de-dup name collisions across corpora
  function pushEntry(name, title, type, desc, path) {
    let n = name; let i = 2;
    while (seenNames[n]) n = `${name}~${i++}`;
    seenNames[n] = 1;
    lines.push(JSON.stringify({ name: n, title, type, desc, path }));
  }
  for (const f of files) {
    let content;
    try { content = readFileSync(f, "utf8"); } catch { skipped++; continue; }
    const fm = parseFrontmatter(content);
    const name = basename(f, ".md");
    const title = fm.title || firstH1(content) || name;
    const type = fm.type || "architecture";
    const desc = firstBlockquote(content);
    const path = relative(PRISM_ROOT, f).replace(/\\/g, "/");
    pushEntry(name, title, type, desc, path);
  }
  const archCount = lines.length;

  // Tribal tips: ~4.2K atomic files with `id/title/source/confidence/category`
  // frontmatter. Index them so wiki-precheck-inject / wiki-recall-on-read surface
  // them. desc = title + (first non-frontmatter content line), type = "tribal-tip".
  let tribalCount = 0;
  if (existsSync(TRIBAL_DIR)) {
    for (const f of walkMd(TRIBAL_DIR)) {
      let content;
      try { content = readFileSync(f, "utf8"); } catch { skipped++; continue; }
      const fm = parseFrontmatter(content);
      const name = fm.id ? `tip-${String(fm.id).replace(/[^a-z0-9_-]/gi, "")}` : basename(f, ".md");
      const title = fm.title || basename(f, ".md");
      // first content line after the closing --- of frontmatter
      const body = content.replace(/^---[\s\S]*?\n---\s*\n/, "");
      const firstLine = (body.split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#")) || "").trim().slice(0, DESC_MAX);
      const desc = [title, fm.category ? `[${fm.category}]` : "", firstLine].filter(Boolean).join(" — ").slice(0, DESC_MAX);
      const path = relative(PRISM_ROOT, f).replace(/\\/g, "/");
      pushEntry(name, title, "tribal-tip", desc, path);
      tribalCount++;
    }
  }
  // Canonical code-tribal entries (knowledge/wiki/code-tribal/**) — wiki entries
  // that live outside architecture/. type from frontmatter, default "code-tribal".
  let codeTribalCount = 0;
  if (existsSync(CODE_TRIBAL_DIR)) {
    for (const f of walkMd(CODE_TRIBAL_DIR)) {
      let content;
      try { content = readFileSync(f, "utf8"); } catch { skipped++; continue; }
      const fm = parseFrontmatter(content);
      const name = basename(f, ".md");
      const title = fm.title || firstH1(content) || name;
      const type = fm.type || "code-tribal";
      const desc = firstBlockquote(content) || (content.replace(/^---[\s\S]*?\n---\s*\n/, "").split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#")) || "").trim().slice(0, DESC_MAX);
      const path = relative(PRISM_ROOT, f).replace(/\\/g, "/");
      pushEntry(name, title, type, desc, path);
      codeTribalCount++;
    }
  }
  const jsonl = lines.join("\n") + "\n";
  writeFileSync(OUT_PATH, jsonl, "utf8");

  // Also emit _stats.md — the authoritative wiki-size source of truth. The
  // system-viz graph's meta.headline.wikiEntries only counts index.md lines
  // (~776) and is 18x understated vs the architecture tree; this file is what
  // anyone asking "how big is the wiki" should read.
  const byType = {};
  for (const ln of lines) { try { const r = JSON.parse(ln); byType[r.type] = (byType[r.type] || 0) + 1; } catch {} }
  let orphanLine = "_(run lint-wiki-orphans.mjs for orphan stats)_";
  try {
    const o = JSON.parse(readFileSync(ORPHANS_PATH, "utf8"));
    orphanLine = `${o.totals?.orphans ?? "?"} orphans / ${o.totals?.files ?? "?"} files (${o.totals?.orphanRatio != null ? (o.totals.orphanRatio * 100).toFixed(1) + "%" : "?"})`;
  } catch {}
  const typeRows = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, c]) => `| ${t} | ${c} |`).join("\n");
  const stats = `---
title: Wiki Stats — architecture tree
type: architecture
generated_by: scripts/build-wiki-leaf-index.mjs
last_verified: ${new Date().toISOString().split("T")[0]}
total_entries: ${lines.length}
tags: [architecture, wiki, stats, self-awareness]
---

# Wiki Stats — \`knowledge/wiki/architecture/\`

> Authoritative count of the auto-generated architecture wiki tree. The
> system-viz graph's \`meta.headline.wikiEntries\` (~776) only counts
> \`index.md\` lines — it does **not** see this tree. This file is the real
> number. (If you maintain \`generate-system-viz.mjs\`, count \`architecture/**/*.md\`.)

**Total recall-index entries:** ${lines.length}  (\`architecture/\` tree: ${archCount} · tribal tips: ${tribalCount} · code-tribal: ${codeTribalCount})
**Leaf index:** \`_leaf-index.jsonl\` (${(Buffer.byteLength(jsonl) / 1048576).toFixed(2)} MB) — consumed by \`wiki-precheck-inject.mjs\` (BM25 + cosine) and \`wiki-recall-on-read.mjs\` for keyword/path recall
**Semantic index:** \`_embeddings.jsonl\` (int8 nomic-embed-text vectors over concept entries; built by \`build-wiki-embeddings.mjs\` — present iff Ollama was reachable at last regen)
**Orphan rate:** ${orphanLine}  (rescue hub: \`_orphans-rescue.md\` — every orphan gets an inbound link there, so effective orphan rate ≈ 0)
**Last regen:** ${new Date().toISOString()}

## Breakdown by entry type

| Type | Count |
|------|-------|
${typeRows}

## How the tree stays fresh

\`scripts/regen-wiki-from-viz.mjs\` (fingerprint-gated multi-stage orchestrator)
regenerates everything on every post-commit + hourly cron — skips the chain when
the graph + inputs are unchanged. Generator chain: \`generate-layer-wiki\`,
\`generate-domain-wiki\`, \`generate-dispatcher-wiki\`, \`generate-engine-wiki\`,
\`generate-action-wiki\`, \`generate-registry-wiki\`, \`generate-frontend-wiki\`,
\`generate-milestone-wiki\`, \`generate-misc-l8-wiki\`, \`generate-monolith-wiki\`,
\`generate-extracted-modules-wiki\`, \`generate-courses-wiki\`, \`generate-tribal-wiki\`,
\`generate-skill-wiki\`, \`generate-hook-wiki\`, \`generate-formula-algo-wiki\`,
\`generate-tribal-index\`, \`generate-domain-mermaid\`, \`generate-layer-stack-overview\`,
then \`system-viz-obsidian-bridge-v2\`, \`export-graph-cypher\`, \`inject-wiki-crosslinks\`,
\`build-wiki-leaf-index\` (this), \`build-wiki-embeddings\`, \`lint-wiki-orphans\`.

## See also

- Stack overview: [[layer-stack-overview]]
- Recall hook: \`.claude/hooks/wiki-precheck-inject.mjs\`
- Cypher export: \`state/shared/system-viz/graph.cypher\` + [[neo4j-import]]
`;
  writeFileSync(STATS_PATH, stats, "utf8");

  process.stdout.write(`leaf-index: ${lines.length} entries (arch ${archCount} + tribal ${tribalCount} + code-tribal ${codeTribalCount}) -> _leaf-index.jsonl (${(Buffer.byteLength(jsonl) / 1048576).toFixed(2)} MB) + _stats.md, ${Date.now() - t0}ms, skipped ${skipped}\n`);
}

main();
