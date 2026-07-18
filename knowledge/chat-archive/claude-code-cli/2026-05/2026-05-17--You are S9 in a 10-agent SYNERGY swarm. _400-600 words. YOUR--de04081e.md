---
type: "chat-session"
source: "claude-code-cli"
session_id: "de04081e-6889-4962-be91-a88a11910e43"
title: "You are S9 in a 10-agent SYNERGY swarm. ~400-600 words. YOUR AXIS: **RGS pipelin"
date: "2026-05-17"
first_ts: "2026-05-17T05:04:19.300Z"
last_ts: "2026-05-17T05:05:50.002Z"
cwd: "H:\\prism"
messages: 23
user_msgs: 10
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-ac043975648b24de2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# You are S9 in a 10-agent SYNERGY swarm. ~400-600 words. YOUR AXIS: **RGS pipelin

> **claude-code-cli** | 2026-05-17 | 23 msgs (10 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/de04081e-6889-4962-be91-a88a11910e43/subagents/agent-ac043975648b24de2.jsonl`

## Transcript

### User | 2026-05-17T05:04:19.300Z

You are S9 in a 10-agent SYNERGY swarm. ~400-600 words.

YOUR AXIS: **RGS pipeline rescue + integration — make RGS-TOOL-AUTOINVOKE the SOURCE OF TRUTH for per-unit tool plans**

Iter-2 A6 found RGS pipeline DEGRADED (sidecar `degraded:true, plans:{}` — root cause Ollama bridge unavailable; secondary: empty plans even when forced). V1 W0 names `U-RGS-RULE-BACKEND-DEV` as pre-flight.

RGS-TOOL-AUTOINVOKE today produces per-unit tool plans by composing:
- findCapabilities (engines/dispatchers/skills disk inventory)
- skill-triggers.jsonl (36 registered triggers)
- system-viz-graph (relationships)
- tribal (matched lessons)
- ollama (degraded)
- outcomes (Beta re-rank feedback)

Output goes to `state/shared/roadmap-tool-plans.json` keyed by `MILESTONE::U-ID`. Read-back via `prism_dev:roadmap_tool_plan_query`.

PROTOCOL:
1. Read `H:/prism/scripts/rgs-tool-planner.mjs` (the brain) head + `H:/prism/scripts/lib/rgs-signal-fusion.mjs` (the fusion step)
2. Find the OLLAMA dependence — what fails when Ollama is down? Is it advisory or load-bearing?
3. Find the DETERMINISTIC fallback path — when ollama_off=true, does it still produce plans? (A6 found: degraded mode supposed to but `plans:{}`)
4. Integration gaps with V1 allocation:
   - RGS should consume `state/shared/specs/UNITS/*.md` per-unit specs as a NEW signal (they're the canonical unit-defn — RGS today reads from `MILESTONE_PROGRESS` envelopes only)
   - RGS should consume `_skill-triggers.jsonl` to score skills (probably already does — confirm)
   - RGS should emit a `prerequisites:[]` array per plan (currently doesn't — chats can't know what blocks what)
5. Sister wire: `roadmap_tool_plan_build` for a unit should AUTO-FIRE during `/pick-unit` (not require manual invocation)

Return:
```
## S9 — RGS Ollama dependence audit
- where ollama is load-bearing: <list>
- deterministic fallback: <works|broken — why>

## S9 — V1 allocation integration gaps
- per-unit specs ingestion: <how to add>
- prerequisites emission: <how 
... [+461 chars truncated]

### Assistant | 2026-05-17T05:04:26.187Z

I'll audit RGS pipeline integration. Let me read the actual code first.

### Assistant | 2026-05-17T05:04:27.799Z

[tool_use: Bash]

### Assistant | 2026-05-17T05:04:28.656Z

[tool_use: Bash]

### User | 2026-05-17T05:04:33.735Z

[tool_result] H:/prism/scripts/lib/rgs-pipeline-rules.mjs
H:/prism/scripts/lib/rgs-signal-fusion.mjs
H:/prism/scripts/rgs-tool-planner.mjs

### User | 2026-05-17T05:04:35.549Z

[tool_result] ls: cannot access 'H:/prism/state/shared/specs/UNITS/': No such file or directory
---
H:/prism/state/shared/roadmap-tool-plans.json

### Assistant | 2026-05-17T05:04:39.105Z

[tool_use: Read]

### Assistant | 2026-05-17T05:04:39.148Z

[tool_use: Read]

### User | 2026-05-17T05:04:41.485Z

[tool_result] 1	/**
2	 * rgs-signal-fusion.mjs
3	 * Pure signal-fusion core for RGS tool-auto-invoke pipeline.
4	 *
5	 * export async function fuseSignals({ unit, complexity, readers }) -> ToolPlan | null
6	 *
7	 * All I/O is injected via `readers`; the only direct import is the pure rule
8	 * table from ./rgs-pipeline-rules.mjs (matchPipelines, matchAgents).
9	 *
10	 * CONTRACT: see task spec — implement every
... [+11371 chars truncated]

### User | 2026-05-17T05:04:41.497Z

[tool_result] 1	/**
2	 * rgs-tool-planner.mjs
3	 * Batch orchestrator: builds a per-roadmap-unit tool-plan sidecar.
4	 *
5	 * Memory note: the system-viz graph is ~324 MB. Under portable-node's default
6	 * heap this is fine, but if you hit GC pressure on very large runs add:
7	 *   node --max-old-space-size=4096 scripts/rgs-tool-planner.mjs ...
8	 *
9	 * CLI usage:
10	 *   node scripts/rgs-tool-planner.mjs [--
... [+4434 chars truncated]

### Assistant | 2026-05-17T05:04:43.975Z

Now let me check the Ollama dependence, the sidecar state, and look for /pick-unit hook wiring.

### Assistant | 2026-05-17T05:04:46.056Z

[tool_use: Bash]

### Assistant | 2026-05-17T05:04:48.236Z

[tool_use: Grep]

### Assistant | 2026-05-17T05:04:49.224Z

[tool_use: Grep]

### User | 2026-05-17T05:04:51.843Z

[tool_result] degraded: true plans: 648 schema: 1.0.0 updated: undefined

### User | 2026-05-17T05:04:53.588Z

[tool_result] 17: *                               checkpointPath, force, degraded,
19: *     → { planned, skipped, deferred, budgetExhausted, degraded, sidecar }
409: * ollama reader factory. Returns undefined when ollamaOff or degraded.
449: *   degraded?: boolean,
454: * @returns {Promise<{planned:number, skipped:number, deferred:number, budgetExhausted:boolean, degraded:boolean, sidecar:string}>}
469:  degra
... [+760 chars truncated]

### User | 2026-05-17T05:04:54.089Z

[tool_result] Found 9 files
.claude\hooks\__tests__\pick-prefresh-resolve.test.mjs
.claude\hooks\__tests__\pick-prefresh-tool-plan.test.mjs
.claude\hooks\pick-prefresh-inject.mjs
.claude\hooks\stop-slot-task-claims-advisory.mjs
.claude\helpers\slot-task-claim.mjs
.claude\hooks\ollama-task-offloader.mjs
.claude\kernel\psk.mjs
.claude\hooks\session-start-dev-keyword-launcher.mjs
.claude\hooks\loop-iteration-injec
... [+5 chars truncated]

### Assistant | 2026-05-17T05:04:57.847Z

Sidecar shows 648 plans — but S9's task says A6 found `plans:{}`. Let me verify what fraction are empty plans (caps/skills empty) vs degraded-but-populated.

### Assistant | 2026-05-17T05:05:01.957Z

[tool_use: Bash]

### Assistant | 2026-05-17T05:05:02.496Z

[tool_use: Read]

### User | 2026-05-17T05:05:08.383Z

[tool_result] {
  totalPlans: 648,
  empty: 0,
  minimal: 298,
  full: 350,
  ollamaSrc: 0,
  degraded: true
}
sample: {
  "pipelines": [
    {
      "skill": "/scrutinize",
      "why": "generic review fallback — no keyword matched",
      "confidence": 0.3
    }
  ],
  "tribal": [
    {
      "id": "memory:knowledge/memories/project_mill_master_canonical.md",
      "tip": "project_mill_master_canonical",
    
... [+105 chars truncated]

### User | 2026-05-17T05:05:09.592Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * pick-prefresh-inject.mjs — UserPromptSubmit hook for /pick-unit /pick-task /checkin.
5	 *
6	 * Surfaces freshness state BEFORE the chat picks a unit:
7	 *   - MILESTONE_PROGRESS mtime (warn if >30 min stale — regen suggested)
8	 *   - BUILD_STATE mtime + headline counts (so picker knows current wired/unwired)
9	 *   - CLOSE-OUT-CANDIDATES mtime + coun
... [+4478 chars truncated]

### Assistant | 2026-05-17T05:05:50.002Z

Got enough signal. Returning the audit.

## S9 — RGS Ollama dependence audit

**Where ollama is load-bearing (`rgs-signal-fusion.mjs:201-245`, `rgs-tool-planner.mjs:607-665`):**
- `readers.ollama` is **purely advisory** — wrapped in try/catch, falls through to deterministic on any failure (throw, `success:false`, `JSON.parse` fail, schema invalid).
- Planner sets `degraded:true` when Ollama bridge import fails OR `ollama_off` flag set; this just suppresses `readers.ollama` injection. **Not load-bearing for plan production.**
- `source:"ollama"` lifts the `DETERMINISTIC_CONF_CAP=0.6` ceiling and supplies custom `rationale`. Without Ollama: max confidence 0.6, generic rationale. That's the entire degradation.

**Deterministic fallback: WORKS but A6's `plans:{}` claim is FALSE.**
- Live sidecar: `{totalPlans:648, empty:0, minimal:298, full:350, ollamaSrc:0, degraded:true}`. **Zero empty plans.** A6's degraded read was stale or mis-sampled.
- Real issue: **46% of plans are "minimal"** (single `/scrutinize` fallback pipeline with `confidence:0.3`, no skills, no mcpTools — only tribal). Root cause: `matchPipelines` returns generic fallback when no domain keyword matches; `skillTriggers` reader returns `[]` for non-domain unit text. The `MINIMUM-PLAN CONTRACT` at `:271-289` passes because tribal is non-empty.

## S9 — V1 allocation integration gaps

**Per-unit specs ingestion (`state/shared/specs/UNITS/*.md`): DIRECTORY DOES NOT EXIST.**
- S10 must create the dir + generator before S9's RGS reader can ingest.
- Hook point: new reader `readers.perUnitSpec(unit) → { specPath, body, requirements[], prerequisites[] }` in `runPlanner` (`:469`), inject into `fuseSignals`. Body would: (a) seed `text` for capabilities/skill-triggers reaching beyond title+desc, (b) extract `Depends-on:` frontmatter into the new `prerequisites[]` plan field.

**Prerequisites emission:** today `ToolPlan` has no `prerequisites[]`. Add as Step 14.5 — when `perUnitSpec` reader returns frontmatter `depen
... [+2955 chars truncated]
