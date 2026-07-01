---
type: "chat-session"
source: "claude-code-cli"
session_id: "a61bbf34-4093-44f3-a8af-e68d61dc41a9"
title: "Independent second-pass review of H:\\prism\\scripts\\system-viz-node-dispatch.mjs "
date: "2026-05-17"
first_ts: "2026-05-17T04:43:09.526Z"
last_ts: "2026-05-17T04:44:54.764Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 14
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-aeb0c71142950b0eb.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Independent second-pass review of H:\prism\scripts\system-viz-node-dispatch.mjs 

> **claude-code-cli** | 2026-05-17 | 33 msgs (14 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/a61bbf34-4093-44f3-a8af-e68d61dc41a9/subagents/agent-aeb0c71142950b0eb.jsonl`

## Transcript

### User | 2026-05-17T04:43:09.526Z

Independent second-pass review of H:\prism\scripts\system-viz-node-dispatch.mjs (read end-to-end).

CONTEXT: New backend-only resolver for SYSTEM-VIZ-BRAIN-MS0 / U-P2-NODE-CLICK-DISPATCH. Maps system-viz graph node IDs to dispatcher actions. ~230 LOC, 9 exports, 41/41 tests PASS (including real-data E2E against the 145K-node live system-graph).

Frontend hookup deferred — `mcp-server/web/` is heavy peer-claim contention right now (4 chats actively claim CAD/memory/dev dispatchers + schemas + tests this session).

You are Arm B — weighted on:
- Integration with the actual prism dispatchers (does the route shape match what dispatchers actually accept?)
- Hidden coupling (does the resolver silently break if the system-graph regenerator renames node fields?)
- Real-value testability (resolver returns plain objects — but are the dispatcher names + action names the LIVE ones?)
- Convention conformance vs sibling scripts (system-viz-action-overlay, system-viz-ghost-report)
- Inlined-paths / inlined-constants

SPECIFIC P0/P1 CHECKS:

1. **Dispatcher-name canonicalization** — `canonicalizeDispatcher` lowercases the input. Action wiki IDs use lowercase dispatcher names (`actions_calc_...`, `actions_adaptivecontrol_...`). But the actual dispatcher action enums are camelCase: `adaptiveControl`, `camFunction`, etc. The resolver emits `dispatcher: "adaptivecontrol"` — that's NOT the prism dispatcher name the frontend would invoke. **Is this a contract bug?** The frontend would call `prism_<dispatcher>:<action>` — but `prism_adaptivecontrol` doesn't exist. The actual contract is the dispatcher_router id (e.g., `formula.adjusted.adaptiveControldispatcher`) preserves case; the action wiki id lowercases it. To get the camelCase dispatcher, the resolver should look up node.label (which is `adaptiveControl:\`acal\``) instead of parsing the id. **CONFIRM or DISPUTE.**

2. **roadmap_tool_plan_query arg shape** — The resolver emits `args: {unit_id, milestone_id}`. Does the prism_dev:roadm
... [+2428 chars truncated]

### Assistant | 2026-05-17T04:43:17.802Z

I'll perform an independent second-pass review of the resolver, focusing on the dispatcher contract correctness.

### Assistant | 2026-05-17T04:43:18.096Z

[tool_use: Read]

### User | 2026-05-17T04:43:19.967Z

[tool_result] read-once-guard: 'H:\prism\scripts\system-viz-node-dispatch.mjs' was already read 29s ago in this session and is unchanged (mtime 1778992848611). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-17T04:43:22.858Z

[tool_use: Bash]

### User | 2026-05-17T04:43:31.107Z

[tool_result] #!/usr/bin/env node
// scripts/system-viz-node-dispatch.mjs
//
// SYSTEM-VIZ-BRAIN-MS0 / U-P2-NODE-CLICK-DISPATCH (backend slice)
//
// Pure resolver: system-viz node id → dispatcher action route.
//
// The frontend hookup (binding click events on the /system-viz canvas to
// invoke this resolver + the resulting dispatcher action) is intentionally
// scoped out — `mcp-server/web/` is peer-claim co
... [+7956 chars truncated]

### Assistant | 2026-05-17T04:43:34.490Z

[tool_use: Bash]

### User | 2026-05-17T04:43:43.047Z

[tool_result] }

export function findNode(graph, nodeId) {
  if (!graph || !Array.isArray(graph.nodes)) return null;
  return graph.nodes.find((n) => n && n.id === nodeId) || null;
}

// --- CLI --------------------------------------------------------------------

export function main(argv = process.argv.slice(2)) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (e) {
    process.stderr.write(`system-viz
... [+1909 chars truncated]

### Assistant | 2026-05-17T04:43:45.972Z

Now let me verify the critical contract concerns by checking the actual dispatcher schemas.

### Assistant | 2026-05-17T04:43:47.478Z

[tool_use: Grep]

### Assistant | 2026-05-17T04:43:49.459Z

[tool_use: Grep]

### Assistant | 2026-05-17T04:43:49.980Z

[tool_use: Glob]

### Assistant | 2026-05-17T04:43:50.208Z

[tool_use: Glob]

### User | 2026-05-17T04:43:50.767Z

[tool_result] Found 3 files
mcp-server\src\tools\dispatchers\devDispatcher.ts
mcp-server\src\tools\dispatchers\agentDispatcher.ts
mcp-server\src\tools\dispatchers\sessionDispatcher.ts

### User | 2026-05-17T04:43:52.847Z

[tool_result] mcp-server\src\tools\dispatchers\devDispatcher.ts:37:"roadmap_intel_assess_complexity", "roadmap_intel_optimize", "roadmap_intel_predict_effort", "roadmap_intel_record_outcome", "roadmap_intel_build_vs_integrate", "roadmap_intel_health", "roadmap_tool_plan_query", "roadmap_tool_plan_build", "roadmap_tool_plan_coverage",
mcp-server\src\tools\dispatchers\devDispatcher.ts:4690:          case "roadmap
... [+721 chars truncated]

### User | 2026-05-17T04:43:53.310Z

[tool_result] scripts\system-viz-action-overlay.mjs

### User | 2026-05-17T04:43:53.341Z

[tool_result] scripts\system-viz-ghost-report.mjs

### Assistant | 2026-05-17T04:43:56.404Z

Critical finding confirmed already — the action expects `unit_key`, not `unit_id`. Let me verify the other action contracts.

### Assistant | 2026-05-17T04:43:57.907Z

[tool_use: Read]

### Assistant | 2026-05-17T04:43:59.299Z

[tool_use: Grep]

### User | 2026-05-17T04:43:59.363Z

[tool_result] 4680	          // SCRIPT-WIRE: RGS tool-plan sidecar (RGS-TOOL-AUTOINVOKE-MS1 / U-DISPATCHER).
4681	          // The 948-plan sidecar at state/shared/roadmap-tool-plans.json had no dispatcher
4682	          // surface — an engine-wiring-doctrine violation per the MS1 punch-list. `query`
4683	          // is a pure in-process JSON read (<100ms, hot-path-safe). `build` + `coverage`
4684	          //
... [+4705 chars truncated]

### User | 2026-05-17T04:44:04.595Z

[tool_result] 129:  "dispatcher_map_compact",
159:  "master_index_query",
1321:          case "dispatcher_map_compact": {
1338:          case "master_index_query": {

### Assistant | 2026-05-17T04:44:09.630Z

Critical contract bugs confirmed. Let me verify the remaining session-dispatcher action shapes.

### Assistant | 2026-05-17T04:44:10.720Z

[tool_use: Read]

### Assistant | 2026-05-17T04:44:12.151Z

[tool_use: Grep]

### Assistant | 2026-05-17T04:44:13.491Z

[tool_use: Grep]

### User | 2026-05-17T04:44:14.480Z

[tool_result] 10: *   node scripts/system-viz-ghost-report.mjs --json                # machine-readable
30:const ARG = { kind: null, subgroup: null, minRoi: 0, unblocks: null, byDomain: false, buildPlan: false, json: false, limit: 15 };
33:  if (a === "--json") ARG.json = true;
42:    console.error("usage: system-viz-ghost-report [--json] [--kind <k>] [--subgroup <s>] [--min-roi <0..1>] [--unblocks <id>] [--by-
... [+172 chars truncated]

### User | 2026-05-17T04:44:14.871Z

[tool_result] mcp-server\src\tools\dispatchers\agentDispatcher.ts:314:              case "engine_dependents":

### User | 2026-05-17T04:44:21.888Z

[tool_result] 1315	          // ================================================================
1316	          case "dispatcher_map": {
1317	            const { dispatcherMapEngine } = await import("../../engines/DispatcherMapEngine.js");
1318	            return ok(dispatcherMapEngine.getCounts());
1319	          }
1320	
1321	          case "dispatcher_map_compact": {
1322	            const { dispatcherMapEngi
... [+3435 chars truncated]

### Assistant | 2026-05-17T04:44:24.561Z

All four contract concerns confirmed. Verifying engine_dependents on the agent dispatcher:

### Assistant | 2026-05-17T04:44:25.565Z

[tool_use: Read]

### User | 2026-05-17T04:44:26.770Z

[tool_result] 310	                return okResult(await engineDigestEngine.findByName(params.name), awareness);
311	              case "engine_deps":
312	                if (!params.name) return errResult("Missing name");
313	                return okResult(await engineDigestEngine.getDependencies(params.name), awareness);
314	              case "engine_dependents":
315	                if (!params.name) return 
... [+1672 chars truncated]

### Assistant | 2026-05-17T04:44:54.764Z

Acknowledged — no edits made in this review. Independent review complete.

---

**GRADE: FAIL (P1 contract bugs)**

## Independent second-pass findings

**P1-A (Check #2) — CONFIRMED. `roadmap_tool_plan_query` arg shape mismatch.**
- Resolver emits: `args: { unit_id, milestone_id }` (snake)
- Dispatcher accepts: `params.unit_key ?? params.unitKey` (line 4691 of `devDispatcher.ts`)
- The action has NO concept of `milestone_id` and NO concept of `unit_id`. The frontend invoking this route would receive `{"error": "Missing required: unit_key (non-empty string)"}`. The MS1 dispatcher tests (`devDispatcher.rgs-tool-plan-wire.test.ts`) all use `unit_key`. Fix: emit `{ unit_key: u.unitId }`. Note the dispatcher does NOT scope-filter by milestone — `milestone_id` should be dropped, not renamed.

**P1-B (Check #3) — CONFIRMED. `engine_dependents` lives on the wrong dispatcher.**
- Resolver routes to: `prism_session:engine_dependents`
- Reality: `engine_dependents` is in `agentDispatcher.ts` (line 314), nested under `capabilities` op. It is NOT in `sessionDispatcher.ts`. The route is fictional on `prism_session`. The frontend call would 404. Fix: either route to `prism_agent` with `{ op: "engine_dependents", name: <engineLabel> }`, or use `prism_session:master_index_node_status` (which DOES exist on session, line 1352).

**P1-C (Check #1) — CONFIRMED. `canonicalizeDispatcher` produces invalid prism_* targets.**
- Action wiki ids use lowercase (`actions_calc_...`) but the actual MCP dispatcher names are `prism_calc`, `prism_session`, `prism_dev` — the dispatcher token is the SUFFIX after `prism_`. The resolver outputs `dispatcher: "calc"` for `actions_calc_X`, which the frontend would need to prefix as `prism_calc`. If the frontend assumes the resolver's `dispatcher` field IS the MCP tool name, the call breaks. Document the contract OR emit `prism_<token>` directly. This is ambiguous-spec, not strictly broken — but every other call site in this resolver emits `prism_session`/`
... [+1914 chars truncated]
