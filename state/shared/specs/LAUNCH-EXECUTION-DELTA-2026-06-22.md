# PRISM Launch-Execution Delta v2 — 2026-06-22 (slot:quebec)

> **Supersedes** LAUNCH-EXECUTION-DELTA-2026-06-21.md on the items below (verified live against
> `cad-fusion-live-ms0` HEAD this session, R12). Pricing canonical stays
> PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md. Per-route rollout map stays
> LAUNCH-ROUTE-GATING-MAP-2026-06-21.md.
> **Operator directive (2026-06-22, /checkin-quebec):** complete SFC / post-gen / quoting / ERP
> *frontends* + pricing tiers; launch soon; everything subscription + one-time SFC ($299) + one-time
> single-post ($199). Use ultracode / ollama / obsidian / hermes / harnesses / loops / crons.

## 1. What shipped SINCE the 06-21 delta (verified via git log + live code)
| Item | Status | Evidence |
|---|---|---|
| Q6 entitlement **admin UI** (per-seat overrides) | **SHIPPED** | `cc19763d9f` + `7b518c49bf` (P1 fix); `components/admin/EntitlementsPanel.tsx`, `AdminPage.tsx`, `api/admin.ts`, tests |
| U-COMM-08 one-time **license keys** (activate/lookup) | **SHIPPED** | `b6945133c5` core + `95e9ae18c6` endpoints + docfix/p1fix |
| Entitlement **engine** (`requireTier` middleware + `tierGate.ts`/`attachUserPlan.ts`) | **BUILT** | `middleware/tierGate.ts` + `attachUserPlan.ts` (global) |
| FE entitlement **registry** (matrix + helpers) | **BUILT** | `web/src/data/pricing.ts` — `ENTITLEMENT_MATRIX`, `entitlementFor()`, `planIncludes()`, `FEATURE_NOT_YET_LIVE` |

**Net effect:** the #1 blocker named in the 06-21 delta ("no entitlement enforcement") is **engine-resolved**.
What remains is the **per-route GATING ROLLOUT** + the **FE 403→upgrade UX** that lets each gate land
without 403-ing live anonymous callers (route-gating-map sequencing rule).

## 2. Surface enumeration (verified, R12)
- **Web app**: live, 102+ pages/routes (`web/src/App.tsx`). Sellable surfaces: `/speed-feed-calc` (SfcCalculatorPage 390L), `/calculator` (full Studio 12.9kL), `/ppg` (PostProcessorGeneratorPage) + `/ppg-lite` (PpgPage), `/post-processor-store` (PostProcessorStorePage 279L), `/pricing` (public) + `/subscription`, ERP `/erp` + suite, quoting suite (`/quote-builder`, `/quoting-workbench`, `/blueprint-quote`, …).
- **Electron**: **ZERO** — no `web/electron/`, no electron dep. NEW shell needed (wraps the Vite build).
- **iOS/Android**: **~ZERO** — no `capacitor.config.*`, no `web/ios|android`, no `@capacitor` dep; only `useHaptics.ts` bridge scaffold (readiness 0.10). NEW Capacitor 6 wrapper needed.
- **One Vite build → all 3 form factors** (Electron + Capacitor wrap the same `dist/`); the finished pages render in every shell for free.

## 3. Sellable-product readiness (evidence-based, this session)
| Product | 06-21 | 06-22 | Gap to "sellable" |
|---|---|---|---|
| SFC (sub + one-time $299) | 0.45 | **0.45** | standalone page exposes only `/calculate`; 9-axis/stochastic/vendor/calibration unreached (rich `speedfeed.ts` client exists, unused on the standalone page); `AdvancedCharts.tsx` inlines Taylor (safety) |
| Single post ($199/ctrl) | 0.50 | **0.55** | store page ~80% (live plan, enterprise banner, monthly/annual/permanent, bundles, errors, canonical prices); MISSING owned-set + `/post-processor/success` page; AlarmDB-in-P5 still echo's |
| Commercial / entitlement | 0.40 | **0.60** | engine+admin+license-keys shipped; MISSING FE 403→upgrade UX (keystone) + per-route gating rollout |
| Quoting | 0.32 | 0.32 | FE pages real; Wave-2 blocked on ACCURACY (71% MAPE), not FE — charlie/quoting lane |
| ERP | 0.50 | 0.50 | 4/5 pages real+deep; `ErpDashboard` quick-link sub-pages unverified — hotel lane |
| Electron | 0.00 | 0.00 | new shell |
| Mobile | 0.10 | 0.10 | new Capacitor wrapper |

## 4. Quebec build queue (dependency-ordered — THIS session's /loop)
- **QX1 — Entitlement keystone (monetization-real).** `useEntitlement()` hook (fetch live plan via `billingApi.getBillingStatus`, module-cache; map plan→`ENTITLEMENT_MATRIX`) + `<FeatureGate feature=…>` + `<UpgradePrompt>` component (shows the tier that unlocks the feature + CTA to `/pricing`/portal) + a shared 403-interceptor. Pure quebec; **unblocks the fleet route-gating rollout** (each owner gates their route, quebec's gate UX catches the 403). Serves the operator's "what a shop allows users to pay for" ask.
- **QX2 — SFC advanced exposure.** Add an "Advanced (9-axis / UQ)" capability to `SfcCalculatorPage` via `speedfeed.ts` (`sfOrchestrate` + `sfStochastic`), surfacing uncertainty/advisory (oscar soul: never publish a speed/feed without uncertainty). Gate the advanced tabs behind `sfc.nine_axis`/`sfc.stochastic` via QX1.
- **QX3 — SFC Taylor de-inline (safety).** Route `AdvancedCharts.tsx` tool-life curve through backend `/sfc/tool-life` (canonical CANONICAL_TAYLOR); remove the inlined `TAYLOR` Record + client `Math.pow(C/v,1/n)`. Coordinate w/ oscar (U-SFC-L3) — FE file, quebec can land it.
- **QX4 — Post store finish.** owned-controllers set (display "Owned" instead of "Buy") + `/post-processor/success` confirmation page (reads checkout session / license key). Gate behind `post.generate` via QX1.
- **QX5 — Electron shell.** `web/electron/{main,preload}.ts` serving the Vite `dist/`; one app-wide shell (every page incl. SFC ships in it for free). Build script + dev script.
- **QX6 — Capacitor iOS/Android shell.** `@capacitor/core` + ios/android platforms wrapping `dist/`; safe-area + status-bar already partly scaffolded (`useHaptics.ts`).

## 5. Cross-slot (still open, posted to chat bus)
- **echo U-PP-L1 (P0 SAFETY):** AlarmDB (2,588 alarms) → post P5 gate. Blocks selling post G-code.
- **per-route gating (route-gating-map):** oscar (`speedfeed /orchestrate`,`/stochastic`), kilo (`cam /toolpath`,`/simulate`), echo/kilo (`/post-process`), mike (`edm`), charlie (quoting key), delta (cadcam key). Each lands WITH quebec's QX1 403-UX.
- **quoting accuracy (charlie):** 71% MAPE — Wave 2, do NOT sell quotes until it clears its gate (R12).

## 6. Pricing — CONFIRMED COMPLETE (no further FE work)
Canonical registry `web/src/data/pricing.ts` encodes spec §1–3: 5 subscription tiers ($0/29/79/199/499),
one-time SFC $299 + single-post $199/ctrl (+5-pack $799 / all $2,499), 19-feature entitlement matrix,
`creditOnUpgrade`. 14/14 `pricing.test.ts`. Operator-adjustable knobs in the spec §6.

---

## 7. Session continuation update (2026-06-22, slot:quebec)
**Shipped this continuation (verified, R12):**
- **QX7 -- PPG gate** (`0119ef872d`): /ppg + /ppg-lite gated behind `post.generate`.
- **QX8 -- feature-page gates** (`4ad0862e26`, U-Q-FEATURE-PAGE-GATES): /print-to-cnc -> `print_to_cnc`; /lathe{,/wizard,/results} -> `wizard.lathe`; /milling{...} -> `wizard.mill`; /wire-edm{...} -> `wizard.wedm`; /cam-strategy + /cam-ai-dashboard (inside secure(lead)) -> `cadcam`. Adversarially verified (2 sonnet lenses + synthesis) -- caught + corrected a self-contradiction (/wire-edm-studio has no matrix key -> LEFT OPEN). New `routeFeatureGates.test.ts` (5/5) binds App.tsx source to the matrix (fails on dropped gate / wrong key / over-gate of a free|not-yet-live|safety route). tsc clean; per-file 2-arm scrutiny PASS.

**Monetization conversion loop -- VERIFIED COMPLETE (no further FE work):** gated route -> `<UpgradePrompt>` -> /pricing -> `PricingPage.onSubscribe` (auth-check -> enterprise=mailto -> else `billingApi.createCheckout(plan)` -> `window.location.href=url` Stripe) -> /billing/success (`CheckoutOutcomePage`) -> `clearEntitlementCache()` -> entitlement refresh. `requestCore.ts` already classifies 401/403 + carries `code` (TIER_LIMIT/ENTITLEMENT_REVOKED) on ApiError; per-page handling (SfcGateNotice) is correct -- a global 403 auto-redirect would be bad UX. **Entitlement/pricing/gating/conversion track = DONE.**

**QX3 (SFC Taylor de-inline) -- oscar-blocked, CONFIRMED via source (R12).** `web/src/components/sfc/AdvancedCharts.tsx` inlines a `TAYLOR` Record (lines 26-33) + client `Math.pow(C/v,1/n)` (45, 176) on the UNGATED "Charts" tab (SurfaceFinishChart also inlines `Ra=f^2/(32r)`). A clean canonical de-inline needs a CURVE: `/api/v1/sfc/tool-life` (sfc.ts:73 -> prism_calc:tool_life) returns a SCALAR, and `SfcCalculateResult` carries no tool-life (only `meta`). **ASK -> oscar:** add a canonical `POST /api/v1/sfc/tool-life-curve` returning `{speed,life}[]` over a speed range from CANONICAL_TAYLOR (one call, canonical), then quebec swaps `ToolLifeChart` to consume it + deletes the inlined `TAYLOR`/Math.pow in one commit. Not landed unilaterally: AdvancedCharts.tsx is in oscar's ACTIVE SFC-launch lane (U-SFC-WIRING-AUDIT) -- a hasty physics-presentation edit underneath a live peer is a collision + safety risk.

**Deferred orphan-cleanup (non-launch):** `scripts/audit-intra-page-seams.mjs` + `state/shared/dashboards/INTRA-PAGE-SEAM-AUDIT.{json,md}` untracked since 2026-05-26 (stale FE dev-tooling audit). Not committed -- stale generated output; verify the script still runs before committing, low launch-ROI.

---
_slot:quebec 2026-06-22. Readiness scores are upper bounds pending live-Stripe + entitlement E2E. Build queue QX1→QX6 is logical/dependency order (R13)._
