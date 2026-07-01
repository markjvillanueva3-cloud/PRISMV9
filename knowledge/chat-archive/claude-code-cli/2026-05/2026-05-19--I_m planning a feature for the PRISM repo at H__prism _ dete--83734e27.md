---
type: "chat-session"
source: "claude-code-cli"
session_id: "83734e27-22c8-45b2-bf03-84f276b2cdd7"
title: "I'm planning a feature for the PRISM repo at H:/prism — detecting when a Claude "
date: "2026-05-19"
first_ts: "2026-05-19T16:30:28.678Z"
last_ts: "2026-05-19T16:50:26.260Z"
cwd: "H:\\prism"
messages: 104
user_msgs: 45
assistant_msgs: 59
raw_file: "H:/.claude/projects/H--prism/83734e27-22c8-45b2-bf03-84f276b2cdd7/subagents/agent-a5a47cc1141797dea.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# I'm planning a feature for the PRISM repo at H:/prism — detecting when a Claude 

> **claude-code-cli** | 2026-05-19 | 104 msgs (45 user / 59 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/83734e27-22c8-45b2-bf03-84f276b2cdd7/subagents/agent-a5a47cc1141797dea.jsonl`

## Transcript

### User | 2026-05-19T16:30:28.678Z

I'm planning a feature for the PRISM repo at H:/prism — detecting when a Claude Code chat is HUNG/frozen. I need to map the EXISTING hang/crash-detection infrastructure so I don't duplicate it.

Please investigate and report (medium thoroughness):

1. Read `H:/prism/scripts/fleet-memory-monitor.mjs` (head + key functions) and `H:/prism/scripts/fleet-reaper-sweep.mjs` — specifically the "crash-watch" feature. Report: how is a HUNG/frozen chat detected? I saw `state/shared/chat-crash-postmortems.jsonl` records with fields `frozenMs`, `frozenMinutes`, `lastHeartbeatIso`, `slot`, `chatId`, `sweepGapMs`, `pressureTier`. Report which script WRITES that file and the exact logic that classifies a chat as crashed/frozen (the heartbeat-staleness threshold).

2. Read `H:/prism/.claude/helpers/chat-slots.mjs` — focus on the heartbeat mechanism: how is `lastHeartbeat` written and updated for a slot? Which hook/helper updates it (I think there's a heartbeat-keepalive). What's the stale/crashed threshold?

3. Grep `.claude/hooks/` and `.claude/helpers/` for `heartbeat` — list every hook/helper that touches chat heartbeats. Report what fires them (SessionStart? UserPromptSubmit? a cron?).

4. Key question for my design: is it STRUCTURALLY POSSIBLE for an in-session monitor (a `Monitor` tool armed inside chat X) to detect that chat X itself is hung? Or must hang-detection always be done by a SEPARATE process (cross-chat / scheduled task)? Report the evidence — e.g., when a chat is frozen, does its heartbeat stop updating? Is the heartbeat updated by the harness independently of Claude processing, or only when Claude/a hook runs?

5. Report whether there is any existing scheduled Windows task or cron that already does fleet-wide hang detection (I know of `PRISM Fleet Reaper` and `PRISM Fleet Memory Monitor` scheduled tasks).

Report file paths + line numbers + exact thresholds. Keep under 600 words.

### Assistant | 2026-05-19T16:30:50.340Z

I'll systematically investigate the hang/crash detection infrastructure in PRISM.

### Assistant | 2026-05-19T16:30:50.342Z

[tool_use: Read]

### Assistant | 2026-05-19T16:30:50.349Z

[tool_use: Read]

### Assistant | 2026-05-19T16:30:50.355Z

[tool_use: Read]

### Assistant | 2026-05-19T16:30:50.361Z

[tool_use: Bash]

### User | 2026-05-19T16:31:10.515Z

[tool_result] 1	/**
2	 * fleet-memory-monitor.mjs — durable system-RAM + per-slot memory monitor.
3	 *
4	 * Sits ALONGSIDE the fleet-reaper. The reaper reaps orphan processes of
5	 * CRASHED slots (after a 10-min confirm window) and runs at +210s phase off
6	 * the host. That covers post-crash cleanup, but leaves a real gap: when ALL
7	 * 13 chats are LIVE and the box drifts toward commit-memory saturation, the
... [+5575 chars truncated]

### User | 2026-05-19T16:31:13.251Z

[tool_result] 1	// NOTE: no shebang. This file IS run as a CLI (--once / --monitor-loop / etc.)
2	// but ALL its invocations go through explicit `node X.mjs` (the scheduled task,
3	// the Stop-hook arm, the /fleet-reaper skill, the alpha-guardian) — never via
4	// chmod+x + `./X.mjs` direct execution. A line-1 `#!` is fine for node + esbuild
5	// + bash but vite's SSR transform does NOT strip it; it injects its
... [+9045 chars truncated]

### User | 2026-05-19T16:31:14.878Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * chat-slots.mjs — 7-slot fleet manager for concurrent PRISM chats.
4	 *
5	 * Replaces opaque 8-char hex chat ids in handoff filenames with NATO-phonetic
6	 * slot names (alpha..juliett — 9 work + 1 hygiene = 10 total). Each Claude/Codex
7	 * session at SessionStart claims the first free slot; the slot binding lives
8	 * for the lifetime of the chat (or until the 10-
... [+8594 chars truncated]

### User | 2026-05-19T16:31:44.768Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: $null: ambiguous redirect
/usr/bin/bash: line 1: Select-Object: command not found

### Assistant | 2026-05-19T16:31:57.659Z

Let me retry with proper PowerShell syntax and continue the investigation.

### Assistant | 2026-05-19T16:31:58.010Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:32:01.210Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:32:01.218Z

[tool_use: Grep]

### Assistant | 2026-05-19T16:32:01.221Z

[tool_use: Grep]

### User | 2026-05-19T16:32:27.238Z

[tool_result] Found 31 files
.claude\helpers\chat-slots.mjs
.claude\helpers\slot-worktree-bootstrap.mjs
.claude\helpers\process-slot-map.mjs
.claude\helpers\install-fleet-reaper-task.ps1
.claude\helpers\slot-job-object.ps1
.claude\helpers\slot-identity-cache.mjs
.claude\helpers\precompact-handoff.mjs
.claude\helpers\per-agent-handoff.mjs
.claude\helpers\chat-slots-transcript-gate.test.mjs
.claude\helpers\chat-s
... [+861 chars truncated]

### User | 2026-05-19T16:32:29.883Z

[tool_result] Found 24 files
.claude\hooks\wiki-propagation-watchdog-stop.mjs
.claude\hooks\unit-knowledge-pack-inject.test.mjs
.claude\hooks\task-freshness-gate.mjs
.claude\hooks\session-start-terminal-pin.mjs
.claude\hooks\fleet-task-health-stop.mjs
.claude\hooks\session-start-auto-resume.mjs
.claude\hooks\chat-bus-inject.mjs
.claude\hooks\__tests__\pick-prefresh-resolve.test.mjs
.claude\hooks\pick-prefresh-i
... [+684 chars truncated]

### User | 2026-05-19T16:32:49.375Z

[tool_result] 2F 1D:

./ chat-slot-heartbeat.mjs heartbeat-keepalive.mjs

### User | 2026-05-19T16:33:00.800Z

[tool_result] 0 for '*heartbeat*'

### Assistant | 2026-05-19T16:33:02.149Z

Now let me read the key heartbeat-related hooks and examine the crash detection logic.

### Assistant | 2026-05-19T16:33:02.559Z

[tool_use: Read]

### Assistant | 2026-05-19T16:33:03.915Z

[tool_use: Read]

### Assistant | 2026-05-19T16:33:03.921Z

[tool_use: Bash]

### User | 2026-05-19T16:33:23.045Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * heartbeat-keepalive.mjs — UserPromptSubmit hook that refreshes this chat's
5	 * chat-slots.json heartbeat between tool calls.
6	 *
7	 * Why this exists:
8	 *   Before this hook, a chat that sat idle for >10 min (CRASH_TTL_MS) would
9	 *   have its slot reclaimed by the next peer chat's /checkin — even though
10	 *   the chat was perfectly alive, just 
... [+8674 chars truncated]

### User | 2026-05-19T16:33:26.454Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * chat-slot-heartbeat.mjs — PostToolUse hook (all matchers)
5	 *
6	 * The missing middle of the fleet-slot lifecycle:
7	 *
8	 *   SessionStart  →  session-start-claim-slot.mjs   (claims a slot)
9	 *   PostToolUse   →  chat-slot-heartbeat.mjs        (THIS — keeps it warm)   ← was never built
10	 *   Stop          →  stop-release-slot.mjs          (releas
... [+5351 chars truncated]

### User | 2026-05-19T16:33:46.263Z

[tool_result] 2F 1D:

./ fleet-reaper-crash-watch.mjs fleet-reaper-crash-watch.test.mjs

### Assistant | 2026-05-19T16:33:54.877Z

Now let me examine the crash-watch library:

### Assistant | 2026-05-19T16:33:55.110Z

[tool_use: Read]

### Assistant | 2026-05-19T16:33:55.980Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:33:55.989Z

[tool_use: Bash]

### User | 2026-05-19T16:34:15.420Z

[tool_result] 1	/**
2	 * fleet-reaper-crash-watch.mjs — FLEET-REAPER-MS1 U-FR-CRASH-WATCH
3	 *
4	 * The reaper kills orphan PROCESSES but is BLIND to chat CRASHES — it never
5	 * reconciles "slot X's chat just died" into an actionable signal. When 1-2
6	 * chats keep crashing the operator has no forensic trail (which slot, when,
7	 * at what heartbeat age, under what memory pressure).
8	 *
9	 * This module is t
... [+7437 chars truncated]

### User | 2026-05-19T16:34:34.537Z

[tool_result] 11:33 H:/prism/state/shared/chat-crash-postmortems.jsonl  193.0K

### User | 2026-05-19T16:34:50.389Z

[tool_result] {"schemaVersion":1,"ts":"2026-05-19T13:59:53.237Z","kind":"chat-crash","slot":"alpha","chatId":"claude-1c9a87e8","lastHeartbeatIso":"2026-05-19T12:42:13.712Z","frozenMs":4659525,"frozenMinutes":78,"sweepGapMs":51554,"memUsedPct":48.3,"pressureTier":"normal"}
{"schemaVersion":1,"ts":"2026-05-19T13:59:53.237Z","kind":"chat-crash","slot":"bravo","chatId":"claude-1f861b7a","lastHeartbeatIso":"2026-05-
... [+2233 chars truncated]

### Assistant | 2026-05-19T16:34:54.948Z

Now let me check the scheduled tasks and find where heartbeat is written:

### Assistant | 2026-05-19T16:34:55.662Z

[tool_use: Read]

### Assistant | 2026-05-19T16:34:56.511Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:34:56.522Z

[tool_use: Bash]

### User | 2026-05-19T16:35:24.586Z

[tool_result] 100	//  Wrapper skills (checkin-<nato> / handoff-<nato> / precompact-<nato> /
101	//  startup-<nato>) are auto-generated by scripts/generate-per-slot-wrappers.mjs
102	//  which reads its own copy of this list — keep BOTH in sync when expanding.
103	export const SLOT_NAMES = [
104	  "alpha", "bravo", "charlie", "delta", "echo", "foxtrot", "golf", "hotel", "india", "juliett", "kilo", "lima", "mike",
... [+4757 chars truncated]

### User | 2026-05-19T16:35:59.675Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
24 matches in 8F:

[file] 1082 (1):
     0: keep heartbeat-crashed slots whose owning

[file] 1244 (1):
     0: 

[file] 1284 (1):
     0: ...${action}'; valid: claim, heartbeat, rename, release, reclaim, status, find, gol...


... [+1583 chars truncated]

### User | 2026-05-19T16:36:27.245Z

[tool_result] (Bash completed with no output)

### system

... [24 middle messages omitted -- see raw_file] ...

### Assistant | 2026-05-19T16:39:30.162Z

[tool_use: Bash]

### User | 2026-05-19T16:39:50.246Z

[tool_result] Found 31 files
.claude\helpers\chat-slots.mjs
.claude\helpers\slot-worktree-bootstrap.mjs
.claude\helpers\process-slot-map.mjs
.claude\helpers\install-fleet-reaper-task.ps1
.claude\helpers\slot-job-object.ps1
.claude\helpers\slot-identity-cache.mjs
.claude\helpers\precompact-handoff.mjs
.claude\helpers\per-agent-handoff.mjs
.claude\helpers\chat-slots-transcript-gate.test.mjs
.claude\helpers\chat-s
... [+861 chars truncated]

### User | 2026-05-19T16:39:52.905Z

[tool_result] Found 171 files
scripts\fleet-reaper-sweep.mjs
scripts\mcp-server-supervisor.mjs
scripts\fleet-services-watchdog.mjs
scripts\lib\atomic-json.test.mjs
scripts\generate-per-slot-wrappers.mjs
scripts\lib\feature-gap-classifier.mjs
scripts\merge-augmentations.mjs
scripts\regen-viz.mjs
scripts\lib\master-index-search-lib.test.mjs
scripts\lib\shipped-units-source-of-truth.test.mjs
scripts\lib\master-ind
... [+6227 chars truncated]

### User | 2026-05-19T16:39:56.299Z

[tool_result] Found 24 files
.claude\hooks\wiki-propagation-watchdog-stop.mjs
.claude\hooks\unit-knowledge-pack-inject.test.mjs
.claude\hooks\task-freshness-gate.mjs
.claude\hooks\session-start-terminal-pin.mjs
.claude\hooks\fleet-task-health-stop.mjs
.claude\hooks\session-start-auto-resume.mjs
.claude\hooks\chat-bus-inject.mjs
.claude\hooks\__tests__\pick-prefresh-resolve.test.mjs
.claude\hooks\pick-prefresh-i
... [+684 chars truncated]

### User | 2026-05-19T16:40:52.297Z

[tool_result] H:/prism/state/shared/chat-crash-postmortems.jsonl
H:/prism/state/shared/chat-crash-postmortems.jsonl.1
H:/prism/state/shared/fleet-reaper-crash-watch-snapshot.json
H:/prism/state/shared/fleet-reaper-crash-watch-snapshot.json.tmp.14260
H:/prism/state/shared/fleet-reaper-crash-watch-snapshot.json.tmp.25400
H:/prism/state/shared/fleet-reaper-crash-watch-snapshot.json.tmp.37908

### Assistant | 2026-05-19T16:40:54.458Z

Good! Now let me read the crash-watch library and examine the heartbeat hooks more carefully.

### Assistant | 2026-05-19T16:40:54.875Z

[tool_use: Read]

### Assistant | 2026-05-19T16:40:55.561Z

[tool_use: Read]

### Assistant | 2026-05-19T16:40:55.567Z

[tool_use: Read]

### Assistant | 2026-05-19T16:40:55.572Z

[tool_use: Read]

### User | 2026-05-19T16:41:05.795Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\heartbeat-keepalive.mjs' was already read 8m ago in this session and is unchanged (mtime 1778783183654). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T16:41:06.468Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\chat-slot-heartbeat.mjs' was already read 8m ago in this session and is unchanged (mtime 1778638513977). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-19T16:41:14.977Z

[tool_result] 1	/**
2	 * fleet-reaper-crash-watch.mjs — FLEET-REAPER-MS1 U-FR-CRASH-WATCH
3	 *
4	 * The reaper kills orphan PROCESSES but is BLIND to chat CRASHES — it never
5	 * reconciles "slot X's chat just died" into an actionable signal. When 1-2
6	 * chats keep crashing the operator has no forensic trail (which slot, when,
7	 * at what heartbeat age, under what memory pressure).
8	 *
9	 * This module is t
... [+7437 chars truncated]

### User | 2026-05-19T16:41:23.378Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T4
3	/**
4	 * periodic-checkin.mjs — UserPromptSubmit periodic heartbeat + chat poll
5	 *
6	 * WHY: Concurrent chats (4+) need regular situational awareness of each
7	 * other's work. SessionStart-only coordination goes stale fast. This hook
8	 * fires on every UserPromptSubmit with a 20-minute cooldown per session:
9	 *   1. Posts a heartbeat to AGENT_CHAT.jsonl (
... [+4519 chars truncated]

### Assistant | 2026-05-19T16:41:28.461Z

Let me examine the fleet-reaper-sweep file more carefully, especially around crash detection, and check for scheduled tasks.

### Assistant | 2026-05-19T16:41:28.721Z

[tool_use: Read]

### Assistant | 2026-05-19T16:41:30.516Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:41:30.530Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:41:39.308Z

[tool_use: Bash]

### User | 2026-05-19T16:41:46.322Z

[tool_result] 0	// NOTE: no shebang. This file IS run as a CLI (--once / --monitor-loop / etc.)
1	// but ALL its invocations go through explicit `node X.mjs` (the scheduled task,
2	// the Stop-hook arm, the /fleet-reaper skill, the alpha-guardian) — never via
3	// chmod+x + `./X.mjs` direct execution. A line-1 `#!` is fine for node + esbuild
4	// + bash but vite's SSR transform does NOT strip it; it injects its
... [+18832 chars truncated]

### User | 2026-05-19T16:42:11.482Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
11 matches in 5F:

[file] 1792 (1):
     0: ${ap.error}`);

[file] 1802 (1):
     0: slot ${c.slot} (${c.chatId}) — heartbeat frozen ${Math.round(c.frozenMs / 600...

[file] 1818 (1):
     0: ${ws.error}`);

[file] 1823 (1):
  
... [+536 chars truncated]

### User | 2026-05-19T16:43:23.419Z

[tool_result] Exit code 255

### User | 2026-05-19T16:43:46.635Z

[tool_result] Exit code 127
/usr/bin/bash: line 1: Get-ScheduledTask: command not found
/usr/bin/bash: line 1: Select-Object: command not found
/usr/bin/bash: line 1: Format-List: command not found

### Assistant | 2026-05-19T16:43:51.322Z

Let me use PowerShell correctly and search for more context on crash detection and when heartbeats are updated.

### Assistant | 2026-05-19T16:43:51.775Z

[tool_use: PowerShell]

### Assistant | 2026-05-19T16:43:52.202Z

[tool_use: Read]

### Assistant | 2026-05-19T16:43:53.116Z

[tool_use: Bash]

### User | 2026-05-19T16:48:03.898Z

[tool_result] (PowerShell completed with no output)

### User | 2026-05-19T16:48:25.802Z

[tool_result] 1750	      // let the GPU/Ollama layer abort the sweep.
1751	      coordinator.error = err && err.message ? err.message : String(err);
1752	      caveats.push(`coordinator step failed: ${coordinator.error}`);
1753	    }
1754	  }
1755	
1756	  // `ok` reflects ONLY the reap mission — its MS0 contract. The CLI exit code,
1757	  // the Stop hook, and the Monitor loop all read `ok` as "the reaper did i
... [+4846 chars truncated]

### User | 2026-05-19T16:48:59.940Z

[tool_result] 2 matches in 1F:

[file] H:/prism/.claude/hooks/heartbeat-keepalive.mjs (2):
     4: * heartbeat-keepalive.mjs — UserPromptSubmit hook that refreshes this chat's
    17: *   This hook fires on every UserPromptSubmit. It (a) resolves the stable

### Assistant | 2026-05-19T16:49:18.185Z

Now let me search for when heartbeats are written and check if there's an in-session monitoring possibility.

### Assistant | 2026-05-19T16:49:24.519Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:49:28.700Z

[tool_use: Bash]

### Assistant | 2026-05-19T16:49:28.710Z

[tool_use: Read]

### Assistant | 2026-05-19T16:49:28.714Z

[tool_use: Read]

### User | 2026-05-19T16:49:47.943Z

[tool_result] 0	#!/usr/bin/env node
1	// tier: T4
2	/**
3	 * chat-slot-heartbeat.mjs — PostToolUse hook (all matchers)
4	 *
5	 * The missing middle of the fleet-slot lifecycle:
6	 *
7	 *   SessionStart  →  session-start-claim-slot.mjs   (claims a slot)
8	 *   PostToolUse   →  chat-slot-heartbeat.mjs        (THIS — keeps it warm)   ← was never built
9	 *   Stop          →  stop-release-slot.mjs          (release
... [+3159 chars truncated]

### User | 2026-05-19T16:49:48.534Z

[tool_result] 0	#!/usr/bin/env node
1	// tier: T3
2	/**
3	 * heartbeat-keepalive.mjs — UserPromptSubmit hook that refreshes this chat's
4	 * chat-slots.json heartbeat between tool calls.
5	 *
6	 * Why this exists:
7	 *   Before this hook, a chat that sat idle for >10 min (CRASH_TTL_MS) would
8	 *   have its slot reclaimed by the next peer chat's /checkin — even though
9	 *   the chat was perfectly alive, just w
... [+3847 chars truncated]

### User | 2026-05-19T16:50:01.534Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
8 matches in 2F:

[file] 36 (1):
     0: *

[file] H:/prism/.claude/hooks/chat-slot-heartbeat.mjs (7):
     4: * chat-slot-heartbeat.mjs — PostToolUse hook (all matchers)
    12: * Before this hook existed, a slot's `lastHeartb
... [+435 chars truncated]

### User | 2026-05-19T16:50:04.593Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
16 matches in 8F:

[file] 130 (1):
     0: "invalid-heartbeat" };

[file] 151 (1):
     0: refresh failed for slot=${mySlot} chatId=${chatId} (${res.error.code || res.e...

[file] 154 (1):
     0: "heartbeat-error", error: Stri
... [+260 chars truncated]

### Assistant | 2026-05-19T16:50:26.260Z

Excellent! Now I have enough detail. Let me compile the comprehensive report.

## Investigation Report: PRISM Hang-Detection Infrastructure

Based on analysis of the codebase, here are my findings:

### 1. **Crash/Freeze Detection Mechanism**

The hang-detection is implemented in **two layers**:

**Layer 1: chat-slots.mjs (H:/prism/.claude/helpers/chat-slots.mjs, lines 108-120)**
- **CRASH_TTL_MS = 600,000ms (10 minutes)** — slot considered crashed if no heartbeat update in 10 minutes
- **STALE_TTL_MS = 120,000ms (2 minutes)** — yellow-flag threshold (alive but stale)
- Function `classifySlot()` (lines 293-301) returns: `"alive"` | `"stale"` | `"crashed"` | `"idle"`

**Layer 2: fleet-reaper-crash-watch.mjs (H:/prism/scripts/lib/fleet-reaper-crash-watch.mjs, lines 1-176)**
- **DEFAULT_CRASH_STALE_MS = 600,000ms (10 minutes)** — matches chat-slots threshold
- Detects crashes by **heartbeat staleness + chatId persistence**:
  - Slot is classified "frozen" when: `lastHeartbeatMs` doesn't advance between sweeps AND `chatId` unchanged AND age ≥ 10 minutes
  - Fields written to `state/shared/chat-crash-postmortems.jsonl` (lines 107-124):
    - `frozenMs` — total frozen duration (now - lastHeartbeatMs)
    - `frozenMinutes` — humanized (minutes)
    - `lastHeartbeatIso` — ISO timestamp of last heartbeat
    - `slot` — which slot (alpha..zulu)
    - `chatId` — chat session identifier
    - `sweepGapMs` — time between previous and current sweep
    - `pressureTier` — memory pressure classification
    - `memUsedPct` — host memory usage % at detection time

### 2. **Heartbeat Mechanism & Writers**

**Where lastHeartbeat is Written:**
- **Session Start**: `session-start-claim-slot.mjs` (via `claimSlot()`, sets initial `lastHeartbeat` to now)
- **UserPromptSubmit**: `heartbeat-keepalive.mjs` (lines 3-28) — fires on EVERY user prompt, refreshes if age > 60s
- **PostToolUse**: `chat-slot-heartbeat.mjs` (lines 3-48) — fires AFTER every tool call, debounced ~45s refresh window
- **M
... [+3207 chars truncated]
