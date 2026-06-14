---
title: Slot-brief channel — targeted orchestrator→slot work orders
type: architecture
status: built
created: 2026-06-02
by: claude-5e210e4e (slot:bravo)
milestone: HERMES-MASTER-ORCHESTRATOR-MS0
tags: [hermes, zulu, orchestration, hooks, dispatcher, multi-chat, psn]
---

# Slot-brief channel

The **targeted, consume-once** counterpart to the broadcast chat-bus. Lets the
slot-less ZULU master orchestrator (the Hermes app, via the `prism_*` MCP surface it
connects to) — or any chat — push a work order to **one specific slot**, delivered
into that slot's next prompt and then consumed.

## The three inter-chat channels

| Channel | Scope | Lifetime | Surface |
|---|---|---|---|
| `slot-soul-inject` | one slot | persistent (every prompt) | `state/shared/slot-souls/<slot>.md` |
| `chat-bus` / `prism_context:chat_post` | broadcast (all slots) | re-readable | `chat-bus/messages/*.json` |
| **slot-brief (this)** | one slot | **consume-once** | `state/shared/slot-briefs/<slot>.md` |

The slot-brief channel was the one genuinely-new artifact needed for Hermes-as-ZULU
(everything else — the 6 teacher inject-hooks, the ZuluFleetGovernor/TaskAuction/
MultiModelConsensus engines, the learner loop — was already built). A separate
process like the Hermes app cannot inject into a Claude slot's context, so it writes
a surface the slot's existing UserPromptSubmit hooks read on the slot's next prompt.

## READ / deliver side — `slot-brief-inject.mjs`

UserPromptSubmit hook (committed `97cf13fee4`). On each prompt it resolves the slot
via `chat-slots.json` (same logic as `slot-soul-inject`), reads
`state/shared/slot-briefs/<slot>.md`, injects it under a `## 📨 Orchestrator brief`
header, then **consumes** it via atomic rename to
`slot-briefs/_delivered/<slot>-<intMtimeMs>-<hash>.md`.

- **At-most-once** (archive-before-emit; a sub-ms kill window can drop a brief — the
  orchestrator confirms pickup via bus/commit-log and re-issues). The `_delivered/`
  copy is a full audit trail.
- **Never throws** (every path → `{continue:true}`).
- Slot key validated `/^[a-z]+$/` **before** any `path.join` (traversal defense).
- 4096-byte head-truncate cap. Knobs: `PRISM_SLOT_BRIEF_INJECT_{DISABLE,VERBOSE}`.
- Wired in `settings.json` UserPromptSubmit after `slot-soul-inject` (C: + H:).

## WRITE side — `SlotBriefEngine` + `prism_context`

Committed `69e8232541`. `SlotBriefEngine.writeBrief({slot, body, from?})` atomically
writes `state/shared/slot-briefs/<slot>.md` (`PATHS.STATE_DIR` honors `PRISM_ROOT`,
the exact lane the hook consumes). `listPending()` / `listDelivered({slot?,limit?})`.
Same alpha-only slot guard. Wired into `contextDispatcher` next to `chat_post`:

- `prism_context:slot_brief_write` — `{slot, body, from?}` → `{written, slot, path, bytes, error}`
- `prism_context:slot_brief_list` — `{slot?, limit?}` → `{pending, pendingCount, delivered, deliveredCount}`

This is the **secure, lane-confined write path** that replaces a deferred broad
filesystem-MCP mount of the vault. `slimResponse` drops empty `pending`/`delivered`
arrays but keeps the numeric counts — consumers use `?? []`.

## End-to-end pathway

```
Hermes app ──HTTP MCP──► prism_context:slot_brief_write
        └─► state/shared/slot-briefs/<slot>.md
                └─► slot-brief-inject.mjs (next prompt of <slot>)
                        └─► injected into the slot's context, then archived
```

Lane: `state/shared/slot-briefs/{README.md,.gitignore}` (transient `<slot>.md` +
`_delivered/` git-ignored; only README tracked). Tests: 21/21 (hook) + 13/13
(engine+dispatcher). See [[reference_slot_brief_channel_2026_06_02]],
[[reference_hermes_master_orchestrator_arch_2026_06_02]].
