---
type: "chat-session"
source: "claude-code-cli"
session_id: "3db3fb3d-9fab-4499-8289-0ce871ee5620"
title: "You are the consolidated peer reviewer for the ACServer bridge build shipped thi"
date: "2026-05-20"
first_ts: "2026-05-20T04:43:46.255Z"
last_ts: "2026-05-20T04:52:43.392Z"
cwd: "H:\\prism\\.claude\\worktrees\\agent-a4553ad14430ed1b4"
messages: 29
user_msgs: 13
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/3db3fb3d-9fab-4499-8289-0ce871ee5620/subagents/agent-a4553ad14430ed1b4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# You are the consolidated peer reviewer for the ACServer bridge build shipped thi

> **claude-code-cli** | 2026-05-20 | 29 msgs (13 user / 16 assistant) | cwd: H:\prism\.claude\worktrees\agent-a4553ad14430ed1b4
> Raw: `H:/.claude/projects/H--prism/3db3fb3d-9fab-4499-8289-0ce871ee5620/subagents/agent-a4553ad14430ed1b4.jsonl`

## Transcript

### User | 2026-05-20T04:43:46.255Z

You are the consolidated peer reviewer for the ACServer bridge build shipped this session. Review these files with staff-engineer rigor:

1. `H:/prism/mcp-server/src/engines/HyperMillACBridgeEngine.ts` — NEW loopback HTTP companion server (~400 LOC). Routes: /status, /execute, /job-status, /extract, /optimize. Uses node:http directly, no framework. Loopback-only validated via HyperMillACServerConfig.

2. `H:/prism/mcp-server/src/__tests__/HyperMillACBridgeEngine.test.ts` — NEW vitest suite. Covers happy path + failure modes + adversarial + lifecycle + a SKIPPED live-test scaffold gated on PRISM_HYPERMILL_LIVE=1.

3. `H:/prism/mcp-server/python/prism_ac/__init__.py` — NEW host-side Python module operators install per hyperMILL workstation. Functions: ping, open_project, geometry_json, operation_tree_json, export_step, close_project, extract_databases, optimize_ppp. Mock-safe when `hm` module is absent.

4. `H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts` — EDITED. Added 4 actions to the z.enum list + 4 case handlers:
   - cam_hypermill_drive (calls existing peer-shipped HyperMILLAutomationBridge — op-discriminated)
   - cam_hypermill_ac_bridge_start
   - cam_hypermill_ac_bridge_stop
   - cam_hypermill_ac_bridge_status

CONTEXT — the audit that drove this build:
- `H:/prism/state/shared/specs/ACSERVER-BRIDGE-AUDIT-2026-05-20.md` — declared the missing pieces I just built
- `H:/prism/state/shared/specs/PRINT-TO-INSPECTION-PIPELINE-V2.md` — Route A (hyperCAD-S setup-first) depends on this bridge stack working

REVIEW MANDATE:

A. **HyperMillACBridgeEngine.ts** — verify:
   - Loopback-only enforcement (must reject 0.0.0.0)
   - CORS only allows hyperCAD-S panel origins
   - Job map TTL works (1h, periodic reap, no leak)
   - Max-concurrent enforcement (503 when exceeded)
   - Payload size limit (1MB, 413 when exceeded)
   - No floating promises that could swallow errors
   - Compatible with HyperMillACScriptExecutor's actual contract (read both files; do they
... [+2074 chars truncated]

### Assistant | 2026-05-20T04:51:29.332Z

I'll read all four files plus the referenced context files in parallel.

### Assistant | 2026-05-20T04:51:29.838Z

[tool_use: Read]

### Assistant | 2026-05-20T04:51:30.370Z

[tool_use: Read]

### Assistant | 2026-05-20T04:51:30.845Z

[tool_use: Read]

### Assistant | 2026-05-20T04:51:30.845Z

[tool_use: Read]

### User | 2026-05-20T04:51:35.780Z

[tool_result] File content (998.7KB) exceeds maximum allowed size (256KB). Use offset and limit parameters to read specific portions of the file, or search for specific content instead of reading the whole file.

### User | 2026-05-20T04:51:38.265Z

[tool_result] 1	/**
2	 * HyperMillACBridgeEngine — Loopback HTTP companion server for OPEN MIND
3	 * Automation Center (AC) / hyperCAD-S / hyperMILL.
4	 *
5	 * Implements the routes defined by `HyperMillACServerConfig`:
6	 *   GET  /status       → { status, version, uptime_ms, mockMode, activeJobs }
7	 *   POST /execute      → { jobId } — fire-and-track Python script against AC
8	 *   GET  /job-status   → { job
... [+17739 chars truncated]

### User | 2026-05-20T04:51:38.284Z

[tool_result] 1	/**
2	 * Tests for HyperMillACBridgeEngine — loopback HTTP companion server.
3	 *
4	 * Coverage matrix (per CLAUDE.md comprehensive-build-enforce):
5	 *   happy path:          /status, /execute, /job-status, /extract, /optimize
6	 *   failure modes (≥3):  bad json, missing fields, max_concurrent, unknown job, payload too large
7	 *   adversarial (≥2):    non-loopback bind rejected, oversize body
... [+13740 chars truncated]

### User | 2026-05-20T04:51:38.347Z

[tool_result] 1	"""
2	prism_ac — Host-side Python bridge between PRISM TypeScript and OPEN MIND
3	Automation Center (AC) running on a hyperMILL / hyperCAD-S workstation.
4	
5	This module is INSTALLED ON EACH HYPERMILL HOST — NOT bundled inside the PRISM
6	MCP server. The TS-side HyperMillACScriptExecutor spawns `python -c <script>`,
7	and those scripts `import prism_ac as prism` and call the functions below.
8	
... [+15375 chars truncated]

### Assistant | 2026-05-20T04:51:40.675Z

Now I need to read the relevant supporting files to cross-check contracts.

### Assistant | 2026-05-20T04:51:41.645Z

[tool_use: Glob]

### Assistant | 2026-05-20T04:51:42.154Z

[tool_use: Glob]

### Assistant | 2026-05-20T04:51:42.824Z

[tool_use: Glob]

### User | 2026-05-20T04:51:45.685Z

[tool_result] H:\prism\mcp-server\src\engines\HyperMillACServerConfig.ts

### User | 2026-05-20T04:51:45.687Z

[tool_result] H:\prism\mcp-server\src\engines\HyperMILLAutomationBridge.ts

### User | 2026-05-20T04:51:45.734Z

[tool_result] H:\prism\mcp-server\src\engines\HyperMillACScriptExecutor.ts

### Assistant | 2026-05-20T04:51:47.895Z

[tool_use: Read]

### Assistant | 2026-05-20T04:51:47.900Z

[tool_use: Read]

### Assistant | 2026-05-20T04:51:48.372Z

[tool_use: Read]

### User | 2026-05-20T04:51:50.384Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\HyperMILLAutomationBridge.ts' was already read 26m ago in this session and is unchanged (mtime 1776626924998). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ
... [+9 chars truncated]

### User | 2026-05-20T04:51:50.837Z

[tool_result] 1	/**
2	 * HyperMillACServerConfig — Automation Center Companion HTTP Server Configuration
3	 *
4	 * Provides configuration for the PRISM-side AC companion HTTP server that
5	 * bridges MCP commands to hyperMILL's Automation Center API.
6	 *
7	 * Key design decisions:
8	 *   - Binds ONLY to 127.0.0.1 (loopback) — never 0.0.0.0 — preventing
9	 *     unintended network exposure on shop-floor machine
... [+7479 chars truncated]

### User | 2026-05-20T04:51:51.780Z

[tool_result] 1	/**
2	 * HyperMillACScriptExecutor — Sandboxed Python script execution for
3	 * OPEN MIND AutomationCenter (AC).
4	 *
5	 * Used by HyperMILLAutomationBridge to run small scripts that drive AC via
6	 * its `prism_ac` Python module. In mock mode the executor returns
7	 * deterministic success with fixture stdout so the AC bridge and its tests
8	 * run without a live hyperMILL installation.
9	 *
10
... [+4965 chars truncated]

### Assistant | 2026-05-20T04:51:54.888Z

Now let me check the camDispatcher.ts edits specifically — just the new actions and their handlers.

### Assistant | 2026-05-20T04:51:56.334Z

[tool_use: Grep]

### Assistant | 2026-05-20T04:51:57.399Z

[tool_use: Grep]

### User | 2026-05-20T04:52:02.669Z

[tool_result] 1621-  "cam_hypermill_skill_registry_stats",
1622-  "cam_hypermill_medical_get_profile",
1623-  "cam_hypermill_medical_resolve_material",
1624-  "cam_hypermill_medical_list_profiles",
1625-  "cam_hypermill_xml_parse_feature2job",
1626-  "cam_hypermill_xml_parse_post_config",
1627-  "cam_hypermill_xml_extract_post_config",
1628-  "cam_hypermill_xml_extract_all",
1629:  "cam_hypermill_ac_server_buil
... [+7576 chars truncated]

### User | 2026-05-20T04:52:02.670Z

[tool_result] 595-    case "hyperMillToolBridge": return _hyperMillToolBridge ??= (await import("../../engines/BatchCAMToolBridgeEngines.js")).hyperMillToolBridgeEngine;
596-    // E1144 — BatchCAMAPIBridgeEngines (4 engines)
597-    case "mastercamNETBridge":   return _mastercamNETBridge   ??= (await import("../../engines/BatchCAMAPIBridgeEngines.js")).mastercamNETBridgeEngine;
598-    case "solidCAMSWBridge":
... [+5015 chars truncated]

### Assistant | 2026-05-20T04:52:43.392Z

I now have all the information needed. Here is the verdict.

---

## Review: ACServer Bridge Build — CAD-FUSION-LIVE-MS0/U-ACBRIDGE

Reviewing: `HyperMillACBridgeEngine.ts`, `HyperMillACBridgeEngine.test.ts`, `prism_ac/__init__.py`, `camDispatcher.ts` (4 new actions).

---

## CRITICAL FINDINGS (P0 — must fix before live test)

**P0-1: Payload-size guard has a write-after-destroy race**
Confidence: 90

`H:/prism/mcp-server/src/engines/HyperMillACBridgeEngine.ts`, lines 229–235

When the 1 MB limit is exceeded, the code calls `req.destroy()` and then calls `this.sendJson(res, 413, ...)`. After `req.destroy()`, the socket is torn down. `res.writeHead` on a destroyed socket throws `ERR_HTTP_HEADERS_SENT` or silently no-ops depending on Node version — on a live operator machine this will crash the request handler with an unhandled synchronous exception inside `readJsonBody`, which propagates up to `handleRequest`'s outer `try/catch` and emits a spurious 500 alongside the (never-delivered) 413. The operator sees a 500 instead of 413, and the `req.on("data")` handler continues firing on subsequent chunks before the stream fully closes because `req.destroy()` is non-synchronous.

Fix: set a `sizeLimitHit` boolean flag, return early from the `data` handler on subsequent chunks, and send the 413 response before (or without) calling `req.destroy()`:

```ts
req.on("data", (chunk: Buffer) => {
  if (sizeLimitHit) return;
  total += chunk.length;
  if (total > MAX_BODY) {
    sizeLimitHit = true;
    this.sendJson(res, 413, { error: "payload_too_large", limitBytes: MAX_BODY });
    req.destroy();
    return;
  }
  chunks.push(chunk);
});
req.on("end", () => {
  if (sizeLimitHit) return;
  // ... rest of parsing
});
```

---

**P0-2: `cam_hypermill_drive` imports the wrong file — will throw MODULE_NOT_FOUND on every call**
Confidence: 95

`H:/prism/mcp-server/src/tools/dispatchers/camDispatcher.ts`, line 14133

```ts
const { hypermillAutomationBridge } = await import("../../engin
... [+4142 chars truncated]
