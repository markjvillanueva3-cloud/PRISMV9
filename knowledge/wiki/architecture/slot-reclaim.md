---
title: SLOT-RECLAIM — post-/compact terminal-slot force-reclaim
type: architecture
created: 2026-05-19
updated: 2026-05-19
tags: [slots, sessionstart-hooks, compact, terminal-pin, chat-slots]
commit: ed5c49044b
by: claude-41794360 (slot delta)
---

# SLOT-RECLAIM

## Problem

After `/compact` (or `/clear`), a chat must return to the slot its PowerShell
terminal previously owned. Two gaps made this unreliable:

1. **`session-start-terminal-pin.mjs`** claimed the slot **advisorily**. If a
   peer drifted into the slot during the `/compact` release window, the chat
   silently landed in a *different* slot and only emitted a warning — the
   operator had to `/checkin-<slot>` by hand.
2. **`session-start-auto-resume.mjs`** injected a `/checkin --topic
   <slot>-<topic>` directive. The **generic** `/checkin` does NOT force-take a
   named slot — only the hyphenated `/checkin-<nato>` wrapper triggers
   `slot-bind-enforce`'s deterministic force-claim. So even when the model ran
   the directive, the slot was not reclaimed from a drifted peer.

A live diagnosis (2026-05-19) confirmed the symptom: a post-crash chat was in
**no slot at all** ("not logged in"), its slot held by a 48-min-stale peer.

## Fix

### terminal-pin — force-reclaim on compact/clear

Two pure, exported, unit-tested gates; main() ANDs them:

- **`shouldForceReclaim(source, priorSlot, env)`** — TRUE only on a
  `compact`/`clear` event, with a known `priorSlot`, and the knob
  `PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM` unset. `startup`/`resume` events keep
  the advisory claim (a fresh window may legitimately race for a slot).
- **`peerBlocksForceReclaim(slot, chatId, slotsState, now)`** — the **safety
  gate**. Returns TRUE (→ downgrade to advisory) when the target slot is held
  by a **live, operator-bound peer** (`activity` = `checkin`/`startup`/…). A
  free slot, this chat's own slot, a **crashed** peer (heartbeat past
  `CRASH_TTL_MS` = 10 min), or an **auto-pinned** peer (`session-start-*`
  activity) never blocks. Fail-SAFE: any parse error / malformed entry → TRUE
  (never force-evict on doubt).

When both gates pass, `claimSlotForWindow` threads `--force --confirmRecent`
to `chat-slots.mjs claim`. A genuine cross-window eviction
(`previousOwner.reason === "force-takeover"`) emits a loud confirmation.

### auto-resume — `/checkin-<nato>` directive

Injects `/checkin-<nato>` (the slot wrapper, force-claimed by
`slot-bind-enforce`) instead of the generic `/checkin --topic`. The slot is
resolved from the ps-window-pin, then the handoff frontmatter.

## Why keyed on `priorSlot`, not the ps-window-pin

The ps-window-pin (`state/shared/ps-window-pins.json`, keyed on the PowerShell
ancestor PID) is the *ideal* window-keyed signal — but it is **empty in
practice**: `findPsAncestorPid` resolves no PowerShell ancestor on this host,
so `tryWritePinForCurrentWindow` never writes (`lastUpdated: null, pins: {}`).
The fix therefore keys on **`priorSlot`** = ps-window-pin → per-chat handoff
frontmatter → slot-identity cache. The handoff/cache fallback is what actually
carries slot identity. The safety gate (`peerBlocksForceReclaim`) is what makes
trusting the *advisory* handoff signal safe — a stale `priorSlot` can never
evict a healthy `/checkin` peer.

**Follow-up:** revive the ps-window-pin (debug why `findPsAncestorPid` fails)
— it would be the strictly-better window-keyed signal.

## 26-slot fleet realign

Both hooks hardcoded a `SLOT_NAMES`/`VALID_SLOTS` copy stale at **13**
(alpha..mike). The canonical `chat-slots.mjs` `SLOT_NAMES` is **26** (the full
NATO alphabet alpha..zulu). The stale copies silently failed every
november..zulu `.has()` membership check. Both realigned to 26; a drift-guard
test `deepEqual`s the hook copies against the canonical export so a future
drift fails loud.

## Knobs

- `PRISM_TERMINAL_PIN_NO_FORCE_RECLAIM=1` — disable the force-reclaim (advisory
  claim only).
- `PRISM_AUTO_RESUME_NO_CHECKIN=1` — suppress the injected `/checkin` directive.

## Files

- `.claude/hooks/session-start-terminal-pin.mjs` — `shouldForceReclaim`,
  `peerBlocksForceReclaim`, `claimSlotForWindow` force path.
- `.claude/hooks/session-start-auto-resume.mjs` — `buildSlotWrapperDirective`.
- `.claude/hooks/__tests__/slot-reclaim.test.mjs` — 47 cases.
- `.claude/hooks/__tests__/session-start-auto-resume.test.mjs` — 4 stale tests
  realigned to the 26-slot fleet.

## Notes

- The `__isMain` guard (fail-open) on both hooks lets the exported pure
  functions be imported by tests without running `main()` — and fixed a latent
  `readFileSync(0)` hang that had made the existing auto-resume test
  un-runnable under `node --test`.
- Memory: [[reference-slot-reclaim-2026-05-19]],
  [[feedback-commit-prefix-main-on-shared-tree]].
