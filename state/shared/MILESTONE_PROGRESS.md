# MILESTONE_PROGRESS — what's actually shipped vs claimed

> Generated: 2026-05-13T13:54:10.225Z
> Window: last 60.days of git log across all branches
> Source: `scripts/build-milestone-progress.mjs`

## Why this file exists

Milestone envelope JSONs (`mcp-server/data/milestones/*.json`) carry a
`status` field that drifts: roadmap planners write `"not_started"`,
then chats ship units without flipping the status. Parallel audit chats
compare envelopes to reality and over-report gaps.

This file is generated FROM git log — it sees what was actually
committed. Use it to subtract "shipped" from "claimed pending" before
flagging a unit as missing.

## Headline numbers

- Milestones loaded:        **670**
- Units across all MS:      **3538**
- Units shipped (in git):   **1099**
- Units pending:            **2439**
- Drift cases:              **166** (envelope status disagrees with git reality)

## Top recently-active milestones (last shipped → first)

| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |
|-----------|-------|------------------|---------------|---------------|-------------|
| CC-EXT-MS0 | — | not_started | in_progress_real | 5/8 (63%) | 2026-05-13 |
| CC-EXT-MS1 | — | not_started | in_progress_real | 5/8 (63%) | 2026-05-13 |
| CC-EXT-MS2 | — | not_started | in_progress_real | 5/8 (63%) | 2026-05-13 |
| CC-EXT-MS3 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| CC-EXT-MS4 | — | not_started | completed_real | 5/5 (100%) | 2026-05-13 |
| CC-EXT-MS5 | — | not_started | completed_real | 5/5 (100%) | 2026-05-13 |
| CC-EXT-MS6 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| CC-MS0 | — | not_started | completed_real | 9/9 (100%) | 2026-05-13 |
| L0-NEW-MS0 | — | not_started | completed_real | 3/3 (100%) | 2026-05-13 |
| L2-P4-MS1 | — | not_started | in_progress_real | 5/10 (50%) | 2026-05-13 |
| L8-P0-MS2 | — | not_started | in_progress_real | 5/12 (42%) | 2026-05-13 |
| L8-P1-MS2 | — | not_started | in_progress_real | 5/15 (33%) | 2026-05-13 |
| L8-P2-MS2 | — | not_started | in_progress_real | 5/15 (33%) | 2026-05-13 |
| L9-P1-MS1 | — | not_started | in_progress_real | 5/8 (63%) | 2026-05-13 |
| L9-P2-MS1 | — | not_started | in_progress_real | 5/8 (63%) | 2026-05-13 |
| QA-MS0 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| QA-MS1 | — | not_started | in_progress_real | 5/7 (71%) | 2026-05-13 |
| QA-MS10 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| QA-MS11 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| QA-MS12 | — | not_started | in_progress_real | 4/5 (80%) | 2026-05-13 |
| QA-MS13 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| QA-MS14 | — | not_started | in_progress_real | 3/4 (75%) | 2026-05-13 |
| QA-MS2 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| QA-MS3 | — | not_started | in_progress_real | 5/7 (71%) | 2026-05-13 |
| QA-MS4 | — | not_started | in_progress_real | 5/6 (83%) | 2026-05-13 |
| QA-MS5 | — | not_started | in_progress_real | 5/8 (63%) | 2026-05-13 |
| QA-MS6 | — | not_started | in_progress_real | 5/8 (63%) | 2026-05-13 |
| QA-MS7 | — | not_started | in_progress_real | 5/7 (71%) | 2026-05-13 |
| QA-MS8 | — | complete | in_progress_real | 4/5 (80%) | 2026-05-13 |
| QA-MS9 | — | not_started | in_progress_real | 5/7 (71%) | 2026-05-13 |

## Drift cases (claim vs git disagrees)

| Milestone | Claimed | Real | Drift |
|-----------|---------|------|-------|
| CC-EXT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS10 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS11 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS4 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS5 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS6 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS7 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS8 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CC-MS9 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-NEW-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P0-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L0-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P1-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L1-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L10-P3-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P3-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L2-P4-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L3-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L3-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L4-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L4-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L5-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L5-P0-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L5-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L6-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L6-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L7-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P0-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L8-P1-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P1-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L8-P2-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L8-P2-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L8-P3-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L9-P0-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| L9-P1-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| L9-P2-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |
| QA-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |

## Top milestones with most pending units

| Milestone | Pending | Total | Shipped/Total |
|-----------|---------|-------|---------------|
| CAD-COMPLETE-MS0 | 335 | 335 | 0/335 |
| LATHE-MASTER | 136 | 136 | 0/136 |
| LATHE-PROD-READY-MS0 | 135 | 135 | 0/135 |
| MS-WIRE-FRONTEND | 90 | 90 | 0/90 |
| CLEANUP-MS0 | 73 | 73 | 0/73 |
| MS-WIRE-BACKEND | 60 | 60 | 0/60 |
| LATHE-LORA-MS0 | 50 | 50 | 0/50 |
| MS-MASTERPOST | 44 | 44 | 0/44 |
| MS1 | 39 | 39 | 0/39 |
| MS-CAM-MASTERY | 34 | 34 | 0/34 |
| MS2 | 30 | 30 | 0/30 |
| BP-MS0 | 28 | 28 | 0/28 |
| EMP-MS0 | 28 | 28 | 0/28 |
| MS-TRAIN-DEEP | 26 | 26 | 0/26 |
| CAMX-MS0.3 | 24 | 24 | 0/24 |
| MS-SFC-CALIBRATE | 24 | 24 | 0/24 |
| MS-PRINT-PROGRAM-LOOP | 23 | 23 | 0/23 |
| CAMX-MS22 | 20 | 20 | 0/20 |
| MS-PILOT | 20 | 20 | 0/20 |
| CAMX-V17-P1 | 18 | 18 | 0/18 |
| CALC-HARDEN-MS0 | 18 | 18 | 0/18 |
| MS-DESKTOP | 18 | 18 | 0/18 |
| USSH-OPUS47-BOLSTER | 18 | 18 | 0/18 |
| CAMX-MS0.5 | 16 | 16 | 0/16 |
| CAMX-MS1 | 16 | 16 | 0/16 |
| CAMX-MS8 | 16 | 16 | 0/16 |
| MS-CRITWIRE | 16 | 16 | 0/16 |
| MS-GTM | 16 | 16 | 0/16 |
| CAMX-MS19 | 15 | 15 | 0/15 |
| CAMX-V17-P11 | 15 | 15 | 0/15 |

## How to use

- Audit chats: cross-reference your gap lists against the **shipped**
  column in MILESTONE_PROGRESS.json. A unit listed there is in git;
  do not flag it as missing without inspecting the commit.
- Roadmap planners: rows where `claimedStatus !== derivedStatus` are
  candidates for a status update on the milestone envelope.
- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +
  knowledge/wiki/index.md collectively answer "what's already built?"
