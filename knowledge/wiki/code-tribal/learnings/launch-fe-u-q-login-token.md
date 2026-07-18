# LAUNCH-FE/U-Q-LOGIN-TOKEN — [MAIN-FORCE] [LAUNCH-FE]/U-Q-LOGIN-TOKEN (slot:quebec): fix THE wave-1 E2E blocker -- login() read the wrong token path so no session ever got a bearer token (login + signup both dead)

**Commit:** `3ad292ee41aa` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T10:34:13-05:00
**Tags:** launch-fe, u-q-login-token, auto-distilled

## Subject
[MAIN-FORCE] [LAUNCH-FE]/U-Q-LOGIN-TOKEN (slot:quebec): fix THE wave-1 E2E blocker -- login() read the wrong token path so no session ever got a bearer token (login + signup both dead)

## Body
```
[MAIN-FORCE] [LAUNCH-FE]/U-Q-LOGIN-TOKEN (slot:quebec): fix THE wave-1 E2E blocker -- login() read the wrong token path so no session ever got a bearer token (login + signup both dead)

AuthContext.login read `data.data?.token ?? data.token`, but the VERIFIED backend
envelope (AuthEngine.login -> issueToken; routes/auth.ts:19-24) is
`{ result: { success, user_id, token: { access_token, refresh_token, token_type:"Bearer" } } }`.
Neither read path exists in that shape, and `data.result.token` is the token OBJECT not
the access_token string -- so setApiKey/localStorage/Authorization all got undefined,
every authed request 401'd, and signup (register() finishes via login()) was dead E2E too.

Fix (pure helper + thin consumer, mirrors the sibling interpretRegisterResult):
- new exported `interpretLoginResponse(body) -> { token, userId, requiresMfa, error }`
  extracts result.token.access_token; null token for any tokenless body so the caller
  fails loud (R12) instead of minting a credential-less "authenticated" session.
- login() now distinguishes an MFA challenge (AuthEngine returns success:false +
  requires_mfa:true at HTTP 200) from a broken contract and surfaces the backend's own
  error string -- fail loud with the RIGHT message (was: misleading "no access token").
- flat-token fallback fires ONLY without a result/data envelope (hadEnvelope guard) so a
  present-but-tokenless envelope can't pick up a stale sibling-layer token.
- localStorage restore now requires a string non-empty token and NO LONGER requires
  parsed.employee -- a fresh SaaS customer has employee:null and was being logged out on
  every page refresh; clearance read null-guarded.

Tests: authToken.test.ts 12/12 (happy + verified-envelope + legacy x2 + MFA + error-surface
+ precedence-guard + 3 failure + 3 adversarial); authRegister 5/5; checkout/indexGateway/
requestCore 27/27; tsc clean. Per-file 2-arm scrutiny PASS/PASS (round-2; arm B's round-1
MFA P1 fixed). jsdom .tsx component tests un-runnable in this env (jsdom absent, pre-existing).

Flagged (P2, pre-existing, NOT this diff): login() employee lookup `?? employees[0]` could
assign a random employee identity to a non-matching user -- needs tenant-scoping + tablet-flow
owner to validate before touching (R7 surface-don't-blend).
```

## Files touched (3)
- mcp-server/web/src/__tests__/authToken.test.ts | 126 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/contexts/AuthContext.tsx    |  74 ++++++++++++++++++++++++++++++++++----
- 2 files changed, 194 insertions(+), 6 deletions(-)

## Lessons surfaced in commit body
- wrong token path so no session ever got a bearer token (login + signup both dead)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3ad292ee41aa`
- Milestone envelope: `mcp-server/data/milestones/LAUNCH-FE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._