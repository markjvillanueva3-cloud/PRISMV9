---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "Scrutiny ARM C (regression/safety/silent-failure) RE-REVIEW of PRISM Bridge B af"
date: "2026-06-16"
first_ts: "2026-06-16T19:21:41.463Z"
last_ts: "2026-06-16T19:29:23.803Z"
cwd: "H:\\prism"
messages: 27
user_msgs: 11
assistant_msgs: 16
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-ac4aa72af8a7a1acd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# Scrutiny ARM C (regression/safety/silent-failure) RE-REVIEW of PRISM Bridge B af

> **claude-code-cli** | 2026-06-16 | 27 msgs (11 user / 16 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-ac4aa72af8a7a1acd.jsonl`

## Transcript

### User | 2026-06-16T19:21:41.463Z

Scrutiny ARM C (regression/safety/silent-failure) RE-REVIEW of PRISM Bridge B after a hardening fix (commit be61f51c77). Do NOT assume arms A/B caught everything. Read END-TO-END as they are NOW:
- H:/prism/scripts/fleet/launch-fleet-bounded.ps1
- H:/prism/scripts/fleet/hermes-skills/prism-fleet-launcher/SKILL.md

The fix added: a HardCeiling clamp on -MaxSlots; Get-OccupiedSlots (reads chat-slots.json heartbeat + in-flight marker dir); Set-InFlightMarker (writes a marker per -Live spawn); de-dup-before-cap; launch record written AFTER the loop with actual launched/failed/skipped; recordWritten/resolvedShell surfaced; honest "handed to wt not confirmed" semantics.

FOCUS (regression — did the fix introduce a NEW failure?):
1. SILENT FAILURE / fail-direction: if chat-slots.json is unreadable or in-flight dir is unreadable, Get-OccupiedSlots returns an empty/partial occupied set. Trace it: does that fail toward MORE spawning (unsafe) or is it acceptable (the clamp + per-call cap still bound a single call to 6)? Is there any path where the occupancy guard returns ok:true with skipped=all and silently does nothing harmful?
2. The PowerShell itself: does Get-OccupiedSlots parse chat-slots.json's actual shape correctly ($cs.slots PSObject.Properties)? Does the DateTime.Parse of lastHeartbeat handle the ISO format + the AdjustToUniversal style without throwing (the try/catch swallows per-entry)? Could a ConvertFrom-Json on a large/odd file throw and is it caught?
3. The in-flight marker: Set-InFlightMarker writes Join-Path $InFlightDir $slot — $slot is a validated NATO name (safe filename). Marker dir created if missing. mtime-based TTL. Any leak (markers never cleaned) — is that a problem (they just age out of the TTL window, harmless)? 
4. Exit codes still correct (refusals non-zero, dry-run 0, live = [int](-not $ok))? The new "nothing to launch -- all alive/in-flight" path exits 0 with ok:true — is that the right semantics (yes if truly all occupied)?
5. Does the record
... [+236 chars truncated]

### Assistant | 2026-06-16T19:22:05.676Z

I'll read both files end-to-end as they are now after the hardening fix.

### Assistant | 2026-06-16T19:22:06.610Z

[tool_use: Read]

### Assistant | 2026-06-16T19:22:06.726Z

[tool_use: Read]

### User | 2026-06-16T19:22:56.378Z

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

### User | 2026-06-16T19:22:56.389Z

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

### Assistant | 2026-06-16T19:23:00.389Z

Both files read end-to-end. Let me verify a few load-bearing claims before asserting: the actual shape of chat-slots.json, the PowerShell DateTime.Parse behavior with the `$null` IFormatProvider, and the `-split ','` flattening on PSObject.Properties iteration.

### Assistant | 2026-06-16T19:23:01.732Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:23:02.740Z

[tool_use: Bash]

### User | 2026-06-16T19:24:47.054Z

[tool_result] {
  "schemaVersion": 1,
  "lastUpdated": "2026-06-16T19:24:17.038Z",
  "slots": {
    "alpha": {
      "chatId": "claude-ad9c3041",
      "host": "DESKTOP-N7MI1VB",
      "pid": 135284,
      "claimedAt": "2026-06-16T18:37:55.831Z",
      "lastHeartbeat": "2026-06-16T19:23:19.973Z",
      "branch": "slot/alpha",
      "topic": null,
      "activity": "PostToolUse:Bash",
      "terminalWindowId": "
... [+1612 chars truncated]

### User | 2026-06-16T19:25:18.525Z

[tool_result] 10:      "lastHeartbeat": "2026-06-16T19:25:00.702Z",
24:      "lastHeartbeat": "2026-06-16T19:24:16.912Z",
38:      "lastHeartbeat": "2026-06-16T17:20:58.446Z",
52:      "lastHeartbeat": "2026-06-16T19:21:32.695Z",
67:      "lastHeartbeat": "2026-06-16T19:20:33.805Z",
---
2:  "schemaVersion": 1,
4:  "slots": {

### Assistant | 2026-06-16T19:25:24.351Z

The chat-slots.json shape is confirmed: top-level `slots` object, slot values that are either an object with `lastHeartbeat` (ISO-8601 `Z` UTC) or `null` (for unclaimed slots like `delta`, `echo`, `hotel`). This is critical — let me verify how the PowerShell handles the `null` slot values, since that's a concrete edge case in the loop.

A `null` slot value is a real PSObject case. In `Get-OccupiedSlots`, line 108 iterates `$slotsObj.PSObject.Properties`, and for `delta` (value `null`), `$prop.Value.lastHeartbeat` → `$null` → the `if ($hb)` guard at line 111 skips it. Safe. Let me confirm the `-split ','` and DateTime.Parse behavior, and check whether the in-flight marker dir / record dir already exist.

### Assistant | 2026-06-16T19:25:26.701Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:25:28.131Z

[tool_use: Bash]

### User | 2026-06-16T19:25:49.999Z

[tool_result] ---inflight exit 2---
-rw-r--r-- 1 wompu 197611 199 Jun 14 20:28 state/shared/fleet-bounded-launch-log.jsonl
---log exit 0---
-rw-r--r-- 1 wompu 197611 29618 Jun 10 18:38 H:/Tools/prism-fleet/slot-tab-boot.ps1
---boottools exit 0---
-rw-r--r-- 1 wompu 197611 26877 Jun 10 11:38 scripts/fleet/slot-tab-boot.ps1
---bootrepo exit 0---

### User | 2026-06-16T19:26:29.964Z

[tool_result] be61f51c77 [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-B1-SCRUTINY-FIX (slot:zulu): harden Bridge-B fleet launcher -- 3-of-3 FAILed it (per-call cap caller-overridable + non-cumulative + boot-window dup race)
b2e21d47f1 [HERMES-BRIDGE-MS0]/U-HB-B1-HERMES-TO-CC-FLEET (slot:sierra): bounded fleet launcher (dry-run default, MaxSlots cap, explicit slots, reuses slot-tab-boot liveness guard) + zulu prism-fle
... [+1400 chars truncated]

### Assistant | 2026-06-16T19:26:35.882Z

Confirmed: in-flight dir does not yet exist (created on first `-Live`), boot scripts both present, log file already exists (so `Add-Content` append path is exercised). Now let me reason through the cumulative-bound claim carefully, since that's the core safety property the fix introduced.

The key concern for arm C: the fix claims to bound CUMULATIVE spawning. Let me trace the timing window precisely. In-flight TTL is 240s; the alive-heartbeat window is 180s. A freshly spawned slot writes a marker immediately (line 228). But there's a gap I need to verify — let me check the boot-window timing: how long until a newly-spawned claude writes its first chat-slots.json heartbeat, vs the 240s in-flight TTL.

### Assistant | 2026-06-16T19:26:37.731Z

[tool_use: Bash]

### Assistant | 2026-06-16T19:26:38.255Z

[tool_use: Bash]

### User | 2026-06-16T19:27:38.461Z

[tool_result] 113:              $hbTime = [DateTime]::Parse($hb, $null, [System.Globalization.DateTimeStyles]::AdjustToUniversal)
===check other launchers parse heartbeat the same way===
scripts/fleet/launch-fleet-bounded.ps1
scripts/fleet/slot-tab-boot.ps1

### User | 2026-06-16T19:27:38.464Z

[tool_result] {"ts":"2026-06-15T01:28:49.9253069Z","live":false,"bootScript":"H:\\Tools\\prism-fleet\\slot-tab-boot.ps1","haveWt":true,"slots":["sierra","tango"],"maxSlots":6,"source":"launch-fleet-bounded.ps1"}
---

### Assistant | 2026-06-16T19:27:45.208Z

I have what I need. Note the existing log record (from the OLD pre-fix version) shows `"live":false` got a record written — that confirms the dry-run-record behavior changed (point 5). Let me do one final verification on the cumulative-bound math, which is the load-bearing safety claim, and check the actual `-split` flattening robustness against a single-element native array.

The critical regression analysis for the cumulative bound:

- A `-Live` call spawns slot X → writes marker X at T=0.
- Marker TTL = 240s. So for 240s, any re-call sees X as `in-flight` and skips it.
- The newly-spawned claude must write its first chat-slots.json heartbeat (becoming `alive`, 180s window) BEFORE the 240s marker expires, otherwise there's a gap where X is neither in-flight nor alive → re-launchable.

Let me verify the boot path's heartbeat timing to confirm there's no gap, then check the `delta`/`null` slot iteration once more under the actual parse.

### Assistant | 2026-06-16T19:27:47.103Z

[tool_use: Grep]

### Assistant | 2026-06-16T19:27:48.353Z

[tool_use: Grep]

### User | 2026-06-16T19:28:45.146Z

[tool_result] 26:               (>10min heartbeat gap) overnight -- operator still wants those
98:  # at session start, but claude respawns node children and lastHeartbeat is
377:    # (driving the build to 100%) instead of a bare heartbeat. Knob

### User | 2026-06-16T19:28:45.283Z

[tool_result] 19: *   - Crash detection: when a slot's lastHeartbeat goes >10min without
179: * @property {string} lastHeartbeat     — ISO timestamp of last update
256:function writeSlotsAtomic(file, statePath = DEFAULT_STATE_PATH) {
353:export function writeSlotBranchBindings(bindings, opts = {}) {
484:  const lastMs = Date.parse(slot.lastHeartbeat);
688:  // gate -> unprotected -> drifted on the next peer aut
... [+817 chars truncated]

### Assistant | 2026-06-16T19:29:23.803Z

I have enough to complete the analysis. The boot path: a slot's heartbeat is written at SessionStart auto-pin (the `charlie` slot in the live file shows `activity: "session-start-auto-pin"` with a heartbeat). The newly-spawned claude writes its first heartbeat at SessionStart, which on a cold Opus start happens well within the 240s marker TTL (the 1500ms stagger + claude cold-start is seconds-to-tens-of-seconds, not minutes). So the in-flight→alive handoff has no gap in normal operation. Good.

Now let me finalize my regression findings across all 5 focus areas.

---

## Analysis summary

I traced the fail-direction of every new guard, the PowerShell parse correctness against the live `chat-slots.json` shape (confirmed: `slots` object with ISO-8601 `Z` heartbeats and `null` unclaimed slots), the marker TTL vs boot-window timing, exit codes, and the dry-run record change.

**Fail-direction (the most important arm-C question): every new guard fails SAFE.** If `chat-slots.json` is unreadable (line 120 catch) or the in-flight dir is unreadable (line 128 catch), `Get-OccupiedSlots` returns a *partial/empty* occupied set → fewer slots are skipped → MORE may spawn. BUT this is bounded by the per-call clamp: `$effectiveMax = Min(Max(1,MaxSlots), 6)` (line 87) is asserted on the deduped set (line 156) *before* the occupancy check runs. So even total occupancy-guard failure caps a single call at 6 — it degrades the *cumulative* bound, never the *per-call* bound. That is the correct, acceptable degradation (R12-honest: the cumulative guard is best-effort, the hard cap is not).

---

### Findings

- **[P2]** `launch-fleet-bounded.ps1:113` — `[DateTime]::Parse($hb, $null, [DateTimeStyles]::AdjustToUniversal)`. Passing `$null` as the `IFormatProvider` is accepted by .NET (falls back to `CurrentCulture`), and the live heartbeats are invariant ISO-8601 (`2026-06-16T19:23:19.973Z`) which parses culture-independently — so this works on the operator's machine. The residual risk is a n
... [+4082 chars truncated]
