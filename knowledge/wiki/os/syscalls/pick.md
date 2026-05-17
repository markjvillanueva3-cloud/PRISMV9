---
title: psk syscall — pick
slug: pick
kind: syscall
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK03
author: claude-41db1b82 (slot india)
kernel_handler: syscall_pick
params_schema: '{ priority?, slot?, limit?, tier? }'
composes: [pick-unit.mjs, priority-queue.mjs, atomic-roadmap.json]
mirrors_skill: .claude/commands/pick-unit.md
---

# `psk pick` — Pick Next Unit from Priority Queue

Delegates to `scripts/pick-unit.mjs` with forwarded filter flags. U-CK03
formalizes the syscall surface; the shell delegates verbatim today.

## Kernel handler

`.claude/kernel/psk.mjs::syscall_pick(params)` — forwards whitelisted
flags as `--<key> <value>` pairs. Forces `--json` (P0-3 fix: non-JSON
mode emits a header line that breaks the MCP round-trip parser).

## Params

| Field | Type | Maps to |
|-------|------|---------|
| `priority` | number / string | `--priority` (roadmap priority filter) |
| `slot` | string | `--slot` (per-slot lane filter) |
| `limit` | number | `--limit` (top-N) |
| `tier` | number / string | `--tier` (tier floor) |

## Returns

```json
{
  "ok": true,
  "syscall": "pick",
  "shell_only": true,
  "note": "U-CK03 will fold this into a structured composite",
  "result": [ /* picked-unit array from pick-unit.mjs --json */ ],
  "warnings": "<stderr if any>"
}
```

On `pick-unit.mjs` spawn failure: `ok: false`, `degraded: true`,
`fallback: { stderr, stdout, exitCode }`.

## Degraded mode

If `pick-unit.mjs` is missing (e.g. fresh checkout pre-bootstrap), the
kernel returns:

```json
{
  "ok": false,
  "syscall": "pick",
  "degraded": true,
  "error": "pick-unit.mjs missing at <path>",
  "note": "U-CK03 will harden this delegation",
  "fallback": null
}
```

## Doctrine pins

- **JSON output mandatory** — kernel cannot honor `--no-json` requests.
  The non-JSON header line silently strips the structured payload in
  MCP round-trip; not safe to expose.
- **Slot-aware filter** — when `slot` provided, peer-claimed units are
  filtered (per PER-SLOT-CLAIM-MS0).

## Related

| Syscall | Relation |
|---------|----------|
| [[whoami]] | Upstream — supplies slot for the filter. |
| [[checkin]] | Upstream — must claim slot before pick filters meaningfully. |
| [[manifest]] | Sister — manifest answers "what's built"; pick answers "what's next". |

## See also

- `scripts/pick-unit.mjs` — actual picker (the priority-queue consumer)
- `.claude/helpers/priority-queue.mjs` — queue source-of-truth
- `.claude/commands/pick-unit.md` — operator-facing skill
- `.claude/commands/pick-dev.md` — devtools-roadmap-locked sibling
