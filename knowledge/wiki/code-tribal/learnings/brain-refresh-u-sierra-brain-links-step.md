# BRAIN-REFRESH/U-SIERRA-BRAIN-LINKS-STEP — [MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-LINKS-STEP (slot:sierra): ambiguous-links sentinel now auto-refreshes in brain-refresh (last stale cheap measurement)

**Commit:** `09e197233abc` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T20:21:02-05:00
**Tags:** brain-refresh, u-sierra-brain-links-step, auto-distilled

## Subject
[MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-LINKS-STEP (slot:sierra): ambiguous-links sentinel now auto-refreshes in brain-refresh (last stale cheap measurement)

## Body
```
[MAIN-FORCE] [BRAIN-REFRESH]/U-SIERRA-BRAIN-LINKS-STEP (slot:sierra): ambiguous-links sentinel now auto-refreshes in brain-refresh (last stale cheap measurement)

The ambiguous-broken-links report was the last CHEAP brain measurement not in brain-refresh (only rot/supersession were, from iter1), so it rotted stale -- caught LIVE in iter6 when the brain-health inject fired on the stale ambiguous row (forcing the CORE_MEASUREMENTS scoping). Added vault-link-doctor.mjs --ambiguous as a requires:none step (READ-ONLY: writes only the review JSON, never a memo) ordered before vault-health so the rollup aggregates its fresh report. All cheap sentinels (rot/supersession/ambiguous) + the rollup now auto-refresh; only contradiction stays out (NLI model, own cadence). 68/68. Live: vault-rot 13s -> supersession 0s -> vault-links 7s -> vault-health 0s exit 0; ambiguous now stale=false ageDays=0.
```

## Files touched (3)
- scripts/brain-refresh.mjs      |  6 +++++-
- scripts/brain-refresh.test.mjs | 20 ++++++++++++--------
- 2 files changed, 17 insertions(+), 9 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 09e197233abc`
- Milestone envelope: `mcp-server/data/milestones/BRAIN-REFRESH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._