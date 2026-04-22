# Claude MCP Clean-Room Parity Audit — 2026-03-31

Scope:
- Compare `H:\PRISM\mcp-server` against publicly documented Claude MCP behavior only.
- No leaked, reconstructed, or reverse-engineered Claude source was used.

Public sources:
- Claude Code MCP docs: https://code.claude.com/docs/en/mcp
- Anthropic MCP connector docs: https://platform.claude.com/docs/en/agents-and-tools/mcp-connector

Local evidence sources:
- `H:\PRISM\mcp-server\src\index.ts`
- `H:\PRISM\mcp-server\src\mcp\resources.ts`
- `H:\PRISM\mcp-server\src\mcp\prompts.ts`
- `H:\PRISM\mcp-server\src\mcp\index.ts`
- `H:\PRISM\mcp-server\src\mcp\authMiddleware.ts`
- `H:\PRISM\mcp-server\src\mcp\authConfig.ts`
- `H:\PRISM\mcp-server\src\tools\dispatchers\devDispatcher.ts`
- `H:\PRISM\mcp-server\src\routes\dev.ts`
- `H:\PRISM\mcp-server\src\routes\index.ts`
- `H:\PRISM\.mcp.json`
- `C:\Users\Mark Villanueva\.codex\config.toml`

## Executive Verdict

PRISM already has strong clean-room parity on the core server side:
- Streamable HTTP MCP is live and healthy.
- Prompts, resources, completions, logging, elicitation, progress, sampling, resource links, and OAuth-oriented primitives all exist in code.
- The dev surface is broad and useful enough to support a Claude-style MCP-first workflow.

PRISM is not yet at "full Claude MCP parity" in operational quality. The main remaining gaps are not lack of ambition; they are trust and contract gaps:
- advertised OAuth discovery/auth URLs do not resolve live
- the static MCP system resource is stale and incomplete
- `session_boot` returns mixed legacy startup state that disagrees with live health/SVI
- no `list_changed` support was found
- current workspace/client config is still machine-specific instead of portable

## What Already Matches Well

1. Transport and registry discovery
- Live `/.well-known/mcp.json` advertises Streamable HTTP, tools, resources, prompts, completions, and logging.
- `src/index.ts` wires Streamable HTTP at `/mcp` and registers REST development mirrors.

2. MCP prompts
- `registerPrompts(server)` is active in `src/index.ts`.
- PRISM exposes meaningful prompts in `src/mcp/prompts.ts` including `speed-feed`, `quote-job`, `cnc-simulate`, `feasibility-check`, `machining-playbook`, `alarm-decode`, and `tool-select`.
- This aligns well with Claude Code’s public prompt-as-command model.

3. MCP resources
- `registerResources(server)` is active in `src/index.ts`.
- PRISM exposes `prism://system/overview` plus template resources for machine, material, tool, and alarm.

4. Modern MCP utility surface
- `src/mcp/index.ts` exports completions, progress tracking, task tools, output schemas, elicitation, resource links, sampling, and OAuth-related primitives.
- `src/mcp/progressTracker.ts` sends `notifications/progress`.
- `src/mcp/mcpLogging.ts` sends `notifications/message`.

5. Live dev surface
- `server_info`, `session_boot`, `build`, `test_results`, `svi_summary`, and code/file helpers are all reachable via `/api/v1/dev/*`.
- The live server is reachable at `http://127.0.0.1:3000` and reports healthy status.

## Findings

### P1 — Advertised OAuth metadata/auth URLs are broken in live HTTP mode

Evidence:
- `src/index.ts` advertises `authentication: { type: "oauth2", authorizationUrl: "/oauth/authorize", tokenUrl: "/oauth/token" }`.
- `src/mcp/authMiddleware.ts` explicitly treats `/.well-known/oauth-authorization-server` and `/oauth/discovery` as public discovery paths.
- No matching `/oauth/authorize`, `/oauth/token`, or well-known OAuth discovery routes were found in `src/routes/index.ts` or route files.
- Live checks:
  - `GET /.well-known/oauth-authorization-server` -> 404
  - `GET /.well-known/oauth-protected-resource` -> 404

Impact:
- Remote HTTP clients cannot rely on PRISM’s advertised auth contract.
- This is the highest-confidence parity break versus public Claude MCP expectations around remote authenticated servers.

Recommended fix:
- Either implement the advertised `/oauth/*` + well-known discovery endpoints, or stop advertising them in `/.well-known/mcp.json` until they exist.
- Keep auth route naming consistent across middleware hints, discovery, and the live router.

### P1 — `prism://system/overview` is stale and misleading

Evidence:
- `src/mcp/resources.ts` hard-codes `version: "5.3.0"`, `dispatchers: 67`, `materials: 2957`, `machines: 910`, `tools: 94177`, `alarms: 10033`, `formulas: 499`.
- Live health currently reports much newer totals and server version:
  - version `2.10.0`
  - materials `3989`
  - machines `1015`
  - tools `13967`
  - alarms `11288`
  - formulas `509`
- The header comment promises playbook and tribal resource URIs, but the file only registers four templates: machine, material, tool, alarm.

Impact:
- Clients that read PRISM as a resource get stale capability and inventory numbers.
- Resource discoverability is partially overstated by comments/docs inside the file.

Recommended fix:
- Generate `system-overview` from live registries/server constants instead of hard-coded numbers.
- Either add the promised `prism://playbook/{category}` and `prism://tribal/{camSystem}` resources or remove them from the file header.

### P1 — `session_boot` is reachable but not trustworthy as the canonical startup truth

Evidence:
- Live `session_boot` returned mixed legacy state including:
  - `instance_id: "claude-..."`
  - a `gsd_protocol` block describing `53 dispatchers`
  - warm-start registry counts that disagree with `/health`
  - roadmap/startup language from older operating modes
- Live `svi_summary` and `/health` disagree with several counts inside the `session_boot` payload.

Impact:
- Codex/Claude startup recovery can ingest stale or blended session context.
- This weakens one of the main “full power” surfaces PRISM wants both agents to trust by default.

Recommended fix:
- Split `session_boot` into:
  - stable live facts from current registries/server state
  - optional historical/session memory blocks
- remove stale dispatcher-count and legacy workflow text from default output
- ensure registry counts are sourced from the same live registries as `/health`

### P2 — No `list_changed` support was found

Evidence:
- Code search across `src` for `list_changed` / `listChanged` returned no matches.

Impact:
- Dynamic prompt/resource/tool changes may require manual reconnect or refresh for clients.
- Claude Code publicly emphasizes dynamic discovery for prompts; lack of change signaling limits that experience.

Recommended fix:
- Add explicit list-change notifications where the SDK/server surface supports them, or document reconnect requirements clearly if PRISM stays static-per-process.

### P2 — `test_smoke` does not actually execute smoke tests by default

Evidence:
- `src/routes/dev.ts` exposes `/api/v1/dev/test/smoke`.
- `src/tools/dispatchers/devDispatcher.ts` implements `test_smoke` in `info` mode by default and only lists test definitions.
- Live `POST /api/v1/dev/test/smoke` returned `mode: "info"` plus test inventory, not execution results.
- `test_results` currently reads cached state from `state/test-results/LATEST_SMOKE.json`, which may not be fresh.

Impact:
- The surface sounds like “run smoke tests” but defaults to a catalog/info response.
- Health reporting can look greener than current reality.

Recommended fix:
- Add an explicit default execution mode, or rename the current default behavior to avoid ambiguity.
- Stamp `test_results` with freshness warnings when the last run is stale.

### P2 — Workspace/client config is working, but still too machine-specific

Evidence:
- `H:\PRISM\.mcp.json` hard-codes:
  - `C:/Program Files/nodejs/node.exe`
  - `C:/Users/Mark Villanueva/.local/bin/python3.12.exe`
  - `H:/PRISM/...`
- `C:\Users\Mark Villanueva\.codex\config.toml` also hard-codes machine-local executable and workspace paths.
- Claude’s public MCP docs describe env-driven configuration and portable configuration patterns.

Impact:
- The current home-PC setup works, but future restores or workstation moves will drift faster than necessary.
- Portability is weaker than the public Claude MCP posture encourages.

Recommended fix:
- Where supported by the client, move obvious user- and drive-specific paths to environment-expanded forms.
- Keep one documented canonical path strategy for PRISM home, Node, and Python.

### P2 — Codex app-level MCP attachment is still incomplete in this thread

Evidence:
- `list_mcp_resources` returned zero resources in this thread.
- `list_mcp_resource_templates` returned zero templates in this thread.
- This happened even while the live PRISM server and REST dev surfaces were healthy.

Impact:
- Server-side PRISM is usable, but Codex desktop is not yet consuming the full MCP surface natively in this thread.

Recommended fix:
- Reopen Codex after config changes and re-check attachment.
- If still empty, inspect the desktop app’s MCP loading path separately from the server.

### P3 — Build/test posture is mixed, not clean

Evidence:
- `build` is reachable but returns `BLOCKED`.
- Live pre-build output: `248 errors, 1072 warnings — FIX BEFORE BUILDING`.
- `test_results` returns green cached smoke results, but they are from `2026-02-09T16:05:30Z`, not a fresh current run.

Impact:
- PRISM’s dev surfaces are functional, but current repo truth is not healthy enough to treat build/test green by default.

Recommended fix:
- Treat build cleanup as separate from parity work.
- After cleanup, make fresh smoke execution the standard path before trusting `test_results`.

## Priority Order

1. Fix the live OAuth/discovery contract or stop advertising it.
2. Make `prism://system/overview` dynamic and align resource comments with real registrations.
3. Clean `session_boot` so it only returns trustworthy current-state startup data by default.
4. Make `test_smoke` execute by default or rename its info behavior.
5. Add list-change signaling if supported, or document reconnect semantics.
6. Improve config portability after the above trust gaps are fixed.

## Current Health Snapshot

- Live server health: reachable and healthy
- Live MCP registry discovery: reachable
- Live dev routes: reachable
- Current build posture: blocked by repo errors
- Current smoke posture: stale cached results are green; fresh default endpoint call only returns the smoke catalog
- Current Codex native MCP attachment in this thread: still incomplete

## Bottom Line

PRISM does not need leaked Claude source to reach useful parity.

The server already has most of the right primitives. The work now is mostly cleanup of live contracts and trust surfaces:
- make advertised auth real
- make overview/session data truthful
- make test/build surfaces less ambiguous
- make client attachment and config portability less fragile
