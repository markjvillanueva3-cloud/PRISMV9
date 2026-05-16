#!/usr/bin/env node
/**
 * regen-graph-normalized.mjs — NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE consumer
 *
 * Reads state/shared/system-viz/system-graph.json, applies:
 *   1. engine-node-extractor (emit per-engine L5 nodes — closes recursive gap)
 *   2. edge-typology-normalizer (49 raw → 7 core ontology, rawType preserved)
 *
 * Writes state/shared/system-viz/system-graph-normalized.json (SISTER artifact;
 * does NOT overwrite system-graph.json). Atomic temp+rename.
 *
 * Usage:
 *   node scripts/regen-graph-normalized.mjs              # default paths
 *   node scripts/regen-graph-normalized.mjs --dry-run    # don't write, just report
 *   node scripts/regen-graph-normalized.mjs --json       # machine-readable summary
 *   node scripts/regen-graph-normalized.mjs --input <path> --output <path>
 *
 * @milestone NN-GRAPH-MS0
 * @unit U-NNG-EDGE-NORMALIZE
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeGraph, coreTypeCounts, EDGE_TYPE_MAP_VERSION } from "./lib/edge-typology-normalizer.mjs";
import { extractEngineNodes, mergeIntoGraph } from "./lib/engine-node-extractor.mjs";
import { bucketCounts, NODE_KIND_MAP_VERSION } from "./lib/node-kind-ontology.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");

const DEFAULT_INPUT = path.join(REPO_ROOT, "state/shared/system-viz/system-graph.json");
const DEFAULT_OUTPUT = path.join(REPO_ROOT, "state/shared/system-viz/system-graph-normalized.json");
const ENGINES_DIR = path.join(REPO_ROOT, "mcp-server/src/engines");

function parseArgs(argv) {
  const args = { dryRun: false, json: false, input: DEFAULT_INPUT, output: DEFAULT_OUTPUT };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--json") args.json = true;
    else if (a === "--input") args.input = argv[++i];
    else if (a === "--output") args.output = argv[++i];
    else if (a === "--help" || a === "-h") {
      process.stdout.write(`usage: regen-graph-normalized [--dry-run] [--json] [--input <path>] [--output <path>]\n`);
      process.exit(0);
    }
  }
  return args;
}

function atomicWriteJson(filePath, obj) {
  const tmp = `${filePath}.${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 0));
  fs.renameSync(tmp, filePath);
}

async function main() {
  const args = parseArgs(process.argv);
  const startMs = Date.now();

  // Read input
  if (!fs.existsSync(args.input)) {
    process.stderr.write(`input graph missing: ${args.input}\n`);
    process.exit(1);
  }
  let graph;
  try {
    const raw = fs.readFileSync(args.input, "utf8");
    graph = JSON.parse(raw);
  } catch (e) {
    process.stderr.write(`failed to parse input graph: ${e.message}\n`);
    process.exit(1);
  }
  const inputNodes = graph.nodes?.length ?? 0;
  const inputEdges = graph.edges?.length ?? 0;

  // Step 1: extract per-engine nodes from src/engines/*.ts
  const extraction = extractEngineNodes(ENGINES_DIR, { repoRoot: REPO_ROOT, layer: "L5" });

  // Step 2: merge into graph (idempotent)
  const merged = mergeIntoGraph(graph, extraction);
  const afterMergeNodes = merged.nodes.length;
  const afterMergeEdges = merged.edges.length;

  // Step 3: normalize edge typology
  const normalized = normalizeGraph(merged);

  // Stats
  const coreCounts = coreTypeCounts(normalized);
  const kindCounts = bucketCounts(normalized);

  // Update meta with versions + provenance
  normalized.meta = {
    ...(normalized.meta ?? {}),
    edgeTypologyVersion: EDGE_TYPE_MAP_VERSION,
    nodeKindMapVersion: NODE_KIND_MAP_VERSION,
    normalizedAt: new Date().toISOString(),
    normalizedBy: "regen-graph-normalized.mjs",
    sourceGraph: path.relative(REPO_ROOT, args.input).replace(/\\/g, "/"),
    enginesMerged: extraction.stats.emitted,
    engineImportEdgesMerged: extraction.edges.length,
  };

  const elapsedMs = Date.now() - startMs;
  const summary = {
    ok: true,
    input: args.input,
    output: args.output,
    dryRun: args.dryRun,
    elapsedMs,
    inputNodes,
    inputEdges,
    enginesExtracted: extraction.stats,
    afterMergeNodes,
    afterMergeEdges,
    finalNodes: normalized.nodes.length,
    finalEdges: normalized.edges.length,
    coreEdgeTypeCounts: coreCounts,
    nodeKindBucketCounts: kindCounts,
    edgeTypologyVersion: EDGE_TYPE_MAP_VERSION,
    nodeKindMapVersion: NODE_KIND_MAP_VERSION,
  };

  if (!args.dryRun) {
    try { atomicWriteJson(args.output, normalized); summary.wrote = args.output; }
    catch (e) {
      summary.ok = false;
      summary.error = `write failed: ${e.message}`;
      if (args.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); process.exit(1); }
      process.stderr.write(`write failed: ${e.message}\n`); process.exit(1);
    }
  }

  if (args.json) { process.stdout.write(JSON.stringify(summary, null, 2) + "\n"); return; }

  // Human-readable summary
  process.stdout.write(`regen-graph-normalized: ${args.dryRun ? "DRY-RUN" : "wrote " + args.output}\n`);
  process.stdout.write(`  input:  ${inputNodes} nodes / ${inputEdges} edges  (${args.input})\n`);
  process.stdout.write(`  engines extracted: ${extraction.stats.emitted} of ${extraction.stats.scanned} scanned (${extraction.stats.skipped} skipped, ${extraction.stats.noClass} no-class)\n`);
  process.stdout.write(`  engine_import edges added: ${extraction.edges.length}\n`);
  process.stdout.write(`  after merge:  ${afterMergeNodes} nodes / ${afterMergeEdges} edges  (Δ ${afterMergeNodes - inputNodes}/${afterMergeEdges - inputEdges})\n`);
  process.stdout.write(`  normalized:   ${normalized.nodes.length} nodes / ${normalized.edges.length} edges  (ontology v${EDGE_TYPE_MAP_VERSION})\n`);
  process.stdout.write(`  core edge types:\n`);
  for (const [type, n] of Object.entries(coreCounts).sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`    ${type.padEnd(12)} ${n.toLocaleString()}\n`);
  }
  process.stdout.write(`  node kind buckets:\n`);
  for (const [bucket, n] of Object.entries(kindCounts).sort((a, b) => b[1] - a[1])) {
    process.stdout.write(`    ${bucket.padEnd(14)} ${n.toLocaleString()}\n`);
  }
  process.stdout.write(`  elapsed: ${elapsedMs}ms\n`);
}

main().catch((e) => {
  process.stderr.write(`fatal: ${e.stack || e.message}\n`);
  process.exit(1);
});
