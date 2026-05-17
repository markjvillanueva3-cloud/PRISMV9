---
title: psk syscall — handoff
slug: handoff
kind: syscall
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK03
author: claude-41db1b82 (slot india)
kernel_handler: syscall_handoff
params_schema: '{ subcommand: "read"|"write", terminal?: chatId, source?, topic?, resume?, state?, sessionId? }'
composes: [per-agent-handoff.mjs, stable-session-id.mjs]
---

# `psk handoff` — Per-Chat Handoff Read / Write

Delegates to `.claude/helpers/per-agent-handoff.mjs` to read or write the
per-chat handoff under `state/shared/handoffs/HANDOFF-<id>-<topic>.md`.
U-CK03 absorbs the U-TODOWRITE-HANDOFF-BRIDGE behavior on top.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_handoff(params)` — validates inputs
(whitelist regex on `terminal`), spawns the helper subprocess with stdin
session-id payload (P0-1 fix), and surfaces the helper's structured JSON
response or a degraded error envelope.

## Subcommands

| Sub | Required params | Action |
|-----|-----------------|--------|
| `read` | none (uses caller sessionId or env-resolved) | Returns the handoff body + RESUME directive |
| `write` | `resume`, `state`, optional `topic`, `source` (defaults `live-chat`) | Writes/updates the per-chat handoff |

## Safety guards

- **P1-1 whitelist on terminal:** `HANDOFF_TERMINAL_RE.test(params.terminal)`
  blocks anything outside `claude-<8hex>` shape before forwarding. Prevents
  filename-injection through the helper.
- **P0-1 stdin priority:** caller's `sessionId` is piped as
  `{session_id: "<id>"}` over stdin so the helper's `readStdinSessionId()`
  resolver fires correctly even from detached spawn contexts.
- **`--source live-chat` required for write:** per the handoff-writer-ban
  doctrine (2026-05-06), only live-chat or the explicit
  `precompact-hook` source may write. Kernel default is `live-chat`.

## Returns

```json
{
  "ok": true,
  "syscall": "handoff",
  "shell_only": true,
  "note": "U-CK03 may absorb TodoWrite-handoff bridge",
  "result": { "file": "state/shared/handoffs/HANDOFF-...-..." | <read-payload> },
  "warnings": "<stderr if any>"
}
```

## Related

| Syscall | Relation |
|---------|----------|
| [[whoami]] | Upstream — supplies sessionId. |
| [[checkin]] | Sister — slot claim + handoff bind go together. |

## See also

- `.claude/helpers/per-agent-handoff.mjs` — actual writer
- `.claude/hooks/precompact-handoff.mjs` — auto-write trigger on /compact
- [[checkin]] — frequently composes with handoff
