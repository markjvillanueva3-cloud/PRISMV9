---
type: "chat-session"
source: "claude-code-cli"
session_id: "db273e77-fb5e-418e-b0e1-d7ef98b97236"
title: "Read-only investigation in the PRISM repo (H:/prism). Enumerate every hook that "
date: "2026-06-10"
first_ts: "2026-06-10T14:24:27.925Z"
last_ts: "2026-06-10T14:26:42.043Z"
cwd: "H:\\prism"
messages: 50
user_msgs: 22
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_8aad5adf-f68/agent-afb392b8f96f93212.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:29"
---

# Read-only investigation in the PRISM repo (H:/prism). Enumerate every hook that 

> **claude-code-cli** | 2026-06-10 | 50 msgs (22 user / 28 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/db273e77-fb5e-418e-b0e1-d7ef98b97236/subagents/workflows/wf_8aad5adf-f68/agent-afb392b8f96f93212.jsonl`

## Transcript

### User | 2026-06-10T14:24:27.925Z

Read-only investigation in the PRISM repo (H:/prism). Enumerate every hook that can BLOCK session end or tool dispatch (a TRUE block: emits decision:"block", continue:false, a non-empty stopReason, or "blocking session end" language).
Start points: the Stop and PreToolUse hook arrays in C:/Users/wompu/.claude/settings.json; hook sources in H:/prism/.claude/hooks/*.mjs and H:/prism/.claude/hooks/lib/*.py.
Known candidates to verify: the memory PRESSURE gate (reads env PRISM_PRESSURE_GATE; grep for PRISM_PRESSURE_GATE to find the file), scrutinize-before-stop.mjs, stop_on_failing_tests, stop_on_unwired_assets, stop_on_uncommitted_critical, precompact-pending-guard.mjs, goal-complete-gate.mjs, stop-close-own-bg-tasks.mjs, enforce-auto-compact.py.
For EACH real block: file path, what condition triggers it, whether it is a HARD block (settings continueOnError:false / actually returns block) or soft/advisory, its override env knob, and whether after-N-attempts it auto-passes (escape hatch). Quote the file:line for the block decision. Output a plain-text numbered list. Be exhaustive and cite file:line. Do NOT edit anything.

### Assistant | 2026-06-10T14:24:35.612Z

I'll systematically investigate all hooks that can block session end or tool dispatch in the PRISM repo. Let me start by examining the settings file and then traversing the hook sources.

### Assistant | 2026-06-10T14:24:36.481Z

[tool_use: Read]

### Assistant | 2026-06-10T14:24:36.486Z

[tool_use: Bash]

### Assistant | 2026-06-10T14:24:36.493Z

[tool_use: Bash]

### User | 2026-06-10T14:24:41.909Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-1452 of 1843 total (26960 tokens, cap 25000). Call Read with offset=1453 limit=1452 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	{
2	  "cleanupPeriodDays": 60,
3	  "env": {
4	    "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claud
... [+57753 chars truncated]

### User | 2026-06-10T14:24:47.106Z

[tool_result] total 7133
drwxr-xr-x 1 wompu 197611     0 Jun 10 09:24 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 07:40 ../
drwxr-xr-x 1 wompu 197611     0 Jun  8 03:35 .deprecated/
-rw-r--r-- 1 wompu 197611  9683 Apr 16 19:48 AGI_INFRA_PHASE_A_WIRING.md
-rw-r--r-- 1 wompu 197611  4092 Apr 16 16:56 HOOK-TYPE-GUIDE.md
-rw-r--r-- 1 wompu 197611 43473 May 29 23:13 HOOK_DIGEST.md
-rw-r--r-- 1 wompu 197611  2839 Apr 2
... [+2985 chars truncated]

### User | 2026-06-10T14:24:48.255Z

[tool_result] total 1049
drwxr-xr-x 1 wompu 197611     0 Jun  8 11:46 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 09:24 ../
drwxr-xr-x 1 wompu 197611     0 Jun  8 04:09 __pycache__/
drwxr-xr-x 1 wompu 197611     0 May 15 23:08 __tests__/
-rwxr-xr-x 1 wompu 197611 14186 Apr 16 16:56 _audit_engine_quality.py*
-rw-r--r-- 1 wompu 197611    20 Apr 16 16:56 _gen2.py
-rwxr-xr-x 1 wompu 197611 13043 Apr 16 16:56 _gen_mas
... [+3019 chars truncated]

### Assistant | 2026-06-10T14:24:51.772Z

I'll systematically investigate all blocking hooks in the PRISM repo. Let me search for the known candidates and examine the Stop and PreToolUse hook files.

### Assistant | 2026-06-10T14:24:52.206Z

[tool_use: Grep]

### Assistant | 2026-06-10T14:24:53.273Z

[tool_use: Glob]

### Assistant | 2026-06-10T14:24:53.588Z

[tool_use: Bash]

### User | 2026-06-10T14:24:55.358Z

[tool_result] .claude\hooks\precompact-pending-guard.mjs
.claude\hooks\scrutinize-before-stop.mjs
.claude\hooks\stop_on_failing_tests.mjs
.claude\hooks\stop_on_uncommitted_critical.mjs
.claude\hooks\stop_on_unwired_assets.mjs
.claude\hooks\goal-complete-gate.mjs
.claude\hooks\stop-close-own-bg-tasks.mjs

### User | 2026-06-10T14:25:05.592Z

[tool_result] H:/prism/.claude/hooks/lib/adaptive_optimizer.py
H:/prism/.claude/hooks/lib/agent-gate-check.py
H:/prism/.claude/hooks/lib/anomaly_detector.py
H:/prism/.claude/hooks/lib/auto-effort-detect.py
H:/prism/.claude/hooks/lib/auto_feature_selector.py
H:/prism/.claude/hooks/lib/cache_optimizer.py
H:/prism/.claude/hooks/lib/coordination_stats.py
H:/prism/.claude/hooks/lib/detect_cowork.py
H:/prism/.claude/
... [+650 chars truncated]

### User | 2026-06-10T14:25:06.124Z

[tool_result] Found 8 files
knowledge\memories\reference\reference_harness_hang_prevention.md
scripts\system-health\05-soft-config-tweaks.ps1
knowledge\memories\_index\MEMORY.md
knowledge\memories\_legacy-root\reference_harness_hang_prevention.md
prism-test-6d0595\knowledge\memories\reference\reference_harness_hang_prevention.md
prism-test-6d0595\.claude\hooks\commit-pressure-stop-gate.mjs
.claude\hooks\commit-
... [+54 chars truncated]

### Assistant | 2026-06-10T14:25:09.542Z

Let me read the key blocking hook files directly to examine their block logic.

### Assistant | 2026-06-10T14:25:09.762Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:09.768Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:09.773Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:09.945Z

[tool_use: Read]

### User | 2026-06-10T14:25:13.839Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * scrutinize-before-stop — Stop hook (UNIVERSAL ENFORCEMENT).
5	 *
6	 * Forces a strict 3-of-3 multi-reviewer scrutiny before the agent is allowed to
7	 * finish a task that produced code/file changes:
8	 *   - Codex CLI               (cross-vendor — auto-recorded by scrutiny-3way.mjs)
9	 *   - Claude reviewer agent A  (holistic — dispatched by the chat
... [+13532 chars truncated]

### User | 2026-06-10T14:25:13.854Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * goal-complete-gate.mjs
5	 *
6	 * Stop-hook HARD GATE on Anthropic's built-in `/goal` slash command.
7	 *
8	 * User directive (2026-05-13): "add the closeout-audit slash command to the
9	 * /goal slash command so the task cant be considered /goal complete until the
10	 * audit is ran".
11	 *
12	 * /goal is a built-in Anthropic command (no .md skill fil
... [+14077 chars truncated]

### User | 2026-06-10T14:25:13.880Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * precompact-pending-guard.mjs — Warn about pending work before compact
5	 *
6	 * Checks PENDING_GAP_ENGINES.json and GOAL_STACK.json for unfinished work
7	 * and injects a warning if compacting would lose important context.
8	 */
9	
10	import { readFileSync, existsSync } from 'node:fs';
11	
12	const PENDING_PATH = 'H:/prism/state/shared/PENDING_GAP_ENG
... [+1698 chars truncated]

### User | 2026-06-10T14:25:13.911Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-close-own-bg-tasks.mjs — "close your tool calls" enforcement (2026-05-30, slot golf)
5	 *
6	 * BLOCKING Stop hook that forces a chat to close its own run_in_background
7	 * Bash tasks before the turn ends. At Stop the turn's FOREGROUND tools have
8	 * already exited, so any bash.exe that is a still-alive DESCENDANT of THIS
9	 * chat's claude.exe 
... [+9901 chars truncated]

### Assistant | 2026-06-10T14:25:25.096Z

Now let me read the remaining known blocking hook candidates and search for environment variable knobs:

### Assistant | 2026-06-10T14:25:25.544Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:25.722Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:26.015Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:26.225Z

[tool_use: Read]

### User | 2026-06-10T14:25:28.905Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * stop_on_failing_tests.mjs — Stop Hook (SAFETY-CRITICAL, FAIL-CLOSED)
5	 *
6	 * Blocks Stop unless the project-wide test report is fresh AND clean.
7	 *
8	 * WHY FAIL-CLOSED: This is safety-critical CNC code. A bug ships
9	 * G-code that crashes a $200K machine, ruins a $50K aerospace part,
10	 * or hurts an operator. Earlier behavior was fail-open: mi
... [+9726 chars truncated]

### User | 2026-06-10T14:25:28.908Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * stop_on_unwired_assets.mjs — Stop Hook
5	 * ========================================
6	 *
7	 * BLOCKS session termination when newly-built assets are not yet
8	 * wired to their logical endpoints. This catches the "built it but
9	 * never wired it" pattern that creates orphan stagnation.
10	 *
11	 * Checks performed (fast, git-diff-scoped — does not s
... [+19050 chars truncated]

### User | 2026-06-10T14:25:29.151Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * stop_on_uncommitted_critical.mjs — Tier 6 Stop Hook
5	 * Prevents exit when CRITICAL-classified files have uncommitted changes.
6	 */
7	import fs from "node:fs";
8	import { execSync } from "node:child_process";
9	
10	const CRITICAL_PATTERNS = [
11	  "src/physics/constants.ts",
12	  "src/algorithms/Kienzle",
13	  "src/algorithms/Taylor",
14	  "src/engi
... [+1568 chars truncated]

### User | 2026-06-10T14:25:29.608Z

[tool_result] 1	#!/usr/bin/env python3
2	"""
3	ENFORCEMENT HOOK: Auto-Compact Trigger
4	Fires on PostToolUse for Write|Edit.
5	
6	Tracks source file edits. When thresholds are reached, injects a
7	system message telling Claude to run /compact NOW — not asking,
8	TELLING. This makes compaction automatic during autopilot execution.
9	
10	Thresholds:
11	  - 20 edits: inject "Run /compact soon after current unit"
1
... [+4644 chars truncated]

### Assistant | 2026-06-10T14:25:35.408Z

Let me search for additional blocking hooks in the PreToolUse array and check for other critical block gates:

### Assistant | 2026-06-10T14:25:36.871Z

[tool_use: Grep]

### Assistant | 2026-06-10T14:25:37.014Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:37.128Z

[tool_use: Read]

### Assistant | 2026-06-10T14:25:37.242Z

[tool_use: Read]

### User | 2026-06-10T14:25:42.165Z

[tool_result] Found 40 files limit: 40
.claude\hooks\gpu-vram-admission-guard.mjs
.claude\hooks\cross-session-orchestrator.mjs
.claude\hooks\__tests__\stop_on_unwired_assets.wiring.test.mjs
.claude\hooks\slot-context-bundle-inject.mjs
.claude\hooks\stop_on_hook_unregistration.mjs
.claude\hooks\stop_on_hook_unregistration.test.mjs
.claude\hooks\__tests__\precompact-auto-trigger.test.mjs
.claude\hooks\intake-quar
... [+1495 chars truncated]

### User | 2026-06-10T14:25:43.483Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * main-tree-write-block.mjs — PreToolUse(Edit | Write | MultiEdit) main-tree gate.
5	 *
6	 * Built for SLOT-WORKTREE-MS0/U-P1-MAINTREE-WRITE-BLOCK (P1-ROUTING).
7	 * Once the milestone's P3-CUTOVER has shipped 9 canonical worktrees
8	 * (H:/prism-slot-<name>) and each chat is bound to its slot worktree,
9	 * the integration tree H:/prism becomes READ-ON
... [+13067 chars truncated]

### User | 2026-06-10T14:25:45.726Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * file-claim-guard.mjs — PreToolUse hook for Edit | Write | MultiEdit
5	 *
6	 * Prevents two concurrent Claude chats from silently editing the same file.
7	 * Attempts to atomically claim the target file for this session; blocks the tool
8	 * call only when another LIVE session holds the claim. Expired claims are taken
9	 * over. Same-session re-edits r
... [+8324 chars truncated]

### User | 2026-06-10T14:25:46.221Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	// edit-bundle.mjs — single PreToolUse hook that runs all Edit/Write/MultiEdit
4	// hooks in parallel via Promise.all and aggregates results.
5	//
6	// Replaces the 24-hook Edit|Write|MultiEdit matcher in settings.json with one
7	// bundled invocation. Per-Edit wall time drops from ~24× sequential cold-starts
8	// to ~1× (slowest hook in the bundle) ~250ms.
9	
... [+8963 chars truncated]

### Assistant | 2026-06-10T14:25:59.708Z

Let me search for a few more critical blocking hooks and compile the comprehensive list:

### Assistant | 2026-06-10T14:26:00.198Z

[tool_use: Read]

### Assistant | 2026-06-10T14:26:00.636Z

[tool_use: Read]

### Assistant | 2026-06-10T14:26:00.699Z

[tool_use: Read]

### User | 2026-06-10T14:26:06.562Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * duplication-hard-block.mjs — PreToolUse hook (U-AWARE07)
5	 *
6	 * HARD BLOCK if attempting to create an asset that:
7	 * 1. EXACTLY matches an existing engine name in the engines index
8	 * 2. EXISTS in the cross-session asset registry (built by another chat)
9	 *
10	 * This is the final gate - blocks Write operations that would create duplicates.
11
... [+5963 chars truncated]

### User | 2026-06-10T14:26:06.715Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * pretool-memory-size-gate.mjs — U-MEMORY-COMPRESS-V2 (JULIETT-12CHAT-ALLOCATION-MS0).
5	 *
6	 * The DURABLE half of the MEMORY.md truncation fix. `memory-compress-v2.mjs`
7	 * compresses the index once; this PreToolUse:Edit gate prevents re-growth.
8	 *
9	 * MEMORY.md is auto-loaded into every chat at SessionStart; the Anthropic
10	 * harness silently 
... [+8662 chars truncated]

### User | 2026-06-10T14:26:06.775Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T0
3	/**
4	 * intake-quarantine-guard.mjs — PreToolUse T0 hook (ULTRACODE-SYNERGY-MS0 / Pattern 13)
5	 *
6	 * Closes PRISM's self-documented "ZERO PII gate on untrusted intake" gap
7	 * (CLAUDE.md §CLAUDE-FLOW TOOL POLICY, aidefence HARVEST item). Implements the
8	 * ultracode "quarantine pattern" (0xCodez step 13): untrusted public/external
9	 * content (email/web
... [+10692 chars truncated]

### Assistant | 2026-06-10T14:26:42.043Z

Now I have enough information. Let me compile the comprehensive list of all blocking hooks:

---

## BLOCKING HOOKS IN PRISM REPO — COMPLETE INVENTORY

**LEGEND:**
- **HARD BLOCK** = settings.json `continueOnError:false` OR returns `decision:"block"` with `continue:false`
- **SOFT BLOCK** = advisory/warning, does not prevent tool execution
- **ESCAPE HATCH** = env knob or attempt counter

---

### **STOP HOOK BLOCKS** (5 hooks)

1. **scrutinize-before-stop.mjs** (H:/prism/.claude/hooks/scrutinize-before-stop.mjs)
   - **Trigger:** Stop event, when session has file changes
   - **Block type:** HARD (decision:"block")
   - **Condition:** Code/file changes detected + no recent 3-of-3 multi-reviewer scrutiny (Codex + Claude reviewer A + Claude reviewer B)
   - **Escape hatch:** MAX_BLOCKS_PER_SESSION=3 (auto-passes after 3 block attempts); PRISM_ALLOW_UNWIRED=1 bypass
   - **Override env:** None (hard coded ceiling)
   - **File:line:** Lines 279-282 (block decision emission)

2. **goal-complete-gate.mjs** (H:/prism/.claude/hooks/goal-complete-gate.mjs)
   - **Trigger:** Stop event, when `/goal` slash command was invoked
   - **Block type:** HARD (decision:"block")
   - **Conditions:** (a) close-out audit report missing/unreadable; (b) audit stale (>2h default); (c) candidates surfaced but untriaged in commits/CLOSE-OUT-DEFERRED.md
   - **Escape hatch:** PRISM_GOAL_GATE_AUDIT_BYPASS=1 (logged); PRISM_GOAL_GATE_LOOP_ACCEPT_DISABLE=0 (accept if /loop target met)
   - **Override env:** PRISM_GOAL_GATE_DISABLE=1 (disables entirely); PRISM_GOAL_GATE_STALE_HRS=N (default 2); PRISM_GOAL_GATE_LOOP_ACCEPT_DISABLE=1
   - **File:line:** Lines 240-299 (block decisions for missing/stale/untriaged audit)

3. **stop_on_failing_tests.mjs** (H:/prism/.claude/hooks/stop_on_failing_tests.mjs)
   - **Trigger:** Stop event
   - **Block type:** HARD (continue:false)
   - **Conditions:** (a) test report missing; (b) report unparseable; (c) failing > 0; (d) passing < total (accounting error)
  
... [+8262 chars truncated]
