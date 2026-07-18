# HOTEL/U-HOTEL-CREDIT-REVIEW — [MAIN-FORCE] [HOTEL]/U-HOTEL-CREDIT-REVIEW (slot:hotel): bring the dead CreditManagementPage to life -- credit_review/credit_review_all verbs + 2 lead-tier /erp/credit-review* routes + risk-tier engine

**Commit:** `27362064d406` · **By:** markjvillanueva3-cloud · **At:** 2026-06-24T15:15:21-05:00
**Tags:** hotel, u-hotel-credit-review, auto-distilled

## Subject
[MAIN-FORCE] [HOTEL]/U-HOTEL-CREDIT-REVIEW (slot:hotel): bring the dead CreditManagementPage to life -- credit_review/credit_review_all verbs + 2 lead-tier /erp/credit-review* routes + risk-tier engine

## Body
```
[MAIN-FORCE] [HOTEL]/U-HOTEL-CREDIT-REVIEW (slot:hotel): bring the dead CreditManagementPage to life -- credit_review/credit_review_all verbs + 2 lead-tier /erp/credit-review* routes + risk-tier engine

Gap #3 of HOTEL-ERP-FRONTEND-WIRING-SPEC. CreditManagementPage called
creditReviewAll()/creditReview(id) but there was no backing route -> dead panel.

- CustomerManagementEngine: reviewCredit(id) + reviewAllCredit() + buildCreditReview()
  + CreditReview interface. available=limit-balance, util%=round(bal/limit*1000)/10,
  risk tier on_hold(status)>over_limit>at_risk(>=90% util)>ok. reviewAllCredit sorts
  worst-first + summary{total,over_limit,on_hold,at_risk}. Fail-loud on unknown id.
- businessDispatcher: credit_review/credit_review_all enum + cases -> engine.
- erp.ts: GET /credit-review-all + /credit-review/:customer_id, both
  verifyToken + requireRole(lead,hr_manager,admin) (mirrors the financial tier),
  reusing rfqRoute/unwrapEnvelope (the prism_business {type,text} slimResponse
  envelope class -- the route MUST JSON.parse .text or the page renders empty).
- CreditManagementPage: atRiskCount reads the authoritative risk field FIRST
  (was shadowed by status:active -> under-counted over-limit accounts).
- Tests: CustomerManagementEngine.credit-review.test.ts (11, incl 90.0/89.9
  inclusive-boundary pins) + erp-rfq-routes.test.ts (+2 credit route tests
  emitting the production env() envelope, R9).

3-of-3 PASS (A+B+C). build:fast Done, tsc 0, false-wire guard 20/20.
```

## Files touched (7)
- mcp-server/src/__tests__/CustomerManagementEngine.credit-review.test.ts | 135 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/erp-rfq-routes.test.ts                         |  36 +++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/CustomerManagementEngine.ts                      |  82 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/erp.ts                                            |  10 ++++++++++
- mcp-server/src/tools/dispatchers/businessDispatcher.ts                  |  13 +++++++++++++
- mcp-server/web/src/pages/CreditManagementPage.tsx                       |   7 ++++++-
- 6 files changed, 282 insertions(+), 1 deletion(-)

## Lessons surfaced in commit body
- til%=round(bal/limit*1000)/10,
- til)>ok. reviewAllCredit sorts

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 27362064d406`
- Milestone envelope: `mcp-server/data/milestones/HOTEL.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._