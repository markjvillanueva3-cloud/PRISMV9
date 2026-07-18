---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "Review a new safety-critical file end-to-end: `H:\\prism\\scripts\\lib\\resolve-hwnd"
date: "2026-05-20"
first_ts: "2026-05-20T23:51:13.648Z"
last_ts: "2026-05-20T23:52:20.042Z"
cwd: "H:\\prism"
messages: 14
user_msgs: 6
assistant_msgs: 8
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a24fc7c1ececf55f0.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# Review a new safety-critical file end-to-end: `H:\prism\scripts\lib\resolve-hwnd

> **claude-code-cli** | 2026-05-20 | 14 msgs (6 user / 8 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a24fc7c1ececf55f0.jsonl`

## Transcript

### User | 2026-05-20T23:51:13.648Z

Review a new safety-critical file end-to-end: `H:\prism\scripts\lib\resolve-hwnd-by-title.mjs` (plus its test `H:\prism\scripts\lib\resolve-hwnd-by-title.test.mjs`).

CONTEXT: This is ZEBRA-ORCHESTRATOR-MS0 gap G1b. The PRISM "zebra orchestrator" is an external automation that types `/compact` + `/checkin` keystrokes into chat-slot terminal windows via Win32 SendKeys. To do that it needs a window handle (HWND). The OLD primitive (`resolve-hwnd.mjs`) resolved PID→HWND but the chat-slots `pid` is ephemeral and no longer owns a window — so resolution failed. This NEW file resolves HWND by WINDOW TITLE instead: PRISM stamps each chat window's caption with the slot's `topic` (via `.claude/hooks/rename-window-intercept.mjs` → `.claude/helpers/set-window-title.mjs` which calls Win32 `SetConsoleTitleW`). The resolver enumerates top-level windows via Win32 `EnumWindows` and matches caption→topic.

SAFETY INVARIANT (load-bearing): a WRONG HWND means `/compact` gets typed into the WRONG chat → silent loss of that chat's uncommitted context. The resolver must NEVER best-guess — it must fail loud (return a classified error) on any ambiguous or no-match case, and the caller must then skip actuation.

Verify, end-to-end, reading the WHOLE file:
1. Correctness of the pure functions: `validateTitle`, `parseWindowList`, `matchWindowsByTitle`, `enumerateWindows`, `resolveHwndByTitle`, `tryResolveHwndByTitle`.
2. The embedded PowerShell/C# string `ENUM_PS` — is the C# valid (EnumWindows delegate marshalling, GetWindowText/GetWindowTextLength/IsWindowVisible/GetWindowThreadProcessId P/Invoke signatures), does the TSV row format (`hwnd\tpid\tvisible\ttitle`) round-trip correctly into `parseWindowList`, are tab/CR/LF stripped from captions so rows can't be mangled?
3. The escaping of the JS→C# string: backslash escapes (`\\t`, `\\r`, `\\n`, `\"`) must produce correct C# source.
4. The safety property: can any input cause `matchWindowsByTitle` to return `ok:true` with a non-unique or wrong
... [+807 chars truncated]

### Assistant | 2026-05-20T23:51:26.365Z

I'll review both files end-to-end.

### Assistant | 2026-05-20T23:51:26.987Z

[tool_use: Read]

### Assistant | 2026-05-20T23:51:27.153Z

[tool_use: Read]

### Assistant | 2026-05-20T23:51:27.421Z

[tool_use: Read]

### User | 2026-05-20T23:51:39.211Z

[tool_result] read-once-guard: 'H:\prism\.claude\helpers\set-window-title.mjs' was already read 16m ago in this session and is unchanged (mtime 1778903338743). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-20T23:51:47.073Z

[tool_result] 1	// ZEBRA-ORCHESTRATOR-MS0 / G1b — title-based HWND resolver for chat-slot windows.
2	//
3	// resolve-hwnd.mjs (PID -> MainWindowHandle) is the WRONG primitive for the
4	// PRISM fleet: chat-slots.json stores an ephemeral `pid` that does not own a
5	// stable top-level window — `Get-Process -Id <pid>` routinely returns
6	// process-not-found once a chat has run for a while (the recorded pid is a

... [+10382 chars truncated]

### User | 2026-05-20T23:51:47.085Z

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

### Assistant | 2026-05-20T23:51:51.528Z

I need to verify `sanitizeTitle` since it's load-bearing for the safety property. Let me grep for it.

### Assistant | 2026-05-20T23:51:52.501Z

[tool_use: Grep]

### Assistant | 2026-05-20T23:51:52.765Z

[tool_use: Read]

### User | 2026-05-20T23:52:00.812Z

[tool_result] 9: * followed by SetConsoleTitleW — that targets the ConPTY of the user's tab
11: * SetConsoleTitleW both return TRUE against the parent claude.exe.)
32:export function sanitizeTitle(s) {
51:export function resolveClaudeHostPid(startPid, { runPs = defaultRunPs } = {}) {
76:  " [DllImport(\"kernel32.dll\",SetLastError=true,CharSet=CharSet.Unicode)]public static extern bool SetConsoleTitleW(string t
... [+372 chars truncated]

### User | 2026-05-20T23:52:02.494Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * set-window-title.mjs — set THIS chat's Windows Terminal tab title instantly.
4	 *
5	 * Why this exists: nothing run inside a Claude tool/hook can write to the
6	 * user's terminal via stdout — Claude Code captures stdout as a pipe, so an
7	 * OSC title escape never reaches the tab. The ONLY mechanism that works from
8	 * an external process on Windows is Win32 Atta
... [+2341 chars truncated]

### Assistant | 2026-05-20T23:52:20.042Z

I have everything needed. Verified end-to-end including `sanitizeTitle` and the CLI auto-run guard.

## Review: resolve-hwnd-by-title.mjs + test

**GRADE: PASS** — no P0, two P1, two P2.

### Safety property (item 4) — SOUND
`matchWindowsByTitle` cannot return `ok:true` with a non-unique HWND. Exact tier (L154-159) and contains tier (L163-168) each check `=== 1` before returning `ok:true`, and `> 1` returns a classified `ambiguous-*` error. Pool filtering (L149-151) drops bad-hwnd/invisible windows *before* counting, so an invisible duplicate cannot mask an ambiguity nor inflate it. `validateTitle` runs twice (resolver L199 + matcher L142) — belt-and-suspenders, harmless. Fail-loud is honored throughout.

### C# / ENUM_PS (item 2) — VALID
- P/Invoke signatures correct: `EnumWindows(EnumProc, IntPtr)`, `GetWindowText` with `CharSet.Unicode`, `GetWindowTextLength`, `IsWindowVisible`, `GetWindowThreadProcessId(IntPtr, out uint)` all match the Win32 ABI.
- Delegate `EnumProc` is a static field referenced only as a local lambda passed to `EnumWindows` — it stays rooted for the duration of the synchronous `EnumWindows` call, so no GC-collected-delegate crash. Correct.
- TSV round-trip: C# emits `(long)h \t pid \t vis \t t` with tab/CR/LF stripped from `t` (L70). `parseWindowList` splits on `\t`, `parts.length < 4` guard + `parts.slice(3).join("\t")` — robust. Since the caption has no tabs, exactly 4 parts; `.slice(3)` is defensive.

### JS→C# escaping (item 3) — CORRECT
`"\\t"` in the JS source string is the 2-char sequence `\t`, which lands verbatim in C# source as the escape `\t`. Same for `\\r`, `\\n`, `\"`. The C# `.Replace("\t"," ")` compiles correctly.

### `sanitizeTitle` import (item 5) — CORRECT
Path `../../.claude/helpers/set-window-title.mjs` from `scripts/lib/` resolves correctly. CLI guard is `if (process.argv[1]?.endsWith("set-window-title.mjs"))` (L152) — no side effects on import.

### P1 findings

**P1-a — `norm("")` collapse can let `contains` match an e
... [+1646 chars truncated]
