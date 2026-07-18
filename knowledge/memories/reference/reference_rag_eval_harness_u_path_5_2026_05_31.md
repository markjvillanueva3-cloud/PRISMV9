---
name: reference_rag_eval_harness_u_path_5_2026_05_31
description: "U-PATH-5 — RAG retrieval-quality eval harness (retrievalMetrics.ts + prism_ml:rag_eval); gives india's RAG/tribal recall leg the quality bar alpha's memory-recall-eval gives memory (slot india, 2026-05-31)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.143Z
aliases: reference_rag_eval_harness_u_path_5_2026_05_31
---


**U-PATH-5 — RAG retrieval-quality eval harness** — shipped 2026-05-31, slot india, branch `slot/india`, commit `[RAG-HYBRID]/U-PATH-5`. First unit of the india↔alpha pathway plan ([[reference_pathway_coordination_ms0_2026_05_31]]) built under the `/goal /loop /yolo` autonomous directive.

**What:** `mcp-server/src/utils/retrievalMetrics.ts` — PURE IR metrics: `evaluateQuery` / `aggregate` / `evaluateRuns`. Binary-relevance nDCG (DCG=Σ rel_i/log2(rank+1), IDCG over min(k,R) ideal positions), recall@k, precision@k, hit@k, MRR. Degenerate gold (no relevant ids) FLAGGED + excluded from means (not averaged as 0 — wouldn't conflate bad-annotation with bad-retriever); missing run PENALIZED as empty ranking (not dropped); dedupe first-kept; fail-loud on bad ks. + `prism_ml:rag_eval` action: mode=provided scores caller-supplied ranked runs (deterministic, no corpus); mode=bm25 runs TribalRAGEngine.search per gold query (graceful corpus_empty:true when index absent — the worktree state).

**Mirrors alpha:** same metric set as alpha's `scripts/memory-recall-eval.mjs` (p@1/recall@k/nDCG/MRR) so the RAG-corpus leg and memory-recall leg of the knowledge pathway share ONE quality bar — cross-leg comparison is valid.

**Design call (Karpathy/DRY):** the metrics util scores ranked id LISTS — retriever-agnostic (bm25/dense/hybrid). NO duplication of the rag_search_rerank pipeline. hybrid-vs-bm25 comparison (the RAG-HYBRID milestone's reason-for-being) works TODAY via provided-mode: capture both runs externally, eval each. So a dedicated rag_eval hybrid-mode would be gold-plating — deliberately NOT built.

**Verification:** 20 tests (13 metrics exact-reference-value: nDCG@4=0.9197207891481876, @2=0.6131471927654584, hand-verified by both reviewers; 7 dispatcher round-trip through the real handler incl. corpus_empty + schema gate). My files type-clean (worktree's ~1278 tsc errors are pre-existing staleness, slot/india 874 behind main — 0 mine). 2-reviewer per-file scrutiny PASS, zero BLOCKER.

**Follow-ups (logged):** real gold-set curation (query→tip-id) needs the corpus → main/golf; optional rag_eval hybrid-mode convenience (low priority — provided-mode covers it). India worktree-doable pathway queue DRAINED after this; remaining U-PATH units blocked on golf-merge / alpha decisions D1-D4 / corpus-on-main. Wiki: `knowledge/wiki/architecture/rag-hybrid-ms0.md`. Galaxy: ai-training (india). Siblings: [[reference_rag_hybrid_v2_dense_arm_2026_05_31]] · [[reference_embedding_ssot_ms0_2026_05_30]].
