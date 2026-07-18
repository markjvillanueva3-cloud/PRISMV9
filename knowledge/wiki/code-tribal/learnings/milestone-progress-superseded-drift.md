---
title: MILESTONE_PROGRESS superseded/shipped-status drift false-positive
type: lesson
domain: system-viz
slot: sierra
unit: SYSTEM-VIZ-HYGIENE/U-SVH-MSPROGRESS-SUPERSEDED
commit: 78d28133bb
commit_branch: cad-fusion-live-ms0
date: 2026-06-15
tags: [milestone-progress, drift, false-positive, cry-wolf, status-vocabulary, superseded, pick-unit, audit-trust]
---

# MILESTONE_PROGRESS superseded / shipped-status drift false-positive

`scripts/build-milestone-progress.mjs:computeProgress` generates the `state/shared/MILESTONE_PROGRESS.json` delta ("what's actually shipped vs what the envelope claims") that audit chats read to avoid over-reporting gaps. It understood an **incomplete milestone-envelope terminal-status vocabulary**, producing two false positives.

## The two bugs (one root cause: incomplete status vocabulary)
1. **`superseded` counted as pending.** `pending = total - shippedCount`. A `superseded` unit (deliberately NOT built) is not shipped, so it fell into `pending` -> every milestone whose remainder is superseded falsely tripped the `claims_completed_but_units_pending` drift flag. Caught on SYSTEM-VIZ-BRAIN-MS0: 15 complete + 7 shipped + 4 superseded = 26, flagged drift though genuinely done.
2. **`shipped`-status counted as pending.** The envelope-status fallback credited only `complete`/`completed`, not `shipped`. A `status:"shipped"` unit with no reachable git commit was mis-counted as pending.

## The fix
Two module-level Sets make the vocabulary explicit:
- `ENVELOPE_DONE = {complete, completed, shipped}` -- credited (case-insensitively) via the envelope-status fallback; still surfaced in `envelopeAssertedCount` when no git commit proves it (the "no-proof" signal is preserved, not masked).
- `TERMINAL_RESOLVED = {superseded, cancelled, canceled, wontfix, dropped, obsolete, removed}` -- deliberately-not-built. `deferred` is EXCLUDED (it can mean future-pending).

Per-unit `resolved` flag (mutually exclusive with `shipped` via `!isShipped &&`, so `accounted = shipped + resolved` can never exceed `total` -> `pending` is provably non-negative). `pending = total - accounted`; the drift flag + `derivedStatus` key off `accounted`.

**Wired to ALL consumers in the same commit (R15):** `consolidate-roadmaps.collectPendingUnits` (the master remaining-work set behind `/pick-unit`) + `build-state-snapshot` pending-rows now filter `!shipped && !resolved` -- otherwise a superseded unit (now `shipped:false, resolved:true`) would still be offered as a build candidate (reviewer-B P1, fixed in this commit). Backward-compatible: pre-`resolved` data leaves the field undefined -> kept.

## Live validation (numbers, not "looks fine")
- SYSTEM-VIZ-BRAIN-MS0: false-drift -> `consistent` (23 shipped + 3 resolved = 26, pending 0, `completed_real`).
- Fleet `claims_completed_but_units_pending` flags: **3 -> 2**. The 2 remaining (MS-DOCU-FINISH p3/r0, MS-VIZ-ROADMAP-BIND p10/r0) are GENUINELY pending (0 resolved) -- the fix is **surgical: kills false drift, preserves true drift.**

## Two reusable lessons
- **A drift / cry-wolf detector that doesn't understand the full status vocabulary erodes trust in its own signal.** This is part of why an audit that leans on MILESTONE_PROGRESS over-claims -- the input was noisy. Fixing the detector improves every downstream audit.
- **Live validation caught a HALF-fix.** The superseded change alone left SYSTEM-VIZ-BRAIN-MS0 still drifting; the `shipped`-status sibling bug surfaced ONLY on real data, not in the unit tests. R15 VALIDATE-on-live-data is what turned a 3/4 fix into a complete one -- and the comprehensive route (R13) meant fixing both halves + all consumers, not just the one in evidence.

## Cluster: 3 sibling fixes zeroed ALL false drift fleet-wide (2026-06-15)
The vocabulary fix above (`78d28133bb`) dropped the false `claims_completed_but_units_pending` count 3 -> 2. Two sibling units then drove it to **0**:

- **U-SVH-DRIFT-SKIP-VOCAB** (`fa30e8eef8`): the OTHER drift auditor, `scripts/audit-roadmap-drift.mjs`, had the same vocabulary gap one layer over -- its `SKIP_STATUSES` was an EXACT set `{complete,superseded,consolidated,deprecated}` that re-audited milestones marked `completed`/`shipped`/`shipped-research-only` (2 live: DEV-VELOCITY-AUTOTRIGGER-MS0, FLEET-REAPER-MS1). Extracted a shared pure `scripts/lib/roadmap-terminal-status.mjs:isSkippable` (exact set + `complete*`/`shipped*` variants + null-safe; explicitly NOT in_progress/not_started/ready/deferred). 23 tests. **Lesson: when you fix a vocabulary bug in one drift detector, grep for SIBLING detectors -- the same partial-status-list bug tends to be copy-pasted across the audit fleet.**
- **U-SVH-ENVELOPE-CLEANUP** (`67465f115a`): the residual 2 flags were ENVELOPE-DATA staleness, not code -- two milestones (`MS-VIZ-ROADMAP-BIND` 10 placeholder units, `MS-DOCU-FINISH` 3 units) were `status:completed` by real commits but their phase-units carried no `status`, so they read as falsely pending. Marked the 10 placeholders `superseded` (per the envelope's own `placeholder_disclosure`) + the 3 `shipped` (per closeout `cd1a0fc160`). **A drift detector is only as trustworthy as the data it reads -- the code fix removes false positives the GENERATOR creates; the data cleanup removes false positives the ENVELOPES create. Both are needed for a zero-false-positive signal.**

Plus **U-SVH-DIGEST-RANKEDHYBRID** (`216c2cd69b`): backfilled `RankedHybridGraphSearchEngine` into ENGINE_DIGEST (wired but digest-invisible -> duplication-guard blind), completing the A2 system-viz digest backfill.

Net: fleet `claims_completed_but_units_pending` flags 3 -> 0; every remaining flag now signals a GENUINE drift. A trustworthy drift signal is itself high-leverage -- it is the input audit chats lean on (this whole session's earlier over-claims traced partly to a noisy drift signal).

Related: [[reference_milestone_progress_surface]] - [[cross-substrate-embeds-and-docby-oracle]] (this session's prior unit, same "fix needs full coverage" theme) - [[reference_msprogress_superseded_fix_2026_06_15]].
