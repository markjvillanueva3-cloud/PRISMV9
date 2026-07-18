---
type: "chat-session"
source: "claude-code-cli"
session_id: "a2b1b5ca-29d4-414d-a0fc-c087dba35bb8"
title: "Review this ONE file end-to-end: `H:/prism-hotel-c2/scripts/queue-processor-daem"
date: "2026-05-16"
first_ts: "2026-05-16T04:13:02.404Z"
last_ts: "2026-05-16T04:14:26.923Z"
cwd: "h:\\prism"
messages: 15
user_msgs: 6
assistant_msgs: 9
raw_file: "H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ae908657a00f94a1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:20"
---

# Review this ONE file end-to-end: `H:/prism-hotel-c2/scripts/queue-processor-daem

> **claude-code-cli** | 2026-05-16 | 15 msgs (6 user / 9 assistant) | cwd: h:\prism
> Raw: `H:/.claude/projects/H--prism/a2b1b5ca-29d4-414d-a0fc-c087dba35bb8/subagents/agent-ae908657a00f94a1e.jsonl`

## Transcript

### User | 2026-05-16T04:13:02.404Z

Review this ONE file end-to-end: `H:/prism-hotel-c2/scripts/queue-processor-daemon.mjs` (B3 U-QUEUE-PROCESSOR, OBSIDIAN-INTELLIGENCE-MS3). It is the invocation entry that the 2h scheduled task (`scripts/cron/queue-processor-cron.ps1`, shipped same unit) calls; it imports the COMPILED engine `H:/prism/mcp-server/dist/engines/QueueProcessorEngine.js` and runs `engine.runQueue({vaultRoot})`. Read the engine source `H:/prism-hotel-c2/mcp-server/src/engines/QueueProcessorEngine.ts` to confirm the daemon uses its API correctly (constructor, runQueue return shape `{ok:true,counts,processed[]}` | `{ok:false,error,detail}`).

Spec deliverable: `scripts/queue-processor-daemon.mjs` — "Long-running watcher OR 2h-cron entry". Exit condition #1: "Watcher service running (cron OR Stop hook poll, 2h cadence)".

Verify rigorously:
1. One-shot mode (default, the cron path): resolves vaultRoot from PRISM_QUEUE_PROCESSOR_VAULT_ROOT env or the H:/prism/knowledge/memories default; correct exit codes (0 ok / 1 engine ok:false / 2 crash / 3 engine-not-built); the engine API is called correctly (does `new Engine()` + `runQueue({vaultRoot})` match the actual class? does it read `result.counts`/`result.processed.length`/`result.error`/`result.detail` exactly as the engine returns them?).
2. --watch mode: confirm the loop is genuinely NON-overlapping (await pass, THEN arm timer — not setInterval). Confirm `t.unref()` doesn't cause the process to exit immediately before the timer fires (subtle: if the ONLY pending handle is an unref'd timer and nothing else keeps the loop alive, does the `await new Promise` still resolve? trace it). Confirm SIGINT/SIGTERM actually stops the loop promptly (does setting `stopped=true` during the in-flight sleep break out, or does it wait a full interval first?).
3. engine-not-built path: exits 3 with an actionable message; does NOT silently build (B1/B2 convention = bootstrap in the ps1, not the engine/daemon).
4. Log: PRISM_QUEUE_PROCESSOR_LOG append is best-eff
... [+529 chars truncated]

### Assistant | 2026-05-16T04:13:08.630Z

I'll review the daemon and its engine dependency end-to-end.

### Assistant | 2026-05-16T04:13:09.060Z

[tool_use: Read]

### Assistant | 2026-05-16T04:13:09.623Z

[tool_use: Read]

### User | 2026-05-16T04:13:11.129Z

[tool_result] read-once-guard: 'H:\prism-hotel-c2\mcp-server\src\engines\QueueProcessorEngine.ts' was already read 13m ago in this session and is unchanged (mtime 1778903997434). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_
... [+13 chars truncated]

### User | 2026-05-16T04:13:11.201Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * queue-processor-daemon.mjs — OBSIDIAN-INTELLIGENCE-MS3 / B3 (U-QUEUE-PROCESSOR)
4	 * ==============================================================================
5	 * The invocation entry for `QueueProcessorEngine`. Two modes:
6	 *
7	 *   (default, one-shot)  — run ONE queue pass and exit. This is what the 2 h
8	 *                          scheduled task (`script
... [+6367 chars truncated]

### Assistant | 2026-05-16T04:13:13.337Z

The engine source was already read this session but isn't in my visible context. Let me retrieve the API surface I need to verify against.

### Assistant | 2026-05-16T04:13:15.327Z

[tool_use: Grep]

### User | 2026-05-16T04:13:16.006Z

[tool_result] 9: *   - body < CLAUDE_QUEUE_BYTE_THRESHOLD (2 KB)  → processed via Ollama
21: * queue is a SUCCESS with `processed: []`.
49: * Pluggable interfaces for testability (mirrors B1/B2/E1 pattern):
75:export type QueueTaskKind = z.infer<typeof QueueTaskKindEnum>;
78:export type QueueRoute = z.infer<typeof QueueRouteEnum>;
80:export const QueueFileStatusEnum = z.enum(["processed", "deferred", "failed"])
... [+2387 chars truncated]

### Assistant | 2026-05-16T04:13:18.964Z

Now let me read the precise API contract regions: constructor signature, `RunQueueOpts`, the return shapes, and the engine's own `__main__` reference block (lines 347-409, 452-610).

### Assistant | 2026-05-16T04:13:20.091Z

[tool_use: Read]

### Assistant | 2026-05-16T04:13:20.586Z

[tool_use: Read]

### User | 2026-05-16T04:13:21.845Z

[tool_result] 347	export interface RunQueueOpts {
348	  /** Absolute path to `knowledge/memories`. */
349	  vaultRoot: string;
350	  /** Override the queue dir. Default `<vaultRoot>/queue`. */
351	  queueDir?: string;
352	  /** Override the output dir. Default `<vaultRoot>/generated`. */
353	  outputDir?: string;
354	  /** Override the archive dir. Default `<vaultRoot>/archive`. */
355	  archiveDir?: string;
35
... [+2618 chars truncated]

### User | 2026-05-16T04:13:22.318Z

[tool_result] 452	export class QueueProcessorEngine {
453	  private lister: ListerFn;
454	  private processor: ProcessorFn;
455	
456	  constructor(opts: { lister?: ListerFn; processor?: ProcessorFn } = {}) {
457	    this.lister = opts.lister ?? defaultLister;
458	    this.processor = opts.processor ?? defaultOllamaProcessor;
459	  }
460	
461	  async runQueue(opts: RunQueueOpts): Promise<RunQueueResult> {
462	  
... [+5364 chars truncated]

### Assistant | 2026-05-16T04:14:26.923Z

I now have the full API contract. The daemon's engine usage is verified against the actual class. Let me work through each requirement rigorously.

## API conformance check

| Daemon usage | Engine actual | Match? |
|---|---|---|
| `new Engine()` (no args, daemon:101) | `constructor(opts = {})` (engine:456) — opts defaulted | ✅ |
| `await engine.runQueue({ vaultRoot })` (daemon:105) | `runQueue(opts: RunQueueOpts)`, `vaultRoot` required, rest optional (engine:347-364, 461) | ✅ |
| `result.ok` discriminant (daemon:119) | `RunQueueResult = RunQueueOk \| RunQueueFail` discriminated on `ok` (engine:403) | ✅ |
| `result.counts` on ok (daemon:120) | `RunQueueOk.counts` (engine:388) | ✅ |
| `result.processed.length` on ok (daemon:120) | `RunQueueOk.processed: QueueFileResult[]` (engine:379) | ✅ |
| `result.error` / `result.detail` on fail (daemon:121) | `RunQueueFail.error` / `.detail?` (engine:398-400) | ✅ |
| `mod.QueueProcessorEngine` (daemon:89) | `export class QueueProcessorEngine` (engine:452) | ✅ |

The engine's own `runCli()` (engine:597-611) is byte-for-byte the same call pattern the daemon uses, which independently confirms the contract. **No engine API mismatch.** Nothing in `runQueue` throws for the invalid-root case — it returns `{ok:false}` — so the daemon's `1` exit for `ok:false` and `2` for thrown crash are correctly partitioned.

Now the rigorous trace of the requested risk areas.

---

### 2. `--watch` loop — the `t.unref()` trace (this is the real bug)

Requirement 2 asked specifically: *"if the ONLY pending handle is an unref'd timer and nothing else keeps the loop alive, does the `await new Promise` still resolve?"*

Trace, daemon lines 143-151:

```js
while (!stopped) {
  await runOnce(Engine);
  if (stopped) break;
  await new Promise((resolve) => {
    const t = setTimeout(resolve, intervalMs);
    if (typeof t.unref === "function") t.unref();   // line 149
  });
}
```

`runOnce` is fully synchronous-to-completion in its returned promise (it `await
... [+9671 chars truncated]
