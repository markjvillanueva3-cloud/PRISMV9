# SFC-FRONTEND/U-SFC-UI-UNCERTAINTY — [MAIN-FORCE] [SFC-FRONTEND]/U-SFC-UI-UNCERTAINTY (slot:oscar): surface dropped backend uncertainty/advisory in the SFC web UI

**Commit:** `c5fac24e4368` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T16:39:02-05:00
**Tags:** sfc-frontend, u-sfc-ui-uncertainty, auto-distilled

## Subject
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-UI-UNCERTAINTY (slot:oscar): surface dropped backend uncertainty/advisory in the SFC web UI

## Body
```
[MAIN-FORCE] [SFC-FRONTEND]/U-SFC-UI-UNCERTAINTY (slot:oscar): surface dropped backend uncertainty/advisory in the SFC web UI

The orchestrator (prism_calc:sf_orchestrate) always emits overall_confidence,
uncertainty.*, safety_checks[], limiting_factors[], playbook_warnings[],
recommendations[] and a conditional uncertainty.condition_warning (thin-wall /
high-temp edge signal). The SFC UI DROPPED condition_warning entirely (no field
on the frontend OrchestratorResult type) and rendered recommendations[] on NO
page -- a speed/feed could be shown with no surfaced uncertainty (violates oscar
soul: never publish a speed/feed without uncertainty).

- types/speedfeed.ts: add the dropped optional fields (condition_warning,
  speed/feed/life/force/ra_cv_pct) to OrchestratorResult.uncertainty.
- components/sfc/deriveAdvisory.ts: pure, framework-free summarizer -> one
  always-non-empty advisory {level, confidence, headline, condition_warning,
  failed safety checks, critical/warning factors, playbook, recommendations}.
  Level precedence: critical (failed safety/limit) > warning (edge cond / low
  conf) > caution (moderate conf / playbook / unknown conf) > ok. Unknown
  confidence is never 'ok'. 12/12 R9 tests.
- components/sfc/UncertaintyAdvisoryBanner.tsx: thin presentation reusing the
  shared Badge; role=status + aria-label. 5/5 RTL DOM tests.
- pages/SpeedFeedPage.tsx: render the banner ABOVE the Results card.

ADDITIVE -- changes no computed number. tsc clean on all touched files.
```

## Files touched (7)
- mcp-server/web/src/__tests__/UncertaintyAdvisoryBanner.test.tsx |  75 ++++++++++++++++++++++
- mcp-server/web/src/__tests__/deriveAdvisory.test.ts             | 126 ++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/UncertaintyAdvisoryBanner.tsx | 113 +++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/deriveAdvisory.ts             | 165 ++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/pages/SpeedFeedPage.tsx                      |   2 +
- mcp-server/web/src/types/speedfeed.ts                           |   9 +++
- 6 files changed, 490 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c5fac24e4368`
- Milestone envelope: `mcp-server/data/milestones/SFC-FRONTEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._