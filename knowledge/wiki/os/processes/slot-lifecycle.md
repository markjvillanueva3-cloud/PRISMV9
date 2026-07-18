---
title: PRISM Slot Lifecycle — NATO-phonetic chat process model
slug: slot-lifecycle
kind: process
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
slot: '*'
lifecycle: [claim, heartbeat, compact, resume, release]
survives: [compact, restart, terminal-window-id pin]
---

# Slot Lifecycle — How a PRISM Chat Process Lives

A chat session in PRISM is bound to a **slot** (NATO phonetic name: alpha,
bravo, charlie, delta, echo, foxtrot, golf, hotel, india, juliett, kilo,
lima, mike — 13 total). The slot survives `/compact`, terminal-window
reuse, and harness restarts via the terminal-pin + stable-session-id
chain. This entity captures the canonical lifecycle so the same model
applies to every chat in the fleet.

## Lifecycle phases

```
  ┌─────────────────────────────────────────────────────────────────┐
  │  PHASE 1 — CLAIM (session start)                                │
  │  trigger: SessionStart hook OR /checkin or /checkin-<nato>      │
  │  helpers: stable-session-id.mjs + chat-slots.mjs + terminal-pin │
  │  result: chat-slots.json[slot] = { chatId, claimedAt, pid,      │
  │                                    branch, topic, terminalWindowId } │
  └────────────────────────────────┬────────────────────────────────┘
                                   │
                                   ▼
  ┌─────────────────────────────────────────────────────────────────┐
  │  PHASE 2 — HEARTBEAT (steady state)                             │
  │  trigger: every UserPromptSubmit / loop tick                    │
  │  helper: chat-slots.mjs heartbeat                               │
  │  result: chat-slots.json[slot].lastHeartbeat refreshed          │
  │  semantics: stale slot (>5min no heartbeat) eligible for reclaim│
  └────────────────────────────────┬────────────────────────────────┘
                                   │
                            ┌──────┴──────┐
                            ▼             ▼
       ┌─────────────────────┐   ┌─────────────────────┐
       │  PHASE 3a — COMPACT │   │  PHASE 3b — RELEASE │
       │  trigger: /compact  │   │  trigger: session end│
       │  hook: precompact-  │   │  hook: precompact-   │
       │   handoff (writes   │   │   release-slot      │
       │   HANDOFF-<id>-     │   │  result: slot freed  │
       │   <topic>.md)       │   └─────────────────────┘
       └──────────┬──────────┘
                  ▼
       ┌─────────────────────┐
       │ PHASE 4 — RESUME    │
       │ trigger: SessionStart│
       │   matcher=compact   │
       │ hook: session-start-│
       │  auto-resume +      │
       │  session-start-     │
       │  terminal-pin       │
       │ result: same chatId │
       │  re-claims same slot│
       │  via terminalWindowId│
       │  pin → seamless     │
       │  continuation       │
       └─────────────────────┘
```

## Phase 1 — CLAIM

| Step | Surface | Effect |
|------|---------|--------|
| 1 | `stable-session-id.mjs` | Resolves an 8-hex chat identity that survives PID changes (3-tier resolver: stdin > env > PID-walk > cache, with cache-hit auto-upgrade per `terminal-window-id.mjs`). |
| 2 | `chat-slots.mjs claim --preferSlot <nato>` | Atomically writes the chat's claim to `chat-slots.json[slot]`. Force-take eviction requires `--force true --confirmRecent true`. |
| 3 | Terminal pin | The session's `terminalWindowId` (resolved by `terminal-window-id.mjs` 4-tier: wt > ps > pa > pp) is recorded on the slot. Future SessionStart events for the same window re-claim the same slot via this anchor. |
| 4 | `/checkin` pipeline | Optional but canonical — runs reclaim + drift check + commit hygiene + awareness inject. |

## Phase 2 — HEARTBEAT

- `chat-slots.json[slot].lastHeartbeat` is refreshed on every `claim` /
  `heartbeat` invocation.
- Stale threshold: **>5 min no heartbeat** = slot status `stale`.
  Crashed threshold: **>15 min** = `crashed`.
- The `chat-slot-heartbeat` hook fires on each prompt to refresh.

## Phase 3a — COMPACT (mid-session continuation)

- `/compact` triggers PreCompact hooks.
- `precompact-handoff.mjs` auto-writes the per-chat handoff
  (`HANDOFF-<chatId>-<topic>.md`) via the strictly-gated
  `--source precompact-hook` (must produce ≥30-char RESUME; live-chat
  RESUME <5min wins anti-clobber).
- Padding to a deterministic size (`PRISM_PRECOMPACT_HANDOFF_PAD_BYTES`,
  default 4096) via HTML-comment block.
- The compact-boundary fix (`findLastCompactOffset()` in
  `precompact-auto-trigger.mjs`) prevents the byte-estimate from
  re-flagging pre-compact bloat as current-context tokens.

## Phase 3b — RELEASE (session end)

- `precompact-release-slot.mjs` PreCompact hook fires alongside the
  handoff write — but the release is conditional (slot may need to
  survive into a /compact-continuation chain).
- Explicit release: `chat-slots.mjs release --slot <nato>` or session
  exit cleanup.

## Phase 4 — RESUME (post-compact)

The session-continuity chain (2026-05-15):

1. **`session-start-terminal-pin.mjs`** (SessionStart, all events) —
   if the same PowerShell window spawns a new chat (via /compact, /clear,
   fresh `claude` invocation), finds the slot whose `terminalWindowId`
   matches and inherits it. **10 PowerShell windows → 10 deterministic
   slot bindings.**
2. **`session-start-auto-resume.mjs`** (SessionStart matcher `compact`)
   — reads the per-chat handoff for this session's stable id, extracts
   `## RESUME`, injects as `additionalContext` so the post-/compact
   chat anchors to its prior exit-state without the user typing
   "continue".
3. **Stale handoffs** (>240m, `PRISM_AUTO_RESUME_MAX_AGE_MIN`) surface
   a hint instead of resuming.

## Recovery — drift, force-take, fork

| Failure mode | Recovery |
|--------------|----------|
| Slot bound to delta after /compact when caller expected india | Force-claim: `node H:/prism/.claude/helpers/chat-slots.mjs claim --chatId <id> --preferSlot india --force true --confirmRecent true` (this exact recovery happened in mid-/loop iter 5 of this session). |
| Index racing: peer chat's `git add` collides with mine | Documented in `feedback_conflict_fork_rule` — fork to sibling worktree (`git worktree add ../prism-<scope>`) rather than retry. The SLOT-WORKTREE-MS0 activation (2026-05-16) provides 13 canonical slot worktrees. |
| Stale slot (peer crashed) | `chat-slots.mjs reclaim` sweeps stale slots; `/checkin-<nato>` with `--force true --confirmRecent true` evicts a stuck owner. |
| Wedged terminal-window-id resolver | Never-downgrade rule (tier-wt > tier-ps > tier-pa > tier-pp) prevents flapping; cache-hit auto-upgrade probe (30s throttle) lifts a degraded tier when a higher resolver becomes available again. |

## Safety properties

- **Forward-only phase progression** — claimed → building → testing →
  committing (PER-SLOT-CLAIM-MS0). Corrupt or schema-mismatched store
  → readOnly refuse-write (never silently clobbers a peer).
- **Per-slot lockfile-guarded atomic RMW** —
  `state/shared/slot-task-claims.json` (NOT the H8 SQLite, which won't
  resolve from `.claude/helpers/`).
- **Schema bump cadence** — bump `chat-slots.json schemaVersion` only on
  `SLOT_NAMES` change or field rename; rebuild stale slot files,
  never silently migrate.

## Doctrine pins

- **Up to 26 concurrent chats** (operator directive 2026-05-15, expanded
  to 13 on 2026-05-16). New code MUST read `SLOT_NAMES` from
  `chat-slots.mjs` — never hard-code count.
- **alpha is a standard work slot** as of 2026-05-16 (the
  fleet-reaper ownership moved from alpha to golf per
  GOLF-OWNS-REAPER doctrine shift).
- **golf is a hygiene-or-work slot** — historically hygiene; usable as
  a work slot via `/checkin-golf` after bypassing
  `golf-slot-write-allowlist`.

## Related

- [[whoami]] — resolves slot identity at any phase
- [[checkin]] — phase-1 entry surface
- [[handoff]] — phase-3a output
- [[knowledge-vault-schema]] — handoff namespace doctrine
- [[_schema]] — this entity's frontmatter contract

## See also

- `.claude/helpers/chat-slots.mjs` — claim/heartbeat/reclaim store
- `.claude/helpers/stable-session-id.mjs` — 8-hex identity resolver
- `.claude/helpers/terminal-window-id.mjs` — 4-tier window pin
- `.claude/hooks/session-start-terminal-pin.mjs` — phase-4 window pin
- `.claude/hooks/session-start-auto-resume.mjs` — phase-4 RESUME inject
- `.claude/hooks/precompact-handoff.mjs` — phase-3a auto-write
- `.claude/hooks/precompact-release-slot.mjs` — phase-3b conditional release
- `state/shared/SLOT-WORKTREE-ARCHITECTURE.md` — per-slot worktree model
