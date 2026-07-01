---
session: claude-2993382b
topic: sfc-force-physics-assessment
slot: oscar
written_at: 2026-06-25T17:29:41.030Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-2993382b
status: active
---

# HANDOFF: claude-2993382b
Updated: 2026-06-25T17:29:41.031Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-2993382b

## STATE
## SFC force-physics deep assessment (2026-06-25, slot oscar)

SHIPPED this session (slot/oscar): U-OSC-STOCK-GEOM-VALIDATE (c941a18243, mill 192 combos/140 clamps/0 viol) + U-OSC-STOCK-GEOM-VALIDATE-LATHE (ba2f6d603b, 42 combos/11 G50-caps/0 viol). Stock-height ap-clamp + turning Vc/RPM/cap PROVEN correct.

ASSESSMENT VERDICT: PARTIALLY -- rich physics exists but ORPHANED from the live customer path (ProductEngine inline). Keystone = wire live calc to SpeedFeedNineAxisOrchestratorEngine. See resume directive + the 2 spec memories.

NOTE: combo variability sweep (mill 7.81M/lathe 5.93M) runs at 4/32 threads; parent telemetry under-reports (total_processed:0) -- cosmetic bug, unfixed. GPU closed-loop (gpt-oss:20b) was triggered + engaged this session.

## RESUME
KEYSTONE (fresh session -- this ctx can't spawn agents): the live customer SFC calc (routes/sfc.ts /calculate -> prism_product:sfc_calculate -> ProductEngine.sfcCalculate) is SELF-CONTAINED/inline (imports only physics/constants+CollisionEngine+AlgorithmEngine; NO force/deflection/orchestrator engine). Rich force physics (SpeedFeedNineAxisOrchestratorEngine, CuttingForceEngine, CrossPhysicsCouplingEngine, 5axis) is BUILT but ORPHANED. STEP 1: read SpeedFeedNineAxisOrchestratorEngine body -- does IT combine Fc/Ff/Fp + couple deflection/thermal/chatter simultaneously? STEP 2 (keystone WIRE): route the live main calc through the rich orchestrator so the customer gets coupled simultaneous forces, not the inline calc -- physics-reviewer + per-file scrutiny REQUIRED (live customer physics). STEP 3 (build holes): real series-stiffness chain (tool+holder-gauge+spindle+lathe-workpiece-overhang), kinematic-config input (table/head), multi-axis force projection. STEP 4: invariant-validate (pattern shipped: scripts/sfc-stock-geometry-validate{,-lathe}.mjs). Full spec+evidence: memory reference_oscar_sfc_force_physics_completeness_assessment_2026_06_25 + reference_oscar_sfc_variability_coverage_gapmap_2026_06_25.

## CONTEXT

