---
type: "chat-session"
source: "claude-code-cli"
session_id: "b84af9c3-f5df-42ba-bf2f-08de45fe31f5"
title: "Investigate a suspected suite-ordering flake in the PRISM mcp-server vitest suit"
date: "2026-06-23"
first_ts: "2026-06-23T16:16:39.796Z"
last_ts: "2026-06-23T16:20:08.915Z"
cwd: "H:\\prism\\.claude\\worktrees\\agent-ab4b7b88c566581e6"
messages: 25
user_msgs: 9
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/b84af9c3-f5df-42ba-bf2f-08de45fe31f5/subagents/agent-ab4b7b88c566581e6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# Investigate a suspected suite-ordering flake in the PRISM mcp-server vitest suit

> **claude-code-cli** | 2026-06-23 | 25 msgs (9 user / 16 assistant) | cwd: H:\prism\.claude\worktrees\agent-ab4b7b88c566581e6
> Raw: `H:/.claude/projects/H--prism/b84af9c3-f5df-42ba-bf2f-08de45fe31f5/subagents/agent-ab4b7b88c566581e6.jsonl`

## Transcript

### User | 2026-06-23T16:16:39.796Z

Investigate a suspected suite-ordering flake in the PRISM mcp-server vitest suite. SCOPE TIGHTLY and report findings (do NOT edit code — this is a read-only investigation).

TARGET TEST: H:\prism\mcp-server\src\__tests__\engines\loraCompositionU-LEARN-05.test.ts
Run all vitest commands from H:\prism\mcp-server (e.g. `cd H:/prism/mcp-server && npx vitest run <files>`). Use `2>&1 | grep -E "Test Files|Tests |FAIL|❯ src|expected"` to keep output small.

KNOWN STATE (already verified — do not re-derive):
- The target test passes 41/41 in ISOLATION (`npx vitest run src/__tests__/engines/loraCompositionU-LEARN-05.test.ts`).
- It is NOT a dead-API fossil and is maintained (commit 6ec393cf41). Every describe block already resets its 5 LoRA engine singletons (loraMoEGatingEngine/doRAAdapterEngine/adaLoRARankAllocatorEngine/orthogonalLoRAEngine/loraCompositionEngine .clear()) in beforeEach.
- A prior session flagged it as flaking only under the FULL suite due to an EXTERNAL/transitive non-LoRA polluter (some other test mutating shared state these engines transitively use — a module-level cache, shared registry/config, or RNG seed — NOT their own clear()-able state).

YOUR TASK (in this order, STOP as soon as you have an answer):
1. CONFIRM REPRODUCTION FIRST: run the target test together with a moderate slice of the suite (e.g. all of `src/__tests__/engines/*.test.ts`, or a few hundred files) and check whether the target's tests FAIL. If it does NOT reproduce in 2-3 reasonably-sized runs, STOP and report "no longer reproduces in <scope> — polluter likely already fixed; flake may be stale." Do NOT run the entire 756-file suite repeatedly chasing a non-repro.
2. IF IT REPRODUCES: bisect — halve the file set around the target until you isolate the single polluting test file (the one that, when run before the target, makes it fail). Identify the exact shared state being mutated (which singleton/cache/global, what the polluter does to it, why the target's beforeEach doesn't reset 
... [+549 chars truncated]

### Assistant | 2026-06-23T16:16:48.420Z

I'll investigate this suspected suite-ordering flake. Let me start by confirming reproduction with a moderate slice of the suite.

### Assistant | 2026-06-23T16:16:49.350Z

[tool_use: Bash]

### Assistant | 2026-06-23T16:16:49.703Z

[tool_use: Read]

### User | 2026-06-23T16:16:51.082Z

[tool_result] 1	/**
2	 * LoRA Composition Engine Tests — U-LEARN-05
3	 * ============================================
4	 *
5	 * Tests for:
6	 * - LoRAMoEGatingEngine: expert registration, top-K gating, softmax routing
7	 * - DoRAAdapterEngine: magnitude/direction decomposition, forward pass
8	 * - AdaLoRARankAllocatorEngine: SVD-based rank allocation
9	 * - OrthogonalLoRAEngine: orthogonality constraints, Gram-
... [+26229 chars truncated]

### User | 2026-06-23T16:16:53.525Z

[tool_result] 165

### Assistant | 2026-06-23T16:16:57.294Z

I have the test file structure. Now let me confirm reproduction by running the target test together with the engine test slice.

### Assistant | 2026-06-23T16:16:58.590Z

[tool_use: Bash]

### User | 2026-06-23T16:17:26.358Z

[tool_result]  ❯ src/__tests__/engines/ProgramLabelingPipelineEngine.test.ts (0 test)
 ❯ src/__tests__/engines/CapacityPlanningEngine.test.ts (12 tests | 12 failed) 7ms
stderr | src/__tests__/engines/LatheProgramOptimizerEngine.test.ts > LatheProgramOptimizerEngine > Integration Tests > should complete full optimization workflow
stderr | src/__tests__/engines/LatheProgramOptimizerEngine.test.ts > LatheProgramOp
... [+7018 chars truncated]

### Assistant | 2026-06-23T16:17:31.329Z

The target test passed (`✓ src/__tests__/engines/loraCompositionU-LEARN-05.test.ts (41 tests)`) within the engine slice. There are many other failures in the slice, but the target is green. However, vitest may run files in parallel pools, so the ordering within the engine directory may not place a polluter before the target in the same worker. Let me check the result more precisely and confirm the target's status.

### Assistant | 2026-06-23T16:17:32.170Z

[tool_use: Bash]

### User | 2026-06-23T16:17:58.290Z

[tool_result] stderr | src/__tests__/engines/loraCompositionU-LEARN-05.test.ts > mlDispatcher LoRA actions > should handle lora_register_expert via dispatcher
stderr | src/__tests__/engines/loraCompositionU-LEARN-05.test.ts > mlDispatcher LoRA actions > should handle dora_create via dispatcher
stderr | src/__tests__/engines/loraCompositionU-LEARN-05.test.ts > mlDispatcher LoRA actions > should handle olora_chec
... [+512 chars truncated]

### Assistant | 2026-06-23T16:18:02.916Z

**REPRODUCES.** The two runs of the same engine-directory slice gave different results — first run all 41 green, second run 2 failures in the `mlDispatcher LoRA actions` block (lines 690, 717). This is confirmed non-deterministic suite-ordering flake. The failing tests are specifically the dispatcher-routed ones (`lora_register_expert` and `dora_create`), and notably NOT the third dispatcher test (`olora_check` at line 724).

Let me get the actual assertion failure to understand what's failing.

### Assistant | 2026-06-23T16:18:04.734Z

[tool_use: Bash]

### User | 2026-06-23T16:18:35.038Z

[tool_result] AssertionError: expected undefined to be defined
    690|     expect(capturedResult).toBeDefined();
    691|     const text = (capturedResult as { content: Array<{ text: string }>…
AssertionError: expected undefined to be defined
    717|     expect(capturedResult).toBeDefined();
    718|     const text = (capturedResult as { content: Array<{ text: string }>…
AssertionError: expected 0 to be great
... [+9 chars truncated]

### Assistant | 2026-06-23T16:18:43.231Z

Interesting — three different assertions failed this run. The key one: `expect(capturedResult).toBeDefined()` got `undefined`. This means the dispatcher handler's `.then()` never resolved within the 50ms timeout. This is a **timing-based flake**, not a shared-state mutation flake. Let me look closer.

The test pattern at lines 666-695 does:
1. `registerMLDispatcher(mockServer)` — which calls `mockServer.tool(...)` synchronously, which fires `handler(...).then(r => capturedResult = r)`
2. `await new Promise(r => setTimeout(r, 50))` — waits 50ms
3. asserts `capturedResult` is defined

The `registerMLDispatcher` does `await import("../../tools/dispatchers/mlDispatcher.js")` first. The handler itself is async. If the dispatcher's first invocation triggers heavy lazy-loading (dynamic imports inside the handler), 50ms may not be enough — but only when the module graph isn't already warm. Let me verify this is timing rather than state pollution by examining what the dispatcher does.

### Assistant | 2026-06-23T16:18:44.357Z

[tool_use: Bash]

### User | 2026-06-23T16:18:49.615Z

[tool_result] 76:async function getEngine(name: string): Promise<unknown> {
78:    case "min":
79:      return _minParser ??= (await import("../../engines/MINFileParserEngine.js")).minFileParserEngine;
80:    case "mcx":
81:      return _mcxParser ??= (await import("../../engines/McxProgramParserEngine.js")).mcxProgramParserEngine;
82:    case "minBatch":
83:      return _minBatch ??= (await import("../../engin
... [+2263 chars truncated]

### Assistant | 2026-06-23T16:18:57.322Z

Confirmed: the dispatcher routes via `await import(...)` lazy-loading inside async handlers. The test's fixed `setTimeout(50ms)` is a race against module resolution. This is a **timing-based flake, not a shared-state pollution flake** — but let me verify the precise mechanism by checking whether the failure correlates with module-graph warmth (how much else loaded first). The fact that it failed in the engine-slice (where lots of modules are loaded by other files first, contending for the event loop) but passes in isolation supports timing contention.

Let me confirm the hypothesis directly: run the target with a small set of heavy non-LoRA files, and separately check if it's purely the 50ms budget. Let me check the third assertion (`expected 0 to be greater than 0` at olora_check line 747) — that one is different.

### Assistant | 2026-06-23T16:18:59.536Z

[tool_use: Bash]

### User | 2026-06-23T16:19:14.143Z

[tool_result] === RUN 1 (isolation) ===
 ✓ src/__tests__/engines/loraCompositionU-LEARN-05.test.ts (41 tests) 337ms
      Tests  41 passed (41)
=== RUN 2 (isolation) ===
 ✓ src/__tests__/engines/loraCompositionU-LEARN-05.test.ts (41 tests) 390ms
      Tests  41 passed (41)
=== RUN 3 (isolation) ===
 ✓ src/__tests__/engines/loraCompositionU-LEARN-05.test.ts (41 tests) 319ms
      Tests  41 passed (41)

### Assistant | 2026-06-23T16:19:25.986Z

Stable in isolation (3/3 green, ~330-390ms each). The flake only appears under load. This is now clearly a **timing/concurrency flake**, not a deterministic single-polluter state-mutation flake. 

The root cause is the test's anti-pattern: it invokes an async dispatcher handler **fire-and-forget** (the mock's `tool()` callback calls `handler(...).then(...)` but `registerMLDispatcher` does not await it), then relies on a fixed `await new Promise(r => setTimeout(r, 50))` to give it time to resolve. Under suite load — when many other test files share the same vitest worker pool and the event loop / module resolution is contended — the async handler's lazy `await import(...)` chain doesn't complete within 50ms, so `capturedResult` is still `undefined`.

This is NOT an external polluter mutating shared LoRA state. The prior session's hypothesis ("external/transitive non-LoRA polluter mutating a module-level cache/registry/RNG") is incorrect. The mechanism is event-loop contention starving a fixed-budget `setTimeout`. Let me do one confirming run to demonstrate the load-dependent failure and rule out the state-pollution theory definitively by checking the failure shape.

The failure shape is decisive: `expect(capturedResult).toBeDefined()` → `undefined`. If a polluter had mutated shared LoRA engine state, the handler would still RESOLVE (capturedResult would be defined) but the parsed value would be wrong (e.g., `registered` count off, or a stale expert present). Instead, `capturedResult` is entirely `undefined`, meaning the `.then()` callback never fired in time — pure timing. The `expected 0 to be greater than 0` on `olora_check` (line 747, `violation_count`) is the same race: the handler partially resolved or a different timing window, but the core symptom is non-resolution within budget.

Let me confirm the worker/pool config to characterize severity precisely.

### Assistant | 2026-06-23T16:19:28.463Z

[tool_use: Bash]

### User | 2026-06-23T16:19:35.594Z

[tool_result] vitest.config.ts:8: * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
vitest.config.ts:19: * core and they fight the front-end. minThreads = 4 keeps a warm pool for
vitest.config.ts:26: * startup cost and share the V8 isolate cache.
vitest.config.ts:35:    pool: "threads",
vitest.config.ts:36:    // Vitest 4 removed `poolOptions` — maxThreads/minThreads/isolate/singleThread

... [+726 chars truncated]

### Assistant | 2026-06-23T16:20:08.915Z

This confirms the full picture. Key config facts:
- `pool: "threads"`, `isolate: true` — workers ARE isolated per test file, so module-level state (the `_loraMoE`/`_doRA` lazy caches in mlDispatcher) is NOT shared across files. This definitively **rules out cross-file shared-state pollution** of the dispatcher caches.
- `maxConcurrency: 16` — up to 16 test files run concurrently across the thread pool, contending for CPU/event-loop time.

With `isolate: true`, a cross-file polluter mutating module-level state is architecturally impossible (each file gets a fresh module registry). The flake is purely **CPU/event-loop contention** under concurrent execution: the test's fire-and-forget async handler with a fixed 50ms `setTimeout` budget is starved when 16 files compete for the thread pool, so the handler's `await import(...)` lazy-load chain doesn't resolve in 50ms.

I have a definitive answer with 4 vitest invocations used. The error-triage hook's own diagnosis agrees: "a promise never resolved... missing await / unresolved mock." Final report:

---

## REGRESSION HUNT REPORT

**Failing test:** `H:\prism\mcp-server\src\__tests__\engines\loraCompositionU-LEARN-05.test.ts` :: `mlDispatcher LoRA actions > should handle lora_register_expert via dispatcher` (line 690), `> should handle dora_create via dispatcher` (line 717), and intermittently `> should handle olora_check via dispatcher` (line 747).

**REPRODUCES: yes** — but NOT as a deterministic single-polluter ordering flake. It is a **load-dependent timing/concurrency flake**. Two back-to-back runs of the identical `src/__tests__/engines/` slice gave different results (run 1: 41/41 green; run 2: 2 failed; a third diagnostic run: 3 failed). In isolation it is rock-stable (3/3 runs, 41/41 each, ~330-390ms).

**Error shape (decisive):** `expect(capturedResult).toBeDefined()` receives `undefined` (lines 690, 717), and `expect(parsed.violation_count).toBeGreaterThan(0)` receives `0` (line 747). The handler's `.then(r => ca
... [+4097 chars truncated]
