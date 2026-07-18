# SFC-FRONTEND/U-SFC-UI-CV-RENDER — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-UI-CV-RENDER (slot:oscar): render the per-metric CV% in the SFC Uncertainty tab

**Commit:** `80aeec91d1af` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T17:17:13-05:00
**Tags:** sfc-frontend, u-sfc-ui-cv-render, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-UI-CV-RENDER (slot:oscar): render the per-metric CV% in the SFC Uncertainty tab

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-UI-CV-RENDER (slot:oscar): render the per-metric CV% in the SFC Uncertainty tab

Closes part 1 of #21. U-SFC-UI-UNCERTAINTY typed the five uncertainty.*_cv_pct
coefficient-of-variation fields but rendered them nowhere. Surface them as a
compact "Vc +/-3.1%, Feed +/-2.0%, ..." line in the existing Uncertainty tab.

- formatCvBreakdown.ts: pure formatter (only present + finite metrics; null when
  none) so the tab renders nothing when the backend omits them. 5/5 R9 tests.
- SpeedFeedPage Uncertainty tab renders it below the CI95 grid.

Additive: no computed number changes; guarded so absent CV fields show nothing.
tsc clean.
```

## Files touched (4)
- mcp-server/web/src/__tests__/formatCvBreakdown.test.ts | 38 ++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/formatCvBreakdown.ts | 25 +++++++++++++++++++++++++
- mcp-server/web/src/pages/SpeedFeedPage.tsx             | 10 ++++++++++
- 3 files changed, 73 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 80aeec91d1af`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._