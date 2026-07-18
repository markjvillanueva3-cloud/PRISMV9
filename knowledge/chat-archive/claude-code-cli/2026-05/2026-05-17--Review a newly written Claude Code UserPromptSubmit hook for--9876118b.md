---
type: "chat-session"
source: "claude-code-cli"
session_id: "9876118b-8887-4f9c-aac9-6c59c5f7cdd2"
title: "Review a newly written Claude Code UserPromptSubmit hook for correctness, end to"
date: "2026-05-17"
first_ts: "2026-05-17T20:21:37.982Z"
last_ts: "2026-05-17T20:22:10.943Z"
cwd: "H:\\prism"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/9876118b-8887-4f9c-aac9-6c59c5f7cdd2/subagents/agent-adbefb4fd0c4227f1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Review a newly written Claude Code UserPromptSubmit hook for correctness, end to

> **claude-code-cli** | 2026-05-17 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9876118b-8887-4f9c-aac9-6c59c5f7cdd2/subagents/agent-adbefb4fd0c4227f1.jsonl`

## Transcript

### User | 2026-05-17T20:21:37.982Z

Review a newly written Claude Code UserPromptSubmit hook for correctness, end to end. FIRST use the Read tool to read the ENTIRE file: H:/prism/.claude/hooks/critical-memory-compact-nudge.mjs (~210 lines). You may also read H:/prism/.claude/hooks/fleet-task-health-stop.mjs and H:/prism/scripts/fleet-memory-monitor.mjs for convention/integration reference.

WHAT IT IS: a UserPromptSubmit hook, advisory-only. PRISM's fleet-memory-monitor (scripts/fleet-memory-monitor.mjs) samples system RAM every 5 min and on `critical` commit pressure names the largest live chat tree (a slot name, or an unlabeled `tree-PID`) in telemetry rows appended to state/shared/fleet-memory-history.jsonl. This hook, on every UserPromptSubmit: reads that telemetry's last row; if it is fresh and `critical`, resolves THIS chat's slot from its session_id (`claude-`+first-8-hex) via chat-slots.json; if this chat's slot IS the row's `largestTree`, injects a blunt /compact directive into the prompt context — throttled per-chat via a stamp file. It fires in at most one chat per critical episode. It must ALWAYS emit {continue:true} and NEVER block the prompt.

It passed a live smoke test: piping a UserPromptSubmit payload produced valid {"continue":true} and correctly stayed silent (this chat is not the named-largest tree).

Check rigorously:
- Never blocks / never hangs: readStdin is time-bounded (STDIN_READ_TIMEOUT_MS); every path ends in emitContinue; main().catch() is the last-resort net.
- decideNudge is a pure function — verify purity and that it returns nudge:false for: no telemetry, non-critical level, stale row (older than freshMs), unresolved slot, this-chat-is-not-largestTree, and within-cooldown. Returns nudge:true with non-empty text ONLY when all conditions pass.
- stableIdFromPayload: correct for a valid session_id, null for missing/short.
- slotForChatId: correct against both chat-slots.json shapes ({slots:{...}} and a flat object); null when the chatId holds no slot.
- The stamp throttl
... [+521 chars truncated]

### Assistant | 2026-05-17T20:21:44.848Z

I'll read the hook file and the reference files.

### Assistant | 2026-05-17T20:21:45.726Z

[tool_use: Read]

### Assistant | 2026-05-17T20:21:46.133Z

[tool_use: Read]

### Assistant | 2026-05-17T20:21:46.187Z

[tool_use: Read]

### User | 2026-05-17T20:21:48.919Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * critical-memory-compact-nudge.mjs — UserPromptSubmit actuator that drives a
5	 * /compact onto the ONE chat that is the fleet's largest memory consumer when
6	 * the box is at critical commit pressure.
7	 *
8	 * THE GAP. scripts/fleet-memory-monitor.mjs samples system RAM every 5 min and,
9	 * on critical pressure, names the largest live chat tree as 
... [+11270 chars truncated]

### User | 2026-05-17T20:21:49.447Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * fleet-task-health-stop.mjs — Stop-hook arm of the scheduled-task health
5	 * watchdog (scripts/fleet-task-health-watch.mjs).
6	 *
7	 * THE GAP. PRISM's crash-prevention safety net is a set of Windows scheduled
8	 * tasks (Fleet Reaper, Fleet Memory Monitor, Cleanup Orchestrator, …). Nothing
9	 * watches whether those tasks are themselves healthy — a t
... [+9494 chars truncated]

### User | 2026-05-17T20:21:49.490Z

[tool_result] 1	/**
2	 * fleet-memory-monitor.mjs — durable system-RAM + per-slot memory monitor.
3	 *
4	 * Sits ALONGSIDE the fleet-reaper. The reaper reaps orphan processes of
5	 * CRASHED slots (after a 10-min confirm window) and runs at +210s phase off
6	 * the host. That covers post-crash cleanup, but leaves a real gap: when ALL
7	 * 13 chats are LIVE and the box drifts toward commit-memory saturation, the
... [+32087 chars truncated]

### Assistant | 2026-05-17T20:22:10.943Z

I've reviewed the hook end to end. The reference file `fleet-memory-monitor.mjs` was already read (per the READ-ONCE reminder, using existing knowledge).

## Code Quality Analysis Report

### Summary
- Files Analyzed: 1 (`critical-memory-compact-nudge.mjs`)
- Issues Found: 2 (1 P1, 1 P2)
- Overall: well-built, defensive, advisory contract respected

### P0 (bugs / block / hang / crash)
None. Every path terminates in `emitContinue()`; `main().catch()` is the final net (line 255). `readStdin` is timer-bounded (line 89) and idempotent via the `done` guard. All file IO (`readSlots`, `readLastMemoryRow`, `statSync`, `writeFileSync`/`mkdirSync`) is wrapped in try/catch. The fast pre-check (lines 216-219) reads only `row.level` — it cannot skip a real critical case because a real critical row always has `level === "critical"`; a non-critical row legitimately short-circuits.

### P1 (logic / edge-case)

**1. `slotsFile` / `slotsFileAlt` path order disagrees with the producer — line 60-62, 222.**
The hook checks `state/shared/chat-slots.json` FIRST, `.claude/state/chat-slots.json` second. But `fleet-memory-monitor.mjs` (the telemetry producer) and `chat-slots.mjs` treat `.claude/state/chat-slots.json` as canonical (`SLOTS_PATH`), with `state/shared/` as the *fallback* (`SLOTS_PATH_FALLBACK`). If both files exist and have drifted, this hook resolves `mySlot` from the stale shared-dir copy while the monitor wrote `largestTree` from the canonical copy — producing a false `not-largest` (missed nudge) or, worse, a false-positive nudge on the wrong chat. Fix: swap the array order in `repoPaths()` to `[.claude/state first, state/shared second]` to match the producer.

### P2 (deferred)

**2. `decideNudge` purity — technically pure, but verify `row` mutation contract.** `decideNudge` reads `row.level`, `row.ts`, `row.largestTree`, `row.commitUsedPct`, `row.physUsedPct`, `row.largestRssBytes`, `row.liveChatTrees` — all reads, no writes; `nowMs`/`lastNudgeMs`/`cooldownMs`/`freshMs` pa
... [+1130 chars truncated]
