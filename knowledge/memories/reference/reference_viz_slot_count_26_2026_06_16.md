---
name: reference_viz_slot_count_26_2026_06_16
description: U-VIZ-SLOT-COUNT-26 (slot:sierra) -- fixed stale 13-slot SLOT_NAMES_FALLBACK in 2 system-viz slot scripts (fleet is 26 since SLOT-RECLAIM 2026-05-19); R15 sweep of the 13->26 drift CLASS found 4 instances total (2 fixed, 1 deferred-bigger, 1 simple-candidate)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.253Z
aliases: reference_viz_slot_count_26_2026_06_16
---


**SYSTEM-VIZ-HARDEN/U-VIZ-SLOT-COUNT-26** (slot:sierra, system-viz domain, 2026-06-16, commit `63a0fee715` on cad-fusion-live-ms0).

Found via the system-viz red-test scan (`readChatSlots` subtests failing `26 !== 13`). Root: the fleet expanded **13->26 slots** (alpha..mike -> alpha..zulu) in SLOT-RECLAIM 2026-05-19, but several scripts kept hand-maintained 13-slot mirrors that drifted from the canonical `SLOT_NAMES` in `.claude/helpers/chat-slots.mjs` (line ~109, the source of truth -- per doctrine "never hard-code the count, read the array length").

**FIXED (commit 63a0fee715):**
- `scripts/system-viz-slot-ownership.mjs` + `scripts/system-viz-fleet-awareness.mjs`: each had its own `SLOT_NAMES_FALLBACK` stuck at 13 (alpha..mike). The fallback (buildPalette/buildSlotOwnership/buildFleetAwarenessPanel defaults + readChatSlots import-failure path) silently UNDER-handled slots 14-26. Extended both to the exact canonical 26-name list + retargeted the hardcoded-13 test assertions (palette length, distinct-color count, slotNames.length, slotsAvailable) to `SLOT_NAMES_FALLBACK.length` (drift-proof). The deepEqual drift-catch (`slotNames === SLOT_NAMES_FALLBACK`) is the UNCHANGED load-bearing exactness gate (not a weakening). Both test files 42/42 (were 40/2 + 41/1). 2-agent scrutiny PASS.

**R15 "build it everywhere" sweep of the CLASS** (grep array terminating at `"mike"` = stale-13 signature, multiline, across scripts/*.mjs):
- `system-viz-slot-ownership.mjs` -- FIXED.
- `system-viz-fleet-awareness.mjs` -- FIXED.
- `generate-slot-synergy-features.mjs` -- **DEFERRED (bigger unit).** Has `SLOT_NAMES` (13) AND a `SLOT_DOMAINS` map (lines ~82-96) that is BOTH incomplete (13 of 26) AND divergent from the CURRENT canonical CHAT-SLOT-DOMAINS (it uses the OLD DOMAIN-PIPELINE-MS0 mapping: alpha=mill, charlie=wire-edm, echo=cam, juliett=speed-feed, mike=misc -- vs current alpha=token-opt, charlie=quoting, echo=post-proc, juliett=database, mike=wire-wizard). Its test asserts `SLOT_NAMES is exactly 13` + `every slot has a domain mapping (no orphan slots)` + "16 anchors + 13 slot nodes". Complete fix = SLOT_NAMES->26 + SLOT_DOMAINS reconciled-to-canonical-AND-extended-to-26 + ~6 test assertions 13->26. Needs the CURRENT canonical slot->domain map (real data -- guessing romeo/uniform/victor/yankee domains would violate R12). I reverted my partial SLOT_NAMES edit to avoid a half-fix; it was already drift-red before me.
- `migrate-slot-queue.mjs` -- **CANDIDATE (simple, deferred).** `VALID_SLOTS` Set (line ~33) stuck at 13 -> `--from/--to november..zulu` (real slots) are rejected as invalid. No test file (verify via `--dry-run` smoke). Simple fix: extend the Set to 26.

**Canonical fix pattern for this class:** extend the hand-mirror to the exact 26-name canonical list (copied from chat-slots.mjs SLOT_NAMES) AND retarget test asserts to `<mirror>.length` not magic 13/26. The hardcoded mirror is design-intentional (a FALLBACK can't import the thing it falls back FOR); the drift-catch deepEqual test is the safety net that fires on the next expansion.

**Lesson:** a fleet-roster expansion (13->26) leaves a trail of hand-maintained mirrors that drift silently until a drift-catch test or a downstream count assertion fires. Sweep by the array-terminator signature, and beware that some mirrors carry MORE than the name list (e.g. a divergent SLOT_DOMAINS map) -- those are bigger reconciliation units, not mechanical extends. Sibling: [[reference_viz_coverage_bigread_2026_06_16]] (the other system-viz drift class this session -- the 765MB graph string-cap). Doctrine: SLOT_NAMES canonical, read .length.
