# MILESTONE_PROGRESS — what's actually shipped vs claimed

> Generated: 2026-06-27T15:35:34.214Z
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
- Units across all MS:      **5751**
- Units shipped (in git):   **1875**
- Units pending:            **3862**
- Drift cases:              **23** (envelope status disagrees with git reality)

## Top recently-active milestones (last shipped → first)

| Milestone | Track | Status (claimed) | Status (real) | Shipped/Total | Last commit |
|-----------|-------|------------------|---------------|---------------|-------------|
| MS-PRINT-PROGRAM-LOOP | revenue | in_progress | in_progress_real | 10/23 (43%) | 2026-06-22 |
| FEATURE-GAP-AUDIT-MS0 | AUDIT | in_progress | in_progress_real | 21/64 (33%) | 2026-06-22 |
| PIPELINE-IR-MS0 | PIPELINE-IR | complete | completed_real | 3/3 (100%) | 2026-06-21 |
| MULTI-CLI-SYNC-HOOK-MS28 | L0-INFRA | complete | completed_real | 2/2 (100%) | 2026-06-18 |
| GRAPH-AS-LLM-CONTEXT-MS0 | GRAPH-AS-LLM-CONTEXT | complete | completed_real | 8/8 (100%) | 2026-06-15 |
| KNOWLEDGE-VAULT-MS0 | KNOWLEDGE-VAULT | not_started | in_progress_real | 3/6 (50%) | 2026-06-06 |
| MS-P1-100PCT | WEDM-CONSOLIDATED | complete | in_progress_real | 1/4 (25%) | 2026-05-30 |
| MS-CAM-MASTERY | revenue | not_started | in_progress_real | 3/34 (9%) | 2026-05-29 |
| DOMAIN-GALAXY-DOCTRINE-MS1 | — | complete | completed_real | 26/26 (100%) | 2026-05-27 |
| PSN-SELF-IMPROVING-LOOP-MS0 | META-COORDINATION | complete | completed_real | 8/8 (100%) | 2026-05-25 |
| COMBO-EFFICIENCY-MS0 | COMBO-EFFICIENCY | not_started | in_progress_real | 5/6 (83%) | 2026-05-25 |
| DEA-MS0 | INFRA | not_started | in_progress_real | 5/118 (4%) | 2026-05-24 |
| MS-CRITWIRE | revenue | not_started | in_progress_real | 7/16 (44%) | 2026-05-24 |
| JM-DIE-PROGRAM-ANALYSIS-MS0 | — | in_progress | in_progress_real | 3/7 (43%) | 2026-05-24 |
| JM-DIE-FINANCIAL-BASELINE-MS0 | — | in_progress | in_progress_real | 1/6 (17%) | 2026-05-24 |
| TOOL-CATALOG-INGEST-MS0 | TOOL-CATALOG-INGEST | in_progress | in_progress_real | 10/20 (50%) | 2026-05-24 |
| CAD-COMPLETE-MS0 | CAD-COMPLETE | in_progress | in_progress_real | 123/335 (37%) | 2026-05-23 |
| POST-PROCESSOR-COVERAGE-MS0 | POST | complete | completed_real | 1/1 (100%) | 2026-05-23 |
| HURCO-WINMAX-PROVEOUT-MS0 | POST | complete | completed_real | 1/1 (100%) | 2026-05-23 |
| PSN-SYNERGY-COLLECT-MS1 | META | complete | completed_real | 1/1 (100%) | 2026-05-23 |
| PSN-SYNERGY-INSPECT-MS0 | META | complete | completed_real | 1/1 (100%) | 2026-05-23 |
| SF-PSN-WIRE-MS0 | SF-PSN | not_started | completed_real | 13/14 (93%) | 2026-05-23 |
| CAD-DRAW-MAX-MS1 | CAD-AUTONOMOUS-DRAWING | complete | completed_real | 3/3 (100%) | 2026-05-23 |
| INTEL-OLLAMA-OBSIDIAN-MS0 | INFRA | in_progress | in_progress_real | 87/92 (95%) | 2026-05-23 |
| OLLAMA-EXPAND-MS0 | INTEL | in_progress | completed_real | 1/1 (100%) | 2026-05-22 |
| GRAPH-OCTOPUS-AUTOWIRE-MS0 | GRAPH-OCTOPUS | completed | completed_real | 17/17 (100%) | 2026-05-22 |
| COMMAND-KERNEL-MS0 | BACKEND-DEVTOOLS | in_progress | completed_real | 29/29 (100%) | 2026-05-22 |
| KILO-P2P-RECONCILE-MS0 | KILO-P2P | complete | completed_real | 4/4 (100%) | 2026-05-22 |
| CADCAM-DAGI-MS4 | CAD-CAM-DEEPAGI | not_started | in_progress_real | 2/16 (13%) | 2026-05-22 |
| BP-MS0 | BP | not_started | in_progress_real | 2/28 (7%) | 2026-05-22 |

## Drift cases (claim vs git disagrees)

| Milestone | Claimed | Real | Drift |
|-----------|---------|------|-------|
| CAMK-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| CAMX-MS11 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CC-EXT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CPL-MS2 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MF-MS3 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| MF-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SCI-MS1 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TC-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| ACP-MS0 | completed | in_progress_real | claims_completed_but_units_pending |
| BP-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CADCAM-DAGI-MS4 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CK-MS12 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| CLI-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| COMBO-EFFICIENCY-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| EIGC-MS10 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| DEA-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| KNOWLEDGE-VAULT-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| LATHE-MASTER | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| PPG-MS2 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MS-CAM-MASTERY | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| MS-CRITWIRE | not_started | in_progress_real | claims_not_started_but_has_shipped_units |
| SF-PSN-WIRE-MS0 | not_started | completed_real | claims_not_started_but_has_shipped_units |
| TOOL-INVENTORY-MS0 | not_started | in_progress_real | claims_not_started_but_has_shipped_units |

## Top milestones with most pending units

| Milestone | Pending | Total | Shipped/Total |
|-----------|---------|-------|---------------|
| CAD-COMPLETE-MS0 | 212 | 335 | 123/335 |
| LATHE-PROD-READY-MS0 | 134 | 135 | 1/135 |
| LATHE-MASTER | 126 | 136 | 10/136 |
| DEA-MS0 | 113 | 118 | 5/118 |
| AI-STACK-PER-DOMAIN-MS0 | 104 | 104 | 0/104 |
| MS-WIRE-FRONTEND | 90 | 90 | 0/90 |
| DOMAIN-PIPELINE-MS0 | 62 | 63 | 1/63 |
| MS-WIRE-BACKEND | 60 | 60 | 0/60 |
| LATHE-LORA-MS0 | 50 | 50 | 0/50 |
| MS-MASTERPOST | 44 | 44 | 0/44 |
| FEATURE-GAP-AUDIT-MS0 | 43 | 64 | 21/64 |
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
| SCIMATH-MS5 | 23 | 23 | 0/23 |
| CLI-MS0 | 21 | 22 | 1/22 |
| MCAT-MS0 | 21 | 22 | 1/22 |
| MCAT-MS0 | 21 | 21 | 0/21 |
| MS-PILOT | 20 | 20 | 0/20 |
| SCIMATH-MS1 | 20 | 20 | 0/20 |
| CAMX-V17-P1 | 18 | 18 | 0/18 |
| CAM-EXHAUST-MS0 | 18 | 189 | 171/189 |

## How to use

- Audit chats: cross-reference your gap lists against the **shipped**
  column in MILESTONE_PROGRESS.json. A unit listed there is in git;
  do not flag it as missing without inspecting the commit.
- Roadmap planners: rows where `claimedStatus !== derivedStatus` are
  candidates for a status update on the milestone envelope.
- New Claude sessions: this file + PRISM-INVENTORY-LATEST.md +
  knowledge/wiki/index.md collectively answer "what's already built?"
