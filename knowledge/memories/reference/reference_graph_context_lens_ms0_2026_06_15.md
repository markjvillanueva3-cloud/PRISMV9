---
name: reference_graph_context_lens_ms0_2026_06_15
description: "GRAPH-AS-LLM-CONTEXT-MS0/U-GAC01 shipped (slot:sierra, 2026-06-15, commit 75cdffff70). GraphContextLensEngine = scoped ego-graph of the system-viz graph as LLM context, via the bounded adjacency sidecar + seekCard (NOT the 644MB graph). Wired prism_ai:graph_context_lens_extract. 27 tests. Keystone of the 8-unit milestone."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.600Z
aliases: reference_graph_context_lens_ms0_2026_06_15
---


# GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC01 -- GraphContextLensEngine (2026-06-15, slot:sierra)

Picked off the roadmap after the system-bug push-through. Keystone unit (blocks U-GAC02/04/05;
everything in the 8-unit milestone depends on it). Commit `75cdffff70` on `cad-fusion-live-ms0`.

## What shipped
- `mcp-server/src/engines/GraphContextLensEngine.ts` -- ego-graph extraction as scoped LLM context.
  Methods: `extractEgoGraph(nodeId,hops)` (BFS in+out, cycle-safe, node-capped, induced edges),
  `extractByDomain(domain)`, `summarizeCommunity(nodes)`, `render(ego, json|markdown|mermaid)`.
- Wired `prism_ai:graph_context_lens_extract` (aiReasoningDispatcher VICTOR_AI_DIRECT group:
  action tuple + Zod schema with a nodeId|domain `.refine` + handler case).
- 27 tests: `GraphContextLensEngine.test.ts` (23, incl a live-data smoke on the real 96MB sidecar)
  + `AIReasoningDispatcher.graphContextLens-wire.test.ts` (4 round-trip through the dispatcher).
- Wiki [[graph-context-lens-engine]]; envelope U-GAC01 -> complete (completed_units 1/8).

## KEY DESIGN DECISION (deviation from the literal spec, justified R7)
The atomized spec said "read system-graph.json" (644MB ~= 186K tokens = OOM/timeout, the exact
anti-pattern CHEAP-NODE-ACCESS-MS0 fixed). Instead the engine reads the BOUNDED adjacency sidecar
`state/shared/system-viz/node-adjacency.json` (from `scripts/build-viz-adjacency.mjs`, per-node K
in/out) for BFS + `seekCard` (CHEAP-NODE-ACCESS) for node enrichment. Fulfils the INTENT (scoped
slices) with zero full-graph load; reuses existing sierra substrate instead of duplicating traversal.
[[reference_cheap_node_access_ms0_2026_06_04]] is the lineage.

## Gotchas captured
- Dispatcher result shape: handler sets `result = <bareData>`; `executeAIReasoningAction` tail does
  `slimResponse(result)` + `return {success, data: slimmed}` -> callers read `r.data.*` directly.
  Some sibling cases wrongly pre-wrap in `{success,data}` (double-wrap) -- do NOT copy that.
- Path resolution: `PRISM_VIZ_ADJ_PATH` env -> cwd candidates -> win32 last-resort; cached by
  (path, mtime). import.meta.url is unreliable post-esbuild-bundle, so cwd-candidates not import.meta.
- mcp-server TS imports scripts/lib/*.mjs via `await import("../../../scripts/lib/X.mjs" as string)`
  (the `as string` makes it tsc-safe; established pattern, e.g. PRISMContextInjectorEngine).
- Task-freshness gate fired (envelope 835h/5050-commits old) -> verified genuinely-unbuilt before
  `--ack-stale` (no engine, no action, no build commit, no peer claim). [[feedback_task_freshness_pre_build]].

## 2-agent per-file scrutiny
A (code-analyzer) FAIL -> 2 P1 fixed: (1) loadAdjacency now caches by (path,mtime) regardless of
override (was re-parsing 96MB per call on the adjacencyPath path); (2) tryPrevious uses robust
`.json->.previous.json` sibling (was a fragile endsWith). B (reviewer) PASS. P2s also addressed
(mermaid bracket-escape, honest topByDegree->sample, win32-gated hard path, hops=0 doc). 27/27 green.

## Next units (not started)
U-GAC02 GraphRAG retrieval (depends GAC01), U-GAC03 code-graph projection, U-GAC04 dual-channel
context, U-GAC05 spatial-UI coordination, U-GAC06 community summaries, U-GAC07 stale-graph guard
hook, U-GAC08 hallucinated-node-id guard hook.

Related: [[reference_cheap_node_access_ms0_2026_06_04]] · [[reference_system_bug_audit_2026_06_14]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]]
