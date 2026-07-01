# COMMERCIAL-LAYER/U-COMM-08-P1FIX — [MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-P1FIX (slot:quebec, for papa): scrutiny arm-B/C P1 fixes -- (1) SECURITY: refuse to MINT a license under the dev signing fallback in production (generateKey throws when usingDevFallback && NODE_ENV=production) -- was: real paid keys minted under a source-derivable secret = trivially forgeable; (2) attachUserPlan now LOGS the swallowed plan/entitlement-resolution error (console.error) + corrected the false 'surfaces via its own logging path' comment -- was: a corrupt store silently downgraded every paying customer to free with zero signal (R12). P2 also fixed: FE/BE one-time product-id drift (post_single -> post_perpetual to match web/src/data/pricing.ts; a one-time checkout POSTing the FE id would have been rejected by isOneTimeProduct in the webhook unit) + widened the 48-bit HMAC truncation to 128-bit (honest 'offline-verifiable') + added an FE/BE ONE_TIME parity assertion. 57/57 tests, tsc clean.

**Commit:** `ad98f827e644` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T22:07:12-05:00
**Tags:** commercial-layer, u-comm-08-p1fix, auto-distilled

## Subject
[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-P1FIX (slot:quebec, for papa): scrutiny arm-B/C P1 fixes -- (1) SECURITY: refuse to MINT a license under the dev signing fallback in production (generateKey throws when usingDevFallback && NODE_ENV=production) -- was: real paid keys minted under a source-derivable secret = trivially forgeable; (2) attachUserPlan now LOGS the swallowed plan/entitlement-resolution error (console.error) + corrected the false 'surfaces via its own logging path' comment -- was: a corrupt store silently downgraded every paying customer to free with zero signal (R12). P2 also fixed: FE/BE one-time product-id drift (post_single -> post_perpetual to match web/src/data/pricing.ts; a one-time checkout POSTing the FE id would have been rejected by isOneTimeProduct in the webhook unit) + widened the 48-bit HMAC truncation to 128-bit (honest 'offline-verifiable') + added an FE/BE ONE_TIME parity assertion. 57/57 tests, tsc clean.

## Body
```
[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08-P1FIX (slot:quebec, for papa): scrutiny arm-B/C P1 fixes -- (1) SECURITY: refuse to MINT a license under the dev signing fallback in production (generateKey throws when usingDevFallback && NODE_ENV=production) -- was: real paid keys minted under a source-derivable secret = trivially forgeable; (2) attachUserPlan now LOGS the swallowed plan/entitlement-resolution error (console.error) + corrected the false 'surfaces via its own logging path' comment -- was: a corrupt store silently downgraded every paying customer to free with zero signal (R12). P2 also fixed: FE/BE one-time product-id drift (post_single -> post_perpetual to match web/src/data/pricing.ts; a one-time checkout POSTing the FE id would have been rejected by isOneTimeProduct in the webhook unit) + widened the 48-bit HMAC truncation to 128-bit (honest 'offline-verifiable') + added an FE/BE ONE_TIME parity assertion. 57/57 tests, tsc clean.
```

## Files touched (2)
- scripts/lib/augmentation-freshness.mjs | 6 ++++++
- 1 file changed, 6 insertions(+)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show ad98f827e644`
- Milestone envelope: `mcp-server/data/milestones/COMMERCIAL-LAYER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._