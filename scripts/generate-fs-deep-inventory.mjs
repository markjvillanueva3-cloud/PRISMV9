#!/usr/bin/env node
/**
 * generate-fs-deep-inventory.mjs — extend L9 to expose every directory in
 * H:/ down to depth 3, with file metadata embedded so the viz can show
 * "every file is visible" without exploding the node count.
 *
 * Source: state/shared/system-viz/h-drive-dir-index.json (54,855 dirs already
 * walked by an earlier scan — no fresh fs traversal needed).
 *
 * Strategy:
 *   - Depth 1-2 are already in the graph (L9/prism + L9/h_root + their _2
 *     children from generate-fs-inventory.mjs).
 *   - Depth 3 dirs get one node each, with `parent` linking to the existing
 *     L9 node when one exists, else to a synthetic "deep_subtree" rollup.
 *   - File listings ride as `node.files[]` (capped at TOP_FILES_PER_NODE);
 *     full census lives in h-drive-files.jsonl for lazy-load.
 *   - Empty dirs and noise dirs (.git/node_modules/dist) are filtered.
 *
 * Output: state/shared/system-viz/fs-deep-inventory-augmentation.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DIR_INDEX = path.join(VIZ_DIR, "h-drive-dir-index.json");
const GRAPH = path.join(VIZ_DIR, "system-graph.json");

const MIN_DEPTH = 3;
const MAX_DEPTH = 10;      // depth 3-10 covers 51,901 dirs of 54,855 total
const TOP_FILES_PER_NODE = 50;
const MIN_FILE_COUNT = 1;
// Beyond this depth, ONLY emit if a real (non-synthetic) parent already
// exists. Archive/orphan subtrees skip the synthetic-parent fallback to
// keep graph size sane.
const STRICT_PARENT_FROM_DEPTH = 7;
const SKIP_NAMES = new Set(["node_modules", ".git", "dist", "build", ".next", ".cache",
                             "$RECYCLE.BIN", "System Volume Information", ".pnpm",
                             ".turbo", ".venv", ".venv2"]);

function pathSegments(p) {
  return p.replace(/\\/g, "/").split("/").filter(Boolean);
}

// Aggressive slug — alnum only, used by my own generators (fs.X.Y depth-2 nodes).
function slugify(s) {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}

// Lenient slug — preserves dashes/dots/parens/$/% so we can match the
// graph's original L9 IDs (e.g. "fs.mcp-server", "fs.h.claude_(cuserswompuappdata)").
function lenientSlug(s) {
  return s.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9._\-()$%]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "");
}


// Map a depth-3 dir path to its expected parent node id from the existing
// L9 graph. Examples:
//   H:/prism/mcp-server/src   → parent fs.mcp-server (depth-2 sibling)
//   H:/Tools/python/Lib       → parent fs.h.python (depth-2 child of fs.h.tools)
function deriveParentId(dirPath, existingIds) {
  const segs = pathSegments(dirPath);
  // segs example for depth 3: ["H:","prism","mcp-server","src"]
  if (segs.length < 3) return null;

  const drive = segs[0]; // "H:"
  const top = segs[1];   // "prism" or "Tools" etc

  // Case A: H:/prism/<dir>/<sub>
  // depth-2 child id pattern: "fs.<dir>.<sub>" (my generator's underscore slug)
  // depth-1 child id pattern: "fs.<dir>" (original generator's lenient slug — keeps dashes etc)
  if (drive.toLowerCase() === "h:" && top.toLowerCase() === "prism") {
    const dir = segs[2];
    const sub = segs[3];
    for (const dirSlug of [lenientSlug(dir), slugify(dir)]) {
      for (const subSlug of [slugify(sub), lenientSlug(sub)]) {
        const cand = `fs.${dirSlug}.${subSlug}`;
        if (existingIds.has(cand)) return cand;
      }
      const grand = `fs.${dirSlug}`;
      if (existingIds.has(grand)) return grand;
    }
  }
  // Case B: H:/<top>/<dir>/<currentDir>
  if (drive.toLowerCase() === "h:" && top.toLowerCase() !== "prism") {
    const dir = segs[2];
    for (const topSlug of [lenientSlug(top), slugify(top)]) {
      for (const dirSlug of [slugify(dir), lenientSlug(dir)]) {
        const cand = `fs.h.${topSlug}.${dirSlug}`;
        if (existingIds.has(cand)) return cand;
      }
      const grand = `fs.h.${topSlug}`;
      if (existingIds.has(grand)) return grand;
    }
  }
  return null;
}

function nodeIdFromPath(dirPath) {
  // fs.deep.<slug-of-full-path>
  const segs = pathSegments(dirPath).slice(1); // drop drive letter
  return `fs.deep.${segs.map(slugify).filter(Boolean).join("_")}`;
}

function logSize(bytes) {
  if (!bytes) return 0.25;
  const mb = bytes / (1024 * 1024);
  const v = 0.25 + Math.log10(1 + mb) * 0.12;
  return Math.min(0.85, Math.max(0.2, v));
}

function shouldSkip(dirPath) {
  const segs = pathSegments(dirPath);
  return segs.some(s => SKIP_NAMES.has(s));
}

function generate() {
  const idx = JSON.parse(fs.readFileSync(DIR_INDEX, "utf8"));
  const graph = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
  const existingIds = new Set(graph.nodes.map(n => n.id));

  const newNodes = [];
  const newEdges = [];
  const stats = {
    depthRange: [MIN_DEPTH, MAX_DEPTH],
    perDepth: {},
    candidates: 0, emitted: 0, skippedEmpty: 0, skippedNoise: 0, orphaned: 0,
    parentMatchRate: 0,
    syntheticParents: 0,
  };
  const orphanBucketParents = new Set();
  const syntheticParents = new Map(); // synthetic-id -> { top, count }
  const emittedIds = new Set();
  // path -> id map so deeper depths can find their immediate parent's emitted node
  const pathToEmittedId = new Map();

  // Helper: ensure a synthetic L9 parent exists for an orphan top-level.
  // We emit it once and link orphans here so the graph stays connected.
  function ensureSyntheticParent(topName) {
    const synId = `fs.h.${slugify(topName)}_synthetic`;
    if (existingIds.has(synId) || emittedIds.has(synId)) return synId;
    newNodes.push({
      id: synId, layer: "L9", subgroup: "h_root_synthetic",
      label: `H:/${topName}/`, color: "#cbd5e1", status: "built",
      size: 0.6, tier: 0, isSynthetic: true,
      info: `Synthetic parent for ${topName} subtree (not in original L9 walk)`,
    });
    emittedIds.add(synId);
    syntheticParents.set(synId, { top: topName, count: 0 });
    stats.syntheticParents++;
    return synId;
  }

  // Group dirs by depth so we can process shallow→deep, allowing each level to
  // resolve its parent against existing graph IDs OR previously-emitted ones.
  const byDepth = {};
  for (const d of idx.dirs) {
    if (d.depth < MIN_DEPTH || d.depth > MAX_DEPTH) continue;
    (byDepth[d.depth] ??= []).push(d);
  }

  const allDepths = Object.keys(byDepth).map(Number).sort((a, b) => a - b);
  for (const depth of allDepths) stats.perDepth[depth] = { candidates: 0, emitted: 0, skippedEmpty: 0, skippedNoise: 0, parentMatched: 0, orphaned: 0 };

  for (const depth of allDepths) {
    const ds = stats.perDepth[depth];
    for (const d of byDepth[depth]) {
      ds.candidates++;
      stats.candidates++;
      if (shouldSkip(d.path)) { ds.skippedNoise++; stats.skippedNoise++; continue; }
      if ((d.fileCount ?? 0) < MIN_FILE_COUNT) { ds.skippedEmpty++; stats.skippedEmpty++; continue; }

      const id = nodeIdFromPath(d.path);
      if (existingIds.has(id) || emittedIds.has(id)) continue;

      // Parent lookup priority:
      //   1) Direct parent path emitted in this run (depth N's parent at depth N-1)
      //   2) Existing graph node for the parent path (depth-1/2 fs.* nodes)
      //   3) Legacy depth-3 derivation (slug variants)
      let parentId = null;
      if (d.parent) {
        const parentNorm = d.parent.replace(/\\/g, "/").replace(/\/$/, "");
        if (pathToEmittedId.has(parentNorm)) {
          parentId = pathToEmittedId.get(parentNorm);
        } else if (existingIds.has(`fs.deep.${pathSegments(parentNorm).slice(1).map(slugify).filter(Boolean).join("_")}`)) {
          parentId = `fs.deep.${pathSegments(parentNorm).slice(1).map(slugify).filter(Boolean).join("_")}`;
        }
      }
      if (!parentId && depth === 3) parentId = deriveParentId(d.path, existingIds);

      // Strict-parent gate: at deep levels (≥7) the synthetic-parent fallback
      // would mostly catch archive/orphan subtrees and balloon the graph with
      // dead nodes. Drop those candidates rather than emit them.
      if (!parentId && depth >= STRICT_PARENT_FROM_DEPTH) {
        ds.skippedNoParent = (ds.skippedNoParent || 0) + 1;
        stats.skippedNoParent = (stats.skippedNoParent || 0) + 1;
        continue;
      }

    const segs = pathSegments(d.path);
    const label = segs[segs.length - 1] || d.path;

    // Pick top-N files from samples by size
    const samples = (d.samples || []).slice().sort((a, b) => (b.size || 0) - (a.size || 0));
    const topFiles = samples.slice(0, TOP_FILES_PER_NODE).map(f => ({
      name: f.name, size: f.size, ext: f.ext,
    }));

    const node = {
      id,
      layer: "L9",
      subgroup: parentId ? "deep_subtree" : "deep_orphan",
      label,
      color: parentId ? "#94a3b8" : "#cbd5e1",
      status: "built",
      size: logSize(d.totalBytes || 0),
      tier: 2,
      parent: parentId,
      depth: d.depth,
      fullPath: d.path,
      fileCount: d.fileCount,
      totalBytes: d.totalBytes,
      byExt: d.byExt,
      oldestMtime: d.oldestMtime,
      newestMtime: d.newestMtime,
      files: topFiles,
      info: `${d.path} — ${d.fileCount} files, ${(d.totalBytes / (1024 * 1024)).toFixed(1)} MB${topFiles.length < (d.fileCount ?? 0) ? `, top ${topFiles.length}/${d.fileCount} shown` : ""}`,
    };
    newNodes.push(node);
    emittedIds.add(id);
    pathToEmittedId.set(d.path.replace(/\\/g, "/").replace(/\/$/, ""), id);
    if (parentId) {
      newEdges.push({ from: parentId, to: id, type: "contains", status: "active", intensity: 0.35 });
      stats.parentMatchRate++;
      ds.parentMatched++;
    } else {
      // No native parent in graph — create or reuse a synthetic top-level parent
      // and link the orphan there so it's still navigable.
      const top = pathSegments(d.path)[1] || "root";
      const synId = ensureSyntheticParent(top);
      // Patch the just-pushed node to record its synthetic parent.
      node.parent = synId;
      node.subgroup = "deep_orphan";
      newEdges.push({ from: synId, to: id, type: "contains", status: "active", intensity: 0.3 });
      const meta = syntheticParents.get(synId);
      if (meta) meta.count++;
      orphanBucketParents.add(top);
      stats.orphaned++;
      ds.orphaned++;
    }
    stats.emitted++;
    ds.emitted++;
    }
  }

  return {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    sourceIndex: { generatedAt: idx.generatedAt, totalDirs: idx.totals.dirs, totalFiles: idx.totals.files },
    newNodes,
    newEdges,
    stats,
    orphanGroupings: [...orphanBucketParents],
  };
}

const result = generate();
const outPath = path.join(VIZ_DIR, "fs-deep-inventory-augmentation.json");
fs.writeFileSync(outPath, JSON.stringify(result));
const writtenSize = fs.statSync(outPath).size;
console.log(`wrote ${outPath} (${(writtenSize / 1e6).toFixed(1)}MB)`);
console.log(`  depth range: ${result.stats.depthRange.join("-")}`);
console.log(`  total candidates: ${result.stats.candidates}  emitted: ${result.stats.emitted}  skipped(empty): ${result.stats.skippedEmpty}  skipped(noise): ${result.stats.skippedNoise}`);
console.log(`  parent-match overall: ${result.stats.parentMatchRate}/${result.stats.emitted} (${Math.round(result.stats.parentMatchRate / Math.max(1, result.stats.emitted) * 100)}%)`);
console.log(`  orphans: ${result.stats.orphaned}  (${result.orphanGroupings.length} top-level buckets needed)`);
console.log(`  syntheticParents: ${result.stats.syntheticParents}`);
console.log(`  per-depth breakdown:`);
for (const [depth, ds] of Object.entries(result.stats.perDepth)) {
  const pct = ds.emitted > 0 ? Math.round((ds.parentMatched / ds.emitted) * 100) : 0;
  console.log(`    depth=${depth}  candidates=${ds.candidates}  emitted=${ds.emitted}  parent-match=${ds.parentMatched} (${pct}%)  orphans=${ds.orphaned}`);
}
