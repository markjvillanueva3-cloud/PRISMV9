# PRISM LAUNCH-READINESS v3 — verified live (2026-06-22, slot:quebec)

> **Supersedes** LAUNCH-EXECUTION-DELTA-2026-06-22.md (v2) — that doc is stale on
> multiple items (it listed QX3 Taylor de-inline and QX4b owned-controllers as
> pending and Electron/Capacitor as ZERO; all are in fact SHIPPED/scaffolded). This v3
> is verified against `cad-fusion-live-ms0` HEAD by reading the live code (R12), not
> the plan docs.
> **Pricing canonical** stays `PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md` (unchanged, complete).
> **Operator directive (2026-06-22 /checkin-quebec):** complete SFC / post-gen / quoting / ERP
> frontends + pricing tiers; launch soon; subscription + one-time SFC $299 + one-time single-post $199.

---

## 0. Headline (the honest reorientation)

The **frontend commercial spine is essentially complete.** 157 pages live (up from 102).
Almost every item in the prior session's QX1–QX8 + QX3 + QX4b queue has **already shipped**.
The "should be much further along" gap the operator perceived is **NOT missing frontend** — it is
(a) two cross-slot **backend gates** (post-G-code safety, quoting accuracy) and (b) two **app-shell
activations** (Electron deps, Capacitor native platforms). The web app is **launch-capable today**
for the wave-1 SFC products.

## 1. Executive go / no-go

**GO — web-first, wave-1 = SFC (subscription + one-time $299).** SFC is the cleanest sellable: page
exposes basic + 9-axis (gated), Taylor de-inlined to the backend curve (safety-clean), pricing +
entitlement + Stripe conversion loop all shipped. **Sellable today.**

**CONDITIONAL — single post-processor ($199/ctrl).** Store/checkout/ownership/success all shipped, BUT
selling generated G-code requires the **post safety gate (echo U-PP-L1, AlarmDB→P5)** — do NOT sell post
output until that lands (R12). Selling the *post product* (a controller dialect) is fine; selling
*generated programs* needs the gate.

**HOLD — quoting (wave-2) + ERP (wave-3).** FE is deep (10 quoting + 29 ERP pages) but quoting is
accuracy-blocked (71% MAPE, charlie) and must not be sold as authoritative; ERP depth is hotel's lane.

Hard blockers, by ownership:
- **CROSS-SLOT (launch-gating):** post-G-code safety gate (echo); live-Stripe + entitlement E2E (papa).
- **QUEBEC-FE (not launch-gating, channel work):** Electron deps+scripts; Capacitor deps+platforms.
- **CROSS-SLOT (wave-2/3, not wave-1):** quoting accuracy (charlie); ERP page depth (hotel).

## 2. Per-product readiness (verified live, file:line)

| Product | v2 doc | **v3 verified** | Sellable today? | Hard blocker | Owner |
|---|---|---|---|---|---|
| **SFC** (sub + $299) | 0.45 | **0.85** | **YES** (web) | basic+9ax live+gated; advanced features have entitlement gaps — see `SFC-ENTITLEMENT-FINDINGS-2026-06-22.md` (sld leaks free on /vibration; vendor_parity unimplemented) | quebec |
| **Pricing/Entitlement** | 0.60 | **0.95** | n/a (enabler) | live-Stripe E2E (papa) | quebec ✓ / papa |
| **Single post** ($199) | 0.55 | **0.75** | dialect: yes; G-code: NO | post P5 safety gate (AlarmDB) | echo |
| **Quoting** (wave-2) | 0.32 | **0.55** (FE deep) | NO (accuracy) | 71% MAPE | charlie |
| **ERP** (wave-3) | 0.50 | **0.55** | partial | page-depth audit | hotel |
| **Desktop (Electron)** | 0.00 | **0.90** | dev-runnable | deps+scripts SHIPPED (this session); only visual launch-test + signing remain | quebec ✓ |
| **Mobile (Capacitor)** | 0.10 | **0.60** | not yet | deps+config+scripts SHIPPED; `npx cap add ios/android` needs Xcode/Android SDK | quebec + native |

### What is verified SHIPPED (do NOT re-build)
- **Pricing/entitlement:** `web/src/data/pricing.ts` (5 tiers $0/29/79/199/499 + one-time SFC $299 +
  single-post $199 + bundles $799/$2499 + 19-feature `ENTITLEMENT_MATRIX`), `PricingPage`,
  `SubscriptionPage`, entitlement keystone (`lib/entitlement.ts`, `hooks/useEntitlement.ts`,
  `components/entitlement/{FeatureGate,UpgradePrompt}`), admin UI (`EntitlementsPanel`), license keys
  (U-COMM-08), `requireTier` middleware. Conversion loop gated→UpgradePrompt→/pricing→Stripe→success→cache-clear **verified complete**.
- **SFC:** `SfcCalculatorPage` standalone + gated "9-Axis" tab (`AdvancedSpeedFeedPanel.tsx`, QX2);
  Taylor de-inlined → `lib/toolLifeCurve.ts` backend curve (QX3, commit `2ec4e1e904`) — **no inline physics**.
- **Post store:** `PostProcessorStorePage` with `billingApi.getLicenses()` + `computePostOwnership`/`ownsController`
  → "Owned"/"Included" not "Buy" (QX4b done); `CheckoutOutcomePage` success/cancel routes (QX4); bundle→sales-mailto (correct-price guard).
- **Route gating:** PPG (QX7), wizards/print-to-cnc/cadcam/SFC-9ax (QX8) all gated to the matrix; `routeFeatureGates.test.ts` binds App.tsx to the matrix.
- **Electron:** `electron/main.cjs` + `preload.cjs` (secure: contextIsolation, sandbox, no node) + **HashRouter-when-desktop already solved** (`lib/desktopRouter.ts` + `desktopRouter.test.ts` + `main.tsx selectRouter()`).
- **Capacitor:** `capacitor.config.json` (appId tools.prism.app, webDir dist) + `useHaptics.ts` bridge.

## 3. Remaining quebec-FE build queue (genuinely incomplete — dependency order)

1. **QX5 — Electron activation. ✅ SHIPPED (this session).** `electron@31`+`electron-builder@25` installed;
   `electron:start`/`electron:dev`/`electron:build` scripts wired; HashRouter-when-desktop already done.
   Security posture + config regression-guarded by `src/__tests__/appShell.test.ts` (13 tests). Remaining:
   visual launch-test (needs a display) + signing for distribution — operator/native, not headless.
2. **QX6 — Capacitor activation (pure-code portion). ✅ SHIPPED (this session).** Capacitor 6.2.1 installed
   (`@capacitor/core`+`@capacitor/android`+`@capacitor/ios` deps, `@capacitor/cli` devDep);
   `cap:copy`/`cap:sync`/`mobile:add:android`/`mobile:add:ios` scripts wired. Remaining native step:
   `npx cap add ios|android` (needs Xcode / Android SDK — run on a Mac / Android-SDK box).
3. **SFC advanced-feature entitlement fixes** (NOT a simple "studio port" — that premise was verified FALSE
   2026-06-22; the panels don't exist in the studio). The real work is in `SFC-ENTITLEMENT-FINDINGS-2026-06-22.md`:
   F4 gate the pricing matrix cells through `isNotYetLive` (quoting/erp show "Included" + "coming soon" today —
   contradiction); F2 gate the ungated `/vibration` page to `sfc.sld` (a paid feature leaking free); F1 build or
   coherently-gate `sfc.vendor_parity` (unimplemented but advertised + granted by the $299 perpetual);
   F3 (oscar) confirm `/speed-feed` `calibration_overrides` effect; F5 stochastic policy. F2+F4 are the two to
   do before the public pricing page ships.
4. **Per-route 403→upgrade UX rollout.** Keystone done; as each backend owner gates their route, confirm
   the FE 403 path renders `<UpgradePrompt>` (per-page, not global redirect). Coordination, not net-new.

## 4. Cross-slot asks (launch-gating first)

| Slot | Ask | Why it gates |
|---|---|---|
| **echo** | U-PP-L1: wire AlarmDB (2,588 alarms) → post pipeline **P5 safety gate** | Can't sell generated G-code without it (safety) — **wave-1 blocker** |
| **papa** | Live-Stripe test-mode E2E + entitlement-enforcement E2E (free user blocked past ceiling through the dispatcher) | Proves subscriptions are actually enforceable — **wave-1 blocker** |
| **charlie** | Quoting accuracy: drive 71% MAPE under the sell-gate threshold | wave-2 gate |
| **hotel** | ERP page-depth audit (which of 29 pages are real+deep vs shallow) | wave-3 readiness |
| **oscar** | Confirm SFC backend route gates (`/orchestrate`,`/stochastic`) align with the matrix | hardens SFC sell |

## 5. Pricing confirmation (operator re-ask)

**COMPLETE and consistent.** The canonical spec (`PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md`) is encoded
in `web/src/data/pricing.ts`, anchored on the tested `StripeBillingEngine` catalog: subscription
$0/$29/$79/$199/$499 (annual = 10×monthly), one-time **SFC $299**, one-time **single post $199/ctrl**
(+5-pack $799 / all $2,499), 19-feature entitlement matrix with the per-seat "shop admin controls what
each user may use/buy" model. `creditOnUpgrade` killer for one-time→subscription churn. 14/14 pricing.test.ts.
Subscription **price/tier model** is complete + consistent; only a BE parity assertion (FE registry === Stripe
price IDs) remains (papa's lane). **BUT** a 3-of-3 scrutiny on 2026-06-22 found per-feature entitlement
honesty gaps (an attempt to gate "unimplemented" SFC features as not-yet-live was REVERTED — premise was
under-verified + broke tests). The real, verified gaps are in `SFC-ENTITLEMENT-FINDINGS-2026-06-22.md` (F1-F5):
the matrix advertises `sfc.vendor_parity` (genuinely unimplemented) + grants it in the $299 perpetual; the
pricing matrix shows "Included" green-checks for not-yet-live quoting/erp; and `/vibration` leaks `sfc.sld` free.
**F2 (gate the free leak) + F4 (matrix coming-soon display) should land before the public pricing page goes live.**

## 6. Recommended launch sequence

- **Wave 1 (sell NOW, web):** SFC subscription (Starter $29 / Pro $79 / Shop $199 / Enterprise $499) +
  one-time SFC $299. Gate: papa live-Stripe E2E. → then single post $199 once echo's P5 safety gate lands.
- **Wave 2 (quoting):** unlock `quoting` entitlement when charlie's accuracy clears the sell-gate. FE ready.
- **Wave 3 (ERP):** unlock `erp` entitlement after hotel's depth audit. FE ready.
- **Channels (after web wave-1):** Desktop (Electron — quebec activation + `npm i`); Mobile (Capacitor —
  quebec scripts + native `cap add` on a Mac/Android-SDK box). The same `dist/` ships to all three shells.

---
_slot:quebec 2026-06-22. Readiness scores are verified upper bounds pending live-Stripe + entitlement E2E.
The FE is not the bottleneck — the two backend gates (echo post-safety, papa Stripe-E2E) are._
