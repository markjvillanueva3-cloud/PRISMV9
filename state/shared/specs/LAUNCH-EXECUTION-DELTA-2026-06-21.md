# PRISM Launch-Execution Delta + Verified State — 2026-06-21

> **Author:** slot:quebec via ultracode (6 sonnet survey specialists + opus synthesis, run `wf_db45ef6c-7b3`, 7 agents / ~952k tok).
> **Supersedes the UNVERIFIED gates in** PRODUCT-LAUNCH-COMPLETION-PLAN-2026-06-20.md. Pricing now canonical in PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md.
> **Operator directive 2026-06-20** resolves the prior plan's blocking decisions: launch SFC + single post soon; everything subscription + a one-time price for SFC and a single post. Treated as DECIDED.

## 1. The 3 UNVERIFIED gates -- now RESOLVED (file:line evidence)
- **(a) `prism_product:ppg_generate` = REAL.** Routes via `ProductEngine.ts:1394-1442` -> `GCodeTemplateEngine` (`generateProgram`/`generateGCode`), dispatched `productDispatcher.ts:816-824`. NOT the 7-phase pipeline (that is `ppg_benchmark_report`, `productDispatcher.ts:337`). **Not launch-blocking.** Prior plan §2.3 was wrong on the mechanism -> doc-corrected.
- **(b) `/api/v1/cost` = 4 REAL + 2 honest 501.** REAL: `POST /estimate` (`cost.ts:243`->`process_cost`), `POST /quote` (`cost.ts:251`->`shop_quote`), `GET /aggregate` (`:287`), `GET /dashboard` (`:298`). 501: `POST /compare` (`:266`), `GET /history/:jobId` (`:279`). **Quoting FE is NOT decorative.** Wave-2 blocker is ACCURACY (71.1% MAPE), not wiring.
- **(c) ERP page depth = 4/5 sampled real+deep.** `ErpDashboard.tsx:10`, `GeneralLedgerPage.tsx:244` (9 GL actions), `CommissionTrackerPage.tsx:23`, `CapacityPlanningPage.tsx:67`. (Plan's "MaintenanceWorkOrderPage" does not exist -> it is `PreventiveMaintenancePage.tsx:44`, also real.) `ErpDashboard` quick-link sub-pages remain unverified stubs.

## 2. Stale / newly-confirmed
- **Commercial layer is MORE built than the plan claimed.** Backend `POST /create-checkout` (`routes/billing.ts:33`) + `POST /portal` (`:59`) + `/webhook` (`:84`) EXIST; had **zero FE callers**. **Path-bug (fixed this session):** FE `billing.ts` called `POST /purchase {controller_id,license_type}` but backend is `POST /purchase-post {controller,type}` (`routes/billing.ts:133,139`) -> every post purchase 404'd silently.
- **Mobile not zero** -- `useHaptics.ts` Capacitor bridge scaffold exists (readiness 0.10); `@capacitor` npm dep still absent. **Electron still zero** (confirmed, post-launch).
- **SFC silent-zero guard SHIPPED** (`82cabc91e4`); deflection canonicalized (`0aa5e7e717`).

## 3. Updated readiness (evidence-based)
| Product | Plan | Now |
|---|---|---|
| SFC | 0.38 | **0.45** |
| Single post | 0.42 | **0.50** (ppg_generate REAL; AlarmDB-in-P5 still open) |
| Commercial layer | 0.25 | **0.40** (+ this session: FE billing client + pricing/subscription pages + canonical registry) |
| Quoting | 0.28 | **0.32** (real primary path; accuracy-blocked) |
| ERP | 0.45 | **0.50** |
| Electron | 0.00 | 0.00 |
| Mobile | 0.05 | 0.10 |

## 4. Quebec frontend backlog (Q1-Q6) -- status
- **Q1 billing client + path-bug fix** -- DONE 2026-06-21 (`billing.ts`: +createCheckout/createPortal, fixed purchasePost path+body+flat-response).
- **Q2 public pricing page + subscription page** -- DONE (`PricingPage.tsx`, `SubscriptionPage.tsx`, routes `/pricing` public + `/subscription` protected; reads canonical `data/pricing.ts`; 14/14 registry tests; tsc clean).
- **Q3 single-controller purchase UI** (`PostProcessorStorePage` live billing status + owned-Set + error/loading + `/post-processor/success`) -- NEXT.
- **Q4 quote PDF wire** (`QuoteBuilderPage` -> `utils/quotePdf.ts generateQuotePdf`) -- handed to charlie (their page; needs `InstantQuoteResult` vs `ErpQuoteGenerateResult` type reconcile).
- **Q5 SFC standalone exposure** (`calc.ts` + `SfcCalculatorPage` 9-axis/SLD/vendor/calibration) -- NEXT.
- **Q6 entitlement admin UI** -- BLOCKED on papa `admin.ts` backend verify; do not start.

## 5. Cross-slot handoffs (posted to chat bus)
- **papa U-COMM-02 (P0 security):** uncomment Stripe webhook sig verify (`routes/billing.ts:88-91`) + add `billingPortal` to `_initStripe()`. Gates live checkout.
- **papa U-COMM-02b:** `/portal` needs a Stripe customerId; resolve it from the session (FE `getBillingStatus`/`/status` does not return one). Gates SubscriptionPage "Manage billing".
- **papa U-COMM-01 (with hotel):** mirror the canonical pricing registry (PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md / `web/src/data/pricing.ts`) into `src/config/pricing-registry.ts`; StripeBillingEngine + BillingEngine + AuthEngineV7 read it; parity test FE===BE. Retire BillingEngine `$49/$999` divergent catalog.
- **papa U-COMM-03 (P0):** entitlement-enforcement middleware (reads `getTierLimits` + per-seat overrides). Until it ships, subscriptions are unsellable (free user can call anything).
- **papa U-COMM-08:** license-key issuance/validation for one-time SFC + single-post (gates SFC perpetual purchase + Q3 activation).
- **papa U-COMM-05 backend:** confirm/add `admin.ts` entitlement endpoints + `plan` on `GET /users` (unblocks Q6).
- **echo U-PP-L1 (P0 SAFETY):** wire AlarmDB (2,588 alarms) into the post P5 safety gate. Non-negotiable before selling post output.
- **oscar U-SFC-L3/L4:** kill inline Taylor constants in `AdvancedCharts.tsx`; fix `SpeedFeedOutcomeFeedbackBridge.tryBusCapture()` hardwired `return true`.
- **charlie Q4:** wire `generateQuotePdf` into `QuoteBuilderPage` (zero-dep, the hard PDF code already exists in `utils/quotePdf.ts`).

## 6. Risks (R12 -- what would make a launch claim a lie)
1. **No entitlement enforcement (papa U-COMM-03) => subscriptions unsellable.** The #1 blocker. Quebec can build the whole checkout UI and it will collect money while gating nothing. A "subscription launched" claim is a lie until U-COMM-03 lands.
2. **Webhook signature verification commented out (`routes/billing.ts:88`)** = security P0; no live Stripe until papa U-COMM-02.
3. **AlarmDB not in post P5** = selling G-code that can trip a controller alarm. "Single post launched" is a lie until echo U-PP-L1.
4. **Quoting 71.1% MAPE** -- Wave 2, behind an accuracy program. Do NOT sell quotes on this.
5. **`/portal` customerId gap** -- SubscriptionPage "Manage billing" cannot work until papa U-COMM-02b.

---
_slot:quebec 2026-06-21. Evidence cites file:line; readiness scores are upper bounds pending live-Stripe + entitlement E2E validation._
