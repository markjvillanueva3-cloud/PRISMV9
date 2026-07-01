---
name: reference_u_comm_05_entitlement_overrides_2026_06_21
description: "U-COMM-05 shipped - per-seat entitlement overrides (EntitlementOverrideStore + admin endpoints + requireTier deny wiring), unblocking quebec Q6. Scrutiny caught a feature-namespace-drift P1. Includes the FE->backend feature-key gap that Q6 must bridge."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.234Z
aliases: reference_u_comm_05_entitlement_overrides_2026_06_21
---


# U-COMM-05 per-seat entitlement overrides SHIPPED (2026-06-21, slot:quebec for papa)

Commits: cfe2f2ef36 (core) + 0f0eb4c06e (scrutiny P1 fix). 3-of-3 PASS. Continues the commercial-layer build (see [[reference_comm_layer_backend_shipped_2026_06_21]]).

## What shipped
- **EntitlementOverrideStore** engine (`mcp-server/src/engines/EntitlementOverrideStore.ts`): per-user per-feature override map. Semantics: an override can only RESTRICT below the plan ceiling (granted=false denies; true clears; never grants above plan). In-memory + lazy sync load + fail-loud-on-corrupt (mirrors SubscriptionStore). Persists to `data/state/entitlement-overrides.json`.
- **attachUserPlan** loads `req.user.overrides`; **requireTier** denies BEFORE the plan check when `overrides[feature]===false` -> 403 ENTITLEMENT_REVOKED. Override=true never grants above plan (TIER_LIMIT still applies).
- **Admin endpoints** (admin-gated by `router.use(verifyToken)+requireRole("admin")` in createAdminRouter): `GET /entitlements` (all users plan+overrides for Q6 UI), `GET /entitlements/:userId`, `POST /entitlements {userId,feature,granted}`, `POST /users/plan {userId,plan,status?}`. Added `SubscriptionStore.listUserIds()`.
- 39/39 entitlement tests green; tsc-clean.

## Scrutiny P1 caught + fixed (0f0eb4c06e) -- FEATURE-NAMESPACE DRIFT (important for Q6)
`requireTier` enforces backend **GatedFeature** keys: `speed_feed, program_generate, simulation, dfm, stochastic, api_access, print_to_program, edm_program, laser_program, waterjet_program` (the 10 keys in `GATED_FEATURES`, exported from tierGate.ts).
The FE product **FeatureKey** namespace (`web/src/data/pricing.ts`) is richer: `sfc.basic, sfc.nine_axis, sfc.sld, sfc.vendor_parity, sfc.calibration, sfc.stochastic, sfc.export, post.generate, post.safety, post.library, wizard.mill, wizard.lathe, wizard.wedm, print_to_cnc, cadcam, quoting, erp, simulation, api_access`.
They overlap at only ~2 keys (simulation, api_access). So revoking a product key like `quoting` would store an override NOTHING enforces -> silent no-op (R12 honesty gap). Fix: `POST /entitlements` now 400s `UNENFORCEABLE_FEATURE` on any feature not in GATED_FEATURES (`isGatedFeature`).

## CRITICAL for quebec Q6 (the FE admin UI, next unit)
Q6 must send BACKEND GatedFeature keys to `POST /entitlements`, not the FE FeatureKey display names -- or the endpoint 400s. To make the RICH product features (sfc.nine_axis, quoting, cadcam, wizard.*) per-seat-revokable, their routes must be wired with `requireTier("<key>")` AND those keys added to GATED_FEATURES + checkTierAccess. That route-gating is a follow-up beyond U-COMM-05 (most product-feature routes are not yet tier-gated; only sfc/calculate has requireTier today). So Q6 v1 can only meaningfully toggle: speed_feed, simulation, api_access (the live-gated ones). Build Q6 against GATED_FEATURES; show the richer matrix as read-only "plan includes" until the routes are gated.

## Remaining commercial-layer (specced: state/shared/specs/U-COMM-BACKEND-IMPL-SPEC-2026-06-21.md)
- U-COMM-08 license keys (one-time SFC + single-post). U-COMM-07 operator provisions Stripe live keys. P2: subscription_updated planId->Plan map (needs live price IDs). Gate-more-routes-with-requireTier (so product features are enforceable) = the prerequisite for a fully-functional Q6.
