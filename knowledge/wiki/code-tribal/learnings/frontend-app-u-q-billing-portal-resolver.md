# FRONTEND-APP/U-Q-BILLING-PORTAL-RESOLVER — [MAIN-FORCE] [FRONTEND-APP]/U-Q-BILLING-PORTAL-RESOLVER (slot:quebec): extract + test the billing-portal (manage/cancel) path

**Commit:** `305bd5585ef3` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T14:02:08-05:00
**Tags:** frontend-app, u-q-billing-portal-resolver, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-BILLING-PORTAL-RESOLVER (slot:quebec): extract + test the billing-portal (manage/cancel) path

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-BILLING-PORTAL-RESOLVER (slot:quebec): extract + test the billing-portal (manage/cancel) path

Completes the billing-action surface: every Stripe-touching FE action now runs through a tested lib/checkout.ts helper -- resolveCheckout (subscriptions), resolvePostPurchase (single post), bundleSalesMailto (bundles), resolveBillingPortal (upgrade/downgrade/cancel/payment). SubscriptionPage.onManage is now a thin applier (behavior-preserving: url->redirect, no-url/throw->'not available yet'). checkout.test 18/18 (+4: portal url->redirect, no-url->note, throw->msg, throw-empty->generic); web tsc exit 0. billingApi retained (getBillingStatus load). The U-COMM-02b backend gap (portal needs a Stripe customerId) is unchanged -- the helper surfaces it as the actionable 'not available yet' note.
```

## Files touched (4)
- mcp-server/web/src/__tests__/checkout.test.ts | 28 ++++++++++++++++++++++++++++
- mcp-server/web/src/lib/checkout.ts            | 18 ++++++++++++++++++
- mcp-server/web/src/pages/SubscriptionPage.tsx | 10 +++++-----
- 3 files changed, 51 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 305bd5585ef3`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._