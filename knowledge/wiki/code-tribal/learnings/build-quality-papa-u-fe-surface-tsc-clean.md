# BUILD-QUALITY-PAPA/U-FE-SURFACE-TSC-CLEAN — [MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-FE-SURFACE-TSC-CLEAN (slot:papa): clear all 5 tsc errors on the front-end-facing backend surface (routes/mcp/dispatch) -- 87->82, 0-new

**Commit:** `98791915a586` · **By:** markjvillanueva3-cloud · **At:** 2026-06-18T10:15:15-05:00
**Tags:** build-quality-papa, u-fe-surface-tsc-clean, auto-distilled

## Subject
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-FE-SURFACE-TSC-CLEAN (slot:papa): clear all 5 tsc errors on the front-end-facing backend surface (routes/mcp/dispatch) -- 87->82, 0-new

## Body
```
[MAIN-FORCE] [BUILD-QUALITY-PAPA]/U-FE-SURFACE-TSC-CLEAN (slot:papa): clear all 5 tsc errors on the front-end-facing backend surface (routes/mcp/dispatch) -- 87->82, 0-new

The web/phone app (mcp-server/web, 96 api clients -> /api/v1 -> :3100 bridge)
consumes src/routes/*.ts + the MCP transport. That surface is now 100%
tsc-clean (routes:0 index:0 mcp:0 dispatchers:0); the :3100 bridge already was.
build:fast (esbuild) bundles clean, so the front-end is unblocked at runtime.
Three contract reconciliations (no domain-value fabrication; type/API only):

1. src/mcp/authHttp.ts -- buildMcpDiscoveryDocument read non-existent
   OAuthConfig.authorizationUrl/tokenUrl/scopes (TS2339 x3). Now mirrors the
   canonical auth.ts:803-804 contract (${issuer}/oauth/authorize + /oauth/token)
   and derives scopes from the real config.clients[].allowedScopes union.
   No secret exposure (jwtSecret/clientSecret never touched).
2. src/routes/python-api.ts -- tribal-search route called
   tribalKnowledgeAdvisorEngine.search() which does not exist, so the endpoint
   was DEAD (always returned []). Switched to the base tribalKnowledgeEngine
   (singleton :2148) whose search(KnowledgeSearchInput):KnowledgeTip[] does
   free-text query+category+limit. Revives a dead endpoint; response shape
   {success,query,count,results,timestamp} unchanged.
3. src/tools/dispatchers/documentLearningDispatcher.ts -- added fail-loud
   callDocumentAction(action,params) reusing ACTION_HANDLERS + the same
   normalize+validate as the MCP register path. Fixes a LATENT RUNTIME BUG:
   AutomatedResourceHarvestingPipeline.ts:482 lazy-imported a callDocumentAction
   export that never existed (PDF harvest path was broken).

Gate: tsc 87->82 (exactly these 5), regression diff EMPTY (no un-masking),
69/69 affected tests pass (python-api.test.ts 64 + TribalKnowledgeEngine.lazy 5).
Per-file scrutiny: 2 reviewers (code-analyzer + reviewer) both PASS, 0 P0/P1.
```

## Files touched (4)
- mcp-server/src/mcp/authHttp.ts                                 | 11 ++++++++---
- mcp-server/src/routes/python-api.ts                            | 13 +++++++++----
- mcp-server/src/tools/dispatchers/documentLearningDispatcher.ts | 32 ++++++++++++++++++++++++++++++++
- 3 files changed, 49 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 98791915a586`
- Milestone envelope: `mcp-server/data/milestones/BUILD-QUALITY-PAPA.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._