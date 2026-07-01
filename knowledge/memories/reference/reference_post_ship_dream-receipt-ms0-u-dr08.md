---
name: reference_post_ship_dream-receipt-ms0-u-dr08
description: Auto-distilled learnings from shipping DREAM-RECEIPT-MS0/U-DR08 (commit 3f5ebce7a). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.840Z
aliases: reference_post_ship_dream-receipt-ms0-u-dr08
---


# DREAM-RECEIPT-MS0/U-DR08

[MAIN] [DREAM-RECEIPT-MS0]/U-DR08 (slot:bravo iter16): Stop-hook integration. stop-obsidian-memory-feed.mjs gains opt-in PRISM_DREAM_STAGE_MEMORY=1 second-spawn → scripts/dream-stage-memory-receipt.mjs writes STAGED Hermes-Dreaming receipt bundle under state/shared/dream-artifacts/<id>/ each Stop. Operator reviews via /dream-review before apply — strictly advisory, NEVER mutates memory. Bundle format mirrors DreamArtifactBundleEngine.fromMemoryDiff (mem-add/del/chg proposals + memory sources + staged manifest + REPORT). Pure-fs (no TS engine import) keeps Stop-hook light. 7 exports tested: sha256+scanMemoryDir+diffSnapshots+artifactId+renderReport+buildBundleFiles+run. 16/16 PASS hermetic with Windows path-sep mocked fs. Knobs: PRISM_DREAM_STAGE_MEMORY (opt-in), _DRY_RUN, _QUIET, _MAX_FILES=200. Closes U-DR08 from spec.

**Shipped:** 2026-05-26T19:50:54-05:00 by markjvillanueva3-cloud
**Files:** 4 touched

Full distillation: [[dream-receipt-ms0-u-dr08]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._