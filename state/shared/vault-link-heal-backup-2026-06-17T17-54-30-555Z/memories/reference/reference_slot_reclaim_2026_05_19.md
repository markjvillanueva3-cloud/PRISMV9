---
name: reference-slot-reclaim-2026-05-19
description: "SLOT-RECLAIM — post-/compact force-reclaim of a chat's PowerShell-terminal slot + the 26-slot fleet realign"
aliases: reference_slot_reclaim_2026_05_19
type: reference
source: prism-memory
synced: 2026-06-17T17:52:56.852Z
---


SLOT-RECLAIM (2026-05-19, slot delta claude-41794360, commit `ed5c49044b`). User directive: post-/compact a chat must reliably re-bind to the slot its PowerShell terminal previously owned, then run `/checkin-<nato>`.

**Two hook changes** (`.claude/hooks/`):
- `session-start-terminal-pin.mjs` — on `compact`/`clear` SessionStart, FORCE-reclaim the terminal's prior slot instead of an advisory claim. Two pure exported gates: `shouldForceReclaim(source, priorSlot, env)` (event + a known prior slot + knob) AND `peerBlocksForceReclaim(slot, chatId, slotsState, now)` (P1 SAFETY — TRUE blocks force when the slot is held by a LIVE operator-bound peer; only auto-pinned/crashed peers are reclaimable). `claimSlotForWindow` threads `--force --confirmRecent` when both pass.
- `session-start-auto-resume.mjs` — injects `/checkin-<nato>` (the slot wrapper, which `slot-bind-enforce` force-claims) instead of the generic `/checkin --topic` (which does NOT force-take a named slot).

**Keyed on `priorSlot`** (ps-window-pin → handoff frontmatter → slot-identity cache), NOT `psPinSlot` alone — because **`ps-window-pins.json` is empty in practice**: `findPsAncestorPid` resolves no PowerShell ancestor, so `tryWritePinForCurrentWindow` never writes. The PS-window-pin substrate is effectively dead; the handoff/cache fallback is what actually carries slot identity. **Follow-up:** debug why `findPsAncestorPid` fails fleet-wide (the PS-window-pin would be the ideal window-keyed signal if revived).

**26-slot fleet realign:** both hooks hardcoded a stale `SLOT_NAMES`/`VALID_SLOTS` copy at 13 (alpha..mike); canonical `chat-slots.mjs` is 26 (alpha..zulu, full NATO). The stale copies silently failed every november..zulu `.has()` check. Realigned both + a drift-guard test deep-equals against canonical. See [[feedback-slot-names-hardcoded-drift]].

`__isMain` guard added to both hooks (fail-open) so the exported pure functions are unit-testable; also fixed a latent `readFileSync(0)` hang that made the existing auto-resume test un-runnable. Tests: `slot-reclaim.test.mjs` (47 cases) + 4 realigned stale tests; 88/88 green. 4 reviewers + 3-of-3 PASS. Related: [[feedback-commit-prefix-main-on-shared-tree]].
