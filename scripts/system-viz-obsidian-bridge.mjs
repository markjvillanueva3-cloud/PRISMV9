#!/usr/bin/env node
// system-viz-obsidian-bridge.mjs
// Augments the PRISM system-viz graph with Obsidian/wiki/memory linkage.
// Pure Node ESM. No external deps. Defensive against missing files.

import { readFile, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const ROOT = "H:/prism";
const GRAPH_PATH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const OUT_PATH = path.join(ROOT, "state/shared/system-viz/obsidian-augmentation.json");
const WIKI_DIR = path.join(ROOT, "knowledge/wiki");
const MEM_DIR = path.join(ROOT, "knowledge/memories");

const MAX_MATCHES_PER_NODE = 25;
const STOPWORDS = new Set([
  "the","and","for","with","from","into","this","that","engine","dispatcher",
  "registry","action","node","label","info","wiki","memory","prism","core","data"
]);

// ---------- helpers ----------

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function tokenize(s) {
  return norm(s).split(/\s+/).filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

async function safeReaddirRecursive(dir) {
  // Returns absolute paths of all *.md files. Silent on missing.
  if (!existsSync(dir)) return [];
  const out = [];
  async function walk(d) {
    let entries;
    try { entries = await readdir(d, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else if (e.isFile() && e.name.toLowerCase().endsWith(".md")) out.push(full);
    }
  }
  await walk(dir);
  return out;
}

async function safeRead(p) {
  try { return await readFile(p, "utf8"); }
  catch { return ""; }
}

async function safeStat(p) {
  try { return await stat(p); } catch { return null; }
}

function parseFrontmatterTags(content) {
  // Minimal YAML frontmatter parse for `tags:` (inline list or block list).
  const m = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!m) return [];
  const body = m[1];
  // tags: [a, b, c]
  const inline = body.match(/^tags\s*:\s*\[([^\]]*)\]/m);
  if (inline) {
    return inline[1].split(",").map((t) => t.trim().replace(/['"]/g, "")).filter(Boolean);
  }
  // tags:\n  - a\n  - b
  const block = body.match(/^tags\s*:\s*\n((?:\s+-\s+.+\n?)+)/m);
  if (block) {
    return block[1].split("\n").map((l) => l.replace(/^\s*-\s*/, "").trim().replace(/['"]/g, "")).filter(Boolean);
  }
  return [];
}

function parseTitle(content, fallback) {
  const fm = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (fm) {
    const t = fm[1].match(/^title\s*:\s*['"]?(.+?)['"]?\s*$/m);
    if (t) return t[1].trim();
  }
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1) return h1[1].trim();
  return fallback;
}

function deriveSearchKeywords(node) {
  // Pull tokens from id (after the dotted prefix) + label.
  const idParts = String(node.id || "").split(".");
  const tail = idParts.slice(1).join(" ");
  const labelTokens = tokenize(node.label || "");
  const tailTokens = tokenize(tail);
  // Special expansions for known prefixes.
  const expansions = [];
  const prefix = idParts[0];
  if (prefix === "disp") {
    // disp.calcdispatcher → also try without "dispatcher" suffix
    const stripped = (idParts[1] || "").replace(/dispatcher$/, "");
    if (stripped.length >= 3) expansions.push(stripped);
  } else if (prefix === "eng") {
    // engine names already short; tail is usually descriptive
  } else if (prefix === "reg") {
    const stripped = (idParts[1] || "").replace(/registry$/, "");
    if (stripped.length >= 3) expansions.push(stripped);
  }
  const merged = new Set([...labelTokens, ...tailTokens, ...expansions]);
  return [...merged].filter((t) => t.length >= 3);
}

function nodeWikiSubdir(node) {
  // wiki.architecture → "architecture", wiki.concepts → "concepts", etc.
  if (String(node.id || "").startsWith("wiki.")) {
    return node.id.split(".")[1] || null;
  }
  return null;
}

// ---------- main ----------

async function main() {
  const graphRaw = await safeRead(GRAPH_PATH);
  if (!graphRaw) {
    console.error(`graph not found at ${GRAPH_PATH}`);
    process.exit(1);
  }
  let graph;
  try { graph = JSON.parse(graphRaw); }
  catch (e) {
    console.error(`graph parse failed: ${e.message}`);
    process.exit(1);
  }
  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];

  // Scan wiki + memories ONCE.
  const wikiFiles = await safeReaddirRecursive(WIKI_DIR);
  const memFiles = await safeReaddirRecursive(MEM_DIR);

  // Pre-load: title, tags, lower-content, size, subdir for each wiki file.
  const wikiIndex = [];
  for (const f of wikiFiles) {
    const content = await safeRead(f);
    if (!content) continue;
    const rel = path.relative(WIKI_DIR, f).replace(/\\/g, "/");
    const subdir = rel.split("/")[0] || "";
    const title = parseTitle(content, path.basename(f, ".md"));
    const tags = parseFrontmatterTags(content);
    const st = await safeStat(f);
    wikiIndex.push({
      path: f.replace(/\\/g, "/"),
      rel,
      subdir,
      title,
      tags,
      lc: content.toLowerCase(),
      size: st ? st.size : 0,
    });
  }

  const memIndex = [];
  for (const f of memFiles) {
    const content = await safeRead(f);
    const rel = path.relative(MEM_DIR, f).replace(/\\/g, "/");
    const type = rel.split("/")[0] || "uncategorized";
    const name = path.basename(f, ".md");
    const st = await safeStat(f);
    memIndex.push({
      path: f.replace(/\\/g, "/"),
      rel,
      name,
      type,
      lc: (content || "").toLowerCase(),
      nameLc: name.toLowerCase(),
      size: st ? st.size : 0,
    });
  }

  // Pre-build a flat backlink scan: count `[[X]]` occurrences across all wiki+mem.
  // Aggregate counts per lowercased target token.
  const backlinkCounts = new Map();
  const backlinkRe = /\[\[([^\]\n|]+?)(?:\|[^\]\n]+)?\]\]/g;
  for (const w of wikiIndex) {
    let m;
    while ((m = backlinkRe.exec(w.lc)) !== null) {
      const target = norm(m[1]);
      if (!target) continue;
      backlinkCounts.set(target, (backlinkCounts.get(target) || 0) + 1);
    }
  }
  for (const mEntry of memIndex) {
    let m;
    while ((m = backlinkRe.exec(mEntry.lc)) !== null) {
      const target = norm(m[1]);
      if (!target) continue;
      backlinkCounts.set(target, (backlinkCounts.get(target) || 0) + 1);
    }
  }

  // Build augmentations.
  const augmentations = {};
  let totalWiki = 0;
  let totalMem = 0;

  for (const node of nodes) {
    const id = node.id;
    if (!id) continue;

    const keywords = deriveSearchKeywords(node);
    const subdirMatch = nodeWikiSubdir(node);
    const wikiHits = [];
    const memHits = [];
    let bytes = 0;
    let backlinks = 0;

    // Direct subdir match for wiki.* nodes.
    if (subdirMatch) {
      for (const w of wikiIndex) {
        if (w.subdir.toLowerCase() === subdirMatch.toLowerCase()) {
          wikiHits.push({ title: w.title, path: w.path, tags: w.tags });
          bytes += w.size;
          if (wikiHits.length >= MAX_MATCHES_PER_NODE) break;
        }
      }
    }

    // Keyword-based wiki matching (title, tags, filename).
    if (keywords.length && wikiHits.length < MAX_MATCHES_PER_NODE) {
      const seen = new Set(wikiHits.map((h) => h.path));
      for (const w of wikiIndex) {
        if (seen.has(w.path)) continue;
        const titleLc = w.title.toLowerCase();
        const fileLc = path.basename(w.path, ".md").toLowerCase();
        const tagLc = w.tags.map((t) => t.toLowerCase());
        const hit = keywords.some(
          (k) => titleLc.includes(k) || fileLc.includes(k) || tagLc.some((t) => t.includes(k))
        );
        if (hit) {
          wikiHits.push({ title: w.title, path: w.path, tags: w.tags });
          bytes += w.size;
          seen.add(w.path);
          if (wikiHits.length >= MAX_MATCHES_PER_NODE) break;
        }
      }
    }

    // Memory matching by filename or body keyword.
    if (keywords.length) {
      const seen = new Set();
      for (const mEntry of memIndex) {
        if (seen.has(mEntry.path)) continue;
        const hit = keywords.some(
          (k) => mEntry.nameLc.includes(k) || mEntry.lc.includes(`[[${k}`) || mEntry.lc.includes(k)
        );
        if (hit) {
          // Prefer name-match scoring: only include body-match if name didn't already produce 25.
          memHits.push({ name: mEntry.name, type: mEntry.type, path: mEntry.path });
          bytes += mEntry.size;
          seen.add(mEntry.path);
          if (memHits.length >= MAX_MATCHES_PER_NODE) break;
        }
      }
    }

    // Backlink count: sum of counts for any keyword and the label.
    const targetCandidates = new Set([norm(node.label || ""), ...keywords]);
    for (const t of targetCandidates) {
      if (!t) continue;
      // Exact target
      backlinks += backlinkCounts.get(t) || 0;
      // Substring scan (linear over backlink keys, bounded by ~few hundred)
      for (const [k, v] of backlinkCounts) {
        if (k !== t && k.includes(t)) backlinks += v;
      }
    }

    if (wikiHits.length === 0 && memHits.length === 0 && backlinks === 0) continue;

    augmentations[id] = {
      wikiEntries: wikiHits,
      memoryEntries: memHits,
      backlinks,
      totalKnowledgeBytes: bytes,
    };
    totalWiki += wikiHits.length;
    totalMem += memHits.length;
  }

  const out = {
    generatedAt: new Date().toISOString(),
    augmentations,
  };

  await writeFile(OUT_PATH, JSON.stringify(out, null, 2), "utf8");

  const augmentedCount = Object.keys(augmentations).length;
  console.log(`augmented ${augmentedCount} nodes with ${totalWiki} wiki refs + ${totalMem} memory refs`);
}

main().catch((e) => {
  console.error(`fatal: ${e.message}`);
  process.exit(1);
});
