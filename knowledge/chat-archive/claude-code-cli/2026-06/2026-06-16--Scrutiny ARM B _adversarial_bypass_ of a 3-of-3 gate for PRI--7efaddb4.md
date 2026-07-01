---
type: "chat-session"
source: "claude-code-cli"
session_id: "7efaddb4-e737-4637-939f-3d15ea0c2610"
title: "Scrutiny ARM B (adversarial/bypass) of a 3-of-3 gate for PRISM Bridge B — the He"
date: "2026-06-16"
first_ts: "2026-06-16T19:03:10.670Z"
last_ts: "2026-06-16T19:05:57.838Z"
cwd: "H:\\prism"
messages: 20
user_msgs: 8
assistant_msgs: 12
raw_file: "H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-ae7931c4fbd6ca2c4.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Scrutiny ARM B (adversarial/bypass) of a 3-of-3 gate for PRISM Bridge B — the He

> **claude-code-cli** | 2026-06-16 | 20 msgs (8 user / 12 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/7efaddb4-e737-4637-939f-3d15ea0c2610/subagents/agent-ae7931c4fbd6ca2c4.jsonl`

## Transcript

### User | 2026-06-16T19:03:10.670Z

Scrutiny ARM B (adversarial/bypass) of a 3-of-3 gate for PRISM Bridge B — the Hermes→Claude-Code fleet launcher (HERMES-BRIDGE-MS0/U-HB-B1). Do NOT assume arm A caught everything. Read END-TO-END:
- H:/prism/scripts/fleet/launch-fleet-bounded.ps1
- H:/prism/scripts/fleet/hermes-skills/prism-fleet-launcher/SKILL.md

This can spawn expensive Claude Code (Opus) sessions on the operator's subscription. Try to BREAK the bounds:
1. -MaxSlots cap: exceedable? duplicates? -MaxSlots 0/negative/huge/non-integer? Checked before spawn, against the validated list? Is the per-call cap CUMULATIVE-safe (can N calls of 6 each launch all 26)?
2. -Slots parsing (comma-split): 'a, b', 'a,,b', 'a,b,', 'ALPHA', unknown/garbage, injection-y values — does invalid/empty REFUSE with non-zero exit?
3. DRY-RUN default: is -Live truly required? Any path spawning without -Live?
4. Shell-injection: are slot names interpolated into a command string (wt.exe args via Start-Process)? Array-form vs string?
5. Skill "hard rules" (dry-run first, never exceed cap, no relaunch-alive, no auto-retry): CODE-enforced or only prose (could a Hermes agent call the launcher directly and ignore them)?

Note for calibration: the validated slot universe is 26, and slot-tab-boot's liveness guard skips alive slots — factor whether that bounds total spawning. Output findings [P0]/[P1]/[P2]/[P3] with file:line + fix, then exactly "VERDICT: PASS" or "VERDICT: FAIL" (FAIL on any P0/P1; a runaway-spawn bound that is only documented, not code-enforced or universe-bounded, is at least P1).

### Assistant | 2026-06-16T19:03:34.957Z

I'll review the two files end-to-end, focusing on the bound-breaking attack surface.

### Assistant | 2026-06-16T19:03:35.279Z

[tool_use: Read]

### Assistant | 2026-06-16T19:03:35.544Z

[tool_use: Read]

### User | 2026-06-16T19:04:04.642Z

[tool_result] 1	<#
2	.SYNOPSIS
3	  Bounded, headless-safe launcher for the PRISM Claude Code fleet -- the entry
4	  point Bridge B (Hermes zulu) calls so an autonomous agent can boot CC slots
5	  WITHOUT the runaway-spawn risk of the uncapped Desktop .bat.
6	
7	.DESCRIPTION
8	  Bridge B of the Claude-Code <-> Hermes integration. The existing fleet boot
9	  path (LAUNCH-PRISM-FLEET.generated.bat -> slot-tab-boot
... [+7537 chars truncated]

### User | 2026-06-16T19:04:04.645Z

[tool_result] 1	---
2	name: prism-fleet-launcher
3	description: "Use when ZULU needs to launch PRISM Claude Code fleet slots. Calls the BOUNDED PowerShell launcher (launch-fleet-bounded.ps1) -- explicit slot list, max 6, DRY-RUN by default. Verifies processes, then writes a launch record to the vault."
4	version: 1.0.0
5	author: PRISM sierra slot (2026-06-14)
6	license: MIT
7	platforms: [windows]
8	metadata:
9	
... [+2778 chars truncated]

### Assistant | 2026-06-16T19:04:07.917Z

Now let me verify the calibration claims by reading the canonical SLOT_NAMES and the slot-tab-boot liveness guard, since the runaway-spawn analysis depends on whether cumulative calls are universe-bounded.

### Assistant | 2026-06-16T19:04:08.797Z

[tool_use: Grep]

### Assistant | 2026-06-16T19:04:09.272Z

[tool_use: Glob]

### Assistant | 2026-06-16T19:04:09.751Z

[tool_use: Glob]

### User | 2026-06-16T19:04:27.458Z

[tool_result] H:/Tools/prism-fleet\slot-tab-boot.ps1

### User | 2026-06-16T19:04:27.927Z

[tool_result] 109:export const SLOT_NAMES = [
110-  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
111-  "november", "oscar", "papa", "quebec", "romeo", "sierra", "tango", "uniform", "victor", "whiskey", "xray", "yankee", "zulu",
112-];
113-
114-/** Crash TTL — slot is considered crashed/reclaimable after this many ms with

### User | 2026-06-16T19:04:28.229Z

[tool_result] scripts\fleet\slot-tab-boot.ps1

### Assistant | 2026-06-16T19:04:31.122Z

The canonical SLOT_NAMES matches the hardcoded `$AllSlots` (26 slots, same order). Now let me verify the slot-tab-boot liveness guard, which is the load-bearing claim for whether spawning is universe-bounded.

### Assistant | 2026-06-16T19:04:31.318Z

[tool_use: Read]

### User | 2026-06-16T19:04:57.834Z

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

### Assistant | 2026-06-16T19:05:05.314Z

I now have the complete picture. Let me analyze the critical attack vector: whether the slot-tab-boot liveness guard actually bounds cumulative spawning, since this is the load-bearing claim for the runaway-spawn defense.

The key finding: `slot-tab-boot.ps1`'s liveness guard only fires on **Tier 1** (`Get-SlotSessionFromChatSlots`), which requires a `chat-slots.json` entry with `pid` matching a running process OR a JSONL mtime < 60s. Let me verify the exact behavior when a freshly-spawned slot has not yet written `chat-slots.json` (the cumulative-call window).

Let me check what `--dangerously-skip-permissions` plus the auto-start `/loop /goal` implies for cost, and confirm there's no rate-limit/global-count check anywhere in the chain.

### Assistant | 2026-06-16T19:05:06.491Z

[tool_use: Grep]

### User | 2026-06-16T19:05:11.106Z

[tool_result] scripts\fleet\launch-fleet-bounded.ps1:13:    - refuses an empty list and refuses more than -MaxSlots slots (default 6),
scripts\fleet\launch-fleet-bounded.ps1:27:.PARAMETER MaxSlots
scripts\fleet\launch-fleet-bounded.ps1:41:  pwsh -NoProfile -File H:\prism\scripts\fleet\launch-fleet-bounded.ps1 -Slots sierra,tango
scripts\fleet\launch-fleet-bounded.ps1:45:  pwsh -NoProfile -File H:\prism\scripts\
... [+1750 chars truncated]

### Assistant | 2026-06-16T19:05:57.838Z

I have everything I need. There is no cumulative/global cap anywhere in the chain — `-MaxSlots` is strictly per-call, and the launch log is best-effort write-only (never read back). Let me finalize my adversarial analysis.

Key findings analysis:

**Per-call cap vs cumulative (attack #1):** `-MaxSlots` (line 84) is checked only against `$requested.Count` within a single invocation. The launch log (line 132) is write-only — never read back to enforce a global running total. So N calls of 6 each = 6N spawns. The only thing that bounds this to 26 is the slot-tab-boot liveness guard — but that guard (Tier 1, lines 130/100-117) only fires if `chat-slots.json` already has a live `pid` for that slot OR the JSONL mtime is <60s. A freshly-launched Opus session takes many seconds to write `chat-slots.json` (it must boot, run `/checkin`). So a Hermes loop calling `-Slots <same 6> -Live` repeatedly within that startup window spawns duplicate tabs for the *same* slot — the dedup at line 89-90 is intra-call only.

**`-MaxSlots` override (attack #1b):** `-MaxSlots` is a caller-supplied `[int]` param with no upper bound and no minimum. A Hermes agent calling the launcher directly can pass `-MaxSlots 26` (or `-MaxSlots 999`) and the over-cap guard at line 84 is satisfied. The "cap" is fully caller-controlled.

Let me verify whether the model `[1m]` annotation and `--dangerously-skip-permissions` are real cost amplifiers worth noting, then write the verdict.

The findings are complete. Here is my adversarial review.

---

VERDICT: FAIL

summary: The per-call `-MaxSlots` guard works for a single invocation, slot-name validation correctly refuses garbage/empty/unknown with exit 1, dry-run is genuinely the default, and `Start-Process -ArgumentList` uses array-form (no shell-injection). BUT the runaway-spawn bound is NOT cumulative-safe and NOT universe-bounded in practice: `-MaxSlots` is a fully caller-controlled `[int]` with no clamp, the launch log is write-only (never read to enforce
... [+6338 chars truncated]
