---
name: reference_rag_hybrid_ms0_2026_05_30
description: "RAG-HYBRID v1 — pure reciprocal-rank-fusion utility + prism_ml:rag_search_rerank single-call BM25-retrieve→rerank→RRF pipeline (slot india, 2026-05-30)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.143Z
aliases: reference_rag_hybrid_ms0_2026_05_30
---


**RAG-HYBRID (v1)** — shipped 2026-05-30, slot india, branch `slot/india`. Commit (RAG-HYBRID/U1). Closes AI-Systems-Improvement-Roadmap RAG #3.

**What:** `utils/reciprocalRankFusion.ts` (pure RRF, Cormack 2009) + `prism_ml:rag_search_rerank` action that composes the EXISTING BM25 retrieve (`TribalRAGEngine.search`) + reranker (`ReRankerEngine.rerank`) and fuses their two RANKINGS via RRF in one call.

**Why RRF not score-averaging:** the arms (BM25 term-weights, reranker Jaccard/n-gram, later dense cosine) produce scores on INCOMPARABLE scales — averaging is meaningless. RRF fuses by RANK: `score = Σ weight/(k+rank)` (1-based, k=60 canonical). Consensus property: moderate-in-both beats #1-in-one.

**Pipeline (the action):** BM25 retrieve `retrieve_k`(≤100) → rerank top `min(retrieved,20)` (reranker's hard cap) → RRF-fuse full-lexical-ranking + rerank-ranking → join back, return `top_k` with `rrf_score`+`bm25_rank`+`rerank_rank`.

**Dense arm DEFERRED (honest):** a true dense arm needs a PRECOMPUTED dense index over the 4,493-tip corpus — doesn't exist + blocked (Ollama `/api/embeddings` dead; Local-MiniLM per-query over whole corpus infeasible). RRF accepts it later as a 3rd list with zero refactor (it's just rank lists). The embedder contract for it = [[reference_embedding_ssot_ms0_2026_05_30]] (minilm-384 is the always-available offline embedder).

**Design call:** RRF is a pure utils/ function (fully unit-testable, 12 tests incl. adversarial) CONSUMED by the dispatcher case (not orphaned). The dispatcher round-trip test (5) invokes the REAL handler via a mock server that captures `server.tool`'s callback (mlDispatcher exports no standalone executor — only registerMLDispatcher).

**Verification:** tsc clean; 17 tests; 3-of-3 PASS (session claude-3b3a299c, zero BLOCKER); purely additive.

**Follow-ups:** dense index build → 3rd RRF arm; retrieval-quality eval harness (recall@k/nDCG, roadmap RAG #6); CLAUDE.md pointer (golf/merge). Wiki: `knowledge/wiki/architecture/rag-hybrid-ms0.md`. Galaxy: ai-training (india). Third AI-systems improvement this session after [[reference_goal_formalizer_ms0_2026_05_29]] + [[reference_embedding_ssot_ms0_2026_05_30]].
