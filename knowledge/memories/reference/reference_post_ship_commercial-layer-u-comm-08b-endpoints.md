---
name: reference_post_ship_commercial-layer-u-comm-08b-endpoints
description: Auto-distilled learnings from shipping COMMERCIAL-LAYER/U-COMM-08B-ENDPOINTS (commit 95e9ae18c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.813Z
aliases: reference_post_ship_commercial-layer-u-comm-08b-endpoints
---


# COMMERCIAL-LAYER/U-COMM-08B-ENDPOINTS

[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08B-ENDPOINTS (slot:quebec, for papa): one-time license activate/list/issue endpoints -- POST /billing/license/activate (verifyToken) + GET /billing/licenses (verifyToken) + POST /billing/license/issue (verifyToken+admin) wiring LicenseStore.activate/getUserLicenses/issue into routes (closes the issue/activate-not-called-by-any-route gap arm A flagged). Pure store-injectable ops activate/list/issueLicenseOp mirroring applyWebhookToStore, with HTTP error-code mapping (INVALID_KEY/UNKNOWN_KEY/ALREADY_ACTIVATED 409/REVOKED/MISSING_FIELD/UNAUTHENTICATED). +14 op tests incl the activate->grant live path; 72/72 license+entitlement+webhook+pricing green, tsc clean. ASCII-cleaned 10 pre-existing em-dashes in the file header/comments. Webhook one-time issuance deferred: handleWebhookEvent emits subscription_created for every checkout.session.completed regardless of mode -- a mode=payment branch is U-COMM-07 (live Stripe). NEXT: FE billing.ts activate/list methods + wire the Q3 activation UI.

**Shipped:** 2026-06-21T22:16:11-05:00 by markjvillanueva3-cloud
**Files:** 3 touched

Full distillation: [[commercial-layer-u-comm-08b-endpoints]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._