// scripts/lib/refpool-merge.mjs
// Shared idempotent ADD/UPDATE merge for the GNN reference-pool feeders
// (vault-to-gnn-refpool + ghost-wire-outcomes-to-refpool). BUILD-ONCE (R15/R7/R8):
// the merge loop is the churn-prone part -- the original feeders REPLACED a node on
// every id-match (re-stamping the volatile `proposed_at`) and ALWAYS wrote the ~542MB
// system-graph.json, so a durable periodic / post-regen re-apply churned the graph AND
// the GNN retrain drift fingerprint on every run. This single source makes a re-apply
// a true no-op when nothing changed; each feeder owns only its content-equality field
// set (different node shapes: vault has `sourceMemory`, outcome has `sourceLedger`).

/**
 * Two ghost nodes are content-equal across the SIGNIFICANT `fields`. The volatile
 * `proposed_at` stamp and the constant scaffold fields (layer/subgroup/status/size/
 * tier/ghost/proposed_by) are deliberately NOT listed, so a re-apply of an unchanged
 * label is a true no-op (no re-stamp, no write). PURE. Null/undefined -> false (no throw).
 */
export function ghostContentEqual(a, b, fields) {
  if (!a || !b) return false;
  for (const f of fields) if (a[f] !== b[f]) return false;
  return true;
}

/**
 * Idempotent ADD/UPDATE merge of `{ node, edge }` ghosts into a graph object. PURE
 * except it mutates + returns the passed `graph` (the caller owns the streaming
 * read/write). A node is UPDATED only when `contentEqual(prior, node)` is false, so an
 * unchanged ref-pool yields `changed:false` and the caller SKIPS the 542MB write. Edges
 * are ADD-only by (from,to,type) and optional (a ghost may carry only a node). Returns
 * { graph, nodesAdded, nodesUpdated, edgesAdded, changed }.
 */
export function mergeGhostsIntoGraph(graph, ghosts, contentEqual) {
  const nodeById = new Map(graph.nodes.map((n) => [n.id, n]));
  const existingEdgeKeys = new Set(graph.edges.map((e) => `${e.from}::${e.to}::${e.type || ""}`));
  let nodesAdded = 0, nodesUpdated = 0, edgesAdded = 0;
  for (const { node, edge } of ghosts) {
    const prior = nodeById.get(node.id);
    if (!prior) {
      graph.nodes.push(node); nodeById.set(node.id, node); nodesAdded++;
    } else if (!contentEqual(prior, node)) {
      const idx = graph.nodes.findIndex((x) => x.id === node.id);
      if (idx >= 0) { graph.nodes[idx] = node; nodeById.set(node.id, node); nodesUpdated++; }
    }
    if (edge) {
      const key = `${edge.from}::${edge.to}::${edge.type || ""}`;
      if (!existingEdgeKeys.has(key)) { graph.edges.push(edge); existingEdgeKeys.add(key); edgesAdded++; }
    }
  }
  return { graph, nodesAdded, nodesUpdated, edgesAdded, changed: nodesAdded + nodesUpdated + edgesAdded > 0 };
}
