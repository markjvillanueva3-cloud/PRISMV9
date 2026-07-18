# LOCAL-LLM-MS1/U-LOCAL-GENERATE-CONSUMER — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE-CONSUMER (slot:india): route ask-ollama through prism_local local_generate via MCP (fail-soft) + extract shared MCP client lib

**Commit:** `e32615c8e563` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T15:20:41-05:00
**Tags:** local-llm-ms1, u-local-generate-consumer, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE-CONSUMER (slot:india): route ask-ollama through prism_local local_generate via MCP (fail-soft) + extract shared MCP client lib

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE-CONSUMER (slot:india): route ask-ollama through prism_local local_generate via MCP (fail-soft) + extract shared MCP client lib

Operator directive 'make sure the local LLMs route through the prism MCP server':
#10 built the server-side route (prism_local local_generate); this wires the
client side into ask-ollama.mjs (every mode's local-LLM call), env-gated +
fail-soft.

- NEW scripts/lib/mcp-streamable-client.mjs: extracted MCP_URL/MCP_TIMEOUT_MS/
  parseMcpResponse/mcpCallStreamable VERBATIM from ollama-prism-bridge.mjs into a
  cycle-free leaf lib (the bridge imports ask-ollama, so ask-ollama could not
  import the bridge). Serves every future MCP consumer (R15 apply-to-all). 17/17.
- ollama-prism-bridge.mjs: imports + re-exports the two fns byte-identically;
  198/198 bridge tests still green via re-export (no behavior change).
- ask-ollama.mjs: + mcpRoutingEnabled (PRISM_LOCAL_LLM_VIA_MCP, default OFF) +
  extractLocalGeneratePayload (unwraps content[].text/structuredContent, handles
  isError) + callViaMcp (prism_local:local_generate, numPredict->maxTokens) +
  callModel (router: MCP-first, FAIL-SOFT to direct Ollama on any MCP failure).
  3 runRequest sites route via callModel, threading deps.callOllama unchanged.
- Fixed a STALE test (pickModel expected the retired qwen2.5-coder:3b; the
  Blackwell-upgrade kept floor is qwen2.5-coder:32b -- code was right).

TESTED 92/92 (75 ask-ollama incl 18 new MCP-routing + 17 lib). LIVE-VALIDATED
against running :3100: callModel viaMcp=true -> MCP round-trip reaches server,
fails loud (-32602 Tool prism_local not found = running bundle predates
local_generate) -> FALLS SOFT to direct Ollama -> returns real 'PONG'
(source=ollama-fallback). The source=mcp success path is hermetically tested but
live-unprovable until the :3100 bundle is rebuilt+restarted (fleet-coordinated;
not forced here) -- fail-soft makes it non-urgent, activates transparently on
next rebuild.
```

## Files touched (6)
- scripts/__tests__/ask-ollama.test.mjs      | 181 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/ask-ollama.mjs                     | 134 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++--
- scripts/lib/mcp-streamable-client.mjs      | 153 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/lib/mcp-streamable-client.test.mjs | 166 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- scripts/ollama-prism-bridge.mjs            | 149 +++++++++--------------------------------------------------------------
- 5 files changed, 644 insertions(+), 139 deletions(-)

## Lessons surfaced in commit body
- till green via re-export (no behavior change).
- til the :3100 bundle is rebuilt+restarted (fleet-coordinated;

## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e32615c8e563`
- Milestone envelope: `mcp-server/data/milestones/LOCAL-LLM-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._