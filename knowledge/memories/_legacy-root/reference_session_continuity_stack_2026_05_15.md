---
name: reference-session-continuity-stack-2026-05-15
description: "Three-piece session-continuity stack shipped 2026-05-15 — compact-boundary fix, post-compact auto-resume, terminal-window slot pinning. Makes /compact + new-chat-in-same-window seamless across the 10-chat fleet."
metadata:  
source: prism-memory
synced: 2026-05-18T01:02:09.892Z
aliases: reference_session_continuity_stack_2026_05_15
---


# Session Continuity Stack — shipped 2026-05-15 by slot alpha (claude-6eac1b66)

Solves: a user observed that post-`/compact` auto-continue worked inconsistently (sometimes the new chat resumed work without being prompted, sometimes the user had to type "continue") AND that 6-7 concurrent PowerShell windows would lose their slot bindings when a chat got a new session id (e.g. via /compact, /clear, or fresh `claude` invocation).

Three pieces shipped together:

## 1. Compact-boundary byte estimate (precompact-auto-trigger.mjs)

**Root cause:** `lastAssistantTokens()` in the existing hook could return null in a race window (transcript JSONL is being written by Claude harness while the hook reads it backward). On null, the fallback `estimateFromBytes()` divided the **entire** transcript file size by 3.5 chars/token. After one `/compact`, the transcript JSONL is APPENDED to — pre-compact bytes stay on disk forever. A 5 MB transcript reports as 1,435,124 tokens → HARD BLOCK at 900K. Observed 2026-05-15, session 6eac1b66 immediately after a successful compact. Exact match for `st.size / 3.5`.

**Fix:**
- New `findLastCompactOffset(transcriptPath, fileSize)` scans the tail for `"isCompactSummary":true` (the Claude harness marker for a compact boundary entry). Returns byte offset of the line AFTER the most recent compact summary. 8 MB scan window so deeply-nested chats can still find their boundary.
- `estimateFromBytes()` now subtracts the compact offset, counting only `st.size - compactOffset`. When no marker is in the scan window, falls back to whole-file size (legacy behavior — correct for fresh sessions).
- Sanity floor tightened: `tokens > CONTEXT_CAP * 1.5` → `* 1.1`. Broken estimates can no longer get within striking distance of HARD blocking.

**Verified:** live transcript at 5.29 MB, compact offset 4,870,445, post-compact bytes 894,867 / 3.5 = 255,676 tokens. Hook returns `{"continue":true,"suppressOutput":true}` correctly.

## 2. Post-compact auto-resume (session-start-auto-resume.mjs)

**Wired:** new SessionStart arm `matcher: "compact"` in `C:/Users/<user>/.claude/settings.json`. Fires ONLY on the compact event.

**Behavior:**
- Reads `session_id` from stdin (the post-compact session UUID). Derives stable id `claude-<first-8-hex>`.
- Calls `H:/prism/.claude/helpers/per-agent-handoff.mjs read --terminal <stable>` via `spawnSync(process.execPath, ...)` (NOT the portable-node shim — `#!/bin/bash` scripts can't be `spawnSync`'d on Windows).
- Extracts `## RESUME` section from the handoff markdown body.
- Caps injected size at 6 KB (truncated marker appended on overflow).
- Validates handoff age via `written_at:` frontmatter — handoffs older than 240 min (knob: `PRISM_AUTO_RESUME_MAX_AGE_MIN`) emit a "stale, treat as fresh" hint instead of resuming.
- ALL failures (no handoff, parse error, missing helper, spawn timeout) emit `{continue:true,suppressOutput:true}` — never blocks SessionStart over convenience.

**Knobs:**
- `PRISM_AUTO_RESUME_DISABLE=1` — turn off entirely
- `PRISM_AUTO_RESUME_MAX_AGE_MIN=N` — staleness threshold (default 240)
- `PRISM_NODE_BIN=<path>` — override node binary (tests)

## 3. Terminal-window slot pinning

Solves slot drift across `/compact`, `/clear`, fresh `claude` invocation in the same PowerShell window.

**Three components shipped together:**

### a) `terminal-window-id.mjs` helper

Resolves a stable window identity by tier:
1. `WT_SESSION` env var (Windows Terminal sets a UUID per pane that persists for the tab's lifetime) → `tw-wt-<uuid>`
2. Ancestor PowerShell PID via `wmic process where ProcessId=<pid> get ParentProcessId,Name /format:csv` walked up to 8 hops, matched against `powershell.exe`, `pwsh.exe`, `cmd.exe` → `tw-ps-<pid>`
3. Bare `process.ppid` → `tw-pp-<pid>`

Knobs: `PRISM_TERMINAL_WINDOW_ID` (override), `PRISM_TERMINAL_WINDOW_ID_DISABLE`, `PRISM_TWID_TIMEOUT_MS` (default 2000).

Diagnostic: writes once to `H:/prism/.claude/cache/terminal-window-<id>.lock` so operators can audit window-id distribution.

### b) `chat-slots.mjs` schema v2

`SlotState` gains optional `terminalWindowId` field. In `claimSlot()`:
- Check 1 (existing): chatId match → refresh + return
- **Check 2 (NEW):** if input has `terminalWindowId` AND some slot's state has the same id, INHERIT that slot (new chatId takes over, terminalPinned=true, previousChatId returned)
- Check 3 (existing): first free / preferSlot / recency guards / fleet-full

Backward-compat: v1 records (no `terminalWindowId` field) keep working; first re-claim by a chat with a window id stamps the field. Schema v2 records always have the field (null for legacy callers).

**Test results (6 scenarios, all PASS):**
- S1 fresh claim from window-W1 → slot alpha, terminalWindowId="tw-test-w1"
- S2 same chatId re-claim → alpha (chatId match)
- S3 NEW chatId, same window-W1 → alpha INHERITED, previousChatId returned
- S4 different chatId, different window-W2 → bravo (new window, new slot)
- S5 third chatId in window-W1 → alpha STILL (binding survives chatId churn)
- S6 no terminalWindowId (legacy v1 caller) → charlie (claims new slot normally)

### c) `session-start-terminal-pin.mjs` hook

T1 hook wired in `C:/Users/<user>/.claude/settings.json` SessionStart arm 0 (empty matcher → fires on every event: startup/resume/compact/clear).

- Reads `session_id` from stdin → derives `claude-<8hex>`
- Resolves window-id via the helper (in-process import for speed, subprocess fallback)
- Calls `chat-slots.mjs claim --chatId <id> --terminalWindowId <wid> --activity session-start-auto-pin`
- Silent on success (or verbose with `PRISM_TERMINAL_PIN_VERBOSE=1`)
- Never blocks SessionStart

**Result:** 10 PowerShell windows → 10 deterministic slot bindings. /compact and /clear inherit the slot. The "alpha disappeared mid-session" pathology is structurally impossible.

## Files shipped

- `H:/prism/.claude/hooks/precompact-auto-trigger.mjs` — modified (findLastCompactOffset added pre-compact by peer claude-c9c4e6a8; estimateFromBytes wiring + sanity floor by slot alpha this session)
- `H:/prism/.claude/hooks/session-start-auto-resume.mjs` — NEW (T0, matcher:"compact")
- `H:/prism/.claude/hooks/session-start-terminal-pin.mjs` — NEW (T1, arm 0)
- `H:/prism/.claude/helpers/terminal-window-id.mjs` — NEW (~140 LOC + CLI)
- `H:/prism/.claude/helpers/chat-slots.mjs` — modified (schema v2 + terminal-pin claim branch + CLI flag)
- `C:/Users/Mark Villanueva/.claude/settings.json` — 2 new SessionStart entries (matcher:"compact" arm + arm 0 push)
- `H:/prism/CLAUDE.md` — new `## SESSION CONTINUITY STACK` section
- `H:/prism/knowledge/wiki/architecture/session-continuity-stack.md` — wiki entry (pending)
- Memory: this file + [[feedback_fleet_design_10_chats]] + [[feedback_reflect_all_changes_post_update]]

## Related

- [[feedback_fleet_design_10_chats]] — 10-chat scale directive (this stack is fleet-size-agnostic)
- [[feedback_reflect_all_changes_post_update]] — 4-surface doc-reflection rule (this stack is the first canonical example)
- [[feedback_conflict_fork_rule]] — peer claude-c9c4e6a8 wrote the half-fix for piece #1 pre-compact; my session completed the wiring
- [[reference_harness_hang_prevention]] — slow Bash watchdog notes a 109s tasklist call during chat-slots wiring (acceptable for one-time schema-v2 bench)


## Related
[[skills/compact|/compact]] • [[skills/clear|/clear]] • [[skills/token|/token]] • [[skills/settings|/settings]] • [[skills/prism|/prism]] • [[skills/helpers|/helpers]] • [[skills/per-agent-handoff|/per-agent-handoff]] • [[skills/bin|/bin]] • [[skills/bash|/bash]] • [[skills/format|/format]]