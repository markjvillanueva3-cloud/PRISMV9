# QUOTING/U-MKTPRICE01 — [MAIN-FORCE] [QUOTING]/U-MKTPRICE01 (slot:charlie): Market Pricing Intelligence operator page + CLOSE pre-existing cost-basis leak

**Commit:** `07b7de59efd0` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T19:54:18-05:00
**Tags:** quoting, u-mktprice01, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-MKTPRICE01 (slot:charlie): Market Pricing Intelligence operator page + CLOSE pre-existing cost-basis leak

## Body
```
[MAIN-FORCE] [QUOTING]/U-MKTPRICE01 (slot:charlie): Market Pricing Intelligence operator page + CLOSE pre-existing cost-basis leak

Surface two dispatcher-wired-but-frontend-unreachable pricing priors on one
operator-internal page: outbound_price_prior (real sold-price distribution,
sell-side market) + cost_index_prior (internal AP cost basis, cost-side).

SECURITY (the keystone -- scrutiny arm C caught a PRE-EXISTING P0): the generic
POST /api/v1/quoting forwarded any {action} to prism_quoting under only
optionalToken (never rejects anon), so cost_index_prior / material_cost_basis /
outbound_price_* / cost_savings were reachable UNAUTHENTICATED. Fix:
 - new src/data/quoting-dispatch-allowlist.ts deny-set (the 6 cost-basis actions)
 - generic handler 403s every deny-set action (never reaches the dispatcher)
 - two new typed verbs /outbound-price-prior + /cost-index-prior gated
   verifyToken + requireRole(admin) -- the ONLY authenticated path to cost basis
 - App.tsx route secure(...,admin) -- defense-in-depth atop the API gate
Customer-safe + token-less operator actions still pass (0 shipped page broken;
verified 0 token-less frontend callers of the deny-set).

client.ts: outboundPricePrior/costIndexPrior fns + nullable-correct types
(path/caveat string|null per the engine fail-soft contract); 401/403 -> null
(auth-required state), 5xx re-thrown (R12).

Tests (50/50): quotingDispatchDeny.test.ts 13 (deny + admin-gate round-trip),
client.test.ts +10 (prior contracts incl auth-null + 5xx-rethrow + adversarial),
MarketPricingIntelligencePage.test.tsx 8 (advisory-always, floor-spike iff
minMassFrac>0.25, units-blended caveat, LEAK-BOUNDARY no outward-flow call).

LIVE :3100 validated: typed verbs -> 401 anon; generic cost_index_prior /
material_cost_basis -> 403; camera_intake_route -> 200 (passthrough intact).
```

## Files touched (9)
- mcp-server/src/__tests__/quotingDispatchDeny.test.ts                | 168 ++++++++++++++++
- mcp-server/src/data/quoting-dispatch-allowlist.ts                   |  66 +++++++
- mcp-server/src/routes/quoting.ts                                    |  32 +++-
- mcp-server/web/src/App.tsx                                          |   3 +
- mcp-server/web/src/__tests__/MarketPricingIntelligencePage.test.tsx | 162 ++++++++++++++++
- mcp-server/web/src/__tests__/client.test.ts                         | 130 ++++++++++++-
- mcp-server/web/src/api/client.ts                                    | 145 ++++++++++++++
- mcp-server/web/src/pages/MarketPricingIntelligencePage.tsx          | 453 ++++++++++++++++++++++++++++++++++++++++++++
- 8 files changed, 1153 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- till pass (0 shipped page broken;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 07b7de59efd0`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._