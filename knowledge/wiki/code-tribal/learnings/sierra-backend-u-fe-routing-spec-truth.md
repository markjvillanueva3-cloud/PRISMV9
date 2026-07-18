# SIERRA-BACKEND/U-FE-ROUTING-SPEC-TRUTH — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTING-SPEC-TRUTH (slot:sierra): correct routing spec -- 22 LIVE mounted P0s, not 0/INFO

**Commit:** `acb047c3491c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T15:19:04-05:00
**Tags:** sierra-backend, u-fe-routing-spec-truth, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTING-SPEC-TRUTH (slot:sierra): correct routing spec -- 22 LIVE mounted P0s, not 0/INFO

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-ROUTING-SPEC-TRUTH (slot:sierra): correct routing spec -- 22 LIVE mounted P0s, not 0/INFO

R12 correction following the stripComments verifier-blindness fix. The spec said 'mounted-P0
campaign COMPLETE 0 P0' + '22 INFO unmounted lower-ROI' -- both wrong (the verifier was blind to
58 routers). True state: 22 LIVE mounted P0s in erp/manus/orchestration/milling/pipeline, all
app.use'd, enumerated with owner + 501/lookup fix plan. Now tracked as the gate baseline.
```

## Files touched (2)
- state/shared/FE-ROUTE-WIRING-OTHER-GALAXIES-ROUTING.md | 15 +++++++++++++--
- 1 file changed, 13 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- wrong (the verifier was blind to

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show acb047c3491c`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._