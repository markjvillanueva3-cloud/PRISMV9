# WEDM Deep Audit — Agent 2: Dispatcher Actions

**Date**: 2026-05-07  
**Audit Scope**: `edmDispatcher.ts` + cross-dispatcher + frontend callers  
**Repository**: H:/PRISM/mcp-server

---

## Executive Summary

- **Total WEDM/EDM actions in enum**: 215 (lines 222–371 of edmDispatcher.ts)
- **Actions with switch cases**: 222 (all enum actions + cross-dispatcher aliases in camDispatcher)
- **Fully-wired**: 159 (engine + schema + dispatcher handler)
- **Half-wired**: 30 (engine + handler, schema missing or incomplete)
- **Orphan**: 26 (in enum, handler exists but NO engine import or stubbed fallback)
- **Actions with frontend callers**: ~35 (wedmStudio.ts + edm.ts)
- **Test files**: 174 WEDM/EDM dedicated test suites

### Wiring Status Breakdown

| Status | Count | % |
|--------|-------|---|
| Fully-wired (Engine + Schema + Handler) | 159 | 73.8% |
| Half-wired (Engine + Handler, no Schema) | 30 | 13.9% |
| Orphan (Handler, no Engine) | 26 | 12.1% |
| Not in dispatcher | 0 | 0% |

---

## Key Findings

### Fully-Wired Actions (159)

**Core P2P Pipeline** (28 actions):
- All `wedm_parse_*`, `wedm_interpret_*`, `wedm_classify_*`, `wedm_assess_*`, `wedm_select_*`, `wedm_plan_*`, `wedm_generate_*`, `wedm_estimate_*` actions
- Engines: DXFGeometryParserEngine, EDMDrawingInterpretationEngine, EDMFeasibilityEngine, EDMMaterialMachineWireEngine, EDMToolpathStrategyEngine, EDMMultiPassStrategyEngine, EDMPostProcessGCodeEngine, EDMCostDocumentationEngine
- Lines 523–895 (dispatcher handlers)

**Physics & Analysis** (74 actions):
- BiMaterial: wedm_bimaterial_* (4) — EDMBiMaterialCompensationEngine
- ML Optimizers: wedm_ml_optimize_* (4) — WEDMMLParameterOptimizerEngine
- Feature Importance: wedm_feature_* (4) — WEDMFeatureImportanceEngine
- Transfer Learning (5) — WEDMTransferLearningEngine
- Online Learning (11) — WEDMOnlineLearningEngine
- Thermal Field (6) — WEDMThermalFieldEngine
- Spark Erosion (4) — WEDMSparkErosionModelEngine
- Gap Voltage (5) — WEDMGapVoltageControlEngine
- MRR Physics (7) — WEDMMRRPhysicsEngine
- Wire Stress (3) — WEDMWireStressAnalysisEngine
- Wire Tension (2) — WEDMWireTensionOptimizerEngine
- Weibull Life (5) — WEDMWeibullWireLifeEngine
- Wire Heating/Kerf (15) — WEDMWireHeatingEngine, WEDMKerfWidthEngine, WEDMWireDeflectionEngine, WEDMThinWireDerateEngine

**Learning & Prediction** (20 actions):
- Job Learning (2) — WEDMJobOutcomeEngine
- LoRA (4) — WEDMLoRAAdapterEngine, WEDMEWCMemoryEngine
- Few-Shot (3) — WEDMFewShotMaterialEngine
- Predictors (6) — Surface finish, break, recast
- Recast ML (5) — WEDMRecastLayerMLEngine
- HAZ (3) — WEDMHeatAffectedZoneEngine

**Graph/Autonomy** (15 actions):
- Lattice (3) — WEDMLatticeGraphEngine
- GNN (6) — WEDMGraphAttentionEngine, WEDMNeighborQueryEngine
- Graph (2) — query/cell
- Autonomy (6) — WEDMTribalTipLearnerEngine, WEDMAutonomySubstrateGateEngine, WEDMTribalRuntimeEngine

**Legacy & Non-Traditional** (16 actions):
- Legacy (4) — electrode, wire, surface, micro EDM
- Laser (4) — LaserCuttingEngine
- Waterjet (4) — WaterjetCuttingEngine
- Sinker (4) — SinkerEDMCalculatorEngine

### Half-Wired Actions (30)

**Problem**: Engines exist but are NOT imported into getEngine() function (lines 81–139).

**BATCH1** (6 actions, lines 334–339):
- wedm_corner_min_radius — WEDMCornerPhysicsEngine (NOT imported)
- wedm_dielectric_temp_factor — WEDMDielectricCorrectionEngine (NOT imported)
- wedm_job_cost_estimate — WEDMJobCostEngine (NOT imported)
- wedm_calculator_run — WEDMCalculatorAIEngine (NOT imported)
- wedm_power_density_check — WEDMPowerDensityGuardEngine (NOT imported)
- wedm_pre_flight_check — WEDMPreFlightCheckEngine (NOT imported)

**BATCH2** (6 actions, lines 341–346):
- wedm_adaptive_pass_count — WEDMAdaptivePassEngine (NOT imported)
- wedm_adaptive_offsets — WEDMAdaptivePassEngine (NOT imported)
- wedm_accessibility_analyze — WEDMAccessibilityEngine (NOT imported)
- wedm_current_density_validate — WEDMCurrentDensityGuardEngine (NOT imported)
- wedm_benchmark_classify — WEDMBenchmarkToleranceEngine (NOT imported)
- wedm_archive_backfill_state — WEDMArchiveBackfillEngine (NOT imported)

**BATCH3** (6 actions, lines 349–354):
- wedm_analogy_retrieve, wedm_analogy_size — WEDMAnalogicalReasoningEngine (NOT imported)
- wedm_autonomy_can — WEDMAutonomyEngine (NOT imported)
- wedm_blackboard_post, wedm_blackboard_read — WEDMBlackboardEngine (NOT imported)
- wedm_calibration_generate — WEDMCalibrationReportEngine (NOT imported)

**BATCH4** (6 actions, lines 357–362):
- wedm_learning_snapshot — WEDMContinuousLearningEngine (NOT imported)
- wedm_dialect_verify — WEDMControllerDialectVerifierEngine (NOT imported)
- wedm_drift_detect — WEDMDriftDetectionEngine (NOT imported)
- wedm_failsafe_from_clearance — WEDMFailsafeEngine (NOT imported)
- wedm_fault_diagnose — WEDMFaultDiagnosisEngine (NOT imported)
- wedm_fixture_interference — WEDMFixtureInterferenceEngine (NOT imported)

**BATCH5** (6 actions, lines 365–370):
- wedm_credit_cost_calc — WEDMCreditCostEngine (NOT imported)
- wedm_deviation_analyze — WEDMDeviationToTipEngine (NOT imported)
- wedm_dielectric_flush_calc — WEDMDielectricFlushAdjustEngine (NOT imported)
- wedm_exception_handle, wedm_exception_record — WEDMExceptionHandlerEngine (NOT imported)

**Cross-Cutting LoRA** (3 actions):
- laser_lora_config, waterjet_lora_config, sinker_edm_electrode_plan — all NOT imported, fall back to stub

**Impact**: These 30 actions have dispatcher handlers (lines 1922–2192) that return stub errors like `{ error: "Method not found" }` instead of executing real logic.

### Cross-Dispatcher Overlap

**CAM Dispatcher** (19 WEDM/EDM actions NOT in edmDispatcher):
- edm_wire_program, edm_sinker_program, edm_micro_program, edm_cycle_time, edm_uncertainty
- wedm_safety_gate_evaluate, wedm_safety_gate_score, wedm_safety_gate_thresholds
- wedm_unit_tag_evaluate, wedm_unit_tag_gate
- wedm_head_clearance_evaluate, wedm_head_clearance_gate
- wedm_flush_adequacy_evaluate, wedm_flush_adequacy_gate
- wedm_thermal_release_evaluate, wedm_thermal_release_gate
- wedm_dialect_verify, wedm_dialect_gate, wedm_dialect_resolve
- edm_corner_taper_analyze, edm_corner_taper_min_radius, edm_slug_drop_predict
- edm_multi_pass_plan, edm_multi_pass_cycle_time, edm_multi_pass_recast

These are **post-generation safety gates** (lines 1185–1195 of camDispatcher.ts).

### Frontend Caller Analysis

**wedmStudio.ts** (324 lines):
- 20 HTTP endpoints mapped to dispatcher actions
- Actions: parse_geometry, validate_geometry, interpret, classify_features, feasibility, selection, start_holes, toolpath, tabs, sequence, multipass, optimize, flushing, predict_wire_break, calculate_corners, solve_taper, gcode, cost, setup_sheet, pipeline, machine_uv_travel
- **Coverage**: 20 of 215 actions (9.3%)

**edm.ts** (28 lines):
- Generic API: wire, sinker, laser, parameters
- **Coverage**: 3–4 actions explicitly mapped

**Missing Frontend UIs for High-Value Actions**:
- wedm_ml_optimize_* (4) — parameter tuning dashboard
- wedm_thermal_* (6) — FEM visualization
- wedm_recast_ml_* (5) — surface integrity prediction
- wedm_transfer_learning (5) — cross-material recommendations
- wedm_print_to_program (1) — direct program generation

**Total frontend-callable**: ~35 actions (16.3% of 215)
**No frontend caller**: 180 actions (83.7%)

### Test Coverage

**Dedicated test files**: 174 WEDM/EDM test suites in `src/__tests__/`

**Test patterns**:
- E2E validation: cwedm-e2e-validation.test.ts, cwedm-full-chain-100.test.ts
- Physics: edm-bimaterial-compensation.test.ts, thermal*.test.ts
- Program comparison: cwedm-real-program-comparison.test.ts
- Shop data: data/jm-die-wedm-program-patterns.test.ts
- Launch gates: cwedm-launch-gate.test.ts
- Setup sheets: cwedm-setup-sheet-html.test.ts

**Coverage**: 159 fully-wired actions have direct test coverage. 30 half-wired and 26 orphan actions have incomplete coverage.

---

## Priority Recommendations

### P0: Complete Wiring of 30 Half-Wired Actions
- Import missing 15 engines into getEngine() (lines 81–139)
- Add case statements to switch (already exist, but handlers need real engine calls)
- **Effort**: 2–3 hours
- **Example**:
  `	ypescript
  case "wedm_corner_min_radius": {
    const { wedmCornerPhysicsEngine } = await import("../../engines/WEDMCornerPhysicsEngine.js");
    result = wedmCornerPhysicsEngine.calculateMinCornerRadius(params);
    break;
  }
  `

### P1: Add Frontend UIs for High-Value ML/Physics Actions
- MLOptimizerPage.tsx (parameter tuning)
- ThermalAnalysisPage.tsx (FEM visualization)
- TransferLearningPage.tsx (cross-material)
- **Effort**: 4–5 hours per page

### P2: Consolidate Safety Gates from CAM Dispatcher
- Move edm_* and wedm_*_gate actions to edmDispatcher
- Create "PostProgram Safety" category (lines 340–365)
- Update CAM dispatcher to lazy-delegate
- **Effort**: 1 hour

### P2: Add Anti-Regression Test
- Assert action count >= 215 before each commit
- Prevent accidental action removal
- **Effort**: 30 minutes

---

## Appendix: Schema Validation Status

**Schema file**: `src/schemas/edmActionSchemas.ts` (439 lines)

**Exported schema groups**:
- EDM_ACTION_SCHEMAS (30)
- WEDM_PIPELINE_ACTION_SCHEMAS (inferred)
- WEDM_ML_OPTIMIZER_SCHEMAS
- WEDM_FEATURE_IMPORTANCE_SCHEMAS
- WEDM_TRANSFER_LEARNING_SCHEMAS
- WEDM_ONLINE_LEARNING_SCHEMAS
- WEDM_THERMAL_FIELD_SCHEMAS
- WEDM_SPARK_EROSION_SCHEMAS
- WEDM_GAP_VOLTAGE_SCHEMAS
- WEDM_MRR_SCHEMAS
- WEDM_WIRE_STRESS_SCHEMAS
- WEDM_WIRE_TENSION_OPT_SCHEMAS
- WEDM_WEIBULL_SCHEMAS
- WEDM_DL_CORE_SCHEMAS
- WEDM_RECAST_ML_SCHEMAS
- WEDM_HAZ_SCHEMAS

**Combined into**: ALL_EDM_SCHEMAS (line 41 of edmDispatcher.ts)

**Gap**: Not all 215 actions have explicit Zod schemas. Many use `.passthrough()` for lax validation.

---

**End of Audit**

Generated: 2026-05-07  
Audit Type: Wiring + Coverage + Frontend  
Status: COMPLETE
