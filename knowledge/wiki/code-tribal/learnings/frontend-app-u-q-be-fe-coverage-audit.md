# FRONTEND-APP/U-Q-BE-FE-COVERAGE-AUDIT — [MAIN-FORCE] [FRONTEND-APP]/U-Q-BE-FE-COVERAGE-AUDIT (slot:quebec): deterministic backend->frontend coverage map (the 'plan for EVERYTHING' tool)

**Commit:** `45ef44b24d68` · **By:** markjvillanueva3-cloud · **At:** 2026-06-25T21:22:15-05:00
**Tags:** frontend-app, u-q-be-fe-coverage-audit, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-BE-FE-COVERAGE-AUDIT (slot:quebec): deterministic backend->frontend coverage map (the 'plan for EVERYTHING' tool)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-BE-FE-COVERAGE-AUDIT (slot:quebec): deterministic backend->frontend coverage map (the 'plan for EVERYTHING' tool)

Operator /goal: wire ALL backend to the new frontend. Built the INVERSE of the FE->BE contract audit:
which dispatcher actions have NO frontend consumer (unexposed backend capabilities). Reuses the tested
buildDispatcherMap() parser (handles z.enum / *_ACTIONS arrays / Object.keys maps / case labels across
all 121 dispatcher files), then flags any action whose string appears NOWHERE in web/src as a
high-confidence orphan (referencedCeiling is an UPPER bound -- common-word coincidences counted, so the
orphan set is the actionable signal).

LIVE RESULT: 100 dispatchers, 13,901 actions, 13,243 orphan (4.7% referenced-ceiling). Biggest unexposed
surfaces: prism_cam 2456, prism_calc 1456, prism_dev 1027, prism_business 888, prism_pp 791,
prism_intelligence 596, prism_cad 583, prism_mill 432, prism_turning 410, prism_edm 386. (Most are
internal compute that should stay headless; the shop-floor-valuable subset is the wiring target.)

Reproducible + cron-able (operator wanted 'crons that fire'): node scripts/audit-backend-fe-coverage.mjs.
Output: state/shared/dashboards/BACKEND-FE-COVERAGE.{json,md}. 7/7 unit tests (computeCoverage pure fn:
orphan detection, sort-by-orphan, ceiling-is-upper-bound, totals). Feeds the multi-model prioritization
(Grok reasoning lane already voted; gpt-oss:120b GPT lane voting).
```

## Files touched (5)
- scripts/audit-backend-fe-coverage.mjs            |   121 +++
- scripts/audit-backend-fe-coverage.test.mjs       |    76 ++
- state/shared/dashboards/BACKEND-FE-COVERAGE.json | 14253 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- state/shared/dashboards/BACKEND-FE-COVERAGE.md   |    26 +
- 4 files changed, 14476 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 45ef44b24d68`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._