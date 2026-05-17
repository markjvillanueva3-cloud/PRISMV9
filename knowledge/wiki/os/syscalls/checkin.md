---
title: psk syscall — checkin
slug: checkin
kind: syscall
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK03
author: claude-41db1b82 (slot india)
kernel_handler: syscall_checkin
params_schema: '{ subcommand?: "current"|"claim"|..., chatId?, branch?, topic?, activity?, preferSlot?, field? }'
composes: [chat-slots.mjs]
mirrors_skill: .claude/commands/checkin.md
---

# `psk checkin` — Fleet Check-In / Slot Claim

Delegates to `.claude/helpers/chat-slots.mjs` for slot reclaim / claim /
status / heartbeat operations. U-CK03 will wire the full
reclaim+claim+drift+commit-hygiene composite into one call; today the
shell forwards a single subcommand to the underlying helper.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_checkin(params)` — defaults
`subcommand: "current"` (returns the slot bound to the calling chat).
Forwards whitelisted flags to the helper subprocess.

## Subcommands

| Sub | Forwarded flags | Action |
|-----|-----------------|--------|
| `current` (default) | `--field <name>` | Returns this chat's slot state (or one field). |
| `claim` | `--chatId, --branch, --topic, --activity, --preferSlot` | Force-claim a named slot. |
| `reclaim` | (none) | Reap stale slots fleet-wide. |
| `heartbeat` | (helper-side) | Refresh the lastHeartbeat timestamp. |
| `status` | (helper-side) | Return all-slot state. |

## Returns

```json
{
  "ok": true,
  "syscall": "checkin",
  "shell_only": true,
  "note": "U-CK03 composes reclaim+claim+drift+commit-hygiene in one call",
  "result": { "slot": "india", "state": { ... } } | { "ok": false, ... },
  "warnings": "<stderr if any>"
}
```

## Doctrine pins

- **Mirrors `/checkin` skill** — the slash-command at
  `.claude/commands/checkin.md` is the operator-facing wrapper; this
  syscall is the kernel-facing primitive. The skill composes the syscall
  + per-`/checkin` pipeline phases (drift check, commit hygiene, awareness
  inject, etc.).
- **Slot claims are racy** — peer chats can preempt; `--force true
  --confirmRecent true` is required to evict a live owner.

## Related

| Syscall | Relation |
|---------|----------|
| [[whoami]] | Upstream — supplies sessionId for the claim. |
| [[handoff]] | Sister — bind handoff after claim. |
| [[pick]] | Downstream — pick respects the bound slot for per-slot filtering. |

## See also

- `.claude/helpers/chat-slots.mjs` — actual claimant
- `.claude/commands/checkin.md` — operator-facing skill wrapper
- `.claude/commands/checkin-{alpha..mike,golf}.md` — NATO-phonetic shortcuts
