# GRAPH-AS-LLM-CONTEXT-MS0/U-GAC05 — [MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC05 (slot:sierra): SpatialAddressBookEngine -- canonical node-id resolver so agents coordinate by node-id, not paraphrase

**Commit:** `039c5cdcdf40` · **By:** markjvillanueva3-cloud · **At:** 2026-06-15T13:25:46-05:00
**Tags:** graph-as-llm-context-ms0, u-gac05, auto-distilled

## Subject
[MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC05 (slot:sierra): SpatialAddressBookEngine -- canonical node-id resolver so agents coordinate by node-id, not paraphrase

## Body
```
[MAIN-FORCE] [GRAPH-AS-LLM-CONTEXT-MS0]/U-GAC05 (slot:sierra): SpatialAddressBookEngine -- canonical node-id resolver so agents coordinate by node-id, not paraphrase

resolveAlias ladder (exact-id/exact-label/fuzzy/ambiguous/unknown) over the 345K-node find-cache; composes GAC02 loadNodes/tokenize. Wires prism_session:spatial_resolve + .claude/hooks/agent-handoff-canonicalize.mjs (UserPromptSubmit advisory, cheap regex-only, wired settings.json).

16 tests (engine 12 + dispatcher-wire 4). 2-agent scrutiny A PASS + B FAIL->fixed: ASCII tiebreak (localeCompare was locale-nondeterministic), hook NaN-cap guard, ambiguityMargin dispatcher plumb. Live: eng.mill->exact-id, common terms->ambiguous-with-candidates (conservative by design). Envelope 5/8 (+GAC04 ship_record commit ref).
```

## Files touched (9)
- .claude/hooks/agent-handoff-canonicalize.mjs                           |  62 +++++++++++++++++++++++++++++++++++
- knowledge/wiki/architecture/spatial-address-book-engine.md             |  90 ++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/data/milestones/GRAPH-AS-LLM-CONTEXT-MS0.json               |  18 +++++++---
- mcp-server/src/__tests__/SpatialAddressBookEngine.test.ts              | 123 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/__tests__/sessionDispatcher.spatialResolve-wire.test.ts |  83 ++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/SpatialAddressBookEngine.ts                     | 192 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/schemas/sessionActionSchemas.ts                         |  18 ++++++++++
- mcp-server/src/tools/dispatchers/sessionDispatcher.ts                  |  28 ++++++++++++++++
- 8 files changed, 609 insertions(+), 5 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 039c5cdcdf40`
- Milestone envelope: `mcp-server/data/milestones/GRAPH-AS-LLM-CONTEXT-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._