# SFC-JM-ACCURACY/U-SFC-JM-REFRESH — [MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-JM-REFRESH (slot:oscar): one-call refresh runner -- incremental corpus + analyze, cron-able

**Commit:** `9273a2a67173` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T08:31:50-05:00
**Tags:** sfc-jm-accuracy, u-sfc-jm-refresh, auto-distilled

## Subject
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-JM-REFRESH (slot:oscar): one-call refresh runner -- incremental corpus + analyze, cron-able

## Body
```
[MAIN-FORCE] [SFC-JM-ACCURACY]/U-SFC-JM-REFRESH (slot:oscar): one-call refresh runner -- incremental corpus + analyze, cron-able

Chains sfc-jm-program-corpus (INCREMENTAL by default; resumes at cursor, picks up
newly-written JM programs; --full re-extracts all) then sfc-jm-corpus-analyze.
Built to be scheduler-pointed so the 'test SFC against ALL JM programs' corpus +
outlier report stay current as the shop writes programs. windowsHide spawn,
sequential, non-zero exit on stage failure. Smoke-validated: incremental run ->
0 new (corpus already 154,414) -> analyze 1.17M ops -> report refreshed.
```

## Files touched (2)
- scripts/sfc-jm-accuracy-refresh.mjs | 53 +++++++++++++++++++++++++++++++++++++++++++++++++++++
- 1 file changed, 53 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9273a2a67173`
- Milestone envelope: `mcp-server/data/milestones/SFC-JM-ACCURACY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._