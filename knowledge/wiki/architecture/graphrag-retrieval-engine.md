---
title: GraphRAGRetrievalEngine (GraphRAG over wiki + system-graph)
type: architecture
layer: L6
created: 2026-06-15
slot: sierra
unit: GRAPH-AS-LLM-CONTEXT-MS0/U-GAC02
tags: [graphrag, retrieval, system-viz, ego-graph, llm-context, prism_ai, edge-et-al]
related:
  - graph-context-lens-engine
  - cheap-node-access-ms0
  - schema-read-blindness-and-green-but-blind-tests
---

# GraphRAGRetrievalEngine

Second unit of GRAPH-AS-LLM-CONTEXT-MS0 (slot:sierra, commit `8f2962fa28`). GraphRAG
retrieval (Edge et al. arXiv:2404.16130; RepoGraph ICLR-2025 ego-graph retrieval) over the
PRISM wiki + system-viz graph. Classic vector RAG misses multi-hop manufacturing queries;
GraphRAG seeds on query-matched entities then expands along graph edges.

## Doctrine: wrap, not rebuild

Composes existing substrate rather than competing:
- **find-cache.json** (`{nodes:[{id,label,info,layer}]}`) for query -> entity matching
- **graphContextLensEngine.extractEgoGraph** (U-GAC01) for cycle-safe 1-hop expansion
- an **injectable, fail-soft summarizer** (deterministic extractive by default; opt-in Ollama)

Never loads the 644MB graph; never hard-depends on a live LLM.

## Pipeline (`retrieve(query, opts)`)

1. **tokenize** the query (lowercase, drop stopwords + <2-char tokens)
2. **score** find-cache nodes by token overlap -- per token the highest-tier field hit counts
   once (id 3 > label 2 > info 1; intentional priority, not cumulative)
3. take **top seeds** (default 5); for each, **ego 1-hop expand** via U-GAC01
4. **rank** candidates: `seedScore + SEED_BONUS` for seeds, `seedScore/(distance+1)` for
   neighbors; `upsert` keeps max-score / min-distance per id; slice to topK
5. **summarize** (injectable; default extractive; `useLlm` opts into fail-soft Ollama)
6. return `{query, seeds, entities (top-K + score + distance + seed), summary, summarizer, warnings}`

Singleton `graphRAGRetrievalEngine`. find-cache path via `PRISM_VIZ_FINDCACHE_PATH` env -> cwd
candidates; cached by (path, mtime). Fail-loud (R12) on missing/corrupt find-cache.

## Dispatcher

`prism_ai:graphrag_retrieve`. Params: `query` (required, min 1), `topK`, `topSeeds`, `hops`,
`maxNodes`, `useLlm` (opt in to Ollama summary), `noLlm`. Returns the GraphRAGResult in `r.data`.

## Summarizer (opt-in Ollama)

Default is the **deterministic extractive** summary -- a plain `graphrag_retrieve` incurs no network
call (no surprise 8s latency). `useLlm:true` opts into Ollama (`PRISM_OLLAMA_MODEL` || qwen2.5-coder:32b,
8s timeout); any error/timeout/down falls back to extractive. `noLlm` forces extractive even over useLlm.

## Tests + eval

`GraphRAGRetrievalEngine.test.ts` (12: happy, unknown, ambiguous, no-neighbors [len===1], oversized,
malformed/missing find-cache fail-loud, empty query, prompt-injection-is-inert, empty-wiki cold-start,
tokenize, live find-cache smoke) + `AIReasoningDispatcher.graphrag-wire.test.ts` (3 round-trip).
`scripts/graphrag-eval.mjs` -- recall@3 on LIVE data: self-re-execs (8GB heap), esbuild-bundles the
REAL engine, 10 domain queries, **falsifiable id-match predicate** -> recall@3 = 1.00 (threshold 0.7).

## Lessons (see [[schema-read-blindness-and-green-but-blind-tests]] sibling)

- An eval must be **falsifiable**: the first cut matched the query term in id+label+info -- tautological
  (would pass on random within-domain ranking). Tightened to id-only -> still 1.00, now a real signal.
- Every engine opt a caller might tune (e.g. `topSeeds`) must be in the **dispatcher schema**, not just
  the engine -- else it is silently dropped at the MCP boundary.
- Ollama summarization is **opt-in**, not opt-out -- a retrieval call must not surprise-block on a GPU.

## Next: U-GAC03..08 (6 remaining)
code-graph projection, dual-channel context, spatial-UI coordination, community summaries,
stale-graph guard hook (1h cron), hallucinated-node-id guard hook.
