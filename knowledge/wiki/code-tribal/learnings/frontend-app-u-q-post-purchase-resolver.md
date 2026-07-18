# FRONTEND-APP/U-Q-POST-PURCHASE-RESOLVER — [MAIN-FORCE] [FRONTEND-APP]/U-Q-POST-PURCHASE-RESOLVER (slot:quebec): extract + test the single-controller post purchase path

**Commit:** `561a1bd48081` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T13:59:23-05:00
**Tags:** frontend-app, u-q-post-purchase-resolver, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-POST-PURCHASE-RESOLVER (slot:quebec): extract + test the single-controller post purchase path

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-POST-PURCHASE-RESOLVER (slot:quebec): extract + test the single-controller post purchase path

Completes the post-store revenue-path coverage (symmetry with U-Q-CHECKOUT-RESOLVER). resolvePostPurchase(controllerId, type, purchasePost?) -> {redirect,href}|{error,message} (lib/checkout.ts); PostProcessorStorePage.handlePurchase is now a thin applier (behavior-preserving: cadence forwarded, url->redirect, no-url/throw->actionable error). All 3 post-store revenue paths (subscription via resolveCheckout, single via resolvePostPurchase, bundle via bundleSalesMailto) now run through tested helpers. checkout.test 14/14 (+4: 3 cadences forwarded, no-url, throw-with-msg, throw-empty->generic); PostProcessorStorePage 4/4 unaffected; web tsc exit 0. billingApi import retained (plan/license fetch).
```

## Files touched (4)
- mcp-server/web/src/__tests__/checkout.test.ts       | 41 ++++++++++++++++++++++++++++++++++++++++-
- mcp-server/web/src/lib/checkout.ts                  | 25 ++++++++++++++++++++++++-
- mcp-server/web/src/pages/PostProcessorStorePage.tsx | 16 ++++++----------
- 3 files changed, 70 insertions(+), 12 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 561a1bd48081`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._