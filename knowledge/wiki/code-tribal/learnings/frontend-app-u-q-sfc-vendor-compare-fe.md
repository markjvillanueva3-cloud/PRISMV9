# FRONTEND-APP/U-Q-SFC-VENDOR-COMPARE-FE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VENDOR-COMPARE-FE (slot:quebec): wire vendor tri-compare FE (sfc.vendor_parity) -- route->api->hook->page->gate

**Commit:** `a97e573e3e51` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:17:33-05:00
**Tags:** frontend-app, u-q-sfc-vendor-compare-fe, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VENDOR-COMPARE-FE (slot:quebec): wire vendor tri-compare FE (sfc.vendor_parity) -- route->api->hook->page->gate

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VENDOR-COMPARE-FE (slot:quebec): wire vendor tri-compare FE (sfc.vendor_parity) -- route->api->hook->page->gate

F1 from SFC-ENTITLEMENT-FINDINGS, the COMPREHENSIVE route (R13): vendor_parity was advertised + granted by the $299 perpetual but had no FE -- the backend (SpeedFeedTriComparatorEngine + prism_calc:speed_feed_tri_compare, oscar) existed unwired. Rather than retract the grant, WIRE the FE so the feature is genuinely live and the advertising honest. Vertical slice: (1) HTTP route POST /speed-feed/tri-compare forwarding to speed_feed_tri_compare (mirrors /compare); (2) types/speedfeed.ts TriCompareInput/Result mirroring the engine; (3) api/speedfeed.ts sfTriCompare unwraps the {success,result} envelope -> clean TriCompareResult (throws on failure); (4) useSpeedFeedTriCompare hook; (5) VendorComparePage: input form + 4-system table (PRISM/baseline/HSMAdvisor/G-Wizard x vc/fz/rpm/feed/mrr) + prism_vs_consensus verdict badges + per-vendor published deltas + loading/error/empty; available:false vendors render the honest reason, never a fabricated number (quebec soul); (6) App.tsx lazy route /vendor-compare gated <FeatureGate feature=sfc.vendor_parity>; (7) routeFeatureGates EXPECTED_GATES [vendor-compare,sfc.vendor_parity] + VendorComparePage.test.tsx 7 tests (input assembly, every system value, unavailable-honesty, verdict, per-vendor deltas, error state, PRISM-only consensus-null). 63/63 cluster green (incl routeFeatureGates 5), web tsc 0 errors, backend speedfeed route 0 tsc errors. Pure FE consumer -- no physics recomputed. Matches /vibration route convention (no nav regression).
```

## Files touched (9)
- mcp-server/src/routes/speedfeed.ts                      |   9 ++
- mcp-server/web/src/App.tsx                              |   2 +
- mcp-server/web/src/__tests__/VendorComparePage.test.tsx | 210 +++++++++++++++++++++++++++
- mcp-server/web/src/__tests__/routeFeatureGates.test.ts  |   4 +
- mcp-server/web/src/api/speedfeed.ts                     |  20 +++
- mcp-server/web/src/hooks/useSpeedFeed.ts                |   1 +
- mcp-server/web/src/pages/VendorComparePage.tsx          | 434 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/types/speedfeed.ts                   | 107 ++++++++++++++
- 8 files changed, 787 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show a97e573e3e51`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._