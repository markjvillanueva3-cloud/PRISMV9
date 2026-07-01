#!/usr/bin/env node
/**
 * hub-blast-radius-rank -- rank PRISM code hubs by DOWNSTREAM blast radius.
 *
 * DISCOVERY-EFFICIENCY/U-HUB-BLAST-RADIUS-RANK (slot:tango, 2026-06-15).
 *
 * The fleet already has:
 *   - per-node blast-radius (scripts/system-viz-query.mjs blast-radius <id>) -- one node at a time
 *   - consumer FAN-IN ranking (knowledge/wiki/architecture/unwired-ranker-consumer-fanin.md) -- IN-degree (who depends on me)
 *   - PageRank centrality (PersonalizedPageRank algorithm) -- eigenvector importance
 * It does NOT have an AGGREGATE ranking of hubs by downstream blast radius
 * (bounded-depth forward reachability count = "if this node changes/breaks, how
 * many nodes are within N hops downstream"). That is the change-impact /
 * test-priority metric this script adds. Blast-radius (OUT, multi-hop) is the
 * INVERSE of fan-in (IN, 1-hop) and distinct from PageRank (recursive weight).
 *
 * Reuses the forward-adjacency bounded-BFS pattern from system-viz-query.mjs
 * (the per-node primitive) -- this script is the ranking LAYER over it, not a
 * re-implementation of a domain asset.
 *
 * Pure core (buildForwardAdjacency / blastRadius / rankHubsByBlastRadius) +
 * thin CLI guard, mirroring scripts/stub-sweep-full.mjs.
 *
 * Usage:
 *   node scripts/hub-blast-radius-rank.mjs [--graph <path>] [--depth N]
 *        [--top N] [--filter <substr>] [--all] [--json]
 */
import { readFileSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DEFAULT_GRAPH = join(REPO_ROOT, "state", "shared", "system-viz", "architecture-graph.json");

// Refuse graphs larger than this -- the 728MB merged system-graph.json OOMs
// JSON.parse (V8 string cap), same lesson as the master-index-search-lib cap.
// architecture-graph.json (~60MB) is the intended, loadable input.
const MAX_GRAPH_BYTES = 300 * 1024 * 1024;

const DEFAULT_DEPTH = 3;
const DEFAULT_TOP = 30;

/**
 * Build a forward adjacency map (from -> to[]) from a graph edge list.
 * Self-loops and malformed edges are skipped (behavior matches the
 * system-viz-query blast-radius primitive). Pure.
 */
export function buildForwardAdjacency(edges) {
  const fwd = new Map();
  if (!Array.isArray(edges)) return fwd;
  for (const e of edges) {
    if (!e || typeof e.from !== "string" || typeof e.to !== "string" || e.from === e.to) continue;
    let a = fwd.get(e.from);
    if (!a) { a = []; fwd.set(e.from, a); }
    a.push(e.to);
  }
  return fwd;
}

/**
 * Downstream blast radius of startId: count of DISTINCT nodes reachable by
 * following forward edges within maxDepth hops (start excluded). Bounded-depth
 * BFS, cycle-safe via a visited set. Pure.
 */
export function blastRadius(fwd, startId, maxDepth = DEFAULT_DEPTH) {
  if (!(fwd instanceof Map) || typeof startId !== "string" || maxDepth < 1) return 0;
  const visited = new Set([startId]);
  let frontier = [startId];
  for (let depth = 1; depth <= maxDepth; depth++) {
    const next = [];
    for (const f of frontier) {
      const neighbors = fwd.get(f);
      if (!neighbors) continue;
      for (const t of neighbors) {
        if (!visited.has(t)) { visited.add(t); next.push(t); }
      }
    }
    frontier = next;
    if (frontier.length === 0) break;
  }
  return visited.size - 1; // exclude start
}

/**
 * Default candidate filter: structural code hubs (engines / dispatchers /
 * algorithms), identified by id prefix or the L4/L5 architecture layers. Keeps
 * vault / wiki / memory / ghost nodes out of the ranking by default. Pure.
 */
export function defaultCandidateFilter(node) {
  if (!node || typeof node.id !== "string") return false;
  if (/^(eng|disp|dispatcher|algo|algorithm)\./i.test(node.id)) return true;
  const layer = String(node.layer ?? "");
  return layer === "L4" || layer === "L5";
}

/**
 * Rank candidate hubs by downstream blast radius (descending). Pure.
 *
 * @param {{nodes?: any[], edges?: any[]}} graph
 * @param {{maxDepth?: number, topN?: number, candidateFilter?: (n:any)=>boolean}} [opts]
 * @returns {{ranked: Array<{id,label,blastRadius,outDegree}>, meta: object}}
 */
export function rankHubsByBlastRadius(graph, opts = {}) {
  const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph?.edges) ? graph.edges : [];
  const maxDepth = Number.isFinite(opts.maxDepth) && opts.maxDepth >= 1 ? Math.floor(opts.maxDepth) : DEFAULT_DEPTH;
  const topN = Number.isFinite(opts.topN) && opts.topN >= 1 ? Math.floor(opts.topN) : DEFAULT_TOP;
  const candidateFilter = typeof opts.candidateFilter === "function" ? opts.candidateFilter : defaultCandidateFilter;

  const fwd = buildForwardAdjacency(edges);
  const candidates = nodes.filter(candidateFilter);

  const scored = candidates.map((n) => ({
    id: n.id,
    label: typeof n.label === "string" ? n.label.replace(/\n/g, " ") : n.id,
    blastRadius: blastRadius(fwd, n.id, maxDepth),
    outDegree: (fwd.get(n.id) || []).length,
  }));

  // Descending by blast radius; tie-break by out-degree then id for determinism.
  scored.sort((a, b) =>
    b.blastRadius - a.blastRadius ||
    b.outDegree - a.outDegree ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  return {
    ranked: scored.slice(0, topN),
    meta: {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      candidateCount: candidates.length,
      maxDepth,
      topN,
      adjacencySize: fwd.size,
    },
  };
}

/** Fail-soft graph loader with a size guard. Throws on oversize / unreadable. */
export function loadGraph(path) {
  const st = statSync(path);
  if (st.size > MAX_GRAPH_BYTES) {
    throw new Error(
      `graph ${path} is ${(st.size / 1048576).toFixed(0)}MB > ${(MAX_GRAPH_BYTES / 1048576).toFixed(0)}MB cap ` +
      `(use architecture-graph.json, not the merged system-graph.json -- it OOMs JSON.parse)`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8"));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { graph: DEFAULT_GRAPH, depth: DEFAULT_DEPTH, top: DEFAULT_TOP, filter: null, all: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === "--graph") a.graph = argv[++i];
    else if (t === "--depth") a.depth = parseInt(argv[++i], 10);
    else if (t === "--top") a.top = parseInt(argv[++i], 10);
    else if (t === "--filter") a.filter = argv[++i];
    else if (t === "--all") a.all = true;
    else if (t === "--json") a.json = true;
  }
  return a;
}

function runCLI(argv) {
  const a = parseArgs(argv);
  let graph;
  try {
    graph = loadGraph(a.graph);
  } catch (err) {
    console.error(`[hub-blast-radius-rank] load failed: ${err.message}`);
    process.exit(2);
  }

  let candidateFilter = defaultCandidateFilter;
  if (a.all) candidateFilter = () => true;
  else if (a.filter) {
    const needle = a.filter.toLowerCase();
    candidateFilter = (n) =>
      typeof n?.id === "string" &&
      (n.id.toLowerCase().includes(needle) || String(n.label ?? "").toLowerCase().includes(needle));
  }

  const { ranked, meta } = rankHubsByBlastRadius(graph, { maxDepth: a.depth, topN: a.top, candidateFilter });

  if (a.json) {
    console.log(JSON.stringify({ ranked, meta }, null, 2));
    return;
  }

  console.log(`hub blast-radius ranking -- depth=${meta.maxDepth}, candidates=${meta.candidateCount}/${meta.totalNodes} nodes, ${meta.totalEdges} edges`);
  console.log(`rank  blast  out  hub`);
  ranked.forEach((r, i) => {
    console.log(`${String(i + 1).padStart(4)}  ${String(r.blastRadius).padStart(5)}  ${String(r.outDegree).padStart(3)}  ${r.id}  ${r.label !== r.id ? "(" + r.label.slice(0, 48) + ")" : ""}`);
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runCLI(process.argv.slice(2));
}
