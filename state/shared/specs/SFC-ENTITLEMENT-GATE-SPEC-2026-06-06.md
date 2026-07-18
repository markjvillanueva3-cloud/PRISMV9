# SFC Entitlement & Billing Gate — Implementation Spec

> **Status:** DRAFT spec (oscar overnight build-loop, 2026-06-06, Unit 3). Design-only — no code shipped in this unit. This is the **#1 revenue blocker**: today the Speed & Feed Calculator is fully usable for free by anyone who can reach `/api/v1/sfc`. You cannot sell a subscription to a product that nothing checks a subscription for.
> **Scope:** web-first SaaS path (no web-vs-Electron fork dependency — this gate is required either way). Lives on the slim SFC backend (see the carve-out path in the morning assessment).

---

## 1. Verified current state (the gap)

| Surface | File | State |
|---|---|---|
| Billing engine | `mcp-server/src/engines/StripeBillingEngine.ts` | exists, **`testMode:true` → mock data, ZERO real Stripe calls**; needs `STRIPE_SECRET_KEY` |
| Plan tiers (already defined) | `StripeBillingEngine.ts:47-53` | free / starter **$29** / pro **$79** / shop **$199** / enterprise **$499** |
| Billing routes | `mcp-server/src/routes/billing.ts` | `/create-checkout`, `/portal`, `/webhook`, `/status`, `/purchase-post` exist; **webhook signature verification is a commented-out TODO** (`billing.ts:88-90`) — a security hole |
| Billing API client | `web/src/api/client.ts:843-858` | `billingStatus/CreateCheckout/Portal/PurchasePost` exist |
| **SFC API routes** | `mcp-server/src/routes/sfc.ts:17` | **only `requireFields` — NO `verifyToken`, NO plan check, NO paywall** |
| Billing UI consumers | (grep) | **ZERO** — no pricing page, no checkout flow |

**Net:** scaffolding exists; nothing is wired and nothing is enforced.

---

## 2. Goal & non-goals

**Goal:** every request to the SFC API resolves to an authenticated identity with a known subscription tier, and each tier's entitlements are enforced server-side (rate/feature/seat). A free user gets a usable taste; a paying user gets the full engine; an over-quota free user gets `402 Payment Required` with an upgrade link.

**Non-goals (this spec):** the Electron offline-license model (Phase 2 — see §9), the marketing site, email lifecycle. Auth-provider *selection* is an operator decision (§8) but the middleware contract here is provider-agnostic.

---

## 3. Tier × entitlement matrix (proposed — operator confirms $ + limits)

| Capability | Free | Starter $29 | Pro $79 | Shop $199 | Enterprise $499 |
|---|---|---|---|---|---|
| Calcs / day | 15 | 500 | unlimited | unlimited | unlimited |
| Materials | ISO P + N only | all 15 | all 15 | all 15 | all 15 |
| 9-axis optimizer (`sfc_nine_axis_run`) | ✗ | ✓ | ✓ | ✓ | ✓ |
| Vendor parity (HSMAdvisor/G-Wizard compare) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Tool-library export (41K push) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Seats | 1 | 1 | 1 | 5 | unlimited |
| PDF report export | watermarked | ✓ | ✓ | ✓ | ✓ |
| API access (programmatic) | ✗ | ✗ | ✓ | ✓ | ✓ |

> Free tier is a **funnel**, not a trial — permanently usable on a narrow slice (mirrors G-Wizard Lite / HSMAdvisor's 1018-steel limit). Conversion driver = materials + the optimizer.

---

## 4. Architecture (request lifecycle)

```
client → [verifyToken] → [resolveEntitlement] → [enforce] → SFC dispatcher → engine
              │                  │                   │
         JWT/session       subscription tier     rate + feature + seat
         (auth provider)   (Stripe cache)        → 401 / 402 / 429
```

Three composable Express middlewares mounted **in front of** `createSfcRouter` (`routes/index.ts:118`):

1. **`verifyToken`** — validate the bearer JWT / session cookie → `req.identity = {userId, orgId}`. 401 on missing/invalid.
2. **`resolveEntitlement`** — look up the user's active Stripe subscription (cached, see §6) → `req.tier` + `req.entitlements`. Default `free` if none.
3. **`enforceEntitlement(action)`** — per-route guard:
   - feature gate: action not in tier → **402** `{error:"upgrade_required", required_tier, upgrade_url}`
   - rate gate: daily counter exceeded → **402** (free) or **429** (paid burst)
   - seat gate: concurrent seats > tier limit → **402**

**Fail-closed:** any middleware error → deny (never fall through to a free calc). This is the inverse of the telemetry wire's fail-open — billing must fail-closed.

---

## 5. Stripe wiring (close the testMode + webhook gaps)

1. **Live mode:** set `STRIPE_SECRET_KEY` (server env, never client); flip `testMode:false` behind an env flag so CI stays mocked.
2. **Products/prices:** create 4 Stripe Products (starter/pro/shop/enterprise) × monthly+annual prices; store price-IDs in config, not code.
3. **Checkout:** `POST /api/v1/billing/create-checkout {priceId}` → Stripe Checkout Session → redirect URL.
4. **Webhook (CRITICAL — fixes the `billing.ts:88` TODO):** verify `Stripe-Signature` with `stripe.webhooks.constructEvent(rawBody, sig, endpointSecret)`. Handle `customer.subscription.{created,updated,deleted}` + `invoice.payment_failed` → update the entitlement cache. **An unverified webhook = anyone can forge a "you're now Enterprise" event.** Must use the raw body (not JSON-parsed) for signature verification.
5. **Customer portal:** `POST /api/v1/billing/portal` → Stripe Billing Portal session (self-serve upgrade/cancel/card).

---

## 6. Entitlement cache (perf + resilience)

- On subscription change (webhook), write `{userId → {tier, status, currentPeriodEnd, seats}}` to a fast store (the slim backend's DB / Redis / `state/`).
- `resolveEntitlement` reads the cache (sub-ms), never calls Stripe on the hot path (Stripe API latency would re-introduce the 2.5s-class problem the perf unit just killed).
- Stale-cache guard: if `currentPeriodEnd` passed and no renewal webhook, treat as `free` (fail-closed) and reconcile via a daily Stripe sync.
- Daily counters: per-user rolling 24h window (reset at UTC midnight or rolling), stored alongside entitlement.

---

## 7. Verification channels (forge-audit-v2 discipline)

| Requirement | verifies_via | expected signal |
|---|---|---|
| Paywall enforced | `curl -H "Authorization: Bearer <free>" /api/v1/sfc/nine-axis` | **402** upgrade_required |
| Free calc works | `curl -H "<free>" /api/v1/sfc/calculate` (≤15/day) | 200 + result |
| Rate limit | 16th free call same day | 402 |
| Webhook signature | POST forged event w/o valid sig | **400** (rejected), tier unchanged |
| No-auth blocked | `curl /api/v1/sfc/calculate` (no token) | 401 |
| Cache hot-path | time `resolveEntitlement` | <2 ms (no Stripe call) |

---

## 8. Operator decisions (do NOT block the spec; resolve before build)

1. **Auth provider:** Clerk (fastest, hosted UI) vs Auth0 vs Supabase Auth (pairs with Postgres) vs roll-your-own JWT. Recommendation: **Clerk or Supabase** — hosted, fast, cheap at low scale. (The middleware contract above is provider-agnostic.)
2. **Final pricing + limits** — confirm/adjust the §3 matrix.
3. **Free-tier shape** — daily-calc cap (proposed 15) vs material-restriction vs both. Proposed: both.

---

## 9. Phase 2 — Electron Pro tier (deferred, fork-dependent)

When the Electron Desktop tier ships (the vendor-integration moat), entitlement enforcement shifts from server-session to **offline license keys** (signed JWT with `exp`, periodic ~28-day phone-home like G-Wizard, graceful degrade to a capped "Lite" on expiry like HSMAdvisor). The slim backend issues + validates the license; the same tier matrix applies. Out of scope until the operator confirms web-first → Electron sequencing.

---

## 10. Build sequence (units, when greenlit)

1. `verifyToken` + `resolveEntitlement` + `enforceEntitlement` middlewares (provider-agnostic) + entitlement cache.
2. Mount in front of `createSfcRouter`; per-route action→tier map.
3. Stripe live mode + **webhook signature verification** (security fix) + products/prices.
4. Pricing page + checkout + portal UI (the ZERO-consumer gap).
5. E2E verification per §7.

**Dependencies:** #1-3 are pure backend (no fork dependency); #4 is web-tier (also needed for Electron's purchase flow). All are no-regret for web-first.

---

_Authored by slot:oscar overnight build-loop (cron 0c8ed753), 2026-06-06. Grounds: StripeBillingEngine.ts / routes/billing.ts / routes/sfc.ts (verified current state). Companion: the SFC carve-out path + web-vs-Electron decision in the 07:33 morning assessment._
