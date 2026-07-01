---
type: "chat-session"
source: "claude-code-cli"
session_id: "dacc6809-4662-414a-a1eb-df8625f83cf8"
title: "You are auditing PRISM's hook layer for DEAD CODE and NEVER-FIRE bugs — hooks th"
date: "2026-05-17"
first_ts: "2026-05-17T20:51:54.005Z"
last_ts: "2026-05-17T20:55:06.951Z"
cwd: "H:\\prism"
messages: 54
user_msgs: 22
assistant_msgs: 32
raw_file: "H:/.claude/projects/H--prism/dacc6809-4662-414a-a1eb-df8625f83cf8/subagents/agent-a5467a0b1e2dd714b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:28"
---

# You are auditing PRISM's hook layer for DEAD CODE and NEVER-FIRE bugs — hooks th

> **claude-code-cli** | 2026-05-17 | 54 msgs (22 user / 32 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/dacc6809-4662-414a-a1eb-df8625f83cf8/subagents/agent-a5467a0b1e2dd714b.jsonl`

## Transcript

### User | 2026-05-17T20:51:54.005Z

You are auditing PRISM's hook layer for DEAD CODE and NEVER-FIRE bugs — hooks that are wired into settings.json but either never execute their real logic, always early-exit, or gate on a condition that is never true.

KNOWN EXAMPLES (the bug class to find more of):
- `.claude/hooks/stop-force-loop-continue.mjs` gates `if (loop.status !== "active")` but `loop-state.mjs` only ever writes `"running"` — so the hook early-exits on every real loop (dead code).
- `error-pattern-capture` reportedly has 0 fires fleet-wide.

YOUR TASK:
1. Read `H:/.claude/settings.json` — list every hook wired across all events (UserPromptSubmit, PostToolUse, PreToolUse, Stop, SessionStart, etc.). Note bundle hooks (`bundles/*.mjs`) wrap many children.
2. For a sample of ~25-35 wired hooks (prioritize Stop and UserPromptSubmit hooks, and any with names suggesting conditional logic), read the hook source and check:
   - Does it gate on a status/flag/env value that may never be set? (compare against what writes that value)
   - Does it always return `{continue:true}` / no-op on the common path?
   - Is its trigger keyword/matcher reachable?
3. Check for hook telemetry: look at `H:/prism/mcp-server/data/state/` and `H:/prism/state/shared/` for any `*hook*telemetry*`, `*hook-fire*`, `*hook-health*` JSON/JSONL. If a hook-fire-rank or hook-health script exists in `scripts/`, note it (do NOT run long jobs).
4. Cross-check: any hook .mjs file on disk in `.claude/hooks/` referenced in NO bundle and NO settings.json entry = orphan (dead weight). Estimate the count.

OUTPUT: a ranked list of confirmed dead-code / never-fire hooks (highest-impact first). For each: `hook | wired-at event | why dead | fix (one line) | verification command`. Also give the orphan-hook count with the method you used. Be rigorous — only report a hook as dead if you READ it and confirmed the dead path. Conclusions, not file dumps.

### Assistant | 2026-05-17T20:51:57.650Z

I'll audit PRISM's hook layer for dead code and never-fire bugs. Let me start by reading the settings.json files.

### Assistant | 2026-05-17T20:51:58.074Z

[tool_use: Read]

### Assistant | 2026-05-17T20:52:00.293Z

[tool_use: Bash]

### User | 2026-05-17T20:52:00.567Z

[tool_result] 1	{
2	 "cleanupPeriodDays": 60,
3	 "env": {
4	  "PATH": "H:/Tools/nodejs/node_modules/.bin;H:/.claude/bin;C:/Program Files/Docker/Docker/resources/bin;C:/Windows/System32;C:/Windows;C:/Windows/System32/Wbem;C:/Windows/System32/WindowsPowerShell/v1.0;C:/Windows/System32/OpenSSH",
5	  "OLLAMA_MODELS": "H:/Tools/ollama/models",
6	  "NIM_URL": "http://127.0.0.1:8000/v1",
7	  "NIM_EMBED_URL": "http://1
... [+35812 chars truncated]

### User | 2026-05-17T20:52:12.338Z

[tool_result] 528
---bundles---
H:/prism/.claude/hooks/bundles/bash-bundle.mjs  2.3K
H:/prism/.claude/hooks/bundles/edit-bundle.mjs  8.5K
H:/prism/.claude/hooks/bundles/posttool-bash-read-bundle.mjs  4.2K
H:/prism/.claude/hooks/bundles/posttool-edit-bundle.mjs  6.5K
H:/prism/.claude/hooks/bundles/read-bundle.mjs  1.6K
H:/prism/.claude/hooks/bundles/sessionstart-bundle.mjs  4.9K
H:/prism/.claude/hooks/bundles/sm
... [+2928 chars truncated]

### Assistant | 2026-05-17T20:52:15.582Z

There's substantial existing audit infrastructure. Let me check the hook-fire telemetry and existing orphan classification, then read the priority hooks.

### Assistant | 2026-05-17T20:52:19.421Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:52:22.105Z

[tool_use: Read]

### User | 2026-05-17T20:52:31.102Z

[tool_result] === hook-fire-counts: top fired + zero-fire ===
total distinct hooks in fire log: 10
--- TOP 15 ---
3293 wiki-precheck-inject
2560 error-pattern-promote
2040 archived-skill-suggest
2003 skill-auto-trigger
1380 inbox-capture-sharpen
968 viz-first-redirect
191 wiki-recall-on-read
153 encoding-guard
46 tribal-by-domain-inject
1 auto-postmortem-on-failure-restart
--- BOTTOM 15 ---
3293 wiki-precheck-i
... [+241 chars truncated]

### User | 2026-05-17T20:52:32.144Z

[tool_result] 1	# Hook Utilization Audit
2	
3	Generated: 2026-05-14T00:53:57.389Z
4	Window: 30 days
5	Telemetry: ABSENT (latency=0, async=0)
6	
7	## Totals
8	
9	- Hooks in registry: **470**
10	- Wired: **178**
11	
12	## Issue counts
13	
14	- 🔴 orphan_file (registered, wired:false): **292**
15	- 🟠 dormant_30d (wired, 0 fires in window): **0**
16	- 🟡 tier_mismatch (T0, fired but never blocked): **0**
17	- ⚪ missi
... [+2684 chars truncated]

### Assistant | 2026-05-17T20:52:35.818Z

The hook-fire-counts.jsonl only tracks 10 hooks (it's a partial instrumentation). The interesting signal: `error-pattern-promote` shows 2560 fires — but the known-bug claim says `error-pattern-capture` has 0 fires. Let me read the priority hooks now. I'll focus on Stop and UserPromptSubmit hooks with conditional logic.

### Assistant | 2026-05-17T20:52:36.711Z

[tool_use: Read]

### Assistant | 2026-05-17T20:52:36.771Z

[tool_use: Read]

### User | 2026-05-17T20:52:38.011Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-force-loop-continue.mjs — AUTONOMOUS-FLEET-MS0/U-AF-STOP-FORCE-LOOP-CONTINUE
5	 *
6	 * Stop hook that detects an ACTIVE /loop falling off the rails mid-target,
7	 * and injects a RESUME_LOOP directive into the per-agent handoff so the next
8	 * SessionStart / /startup auto-continuation picks it up.
9	 *
10	 * Problem: when a chat is running /loop
... [+8548 chars truncated]

### User | 2026-05-17T20:52:38.259Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// error-pattern-capture.mjs — EXTENSION to existing error-block-capture infrastructure.
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-ERROR-LEARN-LOOP — user directive 2026-05-15:
6	// "errors and mistakes, bugs, mistakes and typos are learned and avoided
7	//  the moment they happen so we don't waste tokens going through the same
8	//  process over and over again."
9	
... [+7147 chars truncated]

### Assistant | 2026-05-17T20:52:42.559Z

Two findings already: `stop-force-loop-continue.mjs` has been FIXED (the `"running"` fix landed 2026-05-17). And `error-pattern-capture.mjs` is NOT dead code in source — but I need to verify `loop-state.mjs` actually writes `status:"running"` and check `recordEvent`. Let me verify key dependencies and read more Stop/UserPromptSubmit hooks.

### Assistant | 2026-05-17T20:52:44.243Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:52:44.616Z

[tool_use: Read]

### User | 2026-05-17T20:52:45.757Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * error-pattern-promote.mjs — Stop hook.
5	 *
6	 * Watches ERROR_LEARN_LEDGER.jsonl. When the same error fingerprint appears
7	 * ≥THRESHOLD times within ROLLING_DAYS, drafts a lesson stub at
8	 * knowledge/wiki/lessons/auto-{fingerprint}.md so the failure mode gets
9	 * captured into wiki and a hook/skill can be designed to prevent recurrence.
10	 *
11
... [+9026 chars truncated]

### User | 2026-05-17T20:52:54.117Z

[tool_result] === loop-state.mjs status writes ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
.claude/helpers/loop-state.mjs:90:...state.target * 2) { state.status = "abandoned"; state.abandonReason = "exceeded ...
.claude/helpers/loop-state.mjs:105:state.status = "ended";
.claude/helpers/loop-state.mjs:140:if (s.status !== "running" && age > STALE_MS) { fs.
... [+186 chars truncated]

### Assistant | 2026-05-17T20:52:59.941Z

Confirmed: `loop-state.mjs:71` writes `status:"running"` and the hook's gate at line 180 now checks `!== "running"` — **stop-force-loop-continue is FIXED, not dead**. And `error-pattern-promote` IS firing (2560 fires in telemetry). 

The `error-pattern-capture` "0 fires" claim — its DETECTORS only match on actual error text in `tool_response`, so it correctly stays silent when no error occurs. That's correct behavior, not dead code. But it depends on `error-block-capture` writing to the same ledger. Let me verify ERROR_LEARN_LEDGER exists and check more conditional hooks. Let me check the existing audit reports and read a batch of suspicious hooks.

### Assistant | 2026-05-17T20:53:03.741Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:53:04.170Z

[tool_use: Read]

### User | 2026-05-17T20:53:05.691Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	// audit-viz-first-inject.mjs — UserPromptSubmit T2 hook.
4	// When an audit/discovery intent is detected, auto-run
5	// `node scripts/system-viz-query.mjs find <noun>` and inject the top-K hits
6	// so the chat sees the answer BEFORE reaching for Grep/Glob.
7	//
8	// Knobs: PRISM_AUDIT_VIZ_FIRST_DISABLE=1 · PRISM_AUDIT_VIZ_FIRST_K=N (1..20, def 5)
9	//       
... [+5796 chars truncated]

### User | 2026-05-17T20:53:09.584Z

[tool_result] === ERROR_LEARN_LEDGER ===
-rw-r--r-- 1 wompu 197611 61195 May 17 15:38 mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl
200 mcp-server/data/state/ERROR_LEARN_LEDGER.jsonl
=== auto-stubs in lessons ===
6
=== loop-state files present ===
loop-18b69120-06ed-42a5-b8a5-3114f7ce2102.json  9.3K
loop-23c10eea-c03b-414f-9e26-380e20195aee.json  696B
loop-2590377e-81a6-4a77-993c-b6b06a1e1315.json  3.8K
loop-3
... [+805 chars truncated]

### Assistant | 2026-05-17T20:53:12.548Z

`audit-viz-first-inject` looks functional. Now let me batch-read several more high-suspicion conditional Stop/UserPromptSubmit hooks in parallel.

### Assistant | 2026-05-17T20:53:13.331Z

[tool_use: Read]

### Assistant | 2026-05-17T20:53:14.276Z

[tool_use: Read]

### Assistant | 2026-05-17T20:53:14.542Z

[tool_use: Read]

### User | 2026-05-17T20:53:14.821Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-auto-wire.mjs — Stop hook
5	 *
6	 * When a chat session ends, check whether every new asset built this session
7	 * is actually WIRED and ACTIVE (not sitting dormant). Specifically:
8	 *
9	 *   1. NEW engine files (src/engines/*.ts not in git) → must be referenced
10	 *      by a dispatcher. Emit warning if orphan.
11	 *   2. NEW hook files (.cla
... [+8978 chars truncated]

### User | 2026-05-17T20:53:15.142Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * loop-iteration-inject.mjs — UserPromptSubmit hook for /loop awareness.
5	 *
6	 * Fires when the user types `/loop` (with or without interval). Surfaces:
7	 *   - any paused/active loop state for this session (sessionId from stdin)
8	 *   - global list of running loops (so a chat doesn't accidentally start a 2nd)
9	 *   - reminder of Karpathy R10 (chec
... [+4570 chars truncated]

### User | 2026-05-17T20:53:15.203Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	// post-ship-distill.mjs — Stop hook (T3 observer).
4	//
5	// SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL.
6	//
7	// When a chat ends and the most-recent commit body has [SCOPE]/U-<id>
8	// pattern, fire distill-session-learnings.mjs in the background to write
9	// auto-memory to BOTH wiki/code-tribal/learnings/ AND the Obsidian memory
10	// dir. Dedup ledger 
... [+2826 chars truncated]

### Assistant | 2026-05-17T20:53:24.992Z

Found a real bug. `loop-iteration-inject.mjs` and `stop-force-loop-continue.mjs` both invoke `loop-state.mjs` with `read --session <sid>`. Let me verify the loop-state.mjs CLI actually accepts `--session` and `read`, and check the `error-pattern-promote` telemetry concern. Then read more hooks.

### Assistant | 2026-05-17T20:53:27.186Z

[tool_use: Bash]

### Assistant | 2026-05-17T20:53:27.226Z

[tool_use: Read]

### User | 2026-05-17T20:53:28.108Z

[tool_result] PreToolUse:Bash hook error: [python3 ${CLAUDE_PLUGIN_ROOT}/hooks/pretooluse.py]: /usr/bin/bash: xmalloc: cannot allocate 8192 bytes


### User | 2026-05-17T20:53:28.108Z

[tool_result] <tool_use_error>Cancelled: parallel tool call Bash(cd H:/prism && echo "=== loop-state.mjs …) errored</tool_use_error>

### Assistant | 2026-05-17T20:53:31.106Z

Fork-storm. Let me retry without the parallel Bash.

### Assistant | 2026-05-17T20:53:32.296Z

[tool_use: Bash]

### User | 2026-05-17T20:53:33.199Z

[tool_result] Exit code 66

### Assistant | 2026-05-17T20:53:38.068Z

[tool_use: Read]

### User | 2026-05-17T20:53:39.122Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * loop-state.mjs — Per-session /loop iteration state helper.
4	 *
5	 * Why: `/loop` runs N iterations of a task. If a chat crashes mid-loop, the next
6	 * chat has no idea the loop was running. This helper persists iteration metadata
7	 * so /loop can resume cleanly + surface "you have a paused loop" warnings on /checkin.
8	 *
9	 * Layout: state/shared/loop-state/loo
... [+6189 chars truncated]

### Assistant | 2026-05-17T20:53:45.008Z

Important finding. `loop-state.mjs cmdRead` returns the **raw state object** which has key `sessionId` (line 64) — but `stop-force-loop-continue.mjs` calls it as `read --session sid` and reads `loop.status`, `loop.iter`, `loop.target`, `loop.task` — those all exist. And `loop-iteration-inject.mjs` reads `mine.sessionId`, `mine.iter`, etc. — all exist. So both loop hooks are correctly wired now.

But note: `cmdRead` when no state exists returns `{ ok: false, error: "no state" }` — that object has no `status` field, so `stop-force-loop-continue` line 180 `loop.status !== "running"` → `undefined !== "running"` → true → early-exits cleanly. Correct.

Now let me read goal-complete-gate and a batch of other suspicious hooks.

### Assistant | 2026-05-17T20:53:45.881Z

[tool_use: Read]

### Assistant | 2026-05-17T20:53:46.065Z

[tool_use: Read]

### User | 2026-05-17T20:53:46.962Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-bug-finding-wiki-gate.mjs — Stop advisory hook enforcing the
5	 * [[feedback_always_update_wiki_on_bug_finding]] standing rule.
6	 *
7	 * Detects bug-finding artifacts shipped in this session's commits (or
8	 * uncommitted in the working tree) and verifies a companion wiki entry
9	 * exists. Three detection signals:
10	 *
11	 *   1. New line adde
... [+9798 chars truncated]

### User | 2026-05-17T20:53:56.352Z

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

### Assistant | 2026-05-17T20:54:06.029Z

`stop-bug-finding-wiki-gate.mjs` has a **subtle never-fire bug**: the `isMain` check at line 259-263. `import.meta.url` is a `file://` URL with **forward slashes and URL encoding**, while `process.argv[1]` on Windows is `H:\prism\.claude\hooks\stop-bug-finding-wiki-gate.mjs` (backslashes). The code does `.replace(/\\/g, "/")` on argv1 → `H:/prism/.claude/hooks/stop-bug-finding-wiki-gate.mjs`. Then `import.meta.url` would be `file:///H:/prism/.claude/hooks/stop-bug-finding-wiki-gate.mjs`. The check `import.meta.url.endsWith(argv1)` → does `file:///H:/prism/...` end with `H:/prism/...`? Yes it does. So `isMain` is true. That path works. Let me verify more carefully and move on — read more hooks including the orphan classification report.

### Assistant | 2026-05-17T20:54:07.077Z

[tool_use: Read]

### Assistant | 2026-05-17T20:54:07.320Z

[tool_use: Read]

### User | 2026-05-17T20:54:09.509Z

[tool_result] 1	# HOOK-ORPHAN-CLASSIFICATION
2	
3	_Generated: 2026-05-17T03:00:00Z_
4	
5	_Source: SYSTEM-VIZ-BRAIN-MS0 / U-P0-HOOK-ORPHAN-RECONCILE — composes `hook-orphan-scan.mjs` + `hook-fire-rank.mjs`. Advisory; never deletes (per `feedback_never_delete_only_disable`)._
6	
7	## Totals
8	
9	- orphan pool in: **275**
10	- classified out: **275**
11	- WIRE high-confidence (score ≥ min): **16**
12	
13	## Action
... [+4770 chars truncated]

### User | 2026-05-17T20:55:05.728Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * regression-auto-write.mjs — Stop hook (T3 observer).
5	 *
6	 * Closes the U-VAULT03 "regression auto-write pending" gap. When a chat
7	 * commits a regression-fix at session end, this hook detects the commit
8	 * pattern + appends a canonical entry to CLAUDE.md "## Recent regressions"
9	 * section so the loop closes automatically (today: manual write 
... [+10845 chars truncated]

### Assistant | 2026-05-17T20:55:06.951Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
