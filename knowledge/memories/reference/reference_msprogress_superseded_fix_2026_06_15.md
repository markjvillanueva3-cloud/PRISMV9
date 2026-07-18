---
name: reference_msprogress_superseded_fix_2026_06_15
description: build-milestone-progress.computeProgress was counting superseded + shipped-status units as pending -> false "claims_completed_but_units_pending" drift fleet-wide; fixed with full terminal-status vocabulary (ENVELOPE_DONE + TERMINAL_RESOLVED)
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.663Z
aliases: reference_msprogress_superseded_fix_2026_06_15
---


**SYSTEM-VIZ-HYGIENE/U-SVH-MSPROGRESS-SUPERSEDED** (slot:sierra, 2026-06-15, commit `78d28133bb` on cad-fusion-live-ms0).

`scripts/build-milestone-progress.mjs:computeProgress` (the generator behind `state/shared/MILESTONE_PROGRESS.json` -- the "actually shipped vs claimed" delta audit chats read) understood an INCOMPLETE milestone-envelope terminal-status vocabulary, producing two false positives:

1. **`superseded` counted as pending.** `pending = total - shippedCount`; a superseded unit (deliberately NOT built) isn't shipped, so it fell into pending -> every milestone whose remainder is superseded falsely tripped the `claims_completed_but_units_pending` drift flag. Caught via SYSTEM-VIZ-BRAIN-MS0 (15 complete + 7 shipped + 4 superseded = 26, flagged drift though genuinely done).
2. **`shipped`-status counted as pending.** The envelope-status fallback credited only `complete`/`completed`, NOT `shipped` -> a `status:"shipped"` unit with no reachable git commit was mis-counted as pending.

**Fix:** two module-level Sets -- `ENVELOPE_DONE` {complete, completed, shipped} (case-insensitive credit, still flagged `envelopeAssertedCount` when no git proof) and `TERMINAL_RESOLVED` {superseded, cancelled, canceled, wontfix, dropped, obsolete, removed} (NOT `deferred` -- ambiguous/future). New per-unit `resolved` flag (mutually exclusive with `shipped` via `!isShipped &&`); `accounted = shipped + resolved`; `pending = total - accounted`; drift + derivedStatus key off `accounted`. **Wired to ALL consumers (R15):** `consolidate-roadmaps.collectPendingUnits` + `build-state-snapshot` pending-rows now filter `!shipped && !resolved`, so a superseded unit is never offered as a `/pick-unit` build candidate (reviewer-B P1, fixed in the same commit).

**Live validation (numbers):** SYSTEM-VIZ-BRAIN-MS0 false-drift -> consistent (23 shipped + 3 resolved = 26, pending 0, derived completed_real). Fleet `claims_completed_but_units_pending` flags 3 -> 2; the 2 remaining (MS-DOCU-FINISH p3/r0, MS-VIZ-ROADMAP-BIND p10/r0) are GENUINELY pending (0 resolved) -- surgical: kills false drift, preserves true drift. +7 tests (28 green across build-milestone-progress + consolidate-roadmaps suites). 2-agent scrutiny PASS.

**Two lessons:**
- A drift / cry-wolf detector that doesn't understand the FULL status vocabulary (terminal-DONE vs terminal-RESOLVED) emits false positives that erode trust in the very signal. This is part of WHY this session's sierra audit over-claimed -- the drift signal it leaned on was noisy. Fixing the detector improves every downstream audit.
- **Live validation caught a HALF-fix:** the superseded change alone left SYSTEM-VIZ-BRAIN-MS0 still drifting (the `shipped`-status sibling bug surfaced only on real data, not in the unit tests). R15 VALIDATE-on-live-data is what turned a 3/4 fix into a complete one.

Wiki: [[milestone-progress-superseded-drift]]. Related: [[reference_svh_xsub_surface_2026_06_15]] (this session's prior unit), [[vault/reference_milestone_progress_surface]].
