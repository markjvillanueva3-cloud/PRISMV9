# FRONTEND-APP/U-Q-SFC-VIBRATION-GATE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VIBRATION-GATE (slot:quebec): gate /vibration route to sfc.sld -- plug paid-feature-leaking-free revenue leak

**Commit:** `61b471dd112c` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T20:33:48-05:00
**Tags:** frontend-app, u-q-sfc-vibration-gate, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VIBRATION-GATE (slot:quebec): gate /vibration route to sfc.sld -- plug paid-feature-leaking-free revenue leak

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VIBRATION-GATE (slot:quebec): gate /vibration route to sfc.sld -- plug paid-feature-leaking-free revenue leak

F2 from SFC-ENTITLEMENT-FINDINGS-2026-06-22 (highest-ROI fix). VibrationPage (route /vibration, App.tsx:373) was the lone ungated SFC route -- it consumes the full SLD/chatter/modal/damping backend via useVibration* hooks (= the sfc.sld feature: free=false paid, starter+=true), but ANY signed-in user incl free could reach it, while the pricing matrix sells sfc.sld as starter+. Wrapped the route in <FeatureGate feature="sfc.sld"> matching the 13 existing route-level gates (FeatureGate already imported App.tsx:5). Added [vibration -> sfc.sld] to routeFeatureGates.test.ts EXPECTED_GATES so the QX8 gate-invariant now REQUIRES the gate (a future edit cannot silently re-drop it); sfc.sld is real+PAID+live so it passes the no-over-gate invariant; vibration is not in MUST_STAY_OPEN (no conflict). routeFeatureGates 5/5 + entitlement/FeatureGate/UpgradePrompt/pricing cluster 56/56 green; web tsc 0 errors.
```

## Files touched (3)
- mcp-server/web/src/App.tsx                             | 2 +-
- mcp-server/web/src/__tests__/routeFeatureGates.test.ts | 4 ++++
- 2 files changed, 5 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 61b471dd112c`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._