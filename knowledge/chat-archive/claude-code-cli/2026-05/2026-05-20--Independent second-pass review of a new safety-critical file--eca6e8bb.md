---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Independent second-pass review of a new safety-critical file: `H:\\prism\\scripts\\"
date: "2026-05-20"
first_ts: "2026-05-20T23:51:13.652Z"
last_ts: "2026-05-20T23:54:00.476Z"
cwd: "H:\\prism"
messages: 18
user_msgs: 8
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-aa31d69632a4f6852.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Independent second-pass review of a new safety-critical file: `H:\prism\scripts\

> **claude-code-cli** | 2026-05-20 | 18 msgs (8 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-aa31d69632a4f6852.jsonl`

## Transcript

### User | 2026-05-20T23:51:13.652Z

Independent second-pass review of a new safety-critical file: `H:\prism\scripts\lib\resolve-hwnd-by-title.mjs` and its test `H:\prism\scripts\lib\resolve-hwnd-by-title.test.mjs`. Read BOTH whole files.

CONTEXT: PRISM's "zebra orchestrator" types `/compact` keystrokes into chat terminal windows via Win32 SendKeys. It needs a window handle (HWND). This new file resolves HWND by matching a window's caption against a slot's `topic` string (PRISM stamps each chat window caption with its topic). A WRONG HWND = `/compact` typed into the WRONG chat = silent data loss. The resolver MUST fail loud (classified error → caller skips) on any ambiguity.

Do NOT assume a content-specialist reviewer caught everything. Weight your review toward:
- **Integration / hidden coupling**: the file imports `sanitizeTitle` from `../../.claude/helpers/set-window-title.mjs`. Is that coupling correct and necessary? `set-window-title.mjs` sanitizes a title (strip control chars, collapse whitespace, cap at 80 chars) BEFORE stamping it on the window. The matcher MUST sanitize the expected title the same way or it will silently never match. Verify the matcher actually applies the same transform to both sides. Is there a drift risk if `set-window-title.mjs`'s `sanitizeTitle` / `MAX_TITLE_LEN` changes?
- **The honest-failure (R12) caveat**: the file header documents a Windows-Terminal-tabs caveat (if the fleet runs as WT tabs of one window rather than one window per chat, title resolution only works for the focused tab). Is that caveat accurate and is the code consistent with it?
- **Security**: the embedded PowerShell `-Command` string — is any untrusted input interpolated into it? (The expected title comes from `chat-slots.json` `topic`.) Could a malicious/odd topic string cause a problem? Note: the topic is NOT interpolated into the PS script — verify that.
- **Error-budget completeness**: every failure mode named, never silently swallowed?
- **Naming/convention conformance** vs the sibling `H:\pr
... [+453 chars truncated]

### Assistant | 2026-05-20T23:51:22.876Z

I'll review both files plus the coupled dependencies.

### Assistant | 2026-05-20T23:51:22.920Z

[tool_use: Read]

### Assistant | 2026-05-20T23:51:23.046Z

[tool_use: Read]

### Assistant | 2026-05-20T23:51:23.291Z

[tool_use: Read]

### Assistant | 2026-05-20T23:51:23.404Z

[tool_use: Read]

### User | 2026-05-20T23:51:43.760Z

[tool_result] 1	// ZEBRA-ORCHESTRATOR-MS0 / G1b — title-based HWND resolver for chat-slot windows.
2	//
3	// resolve-hwnd.mjs (PID -> MainWindowHandle) is the WRONG primitive for the
4	// PRISM fleet: chat-slots.json stores an ephemeral `pid` that does not own a
5	// stable top-level window — `Get-Process -Id <pid>` routinely returns
6	// process-not-found once a chat has run for a while (the recorded pid is a

... [+10382 chars truncated]

### User | 2026-05-20T23:51:43.774Z

[tool_result] 1	// Tests for resolve-hwnd-by-title.mjs (ZEBRA-ORCHESTRATOR-MS0 / G1b).
2	// Hermetic: every PowerShell spawn is injected via opts._spawn / opts._platform.
3	import test from "node:test";
4	import assert from "node:assert/strict";
5	import {
6	  validateTitle,
7	  parseWindowList,
8	  matchWindowsByTitle,
9	  enumerateWindows,
10	  resolveHwndByTitle,
11	  tryResolveHwndByTitle,
12	} from "./reso
... [+10221 chars truncated]

### User | 2026-05-20T23:51:43.923Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * set-window-title.mjs — set THIS chat's Windows Terminal tab title instantly.
4	 *
5	 * Why this exists: nothing run inside a Claude tool/hook can write to the
6	 * user's terminal via stdout — Claude Code captures stdout as a pipe, so an
7	 * OSC title escape never reaches the tab. The ONLY mechanism that works from
8	 * an external process on Windows is Win32 Atta
... [+6257 chars truncated]

### User | 2026-05-20T23:51:44.020Z

[tool_result] 1	// ZEBRA-ORCHESTRATOR-MS0 / U-ZEBRA01 — HWND resolver for chat-slot windows.
2	//
3	// CHO04 SendKeys needs an HWND (Win32 window handle); chat-slots.json stores
4	// only a stable PID via terminal-window-id.mjs. This module bridges them:
5	// PowerShell `Get-Process -Id <pid> | %{ $_.MainWindowHandle }` returns the
6	// MainWindowHandle as a decimal integer. 0 = no top-level window (process
7	/
... [+3871 chars truncated]

### Assistant | 2026-05-20T23:51:50.073Z

Now let me check how the title actually gets stamped on the window — there's a critical detail about what string lands on the caption.

### Assistant | 2026-05-20T23:51:51.022Z

[tool_use: Bash]

### Assistant | 2026-05-20T23:51:51.256Z

[tool_use: Bash]

### User | 2026-05-20T23:52:47.420Z

[tool_result] Exit code 255

### User | 2026-05-20T23:52:51.476Z

[tool_result] pre-rename-guard.mjs  2.7K
rename-window-intercept.mjs  7.0K
rename-window-intercept.test.mjs  4.8K

### Assistant | 2026-05-20T23:52:54.993Z

[tool_use: Bash]

### User | 2026-05-20T23:53:36.444Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
18 matches in 6 files:

.claude/hooks/rename-window-intercept.mjs:9:*     chat-slots.json AND flip the Windows Terminal tab title immediately,
.claude/hooks/rename-window-intercept.mjs:13:*  2. ALWAYS-MATCH — on every other prompt, cheaply re-assert the tab title
.claude/hooks/rename-window-intercept.m
... [+1326 chars truncated]

### Assistant | 2026-05-20T23:54:00.476Z

Confirmed: `rename-window-intercept.mjs:166` calls `setWindowTitle(cur.topic, ...)` — the raw `topic` string from `chat-slots.json`. `setWindowTitle` then runs `sanitizeTitle(rawTitle)` internally before stamping. So the window caption = `sanitizeTitle(topic)`. The resolver's `norm()` applies `sanitizeTitle().toLowerCase()` to both sides — the transform parity is correct. One key finding emerges below.

---

## Review: resolve-hwnd-by-title.mjs + test

**Grade: PASS** (1 P1, no P0)

### P1 — `MAX_TITLE_LEN` asymmetric truncation can produce a false `exact` match
`set-window-title.mjs:35` caps the stamped title at 80 chars (`MAX_TITLE_LEN`). `norm()` (line 86-88) re-applies the *same* `sanitizeTitle`, so both sides truncate identically — parity is correct **for the exact tier**. But the `contains` tier (line 162) compares `norm(w.title).includes(want)` where `want` is also 80-capped. If two slots have topics that are identical in their first 80 chars but diverge after (e.g. long milestone-suffixed topics), both truncate to the *same* 80-char string and the exact tier returns `ambiguous-exact` — safe. The genuine hazard: a topic >80 chars truncated to `want`, and a *different* window whose full sanitized caption happens to *contain* that 80-char prefix, yields a unique `contains` match → wrong HWND, `/compact` mis-routed. Topics are slot-domain slugs (`bravo-cad-fusion-live-ms0`, ~25 chars) so this is currently unreachable in practice, but it is a latent correctness gap the safety doctrine (header lines 15-23) claims to foreclose. **Recommend:** when `v.title` after sanitize is exactly `MAX_TITLE_LEN` long (truncation occurred), suppress the `contains` tier — a truncated expected title cannot be safely substring-matched. At minimum, document the assumption "topics are short" as a load-bearing precondition. Drift risk is real: if `set-window-title.mjs` ever lowers `MAX_TITLE_LEN`, the resolver inherits it silently (good — single source) but the contains-hazard widens.

... [+2975 chars truncated]
