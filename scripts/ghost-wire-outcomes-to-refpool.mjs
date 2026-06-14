#!/usr/bin/env node
/**
 * ghost-wire-outcomes-to-refpool.mjs -- feed the NN/GNN reference pool from CONFIRMED
 * ghost-wiring OUTCOMES (U-GHOST-OUTCOME-REFPOOL, slot:india 2026-06-11).
 *
 * THE GAP THIS CLOSES: state/shared/ghost-wire-outcomes.jsonl records 7,160 ghost-wiring
 * proposals (engine -> proposedWiring) each with a validation status. 545 are CONFIRMED
 * (validated as the CORRECT dispatcher) -- ground-truth labels at the same trust as a vault
 * confirmation. But the ONLY consumers are validate-ghost-wires.mjs (the validator) + the
 * coverage auditor; the GNN reference pool (fed by vault-to-gnn-refpool.mjs from vault memories)
 * NEVER sees them. So india's OWN closed loop -- propose-wiring -> validate -> confirmed -> (dead
 * end) -- never feeds the confirmed labels back to grow the ref pool. The pool is the documented
 * deploy-gate blocker (PSN leg #10 "full-coverage pending ref-pool growth"; macro-F1 0.44 < 0.55).
 *
 * This is the SIBLING of vault-to-gnn-refpool.mjs (clone-don't-fork, R15): same node shape, same
 * streaming graph-merge, same heap-reexec guard + --revert reversibility -- only the SOURCE differs
 * (the confirmed outcome ledger vs vault memories). Distinct id namespace
 * `ghost.outcome-wired.<Engine>` so --revert scopes to outcome-sourced ghosts and the three
 * seeders (keyword / vault / outcome) never id-collide.
 *
 * CONFIRMED = ground truth (R12): only rows with validation.status === "confirmed" AND a valid
 * proposedWiring dispatcher are emitted. A confirmation means the wiring was VERIFIED correct, so
 * the reference confidence is CONFIRMED_CONFIDENCE (0.85, above the 0.8 ref gate) regardless of
 * the ORIGINAL proposal confidence (the proposal's uncertainty is moot once validated).
 *
 * Usage:
 *   node scripts/ghost-wire-outcomes-to-refpool.mjs            # dry-run: show extracted labels
 *   node scripts/ghost-wire-outcomes-to-refpool.mjs --json     # machine-readable dry-run
 *   node scripts/ghost-wire-outcomes-to-refpool.mjs --apply    # merge ghosts into system-graph.json
 *   node scripts/ghost-wire-outcomes-to-refpool.mjs --revert   # remove outcome-sourced ghosts only
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

import { isValidDispatcher } from "./seed-ghost-gnn-classify.mjs";
import { mcpToolToDispNodeId } from "./seed-ghost-from-unwired.mjs";
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
import { hasHeapFlag, nodeArgsWithHeap } from "./vault-to-gnn-refpool.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const OUTCOMES_PATH = path.join(ROOT, "state", "shared", "ghost-wire-outcomes.jsonl");

// A confirmed outcome is a VERIFIED label -> same trust as a vault confirmation, above the 0.8 gate.
const CONFIRMED_CONFIDENCE = 0.85;
const PROPOSED_BY = "ghost-wire-outcomes-to-refpool.mjs";

/**
 * Extract confirmed { engine, dispatcher, ghostId } labels from the ghost-wire-outcomes JSONL.
 * Only validation.status === "confirmed" rows with a VALID proposedWiring dispatcher survive.
 * Dedups by engine (first-seen wins); records dispatcher conflicts (same engine, different
 * confirmed dispatcher) without averaging (R12). Pure -> hermetically testable.
 */
export function extractConfirmedOutcomes(text) {
  const byEngine = new Map();
  const conflicts = [];
  for (const line of String(text || "").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    let o;
    try { o = JSON.parse(t); } catch { continue; }
    const status = o && o.validation && o.validation.status;
    if (status !== "confirmed") continue;
    const engine = typeof o.engineName === "string" && o.engineName.trim() ? o.engineName.trim() : null;
    const dispatcher = typeof o.proposedWiring === "string" ? o.proposedWiring.trim() : "";
    if (!engine || !isValidDispatcher(dispatcher)) continue;
    const prior = byEngine.get(engine);
    if (!prior) { byEngine.set(engine, { engine, dispatcher, ghostId: o.ghostId || `ghost.unwired.${engine}` }); continue; }
    if (prior.dispatcher !== dispatcher) conflicts.push({ engine, kept: prior.dispatcher, alsoSeen: dispatcher });
  }
  return { wirings: [...byEngine.values()], conflicts };
}

/** Build a ghost.unwired-engine reference node + edge from a confirmed outcome wiring. */
export function buildGhostFromOutcome(w) {
  const node = {
    id: `ghost.outcome-wired.${w.engine}`,
    layer: "L13",
    subgroup: "unwired-engine",
    label: w.engine,
    info: `Confirmed ghost-wire outcome: ${w.dispatcher} (confidence ${CONFIRMED_CONFIDENCE.toFixed(2)}, validated correct, src ghost-wire-outcomes.jsonl)`,
    status: "proposed",
    size: 4,
    tier: 2,
    kind: "ghost.unwired-engine",
    ghost: true,
    proposed_at: new Date().toISOString(),
    proposed_by: PROPOSED_BY,
    proposed_wiring: w.dispatcher,
    confidence: CONFIRMED_CONFIDENCE,
    reason: "ghost-wire-outcome: validation confirmed",
    sourceLedger: "ghost-wire-outcomes.jsonl",
  };
  const edge = {
    from: node.id,
    to: mcpToolToDispNodeId(w.dispatcher),
    type: "ghost-wire",
    relation: "proposed-wire",
    status: "proposed",
    intensity: CONFIRMED_CONFIDENCE,
  };
  return { node, edge };
}

function parseArgs(argv) {
  const out = { dryRun: false, apply: false, revert: false, json: false };
  for (const a of argv) {
    if (a === "--apply") out.apply = true;
    else if (a === "--revert") out.revert = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") { console.error("usage: ghost-wire-outcomes-to-refpool [--apply | --revert | --json]"); process.exit(0); }
  }
  if (!out.apply && !out.revert) out.dryRun = true;
  return out;
}

function readOutcomes(p = OUTCOMES_PATH) {
  try { return fs.readFileSync(p, "utf8"); } catch { return ""; }
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
    console.log(`reverted -- removed ${mineIds.size} outcome-sourced ghosts; graph now ${g.nodes.length} nodes (was ${before})`);
    return;
  }

  const { wirings, conflicts } = extractConfirmedOutcomes(readOutcomes());
  const ghosts = wirings.map(buildGhostFromOutcome);
  const byDispatcher = {};
  for (const w of wirings) byDispatcher[w.dispatcher] = (byDispatcher[w.dispatcher] || 0) + 1;

  if (opts.json) {
    console.log(JSON.stringify({ count: wirings.length, confidence: CONFIRMED_CONFIDENCE, byDispatcher, conflicts: conflicts.length, sample: wirings.slice(0, 5) }, null, 2));
    return;
  }

  console.log(`Extracted ${wirings.length} CONFIRMED ghost-wire outcomes (confidence ${CONFIRMED_CONFIDENCE}, all >= 0.8 ref gate)`);
  console.log("By dispatcher:", Object.entries(byDispatcher).sort((a, b) => b[1] - a[1]).slice(0, 12));
  if (conflicts.length) {
    console.log(`WARN ${conflicts.length} label conflict(s) (kept first-seen, NOT averaged):`);
    for (const c of conflicts.slice(0, 8)) console.log(`  ${c.engine}: kept ${c.kept}, also saw ${c.alsoSeen}`);
  }

  if (opts.dryRun) {
    console.log(`DRY-RUN -- would add ${ghosts.length} ghost.outcome-wired.* reference nodes to the GNN pool`);
    console.log("Sample:", wirings.slice(0, 5).map((w) => `${w.engine} -> ${w.dispatcher}`).join(", "));
    return;
  }

  console.log(`Reading graph ${GRAPH_PATH} (streaming)...`);
  const g = readGraphStreaming(GRAPH_PATH);
  const existingIds = new Set(g.nodes.map((n) => n.id));
  const existingEdgeKeys = new Set(g.edges.map((e) => `${e.from}::${e.to}::${e.type || ""}`));
  let nodesAdded = 0, nodesUpdated = 0, edgesAdded = 0;
  for (const { node, edge } of ghosts) {
    if (existingIds.has(node.id)) {
      const idx = g.nodes.findIndex((x) => x.id === node.id);
      if (idx >= 0) { g.nodes[idx] = node; nodesUpdated++; }
    } else { g.nodes.push(node); existingIds.add(node.id); nodesAdded++; }
    const key = `${edge.from}::${edge.to}::${edge.type || ""}`;
    if (!existingEdgeKeys.has(key)) { g.edges.push(edge); existingEdgeKeys.add(key); edgesAdded++; }
  }
  console.log(`Writing ${GRAPH_PATH} (streaming; nodes added=${nodesAdded} updated=${nodesUpdated}, edges added=${edgesAdded})...`);
  writeGraphStreamingAtomic(GRAPH_PATH, g);
  console.log(`DONE -- graph nodes=${g.nodes.length} edges=${g.edges.length}. Re-run nn-graph-eval to grade with the grown pool.`);
}

/** Should this run re-exec with a heap bump? Only the graph-loading modes (--apply/--revert). PURE. */
export function shouldReexecForHeap(argv, env = {}, execArgv = []) {
  if (env.PRISM_OUTCOME_REFPOOL_REEXEC === "1") return false;
  if (env.PRISM_OUTCOME_REFPOOL_NO_REEXEC === "1") return false;
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
    const heapMb = Number(process.env.PRISM_OUTCOME_REFPOOL_HEAP_MB) || REFPOOL_DEFAULT_HEAP_MB;
    const r = spawnSync(process.execPath, nodeArgsWithHeap(process.argv[1], heapMb, process.argv.slice(2)),
      { stdio: "inherit", cwd: process.cwd(), env: { ...process.env, PRISM_OUTCOME_REFPOOL_REEXEC: "1" } });
    process.exit(typeof r.status === "number" ? r.status : 1);
  }
  main();
}
