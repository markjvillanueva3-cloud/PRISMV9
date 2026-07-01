# COMMERCIAL-LAYER/U-COMM-08B-ENDPOINTS — [MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08B-ENDPOINTS (slot:quebec, for papa): one-time license activate/list/issue endpoints -- POST /billing/license/activate (verifyToken) + GET /billing/licenses (verifyToken) + POST /billing/license/issue (verifyToken+admin) wiring LicenseStore.activate/getUserLicenses/issue into routes (closes the issue/activate-not-called-by-any-route gap arm A flagged). Pure store-injectable ops activate/list/issueLicenseOp mirroring applyWebhookToStore, with HTTP error-code mapping (INVALID_KEY/UNKNOWN_KEY/ALREADY_ACTIVATED 409/REVOKED/MISSING_FIELD/UNAUTHENTICATED). +14 op tests incl the activate->grant live path; 72/72 license+entitlement+webhook+pricing green, tsc clean. ASCII-cleaned 10 pre-existing em-dashes in the file header/comments. Webhook one-time issuance deferred: handleWebhookEvent emits subscription_created for every checkout.session.completed regardless of mode -- a mode=payment branch is U-COMM-07 (live Stripe). NEXT: FE billing.ts activate/list methods + wire the Q3 activation UI.

**Commit:** `95e9ae18c6e8` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T22:16:11-05:00
**Tags:** commercial-layer, u-comm-08b-endpoints, auto-distilled

## Subject
[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08B-ENDPOINTS (slot:quebec, for papa): one-time license activate/list/issue endpoints -- POST /billing/license/activate (verifyToken) + GET /billing/licenses (verifyToken) + POST /billing/license/issue (verifyToken+admin) wiring LicenseStore.activate/getUserLicenses/issue into routes (closes the issue/activate-not-called-by-any-route gap arm A flagged). Pure store-injectable ops activate/list/issueLicenseOp mirroring applyWebhookToStore, with HTTP error-code mapping (INVALID_KEY/UNKNOWN_KEY/ALREADY_ACTIVATED 409/REVOKED/MISSING_FIELD/UNAUTHENTICATED). +14 op tests incl the activate->grant live path; 72/72 license+entitlement+webhook+pricing green, tsc clean. ASCII-cleaned 10 pre-existing em-dashes in the file header/comments. Webhook one-time issuance deferred: handleWebhookEvent emits subscription_created for every checkout.session.completed regardless of mode -- a mode=payment branch is U-COMM-07 (live Stripe). NEXT: FE billing.ts activate/list methods + wire the Q3 activation UI.

## Body
```
[MAIN-FORCE] [COMMERCIAL-LAYER]/U-COMM-08B-ENDPOINTS (slot:quebec, for papa): one-time license activate/list/issue endpoints -- POST /billing/license/activate (verifyToken) + GET /billing/licenses (verifyToken) + POST /billing/license/issue (verifyToken+admin) wiring LicenseStore.activate/getUserLicenses/issue into routes (closes the issue/activate-not-called-by-any-route gap arm A flagged). Pure store-injectable ops activate/list/issueLicenseOp mirroring applyWebhookToStore, with HTTP error-code mapping (INVALID_KEY/UNKNOWN_KEY/ALREADY_ACTIVATED 409/REVOKED/MISSING_FIELD/UNAUTHENTICATED). +14 op tests incl the activate->grant live path; 72/72 license+entitlement+webhook+pricing green, tsc clean. ASCII-cleaned 10 pre-existing em-dashes in the file header/comments. Webhook one-time issuance deferred: handleWebhookEvent emits subscription_created for every checkout.session.completed regardless of mode -- a mode=payment branch is U-COMM-07 (live Stripe). NEXT: FE billing.ts activate/list methods + wire the Q3 activation UI.
```

## Files touched (3)
- mcp-server/src/__tests__/billing-license.test.ts | 126 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/routes/billing.ts                 | 135 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++-----------
- 2 files changed, 250 insertions(+), 11 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 95e9ae18c6e8`
- Milestone envelope: `mcp-server/data/milestones/COMMERCIAL-LAYER.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._