---
type: "chat-session"
source: "claude-code-cli"
session_id: "e648c936-3dfa-4a7c-aedb-4efebd2980b0"
title: "Map the PRISM automation surface relevant to the session lifecycle. Search bread"
date: "2026-05-14"
first_ts: "2026-05-14T13:16:17.980Z"
last_ts: "2026-05-14T13:20:57.087Z"
cwd: "H:\\prism"
messages: 94
user_msgs: 40
assistant_msgs: 54
raw_file: "H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-a2880e4db2a404af2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Map the PRISM automation surface relevant to the session lifecycle. Search bread

> **claude-code-cli** | 2026-05-14 | 94 msgs (40 user / 54 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-a2880e4db2a404af2.jsonl`

## Transcript

### User | 2026-05-14T13:16:17.980Z

Map the PRISM automation surface relevant to the session lifecycle. Search breadth: very thorough.

1. List and one-line-summarize the scripts under `H:/prism/.claude/scripts/` and `H:/prism/.claude/helpers/` and the relevant ones in `H:/prism/scripts/`. Pay special attention to: per-agent-handoff.mjs, stable-session-id.mjs, loop-state.mjs, chat-slots.mjs, pipeline-telemetry.mjs, adaptive-thresholds.mjs, build-state-snapshot.mjs, build-milestone-progress.mjs, audit-close-out-candidates.mjs, system-viz-query.mjs, generate-claude-brief.mjs, regen-claude-md-sections.mjs, extract-skill-triggers.mjs, scrutiny-3way.mjs, close-out-milestone.mjs, hook-health-check.mjs, node-process-janitor.mjs. For each: what it reads, what it produces, and whether its output is consumed by a hook or skill.

2. Read `H:/prism/mcp-server/data/docs/gsd/GSD_QUICK.md` and `H:/prism/mcp-server/data/docs/gsd/DEV_PROTOCOL.md` (and DEV_PROTOCOL or GSD_MICRO if present). Summarize the documented session lifecycle and dev protocol.

3. Briefly explain what RTK is (the `rtk` bash wrapper) and the DSL shortcode system (`CODE_SYSTEM_INDEX.json`, `/code-index`, the E####/D##/A##/T#### shortcodes).

4. Identify and report explicitly:
   (a) which scripts the session-lifecycle skills (startup, checkin, pick-task, pick-unit, precompact, handoff) currently call,
   (b) scripts that EXIST but are NOT called by any session-lifecycle skill (untapped automation),
   (c) every place a hardcoded tool list / count / threshold appears that SHOULD be dynamically discovered.

Report as structured markdown. Do NOT edit anything. Your final message is the only thing returned to me — make it complete and self-contained.

### Assistant | 2026-05-14T13:16:22.179Z

I'll conduct a thorough mapping of the PRISM automation surface related to the session lifecycle. Let me start by exploring the script directories and key documentation files.

### Assistant | 2026-05-14T13:16:22.426Z

[tool_use: Bash]

### User | 2026-05-14T13:16:27.553Z

[tool_result] Exit code 2
/usr/bin/bash: eval: line 1: unexpected EOF while looking for matching `"'

### Assistant | 2026-05-14T13:16:33.616Z

Let me use the more appropriate session tools first to understand the dispatcher map, then complement with file exploration.

### Assistant | 2026-05-14T13:16:33.617Z

[tool_use: mcp__prism_safe__prism_session]

### Assistant | 2026-05-14T13:16:34.482Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:16:34.484Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:16:34.486Z

[tool_use: Glob]

### User | 2026-05-14T13:16:59.207Z

[tool_result] [{"type": "text", "text": "{\"map\":\"\"}"}]

### User | 2026-05-14T13:17:03.648Z

[tool_result] .claude\scripts\annotate-policies.mjs
.claude\scripts\fix-stdin-hooks.mjs
.claude\scripts\test-asset-deletion-block.mjs
.claude\scripts\hook-schema-audit.mjs
.claude\scripts\init-autonomous-state.mjs
.claude\scripts\scrutiny-mark.mjs
.claude\scripts\test-ollama-preflight.mjs
.claude\scripts\test-embed-vault-on-save.mjs
.claude\scripts\fix-hook-output-shapes.mjs
.claude\scripts\system-viz-completen
... [+1624 chars truncated]

### User | 2026-05-14T13:17:04.112Z

[tool_result] .claude\helpers\agent-identity.mjs
.claude\helpers\tool-counter.mjs
.claude\helpers\hook-cache.mjs
.claude\helpers\review-merge.mjs
.claude\helpers\auto-route.mjs
.claude\helpers\smart-compaction-plan.mjs
.claude\helpers\test-quality-gate.mjs
.claude\helpers\position-sync.mjs
.claude\helpers\svi-refresh.mjs
.claude\helpers\sync-memory.mjs
.claude\helpers\milestone-tracker.mjs
.claude\helpers\roadm
... [+3562 chars truncated]

### User | 2026-05-14T13:17:04.747Z

[tool_result] scripts\materials_rebuild\generate.mjs
scripts\convert_to_ts.mjs
scripts\fix_imports.mjs
scripts\fix_and_build.mjs
scripts\fix_buffer_zones.mjs
scripts\extract-machines.mjs
scripts\gap-analysis.mjs
scripts\regen-code-index.mjs
scripts\extract-core-machines.mjs
scripts\index\build-shared-index-surfaces.mjs
scripts\audit\build-hook-skill-context-audit.mjs
scripts\agents\emit-spawned-agent-context.mj
... [+3149 chars truncated]

### Assistant | 2026-05-14T13:17:06.179Z

Now let me read the key documentation files and look for the specific scripts mentioned in the requirements:

### Assistant | 2026-05-14T13:17:06.860Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:07.136Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:07.470Z

[tool_use: Glob]

### User | 2026-05-14T13:17:09.360Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\data\docs\gsd\GSD_QUICK.md' was already read 72s ago in this session and is unchanged (mtime 1777343761506). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-14T13:17:10.413Z

[tool_result] mcp-server\data\docs\gsd\GSD_MICRO.md

### User | 2026-05-14T13:17:11.493Z

[tool_result] 1	# PRISM Dev Protocol v8.0
2	
3	## Approach Decision — Before Writing Any Code
4	
5	### Simple fix (<20 lines, single file)
6	→ Read → Edit → verify → done. No brainstorm. Skip ralph.
7	
8	### Medium task (20-100 lines, 1-3 files)
9	→ Plan in your head → implement → self-review.
10	Optional: `prism_ralph:scrutinize` if it touches safety or core
11	infrastructure.
12	
13	### Large task (>100 lines
... [+13246 chars truncated]

### Assistant | 2026-05-14T13:17:13.441Z

Let me read the GSD_MICRO file and search for the specific scripts mentioned in the requirements:

### Assistant | 2026-05-14T13:17:13.441Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:16.794Z

[tool_use: Bash]

### User | 2026-05-14T13:17:20.829Z

[tool_result] 1	# PRISM GSD Comprehensive Reference v3.0
2	## 95 dispatchers · 6346 actions · 3018 engines · 357 hooks · 503 skills · 244 scripts
3	## Build PASS · Omega 1.0 · Tests 3000+ · Updated 2026-04-28
4	
5	This is the **deep operational reference**, kept compact and accurate.
6	Each `## ` section is individually retrievable via
7	`prism_memory:semantic_search kind=gsd` (populated by
8	`scripts/chunk-gsd
... [+32118 chars truncated]

### User | 2026-05-14T13:17:25.318Z

[tool_result] /usr/bin/bash: line 1: $null: ambiguous redirect

### Assistant | 2026-05-14T13:17:29.406Z

Let me fix the bash command and search for the specific scripts more carefully:

### Assistant | 2026-05-14T13:17:29.792Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:17:30.414Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:17:32.915Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:17:33.116Z

[tool_use: Bash]

### User | 2026-05-14T13:17:38.602Z

[tool_result] ls: cannot access 'H:\prism\.claude\scripts\per-agent-handoff.mjs': No such file or directory
not found

### User | 2026-05-14T13:17:39.938Z

[tool_result] ls: cannot access 'H:\prism\.claude\scripts\stable-session-id.mjs': No such file or directory
not found

### User | 2026-05-14T13:17:42.599Z

[tool_result] -rwxr-xr-x 1 Mark V 197608 16170 May 12 12:55 H:\prism\.claude\helpers\stable-session-id.mjs

### User | 2026-05-14T13:17:43.641Z

[tool_result] -rwxr-xr-x 1 Mark V 197608 33963 May 13 13:52 H:\prism\.claude\helpers\per-agent-handoff.mjs

### Assistant | 2026-05-14T13:17:45.084Z

Now let me search for the other mentioned scripts and read key documentation files:

### Assistant | 2026-05-14T13:17:45.774Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:17:46.179Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:17:46.533Z

[tool_use: Read]

### User | 2026-05-14T13:17:50.504Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * per-agent-handoff.mjs — Per-Terminal Handoff & Pickup Queue System
4	 *
5	 * Solves: multiple Claude/Codex terminals clobbering a single HANDOFF.md
6	 * when they compact or stop simultaneously.
7	 *
8	 * Design:
9	 *   - Each terminal writes its own handoff: state/shared/handoffs/HANDOFF-{instance}.md
10	 *   - On stop, unfinished work moves to state/shared/PICKUP
... [+2180 chars truncated]

### User | 2026-05-14T13:17:54.654Z

[tool_result] H:\prism\scripts/system-viz-query.mjs

### system

... [14 middle messages omitted -- see raw_file] ...

### User | 2026-05-14T13:19:17.351Z

[tool_result] H:\prism\.claude\bin\rtk.exe: PE32+ executable for MS Windows 6.00 (console), x86-64, 5 sections

### Assistant | 2026-05-14T13:19:19.112Z

Now let me search for the session-lifecycle skills and their script dependencies efficiently using grep:

### Assistant | 2026-05-14T13:19:20.197Z

[tool_use: Grep]

### Assistant | 2026-05-14T13:19:20.863Z

[tool_use: Grep]

### Assistant | 2026-05-14T13:19:21.229Z

[tool_use: Read]

### User | 2026-05-14T13:19:23.436Z

[tool_result] Found 50 files limit: 50
.claude\hooks\coordination-startup-banner.mjs
.claude\hooks\pick-prefresh-inject.mjs
.claude\hooks\loop-iteration-inject.mjs
.claude\hooks\goal-complete-gate.mjs
.claude\hooks\session-start-claim-slot.mjs
.claude\hooks\mcp-route-suggest.mjs
.claude\hooks\__tests__\ollama-route-pretooluse.test.mjs
.claude\hooks\__tests__\file-read-cache.test.mjs
.claude\hooks\__tests__\conc
... [+1703 chars truncated]

### User | 2026-05-14T13:19:23.544Z

[tool_result] Found 31 files
.claude\hooks\loop-iteration-inject.mjs
.claude\hooks\golf-slot-write-allowlist.mjs
.claude\hooks\session-start-claim-slot.mjs
.claude\hooks\__tests__\concurrency-test.mjs
.claude\hooks\terminal-title-update.mjs
.claude\hooks\telemetry-autofire.mjs
.claude\hooks\stop_on_session_mistake_digest.mjs
.claude\hooks\stop-release-slot.mjs
.claude\hooks\stop-mark-completed-tasks.mjs
.claude
... [+854 chars truncated]

### User | 2026-05-14T13:19:25.438Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * pipeline-telemetry.mjs
4	 *
5	 * Records every rgs/forge pipeline step's decision + outcome to an
6	 * append-only ledger. The /rgs6 self-optimizing layer reads this ledger
7	 * to tune adaptive thresholds (tier-floor pct, context nudge pct, leverage
8	 * min, dispatcher capacity ceiling, etc.).
9	 *
10	 * Each entry is a discrete pipeline event:
11	 *   - stage_en
... [+2678 chars truncated]

### Assistant | 2026-05-14T13:19:27.127Z

Let me now read the specific scripts mentioned in the requirements and search for calls to them:

### Assistant | 2026-05-14T13:19:27.552Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:27.971Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:28.717Z

[tool_use: Grep]

### User | 2026-05-14T13:19:31.926Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * adaptive-thresholds.mjs
4	 *
5	 * Reads pipeline-telemetry.jsonl + compounding-gains-ledger.json + outcome
6	 * signals, and tunes 6 pipeline parameters that are currently hard-coded
7	 * magic numbers:
8	 *
9	 *   1. tier_floor_pct          — % prereq coverage required to start Tier-N work
10	 *      default 90%; adapt within [80, 95]
11	 *      tune up if observe
... [+3573 chars truncated]

### User | 2026-05-14T13:19:32.306Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * system-viz-query — programmatic adapter for the live system graph.
4	 *
5	 * Lets rgs / forge / roadmap tools consume system-graph.json without
6	 * embedding parsing logic. Read-only.
7	 *
8	 * Usage:
9	 *   node scripts/system-viz-query.mjs roadmap-candidates       # unwired + pending + drift
10	 *   node scripts/system-viz-query.mjs blast-radius <nodeId>    # do
... [+4091 chars truncated]

### User | 2026-05-14T13:19:32.862Z

[tool_result] .claude\hooks\agent-util-log.mjs:19:const STABLE_ID = resolve("H:/prism/.claude/helpers/stable-session-id.mjs");
.claude\hooks\auto-fork-executor.mjs:75:const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
.claude\hooks\chat-bus-inject.mjs:37:const STABLE_ID_HELPER = "H:/prism/.claude/helpers/stable-session-id.mjs";
.claude\hooks\chat-cleanup-on-stop.mjs:29:const STABLE_HELPE
... [+3548 chars truncated]

### Assistant | 2026-05-14T13:19:35.781Z

Let me efficiently read the session-lifecycle skills configuration and key hooks:

### Assistant | 2026-05-14T13:19:36.239Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:37.173Z

[tool_use: Grep]

### Assistant | 2026-05-14T13:19:37.177Z

[tool_use: Read]

### User | 2026-05-14T13:19:43.754Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * scrutiny-3way — multi-reviewer parallel scrutiny orchestrator.
4	 *
5	 * Three independent Claude PRISM agents, all required PASS to release the
6	 * Stop hook (NO external CLI dependency — Codex CLI was retired 2026-05-13
7	 * after persistent diff-size truncation on PRISM-scale commits exceeded its
8	 * 80 KB context budget):
9	 *   1. Claude reviewer agent A  — 
... [+4830 chars truncated]

### User | 2026-05-14T13:19:43.990Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-handoff-load.mjs — SessionStart hook
5	 *
6	 * AUTO-LOADS THIS chat's per-agent handoff at session start so the user
7	 * does not need to run /startup just to recover the RESUME directive.
8	 *
9	 * Resolution order for the chat instance ID:
10	 *   1. payload.session_id (Claude Code SessionStart payload)
11	 *   2. process.env.CLAUDE_SESSION
... [+3692 chars truncated]

### User | 2026-05-14T13:19:44.312Z

[tool_result] Found 8 files
.claude\hooks\session-start-claim-slot.mjs
.claude\hooks\stop-release-slot.mjs
.claude\hooks\session-handoff-load.mjs
.claude\hooks\precompact-dossier.mjs
.claude\hooks\periodic-checkin.mjs
.claude\hooks\chat-slot-heartbeat.mjs
.claude\hooks\bundles\sessionstart-bundle.mjs
.claude\hooks\AGI_INFRA_PHASE_A_WIRING.md

### Assistant | 2026-05-14T13:19:46.175Z

Let me now compile a comprehensive report by reading key hook files and examining how they call the scripts:

### Assistant | 2026-05-14T13:19:46.881Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:47.087Z

[tool_use: Read]

### Assistant | 2026-05-14T13:19:47.915Z

[tool_use: Grep]

### User | 2026-05-14T13:19:50.245Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * precompact-dossier.mjs — U-CTX03 Rich PreCompact Dossier
5	 *
6	 * Creates comprehensive snapshot before compaction for restoration.
7	 * Captures in-flight work, uncommitted changes, reasoning state,
8	 * and exploration/exploitation balance.
9	 *
10	 * Target: 100K token survival budget with prioritized content.
11	 */
12	
13	import * as fs from "fs
... [+2988 chars truncated]

### User | 2026-05-14T13:19:50.445Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * periodic-checkin.mjs — UserPromptSubmit periodic heartbeat + chat poll
5	 *
6	 * WHY: Concurrent chats (4+) need regular situational awareness of each
7	 * other's work. SessionStart-only coordination goes stale fast. This hook
8	 * fires on every UserPromptSubmit with a 20-minute cooldown per session:
9	 *   1. Posts a heartbeat to AGENT_CHAT.jsonl (
... [+3048 chars truncated]

### User | 2026-05-14T13:19:50.800Z

[tool_result] .claude\hooks\scrutinize-before-stop.mjs:174:    `       node .claude/scripts/scrutiny-3way.mjs --session-id ${sessionId}`,
.claude\hooks\scrutinize-before-stop.mjs:185:    `       node .claude/scripts/scrutiny-3way.mjs --mark-opus pass    --session-id ${sessionId} --notes "<reviewer A summary>"`,
.claude\hooks\scrutinize-before-stop.mjs:186:    `       node .claude/scripts/scrutiny-3way.mjs --mar
... [+185 chars truncated]

### Assistant | 2026-05-14T13:19:53.032Z

Let me now search for all script calls in hooks to identify the complete automation surface:

### Assistant | 2026-05-14T13:19:54.416Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:19:56.104Z

[tool_use: Bash]

### User | 2026-05-14T13:20:01.135Z

[tool_result] 57
---
238
---
__pycache__
__tests__
_archive
_completed_utilities
_fix_ref_hb.js
_prism_paths.py
adapt-router-thresholds.mjs
add_atcs_renames.js
add-cleanup-roadmap-to-atomic.mjs
add-jsdoc.ts
add-parent-contains-edges.mjs
adv_audit.js
agents
alloy_compositions_db.py
alloy_physical_properties_db.py
alm_fix_gen.js
alm0_analyze.js
alm0_audit.js
alm0_check_core.js
alm0_consolidate.js
alm0_enrich.js
a
... [+216 chars truncated]

### User | 2026-05-14T13:20:02.676Z

[tool_result] H:\prism\.claude\hooks/build-state-inject.mjs: *   node H:/prism/scripts/build-state-snapshot.mjs
H:\prism\.claude\hooks/build-state-inject.mjs:    "Full data: `state/shared/BUILD_STATE.json` · Human view: `state/shared/BUILD_STATE.md` · Regen: `node scripts/build-state-snapshot.mjs`",
H:\prism\.claude\hooks/build-state-inject.mjs:        "⚠ BUILD_STATE.json missing — run `node H:/prism/scripts/bu
... [+2469 chars truncated]

### Assistant | 2026-05-14T13:20:04.732Z

Excellent! Now let me search for hardcoded tool lists and thresholds:

### Assistant | 2026-05-14T13:20:05.379Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:20:06.256Z

[tool_use: Grep]

### User | 2026-05-14T13:20:08.182Z

[tool_result] .claude\scripts\adaptive-thresholds.mjs:9: *   1. tier_floor_pct          — % prereq coverage required to start Tier-N work
.claude\scripts\adaptive-thresholds.mjs:14: *   2. context_nudge_pct       — soft compaction nudge threshold
.claude\scripts\adaptive-thresholds.mjs:23: *   4. leverage_min            — minimum acceptable leverage_score for a Phase-2 unit
.claude\scripts\adaptive-thresholds.m
... [+4246 chars truncated]

### User | 2026-05-14T13:20:12.635Z

[tool_result] H:\prism\.claude\hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs:        triggers: ["create engine", "new engine", "build engine", "forge", "generate"],
H:\prism\.claude\hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs:        triggers: ["new engine", "create engine", "build engine"],
H:\prism\.claude\hooks/.deprecated/awareness-2026-05-13/ai-command-awareness.mjs:  
... [+4296 chars truncated]

### Assistant | 2026-05-14T13:20:57.087Z

Now let me compile the comprehensive report with all the gathered information:

---

## PRISM Session Lifecycle Automation Surface — Complete Mapping

### 1. Script Inventory Summary

**Location Distribution:**
- `.claude/scripts/`: 57 scripts (automation, pipeline, telemetry, analysis, auditing)
- `.claude/helpers/`: 238 helpers (low-level utilities, caching, coordination, wiring)
- `scripts/` (root): ~150+ scripts (system generation, resource harvesting, one-offs)

---

### 2. Key Session-Lifecycle Scripts (As Documented)

| Script | Location | Reads | Produces | Consumed By | Purpose |
|--------|----------|-------|----------|------------|---------|
| **per-agent-handoff.mjs** | `.claude/helpers/` | HANDOFF-\*.md, PICKUP_QUEUE.json, session cache | per-agent handoff files, pickup queue | `session-handoff-load.mjs` hook, CLI `/handoff` skill | Multi-terminal handoff/pickup queue system |
| **stable-session-id.mjs** | `.claude/helpers/` | WT_SESSION, .stable-session-cache.json, .active-sessions-by-pid.json | session ID (claude-XXXXXXXX) | 31+ hooks (stable-session anchoring) | Generates stable session ID across hook invocations |
| **loop-state.mjs** | NOT FOUND (referenced in docs but missing) | — | — | ? | Loop iteration state tracking (UNTAPPED) |
| **chat-slots.mjs** | NOT FOUND (referenced in docs but missing) | — | — | ? | Chat slot coordination (UNTAPPED) |
| **pipeline-telemetry.mjs** | `.claude/scripts/` | pipeline-telemetry.jsonl | pipeline-telemetry.jsonl (append) | `adaptive-thresholds.mjs` script | Records S0-S11 stage entries, tool use, decisions, outcomes, violations |
| **adaptive-thresholds.mjs** | `.claude/scripts/` | pipeline-telemetry.jsonl, compounding-gains-ledger.json | adaptive-thresholds.json | (NO HOOK CALLS IT — UNTAPPED) | Tunes 6 hardcoded thresholds dynamically |
| **build-state-snapshot.mjs** | `scripts/` | git status, build logs, state files | BUILD_STATE.json, BUILD_STATE.md | `build-state-inject.mjs` hook | Snapshots git branch, unc
... [+11768 chars truncated]
