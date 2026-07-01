# COMMERCIAL-LAYER/U-COMM-08-CORE — [MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-CORE (slot:quebec, for papa): one-time perpetual license keys -- LicenseStore (HMAC-signed PRISM-<prod>-<rand>-<sig> keys, offline-verifiable; fail-loud-on-corrupt store mirroring SubscriptionStore; issue/activate/revoke/grantedFeatures/hasPostLicense) + ONE_TIME_PRODUCTS catalog in pricing-registry (sfc_perpetual $299 -> blanket speed_feed, post_single $199 -> controller-scoped) + GRANT-ABOVE wiring: attachUserPlan resolves req.user.licenses=grantedFeatures(userId), requireTier grants on membership AFTER admin-deny (deny still wins) and BEFORE the plan check (perpetual buyer never blocked by free caps); controller-scoped post grants checked per-controller via hasPostLicense, NOT blanket (no over-grant). 54/54 tests (25 store + 4 new grant-path round-trips + 10 override + 7 pricing + 8 prior). tsc clean. NEXT: activate/list endpoints + webhook issuance.

**Commit:** `b6945133c57b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T21:53:59-05:00
**Tags:** commercial-layer, u-comm-08-core, auto-distilled

## Subject
[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-CORE (slot:quebec, for papa): one-time perpetual license keys -- LicenseStore (HMAC-signed PRISM-<prod>-<rand>-<sig> keys, offline-verifiable; fail-loud-on-corrupt store mirroring SubscriptionStore; issue/activate/revoke/grantedFeatures/hasPostLicense) + ONE_TIME_PRODUCTS catalog in pricing-registry (sfc_perpetual $299 -> blanket speed_feed, post_single $199 -> controller-scoped) + GRANT-ABOVE wiring: attachUserPlan resolves req.user.licenses=grantedFeatures(userId), requireTier grants on membership AFTER admin-deny (deny still wins) and BEFORE the plan check (perpetual buyer never blocked by free caps); controller-scoped post grants checked per-controller via hasPostLicense, NOT blanket (no over-grant). 54/54 tests (25 store + 4 new grant-path round-trips + 10 override + 7 pricing + 8 prior). tsc clean. NEXT: activate/list endpoints + webhook issuance.

## Body
```
[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-CORE (slot:quebec, for papa): one-time perpetual license keys -- LicenseStore (HMAC-signed PRISM-<prod>-<rand>-<sig> keys, offline-verifiable; fail-loud-on-corrupt store mirroring SubscriptionStore; issue/activate/revoke/grantedFeatures/hasPostLicense) + ONE_TIME_PRODUCTS catalog in pricing-registry (sfc_perpetual $299 -> blanket speed_feed, post_single $199 -> controller-scoped) + GRANT-ABOVE wiring: attachUserPlan resolves req.user.licenses=grantedFeatures(userId), requireTier grants on membership AFTER admin-deny (deny still wins) and BEFORE the plan check (perpetual buyer never blocked by free caps); controller-scoped post grants checked per-controller via hasPostLicense, NOT blanket (no over-grant). 54/54 tests (25 store + 4 new grant-path round-trips + 10 override + 7 pricing + 8 prior). tsc clean. NEXT: activate/list endpoints + webhook issuance.
```

## Files touched (7)
- mcp-server/src/__tests__/LicenseStore.test.ts            | 205 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/entitlement-enforcement.test.ts |  46 ++++++++++++++++++-
- mcp-server/src/config/pricing-registry.ts                |  48 ++++++++++++++++++++
- mcp-server/src/engines/LicenseStore.ts                   | 303 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/middleware/attachUserPlan.ts              |   8 ++++
- mcp-server/src/middleware/tierGate.ts                    |  15 +++++-
- 6 files changed, 621 insertions(+), 4 deletions(-)

## Lessons surfaced in commit body
- till wins) and BEFORE the plan check (perpetual buyer never blocked by free caps); controller-scoped post grants checked per-controller via hasPostLicense, NOT blanket (no over-grant). 54/54 tests (25 store + 4 new grant-path round-trips + 10 override + 7 pricing + 8 prior). tsc clean. NEXT: activate/list endpoints + webhook issuance.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show b6945133c57b`
- Milestone envelope: `mcp-server/data/milestones/COMMERCIAL-LAYER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._