# PRISM Dispatcher Digest

**66 dispatchers** route MCP actions to engines.
Each dispatcher handles a specific manufacturing/system domain.

## Dispatcher Map

| Dispatcher | Domain | Actions |
|-----------|--------|---------|
| adaptiveControlDispatcher | prism_adaptive_control — Adaptive Control & Digital Twin Dis | 12 |
| atcsDispatcher | ATCS Dispatcher - Autonomous Task Completion System | 12 |
| authDispatcher | prism_auth — Authentication & Authorization Dispatcher | 8 |
| autoPilotDispatcher | AutoPilot Dispatcher - Consolidates 7 autopilot tools → 1 | 7 |
| automationDispatcher | prism_automation — Shop Floor Automation Dispatcher | 5 |
| autonomousDispatcher | Autonomous Dispatcher - Dispatcher #24 | 8 |
| bridgeDispatcher | PRISM F7: Protocol Bridge Dispatcher (#31) | 0 |
| businessDispatcher | prism_business — Business Operations Dispatcher | 193 |
| cadDispatcher | prism_cad — CAD/Geometry Dispatcher | 33 |
| calcDispatcher | Extract domain-specific key values per calc type for summary | 582 |
| camDispatcher | prism_cam — CAM/Toolpath Dispatcher | 167 |
| cncOpsDispatcher | prism_cnc_ops — CNC Operations Dispatcher | 32 |
| complianceDispatcher | PRISM F8: Compliance-as-Code Dispatcher (#29) | 0 |
| contextDispatcher | Context Dispatcher — Session state, memory, and attention ma | 26 |
| dataDispatcher | Data Access Dispatcher - Consolidates data tools → 1 dispatc | 0 |
| devDispatcher | Dev Workflow Dispatcher - Consolidates 7 dev tools → 1 | 9 |
| diagnosisDispatcher | PRISM MCP Server - Diagnosis Dispatcher | 0 |
| documentDispatcher | Document Dispatcher - Consolidates 7 document tools → 1 | 7 |
| documentLearningDispatcher | Document Learning Dispatcher — CC-EXT-MS0 U06 | 5 |
| edmDispatcher | prism_edm — Non-Traditional Machining Dispatcher | 16 |
| exportDispatcher | prism_export — Document Export & Report Dispatcher | 8 |
| fiveAxisDispatcher | prism_5axis — 5-Axis Kinematics Dispatcher | 5 |
| fluidThermalDispatcher | prism_fluid_thermal — Fluid, Thermal & Material Science Disp | 0 |
| formingCastingDispatcher | prism_forming — Forming & Casting Dispatcher | 16 |
| generatorDispatcher | Generator Dispatcher — Hook and component code generation. | 6 |
| grindingDispatcher | prism_grinding — Grinding Process Dispatcher | 6 |
| gsdDispatcher | GSD Dispatcher v3.0 — FILE-BASED, single canonical source | 6 |
| guardDispatcher | Guard Dispatcher — Safety guardrails, decision logging, and  | 14 |
| hookDispatcher | Hook Dispatcher - Consolidates hookToolsV2 (8) + hookToolsV3 | 20 |
| industryDispatcher | prism_industry — Industry Compliance Dispatcher | 4 |
| integrationDispatcher | PRISM MCP Server - Integration Dispatcher | 0 |
| intelligenceDispatcher | PRISM MCP Server - Intelligence Dispatcher (Dispatcher #32) | 49 |
| knowledgeDispatcher | Knowledge Dispatcher - Consolidates 5 knowledge tools → 1 | 9 |
| knowledgeExtDispatcher | PRISM MCP Server - Knowledge Extension Dispatcher | 0 |
| l2EngineDispatcher | L2 Engine Dispatcher — Wires 8 monolith-ported engines to MC | 38 |
| machineLiveDispatcher | PRISM MCP Server - Machine Live Dispatcher | 0 |
| machineSetupDispatcher | prism_machine_setup — Machine Setup & Quality Dispatcher | 25 |
| manusDispatcher | Manus Dispatcher - PRISM's own agent task execution engine | 11 |
| materialProcessingDispatcher | prism_material_processing — Material Processing Dispatcher | 11 |
| mechanicalDesignDispatcher | prism_mechanical — Mechanical Design Dispatcher | 0 |
| memoryDispatcher | PRISM Memory Graph Dispatcher (#27) | 0 |
| multiOpDispatcher | prism_multi_op — Multi-Operation Orchestration Dispatcher | 7 |
| nlHookDispatcher | PRISM F6: Natural Language Hook Dispatcher (#28) | 8 |
| omegaDispatcher | Omega Dispatcher - Quality equation with auto-scoring | 6 |
| orchestrationDispatcher | Orchestration Dispatcher - Consolidates orchestrationV2 (8)  | 27 |
| pfpDispatcher | PRISM PFP Dispatcher (#26) | 0 |
| processControlDispatcher | prism_process_control — Process Control & DOE Dispatcher | 6 |
| productDispatcher | PRISM MCP Server - Product Dispatcher | 0 |
| qualityDispatcher | prism_quality — Quality & Metrology Dispatcher | 13 |
| ralphDispatcher | Ralph Dispatcher - Consolidates 3 ralph tools → 1 | 3 |
| realtimeDispatcher | Real-Time Dispatcher — WebSocket MCP Tool Surface | 4 |
| safetyDispatcher | Extract domain-specific key values for safety dispatcher sum | 0 |
| schedulingDispatcher | prism_scheduling — Production Scheduling Dispatcher | 8 |
| scientificMathDispatcher | prism_scientific_math — Scientific Mathematics Dispatcher | 5 |
| sessionDispatcher | session | 48 |
| shopPracticeDispatcher | Shop Practice Dispatcher — CC-MS6 Integration | 18 |
| skillScriptDispatcher | Skill & Script Dispatcher — Skill management and script exec | 27 |
| spDispatcher | SP Dispatcher - Consolidates developmentProtocolTools (19 to | 19 |
| telemetryDispatcher | PRISM Telemetry Dispatcher (#25) | 0 |
| tenantDispatcher | PRISM F5: Multi-Tenant Dispatcher (#30) | 0 |
| threadDispatcher | thread | 0 |
| toolpathDispatcher | toolpath | 0 |
| turningDispatcher | prism_turning — Turning-Specific Dispatcher | 8 |
| validationDispatcher | Validation Dispatcher - Consolidates 13 validation tools → 1 | 13 |
| vibrationPhysicsDispatcher | prism_vibration_physics — Vibration, Dynamics & Cutting Phys | 16 |
| weldingJoiningDispatcher | prism_welding — Welding & Joining Dispatcher | 6 |
| **TOTAL** | | **1592** |

## Quick Action Routing

When looking for a specific action:
1. Use `/action-search <keyword>` skill
2. Or grep: `Grep pattern='action_name' path='src/tools/dispatchers/'`
3. Or check schema: `src/schemas/<dispatcher>ActionSchemas.ts`
