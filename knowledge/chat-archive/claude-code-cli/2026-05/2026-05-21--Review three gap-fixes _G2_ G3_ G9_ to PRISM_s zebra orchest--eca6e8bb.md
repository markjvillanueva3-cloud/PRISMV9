---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Review three gap-fixes (G2, G3, G9) to PRISM's zebra orchestrator. Read the chan"
date: "2026-05-21"
first_ts: "2026-05-21T00:29:33.104Z"
last_ts: "2026-05-21T00:32:29.734Z"
cwd: "H:\\prism"
messages: 17
user_msgs: 7
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a9110a65aa6580506.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review three gap-fixes (G2, G3, G9) to PRISM's zebra orchestrator. Read the chan

> **claude-code-cli** | 2026-05-21 | 17 msgs (7 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a9110a65aa6580506.jsonl`

## Transcript

### User | 2026-05-21T00:29:33.104Z

Review three gap-fixes (G2, G3, G9) to PRISM's zebra orchestrator. Read the changed regions of both files end-to-end:
- `H:\prism\scripts\lib\zebra-orchestrator-lib.mjs` — pure-core decision lib
- `H:\prism\scripts\zebra-orchestrator-sweep.mjs` — the I/O shell that runs every 5 min

CONTEXT: The zebra orchestrator decides whether to type `/compact` or `/clear` into chat-slot terminal windows. `/compact` preserves a chat's context; `/clear` discards it. A wrong decision loses work.

The three fixes:

**G3 (lib + sweep)** — `staggerAfterLine(line, opts)` is a NEW pure fn in the lib: after sending a `/compact` line, the orchestrator must wait a long time (DEFAULT_COMPACT_WAIT_MS = 90s) before sending the follow-up `/checkin` line, because `/compact` runs 20-60s+ and `/checkin` keystrokes landing mid-compaction get corrupted. `/clear` and other lines get the normal short stagger. The sweep's `sendLines` now calls `staggerAfterLine(lines[i], {staggerMs, compactWaitMs})` keyed on the line JUST sent. Verify: is the wait keyed on the correct line (the one just sent, not the next)? Does the `/compact`-token match (`=== "/compact"` or `startsWith("/compact ")`) correctly avoid false positives (a non-leading "compact" substring)? Is the override validation (`Number.isFinite && >= 0`) sound?

**G2 (lib + sweep)** — `planSlotAction` previously HARD-CODED `hasUncommittedCriticalWork: true` in the chatState. Now it accepts the value via opts: `hasUncommittedCriticalWork: hasUncommittedCriticalWork !== false`. Verify: when the opt is omitted (undefined), does it stay `true` (the conservative default — biases to /compact/preserve)? Only an explicit `false` should open the /clear path. The sweep computes the real value via `readGitDirty()` (runs `git status --porcelain`, any output => dirty, fail-soft to `true`).

**G9 (sweep)** — `planSlotAction` was called with hard-coded `hasHandoff: false`. Now the sweep computes `readHandoffFresh(slot)` — scans `state/shared/handoffs/` for `HAND
... [+1081 chars truncated]

### Assistant | 2026-05-21T00:29:42.371Z

I'll review the three gap-fixes by reading the changed regions of both files plus the test file.

### Assistant | 2026-05-21T00:29:42.778Z

[tool_use: Read]

### Assistant | 2026-05-21T00:29:43.025Z

[tool_use: Read]

### Assistant | 2026-05-21T00:29:43.170Z

[tool_use: Read]

### User | 2026-05-21T00:29:54.007Z

[tool_result] 1	#!/usr/bin/env node
2	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA02 — sweep CLI (the body).
3	//
4	// One pass over every opt-in chat slot: read pressure (CHO02), make decision
5	// (CHO01), resolve target HWND from PID (U-ZEBRA01), and — for executable
6	// plans — SendKeys the slash + follow-up /checkin-<slot> backend-dev-priority
7	// directive (U-CHO04 + U-ZEBRA05) into the target PowerShell window 
... [+16435 chars truncated]

### User | 2026-05-21T00:29:54.064Z

[tool_result] 1	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA02 — pure-core orchestrator library.
2	//
3	// Composes CHO01 (decideClearOrCompact) + CHO02 (readChatPressure) + U-ZEBRA01
4	// (resolveHwndFromPid) + U-ZEBRA05 (buildCheckinPayload) + U-CHO04 (PS
5	// send-keys-to-window.ps1) into a per-slot orchestration plan. All planning
6	// logic is pure & deterministic — the only I/O happens in the CLI shell
7	// (scrip
... [+12137 chars truncated]

### User | 2026-05-21T00:29:54.814Z

[tool_result] 1	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA02 — pure-core orchestrator lib tests.
2	// Hermetic: no I/O, no PS spawn. Injects a fake `decideClearOrCompact`.
3	
4	import { describe, it } from "node:test";
5	import assert from "node:assert/strict";
6	import {
7	  DEFAULT_STAGGER_MS,
8	  DEFAULT_COMPACT_WAIT_MS,
9	  DEFAULT_DRY_RUN_GRACE_HOURS,
10	  DEFAULT_ACTION_COOLDOWN_MS,
11	  SELF_EXEMPT_SLOTS,
12	  
... [+18538 chars truncated]

### Assistant | 2026-05-21T00:29:58.444Z

I have all three files. Let me verify the handoff filename format and a key concern in `staggerAfterLine`.

### Assistant | 2026-05-21T00:29:59.738Z

[tool_use: Bash]

### User | 2026-05-21T00:30:22.253Z

[tool_result] archive/
consolidated/
.active-sessions-by-pid.json  150.9K
.active-sessions-by-pid.json.16400.mp7242ar.tmp  48.7K
.auto-precompact-state.json  3.3K
.current-session-ids.json  171.8K
.current-session-ids.json.16064.dfcbe89f.tmp  101.6K
.current-session-ids.json.28372.6525f62b.tmp  162.9K
.current-session-ids.json.31236.d5f9885c.tmp  0B
.current-session-ids.json.57040.e0f8545e.tmp  0B
.current-sess
... [+543 chars truncated]

### Assistant | 2026-05-21T00:30:27.023Z

The token-match test confirms `/compactify now` correctly does NOT match. Let me check more handoff filenames to verify the regex against the real format.

### Assistant | 2026-05-21T00:30:27.074Z

[tool_use: Glob]

### User | 2026-05-21T00:30:52.032Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-21T00:30:56.592Z

[tool_use: Bash]

### User | 2026-05-21T00:32:13.520Z

[tool_result] HANDOFF-Agent@DESKTOP-N7MI1VB_891ca5a4-da43-4dd5-b995-1dc4e96f4e82-echo-work.md  2.4K
HANDOFF-Agent@DESKTOP-N7MI1VB_pid-18748-kilo-work.md  1.3K
HANDOFF-Agent@DESKTOP-N7MI1VB_pid-24728-infra-consensus-wire.md  945B
HANDOFF-Agent@DESKTOP-N7MI1VB_pid-25256-charlie-cleanup-b9.md  1.6K
HANDOFF-Agent@DESKTOP-N7MI1VB_pid-37104-foxtrot-work.md  876B
HANDOFF-Agent@DESKTOP-N7MI1VB_pid-50528-foxtrot-work.md
... [+2032 chars truncated]

### Assistant | 2026-05-21T00:32:29.734Z

Verification complete. The regex matches the real handoff format and correctly rejects `echocardiogram` (because `-${slot}-` requires literal hyphens bracketing the slot).

---

## ZEBRA Orchestrator Review — G2/G3/G9

### G3 — `staggerAfterLine` + sweep wiring — CORRECT

- **Line keying (sweep L211)**: `staggerAfterLine(line, ...)` is called inside the `i < lines.length - 1` block with `line = lines[i]` — the line *just sent*. After `/compact` (i=0) it returns the long wait before `/checkin` (i=1). Correct.
- **Token match (lib L119)**: `norm === "/compact" || norm.startsWith("/compact ")`. Verified — `/compactify now` → `false`, `/checkin-bravo run compact tests` → `false`. A leading-only, word-bounded match. No false positives.
- **Override validation (lib L111-116)**: `Number.isFinite(opts.compactWaitMs) && opts.compactWaitMs >= 0`. Sound — rejects `NaN`, `-1`, `Infinity`, non-numbers. `>= 0` permits `0` (a deliberate zero-wait override), which is the caller's prerogative.

### G2 — `hasUncommittedCriticalWork` default — CORRECT

- **Lib L188**: `hasUncommittedCriticalWork: hasUncommittedCriticalWork !== false`. Verified truth table: `undefined → true`, `true → true`, `false → false`, `null → true`, `0 → true`. Only an explicit `false` opens `/clear`. Conservative default preserved. Tests L260/L271/L280 directly assert all three branches.
- **`readGitDirty` (sweep L119-135)**: `timeout: 30000`, `maxBuffer: 16MiB`, `windowsHide: true`. Classifies `r.error || r.signal || r.status !== 0` → `true`; outer `catch` → `true`. Fail-soft direction correct (unknown ⇒ dirty ⇒ `/compact`). On ~11800 uncommitted changes: `--porcelain` emits one line per change (~11800 lines, well under 16MiB), trimmed output non-empty ⇒ `dirty=true`. Behaves correctly. **Note (P2, not P1)**: if porcelain output ever did exceed 16MiB, `spawnSync` sets `r.status=null` + `r.signal='SIGTERM'`-ish → still classified `true`. Safe direction. No defect.

### G9 — `readHandoffFresh` — CORRECT

- **Reg
... [+2047 chars truncated]
