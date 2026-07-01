---
name: reference-foxtrot-mill-binding-preferslot-2026-05-28
description: chat-slots claim uses --preferSlot (NOT --slot); wrong flag silently auto-walks to a free slot.
type: reference
slot: foxtrot
source: prism-memory
synced: 2026-06-27T20:30:46.579Z
aliases: reference_foxtrot_mill_binding_preferslot_2026_05_28
---


# chat-slots claim flag is `--preferSlot`, not `--slot`

`node .claude/helpers/chat-slots.mjs claim --slot foxtrot --chatId <id>` **silently ignores** the `--slot` arg and auto-walks to the first free slot (landed me on `alpha` when I wanted `foxtrot`). The function reads `input.preferSlot`.

Correct: `claim --preferSlot foxtrot --chatId <id> --topic <t>`. To move off a wrongly-claimed slot: `release --chatId <id>` first, then claim with `--preferSlot`. Force-takeover of a recently-claimed live slot needs `--force --confirmRecent` (recency guard, RECENT_CLAIM_GUARD_MS).

Valid CLI actions: `claim, heartbeat, release, reclaim, status, find, golf-liveness`. There is no `checkin` action (that's the `/checkin-<slot>` skill, separate).

**Why:** wrong flag wastes a claim call + squats the wrong slot (risk of evicting a peer). **How to apply:** always `--preferSlot <name>` when binding a specific slot; verify with `status`.
