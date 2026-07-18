# QUOTING/U-QT04 — [MAIN-FORCE] [QUOTING]/U-QT04 (slot:charlie): make-vs-buy panel + FIX 3 silently-dead quoting FE panels (bare /quoting body)

**Commit:** `d526c01eded6` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T14:17:40-05:00
**Tags:** quoting, u-qt04, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-QT04 (slot:charlie): make-vs-buy panel + FIX 3 silently-dead quoting FE panels (bare /quoting body)

## Body
```
[MAIN-FORCE] [QUOTING]/U-QT04 (slot:charlie): make-vs-buy panel + FIX 3 silently-dead quoting FE panels (bare /quoting body)

TWO things. (1) FEATURE: surface the OutsourceRecommenderEngine (make-vs-buy) in the quote UI -- already backend+dispatcher-wired (prism_quoting:outsource_recommend); added quoteOutsourceRecommend client fn + OutsourceReport type + strict-enum mappers (process/material/tolerance) + a 'Make vs buy' PanelCard (in-house vs outsource-rate benchmark, savings, capacity/material reason). Pairs with the LVP vendor-sourcing panel. Live-validated: $2500 stainless@95%-loaded -> outsource (saves $1628.80); $120 alum@40% -> in-house.

(2) BUG FIX (HIGH/R12): /api/v1/quoting returns the engine body BARE (res.json(callTool(...)) -> dispatcher JSON.stringify(result) at quotingDispatcher.ts:770, NO {result} envelope -- unlike /quote/* which wraps via sendCompatResponse). QuoteBuilderPage read .result off the /quoting responses for three_view_pricing, location_vendor_pricing AND outsource_recommend -> .result was undefined -> setX(null) always -> the ThreeView + LVP + Outsource panels NEVER rendered (incl my OWN prior U-LVP01/U-LVP02 + ThreeView ships -- silently dead in production).

Fix: new unwrapQuotingBody<T>() helper (body.result ?? body) handles BOTH the bare /quoting and wrapped /quote/* shapes; all 4 reads use it. Live-proved all 3 panels now render ((body.result ?? body).ok = true for all 3). Regression-locked with 4 tests in client.test.ts (bare / wrapped / null-safe / bare-with-own-result).

Caught by the per-file 2-arm scrutiny gate (arm B found it with line-cited proof; arm A missed it assuming the wrapper). R7: did not average -- traced callTool + dispatcher:770 + a live HTTP probe (top-level keys: ok,input,headline,views; has .result? false) to confirm. The QuoteBuilderPage test mocked {result}-shaped responses = the WRONG contract, which is why it never caught it (R9). Memory: reference_charlie_quoting_dead_panel_unwrap_fix_2026_06_23.

web tsc 0 errors; client.test 8/8 + QuoteBuilderPage 6/6; backend quoting sweep 36/36. FE additive-only (Make-vs-buy card between vendor-sourcing + cost-breakdown).
```

## Files touched (4)
- mcp-server/web/src/__tests__/client.test.ts   |  38 ++++++++++++++++++++-
- mcp-server/web/src/api/client.ts              |  47 ++++++++++++++++++++++++++
- mcp-server/web/src/pages/QuoteBuilderPage.tsx | 118 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++---
- 3 files changed, 198 insertions(+), 5 deletions(-)

## Lessons surfaced in commit body
- WRONG contract, which is why it never caught it (R9). Memory: reference_charlie_quoting_dead_panel_unwrap_fix_2026_06_23.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show d526c01eded6`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._