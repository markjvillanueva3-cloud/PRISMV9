---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Map the COMPLETE existing PRISM Hermes integration so we know exactly what is al"
date: "2026-06-15"
first_ts: "2026-06-15T00:38:16.050Z"
last_ts: "2026-06-15T00:48:38.915Z"
cwd: "H:\\prism-slot-sierra"
messages: 110
user_msgs: 49
assistant_msgs: 61
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a59754ffa85ddacd1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Map the COMPLETE existing PRISM Hermes integration so we know exactly what is al

> **claude-code-cli** | 2026-06-15 | 110 msgs (49 user / 61 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-a59754ffa85ddacd1.jsonl`

## Transcript

### User | 2026-06-15T00:38:16.050Z

Map the COMPLETE existing PRISM <-> Hermes integration so we know exactly what is already built before building more. Repo root H:/prism. Report a factual inventory: file path + what it does + whether it is wired/working + what remains for "full bridge with Claude Code CLI". Cite exact paths and real content; never invent.

COVER:
1. `H:/prism/scripts/ask-hermes.mjs` — read it FULLY. What is the "Hermes proxy :8645"? What model providers does it use (the substrate router mentions "OAuth-managed xai grok / nous")? How does auth work? What is the ollama fallback path? Is the proxy a separate server (find scripts/*hermes*proxy* or a server on :8645)?
2. `H:/prism/.claude/helpers/install-hermes-tasks.ps1` — the 3 Hermes scheduled tasks (prewarm, GEPA, skill-loop). Then read every `H:/prism/scripts/hermes-*.mjs` (hermes-cron-prewarm, hermes-skill-gepa, and any others) — what loops/crons/harnesses exist and what they do.
3. `H:/prism/scripts/skill-loop-run.mjs` and `H:/prism/scripts/lib/task-substrate-router.mjs` — the agentic skill-loop + the model-routing (Ollama->Sonnet->Opus ladder, Hermes fan-out). How is model auto-switching decided?
4. Hermes WIKI entries — read: knowledge/wiki/**/hermes-app-incorporation-ms0*, knowledge/wiki/**/hermes-local-u-ollama-ctx-fix*, knowledge/wiki/**/hermes-app-viz-roost*, knowledge/wiki/**/obsidian-hermes-context-accel*. Summarize what each documents about the bridge + its current status.
5. Hermes SPECS — Glob state/shared/specs/*HERMES* and *hermes* and *AGENTIC-SUBSTRATE* — list them, read the most recent/relevant, summarize the planned vs shipped bridge state.
6. The Obsidian-vault <-> Hermes connection — how does Hermes feed from / write to the Obsidian vault (knowledge/memories, knowledge/wiki)? Any sync scripts?
7. A peer chat is reportedly building "AGENTIC-SUBSTRATE-BRIDGE" — find any in-flight artifacts (scripts, specs, recent commits with that scope) so we coordinate, not duplicate.

End with a crisp GAP LIST: what is genuine
... [+230 chars truncated]

### Assistant | 2026-06-15T00:38:18.986Z

I'll systematically explore the PRISM <-> Hermes integration. Let me start with broad discovery in parallel.

### Assistant | 2026-06-15T00:38:19.750Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:38:20.552Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:38:20.822Z

[tool_use: Glob]

### User | 2026-06-15T00:38:31.488Z

[tool_result] H:/prism/scripts\lib\hermes-outcome-feedback.mjs
H:/prism/scripts\lib\hermes-frontier-utils.mjs
H:/prism/scripts\lib\hermes-outcome-feedback.test.mjs
H:/prism/scripts\lib\hermes-frontier-utils.test.mjs
H:/prism/scripts\hermes-self-reflect-populater.test.mjs
H:/prism/scripts\hermes-self-reflect-populater.mjs
H:/prism/scripts\hermes-obsidian-memory-bridge.mjs
H:/prism/scripts\hermes-obsidian-memory-
... [+567 chars truncated]

### User | 2026-06-15T00:39:31.012Z

[tool_result] Exit code 255

### User | 2026-06-15T00:40:30.511Z

[tool_result] INDEX_TEMPLATE.js
MODULE_TEMPLATE.js
PLAN_deep_accuracy_v2.md
README.md
SESSION_START_TEMPLATES.md
TOOLKIT_ROADMAP.md
__fixtures__/
__pycache__/
__tests__/
_archive/
_audit-foxtrot-mill-cam.mjs*
_classify-hooks.mjs*
_completed_utilities/
_emergency-unwire-yolo-25.mjs*
_fix_ref_hb.js
_hook-audit-report.mjs*
_oneshot-rename-last-night.mjs*
_prep-hook-slices.mjs*
_prism_paths.py
_restore-3-critical-h
... [+1044 chars truncated]

### Assistant | 2026-06-15T00:40:32.682Z

Good. Now let me read the key files in parallel.

### Assistant | 2026-06-15T00:40:33.107Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:33.493Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:40:33.869Z

[tool_use: Glob]

### User | 2026-06-15T00:40:35.693Z

[tool_result] H:/prism/.claude/helpers\autopilot-watchdog.ps1
H:/prism/.claude/helpers\system-shutdown-cleanup.ps1
H:/prism/.claude/helpers\slot-job-object.ps1
H:/prism/.claude/helpers\ensure-all-watchdogs.ps1
H:/prism/.claude/helpers\apply-pagefile-config.ps1
H:/prism/.claude/helpers\install-system-awareness-freshness-task.ps1
H:/prism/.claude/helpers\install-blueprint-join-refresh-task.ps1
H:/prism/.claude/he
... [+2961 chars truncated]

### User | 2026-06-15T00:40:37.268Z

[tool_result] H:/prism/scripts\hermes-proxy-ensure.mjs
H:/prism/scripts\hermes-proxy-ensure.test.mjs

### User | 2026-06-15T00:40:37.404Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * ask-hermes.mjs -- PRISM bridge to the local Hermes OpenAI-compatible proxy
4	 * (HERMES-BRIDGE-MS0/U-ASK-HERMES).
5	 *
6	 * Hermes (Nous) exposes `hermes proxy start` -- a local HTTP server that speaks
7	 * the OpenAI /v1 protocol and forwards to an OAuth-authenticated upstream
8	 * (xAI Grok / Nous Portal), attaching the user's real managed credential. This
9	 * s
... [+14278 chars truncated]

### Assistant | 2026-06-15T00:40:39.739Z

Now let me read the Hermes-specific files in parallel.

### Assistant | 2026-06-15T00:40:40.145Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:40.555Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:40.701Z

[tool_use: Read]

### User | 2026-06-15T00:40:42.078Z

[tool_result] 1	param(
2	  # Cadence for the cron-prewarm task (every N minutes). The prewarm reads
3	  # Hermes cron/jobs.json and warms the next-due local model so a cron tick
4	  # never pays the cold-load stall. 10 min comfortably covers the default
5	  # 15-min lead window the script selects on.
6	  [int]$PrewarmEveryMinutes = 10,
7	  # GEPA weekly anchor -- stages a Hermes skill-optimization candidate fro
... [+5947 chars truncated]

### User | 2026-06-15T00:40:42.730Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * hermes-proxy-ensure.mjs -- idempotent keepalive for the Hermes OpenAI proxy
4	 * (HERMES-BRIDGE-MS0/U-PROXY-ENSURE).
5	 *
6	 * scripts/ask-hermes.mjs talks to `hermes proxy` on :8645. That proxy is not a
7	 * service -- if it is down, the bridge silently degrades to free Ollama. This
8	 * script makes the Hermes path reliably live: it checks the proxy, and if it is
... [+5806 chars truncated]

### User | 2026-06-15T00:40:42.796Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * hermes-cron-prewarm.mjs -- pre-load the Ollama model a Hermes cron job needs,
4	 * BEFORE its scheduled tick, so the local-model run never pays the cold-load stall.
5	 *
6	 * Hermes (C:/Users/<u>/AppData/Local/hermes/) runs scheduled cron jobs (morning
7	 * brief on gpt-oss:120b ~= 60GB, inbox sweep on gpt-oss:20b, weekly review on 120b).
8	 * On the Blackwell box 
... [+7049 chars truncated]

### Assistant | 2026-06-15T00:40:45.580Z

Now let me read the remaining hermes scripts and the skill-loop/router files in parallel.

### Assistant | 2026-06-15T00:40:45.995Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:46.350Z

[tool_use: Read]

### Assistant | 2026-06-15T00:40:46.752Z

[tool_use: Read]

### User | 2026-06-15T00:40:52.489Z

[tool_result] 1	#!/usr/bin/env node
2	// hermes-skill-gepa.mjs -- GEPA-lite: offline skill optimization from Hermes execution traces.
3	// Closes the P1 gap from ZULU-HERMES-ARTICLE-VERIFY-2026-06-09.md: local models fail unattended
4	// tool-chains; the articles' remedy is offline, trace-driven skill rewriting (GEPA pattern).
5	//
6	// Pipeline: Hermes cron traces (cron/output/<job>/*.md, Response/Error tails)
... [+11057 chars truncated]

### User | 2026-06-15T00:40:54.255Z

[tool_result] 1	#!/usr/bin/env node
2	// HERMES-MS1 — CLI orchestrator for the closed learning loop.
3	//
4	// Reads state/shared/skill-candidates.jsonl, clusters, gates, ships AUTO-PASS
5	// candidates as STAGING marker files under state/shared/specs/ (G5 gap-audit
6	// fix 2026-05-20 — was previously .claude/commands/, which published stubs as
7	// live skills), surfaces NEEDS-REVIEW for operator-dispatched r
... [+6703 chars truncated]

### User | 2026-06-15T00:40:54.670Z

[tool_result] 1	// RGS-PLANNING-LOOP-BRIDGE-MS0/U2 (2026-06-11, slot:tango)
2	// Per-task substrate-routing matrix: given a task + phase + context, decide the
3	// PRIMARY executor and emit the 5-substrate plan (Ollama / Obsidian / Hermes /
4	// Master-graph / PSN) with when/how/max-out for each. The "max out their
5	// capabilities" answer (U-SPEC-V2 section 4), made deterministic + testable.
6	//
7	// DEDUP: 
... [+6197 chars truncated]

### Assistant | 2026-06-15T00:40:57.695Z

Now let me read the wiki and specs files in parallel.

### Assistant | 2026-06-15T00:40:58.475Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:40:59.210Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:40:59.592Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:40:59.985Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:41:00.865Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:41:00.888Z

[tool_use: Glob]

### User | 2026-06-15T00:41:01.130Z

[tool_result] H:/prism/knowledge/wiki\code-tribal\learnings\hermes-app-incorporation-ms0-u-hermes-viz-roost.md
H:/prism/knowledge/wiki\code-tribal\learnings\hermes-app-incorporation-ms0-u-hermes-viz-roost-docreflect.md

### Assistant | 2026-06-15T00:41:01.240Z

[tool_use: Glob]

### User | 2026-06-15T00:41:02.890Z

[tool_result] H:/prism/knowledge/wiki\code-tribal\learnings\hermes-local-u-ollama-ctx-fix.md

### User | 2026-06-15T00:41:03.673Z

[tool_result] H:/prism/knowledge/wiki\architecture\hermes-app-viz-roost.md

### system

... [30 middle messages omitted -- see raw_file] ...

### User | 2026-06-15T00:42:21.721Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-496 of 820 total (35092 tokens, cap 25000). Call Read with offset=497 limit=496 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	# HERMES VAULT + OLLAMA ENFORCEMENT — BUILD PLAN (2026-06-13, slot:sierra)
2	
3	> Generated by the `hermes
... [+41915 chars truncated]

### Assistant | 2026-06-15T00:42:36.155Z

Now let me check the remaining helper files, proxy task installer, self-reflect script, and lib files.

### Assistant | 2026-06-15T00:42:36.535Z

[tool_use: Read]

### Assistant | 2026-06-15T00:42:37.608Z

[tool_use: Read]

### Assistant | 2026-06-15T00:42:38.108Z

[tool_use: Read]

### Assistant | 2026-06-15T00:42:38.468Z

[tool_use: Read]

### User | 2026-06-15T00:42:46.761Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Hermes Proxy',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) off install so this keepalive does not phase-lock onto
5	  # the other 5-min host tasks (Cleanup Orchestrator +60s, Fleet Reaper +210s,
6	  # Memory Pressure +60s). +150s lands it clear of those.
7	  [int]$StartOffsetSeconds = 150,
8	  [ValidateSet('xai','nous')]
9	  [string]$Provider = 
... [+5225 chars truncated]

### User | 2026-06-15T00:42:48.110Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/hermes-self-reflect-populater.mjs
3	// DOMAIN-GALAXY-DOCTRINE-MS1/U-GALAXY-MS1-B3-HMEMV06 (2026-05-27, slot:alpha):
4	// Weekly Hermes-reflects-on-own-memories populater. Reads past 7 days of
5	// memories from knowledge/memories/{feedback,reference,project}/*.md, groups
6	// by type, computes top-recurring keywords, writes a markdown digest at
7	// knowledge/mem
... [+2543 chars truncated]

### User | 2026-06-15T00:42:48.224Z

[tool_result] 1	// scripts/lib/hermes-workflow-planner.mjs
2	//
3	// Hermes Dynamic-Workflow Planner — the "coder brain" that makes Hermes (the
4	// PRISM fleet orchestrator) behave like a skilled Claude Code coder who reaches
5	// for Dynamic Workflows instead of hand-chaining 50 prompts.
6	//
7	// Source doctrine: 0xCodez, "How to master Dynamic Workflows in Claude Code:
8	// 6 patterns and 14 steps Anthropic
... [+3192 chars truncated]

### User | 2026-06-15T00:42:48.232Z

[tool_result] 1	// scripts/lib/hermes-frontier-utils.mjs
2	//
3	// U-HFR02..04 + U-HRP07 + U-HOC04 — pure-core helpers for the deeper
4	// Hermes frontier units. Five thin functions, one file (each <50 LOC; the
5	// 3x DRY rule is not yet hit per util — they share the rerank/score
6	// vocabulary but the inputs/outputs diverge enough that forced abstraction
7	// would be premature). See HERMES-OCTOPUS-COORDINAT
... [+2343 chars truncated]

### Assistant | 2026-06-15T00:42:50.965Z

Now check wiring status of the key hooks, the hermes-dream task installer, and any sync scripts.

### Assistant | 2026-06-15T00:42:51.732Z

[tool_use: Read]

### Assistant | 2026-06-15T00:42:52.534Z

[tool_use: Read]

### Assistant | 2026-06-15T00:42:53.736Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:42:54.900Z

[tool_use: Grep]

### User | 2026-06-15T00:43:15.524Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Hermes Dream-Cycle Synth',
3	  # Run nightly at 03:17 local — off-hour minute to avoid the :00/:30 fleet
4	  # collision per the cron-style off-minute discipline. Also avoids the daily-
5	  # context window which fires earlier in the morning.
6	  [string]$Time = '03:17',
7	  [switch]$DryRun,
8	  [switch]$RunNow,
9	  [switch]$Uninstall,
10	  [switch]$Interact
... [+8418 chars truncated]

### User | 2026-06-15T00:43:16.408Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Hermes Self-Reflect Weekly',
3	  # Sunday 20:53 local — off-minute discipline (avoid :00/:30 fleet collisions).
4	  # The B4 sister 'PRISM Weekly Synthesis' fires Sun 20:10 (LLM-based via
5	  # Ollama). This task fires 43 min later so the two weekly Hermes jobs don't
6	  # contend for the same memos/* I/O window. Both anchor on the same Sunday
7	  # UTC, so 
... [+9412 chars truncated]

### User | 2026-06-15T00:43:18.457Z

[tool_result] H:\prism\.claude\settings.json:820:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/wiki-precheck-inject.mjs",

### User | 2026-06-15T00:43:18.647Z

[tool_result] No matches found

### Assistant | 2026-06-15T00:43:24.703Z

Now check the actual wiring status of the key Hermes hooks in settings.json more precisely.

### Assistant | 2026-06-15T00:43:26.379Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:43:26.685Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:43:28.036Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:43:28.040Z

[tool_use: Glob]

### User | 2026-06-15T00:44:37.437Z

[tool_result] H:/prism/.claude/hooks\wiki-precheck-inject.mjs

### User | 2026-06-15T00:44:37.596Z

[tool_result] 820:            "command": "\"H:/.claude/bin/portable-node\" H:/prism/.claude/hooks/wiki-precheck-inject.mjs",

### User | 2026-06-15T00:44:37.602Z

[tool_result] H:/prism/scripts\generate-hermes-features.mjs

### User | 2026-06-15T00:44:37.613Z

[tool_result] H:/prism/.claude/hooks\obsidian-precheck-inject.mjs

### Assistant | 2026-06-15T00:44:39.712Z

Let me check the obsidian-precheck wiring in settings.json and confirm the hermes-brain vault structure exists.

### Assistant | 2026-06-15T00:44:40.493Z

[tool_use: Grep]

### User | 2026-06-15T00:44:41.685Z

[tool_result] No matches found

### Assistant | 2026-06-15T00:44:42.006Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:44:43.579Z

[tool_use: Grep]

### Assistant | 2026-06-15T00:44:44.226Z

[tool_use: Bash]

### User | 2026-06-15T00:44:46.381Z

[tool_result] 6:The installed app: **Nous Research Hermes** (`com.nousresearch.hermes.setup`), Electron GUI + Python agent at `C:/Users/wompu/AppData/Local/hermes/` (copied to `H:/hermes-install/AppData-Local-hermes`, 2.3GB incl regenerable caches). Built-in **native MCP client** (`skills/mcp/SKILL.md`) connecting stdio OR HTTP/StreamableHTTP, auto-registering discovered tools. 25 skill categories, `cron/` (emp
... [+824 chars truncated]

### User | 2026-06-15T00:44:58.776Z

[tool_result] MEMORY.md
USER.md
2026-06-13-charlie-quoting-maxed.md
2026-06-13-delta-cad-maxed.md
2026-06-13-echo-post-processors-maxed.md
2026-06-13-foxtrot-mill-maxed.md
2026-06-13-hotel-business-hr-maxed.md

### User | 2026-06-15T00:45:01.100Z

[tool_result] hermes-frontier-utils.mjs
hermes-frontier-utils.test.mjs
hermes-outcome-feedback.mjs
hermes-outcome-feedback.test.mjs
hermes-workflow-planner.mjs
hermes-workflow-planner.test.mjs

### Assistant | 2026-06-15T00:48:28.320Z

I now have all the material needed. Here is the complete factual inventory.

---

# PRISM <-> Hermes Integration — Complete Inventory

## Preliminary: Two meanings of "Hermes" in this codebase

**Layer 1 — Hermes Desktop App (external, NousResearch):** Electron GUI + Python agent at `C:/Users/wompu/AppData/Local/hermes/`. Runs at `:9120` (Web UI / kanban), exposes a native MCP client, uses OAuth-managed credentials (same Anthropic/Claude Max subscription as the PRISM fleet). Has its own `memories/*.md`, `state.db`, `config.yaml`, `SOUL.md`, cron scheduler. It is external process #8 — never claims a NATO slot.

**Layer 2 — Hermes-Zulu Galaxy (internal PRISM):** The BRAVO (builder) + ZULU (orchestrator) NATO slots, with doctrine at `H:/prism/mcp-server/src/engines/hermes-zulu/`. ZULU is the fleet meta-orchestrator, BRAVO builds engines and hooks. Most PRISM code named "hermes" operates in this layer, not the desktop app.

**Layer 3 — Hermes Proxy (:8645):** The Hermes desktop app's built-in `hermes proxy start` command spawns a local HTTP server on port 8645 that speaks the OpenAI `/v1` protocol and forwards to OAuth-managed upstream providers (xAI Grok or Nous Portal, per `--provider xai|nous`). The proxy is NOT a separate PRISM process — it is a Python subprocess of the Hermes app, launched via `hermes_cli.main proxy start`. PRISM reaches it via `ask-hermes.mjs`.

---

## 1. `ask-hermes.mjs` — Full Read

**Path:** `H:/prism/scripts/ask-hermes.mjs`

**What it does:** PRISM's Bash-invocable bridge to the Hermes proxy at `:8645`. Mirrors `ask-ollama.mjs` so the substrate router can route mechanical tasks to Hermes the same way it routes to Ollama. Five modes: `ask`, `summarize`, `explain`, `triage`, `classify`.

**The Hermes proxy `:8645`:** A local OpenAI-compatible HTTP server started by `hermes proxy start --provider <xai|nous>`. It attaches the user's real OAuth credential (managed by the Hermes desktop app) and forwards to the upstream. Default bearer token sent b
... [+27002 chars truncated]

### User | 2026-06-15T00:48:28.682Z

Stop hook feedback:
⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, but they don't exist on disk: dreams/2026-06-08.md. Before you finish: actually create them now, or correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)

### Assistant | 2026-06-15T00:48:38.915Z

I did not create any files. My report is a read-only inventory — I only read and analyzed existing files. The reference to `dreams/2026-06-08.md` in the report is a direct quote from the wiki entry `obsidian-hermes-context-accel-u-learn-revive01.md`, which documents that the revival actuator produced that file on 2026-06-08 when it was run. I am describing what that historical commit did, not claiming I created anything in this session.

The stop-verifier's concern is correct to flag, but the correction is: my summary does not claim I created `dreams/2026-06-08.md`. It says the revival actuator (commit b4a8ecd1a70e, slot:papa, 2026-06-08) produced it. That file is a historical artifact from June 8th and may or may not still exist on disk depending on whether dream files are retained — its existence or absence does not affect the accuracy of the inventory.

No files were created, modified, or deleted during this session. The report stands as written.
