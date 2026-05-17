---
title: PRISM golf hygiene slot — write-allowlist + fleet-reaper ownership
slug: golf-hygiene-slot
kind: process
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
slot: golf
lifecycle: [claim, heartbeat, hygiene-cycle, fleet-reaper-tick, compact-survival]
survives: [compact, restart, work-vs-hygiene-mode-shift]
---

# Golf — The Hygiene Slot

Golf is PRISM's hygiene slot — one of the 13 NATO-phonetic slots
(alpha..foxtrot + golf + hotel..mike) but with **distinctive doctrine
that separates it from the 12 work slots**. Originally introduced as
the 7th-chat hygiene/cleanup chat, golf now ALSO owns the fleet-reaper
doctrine (per GOLF-OWNS-REAPER shift 2026-05-17, reverting an earlier
alpha-ownership doctrine).

## Distinctive characteristics

### 1. Write-allowlist (golf-slot-write-allowlist.mjs)

A PreToolUse hook (`.claude/hooks/golf-slot-write-allowlist.mjs`) HARD-
BLOCKS every Edit/Write/MultiEdit from a golf chat outside an explicit
`FALLBACK_ALLOW` set:

```
state/shared/dashboards/**
state/shared/ledger/*.jsonl
state/shared/reports/*-dashboard.md
state/shared/AGENT_CHAT.jsonl
state/shared/golf-*.json
state/shared/.cron-locks/*.lock
state/shared/system-viz/staging/**
mcp-server/data/state/**.log
```

Feature commits from a golf chat are impossible by design. The hook's
emitted block message is the canonical allowlist source.

### 2. Self-DOS deny

A golf chat may NOT disable its own watchdog/audit/cron/allowlist.
Kill switches are operator-only — a golf chat that tries to clear its
own gates is blocked at PreToolUse. This prevents a compromised /
runaway golf chat from removing the guardrails that limit its scope.

### 3. Fleet-reaper ownership (2026-05-17 doctrine shift)

Per `GOLF-OWNS-REAPER` doctrine, golf is responsible for ensuring the
`PRISM Fleet Reaper` scheduled task is live + sweeping orphans every
~5 minutes. Originally alpha owned this; the shift to golf reflects
golf's hygiene focus. `checkin-alpha.md` skill explicitly notes
"Fleet-reaper ownership moved to golf 2026-05-16 — alpha is a standard
work slot now".

### 4. Heartbeat reuses chat-slots.json

Per U-CLEANUP-R3-UU2, golf does NOT have a dedicated heartbeat file.
Liveness is the same `chat-slots.json[golf].lastHeartbeat` as work
slots, queried via `node .claude/helpers/chat-slots.mjs golf-liveness`
which returns `{status, isAlive, ageMs, staleThresholdMs,
crashedThresholdMs}` already classified.

### 5. Handoff naming convention

Golf chats write `HANDOFF-golf-<task>.md` (slot-keyed), not
`HANDOFF-<chatId>-<topic>.md` (instance-keyed). Use
`per-agent-handoff.mjs --slot golf` to read/write.

### 6. Multi-host coexistence

Golf is a **role**, not a host-pin. One machine may host
`alpha..foxtrot + golf` together; different machines may each run
their own golf (lock files are per-host, no cross-host contention).

## Kill switches

| Knob | Effect |
|------|--------|
| `PRISM_GOLF_DISABLE=1` (planned) | Disable all golf-side cron + flip allowlist to deny-all |
| `PRISM_GOLF_FAIL_CLOSED=1` (wired) | Harden allowlist to deny-all (operator emergency) |
| `PRISM_GOLF_WRITE_ALLOWLIST_BYPASS=1` (wired, logged) | One-shot bypass; auditable |

All bypasses are logged for audit-trail.

## When to enter golf vs a work slot

| Task type | Slot |
|-----------|------|
| Feature engineering (engines, dispatchers, skills) | Any work slot (alpha..foxtrot, hotel..mike) |
| Fleet hygiene (orphan reaping, lock sweeps, log rotation) | golf |
| Close-out triage / envelope drift audits | EITHER — golf if it touches dashboards/ledgers; work slot if it touches roadmap envelopes |
| Reaper ops (`/fleet-reaper`) | golf (canonical owner per 2026-05-17 doctrine) |
| Documentation / wiki authorship | work slot (golf allowlist blocks most non-state writes) |

## Entry surfaces

- `/checkin-golf <args>` — NATO-phonetic shortcut force-claims golf,
  binds handoff, runs canonical /checkin pipeline.
- `/golf-bootstrap` — initialize golf-specific state (scheduled tasks,
  allowlist verify, fleet-reaper task ensure).

## Multi-mode (work-or-hygiene)

Per recent doctrine: golf is "historically hygiene; **usable as a work
slot** via `/checkin-golf` after bypassing `golf-slot-write-allowlist`".
That said, bypassing the allowlist defeats the purpose — golf-as-work
is an emergency mode, not a recommended pattern.

## Related

- [[slot-lifecycle]] (process) — golf inherits the 13-slot lifecycle
- [[checkin]] (command) — golf chats enter via /checkin-golf
- [[handoff]] (syscall) — golf-specific filename convention

## See also

- `.claude/hooks/golf-slot-write-allowlist.mjs` — the allowlist hook
- `.claude/commands/checkin-golf.md` — NATO shortcut for golf entry
- `.claude/commands/golf-bootstrap.md` — golf state initializer
- `.claude/commands/fleet-reaper.md` — owned by golf per current doctrine
- `state/shared/golf-owned-paths.json` — allowlist data
- `state/shared/golf-*.json` — golf-managed state files
