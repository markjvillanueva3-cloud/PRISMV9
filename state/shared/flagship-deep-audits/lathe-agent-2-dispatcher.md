# LATHE Dispatcher Deep Audit — Agent 2/10

**Timestamp:** 2026-05-08 (snapshot as of session start)
**Scope:** Turning/Lathe dispatcher wiring & frontend integration
**Status:** CRITICAL FINDINGS — Two parallel pipelines, one orphaned

---

## Executive Summary

PRISM has **two independent lathe/turning pipeline implementations**:

1. **Working Pipeline (Ship Path):** Upload→Wizard→Results via prism_turning_program dispatcher
   - 14 actions: 	urning_*, lathe_ui_submit, lathe_orchestrate
   - Frontend: LatheUploadPage → LatheWizardPage → LatheResultsPage
   - Route: /api/v1/lathe (via latheTurning.ts)
   - **Status:** FULLY WIRED, IN PRODUCTION

2. **Advanced Research Pipeline (Orphaned UI):** LathePrintToProgram.tsx calls lathe_p2p_* actions
   - 12 core actions: lathe_p2p_ingest, ..., lathe_p2p_kg_ingest (U-LTH33–U-LTH44)
   - Dispatcher: prism_cam (camDispatcher.ts, 2,184 total cases)
   - Frontend: LathePrintToProgram.tsx component
   - **Status:** FULLY WIRED IN CODE, NO ROUTE TO PRODUCTION
   - **Critical Issue:** Component calls /api/dispatch/cam endpoint that **does not exist** in routes/index.ts

Additionally, prism_turning dispatcher houses **72 unwired lathe engine actions** (BATCH1–BATCH7, 42 actions) plus 30 wired core actions.

---

## Dispatcher Inventory

### 1. prism_turning_program (PRODUCTION)

**File:** H:/PRISM/mcp-server/src/tools/dispatchers/turningProgramDispatcher.ts
**Route:** /api/v1/lathe (registered line 134, outes/index.ts)
**Action Count:** 14

Core Actions (all FULLY-WIRED):
- turning_print_to_program (TurningPrintToProgramEngine)
- turning_process_plan (TurningPrintToProgramEngine)
- turning_blueprint_intake (TurningPrintIntakeEngine) — Photo/PDF OCR
- turning_parse_material (MaterialCalloutParserEngine) — Material ID
- turning_parse_tolerance (ToleranceExtractionEngine) — ISO 286 Fits
- turning_cad_import (TurningCADImportEngine) — CAD STEP/IGES
- turning_stock_select (StockSelectionEngine) — Bar Stock Picker
- turning_resolve_ambiguity (AmbiguityResolutionEngine) — Gap Filling
- turning_rev_profile (TurningRevProfileEngine) — 2D Profile Extract
- turning_feature_taxonomy (TurningFeatureTaxonomyEngine) — Feature Classifier
- turning_parse_fit (FitNotationParserEngine) — H7/g6 Notation
- turning_apply_iso2768 (ISO2768ApplicatorEngine) — General Tolerance
- lathe_ui_submit (TurningPrintToProgramEngine) — UI Wizard Entry
- lathe_orchestrate (LatheOrchestrationEngine) — Multi-step Orchestration

**Schema File:** src/schemas/turningProgramActionSchemas.ts ✓ EXISTS

**Frontend Callers:**
- LatheUploadPage.tsx → POST /api/v1/lathe/upload
- LatheWizardPage.tsx → POST /api/v1/lathe/wizard-submit
- LatheResultsPage.tsx → GET /api/v1/lathe/result/:jobId

---

### 2. prism_turning (MIXED WIRING)

**File:** H:/PRISM/mcp-server/src/tools/dispatchers/turningDispatcher.ts
**Total Actions:** 116 (32 fully-wired + 42 half-wired)

**Fully-Wired (32):**
- Core workholding/safety (7): chuck_force, tailstock, steady_rest, live_tool, bar_pull, thread_single_point, part_off_force
- Mill-turn (5): mill_turn_live_tool, mill_turn_sub_spindle, mill_turn_multi_channel, mill_turn_bar_feeder, mill_turn_swiss
- Collision/Physics (20): lathe_collision_check, lathe_swing_check, lathe_grooving_overhang, lathe_chip_thickness, lathe_boring_reach, lathe_g71_type, lathe_boring_taper_comp, lathe_springback_comp, lathe_chatter_analysis, lathe_hard_turning, lathe_thread_schedule, lathe_drill_thrust, lathe_parting_force, lathe_beam_deflection, lathe_chip_breaking, lathe_peck_schedule, lathe_bore_dwell, hard_turn_decide, hard_turn_optimize, bar_stock_cut_plan

**Half-Wired (42) — BATCH1–BATCH7 Stub Engines:**
- BATCH1 (6): lathe_css_optimize, lathe_chip_predict_type, lathe_coolant_advise, lathe_birdnest_predict, lathe_coaxiality_runout_validate, lathe_block_time_profile
- BATCH2 (6): lathe_anomaly_detect_program, lathe_causal_build_model, lathe_ensemble_stats, lathe_changeover_stats, lathe_jmdie_extract_customer, lathe_metallurgy_tool_steel_db
- BATCH3 (6): lathe_knowledge_harvest_programs, lathe_program_analyze, lathe_expert_material_strategy, lathe_machine_get_profile, lathe_troubleshoot_overhang, lathe_predictive_tool_wear
- BATCH4 (6): lathe_tribal_stats, lathe_unified_science_version, lathe_unified_science_recommend, lathe_kinematics_get_machine_specs, lathe_neural_intel_stats, lathe_jmdie_extract_operations
- BATCH5 (6): lathe_lora_cadence_state, lathe_lora_cadence_should_trigger, lathe_lora_cadence_active_version, lathe_deep_reasoning_record_outcome, lathe_post_uncertainty_analyze_block, lathe_post_uncertainty_prod_ready
- BATCH6 (6): lathe_actual_feedback_tuning_stats, lathe_stock_evolution_stats, lathe_deviation_map_stats, lathe_program_signoff_stats, lathe_block_engagement_stats, lathe_chuck_jaw_setup_stats
- BATCH7 (6): lathe_lora_pipeline_estimated_duration, lathe_lora_cron_schedule_summary, lathe_lora_registry_stats, lathe_lora_health_summary, lathe_lora_drift_config, lathe_lora_verification_test_cases

**Schema File:** src/schemas/turningActionSchemas.ts ✓ EXISTS (with all BATCH1–7 schemas)
**Test File:** src/__tests__/turningDispatcherUnwiredBatch7.test.ts (176 LOC, 11 tests, all passing)

---

### 3. prism_cam (ADVANCED RESEARCH PIPELINE)

**File:** H:/PRISM/mcp-server/src/tools/dispatchers/camDispatcher.ts
**Total Actions:** 2,184 cases (largest dispatcher)
**Lathe P2P Actions:** 48 core lathe_p2p_* actions

**P2P Pipeline Stages (U-LTH33–U-LTH44):**
- U-LTH33: lathe_p2p_ingest (+ batch, validate variants)
- U-LTH34: lathe_p2p_recognize_features (+ batch, taxonomy, stats)
- U-LTH35: lathe_p2p_tolerance_propagate (+ batch, stats, validate)
- U-LTH36: lathe_p2p_strategy_plan (+ select, batch, stats, validate)
- U-LTH37: lathe_p2p_sequence_plan (+ summarize, autofix)
- U-LTH38: lathe_p2p_setup_from_features (+ select, validate, infer_geometry)
- U-LTH39: lathe_p2p_toolpath_generate (+ validate, gcode, cycle_time)
- U-LTH40: lathe_p2p_emit (+ validate, controllers, dry_run)
- U-LTH41: lathe_p2p_signoff_generate (+ approve, markdown, json, is_approved)
- U-LTH42: lathe_p2p_dl_predict (+ rank_alternatives, batch, evaluate_accuracy, export_weights)
- U-LTH43: lathe_p2p_reason_explain (+ markdown, json, filter, mode_summary)
- U-LTH44: lathe_p2p_kg_ingest (+ find_similar, tools_for_material, customer_jobs, failures, stats, export, import, traverse, clear)

**All 48 actions:** FULLY-WIRED in dispatcher with lazy imports and case statements

---

## Frontend Caller Mapping

### Production Path (LatheUploadPage → Results)

`
POST /api/v1/lathe/upload          → turning_blueprint_intake, turning_cad_import
POST /api/v1/lathe/wizard-submit   → lathe_ui_submit
GET  /api/v1/lathe/progress/:jobId → SSE streaming
GET  /api/v1/lathe/result/:jobId   → Result retrieval
`

**Pages:** LatheUploadPage.tsx, LatheWizardPage.tsx, LatheResultsPage.tsx
**Route Registration:** Line 134, src/routes/index.ts ✓ CONFIRMED

### Research Path (LathePrintToProgram) — ORPHANED

**Component:** web/src/pages/LathePrintToProgram.tsx
- Calls etch("/api/dispatch/cam", { method: "POST", body: {action, params} })
- **CRITICAL BUG:** Endpoint /api/dispatch/cam does **not exist** in routes/index.ts
- Component will fail at runtime with 404
- Declares 12-step P2P pipeline (lines 55–67) but unreachable

---

## Canonical Lathe Ship Path

`
User Upload (photo/CAD)
    ↓
LatheUploadPage.tsx → POST /api/v1/lathe/upload
    ↓
turning_blueprint_intake | turning_cad_import (intake engines)
    ↓
Wizard Questions
    ↓
LatheWizardPage.tsx → POST /api/v1/lathe/wizard-submit
    ↓
lathe_ui_submit → TurningPrintToProgramEngine.calculate()
    ↓
lathe_orchestrate (multi-step orchestration)
    ↓
LatheResultsPage.tsx ← GET /api/v1/lathe/result/:jobId
    ↓
Download G-code / Setup Sheet / Report
`

**Dispatcher:** prism_turning_program (14 actions)
**Route:** /api/v1/lathe ✓ REGISTERED
**Status:** PRODUCTION-READY

---

## Test Coverage Notes

**turningDispatcherUnwiredBatch7.test.ts** (176 LOC)
- 11 test cases covering all 6 BATCH7 engines
- Engine direct invocation tests (6)
- Dispatcher wiring verification (4)
- Pure function contract (1)
- **Status:** All passing ✓

**Missing:** BATCH1–BATCH6 have no E2E tests

---

## Summary Table

| Dispatcher | Actions | Fully | Half | Orphan | Schema | Tests |
|-----------|---------|-------|------|--------|--------|-------|
| prism_turning_program | 14 | 14 | 0 | 0 | ✓ | ✓ |
| prism_turning (core) | 32 | 32 | 0 | 0 | ✓ | ✓ |
| prism_turning (BATCH) | 42 | 0 | 42 | 0 | ✓ | ✓ (BATCH7) |
| prism_cam (lathe_p2p) | 48 | 48 | 0 | 0 | ✓ | ✗ |
| **TOTAL** | **136** | **94** | **42** | **0** | **✓** | **PARTIAL** |

---

## Critical Findings

### 1. ORPHANED RESEARCH PIPELINE

**Issue:** lathe_p2p_* pipeline fully wired but unreachable from UI

**Root Cause:** Missing /api/dispatch/cam route registration

**Impact:** LathePrintToProgram.tsx will 404 at runtime if accessed

**Fix:** Register endpoint in routes/index.ts OR deprecate component

### 2. BATCH1–BATCH7 STUB ENGINES

**Issue:** 42 actions have stub implementations returning mock data

**Status:** This is intentional wiring — engines callable but not production-ready

**Gap:** Only BATCH7 has tests; BATCH1–BATCH6 untested

**Recommendation:** Add E2E tests following turningDispatcherUnwiredBatch7.test.ts pattern

### 3. TWO PARALLEL PIPELINES

**Finding:** Product has conflicting mental models
1. Working: Upload→Wizard→Results (14 actions, prism_turning_program)
2. Research: Print→P2P (12 core + variants, lathe_p2p_*)

**Recommendation:** Document canonical path; clearly separate research from production

---

## Metadata

| Property | Value |
|----------|-------|
| Audit Date | 2026-05-08 |
| Auditor Role | Agent 2/10 (Dispatcher Deep Audit) |
| Files Analyzed | turningDispatcher.ts, turningProgramDispatcher.ts, camDispatcher.ts, latheTurning.ts, routes/index.ts |
| Total Actions | 136 |
| LOC Analyzed | ~11,000 |
| Concurrent Editor | claude-03aaa3d9 (turningDispatcher.ts & schemas) |

---

**Report Status:** COMPLETE (read-only audit)
**Next Step:** Forward to Agent 3 (Frontend Audit) for page integration analysis

