# FRONTEND-APP/U-Q-BUNDLE-SALES-ROUTE — [MAIN-FORCE] [FRONTEND-APP]/U-Q-BUNDLE-SALES-ROUTE (slot:quebec): fix live bundle-mispricing -- route post bundles to sales at the correct price

**Commit:** `19f251fa9802` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T13:55:43-05:00
**Tags:** frontend-app, u-q-bundle-sales-route, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-BUNDLE-SALES-ROUTE (slot:quebec): fix live bundle-mispricing -- route post bundles to sales at the correct price

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-BUNDLE-SALES-ROUTE (slot:quebec): fix live bundle-mispricing -- route post bundles to sales at the correct price

REVENUE BUG (found via QX4b scrutiny / memory recall): PostProcessorStorePage.handleBundle sent a bogus controller id (bundle-5pack/bundle-all20) to billingApi.purchasePost with type=permanent. The backend has NO bundle case -- it mints a single post_perpetual ($199) scoped to a fake controller, so a 5-pack ($799) or all-controllers ($2,499) buyer was mis-charged. Backend bundle checkout is echo/papa's lane (deferred); the FE must not OFFER a mis-priced purchase. Fix: bundles now route to sales at the correct price via tested bundleSalesMailto() (lib/checkout.ts) -- mirrors the enterprise contact-sales pattern -- plus a caption setting the expectation. Single-controller checkout is unchanged. checkout.test 10/10 (3 new: 5-pack/all mailto carry correct name+price; regression guard bundle-price != $199 single); PostProcessorStorePage.test 4/4 unaffected; web tsc exit 0. When backend bundle checkout lands, swap bundleSalesMailto for a real createBundleCheckout.
```

## Files touched (4)
- mcp-server/web/src/__tests__/checkout.test.ts       | 28 +++++++++++++++++++++++++++-
- mcp-server/web/src/lib/checkout.ts                  | 20 ++++++++++++++++++++
- mcp-server/web/src/pages/PostProcessorStorePage.tsx | 27 +++++++++++++++------------
- 3 files changed, 62 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 19f251fa9802`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._