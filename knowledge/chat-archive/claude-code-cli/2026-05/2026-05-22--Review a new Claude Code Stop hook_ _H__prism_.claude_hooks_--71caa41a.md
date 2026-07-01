---
type: "chat-session"
source: "claude-code-cli"
session_id: "71caa41a-c98f-481d-b8f8-9085679aaf40"
title: "Review a new Claude Code Stop hook: `H:/prism/.claude/hooks/stop-tab-blink.mjs` "
date: "2026-05-22"
first_ts: "2026-05-22T16:44:34.362Z"
last_ts: "2026-05-22T16:45:16.338Z"
cwd: "H:\\prism"
messages: 5
user_msgs: 2
assistant_msgs: 3
raw_file: "H:/.claude/projects/H--prism/71caa41a-c98f-481d-b8f8-9085679aaf40/subagents/agent-abba6f4cb1f978191.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Review a new Claude Code Stop hook: `H:/prism/.claude/hooks/stop-tab-blink.mjs` 

> **claude-code-cli** | 2026-05-22 | 5 msgs (2 user / 3 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/71caa41a-c98f-481d-b8f8-9085679aaf40/subagents/agent-abba6f4cb1f978191.jsonl`

## Transcript

### User | 2026-05-22T16:44:34.362Z

Review a new Claude Code Stop hook: `H:/prism/.claude/hooks/stop-tab-blink.mjs` (Node ESM, ~55 lines). Read the whole file.

## Purpose
The operator runs a 15-tab Windows Terminal fleet of Claude chats. They want a tab to visually flash when its Claude turn ends, so they can see which tab needs attention. This Stop hook writes the BEL control char (U+0007, `\x07`) to the Windows console device `\\.\CONOUT$`. Windows Terminal, with `bellStyle` set to `["window","taskbar"]` (already configured in WT settings.json), turns a BEL into a tab bell-glyph + window/taskbar flash.

## Contract to verify
1. **Never blocks/fails Stop** — this is a cosmetic hook. ANY failure (no console attached, device-open error, non-Windows) must be silent and the hook must still emit a valid `{continue:true}` JSON to stdout and exit 0. Verify every path is guarded.
2. **Correct stream separation** — the BEL must go to `\\.\CONOUT$` (the real console device), NOT `process.stdout` (which is the captured JSON protocol channel). The JSON `{continue:true,suppressOutput:true}` goes to stdout. Verify these don't cross.
3. **Platform guard** — `\\.\CONOUT$` is Windows-only; the hook must no-op cleanly on non-win32.
4. **Knob** — `PRISM_TAB_BLINK_DISABLE=1` disables it.
5. **No stdin dependency / no hang** — the hook must not block reading stdin. A Stop hook gets stdin JSON but this hook doesn't need it. Verify it never reads fd 0 in a way that could block.
6. **Speed** — it runs on every Stop; must be near-instant (one tiny write).

## Your job
Read the file. Flag every P0 (a path that could throw uncaught, block Stop, or write BEL into the JSON channel) and P1. Check: the JS string escaping of `\\\\.\\CONOUT$` (does it produce the path `\\.\CONOUT$`?), the `\x07` literal, whether `fs.writeFileSync` to a device path can throw synchronously (it can — confirm it's inside try/catch), whether `emit()` itself is guarded. Grade PASS or FAIL. Under 300 words. If FAIL, name the exact fix.

### Assistant | 2026-05-22T16:44:50.962Z

I'll read the hook file now.

### Assistant | 2026-05-22T16:44:51.069Z

[tool_use: Read]

### User | 2026-05-22T16:45:03.405Z

[tool_result] 1	#!/usr/bin/env node
2	// tier: T3
3	/**
4	 * stop-tab-blink.mjs - Flash this terminal tab when Claude's turn ends.
5	 *
6	 * On every Stop event (Claude finished and is waiting for the operator), this
7	 * hook writes the BEL control character (U+0007) to the console output device
8	 * (\\.\CONOUT$ on Windows). Windows Terminal turns a BEL into a visual signal
9	 * per the profile `bellStyle` se
... [+2098 chars truncated]

### Assistant | 2026-05-22T16:45:16.338Z

## Code Quality Analysis Report — stop-tab-blink.mjs

### Verdict: PASS

### Contract verification

1. **Never blocks/fails Stop** — PASS. `main()` has no top-level throwable code outside guards. The env check, platform check are pure comparisons. The only I/O (`fs.writeFileSync`) is inside `try/catch`. `emit()` wraps `process.stdout.write` in its own `try/catch`. Every exit path reaches `emit(SILENCE)`. No `process.exit()` call — Node exits 0 naturally after `main()` returns with no thrown error. Correct.

2. **Stream separation** — PASS. BEL (`\x07`) goes only to `CONSOLE_DEVICE` via `writeFileSync`; the JSON `{continue:true,suppressOutput:true}` goes only to `process.stdout.write`. No crossover. The two never share a stream.

3. **Platform guard** — PASS. `process.platform === "win32"` gates the device write; non-win32 falls straight through to `emit(SILENCE)`.

4. **Knob** — PASS. `PRISM_TAB_BLINK_DISABLE === "1"` returns early after emitting valid JSON.

5. **No stdin dependency** — PASS. The file never references `process.stdin` / fd 0. Cannot block on stdin. (The `hooks.md` `parse_hook_input` convention is for bash hooks; not applicable to this ESM hook, and correctly skipped.)

6. **Speed** — PASS. One synchronous open-write-close of a tiny 1-byte payload + one `JSON.stringify`. Near-instant.

### Escaping checks
- `"\\\\.\\CONOUT$"` — four backslashes → two literal `\`, then `.`, then `\\` → one literal `\`, then `CONOUT$`. Resolves to `\\.\CONOUT$`. Correct.
- `"\x07"` — single BEL byte U+0007. Correct.
- `fs.writeFileSync` to a device path CAN throw synchronously (ENOENT/EBUSY when no console attached, e.g. detached/piped session) — confirmed inside `try/catch`.

### P0 / P1 findings
None.

### P2 (non-blocking, optional)
- `writeFileSync` to `\\.\CONOUT$` opens with default flag `'w'`, which implies `O_TRUNC`. Truncating a console device is a harmless no-op in practice, but `{ flag: "a" }` would be marginally more correct intent. Not a defect.
- Comment 
... [+119 chars truncated]
