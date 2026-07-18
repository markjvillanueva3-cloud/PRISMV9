# PICKER-LEAK-FIX/U-PQ-EMBEDDED-UID — [MAIN] [PICKER-LEAK-FIX]/U-PQ-EMBEDDED-UID (slot:mike): phase-letter envelope ids — recover canonical U-ID from title

**Commit:** `c24ed66d9396` · **By:** markjvillanueva3-cloud · **At:** 2026-05-20T14:58:20-05:00
**Tags:** picker-leak-fix, u-pq-embedded-uid, auto-distilled

## Subject
[MAIN] [PICKER-LEAK-FIX]/U-PQ-EMBEDDED-UID (slot:mike): phase-letter envelope ids — recover canonical U-ID from title

## Body
```
[MAIN] [PICKER-LEAK-FIX]/U-PQ-EMBEDDED-UID (slot:mike): phase-letter envelope ids — recover canonical U-ID from title

shipped-units-source-of-truth.mjs: new export extractUnitIdsFromUnit() pulls U-IDs from id/title/name/description; collectCompletedFromEnvelope uses it on every complete-ish node.
priority-queue.mjs rankUnits: symmetric extraction on candidates.
8 new hermetic tests (55/55 PASS).
Memory: reference_u_pq_embedded_uid_2026_05_20
```

## Files touched (4)
- .claude/helpers/priority-queue.mjs                 | 11 +++-
- scripts/lib/shipped-units-source-of-truth.mjs      | 47 ++++++++++++--
- scripts/lib/shipped-units-source-of-truth.test.mjs | 71 ++++++++++++++++++++++
- 3 files changed, 123 insertions(+), 6 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c24ed66d9396`
- Milestone envelope: `mcp-server/data/milestones/PICKER-LEAK-FIX.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._