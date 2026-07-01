---
name: reference_ai_synergy_audit_ms0_2026_06_10
description: Per-galaxy AI-synergy audit instrument + fleet-wide awareness hook (measures NN/GNN/LoRA/RAG/CAG synergy with vault/hermes/PSN/awareness across 34 galaxies)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.463Z
aliases: reference_ai_synergy_audit_ms0_2026_06_10
---


AI-SYNERGY-AUDIT-MS0 (slot:charlie, 2026-06-10) -- the first fleet-wide instrument that MEASURES, per galaxy, whether its AI capability (NN/GNN/LoRA/RAG/CAG) is synergized with the substrates: CLAUDE.md/MEMORY.md discoverability, owned AI engines/reasoning bridges (PSN leg #10), Obsidian synthesis brain + LoRA feed, system-viz cross-substrate edges, and a dedicated auto-injected awareness surface. NOT a dup of the fleet-MONOLITHIC `AICapabilityMaximizerEngine` -- this is per-galaxy + new.

**Assets:**
- `scripts/lib/ai-synergy-audit-lib.mjs` -- PURE scorer: `scoreGalaxyAiSynergy(descriptor)` over 5 weighted dims (sum=1.0, load-enforced), `rollupFleet`, `classifyAiEngine`, `normalizeEngineName`, `distinctAiTerms`. 21/21 reference tests.
- `scripts/audit-ai-synergy.mjs` -- live generator -> `state/shared/specs/AI-SYNERGY-AUDIT.{json,md,html}`. Run: `node scripts/audit-ai-synergy.mjs` (`--json`/`--dry`).
- `.claude/hooks/ai-synergy-awareness-inject.mjs` -- UserPromptSubmit hook: injects the chat's galaxy AI-posture + detached/throttled regen of the audit (the generator's auto-invoker). Wired in settings.json after `slot-context-bundle-inject`. Knobs `PRISM_AI_SYNERGY_AWARENESS_{DISABLE,NO_REGEN}`, `_STALE_HRS`. 10/10 tests.

**Live baseline (2026-06-10):** 34 galaxies, mean 0.713, strong=9/partial=25/weak=0. Worst dims: `ownsOrWiresAi` 10/34 (only 10 galaxies have name-attributed AI engines) and `awarenessSurface` (was 1/34, the hook lifted it to 22/34 = 21 fleet-hook@0.7 + 1 dedicated@1.0; the other 12 are slotless infra galaxies, honestly uncovered). `discoverability` 34/34, `vaultSynergy` 34/34, `crossSubstrate` 34/34.

**Two reusable measurement-bug lessons (found by building the instrument first, R13):**
1. **Engines live FLAT, not in galaxy dirs.** All ~3,800 engines are in `mcp-server/src/engines/*.ts`; the `<galaxy>/` dirs are doctrine-only (CLAUDE/MEMORY/PATHS/TOOLBELT.md). Counting engines "in the galaxy subdir" reads 0 for EVERY galaxy incl ai-training. Attribute flat engines to galaxies by normalized FIRST TOKEN (`LatheLoRA*`->lathe), gated to known galaxies. See [[feedback_galaxy_dirs_are_doctrine_only]].
2. **Galaxy graph nodes carry TWO id forms.** Cross-substrate edges reference a galaxy as BOTH `eng.<g>` (8 galaxies) and `ghost.galaxy.<g>` (all 34). Matching only `eng.` under-counts by 26 galaxies. Always resolve both forms.

Next dims to remediate (by ROI): `ownsOrWiresAi` (reasoning/neural bridges for the 24 galaxies without one -- clone the `QuotingDeepReasoningBridge` pattern); register the audit in `AUDIT-REGISTRY.json` (add `specs/` to papa's `build-audit-registry.mjs` sidecar scan). Related: [[reference_india_domain_awareness_2026_05_28]] (india's dedicated ai-training awareness -- the surviving dedicated-gen exemplar), [[reference_cross_substrate_synergy_ms0_2026_06_03]].
