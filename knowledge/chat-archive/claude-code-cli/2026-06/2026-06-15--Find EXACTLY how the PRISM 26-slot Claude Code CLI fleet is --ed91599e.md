---
type: "chat-session"
source: "claude-code-cli"
session_id: "ed91599e-19b8-4bdb-8ea8-87e47b6ee322"
title: "Find EXACTLY how the PRISM 26-slot Claude Code CLI fleet is launched in PowerShe"
date: "2026-06-15"
first_ts: "2026-06-15T00:52:34.121Z"
last_ts: "2026-06-15T00:55:08.325Z"
cwd: "H:\\prism-slot-sierra"
messages: 49
user_msgs: 21
assistant_msgs: 28
raw_file: "H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-aa3485e7ec758516e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Find EXACTLY how the PRISM 26-slot Claude Code CLI fleet is launched in PowerShe

> **claude-code-cli** | 2026-06-15 | 49 msgs (21 user / 28 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/ed91599e-19b8-4bdb-8ea8-87e47b6ee322/subagents/agent-aa3485e7ec758516e.jsonl`

## Transcript

### User | 2026-06-15T00:52:34.121Z

Find EXACTLY how the PRISM 26-slot Claude Code CLI fleet is launched in PowerShell on Windows, so another process (Hermes) can invoke it. Repo root H:/prism. Be concrete and concise.

FIND:
1. The launcher script(s) that boot Claude Code CLI sessions for slots. Candidates: anything matching slot-tab-boot, fleet-orchestrate (scripts/fleet-orchestrate.mjs), fleet-wake-sequencer (scripts/fleet-wake-sequencer.mjs), .claude/helpers/*launch*.ps1, scripts/*launch*, Windows Terminal (wt.exe) tab spawners, or a script that runs `claude` (the @anthropic-ai/claude-code CLI). Grep for `wt.exe`, `claude `, `Start-Process`, `claude-code`, `--checkin`, slot-tab.
2. For the real launcher: what is the EXACT command to launch one slot and/or the whole fleet? What args (slot name, /checkin-<slot>, /loop)? Does it open Windows Terminal tabs, separate windows, or background processes?
3. Is there any existing CONCURRENCY GUARD / cap on how many slots launch (to avoid runaway spawning)? Where?
4. How does a slot session get its initial prompt (e.g. /checkin-sierra) injected at launch — via clipboard/SendKeys, a startup arg, or a file the session reads?

Report: exact launcher path(s) + exact invocation command(s) + the concurrency guard (or note its absence) + how the startup prompt is delivered. Cite paths. If multiple launchers exist, say which is the current/canonical one (check recency / git log / CLAUDE.md references).

### Assistant | 2026-06-15T00:52:37.066Z

I'll search the repository systematically to find all launcher-related scripts and configurations.

### Assistant | 2026-06-15T00:52:37.848Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:52:38.227Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:52:38.630Z

[tool_use: Glob]

### User | 2026-06-15T00:52:51.322Z

[tool_result] H:\prism\state\scripts\launch-prism-web-background.ps1
H:\prism\tmp\prism-consensus-recovery\state\scripts\launch-prism-web-background.ps1
H:\prism\scripts\system-health\04-pre-launch-check.ps1
H:\prism\.claude\worktrees\rgs6-audit-v2\state\scripts\launch-prism-web-background.ps1
H:\prism\prism-test-6d0595\state\scripts\launch-prism-web-background.ps1
H:\prism\scripts\winmax-launch.ps1
H:\prism\.c
... [+168 chars truncated]

### User | 2026-06-15T00:52:51.500Z

[tool_result] H:\prism\scripts\fleet\slot-tab-boot.ps1
H:\prism\knowledge\hermes-outputs\slot-tab-boot-with-zulu-injection.ps1
H:\prism\knowledge\hermes-outputs\slot-tab-boot.modified.ps1
H:\prism\knowledge\hermes-outputs\slot-tab-boot.zulu-integrated.ps1
H:\prism\knowledge\hermes-outputs\slot-tab-boot-hermes.production.ps1

### User | 2026-06-15T00:52:51.667Z

[tool_result] H:\prism\scripts\render-fleet-pipeline-to-viz.mjs
H:\prism\prism-test-6d0595\.claude\helpers\fleet-reaper.test.mjs
H:\prism\prism-test-6d0595\.claude\helpers\install-fleet-reaper-task.ps1
H:\prism\prism-test-6d0595\.claude\hooks\fleet-reaper-stop.mjs
H:\prism\prism-test-6d0595\scripts\fleet-reaper-sweep.mjs
H:\prism\prism-test-6d0595\scripts\fleet-status.mjs
H:\prism\prism-test-6d0595\scripts\rend
... [+6299 chars truncated]

### Assistant | 2026-06-15T00:52:54.974Z

Good findings. Now let me read the key launcher files in parallel.

### Assistant | 2026-06-15T00:52:55.361Z

[tool_use: Read]

### Assistant | 2026-06-15T00:52:55.740Z

[tool_use: Read]

### Assistant | 2026-06-15T00:52:56.016Z

[tool_use: Read]

### User | 2026-06-15T00:53:09.626Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  PRISM fleet per-slot tab boot -- resumes the most recent session for this slot
4	  WITHOUT compacting (operator directive 2026-05-28). 4-tier session discovery.
5	
6	.DESCRIPTION
7	  Spawned by Launch-PRISM-Fleet.ps1 as the command of every Windows Terminal tab:
8	      pwsh -NoExit -File slot-tab-boot.ps1 -Slot <nato>
9	
10	  Resume resolution order (operator: "find the most 
... [+28275 chars truncated]

### User | 2026-06-15T00:53:09.815Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fleet-orchestrate.mjs — the ZULU master's "wake the fleet" tool.
4	 *
5	 * Composes a resource-rich orchestration brief for each assigned fleet slot and
6	 * delivers it through the slot-brief channel (state/shared/slot-briefs/<slot>.md ->
7	 * slot-brief-inject.mjs -> that slot's next prompt). As each slot wakes (/checkin-<slot>),
8	 * it receives a targeted ZULU 
... [+7420 chars truncated]

### User | 2026-06-15T00:53:10.040Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fleet-wake-sequencer.mjs — staggered, token-gated fleet wake for the ZULU/
4	 * Hermes orchestrator (slot:bravo, hermes-zulu galaxy).
5	 *
6	 * THE GAP THIS CLOSES (per the 2026-06-03 ZULU-fleet-control assessment): the
7	 * pull control loop already works (fleet-orchestrate composes a per-slot brief →
8	 * slot-brief-inject delivers it on the slot's next turn). Wh
... [+26660 chars truncated]

### Assistant | 2026-06-15T00:53:13.259Z

Now let me find the parent launcher that calls slot-tab-boot.ps1, and check for any Windows Terminal (wt.exe) fleet launcher.

### Assistant | 2026-06-15T00:53:14.507Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:53:14.832Z

[tool_use: Glob]

### Assistant | 2026-06-15T00:53:16.116Z

[tool_use: Grep]

### User | 2026-06-15T00:53:21.351Z

[tool_result] Found 20 files
H:\prism\scripts\ollama-wedge-guard.mjs
H:\prism\scripts\lib\mcp-bridge-liveness.mjs
H:\prism\scripts\snap-wt-quadrants.ps1
H:\prism\scripts\launch-system-viz-dashboard.ps1
H:\prism\scripts\generate-per-slot-skill-wrappers.mjs
H:\prism\scripts\generate-per-slot-galaxy-buildout-files.mjs
H:\prism\scripts\generate-chat-slot-nodes-features.mjs
H:\prism\scripts\lib\fleet-reaper-leftover
... [+600 chars truncated]

### User | 2026-06-15T00:53:28.474Z

[tool_result] H:\prism\knowledge\hermes-outputs\Launch-PRISM-Fleet-with-zulu-injection.ps1
H:\prism\knowledge\hermes-outputs\Launch-PRISM-Fleet.zulu-integrated.ps1
H:\prism\knowledge\hermes-outputs\Launch-PRISM-Fleet-3win.zulu-integrated.ps1
H:\prism\knowledge\hermes-outputs\Launch-PRISM-Fleet.hermes.production.ps1

### User | 2026-06-15T00:53:28.798Z

[tool_result] H:\prism\scripts\regenerate-launch-fleet.test.mjs
H:\prism\scripts\regenerate-launch-fleet.mjs

### Assistant | 2026-06-15T00:53:30.787Z

Now let me read the key fleet launcher scripts and the regenerator:

### Assistant | 2026-06-15T00:53:31.158Z

[tool_use: Read]

### Assistant | 2026-06-15T00:53:31.552Z

[tool_use: Read]

### Assistant | 2026-06-15T00:53:31.899Z

[tool_use: Glob]

### User | 2026-06-15T00:53:33.227Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * regenerate-launch-fleet.mjs — HZD-followup
4	 *
5	 * Reads state/shared/chat-slots.json and emits a fresh LAUNCH-PRISM-FLEET.bat
6	 * to the user's Desktop. Layout: 4 Windows Terminal windows snapped to the
7	 * primary monitor's quadrants (NW/NE/SW/SE), each with N chats as tabs.
8	 * The 2 PRISM dashboards (system-viz :8765, hzp-dash-control :8767) ride in
9	 * t
... [+39963 chars truncated]

### User | 2026-06-15T00:53:33.410Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * fleet-launch-summary.mjs -- FLEET-LAUNCHER-IMPROVE-MS0/U-FLI03 (slot:tango, 2026-06-10)
4	 *
5	 * Aggregates the per-tab launch decisions that slot-tab-boot.ps1 appends to
6	 * state/shared/.fleet-launch-log.jsonl into one operator-facing summary, so a
7	 * launch shows "which slots resumed / went fresh / were skipped" instead of that
8	 * decision being buried in 
... [+7073 chars truncated]

### User | 2026-06-15T00:53:33.553Z

[tool_result] No files found

### Assistant | 2026-06-15T00:53:37.807Z

Now let me check where slot-tab-boot.ps1 actually lives (it's referenced as `H:\Tools\prism-fleet\slot-tab-boot.ps1` in the generated bat), check the send-keys helper, and look for any concurrency guard:

### Assistant | 2026-06-15T00:53:38.955Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:53:39.725Z

[tool_use: Read]

### User | 2026-06-15T00:53:41.249Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  send-keys-to-window.ps1 — UI Automation SendInput to a target PowerShell
4	  window by HWND, for the CHAT-ORCHESTRATOR-MS0 fleet orchestrator (U-CHO04).
5	
6	.DESCRIPTION
7	  Given a target PowerShell window's HWND, types a text string into it
8	  followed by ENTER. The orchestrator uses this to send "/clear" or
9	  "/compact" into another chat's PowerShell window, or to type 
... [+2531 chars truncated]

### Assistant | 2026-06-15T00:53:41.450Z

[tool_use: Grep]

### User | 2026-06-15T00:53:42.396Z

[tool_result] H:\prism\scripts\fleet\slot-tab-boot.ps1-375-    # sequence -- /startup-<slot> /loop [10m] /goal -- so the chat re-claims its
H:\prism\scripts\fleet\slot-tab-boot.ps1-376-    # slot, runs startup, and re-enters the Hermes loop on the standing goal
H:\prism\scripts\fleet\slot-tab-boot.ps1-377-    # (driving the build to 100%) instead of a bare heartbeat. Knob
H:\prism\scripts\fleet\slot-tab-boot.ps
... [+1582 chars truncated]

### User | 2026-06-15T00:53:44.262Z

[tool_result] Launch-PRISM-Fleet-3win.ps1
Launch-PRISM-Fleet.ps1
capture-accounts-runbook.md
hermes-slot-tab-boot.ps1
hermes-souls/
probe-claude-launch.ps1
resume-specific.ps1
slot-tab-boot.ps1
zulu-master-context-inject.ps1

### Assistant | 2026-06-15T00:53:47.264Z

Now let me check the actual canonical boot script location and the older fleet launchers in H:/Tools/prism-fleet:

### Assistant | 2026-06-15T00:53:48.093Z

[tool_use: Read]

### User | 2026-06-15T00:53:49.658Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  Launch the PRISM chat fleet across 4 Windows Terminal windows tiled in a
4	  2x2 quadrant grid on the primary monitor.
5	
6	.DESCRIPTION
7	  4 wt.exe windows in quadrants (NW / NE / SW / SE), with an operator-curated
8	  per-window grouping (directive 2026-06-09 -- 19 slots, NOT alphabetical):
9	
10	    Window 1 / NW: alpha, bravo, golf, india, papa, sierra
11	    Window 2 / N
... [+3533 chars truncated]

### Assistant | 2026-06-15T00:53:49.660Z

[tool_use: Bash]

### Assistant | 2026-06-15T00:53:50.244Z

[tool_use: Bash]

### User | 2026-06-15T00:53:54.202Z

[tool_result] (Bash completed with no output)

### User | 2026-06-15T00:54:00.345Z

[tool_result] 1645c20d83 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI05 (slot:tango): strategically launch Docker + Ollama at fleet activation
75cf39dbfa [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER-IMPROVE-MS0]/U-FLI01-04 (slot:tango): self-regen wrapper + recovery refresh + launch summary/log + smarter liveness-skip
750d7cb4a8 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [FLEET-LAUNCHER]/U-OPEN-TO
... [+1242 chars truncated]

### Assistant | 2026-06-15T00:54:03.595Z

Now let me check the rest of the Launch-PRISM-Fleet.ps1 for the actual wt.exe invocation pattern and any concurrency guard:

### Assistant | 2026-06-15T00:54:04.430Z

[tool_use: Read]

### User | 2026-06-15T00:54:05.422Z

[tool_result] 80	# november, quebec, tango, uniform, victor, zulu, yankee per operator request.
81	$Layout = @(
82	  @{ Quadrant = 'NW'; Slots = @('alpha','bravo','golf','india','papa','sierra') },
83	  @{ Quadrant = 'NE'; Slots = @('charlie','hotel','oscar','echo','xray') },
84	  @{ Quadrant = 'SW'; Slots = @('delta','kilo','foxtrot','mike','whiskey') },
85	  @{ Quadrant = 'SE'; Slots = @('romeo','juliett','li
... [+7055 chars truncated]

### Assistant | 2026-06-15T00:54:06.314Z

[tool_use: Bash]

### User | 2026-06-15T00:54:13.187Z

[tool_result] be9182dca7 [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [SESSION-CONTINUITY-AGENTIC]/U-AUTOSTART-LOOP-GOAL (slot:alpha): auto-start session with /startup-<slot> /loop [10m] /goal + fix handoff stubs
625d0cf38b [MAIN] [FLEET-LAUNCHER]/U-DYNAMIC-CURRENT-SESSION (slot:golf): each slot window opens to its CURRENT session at launch (bare -Slot dynamic resolve, staleness guard relaxed 90->99999, boot-script launch-t
... [+709 chars truncated]

### Assistant | 2026-06-15T00:55:08.325Z

I now have everything needed. Here is the complete, concrete answer.

---

## PRISM Fleet Launch: Exact Mechanics for Hermes

### 1. The Launcher Scripts (canonical order, most current first)

**Two-layer system — a thin wrapper calls a generated .bat:**

**Layer 1 — Thin self-regenerating wrapper (operator double-clicks this):**
- `C:\Users\wompu\OneDrive\Desktop\LAUNCH-PRISM-FLEET.bat`
- Written by `H:/prism/scripts/regenerate-launch-fleet.mjs`
- On each launch it: (a) runs `node H:/prism/scripts/regenerate-launch-fleet.mjs --out <generated.bat> --no-thin` to rebuild the generated launcher from current `chat-slots.json`, (b) runs `recover-today-context.mjs --all`, (c) writes a launch-start marker via `fleet-launch-summary.mjs --mark`, (d) spawns Docker/Ollama in background, then (e) `call`s the generated launcher.

**Layer 2 — Generated heavy launcher:**
- `C:\Users\wompu\OneDrive\Desktop\LAUNCH-PRISM-FLEET.generated.bat`
- Regenerated fresh on every double-click. Contains the actual `wt.exe` invocations.

**Per-slot boot script (called by every Windows Terminal tab):**
- Canonical location: `H:\Tools\prism-fleet\slot-tab-boot.ps1` (last modified Jun 10 18:38 — the version actively used)
- Tracked copy in repo: `H:/prism/scripts/fleet/slot-tab-boot.ps1` (identical content, updated Jun 10 per git log)

**The older direct PS1 launcher (still current for operator-curated groupings):**
- `H:\Tools\prism-fleet\Launch-PRISM-Fleet.ps1` (Jun 9 — 19-slot hand-curated layout, direct wt.exe caller, no regen step)
- `H:\Tools\prism-fleet\Launch-PRISM-Fleet-3win.ps1` (Jun 9 — 3-window variant)

The **canonical current launcher** is `LAUNCH-PRISM-FLEET.bat` (thin wrapper) → `LAUNCH-PRISM-FLEET.generated.bat` (generated by `regenerate-launch-fleet.mjs`). The `H:\Tools\prism-fleet\Launch-PRISM-Fleet.ps1` is an older direct alternative with a hand-coded slot roster.

---

### 2. Exact Command to Launch One Slot / the Whole Fleet

**Single slot tab (what the generated .bat issues p
... [+6255 chars truncated]
