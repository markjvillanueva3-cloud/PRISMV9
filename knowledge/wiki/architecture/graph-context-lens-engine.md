---
title: GraphContextLensEngine (ego-graph as LLM context)
type: architecture
layer: L6
created: 2026-06-15
slot: sierra
unit: GRAPH-AS-LLM-CONTEXT-MS0/U-GAC01
tags: [system-viz, graph, llm-context, ego-graph, graphrag, cheap-node-access, prism_ai]
related:
  - cheap-node-access-ms0
  - system-viz-query
  - build-viz-adjacency
---

# GraphContextLensEngine

Keystone of **GRAPH-AS-LLM-CONTEXT-MS0** (slot:sierra, commit `75cdffff70`). Makes the
live PRISM /system-viz graph (~345K nodes / 11 layers) directly addressable as **scoped**
LLM context: an agent gets the small ego-graph around a target node, not the 644MB whole.

## Why (the design deviation)

The atomized spec said "read `state/shared/system-viz/system-graph.json`" (the 644MB merged
graph ~= 186K tokens to parse -- the exact OOM/timeout anti-pattern CHEAP-NODE-ACCESS-MS0 and
the sierra soul forbid). Instead the engine reads the **bounded adjacency sidecar**
(`state/shared/system-viz/node-adjacency.json`, produced by `scripts/build-viz-adjacency.mjs`:
per-node K in/out neighbors) for BFS, and enriches node data via the CHEAP-NODE-ACCESS
`seekCard` seek index. Same INTENT (scoped slices), zero full-graph load, reuses existing
substrate rather than duplicating traversal. This is the [[schema-read-blindness-and-green-but-blind-tests|verify-the-real-thing]] principle applied to a build choice: fulfil the unit's purpose, not its literal byte.

## API (`mcp-server/src/engines/GraphContextLensEngine.ts`)

- `extractEgoGraph(nodeId, hops=1, opts)` -> `EgoGraph` -- BFS over in+out neighbors, cycle-safe
  (visited set), node-capped (`maxNodes` default 200, `hops` clamped to 12). Returns
  `{center, requestedHops, effectiveHops, nodeCount, edgeCount, truncated, warnings, nodes, edges}`
  with **induced edges** (every edge whose both endpoints are in the set, once).
- `extractByDomain(domain, opts)` -> `EgoGraph` -- all nodes whose id carries the domain segment
  (`eng.mill.*`, `ghost.galaxy.mill`, ...) + their interconnections.
- `summarizeCommunity(nodes)` -> `{total, byLayer, byKind, byStatus, sample}` -- compact rollup.
- `render(ego, "json"|"markdown"|"mermaid")` -> string -- projection for direct LLM consumption.

Singleton: `graphContextLensEngine`. Adjacency path resolves via `PRISM_VIZ_ADJ_PATH` env ->
cwd candidates (repo-root or mcp-server) -> Windows last-resort; cached by (path, mtime).
**Fail-loud (R12):** missing/corrupt sidecar throws with a `build-viz-adjacency.mjs` recovery
hint (falls back to a `.previous.json` sibling if present); never silently returns an empty graph.

## Dispatcher

`prism_ai:graph_context_lens_extract` (aiReasoningDispatcher, VICTOR_AI_DIRECT group). Params:
`{nodeId? | domain? (one required, schema .refine), hops?, maxNodes?, format?, enrich?}`. Returns
the `EgoGraph` (plus `rendered` when `format != json`) directly in `r.data`.

## Tests

`GraphContextLensEngine.test.ts` (23: 1/2/3-hop reference counts, unknown/empty/oversized/malformed/
missing, cycle-safety, adversarial shell-char id, domain, summary, render formats, **live-data smoke**
on the real 96MB sidecar) + `AIReasoningDispatcher.graphContextLens-wire.test.ts` (4 round-trip
through the dispatcher incl schema-reject). 27 total, all real reference values (no stubs).

## Next in the milestone

U-GAC02 GraphRAG retrieval, U-GAC03 code-graph projection, U-GAC04 dual-channel context,
U-GAC05 spatial-UI coordination, U-GAC06 community summaries, U-GAC07 stale-graph guard,
U-GAC08 hallucinated-node-id guard -- all depend on this engine.
