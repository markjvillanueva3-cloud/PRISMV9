#!/usr/bin/env node
/**
 * edge-typology-normalizer.mjs — NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE
 *
 * Normalize the 49 raw edge types in system-viz/system-graph.json down to a
 * 7-type core ontology suitable for GraphSAGE message-passing. The original
 * raw type is preserved on every normalized edge so no information is lost.
 *
 * Why 7? Empirically, GraphSAGE on heterogeneous knowledge graphs converges
 * better with a smaller, semantically-coherent edge typology. The 49-type
 * raw ontology has too many rare classes (e.g., `consensus_peer`=1, `read`=3)
 * — the GNN can't learn meaningful aggregation weights for them.
 *
 * The 7-type core:
 *   imports     — static/lazy/dynamic import relationships
 *   calls       — function invocations, hook fires, dispatcher delegations
 *   references  — cross-references, wiki links, citations
 *   contains    — filesystem and structural containment
 *   wires       — dispatcher/registry/route bindings, validations, tests
 *   composes    — proposed/suggested wirings, design intent, synthesis
 *   ghost-wire  — long-tail uncategorized + transport + ghost relationships
 *
 * Pure-export contract (no side effects in import):
 *   EDGE_TYPE_MAP                   frozen 49 → 7 raw→core lookup
 *   EDGE_TYPE_MAP_VERSION           = 1 (bumps force GNN retraining)
 *   CORE_EDGE_TYPES                 frozen array of the 7 core types
 *   normalizeEdgeType(raw)          raw → core (unknown → "ghost-wire" + log)
 *   normalizeGraph(graph)           graph copy with each edge.type → core, .rawType preserved
 *
 * @milestone NN-GRAPH-MS0
 * @unit U-NNG-EDGE-NORMALIZE
 */

/** Version stamp — bump on ontology changes (forces GNN retraining). */
export const EDGE_TYPE_MAP_VERSION = 1;

/** The 7 core edge types. Frozen to prevent accidental mutation. */
export const CORE_EDGE_TYPES = Object.freeze([
  "imports",
  "calls",
  "references",
  "contains",
  "wires",
  "composes",
  "ghost-wire",
]);

/**
 * 49 → 7 mapping. Frozen.
 * Source of the 49: live audit of system-viz/system-graph.json on 2026-05-16
 * (372,731 nodes / 591,479 edges).
 */
export const EDGE_TYPE_MAP = Object.freeze({
  // imports
  "engine_import": "imports",
  "lazy_import": "imports",
  "import": "imports",

  // calls
  "use": "calls",
  "uses": "calls",
  "fire": "calls",
  "hook_invoke": "calls",
  "request": "calls",
  "delegate": "calls",

  // references
  "cross_ref": "references",
  "wiki_link": "references",
  "wiki_cross_ref": "references",
  "reference": "references",
  "tip": "references",

  // contains
  "fs-contains": "contains",
  "contains": "contains",
  "parent": "contains",
  "embedded": "contains",

  // wires
  "register": "wires",
  "route": "wires",
  "validate": "wires",
  "gate": "wires",
  "feeds_combo": "wires",
  "tested_by": "wires",

  // composes
  "suggested_peer": "composes",
  "suggested_wire": "composes",
  "synthesize": "composes",
  "knowledge_consumes": "composes",
  "designed_for": "composes",
  "planned_for": "composes",

  // ghost-wire (long tail + transport + uncategorized)
  "ghost-wire": "ghost-wire",
  "touched": "ghost-wire",
  "intent": "ghost-wire",
  "observe": "ghost-wire",
  "read": "ghost-wire",
  "persist": "ghost-wire",
  "stream": "ghost-wire",
  "ws": "ghost-wire",
  "http": "ghost-wire",
  "stdio": "ghost-wire",
  "worktree": "ghost-wire",
  "worktree-archived": "ghost-wire",
  "consensus_peer": "ghost-wire",
  "uses_transport": "ghost-wire",
  "offload": "ghost-wire",
  "rate_limit": "ghost-wire",
  "internal": "ghost-wire",
  "demands": "ghost-wire",
  "fs": "ghost-wire",
});

/** Normalize a raw edge type to its core. Unknown raw → "ghost-wire" (safe). */
export function normalizeEdgeType(rawType) {
  if (typeof rawType !== "string" || rawType.length === 0) return "ghost-wire";
  return EDGE_TYPE_MAP[rawType] ?? "ghost-wire";
}

/**
 * Return a deep-ish copy of graph with each edge.type normalized.
 * Original edge.type is preserved as edge.rawType (NEW field).
 *
 * Idempotent: normalizing twice produces the same output as normalizing once
 * (rawType on already-normalized edges is preserved; type stays core).
 *
 * Pure — does NOT mutate the input graph.
 */
export function normalizeGraph(graph) {
  if (!graph || typeof graph !== "object" || !Array.isArray(graph.edges)) {
    throw new TypeError("normalizeGraph: input must be { nodes, edges } object");
  }
  const out = { ...graph };
  // Copy nodes by reference (we don't mutate them)
  out.nodes = graph.nodes;
  // Edges: shallow-copy each, normalize type
  out.edges = graph.edges.map((e) => {
    if (!e || typeof e !== "object") return e;
    const rawType = e.rawType ?? e.type ?? "ghost-wire";
    const coreType = normalizeEdgeType(rawType);
    return { ...e, type: coreType, rawType };
  });
  // Carry the ontology version in meta for auditability
  out.meta = { ...(graph.meta ?? {}), edgeTypologyVersion: EDGE_TYPE_MAP_VERSION };
  return out;
}

/**
 * Inverse helper: given a core type, return all raw types that map to it.
 * Useful for tests + debugging.
 */
export function rawTypesForCore(coreType) {
  return Object.entries(EDGE_TYPE_MAP)
    .filter(([_, c]) => c === coreType)
    .map(([raw]) => raw);
}

/**
 * Count which core types the input graph's edges resolve to.
 * Returns { core1: N1, core2: N2, ... }.
 */
export function coreTypeCounts(graph) {
  const counts = Object.fromEntries(CORE_EDGE_TYPES.map(c => [c, 0]));
  if (!graph || !Array.isArray(graph.edges)) return counts;
  for (const e of graph.edges) {
    const raw = e?.type ?? "ghost-wire";
    counts[normalizeEdgeType(raw)] += 1;
  }
  return counts;
}
