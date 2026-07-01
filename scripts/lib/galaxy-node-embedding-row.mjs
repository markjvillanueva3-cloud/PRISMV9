/**
 * galaxy-node-embedding-row.mjs -- build GNN node-feature rows for the 34 galaxy roost
 * nodes (AI-SYNERGY-AUDIT-MS0/U-AISYN-GNN-NODEFEAT, slot:charlie, operator-authorized
 * cross-galaxy build into india's NN/GNN substrate).
 *
 * The GraphSAGE trainer (graphsage-train-pipeline.mjs loadEmbeddingFeatures) consumes a
 * 768-d node-feature source state/shared/nn-graph/node-embeddings-768d.jsonl of {n,q:int8[]}
 * rows keyed by GRAPH NODE ID; it dequantizes q[i]/127. Today that file covers ~771 nodes
 * and ZERO galaxy roosts -- so the GNN has no semantic feature for the 34 `ghost.galaxy.<g>`
 * nodes it must classify. This module mints those rows from each galaxy's doctrine corpus,
 * REUSING india's exact convention (R8): aggregateEmbeddings (L2-normalized centroid of the
 * doc embeddings) -> quantizeInt8, the same path nodeToEmbeddingRow uses for engine nodes.
 *
 * PURE (the embedding I/O is the caller's): buildGalaxyEmbeddingRow + galaxyNodeId +
 * mergeRows are deterministic and reference-value testable (R9).
 */

import { aggregateEmbeddings, quantizeInt8 } from "./graph-node-embedding-bridge.mjs";

/** Canonical GNN graph node id for a galaxy roost (matches the cross-substrate edge form). */
export function galaxyNodeId(galaxy) {
  return `ghost.galaxy.${String(galaxy).trim()}`;
}

/**
 * Build one {n, q} GNN feature row for a galaxy from its doctrine-doc embedding vectors.
 * Aggregates (L2-normalized centroid) then int8-quantizes -- india's nodeToEmbeddingRow
 * convention. Returns null when there is no usable embedding (0 vectors / all-zero centroid).
 * PURE (vectors injected).
 * @param {string} galaxy
 * @param {number[][]} vectors per-doc embedding vectors (e.g. nomic-embed-text 768d)
 * @returns {{n:string,q:number[]}|null}
 */
export function buildGalaxyEmbeddingRow(galaxy, vectors) {
  if (typeof galaxy !== "string" || !galaxy.trim()) return null;
  const vecs = Array.isArray(vectors) ? vectors.filter((v) => Array.isArray(v) && v.length) : [];
  if (!vecs.length) return null;
  let agg;
  try {
    // aggregateEmbeddings: L2 -> mean -> L2 centroid; returns {vector, hits, dim} or null.
    agg = aggregateEmbeddings(vecs);
  } catch {
    return null; // empty / dim-mismatch / non-finite -> skip (never corrupts the source)
  }
  if (!agg || !agg.vector || !agg.vector.length) return null;
  let q;
  try {
    q = quantizeInt8(agg.vector);
  } catch {
    return null;
  }
  return { n: galaxyNodeId(galaxy), q };
}

/**
 * Merge new node-feature rows into the existing parsed rows, deduped by `n` (new wins).
 * The `__meta` header row (identified by `__meta:true`) is preserved/updated separately by
 * the caller. PURE: returns a NEW array, input untouched.
 * @param {Array<{n:string,q:number[]}>} existingRows non-meta rows already in the source
 * @param {Array<{n:string,q:number[]}>} newRows galaxy rows to add/replace
 * @returns {Array<{n:string,q:number[]}>}
 */
export function mergeRows(existingRows, newRows) {
  const byId = new Map();
  for (const r of Array.isArray(existingRows) ? existingRows : []) {
    if (r && typeof r.n === "string") byId.set(r.n, r);
  }
  for (const r of Array.isArray(newRows) ? newRows : []) {
    if (r && typeof r.n === "string") byId.set(r.n, r); // new wins (idempotent re-run replaces)
  }
  return [...byId.values()];
}
