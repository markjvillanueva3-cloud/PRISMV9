---
type: "chat-session"
source: "claude-code-cli"
session_id: "e648c936-3dfa-4a7c-aedb-4efebd2980b0"
title: "Map the PRISM hook system as it relates to the session lifecycle. Search breadth"
date: "2026-05-14"
first_ts: "2026-05-14T13:16:05.391Z"
last_ts: "2026-05-14T13:18:54.884Z"
cwd: "H:\\prism"
messages: 45
user_msgs: 20
assistant_msgs: 25
raw_file: "H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-ad7ba98c1d6f97a1d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Map the PRISM hook system as it relates to the session lifecycle. Search breadth

> **claude-code-cli** | 2026-05-14 | 45 msgs (20 user / 25 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/e648c936-3dfa-4a7c-aedb-4efebd2980b0/subagents/agent-ad7ba98c1d6f97a1d.jsonl`

## Transcript

### User | 2026-05-14T13:16:05.391Z

Map the PRISM hook system as it relates to the session lifecycle. Search breadth: very thorough.

1. Read `H:/.claude/settings.json` and `H:/prism/.claude/settings.json` (and any settings.local.json). For each hook event chain — SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, Stop, PreCompact — list every hook entry IN ORDER, with its script path and a one-line purpose.

2. Read the actual hook scripts under `H:/prism/.claude/hooks/` for any whose name relates to: session start/boot, handoff, checkin, pick/unit selection, precompact/compact, awareness injection, scrutiny, close-out, build-state, milestone, skill-auto-trigger, claude-brief, inventory. For each, note: what it READS, what it WRITES/INJECTS, what it GATES/BLOCKS, and any env-var knobs.

3. Identify and report explicitly:
   (a) which hooks ALREADY auto-discover tools/skills/counts dynamically vs which HARDCODE references or numbers,
   (b) redundant or overlapping hooks (same data injected twice, etc.),
   (c) gaps where a session-lifecycle stage (startup → work → checkin → precompact → compact → handoff → stop) has weak or no hook support,
   (d) bundling — note stop-bundle.mjs / sessionstart-bundle.mjs and what they fold in.

Report as a structured markdown summary. Be concise, cite file:line where useful. Do NOT edit anything. Your final message is the only thing returned to me — make it a complete, self-contained report.

### Assistant | 2026-05-14T13:16:10.846Z

I'll map the PRISM hook system across the session lifecycle. Let me start by reading the settings files and then the hook scripts.

### Assistant | 2026-05-14T13:16:11.007Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:11.219Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:11.642Z

[tool_use: Bash]

### Assistant | 2026-05-14T13:16:11.805Z

[tool_use: Bash]

### User | 2026-05-14T13:16:21.959Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	    "NIM_URL": "http://127.0.0.1:8000/v1",
7	    "NIM_EMBED_URL":
... [+31285 chars truncated]

### User | 2026-05-14T13:16:23.520Z

[tool_result] 1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	    "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	    "NIM_URL": "http://127.0.0.1:8000/v1",
7	    "NIM_EMBED_URL":
... [+43138 chars truncated]

### User | 2026-05-14T13:16:29.635Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ChildItem: command not found
/usr/bin/bash: line 1: Select-Object: command not found

### User | 2026-05-14T13:16:29.636Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(Get-ChildItem -Path "H:/prism/.claude" -…) errored</tool_use_error>

### Assistant | 2026-05-14T13:16:32.606Z

I have the two main settings files. Now let me search for the hook scripts to analyze their behavior. Let me start by exploring the hooks directory structure and reading key scripts.

### Assistant | 2026-05-14T13:16:32.824Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:16:33.605Z

[tool_use: Glob]

### Assistant | 2026-05-14T13:16:33.610Z

[tool_use: Glob]

### User | 2026-05-14T13:16:40.434Z

[tool_result] .claude\hooks\bundles\lib\hook-runner.mjs
.claude\hooks\bundles\lib\obsidian-cache.mjs
.claude\hooks\bundles\lib\ollama-fuse.mjs
.claude\hooks\bundles\posttool-bash-read-bundle.mjs
.claude\hooks\bundles\read-bundle.mjs
.claude\hooks\bundles\sessionstart-bundle.mjs
.claude\hooks\bundles\smoke-test.mjs
.claude\hooks\bundles\stop-bundle.mjs
.claude\hooks\bundles\posttool-edit-bundle.mjs
.claude\hooks
... [+62 chars truncated]

### User | 2026-05-14T13:16:40.453Z

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

### User | 2026-05-14T13:16:42.123Z

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

### Assistant | 2026-05-14T13:16:44.255Z

Now let me read the key bundle files and critical session-related hooks:

### Assistant | 2026-05-14T13:16:44.883Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:45.104Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:45.374Z

[tool_use: Read]

### Assistant | 2026-05-14T13:16:45.548Z

[tool_use: Read]

### User | 2026-05-14T13:16:49.747Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	// sessionstart-bundle.mjs — single SessionStart hook for the context-injector /
4	// non-critical SessionStart hooks.
5	//
6	// Why: SessionStart had ~32 hooks, each a fresh node.exe at session start
7	// (≈3-5 s of cold-start fan-out before the session is usable). This bundle
8	// absorbs only the ~19 pure context-injectors / convenience hooks. The
9	// ~13 
... [+4484 chars truncated]

### User | 2026-05-14T13:16:50.075Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	// edit-bundle.mjs — single PreToolUse hook that runs all Edit/Write/MultiEdit
4	// hooks in parallel via Promise.all and aggregates results.
5	//
6	// Replaces the 24-hook Edit|Write|MultiEdit matcher in settings.json with one
7	// bundled invocation. Per-Edit wall time drops from ~24× sequential cold-starts
8	// to ~1× (slowest hook in the bundle) ~250ms.
9	
... [+5169 chars truncated]

### User | 2026-05-14T13:16:49.910Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	// stop-bundle.mjs — single Stop hook that runs the NON-BLOCKING Stop trackers.
4	//
5	// Why: the Stop event has ~30 `*`-matched hooks; each fires a fresh node.exe at
6	// every turn-end (≈30-spawn burst, ×N concurrent chats). This bundle absorbs
7	// only the ~14 trackers / sync / cleanup hooks that never block a Stop — the
8	// ~16 HARD-BLOCK gates (`stop_o
... [+4752 chars truncated]

### User | 2026-05-14T13:16:50.969Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T1
3	// bash-bundle.mjs — single PreToolUse hook for Bash. Replaces the 6-hook
4	// Bash matcher in settings.json with one bundled invocation.
5	
6	import { runBundle, readStdin, emit } from "./lib/hook-runner.mjs";
7	
8	const HOOK_BASE = "H:/prism/.claude/hooks";
9	const HELPER_BASE = "H:/prism/.claude/helpers";
10	
11	const BASH_HOOKS = [
12	  { path: `${HELPER_B
... [+1660 chars truncated]

### Assistant | 2026-05-14T13:17:00.365Z

Now let me read some critical session-lifecycle hooks to understand their behavior patterns:

### Assistant | 2026-05-14T13:17:00.366Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:00.786Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:01.023Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:01.365Z

[tool_use: Read]

### User | 2026-05-14T13:17:05.913Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * session-start-goal-inject.mjs — hook_session_goal_synthesis (PP-0.18 U-AGI1)
5	 *
6	 * Fires on SessionStart. Reads SYNTHESIZED_GOALS.json (written by
7	 * session-end-goal-synthesis.mjs on previous session's Stop) and injects
8	 * the top-3 actionable goals as session context IF awareness ≥0.80.
9	 *
10	 * Awareness is read from SVI_LATEST.json (psi_
... [+2589 chars truncated]

### User | 2026-05-14T13:17:06.398Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * roadmap-resume.mjs — SessionStart hook
5	 *
6	 * Shows where to resume based on merged checkpoints from all sessions.
7	 * Multi-chat aware: reads all session checkpoints + merged position.
8	 */
9	
10	import { readFileSync, existsSync, readdirSync } from 'fs';
11	import { join } from 'path';
12	
13	const PRISM_ROOT = 'H:/prism';
14	const CHECKPOINT_D
... [+2329 chars truncated]

### User | 2026-05-14T13:17:06.713Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * build-state-inject.mjs — UserPromptSubmit + SessionStart hook.
5	 *
6	 * Permanent-memory anchor for "what's already built / what needs wiring /
7	 * what's still pending / what's awaiting frontend merge". Reads the
8	 * compact BUILD_STATE.json snapshot generated by
9	 * scripts/build-state-snapshot.mjs and injects a token-bounded summary
10	 * (≤500
... [+3161 chars truncated]

### User | 2026-05-14T13:17:07.096Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * inventory-check-guard.mjs — UserPromptSubmit hook (U-AWARE02, refactored H9 + saturation arm).
5	 *
6	 * Detects build/create/audit intent in user messages and injects current
7	 * PRISM inventory counts as mandatory context. When the user is asking to
8	 * create assets in a saturated category, emit a saturation warning per the
9	 * U-AWARE02 spec's 
... [+3302 chars truncated]

### Assistant | 2026-05-14T13:17:12.365Z

Now let me read a few more critical hooks for precompact, handoff, and close-out:

### Assistant | 2026-05-14T13:17:12.817Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:13.446Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:14.172Z

[tool_use: Read]

### Assistant | 2026-05-14T13:17:14.179Z

[tool_use: Read]

### User | 2026-05-14T13:17:20.391Z

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
... [+3110 chars truncated]

### User | 2026-05-14T13:17:21.125Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * skill-auto-trigger.mjs — UserPromptSubmit hook (Phase D.2 of DEV-VELOCITY-AUTOTRIGGER-MS0).
5	 *
6	 * Reads `knowledge/wiki/architecture/_skill-triggers.jsonl` (the stage-22 extract
7	 * of every skill's `triggers:` frontmatter — see Phase D.3). For each UserPromptSubmit
8	 * event, scores the prompt against every trigger and emits top-K suggestions a
... [+3486 chars truncated]

### User | 2026-05-14T13:17:21.414Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * close-out-audit-suggest.mjs
5	 *
6	 * UserPromptSubmit advisory hook. Fires when the user mentions close-out
7	 * keywords ("close out", "envelope drift", "stale milestones", "shipped
8	 * but pending", etc.) and surfaces:
9	 *   - the count of pending close-out candidates from the most recent audit
10	 *   - the freshness of CLOSE-OUT-CANDIDATES.json
... [+2336 chars truncated]

### User | 2026-05-14T13:17:21.951Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * precompact-handoff.mjs — Smart PreCompact Handoff Writer
4	 *
5	 * Replaces the old dumb PreCompact hook that hardcoded a useless RESUME.
6	 *
7	 * Logic:
8	 *   1. Check if a recent handoff exists for this terminal with a meaningful RESUME
9	 *      (written by /precompact within the last 5 minutes) → preserve it
10	 *   2. If no meaningful RESUME exists, generate
... [+3350 chars truncated]

### Assistant | 2026-05-14T13:18:54.884Z

Now I have enough information to compile a comprehensive report. Let me generate the structured markdown summary.

---

# PRISM Hook System Session Lifecycle Mapping

## Executive Summary

The PRISM hook system spans **6 lifecycle stages** (SessionStart → UserPromptSubmit → PreToolUse → PostToolUse → PreCompact → Stop) with **~180+ hooks** across settings files, bundles, and helpers. The system exhibits **significant bundling** (sessionstart-bundle, stop-bundle, edit-bundle, bash-bundle) to reduce cold-start overhead, **dynamic discovery** patterns in critical hooks, and **strategic redundancy** for critical gates.

---

## Part 1: Hook Chain Registry

### SessionStart (H:/.claude/settings.json + H:/prism/.claude/settings.json)

Both settings files define **identical SessionStart chains** with **32 individual hooks** plus **1 bundled entry** (sessionstart-bundle.mjs):

**Individual critical hooks (13)** — must stay separate for safety:
1. `session-id-pin.mjs` (timeout 1500) — Pin session UUID to state
2. `settings-mirror-guard.mjs` (2000) — Verify H:/prism/.claude/settings.json mirrors H:/.claude
3. `portable-node-guard.mjs` (5000) — Validate portable Node.js binary
4. `verify-hook-refs.mjs` (5000) — Check all hook paths are live
5. `portable-python-guard.mjs` (5000) — Validate portable Python
6. `multi-computer-awareness.mjs` (3000) — Detect concurrent sessions across machines
7. `ollama-autostart.mjs` (5000) — Start local Ollama if needed
8. `nim-autostart.mjs` (5000) — Start NIM LLM service if needed
9. `plugin-path-fixer.mjs` (3000) — Repair plugin symlinks
10. `git-health-guard.mjs` (8000) — Scan stale git locks, validate .git
11. `git-sync-fetch.mjs` (5000) — Fetch from origin (supervised)
12. `dotclaude-junctions-guard.mjs` (5000) — Validate junction symlinks
13. `session-start-zombie-reap.mjs` (8000) — Kill stale node processes

**sessionstart-bundle.mjs (19 sub-hooks, timeout 3000)** — Bundled context injectors:
- Core awareness: `ai-command-awareness.mjs`,
... [+26819 chars truncated]
