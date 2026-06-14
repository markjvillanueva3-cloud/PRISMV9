---
name: reference_rag_hybrid_v2_dense_arm_2026_05_31
description: "RAG-HYBRID v2 — TribalDenseRecallEngine + dense (semantic) 3rd RRF arm in prism_ml:rag_search_rerank; completes the deferred dense arm (slot india, 2026-05-31)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.914Z
aliases: reference_rag_hybrid_v2_dense_arm_2026_05_31
---


**RAG-HYBRID v2 (dense arm)** — shipped 2026-05-31, slot india, branch `slot/india`. Commits `[RAG-HYBRID]/U3` + `/U3b`. Completes the dense arm deferred in v1 ([[reference_rag_hybrid_ms0_2026_05_30]]).

**What:** `TribalDenseRecallEngine` (`mcp-server/src/engines/`) — `buildIndex(items, embedder)` + `recall(query, index, embedder, topK)`, embedder-INJECTED (LocalEmbeddingEngine minilm-384 in prod = always-available in-process ONNX, works with Ollama dead; fake in tests). Cosine via SSOT `cosineSimilarityGuarded`. In `prism_ml:rag_search_rerank`: a precomputed corpus index (`data/state/TRIBAL_DENSE_INDEX.json`) is FILTERED to the BM25 candidate pool, re-ranked by query-cosine, added as the **3rd RRF arm**. Builder: `scripts/build-tribal-dense-index.mjs` (self-contained, mean-pool+normalize = minilm-384, KEEP-IN-SYNC w/ LocalEmbeddingEngine).

**Failure split (deliberate):** contract-mismatch (index model ≠ live embedder) THROWS (wrong vector space — never silently rank); embed-fail/empty-query/corrupt-entry/embed-THROW degrade to [] (dead embedder must not break RAG). Dispatcher wraps the whole dense block in try/catch → missing index / any throw → silently lexical-only (`dense:0`). Purely additive: use_dense off / no index → exact v1 bm25+rerank behavior.

**Design:** dense RE-RANKS the candidate pool (every hit keeps content). Surfacing NEW non-BM25 candidates = v3 (needs the index to carry title/excerpt, + a schemaVersion/builtBy stamp). The index ARTIFACT is built on a corpus-bearing tree (main) — slot/india lacks `TRIBAL_RAG_INDEX.json`, so the arm graceful-skips here until golf runs the builder post-merge (no flag flip — activates the first time the index file exists).

**Verification:** 13 engine tests (axis-vector cosine ranking, failure split incl. embed-throw, contract-mismatch reject) + dispatcher round-trip (dense graceful-skip). My files type-clean; 3-of-3 PASS (session claude-3b3a299c).

**R12 honesty (worktree tsc):** the slot/india worktree's full `tsc` shows ~1278 PRE-EXISTING errors (staleness, 874 behind main; main builds clean). NONE in my files (verified). Earlier-session "tsc clean" claims reflected a false rtk-tsc signal (tsc OOM-aborted → misreported as clean) — corrected. Flag for golf: rebuild/verify worktree types vs main; also `mlDispatcher.ts` got a lint-staged full-file reformat on commit (large noisy diff). See [[feedback_rtk_vitest_run_watch_hang]] (sibling rtk gotcha). Wiki: `knowledge/wiki/architecture/rag-hybrid-ms0.md` (v2 section). Galaxy: ai-training (india).
