#!/usr/bin/env node
/**
 * vault-to-gnn-refpool.mjs -- feed the NN/GNN reference pool from CONFIRMED
 * vault wiring decisions (OBSIDIAN-AI-SYNERGY, slot:kilo 2026-06-09).
 *
 * THE GAP THIS CLOSES: nn-graph-eval.mjs buildHoldout() builds its leave-out
 * holdout from graph nodes where kind==="ghost.unwired-engine" AND
 * isValidDispatcher(proposed_wiring) AND confidence>=refMinConf (0.8). The pool
 * has been STARVED (PSN leg #10 "full-coverage pending ref-pool growth"): the
 * only seeder, seed-ghost-from-unwired.mjs, labels by KEYWORD INFERENCE (guess
 * the dispatcher from the engine name) -- many guesses land below 0.8, and a
 * guess is not ground truth. Meanwhile the Obsidian vault holds ~hundreds of
 * memories recording ACTUAL confirmed wirings ("XEngine wired into prism_Y")
 * -- human/Claude-verified labels at higher trust than any keyword guess.
 *
 * This feeder mines those CONFIRMED wirings and emits them as high-confidence
 * ghost.unwired-engine reference nodes, in the SAME node shape + via the SAME
 * idempotent graph-merge path as seed-ghost-from-unwired.mjs (imported, NOT
 * duplicated -- one graph-writer pattern, no second 542MB writer to contend).
 *
 * DISTINCT from mine-india-transcripts.mjs (in-flight peer work): that miner
 * reads session transcripts -> vault. THIS reads vault -> GNN ref-pool. They
 * compose (miner grows the vault; this turns vault labels into the gate input)
 * and never touch the same files.
 *
 * CONFIRMED vs SPECULATIVE (R12 -- a wrong label poisons the GNN worse than no
 * label): only lines asserting a COMPLETED wiring are extracted
 * ("wired into/to prism_X", "bound to prism_X", "registered in prism_X").
 * Speculative audit follow-ups ("verify X is wired", "X should be wired",
 * "is X wired?") are EXCLUDED -- they are questions, not ground truth.
 *
 * Node id namespace: `ghost.vault-wired.<Engine>` (distinct from the keyword
 * seeder's `ghost.unwired.<Engine>`) so --revert targets only vault-sourced
 * ghosts and the two seeders never id-collide.
 *
 * Usage:
 *   node scripts/vault-to-gnn-refpool.mjs              # dry-run (default): show extracted labels
 *   node scripts/vault-to-gnn-refpool.mjs --json       # machine-readable dry-run
 *   node scripts/vault-to-gnn-refpool.mjs --apply      # merge ghosts into system-graph.json
 *   node scripts/vault-to-gnn-refpool.mjs --revert     # remove vault-sourced ghosts only
 *
 * The --apply path reads the ~542 MB system-graph.json; run with the big-heap
 * node (NODE_OPTIONS=--max-old-space-size=24576) like the other graph writers.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { isValidDispatcher } from "./seed-ghost-gnn-classify.mjs";
import { mcpToolToDispNodeId } from "./seed-ghost-from-unwired.mjs";
// The merged system-graph.json is >512 MB -- past V8's max string length, so
// JSON.parse(readFileSync(...,"utf8")) throws ERR_STRING_TOO_LONG (the same cap
// that broke the tribal index). seed-ghost-from-unwired.mjs's --apply path still
// uses the naive read and is itself broken at this size; its --revert path
// already uses readGraphStreaming. We use the Buffer-based streaming read+write
// (scripts/lib/graph-io.mjs) for BOTH paths so the feeder works on the live graph.
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const VAULT_MEM_DIRS = [
  path.join(ROOT, "knowledge", "memories", "reference"),
  path.join(ROOT, "knowledge", "memories", "feedback"),
];

// Confidence for a confirmed vault wiring. ABOVE the 0.8 refMinConf gate so the
// label enters the reference pool. Confirmed-by-a-human-decision beats the
// keyword seeder's 0.5-0.85 guesses; held just under 0.9 to leave headroom for
// a future "post-ship + test-verified" tier.
const CONFIRMED_CONFIDENCE = 0.85;

// Lines that ASSERT a completed wiring. The engine name + dispatcher are
// captured groups. Order matters only for the reason string.
const CONFIRMED_PATTERNS = [
  { re: /\b([A-Z][A-Za-z0-9]+Engine)\b[^.\n]{0,40}?\bwired\s+(?:in|into|to)\b[^.\n]{0,30}?\b(prism_[a-z_]+)\b/g, reason: "vault: 'wired into' confirmation" },
  { re: /\b([A-Z][A-Za-z0-9]+Engine)\b[^.\n]{0,40}?\bbound\s+to\b[^.\n]{0,30}?\b(prism_[a-z_]+)\b/g, reason: "vault: 'bound to' confirmation" },
  { re: /\b([A-Z][A-Za-z0-9]+Engine)\b[^.\n]{0,40}?\bregistered\s+(?:in|to|under)\b[^.\n]{0,30}?\b(prism_[a-z_]+)\b/g, reason: "vault: 'registered in' confirmation" },
];

// Speculative/interrogative phrasing that must NEVER be read as a confirmation,
// even if it also contains an Engine + prism_X on the same line.
const SPECULATIVE_RE = /\b(verify|should be|needs? to be|is\s+\w+\s+wired|todo|tbd|may be|might be|pending|not yet|unwired|missing)\b/i;

/**
 * Extract confirmed { engine, dispatcher, reason, sourceFile } wiring labels
 * from a single memory file's text. Speculative lines are dropped.
 */
export function extractConfirmedWirings(text, sourceFile = "") {
  const out = [];
  if (typeof text !== "string" || !text) return out;
  for (const line of text.split(/\r?\n/)) {
    if (SPECULATIVE_RE.test(line)) continue; // a question/TODO, not ground truth
    for (const { re, reason } of CONFIRMED_PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(line)) !== null) {
        const engine = m[1];
        const dispatcher = m[2];
        if (!isValidDispatcher(dispatcher)) continue; // only real dispatchers
        out.push({ engine, dispatcher, reason, sourceFile });
      }
    }
  }
  return out;
}

/** Scan the vault memory dirs and return deduped confirmed wirings (first-seen wins per engine). */
export function collectVaultWirings(dirs = VAULT_MEM_DIRS) {
  const byEngine = new Map(); // engine -> { engine, dispatcher, reason, sourceFile }
  const conflicts = [];       // same engine, different dispatcher across memories
  for (const dir of dirs) {
    let files = [];
    try { files = fs.readdirSync(dir).filter((f) => f.endsWith(".md")); }
    catch { continue; }
    for (const f of files) {
      let text = "";
      try { text = fs.readFileSync(path.join(dir, f), "utf8"); }
      catch { continue; }
      for (const w of extractConfirmedWirings(text, f)) {
        const prior = byEngine.get(w.engine);
        if (!prior) { byEngine.set(w.engine, w); continue; }
        if (prior.dispatcher !== w.dispatcher) {
          // R12: a label conflict is a real ambiguity -- record it and KEEP THE
          // FIRST (deterministic), do not silently pick or average.
          conflicts.push({ engine: w.engine, kept: prior.dispatcher, alsoSeen: w.dispatcher, in: w.sourceFile });
        }
      }
    }
  }
  return { wirings: [...byEngine.values()], conflicts };
}

/** Build a ghost.unwired-engine reference node from a confirmed vault wiring. */
export function buildGhostFromVault(w) {
  const node = {
    id: `ghost.vault-wired.${w.engine}`,
    layer: "L13",
    subgroup: "unwired-engine",
    label: w.engine,
    info: `Vault-confirmed wiring: ${w.dispatcher} (confidence ${CONFIRMED_CONFIDENCE.toFixed(2)}, ${w.reason}, src ${w.sourceFile})`,
    status: "proposed",
    size: 4,
    tier: 2,
    kind: "ghost.unwired-engine",
    ghost: true,
    proposed_at: new Date().toISOString(),
    proposed_by: "vault-to-gnn-refpool.mjs",
    proposed_wiring: w.dispatcher,
    confidence: CONFIRMED_CONFIDENCE,
    reason: w.reason,
    sourceMemory: w.sourceFile,
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
    else if (a === "--help" || a === "-h") {
      console.error("usage: vault-to-gnn-refpool [--apply | --revert | --json]");
      process.exit(0);
    }
  }
  if (!out.apply && !out.revert) out.dryRun = true;
  return out;
}

export function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (opts.revert) {
    const g = readGraphStreaming(GRAPH_PATH); // Buffer-based; no V8 string-cap throw
    const before = g.nodes.length;
    const mineIds = new Set(
      g.nodes.filter((n) => n?.proposed_by === "vault-to-gnn-refpool.mjs").map((n) => n.id),
    );
    g.nodes = g.nodes.filter((n) => !mineIds.has(n.id));
    g.edges = g.edges.filter((e) => !mineIds.has(e.from));
    writeGraphStreamingAtomic(GRAPH_PATH, g);
    console.log(`reverted -- removed ${mineIds.size} vault-sourced ghosts; graph now ${g.nodes.length} nodes (was ${before})`);
    return;
  }

  const { wirings, conflicts } = collectVaultWirings();
  const ghosts = wirings.map(buildGhostFromVault);

  if (conflicts.length) {
    console.log(`WARN ${conflicts.length} label conflict(s) (kept first-seen, NOT averaged):`);
    for (const c of conflicts.slice(0, 10)) console.log(`  ${c.engine}: kept ${c.kept}, also saw ${c.alsoSeen} in ${c.in}`);
  }

  const byDispatcher = {};
  for (const w of wirings) byDispatcher[w.dispatcher] = (byDispatcher[w.dispatcher] || 0) + 1;

  if (opts.json) {
    console.log(JSON.stringify({ count: wirings.length, confidence: CONFIRMED_CONFIDENCE, byDispatcher, conflicts: conflicts.length, sample: wirings.slice(0, 5) }, null, 2));
    return;
  }

  console.log(`Extracted ${wirings.length} CONFIRMED vault wirings (confidence ${CONFIRMED_CONFIDENCE}, all >= 0.8 ref gate)`);
  console.log("By dispatcher:", Object.entries(byDispatcher).sort((a, b) => b[1] - a[1]));

  if (opts.dryRun) {
    console.log(`DRY-RUN -- would add ${ghosts.length} ghost.vault-wired.* reference nodes to the GNN pool`);
    console.log("Sample:", wirings.slice(0, 5).map((w) => `${w.engine} -> ${w.dispatcher}`).join(", "));
    return;
  }

  // Apply: idempotent merge by id (mirrors seed-ghost-from-unwired.mjs:298-329)
  // but via streaming I/O -- the naive JSON.parse(readFileSync) the seeder's
  // --apply still uses throws ERR_STRING_TOO_LONG on the >512 MB live graph.
  console.log(`Reading graph ${GRAPH_PATH} (streaming)...`);
  const g = readGraphStreaming(GRAPH_PATH);
  const existingIds = new Set(g.nodes.map((n) => n.id));
  const existingEdgeKeys = new Set(g.edges.map((e) => `${e.from}::${e.to}::${e.type || ""}`));
  let nodesAdded = 0, nodesUpdated = 0, edgesAdded = 0;
  for (const { node, edge } of ghosts) {
    if (existingIds.has(node.id)) {
      const idx = g.nodes.findIndex((x) => x.id === node.id);
      if (idx >= 0) { g.nodes[idx] = node; nodesUpdated++; }
    } else {
      g.nodes.push(node); existingIds.add(node.id); nodesAdded++;
    }
    const key = `${edge.from}::${edge.to}::${edge.type || ""}`;
    if (!existingEdgeKeys.has(key)) { g.edges.push(edge); existingEdgeKeys.add(key); edgesAdded++; }
  }
  console.log(`Writing ${GRAPH_PATH} (streaming; nodes added=${nodesAdded} updated=${nodesUpdated}, edges added=${edgesAdded})...`);
  writeGraphStreamingAtomic(GRAPH_PATH, g);
  console.log(`DONE -- graph nodes=${g.nodes.length} edges=${g.edges.length}. Re-run nn-graph-eval to grade with the grown pool.`);
}

/** True if node was already launched with a `--max-old-space-size` flag (process.execArgv). PURE. */
export function hasHeapFlag(execArgv) {
  return (Array.isArray(execArgv) ? execArgv : []).some((a) => typeof a === "string" && a.startsWith("--max-old-space-size"));
}

/**
 * Pure: should this run RE-EXEC itself with a `--max-old-space-size` bump? Only the graph-WRITING
 * modes (--apply / --revert) stream-load the ~550MB system-graph in-process and OOM at the default
 * heap ceiling (regression 2026-06-11, slot:alpha -- hit live applying the vault ref-pool). The
 * dry-run (default / --json) extracts vault labels WITHOUT loading the graph, so it skips the
 * re-exec. The child sets PRISM_VAULT_REFPOOL_REEXEC=1 to break the loop; PRISM_VAULT_REFPOOL_NO_REEXEC=1
 * opts out; an already-bumped launch (execArgv has the flag) is not double-wrapped. PURE.
 */
export function shouldReexecForHeap(argv, env = {}, execArgv = []) {
  if (env.PRISM_VAULT_REFPOOL_REEXEC === "1") return false;     // already inside the bumped child
  if (env.PRISM_VAULT_REFPOOL_NO_REEXEC === "1") return false;  // explicit opt-out
  if (hasHeapFlag(execArgv)) return false;                       // launched WITH a heap flag already
  const a = Array.isArray(argv) ? argv : [];
  return a.includes("--apply") || a.includes("--revert");        // only the graph-writing modes load the graph
}

/** Build a heap-bumped node argv (flag BEFORE the script path -- node consumes V8 flags first). PURE. */
export function nodeArgsWithHeap(scriptPath, heapMb, scriptArgs = []) {
  return [`--max-old-space-size=${heapMb}`, scriptPath, ...(Array.isArray(scriptArgs) ? scriptArgs : [])];
}

const REFPOOL_DEFAULT_HEAP_MB = 12288; // 542MB graph stream-load + processing; box has 127GB RAM

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) {
  // Heap guard (regression 2026-06-11, slot:alpha): the --apply/--revert graph load OOM'd at the
  // default ceiling. Re-exec once with a heap bump; dry-run stays fast (no graph load).
  if (shouldReexecForHeap(process.argv.slice(2), process.env, process.execArgv)) {
    const heapMb = Number(process.env.PRISM_VAULT_REFPOOL_HEAP_MB) || REFPOOL_DEFAULT_HEAP_MB;
    const r = spawnSync(
      process.execPath,
      nodeArgsWithHeap(process.argv[1], heapMb, process.argv.slice(2)),
      { stdio: "inherit", cwd: process.cwd(), env: { ...process.env, PRISM_VAULT_REFPOOL_REEXEC: "1" } }
    );
    process.exit(typeof r.status === "number" ? r.status : 1);
  }
  main();
}
