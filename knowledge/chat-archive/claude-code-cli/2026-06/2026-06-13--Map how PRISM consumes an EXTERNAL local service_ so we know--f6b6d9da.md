---
type: "chat-session"
source: "claude-code-cli"
session_id: "f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de"
title: "Map how PRISM consumes an EXTERNAL local service, so we know the best-fit patter"
date: "2026-06-13"
first_ts: "2026-06-13T06:12:21.613Z"
last_ts: "2026-06-13T06:19:39.508Z"
cwd: "H:\\PRISM"
messages: 39
user_msgs: 16
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-a438b70531b70a4d8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Map how PRISM consumes an EXTERNAL local service, so we know the best-fit patter

> **claude-code-cli** | 2026-06-13 | 39 msgs (16 user / 23 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/f6b6d9da-bed3-42f9-8c83-a5f13cdaa4de/subagents/workflows/wf_9e7a2caf-617/agent-a438b70531b70a4d8.jsonl`

## Transcript

### User | 2026-06-13T06:12:21.613Z

Map how PRISM consumes an EXTERNAL local service, so we know the best-fit pattern to wire a Hermes bridge INTO. PRISM root: H:/PRISM.

Read/Grep with file:line:
- The prism_* MCP dispatcher pattern: how is a new dispatcher action added? Read a representative dispatcher under H:/PRISM/mcp-server/src/tools/dispatchers/ and skim H:/PRISM/mcp-server/data/docs/DISPATCHER_DIGEST.md.
- Existing local-service bridges as TEMPLATES: H:/PRISM/scripts/ask-ollama.mjs, H:/PRISM/scripts/ollama-docker-launcher.mjs, H:/PRISM/scripts/wire-hermes-local-backend.mjs, and the HTTP bridge daemon on 127.0.0.1:3100 (Grep for TRANSPORT=http / port 3100 entry point).
- How PRISM routes work to Ollama/Docker (the ask-ollama lane) as the closest analog to an "ask-hermes" bridge.

Conclusion: recommend the best-fit PRISM-side shape to expose Hermes (e.g. a scripts/ask-hermes.mjs analogous to ask-ollama.mjs, and/or a prism_* dispatcher action), with the exact files to create/modify. Cite file:line. Plain text, no JSON.

### Assistant | 2026-06-13T06:12:28.459Z

I'll read the relevant files in parallel to map PRISM's external-service consumption patterns.

### Assistant | 2026-06-13T06:12:31.097Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:12:32.578Z

[tool_use: Read]

### User | 2026-06-13T06:13:43.998Z

[tool_result] ec097aa543 [MAIN] [ALL-MEANS-ALL-MS0]/U-AMA01 (slot:charlie): enforce 'all means all' totality rule [MAIN-FORCE]
bc089a30cc [MAIN] [QUOTING-SYNERGY-MS0]/U-QP-CONSUME-FMV-DEDUP (slot:charlie): canonical confidence-gated material-co...
635b41af76 [QUOTING-SYNERGY-MS0]/U-QP-DOCUSTRATA-RUN-ALL: end-to-end document->pair pipeline
a4ec24e666 [MAIN-FORCE] [OLLAMA-OFFLOAD]/U-OFFLOAD-TRIAGE (slot:india, op
... [+642 chars truncated]

### User | 2026-06-13T06:14:25.333Z

[tool_result] 1	# PRISM Dispatcher Digest
2	
3	**110 dispatchers** route MCP actions to engines.
4	Each dispatcher handles a specific manufacturing/system domain.
5	Auto-generated: 2026-06-13 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
6	Total actions across all dispatchers: **13954**.
7	
8	## Dispatcher Map
9	
10	| Dispatcher | Domain | Actions |
11	|-----------|--------|----
... [+7143 chars truncated]

### Assistant | 2026-06-13T06:14:30.688Z

Let me read the key files in parallel.

### Assistant | 2026-06-13T06:14:31.700Z

[tool_use: Read]

### Assistant | 2026-06-13T06:14:32.146Z

[tool_use: Read]

### Assistant | 2026-06-13T06:14:32.682Z

[tool_use: Read]

### User | 2026-06-13T06:14:38.804Z

[tool_result] File does not exist. Note: your current working directory is H:\PRISM.

### User | 2026-06-13T06:14:45.622Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/wire-hermes-local-backend.mjs
3	//
4	// Safely point the Hermes desktop agent at a LOCAL Ollama model (the rate-limit-
5	// free autonomy path from the leopardracer/0xCodez Hermes articles + the
6	// operator's "local does heavy work, Claude reviews, stay 100% local"
7	// architecture). U-HERMES-LOCAL-WIRE (slot:bravo, 2026-06-04).
8	//
9	// WHY a dedicated scrip
... [+9448 chars truncated]

### User | 2026-06-13T06:14:47.487Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-ollama.mjs — local Ollama query service (OLLAMA-EXPAND-MS0/U-OE01)
4	 *
5	 * Routes token-heavy work to a LOCAL Ollama model so it never enters the
6	 * Claude context window. Claude invokes this via Bash; only the compact
7	 * answer returns. Heavy inputs — the ~27 MB system-viz graph, large source
8	 * files, build-error dumps — are processed here in the subp
... [+51768 chars truncated]

### Assistant | 2026-06-13T06:15:30.582Z

Now let me read a representative dispatcher and the HTTP bridge / port-3100 entry point.

### Assistant | 2026-06-13T06:15:31.546Z

[tool_use: Read]

### Assistant | 2026-06-13T06:15:32.770Z

[tool_use: Grep]

### User | 2026-06-13T06:15:46.449Z

[tool_result] 1	/**
2	 * prism_local — Local LLM Dispatcher — LOCAL-LLM-MS0
3	 * ===================================================
4	 *
5	 * Dispatch actions to local Ollama/Qwen for token savings:
6	 * - validate_code: Validate code against CLAUDE.md rules (FREE via Ollama)
7	 * - local_health: Check Ollama/Docker stack health
8	 * - offload_classify: Classify if task can be offloaded to local LLM
9	 *
10	 *
... [+24070 chars truncated]

### User | 2026-06-13T06:15:52.786Z

[tool_result] mcp-server\src\data\additional-tools.json:34399:    "designation": "HC4713100",
mcp-server\src\data\additional-tools.json:51197:    "designation": "DH453100",
mcp-server\src\data\additional-tools.json:53271:    "designation": "DGE433100",
mcp-server\src\data\additional-tools.json:64018:    "designation": "* D1631005",
mcp-server\src\data\additional-tools.json:64027:    "designation": "* D1631006",
... [+4471 chars truncated]

### Assistant | 2026-06-13T06:15:55.566Z

Now let me check the HTTP bridge entry point at port 3100 and the bridgeDispatcher for the external-service pattern.

### Assistant | 2026-06-13T06:15:56.128Z

[tool_use: Read]

### Assistant | 2026-06-13T06:15:56.817Z

[tool_use: Read]

### User | 2026-06-13T06:16:12.308Z

[tool_result] 1	/**
2	 * PRISM F7: Protocol Bridge Dispatcher (#31)
3	 * =============================================
4	 * 
5	 * prism_bridge — 13 actions for multi-protocol API gateway.
6	 * 
7	 * @version 1.1.0 (fixed: proper server.tool() registration)
8	 * @feature F7
9	 */
10	
11	import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
12	import { z } from "zod";
13	import { protocolBridgeEngi
... [+3552 chars truncated]

### User | 2026-06-13T06:16:12.400Z

[tool_result] 1045	        max_concurrency: mcpSem.maxConcurrency,
1046	        max_queue: mcpSem.maxQueue,
1047	      },
1048	      timestamp: new Date().toISOString()
1049	    });
1050	  });
1051	
1052	  // MCP-READINESS (slot alpha 2026-05-28 — U-MCPR01): /ready is a STRICTER
1053	  // probe than /health. /health = "port bound + registries non-empty + heap OK";
1054	  // /ready adds a canary lazy-import that
... [+2680 chars truncated]

### Assistant | 2026-06-13T06:16:18.891Z

Now let me check the HTTP server startup at port 3100 and how the index registers the MCP+HTTP bridge.

### Assistant | 2026-06-13T06:16:18.892Z

[tool_use: Read]

### Assistant | 2026-06-13T06:16:21.236Z

[tool_use: Grep]

### User | 2026-06-13T06:16:53.293Z

[tool_result] 1360	        extensions: ["html"],
1361	      }),
1362	    );
1363	
1364	    app.get(/^(?!\/(?:api|mcp|health|ready|metrics|\.well-known|ws)(?:\/|$)).*/, (_req, res) => {
1365	      res.sendFile(frontendIndexPath);
1366	    });
1367	
1368	    log.info(`[WEB] Serving built frontend from ${frontendDistDir}`);
1369	  } else {
1370	    log.warn(`[WEB] Built frontend not found at ${frontendDistDir}; HT
... [+2439 chars truncated]

### User | 2026-06-13T06:16:55.405Z

[tool_result] Found 3 files
mcp-server\src\tools\dispatchers\memoryDispatcher.ts
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
mcp-server\src\tools\dispatchers\contextDispatcher.ts

### Assistant | 2026-06-13T06:16:58.150Z

Now let me check how the port 3100 HTTP bridge is referenced (separate from the MCP server default port) and how existing external-service callers (Hermes engine) are shaped.

### Assistant | 2026-06-13T06:16:59.998Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:17:00.422Z

[tool_use: Glob]

### User | 2026-06-13T06:17:18.065Z

[tool_result] No files found

### User | 2026-06-13T06:18:01.417Z

[tool_result] H:/PRISM/mcp-server/src/index.ts:1055:  // exact BUG-1 / BUG-2 class from reference_mcp_server_3100_crash_fix_2026_05_22)
H:/PRISM/mcp-server/src/index.ts:1383:  // took :3100 down fleet-wide. exit(0) on EADDRINUSE = "a peer already owns the

### Assistant | 2026-06-13T06:18:05.413Z

Good. The MCP server itself is port 3000 (not 3100 — that was a historical reference). I have everything I need. Now let me check one more thing: whether there's an existing Hermes engine or dispatcher to dedup against.

### Assistant | 2026-06-13T06:18:06.947Z

[tool_use: Bash]

### Assistant | 2026-06-13T06:18:09.326Z

[tool_use: Bash]

### User | 2026-06-13T06:18:46.247Z

[tool_result] (Bash completed with no output)

### User | 2026-06-13T06:18:48.891Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-13T06:19:39.508Z

No existing Hermes engine or dispatcher action anywhere in the codebase. I have everything needed for the recommendation. Here is the full mapping and recommendation.

---

PRISM EXTERNAL-SERVICE CONSUMPTION PATTERN — HOW IT WORKS TODAY

1. The canonical external-service bridge is scripts/ask-ollama.mjs (H:/PRISM/scripts/ask-ollama.mjs:1-1048). It is a standalone Node ESM CLI that:
   - Owns the HTTP call to the external service (Ollama /api/generate at 127.0.0.1:11434, lines 469-514).
   - Exposes named modes (viz, summarize, explain, triage, ask, rerank) as a CLI surface Claude invokes via Bash.
   - Has a Docker Models fallback path (callDockerModel, lines 575-625) — the same Ollama-down degradation pattern we would want for Hermes.
   - Has a secondary MCP routing path (callViaMcp / PRISM_LOCAL_LLM_VIA_MCP, lines 704-755): when enabled it calls prism_local:local_generate on the MCP server, then falls back to direct HTTP if MCP fails.

2. The MCP dispatcher side of that pattern is localDispatcher.ts (H:/PRISM/mcp-server/src/tools/dispatchers/localDispatcher.ts:1-518). It wires the external service into the MCP tool surface:
   - A z.enum action list (line 506), Zod-validated input schemas imported from a separate schema file (lines 38-46), lazy-loaded engine refs (lines 67-96).
   - The local_generate action (lines 396-437) is the thin MCP wrapper that reaches down to OllamaTaskOffloaderEngine via getEngine("offloader"), which in turn makes the actual HTTP call to Ollama. This is the seam that ask-ollama.mjs routes through when PRISM_LOCAL_LLM_VIA_MCP=1.
   - Return shape: { success, content, error, model, latencyMs, ollamaUsed, tokensSaved } (lines 413-436).

3. wire-hermes-local-backend.mjs (H:/PRISM/scripts/wire-hermes-local-backend.mjs:1-193) is a configuration-only utility (patches Hermes config.yaml) — it does NOT call Hermes programmatically. It shows PRISM knows Hermes lives at 127.0.0.1:9120 (HERMES_WEBUI) and exposes an OpenAI-compatible /v1 endpoint at
... [+5375 chars truncated]
