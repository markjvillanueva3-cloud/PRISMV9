# MILESTONE_PROGRESS — what's actually shipped vs claimed

> Generated: 2026-06-10T16:58:26.832Z
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

- Milestones loaded:        **730**
- Units across all MS:      **5752**
- Units shipped (in git):   **2729**
- Units pending:            **3023**
- Drift cases:              **192** (envelope status disagrees with git reality)

## Top recently-active milestones (last shipped → first)

| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |
|-----------|-------|------------------|---------------|---------------|-------------|
| KNOWLEDGE-VAULT-MS0 | KNOWLEDGE-VAULT | not_started | in_progress_real | 3/6 (50%) | 2026-06-06 |
| MS-P1-100PCT | WEDM-CONSOLIDATED | complete | in_progress_real | 1/4 (25%) | 2026-05-30 |
| MS-CAM-MASTERY | revenue | not_started | in_progress_real | 3/34 (9%) | 2026-05-29 |
| DOMAIN-GALAXY-DOCTRINE-MS1 | — | complete | completed_real | 26/26 (100%) | 2026-05-27 |
| PSN-SELF-IMPROVING-LOOP-MS0 | META-COORDINATION | complete | completed_real | 8/8 (100%) | 2026-05-25 |
| CC-MS0 | — | not_started | completed_real | 9/9 (100%) | 2026-05-25 |
| S1-MS1 | — | not_started | completed_real | 1/1 (100%) | 2026-05-25 |
| S1-MS2 | — | not_started | in_progress_real | 9/10 (90%) | 2026-05-25 |
| TC-MS0 | — | not_started | completed_real | 14/14 (100%) | 2026-05-25 |
| ULT-MS1 | — | not_started | completed_real | 5/5 (100%) | 2026-05-25 |
| ULT-MS2 | — | not_started | completed_real | 5/5 (100%) | 2026-05-25 |
| ULT-MS3 | — | not_started | completed_real | 5/5 (100%) | 2026-05-25 |
| ULT-MS4 | — | not_started | completed_real | 5/5 (100%) | 2026-05-25 |
| ULT-MS5 | — | not_started | completed_real | 5/5 (100%) | 2026-05-25 |
| ACP-MS5 | ACP | not_started | completed_real | 6/6 (100%) | 2026-05-25 |
| ACP-MS6 | ACP | complete | completed_real | 5/5 (100%) | 2026-05-25 |
| APP-MS0 | APP | not_started | completed_real | 12/12 (100%) | 2026-05-25 |
| CCM-MS13 | CCM | not_started | completed_real | 14/14 (100%) | 2026-05-25 |
| CCM-MS16 | CCM | not_started | completed_real | 12/12 (100%) | 2026-05-25 |
| CCM-MS17 | CCM | not_started | completed_real | 12/12 (100%) | 2026-05-25 |
| CLI-MS0 | CLI | not_started | completed_real | 22/22 (100%) | 2026-05-25 |
| COMBO-EFFICIENCY-MS0 | COMBO-EFFICIENCY | not_started | completed_real | 6/6 (100%) | 2026-05-25 |
| LATHE-P2P-CONSENSUS-MS4 | LATHE | complete | completed_real | 7/7 (100%) | 2026-05-25 |
| MCAT-MS0 | MCAT | in_progress | completed_real | 21/21 (100%) | 2026-05-25 |
| MXU-MS0 | MXU | not_started | completed_real | 6/6 (100%) | 2026-05-25 |
| MXU-MS1 | MXU | not_started | completed_real | 6/6 (100%) | 2026-05-25 |
| MXU-MS10 | MXU | not_started | completed_real | 4/4 (100%) | 2026-05-25 |
| MXU-MS2 | MXU | not_started | completed_real | 6/6 (100%) | 2026-05-25 |
| MXU-MS3 | MXU | not_started | completed_real | 6/6 (100%) | 2026-05-25 |
| MXU-MS4 | MXU | not_started | completed_real | 6/6 (100%) | 2026-05-25 |

## Drift cases (claim vs git disagrees)

| Milestone | Claimed | Real | Drift |
|-----------|---------|------|-------|
| CAMK-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CAMX-MS0.5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS0.7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS5 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS6 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS7 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-MS8 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P0B | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P1 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CAMX-V17-P3 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
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

## Top milestones with most pending units

| Milestone | Pending | Total | Shipped/Total |
|-----------|---------|-------|---------------|
| CAD-COMPLETE-MS0 | 239 | 335 | 96/335 |
| LATHE-PROD-READY-MS0 | 134 | 135 | 1/135 |
| LATHE-MASTER | 126 | 136 | 10/136 |
| DEA-MS0 | 113 | 118 | 5/118 |
| AI-STACK-PER-DOMAIN-MS0 | 104 | 104 | 0/104 |
| MS-WIRE-FRONTEND | 90 | 90 | 0/90 |
| DOMAIN-PIPELINE-MS0 | 62 | 63 | 1/63 |
| MS-WIRE-BACKEND | 60 | 60 | 0/60 |
| LATHE-LORA-MS0 | 50 | 50 | 0/50 |
| FEATURE-GAP-AUDIT-MS0 | 44 | 64 | 20/64 |
| MS-MASTERPOST | 44 | 44 | 0/44 |
| MS1 | 39 | 39 | 0/39 |
| WORKTREE-CONSOLIDATE-MS0 | 37 | 37 | 0/37 |
| MS-CAM-MASTERY | 31 | 34 | 3/34 |
| MS-AUDIT-DERIVED-2026-05-10 | 30 | 30 | 0/30 |
| MS2 | 30 | 30 | 0/30 |
| EMP-MS0 | 28 | 28 | 0/28 |
| BP-MS0 | 26 | 28 | 2/28 |
| MS-TRAIN-DEEP | 26 | 26 | 0/26 |
| AI-TRAINING-FIRST-MS0 | 25 | 25 | 0/25 |
| CADCAM-AGI-MS0 | 24 | 24 | 0/24 |
| MS-SFC-CALIBRATE | 24 | 24 | 0/24 |
| MCAT-MS0 | 21 | 22 | 1/22 |
| MS-PILOT | 20 | 20 | 0/20 |
| CAM-EXHAUST-MS0 | 18 | 189 | 171/189 |
| MS-DESKTOP | 18 | 18 | 0/18 |
| USSH-OPUS47-BOLSTER | 18 | 18 | 0/18 |
| CADCAM-DAGI-MS1 | 16 | 16 | 0/16 |
| MS-GTM | 16 | 16 | 0/16 |
| CAD-UNIVERSAL-CONTROL-MS0 | 15 | 18 | 3/18 |

## How to use

- Audit chats: cross-reference your gap lists against the **shipped**
  column in MILESTONE_PROGRESS.json. A unit listed there is in git;
  do not flag it as missing without inspecting the commit.
- Roadmap planners: rows where `claimedStatus !== derivedStatus` are
  candidates for a status update on the milestone envelope.
- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +
  knowledge/wiki/index.md collectively answer "what's already built?"
