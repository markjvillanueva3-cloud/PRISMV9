---
type: "chat-session"
source: "claude-code-cli"
session_id: "0e5669d2-0f99-48ce-941d-0eac73b5624f"
title: "Review U-VAULT-MAINT-CRON (PRISM, slot:sierra) — two new PowerShell scheduled-ta"
date: "2026-06-08"
first_ts: "2026-06-08T16:27:48.272Z"
last_ts: "2026-06-08T16:29:17.860Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a785b39492f42ec82.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:06"
---

# Review U-VAULT-MAINT-CRON (PRISM, slot:sierra) — two new PowerShell scheduled-ta

> **claude-code-cli** | 2026-06-08 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/0e5669d2-0f99-48ce-941d-0eac73b5624f/subagents/agent-a785b39492f42ec82.jsonl`

## Transcript

### User | 2026-06-08T16:27:48.272Z

Review U-VAULT-MAINT-CRON (PRISM, slot:sierra) — two new PowerShell scheduled-task installers + a node:test lint. Files:
1. `H:/prism/.claude/helpers/install-vault-promotion-cron.ps1` — registers "PRISM Vault Memory Promotion Cron" running `promote-memory-to-wiki.mjs --apply --backlink` daily 02:47.
2. `H:/prism/.claude/helpers/install-vault-rot-sentinel-cron.ps1` — registers "PRISM Vault Rot Sentinel Cron" running `vault-rot-sentinel.mjs --write` daily 00:38.
3. `H:/prism/.claude/helpers/install-vault-crons.test.mjs` — 13 structural lint tests (passing).

CRITICAL CONTEXT: the operator has 47 PRISM scheduled tasks DISABLED during a HW/drive migration and said do NOT re-enable until they confirm. So these installers must SHIP but NOT auto-arm. They clone the verified sibling install-wiki-tribal-audit-task.ps1 pattern and add a -Disabled switch (registers then Disable-ScheduledTask) + a migration-freeze header.

Read all three. Verify:
1. SAFETY: does running with -Disabled actually leave the task unable to fire? Does the default (no -Disabled) register an ENABLED task that WOULD fire 02:47/00:38 — i.e. is the operator-must-opt-in contract real, or could it silently arm?
2. Are these current-user S4U (NOT SYSTEM / not elevated)? The target scripts only write into knowledge/ — is that principal correct + minimal?
3. Do the cron actions invoke the right scripts with correct flags (promote --apply --backlink; rot --write)? Is the knob-disable env-check correct?
4. Idempotency: unregister-before-register? Any way a double-install corrupts state?
5. Do the two times collide with each other or with the documented sibling crons (wiki-tribal 00:08, fleet-reaper +210s)?
6. Are the lint tests REAL (assert the safety invariants such that a regression — e.g. removing the -Disabled path or switching to SYSTEM — would FAIL them)?

First line MUST be 'VERDICT: PASS' or 'VERDICT: FAIL'. Then BLOCKER: lines, then ≤5 notes. If unsure, FAIL.

### Assistant | 2026-06-08T16:27:59.841Z

I'll review the three files. Let me read all of them, plus the sibling pattern they claim to clone and the target scripts.

### Assistant | 2026-06-08T16:28:01.113Z

[tool_use: Read]

### Assistant | 2026-06-08T16:28:01.298Z

[tool_use: Read]

### Assistant | 2026-06-08T16:28:01.777Z

[tool_use: Read]

### Assistant | 2026-06-08T16:28:02.394Z

[tool_use: Read]

### User | 2026-06-08T16:28:05.297Z

[tool_result] 1	# install-vault-promotion-cron.ps1 — OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON
2	# Register a durable Windows Scheduled Task that runs the Memory->Wiki promotion
3	# (promote-memory-to-wiki.mjs) nightly. Closes the "promotion runs only by hand"
4	# gap from the 2026-06-08 vault audit (the engine + script work but were never
5	# scheduled, so durable memories never auto-graduated to the wiki).
6	#

... [+5101 chars truncated]

### User | 2026-06-08T16:28:07.152Z

[tool_result] 1	# install-vault-rot-sentinel-cron.ps1 — OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON
2	# Register a durable Windows Scheduled Task that runs the vault-rot sentinel
3	# (vault-rot-sentinel.mjs --write) daily. Closes the "rot-sentinel runs only by
4	# hand" gap from the 2026-06-08 vault audit (it detects stale/orphaned/rotting
5	# notes but its report was 2 days stale because nothing scheduled it).
6	#
... [+4227 chars truncated]

### User | 2026-06-08T16:28:07.387Z

[tool_result] 1	// .claude/helpers/install-vault-crons.test.mjs
2	//
3	// OBSIDIAN-VAULT-OPS / U-VAULT-MAINT-CRON — structural lint for the two vault
4	// scheduled-task installers. PowerShell installers aren't unit-testable in a JS
5	// runner, so this asserts the load-bearing invariants that make them SAFE during
6	// the HW-migration freeze and correct as cron registrars:
7	//   - both files exist on disk
8	
... [+3678 chars truncated]

### User | 2026-06-08T16:28:07.649Z

[tool_result] 1	# install-wiki-tribal-audit-task.ps1 — U-VICTOR-A3
2	# Register a durable Windows Scheduled Task that regenerates the wiki<->tribal
3	# audit + per-domain breakdown every 24h. Closes the audit-staleness gap (was
4	# 5 days stale when victor opened the audit 2026-05-27).
5	#
6	# Pattern mirrors install-fleet-reaper-task.ps1 (fleet-reaper +210s phase).
7	# Phase chosen at +480s to avoid contention
... [+3549 chars truncated]

### Assistant | 2026-06-08T16:28:12.493Z

Now let me verify the target scripts exist and check for any sibling cron time-collision concerns.

### Assistant | 2026-06-08T16:28:14.278Z

[tool_use: Bash]

### Assistant | 2026-06-08T16:28:15.499Z

[tool_use: Grep]

### User | 2026-06-08T16:28:18.887Z

[tool_result] .claude\helpers\install-tribal-promotion-cron.ps1:42:$trigger = New-ScheduledTaskTrigger -Daily -At "03:17:00"
.claude\helpers\install-hermes-dream-cycle-task.ps1:87:$trigger = New-ScheduledTaskTrigger -Daily -At $Time
.claude\helpers\install-slot-bridge-tasks.ps1:80:    $trigger = New-ScheduledTaskTrigger -Daily -At $Spec.DailyTime
.claude\helpers\install-handoff-prune-task.ps1:78:$dailyTrigger  
... [+941 chars truncated]

### User | 2026-06-08T16:28:21.856Z

[tool_result] -rwxr-xr-x 1 wompu 197611 15396 Jun  6 00:30 H:/prism/scripts/promote-memory-to-wiki.mjs*
-rwxr-xr-x 1 wompu 197611  8865 Jun  6 00:26 H:/prism/scripts/vault-rot-sentinel.mjs*
---NODEBIN---
-rwxr-xr-x 1 wompu 197611 82818704 Dec  2  2024 H:/Tools/nodejs/node.exe*

### Assistant | 2026-06-08T16:28:28.174Z

Both target scripts exist and match the action flags. Node binary exists. Now let me verify the full time-collision picture across all sibling crons, including the ones using parameterized `$At`/`$Time` defaults, and confirm the `-Disabled` semantics by examining whether `Disable-ScheduledTask` actually persists.

### Assistant | 2026-06-08T16:28:32.793Z

[tool_use: Bash]

### User | 2026-06-08T16:28:38.066Z

[tool_result] .claude/helpers/install-tribal-promotion-cron.ps1:42:$trigger = New-ScheduledTaskTrigger -Daily -At "03:17:00"
.claude/helpers/install-handoff-prune-task.ps1:5:  [string]$At = '03:47',
.claude/helpers/install-rgs-planner-task.ps1:9:  [string]$At = '3:13AM',
.claude/helpers/install-synergy-watch-task.ps1:81:try { $atParsed = [DateTime]::ParseExact($AtTime, 'HH:mm', $null) }
.claude/helpers/install-
... [+1046 chars truncated]

### Assistant | 2026-06-08T16:29:17.860Z

The full collision picture is clear. Let me verify the documented sibling times against the new ones. Existing daily times: 00:08 (wiki-tribal), 02:17/02:23 (combo-efficiency), 02:34/02:37/02:43 (slot-bridge), 03:13AM (rgs), 03:15 (revwalk), 03:17 (tribal-promotion + hermes-dream), 03:47 (handoff-prune), 23:01 (awareness-freshness). New: 00:38 (rot) and 02:47 (promotion). Neither collides with any existing time. Both new times are also distinct from each other.

One thing to confirm — whether `Disable-ScheduledTask` persistently disables (it sets task State to Disabled in the Task Scheduler store, which survives reboots and prevents trigger firing). That is the documented Windows behavior. The `-Disabled` path is sound.

Let me also confirm there's no `tribal-promotion` time collision nuance and check the rgs `3:13AM` doesn't normalize oddly — but these are 02:47/00:38, well clear. I have everything needed.

VERDICT: PASS

BLOCKER: (none)

Verification summary against the six required checks:

1. SAFETY — opt-in contract is REAL. `-Disabled` runs `Register-ScheduledTask` then `Disable-ScheduledTask -TaskName $TaskName` (lines 101-104 / 91-94), which sets the task's persistent State=Disabled in the Task Scheduler store — a disabled task does not fire its trigger, survives reboot, and requires `Enable-ScheduledTask` to arm. Correct. The default path (no `-Disabled`) registers an ENABLED task that WOULD fire at 02:47/00:38 — so the operator-must-opt-in contract holds ONLY if the operator runs with `-Disabled` (or doesn't run at all). The freeze header explicitly instructs `-Disabled` or do-not-run. This matches the operator's stated intent: ship the file, don't auto-arm. The installer is never auto-invoked by the commit itself, so nothing silently arms.

2. PRINCIPAL — correct and minimal. Both use `New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U` (current-user, non-elevated), matching the verified sibling. Both target scripts only wri
... [+3646 chars truncated]
