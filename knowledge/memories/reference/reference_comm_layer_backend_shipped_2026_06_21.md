---
name: reference_comm_layer_backend_shipped_2026_06_21
description: "Quebec (for papa) shipped the PRISM commercial-layer backend -- pricing registry, subscription store, entitlement enforcement (the"
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.527Z
aliases: reference_comm_layer_backend_shipped_2026_06_21
---


# Commercial-layer backend SHIPPED (2026-06-21, slot:quebec acting for papa)

Operator "do it for papa" + "continue" -> built the backend launch blockers myself (galaxy gate overridden by operator directive; papa-no-gate posture). Loop: papa-U-COMM-03.

## Shipped commits (cad-fusion-live-ms0)
- **U-COMM-01** `51d8643709` (prior turn): `config/pricing-registry.ts` -- canonical PLAN_LIMITS + PLAN_PRICES + POST_PROCESSOR_PRICES; 7/7 parity test guards tierGate/AuthEngineV7/Stripe + FE.
- **U-COMM-03** `a48018838b`: entitlement enforcement ACTIVATED (the #1 launch blocker). Root cause of dormancy (verified, corrects the survey's "no enforcement exists"): `requireTier` was built+TESTED but (1) wired into ZERO routes and (2) `req.user.plan` was NEVER set (`auth.ts` sets userId/roles/permissions only) + `usageCounter` was a stub. Fixed all 3:
  - NEW `SubscriptionStore` engine (the missing user->plan layer): in-memory + lazy sync load + FAIL-LOUD-on-corrupt (no reset-then-clobber, per tribal-clobber lesson); canceled/past_due -> free entitlements. 8/8 tests.
  - `usageCounter` stub -> real per-user/feature/day counter (preserves getStats/getUserUsage for infraDispatcher).
  - NEW `attachUserPlan` middleware wired GLOBALLY after optionalToken (`routes/index.ts`) -> /status + every gate plan-aware. Fail-safe to free on store error.
  - Wired `requireTier(speed_feed)` + `recordFeatureUse` into `routes/sfc.ts /calculate`. 8/8 enforcement round-trip tests.
- **U-COMM-02** `6285b7db3e`: Stripe webhook signature verification (security P0 -- was COMMENTED OUT -> forged webhooks accepted). `verifyStripeSignature` pure HMAC-SHA256 (t=,v1= scheme, constant-time, replay window) + `createBillingWebhookRouter` (express.raw mounted BEFORE express.json in index.ts, mirroring the intake-router precedent) + `applyWebhookToStore` persist. Removed the old unverified /webhook. 11/11 tests.
- **U-COMM-02b** `ccaa4ee6c3`: /portal resolves customerId from `subscriptionStore.getStripeCustomerId(req.userId)` (FE had none); FE `createPortal()` arg-free; SubscriptionPage Manage-Billing works end-to-end.

63/63 commercial-layer tests green (incl 29 pre-existing tier-gate, no regression). All my files tsc-clean (pre-existing `aiReasoningDispatcher.ts:2426` + `InventorCADCodeGeneratorEngine.ts:148` errors are NOT mine).

## Key architectural facts (for future chats)
- `req.user = {userId, plan, role, usage}` is the contract tierGate + billing /status read; `attachUserPlan` is the single populator. Wire it after any auth-extraction middleware.
- Boolean gates (program_generate=0 for free/starter, simulation/stochastic, api_access enterprise-only) enforce IMMEDIATELY; the speed_feed 10/day cap enforces via the real in-memory counter (process-local; swap for Redis/persisted later without changing the contract).
- Webhook raw-body MUST mount before `express.json` (index.ts:~1047) -- the intake router at :1043 is the precedent.
- Test mode (`STRIPE_TEST_MODE != "false"`, no STRIPE_WEBHOOK_SECRET) parses webhooks without verify for local dev; live mode REQUIRES a valid signature.

## Remaining (specced, not yet built) -- see state/shared/specs/U-COMM-BACKEND-IMPL-SPEC-2026-06-21.md
- **U-COMM-05** admin entitlement endpoints (`routes/admin.ts` GET /users + plan, grant/revoke per-seat) -> unblocks quebec Q6 admin UI.
- **U-COMM-08** license keys for one-time SFC + single-post perpetual buys.
- **U-COMM-07** operator: provision STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET for live mode.

Net: subscriptions + one-time billing are now ENFORCED + SECURE end-to-end. The SFC + single-post launch is sellable-capable pending live Stripe keys. Related: [[reference_quebec_commercial_spine_2026_06_21]] · [[reference_product_launch_plan_2026_06_20]].
