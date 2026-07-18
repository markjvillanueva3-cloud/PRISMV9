# 🛠️ CAM Awareness Snapshot (slot:kilo domain context)

_Generated 2026-05-29T04:29:40.303Z · branch `slot/kilo` · regen: `node scripts/cam-awareness-snapshot.mjs`_

## Headline
- **Engines:** 99 `CAM*.ts` top-level · hyperMILL 61 top-level + 17 in hypermill/ subdir · 4 galaxy `.md` files
- **Dispatcher surface:** 82 distinct cam_* families · 1158 action refs (prism_cam / camFunctionDispatcher / prism_toolpath)
- **Galaxy brain:** 1.3h since last galaxy-brain edit · 13 CAM memories

## CAM in the print-to-part pipeline
CAM is the **middle**: `CAD (delta) ──features──▶ CAM (kilo: strategy + validated toolpath) ──▶ post-processor (echo: G-code)`.
Kilo emits strategy + collision-validated path; it does NOT own G-code dialect (echo), cut physics (foxtrot/whiskey/mike), speed/feed numerics (oscar), feature recognition (delta), or retrain (india).

## Triad + key dispatcher families
- **Triad:** `cam_strategy_recommend` → `toolpath_generate` → `collision_check_full` (+ `cam_safety_validate`).
- **cam_* families:** addin, advanced, agi, ai, analyze, assertion, bobcad, cache, calibration, catalog, chatter, compare, complex, controller, cost, cross, cycle, deep …
- **AI/LoRA/closed-loop:** `cam_ai_orchestrate/validate`, `cam_lora_*`, `cam_calibration_*`, `cam_feedback_*` (incl `cam_feedback_lora_training_export`).

## Invariants (kilo doctrine — never violate)
1. Canonical physics constants from `src/physics/constants.ts` — never inline in a strategy/toolpath calc.
2. No toolpath ships without `collision_check_full` at the operating engagement — verdict carries a CLEARANCE NUMBER, never bare "safe".
3. Cross-CAM transfer via `CAM_VENDOR_REGISTRY` / `CAMCrossSystemTranslator` — same-physics-class ≠ same-parameter-name.
4. shop_floor tier (Ω≥0.95, S(x)≥0.98) on every recommendation.
5. CAM terminates in a validated strategy handoff to echo — never emits `O####`/`G##` dialect.

## PSN edges (this galaxy)
delta→CAM (features) · CAM→echo (G-code handoff) · foxtrot/whiskey/mike↔CAM (cut physics) · oscar→CAM (speed/feed) · CAM→india (`xproc_outcome_publish` → GNN tier-5 + retrain) · tango→CAM (NURBS/geodesic/BVH).

## High-ROI CAM memories
- feedback_kilo_cam_collision_gate_2026_05_28
- feedback_kilo_cam_defer_gcode_to_echo_2026_05_28
- reference_cam_adaptive_pipeline_deep_assessment_2026_05_28
- reference_cam_ai_training_ms0_5system_2026_05_26
- reference_cam_corpus_locations
- reference_cam_pipeline_audit_2026_05_28
- reference_cam_self_teaching_pipeline_ms0
- reference_kilo_cam_dispatcher_surface_2026_05_28
- reference_kilo_cam_galaxy_buildout_2026_05_28
- reference_kilo_cam_mastery_campaign_close_2026_05_25
- reference_kilo_cam_pivot_2026_05_24
- reference_kilo_cam_strategy_class_map_2026_05_28
- reference_kilo_cam_vendor_bridges_2026_05_28

## Recent CAM commits
- ae12dfc55 [kilo] [PER-SLOT-GALAXY-BUILDOUT]/U-PSGB-KILO: CAM galaxy — soul realign (p2p→cam) + 4 galaxy files + Master-brain link + back-pointer + 11 memories + cam-galaxy wiki + 6 tribal + cam-route-kilo skill (slot:kilo /goal /loop)
- 49b1163c1 [KILO] [CAM-SELF-TEACHING-PIPELINE-MS0]/U-MILL-WIZARD-SYNERGY-MASTER-PLAN (slot:kilo /checkin): 4-parallel-agent synthesis — 26-unit ranked plan for mill-wizard full synergy.
- f20e5f21b [KILO] [CAM-SELF-TEACHING-PIPELINE-MS0]/U-CAM-DOMAIN-AUDIT-FULL-DELTA-MIRROR (slot:kilo /checkin): apply delta's full CAD-domain methodology to CAM — scorer + baseline + audit + playbook + handoff contract.
- a402fda1e [KILO] [CAM-SELF-TEACHING-PIPELINE-MS0]/U-ADAPTIVE-PIPELINE-DEEP-ASSESSMENT (slot:kilo /checkin): deep assessment + verdict on closed-loop readiness.
- ef592f620 [KILO] [CAM-SELF-TEACHING-PIPELINE-MS0]/U-INTERRUPTED-CUT-AVOID-P1 + CAM-VS-CAD-GAP-DIFF (slot:kilo /checkin follow-up): per-file scrutiny P1 fixes + delta-cross-check gap audit.
- 4a3c0eb62 [KILO] [CAM-SELF-TEACHING-PIPELINE-MS0]/U-INTERRUPTED-CUT-AVOID (slot:kilo /checkin): outer CAM training-pipeline assessment + first-unit ship — InterruptedCutAvoidanceEngine.

_Full galaxy: `mcp-server/src/engines/cam/{CLAUDE,MEMORY,PATHS,TOOLBELT}.md` · soul: `state/shared/slot-souls/kilo.md` · wiki: `knowledge/wiki/architecture/cam-galaxy.md`._
