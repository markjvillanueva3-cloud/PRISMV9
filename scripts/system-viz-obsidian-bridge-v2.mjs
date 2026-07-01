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
import { readFile, writeFile, readdir, stat, open } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const ROOT = "H:/prism";
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const OUT_PATH = path.join(ROOT, "state/shared/system-viz/obsidian-augmentation.json");
const WIKI_DIR = path.join(ROOT, "knowledge/wiki");
const MEM_DIR = path.join(ROOT, "knowledge/memories");

/**
 * Stream-write the augmentation object to disk WITHOUT building the full JSON
 * string. The `out` object's `augmentations` key (one entry per augmented node)
 * grew past V8's ~512MB max-string-length ceiling, so even `JSON.stringify(out)`
 * (compact) throws `RangeError: Invalid string length` — the bridge had been
 * silently failing to regenerate node.knowledge since the corpus outgrew the cap
 * (the root cause of the stale obsidian-augmentation.json). We serialize the small
 * meta keys inline and emit the big `augmentations` map one entry at a time, in
 * ~16MB buffer flushes that never approach the string cap. Output is byte-for-byte
 * a valid compact JSON object identical to JSON.stringify(out). (U-VIZ-OBSIDIAN-STREAM,
 * 2026-05-31 sierra — supersedes the compact-only U-VIZ-OBSIDIAN-COMPACT fix.)
 */
export async function writeAugmentationStreaming(filePath, out, openImpl = open, flushBytes = 16 * 1024 * 1024) {
  const { augmentations, ...meta } = out || {};
  const metaJson = JSON.stringify(meta ?? {});
  const handle = await openImpl(filePath, "w");
  try {
    // meta is always a non-empty object here ({schemaVersion,...}); splice the
    // augmentations key in by dropping meta's closing brace. Guard the empty case.
    let buf = metaJson === "{}" ? '{"augmentations":{' : metaJson.slice(0, -1) + ',"augmentations":{';
    let first = true;
    for (const [k, v] of Object.entries(augmentations || {})) {
      buf += (first ? "" : ",") + JSON.stringify(k) + ":" + JSON.stringify(v);
      first = false;
      if (buf.length >= flushBytes) { await handle.write(buf); buf = ""; }
    }
    buf += "}}";
    await handle.write(buf);
  } finally {
    await handle.close();
  }
}

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

// ── SINGLE walk+read pass (Rank-6 efficiency, U-VIZ-OBSIDIAN-IO) ───────────────
// Previously buildWikiIndex / buildMemIndex / countBacklinks each did their OWN
// walkMd + per-file safeRead: the wiki tree was walked 2x and every wiki/mem file
// read 2x (once for the token index, once for the backlink regex). Each builder
// now reads its tree ONCE and returns the non-empty content strings it already
// read, which we thread into countBacklinks(contents) so the backlink regex runs
// over the in-memory content - no re-walk, no re-read. The skip-empty set is
// IDENTICAL to the old code (buildWikiIndex skipped empties, and the old
// countBacklinks `if (!content) continue` skipped the same wiki AND mem empties),
// so the backlink-count contract + each builder's token extraction are byte-exact.
async function buildWikiIndex() {
  const files = await walkMd(WIKI_DIR);
  // Forward index: file → { title, tags, size, lc, rel }
  // Reverse index: token → Set<file>
  const fileMeta = [];
  const tokenToFiles = new Map();
  // Non-empty content strings, in file order — threaded into countBacklinks so it
  // never re-reads (matches the old countBacklinks `if (!content) continue` skip).
  const contents = [];
  for (const f of files) {
    const content = await safeRead(f);
    if (!content) continue;
    contents.push(content);
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
  return { fileMeta, tokenToFiles, contents };
}

async function buildMemIndex() {
  const files = await walkMd(MEM_DIR);
  const fileMeta = [];
  const tokenToFiles = new Map();
  // Non-empty content strings only — countBacklinks skipped empty mem files too,
  // so threading only the non-empty reads keeps the backlink count byte-exact.
  // (buildMemIndex still pushes a fileMeta entry + name tokens for empty-read mem
  // files exactly as before — only the backlink-feed list is non-empty-gated.)
  const contents = [];
  for (const f of files) {
    const content = await safeRead(f);
    if (content) contents.push(content);
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
  return { fileMeta, tokenToFiles, contents };
}

export function countBacklinks(contents) {
  // Backlink count over the ALREADY-READ non-empty wiki+mem content strings —
  // no re-walk, no re-read. Identical [[X]] target extraction + norm() counting as
  // the old re-reading version (order is immaterial: counts are additive). Caller
  // passes [...wikiContents, ...memContents] (wiki-then-mem preserved for parity).
  const counts = new Map();
  const linkRe = /\[\[([^\]\n|]+?)(?:\|[^\]\n]+)?\]\]/g;
  for (const content of contents || []) {
    if (!content) continue;
    let m;
    linkRe.lastIndex = 0;
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
  // Stream-READ — system-graph.json is ~573MB; readFile(...,"utf8")+JSON.parse
  // builds a 573MB string that exceeds V8's ~512MB max-string-length cap
  // (RangeError: Invalid string length). THIS was the real reason the bridge had
  // been failing to regenerate node.knowledge — the graph outgrew the readable-as-
  // string limit, not the write. readGraphStreaming parses from a Buffer without the
  // intermediate giant string. (U-VIZ-OBSIDIAN-STREAM, 2026-05-31 sierra.)
  const graph = readGraphStreaming(GRAPH_PATH);
  const nodes = (graph.nodes || []).filter(nodeIsIncluded);

  const wikiTime = Date.now();
  const wiki = await buildWikiIndex();
  const memTime = Date.now();
  const mem = await buildMemIndex();
  const linkTime = Date.now();
  // Thread the content the two builders ALREADY read (single walk+read pass) into
  // the backlink counter — no second walkMd + safeRead of the same wiki/mem trees.
  const backlinks = countBacklinks([...wiki.contents, ...mem.contents]);
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

  // Stream-write — the augmentation outgrew V8's ~512MB single-string cap, so
  // neither pretty NOR compact JSON.stringify(out) can serialize it (RangeError:
  // Invalid string length). writeAugmentationStreaming emits the same compact JSON
  // in bounded chunks. (U-VIZ-OBSIDIAN-STREAM, 2026-05-31 sierra.)
  await writeAugmentationStreaming(OUT_PATH, out);
  console.log(
    `bridge-v2: scanned ${nodes.length} nodes, augmented ${Object.keys(augmentations).length}, ` +
      `wiki=${totalWiki} memHits=${totalMem} in ${Date.now() - t0}ms`
  );
}

// Guard main() so `import`-ing this module (e.g. the streaming-write test) does
// NOT trigger the full 573MB graph scan. (U-VIZ-OBSIDIAN-STREAM, sierra.)
const isMain = (() => {
  try { return process.argv[1] && path.normalize(process.argv[1]) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) {
  main().catch((e) => {
    console.error("bridge-v2 fatal:", e.message);
    process.exit(1);
  });
}
