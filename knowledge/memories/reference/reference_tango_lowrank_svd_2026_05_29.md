---
name: reference-tango-lowrank-svd-2026-05-29
description: tango shipped LowRankApproximation (truncated SVD via power iteration) — the LoRA math core
type: reference
source: prism-memory
synced: 2026-06-09T14:54:10.968Z
aliases: reference_tango_lowrank_svd_2026_05_29
---


Commit `d17bae3ba4` (slot:tango, 2026-05-29, U-ALGO-LOWRANK) — algorithm-gen /goal, lora priority (#2). This was the NEW numerical build deferred 3× for budget/contention, then built carefully when contention eased.

**What:** `mcp-server/src/algorithms/LowRankApproximation.ts` — rank-k truncated SVD via **power iteration + deflation** (Eckart–Young optimal). Per component: power-iterate v←normalize(AᵀA v), σ=‖Av‖ (Rayleigh, valid pre-convergence), u=Av/σ, deflate A−=σuvᵀ. The **reconstruction error is read off the residual matrix → exact regardless of convergence** (key robustness trick). Deterministic seeded LCG init (reproducible tests). Numerically hardened: clustered/degenerate spectra capped at maxIter + flagged in `converged[]`; zero matrix → σ=0 no NaN. `Algorithm<I,O>`.

**Why:** the math core under PRISM's ~95 LoRA engines — low-rank adaptation = approximating ΔW by a rank-k product; rank selection / weight compression / adapter init all need a truncated SVD, and none existed in the algorithms/ dir.

**Wired:** `prism_algorithm:ml_lowrank` (validate-then-calculate → err). 40/40 tests incl. rank-1 exact recovery (<1e-8), exact diagonal singular values, Eckart–Young error-monotonicity, determinism, degenerate-identity, zero-matrix, z.enum membership.

**Algorithm-gen /goal session total (slot:tango):** 6 batches — HeterophilyAwareAggregator (nn/gnn) · 5 ML classes · DBSCAN+KMedoids · activation lib · ScaledDotProductAttention (DL) · LowRankApproximation (lora). **3 NEW algorithms + ml_* group 2→12; ~12 algorithms now invokable.** Still queued: MonteCarloTreeSearch (deep-reasoning — note: takes expand/simulate callbacks → WIRE-EXEMPT, can't cross JSON dispatcher; build-only). Plan: `state/shared/specs/ALGO-GEN-PRIORITY-PLAN-2026-05-29.md`. Related: [[reference_tango_attention_algorithm_2026_05_29]] · [[reference_tango_heterophily_aggregator_2026_05_29]].
