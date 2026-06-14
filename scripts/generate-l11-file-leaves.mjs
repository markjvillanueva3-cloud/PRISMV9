#!/usr/bin/env node
/**
 * generate-l11-file-leaves.mjs — explode the top-K files already stored on
 * each L9 dir node into actual L11 leaf nodes, so the viz reaches literal
 * "every file is a node" coverage.
 *
 * Source: in-graph data — every L9 fs-deep node carries a `files[]` array
 * (top files by size, capped by TOP_FILES_PER_NODE=10 in the deep generator).
 * No new fs traversal needed.
 *
 * Caps to keep the graph from exceeding browser limits:
 *   - depth 3-6  (active workspace, user's daily working dirs): top 5 files
 *   - depth 7-10 (archives, libraries, vendor trees):           top 2 files
 *
 * Output: state/shared/system-viz/l11-leaves-augmentation.json
 *
 * Each L11 node is a thin payload:
 *   { id, layer:"L11", parent: <L9-id>, label: <filename>,
 *     size: <log-of-bytes>, ext, sizeBytes, color }
 *
 * Edges: L9-dir → L11-file (type=contains, intensity 0.25)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

// Saturation caps — the goal is "every file accounted for". Active-workspace
// dirs get full coverage (50 = the deep-inventory's TOP_FILES_PER_NODE, so
// effectively all their stored leaves emit). Archive territory caps at 15
// per dir to avoid 100k-file vendor blowup.
const CAPS = {
  3: 50, 4: 50, 5: 50, 6: 50,         // active workspace — every stored file
  7: 15, 8: 15, 9: 15, 10: 15,        // archive / library — top-15 sample
};

const EXT_COLORS = {
  ts: "#3b82f6", tsx: "#3b82f6", js: "#fbbf24", mjs: "#fbbf24",
  json: "#a78bfa", md: "#10b981", py: "#0ea5e9",
  html: "#f97316", css: "#ec4899",
  pdf: "#dc2626", png: "#8b5cf6", jpg: "#8b5cf6", jpeg: "#8b5cf6",
  zip: "#64748b", tar: "#64748b", gz: "#64748b",
  exe: "#94a3b8", dll: "#94a3b8", obj: "#94a3b8", lib: "#94a3b8",
};
const DEFAULT_COLOR = "#cbd5e1";

function slugifyName(s) {
  return s.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

function logSize(bytes) {
  if (!bytes) return 0.15;
  const kb = bytes / 1024;
  const v = 0.15 + Math.log10(1 + kb) * 0.08;
  return Math.min(0.6, Math.max(0.12, v));
}

function generate() {
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const newNodes = [];
  const newEdges = [];
  const stats = {
    parentDirs: 0,
    candidates: 0,
    emitted: 0,
    capDropped: 0,
    duplicateIds: 0,
    perDepth: {},
    perExt: {},
  };

  // Track ids per parent to dedup names that collide after slugify
  const seenIds = new Set();

  for (const node of graph.nodes) {
    if (node.layer !== "L9") continue;
    if (!Array.isArray(node.files) || node.files.length === 0) continue;
    const depth = node.depth ?? 0;
    const cap = CAPS[depth];
    if (cap == null) continue; // outside our depth window
    stats.parentDirs++;

    // Files already sorted by size desc by upstream generator
    const filesToEmit = node.files.slice(0, cap);
    const dropped = node.files.length - filesToEmit.length;
    stats.capDropped += Math.max(0, dropped);
    stats.candidates += node.files.length;

    const ds = (stats.perDepth[depth] ??= { parentDirs: 0, emitted: 0, capDropped: 0 });
    ds.parentDirs++;
    ds.capDropped += Math.max(0, dropped);

    let dupCounter = 0;
    for (const f of filesToEmit) {
      const ext = (f.ext || "").toLowerCase().replace(/^\./, "") || "noext";
      const slug = slugifyName(f.name) || `f${dupCounter++}`;
      let id = `${node.id}.f.${slug}`;
      // disambiguate collisions
      let suffix = 1;
      while (seenIds.has(id) || existingIds.has(id)) {
        id = `${node.id}.f.${slug}_${suffix++}`;
        stats.duplicateIds++;
      }
      seenIds.add(id);

      const color = EXT_COLORS[ext] || DEFAULT_COLOR;
      const leaf = {
        id,
        layer: "L11",
        subgroup: `file_${ext}`,
        label: f.name,
        color,
        status: "built",
        size: logSize(f.size || 0),
        tier: 3,
        parent: node.id,
        ext,
        sizeBytes: f.size || 0,
        depth: depth + 1,
      };
      newNodes.push(leaf);
      newEdges.push({ from: node.id, to: id, type: "contains", status: "active", intensity: 0.25 });
      stats.emitted++;
      ds.emitted++;
      stats.perExt[ext] = (stats.perExt[ext] || 0) + 1;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    caps: CAPS,
    newNodes,
    newEdges,
    stats,
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "l11-leaves-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
const writtenSize = fs.statSync(outPath).size;
console.log(`wrote ${outPath} (${(writtenSize / 1e6).toFixed(1)}MB)`);
console.log(`  parentDirs=${result.stats.parentDirs}  candidates=${result.stats.candidates}  emitted=${result.stats.emitted}  capDropped=${result.stats.capDropped}  duplicateIds=${result.stats.duplicateIds}`);
console.log(`  per-depth:`);
for (const [d, ds] of Object.entries(result.stats.perDepth).sort((a, b) => Number(a[0]) - Number(b[0]))) {
  console.log(`    depth=${d}  parentDirs=${ds.parentDirs}  emitted=${ds.emitted}  capDropped=${ds.capDropped}`);
}
console.log(`  top extensions:`);
const exts = Object.entries(result.stats.perExt).sort((a, b) => b[1] - a[1]).slice(0, 12);
for (const [e, c] of exts) console.log(`    .${e}: ${c}`);
