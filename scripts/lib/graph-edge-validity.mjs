/**
 * scripts/lib/graph-edge-validity.mjs — the ONE canonical predicate for
 * "does this system-graph edge count toward node degree?".
 *
 * WHY THIS EXISTS (U-SIERRA-MASTERINDEX-SIDECAR-ROBUSTNESS, 2026-07-05): the
 * degree-sidecar work computes in/out-degree in TWO independent readers — the
 * emitter `scripts/build-graph-index.mjs` (writes the degree block) and the
 * consumer `mcp-server/src/engines/MasterIndexEngine.ts` (walks raw edges on the
 * under-cap path). If those two predicates ever diverge (someone adds an
 * `intensity > 0` or edge-type filter to one and not the other), degrees silently
 * disagree between the raw-graph path and the sidecar path — misclassifying hubs
 * as orphans fleet-wide with NO failing test (the round-trip test's oracle was a
 * THIRD hand-copy). Centralizing the predicate here makes divergence a compile/
 * import-level event, not a silent data bug. `graph-edge-validity.test.mjs` pins
 * the contract, and a cross-file tripwire asserts MasterIndexEngine's inline copy
 * stays byte-identical (the .ts build boundary blocks a direct import).
 *
 * Contract: an edge contributes to degree IFF it is a non-null object whose
 * `from` AND `to` are both strings. Mirrors the historical inline predicate
 * exactly — do NOT add filters here without updating BOTH the sidecar emitter and
 * MasterIndexEngine.buildGraphCache in the same commit.
 */

/**
 * @param {*} e  a raw system-graph edge
 * @returns {boolean} true if the edge counts toward in/out-degree
 */
export function isValidEdge(e) {
  return !!e && typeof e.to === "string" && typeof e.from === "string";
}

/**
 * The canonical predicate source text, for a cross-file byte-identity tripwire
 * test that guards MasterIndexEngine.ts's inline copy — the ONLY remaining inline
 * copy (it cannot import this module across the TS build boundary). The emitter
 * build-graph-index.mjs and the test oracle both import `isValidEdge` above, so
 * they can't drift; keep this string in sync with MasterIndexEngine.buildGraphCache's
 * inline `continue` guard only.
 */
export const CANONICAL_EDGE_VALIDITY_PREDICATE =
  'if (!e || typeof e.to !== "string" || typeof e.from !== "string") continue;';
