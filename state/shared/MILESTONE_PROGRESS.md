# MILESTONE_PROGRESS — what's actually shipped vs claimed

> Generated: 2026-05-10T04:19:30.531Z
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

- Milestones loaded:        **613**
- Units across all MS:      **2751**
- Units shipped (in git):   **29**
- Units pending:            **2722**
- Drift cases:              **2** (envelope status disagrees with git reality)

## Top recently-active milestones (last shipped → first)

| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |
|-----------|-------|------------------|---------------|---------------|-------------|
| XPROC-NEURAL-OPTIMIZE-MS0 | INFRA | in_progress | in_progress_real | 29/31 (94%) | 2026-05-09 |

## Drift cases (claim vs git disagrees)

| Milestone | Claimed | Real | Drift |
|-----------|---------|------|-------|
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |

## Top milestones with most pending units

| Milestone | Pending | Total | Shipped/Total |
|-----------|---------|-------|---------------|
| CAD-COMPLETE-MS0 | 335 | 335 | 0/335 |
| LATHE-MASTER | 136 | 136 | 0/136 |
| LATHE-PROD-READY-MS0 | 135 | 135 | 0/135 |
| INTEL-OLLAMA-OBSIDIAN-MS0 | 92 | 92 | 0/92 |
| LATHE-LORA-MS0 | 50 | 50 | 0/50 |
| BP-MS0 | 28 | 28 | 0/28 |
| EMP-MS0 | 28 | 28 | 0/28 |
| CAMX-MS0.3 | 24 | 24 | 0/24 |
| INTEL-OLLAMA-OBSIDIAN-MS1 | 23 | 23 | 0/23 |
| SCIMATH-MS5 | 23 | 23 | 0/23 |
| CLI-MS0 | 22 | 22 | 0/22 |
| MCAT-MS0 | 21 | 21 | 0/21 |
| SCIMATH-WIRE-MS0 | 21 | 21 | 0/21 |
| CAMX-MS22 | 20 | 20 | 0/20 |
| SCIMATH-MS1 | 20 | 20 | 0/20 |
| CAMX-V17-P1 | 18 | 18 | 0/18 |
| CALC-HARDEN-MS0 | 18 | 18 | 0/18 |
| USSH-OPUS47-BOLSTER | 18 | 18 | 0/18 |
| SCIMATH-MS0 | 17 | 17 | 0/17 |
| SCIMATH-MS6 | 17 | 17 | 0/17 |
| CAMX-MS0.5 | 16 | 16 | 0/16 |
| CAMX-MS1 | 16 | 16 | 0/16 |
| CAMX-MS8 | 16 | 16 | 0/16 |
| CCM-MS0 | 16 | 16 | 0/16 |
| SCIMATH-MS3 | 16 | 16 | 0/16 |
| CAMX-MS19 | 15 | 15 | 0/15 |
| CAMX-V17-P11 | 15 | 15 | 0/15 |
| L8-P1-MS2 | 15 | 15 | 0/15 |
| L8-P2-MS2 | 15 | 15 | 0/15 |
| CAM-ML-CLOSEDLOOP-MS0 | 15 | 15 | 0/15 |

## How to use

- Audit chats: cross-reference your gap lists against the **shipped**
  column in MILESTONE_PROGRESS.json. A unit listed there is in git;
  do not flag it as missing without inspecting the commit.
- Roadmap planners: rows where `claimedStatus !== derivedStatus` are
  candidates for a status update on the milestone envelope.
- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +
  knowledge/wiki/index.md collectively answer "what's already built?"
