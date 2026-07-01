# FOXTROT-MILL-TASK-QUEUE-2026-05-25

**Slot:** foxtrot · **Trigger:** operator directive "compile all remaining mill units from rgs and all chat slots and add them to foxtrot task queue" · **Source files:** roadmap-index.json + ROADMAP-CONSOLIDATED.json + MILL-PARITY-{LATHE,WEDM}-GAPS-2026-05-25.txt

## Totals

**391 mill units** compiled — all currently unshipped or parity-gap candidates.

| Source | Count | Notes |
|---|---|---|
| roadmap-index | 9 | Milestone envelopes flagged `not_started`/`pending` |
| ROADMAP-CONSOLIDATED | 35 | Pending units across active milestones |
| mill-parity-lathe | 186 | Lathe engines lacking Mill equivalent |
| mill-parity-wedm | 161 | WEDM engines lacking Mill equivalent |

Full JSON queue: [`FOXTROT-MILL-TASK-QUEUE-2026-05-25.json`](FOXTROT-MILL-TASK-QUEUE-2026-05-25.json)

## Top-of-queue (foxtrot-lane priority — operator/tribal/quality)

These align with foxtrot soul (tribal-knowledge specialist, machining-knowhow) and should be picked first by `/checkin-foxtrot /loop`:

### Already shipped this session (iter54)
- ✅ **U-MILL-PARITY-MillFirstPieceApprovalEngine** — shipped `3d8f0bbe52` (mill_first_piece_approval action)

### Next foxtrot picks (P4 operator/tribal lane)
1. U-MILL-PARITY-MillAnomalyDetectionEngine
2. U-MILL-PARITY-MillBlockTimeProfilerEngine
3. U-MILL-PARITY-MillChangeoverBriefEngine
4. U-MILL-PARITY-MillCoaxialityRunoutValidatorEngine (perpendicularity/squareness equivalent)
5. U-MILL-PARITY-MillCoolantAdvisorEngine
6. U-MILL-PARITY-MillDeviationMapEngine
7. U-MILL-PARITY-MillEnvelopeBreachReplayEngine
8. U-MILL-PARITY-MillExpertAdvisorEngine
9. U-MILL-PARITY-MillTribalInjectorEngine
10. U-MILL-PARITY-MillBlockEngagementSimulatorEngine
11. U-MILL-PARITY-MillCSSOptimizerEngine
12. U-MILL-PARITY-MillChuckJawSetupEngine (less applicable — mill uses vise/fixture not chuck-jaw)

### Roadmap-consolidated mill priorities (DOMAIN-PIPELINE-MS0 stages)
- U-DPM0-MILL-PRINT_INTAKE
- U-DPM0-MILL-PRINT_OCR
- U-DPM0-MILL-MATERIAL_SELECT
- U-DPM0-MILL-TOOLING_SELECT
- U-DPM0-MILL-FIXTURE_DESIGN
- U-DPM0-MILL-OPERATION_SEQUENCE
- U-DPM0-MILL-TOOLPATH_GEN

### High-value cross-cutting work (alpha/bravo/kilo lanes)
- U-WIRE-BACKLOG-MILL (FEATURE-GAP-AUDIT-MS0) — wire ~20 unwired mill engines
- U-AUDIT-01-2B4677 — MillingForceEngine is a 15-line stub but dispatcher routes physics through it (P0 BUG)
- U-AUDIT-02-B5F8AF — MillScientificPipelineEngine is a 14-line stub wired as scientific bucket (P0 BUG)
- U-AITRAIN-MILL-MILLING-AI-ULTRA-INTELLIGENCE — train on JM-DIE 76K + MIT-OCW
- U-AITRAIN-MILL-MILLING-META-LEARNING — train MillingMetaLearningEngine
- U-CMCCL01 — MillingLoRADatasetBuilderEngine + MillingLoRACadenceEngine (kilo CAM-ML lane)
- U-CAMX-V17-P5 — Milling Pipeline Completion
- U-CAMX-V17-P7 — Mill-Turn/Swiss Pipeline Completion

### Milestone envelopes (P0/P1)
- CAMX-MS6 — PowerMill + CATIA Dedicated Infrastructure
- CAMX-MS9 — hyperMILL AC Bridge + Fusion 360 Parity
- CAMX-V17-P0B — Critical Bug Fixes: Multi-Start Threading, Facing, MillTurn, Routing
- F360-REV-MS9 — Multi-Axis + Mill-Turn F360 Wiring
- MILL-AWARE-MS0 — Mill AI Full-Awareness: dispatcher + resource wiring + tribal + machine profiles
- PPG-BASELINE-MS0 — Milling Post Baseline: fix v10.9 bugs + wire PRISM intelligence
- LATHE-PRO-MS6a — Swiss/Mill-Turn Multi-Channel G-Code Emission

## Lane assignment (per JULIETT-12CHAT)

| Slot | Lane | Units pickup priority |
|---|---|---|
| **foxtrot** | tribal/machining-knowhow | P4 operator/tribal (above #1-12) + tribal-anchored quality units |
| **alpha** | dev-tools + audit + token-savings | AUDIT-01/02/06/15/18 (stub-fixing) + U-WIRE-BACKLOG-MILL |
| **bravo** | physics + AI orchestration | AGI/AI parity (P1 of MILL-PARITY-UPGRADE-MS0) + AITRAIN units |
| **charlie** | wire/critwire/post-processor | P3 mill post-processor + LATHE-PRO-MS6a Swiss/Mill-Turn |
| **hotel** | ERP/cost/lifecycle | Mill ERP/cost units in roadmap-consolidated |
| **kilo** | CAM/AI mastery | U-CMCCL01 + LoRA stack (P2 of MILL-PARITY-UPGRADE-MS0) + CAMX-MS6/MS9 |
| **lima** | academy + MIT-OCW | U-CTE04 (InventorCAM 2.5D Milling extract) + MIT-OCW mill content |

## How to consume

Operator pickup:
```bash
# Foxtrot pick next:
jq '.queue[] | select(.source=="mill-parity-lathe") | select(.unit_id | contains("Tribal") or contains("Anomaly") or contains("CoolantAdvisor") or contains("ExpertAdvisor"))' \
   H:/prism/state/shared/specs/FOXTROT-MILL-TASK-QUEUE-2026-05-25.json

# Any-slot pick by source:
jq '.queue[] | select(.source=="roadmap-index")' H:/prism/state/shared/specs/FOXTROT-MILL-TASK-QUEUE-2026-05-25.json
```

Or via `/loop foxtrot mill parity`:  the queue file is now part of the routine pickup surface for any chat that explicitly asks for mill work.

## Filtering caveats

- Not every Lathe engine maps cleanly to Mill — chuck-jaw, parting-blade, eccentric-turning, diamond-turning, bird-nest-predictor are domain-idiosyncratic and should be SKIPPED rather than built.
- WEDM patterns (dielectric, corner-physics, electrode-wear) translate to Mill in altered form (chatter, corner-engagement, tool-wear).
- The 186 + 161 numbers are CANDIDATES — peer slots should filter through domain applicability before building.

## Already-shipped reconciliation

Engines already built that satisfy queue entries (skip these):
- ✅ MillFirstPieceApprovalEngine — iter54, this chat
- Per the 23-engine FIRST-PART-PERFECT-MS0 (iter29-iter52, this chat), several Mill-adjacent engines shipped but with cross-domain naming (OperatorCoaching, LaserCutting, etc.) — not in this queue.

## Cross-references

- [[MILL-PARITY-UPGRADE-MS0]] — parent scoping spec (commit `492abf665e`)
- [[FOXTROT-MILL-TASK-QUEUE-2026-05-25.json]] — machine-readable full queue
- [[reference_tribal_septet_capstone_2026_05_24]] — prior session ship
- [[feedback_juliett_12chat_allocation_2026_05_17]] — slot-lane assignments
