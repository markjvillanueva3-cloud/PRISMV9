# FRONTEND-APP/U-Q-CHECKOUT-RESOLVER — [MAIN-FORCE] [FRONTEND-APP]/U-Q-CHECKOUT-RESOLVER (slot:quebec): extract + test the revenue-critical checkout resolver from PricingPage

**Commit:** `714789732277` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T13:50:40-05:00
**Tags:** frontend-app, u-q-checkout-resolver, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-CHECKOUT-RESOLVER (slot:quebec): extract + test the revenue-critical checkout resolver from PricingPage

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-CHECKOUT-RESOLVER (slot:quebec): extract + test the revenue-critical checkout resolver from PricingPage

PricingPage.onSubscribe held untested inline checkout logic (the single most revenue-critical action). Extracted to a pure resolveCheckout(plan, createCheckout?) -> {kind:redirect,href}|{kind:error,message} (src/lib/checkout.ts); PricingPage is now a thin applier (behavior-preserving -- free->/login, enterprise->mailto, paid->Stripe url, no-url/throw->actionable error). 7/7 tests: happy (free/enterprise/paid-url) + 3 failure modes (no-url, throw-with-msg, throw-empty-msg->generic) + isSelfServeCheckout. web tsc exit 0. billingApi import dropped from the page (now only used inside the helper as the injectable default).
```

## Files touched (4)
- mcp-server/web/src/__tests__/checkout.test.ts | 71 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/lib/checkout.ts            | 41 +++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/pages/PricingPage.tsx      | 26 ++++++++++---------------
- 3 files changed, 122 insertions(+), 16 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 714789732277`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._