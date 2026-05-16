#!/usr/bin/env node
/**
 * graph-random-walk.mjs — node2vec 2nd-order biased random walks over the
 * normalized PRISM system graph. Foundation for U-NNG-NODE2VEC-TOPOLOGY:
 * the walk corpus feeds the skip-gram embedder (Node2Vec part 2).
 *
 * Reference: Grover & Leskovec, "node2vec: Scalable Feature Learning for
 * Networks" (KDD 2016). The 2nd-order transition from (prev → cur → next):
 *   - next == prev            → unnormalized weight 1/p   (return param)
 *   - next is a neighbor of prev (dist 1 from prev) → weight 1
 *   - otherwise (dist 2)      → weight 1/q              (in-out param)
 * p small ⇒ walk backtracks (BFS-like, structural equivalence).
 * q small ⇒ walk explores outward (DFS-like, homophily).
 *
 * Pure + seeded-deterministic (mulberry32) so tests assert real invariants,
 * not stubs. Consistent with the U1/U2 scripts/lib/*.mjs convention.
 *
 * Edge schema: the live system-graph-normalized.json keys edges as
 * {from,to,type}; older/smaller graphs use {source,target}. buildAdjacency
 * accepts BOTH (source||from, target||to) so it never silently produces an
 * empty corpus against the real producer.
 */

const DEFAULTS = Object.freeze({
  walkLength: 80,
  walksPerNode: 10,
  p: 1.0,
  q: 1.0,
  seed: 1,
  undirected: true,
  maxNodes: 400000, // hard cap — the live graph is ~377k nodes
});

/** mulberry32 — tiny, fast, deterministic PRNG. Returns a () => [0,1) fn. */
export function mulberry32(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build an adjacency map from a normalized graph object.
 * Accepts { nodes:[{id}], edges:[{source,target}] } (the system-graph shape).
 * Returns { adj: Map<id, string[]>, nbrSet: Map<id, Set<id>>, nodeIds: string[],
 *           truncated: boolean }.
 * Skips edges whose endpoints aren't in the (possibly capped) node set.
 */
export function buildAdjacency(graph, opts = {}) {
  const undirected = opts.undirected ?? DEFAULTS.undirected;
  const maxNodes = Number.isInteger(opts.maxNodes) && opts.maxNodes > 0
    ? opts.maxNodes
    : DEFAULTS.maxNodes;

  if (!graph || typeof graph !== "object") {
    return { adj: new Map(), nbrSet: new Map(), nodeIds: [], truncated: false, edgeCount: 0 };
  }
  const rawNodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const rawEdges = Array.isArray(graph.edges) ? graph.edges : [];

  const truncated = rawNodes.length > maxNodes;
  const kept = truncated ? rawNodes.slice(0, maxNodes) : rawNodes;

  const adj = new Map();
  const nbrSet = new Map();
  const nodeIds = [];
  for (const n of kept) {
    const id = n && n.id != null ? String(n.id) : null;
    if (id == null || adj.has(id)) continue;
    adj.set(id, []);
    nbrSet.set(id, new Set());
    nodeIds.push(id);
  }

  let edgeCount = 0;
  const link = (a, b) => {
    if (a === b) return; // drop self-loops (node2vec walks don't benefit)
    if (!adj.has(a) || !adj.has(b)) return;
    const s = nbrSet.get(a);
    if (!s.has(b)) { s.add(b); adj.get(a).push(b); edgeCount++; }
  };
  for (const e of rawEdges) {
    if (!e) continue;
    // Accept BOTH edge schemas — system-graph-normalized.json uses {from,to};
    // smaller/legacy graphs use {source,target}. Reading only one silently
    // empties the corpus against the real producer (the P0 this guards).
    const rawA = e.source != null ? e.source : e.from;
    const rawB = e.target != null ? e.target : e.to;
    const a = rawA != null ? String(rawA) : null;
    const b = rawB != null ? String(rawB) : null;
    if (a == null || b == null) continue;
    link(a, b);
    if (undirected) link(b, a);
  }
  return { adj, nbrSet, nodeIds, truncated, edgeCount };
}

function validateParams({ p, q, walkLength, walksPerNode }) {
  for (const [name, v] of [["p", p], ["q", q]]) {
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      throw new RangeError(`graph-random-walk: ${name} must be a finite number > 0 (got ${v})`);
    }
  }
  for (const [name, v] of [["walkLength", walkLength], ["walksPerNode", walksPerNode]]) {
    if (!Number.isInteger(v) || v < 1) {
      throw new RangeError(`graph-random-walk: ${name} must be an integer >= 1 (got ${v})`);
    }
  }
}

/** Weighted pick by unnormalized weights; rand in [0,1). Returns index. */
function weightedPick(weights, rand) {
  let total = 0;
  for (let i = 0; i < weights.length; i++) total += weights[i];
  if (total <= 0) return -1;
  let r = rand() * total;
  for (let i = 0; i < weights.length; i++) {
    r -= weights[i];
    if (r < 0) return i;
  }
  return weights.length - 1; // float-rounding fallback
}

/**
 * One node2vec biased walk starting at `start`. Returns string[] of node ids
 * (length ≤ walkLength; shorter if it hits a dead end).
 */
export function node2vecWalk(adj, nbrSet, start, { p, q, walkLength }, rng) {
  if (!adj.has(start)) return [];
  const walk = [start];
  while (walk.length < walkLength) {
    const cur = walk[walk.length - 1];
    const nbrs = adj.get(cur);
    if (!nbrs || nbrs.length === 0) break; // dead end

    if (walk.length === 1) {
      // First step: uniform over neighbors (no prev yet).
      walk.push(nbrs[Math.floor(rng() * nbrs.length) % nbrs.length]);
      continue;
    }
    const prev = walk[walk.length - 2];
    const prevNbrs = nbrSet.get(prev);
    const weights = new Array(nbrs.length);
    for (let i = 0; i < nbrs.length; i++) {
      const nx = nbrs[i];
      if (nx === prev) weights[i] = 1 / p;            // return
      else if (prevNbrs && prevNbrs.has(nx)) weights[i] = 1; // dist 1
      else weights[i] = 1 / q;                         // dist 2 (out)
    }
    const idx = weightedPick(weights, rng);
    if (idx < 0) break;
    walk.push(nbrs[idx]);
  }
  return walk;
}

/**
 * Generate the full walk corpus. Streaming-friendly: yields one walk at a
 * time so a 377k-node graph never materializes 3.7M walks in memory.
 * Deterministic for a fixed seed (mulberry32 advanced once per walk start).
 */
export function* generateWalks(graph, options = {}) {
  const opt = { ...DEFAULTS, ...options };
  validateParams(opt);
  const { adj, nbrSet, nodeIds, truncated, edgeCount } = buildAdjacency(graph, opt);
  if (truncated && opt.onTruncate) opt.onTruncate(nodeIds.length);
  // R12 fail-loud: input HAD edges but ZERO were built ⇒ silent-empty
  // pathology (edge-schema drift). A graph with genuinely no edges is
  // legitimate (truncation/edgeless) and must NOT trip this — the
  // discriminator is "raw edges present but none linked".
  const rawEdgesPresent = Array.isArray(graph.edges) && graph.edges.length > 0;
  if (nodeIds.length > 0 && edgeCount === 0 && rawEdgesPresent) {
    if (opt.onEmpty) opt.onEmpty({ nodeIds: nodeIds.length, edgeCount });
    else throw new Error(
      `graph-random-walk: ${nodeIds.length} nodes but 0 edges built — likely an ` +
      `edge-schema mismatch (expected {from,to} or {source,target}). Pass an ` +
      `onEmpty handler to opt out of this guard.`
    );
  }
  const rng = mulberry32(opt.seed);
  for (let pass = 0; pass < opt.walksPerNode; pass++) {
    for (const start of nodeIds) {
      const w = node2vecWalk(adj, nbrSet, start, opt, rng);
      if (w.length > 1) yield w; // length-1 walks (isolated nodes) carry no signal
    }
  }
}

/** Convenience: collect all walks into an array (bounded callers only). */
export function collectWalks(graph, options = {}) {
  const out = [];
  for (const w of generateWalks(graph, options)) out.push(w);
  return out;
}

export { DEFAULTS };
