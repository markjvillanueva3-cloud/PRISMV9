# SIERRA-VIZ/U-VIZ-STALE-SKIP-THRESHOLD-DOC — [MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-STALE-SKIP-THRESHOLD-DOC (slot:sierra): document the deliberate guard(7d)-vs-lever(30d) threshold gap (3-of-3 arm C P2)

**Commit:** `ad98f827e644` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T22:07:12-05:00
**Tags:** sierra-viz, u-viz-stale-skip-threshold-doc, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-STALE-SKIP-THRESHOLD-DOC (slot:sierra): document the deliberate guard(7d)-vs-lever(30d) threshold gap (3-of-3 arm C P2)

## Body
```
[MAIN-FORCE] [SIERRA-VIZ]/U-VIZ-STALE-SKIP-THRESHOLD-DOC (slot:sierra): document the deliberate guard(7d)-vs-lever(30d) threshold gap (3-of-3 arm C P2)

Arm C flagged a coherence gap: the freshness guard ALARMS a non-HEAVY orphan at staleHr
(7d) while the stale-skip lever DROPS at 30d -- a future operator could read 'guard flags
it but enabling the lever did not skip it' as a bug. It is intentional (alarm early +
reversible; drop late + consequential). Documented the 7-30d 'flagged-but-not-yet-skipped'
window at MERGE_STALE_SKIP_DEFAULT_HR. Comment-only; 15/15.
```

## Files touched (2)
- scripts/lib/augmentation-freshness.mjs | 6 ++++++
- 1 file changed, 6 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ad98f827e644`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-VIZ.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._