# BUSINESS-CLEANUP/U-HOTEL-CUSTOMER-KNOWLEDGE-REAL-WIRE — [MAIN] [BUSINESS-CLEANUP]/U-HOTEL-CUSTOMER-KNOWLEDGE-REAL-WIRE: replace customer_knowledge_query false-wire placeholder with real method routing

**Commit:** `62162259240e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-01T11:25:48-05:00
**Tags:** business-cleanup, u-hotel-customer-knowledge-real-wire, auto-distilled

## Subject
[MAIN] [BUSINESS-CLEANUP]/U-HOTEL-CUSTOMER-KNOWLEDGE-REAL-WIRE: replace customer_knowledge_query false-wire placeholder with real method routing

## Body
```
[MAIN] [BUSINESS-CLEANUP]/U-HOTEL-CUSTOMER-KNOWLEDGE-REAL-WIRE: replace customer_knowledge_query false-wire placeholder with real method routing

PHASE0-FOUNDATION-READINESS row-3 class of defect: businessDispatcher customer_knowledge_query was a FALSE-WIRE — (_ck as any).query?.() ?? .search?.() ?? .get?.() ?? {note:"method not callable"}. NONE of query/search/get exist on CustomerKnowledgeEngine (real methods: getProfile/getShopModifiers/getJobHistory/searchWithProfile), so it ALWAYS returned the placeholder — zero real capability exposed.

Replaced with a real wire: validates shop_id (string, required), routes by sub (profile|modifiers|history), calls the real method, returns {success,data,found,sub,shop_id}. shop_id = a real JM Die customer.

PROVEN via live dispatcher round-trip (:3100, rebuilt dist): prism_business customer_knowledge_query {shop_id:ITW,sub:profile} → {success:true,data:null,found:false,...} (real getProfile invoked, not the placeholder note). Type-safe via typeof-singleton cast (class is not exported, only the customerKnowledgeEngine instance). Builds clean.

Follow-up (next loop iters): 9 sibling false-wires remain in the iter8/bulk-sweep cluster (businessDispatcher ~5468-5510: customer_portfolio_mine, shop_floor_quote, erp_work_order, cost_efficiency_bridge, ...) + a data-seeding gap (no JM customer profiles loaded → found:false).
```

## Files touched (2)
- mcp-server/src/tools/dispatchers/businessDispatcher.ts | 26 +++++++++++++++++++++++++-
- 1 file changed, 25 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 62162259240e`
- Milestone envelope: `mcp-server/data/milestones/BUSINESS-CLEANUP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._