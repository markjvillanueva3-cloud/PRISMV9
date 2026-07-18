# LAUNCH-FE/U-Q-CUSTOMER-SIGNUP — [MAIN-FORCE] [LAUNCH-FE]/U-Q-CUSTOMER-SIGNUP (slot:quebec): customer signup page + AuthContext.register + /signup route + G5 backend register param-fix

**Commit:** `89245bbfb814` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T09:46:15-05:00
**Tags:** launch-fe, u-q-customer-signup, auto-distilled

## Subject
[MAIN-FORCE] [LAUNCH-FE]/U-Q-CUSTOMER-SIGNUP (slot:quebec): customer signup page + AuthContext.register + /signup route + G5 backend register param-fix

## Body
```
[MAIN-FORCE] [LAUNCH-FE]/U-Q-CUSTOMER-SIGNUP (slot:quebec): customer signup page + AuthContext.register + /signup route + G5 backend register param-fix

There was NO customer signup UI despite a complete backend register stack -- a launch blocker (no way to onboard a new shop). New SignupPage (username/email/password, validation + loading/error states, mirrors LoginPage) -> AuthContext.register() (registers via /api/v1/auth/register, surfaces a duplicate-username 200+success:false via the pure interpretRegisterResult, then establishes the session via the existing login(); a new SaaS customer lands on /speed-feed-calc, NOT the employee /shop-clock) + LoginPage 'Create an account' link + /signup route.

G5 BACKEND FIX: authDispatcher register case called engine.register(params) but AuthEngine.register takes positional (username,password,roles) -> password=undefined -> thrown TypeError -> signup dead E2E. Now destructures params (dispatcher-side normalization, the documented convention). 10/10 tests; web tsc clean; backend authDispatcher tsc clean; 2-arm scrutiny PASS.

SURFACED (R12, NOT in this slice -- pre-existing, for papa): login() (AuthContext.tsx:135) reads data.data?.token ?? data.token, but the /login route returns {result:{...,token:{access_token,...}}} -> token resolves to UNDEFINED; the session never gets a real bearer token (login AND signup affected). Needs the token-object->access_token contract validated against a live server. P0 launch blocker posted to papa. Also pre-existing: AuthEngine users live in an in-memory Map (no persistence); register drops email (no verification).
```

## Files touched (8)
- mcp-server/src/tools/dispatchers/authDispatcher.ts     |   6 +-
- mcp-server/web/src/App.tsx                             |   2 +
- mcp-server/web/src/__tests__/NotificationBell.test.tsx |   1 +
- mcp-server/web/src/__tests__/authRegister.test.ts      |  35 ++++++++++
- mcp-server/web/src/contexts/AuthContext.tsx            |  46 +++++++++++++-
- mcp-server/web/src/pages/LoginPage.tsx                 |  16 ++++-
- mcp-server/web/src/pages/SignupPage.tsx                | 198 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- 7 files changed, 300 insertions(+), 4 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 89245bbfb814`
- Milestone envelope: `mcp-server/data/milestones/LAUNCH-FE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._