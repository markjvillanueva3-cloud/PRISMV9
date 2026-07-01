---
type: "chat-session"
source: "claude-code-cli"
session_id: "e648c936-3dfa-4a7c-aedb-4efebd2980b0"
title: "Map how PRISM slash commands COMPOSE and chain today, and find the gaps. Search "
date: "2026-05-14"
first_ts: "2026-05-14T13:35:51.954Z"
last_ts: "2026-05-14T13:44:42.161Z"
cwd: "H:\\prism"
messages: 79
user_msgs: 34
assistant_msgs: 45
raw_file: "H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-adecda29b3046e276.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Map how PRISM slash commands COMPOSE and chain today, and find the gaps. Search 

> **claude-code-cli** | 2026-05-14 | 79 msgs (34 user / 45 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-adecda29b3046e276.jsonl`

## Transcript

### User | 2026-05-14T13:35:51.954Z

Map how PRISM slash commands COMPOSE and chain today, and find the gaps. Search breadth: very thorough.

1. EXISTING COMPOSITION: find every command that invokes/chains/delegates to other commands. Read the families: `/forge`..`/forge7` + `/forge-*`, `/rgs`..`/rgs6`, `/pick-build-close`, `/autopilot*`, `/quote-to-ship`, the `/*-studio` commands (wire-edm-studio, lathe-studio, mill-studio, sinker-studio, welder-studio, grinder-studio), `/run-continuous`, `/team-dispatch`, `/six-chat-*`. For each: what does it chain, and HOW (frontmatter `pipeline_integrations`? prose "delegate to /x" / "run /x"? a script? the skill-auto-trigger hook?).

2. THE COMPOSITION MECHANISM: is there a FORMAL way commands declare "I consume X, I produce Y, I can be piped into Z"? Check skill frontmatter, the `pipeline_integrations` field, `_skill-triggers.jsonl`, any bundle/chain registry. Report what the composition primitive IS today (if any) and how informal vs formal it is.

3. PIPELINE GAPS: identify natural multi-command pipelines that DON'T exist as a single command but should — places where a user manually chains 3-5 commands. Evaluate at least: session lifecycle (startup→checkin→pick→handoff), research-before-build, scrutiny (scrutinize→per-file→3-of-3→record), orphan-wiring (orphan-inventory→pick→wire→test→close), learn (pdf/video/url→extract→dedup→tribal→wiki→memory), diagnose→fix, quote→ship. List concrete candidate NEW pipeline commands with exactly what each would chain.

4. Read `H:/prism/.claude/hooks/skill-auto-trigger.mjs`, `H:/prism/scripts/extract-skill-triggers.mjs`, and the `knowledge/wiki/architecture/_skill-triggers.jsonl` format — explain how skill suggestion/triggering works today and whether it's a viable backbone for command composition.

Report as structured markdown. Do NOT edit anything. Your final message is the only thing returned — make it complete and self-contained.

### Assistant | 2026-05-14T13:35:54.757Z

I'll conduct a thorough investigation of PRISM command composition, chaining mechanisms, and gaps. Let me start by exploring the codebase systematically.

### Assistant | 2026-05-14T13:35:54.758Z

[tool_use: Bash]

### User | 2026-05-14T13:38:06.238Z

[tool_result] Command running in background with ID: bqrq9pi9w. Output is being written to: H:\prism\.cache\temp\claude\H--PRISM\00303402-8d56-410b-b5a4-2d45e0e2edf6\tasks\bqrq9pi9w.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-05-14T13:38:07.843Z

Let me use more targeted searches to avoid timeouts.

### Assistant | 2026-05-14T13:38:08.035Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:38:08.353Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:38:08.767Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:38:09.059Z

[tool_use: Glob]

### User | 2026-05-14T13:38:10.836Z

[tool_result] No files found

### User | 2026-05-14T13:38:11.067Z

[tool_result] No files found

### User | 2026-05-14T13:38:11.320Z

[tool_result] No files found

### User | 2026-05-14T13:38:11.866Z

[tool_result] .claude\hooks\agent-boundary-guard.mjs
.claude\hooks\agent-pid-tracker.mjs
.claude\hooks\agent-registry-load.mjs
.claude\hooks\agent-rules-inject.mjs
.claude\hooks\agent-util-log.mjs
.claude\hooks\agent-vs-direct.mjs
.claude\hooks\agent-worktree-stale-unlock.mjs
.claude\hooks\aggressive-killer-stop.mjs
.claude\hooks\agi-safety-envelope-guard.mjs
.claude\hooks\ai-auto-command-router.mjs
.claude\hoo
... [+3835 chars truncated]

### Assistant | 2026-05-14T13:38:14.396Z

Let me narrow my searches and examine the key trigger/composition files directly.

### Assistant | 2026-05-14T13:38:14.917Z

[tool_use: Read]

### Assistant | 2026-05-14T13:38:15.160Z

[tool_use: Read]

### Assistant | 2026-05-14T13:38:15.353Z

[tool_use: Glob]

### User | 2026-05-14T13:38:18.336Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * skill-auto-trigger.mjs — UserPromptSubmit hook (Phase D.2 of DEV-VELOCITY-AUTOTRIGGER-MS0).
5	 *
6	 * Reads `knowledge/wiki/architecture/_skill-triggers.jsonl` (the stage-22 extract
7	 * of every skill's `triggers:` frontmatter — see Phase D.3). For each UserPromptSubmit
8	 * event, scores the prompt against every trigger and emits top-K suggestions a
... [+9968 chars truncated]

### User | 2026-05-14T13:38:19.711Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * extract-skill-triggers.mjs — Phase D.3 of DEV-VELOCITY-AUTOTRIGGER-MS0.
4	 *
5	 * Walks every `.claude/commands/*.md` skill manifest (project + global), parses
6	 * the YAML frontmatter, extracts the `triggers:` block, and writes one JSONL
7	 * line per trigger to `knowledge/wiki/architecture/_skill-triggers.jsonl`.
8	 *
9	 * Consumed by: `skill-auto-trigger.mjs` U
... [+10581 chars truncated]

### User | 2026-05-14T13:38:19.715Z

[tool_result] knowledge\wiki\architecture\_skill-triggers.jsonl

### Assistant | 2026-05-14T13:38:23.000Z

Now let me examine example skills to understand the composition pattern and search for command chains.

### Assistant | 2026-05-14T13:38:23.817Z

[tool_use: Bash]

### User | 2026-05-14T13:38:29.856Z

[tool_result] -rw-r--r-- 1 Mark V 197608  1478 May  8 18:06 forge2.md
-rw-r--r-- 1 Mark V 197608  9072 May  9 23:41 forge-audit.md
-rw-r--r-- 1 Mark V 197608  9825 Apr 13 10:43 forge-triple.md
-rw-r--r-- 1 Mark V 197608  1834 May  6 13:26 lathe-studio.md
-rw-r--r-- 1 Mark V 197608  1939 May  6 13:26 mill-studio.md
-rw-r--r-- 1 Mark V 197608  6185 May 13 22:44 pick-build-close.md
-rw-r--r-- 1 Mark V 197608  2725
... [+314 chars truncated]

### Assistant | 2026-05-14T13:38:31.603Z

[tool_use: Read]

### Assistant | 2026-05-14T13:38:31.675Z

[tool_use: Read]

### Assistant | 2026-05-14T13:38:31.391Z

[tool_use: Read]

### User | 2026-05-14T13:39:27.249Z

[tool_result] 1	---
2	name: pick-build-close
3	description: Macro loop — pick a unit, build it, close it out. Chains /pick-unit → build (whatever the chat does) → /close-out-audit → MILESTONE_PROGRESS regen → handoff. The canonical productivity loop for shipping pending units. Use when you want to ship the top devtools unit without manually chaining 4 skills.
4	trigger:
5	  autoSuggest:
6	    keywords: ["pick b
... [+5957 chars truncated]

### User | 2026-05-14T13:39:27.392Z

[tool_result] 1	---
2	effort: high
3	maxTurns: 30
4	---
5	
6	# Forge Triple — Engines + Skills + Hooks Pipeline
7	
8	Run three forge pipelines back-to-back in a single session for maximum system growth.
9	
10	## Args: $ARGUMENTS
11	- Empty: run all three in sequence (engines → skills → hooks)
12	- `engines-only`: just engines
13	- `skills-only`: just skills
14	- `hooks-only`: just hooks
15	- `[count]`: create u
... [+9880 chars truncated]

### User | 2026-05-14T13:39:27.851Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "quote-to-ship"
6	    - "fail"
7	    - "skip"
8	---
9	# Quote-to-Ship Pipeline
10	
11	Run the 21-stage QuoteToShip pipeline from blueprint intake through shipping.
12	
13	## Advisor Strategy (`advisor_20260301`)
14	Use Anthropic's advisor tool for the `run` subcommand:
15	- **Executor**: Sonnet 4.6 (drives the 21-stage pipeline, calls MCP tools)
16
... [+2548 chars truncated]

### Assistant | 2026-05-14T13:39:39.166Z

Now let me read the _skill-triggers.jsonl to see how composition is declared, and examine a few more complex skills.

### Assistant | 2026-05-14T13:39:39.576Z

[tool_use: Read]

### Assistant | 2026-05-14T13:39:40.035Z

[tool_use: Read]

### Assistant | 2026-05-14T13:39:40.924Z

[tool_use: Read]

### User | 2026-05-14T13:39:43.096Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-14T13:39:44.686Z

[tool_result] 1	{"name":"big-blob-hunt","type":"skill","manifest":"H:/prism/.claude/commands/big-blob-hunt.md","matcher":{"type":"keyword","value":"git size|repo bloat|lfs migrate|filter-repo|big blob|history rewrite|U-GC-02|.git directory"},"score":0.85,"action":"suggest"}
2	{"name":"dispatcher-coverage","type":"skill","manifest":"H:/prism/.claude/commands/dispatcher-coverage.md","matcher":{"type":"keyword","v
... [+2338 chars truncated]

### User | 2026-05-14T13:39:45.210Z

[tool_result] 1	---
2	policy:
3	  tier: 3
4	  triggers:
5	    - "rgs"
6	---
7	# RGS — Roadmap Generation System
8	
9	You are the unified entry point for the PRISM Roadmap Generation System. Based on the arguments, route to the appropriate RGS operation.
10	
11	## Args: $ARGUMENTS
12	- Empty or `status`: Show roadmap status (milestone counts, completion, available tracks)
13	- `brainstorm [topic]`: Brainstorm im
... [+8340 chars truncated]

### Assistant | 2026-05-14T13:39:49.674Z

Let me search for the autopilot and other composition-heavy skills, and check for pipeline_integrations patterns.

### Assistant | 2026-05-14T13:39:50.457Z

[tool_use: Bash]

### User | 2026-05-14T13:39:59.247Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T13:40:00.637Z

[tool_use: Bash]

### User | 2026-05-14T13:40:14.137Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T13:40:15.928Z

[tool_use: Bash]

### User | 2026-05-14T13:40:28.137Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T13:40:29.668Z

[tool_use: Bash]

### User | 2026-05-14T13:40:39.693Z

[tool_result] 163
advisor-strategy.md
agi-cad-generate.md
approvals.md
awareness-check.md
awareness-snapshot.md
batch-optimize.md
big-blob-hunt.md
biz-health.md
build-state.md
cad-corpus.md
cad-dfm.md
cad-dfm-generate.md
cad-explain.md
cad-extract.md
cad-feature-recognize.md
cad-from-blueprint.md
cad-from-text.md
cad-rag.md
cad-review.md
cad-search.md
cad-tolerance.md
cad-tolerance-check.md
cad-train.md
cad-val
... [+430 chars truncated]

### Assistant | 2026-05-14T13:40:41.773Z

[tool_use: Bash]

### User | 2026-05-14T13:41:03.015Z

[tool_result] big-blob-hunt.md
biz-health.md
build-state.md
cad-explain.md
checkin.md
claude-flow-swarm.md
close-out.md
close-out-audit.md
dispatcher-coverage.md
envelope-drift-fix.md
error-learn-review.md
forge2.md
forge-audit.md
forge-triple.md
lathe.md
lathe-master-post.md
learn-batch.md
macro-program.md
master-index.md
mill.md

### Assistant | 2026-05-14T13:41:04.445Z

[tool_use: Read]

### Assistant | 2026-05-14T13:41:04.659Z

[tool_use: Read]

### Assistant | 2026-05-14T13:41:04.898Z

[tool_use: Read]

### User | 2026-05-14T13:41:17.819Z

[tool_result] 1	---
2	name: claude-flow-swarm
3	description: Coordinate multi-agent swarms for complex tasks
4	policy:
5	  tier: 1
6	  triggers:
7	    - events:
8	      - "UserPromptSubmit"
9	      keywords:
10	      - "claude flow swarm"
11	  mode: "suggest"
12	  priority: 40
13	  timeout_ms: 2000
14	  token_budget: 300
15	---
16	
17	# 🐝 Claude-Flow Swarm Coordination
18	
19	Advanced multi-agent coordination s
... [+3246 chars truncated]

### User | 2026-05-14T13:41:18.302Z

[tool_result] 1	---
2	name: checkin
3	description: Check this chat into the 7-slot PRISM fleet (claim alpha/bravo/charlie/delta/echo/foxtrot work slots OR golf hygiene slot), bind the handoff filename to the slot, reap crashed slots + stale file-claims, and verify there's no envelope/code drift, no peer-owned files staged, no stale index.lock, no diverge-from-origin. Run once at the start of any chat that's par
... [+11945 chars truncated]

### User | 2026-05-14T13:41:18.547Z

[tool_result] 1	---
2	name: close-out-audit
3	description: Audit roadmap envelopes for units whose deliverables exist on disk but whose status is still "pending" (silent close-out debt). Advisory only — every candidate must be human-verified.
4	trigger:
5	  autoSuggest:
6	    keywords: ["close out", "close-out", "closeout", "envelope drift", "shipped but pending", "audit close", "find shipped", "stale milestone
... [+4035 chars truncated]

### Assistant | 2026-05-14T13:41:21.054Z

Now let me search for patterns in how skills declare their composition, pipeline_integrations, or delegation.

### Assistant | 2026-05-14T13:41:21.353Z

[tool_use: Bash]

### User | 2026-05-14T13:41:36.621Z

[tool_result] pipeline_integrations:
npx vitest run src/__tests__/cross-engine-wiring.test.ts
than 12 hours. Otherwise re-run `node scripts/build-state-snapshot.mjs`
**Re-run it after every `/compact`** (the slot heartbeat needs refreshing; a compact can also leave a stale index.lock).
- `--roadmap revenue` — this chat is on the **revenue roadmap** (`REVENUE-ROADMAP-v7.6` §R1–§R10; `track:"revenue"` units) — ru
... [+7857 chars truncated]

### Assistant | 2026-05-14T13:41:38.138Z

Let me check for explicit pipeline_integrations fields more carefully and look at the structure.

### Assistant | 2026-05-14T13:41:38.595Z

[tool_use: Bash]

### User | 2026-05-14T13:41:48.431Z

[tool_result] big-blob-hunt.md:pipeline_integrations:
big-blob-hunt.md-  - pipeline: rgs               # /rgs propose-phase
big-blob-hunt.md-    phase: propose
big-blob-hunt.md-    trigger: "before proposing a U-GC-02-class history-rewrite unit"
big-blob-hunt.md-    action: invoke
big-blob-hunt.md-  - pipeline: forge-audit       # /forge-audit, /forge-audit-v2
big-blob-hunt.md-    phase: layer-3-size
big-blob-h
... [+3042 chars truncated]

### Assistant | 2026-05-14T13:41:50.206Z

Perfect! Now let me look at a few more complex compositions and check what the composition mechanism looks like more systematically.

### Assistant | 2026-05-14T13:41:50.641Z

[tool_use: Read]

### Assistant | 2026-05-14T13:41:51.072Z

[tool_use: Read]

### Assistant | 2026-05-14T13:41:51.294Z

[tool_use: Bash]

### User | 2026-05-14T13:42:17.962Z

[tool_result] 1	---
2	name: envelope-drift-fix
3	title: Envelope Drift Fix — Detect + Auto-Apply + Full Close-Out
4	description: Orchestrator that combines `/envelope-sync` (drift detection + patch proposal), automatic patch application (gated by --fix), AND the 4-surface close-out per the roadmap-close-out doctrine (roadmap-index, MILESTONE_PROGRESS, BUILD_STATE, chat-bus). One command instead of five. Compani
... [+8029 chars truncated]

### User | 2026-05-14T13:42:19.169Z

[tool_result] 1	---
2	name: lathe
3	description: Lathe / Turning Domain Studio — the single entry point that orchestrates every PRISM lathe engine, the Lathe Tier-3 AGI + Knowledge Graph, the turning dispatchers, 3,700+ tribal tips + playbook rules, the neural-network / deep-learning paths, the physics + speed/feed + tooling engines, the post-processor + controller-dialect resolver, the per-machine envelope gua
... [+18909 chars truncated]

### User | 2026-05-14T13:42:29.193Z

[tool_result] 27

### Assistant | 2026-05-14T13:42:37.459Z

Excellent. Now let me search for any existing pipelines or patterns that are missing, and look at a few more skill-dependency examples.

### Assistant | 2026-05-14T13:42:37.865Z

[tool_use: Bash]

### User | 2026-05-14T13:42:43.096Z

[tool_result] Exit code 1
---
policy:
  tier: 1
  triggers:
    - "learn"
---
# /learn — Universal Learning Router

Route learning requests to the appropriate specialized learning skill based on source type.

## Usage
```
/learn [source-path-or-url]
```

## MCP Action
```
prism_knowledge:learn_route
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (routes to specialized learner)
- **Advi
... [+912 chars truncated]

### Assistant | 2026-05-14T13:42:44.608Z

[tool_use: Bash]

### User | 2026-05-14T13:42:53.782Z

[tool_result] Exit code 1

### Assistant | 2026-05-14T13:42:55.037Z

[tool_use: Bash]

### User | 2026-05-14T13:43:09.834Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-05-14T13:43:11.313Z

Now let me compile my findings from what I've read and create a comprehensive report.

### Assistant | 2026-05-14T13:43:11.592Z

[tool_use: Read]

### Assistant | 2026-05-14T13:43:11.917Z

[tool_use: Read]

### User | 2026-05-14T13:43:14.479Z

[tool_result] File does not exist. Note: your current working directory is H:\prism.

### User | 2026-05-14T13:43:15.739Z

[tool_result] 1	---
2	name: close-out
3	description: Close out a completed milestone across every roadmap surface — roadmap-index.json, MILESTONE_PROGRESS, BUILD_STATE, and the chat bus. Use after a milestone envelope is marked completed but the downstream surfaces still report drift.
4	version: 1.0.0
5	triggers:
6	  - "close out"
7	  - "close-out"
8	  - "close out milestone"
9	  - "close out a milestone"
10	  
... [+4028 chars truncated]

### Assistant | 2026-05-14T13:44:42.161Z

Now let me finalize my comprehensive report based on all my findings.

---

# PRISM Command Composition: Current State, Gaps, and Pipeline Opportunities

## EXECUTIVE SUMMARY

PRISM has **informal command composition via prose delegation and implicit multi-step workflows**, but **no formal pipeline-composition primitive**. The system chains commands through:

1. **Prose instructions** (skill markdown "delegate to /X")
2. **Helper scripts** (`run-skill.mjs`, `node scripts/*.mjs`)
3. **Emerging triggers/detection framework** (`_skill-triggers.jsonl` + `skill-auto-trigger.mjs` hook)
4. **Ad-hoc pipeline_integrations field** (metadata, not executable)

This creates **27 composition-aware skills** (verified via grep) that manually chain 3-5 commands, but **zero formal composition system** to make chains reusable, discoverable, or auto-executable.

---

## 1. EXISTING COMPOSITION: THE COMMAND FAMILIES

### 1.1 Verified Composition Patterns

#### **Forge Family** (`/forge`, `/forge2`, `/forge-triple`, `/forge-audit*`)
- **forge-triple.md**: 3-pipeline orchestrator → `engines` + `skills` + `hooks`
  - No explicit chaining; prose describes sequential phases
  - Each phase is a standalone `/forge-X` invocation (manual)
  - Output rule: every phase must produce 3 products (engine + skill + hook)
  - Composition mechanism: **prose ordering + enforcement hooks**

#### **RGS Family** (`/rgs`, `/rgs2`, `/rgs3`, `/rgs-sync`)
- **rgs.md**: Roadmap generation entry point
  - Routes: `status` → read index, `generate [brief]` → 10-stage pipeline, `continue [id]`, `list`, `plan`, `utilize [topic]`
  - Chains internally: uses `prism_session` MCP actions (dispatcher calls, not skill calls)
  - No explicit sub-skill delegation shown
  - Composition mechanism: **router pattern + MCP action chaining**

#### **Pick-Build-Close Loop** (`/pick-build-close`)
- **Explicit 9-step orchestration chain:**
  1. Refresh `pick-prefresh-inject.mjs` hook
  2. Pick (delegates to `/pick-unit`)
  3. Loop-sta
... [+25329 chars truncated]
