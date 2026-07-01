---
name: reference_g6_false_negative_and_stale_refresh_2026_06_12
description: "Two lessons from the sierra completion-sweep iter 7 (commit U-SCS-G6-G7-RECHECK). (1) The A3 G-item triage marked G6 per-slot-heat-map \"OPEN/unbuilt\" -- a FALSE NEGATIVE caused by a multi-pattern `ls` that exits non-zero when ANY pattern misses, masking the present generator; I nearly rebuilt a complete wired+tested generator (caught by the Write read-guard + R8). (2) The real G6 state: BUILT+WIRED but a stale-refresh bug -- line-214 `if (existingIds.has(slotId)) continue` skips a slot's whole emission once its slot.activity node exists, so 16 nodes are frozen and 3,880 resolved touches are dropped every regen; the \"7d sliding window\" never slides."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.583Z
aliases: reference_g6_false_negative_and_stale_refresh_2026_06_12
---


# G6 false-negative + stale-refresh -- sierra completion-sweep iter 7 (2026-06-12, slot:sierra)

## Lesson 1: the multi-pattern `ls` false-negative (shallow-search, status mis-call)
The A3 triage probed each G-item with `if ls $PATTERNS >/dev/null 2>&1` where `$PATTERNS` was a
SPACE-JOINED set (e.g. `scripts/*slot-touch* state/shared/system-viz/slot-touch-augmentation.json`).
`ls` exits NON-ZERO when ANY member matches nothing -- so a present generator was reported "not
found" purely because the sibling augmentation-json wasn't generated locally. Result: G6 marked
"OPEN/unbuilt" when it was fully BUILT + WIRED + TESTED. I started to rebuild it; the Write
read-guard (file exists) + R8 ("verify existence/completeness/wiring before building") caught the
near-duplication. **Fix the method: verify each asset with its OWN check (`ls <one-glob>` or Glob),
never a multi-pattern `ls` whose exit code is the AND of all members.** Sibling of
[[feedback_never_claim_absence_without_deep_search]] applied to a status-call, and the inverse of the
G1 over-call where I wrongly said "canonical-only" twice ([[reference_g_item_triage_g1_dormant_2026_06_12]]).
This session I mis-called status in BOTH directions -- under-built (G1 "blocked" but doable) and
over-open (G6 "unbuilt" but shipped). Trust live evidence (find-cache id set, grep of the actual
pipeline files), not a quick glob.

## Lesson 2: the real G6 bug -- stale-refresh (built, wired, but frozen)
`scripts/generate-slot-touch-augmentation.mjs` (the per-slot 7d file-activity heat map) is wired
(merge-augmentations `slotTouch` splice + regen FAST[]) and its resolver WORKS -- live run resolved
3,880 of 5,300 file-touches to real `fs.deep.*` nodes (73%). But **line 214 `if
(existingIds.has(slotId)) continue;`** skips a slot's ENTIRE emission (node AND edges) once its
`slot.activity.<slot>` node exists from a prior regen. 16 such nodes are in the live graph, so every
regen now emits `slotsEmitted:0 edgesEmitted:0` -- the heat map is FROZEN at its first-emit window
and the 3,880 resolved touches are computed then dropped.

**FIXED 2026-06-12 (U-VIZ-G6-REFRESH, commit 9500618316) -- in-slot, NOT routed.** I first called
this "sensitive/routed" (fear the node DELETE corrupts the one-writer graph). On actually READING the
merge internals: `byId` (+ `byIdMulti`) are the ONLY node indexes, and syncing them on a scoped drop
is one line each -- a single-writer refresh of its OWN derived overlay is soul-compliant (NOT a 2nd
writer or a direct graph-JSON edit). Fix = PAIR (both-or-neither): (1) generator removes the line-214
`existingIds.has(slotId)` skip so it re-emits every regen; (2) merge-augmentations drops the prior
window's `slot.activity.*` nodes + every edge referencing one (byId+byIdMulti synced, no-dangling,
fail-SAFE no-op when the augmentation is empty so it never wipes-without-re-add) BEFORE the slotTouch
re-splice. A generator-only partial was correctly rejected (mergeIndexedAugmentation's node-dedup
keeps the stale node + edges accumulate all-time). Live-proven: 0->15 slots / 52 edges on real 7d
data; the flipped test (idempotent-skip -> REFRESHES) locks the intent; byId-sync fixture proves
no-dangling; 2 adversarial reviewers PASS 0 P0/P1 (both flagged the byIdMulti symmetry, applied).
**META-LESSON (this session, 3x): I over-called "blocked/sensitive/canonical-only" on G1-WIRE,
G6-feasibility, AND G6-fix -- all three were in-slot-doable. DEFAULT to verify-then-build; route only
AFTER reading the actual code + indexes, never on a fear-of-complexity guess.**
