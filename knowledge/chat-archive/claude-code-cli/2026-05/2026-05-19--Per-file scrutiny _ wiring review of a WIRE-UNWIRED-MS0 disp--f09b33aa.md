---
type: "chat-session"
source: "claude-code-cli"
session_id: "f09b33aa-5b39-4133-a868-6c905866dd7c"
title: "Per-file scrutiny — wiring review of a WIRE-UNWIRED-MS0 dispatcher change. CONTE"
date: "2026-05-19"
first_ts: "2026-05-19T16:29:21.320Z"
last_ts: "2026-05-19T16:31:11.171Z"
cwd: "H:\\prism\\mcp-server"
messages: 12
user_msgs: 5
assistant_msgs: 7
raw_file: "H:/.claude/projects/H--prism/f09b33aa-5b39-4133-a868-6c905866dd7c/subagents/agent-ac59fe3c846bf8f5f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Per-file scrutiny — wiring review of a WIRE-UNWIRED-MS0 dispatcher change. CONTE

> **claude-code-cli** | 2026-05-19 | 12 msgs (5 user / 7 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f09b33aa-5b39-4133-a868-6c905866dd7c/subagents/agent-ac59fe3c846bf8f5f.jsonl`

## Transcript

### User | 2026-05-19T16:29:21.320Z

Per-file scrutiny — wiring review of a WIRE-UNWIRED-MS0 dispatcher change.

CONTEXT: U-WIRE-TOOL-CALL-BATCH-OPTIMIZE (slot foxtrot). The `ToolCallBatchOptimizerEngine` (`H:/prism/mcp-server/src/engines/ToolCallBatchOptimizerEngine.ts`, 199 lines) was a genuine unwired engine — confirmed via `grep -rl ToolCallBatchOptimizer mcp-server/src/tools/` returning nothing. It has 4 public methods: `plan(calls)`, `analyze(calls)`, `estimateCost(calls)`, `summary(calls)` + a singleton export `toolCallBatchOptimizerEngine`.

REVIEW TARGET: the new wiring in `H:/prism/mcp-server/src/tools/dispatchers/devDispatcher.ts`:
- A new action `"tool_call_batch_optimize"` added to the z.enum action list (~line 519 region — look for the WIRE-UNWIRED-MS0/U-WIRE-TOOL-CALL-BATCH-OPTIMIZE comment).
- A new `case "tool_call_batch_optimize":` block (~line 6117-6140) — op-discriminator over plan/analyze/estimate_cost/summary, lazy-imports the engine, rejects non-array `params.calls`.

Read BOTH regions end-to-end.

CHECK:
1. Action is in the z.enum (`as const` list) — if missing, the SDK rejects the action at runtime.
2. Case block uses the canonical lazy-import pattern (`await import("../../engines/ToolCallBatchOptimizerEngine.js")`) — matches the sibling `tool_call_dedup` / `tool_call_throttle` blocks.
3. Op-discriminator covers all 4 engine methods correctly; the engine method names are `plan`/`analyze`/`estimateCost`/`summary` (note `estimateCost` is camelCase in the engine but the op is `estimate_cost` snake_case — verify the case correctly maps `estimate_cost` → `estimateCost()`).
4. R12 fail-loud: non-array `calls` rejected with a structured `{error}` (not a throw, not silent coercion).
5. The `calls!` non-null assertion is safe — the `if (!calls && op !== undefined)` guard above it ensures calls is non-null on every path that reaches the switch... OR does it? Trace the edge case: what if `op === undefined` AND `calls === null`? Does the switch's `default` branch fire safely WITHOUT derefe
... [+599 chars truncated]

### Assistant | 2026-05-19T16:29:47.650Z

I'll read the relevant sections of both files simultaneously.

### Assistant | 2026-05-19T16:29:49.419Z

[tool_use: Grep]

### Assistant | 2026-05-19T16:29:49.439Z

[tool_use: Glob]

### User | 2026-05-19T16:30:08.181Z

[tool_result] 523-// batches over a tool-call sequence (dependency-aware + write-conflict-safe),
524-// detects redundant reads, estimates token cost. Sibling to tool_call_record/
525-// _analyze (parallelization observability) — this is the FORWARD-LOOKING
526-// planner: given N planned calls, return the dependency-respecting batch plan
527-// that minimizes total rounds. Singleton (toolCallBatchOptimizerEngi
... [+3894 chars truncated]

### User | 2026-05-19T16:30:09.336Z

[tool_result] src\engines\ToolCallBatchOptimizerEngine.ts

### Assistant | 2026-05-19T16:30:12.940Z

Now read the engine file to verify method signatures, and also check the sibling `tool_call_dedup` block for convention comparison.

### Assistant | 2026-05-19T16:30:13.730Z

[tool_use: Read]

### Assistant | 2026-05-19T16:30:17.169Z

[tool_use: Grep]

### User | 2026-05-19T16:30:22.249Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ToolCallBatchOptimizerEngine.ts' was already read 24m ago in this session and is unchanged (mtime 1772919642000). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_R
... [+12 chars truncated]

### User | 2026-05-19T16:30:38.416Z

[tool_result] 6075-                  params.cooldown_ms,
6076-                );
6077-                result = { success: true };
6078-                break;
6079-              }
6080-              case "stats":    result = toolCallThrottleEngine.stats(); break;
6081-              case "oneliner": result = { line: toolCallThrottleEngine.oneLiner() }; break;
6082-              case "reset":    toolCallThrottleEn
... [+1879 chars truncated]

### Assistant | 2026-05-19T16:31:11.171Z

I have everything needed. The engine file was already read in this session context. Let me trace the critical edge case and compile the verdict.

**Key facts from context:**
- Engine file exists at `H:/prism/mcp-server/src/engines/ToolCallBatchOptimizerEngine.ts` - confirmed.
- Engine public methods: `plan(calls)`, `analyze(calls)`, `estimateCost(calls)` (camelCase), `summary(calls)`.

**Analysis of each check:**

**1. z.enum entry** — `"tool_call_batch_optimize"` appears at line 528 in the `as const` array. PASS.

**2. Lazy import** — `await import("../../engines/ToolCallBatchOptimizerEngine.js")` — matches the sibling `tool_call_dedup` pattern exactly. PASS.

**3. Op-discriminator / method mapping** — `estimate_cost` → `toolCallBatchOptimizerEngine.estimateCost(calls!)`. Snake-to-camel mapping is correct. All 4 ops covered. PASS.

**4. R12 fail-loud** — Non-array `calls` sets `result = { error: "..." }` and breaks. No throw, no silent coercion. PASS.

**5. NPE edge case — P0 FINDING.** The guard at line 6137 is:
```ts
if (!calls && op !== undefined) {
```
When `op === undefined` AND `calls === null` (caller passes `{calls: null}` or omits both), the guard does NOT fire (because `op !== undefined` is false). Execution falls through to the `switch (op)` at line 6141. With `op === undefined`, the `default` branch fires: `result = { error: \`unknown op: undefined...\` }`. The default branch does NOT dereference `calls!`. So no NPE on this path — the default fires safely and returns a structured error.

However, this is a **P1 logic gap**: a caller passing `{calls: null}` with no `op` receives "unknown op: undefined" instead of the correct "requires {calls, op}" error. The error message is misleading (it implies a valid `calls` was given and only `op` was wrong). The guard condition should be `if (!calls || op === undefined)` to catch the mutual-absent case. Not a crash, but incorrect error reporting that will confuse callers.

**6. Return shape** — All branches return
... [+1520 chars truncated]
