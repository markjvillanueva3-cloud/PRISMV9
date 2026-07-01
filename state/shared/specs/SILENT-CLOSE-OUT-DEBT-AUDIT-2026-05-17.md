# Silent Close-Out Debt Audit — 2026-05-17 (alpha slot)

> **Finding from /loop iter-2.** Advisory, `mustHumanVerify`. Every flagged milestone must be human-verified by checking actual engine builds + tests before flipping MILESTONE_PROGRESS.

## Headline

- **51 milestones** with envelope.status=`complete` but MILESTONE_PROGRESS.shipped=0
- **329 hidden-shipped units** — work on disk that the system tracking doesn't credit
- **~25-30% blind spot** on completed work, fleet-wide
- Verified spot-check during iter-1: **CAMK-MS0** (5/5, 14/14 tests PASS), **MF-MS1** (4/4, 689-LOC engine), **MF-MS3** (3/3, 9/9 tests in MF-MS3-MS4.test.ts)

## Why the existing audit script doesn't catch this

`scripts/audit-close-out-candidates.mjs` (header: lines 1-34) detects:
- **envelope-pending + files-exist** → operator-flips-pending-to-complete

What it MISSES (the class found here):
- **envelope-complete + MILESTONE_PROGRESS-zero** → reconcile MILESTONE_PROGRESS

`scripts/audit-roadmap-drift.mjs` only flags milestones whose `current_status` ≠ `proposed_status` (bucket-tier shift). The 51 milestones below all have envelope.status=`complete` AND their proposed_status would also resolve to complete (per `reconcile-milestones.mjs:countCompletedUnits()`), so audit-roadmap-drift sees no drift.

The drift lives in a DIFFERENT join: envelope's `units[].status` ≠ `MILESTONE_PROGRESS.shipped`. `build-milestone-progress.mjs` derives shipped from git commit subjects matching `[SCOPE]/U-ID`; pre-2026-05-12 ship commits used different subjects, so they vanish from MS_PROGRESS.

## Top-15 offenders (by drift magnitude)

| Milestone | Envelope | env_complete/total | progress_shipped | Hidden |
|-----------|----------|--------------------|-----------------:|-------:|
| CAMX-MS22 | complete | 20/20 | 0 | **+20** |
| CALC-HARDEN-MS0 | complete | 18/18 | 0 | **+18** |
| CAMX-MS19 | complete | 15/15 | 0 | **+15** |
| PIPELINE-VAR-MS0 | complete | 15/15 | 0 | **+15** |
| CAMX-MS12 | complete | 13/13 | 0 | **+13** |
| CAMX-MS15 | complete | 12/12 | 0 | **+12** |
| CAMX-MS18 | complete | 10/10 | 0 | **+10** |
| CAMX-MS21 | complete | 10/10 | 0 | **+10** |
| CAMX-MS0, 13, 14, 16, 17, 2, 20 | complete | 8/8 each | 0 | **+8 each = +56** |
| CAMK-MS0 (verified iter-1) | complete | 5/5 | 0 | **+5** |
| MF-MS1 (verified iter-1) | completed | 4/4 | 0 | **+4** |
| MF-MS3 (verified iter-1, partial) | not_started but engines built | n/a | 0 | **+3** |

Full list: 51 milestones, run `node -e` snippet in this file's commit message to reproduce.

## Why this matters

1. **/pick-unit + priority-queue.mjs surface stale units** — saw this iter-1 when queue returned 5 already-complete CLEANUP-MS0 units.
2. **BUILD_STATE / awareness headlines underreport completion** — "365 done" line in handoffs is +329 short of reality.
3. **R8 dedup-preflight is harder** — `duplicationGuardEngine.checkBeforeCreating()` doesn't surface engines that exist but whose owning MS shows 0 shipped.
4. **Peer chat coordination fails** — peers see a milestone as "pending 4/5" and pick a unit that's already built but un-credited.

## Proposed unit — U-CLOSE-OUT-AUDIT-V2-DRIFT-DETECTOR

**Goal:** add envelope-vs-progress drift detection to the close-out audit pipeline (separate concern from envelope-vs-status drift).

**Scope (small, surgical):**
1. New helper: `scripts/lib/silent-close-out-drift.mjs` — pure function `findSilentCloseOutDrift({milestonesDir, msProgress})` returning `[{ms_id, envelopeStatus, unitsComplete, total, progressShipped, drift}]`.
2. Wire into `audit-close-out-candidates.mjs`: append a new section `silent_close_out_debt` to the output JSON (NOT the existing `candidates` array — separate concern).
3. New view in CLOSE-OUT-CANDIDATES.md: `## Silent Close-Out Debt (51 milestones, 329 units)` under existing sections.
4. Tests: `audit-close-out-candidates.test.mjs` — 4 cases (no drift, single MS drift, all-MS drift, ignore not-yet-complete envelopes).
5. **NO AUTO-FLIP.** Keep `advisoryOnly: true`. Operator gates close-out via `scripts/close-out-milestone.mjs --milestone <ID>` per [[feedback_roadmap_close_out]].

**R8 dedup verified:** no existing script does envelope-vs-MILESTONE_PROGRESS-shipped drift detection (checked `audit-roadmap-drift`, `reconcile-milestones`, `reconcile-roadmap-drift`, `build-milestone-progress`, `close-out-milestone` — all check different axes).

**Estimated effort:** 1 unit, 1-2 iterations of /loop work + per-file 2-reviewer scrutiny.

## Why not auto-flip MILESTONE_PROGRESS to match envelopes

Per `feedback_auto_close_out`: file presence ≠ spec correctness. The envelope's `units[].status=complete` is operator-assertion, not git-truth. Some envelopes may have been bulk-flipped without verification (especially the 8-CAMX series — same envelope schema, same drift pattern, suggests a batch operation). Auto-flipping MILESTONE_PROGRESS would propagate any false-positives into BUILD_STATE / awareness surfaces. Surface as candidates, gate behind operator action.

## What I did NOT do (per shared-tree caution)

- Did not modify `audit-close-out-candidates.mjs` (would touch shared tree; 85 ahead / 1 behind / 6713 dirty files mid-merge)
- Did not run `reconcile-milestones.mjs` (would modify envelope files claimed by peers)
- Did not auto-flip any MILESTONE_PROGRESS entries

## Next-iter action (queued for iter 3)

1. Confirm peer activity on close-out audit code (search recent commits)
2. Decide: build in slot worktree OR queue as a unit-spec for a future build session
3. If queued: write to atomic-roadmap.json / ROADMAP-CONSOLIDATED so /pick-unit picks it up

## Source

- Inline analysis run via `node -e` in /loop iter-2 (claude-69c63409 / 2026-05-17T23:54Z)
- Reproducer: see commit message body of this file
- Cross-references:
  - `state/shared/MILESTONE_PROGRESS.json` — derived from git
  - `mcp-server/data/milestones/*.json` — envelope ground truth
  - `mcp-server/data/state/roadmap-drift-report.json` — existing 17-case drift report (different drift class)
