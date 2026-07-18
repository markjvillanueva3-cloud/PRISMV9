---
name: reference_sierra_ranked_hybrid_n1_2026_05_29
description: N1 ranked-hybrid-graph-search — RankedHybridGraphSearchEngine RRF-fuses master-index confidence vs utilization; wired prism_session:master_index_ranked_hybrid
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.199Z
aliases: reference_sierra_ranked_hybrid_n1_2026_05_29
---


**BUILT 2026-05-29 (session 109ba448, slot:sierra, commit 1e11fa0642).** The N1 opportunity from SIERRA-HIGH-LEVERAGE-OPPORTUNITIES: compose the system-viz engine cluster into one capability.

- **Engine:** `mcp-server/src/engines/RankedHybridGraphSearchEngine.ts` — `search(query, opts)`. Calls `masterIndexEngine.query()` → hits each carrying `confidence` (lexical relevance) AND `utilization` (log-normalized in-degree = structural-importance proxy). Builds two ranked lists (confidence desc, utilization desc) over the SAME deduped candidate set → `HybridIndexEngine.fuse()` (RRF k=60) → re-ranked hits. So a structurally-important hub out-ranks a high-confidence isolated match.
- **Wired:** `prism_session:master_index_ranked_hybrid` (sessionDispatcher enum ~166 + case ~1788). Params: query/q, limit, layers, sources, min_utilization, min_confidence, build_classes, stopwords, rrf_k, top_k.
- **Tests:** 13 — `RankedHybridGraphSearchEngine.test.ts` (11: headline hub-beats-isolated with hand-verified RRF math, dedup, topK, NaN/Infinity coercion, 120-char id-cap drop, malformed-hit skip, render) + `sessionDispatcher.ranked-hybrid-wire.test.ts` (2: enum-gate membership + empty-query round-trip).

**Key design decisions (R8/R12-honest):**
1. **OOM-safe by construction** — reuses MasterIndexEngine's CACHED index (mtime-cached, single-flight); NEVER loads the 548MB merged graph into a live PageRank. `GraphImportanceEngine.rankByTask` (true personalized PageRank) is the "right" list-B source but needs the full GraphInput in-process → OOMs (exit 134) on this host's graph. `utilization` is PageRank's precomputed proxy; cited honestly in the docstring with the upgrade path (N1.1: swap when a higher-mem host / sharded reader exists). NOT an excuse — both reviewers confirmed accurate.
2. **NOT a duplicate of `hybrid_search`** (R7 surfaced): `hybrid_search` fuses ACROSS 4 PSN SOURCES (memory+master+episode+vector); N1 re-ranks WITHIN master hits by relevance × importance — different axis. Action named + commented to make the distinction operator-clear.
3. **enum-gate test closes the MockMCPServer false-green** — the wire test captures the registered schema and calls `schema.action.parse()` (the real `z.enum(ACTIONS)`), asserting a near-miss action THROWS. A plain mock that ignores the schema would false-green a missing-from-enum action.
4. **Dispatcher round-trip uses the empty-query SHORT-CIRCUIT path on purpose** — a non-empty query makes the live master index build from the 576MB graph (times out / OOMs in test env); populated fusion is covered exhaustively by the engine unit test with injected hits.

Reflects [[reference_sierra_leverage_ranked_wiring_queue]] (same session, the #1 priority) · [[feedback_sierra_graph_correctness_is_fleet_search]]. The 548MB merge-OOM is the recurring sierra-domain keystone blocker (also blocks W1's 7 generators — see [[reference_sierra_regen_fast_registration_gap_2026_05_29]]); N1 sidesteps it by reusing the cached index.
