#!/usr/bin/env node
/**
 * wired-engines-to-refpool.mjs -- feed the NN/GNN reference pool from the CODEBASE's
 * confirmed engine -> dispatcher wirings (U-GNN-CODEBASE-WIRED-REFPOOL, slot:india 2026-06-18).
 *
 * THE GAP THIS CLOSES: the reference pool's positive labels came from only two thin
 * slices of ground truth -- the outcome ledger (ghost-wire-outcomes-to-refpool.mjs, ~139
 * unique engines) and vault feedback (vault-to-gnn-refpool.mjs, ~16). But the LIVE CODEBASE
 * already contains hundreds of confirmed engine -> dispatcher wirings: every engine a
 * dispatcher .ts file imports IS wired to that dispatcher. That is the STRONGEST possible
 * ground truth (a literal import, not a validated proposal), and it was untapped by the pool.
 * The pool is the documented deploy-gate / full-coverage blocker (PSN leg #10: selective
 * coverage 27% at the production gate -- "full-coverage lift = reference-pool GROWTH").
 *
 * This is the SIBLING of ghost-wire-outcomes-to-refpool.mjs + vault-to-gnn-refpool.mjs
 * (clone-don't-fork, R15): same node shape, same shared streaming graph-merge, same heap-
 * reexec guard + --revert reversibility -- only the SOURCE differs (the dispatcher-import map
 * vs the outcome ledger / vault). Distinct id namespace `ghost.codebase-wired.<Engine>` so
 * --revert scopes to codebase-sourced ghosts and the seeders never id-collide. The eval's
 * buildHoldout dedups reference members by engine LABEL (first-seen wins), so an engine already
 * present via the outcome/vault feeders is NOT double-counted -- this source purely ADDS the
 * engines those two never covered. (For an OVERLAPPING engine the earlier-applied feeder's entry
 * wins the dedup; immaterial to correctness -- it is the same engine -> same dispatcher, and the
 * confidence field is only the >=0.8 gate qualifier, so 0.85-vs-1.0 does not change selection.)
 *
 * GROUND TRUTH (R12): only engines imported by EXACTLY ONE dispatcher are emitted -- a
 * single-dispatcher import is an unambiguous label. An engine imported by MULTIPLE dispatchers
 * (legitimately wired to several, per the wire-to-all-sources doctrine) is an AMBIGUOUS label
 * for single-label classification, so it is recorded as a conflict and NOT emitted (never
 * average / never fabricate a single label, mirroring the outcome extractor's conflict policy).
 * confidence = CODEBASE_WIRED_CONFIDENCE (1.0): a literal dispatcher import is the strongest
 * ground truth, above every other feeder's confidence and the 0.8 ref gate.
 *
 * Usage:
 *   node scripts/wired-engines-to-refpool.mjs            # dry-run: show extracted labels
 *   node scripts/wired-engines-to-refpool.mjs --json     # machine-readable dry-run
 *   node scripts/wired-engines-to-refpool.mjs --apply    # merge ghosts into system-graph.json
 *   node scripts/wired-engines-to-refpool.mjs --revert   # remove codebase-sourced ghosts only
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { isValidDispatcher } from "./seed-ghost-gnn-classify.mjs";
import { mcpToolToDispNodeId } from "./seed-ghost-from-unwired.mjs";
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
import { hasHeapFlag, nodeArgsWithHeap } from "./vault-to-gnn-refpool.mjs";
import { mergeGhostsIntoGraph, ghostContentEqual } from "./lib/refpool-merge.mjs";
import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");

// A literal dispatcher import is the STRONGEST ground truth (stronger than a validated
// proposal at 0.85) -- 1.0, well above the 0.8 ref gate.
const CODEBASE_WIRED_CONFIDENCE = 1.0;
const PROPOSED_BY = "wired-engines-to-refpool.mjs";

// Significant content fields (volatile proposed_at + constant scaffold excluded). The merge
// is the shared scripts/lib/refpool-merge.mjs (R15 build-once with the two sibling feeders) --
// a re-apply that only re-stamps proposed_at is a no-op (no 542MB write).
const WIRED_CONTENT_FIELDS = ["proposed_wiring", "confidence", "info", "reason", "source", "label", "kind"];
const wiredContentEqual = (a, b) => ghostContentEqual(a, b, WIRED_CONTENT_FIELDS);

/**
 * Extract { engine, dispatcher } ground-truth labels from an engine -> Set<dispatcher>
 * map (buildEngineDispatcherMap). Only engines wired to EXACTLY ONE valid dispatcher are
 * unambiguous labels; multi-dispatcher engines are recorded as conflicts (NOT emitted, R12).
 * Pure -> hermetically testable without disk.
 * @param {Map<string,Set<string>>} engineDispatcherMap
 * @returns {{ wirings: Array<{engine:string,dispatcher:string}>, conflicts: Array<{engine:string,dispatchers:string[]}> }}
 */
export function extractWiredEngines(engineDispatcherMap) {
  const wirings = [];
  const conflicts = [];
  if (!engineDispatcherMap || typeof engineDispatcherMap.entries !== "function") {
    return { wirings, conflicts };
  }
  for (const [engine, nsSet] of engineDispatcherMap.entries()) {
    if (typeof engine !== "string" || !engine.trim()) continue;
    const dispatchers = [...(nsSet || [])].filter((d) => isValidDispatcher(d));
    if (dispatchers.length === 0) continue;            // no valid dispatcher -> not a label
    if (dispatchers.length > 1) {                      // genuinely multi-wired -> ambiguous
      conflicts.push({ engine: engine.trim(), dispatchers: dispatchers.slice().sort() });
      continue;
    }
    wirings.push({ engine: engine.trim(), dispatcher: dispatchers[0] });
  }
  wirings.sort((a, b) => a.engine.localeCompare(b.engine)); // deterministic order
  return { wirings, conflicts };
}

/** Build a ghost.unwired-engine reference node + edge from a codebase wiring (confidence 1.0). */
export function buildGhostFromWiredEngine(w) {
  const node = {
    id: `ghost.codebase-wired.${w.engine}`,
    layer: "L13",
    subgroup: "unwired-engine",
    label: w.engine,
    info: `Codebase-confirmed wiring: ${w.dispatcher} (confidence ${CODEBASE_WIRED_CONFIDENCE.toFixed(2)}, literal dispatcher import, src mcp-server/src/tools/dispatchers)`,
    status: "proposed",
    size: 4,
    tier: 2,
    kind: "ghost.unwired-engine",
    ghost: true,
    proposed_at: new Date().toISOString(),
    proposed_by: PROPOSED_BY,
    proposed_wiring: w.dispatcher,
    confidence: CODEBASE_WIRED_CONFIDENCE,
    reason: "codebase-wired: engine imported by exactly one dispatcher",
    source: "dispatcher-imports",
  };
  const edge = {
    from: node.id,
    to: mcpToolToDispNodeId(w.dispatcher),
    type: "ghost-wire",
    relation: "proposed-wire",
    status: "proposed",
    intensity: CODEBASE_WIRED_CONFIDENCE,
  };
  return { node, edge };
}

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, revert: false, json: false };
  for (const a of argv) {
    if (a === "--apply") out.apply = true;
    else if (a === "--revert") out.revert = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") { console.error("usage: wired-engines-to-refpool [--apply | --revert | --json]"); process.exit(0); }
  }
  if (!out.apply && !out.revert) out.dryRun = true;
  return out;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.revert) {
    const g = readGraphStreaming(GRAPH_PATH);
    const before = g.nodes.length;
    const mineIds = new Set(g.nodes.filter((n) => n?.proposed_by === PROPOSED_BY).map((n) => n.id));
    g.nodes = g.nodes.filter((n) => !mineIds.has(n.id));
    g.edges = g.edges.filter((e) => !mineIds.has(e.from));
    writeGraphStreamingAtomic(GRAPH_PATH, g);
    console.log(`reverted -- removed ${mineIds.size} codebase-wired ghosts; graph now ${g.nodes.length} nodes (was ${before})`);
    return;
  }

  const engineDispatcherMap = buildEngineDispatcherMap(DISPATCHERS_DIR);
  const { wirings, conflicts } = extractWiredEngines(engineDispatcherMap);
  const ghosts = wirings.map(buildGhostFromWiredEngine);
  const byDispatcher = {};
  for (const w of wirings) byDispatcher[w.dispatcher] = (byDispatcher[w.dispatcher] || 0) + 1;

  if (opts.json) {
    console.log(JSON.stringify({ count: wirings.length, confidence: CODEBASE_WIRED_CONFIDENCE, byDispatcher, conflicts: conflicts.length, sample: wirings.slice(0, 5) }, null, 2));
    return;
  }

  console.log(`Extracted ${wirings.length} CODEBASE-WIRED engines (confidence ${CODEBASE_WIRED_CONFIDENCE}, literal dispatcher imports, all >= 0.8 ref gate)`);
  console.log("By dispatcher:", Object.entries(byDispatcher).sort((a, b) => b[1] - a[1]).slice(0, 14));
  if (conflicts.length) {
    console.log(`NOTE ${conflicts.length} multi-dispatcher engine(s) EXCLUDED (ambiguous label, NOT emitted):`);
    for (const c of conflicts.slice(0, 8)) console.log(`  ${c.engine}: wired to ${c.dispatchers.join(" + ")}`);
  }

  if (opts.dryRun) {
    console.log(`DRY-RUN -- would add ${ghosts.length} ghost.codebase-wired.* reference nodes to the GNN pool`);
    console.log("Sample:", wirings.slice(0, 5).map((w) => `${w.engine} -> ${w.dispatcher}`).join(", "));
    return;
  }

  console.log(`Reading graph ${GRAPH_PATH} (streaming)...`);
  const g = readGraphStreaming(GRAPH_PATH);
  const merge = mergeGhostsIntoGraph(g, ghosts, wiredContentEqual);
  if (!merge.changed) {
    // Idempotent no-op: every codebase-wired ref is already present + current. SKIP the
    // 542MB write so a durable periodic / post-regen re-apply does not churn the graph
    // (or the retrain drift fingerprint) when nothing changed.
    console.log(`UP-TO-DATE -- all ${ghosts.length} codebase-wired refs already present + current; no write. graph nodes=${g.nodes.length}.`);
    return;
  }
  console.log(`Writing ${GRAPH_PATH} (streaming; nodes added=${merge.nodesAdded} updated=${merge.nodesUpdated}, edges added=${merge.edgesAdded})...`);
  writeGraphStreamingAtomic(GRAPH_PATH, g);
  console.log(`DONE -- graph nodes=${g.nodes.length} edges=${g.edges.length}. Re-run nn-graph-eval to grade with the grown pool.`);
}

/** Should this run re-exec with a heap bump? Only the graph-loading modes (--apply/--revert). PURE. */
export function shouldReexecForHeap(argv, env = {}, execArgv = []) {
  if (env.PRISM_WIRED_REFPOOL_REEXEC === "1") return false;
  if (env.PRISM_WIRED_REFPOOL_NO_REEXEC === "1") return false;
  if (hasHeapFlag(execArgv)) return false;
  const a = Array.isArray(argv) ? argv : [];
  return a.includes("--apply") || a.includes("--revert");
}

const REFPOOL_DEFAULT_HEAP_MB = 12288;

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) {
  if (shouldReexecForHeap(process.argv.slice(2), process.env, process.execArgv)) {
    const heapMb = Number(process.env.PRISM_WIRED_REFPOOL_HEAP_MB) || REFPOOL_DEFAULT_HEAP_MB;
    const r = spawnSync(process.execPath, nodeArgsWithHeap(process.argv[1], heapMb, process.argv.slice(2)),
      { stdio: "inherit", cwd: process.cwd(), env: { ...process.env, PRISM_WIRED_REFPOOL_REEXEC: "1" } });
    process.exit(typeof r.status === "number" ? r.status : 1);
  }
  main();
}
