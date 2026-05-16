# MILESTONE_PROGRESS — what's actually shipped vs claimed

> Generated: 2026-05-16T19:12:34.494Z
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

- Milestones loaded:        **681**
- Units across all MS:      **5136**
- Units shipped (in git):   **639**
- Units pending:            **4497**
- Drift cases:              **11** (envelope status disagrees with git reality)

## Top recently-active milestones (last shipped → first)

| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |
|-----------|-------|------------------|---------------|---------------|-------------|
| CAD-UNIVERSAL-CONTROL-MS0 | AI-CAD | in_progress | in_progress_real | 3/18 (17%) |  |
| AWARE-MS0 | AI-CORE | unknown | in_progress_real | 2/8 (25%) |  |
| AI-INTEG-MS4 | AI-INTEG | complete | completed_real | 4/4 (100%) |  |
| AI-MAX-MS0 | AI-MAX | in_progress | in_progress_real | 9/12 (75%) |  |
| MIO-MS0 | AI-ORCH | complete | completed_real | 57/57 (100%) |  |
| CAD-AI-DEEP | CAD | complete | completed_real | 6/6 (100%) |  |
| CAD-AI-ULTRA | CAD | complete | completed_real | 6/6 (100%) |  |
| CADCAM-DAGI-MS0 | CAD-CAM-DEEPAGI | complete | completed_real | 14/14 (100%) |  |
| CAD-COMPLETE-MS0 | CAD-COMPLETE | in_progress | in_progress_real | 33/335 (10%) |  |
| CAD-INFRA-MS0 | CAD-INFRA | complete | in_progress_real | 4/16 (25%) |  |
| 5AXIS-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| CAM-AI-DEEP | CAM | complete | completed_real | 7/7 (100%) |  |
| CONTROLLER-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| HSM-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| LATHE-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| MILLTURN-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| POST-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| PROBING-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| TOOLING-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| TRAINING-MANUAL-AI | CAM | complete | completed_real | 8/8 (100%) |  |
| WORKHOLDING-AI | CAM | complete | completed_real | 1/1 (100%) |  |
| CAM-EXHAUST-MS0 | CAM-EXHAUST | ready | in_progress_real | 156/189 (83%) |  |
| CK-MS0 | CK | complete | completed_real | 5/5 (100%) |  |
| CK-MS1 | CK | complete | completed_real | 4/4 (100%) |  |
| SYSTEM-VIZ-BRAIN-MS0 | devtools | in_progress | in_progress_real | 15/26 (58%) |  |
| COORD-MS0 | INFRA | unknown | in_progress_real | 9/12 (75%) |  |
| TOKEN-OPT-MS0 | INFRA | complete | completed_real | 7/7 (100%) |  |
| SLOT-WORKTREE-MS0 | INFRA-CONSOLIDATE | complete | in_progress_real | 1/16 (6%) |  |
| FLEET-REAPER-MS1 | INFRA-FLEET-HYGIENE | completed | completed_real | 6/6 (100%) |  |
| LOCAL-LLM-MS0 | LOCAL-LLM | complete | completed_real | 4/4 (100%) |  |

## Drift cases (claim vs git disagrees)

| Milestone | Claimed | Real | Drift |
|-----------|---------|------|-------|
| MF-MS1 | completed | not_started_real | claims_completed_but_units_pending |
| MF-MS2 | completed | not_started_real | claims_completed_but_units_pending |
| ACP-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| HOOKS-AUTOMATION-V2-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| INFRA-CLOSEOUT-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| OCTOPUS-NEURAL-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| MS-DOCU-FINISH | completed | not_started_real | claims_completed_but_units_pending |
| MS-DOCU-INGEST | completed | not_started_real | claims_completed_but_units_pending |
| RGS-TOOL-AUTOINVOKE-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| SKILLS-UTILIZATION-MS0 | completed | not_started_real | claims_completed_but_units_pending |
| TRAINING-LEARNING-MS0 | completed | not_started_real | claims_completed_but_units_pending |

## Top milestones with most pending units

| Milestone | Pending | Total | Shipped/Total |
|-----------|---------|-------|---------------|
| CAD-COMPLETE-MS0 | 302 | 335 | 33/335 |
| LATHE-MASTER | 136 | 136 | 0/136 |
| LATHE-PROD-READY-MS0 | 135 | 135 | 0/135 |
| INTEL-OLLAMA-OBSIDIAN-MS0 | 92 | 92 | 0/92 |
| MS-WIRE-FRONTEND | 90 | 90 | 0/90 |
| CLEANUP-MS0 | 73 | 73 | 0/73 |
| MS-WIRE-BACKEND | 60 | 60 | 0/60 |
| LATHE-LORA-MS0 | 50 | 50 | 0/50 |
| MS-MASTERPOST | 44 | 44 | 0/44 |
| MS1 | 39 | 39 | 0/39 |
| WORKTREE-CONSOLIDATE-MS0 | 37 | 37 | 0/37 |
| MS-CAM-MASTERY | 34 | 34 | 0/34 |
| CAM-EXHAUST-MS0 | 33 | 189 | 156/189 |
| XPROC-NEURAL-OPTIMIZE-MS0 | 31 | 31 | 0/31 |
| MS-AUDIT-DERIVED-2026-05-10 | 30 | 30 | 0/30 |
| MS2 | 30 | 30 | 0/30 |
| COMMAND-KERNEL-MS0 | 29 | 29 | 0/29 |
| BP-MS0 | 28 | 28 | 0/28 |
| EMP-MS0 | 28 | 28 | 0/28 |
| MS-TRAIN-DEEP | 26 | 26 | 0/26 |
| OBSIDIAN-INTELLIGENCE-MS3 | 25 | 25 | 0/25 |
| CAMX-MS0.3 | 24 | 24 | 0/24 |
| CADCAM-AGI-MS0 | 24 | 24 | 0/24 |
| MS-SFC-CALIBRATE | 24 | 24 | 0/24 |
| INTEL-OLLAMA-OBSIDIAN-MS1 | 23 | 23 | 0/23 |
| MS-PRINT-PROGRAM-LOOP | 23 | 23 | 0/23 |
| SCIMATH-MS5 | 23 | 23 | 0/23 |
| CLI-MS0 | 22 | 22 | 0/22 |
| MCAT-MS0 | 22 | 22 | 0/22 |
| MCAT-MS0 | 21 | 21 | 0/21 |

## How to use

- Audit chats: cross-reference your gap lists against the **shipped**
  column in MILESTONE_PROGRESS.json. A unit listed there is in git;
  do not flag it as missing without inspecting the commit.
- Roadmap planners: rows where `claimedStatus !== derivedStatus` are
  candidates for a status update on the milestone envelope.
- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +
  knowledge/wiki/index.md collectively answer "what's already built?"
