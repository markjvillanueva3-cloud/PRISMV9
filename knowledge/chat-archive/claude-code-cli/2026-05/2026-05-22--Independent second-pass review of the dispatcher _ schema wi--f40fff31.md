---
type: "chat-session"
source: "claude-code-cli"
session_id: "f40fff31-cb37-49ea-9b03-5d4d750b18f3"
title: "Independent second-pass review of the dispatcher + schema wiring for U-AI-10 (CA"
date: "2026-05-22"
first_ts: "2026-05-22T22:30:37.405Z"
last_ts: "2026-05-22T22:34:45.891Z"
cwd: "H:\\prism\\mcp-server"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-aa931abe946fe9ccc.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:32"
---

# Independent second-pass review of the dispatcher + schema wiring for U-AI-10 (CA

> **claude-code-cli** | 2026-05-22 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/f40fff31-cb37-49ea-9b03-5d4d750b18f3/subagents/agent-aa931abe946fe9ccc.jsonl`

## Transcript

### User | 2026-05-22T22:30:37.405Z

Independent second-pass review of the dispatcher + schema wiring for U-AI-10 (CAD-COMPLETE-MS0). The unit wires `CADTraceAssemblyEngine` (a pure analyzer that composes the OpenTelemetry span list into per-traceId trace views) into `prism_cad` with three actions: `cad_trace_assemble`, `cad_trace_get`, `cad_trace_from_tracer`.

Files:
- `H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts` — new ACTIONS enum entries near line 468 + new case cluster after `cad_world_reset` (~line 4881).
- `H:\prism\mcp-server\src\schemas\cadActionSchemas.ts` — three new Zod schemas after `cad_world_reset`, before `// Geometry` (~line 1540).
- `H:\prism\mcp-server\src\engines\CADTraceAssemblyEngine.ts` — the engine being wired (read it).

Weight your review toward what a wiring specialist is LESS likely to catch:
1. **Trust / blast radius of `cad_trace_from_tracer`** — it pulls live spans from the global `openTelemetryTracingEngine` singleton via `getCompletedSpans()`. Is there any way an attacker / misuse could leak unintended trace data? Are tenant boundaries respected? Is the return payload bounded? (no, the engine returns the full assembly per traceId — large traces produce large payloads.)
2. **Lazy import of two engines** in the same case — does the dispatch path correctly handle that the `OpenTelemetryTracingEngine` import only happens on the `from_tracer` branch (not on the other two — performance / cold-start)?
3. **Param flexibility** — both `trace_id` and `traceId` accepted. Are there any other PRISM-convention aliases the schema should accept (e.g., `traceID`, `trace-id`)? Probably not — flag if missing per local convention.
4. **Schema realism vs engine reality** — the Zod schema requires `spanId`, `traceId`, `startTime`, `name` as required fields, but the engine's `validateSpan` accepts a missing `name` (defaults to `'(unnamed span)'`). Schema is stricter than engine. Is the stricter schema correct (rejects malformed input at the MCP edge), or should it match the en
... [+926 chars truncated]

### Assistant | 2026-05-22T22:30:57.123Z

I'll perform an independent second-pass review of the U-AI-10 wiring.

### Assistant | 2026-05-22T22:30:57.270Z

[tool_use: Read]

### User | 2026-05-22T22:30:58.435Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADTraceAssemblyEngine.ts' was already read 21m ago in this session and is unchanged (mtime 1779487548103). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-22T22:31:02.348Z

[tool_use: Read]

### User | 2026-05-22T22:31:08.598Z

[tool_result] 1	/**
2	 * CADTraceAssemblyEngine — U-AI-10 (CAD-COMPLETE-MS0 / PHASE-47)
3	 *
4	 * Assembles a flat OpenTelemetry span list into per-traceId end-to-end trace
5	 * views for the CAD agent's observability layer. PURE ANALYZER — it composes
6	 * the output of OpenTelemetryTracingEngine and records nothing of its own.
7	 *
8	 * Given a flat span list (e.g. openTelemetryTracingEngine.getCompletedSpans
... [+3501 chars truncated]

### Assistant | 2026-05-22T22:31:12.575Z

I'll perform the independent second-pass review. Let me examine the actual wired surfaces.

### Assistant | 2026-05-22T22:31:13.534Z

[tool_use: Read]

### User | 2026-05-22T22:31:14.235Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\CADTraceAssemblyEngine.ts' (same offset/limit) was already read 14m ago in this session and is unchanged (mtime 1779487548103). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### Assistant | 2026-05-22T22:31:17.788Z

[tool_use: Read]

### User | 2026-05-22T22:31:25.141Z

[tool_result] 100	  slowestSpan: { spanId: string; name: string; durationMs: number };
101	  status: TraceRollupStatus;
102	  errorCount: number;
103	  errorSpans: TraceErrorSpan[];
104	  inProgressCount: number;
105	  /** Spans whose parentSpanId referenced a span absent from the trace. */
106	  orphanCount: number;
107	  /** Count of broken cyclic parent-reference edges; nonzero iff the trace contained any cy
... [+11202 chars truncated]

### Assistant | 2026-05-22T22:31:30.233Z

[tool_use: Read]

### User | 2026-05-22T22:32:21.871Z

[tool_result] 400	    const errorSpans: TraceErrorSpan[] = [];
401	    let slowest = { spanId: '', name: '', durationMs: -1 };
402	
403	    for (const node of nodes.values()) {
404	      if (node.startTime < minStart) minStart = node.startTime;
405	      const endlike = node.endTime !== undefined ? node.endTime : node.startTime;
406	      if (endlike > maxEnd) maxEnd = endlike;
407	      if (node.inProgress) in
... [+4672 chars truncated]

### Assistant | 2026-05-22T22:32:26.330Z

Now the dispatcher case + schema:

### Assistant | 2026-05-22T22:32:27.389Z

[tool_use: Read]

### User | 2026-05-22T22:32:49.047Z

[tool_result] 460	  "cad_fallback_reset",            // clear the CAD app routing registry
461	  // CAD-COMPLETE-MS0/U-AI-02 — CADWorldModelEngine (CAD agent's document belief-state)
462	  "cad_world_apply_op",            // apply one operation to a document's world model
463	  "cad_world_state",               // current believed state of a document
464	  "cad_world_checkpoint",          // save the document's 
... [+786 chars truncated]

### Assistant | 2026-05-22T22:32:54.218Z

[tool_use: Read]

### User | 2026-05-22T22:32:57.507Z

[tool_result] 4860	              result = { success: true, data: cadWorldModelEngine.getState(docId) };
4861	            } else if (action === "cad_world_checkpoint") {
4862	              result = { success: true, data: cadWorldModelEngine.checkpoint(docId) };
4863	            } else if (action === "cad_world_diff") {
4864	              result = { success: true, data: cadWorldModelEngine.diffFromCheckpoint(docI
... [+4237 chars truncated]

### Assistant | 2026-05-22T22:33:00.701Z

Now the schema:

### Assistant | 2026-05-22T22:33:02.039Z

[tool_use: Read]

### User | 2026-05-22T22:33:07.928Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\schemas\cadActionSchemas.ts' (same offset/limit) was already read 2m ago in this session and is unchanged (mtime 1779488873250). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: 
... [+19 chars truncated]

### Assistant | 2026-05-22T22:33:11.586Z

[tool_use: Read]

### User | 2026-05-22T22:33:12.858Z

[tool_result] 1500	    entityId: z.string().optional().describe("Inline-op shortcut — target / new-entity id"),
1501	    entityKind: z
1502	      .enum(["body", "sketch", "feature", "plane", "axis", "component"])
1503	      .optional()
1504	      .describe("Inline-op shortcut — entity kind for a create op"),
1505	    name: z.string().optional().describe("Inline-op shortcut — display name"),
1506	    parentId: z
... [+4750 chars truncated]

### Assistant | 2026-05-22T22:33:17.314Z

Now let me verify the OpenTelemetryTracingEngine surface and tenant boundary concerns:

### Assistant | 2026-05-22T22:33:18.876Z

[tool_use: Grep]

### User | 2026-05-22T22:33:22.041Z

[tool_result] 10: * - Baggage propagation for tenant/request context
447:    tenantId?: string;
458:    if (attrs.tenantId) mappedAttrs['prism.tenant_id'] = attrs.tenantId;
511:  getCompletedSpans(): Span[] {

### Assistant | 2026-05-22T22:33:26.237Z

The OTel engine has tenantId attributes but `getCompletedSpans()` returns ALL completed spans globally without any tenant filtering. Let me check one more thing:

### Assistant | 2026-05-22T22:33:27.173Z

[tool_use: Read]

### User | 2026-05-22T22:33:29.061Z

[tool_result] 505	    return this.activeSpans.size;
506	  }
507	
508	  /**
509	   * Gets completed spans (for testing).
510	   */
511	  getCompletedSpans(): Span[] {
512	    return [...this.completedSpans];
513	  }
514	
515	  /**
516	   * Gets export queue length.
517	   */
518	  getExportQueueLength(): number {
519	    return this.exportQueue.length;
520	  }
521	
522	  /**
523	   * Clears all data (for testing
... [+166 chars truncated]

### Assistant | 2026-05-22T22:34:45.891Z

I have all the context I need. Here is my independent second-pass review.

---

# Independent Second-Pass Review — U-AI-10 wiring (`cad_trace_*`)

## Files reviewed
- `H:\prism\mcp-server\src\tools\dispatchers\cadDispatcher.ts` — actions enum L468-471, case cluster L4885-4936
- `H:\prism\mcp-server\src\schemas\cadActionSchemas.ts` — schemas L1540-1583
- `H:\prism\mcp-server\src\engines\CADTraceAssemblyEngine.ts` — analyzer, lines 1-530
- `H:\prism\mcp-server\src\engines\OpenTelemetryTracingEngine.ts` — `getCompletedSpans()` L511-513, tenantId attr L447

---

## Findings

### P1-A — `cad_trace_from_tracer` ignores tenant boundaries (live-data leak)
**Where:** `cadDispatcher.ts:4918` — `openTelemetryTracingEngine.getCompletedSpans()` returns the entire process-global completed-span buffer with NO filter. OTel records `prism.tenant_id` as a span attribute (`OpenTelemetryTracingEngine.ts:458`) but `getCompletedSpans()` (L511-513) returns `[...this.completedSpans]` un-filtered. The comment on L509 even says "for testing" — this is a test/debug accessor being promoted to an MCP-callable surface.

**Impact:** Any MCP client invoking `cad_trace_from_tracer` reads every other tenant's in-memory CAD traces (span names, statusMessage text, parent topology). In a multi-tenant deployment this is a tenant-isolation breach. Also leaks tenant traffic shape (call graph, error messages) to whoever invokes the action.

**Fix:** Accept a required `tenant_id`/`tenantId` arg in `cad_trace_from_tracer` schema; filter `adapted` (or the upstream `otelSpans`) by `s.attributes?.['prism.tenant_id']` before assembly. If the action is intentionally privileged-debug-only, gate it behind an explicit auth scope and document so in the `.describe()` text — currently the schema has zero callout that this is a privileged debug surface.

### P1-B — `cad_trace_from_tracer` return payload is unbounded
**Where:** `cadDispatcher.ts:4928-4933` (no-`traceId` branch). When `trace_id` is omitted the dispatcher 
... [+9993 chars truncated]
