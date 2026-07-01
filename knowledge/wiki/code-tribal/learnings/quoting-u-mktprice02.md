# QUOTING/U-MKTPRICE02 — [MAIN-FORCE] [QUOTING]/U-MKTPRICE02 (slot:charlie): close T-MKTPRICE-FOLLOWUP cost-side leak sweep -- deny 7 generic-reachable cost actions, leave 3 with shipped token-less callers

**Commit:** `07f9d19e81ca` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T20:51:11-05:00
**Tags:** quoting, u-mktprice02, auto-distilled

## Subject
[MAIN-FORCE] [QUOTING]/U-MKTPRICE02 (slot:charlie): close T-MKTPRICE-FOLLOWUP cost-side leak sweep -- deny 7 generic-reachable cost actions, leave 3 with shipped token-less callers

## Body
```
[MAIN-FORCE] [QUOTING]/U-MKTPRICE02 (slot:charlie): close T-MKTPRICE-FOLLOWUP cost-side leak sweep -- deny 7 generic-reachable cost actions, leave 3 with shipped token-less callers

Scrutiny-validated follow-up to U-MKTPRICE01. The generic POST /api/v1/quoting handler
carries only optionalToken (never rejects anon). U-MKTPRICE01 denied 6 cost-basis actions;
all 3 of its reviewers flagged MORE still reachable. Audited each per rule (a) raw cost
basis + (b) no token-less caller, from live source (R12).

DENY (deny-set 6->13, schema 1.0.0->1.1.0; each verified raw-$ + grep-clean caller):
  closed_loop_provenance_check, quoting_dynamic_shop_rate, quoting_shop_electricity_cost,
  quoting_shop_utilities_cost, jm_die_financial_baseline,
  quoting_shop_profile_get -- the FULL ShopProfile rate dump (the raw rates the others
  DERIVE from); MISSED by the plan, caught by per-file scrutiny arm B (P1).
  quoting_secondary_ops_price_for_profile -- merges the shop's STORED rates into
  total_secondary_ops_usd; MISSED AGAIN, caught by the 3-of-3 gate arm C (P1). Same class
  as shop_profile_get -- a _for_profile/_get variant folding in stored rates; surfaced
  TWICE in one unit, two scrutiny arms.

LEAVE (blunt deny would 403 a live page): closed_loop_outcome_digest (telemetry, no $ +
  QuotingCalibrationHealthPage), quoting_secondary_ops_price PLAIN (caller overrides,
  QuotingWorkbenchPage -> needs auth-migration), quoting_shop_profile_list (ids only, no $).

No new verbs/page -- the denied 5 have no frontend consumer (cron/engine-internal only).
24/24 route test (real router) + LIVE :3100 rebuilt-dist (7 denies 403, 3 leaves 200,
original 6 still 403, intake 200). Adjacent threads (secondary_ops PLAIN auth-migration,
machine_invest_roi, quote.ts prism_business) logged in OPEN-THREADS.
```

## Files touched (5)
- knowledge/wiki/lessons/quoting-cost-basis-generic-dispatch-leak.md | 21 ++++++++++++---------
- mcp-server/src/__tests__/quotingDispatchDeny.test.ts               | 23 +++++++++++++----------
- mcp-server/src/data/quoting-dispatch-allowlist.ts                  | 14 ++++++++++----
- mcp-server/src/engines/quoting/OPEN-THREADS.md                     | 14 +++++++++-----
- 4 files changed, 44 insertions(+), 28 deletions(-)

## Lessons surfaced in commit body
- till reachable. Audited each per rule (a) raw cost
- tilities_cost, jm_die_financial_baseline,
- till 403, intake 200). Adjacent threads (secondary_ops PLAIN auth-migration,

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 07f9d19e81ca`
- Milestone envelope: `mcp-server/data/milestones/QUOTING.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._