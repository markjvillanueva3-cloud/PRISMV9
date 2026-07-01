# SFC Deep Audit — Agent 4: Billing/Auth/Subscription

## Stripe Integration (webhook, products, prices)

**Status**: INCOMPLETE STUB

- **StripeBillingEngine** exists (v7.0.0) at `H:/PRISM/mcp-server/src/engines/StripeBillingEngine.ts`
- **Pricing defined** as single source of truth:
  - Free: $0
  - Starter: $29/mo ($290/yr)
  - Pro: $79/mo ($790/yr)
  - Shop: $199/mo ($1,990/yr)
  - Enterprise: $499/mo ($4,990/yr)
- **Checkout sessions**: `createCheckoutSession()` and `createPostPurchaseCheckout()` routes exist
- **Webhook handler**: `handleWebhookEvent()` processes 6 Stripe event types (checkout.session.completed, subscription.updated, payment_succeeded, etc.)
- **CRITICAL GAP**: Webhook route at `/api/v1/billing/webhook` has **NO signature verification** (line 98-99 comment: "DB calls are fire-and-forget here — webhook handler already returned 200")
- **Test mode**: Engine defaults to `testMode: true` (safe), but live mode requires `STRIPE_SECRET_KEY` env var not present in checked config

## Subscription Model (tiers, gates, persistence)

**Status**: DEFINED BUT DISCONNECTED

- **5-tier model** defined in `tierGate.ts` with limits per plan:
  - Free: 10 speed/feed/day, no program generation, 20 materials, 5 machines
  - Starter: unlimited speed/feed, no program generation, unlimited materials/machines
  - Pro: unlimited, 5 program gen/day, simulation enabled, 10 DFM rules
  - Shop: unlimited all, stochastic analysis, 30 DFM rules, 5 max users
  - Enterprise: unlimited everything, API access enabled, unlimited users
- **Tier gating middleware** exists: `requireTier(feature)` factory for Express
- **CRITICAL BLOCKER**: `tierGate.ts` middleware is NEVER IMPORTED or USED on any routes
- **DB persistence missing**: `users` table (schema.sql line 14-24) has NO columns for:
  - `subscription_plan` (VARCHAR)
  - `stripe_customer_id` (VARCHAR)
  - `stripe_subscription_id` (VARCHAR)
  - `subscription_status` (VARCHAR)
  - `billing_email` (VARCHAR)
- **Token claims**: `AuthEngineV7.ts` line 20 defines `type Plan = "free"|"starter"|"pro"|"shop"|"enterprise"` and parses into JWT, but plan is hardcoded or never updated after Stripe webhook

## Auth Middleware on SFC Endpoints

**Status**: OPEN - ZERO PROTECTION

**All SFC & SpeedFeed routes have NO auth**:
- `/api/v1/sfc/calculate` — **OPEN** (requireFields only)
- `/api/v1/sfc/cycle-time` — **OPEN**
- `/api/v1/sfc/deflection` — **OPEN**
- `/api/v1/sfc/tool-life` — **OPEN**
- `/api/v1/speed-feed/orchestrate` — **OPEN**
- `/api/v1/speed-feed/optimize` — **OPEN**
- All 15 SFC/SpeedFeed endpoints: **ZERO `verifyToken` or `requireTier` middleware**

**Contrast**:
- EDM routes use `verifyToken` + `requirePermission("edm:read")`
- Billing routes use `verifyToken`
- Admin routes use `verifyToken` + `requireRole("admin")`
- SFC is an orphan: no auth, no rate limit, no usage tracking

## Can PRISM Charge Customers Today? (PASS/FAIL with reasoning)

**ANSWER: FAIL** (Score: 15/100)

**Why it fails**:
1. SFC is **completely open** — anyone can call all endpoints unlimited times with no authentication
2. No DB schema to store subscription state — webhook events can't persist plan changes
3. Tier gating middleware exists but is **never wired to routes** — no endpoints enforce limits
4. Webhook signature verification is stubbed — malicious actors can POST fake events
5. No usage tracking — even if gated, can't enforce per-day limits (no daily usage counter in DB)
6. Plan never flows from JWT to actual enforcement — `req.user.plan` exists in memory but isn't tied to persistent subscriptions

**Result**: Anyone can use unlimited SFC calculations without paying. Stripe checkout is cosmetic only.

## Strengths

1. **Stripe engine is well-structured**: clean separation of test/live modes, proper pricing constants, webhook handlers for all major events
2. **Billing routes have auth**: checkout/portal endpoints require `verifyToken` (prevent unauthenticated signup)
3. **Tier model is comprehensive**: 5 tiers with granular feature limits (speed/feed, program gen, simulation, DFM, stochastic, API)
4. **Middleware pattern exists**: `requireTier()` factory is ready to drop into routes
5. **Pricing is centralized**: single source of truth in StripeBillingEngine reduces inconsistency risk

## Gaps (BLOCKERS for monetization)

1. **SFC routes have NO auth** — anyone can access without authentication
2. **No `requireTier()` on any SFC/SpeedFeed endpoints** — tier gating is dead code
3. **Users table has NO subscription columns** — no schema to persist Stripe customer ID, subscription ID, plan, status
4. **Webhook signature verification is stubbed** — accepts any POST, no Stripe secret validation
5. **No usage tracking table** — can't enforce per-day limits (speed_feed_per_day=10 on free tier)
6. **JWT plan field is ephemeral** — decoded from token but not synced with DB; token doesn't auto-update after webhook
7. **No migration path** — schema.sql does not include billing tables (stripe_customers, subscriptions, usage_log)
8. **Webhook DB persistence is fire-and-forget** — comment on line 99 confirms no DB update after webhook accepted

## Score (0-100)

**15/100**

**Rationale**:
- Infrastructure exists (+40%): Stripe engine, tier model, middleware, pricing
- But totally disconnected (+0%): no auth on SFC, no DB schema, no enforcement
- Can charge today? No (-85%): wide-open endpoints, no subscription persistence, webhook is stub
- Business impact: Can generate checkout links but can't prevent free-tier users from using pro features

---

## Immediate Actions (MUST DO)

1. Add `plan` column to `users` table (default 'free')
2. Create `stripe_subscriptions` table (stripe_customer_id, stripe_subscription_id, status, current_plan, renewed_at)
3. Add `verifyToken, requireTier("speed_feed")` to `/api/v1/sfc/calculate` (core revenue endpoint)
4. Wire webhook to DB: update `users.plan` when Stripe sends `checkout.session.completed`
5. Implement Stripe signature verification (use native crypto, no SDK needed)
6. Create usage_log table + query for daily limit enforcement
7. Add `requireTier()` to all pro/shop/enterprise features (program_generate, simulation, stochastic)
