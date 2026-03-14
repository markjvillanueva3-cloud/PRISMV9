# PRISM Dispatcher Digest

**66 dispatchers** route MCP actions to engines.
Each dispatcher handles a specific manufacturing/system domain.
Updated: 2026-03-14 (verified against source code)

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| adaptiveControlDispatcher | prism_adaptive_control — Adaptive Control & Digital Twin | 12 |
| atcsDispatcher | ATCS — Autonomous Task Completion System | 12 |
| authDispatcher | prism_auth — Authentication & Authorization | 8 |
| autoPilotDispatcher | AutoPilot — Consolidates 7 autopilot tools → 1 | 7 |
| automationDispatcher | prism_automation — Shop Floor Automation | 5 |
| autonomousDispatcher | Autonomous — Dispatcher #24 | 8 |
| bridgeDispatcher | prism_bridge — Protocol Bridge (F7) | 13 |
| businessDispatcher | prism_business — Business Operations | 193 |
| cadDispatcher | prism_cad — CAD/Geometry | 38 |
| calcDispatcher | prism_calc — Core Calculations (1018 switch cases) | 721 |
| camDispatcher | prism_cam — CAM/Toolpath | 189 |
| cncOpsDispatcher | prism_cnc_ops — CNC Operations | 72 |
| complianceDispatcher | prism_compliance — Compliance-as-Code (F8) | 8 |
| contextDispatcher | Context — Session state, memory, attention | 26 |
| dataDispatcher | prism_data — Data Access (material/tool/machine/alarm/formula/coolant/coating) | 54 |
| devDispatcher | Dev Workflow — Consolidates 7 dev tools → 1 | 9 |
| diagnosisDispatcher | prism_diagnosis — Failure Forensics, Inverse Solver, Generative Process | 38 |
| documentDispatcher | Document — Consolidates 7 document tools → 1 | 7 |
| documentLearningDispatcher | Document Learning — CC-EXT-MS0 U06 | 5 |
| edmDispatcher | prism_edm — Non-Traditional Machining | 16 |
| exportDispatcher | prism_export — Document Export & Report | 8 |
| fiveAxisDispatcher | prism_5axis — 5-Axis Kinematics | 5 |
| fluidThermalDispatcher | prism_fluid_thermal — Fluid, Thermal & Material Science (48 engines) | 48 |
| formingCastingDispatcher | prism_forming — Forming & Casting | 16 |
| generatorDispatcher | Generator — Hook and component code generation | 6 |
| grindingDispatcher | prism_grinding — Grinding Process | 6 |
| gsdDispatcher | GSD v3.0 — FILE-BASED, single canonical source | 6 |
| guardDispatcher | Guard — Safety guardrails, decision logging | 14 |
| hookDispatcher | Hook — Consolidates hookToolsV2 (8) + hookToolsV3 (12) | 20 |
| industryDispatcher | prism_industry — Industry Compliance | 4 |
| integrationDispatcher | prism_integration — CAM/DNC/ERP/Mobile/Measurement (42 actions) | 42 |
| intelligenceDispatcher | prism_intelligence — Intelligence (Dispatcher #32) | 49 |
| knowledgeDispatcher | Knowledge — Consolidates 5 knowledge tools → 1 | 9 |
| knowledgeExtDispatcher | prism_knowledge_ext — Apprentice/Genome/Graph/FederatedLearning | 40 |
| l2EngineDispatcher | L2 Engine — Wires 8 monolith-ported engines | 38 |
| machineLiveDispatcher | prism_machine_live — Connectivity/Adaptive/Predictive Maintenance | 40 |
| machineSetupDispatcher | prism_machine_setup — Machine Setup & Quality | 25 |
| manusDispatcher | Manus — PRISM agent task execution engine | 11 |
| materialProcessingDispatcher | prism_material_processing — Material Processing | 11 |
| mechanicalDesignDispatcher | prism_mechanical — Mechanical Design (51 engines: gears/bearings/springs/etc.) | 51 |
| memoryDispatcher | prism_memory — Memory Graph (#27) | 6 |
| multiOpDispatcher | prism_multi_op — Multi-Operation Orchestration | 7 |
| nlHookDispatcher | prism_nl_hook — Natural Language Hook (F6) | 8 |
| omegaDispatcher | Omega — Quality equation with auto-scoring | 6 |
| orchestrationDispatcher | Orchestration — Consolidates orchestrationV2 (8) + orchestrationV3 (19) | 27 |
| pfpDispatcher | prism_pfp — Predictive Failure Prevention (#26) | 6 |
| processControlDispatcher | prism_process_control — Process Control & DOE | 6 |
| productDispatcher | prism_product — SFC/PPG/Shop/ACNC Products (41 actions) | 41 |
| qualityDispatcher | prism_quality — Quality & Metrology | 13 |
| ralphDispatcher | Ralph — Consolidates 3 ralph tools → 1 | 3 |
| realtimeDispatcher | Real-Time — WebSocket MCP Tool Surface | 4 |
| safetyDispatcher | prism_safety — Collision/Coolant/Spindle/ToolBreakage/Workholding | 29 |
| schedulingDispatcher | prism_scheduling — Production Scheduling | 8 |
| scientificMathDispatcher | prism_scientific_math — Scientific Mathematics | 5 |
| sessionDispatcher | session — Session Management | 48 |
| shopPracticeDispatcher | Shop Practice — CC-MS6 Integration | 18 |
| skillScriptDispatcher | Skill & Script — Skill management and script execution | 27 |
| spDispatcher | SP — Consolidates developmentProtocolTools (19) | 19 |
| telemetryDispatcher | prism_telemetry — Dashboard/Anomaly/Optimization (#25) | 7 |
| tenantDispatcher | prism_tenant — Multi-Tenant (F5, 15 actions) | 15 |
| threadDispatcher | prism_thread — Thread Calculations (tap drill/thread mill/specifications) | 13 |
| toolpathDispatcher | prism_toolpath — Toolpath Strategy/Generation/Simulation (33 actions) | 33 |
| turningDispatcher | prism_turning — Turning-Specific | 8 |
| validationDispatcher | Validation — Consolidates 13 validation tools → 1 | 13 |
| vibrationPhysicsDispatcher | prism_vibration_physics — Vibration, Dynamics & Cutting Physics | 16 |
| weldingJoiningDispatcher | prism_welding — Welding & Joining | 6 |
| **TOTAL** | | **2063** |

## Quick Action Routing

When looking for a specific action:
1. Use `/action-search <keyword>` skill
2. Or grep: `Grep pattern='action_name' path='src/tools/dispatchers/'`
3. Or check schema: `src/schemas/<dispatcher>ActionSchemas.ts`
