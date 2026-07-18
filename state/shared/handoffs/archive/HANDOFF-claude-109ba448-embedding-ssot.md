---
session: claude-109ba448
topic: embedding-ssot
slot: india
written_at: 2026-05-30T18:30:17.740Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-109ba448
status: active
---

# HANDOFF: claude-109ba448
Updated: 2026-05-30T18:30:17.741Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-109ba448

## STATE
## AI-systems improvement thread (slot india, ai-training owner)

Working the verified deep-dive roadmap (AI-SYSTEMS-IMPROVEMENT-ROADMAP.md). Worktree-doable items only (NN-GRAPH core is main-only; slot/india ~874 behind).

### DONE this session
- GOAL-FORMALIZER v1 — 8 commits cd4195d40a..6f932882c7, 3-of-3 PASS, awaiting golf merge (chat-bus posted).
- EMBEDDING-SSOT U1 — src/config/embeddingContract.ts: registry {id,model,dim,quant,normalized} + guards (isCompatible/assertSameContract/assertVectorDim/cosineSimilarityGuarded). Rule: comparable IFF same model AND dim. 25 tests, tsc clean, 2-reviewer scrutiny PASS. Committed.

### NEXT (logical order)
- U2: wire 3 backends to consume embeddingContract (OllamaEmbedderEngine.ts:72 nomic, LocalEmbeddingEngine.ts:35 minilm-384, EmbeddingPipelineEngine.ts:108 mpnet) — replace private model/dim consts with SSOT refs; add .contract() accessor; fail-loud dim guard at index load.
- U3: add findCompatibleContract(id) to SSOT, then a health-probed router that falls back Ollama->Local ONLY within same contract (dim-incompatible fallback is the trap the roadmap missed).
- U4 (optional): hybrid dense+BM25 recall + rag_search_rerank action in mlDispatcher (roadmap top-5 #3; depends on U2 stable embedder contract).

### Constraints: worktree commits only (slot/india), --no-verify ONLY pure-doc, never bypass NN deploy gate, never inline physics constants, AI-T8 verify agent claims vs tree.

## RESUME
AI-systems improvement in progress. DONE: GOAL-FORMALIZER v1 (8 commits, merged-pending golf) + EMBEDDING-SSOT U1 (embeddingContract.ts SSOT, 25 tests, scrutiny PASS, committed). NEXT: EMBEDDING-SSOT U2 = wire 3 backends (OllamaEmbedderEngine nomic-768, LocalEmbeddingEngine minilm-384, EmbeddingPipelineEngine mpnet-768) to CONSUME embeddingContract (replace private DEFAULT_MODEL/DEFAULT_DIM with contract refs + expose .contract()). U3 = health-probed SAME-CONTRACT fallback router (naive Ollama768->Local384 is dim-incompatible; add findCompatibleContract helper to the SSOT first). Then optional U4 = hybrid dense+BM25 recall in prism_ml RAG (roadmap top-5 #3). Source: mcp-server/src/engines/ai-training/AI-SYSTEMS-IMPROVEMENT-ROADMAP.md top-5.

## CONTEXT

