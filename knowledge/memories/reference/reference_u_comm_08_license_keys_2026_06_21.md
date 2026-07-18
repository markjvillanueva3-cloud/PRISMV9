---
name: reference_u_comm_08_license_keys_2026_06_21
description: U-COMM-08 one-time perpetual license-key CORE shipped (LicenseStore + grant-above wiring) + the prod-secret + silent-downgrade P1 lessons
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.235Z
aliases: reference_u_comm_08_license_keys_2026_06_21
---


**U-COMM-08 CORE -- one-time perpetual license keys SHIPPED (2026-06-21, slot:quebec for papa).**

The non-subscription "buy it once" layer (operator: "a logical price for one time payment for the sfc and a single post processor"). Continues the commercial-layer launch build ([[reference_comm_layer_backend_shipped_2026_06_21]] · [[reference_q6_entitlement_admin_ui_2026_06_21]]).

Commits (cad-fusion-live-ms0):
- `b6945133c5` -- core: `engines/LicenseStore.ts` (HMAC-signed `PRISM-<ABBR>-<rand>-<sig>` keys; fail-loud-on-corrupt store mirroring SubscriptionStore; issue/activate/revoke/grantedFeatures/hasPostLicense) + `config/pricing-registry.ts` `ONE_TIME_PRODUCTS` (sfc_perpetual $299 -> blanket `speed_feed`; post_perpetual $199 -> controller-scoped) + GRANT-ABOVE wiring: `attachUserPlan` sets `req.user.licenses=grantedFeatures(userId)`, `requireTier` grants on membership AFTER admin-deny / BEFORE plan-check.
- `226130bc46` -- scrutiny arm-B/C P1 fixes (below).
- `09071d3b34` -- P2 doc fix (stale post_single JSDoc).
- 3-of-3 PASS (A+B+C). 57/57 tests.

**Grant model (the key design):** a perpetual license grants a GATED feature ABOVE the plan ceiling. Ordering in `requireTier`: **admin-deny (override=false) > perpetual-license grant > plan check**. Controller-scoped post grants are NOT blanket -- `post_perpetual` has `feature:null` so it never enters `grantedFeatures`/`req.user.licenses` (which would over-grant ALL program output); it's checked per-controller via `hasPostLicense(userId, controller)` at the post route (consumer not yet wired -- next unit).

**P1 lessons (both caught by scrutiny FAIL -> fixed -> re-verify PASS):**
1. **A module-load singleton must never mint security tokens under a source-derivable dev-fallback secret in production.** `licenseStore = new LicenseStore()` resolves the signing secret at import; with `PRISM_LICENSE_SIGNING_SECRET` unset it used a dev fallback whose value is IN THE SOURCE -> real paid keys would be trivially forgeable. FIX: `generateKey` throws when `usingDevFallback && NODE_ENV==='production'` (single mint chokepoint; `issue()` flows through it). **Why:** a warn is missable; the dangerous op (minting) must hard-refuse. **How to apply:** any signed-token/license/JWT engine -- gate minting on a real operator-provisioned secret in prod; dev fallback is test-only and must be unreachable for the live singleton in prod.
2. **A fail-safe `catch{}` on a request hot path must LOG -- a silent downgrade of a paying user is invisible breakage.** `attachUserPlan`'s bare catch defaulted every user to free+no-entitlements on a corrupt store with zero signal, and the comment FALSELY claimed "corruption surfaces via its own logging path" (the stores don't self-log). FIX: `console.error` the swallowed error + corrected the comment (R12). **How to apply:** a fail-open catch that degrades entitlement/auth/billing state must emit an observable signal, and never claim a logging path that doesn't exist.

**P2s also fixed:** FE/BE one-time product-id **drift** (`post_single` -> `post_perpetual` to match `web/src/data/pricing.ts`; a one-time checkout POSTing the FE id would have been rejected by `isOneTimeProduct` in the webhook unit) + a new FE/BE ONE_TIME parity assertion; 48-bit HMAC truncation widened to 128-bit (honest "offline-verifiable").

**U-COMM-08b ENDPOINTS SHIPPED (`95e9ae18c6`, 3-of-3 PASS):** `POST /billing/license/activate` (verifyToken) + `GET /billing/licenses` (verifyToken) + `POST /billing/license/issue` (verifyToken+admin) -- pure store-injectable ops `activate/list/issueLicenseOp` in `routes/billing.ts` (mirror `applyWebhookToStore`), HTTP error-code mapping (INVALID_KEY/UNKNOWN_KEY/ALREADY_ACTIVATED=409/REVOKED/MISSING_FIELD/UNAUTHENTICATED/ISSUE_FAILED). +14 op tests, 72/72 green. This closes the "issue/activate not called by any route" gap. The admin-issue + activate path is now a COMPLETE usable feature: operator comps a key -> user activates -> `attachUserPlan.grantedFeatures` -> `tierGate` grant goes live. Also ASCII-cleaned 10 pre-existing em-dashes in billing.ts (the ascii-guard scans the whole file on edit, so pre-existing non-ASCII blocks new edits -- fix all, not just yours).

**Remaining (NEXT):** (1) **FE wiring** -- add `activateLicense`/`listLicenses` to `web/src/api/billing.ts` (FE has none) + wire the Q3 activation UI to call them. (2) Stripe webhook one-time issuance -- `handleWebhookEvent` emits `subscription_created` for EVERY `checkout.session.completed` regardless of mode; needs a `mode==="payment"` branch -> `licenseStore.issue` (ties to live Stripe = U-COMM-07). (3) wire `hasPostLicense` into the post-generation route (echo galaxy). Deferred P2s (logged, NOT fixed): error-code via message-regex (-> typed LicenseStore errors); `tierGate.TIER_LIMITS` duplicate literal of `pricing-registry.PLAN_LIMITS` (test-guarded, no live drift). `U-COMM-07` = operator provisions live `PRISM_LICENSE_SIGNING_SECRET` + Stripe keys (operator-only).
