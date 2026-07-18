---
name: reference_yt_tribal_promote_loop_closed_2026_06_25
description: Closed the video /learn promotion loop (slot:india 2026-06-25) -- youtube-night-extract STAGED CAD/machining tribal tips nightly but nothing promoted them into the tribal store; armed the consumer + fixed a scrutiny-caught parseInt-threshold P1 it activated.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.280Z
aliases: reference_yt_tribal_promote_loop_closed_2026_06_25
---


# Video /learn promotion loop CLOSED + parseInt-threshold P1 (2026-06-25, slot:india)

Operator /goal (continuation): "improve CAD/print learning-AI... run the hermes /learn
pipeline on all CAD/eng sources... INCLUDE VIDEOS... only add NEW knowledge." Items 1-3 of
the india CAD-AI queue ([[reference_cad_print_learning_ai_goal_scope_2026_06_24]]) were ALL
verified DONE this session (cad_learning_* loop real+closed+calibrated; text->CAD loop has
tribal-inject + outcome->ledger + reverse-arrow; blueprint RAG/LoRA has tribal auto-inject +
recordOutcome + lora-pairs-from-ledger). The untapped operator-explicit thread was VIDEOS.

## The finding (producer-alive / consumer-dead, VIDEO-lane analog of [[reference_tribal_embed_cron_rearm_2026_06_25]])
`youtube-night-extract.mjs` STAGES tips nightly (queue `state/shared/youtube-extraction/night-queue.json`
already carries fusion/mastercam/hypermill/gd&t/feeds-speeds queries) -> `<videoId>.json` in the
staging dir, deliberately staging-ONLY (clobber-safety, lesson 8bf1873577). But the "PRISM Tribal
Promotion Cron" ran ONLY `promote-tribal-to-wiki.mjs` (tribal->wiki); NOTHING ran
`promote-youtube-staged.mjs` (youtube->tribal). So ~28 valid CAD/machining videos (Fusion 360 CAM,
trochoidal, 5-axis, surface finish) POOLED in staging since 2026-06-12 -- extracted but never injected.

## What shipped (3 commits on cad-fusion-live-ms0, [CAD-LEARNING-AI])
1. **U-YT-PROMOTE-CRON-WIRE** (`b8acbfcf5c`): added `promote-youtube-staged --apply --no-wiki` as STEP 1
   of the existing armed `prism-tribal-promotion-cron.ps1` (before the tribal->wiki step). Fail-soft
   (PS native non-zero exit doesn't abort), idempotent (per-video promotion ledger + U-TK01 content-dedup).
   LIVE PROMOTE: promoted=28 tipsIngested=379 (164 NET-NEW after dedup), TribalKnowledgeEngine captured
   store (`mcp-server/state/tribal_captured_tips.json`) 1309->1473 tips / 994KB->1.17MB (GREW, not
   clobbered), promoted-ledger 24->52; re-run promotable=0 (idempotent). 529 staged are ok:false
   (no-subtitle/failed extractions), correctly skipped.
2. **U-YT-PROMOTE-CRON-THRESHOLD-FIX** (`ce931d7527`): 2-of-2 scrutiny arm B caught a COMPOUND bug my
   step-1 ACTIVATED. The pre-existing step-2 `--threshold 0.9` -> `parseInt('0.9',10)=0` -> the
   high-confidence wiki gate (DEFAULT_THRESHOLD=90, scale 0-100, shouldPromote = conf>=threshold)
   COLLAPSED to 0 = promote-EVERYTHING. Latent until step-1 ingested conf-60 video tips (they'd leak
   into wiki). Fix `0.9`->`90`. LIVE: @90 above=628 (high-conf) vs @0.9->0 above=3919 (6.2x). No live
   damage (WOULD PROMOTE=0; skipExisting==above) -- fixed before it bit.
3. **U-YT-PROMOTE-INSTALLER-ALIGN** (`427b937d29`): aligned the ALTERNATE installer
   `install-tribal-promotion-cron.ps1` (default 0.9->90 [int] + added step-1 to its generated runner)
   so re-running it can't re-introduce the gate-collapse or drop step-1.

## LESSONS
1. **parseInt-fractional trap.** A CLI flag parsed via `parseInt(v,10)` on a 0-100 scale silently
   turns `0.9` into `0`. A threshold of 0 = "promote/accept everything" -- a SILENTLY-disabled gate.
   Always pass an INTEGER for a parseInt-parsed 0-100 knob; the value `0.9` reads as if someone thought
   it was a 0-1 scale. Documented inline so it's never reverted.
2. **A "staged-only by design" lane needs its consumer ARMED separately.** night-extract is staging-only
   for clobber-safety -- correct -- but that makes the PROMOTE step a REQUIRED separate scheduled arm.
   If only the producer is scheduled, knowledge pools forever. Same producer-alive/consumer-dead class
   as the resources-embed lane (fixed earlier today). When you find a scheduled PRODUCER, check the
   CONSUMER is scheduled too.
3. **A fix can ACTIVATE a latent pre-existing bug.** Adding low-confidence data (conf-60 video tips) to
   a pipeline whose downstream gate was silently broken (threshold 0) turned a dormant defect live. The
   2-of-2 scrutiny gate caught it -- exactly its purpose. ALWAYS run the gate even on a "trivial" wire.
4. **promote-youtube-staged writes TribalKnowledgeEngine captured store, NOT the sharded tribal-embed-index.**
   Append-merge via U-TK01 dedup (atomic safeWriteSync) -- different store from the clobber-sensitive shards.

## Also shipped (R16 follow-ups same session)
4. **U-YT-PROMOTE-INSTALLER-ALIGN** (`427b937d29`): aligned the alternate installer (0.9->90 + step1).
5. **U-YT-PROMOTE-INSTALLER-SSOT** (`b0abcc1e93`): installer now registers the COMMITTED runner via
   `-File` instead of generating a %TEMP% copy -> kills BOTH the divergence root cause AND the
   %TEMP% 0xFFFD0000 cron-failure mode ([[reference_cron_temp_path_failure_2026_06_11]]). Single source
   of truth; reviewer-verified behavior-neutral (live task already targets the committed runner).

## OPEN (next session)
- "other reputable sources from ONLINE" (non-video web articles) -- NOT yet addressed. Existing web tooling
  to assess first (R8): `cited-tip-fetch.mjs`, `auto-research-weekly-digest.mjs`, `zulu-brain-web.mjs`.
  Larger build (external-content safety: fetched text is DATA fed to Ollama for tip-gen, never instructions).
- cad_learning deferred P2s: cad_learning_efficacy round-trip DONE (already present, lines 102-114 of
  cadAutomationDispatcher.cad-learning-tribal-inject.test.ts); record_recommendation round-trip is awkward
  (writes live singleton ledger -- needs ledger-path injection the dispatcher doesn't expose); empty-string
  tip filter is cosmetic (real corpora have non-empty tips; output already asserted non-empty).
