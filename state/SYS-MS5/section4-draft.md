## Section 4 -- Engine Inventory

**125 engines** | **76,286 total lines** | 10 categories

All engines exported from `mcp-server/src/engines/index.ts` (v12).
Path prefix: `mcp-server/src/engines/`

### Manufacturing Intelligence (L2-P1) (26 engines, 23,536L)

- `AdvancedCalculations.ts` (639L) -- Stability analysis, thermal modeling, and optimization
- `CampaignEngine.ts` (1421L) -- Campaign management for multi-operation machining
- `CollisionEngine.ts` (2089L) -- 3D collision detection for CNC machining safety
- `DecisionTreeEngine.ts` (1467L) -- Manufacturing decision logic - tool, insert, coolant, workholding selection
- `DimensionalAnalysisEngine.ts` (224L) -- Dimensional analysis and unit validation **[SAFETY]**
- `FailureForensicsEngine.ts` (527L) -- Failure forensics - root cause analysis of machining failures
- `GenerativeProcessEngine.ts` (1147L) -- Generative process planning from part features
- `IntelligenceEngine.ts` (2564L) -- Intelligence Engine - unified manufacturing intelligence hub
- `InverseSolverEngine.ts` (741L) -- Inverse problem solving - derive inputs from desired outputs
- `JobLearningEngine.ts` (442L) -- Job-level learning from machining history
- `ManufacturingCalculations.ts` (991L) -- Core physics-based calculations for CNC machining (Kienzle, Taylor, Johnson-Cook)
- `ManufacturingGenomeEngine.ts` (445L) -- Manufacturing genome - process DNA encoding
- `OptimizationEngine.ts` (1094L) -- Constrained optimization for machining parameters
- `PhysicsPredictionEngine.ts` (1023L) -- Physics-based prediction (surface integrity, thermal, chatter)
- `QualityPredictionEngine.ts` (279L) -- Manufacturing quality prediction from process data
- `SchedulingEngine.ts` (233L) -- Manufacturing scheduling and sequencing
- `SetupSheetEngine.ts` (566L) -- Professional setup sheet generation
- `SpindleProtectionEngine.ts` (1009L) -- Real-time spindle load protection from overload
- `SustainabilityEngine.ts` (862L) -- Sustainability metrics and eco-optimization
- `ThreadCalculationEngine.ts` (659L) -- Complete thread calculations (ISO, UNC, UNF, ACME, NPT, etc.)
- `ToleranceEngine.ts` (541L) -- Tolerance analysis - IT grades, shaft-hole fits, Cpk
- `ToleranceStackEngine.ts` (231L) -- Tolerance stack-up analysis
- `ToolBreakageEngine.ts` (1071L) -- Physics-based tool breakage prediction
- `ToolpathCalculations.ts` (1304L) -- Toolpath strategy calculations for CNC machining
- `WorkholdingEngine.ts` (1486L) -- Physics-based workholding safety validation
- `WorkholdingIntelligenceEngine.ts` (481L) -- Workholding intelligence - fixture recommendation

### CAD/CAM (L2-P2) (18 engines, 9,230L)

- `CADKernelEngine.ts` (758L) -- Computational Geometry and B-Rep Kernel
- `CAMIntegrationEngine.ts` (1230L) -- CAM system integration with tool library management
- `CAMKernelEngine.ts` (874L) -- Computer-Aided Manufacturing Kernel
- `CadBridge.ts` (390L) -- TypeScript client bridge for the Python CAD engine
- `CollisionDetectionEngine.ts` (278L) -- CAD/CAM collision detection **[SAFETY]**
- `FeatureRecognitionEngine.ts` (247L) -- CAD feature recognition from geometry
- `FileIOEngine.ts` (784L) -- CAD file import/export (STEP, IGES, STL)
- `GCodeOptimizationEngine.ts` (265L) -- G-code path optimization
- `GCodeTemplateEngine.ts` (1592L) -- G-code template generation for multiple controllers
- `GeometryEngine.ts` (224L) -- Computational geometry primitives
- `MeshEngine.ts` (286L) -- Mesh generation and manipulation
- `PostProcessorEngine.ts` (381L) -- CNC post-processor for controller-specific output
- `SimulationEngine.ts` (598L) -- CNC machining simulation engine
- `StockModelEngine.ts` (201L) -- Stock model tracking for material removal
- `ToolAssemblyEngine.ts` (182L) -- Tool assembly configuration and validation
- `ToolpathGenerationEngine.ts` (237L) -- Toolpath generation from geometry and strategy
- `VisualizationEngine.ts` (476L) -- 3D visualization data pipeline
- `WorkCoordinateEngine.ts` (227L) -- Work coordinate system management (G54-G59)

### Safety & Compliance (L2-P3) (6 engines, 3,976L)

- `CertificateEngine.ts` (642L) -- Formal verification certificate generation
- `ComplianceEngine.ts` (824L) -- Compliance-as-Code regulatory validation
- `CoolantValidationEngine.ts` (767L) -- Coolant flow validation for safe machining
- `ModularFixtureLayoutEngine.ts` (153L) -- Modular fixture layout optimization
- `PFPEngine.ts` (797L) -- Predictive Failure Prevention - proactive failure analysis
- `PredictiveFailureEngine.ts` (793L) -- Predictive failure prevention engine

### 5-Axis & Specialty Machining (5 engines, 1,014L)

- `InverseKinematicsSolverEngine.ts` (198L) -- 5-axis inverse kinematics solver
- `RTCP_CompensationEngine.ts` (213L) -- Rotary tool center point compensation **[SAFETY]**
- `SingularityAvoidanceEngine.ts` (219L) -- 5-axis singularity detection and avoidance **[SAFETY]**
- `TiltAngleOptimizationEngine.ts` (183L) -- 5-axis tilt angle optimization
- `WorkEnvelopeValidatorEngine.ts` (201L) -- 5-axis work envelope validation **[SAFETY]**

### Turning & Lathe (6 engines, 969L)

- `BarPullerTimingEngine.ts` (112L) -- Bar puller timing calculations for lathe bar feeders
- `ChuckJawForceEngine.ts` (184L) -- Chuck jaw gripping force calculations **[SAFETY]**
- `LiveToolingEngine.ts` (137L) -- Live tooling calculations for lathe milling/drilling
- `SinglePointThreadEngine.ts` (238L) -- Single-point threading calculations **[SAFETY]**
- `SteadyRestPlacementEngine.ts` (133L) -- Steady rest placement calculations for long parts
- `TailstockForceEngine.ts` (165L) -- Tailstock force calculations **[SAFETY]**

### EDM & Non-Traditional (4 engines, 600L)

- `EDMSurfaceIntegrityEngine.ts` (156L) -- EDM surface integrity assessment **[SAFETY]**
- `ElectrodeDesignEngine.ts` (155L) -- Sinker EDM electrode design calculations
- `MicroEDMEngine.ts` (123L) -- Micro-EDM process parameter calculations
- `WireEDMSettingsEngine.ts` (166L) -- Wire EDM process settings calculations

### Intelligence & AI (10 engines, 8,721L)

- `AIMLEngine.ts` (694L) -- Manufacturing AI/ML Intelligence
- `AdaptiveControlEngine.ts` (672L) -- Real-Time Adaptive Machining Control
- `AlgorithmEngine.ts` (257L) -- Unified typed algorithm management
- `AlgorithmGatewayEngine.ts` (1608L) -- Algorithm Gateway - unified algorithm selection and routing
- `ApprenticeEngine.ts` (621L) -- Machinist Apprentice - guided learning and assistance
- `FederatedLearningEngine.ts` (826L) -- Anonymous federated learning network
- `InferenceChainEngine.ts` (1103L) -- Multi-step inference chain reasoning
- `KnowledgeGraphEngine.ts` (919L) -- Knowledge graph for manufacturing domain relationships
- `KnowledgeQueryEngine.ts` (1196L) -- Unified knowledge access and querying
- `PredictiveMaintenanceEngine.ts` (825L) -- Predictive maintenance scheduling and analysis

### Shop Floor & Digital (11 engines, 4,274L)

- `BottleneckIdentificationEngine.ts` (126L) -- Production bottleneck detection and analysis
- `DNCTransferEngine.ts` (518L) -- DNC / CNC file transfer integration
- `DigitalThreadEngine.ts` (109L) -- Digital thread traceability across manufacturing lifecycle
- `DigitalWorkInstructionEngine.ts` (145L) -- Digital work instruction generation
- `ERPIntegrationEngine.ts` (592L) -- ERP / MES system integration
- `MachineConnectivityEngine.ts` (849L) -- MTConnect/OPC-UA data ingestion and machine monitoring
- `MeasurementIntegrationEngine.ts` (562L) -- Measurement and inspection integration (CMM, probing)
- `MobileInterfaceEngine.ts` (396L) -- Mobile/tablet interface data layer with voice support
- `OEECalculatorEngine.ts` (132L) -- Overall Equipment Effectiveness (OEE) calculations
- `ShiftHandoffEngine.ts` (110L) -- Shift handoff data management
- `ShopSchedulerEngine.ts` (735L) -- Shop floor scheduling and machine utilization

### Infrastructure (27 engines, 17,302L)

- `AuthEngine.ts` (327L) -- Authentication and authorization **[SECURITY]**
- `BatchProcessor.ts` (302L) -- Batch processing pipeline for bulk operations
- `ComputationCache.ts` (406L) -- Computation result caching layer
- `ConversationalMemoryEngine.ts` (453L) -- Conversational memory and context management
- `DiffEngine.ts` (175L) -- Diff computation engine
- `EventBus.ts` (1202L) -- Centralized event-driven communication system
- `ExportEngine.ts` (187L) -- Data export engine for reports and files
- `HookEngine.ts` (819L) -- Event-driven hook system with lifecycle management
- `HookExecutor.ts` (851L) -- Core hook infrastructure and execution
- `IntentDecompositionEngine.ts` (692L) -- Intent decomposition and NLP parsing
- `MemoryGraphEngine.ts` (920L) -- Cross-session memory graph for persistent context
- `MultiTenantEngine.ts` (590L) -- Multi-tenant isolation and data partitioning
- `NLHookEngine.ts` (952L) -- Natural language hook definition and execution
- `OnboardingEngine.ts` (265L) -- User onboarding and first-5-minutes experience
- `ProductEngine.ts` (2590L) -- Product packaging - SFC, PPG, Shop, ACNC product bundles
- `ProtocolBridgeEngine.ts` (593L) -- Protocol bridge for cross-system communication
- `ReportEngine.ts` (395L) -- Manufacturing report generation
- `ReportRenderer.ts` (1161L) -- Template rendering engine for manufacturing reports
- `ResponseFormatterEngine.ts` (676L) -- Persona-adaptive response formatting
- `ResponseTemplateEngine.ts` (669L) -- Response template hooks and auto-formatting
- `SessionLifecycleEngine.ts` (354L) -- Session lifecycle tracking and quality metrics
- `SettingsEngine.ts` (303L) -- User/system configuration management
- `TelemetryEngine.ts` (606L) -- Dispatcher telemetry and self-optimization
- `TenantEngine.ts` (189L) -- Tenant management and isolation
- `UserAssistanceSkillsEngine.ts` (541L) -- User assistance skills - physics explanations, safety reports
- `UserWorkflowSkillsEngine.ts` (606L) -- User workflow skills - persona-adaptive skill routing
- `WorkflowChainsEngine.ts` (478L) -- Pre-built workflow chains for common operations

### Orchestration (12 engines, 6,664L)

- `AgentExecutor.ts` (835L) -- Multi-agent orchestration, task queue, and execution coordination
- `ContextBudgetEngine.ts` (162L) -- Context window budget allocation and management
- `ManusATCSBridge.ts` (305L) -- ATCS-to-Manus Claude API execution bridge
- `RoadmapExecutor.ts` (849L) -- Parallel execution protocol for roadmap milestones
- `ScriptExecutor.ts` (829L) -- Script execution engine for automation
- `SkillAutoLoader.ts` (433L) -- Smart skill loading with chain awareness and domain mapping
- `SkillBundleEngine.ts` (238L) -- Skill bundle packaging and lookup
- `SkillExecutor.ts` (861L) -- Skill integration and execution engine
- `SourceCatalogAggregator.ts` (174L) -- Unified query interface for all engine source catalogs
- `SwarmExecutor.ts` (991L) -- Advanced multi-agent swarm coordination patterns
- `SwarmGroupExecutor.ts` (357L) -- Multi-group swarm orchestration
- `TaskAgentClassifier.ts` (630L) -- Automatic agent and swarm pattern recommendation
