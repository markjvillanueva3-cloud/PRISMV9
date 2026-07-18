---
name: quality-engines
description: Strategic engine digest for the quality galaxy -- Cpk/SPC gates, capability studies, gauge R&R/MSA, CMM/GD&T, FAI + inspection, and the ERP quality feed across mill/lathe/wedm+business.
type: reference
galaxy: quality
node_type: memory
---

# quality galaxy -- engine digest

## Overview

The quality galaxy is PRISM's Cpk/SPC/inspection GATE. It owns the offline capability
math and the measurement-conformance surface every cutting domain passes through:
Cp/Cpk/Cpm/Ppk process capability, SPC control charts (X-bar R, individuals/MR, EWMA,
Hotelling T2 multivariate, p-chart, Western Electric/Nelson pattern rules), gauge
R&R / MSA, CMM import + probe-path planning, GD&T tolerance stack-up, First Article
Inspection (AS9102/PPAP), inspection-plan generation, and the SPC/FAI -> ERP feed.

It runs TWO gate positions: (1) a PRE-cut Cpk gate at CAM strategy selection time
(`CpkPredictionGateEngine`, `strategy_cpk_gate`) that rejects candidate strategies below
Cpk 1.33 before a chip is cut -- a cross-galaxy edge into mill/lathe/wedm/cam; and (2)
the POST-cut measurement + capability study (`SPCProcessCapabilityEngine` +
`QualityFormulasEngine`) gating on a conservative Monte-Carlo lower bound, not the point
estimate (ISO 22514-1). Cpk co-evaluates with -- but NEVER softens -- the S(x) safety
gate (compliance-safety galaxy); both must pass unconditionally.

Boundaries (per `mcp-server/src/engines/quality/CLAUDE.md` sec 1): EXCLUDES real-time
shop-floor SPC streaming (-> shop-floor), live alarm management (-> compliance-safety),
G-code emission (-> post-processor/echo), and blueprint OCR (-> xray/blueprint-vision).
Tolerance-EXTRACTION / GD&T FCF parsing from raw drawings is upstream (blueprint-vision);
this galaxy consumes those tolerances as capability-study inputs.

**Dispatcher:** `prism_quality` (`mcp-server/src/tools/dispatchers/qualityDispatcher.ts`).
Key actions: `cpk_predict`, `spc_process_capability_analyze`, `quality_formulas_calculate`,
`spc_calculate`, `ewma_analyze`, `multivariate_spc_analyze`, `western_electric_rules_check`,
`gage_rr_msa_calculate`, `gauge_rr`, `measurement_analyze`, `cmm_plan`, `gdt_validate`,
`tolerance_stack`, `fai_run`, `fai_evaluate_characteristic`, `fai_generate_forms`,
`fai_disposition`, `finish_target_advise`, `hypermill_spc_bridge_run`, `hypermill_fai_bridge_run`,
`data_quality_validate`, `roundness_cylindricity_sampling_plan`, `change_point_detection_run`,
`iso13485_qms_validate`, `as9100_traceability_create`, `psn_synergy_inspect`.

Engines live FLAT in `mcp-server/src/engines/*.ts` (the `quality/` subdir is doctrine only).
**Count: 42 engines** owned by this galaxy (name-matched candidates were 90+ before
excluding machine-tool "capability", AI/model "capability", safety-envelope, GD&T
extraction, and surface-finish-physics false positives -- see the exclusions note below).

## Strategic categories

1. **cpk-capability** -- process-capability math + the pre-cut Cpk gate: `CpkPredictionGateEngine`,
   `SPCProcessCapabilityEngine`, `ProcessCapabilityPredictionEngine`, `QualityFormulasEngine`,
   `TurningCpkSurrogateEngine`, `CapabilityIndexEngine`, `CapabilityCensusEngine`,
   `CapabilityEffectivenessEngine`.
2. **spc-control-charts** -- charts + pattern rules: `SPCChartingEngine`, `NelsonSPCRulesEngine`,
   `MultivariateSPCEngine`, `EWMAEngine`, `SPCPreControlEngine`, `SPCFeedbackLoopEngine`,
   `WEDMOffsetSPCEngine`.
3. **metrology-MSA-gageRnR** -- measurement-system trust before any Cpk is believed:
   `MeasurementSystemAnalysisEngine`, `GageRRMSAEngine`, `MetrologyUncertaintyEngine`,
   `MetrologyBudgetEngine`.
4. **inspection-CMM-GDT** -- probe clouds -> form error -> stack-up: `CMMImportEngine`,
   `CMMHistoryEngine`, `CMMPathPlanningEngine`, `GDTStackupEngine`, `GDTCalloutParserEngine`,
   `PrismEnhancedGDTEngine`, `PrismGDTFCFParserEngine`, `ToleranceStackEngine`,
   `ToleranceStackUpEngine`, `LathePrintToleranceStackEngine`.
5. **first-article-inspection** -- AS9102/PPAP + inspection plans: `FirstArticleInspectionPipelineEngine`,
   `FAIAutoGenerationEngine`, `InspectionReportEngine`, `TurningInspectionPlanEngine`,
   `WetRunSampleInspectionPlanEngine`.
6. **conformance-gate / NC-CA** -- domain quality gates + nonconformance workflow:
   `LatheQualityGateEngine`, `EDMQualityOrchestratorEngine`, `SinkerEDMElectrodeInspectionEngine`,
   `NonConformanceAndCorrectiveActionEngine`, `WetRunNonConformanceEngine`, `LeanSixSigmaEngine`,
   `SpindleHarmonicsQualityEngine`.
7. **CAM-bridges** -- CAM operation -> measurement plan: `HyperMillSPCBridge`, `HyperMillFAIBridge`,
   `MastercamSPCBridge`, `MastercamFAIBridge`.
8. **scoring-feeds-ERP** -- roll-up scores + ERP quality integration + data integrity:
   `QualityManagementEngine`, `QualityDashboardEngine`, `QualityScoreEngine`,
   `QualityPredictionEngine`, `MachineQualityScoreEngine`, `ERPQualityEngine`, `DataQualityEngine`.

## Key engines (detailed)

### CpkPredictionGateEngine.ts
The pre-cut gate: point-estimates Cpk from process sigma vs tolerances and rejects candidate
CAM strategies below the acceptable floor before cutting. Home of the canonical thresholds --
`MIN_ACCEPTABLE_CPK = 1.33` and `IDEAL_CPK = 2.0` are exported here and MUST be imported, never
inlined. Path: `mcp-server/src/engines/CpkPredictionGateEngine.ts`. Notable exports:
`MIN_ACCEPTABLE_CPK`, `IDEAL_CPK`, `cpkPredictionGateEngine` singleton, `computeCpk`.

### SPCProcessCapabilityEngine.ts
The post-cut capability core: full Cp/Cpk/Cpm study with a Monte-Carlo conservative lower
bound propagating measurement uncertainty (ISO 22514-1) -- gate on the bound, not the point
estimate. Also owns the subgroup-size-dependent control-chart constants as computed methods
(`getA2/getD3/getD4(subgroupSize)`), NOT a flat file. Path:
`mcp-server/src/engines/SPCProcessCapabilityEngine.ts`. Notable exports:
`spcProcessCapabilityEngine` singleton, `getA2/getD3/getD4`.

### QualityFormulasEngine.ts
The quality-engineering formula library: Cp/Cpk, Cpm (Taguchi), non-normal Cpk via Clements,
confidence intervals for Cpk, gage R&R, and acceptance sampling plans. The math surface behind
`quality_formulas_calculate`. Path: `mcp-server/src/engines/QualityFormulasEngine.ts`. Notable
exports: `qualityFormulasEngine` singleton, `QualityFormulasEngine` class.

### NelsonSPCRulesEngine.ts
Western Electric / Nelson 8-rule pattern detection over control-chart data (zone tests, trends,
runs, stratification). Feeds `western_electric_rules_check` and the closed-loop SPC feedback.
Path: `mcp-server/src/engines/NelsonSPCRulesEngine.ts`. Notable exports: `nelsonSPCRulesEngine`
singleton (backed by `NelsonSPCRulesEngineImpl`).

### MultivariateSPCEngine.ts
Hotelling T2 and MEWMA multivariate control charts for correlated characteristics (a single
univariate chart per feature misses joint drift). Powers `multivariate_spc_analyze`. Path:
`mcp-server/src/engines/MultivariateSPCEngine.ts`. Notable exports: `MvSpcConfigSchema`,
`multivariateSPCEngine`, `MultivariateSPCEngine` class.

### MeasurementSystemAnalysisEngine.ts
Gage R&R via crossed-design ANOVA -- the %R&R > 30% guard that must run BEFORE trusting any Cpk
(an unresolved measurement system makes the Cpk number noise). Powers `measurement_analyze` /
`gage_rr_msa_calculate`. Path: `mcp-server/src/engines/MeasurementSystemAnalysisEngine.ts`.
Notable exports: `MsaStudySchema`, `MeasurementSystemAnalysisEngine` class, `measurementSystemAnalysisEngine`.

### GDTStackupEngine.ts
1D linear GD&T tolerance stack-up by worst-case (arithmetic) and RSS (statistical) methods --
the terminal stage of the CMM -> RANSAC-fit -> stack-up workflow. Powers `tolerance_stack` /
`gdt_validate`. Path: `mcp-server/src/engines/GDTStackupEngine.ts`. Notable exports:
`gdtStackupEngine` singleton, `GDTStackupEngine` class.

### CMMImportEngine.ts
Multi-format CMM data import (DMIS, QIF, Zeiss Calypso, Hexagon PC-DMIS, Mitutoyo MCOSMOS, CSV,
custom) into structured measurement points -- the front door of the metrology pipeline. Never
pipe its raw probe cloud straight to GD&T stack-up; run `prism_algorithm:spatial_ransac_fit`
first for outlier-robust form error. Path: `mcp-server/src/engines/CMMImportEngine.ts`. Notable
exports: `CMMFormatSchema`, `MeasurementPointSchema`, `CMMImportResultSchema`, `cmmImportEngine`.

### FirstArticleInspectionPipelineEngine.ts
The FAI pipeline orchestrator: `fai_run -> fai_evaluate_characteristic -> fai_generate_forms ->
fai_disposition`, gating recurring SPC and driving `ERPQualityEngine` customer/job records.
Path: `mcp-server/src/engines/FirstArticleInspectionPipelineEngine.ts`. Notable exports:
`FirstArticleInspectionPipelineEngine` class, `firstArticleInspectionPipelineEngine` singleton.

### ERPQualityEngine.ts
The downstream feed: ingests SPC/FAI results into customer + job quality records and drives the
quoting risk signal (quality -> business/ERP PSN edge). Path:
`mcp-server/src/engines/ERPQualityEngine.ts`. Notable exports: `InspectionResultSchema`,
`NCRSchema`, `QualityMetricsSchema`, `ERPQualityEngine` class, `erpQualityEngine` singleton.

### WEDMOffsetSPCEngine.ts
Domain-specific SPC for wire-EDM effective wire-offset (kerf) drift -- the wedm edge of the
galaxy. Monitors a series of measured offsets for statistical drift. Path:
`mcp-server/src/engines/WEDMOffsetSPCEngine.ts`.

### MetrologyUncertaintyEngine.ts
GUM-compliant (Guide to the Expression of Uncertainty in Measurement) measurement-uncertainty
analysis. Complements MSA: MSA characterizes the gauge, this quantifies the reported
uncertainty budget. Path: `mcp-server/src/engines/MetrologyUncertaintyEngine.ts`.

### NonConformanceAndCorrectiveActionEngine.ts
ISO 9001:2015 sec 10.2 NC/CA workflow (react-correct-deal-with-consequences + corrective action).
The conformance-failure side of the gate. Path:
`mcp-server/src/engines/NonConformanceAndCorrectiveActionEngine.ts`.

### LatheQualityGateEngine.ts
Turning-program quality validation gate (pairs with `TurningInspectionPlanEngine` and
`TurningCpkSurrogateEngine`) -- the lathe edge consuming pre-cut surface-finish/Cpk. Path:
`mcp-server/src/engines/LatheQualityGateEngine.ts`.

## Full engine index

Header-verified unless marked "(name-derived)". Name-derived = in CLAUDE.md sec 2 verified table
(git ls-files 2026-06-13) but its header line fell outside the sampled grep window this pass.

| Engine | Category | One-line |
|--------|----------|----------|
| CpkPredictionGateEngine.ts | cpk-capability | Pre-cut Cpk gate; owns MIN_ACCEPTABLE_CPK 1.33 / IDEAL_CPK 2.0 |
| SPCProcessCapabilityEngine.ts | cpk-capability | Full Cp/Cpk/Cpm study + MC lower bound + A2/D3/D4 methods |
| ProcessCapabilityPredictionEngine.ts | cpk-capability | Pre-production Cp/Cpk from machining params (error stacking + MC) |
| QualityFormulasEngine.ts | cpk-capability | Cp/Cpk/Cpm/Clements/CI/gage R&R/sampling formula library |
| TurningCpkSurrogateEngine.ts | cpk-capability | ML surrogate for turning Cpk prediction |
| CapabilityIndexEngine.ts | cpk-capability | Live dispatcher-introspection capability index (no hardcoded lists) |
| CapabilityCensusEngine.ts | cpk-capability | Capability census roll-up (MXU-MS0) |
| CapabilityEffectivenessEngine.ts | cpk-capability | Capability effectiveness scoring (MXU-MS9/10) |
| SPCChartingEngine.ts | spc-control-charts | Advanced SPC charting methods (X-bar R / I-MR / p-chart) |
| NelsonSPCRulesEngine.ts | spc-control-charts | Western Electric / Nelson 8-rule pattern detection |
| MultivariateSPCEngine.ts | spc-control-charts | Hotelling T2 + MEWMA multivariate control charts |
| EWMAEngine.ts | spc-control-charts | Exponentially Weighted Moving Average chart (Roberts 1959) |
| SPCPreControlEngine.ts | spc-control-charts | Live Cp/Cpk/Pp/Ppk + pre-control verdict |
| SPCFeedbackLoopEngine.ts | spc-control-charts | Closed-loop SPC -> parameter adjustment (CMM in, Cpk/Nelson) |
| WEDMOffsetSPCEngine.ts | spc-control-charts | SPC for wire-EDM wire-offset (kerf) drift |
| MeasurementSystemAnalysisEngine.ts | metrology-MSA-gageRnR | Gage R&R via crossed-design ANOVA |
| GageRRMSAEngine.ts | metrology-MSA-gageRnR | Gage R&R / MSA study engine |
| MetrologyUncertaintyEngine.ts | metrology-MSA-gageRnR | GUM-compliant measurement-uncertainty analysis |
| MetrologyBudgetEngine.ts | metrology-MSA-gageRnR | 9 metrology formulas; expanded uncertainty + thermal comp |
| CMMImportEngine.ts | inspection-CMM-GDT | Multi-format CMM import (DMIS/QIF/Calypso/PC-DMIS/MCOSMOS/CSV) |
| CMMHistoryEngine.ts | inspection-CMM-GDT | CMM measurement history store |
| CMMPathPlanningEngine.ts | inspection-CMM-GDT | CMM probe-path generation (name-derived) |
| GDTStackupEngine.ts | inspection-CMM-GDT | 1D GD&T stack-up (worst-case + RSS) |
| GDTCalloutParserEngine.ts | inspection-CMM-GDT | Parses ASME Y14.5 / ISO 1101 FCF callouts to structured data |
| PrismEnhancedGDTEngine.ts | inspection-CMM-GDT | Enhanced GD&T (rescued from monolith extraction) |
| PrismGDTFCFParserEngine.ts | inspection-CMM-GDT | GD&T feature-control-frame parser (monolith rescue) |
| ToleranceStackEngine.ts | inspection-CMM-GDT | Tolerance stack-up (worst-case + RSS), critical contributors |
| ToleranceStackUpEngine.ts | inspection-CMM-GDT | Linear tolerance stack-up calculator (worst-case + RSS) |
| LathePrintToleranceStackEngine.ts | inspection-CMM-GDT | Propagates GD&T through feature->operation chain (lathe) |
| FirstArticleInspectionPipelineEngine.ts | first-article-inspection | FAI pipeline: run->evaluate->generate-forms->disposition |
| FAIAutoGenerationEngine.ts | first-article-inspection | AS9102 FAI Form 1/2/3 auto-generator |
| InspectionReportEngine.ts | first-article-inspection | QC report stack (FAI/in-process/final/incoming, ISO 9001 sec 8.6) |
| TurningInspectionPlanEngine.ts | first-article-inspection | Turning inspection-plan generation |
| WetRunSampleInspectionPlanEngine.ts | first-article-inspection | Sample inspection plan for wet-run pilots |
| LatheQualityGateEngine.ts | conformance-gate | PhD-level lathe-program quality validation gate |
| EDMQualityOrchestratorEngine.ts | conformance-gate | WEDM quality orchestrator (P2P capstone) |
| SinkerEDMElectrodeInspectionEngine.ts | conformance-gate | Sinker-EDM electrode/cavity inspection |
| NonConformanceAndCorrectiveActionEngine.ts | conformance-gate | ISO 9001:2015 sec 10.2 NC/CA workflow |
| WetRunNonConformanceEngine.ts | conformance-gate | NCR tracking for wet-run pilots |
| LeanSixSigmaEngine.ts | conformance-gate | Lean Six Sigma quality methods |
| SpindleHarmonicsQualityEngine.ts | conformance-gate | Spindle speed -> harmonic -> cut-quality mapping |
| HyperMillSPCBridge.ts | CAM-bridges | hyperMILL operations -> SPC measurement plan |
| HyperMillFAIBridge.ts | CAM-bridges | hyperMILL operations -> AS9102 FAI plan |
| MastercamSPCBridge.ts | CAM-bridges | Mastercam SPC integration |
| MastercamFAIBridge.ts | CAM-bridges | Mastercam FAI integration |
| QualityManagementEngine.ts | scoring-feeds-ERP | SPC + calibration tracking + material-cert traceability; FAI cascade |
| QualityDashboardEngine.ts | scoring-feeds-ERP | Continuous quality dashboard (AUTO-7) |
| QualityScoreEngine.ts | scoring-feeds-ERP | Development quality scorer (AUTO-0) |
| QualityPredictionEngine.ts | scoring-feeds-ERP | Manufacturing-intelligence quality prediction |
| MachineQualityScoreEngine.ts | scoring-feeds-ERP | Composite 0-100 machine-quality score |
| ERPQualityEngine.ts | scoring-feeds-ERP | SPC/FAI -> customer/job records + quoting risk signal |
| DataQualityEngine.ts | scoring-feeds-ERP | Contract-based feature-row data-integrity validator |

## Exclusions note (name-matched but NOT this galaxy)

The `*Capability*` and `*SPC*` name regex over-matches. Excluded as owned elsewhere:
- **Machine-tool / CAM capability** (mill / cam / cad, not Cpk): `MachineCapabilityIndexEngine`,
  `MachineCapabilityIntelligenceEngine`, `MachineCapabilitySurfaceEngine`, `CapabilityPathEngine`,
  `ForceCapabilityEngine`, `PostProcessorCapabilityMatrixEngine`, `PPAGICapabilityMatrixEngine`,
  `CADCapabilityNegotiatorEngine`, `DrawingCapabilityTargetEngine`, `SupplierCapabilityProfileEngine`,
  `AMSAAReliabilityGrowthEngine`.
- **AI/model "capability"** (ai-training / hermes-zulu): `AICapabilityMaximizerEngine`,
  `OllamaCapabilityProbeEngine`, `OpusCapabilityEngine`, `ZuluCapabilityAttestationEngine`,
  `ZuluCapabilityRegistryEngine`.
- **Safety-envelope / failure-triage** (compliance-safety / bug-hunting): `WEDMFailsafeEngine`,
  `WEDMProgramSafetyGateEngine`, `WEDMSafetyEnvelopeEngine`, `BatchCAMSafetyEngines`,
  `MastercamSafetyHooksEngine`, `SolidCAMSafetyHooksEngine`, `CADFailureTriageEngine`,
  `FailureForensicsEngine`, `FailureModeAnticipationEngine`, `PredictiveFailureEngine`,
  `ChainFailureRecoveryEngine`, `GateFailureHistoryEngine`.
- **Surface-finish physics** (speed-feed / surface): `SurfaceFinishEngine`, `SurfaceFinishPredictorEngine`,
  `StochasticSurfaceFinishEngine`, `SurfaceFinishCnnEngine`, `SurfaceFinishDatabaseEngine`,
  `MonolithSurfaceFinishDatabaseEngine`, `GrindingSurfaceFinishEngine`, `SFCFewShotNewMaterialEngine`.
- **Cross-cutting / other**: `TestQualityAuditEngine` (software test quality, not manufacturing),
  `FairMarketValueEngine` (business), `ConcentrationInequalityEngine` (statistics primitive),
  `PSNSynergyInspectorEngine` (system-viz), `MachineCapabilityIntelligenceEngine`.

_Source of truth: `mcp-server/src/engines/quality/CLAUDE.md` sec 2 (verified engines) + sec 3 (dispatcher)
+ MEMORY.md "Key engines & paths"; reconciled against on-disk `ls mcp-server/src/engines/*.ts`
headers this pass. Constants (1.33 / 2.0) and A2/D3/D4 are IMPORT-only -- never inline (R12)._
