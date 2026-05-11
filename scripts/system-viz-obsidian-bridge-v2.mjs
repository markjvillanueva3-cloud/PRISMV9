#!/usr/bin/env node
/**
 * system-viz-obsidian-bridge-v2.mjs
 *
 * Replaces the legacy v1 bridge which OOM'd on the 126K-node graph due to a
 * triple-nested substring scan (nodes × keywords × backlink-keys).
 *
 * v2 strategy:
 *   1. Scope-limit: only process semantically meaningful node layers
 *      (L0..L8 + L10). Skip L9 (fs root), L4a (9,228 actions), L11 (102,666
 *      filesystem leaves), and L5 atomic_engine nodes — they don't carry
 *      individual obsidian augmentation value.
 *   2. Pre-build a single keyword→files index for wiki + memory in one pass.
 *   3. Exact-match backlinks only — no substring scan inside the hot loop.
 *   4. Result: ~13K nodes scanned, single-digit-second runtime on the
 *      current 126K-node graph (vs. the v1 OOM).
 *
 * Output: state/shared/system-viz/obsidian-augmentation.json
 *   {
 *     generatedAt: ISO,
 *     scope: { layersIncluded: [...], nodesScanned: N },
 *     augmentations: { [nodeId]: { wikiEntries, memoryEntries, backlinks, totalBytes } }
 *   }
 */
import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const OUT_PATH = path.join(ROOT, "state/shared/system-viz/obsidian-augmentation.json");
const WIKI_DIR = path.join(ROOT, "knowledge/wiki");
const MEM_DIR = path.join(ROOT, "knowledge/memories");

const MAX_MATCHES_PER_NODE = 8;   // the brain viewer shows ≤8 wiki / ≤6 mem per node — storing 15 was just bloating obsidian-augmentation.json (128 MB → ~half on the next regen)
const MIN_KEYWORD_LEN = 4;

const INCLUDE_LAYERS = new Set(["L0", "L1", "L2", "L3", "L4", "L5", "L6", "L7", "L8", "L10"]);
const EXCLUDE_KINDS = new Set(["atomic_engine"]);

const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "into", "this", "that", "engine",
  "dispatcher", "registry", "action", "node", "label", "info", "wiki",
  "memory", "prism", "core", "data", "drilled", "system",
]);

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function tokenize(s) {
  return norm(s)
    .split(/\s+/)
    .filter((t) => t.length >= MIN_KEYWORD_LEN && !STOPWORDS.has(t));
}

async function safeRead(p) {
  try { return await readFile(p, "utf8"); } catch { return ""; }
}

async function safeStat(p) {
  try { return await stat(p); } catch { return null; }
}

async function walkMd(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  async function rec(d) {
    let entries;
    try { entries = await readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await rec(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(full);
    }
  }
  await rec(dir);
  return out;
}

function parseFrontmatter(content) {
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return { tags: [], title: null };
  const body = m[1];
  let tags = [];
  const inline = body.match(/^tags\s*:\s*\[([^\]]*)\]/m);
  const block = body.match(/^tags\s*:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (inline) {
    tags = inline[1].split(",").map((t) => t.trim().replace(/['"]/g, "")).filter(Boolean);
  } else if (block) {
    tags = block[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim().replace(/['"]/g, "")).filter(Boolean);
  }
  const titleMatch = body.match(/^title\s*:\s*['"]?(.+?)['"]?\s*$/m);
  return { tags, title: titleMatch ? titleMatch[1].trim() : null };
}

function extractH1(content) {
  const m = content.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : null;
}

function deriveKeywords(node) {
  const tokens = new Set();
  for (const t of tokenize(node.label)) tokens.add(t);
  const idParts = String(node.id || "").split(".");
  for (const t of tokenize(idParts.slice(1).join(" "))) tokens.add(t);
  // Strip common suffixes (dispatcher, engine, registry) to broaden match.
  for (const part of idParts) {
    const lc = part.toLowerCase();
    for (const suf of ["dispatcher", "engine", "registry", "engineext"]) {
      if (lc.endsWith(suf) && lc.length > suf.length + 2) {
        tokens.add(lc.slice(0, -suf.length));
      }
    }
  }
  return [...tokens];
}

async function buildWikiIndex() {
  const files = await walkMd(WIKI_DIR);
  // Forward index: file → { title, tags, size, lc, rel }
  // Reverse index: token → Set<file>
  const fileMeta = [];
  const tokenToFiles = new Map();
  for (const f of files) {
    const content = await safeRead(f);
    if (!content) continue;
    const fm = parseFrontmatter(content);
    const rel = path.relative(WIKI_DIR, f).replace(/\\/g, "/");
    const baseName = path.basename(f, ".md");
    const title = fm.title || extractH1(content) || baseName;
    const st = await safeStat(f);
    const meta = {
      path: f.replace(/\\/g, "/"),
      rel,
      subdir: rel.split("/")[0] || "",
      title,
      tags: fm.tags,
      size: st ? st.size : 0,
    };
    fileMeta.push(meta);
    // Index by title tokens, tag tokens, filename tokens
    const indexTokens = new Set();
    for (const t of tokenize(title)) indexTokens.add(t);
    for (const t of tokenize(baseName)) indexTokens.add(t);
    for (const tag of fm.tags) for (const t of tokenize(tag)) indexTokens.add(t);
    for (const t of indexTokens) {
      let s = tokenToFiles.get(t);
      if (!s) {
        s = new Set();
        tokenToFiles.set(t, s);
      }
      s.add(meta);
    }
  }
  return { fileMeta, tokenToFiles };
}

async function buildMemIndex() {
  const files = await walkMd(MEM_DIR);
  const fileMeta = [];
  const tokenToFiles = new Map();
  for (const f of files) {
    const content = await safeRead(f);
    const rel = path.relative(MEM_DIR, f).replace(/\\/g, "/");
    const type = rel.split("/")[0] || "uncategorized";
    const name = path.basename(f, ".md");
    const st = await safeStat(f);
    const meta = {
      path: f.replace(/\\/g, "/"),
      name,
      type,
      rel,
      size: st ? st.size : 0,
    };
    fileMeta.push(meta);
    for (const t of tokenize(name)) {
      let s = tokenToFiles.get(t);
      if (!s) {
        s = new Set();
        tokenToFiles.set(t, s);
      }
      s.add(meta);
    }
    // Lightweight body indexing: only tokenize headers (lines starting #)
    if (content) {
      const headers = content.split("\n").filter((l) => /^#+\s/.test(l)).join(" ");
      for (const t of tokenize(headers)) {
        let s = tokenToFiles.get(t);
        if (!s) {
          s = new Set();
          tokenToFiles.set(t, s);
        }
        s.add(meta);
      }
    }
  }
  return { fileMeta, tokenToFiles };
}

async function countBacklinks() {
  // Single pass over wiki + mem files, extract [[X]] targets, return Map<token, count>.
  const counts = new Map();
  const linkRe = /\[\[([^\]\n|]+?)(?:\|[^\]\n]+)?\]\]/g;
  const files = [...(await walkMd(WIKI_DIR)), ...(await walkMd(MEM_DIR))];
  for (const f of files) {
    const content = await safeRead(f);
    if (!content) continue;
    let m;
    while ((m = linkRe.exec(content)) !== null) {
      const target = norm(m[1]);
      if (!target) continue;
      counts.set(target, (counts.get(target) || 0) + 1);
    }
  }
  return counts;
}

function nodeIsIncluded(node) {
  if (!INCLUDE_LAYERS.has(node.layer)) return false;
  const tag = node.subgroup || node.kind || "";
  if (EXCLUDE_KINDS.has(tag)) return false;
  return true;
}

async function main() {
  const t0 = Date.now();
  if (!existsSync(GRAPH_PATH)) {
    console.error("graph missing at", GRAPH_PATH);
    process.exit(2);
  }
  const graph = JSON.parse(await readFile(GRAPH_PATH, "utf8"));
  const nodes = (graph.nodes || []).filter(nodeIsIncluded);

  const wikiTime = Date.now();
  const wiki = await buildWikiIndex();
  const memTime = Date.now();
  const mem = await buildMemIndex();
  const linkTime = Date.now();
  const backlinks = await countBacklinks();
  const indexTime = Date.now();

  const augmentations = {};
  let totalWiki = 0;
  let totalMem = 0;

  for (const node of nodes) {
    const keywords = deriveKeywords(node);
    if (!keywords.length) continue;

    const wikiHits = [];
    const wikiSeen = new Set();
    for (const k of keywords) {
      const files = wiki.tokenToFiles.get(k);
      if (!files) continue;
      for (const f of files) {
        if (wikiSeen.has(f.path)) continue;
        wikiSeen.add(f.path);
        wikiHits.push({ title: f.title, path: f.path, tags: f.tags });
        if (wikiHits.length >= MAX_MATCHES_PER_NODE) break;
      }
      if (wikiHits.length >= MAX_MATCHES_PER_NODE) break;
    }

    const memHits = [];
    const memSeen = new Set();
    for (const k of keywords) {
      const files = mem.tokenToFiles.get(k);
      if (!files) continue;
      for (const f of files) {
        if (memSeen.has(f.path)) continue;
        memSeen.add(f.path);
        memHits.push({ name: f.name, type: f.type, path: f.path });
        if (memHits.length >= MAX_MATCHES_PER_NODE) break;
      }
      if (memHits.length >= MAX_MATCHES_PER_NODE) break;
    }

    let backlinkCount = 0;
    const targetTokens = new Set([norm(node.label || ""), ...keywords].filter(Boolean));
    for (const t of targetTokens) {
      backlinkCount += backlinks.get(t) || 0;
    }

    if (!wikiHits.length && !memHits.length && backlinkCount === 0) continue;

    augmentations[node.id] = {
      wikiEntries: wikiHits,
      memoryEntries: memHits,
      backlinks: backlinkCount,
    };
    totalWiki += wikiHits.length;
    totalMem += memHits.length;
  }

  const out = {
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    scope: {
      layersIncluded: [...INCLUDE_LAYERS],
      excludeKinds: [...EXCLUDE_KINDS],
      nodesScanned: nodes.length,
      nodesAugmented: Object.keys(augmentations).length,
    },
    timings: {
      wikiIndexMs: memTime - wikiTime,
      memIndexMs: linkTime - memTime,
      backlinkMs: indexTime - linkTime,
      totalMs: Date.now() - t0,
    },
    totals: {
      wikiHits: totalWiki,
      memHits: totalMem,
      wikiFilesIndexed: wiki.fileMeta.length,
      memFilesIndexed: mem.fileMeta.length,
    },
    augmentations,
  };

  await writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");
  console.log(
    `bridge-v2: scanned ${nodes.length} nodes, augmented ${Object.keys(augmentations).length}, ` +
      `wiki=${totalWiki} memHits=${totalMem} in ${Date.now() - t0}ms`
  );
}

main().catch((e) => {
  console.error("bridge-v2 fatal:", e.message);
  process.exit(1);
});
