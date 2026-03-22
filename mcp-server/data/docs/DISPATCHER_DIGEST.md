# PRISM Dispatcher Digest

**69 dispatchers** route MCP actions to engines.
Each dispatcher handles a specific manufacturing/system domain.
Updated: 2026-03-20 (verified against source code z.enum arrays)

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| adaptiveControlDispatcher | prism_adaptive_control — Adaptive Control & Digital Twin | 12 |
| atcsDispatcher | prism_atcs — Autonomous Task Completion System | 12 |
| authDispatcher | prism_auth — Authentication & Authorization | 8 |
| autoPilotDispatcher | prism_autopilot_d — Consolidates 7 autopilot tools | 7 |
| automationDispatcher | prism_automation — Shop Floor Automation | 5 |
| autonomousDispatcher | prism_autonomous — Autonomous Agent Execution | 8 |
| bridgeDispatcher | prism_bridge — Protocol Bridge (F7) | 13 |
| businessDispatcher | prism_business — Business Operations | 202 |
| cadDispatcher | prism_cad — CAD/Geometry | 57 |
| calcDispatcher | prism_calc — Core Calculations (1041 actions in z.enum) | 1041 |
| camDispatcher | prism_cam — CAM/Toolpath | 313 |
| cncOpsDispatcher | prism_cnc_ops — CNC Operations | 41 |
| complianceDispatcher | prism_compliance — Compliance-as-Code (F8) | 8 |
| contextDispatcher | prism_context — Session state, memory, attention | 26 |
| dataDispatcher | prism_data — Data Access (material/tool/machine/alarm/formula/coolant/coating) | 62 |
| devDispatcher | prism_dev — Dev Workflow | 9 |
| diagnosisDispatcher | prism_diagnosis — Failure Forensics, Inverse Solver, Generative Process | 38 |
| documentDispatcher | prism_doc — Document Tools | 7 |
| documentLearningDispatcher | prism_doc_learn — Document Learning (CC-EXT-MS0 U06) | 5 |
| edmDispatcher | prism_edm — Non-Traditional Machining | 16 |
| exportDispatcher | prism_export — Document Export & Report | 8 |
| feasibilityDispatcher | prism_feasibility — Machining Feasibility Intelligence | 28 |
| fiveAxisDispatcher | prism_5axis — 5-Axis Kinematics | 5 |
| fluidThermalDispatcher | prism_fluid_thermal — Fluid, Thermal & Material Science (48 engines) | 48 |
| formingCastingDispatcher | prism_forming — Forming & Casting | 20 |
| generatorDispatcher | prism_generator — Hook and component code generation | 6 |
| grindingDispatcher | prism_grinding — Grinding Process | 6 |
| gsdDispatcher | prism_gsd — GSD v3.0, FILE-BASED single canonical source | 6 |
| guardDispatcher | prism_guard — Safety guardrails, decision logging | 14 |
| hookDispatcher | prism_hook — Hook management (v2 + v3) | 20 |
| industryDispatcher | prism_industry — Industry Compliance | 4 |
| integrationDispatcher | prism_integration — CAM/DNC/ERP/Mobile/Measurement | 42 |
| intelligenceDispatcher | prism_intelligence — Intelligence | 49 |
| knowledgeDispatcher | prism_knowledge — Knowledge Management | 11 |
| knowledgeExtDispatcher | prism_knowledge_ext — Apprentice/Genome/Graph/FederatedLearning | 40 |
| l2EngineDispatcher | prism_l2 — L2 Engine (8 monolith-ported engines) | 38 |
| machineLiveDispatcher | prism_machine_live — Connectivity/Adaptive/Predictive/MTConnect/MQTT | 57 |
| machineSetupDispatcher | prism_machine_setup — Machine Setup & Quality | 43 |
| manusDispatcher | prism_manus — PRISM agent task execution engine | 11 |
| materialProcessingDispatcher | prism_material_processing — Material Processing | 16 |
| mechanicalDesignDispatcher | prism_mechanical — Mechanical Design (gears/bearings/springs/etc.) | 53 |
| memoryDispatcher | prism_memory — Memory Graph | 6 |
| monitoringDispatcher | prism_monitoring — Monitoring & Observability (Grafana/Prometheus) | 9 |
| multiOpDispatcher | prism_multi_op — Multi-Operation Orchestration | 7 |
| nlHookDispatcher | prism_nl_hook — Natural Language Hook (F6) | 8 |
| omegaDispatcher | prism_omega — Quality equation with auto-scoring | 6 |
| orchestrationDispatcher | prism_orchestrate — Orchestration (v2 + v3) | 27 |
| pfpDispatcher | prism_pfp — Predictive Failure Prevention | 6 |
| processControlDispatcher | prism_process_control — Process Control & DOE | 6 |
| productDispatcher | prism_product — SFC/PPG/Shop/ACNC Products | 41 |
| provenPipelineDispatcher | prism_proven_pipeline — Proven part recipes, similarity matching | 22 |
| qualityDispatcher | prism_quality — Quality & Metrology | 17 |
| ralphDispatcher | prism_ralph — Ralph agent tools | 3 |
| realtimeDispatcher | prism_realtime — WebSocket MCP Tool Surface | 4 |
| safetyDispatcher | prism_safety — Collision/Coolant/Spindle/ToolBreakage/Workholding | 30 |
| schedulingDispatcher | prism_scheduling — Production Scheduling | 8 |
| scientificMathDispatcher | prism_scientific_math — Scientific Mathematics | 5 |
| sessionDispatcher | prism_session — Session Management | 48 |
| shopPracticeDispatcher | prism_shop_practice — Shop Practice (CC-MS6 Integration) | 18 |
| skillScriptDispatcher | prism_skill_script — Skill management and script execution | 27 |
| spDispatcher | prism_sp — Development Protocol (19 actions) | 19 |
| telemetryDispatcher | prism_telemetry — Dashboard/Anomaly/Optimization | 7 |
| tenantDispatcher | prism_tenant — Multi-Tenant (F5) | 15 |
| threadDispatcher | prism_thread — Thread Calculations (tap drill/thread mill/specifications) | 21 |
| toolpathDispatcher | prism_toolpath — Toolpath Strategy/Generation/Simulation | 34 |
| turningDispatcher | prism_turning — Turning-Specific | 17 |
| validationDispatcher | prism_validate — Validation (13 checks) | 13 |
| vibrationPhysicsDispatcher | prism_vibration_physics — Vibration, Dynamics & Cutting Physics | 16 |
| weldingJoiningDispatcher | prism_welding — Welding & Joining | 6 |
| **TOTAL** | | **2861** |

## Quick Action Routing

When looking for a specific action:
1. Use `/action-search <keyword>` skill
2. Or grep: `Grep pattern='action_name' path='src/tools/dispatchers/'`
3. Or check schema: `src/schemas/<dispatcher>ActionSchemas.ts`
