---
name: reference_graphrag_retrieval_ms0_2026_06_15
description: "GRAPH-AS-LLM-CONTEXT-MS0/U-GAC02 shipped (slot:sierra, 2026-06-15, commit 8f2962fa28). GraphRAGRetrievalEngine = GraphRAG over wiki+system-graph: query entity-match (find-cache) -> ego 1-hop expand (U-GAC01) -> rank -> injectable fail-soft summarize. Wired prism_ai:graphrag_retrieve. 15 tests + graphrag-eval recall@3=1.00. 2/8 units."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.600Z
aliases: reference_graphrag_retrieval_ms0_2026_06_15
---


# GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC02 -- GraphRAGRetrievalEngine (2026-06-15, slot:sierra)

Second unit of the roadmap loop (operator: "push through all building ... crons, harnessed loops,
hermes agents", ultracode). Composes on U-GAC01. Commit `8f2962fa28` on `cad-fusion-live-ms0`.

## What shipped
- `mcp-server/src/engines/GraphRAGRetrievalEngine.ts` -- GraphRAG (Edge et al. arXiv:2404.16130).
  retrieve(query, opts): tokenize -> score find-cache nodes (id 3 / label 2 / info 1, priority not
  cumulative) -> top seeds -> ego 1-hop expand each via `graphContextLensEngine.extractEgoGraph`
  (U-GAC01) -> rank (seed bonus + proximity decay) -> summarize. "Wrap not rebuild" (research doctrine).
- Wired `prism_ai:graphrag_retrieve` (aiReasoningDispatcher VICTOR_AI_DIRECT: action + schema + handler,
  bare-data result). Params: query (req), topK, topSeeds, hops, maxNodes, useLlm, noLlm.
- `scripts/graphrag-eval.mjs` -- recall@3 eval on LIVE data: self-re-execs with 8GB heap, esbuild-bundles
  the real engine to a temp ESM, runs 10 domain queries, falsifiable id-match predicate -> recall@3=1.00.
- 15 tests (12 engine incl live find-cache smoke + 3 dispatcher round-trip). Wiki [[graphrag-retrieval-engine]].

## KEY DECISIONS / gotchas
- **Summarizer: deterministic extractive by DEFAULT, Ollama opt-IN via opts.useLlm** (scrutiny B P1:
  a plain retrieve must not incur a surprise 8s Ollama network call). noLlm forces extractive.
- **Ollama model = OLLAMA_MODEL_FALLBACK (env PRISM_OLLAMA_MODEL || qwen2.5-coder:32b)** -- a ROUTING
  default, NOT a physics constant (Agent B over-applied the no-inline-constants rule; ask-ollama.mjs
  itself keeps DEFAULT_MODEL inline -- R11 conformance). Env-overridable closes the drift concern.
- **Eval must be FALSIFIABLE**: first cut matched query term in id+label+info (tautological -- would
  pass on random within-domain ranking). Tightened to id-only match -> still 1.00, now a real signal.
- **Eval runs the REAL engine** via esbuild on-the-fly bundle (the TS engine can't be imported from a
  .mjs directly; dist/engines/*.js only exists after full `tsc`). 8GB heap self-re-exec (find-cache 65MB
  + adjacency 96MB parsed OOMs the default heap -- Blackwell doctrine: never fight a low default).
- **topSeeds was a real engine param but missing from the dispatcher schema/handler** (scrutiny A P1) --
  wired it. Lesson: every engine opt a caller might tune must be in the schema, not just the engine.

## 2-agent per-file scrutiny
A (code-analyzer) FAIL + B (reviewer) FAIL -> ALL P0/P1 fixed: P0 header action name (graph_context_retrieve
-> graphrag_retrieve), topSeeds plumbing, opt-in Ollama, env-overridable model, strengthened no-neighbors
test (len===1 + no-warning), falsifiable eval, wire-test _resetCacheForTest. + P2s (scoring/neighbor
comments, eval signal-report + try/finally cleanup, malformed-node warn). 15/15 + eval 1.00 after fixes.

## Milestone status: 2/8
Done: U-GAC01 (GraphContextLensEngine), U-GAC02 (this). Next: U-GAC03 code-graph projection (RepoGraph
ICLR-2025, depends GAC01), U-GAC04 dual-channel context, U-GAC05 spatial-UI coord, U-GAC06 community
summaries (depends GAC02), U-GAC07 stale-graph guard hook (1h cron), U-GAC08 hallucinated-node-id guard hook.

Related: [[reference_graph_context_lens_ms0_2026_06_15]] · [[reference_cheap_node_access_ms0_2026_06_04]] · [[feedback_sierra_no_gates_full_reign_2026_06_10]]
