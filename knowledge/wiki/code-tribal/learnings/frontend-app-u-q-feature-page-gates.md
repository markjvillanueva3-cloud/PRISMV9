# FRONTEND-APP/U-Q-FEATURE-PAGE-GATES — [MAIN-FORCE] [FRONTEND-APP]/U-Q-FEATURE-PAGE-GATES (slot:quebec): gate paid feature pages (3 wizards + print-to-CNC + CAD/CAM AI) behind entitlement keys

**Commit:** `4ad0862e2618` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T10:28:50-05:00
**Tags:** frontend-app, u-q-feature-page-gates, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-FEATURE-PAGE-GATES (slot:quebec): gate paid feature pages (3 wizards + print-to-CNC + CAD/CAM AI) behind entitlement keys

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-FEATURE-PAGE-GATES (slot:quebec): gate paid feature pages (3 wizards + print-to-CNC + CAD/CAM AI) behind entitlement keys

QX8: wrap the remaining paid main-app feature routes in <FeatureGate feature=KEY> so free/under-tier users get an UpgradePrompt instead of the feature. Verified against ENTITLEMENT_MATRIX (data/pricing.ts).

Gates added:
- /print-to-cnc -> print_to_cnc (pro+)
- /lathe{,/wizard,/results} -> wizard.lathe (pro+)
- /milling{,/wizard,/results} -> wizard.mill (pro+)
- /wire-edm{,/wizard,/results} -> wizard.wedm (pro+)
- /cam-strategy -> cadcam (shop+)
- /cam-ai-dashboard -> cadcam (FeatureGate INSIDE the existing secure(lead) wrapper)

Left open (adversarially verified -- launch-blocker if gated):
- SFC pages (sfc.basic free-capped; in-component 403 handles the cap)
- /wire-edm-studio (process page, no matrix key)
- quoting + erp + cost-estimator (FEATURE_NOT_YET_LIVE: canUseFeature denies for every plan incl enterprise)
- marketing/auth/checkout, shop-floor/safety/kiosk, RBAC-secured ERP/HR pages

New routeFeatureGates.test.ts binds App.tsx source to the matrix: fails on a dropped gate, a wrong key, or an over-gate of a free/not-yet-live/safety route. 5/5 pass; web tsc clean; per-file 2-arm scrutiny PASS (2 P2 deferrals).
```

## Files touched (3)
- mcp-server/web/src/App.tsx                             |  32 +++++++++------
- mcp-server/web/src/__tests__/routeFeatureGates.test.ts | 168 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 188 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- wrong key, or an over-gate of a free/not-yet-live/safety route. 5/5 pass; web tsc clean; per-file 2-arm scrutiny PASS (2 P2 deferrals).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 4ad0862e2618`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._