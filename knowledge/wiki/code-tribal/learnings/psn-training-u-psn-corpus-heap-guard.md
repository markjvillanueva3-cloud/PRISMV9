# PSN-TRAINING/U-PSN-CORPUS-HEAP-GUARD — [MAIN-FORCE] [PSN-TRAINING]/U-PSN-CORPUS-HEAP-GUARD (slot:papa): self-reexec --max-old-space-size guard so the PSN training-corpus build never OOMs on default heap (cron/ad-hoc/loop) -- clone of nn-graph-retrain-lifecycle::shouldReexecForHeap; knob PRISM_PSN_CORPUS_HEAP_MB(16384). 14/14 tests incl bare-launch E2E that FATAL'd pre-fix at ~378MB. fleet-infra: PSN substrate serves all 11 legs

**Commit:** `cf7c3bcc043f` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T19:42:31-05:00
**Tags:** psn-training, u-psn-corpus-heap-guard, auto-distilled

## Subject
[MAIN-FORCE] [PSN-TRAINING]/U-PSN-CORPUS-HEAP-GUARD (slot:papa): self-reexec --max-old-space-size guard so the PSN training-corpus build never OOMs on default heap (cron/ad-hoc/loop) -- clone of nn-graph-retrain-lifecycle::shouldReexecForHeap; knob PRISM_PSN_CORPUS_HEAP_MB(16384). 14/14 tests incl bare-launch E2E that FATAL'd pre-fix at ~378MB. fleet-infra: PSN substrate serves all 11 legs

## Body
```
[MAIN-FORCE] [PSN-TRAINING]/U-PSN-CORPUS-HEAP-GUARD (slot:papa): self-reexec --max-old-space-size guard so the PSN training-corpus build never OOMs on default heap (cron/ad-hoc/loop) -- clone of nn-graph-retrain-lifecycle::shouldReexecForHeap; knob PRISM_PSN_CORPUS_HEAP_MB(16384). 14/14 tests incl bare-launch E2E that FATAL'd pre-fix at ~378MB. fleet-infra: PSN substrate serves all 11 legs
```

## Files touched (3)
- scripts/build-psn-training-corpus.mjs      |  45 ++++++++++++++++++++++++++++
- scripts/build-psn-training-corpus.test.mjs | 219 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 264 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show cf7c3bcc043f`
- Milestone envelope: `mcp-server/data/milestones/PSN-TRAINING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._