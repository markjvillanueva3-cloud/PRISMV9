---
type: "chat-session"
source: "claude-code-cli"
session_id: "eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf"
title: "RE-REVIEW of `H:/prism/.claude/helpers/zebra-launch.ps1` (~265 lines). You FAILE"
date: "2026-05-21"
first_ts: "2026-05-21T18:33:32.821Z"
last_ts: "2026-05-21T18:33:50.945Z"
cwd: "H:\\prism"
messages: 2
user_msgs: 1
assistant_msgs: 1
raw_file: "H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a9709f4a09849f086.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:31"
---

# RE-REVIEW of `H:/prism/.claude/helpers/zebra-launch.ps1` (~265 lines). You FAILE

> **claude-code-cli** | 2026-05-21 | 2 msgs (1 user / 1 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/eca6e8bb-58e6-4a00-a0e1-d9ebe9769bdf/subagents/agent-a9709f4a09849f086.jsonl`

## Transcript

### User | 2026-05-21T18:33:32.821Z

RE-REVIEW of `H:/prism/.claude/helpers/zebra-launch.ps1` (~265 lines). You FAILED this file on the previous pass. Your P0+P1 findings have been addressed in a full rewrite. Re-grade.

Previous-pass findings + what was changed:

| Finding | Fix applied |
|---|---|
| P0-1: `Set-Content -Encoding UTF8` writes BOM on PS 5.1 | Now uses `[System.IO.File]::WriteAllText($tmp, $json, [System.Text.UTF8Encoding]::new($false))` (no-BOM); paired symmetric `[System.IO.File]::ReadAllText(..., $utf8NoBom)` for the read side |
| P0-2: Lockfile path parity unverified | Verified against `chat-slots.mjs:130` -- `DEFAULT_LOCK_PATH = "H:/prism/state/shared/chat-slots.lock"` -- exact match; comment now explicitly says "MUST match DEFAULT_LOCK_PATH in chat-slots.mjs" |
| P0-3: `$null -eq $slotObj` branch CREATED slots (doctrine violation) | Removed -- now adds to `$skipped += "${slot}:null-value"` instead. No slot-creation path remains anywhere in the launcher |
| P0-4 (arm B): Verify-block precedence bug `$a -contains $b -and $c` | Parens added: `($verify.slots.PSObject.Properties.Name -contains $slot) -and ($verify.slots.$slot.zebraOptIn -eq $true)` |
| P1: Slot-name validation | Added `$AllSlots` canonical enum (alpha..zulu mirroring SLOT_NAMES from chat-slots.mjs:103-106) + regex `^[a-z]+$` + enum-intersect check before any JSON touch; invalid names go to `$invalidSlots` and are reported |
| P1 (arm B): `-WhatIf` shadowing PS common-parameter | Renamed to `-Preview`; both `$WhatIf` → `$Preview` everywhere |
| P1 (arm B): #Requires alone insufficient for dot-source bypass | Added explicit runtime `$isAdmin` check (lines 72-78) mirroring the installer's pattern |
| P1: Reversibility hint on G10-success-G12-fail | Added `try/catch` around G12 -- catch checks `$g10Ok -and -not $Preview` then emits the `& '$InstallerPath' -Uninstall` rollback command before re-throwing |
| P1 (arm B): `golf` in defaults is no-op (self-exempt) | Default changed from `@('alpha','golf')` to `@('alpha')` only; 
... [+868 chars truncated]

### Assistant | 2026-05-21T18:33:50.945Z

You've hit your session limit · resets 2:20pm (America/Chicago)
