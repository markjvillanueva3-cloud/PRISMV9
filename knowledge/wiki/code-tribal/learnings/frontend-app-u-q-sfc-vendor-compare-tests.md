# FRONTEND-APP/U-Q-SFC-VENDOR-COMPARE-TESTS — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VENDOR-COMPARE-TESTS (slot:quebec): close scrutiny P2s -- sfTriCompare unwrap unit test + engine-faithful verdict fixture

**Commit:** `00c641351eb3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T21:27:54-05:00
**Tags:** frontend-app, u-q-sfc-vendor-compare-tests, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VENDOR-COMPARE-TESTS (slot:quebec): close scrutiny P2s -- sfTriCompare unwrap unit test + engine-faithful verdict fixture

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-VENDOR-COMPARE-TESTS (slot:quebec): close scrutiny P2s -- sfTriCompare unwrap unit test + engine-faithful verdict fixture

Addresses two P2s from the 3-of-3 scrutiny of U-Q-SFC-VENDOR-COMPARE-FE (all arms PASSed). (1) Arm C P2: the page tests mocked the already-unwrapped speedFeedApi.triCompare, so the {result:{success,result}} -> TriCompareResult envelope unwrap in sfTriCompare had NO coverage. New speedfeedApi.test.ts (4 tests) stubs global fetch and exercises the REAL sfTriCompare: unwraps the double-wrapped body, POSTs to /api/v1/speed-feed/tri-compare, throws the engine error on success:false, throws a default on missing result, and surfaces the server error on a non-ok response. (2) Arm A P2: the VendorComparePage fixture had vc/rpm verdicts of prism_higher at 9.1%/9.1% deltas, which are NOT engine-faithful -- the engine VERDICT_BAND=0.1 marks |delta|<=10% as aligned. Corrected the fixture so verdicts match deltas (vc/fz/rpm aligned, feed prism_higher at 16.4%) and updated the assertions to cover both an aligned and a prism_higher badge. 16/16 (speedfeedApi 4 + routeFeatureGates 5 + VendorComparePage 7), web tsc 0 errors. Test-only follow-up; no production change.
```

## Files touched (3)
- mcp-server/web/src/__tests__/VendorComparePage.test.tsx | 17 ++++++-----
- mcp-server/web/src/__tests__/speedfeedApi.test.ts       | 94 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 2 files changed, 104 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 00c641351eb3`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._