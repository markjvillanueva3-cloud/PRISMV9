# OLLAMA-EXPAND-MS0/U-OE-BRIDGE-L2B — [MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2B (slot:foxtrot): live MCP-dispatcher tools via Streamable HTTP

**Commit:** `2518aa3514ca` · **By:** markjvillanueva3-cloud · **At:** 2026-05-18T17:58:31-05:00
**Tags:** ollama-expand-ms0, u-oe-bridge-l2b, auto-distilled

## Subject
[MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2B (slot:foxtrot): live MCP-dispatcher tools via Streamable HTTP

## Body
```
[MAIN] [OLLAMA-EXPAND-MS0]/U-OE-BRIDGE-L2B (slot:foxtrot): live MCP-dispatcher tools via Streamable HTTP

Closes the L2b blocker from OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md. Probe verified
the prism-mcp-server v2.10.0 at http://127.0.0.1:3100/mcp speaks JSON-RPC 2.0
over the MCP Streamable HTTP transport (Accept must include both
application/json AND text/event-stream).

Extends scripts/ollama-prism-bridge.mjs with a 7th read-only tool
`mcp_call(dispatcher, action, params)` invoking a CURATED, FROZEN allowlist
of 14 live PRISM dispatcher actions:
  prism_calc:  cutting_force, tool_life, speed_feed, surface_finish, power,
               torque, mrr, chip_load, chip_thinning, cycle_time
  prism_session: master_index_query, dispatcher_map_compact, action_search, action_find

Safety architecture (defense-in-depth — proven by per-file 2-reviewer gate):
- Object.freeze on both outer MCP_ALLOWLIST + inner action arrays
- Explicit MCP_DENYLIST (prism_dev / prism_atcs / prism_orchestrate / prism_cam /
  prism_safety / prism_memory / prism_export / prism_cad) as regression guard
- validateMcpCall at the upstream validateToolCall layer
- impl-boundary re-validation in buildToolImpls (a future caller invoking
  buildToolImpls directly cannot bypass)
- Frozen TOOL_NAMES allowlist
- Params size cap (MCP_PARAMS_MAX_CHARS = 4096) defends against inflation
- Result size cap (MCP_RESULT_MAX_CHARS = 8192) defends against context blowup

Per-file 2-reviewer scrutiny:
- Arm A (code-analyzer): PASS — 0 P0/P1, 2 P2, 3 P3
- Arm B (independent reviewer): PASS with 2 P1 — BOTH ADDRESSED:
  P1.1: allowlist over-claimed verified coverage → fixed by adding
        REAL-DATA per-action live probe test (14 OK / 0 failures against
        the running :3100 server) + honest-scope docstring + MCP_DENYLIST
        negative regression guard
  P1.2: graphCache shared closure state (long-lived container leak) →
        fixed by moving to root-keyed Map matching the existing
        _leafCache / _obsidianCache / _embeddingsCache pattern

Tests: 199 (was 157) — 198 pass / 1 skip (Ollama qwen2.5-coder:3b
absent on this PC, expected) / 0 fail. New coverage (+42):
- validateMcpCall: 8 cases (allowlist enforcement + params shape/size)
- parseMcpResponse: 6 cases (JSON / SSE / malformed / fallback)
- renderMcpResult: 4 cases (content[] / structuredContent / string / null)
- mcpCallStreamable: 6 cases (happy / SSE / HTTP error / JSON-RPC error /
  AbortError / network throw)
- buildToolImpls.mcp_call: 4 cases (injected client / error / re-validation /
  thrown client)
- toolSpecs / system prompt / TOOL_NAMES wiring: 4 cases
- agent-loop integration: 1 case (tool_call routed end-to-end)
- REAL-DATA E2E single + per-action allowlist probe: 2 skip-loud against
  live :3100 server (14 OK / 0 failures)
- MCP_DENYLIST regression guard: 1 case
- P1.2 graph-cache uniformity: 1 case

Honest scope (R12): the 14-action allowlist routing is empirically verified
live; per-action PARAM CONTRACTS rely on each dispatcher's Zod schema for
fail-loud validation errors the agent loop surfaces back to the model.

This commit closes the explicit L2b blocker in
state/shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md §L2b. L3 (full agent
loop) remains queued as before.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- scripts/__tests__/ollama-prism-bridge.test.mjs     | 515 +++++++++++++++++++++
- scripts/ollama-prism-bridge.mjs                    | 403 +++++++++++++++-
- .../shared/specs/OLLAMA-PRISM-MCP-BRIDGE-DESIGN.md |  60 ++-
- 3 files changed, 964 insertions(+), 14 deletions(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show 2518aa3514ca`
- Milestone envelope: `mcp-server/data/milestones/OLLAMA-EXPAND-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._