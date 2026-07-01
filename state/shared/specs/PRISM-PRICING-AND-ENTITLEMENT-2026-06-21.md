# PRISM Canonical Pricing & Entitlement Spec — 2026-06-21

> **Author:** slot:quebec (frontend) · **Status:** CANONICAL DESIGN (resolves U-COMM-01 — "reconcile 3 plan catalogs → ONE registry").
> **Authority:** operator directive 2026-06-20 — *"make everything subscription but offer a logical price for one-time payment for the SFC and a single post processor."* Launch sequence (SFC + single post) and pricing **model** are DECIDED; exact dollar numbers below are anchored on the **already-tested code catalog** and are operator-adjustable (one place: §6 knobs).
> **Cross-slot contract:** this file is the SINGLE SOURCE OF TRUTH. The FE encodes it in `mcp-server/web/src/data/pricing.ts` (quebec, this session). The backend (papa/hotel) mirrors it into `StripeBillingEngine` + `BillingEngine` + `AuthEngineV7` + the entitlement middleware (U-COMM-01/03).

---

## 0. Why this exists (the conflict, R7)

Three catalogs disagree TODAY — verified file:line:

| Catalog | Plan IDs | "shop" price | "enterprise" price | Wired to |
|---|---|---|---|---|
| `AuthEngineV7.ts:20` | `free·starter·pro·shop·enterprise` | — (limits only) | — | **entitlement (TierLimits, 10 dims)** |
| `StripeBillingEngine.ts:47` | `free·starter·pro·shop·enterprise` | $199/mo | $499/mo | Stripe checkout |
| `BillingEngine.ts:61` | `free·shop·team·enterprise` | **$49/mo** | **$999/mo** | pure-logic state machine |

**Resolution (R7 — pick the load-bearing one, don't average):** canonicalize on the **`AuthEngineV7` plan IDs + `StripeBillingEngine` prices** — they share IDs, are Stripe-wired, and carry a contract-test "single source of truth" comment (`StripeBillingEngine.ts:44`). `BillingEngine`'s divergent `{shop $49, team $199, enterprise $999}` is **DEPRECATED** → mapped in §5. The entitlement keys come from `AuthEngineV7.TierLimits`.

---

## 1. Canonical subscription tiers (the 5 plan IDs — KEEP, do not rename)

Prices = `StripeBillingEngine.PLAN_PRICES` (cents → dollars). These are the tested numbers; the launch ships these.

| Plan ID | Name | Monthly | Annual (2 mo free) | Target buyer | Seats |
|---------|------|---------|--------------------|--------------|-------|
| `free` | Free | $0 | $0 | lead-gen / trial | 1 |
| `starter` | Starter (SFC Pro) | **$29** | **$290** | single operator | 1 |
| `pro` | Pro | **$79** | **$790** | power operator / 1 machine | 3 |
| `shop` | Shop | **$199** | **$1,990** | small shop | 10 |
| `enterprise` | Enterprise | **$499** | **$4,990** | multi-site | unlimited |

> Market anchors (sanity): G-Wizard ~$79/yr, HSMAdvisor ~$200 one-time, Fusion 360 ~$680/yr, Paperless Parts / ProShop = enterprise. Our $290/yr Starter ≈ G-Wizard but with 9-axis + SLD + vendor-parity + calibration the others lack.

---

## 2. One-time / perpetual purchases (operator-required)

The operator explicitly wants a logical one-time price for **the SFC** and **a single post-processor**. Grounded in `StripeBillingEngine.POST_PROCESSOR_PRICES`:

| Product | One-time | Source | Notes |
|---------|----------|--------|-------|
| **SFC (perpetual, 1 seat)** | **$299** | NEW (no code yet) | +$49/yr updates after yr 1. Beats HSMAdvisor $200 on features. **Requires `U-COMM-08` license keys.** |
| **Single Post-Processor (perpetual, 1 controller)** | **$199** | `StripeBillingEngine.ts:58` `permanent: 19900` | EXISTS in code. +$49/yr updates&support. vs $1,500–3,000 custom posts = aggressive value. |
| Post — 5-controller bundle | $799 | `StripeBillingEngine.ts:59` `bundle_5` | optional |
| Post — all-controllers bundle | $2,499 | `StripeBillingEngine.ts:60` `bundle_all` | optional; or fold into Enterprise |
| Post — monthly / annual per controller | $9 / $79 | `StripeBillingEngine.ts:56-57` | subscription alt to perpetual |

> One-time buyers get account credit toward a subscription upgrade (churn-objection killer). Lives as a `creditOnUpgrade` flag in the registry.

---

## 3. Per-FEATURE entitlement matrix (the operator's core ask)

> *"pricing tiers for each feature relative to what a shop might not want or allow users to pay for separate features."*
> Two enforcement layers: **PLAN ceiling** (the tier defines the max) + **SEAT grant** (the shop admin grants/revokes each feature per user within that ceiling). Enforced by `U-COMM-03` middleware + `U-COMM-05` admin UI. `✓`=included, `+`=add-on purchasable, `—`=not available, `N`=numeric limit.

| Feature | Entitlement key | free | starter | pro | shop | enterprise | One-time |
|---------|-----------------|------|---------|-----|------|-----------|----------|
| **SFC — basic calc** | `sfc.basic` | 10/day | ✓ | ✓ | ✓ | ✓ | ✓ (SFC perp) |
| SFC — 9-axis orchestrator | `sfc.nine_axis` | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| SFC — SLD / chatter | `sfc.sld` | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| SFC — vendor tri-compare | `sfc.vendor_parity` | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| SFC — calibration / closed-loop | `sfc.calibration` | — | — | ✓ | ✓ | ✓ | + |
| SFC — stochastic | `sfc.stochastic` (`TierLimits.stochastic`) | — | — | ✓ | ✓ | ✓ | + |
| SFC — export (PDF/CSV) | `sfc.export` | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Post-processor — generate+lint** | `post.generate` | — | + ($199 perp) | 1 ctrlr | ≤5 ctrlr | unlimited | ✓ (per ctrlr) |
| Post — safety gate (AlarmDB) | `post.safety` | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| Post — library / store | `post.library` | — | — | ✓ | ✓ | ✓ | + |
| **3 Wizards (mill/lathe/wedm)** | `wizard.*` | demo | — | ✓ | ✓ | ✓ | — |
| **Print → CNC program** | `print_to_cnc` | — | — | ✓ | ✓ | ✓ | — |
| **CAD/CAM AI** | `cadcam` | — | — | — | ✓ | ✓ | — |
| **Quoting** *(activates Wave 2)* | `quoting` | — | — | — | + | ✓ | — |
| **ERP suite** *(activates Wave 3)* | `erp` | — | — | — | + | ✓ | — |
| Simulation | `simulation` (`TierLimits`) | — | — | ✓ | ✓ | ✓ | — |
| API access | `api_access` (`TierLimits`) | — | — | — | — | ✓ | — |
| Max users | `max_users` (`TierLimits`) | 1 | 1 | 3 | 10 | -1 | 1 |
| Program-generate/day | `program_generate_per_day` | 0 | 0 | 5 | -1 | -1 | — |

> **Rule:** `quoting` and `erp` are sold but their tier inclusion **activates on their launch wave** (Wave 2 / Wave 3) — never billed as live before they pass their E2E + accuracy gates (R12). Until then they show "coming soon — included when released" on the pricing page.

---

## 4. Seat-level entitlement model (shop admin control)

The shop **admin** controls, per user, within the plan ceiling:
- **Grant/revoke** any `feature key` from §3 (e.g. user A gets SFC but not Quoting).
- **Cap** a numeric dimension per seat (e.g. user B max 2 post-generations/month).
- **Purchase control:** whether a user may self-buy add-ons/one-time products, or only the admin can.

Backed by: `U-COMM-03` middleware reads `getTierLimits(plan)` (`AuthEngineV7.ts:236`) ∩ per-seat overrides; `U-COMM-05` admin UI (quebec) writes the overrides. **Enforcement is currently ABSENT — this is the #1 launch blocker.**

---

## 5. Deprecated-catalog mapping (BillingEngine → canonical)

| BillingEngine (deprecated) | → Canonical | Action |
|---|---|---|
| `plan_shop_monthly` $49 | → no canonical $49 tier | RETIRE (was below `starter`); migrate any holders to `starter` $29 or `pro` $79 |
| `plan_team_monthly` $199 | → `shop` $199 | RENAME alias |
| `plan_enterprise` $999 | → `enterprise` $499 | **price conflict — canonical = $499** (operator may raise; see §6) |
| per-post metering tiers (`BillingEngine.ts:127`) | keep as **usage metering** (`U-COMM-06`) | orthogonal to plan price |

---

## 6. Operator-adjustable knobs (change here, propagates to FE registry + BE engines)

All numbers above are defaults anchored on tested code. To change, edit ONLY these and re-mirror:
1. Subscription prices (§1) — currently $0/$29/$79/$199/$499.
2. SFC one-time (§2) — currently **$299** (operator: "logical one-time for SFC").
3. Single-post one-time (§2) — currently **$199** (operator: "logical one-time for single post").
4. enterprise monthly — canonical $499 (BillingEngine had $999; pick one).
5. Annual discount — currently "2 months free" (annual = 10×monthly).
6. Feature→tier assignments (§3) — the entitlement matrix.

---

## 7. Implementation pointers (R15 wire→test→validate→all-galaxies)

- **FE (quebec, this session):** `mcp-server/web/src/data/pricing.ts` encodes §1–3; `PricingPage.tsx` renders it; checkout/sub-mgmt extends `src/api/billing.ts` (U-COMM-04); entitlement admin extends `AdminPage` (U-COMM-05).
- **BE (papa/hotel):** mirror §1–3 into a `mcp-server/src/config/pricing-registry.ts` that `StripeBillingEngine` + `BillingEngine` + `AuthEngineV7` import (U-COMM-01); entitlement middleware (U-COMM-03); license keys (U-COMM-08); webhook-sig fix (U-COMM-02).
- **TEST:** parity test asserts FE registry === BE registry === Stripe price IDs; entitlement E2E (free user blocked past §3 ceiling through the dispatcher).
- **VALIDATE:** live Stripe test-mode checkout for `starter` + a one-time SFC license issuance.

---
_slot:quebec 2026-06-21. Supersedes the §5 pricing proposal in PRODUCT-LAUNCH-COMPLETION-PLAN-2026-06-20.md (this is the canonical, code-grounded version). Numbers cite file:line; deltas to code are flagged NEW._
