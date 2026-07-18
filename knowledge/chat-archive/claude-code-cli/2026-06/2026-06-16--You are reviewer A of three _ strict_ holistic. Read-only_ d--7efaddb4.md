---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "You are reviewer A of three — strict, holistic. Read-only; does NOT need the PRI"
date: "2026-06-16"
first_ts: "2026-06-16T21:12:31.520Z"
last_ts: "2026-06-16T21:13:53.449Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-a7e974e5241548d99.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:15"
---

# You are reviewer A of three — strict, holistic. Read-only; does NOT need the PRI

> **claude-code-cli** | 2026-06-16 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-a7e974e5241548d99.jsonl`

## Transcript

### User | 2026-06-16T21:12:31.520Z

You are reviewer A of three — strict, holistic. Read-only; does NOT need the PRISM MCP bridge (ignore any MCP-disconnect warning; review local git/files).

TARGET: commit c5bca80f4d on cad-fusion-live-ms0. Run `git -C H:/prism show c5bca80f4d -- scripts/fleet/launch-fleet-bounded.ps1` (use `rtk git`), and read the full current file H:/prism/scripts/fleet/launch-fleet-bounded.ps1 + its skill H:/prism/scripts/fleet/hermes-skills/prism-fleet-launcher/SKILL.md.

WHAT IT IS (highest-risk artifact in the milestone): a BOUNDED PowerShell launcher that Hermes-zulu uses to start PRISM Claude Code fleet slots — it spawns Windows Terminal tabs running `claude` (can be EXPENSIVE Opus). It MUST be impossible for it to runaway-spawn. Defaults: DRY-RUN unless -Live; -Slots is an explicit list; -MaxSlots hard-clamped.

Two prior scrutiny rounds FAILed and were fixed; verify the fixes HOLD (flag P0/P1 with line):
1. -MaxSlots is HARD-CLAMPED to 6 ($HardCeiling): `[Math]::Min([Math]::Max(1,$MaxSlots),$HardCeiling)`. -MaxSlots 999 -> 6. Cannot be widened.
2. CUMULATIVE occupancy guard: de-dup the slot list, then count already-alive (chat-slots.json heartbeat <180s) + in-flight (marker dir <240s) so repeated calls cannot exceed the 26-slot universe or double-launch.
3. TOCTOU: in-flight markers are claimed UP-FRONT (before the spawn loop), not after.
4. DRY-RUN is the default; -Live required to actually spawn; non-zero exit => STOP, no auto-retry.
5. Honest semantics: ok:true means "handed to wt", NOT "session attached" (per-slot heartbeat verify is the operator's job).

Be concise. Real P0/P1 only with line refs, then "VERDICT: PASS" or "VERDICT: FAIL".

### Assistant | 2026-06-16T21:12:38.966Z

I'll review this bounded PowerShell launcher. Let me start by examining the commit and reading the full files.

### Assistant | 2026-06-16T21:12:39.927Z

[tool_use: Bash]

### Assistant | 2026-06-16T21:12:40.400Z

[tool_use: Read]

### Assistant | 2026-06-16T21:12:40.770Z

[tool_use: Read]

### User | 2026-06-16T21:12:49.624Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
c5bca80f4d [MAIN-FORCE] [HERMES-BRIDGE-MS0]/U-HB-B1-SCRUTINY-FIX-2 (slot:zulu): close the 2 NEW P1s the re-scrutiny arm-B found (TOCTOU race + fail-open-on-corrupt) (2 hours ago) <markjvillanueva3-cloud>
scripts/fleet/launch-fleet-bounded.ps1 | 45 +++++++++++++++++++++++++---------
 1 file changed, 33 insertions(+), 12 del
... [+6002 chars truncated]

### User | 2026-06-16T21:12:50.949Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet\launch-fleet-bounded.ps1' was already read 3s ago in this session and is unchanged (mtime 1781638433900). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-16T21:12:51.683Z

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

### Assistant | 2026-06-16T21:12:54.558Z

Now let me read the full current file to verify the fixes hold in the live code, not just the diff.

### Assistant | 2026-06-16T21:12:55.272Z

[tool_use: Read]

### User | 2026-06-16T21:12:56.535Z

[tool_result] 60	  [string[]]$Slots,
61	  [int]$MaxSlots = 6,
62	  [switch]$Live,
63	  [string]$BootScript
64	)
65	
66	$ErrorActionPreference = 'Stop'
67	
68	# Canonical 26-slot NATO enum -- MUST match SLOT_NAMES in chat-slots.mjs and the
69	# $AllSlots list in zebra-launch.ps1. Hardcoded to keep this launcher self-contained.
70	$AllSlots = @(
71	  'alpha','bravo','charlie','delta','echo','foxtrot','golf','hote
... [+10600 chars truncated]

### Assistant | 2026-06-16T21:12:59.131Z

Let me read the top of the file (param block, line 1-59) and the tail (after line 259) to verify the full contract.

### Assistant | 2026-06-16T21:13:00.109Z

[tool_use: Read]

### Assistant | 2026-06-16T21:13:00.806Z

[tool_use: Read]

### User | 2026-06-16T21:13:06.439Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  Bounded, headless-safe launcher for the PRISM Claude Code fleet -- the entry
4	  point Bridge B (Hermes zulu) calls so an autonomous agent can boot CC slots
5	  WITHOUT the runaway-spawn risk of the uncapped Desktop .bat.
6	
7	.DESCRIPTION
8	  Bridge B of the Claude-Code <-> Hermes integration. The existing fleet boot
9	  path (LAUNCH-PRISM-FLEET.generated.bat -> slot-tab-boot
... [+2730 chars truncated]

### User | 2026-06-16T21:13:07.099Z

[tool_result] 259	$recordWritten = $false
260	$record = [ordered]@{
261	  ts = [DateTime]::UtcNow.ToString('o'); live = $true; bootScript = $BootScript; haveWt = $haveWt;
262	  resolvedShell = $Pwsh; pwshFellBack = $pwshFellBack; maxSlots = $effectiveMax; requestedMaxSlots = $MaxSlots;
263	  planned = $finalSlots; launched = $launched; failed = $failed; skipped = $skipped; source = 'launch-fleet-bounded.ps1'
26
... [+1127 chars truncated]

### Assistant | 2026-06-16T21:13:22.803Z

I have now read the entire file end to end. Let me verify the five claimed fixes against the actual code.

**1. HARD-CLAMP on -MaxSlots** — Line 88: `$effectiveMax = [Math]::Min([Math]::Max(1, $MaxSlots), $HardCeiling)` with `$HardCeiling = 6` (line 77). `-MaxSlots 999` → `Min(Max(1,999),6)` = 6. `-MaxSlots 0` → `Min(Max(1,0),6)` = 1. `-MaxSlots -5` → 1. The cap is asserted on the deduped set at line 163-166 against `$effectiveMax`. HOLDS.

**2. CUMULATIVE occupancy guard** — De-dup happens FIRST (lines 159-161) before the cap check. `Get-OccupiedSlots` counts alive (heartbeat <180s, lines 105-126) AND in-flight (marker <240s, lines 128-135), then `$finalSlots` drops all occupied (line 176). Repeated calls see prior markers/heartbeats and skip. HOLDS. The `.launcher.lock` exclusion (line 131) correctly prevents a lock file from being mistaken for a slot marker.

**3. TOCTOU — markers claimed up-front** — Line 244: `foreach ($slot in $finalSlots) { Set-InFlightMarker $slot }` runs BEFORE the spawn loop (lines 247-255). The old per-iteration `Set-InFlightMarker $p.slot` after `Start-Process` was removed (confirmed in diff). HOLDS.

**4. DRY-RUN default + non-zero exit = STOP** — `-Live` is a `[switch]` (line 62), default false; dry-run path (lines 216-225) exits 0 without spawning. Live exit code = `[int](-not $ok)` (line 277). No retry loop anywhere. HOLDS. SKILL.md step 69 documents "non-zero → STOP, no auto-retry."

**5. Honest semantics** — Live message (line 276): "handed ... to wt (NOT confirmed attached -- verify per-slot liveness)". NOTE block lines 271-275. SKILL.md step 4 + hard rule (lines 45-52, 67-68). HOLDS.

Now the deeper analysis — checking for gaps beyond the named fixes.

**Concurrency reality of the TOCTOU fix:** The marker claim (line 244) shrinks but does not eliminate the race. The comment at 240-243 is honest about this ("shrinks the read->spawn TOCTOU window to the marker write itself"). Two concurrent launchers can both read occupancy (line 1
... [+269 chars truncated]

### Assistant | 2026-06-16T21:13:23.753Z

[tool_use: Grep]

### Assistant | 2026-06-16T21:13:24.921Z

[tool_use: Grep]

### User | 2026-06-16T21:13:31.802Z

[tool_result] 131:        if ($f.Name -eq '.launcher.lock') { continue }

### User | 2026-06-16T21:13:33.420Z

[tool_result] 131:        if ($f.Name -eq '.launcher.lock') { continue }
230:# (An ABSENT file is the legitimate fresh state and does NOT block.)

### Assistant | 2026-06-16T21:13:53.449Z

Confirmed: `.launcher.lock` is only *referenced* (excluded from marker scanning at line 131), but **no lock is ever acquired or held**. There is no mutex/flock anywhere. The exclusion is defensive (so a future lock file wouldn't be miscounted as a slot), not an active concurrency primitive. This is consistent with the comment's honest framing that the fix "shrinks" rather than "closes" the window.

I have everything I need. All five claimed fixes hold in the live code. My deeper analysis surfaces one residual concurrency gap (already honestly disclosed by the author's own comment) and assesses whether it is a P0/P1 or an acceptable residual.

**Residual TOCTOU between two concurrent launchers (lines 172 → 244):** Two simultaneous invocations can both pass the occupancy read before either writes markers, then both spawn the same slot. This is NOT a runaway-spawn class bug — the per-call hard ceiling of 6 (line 88) and the per-slot validation still bind each call independently, so the worst case is a bounded double-launch of a small overlapping set, not unbounded growth. The author documents this limitation explicitly (lines 240-243), the marker-claim ordering is the correct cheap mitigation, and the downstream `slot-tab-boot.ps1` carries its own liveness guard. For an autonomous-but-serially-driven Hermes caller (SKILL.md drives one call at a time), this residual is acceptable and correctly disclosed — P2 at most, not a blocker. The named scrutiny fix (markers up-front) is genuinely implemented.

No inlined physics constants, no security/injection issues (slot names are enum-validated at line 154 before reaching the `wt` argument list; `wtArgs` is a structured array, not a shell string, so no injection surface), DRY-RUN-default is intact, and the fail-closed-on-corrupt logic correctly distinguishes absent (legitimate) from present-but-unparseable (refuse).

---

VERDICT: PASS

summary: All five named fixes are present and correct in the live file `H:/prism/scripts/fl
... [+1498 chars truncated]
