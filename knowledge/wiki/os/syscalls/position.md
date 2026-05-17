---
title: psk syscall — position
slug: position
kind: syscall
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK02
author: claude-41db1b82 (slot india)
kernel_handler: syscall_position
params_schema: '{}'
composes: [BUILD_STATE.json, MILESTONE_PROGRESS.json, roadmap-drift-report.json, CURRENT_POSITION.md]
---

# `psk position` — Current Build / SVI / Drift Snapshot

Returns the pointer set for the live position-snapshot sources. The shell
layer confirms each source file's existence; U-CK02 extends to parse
`{build, svi, drift, buildState}` from the snapshots.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_position()` — pointer probe over the
four canonical position-snapshot files. Same tolerant pattern as
`manifest` — never throws, returns availability=false on missing.

## Returns

```json
{
  "ok": true,
  "syscall": "position",
  "shell_only": true,
  "note": "U-CK02 extends — returns {build, svi, drift, buildState} from snapshots",
  "result": {
    "sources": [
      "state/shared/BUILD_STATE.json",
      "state/shared/MILESTONE_PROGRESS.json",
      "mcp-server/data/state/roadmap-drift-report.json",
      "state/shared/CURRENT_POSITION.md"
    ],
    "available": { "BUILD_STATE.json": true, ... }
  }
}
```

## Composition with whoami

```
whoami()   →  { sessionId, slot, branch, repoRoot }
position() →  { build, svi, drift, buildState } (U-CK02 extension)
↓
Combined: "this session's branch is at <build>, drift is <drift>"
```

The dispatcher does not auto-compose these; callers chain them per use case.

## Related

| Syscall | Relation |
|---------|----------|
| [[manifest]] | Sister — manifest is system-wide; position is build/snapshot. |
| [[delta]] | Composes position to compute per-session diff. |

## See also

- `state/shared/MILESTONE_PROGRESS.md` — human-readable position view
- `mcp-server/data/state/roadmap-drift-report.json` — drift detector output
