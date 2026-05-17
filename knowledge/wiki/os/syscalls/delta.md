---
title: psk syscall — delta
slug: delta
kind: syscall
status: shell-only
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK02
author: claude-41db1b82 (slot india)
kernel_handler: syscall_delta
params_schema: '{ since?: string }'
composes: [SessionDelta-pending-U-CK02]
---

# `psk delta` — Per-Session Diff vs Last Checkpoint

Returns the per-session diff since the last checkpoint. U-CK02 will wire
the real SessionDelta engine; today's kernel ships a shell-only response
acknowledging the surface.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_delta(params)` — shell-only at U-CK02
ship. Returns `{ok:true, shell_only:true, available:false}` advisory
so MCP-routed callers don't crash; the live SessionDelta engine fills
this in once U-CK02 extends.

## Params

| Field | Type | Notes |
|-------|------|-------|
| `since` | string (ISO timestamp or checkpoint id) | Caller-supplied checkpoint anchor. Defaults to `null` (most-recent auto-checkpoint). |

## Returns (current, shell-only)

```json
{
  "ok": true,
  "syscall": "delta",
  "shell_only": true,
  "note": "U-CK02 extends — returns session-delta vs last checkpoint",
  "result": { "since": "<params.since or null>", "available": false }
}
```

## Future shape (U-CK02 extended)

```json
{
  "ok": true,
  "syscall": "delta",
  "result": {
    "since": "<checkpoint>",
    "files_changed": [...],
    "commits_landed": [...],
    "tests_added": N,
    "scrutiny_verdicts": [...],
    "...": "see SessionDelta engine"
  }
}
```

## Related

- [[whoami]] — identity that anchors the delta
- [[position]] — composes `delta(since=...)` with `position()` for full session-snapshot

## See also

- `.claude/kernel/psk.mjs` — kernel registration map
- `.claude/helpers/per-agent-handoff.mjs` — captures pre-delta snapshot
