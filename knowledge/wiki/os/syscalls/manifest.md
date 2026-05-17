---
title: psk syscall — manifest
slug: manifest
kind: syscall
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK02
author: claude-41db1b82 (slot india)
kernel_handler: syscall_manifest
params_schema: '{}'
composes: [PRISM-INVENTORY-LATEST.md, BUILD_STATE.json, DISPATCHER_DIGEST.md, ENGINE_DIGEST.md]
---

# `psk manifest` — Live System Manifest

Returns the pointer set for live engine/dispatcher/hook/skill counts. The
shell layer confirms each source file's existence; U-CK02 extends to
parse live counts from `PRISM-INVENTORY-LATEST.md` and `BUILD_STATE.json`.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_manifest()` — pointer probe over the
canonical inventory sources. Always returns `{ok:true, shell_only:true}`
with per-source availability flags; never fails (returns availability=false
for missing sources rather than throwing).

## Returns

```json
{
  "ok": true,
  "syscall": "manifest",
  "shell_only": true,
  "note": "U-CK02 extends — returns live counts from inventory",
  "result": {
    "sources": {
      "inventory": "PRISM-INVENTORY-LATEST.md",
      "buildState": "state/shared/BUILD_STATE.json",
      "dispatcherDigest": "mcp-server/data/docs/DISPATCHER_DIGEST.md",
      "engineDigest": "mcp-server/data/docs/ENGINE_DIGEST.md"
    },
    "available": { "inventory": true, "buildState": true, ... }
  }
}
```

## Doctrine pins

- **Shell-only by design at U-CK02 ship time** — the live-count extension
  is deferred to U-CK02 full ship. Today the manifest answers "do the
  canonical sources exist on disk?", not "what are the counts?".
- **Never throws** — `fs.existsSync` is tolerant of every failure path.

## Related

| Syscall | Relation |
|---------|----------|
| [[whoami]] | Independent — identity vs system manifest. |
| [[position]] | Sister — manifest is system-wide; position is per-build snapshot. |
| [[tools]] | Sister — tools surfaces dispatcher catalog; manifest surfaces inventory. |

## See also

- `mcp-server/data/docs/ENGINE_DIGEST.md` — pre-computed engine index
- `PRISM-INVENTORY-LATEST.md` — auto-refreshed live counts
