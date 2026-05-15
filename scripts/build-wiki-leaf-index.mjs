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
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..");
// Input dirs are env-overridable so the U-CLEANUP-D5 test suite can run the real
// main() against a tmp wiki tree. Defaults are the live PRISM paths. OUT_PATH /
// STATS_PATH derive from ARCH_DIR so an override redirects the output too.
const ARCH_DIR = process.env.PRISM_WIKI_ARCH_DIR || resolve(PRISM_ROOT, "knowledge/wiki/architecture");
const OUT_PATH = join(ARCH_DIR, "_leaf-index.jsonl");
const STATS_PATH = join(ARCH_DIR, "_stats.md");
const ORPHANS_PATH = resolve(PRISM_ROOT, "state/shared/wiki-orphans.json");
// Extra corpora to fold into the recall index (not under architecture/, but the
// recall hooks should still surface them): the ~4.2K atomic tribal tips and the
// canonical code-tribal entries. Each line gets a distinct `type` so consumers
// can tell them apart from architecture entries.
const TRIBAL_DIR = process.env.PRISM_WIKI_TRIBAL_DIR || resolve(PRISM_ROOT, "knowledge/tribal");
const CODE_TRIBAL_DIR = process.env.PRISM_WIKI_CODE_TRIBAL_DIR || resolve(PRISM_ROOT, "knowledge/wiki/code-tribal");
// Personal-memory mirror: `memory-mirror-to-vault.mjs` writes the auto-memory
// dir (`feedback_*.md`, `reference_*.md`, `project_*.md`, `user_*.md`, …) into
// `knowledge/memories/` so it lives in-vault alongside the wiki tree. Indexing
// them here is how the recall hooks (wiki-precheck-inject, wiki-recall-on-read)
// surface memories semantically — keyword-only matching via
// memory-relevance-inject.mjs stays in place for PreToolUse:Edit (different
// recall surface). Skips `MEMORY.md` (index file) and `_index/` (also indexes).
const MEMORIES_DIR = process.env.PRISM_WIKI_MEMORIES_DIR || resolve(PRISM_ROOT, "knowledge/memories");

const DESC_MAX = 200;
const MAX_BOOST_KEYWORDS = 24; // per-entry cap — keeps the leaf-index lean + bounds recall footprint

// Frontmatter keys parsed as YAML arrays. Every other key stays a scalar, exactly
// as the original scalar-only parser behaved — so title/type/id/category reads are
// provably unaffected by the D5 array support. Keep this set minimal.
const ARRAY_KEYS = new Set(["boost_keywords"]);

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

// Frontmatter parser. Scalars behave EXACTLY as the original scalar-only parser
// (title/type/id/category are unaffected — a value is only ever parsed as an
// array when its key is in ARRAY_KEYS). Adds the two YAML array forms so
// `boost_keywords` (U-CLEANUP-D5) is extractable:
//   inline:  boost_keywords: [hook, settings.json, "*.mjs"]
//   block:   boost_keywords:
//              - hook
//              - settings.json
// `fm` is a null-prototype object so a literal `__proto__:` / `constructor:`
// frontmatter key cannot corrupt property reads.
function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return Object.create(null);
  const fm = Object.create(null);
  let pendingArrayKey = null; // an ARRAY_KEYS key with empty value — block items may follow
  for (const raw of m[1].split("\n")) {
    // block-sequence item ("  - value") for the current pending array key
    const seq = raw.match(/^\s+-\s+(.*)$/);
    if (seq && pendingArrayKey) {
      const item = seq[1].trim().replace(/^['"]|['"]$/g, "");
      if (item) fm[pendingArrayKey].push(item);
      continue;
    }
    // blank line / YAML comment between a key and its block sequence — skip it
    // WITHOUT clearing pendingArrayKey (real YAML tolerates this).
    if (raw.trim() === "" || /^\s*#/.test(raw)) continue;
    const kv = raw.match(/^([a-z_-]+)\s*:\s*(.*)$/i);
    if (!kv) { pendingArrayKey = null; continue; }
    const key = kv[1].trim();
    const rawVal = kv[2].trim();
    pendingArrayKey = null;
    if (ARRAY_KEYS.has(key)) {
      const inlineArr = rawVal.match(/^\[(.*)\]$/);
      if (inlineArr) {
        fm[key] = inlineArr[1]
          .split(",")
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
          .filter(Boolean);
      } else if (rawVal === "") {
        // empty value on an array key — start of a block sequence (or empty array)
        fm[key] = [];
        pendingArrayKey = key;
      } else {
        // a bare scalar written to an array key — wrap it
        fm[key] = [rawVal.replace(/^['"]|['"]$/g, "")];
      }
    } else {
      // scalar key — byte-identical behavior to the original parser
      fm[key] = rawVal.replace(/^['"]|['"]$/g, "");
    }
  }
  return fm;
}

// Normalize a frontmatter `boost_keywords` value (array | string | absent) into a
// clean lowercased string[] (or null). Non-string elements are dropped (not
// stringified). Capped at MAX_BOOST_KEYWORDS to bound a single entry's footprint.
function normalizeBoostKeywords(v) {
  let arr = null;
  if (Array.isArray(v)) arr = v;
  else if (typeof v === "string" && v.trim()) arr = [v];
  if (!arr) return null;
  const out = arr
    .filter((k) => typeof k === "string")
    .map((k) => k.toLowerCase().trim())
    .filter(Boolean)
    .slice(0, MAX_BOOST_KEYWORDS);
  return out.length ? out : null;
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
  let boostEntryCount = 0;
  function pushEntry(name, title, type, desc, path, boostKeywords) {
    let n = name; let i = 2;
    while (seenNames[n]) n = `${name}~${i++}`;
    seenNames[n] = 1;
    const rec = { name: n, title, type, desc, path };
    if (Array.isArray(boostKeywords) && boostKeywords.length) {
      rec.boost_keywords = boostKeywords;
      boostEntryCount++;
    }
    lines.push(JSON.stringify(rec));
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
    pushEntry(name, title, type, desc, path, normalizeBoostKeywords(fm.boost_keywords));
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
      pushEntry(name, title, "tribal-tip", desc, path, normalizeBoostKeywords(fm.boost_keywords));
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
      pushEntry(name, title, type, desc, path, normalizeBoostKeywords(fm.boost_keywords));
      codeTribalCount++;
    }
  }
  // Personal-memory mirror (knowledge/memories/**) — auto-mirrored from the
  // C:\Users\…\.claude\projects\H--PRISM\memory dir by memory-mirror-to-vault.mjs.
  // Index pattern parallels code-tribal: parse frontmatter, derive name + title +
  // type + first-line desc. Skip `MEMORY.md` (index file) + `_index/` subtree
  // (also index files). Dedup by `name` against entries already pushed: the
  // mirror writes BOTH a flat top-level copy AND the categorized subdir copy of
  // each memory, so without dedup we'd double-index every entry.
  let memoryCount = 0;
  // Per-corpus dedup set: the memory mirror writes BOTH a flat top-level copy
  // (e.g. `feedback_alpha_owns_reaper.md`) AND a categorized-subdir copy
  // (`feedback/feedback_alpha_owns_reaper.md`). Without explicit dedup,
  // pushEntry's `~2` suffix logic would mint duplicate entries (one per copy,
  // verified 2026-05-14 — 124 memories had `~2` siblings). Track the canonical
  // frontmatter `name` per file and skip on collision. Walk order is depth-first
  // alphabetical, so the subdir copy is encountered before the flat copy (because
  // `feedback/` < `feedback_*.md` lexicographically); the subdir copy wins.
  const seenMemoryNames = new Set();
  if (existsSync(MEMORIES_DIR)) {
    for (const f of walkMd(MEMORIES_DIR)) {
      const baseName = basename(f, ".md");
      if (baseName === "MEMORY" || baseName === "MEMORY.md") continue;
      const rel = relative(MEMORIES_DIR, f).replace(/\\/g, "/");
      // Skip _index/ subtree — those are wiki-index files, not memory entries.
      if (rel.startsWith("_index/")) continue;
      let content;
      try { content = readFileSync(f, "utf8"); } catch { skipped++; continue; }
      const fm = parseFrontmatter(content);
      // `name` is the canonical slug; fall back to basename. Skip if we already
      // pushed this slug (flat + categorized-subdir copies of the same memory).
      const name = (fm.name && String(fm.name).trim()) || baseName;
      if (seenMemoryNames.has(name)) continue;
      seenMemoryNames.add(name);
      const title = fm.title || firstH1(content) || name;
      // memory type: feedback / reference / project / user / mistakes / patterns.
      // Frontmatter stores it nested under `metadata: type:` per the global
      // CLAUDE.md schema; fall back to first path segment ("feedback/foo.md"
      // → "feedback") then default to "memory".
      // Privacy gate — opt-out for memories that should NOT enter the recall
      // surface. Top-level scalar frontmatter fields (the parser only handles
      // scalars + ARRAY_KEYS — nested `metadata: { private: true }` would not
      // round-trip here; documented in the global CLAUDE.md memory schema as
      // a top-level field). Honors both string "true" and boolean true.
      if (fm.private === true || fm.private === "true" ||
          fm.exclude_from_index === true || fm.exclude_from_index === "true") {
        continue;
      }
      // Path-segment fallback is only valid when the file lives in a category
      // subdir — for a flat top-level file like `devops_improvements.md` the
      // first segment IS the filename, which would mint a useless one-off type
      // ("memory-devops_improvements.md"). Default to "uncategorized" in that
      // case so the type universe stays bounded.
      //
      // The frontmatter parser at lines ~85-127 is scalar-only with an array
      // exception (ARRAY_KEYS) — nested `metadata: { type: feedback }` does NOT
      // round-trip, so we DO NOT read `fm.metadata.type` (a previous draft did,
      // but the expression was dead — confirmed by reviewer pass 2026-05-14).
      // Resolution order: top-level `fm.type` → path segment → "uncategorized".
      const pathSegment = rel.includes("/") ? rel.split("/")[0] : null;
      const metaType = fm.type || pathSegment || "uncategorized";
      const type = `memory-${String(metaType).toLowerCase().replace(/\.md$/, "")}`;
      const desc =
        firstBlockquote(content) ||
        (fm.description && String(fm.description).slice(0, DESC_MAX)) ||
        (content.replace(/^---[\s\S]*?\n---\s*\n/, "").split(/\r?\n/).find((l) => l.trim() && !l.startsWith("#")) || "")
          .trim()
          .slice(0, DESC_MAX);
      const path = relative(PRISM_ROOT, f).replace(/\\/g, "/");
      pushEntry(name, title, type, desc, path, normalizeBoostKeywords(fm.boost_keywords));
      memoryCount++;
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

**Total recall-index entries:** ${lines.length}  (\`architecture/\` tree: ${archCount} · tribal tips: ${tribalCount} · code-tribal: ${codeTribalCount} · memories: ${memoryCount})
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

  process.stdout.write(`leaf-index: ${lines.length} entries (arch ${archCount} + tribal ${tribalCount} + code-tribal ${codeTribalCount} + memories ${memoryCount}) -> _leaf-index.jsonl (${(Buffer.byteLength(jsonl) / 1048576).toFixed(2)} MB) + _stats.md, ${boostEntryCount} with boost_keywords, ${Date.now() - t0}ms, skipped ${skipped}\n`);
}

// Run only when invoked directly — importing this module (the U-CLEANUP-D5 test
// suite imports parseFrontmatter / normalizeBoostKeywords) must NOT trigger a
// full regen of the real _leaf-index.jsonl.
const isDirectRun = !!process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) main();

export { parseFrontmatter, normalizeBoostKeywords };
