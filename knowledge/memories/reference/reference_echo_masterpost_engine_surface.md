---
name: reference_echo_masterpost_engine_surface
description: The 3 MasterPost engines + 14-controller AGI surface (post-processor galaxy / slot echo)
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.093Z
aliases: reference_echo_masterpost_engine_surface
---


MasterPost product engines (at `H:/prism/mcp-server/src/engines/`):

- **`MasterPostProcessorEngine.ts`** — 7-engine fanout (PostProcessor + AdvancedPostProcessor HSM/RTCP + CamKnowledgePortability + PostProcessorFeedOptimizer + RLPostProcessor + LathePostProcessor + TribalKnowledge 204+ tips). `MACHINE_FEATURE_DB`: haas/okuma/mazak/fanuc/siemens.
- **`MasterPostProcessorUnifiedAGIEngine.ts`** — 14 controllers (fanuc, siemens, haas, okuma, mazak, heidenhain, mitsubishi, fagor, hurco, dmg_mori, brother, doosan, citizen, generic); 19 CAM systems; 25+ ops (5axis_swarf/impeller, turn_mill, wire_edm_{rough,skim}, sinker_edm, probing). `UnifiedPostResult` = 8-dim quality_score + kinematics_validation + provenance audit chain + tribal citation.
- **`PostProcessorPipelineEngine.ts`** — 7-phase (P0–P6) / 38-stage: P0 defaults · P1 physics (Kienzle/Taylor/Tlusty/deflection/Ra/power/torque) · P2 block-by-block · P3 motion-opt · P4 stochastic CI95 · P5 safety+tribal · P6 output.

14 AGI controllers vs 4 in JM posts — Heidenhain/DMG-Mori/Citizen/Brother unused at JM (corpus gap, not code gap). See [[reference_echo_jm_cps_fleet]], [[feedback_echo_masterpost_pipeline_route]].
