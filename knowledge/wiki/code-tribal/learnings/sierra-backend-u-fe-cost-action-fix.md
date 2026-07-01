# SIERRA-BACKEND/U-FE-COST-ACTION-FIX — [MAIN-FORCE] [SIERRA-BACKEND]/U-FE-COST-ACTION-FIX (slot:sierra): cost /compare + /history -> honest 501; FE-route mounted-P0 19->0

**Commit:** `93dcf472bb51` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:47:16-05:00
**Tags:** sierra-backend, u-fe-cost-action-fix, auto-distilled

## Subject
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-COST-ACTION-FIX (slot:sierra): cost /compare + /history -> honest 501; FE-route mounted-P0 19->0

## Body
```
[MAIN-FORCE] [SIERRA-BACKEND]/U-FE-COST-ACTION-FIX (slot:sierra): cost /compare + /history -> honest 501; FE-route mounted-P0 19->0

cost.ts called 2 prism_intelligence actions that do NOT exist (cost_compare,
cost_history) -> z.enum reject -> silent HTTP 200 + {error} the SPA's if(!res.ok)
cannot detect. Neither has a clean real home:
- /compare: nearest shop_compare REQUIRES { scenarios:[...] } and the endpoint has
  no live SPA caller committing a body shape (costApi.compare body typed unknown);
  mapping it re-creates the silent footgun on any non-scenarios payload.
- /history/:jobId: nearest erp_cost_history IGNORES the job id and returns GLOBAL
  cost-feedback (ERPIntegrationEngine.ts:567 returns whole costFeedback array) ->
  wiring it to a :jobId route silently drops the filter (200 + wrong-scope).
Both -> honest 501 naming the candidate + exact gap (R12), consistent with the
vibration/modal + cncOps/motion-profile 501s. Audit p0Mounted 2->0 (campaign 19->0).
+ cost-route-contract.test.ts (5/5): both endpoints 501 + /estimate,/quote untouched
(process_cost, shop_quote) + dead-action regression oracle.
```

## Files touched (3)
- mcp-server/src/__tests__/cost-route-contract.test.ts | 102 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/cost.ts                        |  36 ++++++++++-----
- 2 files changed, 126 insertions(+), 12 deletions(-)

## Lessons surfaced in commit body
- wrong-scope).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 93dcf472bb51`
- Milestone envelope: `mcp-server/data/milestones/SIERRA-BACKEND.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._