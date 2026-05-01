# PRISM Pipeline Stage → Engine Wiring Matrix
## Every pipeline stage, every engine that should fire, every algorithm that should run

This matrix defines EXACTLY which engines and algorithms fire at each stage of the
print-to-CNC-program pipeline. Every pipeline (milling, turning, 5-axis, mill-turn,
grinding, wire EDM, sinker EDM, laser, waterjet) follows these stages.

---

## STAGE 1: INTAKE — Print/CAD Reading (15 engines)

**Purpose**: Accept engineering drawing or CAD model, extract all dimensions, tolerances, GD&T, features.

| Engine | What It Does | When to Call |
|---|---|---|
| BlueprintOCREngine | Extract dimensions from scanned drawing text | Input is text/image |
| PDFBlueprintDimensionExtractorEngine | Extract from PDF | Input is PDF |
| PrintReadingEngine | Orchestrate: OCR → feature recognition → tolerance validation | Always (orchestrator) |
| StepImportEngine | Import STEP AP203/AP214 | Input is STEP file |
| IGESImportEngine | Import IGES 5.3 | Input is IGES file |
| DXFParserEngine | Parse DXF/SVG to 2D boundaries | Input is DXF/SVG |
| PrintToGeometryEngine | Convert dims to CadQuery 3D model | After OCR, if no CAD model |
| CADKernelEngine | Core CAD operations | When building 3D model |
| FeatureRecognitionEngine | Identify 21 feature types from geometry | After geometry available |
| FeatureToZoneEngine | Decompose features into machining zones | After feature recognition |
| DimensionalAnalysisEngine | Validate dimensions | After extraction |
| ToleranceEngine + ToleranceStackEngine | Tolerance analysis + stack-up | After extraction |
| GDTStackupEngine | GD&T stack-up analysis | If GD&T present |
| CADDrawingKnowledgeEngine | Drawing interpretation intelligence | For complex drawings |
| AutoPrintToProgramBridgeEngine | Route: file→parse→classify→pipeline | Orchestrator entry point |

**Algorithms at this stage**: InterpolationEngine (for curve fitting from points)

**Registry**: None directly, but MaterialRegistry for material name resolution

**TEST**: Every dimension extracted matches known drawing values ±0.1mm

---

## STAGE 2: DFM & FEASIBILITY (8 engines)

| Engine | What It Does | When to Call |
|---|---|---|
| DfMRulesEngine | Manufacturability rules (wall thickness, pocket depth, etc.) | Always — GATE |
| DFMFeedbackEngine | Score features 0-100 for manufacturability | Always — GATE |
| FeasibilityAnalysisEngine | Accessibility + workholding + rigidity | Always |
| FeasibilityOrchestratorEngine | Chain all feasibility checks | Always (orchestrator) |
| SequenceFeasibilityEngine | Dead-end detection, auto-resequencing | Multi-op parts |
| MultiSetupFeasibilityChainEngine | Datum chain Monte Carlo, branch-and-bound | Multi-setup parts |
| AccessibilityAnalysisEngine | Tool reach validation | Always |
| WorkholdingSurfaceInferenceEngine (E1085) | Auto-detect grip/datum surfaces, track survival | Always |

**Algorithms**: CSPSetupPlan (constraint satisfaction for setup planning)

**TEST**: Non-manufacturable features flagged. Dead-ends detected. GATE: blocks program gen if infeasible.

---

## STAGE 3: MATERIAL RESOLUTION (13 engines)

| Engine | What It Does | When to Call |
|---|---|---|
| MaterialSelectionEngine | Material selection + property lookup | Always |
| HyperMillMaterialBridgeEngine | 2,544 materials with machinability corrections | When alloy-specific data needed |
| HyperMillMaterialMapEngine | Material taxonomy mapping | For hyperMILL material groups |
| SuperalloyMachiningEngine | Inconel/Hastelloy specific physics | ISO S superalloys |
| CeramicsMachiningEngine | Ceramic material processing | Ceramic workpieces |
| MagnesiumMachiningEngine | Fire risk, special coolant | Magnesium alloys |
| CompositesMachiningPhysicsEngine | CFRP, fiberglass delamination | Composite materials |
| MarketMaterialPricingEngine | Current material pricing | For cost estimation |
| StockSizeOptimizerEngine | Optimal raw stock selection | Always |
| StockAllowanceEngine | Allowances for secondary ops | When secondary ops needed |
| StockModelEngine | Track stock shape through operations | Multi-op parts |
| VoxelStockEngine + VoxelStockIntegrationEngine | Voxel-based stock representation | Complex stock tracking |

**Registry**: MaterialRegistry (1,662L) — PRIMARY source for material properties
**Algorithm**: None directly

**TEST**: Material properties match published data ±5%. ISO group correct. Exotic materials get special handling.

---

## STAGE 4: MACHINE SELECTION (56 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| MachineSelectionEngine | Select best machine from shop | Always |
| MachineMatcherEngine | Match features to machine capabilities | Always |
| MachineStrategyConstraintEngine (E1091) | Validate machine can execute strategy | After strategy selection |
| ControllerStrategyValidatorEngine (E1090) | Validate controller supports strategy | After strategy selection |
| ControllerDialectEngine | Controller syntax knowledge (20 dialects) | For G-code generation |
| ControllerFeatureMatrixEngine | Controller capability matrix | For feature validation |
| MachineRateDatabaseEngine | Machine hourly rates | For cost estimation |
| SpindleTorqueCurveEngine | Spindle power/torque curves | For power validation |
| CapacityPlanningEngine | Machine availability | For scheduling |
| OEECalculatorEngine | Machine utilization | For efficiency tracking |
| ROIAdvisorEngine | Equipment purchase ROI | When capability gap exists |
| MakeVsBuyDecisionEngine (E1083) | Outsource vs in-house per operation | When capability gap exists |
| ShopNetworkEngine (E1134) | External shop capability matching | For outsourcing |

**Registry**: MachineRegistry — machine profiles database
**Algorithm**: ILPAssignment (integer linear programming for machine assignment)

**TEST**: Best machine selected with reasoning. Outsource when no capability. ROI for purchase.

---

## STAGE 5: WORKHOLDING (20 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| WorkholdingEngine | Core workholding intelligence | Always |
| WorkholdingIntelligenceEngine | Advanced workholding analysis | Complex parts |
| WorkholdingViabilityEngine | Clamping force vs cutting force validation | Always — GATE |
| WorkholdingVerificationEngine (E1148) | Coulomb friction grip force check | Always — GATE |
| WorkholdingForceEngine | Force calculations | Always |
| ChuckJawForceEngine | Lathe chuck grip force + centrifugal loss | Turning |
| TailstockForceEngine | Tailstock support force | Turning L/D > 4 |
| SteadyRestPlacementEngine | Steady rest positioning | Turning L/D > 8 |
| FixtureDesignEngine | Fixture design | Custom fixtures |
| ModularFixtureLayoutEngine | Modular fixture layout | Modular systems |
| TombstoneLayoutEngine | Tombstone face assignment | Multi-face HMC |
| FixtureClampingEngine | Clamping force analysis | Always |
| MultiSetupPlannerEngine | Multi-setup orientation + fixturing | Multi-setup parts |

**TEST**: Grip force > cutting force × SF. Centrifugal loss computed for turning RPM.

---

## STAGE 6: TOOL SELECTION (56 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| SmartToolSelectorEngine | 7-factor physics-scored from 95K catalog | Always (primary) |
| InventoryAwareToolSelectorEngine | Check user crib FIRST | When user has crib |
| ToolCatalogEngine | 95,608 tool catalog | Data source |
| ToolROIEngine (E1081) | 3 price points with ROI calculation | Always |
| ToolCostPerPartEngine | Tool amortization | Cost estimation |
| InsertGradeSelectionEngine | ISO insert grade optimization | Turning |
| ToolCoatingSelectionEngine + CoatingSelectionEngine (E1082) | Coating by ISO group | Always |
| ToolGeometrySelectionEngine | Tool geometry optimization | When multiple geometries valid |
| ToolHolderDatabaseEngine | 1,332 holders | Holder selection |
| ToolMagazineOptimizationEngine | Magazine/turret layout (TSP) | After tool list finalized |
| ToolChangeOptimizationEngine (E1137) | Minimize tool changes | Multi-tool jobs |
| ToolAssemblyEngine + ToolAssemblyModelEngine | Tool assembly modeling | For collision/deflection |
| ToolSubstitutionRiskEngine | Risk when substituting tools | When crib tool != catalog best |
| BoringBarDeflectionEngine | Boring bar specific deflection | Boring operations |
| ToolInventoryOrchestratorEngine | "Can this job run with what I have?" | Job start check |

**Registry**: ToolRegistry (1,398L), CoatingRegistry
**Algorithm**: AntColonyTSP (for magazine/turret optimization)

**TEST**: Tool from catalog (real part number). 3 price points shown. ROI calculated. Magazine optimized.

---

## STAGE 7: STRATEGY SELECTION (32 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| OptimalStrategySelectionEngine (E1087) | Unified physics-scored strategy selector | Always (primary) |
| FeatureStrategyKnowledgeBaseEngine (E1112) | 203 feature→strategy rules | Always (input to E1087) |
| CrossCamRecommenderEngine | Cross-CAM strategy ranking | Always |
| AdaptiveToolpathRouterEngine | 35 algorithm router | After strategy selected |
| AlgorithmSelectorEngine | Per-zone algorithm selection | Complex features |
| StrategyTaxonomyEngine (E1084) | Canonical strategy names | Normalization |
| StrategyBenchmarkEngine (E1096) | MC comparison of strategies | When comparing |
| StrategyComparisonEngine (E1099) | Radar chart + explanation | User-facing comparison |
| StrategySequencingEngine (E1097) | Multi-op strategy sequences | Multi-operation features |
| BatchSizeStrategyEngine (E1100) | Prototype vs production | Batch-aware selection |
| FixtureAwareStrategyEngine (E1101) | Workholding-constrained | Always |
| ContextualStrategyOverrideEngine (E1111) | Hard overrides (thin wall, deep bore) | Edge cases |
| MachineLearningStrategyRankerEngine (E1107) | Bayesian learned ranking | When history available |
| SelfLearningCAMEngine | Proven recipe lookup | When similar part made before |
| MachiningPlaybookEngine | 296 rules + anti-patterns | Always |
| TribalKnowledgeDecisionBridge (NEW) | 3,831 tips + 296 rules queried | Always |

**Registry**: ToolpathStrategyRegistry (752 strategies), AlgorithmRegistry
**Algorithm**: GeneticOptimizer, ParticleSwarm (for parameter space search)

**TEST**: ≥3 strategies evaluated with physics. Playbook checked. Tribal tips consulted. Proven recipe used if available.

---

## STAGE 8: S/F COMPUTATION (15+ engines)

| Engine | What It Does | When to Call |
|---|---|---|
| UltimateSpeedFeedEngine | Comprehensive baseline S/F | Always (per tool) |
| SpeedFeedOrchestratorEngine | 67-point integration hub | Always (orchestrator) |
| AutoSpeedFeedEngine | Per-block S/F on raw G-code | Post-processing |
| EngagementAdaptiveFeedEngine | Constant chip load mode | Adaptive strategies |
| AdvancedChipThicknessEngine | Trochoidal variable feed | Trochoidal paths |
| ChipLoadEngine | Chip load optimization | Always |
| StepoverOptimizationEngine | Curvature-adaptive stepover | Finishing passes |
| InstantaneousEngagementEngine | Per-block ae/ap/theta | Post-processing |
| StabilityRPMRewriterEngine | Chatter-free RPM | After RPM computed |
| PredictionCalibrationEngine (E1147) | Calibrated kc1.1/Taylor | When calibration data available |

**Registry**: FormulaRegistry (1,109L) — formula lookup + provenance
**Algorithm**: KienzleForceModel, ExtendedTaylorModel, DPMultiPass (for pass depth optimization), CWEZBuffer (for complex engagement)

**TEST**: S/F within ±15% of manufacturer published data. Per-block F variation. Chatter-free RPM.

---

## STAGE 9: PHYSICS VALIDATION (77 engines — key ones listed)

| Engine | What It Does | When to Call |
|---|---|---|
| KienzleForceModelEngine | Cutting force | Every cutting operation |
| TurningForceEngine | Turning-specific force | Turning operations |
| GrindingForceEngine | Grinding specific energy | Grinding operations |
| CuttingMechanicsEngine | Merchant analysis | Validation |
| AdvancedCuttingPhysicsEngine | Oxley predictive model | Deep analysis |
| ToolDeflectionPredictionEngine | Tool bending prediction | Every finish pass |
| SurfaceFinishPredictorEngine | Real Ra (runout+vibration+deflection) | Every finish pass |
| SurfaceIntegrityPredictorEngine | White layer, residual stress | Hard turning |
| ChatterStabilityLobeEngine | Stability lobe diagram | Every RPM selection |
| StochasticChatterEngine | MC stability (200 samples) | Uncertainty on chatter |
| ToolpathThermalEngine | Thermal field along toolpath | Long programs |
| InverseThermalCompensationEngine | Machine thermal growth | Programs > 30min |
| StochasticToolLifeEngine | Weibull tool life distribution | Every tool |
| ToolBreakagePredictionEngine (E1149) | P(breakage) per operation | Safety gate |
| ProcessCapabilityPredictionEngine | Cpk prediction (500 MC) | Critical tolerances |
| QualityPredictionEngine | Quality metrics prediction | Every part |

**Algorithms**: StabilityLobeDiagram, FRFStabilityLobe, RCSA, JaegerTempField, JohnsonCookModel, UsuiWearModel, SurfaceFinishPredictor, ToolDeflectionModel, FFTAnalyzer, MonteCarlo, ThermalFEAModel, ThermalPartitionModel, BayesianWearModel, WaveletBreakage, ChipBreakingModel, ChipEvacuationModel, SpindleVibFFTModel, STFTChatter

**TEST**: Force within ±10% of analytical. Deflection < tolerance/3. P(chatter) < 15%. Cpk ≥ 1.33.

---

## STAGE 10: COLLISION CHECK — GATE (19 engines)

| Engine | What It Does | When to Call |
|---|---|---|
| CollisionPreventionEngine (E1139) | Full toolpath pre-flight | Always — GATE |
| SafetyVetoEngine (E1098) | 8 hard vetoes | Always — GATE |
| PipelineSafetyOrchestratorEngine (E1093) | 6 risk dimensions | Always — GATE |
| WorkholdingVerificationEngine (E1148) | Grip force check | Always |
| ToolBreakagePredictionEngine (E1149) | P(breakage) | Always |
| SafetyEscalationEngine (E1138) | Auto-reduce when tight | When near limits |
| GCodeSafetyAnalyzerEngine | 24 rules × 6 controllers | On generated G-code |

**Algorithm**: SweptVolumeCollision, MinkowskiSum (for envelope check)

**TEST**: ZERO programs output with collisions. 20 deliberately unsafe scenarios ALL blocked.

---

## STAGE 11: POST-PROCESSING — 35 stages (32 engines)

The full POST-ULT pipeline (17 engines) plus legacy post engines:

| Engine | What It Does | Phase |
|---|---|---|
| PostPhysicsFoundationEngine | Context resolution + physics baseline | P0 |
| LineByLineAdaptiveEngine | Per-block S/F (10 modules) | P2 |
| MotionControllerInjectionEngine | HSM/TCP/SSV injection | P3 |
| PostVerificationSafetyEngine | MC verification + safety | P4-5 |
| PostOutputGenerationEngine | Controller-specific output | P6 |
| PostValidationSuiteEngine | 360-case regression | P7 |
| ControllerDialectEngine | 20 controller dialects | Output |
| WorkCoordinateEngine | WCS assignment G54-G59 | Program structure |
| ProgramStructureEngine | Subprograms, safety blocks | Program structure |
| BackplotEngine | Verification backplot | Verification |
| GCodeTranspilerEngine | Dialect transpilation | If needed |
| SubprogramEngine | M98/CALL management | Large programs |

**TEST**: Per-block F variation. HSM activated. Controller-specific syntax. Program structure complete.

---

## STAGE 12-15: PROBING, COST, DOCUMENTATION, LEARNING

[Each stage has its engines as listed in reference_system_capabilities.md]

---

## HOW TO USE THIS MATRIX

During roadmap execution, for EACH pipeline being built/enhanced:
1. Go through each stage (1-15)
2. Check: is each listed engine WIRED into this pipeline?
3. If NO → add lazy-load + call at the appropriate point
4. If YES → verify it's called at the RIGHT point and the output is USED

This matrix is the VERIFICATION CHECKLIST for roadmap completeness.
