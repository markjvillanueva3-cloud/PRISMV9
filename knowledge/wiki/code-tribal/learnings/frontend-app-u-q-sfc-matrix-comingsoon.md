# FRONTEND-APP/U-Q-SFC-MATRIX-COMINGSOON — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-MATRIX-COMINGSOON (slot:quebec): pricing matrix renders not-yet-live cells as Soon, not Included

**Commit:** `647bf46e5528` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:27:11-05:00
**Tags:** frontend-app, u-q-sfc-matrix-comingsoon, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-MATRIX-COMINGSOON (slot:quebec): pricing matrix renders not-yet-live cells as Soon, not Included

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-MATRIX-COMINGSOON (slot:quebec): pricing matrix renders not-yet-live cells as Soon, not Included

F4 from SFC-ENTITLEMENT-FINDINGS-2026-06-22. The public comparison matrix showed a green Included check (and Add-on / numeric grants) in the per-plan cells for quoting/erp, while the same row carried a coming-soon badge -- a contradiction a prospect sees. New pure matrixCellToken(feature,plan): where a not-yet-live feature WOULD be included (true/addon/numeric ceiling), render Soon instead; excluded cells stay -; live features render the normal entitlementLabel unchanged. PricingPage CellMark gains a Soon violet pill matching the label badge. pricing.test.ts +5: Soon on would-include (true+addon), - on excluded, live features unchanged, an anti-oversell INVARIANT (no not-yet-live cell ever shows Included/Add-on/Unlimited/numeric), and a live-cell agreement check (no-op for live features). 74/74 sibling cluster green (pricing/entitlement/FeatureGate/routeFeatureGates/UpgradePrompt/checkout), web tsc 0 errors.
```

## Files touched (4)
- mcp-server/web/src/__tests__/pricing.test.ts | 53 ++++++++++++++++++++++++++++
- mcp-server/web/src/data/pricing.ts           | 12 +++++++
- mcp-server/web/src/pages/PricingPage.tsx     | 13 +++++--
- 3 files changed, 76 insertions(+), 2 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 647bf46e5528`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._