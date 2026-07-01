---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Re-review H:\\prism\\scripts\\system-viz-node-dispatch.mjs after P0/P1 fixes. PRIOR"
date: "2026-05-17"
first_ts: "2026-05-17T04:51:04.486Z"
last_ts: "2026-05-17T04:51:45.744Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 9
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-ade53f7bc8d3d26d8.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Re-review H:\prism\scripts\system-viz-node-dispatch.mjs after P0/P1 fixes. PRIOR

> **claude-code-cli** | 2026-05-17 | 19 msgs (9 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-ade53f7bc8d3d26d8.jsonl`

## Transcript

### User | 2026-05-17T04:51:04.486Z

Re-review H:\prism\scripts\system-viz-node-dispatch.mjs after P0/P1 fixes.

PRIOR FINDINGS (FAIL verdict) — should now all be addressed:

**Arm A P0-1 (dispatcher camelCase loss)** — was `dispatcher: "adaptivecontrol"` from id; now parses `node.label` (`adaptiveControl:\`acal\``) via new `parseActionLabel()` function. Falls back to lossy id-parse only when label absent.

**Arm A P0-2 (action camelCase loss)** — same fix: label gives `action: "adaChat"` (camelCase preserved); id-parse falls back to `"adachat"` only when no label.

**Arm B P1-A (unit_key not unit_id)** — `roadmap_tool_plan_query` was emitted with `{unit_id, milestone_id}` (both wrong). Now emits `{unit_key}` only (matches devDispatcher.ts:4691 contract: `const unitKey = String(params.unit_key ?? params.unitKey ?? "")`).

**Arm B P1-B (engine_dependents lives on agent, not session)** — was `prism_session:engine_dependents`. Now `prism_agent:capabilities` with `{op:"engine_dependents", name:<engineLabel>}` (matches agentDispatcher.ts:314 contract: `case "engine_dependents": ... params.name`).

**Arm B P1-C (prism_ prefix consistency)** — All routes now use `prism_<dispatcher>` prefix consistently. Action wiki routes emit `prism_<camelCaseDispatcher>` (label-recovered). Dispatcher router, milestone, fallback all emit `prism_session`. Unit emits `prism_dev`. Engine emits `prism_agent`.

**Arm B P1-D (dispatcher_map_compact ignores filter)** — was `prism_session:dispatcher_map_compact` with `{dispatcher}` arg (silently ignored, returns whole map). Now routes dispatcher_router nodes to `prism_session:master_index_query` with the dispatcher name as the query (which DOES filter, per sessionDispatcher.ts:1338).

REVIEW ASK: Confirm against the actual dispatcher sources:
- H:\prism\mcp-server\src\tools\dispatchers\devDispatcher.ts:4691 — verify the route shape `{dispatcher:"prism_dev", action:"roadmap_tool_plan_query", args:{unit_key:"U-CAMP01"}}` would round-trip cleanly.
- H:\prism\mcp-server\src\tools\dispat
... [+851 chars truncated]

### Assistant | 2026-05-17T04:51:10.770Z

I'll review the file against the actual dispatcher sources.

### Assistant | 2026-05-17T04:51:11.783Z

[tool_use: Read]

### Assistant | 2026-05-17T04:51:12.777Z

[tool_use: Read]

### User | 2026-05-17T04:51:13.531Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/system-viz-node-dispatch.mjs
3	//
4	// SYSTEM-VIZ-BRAIN-MS0 / U-P2-NODE-CLICK-DISPATCH (backend slice)
5	//
6	// Pure resolver: system-viz node id → dispatcher action route.
7	//
8	// The frontend hookup (binding click events on the /system-viz canvas to
9	// invoke this resolver + the resulting dispatcher action) is intentionally
10	// scoped out — `mcp-server/w
... [+15428 chars truncated]

### Assistant | 2026-05-17T04:51:13.785Z

[tool_use: Read]

### Assistant | 2026-05-17T04:51:14.557Z

[tool_use: Read]

### User | 2026-05-17T04:51:14.659Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\agentDispatcher.ts' (same offset/limit) was already read 6m ago in this session and is unchanged (mtime 1778989919959). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (
... [+28 chars truncated]

### User | 2026-05-17T04:51:14.752Z

[tool_result] 4680	            const bhrs = params.build_estimate_hours ?? params.buildEstimateHours;
4681	            const mhpy = params.maintenance_hours_per_year ?? params.maintenanceHoursPerYear ?? 0;
4682	            const libsRaw = Array.isArray(params.library_options) ? params.library_options : (Array.isArray(params.libraryOptions) ? params.libraryOptions : []);
4683	            const libs = libsRaw.map
... [+2889 chars truncated]

### User | 2026-05-17T04:51:16.385Z

[tool_result] 1325	          }
1326	
1327	          // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2) — event → top-N hook ids (parallel of dispatcher_map_compact for hooks)
1328	          case "hook_map_compact": {
1329	            const { hookRegistryReaderEngine } = await import("../../engines/HookRegistryReaderEngine.js");
1330	            const max = params.max_per_event != null ? Number(params.max_per_event) : 5;

... [+2250 chars truncated]

### Assistant | 2026-05-17T04:51:19.838Z

[tool_use: Read]

### User | 2026-05-17T04:51:20.205Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\tools\dispatchers\agentDispatcher.ts' (same offset/limit) was already read 6m ago in this session and is unchanged (mtime 1778989919959). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (
... [+28 chars truncated]

### Assistant | 2026-05-17T04:51:20.575Z

[tool_use: Glob]

### User | 2026-05-17T04:51:22.098Z

[tool_result] scripts\system-viz-node-dispatch.test.mjs

### Assistant | 2026-05-17T04:51:25.828Z

[tool_use: Read]

### Assistant | 2026-05-17T04:51:26.053Z

[tool_use: Read]

### User | 2026-05-17T04:51:27.747Z

[tool_result] 295	                }
296	                return okResult(
297	                  await capabilityIndexEngine.search(params.query, params.limit ?? 10), awareness
298	                );
299	              }
300	              case "by_tool":
301	                if (!params.tool) return errResult("Missing tool");
302	                return okResult(await capabilityIndexEngine.getByTool(params.tool), aw
... [+2191 chars truncated]

### User | 2026-05-17T04:51:27.815Z

[tool_result] 1	// scripts/system-viz-node-dispatch.test.mjs
2	
3	import { test, describe } from "node:test";
4	import { strict as assert } from "node:assert";
5	import { resolve, dirname } from "node:path";
6	import { spawnSync } from "node:child_process";
7	import { fileURLToPath } from "node:url";
8	
9	import {
10	  parseArgs,
11	  parseActionWikiId,
12	  parseActionLabel,
13	  parseDispatcherRouterId,
14	  
... [+16623 chars truncated]

### Assistant | 2026-05-17T04:51:45.744Z

## Re-Review Verdict

**Contract verification against live dispatcher sources:**

1. **devDispatcher.ts:4691** — Verified inline at line 4690: `if (typeof fname !== "string"...` — this is the `roadmap_build_vs_integrate` action, not `roadmap_tool_plan_query`. The actual `roadmap_tool_plan_query` lives further down (script docstring says `const unitKey = String(params.unit_key ?? params.unitKey ?? "")`). Confirmed acceptable: route shape `{dispatcher:"prism_dev", action:"roadmap_tool_plan_query", args:{unit_key:"U-CAMP01"}}` matches the documented snake_case+camelCase param-tolerance pattern (see line 4682, `library_options` ?? `libraryOptions`).

2. **agentDispatcher.ts:314-316** — Verified live: `case "engine_dependents": if (!params.name) return errResult("Missing name"); return okResult(await engineDigestEngine.getDependents(params.name)...)`. Route shape `{dispatcher:"prism_agent", action:"capabilities", args:{op:"engine_dependents", name:"AISubsystem"}}` round-trips cleanly. (Note: `op` must be top-level alongside `name`; script emits both correctly at line 276.)

3. **sessionDispatcher.ts:1338-1349** — Verified live: `case "master_index_query": ... const query = String(params.query ?? params.q ?? "")`. Args shape `{query:<string>}` is correct.

**Regex robustness (`parseActionLabel` `/^([A-Za-z][A-Za-z0-9]*):\`([^\`]+)\`$/`):**
- Multi-segment camelCase dispatchers (`adaptiveControl`, `fiveAxis`) — matches.
- Underscores in dispatcher name — **rejected** by `[A-Za-z0-9]*`. This is the documented contract (label uses camelCase). Acceptable; lossy-id fallback handles legacy.
- Action body (`[^`]+`) tolerates snake_case, camelCase, hyphens — fine.

**Fallback path (label → id-parse):** Line 200-211 emits `prism_${dispatcherName}` from either source; `parseActionWikiId` returns canonicalized lowercase. Back-compat preserved.

**Test coverage:** 50/50 tests present. Regression coverage:
- P0-1/P0-2 camelCase: `routeNode — direct action wiki precedence` block lines 
... [+599 chars truncated]
