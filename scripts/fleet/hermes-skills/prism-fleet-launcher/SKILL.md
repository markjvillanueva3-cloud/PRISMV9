---
name: prism-fleet-launcher
description: "Use when ZULU needs to launch PRISM Claude Code fleet slots. Calls the BOUNDED PowerShell launcher (launch-fleet-bounded.ps1) -- explicit slot list, max 6, DRY-RUN by default. Verifies processes, then writes a launch record to the vault."
version: 1.0.0
author: PRISM sierra slot (2026-06-14)
license: MIT
platforms: [windows]
metadata:
  hermes:
    tags: [PRISM, fleet, launcher, powershell, claude-code, orchestration, zulu]
    related_skills: [prism-vault-loop, zulu-autonomous-building]
---

# PRISM Fleet Launcher (ZULU -> Claude Code CLI)

Launch PRISM Claude Code fleet slots from the ZULU Hermes profile via the BOUNDED
PowerShell launcher. This is Bridge B of the Claude-Code <-> Hermes integration:
it lets the Hermes app start Claude Code sessions, which run on the operator's
Claude subscription. Follow READ -> DRY-RUN -> LAUNCH -> VERIFY -> WRITE-BACK.
You run unattended; execute each step with tool calls, then report.

## Why bounded (do not bypass)
The raw fleet launcher (the Desktop .bat / slot-tab-boot.ps1 directly) has NO
concurrency cap. NEVER call those directly. ALWAYS go through
`H:\prism\scripts\fleet\launch-fleet-bounded.ps1`, which takes an EXPLICIT slot
list, caps the count (default 6), and DRY-RUNS by default. Launching many Opus
sessions blindly is a cost + stability hazard.

## Steps

### 1. Read state first (duplicate guard)
`terminal(command="type H:\\prism\\state\\shared\\chat-slots.json", timeout=30)`
Decide which slots actually need launching. Do NOT relaunch a slot already alive.

### 2. Dry-run FIRST (always)
`terminal(command="pwsh -NonInteractive -NoProfile -File H:\\prism\\scripts\\fleet\\launch-fleet-bounded.ps1 -Slots sierra,tango", timeout=60)`
Read the JSON. Confirm `ok:true` and that the planned commands look right. If it
refuses (unknown slot / over-cap), FIX the slot list -- do not try to override
the cap.

### 3. Launch (only after a clean dry-run)
`terminal(command="pwsh -NonInteractive -NoProfile -File H:\\prism\\scripts\\fleet\\launch-fleet-bounded.ps1 -Slots sierra,tango -Live", timeout=120)`
Capture the JSON result (`launched` / `failed`).

### 4. Verify PER-SLOT (not just a global process count)
A global `Get-Process pwsh,claude` cannot tell you WHICH slot attached -- a tab that
spawned but whose inner Claude skipped/failed looks identical to success. The launcher's
`ok:true` means "handed to wt", NOT "session live". Confirm each launched slot actually
came up by re-reading its heartbeat:
`terminal(command="pwsh -NonInteractive -Command \"$cs=Get-Content H:\\prism\\state\\shared\\chat-slots.json -Raw|ConvertFrom-Json; ($cs.slots|Get-Member -MemberType NoteProperty).Name|%{ '{0}: {1}' -f $_, $cs.slots.$_.lastHeartbeat }\"", timeout=30)`
A slot you just launched should show a fresh `lastHeartbeat` within a minute or two. If it
does not, the tab did not attach -- do NOT auto-relaunch (record + report).

### 5. Write-back
Save a launch record under `H:\prism\knowledge\hermes-outputs\` with the
timestamp, the slots launched, and the launcher JSON. Cite the actual terminal
output -- never fabricate a result.

## Hard rules
- ALWAYS dry-run before `-Live`.
- The `-MaxSlots` cap is HARD-CLAMPED to 6 by the launcher (you can LOWER it, never
  raise it -- `-MaxSlots 999` is silently treated as 6). Do not try to defeat it.
- The launcher AUTO-SKIPS slots that are already alive (recent chat-slots.json
  heartbeat) or in-flight (just launched, marker < 4 min) at its OWN layer, so
  repeated bounded calls cannot double-launch or exceed the 26-slot universe.
  Still check `chat-slots.json` first to avoid wasted calls.
- `ok:true` means the tab was HANDED to wt -- NOT that the session attached. Always
  do the per-slot Verify step (4) before treating a slot as running.
- If the launcher exits non-zero, record the error and STOP -- no auto-retry.
- Write ONLY under `H:\prism\knowledge\hermes-outputs\`.
