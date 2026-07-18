---
type: "chat-session"
source: "claude-code-cli"
session_id: "ad9c3041-c806-4424-9eed-fea97a4fc64b"
title: "Read-only review (arm A — holistic correctness) of the FEATURE-ROUTING-GRAPH-MS0"
date: "2026-06-15"
first_ts: "2026-06-15T06:24:43.391Z"
last_ts: "2026-06-15T06:26:48.279Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 21
assistant_msgs: 29
raw_file: "H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a96e9c1b3cb8800e3.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:21"
---

# Read-only review (arm A — holistic correctness) of the FEATURE-ROUTING-GRAPH-MS0

> **claude-code-cli** | 2026-06-15 | 50 msgs (21 user / 29 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/ad9c3041-c806-4424-9eed-fea97a4fc64b/subagents/agent-a96e9c1b3cb8800e3.jsonl`

## Transcript

### User | 2026-06-15T06:24:43.391Z

Read-only review (arm A — holistic correctness) of the FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH unit on H:/prism. (Its 8 files were committed in sha f004aa153d, co-mingled with an unrelated tango commit — review ONLY the files below, ignore any UNWIRED-ENGINE-AUDIT / date-stamp changes.)

Files (read each end-to-end):
1. scripts/lib/feature-routing-graph.mjs — the composer: TASK_CLASS_POLICY (12 classes), classifyRoutingClass (pure keyword classifier), routeTaskClass (async, lazy-imports cag-router/model-routing-policy/task-substrate-router, fail-open), buildRoutingDigest, taskClasses.
2. scripts/lib/feature-routing-graph.test.mjs — 23 tests.
3. scripts/feature-route.mjs — CLI.
4. scripts/generate-feature-routing-graph.mjs — JSON generator.
5. state/shared/feature-routing-graph.json — generated backing catalog.
6. state/shared/specs/FEATURE-ROUTING-GRAPH.md — the followable spec.
7-8. scripts/lib/loop-goal-stack-advisor.mjs + .test.mjs — the auto-invoke line extension (imports classifyRoutingClass aliased to avoid colliding with local-llm-task-router.classifyTaskClass).

Context: the design goal is a COMPOSITION layer over 6 existing routers (cag/model-policy/substrate/advisor/skill-trigger/AISystemRouter), NOT a duplicate — the enumeration confirmed the gap was "no single artifact wires them in a declared order." 

Run: `cd H:/prism && node --test scripts/lib/feature-routing-graph.test.mjs scripts/lib/loop-goal-stack-advisor.test.mjs` (expect 45/45). Also `node scripts/feature-route.mjs "build a new engine"` should print a build-class digest.

Verify: classifier correctness + tie-break, fail-open composition (never throws), the advisor extension is non-breaking + uses the aliased import (no shadow of the existing classifyTaskClass), no inlined constants, the spec matches the code (TASK_CLASS_POLICY is canonical), naming-collision resolution (classifyRoutingClass vs classifyTaskClass, feature-route.mjs vs /route skill) is sound.

Grade PASS or FAIL with P0/P1/P2 
... [+26 chars truncated]

### Assistant | 2026-06-15T06:24:47.091Z

I'll review the FEATURE-ROUTING-GRAPH-MS0 unit. Let me start by reading all the files end-to-end.

### Assistant | 2026-06-15T06:24:47.602Z

[tool_use: Read]

### Assistant | 2026-06-15T06:24:48.050Z

[tool_use: Read]

### Assistant | 2026-06-15T06:24:48.494Z

[tool_use: Read]

### Assistant | 2026-06-15T06:24:48.734Z

[tool_use: Read]

### User | 2026-06-15T06:24:51.987Z

[tool_result] 1	// scripts/lib/feature-routing-graph.mjs
2	//
3	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15) -- the
4	// UNIFIED feature-routing decision graph. Operator directive: "build a graph for
5	// you to follow on the most token efficient way to do every tool call and every
6	// task we've ever done" + auto-invoke commands without typing them.
7	//
8	// THE GAP THIS FILLS (veri
... [+14777 chars truncated]

### User | 2026-06-15T06:24:53.665Z

[tool_result] 1	// scripts/lib/feature-routing-graph.test.mjs
2	// Tests for U-ROUTING-GRAPH. Real reference-value asserts (R9): each pins the
3	// concrete classification/policy/composition behaviour that would fail if the
4	// routing logic regressed. No toBeDefined-style stubs.
5	import { test } from "node:test";
6	import assert from "node:assert/strict";
7	import {
8	  TASK_CLASS_POLICY, classifyRoutingClas
... [+6086 chars truncated]

### User | 2026-06-15T06:24:54.150Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/generate-feature-routing-graph.mjs
3	//
4	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15). Emits the
5	// machine-readable backing catalog state/shared/feature-routing-graph.json from
6	// (1) the canonical TASK_CLASS_POLICY in scripts/lib/feature-routing-graph.mjs and
7	// (2) the enumerated substrate/router/hook catalogs embedded below (m
... [+10000 chars truncated]

### User | 2026-06-15T06:24:54.154Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/feature-route.mjs
3	//
4	// FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH (slot:alpha 2026-06-15). On-demand
5	// CLI for the unified feature-routing graph: given a task description, print the
6	// followable routing digest (task class + substrate ladder + model tier + ordered
7	// commands + auto-invoke set + the antipattern to avoid). Composes the live
8	// route
... [+1310 chars truncated]

### Assistant | 2026-06-15T06:24:58.909Z

Now let me read the remaining files: the spec, the generated JSON, and the advisor + its test.

### Assistant | 2026-06-15T06:24:59.408Z

[tool_use: Read]

### Assistant | 2026-06-15T06:24:59.873Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:00.606Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:00.737Z

[tool_use: Read]

### User | 2026-06-15T06:25:04.088Z

[tool_result] 1	# PRISM Feature-Routing Graph — the followable "what to use, when" policy
2	
3	> **FEATURE-ROUTING-GRAPH-MS0 / U-ROUTING-GRAPH** (slot:alpha, 2026-06-15).
4	> Operator directive: *"build a graph for you to follow on the most token-efficient way to do
5	> every tool call and every task we've ever done"* + *"auto-invoke [commands] in a session without
6	> me having to type them in."*
7	>
8	> This 
... [+12624 chars truncated]

### User | 2026-06-15T06:25:06.429Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "note": "Generated by scripts/generate-feature-routing-graph.mjs. Policy is canonical in scripts/lib/feature-routing-graph.mjs; prose in state/shared/specs/FEATURE-ROUTING-GRAPH.md. Counts mined 2026-06-15.",
4	  "coverage": {
5	    "taskClasses": 12,
6	    "substrates": 19,
7	    "routersComposed": 6,
8	    "hooks": 809,
9	    "commandFamilies": 112,
10	    "slashC
... [+19861 chars truncated]

### User | 2026-06-15T06:25:07.327Z

[tool_result] 1	// scripts/lib/loop-goal-stack-advisor.mjs
2	//
3	// SELF-DRIVE-MS0 / U-STACK-ADVISOR (slot:alpha 2026-06-14) -- the per-iteration
4	// "deploy the WHOLE PRISM stack, optimally + variably + efficiently" advisor that
5	// the /loop and /goal script hooks inject. Operator directive 2026-06-14: make
6	// /goal + /loop develop utilizing all PRISM substrates (AI/learning/reasoning, PSN,
7	// system-v
... [+12585 chars truncated]

### User | 2026-06-15T06:25:07.370Z

[tool_result] 1	// Tests for the /loop+/goal optimal-stack-use advisor. node --test.
2	import { test } from "node:test";
3	import assert from "node:assert/strict";
4	import {
5	  classifyDevIntent, spotlightForIter, buildStackAdvisory, SPOTLIGHT_COUNT,
6	} from "./loop-goal-stack-advisor.mjs";
7	import { routeForgePhase } from "./forge-route.mjs";
8	
9	// --- classifyDevIntent (intent routing, R9: maps represen
... [+8346 chars truncated]

### Assistant | 2026-06-15T06:25:10.797Z

Now let me verify the dependencies the composer relies on actually exist with the claimed APIs. I need to check the imported routers and the aliasing claim.

### Assistant | 2026-06-15T06:25:12.727Z

[tool_use: Grep]

### Assistant | 2026-06-15T06:25:13.574Z

[tool_use: Grep]

### User | 2026-06-15T06:25:17.207Z

[tool_result] scripts\lib\cag-router.mjs:295:export function classifyQuery(query, options = {}) {
scripts\lib\feature-routing-graph.mjs:203:export async function routeTaskClass(prompt, ctx = {}) {
scripts\lib\forge-route.mjs:70:export function routeForgePhase(phase, opts = {}) {
scripts\lib\local-llm-task-router.mjs:139:export function classifyTaskClass(task) {
scripts\lib\local-llm-task-router.mjs:167:export a
... [+393 chars truncated]

### User | 2026-06-15T06:25:17.646Z

[tool_result] 139:export function classifyTaskClass(task) {
192:  const { taskClass, category } = classifyTaskClass(task);

### Assistant | 2026-06-15T06:25:21.568Z

Important finding. There are **two** `routeTask` exports with different signatures: `task-substrate-router.mjs:37` is `routeTask(taskType, phase, ctx)` (positional — what the composer uses) and `local-llm-task-router.mjs:167` is `routeTask({...})` (object). The advisor imports `routeTask` from `task-substrate-router.mjs`. Let me verify the signatures of the functions the composer calls to confirm the composition is correct.

### Assistant | 2026-06-15T06:25:22.404Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:23.353Z

[tool_use: Read]

### User | 2026-06-15T06:25:23.371Z

[tool_result] 1	// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
2	// Per-task substrate-routing matrix: given a task + phase + context, decide the
3	// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
4	// Master-graph / PSN) with when/how/max-out for each. The "max out their
5	// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
6	//
7	// DEDUP: 
... [+5547 chars truncated]

### Assistant | 2026-06-15T06:25:23.967Z

[tool_use: Read]

### User | 2026-06-15T06:25:25.093Z

[tool_result] 60	      });
61	      if (clearsAll) { best = best || model; } // first-qualifying (matrix order); prefer smaller if sorted upstream
62	    }
63	    if (best) out.set(cls, best);
64	  }
65	  return out;
66	}
67	
68	/**
69	 * The per-prompt routing verdict.
70	 * @param {{ prompt: string, matrix?: object|null, threshold?: number }} a
71	 * @returns {{ engine: "ollama"|"claude", model: string, tier:
... [+1079 chars truncated]

### User | 2026-06-15T06:25:26.077Z

[tool_result] 290	 *   hotSources: string[],
291	 *   normalizedQuery: string,
292	 *   scores: { cold: number, hot: number, hybrid: number },
293	 * }}
294	 */
295	export function classifyQuery(query, options = {}) {
296	  const { confidenceFloor = 0.15 } = options;
297	  const { normalized, truncated } = normalize(query);
298	
299	  if (!normalized) {
300	    return {
301	      tier: "HYBRID",
302	      confi
... [+2179 chars truncated]

### Assistant | 2026-06-15T06:25:32.129Z

I've confirmed all three composed router APIs. There's an important signature mismatch to verify. The composer calls `tsr.routeTask(taskClass, ctx.phase || taskClass, ctx)` at line 227. `routeTask(taskType, phase, ctx)` — `phase` is the 2nd positional arg, passed `ctx.phase || taskClass`. When no `ctx.phase`, the task-class name (e.g. "physics", "build") is passed as a forge `phase`. Let me check whether `routeForgePhase` handles an unknown phase gracefully (fail-open) or throws, since the composer relies on it not throwing — and confirm the advisor's aliasing is sound.

### Assistant | 2026-06-15T06:25:32.130Z

[tool_use: Read]

### Assistant | 2026-06-15T06:25:32.829Z

[tool_use: Read]

### User | 2026-06-15T06:25:37.611Z

[tool_result] 60	
61	/**
62	 * Route one forge phase to its cheapest-correct executor.
63	 * @param {string} phase  a FORGE_PHASE_CATEGORY key (or any string).
64	 * @param {object} [opts] passthrough to resolveExecutor:
65	 *   { available?: string[], hardware?: string, vllmEnabled?, vllmAvailable?,
66	 *     ollamaAvailable? }
67	 * @returns {{ phase, category, lane, model, claudeModel, tier, reason,
68	 *   
... [+2509 chars truncated]

### User | 2026-06-15T06:25:37.809Z

[tool_result] 130	  ["reason", /\b(reason|analyz\w*|why\s*(is|does)|deduce|infer|trade-?off|design\b|architect)\b/i],
131	];
132	
133	/**
134	 * Classify a task string into a work class + cost-router category.
135	 * Safety is NOT classified here (routeTask gates it first).
136	 * @param {string} task
137	 * @returns {{ taskClass: string, category: string }}
138	 */
139	export function classifyTaskClass(task) {
... [+1552 chars truncated]

### Assistant | 2026-06-15T06:25:43.213Z

Confirmed: `routeForgePhase(phase)` line 71 defaults any unknown phase string to `"summary"` category (no throw), so passing a task-class name like `"physics"` as a `phase` does not throw — fail-open holds, though the substrate plan it produces will be the generic "summary" lane rather than a physics-specific one (functional, just coarse; acceptable for an advisory composition layer). The `classifyTaskClass` (model-capability axis) returns `{taskClass, category}` and is genuinely a different axis from `classifyRoutingClass` (workflow axis) — the aliasing claim holds.

Now let me run the test suite and the CLI to verify the behavioral claims.

### Assistant | 2026-06-15T06:25:44.577Z

[tool_use: Bash]

### Assistant | 2026-06-15T06:25:45.065Z

[tool_use: Bash]

### User | 2026-06-15T06:25:49.657Z

[tool_result]   ...
# Subtest: buildStackAdvisory: a DISCOVER prompt surfaces search-first / system-viz guidance
ok 43 - buildStackAdvisory: a DISCOVER prompt surfaces search-first / system-viz guidance
  ---
  duration_ms: 0.1056
  ...
# Subtest: buildStackAdvisory: physics prompt surfaces the auto-invoke line (fire without typing)
ok 44 - buildStackAdvisory: physics prompt surfaces the auto-invoke line (fire 
... [+372 chars truncated]

### User | 2026-06-15T06:25:51.805Z

[tool_result] TASK-CLASS: build (conf 75%)
  ladder: dedup-check -> master-graph -> wiki -> obsidian -> claude
  model:  opus for design+novel code; sonnet for known mechanical patterns [live: claude/opus]
  auto:   /dedup
  cmds:   /dedup -> /forge-triple -> /wire-unwired -> /scrutinize
  ctx:    HYBRID
  AVOID:  building before /dedup (DuplicationGuard) or shipping a stub/partial

### Assistant | 2026-06-15T06:25:56.396Z

45/45 pass and the CLI prints a correct build-class digest with live composition (`[live: claude/opus]`, `ctx: HYBRID`). Now let me verify a few remaining correctness points: the tie-break logic, the classifier scoring, the `--json` mode, no-signal fail-open of the live composition, and check there's no `.skip`/`.only` and no inlined physics constants. Let me also verify the generator regenerates the JSON deterministically (spec-vs-code canonical claim).

### Assistant | 2026-06-15T06:25:58.738Z

[tool_use: Bash]

### Assistant | 2026-06-15T06:26:00.455Z

[tool_use: Grep]

### User | 2026-06-15T06:26:03.701Z

[tool_result] {
  "taskClass": "build",
  "confidence": 0,
  "scores": {
    "physics": 0,
    "quote": 0,
    "learn": 0,
    "review": 0,
    "fix": 0,
    "orchestrate": 0,
    "session": 0,
    "recall": 0,
    "locate": 0,
    "plan": 0,
    "domain": 0,
    "build": 0
  },
  "policy": {
    "trigger": "build / implement / create / add / wire / new engine|hook|skill",
    "substrateLadder": [
      "dedup-
... [+289 chars truncated]

### User | 2026-06-15T06:26:08.797Z

[tool_result] No matches found

### Assistant | 2026-06-15T06:26:13.703Z

All clean: JSON mode works, no-signal correctly fails to `build`/conf 0, regen is byte-identical (deterministic; the committed JSON matches the code), no `.skip`/`.only`, no inlined physics constants. Let me do a final correctness check on the tie-break edge case the test asserts (`"build the cutting force g-code calc"` → physics) and verify the digest's `model:` live-append logic and the antipattern claim about `feature-route.mjs` vs `/route` skill collision.

### Assistant | 2026-06-15T06:26:20.937Z

[tool_use: Bash]

### User | 2026-06-15T06:26:25.824Z

[tool_result] tie-break: physics {"physics":3,"quote":0,"learn":0,"review":0,"fix":0,"orchestrate":0,"session":0,"recall":0,"locate":0,"plan":0,"domain":0,"build":1}
lathe+toolpath: domain {"domain":2,"physics":1}
locate: locate
--- /route skill collision check ---
.claude/commands/route.md
route.md EXISTS

### Assistant | 2026-06-15T06:26:48.279Z

All correctness claims verified:
- **Tie-break**: physics (score 3) beats build (score 1) — TIE_BREAK precedence works. Note this case isn't even a tie; physics wins on raw score.
- **`"program a lathe turning toolpath"` → domain** (domain=2 from "lathe"+"turning", physics=1 from "toolpath"): domain wins on higher score, matching test CASES. This is correct.
- **`/route` skill genuinely exists** (`.claude/commands/route.md`), so the naming-collision-avoidance comment in `feature-route.mjs:10-13` is a real, sound R7 resolution — not a fabricated justification.
- **`classifyTaskClass` collision genuinely exists** in `local-llm-task-router.mjs:139` (different axis: model-capability vs workflow-routing), so the alias in the advisor is real and necessary.

I have read all 8 files end-to-end, verified all 6 composed-router APIs exist with the claimed signatures, confirmed fail-open holds (unknown phase → `routeForgePhase` defaults to "summary", no throw), ran 45/45 tests, and confirmed regen determinism.

---

VERDICT: PASS

summary: FEATURE-ROUTING-GRAPH-MS0 is a genuine composition layer over 6 pre-existing routers, not a duplicate — every composed API (`classifyQuery`, `routePrompt`, `routeTask`, `routeForgePhase`, `classifyTaskClass`) was verified to exist with the signature the composer uses. The classifier/tie-break is correct, composition fails open (never throws), the advisor extension is non-breaking and correctly uses the aliased `classifyRoutingClass` to avoid shadowing `local-llm-task-router.classifyTaskClass`, no physics constants are inlined, the spec mirrors the canonical `TASK_CLASS_POLICY`, and both naming collisions (`feature-route.mjs` vs `/route` skill, `classifyRoutingClass` vs `classifyTaskClass`) are real and soundly resolved. 45/45 tests pass; the generated JSON regenerates byte-identical.

findings:
- [P2] `H:/prism/scripts/lib/feature-routing-graph.mjs:227` -- `routeTaskClass` passes the task-class name (e.g. `"physics"`, `"build"`) as the `phase
... [+2005 chars truncated]
