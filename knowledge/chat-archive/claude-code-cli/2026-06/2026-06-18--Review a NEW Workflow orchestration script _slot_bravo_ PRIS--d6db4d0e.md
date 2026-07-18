---
type: "chat-session"
source: "claude-code-cli"
session_id: "d6db4d0e-8d82-43ba-81ed-4ecf23224ed6"
title: "Review a NEW Workflow orchestration script (slot:bravo, PRISM). It is NOT unit-t"
date: "2026-06-18"
first_ts: "2026-06-18T18:16:32.975Z"
last_ts: "2026-06-18T18:17:37.231Z"
cwd: "H:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a350f71107cc25d7f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# Review a NEW Workflow orchestration script (slot:bravo, PRISM). It is NOT unit-t

> **claude-code-cli** | 2026-06-18 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/d6db4d0e-8d82-43ba-81ed-4ecf23224ed6/subagents/agent-a350f71107cc25d7f.jsonl`

## Transcript

### User | 2026-06-18T18:16:32.975Z

Review a NEW Workflow orchestration script (slot:bravo, PRISM). It is NOT unit-testable (its agent()/parallel()/phase()/log()/args hooks only execute inside the PRISM Workflow runtime; importing it runs the body), so eval = STRUCTURAL + SAFETY review. Grade PASS/FAIL with P0/P1/P2 + file:line.

FILE: H:\prism\.claude\workflows\hermes-multiwave-build.mjs

WHAT IT IS: the C1 agent-spawning EXECUTOR -- the harness that "actually runs" autonomous multi-wave building on top of the deterministic cores shipped this session. It (1) calls prism_session:project_governed_schedule for a FEASIBILITY gate (refuses to spawn if the DAG cannot drain under governance -> returns stalled), then (2) drives prism_session:wave_loop_step wave-by-wave, spawning one governed builder agent per assignment via parallel(), feeding real completions back, until done. Operator-invoked; NOT auto-run.

CONTEXT (the Workflow API, from the Workflow tool contract):
- `export const meta = {...}` MUST be a pure literal (name, description, phases). Verify it is.
- Body hooks: agent(prompt, {label,phase,schema}) -> spawns a subagent, returns its text or (with schema) a validated object or null; parallel(thunks) -> barrier, a throwing thunk resolves null (filter Boolean); phase(title); log(msg); args (the passed input).
- Scripts are plain JS, NO imports of repo libs (self-contained), NO Date.now()/Math.random(), standard built-ins only.

VERIFY (adversarial, focus on SAFETY since this spawns code-building+committing agents):
- FEASIBILITY GATE correctness: does it REFUSE to spawn (return built:false, reason:'stalled') when project_governed_schedule reports drains !== true? Confirm no agent is spawned before the gate passes.
- BOUNDED loop: maxIters = total_subtasks + 2. Confirm the wave loop cannot run unbounded. Confirm the two fail-loud STOP paths (assignments empty while !done; a wave that completes 0 of N) prevent an infinite spin (R12). Trace: could it loop forever or spin re-offering the same un-build
... [+1409 chars truncated]

### Assistant | 2026-06-18T18:16:37.690Z

I'll review the Workflow orchestration script. Let me start by reading the full file.

### Assistant | 2026-06-18T18:16:37.786Z

[tool_use: Read]

### User | 2026-06-18T18:16:40.255Z

[tool_result] 1	export const meta = {
2	  name: 'hermes-multiwave-build',
3	  description: 'C1 runtime driver: feasibility-gate a decomposed fan-out plan via project_governed_schedule, then DRIVE it wave-by-wave through wave_loop_step -- spawning governed builder agents per wave until the DAG drains. The agent-spawning executor that sits on top of the ZuluWaveSchedulerEngine cores (slot:bravo).',
4	  whenToUse:
... [+9442 chars truncated]

### Assistant | 2026-06-18T18:16:45.624Z

I have the full file (171 lines). Let me trace the critical paths carefully, focusing on the safety-critical claims the reviewer flagged: the feasibility gate, the bounded loop, the spin-prevention STOP paths, and the completions feedback.

Let me verify a couple of subtle concerns by examining specific logic.

### Assistant | 2026-06-18T18:16:46.767Z

[tool_use: Read]

### User | 2026-06-18T18:16:47.929Z

[tool_result] 112	const maxIters = (Number(sched.total_subtasks) || 0) + 2; // each productive wave completes >=1 -> bounded
113	let completed = [];
114	const built = [];
115	let done = false;
116	
117	for (let i = 0; i < maxIters && !done; i++) {
118	  // Governed next wave (resumable + checkpointed). newly_completed feeds the cumulative set.
119	  const newlyJson = JSON.stringify(built.filter((b) => b.complet
... [+3461 chars truncated]

### Assistant | 2026-06-18T18:17:37.231Z

I have the complete picture. Let me trace each adversarial concern carefully.

**Feasibility gate (lines 94-108):** `phase('Feasibility')` then `agent(...)` calls only the `project_governed_schedule` tool (a read/plan dispatcher, spawns no builders). The gate check at line 102 is `if (!sched || sched.drains !== true)`. This is the correct strict form: it returns the stall on null OR on any value other than the boolean `true` (a missing/string/false `drains` all fall through to refuse). No builder `agent()` exists before line 120, which is inside the loop after the gate. The gate cannot be bypassed. Correct.

**Bounded loop (line 117):** `maxIters = (Number(sched.total_subtasks) || 0) + 2`. Loop condition `i < maxIters && !done`. `i` strictly increments, no `continue`/index manipulation. Upper bound is finite for any finite/NaN `total_subtasks` (NaN -> 0 -> maxIters 2). Cannot run unbounded.

**Spin prevention — two STOP paths:**
- Line 132-135: `assignments.length === 0 && !done` -> `break`. Prevents a no-op wave from re-spinning.
- Line 159: `ok === 0` (zero completions in a non-empty wave) -> `break`. Prevents re-offering the same un-buildable wave.

These two `break`s are the real anti-spin guarantee. Even without them the `maxIters` cap bounds it, but they make it fail-loud and early. Combined: a wave can only continue if it (a) is not done, (b) dispatched >=1 assignment, AND (c) completed >=1 of them. A productive wave reduces the remaining set, so within `maxIters` it converges or breaks. No infinite spin path exists.

**Governance:** The executor never assigns slots itself. The slot in each builder prompt (line 143, 147) comes from `asg.slot`, which is read from `wave.wave_assignments` (line 130) — the output of `wave_loop_step`, which applies the governor + delegation gate. The executor dispatches exactly what `wave_loop_step` authorized. No self-granted authority.

**Completions feedback (line 119):** `built.filter((b) => b.completed).map((b) => b.subtask_i
... [+6615 chars truncated]
