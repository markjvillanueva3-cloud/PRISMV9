# COMPACTION-BOUNDARY-FIX/U-CBF02 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [COMPACTION-BOUNDARY-FIX]/U-CBF02 (slot:alpha): drift guard -- fail loud if a future transcript-marker change leaves a re-inlining consumer out of sync

**Commit:** `0dda52f7de7c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-11T00:04:55-05:00
**Tags:** compaction-boundary-fix, u-cbf02, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [COMPACTION-BOUNDARY-FIX]/U-CBF02 (slot:alpha): drift guard -- fail loud if a future transcript-marker change leaves a re-inlining consumer out of sync

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [COMPACTION-BOUNDARY-FIX]/U-CBF02 (slot:alpha): drift guard -- fail loud if a future transcript-marker change leaves a re-inlining consumer out of sync

Hardens U-CBF01. Two byte-tail estimators re-inline the compact-boundary literals
instead of importing COMPACT_MARKERS (chat-token-watch needs a Buffer search; the
hook needs a whitespace-tolerant regex -- both legitimate). That re-inlining is
exactly how the original bug happened: the harness changed the marker and an
estimator kept scanning a dead literal. New test asserts every COMPACT_MARKERS
key/value token is present in each re-inlining consumer's source, so the NEXT
format change is caught in CI, not by a constant-compaction incident. Verified:
49/49 green AND proven to BITE on a simulated unported marker. (scrutiny arm-B P2.)
```

## Files touched (2)
- scripts/lib/__tests__/transcript-token-counter.test.mjs | 37 +++++++++++++++++++++++++++++++++++++
- 1 file changed, 37 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0dda52f7de7c`
- Milestone envelope: `mcp-server/data/milestones/COMPACTION-BOUNDARY-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._