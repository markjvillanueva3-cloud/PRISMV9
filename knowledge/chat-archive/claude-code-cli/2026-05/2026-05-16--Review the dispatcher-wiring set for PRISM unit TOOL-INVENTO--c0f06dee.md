---
type: "chat-session"
source: "claude-code-cli"
session_id: "c0f06dee-d6f2-4070-8e01-4732115adb48"
title: "Review the dispatcher-wiring set for PRISM unit TOOL-INVENTORY-MS0/U-TOOLINV-01."
date: "2026-05-16"
first_ts: "2026-05-16T21:43:33.992Z"
last_ts: "2026-05-16T21:44:13.477Z"
cwd: "H:\\prism\\mcp-server"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-a290d06a784e3a36e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# Review the dispatcher-wiring set for PRISM unit TOOL-INVENTORY-MS0/U-TOOLINV-01.

> **claude-code-cli** | 2026-05-16 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-a290d06a784e3a36e.jsonl`

## Transcript

### User | 2026-05-16T21:43:33.992Z

Review the dispatcher-wiring set for PRISM unit TOOL-INVENTORY-MS0/U-TOOLINV-01. The engine (QdrantSurfaceEngine.ts) + its unit test already passed a separate 2-arm review (37/37, PASS/PASS). This review is ONLY the wiring seam. Read these END TO END:

1. H:\prism\mcp-server\src\schemas\memoryActionSchemas.ts — the two new Zod schemas `qdrant_vector_search` + `qdrant_vector_upsert` and their entry in ACTION_MEMORY_SCHEMAS
2. H:\prism\mcp-server\src\tools\dispatchers\memoryDispatcher.ts — the two new actions in the z.enum, the two case handlers, the tool-description string, the unknown-action `available` fallback list
3. H:\prism\mcp-server\src\__tests__\memoryDispatcher.qdrant-surface-wire.test.ts — the round-trip test

Verify the PRISM dispatcher-wiring contract:
- action name appears in ALL of: z.enum, ACTION_MEMORY_SCHEMAS map, case handler, tool-description string, unknown-action `available` array (a name missing from any one is a silent-skip bug)
- Zod schema field names + types match what the case handler reads from `params` and what QdrantSurfaceEngine.{vectorSearch,vectorUpsert} expect (collection:string, query:string, limit?:number int ≤100, filter?:record; id:string|number, text:string ≤32768, metadata?:record)
- lazy import pattern `const { QdrantSurfaceEngine } = await import("../../engines/QdrantSurfaceEngine.js")` matches the file's actual export (it's a static-method class, no singleton)
- the case handler's param coercion (e.g. `typeof params.collection === "string" ? ... : ""`) doesn't mask a validation the schema already enforces, and doesn't pass a wrong-typed value to the engine
- the {ok:false} → {code, httpCode, error, field} mapping is correct and httpCodeFor exists on the engine
- the round-trip test invokes THROUGH the dispatcher handler (not the engine singleton), and its assertions are real-value (would fail if the wiring regressed)
- snake_case action names, schema naming convention, no z.any in the new schemas
- the compile-time `satisfi
... [+263 chars truncated]

### Assistant | 2026-05-16T21:43:37.478Z

I'll read all three files end to end before drawing any conclusions.

### Assistant | 2026-05-16T21:43:37.864Z

[tool_use: Read]

### Assistant | 2026-05-16T21:43:38.255Z

[tool_use: Read]

### Assistant | 2026-05-16T21:43:38.629Z

[tool_use: Read]

### User | 2026-05-16T21:43:40.021Z

[tool_result] 1	/**
2	 * Zod action schemas for prism_memory dispatcher (11 actions)
3	 *
4	 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
5	 * - Only enforce fields the engine actually reads
6	 */
7	
8	import { z } from "zod";
9	import type { ActionSchemaMap } from "./actionSchemaTypes.js";
10	
11	const get_health = z.object({}).passthrough();
12	
13	const trace_decisi
... [+13661 chars truncated]

### User | 2026-05-16T21:43:40.311Z

[tool_result] 1	/**
2	 * PRISM Memory Graph Dispatcher (#27)
3	 * =====================================
4	 * 
5	 * prism_memory — 6 actions for the F2 cross-session memory graph.
6	 * 
7	 * Actions:
8	 *   get_health       — Graph stats, memory, integrity
9	 *   trace_decision   — Follow decision chain (forward/backward/both)
10	 *   find_similar     — Find similar nodes by dispatcher/action/error
11	 *   get_s
... [+40494 chars truncated]

### User | 2026-05-16T21:43:40.860Z

[tool_result] 1	/**
2	 * memoryDispatcher.qdrant-surface-wire.test.ts
3	 *
4	 * TOOL-INVENTORY-MS0/U-TOOLINV-01 — round-trip wire test for the
5	 * qdrant_vector_search / qdrant_vector_upsert actions that expose
6	 * QdrantSurfaceEngine through the prism_memory dispatcher.
7	 *
8	 * QdrantSurfaceEngine itself is exhaustively unit-tested in
9	 * QdrantSurfaceEngine.test.ts (37 cases). This file verifies ONLY the
... [+7899 chars truncated]

### Assistant | 2026-05-16T21:44:13.477Z

Now I have all three files in full. Here is the complete wiring review.

---

**VERDICT: PASS**

**5-surface completeness check — both actions**

| Surface | `qdrant_vector_search` | `qdrant_vector_upsert` |
|---|---|---|
| z.enum | line 54 | line 55 |
| ACTION_MEMORY_SCHEMAS | line 236 | line 237 (memoryActionSchemas.ts) |
| case handler | lines 323-346 | lines 347-374 |
| tool-description string | line 42 | line 42 |
| unknown-action `available` array | line 730 | line 730 |

Both actions are present and consistent across all five surfaces. No silent-skip gap exists.

**Schema field-to-handler alignment**

`qdrant_vector_search` schema defines `collection:string.min(1)`, `query:string.min(1)`, `limit?:int.max(100)`, `filter?:record`. The handler reads exactly those four fields at lines 328-334 with matching type-guards. The coercions (`typeof ... === "string" ? ... : ""`, Array.isArray guard on filter) are redundant given that Zod validation already runs at lines 100-107 via `validateActionParams`, but they do not widen the type or pass a wrong value — they tighten to safe defaults on invalid input, which is harmless.

`qdrant_vector_upsert` schema defines `collection:string.min(1)`, `id:union(string,number)`, `text:string.min(1).max(32768)`, `metadata?:record`. The handler reads those four at lines 351-363. The `rawId` guard correctly handles `string | number | ""` — the empty-string fallback is sound because `vectorUpsert` performs its own surface validation and would return `INVALID_INPUT` for an empty id.

**Lazy import pattern**

Both cases use `const { QdrantSurfaceEngine } = await import("../../engines/QdrantSurfaceEngine.js")` (lines 324-326 and 348-350). The engine exports a class with static methods `vectorSearch` and `vectorUpsert`, so no instance is needed. The import destructures the class name directly — correct for a static-method class, no singleton is expected.

**Error mapping**

Both cases map `{ok:false}` to `{ok:false, code:sr.code, httpCode:Q
... [+2026 chars truncated]
