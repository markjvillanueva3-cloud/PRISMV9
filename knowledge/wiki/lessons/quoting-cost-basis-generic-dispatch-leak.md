---
title: Quoting cost-basis leak via the generic /quoting dispatch handler
kind: lesson
domain: quoting
severity: P0-security
unit: QUOTING/U-MKTPRICE01
commit: 07b7de59ef
slot: charlie
date: 2026-06-23
status: built
tags: [security, auth, deny-list, cost-basis, optionalToken, R12]
---

# Quoting cost-basis leak via the generic /quoting dispatch handler

## The bug (pre-existing P0, caught by 3-of-3 scrutiny arm C)

`createQuotingRouter`'s generic `router.post("/")` forwarded an arbitrary `{ action, params }`
straight to the `prism_quoting` dispatcher. The only auth on the `/api` prefix is `optionalToken`
(`middleware/auth.ts:64`) which **attaches a user IF a Bearer token is present but NEVER rejects an
anonymous request**. The quoting router added no `verifyToken`. Result: the shop's real cost basis
was reachable **unauthenticated** at both mounts (`/api/v1/quoting` + `/api/mcp/quoting`) via:

```
POST /api/v1/quoting   { "action": "cost_index_prior", "params": {} }   -> 200 + AP cost basis
```

The leaking actions: `cost_index_prior` (AP procurement cost index), `material_cost_basis`
(per-grade $/in3), `outbound_price_prior` / `outbound_price_calibration` / `outbound_promote_check`
(real sold-price distribution from jm-sold-orders), `cost_savings` (internal ROI ledger).

This was caught while building a NEW page that surfaces two of these priors -- the build plan
**assumed** the `/api/v1/quoting` surface was "operator-internal only." It was not. The independent
reviewer (arm C) proved the assumption wrong by reading the actual mount + middleware.

## The fix (deny-by-default, NOT allow-by-default)

`src/data/quoting-dispatch-allowlist.ts` -- a DENY-set of exactly the 6 cost-basis/sold-price
actions; the generic handler 403s any of them BEFORE `callTool`. Two new typed verbs
`/outbound-price-prior` + `/cost-index-prior` are gated `verifyToken + requireRole("admin")` (the
admin tier used by erp.ts margin/financial routes) -- the ONLY authenticated path. `App.tsx` route
wraps the page `secure(<page/>, 'admin')` for defense-in-depth.

**Why DENY-by-default (the opposite of `business-dispatch-allowlist.ts`):** the quoting action set is
mostly operator-advisory tooling already bound by SHIPPED **token-less** operator pages (they POST via
raw `fetch('/api/mcp/quoting')` with no Bearer). An allow-list would 403 every shipped page. The
sensitive set is small + closed and -- VERIFIED by grep -- has **0 token-less frontend callers**, so
denying exactly it closes the leak and breaks nothing.

## Lessons

1. **`optionalToken != verifyToken`.** A route behind `optionalToken` is PUBLIC -- it never blocks an
   anonymous caller. "This surface is internal" is unverified until you read the mount + the
   middleware chain (`routes/index.ts` `app.use("/api", ...)`).
2. **A generic `{action}`-passthrough dispatch route is an auth hole** unless it allow/deny-lists the
   action. Treat any `callTool(tool, req.body.action, ...)` as a public surface for EVERY action the
   dispatcher exposes.
3. **Deny-by-default vs allow-by-default is a real choice** driven by the existing callers: allow-list
   where the safe subset is small (business: ~879 financial actions, curated few safe); deny-list
   where the existing callers are broad + token-less (quoting). Before denying an action, grep the
   frontend for a token-less caller or you silently 403 a live page.
4. **A client fn that claims "returns null on auth failure" must actually catch the `ApiError`** --
   `fetchJson` THROWS on every non-2xx, so an unwrap alone does not null a 401. Map 401/403 -> null,
   re-throw 5xx/network (R12 fail-loud).
5. **Match the engine's nullable contract.** The engines' fail-soft `emptyResult` returns
   `path: null` / `caveat: null`; a non-nullable client type is a latent runtime null (arm A P1).

## Follow-up -- RESOLVED in U-MKTPRICE02 (2026-06-24)

All three reviewers flagged ADDITIONAL pre-existing cost-side actions still generic-reachable. The
follow-up (U-MKTPRICE02) audited each per rule (a)+(b) from live source and closed the safe subset.

**DENIED (8 added -> deny-set 6->14, schema 1.1.0->1.1.1)** -- each verified raw cost basis, NO
token-less caller: `closed_loop_provenance_check` (per-job estimated_cost+actuals),
`quoting_dynamic_shop_rate` (base_rate_usd_per_hr), `quoting_shop_electricity_cost` (cost_usd +
rate_usd_per_kwh), `quoting_shop_utilities_cost` (total_utilities_cost_usd), `jm_die_financial_baseline`
(total_revenue_usd), **`quoting_shop_profile_get`** (the FULL ShopProfile rate dump -- the raw $/kWh
and every $/hr rate the others DERIVE from), **`quoting_secondary_ops_price_for_profile`** (merges the
shop's STORED secondary_op_overrides into total_secondary_ops_usd), and **`quoting_machine_invest_roi`**
(returns per_hour_savings_usd = stored_incumbent_rate - CALLER candidate_rate -> posting candidate_rate=0
recovers the EXACT stored $/hr by algebra; also echoes default_machine_rate + incumbentRate verbatim).
The last THREE were MISSED by the plan and caught by scrutiny: `shop_profile_get` by per-file arm B,
`secondary_ops_price_for_profile` AND `machine_invest_roi` by the 3-of-3 gate arm C (on two consecutive
passes -- I first mis-classified machine_invest_roi as a "borderline derived figure" and deferred it; arm C
proved it is a trivially-INVERTIBLE raw rate, not a derivative). All three are the same class: a
`_for_profile`/`_get`/`_roi` action that folds the shop's STORED ShopProfile rate into its output.
**Lesson 6: when you deny derived-cost actions, grep for EVERY action that calls `getProfile()` and folds
a STORED rate into its output -- including `_for_profile`/`_get` dumps AND `(stored_rate - caller_input)`
differences, which are trivially invertible when the subtrahend is caller-known. Denying only the obvious
derivatives is under-protective; this gap surfaced THREE times in one unit (per-file arm B + 3-of-3 arm C
twice). A "difference is a derived figure" intuition is WRONG when the other operand is attacker-supplied.**

**LEFT reachable (3)** -- a blunt deny would 403 a live shipped page (rule-b trap):
`closed_loop_outcome_digest` (rate/count telemetry, NO raw $ + QuotingCalibrationHealthPage caller),
`quoting_secondary_ops_price` (the PLAIN variant -- internal op cost $ BUT QuotingWorkbenchPage caller ->
needs auth-MIGRATION not a deny; its `_for_profile` sibling IS denied above), `quoting_shop_profile_list`
(profile IDs only, no $ -- the "complete the set" mistake to avoid). **Lesson 7: a live :3100 probe against a STALE `node dist/index.js` bundle
silently lies** -- a 48-min-old server 200'd every new deny (the gate was correct, the bundle predated
it); `build:fast` + restart before trusting a live security probe (the route TEST through the real
router is the authoritative functional proof).

Still-open adjacent threads (NOT closed -- different concern/dispatcher, see OPEN-THREADS.md):
`quoting_secondary_ops_price` PLAIN auth-migration (frontend-touching -- it has a page caller, so the
page must move behind an admin verb before the generic path can be denied), and `quote.ts`
`material_price_lookup`/`material_surcharge` on prism_business (different dispatcher, sell-side).
(`quoting_machine_invest_roi` was initially deferred as "borderline" but is now DENIED -- it is a
trivially-invertible raw rate, not a derivative.) Memory: [[reference_charlie_mktprice_followup_2026_06_24]].

## See also
- [[reference_charlie_quoting_dead_panel_unwrap_fix_2026_06_23]] -- the /quoting bare-body family
- [[feedback_charlie_quoting_no_inline_rates]] -- cost basis stays internal
