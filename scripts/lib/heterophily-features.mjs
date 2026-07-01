#!/usr/bin/env node
/**
 * heterophily-features.mjs — BLACKWELL-AI-MS0 (slot:india).
 *
 * H2GCN-style ego/neighbour-separated, higher-order graph feature aggregation, ported
 * to pure JS for the STANDALONE GraphSAGE script runtime (`scripts/lib/*.mjs`).
 *
 * MIRRORS `mcp-server/src/algorithms/HeterophilyAwareAggregator.ts` (commit 985e96ec37,
 * slot:tango — H2GCN, Zhu et al. 2020 "Beyond Homophily in Graph Neural Networks", NeurIPS).
 * The TS is the source-of-truth contract; this is its runtime twin. The `.mjs` pipeline
 * (`graphsage-train-pipeline.mjs`) CANNOT import the esbuild-bundled TS algorithm (no
 * ts-node in the standalone runtime — the same reason `graphsage-model.mjs` re-states the
 * model math instead of importing it). Behaviour here is byte-faithful to the TS
 * `calculate()`: identical ego/neighbour separation, exactly-k-hop BFS buckets, mean|sum
 * aggregation, zero-block-for-isolated-hop semantics, and the same dropped-self-loop /
 * deduped-edge / isolated-node warnings. **Keep the two in sync if either changes.**
 *
 * WHY india needs it: the live 543-node GraphSAGE embeddings are DEGENERATE (meanCosine
 * 0.861, centroidNorm 0.928 — see scripts/nn-graph-embedding-degeneracy.mjs +
 * [[reference_gnn_edge_predict_foundation_2026_06_08]]). On PRISM's HETEROPHILOUS wiring
 * graph (engine↔dispatcher = different node types), vanilla ego+neighbour BLENDING destroys
 * signal — the documented root cause of the deferred NN/GNN deploy gate (link-pred AUROC
 * ≈ 0.096). Feeding `z = [ego ‖ agg(N1) ‖ … ‖ agg(NH)]` (this transform) instead of plain
 * features into the pipeline is the model-side lever to recover that signal. GPU is LIVE
 * (3.13 venv, torch 2.11+cu128 sm_120 — [[feedback_build_for_blackwell_hardware]]) so the
 * downstream re-embed has no install gate; this lib is the GPU-free verifiable core that the
 * pipeline-integration unit sits on (R13 logical order — core before integration).
 *
 * Output per node i (d-dim input features, maxHops = H):
 *   z_i = [ x_i ‖ agg(N₁(i)) ‖ … ‖ agg(N_H(i)) ]   ∈ ℝ^{d·(1+H)},  agg = mean|sum
 * where N_k(i) = nodes at shortest-path distance EXACTLY k. Isolated hop → zero block.
 *
 * Two surfaces:
 *   - heterophilyAggregate({features:number[][], edges:[u,v][], maxHops, normalize})
 *       — index-based core, byte-faithful to the TS; throws on invalid input (fail-loud).
 *   - heterophilyAggregateMap(featuresMap, edges, opts)
 *       — pipeline adapter: Map<string,number[]> + string/obj edges → augmented Map, with
 *         out-of-feature-set edges dropped (counted, never silent).
 *
 * @milestone BLACKWELL-AI-MS0/U-GNN-HETEROPHILY-MJS-PORT
 * @slot india
 * @date 2026-06-09
 */

export const DEFAULT_MAX_HOPS = 2;
export const MAX_REASONABLE_HOPS = 16;

function isFiniteNumber(x) {
  return typeof x === "number" && Number.isFinite(x);
}

/**
 * Validate the index-based input. Mirrors the TS `validate()` — returns
 * {valid, errors:string[], warnings:string[]} rather than throwing, so callers can
 * branch; `heterophilyAggregate` throws when !valid.
 * @param {{features:number[][], edges:Array<[number,number]>, maxHops?:number, normalize?:string}} input
 */
export function validateInput(input) {
  const errors = [];
  const warnings = [];
  const { features, edges } = input ?? {};

  let d = -1;
  if (!Array.isArray(features) || features.length === 0) {
    errors.push("features must be a non-empty n×d matrix.");
  } else {
    d = Array.isArray(features[0]) ? features[0].length : -1;
    if (d < 1) {
      errors.push("feature rows must have dimension ≥ 1.");
    } else {
      for (let i = 0; i < features.length; i++) {
        const row = features[i];
        if (!Array.isArray(row) || row.length !== d) {
          errors.push(`ragged matrix: row ${i} length ${row?.length} ≠ ${d}.`);
          break;
        }
        let bad = false;
        for (let j = 0; j < row.length; j++) {
          if (!isFiniteNumber(row[j])) {
            errors.push("feature values must be finite (no NaN/Infinity).");
            bad = true;
            break;
          }
        }
        if (bad) break;
      }
    }
  }

  const n = Array.isArray(features) ? features.length : 0;
  if (!Array.isArray(edges)) {
    errors.push("edges must be an array of [u,v] pairs.");
  } else {
    for (let e = 0; e < edges.length; e++) {
      const pair = edges[e];
      if (!Array.isArray(pair) || pair.length !== 2 || !Number.isInteger(pair[0]) || !Number.isInteger(pair[1])) {
        errors.push("each edge must be a [int,int] pair.");
        break;
      }
      if (pair[0] < 0 || pair[0] >= n || pair[1] < 0 || pair[1] >= n) {
        errors.push(`edge index out of range [0,${n}).`);
        break;
      }
    }
  }

  if (input?.maxHops !== undefined) {
    if (!Number.isInteger(input.maxHops) || input.maxHops < 1) {
      errors.push("maxHops must be an integer ≥ 1.");
    } else if (input.maxHops > MAX_REASONABLE_HOPS) {
      warnings.push(`maxHops ${input.maxHops} > ${MAX_REASONABLE_HOPS}; embedding width grows linearly — confirm intent.`);
    }
  }
  if (input?.normalize !== undefined && input.normalize !== "mean" && input.normalize !== "sum") {
    errors.push('normalize must be "mean" or "sum".');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/**
 * Undirected adjacency (Set per node) from index edges: dedups, drops self-loops,
 * pushes a warning for dropped self-loops. Mirrors the TS `buildAdjacency`.
 * @param {number} n @param {Array<[number,number]>} edges @param {string[]} warnings
 * @returns {Array<Set<number>>}
 */
export function buildAdjacency(n, edges, warnings) {
  const adj = Array.from({ length: n }, () => new Set());
  let selfLoops = 0;
  for (const [u, v] of edges) {
    if (u === v) {
      selfLoops++;
      continue;
    }
    adj[u].add(v);
    adj[v].add(u);
  }
  if (selfLoops > 0) {
    warnings.push(`Dropped ${selfLoops} self-loop edge(s) — not meaningful for neighbourhood aggregation.`);
  }
  return adj;
}

/**
 * BFS from `src` bucketing reachable nodes by shortest-path distance, capped at maxHops.
 * buckets[k] = node indices at distance EXACTLY k+1. Mirrors the TS `hopBuckets`.
 * @param {Array<Set<number>>} adj @param {number} src @param {number} maxHops
 * @returns {number[][]}
 */
export function hopBuckets(adj, src, maxHops) {
  const dist = new Int32Array(adj.length).fill(-1);
  dist[src] = 0;
  const buckets = Array.from({ length: maxHops }, () => []);
  let frontier = [src];
  for (let h = 1; h <= maxHops && frontier.length > 0; h++) {
    const next = [];
    for (const u of frontier) {
      for (const w of adj[u]) {
        if (dist[w] === -1) {
          dist[w] = h;
          buckets[h - 1].push(w);
          next.push(w);
        }
      }
    }
    frontier = next;
  }
  return buckets;
}

/**
 * Index-based H2GCN feature transform. Byte-faithful to the TS `calculate()`.
 * @param {{features:number[][], edges:Array<[number,number]>, maxHops?:number, normalize?:"mean"|"sum"}} input
 * @returns {{embeddings:number[][], embeddingDim:number, egoDim:number, maxHops:number,
 *            normalize:"mean"|"sum", hopNeighborCounts:number[][], isolatedNodes:number[], warnings:string[]}}
 */
export function heterophilyAggregate(input) {
  const v = validateInput(input);
  if (!v.valid) {
    throw new Error(`heterophilyAggregate: invalid input — ${v.errors.join("; ")}`);
  }
  const warnings = [...v.warnings];
  const features = input.features;
  const n = features.length;
  const d = features[0].length;
  const maxHops = input.maxHops ?? DEFAULT_MAX_HOPS;
  const normalize = input.normalize ?? "mean";

  // Dedup count for a warning (Set adjacency dedups silently otherwise) — TS parity.
  const seen = new Set();
  let dupes = 0;
  for (const [u, w] of input.edges) {
    if (u === w) continue;
    const key = u < w ? `${u}-${w}` : `${w}-${u}`;
    if (seen.has(key)) dupes++;
    else seen.add(key);
  }
  if (dupes > 0) warnings.push(`Deduplicated ${dupes} duplicate undirected edge(s).`);

  const adj = buildAdjacency(n, input.edges, warnings);
  const embeddingDim = d * (1 + maxHops);
  const embeddings = [];
  const hopNeighborCounts = [];
  const isolatedNodes = [];

  for (let i = 0; i < n; i++) {
    const buckets = hopBuckets(adj, i, maxHops);
    const z = new Array(embeddingDim).fill(0);
    for (let j = 0; j < d; j++) z[j] = features[i][j]; // ego block — never blended

    const counts = [];
    for (let h = 0; h < maxHops; h++) {
      const bucket = buckets[h];
      counts.push(bucket.length);
      const base = d * (h + 1);
      if (bucket.length === 0) continue; // zero block (already filled)
      for (const nb of bucket) {
        const row = features[nb];
        for (let j = 0; j < d; j++) z[base + j] += row[j];
      }
      if (normalize === "mean") {
        for (let j = 0; j < d; j++) z[base + j] /= bucket.length;
      }
    }
    if (counts[0] === 0) isolatedNodes.push(i);
    embeddings.push(z);
    hopNeighborCounts.push(counts);
  }

  if (isolatedNodes.length > 0) {
    warnings.push(`${isolatedNodes.length} node(s) have no 1-hop neighbour — ego-only embedding (zero neighbourhood blocks).`);
  }

  return { embeddings, embeddingDim, egoDim: d, maxHops, normalize, hopNeighborCounts, isolatedNodes, warnings };
}

/**
 * Pipeline adapter: transform a string-keyed feature Map (the shape
 * `graphsage-train-pipeline.mjs` carries — from projectGraphFeatures or an embeddingSource)
 * into the H2GCN-augmented feature Map. Edges referencing nodes NOT in `featuresMap` are
 * dropped and COUNTED (`droppedEdges`) — never silent (the pipeline's edge list can span
 * nodes outside the feature-restricted set). Node order = featuresMap insertion order.
 *
 * INTEGRATION CONTRACT: the returned `features` have width `embeddingDim = egoDim·(1+maxHops)`
 * (WIDER than the input). A caller feeding the result into the GraphSAGE pipeline MUST set
 * `createModel({ inputDim: result.embeddingDim })` — `forward()` hard-rejects any feature
 * vector whose length ≠ model.config.inputDim (throws per node). Also: feed the
 * ADJACENCY-DERIVED in-batch edge set (the capped/deduped pipeline edges), NOT the full raw
 * graph edges — raw edges referencing nodes outside the feature set are drop-counted (not a
 * crash) but would silently leave most nodes ego-only.
 *
 * @param {Map<string, number[]>} featuresMap node-id → d-dim feature vector
 * @param {Array<[string,string]|{u:string,v:string}|{source:string,target:string}>} edges
 * @param {{maxHops?:number, normalize?:"mean"|"sum"}} [opts]
 * @returns {{features: Map<string, number[]>, embeddingDim:number, egoDim:number, maxHops:number,
 *            normalize:string, isolatedNodes:string[], droppedEdges:number, keptEdges:number, warnings:string[]}}
 */
export function heterophilyAggregateMap(featuresMap, edges, opts = {}) {
  if (!(featuresMap instanceof Map) || featuresMap.size === 0) {
    throw new Error("heterophilyAggregateMap: featuresMap must be a non-empty Map<string, number[]>.");
  }
  const nodeIds = [...featuresMap.keys()];
  const idToIdx = new Map(nodeIds.map((id, i) => [id, i]));
  // Normalize each row to a plain number[] via Array.from: the pure core uses
  // Array.isArray (mirroring the TS number[][] contract), but the GraphSAGE pipeline
  // carries feature vectors as Float64Array (projectGraphFeatures) -- a typed array
  // would fail validateInput's Array.isArray check. Array.from also copies, so the
  // caller's vectors are never mutated. (forward() re-copies into Float64Array anyway.)
  const features = nodeIds.map((id) => Array.from(featuresMap.get(id)));

  const idxEdges = [];
  let droppedEdges = 0;
  for (const e of edges ?? []) {
    let u, w;
    if (Array.isArray(e)) {
      u = e[0];
      w = e[1];
    } else if (e && typeof e === "object") {
      u = e.u ?? e.source;
      w = e.v ?? e.target;
    }
    const iu = idToIdx.get(u);
    const iw = idToIdx.get(w);
    if (iu === undefined || iw === undefined) {
      droppedEdges++;
      continue;
    }
    idxEdges.push([iu, iw]);
  }

  const res = heterophilyAggregate({
    features,
    edges: idxEdges,
    maxHops: opts.maxHops,
    normalize: opts.normalize,
  });

  const outMap = new Map();
  for (let i = 0; i < nodeIds.length; i++) outMap.set(nodeIds[i], res.embeddings[i]);
  const isolatedNodes = res.isolatedNodes.map((i) => nodeIds[i]);
  const warnings = [...res.warnings];
  if (droppedEdges > 0) {
    warnings.push(`Dropped ${droppedEdges} edge(s) referencing nodes outside the feature set.`);
  }

  return {
    features: outMap,
    embeddingDim: res.embeddingDim,
    egoDim: res.egoDim,
    maxHops: res.maxHops,
    normalize: res.normalize,
    isolatedNodes,
    droppedEdges,
    keptEdges: idxEdges.length,
    warnings,
  };
}
