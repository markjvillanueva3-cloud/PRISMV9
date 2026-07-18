---
name: reference_galaxy_bridge_hybrid_on_default_2026_06_10
description: "galaxy-reasoning-bridge dense/hybrid RAG arm is now ON by DEFAULT fleet-wide (slot:tango, U-FLOR-HYBRID-DEFAULT 52b83b819f). charlie built it off-by-default; operator directive activated it. retrieved-hybrid:5 live-validated. Opt-out PRISM_GALAXY_RAG_DENSE=0."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.584Z
aliases: reference_galaxy_bridge_hybrid_on_default_2026_06_10
---


**The fleet-wide galaxy-reasoning-bridge dense/hybrid RAG arm is ON by DEFAULT as of 2026-06-10** (slot:tango, `U-FLOR-HYBRID-DEFAULT`, commit `52b83b819f`, 3-of-3 scrutiny PASS).

## What changed
`scripts/lib/galaxy-reasoning-bridge.mjs` — the single build-once asset that gives all 34 galaxies AI reasoning (sparse RAG + dense/hybrid rerank + CAG + LoRA emit + per-galaxy reasoning over CLAUDE/SOUL/MEMORY/AWARENESS/synthesis on local Ollama).

- New PURE exported `resolveDenseMode({env, optsDense, queryGiven})` — dense **ON by default**; opt-OUT via `PRISM_GALAXY_RAG_DENSE=0` (env) or `opts.dense===false`; requires a real query.
- `reasonForGalaxy`'s `denseOn` now delegates to `resolveDenseMode` (default flipped from opt-in `=== "1"` to opt-out). The pre-existing fail-soft `catch` keeps the original "no embed service ⇒ no regression" guarantee, so on-by-default is safe.
- **R12 honest status:** pushes `dense-degraded` to `result.sources` when dense was requested + there was a sparse set but the embed rerank couldn't apply — so the fleet can MEASURE real per-galaxy hybrid coverage (`retrieved-hybrid:N` vs `retrieved` + `dense-degraded`).

## Why (provenance)
Operator /goal "improve ... cag+rag+hybrids across all galaxies ... utilize." slot:charlie's 6-unit AI stack ([[reference_ai_systems_6unit_complete_2026_06_11]]) **built** the dense arm (`galaxy-dense-rerank.mjs`, nomic-embed-text 768d → RRF-fuse) but deliberately left it off-by-default. This unit ACTIVATES it — a complement, not a duplicate.

## Live proof
`reasonForGalaxy('discovery', ...)` on the DEFAULT path (no env flag) →
`sources: ["CLAUDE.md", "retrieved-hybrid:5", "ai-synergy-audit"]`, `degraded:false`.
`nomic-embed-text:latest` confirmed live on native Ollama `:11434`.

## Knock-on facts
- CAG cache keys are dense-aware (`${model}+dense`) — sparse/hybrid answers never collide; existing plain-model entries repopulate under the dense key.
- Worst-case added latency on a *slow* (not down) embed service ≈ 40s, hard-capped per fetch by `PRISM_GALAXY_EMBED_TIMEOUT_MS` (no unbounded hang).
- Companion: [[reference_ai_systems_6unit_complete_2026_06_11]] (the stack this activates) · wiki [[ai-synergy-audit-ms0]].
