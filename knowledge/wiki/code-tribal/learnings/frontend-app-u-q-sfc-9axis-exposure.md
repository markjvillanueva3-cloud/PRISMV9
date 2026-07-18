# FRONTEND-APP/U-Q-SFC-9AXIS-EXPOSURE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-9AXIS-EXPOSURE (slot:quebec): expose full 9-axis orchestrator + UQ on the standalone SFC page (gated)

**Commit:** `18d1e2d15ff7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T08:13:02-05:00
**Tags:** frontend-app, u-q-sfc-9axis-exposure, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-9AXIS-EXPOSURE (slot:quebec): expose full 9-axis orchestrator + UQ on the standalone SFC page (gated)

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-9AXIS-EXPOSURE (slot:quebec): expose full 9-axis orchestrator + UQ on the standalone SFC page (gated)

QX2 of the launch frontend queue. The standalone /speed-feed-calc page previously
reached only basic /calculate; this surfaces the full SpeedFeedOrchestrator
(8 resolvers + Monte Carlo UQ) as a new gated '9-Axis' tab.

- components/sfc/advancedSpeedFeedParams.ts: pure mapper page-selections -> flat
  SpeedFeedParams (union-guarded iso_group/coolant_type, zero/NaN dims omitted,
  tool fallback). 8 reference-value tests.
- components/sfc/AdvancedSpeedFeedPanel.tsx: dark panel reusing the page's
  selected material/operation/tool/params -> sfOrchestrate -> the PROVEN
  normalizeCalculatorSpeedFeedResult + classifyCalculatorResultSafetyPosture
  contract (no reinvention). Always renders the release posture + confidence% +
  limiting factors alongside metrics (oscar soul: never publish a speed/feed
  without uncertainty). Resets a stale solve when inputs change. 5 RTL tests
  (real normalizer round-trip, only the hook mocked).
- SfcCalculatorPage: new '9-Axis' right-column tab gated by
  <FeatureGate feature='sfc.nine_axis'> -- free users get the UpgradePrompt
  (conversion), starter+ get the orchestrator. Arrow-key tab nav preserved.
- 13/13 tests, web tsc clean, 2-arm per-file scrutiny PASS (both, P2 reset fixed).
```

## Files touched (6)
- mcp-server/web/src/__tests__/AdvancedSpeedFeedPanel.test.tsx | 101 ++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/__tests__/advancedSpeedFeedParams.test.ts | 119 ++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/AdvancedSpeedFeedPanel.tsx | 184 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/components/sfc/advancedSpeedFeedParams.ts |  62 +++++++++++++++++++++++
- mcp-server/web/src/pages/SfcCalculatorPage.tsx               |  17 ++++++-
- 5 files changed, 482 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 18d1e2d15ff7`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._