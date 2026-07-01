# Commercial-Layer Backend Implementation Spec (U-COMM-*) — 2026-06-21

> **Author:** slot:quebec (acting for papa, operator "do it for papa"). **Status:** U-COMM-01 SHIPPED; U-COMM-02/02b/03/05/08 specced turn-key below with verified file:line.
> **Why this matters:** the launch is gated here. The FE commercial spine (PricingPage/SubscriptionPage/billing client) + canonical pricing are DONE; subscriptions are unsellable until the enforcement + webhook units below ship.

## VERIFIED current state (read the actual code — R8/R12)
The prior plan said "no entitlement enforcement exists." **That was wrong about the cause.** The middleware EXISTS and is TESTED; it is simply **unwired**, and the plan never lands on the request:

| Component | State | Evidence |
|---|---|---|
| `requireTier(feature)` Express factory + `checkTierAccess` (pure) | BUILT + TESTED, returns 403 `TIER_LIMIT` | `middleware/tierGate.ts:117,189`; tests `tier-gate.test.ts` |
| Wired into any route? | **NO** — zero route usage (only tests reference it) | grep `requireTier` = tests only |
| `req.user.plan` | **NEVER SET** — `optionalToken`/`verifyToken` set `req.userId/userRoles/userPermissions` only | `middleware/auth.ts:54-57,64-76` |
| Global auth | `optionalToken` applied to all `/api` | `routes/index.ts:139` |
| `usageCounter` | **STUB** — getStats/getUserUsage return zeros; no per-user/feature/day count | `middleware/usageCounter.ts:1-29` |
| Plan-limit table | **canonical now** (U-COMM-01) | `config/pricing-registry.ts` (tierGate/AuthEngineV7/Stripe all match per `pricing-registry.test.ts`) |
| Stripe webhook sig | **commented out** (security P0) | `routes/billing.ts:88-91` |
| `/portal` customerId | taken from FE body; FE has no customerId | `routes/billing.ts:65`; FE `billing.ts createPortal` |
| user→plan store | **does not exist** (TenantEngine is tenant-level, different enum) | grep |
| Bundle qty | `createPostPurchaseCheckout` hardcodes qty=1 → bundles charge $199 not $799/$2499 | `StripeBillingEngine.ts` calculatePostProcessorPrice(type,1) |

**Net:** enforcement is dormant for TWO reasons: (1) `req.user.plan` is never populated (everyone resolves to the "free" fail-safe — would block PAYING users if `requireTier` were wired today), and (2) the daily-cap counter is a stub. The boolean/access gates (simulation, program_generate=0, stochastic, api_access) would enforce correctly the moment plan-resolution + wiring land.

## U-COMM-01 — SHIPPED (51d8643709)
Canonical `config/pricing-registry.ts` (PLAN_LIMITS + PLAN_PRICES cents + POST_PROCESSOR_PRICES) + parity test guarding the 3 sources + FE. Next: physical import re-point (mechanical) — replace the literal const in `AuthEngineV7.ts:47` (LIMITS), `tierGate.ts:41` (TIER_LIMITS), `StripeBillingEngine.ts:47,55` (PLAN_PRICES/POST) with `import {...} from "../config/pricing-registry.js"`. Values identical → tests stay green. (Type-only `import type {Plan,TierLimits}` in the registry means no runtime cycle.)

## U-COMM-03 — entitlement enforcement (#1 LAUNCH BLOCKER) — turn-key
Build in this order:
1. **`SubscriptionStore` engine** (`src/engines/SubscriptionStore.ts`): persisted `user_id -> { plan, status, stripeCustomerId, updatedAt }` (atomicWrite to `data/state/subscription-store.json`, schemaVersion). Methods: `getPlan(userId): Plan` (default 'free'), `setPlan(userId, plan, status?)`, `linkCustomer(userId, customerId)`, `getUserIdByCustomer(customerId)`. Singleton. Companion test (real values).
2. **`attachUserPlan` middleware** (`src/middleware/attachUserPlan.ts`): after auth, set `req.user = { id: req.userId, plan: subscriptionStore.getPlan(req.userId ?? '') , usage: await usageCounter.getDayCounts(req.userId) }`. Wire GLOBALLY at `routes/index.ts` immediately AFTER `optionalToken` (line 139). This single wire makes `/status` + `requireTier` plan-aware everywhere.
3. **Real `usageCounter`** (extend the stub, keep getStats/getUserUsage for infraDispatcher): add `increment(userId, feature)` + `getDayCounts(userId): Record<string,number>` with a per-day key (`${userId}:${feature}:${YYYY-MM-DD}`), in-memory Map + daily rollover (optional persist). `requireTier` already reads `req.user.usage?.[feature]`.
4. **Wire `requireTier` + increment** into feature routes: `routes/sfc.ts` `/calculate` → `requireTier("speed_feed")` + increment on success; program/print routes → `requireTier("program_generate")`; simulation/stochastic endpoints likewise. The boolean gates (program_generate=0 for free/starter, simulation false for free/starter, api_access enterprise-only) enforce IMMEDIATELY; the speed_feed 10/day cap enforces once #3 lands.
5. **Tests (R15 round-trip):** free user → program_generate 403; free user → 11th speed_feed 403 (after counter); enterprise → unlimited; plan resolves from SubscriptionStore.

## U-COMM-02 — Stripe webhook signature verification (security P0) — turn-key
- `routes/billing.ts:84` `/webhook`: needs the RAW body for `stripe.webhooks.constructEvent(rawBody, sig, WEBHOOK_SECRET)`. GOTCHA: `express.json()` is applied globally at `index.ts:1049` — mount `express.raw({type:'application/json'})` for `/api/v1/billing/webhook` BEFORE the global json parser (or use a verify callback capturing rawBody). Test this ordering carefully — getting it wrong breaks other routes.
- Verify via `StripeBillingEngine` (add `verifyWebhookSignature(rawBody, sig)` using HMAC-SHA256 with `STRIPE_WEBHOOK_SECRET`, or the Stripe SDK). On valid event → `SubscriptionStore.setPlan` (resolve userId via `getUserIdByCustomer`). On invalid sig → 400. Test: forged sig rejected.
- **U-COMM-02b:** `/portal` (`routes/billing.ts:59`) should resolve `customerId` from `SubscriptionStore.getStripeCustomerId(req.userId)`, NOT the FE body (the FE has no customerId). Until then the FE SubscriptionPage "Manage billing" surfaces the backend error honestly.
- Record `customerId↔userId` at `/create-checkout` success (`StripeBillingEngine.createCheckoutSession`) so the webhook can resolve the user.

## U-COMM-05 backend — entitlement admin endpoints (unblocks quebec Q6)
`routes/admin.ts`: add `GET /users` returning `{userId, plan, role}[]` + `POST /entitlements {userId, feature, granted}` (per-seat overrides) + `setUserPlan`. Back by SubscriptionStore + a per-seat-override store. Then quebec builds the AdminPage Entitlements tab (Q6).

## U-COMM-08 — license keys (one-time SFC + single-post)
Issue a signed key on one-time purchase (HMAC over `{product, userId, issuedAt}`), validate offline, revocable list. Gates the FE SFC-perpetual purchase + post activation.

---
_slot:quebec for papa, 2026-06-21. All file:line verified against live code this session. The keystone is plan-resolution (SubscriptionStore + attachUserPlan); everything else composes on it._

---
## UPDATE 2026-06-21 (later) -- U-COMM-03/02/02b SHIPPED + scrutiny-hardened
- U-COMM-03 entitlement enforcement: a48018838b. U-COMM-02 webhook sig: 6285b7db3e. U-COMM-02b portal: ccaa4ee6c3. Scrutiny P1 fixes: f620081934.
- 3-of-3 scrutiny caught + fixed 3 launch-critical billing P1s (see ## Recent regressions / memory reference_comm_layer_backend_shipped_2026_06_21):
  1. webhook ack-before-persist (data loss) -> persist-before-ack + 500-on-failure;
  2. failed-calc over-metering (callTool returns {error}+200, no throw) -> meter only on result && !result.error;
  3. entitlement leak (status only downgraded canceled/past_due) -> getPlan allowlist active/trialing only.
- STILL OPEN: U-COMM-05 (admin entitlement endpoints -> unblocks quebec Q6), U-COMM-08 (license keys), U-COMM-07 (operator: provision Stripe live keys). P2: subscription_updated planId->Plan mapping (needs live Stripe price IDs from U-COMM-07).
