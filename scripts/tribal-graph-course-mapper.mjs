#!/usr/bin/env node
// tribal-graph-course-mapper.mjs
// I/O orchestrator: reads MIT OCW course metadata + emits TribalCourseNodes
// into state/shared/system-viz/system-graph.json (atomic merge, peer-safe).
//
// Usage:
//   node scripts/tribal-graph-course-mapper.mjs                  # full pipeline
//   node scripts/tribal-graph-course-mapper.mjs --dry-run        # show what would emit
//   node scripts/tribal-graph-course-mapper.mjs --out <path>     # custom output (default system-graph.json)
//   node scripts/tribal-graph-course-mapper.mjs --nodes-only     # also write course-tribal-nodes.json sidecar
//   node scripts/tribal-graph-course-mapper.mjs --no-graph-merge # write sidecar only, skip graph merge
//
// Composes with: tribal-graph-clusters.mjs (classify) + course-mapper-lib.mjs (transforms).
// Pure helpers live in scripts/lib/course-mapper-lib.mjs — this file is fs/glue only.

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { argv } from "node:process";
import {
  nodesFromCatalog,
  nodesFromIndex,
  mergeCourseNodes,
  mergeIntoGraph,
  buildPrismMappingByCourseId,
  lookupProductsForCourse,
  edgesFromCourseNode,
} from "./lib/course-mapper-lib.mjs";

// ──────────────────────────────────────────────────────────────────────────
// Constants (canonical paths and behavior knobs)
// ──────────────────────────────────────────────────────────────────────────

const PRISM_COURSE_CATALOG_PATH = "H:/prism/resources/MIT COURSES/PRISM_COURSE_CATALOG.json";
const MIT_COURSE_INDEX_PATH     = "H:/prism/resources/MIT COURSES/MIT_COURSE_INDEX.json";
const SYSTEM_GRAPH_PATH         = "H:/prism/state/shared/system-viz/system-graph.json";
const NODES_SIDECAR_PATH        = "H:/prism/state/shared/tribal-graph/course-tribal-nodes.json";
const TMP_SUFFIX                = ".tmp-";

// ──────────────────────────────────────────────────────────────────────────
// Arg parsing
// ──────────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {
    dryRun: false,
    out: SYSTEM_GRAPH_PATH,
    nodesOnly: false,
    noGraphMerge: false,
    catalog: PRISM_COURSE_CATALOG_PATH,
    index: MIT_COURSE_INDEX_PATH,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--nodes-only") args.nodesOnly = true;
    else if (a === "--no-graph-merge") args.noGraphMerge = true;
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--catalog") args.catalog = argv[++i];
    else if (a === "--index") args.index = argv[++i];
  }
  return args;
}

// ──────────────────────────────────────────────────────────────────────────
// JSON I/O helpers (atomic write, tolerant read)
// ──────────────────────────────────────────────────────────────────────────

function readJsonOrNull(path) {
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch { return null; }
}

function writeJsonAtomic(path, obj) {
  const dir = dirname(path);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = path + TMP_SUFFIX + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, jsonReplacer, 2));
  try { renameSync(tmp, path); }
  catch (e) {
    try { unlinkSync(tmp); } catch { /* best-effort */ }
    throw e;
  }
}

// Set values become arrays in JSON output (sorted for determinism)
function jsonReplacer(_key, value) {
  if (value instanceof Set) return [...value].sort();
  return value;
}

// ──────────────────────────────────────────────────────────────────────────
// Main pipeline
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(argv);
  const log = (...m) => console.log("[course-mapper]", ...m);

  log(`reading catalog: ${args.catalog}`);
  const catalog = readJsonOrNull(args.catalog);
  log(`reading index:   ${args.index}`);
  const index = readJsonOrNull(args.index);

  if (!catalog && !index) {
    console.error("[course-mapper] ERROR: neither catalog nor index loadable; nothing to map.");
    process.exit(2);
  }

  const fromCatalog = catalog ? nodesFromCatalog(catalog) : [];
  const fromIndex   = index   ? nodesFromIndex(index)     : [];
  log(`catalog nodes: ${fromCatalog.length}`);
  log(`index   nodes: ${fromIndex.length}`);
  let merged = mergeCourseNodes(fromCatalog, fromIndex);
  log(`merged unique nodes: ${merged.length}`);

  // Backfill prismMapping for catalog-only nodes by joining the inverted
  // index lookup (prismMapping lives in MIT_COURSE_INDEX, not the catalog).
  const productsByCourseId = buildPrismMappingByCourseId(index?.prismMapping);
  if (productsByCourseId.size > 0) {
    let enriched = 0;
    merged = merged.map(n => {
      if (Array.isArray(n.prismMapping) && n.prismMapping.length > 0) return n;
      const products = lookupProductsForCourse(productsByCourseId, n.courseId || n.id);
      if (products.length === 0) return n;
      enriched++;
      return { ...n, prismMapping: products };
    });
    log(`prismMapping enriched: ${enriched} nodes`);
  }
  const totalEdges = merged.reduce((s, n) => s + edgesFromCourseNode(n).length, 0);
  log(`projected course→product edges: ${totalEdges}`);

  // Always write the sidecar (pipeline-consumer entry point for prism_knowledge)
  if (!args.dryRun) {
    writeJsonAtomic(NODES_SIDECAR_PATH, {
      schemaVersion: "1.0.0",
      generatedAt: new Date().toISOString(),
      count: merged.length,
      source: "MIT_COURSE_CATALOG + MIT_COURSE_INDEX",
      nodes: merged,
    });
    log(`sidecar written: ${NODES_SIDECAR_PATH}`);
  } else {
    log(`[dry-run] would write sidecar with ${merged.length} nodes`);
  }

  if (args.nodesOnly || args.noGraphMerge) {
    log("graph merge skipped (--nodes-only / --no-graph-merge)");
    return;
  }

  // System-viz graph merge — direct write per user spec, with safety
  log(`reading system-graph: ${args.out}`);
  const graph = readJsonOrNull(args.out);
  if (!graph || !Array.isArray(graph.nodes)) {
    console.error(`[course-mapper] WARN: ${args.out} missing or malformed; skipping graph merge (sidecar still emitted).`);
    return;
  }

  const before = { nodes: graph.nodes.length, edges: (graph.edges || []).length };
  const { graph: mergedGraph, stats } = mergeIntoGraph(graph, merged);

  log(`graph merge stats: added=${stats.added} replaced=${stats.replaced} edges+=${stats.edgesAdded} totalNodes=${stats.totalNodes} totalEdges=${stats.totalEdges}`);

  if (args.dryRun) {
    log(`[dry-run] would write merged graph to ${args.out} (was ${before.nodes} nodes / ${before.edges} edges)`);
    return;
  }

  writeJsonAtomic(args.out, mergedGraph);
  log(`system-graph written: ${args.out}`);
}

main().catch((e) => {
  console.error("[course-mapper] FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});
