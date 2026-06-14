---
name: reference_pathway_coordination_ms0_2026_05_31
description: "india↔alpha knowledge-pathway coordination plan (PATHWAY-COORDINATION-MS0) — 6-leg lifecycle, india owns embed/RAG legs, alpha owns recall/brain; 8 units + 4 open decisions awaiting alpha"
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.264Z
aliases: reference_pathway_coordination_ms0_2026_05_31
---


**PATHWAY-COORDINATION-MS0** — drafted 2026-05-31, slot india `claude-05ceb444`, operator directive "coordinate with alpha to plan out the pathway building." Doc: `state/shared/specs/PATHWAY-COORDINATION-MS0.md`. Chat-bus handoff to alpha: `chat-1780207148221`. **PROPOSAL — awaiting alpha sign-off** on alpha-owned legs/decisions.

**The pathway = knowledge lifecycle (6 legs):** L1 resource-roots (juliett, shipped) → L2 index (BM25, shared) → L3 embed (india `embeddingContract` SSOT + dense builder) → L4 recall/fusion (SEAM: india `reciprocalRankFusion.ts`+`rag_search_rerank` ⇄ alpha `memory-index-search-lib.mjs` hybrid recall) → L5 brain integration (alpha — galaxy back-pointers, master-index, `brain-refresh.mjs`) → L6 reasoning (india NN-GRAPH/closed-loop).

**Load-bearing seam findings:** (1) india's generic tested RRF and alpha's inline RRF are the SAME Cormack-2009 algo → COMPOSE (alpha imports india's). (2) alpha's nomic-768 memory recall has no principled Ollama-down behavior (drops to BM25); india's `selectEmbedderContract()` is the refuse/fallback primitive — but nomic-768 (alpha) vs minilm-384 (india dense, LocalEmbeddingEngine offline) are dim-INCOMPATIBLE, so a same-tier offline fallback needs a DECISION.

**8 units U-PATH-1..8** (deps/blocks in doc): india owns U-PATH-4 (dense artifact post-merge) + U-PATH-5 (RAG eval harness mirroring alpha's `memory-recall-eval.mjs`); alpha owns U-PATH-1 (adopt india RRF) / U-PATH-3 (Ollama-down fallback) / U-PATH-6 (sidecar↔BM25 count parity, alpha-flagged 11035 vs 11024) / U-PATH-7 (dense index as brain-refresh stage) / U-PATH-8 (master-index edges for india's new surfaces); U-PATH-2 shared.

**4 open decisions for alpha/operator:** D1 single nomic-768 fleet vs india two-model SSOT (india recommends two-model — minilm is the only offline-capable one while Ollama's dead). D2 offline fallback = minilm-384 memory sidecar vs BM25-only. D3 shared RRF home. D4 does india's dense RAG recall feed alpha's brain recall or stay RAG-only.

**AI-T8 caveat:** the L5/brain-side claims are india's single-pass Explore read, marked "confirm: alpha" in the doc — alpha owns those surfaces and must validate. Related: [[reference_rag_hybrid_v2_dense_arm_2026_05_31]] · [[reference_embedding_ssot_ms0_2026_05_30]] · [[reference_critical_resource_roots_2026_05_30]] (L1).
