---
name: reference_embedding_ssot_ms0_2026_05_30
description: "EMBEDDING-SSOT v1 — single source of truth for embedding model/dim contracts + guards + safe-fallback decision that REFUSES dim-incompatible degradation (slot india, 2026-05-30)"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.100Z
aliases: reference_embedding_ssot_ms0_2026_05_30
---


**EMBEDDING-SSOT (v1)** — shipped 2026-05-30, slot india, branch `slot/india`. 3 commits `bd629843a5`(U1) `8952676f00`(U2) `9c547b76c9`(U3). Closes AI-Systems-Improvement-Roadmap item #1 (worktree-doable, leverage 8).

**Problem:** PRISM's 3 embedding backends declared 3 different models/dims with NO shared contract — OllamaEmbedderEngine (nomic-embed-text/768, real), LocalEmbeddingEngine (Xenova/all-MiniLM-L6-v2/384, real), EmbeddingPipelineEngine (all-mpnet-base-v2/768, **LEXICAL — emits no vectors**). Vectors from different backends were silently cosine-compared across incompatible spaces.

**Load-bearing insight:** dim-equality is necessary but NOT sufficient for cosine-comparability — nomic-768 and mpnet-768 are both 768d but different vector spaces. The contract keys on `{model, dim}` and FAILS LOUD on any cross-contract compare. This is also why the roadmap's naive "Ollama(768)→Local(384) fallback" is a trap (dim-incompatible silent corruption).

**Shape (all in `mcp-server/src/config/embeddingContract.ts` + the 3 backends):**
- U1: frozen `EMBEDDING_CONTRACTS` registry + `CANONICAL_CONTRACT_ID="nomic-768"` + guards (`isCompatible`/`assertSameContract`/`assertVectorDim`/`cosineSimilarityGuarded` [zero-norm→0 never NaN; overflow→throw]/`contractForModel`). 34 tests.
- U2: 3 backends source model/dim from SSOT (value-preserving) + `.contract()` accessor; Ollama resolves dynamically + throws on unregistered model; EmbeddingPipelineEngine declares mpnet-768 as TARGET only (R12-honest: no vectors in any mode). 8 integration tests.
- U3: `findCompatibleContract(id)` (today `[]` for all = "no safe cross-backend fallback exists" signal) + `selectEmbedderContract(requested, candidates)` — pure, caller-supplies-health; selects only same-contract healthy candidate, else `ok:false` REFUSAL (never silent 768→384 degrade). Directly relevant — Ollama `/api/embeddings` was dead during the build.

**Design call:** U3 is a PURE decision function in the config module (not a new engine) — no orphan, no dispatcher detour, hermetically testable with mock candidates. A real-backend adapter that calls it is a future consumer.

**Verification:** tsc clean; 42 tests green; 6 per-file reviewers + 3-of-3 milestone gate (session claude-d7f7d3ce) all PASS, zero BLOCKER.

**Follow-ups (logged, not done):** route the 2 pre-existing un-guarded backend cosines through `cosineSimilarityGuarded`; make EmbeddingPipelineEngine compute real vectors or rename (roadmap #6); hybrid dense+BM25 recall + `rag_search_rerank` in prism_ml (roadmap top-5 #3); CLAUDE.md §AI pointer (golf/merge). Wiki: `knowledge/wiki/architecture/embedding-ssot-ms0.md`. Sibling work: [[reference_goal_formalizer_ms0_2026_05_29]]. Galaxy: ai-training (india).
