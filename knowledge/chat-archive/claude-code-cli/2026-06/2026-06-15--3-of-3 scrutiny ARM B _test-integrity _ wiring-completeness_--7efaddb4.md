---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "3-of-3 scrutiny ARM B (test-integrity + wiring-completeness, weighted toward wha"
date: "2026-06-15"
first_ts: "2026-06-15T15:51:45.461Z"
last_ts: "2026-06-15T15:57:34.141Z"
cwd: "H:\\prism"
messages: 69
user_msgs: 25
assistant_msgs: 44
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-aec09c88faf33984f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# 3-of-3 scrutiny ARM B (test-integrity + wiring-completeness, weighted toward wha

> **claude-code-cli** | 2026-06-15 | 69 msgs (25 user / 44 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-aec09c88faf33984f.jsonl`

## Transcript

### User | 2026-06-15T15:51:45.461Z

3-of-3 scrutiny ARM B (test-integrity + wiring-completeness, weighted toward what a holistic pass misses) for commit HEAD on H:/prism. Run `git -C H:/prism show HEAD` and read end-to-end:
- mcp-server/src/__tests__/ZuluWaveSchedulerEngine.test.ts (32 tests)
- mcp-server/src/__tests__/ZuluTaskContinuityEngine.test.ts (26 tests)
- mcp-server/src/__tests__/ZuluFleetHealthSynthesisEngine.test.ts (35 tests)

Verify TEST INTEGRITY (R9 — tests verify intent, not just behavior):
1. Are assertions REAL reference-values/invariants, or weak stubs (toBeDefined/toBeTruthy without a value)? Flag every weak assertion as P0.
2. Coverage floor: happy + >=3 failure modes + >=2 adversarial (NaN/Infinity/empty/oversize) per engine — present?
3. Do the dispatcher ROUND-TRIP tests actually invoke THROUGH sessionDispatcher (registerSessionDispatcher + captured handler / MockMCPServer), not just the engine singleton? Confirm all 3 engines have a real round-trip test that passes.
4. WIRING COMPLETENESS: are all new actions (schedule_wave, compute_wave_n, wave_partition_render, wave_next_render, continuity_checkpoint, continuity_resume, continuity_list_midflights, zulu_fleet_health_snapshot, zulu_fleet_health_slot_readiness) in BOTH the z.enum ACTIONS list AND have a case handler in sessionDispatcher.ts? Any enum-without-case or case-without-enum?
5. Any inlined physics/material constants (there should be none — these are orchestration engines)?
6. The C3 test sets `const WIRED = true` — confirm that's honest (the actions ARE wired) and not a softening; confirm the success-path assertions are non-trivial.
Flag P0/P1 with file:line. Grade PASS or FAIL. Concise.

### Assistant | 2026-06-15T15:51:49.761Z

I'll review the commit HEAD end-to-end, focusing on test integrity and wiring completeness.

### Assistant | 2026-06-15T15:51:50.693Z

[tool_use: Bash]

### User | 2026-06-15T15:51:59.216Z

[tool_result] commit dd56b17ebfb93a2da43d4f95c66f37b44b1e2cf5
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 15 10:50:24 2026 -0500

    [MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C1C2C3 (slot:zulu): build+wire 3 hermes-zulu capability engines (multi-wave DAG / task-continuity / fleet-health synthesis)
    
    Built for bravo per operator directive (ultracode 3-arm paral
... [+1552 chars truncated]

### Assistant | 2026-06-15T15:52:01.386Z

I'll read the three test files and the dispatcher diff end-to-end.

### Assistant | 2026-06-15T15:52:02.211Z

[tool_use: Read]

### Assistant | 2026-06-15T15:52:02.692Z

[tool_use: Read]

### Assistant | 2026-06-15T15:52:03.193Z

[tool_use: Read]

### User | 2026-06-15T15:52:06.166Z

[tool_result] 1	/**
2	 * Tests for ZuluWaveSchedulerEngine -- multi-wave DAG scheduler for Hermes fan-out.
3	 *
4	 * Coverage: reference DAGs (linear chain, diamond, parallel leaves, single node,
5	 * empty), cycle->error, adversarial (self-dep, missing dep, duplicate ids, NaN /
6	 * Infinity / oversize / non-array completed sets), and structural invariants
7	 * (exactly-one-wave, wave-k-after-deps-in-earlier-w
... [+15530 chars truncated]

### User | 2026-06-15T15:52:06.270Z

[tool_result] 1	/**
2	 * Tests for ZuluTaskContinuityEngine (ZULU/C2-TASK-CONTINUITY)
3	 *
4	 * Coverage floor (per comprehensive-build enforcement):
5	 *   - happy path: checkpoint -> resume round-trip; createdAt/revision/state fidelity
6	 *   - >=3 failure modes: invalid unit id, corrupted-JSON -> fail-closed,
7	 *     schemaVersion mismatch -> refuse-write, missing-unit resume
8	 *   - >=2 adversarial: empty
... [+19188 chars truncated]

### User | 2026-06-15T15:52:06.603Z

[tool_result] 1	/** ZuluFleetHealthSynthesisEngine tests -- C3 fleet-health synthesis.
2	 *  Real reference-value + algebraic-invariant assertions (R9): every test
3	 *  encodes WHY the behavior matters and would FAIL if the scoring logic changed.
4	 */
5	import { describe, it, expect } from "vitest";
6	import {
7	  ZuluFleetHealthSynthesisEngine,
8	  STALE_TTL_MS,
9	  CRASH_TTL_MS,
10	  W_FRESH,
11	  W_QUEUE,

... [+18348 chars truncated]

### Assistant | 2026-06-15T15:52:09.819Z

Now let me read the dispatcher diff and the three engine files to verify wiring and contracts.

### Assistant | 2026-06-15T15:52:10.467Z

[tool_use: Bash]

### User | 2026-06-15T15:52:21.260Z

[tool_result] commit dd56b17ebfb93a2da43d4f95c66f37b44b1e2cf5
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Mon Jun 15 10:50:24 2026 -0500

    [MAIN-FORCE] [HERMES-CAPABILITY-EXPANSION]/U-ZULU-CAP-C1C2C3 (slot:zulu): build+wire 3 hermes-zulu capability engines (multi-wave DAG / task-continuity / fleet-health synthesis)
    
    Built for bravo per operator directive (ultracode 3-arm paral
... [+6217 chars truncated]

### Assistant | 2026-06-15T15:52:23.962Z

Now let me read the three engine files to verify the contracts the tests assert against, and confirm there are no inlined constants and that the engines match the dispatcher wiring.

### Assistant | 2026-06-15T15:52:24.876Z

[tool_use: Read]

### Assistant | 2026-06-15T15:52:25.326Z

[tool_use: Read]

### Assistant | 2026-06-15T15:52:25.579Z

[tool_use: Read]

### User | 2026-06-15T15:52:27.112Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ZuluWaveSchedulerEngine.ts' was already read 52s ago in this session and is unchanged (mtime 1781537319221). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### User | 2026-06-15T15:52:30.625Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ZuluTaskContinuityEngine.ts' was already read 53s ago in this session and is unchanged (mtime 1781537311550). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_
... [+8 chars truncated]

### User | 2026-06-15T15:52:30.665Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\ZuluFleetHealthSynthesisEngine.ts' was already read 53s ago in this session and is unchanged (mtime 1781537630538). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM
... [+14 chars truncated]

### Assistant | 2026-06-15T15:52:33.643Z

The read-once guard reports these were already read this session (they are part of the commit) but I don't have them in my actual context — this is a fresh agent thread. Let me disable the cache and read them.

### Assistant | 2026-06-15T15:52:34.540Z

[tool_use: Bash]

### User | 2026-06-15T15:52:51.161Z

[tool_result] cache disabled for this shell only - will use git show instead

### Assistant | 2026-06-15T15:52:54.063Z

[tool_use: Bash]

### User | 2026-06-15T15:53:08.732Z

[tool_result] /**
 * ZuluWaveSchedulerEngine -- multi-wave DAG scheduler for Hermes fan-out plans.
 *
 * The companion HermesParallelFanoutPlannerEngine (HZP01) decomposes a parent
 * task into N subtasks but its `plan()` only ever emits WAVE 1 -- its leaf-filter
 * (`subtasks.filter(s => s.depends_on.length === 0)`) returns the initial
 * parallelizable set and defers everything with a dependency, with no mach
... [+11656 chars truncated]

### Assistant | 2026-06-15T15:53:11.249Z

The Wave engine matches the tests cleanly. Now the continuity and fleet-health engines.

### Assistant | 2026-06-15T15:53:12.312Z

[tool_use: Bash]

### User | 2026-06-15T15:53:30.559Z

[tool_result] /**
 * ZuluTaskContinuityEngine -- durable cross-session mid-flight task continuity.
 *
 * C2 (ZULU fleet). The gap this fills: the fleet already has
 *   - AtomicClaimBrokerEngine        -- WHO owns a resource (CAS claim + TTL)
 *   - SessionHandoffV2Engine         -- end-of-session human-readable handoff
 *   - CrossSessionOrchestratorEngine -- facade over both + broadcast
 * but NONE of them pe
... [+19227 chars truncated]

### Assistant | 2026-06-15T15:53:33.998Z

Now I see a discrepancy worth checking: the test imports `STALE_AFTER_MS` and asserts the 24h boundary, but it also imports `ZULU_CONTINUITY_SCHEMA_VERSION`. Let me verify one subtle point in the corrupt-store test — the test expects `clear("")` to return false and various behaviors. Let me now read the fleet health engine.

### Assistant | 2026-06-15T15:53:35.068Z

[tool_use: Bash]

### User | 2026-06-15T15:53:45.523Z

[tool_result] /**
 * ZuluFleetHealthSynthesisEngine -- C3 fleet-health synthesis (HZP/HZD family).
 *
 * Pure-core: synthesizes three raw fleet signals -- chat-slot liveness
 * (heartbeat freshness), per-slot task-queue depth, and galaxy coverage --
 * into a single scored FleetHealthVector. This is the genuine gap the
 * watcher SCRIPTS (.claude/fleet-task-health.mjs, .claude/fleet-memory-monitor.mjs)
 * do NO
... [+13577 chars truncated]

### Assistant | 2026-06-15T15:53:51.774Z

Now I have all sources. Let me verify a few critical points. First, the C3 round-trip test asserts the dispatcher returns `r.data.vector`/`r.data.readiness` — but the dispatcher wraps in `ok({ success: true, vector: ... })`. I need to confirm how `ok()` shapes the envelope and how `callSession` unwraps it. The test's `callSession` parses `content[0].text`. Let me check the `ok` helper and the `synthesize` validation path for `request: {slots:[...]}`.

The test passes `request: { slots: [{slot, heartbeatAgeMs, queueDepth}] }` and the dispatcher does `synthesize(p.request)`. That matches. The success envelope has `success:true` plus `vector`. The `callSession` returns `{ok:true, data: parsed}` where parsed is the JSON — so `r.data.vector` works. Good.

Now let me verify the C2 round-trip test's two different harnesses and whether the C2 round-trip test would actually pass through the dispatcher writing to the real store path (hermeticity concern), and confirm the `ok()` helper shape.

### Assistant | 2026-06-15T15:53:53.126Z

[tool_use: Bash]

### User | 2026-06-15T15:53:59.967Z

[tool_result] 611:function ok(data: any) {

### Assistant | 2026-06-15T15:54:06.961Z

I'll use Grep tool instead for the rest. Let me see the `ok()` helper body and confirm the C2 round-trip handler harness `invoke` parses correctly.

### Assistant | 2026-06-15T15:54:07.819Z

[tool_use: Read]

### User | 2026-06-15T15:54:09.236Z

[tool_result] 605	  // ZULU-OBSIDIAN-LIVE-MS0 — ObsidianRestBridgeEngine (live Obsidian vault, READ-ONLY v1).
606	  "obsidian_status",
607	  "obsidian_read",
608	  "obsidian_search"
609	] as const;
610	
611	function ok(data: any) {
612	  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
613	}
614	
615	/**
616	 * Wire-layer mapper for SessionReplayEngine results.
617	 * D
... [+1048 chars truncated]

### Assistant | 2026-06-15T15:54:13.437Z

Now let me verify the dispatcher's z.enum validation path — specifically, does the handler validate `action` against `z.enum(ACTIONS)` before the switch (which would let the unwired-path test be meaningful), and is there a `default:` case. Let me check the handler structure around the switch and how params/action are validated.

### Assistant | 2026-06-15T15:54:14.254Z

[tool_use: Grep]

### User | 2026-06-15T15:54:16.787Z

[tool_result] 841:    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
4524:          default:
4525:            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });

### Assistant | 2026-06-15T15:54:22.496Z

Now I have everything to assess the C3 round-trip honesty. Critical verification: the C3 test sets `const WIRED = true` and asserts the success path. The actions ARE in the enum (line 841 `z.enum(ACTIONS)` validates `action`, and `schedule_wave`...`zulu_fleet_health_slot_readiness` are in ACTIONS per the diff) AND have case handlers. So `WIRED = true` is honest.

Let me confirm the schema registration (line 841 is the `server.tool(...)` schema). The new actions have no dedicated params schema beyond `z.record(z.string(), z.any()).optional()` — that's the pass-through schema mentioned in the commit. That matches existing zulu actions. Let me verify the enum entries are present and count case vs enum.

### Assistant | 2026-06-15T15:54:24.273Z

[tool_use: Grep]

### User | 2026-06-15T15:54:26.124Z

[tool_result] 512:  "schedule_wave",
513:  "compute_wave_n",
514:  "wave_partition_render",
515:  "wave_next_render",
517:  "continuity_checkpoint",
518:  "continuity_resume",
519:  "continuity_list_midflights",
521:  "zulu_fleet_health_snapshot",
522:  "zulu_fleet_health_slot_readiness",
3759:          case "schedule_wave": {
3764:          case "compute_wave_n": {
3769:          case "wave_partition_render": 
... [+295 chars truncated]

### Assistant | 2026-06-15T15:54:33.882Z

All 9 actions appear exactly twice — once in the enum (512-522) and once as a case (3759-3805). Perfect 1:1 enum↔case correspondence, no orphans either direction.

Now let me examine the C2 round-trip test more carefully for a real concern: it round-trips through the dispatcher which uses the **singleton** `zuluTaskContinuityEngine` bound to the **real DEFAULT_STORE_PATH** (`H:/prism/mcp-server/data/state/zulu-task-continuity.json`). The test writes a randomized unit `ZULU-MS0::U-RT-<hex>` but never cleans it up — it pollutes the canonical store. Let me confirm there's no cleanup and assess severity. Also verify the C2 round-trip's `invoke` unwrapping handles `ok()` shape: dispatcher returns `ok(zc.checkpoint(...))` where checkpoint returns `{ok:true, record, created}`. `invoke` parses `content[0].text` → `{ok:true,...}`. Test asserts `cpText.ok===true` and `record.unitId===unit`. That matches.

Let me also verify whether the dispatcher handler runs `slimResponse` which could strip fields the test relies on (e.g. `record.state.phase`).

### Assistant | 2026-06-15T15:54:35.023Z

[tool_use: Grep]

### User | 2026-06-15T15:54:37.115Z

[tool_result] No matches found

### Assistant | 2026-06-15T15:54:41.340Z

`slimResponse` is imported, not defined locally. Let me locate it to confirm it doesn't strip nested fields the round-trip tests assert on (e.g. `vector.perSlot[0].readinessScore`, `record.state.phase`).

### Assistant | 2026-06-15T15:54:42.330Z

[tool_use: Grep]

### User | 2026-06-15T15:54:45.502Z

[tool_result] 19:import { slimResponse } from "../../utils/responseSlimmer.js";
612:  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };

### Assistant | 2026-06-15T15:54:50.506Z

The graph context flags a known behavior: `slimResponse` strips empty arrays. This is a real test-integrity concern for the C3 round-trip and the C1 handlers. Let me read `slimResponse` to determine exactly what it strips — if it strips empty arrays, the C1 `wave_partition_render` for an empty plan or `computeWaveN` results with empty `ready`/`blocked` could lose fields, and the C3 round-trip asserts `vector.perSlot[0].readinessScore` (perSlot is non-empty, fine), but I want to confirm it doesn't strip the numeric `0` readinessScore or empty `degraded:null`.

### Assistant | 2026-06-15T15:54:50.803Z

[tool_use: Read]

### User | 2026-06-15T15:54:59.149Z

[tool_result] 1	/**
2	 * Response Slimmer Utility
3	 * Reduces verbose response objects for MCP transport efficiency.
4	 * @module utils/responseSlimmer
5	 */
6	
7	/**
8	 * Slim a response object by removing null/undefined values and empty arrays.
9	 *
10	 * @param response - the value to slim
11	 * @param maxDepth - recursion ceiling (default 32). A circular reference or a
12	 *   pathologically deep payload w
... [+2516 chars truncated]

### Assistant | 2026-06-15T15:55:08.655Z

I now have full verification of the `slimResponse` behavior. This confirms a real test-integrity concern. Let me trace each round-trip assertion against `slimResponse` stripping (null/undefined values + empty arrays):

**C3 (`zulu_fleet_health_snapshot`)**: test asserts `vector.perSlot[0].readinessScore` ≈ 1.0. With `sig("alpha", heartbeatAgeMs:0, queueDepth:0)`, readinessScore is exactly 1.0 (truthy non-zero) → survives. But `degraded:null` is stripped, `galaxy:null` stripped — test doesn't assert those. The `slot_readiness` test asserts `readiness[0].slot === "bravo"`. The readiness array is non-empty, slot is a string → survives. **C3 round-trip is sound.**

**C2 round-trip**: asserts `cpText.ok===true`, `record.unitId===unit`, then `rsText.found===true`, `rsText.record.state.phase==="rt"`. `state:{phase:"rt"}` is non-empty → survives. `found:true` truthy. **C2 round-trip is sound** — but writes to the real canonical store with no cleanup.

Let me confirm the C2 round-trip pollution concern by checking whether the dispatcher path uses the singleton (real path) vs a test override. The dispatcher imports `zuluTaskContinuityEngine` (the singleton) which resolves `DEFAULT_STORE_PATH` unless `PRISM_ZULU_CONTINUITY_PATH` is set. The test sets no env. Let me verify the canonical store file isn't checked in / whether this matters.

### Assistant | 2026-06-15T15:55:09.790Z

[tool_use: Bash]

### User | 2026-06-15T15:55:24.504Z

[tool_result] ---ls state dir for the file---
-rw-r--r-- 1 wompu 197611 1101 Jun 15 10:49 mcp-server/data/state/zulu-task-continuity.json

### Assistant | 2026-06-15T15:55:31.225Z

The canonical store IS present on disk (1101 bytes) and is NOT gitignored (no output from `check-ignore`). The C2 round-trip test writes a `ZULU-MS0::U-RT-<random>` record into this real canonical store on every run and never clears it. Let me confirm its current contents to gauge whether test pollution has already accreted.

### Assistant | 2026-06-15T15:55:31.736Z

[tool_use: Bash]

### User | 2026-06-15T15:55:41.289Z

[tool_result] schemaVersion 1
record keys:
  ZULU-MS0::U-RT-bd657b05
  ZULU-MS0::U-RT-79dfccdd
  ZULU-MS0::U-RT-698a194a
---git status of file---
?? mcp-server/data/state/zulu-task-continuity.json

### Assistant | 2026-06-15T15:55:48.622Z

Confirmed. The C2 round-trip test has already left 3 orphan `U-RT-*` records in the real canonical store — proof the test mutates production state with no cleanup. The store is untracked (`??`), so it's not committed, but it IS the live path the production dispatcher reads. This is a P1 test-hygiene defect: the round-trip test is not hermetic (the unit-level C2 tests correctly use `__forTests(tmpPath)`, but the round-trip test bypasses that and hits the singleton's real path).

Now let me verify the remaining checklist items. Check coverage floors and confirm there are no inlined physics constants (these are orchestration engines — `STALE_TTL_MS`, `W_FRESH` etc. are orchestration thresholds, not Kienzle/Taylor/material — and the engine documents why thresholds are re-declared vs imported). Let me also verify the C1 test's claim that `.skip`/`.only` are absent across all three files, and that no weak `toBeDefined`/`toBeTruthy` stubs are used as the sole assertion.

### Assistant | 2026-06-15T15:55:50.395Z

[tool_use: Bash]

### User | 2026-06-15T15:55:57.098Z

[tool_result] === ZuluWaveSchedulerEngine.test.ts ===
  (none)
=== ZuluTaskContinuityEngine.test.ts ===
  (none)
=== ZuluFleetHealthSynthesisEngine.test.ts ===
  (none)

### Assistant | 2026-06-15T15:56:00.418Z

No `.skip`/`.only`, no weak `toBeDefined`/`toBeTruthy`/`toBeFalsy` stubs anywhere. Every assertion uses real values (`toEqual`, `toBe` with concrete values, `toBeCloseTo` with reference numbers, `toThrow(/regex/)`, monotonicity invariants).

Now let me confirm the tests actually pass (the prompt asserts 93/93). Let me run the three test files.

### Assistant | 2026-06-15T15:56:02.127Z

[tool_use: Bash]

### User | 2026-06-15T15:56:14.826Z

[tool_result]  RUN  v4.1.5 H:/PRISM/mcp-server

 ✓ src/__tests__/ZuluWaveSchedulerEngine.test.ts (32 tests) 11ms
stderr | src/__tests__/ZuluTaskContinuityEngine.test.ts > ZuluTaskContinuityEngine -- dispatcher round-trip [WIRING-PENDING] > prism_session routes continuity_checkpoint -> continuity_resume
[INFO] [prism_session] continuity_checkpoint

stderr | src/__tests__/ZuluFleetHealthSynthesisEngine.test.ts > 
... [+1008 chars truncated]

### Assistant | 2026-06-15T15:56:19.364Z

All 93 pass, and all 3 round-trip tests actually invoke through `registerSessionDispatcher` + captured handler. The `[INFO] [prism_session] continuity_checkpoint`/`zulu_fleet_health_snapshot` log lines are proof the real dispatcher case bodies executed (not the engine singleton directly).

Now let me verify the round-trip just polluted the store again (it ran), and confirm the count grew — final proof of the P1.

### Assistant | 2026-06-15T15:56:20.452Z

[tool_use: Bash]

### User | 2026-06-15T15:56:54.347Z

[tool_result] record count now: 4
  ZULU-MS0::U-RT-bd657b05
  ZULU-MS0::U-RT-79dfccdd
  ZULU-MS0::U-RT-698a194a
  ZULU-MS0::U-RT-110e79a6

### Assistant | 2026-06-15T15:57:34.141Z

Confirmed: the count grew from 3 to 4 after one test run. Each invocation of the C2 round-trip test permanently appends a new orphan record to the live canonical store with no cleanup — unbounded accretion in the production continuity file.

Let me do a final check on coverage floors per engine and confirm the C2 round-trip test's `[WIRING-PENDING]` comment is now stale/dishonest (the comment says "EXPECTED TO FAIL until the live chat applies the wiring delta" but the wiring IS applied and it passes).

Let me verify the C2 round-trip describe block comment against the actual wired state.

The C2 test file (lines 372-376) has:
> "This asserts the dispatcher actions exist + route to the engine. It is EXPECTED TO FAIL until the live chat applies the wiring delta (adds continuity_checkpoint / continuity_resume / continuity_list_midflights to sessionDispatcher + sessionActionSchemas). Marked so the gate sees it."

But the wiring IS applied (cases at 3781-3794, enum at 517-519) and the test passes. The comment is now stale — it describes a pre-wiring state that no longer exists. Compare to C3, whose comment was correctly updated with the `WIRED = true` note at line 297-298. This is a P2 doc-staleness issue (the test is correct and passes; only its header comment lies about expecting failure).

Let me confirm coverage floors are met per engine before finalizing.

**C1 (ZuluWaveScheduler)** — happy: linear/diamond/parallel/single/empty/join (6+). Failure modes: cycle (2-cycle, 3-cycle, mixed), self-dep, missing dep, duplicate id (≥3). Adversarial: oversize >200, NaN/Infinity/null/undefined/non-string completed, non-array completed (≥2). Plus structural invariants. **Floor met.**

**C2 (ZuluTaskContinuity)** — happy: checkpoint→resume, durable reload, re-checkpoint revision, clear, singleton (5). Failure modes: invalid unit id, corrupt JSON fail-closed, schema mismatch refuse, missing-unit resume, missing-records-map (≥3). Adversarial: empty unit, oversize state, non-object 
... [+5434 chars truncated]
