---
title: PRISM session — stable-session-id (8-hex chat identity)
slug: stable-session-id
kind: session
status: shipped
date: 2026-05-17
milestone: COMMAND-KERNEL-MS0
unit: U-CK04-extension
author: claude-41db1b82 (slot india)
id_anchor: stable-session-id
survives: [compact, restart, PID-change, terminal-window-reuse]
---

# stable-session-id — 8-Hex Chat Identity Anchor

The load-bearing identity primitive that survives `/compact`, harness
restarts, PID changes, and terminal-window reuse. Every slot claim,
handoff write, loop-state record, and chat-bus post is keyed on this
identity. Without it, the 13-chat fleet would lose its slot bindings
on every compact.

## Identity scheme

A chat is a string of the form `claude-<8-hex>` (e.g. `claude-41db1b82`).
The 8-hex prefix is derived from Claude's session id at the harness
level; the full identity is `claude-XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX`
(36-char UUID) and the 8-hex form is its first segment.

## Resolution chain — 3-tier resolver

```
stable-session-id.mjs  (input: optional JSON over stdin)
  ├─ Tier 0 — STDIN
  │    if stdin carries `{ session_id: "<id>" }` → use it
  │    (priority: caller-supplied beats environment beats inference)
  │
  ├─ Tier 1 — ENV
  │    CLAUDE_SESSION_ID env var (set by harness in some contexts)
  │
  ├─ Tier 2 — PID-WALK
  │    walk parent PIDs looking for `claude.exe` command line
  │    parse `--session_id <uuid>` from argv
  │
  └─ Tier 3 — CACHE FILE
       last-seen cache at .claude/cache/last-session-id.json
       falls back to "most-recently-touched cached session"
       (logs `anchors unresolved — falling back` to stderr)
```

If all tiers fail: returns `"unresolved"` rather than throwing. The
identity probe is identity-tolerant — `whoami` never crashes on
identity-resolver failure.

## Hardening (2026-05-15 — twid sister-fix carried over)

Per [[reference_session_continuity_stack_2026_05_15]], the
`terminal-window-id.mjs` resolver was hardened around the same date.
The stable-session-id resolver inherited the same lessons:

- **Never-downgrade rule** — once a session has resolved at higher tier,
  cached tier-1 result cannot be overwritten by tier-3 cache-hit.
- **Cache-hit auto-upgrade probe** — throttled 30s probe lifts a
  degraded cache entry when the higher-tier resolver becomes available.
- **`PRISM_STABLE_ID_HARD_FAIL=1`** — env knob to disable cache-fallback
  in tests / CI where deterministic identity is required.

## Consumers (every fleet primitive)

| Surface | What it does with the id |
|---------|--------------------------|
| `chat-slots.mjs claim` | Writes id into `chat-slots.json[slot].chatId`; binds the slot |
| `per-agent-handoff.mjs` | Filename suffix: `HANDOFF-<id>-<topic>.md` |
| `loop-state.mjs` | Filename suffix: `loop-state/loop-<id>.json` |
| `AGENT_CHAT.jsonl` | `session_key` / `agent_instance` fields |
| `session-start-auto-resume` | Reads handoff for matching id, injects RESUME |
| `session-start-terminal-pin` | Reads `chat-slots.json` for slot with matching id |
| Every Stop hook | Identifies the chat for telemetry / advisory routing |
| `psk whoami` | Returns the id as the first field of the identity tuple |

## Compact-survival mechanism

```
PRE-COMPACT
  chatId resolved → claude-41db1b82
  slot bound → india
  terminalWindowId → tw-pp-59096
  handoff written → HANDOFF-claude-41db1b82-knowledge-conversion.md

[/compact fires]
  Harness creates a NEW session_id under the hood (different UUID)
  BUT the same terminal window respawns claude.exe in place

POST-COMPACT — SessionStart:compact
  Tier 0 STDIN — no payload yet
  Tier 1 ENV — harness may not set
  Tier 2 PID-WALK — finds claude.exe but with NEW UUID

  THIS IS THE FAILURE PATH if we stop here.

  Recovery:
  session-start-terminal-pin reads chat-slots.json,
  finds slot=india with terminalWindowId=tw-pp-59096,
  inherits the OLD chatId=claude-41db1b82 for THIS session
  (overrides the harness's new UUID at the slot layer).

  session-start-auto-resume reads HANDOFF-claude-41db1b82-*.md,
  injects ## RESUME directive into additionalContext.

  Result: chatId survives, slot stays bound, handoff resumes —
  the operator typed nothing.
```

This is the difference between a working post-compact continuation and
a "fresh-session — no handoff for this chat" cold start.

## Drift cases observed in this session

| Symptom | Root cause |
|---------|-----------|
| Slot auto-pinned to wrong NATO (e.g. delta when india expected) | `terminalWindowId` resolved to a DIFFERENT tier post-compact (twid auto-upgrade was the 2026-05-15 fix). Recovery: `chat-slots.mjs claim --preferSlot india --force true --confirmRecent true`. |
| Handoff `read --terminal $PPID` returns "no handoff for this chat" | $PPID rotates between invocations (hook process fresh PID each call). Fix: use `stable-session-id.mjs` instead. Documented in `feedback_handoff_topic_naming`. |
| Cache fallback warning `anchors unresolved — falling back to most-recently-touched cached session` | All 3 tiers failed; using last-cached id (correct unless multiple chats fighting on same PID). |

## Safety properties

- **Tolerant identity probe** — never throws; failures degrade to
  `"unresolved"` or cache-fallback with stderr warning.
- **Caller-supplied wins** — explicit `--chatId <id>` flag or stdin
  payload beats every resolver tier.
- **Never-downgrade** — once resolved at higher tier, cached lower
  result cannot overwrite (prevents flapping under intermittent
  failures).
- **Audited fallbacks** — cache-fallback prints a stderr warning so
  operators can spot the degradation.

## Doctrine pins

- **No `$PPID` for identity-keyed I/O** — per the 2026-05-15
  hardening, `$PPID` is unstable across hook invocations; always
  prefer `stable-session-id.mjs`.
- **Identity-keyed filenames** — handoffs / loop-states / per-chat
  caches MUST use the stable id, never the harness UUID directly.
- **Tier-0 stdin takes priority** — when spawning a helper from a
  hook, pipe `{ session_id: "<id>" }` over stdin so the helper's
  Tier-0 path fires.

## Related

- [[whoami]] (syscall) — surfaces stable-session-id in its result
- [[slot-lifecycle]] (process) — depends on stable-session-id for
  the terminal-pin recovery
- [[checkin]] (command) — uses id to claim slot + bind handoff
- [[handoff]] (syscall) — id-keyed filename
- [[loop]] (pipeline) — id-keyed loop-state file

## See also

- `.claude/helpers/stable-session-id.mjs` — actual resolver
- `.claude/helpers/terminal-window-id.mjs` — sister resolver (window-pin)
- `.claude/cache/last-session-id.json` — Tier-3 cache file
- `.claude/hooks/session-start-terminal-pin.mjs` — phase-4 anchor
