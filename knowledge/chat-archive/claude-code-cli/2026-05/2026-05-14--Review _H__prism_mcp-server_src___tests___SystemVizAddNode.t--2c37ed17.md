---
type: "chat-session"
source: "claude-code-cli"
session_id: "2c37ed17-584a-4913-9d0f-8eb3cdcea8df"
title: "Review `H:/prism/mcp-server/src/__tests__/SystemVizAddNode.test.ts` end-to-end a"
date: "2026-05-14"
first_ts: "2026-05-14T02:50:35.884Z"
last_ts: "2026-05-14T02:50:59.748Z"
cwd: "H:\\prism\\mcp-server"
messages: 31
user_msgs: 11
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-a4d2fbf54afca4fc4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:09"
---

# Review `H:/prism/mcp-server/src/__tests__/SystemVizAddNode.test.ts` end-to-end a

> **claude-code-cli** | 2026-05-14 | 31 msgs (11 user / 20 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/2c37ed17-584a-4913-9d0f-8eb3cdcea8df/subagents/agent-a4d2fbf54afca4fc4.jsonl`

## Transcript

### User | 2026-05-14T02:50:35.884Z

Review `H:/prism/mcp-server/src/__tests__/SystemVizAddNode.test.ts` end-to-end against PRISM testing rules:

- Real-value assertions only — no `toBeDefined()` stubs, no `expect(x).toBeTruthy()` placeholders.
- Every test must exercise real behavior of `H:/prism/scripts/system-viz-add-node.mjs`.
- Coverage: at least one test per public export of the script (28+ exports — slugifyLabel, normalizeLayer, validateRawId, buildNodeEntry, parseArgv, labelFromEngineFile, isDuplicate, atomicWriteJson, atomicWriteText, appendQueue, readQueue, msSinceLastFlush, acquirePidLock, releasePidLock, flushQueue, computeConcurrentAdds, main, emit, plus the constant exports).
- Edge cases covered: empty, null, malformed JSON, corrupt graph, oversize queue, concurrent enqueue, dead/live PIDs, repeated main() calls.
- All 59 tests pass against the live script (verified by vitest run).

Specifically check:
1. Are any assertions weakened to just-pass-this? (e.g. `expect(r.flushed).toBeGreaterThanOrEqual(0)` instead of `toBe(1)`)
2. Are there any mocks of the script-under-test itself? (legit: filesystem isolation via tmpdir + env var. ILLEGIT: vi.mock'ing the script's own exports.)
3. Does the proto-pollution test actually verify the security property?
4. Does the concurrent-merge test (via `computeConcurrentAdds`) cover the documented behavior?
5. Any tests that look like coverage-padding (asserting trivial things)?

Grade: **PASS** or **FAIL**. Concise bullets only. P0/P1 only.

### Assistant | 2026-05-14T02:50:37.527Z

I'll review the test file comprehensively against PRISM testing rules.

### Assistant | 2026-05-14T02:50:37.755Z

[tool_use: Read]

### User | 2026-05-14T02:50:38.992Z

[tool_result] 1	/**
2	 * SystemVizAddNode.test.ts — integration + unit tests for
3	 * `H:/prism/scripts/system-viz-add-node.mjs` (U-CLEANUP-C3).
4	 *
5	 * Isolation strategy: each test creates a tmpdir, points
6	 * PRISM_SYSTEM_VIZ_DIR at it, exercises pure helpers + main()
7	 * in-process. No subprocess spawn — script is pure ESM so the
8	 * exports + main() are importable directly into vitest.
9	 *
10	 * Real
... [+29098 chars truncated]

### Assistant | 2026-05-14T02:50:40.394Z

Now let me verify the script itself to confirm the exports match what's tested:

### Assistant | 2026-05-14T02:50:40.864Z

[tool_use: Read]

### User | 2026-05-14T02:50:41.630Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-add-node.mjs — Incremental dashed-node staging for system-viz.
4	 *
5	 * Spec: CLEANUP-MS0 / U-CLEANUP-C3
6	 *
7	 * Bridges the ~100s latency between full system-viz regenerations
8	 * (`generate-system-viz.mjs` rebuilds the whole 20K-node graph from
9	 * scratch) by appending "dashed" provisional nodes to the live graph
10	 * as soon as new engines / di
... [+4033 chars truncated]

### Assistant | 2026-05-14T02:50:42.765Z

Let me check more of the script to see all exports:

### Assistant | 2026-05-14T02:50:43.207Z

[tool_use: Grep]

### User | 2026-05-14T02:50:43.765Z

[tool_result] 56:export const FLUSH_INTERVAL_MS = 60_000;
59:export const MAX_BATCH = 200;
66:export const MAX_QUEUE_BYTES = 32 * 1024 * 1024;
69:export const VALID_LAYERS = new Set([
74:export const DEFAULT_LAYER = "L5";
77:export const ENGINE_SUBGROUP = "unwired";
80:export const DASHED_STATUS = "dashed";
83:export const DASHED_SIZE = 0.8;
86:export const DASHED_COLOR = "#94a3b8";
89:export const DEFAULT_SOUR
... [+1584 chars truncated]

### Assistant | 2026-05-14T02:50:44.858Z

Perfect. Now let me count the tests and verify they're comprehensive:

### Assistant | 2026-05-14T02:50:45.385Z

[tool_use: Grep]

### User | 2026-05-14T02:50:45.948Z

[tool_result] src\__tests__\SystemVizAddNode.test.ts:59

Found 59 total occurrences across 1 file.

### Assistant | 2026-05-14T02:50:47.018Z

Now let me verify the actual test run results to confirm they pass:

### Assistant | 2026-05-14T02:50:47.690Z

[tool_use: Grep]

### User | 2026-05-14T02:50:48.334Z

[tool_result] 646:    expect(node).toBeTruthy();

### Assistant | 2026-05-14T02:50:49.175Z

Let me check that specific context:

### Assistant | 2026-05-14T02:50:49.546Z

[tool_use: Read]

### User | 2026-05-14T02:50:50.324Z

[tool_result] 640	    } finally { console.log = orig; }
641	    const out = JSON.parse(stdout[0]);
642	    expect(out.id).toBe("engine.fooengine");
643	    expect(out.label).toBe("FooEngine");
644	    const g = readGraph(TMP_DIR);
645	    const node = g.nodes.find(n => n.id === "engine.fooengine")!;
646	    expect(node).toBeTruthy();
647	    expect((node as { subgroup: string }).subgroup).toBe("unwired");
648	 
... [+309 chars truncated]

### Assistant | 2026-05-14T02:50:51.777Z

Let me check for any mocks of the script-under-test itself:

### Assistant | 2026-05-14T02:50:52.003Z

[tool_use: Grep]

### User | 2026-05-14T02:50:52.608Z

[tool_result] No matches found

### Assistant | 2026-05-14T02:50:53.672Z

Excellent. Let me verify the proto-pollution test more closely:

### Assistant | 2026-05-14T02:50:53.890Z

[tool_use: Read]

### User | 2026-05-14T02:50:55.379Z

[tool_result] 336	  it("strips __proto__ pollution attempts via safeReviver", async () => {
337	    const m = await import(SCRIPT_PATH);
338	    const q = path.join(TMP_DIR, "q.jsonl");
339	    fs.writeFileSync(q, '{"id":"a","__proto__":{"polluted":true}}\n');
340	    const result = m.readQueue(q);
341	    expect(result.entries[0]).toEqual({ id: "a" });
342	    // eslint-disable-next-line @typescript-eslint/no-
... [+84 chars truncated]

### Assistant | 2026-05-14T02:50:56.319Z

Good. Let me now check the concurrent merge test more carefully:

### Assistant | 2026-05-14T02:50:56.673Z

[tool_use: Read]

### User | 2026-05-14T02:50:57.438Z

[tool_result] 507	  it("computeConcurrentAdds isolates peer-added entries (re-read minus snapshot minus flushed)", async () => {
508	    const m = await import(SCRIPT_PATH);
509	    // Test the helper directly — ESM module-internal calls aren't spy-able,
510	    // so the concurrent-merge logic is tested at the pure-function level.
511	    const original  = [{ id: "A" }, { id: "B" }];
512	    const flushed   = 
... [+973 chars truncated]

### Assistant | 2026-05-14T02:50:58.510Z

Perfect. Now let me verify all the key edge cases are tested by scanning for specific patterns:

### Assistant | 2026-05-14T02:50:59.173Z

[tool_use: Grep]

### User | 2026-05-14T02:50:59.748Z

[tool_result] 50:    }, null, 2),
111:    expect(() => m.slugifyLabel(null as never)).toThrow(/must be a string/);
114:  it("throws when slug post-clean is empty (e.g. all non-ASCII)", async () => {
116:    expect(() => m.slugifyLabel("日本")).toThrow(/empty slug/);
117:    expect(() => m.slugifyLabel("!!!")).toThrow(/empty slug/);
163:  it("rejects empty string + non-string", async () => {
166:    expect(() => m
... [+1436 chars truncated]
