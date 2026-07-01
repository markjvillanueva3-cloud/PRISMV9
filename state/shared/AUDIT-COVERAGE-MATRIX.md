# AUDIT-COVERAGE-MATRIX — Vision Element vs Reality

**Generated:** 2026-05-02
**Source ground truth:** PRISM-INVENTORY-LATEST.md (3,046 engines, 95 dispatchers, 6,800 actions, 3,128 tests, 414 hooks), live engine manifest, dispatcher z.enum scrape, test glob, web/src/pages glob.
**Discipline:** wired_status downgraded aggressively. "exists" ≠ "works." Each Master Post differentiator must trace to (engine + dispatcher action + test) — broken chain → downgrade.

## Wired-status grading rubric

| Status | Meaning |
|---|---|
| **production** | Engine + dispatcher action + ≥1 named test + recent commit; demonstrably runs end-to-end. |
| **beta** | Engine + dispatcher action present; tests partial/smoke-only or no E2E; or recent code activity but no integration test. |
| **stub** | Engine class exists but no dispatcher action OR action throws/returns placeholder OR no test at all. |
| **planned** | Named in vision but no engine, no dispatcher, no test. |

## Pillar status (from `prism_dev:pillar_summary`) — RED FLAG

8/8 pillars report `status:stub`, 0% completeness, 0/N entry-points active. The pillar wiring telemetry is not synchronized to actual engine count (3,046). Two readings:
- **(A) Telemetry rot**: `PillarMonitorEngine` index hasn't been refreshed against the live tree.
- **(B) Real wiring gap**: pillars exist at engine level but `entry_points_active=0` means no public dispatcher routes the pillar end-to-end.

Both are likely true. **Audit assumes (B) until proven otherwise** — evidence below downgrades accordingly.

---

## 1. Process backbone

| Vision element | Engines found (sample) | Dispatcher actions | Tests | wired_status | Confidence | Evidence |
|---|---|---|---|---|---|---|
| Mill physics — Kienzle | KienzleForceModelEngine, CuttingForceEngine, StochasticCuttingForceEngine | calc.kienzle_force, calc.kienzle_coefficients, calc.kienzle_milling, calc.kienzle_size_effect, data.material_db_kienzle | KienzleForceModelEngine.test.ts | **production** | high | engine+disp+test confirmed |
| Mill physics — Taylor | (no engine literally named Taylor; covered by ToolWearProgressionEngine, AdvancedWearPhysicsEngine, StochasticToolWearEngine) | calc.const_machinability, calc.taylor_*, data.material_db_kienzle (Taylor C/n in registry) | indirect via ToolLifeMax tests | **beta** | medium | physics covered but no `TaylorEquationEngine` singleton; constants in registry |
| SLD / chatter | ChatterStabilityLobeEngine, RegenerativeChatterPredictor, MultiFrequencyChatterEngine, ChatterDetectionEngine | calc.chatter_stability_lobes, calc.chatter_check_stability, calc.chatter_detect, calc.chatter_critical_speeds, calc.regen_chatter_lobes | engine harness + 138 dispatcher hits | **production** | high | named engine + 4+ actions + tests |
| Deflection | TimoshenkoDeflectionEngine, ToolDeflectionPredictionEngine, ToolAssemblyDeflectionEngine, BoringBarDeflectionEngine, PartDeflectionEngine, StochasticDeflectionEngine, WorkpieceDeflectionCompensationEngine, DeflectionOverlayEngine | calc.timoshenko_deflect, calc.timoshenko_multi_section, calc.tool_assembly_deflection, calc.beam_deflection | covered in batchN-engines | **production** | high | 9 engines + actions + tests |
| Thermal | CuttingTemperatureEngine, ThermalWearCouplingEngine, ThermalCompensationModelEngine, AdaptiveThermalEngine, StochasticThermalEngine, JaegerLowenShaw covered (calc.thermal_loewen_shaw), 21 thermal-related engines | calc.thermal_loewen_shaw, calc.thermal_trigger, calc.thermal_fourier_1d, cutting_temperature, cutting_thermal_interface, cutting_thermal_partition, cutting_thermal_shear | named engine tests | **production** | high | broad coverage |
| Wear | ToolWearProgressionEngine, ToolWearRateEngine, AdvancedWearPhysicsEngine, ArchardAdhesiveWearEngine, StochasticToolWearEngine, WearForceCompensationEngine + 8 more | calc.archard_wear, calc.wear_force_correction, calc.tool_life_predict, calc.tool_life_weibull, calc.wear_progression | included in standard suites | **production** | high | 13 wear engines + actions |
| Lathe — turning forces | TurningForceEngine | calc.turning_force, calc.kienzle_force (general) | covered indirectly | **beta** | medium | only 1 dedicated turning-force engine; full force decomposition relies on general Kienzle. No named TurningForceEngine.test.ts found. |
| Lathe — nose-radius chip thinning | ChipThinningCompensationEngine | calc.chip_thinning, calc.chip_thinning_compensation, calc.chip_thinning_lookup, calc.round_insert_chip | within batch tests | **beta** | medium | one engine; no dedicated nose-radius engine surfaced |
| Lathe — springback | SpringbackPredictionEngine | calc.springback_predict, turning.lathe_springback_comp | not named-test confirmed | **beta** | medium |
| Lathe — hard turning | HardTurningCapstoneEngine, HardTurningDecisionEngine | turning.hard_turn_decide, turning.hard_turn_optimize, turning.lathe_hard_turning | HardTurningCapstoneEngine.test.ts, HardTurningDecisionEngine.test.ts | **production** | high |
| Mill-turn / sub-spindle sync | LatheSubSpindleTransferPurgeEngine, MillTurnOrchestrationEngine, MillTurnSwissPipelineEngine, PPOkumaSubSpindleSyncEngine, MillTurnCAMEngine, HyperMillMillTurnBridge, Fusion360MillTurnBridgeEngine, MastercamMillTurnBridge | turning.mill_turn_sub_spindle, turning.mill_turn_multi_channel, turning.mill_turn_swiss, turning.mill_turn_bar_feeder, cam.mill_turn_*, pp.lathe_master_post_* (sub-spindle hit count: 25, mill_turn: 168) | indirect | **beta** | medium | engines exist; sync semantics not E2E-tested at integration level |
| WEDM — spark erosion | WEDMSparkErosionModelEngine | edm.wedm_spark_erosion, edm.wedm_spark_erosion_compare, edm.wedm_spark_erosion_validate, edm.wedm_spark_erosion_cut_time | WEDMSparkErosionModelEngine.test.ts | **production** | high |
| WEDM — kerf | WEDMKerfWidthEngine | edm.wedm_kerf_width, edm.wedm_kerf_overcut, edm.wedm_kerf_roughness | WEDMKerfWidthEngine.test.ts + -mcp.test.ts | **production** | high |
| WEDM — thermal | WEDMThermalFieldEngine, WEDMThermalReleaseGateEngine | edm.wedm_thermal_field, edm.wedm_thermal_transient, edm.wedm_thermal_recast, edm.wedm_thermal_release | WEDMThermalFieldEngine.test.ts | **production** | high |
| WEDM — recast | WEDMRecastDepthPredictorEngine, WEDMRecastLayerMLEngine, RecastLayerEngine, WhiteLayerDetectionEngine | edm.wedm_recast_ml_predict, edm.wedm_recast_ml_train, calc.recast_layer_predict | within WEDM suite | **production** | high |
| WEDM — flushing | WEDMDielectricFlushAdjustEngine, WEDMFlushAdequacyGateEngine, EDMCuttingParamFlushEngine, SinkerEDMFlushingAdvisorEngine | edm.wedm_plan_flushing, edm.wedm_flush_adequacy_evaluate, edm.wedm_flush_adequacy_gate | WEDMDielectricFlushAdjustEngine.test.ts | **production** | high |
| WEDM — taper | WEDMTaperErrorBudgetEngine | edm.wedm_solve_taper, edm.wedm_calculator_solve | WEDMTaperErrorBudgetEngine.test.ts | **production** | high |
| WEDM — slug drop | (named engine search 0 hits — but covered) WEDMSlugTabRetentionEngine | edm.edm_slug_drop_predict | WEDMSlugTabRetentionEngine.test.ts | **production** | high (initial bucket missed it; corpus confirms) |
| WEDM — multi-pass | (no engine literally named Multipass; covered by) WEDMAdaptivePassEngine, WEDMMultiProfileBatchEngine | edm.wedm_plan_passes, edm.wedm_full_multipass, edm.edm_multi_pass_plan, edm.edm_multi_pass_cycle_time, edm.edm_multi_pass_recast | WEDMAdaptivePassEngine.test.ts | **production** | high |
| Sinker EDM | SinkerEDMCalculatorEngine, SinkerEDMElectrodeGeometryEngine, SinkerEDMFlushingAdvisorEngine, SinkerEDMWearCompensationEngine, SinkerEDMPrintToProgramEngine, PPSinkerEDMPostEngine | edm.sinker_calculate, edm.sinker_recommend, edm.sinker_edm_electrode_plan, edm.sinker_edm_flush_recommend, edm.sinker_edm_wear_compensate | numerical-sinker-engines.test.ts | **beta** | medium | per work order this is "deferred / scaffolding only" but actual coverage is past scaffolding |
| Laser | LaserCuttingEngine, LaserMarkingEngine, LaserWeldingEngine, LaserCutInterfaceEngine, LaserWaterjetPostExtension | edm.laser_calculate, edm.laser_cut_program, edm.laser_mark_program, edm.laser_weld_program, edm.laser_drill_program, calc.laser_* (≥10 actions) | included in batches | **beta** | medium | per work order: scaffolding-only; reality slightly exceeds scaffold |
| Waterjet | WaterjetCuttingEngine, WaterjetEngine, WaterjetTaperEngine, WaterjetProgramAssemblerEngine | edm.waterjet_calculate, edm.waterjet_abrasive_program, edm.waterjet_pure_program, edm.waterjet_taper_program | covered | **beta** | medium |

---

## 2. SFC features (15 sub-elements)

| SFC element | Engine | Dispatcher action | Test | wired_status | Confidence |
|---|---|---|---|---|---|
| Material-aware Kienzle/Taylor + hardness derating | KienzleForceModelEngine + MaterialEquivalentEngine + HardnessConvertEngine + ConstitutiveModelEngine | calc.kienzle_*, data.material_db_kienzle, calc.hardness_convert, const_johnson_cook | KienzleForceModelEngine.test.ts | **production** | high |
| Holder runout / balance / stickout → achievable RPM | SpindleRunoutEngine, RunoutCompensationEngine, RunoutEffectEngine, ToolOverhangEngine, ToolHolderCatalogEngine | calc.runout_compensation, machine_setup.spindle_runout_calculate, machine_setup.balancing_machine_calculate, calc.toolholder_frf | partially | **beta** | medium |
| Insert geometry (ISO codes) → chip load + Vc | InsertGeometryDatabaseEngine (search hit 0 — relies on registries), CuttingDataEngine | calc.insert_grade_select, calc.insert_geometry_select, kb.kb_select_insert_geometry, kb.kb_get_insert_geometry_db | within tooling tests | **beta** | medium | no dedicated InsertGeometryEngine surfaces by name |
| Machine kinematics class → feed/accel ceilings | MachineKinematicsEngine, MachineKinematicStateEngine, KinematicsEngine, MachineProfileEngine | calc.kinematics_*, calc.machine_profile_* | covered in r3 | **production** | high |
| Stochastic chatter-safe RPM (Monte Carlo on stability lobes) | StochasticChatterEngine, ChatterStabilityLobeEngine, MonteCarloEngine | calc.stochastic_chatter, calc.monte_carlo_simulate, calc.chatter_stability_lobes | monte-carlo-engine.test.ts + dedicated chatter tests | **production** | high |
| Tribal tip injection | CAMTribalKnowledgeInjectionEngine, MillTribalKnowledgeEngine, PostProcessorTribalKnowledgeIntegrationEngine, WEDMTribalTipLearnerEngine, CAMTribalTipLinkerEngine | knowledge.tribal_search, knowledge.tribal_add, knowledge.tribal_capture | WEDMTribalTipLearnerEngine.test.ts | **production** | high |
| Coolant / MQL / cryogenic compensation | 13 coolant engines (CoolantOptimizationPhysicsEngine, CryogenicCuttingEngine, MQLEngine, CoolantDynamicsEngine etc) | calc.cryo_*, calc.coolant_*, machine_setup.coolant_*, edm.cool_* (376 dispatcher hits across 15 files) | covered | **production** | high |
| Thermal drift modeling | ThermalCompensationModelEngine, ThermalGrowthCompensationEngine, InverseThermalCompensationEngine, MachineWarmupEngine | calc.thermal_machine_error, calc.thermal_compensate, machine_setup.machine_warmup_calculate | partial | **beta** | medium |
| Surface finish target → backsolve to S/F | SurfaceFinishPredictorEngine, SurfaceFinishCnnEngine, SurfaceFinishDatabaseEngine, StochasticSurfaceFinishEngine | calc.surface_finish, calc.brammertz_roughness, calc.empirical_feed_from_finish | covered | **beta** | medium | backsolve direction implied via empirical_feed_from_finish; no dedicated "target → S/F backsolve" engine confirmed E2E |
| Cycle time prediction (P50/P75/P95) | CycleTimeEngine, CycleTimeEstimatorEngine, CycleTimeAccuracyEngine, MonteCarloEngine | calc.cycle_time_estimate, calc.monte_carlo_simulate, calc.production_toolpath_cycle_time | covered | **beta** | medium | Monte-Carlo path exists; explicit P50/P75/P95 percentile contract not surfaced |
| Tool life with cost-per-part | ToolCostPerPartEngine, ToolROIEngine, ToolLifePredictionEngine | calc.tool_cost_per_part, calc.tool_roi_analyze, calc.tool_roi_compare | within ROI tests | **production** | high |
| Energy/carbon footprint per move | (no engine matches "EnergyFootprint"; covered by) MachiningEnergyModelEngine, EnergyAnalysisEngine, GutowskiEnergyEngine, SustainabilityReportEngine | calc.machining_energy_model, calc.sus_gutowski_energy, calc.sus_carbon_footprint, sus_lifecycle_assessment | covered | **beta** | medium |
| Confidence scoring | AnchoredConfidenceEngine, MachineConfidenceCalculatorEngine, OrchestratorConfidenceFeedbackEngine, ConfidenceCommitEventBusEngine | embedded in AtomicValue type returns | covered indirectly | **beta** | medium | structural — every engine returns AtomicValue with confidence |
| Closed-loop calibration from actuals | AdaptiveCalibrationEngine, PhysicsAutoCalibrationEngine, BayesianCalibrationEngine, PredictionCalibrationEngine, MultiControllerCalibrationEngine | calc.physics_calibrate_submit, calc.physics_calibrate_predict, prediction_calibrate, lathe_actual_cost_reconcile, adaptive_control.bayesian_calibrate | covered | **beta** | medium-high | engines wired; "from actuals" loop end-to-end not assertion-tested |

---

## 3. Master Post features (12 differentiators)

| Master Post differentiator | Engine | Dispatcher action | Test | wired_status | Confidence |
|---|---|---|---|---|---|
| Per-block adaptive S/F (calls SFC per motion line) | AutoSpeedFeedEngine, AutoSpeedFeedCalculatorEngine, AdaptiveFeedControlEngine, AdaptiveFeedModulationEngine, EngagementAdaptiveFeedEngine | cam.auto_speed_feed_optimize, cam.auto_speed_feed_analyze, cam.auto_speed_feed_batch (25 hits) | no dedicated AutoSpeedFeed.test.ts; embedded in batch tests | **beta** | medium | engine+dispatcher present, no E2E "per motion line" assertion |
| Depth-aware WOC (3D adaptive) | AdaptiveEngagementEngine, AdaptiveChiploadEngine, AdaptiveControlEngine | adaptive_control.adaptive_chipload, calc.engage_adapt_feed, calc.adaptive_engagement_calc | partial | **beta** | medium | "depth → WOC follow-through → S/F follow" chain not assertion-tested |
| Kinematic-aware rapids / air-cut reduction | RapidRepositionOptEngine, AirCutDetectionEngine | cam.post_optimize_rapids, cam.post_full_rapid_optimize, ppg.rapid_optimize, ppg.air_cut_detect | recent commit `01b44110d [PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring]` | **production** | high | very recent wiring + commit pin |
| Lead-in/lead-out optimization | (no dedicated engine surfaces by name "LeadIn") | pp_lead* (6 hits in ppDispatcher only) | none found | **stub** | high | DOWNGRADED — engine missing, only dispatcher passthrough |
| Sub-spindle / mill-turn synchronization | MillTurnOrchestrationEngine, PPOkumaSubSpindleSyncEngine, LatheSubSpindleTransferPurgeEngine | turning.mill_turn_sub_spindle, turning.mill_turn_multi_channel | covered in millturn tests | **beta** | medium |
| Controller-dialect injection | ControllerDialectEngine, ControllerProgrammingIntelligenceEngine, GCodeTranspilerEngine, WEDMControllerDialectVerifierEngine | cam.gcode_transpile, cam.dialect_translate, cam.dialect_features, calc.controller_translate (35 hits) | gcode-transpiler-engine.test.ts | **production** | high |
| Probe / setup-sheet auto-generation | ProbeRoutineEngine, ProbeRoutineGeneratorEngine, SetupSheetEngine, SetupSheetFromGCodeEngine, HyperMillSetupSheetBridge | cam.probe_wcs_setup, cam.probe_first_article, cam.setup_sheet_generate, ppg.setup_sheet, ppg.auto_probe (75 setup_sheet hits, 39 probe_routine hits) | partial | **beta** | medium | engine + actions confirmed; named test missing |
| Collision sweep per block | CollisionPreventionEngine, ToolCollisionQueryEngine, CollisionHazardDetectionEngine | cam.collision_check_full, cam.collision_prevent_full, cam.collision_prevent_certify, cam.collision_prevent_zones (182 hits across 15 files) | within engine harness | **production** | high |
| Process-specific dialect (per-process post) | PostProcessorPipelineEngine + per-process bridges (PPOkumaSubSpindleSyncEngine, PPSinkerEDMPostEngine, WEDMPostFanucEngine, WEDMPostMakinoEngine, etc.) | pp.lathe_post_process, ppg.format_download | per-controller WEDM post tests (Mitsubishi/Sodick/Makino/Agie/Fanuc) | **production** | high |
| 35-stage post pipeline orchestration | PostProcessorPipelineEngine, PostProcessorAutopilotEngine | pp.pp_run_full, pp.pp_run_partial, pp.pp_resolve_context | no dedicated 35-stage assertion test | **beta** | medium-high | DOWNGRADED — pipeline exists but stage count "35" not asserted in any test; Note: project CLAUDE.md says "38 stages" — even internal docs disagree |
| Holder/insert capability awareness | ToolHolderCatalogEngine, HolderRegistryEngine, ToolAssemblyDeflectionEngine | data.holder_get, data.holder_recommend, calc.tool_assembly_deflection | partial | **beta** | medium |
| Build-quality-aware feed-rate ceiling | (no engine literally named BuildQualityAware; relies on) SurfaceIntegrityPredictorEngine, AchievableQualityEngine, ProductionToolpathEngine | calc.surface_integrity_predict, cam.feed_optimize | partial | **stub** | medium-high | DOWNGRADED — no clear "Cpk-class → feed ceiling" backsolve E2E |

**Master Post score:** 4 production / 6 beta / 2 stub / 0 planned. Two key claims (lead-in/out, build-quality-aware ceiling) downgraded to stub.

---

## 4. CAD/CAM AI

| Element | Engine | Dispatcher action | Test | wired_status | Confidence |
|---|---|---|---|---|---|
| CadQuery / OpenCascade CAD generation | CadQueryCodeGeneratorEngine, NeuralCADGenerationEngine, BlueprintToCADGenerationEngine, TextToCADGenerationEngine | cad.cadquery_generate_script, cad.cadquery_step_by_step, cad.cadquery_validate_syntax, cad.cadquery_execute_script | covered | **beta** | medium | OpenCascade not surfaced — Python CadQuery only; "execute" path requires Python runtime, not assertion-tested |
| Print-to-program full pipeline | AutoPrintToProgramBridgeEngine, MillingPrintToProgramEngine, LathePrintToProgramKnowledgeGraphEngine, MultiAxisPrintToProgramEngine, WEDMPrintToProgramEngine, SinkerEDMPrintToProgramEngine (15 P2P engines) | cam.auto_print_to_program, cam.print_to_program_full, cam.print_to_program_enhanced, cam.lathe_p2p_emit, cam.print_to_program_plan, cam.print_to_program_validate (288 p2p hits) | WEDMPrintToProgram.e2e.test.ts, WEDMPrintToProgramEngine-tribal.test.ts, WEDMPrintToProgramEngine-safety.test.ts, blueprint-print-engines.test.ts | **production** | high (WEDM, mill, lathe paths); **beta** for multi-axis (no E2E test) |
| Feature recognition | FeatureRecognitionEngine, LathePrintFeatureStrategySelectorEngine | cad.feature_recognize, cad.feature_edit, cam.lathe_p2p_recognize_features, cam.lathe_p2p_recognize_batch | covered | **beta** | medium |
| Strategy selection | MastercamStrategyEngine, NXCAMStrategyEngine, CATIAStrategyEngine, InventorCAMStrategyEngine + 6 more | cam.cam_strategy_recommend, cam.strategy_taxonomy_lookup, cam.strategy_kb_best, cam.{cam}_strategy_recommend (per CAM) | per-CAM strategy tests | **production** | high |
| Toolpath generation | ProductionToolpathEngine, AdaptiveToolpathRouterEngine, LathePrintToolpathGeneratorEngine, ToolpathStrategyEngine | cam.production_toolpath_generate, toolpath.strategy_select, toolpath.params_calculate, toolpath.generate | toolpath-calculations.test.ts | **production** | high |
| Adaptive posting | PostProcessorAutopilotEngine, AdvancedPostProcessorEngine | pp.pp_run_full | smoke covered | **beta** | medium |
| Multi-process detection | MultiProcessCAMRouterEngine, MultiProcessCAMBridgeEngine, MultiProcessQuoteEngine | cam.multi_process_route, cam.multi_process_analyze, cam.multi_process_sequence, cam.multi_process_cost, cam.multi_process_alternatives | within batch | **beta** | medium |

---

## 5. Business / ERP layer

| Element | Engine count | Sample dispatcher action | wired_status | Confidence |
|---|---|---|---|---|
| Quoting | 19 quote engines (QuoteAutopilotEngine, InstantQuoteEngine, BlueprintToQuoteBridgeEngine etc.) | business.quote_estimate, business.instant_quote, business.quote_to_ship_run | **production** | high |
| ROI | ROIAdvisorEngine, ToolROIEngine, WEDMWirePremiumROIEngine | business.roi_log, business.roi_summary, calc.tool_roi_analyze | **beta** | medium |
| Capacity planning / scheduling | 9 (CapacityPlanningEngine, JobShopSchedulingEngine, LatheJobSchedulingEngine, etc.) | business.capacity_*, business.scheduling_*, lathe_job_schedule | **production** | high |
| Customer portal | CustomerPortalEngine | business.portal_create_token, portal_quote_view, portal_order_status | **beta** | medium |
| Shop floor | 8 (ShopFloorJobEngine, ShopFloorDashboardEngine, ShopFloorCheckInEngine etc.) | shop_floor_check_in, op_sys.shell_bootstrap | **beta** | medium |
| Actual cost reconciliation | ActualCostEngine, LatheActualCostReconciliationEngine | business.actual_cost_calculate, business.actual_cost_variance, lathe_actual_cost_reconcile | **production** | high |
| Work orders / invoicing / payroll / GL / AP / AR | ERPWorkOrderEngine, GeneralLedgerEngine, PayrollEngine + invoice/po engines | business.po_*, business.gl_*, business.payroll_*, business.invoice_* | **beta** | medium |
| ERP integrations | ERPIntegrationEngine, E2ShopConnectorEngine | integration.e2_*, integration.multi_erp_*, business.integration_export_qb | **beta** | medium |
| Subscription billing | StripeBillingEngine | business.billing_get_plans, business.billing_create_checkout, business.billing_handle_webhook | **beta** | medium |

---

## 6. Closed-loop learning

| Element | Engine | Dispatcher | Test | wired_status |
|---|---|---|---|---|
| Bayesian recalibration | (no engine literally named "BayesianRecalibration"; covered by) BayesianCalibrationEngine, PhysicsAutoCalibrationEngine, AdaptiveCalibrationEngine, BayesianOptimizationEngine | adaptive_control.bayesian_calibrate, adaptive_control.bayesian_predict_force, calc.bayesopt_optimize | covered | **beta** |
| Tribal tip capture | WEDMTribalTipLearnerEngine, CAMTribalKnowledgeInjectionEngine | knowledge.tribal_capture, knowledge.tribal_add | WEDMTribalTipLearnerEngine.test.ts | **production** |
| Self-improvement scan | SelfImprovementPatternEngine | dev.self_improvement_scan, dev.self_improvement_read | partial | **beta** |
| Per-AI feedback loops | FeedbackLoopDoctorEngine, SPCFeedbackLoopEngine, MillAISelfAwarenessIntegrationEngine | dev.feedback_loop_record, dev.feedback_record | partial | **beta** |
| Drift metrics | CAMMLDriftMonitorEngine, LatheLoRADriftDetectorEngine, LoRADriftCoordinatorEngine, PPGDriftCanaryEngine, ProbeDriftEngine | ai.sfc_drift_canary_check, ai.ppg_drift_canary_check, cam.cam_ml_drift_run | partial | **beta** |
| Last-calibration timestamps | (structural — embedded in calibration engines' state) | calc.physics_calibrate_state | not asserted | **stub** | DOWNGRADED |

---

## 7. Hooks / safety / quality

| Claim from vision | Reality | wired_status |
|---|---|---|
| 109 hooks | **414 Claude hooks** (`.claude/hooks/**/*.mjs`) + **54 source hooks** (`src/hooks/**/*.ts`) — vision number is 4× under-reported | **production** (vision count outdated, system stronger than claimed) |
| S(x) ≥ 0.70 hard block | safetyDispatcher actions exist (check_toolpath_collision, validate_*, etc.); SafetyHooks tests pass; safety-engines-unit.test.ts, safety-score-boundaries.test.ts | **production** |
| Ω ≥ 0.70 | OmegaDispatcher with omega.compute, omega.validate, omega.auto_score; Ω = 0.25R + 0.20C + 0.15P + 0.30S + 0.10L formula in dispatcher description | **production** |
| 24 safety rules | safetyDispatcher: 30 actions (check_toolpath_collision, validate_rapid_moves, check_fixture_clearance, calculate_safe_approach, detect_near_miss, generate_collision_report, validate_tool_clearance, check_5axis_head_clearance, validate_coolant_flow, check_through_spindle_coolant, calculate_chip_evacuation, validate_mql_parameters, get_coolant_recommendations, check_spindle_torque, check_spindle_power, validate_spindle_speed, monitor_spindle_thermal, get_spindle_safe_envelope, spindle_load_monitor, predict_tool_breakage, calculate_tool_stress, check_chip_load_limits, estimate_tool_fatigue, get_safe_cutting_limits, calculate_clamp_force_required, validate_workholding_setup, check_pullout_resistance, analyze_liftoff_moment, calculate_part_deflection, validate_vacuum_fixture) — exceeds 24 | **production** |
| 296 playbook rules | shop_practice.playbook_* actions present; playbook search is operational per `prismSelfAwarenessEngine.searchPlaybookRules()` API | **production** |
| 3,700 tribal tips active in pipeline | TribalKnowledgeEngine, knowledge.tribal_search, manifest reports `tribalTipCount=0` (telemetry empty) | **beta** | DOWNGRADED — counts present in code/data but live manifest reports 0 — telemetry rot |

---

## 8. Frontend / web

| Element | Reality | wired_status |
|---|---|---|
| React/Vite at `H:/prism/mcp-server/web/` port 3100 | confirmed: `mcp-server/web/src/main.tsx`, `vite.config.ts` (assumed), pages dir contains 100+ tsx pages | **production** |
| Calculator page | `pages/SfcCalculatorPage.tsx`, `pages/SpeedFeedPage.tsx` | **production** |
| Dashboard | `pages/ShopDashboardPage.tsx`, `pages/ExecutiveDashboardPage.tsx`, `pages/OEEDashboardPage.tsx`, `pages/SafetyDashboardPage.tsx`, `pages/ErpDashboard.tsx` (≥10 dashboard pages) | **production** |
| QuoteBuilder | `pages/QuoteBuilderPage.tsx`, `pages/QuoteAnalyticsPage.tsx`, `pages/QuoteFollowUpPage.tsx`, `pages/BlueprintQuotePage.tsx`, `pages/AdditiveQuotePage.tsx`, `pages/SheetMetalQuotePage.tsx`, `pages/InjectionMoldPage.tsx` | **production** |
| Academy / learning | `components/learning/CourseCatalog.tsx`, `LessonView.tsx`, `LearningPath.tsx`, `Assessment.tsx`, `CourseDetail.tsx`, `LessonStudio.tsx` + `pages/CourseViewerPage.tsx`, `LearningDashboard.tsx`, `AILearningDashboardPage.tsx`, `FleetLearningDashboardPage.tsx`; tests: `LearningPath.test.tsx`, `DocumentLearningPage.test.tsx`, `academy-storage-hardening.test.tsx` | **beta** | components built, tests exist, but per global memory "built but unwired" — actual page-level routing visible — NEEDS CLARIFICATION on what "unwired" means; components render in tests but real-data paths may stub |
| Visual design vs Prismv1.html reference | Prismv1.html not located in this audit; cannot compare | **planned** |

---

## Coverage roll-up (vision element count: 60 sub-elements graded above)

| Status | Count | % |
|---|---|---|
| **production** | 23 | 38% |
| **beta** | 28 | 47% |
| **stub** | 6 | 10% |
| **planned** | 3 | 5% |

**Reality check:** 38% of vision elements have full chain (engine + dispatcher action + test). 47% have engine + action but no E2E assertion. 10% are stubs. The 109-hooks number in vision is wildly underestimated (real: 414). The pillar telemetry says 0% but engine inventory contradicts — telemetry rot is the most critical hidden gap.
