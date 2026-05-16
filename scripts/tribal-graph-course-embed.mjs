#!/usr/bin/env node
// tribal-graph-course-embed.mjs
// Iter 6: Ollama nomic-embed-text pass over the syllabus-level course nodes,
// then buildLateralWires (cosine) to emit course↔course semantic-similarity
// edges into system-graph.json. Completes the graph-of-graphs lateral layer.
//
// Composes tribal-graph-embedding.mjs (commit 862137931) — no fork.
//
// Usage:
//   node scripts/tribal-graph-course-embed.mjs                 # full
//   node scripts/tribal-graph-course-embed.mjs --limit 20      # sample
//   node scripts/tribal-graph-course-embed.mjs --dry-run
//   node scripts/tribal-graph-course-embed.mjs --threshold 0.8 # wire cutoff

import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { argv } from "node:process";
import {
  embedClusters,
  buildLateralWires,
  defaultClusterText,
  LATERAL_WIRE_THRESHOLD_DEFAULT,
} from "./lib/tribal-graph-embedding.mjs";

const SIDECAR_PATH       = "H:/prism/state/shared/tribal-graph/course-tribal-nodes.json";
const SYSTEM_GRAPH_PATH  = "H:/prism/state/shared/system-viz/system-graph.json";
const CHECKPOINT_PATH    = "H:/prism/state/shared/tribal-graph/course-embed-checkpoint.json";
const MAX_WIRES_PER_NODE = 8;

function parseArgs(argv) {
  const a = {
    dryRun: false, limit: Infinity, threshold: LATERAL_WIRE_THRESHOLD_DEFAULT,
    sidecar: SIDECAR_PATH, out: SYSTEM_GRAPH_PATH, checkpoint: CHECKPOINT_PATH,
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--dry-run") a.dryRun = true;
    else if (argv[i] === "--limit") a.limit = parseInt(argv[++i], 10);
    else if (argv[i] === "--threshold") a.threshold = parseFloat(argv[++i]);
    else if (argv[i] === "--sidecar") a.sidecar = argv[++i];
    else if (argv[i] === "--out") a.out = argv[++i];
    else if (argv[i] === "--checkpoint") a.checkpoint = argv[++i];
  }
  return a;
}

function readJsonOrNull(p) {
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; }
}

function writeJsonAtomic(p, obj) {
  const dir = dirname(p);
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmp = p + ".tmp-" + process.pid + "-" + Date.now();
  writeFileSync(tmp, JSON.stringify(obj, (_k, v) => v instanceof Set ? [...v].sort() : v, 2));
  try { renameSync(tmp, p); }
  catch (e) { try { unlinkSync(tmp); } catch { /* */ } throw e; }
}

// Build the embed text for a course node: title + description + sorted tags.
// Deterministic — same node always produces the same text (so re-runs hit the
// embedding checkpoint instead of re-calling Ollama).
function courseEmbedText(node) {
  const parts = [];
  if (node.title) parts.push(String(node.title));
  if (node.description) parts.push(String(node.description).slice(0, 2000));
  if (Array.isArray(node.tags) && node.tags.length) parts.push([...node.tags].sort().join(" "));
  return parts.join(" | ");
}

async function main() {
  const args = parseArgs(argv);
  const log = (...m) => console.log("[course-embed]", ...m);

  const sidecar = readJsonOrNull(args.sidecar);
  if (!sidecar || !Array.isArray(sidecar.nodes)) {
    console.error("[course-embed] sidecar missing — run the mapper/extractor first.");
    process.exit(2);
  }

  // Only embed syllabus-level nodes with real description signal.
  let toEmbed = sidecar.nodes.filter(
    n => n?.id && n.provenance?.extractionLevel === "syllabus"
      && typeof n.description === "string" && n.description.length > 20
  );
  if (Number.isFinite(args.limit)) toEmbed = toEmbed.slice(0, args.limit);
  log(`syllabus nodes to embed: ${toEmbed.length} (of ${sidecar.nodes.length} total)`);
  if (toEmbed.length === 0) { log("nothing to embed."); return; }

  // Clusters for embedClusters: { id, repBag, title } — textFor supplies text.
  const clusters = toEmbed.map(n => ({
    id: n.id,
    title: n.title,
    repBag: new Set(n.tags || []),
    _node: n,
  }));

  log(`embedding via Ollama nomic-embed-text (checkpoint: ${args.checkpoint})...`);
  const result = await embedClusters(clusters, {
    checkpointPath: args.dryRun ? null : args.checkpoint,
    textFor: (c) => courseEmbedText(c._node),
    batchSize: 16,
    maxRetries: 3,
    retryBaseMs: 400,
    onProgress: (s) => {
      if (s.processed % 25 === 0 || s.processed === s.total) {
        log(`  progress ${s.processed}/${s.total} ok=${s.succeeded} fail=${s.embedFailed ?? 0}`);
      }
    },
  });

  // result.vectors is THIS-RUN-ONLY (checkpoint-skipped ids are not in it).
  // Source the full embedding set from the merged checkpoint so a re-run that
  // hits the checkpoint still builds the complete wire set instead of
  // early-exiting with zero output. Checkpoint shape: { vectors:[{id,embedding}] }.
  const cpVecs = result.checkpoint?.vectors ?? [];
  const clusterIds = new Set(clusters.map(c => c.id));
  const vectorMap = new Map(
    cpVecs.filter(v => v && clusterIds.has(v.id) && Array.isArray(v.embedding))
          .map(v => [v.id, v.embedding])
  );
  log(`embed result: ok=${result.ok} thisRun=${result.vectors.length} fullSet=${vectorMap.size} failures=${result.failures.length}`);
  if (result.failures.length > 0) {
    log(`  first failure: ${JSON.stringify(result.failures[0]).slice(0, 160)}`);
  }
  // Fail-loud partial gate (R12): never emit a half-graph that looks complete.
  // Proceed only when the full embed set covers every node we set out to embed
  // (clean full-resume counts as complete). Override with --allow-partial.
  const allowPartial = argv.includes("--allow-partial");
  if (!allowPartial && (!result.ok || vectorMap.size < toEmbed.length)) {
    console.error(`[course-embed] PARTIAL/FAILED embed: fullSet=${vectorMap.size} < target=${toEmbed.length} (ok=${result.ok}). ` +
      `Refusing to write a truncated wire graph. Re-run (checkpoint resumes) or pass --allow-partial.`);
    process.exit(3);
  }
  if (vectorMap.size < 2) {
    log("fewer than 2 embeddings — cannot build lateral wires. Exiting.");
    return;
  }

  // Build lateral wires by cosine similarity.
  const wireClusters = clusters.filter(c => vectorMap.has(c.id));
  const wires = buildLateralWires(wireClusters, vectorMap, args.threshold, {
    maxWiresPerNode: MAX_WIRES_PER_NODE,
    type: "course-semantic-similarity",
  });
  log(`lateral wires @ cosine>=${args.threshold}: ${wires.length} (max ${MAX_WIRES_PER_NODE}/node)`);

  // Attach embedding ref + wires onto sidecar nodes (embedding stored as
  // checkpoint, not inline — node carries a pointer + its wire list).
  const wiresByNode = new Map();
  for (const w of wires) {
    if (!wiresByNode.has(w.fromId)) wiresByNode.set(w.fromId, []);
    if (!wiresByNode.has(w.toId)) wiresByNode.set(w.toId, []);
    wiresByNode.get(w.fromId).push({ to: w.toId, weight: w.weight });
    wiresByNode.get(w.toId).push({ to: w.fromId, weight: w.weight });
  }
  const updatedNodes = sidecar.nodes.map(n => {
    if (!vectorMap.has(n.id)) return n;
    return {
      ...n,
      embedding: { model: "nomic-embed-text", dim: 768, checkpoint: args.checkpoint },
      lateralWires: wiresByNode.get(n.id) || [],
    };
  });

  if (args.dryRun) {
    log(`[dry-run] would update ${vectorMap.size} sidecar nodes + emit ${wires.length} graph edges`);
    return;
  }

  writeJsonAtomic(args.sidecar, { ...sidecar, nodes: updatedNodes, generatedAt: new Date().toISOString() });
  log(`sidecar updated: ${args.sidecar}`);

  // Emit lateral wires as edges into system-graph.json (dedupe by from,to,kind).
  const graph = readJsonOrNull(args.out);
  if (!graph || !Array.isArray(graph.edges)) {
    log(`WARN: ${args.out} missing/malformed; skipping graph edge emit.`);
    return;
  }
  const edgeKey = (e) => `${e.from}\x1f${e.to}\x1f${e.kind ?? ""}`;
  const existing = new Set(graph.edges.map(edgeKey));
  let emitted = 0;
  for (const w of wires) {
    const e = { from: w.fromId, to: w.toId, kind: "course-semantic-similarity", weight: w.weight };
    if (!existing.has(edgeKey(e))) { graph.edges.push(e); existing.add(edgeKey(e)); emitted++; }
  }
  log(`graph edges emitted: ${emitted} (total now ${graph.edges.length})`);
  writeJsonAtomic(args.out, graph);
  log(`system-graph written: ${args.out}`);
}

main().catch((e) => {
  console.error("[course-embed] FATAL:", e && (e.stack || e.message || e));
  process.exit(1);
});
