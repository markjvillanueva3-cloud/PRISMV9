---
name: reference_post_ship_commercial-layer-u-comm-08-p1fix
description: Auto-distilled learnings from shipping COMMERCIAL-LAYER/U-COMM-08-P1FIX (commit ad98f827e). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.813Z
aliases: reference_post_ship_commercial-layer-u-comm-08-p1fix
---


# COMMERCIAL-LAYER/U-COMM-08-P1FIX

[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-P1FIX (slot:quebec, for papa): scrutiny arm-B/C P1 fixes -- (1) SECURITY: refuse to MINT a license under the dev signing fallback in production (generateKey throws when usingDevFallback && NODE_ENV=production) -- was: real paid keys minted under a source-derivable secret = trivially forgeable; (2) attachUserPlan now LOGS the swallowed plan/entitlement-resolution error (console.error) + corrected the false 'surfaces via its own logging path' comment -- was: a corrupt store silently downgraded every paying customer to free with zero signal (R12). P2 also fixed: FE/BE one-time product-id drift (post_single -> post_perpetual to match web/src/data/pricing.ts; a one-time checkout POSTing the FE id would have been rejected by isOneTimeProduct in the webhook unit) + widened the 48-bit HMAC truncation to 128-bit (honest 'offline-verifiable') + added an FE/BE ONE_TIME parity assertion. 57/57 tests, tsc clean.

**Shipped:** 2026-06-21T22:07:12-05:00 by markjvillanueva3-cloud
**Files:** 2 touched

Full distillation: [[commercial-layer-u-comm-08-p1fix]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._