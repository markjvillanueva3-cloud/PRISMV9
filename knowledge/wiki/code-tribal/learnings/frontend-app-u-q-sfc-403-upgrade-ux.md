# FRONTEND-APP/U-Q-SFC-403-UPGRADE-UX — [MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-403-UPGRADE-UX (slot:quebec): SFC tier-gate 403 -> code-branched upgrade / contact-admin prompt

**Commit:** `dfd3332831a2` · **By:** markjvillanueva3-cloud · **At:** 2026-06-22T09:32:14-05:00
**Tags:** frontend-app, u-q-sfc-403-upgrade-ux, auto-distilled

## Subject
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-403-UPGRADE-UX (slot:quebec): SFC tier-gate 403 -> code-branched upgrade / contact-admin prompt

## Body
```
[MAIN-FORCE] [FRONTEND-APP]/U-Q-SFC-403-UPGRADE-UX (slot:quebec): SFC tier-gate 403 -> code-branched upgrade / contact-admin prompt

The SFC speed_feed gate returns 403 for distinct reasons (TIER_LIMIT daily cap
vs ENTITLEMENT_REVOKED admin-disable). Wires the FE to show the RIGHT prompt by
backend code, not a raw error (previously the 403 surfaced '[object Object]').

- requestCore.ts: ApiError gains optional  (additive; ~45 call sites unaffected).
- sfc.ts: extract the human message + machine code from the nested
  {error:{message,code}} envelope (was  -> '[object Object]').
- useSfc.ts: AsyncState carries errorStatus + errorCode (additive).
- SfcGateNotice.tsx (new): ENTITLEMENT_REVOKED -> 'disabled by your administrator'
  (NO upgrade CTA -- paying does not restore an admin revoke); TIER_LIMIT/unknown
  -> 'daily free limit reached' + View Plans. Renders the backend message as body.
- SfcCalculatorPage: 403 -> <SfcGateNotice> (dropped the unused useNavigate).
- 7 tests (useSfc status+code propagation; gate-notice cap-has-CTA / revoke-has-none).
  web tsc clean. 2-arm scrutiny FAIL(blanket-403 mislabel)->fixed->PASS; codes
  verified byte-exact vs tierGate.ts:229/253.
```

## Files touched (8)
- mcp-server/web/src/__tests__/SfcGateNotice.test.tsx | 41 +++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/__tests__/useSfc.test.ts         | 58 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/api/requestCore.ts               |  5 +++++
- mcp-server/web/src/api/sfc.ts                       | 23 +++++++++++++++++++++--
- mcp-server/web/src/components/sfc/SfcGateNotice.tsx | 60 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/hooks/useSfc.ts                  | 23 ++++++++++++++++++-----
- mcp-server/web/src/pages/SfcCalculatorPage.tsx      | 19 +++++++++++++------
- 7 files changed, 216 insertions(+), 13 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show dfd3332831a2`
- Milestone envelope: `mcp-server/data/milestones/FRONTEND-APP.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._