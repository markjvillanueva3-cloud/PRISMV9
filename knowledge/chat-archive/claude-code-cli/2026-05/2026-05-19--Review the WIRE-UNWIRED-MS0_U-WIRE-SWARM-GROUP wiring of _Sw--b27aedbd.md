---
type: "chat-session"
source: "claude-code-cli"
session_id: "b27aedbd-e3dc-4ad4-8d70-302aab2a3861"
title: "Review the WIRE-UNWIRED-MS0/U-WIRE-SWARM-GROUP wiring of `SwarmGroupExecutor` in"
date: "2026-05-19"
first_ts: "2026-05-19T02:03:58.619Z"
last_ts: "2026-05-19T02:06:11.080Z"
cwd: "H:\\prism-slot-charlie\\mcp-server"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a6b80c1468cbbc9bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:40"
---

# Review the WIRE-UNWIRED-MS0/U-WIRE-SWARM-GROUP wiring of `SwarmGroupExecutor` in

> **claude-code-cli** | 2026-05-19 | 11 msgs (5 user / 6 assistant) | cwd: H:\prism-slot-charlie\mcp-server
> Raw: `H:/.claude/projects/H--prism-slot-charlie/b27aedbd-e3dc-4ad4-8d70-302aab2a3861/subagents/agent-a6b80c1468cbbc9bf.jsonl`

## Transcript

### User | 2026-05-19T02:03:58.619Z

Review the WIRE-UNWIRED-MS0/U-WIRE-SWARM-GROUP wiring of `SwarmGroupExecutor` into the `prism_orchestrate` dispatcher. Three files changed in worktree H:\prism-slot-charlie:

1. `mcp-server/src/tools/dispatchers/orchestrationDispatcher.ts` — added `"swarm_group_execute"` to the `ACTIONS` const array (~line 75) and a `case "swarm_group_execute":` handler before the `default:` case (~line 902).
2. `mcp-server/src/schemas/orchestrationActionSchemas.ts` — added a `swarm_group_execute` Zod schema const (~line 149) and registered it in the `ACTION_ORCHESTRATION_SCHEMAS` map.
3. The engine: `mcp-server/src/engines/SwarmGroupExecutor.ts` — UNCHANGED; exports `executeSwarmGroups(groups: TaskGroup[], timeout_ms=45000): Promise<SwarmGroupResult>`.

CONTRACT: the engine was a genuine unwired engine (BUILD_STATE.NEEDS_WIRING, 0 dispatcher refs, 365 lines, no stubs). The wiring must: (a) make the action reachable via `z.enum(ACTIONS)`; (b) the handler must lazy-import + actually CALL `executeSwarmGroups` and return its result; (c) the Zod schema must match the action and the engine's TaskGroup shape; (d) NOT regress the dispatcher's other actions.

Read all 3 changed regions (the dispatcher case ~895-928, the ACTIONS array ~73-78, the schema const + map registration) AND the engine's `executeSwarmGroups` signature + `TaskGroup`/`SwarmGroupResult` interfaces (lines 29-132). Verify:
1. The `case` matches the conventions of the adjacent `agent_recommend` case (lazy import, `ok()` wrapper, error handling, `params` access).
2. The handler's param handling: it reads `p.groups` (rejects non-array/empty), and `p.timeoutMs`/`p.timeout_ms` (paramNormalizer maps snake→camel) — is the timeout fallback logic correct? Does the engine's own 45000 default still apply when omitted?
3. Does the Zod schema's `groups[]` object shape match the engine's `TaskGroup` interface (groupId, name, pattern, agents, input?, timeout_ms?, dependsOn?, wave?)? Any field mismatch?
4. Type safety: the `Parameters<ty
... [+315 chars truncated]

### Assistant | 2026-05-19T02:04:58.634Z

I'll review the three changed files for the SwarmGroupExecutor wiring. Let me read all the relevant regions.

### Assistant | 2026-05-19T02:04:59.490Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:00.296Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:01.597Z

[tool_use: Read]

### Assistant | 2026-05-19T02:05:01.857Z

[tool_use: Read]

### User | 2026-05-19T02:05:15.544Z

[tool_result] 1	/**
2	 * SwarmGroupExecutor.ts — Multi-group swarm orchestration engine
3	 *
4	 * Executes multiple TaskGroups in two passes:
5	 *   1. Independent groups via Promise.allSettled (parallel)
6	 *   2. Dependent groups sequentially, with dependency outputs injected
7	 *
8	 * Reuses SwarmExecutor.execute() internally — each group IS a swarm.
9	 */
10	import { executeSwarm, type SwarmPattern } from "
... [+12834 chars truncated]

### User | 2026-05-19T02:05:16.596Z

[tool_result] 1	/**
2	 * Orchestration Dispatcher - Consolidates orchestrationV2 (8) + swarmToolsV2 (6) + roadmapExec (4) = 18 tools → 1
3	 * Tool: prism_orchestrate
4	 * Actions: agent_execute, agent_parallel, agent_pipeline, plan_create, plan_execute, plan_status,
5	 *          queue_stats, session_list, swarm_execute, swarm_parallel, swarm_consensus, swarm_pipeline,
6	 *          swarm_status, swarm_patterns
... [+5893 chars truncated]

### User | 2026-05-19T02:05:18.068Z

[tool_result] 820	            }
821	          }
822	          case "cognitive_learning_loop_stats": {
823	            try {
824	              const { learningLoopEngine } = await import("../../engines/LearningLoopEngine.js");
825	              const stats = await learningLoopEngine.getStats();
826	              return ok({ stats });
827	            } catch (e: any) {
828	              return ok({ stats: null, e
... [+8285 chars truncated]

### User | 2026-05-19T02:05:18.205Z

[tool_result] 1	/**
2	 * Orchestration Dispatcher Action Schemas
3	 * ========================================
4	 * Per-action Zod schemas for all 31 prism_orchestrate actions.
5	 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
6	 *
7	 * Design decisions:
8	 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
9	 * - Only enforce fields the engine actually reads
1
... [+17914 chars truncated]

### Assistant | 2026-05-19T02:06:11.080Z

I have all three changed regions plus the engine signature. Let me verify a couple of details about the engine's `TaskGroup.input` field and the adjacent `agent_recommend` conventions before finalizing.

The key observation I need to confirm: the engine's `TaskGroup.input` is **required** (`input: Record<string, unknown>`, line 34 — no `?`), but the Zod schema marks it `.optional()` (line 158). Let me check how the engine uses `group.input`.

The engine reads `group.input` at line 308 (`{ ...group.input }`). Spreading `undefined` is safe in JS (`{...undefined}` → `{}`), so a runtime crash won't occur — but there is a contract mismatch worth flagging.

Now let me write up the review.

## Code Quality Analysis Report

### Summary
- Files reviewed: 3 (2 changed, 1 unchanged engine)
- Overall wiring quality: High — the wiring is sound, idiomatic, and non-regressing
- Issues found: 0 P0, 0 P1, 2 P2, 2 P3

### Verification against contract

**(a) Action reachable via `z.enum(ACTIONS)`** — PASS. `"swarm_group_execute"` added to `ACTIONS` (orchestrationDispatcher.ts:76), correctly comma-separated after `"agent_recommend"` (line 74 ends with `,`), inside the `as const` array consumed by `z.enum(ACTIONS)` at line 91.

**(b) Handler lazy-imports + calls `executeSwarmGroups` + returns result** — PASS. orchestrationDispatcher.ts:910 `const { executeSwarmGroups } = await import("../../engines/SwarmGroupExecutor.js")`; the result is awaited and returned via `ok({ success: true, ...result })` (line 927). Spreading `SwarmGroupResult` is sound — no key collides with `success`.

**(c) Zod schema matches action + engine `TaskGroup` shape** — PASS with one P2 mismatch (below). Schema const `swarm_group_execute` (orchestrationActionSchemas.ts:152-164) registered in `ACTION_ORCHESTRATION_SCHEMAS` map (line 287). Action name, schema const name, and map key all match exactly.

**(d) No regression to other actions** — PASS. Action count increases by exactly 1; no existing `case`, `ACTIONS` e
... [+7471 chars truncated]
