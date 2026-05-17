---
name: slot-identity-cache
kind: architecture
shipped_in: SLOT-DRIFT-FIX-MS0
units: [U-SDF13, U-SDF14, U-SDF15, U-SDF16]
shipped_at: 2026-05-17
slot: bravo
last_edited: 2026-05-17
---

# Slot Identity Cache — sticky chatId→slot record for /compact recovery

## Problem this exists to solve

PRISM runs up to 13 concurrent Claude chats. Each chat owns a NATO slot. On `/compact`, the **precompact handoff writer** is supposed to capture which slot this chat owned, so the **post-/compact `session-start-terminal-pin` hook** can re-bind the new session to the same slot.

Before U-SDF13 the writer's slot lookup went through `state/shared/chat-slots.json` — an **ephemeral** data structure. The slot binding can be wiped before precompact runs by ANY of:

- Heartbeat expiry + `reclaim()` sweep (10-minute TTL)
- Peer force-takeover (`/checkin-<other> --force`)
- `session-start-auto-resolve` from a concurrent /compact

When the lookup missed, the writer logged `(precompact auto-write — slot unbound)`, **omitted the `slot:` frontmatter field**, and the next session had nothing to recover from. U-SDF05's 3-tier fallback (`slot:` field → topic NATO-prefix → filename NATO-prefix) all relied on the writer having written the slot into the handoff at compact-time. When the lookup raced, every tier returned UNKNOWN, and the chat drifted to a random slot.

## Live failure observed 2026-05-17

`chatId claude-339c8ff7` drifted bravo → bravo → charlie → delta → unbound across handoff history with the SAME stable chatId. User report: *"system still not working for chat slots to stay on the same powershell terminal"* + *"this chat was bravo but you and delta compacted the same time and you claimed delta instead of bravo"*.

## Architecture

`H:/prism/.claude/helpers/slot-identity-cache.mjs` — 130 LOC, single-responsibility module.

Storage: `state/shared/chat-slot-history/<chatId>.json` — one tiny file per chatId. Schema:

```json
{ "slot": "bravo", "recordedAt": "2026-05-17T15:21:28.636Z", "host": "DESKTOP-N7MI1VB" }
```

Writes are atomic via `tmp+rename`. Path-traversal guarded by `^[A-Za-z0-9_.-]{1,128}$` regex on chatId. Cross-platform: cache dir derived from `PRISM_ROOT` env var with H:/prism fallback.

### Exports

| Function | Purpose |
|---|---|
| `isValidChatId(chatId)` | Path-traversal-safe chatId validator |
| `validSlot(slot, allowedSlots)` | Pure slot-name validator |
| `encodeRecord(rec)` | Pure encoder → JSON string |
| `decodeRecord(raw)` | Pure decoder, null-safe on corrupt JSON |
| `recordSlotForChat(chatId, slot, opts?)` | Atomic write; returns `{ok, file?, error?}` |
| `lastKnownSlotForChat(chatId, opts?)` | Read; returns slot string or null |
| `clearSlotForChat(chatId, opts?)` | Removes the cache entry |

### Wiring

| Site | Purpose |
|---|---|
| `chat-slots.mjs` L657, L690, L825 (3 sites) | Write the cache on every successful `claimSlot` return path |
| `chat-slots.mjs` `heartbeat()` (U-SDF19) | Write the cache on every heartbeat too — closes the gap for chats that claimed pre-SDF13 or have only been heartbeating since their original claim (3/8 live peers were drifting) |
| `precompact-handoff.mjs` L425-430 (U-SDF13) | Tier-3 read fallback after chat-slots.json miss |
| `per-agent-handoff.mjs` L478-485 (U-SDF13) | Tier-3 fallback in `cmdWrite` (covers manual /handoff) |
| `session-start-terminal-pin.mjs` L165-173 (U-SDF13) | Tier-4 fallback inside `readPriorSlotFromHandoff()`, VALID_SLOTS-validated |

## Recovery chain (current)

1. `chat-slots.json` lookup (ephemeral, primary)
2. `slot:` frontmatter field (U-SDF05)
3. Topic NATO-prefix (U-SDF05)
4. Filename NATO-prefix (U-SDF05)
5. **`state/shared/chat-slot-history/<chatId>.json` sticky cache** (U-SDF13 — survives all eviction modes)

## Safety properties

- Cache is **advisory hint**, not load-bearing claim. Cross-chat collisions still route through U-SDF06 cross-chat auto-resolve.
- Each chatId writes to its OWN file (keyed by chatId) → no peer-write race on a shared resource.
- Path safety: regex blocks `../`, `/`, `\`, null bytes.
- Atomic `tmp+rename` is guaranteed on NTFS — readers see pre- or post-write, never partial.
- All wire-in sites use `try { ... } catch { /* fail-soft */ }` so a broken cache never blocks the writer or pin.

## Fail-loud (U-SDF14)

Per Karpathy R12, the 3 wire-in sites in `chat-slots.mjs` `claimSlot` now stderr-log persist failures:

```
[slot-identity-cache] persist failed for <chatId>-><slot>: <error>
```

Silent EBUSY / EROFS / disk-full conditions now surface in hook telemetry.

## Cross-platform (U-SDF15)

`DEFAULT_CACHE_DIR` is derived at module load:

```js
const PRISM_ROOT = process.env.PRISM_ROOT || "H:/prism";
const DEFAULT_CACHE_DIR = `${PRISM_ROOT.replace(/[/\\]+$/, "")}/state/shared/chat-slot-history`;
```

Per-call `opts.cacheDir` and env `PRISM_SLOT_CACHE_DIR` still override.

## Test coverage

`H:/prism/.claude/helpers/slot-identity-cache.test.mjs` — 19/19 PASS via `node:test`. Real-value assertions only. Includes faithful live-failure repro test (case 18) modeling the precompact-after-eviction scenario.

## Related commits

| Commit | Unit | Description |
|---|---|---|
| `590b565fb3` | U-SDF13 | Sticky cache + 4 fallback wires (6 files, +356 LOC) |
| `9ea2f9dcf5` | U-SDF14 | Fail-loud stderr on persist failure |
| `72e7683714` | U-SDF15 | PRISM_ROOT-derived default cache dir |
| `bc11938c6f` | U-SDF16 | /goal pre-flight CLOSE-OUT-DEFERRED cross-reference |
| `9f47f18ca9` | U-SDF19 | Wire cache into `heartbeat()` + backfill 3 stale live peers (closes pre-SDF13 / heartbeat-only gap) |

## Reviewer findings (deferred follow-ups)

- **F1 (P3)**: Stale-entry accumulation — no LRU/TTL on cache directory. Operationally fine at fleet scale (~24K files/year, point-read by filename). Future `/clear-slot-cache <chatId>` skill or Stop-hook age-purge would tidy.
- **F2 (P2, closed by U-SDF15)**: Cross-drive drift addressed via PRISM_ROOT derivation.

## Related wiki

- [[session-continuity-stack]] — U-SDF02/U-SDF05/U-SDF07 terminal-window-id pinning that this complements
- [[checkin]] — `/checkin-<nato>` slot-binding command body
- [[per-agent-handoff]] — handoff writer that this fallback feeds into
