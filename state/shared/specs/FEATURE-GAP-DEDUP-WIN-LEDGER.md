# FEATURE-GAP-AUDIT-MS0 — Dedup-Win Reconciler Ledger

Generated: 2026-05-19T04:53:59.734Z
Advisory only — must human-verify before flipping unit status.

## Summary (68 units)

- **DEDUP-WIN**: 8
- **PARTIAL-NO-TESTS**: 9
- **PARTIAL-PORT-ONLY**: 1
- **GENUINE-GAP**: 13
- **BATCH-WIRE**: 8
- **UNKNOWN**: 29

## Per-domain breakdown

### academy (8)
- BATCH-WIRE: 1
- GENUINE-GAP: 2
- UNKNOWN: 5

### cad (9)
- DEDUP-WIN: 3
- GENUINE-GAP: 3
- PARTIAL-NO-TESTS: 2
- UNKNOWN: 1

### cam (7)
- BATCH-WIRE: 1
- DEDUP-WIN: 1
- GENUINE-GAP: 2
- PARTIAL-NO-TESTS: 2
- UNKNOWN: 1

### database (7)
- BATCH-WIRE: 1
- UNKNOWN: 6

### erp (9)
- DEDUP-WIN: 1
- GENUINE-GAP: 3
- PARTIAL-NO-TESTS: 2
- UNKNOWN: 3

### lathe (3)
- BATCH-WIRE: 1
- DEDUP-WIN: 1
- PARTIAL-NO-TESTS: 1

### mill (2)
- BATCH-WIRE: 1
- GENUINE-GAP: 1

### misc (7)
- GENUINE-GAP: 1
- PARTIAL-NO-TESTS: 1
- PARTIAL-PORT-ONLY: 1
- UNKNOWN: 4

### post (4)
- BATCH-WIRE: 1
- DEDUP-WIN: 2
- UNKNOWN: 1

### print2prog (3)
- UNKNOWN: 3

### speedfeed (3)
- GENUINE-GAP: 1
- UNKNOWN: 2

### tribal (4)
- BATCH-WIRE: 1
- PARTIAL-NO-TESTS: 1
- UNKNOWN: 2

### wire (2)
- BATCH-WIRE: 1
- UNKNOWN: 1

## DEDUP-WIN — close these out (status: completed)

- **U-GAP-LATHE-NOSE-RADIUS-COMP** — engine ToolNoseRadiusCompensationEngine.ts exists, 1 dispatcher ref(s), 1 test file(s)
- **U-GAP-CAD-GEODESIC** — engine GeodesicDistanceEngine.ts exists, 1 dispatcher ref(s), 1 test file(s)
- **U-GAP-CAD-MESH-DECIMATION** — engine MeshDecimationEngine.ts exists, 1 dispatcher ref(s), 1 test file(s)
- **U-GAP-CAD-SURFACE-RECON** — engine SurfaceReconstructionEngine.ts exists, 1 dispatcher ref(s), 1 test file(s)
- **U-GAP-CAM-REST-VOXEL** — engine RestMachiningEngine.ts exists, 2 dispatcher ref(s), 1 test file(s)
- **U-GAP-ERP-JOBSHOP-SCHEDULING** — engine JobShopSchedulingEngine.ts exists, 2 dispatcher ref(s), 1 test file(s)
- **U-GAP-POST-RL-POSTPROCESSOR** — engine RLPostProcessorEngine.ts exists, 2 dispatcher ref(s), 1 test file(s)
- **U-GAP-POST-GCODE-BACKPLOT** — engine BackplotEngine.ts exists, 1 dispatcher ref(s), 3 test file(s)

## PARTIAL — real gap is named below (rescope the unit)

- **U-GAP-LATHE-LIVE-TOOLING** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-CAD-VORONOI-ISOSURFACE** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-CAD-CURVATURE-OFFSET** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-CAM-ADAPTIVE-CLEARING** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-CAM-MULTIAXIS-TOOLPATH** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-TRIBAL-KNOWLEDGE-GRAPH** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-ERP-QUOTING-JOBCOST** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-ERP-FINANCIAL-ANALYTICS** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-MISC-OPTIMIZERS** [PARTIAL-NO-TESTS] — engine + wiring present, NO test coverage — real gap is tests
- **U-GAP-MISC-AI-ENGINES** [PARTIAL-PORT-ONLY] — engine TransformerEngine.ts on disk, but neither wired nor tested

## GENUINE-GAP — engine not on disk, port is real work

- **U-GAP-MILL-FFT-CHATTER** — no engine class matched candidates: FftPredictiveChatterEngine, FFTPredictiveChatterEngine, PredictiveChatterEngine, ChatterEngine
- **U-GAP-CAD-SPECTRAL-GRAPH** — no engine class matched candidates: SpectralGraphCadEngine, GraphCadEngine, GRAPHCadEngine, GRAphCadEngine, CadEngine, CADEngine
- **U-GAP-CAD-BREP-TESSELLATOR** — no engine class matched candidates: BrepTessellatorEngine, BREPTessellatorEngine, BREpTessellatorEngine, TessellatorEngine
- **U-GAP-CAD-COMPLETE-GEN** — no engine class matched candidates: CompleteCadGenerationEngine, CadGenerationEngine, CADGenerationEngine, GenerationEngine
- **U-GAP-CAM-CLIPPER2** — no engine class matched candidates: Clipper2Engine
- **U-GAP-CAM-AIRCUT-ELIM** — no engine class matched candidates: AircutEliminationEngine, EliminationEngine
- **U-GAP-ERP-SUBSCRIPTION-SYSTEM** — no engine class matched candidates: SubscriptionSystemEngine, SystemEngine
- **U-GAP-ERP-LEAN-SIXSIGMA** — no engine class matched candidates: LeanSixSigmaKaizenEngine, LEANSixSigmaKaizenEngine, LEAnSixSigmaKaizenEngine, SixSigmaKaizenEngine, SIXSigmaKaizenEngine, SigmaKaizenEngine, SIGMAKaizenEngine, SIGmaKaizenEngine, KaizenEngine
- **U-GAP-ERP-PURCHASING-INVENTORY** — no engine class matched candidates: PurchasingSystemEngine, SystemEngine, InventoryEngine
- **U-GAP-SF-ADVANCED-FEED-OPT** — no engine class matched candidates: AdvancedFeedOptimizerEngine, FeedOptimizerEngine, FEEDOptimizerEngine, FEEdOptimizerEngine, OptimizerEngine
- **U-GAP-ACADEMY-220-COURSES** — no engine class matched candidates: 220CoursesMasterEngine, CoursesMasterEngine, MasterEngine, CourseGatewayGeneratorEngine, GatewayGeneratorEngine, GeneratorEngine
- **U-GAP-ACADEMY-UNIVERSITY-ALGS** — no engine class matched candidates: UniversityAlgorithmsEngine, AlgorithmsEngine
- **U-GAP-MISC-DATA-STRUCTURES** — no engine class matched candidates: KDTree, KDTreeEngine, Octree, OctreeEngine, Bezier, BezierEngine

## BATCH-WIRE — coarse units, inspect BUILD_STATE.NEEDS_WIRING

- **U-WIRE-BACKLOG-MILL** — wire-batch unit: 0/4 named representatives already wired (MillingAIUltraIntelligenceEngine.ts, FiveAxisAIUltraIntelligenceEngine.ts, MillingUltimateAIEngine.ts, FiveAxisOrchestrationEngine.ts)
- **U-WIRE-BACKLOG-LATHE** — wire-batch unit: 0/5 named representatives already wired (LatheThermodynamicsEngine.ts, LatheUnifiedPhysicsOrchestrationEngine.ts, LatheOpusReasoningEngine.ts, LatheMetaLearningEngine.ts, LatheQualityGateEngine.ts)
- **U-WIRE-BACKLOG-WIRE** — wire-batch unit: 1/5 named representatives already wired (WEDMNeuralTrainingEngine.ts, WireEDMDeepAIHardeningEngine.ts, ElectrodeUltimateAIEngine.ts, WEDMProgramOptimizerEngine.ts, WEDMStrategyLibraryEngine.ts)
- **U-WIRE-BACKLOG-CAM** — wire-batch unit: no named representatives in title
- **U-WIRE-BACKLOG-TRIBAL** — wire-batch unit: no named representatives in title
- **U-WIRE-BACKLOG-POST** — wire-batch unit: 2/3 named representatives already wired (RealTimeAdaptiveControllerEngine.ts, GapEscalationControllerEngine.ts, DNCGenerateEngine.ts)
- **U-WIRE-BACKLOG-ACADEMY** — wire-batch unit: 0/3 named representatives already wired (VideoELearningAIEngine.ts, MITCourseIntegrationEngine.ts, ToolDatabaseDeepLearningEngine.ts)
- **U-WIRE-BACKLOG-DATABASE** — wire-batch unit: 0/3 named representatives already wired (PDFSourceRegistryEngine.ts, PhysicsPluginRegistry.ts, WetRunDeviationRegistryEngine.ts)

## UNKNOWN — title did not match audit conventions

- **U-GAP-WIRE-JMDIE-CORPUS** — WEDM program-learning corpus from JM DIE WIRE EDM/ (4058 Mastercam .mcx-8 + Sodick .esp across ~100 customers)
- **U-GAP-CAD-JMDIE-REVERSE-ENG** — Reverse-engineering pipeline: scanned-image/JPG + DXF -> solid model, from JM DIE REVERSE ENGINEERING/ (47 jpg+dxf+ipt triplets)
- **U-GAP-CAM-HYPERMILL-SDK** — hyperMILL SDK API mapper from Resources OPEN MIND/Shared SDK (~2110 Python automation scripts)
- **U-GAP-TRIBAL-FORMULA-REGISTRY** — Formula-registry harvester — 400+ formulas in Resources MACHINING KNOWLEDGE FORMULAS (3 JS files ~310KB)
- **U-GAP-TRIBAL-MACRO-INTEL** — Macro-program intelligence from JM DIE MACRO PROGRAMS/ — operator common-variable + part-counter loop patterns
- **U-GAP-ERP-HR-EMPLOYEE** — HR/employee subsystem — scheduling, skills matrix, certifications, labor tracking (no current PRISM engine)
- **U-GAP-ERP-DRAWING-AUTOMATION** — Drawing-automation workflow ingestion from JM DIE Automated Program xlsm (34-dim parametric VBA system)
- **U-WIRE-BACKLOG-ERP** — Wire the ~17 unwired erp/business engines (BusinessIntelligence, CustomerKnowledge, BusinessDocumentExtractor)
- **U-GAP-POST-JMDIE-LEARNING** — Post-processor learning from JM DIE PRISM MODIFIED POST PROCESSORS/ (12 PRISM-enhanced .cps: Haas/Hurco/Okuma/Roku-Roku)
- **U-GAP-SF-NC-CALIBRATION** — Shop-proven speed/feed calibration mined from 35K+ JM DIE NC programs (.min/.mcx-8/.cyc)
- **U-WIRE-BACKLOG-SF** — Wire the ~12 unwired speed-feed engines (SpeedFeedUltimateAI/AdvancedAI/DeepLearning — the SF-AI L1-L3 ladder)
- **U-GAP-P2P-JMDIE-PARTLIB** — Print-to-program training corpus from JM DIE _PART LIBRARY/ — 76K blueprint PDFs paired with 16.5K .min programs
- **U-GAP-P2P-OCR-DIMENSION** — Blueprint-OCR/vision dimension extraction (eDOCr2/PaddleOCR) — JM DIE GENERAL BANDAGES + QUEUE PDF prints
- **U-GAP-P2P-VALIDATION-HARNESS** — Print->program validation harness from JM DIE QUEUE/CLAUDE matched QT print+part+gcode triples
- **U-GAP-ACADEMY-MIT-KERNELS** — Re-modularize MIT algorithm kernels (NumericalMethods, NURBS, ODESolvers, ControlSystems, DigitalControl, DFM) from v8.89 monolith
- **U-GAP-ACADEMY-MIT-OCW-INGEST** — MIT-OCW course ingestion from Resources MIT COURSES/ (354 PDFs / 730 HTML across 8+ course dirs)
- **U-GAP-ACADEMY-TRAINING-DAYS** — Training-day curriculum ingestion from Resources Basic Training Day 1/2/3 + MILL INTRO CLASS.pptx
- **U-GAP-DB-MASTER-ALARM** — Ingest the v8.89 MASTER_ALARM_DATABASE — 2500 controller alarms + 68 vendor alarm files (Fanuc/Haas/Mazak/Siemens/...)
- **U-GAP-DB-VERIFIED-FIX-PROC** — Ingest v8.89 VERIFIED_FIX_PROCEDURES + ALARM_FIX_PROCEDURES — controller-diagnostic fix database
- **U-GAP-DB-GCODE-MCODE** — Ingest v8.89 GCODE_MCODE_DATABASE — canonical G/M-code reference
- **U-GAP-DB-MACHINE-LIBRARY** — Ingest v8.89 machines/ ALL_MACHINES.json + 12 ENHANCED batch JSONs + OEM STEP-model library from Resources
- **U-GAP-DB-TOOL-CATALOG-HARVEST** — Tool-database harvester — Resources OPEN MIND Tool DB + 287 .tooldb/.db/.mdb (~131MB)
- **U-GAP-DB-PARTLIB-MASTER** — JM DIE _PART LIBRARY part-master DB — 134K files, 29K JSON metadata, customer->part-number index + version dedup
- **U-GAP-MISC-AS9100-TRACE** — Wire AS9100TraceabilityEngine (47KB, self-labeled P0-CRITICAL aerospace traceability — built, unwired, unplanned)
- **U-WIRE-BACKLOG-MISC** — Wire/triage the ~328 unwired misc engines — bulk of the unwired-engine debt; rank by leverage via /wire-unwired
- **U-GAP-HERMES-EVAL** — Evaluate NousResearch Hermes Agent adoption strategy — full port vs cherry-pick (closed learning loop, soul.md personality, tool gateway, 20+ messaging surfaces); output go/no-go matrix per pattern. Source: hermes-shann-article.md + HERMES-EVOLVING-SKILLS-RESEARCH-2026-05-17.md.
- **U-GAP-SKILL-AUTO-GEN-MS0** — Build evolving-skills closed loop — harness observes successful workflows, clusters patterns, auto-emits /forge-triple stubs, reviewer-agent gate, ship-to-library (Hermes harness-writes-skills + Voyager skill-library evolution); compounding-capability lever across all 13 slots.
- **U-GAP-HERMES-MULTI-SURFACE-MSG** — Adapt Hermes 20+ messaging-surfaces pattern (Telegram/Discord/Slack/email/voice) — required for prism-revenue operator-in-the-loop hand-off + JM-Die shop-floor confirmation loops on Speed/Feed results.
- **U-GAP-POST-BUILD-UTILITY-SCAN** — Proactive post-build utility-scan: every chat that ships an asset auto-runs a 3-surface query (/system-viz neighbors + prism_session:master_index_query + prism awareness snapshot + Obsidian brain) to surface where the new asset can be utilized — wires, dispatchers, dependent engines, matching FEATURE-GAP units — and proposes memory node if feasible. Stop-chain advisory hook. Closes the 'we built X but never connected it to Y' silent-waste class.
