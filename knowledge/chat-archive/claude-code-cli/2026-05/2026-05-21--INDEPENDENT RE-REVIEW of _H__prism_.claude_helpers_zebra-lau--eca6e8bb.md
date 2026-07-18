---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "INDEPENDENT RE-REVIEW of `H:/prism/.claude/helpers/zebra-launch.ps1` (~265 lines"
date: "2026-05-21"
first_ts: "2026-05-21T18:33:32.792Z"
last_ts: "2026-05-21T18:33:51.188Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a6974b214f5281fab.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# INDEPENDENT RE-REVIEW of `H:/prism/.claude/helpers/zebra-launch.ps1` (~265 lines

> **claude-code-cli** | 2026-05-21 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a6974b214f5281fab.jsonl`

## Transcript

### User | 2026-05-21T18:33:32.792Z

INDEPENDENT RE-REVIEW of `H:/prism/.claude/helpers/zebra-launch.ps1` (~265 lines) after the FAIL→fix cycle. You are arm B. Arm A is verifying the listed fix-table; you find what arm A might miss.

The file is the operator-facing launcher for ZEBRA-OMNISCIENT G10 (scheduled task install) + G12 (chat-slots zebraOptIn flip). PARSE OK confirmed.

Read the whole file. Focus only on things that could STILL bite an operator:
1. **Lockfile finally-release race** -- if the script throws AFTER `Set-Content $LockPath` but BEFORE `$haveLock = $true`, the lockfile exists but `$haveLock` is false → finally won't release it → next operator run hits stale-lock detection (5s) then breaks it. Acceptable? Or should `$haveLock = $true` come BEFORE `Set-Content`?
2. **Move-Item -Force on chat-slots.json** -- Windows NTFS rename-over-existing is atomic on same volume, but `-Force` semantics: does this delete the destination first (non-atomic window)? Does PS use ReplaceFileW or MoveFileEx? If a peer has chat-slots.json open for read at the instant Move-Item fires, can it fail with sharing violation?
3. **`ConvertTo-Json -Depth 100` on PSCustomObject preserving foreign fields** -- if `chat-slots.json` has properties like `slots.alpha.someFutureField`, does the round-trip survive? Test mentally: the property exists on the PSCustomObject after `ConvertFrom-Json`; my Add-Member only mutates two keys; ConvertTo-Json should emit all properties. Confirm.
4. **`Slots` parameter with case sensitivity** -- `-Slots ALPHA` would fail regex `^[a-z]+$`. Is that the intended UX? (Doctrine says yes -- enforce lower-case canonical form -- but worth flagging.)
5. **Empty Slots array** -- if operator passes `-Slots @()`, what happens? The foreach loop yields zero iterations, no flips, no error. Behavior correct but silent. Worth a warning?
6. **`-RunNow` semantics** -- the installer's `-RunNow` triggers an immediate run. With burn-in default, an immediate burn-in run is fine. With `-Live`, an immediate LIV
... [+700 chars truncated]

### Assistant | 2026-05-21T18:33:51.188Z

You've hit your session limit · resets 2:20pm (America/Chicago)
