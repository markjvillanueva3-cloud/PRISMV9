---
name: u-rag-6-gpu-embedder-deferred-2026-05-22
description: "U-RAG-6 DEFERRED — GPU embedder migration (swap corpus+query to nv-embedqa-e5-v5, dim 768→1024). Out of /goal scope: all-or-nothing joint migration."
aliases: reference_u_rag_6_gpu_embedder_deferred_2026_05_22
type: reference
source: prism-memory
synced: 2026-06-09T14:54:11.021Z
---


# U-RAG-6 — GPU embedder migration (DEFERRED)

## Why deferred

The wiki corpus is embedded with `nomic-embed-text` (768-d CPU ONNX) and queries are embedded by `tribal-rerank.mjs` with the SAME model. Cosine similarity REQUIRES both sides be in the same vector space. The GPU NIM `nv-embedqa-e5-v5` is 1024-d — a different space. Swapping is **not drop-in**:

1. Re-embed the entire corpus with the new model (~24K files × GPU inference).
2. Swap the query-side embedder in `tribal-rerank.mjs`.
3. Bump the index `dim` 768 → 1024.
4. All three must land atomically — a partial swap silently makes cosine meaningless (different spaces yield ~0 similarity).

That's a joint corpus+query migration with a meaningful failure mode. Out of /goal scope.

## When to take it on

- After U-RAG-3 (Contextual Retrieval) lands so the GPU embed pass also captures contextualized chunks.
- Verify `nv-embedqa-e5-v5` actually outperforms nomic on PRISM's query set via the U-RAG-5 eval harness (sometimes a bigger model under-performs on domain-specialized corpora).
- VRAM budget: see [[reference_nim_gpu_capacity_ceiling_2026_05_22]] (16GB ceiling — can't run nv-embedqa alongside the full inference stack).

## See also

- Spec: `state/shared/specs/RAG-UPGRADE-MS0.md` U-RAG-6
- [[reference_rag_upgrade_ms0_2026_05_22]] — milestone tracker
- [[reference_nim_gpu_capacity_ceiling_2026_05_22]] — VRAM constraints
