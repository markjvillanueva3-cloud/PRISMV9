# MILESTONE_PROGRESS — what's actually shipped vs claimed

> Generated: 2026-05-14T16:06:23.818Z
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

- Milestones loaded:        **671**
- Units across all MS:      **4935**
- Units shipped (in git):   **0**
- Units pending:            **4935**
- Drift cases:              **10** (envelope status disagrees with git reality)

## Top recently-active milestones (last shipped → first)

| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |
|-----------|-------|------------------|---------------|---------------|-------------|

## Drift cases (claim vs git disagrees)

| Milestone | Claimed | Real | Drift |
|-----------|---------|------|-------|
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |
| ACP-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| HOOKS-AUTOMATION-V2-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| INFRA-CLOSEOUT-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| MACRO-PROGRAM-PIPELINE-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| OCTOPUS-NEURAL-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| SKILLS-UTILIZATION-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| TRAINING-LEARNING-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| WEDM-ERP-MS0 | completed | not_started_real | claims_completed_but_units_pending |

## Top milestones with most pending units

| Milestone | Pending | Total | Shipped/Total |
|-----------|---------|-------|---------------|
| CAD-COMPLETE-MS0 | 335 | 335 | 0/335 |
| CAM-EXHAUST-MS0 | 189 | 189 | 0/189 |
| LATHE-MASTER | 136 | 136 | 0/136 |
| LATHE-PROD-READY-MS0 | 135 | 135 | 0/135 |
| INTEL-OLLAMA-OBSIDIAN-MS0 | 92 | 92 | 0/92 |
| MS-WIRE-FRONTEND | 90 | 90 | 0/90 |
| CLEANUP-MS0 | 73 | 73 | 0/73 |
| MS-WIRE-BACKEND | 60 | 60 | 0/60 |
| MIO-MS0 | 57 | 57 | 0/57 |
| LATHE-LORA-MS0 | 50 | 50 | 0/50 |
| MS-MASTERPOST | 44 | 44 | 0/44 |
| MS1 | 39 | 39 | 0/39 |
| MS-CAM-MASTERY | 34 | 34 | 0/34 |
| XPROC-NEURAL-OPTIMIZE-MS0 | 31 | 31 | 0/31 |
| MS-AUDIT-DERIVED-2026-05-10 | 30 | 30 | 0/30 |
| MS2 | 30 | 30 | 0/30 |
| COMMAND-KERNEL-MS0 | 29 | 29 | 0/29 |
| BP-MS0 | 28 | 28 | 0/28 |
| EMP-MS0 | 28 | 28 | 0/28 |
| MS-TRAIN-DEEP | 26 | 26 | 0/26 |
| CAMX-MS0.3 | 24 | 24 | 0/24 |
| CADCAM-AGI-MS0 | 24 | 24 | 0/24 |
| MS-SFC-CALIBRATE | 24 | 24 | 0/24 |
| INTEL-OLLAMA-OBSIDIAN-MS1 | 23 | 23 | 0/23 |
| MS-PRINT-PROGRAM-LOOP | 23 | 23 | 0/23 |
| SCIMATH-MS5 | 23 | 23 | 0/23 |
| CLI-MS0 | 22 | 22 | 0/22 |
| MCAT-MS0 | 22 | 22 | 0/22 |
| MCAT-MS0 | 21 | 21 | 0/21 |
| SCIMATH-WIRE-MS0 | 21 | 21 | 0/21 |

## How to use

- Audit chats: cross-reference your gap lists against the **shipped**
  column in MILESTONE_PROGRESS.json. A unit listed there is in git;
  do not flag it as missing without inspecting the commit.
- Roadmap planners: rows where `claimedStatus !== derivedStatus` are
  candidates for a status update on the milestone envelope.
- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +
  knowledge/wiki/index.md collectively answer "what's already built?"
