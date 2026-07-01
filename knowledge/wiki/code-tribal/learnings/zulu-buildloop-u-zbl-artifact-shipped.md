# ZULU-BUILDLOOP/U-ZBL-ARTIFACT-SHIPPED — [MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-ARTIFACT-SHIPPED (slot:zulu): drift-immune artifact-existence shipped-detection -- pointer perpetually re-drove a DRAINED C1-C8 queue

**Commit:** `0511a885e834` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T08:51:00-05:00
**Tags:** zulu-buildloop, u-zbl-artifact-shipped, auto-distilled

## Subject
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-ARTIFACT-SHIPPED (slot:zulu): drift-immune artifact-existence shipped-detection -- pointer perpetually re-drove a DRAINED C1-C8 queue

## Body
```
[MAIN-FORCE] [ZULU-BUILDLOOP]/U-ZBL-ARTIFACT-SHIPPED (slot:zulu): drift-immune artifact-existence shipped-detection -- pointer perpetually re-drove a DRAINED C1-C8 queue

Pointer showed next:C1/done:0 while all 8 capability engines are built+wired. Root cause:
ZERO C<n>/[HERMES-CAPABILITY-C<n>] commit subjects on this branch -> both parseShipped and
parseShippedFromCommits miss every unit (recurring; 06-16/06-18 fixes don't hold). Fix:
pure opts.extraShipped union + reality-grounded shippedByArtifact (engine-file existence,
fail-soft). C1 verified COMPLETE. TEST 44/44 (8 new). VALIDATE live pointer 0->8 DRAINED.
2-arm scrutiny PASS; arm-C P2 revert-blindness -> doctrine caveat.
```

## Files touched (5)
- scripts/lib/zulu-build-queue.mjs      |  9 +++++++++
- scripts/lib/zulu-build-queue.test.mjs | 24 ++++++++++++++++++++++++
- scripts/zulu-build-loop.mjs           | 46 +++++++++++++++++++++++++++++++++++++++++++++-
- scripts/zulu-build-loop.test.mjs      | 34 +++++++++++++++++++++++++++++++++-
- 4 files changed, 111 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0511a885e834`
- Milestone envelope: `mcp-server/data/milestones/ZULU-BUILDLOOP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._