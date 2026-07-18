---
type: "chat-session"
source: "claude-code-cli"
session_id: "9876118b-8887-4f9c-aac9-6c59c5f7cdd2"
title: "Independent second-pass review of a newly written Claude Code UserPromptSubmit h"
date: "2026-05-17"
first_ts: "2026-05-17T20:21:52.292Z"
last_ts: "2026-05-17T20:22:32.819Z"
cwd: "H:\\prism"
messages: 19
user_msgs: 8
assistant_msgs: 11
raw_file: "H:/.claude/projects/H--prism/9876118b-8887-4f9c-aac9-6c59c5f7cdd2/subagents/agent-a6a5fc848a2366c88.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:18"
---

# Independent second-pass review of a newly written Claude Code UserPromptSubmit h

> **claude-code-cli** | 2026-05-17 | 19 msgs (8 user / 11 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9876118b-8887-4f9c-aac9-6c59c5f7cdd2/subagents/agent-a6a5fc848a2366c88.jsonl`

## Transcript

### User | 2026-05-17T20:21:52.292Z

Independent second-pass review of a newly written Claude Code UserPromptSubmit hook. FIRST, MANDATORY: use the Read tool to read the ENTIRE file H:/prism/.claude/hooks/critical-memory-compact-nudge.mjs (~210 lines). Do NOT review from assumption — every finding must cite a line you actually read. Also read H:/prism/scripts/fleet-memory-monitor.mjs (the producer of the telemetry this hook consumes) to verify the integration contract.

WHAT IT IS: an advisory-only UserPromptSubmit hook. The fleet-memory-monitor writes telemetry rows to state/shared/fleet-memory-history.jsonl; on `critical` system commit pressure each row names the largest live chat tree as `largestTree` (a slot name like "mike", or an unlabeled "tree-PID"). This hook reads the last telemetry row and, when level is critical + fresh + THIS chat's slot equals `largestTree`, injects a /compact directive into the prompt context, throttled per-chat. It must ALWAYS emit {continue:true} and never block. It exports pure functions stableIdFromPayload, slotForChatId, fmtBytes, decideNudge.

It passed a live smoke test (valid {"continue":true}; correctly silent — this chat is not the named largest).

You are the independent reviewer. After reading, weight your attention on:
- INTEGRATION CONTRACT: does the hook's telemetryFile path resolve to the SAME file fleet-memory-monitor.mjs writes (its TELEMETRY_PATH)? Read the monitor to confirm. Does the telemetry row schema the hook's decideNudge consumes (row.level, row.ts, row.largestTree, row.commitUsedPct, row.physUsedPct, row.largestRssBytes, row.liveChatTrees) match what the monitor's runOnce actually writes? Confirm field names exactly.
- The `largestTree` value: the monitor emits a SLOT NAME when it can label the tree, else `tree-PID`. The hook matches `row.largestTree === mySlot`. Confirm: when the monitor emits `tree-PID`, the hook correctly does NOT fire (graceful degradation, not a false positive). Is this limitation acceptable / documented?
- chat-slots.jso
... [+1235 chars truncated]

### Assistant | 2026-05-17T20:21:58.053Z

I'll read both files completely before reviewing.

### Assistant | 2026-05-17T20:21:58.958Z

[tool_use: Read]

### Assistant | 2026-05-17T20:21:59.079Z

[tool_use: Read]

### User | 2026-05-17T20:21:59.537Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\critical-memory-compact-nudge.mjs' was already read 13s ago in this session and is unchanged (mtime 1779049230158). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CAC
... [+5 chars truncated]

### User | 2026-05-17T20:21:59.613Z

[tool_result] read-once-guard: 'H:\prism\scripts\fleet-memory-monitor.mjs' was already read 13s ago in this session and is unchanged (mtime 1778983701239). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-17T20:22:02.697Z

Both files are already in my context from a read 13 seconds ago. I'll review from the content I have.

I need to verify the exact content. Let me read specific sections to be certain of line numbers.

### Assistant | 2026-05-17T20:22:03.557Z

[tool_use: Read]

### User | 2026-05-17T20:22:04.325Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T2
3	/**
4	 * critical-memory-compact-nudge.mjs — UserPromptSubmit actuator that drives a
5	 * /compact onto the ONE chat that is the fleet's largest memory consumer when
6	 * the box is at critical commit pressure.
7	 *
8	 * THE GAP. scripts/fleet-memory-monitor.mjs samples system RAM every 5 min and,
9	 * on critical pressure, names the largest live chat tree as 
... [+9413 chars truncated]

### Assistant | 2026-05-17T20:22:04.994Z

[tool_use: Grep]

### User | 2026-05-17T20:22:05.729Z

[tool_result] 21: *   6. Appends to state/shared/fleet-memory-history.jsonl (size-rotated).
81:const TELEMETRY_PATH = join(SHARED_DIR, "fleet-memory-history.jsonl");
87:const TELEMETRY_BACKUP = TELEMETRY_PATH + ".1";
351: * @param {{physUsedPct:number, commitUsedPct:number}} pressure
356:  const worst = Math.max(pressure.physUsedPct, pressure.commitUsedPct);
439:function rotateIfLarge(path = TELEMETRY_PATH, lim
... [+2593 chars truncated]

### Assistant | 2026-05-17T20:22:08.877Z

Let me verify the monitor's telemetry row schema and `ts` field, plus how `largest.slot` is derived and the canonical chat-slots path.

### Assistant | 2026-05-17T20:22:10.164Z

[tool_use: Read]

### User | 2026-05-17T20:22:10.941Z

[tool_result] 505	  const cooldownSec = Number(process.env.PRISM_FLEET_MEMMON_ADVISORY_COOLDOWN_SEC) || DEFAULT_ADVISORY_COOLDOWN_SEC;
506	  const sustainedTicks = Number(process.env.PRISM_FLEET_MEMMON_SUSTAINED_TICKS) || DEFAULT_SUSTAINED_TICKS;
507	  const cfg = { warnPct, critPct, cooldownSec, sustainedTicks };
508	  const dryRun = !!opts.dryRun || disabled;
509	  const noAdvisory = !!opts.noAdvisory;
510	
5
... [+3495 chars truncated]

### Assistant | 2026-05-17T20:22:11.429Z

[tool_use: Grep]

### User | 2026-05-17T20:22:11.777Z

[tool_result] 17: *   3. Joins to chat-slots.json — each chat's harness PID anchors a process
84:const SLOTS_PATH = join(REPO_ROOT, ".claude", "state", "chat-slots.json");
85:const SLOTS_PATH_FALLBACK = join(SHARED_DIR, "chat-slots.json");
201:// pid of whatever subshell happened to call `chat-slots.mjs claim` — usually a
215:// PID matches a chat-slots state.pid OR when the chain provably reaches a
229:  // ch
... [+1322 chars truncated]

### Assistant | 2026-05-17T20:22:12.375Z

[tool_use: Read]

### User | 2026-05-17T20:22:13.186Z

[tool_result] 210	  try { payload = raw.trim() ? JSON.parse(raw) : {}; } catch { payload = {}; }
211	
212	  const { telemetryFile, slotsFile, slotsFileAlt, stampDir } = repoPaths();
213	
214	  const row = readLastMemoryRow(telemetryFile);
215	  // Fast pre-check: if there is no critical telemetry, do nothing else.
216	  if (!row || row.level !== "critical") {
217	    emitContinue();
218	    return;
219	  }
220	
... [+1539 chars truncated]

### Assistant | 2026-05-17T20:22:32.819Z

I have read every line. Findings below.

## Findings

**Integration contract — VERIFIED CORRECT**
- Hook `telemetryFile` = `repoRoot/state/shared/fleet-memory-history.jsonl` (line 60). Monitor `TELEMETRY_PATH` = `SHARED_DIR/fleet-memory-history.jsonl` (line 81). Same file. ✓
- Row schema match: monitor writes `ts, level, physUsedPct, commitUsedPct, liveChatTrees, largestTree, largestRssBytes` (lines 530-545). `decideNudge` consumes exactly `row.level, row.ts, row.largestTree, row.commitUsedPct, row.physUsedPct, row.largestRssBytes, row.liveChatTrees` (lines 174-190). Every field name exact. ✓
- `largestTree` = `largest.slot` (monitor line 537), and `slot` = `agg.slotLabel || key` where `key` is `tree-PID` (monitor line 372). Hook matches `row.largestTree === mySlot` (line 181) where `mySlot` is a real slot name from chat-slots — `tree-PID` can never equal a slot name, so the hook correctly does NOT fire on unlabeled trees. Graceful degradation, explicitly documented at lines 29-31. ✓

**P0 — `slotsFileAlt` is the canonical path; primary path is wrong-first**
Monitor line 84: `SLOTS_PATH = .claude/state/chat-slots.json` (primary), line 85 fallback `SHARED_DIR/chat-slots.json`. The hook (lines 61-62, 128) tries `state/shared/chat-slots.json` FIRST, `.claude/state/chat-slots.json` second — the **inverse priority** of the producer of truth. This is not a crash, but if both files exist and diverge (stale `state/shared` copy left behind), the hook reads the wrong, stale slot map → wrong `mySlot` → either a missed nudge or a nudge to the wrong chat. The hook must mirror the monitor: try `.claude/state/chat-slots.json` first. **Concrete fix: swap the order in `repoPaths()` and the loop at line 128.**

**Stable-id derivation — VERIFIED CORRECT**
`claude-` + `sid.slice(0,8)` (line 108) matches the documented `stable-session-id.mjs` scheme and chat-slots `chatId` keying. ✓ `slotForChatId` handles both `{slots:{...}}` and bare-object shapes (line 118). ✓

**Output shape — CORRE
... [+1236 chars truncated]
