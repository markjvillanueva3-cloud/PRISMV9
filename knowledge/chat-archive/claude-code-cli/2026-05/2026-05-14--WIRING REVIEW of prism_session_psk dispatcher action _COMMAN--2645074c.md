---
type: "chat-session"
source: "claude-code-cli"
session_id: "2645074c-83f3-4487-a236-8695c3e53c2c"
title: "WIRING REVIEW of prism_session:psk dispatcher action (COMMAND-KERNEL-MS0/U-CK01)"
date: "2026-05-14"
first_ts: "2026-05-14T17:41:35.839Z"
last_ts: "2026-05-14T17:46:16.672Z"
cwd: "H:\\prism\\mcp-server"
messages: 61
user_msgs: 25
assistant_msgs: 36
raw_file: "H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-a955ad063bfbed23c.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:08"
---

# WIRING REVIEW of prism_session:psk dispatcher action (COMMAND-KERNEL-MS0/U-CK01)

> **claude-code-cli** | 2026-05-14 | 61 msgs (25 user / 36 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2645074c-83f3-4487-a236-8695c3e53c2c/subagents/agent-a955ad063bfbed23c.jsonl`

## Transcript

### User | 2026-05-14T17:41:35.839Z

WIRING REVIEW of prism_session:psk dispatcher action (COMMAND-KERNEL-MS0/U-CK01).

## Files under review
1. `H:/prism/mcp-server/src/tools/dispatchers/sessionDispatcher.ts` — added `"psk"` to ACTIONS array (after `"cross_session_get_status_line"`) AND a new `case "psk":` block (before `default:`) at ~line 1734.
2. `H:/prism/mcp-server/src/schemas/sessionActionSchemas.ts` — added `psk` schema to ACTION_SESSION_SCHEMAS map (before the closing `};`).
3. `H:/prism/.claude/kernel/psk.mjs` — the dispatch target (~660 LOC; you can READ relevant sections but the bulk was reviewed in the prior scrutiny pass).

## Unit contract this wiring must satisfy

Exit conditions from `mcp-server/data/milestones/COMMAND-KERNEL-MS0.json` U-CK01:
- "prism_session:psk MCP action round-trips a syscall via the dispatcher" — meaning a caller can invoke `prism_session` with `{action:"psk", params:{syscall:"manifest", params:{}}}` and get a structured result back.
- "validation: import|enum|schema|round-trip test all present and the test asserts a real psk syscall payload (not a stub)"

Dispatcher conventions from `H:/.claude/rules/dispatchers.md` + `H:/prism/mcp-server/src/tools/.claude/CLAUDE.md`:
- Every action MUST be in the z.enum() list (line 343 of dispatcher: `z.enum(ACTIONS)`).
- Lazy imports: `const { Engine } = await import(path)`.
- Schema file must exist for every dispatcher action group.
- Action names use snake_case.
- Never decrease total action count (anti-regression).
- Return `{success: true, data: {...}}` pattern.

## Read each file end-to-end + grade

Grade each axis P0/P1/P2/P3:

1. **Import wiring completeness.** Does the case block correctly import psk.mjs via a path that survives both source-mode (`npx vitest run` against TS) AND bundled-mode (esbuild dist)? The path uses `PATHS.PRISM_ROOT + .claude/kernel/psk.mjs` joined + `pathToFileURL().href` for ESM. Walk: does PATHS.PRISM_ROOT resolve correctly when the dispatcher runs from `mcp-server/dist/index.js` (bundled)? Wh
... [+3580 chars truncated]

### Assistant | 2026-05-14T17:41:39.501Z

I'll read all three files systematically before grading each axis.

### Assistant | 2026-05-14T17:41:40.361Z

[tool_use: Read]

### Assistant | 2026-05-14T17:41:40.527Z

[tool_use: Read]

### User | 2026-05-14T17:41:44.021Z

[tool_result] 1	/**
2	 * Session Dispatcher — 48 actions for session lifecycle, state management, and context control.
3	 *
4	 * Manages cross-session persistence (memory_save/recall), context pressure monitoring,
5	 * state checkpointing (auto_checkpoint, checkpoint_enhanced), WIP capture/restore,
6	 * workflow tracking, system introspection (system_snapshot, dispatcher_map, action_search),
7	 * and intent-bas
... [+2369 chars truncated]

### User | 2026-05-14T17:41:45.909Z

[tool_result] 1	/**
2	 * sessionActionSchemas.ts — Zod action schemas for sessionDispatcher
3	 *
4	 * Validated AFTER normalizeParams(), BEFORE the switch(action) dispatch.
5	 *
6	 * Design decisions:
7	 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
8	 * - Only enforce fields the dispatcher actually reads
9	 * - Aliases are resolved by normalizeParams before validation

... [+796 chars truncated]

### Assistant | 2026-05-14T17:41:49.157Z

Let me read the relevant sections of all three files systematically.

### Assistant | 2026-05-14T17:41:49.926Z

[tool_use: Read]

### Assistant | 2026-05-14T17:41:50.958Z

[tool_use: Read]

### User | 2026-05-14T17:42:00.557Z

[tool_result] 1	/**
2	 * sessionActionSchemas.ts — Zod action schemas for sessionDispatcher
3	 *
4	 * Validated AFTER normalizeParams(), BEFORE the switch(action) dispatch.
5	 *
6	 * Design decisions:
7	 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
8	 * - Only enforce fields the dispatcher actually reads
9	 * - Aliases are resolved by normalizeParams before validation

... [+3377 chars truncated]

### User | 2026-05-14T17:43:09.062Z

[tool_result] 155	  "master_index_query",
156	  "master_index_node_status",
157	  // OBSIDIAN-PRISM-OS-MS0/U-NODE-UTILIZATION: graph-wide utilization classifier (hub/sink/source/orphan/ghost)
158	  "master_index_utilization_dashboard",
159	  // COORD-MS0/U-COORD04: CrossSessionOrchestratorEngine unified facade — claim/broadcast/handoff over the 3 cross-session primitives
160	  "cross_session_get_session_id",
16
... [+1774 chars truncated]

### Assistant | 2026-05-14T17:43:11.855Z

[tool_use: Read]

### Assistant | 2026-05-14T17:43:12.659Z

[tool_use: Grep]

### User | 2026-05-14T17:43:16.427Z

[tool_result] 100	  body: z.string().min(1).describe("Markdown body to persist"),
101	  machine: optStr.describe("Machine hostname; defaults to process hostname"),
102	  family: optStr.describe("Agent family (Claude|Codex|Gemini); default Claude"),
103	  parent_session_id: optStr.describe("Parent session for /compact lineage"),
104	}).passthrough();
105	
106	/** handoff_read — Read a per-session handoff. NO top
... [+3608 chars truncated]

### User | 2026-05-14T17:43:16.429Z

[tool_result] <tool_use_error>InputValidationError: Grep failed due to the following issues:
An unexpected parameter `file_path` was provided
An unexpected parameter `limit` was provided</tool_use_error>

### Assistant | 2026-05-14T17:43:19.942Z

Let me read the ACTIONS array to count entries and find the psk case block.

### Assistant | 2026-05-14T17:43:20.713Z

[tool_use: Read]

### Assistant | 2026-05-14T17:43:21.080Z

[tool_use: Read]

### User | 2026-05-14T17:43:26.119Z

[tool_result] 60	      handoffWriteLocks.delete(sessionId);
61	    }
62	  }
63	}
64	
65	// Fire lifecycle hooks (non-blocking, errors logged but don't break session ops)
66	async function fireLifecycleHook(phase: string, metadata: Record<string, any>): Promise<void> {
67	  try {
68	    await hookExecutor.execute(phase as HookPhase, {
69	      operation: phase,
70	      target: { type: "calculation" as const, id
... [+3044 chars truncated]

### User | 2026-05-14T17:43:26.559Z

[tool_result] 200	  level: optStr,
201	  save: optBool,
202	}).passthrough();
203	
204	// ============================================================================
205	// WIP (3 actions)
206	// ============================================================================
207	
208	/** wip_capture — Capture work-in-progress state */
209	const wip_capture = z.object({
210	  description: optStr,
211	  notes: optS
... [+3135 chars truncated]

### Assistant | 2026-05-14T17:43:29.653Z

Now let me read the schema file tail and the case block for psk in the dispatcher.

### Assistant | 2026-05-14T17:43:30.430Z

[tool_use: Read]

### Assistant | 2026-05-14T17:43:31.020Z

[tool_use: Read]

### User | 2026-05-14T17:43:35.149Z

[tool_result] 300	// ============================================================================
301	
302	/** system_snapshot — Ultra-compact single-line system summary */
303	const system_snapshot = z.object({}).passthrough();
304	
305	/** system_snapshot_layered — Depth-controlled snapshot */
306	const system_snapshot_layered = z.object({
307	  depth: z.enum(["minimal", "standard", "full"]).optional(),
308	}
... [+3976 chars truncated]

### User | 2026-05-14T17:43:37.277Z

[tool_result] 1720	            return ok(outcome);
1721	          }
1722	
1723	          case "cross_session_get_status": {
1724	            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
1725	            return ok(xs.getStatus());
1726	          }
1727	
1728	          case "cross_session_get_other_sessions": {
1729	            const { crossSessio
... [+2027 chars truncated]

### Assistant | 2026-05-14T17:43:42.389Z

Now read the schema file tail for the psk entry, and read PATHS.PRISM_ROOT definition.

### Assistant | 2026-05-14T17:43:43.164Z

[tool_use: Read]

### Assistant | 2026-05-14T17:43:43.985Z

[tool_use: Grep]

### User | 2026-05-14T17:43:47.032Z

[tool_result] 3-import { fileURLToPath } from "node:url";
4-
5-const HERE = path.dirname(fileURLToPath(import.meta.url));
6-const DEFAULT_MCP_SERVER = path.resolve(HERE, "..");
7:const DEFAULT_PRISM_ROOT = path.resolve(DEFAULT_MCP_SERVER, "..");
8-
9-function normalizeWinPath(value: string): string {
10-  return path.resolve(value).replace(/\//g, "\\");
11-}
--
22-  const candidates = [primary, ...alternates].m
... [+2756 chars truncated]

### User | 2026-05-14T17:43:47.180Z

[tool_result] 400	
401	const cross_session_get_session_id = z.object({}).passthrough();
402	
403	const cross_session_claim = z.object({
404	  resource: z.string().min(1).describe("Resource path/id to claim (file path, milestone id, etc.)"),
405	  ttl_ms: z.union([z.string(), z.number()]).optional().describe("TTL in ms; defaults to 180000 (3 min). Capped at 24h."),
406	  reason: optStr.describe("Optional human-r
... [+3824 chars truncated]

### Assistant | 2026-05-14T17:43:50.350Z

Now read the schema export map tail, the psk.mjs dispatch function signature, and check for action count / slimResponse behavior.

### Assistant | 2026-05-14T17:43:51.072Z

[tool_use: Read]

### Assistant | 2026-05-14T17:43:51.676Z

[tool_use: Read]

### Assistant | 2026-05-14T17:43:52.730Z

[tool_use: Grep]

### User | 2026-05-14T17:43:58.816Z

[tool_result] 518	
519	  // WIP
520	  wip_capture,
521	  wip_list,
522	  wip_restore,
523	
524	  // Workflow
525	  workflow_start,
526	  workflow_advance,
527	  workflow_status,
528	  workflow_complete,
529	
530	  // Health & DSL
531	  health_check,
532	  dsl_mode,
533	
534	  // Quick ref & delta
535	  quick_ref_regenerate,
536	  session_delta,
537	  session_bookmark,
538	  session_compare_bookmark,
539	
540	  
... [+2777 chars truncated]

### User | 2026-05-14T17:43:59.149Z

[tool_result] 5- */
6-
7-/**
8: * Slim a response object by removing null/undefined values and empty arrays.
9- */
10:export function slimResponse<T>(response: T): T {
11:  if (response === null || response === undefined) {
12-    return response;
13-  }
14-  if (typeof response !== "object") {
15-    return response;
16-  }
17-  if (Array.isArray(response)) {
18:    return response.map(slimResponse) as T;
19- 
... [+385 chars truncated]

### User | 2026-05-14T17:43:59.500Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * psk — PRISM Syscall Kernel (CLI dispatch shell)
4	 *
5	 * COMMAND-KERNEL-MS0 / U-CK01 — thin dispatch shell only. Declares the
6	 * 10-syscall surface every PRISM slash-command, hook, and MCP caller can
7	 * resolve live state through. The actual per-syscall semantics ship in
8	 * follow-on units:
9	 *   - U-CK02 fills whoami / manifest / position
10	 *   - U-CK03 
... [+2727 chars truncated]

### Assistant | 2026-05-14T17:44:07.440Z

Now read the psk dispatch() signature and return shape, plus the schema export map tail for psk.

### Assistant | 2026-05-14T17:44:07.918Z

[tool_use: Read]

### Assistant | 2026-05-14T17:44:08.674Z

[tool_use: Read]

### User | 2026-05-14T17:44:12.038Z

[tool_result] 596	  awareness_lifecycle_get_history: z.object({
597	    session_id: z.string().min(1).optional().describe("Session id (defaults to 'dispatcher-default')"),
598	  }).passthrough(),
599	
600	  // HTML-PRIMARY-MS0/U-HPS07 — render any Markdown doc/spec → HTML companion (mirrors prism_dev:spec_html_render)
601	  doc_render: z.object({
602	    md: z.string().optional().describe("Markdown content to r
... [+3260 chars truncated]

### User | 2026-05-14T17:44:13.715Z

[tool_result] 60	const TIMEOUT_FAST_MS = 5000;          // stable-session-id, git rev-parse
61	const TIMEOUT_DEFAULT_MS = 10000;      // chat-slots, per-agent-handoff
62	const TIMEOUT_PICK_MS = 30000;         // pick-unit (large lane scan)
63	const MAX_BUFFER_BYTES = 4 * 1024 * 1024;
64	
65	// Record-syscall string caps (P1-4 fix — prevent telemetry-pollution DoS).
66	const RECORD_MAX_STR = 256;
67	const RECORD
... [+4077 chars truncated]

### Assistant | 2026-05-14T17:44:22.787Z

Now read the final tail of the schema export map to find the psk entry and closing brace.

### Assistant | 2026-05-14T17:44:23.544Z

[tool_use: Read]

### Assistant | 2026-05-14T17:44:24.119Z

[tool_use: Read]

### User | 2026-05-14T17:44:28.929Z

[tool_result] 653	  /**
654	   * master_index_utilization_dashboard — Graph-wide utilization classifier.
655	   *
656	   * Buckets every node into hub/sink/source/orphan/ghost/normal based on
657	   * in/out edge degree percentiles + has-docs. Use to answer the standing
658	   * question "what's actually being used?" — orphans + ghosts are the
659	   * audit punch list (built but not wired / dead-code candidate
... [+1507 chars truncated]

### User | 2026-05-14T17:44:29.332Z

[tool_result] 530	      note: "append failed — entry preserved in fallback for retry",
531	      fallback: { entry, file: TELEMETRY_FILE },
532	    };
533	  }
534	}
535	
536	async function syscall_recommend(params) {
537	  // Surface SlashCommandRecommenderEngine + skill-auto-trigger output.
538	  // U-CK15+ wires it into the closed feedback loop. Shell only returns
539	  // a placeholder pointing at the trigge
... [+2538 chars truncated]

### Assistant | 2026-05-14T17:44:32.425Z

Now read the dispatch() export in psk.mjs and check the outer try/catch in the dispatcher.

### Assistant | 2026-05-14T17:44:33.193Z

[tool_use: Read]

### Assistant | 2026-05-14T17:44:33.721Z

[tool_use: Read]

### User | 2026-05-14T17:44:37.047Z

[tool_result] 600	
601	/** Public: list the declared syscalls. Source of truth for --help, MCP, tests. */
602	export function listSyscalls() {
603	  return Object.keys(SYSCALLS);
604	}
605	
606	/** Public: get description of one syscall (or all). */
607	export function describeSyscalls() {
608	  const out = {};
609	  for (const [name, def] of Object.entries(SYSCALLS)) {
610	    out[name] = def.description;
611	
... [+2195 chars truncated]

### User | 2026-05-14T17:44:37.566Z

[tool_result] 340	/** Registers session dispatcher.
341	 * @param server - MCP server instance
342	  * @returns void
343	 */
344	export function registerSessionDispatcher(server: any): void {
345	  server.tool(
346	    "prism_session",
347	    "Session state management: save/load/checkpoint/diff, handoff, memory, context pressure, workflows, health. Use 'action' param.",
348	    { action: z.enum(ACTIONS), param
... [+963 chars truncated]

### Assistant | 2026-05-14T17:44:40.967Z

Now I have everything I need. Let me do the final action count to verify the +1 claim.

### Assistant | 2026-05-14T17:44:42.298Z

[tool_use: Grep]

### Assistant | 2026-05-14T17:44:42.339Z

[tool_use: Read]

### User | 2026-05-14T17:44:45.352Z

[tool_result] src\tools\dispatchers\sessionDispatcher.ts:87

Found 87 total occurrences across 1 file.

### User | 2026-05-14T17:44:47.787Z

[tool_result] 1	/**
2	 * Session Dispatcher — 48 actions for session lifecycle, state management, and context control.
3	 *
4	 * Manages cross-session persistence (memory_save/recall), context pressure monitoring,
5	 * state checkpointing (auto_checkpoint, checkpoint_enhanced), WIP capture/restore,
6	 * workflow tracking, system introspection (system_snapshot, dispatcher_map, action_search),
7	 * and intent-bas
... [+51 chars truncated]

### Assistant | 2026-05-14T17:44:51.801Z

The grep count of 87 includes non-ACTIONS string literals (case labels, object keys, etc.). Let me get a precise count by reading the full ACTIONS array bounds.

### Assistant | 2026-05-14T17:44:52.354Z

[tool_use: Read]

### User | 2026-05-14T17:44:56.652Z

[tool_result] 79	const ACTIONS = [
80	  "state_load",
81	  "state_save", 
82	  "state_checkpoint",
83	  "state_diff",
84	  "handoff_prepare",
85	  "handoff_write",
86	  "handoff_read",
87	  "resume_session",
88	  "memory_save",
89	  "memory_recall",
90	  "context_pressure",
91	  "context_size",
92	  "context_compress",
93	  "context_expand", 
94	  "compaction_detect",
95	  "transcript_read",
96	  "state_reconst
... [+3171 chars truncated]

### Assistant | 2026-05-14T17:46:16.672Z

I now have all the data needed. Let me count the ACTIONS array precisely from lines 80-175: that is entries on lines 80–133 (54 entries before self_awareness block), then self_awareness (6), awareness (6), ollama_health (1), doc_render (1), hook_map_compact (1), master_index_query (1), master_index_node_status (1), master_index_utilization_dashboard (1), cross_session block (11), psk (1).

Counting directly from the array (lines 80–175):

Lines 80–133: state_load, state_save, state_checkpoint, state_diff, handoff_prepare, handoff_write, handoff_read, resume_session, memory_save, memory_recall, context_pressure, context_size, context_compress, context_expand, compaction_detect, transcript_read, state_reconstruct, session_recover, quick_resume, session_start, session_end, auto_checkpoint, wip_capture, wip_list, wip_restore, state_rollback, resume_score, checkpoint_enhanced, workflow_start, workflow_advance, workflow_status, workflow_complete, health_check, dsl_mode, context_preload, context_boot, context_delta_boot, quick_ref_regenerate, session_delta, session_bookmark, session_compare_bookmark, system_snapshot, system_snapshot_layered, system_drift_report, dispatcher_map, dispatcher_map_compact, action_search, action_find, tool_route, tool_route_best, coordination_record, coordination_detect_conflicts, coordination_recent, coordination_count = **54**

Lines 135–140: self_awareness_build, self_awareness_search, self_awareness_context_summary, self_awareness_health, self_awareness_quick_stats, self_awareness_recommended_actions = **6**

Lines 142–147: awareness_unified_query, awareness_command_detect, awareness_command_suggest_string, awareness_filter, awareness_lifecycle_get_current, awareness_lifecycle_get_history = **6**

Line 149: ollama_health = **1**
Line 151: doc_render = **1**
Line 153: hook_map_compact = **1**
Lines 155–156: master_index_query, master_index_node_status = **2**
Line 158: master_index_utilization_dashboard = **1**
Lines 160–170: cross_session_ge
... [+13959 chars truncated]
