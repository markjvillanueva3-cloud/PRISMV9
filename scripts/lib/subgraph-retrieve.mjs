/**
 * subgraph-retrieve -- connected-neighborhood pre-search over the system graph.
 *
 * U-SUBGRAPH-RETRIEVE (rec #4 of GRAPH-UTILIZATION-ASSESSMENT-2026-06-12, slot:alpha).
 *
 * THE PROBLEM IT SOLVES. The existing `find` returns a FLAT top-K list of orphan
 * hits -- nodes that match the query string but with no relationship to each
 * other. For "how do I approach task X with PRISM?" that flat list is weak: it
 * tells you WHICH engines exist, not how they CONNECT (engine -> wired-to
 * dispatcher -> documented-by wiki -> tested-by test). This module returns a
 * CONNECTED SUBGRAPH: seed nodes (from `find`) expanded over their graph
 * neighborhood, so a caller sees the wiring/doc/test fabric around a topic, not
 * isolated points.
 *
 * MEMORY-SAFETY (the load-bearing constraint). `blast-radius` in
 * system-viz-query.mjs rebuilds adjacency from `G.edges` AFTER a full
 * loadGraph() -- the ~770MB graph into V8 heap. That is fine for an occasional
 * CLI call but fatal in any hot path (the documented find-OOM class; see
 * system-viz-graph.mjs CONTRACT AMENDMENT). This module NEVER calls loadGraph().
 * It composes only the two compact sidecars:
 *   - find-cache.json  (~65MB) via loadFindCache() -- seed search + id->meta labels
 *   - node-adjacency.json (~96MB) -- precomputed bidirectional adjacency
 *     ({adjacency:{<id>:{in:[{id,type}],out:[{id,type}]}}}, capped 8/dir),
 *     produced by scripts/build-viz-adjacency.mjs / regen-viz.mjs.
 * Both are well under V8's ~512MB string ceiling, so a plain JSON.parse is safe;
 * the heaviest call materializes ~160MB of JSON, not 770MB.
 *
 * Exports:
 *   loadAdjacency(opts?)               -- parse node-adjacency.json (mtime-cached, fail-loud)
 *   bfsSubgraph(seedIds, adjacency, o) -- bounded BFS, honest `truncated` flag
 *   retrieveSubgraph(query, opts, di)  -- find seeds -> BFS -> enrich labels
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadFindCache, findInGraph } from "./system-viz-graph.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// scripts/lib/ -> scripts/ -> project root
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_ADJ = path.join(ROOT, "state", "shared", "system-viz", "node-adjacency.json");

// Defaults as named constants (not inline magic numbers).
const DEFAULT_MAX_DEPTH = 2; // hops from the nearest seed
const DEFAULT_MAX_NODES = 40; // total node budget (seeds + neighborhood)
const DEFAULT_SEED_LIMIT = 6; // seed hits taken from find()
const VIA_CAP = 4; // max relationship edges recorded per already-visited node

// Read at CALL time (not module-eval) so tests can point at a temp fixture
// without touching the live 96MB production sidecar -- mirrors system-viz-graph's
// graphPath()/findCachePath() pattern (regression-defense: a hard-coded prod
// path in a test once deleted the live file).
function adjPath() {
  return process.env.PRISM_VIZ_ADJ_PATH || DEFAULT_ADJ;
}

/** Module-scope cache keyed on the adjacency file's mtime + size. */
let _adjCache = null;

/**
 * Load + parse node-adjacency.json. Cached in-process keyed on mtime+size; a
 * concurrent rewrite can only cause a false miss (re-parse), never a false hit
 * (stale bytes) -- stat is taken before the read. FAILS LOUD (throws a
 * descriptive Error pointing at the rebuild command) when the file is
 * missing/unreadable/corrupt/schema-mismatched, so a caller can never silently
 * treat an unavailable graph as an empty neighborhood (R12).
 *
 * @param {object}  [opts]
 * @param {boolean} [opts.fresh=false] -- bypass + do not populate the cache.
 * @returns {{adjacency: object, [k:string]: any}} parsed sidecar
 * @throws {Error} descriptive (stat/read/parse/schema) failure
 */
export function loadAdjacency({ fresh = false } = {}) {
  const p = adjPath();
  let st;
  try {
    st = fs.statSync(p);
  } catch (e) {
    throw new Error(
      `Cannot stat node-adjacency at ${p}.\n  ${e.message}\n  Run: node scripts/build-viz-adjacency.mjs`
    );
  }
  if (!fresh && _adjCache && _adjCache.mtimeMs === st.mtimeMs && _adjCache.size === st.size) {
    return _adjCache.data;
  }
  let raw;
  try {
    raw = fs.readFileSync(p, "utf8");
  } catch (e) {
    throw new Error(
      `Cannot read node-adjacency at ${p}.\n  ${e.message}\n  Run: node scripts/build-viz-adjacency.mjs`
    );
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    throw new Error(`Cannot parse node-adjacency at ${p}.\n  ${e.message}`);
  }
  if (!data || typeof data.adjacency !== "object" || data.adjacency === null) {
    throw new Error(
      `node-adjacency at ${p} is missing the 'adjacency' map (schema mismatch).\n  Run: node scripts/build-viz-adjacency.mjs`
    );
  }
  if (!fresh) _adjCache = { mtimeMs: st.mtimeMs, size: st.size, data };
  return data;
}

/**
 * Bounded breadth-first expansion of a connected subgraph around seed nodes.
 *
 * Visited-set BFS (same shape as blast-radius's `walk`), but over the precomputed
 * adjacency map instead of a freshly-built one, and bidirectional in a single
 * pass. Each non-seed node records the `via` edge(s) that reached it (capped) so
 * the caller can render the RELATIONSHIP, not just the node. The node budget
 * bounds the NEIGHBORHOOD: seeds are ALWAYS retained (dropping a seed = dropping
 * a real query hit), and any node cut -- or seeds alone exceeding the budget --
 * sets `truncated:true`, never a silent overrun (R12).
 *
 * @param {string[]} seedIds          -- starting node ids (deduped internally)
 * @param {object}   adjacency        -- the `.adjacency` map from loadAdjacency()
 * @param {object}   [opts]
 * @param {number}   [opts.maxDepth]   -- hops from the nearest seed (default 2)
 * @param {number}   [opts.maxNodes]   -- total node budget (default 40)
 * @param {"both"|"out"|"in"} [opts.direction] -- edge directions (default "both")
 * @returns {{nodes: Array<{id,depth,seed,via:Array}>, truncated:boolean, seedCount:number}}
 */
export function bfsSubgraph(
  seedIds,
  adjacency,
  { maxDepth = DEFAULT_MAX_DEPTH, maxNodes = DEFAULT_MAX_NODES, direction = "both" } = {}
) {
  const adj = adjacency || {};
  // visited: id -> { depth, seed, via: [{from,type,dir}] }
  const visited = new Map();
  const seeds = [];
  for (const s of Array.isArray(seedIds) ? seedIds : []) {
    if (typeof s === "string" && !visited.has(s)) {
      visited.set(s, { depth: 0, seed: true, via: [] });
      seeds.push(s);
    }
  }
  // Seeds alone exceeding the budget is an honest overrun (we never drop a real
  // hit) -- flag it so the documented cap cannot lie. The per-neighbor guard
  // below handles the during-expansion case.
  let truncated = visited.size > maxNodes;
  let frontier = [...seeds];

  for (let depth = 1; depth <= maxDepth && frontier.length; depth++) {
    const next = [];
    for (const f of frontier) {
      const a = adj[f];
      if (!a) continue;
      const edges = [];
      if (direction === "both" || direction === "out") {
        for (const e of Array.isArray(a.out) ? a.out : []) edges.push({ e, dir: "out" });
      }
      if (direction === "both" || direction === "in") {
        for (const e of Array.isArray(a.in) ? a.in : []) edges.push({ e, dir: "in" });
      }
      for (const { e, dir } of edges) {
        if (!e || typeof e.id !== "string" || e.id === f) continue;
        const existing = visited.get(e.id);
        if (existing) {
          // Already in the subgraph -- enrich its `via` with this additional
          // relationship (capped) for richer context, but DO NOT re-expand (the
          // visited-set guarantees each node is expanded exactly once).
          if (
            existing.via.length < VIA_CAP &&
            !existing.via.some((v) => v.from === f && v.type === e.type && v.dir === dir)
          ) {
            existing.via.push({ from: f, type: e.type, dir });
          }
          continue;
        }
        if (visited.size >= maxNodes) {
          truncated = true;
          continue; // budget exhausted -- keep scanning to enrich existing nodes only
        }
        visited.set(e.id, { depth, seed: false, via: [{ from: f, type: e.type, dir }] });
        next.push(e.id);
      }
    }
    frontier = next;
  }

  const nodes = [...visited.entries()].map(([id, m]) => ({ id, ...m }));
  return { nodes, truncated, seedCount: seeds.length };
}

/**
 * Retrieve a connected subgraph for a free-text query.
 *
 * Pipeline (all cheap, no loadGraph): find-cache search -> top-K seeds ->
 * bidirectional bounded BFS over node-adjacency -> enrich every node with
 * label/layer/kind/noteCount from the find-cache projection (it carries every
 * node, so neighborhood nodes get labels for free). Output is depth-then-doc
 * sorted so the most-connected, best-documented context surfaces first.
 *
 * The `stale`/`cold` flags from loadFindCache are propagated so a caller can
 * tell an empty result (cold sidecar) from a genuine 0-hit query (R12).
 *
 * @param {string} query
 * @param {object} [opts]  {maxDepth, maxNodes, seedLimit, direction}
 * @param {object} [di]    DI seam for hermetic tests {loadFindCache, loadAdjacency, findInGraph}
 * @returns {{query, seeds, nodes, truncated, counts, stale, cold}}
 */
export function retrieveSubgraph(
  query,
  { maxDepth = DEFAULT_MAX_DEPTH, maxNodes = DEFAULT_MAX_NODES, seedLimit = DEFAULT_SEED_LIMIT, direction = "both" } = {},
  di = {}
) {
  const _loadFindCache = di.loadFindCache || loadFindCache;
  const _loadAdjacency = di.loadAdjacency || loadAdjacency;
  const _findInGraph = di.findInGraph || findInGraph;

  const q = (query == null ? "" : String(query)).trim();
  if (!q) throw new Error("retrieveSubgraph: query is required");

  const fc = _loadFindCache(); // { nodes: [...all projected nodes], stale?, cold? }
  const allNodes = Array.isArray(fc.nodes) ? fc.nodes : [];
  const seeds = _findInGraph(fc, q, { limit: seedLimit });

  // id -> projected meta (label/layer/kind/noteCount) for the WHOLE graph, so
  // neighborhood nodes (not just seeds) get human labels with no extra read.
  const meta = new Map();
  for (const n of allNodes) meta.set(n.id, n);

  const adjData = _loadAdjacency();
  const sub = bfsSubgraph(seeds.map((s) => s.id), adjData.adjacency, { maxDepth, maxNodes, direction });

  const enriched = sub.nodes
    .map((n) => {
      const m = meta.get(n.id) || {};
      return {
        ...n,
        label: String(m.label || "").split("\n")[0],
        layer: m.layer ?? null,
        kind: m.kind ?? null,
        noteCount: m.noteCount || 0,
      };
    })
    // seeds first (depth 0), then by depth, then best-documented, then stable by id
    .sort((a, b) => a.depth - b.depth || b.noteCount - a.noteCount || a.id.localeCompare(b.id));

  return {
    query: q,
    seeds: seeds.map((s) => ({ id: s.id, label: String(s.label || "").split("\n")[0], layer: s.layer ?? null })),
    nodes: enriched,
    truncated: sub.truncated,
    counts: { seeds: seeds.length, total: enriched.length, cap: maxNodes },
    stale: !!fc.stale,
    cold: !!fc.cold,
  };
}

/** Test-only white-box seam. NOT part of the public contract. */
export const __test = {
  adjPath,
  defaultAdjPath: () => DEFAULT_ADJ,
  resetCache: () => {
    _adjCache = null;
  },
  constants: () => ({ DEFAULT_MAX_DEPTH, DEFAULT_MAX_NODES, DEFAULT_SEED_LIMIT, VIA_CAP }),
};
