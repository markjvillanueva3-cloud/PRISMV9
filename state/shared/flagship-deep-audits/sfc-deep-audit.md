# SFC (Speed/Feed Calculator) Flagship Deep Audit — Consolidated Report

**Verdict:** 53/100 — **MONETIZATION BLOCKED** · Internal-ready, SaaS-blocked
**Date:** 2026-05-08
**Method:** 10 parallel Explore + physics-reviewer agents
**Comparison:** Mill 68/100, WEDM 82/100, Lathe 75/100, **SFC 53/100 (lowest)**

---

## EXECUTIVE SUMMARY

SFC is one of the two **saleable subscription products** (the other is Master Post). It is structurally complete as an internal calculator (18 engines, 19.1K LOC, 14 dispatcher actions, 17 API endpoints, 123 tests, 2 frontend pages, 12 components, 6,346+ materials) — **but cannot charge customers today**. The Stripe integration is 40% built but 0% connected: no auth on endpoints, no `subscription_plan` column in users table, webhook signature verification stubbed (billing.ts:98-99), tier-gating middleware exists as dead code.

**This is the highest-business-impact gap in PRISM.** Until billing closes, every other SFC investment is a sunk cost.

**Highest-leverage commits:**
1. **Wire `verifyToken` + `requireTier()` middleware** to all 17 SFC endpoints (4h)
2. **Add `subscription_plan` and `stripe_customer_id` columns** to users table + migration (2h)
3. **Implement Stripe webhook signature verification** at billing.ts:98 (4h)
4. **Persist subscription state** from webhook events (4h)
5. **Fix 9 inline-Kienzle violations** (AutoSpeedFeedEngine L809, AutoSpeedFeedCalculatorEngine L161, +7 others) (8h)

Total to monetization-ready: **~22 hours** for billing + auth; SFC then becomes the **first revenue-positive PRISM product**.

---

## AGENT SCORECARD

| # | Agent | Domain | Score | Status |
|---|---|---|---:|---|
| 1 | Engines | 18 engines / 19.1K LOC | 62 | ⚠ 9 inline-constants violations |
| 2 | Dispatcher | 14 wired actions, 0 orphans | 62 | ⚠ Schema-light (2/14) |
| 3 | Frontend | 2 pages + 12 components | 72 | ✓ Internal-ready |
| 4 | **Billing/Auth** | **Stripe stubbed, no auth** | **15** | **✗ MONETIZATION FAIL** |
| 5 | Tests | 123 tests / 1,287 LOC | 77 | ✓ Solid |
| 6 | Physics | Formulas correct, constants leaked | 72 | ⚠ Grade C+ |
| 7 | JM Die Fleet | 6 of 12 machines | 42 | ✗ Lathe fleet missing |
| 8 | ML/Learning | No ledger, capture-only | 58 | ⚠ By-design release-ready |
| 9 | API/Router | 17 endpoints, 1/17 validated | 62 | ⚠ Open + minimal Zod |
| 10 | Roadmap | Single plan, 0% complete | 0 | ✗ Stored only |
| | **Composite** | | **53** | **Monetization-Blocked** |

---

## PART A — ENGINES (Agent 1) · 62/100

- **18 SFC engines** / 19.1K LOC
- Orchestrator: `SpeedFeedOrchestratorEngine` (~2,851 LOC) — central hub design is sound
- Engines: UltimateSpeedFeed, AutoSpeedFeed, AutoSpeedFeedCalculator, KienzleForceModel, ChipThinningEngine, ToolEngagementEngine, MaterialLookupEngine, surface-finish predictors, etc.

**Critical gap: 9 engines violate canonical-constants rule** by inlining Kienzle/Taylor values instead of importing from `src/physics/constants.ts`. This breaks the safety contract the rest of PRISM depends on.

---

## PART B — DISPATCHER (Agent 2) · 62/100

- **14 wired SFC actions**, all with dispatcher cases + lazy-loaded engines (zero orphans)
- **Only 2 of 14 actions have Zod schemas** (`speed_feed`, `surface_finish`) — 12 bypass validation
- Missing schemas: Kienzle, Ultimate Speed Feed, hyperMILL material lookup, grinding surface finish, +8 others
- Dispatcher-level test coverage: 3 of 14 actions

**Round-trip-to-dispatcher tests** missing for 11 actions — engine singletons tested directly but not through dispatcher path.

---

## PART C — FRONTEND (Agent 3) · 72/100

- **2 dedicated pages**: `/speed-feed-calc`, `/speed-feed`
- **12 specialized components**:
  - `SmartMaterialSelector` (6,346+ materials)
  - `SmartToolSelector`, `SmartMachineSelector`
  - `ResultsDisplay`, `CompatibilityValidator`
  - `ComparisonView`, `CalculationHistory`, `PresetManager`
- **15 backend API calls** (7 SFC-specific + 8 orchestrator routes covering quick/stochastic/optimize/compare/resolve)
- Embedded in `CalculatorPage` for cross-flagship use

**Subscription gating UI: NONE DETECTED.** No paywall, no credit counter, no tier display, no upgrade prompts. Only role-based shop_floor auth.

---

## PART D — BILLING / AUTH / SUBSCRIPTION (Agent 4) · 15/100 ✗ FAIL

### Can PRISM charge customers today? **NO.**

**What works (40% built):**
- Stripe billing engine v7.0.0 well-structured
- 5-tier pricing model defined ($0–$499/mo)
- Checkout session logic exists
- Tier limits defined in middleware

**What's missing (0% connected):**
- ✗ Zero `verifyToken` or `requireTier()` middleware on SFC endpoints — all 17 open
- ✗ Users table has NO `subscription_plan` or `stripe_customer_id` columns
- ✗ Tier-gating middleware exists as **DEAD CODE** (never wired to routes)
- ✗ Stripe webhook signature verification **STUBBED** (billing.ts:98-99)
- ✗ No `usage_tracking` table (can't enforce daily limits)
- ✗ No persistence of webhook subscription events to DB

**Verdict: Stripe checkout is cosmetic; the paywall doesn't exist.**

This is the single highest-priority gap in PRISM for revenue generation. Until this closes, SFC and Master Post both remain free-to-use even when "paid" through Stripe — Stripe charges, but PRISM doesn't track.

---

## PART E — TESTS (Agent 5) · 77/100

- **123 test cases** across 1,287 LOC
- Materials: P/M/N/S ISO groups covered; **K/H absent**
- Tools: Carbide validated; **HSS/ceramic missing**
- Edge cases: Zero/negative/extreme ranges handled; NaN/Infinity propagation gaps
- **8 `toBeDefined()` stub assertions** (yellow flag — should verify truth values)
- Reference-value sourcing: Kienzle/Taylor confirmed but benchmark sourcing weak

---

## PART F — PHYSICS (Agent 6) · 72/100 (Grade C+)

**Formulas correct:**
- Vc/RPM: π·D·n / 1000 ✓
- MRR: ap·ae·Vf ✓
- Taylor: T = (C/Vc)^(1/n) ✓
- Brammertz Ra: fz²/(32·rε) ✓ (note: agent reported /32 but canonical is /8 — needs verification)
- Chip-thinning: hex = fz·sin(κr)·√(ae/Dc) ✓

**Critical violations:**
- `AutoSpeedFeedEngine` line 809 hardcodes `{P:1800, M:2100, K:1100, N:700, S:2800, H:3200}`
- `AutoSpeedFeedCalculatorEngine` line 161 mirrors the same table
- Both **bypass `CANONICAL_KIENZLE`** from constants.ts
- `UltimateSpeedFeedEngine` and `SpeedFeedOrchestratorEngine` declare inline kc tables but launder via runtime re-sync loop (drift hazard)

**Missing:**
- Explicit turning MRR helper: MRR = vc·f·ap
- VB = 0.3mm wear-criterion annotation per ISO 3685

---

## PART G — JM DIE FLEET (Agent 7) · 42/100

- **6 of 12 machines covered** in `MACHINE_CATALOG_QUICK`
- Mills: 3 of 5 covered (VF-2, VM30i, M460V-5AX). Missing: Haas OM-2, Roku-Roku HC-658-II
- Lathes: **2 of 7 covered** (LB 3000EX Big Bore, Multus B250II). Missing: GENOS L300-M, GENOS L200E-M, LNC8, Crown L1060, GENOS L400II-E
- `ShopConfigurationEngine` has all profiles but `SpeedFeedOrchestratorEngine` doesn't query it (bridge missing)
- Fallback to generic type defaults when machine missing — silent degradation

---

## PART H — ML / CLOSED-LOOP LEARNING (Agent 8) · 58/100

- **0 SFC-specific reasoning ledger entries** (Mill: 7,986; WEDM: 311; Lathe: 0; SFC: 0)
- No `SFC_TRAINING_CORPUS.jsonl`, no training scripts
- 0 dedicated LoRA / EWC / online-learning engines
- Operator override capture: ✓ wired (recommended vs actual, cycle_time, Ra, CMM, FAI, scrap severity)
- Feedback **stored in-memory, never persisted or analyzed**
- Closed loop: capture ✓ / analysis ✗ / correction ✗

**Agent 8 verdict:** "Release-ready as-is" — SFC is a stateless web calculator; feedback capture without analysis is acceptable by design. If closed-loop learning becomes a requirement: 40–50h.

---

## PART I — API / ROUTER (Agent 9) · 62/100

- **17 SFC endpoints** across 2 dedicated routers (`/api/v1/sfc/`, `/api/v1/speed-feed/`)
- Both routers fully registered (unlike Mill router which is unregistered)
- Inherit global middleware: CORS, rate limiting, optional auth
- **No endpoint-level auth** — only optional global token
- **1 of 17 endpoints has Zod request validation**
- No endpoint-specific rate limits for CPU-heavy ops (`/optimize`, `/stochastic`)
- Clean router separation, consistent response shapes, proper error delegation

---

## PART J — ROADMAP (Agent 10) · 0/100 completion

- **Authoritative**: `H:/PRISM/docs/SPEED_FEED_CALCULATOR_ENHANCEMENT_PLAN.md` v1.0 (Jan 27, 2026)
- **Zero competing drafts** (cleanest of all flagships in this respect)
- 31 units / 3 phases / 15 skills / 10 agents / 24 hooks — **all stored, 0% implemented**
- Listed in PRISM-UNIFIED-ROADMAP-v2.md as "product track" but inactive
- Blocked waiting for Materials/Tools/Machines/Compatibility/Calculation phases (Phases 1–5) to complete first

---

## CRITICAL BLOCKERS (Severity Order)

### TIER 0 — Revenue blocker
1. **No working paywall** — Stripe charges but PRISM doesn't enforce. (~22h fix to MVP)

### TIER 1 — Production blockers
2. **9 inline-Kienzle violations** — breaks canonical-constants safety contract (8h)
3. **5 critical Okuma lathes missing** from SFC fleet catalog (16h)
4. **No request validation** on 16 of 17 endpoints (12h Zod schemas)

### TIER 2 — Quality gaps
5. K/H ISO material groups untested
6. HSS/ceramic tool tests missing
7. 8 stub `toBeDefined()` assertions
8. Roadmap 0% executed (31 units stored)

### TIER 3 — Architecture
9. `ShopConfigurationEngine` ↔ `SpeedFeedOrchestratorEngine` bridge missing
10. No SFC reasoning ledger (release-acceptable per Agent 8)

---

## RECOMMENDATIONS (priority order)

### IMMEDIATE — Monetization unlock (22h)
1. Stripe webhook signature verification (4h)
2. Users table migration: `subscription_plan`, `stripe_customer_id`, `subscription_status`, `current_period_end` (2h)
3. Webhook→DB persistence handler (4h)
4. Wire `verifyToken` + `requireTier()` to all 17 SFC endpoints (4h)
5. Tier-gate test E2E: free → checkout → paid → calc allowed (4h)
6. Usage-tracking table + per-tier rate limits (4h)

### NEXT SPRINT (M1) — Safety + correctness (32h)
7. Fix 9 inline-Kienzle violations (8h)
8. Add Zod schemas to remaining 16 actions (12h)
9. Add K/H ISO + HSS/ceramic tool tests (8h)
10. Replace 8 stub assertions with reference-value checks (4h)

### M2 — Fleet completeness (24h)
11. Wire `ShopConfigurationEngine.getMachine()` into orchestrator (8h)
12. Add 6 missing machines to MACHINE_CATALOG_QUICK with envelope tests (16h)

### M3 — Closed-loop learning (40-50h, optional)
13. SFC reasoning ledger + training corpus
14. Feedback analyzer engine
15. LoRA-cadence speed/feed adaptation

---

## TIME-TO-PRODUCTION ESTIMATE

| Phase | Hours | Score Impact |
|---|---:|---|
| Monetization unlock | 22 | 53→70 |
| Safety + correctness | 32 | 70→78 |
| Fleet completeness | 24 | 78→83 |
| Roadmap execution (units 1-15) | 80 | 83→90 |
| Closed-loop learning | 48 | 90→94 |
| Roadmap execution (units 16-31) | 100 | 94→97 |
| **Total** | **306** | **53→97** |

---

## SUMMARY

SFC has the **most-complete internal foundation** of any saleable PRISM product (18 engines, 17 endpoints, 123 tests, 12 frontend components, 6,346+ materials catalog) but is **monetization-blocked** by a 22-hour gap in billing/auth wiring. Stripe infrastructure is half-built; the missing half is connection, not construction. **Once billing closes, SFC becomes the first revenue-positive PRISM product** and proves the subscription model end-to-end before Master Post follows the same pattern.

The 9 inline-Kienzle violations are a separate but mandatory fix — they break the canonical-constants contract that the rest of PRISM relies on for safety scoring. These should be remediated before SFC ships, regardless of monetization timeline.

**Composite Verdict: 53/100 — Monetization-Blocked, 22h to revenue-ready, 306h to four-sigma production.**
