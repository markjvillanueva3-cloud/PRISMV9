# MILESTONE_PROGRESS — what's actually shipped vs claimed

> Generated: 2026-05-13T12:51:27.878Z
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

- Milestones loaded:        **669**
- Units across all MS:      **3465**
- Units shipped (in git):   **66**
- Units pending:            **3399**
- Drift cases:              **3** (envelope status disagrees with git reality)

## Top recently-active milestones (last shipped → first)

| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |
|-----------|-------|------------------|---------------|---------------|-------------|
| HOOK-SYNERGY-MS0 | HOOK-SYNERGY | complete | completed_real | 11/11 (100%) | 2026-05-12 |
| INFRA-CLOSEOUT-MS0 | INFRA | completed | completed_real | 2/2 (100%) | 2026-05-12 |
| OCTOPUS-NEURAL-MS0 | OCTOPUS-NEURAL | completed | completed_real | 5/5 (100%) | 2026-05-12 |
| SKILLS-UTILIZATION-MS0 | SKILLS-UTILIZATION | completed | completed_real | 8/8 (100%) | 2026-05-12 |
| HTML-PRIMARY-MS0 | HTML-PRIMARY | not_started | in_progress_real | 1/7 (14%) | 2026-05-12 |
| HOOKS-AUTOMATION-V2-MS0 | HOOKS-AUTOMATION-V2 | completed | completed_real | 10/10 (100%) | 2026-05-11 |
| XPROC-NEURAL-OPTIMIZE-MS0 | INFRA | in_progress | in_progress_real | 29/31 (94%) | 2026-05-09 |

## Drift cases (claim vs git disagrees)

| Milestone | Claimed | Real | Drift |
|-----------|---------|------|-------|
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |
| HTML-PRIMARY-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |

## Top milestones with most pending units

| Milestone | Pending | Total | Shipped/Total |
|-----------|---------|-------|---------------|
| CAD-COMPLETE-MS0 | 335 | 335 | 0/335 |
| LATHE-MASTER | 136 | 136 | 0/136 |
| LATHE-PROD-READY-MS0 | 135 | 135 | 0/135 |
| INTEL-OLLAMA-OBSIDIAN-MS0 | 92 | 92 | 0/92 |
| MS-WIRE-FRONTEND | 90 | 90 | 0/90 |
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
| INTEL-OLLAMA-OBSIDIAN-MS1 | 23 | 23 | 0/23 |
| MS-PRINT-PROGRAM-LOOP | 23 | 23 | 0/23 |
| SCIMATH-MS5 | 23 | 23 | 0/23 |
| CLI-MS0 | 22 | 22 | 0/22 |
| MCAT-MS0 | 21 | 21 | 0/21 |
| SCIMATH-WIRE-MS0 | 21 | 21 | 0/21 |
| CAMX-MS22 | 20 | 20 | 0/20 |
| MS-PILOT | 20 | 20 | 0/20 |
| SCIMATH-MS1 | 20 | 20 | 0/20 |
| CAMX-V17-P1 | 18 | 18 | 0/18 |
| CALC-HARDEN-MS0 | 18 | 18 | 0/18 |
| MS-DESKTOP | 18 | 18 | 0/18 |
| USSH-OPUS47-BOLSTER | 18 | 18 | 0/18 |
| SCIMATH-MS0 | 17 | 17 | 0/17 |

## How to use

- Audit chats: cross-reference your gap lists against the **shipped**
  column in MILESTONE_PROGRESS.json. A unit listed there is in git;
  do not flag it as missing without inspecting the commit.
- Roadmap planners: rows where `claimedStatus !== derivedStatus` are
  candidates for a status update on the milestone envelope.
- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +
  knowledge/wiki/index.md collectively answer "what's already built?"
