---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "Scrutiny ARM B (adversarial) RE-REVIEW of PRISM Bridge B after a hardening fix ("
date: "2026-06-16"
first_ts: "2026-06-16T19:21:19.021Z"
last_ts: "2026-06-16T19:26:11.017Z"
cwd: "H:\\prism"
messages: 21
user_msgs: 8
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-ae487d9929c1de706.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Scrutiny ARM B (adversarial) RE-REVIEW of PRISM Bridge B after a hardening fix (

> **claude-code-cli** | 2026-06-16 | 21 msgs (8 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-ae487d9929c1de706.jsonl`

## Transcript

### User | 2026-06-16T19:21:19.021Z

Scrutiny ARM B (adversarial) RE-REVIEW of PRISM Bridge B after a hardening fix (commit be61f51c77). Do NOT assume arm A caught everything. Read END-TO-END as they are NOW:
- H:/prism/scripts/fleet/launch-fleet-bounded.ps1
- H:/prism/scripts/fleet/hermes-skills/prism-fleet-launcher/SKILL.md

The launcher spawns expensive Opus sessions. Try AGAIN to break the (now-hardened) bounds:
1. Can -MaxSlots still be raised past 6 by ANY input ($MaxSlots clamp is [Math]::Min([Math]::Max(1,$MaxSlots),6))? Negative, 0, huge, non-integer-coerced?
2. Cumulative: can repeated calls still exceed the 26-slot universe or double-launch a slot? The new guard reads chat-slots.json heartbeat (< AliveHeartbeatSec=180) + an in-flight marker dir (mtime < InFlightTtlSec=240). Probe: what if chat-slots.json is missing/corrupt (does it fail OPEN = spawn everything, or fail toward not-skipping)? What if two calls race before the first writes its marker (marker written AFTER Start-Process succeeds, BEFORE the next loop iteration's sleep)? Is the marker written per-slot inside the loop so a concurrent process sees it?
3. Does the occupancy guard ever DROP ALL slots wrongly (e.g. mis-parse heartbeat → treat everything as alive → silently launch nothing while reporting ok:true)? Is that failure direction safe (refuse) or unsafe (spawn)?
4. Shell-injection still absent (Start-Process array-form)? Slot names still validated before any interpolation?
5. The in-flight marker dir write / chat-slots read — any path-traversal or crash if a marker filename is odd?

Output findings [P0]/[P1]/[P2]/[P3] with file:line + fix, then exactly "VERDICT: PASS" or "VERDICT: FAIL" (FAIL on any P0/P1). The key question: is the runaway-spawn bound now CODE-ENFORCED (not prose) AND fail-safe?

### Assistant | 2026-06-16T19:21:29.831Z

I'll review the hardened launcher end-to-end, focusing on whether the runaway-spawn bound is code-enforced and fail-safe.

### Assistant | 2026-06-16T19:21:30.304Z

[tool_use: Read]

### Assistant | 2026-06-16T19:21:30.667Z

[tool_use: Read]

### User | 2026-06-16T19:22:11.054Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  Bounded, headless-safe launcher for the PRISM Claude Code fleet -- the entry
4	  point Bridge B (Hermes zulu) calls so an autonomous agent can boot CC slots
5	  WITHOUT the runaway-spawn risk of the uncapped Desktop .bat.
6	
7	.DESCRIPTION
8	  Bridge B of the Claude-Code <-> Hermes integration. The existing fleet boot
9	  path (LAUNCH-PRISM-FLEET.generated.bat -> slot-tab-boot
... [+13543 chars truncated]

### User | 2026-06-16T19:22:11.057Z

[tool_result] 1	---
2	name: prism-fleet-launcher
3	description: "Use when ZULU needs to launch PRISM Claude Code fleet slots. Calls the BOUNDED PowerShell launcher (launch-fleet-bounded.ps1) -- explicit slot list, max 6, DRY-RUN by default. Verifies processes, then writes a launch record to the vault."
4	version: 1.0.0
5	author: PRISM sierra slot (2026-06-14)
6	license: MIT
7	platforms: [windows]
8	metadata:
9	
... [+3750 chars truncated]

### Assistant | 2026-06-16T19:22:13.967Z

Now let me verify the downstream boot script and check how `lastHeartbeat` is actually formatted in chat-slots.json, plus the SLOT_NAMES source of truth.

### Assistant | 2026-06-16T19:22:14.758Z

[tool_use: Read]

### Assistant | 2026-06-16T19:22:15.533Z

[tool_use: Grep]

### User | 2026-06-16T19:22:56.391Z

[tool_result] 1	{
2	  "schemaVersion": 1,
3	  "lastUpdated": "2026-06-16T19:22:41.001Z",
4	  "slots": {
5	    "alpha": {
6	      "chatId": "claude-ad9c3041",
7	      "host": "DESKTOP-N7MI1VB",
8	      "pid": 135284,
9	      "claimedAt": "2026-06-16T18:37:55.831Z",
10	      "lastHeartbeat": "2026-06-16T19:20:39.578Z",
11	      "branch": "slot/alpha",
12	      "topic": null,
13	      "activity": "PostToolUse:Bash
... [+5466 chars truncated]

### User | 2026-06-16T19:22:57.355Z

[tool_result] 109:export const SLOT_NAMES = [
110-  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
111-  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
112-];
113-
114-/** Crash TTL — slot is considered crashed/reclaimable after this many ms with
--
210:  for (cons
... [+6319 chars truncated]

### Assistant | 2026-06-16T19:23:02.306Z

The SLOT_NAMES match the hardcoded `$AllSlots` (26 slots, identical order). The `lastHeartbeat` is ISO-8601 UTC with a `Z` suffix. Now let me carefully analyze the heartbeat parsing logic since the schema shape matters: the JSON has `slots` as an object where each slot value is either `null` or an object with `lastHeartbeat`. Let me verify the PowerShell `[DateTime]::Parse` behavior and check the git diff for this commit to understand what hardened.

### Assistant | 2026-06-16T19:23:03.466Z

[tool_use: Bash]

### User | 2026-06-16T19:24:52.297Z

[tool_result] commit be61f51c776efd818ad940e5a61018bdbf93b52c
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Tue Jun 16 14:20:43 2026 -0500

    [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-B1-SCRUTINY-FIX (slot:zulu): harden Bridge-B fleet launcher -- 3-of-3 FAILed it (per-call cap caller-overridable + non-cumulative + boot-window dup race)
    
    A retroactive 3-of-3 on U-HB-B1 (it shipped uns
... [+13314 chars truncated]

### Assistant | 2026-06-16T19:24:56.071Z

I now have the full picture of the diff and the live data. Let me carefully analyze the adversarial probes against the actual code, focusing on the cumulative-bound claim which is the crux. Let me trace through the critical races and the fail-open question precisely.

The key claim under scrutiny: "N calls can never exceed the 26-slot universe nor double-launch a slot." Let me reason about the actual timing windows in the code.

### Assistant | 2026-06-16T19:24:57.267Z

[tool_use: Read]

### User | 2026-06-16T19:25:04.676Z

[tool_result] 160	
161	# ---- Cumulative / in-flight guard (the launcher's OWN liveness pre-check) ---
162	# Drop slots that are already alive or just-launched. This bounds CUMULATIVE
163	# spawning across repeated calls (3-of-3 P1) and closes the boot-window dup race
164	# (3-of-3 P1) that the downstream slot-tab-boot guard alone cannot see.
165	$occupied = Get-OccupiedSlots
166	$skipped = @($deduped | Where-O
... [+3338 chars truncated]

### Assistant | 2026-06-16T19:25:11.199Z

I have everything needed. Let me trace the cumulative-bound claim against the actual race timing precisely, since that is the crux of whether the runaway-spawn bound is code-enforced.

**Critical timing analysis:** The guard reads `Get-OccupiedSlots` at line 165 (occupancy snapshot), then the marker is written at line 228 — but only AFTER `Start-Process` succeeds, INSIDE the loop, per-slot. The occupancy snapshot for ALL slots in a call is taken ONCE at line 165, before the spawn loop. The in-flight markers a concurrent call would observe only exist for slots whose `Start-Process` already returned in the FIRST call's loop.

Let me confirm there's no file lock around the read-decide-spawn sequence and verify the heartbeat-skip-all failure direction.

### Assistant | 2026-06-16T19:25:12.339Z

[tool_use: Grep]

### User | 2026-06-16T19:25:19.579Z

[tool_result] No matches found

### Assistant | 2026-06-16T19:26:11.017Z

Confirmed: no lock around the read-decide-spawn sequence. Now I have everything to render the verdict. Let me reason through each probe against the actual code.

**Probe 1 — `-MaxSlots` clamp.** Line 87: `$effectiveMax = [Math]::Min([Math]::Max(1, $MaxSlots), $HardCeiling)`. `[int]$MaxSlots` is typed param (line 61), so non-integer string input coerces or fails at binding. Negative/0 → `Max(1, x)` floors to 1. Huge (999) → `Min(.., 6)` caps to 6. The cap is asserted on `$deduped.Count -gt $effectiveMax` (line 156). Clamp is sound — no input raises it past 6.

**Probe 2 — cumulative bound & race.** This is where the claim breaks.

**Probe 3 — heartbeat parse failure direction:** unparseable heartbeat → `catch` → not marked occupied (line 115) → slot is launchable → fail toward SPAWN, not refuse. Same for missing/corrupt chat-slots.json (line 120 catch → falls through, occupied stays empty for the alive-leg) → all slots launchable → fail-OPEN.

Let me write up the findings.

---

VERDICT: FAIL

summary: The `-MaxSlots` per-call clamp (probe 1) is now genuinely code-enforced and cannot be widened by any input — that arm is solid. But the headline claim that "N repeated calls can never exceed the 26-slot universe nor double-launch a slot" is NOT code-enforced: the cumulative guard is a lock-free read-decide-spawn (TOCTOU) and, more importantly, fails OPEN on the exact conditions it exists to detect (missing/corrupt chat-slots.json, and the entire boot window before any heartbeat is written). The runaway bound across calls remains effectively advisory, not enforced.

findings:

- [P1] `scripts/fleet/launch-fleet-bounded.ps1:165-228` — **Cumulative guard is a lock-free TOCTOU; concurrent calls double-launch and exceed the universe.** `Get-OccupiedSlots` snapshots occupancy ONCE at line 165, before the spawn loop. The in-flight marker is written at line 228 only AFTER `Start-Process` returns, per-slot, with no file lock spanning the read→spawn sequence (confirmed: zero loc
... [+6791 chars truncated]
