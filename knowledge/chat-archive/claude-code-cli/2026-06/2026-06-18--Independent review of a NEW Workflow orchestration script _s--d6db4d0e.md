---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Independent review of a NEW Workflow orchestration script (slot:bravo, PRISM). I"
date: "2026-06-18"
first_ts: "2026-06-18T18:16:49.941Z"
last_ts: "2026-06-18T18:19:53.575Z"
cwd: "H:\\prism"
messages: 47
user_msgs: 17
assistant_msgs: 30
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a0a8bbf03025b3ec5.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Independent review of a NEW Workflow orchestration script (slot:bravo, PRISM). I

> **claude-code-cli** | 2026-06-18 | 47 msgs (17 user / 30 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a0a8bbf03025b3ec5.jsonl`

## Transcript

### User | 2026-06-18T18:16:49.941Z

Independent review of a NEW Workflow orchestration script (slot:bravo, PRISM). It is orchestration (agent()/parallel()/phase()/args hooks run only in the PRISM Workflow runtime; not importable/unit-testable), so judge it on STRUCTURE, SAFETY, honesty, and whether it is a legitimate non-orphan artifact. Grade PASS/FAIL with P0/P1/P2 + file:line.

FILE: H:\prism\.claude\workflows\hermes-multiwave-build.mjs

CONTEXT: This is the C1 "runtime driver" agent-spawning EXECUTOR -- the harness on top of the deterministic cores (project_governed_schedule + wave_loop_step + the ZuluWaveSchedulerEngine, all tested). The operator's brief #2 ("wire the runtime driver so autonomous multi-wave building actually runs") + the standing /goal ("use harnessed loops") motivate it. It is built as a SAVED, NAMED, operator-invocable Workflow (not auto-run -- running it autonomously builds+commits code via fan-out, which is operator-greenlit). The builder is slot:bravo, whose soul refuses `unsafe-fleet-control-before-governance`.

CHECK:
- SAFETY / governance-before-control: is the executor GOVERNED-BY-CONSTRUCTION (it dispatches only what project_governed_schedule deems feasible + what wave_loop_step's per-assignment governor/delegation authorizes), so building it does NOT violate `unsafe-fleet-control-before-governance`? Or is there a path where it autonomously controls the fleet without the governance gate? 
- HONEST SCOPING: does the file/commit honestly frame this as BUILT + structurally-reviewed but NOT yet run-validated (running it is operator-supervised), rather than claiming a verified-working executor? Is shipping a never-run orchestration script a legitimate artifact (operator-invocable runtime driver) or an orphan / "generating != delivering"? 
- DEDUP: does it duplicate an existing executor/Workflow? (Pre-write graph flagged ghost build-plans 'HERMES EFFICIENCY-ROUTER', 'HERMES VAULT+OLLAMA', 'ZULU/Hermes build verification' -- are any of those an EXISTING multi-wave executor thi
... [+1045 chars truncated]

### Assistant | 2026-06-18T18:16:59.439Z

I'll review the Workflow orchestration script end to end. Let me start by reading the target file in full.

### Assistant | 2026-06-18T18:16:59.574Z

[tool_use: Read]

### User | 2026-06-18T18:17:00.427Z

[tool_result] read-once-guard: 'H:\prism\.claude\workflows\hermes-multiwave-build.mjs' was already read 21s ago in this session and is unchanged (mtime 1781806509184). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=
... [+2 chars truncated]

### Assistant | 2026-06-18T18:17:02.868Z

The guard says it's already in context, but I don't see it. Let me bypass with offset/limit to get the content.

### Assistant | 2026-06-18T18:17:03.742Z

[tool_use: Read]

### User | 2026-06-18T18:17:05.372Z

[tool_result] 1	export const meta = {
2	  name: 'hermes-multiwave-build',
3	  description: 'C1 runtime driver: feasibility-gate a decomposed fan-out plan via project_governed_schedule, then DRIVE it wave-by-wave through wave_loop_step -- spawning governed builder agents per wave until the DAG drains. The agent-spawning executor that sits on top of the ZuluWaveSchedulerEngine cores (slot:bravo).',
4	  whenToUse:
... [+9442 chars truncated]

### Assistant | 2026-06-18T18:17:10.351Z

I have the full file (171 lines). Now let me verify the claims it makes about the deterministic cores it depends on. The script references `project_governed_schedule`, `wave_loop_step` as `prism_session` actions. Let me verify those exist and check their actual contracts (existence != correctness — read the body).

### Assistant | 2026-06-18T18:17:11.801Z

[tool_use: Grep]

### Assistant | 2026-06-18T18:17:11.902Z

[tool_use: Glob]

### User | 2026-06-18T18:17:14.019Z

[tool_result] .claude\workflows\db-coverage-assess.mjs
.claude\workflows\tournament-rank.test.mjs
.claude\workflows\tournament-rank.mjs
.claude\workflows\fix-inefficiencies-gaps.mjs
.claude\workflows\hermes-multiwave-build.mjs

### User | 2026-06-18T18:17:14.809Z

[tool_result] Found 6 files
mcp-server\src\__tests__\sessionDispatcher.projectSchedule.e2e.test.ts
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
mcp-server\src\__tests__\sessionDispatcher.backpressureThrottle.e2e.test.ts
mcp-server\src\__tests__\ZuluTaskContinuityEngine.test.ts
mcp-server\src\engines\ZuluTaskContinuityEngine.ts
mcp-server\src\__tests__\sessionDispatcher.waveLoopStep.e2e.test.ts

### Assistant | 2026-06-18T18:17:18.894Z

Both actions exist in `sessionDispatcher.ts` and have dedicated e2e tests. Let me read the dispatcher contracts for both actions to verify the script invokes them correctly (param names, return shapes) and to verify the governance-by-construction claims.

### Assistant | 2026-06-18T18:17:19.913Z

[tool_use: Grep]

### User | 2026-06-18T18:17:21.468Z

[tool_result] 534-  // C1 SAFETY GATE -- next wave with the ZuluFleetGovernorEngine authority check applied per assignment.
535-  "governed_wave_execute",
536-  // C1+C2 RESUMABILITY -- a governed wave step that resumes/checkpoints completed_ids via ZuluTaskContinuityEngine (survives /compact).
537:  "wave_loop_step",
538-  // C1 FULL PROJECTION -- the COMPLETE governed multi-wave schedule + drains/stalled feas
... [+2642 chars truncated]

### Assistant | 2026-06-18T18:17:28.552Z

Now let me read the full body of both dispatcher cases to verify the return shapes and the governance-by-construction claim. I need to see what `project_governed_schedule` actually returns (does it expose `drains`, `stalled`, `total_subtasks`, `wave_count`?) and what `wave_loop_step` returns (does it expose `done`, `completed_ids`, `wave_assignments`?).

### Assistant | 2026-06-18T18:17:28.744Z

[tool_use: Read]

### User | 2026-06-18T18:17:29.939Z

[tool_result] 4044	          // C1 FULL PROJECTION: the COMPLETE governed multi-wave schedule in ONE call -- loops the
4045	          // governor over simulated all-succeed completions to a drains/stalled feasibility verdict.
4046	          // The upfront check a runtime executor runs BEFORE spawning any agent (will this DAG drain
4047	          // as governed, or stall on a vetoed/unrouted subtask?). Same call
... [+7361 chars truncated]

### Assistant | 2026-06-18T18:17:35.045Z

This is a critical finding. The actual dispatcher return shapes do NOT match what the Workflow script's schemas and consuming logic expect. Let me verify the exact shapes carefully.

Both dispatcher actions return via `ok({ success: true, ... })`. Let me check what `ok()` wraps the payload in, and verify the structure the script reads against. The script reads `sched.drains`, `sched.total_subtasks`, etc. directly, and `wave.done`, `wave.completed_ids`, `wave.wave_assignments` directly.

Let me look at the `ok()` helper and the engine return shapes.

### Assistant | 2026-06-18T18:17:36.568Z

[tool_use: Grep]

### User | 2026-06-18T18:17:38.349Z

[tool_result] 130: * {@link ZuluWaveSchedulerEngine.governedNextWave} result -- a WaveExecution whose
131- * `wave_assignments` have each PASSED the governor authority check, plus the
132- * `vetoed` assignments the governor rejected (kept for the audit trail, never
133- * dispatched).
134- */
135-export interface GovernedWaveExecution extends WaveExecution {
136-  vetoed: VetoedAssignment[];
137-}
138-
139-/**
... [+12221 chars truncated]

### Assistant | 2026-06-18T18:17:47.706Z

Now I have the exact return shapes. Let me carefully reconcile the layers.

**`project_governed_schedule` dispatcher returns:** `ok({ success: true, schedule: ProjectedSchedule })` (sessionDispatcher.ts:4056). So the schedule fields (`drains`, `total_subtasks`, `wave_count`, `stalled`) are nested under `.schedule`, itself nested under whatever `ok()` wraps.

**`wave_loop_step` dispatcher returns:** `ok({ success: true, execution, completed_ids, resumed, resumedStale, checkpointed })` (sessionDispatcher.ts:4086). Critically:
- There is **no top-level `done`** field — `done` lives at `execution.done` (a `WaveExecution`/`GovernedWaveExecution`).
- There is **no `wave_assignments`** at top level — it lives at `execution.wave_assignments`.
- `completed_ids` IS at the top level.

But the Workflow script (lines 128-130) reads `wave.done`, `wave.completed_ids`, and `wave.wave_assignments` directly. And its `WAVE_SCHEMA` (lines 62-77) requires `done`, `wave_assignments`, `completed_ids` at the top level.

However — the agent prompt mediates this. The script doesn't call the dispatcher directly; an `agent()` invokes the MCP tool and is told what to return. Let me re-read those prompts carefully because this is the crux of whether the mismatch is a real bug or absorbed by the agent instruction. Let me also confirm the `ok()` wrapper shape and check the e2e tests to see the literal returned structure.

### Assistant | 2026-06-18T18:17:50.039Z

[tool_use: Grep]

### Assistant | 2026-06-18T18:17:50.421Z

[tool_use: Read]

### User | 2026-06-18T18:17:52.014Z

[tool_result] 1	import { describe, it, expect, beforeEach, afterEach } from "vitest";
2	import * as fs from "node:fs";
3	import * as os from "node:os";
4	import * as path from "node:path";
5	
6	/**
7	 * Dispatcher round-trip E2E for prism_session:wave_loop_step
8	 * (HERMES-CAPABILITY-C2/U-C2-PRODUCER-WAVE-LOOP, slot:bravo).
9	 *
10	 * This is the R15-VALIDATE proof that the C1+C2 wave loop closes the
11	 * Zul
... [+10086 chars truncated]

### User | 2026-06-18T18:17:52.417Z

[tool_result] 661:function ok(data: any) {
715:      ok: false,
727:      ok: false,
2662:                ok: false,

### Assistant | 2026-06-18T18:17:59.425Z

This confirms the finding decisively. The e2e test (lines 107-109, 143-147, 164-170) proves the **authoritative dispatcher return shape**:

- `done` is at `r.execution.done` — NOT `r.done`
- `wave_assignments` is at `r.execution.wave_assignments` — NOT `r.wave_assignments`
- `completed_ids` IS at top level `r.completed_ids` (correct)

And critically (test lines 75-78, 104-106, 165-167): **`ok()` runs `slimResponse()` which DROPS empty arrays fleet-wide**. So an empty `wave_assignments` / `completed_ids` / `stalled` comes back **ABSENT**, not `[]`.

Now let me reconcile this against the Workflow script and the agent-mediation layer, since the script doesn't read the dispatcher directly — an `agent()` does, instructed by the prompt. Let me re-examine the prompt instructions versus the schemas, and verify how `slimResponse` behaves. Let me confirm the slimmer drops empty arrays and check the `project_governed_schedule` e2e test for the schedule nesting.

### Assistant | 2026-06-18T18:17:59.947Z

[tool_use: Read]

### User | 2026-06-18T18:18:00.454Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\__tests__\sessionDispatcher.projectSchedule.e2e.test.ts' was already read 18m ago in this session and is unchanged (mtime 1781805398425). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (
... [+28 chars truncated]

### Assistant | 2026-06-18T18:18:03.118Z

The guard says I read it 18m ago, but I don't have it in context (this is a fresh agent thread). Let me read it with an offset to bypass.

### Assistant | 2026-06-18T18:18:03.835Z

[tool_use: Read]

### User | 2026-06-18T18:18:05.590Z

[tool_result] 1	import { describe, it, expect, beforeEach, afterEach } from "vitest";
2	import * as fs from "node:fs";
3	import * as os from "node:os";
4	import * as path from "node:path";
5	
6	/**
7	 * Dispatcher round-trip E2E for the C1 full governed schedule projection
8	 * (U-WAVE-PROJECT-SCHEDULE, slot:bravo). The R15-VALIDATE proof that
9	 * prism_session:project_governed_schedule actually runs the engin
... [+5367 chars truncated]

### Assistant | 2026-06-18T18:18:20.005Z

Now I have full, verified evidence on both layers. Let me consolidate the analysis of the layered contract.

**Verified dispatcher truth (from e2e tests + source):**

For `project_governed_schedule` (test line 74): the schedule is at `r.schedule.{drains, dispatched_count, total_subtasks, wave_count, stalled}`. Empty `stalled` is **slimmed to absent**.

For `wave_loop_step` (test lines 107-109): `done`/`wave_assignments` are at `r.execution.*`; `completed_ids` is at `r.*`. Empty arrays are **slimmed to absent**.

**Now the Workflow layer.** The script does NOT read the dispatcher JSON directly. Each `agent()` call is an LLM agent told to "Return ONLY the resulting schedule object (its drains, dispatched_count, total_subtasks, wave_count, and stalled fields)" (lines 96-99) and for the wave: "Return ONLY the resulting object (done, completed_ids, and wave_assignments as [{subtask_id, slot}])" (lines 121-124), with a `schema` validator on each `agent()`.

This is the key structural judgment. Let me assess whether the prompt-mediation absorbs the nesting/slimming mismatch or whether it is a latent reliability risk.

The script flattens the contract via the agent prompt: the agent is explicitly instructed to extract the named fields and return them flat (`done`, `completed_ids`, `wave_assignments`), and the `schema` enforces that shape on the agent's return. So at the structural level, the script is internally consistent with its own schemas — the agent is the adapter that maps `r.execution.done -> done`. This is a legitimate Workflow pattern (the script body cannot call MCP directly; only an agent can, per the file's own comment lines 20-22). I will not flag the nesting as a P0 logic bug because the agent is instructed to do the flattening, and the prompt names the exact fields. But there is a real, citeable reliability seam worth a P2: the prompt for the wave step says return `wave_assignments as [{subtask_id, slot}]` — yet the authoritative source nests it under `execu
... [+520 chars truncated]

### Assistant | 2026-06-18T18:18:21.396Z

[tool_use: Grep]

### User | 2026-06-18T18:18:23.230Z

[tool_result] .claude\workflows\tournament-rank.mjs:125:  const results = await parallel(pairs.map(([x, y]) => () => judgePair(x, y).then((r) => ({ x, y, r }))))
.claude\workflows\tournament-rank.mjs:140:    const roundResults = await parallel(pairs.map(([x, y]) => () => judgePair(x, y).then((r) => ({ x, y, r }))))
.claude\workflows\fix-inefficiencies-gaps.mjs:157:    return parallel(
.claude\workflows\hermes-m
... [+3952 chars truncated]

### Assistant | 2026-06-18T18:18:30.741Z

No other Workflow consumes `wave_loop_step` or `project_governed_schedule`. The only other `parallel()` uses (tournament-rank, fix-inefficiencies-gaps, db-coverage-assess) are unrelated (ranking, gap-fixing, coverage assessment) — none is a multi-wave governed build executor. So `hermes-multiwave-build` is the **sole** consumer of these two cores and does not duplicate an existing executor. The pre-write-graph ghost build-plans named in the brief ('HERMES EFFICIENCY-ROUTER', 'HERMES VAULT+OLLAMA', 'ZULU/Hermes build verification') are unrelated planning ghosts, not an existing multi-wave executor. DEDUP is clean.

Now let me verify the Workflow runtime primitives (`agent`, `parallel`, `phase`, `log`, `args`) exist and behave as the script assumes — particularly that `parallel(fns)` takes an array of thunks and returns results in order, since the script relies on positional correspondence between `assignments` and `results` (line 154-155 pushes all results, line 155 counts completed). Let me find the Workflow runtime.

### Assistant | 2026-06-18T18:18:33.122Z

[tool_use: Grep]

### Assistant | 2026-06-18T18:18:34.270Z

[tool_use: Grep]

### User | 2026-06-18T18:18:36.615Z

[tool_result] Found 20 files limit: 20
.claude\workflows\hermes-multiwave-build.mjs
scripts\build-state-snapshot.mjs
scripts\lib\feature-routing-graph.mjs
scripts\build-milestone-progress.test.mjs
scripts\build-milestone-progress.mjs
.claude\workflows\fix-inefficiencies-gaps.mjs
scripts\lib\loop-goal-stack-advisor.test.mjs
scripts\lib\loop-goal-stack-advisor.mjs
scripts\roadmap-to-viz-nodes.mjs
scripts\mine-rom
... [+487 chars truncated]

### User | 2026-06-18T18:18:37.385Z

[tool_result] Found 20 files limit: 20
mcp-server\src\engines\ZuluWaveSchedulerEngine.ts
mcp-server\src\__tests__\ZuluWaveSchedulerEngine.projectSchedule.test.ts
mcp-server\src\engines\MultiModelConsensusEngine.ts
mcp-server\src\__tests__\sessionDispatcher.projectSchedule.e2e.test.ts
mcp-server\src\tools\dispatchers\sessionDispatcher.ts
mcp-server\src\engines\EventBus.ts
mcp-server\src\index.ts
mcp-server\src\e
... [+713 chars truncated]

### Assistant | 2026-06-18T18:18:48.793Z

The Workflow runtime (`agent`/`parallel`/`phase`/`log`/`args`) is the PRISM Workflow harness — it's the runtime injected when a Workflow is invoked, not a repo lib (consistent with the file's comment that the script body cannot import repo libs). I can confirm the same primitives are used identically by the existing, working Workflows (tournament-rank.mjs, fix-inefficiencies-gaps.mjs, db-coverage-assess.mjs all use `parallel(arr.map(() => () => ...))`, `agent(prompt, {schema})`, `phase()`). So the script's use of `parallel(assignments.map((asg) => () => agent(...)))` matches the established harness contract — `parallel` takes thunks and (per the tournament-rank usage that pairs results back to inputs) preserves order. The `.then((r) => r || {...})` fallback (line 151) guards each result against null. This is structurally sound and idiomatic for this harness.

Let me verify the last correctness items: that the wave-step prompt's `newly_completed` feeding is correct, and double-check the loop's completion accounting. Let me re-examine lines 117-160 against the dispatcher semantics.

Key semantic check on `newly_completed`: The script computes `newlyJson` from `built.filter((b) => b.completed).map(...)` (line 119) — this is the **cumulative** set of all completed across all prior waves, re-sent every iteration. But `wave_loop_step` does `mergeCompleted(priorCompleted, p.newly_completed)` (dispatcher line 4075) where `priorCompleted` comes from the resumed checkpoint. So the dispatcher already accumulates from its own checkpoint, and the script also re-sends the full cumulative set. `mergeCompleted` dedupes (it's a set-merge), so re-sending the cumulative set is idempotent and safe — not a double-count. Let me confirm `mergeCompleted` dedupes.

### Assistant | 2026-06-18T18:18:50.159Z

[tool_use: Grep]

### User | 2026-06-18T18:18:52.875Z

[tool_result] 719:  static mergeCompleted(
720-    priorCompleted: readonly unknown[] | undefined,
721-    newlyCompleted: readonly unknown[] | undefined,
722-  ): string[] {
723-    const out: string[] = [];
724-    const seen = new Set<string>();
725-    for (const id of [...(Array.isArray(priorCompleted) ? priorCompleted : []), ...(Array.isArray(newlyCompleted) ? newlyCompleted : [])]) {
726-      if (typeof
... [+147 chars truncated]

### Assistant | 2026-06-18T18:19:08.744Z

Confirmed: `mergeCompleted` dedupes via a `Set` (lines 724-728). So the script re-sending the cumulative `built.filter(b=>b.completed)` set every iteration is idempotent — no double-count, even though the dispatcher also accumulates from its checkpoint. Correct.

Now I have everything needed for a thorough verdict. Let me address the second-order trust question precisely, since the brief specifically flags it.

**Second-order / trust-the-agent-self-report:** The brief notes `newly_completed` is built from the builder agents' **self-reported** `completed` flag (line 119: `built.filter((b) => b.completed)`). This is a genuine, citeable trust seam. The dispatcher's `wave_loop_step` checkpoint (`completed_ids`) is derived from whatever `newly_completed` the caller passes in — so the checkpoint is NOT an independent source of truth; it faithfully records the agent self-reports the executor feeds it. There is **no verification** in the executor that a builder that returned `completed:true` actually produced a commit (the script never checks `git log` for `b.commit`, never validates the SHA exists). So if a builder agent lies (`completed:true` with no commit), the executor:
1. Adds that subtask_id to `newly_completed` -> the dispatcher marks it done in the durable checkpoint -> the DAG advances past it (dependents of the lying subtask dispatch on a non-existent foundation).
2. Reports it in `commits`/`completed_count` as built.

This is a real propagate-false-done risk. However: (a) the builder prompt explicitly invokes R12/R9/2-arm discipline and says "do NOT fake it — report completed:false" (lines 145-149); (b) the executor is operator-supervised by design (operator-invoked, builds+commits real code); (c) `b.commit` is captured in the return (line 168) so the operator CAN audit. It is a should-fix hardening gap, not a correctness defect that breaks the happy path — the executor cannot itself manufacture a false done; it can only relay an agent's lie. I rate this **P1**:
... [+549 chars truncated]

### Assistant | 2026-06-18T18:19:10.589Z

[tool_use: Bash]

### User | 2026-06-18T18:19:15.310Z

[tool_result] ASCII-ONLY: no non-ASCII bytes found

### Assistant | 2026-06-18T18:19:53.575Z

ASCII-only confirmed (no non-ASCII bytes). The `meta` literal (lines 1-9) is a pure static object. The `--` sequences in comments/strings are double-hyphens, not em-dashes.

I have completed a thorough end-to-end review of the file and all the dependencies it relies on. Here is my final assessment.

---

VERDICT: PASS

summary: `hermes-multiwave-build.mjs` is a structurally sound, honest, non-orphan operator-invocable Workflow that correctly sits on top of the tested `project_governed_schedule` + `wave_loop_step` cores. It is governed-by-construction (the feasibility gate refuses non-draining plans, and per-assignment governance lives inside `wave_loop_step`), so building it does NOT violate bravo's `unsafe-fleet-control-before-governance` soul-refuse. The one real weakness is that wave-completion propagation trusts the builder agents' self-reported `completed` flag with no commit verification — a P1 hardening gap, not a happy-path correctness defect.

findings:
- [P1] `H:\prism\.claude\workflows\hermes-multiwave-build.mjs:119,154-155,162-168` -- Trust-the-agent-self-report: `newly_completed` and the final `completed_count`/`commits` are built purely from each builder's self-reported `completed` flag (line 119 `built.filter((b) => b.completed)`). The `wave_loop_step` checkpoint is NOT an independent oracle here -- its `completed_ids` is `mergeCompleted(priorCompleted, newly_completed)` (sessionDispatcher.ts:4075), i.e. it faithfully records exactly the self-reports the executor feeds it. So a builder that returns `completed:true` with no commit (a) advances the dependency DAG past a non-existent foundation (dependents dispatch on unbuilt work) and (b) is reported as built. The builder prompt does invoke R12 ("do NOT fake it -- report completed:false", lines 145-149) and `b.commit` is captured (line 168), so an operator can audit -- but the executor itself never verifies the claimed commit exists. -- Fix: before adding an assignment to `newly_completed`, verify its c
... [+5021 chars truncated]
