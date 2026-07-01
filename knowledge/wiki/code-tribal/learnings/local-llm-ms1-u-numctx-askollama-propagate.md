# LOCAL-LLM-MS1/U-NUMCTX-ASKOLLAMA-PROPAGATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-ASKOLLAMA-PROPAGATE (slot:india): thread numCtx through ask-ollama's full local-LLM path (MCP route + fail-soft fallback)

**Commit:** `c2045b3f5a71` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T19:04:36-05:00
**Tags:** local-llm-ms1, u-numctx-askollama-propagate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-ASKOLLAMA-PROPAGATE (slot:india): thread numCtx through ask-ollama's full local-LLM path (MCP route + fail-soft fallback)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-ASKOLLAMA-PROPAGATE (slot:india): thread numCtx through ask-ollama's full local-LLM path (MCP route + fail-soft fallback)

Completes the num_ctx plumbing on the consumer side so the upcoming miner routing
cannot truncate on EITHER branch:
- callViaMcp: forward numCtx -> prism_local local_generate params (-> options.num_ctx).
- callOllama: numCtx -> /api/generate options.num_ctx (conditional; absent when unset =
  byte-identical). This covers callModel's FAIL-SOFT fallback, which routes to callOllama
  when MCP is unavailable -- without this the large-context fallback would have silently
  truncated (the same R12 class the dispatcher-side fix addressed).
- callModel already spreads ...rest to both branches, so callModel(model, prompt, {numCtx})
  flows to MCP and direct alike -- no callModel change needed.
- 94/94 (was 92): + callViaMcp numCtx-forwarded/omitted + callOllama options.num_ctx
  present/absent (concrete request-body assertions, no weak stubs).

Builds on U-LOCAL-GENERATE-NUMCTX (dispatcher side). NEXT: swap mine-india/galaxy-transcripts ollamaCall -> callModel(model, prompt, {numCtx: NUM_CTX, timeoutMs}) fail-soft.
```

## Files touched (3)
- scripts/__tests__/ask-ollama.test.mjs | 19 +++++++++++++++++++
- scripts/ask-ollama.mjs                |  8 +++++++-
- 2 files changed, 26 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show c2045b3f5a71`
- Milestone envelope: `mcp-server/data/milestones/LOCAL-LLM-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._