---
name: reference-tango-attention-algorithm-2026-05-29
description: tango shipped ScaledDotProductAttention (Transformer) — NEW deep-learning algorithm + ml_attention wire
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.218Z
aliases: reference_tango_attention_algorithm_2026_05_29
---


Commit `2b0993e197` (slot:tango, 2026-05-29, U-ALGO-ATTENTION) — algorithm-gen /goal, deep-learning priority (#4).

**What:** `mcp-server/src/algorithms/ScaledDotProductAttention.ts` — `softmax(Q·Kᵀ/√d_k + mask)·V`, the Transformer attention operator (Vaswani 2017). Pure deterministic (no learned weights — the learned Q/K/V projections are upstream), numerically-stable row-wise max-shift softmax, optional causal lower-triangular + explicit additive (−Inf) masking. `Algorithm<I,O>` (validate/calculate/getMetadata). Composes with the `ml_activation` softmax shipped the same session. 16 hand-verified tests (uniform→mean, sharp→peaked, causal, mask, fully-masked-row-stays-finite) + 5 failure + 3 adversarial.

**Wired:** `prism_algorithm:ml_attention` (validate-then-calculate → err not crash). 36/36 incl. z.enum membership.

**Session arc (algorithm-gen /goal, slot:tango):** 5 batches shipped — HeterophilyAwareAggregator (NEW, nn/gnn, `985e96ec37`) · 5 ML classes wired (`8c750a2aca`) · DBSCAN+KMedoids (`06de87c4cf`) · activation library (`18003907ba`) · ScaledDotProductAttention (NEW, `2b0993e197`). `prism_algorithm` ml_* group 2→11; +2 new algorithms; ~11 algorithms now invokable that weren't.

**Still queued (NEW numerical builds, deferred for fresh-context fire):** LowRankDecomposition (lora, randomized SVD — needs <1e-10 precision care) · MonteCarloTreeSearch (deep-reasoning). Plan: `state/shared/specs/ALGO-GEN-PRIORITY-PLAN-2026-05-29.md`. Related: [[reference_tango_heterophily_aggregator_2026_05_29]] · [[reference_tango_ml_dispatcher_wire_2026_05_29]].
