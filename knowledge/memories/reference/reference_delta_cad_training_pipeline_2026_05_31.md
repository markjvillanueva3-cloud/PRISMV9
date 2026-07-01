---
name: reference_delta_cad_training_pipeline_2026_05_31
description: MS-CAD-TRAINING-PIPELINE — delta's exhaustive CAD feature-template training-pipeline architecture (tiered curriculum T0-T5, 2 print↔CAD round-trips, auto-capture compounding). Keystone (template store + validate) shipped; rest spec'd with honest bridge blockers.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.544Z
aliases: reference_delta_cad_training_pipeline_2026_05_31
---


# MS-CAD-TRAINING-PIPELINE — exhaustive CAD feature-template training pipeline (slot:delta, 2026-05-31)

Operator vision: exhaustive training pipelines to develop any feature efficiently — templates for common
features + combinations, easy→extreme (spirals, irregular patterns, blisks, turbines, aerospace/medical/
dental/automotive/defense/nautical/character); + the ultimate round-trips: (A) print + existing CAD →
replicate to 100% match; (B) print-only → scan → generate CAD → generate new print → match old print 100%;
+ auto-save every proven backend path as a template so efficiency compounds.

## Designed by a 6-agent Workflow (wf_cb89ba60-aaf, 5 design layers + synthesis, 859k tokens)
Full spec: `state/shared/specs/MS-CAD-TRAINING-PIPELINE.md` — 15-unit dependency-ordered build order, components,
8 honest blockers. KEY R7 resolution: each part-class is COURSE DATA (COURSE_STEP_ARGS + BUILD_MAP entries)
consumed by the existing 5 libs, NOT a new .mjs per part (~5 new libs + ~4 course-def data files, not 100+).

## SHIPPED this session (the compounding keystone — buildable-now core)
- **U-CADTP-TEMPLATE-STORE** (commit d6ee79fa6e) — `cad-fusion-template-lib.mjs`: captureTemplate (REFUSES
  unverified — R12), findTemplates, composeTemplates (multi-feature combination), provenance accumulation.
  Auto-fires on `--run`. LIVE: 8 templates captured (T0=3,T1=5); RECT_PATTERN dup-defect correctly EXCLUDED.
  Store: `state/shared/cad-feature-template-store.jsonl`. See [[reference_delta_cad_template_store_2026_05_31]].
- **U-CADTP-TForms** (commit this session) — `cad-fusion-template-validate.mjs`: validateTemplate REPLAYS a
  stored template live + re-verifies its captured build-map = a BRIDGE-REGRESSION ALARM (a template that
  stops verifying means the deployed bridge changed). deriveParameterForms/validateParameterValues = safe
  re-dimension bands (±band%, JM INCH, NEVER inlines a fit tolerance — that stays with physics-reviewer).
  validateAll = health-gated drift sweep with driftAlarm. 23 tests.
- 158 CAD-course tests total, 0 fail, across 9 libs (course/buildmap/args/coverage/learning-bridge/screenshot/
  proof/template/template-validate).

## THE BLOCKERS (honest — these cap the "extremely advanced" half until resolved)
1. **BRIDGE GAP (T2+ hard-block):** PRISMBridgeCAD has NO programmatic /sweep, /loft, /draft, /helix-spiral,
   /pattern-on-path, NO surface/NURBS API. Spirals, irregular patterns, organic shapes, turbine airfoils,
   impeller passages, threads/worm-gears, hull/wing skins, character/medical/dental organic geometry ALL need
   these. **Curriculum is HARD-CAPPED at fully-T3 + partial-T4/T5** (extrude/revolve/hole/fillet/chamfer/
   pocket/boss/shell/pattern compositions) until bridge-enablement units land. Fix = add `/atomic op.{sweep,
   loft,draft,coil}` + spline/spiral sketch emitter to the DEPLOYED add-in — echo/kilo own the shared bridge;
   operator must re-Run it. NURBS/Sculpt is fully UI-only (a future T5.5 external-kernel milestone).
2. **UI-ONLY DRAWING DIMS:** 7 drawing.* ops operator-placed → autonomous closed-loop DRAWING-dimension gen
   impossible at the Fusion HTTP boundary → round-trip B's "new print matches old 100%" blocked on dims.
   model-verify replaces drawing-verify for the modeling half.
3. **CROSS-SLOT:** round-trip A needs CADToSTEPPipelineEngine + CADFeatureRecognitionEngine (verify on disk —
   present); round-trip B needs xray OCR (BlueprintVisionOCREngine etc.); GNN retrieval + trainer need india.
   Keep the cad-course-experience.jsonl + feature-record handoff contracts stable; don't build other slots' side.
4. **"100% match" metric:** topology exact; volume/bbox need a tol band (propose 1e-4" abs / 0.01% rel);
   GD&T/PMI match likely <100% initially — flag honestly, never claim 100% on PMI.
5. **SHARED FUSION:** all live runs share ONE Fusion with kilo (CAM) — kilo-idle gate + a cooperative time
   budget for long correction loops.

## NEXT (buildable-now, delta-only, no new bridge ops)
U-CADTP COURSE_DEFS_T0/T1 (pocket/boss/rib/counterbore/countersink/slot/2D-pattern), composeTemplates real
parts (L-bracket/plate/housing), the two-model GEOM-DIFF comparator (round-trip convergence metric, extends
verifyBuildMap to two models), template-to-STEP pipeline, prism_cad dispatcher wiring. Then (cross-slot) the
bridge sweep/loft enablement unblocks T2-T5, and round-trip A/B with xray + india.

Pairs with [[reference_delta_course_system_and_channel_verify_2026_05_31]] (the course+buildmap base) +
[[reference_delta_cad_learning_bridge_2026_05_31]] (the india learning wire).
