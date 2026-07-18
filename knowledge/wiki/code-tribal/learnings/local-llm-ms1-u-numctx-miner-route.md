# LOCAL-LLM-MS1/U-NUMCTX-MINER-ROUTE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-MINER-ROUTE (slot:india): route the india transcript miner through MCP (opt-in, fail-soft, num_ctx-safe) -- completes the directive's local-LLM-through-MCP for india

**Commit:** `3cf36669e0a7` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T19:10:42-05:00
**Tags:** local-llm-ms1, u-numctx-miner-route, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-MINER-ROUTE (slot:india): route the india transcript miner through MCP (opt-in, fail-soft, num_ctx-safe) -- completes the directive's local-LLM-through-MCP for india

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-MINER-ROUTE (slot:india): route the india transcript miner through MCP (opt-in, fail-soft, num_ctx-safe) -- completes the directive's local-LLM-through-MCP for india

R15 apply-to-all of 'route local LLMs through the MCP server', now unblocked by the
end-to-end num_ctx capability. The miner's ollamaCall gets an OPT-IN MCP overlay
(PRISM_LOCAL_LLM_VIA_MCP): route through prism_local local_generate with numCtx=NUM_CTX
(32768) so the chunked slices are not truncated, FAIL-SOFT to the existing direct
/api/generate path on ANY MCP failure. Faithful design -- the direct path (uncapped
output, num_ctx, R12 empty-response fail-loud) is UNCHANGED; the overlay is additive.
- ollamaCall exported + opts seams (mcpEnabled/callViaMcpImpl/fetchImpl) for hermetic test.
- MCP_NUM_PREDICT=8192 caps the MCP route only (local_generate requires maxTokens; direct stays uncapped).
- 6/6 hermetic tests: overlay routes with numCtx; MCP failure + ok-but-empty both fall soft to direct; gate-off direct-only keeps num_ctx; direct empty/non-2xx still fail loud.

Gate off (default) = byte-identical legacy mine. NEXT (apply-to-all extension): same overlay on mine-galaxy-transcripts.mjs (the 34-galaxy generalization).
```

## Files touched (3)
- scripts/__tests__/mine-india-transcripts-routing.test.mjs | 72 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/mine-india-transcripts.mjs                        | 26 ++++++++++++++++++++++++--
- 2 files changed, 96 insertions(+), 2 deletions(-)

## Lessons surfaced in commit body
- till fail loud.

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 3cf36669e0a7`
- Milestone envelope: `mcp-server/data/milestones/LOCAL-LLM-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._