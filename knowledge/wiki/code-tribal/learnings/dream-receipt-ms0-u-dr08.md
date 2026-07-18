# DREAM-RECEIPT-MS0/U-DR08 — [MAIN] [DREAM-RECEIPT-MS0]/U-DR08 (slot:bravo iter16): Stop-hook integration. stop-obsidian-memory-feed.mjs gains opt-in PRISM_DREAM_STAGE_MEMORY=1 second-spawn → scripts/dream-stage-memory-receipt.mjs writes STAGED Hermes-Dreaming receipt bundle under state/shared/dream-artifacts/<id>/ each Stop. Operator reviews via /dream-review before apply — strictly advisory, NEVER mutates memory. Bundle format mirrors DreamArtifactBundleEngine.fromMemoryDiff (mem-add/del/chg proposals + memory sources + staged manifest + REPORT). Pure-fs (no TS engine import) keeps Stop-hook light. 7 exports tested: sha256+scanMemoryDir+diffSnapshots+artifactId+renderReport+buildBundleFiles+run. 16/16 PASS hermetic with Windows path-sep mocked fs. Knobs: PRISM_DREAM_STAGE_MEMORY (opt-in), _DRY_RUN, _QUIET, _MAX_FILES=200. Closes U-DR08 from spec.

**Commit:** `3f5ebce7a262` · **By:** markjvillanueva3-cloud · **At:** 2026-05-26T19:50:54-05:00
**Tags:** dream-receipt-ms0, u-dr08, auto-distilled

## Subject
[MAIN] [DREAM-RECEIPT-MS0]/U-DR08 (slot:bravo iter16): Stop-hook integration. stop-obsidian-memory-feed.mjs gains opt-in PRISM_DREAM_STAGE_MEMORY=1 second-spawn → scripts/dream-stage-memory-receipt.mjs writes STAGED Hermes-Dreaming receipt bundle under state/shared/dream-artifacts/<id>/ each Stop. Operator reviews via /dream-review before apply — strictly advisory, NEVER mutates memory. Bundle format mirrors DreamArtifactBundleEngine.fromMemoryDiff (mem-add/del/chg proposals + memory sources + staged manifest + REPORT). Pure-fs (no TS engine import) keeps Stop-hook light. 7 exports tested: sha256+scanMemoryDir+diffSnapshots+artifactId+renderReport+buildBundleFiles+run. 16/16 PASS hermetic with Windows path-sep mocked fs. Knobs: PRISM_DREAM_STAGE_MEMORY (opt-in), _DRY_RUN, _QUIET, _MAX_FILES=200. Closes U-DR08 from spec.

## Body
```
[MAIN] [DREAM-RECEIPT-MS0]/U-DR08 (slot:bravo iter16): Stop-hook integration. stop-obsidian-memory-feed.mjs gains opt-in PRISM_DREAM_STAGE_MEMORY=1 second-spawn → scripts/dream-stage-memory-receipt.mjs writes STAGED Hermes-Dreaming receipt bundle under state/shared/dream-artifacts/<id>/ each Stop. Operator reviews via /dream-review before apply — strictly advisory, NEVER mutates memory. Bundle format mirrors DreamArtifactBundleEngine.fromMemoryDiff (mem-add/del/chg proposals + memory sources + staged manifest + REPORT). Pure-fs (no TS engine import) keeps Stop-hook light. 7 exports tested: sha256+scanMemoryDir+diffSnapshots+artifactId+renderReport+buildBundleFiles+run. 16/16 PASS hermetic with Windows path-sep mocked fs. Knobs: PRISM_DREAM_STAGE_MEMORY (opt-in), _DRY_RUN, _QUIET, _MAX_FILES=200. Closes U-DR08 from spec.
```

## Files touched (4)
- .claude/hooks/stop-obsidian-memory-feed.mjs |  28 +++
- scripts/dream-stage-memory-receipt.mjs      | 267 +++++++++++++++++++++++
- scripts/dream-stage-memory-receipt.test.mjs | 325 ++++++++++++++++++++++++++++
- 3 files changed, 620 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3f5ebce7a262`
- Milestone envelope: `mcp-server/data/milestones/DREAM-RECEIPT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._