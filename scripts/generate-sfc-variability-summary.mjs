#!/usr/bin/env node
// scripts/generate-sfc-variability-summary.mjs
// VIZ-SFC-VARIABILITY-BOUNDED-FOLD (2026-06-24, slot:sierra)
// ---------------------------------------------------------------------------
// The full sfc-variability augmentation (state/shared/system-viz/augmentations/
// sfc-variability.json) is ~45MB / 50,009 nodes: 8 ghost roosts (L8) + 1
// sfc-machine-type (L9) + 50,000 raw `sfc-cell` matrix cells (L10) + 100,007
// edges. It was DELIBERATELY never wired into the merged graph: folding 50K
// cell nodes would ~double the 834MB fleet-critical search graph and is the
// documented merge-OOM / V8 string-cap class. So the SFC-variability surface
// has been INVISIBLE in /system-viz + master-index.
//
// This generator produces a BOUNDED summary augmentation that keeps only the
// STRUCTURAL nodes (the 8 ghost roosts + the machine-type) + the edges among
// them, DROPS the 50K raw cells (annotating the roost with the aggregated cell
// count so the drop is explicit, never silent -- R12), and emits the standard
// {newNodes,newEdges,generatedAt,stats} roost shape that merge-augmentations'
// foldRoostAug() already knows how to fold. Net graph cost: ~9 nodes, not 50K.
//
// Pipeline: reads the existing augmentations/sfc-variability.json (produced
// out-of-band by generate-sfc-variability-features.mjs; refresh that to refresh
// this) and condenses it. Wired into regen-viz FAST[] + merge-augmentations
// loadOptional("sfc-variability-summary-augmentation.json") + foldRoostAug
// (both-or-neither dual-registration).
//
// Heap: reads a 45MB file -> ~150MB parsed. Run via regen-viz FAST[] (24GB
// NODE_ARGS) or `command node` (system default). NOT the 384MB fleet
// portable-node. Never pass --max-old-space-size on Windows (commit reservation).
//
// Run: node scripts/generate-sfc-variability-summary.mjs [--cell-cap N] [--json]

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve as pathResolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = pathResolve(HERE, "..");
const SOURCE = join(REPO_ROOT, "state/shared/system-viz/augmentations/sfc-variability.json");
const OUT = join(REPO_ROOT, "state/shared/system-viz/sfc-variability-summary-augmentation.json");
const PRIMARY_ROOST_ID = "ghost.sfc-machine-types";

// --------------------------------------------------------------------------
// PURE FUNCTIONS (exported, unit-tested)
// --------------------------------------------------------------------------

/** A raw variability matrix cell (the 50K bulk that must NOT enter the graph). */
export function isCell(node) {
  return !!node && node.kind === "sfc-cell";
}

/** Endpoint accessor tolerant of {from,to} or {source,target}. */
function edgeFrom(e) { return e?.from ?? e?.source; }
function edgeTo(e)   { return e?.to ?? e?.target; }

/**
 * Bounded summary of a sfc-variability augmentation. Keeps every NON-cell node
 * (the structural roosts + machine-type) plus up to `cellCap` sample cells;
 * drops the rest. Keeps only edges whose BOTH endpoints survive (no danglers).
 * Annotates the primary roost with the total aggregated cell count so the drop
 * is explicit. Returns the standard {newNodes,newEdges,generatedAt,stats} shape.
 */
export function boundedSummary(aug, { cellCap = 0 } = {}) {
  const nodes = Array.isArray(aug?.nodes) ? aug.nodes : [];
  const edges = Array.isArray(aug?.edges) ? aug.edges : [];

  const structural = nodes.filter(n => n && !isCell(n));
  const cells = nodes.filter(isCell);
  const sampledCells = cellCap > 0 ? cells.slice(0, cellCap) : [];
  const totalCells = cells.length;

  // annotate the primary roost (clone, never mutate the input)
  const newNodes = [...structural, ...sampledCells].map(n => {
    if (n.id !== PRIMARY_ROOST_ID) return n;
    return { ...n, metadata: { ...(n.metadata || {}), cellsAggregated: totalCells, cellsSampledIntoGraph: sampledCells.length } };
  });

  const keptIds = new Set(newNodes.map(n => n.id));
  const newEdges = edges.filter(e => keptIds.has(edgeFrom(e)) && keptIds.has(edgeTo(e)));

  return {
    schemaVersion: "sfc-variability-summary-1.0.0",
    generatedAt: aug?.generatedAt ?? null,
    source: "sfc-variability.json",
    newNodes,
    newEdges,
    stats: {
      sourceNodes: nodes.length,
      sourceEdges: edges.length,
      keptNodes: newNodes.length,
      droppedCells: totalCells - sampledCells.length,
      keptEdges: newEdges.length,
      droppedEdges: edges.length - newEdges.length,
    },
  };
}

/** Empty (no-op) summary -- written when the source is missing so the fold is a clean no-op. */
export function emptySummary(reason) {
  return {
    schemaVersion: "sfc-variability-summary-1.0.0",
    generatedAt: null,
    source: "sfc-variability.json",
    newNodes: [],
    newEdges: [],
    stats: { sourceMissing: true, reason },
  };
}

// --------------------------------------------------------------------------
// IMPURE SHELL
// --------------------------------------------------------------------------

function parseArgs(argv) {
  const a = { cellCap: 0, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--cell-cap") a.cellCap = Math.max(0, parseInt(argv[++i], 10) || 0);
    else if (argv[i] === "--json") a.json = true;
  }
  return a;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  let out;
  if (!existsSync(SOURCE)) {
    out = emptySummary("source-not-found");
    console.error(`[sfc-variability-summary] source missing: ${SOURCE} -- emitting empty no-op summary`);
  } else {
    let aug;
    try { aug = JSON.parse(readFileSync(SOURCE, "utf8")); }
    catch (e) { out = emptySummary(`source-parse-failed: ${e.message}`); console.error(`[sfc-variability-summary] parse failed: ${e.message}`); }
    if (aug) out = boundedSummary(aug, { cellCap: opts.cellCap });
  }
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, JSON.stringify(out), "utf8"); // compact (NEVER pretty-print large graph JSON)
  const s = out.stats || {};
  if (opts.json) console.log(JSON.stringify(out.stats, null, 2));
  else console.log(`✓ sfc-variability-summary: kept ${s.keptNodes ?? 0} nodes / ${s.keptEdges ?? 0} edges, dropped ${s.droppedCells ?? 0} cells -> ${OUT}`);
  return 0;
}

const invokedDirect = process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("generate-sfc-variability-summary.mjs");
if (invokedDirect) {
  try { process.exit(main()); }
  catch (e) { console.error("generate-sfc-variability-summary crashed:", e.message); process.exit(1); }
}
