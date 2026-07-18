#!/usr/bin/env node
/**
 * build-viz-adjacency.mjs — capped node-adjacency sidecar for the 3D viewer's
 * blast-radius side-panel (U-VIZ-NODE-NEIGHBORS, slot:sierra 2026-06-01).
 *
 * WHY: the merged system-graph.json is ~695 MB / ~302K nodes / ~1M edges. The 3D
 * viewer samples per-engine `eng.<domain>.<name>` nodes whose edges live ONLY in
 * this merged graph (the 203 MB index has no edges; the 56 MB arch-graph only has
 * 41 eng-CLUSTER + 104 dispatcher nodes, not the per-engine nodes). To let the
 * side-panel show a clicked node's upstream/downstream neighbors WITHOUT the server
 * holding the 695 MB graph, we precompute a BOUNDED adjacency sidecar: for each node
 * that has edges, up to K in-neighbors + K out-neighbors as {id,type}. Capped per
 * direction → bounded size; the server loads this small sidecar once.
 *
 * Reads via readGraphStreaming (the OOM-safe Buffer parser — never JSON.parse a
 * >512 MB string, per sierra soul). Single pass over edges. Emit via JSON.stringify
 * (the capped sidecar is far under the V8 string cap). Run with a large heap.
 *
 * Output: state/shared/system-viz/node-adjacency.json  (gitignored generated artifact)
 * Run:    node --max-old-space-size=8192 scripts/build-viz-adjacency.mjs
 * Knobs:  PRISM_VIZ_ADJ_K (max neighbors per direction per node, default 8)
 * Exit:   0 ok · 1 graph missing · 2 runtime error
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readGraphStreaming } from "./lib/graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH = path.join(ROOT, "state/shared/system-viz/system-graph.json");
const OUT = path.join(ROOT, "state/shared/system-viz/node-adjacency.json");
const K = Math.max(1, Math.min(50, Number(process.env.PRISM_VIZ_ADJ_K) || 8));

export function buildAdjacency(edges, k = 8) {
  const adj = new Map(); // id -> { in: [{id,type}], out: [{id,type}] }
  const get = (id) => { let a = adj.get(id); if (!a) { a = { in: [], out: [] }; adj.set(id, a); } return a; };
  let used = 0, skipped = 0;
  for (const e of edges) {
    if (!e || typeof e.from !== "string" || typeof e.to !== "string" || !e.from || !e.to || e.from === e.to) { skipped++; continue; }
    const t = typeof e.type === "string" ? e.type : "";
    const ofrom = get(e.from); if (ofrom.out.length < k) ofrom.out.push({ id: e.to, type: t });
    const oto = get(e.to);     if (oto.in.length < k)   oto.in.push({ id: e.from, type: t });
    used++;
  }
  const adjacency = {};
  let nodeCount = 0;
  for (const [id, a] of adj) { if (a.in.length || a.out.length) { adjacency[id] = a; nodeCount++; } }
  return { adjacency, nodeCount, used, skipped };
}

function main() {
  if (!fs.existsSync(GRAPH)) { console.error(`FATAL: ${GRAPH} missing — run scripts/regen-viz.mjs`); return 1; }
  let G;
  try { G = readGraphStreaming(GRAPH); }
  catch (e) { console.error(`FATAL: graph read failed — ${e.message}`); return 2; }
  const edges = Array.isArray(G.edges) ? G.edges : [];
  const { adjacency, nodeCount, used, skipped } = buildAdjacency(edges, K);
  const out = {
    schemaVersion: "1.0.0",
    generatedAt: new Date().toISOString(),
    source: "state/shared/system-viz/system-graph.json",
    sourceNodes: Array.isArray(G.nodes) ? G.nodes.length : null,
    edgesTotal: edges.length,
    edgesUsed: used,
    edgesSkipped: skipped,
    cappedAt: K,
    adjacencyNodeCount: nodeCount,
    adjacency,
  };
  try { fs.writeFileSync(OUT, JSON.stringify(out)); }
  catch (e) { console.error(`FATAL: write failed — ${e.message}`); return 2; }
  console.log(`wrote ${OUT}`);
  console.log(`  edges total/used/skipped: ${edges.length}/${used}/${skipped}`);
  console.log(`  adjacency nodes:          ${nodeCount} (capped ${K}/direction)`);
  console.log(`  sidecar bytes:            ${fs.statSync(OUT).size}`);
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.normalize(fs.realpathSync(process.argv[1])) === path.normalize(fileURLToPath(import.meta.url)); }
  catch { return false; }
})();
if (isMain) process.exit(main());
