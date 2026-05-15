# PRISM Dispatcher Digest

**97 dispatchers** route MCP actions to engines.
Each dispatcher handles a specific manufacturing/system domain.
Auto-generated: 2026-05-15 (by `scripts/generate-dispatcher-digest.mjs` — re-run after dispatcher edits).
Total actions across all dispatchers: **10143**.

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| adaptiveControlDispatcher | prism_adaptive_control — Adaptive Control & Digital Twin dispatcher — real-time fe... | 43 |
| agentDispatcher | prism_agent — PRISM Agent — Intelligent manufacturing agent exposing me... | 21 |
| aiReasoningDispatcher | (no server.tool found) | 426 |
| algorithmDispatcher | prism_algorithm — Algorithm execution dispatcher (35 actions). Signal proce... | 40 |
| atcsDispatcher | prism_atcs — Autonomous Task Completion System — file-system state mac... | 12 |
| authDispatcher | prism_auth — Authentication & Authorization dispatcher — login, regist... | 10 |
| autoPilotDispatcher | prism_autopilot_d — AutoPilot workflow orchestration. Actions: ${ACTIONS.join... | 7 |
| automationDispatcher | prism_automation — Shop Floor Automation dispatcher — OEE calculation, bottl... | 9 |
| autonomousDispatcher | prism_autonomous — Autonomous execution engine — bridges ATCS state machine ... | 8 |
| awarenessMiddleware | (no server.tool found) | 0 |
| bridgeDispatcher | prism_bridge — Multi-protocol API gateway for external system integratio... | 13 |
| businessDispatcher | prism_business — Business Operations dispatcher — financial analysis (NPV/... | 441 |
| cadAutomationDispatcher | prism_cad_automation — CAD automation router â€” unified access to SolidWorks/In... | 367 |
| cadDispatcher | prism_cad — CAD/Geometry dispatcher — geometry operations, meshing, f... | 372 |
| cadDrawingKnowledgeDispatcher | prism_cad_drawing_kb — CAD Drawing Knowledge — GD&T selection (14 symbols per Y1... | 11 |
| cadRegressionDispatcher | prism_cad_regression — CAD Regression — index/classify/run/checkpoint/triage/art... | 32 |
| calcDispatcher | prism_calc — Manufacturing calculations: cutting force, tool life, spe... | 1321 |
| camDispatcher | prism_cam — CAM/Toolpath dispatcher — toolpath generation, simulation... | 2216 |
| camFunctionDispatcher | prism_cam_function — CAM Function Index dispatcher — routes natural-language i... | 8 |
| cncOpsDispatcher | prism_cnc_ops — CNC operations: ball end mill, broaching, chamfer, circul... | 72 |
| complianceDispatcher | prism_compliance — Compliance-as-Code + Legal Operating Layer. 6 regulatory ... | 35 |
| contextDispatcher | prism_context — Context engineering: KV-cache stability, tool masking, me... | 96 |
| cplDispatcher | (no server.tool found) | 54 |
| dataDispatcher | prism_data — Registry data access: material/machine/tool/alarm/formula... | 215 |
| devDispatcher | prism_dev — Dev workflow tools. Actions: ${ACTIONS.join(", ")} | 441 |
| diagnosisDispatcher | prism_diagnosis — Diagnostics & analysis: failure forensics (tool autopsy, ... | 64 |
| documentDispatcher | prism_doc — Document management dispatcher. Actions: list, read, writ... | 7 |
| documentLearningDispatcher | prism_doc_learn — Document knowledge extraction: upload PDFs/notes/articles... | 5 |
| edmDispatcher | prism_edm — Non-traditional machining: EDM (electrode, wire, surface,... | 295 |
| exportDispatcher | prism_export — Document Export dispatcher — render PDF, CSV, Excel, DXF,... | 10 |
| feasibilityDispatcher | prism_feasibility — Machining feasibility intelligence: workpiece state track... | 37 |
| fiveAxisDispatcher | prism_5axis — 5-Axis Kinematics dispatcher — SAFETY CRITICAL. RTCP comp... | 10 |
| fluidThermalDispatcher | prism_fluid_thermal — Fluid, thermal & material science: heat exchangers (shell... | 48 |
| formingCastingDispatcher | prism_forming — Forming & casting: blow molding, casting defect analysis,... | 40 |
| generatorDispatcher | prism_generator — Hook generator tools (7 tools → 1). Actions: ${ACTIONS.jo... | 6 |
| grindingDispatcher | prism_grinding — Grinding Process dispatcher — wheel selection, dressing p... | 10 |
| gsdDispatcher | prism_gsd — GSD (Get Shit Done) protocol access — FILE-BASED v3.0.\nA... | 6 |
| guardDispatcher | prism_guard — Reasoning + Enforcement + AutoHook diagnostics (8 actions... | 58 |
| holePatternDispatcher | prism_hole_pattern — Hole Pattern Pipeline — pattern recognition, sequence opt... | 3 |
| hookDispatcher | prism_hook — Hook & event management (${ACTIONS.length} actions, conso... | 31 |
| inboxDispatcher | prism_inbox — DocuRead document inbox — intake, classify, and match man... | 8 |
| industryDispatcher | prism_industry — Industry Compliance dispatcher — aerospace (AS9100/NADCAP... | 4 |
| infraDispatcher | prism_infra — Infrastructure tools: DB health, search, jobs, events, ML... | 25 |
| intakeDispatcher | (no server.tool found) | 1 |
| integrationDispatcher | prism_integration — External system integration: CAM software, DNC transfer, ... | 62 |
| intelligenceDispatcher | prism_intelligence — Manufacturing intelligence: job planning, setup sheets, c... | 353 |
| knowledgeDispatcher | prism_knowledge — Unified knowledge query across 9 PRISM registries. Action... | 123 |
| knowledgeExtDispatcher | prism_knowledge_ext — Knowledge management: apprentice training, manufacturing ... | 44 |
| l2EngineDispatcher | prism_l2 — L2 Engine dispatcher — 8 ported monolith engines (AI/ML, ... | 73 |
| localDispatcher | prism_local — Local LLM operations for token savings + learning. Action... | 26 |
| machineLiveDispatcher | prism_machine_live — Machine live monitoring & control: real-time connectivity... | 73 |
| machineSetupDispatcher | prism_machine_setup — Machine setup & quality: spindle analysis (load/runout/sp... | 111 |
| machiningKnowledgeBaseDispatcher | prism_machining_kb — Machining Knowledge Base — canonical reference for cuttin... | 56 |
| manusDispatcher | prism_manus — Manus AI agent + development hooks. Actions: ${ACTIONS.jo... | 11 |
| materialProcessingDispatcher | prism_material_processing — Material processing: anodizing (Type I/II/III), carburizi... | 32 |
| mechanicalDesignDispatcher | prism_mechanical — Mechanical design: ball screws, bearings (journal/rolling... | 53 |
| memoryDispatcher | (no server.tool found) | 35 |
| millDispatcher | prism_mill — Mill-specific dispatcher — strategy, toolpath, physics, A... | 119 |
| mlDispatcher | (no server.tool found) | 129 |
| monitoringDispatcher | prism_monitoring — Monitoring & Observability dispatcher — Grafana/Prometheu... | 10 |
| multiAxisProgramDispatcher | prism_multiaxis_program — Multi-Axis Print-to-Program — generates CNC programs for ... | 2 |
| multiOpDispatcher | prism_multi_op — Multi-Operation Orchestration dispatcher — rest machining... | 12 |
| nlHookDispatcher | prism_nl_hook — Natural language hook authoring (8 actions). Parse NL des... | 8 |
| omegaDispatcher | prism_omega — Omega quality equation dispatcher. Ω(x) = 0.25R + 0.20C +... | 6 |
| operatingSystemDispatcher | prism_operating_system — Operating-system shell, desk, program release, scheduling... | 51 |
| orchestrationDispatcher | prism_orchestrate — Agent orchestration, swarm coordination, and roadmap exec... | 41 |
| partsLibraryDispatcher | prism_parts — Parts Library & File Storage — upload files with SHA-256 ... | 17 |
| pfpDispatcher | prism_pfp — Predictive Failure Prevention. Actions: get_dashboard, as... | 6 |
| ppDispatcher | prism_pp — PostProcessor dispatcher — G-code generation, optimizatio... | 801 |
| processControlDispatcher | prism_process_control — Process Control & DOE dispatcher — cycle-to-cycle feedbac... | 9 |
| productDispatcher | prism_product — Product tools: SFC (surface finish calc), PPG (post proce... | 76 |
| provenPipelineDispatcher | prism_proven_pipeline — Proven Pipeline dispatcher — proven part recipes, similar... | 26 |
| qualityDispatcher | prism_quality — Quality & Metrology dispatcher — SPC, Cpk prediction, CMM... | 23 |
| ralphDispatcher | prism_ralph — Execute 4-phase Ralph validation with REAL Claude API cal... | 3 |
| realtimeDispatcher | prism_realtime — Real-time WebSocket messaging. Actions: ${ACTIONS.join(",... | 6 |
| resourceExtractionDispatcher | prism_resource_extraction — Content extraction pipeline — archives, OCR, drawings, of... | 21 |
| resourceHarvesterDispatcher | prism_resource_harvester — Resource scanning & harvesting dispatcher — scan folders,... | 24 |
| resourceHarvestingDispatcher | prism_resource_harvesting — Automated resource harvesting pipeline — scan, ingest, an... | 8 |
| safetyDispatcher | prism_safety — Safety-critical manufacturing validations: collision dete... | 32 |
| schedulingDispatcher | prism_scheduling — Production Scheduling dispatcher — job scheduling, machin... | 11 |
| scientificMathDispatcher | prism_scientific_math — Scientific Mathematics dispatcher — stochastic processes ... | 10 |
| secondaryOpsDispatcher | prism_secondary_ops — Secondary Operations — deburring, probing, engraving, was... | 3 |
| securityDispatcher | prism_security — Security operations — tenant isolation, encryption, acces... | 227 |
| sessionDispatcher | prism_session — Session state management: save/load/checkpoint/diff, hand... | 93 |
| shopPracticeDispatcher | prism_shop_practice — Shop practice knowledge base: ingest/search/audit machini... | 28 |
| skillScriptDispatcher | prism_skill_script — Skills, scripts, and bundles: list/get/search/execute/rec... | 34 |
| spDispatcher | prism_sp — Development protocol dispatcher (19 actions). Superpowers... | 19 |
| telemetryDispatcher | prism_telemetry — Dispatcher telemetry & self-optimization. Actions: get_da... | 7 |
| tenantDispatcher | prism_tenant — Multi-tenant isolation with Shared Learning Bus. Tenant n... | 15 |
| threadDispatcher | prism_thread — Threading calculations: tap drill, thread milling, depth,... | 17 |
| threadingPipelineDispatcher | prism_threading_pipeline — Threading Pipeline — complete thread programming for lath... | 3 |
| toolpathDispatcher | prism_toolpath — Toolpath strategy engine: strategy selection, parameter c... | 34 |
| turningDispatcher | prism_turning — Turning-specific dispatcher â€” SAFETY CRITICAL. Chuck ja... | 142 |
| turningProgramDispatcher | prism_turning_program — Turning Print-to-Program — generates CNC lathe programs f... | 14 |
| validationDispatcher | prism_validate — Validation dispatcher. Actions: material, kienzle, taylor... | 18 |
| vibrationPhysicsDispatcher | prism_vibration_physics — Vibration, dynamics & cutting physics: VAM, vibration dam... | 36 |
| weldingJoiningDispatcher | prism_welding — Welding & joining: adhesive bonding, brazing/soldering, u... | 12 |
