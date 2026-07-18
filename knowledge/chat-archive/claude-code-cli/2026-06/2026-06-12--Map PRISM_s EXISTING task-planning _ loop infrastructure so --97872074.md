---
type: "chat-session"
source: "claude-code-cli"
session_id: "97872074-49d2-49e4-8faa-3e7fbb4fbadf"
title: "Map PRISM's EXISTING task-planning + loop infrastructure so a design discussion "
date: "2026-06-12"
first_ts: "2026-06-12T02:36:42.875Z"
last_ts: "2026-06-12T02:40:55.773Z"
cwd: "H:\\prism-slot-tango"
messages: 44
user_msgs: 22
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism-slot-tango/97872074-49d2-49e4-8faa-3e7fbb4fbadf/subagents/agent-adb01cdec641974c6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:13"
---

# Map PRISM's EXISTING task-planning + loop infrastructure so a design discussion 

> **claude-code-cli** | 2026-06-12 | 44 msgs (22 user / 22 assistant) | cwd: H:\prism-slot-tango
> Raw: `H:/.claude/projects/H--prism-slot-tango/97872074-49d2-49e4-8faa-3e7fbb4fbadf/subagents/agent-adb01cdec641974c6.jsonl`

## Transcript

### User | 2026-06-12T02:36:42.875Z

Map PRISM's EXISTING task-planning + loop infrastructure so a design discussion doesn't propose rebuilding what exists (tango dedup discipline). Be precise + cite file:line / paths. Do NOT spawn parallel bash — run commands sequentially with `command node`/`command grep`/Read.

INVESTIGATE these surfaces and report what each does + its current state:

1. **Loop mechanics**: `.claude/helpers/loop-state.mjs` (start/tick/end/next — read its exports + what `next` resolves). `.claude/hooks/loop-iteration-inject.mjs` (the /loop awareness inject). `.claude/hooks/goal-prereq-inject.mjs` (the /goal pre-flight). What loop DISCIPLINE do they inject?

2. **The articles/doctrine**: read `H:/prism/knowledge/wiki/architecture/agent-loop-design-rules.md` (or wherever it lives — glob for it) — summarize the canonical loop rules. Also glob `knowledge/wiki` + `state/shared/specs` for *agentic* / *loop* / *planning* / *X-ARTICLE* / *zulu-agentic-corpus* and list what loop/planning article knowledge PRISM already has ingested.

3. **Planning surfaces**: `/propose-goal`, `/pick-unit`/`/pick-dev`/`/pick-build-close` skills (what they do), `prism_atcs` dispatcher (ATCS autonomous task completion), the goal-planner/code-goal-planner/sublinear-goal-planner agents (what planning they do). `ROADMAP-CONSOLIDATED` + `priority-queue.mjs`.

4. **The forge/loop builds from THIS session** (already shipped, do not re-propose): `scripts/lib/forge-route.mjs` (phase routing), `scripts/run-verification-channel.mjs` (verify gate), forge7 Boris loop.

5. **AI/local routing for planning**: how does planning currently use Ollama / Obsidian vault / Hermes / the AI systems? (e.g. is there a planning step that routes decomposition to Ollama/sonnet? does planning read the Obsidian vault for prior-art?)

THEN identify THE GAP the operator named ("we need to incorporate loops better" / "improve how we plan for tasks"): where is the LOOP DISCIPLINE (closed-loop, eval-gate-per-step, each-pass-feeds-next, self-correc
... [+521 chars truncated]

### Assistant | 2026-06-12T02:36:47.624Z

[tool_use: Bash]

### User | 2026-06-12T02:36:54.863Z

[tool_result] #!/usr/bin/env node
/**
 * loop-state.mjs — Per-session /loop iteration state helper.
 *
 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
 * chat has no idea the loop was running. This helper persists iteration metadata
 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
 *
 * Layout: state/shared/loop-state/loop-<session-id>.jso
... [+2598 chars truncated]

### Assistant | 2026-06-12T02:36:58.369Z

[tool_use: Bash]

### User | 2026-06-12T02:37:02.794Z

[tool_result] function cmdNext(flags) {
  if (!flags.session) throw new Error("--session required");
  const resolveOnly = !!flags["resolve-only"];
  const prev = read(flags.session);
  const rollsSoFar = prev?.rollsTotal ?? 0;
  const capped = !resolveOnly && rollsSoFar >= maxRolls();

  let { nextTask, source }
---
   // U-LOOP-AUTO-ADVANCE: persist the slot so the loop-iteration injector can
    // emit a `-
... [+1404 chars truncated]

### Assistant | 2026-06-12T02:37:05.478Z

[tool_use: Bash]

### User | 2026-06-12T02:37:10.316Z

[tool_result] cmdNext(flags) {
  if (!flags.session) throw new Error("--session required");
  const resolveOnly = !!flags["resolve-only"];
  const prev = read(flags.session);
  const rollsSoFar = prev?.rollsTotal ?? 0;
  const capped = !resolveOnly && rollsSoFar >= maxRolls();

  let { nextTask, source } = resolveNextTask(flags);
  // Roll-cap: even if a next unit IS resolvable, refuse to auto-roll past the cap
... [+1600 chars truncated]

### Assistant | 2026-06-12T02:37:12.886Z

[tool_use: Bash]

### User | 2026-06-12T02:37:22.003Z

[tool_result] resolveNextTask(flags) {
  // 1. explicit caller directive
  const explicit = typeof flags.resume === "string" ? flags.resume.trim() : "";
  if (explicit) return { nextTask: explicit, source: "resume-flag" };
  // 2. handoff RESUME line
  const ho = handoffResume(flags.terminal);
  if (ho) return { nextTask: ho, source: "handoff-resume" };
  // 3. roadmap slice — own lane first, then fleet-wide fa
... [+1100 chars truncated]

### Assistant | 2026-06-12T02:37:30.463Z

[tool_use: Bash]

### User | 2026-06-12T02:37:35.419Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * loop-iteration-inject.mjs — UserPromptSubmit hook for /loop awareness.
 *
 * Fires when the user types `/loop` (with or without interval). Surfaces:
 *   - any paused/active loop state for this session (sessionId from stdin)
 *   - global list of running loops (so a chat doesn't accidentally start a 2nd)
 *   - reminder of Karpathy R10 (checkpoint between ite
... [+2099 chars truncated]

### Assistant | 2026-06-12T02:37:38.401Z

[tool_use: Bash]

### User | 2026-06-12T02:37:42.727Z

[tool_result] ists own the steps, subagents do the narrow work; keep coordination deterministic + ~zero-token (route, don't reason -- R5; a Workflow coordinator spends nothing). [shann + PawelHuryn]`,
  `   6. BUDGET is a stop condition -- nearing the token ceiling -> checkpoint + /compact, never push an open loop into a spiral (R6/R10). PRISM's multi-timescale loops only COMPOUND if each checkpoints cleanly. [
... [+1099 chars truncated]

### Assistant | 2026-06-12T02:37:44.949Z

[tool_use: Bash]

### User | 2026-06-12T02:37:49.477Z

[tool_result] #!/usr/bin/env node
// tier: T2
/**
 * goal-prereq-inject.mjs — UserPromptSubmit hook for /goal awareness.
 *
 * Complements the existing Stop-hook goal-complete-gate.mjs by surfacing pre-flight
 * status BEFORE the user types /goal complete:
 *   - CLOSE-OUT-CANDIDATES freshness (Stop gate requires <2h)
 *   - sibling-unit status in the same milestone (you said "goal complete" but
 *     unit X i
... [+2098 chars truncated]

### Assistant | 2026-06-12T02:37:55.204Z

[tool_use: Bash]

### User | 2026-06-12T02:37:59.973Z

[tool_result] H:/prism/knowledge/wiki/architecture/actions/business/capacityplanning.md
H:/prism/knowledge/wiki/architecture/engines/ai/agenticloopengine-9-17-drilled.md
H:/prism/knowledge/wiki/architecture/engines/ai/agenticloopengine-9-19-drilled.md
H:/prism/knowledge/wiki/architecture/engines/ai/agenticloopengine.md
H:/prism/knowledge/wiki/architecture/engines/quality/cmmpathplanningengine.md
H:/prism/knowle
... [+1310 chars truncated]

### Assistant | 2026-06-12T02:38:02.504Z

[tool_use: Bash]

### User | 2026-06-12T02:38:07.100Z

[tool_result] H:/prism/knowledge/wiki/architecture/agent-orchestration-galaxy.md
H:/prism/knowledge/wiki/architecture/ollama-prism-bridge.md
H:/prism/knowledge/wiki/architecture/prism-methodology-foundations.md
H:/prism/knowledge/wiki/architecture/u-oe-bridge-l2b.md
H:/prism/knowledge/wiki/architecture/u-oe-docker-compose-2026-05-18.md

### Assistant | 2026-06-12T02:38:11.048Z

[tool_use: Bash]

### User | 2026-06-12T02:38:19.661Z

[tool_result] H:/prism/state/shared/specs/X-ARTICLE-SYNERGY-AUDIT-2026-06-10.md

### Assistant | 2026-06-12T02:38:22.292Z

[tool_use: Bash]

### User | 2026-06-12T02:38:28.974Z

[tool_result] # X-Article Doctrine Synergy Audit — 2026-06-10 (slot:golf)

> Goal (operator /goal): compile all X-articles sent across sessions, assess whether each is
> optimally applied, and verify the full system is synergized — no conflicts, gaps, dormant
> builds, or unwired enforcement. Method: ultracode Workflow — 5 doctrine-cluster audit agents
> + 1 synthesis (6 agents, 1.1M subagent tokens), findings 
... [+2600 chars truncated]

### Assistant | 2026-06-12T02:38:33.267Z

[tool_use: Bash]

### User | 2026-06-12T02:38:49.373Z

[tool_result] H:/prism/knowledge/wiki/lessons/agent-loop-design-rules.md
H:/prism/knowledge/wiki/architecture/audit-system-synergy-2026-05-09.md
H:/prism/knowledge/wiki/architecture/prism-methodology-foundations.md
H:/prism/knowledge/wiki/architecture/_orphans-rescue.md

### Assistant | 2026-06-12T02:38:52.422Z

[tool_use: Bash]

### User | 2026-06-12T02:38:58.096Z

[tool_result] ---
title: Agent-loop design rules -- the closed-loop discipline /loop auto-invokes
type: lesson
tags: [lesson, loop, autonomous-loop, agent-design, token-budget, slot-alpha]
last_verified: 2026-06-09
slot: alpha
sources:
  - "shannholmberg: what is agent looping (read in FULL)"
  - "RLanceMartin: Designing loops with Fable 5 (teaser only -- login-gated)"
  - "IBuzovskyi: 8 Loops Inside Hermes Age
... [+3100 chars truncated]

### Assistant | 2026-06-12T02:39:01.688Z

[tool_use: Bash]

### User | 2026-06-12T02:39:06.004Z

[tool_result] H:/prism/knowledge/wiki/architecture/engines/other/zuludashboardcontrolengine.md
H:/prism/knowledge/wiki/architecture/engines/shop/zulufleetgovernorengine.md
H:/prism/knowledge/wiki/architecture/hermes-zulu-galaxy.md
H:/prism/knowledge/wiki/architecture/hermes-zulu-integration.md
H:/prism/knowledge/wiki/architecture/hooks/runtime/zulu-advisory-inject-test.md

### Assistant | 2026-06-12T02:39:12.223Z

[tool_use: Bash]

### User | 2026-06-12T02:39:19.004Z

[tool_result] ---
name: propose-goal
description: Propose top-ranked session goals from detected gaps, with cross-domain analogies for each
version: 1.0.0
engines:
  - AutonomousGoalSynthesisEngine
  - TransferLearningBridgeEngine
  - SVIRankedBacklogEngine
actions:
  - autonomous_goal_propose
  - transfer_bridge_find_analogies
triggers:
  - "propose goal"
  - "propose-goal"
  - "what should I work on"
  - "sug
... [+1272 chars truncated]

### Assistant | 2026-06-12T02:39:21.297Z

[tool_use: Bash]

### User | 2026-06-12T02:39:28.734Z

[tool_result] ---
description: Deterministic next-unit picker (devtools-first, revenue-second) via the psk kernel. Subtracts shipped units, returns top-N with spec paths + a research pack.
allowed-tools: Bash, Read
composes_with:
  - "/awareness-snapshot"
  - "/broadcast"
  - "/checkin"
  - "/dedup"
  - "/master-index"
  - "/orphan-inventory"
  - "/system-viz"
consumes:
  - "prism_session:master_index_query"
--
... [+800 chars truncated]

### Assistant | 2026-06-12T02:39:31.221Z

[tool_use: Bash]

### User | 2026-06-12T02:39:36.000Z

[tool_result] ---
name: pick-build-close
description: Macro loop — pick a unit, build it, close it out. Chains /pick-unit → build (whatever the chat does) → /close-out-audit → MILESTONE_PROGRESS regen → handoff. The canonical productivity loop for shipping pending units. Use when you want to ship the top devtools unit without manually chaining 4 skills.
trigger:
  autoSuggest:
    keywords: ["pick build close",
... [+800 chars truncated]

### Assistant | 2026-06-12T02:39:39.349Z

[tool_use: Bash]

### User | 2026-06-12T02:39:44.846Z

[tool_result] ---
description: Deterministic next-unit picker LOCKED to the backend-devtools roadmap (roadmap_priority=0). Same picker engine as /pick-unit, but never falls back to revenue and never accepts a --priority flag. Use when the user says "pick a dev unit", "pick from devtools", or "what's the next devtools thing to ship". COMMAND-KERNEL-MS0 appears here automatically once injected into atomic-roadmap
... [+660 chars truncated]

### Assistant | 2026-06-12T02:39:47.860Z

[tool_use: Bash]

### User | 2026-06-12T02:39:53.669Z

[tool_result] /**
 * ATCS Dispatcher - Autonomous Task Completion System
 * Dispatcher #23: File-system-driven state machine for autonomous multi-session task execution
 * 
 * Tool: prism_atcs
 * Actions: task_init, task_resume, task_status, queue_next, unit_complete,
 *          batch_validate, checkpoint, replan, assemble, stub_scan
 * 
 * Architecture:
 *   State lives on disk (TASK_MANIFEST.json) — not in c
... [+1600 chars truncated]

### Assistant | 2026-06-12T02:39:57.710Z

[tool_use: Bash]

### User | 2026-06-12T02:40:01.299Z

[tool_result] ACTIONS BLOCK: action_on_detection: "FAIL unit → add to retry_queue",
  severity: "CRITICAL"
};

// ============================================================================
// TYPES — TaskManifest, WorkUnit, StubScanResult imported from prism-schema
// ============================================================================

// ==============================================================
... [+262 chars truncated]

### Assistant | 2026-06-12T02:40:04.380Z

[tool_use: Bash]

### User | 2026-06-12T02:40:08.206Z

[tool_result] case "replan": {
            const taskId = params.task_id || findActiveTask();
            if (!taskId) return err("No active task found.");

            const taskDir = getTaskDir(taskId);
            const manifest = readJSON<TaskManifest>(path.join(taskDir, "TASK_MANIFEST.json"));
            const queue = readJSON<WorkUnit[]>(path.join(taskDir, "WORK_QUEUE.json"));

            // Analyze fai
... [+400 chars truncated]

### Assistant | 2026-06-12T02:40:55.773Z

I have enough to synthesize. Here is the map.

---

## Code Quality Analysis Report — PRISM Planning + Loop Infrastructure

### Summary

- Overall Quality Score: 7/10
- Surfaces Analyzed: ~10
- Issues Found: 1 critical architectural gap
- Technical Debt Estimate: 4-8 hours to close the planning feedback loop

---

### (a) State of each surface

1. **`loop-state.mjs`** — Solid iteration counter + `next` resolver (tries explicit resume flag → handoff RESUME line → `pickUnitTop` roadmap slice). Has roll-cap to prevent unbounded auto-advance. State persists per session-id to `state/shared/loop-state/`. One-shot: it records that ticks happened and what the task was, but it stores only the caller's self-reported `status`/`note` string — no numeric eval output is captured.

2. **`loop-iteration-inject.mjs`** — UserPromptSubmit T2 hook that fires on `/loop` keywords. Injects the 6-rule LOOP DISCIPLINE block (closed/eval-gate/feeds-next/self-correct/orchestrator-owns/budget-stop) plus the current session's loop iter count and global active loops. The discipline is text injected into context — it is advisory, not mechanically enforced.

3. **`goal-prereq-inject.mjs`** — UserPromptSubmit T2 hook that fires on `/goal`. Injects GOAL DISCIPLINE (convert open→closed, decompose, route mechanical work to Ollama, name eval gate + stop condition). Again text-advisory; the hard gate lives in the Stop hook, not here.

4. **`knowledge/wiki/lessons/agent-loop-design-rules.md`** — Canonical loop doctrine wiki entry synthesizing 6 articles (shann fully read; 4 login-gated, theses only). The 6 rules are well-articulated. Provenance honestly caveated. This is the doctrine source that both inject hooks pull from.

5. **`X-ARTICLE-SYNERGY-AUDIT-2026-06-10.md`** — Audit finding: agent-loop doctrine is PARTIAL. The Opik self-repair is wired (`regression-lock-audit.mjs`). But `/loop` eval-gate is described as "self-reported string, not verified" — the audit explicitly names this as unverified.

6.
... [+4438 chars truncated]
