---
title: Never assert size deltas on a live shared trimmed file — isolate via env knob
tags: [lessons, testing, fleet-hygiene, coordination, flake]
created: 2026-07-01
by: claude-7fae921d (slot:golf)
unit: U-GOLF-RED-TESTS (commit a908152567)
---

# Never assert size deltas on a live shared trimmed file

## The failure

`crossSessionOrchestratorHook.test.ts` asserted `after - before >= 50` bytes on the
LIVE fleet `BROADCAST_CHANNEL.jsonl` to prove the hook broadcast an event. The channel
engine (`CrossTerminalBroadcastEngine.writeToBroadcastChannel`) trims the file back to
`TRIM_LINE_CAP = 1000` lines on any append once past `TRIM_BYTE_FLOOR = 32 KiB`. The
live channel hovers at the cap (~306 KB / ~1,100 lines), so a test's own append could
REWRITE THE FILE SMALLER -> negative delta -> 4-5 nondeterministic failures per run
(kilo measured "counts vary +/-2 run-to-run"). Bonus harm: every run polluted the real
coordination channel peers watch with `__test__` events.

## The rule

1. **A size delta on a live shared mutable file is not evidence of an append.** Any
   trim/rotate/concurrent-writer makes it nondeterministic in BOTH directions (a peer
   append can also fake-green a "no broadcast" assert of `after === before`).
2. **Isolate across the process boundary with an env knob, not an in-process setter.**
   The engine had a `_setBroadcastPath()` test seam — useless for a hook spawned as a
   child process. Fix: `PRISM_BROADCAST_CHANNEL_PATH` read in the constructor
   (absent/blank -> canonical path byte-identical; redirect logged fail-loud; mirrors
   the `PRISM_COORD_SUMMARY_PATH` precedent). Per-test tmpdir channels make asserts
   exact: born-empty, exactly-1-line, payload equality, and "no broadcast" becomes
   `existsSync === false`.
3. **Guard the seam against stale dist.** The hook loads the engine via the gitignored
   dist bundle; a dist predating the knob would leak every spawn to the live channel
   while absence-asserts pass for the wrong reason. A `beforeAll` sentinel greps the
   dist artifact for the knob string and fails the whole suite up front.
4. **Expect unmasking.** The flaky assert failed FIRST, hiding stale contract asserts
   behind it: the facade (post-U-COORD04) maps semantic type `"info"` onto the
   `cache_invalidate` channel with `payload.semantic_type`/`payload.content` — the
   suite's `type === "info"` expectations had been dead for weeks. After isolation,
   assert the REAL on-disk contract (and assert `semantic_type` ABSENCE on native
   events to keep the two shapes distinguishable).

## Sibling lessons from the same unit

- **Doctrine-stale tests fail two-way**: `golfHookOrdering.test.ts` asserted the A5
  golf-slot-write-allowlist hook IS wired; the operator deliberately unwired it
  2026-05-20. Encode the CURRENT state as a live assert (`=== -1`, so an accidental
  re-wire surfaces) and preserve the when-wired invariants in
  `describe.skipIf(!wired)` so a deliberate re-wire auto-arms them with zero edits.
- **Duplicate suites drift to contradiction**: a hyphenated sibling
  (`golf-hook-ordering.test.ts`) asserted the OPPOSITE wiring state on the same
  settings surface. Map ALL of its tests (10/10 accounted), absorb unique coverage,
  resolve conflicting invariants by PICKING one (R7 — last-in-block kept, first-4
  dropped), and tombstone the duplicate. Note: a straight `git rm` in the shared tree
  did not stick (file restored within minutes; restorer unverified — peer action or
  asset-preservation stack); the tombstone route satisfies never-delete-only-disable
  and doesn't fight the restorer.

Related: [[monitor-probe-must-not-compete-for-resources]] (same class: the
measurement channel must not share fate with the contended resource it measures).
