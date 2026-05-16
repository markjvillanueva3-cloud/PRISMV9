#!/usr/bin/env node
/**
 * node-kind-ontology.mjs — NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE companion
 *
 * Frozen enumeration of the canonical node kinds in system-viz/system-graph.json.
 * Used to compute the per-node one-hot block in the GraphSAGE feature vector.
 *
 * Width = NODE_KIND_BUCKETS.length. Out-of-vocab kinds map to "other" so the
 * one-hot is always exhaustive (sum = 1.0 for every node).
 *
 * Why a curated bucket list (not the raw kind set)? The raw graph has ~25
 * distinct kinds, many rare (`ghost-roost` = 1, `tier2_flow` = 3). A GNN
 * trained on raw one-hot would treat these as 25 statistically-equivalent
 * dimensions, but rare kinds add noise + don't generalize. The curated
 * 14-bucket list collapses related kinds (e.g., all `ghost.*` into one
 * `ghost` bucket; all `fs.*` into `fs`) for stable training signal.
 *
 * Pure-export contract:
 *   NODE_KIND_MAP_VERSION         = 1 (bumps force GNN retraining)
 *   NODE_KIND_BUCKETS             frozen array of 14 canonical bucket names
 *   bucketForKind(rawKind)        rawKind → bucket (unknown → "other")
 *   nodeKindOneHot(rawKind)       returns Float32-able number[] of length 14
 *   ONE_HOT_DIM                   = NODE_KIND_BUCKETS.length
 *
 * @milestone NN-GRAPH-MS0
 * @unit U-NNG-EDGE-NORMALIZE
 */

export const NODE_KIND_MAP_VERSION = 1;

/** Canonical 14 buckets. Order matters — index defines one-hot position. */
export const NODE_KIND_BUCKETS = Object.freeze([
  "engine",          // 0
  "dispatcher",      // 1
  "action",          // 2
  "hook",            // 3
  "skill",           // 4
  "wiki_entry",      // 5
  "milestone",       // 6
  "planned_unit",    // 7
  "design_spec",     // 8
  "combo",           // 9
  "ghost",           // 10 (collapses all ghost.* subkinds)
  "fs",              // 11 (collapses all fs.* subkinds)
  "tier",            // 12 (collapses tier2_flow + tier3_specialist)
  "other",           // 13 — out-of-vocab safe default
]);

export const ONE_HOT_DIM = NODE_KIND_BUCKETS.length;

/** Resolves raw `kind` → one of the 14 buckets. */
export function bucketForKind(rawKind) {
  if (typeof rawKind !== "string" || rawKind.length === 0) return "other";
  // Prefix-based collapses
  if (rawKind.startsWith("ghost.") || rawKind === "ghost-roost") return "ghost";
  if (rawKind.startsWith("fs.")) return "fs";
  if (rawKind.startsWith("tier")) return "tier";

  // Direct matches
  switch (rawKind) {
    case "engine": return "engine";
    case "dispatcher": return "dispatcher";
    case "dispatcher.action":
    case "action": return "action";
    case "hook": return "hook";
    case "skill": return "skill";
    case "wiki_entry": return "wiki_entry";
    case "milestone": return "milestone";
    case "planned-unit":
    case "planned_unit": return "planned_unit";
    case "design-spec":
    case "design_spec": return "design_spec";
    case "combo": return "combo";
    default: return "other";
  }
}

/**
 * Compute the one-hot vector for a raw kind.
 * Returns plain Array(14) of 0/1 — caller converts to Float32Array if needed.
 *
 * Invariant: sum of returned array is always exactly 1.0.
 */
export function nodeKindOneHot(rawKind) {
  const bucket = bucketForKind(rawKind);
  const vec = new Array(ONE_HOT_DIM).fill(0);
  const idx = NODE_KIND_BUCKETS.indexOf(bucket);
  // bucketForKind guarantees a valid bucket — indexOf >= 0 always.
  vec[idx] = 1;
  return vec;
}

/** Return all raw kinds that the curated ontology collapses into a bucket. */
export function rawKindsForBucket(bucket) {
  switch (bucket) {
    case "engine": return ["engine"];
    case "dispatcher": return ["dispatcher"];
    case "action": return ["dispatcher.action", "action"];
    case "hook": return ["hook"];
    case "skill": return ["skill"];
    case "wiki_entry": return ["wiki_entry"];
    case "milestone": return ["milestone"];
    case "planned_unit": return ["planned-unit", "planned_unit"];
    case "design_spec": return ["design-spec", "design_spec"];
    case "combo": return ["combo"];
    case "ghost": return ["ghost.*", "ghost-roost"];
    case "fs": return ["fs.*"];
    case "tier": return ["tier2_flow", "tier3_specialist", "tier*"];
    case "other": return ["<unknown>"];
    default: return [];
  }
}

/**
 * Compute bucket-distribution counts across a graph.nodes array.
 * Returns { engine: N, dispatcher: N, ..., other: N }.
 */
export function bucketCounts(graph) {
  const counts = Object.fromEntries(NODE_KIND_BUCKETS.map(b => [b, 0]));
  if (!graph || !Array.isArray(graph.nodes)) return counts;
  for (const n of graph.nodes) {
    counts[bucketForKind(n?.kind)] += 1;
  }
  return counts;
}
