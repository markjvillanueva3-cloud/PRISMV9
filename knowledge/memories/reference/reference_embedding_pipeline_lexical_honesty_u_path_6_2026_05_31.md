---
name: reference_embedding_pipeline_lexical_honesty_u_path_6_2026_05_31
description: "U-PATH-6 — EmbeddingPipelineEngine.getStats R12 honesty: added retrieval:'lexical'|'vector' discriminator so consumers don't misread the declared model as proof of vector production (slot india, 2026-05-31)"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.566Z
aliases: reference_embedding_pipeline_lexical_honesty_u_path_6_2026_05_31
---


**U-PATH-6 — EmbeddingPipelineEngine getStats R12 honesty** — shipped 2026-05-31, slot india, branch `slot/india`, commit `[RAG-HYBRID]/U-PATH-6`. Closes AI-SYSTEMS-IMPROVEMENT-ROADMAP subsystem #6's honesty half.

**Gap:** `EmbeddingPipelineEngine.getStats()` returned `model: "all-mpnet-base-v2", dimensions: 768` — implying it produces those vectors — but the engine is **purely LEXICAL** in every mode (memory = trigram/TF `includes()`; pgvector = SQL `similarity()`/`ILIKE` over pre-populated tables it never writes). `embedded:0` for all entities. A consumer could misread `model` as "cosine-comparable vectors exist here."

**Fix:** added a required `retrieval: "lexical" | "vector"` discriminator to the `EmbeddingStats` interface, always `"lexical"` today (hardcoded — correct because no mode embeds; deriving from `mode` could wrongly imply vectors under pgvector). `model`/`dimensions` JSDoc now frame them as the TARGET space (consistent with `contract()` which already returned mpnet-768 as TARGET, set in EMBEDDING-SSOT U2). A consumer must gate on `retrieval === "vector"`, never on `model`.

**Verification:** 4 tests (retrieval==='lexical', embedded===0 all entities, contract() consistency, stays lexical after addRecord). tsc: 0 new errors, total unchanged at the **1278 pre-existing staleness baseline** (slot/india 874 behind main) → getStats is the SOLE EmbeddingStats producer, the required-field addition broke no consumer. 3-of-3 PASS (claude-05ceb444; arm B + C re-run after a transient rate-limit + a read-failure FAIL — both then PASSed on actual read).

**Note (gotcha):** the commit `-m` message had its backtick-quoted words command-substituted by bash (double-quoted backticks execute) → 2 small gaps in the body. Subject intact. Lesson: avoid backticks inside `rtk git commit -m "..."` — use single quotes or a here-string. Sibling of [[feedback_rtk_vitest_run_watch_hang]].

**Follow-up (logged, NOT built — would be the "make it real" half of #6):** wire `LocalEmbeddingEngine` (minilm-384, in-process ONNX, Ollama-independent) into EmbeddingPipelineEngine so it actually computes vectors + cosine via the SSOT guard, flipping `retrieval` to "vector". Deferred (meaty + consumer-affecting; the honesty discriminator now makes the lexical state unambiguous in the meantime). Galaxy: ai-training (india). Siblings: [[reference_embedding_ssot_ms0_2026_05_30]] · [[reference_rag_eval_harness_u_path_5_2026_05_31]].
