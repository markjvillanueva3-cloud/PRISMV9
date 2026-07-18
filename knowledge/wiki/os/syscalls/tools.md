---
title: psk syscall — tools
slug: tools
kind: syscall
status: shell-only
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK02
author: claude-41db1b82 (slot india)
kernel_handler: syscall_tools
params_schema: '{ filter?: string }'
composes: [DISPATCHER_DIGEST.md, _skill-triggers.jsonl, ENGINE_DIGEST.md]
---

# `psk tools` — Tool / Dispatcher / Skill Catalog

Surfaces the canonical catalog of dispatcher actions, skills, and
engines. U-CK02 fuses `dispatcher_map_compact` + skill list +
ENGINE_DIGEST into one coherent response; today's kernel ships a
pointer set with on-disk availability flags.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_tools(params)` — shell-only at U-CK02
ship. Returns the pointer set for downstream consumers; U-CK02 ships
the fused catalog.

## Sources (composed)

| Source | Purpose |
|--------|---------|
| `mcp-server/data/docs/DISPATCHER_DIGEST.md` | Dispatcher + action enumeration |
| `knowledge/wiki/architecture/_skill-triggers.jsonl` | Skill autosuggest keywords (per U-CK06) |
| `mcp-server/data/docs/ENGINE_DIGEST.md` | Engine catalog |

## Params

| Field | Type | Notes |
|-------|------|-------|
| `filter` | string (substring or glob) | Caller-supplied filter applied to the fused catalog when U-CK02 wires it. |

## Returns (current, shell-only)

```json
{
  "ok": true,
  "syscall": "tools",
  "shell_only": true,
  "note": "U-CK02 extends — returns fused dispatcher+skill+engine catalog",
  "result": { "sources": { ... }, "available": { ... } }
}
```

## Future shape (U-CK02 extended)

```json
{
  "ok": true,
  "syscall": "tools",
  "result": {
    "dispatchers": [{"name":"prism_dev","actions":[...]}, ...],
    "skills": [{"name":"checkin","tier":"T1","triggers":[...]}, ...],
    "engines": [{"name":"AlgorithmEngine","wired":true,"dispatcher":"prism_dev"}, ...]
  }
}
```

## Related

- [[manifest]] — sister; manifest is counts-only, tools is full catalog
- [[_command-schema]] — the schema downstream skill entries follow
- [[pick]] — uses tools' skill list to suggest /forge candidates

## See also

- `.claude/kernel/psk.mjs` — kernel registration map
- `prism_session:dispatcher_map_compact` — MCP-side dispatcher index
