---
type: "chat-session"
source: "claude-code-cli"
session_id: "76a392af-6ede-4688-ba7e-5ef9ec1099cd"
title: "Review the skill file `H:\\PRISM\\.claude\\commands\\fleet-reaper.md` end-to-end (re"
date: "2026-05-14"
first_ts: "2026-05-14T14:39:15.934Z"
last_ts: "2026-05-14T14:41:29.052Z"
cwd: "H:\\PRISM"
messages: 18
user_msgs: 8
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-aa49d16be7e089a44.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Review the skill file `H:\PRISM\.claude\commands\fleet-reaper.md` end-to-end (re

> **claude-code-cli** | 2026-05-14 | 18 msgs (8 user / 10 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/76a392af-6ede-4688-ba7e-5ef9ec1099cd/subagents/agent-aa49d16be7e089a44.jsonl`

## Transcript

### User | 2026-05-14T14:39:15.934Z

Review the skill file `H:\PRISM\.claude\commands\fleet-reaper.md` end-to-end (read the WHOLE file). It is a new PRISM slash command `/fleet-reaper` that stands up a slot-aware orphan-process reaper pipeline. Weight your review toward COMPLETENESS and OPERATOR CLARITY — would a Claude instance (or operator) executing this skill do the right thing, in the right order, with no gaps?

Context — the pipeline's 4 backing files (all already built + scrutiny-passed):
- `H:\PRISM\scripts\fleet-reaper-sweep.mjs` — the sweep brain. Flags: `--once` (default), `--monitor-loop --interval SEC`, `--status`, `--dry-run`, `--json`, `--kill-after N`, `--age-floor SEC`, `--detach`, `--stop-event`. Exits 0/1/2.
- `H:\PRISM\.claude\helpers\process-slot-map.mjs` — PID→slot classifier.
- `H:\PRISM\.claude\hooks\fleet-reaper-stop.mjs` — Stop-hook arm.
- `H:\PRISM\.claude\helpers\install-fleet-reaper-task.ps1` — scheduled-task installer. Params: `-TaskName`, `-EveryMinutes`, `-StartOffsetSeconds`, `-DryRun`, `-RunNow`, `-Uninstall`. Requires an elevated shell.

Verify:
1. FRONTMATTER: compare against the conventions of sibling skills `H:\PRISM\.claude\commands\pick-build-close.md` and `H:\PRISM\.claude\commands\big-blob-hunt.md` — `name`, `description`, `type`, `model`, `effort`, `context`, `allowed-tools`, `triggers` (the RFC list form: event/matcher/score/action), `impact`. Is every field present and well-formed? Is `allowed-tools` correct (the skill uses Bash, Read, and the Monitor tool — anything missing)? Is the `triggers` keyword alternation sensible (will it surface for the right prompts)?
2. PROTOCOL COMPLETENESS: the 4-step protocol — does it actually match what the backing scripts support? Step 1 runs `--once --json`; Step 2 does `schtasks /Query` then the installer; Step 3 launches the Monitor with `--monitor-loop --interval 300`; Step 4 the verdict. Are the exact CLI invocations correct against the sweep script's real flags? Is anything claimed that the scripts don't do?
3. THE `
... [+1350 chars truncated]

### Assistant | 2026-05-14T14:39:19.761Z

I'll review the skill file end-to-end against its backing scripts and sibling skills.

### Assistant | 2026-05-14T14:39:20.196Z

[tool_use: Read]

### Assistant | 2026-05-14T14:39:20.630Z

[tool_use: Read]

### Assistant | 2026-05-14T14:39:20.891Z

[tool_use: Read]

### User | 2026-05-14T14:39:25.233Z

[tool_result] 1	---
2	name: fleet-reaper
3	description: Launch the slot-aware orphan-process reaper for the 7-chat fleet. Maps every running node/git/bash process to the chat slot that spawned it (chat-slots.json) and reaps orphans of crashed/dead chats — gated by a confirm-after-N-ticks rule so a live chat's process is never killed. Runs an immediate sweep, ensures the durable 5-min scheduled task, and launche
... [+8319 chars truncated]

### User | 2026-05-14T14:39:27.450Z

[tool_result] 1	---
2	name: pick-build-close
3	description: Macro loop — pick a unit, build it, close it out. Chains /pick-unit → build (whatever the chat does) → /close-out-audit → MILESTONE_PROGRESS regen → handoff. The canonical productivity loop for shipping pending units. Use when you want to ship the top devtools unit without manually chaining 4 skills.
4	trigger:
5	  autoSuggest:
6	    keywords: ["pick b
... [+5957 chars truncated]

### User | 2026-05-14T14:39:27.780Z

[tool_result] 1	---
2	name: big-blob-hunt
3	title: Big Blob Hunt — Git History Blob Size Audit
4	description: Scan git history for blobs above a size threshold; emit a candidates table with filter-repo / lfs-migrate / gc recommendations. Feeds U-GC-02 (history rewrite) decision-making and the GIT-TREE-DECISIONS ledger blast-radius section.
5	type: skill
6	model: sonnet
7	effort: low
8	context: development
9	all
... [+9333 chars truncated]

### Assistant | 2026-05-14T14:39:32.072Z

Now let me read the 4 backing scripts to cross-check every claim.

### Assistant | 2026-05-14T14:39:32.545Z

[tool_use: Read]

### Assistant | 2026-05-14T14:39:33.450Z

[tool_use: Read]

### Assistant | 2026-05-14T14:39:33.902Z

[tool_use: Read]

### Assistant | 2026-05-14T14:39:34.940Z

[tool_use: Read]

### User | 2026-05-14T14:39:43.374Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fleet-reaper-sweep.mjs — slot-aware orphan process reaper for the 7-chat fleet.
4	 *
5	 * PRISM runs up to 7 concurrent Claude chats (alpha..foxtrot + golf). Each chat
6	 * spawns node.exe (hooks/helpers/MCP), bash.exe (the Bash tool), and git.exe
7	 * children. When a chat crashes or is closed WITHOUT firing its Stop hooks those
8	 * children are orphaned — they p
... [+37607 chars truncated]

### User | 2026-05-14T14:39:44.365Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * process-slot-map.mjs — map running node/git/bash processes to the PRISM chat
4	 * slot (alpha..foxtrot+golf) that spawned them, via process ancestry.
5	 *
6	 * Consumed by:
7	 *   - scripts/fleet-reaper-sweep.mjs      (the slot-aware orphan reaper)
8	 *   - .claude/hooks/fleet-reaper-stop.mjs (prompt sweep when a chat ends)
9	 *
10	 * Why this exists: PRISM already
... [+27961 chars truncated]

### User | 2026-05-14T14:39:45.406Z

[tool_result] 1	param(
2	  [string]$TaskName = 'PRISM Fleet Reaper',
3	  [int]$EveryMinutes = 5,
4	  # Phase offset (seconds) for the trigger anchor. PRISM already runs the
5	  # 5-min "Cleanup Orchestrator" + "Memory Pressure Auto-Relief" tasks, both
6	  # anchored ~+60s from their install. Defaulting this reaper to +210s lands it
7	  # on the half-cycle between them instead of phase-locking onto the same busy
... [+7660 chars truncated]

### User | 2026-05-14T14:39:49.829Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * fleet-reaper-stop.mjs — Stop-hook arm of the slot-aware orphan reaper.
5	 *
6	 * When any of the 7 concurrent chats ends, kick a slot-aware sweep so the
7	 * just-ended chat's orphan node/git/bash processes get noticed promptly instead
8	 * of waiting up to ~5 min for the next scheduled-task / Monitor tick. A chat
9	 * that crashes or is closed withou
... [+6759 chars truncated]

### Assistant | 2026-05-14T14:41:29.052Z

Now I have everything I need. Let me cross-check every claim in the skill file against the backing scripts.

## Code Review: `/fleet-reaper` skill file

**File reviewed:** `H:\PRISM\.claude\commands\fleet-reaper.md` (159 lines)
Cross-checked against all 4 backing scripts end-to-end.

---

### P0 — Critical (must fix)

**P0-1 — Step 2 Bash invocation will hard-fail: `2>$null` is PowerShell syntax in a `bash` block (line 86)**
```bash
schtasks /Query /TN "PRISM Fleet Reaper" 2>$null
```
This is fenced as `bash`, and the executing Claude runs Bash-tool commands through bash. In bash, `2>$null` redirects stderr to a *file literally named `null`* (creating a stray `null` file in the repo root) — it does **not** suppress stderr. The installer's own help text (line 141 of the ps1) and PRISM's environment guidance both use POSIX redirection elsewhere. Fix: `2>/dev/null` — or, since the skill needs the *exit code* not the output, drop the redirect entirely and branch on `$?`. As written, Step 2's "if the task does not exist" decision is made on a command whose stderr handling is broken and which litters the tree. (`H:\PRISM\.claude\commands\big-blob-hunt.md` correctly uses `2>&1` in its bash blocks — this file diverged.)

**P0-2 — Step 3 Monitor `command` is missing the `--dry-run` propagation, so `--dry-run $ARGUMENTS` silently arms a *killing* monitor (lines 64, 103)**
Line 64 promises: `--dry-run` "still ensures task + Monitor." But the Step 3 Monitor command is hardcoded:
```
node H:/prism/scripts/fleet-reaper-sweep.mjs --monitor-loop --interval 300
```
There is no `--dry-run` in it, and the protocol body never tells the executing Claude to append `--dry-run` to the Monitor command when the user passed `--dry-run`. Result: a user who runs `/fleet-reaper --dry-run` expecting a no-kill burn-in gets a **live, process-killing** persistent Monitor. The sweep script *does* support `--monitor-loop --dry-run` together (parseArgs has no mutual-exclusion between them; `runSweep` h
... [+12859 chars truncated]
