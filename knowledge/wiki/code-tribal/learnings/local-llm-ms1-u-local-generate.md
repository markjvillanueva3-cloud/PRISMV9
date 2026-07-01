# LOCAL-LLM-MS1/U-LOCAL-GENERATE — [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE (slot:india): general-purpose prism_local local_generate -> route any local-LLM call through MCP + fix localhost IPv6 fetch bug

**Commit:** `e07e8011b89e` · **By:** markjvillanueva3-cloud · **At:** 2026-06-09T13:40:57-05:00
**Tags:** local-llm-ms1, u-local-generate, auto-distilled

## Subject
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE (slot:india): general-purpose prism_local local_generate -> route any local-LLM call through MCP + fix localhost IPv6 fetch bug

## Body
```
[MAIN] [BOOTSTRAP-SLOT-ENFORCE] [LOCAL-LLM-MS1]/U-LOCAL-GENERATE (slot:india): general-purpose prism_local local_generate -> route any local-LLM call through MCP + fix localhost IPv6 fetch bug

DIRECTIVE: route local LLMs through the prism MCP server. DEDUP (R8): prism_local already routes local LLMs through MCP (17 task-specific actions) -- the gap was NO general 'arbitrary prompt -> local model' action, so the miner/ask-ollama hit :11434 directly. Adds that one action; NOT a new prism_ai action (would duplicate prism_local).

WIRE: local_generate added to LOCAL_ACTIONS + LocalGenerate{Input,Output}Schema + ACTION_LOCAL_SCHEMAS + dispatcher case. Reuses engine executeOffloaded, extended with optional opts 4th param + model in return -- existing 3-arg mlDispatcher caller unaffected.

TEST: 10/10 incl a hermetic fetch-stub proving model/temperature/maxTokens/prompt plumb to the request body + a failure-mode test (HTTP error -> success:false, cause in `error` not `content`).

VALIDATE (live, R15): dispatcher round-trip returned real gpt-oss:20b text, ollamaUsed:true, 2270ms warm.

REGRESSION FOUND+FIXED: engine hardcoded http://localhost:11434 (install-probe + chat). On Windows, Node fetch resolves localhost -> IPv6 ::1 where Ollama (IPv4-only) ECONNREFUSEDs -- silently broke local_generate + mlDispatcher offload + the install-probe. curl masks it (dual-stack). Both -> 127.0.0.1 (R11, matches miner). Live-revalidated. [[reference_ollama_localhost_ipv6_fetch_fail_2026_06_09]].

SCRUTINY: 2-reviewer per-file PASS (no-P0); fixed 2 P1 + closed shared P2. tsc: 0 errors in these 4 files (15 pre-existing tsc errors are in untouched peer files, not mine). Stop 3-of-3 covers the session.
```

## Files touched (5)
- mcp-server/src/__tests__/localDispatcherLocalGenerate.test.ts | 115 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
- mcp-server/src/engines/OllamaTaskOffloaderEngine.ts           |  19 ++++++++----
- mcp-server/src/schemas/localActionSchemas.ts                  |  34 ++++++++++++++++++++
- mcp-server/src/tools/dispatchers/localDispatcher.ts           |  47 +++++++++++++++++++++++++++-
- 4 files changed, 208 insertions(+), 7 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show e07e8011b89e`
- Milestone envelope: `mcp-server/data/milestones/LOCAL-LLM-MS1.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._