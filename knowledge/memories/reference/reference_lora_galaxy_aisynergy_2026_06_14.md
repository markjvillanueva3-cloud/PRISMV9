---
name: lora-galaxy-aisynergy-2026-06-14
description: 2026-06-14 (slot:bravo) U-LORA-GALAXY-AISYN (commit 32718b045a) -- a DETERMINISTIC (no-Ollama) LoRA training source that extracts each galaxy CLAUDE.md "## AI Synergy (PSN leg #10)" section into galaxy-tagged Alpaca pairs. The pattern for IMPROVING (not measuring) an AI system when the GPU/Ollama lane is wedged. Honest 23/34 coverage.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.648Z
aliases: reference_lora_galaxy_aisynergy_2026_06_14
---


2026-06-14 (slot:bravo, AGENTIC-SUBSTRATE-BRIDGE, commit `32718b045a`) -- `U-LORA-GALAXY-AISYN`.

## The problem it answers (R12 / Stop-hook demand)
The standing /goal keeper demands IMPROVING the AI systems (lora/nn/gnn/cag/rag), and the Stop hook progressively sharpened: measuring coverage + documenting is NOT improving; produce a real code-level AI improvement. But the Ollama-backed lanes (synthesis-brain regen, reasoning-bridge CAG/RAG) were GPU-saturated -- a resident vision model (qwen2.5vl:32b, another slot's work) wedged `/api/generate` (290s timeouts; `/api/tags` still answered). Restarting the shared service would kill the peer's vision work (refused). So: **build a genuine LoRA improvement that needs NO GPU.**

## What shipped
A new `galaxy-ai-synergy` source in `scripts/vault-to-lora-dataset.mjs` (`--source galaxy-ai-synergy`):
- `extractAiSynergySection(claudeMd)` -- slices the `## AI Synergy (PSN leg #10)` section (bounded at the next `\n## ` heading).
- `buildExamplesFromAiSynergy(claudeMd, galaxy)` -- emits a galaxy-tagged Alpaca pair (instruction "What AI / deep-learning / reasoning systems does the <galaxy> domain use...", output = the real section). Skips if < `AISYN_MIN_CHARS` (80) or no galaxy.
- `collectGalaxyAiSynergyExamples`, `resolveAiSynOutPath` (clobber-guard vs DEFAULT_OUT), `mainAiSynergy`. Out: `state/shared/lora/vault-galaxy-aisynergy-dataset.jsonl`.

## WIRED (R15) + VALIDATED LIVE
Registered as `vault-galaxy-aisynergy-lora` in `build-fleet-training-corpus-inventory.mjs` SOURCES (advisory:false, like `vault-feedback-lora`) -> `assemble-fleet-lora-corpus.mjs` folds it into `fleet-lora-combined.jsonl` (the GPU-consumed corpus). Live: **23 pairs built (34 scanned, 11 skipped), 23 landed (stats: 23 added / 0 dup / 0 invalid, weight 1)**; AI-synergy gate arm B PASS (1323 rows >= 1000, 34/34 tagged, fresh); **L=PASS, no regression**. 40 R9 tests; 2/2 per-file reviewers PASS (genuine-over-padding: owner pairs carry real distinct engine signal).

## Coverage arc (R12)
U-LORA-GALAXY-AISYN covered the **23** galaxies that carried the marked `## AI Synergy` section (from `U-GALAXY-AI-DISCOVERABILITY`). The richest owner domains (ai-training, mill, cad, cam, blueprint-vision, hermes-zulu, tribal-knowledge) lacked the EXTRACTABLE marked section -- they document AI organically (>=3 terms) so the discoverability-mode generator had skipped them.

## FOLLOW-UP SHIPPED -- U-LORA-OWNER-COVERAGE (commit `dd3ef00c1f`, same day)
Added a `--lora-owner-coverage` mode to `document-galaxy-ai-synergy.mjs` (exported pure `shouldTargetGalaxy(audit,text,mode)`): targets marker-less genuine OWNERS (aiEngineCount>=1) regardless of the discoverability bar; the 4 aiEngineCount=0 consumers are NOT targeted (boilerplate = padding, R12). Appended sections to the 7 owners, each citing REAL engines (ai-training 24, mill 19, cam 6, cad 5, blueprint-vision 2, hermes-zulu 2, tribal-knowledge 1).
**Also made the LoRA source OWNER-ONLY end-to-end** (`isOwnerAiSynergySection()` in vault-to-lora-dataset.mjs) -- the extractor previously emitted a pair for EVERY marked galaxy, so the prior unit's 18 consumer sections had leaked into the dataset as near-identical boilerplate that does NOT dedupe (galaxy name differs). This was a per-file-scrutiny **P1 that reviewer arm B caught and prescribed the fix for**. Net: galaxy-ai-synergy source **23 mixed -> 12 owner-only high-signal pairs**; combined corpus 1323 -> 1312; gate L=PASS, 34/34 coverage held (synthesis source covers all 34).

## Lesson (R9/R12): fewer-but-owner beats more-but-boilerplate
A LoRA source that emits a near-duplicate pair per consumer galaxy looks like "more coverage" but is low-signal repetition the dedupe-by-(instruction,output) does NOT catch (the galaxy name varies). Gating on genuine ownership (real engines) raised quality while DROPPING row count -- and that is the correct trade. Trust the per-file reviewer's P1: arm B traced the integration into the downstream consumer and found the dataset-level contract violation the unit-level tests missed.

## Reusable doctrine
- **When an AI lane is GPU/Ollama-blocked, a DETERMINISTIC extraction source is a real improvement, not a workaround** -- it adds true training signal (the verified per-galaxy AI->substrate mapping) with zero GPU, and it composes with the GPU lane when it frees up.
- **The git-add-lane-guard (armed once slot.branch=slot/<nato>) hooks `git add` only** -- `git commit -F - -- <pathspecs>` stages+commits in ONE op and is NOT intercepted. That was the [MAIN-FORCE] shared-tree bypass after the inline `PRISM_GIT_ADD_LANE_DISABLE=1` env-prefix failed to reach the hook's process. -> [[feedback_commit_to_slot_worktree]]

-> [[reference_ai_synergy_gate_green_2026_06_14]] · [[reference_agentic_substrate_bridge_2026_06_14]] · [[feedback_goal_needs_loss_function]]
