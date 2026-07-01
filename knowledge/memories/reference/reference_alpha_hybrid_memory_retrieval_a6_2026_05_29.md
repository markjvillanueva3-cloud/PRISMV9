---
name: reference_alpha_hybrid_memory_retrieval_a6_2026_05_29
description: A6 SHIPPED — hybrid BM25+dense(nomic)+RRF recall in memory-index-search-lib.mjs; the brain's highest-ROI recall upgrade (closes "captures but doesn't compound" recall arm)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.469Z
aliases: reference_alpha_hybrid_memory_retrieval_a6_2026_05_29
---


A6 (the highest-ROI item from [[reference_alpha_obsidian_brain_improvement_research_2026_05_29]]) SHIPPED 2026-05-29 (slot:alpha). Hybrid BM25 + dense + Reciprocal-Rank-Fusion retrieval over the Obsidian memory vault. Anthropic Contextual Retrieval reports ~35-49% fewer failed retrievals from hybrid+RRF; first-party proof: dense surfaced `feedback_alpha_route_before_grep` for "cutting force kienzle tool wear" — a lexically-disjoint memory pure BM25 never returns.

**Where:** `H:/prism/scripts/lib/memory-index-search-lib.mjs` (the hot path `runMemoryIndexSearch`, called by the cross-worktree-locked `memory-index-precheck-inject.mjs` hook 50-200×/session via cag-router fan-out). Build script `scripts/build-memory-embeddings-sidecar.mjs`; tests `scripts/memory-index-search-hybrid.test.mjs` (19 node:test, incl. fail-on-revert oracle). Sidecar `state/shared/memory-embeddings-sidecar.json` (10,892 int8 768-d nomic vectors, 13.7MB).

**5 load-bearing design constraints (each shaped a choice):**
1. The hook calls `runMemoryIndexSearch` SYNCHRONOUSLY and is cross-worktree-write-locked (can't change the call site) → hybrid lives INSIDE the function, stays sync, query embedded via **synchronous curl subprocess** (`embedQueryViaOllamaSync`), NOT async fetch.
2. STRICTLY ADDITIVE + FAIL-SAFE: absent sidecar / unreachable-or-wedged ollama / embed timeout / corrupt data → byte-identical BM25 (`source:"sidecar"`). Every `tryHybridFuse` early-return is a graceful degrade.
3. SELF-ACTIVATING on sidecar presence (mirrors the BM25-sidecar gate) — no config flag; hybrid turned on the instant the sidecar landed.
4. 5s hook budget: 2.5s curl cap (covers a COLD nomic load — a 1.5s cap missed cold starts, caught by real-data E2E) + file circuit-breaker skips the network for 120s after any failure so a wedged ollama adds ZERO latency fleet-wide.
5. int8 quant is direction-preserving + cosine is scale-invariant → store ONLY int8 bytes(b64)+L2-norm (the per-vector quant scale cancels; ~8MB not ~67MB float32).

**Disable:** `PRISM_MEMORY_HYBRID_DISABLE=1` (checked in BOTH the sidecar loader and tryHybridFuse — defense in depth). **Regen sidecar:** `node scripts/build-memory-embeddings-sidecar.mjs` (--resume skips embedded keys; fail-loud >25%).

**Lesson (R12 + alpha discipline):** the hermetic tests (injected `embedQueryImpl`) ALL passed while the real sync-curl path silently failed on a COLD model (`--max-time 1500`→ceil 2s, too tight). Only the real-data E2E caught it → widened to 2500ms. Pure-core + injected-deps MUST ship a real-data E2E — same recurring class as [[reference_fleet_reaper|fleet-reaper]] service-restart + RGS-TOOL hermetic-fakes. Both per-file scrutiny reviewers (code-analyzer + reviewer) PASS, no P0; converged on 2 P1s (dim-mismatch guard, recordKey-fallback divergence) both fixed pre-commit. Related: [[feedback_psn_definition]] (recall = PSN leg), [[reference_alpha_memory_index_nofire_2026_05_29]] (the recall-fire fix this builds on).
