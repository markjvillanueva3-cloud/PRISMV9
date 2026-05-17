---
title: psk syscall — record
slug: record
kind: syscall
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK02
author: claude-41db1b82 (slot india)
kernel_handler: syscall_record
params_schema: '{ event: string, command: string, ... }'
composes: [pipeline-telemetry.jsonl]
---

# `psk record` — Command-Telemetry Event Logger

Appends a command-telemetry event to `state/shared/pipeline-telemetry.jsonl`.
Feeds the AdaptiveThresholds feedback loop (U-CK15+) once the moving-
window aggregator is wired; today's shell enforces input bounds (P1-4 DoS
protection) and persists the event.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_record(params)` — bounded append. P1-4
enforces input length / shape ceilings to prevent JSONL DoS via crafted
telemetry payloads.

## Required params

| Field | Type | Notes |
|-------|------|-------|
| `event` | string | Event slug (e.g. `pick.success`, `loop.tick`, `forge.proposal`) |
| `command` | string | Originating command name (e.g. `pick-unit`, `loop`, `forge-triple`) |

Additional fields pass through verbatim (P1-4-bounded) into the JSONL row.

## Returns

```json
{ "ok": true, "syscall": "record", "appended": true, "file": "state/shared/pipeline-telemetry.jsonl" }
```

On bounds violation: `ok:false`, `error: "input too large (P1-4)"`,
`appended: false`.

## DoS protection (P1-4)

- Single-event size cap (default 4 KB).
- Per-session rate cap (advisory in kernel, enforced upstream by the
  adaptive-thresholds engine when U-CK15 wires).
- JSON-only payload — no nested HTML / control chars without explicit
  escape.

## Future use (U-CK15+)

The adaptive-thresholds feedback loop (per [[loop]] doctrine) reads
this JSONL to tune the 6 magic numbers: tier-floor pct, context-nudge
pct, urgent pct, leverage-min, dispatcher capacity ceiling, expected-
wired-delta tolerance. Without `record`, the tuner has no signal.

## Related

- [[recommend]] — sister; recommend reads telemetry, record writes it
- [[loop]] (pipeline) — emits records each tick
- [[checkin]] (command) — emits records on slot bind

## See also

- `state/shared/pipeline-telemetry.jsonl` — sink
- `.claude/kernel/psk.mjs` — kernel registration map
