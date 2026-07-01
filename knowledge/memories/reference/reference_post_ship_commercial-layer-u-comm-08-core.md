---
name: reference_post_ship_commercial-layer-u-comm-08-core
description: Auto-distilled learnings from shipping COMMERCIAL-LAYER/U-COMM-08-CORE (commit b6945133c). Full content in wiki.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.813Z
aliases: reference_post_ship_commercial-layer-u-comm-08-core
---


# COMMERCIAL-LAYER/U-COMM-08-CORE

[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-CORE (slot:quebec, for papa): one-time perpetual license keys -- LicenseStore (HMAC-signed PRISM-<prod>-<rand>-<sig> keys, offline-verifiable; fail-loud-on-corrupt store mirroring SubscriptionStore; issue/activate/revoke/grantedFeatures/hasPostLicense) + ONE_TIME_PRODUCTS catalog in pricing-registry (sfc_perpetual $299 -> blanket speed_feed, post_single $199 -> controller-scoped) + GRANT-ABOVE wiring: attachUserPlan resolves req.user.licenses=grantedFeatures(userId), requireTier grants on membership AFTER admin-deny (deny still wins) and BEFORE the plan check (perpetual buyer never blocked by free caps); controller-scoped post grants checked per-controller via hasPostLicense, NOT blanket (no over-grant). 54/54 tests (25 store + 4 new grant-path round-trips + 10 override + 7 pricing + 8 prior). tsc clean. NEXT: activate/list endpoints + webhook issuance.

**Shipped:** 2026-06-21T21:53:59-05:00 by markjvillanueva3-cloud
**Files:** 7 touched

Full distillation: [[commercial-layer-u-comm-08-core]] (in wiki/code-tribal/learnings/).

_Auto-distilled — see `scripts/distill-session-learnings.mjs`._