---
name: reference_post_bundle_pricing_bug_2026_06_22
description: LAUNCH revenue bug -- post-processor bundle purchases (5-pack/all-20) are charged the single-controller $199 perpetual rate, NOT $799/$2499. Found by quebec QX4b scrutiny 2026-06-22; owner echo/papa (StripeBillingEngine checkout path).
type: reference
slot: quebec
galaxy: post-processor
source: prism-memory
synced: 2026-06-27T20:30:46.729Z
aliases: reference_post_bundle_pricing_bug_2026_06_22
---


# Post-processor bundle pricing revenue bug (found 2026-06-22, quebec QX4b scrutiny)

**Symptom (launch revenue bug):** the Post-Processor Store bundle buttons charge the WRONG price.
`PostProcessorStorePage.handleBundle` sends `controller: "bundle-5pack"` / `"bundle-all20"` (a literal
controller id) to `POST /api/v1/billing/purchase-post` with `type: "permanent"`. The backend
`StripeBillingEngine.createPostPurchaseCheckout` treats that as a plain single controller and prices it
at the per-controller permanent rate (**$199**), because `calculatePostProcessorPrice` only reaches the
bundle tiers (**$799** 5-pack / **$2,499** all) via a `quantity >= 5 / >= 20` path -- never via these
synthetic ids. So a customer buying the all-controllers bundle pays $199 for all 20.

**Owner:** echo (post-processor) / papa (commercial backend). NOT quebec's lane to fix (backend checkout
pricing + LicenseStore bundle issuance). Quebec's FE display (QX4b owned-controllers) is correct and
unaffected -- this is the PURCHASE path.

**Related backend gap (same area):** the backend mints NO bundle licenses yet (`LicenseStore` issues only
`sfc_perpetual`/`post_perpetual`; `post_bundle_*` deferred BE-side per `pricing-registry.test.ts`), and
`applyWebhookToStore` has no `post_processor_purchased` case -- so post purchases issue no license on
fulfillment at all today. The FE owned-display (`computePostOwnership`) is forward-compat-ready for when
BE emits `product: "post_bundle_all"`.

**Fix unit (echo/papa):** route bundle purchases through a bundle-aware checkout (pass quantity or a bundle
product id the engine prices at the bundle tier) + wire `post_processor_purchased` webhook -> LicenseStore.issue
with the right `product` (post_perpetual scope=controller, or a new bundle record). Then FE owned-display lights up.

Surfaced in commit 07c1b5fcc5 (QX4b). Sibling: QX3 SFC Taylor de-inline is oscar-blocked (needs a backend
tool-life-CURVE endpoint; /sfc/tool-life returns a scalar only). See [[reference_quebec_launch_frontend_2026_06_22]].

## FE MITIGATION SHIPPED (2026-06-22, quebec QX10 -- commit 19f251fa98)
The FE no longer OFFERS the mispriced self-serve purchase. `PostProcessorStorePage.handleBundle` now
routes bundle interest to **sales at the correct price** via the tested `bundleSalesMailto()` helper
(`mcp-server/web/src/lib/checkout.ts`) -- a `mailto:sales@prism.tools` carrying the bundle name + the
canonical `ONE_TIME_PRODUCTS.post_bundle_{5,all}` price ($799 / $2,499) -- mirroring the enterprise
contact-sales pattern, plus a UI caption. `purchasePost` is no longer called with a synthetic
`bundle-5pack`/`bundle-all20` id, so **no customer can be mis-charged $199 for a bundle**. `checkout.test`
10/10 (incl. a regression guard that the quoted bundle price != the $199 single). The BACKEND gap is
UNCHANGED and still echo/papa's: when bundle-aware self-serve checkout + the `post_processor_purchased`
webhook -> `LicenseStore.issue` land, swap `bundleSalesMailto` for a real `createBundleCheckout` call.
