# LOCAL-LLM-MS1/U-NUMCTX-HOTEL-MINER-ROUTE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-HOTEL-MINER-ROUTE (slot:india): clone the proven MCP overlay onto the 3rd + last live per-domain miner -- completes the fleet-wide apply-to-all (hotel + india + galaxy all route opt-in PRISM_LOCAL_LLM_VIA_MCP, fail-soft, numCtx=32768 + numPredict=16384). ALSO fixes a latent hotel defect: it called main() UNCONDITIONALLY (no fn importable without running the CLI) -- added india's __isMain guard so ollama is testable + the CLI still self-runs. 6/6 hermetic routing tests (also prove the guard), 1-reviewer PASS (overlay shape already 2-arm-PASSed on galaxy)

**Commit:** `2ae59c6aa0ea` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T20:42:40-05:00
**Tags:** local-llm-ms1, u-numctx-hotel-miner-route, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-HOTEL-MINER-ROUTE (slot:india): clone the proven MCP overlay onto the 3rd + last live per-domain miner -- completes the fleet-wide apply-to-all (hotel + india + galaxy all route opt-in PRISM_LOCAL_LLM_VIA_MCP, fail-soft, numCtx=32768 + numPredict=16384). ALSO fixes a latent hotel defect: it called main() UNCONDITIONALLY (no fn importable without running the CLI) -- added india's __isMain guard so ollama is testable + the CLI still self-runs. 6/6 hermetic routing tests (also prove the guard), 1-reviewer PASS (overlay shape already 2-arm-PASSed on galaxy)

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-NUMCTX-HOTEL-MINER-ROUTE (slot:india): clone the proven MCP overlay onto the 3rd + last live per-domain miner -- completes the fleet-wide apply-to-all (hotel + india + galaxy all route opt-in PRISM_LOCAL_LLM_VIA_MCP, fail-soft, numCtx=32768 + numPredict=16384). ALSO fixes a latent hotel defect: it called main() UNCONDITIONALLY (no fn importable without running the CLI) -- added india's __isMain guard so ollama is testable + the CLI still self-runs. 6/6 hermetic routing tests (also prove the guard), 1-reviewer PASS (overlay shape already 2-arm-PASSed on galaxy)
```

## Files touched (3)
- scripts/__tests__/mine-hotel-transcripts-routing.test.mjs | 75 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/mine-hotel-transcripts.mjs                        | 31 ++++++++++++++++++++++++++++---
- 2 files changed, 103 insertions(+), 3 deletions(-)

## Lessons surfaced in commit body
- till self-runs. 6/6 hermetic routing tests (also prove the guard), 1-reviewer PASS (overlay shape already 2-arm-PASSed on galaxy)

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2ae59c6aa0ea`
- Milestone envelope: `mcp-server/data/milestones/LOCAL-LLM-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._