# PRISM Dispatcher Digest

**98 dispatchers** route MCP actions to engines.
Each dispatcher handles a specific manufacturing/system domain.
Updated: 2026-05-13 (manually updated for TRAINING-LEARNING-MS0/U-TL-U5..U6 — added 6 actions across turning/cam/edm)

## TRAINING-LEARNING-MS0/U-TL-U5..U6 actions added 2026-05-13

| Dispatcher | Action | Source | Engine |
|---|---|---|---|
| prism_turning | lathe_part_family_match | U-TL-U5 | LathePartFamilyMatcherEngine.matchPartFamily |
| prism_cam | mill_part_family_match | U-TL-U5 | MillPartFamilyMatcherEngine.matchPartFamily |
| prism_edm | wedm_part_family_match | U-TL-U5 | WEDMPartFamilyMatcherEngine.matchPartFamily |
| prism_turning | training_ingest_lathe_outcome | U-TL-U6 | TrainingTemplateContinuousLearningEngine.ingestLatheOutcome |
| prism_cam | training_ingest_mill_outcome | U-TL-U6 | TrainingTemplateContinuousLearningEngine.ingestMillOutcome |
| prism_edm | training_ingest_wedm_outcome | U-TL-U6 | TrainingTemplateContinuousLearningEngine.ingestWEDMOutcome |

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| adaptiveControlDispatcher | prism_adaptive_control — Adaptive Control & Digital Twin Dispatcher | 23 |
| agentDispatcher | prism_agent — PRISM Agent | 8 |
| aiReasoningDispatcher | AI Reasoning Dispatcher | 0 |
| algorithmDispatcher | prism_algorithm — Algorithm execution dispatcher (35 actions). Signal proce... | 40 |
| atcsDispatcher | prism_atcs — Autonomous Task Completion System | 12 |
| authDispatcher | prism_auth — Authentication & Authorization Dispatcher | 8 |
| automationDispatcher | prism_automation — Shop Floor Automation Dispatcher | 5 |
| autonomousDispatcher | prism_autonomous — Autonomous execution engine | 8 |
| autoPilotDispatcher | prism_autopilot_d — AutoPilot workflow orchestration. | 7 |
| awarenessMiddleware | awareness Middleware | 0 |
| awarenessMiddleware.test | awareness Middleware.test | 0 |
| bridgeDispatcher | prism_bridge — 13 actions for multi-protocol API gateway. | 13 |
| businessDispatcher | prism_business — Business Operations Dispatcher | 383 |
| cadAutomationDispatcher | prism_cad_automation — CAD automation router â€” unified access to SolidWorks/In... | 35 |
| cadDispatcher | prism_cad — CAD/Geometry Dispatcher | 235 |
| cadDrawingKnowledgeDispatcher | prism_cad_drawing_kb — CAD Drawing Knowledge Dispatcher | 11 |
| cadRegressionDispatcher | prism_cad_regression — CAD Regression Dispatcher (CINF12 / CAD-INFRA-MS0) | 25 |
| calcDispatcher | prism_calc — calc | 1150 |
| camDispatcher | prism_cam — CAM/Toolpath Dispatcher | 1921 |
| camFunctionDispatcher | prism_cam_function — CAM Function Index Dispatcher | 8 |
| cncOpsDispatcher | prism_cnc_ops — CNC Operations Dispatcher | 41 |
| complianceDispatcher | prism_compliance — 8 actions for regulatory compliance templates. | 17 |
| contextDispatcher | prism_context — context | 65 |
| cplDispatcher | CAM-Pipeline Track Dispatcher | 54 |
| dataDispatcher | prism_data — data | 215 |
| devDispatcher | prism_dev — Dev workflow tools. | 324 |
| diagnosisDispatcher | prism_diagnosis — diagnosis | 53 |
| documentDispatcher | prism_doc — Document management dispatcher. Actions: list, read, writ... | 7 |
| documentLearningDispatcher | prism_doc_learn — document Learning | 5 |
| edmDispatcher | prism_edm — Non-Traditional Machining Dispatcher | 235 |
| exportDispatcher | prism_export — Document Export & Report Dispatcher | 8 |
| feasibilityDispatcher | prism_feasibility — Machining Feasibility Intelligence Dispatcher | 28 |
| fiveAxisDispatcher | prism_5axis — 5-Axis Kinematics Dispatcher | 5 |
| fluidThermalDispatcher | prism_fluid_thermal — Fluid, Thermal & Material Science Dispatcher | 48 |
| formingCastingDispatcher | prism_forming — Forming & Casting Dispatcher | 20 |
| generatorDispatcher | prism_generator — Hook generator tools (7 tools → 1). | 6 |
| grindingDispatcher | prism_grinding — Grinding Process Dispatcher | 10 |
| gsdDispatcher | prism_gsd — GSD (Get Shit Done) protocol access | 6 |
| guardDispatcher | prism_guard — Reasoning + Enforcement + AutoHook diagnostics (8 actions... | 58 |
| holePatternDispatcher | prism_hole_pattern — Hole Pattern Pipeline Dispatcher | 3 |
| hookDispatcher | prism_hook — Hook & event management ( actions, consolidates 28 tools)... | 26 |
| inboxDispatcher | prism_inbox — DocuRead document inbox | 8 |
| industryDispatcher | prism_industry — Industry Compliance Dispatcher | 4 |
| infraDispatcher | prism_infra — 25 actions for database health, persistence monitoring, | 25 |
| intakeDispatcher | intake | 1 |
| integrationDispatcher | prism_integration — integration | 55 |
| intelligenceDispatcher | prism_intelligence — intelligence | 485 |
| knowledgeDispatcher | prism_knowledge — Unified knowledge query across 9 PRISM registries. Action... | 114 |
| knowledgeExtDispatcher | prism_knowledge_ext — knowledge Ext | 40 |
| l2EngineDispatcher | prism_l2 — L2 Engine dispatcher | 38 |
| localDispatcher | prism_local — Local LLM Dispatcher — LOCAL-LLM-MS0 | 0 |
| machineLiveDispatcher | prism_machine_live — machine Live | 70 |
| machineSetupDispatcher | prism_machine_setup — Machine Setup & Quality Dispatcher | 81 |
| machiningKnowledgeBaseDispatcher | prism_machining_kb — Machining Knowledge Base Dispatcher | 56 |
| manusDispatcher | prism_manus — Manus AI agent + development hooks. | 11 |
| materialProcessingDispatcher | prism_material_processing — Material Processing Dispatcher | 16 |
| mechanicalDesignDispatcher | prism_mechanical — Mechanical Design Dispatcher | 53 |
| memoryDispatcher | 6 actions for the F2 cross-session memory graph. | 30 |
| millDispatcher | prism_mill — Mill-Specific Dispatcher | 0 |
| mlDispatcher | ML Pipeline Dispatcher — U-LEARN-03 + U-LEARN-11 | 0 |
| monitoringDispatcher | prism_monitoring — Monitoring & Observability Dispatcher | 9 |
| multiAxisProgramDispatcher | prism_multiaxis_program — Multi-Axis Print-to-Program Dispatcher | 2 |
| multiOpDispatcher | prism_multi_op — Multi-Operation Orchestration Dispatcher | 7 |
| nlHookDispatcher | 8 actions for NL hook authoring. | 8 |
| omegaDispatcher | prism_omega — Omega quality equation dispatcher. Ω(x) = 0.25R + 0.20C +... | 6 |
| operatingSystemDispatcher | prism_operating_system — Operating-System Shell Dispatcher | 47 |
| orchestrationDispatcher | prism_orchestrate — orchestration | 41 |
| partsLibraryDispatcher | prism_parts — Parts Library & File Storage Dispatcher | 17 |
| pfpDispatcher | prism_pfp — 6 actions for Predictive Failure Prevention. | 6 |
| ppDispatcher | prism_pp — PostProcessor-Specific Dispatcher | 653 |
| processControlDispatcher | prism_process_control — Process Control & DOE Dispatcher | 6 |
| productDispatcher | prism_product — product | 72 |
| provenPipelineDispatcher | prism_proven_pipeline — Proven Pipeline Dispatcher | 22 |
| qualityDispatcher | prism_quality — Quality & Metrology Dispatcher | 17 |
| ralphDispatcher | prism_ralph — Execute 4-phase Ralph validation with REAL Claude API cal... | 3 |
| realtimeDispatcher | prism_realtime — Real-time WebSocket messaging. | 6 |
| resourceExtractionDispatcher | prism_resource_extraction — Content Extraction Pipeline Dispatcher | 14 |
| resourceHarvesterDispatcher | prism_resource_harvester — Resource Scanning & Harvesting Dispatcher | 19 |
| resourceHarvestingDispatcher | prism_resource_harvesting — Automated Resource Harvesting Pipeline Dispatcher | 8 |
| safetyDispatcher | prism_safety — Safety-critical manufacturing validations: collision dete... | 31 |
| schedulingDispatcher | prism_scheduling — Production Scheduling Dispatcher | 8 |
| scientificMathDispatcher | prism_scientific_math — Scientific Mathematics Dispatcher | 5 |
| secondaryOpsDispatcher | prism_secondary_ops — Secondary Operations Dispatcher | 3 |
| securityDispatcher | prism_security — 171 actions for security operations: | 227 |
| sessionDispatcher | prism_session — session | 68 |
| shopPracticeDispatcher | prism_shop_practice — shop Practice | 23 |
| skillScriptDispatcher | prism_skill_script — skill Script | 27 |
| spDispatcher | prism_sp — Development protocol dispatcher (19 actions). Superpowers... | 19 |
| telemetryDispatcher | prism_telemetry — 7 read/control actions for the F3 telemetry system. | 7 |
| tenantDispatcher | prism_tenant — 15 actions for tenant lifecycle, SLB, resource limits. | 15 |
| threadDispatcher | prism_thread — thread | 21 |
| threadingPipelineDispatcher | prism_threading_pipeline — Threading Pipeline Dispatcher | 3 |
| toolpathDispatcher | prism_toolpath — toolpath | 34 |
| turningDispatcher | prism_turning — Turning-specific dispatcher â€” SAFETY CRITICAL. Chuck ja... | 114 |
| turningProgramDispatcher | prism_turning_program — Turning Print-to-Program Dispatcher | 14 |
| validationDispatcher | prism_validate — Validation dispatcher. Actions: material, kienzle, taylor... | 13 |
| vibrationPhysicsDispatcher | prism_vibration_physics — Vibration, Dynamics & Cutting Physics Dispatcher | 19 |
| weldingJoiningDispatcher | prism_welding — Welding & Joining Dispatcher | 6 |

**Total actions across all dispatchers: 7827**
