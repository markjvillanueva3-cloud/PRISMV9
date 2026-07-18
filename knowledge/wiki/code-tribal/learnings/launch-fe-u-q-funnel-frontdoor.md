# LAUNCH-FE/U-Q-FUNNEL-FRONTDOOR — [MAIN-FORCE] [LAUNCH-FE]/U-Q-FUNNEL-FRONTDOOR (slot:quebec): public landing at / for anonymous visitors + free CTAs -> calculator + 403 error-code propagation

**Commit:** `1eddbe528a2b` · **By:** markjvillanueva3-cloud · **At:** 2026-06-23T09:30:29-05:00
**Tags:** launch-fe, u-q-funnel-frontdoor, auto-distilled

## Subject
[MAIN-FORCE] [LAUNCH-FE]/U-Q-FUNNEL-FRONTDOOR (slot:quebec): public landing at / for anonymous visitors + free CTAs -> calculator + 403 error-code propagation

## Body
```
[MAIN-FORCE] [LAUNCH-FE]/U-Q-FUNNEL-FRONTDOOR (slot:quebec): public landing at / for anonymous visitors + free CTAs -> calculator + 403 error-code propagation

FUNNEL: root / rendered ShellGatewayPage (an internal employee workspace picker) to EVERYONE -- the single biggest funnel killer (an anonymous visitor saw an employee picker, no idea what PRISM is). New IndexGateway routes anonymous -> the public marketing LandingPage, signed-in -> ShellGatewayPage (pure selectIndexPage, 4 tests; signed-in employee experience unchanged). LandingPage 'Try Free'/'Get Started Free'/free-tier CTAs + checkout.ts free-plan now land on /speed-feed-calc (try the free calculator, no login wall) instead of /login; paid/login CTAs unchanged.

G6: requestCore.fetchJson dropped the entitlement error.code (only the SFC client extracted it), so every other paid page would show a raw 403 instead of an UpgradePrompt once papa wires requireTier. New exported extractErrorCode (nested {error:{code}} + top-level + whitespace/null-safe) now populates ApiError.code for ALL callers (5 tests). Additive; existing throw shape unchanged. 27/27 tests; tsc clean on touched files; 2-arm per-file scrutiny PASS (zero findings).
```

## Files touched (9)
- mcp-server/web/src/App.tsx                                |  5 ++++-
- mcp-server/web/src/__tests__/checkout.test.ts             |  4 ++--
- mcp-server/web/src/__tests__/indexGateway.test.ts         | 26 ++++++++++++++++++++++++++
- mcp-server/web/src/__tests__/requestCoreErrorCode.test.ts | 33 +++++++++++++++++++++++++++++++++
- mcp-server/web/src/api/requestCore.ts                     | 27 +++++++++++++++++++++++++++
- mcp-server/web/src/lib/checkout.ts                        |  4 ++--
- mcp-server/web/src/pages/IndexGateway.tsx                 | 44 ++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/web/src/pages/LandingPage.tsx                  |  6 +++---
- 8 files changed, 141 insertions(+), 8 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 1eddbe528a2b`
- Milestone envelope: `mcp-server/data/milestones/LAUNCH-FE.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._