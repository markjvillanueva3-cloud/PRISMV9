---
name: soul-aistack-durable-2026-06-14
description: 2026-06-14 (slot:bravo) U-SOUL-AISTACK-DURABLE (commit c1b4e0a00d) -- the per-galaxy SOUL.md "AI Stack (synergized)" block was RENDER-ORPHANED (a manual stamper block the renderer didn't emit), so a generate-galaxy-souls.mjs regen would strip it from all 34 souls fleet-wide. Fix = single-source the block (R7) into renderGalaxySoul + tolerant marker so it survives regen and the two writers never double-stamp.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.208Z
aliases: reference_soul_aistack_durable_2026_06_14
---


2026-06-14 (slot:bravo, AGENTIC-SUBSTRATE-BRIDGE, commit `c1b4e0a00d`). Found while verifying the /goal element "souls.md of each galaxy" -- the ONE goal element the AI-synergy gate does NOT measure (the audit scores discoverability from CLAUDE.md + MEMORY.md only, never SOUL.md).

## The finding (a latent fleet-wide regression)
All 34 galaxy `SOUL.md` carry an `## AI Stack (synergized)` block (galaxy-reasoning-bridge PSN leg #10 + hybrid RAG + CAG + LoRA-emit + GNN cross-substrate), added 2026-06-11 by `scripts/soul-ai-synergy-stamp.mjs` (slot tango) as a manual `<!-- AI-SYNERGY-STACK:tango-2026-06-11 -->` block. But `renderGalaxySoul` (`scripts/lib/galaxy-soul-render.mjs`, the generator's renderer) NEVER emitted that block -- it was **render-orphaned**. So the next `generate-galaxy-souls.mjs` run OVERWRITES each soul WITHOUT the block, stripping the AI stack from all 34 souls. **VERIFIED by running the regen: it deleted the block from 34/34; I reverted.** (This is exactly why I also caught + reverted my own first instinct to "refresh the souls" -- the generator was the destroyer.)

## R12 self-correction chain (two misdiagnoses, both caught)
1. First called the souls.md element a "no-op already covered" -- TRUE they had the block, but I nearly ran the generator to "refresh," which would have STRIPPED it. Caught by reading the diff before committing.
2. Per-file scrutiny arm A caught a **P1 double-stamp**: my first fix made the renderer emit a DATELESS marker, but the sibling stamper keyed idempotency on the DATED marker -> a stamper run after a regen would append a SECOND block to all 34 (two writers, drifted markers).

## The fix (R7 one-writer-of-record + R8 read-the-sibling)
Single-source the block: `galaxy-soul-render.mjs` exports `buildAiStackBlock(galaxy)` + `AI_SYNERGY_STACK_MARKER` (dateless canonical) + `hasAiStackBlock(text)`. `renderGalaxySoul` emits it (durable across regen). `soul-ai-synergy-stamp.mjs` IMPORTS the shared builder/marker (deleted its private `MARKER`/`blockFor`). `hasAiStackBlock` regex `/<!--\s*AI-SYNERGY-STACK(:[^>]*)?\s*-->/` matches BOTH the canonical AND the legacy dated form -> neither writer double-stamps. Live souls left UNTOUCHED (didn't re-run the generator -- avoids unrelated Identity/timestamp churn; the fix protects FUTURE regens).

## Validation
renderer 17/17 + stamper 6/6 (mutation-proven: each named mutation kills >=1 test; the legacy-marker-skip is the double-stamp regression pin). LIVE: `hasAiStackBlock` recognizes 34/34 live (dated-marker) souls -> a stampSouls run would SKIP all 34 (0 double-stamp). 3-of-3 PASS (no P0/P1; one P2/P3 = `buildAiStackBlock("")` empty-galaxy edge, unanimously confirmed unreachable). git diff = only the 4 scripts/ files (NO_SOUL_FILES_IN_COMMIT).

## Lesson (reusable, fleet-wide)
**A doc block appended to a generated file by a SEPARATE stamper is render-orphaned -- the next regen of that file deletes it.** When you find content in a generated artifact that the generator doesn't produce, fold it INTO the generator (single source, R7) rather than leaving a parallel stamper. And when two tools write the same block, share ONE builder + ONE marker + a tolerant idempotency check, or they WILL drift and double-write.

-> [[reference_lora_galaxy_aisynergy_2026_06_14]] · [[reference_ai_synergy_gate_green_2026_06_14]] · [[feedback_audit_consumers_when_moving_logic_into_engine]]
