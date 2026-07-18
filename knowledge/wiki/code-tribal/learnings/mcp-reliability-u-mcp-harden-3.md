# MCP-RELIABILITY/U-MCP-HARDEN-3 — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-RELIABILITY]/U-MCP-HARDEN-3: pagination clamp wired to live path + re-honor-safe revocation TTL + extensible /health registry

**Commit:** `fdd18ac2d51a` · **By:** markjvillanueva3-cloud · **At:** 2026-06-10T15:33:52-05:00
**Tags:** mcp-reliability, u-mcp-harden-3, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-RELIABILITY]/U-MCP-HARDEN-3: pagination clamp wired to live path + re-honor-safe revocation TTL + extensible /health registry

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [MCP-RELIABILITY]/U-MCP-HARDEN-3: pagination clamp wired to live path + re-honor-safe revocation TTL + extensible /health registry

Three env-gated, default-safe MCP-server hardenings (3-of-3 PASS, 23/23 tests):

1. Pagination DoS cap (dataActionSchemas.ts + dataDispatcher.ts): pagination.limit
   now CLAMPS (not rejects) to PRISM_MCP_PAGINATION_MAX||10000. The dispatcher now
   consumes validation.data so the clamp actually reaches the registry call -- it
   previously computed validation.data and DISCARDED it, so the clamp was inert on
   the live path (caught by scrutiny arm C). Invalid limits still rejected.

2. Re-honor-safe revocation TTL (auth.ts): revokedAccessTokens Set -> Map<tokenId,
   revokedAt>; cleanup() evicts by AGE (now-revokedAt > accessTokenExpiry*1000+60s,
   or PRISM_MCP_REVOCATION_TTL_MS) before the size-cap backstop. The old insertion-
   order eviction could drop a STILL-LIVE token's revocation entry and re-honor it;
   age eviction only drops entries whose token is already past its own exp.

3. Extensible /health registry (healthProbes.ts): registerHealthCheck(name,fn) folds
   a cheap sync deep probe into /health; a throwing check degrades to fail, never
   crashes the probe. Default behavior unchanged when none registered.

Tests: 4 files / 23 cases (happy + failure + adversarial), incl a through-dispatcher
integration test proving the clamp reaches the registry params.

P2 follow-ups (logged): TTL-override floor >= token-lifetime; healthProbes malformed-
status fail-open; tool_holder_search unshared/unclamped limit; mirror-test drift note.
```

## Files touched (9)
- mcp-server/src/__tests__/auth-revocation-ttl.test.ts                   | 76 ++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/dataActionSchemas-pagination.test.ts          | 60 +++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/dataDispatcher-pagination.integration.test.ts | 47 +++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/healthProbes-component-checks.test.ts         | 91 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/mcp/auth.ts                                             | 42 ++++++++++++++++++++++------
- mcp-server/src/mcp/healthProbes.ts                                     | 37 ++++++++++++++++++++++++
- mcp-server/src/schemas/dataActionSchemas.ts                            | 16 +++++++++--
- mcp-server/src/tools/dispatchers/dataDispatcher.ts                     |  7 +++++
- 8 files changed, 366 insertions(+), 10 deletions(-)

## Lessons surfaced in commit body
- till rejected.
- TILL-LIVE token's revocation entry and re-honor it;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show fdd18ac2d51a`
- Milestone envelope: `mcp-server/data/milestones/MCP-RELIABILITY.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._