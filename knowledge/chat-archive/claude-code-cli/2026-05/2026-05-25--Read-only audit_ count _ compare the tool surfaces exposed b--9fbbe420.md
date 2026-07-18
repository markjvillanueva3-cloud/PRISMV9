---
type: "chat-session"
source: "claude-code-cli"
session_id: "9fbbe420-5335-44ea-8eae-7244e85cd53b"
title: "Read-only audit: count + compare the tool surfaces exposed by `prism` (HTTP brid"
date: "2026-05-25"
first_ts: "2026-05-25T03:29:06.004Z"
last_ts: "2026-05-25T03:32:40.126Z"
cwd: "H:\\prism"
messages: 51
user_msgs: 22
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a97abb40839ad7c0f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Read-only audit: count + compare the tool surfaces exposed by `prism` (HTTP brid

> **claude-code-cli** | 2026-05-25 | 51 msgs (22 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a97abb40839ad7c0f.jsonl`

## Transcript

### User | 2026-05-25T03:29:06.004Z

Read-only audit: count + compare the tool surfaces exposed by `prism` (HTTP bridge) vs `prism_safe` (direct stdio). Report what's exposed, what's missing, what could be added.

STEP 1 — Survey (≤8 tool calls):

1. Read `H:/prism/.mcp.json` to confirm what each server registers.
2. Read `H:/prism/mcp-server/src/index.ts` (or the equivalent entry point) — find where MCP tools are registered.
3. Glob `H:/prism/mcp-server/src/tools/dispatchers/*.ts` and count — these are the dispatcher actions exposable via MCP.
4. Sample 2-3 dispatchers (e.g. `calcDispatcher.ts`, `aiReasoningDispatcher.ts`) — count the actions in each.
5. Read the MCP registration code to determine whether ALL dispatchers are exposed via BOTH `prism` and `prism_safe`, or if there's asymmetry.
6. If there's a tool-list endpoint at `:3100/mcp` you can hit (the server is currently HEALTHY), probe it with:
```bash
curl -s -X POST http://127.0.0.1:3100/mcp -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -d '{"jsonrpc":"2.0","method":"tools/list","id":1}' 2>&1 | head -20
```

STEP 2 — Report (no code changes — pure audit):

Output a structured markdown report:

```markdown
# MCP Tool Surface Audit — 2026-05-24

## prism (HTTP bridge → :3100)
- Tools exposed: <count>
- Examples: <first 5 tool names>
- Registration source: <file:line>

## prism_safe (per-chat stdio)
- Tools exposed: <count>
- Examples: <first 5>
- Registration source: <file:line>

## Symmetry check
- Are prism + prism_safe registering from the SAME tool-registration code path? <YES/NO/PARTIAL>
- If asymmetric, list which dispatchers are exposed by one but not the other.

## Expansion opportunities (concrete, not aspirational)
- Dispatchers in `src/tools/dispatchers/` that are NOT currently registered as MCP tools (if any): <list>
- Engines wired to a dispatcher but the dispatcher itself isn't MCP-registered: <list, capped at 10>
- Recently-added algorithms (the 18 iter19-36 pure-algorithm extractions on slo
... [+722 chars truncated]

### Assistant | 2026-05-25T03:29:12.352Z

I'll survey the MCP tool surface in parallel where possible.

### Assistant | 2026-05-25T03:29:12.852Z

[tool_use: Read]

### Assistant | 2026-05-25T03:29:13.094Z

[tool_use: Glob]

### User | 2026-05-25T03:29:14.334Z

[tool_result] mcp-server\src\tools\dispatchers\resourceHarvestingDispatcher.ts
mcp-server\src\tools\dispatchers\resourceExtractionDispatcher.ts
mcp-server\src\tools\dispatchers\algorithmDispatcher.ts
mcp-server\src\tools\dispatchers\securityDispatcher.ts
mcp-server\src\tools\dispatchers\atcsDispatcher.ts
mcp-server\src\tools\dispatchers\authDispatcher.ts
mcp-server\src\tools\dispatchers\autoPilotDispatcher.ts
m
... [+5281 chars truncated]

### User | 2026-05-25T03:29:14.516Z

[tool_result] 1	{
2	  "mcpServers": {
3	    "prism": {
4	      "type": "stdio",
5	      "command": "node",
6	      "args": [
7	        "H:/prism/.claude/helpers/mcp-http-bridge.mjs"
8	      ],
9	      "env": {
10	        "MCP_HTTP_URL": "http://127.0.0.1:3100/mcp",
11	        "MCP_MAX_CONCURRENT": "6",
12	        "MCP_TIMEOUT": "120000",
13	        "LOG_LEVEL": "info"
14	      }
15	    },
16	    "claude-flow": 
... [+508 chars truncated]

### Assistant | 2026-05-25T03:29:17.274Z

The glob result is truncated. Let me get the full count and look at the MCP registration code simultaneously.

### Assistant | 2026-05-25T03:29:18.540Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:29:18.624Z

[tool_use: Glob]

### User | 2026-05-25T03:29:27.256Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Measure-Object: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### User | 2026-05-25T03:29:29.007Z

[tool_result] mcp-server\src\generators\index.ts
mcp-server\src\registries\index.ts
mcp-server\src\shared\index.ts
mcp-server\src\utils\index.ts
mcp-server\src\services\interfaces\index.ts
mcp-server\src\cli\index.ts
mcp-server\src\algorithms\index.ts
mcp-server\src\services\index.ts
mcp-server\src\knowledge\index.ts
mcp-server\src\engines\index.ts
mcp-server\src\mcp\index.ts
mcp-server\src\hooks\index.ts
mcp-s
... [+49 chars truncated]

### Assistant | 2026-05-25T03:29:31.825Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:29:32.384Z

[tool_use: Read]

### User | 2026-05-25T03:29:47.315Z

[tool_result] <persisted-output>
Output too large (57KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\9fbbe420-5335-44ea-8eae-7244e85cd53b\tool-results\bhympd3x2.txt

Preview (first 2KB):
extglob.Name : The term 'extglob.Name' is not recognized as the name of a cmdlet, function, script file, or operable 
program. Check the spelling of the name, or if a path was included, verify that the path
... [+1753 chars truncated]

### User | 2026-05-25T03:29:48.632Z

[tool_result] 1	/**
2	 * PRISM MCP Server - Main Entry Point
3	 * Manufacturing Intelligence MCP Server
4	 * 
5	 * Provides access to:
6	 * - 55 dispatchers, 1670+ verified actions
7	 * - 554 engine files (561 exported), 23 registries
8	 * - Materials Database (6,372+ materials x 127 parameters)
9	 * - Machines Database (1,015+ machines x 4 layers)
10	 * - Controller Alarms (10,033+ alarms x 12 families)
11	 * 
... [+5107 chars truncated]

### Assistant | 2026-05-25T03:29:50.517Z

Let me continue reading the index.ts registration code and sample some dispatchers in parallel.

### Assistant | 2026-05-25T03:29:51.674Z

[tool_use: Read]

### Assistant | 2026-05-25T03:29:52.710Z

[tool_use: Bash]

### User | 2026-05-25T03:29:57.521Z

[tool_result] 100	
101	// COMPLIANCE-AS-CODE: Regulatory Templates (Dispatcher #29) — F8
102	import { registerComplianceDispatcher } from "./tools/dispatchers/complianceDispatcher.js";
103	
104	// MULTI-TENANT: Tenant Isolation + Shared Learning Bus (Dispatcher #30) — F5
105	import { registerTenantDispatcher } from "./tools/dispatchers/tenantDispatcher.js";
106	
107	// PROTOCOL BRIDGE: Multi-protocol Gateway (D
... [+9953 chars truncated]

### User | 2026-05-25T03:30:12.713Z

[tool_result] <persisted-output>
Output too large (57KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\9fbbe420-5335-44ea-8eae-7244e85cd53b\tool-results\bth6o1sdd.txt

Preview (first 2KB):
extglob.Name : The term 'extglob.Name' is not recognized as the name of a cmdlet, function, script file, or operable 
program. Check the spelling of the name, or if a path was included, verify that the path
... [+1753 chars truncated]

### Assistant | 2026-05-25T03:30:22.705Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:30:22.868Z

[tool_use: Read]

### User | 2026-05-25T03:30:40.937Z

[tool_result] Exit code 1
/usr/bin/bash: command substitution: line 1: syntax error near unexpected token `test/middleware'
/usr/bin/bash: command substitution: line 1: `nExcluded (test/middleware): $excl'
/usr/bin/bash: line 1: -: command not found
At line:1 char:95
+ ... ver/src/tools/dispatchers/' -Filter '*.ts';  = .Count;  = ( | Where-O ...
+                                                               
... [+177 chars truncated]

### User | 2026-05-25T03:30:42.614Z

[tool_result] 249	// ============================================================================
250	// CORE SOURCE FILE CATALOG — 16 LOW-priority core infrastructure modules
251	// Wired 2026-02-23 from MASTER_EXTRACTION_INDEX_V2 (P-MS5 Wave 4)
252	// These are foundational bootstrap, orchestration, and config modules
253	// that the index.ts entry point orchestrates.
254	// Total: 16 files, 6,237 lines
255	/
... [+4448 chars truncated]

### Assistant | 2026-05-25T03:30:45.078Z

Now let me find the actual `registerTools` block and probe the live HTTP endpoint, plus check the commented-out dispatchers:

### Assistant | 2026-05-25T03:30:45.974Z

[tool_use: Grep]

### Assistant | 2026-05-25T03:30:46.820Z

[tool_use: Grep]

### User | 2026-05-25T03:30:46.904Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `file_path` was provided</tool_use_error>

### User | 2026-05-25T03:30:46.905Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issue:
An unexpected parameter `file_path` was provided</tool_use_error>

### Assistant | 2026-05-25T03:30:48.785Z

[tool_use: Grep]

### Assistant | 2026-05-25T03:30:49.611Z

[tool_use: Grep]

### User | 2026-05-25T03:30:53.865Z

[tool_result] mcp-server\src\index.ts:93

Found 93 total occurrences across 1 file.

### User | 2026-05-25T03:30:53.968Z

[tool_result] No matches found

### Assistant | 2026-05-25T03:30:56.265Z

Good — 93 `register*Dispatcher(server)` calls confirmed. Now let me get the commented-out dispatchers, the live HTTP surface, and sample two dispatcher action counts in parallel.

### Assistant | 2026-05-25T03:30:57.236Z

[tool_use: Grep]

### Assistant | 2026-05-25T03:30:58.537Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:30:59.913Z

[tool_use: Grep]

### User | 2026-05-25T03:31:04.338Z

[tool_result] 133:// import { registerAgentDispatcher } from "./tools/dispatchers/agentDispatcher.js"; // NOT ON THIS BRANCH
174:// import { registerResourceHarvestingDispatcher } from "./tools/dispatchers/resourceHarvestingDispatcher.js"; // NOT ON THIS BRANCH
223:// import { registerPPDispatcher } from "./tools/dispatchers/ppDispatcher.js"; // NOT ON THIS BRANCH

### User | 2026-05-25T03:31:16.085Z

[tool_result] <persisted-output>
Output too large (399.2KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\9fbbe420-5335-44ea-8eae-7244e85cd53b\tool-results\byqwnd3de.txt

Preview (first 2KB):
{"result":{"tools":[{"name":"prism_data","description":"Registry data access: material/machine/tool/alarm/formula/coolant/coating get/search/recommend, cross_query, speed_feed_calc. Use 'action' param.","
... [+1820 chars truncated]

### User | 2026-05-25T03:31:19.342Z

[tool_result] No matches found

### Assistant | 2026-05-25T03:31:22.920Z

The live HTTP probe returned the full tool list. Let me extract the tool count from it and check the DISPATCHER_DIGEST for pre-indexed action counts, plus look at the calcDispatcher action enum directly.

### Assistant | 2026-05-25T03:31:25.926Z

[tool_use: Bash]

### Assistant | 2026-05-25T03:31:26.541Z

[tool_use: Read]

### User | 2026-05-25T03:31:50.522Z

[tool_result] Tool count: 90
First 5 tool names:
prism_data
prism_orchestrate
prism_hook
prism_skill_script
prism_calc

### User | 2026-05-25T03:31:57.428Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**103 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-05-25 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **12267**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+7227 chars truncated]

### Assistant | 2026-05-25T03:31:59.994Z

I have all the data needed. Let me read the rest of the DISPATCHER_DIGEST for the "no server.tool found" entries and check for `pureAlgorithmsDispatcher`.

### Assistant | 2026-05-25T03:32:01.350Z

[tool_use: Read]

### Assistant | 2026-05-25T03:32:01.866Z

[tool_use: Grep]

### User | 2026-05-25T03:32:05.519Z

[tool_result] No files found

### User | 2026-05-25T03:32:06.561Z

[tool_result] 80	| outcomeDispatcher | (no server.tool found) | 40 |
81	| partsLibraryDispatcher | prism_parts — Parts Library & File Storage — upload files with SHA-256 ... | 18 |
82	| pfpDispatcher | prism_pfp — Predictive Failure Prevention. Actions: get_dashboard, as... | 6 |
83	| ppDispatcher | prism_pp — PostProcessor dispatcher — G-code generation, optimizatio... | 801 |
84	| processControlDispatcher | p
... [+3457 chars truncated]

### Assistant | 2026-05-25T03:32:40.126Z

I have all the data needed. Here is the audit report.

---

# MCP Tool Surface Audit — 2026-05-24

## prism (HTTP bridge → :3100)

- **Tools exposed: 90** (confirmed via live `tools/list` probe against `http://127.0.0.1:3100/mcp`)
- Examples: `prism_data`, `prism_orchestrate`, `prism_hook`, `prism_skill_script`, `prism_calc`
- Registration source: `mcp-server/src/index.ts` — 93 `register*Dispatcher(server)` call sites (93 imports registered, but 3 are commented out — see below — leaving 90 active MCP tool names)

## prism_safe (per-chat stdio)

- **Tools exposed: 90** (same count — `prism_safe` in `.mcp.json` points directly to `mcp-server/dist/index.js` with `TRANSPORT=stdio`; it runs the same compiled entry point)
- Examples: identical set — `prism_data`, `prism_calc`, `prism_cam`, `prism_session`, `prism_turning`
- Registration source: same `mcp-server/src/index.ts` compiled to `dist/index.js` — transport layer differs (stdio vs StreamableHTTP), tool registration code path is identical

## Symmetry check

- Are prism + prism_safe registering from the SAME tool-registration code path? **YES**
- `prism` = `mcp-http-bridge.mjs` → proxies to `:3100` which runs `dist/index.js`
- `prism_safe` = `dist/index.js` directly with `TRANSPORT=stdio`
- Both hit the same `registerXDispatcher(server)` chain in `index.ts`. No asymmetry in tool registration — the only difference is transport protocol and the `MCP_MAX_CONCURRENT=6` / `MCP_TIMEOUT=120000` env knobs that apply only to the bridge.

## Dispatchers on disk but NOT registered as MCP tools

Three dispatchers are explicitly commented out in `index.ts` (all tagged `// NOT ON THIS BRANCH`):

| Dispatcher file | Would-be MCP name | Actions in digest |
|---|---|---|
| `agentDispatcher.ts` | `prism_agent` | 24 |
| `resourceHarvestingDispatcher.ts` | `prism_resource_harvesting` | 8 |
| `ppDispatcher.ts` | `prism_pp` | 801 |

Additionally, 9 dispatchers have `(no server.tool found)` in the digest — meaning they exist and have acti
... [+2949 chars truncated]
