#!/usr/bin/env node
/**
 * generate-wiki-entries.mjs — walk knowledge/wiki/**\/*.md and emit each
 * entry as an atomic L8 wiki node so the 192 wiki entries (and growing) are
 * all visible on the system map instead of collapsed under one rollup.
 *
 * Per-file extraction:
 *   - kind  = first path segment under wiki/  (architecture, code-tribal,
 *             concepts, decisions, entities, lessons, patterns, software-eng,
 *             ux-design, trajectories, summaries, consensus)
 *   - title = first '# ' heading, fall back to slugified filename
 *   - frontmatter (if YAML block at top)
 *   - cross-refs = [[internal-link]] occurrences captured for ghost edges
 *
 * Each emitted L8 node:
 *   id     = wiki.<kind>.<slug>
 *   parent = wiki.<kind>           (kind rollup — emitted lazily)
 *   layer  = L8
 *   subgroup = "wiki_entry"
 *   status   = "built"
 *
 * Edges:
 *   - kind rollup -> entry          (contains)
 *   - entry -> referenced node id   (cross_ref) when [[link]] resolves to
 *     an existing graph node id.
 *
 * Output: state/shared/system-viz/wiki-entries-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");
const WIKI_DIR = path.join(ROOT, "knowledge", "wiki");

const KIND_HUE = {
  architecture: "#06b6d4",
  "code-tribal": "#a855f7",
  concepts: "#22c55e",
  decisions: "#fbbf24",
  entities: "#3b82f6",
  lessons: "#ec4899",
  patterns: "#f97316",
  "software-engineering": "#84cc16",
  "ux-design": "#10b981",
  trajectories: "#94a3b8",
  summaries: "#64748b",
  consensus: "#f59e0b",
};

function slugify(s) {
  return s.toLowerCase().replace(/\.md$/, "").replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function walk(dir, base) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(full, base));
    else if (e.isFile() && e.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function extractTitle(text) {
  const h = text.match(/^#\s+(.+?)\s*$/m);
  if (h) return h[1].slice(0, 120);
  return null;
}

function extractCrossRefs(text) {
  const out = [];
  // [[wiki-link]] form
  const re = /\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g;
  let m;
  while ((m = re.exec(text)) !== null) out.push(m[1].trim());
  return [...new Set(out)];
}

function generate() {
  if (!fs.existsSync(GRAPH)) return { error: "graph-missing" };
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const files = walk(WIKI_DIR);
  const newNodes = [];
  const newEdges = [];
  const seenId = new Set();
  const seenEdge = new Set();
  const stats = {
    filesScanned: files.length,
    entriesEmitted: 0,
    kindRollupsCreated: 0,
    crossRefEdges: 0,
    crossRefUnresolved: 0,
    perKind: {},
  };

  function pushEdge(from, to, type, status, intensity) {
    const k = `${from}|${to}|${type}`;
    if (seenEdge.has(k)) return false;
    seenEdge.add(k);
    newEdges.push({ from, to, type, status, intensity });
    return true;
  }

  const kindNeeded = new Set();
  const STAT_BAR = 1024; // <1KB = stub-ish
  for (const abs of files) {
    const rel = path.relative(WIKI_DIR, abs).replace(/\\/g, "/");
    const parts = rel.split("/");
    const kind = parts[0];
    if (kind === "index.md" || kind === "log.md" || kind === "index.jsonl") continue;
    const stem = parts.slice(1).join("/").replace(/\.md$/, "");
    if (!stem) continue;
    const slug = slugify(stem.replace(/\//g, "_"));
    const id = `wiki.${kind}.${slug}`;
    if (existingIds.has(id) || seenId.has(id)) continue;
    seenId.add(id);
    kindNeeded.add(kind);

    let text = "";
    let sizeBytes = 0;
    try {
      sizeBytes = fs.statSync(abs).size;
      text = fs.readFileSync(abs, "utf8").slice(0, 6000);
    } catch { /* noop */ }
    const title = extractTitle(text) ?? stem.split("/").pop().replace(/-/g, " ");
    const refs = extractCrossRefs(text);

    newNodes.push({
      id,
      layer: "L8",
      subgroup: "wiki_entry",
      parent: `wiki.${kind}`,
      label: title,
      kind: "wiki_entry",
      wikiKind: kind,
      file: `knowledge/wiki/${rel}`,
      status: sizeBytes < STAT_BAR ? "stub" : "built",
      color: KIND_HUE[kind] || "#94a3b8",
      size: 0.30 + Math.min(0.30, Math.log10(1 + sizeBytes / 1024) * 0.10),
      tier: 3,
      sizeBytes,
      crossRefs: refs.slice(0, 10),
    });
    stats.entriesEmitted++;
    stats.perKind[kind] = (stats.perKind[kind] || 0) + 1;
  }

  // Emit kind rollup parents (lazy — only for kinds that had entries)
  for (const kind of kindNeeded) {
    const parent = `wiki.${kind}`;
    if (existingIds.has(parent) || seenId.has(parent)) continue;
    seenId.add(parent);
    newNodes.push({
      id: parent,
      layer: "L8",
      subgroup: "wiki_kind",
      label: `wiki/${kind}\n(${stats.perKind[kind]} entries)`,
      color: KIND_HUE[kind] || "#94a3b8",
      status: "built",
      size: 0.55 + Math.sqrt(stats.perKind[kind] || 1) * 0.10,
      tier: 3,
      synthetic: true,
    });
    stats.kindRollupsCreated++;
  }

  // Containment + cross-ref edges
  for (const n of newNodes) {
    if (n.subgroup === "wiki_entry" && n.parent) {
      pushEdge(n.parent, n.id, "contains", "active", 0.20);
    }
    if (n.crossRefs?.length) {
      for (const ref of n.crossRefs) {
        // try a few resolution forms
        const refSlug = slugify(ref);
        const candidates = [
          ref,                                      // exact id match (rare)
          `wiki.architecture.${refSlug}`,
          `wiki.concepts.${refSlug}`,
          `wiki.lessons.${refSlug}`,
          `wiki.patterns.${refSlug}`,
          `wiki.entities.${refSlug}`,
          `wiki.decisions.${refSlug}`,
          `wiki.code-tribal.${refSlug}`,
          `wiki.software-engineering.${refSlug}`,
          `wiki.ux-design.${refSlug}`,
        ];
        let resolved = null;
        for (const cid of candidates) {
          if (existingIds.has(cid) || seenId.has(cid)) { resolved = cid; break; }
        }
        if (resolved) {
          pushEdge(n.id, resolved, "cross_ref", "active", 0.30);
          stats.crossRefEdges++;
        } else {
          stats.crossRefUnresolved++;
        }
      }
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    wikiDir: "knowledge/wiki",
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "wiki-entries-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
console.log(`wrote ${outPath} (${(fs.statSync(outPath).size / 1e6).toFixed(2)}MB)`);
if (result.error) {
  console.log(`  error: ${result.error}`);
} else {
  console.log(`  files scanned:        ${result.stats.filesScanned}`);
  console.log(`  entries emitted:      ${result.stats.entriesEmitted}`);
  console.log(`  kind rollups created: ${result.stats.kindRollupsCreated}`);
  console.log(`  cross-ref edges:      ${result.stats.crossRefEdges}`);
  console.log(`  unresolved refs:      ${result.stats.crossRefUnresolved}`);
  console.log(`  per kind:`);
  for (const [k, n] of Object.entries(result.stats.perKind).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${k.padEnd(22)} ${n}`);
  }
}
