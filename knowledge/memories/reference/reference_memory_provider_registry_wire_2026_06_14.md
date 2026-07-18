---
name: memory-provider-registry-wire-2026-06-14
description: 2026-06-14 (slot:bravo) — took the orphaned MemoryProvider framework (U-MWO05, the Hermes-Memory-Guidebook plug-in surface) live via a registry + CLI + /memory-providers skill (commit 51b0330b35). Decision: KEEP+WIRE not delete. R15 orphan-closure pattern.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.654Z
aliases: reference_memory_provider_registry_wire_2026_06_14
---


2026-06-14 (slot:bravo, AGENTIC-SUBSTRATE-BRIDGE, Task #4) — `U-MEM-PROVIDER-REGISTRY-WIRE` (commit 51b0330b35).

## The orphan + the decision (R7/R12)
`scripts/memory-providers/` (MemoryProvider ABC + obsidian-feed + obsidian-receipt + prism-kg) shipped as U-MWO05 (2026-05-26, bravo) to be the Hermes-Memory-Guidebook 8-plug-in surface (Reflexion/ToT/FlexMV/GBrain/Mnemosyne/MemGPT/MemoryBank/Generative-Agents). It was REAL (22/22 tests) but a **verified orphan** — grep for importers returned ONLY conversation transcripts, zero production consumers. The live memory path (`stop-obsidian-memory-feed.mjs`) never adopted it. **Decision: KEEP + WIRE (not delete)** — it's an intentional, tested, on-goal Hermes-memory seam; deletion loses it. The honest "act on it" was to give it the missing entry point + a live consumer (R15), not make-work and not deletion.

## What shipped
- `memory-provider-registry.mjs` — `buildRegistry(providers=defaultProviders())` (conformance-gated via `validateContract` against the ABC's 6 requiredMethods; non-conformant providers RECORDED in `skipped`, never silently dropped — R12) + `listProviders/getProvider` + `aggregateStats` (fail-soft per provider: throwing `stats()` -> `{name,error}` row, NaN-coerced to 0; `combinedNote` caveat travels with the JSON). This is the seam a future Hermes plug-in drops into via `defaultProviders()`.
- `memory-provider-status.mjs` — CLI consumer (pure `formatStatusReport` + IO `buildStatusReport`).
- `/memory-providers` skill (on disk, gitignored like settings.json) — operator surface.
- LIVE: obsidian-feed 4325 / obsidian-receipt 4325 (SAME read source -> the double-count `combinedNote` flags; per-provider rows are authoritative) / prism-kg 0 (empty in-memory Map).

## Reusable doctrine
- **Orphan resolution is a 3-way decision (R7): wire / delete / keep-dormant-with-note.** Wire when it's real+intentional+on-goal AND a genuine consumer exists or can be cheaply added; delete when superseded; keep-dormant only when neither. Here: real Hermes seam -> wire.
- **A TS dispatcher cannot import a `scripts/*.mjs` registry (harness/build wall) -> the operator surface for a .mjs framework is a SKILL (or CLI), not a dispatcher action.** Reviewer-B flagged "no operator surface" as P1; a `/memory-providers` skill closed it. The pure/IO split keeps a future dispatcher wire (shell-out) a 3-liner if ever needed.

-> [[feedback_harness_only_tools_wall_2026_06_14]] · [[reference_agentic_substrate_bridge_2026_06_14]] · [[reference_post_ship_memory-wiki-optimization-ms0-u-mwo05]]
