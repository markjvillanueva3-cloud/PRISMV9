# GRAPH-AS-LLM-CONTEXT-MS0/U-GAC06 — [MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC06 (slot:sierra): CommunitySummaryEngine -- cluster the 3222-engine catalog by domain into token-bounded community summaries

**Commit:** `8538abcb2953` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T13:46:24-05:00
**Tags:** graph-as-llm-context-ms0, u-gac06, auto-distilled

## Subject
[MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC06 (slot:sierra): CommunitySummaryEngine -- cluster the 3222-engine catalog by domain into token-bounded community summaries

## Body
```
[MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC06 (slot:sierra): CommunitySummaryEngine -- cluster the 3222-engine catalog by domain into token-bounded community summaries

Collapses ~8000 tokens of engine enumeration to ~85 tokens/domain (10 domains, all 80-91 tok). Keyword-domain clustering over ENGINE_DIGEST.md (no domain headers exist -> DOMAIN_RULES first-match); extractive default (free/deterministic) + opt-in Ollama (fail-soft); suffix-aware token cap always holds. Wires prism_dev:community_summary + scripts/community-summary-gen.mjs.

15 tests (engine 12 + dispatcher-wire 3). 2-agent scrutiny A PASS + B FAIL->fixed: suffix-overshoot at maxTokens<=3, CLI verifies_via doc accuracy, schema co-change comment, wire-test timeout no-op. Envelope 6/8 (+GAC05 ship_record commit ref).
```

## Files touched (10)
- knowledge/wiki/architecture/community-summary-engine.md              |  73 +++++++++++++++++++++++++++++
- mcp-server/data/milestones/GRAPH-AS-LLM-CONTEXT-MS0.json             |  18 +++++--
- mcp-server/src/__tests__/CommunitySummaryEngine.test.ts              | 138 ++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/devDispatcher.communitySummary-wire.test.ts |  59 +++++++++++++++++++++++
- mcp-server/src/engines/CommunitySummaryEngine.ts                     | 278 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts                           |   8 ++++
- mcp-server/src/tools/dispatchers/devDispatcher.ts                    |  18 +++++++
- scripts/community-summary-gen.mjs                                    |  75 ++++++++++++++++++++++++++++++
- state/shared/community-summaries.json                                |  96 ++++++++++++++++++++++++++++++++++++++
- 9 files changed, 758 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 8538abcb2953`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-AS-LLM-CONTEXT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._