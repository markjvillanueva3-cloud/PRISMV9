# PRODUCT-LAUNCH/U-COMM-05-FIX — [MAIN-FORCE] [PRODUCT-LAUNCH]/U-COMM-05-FIX (slot:quebec for papa): reject unenforceable override keys (scrutiny arm-C P1)

**Commit:** `0f0eb4c06ef2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-21T01:05:00-05:00
**Tags:** product-launch, u-comm-05-fix, auto-distilled

## Subject
[MAIN-FORCE] [PRODUCT-LAUNCH]/U-COMM-05-FIX (slot:quebec for papa): reject unenforceable override keys (scrutiny arm-C P1)

## Body
```
[MAIN-FORCE] [PRODUCT-LAUNCH]/U-COMM-05-FIX (slot:quebec for papa): reject unenforceable override keys (scrutiny arm-C P1)

3-of-3 (arm C FAIL) caught feature-namespace drift: requireTier enforces backend GatedFeature keys (speed_feed/simulation/api_access...) but the admin endpoint/FE use product keys (quoting/sfc.nine_axis...). An admin revoking 'quoting' would store an override NOTHING checks -> silent no-op revoke (R12 honesty gap).
- tierGate: export GATED_FEATURES + isGatedFeature (the canonical enforceable set).
- admin POST /entitlements: 400 UNENFORCEABLE_FEATURE on any feature not in the enforced set, so the endpoint can never claim to revoke a key it cannot enforce.
- +2 tests (isGatedFeature accept/reject + canonical-set). 39/39 green; tsc-clean.
NOTE for quebec Q6 FE: the admin UI must send backend GatedFeature keys (or a FE->backend map); gating the richer product features (sfc.nine_axis/quoting/cadcam) needs those routes wired with requireTier -- follow-up beyond U-COMM-05.
```

## Files touched (4)
- mcp-server/src/__tests__/entitlement-override.test.ts | 22 +++++++++++++++++++++-
- mcp-server/src/middleware/tierGate.ts                 | 25 +++++++++++++++++++++++++
- mcp-server/src/routes/admin.ts                        | 11 +++++++++++
- 3 files changed, 57 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 0f0eb4c06ef2`
- Milestone envelope: `mcp-server/data/milestones/PRODUCT-LAUNCH.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._