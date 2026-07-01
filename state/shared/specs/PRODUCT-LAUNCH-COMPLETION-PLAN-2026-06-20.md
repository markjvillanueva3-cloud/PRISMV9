# PRISM Product-Launch Completion Plan + Pricing Design — 2026-06-20

> **Author:** slot:quebec (orchestrator) via ultracode fan-out — 5 sonnet assessment specialists read **real** code (verified, R12), orchestrator synthesized.
> **Status:** PLAN + PRICING PROPOSAL. Pricing numbers and launch sequence require **operator sign-off** before any build.
> **Source agents:** platform · sfc · postproc · quoting · erp+billing (findings cited inline with file:line evidence).
> **Scope correction (R12):** the operator's premise — "SFC/post/quote/ERP should be much further along than the 3 wizards/print-to-cnc/cad-cam" — is **half-true and half-inverted.** The *backends* of all four ARE deeply built (often the most-built surfaces in the repo). What is missing across **all four identically** is (a) frontend exposure of that backend, and (b) the shared **commercial layer** (entitlement enforcement + checkout). That reframes the plan: build the commercial layer **once**, expose each product's frontend, then launch in readiness order.

---

## 1. Executive summary + launch recommendation

**Headline:** PRISM cannot "launch everything soon," but it **can** launch a focused beachhead soon. The single largest blocker is **not** any one product — it is the **shared commercial layer** (subscription + per-feature entitlement enforcement), which does not yet exist as an enforced gate.

**Recommended launch sequence (readiness-ordered, R12-honest):**

| Wave | Product | Verified readiness | Why this order | Rough ETA* |
|------|---------|--------------------|----------------|-----------|
| **1A** | **SFC (Speed/Feed Calculator)** standalone | 0.38 | Production-grade physics backend (401-assert gauntlet); simplest commercial story; one of the 2 named one-time products | ~3–4 wk |
| **1B** | **Single Post-Processor** | 0.42 | Most-built backend (ppDispatcher 655 actions, 7-phase pipeline w/ canonical physics); the other named one-time product | ~4–5 wk |
| **(shared)** | **Commercial layer** (billing + entitlement) | 0.25 | **Gates BOTH 1A and 1B** — build once, serve all | ~2–3 wk (parallel) |
| **2** | **Quoting** | 0.28 | **Blocked on ACCURACY, not just build** — 71.1% MAPE on synthetic, ~10 real validation pairs. Not safe to sell yet | ~6–12 wk |
| **3** | **ERP suite** | 0.45 | Largest surface; page depth UNVERIFIED; credential-blocked feeds | ~8–12 wk |
| **later** | Electron desktop / iOS+Android | 0.00 / 0.05 | **Zero code** — pure plans. Capacitor-wrap the same Vite bundle post-web-launch | post-launch |

\* *ETAs are engineering-effort estimates from the agents' gap lists, not commitments. Multiple "files exist ≠ works" UNVERIFIED items must be E2E-validated before any are firm.*

**The fastest path to first revenue:** ship the **shared commercial layer + SFC + a single post-processor** as the launch bundle. These have the most complete backends, the simplest pricing (the two operator-named one-time products), and **no dependency on the unvalidated quoting accuracy or the credential-blocked ERP.**

---

## 2. Verified current state (with evidence)

### 2.1 Platform / fleet / frontend / mobile (readiness: web 0.55, electron 0.0, mobile 0.05)
- **Fleet:** 730 milestones / 5,751 units / **1,849 shipped (32%)** / 3,888 pending (`MILESTONE_PROGRESS.md`). Engine fleet 3,813/3,813 wired (`BUILD_STATE.md:8`).
- **Web app:** REAL Vite + React 19 SPA — **156 pages** (`src/pages/`), **90 API clients** (`src/api/`), wired via `src/lib/resilientFetch.ts` → `:3100` bridge (`client.ts:34 /api/v1`). UX gap: only **2 of 111 audited pages** handle all 3 states (loading/error/empty); 10 pages handle 0/3 (`STATE-COVERAGE-AUDIT.md`).
- **Electron:** **PLANNED, zero code.** No `electron` dep in either `package.json`; `MS-DESKTOP.json:4` = `not_started`, 18 units, gated on MS-LEGAL + MS-INFRA + MS-PAY + MS-CAM-MASTERY.
- **iOS/Android:** **PLANNED, zero scaffold.** No `@capacitor/*` or `react-native` dep. `web/CLAUDE.md` documents a Capacitor-6 single-codebase wrap doctrine; no `capacitor.config.ts`, no iOS/Android project.

### 2.2 SFC — Speed/Feed Calculator (readiness 0.38)
- **Backend = production-grade.** `UltimateSpeedFeedEngine` (31 models, 401 reference-value asserts), 9-axis orchestrator (`sfc_nine_axis_run`), stochastic pipeline, **vendor-parity adapters BUILT** (G-Wizard + HSMAdvisor + tri-compare) — *backend only.* 7 `/sfc` routes + 8 `/speedfeed` routes.
- **Frontend split:** a thin standalone `SfcCalculatorPage.tsx` (**390 LOC**, only 4 API endpoints via `calc.ts`) **vs** the rich `CalculatorPage.tsx` studio (**13,638 LOC**, uses full `speedfeed.ts` API). The *sellable standalone* surface is the thin one.
- **P0/P1 gaps:** standalone doesn't expose 9-axis/SLD/vendor-parity/calibration (all built in backend); **no auth/subscription/metering** (P0 for a paid product); **Taylor constants inlined in `AdvancedCharts.tsx`** (P1 — violates constants.ts contract); `SpeedFeedOutcomeFeedbackBridge.tryBusCapture()` hardwired `return true` (R12 honesty bug).

### 2.3 Post-Processor Generator / Master Post (readiness 0.42)
- **Backend = most-built surface in repo.** `ppDispatcher` **655 actions** (grep-verified), 7-phase `PostProcessorPipelineEngine` (**4,931 LOC**, canonical Kienzle/Taylor imported from `constants.ts`), **14 controller dialects**, static NC linter (8 rules × 14 dialects), 17 JM Die `.cps` posts. 5-step wizard UI wired to `/ppg/*` routes.
- **P0 gaps:** **AlarmDB (2,588 alarms) NOT wired into P5 safety gate** — G-code could trigger a controller alarm (a hard no for shop-floor launch); **12 unintegrated commits on `slot/echo`** (PostEmitSafetyGate, PostLibraryEngine, HURCO bridge) — UI "library" lane may hit dark engines; `prism_product:ppg_generate` live-vs-stub **UNVERIFIED**; `pp_outcome_emit` absent from P6. MS-MASTERPOST 44/44 units gated on **U-LEGAL-13** (controller-manual copyright) — *not* a blocker for a single well-tested controller MVP (e.g. Hurco, which has a 92K-LOC master engine).

### 2.4 Quoting (readiness 0.28)
- **Backend = deep** (~78 engines, `quotingDispatcher` 60+ actions, calibration pipeline verified 434/434).
- **Two hard blockers:** (1) frontend calls thin `/api/v1/cost` (4 endpoints) — **UNVERIFIED** whether those routes hit the real stack or stubs, so the UI may be decorative; (2) **pricing accuracy is commercially indefensible** — **71.1% MAPE** on synthetic baseline, 40% training coverage, **~10 real (predicted,actual) pairs**. (3) No binary customer PDF (`QuoteExplainPDFEngine` emits markdown only). ERP-actuals feed credential-blocked.
- **Implication:** Quoting is **not a near-term launch product.** It needs an accuracy program (real outcome pairs), not just UI wiring.

### 2.5 ERP / Business (readiness 0.45) + Billing infra (readiness 0.25)
- **ERP:** `businessDispatcher` **7,770 LOC** (GL/payroll/scheduling/CRM actions wired), 40 business engines, **17 ERP pages on disk** — but **page depth UNVERIFIED** ("files exist ≠ work"); `BusinessSyncEngine.ts` is a **320-byte stub**.
- **Billing — KEYSTONE FINDING:** infra **exists** but is **not launch-safe**:
  - `StripeBillingEngine.ts` (real Stripe REST, testMode default) — plans free/$29/$79/$199/$499; post-proc $9/mo, $79/yr, **$199 permanent/controller**, bundle_5 $799, bundle_all $2499.
  - `BillingEngine.ts` (pure logic, state machine) — plans shop $49 / team $199 / enterprise $999.
  - `AuthEngineV7.ts` — `Plan` type + **TierLimits (10 dimensions)** defined, but **no enforcement layer reads them.**
  - **5 P0s:** webhook signature verification **COMMENTED OUT** (`routes/billing.ts:88-91`); `createPortalSession` → `billingPortal` undefined in `_initStripe()` (NullRef in live mode); **3 conflicting plan catalogs**; **NO per-feature entitlement enforcement** (free users can call anything); frontend `billing.ts` has **no checkout/subscription-management** calls.

---

## 3. The cross-cutting insight (drives the whole plan)

> **Every product has the same shape: rich backend, thin frontend exposure, absent commercial layer.**

Therefore the plan is **not** four independent product builds. It is:
1. **ONE shared commercial layer** (billing reconciliation + entitlement enforcement + checkout/admin UI + metering + license keys) — built once, gates and serves all products. **This is the #1 launch blocker.**
2. **Per-product frontend exposure** of already-built backends (cheap, days each).
3. **Product-specific P0s** (post-proc AlarmDB safety; quoting accuracy).

This is textbook R15 *build-once / apply-to-all-galaxies*.

---

## 4. Completion plan (dependency-ordered units)

### 4.0 SHARED COMMERCIAL LAYER — critical path, owner: papa (backend) + hotel (billing domain) + quebec (frontend)
| ID | Title | Owner | Effort | Depends | Acceptance (WIRE→TEST→VALIDATE) |
|----|-------|-------|--------|---------|----------------------------------|
| U-COMM-01 | Reconcile 3 plan catalogs → ONE canonical plan registry | papa/hotel | 1d | §5 sign-off | Single source; StripeBillingEngine+BillingEngine+AuthEngineV7 all read it; test asserts parity |
| U-COMM-02 | Fix Stripe P0s: uncomment webhook sig verify + add `billingPortal` to `_initStripe()` | papa | 0.5d | — | Forged webhook rejected (test); portal session returns in live mode |
| U-COMM-03 | **Entitlement-enforcement middleware** — reads `getTierLimits(plan)`+per-seat overrides, blocks over-limit dispatcher calls | papa | 3–5d | U-COMM-01 | Free user blocked past limit on SFC/post/quote (E2E through dispatcher) |
| U-COMM-04 | Frontend checkout + subscription mgmt (extend `web/src/api/billing.ts` + Billing settings page w/ loading/error states) | quebec | 2d | U-COMM-02 | User can subscribe/cancel/upgrade from UI; Playwright smoke |
| U-COMM-05 | **Per-seat admin entitlement UI** — shop admin grants/revokes feature access per user | quebec | 2–3d | U-COMM-03 | Admin denies user X the Quoting feature; X's calls 403 (the operator's "what a shop allows users to pay for") |
| U-COMM-06 | Usage metering + rate limiting on SFC/post/quote endpoints | papa | 2–3d | U-COMM-03 | Metered counts persist; over-quota returns 429 |
| U-COMM-07 | Stripe live-mode runbook + env provisioning (`STRIPE_SECRET_KEY`,`STRIPE_WEBHOOK_SECRET`) | operator | 0.5d | U-COMM-02 | Live test charge in Stripe test→live |
| U-COMM-08 | **License-key issuance/validation** for one-time perpetual buys (SFC, single post) | papa | 3–5d | U-COMM-01 | Key issued on one-time purchase; validates offline; revocable |

### 4.1 WAVE 1A — SFC, owner: oscar (backend) + quebec (frontend)
| ID | Title | Owner | Effort | Depends |
|----|-------|-------|--------|---------|
| U-SFC-L1 | Expose full speedfeed API in `calc.ts` (9-axis, stochastic, tri-compare, calibration) → wire standalone page | quebec | 2d | — |
| U-SFC-L2 | Add SLD/chatter chart + vendor-parity compare + calibration panel to `SfcCalculatorPage` | quebec | 3–4d | U-SFC-L1 |
| U-SFC-L3 | Fix Taylor-constants-inlined violation in `AdvancedCharts.tsx` → import constants.ts | oscar | 0.5d | — |
| U-SFC-L4 | Fix `tryBusCapture()` hardwired `return true` (R12) | oscar | 1d | — |
| U-SFC-L5 | Lathe SFC mode in standalone (or dedicated route) — *deferrable to post-launch* | oscar/quebec | 5d | lathe actions |
| U-SFC-L6 | SFC entitlement gate + one-time license activation | quebec+papa | 1d | U-COMM-03/08 |
| U-SFC-L7 | E2E: calc round-trip through dispatcher + entitlement gate + render (R15 VALIDATE) | oscar | 1d | U-SFC-L1,L6 |

### 4.2 WAVE 1B — Single Post-Processor, owner: echo (backend) + quebec (frontend)
| ID | Title | Owner | Effort | Depends |
|----|-------|-------|--------|---------|
| U-PP-L1 | **Wire AlarmDB (2,588 alarms) into P5 safety gate** | echo | 1–2d | — (P0 SAFETY) |
| U-PP-L2 | Verify `prism_product:ppg_generate` is real (not stub) E2E; fix if stub | echo | 0.5d verify | — (P0) |
| U-PP-L3 | Integrate the 12 unmerged `slot/echo` commits (SafetyGate, Library, HURCO bridge) | echo | multi-day | slot/echo |
| U-PP-L4 | Add `pp_outcome_emit` to P6 (closed-loop) | echo | hrs | — |
| U-PP-L5 | Single-controller purchase + license key (one-time/controller) | quebec+papa | 1d | U-COMM-08 |
| U-PP-L6 | E2E: real JM NC program → pipeline → linted downloadable G-code, byte-validated (R15) | echo | 1d | U-PP-L1..L3 |
| U-PP-L7 | Verify `CpsPostParserEngine` corpus path `/prism/BOX/FUSION BASIC POSTS` | operator/echo | 0.5d | — |

### 4.3 WAVE 2 — Quoting, owner: charlie
| ID | Title | Owner | Effort | Depends |
|----|-------|-------|--------|---------|
| U-Q-L1 | Verify `/api/v1/cost` routes invoke real quoting stack (not stubs); wire frontend to 60+ dispatcher actions | charlie | 2–4w | — (P0) |
| U-Q-L2 | **Accuracy program** — extend coverage 40%→high, accumulate real (pred,actual) pairs, recalibrate to acceptable MAPE | charlie | 3–6mo | ERP creds |
| U-Q-L3 | Binary PDF export (jsPDF/react-pdf) for customer quotes | quebec | 1–2w | — |
| U-Q-L4 | Hard margin-floor gate in HTTP route (not advisory) | charlie | 1–2w | — |
| U-Q-L5 | Fix `VendorCostIndex` units-blending error (P2 gotcha #25) | charlie | 1w | — |
| U-Q-L6 | ERP credential unblock (E2/QuickBooks) for quote-vs-actual | operator+charlie | 1–2d | creds |

### 4.4 WAVE 3 — ERP, owner: hotel
| ID | Title | Owner | Effort | Depends |
|----|-------|-------|--------|---------|
| U-E-L1 | Verify depth of 17 ERP pages (stub vs real); fill stubs | hotel | unknown (verify first) | — |
| U-E-L2 | Implement `BusinessSyncEngine` (320-byte stub) | hotel | 2–3d | — |
| U-E-L3 | Multi-tenant isolation (if SaaS multi-tenant) — **operator decision** | hotel/papa | 1–2w | decision |
| U-E-L4 | E2E round-trip GL/payroll/scheduling (R15) | hotel | 2–3d | U-E-L1 |

### 4.5 LATER — Electron + Mobile (post-web-launch)
- **U-DESK-*:** Electron wrap (`MS-DESKTOP`, gated on MS-LEGAL/INFRA/PAY/CAM-MASTERY).
- **U-MOB-*:** Capacitor-6 wrap of the *same* Vite bundle → iOS + Android (single codebase per `web/CLAUDE.md` doctrine). Depends on web app mobile-responsive pass + iOS redesign doctrine.

### 4.6 Critical path to first revenue
`U-COMM-01 → U-COMM-02 → U-COMM-03 → U-COMM-08` (commercial spine) **∥** `U-SFC-L1→L2→L6→L7` (SFC) **∥** `U-PP-L1→L2→L3→L5→L6` (post). Launch bundle = **SFC + single post + subscription/one-time billing.** Quoting + ERP follow.

---

## 5. Pricing design (PROPOSAL — operator sign-off required)

> Grounded in PRISM's **existing** plan catalogs (reconciled to one) + market comparables: G-Wizard ~$79/yr, HSMAdvisor ~$200 one-time, Fusion 360 ~$680/yr, custom post-processors $1,500–3,000 each, Paperless Parts / ProShop ERP (enterprise). All numbers are starting points.

### 5.1 Canonical subscription tiers
| Tier | Monthly | Annual | Target shop | Included |
|------|---------|--------|-------------|----------|
| **Free** | $0 | $0 | lead-gen | SFC limited (e.g. 10 calcs/day), 1 saved config, no export |
| **SFC Pro** | $19 | $190 | single operator | Unlimited SFC, all physics modes, SLD/chatter, vendor tri-compare, calibration, PDF/export, 1 seat |
| **Post Pro** | $19 /controller | $190 /controller | per-machine | One generated+linted post per controller, updates, prove-out |
| **Shop** | $149 | $1,490 | small shop (≤5 seats) | SFC Pro (unlimited) + Post generator (≤5 controllers) + the 3 wizards + 5 users |
| **Shop Plus** | $349 | $3,490 | growing shop (≤15) | Shop + Quoting (on launch) + ERP suite + unlimited controllers + customer portal + closed-loop calibration |
| **Enterprise** | from $799 | custom | multi-site | Everything + multi-tenant + API access + SSO + on-prem option + unlimited users |

### 5.2 One-time purchases (operator-required)
| Product | One-time | Notes |
|---------|----------|-------|
| **SFC (perpetual)** | **$299** | 1 seat, perpetual license, 1 yr updates (+$49/yr after). Beats HSMAdvisor ($200) on features (vendor parity + SLD + calibration); positioned premium |
| **Single Post-Processor (perpetual)** | **$249 / controller** | 1 machine/controller, perpetual + $49/yr updates&support. vs $1,500–3,000 custom posts = aggressive value. Existing engine had $199; $249 reflects lint+safety+physics |
| **All-controllers bundle (perpetual)** | **$1,499** | replaces existing $2,499 `bundle_all`; or folded into Shop Plus |

*One-time buyers get a credit toward subscription if they upgrade (reduces churn-objection).*

### 5.3 Entitlement model (the operator's "what a shop allows users to pay for")
- **Plan-level** entitlement: tier defines the *ceiling* of features (TierLimits, already in `AuthEngineV7`).
- **Seat-level** entitlement: the **shop admin** grants/revokes each feature **per user** within the plan ceiling (e.g. allow user A SFC but not Quoting; cap user B's post-generation to 2/month). Enforced by `U-COMM-03` middleware + `U-COMM-05` admin UI.
- **Purchase control:** admin decides whether individual users may self-purchase add-ons/one-time products or only the admin can.
- **Enforcement is currently ABSENT** — `U-COMM-03` is the P0 that makes any of this real.

---

## 6. Adversarial critique / risks (R12)

1. **#1 launch risk — the commercial layer doesn't enforce anything.** Subscriptions are unsellable until `U-COMM-03` (entitlement) ships; today a free user can call every action. Plus a live **security P0**: webhook signature verification is commented out.
2. **"Files exist ≠ works."** Three UNVERIFIED claims gate the plan and MUST be E2E-validated before any launch date is firm: `prism_product:ppg_generate` (stub?), `/api/v1/cost` routes (stub?), ERP page depth (stubs?). Treat readiness scores as upper bounds until proven.
3. **Post-processor safety P0.** AlarmDB not in P5 → generated G-code could trip a controller alarm / crash. Non-negotiable before selling post output.
4. **Quoting is an accuracy problem, not a build problem.** 71.1% MAPE / ~10 real pairs. Do **not** sell quotes on this. Sequence quoting to Wave 2 behind an accuracy program — selling a 71%-error quote tool would be reputationally fatal.
5. **Pricing must track real launchability.** Don't list Quoting/ERP in a paid tier until they pass E2E + accuracy gates; otherwise the tier oversells. Shop Plus's Quoting/ERP inclusions activate **on those waves' launch**, not at billing launch.
6. **Scope honesty.** "Launch soon" = **SFC + single post**, not the full suite. That is the achievable, honest near-term product.

---

## 7. Operator decisions needed (blocking the build)
1. **Confirm launch sequence:** SFC + single post first; quoting/ERP deferred? (recommended)
2. **Sign off / adjust pricing numbers** in §5 (tiers, $299 SFC one-time, $249/controller post one-time).
3. **Single-tenant vs multi-tenant** SaaS? (drives U-E-L3 + data architecture.)
4. **Provision Stripe live keys** (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`) for U-COMM-07.
5. **U-LEGAL-13** (controller-manual copyright) — needed only for *multi-controller* Master Post, not the single-controller MVP. Defer?
6. **Verify** `/prism/BOX/FUSION BASIC POSTS` corpus path + ERP/quoting credentials.

---
_Generated by ultracode fan-out (5 verified assessment agents + orchestrator synthesis), slot:quebec, 2026-06-20. Findings cite file:line; readiness scores are evidence-based upper bounds pending the §6.2 E2E validations._
