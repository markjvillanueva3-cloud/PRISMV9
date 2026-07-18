# FREE-AI-MIGRATION/U-MANUS-ATCS-LLM-ROUTE — [MAIN-FORCE] [FREE-AI-MIGRATION]/U-MANUS-ATCS-LLM-ROUTE (slot:india): route ManusATCSBridge delegated-unit execution onto the free Ollama-first substrate (first consumer migration)

**Commit:** `9faccd3cea5e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-19T11:11:19-05:00
**Tags:** free-ai-migration, u-manus-atcs-llm-route, auto-distilled

## Subject
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-MANUS-ATCS-LLM-ROUTE (slot:india): route ManusATCSBridge delegated-unit execution onto the free Ollama-first substrate (first consumer migration)

## Body
```
[MAIN-FORCE] [FREE-AI-MIGRATION]/U-MANUS-ATCS-LLM-ROUTE (slot:india): route ManusATCSBridge delegated-unit execution onto the free Ollama-first substrate (first consumer migration)

First per-site migration onto the U-LLM-* substrate. ManusATCSBridge delegated ATCS work units to a DIRECT paid Claude fetch; now free-first with Claude as the smart backup.

- callClaude: direct api.anthropic.com fetch -> llmEngine.query({prompt:user, system:systemPrompt, complexity:"high", max_tokens}); maps LLMResponse{answer,tokens_used,model}->{text,tokens,duration_ms,model}. systemPrompt preserved via the system override (the keystone). Exported for testability. _model arg kept advisory (provider chosen by the ladder).
- SEAM FIX (R16): delegateUnits no longer hard-refuses on !hasValidApiKey -- the free Ollama path must be reachable WITHOUT a Claude key. Removed the now-unused hasValidApiKey + getApiKey imports.
- R12 honesty: executeUnitTask marks a unit FAILED (not completed) when r.model==="offline" (no provider answered -> only a stub); records the REAL provider in task.model on success.
- Header/log/JSDoc refreshed off "Claude API" to the Ollama-first reality.

5 tests (offline-routing proof, LLMResponse mapping, advisory-model compat, gate-removed reachability, offline->FAILED via delegate+poll real background path); tsc clean; 2-arm scrutiny PASS (both), all findings P2 (fixed the honesty ones).

Consumer verified: atcsDispatcher queue_next handles the new success/failed shape (never relied on the old throw or key-gate). NOTE for R15 completeness: atcsDispatcher has its OWN separate paid callClaudeForUnit (manus_delegate path) + ralph/manus dispatchers -- still queued. Each has the SAME upstream hasValidApiKey gate that must be relaxed for the free path to be reachable (the seam lesson).
```

## Files touched (3)
- mcp-server/src/__tests__/manus-atcs-bridge-llm-route.test.ts |  96 +++++++++++++++++++++++++++++++
- mcp-server/src/engines/ManusATCSBridge.ts                    | 100 +++++++++++++++++++--------------
- 2 files changed, 155 insertions(+), 41 deletions(-)

## Lessons surfaced in commit body
- till queued. Each has the SAME upstream hasValidApiKey gate that must be relaxed for the free path to be reachable (the seam lesson).

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 9faccd3cea5e`
- Milestone envelope: `mcp-server/data/milestones/FREE-AI-MIGRATION.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._