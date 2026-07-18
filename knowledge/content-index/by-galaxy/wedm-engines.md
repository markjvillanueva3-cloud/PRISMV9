---
name: wedm-engines
description: Strategic categorized engine digest for the wedm (wire-EDM) galaxy -- discharge physics, wire mechanics, multi-pass strategy, controller dialects, surface integrity, and the closed-loop AI/ML learning substrate.
type: reference
galaxy: wedm
node_type: memory
---

# wedm galaxy -- engine digest

## Overview

The wedm galaxy is PRISM's wire-EDM (electrical-discharge machining) domain: material removal by thermal-electric spark erosion in a dielectric bath, NOT mechanical chip formation. Because the physics differs fundamentally, Kienzle / Taylor / kc1.1 specific-cutting-energy DO NOT apply here -- discharge energy, pulse-on/off ratios, recast-layer growth, spark-gap offsets, and wire-break risk govern the process instead (`mcp-server/src/engines/wedm/CLAUDE.md` sec 4-5). The galaxy spans the full print-to-program pipeline -- feasibility, material/machine/wire selection, start-hole and setup planning, toolpath strategy, multi-pass scheduling, per-controller G-code emission (5 vendor dialects), and post-cut surface-integrity verification -- plus a large closed-loop AI/ML learning substrate (neural training, LoRA adapters, RL controllers, GNN lattice, feedback calibration). Engine geography per CLAUDE.md sec 1: 164 engines live FLAT under `mcp-server/src/engines/` (145 `WEDM*.ts` + 19 `EDM*.ts`), and 4 additional pipeline engines live in the `wedm/` subdir (168 engines total, verified by `ls` on 2026-07-01). JM Die's canonical machine is the Mitsubishi FA-10S/FA-20S with M800 controller, deionized-water dielectric, 0.25mm brass wire.

## Strategic categories

Categories are grounded in the file-name clusters plus the authoritative cluster maps in `mcp-server/src/engines/wedm/CLAUDE.md` sec 2 and `mcp-server/src/engines/wedm/PATHS.md` sec A.

### 1. Discharge physics + spark model
Thermal-electric core: spark erosion, gap voltage, MRR, thermal field, dielectric correction, current/power density guards, corner physics, wire heating, kerf.
- `WEDMSparkErosionModelEngine` - `WEDMGapVoltageControlEngine` - `WEDMMRRPhysicsEngine` - `WEDMThermalFieldEngine` - `WEDMDielectricCorrectionEngine` - `WEDMDielectricFlushAdjustEngine` - `WEDMCurrentDensityGuardEngine` - `WEDMPowerDensityGuardEngine` - `WEDMPulseLimitEngine` - `WEDMCornerPhysicsEngine` - `WEDMWireHeatingEngine` - `WEDMKerfWidthEngine` - `EDMParameterEngine` - `EDMCuttingParamFlushEngine`

### 2. Wire mechanics + break/deflection risk
Wire path collision, break prediction, tension, deflection, taper error budget, slug/tab retention, wire life, thin-wire derate, spool consumption, stress.
- `WEDMWirePathCollisionEngine` - `WEDMWireBreakPredictorEngine` - `WEDMWireBreakRiskCostEngine` - `WEDMWireTensionOptimizerEngine` - `WEDMWireDeflectionEngine` - `WEDMTaperErrorBudgetEngine` - `WEDMWireStressAnalysisEngine` - `WEDMWireSpoolConsumptionEngine` - `WEDMWeibullWireLifeEngine` - `WEDMThinWireDerateEngine` - `WEDMSlugTabRetentionEngine` - `WEDMWireThreadingMinEngine` - `WEDMRULEngine` - `SmartWireSelectorEngine` - `EDMWireEngine` - `EDMWireSlugCornerTaperEngine`

### 3. Print-to-program pipeline (geometry to NC)
DXF/drawing interpretation, feature classification, feasibility, material/machine/wire selection, start-hole/setup, toolpath strategy, program assembly, complete orchestration.
- `WEDMPrintToProgramEngine` (subdir + flat) - `WEDMCompleteOrchestrationEngine` - `EDMDrawingInterpretationEngine` - `WEDMDwgImportEngine` - `WEDMDXFClosureValidatorEngine` - `WEDMPartClassifierEngine` - `WEDMPartRecognitionEngine` - `EDMFeasibilityEngine` - `EDMMaterialMachineWireEngine` - `EDMStartHoleSetupEngine` - `EDMToolpathStrategyEngine` - `WEDMStartPointOptimizationEngine` - `WEDMTabStrategyEngine` - `WEDMSequencingEngine` - `WEDMFixtureInterferenceEngine` - `EDMProgramAssemblerEngine` - `EDMEngine`

### 4. Multi-pass + cutting-strategy library
Rough + skim pass scheduling, adaptive passes, canonical strategy library, program optimization/comparison, Pareto search.
- `EDMMultiPassStrategyEngine` - `WEDMAdaptivePassEngine` - `WEDMStrategyLibraryEngine` - `WEDMProgramOptimizerEngine` - `WEDMProgramComparisonEngine` - `WEDMMultiProfileBatchEngine` - `WEDMHierarchicalPlannerEngine` - `WEDMRecipeAdaptationEngine` - `WEDMParetoFrontierSearchEngine` - `WEDMParetoCacheEngine` - `EDMBiMaterialCompensationEngine`

### 5. Controller dialects + G-code emission (5 vendors)
Post-processor dialect router to Mitsubishi / Sodick / Makino / Agie / Fanuc, plus the large consolidated G-code + post-process planner.
- `EDMPostProcessGCodeEngine` - `EDMPostProcessorExtension` - `WEDMPostDialectRouterEngine` - `WEDMPostMitsubishiEngine` - `WEDMPostSodickEngine` - `WEDMPostMakinoEngine` - `WEDMPostAgieEngine` - `WEDMPostFanucEngine` - `WEDMPostTypes` - `WEDMControllerDialectVerifierEngine`

### 6. Surface integrity + quality + verification
Recast/HAZ/residual-stress prediction, real-time process monitoring, Ra prediction, quality orchestration, SPC, first-article, safety gates, benchmark tolerance.
- `EDMMonitorSurfaceIntegrityEngine` - `EDMSurfaceIntegrityEngine` - `WEDMRecastDepthPredictorEngine` - `WEDMRecastLayerMLEngine` - `WEDMHeatAffectedZoneEngine` - `WEDMRaPredictorEngine` - `WEDMThermalReleaseGateEngine` - `EDMQualityOrchestratorEngine` - `WEDMOffsetSPCEngine` - `WEDMBenchmarkToleranceEngine` - `WEDMProgramSafetyGateEngine` - `WEDMSafetyEnvelopeEngine` - `WEDMFlushAdequacyGateEngine` - `WEDMHeadClearanceEngine` - `WEDMProgramVerificationEngine` - `WEDMPreFlightCheckEngine` - `WEDMProductionReadinessEngine` - `WEDMUnitTagGateEngine` - `WEDMTier6GeomGateEngine`

### 7. AI / ML / closed-loop learning substrate
Neural training, LoRA adapters, RL control, GNN lattice/graph-attention, transfer/online/continuous learning, feedback calibration, reasoning bridges, few-shot, Kalman fusion, drift detection, outcome capture.
- `WEDMNeuralTrainingEngine` - `WEDMProgramNeuralAnalysisEngine` - `WEDMNeuralFormulaFusionEngine` - `WEDMLoRAAdapterEngine` - `WEDMLoRACadenceEngine` - `WEDMLoRADatasetBuilderEngine` - `WEDMRLControllerEngine` - `WEDMRLPolicyPersistence` - `WEDMRewardShapingEngine` - `WEDMRolloutSimulatorEngine` - `WEDMLatticeGraphEngine` - `WEDMGraphAttentionEngine` - `WEDMNeighborQueryEngine` - `WEDMPrototypicalNetworkEngine` - `WEDMTransferLearningEngine` - `WEDMOnlineLearningEngine` - `WEDMContinuousLearningEngine` - `WEDMLearningLoopEngine` - `WEDMModelUpdateEngine` - `WEDMMLParameterOptimizerEngine` - `WEDMCalculatorAIEngine` - `WEDMFeatureImportanceEngine` - `WEDMFewShotEngine` - `WEDMFewShotMaterialEngine` - `WEDMAnalogicalReasoningEngine` - `WEDMReasoningBridgeEngine` - `WEDMReasoningExplainEngine` - `WEDMReasoningTraceLedgerEngine` - `WEDMKalmanFusionEngine` - `WEDMDriftDetectionEngine` - `WEDMDegradationModelEngine` - `WEDMFeedbackCalibrationEngine` - `WEDMFeedbackIngestionEngine` - `WEDMJobOutcomeEngine` - `WEDMJobPatternLearnerEngine` - `WEDMTribalTipLearnerEngine` - `WEDMDeviationToTipEngine` - `WEDMKnowledgeDistillationEngine` - `WEDMProcessCausalityEngine` - `WEDMWhatIfSimulatorEngine` - `WEDMEWCMemoryEngine` - `WEDMBlackboardEngine` - `WEDMMultiAgentDispatchEngine` - `WEDMPartFamilyMatcherEngine` - `WEDMPartFamilyTemplateExtractorEngine` - `WEDMMaterialCharacterizationEngine` - `WEDMMaterialSparkDatabaseEngine`

### 8. Autonomy, governance, ERP/cost + analysis
Autonomy substrate + audit gates, governance store, batch/archive program analysis, cost/quote/ERP bridges, scheduling/maintenance, self-awareness, setup docs.
- `WEDMAutonomyEngine` - `WEDMAutonomyAuditEngine` - `WEDMAutonomySubstrateGateEngine` - `WEDMGovernanceStore` - `WEDMFailsafeEngine` - `WEDMExceptionHandlerEngine` - `WEDMFaultDiagnosisEngine` - `WEDMHumanHandoffEngine` - `WEDMBatchProgramAnalyzerEngine` - `WEDMArchiveBackfillEngine` - `WEDMActiveQueryEngine` - `WEDMCitationCheckEngine` - `WEDMJobCostEngine` - `WEDMJobCreatorEngine` - `WEDMCreditCostEngine` - `WEDMInvoiceLineEngine` - `WEDMOverageApprovalEngine` - `WEDMQuoteBridgeEngine` - `WEDMWirePremiumROIEngine` - `WEDMSchedulingEngine` - `WEDMMaintenanceSchedulerEngine` - `WEDMMachineStateEngine` - `WEDMVirtualMachineEngine` - `WEDMCalibrationReportEngine` - `WEDMSelfAwarenessEngine` - `WEDMAwarenessAdoptionEngine` - `WEDMAccessibilityEngine` - `WEDMSetupSheetEngine` - `WEDMProgressTrackerEngine` - `WEDMTradeoffElicitationEngine` - `WEDMTribalRuntimeEngine` - `EDMCostDocumentationEngine`

## Key engines (detailed)

### EDMPostProcessGCodeEngine.ts
Largest engine in the galaxy (~126K). Consolidates post-process planning (MS15: recast removal, stress relief, inspection, surface treatment, sequencing) and multi-dialect wire-EDM G-code generation (MS16) for Fanuc, Sodick, Makino, Mitsubishi, and Agie-Charmilles controllers, including a multi-pass orchestrator that emits rough (D01) then trim passes then tab cuts. Pure computation, no external imports.
- file: `mcp-server/src/engines/EDMPostProcessGCodeEngine.ts`
- Exports: `PostProcessStep`, `PostProcessPlan`, `PostProcessInput`, `WireEDMController`, `EDMGCodeInput`; actions `plan_post_process`, `generate_gcode`, `generate_fanuc/sodick/makino`, `full_generate`.

### EDMQualityOrchestratorEngine.ts
Capstone quality engine (~102K) consolidating quality verification (MS19: dimensional CMM/Cpk, surface-finish vs spec, profile accuracy, recast compliance, AS9102/PPAP first-article) and pipeline orchestration + learning (MS20: 20-stage stage-gated pipeline, job-history tracking, Bayesian parameter calibration, similar-job recommendation, continuous-improvement drift detection). Persists durable state (job history, parameter priors, gate overrides, audit log) to `../../data/quality`.
- file: `mcp-server/src/engines/EDMQualityOrchestratorEngine.ts`
- Exports: `QualityVerificationInput`; actions `verify_quality`, `generate_first_article`, `run_pipeline`, `record_job`, `get_recommendation`, `calibration_report`, `improvement_report`.

### WEDMNeuralTrainingEngine.ts
The declared "mathematical maximum" of wire-EDM AI (~86K): 10 stacked models -- Bayesian parameter estimation, Gaussian-process regression, a 12-24-16-8-4 neural feature extractor, Klocke Ra prediction, Kunieda MRR, Taylor wire life, Weibull wire-break, Monte-Carlo optimization, gradient descent with momentum, cross-entropy classification. Integrates JM Die production programs, Mitsubishi FA-S and Makino tech tables, tribal tips, and EDM_PHYSICS constants.
- file: `mcp-server/src/engines/WEDMNeuralTrainingEngine.ts`
- Imports `EDM_PHYSICS` from `../physics/constants.js`, JM Die program patterns, `WEDM_KNOWLEDGE_TIPS`, Mitsubishi/Makino extracted tech records.

### EDMCuttingParamFlushEngine.ts
Cutting-parameter and flushing-strategy core (~73K), consolidating MS9 (pulse parameter, servo control, wire speed, discharge energy E=V*I*t_on, technology-table mapping, wire-break prediction, RC finishing circuits for Ra < 0.4um) and MS10 (flushing-mode selection, nozzle positioning, pressure calculation, dielectric-condition monitoring, debris evacuation). Imports published pulse conditions and `EDM_PHYSICS`.
- file: `mcp-server/src/engines/EDMCuttingParamFlushEngine.ts`
- Exports: `PassType`, `FlushingMode`, `CuttingParamInput`, `CuttingParamResult`, `FlushingInput`; sources conditions from `wedm-published-conditions.js`.

### EDMMaterialMachineWireEngine.ts
Material assessment (MS3) plus machine/wire selection (MS4), 11 units (~72K). Classifies EDM machinability A-D, resolves thermal/electrical properties, assesses recast risk and heat-treat state; selects machine, wire type (brass/coated/molybdenum/tungsten), diameter, tension, consumption, and maps controller capability across Fanuc/Sodick/Makino/Mitsubishi/AgieCharmilles/Accutex.
- file: `mcp-server/src/engines/EDMMaterialMachineWireEngine.ts`
- Exports: `MachinabilityClass`, `WireType`, `WireSpec`, `EDMMachineSpec`; actions `assess_material`, `select_machine`, `select_wire`, `full_selection`.

### WEDMProgramNeuralAnalysisEngine.ts
Deep-reasoning analyzer (~64K) for wire-EDM programs, aimed at auditing programs from less-experienced JM Die programmers. Validates E-code sequence logic and M-code timing, optimizes parameters against physics, does neural-style pattern recognition against successful programs, predicts wire-break risk, and emits actionable recommendations. Cites Klocke, Toenshoff, DiBitonto, and Kunieda models.
- file: `mcp-server/src/engines/WEDMProgramNeuralAnalysisEngine.ts`
- Exports: `WEDMParams`, `ProgramAnalysis`; wires to `WireEDMProgramParserEngine`, `WEDMFeedbackCalibrationEngine`, `EDM_PHYSICS`, JM Die E-code families.

### WEDMCompleteOrchestrationEngine.ts
30-stage end-to-end program-generation pipeline (~61K) with physics traceability at every stage: geometry/feasibility, physics core (published-condition lookup, pulse-parameter gen, DiBitonto crater offsets, Kunieda feed, Klocke pass-count, Carslaw-Jaeger recast gate), machine interface (E-pack codegen, flushing, tension), toolpath/G-code (multi-dialect, arc reversal, UV taper, wire-break recovery), and verification (backplot, cycle-time, cost, setup sheet, surface integrity, Monte-Carlo uncertainty).
- file: `mcp-server/src/engines/WEDMCompleteOrchestrationEngine.ts`
- Exports `WEDMOrchestrationInput`; imports `EDM_PHYSICS`, `CANONICAL_MATERIAL_DB` from constants.

### EDMStartHoleSetupEngine.ts
Start-hole planning (MS5) plus workholding/setup (MS6), 10 units (~49K). Plans start-hole location/diameter, selects drill vs EDM hole-popper by hardness, optimizes position for edge clearance and thin-wall avoidance, plans threading sequence and slug management; then designs fixtures, plans datum alignment, workpiece leveling, submerged dielectric level, and generates the setup checklist.
- file: `mcp-server/src/engines/EDMStartHoleSetupEngine.ts`
- Exports: `StartHoleMethod`, `FixtureType`, `DatumMethod`, `MaterialCategory`, `ProfileGeometry`.

### EDMMonitorSurfaceIntegrityEngine.ts
Real-time process monitoring (MS13) plus SAFETY-CRITICAL surface-integrity assessment (MS14) (~48K). Monitoring classifies gap pulses (normal/open/short), tracks speed vs prediction, discharge pattern, wire-break risk, thermal drift, and recommends adaptive actions (retract, reduce energy, increase tension, emergency stop). Surface integrity computes recast (d=2*sqrt(alpha*t_on), Carslaw-Jaeger), HAZ, residual stress, and fatigue reduction against AMS 2628 / ASTM F86 / OEM specs; results carry a safety-critical flag that callers MUST surface before releasing parts.
- file: `mcp-server/src/engines/EDMMonitorSurfaceIntegrityEngine.ts`
- Exports: `GapStats`, `ProcessMonitorInput`, `AdaptiveAction`; actions `monitor_process`, `assess_surface_integrity`, `predict_recast`, `calculate_fatigue_impact`, `full_assessment`.

### WEDMStrategyLibraryEngine.ts
Canonical library of 15 WEDM cutting strategies (~43K) across roughing, skim, corner, taper, flush, material-specific, and section-thickness variants. Each strategy carries material-suitability ratings with speed/power factors, thickness range, typical pulse params, and JM Die shop-floor tips. Selection uses a weighted scoring model (material 0.35, thickness 0.25, Ra 0.25, pass compatibility 0.15). Contextualized to JM Die FA-20S / M800, D2/A2/S7/M2/H13 tool steel + WC-Co carbide, 0.25mm brass.
- file: `mcp-server/src/engines/WEDMStrategyLibraryEngine.ts`
- Exports: `StrategyCategory`, `MaterialSuitability`, `ThicknessRange`, `TypicalParams`.

### EDMBiMaterialCompensationEngine.ts
Handles wire-EDM through bi-material workpieces -- steel body with brazed tungsten-carbide inserts (~42K). Models the steel to braze to carbide transitions, each needing different spark parameters to avoid wire breakage: MRR scales with thermal diffusivity/melting point, break probability at transitions via P=1-exp(-lambda*dE/E*H/H_ref), and servo-response-derived transition ramp lengths. Cites Rajurkar, Ho and Newman, DiBitonto.
- file: `mcp-server/src/engines/EDMBiMaterialCompensationEngine.ts`
- Exports: `MaterialZone`, `ZoneParams`.

### WEDMProgramOptimizerEngine.ts
Optimizer (~41K) that rewrites amateur wire-EDM programs to maximum potential using patterns learned from JM Die's 4,000+ program archive plus physics. Applies learned rules (E952 + E56xx for ACU 7-pass precision, E12xx for standard 3-4 pass, an H-offset cascade, M90 adaptive-control always on, submerged for thickness > 1 inch, zinc wire for carbide-brazed punches), targeting maximum cutting speed at quality with minimized wire breaks.
- file: `mcp-server/src/engines/WEDMProgramOptimizerEngine.ts`
- Exports: `CurrentParams`; wires to `WireEDMProgramParserEngine`, JM Die E-code families.

### WEDMBatchProgramAnalyzerEngine.ts
Batch analyzer (~41K) that systematically processes ALL wire-EDM programs in the JM Die archive (~4,000+ files) to build manufacturing-intelligence databases for AI training and pattern mining. Per-program NC analysis (dialect detection, E-codes, offsets, feeds, passes), quality scoring (completeness/correctness/optimization/safety), and per-customer pattern extraction. Emits `WEDM_BATCH_ANALYSIS.json` plus program-patterns and customer-profiles JSON.
- file: `mcp-server/src/engines/WEDMBatchProgramAnalyzerEngine.ts`
- Exports: `WEDMProgramAnalysis`; wires to `WireEDMProgramParserEngine`.

### EDMToolpathStrategyEngine.ts
Toolpath-strategy engine (~40K), MS7 U01-U07: profile-type classification (closed external/internal, open, island), cutting-direction optimization (CW/CCW by profile type and debris flow), approach/departure generation (tangent arc, perpendicular, angle lead-in/out), corner strategy (sharp pause, radius follow, tangent blend), taper toolpath (UV offsets, 4-axis XY+UV), tab placement (slug weight, critical-surface avoidance), and cut-sequence optimization (inside-before-outside, small-before-large, start-hole grouping).
- file: `mcp-server/src/engines/EDMToolpathStrategyEngine.ts`
- Exports: `ToolpathInput`, `ProfileDefinition`, `ToolpathResult`, `ClassifiedProfile`.

### WEDMPrintToProgramEngine.ts
Two engines share this base name. The flat `mcp-server/src/engines/WEDMPrintToProgramEngine.ts` (~39K) is a 7-stage DXF/contour to complete-program pipeline (awareness, DXF parse, settings calc, multipass plan, gcode gen, safety-envelope check that hard-throws on critical violations, structural verification PASS/FAIL). The subdir `mcp-server/src/engines/wedm/WEDMPrintToProgramEngine.ts` is the MIKE (Wire EDM Wizard) core -- a full physics-first, tribal-integrated, 35-stage generator (identical architecture to `TurningPrintToProgramEngine`), described as the only engine enabling closed-loop self-improving learning for wire EDM.
- file: `mcp-server/src/engines/WEDMPrintToProgramEngine.ts` (flat) + `mcp-server/src/engines/wedm/WEDMPrintToProgramEngine.ts` (subdir)
- Flat exports: `ContourSegment`, `Contour`, `WEDMGenerateInput`. Subdir wires to `SpeedFeedOrchestratorEngine`, `WEDMPartClassifierEngine`, `SmartWireSelectorEngine`.

## Full engine index

Categories: DP=discharge-physics, WM=wire-mechanics, P2P=print-to-program-pipeline, MP=multipass-strategy, PP=post/dialect, QA=surface-integrity/quality, AI=ai-ml-learning, GOV=autonomy/governance/ERP. One-liners are from each file's leading JSDoc (for the ~19 read) or the CLAUDE.md/PATHS.md cluster maps; unread engines carry a cluster-derived one-liner.

| Engine | Category | One-line |
|--------|----------|----------|
| EDMBiMaterialCompensationEngine.ts | MP | Steel + brazed-carbide bi-material wire EDM; per-zone spark params to prevent break at transitions. |
| EDMCostDocumentationEngine.ts | GOV | EDM cost estimation + documentation; ERP reorder bridge. |
| EDMCuttingParamFlushEngine.ts | DP | Pulse/servo/wire-speed/discharge-energy params (MS9) + flushing strategy (MS10). |
| EDMDrawingInterpretationEngine.ts | P2P | Interpret EDM drawings/prints into an EDM feature map. |
| EDMEngine.ts | P2P | Core EDM entry engine. |
| EDMFeasibilityEngine.ts | P2P | Pre-flight feasibility: conductivity, geometry, tolerance, taper limits. |
| EDMMaterialMachineWireEngine.ts | P2P | Material assessment (MS3) + machine/wire selection (MS4), 11 units. |
| EDMMonitorSurfaceIntegrityEngine.ts | QA | Real-time gap monitoring (MS13) + safety-critical surface integrity/recast/HAZ (MS14). |
| EDMMultiPassStrategyEngine.ts | MP | Rough + skim multi-pass scheduling strategy. |
| EDMParameterEngine.ts | DP | Core EDM discharge-parameter resolver. |
| EDMPostProcessGCodeEngine.ts | PP | Post-process planning (MS15) + multi-dialect G-code gen (MS16), 5 controllers. |
| EDMPostProcessorExtension.ts | PP | Post-processor extension hooks for EDM G-code emission. |
| EDMProgramAssemblerEngine.ts | P2P | Assembles final EDM program from planned stages. |
| EDMQualityOrchestratorEngine.ts | QA | Quality verification (MS19) + pipeline orchestrator/learning (MS20) capstone. |
| EDMStartHoleSetupEngine.ts | P2P | Start-hole planning (MS5) + workholding/setup (MS6), 10 units. |
| EDMSurfaceIntegrityEngine.ts | QA | Surface-integrity assessment (recast/HAZ/residual stress). |
| EDMToolpathStrategyEngine.ts | P2P | Toolpath strategy (MS7): profile class, direction, approach, corner, taper, tabs, sequence. |
| EDMWireEngine.ts | WM | Core wire-model engine. |
| EDMWireSlugCornerTaperEngine.ts | WM | Wire slug/corner/taper handling. |
| WEDMAccessibilityEngine.ts | GOV | Accessibility/reachability checks for the wire path. |
| WEDMActiveQueryEngine.ts | GOV | Active-query interface over WEDM knowledge/state. |
| WEDMAdaptivePassEngine.ts | MP | Adaptive pass scheduling based on live conditions. |
| WEDMAnalogicalReasoningEngine.ts | AI | Analogical reasoning over prior WEDM cases (AI substrate). |
| WEDMArchiveBackfillEngine.ts | GOV | Backfill/mine the JM Die WEDM archive into intelligence stores. |
| WEDMAutonomyAuditEngine.ts | GOV | Audit gate for WEDM autonomy actions. |
| WEDMAutonomyEngine.ts | GOV | WEDM autonomy control surface. |
| WEDMAutonomySubstrateGateEngine.ts | GOV | Substrate gate governing autonomous WEDM operation. |
| WEDMAwarenessAdoptionEngine.ts | GOV | Adoption of awareness/context into WEDM workflows. |
| WEDMBatchProgramAnalyzerEngine.ts | GOV | Batch-analyze ~4,000+ JM Die programs for intelligence DBs + AI training. |
| WEDMBenchmarkToleranceEngine.ts | QA | Benchmark tolerance capability vs spec. |
| WEDMBlackboardEngine.ts | AI | Blackboard coordination substrate for multi-agent WEDM reasoning. |
| WEDMCalculatorAIEngine.ts | AI | AI-assisted WEDM parameter calculator. |
| WEDMCalibrationReportEngine.ts | GOV | Generates calibration reports for WEDM models. |
| WEDMCitationCheckEngine.ts | GOV | Checks citations/provenance on WEDM knowledge claims. |
| WEDMCompleteOrchestrationEngine.ts | P2P | 30-stage physics-traceable end-to-end program generation. |
| WEDMContinuousLearningEngine.ts | AI | Continuous-learning loop over WEDM outcomes. |
| WEDMControllerDialectVerifierEngine.ts | PP | Verifies emitted G-code against controller dialect rules. |
| WEDMCornerPhysicsEngine.ts | DP | Corner discharge/erosion physics. |
| WEDMCreditCostEngine.ts | GOV | Credit/cost accounting for WEDM jobs. |
| WEDMCurrentDensityGuardEngine.ts | DP | Guards against excessive discharge current density. |
| WEDMDegradationModelEngine.ts | AI | Models degradation/wear over time for prediction. |
| WEDMDeviationToTipEngine.ts | AI | Converts program deviations into learnable tribal tips. |
| WEDMDielectricCorrectionEngine.ts | DP | Corrects params for dielectric condition. |
| WEDMDielectricFlushAdjustEngine.ts | DP | Adjusts flushing for dielectric state. |
| WEDMDriftDetectionEngine.ts | AI | Detects metric/model drift over time. |
| WEDMDwgImportEngine.ts | P2P | Imports DWG geometry for WEDM. |
| WEDMDXFClosureValidatorEngine.ts | P2P | Validates DXF contour closure before cutting. |
| WEDMEWCMemoryEngine.ts | AI | Elastic-weight-consolidation memory for continual learning. |
| WEDMExceptionHandlerEngine.ts | GOV | Structured exception handling for WEDM workflows. |
| WEDMFailsafeEngine.ts | GOV | Failsafe fallback behavior on WEDM faults. |
| WEDMFaultDiagnosisEngine.ts | GOV | Diagnoses WEDM process faults. |
| WEDMFeatureImportanceEngine.ts | AI | Feature-importance analysis for ML models. |
| WEDMFeedbackCalibrationEngine.ts | AI | Calibrates physics models from feedback data. |
| WEDMFeedbackIngestionEngine.ts | AI | Ingests outcome feedback into the learning loop. |
| WEDMFewShotEngine.ts | AI | Few-shot inference for sparse WEDM cases. |
| WEDMFewShotMaterialEngine.ts | AI | Few-shot material-specific parameter inference. |
| WEDMFixtureInterferenceEngine.ts | P2P | Detects fixture interference with the wire path. |
| WEDMFlushAdequacyGateEngine.ts | QA | Gates on flushing adequacy before NC emit. |
| WEDMGapVoltageControlEngine.ts | DP | Models working gap voltage vs open-circuit voltage. |
| WEDMGovernanceStore.ts | GOV | Governance/policy state store for WEDM. |
| WEDMGraphAttentionEngine.ts | AI | Graph-attention model over the WEDM lattice. |
| WEDMHeadClearanceEngine.ts | QA | Head/upper-guide clearance safety check. |
| WEDMHeatAffectedZoneEngine.ts | QA | Predicts heat-affected-zone depth. |
| WEDMHierarchicalPlannerEngine.ts | MP | Hierarchical multi-level pass/job planning. |
| WEDMHumanHandoffEngine.ts | GOV | Escalates to a human operator on low-confidence outputs. |
| WEDMInvoiceLineEngine.ts | GOV | Generates ERP invoice lines for WEDM jobs. |
| WEDMJobCostEngine.ts | GOV | Per-job cost computation. |
| WEDMJobCreatorEngine.ts | GOV | Creates WEDM job records. |
| WEDMJobOutcomeEngine.ts | AI | Captures predicted-vs-actual job outcomes for learning. |
| WEDMJobPatternLearnerEngine.ts | AI | Learns recurring job patterns from history. |
| WEDMKalmanFusionEngine.ts | AI | Kalman fusion of noisy discharge/telemetry signals. |
| WEDMKerfWidthEngine.ts | DP | Computes kerf width from wire + spark gap. |
| WEDMKnowledgeDistillationEngine.ts | AI | Distills tribal + wiki knowledge into compact form. |
| WEDMLatticeGraphEngine.ts | AI | Builds/queries the WEDM parameter lattice graph. |
| WEDMLearningLoopEngine.ts | AI | Orchestrates the closed learning loop. |
| WEDMLoRAAdapterEngine.ts | AI | LoRA adapter for per-domain WEDM model tuning. |
| WEDMLoRACadenceEngine.ts | AI | Schedules LoRA retrain cadence. |
| WEDMLoRADatasetBuilderEngine.ts | AI | Builds LoRA training datasets from the vault/outcomes. |
| WEDMMachineStateEngine.ts | GOV | Tracks live machine state. |
| WEDMMaintenanceSchedulerEngine.ts | GOV | Schedules WEDM machine maintenance. |
| WEDMMaterialCharacterizationEngine.ts | AI | Characterizes material EDM response. |
| WEDMMaterialSparkDatabaseEngine.ts | AI | Material-vs-spark-parameter database engine. |
| WEDMMLParameterOptimizerEngine.ts | AI | ML-driven parameter optimization. |
| WEDMModelUpdateEngine.ts | AI | Applies model updates from retraining. |
| WEDMMRRPhysicsEngine.ts | DP | Material-removal-rate physics model. |
| WEDMMultiAgentDispatchEngine.ts | AI | Dispatches sub-tasks across multiple reasoning agents. |
| WEDMMultiProfileBatchEngine.ts | MP | Batch-plans multiple profiles in one setup. |
| WEDMNeighborQueryEngine.ts | AI | Nearest-neighbor retrieval over lattice/cases. |
| WEDMNeuralFormulaFusionEngine.ts | AI | Fuses neural predictions with physics formulas. |
| WEDMNeuralTrainingEngine.ts | AI | Mathematical-maximum WEDM AI: 10 stacked Bayesian/GP/neural/physics models. |
| WEDMOffsetSPCEngine.ts | QA | SPC over H-register offset drift. |
| WEDMOnlineLearningEngine.ts | AI | Online/incremental learning from live data. |
| WEDMOverageApprovalEngine.ts | GOV | Approval workflow for cost/time overages. |
| WEDMParetoCacheEngine.ts | MP | Caches Pareto-frontier optimization results. |
| WEDMParetoFrontierSearchEngine.ts | MP | Searches the speed-vs-quality Pareto frontier. |
| WEDMPartFamilyMatcherEngine.ts | AI | Matches parts to known part families. |
| WEDMPartFamilyTemplateExtractorEngine.ts | AI | Extracts reusable templates per part family. |
| WEDMPartRecognitionEngine.ts | P2P | Recognizes part/feature types from geometry. |
| WEDMPostAgieEngine.ts | PP | Agie-Charmilles CUT-series post dialect. |
| WEDMPostDialectRouterEngine.ts | PP | Routes G-code emission to the correct vendor dialect. |
| WEDMPostFanucEngine.ts | PP | Fanuc alpha-C ROBOCUT post dialect. |
| WEDMPostMakinoEngine.ts | PP | Makino Hyper-i post dialect. |
| WEDMPostMitsubishiEngine.ts | PP | Mitsubishi M800/FA-S post dialect. |
| WEDMPostSodickEngine.ts | PP | Sodick AQ post dialect (C### conditions). |
| WEDMPostTypes.ts | PP | Shared type definitions for the post dialects. |
| WEDMPowerDensityGuardEngine.ts | DP | Guards against excessive discharge power density. |
| WEDMPreFlightCheckEngine.ts | QA | Pre-flight validation gate before NC emit. |
| WEDMPrintToProgramEngine.ts | P2P | 7-stage DXF-to-program pipeline with hard-throw safety envelope. |
| WEDMProcessCausalityEngine.ts | AI | Causal analysis of process-outcome relationships. |
| WEDMProductionReadinessEngine.ts | QA | Assesses production readiness of a program. |
| WEDMProgramComparisonEngine.ts | MP | Compares candidate programs. |
| WEDMProgramNeuralAnalysisEngine.ts | AI | Deep-reasoning analysis of programs (E-code logic, wire-break risk, recommendations). |
| WEDMProgramOptimizerEngine.ts | MP | Rewrites amateur programs to optimum using learned JM Die patterns + physics. |
| WEDMProgramSafetyGateEngine.ts | QA | Safety gate over emitted program. |
| WEDMProgramVerificationEngine.ts | QA | Structural verification of emitted program. |
| WEDMProgressTrackerEngine.ts | GOV | Tracks job/pipeline progress. |
| WEDMPrototypicalNetworkEngine.ts | AI | Prototypical-network few-shot classifier. |
| WEDMPulseLimitEngine.ts | DP | Enforces pulse-parameter safe limits. |
| WEDMQuoteBridgeEngine.ts | GOV | Bridges WEDM jobs to the quoting galaxy. |
| WEDMRaPredictorEngine.ts | QA | Predicts surface roughness Ra. |
| WEDMReasoningBridgeEngine.ts | AI | Bridge to the galaxy reasoning substrate. |
| WEDMReasoningExplainEngine.ts | AI | Produces explanations for reasoning outputs. |
| WEDMReasoningTraceLedgerEngine.ts | AI | Ledgers reasoning traces for audit. |
| WEDMRecastDepthPredictorEngine.ts | QA | Predicts recast-layer depth. |
| WEDMRecastLayerMLEngine.ts | QA | ML model for recast-layer prediction. |
| WEDMRecipeAdaptationEngine.ts | MP | Adapts parameter recipes to new conditions. |
| WEDMRewardShapingEngine.ts | AI | Reward shaping for RL control. |
| WEDMRLControllerEngine.ts | AI | Reinforcement-learning process controller. |
| WEDMRLPolicyPersistence.ts | AI | Persists RL policy state. |
| WEDMRolloutSimulatorEngine.ts | AI | Simulates rollouts for RL/what-if. |
| WEDMRULEngine.ts | WM | Remaining-useful-life estimation (wire/consumables). |
| WEDMSafetyEnvelopeEngine.ts | QA | Operating-envelope safety check. |
| WEDMSchedulingEngine.ts | GOV | Schedules WEDM jobs across machines. |
| WEDMSelfAwarenessEngine.ts | GOV | Galaxy self-awareness/capability introspection. |
| WEDMSequencingEngine.ts | P2P | Sequences cut operations. |
| WEDMSetupSheetEngine.ts | GOV | Generates operator setup sheets. |
| WEDMSlugTabRetentionEngine.ts | WM | Plans tab retention so slugs do not drop into the wire. |
| WEDMSparkErosionModelEngine.ts | DP | Core spark-erosion discharge model. |
| WEDMStartPointOptimizationEngine.ts | P2P | Optimizes cut start points. |
| WEDMStrategyLibraryEngine.ts | MP | 15 canonical cutting strategies with weighted-score selection. |
| WEDMTabStrategyEngine.ts | P2P | Tab placement/count/width strategy. |
| WEDMTaperErrorBudgetEngine.ts | WM | Taper-cut wire-deflection error budget + corrected angle. |
| WEDMThermalFieldEngine.ts | DP | Models the thermal field around the discharge. |
| WEDMThermalReleaseGateEngine.ts | QA | Thermal-release/stress gate. |
| WEDMThinWireDerateEngine.ts | WM | Derates params for thin/worn wire to avoid breakage. |
| WEDMTier6GeomGateEngine.ts | QA | Tier-6 geometry validation gate. |
| WEDMTradeoffElicitationEngine.ts | GOV | Elicits speed-vs-quality tradeoff preferences. |
| WEDMTransferLearningEngine.ts | AI | Transfer learning across materials/machines. |
| WEDMTribalRuntimeEngine.ts | AI | Runtime injection of tribal knowledge into decisions. |
| WEDMTribalTipLearnerEngine.ts | AI | Learns new tribal tips from outcomes. |
| WEDMUnitTagGateEngine.ts | QA | Enforces units-tag correctness (inch/mm) before emit. |
| WEDMVirtualMachineEngine.ts | GOV | Virtual-machine simulation of the WEDM controller. |
| WEDMWeibullWireLifeEngine.ts | WM | Weibull wire-life / break-probability model. |
| WEDMWhatIfSimulatorEngine.ts | AI | What-if scenario simulation. |
| WEDMWireBreakPredictorEngine.ts | WM | Predicts wire-break events. |
| WEDMWireBreakRiskCostEngine.ts | WM | Costs the risk of wire breakage. |
| WEDMWireDeflectionEngine.ts | WM | Computes wire deflection/bow under load. |
| WEDMWireHeatingEngine.ts | DP | Models resistive/discharge wire heating. |
| WEDMWirePathCollisionEngine.ts | WM | Detects wire-path collisions. |
| WEDMWirePremiumROIEngine.ts | GOV | ROI analysis for premium wire choices. |
| WEDMWireSpoolConsumptionEngine.ts | WM | Estimates wire-spool consumption. |
| WEDMWireStressAnalysisEngine.ts | WM | Analyzes wire mechanical stress. |
| WEDMWireTensionOptimizerEngine.ts | WM | Optimizes wire tension vs straightness vs break. |
| WEDMWireThreadingMinEngine.ts | WM | Minimizes auto-threading time/moves. |
| wedm/SmartWireSelectorEngine.ts | WM | Selects optimal wire type/diameter/coating (subdir; used by WEDMPrintToProgram). |
| wedm/WEDMPartClassifierEngine.ts | P2P | 2.5D/3D feature recognition for WEDM (subdir). |
| wedm/WEDMPrintToProgramEngine.ts | P2P | MIKE wizard core: 35-stage physics-first program generator (subdir). |
| wedm/WEDMProgramParserEngine.ts | P2P | Parses raw WEDM G-code into blocks/features (subdir). |
