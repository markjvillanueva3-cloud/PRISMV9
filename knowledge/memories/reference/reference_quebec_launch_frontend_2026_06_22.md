---
name: reference_quebec_launch_frontend_2026_06_22
description: Quebec shipped 4 launch-critical frontend commits 2026-06-22 (entitlement gating keystone, SFC 9-axis exposure, post-payment-404 fix) + verified the backend contracts for the remaining QX3/QX4b/QX5/QX6 queue.
type: reference
slot: quebec
galaxy: frontend-app
source: prism-memory
synced: 2026-06-27T20:30:47.139Z
aliases: reference_quebec_launch_frontend_2026_06_22
---


# Quebec launch-frontend session (2026-06-22, slot:quebec)

Operator /checkin-quebec /goal /loop: assess all frontends + roadmaps, complete SFC/post/quoting/ERP
frontends + pricing tiers for launch. Plan doc: `state/shared/specs/LAUNCH-EXECUTION-DELTA-2026-06-22.md`
(supersedes the 06-21 delta). Pricing canonical = `PRISM-PRICING-AND-ENTITLEMENT-2026-06-21.md` (UNCHANGED, complete).

## Verified state corrections (vs the stale 06-21 delta)
- **Q6 entitlement admin UI + U-COMM-08 license keys = SHIPPED** (cc19763d9f, b6945133c5). The "no entitlement
  enforcement" #1 blocker is engine-resolved; what remained was the FE 403/upgrade UX + per-route rollout.
- Web app live (102+ pages). **Electron = ZERO**, **iOS/Android = ~ZERO** (only useHaptics Capacitor scaffold).
- `requireTier` wired on only 1 route (sfc.ts /calculate); other paid routes ungated (per LAUNCH-ROUTE-GATING-MAP-2026-06-21).

## SHIPPED this session (4 commits, all on cad-fusion-live-ms0, [MAIN-FORCE]; each 2-arm per-file scrutiny PASS; session 3-of-3 PASS)
- **a6977bc839 QX1 entitlement keystone**: `web/src/lib/entitlement.ts` (pure: resolvePlan deny-by-default, canUseFeature=matrix AND not-yet-live, requiredPlanFor, isEntitlementError(403)/isAuthRequiredError(401)) + `hooks/useEntitlement.ts` (live plan via billingApi.getBillingStatus, module-cached, deny-on-error) + `components/entitlement/{FeatureGate,UpgradePrompt,index}` (barrel = single import surface). 24 tests. The reusable monetization gate.
- **18d1e2d15f QX2 SFC 9-axis exposure**: `components/sfc/AdvancedSpeedFeedPanel.tsx` (reuses page selections -> sfOrchestrate -> the PROVEN `normalizeCalculatorSpeedFeedResult`+`classifyCalculatorResultSafetyPosture` from `utils/calculatorSpeedFeedContract.ts`; always shows release posture+confidence+limiting factors = oscar uncertainty soul) + `advancedSpeedFeedParams.ts` mapper + new gated "9-Axis" tab in `SfcCalculatorPage` (`<FeatureGate feature="sfc.nine_axis">`). 13 tests.
- **4d7441540e QX4 post-payment-404 fix**: `pages/CheckoutOutcomePage.tsx` + 3 top-level routes in App.tsx (`billing/success`, `billing/cancel`, `post-processor/success` -- previously a paid user hit a 404; Stripe URLs at StripeBillingEngine.ts:282/283/346). Success clears entitlement cache. 5 tests.
- **a48c29bb53 coolant alias** (3-of-3 P2 fix): ParameterPanel emits `mql`/`air_blast` -> mapper now aliases mql->MQL, air_blast->dry.

## REMAINING quebec queue (verified contracts -- build next, dependency order)
- **QX4b owned-controllers display** (post store): `GET /api/v1/billing/licenses` (U-COMM-08b, real) returns `{licenses:[{product,feature,scope,status}],count}`. `post_perpetual.scope`=controller id; `post_bundle_all`=all; enterprise plan=all (already handled). Add `billingApi.getLicenses()` + mark owned controllers "Owned" not "Buy" in `PostProcessorStorePage`.
- **QX3 SFC Taylor de-inline (safety)**: `components/sfc/AdvancedCharts.tsx` inlines a TAYLOR Record + client `Math.pow(C/v,1/n)` -- route tool-life through backend `/sfc/tool-life` (CHECK its response shape first). oscar's U-SFC-L3 lane; FE file, quebec can land.
- **QX5 Electron shell**: new `web/electron/{main,preload}` serving the Vite dist + build/dev scripts. One app-wide shell (every page incl SFC ships in it).
- **QX6 Capacitor iOS/Android**: `@capacitor/core` + ios/android platforms wrapping dist.
- **per-route gating FE 403 UX**: the QX1 keystone + route-gating-map enable the fleet rollout; each owner gates their route, quebec wires the FE 403->upgrade.

## Lane mechanics (quebec)
slot/quebec worktree DORMANT; fleet commits [MAIN-FORCE] on cad-fusion-live-ms0. Commit path:
`PRISM_GIT_ADD_LANE_DISABLE=1 git add <files> && git commit` (one bash call). web tests: `cd mcp-server/web && npx vitest run <file>`; typecheck `npx tsc --noEmit`. ASCII-only in code (em dash blocked by ascii-guard).
Shared app issue (NOT mine, fleet-wide): `bg-primary-*` is an undefined Tailwind token (Button.tsx + ~32 files) -- use shared `<Button>` to stay consistent; queue a `primary` token fix separately.

Related: [[reference_quebec_commercial_spine_2026_06_21]] · [[reference_sfc_frontend_exposure_build_2026_06_20]] · [[reference_product_launch_plan_2026_06_20]] · [[feedback_verify_actual_contract_not_proxy]].
